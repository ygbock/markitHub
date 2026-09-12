import { InventoryReservation, InventoryReservationItem, Product } from '../types';

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
  success: boolean; reservation?: InventoryReservation; error?: string;
  insufficientItem?: { productId:string; productName:string; variantSku?:string; requested:number; available:number; onHand:number; activeReserved:number; };
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

function cryptoRandom() {
  const crypto = require('crypto');
  return crypto.randomBytes(12).toString('hex').toUpperCase();
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
  const snap = await db().collection('inventory_reservations')
    .where('status', '==', 'active').get();
  let total = 0;
  for (const doc of snap.docs) {
    if (doc.id === excludeReservationId) continue;
    const r = doc.data() as InventoryReservation;
    if (new Date(r.expiresAt) <= now) {
      await doc.ref.update({ status: 'expired', updatedAt: now.toISOString() });
      continue;
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

export async function reserveInventoryServer(params: ServerReserveParams): Promise<ServerReserveResult> {
  const now = new Date();
  const ttlMinutes = Math.min(30, Math.max(1, Number(params.ttlMinutes || 15)));
  const reservationId = makeId();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60000);
  const products = params.productsCatalog || [];
  const items: InventoryReservationItem[] = [];

  const transactionResult = await db().runTransaction(async (tx: any) => {
    for (const item of params.items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) throw new Error('Product not found: ' + item.productId);
      let onHand = Number(product.stock || 0);
      if (item.variantSku && product.variants) {
        const variant = product.variants.find(v => v.sku === item.variantSku);
        if (!variant) throw new Error('Variant not found: ' + item.variantSku);
        onHand = Number(variant.stock || 0);
      }
      const reservedSnap = await tx.get(db().collection('inventory_reservations')
        .where('status', '==', 'active').get());
      let reserved = 0;
      for (const d of reservedSnap.docs) {
        const r = d.data();
        if (d.id === reservationId) continue;
        if (new Date(r.expiresAt) <= now) continue;
        for (const ri of (r.items || [])) {
          if (ri.productId === item.productId && (!item.variantSku || !ri.variantSku || ri.variantSku === item.variantSku)) reserved += Number(ri.quantity || 0);
        }
      }
      const available = Math.max(0, onHand - reserved);
      if (Number(item.quantity) <= 0 || Number(item.quantity) > available) {
        throw Object.assign(new Error('Insufficient inventory.'), {
          insufficient: { productId:item.productId, productName:product.name, variantSku:item.variantSku, requested:Number(item.quantity), available, onHand, activeReserved:reserved }
        });
      }
      items.push({
        productId:item.productId, productName:product.name, variantSku:item.variantSku,
        quantity:Number(item.quantity), reservedStockBefore:reserved,
        reservedStockAfter:reserved + Number(item.quantity), availableStockRemaining:available - Number(item.quantity)
      });
    }
    const reservation: InventoryReservation = {
      reservationId, orderId:params.orderId, customerId:params.customerId,
      customerName:params.customerName || 'Guest Customer', items,
      createdAt:now.toISOString(), expiresAt:expiresAt.toISOString(), ttlSeconds:ttlMinutes*60, status:'active'
    };
    tx.create(ref(reservationId), reservation);
    return reservation;
  });
  return { success:true, reservation:transactionResult };
}

export async function finalizeReservationServer(reservationId:string, orderId?:string) {
  const result = await db().runTransaction(async (tx:any) => {
    const snap = await tx.get(ref(reservationId));
    if (!snap.exists) throw new Error('Reservation #' + reservationId + ' not found.');
    const r = snap.data() as InventoryReservation;
    if (r.status === 'finalized') return r;
    if (r.status !== 'active') throw new Error('Reservation is no longer active.');
    const updated = {...r, status:'finalized', finalizedAt:new Date().toISOString(), ...(orderId ? {orderId} : {})};
    tx.set(ref(reservationId), updated, {merge:true});
    return updated;
  });
  return {success:true,reservation:result};
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
