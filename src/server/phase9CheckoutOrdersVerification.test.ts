import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { OrderLifecycleService } from '../services/orderLifecycleService';

test('Phase 9 Invariant 1: checkout resolves tenant from storefront slug and never trusts a client tenantId', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/storefrontCheckout.ts'), 'utf8');
  assert.match(source, /resolveTenant\(db, req\.params\.tenantSlug\)/);
  assert.doesNotMatch(source, /req\.body\?\.tenantId/);
});

test('Phase 9 Invariant 2: checkout validates server catalog state and ignores browser prices for authority', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/storefrontCheckout.ts'), 'utf8');
  assert.match(source, /collection\('tenants'\)\.doc\(tenant\.id\)\.collection\('products'\)/);
  assert.match(source, /serverUnitPrice/);
  assert.match(source, /priceMismatchDetected/);
  assert.match(source, /ecommerce\?\.published === false/);
});

test('Phase 9 Invariant 3: checkout quote recalculates shipping, discount, tax, currency, and grand total server-side', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/storefrontCheckout.ts'), 'utf8');
  assert.match(source, /shippingCost/);
  assert.match(source, /validateCouponAuthoritative/);
  assert.match(source, /taxAmount/);
  assert.match(source, /grandTotal/);
  assert.match(source, /currency/);
});

test('Phase 9 Invariant 4: order creation uses a Firestore transaction for durable order and reservation creation', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/storefrontCheckout.ts'), 'utf8');
  assert.match(source, /runTransaction\(async/);
  assert.match(source, /collection\('orders'\)\.doc\(orderId\)/);
  assert.match(source, /collection\('inventory_reservations'\)\.doc\(reservationId\)/);
  assert.match(source, /tx\.create\(orderRef/);
  assert.match(source, /tx\.create\(reservationRef/);
});

test('Phase 9 Invariant 5: inventory reservation is tenant-scoped, expiring, and concurrency-aware', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/storefrontCheckout.ts'), 'utf8');
  assert.match(source, /status: 'active'/);
  assert.match(source, /expiresAt/);
  assert.match(source, /reservedBefore/);
  assert.match(source, /available = stockBefore - stockReservedBefore/);
});

test('Phase 9 Invariant 6a: expired reservations are released before new checkout reservations are evaluated', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/storefrontCheckout.ts'), 'utf8');
  assert.match(source, /releaseExpiredReservations/);
  assert.match(source, /where\('status', '==', 'active'\)/);
  assert.match(source, /where\('expiresAt', '<=', now\)/);
  assert.match(source, /status: 'expired'/);
  assert.match(source, /reserved: Math\.max\(0/);
});

test('Phase 9 Invariant 6: order identity is bound to verified authentication when available and guest checkout remains possible', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/storefrontCheckout.ts'), 'utf8');
  assert.match(source, /optionalServerAuth/);
  assert.match(source, /req\.user\?\.uid/);
  assert.match(source, /customerUid = req\.user\?\.uid/);
});

test('Phase 9 Invariant 7: order access uses an unguessable token hash or matching authenticated customer UID', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/storefrontCheckout.ts'), 'utf8');
  assert.match(source, /crypto\.randomBytes\(32\)/);
  assert.match(source, /hashAccessToken/);
  assert.match(source, /ORDER_ACCESS_DENIED/);
  assert.match(source, /order\.customerUid/);
});

test('Phase 9 Invariant 8: cancellation releases reserved quantities transactionally and blocks paid-order cancellation', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/storefrontCheckout.ts'), 'utf8');
  assert.match(source, /PAID_ORDER_CANNOT_BE_CANCELLED/);
  assert.match(source, /status: 'released'/);
  assert.match(source, /reserved: Math\.max\(0/);
  assert.match(source, /variants\[idx\]\.reserved/);
});

test('Phase 9 Invariant 9: authoritative checkout routes are mounted before the legacy storefront order handler', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const phase9 = server.indexOf('registerStorefrontCheckoutRoutes(app');
  const legacy = server.indexOf("app.post('/api/storefront/:tenantSlug/orders'");
  assert.ok(phase9 >= 0 && legacy >= 0 && phase9 < legacy);
  assert.match(server.slice(phase9, phase9 + 800), /optionalServerAuth/);
});

