import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseCanonicalRoute } from '../routes/canonicalRoutes';
import { evaluateCanonicalRouteGuard, RouteAuthContext, TenantContextRecord } from '../routes/routeGuards';
import { User, TenantMembership, BusinessRelationship, PlatformIdentity, StaffMember, Customer } from '../types';

// Mock Tenant Context Record for tests
const mockTenantRecord: TenantContextRecord = {
  id: 'tenant-nexus-retail',
  slug: 'nexus-retail',
  name: 'Nexus Enterprise Commerce',
  status: 'active',
  capabilities: ['pos', 'inventory', 'storefront', 'orders', 'customers', 'reports'],
};

const dummyTenantLookup = (idOrSlug: string) => {
  if (idOrSlug === 'nexus-retail' || idOrSlug === 'tenant-nexus-retail') {
    return mockTenantRecord;
  }
  return null;
};

// ============================================================================
// SECTION 1: Type Systems & Data Entities (User, TenantMembership, PlatformIdentity)
// ============================================================================

test('Phase 2 Invariant 1: Canonical User identity schema under users/{uid}', () => {
  const mockUser: User = {
    uid: 'fb-user-12345',
    email: 'user@markithub.com',
    displayName: 'Test Operator',
    emailVerified: true,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  assert.equal(mockUser.uid, 'fb-user-12345');
  assert.equal(mockUser.status, 'active');
  assert.equal(mockUser.emailVerified, true);
});

test('Phase 2 Invariant 2: TenantMembership & BusinessRelationship schema', () => {
  const membership: TenantMembership = {
    uid: 'fb-user-12345',
    tenantId: 'nexus-retail',
    role: 'Store Manager',
    roleId: 'Admin',
    status: 'active',
  };

  const rel: BusinessRelationship = {
    uid: 'fb-user-12345',
    businessId: 'biz-101',
    relationshipType: 'owner',
    status: 'active',
  };

  assert.equal(membership.tenantId, 'nexus-retail');
  assert.equal(rel.relationshipType, 'owner');
});

test('Phase 2 Invariant 3: PlatformIdentity schema for Super Admin separation', () => {
  const superAdminIdentity: PlatformIdentity = {
    uid: 'super-admin-uid-99',
    role: 'Super Admin',
    isPlatformAdmin: true,
    isSuperAdmin: true,
  };

  const normalStaffIdentity: PlatformIdentity = {
    uid: 'staff-uid-12',
    role: 'None',
    isPlatformAdmin: false,
    isSuperAdmin: false,
  };

  assert.equal(superAdminIdentity.isSuperAdmin, true);
  assert.equal(normalStaffIdentity.isSuperAdmin, false);
});

// ============================================================================
// SECTION 2: Canonical Identity Routes Resolution
// ============================================================================

test('Phase 2 Invariant 4: All 5 canonical auth routes resolve to IDENTITY_AUTH domain', () => {
  const routes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
  ];

  routes.forEach((path) => {
    const route = parseCanonicalRoute(path);
    assert.equal(route.definition.domain, 'IDENTITY_AUTH', `Route ${path} must belong to IDENTITY_AUTH domain`);
    assert.equal(route.definition.auth, 'NONE', `Auth route ${path} must have auth NONE to allow unauthenticated access`);
  });
});

// ============================================================================
// SECTION 3: Route Guard Behavior & Security Invariants
// ============================================================================

test('Phase 2 Invariant 5: Suspended Platform Users fail closed across all routes', () => {
  const suspendedUser: User = {
    uid: 'suspended-uid-777',
    email: 'badactor@example.com',
    status: 'suspended',
    emailVerified: true,
  };

  const authContext: RouteAuthContext = {
    activeCustomer: null,
    activeStaff: null,
    tenantLookup: dummyTenantLookup,
    isStaffMemberOfTenant: () => true,
    platformUser: suspendedUser,
  };

  // Check tenant operational route
  const tenantRoute = parseCanonicalRoute('/tenant/nexus-retail/dashboard');
  const decision = evaluateCanonicalRouteGuard(tenantRoute, authContext);

  assert.equal(decision.allowed, false, 'Suspended user must be denied access');
  assert.equal(decision.type, 'PERMISSION_DENIED');
  assert.ok(decision.message?.toLowerCase().includes('suspended'));
});

