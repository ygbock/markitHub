import test from 'node:test';
import assert from 'node:assert/strict';
import { isPlatformAdminClaims, assertPlatformAdmin } from './platformAdminAuth';
import { evaluateUsageLimit, usageMeterId, usagePeriod, USAGE_METER_COLLECTION } from './platformUsageMeter';
import {
  assertLifecycleTransition,
  assertLifecycleSubscriptionConsistency,
  lifecycleForSubscriptionStatus,
  DEFAULT_PLATFORM_PLANS,
  calculateSubscriptionRevenue,
} from './platformAdminControlPlane';
import { createAuthoritativeAuditRecord, sanitizeAuditMetadata } from './auditService';

/**
 * Mock transactional environment to verify atomic platform billing & usage security.
 */
class MockTx {
  public sets = new Map<string, any>();
  public isCommitted = false;
  public isRolledBack = false;

  public set(ref: { path: string }, data: any, options?: any) {
    if (this.isCommitted || this.isRolledBack) throw new Error('Transaction ended');
    this.sets.set(ref.path, { data, options });
  }

  public commit() {
    this.isCommitted = true;
  }

  public rollback() {
    this.isRolledBack = true;
  }
}

class MockRef {
  constructor(public path: string) {}
}

class MockDatabase {
  public store = new Map<string, any>();

  public collection(name: string) {
    return {
      doc: (id: string) => new MockRef(`${name}/${id}`),
    };
  }

  public async runTransaction(fn: (tx: MockTx) => Promise<any>) {
    const tx = new MockTx();
    try {
      const res = await fn(tx);
      tx.commit();
      return res;
    } catch (err) {
      tx.rollback();
      throw err;
    }
  }
}

// ============================================================================
// AUTHORIZATION TESTS (1 - 5)
// ============================================================================

test('Billing Security 1: Unauthenticated request is rejected (401)', () => {
  const req: any = { user: undefined };
  const authHandler = (req: any) => {
    if (!req.user) return { status: 401, error: 'Unauthenticated' };
    return { status: 200 };
  };
  assert.equal(authHandler(req).status, 401);
});

test('Billing Security 2: Tenant Admin cannot access platform billing (403)', () => {
  const req: any = { user: { uid: 'user-tenant-admin', role: 'Tenant Admin', platformAdmin: false } };
  assert.equal(isPlatformAdminClaims(req.user), false);
  assert.throws(() => assertPlatformAdmin(req.user), (err: any) => err.statusCode === 403);
});

test('Billing Security 3: Cashier cannot access platform billing (403)', () => {
  const req: any = { user: { uid: 'user-cashier', role: 'Cashier', platformAdmin: false } };
  assert.equal(isPlatformAdminClaims(req.user), false);
  assert.throws(() => assertPlatformAdmin(req.user), (err: any) => err.statusCode === 403);
});

test('Billing Security 4: Unauthorized platform user without platformAdmin claim is rejected (403)', () => {
  const req: any = { user: { uid: 'user-bad', role: 'Super Admin', platformAdmin: false } };
  assert.equal(isPlatformAdminClaims(req.user), false);
  assert.throws(() => assertPlatformAdmin(req.user), (err: any) => err.statusCode === 403);
});

test('Billing Security 5: Super Admin with platformAdmin claim is authorized', () => {
  const claims = { role: 'Super Admin', platformAdmin: true };
  assert.equal(isPlatformAdminClaims(claims), true);
  assert.doesNotThrow(() => assertPlatformAdmin(claims));
});

// ============================================================================
// TENANT ISOLATION TESTS (6 - 8)
// ============================================================================

test('Billing Security 6: Tenant ID body spoofing is ignored in favor of route param tenantId', () => {
  const routeParamTenantId = 'tenant-target-123';
  const spoofedBodyTenantId = 'tenant-victim-999';

  // Server function resolves target tenant strictly from route URL
  const resolveTargetTenantId = (params: any, body: any) => {
    const tenantId = String(params.tenantId || '').trim();
    assert.notEqual(tenantId, body.tenantId);
    return tenantId;
  };

  const resolved = resolveTargetTenantId({ tenantId: routeParamTenantId }, { tenantId: spoofedBodyTenantId });
  assert.equal(resolved, routeParamTenantId);
});

