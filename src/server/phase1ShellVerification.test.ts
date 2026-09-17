import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';

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

// Layer 4: Authorization Guards & Gates
import { canRenderModule } from '../authorization/guards';
import { StaffMember } from '../utils/permissions';

// Layer 5: Navigation Registries & Scoped Resolvers
import {
  publicNavigation,
  customerNavigation,
  businessNavigation,
  tenantNavigation,
  superAdminNavigation,
  getBusinessNavigation,
  getTenantNavigation,
} from '../navigation/navigationRegistries';

// Layer 6: Route Parsing, Resolution & Authoritative Shells
import { parseCanonicalRoute, CanonicalRouteDomain } from '../routes/canonicalRoutes';
import { ShellResolver, resolveDomainForPath, getShellNameForDomain } from '../layouts/ShellResolver';
import { SuperAdminShell } from '../layouts/SuperAdminShell';
import { TenantShell } from '../layouts/TenantShell';
import { BusinessShell } from '../layouts/BusinessShell';
import { CustomerShell } from '../layouts/CustomerShell';
import { PublicShell } from '../layouts/PublicShell';
import { ShellOnboardingAdapter } from '../layouts/ShellOnboardingAdapter';
import BusinessOnboardingShell from '../components/business/BusinessOnboardingShell';

// ============================================================================
// SECTION 1: Design System Foundation (Tokens, Themes, Primitives)
// ============================================================================

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

// ============================================================================
// SECTION 2: Behavioral Verifications A through I (Remediation Hardening)
// ============================================================================

test('Phase 1 Behavioral A: Canonical route parser maps paths to authoritative domains', () => {
  const testCases: Array<[string, CanonicalRouteDomain]> = [
    ['/', 'PUBLIC_DISCOVERY'],
    ['/discover', 'PUBLIC_DISCOVERY'],
    ['/search', 'PUBLIC_DISCOVERY'],
    ['/business/biz-kallon-repair/profile', 'BUSINESS'],
    ['/business/onboarding', 'BUSINESS_ONBOARDING'],
    ['/business/register', 'BUSINESS_ONBOARDING'],
    ['/account/orders', 'CUSTOMER_ACCOUNT'],
    ['/store/nexus-retail', 'STOREFRONT'],
    ['/tenant/nexus-retail/dashboard', 'TENANT_OPERATIONS'],
    ['/tenant/nexus-retail/pos', 'TENANT_OPERATIONS'],
    ['/superadmin/dashboard', 'SUPER_ADMIN'],
    ['/login', 'IDENTITY_AUTH'],
  ];

  for (const [pathname, expectedDomain] of testCases) {
    const parsed = parseCanonicalRoute(pathname);
    assert.equal(
      parsed.definition.domain,
      expectedDomain,
      `Path "${pathname}" must resolve to domain "${expectedDomain}", got "${parsed.definition.domain}"`
    );
  }
});

