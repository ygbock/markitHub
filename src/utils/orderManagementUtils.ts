import { Order, AdminNotification, RefundRequestDetails } from '../types';

export const RECEIPT_CONFIRMATION_WINDOW_HOURS = 48;
export const RECEIPT_CONFIRMATION_WINDOW_MS = RECEIPT_CONFIRMATION_WINDOW_HOURS * 60 * 60 * 1000;

export interface OrderDeliveryTelemetry {
  effectiveStatus: Order['status'];
  isAwaitingReceiptConfirmation: boolean;
  hoursRemaining: number;
  minutesRemaining: number;
  timeRemainingFormatted: string;
  percentElapsed: number;
  isExpiredAutoConfirmed: boolean;
  deliveredTimestamp: number | null;
  expiryTimestamp: number | null;
}

/**
 * Calculates real-time 48-hour post-delivery window status and automatic confirmation lifecycle
 */
export function getOrderDeliveryTelemetry(order: Order, currentTime: number = Date.now()): OrderDeliveryTelemetry {
  // If order was explicitly refunded or has a refund request active
  if (order.refundRequested || order.status === 'Refund Requested') {
    return {
      effectiveStatus: 'Refund Requested',
      isAwaitingReceiptConfirmation: false,
      hoursRemaining: 0,
      minutesRemaining: 0,
      timeRemainingFormatted: 'Dispute / Refund Active',
      percentElapsed: 100,
      isExpiredAutoConfirmed: false,
      deliveredTimestamp: order.deliveredTimestamp || null,
      expiryTimestamp: order.awaitingReceiptExpiry || null
    };
  }

  if (order.status === 'Refunded' || order.status === 'Partially Refunded') {
    return {
      effectiveStatus: order.status,
      isAwaitingReceiptConfirmation: false,
      hoursRemaining: 0,
      minutesRemaining: 0,
      timeRemainingFormatted: 'Refunded',
      percentElapsed: 100,
      isExpiredAutoConfirmed: false,
      deliveredTimestamp: order.deliveredTimestamp || null,
      expiryTimestamp: order.awaitingReceiptExpiry || null
    };
  }

  // Check if order has explicit receipt confirmation
  if (order.receiptConfirmed) {
    return {
      effectiveStatus: 'Completed',
      isAwaitingReceiptConfirmation: false,
      hoursRemaining: 0,
      minutesRemaining: 0,
      timeRemainingFormatted: 'Receipt Confirmed by Customer',
      percentElapsed: 100,
      isExpiredAutoConfirmed: false,
      deliveredTimestamp: order.deliveredTimestamp || null,
      expiryTimestamp: order.awaitingReceiptExpiry || null
    };
  }

  // Determine delivery timestamp
  let deliveryTs: number | null = order.deliveredTimestamp || null;
  if (!deliveryTs && order.deliveredDate) {
    const parsed = new Date(order.deliveredDate).getTime();
    if (!isNaN(parsed)) deliveryTs = parsed;
  }

  // If status is 'Awaiting Receipt Confirmation' or marked Delivered without explicit timestamp, default to order date or 1 day ago
  if (!deliveryTs && (order.status === 'Awaiting Receipt Confirmation' || order.deliveryStatus === 'Delivered')) {
    const parsedOrderDate = new Date(order.date).getTime();
    deliveryTs = isNaN(parsedOrderDate) ? currentTime - (12 * 3600 * 1000) : parsedOrderDate;
  }

  // If not delivered yet (Pending/Dispatched/In-Transit)
  if (!deliveryTs && order.status !== 'Awaiting Receipt Confirmation') {
    return {
      effectiveStatus: order.status,
      isAwaitingReceiptConfirmation: false,
      hoursRemaining: 0,
      minutesRemaining: 0,
      timeRemainingFormatted: 'In Fulfillment / Delivery',
      percentElapsed: 0,
      isExpiredAutoConfirmed: false,
      deliveredTimestamp: null,
      expiryTimestamp: null
    };
  }

  const expiryTs = deliveryTs ? deliveryTs + RECEIPT_CONFIRMATION_WINDOW_MS : currentTime + RECEIPT_CONFIRMATION_WINDOW_MS;
  const msRemaining = expiryTs - currentTime;

  // If 48 hours have elapsed post-delivery and no dispute was filed
  if (msRemaining <= 0) {
    return {
      effectiveStatus: 'Completed',
      isAwaitingReceiptConfirmation: false,
      hoursRemaining: 0,
      minutesRemaining: 0,
      timeRemainingFormatted: 'Auto-Confirmed (48h Window Concluded)',
      percentElapsed: 100,
      isExpiredAutoConfirmed: true,
      deliveredTimestamp: deliveryTs,
      expiryTimestamp: expiryTs
    };
  }

  // Within the 48-hour post-delivery window
  const totalMinutesRemaining = Math.max(0, Math.floor(msRemaining / (1000 * 60)));
  const hours = Math.floor(totalMinutesRemaining / 60);
  const mins = totalMinutesRemaining % 60;
  const timeElapsedMs = RECEIPT_CONFIRMATION_WINDOW_MS - msRemaining;
  const percentElapsed = Math.min(100, Math.max(0, Math.round((timeElapsedMs / RECEIPT_CONFIRMATION_WINDOW_MS) * 100)));

  return {
    effectiveStatus: 'Awaiting Receipt Confirmation',
    isAwaitingReceiptConfirmation: true,
    hoursRemaining: hours,
    minutesRemaining: mins,
    timeRemainingFormatted: `${hours}h ${mins}m remaining`,
    percentElapsed,
    isExpiredAutoConfirmed: false,
    deliveredTimestamp: deliveryTs,
    expiryTimestamp: expiryTs
  };
}

