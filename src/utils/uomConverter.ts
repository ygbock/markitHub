// ============================================================
// FILE: src/utils/uomConverter.ts
// PURPOSE:
//   Standardized Units of Measurement (UOM) & Conversion Engine.
//   Supports Piece, Box, Carton, Pack, Kilogram, Gram, Liter, Milliliter, Meter, Centimeter,
//   and wholesale supplier-to-POS stock conversions.
// ============================================================

export type StandardUOMKey = 
  | 'Piece' 
  | 'Box' 
  | 'Carton' 
  | 'Pack' 
  | 'Kilogram' 
  | 'Gram' 
  | 'Liter' 
  | 'Milliliter' 
  | 'Meter' 
  | 'Centimeter';

export interface UOMDefinition {
  key: StandardUOMKey;
  label: string;
  symbol: string;
  category: 'Count' | 'Packaging' | 'Weight' | 'Volume' | 'Length';
  defaultBaseUnit?: StandardUOMKey;
  defaultRatioInBase?: number; // e.g. 1 Carton = 24 Pieces, 1 kg = 1000 g
}

export const SUPPORTED_UOMS: UOMDefinition[] = [
  { key: 'Piece', label: 'Piece (pcs)', symbol: 'pc', category: 'Count' },
  { key: 'Box', label: 'Box (bx)', symbol: 'box', category: 'Packaging', defaultBaseUnit: 'Piece', defaultRatioInBase: 12 },
  { key: 'Carton', label: 'Carton (ctn)', symbol: 'carton', category: 'Packaging', defaultBaseUnit: 'Piece', defaultRatioInBase: 24 },
  { key: 'Pack', label: 'Pack (pk)', symbol: 'pack', category: 'Packaging', defaultBaseUnit: 'Piece', defaultRatioInBase: 6 },
  { key: 'Kilogram', label: 'Kilogram (kg)', symbol: 'kg', category: 'Weight', defaultBaseUnit: 'Gram', defaultRatioInBase: 1000 },
  { key: 'Gram', label: 'Gram (g)', symbol: 'g', category: 'Weight' },
  { key: 'Liter', label: 'Liter (L)', symbol: 'L', category: 'Volume', defaultBaseUnit: 'Milliliter', defaultRatioInBase: 1000 },
  { key: 'Milliliter', label: 'Milliliter (mL)', symbol: 'mL', category: 'Volume' },
  { key: 'Meter', label: 'Meter (m)', symbol: 'm', category: 'Length', defaultBaseUnit: 'Centimeter', defaultRatioInBase: 100 },
  { key: 'Centimeter', label: 'Centimeter (cm)', symbol: 'cm', category: 'Length' },
];

/**
 * Standard built-in default conversion factors relative to standard base units
 */
export const DEFAULT_UOM_RATIOS: Record<string, number> = {
  // Packaging -> Piece
  'pallet->piece': 960,     // 1 Pallet = 40 Cartons = 960 Pieces
  'pallet->carton': 40,     // 1 Pallet = 40 Cartons
  'case->piece': 48,        // 1 Case = 48 Pieces
  'case->carton': 2,        // 1 Case = 2 Cartons
  'carton->piece': 24,      // 1 Carton = 24 Pieces (Industry standard)
  'carton->box': 2,         // 1 Carton = 2 Boxes
  'box->piece': 12,         // 1 Box = 12 Pieces (or 1 Dozen)
  'dozen->piece': 12,       // 1 Dozen = 12 Pieces
  'pack->piece': 6,         // 1 Pack = 6 Pieces (or 6-pack)
  'pair->piece': 2,         // 1 Pair = 2 Pieces
  'piece->piece': 1,

  // Weight
  'tonne->kilogram': 1000,
  'tonne->kg': 1000,
  'kilogram->gram': 1000,
  'gram->gram': 1,
  'kg->g': 1000,
  'kilogram->milligram': 1000000,
  'gram->milligram': 1000,
  'pound->ounce': 16,
  'lb->oz': 16,

  // Volume
  'liter->milliliter': 1000,
  'milliliter->milliliter': 1,
  'l->ml': 1000,
  'gallon->liter': 3.78541,
  'barrel->liter': 159,

  // Length
  'meter->centimeter': 100,
  'centimeter->centimeter': 1,
  'm->cm': 100,
  'meter->millimeter': 1000,
  'm->mm': 1000,
  'kilometer->meter': 1000,
  'km->m': 1000,
  'yard->foot': 3,
  'foot->inch': 12,
};

