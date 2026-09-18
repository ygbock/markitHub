import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { computeOpenNow, distanceKm, normalizeDiscoveryLocation, parseOperatingHours } from '../discovery/discoveryRepository';

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


test('Phase 3E Invariant 31: unified discovery exposes a typed ranked result contract across all canonical entities', () => {
  const types = readFileSync(resolve(process.cwd(), 'src/discovery/types.ts'), 'utf8');
  assert.match(types, /export interface DiscoverySearchItem/);
  assert.match(types, /type: DiscoveryEntityType/);
  assert.match(types, /rankedResults: DiscoverySearchItem\[\]/);
});

test('Phase 3E Invariant 32: unified search queries all requested entity domains concurrently', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /const \[businesses, products, services, categories\] = await Promise\.all/);
  for (const method of ['listBusinesses', 'listProducts', 'listServices', 'listCategories']) {
    assert.match(source, new RegExp(method + '\\(candidateQuery\\)'));
  }
});

test('Phase 3E Invariant 33: unified search ranks exact and prefix text matches above weaker matches', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /haystack === needle/);
  assert.match(source, /haystack\.startsWith\(needle\)/);
  assert.match(source, /b\.score - a\.score/);
});

test('Phase 3E Invariant 34: unified search preserves bounded candidate reads before cross-entity ranking', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /candidateLimit = Math\.min\(boundedLimit\(queryOptions\.limit\) \* 3, MAX_LIMIT\)/);
  assert.match(source, /\.slice\(0, boundedLimit\(queryOptions\.limit\)\)/);
});

test('Phase 3E Invariant 35: unified search supports explicit entity-type narrowing', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /queryOptions\.types/);
  assert.match(source, /types\.includes\('business'\)/);
  assert.match(source, /types\.includes\('product'\)/);
  assert.match(source, /types\.includes\('service'\)/);
  assert.match(source, /types\.includes\('category'\)/);
});

test('Phase 3E Invariant 36: canonical /search route renders the unified search experience', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(source, /UnifiedSearchPage/);
  assert.match(source, /currentRoute\.definition\.id !== 'public\.search'/);
  assert.match(source, /currentRoute\.definition\.id === 'public\.search'/);
});

test('Phase 3E Invariant 37: unified search UI navigates to canonical entity-owned routes', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/discovery/UnifiedSearchPage.tsx'), 'utf8');
  assert.match(source, /'\/business\/'/);
  assert.match(source, /'\/product\/'/);
  assert.match(source, /'\/service\/'/);
  assert.match(source, /'\/category\/'/);
});

test('Phase 3E Invariant 38: unified search remains read-only and uses the canonical discovery repository', () => {
  const repository = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  const ui = readFileSync(resolve(process.cwd(), 'src/components/discovery/UnifiedSearchPage.tsx'), 'utf8');
  assert.ok(!/\b(setDoc|addDoc|updateDoc|deleteDoc)\b/.test(repository));
  assert.match(ui, /import \{ discoveryRepository \} from '\.\.\/\.\.\/discovery\/discoveryRepository'/);
});


test('Phase 3F Invariant 39: discovery filters expose the canonical filter vocabulary', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/types.ts'), 'utf8');
  for (const field of ['categorySlug', 'verifiedOnly', 'featuredOnly', 'openNow', 'availableOnly', 'minPrice', 'maxPrice', 'latitude', 'longitude', 'radiusKm']) {
    assert.match(source, new RegExp(field + '\\?'));
  }
});

test('Phase 3F Invariant 40: filter input is normalized and invalid numeric bounds are rejected', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /function normalizeFilters/);
  assert.match(source, /Number\.isFinite\(normalized\.minPrice\)/);
  assert.match(source, /Number\.isFinite\(normalized\.maxPrice\)/);
  assert.match(source, /normalized\.minPrice > normalized\.maxPrice/);
});

test('Phase 3F Invariant 41: geographic filter inputs validate coordinate ranges and cap radius', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /normalized\.latitude! < -90/);
  assert.match(source, /normalized\.longitude! > 180/);
  assert.match(source, /Math\.min\(Math\.max\(normalized\.radiusKm, 1\), 100\)/);
});

