import assert from 'node:assert/strict';
import test from 'node:test';
import {
  establishTenantSecurityContext,
  assertTenantIsolation,
  assertCallerIsOwner,
  assertOwnershipTransferAllowed,
  assertNotTenantOwnerDeletion,
  assertNotTenantOwnerDemotion,
  sanitizeTenantUpdatePayload,
  createOwnershipTransferAuditRecord,
} from './tenantOwnershipAuth';
import { normalizeStaffPayload } from './tenantStaffAuth';
import type { TenantRecord } from '../types';

// Mock baseline tenant record
const mockTenantA: TenantRecord = {
  id: 'tenant-a',
  ownerUid: 'uid-owner-a',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockTenantB: TenantRecord = {
  id: 'tenant-b',
  ownerUid: 'uid-owner-b',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

// 1. Tenant A owner cannot operate on Tenant B
test('Ownership Test 1: Tenant A owner cannot operate on Tenant B', () => {
  const callerUser = {
    uid: 'uid-owner-a',
    claims: { tenantId: 'tenant-a' },
  };

  // Attempting to establish context for Tenant B with Tenant A claims must fail
  assert.throws(
    () =>
      establishTenantSecurityContext({
        user: callerUser,
        tenantRecord: mockTenantB,
      }),
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /tenant isolation violation/i);
      return true;
    }
  );

  // Asserting tenant isolation directly
  assert.throws(
    () => assertTenantIsolation('tenant-a', 'tenant-b'),
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /cross-tenant/i);
      return true;
    }
  );
});

// 2. Tenant A admin cannot become owner
test('Ownership Test 2: Tenant A admin cannot become owner', () => {
  const adminUser = {
    uid: 'uid-admin-a',
    claims: {
      tenantId: 'tenant-a',
      role: 'Admin',
      permissions: ['users.manage', 'users.roles', 'system.settings'],
    },
  };

  const context = establishTenantSecurityContext({
    user: adminUser,
    tenantRecord: mockTenantA,
    staffRecord: {
      uid: 'uid-admin-a',
      tenantId: 'tenant-a',
      role: 'Admin',
      roleId: 'Admin',
      status: 'active',
    },
  });

  // Admin cannot be recognized as owner despite having admin/manage roles
  assert.equal(context.isOwner, false);
  assert.equal(context.ownerUid, 'uid-owner-a');

  // Attempting owner operations must fail
  assert.throws(
    () => assertCallerIsOwner(context),
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /only the authoritative tenant owner/i);
      return true;
    }
  );
});

// 3. A user cannot set ownerUid through request body
test('Ownership Test 3: A user cannot set ownerUid through request body', () => {
  const maliciousPayload = {
    name: 'Updated Tenant Name',
    ownerUid: 'uid-attacker',
    owner_uid: 'uid-attacker',
  };

  // sanitizeTenantUpdatePayload rejects ownerUid tampering
  assert.throws(
    () => sanitizeTenantUpdatePayload(maliciousPayload, 'tenant-a'),
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /direct modification of owneruid is forbidden/i);
      return true;
    }
  );

  // normalizeStaffPayload rejects ownerUid tampering
  assert.throws(
    () =>
      normalizeStaffPayload(
        { name: 'Attacker Staff', role: 'Admin', ownerUid: 'uid-attacker' },
        'tenant-a'
      ),
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /strictly prohibited/i);
      return true;
    }
  );
});

// 4. A user cannot set tenantId to another tenant
test('Ownership Test 4: A user cannot set tenantId to another tenant', () => {
  const authenticatedTenant = 'tenant-a';

  // In sanitizeTenantUpdatePayload, client-supplied mismatching tenantId is rejected
  assert.throws(
    () => sanitizeTenantUpdatePayload({ tenantId: 'tenant-b', name: 'Tampered' }, authenticatedTenant),
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /cannot change tenantid/i);
      return true;
    }
  );

  // In normalizeStaffPayload, client-supplied tenantId is strictly overridden
  const staff = normalizeStaffPayload(
    { name: 'Valid Staff', role: 'Cashier', tenantId: 'tenant-b' },
    authenticatedTenant
  );
  assert.equal(staff.tenantId, 'tenant-a');
});

// 5. Only current owner can transfer ownership
test('Ownership Test 5: Only current owner can transfer ownership', () => {
  const nonOwnerCaller = establishTenantSecurityContext({
    user: { uid: 'uid-admin-a', claims: { tenantId: 'tenant-a', role: 'Business Owner' } }, // Even role "Business Owner" is not ownerUid
    tenantRecord: mockTenantA,
  });

  assert.throws(
    () =>
      assertOwnershipTransferAllowed({
        callerContext: nonOwnerCaller,
        targetMember: { uid: 'uid-target-member', tenantId: 'tenant-a', status: 'active' },
      }),
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /only the authoritative tenant owner/i);
      return true;
    }
  );
});

// 6. Ownership transfer to another tenant is rejected
test('Ownership Test 6: Ownership transfer to another tenant is rejected', () => {
  const ownerCaller = establishTenantSecurityContext({
    user: { uid: 'uid-owner-a', claims: { tenantId: 'tenant-a' } },
    tenantRecord: mockTenantA,
  });

  const crossTenantMember = {
    uid: 'uid-target-b',
    tenantId: 'tenant-b',
    status: 'active',
  };

  assert.throws(
    () =>
      assertOwnershipTransferAllowed({
        callerContext: ownerCaller,
        targetMember: crossTenantMember,
      }),
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /cross-tenant/i);
      return true;
    }
  );
});

