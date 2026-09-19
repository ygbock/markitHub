import crypto from 'node:crypto';

export type StorefrontPublicationStatus = 'draft' | 'published';

export interface StorefrontSection {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  enabled: boolean;
  status: 'draft' | 'active';
  order: number;
  selectedProductIds?: string[];
  category?: string;
  bannerUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
}

export interface TenantStorefrontRecord {
  tenantId: string;
  businessId: string;
  slug: string;
  name: string;
  publicationStatus: StorefrontPublicationStatus;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  tagline: string;
  sections: StorefrontSection[];
  updatedAt: string;
  publishedAt?: string;
}

function clean(value: unknown, fallback = '') {
  return String(value ?? '').trim().slice(0, 500) || fallback;
}

function normalizeSections(input: unknown): StorefrontSection[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 50).map((raw, index) => {
    const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    return {
      id: clean(item.id, `section_${crypto.randomUUID()}`),
      type: clean(item.type, 'custom_campaign'),
      title: clean(item.title, 'Storefront Section'),
      subtitle: clean(item.subtitle) || undefined,
      enabled: item.enabled !== false,
      status: item.status === 'draft' ? 'draft' : 'active',
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : index,
      selectedProductIds: Array.isArray(item.selectedProductIds)
        ? item.selectedProductIds.map(value => clean(value)).filter(Boolean).slice(0, 100)
        : undefined,
      category: clean(item.category) || undefined,
      bannerUrl: clean(item.bannerUrl) || undefined,
      buttonText: clean(item.buttonText) || undefined,
      buttonUrl: clean(item.buttonUrl) || undefined,
    };
  });
}

export function buildDefaultStorefrontRecord(params: {
  tenant: Record<string, unknown>;
  now?: string;
}): TenantStorefrontRecord {
  const now = params.now || new Date().toISOString();
  const tenantId = clean(params.tenant.id);
  const name = clean(params.tenant.name, 'Storefront');
  const slug = clean(params.tenant.slug, tenantId);
  return {
    tenantId,
    businessId: clean(params.tenant.businessId),
    slug,
    name,
    publicationStatus: 'draft',
    logoUrl: '',
    primaryColor: '#4f46e5',
    accentColor: '#f59e0b',
    tagline: `Shop ${name}`,
    sections: [
      {
        id: 'hero',
        type: 'hero_banner',
        title: name,
        subtitle: `Discover products from ${name}`,
        enabled: true,
        status: 'active',
        order: 0,
      },
      {
        id: 'featured',
        type: 'featured_products',
        title: 'Featured Products',
        enabled: true,
        status: 'active',
        order: 1,
      },
    ],
    updatedAt: now,
  };
}

export function normalizeStorefrontPayload(input: Partial<TenantStorefrontRecord>, existing: TenantStorefrontRecord): TenantStorefrontRecord {
  const publicationStatus: StorefrontPublicationStatus =
    input.publicationStatus === 'published' ? 'published' : existing.publicationStatus;

  return {
    ...existing,
    logoUrl: clean(input.logoUrl, existing.logoUrl),
    primaryColor: clean(input.primaryColor, existing.primaryColor),
    accentColor: clean(input.accentColor, existing.accentColor),
    tagline: clean(input.tagline, existing.tagline),
    sections: normalizeSections(input.sections ?? existing.sections),
    publicationStatus,
    updatedAt: new Date().toISOString(),
    publishedAt: publicationStatus === 'published' ? (existing.publishedAt || new Date().toISOString()) : existing.publishedAt,
  };
}

