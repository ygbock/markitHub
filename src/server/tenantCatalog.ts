import crypto from 'node:crypto';

export type CatalogProductStatus = 'Active' | 'Draft' | 'Archived';
export type CatalogServiceStatus = 'active' | 'draft' | 'archived';

function cleanString(value: unknown, max = 500): string {
  return String(value ?? '').trim().slice(0, max);
}

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function slugifyCatalogValue(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
}

export function validateCatalogProductInput(input: Record<string, unknown>, partial = false) {
  const name = cleanString(input.name, 160);
  const sku = cleanString(input.sku, 100);
  const price = safeNumber(input.price, NaN);
  const category = cleanString(input.category, 120);
  const status = String(input.status ?? 'Draft') as CatalogProductStatus;

  if (!partial || input.name !== undefined) {
    if (!name) throw new Error('Product name is required.');
  }
  if (!partial || input.sku !== undefined) {
    if (!sku) throw new Error('Product SKU is required.');
  }
  if (input.price !== undefined && (!Number.isFinite(price) || price < 0)) {
    throw new Error('Product price must be a non-negative number.');
  }
  if (input.category !== undefined && !category) {
    throw new Error('Product category is required when supplied.');
  }
  if (!['Active', 'Draft', 'Archived'].includes(status)) {
    throw new Error('Invalid product status.');
  }

  const variants = Array.isArray(input.variants)
    ? input.variants.slice(0, 100).map((variant: any) => ({
        id: cleanString(variant?.id, 100) || crypto.randomUUID(),
        sku: cleanString(variant?.sku, 100),
        title: cleanString(variant?.title, 160),
        stock: Math.max(0, Math.floor(safeNumber(variant?.stock, 0))),
        available: Math.max(0, Math.floor(safeNumber(variant?.available ?? variant?.stock, 0))),
        allowBackorder: variant?.allowBackorder === true,
        price: variant?.price == null ? undefined : Math.max(0, safeNumber(variant.price, 0)),
      }))
    : undefined;

  return {
    ...(input.name !== undefined ? { name } : {}),
    ...(input.sku !== undefined ? { sku } : {}),
    ...(input.price !== undefined ? { price } : {}),
    ...(input.category !== undefined ? { category } : {}),
    ...(input.description !== undefined ? { description: cleanString(input.description, 5000) } : {}),
    ...(input.brand !== undefined ? { brand: cleanString(input.brand, 160) } : {}),
    ...(input.tags !== undefined ? { tags: Array.isArray(input.tags) ? input.tags.slice(0, 50).map(v => cleanString(v, 80)).filter(Boolean) : [] } : {}),
    ...(input.imageUrl !== undefined ? { imageUrl: cleanString(input.imageUrl, 2000) } : {}),
    ...(variants ? { variants } : {}),
    ...(input.status !== undefined ? { status } : {}),
    ...(input.allowBackorder !== undefined ? { allowBackorder: input.allowBackorder === true } : {}),
    ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured === true } : {}),
    ...(input.inventoryTracking !== undefined ? { inventoryTracking: cleanString(input.inventoryTracking, 40) } : {}),
    ...(input.unit !== undefined ? { unit: cleanString(input.unit, 40) } : {}),
  };
}

export function buildCatalogProductRecord(params: {
  tenantId: string;
  businessId: string;
  productId: string;
  input: Record<string, unknown>;
  now: string;
  existing?: Record<string, any>;
}) {
  const validated = validateCatalogProductInput(params.input, Boolean(params.existing));
  const base = params.existing || {};
  const name = String(validated.name ?? base.name ?? '');
  const sku = String(validated.sku ?? base.sku ?? '');
  const price = Number(validated.price ?? base.price ?? 0);
  const category = String(validated.category ?? base.category ?? '');
  const status = (validated.status ?? base.status ?? 'Draft') as CatalogProductStatus;
  const slug = String((params.input.slug ?? base.ecommerce?.slug ?? name) || name);

  return {
    ...base,
    ...validated,
    id: params.productId,
    tenantId: params.tenantId,
    businessId: params.businessId,
    name,
    sku,
    price,
    category,
    status,
    ecommerce: {
      ...(base.ecommerce || {}),
      ...(params.input.ecommerce && typeof params.input.ecommerce === 'object' ? params.input.ecommerce : {}),
      slug: slugifyCatalogValue(slug),
      published: params.input.publishOnline !== undefined
        ? params.input.publishOnline === true
        : Boolean(base.ecommerce?.published),
      storefrontStatus: params.input.publishOnline === true
        ? 'Published'
        : params.input.publishOnline === false
          ? 'Hidden'
          : (base.ecommerce?.storefrontStatus || 'Draft'),
      publishTargets: {
        ...(base.ecommerce?.publishTargets || {}),
        website: params.input.publishOnline !== undefined
          ? params.input.publishOnline === true
          : base.ecommerce?.publishTargets?.website !== false,
      },
    },
    createdAt: base.createdAt || params.now,
    updatedAt: params.now,
  };
}

