import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBusinessRegistrationRecords,
  hashBusinessRegistrationKey,
  validateBusinessRegistrationRequest,
} from './businessRegistration';

const input = {
  businessName: 'Apex Supermarket',
  category: 'groceries',
  tagline: 'Fresh food every day',
  about: 'Local grocery store',
  address: '1 Main Street',
  city: 'Freetown',
  phone: '+232 76 000 000',
  email: 'hello@apex.sl',
  openingHours: 'Mon - Sat: 8:30 AM - 6:30 PM',
  businessMode: 'listing_and_store' as const,
  idempotencyKey: 'registration-1',
};

test('Phase 5 Registration 1: required business registration fields fail closed', () => {
  assert.throws(() => validateBusinessRegistrationRequest({}), /Business name is required/);
  assert.throws(() => validateBusinessRegistrationRequest({ businessName: 'Apex' }), /Business category is required/);
  assert.throws(() => validateBusinessRegistrationRequest({ businessName: 'Apex', category: 'groceries' }), /Business address is required/);
  assert.throws(() => validateBusinessRegistrationRequest({ businessName: 'Apex', category: 'groceries', address: '1 Main' }), /Business city is required/);
  assert.throws(() => validateBusinessRegistrationRequest({ ...input, idempotencyKey: '' }), /Idempotency-Key is required/);
});

test('Phase 5 Registration 2: registration identity and listing are canonically linked', () => {
  const records = buildBusinessRegistrationRecords({
    request: validateBusinessRegistrationRequest(input),
    ownerUid: 'uid-owner',
    businessId: 'biz-fixed',
    locationId: 'loc-fixed',
    now: '2026-09-18T00:00:00.000Z',
  });
  assert.equal(records.business.id, 'biz-fixed');
  assert.equal(records.business.ownerUid, 'uid-owner');
  assert.equal(records.business.listing.businessId, 'biz-fixed');
  assert.equal(records.location.businessId, 'biz-fixed');
  assert.equal(records.relationship.relationshipType, 'owner');
  assert.equal(records.business.listing.isPublished, false);
  assert.equal(records.business.status, 'pending_verification');
  assert.equal(records.business.businessMode, 'listing_and_store');
});

test('Phase 5 Registration 3: registration creates a listing-only business without tenant state', () => {
  const records = buildBusinessRegistrationRecords({
    request: validateBusinessRegistrationRequest(input),
    ownerUid: 'uid-owner',
    businessId: 'biz-fixed',
    locationId: 'loc-fixed',
  });
  assert.deepEqual(records.business.tenantIds, []);
  assert.equal(records.location.hasOperationalTenant, false);
  assert.equal(records.location.tenantId, null);
});

test('Phase 5 Registration 4: idempotency keys are persisted as SHA-256 digests', () => {
  const digest = hashBusinessRegistrationKey(input.idempotencyKey);
  assert.equal(digest.length, 64);
  assert.equal(digest, hashBusinessRegistrationKey(input.idempotencyKey));
});

test('Phase 5 Registration 5: registration output contains no credentials or secrets', () => {
  const records = buildBusinessRegistrationRecords({
    request: validateBusinessRegistrationRequest(input),
    ownerUid: 'uid-owner',
  });
  assert.doesNotMatch(JSON.stringify(records), /password|secret|privateKey|accessToken/i);
});


test('Phase 5 Registration 6: business mode is explicit and invalid modes fail closed', () => {
  assert.equal(validateBusinessRegistrationRequest(input).businessMode, 'listing_and_store');
  assert.equal(validateBusinessRegistrationRequest({ ...input, businessMode: 'listing_only' }).businessMode, 'listing_only');
  assert.throws(() => validateBusinessRegistrationRequest({ ...input, businessMode: 'unknown' as any }), /Business mode must be/);
});
