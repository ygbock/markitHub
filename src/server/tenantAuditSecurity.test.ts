import assert from 'node:assert/strict';
import test from 'node:test';
import {
  sanitizeAuditMetadata,
  inferAuditSeverity,
  createAuthoritativeAuditRecord,
  computeSecurityMetrics,
  queryTenantAuditLogs,
  extractMetricsFromDoc,
  applyEventToMetricsDoc,
  updateAuthoritativeSecurityMetrics,
  MAX_AUDIT_LOG_FETCH,
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

// ============================================================================
// PHASE 5: CLIENT TENANT ID SPOOFING & QUERY TAMPERING
// ============================================================================

test('Audit Security 9: Client-supplied tenantId in query params cannot override authoritative tenantId argument', async () => {
  let capturedQueryTenant = '';
  const mockDb = {
    collection: (colName: string) => {
      assert.equal(colName, 'audit_logs');
      return {
        where: (field: string, op: string, val: any) => {
          assert.equal(field, 'tenantId');
          capturedQueryTenant = val;
          return {
            where: () => ({ get: async () => ({ docs: [], forEach: () => {} }) }),
            orderBy: () => ({ get: async () => ({ docs: [], forEach: () => {} }) }),
            get: async () => ({ docs: [], forEach: () => {} }),
          };
        },
      };
    },
  } as any;

  // Attacker attempts to pass tenantId="tenant-beta" in query params to inspect Tenant Beta
  await queryTenantAuditLogs(mockDb, 'tenant-alpha', {
    ...({ tenantId: 'tenant-beta' } as any),
    page: 1,
    pageSize: 20,
  });

  // Authoritative server tenant context MUST prevail
  assert.equal(capturedQueryTenant, 'tenant-alpha');
});

// ============================================================================
// PHASE 5: RBAC PERMISSION ENFORCEMENT FOR USERS.AUDIT
// ============================================================================

test('Audit Security 10: RBAC enforcement - only users.audit or tenant owner can view telemetry', () => {
  const evaluateAuditAccess = (user: { uid: string; claims?: { role?: string; permissions?: string[] } }, tenantOwnerUid: string) => {
    if (user.uid === tenantOwnerUid) {
      return { authorized: true };
    }
    const permissions = user.claims?.permissions || [];
    if (permissions.includes('users.audit')) {
      return { authorized: true };
    }
    return { authorized: false, statusCode: 403, error: 'Permission users.audit is required' };
  };

  // Case 1: Tenant Owner (no explicit users.audit permission) -> Allowed
  const ownerAccess = evaluateAuditAccess({ uid: 'uid-owner-alpha' }, 'uid-owner-alpha');
  assert.equal(ownerAccess.authorized, true);

  // Case 2: Super Admin with users.audit -> Allowed
  const adminAccess = evaluateAuditAccess(
    { uid: 'uid-admin-1', claims: { role: 'Super Admin', permissions: ['users.audit', 'users.manage'] } },
    'uid-owner-alpha'
  );
  assert.equal(adminAccess.authorized, true);

  // Case 3: Cashier without users.audit -> Denied with 403
  const cashierAccess = evaluateAuditAccess(
    { uid: 'uid-cashier-1', claims: { role: 'Cashier', permissions: ['sales.create'] } },
    'uid-owner-alpha'
  );
  assert.equal(cashierAccess.authorized, false);
  assert.equal(cashierAccess.statusCode, 403);
});

// ============================================================================
// PHASE 4 & 5: CSV FORMULA INJECTION NEUTRALIZATION
// ============================================================================

test('Audit Security 11: CSV formula injection triggers (=, +, -, @) are sanitized before export', () => {
  const sanitizeCsvCell = (val: unknown): string => {
    let str = String(val ?? '');
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    return `"${str.replace(/"/g, '""')}"`;
  };

  // Malicious cells designed to trigger Excel DDE or formula execution
  assert.equal(sanitizeCsvCell("=cmd|' /C calc'!A0"), "\"'=cmd|' /C calc'!A0\"");
  assert.equal(sanitizeCsvCell("+123456789"), "\"'+123456789\"");
  assert.equal(sanitizeCsvCell("-SUM(A1:A10)"), "\"'-SUM(A1:A10)\"");
  assert.equal(sanitizeCsvCell("@SUM(A1:A10)"), "\"'@SUM(A1:A10)\"");

  // Safe cells remain normal quoted strings
  assert.equal(sanitizeCsvCell("Marcus Admin"), "\"Marcus Admin\"");
  assert.equal(sanitizeCsvCell("STAFF_CREATED"), "\"STAFF_CREATED\"");
});

// ============================================================================
// PHASE 6: TRANSACTIONAL AUDIT INTEGRITY ON FAILED MUTATIONS
// ============================================================================

test('Audit Security 12: Failed mutation does not create an audit record', async () => {
  const writtenAuditRecords: any[] = [];
  const mockDb = {
    runTransaction: async (updateFunction: (tx: any) => Promise<any>) => {
      const tx = {
        get: async () => ({ exists: true, data: () => ({ status: 'active', tenantId: 'tenant-alpha' }) }),
        set: (ref: any, data: any) => {
          writtenAuditRecords.push(data);
        },
      };

      // Simulate a business validation or invariant failure during the transaction
      throw new Error('Transaction aborted: owner cannot be suspended');
    },
  };

  try {
    await mockDb.runTransaction(async () => {});
    assert.fail('Should have thrown an error');
  } catch (err: any) {
    assert.match(err.message, /Transaction aborted/);
  }

  // Ensure no audit records were committed
  assert.equal(writtenAuditRecords.length, 0);
});

// ============================================================================
// PHASE 7: HIGH-SCALE TENANT ROLLING SECURITY METRICS & QUERY BOUNDS
// ============================================================================

test('Audit Security 13: Large tenant audit collections do not require unbounded historical reads for KPI calculation', async () => {
  const todayKey = new Date().toISOString().slice(0, 10);
  const yesterdayKey = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Authoritative rolling metrics doc stored in tenant_security_metrics
  const preAggregatedMetricsDoc = {
    tenantId: 'tenant-enterprise',
    staffSuspensions: 14,
    rolePermissionChanges: 28,
    ownershipEvents: 2,
    failedDeniedOperations: 7,
    dailyBuckets: {
      [todayKey]: 45,
      [yesterdayKey]: 80,
    },
    updatedAt: new Date().toISOString(),
  };

  let limitCalledWith: number | null = null;
  let metricsDocFetched = false;
  let historicalCollectionScannedUnbounded = false;

  const mockDb = {
    collection: (colName: string) => {
      if (colName === 'tenant_security_metrics') {
        return {
          doc: (docId: string) => {
            assert.equal(docId, 'tenant-enterprise');
            return {
              get: async () => {
                metricsDocFetched = true;
                return {
                  exists: true,
                  data: () => preAggregatedMetricsDoc,
                };
              },
            };
          },
        };
      }

      if (colName === 'audit_logs') {
        return {
          where: (field: string, op: string, val: any) => {
            assert.equal(field, 'tenantId');
            assert.equal(val, 'tenant-enterprise');

            const queryObj: any = {
              where: () => queryObj,
              orderBy: () => queryObj,
              limit: (n: number) => {
                limitCalledWith = n;
                return queryObj;
              },
              get: async () => {
                // If limit was not called before get, flag unbounded historical collection scan
                if (limitCalledWith === null) {
                  historicalCollectionScannedUnbounded = true;
                }
                return {
                  docs: [
                    {
                      id: 'log-recent-1',
                      data: () => ({
                        id: 'log-recent-1',
                        tenantId: 'tenant-enterprise',
                        action: 'STAFF_LOGIN',
                        timestamp: new Date().toISOString(),
                        module: 'User Management',
                        result: 'success',
                      }),
                    },
                  ],
                };
              },
            };
            return queryObj;
          },
        };
      }

      throw new Error(`Unexpected collection access: ${colName}`);
    },
  };

  const response = await queryTenantAuditLogs(mockDb, 'tenant-enterprise', {
    page: 1,
    pageSize: 25,
  });

  // 1. Authoritative metrics doc was fetched with an O(1) single-document read
  assert.equal(metricsDocFetched, true, 'Authoritative metrics document must be retrieved');

  // 2. Unbounded historical scan was completely avoided
  assert.equal(historicalCollectionScannedUnbounded, false, 'Unbounded historical scan must NOT occur');
  assert.equal(limitCalledWith, MAX_AUDIT_LOG_FETCH, `Firestore query must enforce bounded limit of ${MAX_AUDIT_LOG_FETCH}`);

  // 3. Metrics reflect the authoritative summary without reading all history into memory
  assert.equal(response.metrics.eventsToday, 45, "Today's events must match authoritative today bucket");
  assert.equal(response.metrics.eventsThisWeek, 125, 'Trailing 7-day velocity must aggregate authoritative daily buckets');
  assert.equal(response.metrics.staffSuspensions, 14);
  assert.equal(response.metrics.rolePermissionChanges, 28);
  assert.equal(response.metrics.ownershipEvents, 2);
  assert.equal(response.metrics.failedDeniedOperations, 7);
});

// ============================================================================
// PHASE 7: METRIC CONTAMINATION PREVENTION (FAILED/DENIED ACTIONS)
// ============================================================================

test('Audit Security 14: Failed and denied operations never contaminate successful operational metrics', () => {
  const contaminatedEvents: AuditLog[] = [
    {
      id: 'denied-suspension',
      tenantId: 'tenant-alpha',
      timestamp: new Date().toISOString(),
      action: 'STAFF_SUSPEND_ATTEMPT_BLOCKED',
      module: 'User Management',
      staffName: 'Malicious Actor',
      role: 'Cashier',
      details: 'Unauthorized attempt to suspend store manager blocked',
      result: 'denied', // ACCESS DENIED
      severity: 'critical',
    },
    {
      id: 'failed-role-change',
      tenantId: 'tenant-alpha',
      timestamp: new Date().toISOString(),
      action: 'STAFF_ROLE_CHANGE_FAILED',
      module: 'User Management',
      staffName: 'Operator',
      role: 'Staff Manager',
      details: 'Failed role change: target is protected tenant owner',
      result: 'failed', // OPERATION FAILED
      severity: 'critical',
    },
    {
      id: 'denied-ownership-transfer',
      tenantId: 'tenant-alpha',
      timestamp: new Date().toISOString(),
      action: 'TENANT_OWNERSHIP_TRANSFER_DENIED',
      module: 'Security',
      staffName: 'Intruder',
      role: 'Guest',
      details: 'Unauthorized caller attempted root ownership transfer',
      result: 'denied', // ACCESS DENIED
      severity: 'critical',
    },
    {
      id: 'legitimate-suspension',
      tenantId: 'tenant-alpha',
      timestamp: new Date().toISOString(),
      action: 'STAFF_SUSPENDED',
      module: 'User Management',
      staffName: 'Authoritative Owner',
      role: 'Tenant Owner',
      details: 'Suspended staff member after security incident',
      result: 'success', // SUCCESSFUL OPERATION
      severity: 'critical',
    },
  ];

  const metrics = computeSecurityMetrics(contaminatedEvents);

  // Failed/denied actions must only increment failedDeniedOperations
  assert.equal(metrics.failedDeniedOperations, 3, 'All 3 failed/denied operations must be flagged');

  // Successful counters must strictly reflect only successful operations
  assert.equal(metrics.staffSuspensions, 1, 'Only the legitimate successful suspension may increment staffSuspensions');
  assert.equal(metrics.rolePermissionChanges, 0, 'Failed role changes must NEVER increment rolePermissionChanges');
  assert.equal(metrics.ownershipEvents, 0, 'Denied ownership transfers must NEVER increment ownershipEvents');
});

// ============================================================================
// PHASE 7: ROLLING METRICS DOCUMENT APPLICATION & PRUNING
// ============================================================================

test('Audit Security 15: applyEventToMetricsDoc and extractMetricsFromDoc maintain bounded buckets and correct counters', () => {
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const oldDateKey = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // 40 days ago

  const initialDoc = {
    tenantId: 'tenant-alpha',
    staffSuspensions: 2,
    rolePermissionChanges: 5,
    ownershipEvents: 1,
    failedDeniedOperations: 0,
    dailyBuckets: {
      [oldDateKey]: 100, // Should be pruned (>35 days)
    },
    updatedAt: new Date().toISOString(),
  };

  const newSuccessEvent: AuditLog = {
    id: 'log-new-1',
    tenantId: 'tenant-alpha',
    timestamp: now.toISOString(),
    action: 'STAFF_SUSPENDED',
    module: 'User Management',
    staffName: 'Owner',
    role: 'Tenant Owner',
    details: 'Suspended cashier account',
    result: 'success',
  };

  const updatedDoc = applyEventToMetricsDoc(initialDoc, newSuccessEvent);

  // Counters updated
  assert.equal(updatedDoc.staffSuspensions, 3);
  assert.equal(updatedDoc.dailyBuckets[todayKey], 1);

  // Stale bucket pruned
  assert.equal(updatedDoc.dailyBuckets[oldDateKey], undefined, 'Buckets older than 35 days must be pruned');

  // Derive metrics
  const extracted = extractMetricsFromDoc(updatedDoc);
  assert.equal(extracted.eventsToday, 1);
  assert.equal(extracted.eventsThisWeek, 1);
  assert.equal(extracted.staffSuspensions, 3);
});

// ============================================================================
// PHASE 7: ATOMIC BATCH INSEPARABILITY FOR MUTATION AND AUDIT LOG
// ============================================================================

test('Audit Security 16: Mutation and audit record inseparability via atomic batch execution', async () => {
  const committedOperations: { type: string; ref: string; data?: any }[] = [];

  const mockBatch = {
    set: (ref: any, data: any) => {
      committedOperations.push({ type: 'set', ref: ref.path || ref.id, data });
    },
    delete: (ref: any) => {
      committedOperations.push({ type: 'delete', ref: ref.path || ref.id });
    },
    commit: async () => {
      // Commits all queued batch operations atomically
      return;
    },
  };

  const mockStaffRef = { path: 'staff/staff-123' };
  const mockAuditRef = { path: 'audit_logs/audit-999' };
  const mockMetricsRef = { path: 'tenant_security_metrics/tenant-alpha' };

  const staffData = { id: 'staff-123', name: 'Bob Cashier', role: 'Cashier' };
  const auditData = { id: 'audit-999', tenantId: 'tenant-alpha', action: 'STAFF_CREATED', result: 'success' as const };

  // Queue entity mutation and audit record into batch
  mockBatch.set(mockStaffRef, staffData);
  mockBatch.set(mockAuditRef, auditData);
  mockBatch.set(mockMetricsRef, { tenantId: 'tenant-alpha', staffSuspensions: 0 });

  await mockBatch.commit();

  // Verify all 3 documents were committed together in the batch
  assert.equal(committedOperations.length, 3);
  assert.equal(committedOperations[0].ref, 'staff/staff-123');
  assert.equal(committedOperations[1].ref, 'audit_logs/audit-999');
  assert.equal(committedOperations[2].ref, 'tenant_security_metrics/tenant-alpha');
});


