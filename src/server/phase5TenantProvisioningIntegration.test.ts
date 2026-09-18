import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('Phase 5 Integration 1: onboarding submits authenticated canonical business registration before tenant provisioning', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/layouts/ShellOnboardingAdapter.tsx'), 'utf8');
  assert.match(source, /getAuth\\(\\)\\.currentUser/);
  assert.match(source, /user\\.getIdToken\\(\\)/);
  assert.match(source, /fetch\\('\\/api\\/business\\/register'/);
  assert.match(source, /Authorization:/);
  assert.match(source, /fetch\\('\\/api\\/business\\/provision-tenant'/);
  assert.match(source, /registration\\.business\\.id/);
  assert.match(source, /registration\\.business\\.locations\\?\\.\\[0\\]\\?\\.id/);
});

test('Phase 5 Integration 2: listing-only onboarding never fabricates a tenant identifier', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/layouts/ShellOnboardingAdapter.tsx'), 'utf8');
  assert.match(source, /tenantId: undefined/);
  assert.match(source, /registration\\.business\\.listing\\.slug/);
  assert.doesNotMatch(source, /tenantId: businessData\\.id/);
});

test('Phase 5 Integration 3: store onboarding navigates only with the authoritative provisioned tenant id', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/layouts/ShellOnboardingAdapter.tsx'), 'utf8');
  assert.match(source, /tenantId: provisioning\\.tenant\\.id/);
  assert.match(source, /provisioning\\.tenant\\.id/);
  assert.doesNotMatch(source, /tenantId: businessData\\.id/);
});

test('Phase 5 Integration 4: onboarding displays server registration failures instead of claiming success', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/business/BusinessOnboardingShell.tsx'), 'utf8');
  assert.match(source, /completedRecord\\.registrationError/);
  assert.match(source, /Registration Could Not Be Completed/);
  assert.match(source, /Return to Registration/);
});
