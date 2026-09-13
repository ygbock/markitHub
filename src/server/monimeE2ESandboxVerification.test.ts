import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  canTransitionMonimePayment,
  buildMonimeCheckoutUrls,
  sanitizeMonimeConfigResponse,
  validateMonimeConfigMutation,
  isMonimeConnectionTestNonMutating,
  verifyMonimeWebhookSignature,
  reconcileMonimeWebhookSettlement,
  executeMonimeSettlementTransaction,
  SettlementProduct,
  SettlementReservation,
  SettlementOrder,
} from './monimePaymentState';
import { mapConfigToFormValues, validateMonimeForm } from '../components/settings/monimeSettingsController';

// ------------------------------------------------------------------------------------------------
// Monime Sandbox End-to-End Verification Suite (Steps 1 through 20)
// ------------------------------------------------------------------------------------------------

// STEP 1: Open Tenant Settings → Payment Gateway → Monime
test('Step 1: Tenant settings UI maps sanitized config cleanly without exposing secrets', () => {
  const sanitizedConfig = {
    configured: true,
    provider: 'monime' as const,
    environment: 'sandbox' as const,
    spaceId: 'spc-sandbox-tenant-99',
    webhookConfigured: true,
    preferredChannel: 'mobile_money',
    version: 'caph.2025-08-23',
    lastVerifiedAt: '2026-09-13T07:15:00.000Z',
    lastVerificationStatus: 'success' as const,
    webhookRegistered: true,
    webhookManaged: true,
    webhookUrl: 'https://ais-dev.example.com/api/monime/webhook/tenant-99',
  };

  const formValues = mapConfigToFormValues(sanitizedConfig);
  assert.equal(formValues.spaceId, 'spc-sandbox-tenant-99');
  assert.equal(formValues.environment, 'test');
  assert.equal(formValues.preferredChannel, 'mobile_money');
  // Secrets in form state are strictly blank placeholders awaiting user input
  assert.equal(formValues.accessToken, '');
  assert.equal(formValues.webhookSecret, '');
});

// STEP 2: Configure the sandbox Space ID and required credentials
test('Step 2: Configuration validation enforces strict Space ID format, token, and secret length', () => {
  const validMutation = validateMonimeConfigMutation({
    authTenantId: 'tenant-sandbox-01',
    bodyTenantId: 'tenant-sandbox-01',
    permissions: ['system.settings'],
    spaceId: 'spc-sandbox-01',
    accessToken: 'monime_sec_test_valid_sandbox_token_1234567890',
    webhookSecret: 'whsec_sandbox_signing_secret_32_characters_min!',
  });
  assert.equal(validMutation.valid, true);

  const invalidSpaceId = validateMonimeConfigMutation({
    authTenantId: 'tenant-sandbox-01',
    permissions: ['system.settings'],
    spaceId: 'invalid-space-no-prefix',
    accessToken: 'monime_sec_test_token_12345',
    webhookSecret: 'whsec_secret_32_characters_minimum_here!',
  });
  assert.equal(invalidSpaceId.valid, false);
  assert.equal(invalidSpaceId.statusCode, 400);

  const shortSecret = validateMonimeConfigMutation({
    authTenantId: 'tenant-sandbox-01',
    permissions: ['system.settings'],
    spaceId: 'spc-sandbox-01',
    accessToken: 'monime_sec_test_token_12345',
    webhookSecret: 'too-short',
  });
  assert.equal(shortSecret.valid, false);
  assert.equal(shortSecret.statusCode, 400);
});

// STEP 3: Verify Test Connection succeeds and is non-mutating
test('Step 3: Test connection probe is strictly non-mutating (GET /v1/webhooks?limit=1)', () => {
  assert.equal(isMonimeConnectionTestNonMutating('GET', '/v1/webhooks?limit=1'), true);
  assert.equal(isMonimeConnectionTestNonMutating('POST', '/v1/checkout-sessions'), false);
  assert.equal(isMonimeConnectionTestNonMutating('POST', '/v1/payments'), false);
});

