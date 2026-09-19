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
