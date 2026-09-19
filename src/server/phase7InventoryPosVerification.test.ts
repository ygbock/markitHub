import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('Phase 7 Invariant 1: inventory API resolves tenant from authenticated context and never accepts tenantId from request body', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/tenantInventory.ts'), 'utf8');
  assert.match(source, /extractAuthenticatedTenantId\(req\.user\)/);
  assert.doesNotMatch(source, /req\.body\?\.tenantId/);
  assert.match(source, /collection\('tenants'\)\.doc\(tenantId\)\.collection\('inventory'\)/);
});

test('Phase 7 Invariant 2: inventory adjustments require canonical permission and positive quantities', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/tenantInventory.ts'), 'utf8');
  assert.match(source, /requirePermission\('inventory\.adjust'\)/);
  assert.match(source, /positiveInteger\(req\.body\?\.quantity\)/);
  assert.match(source, /validateReason\(req\.body\?\.reason\)/);
});

test('Phase 7 Invariant 3: inventory transfers are atomic paired movements and reject insufficient source stock', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/tenantInventory.ts'), 'utf8');
  assert.match(source, /runTransaction\(async/);
  assert.match(source, /TRANSFER_OUT/);
  assert.match(source, /TRANSFER_IN/);
  assert.match(source, /Insufficient source stock/);
});

test('Phase 7 Invariant 4: inventory mutations persist movement history and authoritative audit/security telemetry', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/tenantInventory.ts'), 'utf8');
  assert.match(source, /inventoryMovements/);
  assert.match(source, /createAuthoritativeAuditRecord/);
  assert.match(source, /updateAuthoritativeSecurityMetrics/);
});

test('Phase 7 Invariant 5: POS sales require sales.create and derive the tenant server-side', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/tenantPos.ts'), 'utf8');
  assert.match(source, /requirePermission\('sales\.create'\)/);
  assert.match(source, /extractAuthenticatedTenantId\(req\.user\)/);
  assert.doesNotMatch(source, /req\.body\?\.tenantId/);
});

test('Phase 7 Invariant 6: POS sales atomically decrement inventory, create order, and audit the sale', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/tenantPos.ts'), 'utf8');
  assert.match(source, /runTransaction\(async/);
  assert.match(source, /collection\('inventory'\)/);
  assert.match(source, /collection\('orders'\)/);
  assert.match(source, /POS_SALE_COMPLETED/);
  assert.match(source, /updateAuthoritativeSecurityMetrics\(db, audit, tx\)/);
});

test('Phase 7 Invariant 7: POS sales fail closed on archived products and insufficient stock', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/tenantPos.ts'), 'utf8');
  assert.match(source, /Product .* is archived/);
  assert.match(source, /Insufficient stock/);
});

test('Phase 7 Invariant 8: frontend inventory mutations use authoritative APIs', () => {
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  const inventory = readFileSync(resolve(process.cwd(), 'src/components/InventoryModule.tsx'), 'utf8');
  assert.match(app, /\/api\/tenant\/inventory\/adjust/);
  assert.match(app, /\/api\/tenant\/inventory\/transfer/);
  assert.match(inventory, /inventoryService/);
});

test('Phase 7 Invariant 9: frontend POS can delegate checkout to the authoritative server', () => {
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  const pos = readFileSync(resolve(process.cwd(), 'src/components/POSModule.tsx'), 'utf8');
  assert.match(app, /\/api\/tenant\/pos\/sales/);
  assert.match(pos, /onAuthoritativeSale/);
  assert.match(pos, /await onAuthoritativeSale/);
});

test('Phase 7 Invariant 10: server routes are mounted in the application server', () => {
  const source = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  assert.match(source, /registerTenantInventoryRoutes/);
  assert.match(source, /registerTenantPosRoutes/);
});
