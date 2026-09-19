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
