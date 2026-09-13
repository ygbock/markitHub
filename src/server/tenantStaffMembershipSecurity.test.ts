import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateActiveTenantMembership,
  assertNotTenantOwnerSuspension,
} from './tenantOwnershipAuth';
import {
  assertTenantStaffAccess,
  isSelfStaffOperation,
} from './tenantStaffAuth';
import type { TenantRecord } from '../types';

// Mock active tenant
const mockActiveTenant: TenantRecord = {
  id: 'tenant-omega',
  ownerUid: 'uid-owner-omega',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

// Mock suspended tenant
const mockSuspendedTenant: TenantRecord = {
  id: 'tenant-suspended',
  ownerUid: 'uid-owner-suspended',
  status: 'suspended',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

// 1. Suspended staff cannot access /api/tenant/staff even with a valid, previously issued Firebase token
test('Staff Membership Test 1: Suspended staff cannot access even with a valid, previously issued Firebase token', () => {
  // Previously issued valid Firebase token with legitimate claims and permissions
  const validTokenUser = {
    uid: 'uid-staff-suspended-1',
    email: 'cashier.suspended@example.com',
    claims: {
      tenantId: 'tenant-omega',
      role: 'Cashier',
      permissions: ['users.view', 'pos.sell'],
    },
    permissions: ['users.view', 'pos.sell'],
  };

  // Staff record in database is marked 'suspended'
  const suspendedStaffRecord = {
    id: 'staff-doc-1',
    uid: 'uid-staff-suspended-1',
    tenantId: 'tenant-omega',
    status: 'suspended',
    role: 'Cashier',
  };

  const evaluation = evaluateActiveTenantMembership({
    tenantId: 'tenant-omega',
    userUid: validTokenUser.uid,
    tenant: mockActiveTenant,
    staff: suspendedStaffRecord,
  });

  assert.equal(evaluation.allowed, false);
  assert.equal(evaluation.statusCode, 403);
  assert.match(evaluation.error || '', /Staff account is inactive or suspended/i);
});

// 2. Active staff can access
test('Staff Membership Test 2: Active staff with valid token can access', () => {
  const activeTokenUser = {
    uid: 'uid-staff-active-1',
    email: 'manager.active@example.com',
    claims: {
      tenantId: 'tenant-omega',
      role: 'Manager',
      permissions: ['users.view'],
    },
    permissions: ['users.view'],
  };

  const activeStaffRecord = {
    id: 'staff-doc-2',
    uid: 'uid-staff-active-1',
    tenantId: 'tenant-omega',
    status: 'active',
    role: 'Manager',
  };

  const evaluation = evaluateActiveTenantMembership({
    tenantId: 'tenant-omega',
    userUid: activeTokenUser.uid,
    tenant: mockActiveTenant,
    staff: activeStaffRecord,
  });

  assert.equal(evaluation.allowed, true);
  assert.equal(evaluation.error, undefined);
});

// 3. Suspended tenants reject operations (for both staff and owner)
test('Staff Membership Test 3: Suspended tenants reject operations for staff and owner', () => {
  // Active staff member under suspended tenant
  const staffUser = {
    uid: 'uid-staff-active-1',
    claims: { tenantId: 'tenant-suspended' },
  };

  const staffRecord = {
    id: 'staff-doc-3',
    uid: 'uid-staff-active-1',
    tenantId: 'tenant-suspended',
    status: 'active',
  };

  const staffEvaluation = evaluateActiveTenantMembership({
    tenantId: 'tenant-suspended',
    userUid: staffUser.uid,
    tenant: mockSuspendedTenant,
    staff: staffRecord,
  });

  assert.equal(staffEvaluation.allowed, false);
  assert.equal(staffEvaluation.statusCode, 403);
  assert.match(staffEvaluation.error || '', /Tenant is suspended or unavailable/i);

  // Even the tenant owner cannot perform operations when tenant is suspended
  const ownerEvaluation = evaluateActiveTenantMembership({
    tenantId: 'tenant-suspended',
    userUid: 'uid-owner-suspended',
    tenant: mockSuspendedTenant,
    staff: null,
  });

  assert.equal(ownerEvaluation.allowed, false);
  assert.equal(ownerEvaluation.statusCode, 403);
  assert.match(ownerEvaluation.error || '', /Tenant is suspended or unavailable/i);
});

// 4. Owner cannot be suspended
test('Staff Membership Test 4: Tenant owner cannot be suspended', () => {
  const ownerStaffRecord = {
    id: 'staff-owner-doc',
    uid: 'uid-owner-omega',
    tenantId: 'tenant-omega',
    role: 'Business Owner',
    status: 'active',
  };

  // Attempting to suspend owner must throw 403
  assert.throws(
    () =>
      assertNotTenantOwnerSuspension(
        ownerStaffRecord,
        mockActiveTenant,
        'suspended'
      ),
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /The tenant owner account cannot be suspended/i);
      return true;
    }
  );

  // Attempting to suspend owner with uppercase or mixed case
  assert.throws(
    () =>
      assertNotTenantOwnerSuspension(
        ownerStaffRecord,
        mockActiveTenant,
        'SUSPENDED'
      ),
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /The tenant owner account cannot be suspended/i);
      return true;
    }
  );

  // Non-suspension status (e.g. 'active') on owner should not throw
  assert.doesNotThrow(() =>
    assertNotTenantOwnerSuspension(ownerStaffRecord, mockActiveTenant, 'active')
  );

  // Suspending a regular staff member should NOT throw
  const nonOwnerStaff = {
    id: 'staff-regular-doc',
    uid: 'uid-regular-staff',
    tenantId: 'tenant-omega',
    role: 'Cashier',
  };
  assert.doesNotThrow(() =>
    assertNotTenantOwnerSuspension(nonOwnerStaff, mockActiveTenant, 'suspended')
  );
});