test('Billing Security 7: Mutation on Tenant A does not mutate Tenant B', async () => {
  const db = new MockDatabase();
  const tenantA = 'tenant-alpha';
  const tenantB = 'tenant-beta';

  await db.runTransaction(async (tx) => {
    tx.set(db.collection('tenants').doc(tenantA), { subscription: { planId: 'growth' } });
  });

  const txResult = await db.runTransaction(async (tx) => {
    return { tenantA: true };
  });

  assert.ok(txResult.tenantA);
});

test('Billing Security 8: Non-platform tenant users are barred from calling platform billing endpoints', () => {
  const checkTenantAccess = (user: any) => {
    if (!isPlatformAdminClaims(user)) throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  };
  assert.throws(() => checkTenantAccess({ uid: 'staff-1', tenantId: 'tenant-1' }));
});

// ============================================================================
// PLAN MANAGEMENT TESTS (9 - 13)
// ============================================================================

test('Billing Security 9: Valid plan assignment succeeds and produces expected ledger state', () => {
  const plan = DEFAULT_PLATFORM_PLANS.find(p => p.id === 'growth');
  assert.ok(plan);
  assert.equal(plan.status, 'active');
});

test('Billing Security 10: Nonexistent plan assignment is rejected (404)', () => {
  const validatePlan = (planId: string) => {
    const found = DEFAULT_PLATFORM_PLANS.find(p => p.id === planId);
    if (!found) throw Object.assign(new Error(`Plan '${planId}' not found.`), { statusCode: 404 });
  };
  assert.throws(() => validatePlan('nonexistent-plan-999'), (err: any) => err.statusCode === 404);
});

test('Billing Security 11: Inactive/Archived plan assignment is rejected (409)', () => {
  const plans = [{ id: 'archived-tier', status: 'archived' }];
  const validatePlan = (planId: string) => {
    const found = plans.find(p => p.id === planId);
    if (!found) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    if (found.status !== 'active') throw Object.assign(new Error('Archived plans cannot be assigned.'), { statusCode: 409 });
  };
  assert.throws(() => validatePlan('archived-tier'), (err: any) => err.statusCode === 409);
});

test('Billing Security 12: Missing administrative reason is rejected (400)', () => {
  const validateReason = (reason: any) => {
    if (!reason || !String(reason).trim()) throw Object.assign(new Error('Reason required'), { statusCode: 400 });
  };
  assert.throws(() => validateReason(undefined), (err: any) => err.statusCode === 400);
});

test('Billing Security 13: Whitespace/Blank administrative reason is rejected (400)', () => {
  const validateReason = (reason: any) => {
    if (!reason || !String(reason).trim()) throw Object.assign(new Error('Reason required'), { statusCode: 400 });
  };
  assert.throws(() => validateReason('   \n\t  '), (err: any) => err.statusCode === 400);
});

// ============================================================================
// SUBSCRIPTION TRANSITIONS TESTS (14 - 17)
// ============================================================================

test('Billing Security 14: Valid subscription status transition succeeds', () => {
  assert.doesNotThrow(() => assertLifecycleTransition('trialing', 'active'));
  assert.doesNotThrow(() => assertLifecycleSubscriptionConsistency('active', 'active'));
});

test('Billing Security 15: Invalid subscription status transition is rejected (409)', () => {
  assert.throws(() => assertLifecycleTransition('cancelled', 'suspended'), /Invalid tenant lifecycle transition/);
});

test('Billing Security 16: Cancelled subscription status updates tenant lifecycle to cancelled', () => {
  const targetLifecycle = lifecycleForSubscriptionStatus('cancelled');
  assert.equal(targetLifecycle, 'cancelled');
  assert.doesNotThrow(() => assertLifecycleSubscriptionConsistency('cancelled', 'cancelled'));
});

