import { BatchLotRecord, BatchSaleRecord, Product } from '../types';

/**
 * Creates a new Batch / Lot Record
 */
export function createBatchLot(
  batchNumber: string,
  quantity: number,
  unitCost: number,
  options?: {
    manufactureDate?: string;
    expiryDate?: string;
    supplierName?: string;
    supplierInvoiceRef?: string;
    notes?: string;
  }
): BatchLotRecord {
  const now = new Date().toISOString();
  const cleanBatchNo = batchNumber.trim().toUpperCase();

  return {
    id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    batchNumber: cleanBatchNo,
    quantity,
    initialQuantity: quantity,
    unitCost,
    receivedDate: now,
    manufactureDate: options?.manufactureDate || now.slice(0, 10),
    expiryDate: options?.expiryDate,
    supplierName: options?.supplierName,
    supplierInvoiceRef: options?.supplierInvoiceRef,
    status: quantity > 0 ? 'Active' : 'Depleted',
    salesHistory: [],
    notes: options?.notes,
  };
}

/**
 * Sorts batches based on stock rotation strategy (FEFO, FIFO, LIFO)
 */
export function sortBatchesByRotationMethod(
  batches: BatchLotRecord[],
  rotationMethod: 'FEFO' | 'FIFO' | 'LIFO' | 'MANUAL' = 'FEFO'
): BatchLotRecord[] {
  const activeBatches = batches.filter(b => (b.status === 'Active' || !b.status) && b.quantity > 0);

  return [...activeBatches].sort((a, b) => {
    if (rotationMethod === 'FEFO') {
      // First Expired First Out
      if (a.expiryDate && b.expiryDate) {
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      }
      if (a.expiryDate) return -1;
      if (b.expiryDate) return 1;
    }

    if (rotationMethod === 'LIFO') {
      // Last In First Out
      const timeA = new Date(a.receivedDate || a.manufactureDate || 0).getTime();
      const timeB = new Date(b.receivedDate || b.manufactureDate || 0).getTime();
      return timeB - timeA;
    }

    // Default FIFO (First In First Out)
    const timeA = new Date(a.receivedDate || a.manufactureDate || 0).getTime();
    const timeB = new Date(b.receivedDate || b.manufactureDate || 0).getTime();
    return timeA - timeB;
  });
}

export interface BatchAllocationResult {
  batchId: string;
  batchNumber: string;
  quantityAllocated: number;
  expiryDate?: string;
  unitCost: number;
}

/**
 * Deducts quantity from product batches using FEFO/FIFO strategy
 * and records batch sale history for traceability & recall tracking
 */
export function deductQuantityFromBatches(
  product: Product,
  quantityToDeduct: number,
  orderRef?: { orderId?: string; invoiceRef?: string; customerName?: string; cashierName?: string },
  preferredBatchNumber?: string
): {
  updatedProduct: Product;
  allocations: BatchAllocationResult[];
} {
  if (!product.fifoBatches || product.fifoBatches.length === 0 || quantityToDeduct <= 0) {
    return { updatedProduct: product, allocations: [] };
  }

  const rotationMethod = (product.stockRotationMethod as 'FEFO' | 'FIFO' | 'LIFO' | 'MANUAL') ||
    (product.trackExpiry ? 'FEFO' : 'FIFO');

  let batchQueue: BatchLotRecord[] = [];

  if (preferredBatchNumber) {
    const specific = product.fifoBatches.find(b => b.batchNumber === preferredBatchNumber && b.quantity > 0);
    if (specific) {
      batchQueue = [specific, ...product.fifoBatches.filter(b => b.id !== specific.id)];
    } else {
      batchQueue = sortBatchesByRotationMethod(product.fifoBatches, rotationMethod);
    }
  } else {
    batchQueue = sortBatchesByRotationMethod(product.fifoBatches, rotationMethod);
  }

  let remainingToDeduct = quantityToDeduct;
  const allocations: BatchAllocationResult[] = [];
  const updatedBatchesMap = new Map<string, BatchLotRecord>(product.fifoBatches.map(b => [b.id, { ...b }]));

  const now = new Date().toISOString();

  for (const batch of batchQueue) {
    if (remainingToDeduct <= 0) break;

    const currentBatch = updatedBatchesMap.get(batch.id);
    if (!currentBatch || currentBatch.quantity <= 0 || currentBatch.status === 'Quarantined' || currentBatch.status === 'Recalled') {
      continue;
    }

    const allocQty = Math.min(currentBatch.quantity, remainingToDeduct);
    remainingToDeduct -= allocQty;

    const newQty = currentBatch.quantity - allocQty;

    const saleRecord: BatchSaleRecord = {
      id: `bsale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderId: orderRef?.orderId,
      invoiceRef: orderRef?.invoiceRef,
      quantitySold: allocQty,
      soldAt: now,
      customerName: orderRef?.customerName,
      cashierName: orderRef?.cashierName,
    };

    const updatedBatch: BatchLotRecord = {
      ...currentBatch,
      quantity: newQty,
      status: newQty <= 0 ? 'Depleted' : currentBatch.status || 'Active',
      salesHistory: [...(currentBatch.salesHistory || []), saleRecord],
    };

    updatedBatchesMap.set(batch.id, updatedBatch);

    allocations.push({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      quantityAllocated: allocQty,
      expiryDate: batch.expiryDate,
      unitCost: batch.unitCost,
    });
  }

  const updatedFifoBatches = Array.from(updatedBatchesMap.values());

  return {
    updatedProduct: {
      ...product,
      fifoBatches: updatedFifoBatches,
    },
    allocations,
  };
}

/**
 * Triggers a safety recall for a specific batch/lot.
 * Marks status as 'Recalled', quarantines remaining stock, and compiles affected sales list.
 */
export function triggerBatchRecall(
  product: Product,
  batchIdOrNumber: string,
  recallReason: string
): {
  updatedProduct: Product;
  recalledBatch: BatchLotRecord | null;
  affectedSales: BatchSaleRecord[];
} {
  if (!product.fifoBatches) {
    return { updatedProduct: product, recalledBatch: null, affectedSales: [] };
  }

  let targetBatch: BatchLotRecord | undefined;
  const updatedBatches = product.fifoBatches.map(b => {
    if (b.id === batchIdOrNumber || b.batchNumber === batchIdOrNumber) {
      targetBatch = {
        ...b,
        status: 'Recalled' as const,
        notes: b.notes ? `${b.notes} | RECALLED: ${recallReason}` : `RECALLED: ${recallReason}`,
      };
      return targetBatch;
    }
    return b;
  });

  if (!targetBatch) {
    return { updatedProduct: product, recalledBatch: null, affectedSales: [] };
  }

  return {
    updatedProduct: {
      ...product,
      fifoBatches: updatedBatches,
    },
    recalledBatch: targetBatch,
    affectedSales: targetBatch.salesHistory || [],
  };
}