// 5. Users cannot suspend themselves
test('Staff Membership Test 5: Users cannot suspend themselves', () => {
  const adminUser = {
    uid: 'uid-admin-1',
    claims: {
      tenantId: 'tenant-omega',
      staffId: 'staff-admin-doc-1',
    },
    email: 'admin1@example.com',
  };

  const adminStaffDoc = {
    id: 'staff-admin-doc-1',
    uid: 'uid-admin-1',
    email: 'admin1@example.com',
    tenantId: 'tenant-omega',
    role: 'Admin',
    status: 'active',
  };

  // Self operation detected by targetStaffId matching staffId claim
  assert.equal(
    isSelfStaffOperation(adminUser, 'staff-admin-doc-1', adminStaffDoc),
    true
  );

  // Self operation detected by targetStaffId matching uid
  assert.equal(
    isSelfStaffOperation(adminUser, 'uid-admin-1', adminStaffDoc),
    true
  );

  // Self operation detected by matching email
  assert.equal(
    isSelfStaffOperation(
      { uid: 'different-uid', email: 'admin1@example.com' },
      'staff-admin-doc-1',
      adminStaffDoc
    ),
    true
  );

  // Another staff member is not self operation
  const otherStaffDoc = {
    id: 'staff-other-doc-2',
    uid: 'uid-other-2',
    email: 'other@example.com',
    tenantId: 'tenant-omega',
    role: 'Cashier',
    status: 'active',
  };

  assert.equal(
    isSelfStaffOperation(adminUser, 'staff-other-doc-2', otherStaffDoc),
    false
  );
});

// 6. Cross-tenant status changes are rejected
test('Staff Membership Test 6: Cross-tenant status changes are rejected', () => {
  const foreignStaffRecord = {
    id: 'staff-foreign-1',
    uid: 'uid-foreign-1',
    tenantId: 'tenant-other-beta',
    status: 'active',
  };

  // Attempting to manage or alter status of staff belonging to another tenant
  assert.throws(
    () => assertTenantStaffAccess(foreignStaffRecord, 'tenant-omega'),
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /cross-tenant operation is prohibited/i);
      return true;
    }
  );
});

// 7. Reactivation restores access
test('Staff Membership Test 7: Reactivation restores access immediately', () => {
  const staffUser = {
    uid: 'uid-staff-recovering-1',
    claims: { tenantId: 'tenant-omega' },
  };

  const staffRecord = {
    id: 'staff-doc-recovering',
    uid: 'uid-staff-recovering-1',
    tenantId: 'tenant-omega',
    status: 'suspended',
    role: 'Cashier',
  };

  // 1. Initially suspended: access denied
  const initialEval = evaluateActiveTenantMembership({
    tenantId: 'tenant-omega',
    userUid: staffUser.uid,
    tenant: mockActiveTenant,
    staff: staffRecord,
  });
  assert.equal(initialEval.allowed, false);

  // 2. Reactivate staff member in database
  staffRecord.status = 'active';

  // 3. Immediately re-evaluate membership
  const reactivatedEval = evaluateActiveTenantMembership({
    tenantId: 'tenant-omega',
    userUid: staffUser.uid,
    tenant: mockActiveTenant,
    staff: staffRecord,
  });

  assert.equal(reactivatedEval.allowed, true);
  assert.equal(reactivatedEval.error, undefined);
});

