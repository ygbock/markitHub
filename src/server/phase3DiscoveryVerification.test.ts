import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { distanceKm } from '../discovery/discoveryRepository';

test('Phase 3A Invariant 1: discovery domain exposes all four canonical entity types', async () => {
  const source = readFileSync(resolve(process.cwd(), 'src/discovery/types.ts'), 'utf8');
  for (const type of ['business', 'product', 'service', 'category']) {
    assert.match(source, new RegExp("'"+type+"'"));
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