test('Phase 3F Invariant 42: business filters cover category, verification, featured, open-now, and geographic radius', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  for (const field of ['filters.categorySlug', 'filters.verifiedOnly', 'filters.featuredOnly', 'filters.openNow', 'filters.latitude', 'filters.longitude', 'filters.radiusKm']) {
    assert.ok(source.includes(field), 'missing business filter: ' + field);
  }
});

test('Phase 3F Invariant 43: product and service filters cover tenant/business/category and price constraints', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  for (const field of ['filters.categorySlug', 'filters.tenantId', 'filters.businessId', 'filters.minPrice', 'filters.maxPrice']) {
    assert.ok(source.includes(field), 'missing commerce/service filter: ' + field);
  }
  assert.match(source, /filters\.availableOnly/);
});

test('Phase 3F Invariant 44: category filtering is applied to category results as well as business/product/service results', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /if \(filters\.categorySlug && item\.slug !== filters\.categorySlug\) return false/);
});

test('Phase 3F Invariant 45: canonical search UI exposes filter controls and a reset path', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/discovery/UnifiedSearchPage.tsx'), 'utf8');
  for (const label of ['Category', 'Minimum price', 'Maximum price', 'Radius (km)', 'Verified businesses', 'Featured', 'Open now', 'Available now']) {
    assert.ok(source.includes(label), 'missing label: ' + label);
  }
  assert.match(source, /Reset discovery filters/);
  assert.match(source, /setFilters\(DEFAULT_FILTERS\)/);
});

test('Phase 3F Invariant 46: filter state is passed through the canonical discovery repository on search', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/discovery/UnifiedSearchPage.tsx'), 'utf8');
  assert.match(source, /filters: \{ \.\.\.filters, text: submittedQuery \|\| undefined \}/);
  assert.match(source, /sort,/);
});


test('Phase 3G Invariant 47: geographic discovery has a dedicated canonical nearby/map UI', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/discovery/GeographicDiscoveryPage.tsx'), 'utf8');
  assert.match(source, /mode: 'nearby' \| 'map'/);
  assert.match(source, /navigator\.geolocation/);
  assert.match(source, /discoveryRepository\.listBusinesses/);
});

test('Phase 3G Invariant 48: browser geolocation is opt-in through the platform geolocation API with permission-denied handling', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/discovery/GeographicDiscoveryPage.tsx'), 'utf8');
  assert.match(source, /getCurrentPosition/);
  assert.match(source, /PERMISSION_DENIED/);
  assert.match(source, /Use my location/);
});

test('Phase 3G Invariant 49: nearby discovery uses authoritative coordinates and a bounded radius', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/discovery/GeographicDiscoveryPage.tsx'), 'utf8');
  assert.match(source, /radiusKm/);
  assert.match(source, /latitude: origin\.latitude, longitude: origin\.longitude/);
  assert.match(source, /\[5, 10, 25, 50, 100\]/);
});

test('Phase 3G Invariant 50: geographic routes bypass the static discovery shell and render the geographic experience', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(source, /currentRoute\.definition\.id === 'public\.nearby'/);
  assert.match(source, /currentRoute\.definition\.id === 'public\.map'/);
  assert.match(source, /GeographicDiscoveryPage/);
  assert.match(source, /currentRoute\.definition\.id !== 'public\.nearby'/);
  assert.match(source, /currentRoute\.definition\.id !== 'public\.map'/);
});

test('Phase 3G Invariant 51: nearby results navigate to canonical business profiles', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/discovery/GeographicDiscoveryPage.tsx'), 'utf8');
  assert.match(source, /onNavigate\('\/business\/' \+ business\.slug\)/);
});

test('Phase 3G Invariant 52: discovery location normalization derives open-now from authoritative operating hours when explicit state is absent', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /function computeOpenNow/);
  assert.match(source, /typeof raw\.isOpenNow === 'boolean'/);
  assert.match(source, /computeOpenNow\(raw\.operatingHours\)/);
});

test('Phase 3G Invariant 53: geographic discovery remains read-only', () => {
  const repository = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  const ui = readFileSync(resolve(process.cwd(), 'src/components/discovery/GeographicDiscoveryPage.tsx'), 'utf8');
  assert.ok(!/\b(setDoc|addDoc|updateDoc|deleteDoc)\b/.test(repository));
  assert.ok(!/\b(setDoc|addDoc|updateDoc|deleteDoc)\b/.test(ui));
});


