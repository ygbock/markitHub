import { Product, BulkPackagingConfig, PackagingUnitsConfig, PackagingUnitOption } from '../types';
import { convertUOMQuantity, normalizeUOM } from './uomConverter';
import { deductQuantityFromBatches } from './batchLotManager';

/**
 * Checks if a product has Multi-UOM enabled or custom packaging tiers defined.
 */
export function hasMultiUOMEnabled(product: Product): boolean {
  if (!product) return false;
  if (product.hasMultiUOM === true) return true;
  if (product.productType === 'PackBreakdown') return true;
  if (product.packagingUnits && Array.isArray(product.packagingUnits.units) && product.packagingUnits.units.length > 1) {
    return true;
  }
  const normUnit = normalizeUOM(product.unit || '');
  if (['gram', 'milliliter', 'centimeter', 'piece'].includes(normUnit)) {
    return true;
  }
  return false;
}

/**
 * Standardized calculation for inventory reduction in base units.
 */
export function calculateInventoryReduction(quantity: number, conversion_multiplier: number = 1): number {
  const multiplier = Math.max(0.0001, conversion_multiplier || 1);
  return quantity * multiplier;
}

/**
 * Standardized inventory decrement utility function.
 */
export function decrementProductStock(
  product: Product,
  soldQuantity: number,
  conversion_multiplier: number = 1,
  variantSku?: string,
  orderRef?: { orderId?: string; invoiceRef?: string; customerName?: string; cashierName?: string }
): Product {
  const baseUnitsToSubtract = calculateInventoryReduction(soldQuantity, conversion_multiplier);
  const currentStock = typeof product.stock === 'number' ? product.stock : 0;
  const nextStock = Math.max(0, currentStock - baseUnitsToSubtract);

  // If variants exist, decrement matching variant's stock as well
  const updatedVariants = (product.variants || []).map(v => {
    if (variantSku && v.sku === variantSku) {
      return { ...v, stock: Math.max(0, v.stock - baseUnitsToSubtract) };
    }
    return v;
  });

  let updatedFifoBatches = product.fifoBatches;
  if (product.fifoBatches && product.fifoBatches.length > 0) {
    const batchResult = deductQuantityFromBatches(product, baseUnitsToSubtract, orderRef);
    updatedFifoBatches = batchResult.updatedProduct.fifoBatches;
  }

  return {
    ...product,
    stock: nextStock,
    variants: updatedVariants,
    fifoBatches: updatedFifoBatches,
    salesCount: (product.salesCount || 0) + soldQuantity
  };
}

/**
 * Normalizes a Product's packaging configuration into a standard array of PackagingUnitOptions.
 * Auto-generates standard UOM conversion tiers (Carton=24, Box=12, Pack=6, Kilogram=1000g, Liter=1000mL, Meter=100cm).
 */