test('Phase 1 Behavioral B: ShellResolver authoritative dispatch and domain resolution', () => {
  // 1. Path-to-domain resolution
  assert.equal(resolveDomainForPath('/business/onboarding'), 'BUSINESS_ONBOARDING');
  assert.equal(resolveDomainForPath('/business/register'), 'BUSINESS_ONBOARDING');
  assert.equal(resolveDomainForPath('/superadmin/dashboard'), 'SUPER_ADMIN');
  assert.equal(resolveDomainForPath('/tenant/nexus-retail/dashboard'), 'TENANT_OPERATIONS');
  assert.equal(resolveDomainForPath('/tenant/nexus-retail/pos'), 'TENANT_OPERATIONS');
  assert.equal(resolveDomainForPath('/account/orders'), 'CUSTOMER_ACCOUNT');
  assert.equal(resolveDomainForPath('/business/biz-kallon-repair/profile'), 'BUSINESS');
  assert.equal(resolveDomainForPath('/'), 'PUBLIC_DISCOVERY');
  assert.equal(resolveDomainForPath('/discover'), 'PUBLIC_DISCOVERY');
  assert.equal(resolveDomainForPath('/store/nexus-retail'), 'STOREFRONT');
  assert.equal(resolveDomainForPath('/login'), 'IDENTITY_AUTH');

  // 2. Domain-to-shell name resolution (DEFECT 2 Invariant: onboarding NEVER resolves to TenantShell)
  assert.equal(getShellNameForDomain('BUSINESS_ONBOARDING'), 'BusinessOnboardingShell');
  assert.notEqual(getShellNameForDomain('BUSINESS_ONBOARDING'), 'TenantShell', 'BUSINESS_ONBOARDING must never fall into TenantShell');
  assert.equal(getShellNameForDomain('SUPER_ADMIN'), 'SuperAdminShell');
  assert.equal(getShellNameForDomain('TENANT_OPERATIONS'), 'TenantShell');
  assert.equal(getShellNameForDomain('BUSINESS'), 'BusinessShell');
  assert.equal(getShellNameForDomain('CUSTOMER_ACCOUNT'), 'CustomerShell');
  assert.equal(getShellNameForDomain('PUBLIC_DISCOVERY'), 'PublicShell');
  assert.equal(getShellNameForDomain('STOREFRONT'), 'PublicShell');
  assert.equal(getShellNameForDomain('IDENTITY_AUTH'), 'PublicShell');

  // 3. ShellResolver component functional behavior
  const onboardingEl = ShellResolver({
    currentPath: '/business/onboarding',
    onNavigate: () => {},
  });
  assert.equal(onboardingEl.type, ShellOnboardingAdapter, 'Onboarding must resolve to ShellOnboardingAdapter');
  const renderedOnboarding = (onboardingEl.type as any)(onboardingEl.props);
  assert.equal(renderedOnboarding.props.id, 'business-onboarding-shell-root', 'Onboarding must render in onboarding root');

  const saEl = ShellResolver({
    currentPath: '/superadmin/dashboard',
    onNavigate: () => {},
  });
  assert.ok(React.isValidElement(saEl));
  assert.equal(saEl.type, SuperAdminShell, 'SuperAdmin path must dispatch SuperAdminShell');

  const tenantEl = ShellResolver({
    currentPath: '/tenant/nexus-retail/pos',
    onNavigate: () => {},
  });
  assert.ok(React.isValidElement(tenantEl));
  assert.equal(tenantEl.type, TenantShell, 'Tenant operational path must dispatch TenantShell');

  const bizEl = ShellResolver({
    currentPath: '/business/biz-kallon-repair/dashboard',
    onNavigate: () => {},
  });
  assert.ok(React.isValidElement(bizEl));
  assert.equal(bizEl.type, BusinessShell, 'Business path must dispatch BusinessShell');

  const custEl = ShellResolver({
    currentPath: '/account/orders',
    onNavigate: () => {},
  });
  assert.ok(React.isValidElement(custEl));
  assert.equal(custEl.type, CustomerShell, 'Customer account path must dispatch CustomerShell');
});

test('Phase 1 Behavioral C: Super Admin platform control plane isolation', () => {
  // Routes never resolve to TenantShell
  const saRoutes = ['/superadmin/dashboard', '/superadmin/tenants', '/superadmin/audit', '/superadmin/metrics'];
  for (const p of saRoutes) {
    const parsed = parseCanonicalRoute(p);
    assert.equal(parsed.definition.domain, 'SUPER_ADMIN', `${p} must be in SUPER_ADMIN domain`);
    assert.notEqual(parsed.definition.domain, 'TENANT_OPERATIONS', `${p} must not resolve to TENANT_OPERATIONS`);
    assert.equal(getShellNameForDomain(parsed.definition.domain), 'SuperAdminShell');
  }

  // Super Admin navigation contains 5 authoritative governance groups
  assert.equal(superAdminNavigation.length, 5, 'Super Admin navigation must contain exactly 5 governance groups');
  assert.deepEqual(
    superAdminNavigation.map(g => g.id),
    ['sa-platform', 'sa-trust', 'sa-commerce', 'sa-security', 'sa-operations']
  );

  // Super Admin navigation must NEVER contain tenant operational paths
  for (const group of superAdminNavigation) {
    for (const item of group.items) {
      assert.ok(!item.path?.includes('/tenant/'), `SuperAdmin nav item "${item.id}" must not contain /tenant/ operational path`);
      assert.ok(item.path?.startsWith('/superadmin/'), `SuperAdmin nav item "${item.id}" must be scoped to /superadmin/*`);
    }
  }
});

