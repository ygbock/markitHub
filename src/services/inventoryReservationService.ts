import { InventoryReservation, Product, CartItem } from '../types';
import { reserveInventoryServer, finalizeReservationServer, releaseReservationServer, getActiveReservationsServer } from '../server/inventoryReservationManager';

export interface ReserveInventoryParams {
  items: {
    productId: string;
    productName?: string;
    variantSku?: string;
    quantity: number;
  }[];
  customerId?: string;
  customerName?: string;
  orderId?: string;
  ttlMinutes?: number;
  productsCatalog?: Product[];
}

export class InventoryReservationService {
  /**
   * Reserves inventory prior to payment creation to prevent double-selling.
   */
  static async reserveInventory(params: ReserveInventoryParams): Promise<{
    success: boolean;
    reservation?: InventoryReservation;
    error?: string;
    insufficientItem?: any;
  }> {
    try {
      // Try backend endpoint first
      const res = await fetch('/api/inventory/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('[InventoryReservationService] API route call fallback to local manager:', e);
    }

    // Direct memory/in-app fallback
    return reserveInventoryServer(params);
  }

  /**
   * Finalizes reservation when payment succeeds.
   */
  static async finalizeReservation(reservationId: string, orderId?: string): Promise<{
    success: boolean;
    reservation?: InventoryReservation;
    error?: string;
  }> {
    try {
      const res = await fetch(`/api/inventory/reservations/${reservationId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });

      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('[InventoryReservationService] API finalize fallback:', e);
    }

    return finalizeReservationServer(reservationId, orderId);
  }

  /**
   * Releases reservation if payment is cancelled or fails.
   */
  static async releaseReservation(reservationId: string, reason?: string): Promise<{
    success: boolean;
    reservation?: InventoryReservation;
    error?: string;
  }> {
    try {
      const res = await fetch(`/api/inventory/reservations/${reservationId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('[InventoryReservationService] API release fallback:', e);
    }

    return releaseReservationServer(reservationId, reason);
  }

  /**
   * Retrieves all active reservations
   */
  static async getActiveReservations(): Promise<InventoryReservation[]> {
    try {
      const res = await fetch('/api/inventory/reservations/active');
      if (res.ok) {
        const data = await res.json();
        return data.reservations || [];
      }
    } catch (e) {
      // fallback
    }
    return getActiveReservationsServer();
  }
}
