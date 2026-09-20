import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('Phase 8 Invariant 1: storefront CMS routes are tenant-scoped and derive tenant identity from authenticated server context', () => {
  const source = fs.readFileSync(path.resolve(root, 'src/server/tenantStorefront.ts'), 'utf8');
  assert.match(source, /extractAuthenticatedTenantId\(req\.user\)/);
  assert.match(source, /tenants.*storefront.*config/);
  assert.doesNotMatch(source, /req\.body\.tenantId/);
  assert.doesNotMatch(source, /req\.query\.tenantId/);
});

test('Phase 8 Invariant 2: storefront mutations require active membership and ecommerce.manage', () => {
  const source = fs.readFileSync(path.resolve(root, 'src/server/tenantStorefront.ts'), 'utf8');
  assert.match(source, /requireServerAuth, deps\.requireActiveTenantMembership, deps\.requirePermission\('ecommerce\.manage'\)/);
});

test('Phase 8 Invariant 3: public storefront reads only resolve active tenant slugs and published configurations', () => {
  const source = fs.readFileSync(path.resolve(root, 'src/server/tenantStorefront.ts'), 'utf8');
  assert.match(source, /where\('slug', '==', slug\)/);
  assert.match(source, /where\('status', '==', 'active'\)/);
  assert.match(source, /publicationStatus !== 'published'/);
});

test('Phase 8 Invariant 4: storefront config mutations atomically write configuration, audit, and security telemetry', () => {
  const source = fs.readFileSync(path.resolve(root, 'src/server/tenantStorefront.ts'), 'utf8');
  assert.match(source, /runTransaction/);
  assert.match(source, /transaction\.set\(ref, storefront/);
  assert.match(source, /transaction\.create\(db\.collection\('audit_logs'\)/);
  assert.match(source, /updateAuthoritativeSecurityMetrics\(db, audit, transaction\)/);
});

test('Phase 8 Invariant 5: publication is explicit and reversible', () => {
  const source = fs.readFileSync(path.resolve(root, 'src/server/tenantStorefront.ts'), 'utf8');
  assert.match(source, /STOREFRONT_PUBLISHED/);
  assert.match(source, /STOREFRONT_UNPUBLISHED/);
  assert.match(source, /req\.body\?\.published !== false/);
  assert.match(source, /publicationStatus: publish \? 'published' : 'draft'/);
});

test('Phase 8 Invariant 6: public storefront is rendered from the authoritative CMS endpoint and tenant catalog read model', () => {
  const source = fs.readFileSync(path.resolve(root, 'src/components/storefront/AuthoritativeStorefrontPage.tsx'), 'utf8');
  assert.match(source, /\/api\/storefront\/' \+ encodeURIComponent\(tenantSlug\) \+ '\/config/);
  assert.match(source, /discoveryRepository\.listProducts/);
  assert.match(source, /tenantId: config\.tenantId/);
  assert.doesNotMatch(source, /localStorage\.getItem\('nexus_homepage_config'\)/);
});

test('Phase 8 Invariant 7: tenant CMS UI persists through authoritative server APIs and does not use localStorage', () => {
  const source = fs.readFileSync(path.resolve(root, 'src/components/storefront/TenantStorefrontManagement.tsx'), 'utf8');
  assert.match(source, /\/api\/tenant\/storefront/);
  assert.match(source, /method: publish \? 'POST' : 'PUT'/);
  assert.doesNotMatch(source, /localStorage/);
});

test('Phase 8 Invariant 8: canonical storefront routes remain public storefront routes and tenant CMS remains tenant-owned', () => {
  const routes = fs.readFileSync(path.resolve(root, 'src/routes/canonicalRoutes.ts'), 'utf8');
  assert.match(routes, /id: 'storefront\.home'[\s\S]*domain: 'STOREFRONT'/);
  assert.match(routes, /id: 'storefront\.products'[\s\S]*domain: 'STOREFRONT'/);
  assert.match(routes, /id: 'storefront\.product\.detail'[\s\S]*domain: 'STOREFRONT'/);
  assert.match(routes, /id: 'storefront\.categories'[\s\S]*domain: 'STOREFRONT'/);
  assert.match(routes, /id: 'tenant\.storefront'[\s\S]*requiredPermission: 'ecommerce\.manage'/);
});

test('Phase 8 Invariant 9: App dispatches canonical storefront routes to authoritative surfaces before legacy commerce flows', () => {
  const source = fs.readFileSync(path.resolve(root, 'src/App.tsx'), 'utf8');
  assert.match(source, /AuthoritativeStorefrontPage/);
  assert.match(source, /TenantStorefrontManagement/);
  assert.match(source, /storefront\.home[\\s\\S]*storefront\.products[\\s\\S]*storefront\.product\.detail[\\s\\S]*storefront\.categories/);
  assert.match(source, /currentRoute\.definition\.id === 'tenant\.storefront'/);
});

test('Phase 8 Invariant 10: storefront payload normalization bounds CMS content and preserves server identity fields', () => {
  const source = fs.readFileSync(path.resolve(root, 'src/server/tenantStorefront.ts'), 'utf8');
  assert.match(source, /slice\(0, 50\)/);
  assert.match(source, /slice\(0, 100\)/);
  assert.match(source, /tenantId,/);
  assert.match(source, /businessId:/);
  assert.match(source, /slug,/);
});


test('Phase 8 Invariant 11: tenant provisioning initializes a tenant-owned storefront draft in the same transaction', () => {
  const source = fs.readFileSync(path.resolve(root, 'server.ts'), 'utf8');
  assert.match(source, /tenantRef\.collection\('storefront'\)\.doc\('config'\)/);
  assert.match(source, /buildDefaultStorefrontRecord\(\{ tenant: records\.tenant \}\)/);
  assert.match(source, /transaction\.create\(storefrontRef, storefrontRecord\)/);
});
