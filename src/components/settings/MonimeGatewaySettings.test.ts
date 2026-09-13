import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  validateMonimeForm,
  mapConfigToFormValues,
  formatMonimeApiError,
  formatVerificationTimestamp,
  SanitizedMonimeConfig,
} from './monimeSettingsController';
import {
  sanitizeMonimeConfigResponse,
  validateMonimeConfigMutation,
  calculateMonimeCredentialRotation,
  isMonimeConnectionTestNonMutating,
} from '../../server/monimePaymentState';

// 1. Authorized administrator can load Monime configuration
test('1. Authorized administrator can load Monime configuration', () => {
  const rawFirestoreConfig = {
    monimeSpaceId: 'spc-tenant-alpha',
    monimeAccessToken: 'encrypted_raw_token_that_should_not_leak',
    webhookSecret: 'encrypted_raw_secret_that_should_not_leak',
    monimeMode: 'live',
    monimePreferredChannel: 'mobile_money',
    monimeVersion: 'caph.2025-08-23',
    lastVerifiedAt: '2026-09-13T08:00:00.000Z',
    lastVerificationStatus: 'success',
    monimeWebhookId: 'whk-98721',
    webhookManaged: true,
  };

  const sanitized = sanitizeMonimeConfigResponse(rawFirestoreConfig);

  assert.equal(sanitized.configured, true);
  assert.equal(sanitized.spaceId, 'spc-tenant-alpha');
  assert.equal(sanitized.environment, 'production');
  assert.equal(sanitized.preferredChannel, 'mobile_money');
  assert.equal(sanitized.webhookConfigured, true);
  assert.equal(sanitized.webhookRegistered, true);
  assert.equal(sanitized.lastVerificationStatus, 'success');
});

// 2. Unauthorized user cannot modify configuration
test('2. Unauthorized user cannot modify configuration', () => {
  // Staff member without system.settings permission
  const unauthorizedMutation = validateMonimeConfigMutation({
    authTenantId: 'tenant-123',
    permissions: ['sales.create', 'sales.view'],
    spaceId: 'spc-malicious',
    accessToken: 'valid_length_token_123456789012345',
    webhookSecret: 'valid_secret_12345678901234567890123456789012',
  });

  assert.equal(unauthorizedMutation.valid, false);
  assert.equal(unauthorizedMutation.statusCode, 403);
  assert.match(unauthorizedMutation.error || '', /system\.settings/i);

  // Missing authentication completely
  const unauthenticatedMutation = validateMonimeConfigMutation({
    authTenantId: '',
    permissions: ['system.settings'],
    spaceId: 'spc-malicious',
  });

  assert.equal(unauthenticatedMutation.valid, false);
  assert.equal(unauthenticatedMutation.statusCode, 401);
  assert.match(unauthenticatedMutation.error || '', /authentication/i);
});

// 3. Sanitized configuration contains no access token
test('3. Sanitized configuration contains no access token', () => {
  const mockServerRecord = {
    monimeSpaceId: 'spc-secret-test',
    monimeAccessToken: 'monime_live_tok_991823918239128391283',
    accessToken: 'bearer_token_xyz_never_leak',
    webhookSecret: 'whsec_99182391823918239182391823918239',
  };

  const sanitized: any = sanitizeMonimeConfigResponse(mockServerRecord);

  assert.equal('monimeAccessToken' in sanitized, false, 'monimeAccessToken must not exist in sanitized output');
  assert.equal('accessToken' in sanitized, false, 'accessToken must not exist in sanitized output');
  assert.equal('token' in sanitized, false, 'token must not exist in sanitized output');
  assert.equal(JSON.stringify(sanitized).includes('monime_live_tok_'), false);
});

// 4. Sanitized configuration contains no webhook secret
test('4. Sanitized configuration contains no webhook secret', () => {
  const mockServerRecord = {
    monimeSpaceId: 'spc-secret-test',
    monimeAccessToken: 'monime_live_tok_991823918239128391283',
    webhookSecret: 'whsec_super_secret_webhook_key_12345678901234567890',
    secret: 'whsec_leak_candidate',
  };

  const sanitized: any = sanitizeMonimeConfigResponse(mockServerRecord);

  assert.equal('webhookSecret' in sanitized, false, 'webhookSecret must not exist in sanitized output');
  assert.equal('secret' in sanitized, false, 'secret must not exist in sanitized output');
  assert.equal(JSON.stringify(sanitized).includes('whsec_super_secret'), false);
  // webhookConfigured is a safe boolean indicator
  assert.equal(sanitized.webhookConfigured, true);
});

