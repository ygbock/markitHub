import type { Express } from 'express';
import crypto from 'node:crypto';
import { createAuthoritativeAuditRecord } from './auditService';

type DbLike = any;

const ALLOWED_LISTING_FIELDS = new Set([
  'headline', 'description', 'categories', 'tags', 'logoUrl', 'bannerUrl'
]);

function cleanString(value: unknown, max = 5000): string {
  return String(value ?? '').trim().slice(0, max);
}

function normalizeStringArray(value: unknown, maxItems = 30, maxLength = 120): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(v => cleanString(v, maxLength)).filter(Boolean))].slice(0, maxItems);
}

function ownerError(message: string, statusCode: number): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode });
}

async function loadOwnedBusiness(db: DbLike, businessId: string, uid: string) {
  const ref = db.collection('businesses').doc(businessId);
  const snap = await ref.get();
  if (!snap.exists) throw ownerError('Business not found.', 404);
  const business = { id: snap.id, ...snap.data() };
  if (String(business.ownerUid || '') !== String(uid || '')) {
    throw ownerError('Only the authoritative business owner may manage this business.', 403);
  }
  return { ref, business };
}

function safeProfile(business: any) {
  return {
    id: business.id,
    legalName: business.legalName || '',
    tradingName: business.tradingName || business.legalName || '',
    registrationNumber: business.registrationNumber || '',
    taxId: business.taxId || '',
    ownerUid: business.ownerUid,
    country: business.country || '',
    currency: business.currency || '',
    email: business.email || '',
    phone: business.phone || '',
    verificationStatus: business.verificationStatus || 'pending',
    status: business.status || 'draft',
    businessMode: business.businessMode || 'listing_only',
    onboardingStatus: business.onboardingStatus || 'in_progress',
    listing: business.listing || null,
    locations: Array.isArray(business.locations) ? business.locations : [],
    services: Array.isArray(business.services) ? business.services : [],
    tenantIds: Array.isArray(business.tenantIds) ? business.tenantIds : [],
    createdAt: business.createdAt || null,
    updatedAt: business.updatedAt || null,
  };
}

