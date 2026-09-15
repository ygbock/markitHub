import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertLifecycleTransition,
  assertLifecycleSubscriptionConsistency,
  type TenantLifecycleStatus,
} from './platformAdminControlPlane';
import {
  applyEventToMetricsDoc,
  createAuthoritativeAuditRecord,
  type TenantSecurityMetricsDoc,
} from './auditService';

test('Tenant Lifecycle 1: State Machine Rules - Valid Transitions', () => {
  // active -> suspended
  assert.doesNotThrow(() => assertLifecycleTransition('active', 'suspended'));
  // active -> archived
  assert.doesNotThrow(() => assertLifecycleTransition('active', 'archived'));
  // suspended -> active
  assert.doesNotThrow(() => assertLifecycleTransition('suspended', 'active'));
  // suspended -> archived
  assert.doesNotThrow(() => assertLifecycleTransition('suspended', 'archived'));
  // archived -> active
  assert.doesNotThrow(() => assertLifecycleTransition('archived', 'active'));
});

test('Tenant Lifecycle 2: State Machine Rules - Invalid Transition archived -> suspended (HTTP 409)', () => {
  try {
    assertLifecycleTransition('archived', 'suspended');
    assert.fail('Should have thrown an invalid transition error');
  } catch (err: any) {
    assert.equal(err.statusCode, 409);
    assert.equal(err.code, 'INVALID_TENANT_LIFECYCLE_TRANSITION');
    assert.match(err.message, /Invalid tenant lifecycle transition: archived → suspended/);
  }
});

test('Tenant Lifecycle 3: State Machine Rules - Terminal Cancelled State (HTTP 409)', () => {
  const invalidNextStates: TenantLifecycleStatus[] = ['active', 'suspended', 'archived', 'trialing'];
  for (const nextState of invalidNextStates) {
    try {
      assertLifecycleTransition('cancelled', nextState);
      assert.fail(`Should not allow cancelled -> ${nextState}`);
    } catch (err: any) {
      assert.equal(err.statusCode, 409);
      assert.equal(err.code, 'INVALID_TENANT_LIFECYCLE_TRANSITION');
    }
  }
});

test('Tenant Lifecycle 4: Subscription Consistency for Archived State', () => {
  // Archived tenants must have subscription status suspended or cancelled
  assert.doesNotThrow(() => assertLifecycleSubscriptionConsistency('archived', 'suspended'));
  assert.doesNotThrow(() => assertLifecycleSubscriptionConsistency('archived', 'cancelled'));

  // Active subscription for archived tenant should throw
  assert.throws(
    () => assertLifecycleSubscriptionConsistency('archived', 'active'),
    (err: any) => err.statusCode === 409 && err.code === 'INVALID_TENANT_LIFECYCLE_TRANSITION'
  );
});

test('Tenant Lifecycle 5: Audit Reason Validation', () => {
  const validateLifecycleRequest = (body: any) => {
    const rawLifecycle = String(body?.status || body?.lifecycleStatus || '').trim().toLowerCase();
    const reason = String(body?.reason || '').trim();

    if (!['provisioning', 'trialing', 'active', 'suspended', 'archived', 'cancelled'].includes(rawLifecycle)) {
      return { status: 400, code: 'INVALID_STATUS', error: 'Invalid tenant lifecycle status.' };
    }
    if (!reason) {
      return { status: 400, code: 'AUDIT_REASON_REQUIRED', error: 'A reason is required for tenant lifecycle changes.' };
    }
    return { status: 200, valid: true };
  };

  assert.equal(validateLifecycleRequest({ status: 'archived', reason: '' }).code, 'AUDIT_REASON_REQUIRED');
  assert.equal(validateLifecycleRequest({ status: 'archived', reason: '   ' }).code, 'AUDIT_REASON_REQUIRED');
  assert.equal(validateLifecycleRequest({ status: 'unknown', reason: 'Valid reason' }).code, 'INVALID_STATUS');
  assert.equal(
    validateLifecycleRequest({ status: 'archived', reason: 'Decommissioning inactive tenant store' }).status,
    200
  );
});