test('Phase 3G Remediation: operating-hours parser accepts standard HH:MM ranges', () => {
  assert.deepEqual(parseOperatingHours('09:00-17:00'), { open: 540, close: 1020 });
  assert.deepEqual(parseOperatingHours('09:00 – 17:00'), { open: 540, close: 1020 });
  assert.deepEqual(parseOperatingHours('09:00—17:00'), { open: 540, close: 1020 });
});

test('Phase 3G Remediation: computeOpenNow handles open, closed, boundary, and missing days', () => {
  const hours = { monday: '09:00-17:00' };
  assert.equal(computeOpenNow(hours, new Date(2026, 8, 14, 8, 59)), false);
  assert.equal(computeOpenNow(hours, new Date(2026, 8, 14, 9, 0)), true);
  assert.equal(computeOpenNow(hours, new Date(2026, 8, 14, 16, 59)), true);
  assert.equal(computeOpenNow(hours, new Date(2026, 8, 14, 17, 0)), false);
  assert.equal(computeOpenNow(hours, new Date(2026, 8, 15, 12, 0)), undefined);
});

test('Phase 3G Remediation: computeOpenNow supports midnight-crossing ranges and rejects malformed hours', () => {
  const hours = { monday: '22:00-02:00' };
  assert.equal(computeOpenNow(hours, new Date(2026, 8, 14, 22, 30)), true);
  assert.equal(computeOpenNow(hours, new Date(2026, 8, 15, 1, 59)), true);
  assert.equal(computeOpenNow(hours, new Date(2026, 8, 15, 2, 0)), false);
  assert.equal(parseOperatingHours('not-a-time'), null);
  assert.equal(parseOperatingHours('25:00-17:00'), null);
});

test('Phase 3G Remediation: explicit isOpenNow remains authoritative over derived operating hours', () => {
  const explicitClosed = normalizeDiscoveryLocation({ id: 'location-2', isOpenNow: false });
  const explicitOpen = normalizeDiscoveryLocation({ id: 'location-3', isOpenNow: true });
  const unprovided = normalizeDiscoveryLocation({ id: 'location-4' });
  assert.equal(explicitClosed.isOpenNow, false);
  assert.equal(explicitOpen.isOpenNow, true);
  assert.equal(unprovided.isOpenNow, undefined);
});

test('Phase 3G Remediation: geographic UI gives opt-in guidance instead of claiming it is requesting location', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/discovery/GeographicDiscoveryPage.tsx'), 'utf8');
  assert.match(source, /Use your location to find nearby businesses/);
  assert.doesNotMatch(source, /Requesting your location…/);
});


test('Phase 3H Invariant 59: category discovery exposes a canonical category slug lookup', () => {
  const types = readFileSync(resolve(process.cwd(), 'src/discovery/types.ts'), 'utf8');
  const repository = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(types, /getCategoryBySlug/);
  assert.match(repository, /async getCategoryBySlug/);
  assert.match(repository, /where\('slug', '==', normalizedSlug\)/);
  assert.match(repository, /where\('status', '==', 'active'\)/);
});

test('Phase 3H Invariant 60: category discovery preserves hierarchy fields and active-only visibility', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /parentId: raw\.parent_id \?\? null/);
  assert.match(source, /sortOrder: Number\(raw\.sort_order \?\? 0\)/);
  assert.match(source, /where\('status', '==', 'active'\)/);
  assert.match(source, /status: raw\.status === 'inactive' \? 'inactive' : 'active'/);
});

test('Phase 3H Invariant 61: canonical category routes render the dedicated category discovery experience', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(source, /CategoryDiscoveryPage/);
  assert.match(source, /currentRoute\.definition\.id === 'public\.categories'/);
  assert.match(source, /currentRoute\.definition\.id === 'public\.category\.detail'/);
  assert.match(source, /currentRoute\.definition\.id !== 'public\.categories'/);
  assert.match(source, /currentRoute\.definition\.id !== 'public\.category\.detail'/);
});

test('Phase 3H Invariant 62: category index and detail navigation use canonical category slugs', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/discovery/CategoryDiscoveryPage.tsx'), 'utf8');
  assert.match(source, /onNavigate\('\/category\/' \+ category\.slug\)/);
  assert.match(source, /categorySlug/);
  assert.match(source, /getCategoryBySlug\(slug\)/);
});