test('Phase 2 Invariant 6: Customer identity alone CANNOT satisfy BUSINESS_OWNER access', () => {
  const mockCustomer: Customer = {
    id: 'cust-1',
    name: 'Customer Smith',
    email: 'customer@example.com',
    phone: '555-0199',
    address: '123 Main St',
    loyaltyPoints: 100,
    loyaltyTier: 'Gold',
    totalSpent: 500,
    totalOrders: 5,
    segment: 'VIP',
    purchaseHistoryIds: [],
  };

  const customerAuthContext: RouteAuthContext = {
    activeCustomer: mockCustomer,
    activeStaff: null,
    tenantLookup: dummyTenantLookup,
    isStaffMemberOfTenant: () => false,
    platformUser: {
      uid: 'cust-1',
      email: 'customer@example.com',
      emailVerified: true,
      status: 'active',
    },
    isBusinessOwner: () => false,
  };

  const bizRoute = parseCanonicalRoute('/business/biz-101/onboarding');
  const decision = evaluateCanonicalRouteGuard(bizRoute, customerAuthContext);

  assert.equal(decision.allowed, false, 'Customer identity alone must NOT be granted BUSINESS_OWNER access');
  assert.equal(decision.type, 'REDIRECT_LOGIN');
});

test('Phase 2 Invariant 7: Business Owner access allowed for verified business owner', () => {
  const ownerStaff: StaffMember = {
    id: 'staff-owner-1',
    name: 'Owner Alice',
    email: 'owner@example.com',
    role: 'Store Manager',
    pin: '1234',
    isOwner: true,
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
  };

  const ownerAuthContext: RouteAuthContext = {
    activeCustomer: null,
    activeStaff: ownerStaff,
    tenantLookup: dummyTenantLookup,
    isStaffMemberOfTenant: () => true,
    platformUser: {
      uid: 'staff-owner-1',
      email: 'owner@example.com',
      emailVerified: true,
      status: 'active',
    },
    isBusinessOwner: () => true,
  };

  const bizRoute = parseCanonicalRoute('/business/biz-101/onboarding');
  const decision = evaluateCanonicalRouteGuard(bizRoute, ownerAuthContext);

  assert.equal(decision.allowed, true, 'Verified business owner must be granted access to business routes');
});

test('Phase 2 Invariant 8: Super Admin platform routes require platform admin identity', () => {
  const regularStaff: StaffMember = {
    id: 'staff-2',
    name: 'Bob Cashier',
    email: 'bob@example.com',
    role: 'Cashier',
    pin: '1234',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
  };

  const regularContext: RouteAuthContext = {
    activeCustomer: null,
    activeStaff: regularStaff,
    tenantLookup: dummyTenantLookup,
    isStaffMemberOfTenant: () => true,
    platformIdentity: {
      uid: 'staff-2',
      role: 'None',
      isPlatformAdmin: false,
      isSuperAdmin: false,
    },
  };

  const superAdminRoute = parseCanonicalRoute('/superadmin/dashboard');
  const decision = evaluateCanonicalRouteGuard(superAdminRoute, regularContext);

  assert.equal(decision.allowed, false, 'Regular staff member must be denied Super Admin access');
  assert.equal(decision.type, 'SUPER_ADMIN_REQUIRED');
});

test('Phase 2 Invariant 9: Tenant membership is required for tenant operational routes', () => {
  const externalStaff: StaffMember = {
    id: 'staff-ext-1',
    name: 'External Staff',
    email: 'ext@example.com',
    role: 'Store Manager',
    pin: '1234',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
  };

  const nonMemberContext: RouteAuthContext = {
    activeCustomer: null,
    activeStaff: externalStaff,
    tenantLookup: dummyTenantLookup,
    isStaffMemberOfTenant: (_staffId, _tenantId) => false, // NOT a member of nexus-retail
    tenantMemberships: [],
  };

  const tenantRoute = parseCanonicalRoute('/tenant/nexus-retail/dashboard');
  const decision = evaluateCanonicalRouteGuard(tenantRoute, nonMemberContext);

  assert.equal(decision.allowed, false, 'Non-tenant staff member must be denied tenant workspace access');
  assert.equal(decision.type, 'TENANT_MEMBERSHIP_REQUIRED');
});

// ============================================================================
// SECTION 4: Phase 2 Remediation & Security Defect Verification
// ============================================================================

