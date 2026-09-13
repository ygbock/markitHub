import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionMonimePayment, validateMonimeSettlement, buildMonimeCheckoutUrls } from './monimePaymentState';

test('allows pending to paid', () => assert.equal(canTransitionMonimePayment('pending', 'paid'), true));
test('prevents paid to failed', () => assert.equal(canTransitionMonimePayment('paid', 'failed'), false));
test('same state is idempotent', () => assert.equal(canTransitionMonimePayment('failed', 'failed'), true));
test('rejects cross-tenant settlement', () => assert.equal(validateMonimeSettlement({tenantId:'a',sessionTenantId:'b',orderTenantId:'a',sessionAmount:100,orderAmount:100,sessionCurrency:'SLE',orderCurrency:'SLE'}).reason, 'tenant_mismatch'));
test('rejects amount tampering', () => assert.equal(validateMonimeSettlement({tenantId:'a',sessionTenantId:'a',orderTenantId:'a',sessionAmount:999,orderAmount:100,sessionCurrency:'SLE',orderCurrency:'SLE'}).reason, 'amount_mismatch'));
test('rejects currency tampering', () => assert.equal(validateMonimeSettlement({tenantId:'a',sessionTenantId:'a',orderTenantId:'a',sessionAmount:100,orderAmount:100,sessionCurrency:'USD',orderCurrency:'SLE'}).reason, 'currency_mismatch'));
test('accepts valid settlement', () => assert.equal(validateMonimeSettlement({tenantId:'a',sessionTenantId:'a',orderTenantId:'a',sessionAmount:100,orderAmount:100,sessionCurrency:'SLE',orderCurrency:'SLE'}).valid, true));

test('explicitly stringifies success_url and cancel_url', () => {
  const result = buildMonimeCheckoutUrls({
    appUrl: 'https://nexus.example.com',
    orderId: 'ORD-9912'
  });
  assert.equal(typeof result.success_url, 'string');
  assert.equal(typeof result.cancel_url, 'string');
  assert.equal(result.success_url, 'https://nexus.example.com/checkout/success?orderId=ORD-9912');
  assert.equal(result.cancel_url, 'https://nexus.example.com/checkout/cancel?orderId=ORD-9912');
});

test('handles custom or client provided successUrl and cancelUrl', () => {
  const result = buildMonimeCheckoutUrls({
    appUrl: 'https://nexus.example.com',
    orderId: 'ORD-9912',
    successUrl: 'https://nexus.example.com/?monime_success=true&order_id=ORD-9912',
    cancelUrl: 'https://nexus.example.com/?monime_cancel=true&order_id=ORD-9912'
  });
  assert.equal(result.success_url, 'https://nexus.example.com/?monime_success=true&order_id=ORD-9912');
  assert.equal(result.cancel_url, 'https://nexus.example.com/?monime_cancel=true&order_id=ORD-9912');
});

test('buildMonimeCheckoutUrls rejects missing appUrl', () => {
  assert.throws(() => {
    buildMonimeCheckoutUrls({
      appUrl: '',
      orderId: 'ORD-9912'
    });
  }, /APP_URL is not configured on the server/);
});
