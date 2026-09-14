import assert from 'node:assert/strict';
import test from 'node:test';
import {
  usagePeriod,
  usageMeterId,
  usageEventId,
  normalizeUsageQuantity,
  calculateUsagePercent,
  usageLimitState,
  buildUsageMeterPatch,
} from './platformUsageMeter';

test('Platform usage metering: periods are UTC calendar months', () => {
  assert.equal(usagePeriod(new Date('2026-09-14T23:59:59.000Z')), '2026-09');
  assert.equal(usagePeriod(new Date('2026-10-01T00:00:00.000Z')), '2026-10');
});

test('Platform usage metering: meter IDs isolate tenant and month', () => {
  assert.equal(usageMeterId('tenant-alpha', '2026-09'), 'tenant-alpha__2026-09');
  assert.notEqual(usageMeterId('tenant-alpha', '2026-09'), usageMeterId('tenant-beta', '2026-09'));
  assert.notEqual(usageMeterId('tenant-alpha', '2026-09'), usageMeterId('tenant-alpha', '2026-10'));
});

test('Platform usage metering: event IDs are deterministic and source-scoped', () => {
  const a = usageEventId({ tenantId: 'tenant-alpha', metric: 'ordersMonthly', sourceId: 'session-123' });
  const b = usageEventId({ tenantId: 'tenant-alpha', metric: 'ordersMonthly', sourceId: 'session-123' });
  const c = usageEventId({ tenantId: 'tenant-alpha', metric: 'ordersMonthly', sourceId: 'session-124' });
  const d = usageEventId({ tenantId: 'tenant-beta', metric: 'ordersMonthly', sourceId: 'session-123' });
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.notEqual(a, d);
});

test('Platform usage metering: quantities reject invalid, negative, fractional, and non-finite values', () => {
  assert.equal(normalizeUsageQuantity(3.9), 3);
  assert.equal(normalizeUsageQuantity(0), 0);
  assert.equal(normalizeUsageQuantity(-2), 0);
  assert.equal(normalizeUsageQuantity('bad'), 0);
  assert.equal(normalizeUsageQuantity(Infinity), 0);
});

test('Platform usage metering: plan utilization is bounded and has 80% warning threshold', () => {
  assert.equal(calculateUsagePercent(0, 100), 0);
  assert.equal(calculateUsagePercent(80, 100), 80);
  assert.equal(calculateUsagePercent(120, 100), 100);
  assert.equal(calculateUsagePercent(100, 0), 0);
  assert.equal(usageLimitState(79, 100), 'healthy');
  assert.equal(usageLimitState(80, 100), 'warning');
  assert.equal(usageLimitState(100, 100), 'exceeded');
});

test('Platform usage metering: zero quantity cannot create a meter patch', () => {
  assert.equal(buildUsageMeterPatch('ordersMonthly', 0), null);
  assert.equal(buildUsageMeterPatch('ordersMonthly', -1), null);
});