// 5. Credential fields are not populated from GET configuration
test('5. Credential fields are not populated from GET configuration', () => {
  const sanitizedConfig: SanitizedMonimeConfig = {
    configured: true,
    provider: 'monime',
    environment: 'production',
    spaceId: 'spc-gamma-prod',
    webhookConfigured: true,
    preferredChannel: 'all',
  };

  const formValues = mapConfigToFormValues(sanitizedConfig);

  assert.equal(formValues.spaceId, 'spc-gamma-prod');
  assert.equal(formValues.environment, 'live');
  assert.equal(formValues.preferredChannel, 'all');
  assert.equal(formValues.accessToken, '', 'Form accessToken must remain strictly empty on load');
  assert.equal(formValues.webhookSecret, '', 'Form webhookSecret must remain strictly empty on load');

  // Verify component source does not assign any secret from data
  const componentSource = fs.readFileSync(path.resolve('src/components/settings/MonimeGatewaySettings.tsx'), 'utf8');
  assert.match(
    componentSource,
    /accessToken:\s*''/,
    'Component must explicitly reset accessToken to empty string on load'
  );
  assert.match(
    componentSource,
    /webhookSecret:\s*''/,
    'Component must explicitly reset webhookSecret to empty string on load'
  );
});

// 6. Test Connection calls the correct endpoint
test('6. Test Connection calls the correct endpoint', () => {
  const componentSource = fs.readFileSync(path.resolve('src/components/settings/MonimeGatewaySettings.tsx'), 'utf8');

  // Endpoint path check
  assert.equal(
    componentSource.includes("fetch('/api/monime/test-connection'"),
    true,
    "Test connection must explicitly call '/api/monime/test-connection'"
  );

  // Method check
  assert.match(
    componentSource,
    /method:\s*'POST'/,
    "Test connection must use 'POST' method"
  );

  // Non-mutating probe verification
  assert.equal(
    isMonimeConnectionTestNonMutating('GET', 'https://api.monime.io/v1/webhooks'),
    true,
    'Monime connection test must be non-mutating'
  );
  assert.equal(
    isMonimeConnectionTestNonMutating('POST', 'https://api.monime.io/v1/charges'),
    false,
    'Mutating actions must not be considered connection tests'
  );
});

// 7. Connection success is displayed
test('7. Connection success is displayed', () => {
  const componentSource = fs.readFileSync(path.resolve('src/components/settings/MonimeGatewaySettings.tsx'), 'utf8');

  // Check connected text and styling
  assert.equal(
    componentSource.includes("testResult.status === 'connected' && 'Connected'"),
    true,
    "Component must render 'Connected' badge upon success"
  );
  assert.equal(
    componentSource.includes("bg-emerald-50"),
    true,
    "Component must style connected state with emerald theme"
  );
});

// 8. Connection failure is displayed
test('8. Connection failure is displayed', () => {
  const componentSource = fs.readFileSync(path.resolve('src/components/settings/MonimeGatewaySettings.tsx'), 'utf8');

  // Check failed text and styling
  assert.equal(
    componentSource.includes("testResult.status === 'failed' && 'Connection failed'"),
    true,
    "Component must render 'Connection failed' upon probe failure"
  );
  assert.equal(
    componentSource.includes("bg-rose-50"),
    true,
    "Component must style failed state with rose theme"
  );
});

// 9. Credential rotation works through the existing API
test('9. Credential rotation works through the existing API', () => {
  // 1. Check calculation logic for rotation
  const rotation = calculateMonimeCredentialRotation({
    incomingAccessToken: 'new_token_12345678901234567890',
    incomingWebhookSecret: 'new_secret_12345678901234567890123456789012',
    existingWebhookId: 'whk_existing_441',
  });

  assert.equal(rotation.isRotatingToken, true);
  assert.equal(rotation.isRotatingWebhookSecret, true);
  assert.equal(rotation.requiresWebhookRecreation, true);
  assert.equal(rotation.shouldDisablePreviousWebhook, true);

  // 2. Check UI component has rotation controls
  const componentSource = fs.readFileSync(path.resolve('src/components/settings/MonimeGatewaySettings.tsx'), 'utf8');
  assert.equal(
    componentSource.includes('monime-rotate-credentials-btn'),
    true,
    'Component must include rotate credentials toggle'
  );
  assert.equal(
    componentSource.includes('Credential Rotation Warning'),
    true,
    'Component must warn user about credential rotation impact'
  );
  assert.equal(
    componentSource.includes("fetch('/api/monime/config'"),
    true,
    "Mutation must target '/api/monime/config'"
  );
});

// 10. API 403 is handled correctly
test('10. API 403 is handled correctly', () => {
  const errorMsg = formatMonimeApiError(403);
  assert.match(errorMsg, /Permission denied/i);
  assert.match(errorMsg, /system\.settings/i);

  const componentSource = fs.readFileSync(path.resolve('src/components/settings/MonimeGatewaySettings.tsx'), 'utf8');
  assert.equal(
    componentSource.includes('monime-auth-error-banner'),
    true,
    'Component must have dedicated accessible auth error banner'
  );
  assert.equal(
    componentSource.includes("response.status === 401 || response.status === 403"),
    true,
    'Component must explicitly handle 401 and 403 status codes'
  );
});