test('Phase 3H Invariant 63: category detail connects authoritative category results to businesses, products, and services', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/discovery/CategoryDiscoveryPage.tsx'), 'utf8');
  assert.match(source, /listBusinesses\(\{ limit: 100, filters: \{ categorySlug: slug \} \}\)/);
  assert.match(source, /listProducts\(\{ limit: 100, filters: \{ categorySlug: slug \} \}\)/);
  assert.match(source, /listServices\(\{ limit: 100, filters: \{ categorySlug: slug \} \}\)/);
});

test('Phase 3H Invariant 64: category hierarchy is navigable through parent/child relationships', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/discovery/CategoryDiscoveryPage.tsx'), 'utf8');
  assert.match(source, /item\.parentId === category\.id/);
  assert.match(source, /parentId == null/);
  assert.match(source, /CategoryTree/);
  assert.match(source, /Subcategories/);
  assert.match(source, /Explore category/);
});

test('Phase 3H Invariant 65: category discovery preserves listing-only businesses and does not require tenant activation', () => {
  const repository = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  const page = readFileSync(resolve(process.cwd(), 'src/components/discovery/CategoryDiscoveryPage.tsx'), 'utf8');
  assert.match(repository, /isTenant: Array\.isArray\(raw\.tenantIds\)/);
  assert.match(page, /listBusinesses\(\{ limit: 100, filters: \{ categorySlug: slug \} \}\)/);
  assert.doesNotMatch(page, /tenantId.*required/);
});

test('Phase 3H Invariant 66: category discovery is read-only and bounded', () => {
  const repository = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  const page = readFileSync(resolve(process.cwd(), 'src/components/discovery/CategoryDiscoveryPage.tsx'), 'utf8');
  assert.ok(!/\b(setDoc|addDoc|updateDoc|deleteDoc)\b/.test(repository));
  assert.ok(!/\b(setDoc|addDoc|updateDoc|deleteDoc)\b/.test(page));
  assert.match(repository, /firestoreLimit\(3\)/);
  assert.match(repository, /Math\.min\(limit \* 3, MAX_LIMIT\)/);
});

test('Phase 3H Invariant 67: category index searches authoritative category records rather than static discovery data', () => {
  const page = readFileSync(resolve(process.cwd(), 'src/components/discovery/CategoryDiscoveryPage.tsx'), 'utf8');
  assert.match(page, /discoveryRepository\.listCategories/);
  assert.doesNotMatch(page, /DISCOVERY_CATEGORIES/);
  assert.doesNotMatch(page, /discoveryData/);
});

test('Phase 3H Invariant 68: category result navigation remains entity-owned and does not cross into tenant operations', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/discovery/CategoryDiscoveryPage.tsx'), 'utf8');
  assert.match(source, /'\/business\/'/);
  assert.match(source, /'\/product\/'/);
  assert.match(source, /'\/service\/'/);
  assert.doesNotMatch(source, /\/tenant\//);
});

test('Phase 3H Invariant 69: category slug lookup has an explicit Firestore composite index', () => {
  const indexes = readFileSync(resolve(process.cwd(), 'firestore.indexes.json'), 'utf8');
  assert.match(indexes, /"collectionGroup": "categories"/);
  assert.match(indexes, /"fieldPath": "status"/);
  assert.match(indexes, /"fieldPath": "slug"/);
});


test('Phase 3I Invariant 70: unified discovery provides directory-style list results with canonical entity navigation', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/discovery/UnifiedSearchPage.tsx'), 'utf8');
  assert.match(source, /grid-cols-1 lg:grid-cols-\[280px_1fr\]/);
  assert.match(source, /resultPath/);
  assert.match(source, /\/business\//);
  assert.match(source, /\/product\//);
  assert.match(source, /\/service\//);
  assert.match(source, /\/category\//);
});

test('Phase 3I Invariant 71: unified discovery exposes explicit search location and opt-in browser geolocation', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/discovery/UnifiedSearchPage.tsx'), 'utf8');
  assert.match(source, /placeholder='Where\?'/);
  assert.match(source, /navigator\.geolocation/);
  assert.match(source, /Use my location/);
  assert.match(source, /latitude: position\.coords\.latitude/);
  assert.match(source, /longitude: position\.coords\.longitude/);
});

test('Phase 3I Invariant 72: location search supplies a bounded radius and preserves location-free search fallback', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/discovery/UnifiedSearchPage.tsx'), 'utf8');
  assert.match(source, /radiusKm: current\.radiusKm \?\? 10/);
  assert.match(source, /Location access was denied/);
  assert.match(source, /still search without location/);
});

test('Phase 3I Invariant 73: discovery remains authoritative and read-only at the UI boundary', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/discovery/UnifiedSearchPage.tsx'), 'utf8');
  assert.match(source, /discoveryRepository\.search/);
  assert.doesNotMatch(source, /DISCOVERY_BUSINESSES|DISCOVERY_CATEGORIES/);
  assert.doesNotMatch(source, /\\b(setDoc|addDoc|updateDoc|deleteDoc)\\b/);
});