export function registerTenantStorefrontRoutes(app: any, deps: {
  requireServerAuth: any;
  requireActiveTenantMembership: any;
  requirePermission: any;
  getAdminDb: () => any;
  extractAuthenticatedTenantId: (user: any) => string | null;
  createAuthoritativeAuditRecord: (input: any) => any;
  updateAuthoritativeSecurityMetrics: (db: any, audit: any, transaction: any) => Promise<void> | void;
}) {
  app.get('/api/storefront/:tenantSlug/config', async (req: any, res: any) => {
    const db = deps.getAdminDb();
    if (!db) return res.status(503).json({ success: false, error: 'Storefront service is not configured.' });
    try {
      const slug = clean(req.params.tenantSlug).toLowerCase();
      const tenantQuery = await db.collection('tenants').where('slug', '==', slug).where('status', '==', 'active').limit(1).get();
      if (tenantQuery.empty) return res.status(404).json({ success: false, error: 'TENANT_NOT_FOUND' });
      const tenantDoc = tenantQuery.docs[0];
      const tenant = { id: tenantDoc.id, ...tenantDoc.data() } as Record<string, unknown>;
      const configSnap = await db.collection('tenants').doc(tenantDoc.id).collection('storefront').doc('config').get();
      const config = configSnap.exists
        ? { ...buildDefaultStorefrontRecord({ tenant }), ...(configSnap.data() as object) }
        : buildDefaultStorefrontRecord({ tenant });
      if (config.publicationStatus !== 'published') {
        return res.status(404).json({ success: false, error: 'STOREFRONT_NOT_PUBLISHED' });
      }
      return res.json({ success: true, storefront: config });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Unable to load storefront.' });
    }
  });

  app.get('/api/tenant/storefront', deps.requireServerAuth, deps.requireActiveTenantMembership, deps.requirePermission('ecommerce.manage'), async (req: any, res: any) => {
    const tenantId = deps.extractAuthenticatedTenantId(req.user);
    const db = deps.getAdminDb();
    if (!tenantId || !db) return res.status(403).json({ error: 'Active tenant membership is required.' });
    try {
      const tenantSnap = await db.collection('tenants').doc(tenantId).get();
      if (!tenantSnap.exists) return res.status(404).json({ error: 'Tenant not found.' });
      const tenant = { id: tenantSnap.id, ...tenantSnap.data() } as Record<string, unknown>;
      const ref = db.collection('tenants').doc(tenantId).collection('storefront').doc('config');
      const snap = await ref.get();
      const storefront = snap.exists
        ? { ...buildDefaultStorefrontRecord({ tenant }), ...(snap.data() as object) }
        : buildDefaultStorefrontRecord({ tenant });
      return res.json({ success: true, storefront });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to load storefront configuration.' });
    }
  });

  app.put('/api/tenant/storefront', deps.requireServerAuth, deps.requireActiveTenantMembership, deps.requirePermission('ecommerce.manage'), async (req: any, res: any) => {
    const tenantId = deps.extractAuthenticatedTenantId(req.user);
    const db = deps.getAdminDb();
    if (!tenantId || !db) return res.status(403).json({ error: 'Active tenant membership is required.' });
    try {
      const tenantRef = db.collection('tenants').doc(tenantId);
      const ref = tenantRef.collection('storefront').doc('config');
      const tenantSnap = await tenantRef.get();
      if (!tenantSnap.exists) return res.status(404).json({ error: 'Tenant not found.' });
      const tenant = { id: tenantSnap.id, ...tenantSnap.data() } as Record<string, unknown>;
      const priorSnap = await ref.get();
      const prior = priorSnap.exists
        ? { ...buildDefaultStorefrontRecord({ tenant }), ...(priorSnap.data() as object) } as TenantStorefrontRecord
        : buildDefaultStorefrontRecord({ tenant });
      const storefront = normalizeStorefrontPayload(req.body || {}, prior);
      const audit = deps.createAuthoritativeAuditRecord({
        tenantId,
        actorUid: req.user.uid,
        actorEmail: req.user.email,
        actorRole: String(req.user.claims?.role || 'Tenant Staff'),
        action: 'STOREFRONT_CONFIG_UPDATED',
        module: 'Storefront',
        targetType: 'storefront',
        targetId: 'config',
        targetName: storefront.name,
        previousState: { publicationStatus: prior.publicationStatus, sections: prior.sections.length },
        newState: { publicationStatus: storefront.publicationStatus, sections: storefront.sections.length },
        reason: 'Tenant storefront configuration updated.',
        result: 'success',
      });
      await db.runTransaction(async (transaction: any) => {
        transaction.set(ref, storefront, { merge: true });
        transaction.create(db.collection('audit_logs').doc(audit.id), audit);
        await deps.updateAuthoritativeSecurityMetrics(db, audit, transaction);
      });
      return res.json({ success: true, storefront });
    } catch (err: any) {
      return res.status(err?.statusCode || 500).json({ error: err?.message || 'Unable to save storefront.' });
    }
  });

  app.post('/api/tenant/storefront/publish', deps.requireServerAuth, deps.requireActiveTenantMembership, deps.requirePermission('ecommerce.manage'), async (req: any, res: any) => {
    const tenantId = deps.extractAuthenticatedTenantId(req.user);
    const db = deps.getAdminDb();
    if (!tenantId || !db) return res.status(403).json({ error: 'Active tenant membership is required.' });
    try {
      const tenantRef = db.collection('tenants').doc(tenantId);
      const ref = tenantRef.collection('storefront').doc('config');
      const tenantSnap = await tenantRef.get();
      if (!tenantSnap.exists) return res.status(404).json({ error: 'Tenant not found.' });
      const priorSnap = await ref.get();
      const tenant = { id: tenantSnap.id, ...tenantSnap.data() } as Record<string, unknown>;
      const prior = priorSnap.exists
        ? { ...buildDefaultStorefrontRecord({ tenant }), ...(priorSnap.data() as object) } as TenantStorefrontRecord
        : buildDefaultStorefrontRecord({ tenant });
      const publish = req.body?.published !== false;
      const storefront = {
        ...prior,
        publicationStatus: publish ? 'published' : 'draft',
        publishedAt: publish ? new Date().toISOString() : prior.publishedAt,
        updatedAt: new Date().toISOString(),
      };
      const audit = deps.createAuthoritativeAuditRecord({
        tenantId,
        actorUid: req.user.uid,
        actorEmail: req.user.email,
        actorRole: String(req.user.claims?.role || 'Tenant Staff'),
        action: publish ? 'STOREFRONT_PUBLISHED' : 'STOREFRONT_UNPUBLISHED',
        module: 'Storefront',
        targetType: 'storefront',
        targetId: 'config',
        targetName: storefront.name,
        previousState: { publicationStatus: prior.publicationStatus },
        newState: { publicationStatus: storefront.publicationStatus },
        reason: publish ? 'Tenant published storefront.' : 'Tenant unpublished storefront.',
        result: 'success',
      });
      await db.runTransaction(async (transaction: any) => {
        transaction.set(ref, storefront, { merge: true });
        transaction.create(db.collection('audit_logs').doc(audit.id), audit);
        await deps.updateAuthoritativeSecurityMetrics(db, audit, transaction);
      });
      return res.json({ success: true, storefront });
    } catch (err: any) {
      return res.status(err?.statusCode || 500).json({ error: err?.message || 'Unable to change storefront publication.' });
    }
  });
}
