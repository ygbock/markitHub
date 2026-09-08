import { Product, ProductVariant } from '../types';

export type AvailabilityStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface AvailabilityInfo {
  onHand: number;
  reserved: number;
  available: number;
  status: AvailabilityStatus;
  badgeLabel: string;
  lowStockMessage: string | null;
  isLowStock: boolean;
  isAvailable: boolean;
  allowBackorder: boolean;
  allowNotifyMe: boolean;
}

/**
 * Calculates complete Availability metrics for products and variants:
 * - On Hand: Total physical inventory on hand
 * - Reserved: Allocated / pending stock
 * - Available: On Hand - Reserved
 * - Status: IN_STOCK (> threshold), LOW_STOCK (1..threshold), OUT_OF_STOCK (0)
 */
export function calculateAvailabilityInfo(
  product?: Partial<Product> | null,
  variantSku?: string | null,
  customThreshold?: number
): AvailabilityInfo {
  if (!product) {
    return {
      onHand: 0,
      reserved: 0,
      available: 0,
      status: 'OUT_OF_STOCK',
      badgeLabel: 'Out of Stock',
      lowStockMessage: null,
      isLowStock: false,
      isAvailable: false,
      allowBackorder: false,
      allowNotifyMe: true,
    };
  }

  // 1. Find variant if specified
  let targetVariant: ProductVariant | null = null;
  if (variantSku && product.variants && Array.isArray(product.variants)) {
    targetVariant = product.variants.find(v => v.sku === variantSku) || null;
  }

  // Determine low stock threshold
  const threshold = customThreshold !== undefined
    ? customThreshold
    : targetVariant?.lowStockThreshold ?? product.lowStockThreshold ?? product.reorderPoint ?? 5;

  // Compute On Hand & Reserved
  let rawOnHand = 0;
  let rawReserved = 0;

  if (targetVariant) {
    rawOnHand = typeof targetVariant.onHand === 'number'
      ? targetVariant.onHand
      : typeof targetVariant.stock === 'number'
        ? targetVariant.stock
        : 0;

    rawReserved = typeof targetVariant.reserved === 'number'
      ? targetVariant.reserved
      : typeof targetVariant.reservedStock === 'number'
        ? targetVariant.reservedStock
        : Math.round(rawOnHand * 0.15);
  } else {
    rawOnHand = typeof product.onHand === 'number'
      ? product.onHand
      : typeof product.stock === 'number'
        ? product.stock
        : 0;

    rawReserved = typeof product.reserved === 'number'
      ? product.reserved
      : typeof product.reservedStock === 'number'
        ? product.reservedStock
        : Math.round(rawOnHand * 0.15);
  }

  // Compute Available (On Hand - Reserved)
  const explicitAvailable = targetVariant?.available !== undefined
    ? targetVariant.available
    : product.available !== undefined
      ? product.available
      : null;

  const available = explicitAvailable !== null
    ? Math.max(0, explicitAvailable)
    : Math.max(0, rawOnHand - rawReserved);

  const onHand = Math.max(available, rawOnHand);
  const reserved = Math.max(0, onHand - available);

  const isAvailable = available > 0;
  const isLowStock = isAvailable && available <= threshold;

  let status: AvailabilityStatus = 'IN_STOCK';
  let badgeLabel = `${available} available`;
  let lowStockMessage: string | null = null;

  if (!isAvailable) {
    status = 'OUT_OF_STOCK';
    badgeLabel = 'Out of Stock';
  } else if (isLowStock) {
    status = 'LOW_STOCK';
    badgeLabel = `${available} available`;
    lowStockMessage = `Only ${available} left!`;
  } else {
    status = 'IN_STOCK';
    badgeLabel = `${available} available`;
  }

  const allowBackorder = Boolean(targetVariant?.allowBackorder ?? product.allowBackorder ?? false);

  return {
    onHand,
    reserved,
    available,
    status,
    badgeLabel,
    lowStockMessage,
    isLowStock,
    isAvailable,
    allowBackorder,
    allowNotifyMe: !isAvailable || isLowStock,
  };
}