export function validateCatalogServiceInput(input: Record<string, unknown>, partial = false) {
  const name = cleanString(input.name, 160);
  const price = input.price == null ? undefined : safeNumber(input.price, NaN);
  const durationMinutes = input.durationMinutes == null ? undefined : Math.floor(safeNumber(input.durationMinutes, NaN));
  const status = String(input.status ?? 'draft') as CatalogServiceStatus;

  if ((!partial || input.name !== undefined) && !name) throw new Error('Service name is required.');
  if (price !== undefined && (!Number.isFinite(price) || price < 0)) throw new Error('Service price must be a non-negative number.');
  if (durationMinutes !== undefined && (!Number.isFinite(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440)) {
    throw new Error('Service duration must be between 1 and 1440 minutes.');
  }
  if (!['active', 'draft', 'archived'].includes(status)) throw new Error('Invalid service status.');

  return {
    ...(input.name !== undefined ? { name } : {}),
    ...(input.description !== undefined ? { description: cleanString(input.description, 5000) } : {}),
    ...(input.price !== undefined ? { price } : {}),
    ...(input.durationMinutes !== undefined ? { durationMinutes } : {}),
    ...(input.category !== undefined ? { category: cleanString(input.category, 120) } : {}),
    ...(input.tags !== undefined ? { tags: Array.isArray(input.tags) ? input.tags.slice(0, 50).map(v => cleanString(v, 80)).filter(Boolean) : [] } : {}),
    ...(input.imageUrl !== undefined ? { imageUrl: cleanString(input.imageUrl, 2000) } : {}),
    ...(input.bookingEnabled !== undefined ? { bookingEnabled: input.bookingEnabled !== false } : {}),
    ...(input.status !== undefined ? { status } : {}),
  };
}

export function buildCatalogServiceRecord(params: {
  tenantId: string;
  businessId: string;
  serviceId: string;
  input: Record<string, unknown>;
  now: string;
  existing?: Record<string, any>;
}) {
  const validated = validateCatalogServiceInput(params.input, Boolean(params.existing));
  const base = params.existing || {};
  const name = String(validated.name ?? base.name ?? '');
  const slug = String((params.input.slug ?? base.slug ?? name) || name);
  const published = params.input.publishOnline !== undefined
    ? params.input.publishOnline === true
    : Boolean(base.published);

  return {
    ...base,
    ...validated,
    id: params.serviceId,
    tenantId: params.tenantId,
    businessId: params.businessId,
    name,
    slug: slugifyCatalogValue(slug),
    published,
    bookingEnabled: validated.bookingEnabled ?? base.bookingEnabled !== false,
    createdAt: base.createdAt || params.now,
    updatedAt: params.now,
  };
}

export function assertTenantCatalogResource(resource: Record<string, any> | undefined, tenantId: string, kind: 'product' | 'service') {
  if (!resource) throw Object.assign(new Error(`${kind} not found.`), { statusCode: 404 });
  if (String(resource.tenantId || '') !== tenantId) {
    throw Object.assign(new Error('Cross-tenant catalog access is forbidden.'), { statusCode: 403 });
  }
}


export function registerTenantCatalogRoutes(app: any, deps: {
  requireServerAuth: any;
  requireActiveTenantMembership: any;
  requirePermission: (permission: string) => any;
  getAdminDb: () => any;
  extractAuthenticatedTenantId: (user: any) => string | null;
  createAuthoritativeAuditRecord: (input: any) => any;
  updateAuthoritativeSecurityMetrics: (db: any, audit: any, batch: any) => Promise<void>;
}) {
  const {
    requireServerAuth,
    requireActiveTenantMembership,
    requirePermission,
    getAdminDb,
    extractAuthenticatedTenantId,
    createAuthoritativeAuditRecord,
    updateAuthoritativeSecurityMetrics,
  } = deps;

  const tenantBase = [requireServerAuth, requireActiveTenantMembership];

  app.get('/api/tenant/catalog/products', ...tenantBase, requirePermission('services.view'), async (req: any, res: any) => {
    const tenantId = extractAuthenticatedTenantId(req.user);
    const db = getAdminDb();
    if (!tenantId || !db) return res.status(503).json({ error: 'Tenant catalog service is not configured.' });
    try {
      const snap = await db.collection('tenants').doc(tenantId).collection('products').limit(100).get();
      return res.json({ success: true, products: snap.docs.map((d: any) => ({ ...d.data(), id: d.id })) });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to load tenant products.' });
    }
  });

  app.post('/api/tenant/catalog/products', ...tenantBase, requirePermission('inventory.create'), async (req: any, res: any) => {
    const tenantId = extractAuthenticatedTenantId(req.user);
    const db = getAdminDb();
    if (!tenantId || !db) return res.status(503).json({ error: 'Tenant catalog service is not configured.' });
    try {
      const tenantSnap = await db.collection('tenants').doc(tenantId).get();
      if (!tenantSnap.exists) return res.status(404).json({ error: 'Tenant not found.' });
      const tenant = tenantSnap.data() || {};
      const input = validateCatalogProductInput(req.body || {});
      const productId = cleanString(req.body?.id, 120) || `product_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
      const ref = db.collection('tenants').doc(tenantId).collection('products').doc(productId);
      const existing = await ref.get();
      if (existing.exists) return res.status(409).json({ error: 'Product already exists.' });
      const record = buildCatalogProductRecord({
        tenantId,
        businessId: String(tenant.businessId || ''),
        productId,
        input: { ...req.body, ...input },
        now: new Date().toISOString(),
      });
      if (!record.businessId) return res.status(409).json({ error: 'Tenant is not bound to a business.' });

      const audit = createAuthoritativeAuditRecord({
        tenantId, actorUid: req.user.uid, actorName: req.user.email || req.user.uid,
        actorEmail: req.user.email || null, actorRole: String(req.user.claims?.role || 'Tenant Staff'),
        action: 'PRODUCT_CREATED', module: 'Catalog', targetType: 'product', targetId: productId,
        targetName: record.name, newState: { sku: record.sku, status: record.status, published: record.ecommerce?.published },
        result: 'success', severity: 'info', details: `Created catalog product ${record.name}.`,
      });
      const batch = db.batch();
      batch.create(ref, record);
      batch.set(db.collection('audit_logs').doc(audit.id), audit);
      await updateAuthoritativeSecurityMetrics(db, audit, batch);
      await batch.commit();
      return res.status(201).json({ success: true, product: record });
    } catch (err: any) {
      const status = err?.statusCode || 400;
      return res.status(status).json({ error: err?.message || 'Unable to create product.' });
    }
  });

  app.patch('/api/tenant/catalog/products/:productId', ...tenantBase, requirePermission('inventory.edit'), async (req: any, res: any) => {
    const tenantId = extractAuthenticatedTenantId(req.user);
    const db = getAdminDb();
    if (!tenantId || !db) return res.status(503).json({ error: 'Tenant catalog service is not configured.' });
    try {
      const ref = db.collection('tenants').doc(tenantId).collection('products').doc(req.params.productId);
      const snap = await ref.get();
      const existing = snap.exists ? snap.data() : undefined;
      assertTenantCatalogResource(existing, tenantId, 'product');
      const tenantSnap = await db.collection('tenants').doc(tenantId).get();
      const record = buildCatalogProductRecord({
        tenantId, businessId: String(tenantSnap.data()?.businessId || existing?.businessId || ''),
        productId: req.params.productId, input: req.body || {}, existing, now: new Date().toISOString(),
      });
      const audit = createAuthoritativeAuditRecord({
        tenantId, actorUid: req.user.uid, actorName: req.user.email || req.user.uid, actorEmail: req.user.email || null,
        actorRole: String(req.user.claims?.role || 'Tenant Staff'), action: 'PRODUCT_UPDATED', module: 'Catalog',
        targetType: 'product', targetId: req.params.productId, targetName: record.name,
        previousState: { sku: existing?.sku, status: existing?.status, published: existing?.ecommerce?.published },
        newState: { sku: record.sku, status: record.status, published: record.ecommerce?.published },
        result: 'success', severity: 'info', details: `Updated catalog product ${record.name}.`,
      });
      const batch = db.batch();
      batch.set(ref, record, { merge: true });
      batch.set(db.collection('audit_logs').doc(audit.id), audit);
      await updateAuthoritativeSecurityMetrics(db, audit, batch);
      await batch.commit();
      return res.json({ success: true, product: record });
    } catch (err: any) {
      const status = err?.statusCode || 400;
      return res.status(status).json({ error: err?.message || 'Unable to update product.' });
    }
  });

  app.delete('/api/tenant/catalog/products/:productId', ...tenantBase, requirePermission('inventory.delete'), async (req: any, res: any) => {
    const tenantId = extractAuthenticatedTenantId(req.user);
    const db = getAdminDb();
    if (!tenantId || !db) return res.status(503).json({ error: 'Tenant catalog service is not configured.' });
    try {
      const ref = db.collection('tenants').doc(tenantId).collection('products').doc(req.params.productId);
      const snap = await ref.get();
      const existing = snap.exists ? snap.data() : undefined;
      assertTenantCatalogResource(existing, tenantId, 'product');
      const now = new Date().toISOString();
      const record = { ...existing, status: 'Archived', updatedAt: now, ecommerce: { ...(existing?.ecommerce || {}), published: false, storefrontStatus: 'Hidden', publishTargets: { ...(existing?.ecommerce?.publishTargets || {}), website: false } } };
      const audit = createAuthoritativeAuditRecord({
        tenantId, actorUid: req.user.uid, actorName: req.user.email || req.user.uid, actorEmail: req.user.email || null,
        actorRole: String(req.user.claims?.role || 'Tenant Staff'), action: 'PRODUCT_ARCHIVED', module: 'Catalog',
        targetType: 'product', targetId: req.params.productId, targetName: String(existing?.name || req.params.productId),
        previousState: { status: existing?.status, published: existing?.ecommerce?.published }, newState: { status: 'Archived', published: false },
        result: 'success', severity: 'warning', details: `Archived catalog product ${existing?.name || req.params.productId}.`,
      });
      const batch = db.batch();
      batch.set(ref, record, { merge: true });
      batch.set(db.collection('audit_logs').doc(audit.id), audit);
      await updateAuthoritativeSecurityMetrics(db, audit, batch);
      await batch.commit();
      return res.json({ success: true, archived: true });
    } catch (err: any) {
      const status = err?.statusCode || 400;
      return res.status(status).json({ error: err?.message || 'Unable to archive product.' });
    }
  });

  app.get('/api/tenant/catalog/services', ...tenantBase, requirePermission('inventory.view'), async (req: any, res: any) => {
    const tenantId = extractAuthenticatedTenantId(req.user);
    const db = getAdminDb();
    if (!tenantId || !db) return res.status(503).json({ error: 'Tenant catalog service is not configured.' });
    try {
      const snap = await db.collection('tenants').doc(tenantId).collection('services').limit(100).get();
      return res.json({ success: true, services: snap.docs.map((d: any) => ({ ...d.data(), id: d.id })) });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to load tenant services.' });
    }
  });

  app.post('/api/tenant/catalog/services', ...tenantBase, requirePermission('services.create'), async (req: any, res: any) => {
    const tenantId = extractAuthenticatedTenantId(req.user);
    const db = getAdminDb();
    if (!tenantId || !db) return res.status(503).json({ error: 'Tenant catalog service is not configured.' });
    try {
      const tenantSnap = await db.collection('tenants').doc(tenantId).get();
      if (!tenantSnap.exists) return res.status(404).json({ error: 'Tenant not found.' });
      const tenant = tenantSnap.data() || {};
      const serviceId = cleanString(req.body?.id, 120) || `service_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
      const ref = db.collection('tenants').doc(tenantId).collection('services').doc(serviceId);
      if ((await ref.get()).exists) return res.status(409).json({ error: 'Service already exists.' });
      const record = buildCatalogServiceRecord({
        tenantId, businessId: String(tenant.businessId || ''), serviceId, input: req.body || {}, now: new Date().toISOString(),
      });
      if (!record.businessId) return res.status(409).json({ error: 'Tenant is not bound to a business.' });
      const audit = createAuthoritativeAuditRecord({
        tenantId, actorUid: req.user.uid, actorName: req.user.email || req.user.uid, actorEmail: req.user.email || null,
        actorRole: String(req.user.claims?.role || 'Tenant Staff'), action: 'SERVICE_CREATED', module: 'Services',
        targetType: 'service', targetId: serviceId, targetName: record.name, newState: { status: record.status, published: record.published },
        result: 'success', severity: 'info', details: `Created service ${record.name}.`,
      });
      const batch = db.batch();
      batch.create(ref, record);
      batch.set(db.collection('audit_logs').doc(audit.id), audit);
      await updateAuthoritativeSecurityMetrics(db, audit, batch);
      await batch.commit();
      return res.status(201).json({ success: true, service: record });
    } catch (err: any) {
      const status = err?.statusCode || 400;
      return res.status(status).json({ error: err?.message || 'Unable to create service.' });
    }
  });

  app.patch('/api/tenant/catalog/services/:serviceId', ...tenantBase, requirePermission('services.update'), async (req: any, res: any) => {
    const tenantId = extractAuthenticatedTenantId(req.user);
    const db = getAdminDb();
    if (!tenantId || !db) return res.status(503).json({ error: 'Tenant catalog service is not configured.' });
    try {
      const ref = db.collection('tenants').doc(tenantId).collection('services').doc(req.params.serviceId);
      const snap = await ref.get();
      const existing = snap.exists ? snap.data() : undefined;
      assertTenantCatalogResource(existing, tenantId, 'service');
      const tenantSnap = await db.collection('tenants').doc(tenantId).get();
      const record = buildCatalogServiceRecord({
        tenantId, businessId: String(tenantSnap.data()?.businessId || existing?.businessId || ''),
        serviceId: req.params.serviceId, input: req.body || {}, existing, now: new Date().toISOString(),
      });
      const audit = createAuthoritativeAuditRecord({
        tenantId, actorUid: req.user.uid, actorName: req.user.email || req.user.uid, actorEmail: req.user.email || null,
        actorRole: String(req.user.claims?.role || 'Tenant Staff'), action: 'SERVICE_UPDATED', module: 'Services',
        targetType: 'service', targetId: req.params.serviceId, targetName: record.name,
        previousState: { status: existing?.status, published: existing?.published }, newState: { status: record.status, published: record.published },
        result: 'success', severity: 'info', details: `Updated service ${record.name}.`,
      });
      const batch = db.batch();
      batch.set(ref, record, { merge: true });
      batch.set(db.collection('audit_logs').doc(audit.id), audit);
      await updateAuthoritativeSecurityMetrics(db, audit, batch);
      await batch.commit();
      return res.json({ success: true, service: record });
    } catch (err: any) {
      const status = err?.statusCode || 400;
      return res.status(status).json({ error: err?.message || 'Unable to update service.' });
    }
  });

  app.delete('/api/tenant/catalog/services/:serviceId', ...tenantBase, requirePermission('services.delete'), async (req: any, res: any) => {
    const tenantId = extractAuthenticatedTenantId(req.user);
    const db = getAdminDb();
    if (!tenantId || !db) return res.status(503).json({ error: 'Tenant catalog service is not configured.' });
    try {
      const ref = db.collection('tenants').doc(tenantId).collection('services').doc(req.params.serviceId);
      const snap = await ref.get();
      const existing = snap.exists ? snap.data() : undefined;
      assertTenantCatalogResource(existing, tenantId, 'service');
      const now = new Date().toISOString();
      const record = { ...existing, status: 'archived', updatedAt: now, published: false };
      const audit = createAuthoritativeAuditRecord({
        tenantId, actorUid: req.user.uid, actorName: req.user.email || req.user.uid, actorEmail: req.user.email || null,
        actorRole: String(req.user.claims?.role || 'Tenant Staff'), action: 'SERVICE_ARCHIVED', module: 'Services',
        targetType: 'service', targetId: req.params.serviceId, targetName: String(existing?.name || req.params.serviceId),
        previousState: { status: existing?.status, published: existing?.published }, newState: { status: 'archived', published: false },
        result: 'success', severity: 'warning', details: `Archived service ${existing?.name || req.params.serviceId}.`,
      });
      const batch = db.batch();
      batch.set(ref, record, { merge: true });
      batch.set(db.collection('audit_logs').doc(audit.id), audit);
      await updateAuthoritativeSecurityMetrics(db, audit, batch);
      await batch.commit();
      return res.json({ success: true, archived: true });
    } catch (err: any) {
      const status = err?.statusCode || 400;
      return res.status(status).json({ error: err?.message || 'Unable to archive service.' });
    }
  });
}