/**
 * Direct conversion: 1 Carton = 24 Pieces (or custom pieces per carton)
 * Example: 5 Cartons @ 24 pcs/ctn -> 120 Pieces
 */
export function convertCartonToPieces(cartons: number, piecesPerCarton: number = 24): number {
  if (!cartons || cartons <= 0) return 0;
  const ratio = Math.max(1, piecesPerCarton);
  return Number((cartons * ratio).toFixed(4));
}

/**
 * Direct reverse conversion: Pieces to Cartons breakdown
 * Example: 58 Pieces @ 24 pcs/ctn -> 2 Cartons + 10 Pieces (2.417 Cartons)
 */
export function convertPiecesToCartons(pieces: number, piecesPerCarton: number = 24): {
  fullCartons: number;
  loosePieces: number;
  totalCartonsDecimal: number;
  displayString: string;
  isExact: boolean;
} {
  if (!pieces || pieces <= 0) {
    return {
      fullCartons: 0,
      loosePieces: 0,
      totalCartonsDecimal: 0,
      displayString: '0 Cartons (0 Pieces)',
      isExact: true
    };
  }

  const ratio = Math.max(1, piecesPerCarton);
  const fullCartons = Math.floor(pieces / ratio);
  const loosePieces = Math.round(pieces % ratio);
  const totalCartonsDecimal = Number((pieces / ratio).toFixed(3));
  const isExact = loosePieces === 0;

  let displayString = '';
  if (fullCartons === 0) {
    displayString = `${loosePieces} Loose Pieces`;
  } else if (loosePieces === 0) {
    displayString = `${fullCartons} Carton${fullCartons > 1 ? 's' : ''} (${pieces} Pieces total)`;
  } else {
    displayString = `${fullCartons} Carton${fullCartons > 1 ? 's' : ''} + ${loosePieces} Pieces (${pieces} Pieces total)`;
  }

  return {
    fullCartons,
    loosePieces,
    totalCartonsDecimal,
    displayString,
    isExact
  };
}

/**
 * Direct conversion: Box to Pieces
 * Example: 1 Box = 12 Pieces
 */
export function convertBoxToPieces(boxes: number, piecesPerBox: number = 12): number {
  if (!boxes || boxes <= 0) return 0;
  return Number((boxes * Math.max(1, piecesPerBox)).toFixed(4));
}

/**
 * Direct conversion: Pieces to Boxes
 */
export function convertPiecesToBoxes(pieces: number, piecesPerBox: number = 12): {
  fullBoxes: number;
  loosePieces: number;
  totalBoxesDecimal: number;
  displayString: string;
} {
  if (!pieces || pieces <= 0) return { fullBoxes: 0, loosePieces: 0, totalBoxesDecimal: 0, displayString: '0 Boxes' };
  const ratio = Math.max(1, piecesPerBox);
  const fullBoxes = Math.floor(pieces / ratio);
  const loosePieces = Math.round(pieces % ratio);
  const totalBoxesDecimal = Number((pieces / ratio).toFixed(3));
  const displayString = fullBoxes === 0
    ? `${loosePieces} Pieces`
    : loosePieces === 0
      ? `${fullBoxes} Box${fullBoxes > 1 ? 'es' : ''}`
      : `${fullBoxes} Box${fullBoxes > 1 ? 'es' : ''} + ${loosePieces} Pieces`;

  return { fullBoxes, loosePieces, totalBoxesDecimal, displayString };
}

/**
 * Comprehensive UOM Conversion Result structure
 */
