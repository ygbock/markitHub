import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  extractAuthenticatedTenantId,
  assertTenantStaffAccess,
  assertStaffRoleManagementAllowed,
  assertNotSelfRoleChange,
  normalizeStaffPayload,
  isSelfStaffOperation,
  AuthenticatedUserContext
} from './tenantStaffAuth';

// Scenario 1: Tenant A user cannot GET Tenant B staff
test('Security Test 1: Tenant A user cannot GET Tenant B staff', () => {
  const tenantBStaff = {
    id: 'staff-b-1',
    tenantId: 'tenant-b',
    name: 'Bob',
    role: 'Cashier'
  };
  const authenticatedTenantA = 'tenant-a';

  assert.throws(
    () => assertTenantStaffAccess(tenantBStaff, authenticatedTenantA),
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /access denied/i);
      return true;
    }
  );
});

// Scenario 2: Tenant A user cannot PATCH Tenant B staff
test('Security Test 2: Tenant A user cannot PATCH Tenant B staff', () => {
  const tenantBStaff = {
    id: 'staff-b-2',
    tenantId: 'tenant-b',
    name: 'Alice',
    role: 'Cashier'
  };
  const authenticatedTenantA = 'tenant-a';

  assert.throws(
    () => assertTenantStaffAccess(tenantBStaff, authenticatedTenantA),
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /access denied/i);
      return true;
    }
  );
});

// Scenario 3: Tenant A user cannot DELETE Tenant B staff
test('Security Test 3: Tenant A user cannot DELETE Tenant B staff', () => {
  const tenantBStaff = {
    id: 'staff-b-3',
    tenantId: 'tenant-b',
    name: 'Charlie',
    role: 'Manager'
  };
  const authenticatedTenantA = 'tenant-a';

  assert.throws(
    () => assertTenantStaffAccess(tenantBStaff, authenticatedTenantA),
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /access denied/i);
      return true;
    }
  );
});

// Scenario 4: users.manage without users.roles cannot change another user's role
test("Security Test 4: users.manage without users.roles cannot change another user's role", () => {
  const callerPermissions = ['users.manage']; // lacks users.roles
  const targetExisting = {
    role: 'Cashier',
    customPermissions: []
  };

  assert.throws(
    () =>
      assertStaffRoleManagementAllowed(
        callerPermissions,
        { role: 'Store Manager' },
        targetExisting
      ),
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /require users\.roles/i);
      return true;
    }
  );
});

// Scenario 5: users.manage without users.roles cannot modify customPermissions
test('Security Test 5: users.manage without users.roles cannot modify customPermissions', () => {
  const callerPermissions = ['users.manage']; // lacks users.roles
  const targetExisting = {
    role: 'Cashier',
    customPermissions: ['sales.view']
  };

  assert.throws(
    () =>
      assertStaffRoleManagementAllowed(
        callerPermissions,
        { customPermissions: ['sales.view', 'sales.refund'] },
        targetExisting
      ),
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /require users\.roles/i);
      return true;
    }
  );
});

// Scenario 6: A user cannot change their own role
test('Security Test 6: A user cannot change their own role', () => {
  const userCtx: AuthenticatedUserContext = {
    uid: 'user-op-123',
    email: 'operator@tenant-a.com',
    claims: {
      tenantId: 'tenant-a',
      staffId: 'staff-op-123',
      role: 'Cashier',
      permissions: ['users.manage', 'users.roles'] // even with users.roles
    }
  };

  const selfStaff = {
    id: 'staff-op-123',
    uid: 'user-op-123',
    email: 'operator@tenant-a.com',
    role: 'Cashier'
  };

  // Attempting to elevate own role to 'Super Admin'
  assert.throws(
    () => assertNotSelfRoleChange(userCtx, 'staff-op-123', 'Super Admin', selfStaff),
    (err: any) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /cannot change your own role/i);
      return true;
    }
  );
});

