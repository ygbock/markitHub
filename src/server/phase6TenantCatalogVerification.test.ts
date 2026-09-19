import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertTenantCatalogResource,
  buildCatalogProductRecord,
  buildCatalogServiceRecord,
  slugifyCatalogValue,
  validateCatalogProductInput,
  validateCatalogServiceInput,
} from './tenantCatalog';

test('Phase 6 Catalog 1: product validation requires canonical name and SKU and rejects unsafe prices', () => {
  assert.throws(() => validateCatalogProductInput({}), /Product name is required/);
  assert.throws(() => validateCatalogProductInput({ name: 'Phone' }), /Product SKU is required/);
  assert.throws(() => validateCatalogProductInput({ name: 'Phone', sku: 'P1', price: -1 }), /non-negative/);
});

test('Phase 6 Catalog 2: product records are tenant-bound and preserve publication semantics', () => {
  const record = buildCatalogProductRecord({
    tenantId: 'tenant-a',
    businessId: 'business-a',
    productId: 'product-a',
    input: { name: 'Phone', sku: 'P1', price: 100, category: 'electronics', publishOnline: true },
    now: '2026-09-19T00:00:00.000Z',
  });
  assert.equal(record.tenantId, 'tenant-a');
  assert.equal(record.businessId, 'business-a');
  assert.equal(record.ecommerce.published, true);
  assert.equal(record.ecommerce.publishTargets.website, true);
  assert.equal(record.ecommerce.storefrontStatus, 'Published');
});

test('Phase 6 Catalog 3: product updates cannot change tenant identity', () => {
  const record = buildCatalogProductRecord({
    tenantId: 'tenant-a',
    businessId: 'business-a',
    productId: 'product-a',
    input: { name: 'Updated', tenantId: 'tenant-b', businessId: 'business-b' },
    existing: { id: 'product-a', tenantId: 'tenant-a', businessId: 'business-a', name: 'Old', sku: 'P1', price: 10, status: 'Active' },
    now: '2026-09-19T00:00:00.000Z',
  });
  assert.equal(record.tenantId, 'tenant-a');
  assert.equal(record.businessId, 'business-a');
});

test('Phase 6 Catalog 4: service validation enforces bounded duration and price', () => {
  assert.throws(() => validateCatalogServiceInput({ name: 'Repair', durationMinutes: 0 }), /duration/);
  assert.throws(() => validateCatalogServiceInput({ name: 'Repair', price: -1 }), /non-negative/);
  assert.equal(validateCatalogServiceInput({ name: 'Repair', durationMinutes: 60 }).name, 'Repair');
});

test('Phase 6 Catalog 5: services are tenant-bound and publish explicitly', () => {
  const record = buildCatalogServiceRecord({
    tenantId: 'tenant-a',
    businessId: 'business-a',
    serviceId: 'service-a',
    input: { name: 'Repair', durationMinutes: 60, publishOnline: true },
    now: '2026-09-19T00:00:00.000Z',
  });
  assert.equal(record.tenantId, 'tenant-a');
  assert.equal(record.businessId, 'business-a');
  assert.equal(record.published, true);
});

test('Phase 6 Catalog 6: tenant resource ownership is fail-closed', () => {
  assert.throws(() => assertTenantCatalogResource(undefined, 'tenant-a', 'product'), /not found/);
  assert.throws(() => assertTenantCatalogResource({ tenantId: 'tenant-b' }, 'tenant-a', 'product'), /Cross-tenant/);
  assert.doesNotThrow(() => assertTenantCatalogResource({ tenantId: 'tenant-a' }, 'tenant-a', 'product'));
});

test('Phase 6 Catalog 7: slugs are bounded and normalized', () => {
  assert.equal(slugifyCatalogValue('  Blue Phone + Pro  '), 'blue-phone-pro');
  assert.ok(slugifyCatalogValue('x'.repeat(200)).length <= 80);
});


test('Phase 6 Catalog 8: server catalog routes require authenticated tenant membership and canonical permissions', async () => {
  const { readFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const source = readFileSync(resolve(process.cwd(), 'src/server/tenantCatalog.ts'), 'utf8');
  assert.match(source, /\/api\/tenant\/catalog\/products/);
  assert.match(source, /\/api\/tenant\/catalog\/services/);
  assert.match(source, /requireServerAuth/);
  assert.match(source, /requireActiveTenantMembership/);
  assert.match(source, /inventory\.create/);
  assert.match(source, /inventory\.edit/);
  assert.match(source, /inventory\.delete/);
  assert.match(source, /services\.view/);
  assert.match(source, /services\.create/);
  assert.match(source, /services\.update/);
  assert.match(source, /services\.delete/);
});

test('Phase 6 Catalog 9: catalog resources are stored under tenant-scoped Firestore collections', async () => {
  const { readFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const source = readFileSync(resolve(process.cwd(), 'src/server/tenantCatalog.ts'), 'utf8');
  assert.match(source, /collection\('tenants'\)\.doc\(tenantId\)\.collection\('products'\)/);
  assert.match(source, /collection\('tenants'\)\.doc\(tenantId\)\.collection\('services'\)/);
  assert.doesNotMatch(source, /db\.collection\('products'\)\.doc\(req\.params\.productId\)/);
  assert.doesNotMatch(source, /db\.collection\('services'\)\.doc\(req\.params\.serviceId\)/);
});

test('Phase 6 Catalog 10: catalog mutations atomically pair resource changes with authoritative audit records', async () => {
  const { readFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const source = readFileSync(resolve(process.cwd(), 'src/server/tenantCatalog.ts'), 'utf8');
  assert.match(source, /db\.batch\(\)/);
  assert.match(source, /db\.collection\('audit_logs'\)\.doc\(audit\.id\)/);
  assert.match(source, /updateAuthoritativeSecurityMetrics\(db, audit, batch\)/);
  assert.match(source, /await batch\.commit\(\)/);
});

test('Phase 6 Catalog 11: product and service publication remains explicit and reversible without exposing archived records publicly', () => {
  const product = buildCatalogProductRecord({
    tenantId: 'tenant-a', businessId: 'business-a', productId: 'p1',
    input: { name: 'Widget', sku: 'W1', price: 10, category: 'tools', publishOnline: false },
    now: '2026-09-19T00:00:00.000Z',
  });
  assert.equal(product.ecommerce.published, false);
  assert.equal(product.ecommerce.publishTargets.website, false);

  const service = buildCatalogServiceRecord({
    tenantId: 'tenant-a', businessId: 'business-a', serviceId: 's1',
    input: { name: 'Repair', status: 'archived', publishOnline: false },
    now: '2026-09-19T00:00:00.000Z',
  });
  assert.equal(service.published, false);
  assert.equal(service.status, 'archived');
});
