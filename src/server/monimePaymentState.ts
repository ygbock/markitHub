export type MonimePaymentStatus = 'pending' | 'completed' | 'paid' | 'failed' | 'cancelled' | 'expired';

const TERMINAL = new Set<MonimePaymentStatus>(['paid', 'completed', 'failed', 'cancelled', 'expired']);

export function canTransitionMonimePayment(from: MonimePaymentStatus | string | undefined, to: MonimePaymentStatus): boolean {
  const current = String(from || 'pending').toLowerCase() as MonimePaymentStatus;
  if (current === to) return true;
  if (TERMINAL.has(current)) return false;
  return to === 'completed' || to === 'paid' || to === 'failed' || to === 'cancelled' || to === 'expired';
}

export function validateMonimeSettlement(input: { tenantId: string; sessionTenantId: string; orderTenantId: string; sessionAmount: number; orderAmount: number; sessionCurrency: string; orderCurrency?: string }) {
  if (!input.tenantId || input.sessionTenantId !== input.tenantId || input.orderTenantId !== input.tenantId) return { valid: false, reason: 'tenant_mismatch' as const };
  if (!Number.isFinite(input.sessionAmount) || !Number.isFinite(input.orderAmount) || Math.abs(input.sessionAmount - input.orderAmount) > 0.01) return { valid: false, reason: 'amount_mismatch' as const };
  if (input.orderCurrency && input.sessionCurrency.toUpperCase() !== input.orderCurrency.toUpperCase()) return { valid: false, reason: 'currency_mismatch' as const };
  return { valid: true as const };
}

export function buildMonimeCheckoutUrls(input: {
  appUrl: string;
  orderId: string;
  successUrl?: string;
  cancelUrl?: string;
}) {
  const baseAppUrl = (input.appUrl || '').trim().replace(/\/+$/, '');
  if (!baseAppUrl) {
    throw new Error('APP_URL is not configured on the server.');
  }

  let success: URL;
  let cancel: URL;

  try {
    success = input.successUrl ? new URL(String(input.successUrl), baseAppUrl) : new URL('/checkout/success', baseAppUrl);
    if (!input.successUrl) {
      success.searchParams.set('orderId', String(input.orderId));
    }
  } catch {
    success = new URL('/checkout/success', baseAppUrl);
    success.searchParams.set('orderId', String(input.orderId));
  }

  try {
    cancel = input.cancelUrl ? new URL(String(input.cancelUrl), baseAppUrl) : new URL('/checkout/cancel', baseAppUrl);
    if (!input.cancelUrl) {
      cancel.searchParams.set('orderId', String(input.orderId));
    }
  } catch {
    cancel = new URL('/checkout/cancel', baseAppUrl);
    cancel.searchParams.set('orderId', String(input.orderId));
  }

  return {
    success_url: success.toString(),
    cancel_url: cancel.toString(),
    successUrl: success.toString(),
    cancelUrl: cancel.toString(),
  };
}
