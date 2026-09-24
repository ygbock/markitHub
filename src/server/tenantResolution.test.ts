import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveStorefrontTenantSlug } from './tenantManager';

test('storefront tenant resolution prefers an explicit API route tenant', () => {
  assert.equal(
    resolveStorefrontTenantSlug({
      routeTenantSlug: 'apex-gadgets',
      hostname: 'store-nexus-retail.nexuspos.io',
      pathname: '/store/nexus-retail',
      tenantSlugHeader: 'sierra-boutique',
      queryTenant: 'nexus-retail',
    }),
    'apex-gadgets',
  );
});

test('storefront tenant resolution supports the canonical hostname pipeline', () => {
  assert.equal(
    resolveStorefrontTenantSlug({
      hostname: 'store-apex-gadgets.nexuspos.io',
      pathname: '/store/nexus-retail',
      tenantSlugHeader: 'sierra-boutique',
      queryTenant: 'nexus-retail',
    }),
    'apex-gadgets',
  );
});

test('storefront tenant resolution falls back to /store/:tenantSlug', () => {
  assert.equal(
    resolveStorefrontTenantSlug({
      hostname: 'localhost:3000',
      pathname: '/store/sierra-boutique/shop',
      tenantSlugHeader: 'apex-gadgets',
      queryTenant: 'nexus-retail',
    }),
    'sierra-boutique',
  );
});

test('storefront tenant resolution falls back from headers to query and then default', () => {
  assert.equal(
    resolveStorefrontTenantSlug({
      hostname: 'localhost:3000',
      pathname: '/shop',
      tenantSlugHeader: 'apex-gadgets',
      queryTenant: 'sierra-boutique',
    }),
    'apex-gadgets',
  );

  assert.equal(
    resolveStorefrontTenantSlug({
      hostname: 'localhost:3000',
      pathname: '/shop',
      queryTenant: 'sierra-boutique',
    }),
    'sierra-boutique',
  );

  assert.equal(
    resolveStorefrontTenantSlug({
      hostname: 'localhost:3000',
      pathname: '/shop',
    }),
    'nexus-retail',
  );
});

test('storefront hostname resolution ignores unrelated domains', () => {
  assert.equal(
    resolveStorefrontTenantSlug({
      hostname: 'store-apex-gadgets.attacker.example',
      pathname: '/shop',
      tenantSlugHeader: 'sierra-boutique',
    }),
    'sierra-boutique',
  );
});