test('Phase 9 Invariant 10: storefront cart, checkout, and orders routes use dedicated authoritative UI surfaces', () => {
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(app, /StorefrontCartPage/);
  assert.match(app, /StorefrontCheckoutPage/);
  assert.match(app, /StorefrontOrdersPage/);
  assert.match(app, /currentRoute\.definition\.id === 'storefront\.cart'/);
  assert.match(app, /currentRoute\.definition\.id === 'storefront\.checkout'/);
  assert.match(app, /currentRoute\.definition\.id === 'storefront\.orders'/);
});

test('Phase 9 Invariant 11: storefront product actions feed the canonical cart instead of the legacy commerce shell', () => {
  const storefront = readFileSync(resolve(process.cwd(), 'src/components/storefront/AuthoritativeStorefrontPage.tsx'), 'utf8');
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(storefront, /onAddToCart/);
  assert.match(app, /addToStorefrontCart/);
  assert.match(app, /AuthoritativeStorefrontPage/);
  assert.doesNotMatch(app, /activeDomain === 'STOREFRONT'.*ECommerceStorefront/s);
});

test('Phase 9 Invariant 12: checkout UI submits only product IDs, quantities, and customer delivery intent; server recalculates pricing', () => {
  const checkout = readFileSync(resolve(process.cwd(), 'src/components/storefront/StorefrontCheckoutPage.tsx'), 'utf8');
  assert.match(checkout, /\/api\/storefront\/.*\/checkout\/validate/);
  assert.match(checkout, /\/api\/storefront\/.*\/orders/);
  assert.match(checkout, /productId/);
  assert.match(checkout, /quantity/);
  assert.match(checkout, /shippingAddress/);
  assert.doesNotMatch(checkout, /price:\s*item\.price/);
});

test('Phase 9 Invariant 13: Monime terminal payment failures and expiry release reservations and reconcile order payment state', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  assert.match(server, /releaseMonimeReservationForTerminalPayment/);
  assert.match(server, /payment\.failed/);
  assert.match(server, /checkout_session\.expired/);
  assert.match(server, /status: terminalPaymentStatus === 'expired' \? 'expired' : 'released'/);
  assert.match(server, /paymentStatus: terminalPaymentStatus/);
  assert.match(server, /status: nextStatus/);
});

test('Phase 9 Invariant 14: Monime payment settlement reconciles both canonical and tenant order mirrors', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  assert.match(server, /paymentProvider: 'monime'/);
  assert.match(server, /collection\('tenants'\)\.doc\(tenantId\)\.collection\('orders'\)\.doc\(String\(orderId\)\)/);
  assert.match(server, /paymentStatus: 'paid'/);
});

test('Phase 9 Invariant 15: fulfillment lifecycle stages 11+ cannot advance an unpaid order', () => {
  const lifecycle = readFileSync(resolve(process.cwd(), 'src/services/orderLifecycleService.ts'), 'utf8');
  assert.match(lifecycle, /const requiresPaidOrder = targetStageId >= 11/);
  assert.match(lifecycle, /currentPaymentStatus !== 'Paid'/);
  assert.match(lifecycle, /return order;/);
});

test('Phase 9 Invariant 16: Monime inventory settlement is transactionally idempotent', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  assert.match(server, /const settlementRef = db\.collection\('payment_settlements'\)\.doc\(String\(tenantId\) \+ '_' \+ String\(sessionId\)\)/);
  assert.match(server, /if \(settlementSnap\.exists\)/);
  assert.match(server, /\['settled', 'duplicate_order_terminal', 'rejected_order_terminal'\]\.includes\(existingSettlementStatus\)/);
  assert.match(server, /const movementId = movementBase \+ '_v_' \+ String\(movementIndex\+\+\)/);
  assert.match(server, /const movementId = movementBase \+ '_p_' \+ String\(movementIndex\+\+\)/);
  assert.match(server, /tx\.create\(db\.collection\('stock_movements'\)\.doc\(movementId\)/);
  assert.match(server, /tx\.create\(settlementRef/);
});

test('Phase 9 Invariant 17: storefront cancellation only releases an active reservation', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/storefrontCheckout.ts'), 'utf8');
  assert.match(source, /const reservationStatus = String\(reservation\.status \|\| ''\)\.toLowerCase\(\)/);
  assert.match(source, /if \(reservationStatus === 'active'\)/);
  assert.match(source, /status: 'released'/);
});