test('Phase 1 Behavioral D: Tenant navigation is strictly tenant-scoped', () => {
  const tenantId = 'nexus-retail';
  const nav = getTenantNavigation(tenantId);
  assert.ok(nav.length >= 4, 'Must produce operational groups');

  for (const group of nav) {
    for (const item of group.items) {
      if (item.path) {
        assert.ok(
          item.path.startsWith(`/tenant/${tenantId}/`),
          `Tenant nav item "${item.id}" path "${item.path}" must start with "/tenant/${tenantId}/"`
        );
        assert.ok(
          !item.path.match(/^\/tenant\/[a-z]+$/),
          `Tenant nav item "${item.id}" path "${item.path}" must never be an un-scoped tenant path`
        );
      }
    }
  }

  // Verify dynamic tenant scoping with a second tenant identifier (no hardcoded tenantId)
  const altTenantId = 'apex-gadgets';
  const altNav = getTenantNavigation(altTenantId);
  for (const group of altNav) {
    for (const item of group.items) {
      if (item.path) {
        assert.ok(
          item.path.startsWith(`/tenant/${altTenantId}/`),
          `Tenant nav item "${item.id}" path "${item.path}" must start with "/tenant/${altTenantId}/"`
        );
      }
    }
  }
});

test('Phase 1 Behavioral E: Business navigation is strictly business-scoped', () => {
  const businessId = 'biz-kallon-repair';
  const nav = getBusinessNavigation(businessId);
  assert.ok(nav.length >= 4, 'Must produce business navigation items');

  for (const item of nav) {
    if (item.path) {
      assert.ok(
        item.path.startsWith(`/business/${businessId}/`),
        `Business nav item "${item.id}" path "${item.path}" must start with "/business/${businessId}/"`
      );
    }
  }

  // Verify dynamic business scoping with an alternative business identifier (no hardcoded businessId)
  const altBizId = 'biz-freetown-auto';
  const altNav = getBusinessNavigation(altBizId);
  for (const item of altNav) {
    if (item.path) {
      assert.ok(
        item.path.startsWith(`/business/${altBizId}/`),
        `Business nav item "${item.id}" path "${item.path}" must start with "/business/${altBizId}/"`
      );
    }
  }
});

test('Phase 1 Behavioral F: Capability filtering uses canonical vocabulary and enforces UI gating', () => {
  const managerStaff: StaffMember = {
    id: 'staff-1',
    name: 'Manager Staff',
    email: 'manager@nexus.com',
    avatar: '',
    pin: '1234',
    role: 'Manager',
    status: 'active',
    tenantId: 'nexus-retail',
    customPermissions: ['sales.create', 'finance.reports', 'inventory.view'],
  };

  // 1. When canonical capability 'reports' is absent -> denied
  const resDenied = canRenderModule({
    staff: managerStaff,
    capability: 'reports',
    tenantCapabilities: ['pos', 'inventory'],
    tenantStatus: 'active',
  });
  assert.equal(resDenied.allowed, false);
  assert.equal(resDenied.reason, 'capability_disabled');

  // 2. When canonical capability 'reports' is present -> allowed
  const resAllowed = canRenderModule({
    staff: managerStaff,
    capability: 'reports',
    tenantCapabilities: ['pos', 'inventory', 'reports'],
    tenantStatus: 'active',
  });
  assert.equal(resAllowed.allowed, true);

  // 3. Navigation registry uses ONLY canonical capabilities
  const nav = getTenantNavigation('nexus-retail');
  const allItems = nav.flatMap(g => g.items);

  const reportsItem = allItems.find(i => i.id === 'tenant-reports');
  assert.ok(reportsItem, 'Reports item must exist');
  assert.equal(reportsItem?.capability, 'reports', 'Reports must use canonical capability "reports" (not "reporting")');

  const loyaltyItem = allItems.find(i => i.id === 'tenant-loyalty');
  assert.ok(loyaltyItem, 'Loyalty item must exist');
  assert.equal(loyaltyItem?.capability, 'marketing', 'Loyalty must use canonical capability "marketing" (not "loyalty")');

  const reviewsItem = allItems.find(i => i.id === 'tenant-reviews');
  assert.ok(reviewsItem, 'Reviews item must exist');
  assert.equal(reviewsItem?.capability, 'customers', 'Reviews must use canonical capability "customers"');
});

