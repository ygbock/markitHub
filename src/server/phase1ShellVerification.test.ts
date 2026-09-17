import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Layer 1: Tokens & Themes
import {
  lightColorTokens,
  darkColorTokens,
  spacingTokens,
  radiusTokens,
  shadowTokens,
  typographyTokens,
} from '../design-system/tokens';
import { getThemeVariables } from '../design-system/theme';

// Layer 4: Authorization Guards
import { canRenderModule } from '../authorization/guards';
import { StaffMember } from '../utils/permissions';

// Layer 5: Navigation Registries
import {
  publicNavigation,
  customerNavigation,
  businessNavigation,
  tenantNavigation,
  superAdminNavigation,
} from '../navigation/navigationRegistries';

// Layer 6: Route Parsing & Resolution
import { parseCanonicalRoute } from '../routes/canonicalRoutes';

test('Phase 1 Layer 1: Design tokens define authoritative semantic design system', () => {
  // Color tokens
  assert.ok(lightColorTokens.primary, 'Light theme must define primary color');
  assert.ok(darkColorTokens.primary, 'Dark theme must define primary color');
  assert.notEqual(lightColorTokens.background, darkColorTokens.background, 'Dark and light backgrounds must differ');

  // Spacing & Radius
  assert.equal(spacingTokens.md, '1rem', 'spacingTokens.md must be 1rem (16px)');
  assert.equal(radiusTokens.md, '0.5rem', 'radius.md must be 0.5rem (8px)');
  assert.equal(radiusTokens.full, '9999px', 'radius.full must be 9999px');

  // CSS Variables generation
  const lightVars = getThemeVariables('light');
  assert.equal(lightVars['--mk-primary'], lightColorTokens.primary);
  assert.ok(lightVars['--mk-radius-md'], 'Must define --mk-radius-md');

  const darkVars = getThemeVariables('dark');
  assert.equal(darkVars['--mk-primary'], darkColorTokens.primary);
  assert.equal(darkVars['--mk-background'], darkColorTokens.background);
});

test('Phase 1 Layer 2: Typography and Layout components are structured', () => {
  const indexCss = fs.readFileSync(path.resolve('src/index.css'), 'utf-8');
  assert.ok(indexCss.includes('--mk-background'), 'index.css must include --mk-background CSS token');
  assert.ok(indexCss.includes('--mk-primary'), 'index.css must include --mk-primary CSS token');
  assert.ok(indexCss.includes('.mk-focus-ring'), 'index.css must include accessible focus ring utility');
});

test('Phase 1 Layer 3: UI Primitives library index exports required components', () => {
  const uiIndex = fs.readFileSync(path.resolve('src/components/ui/index.ts'), 'utf-8');
  const requiredComponents = [
    'Button',
    'Badge',
    'Card',
    'StateFeedback',
    'Label',
    'FormField',
    'Input',
    'Textarea',
    'Select',
    'Switch',
    'Checkbox',
    'Radio',
    'Avatar',
    'StatCard',
    'Table',
    'Tabs',
    'Breadcrumbs',
    'Skeleton',
    'Toast',
    'ToastContext',
    'SuspendedState',
    'Dialog',
    'ConfirmDialog',
    'Drawer',
  ];

  for (const comp of requiredComponents) {
    assert.ok(uiIndex.includes(comp), `src/components/ui/index.ts must export ${comp}`);
  }
});

test('Phase 1 Layer 4: canRenderModule enforces permissions, capabilities, and suspension', () => {
  const activeCashier: StaffMember = {
    id: 'staff-1',
    name: 'Cashier Staff',
    email: 'cashier@nexus.com',
    avatar: '',
    pin: '1234',
    role: 'Cashier',
    status: 'active',
    tenantId: 'tenant-nexus',
    customPermissions: ['sales.create'],
  };

  const suspendedCashier: StaffMember = {
    ...activeCashier,
    status: 'suspended',
  };

  // 1. Active cashier with sales.create
  const res1 = canRenderModule({
    staff: activeCashier,
    permission: 'sales.create',
    tenantStatus: 'active',
  });
  assert.equal(res1.allowed, true, 'Active cashier with permission should be allowed');

  // 2. Active cashier lacking inventory.edit
  const res2 = canRenderModule({
    staff: activeCashier,
    permission: 'inventory.edit',
    tenantStatus: 'active',
  });
  assert.equal(res2.allowed, false, 'Active cashier lacking permission should be denied');
  assert.equal(res2.reason, 'unauthorized');

  // 3. Suspended cashier is denied regardless of permission
  const res3 = canRenderModule({
    staff: suspendedCashier,
    permission: 'sales.create',
    tenantStatus: 'active',
  });
  assert.equal(res3.allowed, false, 'Suspended cashier must be denied');
  assert.equal(res3.reason, 'user_suspended');

  // 4. Suspended tenant halts all operations
  const res4 = canRenderModule({
    staff: activeCashier,
    permission: 'sales.create',
    tenantStatus: 'suspended',
  });
  assert.equal(res4.allowed, false, 'Suspended tenant must be denied');
  assert.equal(res4.reason, 'tenant_suspended');

  // 5. Capability gating
  const res5 = canRenderModule({
    staff: activeCashier,
    capability: 'pos',
    tenantCapabilities: ['pos', 'inventory'],
    tenantStatus: 'active',
  });
  assert.equal(res5.allowed, true, 'Enabled capability should be allowed');

  const res6 = canRenderModule({
    staff: activeCashier,
    capability: 'loyalty',
    tenantCapabilities: ['pos', 'inventory'],
    tenantStatus: 'active',
  });
  assert.equal(res6.allowed, false, 'Disabled capability should be denied');
  assert.equal(res6.reason, 'capability_disabled');
});