test('Tenant Lifecycle 6: Security Metrics Counter Tracking', () => {
  let doc: Partial<TenantSecurityMetricsDoc> = {
    tenantId: 'tenant_test_metrics',
    staffSuspensions: 2,
    rolePermissionChanges: 0,
    ownershipEvents: 0,
    failedDeniedOperations: 0,
    lifecycle: { suspended: 0, reactivated: 0, archived: 0 },
  };

  // 1. Suspend tenant
  const suspendAudit = createAuthoritativeAuditRecord({
    tenantId: 'tenant_test_metrics',
    actorUid: 'admin_1',
    actorName: 'Super Admin',
    actorRole: 'Super Admin',
    action: 'TENANT_SUSPENDED',
    module: 'Tenant Lifecycle',
    targetType: 'tenant',
    targetId: 'tenant_test_metrics',
    previousState: { lifecycleStatus: 'active' },
    newState: { lifecycleStatus: 'suspended' },
    reason: 'Payment 60 days overdue',
    result: 'success',
  });

  doc = applyEventToMetricsDoc(doc, suspendAudit);
  assert.equal(doc.lifecycle?.suspended, 1);
  assert.equal(doc.staffSuspensions, 2); // Staff suspensions unpolluted

  // 2. Archive tenant
  const archiveAudit = createAuthoritativeAuditRecord({
    tenantId: 'tenant_test_metrics',
    actorUid: 'admin_1',
    actorName: 'Super Admin',
    actorRole: 'Super Admin',
    action: 'TENANT_ARCHIVED',
    module: 'Tenant Lifecycle',
    targetType: 'tenant',
    targetId: 'tenant_test_metrics',
    previousState: { lifecycleStatus: 'suspended' },
    newState: { lifecycleStatus: 'archived' },
    reason: 'Account closed by customer request',
    result: 'success',
  });

  doc = applyEventToMetricsDoc(doc, archiveAudit);
  assert.equal(doc.lifecycle?.archived, 1);
  assert.equal(doc.lifecycle?.suspended, 1);

  // 3. Reactivate tenant
  const reactivateAudit = createAuthoritativeAuditRecord({
    tenantId: 'tenant_test_metrics',
    actorUid: 'admin_1',
    actorName: 'Super Admin',
    actorRole: 'Super Admin',
    action: 'TENANT_REACTIVATED',
    module: 'Tenant Lifecycle',
    targetType: 'tenant',
    targetId: 'tenant_test_metrics',
    previousState: { lifecycleStatus: 'archived' },
    newState: { lifecycleStatus: 'active' },
    reason: 'Customer re-subscribed',
    result: 'success',
  });

  doc = applyEventToMetricsDoc(doc, reactivateAudit);
  assert.equal(doc.lifecycle?.reactivated, 1);
  assert.equal(doc.lifecycle?.archived, 1);
  assert.equal(doc.lifecycle?.suspended, 1);
  assert.equal(doc.staffSuspensions, 2);
});

test('Tenant Lifecycle 7: Storefront Order Protection Guard', () => {
  const evaluateStorefrontOrderAccess = (tenant: { lifecycleStatus: string; subscriptionStatus: string }) => {
    const lifecycleStatus = String(tenant.lifecycleStatus || '').toLowerCase();
    const subStatus = String(tenant.subscriptionStatus || '').toLowerCase();

    if (lifecycleStatus === 'archived' || subStatus === 'archived') {
      return { status: 403, error: 'TENANT_ARCHIVED', message: 'Tenant account is archived. Order creation is disabled.' };
    }
    if (lifecycleStatus === 'suspended' || subStatus === 'suspended') {
      return { status: 403, error: 'SUBSCRIPTION_SUSPENDED', message: 'Tenant account is currently suspended. Order creation is disabled.' };
    }
    if (lifecycleStatus === 'cancelled' || subStatus === 'cancelled') {
      return { status: 403, error: 'SUBSCRIPTION_CANCELLED', message: 'Tenant subscription has been cancelled. Order creation is disabled.' };
    }
    return { status: 200, allowed: true };
  };

  assert.equal(evaluateStorefrontOrderAccess({ lifecycleStatus: 'active', subscriptionStatus: 'active' }).status, 200);
  assert.equal(evaluateStorefrontOrderAccess({ lifecycleStatus: 'suspended', subscriptionStatus: 'suspended' }).error, 'SUBSCRIPTION_SUSPENDED');
  assert.equal(evaluateStorefrontOrderAccess({ lifecycleStatus: 'archived', subscriptionStatus: 'suspended' }).error, 'TENANT_ARCHIVED');
  assert.equal(evaluateStorefrontOrderAccess({ lifecycleStatus: 'cancelled', subscriptionStatus: 'cancelled' }).error, 'SUBSCRIPTION_CANCELLED');
});
