import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  canTransitionMonimePayment,
  validateMonimeSettlement,
  buildMonimeCheckoutUrls,
  sanitizeMonimeConfigResponse,
  validateMonimeConfigMutation,
  calculateMonimeCredentialRotation,
  buildMonimeWebhookRegistrationPayload,
  isMonimeConnectionTestNonMutating,
  verifyMonimeWebhookSignature,
  reconcileMonimeWebhookSettlement,
} from './monimePaymentState';

// 1. Client session persistence is removed
test('client session persistence is removed from paymentGateway.ts and App.tsx', () => {
  const gatewayCode = fs.readFileSync(path.resolve('src/services/paymentGateway.ts'), 'utf8');
  assert.equal(
    gatewayCode.includes('saveMonimeSessionToDB'),
    false,
    'paymentGateway.ts must not call or import saveMonimeSessionToDB'
  );
  assert.equal(
    gatewayCode.includes('monime_sessions'),
    false,
    'paymentGateway.ts must not reference monime_sessions directly'
  );

  const appCode = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
  assert.equal(
    appCode.includes('saveMonimeSessionToDB'),
    false,
    'App.tsx must not call saveMonimeSessionToDB'
  );

  const rules = fs.readFileSync(path.resolve('firestore.rules'), 'utf8');
  assert.match(
    rules,
    /match \/monime_sessions\/\{sessionId\} \{\s*allow read, write: if false;\s*\}/,
    'firestore.rules must deny direct browser read/write access to monime_sessions'
  );
});

// 2. Secret non-disclosure in GET /api/monime/config and staff responses
test('secret non-disclosure: sanitizeMonimeConfigResponse never exposes access tokens or webhook secrets', () => {
  const rawDbConfig = {
    monimeSpaceId: 'spc-gamma-99',
    monimeAccessToken: 'enc:v1:mockIv.mockTag.mockCiphertext',
    webhookSecret: 'enc:v1:mockIv2.mockTag2.mockCiphertext2',
    monimeMode: 'live',
    monimePreferredChannel: 'mobile_money',
    monimeVersion: 'caph.2025-08-23',
    internalEncryptionKey: 'secret-key-that-should-never-leak',
    lastVerifiedAt: '2026-09-13T07:00:00.000Z',
  };

  const sanitized = sanitizeMonimeConfigResponse(rawDbConfig);
  assert.equal(sanitized.configured, true);
  assert.equal(sanitized.provider, 'monime');
  assert.equal(sanitized.environment, 'production');
  assert.equal(sanitized.spaceId, 'spc-gamma-99');
  assert.equal(sanitized.webhookConfigured, true);
  assert.equal(sanitized.preferredChannel, 'mobile_money');
  assert.equal(sanitized.version, 'caph.2025-08-23');
  assert.equal(sanitized.lastVerifiedAt, '2026-09-13T07:00:00.000Z');

  // Verify NO sensitive properties exist on sanitized output
  const keys = Object.keys(sanitized);
  assert.equal(keys.includes('monimeAccessToken'), false);
  assert.equal(keys.includes('webhookSecret'), false);
  assert.equal(keys.includes('internalEncryptionKey'), false);
});

// 3. Cross-tenant configuration access & credential isolation
test('cross-tenant configuration mutation is rejected with 403', () => {
  const result = validateMonimeConfigMutation({
    authTenantId: 'tenant-alpha',
    bodyTenantId: 'tenant-beta', // attempting to modify another tenant's gateway
    permissions: ['system.settings'],
    spaceId: 'spc-beta-1234',
    accessToken: 'monime_sec_valid_token_string_12345',
    webhookSecret: 'whsec_valid_webhook_signing_secret_32chars',
  });

  assert.equal(result.valid, false);
  assert.equal(result.statusCode, 403);
  assert.match(result.error || '', /Cross-tenant configuration modification is forbidden/i);
});

