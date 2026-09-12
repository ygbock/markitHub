import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionMonimePayment, validateMonimeSettlement } from './monimePaymentState';

test('allows pending to paid', () => assert.equal(canTransitionMonimePayment('pending', 'paid'), true));
test('prevents paid to failed', () => assert.equal(canTransitionMonimePayment('paid', 'failed'), false));
test('same state is idempotent', () => assert.equal(canTransitionMonimePayment('failed', 'failed'), true));
test('rejects cross-tenant settlement', () => assert.equal(validateMonimeSettlement({tenantId:'a',sessionTenantId:'b',orderTenantId:'a',sessionAmount:100,orderAmount:100,sessionCurrency:'SLE',orderCurrency:'SLE'}).reason, 'tenant_mismatch'));
test('rejects amount tampering', () => assert.equal(validateMonimeSettlement({tenantId:'a',sessionTenantId:'a',orderTenantId:'a',sessionAmount:999,orderAmount:100,sessionCurrency:'SLE',orderCurrency:'SLE'}).reason, 'amount_mismatch'));
test('rejects currency tampering', () => assert.equal(validateMonimeSettlement({tenantId:'a',sessionTenantId:'a',orderTenantId:'a',sessionAmount:100,orderAmount:100,sessionCurrency:'USD',orderCurrency:'SLE'}).reason, 'currency_mismatch'));
test('accepts valid settlement', () => assert.equal(validateMonimeSettlement({tenantId:'a',sessionTenantId:'a',orderTenantId:'a',sessionAmount:100,orderAmount:100,sessionCurrency:'SLE',orderCurrency:'SLE'}).valid, true));