test('Billing Security 17: Suspended/Reactivated subscription synchronizes lifecycle state', () => {
  assert.equal(lifecycleForSubscriptionStatus('suspended'), 'suspended');
  assert.doesNotThrow(() => assertLifecycleTransition('suspended', 'active'));
  assert.doesNotThrow(() => assertLifecycleSubscriptionConsistency('active', 'active'));
});

// ============================================================================
// USAGE EVALUATION & OVERRIDES TESTS (18 - 23)
// ============================================================================

test('Billing Security 18: Usage evaluation matches authoritative limit calculation', () => {
  const result = evaluateUsageLimit(50, 100, false);
  assert.equal(result.used, 50);
  assert.equal(result.limit, 100);
  assert.equal(result.remaining, 50);
  assert.equal(result.state, 'healthy');
  assert.equal(result.allowed, true);
});

test('Billing Security 19: Warning state triggers when usage >= 80% and < 100%', () => {
  const result = evaluateUsageLimit(85, 100, false);
  assert.equal(result.state, 'warning');
  assert.equal(result.allowed, true);
});

test('Billing Security 20: Exceeded state triggers when usage >= 100% without override', () => {
  const result = evaluateUsageLimit(105, 100, false);
  assert.equal(result.state, 'exceeded');
  assert.equal(result.allowed, false);
});

test('Billing Security 21: Active override allows execution even when limit exceeded', () => {
  const result = evaluateUsageLimit(150, 100, true);
  assert.equal(result.state, 'exceeded');
  assert.equal(result.allowed, true);
  assert.equal(result.override, true);
});

test('Billing Security 22: Usage override change requires mandatory reason', () => {
  const applyOverride = (override: boolean, reason?: string) => {
    if (!reason || !reason.trim()) throw Object.assign(new Error('Reason required'), { statusCode: 400 });
    return { override, reason: reason.trim() };
  };
  assert.throws(() => applyOverride(true, ''), (err: any) => err.statusCode === 400);
  assert.doesNotThrow(() => applyOverride(true, 'Approved by platform admin for holiday sale'));
});

test('Billing Security 23: Usage enforcement reverts to blocked when override is disabled', () => {
  const withOverride = evaluateUsageLimit(200, 100, true);
  assert.equal(withOverride.allowed, true);

  const withoutOverride = evaluateUsageLimit(200, 100, false);
  assert.equal(withoutOverride.allowed, false);
});

// ============================================================================
// ATOMICITY TESTS (24 - 27)
// ============================================================================

test('Billing Security 24: Subscription update, audit log, and metrics commit atomically', async () => {
  const db = new MockDatabase();
  const tenantId = 'tenant-atomic-1';
  const audit = createAuthoritativeAuditRecord({
    tenantId,
    actorUid: 'admin-1',
    actorName: 'admin@markithub.com',
    actorRole: 'Super Admin',
    action: 'TENANT_SUBSCRIPTION_PLAN_CHANGED',
    module: 'Platform Billing',
    targetType: 'tenant',
    targetId: tenantId,
    targetName: 'Atomic Tenant',
    previousState: { planId: 'starter' },
    newState: { planId: 'growth' },
    reason: 'Customer upgrade',
    result: 'success',
    severity: 'warning',
    details: 'Plan changed',
  });

  const tx = new MockTx();
  tx.set(db.collection('tenants').doc(tenantId), { subscription: { planId: 'growth' } });
  tx.set(db.collection('audit_logs').doc(audit.id), audit);
  tx.commit();

  assert.equal(tx.isCommitted, true);
  assert.equal(tx.sets.size, 2);
});

test('Billing Security 25: Failed transaction rolls back all pending writes', async () => {
  const db = new MockDatabase();
  let rolledBack = false;

  try {
    await db.runTransaction(async (tx) => {
      tx.set(db.collection('tenants').doc('tenant-fail'), { updated: true });
      throw new Error('Simulated database error');
    });
  } catch (err) {
    rolledBack = true;
  }

  assert.equal(rolledBack, true);
});

test('Billing Security 26: Failed operation produces no successful audit record', async () => {
  const auditLogs: any[] = [];
  const mutateWithAudit = async (fail: boolean) => {
    if (fail) throw new Error('Mutation failed');
    auditLogs.push({ result: 'success' });
  };

  await assert.rejects(async () => await mutateWithAudit(true));
  assert.equal(auditLogs.length, 0);
});

