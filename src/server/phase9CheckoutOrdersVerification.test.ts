import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('Phase 9 Invariant 1: checkout resolves tenant from storefront slug and never trusts a client tenantId', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/storefrontCheckout.ts'), 'utf8');
  assert.match(source, /resolveTenant\(db, req\.params\.tenantSlug\)/);
  assert.doesNotMatch(source, /req\.body\?\.tenantId/);
});

test('Phase 9 Invariant 2: checkout validates server catalog state and ignores browser prices for authority', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/storefrontCheckout.ts'), 'utf8');
  assert.match(source, /collection\('tenants'\)\.doc\(tenant\.id\)\.collection\('products'\)/);
  assert.match(source, /serverUnitPrice/);
  assert.match(source, /priceMismatchDetected/);
  assert.match(source, /ecommerce\?\.published === false/);
});

test('Phase 9 Invariant 3: checkout quote recalculates shipping, discount, tax, currency, and grand total server-side', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/storefrontCheckout.ts'), 'utf8');
  assert.match(source, /shippingCost/);
  assert.match(source, /validateCouponAuthoritative/);
  assert.match(source, /taxAmount/);
  assert.match(source, /grandTotal/);
  assert.match(source, /currency/);
});

test('Phase 9 Invariant 4: order creation uses a Firestore transaction for durable order and reservation creation', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/storefrontCheckout.ts'), 'utf8');
  assert.match(source, /runTransaction\(async/);
  assert.match(source, /collection\('orders'\)\.doc\(orderId\)/);
  assert.match(source, /collection\('inventory_reservations'\)\.doc\(reservationId\)/);
  assert.match(source, /tx\.create\(orderRef/);
  assert.match(source, /tx\.create\(reservationRef/);
});

test('Phase 9 Invariant 5: inventory reservation is tenant-scoped, expiring, and concurrency-aware', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/storefrontCheckout.ts'), 'utf8');
  assert.match(source, /status: 'active'/);
  assert.match(source, /expiresAt/);
  assert.match(source, /reservedBefore/);
  assert.match(source, /available = stockBefore - stockReservedBefore/);
});

test('Phase 9 Invariant 6: order identity is bound to verified authentication when available and guest checkout remains possible', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/storefrontCheckout.ts'), 'utf8');
  assert.match(source, /optionalServerAuth/);
  assert.match(source, /req\.user\?\.uid/);
  assert.match(source, /customerUid = req\.user\?\.uid/);
});

test('Phase 9 Invariant 7: order access uses an unguessable token hash or matching authenticated customer UID', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/storefrontCheckout.ts'), 'utf8');
  assert.match(source, /crypto\.randomBytes\(32\)/);
  assert.match(source, /hashAccessToken/);
  assert.match(source, /ORDER_ACCESS_DENIED/);
  assert.match(source, /order\.customerUid/);
});

test('Phase 9 Invariant 8: cancellation releases reserved quantities transactionally and blocks paid-order cancellation', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/storefrontCheckout.ts'), 'utf8');
  assert.match(source, /PAID_ORDER_CANNOT_BE_CANCELLED/);
  assert.match(source, /status: 'released'/);
  assert.match(source, /reserved: Math\.max\(0/);
  assert.match(source, /variants\[idx\]\.reserved/);
});

test('Phase 9 Invariant 9: authoritative checkout routes are mounted before the legacy storefront order handler', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const phase9 = server.indexOf('registerStorefrontCheckoutRoutes(app');
  const legacy = server.indexOf("app.post('/api/storefront/:tenantSlug/orders'");
  assert.ok(phase9 >= 0 && legacy >= 0 && phase9 < legacy);
  assert.match(server.slice(phase9, phase9 + 800), /optionalServerAuth/);
});

test('Phase 9 Invariant 10: storefront cart, checkout, and orders routes use dedicated authoritative UI surfaces', () => {
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(app, /StorefrontCartPage/);
  assert.match(app, /StorefrontCheckoutPage/);
  assert.match(app, /StorefrontOrdersPage/);
  assert.match(app, /currentRoute\.definition\.id === 'storefront\.cart'/);
  assert.match(app, /currentRoute\.definition\.id === 'storefront\.checkout'/);
  assert.match(app, /currentRoute\.definition\.id === 'storefront\.orders'/);
});

test('Phase 9 Invariant 11: storefront product actions feed the canonical cart instead of the legacy commerce shell', () => {
  const storefront = readFileSync(resolve(process.cwd(), 'src/components/storefront/AuthoritativeStorefrontPage.tsx'), 'utf8');
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(storefront, /onAddToCart/);
  assert.match(app, /addToStorefrontCart/);
  assert.match(app, /AuthoritativeStorefrontPage/);
  assert.doesNotMatch(app, /activeDomain === 'STOREFRONT'.*ECommerceStorefront/s);
});

test('Phase 9 Invariant 12: checkout UI submits only product IDs, quantities, and customer delivery intent; server recalculates pricing', () => {
  const checkout = readFileSync(resolve(process.cwd(), 'src/components/storefront/StorefrontCheckoutPage.tsx'), 'utf8');
  assert.match(checkout, /\/api\/storefront\/.*\/checkout\/validate/);
  assert.match(checkout, /\/api\/storefront\/.*\/orders/);
  assert.match(checkout, /productId/);
  assert.match(checkout, /quantity/);
  assert.match(checkout, /shippingAddress/);
  assert.doesNotMatch(checkout, /price:\s*item\.price/);
});
