import assert from 'node:assert/strict';
import test from 'node:test';
import {
  sanitizeAuditMetadata,
  inferAuditSeverity,
  createAuthoritativeAuditRecord,
  computeSecurityMetrics,
  queryTenantAuditLogs,
} from './auditService';
import {
  evaluateActiveTenantMembership,
} from './tenantOwnershipAuth';
import type { AuditLog, TenantRecord, StaffMember } from '../types';

// Mock tenant records
const mockTenantA: TenantRecord = {
  id: 'tenant-alpha',
  ownerUid: 'uid-owner-alpha',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockTenantB: TenantRecord = {
  id: 'tenant-beta',
  ownerUid: 'uid-owner-beta',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

// Mock staff members
const mockOwnerAlphaStaff: StaffMember = {
  id: 'staff-owner-alpha',
  name: 'Alice Owner',
  email: 'alice@alpha.com',
  role: 'Business Owner',
  status: 'active',
  avatar: 'avatar1.png',
  pin: '9999',
  permissionsOverride: [],
};

const mockAdminAlphaStaff: StaffMember = {
  id: 'staff-admin-alpha',
  name: 'Aaron Admin',
  email: 'aaron@alpha.com',
  role: 'Super Admin',
  status: 'active',
  avatar: 'avatar2.png',
  pin: '1234',
  permissionsOverride: ['users.audit', 'users.manage'],
};

const mockCashierAlphaStaff: StaffMember = {
  id: 'staff-cashier-alpha',
  name: 'Charlie Cashier',
  email: 'charlie@alpha.com',
  role: 'Cashier',
  status: 'active',
  avatar: 'avatar3.png',
  pin: '5678',
  permissionsOverride: [],
};

const mockSuspendedAlphaStaff: StaffMember = {
  id: 'staff-suspended-alpha',
  name: 'Sam Suspended',
  email: 'sam@alpha.com',
  role: 'Manager',
  status: 'suspended',
  avatar: 'avatar4.png',
  pin: '0000',
  permissionsOverride: ['users.audit'],
};

// ============================================================================
// PHASE 2 & 5: SENSITIVE METADATA SANITIZATION & LEAKAGE PREVENTION
// ============================================================================

test('Audit Security 1: sanitizeAuditMetadata strictly strips secrets, PINs, tokens, and keys', () => {
  const dirtyMetadata = {
    staffId: 'staff-123',
    pin: '1234',
    password: 'SuperSecretPassword!',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    secret: 'live_sec_abc123456789',
    monimeApiKey: 'sec_key_9999',
    webhookSecret: 'whsec_testing123',
    cvv: '999',
    authorization: 'Bearer token-xyz',
    safeField: 'This should remain untouched',
    nestedDetails: {
      clientPin: '4321',
      sessionToken: 'token-abc',
      safeNested: 'Keep me',
    },
    accountsList: [
      { pin: '1111', role: 'Cashier' },
      { safeItem: 'ok' },
    ],
  };

  const sanitized = sanitizeAuditMetadata(dirtyMetadata) as any;

  // Sensitive top-level keys must be redacted
  assert.equal(sanitized.pin, '[REDACTED]');
  assert.equal(sanitized.password, '[REDACTED]');
  assert.equal(sanitized.token, '[REDACTED]');
  assert.equal(sanitized.secret, '[REDACTED]');
  assert.equal(sanitized.monimeApiKey, '[REDACTED]');
  assert.equal(sanitized.webhookSecret, '[REDACTED]');
  assert.equal(sanitized.cvv, '[REDACTED]');
  assert.equal(sanitized.authorization, '[REDACTED]');

  // Safe field preserved
  assert.equal(sanitized.staffId, 'staff-123');
  assert.equal(sanitized.safeField, 'This should remain untouched');

  // Nested secrets must be redacted
  assert.equal(sanitized.nestedDetails.clientPin, '[REDACTED]');
  assert.equal(sanitized.nestedDetails.sessionToken, '[REDACTED]');
  assert.equal(sanitized.nestedDetails.safeNested, 'Keep me');

  // Array elements must be recursively sanitized
  assert.equal(sanitized.accountsList[0].pin, '[REDACTED]');
  assert.equal(sanitized.accountsList[0].role, 'Cashier');
  assert.equal(sanitized.accountsList[1].safeItem, 'ok');
});

// ============================================================================
// PHASE 2: CANONICAL SEVERITY INFERENCE
// ============================================================================

test('Audit Security 2: inferAuditSeverity accurately tags critical, warning, and informational actions', () => {
  // Critical operations
  assert.equal(inferAuditSeverity('OWNERSHIP_TRANSFERRED'), 'critical');
  assert.equal(inferAuditSeverity('MONIME_CREDENTIALS_ROTATED'), 'critical');
  assert.equal(inferAuditSeverity('SECURITY_BREACH_DETECTED'), 'critical');
  assert.equal(inferAuditSeverity('STAFF_SUSPENDED'), 'critical');
  assert.equal(inferAuditSeverity('STAFF_DELETED'), 'critical');
  assert.equal(inferAuditSeverity('ANY_ACTION', 'denied'), 'critical');
  assert.equal(inferAuditSeverity('ANY_ACTION', 'failed'), 'critical');

  // Warning operations
  assert.equal(inferAuditSeverity('STAFF_ROLE_CHANGED'), 'warning');
  assert.equal(inferAuditSeverity('STAFF_PERMISSIONS_UPDATED'), 'warning');
  assert.equal(inferAuditSeverity('TENANT_SETTINGS_UPDATED'), 'warning');
  assert.equal(inferAuditSeverity('STAFF_REACTIVATED'), 'warning');

  // Informational operations
  assert.equal(inferAuditSeverity('STAFF_CREATED'), 'info');
  assert.equal(inferAuditSeverity('STAFF_LOGGED_IN'), 'info');
  assert.equal(inferAuditSeverity('REPORT_EXPORTED'), 'info');
});

// ============================================================================
// PHASE 2 & 6: AUTHORITATIVE AUDIT RECORD CREATION
// ============================================================================

test('Audit Security 3: createAuthoritativeAuditRecord builds canonical record and sanitizes metadata', () => {
  const record = createAuthoritativeAuditRecord({
    tenantId: 'tenant-alpha',
    actorUid: 'uid-admin-1',
    actorName: 'Aaron Admin',
    actorEmail: 'aaron@alpha.com',
    actorRole: 'Super Admin',
    action: 'STAFF_ROLE_CHANGED',
    module: 'User Management',
    targetType: 'staff',
    targetId: 'staff-cashier-101',
    targetName: 'Charlie Cashier',
    previousState: { role: 'Cashier', permissionsOverride: [] },
    newState: { role: 'Store Manager', permissionsOverride: ['inventory.view'] },
    reason: 'Promotion to shift lead',
    result: 'success',
    metadata: {
      updatedBy: 'Aaron Admin',
      temporaryPin: '1234', // Must be sanitized!
      safeNotes: 'Reviewed by HR',
    },
  });

  assert.ok(record.id.startsWith('audit_'));
  assert.ok(record.timestamp);
  assert.equal(record.tenantId, 'tenant-alpha');
  assert.equal(record.actorUid, 'uid-admin-1');
  assert.equal(record.actorName, 'Aaron Admin');
  assert.equal(record.actorEmail, 'aaron@alpha.com');
  assert.equal(record.actorRole, 'Super Admin');
  assert.equal(record.action, 'STAFF_ROLE_CHANGED');
  assert.equal(record.module, 'User Management');
  assert.equal(record.targetType, 'staff');
  assert.equal(record.targetId, 'staff-cashier-101');
  assert.equal(record.targetName, 'Charlie Cashier');
  assert.equal((record.previousState as any)?.role, 'Cashier');
  assert.equal((record.newState as any)?.role, 'Store Manager');
  assert.equal(record.reason, 'Promotion to shift lead');
  assert.equal(record.result, 'success');
  assert.equal(record.severity, 'warning'); // Inferred

  // Metadata sanitized
  assert.equal(record.metadata?.temporaryPin, '[REDACTED]');
  assert.equal(record.metadata?.safeNotes, 'Reviewed by HR');
});

// ============================================================================
// PHASE 4: ACCURATE SECURITY METRICS COMPUTATION
// ============================================================================

test('Audit Security 4: computeSecurityMetrics computes authoritative telemetry without fabrication', () => {
  const now = new Date();
  const todayIso = now.toISOString();
  const threeDaysAgoIso = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const tenDaysAgoIso = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();

  const mockLogs: AuditLog[] = [
    {
      id: 'log-1',
      tenantId: 'tenant-alpha',
      timestamp: todayIso,
      action: 'STAFF_SUSPENDED',
      module: 'User Management',
      staffName: 'Admin',
      role: 'Super Admin',
      details: 'Suspended staff',
      result: 'success',
      severity: 'critical',
    },
    {
      id: 'log-2',
      tenantId: 'tenant-alpha',
      timestamp: todayIso,
      action: 'STAFF_ROLE_CHANGED',
      module: 'User Management',
      staffName: 'Admin',
      role: 'Super Admin',
      details: 'Promoted staff',
      result: 'success',
      severity: 'warning',
    },
    {
      id: 'log-3',
      tenantId: 'tenant-alpha',
      timestamp: threeDaysAgoIso,
      action: 'OWNERSHIP_TRANSFERRED',
      module: 'Security',
      staffName: 'Owner',
      role: 'Business Owner',
      details: 'Transferred store ownership',
      result: 'success',
      severity: 'critical',
    },
    {
      id: 'log-4',
      tenantId: 'tenant-alpha',
      timestamp: threeDaysAgoIso,
      action: 'CROSS_TENANT_ACCESS_DENIED',
      module: 'Security',
      staffName: 'Unknown',
      role: 'Guest',
      details: 'Unauthorized tenant access attempt',
      result: 'denied',
      severity: 'critical',
    },
    {
      id: 'log-5',
      tenantId: 'tenant-alpha',
      timestamp: tenDaysAgoIso,
      action: 'STAFF_LOGIN',
      module: 'User Management',
      staffName: 'Cashier',
      role: 'Cashier',
      details: 'Regular terminal login',
      result: 'success',
      severity: 'info',
    },
  ];

  const metrics = computeSecurityMetrics(mockLogs);

  assert.equal(metrics.eventsToday, 2, 'Events today must match logs from today');
  assert.equal(metrics.eventsThisWeek, 4, 'Events this week must include past 7 days, excluding 10 days ago');
  assert.equal(metrics.staffSuspensions, 1, 'Should count 1 suspension');
  assert.equal(metrics.rolePermissionChanges, 1, 'Should count 1 role/permission change');
  assert.equal(metrics.ownershipEvents, 1, 'Should count 1 ownership event');
  assert.equal(metrics.failedDeniedOperations, 1, 'Should count 1 denied operation');
});

// ============================================================================
// PHASE 5: TENANT ISOLATION IN QUERYING & PAGINATION
// ============================================================================

test('Audit Security 5: queryTenantAuditLogs enforces tenant isolation and bounded pagination', async () => {
  const tenantALogs: AuditLog[] = [
    {
      id: 'log-a1',
      tenantId: 'tenant-alpha',
      timestamp: '2026-09-10T12:00:00.000Z',
      action: 'STAFF_CREATED',
      module: 'User Management',
      staffName: 'Admin',
      role: 'Super Admin',
      details: 'Created staff 1',
      result: 'success',
    },
    {
      id: 'log-a2',
      tenantId: 'tenant-alpha',
      timestamp: '2026-09-11T12:00:00.000Z',
      action: 'STAFF_SUSPENDED',
      module: 'User Management',
      staffName: 'Admin',
      role: 'Super Admin',
      details: 'Suspended staff 1',
      result: 'success',
    },
  ];

  const tenantBLogs: AuditLog[] = [
    {
      id: 'log-b1',
      tenantId: 'tenant-beta',
      timestamp: '2026-09-12T12:00:00.000Z',
      action: 'TENANT_SETTINGS_UPDATED',
      module: 'Settings',
      staffName: 'Beta Owner',
      role: 'Store Owner',
      details: 'Updated tenant settings',
      result: 'success',
    },
  ];

  // Mock Firestore implementation that respects where('tenantId', '==', tenantId)
  const createMockDb = (allLogs: AuditLog[]) => {
    return {
      collection: (colName: string) => {
        assert.equal(colName, 'audit_logs');
        return {
          where: (field: string, op: string, val: any) => {
            assert.equal(field, 'tenantId');
            assert.equal(op, '==');
            const tenantLogs = allLogs.filter(l => l.tenantId === val);

            const buildQuery = (current: AuditLog[]) => ({
              where: (f2: string, op2: string, val2: any) => {
                const next = current.filter(l => (l as any)[f2] === val2);
                return buildQuery(next);
              },
              orderBy: () => buildQuery(current),
              get: async () => ({
                empty: current.length === 0,
                docs: current.map(doc => ({
                  id: doc.id,
                  data: () => doc,
                })),
                forEach: (cb: (doc: any) => void) => {
                  current.forEach(doc => cb({ id: doc.id, data: () => doc }));
                },
              }),
            });

            return buildQuery(tenantLogs);
          },
        };
      },
    } as any;
  };

  const mockDb = createMockDb([...tenantALogs, ...tenantBLogs]);

  // Query Tenant Alpha
  const resultAlpha = await queryTenantAuditLogs(mockDb, 'tenant-alpha', {
    page: 1,
    pageSize: 10,
  });

  assert.equal(resultAlpha.events.length, 2);
  assert.ok(resultAlpha.events.every(item => item.tenantId === 'tenant-alpha'));
  assert.equal(resultAlpha.totalCount, 2);

  // Tenant B logs must NOT leak into Tenant Alpha query
  assert.ok(!resultAlpha.events.some(item => item.id === 'log-b1'));

  // Query with bounded pagination clamp test
  const clampedResult = await queryTenantAuditLogs(mockDb, 'tenant-alpha', {
    page: -5, // Should clamp to 1
    pageSize: 500, // Should clamp to 100
  });

  assert.equal(clampedResult.page, 1);
  assert.equal(clampedResult.pageSize, 100);
});

// ============================================================================
// PHASE 5: TENANT MEMBERSHIP & RBAC PERMISSION ENFORCEMENT
// ============================================================================

test('Audit Security 6: Tenant membership evaluation rejects suspended staff from accessing audit', () => {
  const result = evaluateActiveTenantMembership({
    tenantId: 'tenant-alpha',
    userUid: 'uid-suspended-alpha',
    tenant: mockTenantA,
    staff: { ...mockSuspendedAlphaStaff, status: 'suspended', tenantId: 'tenant-alpha', uid: 'uid-suspended-alpha' },
  });

  assert.equal(result.allowed, false);
  assert.equal(result.statusCode, 403);
  assert.match(result.error || '', /suspended/i);
});

test('Audit Security 7: Active tenant owner is recognized with authoritative ownership', () => {
  const result = evaluateActiveTenantMembership({
    tenantId: 'tenant-alpha',
    userUid: 'uid-owner-alpha',
    tenant: mockTenantA,
    staff: mockOwnerAlphaStaff,
  });

  assert.equal(result.allowed, true);
});

test('Audit Security 8: Cross-tenant attack - staff from Tenant B accessing Tenant A is rejected', () => {
  const result = evaluateActiveTenantMembership({
    tenantId: 'tenant-alpha',
    userUid: 'uid-intruder-b',
    tenant: mockTenantA,
    staff: null, // Not a member of Tenant Alpha
  });

  assert.equal(result.allowed, false);
  assert.equal(result.statusCode, 403);
});