test('Phase 3I Invariant 74: discovery filters remain available from the directory results experience', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/discovery/UnifiedSearchPage.tsx'), 'utf8');
  for (const label of ['Category', 'Minimum price', 'Maximum price', 'Radius (km)', 'Verified businesses', 'Featured', 'Open now', 'Available now']) {
    assert.ok(source.includes(label), 'missing filter: ' + label);
  }
  assert.match(source, /Reset discovery filters/);
});

test('Phase 3I Invariant 75: discovery result cards expose practical business trust and rating information', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/discovery/UnifiedSearchPage.tsx'), 'utf8');
  assert.match(source, /Verified/);
  assert.match(source, /ratingAverage/);
  assert.match(source, /reviewCount/);
});


test('Phase 3I Invariant 76: unified search presents a single search action and an explicit opt-in location action', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/discovery/UnifiedSearchPage.tsx'), 'utf8');
  const form = source.match(/<form onSubmit=\{submit\}[\s\S]*?<\/form>/)?.[0] || '';
  assert.equal((form.match(/type='submit'/g) || []).length, 1);
  assert.match(form, /Use my location/);
  assert.match(form, /navigator\.geolocation\.getCurrentPosition/);
});

test('Phase 3I Invariant 77: location filter state counts as one user-facing filter even though it stores coordinates separately', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/discovery/UnifiedSearchPage.tsx'), 'utf8');
  assert.match(source, /!\['latitude', 'longitude'\]\.includes\(key\)/);
  assert.match(source, /const hasLocation = filters\.latitude != null && filters\.longitude != null/);
  assert.match(source, /values\.length \+ \(hasLocation \? 1 : 0\)/);
});

test('Phase 3I Invariant 78: discovery location filtering is explicitly scoped to authoritative business location data', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/discovery/UnifiedSearchPage.tsx'), 'utf8');
  const repository = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /Location filtering applies to business results/);
  assert.match(repository, /filters\.latitude != null && filters\.longitude != null/);
  assert.match(repository, /item\.locations\.some/);
});

test('Phase 3I Invariant 79: public discovery reads remain bounded before client-side ranking and filtering', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.match(source, /const MAX_LIMIT = 100/);
  assert.match(source, /Math\.min\(limit \* 3, MAX_LIMIT\)/);
  assert.match(source, /firestoreLimit\(Math\.min\(limit \* 3, MAX_LIMIT\)\)/);
  assert.match(source, /candidateLimit = Math\.min\(boundedLimit\(queryOptions\.limit\) \* 3, MAX_LIMIT\)/);
});

test('Phase 3I Invariant 80: discovery UI remains read-only, canonical, and responsive across result types', () => {
  const ui = readFileSync(resolve(process.cwd(), 'src/components/discovery/UnifiedSearchPage.tsx'), 'utf8');
  const repository = readFileSync(resolve(process.cwd(), 'src/discovery/discoveryRepository.ts'), 'utf8');
  assert.ok(!/\b(setDoc|addDoc|updateDoc|deleteDoc)\b/.test(ui));
  assert.ok(!/\b(setDoc|addDoc|updateDoc|deleteDoc)\b/.test(repository));
  assert.match(ui, /grid-cols-1 lg:grid-cols-\[280px_1fr\]/);
  for (const path of ['/business/', '/product/', '/service/', '/category/']) assert.match(ui, new RegExp("'" + path.replace('/', '\\/') + "'"));
});