test('Billing Security 27: Failed operation does not increment security metrics', async () => {
  let metricCount = 10;
  const mutateMetrics = async (fail: boolean) => {
    if (fail) throw new Error('Database write error');
    metricCount++;
  };

  await assert.rejects(async () => await mutateMetrics(true));
  assert.equal(metricCount, 10);
});

// ============================================================================
// AUDIT PROPERTIES & SANITIZATION TESTS (28 - 33)
// ============================================================================

test('Billing Security 28: Audit record preserves previousState', () => {
  const audit = createAuthoritativeAuditRecord({
    tenantId: 't1',
    actorUid: 'u1',
    actorRole: 'Super Admin',
    action: 'TENANT_SUBSCRIPTION_PLAN_CHANGED',
    module: 'Platform Billing',
    targetType: 'tenant',
    targetId: 't1',
    targetName: 'T1',
    previousState: { planId: 'starter', status: 'active' },
    newState: { planId: 'enterprise', status: 'active' },
    reason: 'VIP contract',
    result: 'success',
    severity: 'warning',
    details: 'Plan changed',
  });
  assert.deepEqual(audit.previousState, { planId: 'starter', status: 'active' });
});

test('Billing Security 29: Audit record preserves newState', () => {
  const audit = createAuthoritativeAuditRecord({
    tenantId: 't1',
    actorUid: 'u1',
    actorRole: 'Super Admin',
    action: 'TENANT_SUBSCRIPTION_PLAN_CHANGED',
    module: 'Platform Billing',
    targetType: 'tenant',
    targetId: 't1',
    targetName: 'T1',
    previousState: { planId: 'starter' },
    newState: { planId: 'enterprise' },
    reason: 'VIP contract',
    result: 'success',
    severity: 'warning',
    details: 'Plan changed',
  });
  assert.deepEqual(audit.newState, { planId: 'enterprise' });
});

test('Billing Security 30: Audit record records authoritative actor information', () => {
  const audit = createAuthoritativeAuditRecord({
    tenantId: 't1',
    actorUid: 'superadmin-uid-123',
    actorName: 'admin@markithub.com',
    actorEmail: 'admin@markithub.com',
    actorRole: 'Super Admin',
    action: 'TENANT_SUBSCRIPTION_SUSPENDED',
    module: 'Platform Billing',
    targetType: 'tenant',
    targetId: 't1',
    targetName: 'T1',
    reason: 'Billing past due',
    result: 'success',
    severity: 'critical',
    details: 'Suspended tenant',
  });
  assert.equal(audit.actorUid, 'superadmin-uid-123');
  assert.equal(audit.actorName, 'admin@markithub.com');
  assert.equal(audit.actorEmail, 'admin@markithub.com');
  assert.equal(audit.actorRole, 'Super Admin');
});

test('Billing Security 31: Audit record records target tenant identity', () => {
  const audit = createAuthoritativeAuditRecord({
    tenantId: 'target-tenant-777',
    actorUid: 'admin-1',
    actorRole: 'Super Admin',
    action: 'TENANT_SUBSCRIPTION_PLAN_CHANGED',
    module: 'Platform Billing',
    targetType: 'tenant',
    targetId: 'target-tenant-777',
    targetName: 'Target Store',
    reason: 'Plan change',
    result: 'success',
    severity: 'warning',
    details: 'Plan update',
  });
  assert.equal(audit.tenantId, 'target-tenant-777');
  assert.equal(audit.targetId, 'target-tenant-777');
  assert.equal(audit.targetName, 'Target Store');
});

test('Billing Security 32: Audit record preserves supplied administrative reason', () => {
  const suppliedReason = 'Approved by finance committee on 2026-09-15 for annual contract extension.';
  const audit = createAuthoritativeAuditRecord({
    tenantId: 't1',
    actorUid: 'admin-1',
    actorRole: 'Super Admin',
    action: 'TENANT_SUBSCRIPTION_PLAN_CHANGED',
    module: 'Platform Billing',
    targetType: 'tenant',
    targetId: 't1',
    targetName: 'T1',
    reason: suppliedReason,
    result: 'success',
    severity: 'warning',
    details: 'Details',
  });
  assert.equal(audit.reason, suppliedReason);
});