test('Phase 9 Invariant 18: Monime settlement gates on the authoritative order terminal state before reservation finalization', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const settlement = server.slice(server.indexOf("const settlementRef = db.collection('payment_settlements')"));
  const orderGate = settlement.indexOf("const currentPaymentStatus = String(settlementOrder.paymentStatus || settlementOrder.payment_status || '').toLowerCase()");
  const reservationFinalize = settlement.indexOf("status: 'finalized'", orderGate);
  assert.ok(orderGate >= 0);
  assert.ok(reservationFinalize > orderGate);
  assert.match(settlement, /terminalOrderStatus = new Set\(\['failed', 'payment_failed', 'cancelled', 'payment_cancelled', 'expired', 'payment_expired'\]\)/);
  assert.match(settlement, /status: 'rejected_order_terminal'/);
});

test('Phase 9 Invariant 19: a successful webhook for an already-paid order cannot consume its second reservation', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const settlement = server.slice(server.indexOf("const settlementRef = db.collection('payment_settlements')"));
  const duplicateGate = settlement.indexOf("if (['paid', 'completed', 'settled'].includes(currentPaymentStatus))");
  const releaseOnly = settlement.indexOf("releaseMonimeReservationOnly(db, tx, tenantId, reservationId)", duplicateGate);
  const finalize = settlement.indexOf("status: 'finalized'", duplicateGate);
  assert.ok(duplicateGate >= 0);
  assert.ok(releaseOnly > duplicateGate);
  assert.ok(finalize === -1 || finalize > releaseOnly);
  assert.match(settlement, /status: 'duplicate_order_terminal'/);
});

test('Phase 9 Invariant 20: late Monime cancellation/expiry events are durably marked processed', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const cancellationBranch = server.slice(server.indexOf("eventType === 'checkout_session.cancelled'"));
  assert.match(cancellationBranch, /await eventRef\.set\(\{ status: 'processed'/);
});


test('Phase 9 Invariant 21: Monime terminal settlement records are retry-idempotent', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const settlement = server.slice(server.indexOf("const settlementRef = db.collection('payment_settlements')"));
  assert.match(settlement, /if \(settlementSnap\.exists\)/);
  assert.match(settlement, /existingSettlementStatus = String\(settlementSnap\.data\(\)\?\.status \|\| ''\)\.toLowerCase\(\)/);
  assert.match(settlement, /\['settled', 'duplicate_order_terminal', 'rejected_order_terminal'\]\.includes\(existingSettlementStatus\)/);
});

test('Phase 9 Invariant 22: late Monime cancellation/expiry of a completed session marks the webhook event processed before returning', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const cancellationBranch = server.slice(server.indexOf("eventType === 'checkout_session.cancelled'"));
  const terminalReturn = cancellationBranch.indexOf("reason: 'terminal_session_state'");
  const processedMark = cancellationBranch.indexOf("ignored_reason: 'terminal_session_state'");
  assert.ok(processedMark >= 0);
  assert.ok(terminalReturn > processedMark);
});


test('Phase 9 Invariant 23: Monime checkout session creation binds to the durable canonical order, not the legacy in-memory order map', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const checkout = server.slice(server.indexOf("app.post('/api/monime/create-checkout-session'"));
  assert.match(checkout, /const orderRef = db\.collection\('orders'\)\.doc\(String\(orderId\)\)/);
  assert.match(checkout, /const orderSnap = await orderRef\.get\(\)/);
  assert.doesNotMatch(checkout, /const order = serverStorefrontOrders\.get\(String\(orderId\)\)/);
});

