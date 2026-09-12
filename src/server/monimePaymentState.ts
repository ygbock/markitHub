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
