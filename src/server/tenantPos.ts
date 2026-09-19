import crypto from 'node:crypto';

function clean(value: unknown, max = 500) { return String(value ?? '').trim().slice(0, max); }
function money(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw Object.assign(new Error('Invalid monetary amount.'), { statusCode: 400 });
  return Math.round(n * 100) / 100;
}

export function registerTenantPosRoutes(app: any, deps: {
  requireServerAuth: any;
  requireActiveTenantMembership: any;
  requirePermission: (permission: string) => any;
  getAdminDb: () => any;
  extractAuthenticatedTenantId: (user: any) => string | null;
  createAuthoritativeAuditRecord: (input: any) => any;
  updateAuthoritativeSecurityMetrics: (db: any, audit: any, transactionOrBatch: any) => Promise<void>;
}) {
  const { requireServerAuth, requireActiveTenantMembership, requirePermission, getAdminDb, extractAuthenticatedTenantId, createAuthoritativeAuditRecord, updateAuthoritativeSecurityMetrics } = deps;
  const base = [requireServerAuth, requireActiveTenantMembership];

  app.post('/api/tenant/pos/sales', ...base, requirePermission('sales.create'), async (req: any, res: any) => {
    const tenantId = extractAuthenticatedTenantId(req.user);
    const db = getAdminDb();
    if (!tenantId || !db) return res.status(503).json({ error: 'POS service is not configured.' });
    try {
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      if (!items.length) return res.status(400).json({ error: 'At least one sale item is required.' });
      const normalized = items.slice(0, 100).map((item: any) => ({
        productId: clean(item?.productId, 120),
        variantSku: clean(item?.variantSku, 120) || null,
        quantity: Number(item?.quantity),
        unitPrice: money(item?.unitPrice),
      }));
      if (normalized.some((item: any) => !item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0)) {
        return res.status(400).json({ error: 'Each sale item requires a product and positive whole quantity.' });
      }
      const locationId = clean(req.body?.locationId, 120) || 'default';
      const orderId = `pos_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
      const orderRef = db.collection('tenants').doc(tenantId).collection('orders').doc(orderId);
      const now = new Date().toISOString();

      const result = await db.runTransaction(async (tx: any) => {
        let subtotal = 0;
        const resolvedItems: any[] = [];
        for (const item of normalized) {
          const productRef = db.collection('tenants').doc(tenantId).collection('products').doc(item.productId);
          const inventoryRef = db.collection('tenants').doc(tenantId).collection('inventory').doc(`${item.productId}__${locationId}`);
          const [productSnap, inventorySnap] = await Promise.all([tx.get(productRef), tx.get(inventoryRef)]);
          if (!productSnap.exists) throw Object.assign(new Error(`Product ${item.productId} not found.`), { statusCode: 404 });
          const product = productSnap.data() || {};
          if (product.status === 'Archived') throw Object.assign(new Error(`Product ${item.productId} is archived.`), { statusCode: 409 });
          const current = Number(inventorySnap.data()?.quantity || 0);
          if (current < item.quantity) throw Object.assign(new Error(`Insufficient stock for ${product.name || item.productId}.`), { statusCode: 409 });
          const lineTotal = money(item.unitPrice * item.quantity);
          subtotal = money(subtotal + lineTotal);
          tx.set(inventoryRef, { tenantId, productId: item.productId, locationId, quantity: current - item.quantity, updatedAt: now }, { merge: true });
          const movementRef = db.collection('tenants').doc(tenantId).collection('inventoryMovements').doc();
          tx.create(movementRef, {
            tenantId, productId: item.productId, locationId, quantity: item.quantity, type: 'ADJUSTMENT_OUT',
            reason: 'POS sale', reference: orderId, previousQuantity: current, resultingQuantity: current - item.quantity,
            actorUid: req.user.uid, createdAt: now,
          });
          resolvedItems.push({ productId: item.productId, productName: clean(product.name, 200), variantSku: item.variantSku, quantity: item.quantity, unitPrice: item.unitPrice, total: lineTotal });
        }
        const discount = money(req.body?.discount || 0);
        const tax = money(req.body?.tax || 0);
        const total = money(Math.max(0, subtotal - discount + tax));
        const order = {
          id: orderId, tenantId, channel: 'In-Store POS', status: 'Completed',
          date: now, items: resolvedItems, subtotal, discount, tax, total,
          paymentMethod: clean(req.body?.paymentMethod, 80) || 'Unknown',
          customerId: clean(req.body?.customerId, 120) || null,
          customerName: clean(req.body?.customerName, 200) || 'Walk-in Customer',
          cashierUid: req.user.uid, locationId, createdAt: now, updatedAt: now,
        };
        tx.create(orderRef, order);
        const audit = createAuthoritativeAuditRecord({
          tenantId, actorUid: req.user.uid, actorName: req.user.email || req.user.uid, actorEmail: req.user.email || null,
          actorRole: String(req.user.claims?.role || 'Tenant Staff'), action: 'POS_SALE_COMPLETED', module: 'POS',
          targetType: 'order', targetId: orderId, targetName: orderId,
          newState: { total, itemCount: resolvedItems.length, locationId },
          result: 'success', severity: 'info', details: `Completed POS sale ${orderId} for ${total}.`,
        });
        tx.set(db.collection('audit_logs').doc(audit.id), audit);
        await updateAuthoritativeSecurityMetrics(db, audit, tx);
        return order;
      });
      return res.status(201).json({ success: true, order: result });
    } catch (err: any) {
      return res.status(err?.statusCode || 400).json({ error: err?.message || 'Unable to complete POS sale.' });
    }
  });
}