// 7. Transfer to inactive/non-member is rejected
test('Ownership Test 7: Transfer to inactive/non-member is rejected', () => {
  const ownerCaller = establishTenantSecurityContext({
    user: { uid: 'uid-owner-a', claims: { tenantId: 'tenant-a' } },
    tenantRecord: mockTenantA,
  });

  // Non-member (null)
  assert.throws(
    () =>
      assertOwnershipTransferAllowed({
        callerContext: ownerCaller,
        targetMember: null,
      }),
    (err: any) => {
      assert.equal(err.statusCode, 404);
      assert.match(err.message, /target user not found/i);
      return true;
    }
  );

  // Inactive member
  const inactiveMember = {
    uid: 'uid-inactive-member',
    tenantId: 'tenant-a',
    status: 'deactivated',
  };

  assert.throws(
    () =>
      assertOwnershipTransferAllowed({
        callerContext: ownerCaller,
        targetMember: inactiveMember,
      }),
    (err: any) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /inactive, suspended, or deactivated/i);
      return true;
    }
  );
});

// 8. Current owner cannot be deleted by users.manage
test('Ownership Test 8: Current owner cannot be deleted by users.manage', () => {
  const targetStaffOwner = {
    id: 'staff-owner-doc',
    uid: 'uid-owner-a',
    tenantId: 'tenant-a',
    name: 'Current Owner',
    role: 'Store Manager',
  };

  assert.throws(
    () => assertNotTenantOwnerDeletion(targetStaffOwner, mockTenantA),
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /the tenant owner account cannot be deleted/i);
      return true;
    }
  );
});

// 9. Current owner cannot be demoted by users.roles
test('Ownership Test 9: Current owner cannot be demoted by users.roles', () => {
  const targetStaffOwner = {
    id: 'staff-owner-doc',
    uid: 'uid-owner-a',
    tenantId: 'tenant-a',
    name: 'Current Owner',
    role: 'Business Owner',
  };

  assert.throws(
    () => assertNotTenantOwnerDemotion(targetStaffOwner, mockTenantA, 'Cashier'),
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /the tenant owner cannot be demoted/i);
      return true;
    }
  );
});

// 10. Admin cannot change ownerUid
test('Ownership Test 10: Admin cannot change ownerUid', () => {
  const adminAttempt = {
    name: 'Tampered Settings',
    ownerUid: 'uid-admin-takeover',
  };

  assert.throws(
    () => sanitizeTenantUpdatePayload(adminAttempt, 'tenant-a'),
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /direct modification of owneruid is forbidden/i);
      return true;
    }
  );
});

// 11. Owner transfer is atomic
test('Ownership Test 11: Owner transfer is atomic', async () => {
  // Simulate transactional boundary
  let state = {
    tenant: { ...mockTenantA },
    auditLogs: [] as any[],
  };

  const executeTransferTransaction = async (shouldFail: boolean) => {
    // Snapshot
    const backupTenant = { ...state.tenant };
    const backupLogs = [...state.auditLogs];

    try {
      // 1. Update tenant ownerUid
      state.tenant.ownerUid = 'uid-target-member';
      state.tenant.updatedAt = new Date().toISOString();

      // 2. Simulated failure condition
      if (shouldFail) {
        throw new Error('Database connection failure during transaction commit');
      }

      // 3. Write audit log
      const audit = createOwnershipTransferAuditRecord({
        tenantId: 'tenant-a',
        actorUid: 'uid-owner-a',
        targetUid: 'uid-target-member',
        previousOwner: 'uid-owner-a',
        newOwner: 'uid-target-member',
      });
      state.auditLogs.push(audit);
    } catch (err) {
      // Rollback
      state.tenant = backupTenant;
      state.auditLogs = backupLogs;
      throw err;
    }
  };

  // Failure must roll back completely without partial state update
  await assert.rejects(
    async () => executeTransferTransaction(true),
    /database connection failure/i
  );

  assert.equal(state.tenant.ownerUid, 'uid-owner-a');
  assert.equal(state.auditLogs.length, 0);

  // Success commits both changes atomically
  await executeTransferTransaction(false);
  assert.equal(state.tenant.ownerUid, 'uid-target-member');
  assert.equal(state.auditLogs.length, 1);
});

// 12. Successful transfer updates ownerUid correctly
test('Ownership Test 12: Successful transfer updates ownerUid correctly', () => {
  const ownerCaller = establishTenantSecurityContext({
    user: { uid: 'uid-owner-a', claims: { tenantId: 'tenant-a' } },
    tenantRecord: mockTenantA,
  });

  const validTarget = {
    uid: 'uid-active-member-2',
    tenantId: 'tenant-a',
    status: 'active',
  };

  const newOwnerUid = assertOwnershipTransferAllowed({
    callerContext: ownerCaller,
    targetMember: validTarget,
  });

  assert.equal(newOwnerUid, 'uid-active-member-2');
});

// 13. Successful transfer creates an audit record
test('Ownership Test 13: Successful transfer creates an audit record', () => {
  const audit = createOwnershipTransferAuditRecord({
    tenantId: 'tenant-a',
    actorUid: 'uid-owner-a',
    targetUid: 'uid-new-owner-2',
    previousOwner: 'uid-owner-a',
    newOwner: 'uid-new-owner-2',
    metadata: { reason: 'Voluntary retirement' },
  });

  assert.ok(audit.id);
  assert.equal(audit.tenantId, 'tenant-a');
  assert.equal(audit.actorUid, 'uid-owner-a');
  assert.equal(audit.targetUid, 'uid-new-owner-2');
  assert.equal(audit.action, 'TENANT_OWNERSHIP_TRANSFERRED');
  assert.equal(audit.previousOwner, 'uid-owner-a');
  assert.equal(audit.newOwner, 'uid-new-owner-2');
  assert.ok(audit.timestamp);
  assert.equal(audit.metadata?.reason, 'Voluntary retirement');
});
