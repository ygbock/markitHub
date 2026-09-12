import { InventoryReservation, InventoryReservationItem, Product } from '../types';

export interface ServerReserveParams {
  items: { productId: string; productName?: string; variantSku?: string; quantity: number; }[];
  customerId?: string; customerName?: string; orderId?: string; ttlMinutes?: number; productsCatalog?: Product[];
}
export interface ServerReserveResult {
  success: boolean; reservation?: InventoryReservation; error?: string;
  insufficientItem?: { productId:string; productName:string; variantSku?:string; requested:number; available:number; onHand:number; activeReserved:number; };
  warnings?: string[];
}

const db = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getFirestore } = require('firebase-admin/firestore');
  return getFirestore();
};

const ref = (id: string) => db().collection('inventory_reservations').doc(id);
const makeId = () => 'RES-' + cryptoRandom();

function cryptoRandom() {
  const crypto = require('crypto');
  return crypto.randomBytes(12).toString('hex').toUpperCase();
}

export async function getActiveReservedQuantity(productId: string, variantSku?: string, excludeReservationId?: string): Promise<number> {
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
    for (const item of r.items || []) {
      if (item.productId === productId && (!variantSku || !item.variantSku || item.variantSku === variantSku)) total += item.quantity;
    }
  }
  return total;
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

export async function releaseReservationServer(reservationId:string, reason='Customer checkout cancelled or payment failed') {
  const result = await db().runTransaction(async (tx:any) => {
    const snap = await tx.get(ref(reservationId));
    if (!snap.exists) throw new Error('Reservation #' + reservationId + ' not found.');
    const r = snap.data() as InventoryReservation;
    if (r.status === 'released') return r;
    if (r.status === 'finalized') throw new Error('Finalized reservation cannot be released.');
    const updated = {...r,status:'released',releasedAt:new Date().toISOString(),releaseReason:reason};
    tx.set(ref(reservationId),updated,{merge:true}); return updated;
  });
  return {success:true,reservation:result};
}

export async function getActiveReservationsServer() {
  const snap = await db().collection('inventory_reservations').where('status','==','active').get();
  const now=Date.now();
  const active: InventoryReservation[]=[];
  for(const doc of snap.docs) {
    const r=doc.data() as InventoryReservation;
    if(new Date(r.expiresAt).getTime()>now) active.push(r);
    else await doc.ref.update({status:'expired',updatedAt:new Date().toISOString()});
  }
  return active;
}