test('Remediation 1: Email containing "admin" or "super" DOES NOT grant Super Admin platform access without authoritative PlatformIdentity', () => {
  const userWithAdminEmail: User = {
    uid: 'sneaky-user-1',
    email: 'superadmin.imposter@gmail.com', // Email contains "super" and "admin"
    emailVerified: true,
    status: 'active',
  };

  const imposterContext: RouteAuthContext = {
    activeCustomer: null,
    activeStaff: null,
    tenantLookup: dummyTenantLookup,
    isStaffMemberOfTenant: () => false,
    platformUser: userWithAdminEmail,
    platformIdentity: {
      uid: 'sneaky-user-1',
      role: 'None',
      isPlatformAdmin: false,
      isSuperAdmin: false,
    },
  };

  const superAdminRoute = parseCanonicalRoute('/superadmin/dashboard');
  const decision = evaluateCanonicalRouteGuard(superAdminRoute, imposterContext);

  assert.equal(decision.allowed, false, 'Email string heuristic must NOT grant Super Admin access');
  assert.equal(decision.type, 'SUPER_ADMIN_REQUIRED');
});

test('Remediation 2: Ordinary staff member WITHOUT owner relationship CANNOT access BUSINESS_OWNER routes (no activeStaff bypass)', () => {
  const cashierStaff: StaffMember = {
    id: 'cashier-99',
    name: 'Cashier Charlie',
    email: 'charlie@example.com',
    role: 'Cashier',
    pin: '1234',
    isOwner: false,
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
  };

  const cashierContext: RouteAuthContext = {
    activeCustomer: null,
    activeStaff: cashierStaff,
    tenantLookup: dummyTenantLookup,
    isStaffMemberOfTenant: () => true,
    platformUser: {
      uid: 'cashier-99',
      email: 'charlie@example.com',
      emailVerified: true,
      status: 'active',
    },
    isBusinessOwner: () => false,
    businessRelationships: [],
  };

  const bizRoute = parseCanonicalRoute('/business/biz-101/onboarding');
  const decision = evaluateCanonicalRouteGuard(bizRoute, cashierContext);

  assert.equal(decision.allowed, false, 'Ordinary staff member must NOT satisfy BUSINESS_OWNER guard without owner relationship');
  assert.equal(decision.type, 'REDIRECT_LOGIN');
});

test('Remediation 3: Suspended platform user fails closed even if activeStaff PIN context is present', () => {
  const suspendedPlatformUser: User = {
    uid: 'suspended-staff-1',
    email: 'suspended@example.com',
    status: 'suspended',
    emailVerified: true,
  };

  const staffContext: StaffMember = {
    id: 'staff-active-pin',
    name: 'Suspended Staff',
    email: 'suspended@example.com',
    role: 'Store Manager',
    pin: '1234',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
  };

  const suspendedContext: RouteAuthContext = {
    activeCustomer: null,
    activeStaff: staffContext,
    tenantLookup: dummyTenantLookup,
    isStaffMemberOfTenant: () => true,
    platformUser: suspendedPlatformUser,
  };

  const tenantRoute = parseCanonicalRoute('/tenant/nexus-retail/dashboard');
  const decision = evaluateCanonicalRouteGuard(tenantRoute, suspendedContext);

  assert.equal(decision.allowed, false, 'Suspended platform user MUST fail closed across operational routes');
  assert.equal(decision.type, 'PERMISSION_DENIED');
  assert.ok(decision.message?.toLowerCase().includes('suspended'));
});

test('Remediation 4: Unresolved tenant memberships deny operational tenant workspace access', () => {
  const userNoMemberships: User = {
    uid: 'user-no-membership',
    email: 'unassigned@example.com',
    status: 'active',
    emailVerified: true,
  };

  const emptyMembershipContext: RouteAuthContext = {
    activeCustomer: null,
    activeStaff: null,
    tenantLookup: dummyTenantLookup,
    isStaffMemberOfTenant: () => false,
    platformUser: userNoMemberships,
    tenantMemberships: [],
  };

  const tenantRoute = parseCanonicalRoute('/tenant/nexus-retail/dashboard');
  const decision = evaluateCanonicalRouteGuard(tenantRoute, emptyMembershipContext);

  assert.equal(decision.allowed, false, 'Empty tenant memberships must deny access to tenant operational routes');
  assert.equal(decision.type, 'TENANT_MEMBERSHIP_REQUIRED');
});

