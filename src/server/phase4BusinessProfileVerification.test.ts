import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('Phase 4 Invariant 1: public business profile is owned by the canonical public business route', () => {
  const routes = read('src/routes/canonicalRoutes.ts');
  const app = read('src/App.tsx');
  const page = read('src/components/discovery/PublicBusinessProfilePage.tsx');
  assert.match(routes, /id: 'public\.business\.profile'[\s\S]*pattern: '\/business\/:businessSlug'[\s\S]*domain: 'PUBLIC_DISCOVERY'/);
  assert.match(app, /currentRoute\.definition\.id === 'public\.business\.profile'/);
  assert.match(app, /PublicBusinessProfilePage/);
  assert.match(page, /onNavigate\('\/businesses'\)/);
});

test('Phase 4 Invariant 2: profile resolution uses authoritative business slug lookup', () => {
  const page = read('src/components/discovery/PublicBusinessProfilePage.tsx');
  const repository = read('src/discovery/discoveryRepository.ts');
  assert.match(page, /getBusinessBySlug\(slug\)/);
  assert.match(repository, /where\('listing\.slug', '==', normalizedSlug\)/);
  assert.match(repository, /where\('status', '==', 'active'\)/);
  assert.match(repository, /listing\.isPublished !== true/);
});

test('Phase 4 Invariant 3: profile exposes business identity, trust, contact, locations, and hours', () => {
  const page = read('src/components/discovery/PublicBusinessProfilePage.tsx');
  for (const pattern of [/business\.name/, /business\.headline/, /business\.isVerified/, /business\.ratingAverage/, /business\.reviewCount/, /business\.email/, /business\.locations/, /isOpenNow/, /Directions/]) assert.match(page, pattern);
});

test('Phase 4 Invariant 4: tenant status changes only the public call-to-action and never grants tenant operations access', () => {
  const page = read('src/components/discovery/PublicBusinessProfilePage.tsx');
  assert.match(page, /business\.isTenant && business\.tenantSlug/);
  assert.match(page, /\/store\/\$\{business\.tenantSlug\}/);
  assert.doesNotMatch(page, /\/tenant\//);
});

test('Phase 4 Invariant 5: profile connects authoritative business offerings without mutating them', () => {
  const page = read('src/components/discovery/PublicBusinessProfilePage.tsx');
  assert.match(page, /listServices\(\{ limit: 100, filters: \{ businessId: result\.id \} \}\)/);
  assert.match(page, /listProducts\(\{ limit: 100, filters: \{ businessId: result\.id \} \}\)/);
  assert.match(page, /\/service\/\$\{service\.id\}/);
  assert.match(page, /\/product\/\$\{product\.id\}/);
  assert.doesNotMatch(page, /save[A-Z]|delete[A-Z]|update[A-Z]/);
});

test('Phase 4 Invariant 6: profile handles not-found and authoritative load failures explicitly', () => {
  const page = read('src/components/discovery/PublicBusinessProfilePage.tsx');
  assert.match(page, /'not-found' \| 'load-error'/);
  assert.match(page, /setError\('not-found'\)/);
  assert.match(page, /setError\('load-error'\)/);
  assert.match(page, /Business not found/);
  assert.match(page, /Profile unavailable/);
});

test('Phase 4 Invariant 7: public profile remains entity-owned and canonical navigation is preserved', () => {
  const page = read('src/components/discovery/PublicBusinessProfilePage.tsx');
  assert.match(page, /\/businesses/);
  assert.match(page, /\/store\/\$\{business\.tenantSlug\}/);
  assert.match(page, /\/service\/\$\{service\.id\}/);
  assert.match(page, /\/product\/\$\{product\.id\}/);
  assert.doesNotMatch(page, /\/business\/\$\{business\.id\}/);
  assert.doesNotMatch(page, /\/tenant\//);
});

test('Phase 4 Invariant 8: public business read model includes profile contact and media fields', () => {
  const types = read('src/discovery/types.ts');
  const repository = read('src/discovery/discoveryRepository.ts');
  assert.match(types, /email\?: string/);
  assert.match(types, /phone\?: string/);
  assert.match(types, /badges: string\[\]/);
  assert.match(types, /photos: string\[\]/);
  assert.match(repository, /email: \(raw as Record<string, unknown>\)\.email/);
  assert.match(repository, /photos: Array\.isArray/);
});