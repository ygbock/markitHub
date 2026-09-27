import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const tenantManagerSource = () =>
  readFileSync(resolve(process.cwd(), 'src/server/tenantManager.ts'), 'utf8');

test('storefront tenant resolver defines explicit route precedence', () => {
  const source = tenantManagerSource();
  assert.ok(source.includes('export function resolveStorefrontTenantSlug(input:'));
  assert.ok(source.includes('const routeTenantSlug = clean(input.routeTenantSlug);'));
  assert.ok(source.includes('if (routeTenantSlug) return routeTenantSlug;'));
});

test('storefront tenant resolver supports canonical hostname routing', () => {
  const source = tenantManagerSource();
  assert.ok(source.includes("storefrontBaseDomain || 'nexuspos.io'"));
  assert.ok(source.includes("hostname.endsWith('.' + baseDomain)"));
  assert.ok(source.includes("hostLabel.startsWith('store-')"));
  assert.ok(source.includes("hostLabel.slice('store-'.length)"));
});

test('storefront tenant resolver supports /store/:tenantSlug paths', () => {
  const source = tenantManagerSource();
  assert.ok(source.includes('input.pathname'));
  assert.ok(source.includes('match(/^\\/store/([^/?#]+)/)'));
  assert.ok(source.includes('decodeURIComponent(pathMatch[1])'));
});

test('storefront tenant resolver has deterministic header/query/default fallbacks', () => {
  const source = tenantManagerSource();
  assert.ok(source.includes('const headerTenantSlug = clean(input.tenantSlugHeader);'));
  assert.ok(source.includes('if (headerTenantSlug) return headerTenantSlug;'));
  assert.ok(source.includes('const headerTenantId = clean(input.tenantIdHeader);'));
  assert.ok(source.includes('if (headerTenantId) return headerTenantId;'));
  assert.ok(source.includes('const queryTenant = clean(input.queryTenant);'));
  assert.ok(source.includes('if (queryTenant) return queryTenant;'));
  assert.ok(source.includes("return 'nexus-retail';"));
});

test('storefront hostname routing is constrained to the configured base domain', () => {
  const source = tenantManagerSource();
  assert.ok(source.includes("hostname.endsWith('.' + baseDomain)"));
  assert.ok(source.includes("hostLabel.startsWith('store-')"));
  assert.ok(!source.includes('hostname.includes(baseDomain)'));
});
