import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PLATFORM_PLANS,
  assertLifecycleTransition,
  calculateSubscriptionRevenue,
  makeTenantSlug,
  normalizePlanInput,
  usageFromCounts,
} from './platformAdminControlPlane';

test('default platform plans cover starter, growth, and enterprise', () => {
  assert.deepEqual(DEFAULT_PLATFORM_PLANS.map(plan => plan.id), ['starter', 'growth', 'enterprise']);
});

test('plan normalization clamps unsafe numeric values and normalizes identity', () => {
  const plan = normalizePlanInput({
    id: ' Growth Plan ',
    name: 'Growth Plus',
    monthlyPrice: -10,
    annualPrice: -5,
    includedSeats: 0,
    limits: { products: 0, ordersMonthly: 0, storageGb: 0 },
    currency: 'usd',
  });
  assert.equal(plan.id, 'growth-plan');
  assert.equal(plan.monthlyPrice, 0);
  assert.equal(plan.annualPrice, 0);
  assert.equal(plan.includedSeats, 1);
  assert.equal(plan.currency, 'USD');
  assert.equal(plan.limits.products, 1);
  assert.equal(plan.limits.ordersMonthly, 1);
  assert.equal(plan.limits.storageGb, 1);
});

test('lifecycle transition matrix permits activation and suspension paths', () => {
  assert.doesNotThrow(() => assertLifecycleTransition('trialing', 'active'));
  assert.doesNotThrow(() => assertLifecycleTransition('active', 'suspended'));
  assert.doesNotThrow(() => assertLifecycleTransition('suspended', 'active'));
  assert.doesNotThrow(() => assertLifecycleTransition('active', 'cancelled'));
});

test('lifecycle transition matrix rejects invalid transitions', () => {
  assert.throws(() => assertLifecycleTransition('provisioning', 'suspended'), /Invalid tenant lifecycle transition/);
  assert.throws(() => assertLifecycleTransition('cancelled', 'suspended'), /Invalid tenant lifecycle transition/);
  assert.throws(() => assertLifecycleTransition('active', 'active'), /already active/);
});

test('tenant slug generation is deterministic and bounded', () => {
  assert.equal(makeTenantSlug('Nexus Retail & Commerce', 'a1b2c3'), 'nexus-retail-commerce-a1b2c3');
  assert.match(makeTenantSlug('!!!', 'xyz'), /^tenant-xyz$/);
  assert.ok(makeTenantSlug('A'.repeat(200)).length <= 48);
});

test('subscription revenue separates monthly and annual contracts', () => {
  const summary = calculateSubscriptionRevenue([
    { status: 'active', interval: 'monthly', price: 29 },
    { status: 'active', interval: 'annual', price: 1200 },
    { status: 'trialing', interval: 'monthly', price: 99 },
    { status: 'past_due', interval: 'monthly', price: 79 },
    { status: 'suspended', interval: 'monthly', price: 59 },
    { status: 'cancelled', interval: 'monthly', price: 100 },
  ]);
  assert.equal(summary.activeSubscriptions, 2);
  assert.equal(summary.trialSubscriptions, 1);
  assert.equal(summary.pastDueSubscriptions, 1);
  assert.equal(summary.suspendedSubscriptions, 1);
  assert.equal(summary.monthlyRecurringRevenue, 29);
  assert.equal(summary.annualRecurringRevenue, 1200);
  assert.equal(summary.estimatedMonthlyRunRate, 129);
});

test('usage snapshot sanitizes negative and fractional counts', () => {
  const usage = usageFromCounts({ staff: -2, products: 2.9, orders: 10.8, auditEvents: undefined });
  assert.deepEqual(usage, { staff: 0, products: 2, orders: 10, auditEvents: 0, measuredAt: usage.measuredAt });
});

test('plan update preserves immutable creation timestamp', () => {
  const existing = normalizePlanInput({ id: 'growth', name: 'Growth', monthlyPrice: 79, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' });
  const updated = normalizePlanInput({ name: 'Growth Pro', monthlyPrice: 99 }, existing);
  assert.equal(updated.id, 'growth');
  assert.equal(updated.createdAt, '2026-01-01T00:00:00.000Z');
  assert.notEqual(updated.updatedAt, existing.updatedAt);
});

test('archived plans remain representable but are not active defaults', () => {
  const plan = normalizePlanInput({ id: 'legacy', name: 'Legacy', status: 'archived' });
  assert.equal(plan.status, 'archived');
});

test('empty plan name is rejected', () => {
  assert.throws(() => normalizePlanInput({ id: 'bad', name: '   ' }), /Plan name is required/);
});
