import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { distanceKm } from '../discovery/discoveryRepository';

test('Phase 3A Invariant 1: discovery domain exposes all four canonical entity types', async () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/types.ts'), 'utf8');
  for (const type of ['business', 'product', 'service', 'category']) {
    assert.match(source, new RegExp("'" + type + "'"));
  }
});

test('Phase 3A Invariant 2: public business result requires an active published listing', async () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /listing\.isPublished !== true/);
  assert.match(source, /raw\.status !== 'active'/);
});

test('Phase 3A Invariant 3: products require publication and active status', async () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /published = ecommerce\?\.published === true/);
  assert.match(source, /status !== 'Active'/);
});

test('Phase 3A Invariant 4: suspended/inactive public records are not queried as discoverable businesses or categories', async () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /where\('status', '==', 'active'\)/);
  assert.ok(!source.includes("where('status', '==', 'suspended')"));
});

test('Phase 3A Invariant 5: discovery repository is read-only', async () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.ok(!/\b(setDoc|addDoc|updateDoc|deleteDoc)\b/.test(source));
});

test('Phase 3A Invariant 6: geographic discovery uses haversine distance in kilometers', () => {
  const zero = distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 });
  const oneDegree = distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 });
  assert.equal(zero, 0);
  assert.ok(oneDegree > 110 && oneDegree < 112);
});

test('Phase 3A Invariant 7: nearby filtering has a bounded default radius', async () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /radiusKm \?\? 25/);
});

test('Phase 3A Invariant 8: query limits are bounded to prevent unbounded public reads', async () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /MAX_LIMIT = 100/);
  assert.match(source, /Math\.min\(Math\.max/);
});

test('Phase 3A Invariant 9: tenant-scoped products and services cannot cross requested tenant filters', async () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /filters\.tenantId && item\.tenantId !== filters\.tenantId/);
});

test('Phase 3A Invariant 10: unified discovery search covers business, product, service, and category', async () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  for (const name of ['listBusinesses', 'listProducts', 'listServices', 'listCategories']) {
    assert.match(source, new RegExp(name));
  }
  assert.match(source, /Promise\.all/);
});

test('Phase 3A Invariant 11: category normalization preserves canonical slug and hierarchy fields', async () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /slug: raw\.slug \|\| docSnap\.id/);
  assert.match(source, /parentId: raw\.parent_id \?\? null/);
});

test('Phase 3A Invariant 12: repository is exported as the canonical discovery read service', async () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /export const discoveryRepository: DiscoveryRepository/);
});

test('Phase 3B Invariant 13: business discovery exposes canonical ID and slug profile reads', async () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /getBusinessById/);
  assert.match(source, /getBusinessBySlug/);
  assert.match(source, /where\('listing\.slug', '==', normalizedSlug\)/);
});

test('Phase 3B Invariant 14: listing-only businesses remain discoverable without tenant activation', async () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /isTenant: Array\.isArray\(raw\.tenantIds\) && raw\.tenantIds\.length > 0/);
  assert.match(source, /listing\.isPublished !== true/);
});

test('Phase 3B Invariant 15: tenant activation is represented as optional business state, never required for listing visibility', async () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.doesNotMatch(source, /if \(!raw\.tenantIds\)/);
  assert.match(source, /raw\.status !== 'active'/);
});

test('Phase 3B Invariant 16: verified status is derived from authoritative business verification state', async () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /isVerified: raw\.verificationStatus === 'verified'/);
});

test('Phase 3B Invariant 17: public business profile reads are bounded and read-only', async () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /firestoreLimit\(3\)/);
  assert.ok(!/\b(setDoc|addDoc|updateDoc|deleteDoc)\b/.test(source));
});

test('Phase 3B Invariant 18: distance sorting uses real business location coordinates when supplied', async () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /case 'distance': return withDistance\(a\) - withDistance\(b\)/);
  assert.match(source, /item\.locations\.filter\(l => l\.geo\)/);
});