/**
 * Returns a new Order object marked as Delivered, initializing the 48h confirmation window
 */
export function flagOrderAsDelivered(order: Order, deliveredAt: string = new Date().toISOString()): Order {
  const deliveryTs = new Date(deliveredAt).getTime();
  const expiryTs = deliveryTs + RECEIPT_CONFIRMATION_WINDOW_MS;

  return {
    ...order,
    status: 'Awaiting Receipt Confirmation',
    deliveryStatus: 'Delivered',
    deliveredDate: deliveredAt.split('T')[0],
    deliveredTimestamp: deliveryTs,
    awaitingReceiptUntil: new Date(expiryTs).toISOString(),
    awaitingReceiptExpiry: expiryTs,
    receiptConfirmed: false,
    notes: `${order.notes ? order.notes + ' | ' : ''}Delivered at ${new Date(deliveredAt).toLocaleString()}. 48h confirmation window initiated.`
  };
}

/**
 * Creates an urgent AdminNotification payload when a customer requests a refund/return
 */
export function buildAdminRefundNotification(
  order: Order, 
  dispute: {
    rmaNumber: string;
    reason: string;
    resolution: string;
    notes?: string;
    photoUrl?: string;
  }
): AdminNotification {
  const shortOrderId = order.orderNumber || `ORD-${order.id.split('-').pop()?.toUpperCase()}`;
  return {
    id: `notif-rma-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: 'refund_request',
    title: `🚨 Customer Refund Request: ${dispute.rmaNumber}`,
    message: `${order.customerName || 'Customer'} initiated a ${dispute.resolution.toLowerCase()} for Order #${shortOrderId} ($${order.total.toFixed(2)}). Reason: ${dispute.reason}`,
    orderId: order.id,
    orderNumber: shortOrderId,
    customerId: order.customerId,
    customerName: order.customerName,
    amount: order.total,
    rmaNumber: dispute.rmaNumber,
    reason: dispute.reason,
    resolution: dispute.resolution,
    timestamp: new Date().toISOString(),
    read: false,
    priority: 'urgent',
    actionUrl: `/invoices?order=${order.id}&rma=${dispute.rmaNumber}`
  };
}