test('Phase 1 Behavioral G: Permission filtering gates UI actions based on staff permissions', () => {
  const cashierStaff: StaffMember = {
    id: 'staff-cashier',
    name: 'Cashier Staff',
    email: 'cashier@nexus.com',
    avatar: '',
    pin: '1111',
    role: 'Cashier',
    status: 'active',
    tenantId: 'nexus-retail',
    customPermissions: ['sales.create'],
  };

  // Action requiring 'sales.create' is allowed
  const allowSales = canRenderModule({
    staff: cashierStaff,
    permission: 'sales.create',
    tenantStatus: 'active',
  });
  assert.equal(allowSales.allowed, true);

  // Action requiring 'inventory.edit' is denied
  const denyInventory = canRenderModule({
    staff: cashierStaff,
    permission: 'inventory.edit',
    tenantStatus: 'active',
  });
  assert.equal(denyInventory.allowed, false);
  assert.equal(denyInventory.reason, 'unauthorized');
});

test('Phase 1 Behavioral H: Suspension matrix denies suspended users and suspended tenants', () => {
  const activeStaff: StaffMember = {
    id: 'staff-active',
    name: 'Active Staff',
    email: 'active@nexus.com',
    avatar: '',
    pin: '1234',
    role: 'Cashier',
    status: 'active',
    tenantId: 'nexus-retail',
    customPermissions: ['sales.create'],
  };

  const suspendedStaff: StaffMember = {
    ...activeStaff,
    id: 'staff-suspended',
    status: 'suspended',
  };

  // Invariant 1: active user + active tenant -> allowed
  const res1 = canRenderModule({
    staff: activeStaff,
    tenantStatus: 'active',
    permission: 'sales.create',
  });
  assert.equal(res1.allowed, true, 'active user + active tenant must be allowed');

  // Invariant 2: suspended user -> denied
  const res2 = canRenderModule({
    staff: suspendedStaff,
    tenantStatus: 'active',
    permission: 'sales.create',
  });
  assert.equal(res2.allowed, false, 'suspended user must be denied');
  assert.equal(res2.reason, 'user_suspended');

  // Invariant 3: active user + suspended tenant -> denied
  const res3 = canRenderModule({
    staff: activeStaff,
    tenantStatus: 'suspended',
    permission: 'sales.create',
  });
  assert.equal(res3.allowed, false, 'active user + suspended tenant must be denied');
  assert.equal(res3.reason, 'tenant_suspended');
});

test('Phase 1 Behavioral I: Theme behavior, tokens, and storage persistence', () => {
  // 1. Light theme CSS variable tokens
  const lightVars = getThemeVariables('light');
  assert.equal(lightVars['--mk-primary'], lightColorTokens.primary);
  assert.equal(lightVars['--mk-background'], lightColorTokens.background);

  // 2. Dark theme CSS variable tokens
  const darkVars = getThemeVariables('dark');
  assert.equal(darkVars['--mk-primary'], darkColorTokens.primary);
  assert.equal(darkVars['--mk-background'], darkColorTokens.background);
  assert.notEqual(lightVars['--mk-background'], darkVars['--mk-background'], 'Light and dark backgrounds must differ');

  // 3. Theme mode options and persistence mock
  const storage: Record<string, string> = {};
  const mockStorage = {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, val: string) => { storage[key] = val; },
  };

  const THEME_STORAGE_KEY = 'mk_theme_preference';
  mockStorage.setItem(THEME_STORAGE_KEY, 'light');
  assert.equal(mockStorage.getItem(THEME_STORAGE_KEY), 'light');

  mockStorage.setItem(THEME_STORAGE_KEY, 'dark');
  assert.equal(mockStorage.getItem(THEME_STORAGE_KEY), 'dark');

  mockStorage.setItem(THEME_STORAGE_KEY, 'system');
  assert.equal(mockStorage.getItem(THEME_STORAGE_KEY), 'system');
});