test('Phase 3C Invariant 19: product discovery derives tenant ownership from the Firestore product path when available', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /docSnap\.ref\.parent\.parent\?\.id/);
  assert.match(source, /tenantId: tenantId/);
});

test('Phase 3C Invariant 20: publicly discoverable products must be active and published, with explicit website opt-out respected', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /status !== 'Active'/);
  assert.match(source, /published = ecommerce\?\.published === true/);
  assert.match(source, /publishTargets\?\.website === false/);
});

test('Phase 3C Invariant 21: product availability includes variant stock and explicit backorder policy', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /variant\.available \?\? variant\.onHand \?\? variant\.stock/);
  assert.match(source, /raw\.allowBackorder === true/);
});

test('Phase 3C Invariant 22: product discovery supports canonical ID and slug lookups', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/types.ts'), 'utf8');
  assert.match(source, /getProductById/);
  assert.match(source, /getProductBySlug/);
  const repository = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(repository, /where\('ecommerce\.slug', '==', normalizedSlug\)/);
});

test('Phase 3C Invariant 23: product discovery supports category, brand, price, availability, featured, tenant, and business filters', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.ok(source.includes('filters.categorySlug'));
  assert.ok(source.includes('filters.tenantId'));
  assert.ok(source.includes('filters.businessId'));
  assert.ok(source.includes('filters.availableOnly'));
  assert.ok(source.includes('filters.minPrice'));
  assert.ok(source.includes('filters.maxPrice'));
  assert.ok(source.includes('filters.featuredOnly'));
  assert.ok(source.includes('textMatches(item.brand'));
});

test('Phase 3C Invariant 24: product lookup and discovery remain read-only and bounded', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.ok(!/\b(setDoc|addDoc|updateDoc|deleteDoc)\b/.test(source));
  assert.match(source, /firestoreLimit\(3\)/);
  assert.match(source, /firestoreLimit\(100\)/);
});


test('Phase 3D Invariant 25: service discovery exposes canonical ID and slug lookup methods', () => {
  const types = readFileSync(resolve(process.cwd(), 'src/discovery/types.ts'), 'utf8');
  assert.match(types, /getServiceById/);
  assert.match(types, /getServiceBySlug/);
  const repository = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(repository, /where\('slug', '==', normalizedSlug\)/);
});

test('Phase 3D Invariant 26: publicly discoverable services require explicit publication and reject inactive lifecycle states', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /published = raw\.published === true/);
  assert.match(source, /\['inactive', 'archived', 'suspended', 'draft'\]/);
  assert.match(source, /publishTargets\?\.website === false/);
});

test('Phase 3D Invariant 27: service tenant ownership is derived from the Firestore path when available', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /normalizeService\(docSnap\.data\(\), docSnap\.id, docSnap\.ref\.parent\.parent\?\.id\)/);
  assert.match(source, /tenantId: tenantId \|\| raw\.tenantId/);
});

test('Phase 3D Invariant 28: service discovery preserves business linkage, booking capability, pricing, duration, and media', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  for (const field of ['businessId: raw.businessId', 'bookingEnabled: raw.bookingEnabled !== false', 'durationMinutes:', 'price:', 'imageUrl: raw.imageUrl']) {
    assert.ok(source.includes(field), 'missing service field: ' + field);
  }
});

test('Phase 3D Invariant 29: service discovery supports category, tenant, business, text, and price filters', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  for (const field of ['filters.categorySlug', 'filters.tenantId', 'filters.businessId', 'filters.minPrice', 'filters.maxPrice', 'filters.text']) {
    assert.ok(source.includes(field), 'missing service filter: ' + field);
  }
});

test('Phase 3D Invariant 30: service discovery remains read-only and bounded', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.ok(!/\b(setDoc|addDoc|updateDoc|deleteDoc)\b/.test(source));
  assert.match(source, /firestoreLimit\(3\)/);
  assert.match(source, /Math\.min\(limit \* 3, MAX_LIMIT\)/);
});