test('Phase 9 Invariant 24: Monime session creation uses the order-owned reservation and rejects mismatched or terminal orders', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const checkout = server.slice(server.indexOf("app.post('/api/monime/create-checkout-session'"));
  assert.match(checkout, /authoritativeReservationId = String\(order\.inventoryReservationId \|\| order\.reservation_id \|\| ''\)/);
  assert.match(checkout, /reservationId && String\(reservationId\) !== authoritativeReservationId/);
  assert.match(checkout, /\['paid', 'completed', 'settled'\]\.includes\(orderPaymentStatus\)/);
  assert.match(checkout, /\['cancelled', 'payment_cancelled', 'failed', 'payment_failed', 'expired', 'payment_expired'\]/);
});

test('Phase 9 Invariant 25: repeated Monime session requests reuse an existing active session and use tenant-order idempotency', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const checkout = server.slice(server.indexOf("app.post('/api/monime/create-checkout-session'"));
  assert.match(checkout, /collection\('monime_sessions'\)[\s\S]*where\('tenant_id', '==', tenantId\)[\s\S]*where\('order_id', '==', String\(orderId\)\)/);
  assert.match(checkout, /reusableSession\?\.monime_session_id/);
  assert.match(checkout, /reused: true/);
  assert.match(checkout, /update\(tenantId \+ ':' \+ String\(orderId\)/);
});

test('Phase 9 Invariant 26: Monime payable amount and line items are rebuilt from the authoritative persisted order', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const checkout = server.slice(server.indexOf("app.post('/api/monime/create-checkout-session'"));
  assert.match(checkout, /const authoritativeItems = Array\.isArray\(order\.items\) \? order\.items : \[\]/);
  assert.match(checkout, /const authoritativeTotal = Number\(order\.grandTotal \?\? order\.totalAmount \?\? order\.total/);
  assert.match(checkout, /const authoritativeCurrency = String\(order\.currency \|\| ''\)\.trim\(\)\.toUpperCase\(\)/);
  assert.match(checkout, /const totalAmount = authoritativeTotal/);
});

test('Phase 9 Invariant 27: persisted Monime session identity and payable payload remain authoritative after provider creation', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const checkout = server.slice(server.indexOf("app.post('/api/monime/create-checkout-session'"));
  assert.match(checkout, /reservation_id: effectiveReservationId/);
  assert.match(checkout, /currency: authoritativeCurrency/);
  assert.match(checkout, /line_items: lineItems/);
  assert.match(checkout, /reference: orderId/);
  assert.match(checkout, /'Idempotency-Key': idempotencyKey/);
});