// 4. Unauthorized configuration mutation
test('unauthorized configuration mutation: missing system.settings permission is rejected with 403', () => {
  const result = validateMonimeConfigMutation({
    authTenantId: 'tenant-alpha',
    bodyTenantId: 'tenant-alpha',
    permissions: ['pos.sell', 'orders.view'], // lacks system.settings
    spaceId: 'spc-alpha-1234',
    accessToken: 'monime_sec_valid_token_string_12345',
    webhookSecret: 'whsec_valid_webhook_signing_secret_32chars',
  });

  assert.equal(result.valid, false);
  assert.equal(result.statusCode, 403);
  assert.match(result.error || '', /Permission system\.settings required/i);
});

test('unauthorized configuration mutation: unauthenticated call is rejected with 401', () => {
  const result = validateMonimeConfigMutation({
    authTenantId: '', // unauthenticated
    permissions: ['system.settings'],
    spaceId: 'spc-alpha-1234',
  });

  assert.equal(result.valid, false);
  assert.equal(result.statusCode, 401);
});

test('configuration mutation rejects malformed spaceId and short webhook secret', () => {
  const badSpace = validateMonimeConfigMutation({
    authTenantId: 'tenant-alpha',
    permissions: ['system.settings'],
    spaceId: 'invalid-format',
    accessToken: 'monime_sec_valid_token_string_12345',
    webhookSecret: 'whsec_valid_webhook_signing_secret_32chars',
  });
  assert.equal(badSpace.valid, false);
  assert.equal(badSpace.statusCode, 400);

  const shortSecret = validateMonimeConfigMutation({
    authTenantId: 'tenant-alpha',
    permissions: ['system.settings'],
    spaceId: 'spc-valid-1234',
    accessToken: 'monime_sec_valid_token_string_12345',
    webhookSecret: 'short_secret', // < 32 chars
  });
  assert.equal(shortSecret.valid, false);
  assert.equal(shortSecret.statusCode, 400);
});

// 5. Credential rotation replaces previous credential safely
test('credential rotation: updating webhookSecret triggers webhook recreation and disables previous webhook', () => {
  const rotation = calculateMonimeCredentialRotation({
    incomingAccessToken: 'new_token_12345678901234567890',
    incomingWebhookSecret: 'new_webhook_secret_32_chars_long_123456',
    existingWebhookId: 'whk_prev_9981',
  });

  assert.equal(rotation.isRotatingToken, true);
  assert.equal(rotation.isRotatingWebhookSecret, true);
  assert.equal(rotation.requiresWebhookRecreation, true);
  assert.equal(rotation.shouldDisablePreviousWebhook, true);
});

test('credential rotation: blank secrets retain existing credentials safely without rotating', () => {
  const noRotation = calculateMonimeCredentialRotation({
    incomingAccessToken: '',
    incomingWebhookSecret: '',
    existingWebhookId: 'whk_prev_9981',
  });

  assert.equal(noRotation.isRotatingToken, false);
  assert.equal(noRotation.isRotatingWebhookSecret, false);
  assert.equal(noRotation.requiresWebhookRecreation, false);
  assert.equal(noRotation.shouldDisablePreviousWebhook, false);
});

// 6. Webhook registration uses the correct tenant Space and URL
test('webhook registration payload uses correct tenant Space, URL, and Idempotency Key', () => {
  const payload = buildMonimeWebhookRegistrationPayload({
    tenantId: 'tenant-sierra',
    spaceId: 'spc-sierra-001',
    webhookSecret: 'whsec_test_secret_for_registration_32_chars',
    webhookBaseUrl: 'https://ais-dev.example.com',
    accessToken: 'monime_tok_12345678901234567890',
  });

  assert.equal(payload.headers['Monime-Space-Id'], 'spc-sierra-001');
  assert.equal(payload.headers['Authorization'], 'Bearer monime_tok_12345678901234567890');
  assert.equal(payload.headers['Monime-Version'], 'caph.2025-08-23');
  assert.equal(typeof payload.headers['Idempotency-Key'], 'string');
  assert.equal(payload.webhookUrl, 'https://ais-dev.example.com/api/monime/webhook/tenant-sierra');
  assert.equal(payload.body.url, 'https://ais-dev.example.com/api/monime/webhook/tenant-sierra');
  assert.equal(payload.body.metadata.tenantId, 'tenant-sierra');
  assert.deepEqual(payload.body.events, ['payment.completed', 'payment.failed', 'checkout_session.completed']);
});