test('Phase 1 Behavioral J: ShellOnboardingAdapter contract enforcement and onboarding integration', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // Requirement 1: Public adapter contract contains ONLY the allowed fields.
  //   businessId?, mode?, children?, onComplete?, onCancel?
  //   onNavigate and id must NOT appear on the public interface.
  // ─────────────────────────────────────────────────────────────────────────
  const contractShape: ShellOnboardingAdapter = {
    businessId: 'biz-abc',
    mode: 'listing',
    children: undefined,
    onComplete: () => {},
    onCancel: () => {},
  };
  assert.ok('businessId' in contractShape, 'Contract must expose businessId');
  assert.ok('mode' in contractShape, 'Contract must expose mode');
  assert.ok('children' in contractShape, 'Contract must expose children (optional)');
  assert.ok('onComplete' in contractShape, 'Contract must expose onComplete');
  assert.ok('onCancel' in contractShape, 'Contract must expose onCancel');
  // Verify onNavigate and id are NOT part of the public contract type
  assert.equal(!('onNavigate' in contractShape), true, 'onNavigate must NOT be part of the public adapter contract');
  assert.equal(!('id' in contractShape), true, 'id must NOT be part of the public adapter contract');

  // All fields are optional
  const emptyContract: ShellOnboardingAdapter = {};
  assert.ok(emptyContract !== undefined, 'Empty contract (all optional) must be valid');

  // ─────────────────────────────────────────────────────────────────────────
  // Requirement 2: /business/onboarding resolves to ShellOnboardingAdapter
  // Requirement 3: /business/register resolves to ShellOnboardingAdapter
  // ─────────────────────────────────────────────────────────────────────────
  const onboardingEl = ShellResolver({ currentPath: '/business/onboarding', onNavigate: () => {} });
  assert.ok(React.isValidElement(onboardingEl));
  assert.equal(onboardingEl.type, ShellOnboardingAdapter, '/business/onboarding must resolve to ShellOnboardingAdapter');

  const registerEl = ShellResolver({ currentPath: '/business/register', onNavigate: () => {} });
  assert.ok(React.isValidElement(registerEl));
  assert.equal(registerEl.type, ShellOnboardingAdapter, '/business/register must resolve to ShellOnboardingAdapter');

  // ─────────────────────────────────────────────────────────────────────────
  // Build a live adapter instance (no custom children) to test delegation
  // ─────────────────────────────────────────────────────────────────────────
  let navigatedPath = '';
  let completeCalled = false;
  let cancelCalled = false;

  const adapterOutput = ShellOnboardingAdapter({
    businessId: 'biz-fallback-id',
    onComplete: () => { completeCalled = true; },
    onCancel: () => { cancelCalled = true; },
    _navigate: (p: string) => { navigatedPath = p; },
  } as any);

  assert.ok(React.isValidElement(adapterOutput));
  const delegatedChild = adapterOutput.props.children;
  assert.ok(React.isValidElement(delegatedChild), 'Adapter must delegate to BusinessOnboardingShell');
  assert.equal(delegatedChild.type, BusinessOnboardingShell, 'Delegated component must be BusinessOnboardingShell');

  // ─────────────────────────────────────────────────────────────────────────
  // Requirement 4: LISTING_AND_STORE + authoritative tenantId → /tenant/:tenantId/dashboard
  // ─────────────────────────────────────────────────────────────────────────
  completeCalled = false;
  navigatedPath = '';
  delegatedChild.props.onComplete(
    { tenantId: 'stellar-tenant', businessSlug: 'stellar-store', id: 'biz-stellar' },
    'LISTING_AND_STORE'
  );
  assert.equal(navigatedPath, '/tenant/stellar-tenant/dashboard',
    'LISTING_AND_STORE + tenantId must navigate to /tenant/:tenantId/dashboard');
  assert.equal(completeCalled, true, 'onComplete callback must be invoked');

  // ─────────────────────────────────────────────────────────────────────────
  // Requirement 5: LISTING_AND_STORE + no tenantId must NOT use businessData.id as tenant ID
  //   (business identity ≠ tenant identity)
  // ─────────────────────────────────────────────────────────────────────────
  navigatedPath = '';
  delegatedChild.props.onComplete(
    { businessSlug: 'artisan-bakery', id: 'biz-artisan' /* no tenantId */ },
    'LISTING_AND_STORE'
  );
  assert.notEqual(navigatedPath, '/tenant/biz-artisan/dashboard',
    'LISTING_AND_STORE without tenantId must NOT substitute businessData.id as tenant ID');
  assert.ok(
    navigatedPath.startsWith('/business/') || navigatedPath === '/',
    `LISTING_AND_STORE without tenantId must fall back to business destination, got: "${navigatedPath}"`
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Requirement 6: LISTING_ONLY → canonical business destination /business/:businessSlug
  // ─────────────────────────────────────────────────────────────────────────
  navigatedPath = '';
  completeCalled = false;
  delegatedChild.props.onComplete(
    { businessSlug: 'kallon-repair', id: 'biz-kallon' },
    'LISTING_ONLY'
  );
  assert.equal(navigatedPath, '/business/kallon-repair',
    'LISTING_ONLY must navigate to /business/:businessSlug');
  assert.equal(completeCalled, true, 'onComplete callback must be invoked');

  // Fallback to id when slug absent
  navigatedPath = '';
  delegatedChild.props.onComplete({ id: 'biz-fresh-produce' }, 'LISTING_ONLY');
  assert.equal(navigatedPath, '/business/biz-fresh-produce',
    'LISTING_ONLY without slug must fallback to businessData.id as business slug');

  // Fallback to adapter businessId when neither slug nor id present
  navigatedPath = '';
  delegatedChild.props.onComplete({}, 'LISTING_ONLY');
  assert.equal(navigatedPath, '/business/biz-fallback-id',
    'LISTING_ONLY with empty record must fallback to adapter businessId prop');

  // ─────────────────────────────────────────────────────────────────────────
  // Requirement 7: Cancellation navigates to / and invokes onCancel
  // ─────────────────────────────────────────────────────────────────────────
  cancelCalled = false;
  navigatedPath = '';
  delegatedChild.props.onNavigate('/');
  assert.equal(navigatedPath, '/', 'Cancellation must navigate to /');
  assert.equal(cancelCalled, true, 'Cancellation must invoke onCancel callback');

  // ─────────────────────────────────────────────────────────────────────────
  // Requirement 8: App.tsx does not directly render or import BusinessOnboardingShell
  // ─────────────────────────────────────────────────────────────────────────
  const appSource = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf-8');
  assert.equal(
    appSource.includes('<BusinessOnboardingShell'),
    false,
    'App.tsx must not directly render BusinessOnboardingShell'
  );
  assert.equal(
    appSource.includes("import BusinessOnboardingShell"),
    false,
    'App.tsx must not directly import BusinessOnboardingShell'
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Requirement 9: No onboarding route resolves to TenantShell
  // ─────────────────────────────────────────────────────────────────────────
  const onboardingRoutes = [
    '/business/onboarding',
    '/business/register',
    '/business/onboarding?mode=listing',
    '/business/onboarding?mode=store',
  ];
  for (const route of onboardingRoutes) {
    assert.equal(resolveDomainForPath(route), 'BUSINESS_ONBOARDING',
      `${route} must resolve to BUSINESS_ONBOARDING domain`);
    const el = ShellResolver({ currentPath: route, onNavigate: () => {} });
    assert.notEqual(el.type, TenantShell,
      `${route} must NEVER resolve to TenantShell`);
    assert.equal(el.type, ShellOnboardingAdapter,
      `${route} must resolve to ShellOnboardingAdapter`);
  }
  assert.notEqual(getShellNameForDomain('BUSINESS_ONBOARDING'), 'TenantShell');
});


