import { InventoryReservation, InventoryReservationItem, Product, CartItem } from '../types';

// In-memory server-authoritative reservations registry
const SERVER_RESERVATIONS_STORE = new Map<string, InventoryReservation>();

export interface ServerReserveParams {
  tenantId?: string;
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

export interface ServerReserveResult {
  success: boolean;
  reservation?: InventoryReservation;
  error?: string;
  insufficientItem?: {
    productId: string;
    productName: string;
    variantSku?: string;
    requested: number;
    available: number;
    onHand: number;
    activeReserved: number;
  };
  warnings?: string[];
}

/**
 * Calculates current active reserved quantity for a specific product and optional variantSku
 */
export function getActiveReservedQuantity(
  productId: string, 
  variantSku?: string,
  excludeReservationId?: string,
  tenantId?: string
): number {
  const now = new Date().getTime();
  let totalReserved = 0;

  for (const [id, res] of SERVER_RESERVATIONS_STORE.entries()) {
    if (excludeReservationId && id === excludeReservationId) continue;
    if (tenantId && res.tenantId && res.tenantId !== tenantId) continue;
    
    // Check if expired
    if (res.status === 'active' && new Date(res.expiresAt).getTime() > now) {
      for (const item of res.items) {
        if (item.productId === productId) {
          if (!variantSku || !item.variantSku || item.variantSku === variantSku) {
            totalReserved += item.quantity;
          }
        }
      }
    } else if (res.status === 'active' && new Date(res.expiresAt).getTime() <= now) {
      // Auto mark expired
      res.status = 'expired';
    }
  }

  return totalReserved;
}

/**
 * Authoritative Server Stock Reservation
 * Prevents selling items that have already been purchased or reserved by another concurrent customer.
 */
export function reserveInventoryServer(params: ServerReserveParams): ServerReserveResult {
  const {
    tenantId,
    items,
    customerId,
    customerName = 'Guest Customer',
    orderId,
    ttlMinutes = 15,
    productsCatalog = []
  } = params;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);
  const ttlSeconds = ttlMinutes * 60;
  const reservationId = `RES-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const reservedItems: InventoryReservationItem[] = [];

  // Phase 1: Pre-flight Concurrency & Availability Verification
  for (const item of items) {
    const product = productsCatalog.find(p => p.id === item.productId);
    const productName = item.productName || product?.name || `Product #${item.productId}`;

    let onHandStock = product?.stock ?? 0;

    // Check variant stock if variant SKU provided
    if (item.variantSku && product?.variants) {
      const variant = product.variants.find(v => v.sku === item.variantSku);
      if (variant) {
        onHandStock = variant.stock ?? 0;
      }
    }

    const currentActiveReserved = getActiveReservedQuantity(item.productId, item.variantSku, undefined, tenantId);
    const availableStock = Math.max(0, onHandStock - currentActiveReserved);

    if (item.quantity > availableStock) {
      return {
        success: false,
        error: `Insufficient available inventory for "${productName}". Requested: ${item.quantity}, Available: ${availableStock} (On Hand: ${onHandStock}, Reserved by other shoppers: ${currentActiveReserved}).`,
        insufficientItem: {
          productId: item.productId,
          productName,
          variantSku: item.variantSku,
          requested: item.quantity,
          available: availableStock,
          onHand: onHandStock,
          activeReserved: currentActiveReserved
        }
      };
    }

    reservedItems.push({
      productId: item.productId,
      productName,
      variantSku: item.variantSku,
      quantity: item.quantity,
      reservedStockBefore: currentActiveReserved,
      reservedStockAfter: currentActiveReserved + item.quantity,
      availableStockRemaining: availableStock - item.quantity
    });
  }

  // Phase 2: Create Active Reservation Lock
  const reservation: InventoryReservation = {
    reservationId,
    tenantId,
    orderId,
    customerId,
    customerName,
    items: reservedItems,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    ttlSeconds,
    status: 'active'
  };

  SERVER_RESERVATIONS_STORE.set(reservationId, reservation);

  return {
    success: true,
    reservation
  };
}

/**
 * Finalizes an inventory reservation once payment is confirmed
 */
export function finalizeReservationServer(
  reservationId: string, 
  orderId?: string
): { success: boolean; reservation?: InventoryReservation; error?: string } {
  const reservation = SERVER_RESERVATIONS_STORE.get(reservationId);
  if (!reservation) {
    return { success: false, error: `Reservation #${reservationId} not found.` };
  }

  if (reservation.status === 'finalized') {
    return { success: true, reservation };
  }

  if (reservation.status === 'released' || reservation.status === 'expired') {
    return { success: false, error: `Reservation #${reservationId} has already expired or been released.` };
  }

  reservation.status = 'finalized';
  reservation.finalizedAt = new Date().toISOString();
  if (orderId) {
    reservation.orderId = orderId;
  }

  return { success: true, reservation };
}

/**
 * Releases an inventory reservation if payment is cancelled or times out
 */
export function releaseReservationServer(
  reservationId: string, 
  reason = 'Customer checkout cancelled or payment failed'
): { success: boolean; reservation?: InventoryReservation; error?: string } {
  const reservation = SERVER_RESERVATIONS_STORE.get(reservationId);
  if (!reservation) {
    return { success: false, error: `Reservation #${reservationId} not found.` };
  }

  if (reservation.status === 'released') {
    return { success: true, reservation };
  }

  reservation.status = 'released';
  reservation.releasedAt = new Date().toISOString();
  reservation.releaseReason = reason;

  return { success: true, reservation };
}

/**
 * Get all active unexpired reservations
 */
export function getActiveReservationsServer(tenantId?: string): InventoryReservation[] {
  const now = new Date().getTime();
  const active: InventoryReservation[] = [];

  for (const res of SERVER_RESERVATIONS_STORE.values()) {
    if (res.status === 'active' && new Date(res.expiresAt).getTime() > now) {
      if (!tenantId || !res.tenantId || res.tenantId === tenantId) {
        active.push(res);
      }
    }
  }

  return active;
}
