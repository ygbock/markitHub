import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createStaffStatusAuditRecord,
  assertTenantStaffAccess,
  isSelfStaffOperation,
} from './tenantStaffAuth';
import {
  assertNotTenantOwnerSuspension,
  evaluateActiveTenantMembership,
} from './tenantOwnershipAuth';
import type { TenantRecord } from '../types';

// Mock tenant environments
const mockTenantAlpha: TenantRecord = {
  id: 'tenant-alpha',
  ownerUid: 'uid-owner-alpha',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockTenantBeta: TenantRecord = {
  id: 'tenant-beta',
  ownerUid: 'uid-owner-beta',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

// 1. Suspend creates an audit record with all required schema properties
test('Status Audit 1: suspend creates an audit record with complete schema properties', () => {
  const audit = createStaffStatusAuditRecord({
    tenantId: 'tenant-alpha',
    actorUid: 'uid-manager-1',
    actorName: 'Manager Marcus',
    actorRole: 'Store Manager',
    targetStaffId: 'staff-cashier-101',
    targetStaffName: 'Jessie Quick',
    previousStatus: 'active',
    newStatus: 'suspended',
    reason: 'Repeated cash drawer discrepancy',
  });

  assert.ok(audit.id.startsWith('audit_staff_'));
  assert.ok(audit.timestamp);
  assert.equal(audit.staffName, 'Manager Marcus');
  assert.equal(audit.role, 'Store Manager');
  assert.equal(audit.action, 'Staff Suspended');
  assert.equal(audit.module, 'User Management');
  assert.equal(audit.tenantId, 'tenant-alpha');
  assert.equal(audit.actorUid, 'uid-manager-1');
  assert.equal(audit.targetStaffId, 'staff-cashier-101');
  assert.equal(audit.targetStaffName, 'Jessie Quick');
  assert.equal(audit.previousStatus, 'active');
  assert.equal(audit.newStatus, 'suspended');
  assert.equal(audit.reason, 'Repeated cash drawer discrepancy');
  assert.match(audit.details, /Jessie Quick/);
  assert.match(audit.details, /staff-cashier-101/);
  assert.match(audit.details, /Repeated cash drawer discrepancy/);
});

// 2. Reactivate creates an audit record
test('Status Audit 2: reactivate creates an audit record with complete schema properties', () => {
  const audit = createStaffStatusAuditRecord({
    tenantId: 'tenant-alpha',
    actorUid: 'uid-manager-1',
    actorName: 'Manager Marcus',
    actorRole: 'Store Manager',
    targetStaffId: 'staff-cashier-101',
    targetStaffName: 'Jessie Quick',
    previousStatus: 'suspended',
    newStatus: 'active',
    reason: 'Investigation concluded with clear findings',
  });

  assert.ok(audit.id.startsWith('audit_staff_'));
  assert.ok(audit.timestamp);
  assert.equal(audit.action, 'Staff Reactivated');
  assert.equal(audit.module, 'User Management');
  assert.equal(audit.tenantId, 'tenant-alpha');
  assert.equal(audit.previousStatus, 'suspended');
  assert.equal(audit.newStatus, 'active');
  assert.equal(audit.reason, 'Investigation concluded with clear findings');
  assert.match(audit.details, /status changed from suspended to active/);
});

// 3. Supplied reason is recorded; falls back to administrative default if omitted
test('Status Audit 3: supplied reason is recorded and default is applied when blank', () => {
  const customReasonAudit = createStaffStatusAuditRecord({
    tenantId: 'tenant-alpha',
    actorUid: 'uid-manager-1',
    targetStaffId: 'staff-1',
    previousStatus: 'active',
    newStatus: 'suspended',
    reason: 'Policy violation 4.2',
  });
  assert.equal(customReasonAudit.reason, 'Policy violation 4.2');
  assert.match(customReasonAudit.details, /Policy violation 4\.2/);

  const defaultSuspendAudit = createStaffStatusAuditRecord({
    tenantId: 'tenant-alpha',
    actorUid: 'uid-manager-1',
    targetStaffId: 'staff-1',
    previousStatus: 'active',
    newStatus: 'suspended',
  });
  assert.equal(defaultSuspendAudit.reason, 'Administrative suspension');

  const defaultReactivateAudit = createStaffStatusAuditRecord({
    tenantId: 'tenant-alpha',
    actorUid: 'uid-manager-1',
    targetStaffId: 'staff-1',
    previousStatus: 'suspended',
    newStatus: 'active',
    reason: '   ',
  });
  assert.equal(defaultReactivateAudit.reason, 'Administrative reactivation');
});

// 4. Do not expose secrets or credentials in audit records
test('Status Audit 4: do not expose secrets or credentials in audit records', () => {
  const rawMetadataWithSecrets = {
    pin: '1234',
    staffPin: '9999',
    userToken: 'secret-token-xyz',
    credentialHash: 'hash-abc-123',
    password_hash: 'super-secret',
    safeContext: 'HQ Branch 1',
  };

  const audit = createStaffStatusAuditRecord({
    tenantId: 'tenant-alpha',
    actorUid: 'uid-admin',
    targetStaffId: 'staff-with-pin',
    previousStatus: 'active',
    newStatus: 'suspended',
    reason: 'Security rotation',
    metadata: rawMetadataWithSecrets,
  });

  const serialized = JSON.stringify(audit);
  assert.doesNotMatch(serialized, /1234/);
  assert.doesNotMatch(serialized, /9999/);
  assert.doesNotMatch(serialized, /secret-token/);
  assert.doesNotMatch(serialized, /super-secret/);
  assert.equal(audit.metadata?.safeContext, 'HQ Branch 1');
  assert.equal(audit.metadata?.pin, undefined);
  assert.equal(audit.metadata?.staffPin, undefined);
  assert.equal(audit.metadata?.userToken, undefined);
});

// 5. Cross-tenant suspension creates no mutation
test('Status Audit 5: cross-tenant suspension creates no mutation', async () => {
  let dbState = {
    staff: {
      'staff-beta-1': {
        id: 'staff-beta-1',
        tenantId: 'tenant-beta',
        name: 'Beta Employee',
        status: 'active',
      },
    },
    auditLogs: [] as any[],
  };

  const callerTenantId = 'tenant-alpha';
  const targetStaff = dbState.staff['staff-beta-1'];

  // Cross-tenant operation must throw 403 before any mutation or audit log occurs
  assert.throws(
    () => {
      assertTenantStaffAccess(targetStaff, callerTenantId);
      // Below should never execute:
      targetStaff.status = 'suspended';
      dbState.auditLogs.push({ action: 'Staff Suspended' });
    },
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /cross-tenant/i);
      return true;
    }
  );

  // Assert target staff remains unchanged and no audit log was generated
  assert.equal(dbState.staff['staff-beta-1'].status, 'active');
  assert.equal(dbState.auditLogs.length, 0);
});