test('Phase 1 Layer 5: Typed navigation registries enforce zero clutter per domain', () => {
  // Public navigation
  assert.ok(publicNavigation.length >= 4, 'Public navigation must have discovery links');
  for (const item of publicNavigation) {
    assert.ok(!item.path?.includes('/tenant/'), 'Public navigation must have zero tenant operational links');
    assert.ok(!item.path?.includes('/superadmin/'), 'Public navigation must have zero superadmin links');
  }

  // Customer navigation
  assert.ok(customerNavigation.length >= 5, 'Customer navigation must have personal account links');
  for (const item of customerNavigation) {
    assert.ok(item.path?.startsWith('/account'), 'Customer navigation items must stay in /account/*');
    assert.ok(!item.path?.includes('/tenant/pos'), 'Customer navigation must have zero POS links');
  }

  // Business navigation (listing only)
  assert.ok(businessNavigation.length >= 4, 'Business navigation must have listing management links');
  for (const item of businessNavigation) {
    assert.ok(item.path?.startsWith('/business'), 'Business navigation items must stay in /business/*');
    assert.ok(!item.path?.includes('/tenant/inventory'), 'Listing business navigation must have zero inventory links');
  }

  // Tenant navigation
  assert.ok(tenantNavigation.length >= 4, 'Tenant navigation must have at least 4 operational groups');
  const posItem = tenantNavigation.flatMap(g => g.items).find(i => i.id === 'tenant-pos');
  assert.ok(posItem, 'Tenant navigation must include POS');
  assert.equal(posItem?.capability, 'pos', 'POS item must be gated by pos capability');

  // Super Admin navigation
  assert.equal(superAdminNavigation.length, 5, 'Super Admin navigation must contain exactly 5 governance groups');
  const groupIds = superAdminNavigation.map(g => g.id);
  assert.deepEqual(groupIds, ['sa-platform', 'sa-trust', 'sa-commerce', 'sa-security', 'sa-operations']);
});

test('Phase 1 Layer 6: Shell resolution accurately routes URLs to proper domain shells', () => {
  const publicRoute = parseCanonicalRoute('/discover');
  assert.equal(publicRoute.definition.domain, 'PUBLIC_DISCOVERY');

  const customerRoute = parseCanonicalRoute('/account/orders');
  assert.equal(customerRoute.definition.domain, 'CUSTOMER_ACCOUNT');

  const businessRoute = parseCanonicalRoute('/business/biz-kallon-repair/profile');
  assert.equal(businessRoute.definition.domain, 'BUSINESS');

  const tenantRoute = parseCanonicalRoute('/tenant/nexus-retail/pos');
  assert.equal(tenantRoute.definition.domain, 'TENANT_OPERATIONS');

  const superAdminRoute = parseCanonicalRoute('/superadmin/tenants');
  assert.equal(superAdminRoute.definition.domain, 'SUPER_ADMIN');

  // Verify shell files exist
  const layoutsDir = path.resolve('src/layouts');
  const shells = [
    'PublicShell.tsx',
    'CustomerShell.tsx',
    'BusinessShell.tsx',
    'TenantShell.tsx',
    'SuperAdminShell.tsx',
    'ShellResolver.tsx',
    'index.ts',
  ];
  for (const shell of shells) {
    assert.ok(fs.existsSync(path.join(layoutsDir, shell)), `src/layouts/${shell} must exist`);
  }
});
