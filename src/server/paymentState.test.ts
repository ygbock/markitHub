import assert from 'node:assert/strict';
import test from 'node:test';
import { transitionPaymentState } from './paymentState';

test('pending can enter processing and paid', () => {
  assert.equal(transitionPaymentState('pending', 'processing'), 'processing');
  assert.equal(transitionPaymentState('processing', 'completed'), 'paid');
});

test('completed webhook replay is idempotent after payment is paid', () => {
  assert.equal(transitionPaymentState('paid', 'completed'), 'paid');
});

test('terminal payments cannot be moved backwards', () => {
  assert.equal(transitionPaymentState('paid', 'failed'), null);
  assert.equal(transitionPaymentState('paid', 'cancelled'), null);
  assert.equal(transitionPaymentState('failed', 'completed'), null);
  assert.equal(transitionPaymentState('expired', 'completed'), null);
});

test('pending payment can fail, cancel, or expire', () => {
  assert.equal(transitionPaymentState('pending', 'failed'), 'failed');
  assert.equal(transitionPaymentState('pending', 'cancelled'), 'cancelled');
  assert.equal(transitionPaymentState('pending', 'expired'), 'expired');
});

test('unknown or invalid transitions are rejected', () => {
  assert.equal(transitionPaymentState('pending', 'completed'), 'paid');
  assert.equal(transitionPaymentState('failed', 'failed'), null);
  assert.equal(transitionPaymentState('cancelled', 'cancelled'), null);
});