export function getPackagingUnitOptions(product: Product): PackagingUnitOption[] {
  if (!product) return [];

  const baseUnitName = product.unit || product.packagingUnits?.base_unit || 'Piece';
  const normBase = normalizeUOM(baseUnitName);

  // 1. If explicit packagingUnits config exists and has custom units
  if (product.packagingUnits && Array.isArray(product.packagingUnits.units) && product.packagingUnits.units.length > 0) {
    const activeUnits = product.packagingUnits.units.filter(u => u.allowSale !== false);
    if (activeUnits.length > 0) {
      return activeUnits;
    }
  }

  // 2. If product has multi-UOM or BulkPackaging configuration
  if (hasMultiUOMEnabled(product) && product.bulkPackaging) {
    const bulk = product.bulkPackaging;
    const outerPackageType = bulk?.outerPackageType || product.packagingUnits?.outerPackageType || 'Box';
    const masterMultiplier = bulk?.itemsPerPackage || product.packagingUnits?.multiplier || 24;

    const unitCost = bulk?.unitCost || product.cost || 0;
    const unitPrice = bulk?.unitRetailPrice || product.price || 0;

    const options: PackagingUnitOption[] = [
      {
        unitName: `Single (1 ${baseUnitName})`,
        unitType: 'retail_unit',
        multiplier: 1,
        base_unit: baseUnitName,
        price: unitPrice,
        cost: unitCost,
        allowSale: true,
        isBaseUnit: true
      }
    ];

    // Dozen option (if allowed or defined)
    if (bulk?.allowDozenSale !== false && masterMultiplier >= 12) {
      options.push({
        unitName: `Dozen (12 ${baseUnitName}s)`,
        unitType: 'dozen',
        multiplier: 12,
        base_unit: baseUnitName,
        price: bulk?.dozenRetailPrice || Number((unitPrice * 10.5).toFixed(2)),
        cost: Number((unitCost * 12).toFixed(2)),
        allowSale: true
      });
    }

    // Master Pack option (Box / Carton / Sack / Case)
    if (bulk?.allowPackageSale !== false && masterMultiplier > 1) {
      options.push({
        unitName: `Master ${outerPackageType} (${masterMultiplier} ${baseUnitName}s)`,
        unitType: 'master_pack',
        multiplier: masterMultiplier,
        base_unit: baseUnitName,
        price: bulk?.outerPackageRetailPrice || Number((unitPrice * masterMultiplier * 0.85).toFixed(2)),
        cost: bulk?.outerPackageCost || Number((unitCost * masterMultiplier).toFixed(2)),
        allowSale: true
      });
    }

    return options;
  }

  // 3. Auto-generate standard UOM conversion tiers for Piece / Gram / Milliliter / Centimeter
  const unitPrice = product.price || 0;
  const unitCost = product.cost || 0;

  if (normBase === 'gram') {
    return [
      { unitName: '1 Gram (g)', unitType: 'retail_unit', multiplier: 1, base_unit: 'Gram', price: unitPrice, cost: unitCost, allowSale: true, isBaseUnit: true },
      { unitName: 'Pack (250g)', unitType: 'bundle', multiplier: 250, base_unit: 'Gram', price: Number((unitPrice * 230).toFixed(2)), cost: Number((unitCost * 250).toFixed(2)), allowSale: true },
      { unitName: '1 Kilogram (1000g)', unitType: 'master_pack', multiplier: 1000, base_unit: 'Gram', price: Number((unitPrice * 880).toFixed(2)), cost: Number((unitCost * 1000).toFixed(2)), allowSale: true }
    ];
  } else if (normBase === 'milliliter') {
    return [
      { unitName: '1 Milliliter (mL)', unitType: 'retail_unit', multiplier: 1, base_unit: 'Milliliter', price: unitPrice, cost: unitCost, allowSale: true, isBaseUnit: true },
      { unitName: 'Bottle (250 mL)', unitType: 'bundle', multiplier: 250, base_unit: 'Milliliter', price: Number((unitPrice * 230).toFixed(2)), cost: Number((unitCost * 250).toFixed(2)), allowSale: true },
      { unitName: '1 Liter (1000 mL)', unitType: 'master_pack', multiplier: 1000, base_unit: 'Milliliter', price: Number((unitPrice * 850).toFixed(2)), cost: Number((unitCost * 1000).toFixed(2)), allowSale: true }
    ];
  } else if (normBase === 'centimeter') {
    return [
      { unitName: '1 Centimeter (cm)', unitType: 'retail_unit', multiplier: 1, base_unit: 'Centimeter', price: unitPrice, cost: unitCost, allowSale: true, isBaseUnit: true },
      { unitName: '1 Meter (100 cm)', unitType: 'master_pack', multiplier: 100, base_unit: 'Centimeter', price: Number((unitPrice * 85).toFixed(2)), cost: Number((unitCost * 100).toFixed(2)), allowSale: true }
    ];
  } else if (normBase === 'piece') {
    return [
      { unitName: 'Single Piece', unitType: 'retail_unit', multiplier: 1, base_unit: 'Piece', price: unitPrice, cost: unitCost, allowSale: true, isBaseUnit: true },
      { unitName: 'Pack (6 Pieces)', unitType: 'bundle', multiplier: 6, base_unit: 'Piece', price: Number((unitPrice * 5.5).toFixed(2)), cost: Number((unitCost * 6).toFixed(2)), allowSale: true },
      { unitName: 'Box (12 Pieces)', unitType: 'bundle', multiplier: 12, base_unit: 'Piece', price: Number((unitPrice * 10.5).toFixed(2)), cost: Number((unitCost * 12).toFixed(2)), allowSale: true },
      { unitName: 'Carton (24 Pieces)', unitType: 'master_pack', multiplier: 24, base_unit: 'Piece', price: Number((unitPrice * 20.0).toFixed(2)), cost: Number((unitCost * 24).toFixed(2)), allowSale: true }
    ];
  }

  // Fallback default
  return [
    {
      unitName: `Standard Unit (1 ${baseUnitName})`,
      unitType: 'retail_unit',
      multiplier: 1,
      base_unit: baseUnitName,
      price: unitPrice,
      cost: unitCost,
      allowSale: true,
      isBaseUnit: true,
      isDefaultSaleUnit: true
    }
  ];
}

/**
 * Returns human-readable breakdown string of current stock in packs and retail pieces.
 * e.g., "500 tea bags (5 Master Boxes of 100)" or "150 bars (5 Boxes of 30)"
 */
export function formatStockInPackagingUnits(product: Product): string {
  const options = getPackagingUnitOptions(product);
  const masterPackOption = options.find(o => (o.unitType === 'master_pack' || o.multiplier >= 10) && o.multiplier > 1);

  if (!masterPackOption || !hasMultiUOMEnabled(product)) {
    return `${product.stock} ${product.unit || 'pcs'}`;
  }

  const baseUnits = product.stock;
  const fullPacks = Math.floor(baseUnits / masterPackOption.multiplier);
  const remainingPieces = baseUnits % masterPackOption.multiplier;

  const packLabel = masterPackOption.unitName.replace(/\(.*?\)/g, '').trim();

  if (fullPacks === 0) {
    return `${baseUnits} ${masterPackOption.base_unit}s`;
  } else if (remainingPieces === 0) {
    return `${fullPacks} ${packLabel}s (${baseUnits} total ${masterPackOption.base_unit}s)`;
  } else {
    return `${fullPacks} ${packLabel}s + ${remainingPieces} ${masterPackOption.base_unit}s (${baseUnits} total)`;
  }
}