// 7. Connection testing is non-mutating
test('connection testing is strictly non-mutating (GET /v1/webhooks?limit=1)', () => {
  assert.equal(isMonimeConnectionTestNonMutating('GET', '/v1/webhooks?limit=1'), true);
  assert.equal(isMonimeConnectionTestNonMutating('POST', '/v1/charges'), false);
  assert.equal(isMonimeConnectionTestNonMutating('POST', '/v1/checkout-sessions'), false);
  assert.equal(isMonimeConnectionTestNonMutating('DELETE', '/v1/webhooks/123'), false);
});

// 8. Checkout creation URL construction & validation
test('checkout creation: explicitly stringifies success_url and cancel_url', () => {
  const result = buildMonimeCheckoutUrls({
    appUrl: 'https://nexus.example.com',
    orderId: 'ORD-9912'
  });
  assert.equal(typeof result.success_url, 'string');
  assert.equal(typeof result.cancel_url, 'string');
  assert.equal(result.success_url, 'https://nexus.example.com/checkout/success?orderId=ORD-9912');
  assert.equal(result.cancel_url, 'https://nexus.example.com/checkout/cancel?orderId=ORD-9912');
});

test('checkout creation: handles custom or client provided successUrl and cancelUrl', () => {
  const result = buildMonimeCheckoutUrls({
    appUrl: 'https://nexus.example.com',
    orderId: 'ORD-9912',
    successUrl: 'https://nexus.example.com/?monime_success=true&order_id=ORD-9912',
    cancelUrl: 'https://nexus.example.com/?monime_cancel=true&order_id=ORD-9912'
  });
  assert.equal(result.success_url, 'https://nexus.example.com/?monime_success=true&order_id=ORD-9912');
  assert.equal(result.cancel_url, 'https://nexus.example.com/?monime_cancel=true&order_id=ORD-9912');
});

test('checkout creation: rejects missing appUrl', () => {
  assert.throws(() => {
    buildMonimeCheckoutUrls({
      appUrl: '',
      orderId: 'ORD-9912'
    });
  }, /APP_URL is not configured on the server/);
});

// 9. Webhook HMAC verification and replay protection
test('webhook HMAC verification passes for valid signature and timestamp', () => {
  const secret = 'whsec_valid_test_secret_32_characters_minimum!';
  const now = Date.now();
  const rawBody = JSON.stringify({ id: 'evt_123', type: 'payment.completed' });
  const signedPayload = `${now}.${rawBody}`;
  const sig = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  const header = `t=${now},v1=${sig}`;

  const verification = verifyMonimeWebhookSignature({
    signatureHeader: header,
    rawBody,
    secret,
    nowMs: now,
  });

  assert.equal(verification.valid, true);
});

test('webhook HMAC verification rejects expired timestamp (replay protection)', () => {
  const secret = 'whsec_valid_test_secret_32_characters_minimum!';
  const oldTimestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago (limit is 5 min)
  const rawBody = JSON.stringify({ id: 'evt_old', type: 'payment.completed' });
  const sig = crypto.createHmac('sha256', secret).update(`${oldTimestamp}.${rawBody}`).digest('hex');
  const header = `t=${oldTimestamp},v1=${sig}`;

  const verification = verifyMonimeWebhookSignature({
    signatureHeader: header,
    rawBody,
    secret,
  });

  assert.equal(verification.valid, false);
  assert.match(verification.error || '', /Expired webhook signature/i);
});

test('webhook HMAC verification rejects tampered body or invalid signature', () => {
  const secret = 'whsec_valid_test_secret_32_characters_minimum!';
  const now = Date.now();
  const rawBody = JSON.stringify({ id: 'evt_legit', amount: 100 });
  const sig = crypto.createHmac('sha256', secret).update(`${now}.${rawBody}`).digest('hex');
  const header = `t=${now},v1=${sig}`;

  // Attacker tampers body to amount: 1
  const tamperedBody = JSON.stringify({ id: 'evt_legit', amount: 1 });
  const verification = verifyMonimeWebhookSignature({
    signatureHeader: header,
    rawBody: tamperedBody,
    secret,
    nowMs: now,
  });

  assert.equal(verification.valid, false);
  assert.match(verification.error || '', /Invalid webhook signature/i);
});

