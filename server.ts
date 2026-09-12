import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { getApps, cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { validateCartBackend, validateCouponAuthoritative, SERVER_PROMOTIONS_REGISTRY } from './src/server/cartValidator';
import { 
  reserveInventoryServer, 
  finalizeReservationServer, 
  releaseReservationServer, 
  getActiveReservationsServer 
} from './src/server/inventoryReservationManager';
import { INITIAL_PRODUCTS } from './src/data/mockData';
import { slugify } from './src/utils/seoUtils';
import { DEFAULT_ROLE_PERMISSIONS } from './src/utils/permissions';

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string | null;
        emailVerified: boolean;
        claims: any;
        permissions?: string[];
      };
    }
  }
}

dotenv.config();

const PORT = 3000;
const HOST = '0.0.0.0';

// Initialize Gemini SDK with telemetry header
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();

  // Increase payload limit for high-res photo uploads (up to 30mb)
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));

  // Health check endpoint
  // -----------------------------------------------------------------------------
  // SECURITY MIDDLEWARE
  // -----------------------------------------------------------------------------
  function getFirebaseAdminAuth() {
    if (getApps().length === 0) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      if (!projectId || !clientEmail || !privateKey) {
        return null;
      }
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    }
    return getAuth();
  }

  const requirePermission = (permission: string) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const claims = req.user?.claims || {};
    const role = typeof claims.role === 'string' ? claims.role : '';
    const permissions = Array.isArray(claims.permissions)
      ? claims.permissions
      : (DEFAULT_ROLE_PERMISSIONS as Record<string, string[]>)[role] || [];
    if (!permissions.includes(permission)) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }
    if (req.user) req.user.permissions = permissions;
    return next();
  };

  const requireServerAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const header = String(req.headers.authorization || '');
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    try {
      const auth = getFirebaseAdminAuth();
      if (!auth) {
        return res.status(503).json({ error: 'Server authentication is not configured.' });
      }
      const decoded = await auth.verifyIdToken(token);
      req.user = {
        uid: decoded.uid,
        email: decoded.email ?? null,
        emailVerified: decoded.email_verified === true,
        claims: decoded,
      };
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired authentication token.' });
    }
  };

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // =========================================================================
  // MONIME MULTI-RAIL FINANCIAL API (Hosted Sessions & Webhooks)
  // =========================================================================

  interface MonimeServerSession {
    order_id: string;
    reservation_id?: string;
    monime_session_id: string;
    monime_order_number?: string;
    redirect_url?: string;
    status: string;
    amount: number;
    currency: string;
    line_items: any[];
    created_at: string;
    updated_at: string;
  }

  const getFirestoreDb = () => {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) return null;
    const app = getApps().length ? getApps()[0] : initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getFirestore } = require('firebase-admin/firestore');
    return getFirestore(app);
  };

  const serverMonimeSessions = new Map<string, MonimeServerSession>();

  // Tenant-scoped Monime configuration. Secrets live only in this server-side
  // collection and are never returned to the browser.
  app.get('/api/monime/config', requireServerAuth, requirePermission('system.settings'), async (req: express.Request, res: express.Response) => {
    try {
      const db = getFirestoreDb();
      if (!db) return res.status(503).json({ error: 'Durable configuration storage is not configured.' });
      const tenantId = String(req.user?.claims?.tenantId || req.user?.claims?.tenant_id || '').trim();
      if (!tenantId) return res.status(400).json({ error: 'Tenant identity is required.' });
      const snap = await db.collection('tenants').doc(tenantId).collection('payment_gateways').doc('monime').get();
      if (!snap.exists) return res.json({ configured: false, provider: 'monime' });
      const data = snap.data() || {};
      return res.json({
        configured: Boolean(data.monimeSpaceId && data.monimeAccessToken && data.webhookSecret),
        provider: 'monime',
        environment: data.monimeMode === 'live' ? 'production' : 'sandbox',
        spaceId: data.monimeSpaceId || null,
        webhookConfigured: Boolean(data.webhookSecret),
        preferredChannel: data.monimePreferredChannel || 'all',
        version: data.monimeVersion || 'caph-2025-08-23',
      });
    } catch {
      return res.status(500).json({ error: 'Unable to load Monime configuration.' });
    }
  });

  app.put('/api/monime/config', requireServerAuth, requirePermission('system.settings'), async (req: express.Request, res: express.Response) => {
    try {
      const db = getFirestoreDb();
      if (!db) return res.status(503).json({ error: 'Durable configuration storage is not configured.' });
      const tenantId = String(req.user?.claims?.tenantId || req.user?.claims?.tenant_id || '').trim();
      if (!tenantId) return res.status(400).json({ error: 'Tenant identity is required.' });
      const body = req.body || {};
      const spaceId = String(body.monimeSpaceId || '').trim();
      const accessToken = String(body.monimeAccessToken || '').trim();
      const webhookSecret = String(body.webhookSecret || '').trim();
      const mode = body.monimeMode === 'live' ? 'live' : 'test';
      if (!spaceId || !accessToken || webhookSecret.length < 32) {
        return res.status(400).json({
          error: 'Monime Space ID, API access token, and a webhook secret of at least 32 characters are required.'
        });
      }
      if (accessToken.length < 20) {
        return res.status(400).json({ error: 'Monime API access token appears invalid.' });
      }
      if (spaceId.length > 200 || accessToken.length > 1000 || webhookSecret.length > 1000) {
        return res.status(400).json({ error: 'Monime configuration value is too long.' });
      }
      await db.collection('tenants').doc(tenantId).collection('payment_gateways').doc('monime').set({
        provider: 'monime',
        monimeSpaceId: spaceId,
        monimeAccessToken: accessToken,
        webhookSecret,
        monimeMode: mode,
        monimePreferredChannel: ['all', 'mobile_money', 'card', 'bank_transfer', 'payment_code'].includes(body.monimePreferredChannel) ? body.monimePreferredChannel : 'all',
        monimeVersion: 'caph-2025-08-23',
        updatedAt: new Date().toISOString(),
        updatedBy: req.user?.uid,
      }, { merge: true });
      return res.json({ success: true, configured: true, environment: mode === 'live' ? 'production' : 'sandbox', spaceId });
    } catch {
      return res.status(500).json({ error: 'Unable to save Monime configuration.' });
    }
  });

  app.post('/api/monime/create-checkout-session', requireServerAuth, requirePermission('payments.create'), async (req: express.Request, res: express.Response) => {
    try {
      const { orderId, items, customerName, currency = 'SLE', reservationId } = req.body || {};
      if (!orderId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Missing required fields: orderId, items' });
      }
      const validationResult = validateCartBackend({
        items: items.map((item: any) => ({
          productId: String(item.productId || item.id || ''),
          variantSku: item.variantSku ? String(item.variantSku) : undefined,
          quantity: Number(item.quantity),
          clientPrice: typeof item.price === 'number' ? item.price : undefined,
        })),
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: 'Cart validation failed.', details: validationResult.errors, warnings: validationResult.warnings });
      }

      const appUrl = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
      if (!appUrl) return res.status(503).json({ error: 'APP_URL is not configured on the server.' });
      const successUrl = new URL('/checkout/success', appUrl);
      successUrl.searchParams.set('orderId', String(orderId));
      const cancelUrl = new URL('/checkout/cancel', appUrl);
      cancelUrl.searchParams.set('orderId', String(orderId));

      const db = getFirestoreDb();
      if (!db) return res.status(503).json({ error: 'Durable configuration storage is not configured.' });
      const tenantId = String(req.user?.claims?.tenantId || req.user?.claims?.tenant_id || '').trim();
      if (!tenantId) return res.status(400).json({ error: 'Tenant identity is required.' });
      if (reservationId) {
        const reservationSnap = await db.collection('inventory_reservations').doc(String(reservationId)).get();
        if (!reservationSnap.exists) return res.status(400).json({ error: 'Inventory reservation was not found.' });
        const reservation = reservationSnap.data() || {};
        const reservationTenant = String(reservation.tenantId || '');
        const reservationOrderId = String(reservation.orderId || reservation.order_id || '');
        const reservationStatus = String(reservation.status || '');
        if (reservationTenant !== tenantId || reservationOrderId !== String(orderId) || reservationStatus !== 'active') {
          return res.status(409).json({ error: 'Inventory reservation is invalid for this order and tenant.' });
        }
        const expiresAt = new Date(String(reservation.expiresAt || 0)).getTime();
        if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) return res.status(409).json({ error: 'Inventory reservation has expired.' });
      }

      const gatewaySnap = await db.collection('tenants').doc(tenantId).collection('payment_gateways').doc('monime').get();
      if (!gatewaySnap.exists) return res.status(503).json({ error: 'This tenant has not configured Monime payments.' });
      const gateway = gatewaySnap.data() || {};
      const monimeToken = String(gateway.monimeAccessToken || '').trim();
      const monimeSpaceId = String(gateway.monimeSpaceId || '').trim();
      const configuredWebhookSecret = String(gateway.webhookSecret || '').trim();
      if (!monimeToken || !monimeSpaceId || configuredWebhookSecret.length < 32) {
        return res.status(503).json({ error: 'This tenant has incomplete Monime payment configuration.' });
      }
      const monimeVersion = 'caph-2025-08-23';
      const monimeApiUrl = (process.env.MONIME_API_URL || 'https://api.monime.io').replace(/\/+$/, '');
      const lineItems = validationResult.items.map((item) => ({
        type: 'custom', name: item.productName, quantity: item.quantity,
        price: { currency: validationResult.pricing.currency, value: Math.round(item.serverUnitPrice * 100) },
        reference: item.variantSku || item.productId,
        images: item.imageUrl ? [item.imageUrl] : undefined,
      }));
      const totalAmount = validationResult.pricing.grandTotal;
      const idempotencyKey = `nexus-${crypto.createHash('sha256').update(String(orderId)).digest('hex').slice(0, 32)}`;

      let session: any = null;
      try {
        const checkoutResponse = await fetch(`${monimeApiUrl}/v1/checkout-sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${monimeToken}`, 'Idempotency-Key': idempotencyKey, 'Monime-Space-Id': monimeSpaceId, 'Monime-Version': monimeVersion },
          body: JSON.stringify({
            name: `NEXUS Order ${orderId}`,
            description: customerName ? `Payment for ${customerName}` : 'Payment for order',
            reference: orderId,
            successUrl: successUrl.toString(),
            cancelUrl: cancelUrl.toString(),
            lineItems,
          }),
        });
        if (checkoutResponse.ok) {
          const checkoutData = await checkoutResponse.json();
          session = checkoutData.result || checkoutData;
        }
      } catch (networkErr: any) {
        console.warn('[Monime API Network Notice]', networkErr?.message);
      }
      if (!session) return res.status(502).json({ error: 'Unable to create Monime checkout session.' });

      const sessionRecord: MonimeServerSession = {
        order_id: orderId,
        ...(reservationId ? { reservation_id: String(reservationId) } : {}),
        monime_session_id: session.id,
        monime_order_number: session.orderNumber,
        redirect_url: session.redirectUrl,
        status: session.status || 'pending',
        amount: totalAmount,
        currency: validationResult.pricing.currency,
        line_items: validationResult.items,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.collection('monime_sessions').doc(String(session.id)).set({ ...sessionRecord, updated_at: new Date().toISOString() }, { merge: true });
      serverMonimeSessions.set(session.id, sessionRecord);
      return res.status(200).json({ success: true, sessionId: session.id, redirectUrl: session.redirectUrl, orderNumber: session.orderNumber, status: session.status || 'pending', sessionRecord });
    } catch (err: any) {
      console.error('Monime checkout endpoint error:', err);
      return res.status(500).json({ error: err?.message || 'Internal server error' });
    }
  });

  // ... remaining existing server routes remain unchanged ...
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
