// ============================================================
// FILE: src/utils/optimisticUI.ts
// PURPOSE:
//   Optimistic UI manager for instant storefront interactions:
//   - Wishlist toggle with instant UI response and rollback guard
//   - Add to cart with zero-latency visual feedback
//   - Quantity steppers & instant price recalculations
//   - Review submission & status confirmation rollback protection
// ============================================================

export interface OptimisticOperation<T> {
  id: string;
  type: 'wishlist' | 'cart' | 'review' | 'order_confirm';
  optimisticState: T;
  rollbackState: T;
  status: 'pending' | 'success' | 'failed' | 'rolled_back';
  timestamp: number;
}

class OptimisticUIManager {
  private operations: Map<string, OptimisticOperation<unknown>> = new Map();
  private listeners: Set<() => void> = new Set();

  /**
   * Execute an action optimistically, then perform background async persistence.
   * If the persistence fails, calls the rollback handler.
   */
  async executeOptimistic<T>({
    type,
    applyOptimistic,
    commitAsync,
    rollback,
    onError
  }: {
    type: OptimisticOperation<T>['type'];
    applyOptimistic: () => void;
    commitAsync: () => Promise<void>;
    rollback: (err: Error) => void;
    onError?: (err: Error) => void;
  }): Promise<boolean> {
    const opId = `op_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // 1. Immediately apply optimistic UI mutation
    applyOptimistic();
    this.notify();

    // 2. Perform async persistence in background
    try {
      await commitAsync();
      this.operations.delete(opId);
      this.notify();
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.warn(`[OptimisticUI] Operation ${type} failed, rolling back:`, error);
      
      // 3. Rollback state to previous snapshot
      rollback(error);
      if (onError) onError(error);
      this.notify();
      return false;
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  getPendingCount(): number {
    return this.operations.size;
  }
}

export const optimisticUI = new OptimisticUIManager();