test('Phase 9 Invariant 28: lifecycle initialization cannot default an unpaid storefront order to Paid', () => {
  const lifecycle = readFileSync(resolve(process.cwd(), 'src/services/orderLifecycleService.ts'), 'utf8');
  assert.match(lifecycle, /normalizedPaymentStatus\s*=\s*String\(\s*\(order as any\)\.paymentStatus\s*\|\|\s*\(order as any\)\.payment_status/);
  assert.match(lifecycle, /isPaid\s*=\s*\[\s*'paid'\s*,\s*'completed'\s*,\s*'settled'\s*,\s*'captured'\s*\]\.includes\(\s*normalizedPaymentStatus\s*\)/);
  assert.match(lifecycle, /paymentStatus\s*:\s*OrderDomainPaymentStatus\s*=\s*'Pending Verification'/);
  assert.match(lifecycle, /fulfillmentStatus\s*:\s*OrderDomainFulfillmentStatus\s*=\s*'Reserved'/);
  assert.match(lifecycle, /requiresPaidOrder\s*=\s*targetStageId\s*>=\s*11/);
});


test('Phase 9 Invariant 29: explicit failed/pending/refunded payment state cannot be overwritten by legacy delivered/dispatched status during lifecycle initialization', () => {
  const lifecycle = readFileSync(resolve(process.cwd(), 'src/services/orderLifecycleService.ts'), 'utf8');
  assert.match(lifecycle, /const hasExplicitPaymentStatus = normalizedPaymentStatus\.length > 0/);
  assert.match(lifecycle, /if \(!hasExplicitPaymentStatus \|\| isPaid\)/);
  assert.match(lifecycle, /paymentStatus = 'Failed'/);
  assert.match(lifecycle, /paymentStatus = 'Refunded'/);
  assert.doesNotMatch(
    lifecycle,
    /if \(order\.status === 'Completed'[\s\S]*?paymentStatus = 'Paid'[\s\S]*?startStageId = 27;\n    \} else if/,
  );
});

test('Phase 9 Invariant 30: lifecycle transitions cannot skip stages or move a completed lifecycle backward', () => {
  const lifecycle = readFileSync(resolve(process.cwd(), 'src/services/orderLifecycleService.ts'), 'utf8');
  assert.match(
    lifecycle,
    /targetStageId\s*!==\s*currentStageId\s*&&\s*!allowedNext\.includes\(\s*targetStageId\s*\)/,
  );
  assert.match(lifecycle, /currentStageId >= 27/);
  assert.match(lifecycle, /targetStageId < currentStageId/);
  assert.match(
    lifecycle,
    /filter\(stg => stg\.status === 'completed' \|\| stg\.status === 'in_progress'\)/,
  );
});

test('Phase 9 Invariant 31: lifecycle domain prerequisites prevent impossible fulfillment, shipping, delivery, and return transitions', () => {
  const lifecycle = readFileSync(resolve(process.cwd(), 'src/services/orderLifecycleService.ts'), 'utf8');
  assert.match(lifecycle, /10: \(\) => currentPaymentStatus === 'Paid'/);
  assert.match(lifecycle, /11: \(\) => domainStatuses\.fulfillmentStatus === 'Reserved'/);
  assert.match(lifecycle, /18: \(\) => domainStatuses\.fulfillmentStatus === 'QC Passed'/);
  assert.match(lifecycle, /20: \(\) => domainStatuses\.shipmentStatus === 'Courier Assigned'/);
  assert.match(lifecycle, /24: \(\) => domainStatuses\.shipmentStatus === 'Out for Delivery'/);
  assert.match(lifecycle, /26: \(\) => domainStatuses\.shipmentStatus === 'Delivered'/);
  assert.match(lifecycle, /27: \(\) => domainStatuses\.shipmentStatus === 'Delivered' && domainStatuses\.fulfillmentStatus === 'Fulfilled'/);
  assert.match(lifecycle, /30: \(\) => domainStatuses\.orderStatus === 'Completed' && domainStatuses\.shipmentStatus === 'Delivered'/);
});

test('Phase 9 Invariant 32: picking exception is optional on the happy path but resolves into packing', () => {
  const lifecycle = readFileSync(resolve(process.cwd(), 'src/services/orderLifecycleService.ts'), 'utf8');
  assert.match(lifecycle, /14: \[15, 16\]/);
  assert.match(lifecycle, /15: \[16\]/);
  assert.match(lifecycle, /16: \(\) => domainStatuses\.fulfillmentStatus === 'Pick Exception' \|\| domainStatuses\.fulfillmentStatus === 'Picking'/);
});

test('Phase 9 Invariant 34: return lifecycle cannot start before a paid completed delivery and cannot skip reverse-logistics states', () => {
  const lifecycle = readFileSync(resolve(process.cwd(), 'src/services/orderLifecycleService.ts'), 'utf8');
  assert.match(lifecycle, /static transitionReturnStatus\(/);
  assert.match(lifecycle, /orderStatus !== 'Completed'/);
  assert.match(lifecycle, /shipmentStatus !== 'Delivered'/);
  assert.match(lifecycle, /paymentStatus !== 'Paid'/);
  assert.match(lifecycle, /'Return Requested': \['Return Approved', 'Return Rejected'\]/);
  assert.match(lifecycle, /'Return Approved': \['Reverse Pickup In-Transit'\]/);
  assert.match(lifecycle, /'Reverse Pickup In-Transit': \['Item Inspected'\]/);
  assert.match(lifecycle, /'Item Inspected': \['Restocked'\]/);
  assert.match(lifecycle, /'Restocked': \['Refund Issued'\]/);
});

test('Phase 9 Invariant 35: restocking and refund issuance require idempotency transaction identifiers', () => {
  const lifecycle = readFileSync(resolve(process.cwd(), 'src/services/orderLifecycleService.ts'), 'utf8');
  assert.match(lifecycle, /restockTransactionId\?: string/);
  assert.match(lifecycle, /refundTransactionId\?: string/);
  assert.match(lifecycle, /targetStatus === 'Restocked'.*restockTransactionId/s);
  assert.match(lifecycle, /targetStatus === 'Refund Issued'.*refundTransactionId/s);
});

test('Phase 9 Invariant 36: refund issuance atomically reconciles payment, fulfillment, legacy order state, and refund timestamp fields', () => {
  const lifecycle = readFileSync(resolve(process.cwd(), 'src/services/orderLifecycleService.ts'), 'utf8');
  const refund = lifecycle.slice(lifecycle.indexOf("targetStatus === 'Refund Issued'"));
  assert.match(refund, /updated\.status = 'Refunded'/);
  assert.match(refund, /next\.paymentStatus = 'Refunded'/);
  assert.match(refund, /next\.fulfillmentStatus = 'Returned to Stock'/);
  assert.match(refund, /updated\.refundedAt = now/);
  assert.match(refund, /updated\.refundAmount = Number\(/);
});

test('Phase 9 Invariant 37: terminal return states cannot be advanced or resurrected', () => {
  const lifecycle = readFileSync(resolve(process.cwd(), 'src/services/orderLifecycleService.ts'), 'utf8');
  assert.match(lifecycle, /'Refund Issued': \[\]/);
  assert.match(lifecycle, /'Return Rejected': \[\]/);
  assert.match(lifecycle, /if \(targetStatus === currentReturn\) return order/);
  assert.match(lifecycle, /if \(!allowed\[currentReturn\]\.includes\(targetStatus\)\) return order/);
});

test('Phase 9 Invariant 38: legacy refund-request initialization takes precedence over delivered/completed legacy fields', () => {
  const lifecycle = readFileSync(resolve(process.cwd(), 'src/services/orderLifecycleService.ts'), 'utf8');
  const returnBranch = lifecycle.indexOf('A return request is a post-delivery state');
  const completedBranch = lifecycle.indexOf("order.status === 'Completed'", returnBranch);
  assert.ok(returnBranch >= 0);
  assert.ok(completedBranch > returnBranch);
  assert.match(lifecycle.slice(returnBranch, completedBranch), /startStageId = 30/);
});


test('Phase 9 Invariant 39: return transition runtime rejects an undelivered order', () => {
  const order: any = {
    id: 'ORD-RETURN-1',
    date: new Date().toISOString(),
    status: 'Completed',
    total: 100,
    paymentMethod: 'Digital Wallet',
    channel: 'Online Storefront',
    lifecycleDomainStatuses: {
      orderStatus: 'Completed',
      paymentStatus: 'Paid',
      fulfillmentStatus: 'Fulfilled',
      shipmentStatus: 'In Transit',
      returnStatus: 'None',
      lastUpdated: new Date().toISOString(),
    },
  };
  const result = OrderLifecycleService.transitionReturnStatus(order, 'Return Requested');
  assert.equal(result, order);
});

test('Phase 9 Invariant 40: return transition runtime enforces the ordered reverse-logistics state machine', () => {
  const order: any = {
    id: 'ORD-RETURN-2',
    date: new Date().toISOString(),
    status: 'Completed',
    total: 100,
    paymentMethod: 'Digital Wallet',
    channel: 'Online Storefront',
    lifecycleDomainStatuses: {
      orderStatus: 'Completed',
      paymentStatus: 'Paid',
      fulfillmentStatus: 'Fulfilled',
      shipmentStatus: 'Delivered',
      returnStatus: 'None',
      lastUpdated: new Date().toISOString(),
    },
  };
  const requested = OrderLifecycleService.transitionReturnStatus(order, 'Return Requested');
  assert.equal(requested.lifecycleDomainStatuses?.returnStatus, 'Return Requested');
  const skipped = OrderLifecycleService.transitionReturnStatus(requested, 'Item Inspected');
  assert.equal(skipped, requested);
  const approved = OrderLifecycleService.transitionReturnStatus(requested, 'Return Approved');
  assert.equal(approved.lifecycleDomainStatuses?.returnStatus, 'Return Approved');
});

test('Phase 9 Invariant 41: refund issuance runtime requires restock and refund transaction identifiers', () => {
  const order: any = {
    id: 'ORD-RETURN-3',
    date: new Date().toISOString(),
    status: 'Completed',
    total: 100,
    grandTotal: 100,
    paymentMethod: 'Digital Wallet',
    channel: 'Online Storefront',
    lifecycleDomainStatuses: {
      orderStatus: 'Completed',
      paymentStatus: 'Paid',
      fulfillmentStatus: 'Fulfilled',
      shipmentStatus: 'Delivered',
      returnStatus: 'Restocked',
      lastUpdated: new Date().toISOString(),
    },
  };
  const withoutRefundId = OrderLifecycleService.transitionReturnStatus(order, 'Refund Issued', { restockTransactionId: 'RESTOCK-1' });
  assert.equal(withoutRefundId, order);
  const refunded = OrderLifecycleService.transitionReturnStatus(order, 'Refund Issued', {
    restockTransactionId: 'RESTOCK-1',
    refundTransactionId: 'REFUND-1',
  });
  assert.equal(refunded.status, 'Refunded');
  assert.equal(refunded.lifecycleDomainStatuses?.paymentStatus, 'Refunded');
  assert.equal(refunded.lifecycleDomainStatuses?.fulfillmentStatus, 'Returned to Stock');
  assert.equal(refunded.refundAmount, 100);
});

test('Phase 9 Invariant 43: transitionToStage cannot bootstrap directly into a later lifecycle stage', () => {
  const order: any = {
    id: 'ORD-LIFECYCLE-BOOTSTRAP-1',
    date: new Date().toISOString(),
    status: 'Paid',
    total: 100,
    paymentMethod: 'Digital Wallet',
    channel: 'Online Storefront',
    paymentStatus: 'paid',
  };
  const result = OrderLifecycleService.transitionToStage(order, 12);
  assert.equal(result, order);
  assert.equal(result.currentLifecycleStageId, undefined);
});

test('Phase 9 Invariant 44: Monime settlement synchronizes existing lifecycle payment state and payment-success stages', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const settlement = server.slice(server.indexOf('const lifecyclePaymentPatch = existingLifecycle'));
  assert.match(settlement, /paymentStatus: 'paid'/);
  assert.match(settlement, /lifecycleDomainStatuses: lifecyclePaymentPatch/);
  assert.match(settlement, /lifecycleStages: lifecycleStagePatch\.stages/);
  assert.match(settlement, /currentLifecycleStageId: lifecycleStagePatch\.currentLifecycleStageId/);
  assert.match(settlement, /existingCurrentStage < 10/);
  assert.match(settlement, /stage\.stageId >= 7 && stage\.stageId <= 9/);
});

test('Phase 9 Invariant 45: terminal payment events cannot leave lifecycle fulfillment payable', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const terminal = server.slice(server.indexOf('const orderLifecycle = order.lifecycleDomainStatuses'));
  assert.match(terminal, /paymentStatus: 'Failed'/);
  assert.match(terminal, /fulfillmentStatus: 'Unfulfilled'/);
  assert.match(terminal, /status: 'exception'/);
  assert.match(terminal, /currentLifecycleStageId: 7/);
  assert.match(terminal, /currentLifecyclePhaseId: 3/);
  assert.match(terminal, /terminalPaymentStatus === 'cancelled' \|\| terminalPaymentStatus === 'expired'/);
});

test('Phase 9 Invariant 42: terminal return states cannot be advanced at runtime', () => {
  const order: any = {
    id: 'ORD-RETURN-4',
    date: new Date().toISOString(),
    status: 'Refunded',
    total: 100,
    paymentMethod: 'Digital Wallet',
    channel: 'Online Storefront',
    lifecycleDomainStatuses: {
      orderStatus: 'Completed',
      paymentStatus: 'Refunded',
      fulfillmentStatus: 'Returned to Stock',
      shipmentStatus: 'Delivered',
      returnStatus: 'Refund Issued',
      lastUpdated: new Date().toISOString(),
    },
  };
  const result = OrderLifecycleService.transitionReturnStatus(order, 'Return Requested');
  assert.equal(result, order);
});

test('Phase 9 Invariant 46: successful Monime inventory settlement synchronizes lifecycle reservation state without advancing into WMS allocation', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const settlement = server.slice(server.indexOf('const lifecyclePaymentPatch = existingLifecycle'));
  assert.match(settlement, /fulfillmentStatus: \['Unfulfilled', 'Reserved'\]\.includes\(String\(existingLifecycle\.fulfillmentStatus \|\| ''\)\)/);
  assert.match(settlement, /const withReservationStage = next\.map/);
  assert.match(settlement, /stage\.stageId === 10/);
  assert.match(settlement, /status: 'completed'/);
  assert.match(settlement, /existingCurrentStage < 10/);
  assert.doesNotMatch(settlement, /currentLifecycleStageId: 11/);
  assert.doesNotMatch(settlement, /currentLifecycleStageId: 12/);
});