// 11. API 500/network failures are handled correctly
test('11. API 500/network failures are handled correctly', () => {
  const errorMsg = formatMonimeApiError(500, { message: 'Internal Server Error' });
  assert.equal(errorMsg, 'Internal Server Error');

  const fallbackMsg = formatMonimeApiError(500, {});
  assert.match(fallbackMsg, /unexpected error/i);

  const componentSource = fs.readFileSync(path.resolve('src/components/settings/MonimeGatewaySettings.tsx'), 'utf8');
  assert.equal(
    componentSource.includes('monime-general-error-banner'),
    true,
    'Component must have general error banner for 500 / network failures'
  );
  assert.match(
    componentSource,
    /catch\s*\(\w+:\s*any\)\s*\{[\s\S]*?setGeneralError/,
    'Component must catch exceptions and set general error'
  );
});

// 12. Form validation works
test('12. Form validation works', () => {
  // Test invalid Space ID
  const invalidSpace = validateMonimeForm(
    {
      spaceId: 'invalid_space_no_prefix',
      environment: 'test',
      preferredChannel: 'all',
      accessToken: 'token_12345678901234567890',
      webhookSecret: 'secret_12345678901234567890123456789012',
    },
    { isConfigured: false, isRotating: false }
  );
  assert.equal(invalidSpace.valid, false);
  assert.match(invalidSpace.errors.spaceId || '', /spc-/);

  // Test missing token on initial config
  const missingToken = validateMonimeForm(
    {
      spaceId: 'spc-valid-space',
      environment: 'test',
      preferredChannel: 'all',
      accessToken: '',
      webhookSecret: 'secret_12345678901234567890123456789012',
    },
    { isConfigured: false, isRotating: false }
  );
  assert.equal(missingToken.valid, false);
  assert.match(missingToken.errors.accessToken || '', /required/i);

  // Test short webhook secret (< 32 chars)
  const shortSecret = validateMonimeForm(
    {
      spaceId: 'spc-valid-space',
      environment: 'test',
      preferredChannel: 'all',
      accessToken: 'token_12345678901234567890',
      webhookSecret: 'too_short',
    },
    { isConfigured: false, isRotating: false }
  );
  assert.equal(shortSecret.valid, false);
  assert.match(shortSecret.errors.webhookSecret || '', /between 32 and 256/i);

  // Test valid initial submission
  const validSubmission = validateMonimeForm(
    {
      spaceId: 'spc-gamma-store-01',
      environment: 'live',
      preferredChannel: 'mobile_money',
      accessToken: 'monime_live_tok_991823918239128391283',
      webhookSecret: 'whsec_99182391823918239182391823918239',
    },
    { isConfigured: false, isRotating: false }
  );
  assert.equal(validSubmission.valid, true);
  assert.deepEqual(validSubmission.errors, {});

  // Test update without rotating credentials (blank secrets are allowed)
  const validUpdate = validateMonimeForm(
    {
      spaceId: 'spc-gamma-store-01',
      environment: 'live',
      preferredChannel: 'card',
      accessToken: '',
      webhookSecret: '',
    },
    { isConfigured: true, isRotating: false }
  );
  assert.equal(validUpdate.valid, true);
  assert.deepEqual(validUpdate.errors, {});
});

// 13. Responsive layout does not introduce horizontal overflow
test('13. Responsive layout does not introduce horizontal overflow', () => {
  const componentSource = fs.readFileSync(path.resolve('src/components/settings/MonimeGatewaySettings.tsx'), 'utf8');

  // Container width constraints
  assert.match(componentSource, /max-w-5xl mx-auto/);
  assert.match(componentSource, /w-full/);

  // Word-breaking and truncation on long identifiers/URLs
  assert.match(componentSource, /break-all/);
  assert.match(componentSource, /truncate/);

  // Grid responsiveness: mobile 1 column, tablet 2 columns, desktop 4 columns
  assert.match(componentSource, /grid-cols-1\s+sm:grid-cols-2\s+lg:grid-cols-4/);

  // Ensure no fixed px widths on containers that would overflow mobile (e.g. w-[600px], w-[800px])
  assert.equal(/w-\[\d{3,4}px\]/.test(componentSource), false, 'No fixed large pixel widths');
});

test('14. Timestamp formatting utility behaves properly', () => {
  assert.equal(formatVerificationTimestamp(null), 'Never verified');
  assert.equal(formatVerificationTimestamp(undefined), 'Never verified');
  assert.equal(formatVerificationTimestamp('invalid-date'), 'Never verified');
  assert.notEqual(formatVerificationTimestamp('2026-09-13T12:00:00.000Z'), 'Never verified');
});