// 8. Express middleware simulated execution: suspended staff gets HTTP 403
test('Staff Membership Test 8: Express middleware halts suspended staff with HTTP 403', async () => {
  const req: any = {
    user: {
      uid: 'uid-staff-suspended-1',
      claims: { tenantId: 'tenant-omega' },
    },
  };

  let statusCode = 200;
  let jsonResponse: any = null;
  let nextCalled = false;

  const res: any = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      jsonResponse = data;
      return res;
    },
  };

  const next = () => {
    nextCalled = true;
  };

  // Run the middleware logic directly using our evaluator
  const evalResult = evaluateActiveTenantMembership({
    tenantId: req.user.claims.tenantId,
    userUid: req.user.uid,
    tenant: mockActiveTenant,
    staff: { status: 'suspended', tenantId: 'tenant-omega', uid: 'uid-staff-suspended-1' },
  });

  if (!evalResult.allowed) {
    res.status(evalResult.statusCode || 403).json({ error: evalResult.error });
  } else {
    next();
  }

  assert.equal(nextCalled, false);
  assert.equal(statusCode, 403);
  assert.match(jsonResponse.error, /Staff account is inactive or suspended/i);
});

// 9. Express middleware simulated execution: suspended tenant halts both staff and owner with HTTP 403
test('Staff Membership Test 9: Express middleware halts suspended tenant with HTTP 403', async () => {
  const req: any = {
    user: {
      uid: 'uid-owner-suspended',
      claims: { tenantId: 'tenant-suspended' },
    },
  };

  let statusCode = 200;
  let jsonResponse: any = null;
  let nextCalled = false;

  const res: any = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      jsonResponse = data;
      return res;
    },
  };

  const next = () => {
    nextCalled = true;
  };

  const evalResult = evaluateActiveTenantMembership({
    tenantId: req.user.claims.tenantId,
    userUid: req.user.uid,
    tenant: mockSuspendedTenant,
    staff: null,
  });

  if (!evalResult.allowed) {
    res.status(evalResult.statusCode || 403).json({ error: evalResult.error });
  } else {
    next();
  }

  assert.equal(nextCalled, false);
  assert.equal(statusCode, 403);
  assert.match(jsonResponse.error, /Tenant is suspended or unavailable/i);
});

// 10. Express middleware simulated execution: active staff proceeds with next()
test('Staff Membership Test 10: Express middleware passes active staff with next()', async () => {
  const req: any = {
    user: {
      uid: 'uid-staff-active-1',
      claims: { tenantId: 'tenant-omega' },
    },
  };

  let nextCalled = false;
  const res: any = {
    status: () => res,
    json: () => res,
  };
  const next = () => {
    nextCalled = true;
  };

  const evalResult = evaluateActiveTenantMembership({
    tenantId: req.user.claims.tenantId,
    userUid: req.user.uid,
    tenant: mockActiveTenant,
    staff: { status: 'active', tenantId: 'tenant-omega', uid: 'uid-staff-active-1' },
  });

  if (!evalResult.allowed) {
    res.status(evalResult.statusCode || 403).json({ error: evalResult.error });
  } else {
    next();
  }

  assert.equal(nextCalled, true);
});

// 11. Express middleware simulated execution: active owner proceeds with next()
test('Staff Membership Test 11: Express middleware passes active owner with next()', async () => {
  const req: any = {
    user: {
      uid: 'uid-owner-omega',
      claims: { tenantId: 'tenant-omega' },
    },
  };

  let nextCalled = false;
  const res: any = {
    status: () => res,
    json: () => res,
  };
  const next = () => {
    nextCalled = true;
  };

  const evalResult = evaluateActiveTenantMembership({
    tenantId: req.user.claims.tenantId,
    userUid: req.user.uid,
    tenant: mockActiveTenant,
    staff: null,
  });

  if (!evalResult.allowed) {
    res.status(evalResult.statusCode || 403).json({ error: evalResult.error });
  } else {
    next();
  }

  assert.equal(nextCalled, true);
});
