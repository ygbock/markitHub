import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTenantProvisioningRecords,
  hashProvisioningIdempotencyKey,
  validateTenantProvisioningRequest,
} from './tenantProvisioning';

const business = {
  id: 'biz-1',
  ownerUid: 'uid-owner',
  tradingName: 'Apex Supermarket',
  status: 'active',
  tenantIds: [],
};

const location = {
  id: 'loc-1',
  businessId: 'biz-1',
  name: 'Main Branch',
  addressLine1: '1 Main Street',
  city: 'Freetown',
  country: 'Sierra Leone',
  phone: '+232 76 000 000',
  isActive: true,
};

const plan = {
  id: 'growth',
  name: 'Growth',
  status: 'active' as const,
  monthlyPrice: 79,
  annualPrice: 790,
  currency: 'USD',
  includedSeats: 10,
};

test('Phase 5 Invariant 1: provisioning requires business, location, plan, and idempotency key', () => {
  assert.throws(() => validateTenantProvisioningRequest({}), /businessId is required/);
  assert.throws(() => validateTenantProvisioningRequest({ businessId: 'biz-1' }), /locationId is required/);
  assert.throws(() => validateTenantProvisioningRequest({ businessId: 'biz-1', locationId: 'loc-1' }), /planId is required/);
  assert.throws(() => validateTenantProvisioningRequest({ businessId: 'biz-1', locationId: 'loc-1', planId: 'growth' }), /Idempotency-Key is required/);
});

test('Phase 5 Invariant 2: provisioning validates bounded trial duration', () => {
  assert.throws(() => validateTenantProvisioningRequest({ businessId: 'biz-1', locationId: 'loc-1', planId: 'growth', idempotencyKey: 'k', trialDays: -1 }), /between 0 and 90/);
  assert.throws(() => validateTenantProvisioningRequest({ businessId: 'biz-1', locationId: 'loc-1', planId: 'growth', idempotencyKey: 'k', trialDays: 91 }), /between 0 and 90/);
  assert.equal(validateTenantProvisioningRequest({ businessId: 'biz-1', locationId: 'loc-1', planId: 'growth', idempotencyKey: 'k', trialDays: 14 }).trialDays, 14);
});

test('Phase 5 Invariant 3: idempotency keys are hashed before persistence', () => {
  const a = hashProvisioningIdempotencyKey('same-request');
  const b = hashProvisioningIdempotencyKey('same-request');
  assert.equal(a, b);
  assert.equal(a.length, 64);
  assert.throws(() => hashProvisioningIdempotencyKey(''), /Idempotency-Key is required/);
});

test('Phase 5 Invariant 4: tenant identity remains bound to the canonical business and branch', () => {
  const records = buildTenantProvisioningRecords({ request: validateTenantProvisioningRequest({ businessId: 'biz-1', locationId: 'loc-1', planId: 'growth', idempotencyKey: 'k' }), business, location, plan, ownerUid: 'uid-owner', tenantId: 'tenant-fixed', now: '2026-09-18T00:00:00.000Z' });
  assert.equal(records.tenant.businessId, 'biz-1');
  assert.equal(records.tenant.locationId, 'loc-1');
  assert.equal(records.tenant.ownerUid, 'uid-owner');
  assert.equal(records.tenant.id, 'tenant-fixed');
  assert.equal(records.tenant.status, 'active');
});

test('Phase 5 Invariant 5: tenant provisioning creates an owner membership and links the business', () => {
  const records = buildTenantProvisioningRecords({ request: validateTenantProvisioningRequest({ businessId: 'biz-1', locationId: 'loc-1', planId: 'growth', idempotencyKey: 'k' }), business, location, plan, ownerUid: 'uid-owner', tenantId: 'tenant-fixed' });
  assert.deepEqual(records.membership, {
    uid: 'uid-owner',
    tenantId: 'tenant-fixed',
    role: 'Business Owner',
    status: 'active',
    createdAt: records.tenant.createdAt,
    updatedAt: records.tenant.createdAt,
  });
  assert.deepEqual(records.businessPatch.tenantIds, ['tenant-fixed']);
  assert.equal(records.locationPatch.tenantId, 'tenant-fixed');
});

test('Phase 5 Invariant 6: trial and billing state are consistent', () => {
  const trial = buildTenantProvisioningRecords({ request: validateTenantProvisioningRequest({ businessId: 'biz-1', locationId: 'loc-1', planId: 'growth', idempotencyKey: 'k', trialDays: 14 }), business, location, plan, ownerUid: 'uid-owner', tenantId: 'tenant-trial', now: '2026-09-18T00:00:00.000Z' });
  assert.equal(trial.tenant.lifecycleStatus, 'trialing');
  assert.equal(trial.subscription.status, 'trialing');
  assert.equal(trial.subscription.price, 79);
  assert.ok(trial.subscription.trialEndsAt);

  const annual = buildTenantProvisioningRecords({ request: validateTenantProvisioningRequest({ businessId: 'biz-1', locationId: 'loc-1', planId: 'growth', idempotencyKey: 'annual', billingInterval: 'annual', trialDays: 0 }), business, location, plan, ownerUid: 'uid-owner', tenantId: 'tenant-annual' });
  assert.equal(annual.tenant.lifecycleStatus, 'active');
  assert.equal(annual.subscription.status, 'active');
  assert.equal(annual.subscription.price, 790);
});

test('Phase 5 Invariant 7: generated tenant slugs are bounded and collision-resistant', () => {
  const records = buildTenantProvisioningRecords({ request: validateTenantProvisioningRequest({ businessId: 'biz-1', locationId: 'loc-1', planId: 'growth', idempotencyKey: 'k' }), business, location, plan, ownerUid: 'uid-owner', tenantId: 'tenant_1234567890' });
  assert.match(records.tenant.slug, /^apex-supermarket-/);
  assert.ok(records.tenant.slug.length <= 49);
});

test('Phase 5 Invariant 8: provisioning capabilities are tenant modules, not permissions', () => {
  const records = buildTenantProvisioningRecords({ request: validateTenantProvisioningRequest({ businessId: 'biz-1', locationId: 'loc-1', planId: 'growth', idempotencyKey: 'k' }), business, location, plan, ownerUid: 'uid-owner' });
  assert.ok(records.tenant.capabilities.includes('storefront'));
  assert.ok(records.tenant.capabilities.includes('inventory'));
  assert.ok(!records.tenant.capabilities.includes('inventory.view'));
});

test('Phase 5 Invariant 9: provisioning records contain no credential fields', () => {
  const records = buildTenantProvisioningRecords({ request: validateTenantProvisioningRequest({ businessId: 'biz-1', locationId: 'loc-1', planId: 'growth', idempotencyKey: 'k' }), business, location, plan, ownerUid: 'uid-owner' });
  const serialized = JSON.stringify(records);
  assert.doesNotMatch(serialized, /password|secret|token|privateKey|accessToken/i);
});

test('Phase 5 Invariant 10: business tenant activation is additive for multi-location businesses', () => {
  const multi = { ...business, tenantIds: ['tenant-existing'] };
  const records = buildTenantProvisioningRecords({ request: validateTenantProvisioningRequest({ businessId: 'biz-1', locationId: 'loc-2', planId: 'growth', idempotencyKey: 'k' }), business: multi, location: { ...location, id: 'loc-2' }, plan, ownerUid: 'uid-owner', tenantId: 'tenant-new' });
  assert.deepEqual(records.businessPatch.tenantIds, ['tenant-existing', 'tenant-new']);
  assert.equal(records.tenant.isPrimaryBranch, false);
});
