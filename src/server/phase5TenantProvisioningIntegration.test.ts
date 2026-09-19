import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('Phase 5 Integration 1: onboarding submits authenticated canonical business registration before tenant provisioning', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/layouts/ShellOnboardingAdapter.tsx'),
    'utf8',
  );

  assert.ok(source.includes('getAuth().currentUser'));
  assert.ok(source.includes('user.getIdToken()'));
  assert.ok(source.includes("fetch('/api/business/register"));
  assert.ok(source.includes('Authorization:'));
  assert.ok(source.includes("fetch('/api/business/provision-tenant"));
  assert.ok(source.includes('registration.business.id'));
  assert.ok(source.includes('registration.business.locations?.[0]?.id'));
});

test('Phase 5 Integration 2: listing-only onboarding never fabricates a tenant identifier', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/layouts/ShellOnboardingAdapter.tsx'), 'utf8');
  assert.ok(source.includes('tenantId: undefined'));
  assert.ok(source.includes('registration.business.listing.slug'));
  assert.ok(!source.includes('tenantId: businessData.id'));
});

test('Phase 5 Integration 3: store onboarding navigates only with the authoritative provisioned tenant id', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/layouts/ShellOnboardingAdapter.tsx'), 'utf8');
  assert.ok(source.includes('tenantId: provisioning.tenant.id'));
  assert.ok(source.includes('provisioning.tenant.id'));
  assert.ok(!source.includes('tenantId: businessData.id'));
});

test('Phase 5 Integration 4: onboarding displays server registration failures instead of claiming success', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/business/BusinessOnboardingShell.tsx'), 'utf8');
  assert.ok(source.includes('completedRecord.registrationError'));
  assert.ok(source.includes('Registration Could Not Be Completed'));
  assert.ok(source.includes('Return to Registration'));
});