export interface UOMConversionResult {
  sourceQuantity: number;
  sourceUOM: string;
  targetQuantity: number;
  targetUOM: string;
  conversionFactor: number;
  formula: string;
  explanation: string;
  breakdown: string;
  unitPriceEquivalent?: number;
}

/**
 * Detailed converter utility for arbitrary quantities, units, and optional packaging prices
 */
export function calculateDetailedUOMConversion(
  quantity: number,
  fromUOM: string,
  toUOM: string,
  customMultiplier?: number,
  sourceUnitPrice?: number
): UOMConversionResult {
  const normFrom = normalizeUOM(fromUOM);
  const normTo = normalizeUOM(toUOM);
  const safeQty = Math.max(0, quantity || 0);

  if (normFrom === normTo) {
    return {
      sourceQuantity: safeQty,
      sourceUOM: fromUOM,
      targetQuantity: safeQty,
      targetUOM: toUOM,
      conversionFactor: 1,
      formula: `1 ${fromUOM} = 1 ${toUOM}`,
      explanation: `No conversion needed (same unit).`,
      breakdown: `${safeQty} ${fromUOM}`,
      unitPriceEquivalent: sourceUnitPrice
    };
  }

  // Determine factor
  let factor = 1;
  if (customMultiplier && customMultiplier > 0) {
    factor = customMultiplier;
  } else {
    const directKey = `${normFrom}->${normTo}`;
    const reverseKey = `${normTo}->${normFrom}`;
    if (DEFAULT_UOM_RATIOS[directKey]) {
      factor = DEFAULT_UOM_RATIOS[directKey];
    } else if (DEFAULT_UOM_RATIOS[reverseKey]) {
      factor = 1 / DEFAULT_UOM_RATIOS[reverseKey];
    }
  }

  const targetQuantity = Number((safeQty * factor).toFixed(4));
  const unitPriceEquivalent = sourceUnitPrice && sourceUnitPrice > 0 && factor > 0
    ? Number((sourceUnitPrice / factor).toFixed(4))
    : undefined;

  const formula = factor >= 1 
    ? `1 ${fromUOM} = ${factor} ${toUOM}s`
    : `1 ${fromUOM} = ${factor} ${toUOM}s (1 ${toUOM} = ${(1 / factor).toFixed(2)} ${fromUOM}s)`;

  const explanation = `${safeQty} ${fromUOM}${safeQty !== 1 ? 's' : ''} × ${factor} = ${targetQuantity} ${toUOM}${targetQuantity !== 1 ? 's' : ''}`;
  
  // Human breakdown for packaging
  let breakdown = explanation;
  if ((normFrom === 'piece' || normFrom === 'pcs') && (normTo === 'carton' || normTo === 'box')) {
    const ratio = customMultiplier || (normTo === 'carton' ? 24 : 12);
    const full = Math.floor(safeQty / ratio);
    const rem = safeQty % ratio;
    breakdown = `${full} ${toUOM}${full > 1 ? 's' : ''} + ${rem} Pieces loose`;
  } else if ((normFrom === 'carton' || normFrom === 'box') && (normTo === 'piece' || normTo === 'pcs')) {
    breakdown = `${safeQty} ${fromUOM}${safeQty > 1 ? 's' : ''} = ${targetQuantity} Pieces in inventory stock`;
  }

  return {
    sourceQuantity: safeQty,
    sourceUOM: fromUOM,
    targetQuantity,
    targetUOM: toUOM,
    conversionFactor: factor,
    formula,
    explanation,
    breakdown,
    unitPriceEquivalent
  };
}

/**
 * Normalizes a UOM string name/key into a lower-cased canonical string
 */
export function normalizeUOM(uom: string): string {
  if (!uom) return 'piece';
  const clean = uom.trim().toLowerCase();
  if (clean === 'pcs' || clean === 'pieces' || clean === 'pc') return 'piece';
  if (clean === 'boxes') return 'box';
  if (clean === 'cartons') return 'carton';
  if (clean === 'packs' || clean === 'packet' || clean === 'packets') return 'pack';
  if (clean === 'kg' || clean === 'kilograms') return 'kilogram';
  if (clean === 'g' || clean === 'grams') return 'gram';
  if (clean === 'l' || clean === 'liters' || clean === 'litre' || clean === 'litres') return 'liter';
  if (clean === 'ml' || clean === 'milliliters' || clean === 'millilitres') return 'milliliter';
  if (clean === 'm' || clean === 'meters' || clean === 'metres') return 'meter';
  if (clean === 'cm' || clean === 'centimeters' || clean === 'centimetres') return 'centimeter';
  return clean;
}

