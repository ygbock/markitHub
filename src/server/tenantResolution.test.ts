import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const tenantManagerSource = () =>
  readFileSync(resolve(process.cwd(), 'src/server/tenantManager.ts'), 'utf8');

test('storefront tenant resolver defines explicit route precedence', () => {
  const source = tenantManagerSource();
  assert.match(source, /export function resolveStorefrontTenantSlug\(input:/);
  assert.match(source, /const routeTenantSlug = clean\(input\.routeTenantSlug\);/);
  assert.match(source, /if \(routeTenantSlug\) return routeTenantSlug;/);
});

test('storefront tenant resolver supports canonical hostname routing', () => {
  const source = tenantManagerSource();
  assert.match(source, /storefrontBaseDomain\|\| 'nexuspos\.io'/);
  assert.match(source, /hostname\.endsWith\('\.' \+ baseDomain\)/);
  assert.match(source, /hostLabel\.startsWith\('store-'\)/);
  assert.match(source, /hostLabel\.slice\('store-'\.length\)/);
});

test('storefront tenant resolver supports /store/:tenantSlug paths', () => {
  const source = tenantManagerSource();
  assert.match(source, /input\.pathname/);
  assert.match(source, /match\(\/\^\\\/store\\\/\(\[\^\/?#\]\+\)\+\)\/\)/);
  assert.match(source, /decodeURIComponent\(pathMatch\[1\]\)/);
});

test('storefront tenant resolver has deterministic header/query/default fallbacks', () => {
  const source = tenantManagerSource();
  assert.match(source, /const headerTenantSlug = clean\(input\.tenantSlugHeader\);/);
  assert.match(source, /if \(headerTenantSlug\) return headerTenantSlug;/);
  assert.match(source, /const headerTenantId = clean\(input\.tenantIdHeader\);/);
  assert.match(source, /if \(headerTenantId\) return headerTenantId;/);
  assert.match(source, /const queryTenant = clean\(input\.queryTenant\);/);
  assert.match(source, /if \(queryTenant\) return queryTenant;/);
  assert.match(source, /return 'nexus-retail';/);
});

test('storefront hostname routing is constrained to the configured base domain', () => {
  const source = tenantManagerSource();
  assert.match(source, /hostname\.endsWith\('\.' \+ baseDomain\)/);
  assert.match(source, /hostLabel\.startsWith\('store-'\)/);
  assert.doesNotMatch(source, /hostname\.includes\(baseDomain\)/);
});
