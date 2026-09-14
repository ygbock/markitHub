import assert from 'node:assert/strict';
import test from 'node:test';
import { ALL_PERMISSION_KEYS } from '../utils/permissions';
import { assertPlatformAdmin, isPlatformAdminClaims } from './platformAdminAuth';

test('platform admin requires explicit platformAdmin claim and Super Admin role', () => {
  assert.equal(isPlatformAdminClaims({ role: 'Super Admin', platformAdmin: true }), true);
  assert.equal(isPlatformAdminClaims({ role: 'Super Admin' }), false);
  assert.equal(isPlatformAdminClaims({ role: 'Business Owner', platformAdmin: true }), false);
});

test('platform admin rejects incomplete permission claims', () => {
  assert.equal(
    isPlatformAdminClaims({
      role: 'Super Admin',
      platformAdmin: true,
      permissions: ALL_PERMISSION_KEYS.slice(0, -1),
    }),
    false,
  );
});

test('assertPlatformAdmin fails closed', () => {
  assert.throws(
    () => assertPlatformAdmin({ role: 'Business Owner', platformAdmin: true }),
    (error: any) => error.statusCode === 403,
  );
});