export function registerBusinessProfileRoutes(params: {
  app: Express;
  requireServerAuth: any;
  getAdminDb: () => DbLike | null;
}) {
  const { app, requireServerAuth, getAdminDb } = params;

  app.get('/api/business/:businessId/profile', requireServerAuth, async (req: any, res: any) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Business service is not configured.' });
    try {
      const { business } = await loadOwnedBusiness(db, cleanString(req.params.businessId, 100), req.user.uid);
      return res.json({ success: true, profile: safeProfile(business) });
    } catch (err: any) {
      return res.status(Number(err?.statusCode) || 500).json({ success: false, error: err?.message || 'Unable to load business profile.' });
    }
  });

  app.patch('/api/business/:businessId/profile', requireServerAuth, async (req: any, res: any) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Business service is not configured.' });
    try {
      const businessId = cleanString(req.params.businessId, 100);
      const { ref, business } = await loadOwnedBusiness(db, businessId, req.user.uid);
      const body = req.body || {};
      const now = new Date().toISOString();
      const patch: any = {};

      if (body.tradingName !== undefined) {
        const tradingName = cleanString(body.tradingName, 160);
        if (!tradingName) throw ownerError('Trading name cannot be empty.', 400);
        patch.tradingName = tradingName;
      }
      if (body.email !== undefined) patch.email = cleanString(body.email, 320);
      if (body.phone !== undefined) patch.phone = cleanString(body.phone, 80);

      if (body.listing !== undefined) {
        if (!body.listing || typeof body.listing !== 'object' || Array.isArray(body.listing)) {
          throw ownerError('Listing payload must be an object.', 400);
        }
        const current = { ...(business.listing || {}) };
        for (const key of ALLOWED_LISTING_FIELDS) {
          if (body.listing[key] !== undefined) {
            if (key === 'categories' || key === 'tags') current[key] = normalizeStringArray(body.listing[key]);
            else current[key] = cleanString(body.listing[key], key === 'description' ? 5000 : 1000);
          }
        }
        if (!current.headline || !current.description || !Array.isArray(current.categories) || current.categories.length === 0) {
          throw ownerError('Listing headline, description, and at least one category are required.', 400);
        }
        // Publication is platform-controlled. Owner edits can never publish/unpublish.
        current.isPublished = business.listing?.isPublished === true;
        patch.listing = current;
      }

      if (Object.keys(patch).length === 0) throw ownerError('No editable business profile fields were supplied.', 400);
      patch.updatedAt = now;

      const audit = createAuthoritativeAuditRecord({
        tenantId: 'platform',
        actorUid: req.user.uid,
        actorEmail: req.user.email,
        actorRole: 'Business Owner',
        action: 'BUSINESS_PROFILE_UPDATED',
        module: 'Business Profile',
        targetType: 'business',
        targetId: businessId,
        targetName: business.tradingName || business.legalName,
        previousState: {
          tradingName: business.tradingName || '',
          email: business.email || '',
          phone: business.phone || '',
          listing: business.listing || null,
        },
        newState: patch,
        reason: 'Business owner updated authoritative business profile data.',
        result: 'success',
      });

      await db.runTransaction(async (tx: any) => {
        tx.set(ref, patch, { merge: true });
        tx.create(db.collection('audit_logs').doc(audit.id), audit);
      });

      const updated = { ...business, ...patch };
      return res.json({ success: true, profile: safeProfile(updated), audit });
    } catch (err: any) {
      return res.status(Number(err?.statusCode) || 500).json({ success: false, error: err?.message || 'Unable to update business profile.' });
    }
  });

  app.post('/api/business/:businessId/locations', requireServerAuth, async (req: any, res: any) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Business service is not configured.' });
    try {
      const businessId = cleanString(req.params.businessId, 100);
      const { ref, business } = await loadOwnedBusiness(db, businessId, req.user.uid);
      const body = req.body || {};
      const name = cleanString(body.name, 160);
      const addressLine1 = cleanString(body.addressLine1, 300);
      const city = cleanString(body.city, 120);
      const country = cleanString(body.country || business.country || 'Sierra Leone', 120);
      if (!name || !addressLine1 || !city) throw ownerError('Location name, address, and city are required.', 400);
      const id = 'loc_' + cryptoRandom();
      const now = new Date().toISOString();
      const location = {
        id, businessId, name, addressLine1, city, country,
        phone: cleanString(body.phone, 80),
        operatingHours: cleanString(body.operatingHours, 500),
        hasOperationalTenant: false,
        tenantId: null,
        isActive: true,
        ...(body.geo && Number.isFinite(Number(body.geo.latitude)) && Number.isFinite(Number(body.geo.longitude))
          ? { geo: { latitude: Number(body.geo.latitude), longitude: Number(body.geo.longitude) } } : {}),
      };
      const nextLocations = [...(Array.isArray(business.locations) ? business.locations : []), location];
      const audit = createAuthoritativeAuditRecord({
        tenantId: 'platform', actorUid: req.user.uid, actorEmail: req.user.email, actorRole: 'Business Owner',
        action: 'BUSINESS_LOCATION_CREATED', module: 'Business Profile', targetType: 'business_location',
        targetId: id, targetName: name, newState: location,
        reason: 'Business owner added an authoritative branch location.', result: 'success',
      });
      await db.runTransaction(async (tx: any) => {
        tx.set(ref, { locations: nextLocations, updatedAt: now }, { merge: true });
        tx.set(ref.collection('locations').doc(id), location, { merge: true });
        tx.create(db.collection('audit_logs').doc(audit.id), audit);
      });
      return res.status(201).json({ success: true, location, locations: nextLocations, audit });
    } catch (err: any) {
      return res.status(Number(err?.statusCode) || 500).json({ success: false, error: err?.message || 'Unable to create business location.' });
    }
  });

  app.patch('/api/business/:businessId/locations/:locationId', requireServerAuth, async (req: any, res: any) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Business service is not configured.' });
    try {
      const businessId = cleanString(req.params.businessId, 100);
      const locationId = cleanString(req.params.locationId, 100);
      const { ref, business } = await loadOwnedBusiness(db, businessId, req.user.uid);
      const locations = Array.isArray(business.locations) ? business.locations : [];
      const index = locations.findIndex((x: any) => String(x?.id || '') === locationId);
      if (index < 0) throw ownerError('Business location not found.', 404);
      const current = { ...locations[index] };
      const editable = ['name','addressLine1','city','country','phone','operatingHours','isActive'];
      for (const key of editable) if (req.body?.[key] !== undefined) {
        current[key] = key === 'isActive' ? Boolean(req.body[key]) : cleanString(req.body[key], 500);
      }
      if (!current.name || !current.addressLine1 || !current.city) throw ownerError('Location name, address, and city are required.', 400);
      current.businessId = businessId;
      const nextLocations = locations.slice();
      nextLocations[index] = current;
      const now = new Date().toISOString();
      const audit = createAuthoritativeAuditRecord({
        tenantId: 'platform', actorUid: req.user.uid, actorEmail: req.user.email, actorRole: 'Business Owner',
        action: 'BUSINESS_LOCATION_UPDATED', module: 'Business Profile', targetType: 'business_location',
        targetId: locationId, targetName: current.name, previousState: locations[index], newState: current,
        reason: 'Business owner updated an authoritative branch location.', result: 'success',
      });
      await db.runTransaction(async (tx: any) => {
        tx.set(ref, { locations: nextLocations, updatedAt: now }, { merge: true });
        tx.set(ref.collection('locations').doc(locationId), current, { merge: true });
        tx.create(db.collection('audit_logs').doc(audit.id), audit);
      });
      return res.json({ success: true, location: current, locations: nextLocations, audit });
    } catch (err: any) {
      return res.status(Number(err?.statusCode) || 500).json({ success: false, error: err?.message || 'Unable to update business location.' });
    }
  });

  app.delete('/api/business/:businessId/locations/:locationId', requireServerAuth, async (req: any, res: any) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Business service is not configured.' });
    try {
      const businessId = cleanString(req.params.businessId, 100);
      const locationId = cleanString(req.params.locationId, 100);
      const { ref, business } = await loadOwnedBusiness(db, businessId, req.user.uid);
      const locations = Array.isArray(business.locations) ? business.locations : [];
      const target = locations.find((x: any) => String(x?.id || '') === locationId);
      if (!target) throw ownerError('Business location not found.', 404);
      if (target.hasOperationalTenant || target.tenantId) throw ownerError('Operational locations cannot be deleted from the Business Owner portal.', 409);
      if (locations.length <= 1) throw ownerError('A business must retain at least one location.', 409);
      const nextLocations = locations.filter((x: any) => String(x?.id || '') !== locationId);
      const now = new Date().toISOString();
      const audit = createAuthoritativeAuditRecord({
        tenantId: 'platform', actorUid: req.user.uid, actorEmail: req.user.email, actorRole: 'Business Owner',
        action: 'BUSINESS_LOCATION_DELETED', module: 'Business Profile', targetType: 'business_location',
        targetId: locationId, targetName: target.name, previousState: target,
        reason: 'Business owner removed an unused branch location.', result: 'success',
      });
      await db.runTransaction(async (tx: any) => {
        tx.set(ref, { locations: nextLocations, updatedAt: now }, { merge: true });
        tx.delete(ref.collection('locations').doc(locationId));
        tx.create(db.collection('audit_logs').doc(audit.id), audit);
      });
      return res.json({ success: true, locations: nextLocations, audit });
    } catch (err: any) {
      return res.status(Number(err?.statusCode) || 500).json({ success: false, error: err?.message || 'Unable to delete business location.' });
    }
  });

  app.post('/api/business/:businessId/services', requireServerAuth, async (req: any, res: any) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Business service is not configured.' });
    try {
      const businessId = cleanString(req.params.businessId, 100);
      const { ref, business } = await loadOwnedBusiness(db, businessId, req.user.uid);
      const name = cleanString(req.body?.name, 200);
      const description = cleanString(req.body?.description, 2000);
      const price = Number(req.body?.price);
      const durationMinutes = Number(req.body?.durationMinutes);
      if (!name || !description || !Number.isFinite(price) || price < 0 || !Number.isFinite(durationMinutes) || durationMinutes < 1) {
        throw ownerError('Service name, description, valid non-negative price, and duration are required.', 400);
      }
      const service = { id: 'srv_' + cryptoRandom(), name, description, price, durationMinutes };
      const services = [...(Array.isArray(business.services) ? business.services : []), service];
      const now = new Date().toISOString();
      await ref.set({ services, updatedAt: now }, { merge: true });
      return res.status(201).json({ success: true, service, services });
    } catch (err: any) {
      return res.status(Number(err?.statusCode) || 500).json({ success: false, error: err?.message || 'Unable to create service.' });
    }
  });

  app.delete('/api/business/:businessId/services/:serviceId', requireServerAuth, async (req: any, res: any) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Business service is not configured.' });
    try {
      const businessId = cleanString(req.params.businessId, 100);
      const serviceId = cleanString(req.params.serviceId, 100);
      const { ref, business } = await loadOwnedBusiness(db, businessId, req.user.uid);
      const services = Array.isArray(business.services) ? business.services : [];
      if (!services.some((x: any) => String(x?.id || '') === serviceId)) throw ownerError('Service not found.', 404);
      const next = services.filter((x: any) => String(x?.id || '') !== serviceId);
      await ref.set({ services: next, updatedAt: new Date().toISOString() }, { merge: true });
      return res.json({ success: true, services: next });
    } catch (err: any) {
      return res.status(Number(err?.statusCode) || 500).json({ success: false, error: err?.message || 'Unable to delete service.' });
    }
  });
}

function cryptoRandom(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 24);
}