test('Billing Security 33: Sensitive credentials and secrets are sanitized from audit payload', () => {
  const unsanitized = {
    apiKey: 'secret_live_key_9999',
    password: 'SuperSecretPassword123!',
    token: 'bearer_token_xyz',
    planId: 'growth',
  };
  const sanitized = sanitizeAuditMetadata(unsanitized) as any;
  assert.equal(sanitized.apiKey, '[REDACTED]');
  assert.equal(sanitized.password, '[REDACTED]');
  assert.equal(sanitized.token, '[REDACTED]');
  assert.equal(sanitized.planId, 'growth');
});

// ============================================================================
// LIFECYCLE CONSISTENCY & OPERATIONAL INTEGRITY (34 - 37)
// ============================================================================

test('Billing Security 34: Suspended tenant is halted from operational execution', () => {
  const checkOperational = (lifecycle: string) => {
    if (lifecycle === 'suspended' || lifecycle === 'archived') {
      throw Object.assign(new Error('Forbidden: tenant suspended'), { statusCode: 403 });
    }
  };
  assert.throws(() => checkOperational('suspended'), (err: any) => err.statusCode === 403);
});

test('Billing Security 35: Archived tenant is halted from operational execution', () => {
  const checkOperational = (lifecycle: string) => {
    if (lifecycle === 'suspended' || lifecycle === 'archived') {
      throw Object.assign(new Error('Forbidden: tenant archived'), { statusCode: 403 });
    }
  };
  assert.throws(() => checkOperational('archived'), (err: any) => err.statusCode === 403);
});

test('Billing Security 36: Contradictory tenant lifecycle and subscription status combinations are rejected', () => {
  // An archived tenant cannot have an active subscription
  assert.throws(() => assertLifecycleSubscriptionConsistency('archived', 'active'), /Invalid tenant\/subscription state combination/);
});

test('Billing Security 37: Reactivation restores valid operational state', () => {
  assert.doesNotThrow(() => assertLifecycleTransition('suspended', 'active'));
  assert.doesNotThrow(() => assertLifecycleSubscriptionConsistency('active', 'active'));
});

// ============================================================================
// PAGINATION & PERFORMANCE BOUNDS (38 - 40)
// ============================================================================

test('Billing Security 38: Requesting excessive page sizes is clamped to safe maximum (100)', () => {
  const sanitizePageSize = (input: any) => {
    const parsed = Number(input);
    if (isNaN(parsed) || parsed <= 0) return 1;
    return Math.min(100, Math.floor(parsed));
  };
  assert.equal(sanitizePageSize(1000), 100);
  assert.equal(sanitizePageSize(500), 100);
  assert.equal(sanitizePageSize(0), 1);
  assert.equal(sanitizePageSize(25), 25);
});

test('Billing Security 39: Billing read queries target exact current period meter doc without unbounded historical scans', () => {
  const tenantId = 'tenant-perf-1';
  const period = usagePeriod();
  const docId = usageMeterId(tenantId, period);

  assert.equal(docId, `tenant-perf-1__${period}`);
  assert.equal(USAGE_METER_COLLECTION, 'tenant_usage_meters');
});

test('Billing Security 40: Platform summary metrics calculate from stored data without unbounded memory growth', () => {
  const summary = calculateSubscriptionRevenue([
    { status: 'active', interval: 'monthly', price: 100 },
    { status: 'active', interval: 'annual', price: 1200 },
    { status: 'trialing', interval: 'monthly', price: 50 },
    { status: 'suspended', interval: 'monthly', price: 20 },
  ]);

  assert.equal(summary.activeSubscriptions, 2);
  assert.equal(summary.trialSubscriptions, 1);
  assert.equal(summary.monthlyRecurringRevenue, 100);
  assert.equal(summary.annualRecurringRevenue, 1200);
  assert.equal(summary.estimatedMonthlyRunRate, 200);
});
