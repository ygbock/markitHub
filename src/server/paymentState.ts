export type PaymentState = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'expired';

export type PaymentEvent = 'checkout_created' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired';

const terminalStates = new Set<PaymentState>(['paid', 'failed', 'cancelled', 'expired']);

/**
 * Returns the safe next state for a payment event. Invalid terminal transitions are rejected.
 * Replaying a completed event against an already-paid payment is idempotent.
 */
export function transitionPaymentState(current: PaymentState, event: PaymentEvent): PaymentState | null {
  if (current === 'paid') return event === 'completed' ? 'paid' : null;
  if (terminalStates.has(current)) return null;

  switch (event) {
    case 'checkout_created':
      return current === 'pending' ? 'pending' : null;
    case 'processing':
      return current === 'pending' ? 'processing' : null;
    case 'completed':
      return current === 'pending' || current === 'processing' ? 'paid' : null;
    case 'failed':
      return current === 'pending' || current === 'processing' ? 'failed' : null;
    case 'cancelled':
      return current === 'pending' || current === 'processing' ? 'cancelled' : null;
    case 'expired':
      return current === 'pending' || current === 'processing' ? 'expired' : null;
    default:
      return null;
  }
}