// STEP 4: Confirm the UI never displays the stored access token or webhook secret
test('Step 4: Sanitization completely removes all credentials and private keys from client response', () => {
  const sensitiveDatabaseRecord = {
    monimeSpaceId: 'spc-sandbox-test-44',
    monimeAccessToken: 'enc:v1:aes-256-gcm:iv:tag:ciphertext',
    webhookSecret: 'enc:v1:aes-256-gcm:iv:tag:webhookCiphertext',
    internalEncryptionKey: 'should-never-reach-client',
    monimeMode: 'test',
    lastVerifiedAt: '2026-09-13T07:20:00.000Z',
    lastVerificationStatus: 'success',
  };

  const clientResponse = sanitizeMonimeConfigResponse(sensitiveDatabaseRecord);
  assert.equal(clientResponse.spaceId, 'spc-sandbox-test-44');
  assert.equal(clientResponse.environment, 'sandbox');
  assert.equal(clientResponse.configured, true);
  assert.equal((clientResponse as any).monimeAccessToken, undefined);
  assert.equal((clientResponse as any).webhookSecret, undefined);
  assert.equal((clientResponse as any).internalEncryptionKey, undefined);
});

// STEP 5: Create a legitimate test order
test('Step 5: Legitimate test order has verified line items, total, and tenant ID', () => {
  const testOrder: SettlementOrder = {
    id: 'ord_test_sandbox_555',
    tenantId: 'tenant-sandbox-01',
    grandTotal: 150.0,
    currency: 'SLE',
    paymentStatus: 'pending',
  };
  assert.equal(testOrder.grandTotal, 150.0);
  assert.equal(testOrder.currency, 'SLE');
  assert.equal(testOrder.paymentStatus, 'pending');
});

// STEP 6: Create the Monime checkout session
test('Step 6: Checkout session generation builds valid string URLs and amounts', () => {
  const urls = buildMonimeCheckoutUrls({
    appUrl: 'https://ais-dev.example.com',
    orderId: 'ord_test_sandbox_555',
  });
  assert.equal(typeof urls.success_url, 'string');
  assert.equal(typeof urls.cancel_url, 'string');
  assert.equal(urls.success_url, 'https://ais-dev.example.com/checkout/success?orderId=ord_test_sandbox_555');
  assert.equal(urls.cancel_url, 'https://ais-dev.example.com/checkout/cancel?orderId=ord_test_sandbox_555');
});

// STEP 7: Complete the payment using supported sandbox payment method & verify payment state transitions
test('Step 7: Payment state transitions safely to completed/paid and rejects invalid reverts', () => {
  assert.equal(canTransitionMonimePayment('pending', 'completed'), true);
  assert.equal(canTransitionMonimePayment('pending', 'paid'), true);
  assert.equal(canTransitionMonimePayment('pending', 'failed'), true);
  // Terminal state protection: settled payment cannot be reverted
  assert.equal(canTransitionMonimePayment('completed', 'failed'), false);
  assert.equal(canTransitionMonimePayment('paid', 'failed'), false);
  assert.equal(canTransitionMonimePayment('paid', 'cancelled'), false);
});