test('Remediation 5: Legacy activeStaff alone CANNOT grant tenant operational access when tenantMemberships is present as empty array []', () => {
  const staffMember: StaffMember = {
    id: 'staff-legacy-only',
    name: 'Legacy Staff',
    email: 'legacy@example.com',
    role: 'Store Manager',
    pin: '1234',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
  };

  const context: RouteAuthContext = {
    activeCustomer: null,
    activeStaff: staffMember,
    tenantLookup: dummyTenantLookup,
    isStaffMemberOfTenant: () => true, // Legacy lookup returns true!
    platformUser: {
      uid: 'staff-legacy-only',
      email: 'legacy@example.com',
      status: 'active',
      emailVerified: true,
    },
    tenantMemberships: [], // Authoritative membership array is empty!
  };

  const tenantRoute = parseCanonicalRoute('/tenant/nexus-retail/dashboard');
  const decision = evaluateCanonicalRouteGuard(tenantRoute, context);

  assert.equal(decision.allowed, false, 'Authoritative empty tenantMemberships must override legacy isStaffMemberOfTenant fallback');
  assert.equal(decision.type, 'TENANT_MEMBERSHIP_REQUIRED');
});

test('Remediation 6: Suspended platform user fails closed on Customer account routes (/account/*)', () => {
  const suspendedCustomerUser: User = {
    uid: 'suspended-customer-1',
    email: 'suspended.customer@example.com',
    status: 'suspended',
    emailVerified: true,
  };

  const context: RouteAuthContext = {
    activeCustomer: null,
    activeStaff: null,
    tenantLookup: dummyTenantLookup,
    isStaffMemberOfTenant: () => false,
    platformUser: suspendedCustomerUser,
  };

  const accountRoute = parseCanonicalRoute('/account/orders');
  const decision = evaluateCanonicalRouteGuard(accountRoute, context);

  assert.equal(decision.allowed, false, 'Suspended platform user MUST fail closed on customer account routes');
  assert.equal(decision.type, 'PERMISSION_DENIED');
});

test('Remediation 7: Unresolved or invalid user status in user document fails closed', () => {
  // Mock malformed user profile where status is missing/invalid
  const malformedUser: any = {
    uid: 'corrupt-user-uid',
    email: 'corrupt@example.com',
    status: 'invalid_status_value', // Not 'active' or 'suspended'
  };

  const context: RouteAuthContext = {
    activeCustomer: null,
    activeStaff: null,
    tenantLookup: dummyTenantLookup,
    isStaffMemberOfTenant: () => false,
    platformUser: malformedUser,
  };

  const accountRoute = parseCanonicalRoute('/account/profile');
  const decision = evaluateCanonicalRouteGuard(accountRoute, context);

  assert.equal(decision.allowed, false, 'Invalid or non-active user status must fail closed');
  assert.equal(decision.type, 'PERMISSION_DENIED');
});



test('Remediation 8: Registration cannot authenticate without authoritative users/{uid} persistence', () => {
  const authContextSource = readFileSync(resolve(process.cwd(), 'src/context/AuthContext.tsx'), 'utf8');

  assert.doesNotMatch(
    authContextSource,
    /await setDoc\(doc\(db, 'users', fbUser\.uid\), newUser\)\.catch\(\(\) => \{\}\)/,
    'Registration must not swallow authoritative users/{uid} write failures'
  );
  assert.match(
    authContextSource,
    /const resolved = await resolveAuthoritativeContext\(fbUser\);/,
    'Registration must resolve the complete authoritative context before establishing an authenticated session'
  );
  assert.match(
    authContextSource,
    /if \(!resolved\) \{/,
    'Registration must reject unresolved authoritative identity context'
  );
});

test('Remediation 9: Authoritative relationship subcollection query failures cannot be treated as empty relationships', () => {
  const authContextSource = readFileSync(resolve(process.cwd(), 'src/context/AuthContext.tsx'), 'utf8');

  assert.doesNotMatch(
    authContextSource,
    /user tenant_memberships subcollection[\\s\\S]*?catch \(e: any\) \{[\\s\\S]*?\/\/ Subcollection is optional/,
    'Tenant membership subcollection failures must not be silently treated as optional absence'
  );
  assert.doesNotMatch(
    authContextSource,
    /user business_relationships subcollection[\\s\\S]*?catch \(e: any\) \{[\\s\\S]*?\/\/ Subcollection is optional/,
    'Business relationship subcollection failures must not be silently treated as optional absence'
  );
  assert.match(
    authContextSource,
    /user tenant_memberships query failed/,
    'Tenant membership subcollection failures must propagate into fail-closed context resolution'
  );
  assert.match(
    authContextSource,
    /user business_relationships query failed/,
    'Business relationship subcollection failures must propagate into fail-closed context resolution'
  );
});