/**
 * Converts a quantity from one UOM to another.
 * Accepts an optional custom multiplier factor (e.g., product specific 1 carton = 48 pieces)
 */
export function convertUOMQuantity(
  quantity: number,
  fromUOM: string,
  toUOM: string,
  customMultiplier?: number
): number {
  if (!quantity || quantity <= 0) return 0;

  const normFrom = normalizeUOM(fromUOM);
  const normTo = normalizeUOM(toUOM);

  if (normFrom === normTo) return quantity;

  // Use custom multiplier if supplied (e.g., product packaging config: 1 carton = N pieces)
  if (customMultiplier && customMultiplier > 0) {
    if (normFrom === 'carton' || normFrom === 'box' || normFrom === 'pack') {
      return quantity * customMultiplier;
    }
  }

  // Check built-in conversion lookup
  const directKey = `${normFrom}->${normTo}`;
  if (DEFAULT_UOM_RATIOS[directKey]) {
    return quantity * DEFAULT_UOM_RATIOS[directKey];
  }

  // Check reverse conversion
  const reverseKey = `${normTo}->${normFrom}`;
  if (DEFAULT_UOM_RATIOS[reverseKey]) {
    return quantity / DEFAULT_UOM_RATIOS[reverseKey];
  }

  // Fallback: return quantity as-is
  return quantity;
}

/**
 * Calculates stock increment when receiving wholesale goods from a supplier.
 * Example:
 * Supplier sells: 10 Cartons (where 1 Carton = 24 Pieces)
 * POS inventory receives: 240 Pieces
 */
export function calculateWholesaleStockReceipt(
  receivedQuantity: number,
  supplierUom: string,
  posBaseUom: string,
  conversionRatio: number = 24
): {
  baseStockToAdd: number;
  explanation: string;
} {
  const normSupplier = normalizeUOM(supplierUom);
  const normPos = normalizeUOM(posBaseUom);

  if (normSupplier === normPos) {
    return {
      baseStockToAdd: receivedQuantity,
      explanation: `Received ${receivedQuantity} ${posBaseUom}`
    };
  }

  const multiplier = conversionRatio || convertUOMQuantity(1, supplierUom, posBaseUom) || 1;
  const totalBaseUnits = receivedQuantity * multiplier;

  return {
    baseStockToAdd: totalBaseUnits,
    explanation: `Received ${receivedQuantity} ${supplierUom}s (${multiplier} ${posBaseUom}s/${supplierUom}) = ${totalBaseUnits} ${posBaseUom}s added to POS inventory stock`
  };
}

/**
 * Formats a given base stock balance into human-readable packaging breakdown
 * e.g., 58 pieces -> "2 Cartons + 10 Pieces (1 Carton = 24 Pieces)"
 */
export function formatUomStockBreakdown(
  baseStock: number,
  baseUom: string = 'Piece',
  containerUom: string = 'Carton',
  conversionRatio: number = 24
): string {
  if (baseStock <= 0) return `0 ${baseUom}s`;

  const ratio = Math.max(1, conversionRatio);
  const fullContainers = Math.floor(baseStock / ratio);
  const remainingBase = baseStock % ratio;

  if (fullContainers === 0) {
    return `${baseStock} ${baseUom}s`;
  }

  if (remainingBase === 0) {
    return `${fullContainers} ${containerUom}${fullContainers > 1 ? 's' : ''} (${baseStock} total ${baseUom}s)`;
  }

  return `${fullContainers} ${containerUom}${fullContainers > 1 ? 's' : ''} + ${remainingBase} ${baseUom}s (${baseStock} total)`;
}