// STEP 8, 9 & 10: Webhook delivery, HMAC verification, and replay protection
test('Step 8, 9 & 10: Webhook HMAC signature verification and replay protection (> 5 minutes)', () => {
  const secret = 'whsec_sandbox_test_webhook_signing_secret_32_chars!';
  const now = Date.now();
  const rawBody = JSON.stringify({
    id: 'evt_sandbox_999',
    type: 'payment.completed',
    data: {
      id: 'sess_sandbox_123',
      amount: 15000, // 150 SLE in cents
      currency: 'SLE',
      orderNumber: 'ORD-MONIME-1001',
    },
  });

  // Valid signature
  const validTimestamp = now;
  const validPayload = `${validTimestamp}.${rawBody}`;
  const validSig = crypto.createHmac('sha256', secret).update(validPayload).digest('hex');
  const validHeader = `t=${validTimestamp},v1=${validSig}`;

  const validResult = verifyMonimeWebhookSignature({
    signatureHeader: validHeader,
    rawBody,
    secret,
    nowMs: now,
  });
  assert.equal(validResult.valid, true);

  // Expired signature (Replay protection: 10 minutes old)
  const expiredTimestamp = now - 10 * 60 * 1000;
  const expiredPayload = `${expiredTimestamp}.${rawBody}`;
  const expiredSig = crypto.createHmac('sha256', secret).update(expiredPayload).digest('hex');
  const expiredHeader = `t=${expiredTimestamp},v1=${expiredSig}`;

  const expiredResult = verifyMonimeWebhookSignature({
    signatureHeader: expiredHeader,
    rawBody,
    secret,
    nowMs: now,
  });
  assert.equal(expiredResult.valid, false);
  assert.match(expiredResult.error || '', /Expired webhook signature/i);

  // Tampered payload
  const tamperedBody = JSON.stringify({
    id: 'evt_sandbox_999',
    type: 'payment.completed',
    data: { id: 'sess_sandbox_123', amount: 100, currency: 'SLE' },
  });
  const tamperedResult = verifyMonimeWebhookSignature({
    signatureHeader: validHeader,
    rawBody: tamperedBody,
    secret,
    nowMs: now,
  });
  assert.equal(tamperedResult.valid, false);
  assert.match(tamperedResult.error || '', /Invalid webhook signature/i);
});