// 10. Webhook settlement & idempotency
test('webhook settlement transitions: allows pending to paid / completed', () => {
  assert.equal(canTransitionMonimePayment('pending', 'paid'), true);
  assert.equal(canTransitionMonimePayment('pending', 'completed'), true);
});

test('duplicate webhook delivery: same state is idempotent', () => {
  assert.equal(canTransitionMonimePayment('paid', 'paid'), true);
  assert.equal(canTransitionMonimePayment('completed', 'completed'), true);
  assert.equal(canTransitionMonimePayment('failed', 'failed'), true);
});

test('terminal state preservation: prevents paid from being reverted to failed or cancelled', () => {
  assert.equal(canTransitionMonimePayment('paid', 'failed'), false);
  assert.equal(canTransitionMonimePayment('paid', 'cancelled'), false);
  assert.equal(canTransitionMonimePayment('completed', 'failed'), false);
});

// 11. Cross-tenant webhook rejection
test('cross-tenant webhook: rejects settlement when webhook, session, or order tenants differ', () => {
  const crossTenant = reconcileMonimeWebhookSettlement({
    webhookTenantId: 'tenant-attacker',
    sessionTenantId: 'tenant-victim',
    orderTenantId: 'tenant-victim',
    webhookAmount: 10000,
    sessionAmount: 100,
    orderAmount: 100,
    sessionCurrency: 'SLE',
  });

  assert.equal(crossTenant.valid, false);
  assert.equal(crossTenant.reason, 'tenant_mismatch');
});

// 12. Amount & currency tampering rejection
test('amount tampering: rejects webhook when minor/major amount mismatches server session', () => {
  const tamperedAmount = reconcileMonimeWebhookSettlement({
    webhookTenantId: 'tenant-a',
    sessionTenantId: 'tenant-a',
    orderTenantId: 'tenant-a',
    webhookAmount: 5000, // 50 SLE in cents instead of 100 SLE (10000 cents)
    sessionAmount: 100,
    orderAmount: 100,
    sessionCurrency: 'SLE',
  });

  assert.equal(tamperedAmount.valid, false);
  assert.equal(tamperedAmount.reason, 'amount_mismatch');
});

test('currency tampering: rejects webhook when currency mismatches server session', () => {
  const tamperedCurrency = reconcileMonimeWebhookSettlement({
    webhookTenantId: 'tenant-a',
    sessionTenantId: 'tenant-a',
    orderTenantId: 'tenant-a',
    webhookAmount: 10000,
    sessionAmount: 100,
    orderAmount: 100,
    webhookCurrency: 'USD',
    sessionCurrency: 'SLE',
    orderCurrency: 'SLE',
  });

  assert.equal(tamperedCurrency.valid, false);
  assert.equal(tamperedCurrency.reason, 'webhook_currency_mismatch');
});

test('amount reconciliation: accepts valid minor units and exact matches', () => {
  const validMinorUnits = reconcileMonimeWebhookSettlement({
    webhookTenantId: 'tenant-a',
    sessionTenantId: 'tenant-a',
    orderTenantId: 'tenant-a',
    webhookAmount: 15000, // 150.00 SLE in cents
    sessionAmount: 150,
    orderAmount: 150,
    webhookCurrency: 'SLE',
    sessionCurrency: 'SLE',
    orderCurrency: 'SLE',
  });
  assert.equal(validMinorUnits.valid, true);

  const validExactUnits = reconcileMonimeWebhookSettlement({
    webhookTenantId: 'tenant-a',
    sessionTenantId: 'tenant-a',
    orderTenantId: 'tenant-a',
    webhookAmount: 150,
    sessionAmount: 150,
    orderAmount: 150,
    webhookCurrency: 'SLE',
    sessionCurrency: 'SLE',
    orderCurrency: 'SLE',
  });
  assert.equal(validExactUnits.valid, true);
});

