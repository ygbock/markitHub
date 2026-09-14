import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateUsageLimit,
  calculateUsagePercent,
  usageLimitState,
  usageMeterId,
  usagePeriod,
  usageEventId,
} from './platformUsageMeter';
import { DEFAULT_PLATFORM_PLANS } from './platformAdminControlPlane';

test('Platform usage enforcement: Starter plan monthly order limit evaluated correctly', () => {
  const starterPlan = DEFAULT_PLATFORM_PLANS.find(p => p.id === 'starter')!;
  const limit = starterPlan.limits.ordersMonthly; // e.g., 1000

  // Below limit -> Allowed
  const under = evaluateUsageLimit(500, limit, false);
  assert.equal(under.allowed, true);
  assert.equal(under.state, 'healthy');
  assert.equal(under.remaining, limit - 500);

  // Warning threshold (80%+) -> Allowed with warning state
  const warn = evaluateUsageLimit(limit * 0.85, limit, false);
  assert.equal(warn.allowed, true);
  assert.equal(warn.state, 'warning');

  // At limit -> Denied
  const atLimit = evaluateUsageLimit(limit, limit, false);
  assert.equal(atLimit.allowed, false);
  assert.equal(atLimit.state, 'exceeded');
  assert.equal(atLimit.remaining, 0);

  // Exceeded limit -> Denied
  const exceeded = evaluateUsageLimit(limit + 50, limit, false);
  assert.equal(exceeded.allowed, false);
  assert.equal(exceeded.state, 'exceeded');
  assert.equal(exceeded.remaining, 0);

  // Exceeded limit with Super Admin Override -> Allowed
  const overridden = evaluateUsageLimit(limit + 50, limit, true);
  assert.equal(overridden.allowed, true);
  assert.equal(overridden.override, true);
});

test('Platform usage enforcement: Unlimited plan (limit = 0) permits unbounded orders', () => {
  const decision = evaluateUsageLimit(100000, 0, false);
  assert.equal(decision.allowed, true);
  assert.equal(decision.remaining, 0);
});

test('Platform usage enforcement: Sanitizes invalid numeric input gracefully', () => {
  const decision = evaluateUsageLimit('invalid', 'invalid', false);
  assert.equal(decision.allowed, true); // limit 0 => unlimited
  assert.equal(decision.used, 0);
  assert.equal(decision.limit, 0);
});

test('Platform usage enforcement: Tenant meter IDs isolate period and tenant ID', () => {
  const period = usagePeriod(new Date('2026-09-14T00:00:00Z'));
  assert.equal(period, '2026-09');
  assert.equal(usageMeterId('tenant-xyz', period), 'tenant-xyz__2026-09');
});

test('Platform usage enforcement: Usage event IDs are deterministic for idempotency', () => {
  const id1 = usageEventId({ tenantId: 'tenant-1', metric: 'ordersMonthly', sourceId: 'ORD-1001' });
  const id2 = usageEventId({ tenantId: 'tenant-1', metric: 'ordersMonthly', sourceId: 'ORD-1001' });
  assert.equal(id1, id2);
});