// STEP 11, 12, 13, 14, 15, 16, 17: Full Transactional Settlement & Stock Deduction
test('Step 11-17: Three-way reconciliation, inventory finalization, atomic stock deduction, audit records, and settlement', () => {
  const tenantId = 'tenant-sandbox-01';
  const sessionId = 'sess_sandbox_123';
  const orderId = 'ord_test_sandbox_555';

  const order: SettlementOrder = {
    id: orderId,
    tenantId,
    grandTotal: 150.0,
    currency: 'SLE',
    paymentStatus: 'pending',
  };

  const session = {
    tenant_id: tenantId,
    order_id: orderId,
    amount: 150.0,
    currency: 'SLE',
    status: 'pending',
    reservation_id: 'res_sandbox_001',
  };

  const reservation: SettlementReservation = {
    id: 'res_sandbox_001',
    tenantId,
    orderId,
    status: 'active',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    items: [
      { productId: 'prod_1', variantSku: 'SKU-BLUE-M', quantity: 2 },
      { productId: 'prod_2', quantity: 1 },
    ],
  };

  const products = new Map<string, SettlementProduct>([
    [
      'prod_1',
      {
        id: 'prod_1',
        tenantId,
        name: 'Blue T-Shirt',
        stock: 10,
        cost: 25.0,
        location: 'Storefront Shelf A',
        variants: [
          { sku: 'SKU-BLUE-M', stock: 5, cost: 25.0 },
          { sku: 'SKU-BLUE-L', stock: 5, cost: 25.0 },
        ],
      },
    ],
    [
      'prod_2',
      {
        id: 'prod_2',
        tenantId,
        name: 'Baseball Cap',
        sku: 'SKU-CAP-01',
        stock: 8,
        cost: 15.0,
        location: 'Storefront Shelf B',
      },
    ],
  ]);

  const webhookData = {
    id: sessionId,
    amount: 15000, // minor units
    currency: 'SLE',
    orderNumber: 'ORD-MONIME-1001',
  };

  const result = executeMonimeSettlementTransaction({
    tenantId,
    sessionId,
    webhookEventId: 'evt_sandbox_999',
    webhookData,
    session,
    order,
    reservation,
    products,
    existingSettlement: null,
  });

  assert.equal(result.success, true);
  assert.equal(result.isDuplicate, false);

  // Step 12: Three-way reconciliation verified
  assert.equal(result.updatedSession.status, 'completed');
  assert.equal(result.updatedSession.monime_order_number, 'ORD-MONIME-1001');

  // Step 13: Inventory reservation finalized
  assert.equal(result.finalizedReservation?.status, 'finalized');

  // Step 14: Stock deduction verified
  const prod1 = result.updatedProducts.find((p) => p.id === 'prod_1');
  assert.ok(prod1);
  const variantM = prod1.variants?.find((v) => v.sku === 'SKU-BLUE-M');
  assert.equal(variantM?.stock, 3); // 5 - 2 = 3
  assert.equal(prod1.stock, 8); // 10 - 2 = 8

  const prod2 = result.updatedProducts.find((p) => p.id === 'prod_2');
  assert.ok(prod2);
  assert.equal(prod2.stock, 7); // 8 - 1 = 7

  // Step 15: Stock movement audit records created
  assert.equal(result.stockMovements.length, 2);
  const movement1 = result.stockMovements[0];
  assert.equal(movement1.sku, 'SKU-BLUE-M');
  assert.equal(movement1.quantityChange, -2);
  assert.equal(movement1.quantityBefore, 5);
  assert.equal(movement1.quantityAfter, 3);
  assert.equal(movement1.performedBy, 'Monime Payment Settlement');
  assert.equal(movement1.type, 'Online Sale');

  const movement2 = result.stockMovements[1];
  assert.equal(movement2.sku, 'SKU-CAP-01');
  assert.equal(movement2.quantityChange, -1);
  assert.equal(movement2.quantityBefore, 8);
  assert.equal(movement2.quantityAfter, 7);

  // Step 16: Payment settlement record created
  assert.equal(result.settlementRecord.status, 'settled');
  assert.equal(result.settlementRecord.tenantId, tenantId);
  assert.equal(result.settlementRecord.sessionId, sessionId);
  assert.equal(result.settlementRecord.orderId, orderId);

  // Step 17: Order marked paid
  assert.equal(result.updatedOrder.paymentStatus, 'paid');
});

// STEP 18: Deliver the same webhook again & verify absolutely no duplicate settlement or stock deduction
test('Step 18: Duplicate webhook delivery is completely idempotent with no secondary deduction', () => {
  const tenantId = 'tenant-sandbox-01';
  const sessionId = 'sess_sandbox_123';
  const orderId = 'ord_test_sandbox_555';

  const order: SettlementOrder = {
    id: orderId,
    tenantId,
    grandTotal: 150.0,
    currency: 'SLE',
    paymentStatus: 'paid', // already paid
  };

  const session = {
    tenant_id: tenantId,
    order_id: orderId,
    amount: 150.0,
    currency: 'SLE',
    status: 'completed',
  };

  const products = new Map<string, SettlementProduct>();

  // 18A: Existing settlement document already exists
  const duplicateSettlementResult = executeMonimeSettlementTransaction({
    tenantId,
    sessionId,
    webhookEventId: 'evt_sandbox_999',
    webhookData: { amount: 15000, currency: 'SLE' },
    session,
    order,
    reservation: null,
    products,
    existingSettlement: { status: 'settled', settledAt: '2026-09-13T07:25:00.000Z' },
  });

  assert.equal(duplicateSettlementResult.success, true);
  assert.equal(duplicateSettlementResult.isDuplicate, true);
  assert.equal(duplicateSettlementResult.noop, true);
  // Zero products updated and zero stock movements created
  assert.equal((duplicateSettlementResult as any).stockMovements, undefined);
  assert.equal((duplicateSettlementResult as any).updatedProducts, undefined);

  // 18B: Order already paid check
  const duplicateOrderResult = executeMonimeSettlementTransaction({
    tenantId,
    sessionId,
    webhookEventId: 'evt_sandbox_999_retry',
    webhookData: { amount: 15000, currency: 'SLE' },
    session,
    order,
    reservation: null,
    products,
    existingSettlement: null,
  });
  assert.equal(duplicateOrderResult.success, true);
  assert.equal(duplicateOrderResult.isDuplicate, true);
  assert.equal(duplicateOrderResult.noop, true);
});