test('Phase 9 Invariant 47: warehouse dispatch does not prematurely mark fulfillment complete', () => {
  const lifecycle = readFileSync(resolve(process.cwd(), 'src/services/orderLifecycleService.ts'), 'utf8');
  const dispatch = lifecycle.slice(
    lifecycle.indexOf("name: 'Stage 20 — Warehouse Dispatch'"),
    lifecycle.indexOf("name: 'Stage 21 — Customer Tracking'")
  );
  assert.doesNotMatch(dispatch, /fulfillmentStatus: 'Fulfilled'/);
  assert.match(dispatch, /shipmentStatus: 'Dispatched'/);

  const finalInventory = lifecycle.slice(
    lifecycle.indexOf("name: 'Stage 26 — Inventory is Finally Completed'"),
    lifecycle.indexOf("name: 'Stage 27 — Order Completed'")
  );
  assert.match(finalInventory, /fulfillmentStatus: 'Fulfilled'/);
});

test('Phase 9 Invariant 48: stage 26 requires an authoritative inventory ledger finalization transaction', () => {
  const lifecycle = readFileSync(resolve(process.cwd(), 'src/services/orderLifecycleService.ts'), 'utf8');
  const stage26Prerequisite = lifecycle.slice(
    lifecycle.indexOf("26: () =>"),
    lifecycle.indexOf("27: () =>")
  );
  assert.match(stage26Prerequisite, /shipmentStatus === 'Delivered'/);
  assert.match(stage26Prerequisite, /inventoryFinalizationTransactionId/);

  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const settlement = server.slice(server.indexOf('const inventoryFinalizationTransactionId'));
  assert.match(settlement, /INV-SETTLEMENT-/);
  assert.match(settlement, /inventoryFinalizedAt: paidAt/);
});


test('Phase 9 Invariant 49: inventory finalization identity is deterministic and terminal settlement retries cannot overwrite it', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const settlement = server.slice(server.indexOf("const settlementRef = db.collection('payment_settlements')"));
  assert.match(settlement, /\['settled', 'duplicate_order_terminal', 'rejected_order_terminal'\]\.includes\(existingSettlementStatus\)/);
  assert.match(settlement, /if \(settlementSnap\.exists\)/);

  const inventoryIdentity = server.slice(server.indexOf('const inventoryFinalizationTransactionId'));
  assert.match(
    inventoryIdentity,
    /const inventoryFinalizationTransactionId = reservationId\s*\?\s*'INV-SETTLEMENT-' \+ String\(tenantId\) \+ '-' \+ String\(sessionId\)/,
  );
  assert.match(inventoryIdentity, /inventoryFinalizedAt: paidAt/);
  assert.match(inventoryIdentity, /monimeSessionId: String\(sessionId\)/);
});
