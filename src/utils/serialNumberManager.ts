import { SerialNumberUnit, SerialUnitStatus, SerialNumberLifecycleEvent, Product } from '../types';

/**
 * Creates a new Serial Number Unit with initial status 'Received'
 */
export function createSerialUnit(
  productId: string,
  serialNumber: string,
  variantSku?: string,
  notes?: string,
  warrantyMonths: number = 12
): SerialNumberUnit {
  const now = new Date().toISOString();
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + warrantyMonths);

  const initialEvent: SerialNumberLifecycleEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    status: 'Received',
    timestamp: now,
    notes: notes || 'Intake recorded into inventory system',
    actor: 'Inventory Manager',
  };

  return {
    id: `sn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    serialNumber: serialNumber.trim().toUpperCase(),
    productId,
    variantSku,
    status: 'In Stock', // Automatically available in stock after intake
    receivedDate: now,
    warrantyExpiryDate: expiryDate.toISOString(),
    history: [
      initialEvent,
      {
        id: `evt-${Date.now() + 1}-${Math.random().toString(36).substring(2, 7)}`,
        status: 'In Stock',
        timestamp: now,
        notes: 'Verified & placed on sales floor / warehouse stock',
        actor: 'Inventory System',
      }
    ],
    notes,
  };
}

/**
 * Parses raw text input (comma-separated, newline-separated) into cleaned unique serial numbers
 */
export function parseBatchSerialNumbers(rawInput: string): string[] {
  if (!rawInput) return [];
  const parts = rawInput
    .split(/[\n,;\t]+/)
    .map(s => s.trim().toUpperCase())
    .filter(s => s.length > 0);
  // Return unique non-empty strings
  return Array.from(new Set(parts));
}

/**
 * Transition a serial number unit through lifecycle states
 */
export function transitionSerialUnitStatus(
  unit: SerialNumberUnit,
  newStatus: SerialUnitStatus,
  actor: string = 'POS System',
  notes?: string,
  invoiceRef?: string,
  customerName?: string
): SerialNumberUnit {
  const now = new Date().toISOString();

  const newEvent: SerialNumberLifecycleEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    status: newStatus,
    timestamp: now,
    notes: notes || `Unit state updated to ${newStatus}`,
    actor,
    invoiceRef,
    customerName,
  };

  const updatedUnit: SerialNumberUnit = {
    ...unit,
    status: newStatus,
    customerName: customerName || unit.customerName,
    invoiceRef: invoiceRef || unit.invoiceRef,
    soldDate: newStatus === 'Sold' ? now : unit.soldDate,
    history: [...(unit.history || []), newEvent],
  };

  return updatedUnit;
}

/**
 * Filter available "In Stock" serial units for a product / variant
 */
export function getInStockSerialUnits(product: Product, variantSku?: string): SerialNumberUnit[] {
  if (!product.serialUnits || product.serialUnits.length === 0) return [];

  return product.serialUnits.filter(unit => {
    const isStatusAvailable = unit.status === 'In Stock' || unit.status === 'Received' || unit.status === 'Resold';
    if (!isStatusAvailable) return false;
    if (variantSku) {
      return !unit.variantSku || unit.variantSku === variantSku;
    }
    return true;
  });
}

/**
 * Ordered Lifecycle stages
 */
export const SERIAL_LIFECYCLE_STAGES: SerialUnitStatus[] = [
  'Received',
  'In Stock',
  'Sold',
  'Returned',
  'Repaired',
  'Resold'
];

export function getSerialUnitLifecycleStageIndex(status: SerialUnitStatus): number {
  return SERIAL_LIFECYCLE_STAGES.indexOf(status);
}

/**
 * Check Warranty Status for a Serial Unit
 */
export function isWarrantyActive(unit: SerialNumberUnit): { active: boolean; daysRemaining: number; formattedExpiry: string } {
  if (!unit.warrantyExpiryDate) {
    return { active: false, daysRemaining: 0, formattedExpiry: 'N/A' };
  }

  const expiry = new Date(unit.warrantyExpiryDate);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return {
    active: daysRemaining > 0,
    daysRemaining: Math.max(0, daysRemaining),
    formattedExpiry: expiry.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
  };
}