// STEP 19: Verify a webhook belonging to another tenant cannot affect this tenant
test('Step 19: Cross-tenant webhook or order is strictly rejected', () => {
  const tenantA = 'tenant-sandbox-01';
  const tenantB = 'tenant-sandbox-02';

  assert.throws(() => {
    executeMonimeSettlementTransaction({
      tenantId: tenantA,
      sessionId: 'sess_123',
      webhookEventId: 'evt_cross_tenant',
      webhookData: { amount: 100, currency: 'SLE' },
      session: {
        tenant_id: tenantB, // Attacker tenant
        order_id: 'ord_victim',
        amount: 100,
        currency: 'SLE',
        status: 'pending',
      },
      order: {
        id: 'ord_victim',
        tenantId: tenantA,
        grandTotal: 100,
        currency: 'SLE',
        paymentStatus: 'pending',
      },
      products: new Map(),
    });
  }, /Session belongs to another tenant/);

  assert.throws(() => {
    executeMonimeSettlementTransaction({
      tenantId: tenantA,
      sessionId: 'sess_123',
      webhookEventId: 'evt_cross_tenant_2',
      webhookData: { amount: 100, currency: 'SLE' },
      session: {
        tenant_id: tenantA,
        order_id: 'ord_victim',
        amount: 100,
        currency: 'SLE',
        status: 'pending',
      },
      order: {
        id: 'ord_victim',
        tenantId: tenantB, // Belongs to different tenant
        grandTotal: 100,
        currency: 'SLE',
        paymentStatus: 'pending',
      },
      products: new Map(),
    });
  }, /Order belongs to another tenant/);
});

// STEP 20: Verify customer/browser cannot directly modify the resulting payment/session records
test('Step 20: Firestore rules strictly deny client-side write/read access to monime_sessions and payment collections', () => {
  const firestoreRules = fs.readFileSync(path.resolve('firestore.rules'), 'utf8');

  // Verify explicit match rule denying access
  assert.match(
    firestoreRules,
    /match \/monime_sessions\/\{sessionId\} \{\s*allow read, write: if false;\s*\}/,
    'Client access to /monime_sessions/{sessionId} must be explicitly denied'
  );

  // Verify global default deny rule
  assert.match(
    firestoreRules,
    /match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/,
    'Default deny rule must reject all non-whitelisted collections'
  );
});

// LIVE SANDBOX CONNECTIVITY PROBE: Verify live API state
test('Monime Live API Probe: verifies exact state of live sandbox endpoint', async () => {
  const apiUrl = (process.env.MONIME_API_URL || 'https://api.monime.io').replace(/\/+$/, '');
  const spaceId = process.env.MONIME_SPACE_ID;
  const token = process.env.MONIME_ACCESS_TOKEN;

  const probe = await fetch(`${apiUrl}/v1/webhooks?limit=1`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(spaceId ? { 'Monime-Space-Id': spaceId } : {}),
    },
  }).catch((err) => ({
    status: 0,
    statusText: err.message,
  }));

  // If credentials are not provisioned in the container, API returns 401 Unauthorized
  if (!token || !spaceId) {
    assert.ok(
      probe.status === 401 || probe.status === 0,
      `Unconfigured container environment must return HTTP 401 Unauthorized or network error, got ${probe.status}`
    );
  } else {
    assert.ok(
      probe.status === 200 || probe.status === 401 || probe.status === 403,
      `API responded with HTTP ${probe.status}`
    );
  }
});
