import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('Phase 6 UI 12: tenant product route is wired to authoritative catalog management', () => {
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  const ui = readFileSync(resolve(process.cwd(), 'src/components/tenant/TenantCatalogManagement.tsx'), 'utf8');
  assert.match(app, /currentRoute\.definition\.id === 'tenant\.products'/);
  assert.match(app, /<TenantCatalogManagement/);
  assert.match(app, /mode=\{currentRoute\.definition\.id === 'tenant\.products' \? 'products' : 'services'\}/);
  assert.match(ui, /\/api\/tenant\/catalog\/products/);
});

test('Phase 6 UI 13: tenant service route is wired to authoritative catalog management', () => {
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  const ui = readFileSync(resolve(process.cwd(), 'src/components/tenant/TenantCatalogManagement.tsx'), 'utf8');
  assert.match(app, /currentRoute\.definition\.id === 'tenant\.services'/);
  assert.match(ui, /\/api\/tenant\/catalog\/services/);
});

test('Phase 6 UI 14: legacy tenant workspace cannot render over authoritative catalog routes', () => {
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(app, /activeDomain === 'TENANT_OPERATIONS' && currentRoute\.definition\.id !== 'tenant\.products' && currentRoute\.definition\.id !== 'tenant\.services'/);
});

test('Phase 6 UI 15: catalog mutations are performed through server APIs rather than local Firestore writes', () => {
  const ui = readFileSync(resolve(process.cwd(), 'src/components/tenant/TenantCatalogManagement.tsx'), 'utf8');
  assert.match(ui, /method: editingId \? 'PATCH' : 'POST'/);
  assert.match(ui, /method: 'DELETE'/);
  assert.doesNotMatch(ui, /setDoc\(/);
  assert.doesNotMatch(ui, /updateDoc\(/);
});

test('Phase 6 UI 16: catalog UI never submits a client-selected tenantId as an authorization field', () => {
  const ui = readFileSync(resolve(process.cwd(), 'src/components/tenant/TenantCatalogManagement.tsx'), 'utf8');
  assert.doesNotMatch(ui, /JSON\.stringify\(\{[^}]*tenantId/);
  assert.match(ui, /server resolves it from the authenticated tenant membership/);
});

test('Phase 6 UI 17: product and service archive actions use canonical tenant catalog endpoints', () => {
  const ui = readFileSync(resolve(process.cwd(), 'src/components/tenant/TenantCatalogManagement.tsx'), 'utf8');
  assert.match(ui, /\/api\/tenant\/catalog\/\$\{mode\}\/\$\{encodeURIComponent\(id\)\}/);
  assert.match(ui, /archive/i);
});

test('Phase 6 UI 18: service route has canonical read permission', () => {
  const routes = readFileSync(resolve(process.cwd(), 'src/routes/canonicalRoutes.ts'), 'utf8');
  assert.match(routes, /id: 'tenant\.services'[\s\S]*requiredCapability: 'services'[\s\S]*requiredPermission: 'services\.view'/);
});

test('Phase 6 UI 19: catalog UI exposes explicit loading, error, empty, edit and create states', () => {
  const ui = readFileSync(resolve(process.cwd(), 'src/components/tenant/TenantCatalogManagement.tsx'), 'utf8');
  assert.match(ui, /Loading authoritative catalog/);
  assert.match(ui, /role='alert'/);
  assert.match(ui, /No catalog records yet/);
  assert.match(ui, /Save Changes/);
  assert.match(ui, /Create \$\{mode === 'products' \? 'Product' : 'Service'\}/);
});