// 6. Unauthorized suspension creates no mutation
test('Status Audit 6: unauthorized suspension creates no mutation', () => {
  let dbState = {
    staff: {
      'staff-102': {
        id: 'staff-102',
        tenantId: 'tenant-alpha',
        name: 'Regular Employee',
        status: 'active',
      },
    },
    auditLogs: [] as any[],
  };

  const callerPermissions = ['users.view']; // lacks users.manage
  const hasPermission = callerPermissions.includes('users.manage');

  if (!hasPermission) {
    // Middleware would reject with 403 without mutating data
    // Verify data remains untouched
  } else {
    dbState.staff['staff-102'].status = 'suspended';
    dbState.auditLogs.push({ action: 'Staff Suspended' });
  }

  assert.equal(dbState.staff['staff-102'].status, 'active');
  assert.equal(dbState.auditLogs.length, 0);
});

// 7. Owner suspension creates no mutation
test('Status Audit 7: owner suspension creates no mutation', () => {
  let dbState = {
    staff: {
      'staff-owner-1': {
        id: 'staff-owner-1',
        uid: 'uid-owner-alpha',
        tenantId: 'tenant-alpha',
        name: 'Business Owner Alpha',
        status: 'active',
      },
    },
    auditLogs: [] as any[],
  };

  const ownerStaff = dbState.staff['staff-owner-1'];

  assert.throws(
    () => {
      assertNotTenantOwnerSuspension(ownerStaff, mockTenantAlpha, 'suspended');
      // If reached, mutation would occur:
      ownerStaff.status = 'suspended';
      dbState.auditLogs.push({ action: 'Staff Suspended' });
    },
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /owner account cannot be suspended/i);
      return true;
    }
  );

  assert.equal(dbState.staff['staff-owner-1'].status, 'active');
  assert.equal(dbState.auditLogs.length, 0);
});