// Scenario 7: Client-supplied tenantId cannot override the authenticated tenant
test('Security Test 7: Client-supplied tenantId cannot override the authenticated tenant', () => {
  const authenticatedTenant = 'tenant-authoritative-42';
  const maliciousPayload = {
    id: 'staff-tamper-1',
    tenantId: 'victim-tenant-99', // attacker trying to inject or switch tenant
    name: 'Tamper Tester',
    role: 'Cashier'
  };

  const normalized = normalizeStaffPayload(maliciousPayload, authenticatedTenant);
  assert.equal(normalized.tenantId, 'tenant-authoritative-42');
  assert.notEqual(normalized.tenantId, 'victim-tenant-99');
});

// Scenario 8: Arbitrary permission strings cannot be injected
test('Security Test 8: Arbitrary permission strings cannot be injected', () => {
  const authenticatedTenant = 'tenant-a';
  const maliciousPayload = {
    name: 'Injection Tester',
    role: 'Cashier',
    customPermissions: ['sales.view', 'super.evil.permission', 'injected_bypass', 42]
  };

  assert.throws(
    () => normalizeStaffPayload(maliciousPayload, authenticatedTenant),
    (err: any) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /Arbitrary permission strings cannot be injected/i);
      return true;
    }
  );
});

// Scenario 9: Invalid roles cannot be assigned
test('Security Test 9: Invalid roles cannot be assigned', () => {
  const authenticatedTenant = 'tenant-a';
  const invalidPayload = {
    name: 'Invalid Role Tester',
    role: 'UltraGodAdmin' // invalid role
  };

  assert.throws(
    () => normalizeStaffPayload(invalidPayload, authenticatedTenant),
    (err: any) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /Invalid staff role/i);
      return true;
    }
  );
});

// Scenario 10: A staff document belonging to another tenant cannot be overwritten by reusing its ID
test('Security Test 10: A staff document belonging to another tenant cannot be overwritten by reusing its ID', () => {
  const authenticatedTenantA = 'tenant-a';
  const existingTenantBStaff = {
    id: 'reused-staff-id-xyz',
    tenantId: 'tenant-b',
    name: 'Tenant B Staff',
    role: 'Store Manager'
  };

  // Cross-tenant verification fails before write/patch can take place
  assert.throws(
    () => assertTenantStaffAccess(existingTenantBStaff, authenticatedTenantA),
    (err: any) => {
      assert.equal(err.statusCode, 403);
      return true;
    }
  );
});

// Scenario 11: Direct browser access to the sensitive staff Firestore collection remains denied
test('Security Test 11: Direct browser access to sensitive staff Firestore collection is denied', () => {
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf8');

  // Verify match /staff/{staffId} blocks all direct client read and write operations
  assert.match(
    rules,
    /match\s+\/staff\/\{staffId\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;\s*\}/,
    'firestore.rules must explicitly deny direct client read and write on /staff'
  );
});

// Scenario 12: Verify UserManagementModule has no direct staff Firestore CRUD path and uses /api/tenant/staff
test('Security Test 12: UserManagementModule has no direct staff Firestore CRUD path and uses /api/tenant/staff', () => {
  const userModulePath = path.resolve(process.cwd(), 'src/components/UserManagementModule.tsx');
  const userModuleContent = fs.readFileSync(userModulePath, 'utf8');

  // Verify no direct Firestore collection / doc manipulation in UserManagementModule
  assert.doesNotMatch(userModuleContent, /collection\s*\(\s*db,\s*['"]staff['"]\s*\)/);
  assert.doesNotMatch(userModuleContent, /doc\s*\(\s*db,\s*['"]staff['"]/);
  assert.doesNotMatch(userModuleContent, /setDoc|addDoc|deleteDoc|updateDoc/);

  // Verify App.tsx uses /api/tenant/staff for staff operations
  const appPath = path.resolve(process.cwd(), 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert.match(appContent, /\/api\/tenant\/staff/);
  assert.match(appContent, /fetch\s*\(\s*['"]\/api\/tenant\/staff/);
});