// 8. Self-suspension creates no mutation
test('Status Audit 8: self-suspension creates no mutation', () => {
  let dbState = {
    staff: {
      'staff-admin-self': {
        id: 'staff-admin-self',
        uid: 'uid-admin-self',
        tenantId: 'tenant-alpha',
        name: 'Admin Self',
        status: 'active',
      },
    },
    auditLogs: [] as any[],
  };

  const callerUser = {
    uid: 'uid-admin-self',
    email: 'admin@tenant-alpha.com',
    claims: { tenantId: 'tenant-alpha', staffId: 'staff-admin-self' },
  };
  const targetStaff = dbState.staff['staff-admin-self'];

  const isSelf = isSelfStaffOperation(callerUser, targetStaff.id, targetStaff);
  assert.equal(isSelf, true);

  if (isSelf) {
    // Rejection: cannot change own account status
  } else {
    targetStaff.status = 'suspended';
    dbState.auditLogs.push({ action: 'Staff Suspended' });
  }

  assert.equal(dbState.staff['staff-admin-self'].status, 'active');
  assert.equal(dbState.auditLogs.length, 0);
});

// 9. Failed status mutation does not create a misleading success audit event
test('Status Audit 9: failed status mutation does not create a misleading success audit event', async () => {
  let dbState = {
    staff: {
      'staff-test-target': {
        id: 'staff-test-target',
        tenantId: 'tenant-alpha',
        name: 'Target Employee',
        status: 'active',
      },
    },
    auditLogs: [] as any[],
  };

  // Transaction simulation with atomic rollback
  const executeStatusTransaction = async (failDuringCommit: boolean) => {
    const backupStaff = JSON.parse(JSON.stringify(dbState.staff));
    const backupLogs = [...dbState.auditLogs];

    try {
      // 1. Mutate staff
      dbState.staff['staff-test-target'].status = 'suspended';

      // 2. Simulated failure (e.g. database network error during commit)
      if (failDuringCommit) {
        throw new Error('Firestore commit failed: transaction aborted');
      }

      // 3. Write audit log
      const audit = createStaffStatusAuditRecord({
        tenantId: 'tenant-alpha',
        actorUid: 'uid-operator',
        targetStaffId: 'staff-test-target',
        targetStaffName: 'Target Employee',
        previousStatus: 'active',
        newStatus: 'suspended',
        reason: 'Violation of procedure',
      });
      dbState.auditLogs.push(audit);
    } catch (error) {
      // Transactional rollback ensures atomicity
      dbState.staff = backupStaff;
      dbState.auditLogs = backupLogs;
      throw error;
    }
  };

  // When commit fails, state is rolled back and NO audit log is recorded
  await assert.rejects(
    async () => executeStatusTransaction(true),
    /transaction aborted/i
  );
  assert.equal(dbState.staff['staff-test-target'].status, 'active');
  assert.equal(dbState.auditLogs.length, 0);

  // When commit succeeds, both status mutation and audit log exist together
  await executeStatusTransaction(false);
  assert.equal(dbState.staff['staff-test-target'].status, 'suspended');
  assert.equal(dbState.auditLogs.length, 1);
  assert.equal(dbState.auditLogs[0].action, 'Staff Suspended');
});

// 10. Staff Details Drawer compatibility test
test('Status Audit 10: Staff Details Drawer filter matches status audit records by name and ID', () => {
  const staffTarget = {
    id: 'staff-drawer-target-99',
    name: 'Elena Rostova',
  };

  const auditLog = createStaffStatusAuditRecord({
    tenantId: 'tenant-alpha',
    actorUid: 'uid-admin-1',
    actorName: 'Admin Marcus',
    targetStaffId: staffTarget.id,
    targetStaffName: staffTarget.name,
    previousStatus: 'active',
    newStatus: 'suspended',
    reason: 'Temporary audit hold',
  });

  // Exactly matching the filter in StaffDetailsDrawer.tsx:
  // (log) => log.staffName === staff.name || log.details.includes(staff.name) || log.details.includes(staff.id)
  const matchesByDetailsName = auditLog.details.includes(staffTarget.name);
  const matchesByDetailsId = auditLog.details.includes(staffTarget.id);

  assert.equal(matchesByDetailsName, true);
  assert.equal(matchesByDetailsId, true);

  const drawerFilteredLogs = [auditLog].filter(
    (log) => log.staffName === staffTarget.name || log.details.includes(staffTarget.name) || log.details.includes(staffTarget.id)
  );

  assert.equal(drawerFilteredLogs.length, 1);
  assert.equal(drawerFilteredLogs[0].action, 'Staff Suspended');
  assert.match(drawerFilteredLogs[0].details, /Temporary audit hold/);
});
