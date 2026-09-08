// ============================================================
// FILE: src/utils/pricingEngine.ts
// PURPOSE:
//   Multi-Tier Pricing Architecture & Price List Engine.
//   Supports Retail, Wholesale, Dealer, Member, and Promotional Price Lists.
//   Hierarchy: Product / Variant -> Price List -> Unit Price
// ============================================================

import { 
  PriceList, 
  PriceListItem, 
  Product, 
  ProductVariant, 
  CostCalculationMethod, 
  BatchLotRecord,
  PriceListMap,
  ProductPriceLists,
  MarginGuardViolation,
  MarginGuardReport
} from '../types';

export type { MarginGuardViolation, MarginGuardReport };

export interface PriceListValidationResult {
  isValid: boolean;
  warnings: string[];
  retailPrice: number;
  wholesalePrice?: number;
  dealerPrice?: number;
  hasMarginLossRisk: boolean;
}

/**
 * Normalizes any ProductPriceLists format (either Record<string, number> or PriceListItem[])
 * into a standardized PriceListMap { Retail, Wholesale, Dealer, Member, Promotional, ... }
 */
export function normalizePriceListMap(
  priceLists?: ProductPriceLists,
  fallbackRetail: number = 0
): PriceListMap {
  const result: PriceListMap = {
    Retail: fallbackRetail || 0,
    Wholesale: Number(((fallbackRetail || 0) * 0.90).toFixed(2)),
    Dealer: Number(((fallbackRetail || 0) * 0.85).toFixed(2)),
    Member: Number(((fallbackRetail || 0) * 0.95).toFixed(2)),
    Promotional: Number(((fallbackRetail || 0) * 0.80).toFixed(2)),
  };

  if (!priceLists) return result;

  if (Array.isArray(priceLists)) {
    for (const item of priceLists) {
      if (item && item.priceListName && typeof item.price === 'number') {
        result[item.priceListName] = item.price;
      }
    }
  } else if (typeof priceLists === 'object') {
    for (const [key, val] of Object.entries(priceLists)) {
      if (typeof val === 'number') {
        result[key] = val;
      }
    }
  }

  return result;
}

/**
 * Converts a PriceListMap object { Retail: 100, Wholesale: 90 } into PriceListItem[] array
 */
export function priceListMapToItems(map: PriceListMap): PriceListItem[] {
  return Object.entries(map).map(([name, price]) => {
    const norm = name.toLowerCase();
    return {
      priceListId: `pl-${norm}`,
      priceListName: name,
      price: Math.max(0, Number(price) || 0),
    };
  });
}

/**
 * Converts PriceListItem[] array into PriceListMap object { Retail: 100, Wholesale: 90 }
 */
export function priceListItemsToMap(items?: PriceListItem[]): PriceListMap {
  if (!items || !Array.isArray(items)) return {};
  const map: PriceListMap = {};
  for (const item of items) {
    if (item && item.priceListName) {
      map[item.priceListName] = item.price;
    }
  }
  return map;
}

/**
 * Validates price lists hierarchy to ensure 'Retail' is always higher than 'Wholesale' and 'Dealer' tiers.
 * Prevents margin loss, revenue leakage, and inverted tier pricing.
 */
export function validatePriceListHierarchy(
  prices?: ProductPriceLists | PriceListMap,
  fallbackRetail: number = 0,
  cost?: number
): PriceListValidationResult {
  const map = normalizePriceListMap(prices as any, fallbackRetail);
  const warnings: string[] = [];

  // Extract key tier values (case-insensitive search)
  const getTier = (name: string): number | undefined => {
    const target = name.toLowerCase();
    for (const [k, v] of Object.entries(map)) {
      if (k.toLowerCase() === target) return v;
    }
    return undefined;
  };

  const retail = getTier('Retail') ?? (fallbackRetail || 0);
  const wholesale = getTier('Wholesale');
  const dealer = getTier('Dealer');
  const promo = getTier('Promotional');

  let hasMarginLossRisk = false;

  // 1. Retail must be strictly greater than Wholesale
  if (wholesale !== undefined && wholesale > 0 && retail > 0) {
    if (wholesale >= retail) {
      warnings.push(
        `Wholesale price (${wholesale.toFixed(2)}) must be strictly lower than Retail price (${retail.toFixed(2)}) to prevent margin loss and B2B pricing inversion.`
      );
      hasMarginLossRisk = true;
    }
  }

  // 2. Retail must be strictly greater than Dealer
  if (dealer !== undefined && dealer > 0 && retail > 0) {
    if (dealer >= retail) {
      warnings.push(
        `Dealer price (${dealer.toFixed(2)}) must be strictly lower than Retail price (${retail.toFixed(2)}) to maintain retail markup and prevent distributor arbitrage.`
      );
      hasMarginLossRisk = true;
    }
  }

  // 3. Dealer should generally be lower than Wholesale (Dealer buys higher volume)
  if (dealer !== undefined && wholesale !== undefined && dealer > 0 && wholesale > 0) {
    if (dealer > wholesale) {
      warnings.push(
        `Dealer price (${dealer.toFixed(2)}) is higher than Wholesale price (${wholesale.toFixed(2)}). Authorized Dealers typically receive equal or greater volume discounts than standard Wholesale.`
      );
    }
  }

  // 4. Unit Cost Margin Verification
  if (cost !== undefined && cost > 0) {
    for (const [tierName, price] of Object.entries(map)) {
      if (typeof price === 'number' && price > 0 && price < cost) {
        warnings.push(
          `${tierName} price (${price.toFixed(2)}) is below unit cost COGS (${cost.toFixed(2)}), resulting in a negative profit margin.`
        );
        hasMarginLossRisk = true;
      }
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    retailPrice: retail,
    wholesalePrice: wholesale,
    dealerPrice: dealer,
    hasMarginLossRisk,
  };
}

/**
 * MarginGuard Helper Function
 * Compares the cost of a product against its assigned 'Wholesale' and 'Retail' price lists,
 * as well as other price list tiers (Dealer, Member, Promotional) and variants.
 * Returns diagnostic report and warning banner messages if any calculated or manual price results in a negative profit margin.
 */
export function marginGuard(
  cost: number = 0,
  retailPrice: number = 0,
  wholesalePrice?: number,
  priceLists?: ProductPriceLists | PriceListMap,
  variants?: ProductVariant[]
): MarginGuardReport {
  const safeCost = Math.max(0, Number(cost) || 0);
  const safeRetail = Math.max(0, Number(retailPrice) || 0);
  const safeWholesale = wholesalePrice !== undefined && wholesalePrice !== null && !isNaN(Number(wholesalePrice))
    ? Math.max(0, Number(wholesalePrice))
    : undefined;

  const map = priceLists ? normalizePriceListMap(priceLists, safeRetail) : {};
  const violatedTiers: MarginGuardViolation[] = [];
  const warnings: string[] = [];

  const retailProfit = safeRetail - safeCost;
  const retailMarginPercent = safeRetail > 0 ? (retailProfit / safeRetail) * 100 : 0;

  const wholesaleProfit = safeWholesale !== undefined ? safeWholesale - safeCost : undefined;
  const wholesaleMarginPercent = safeWholesale && safeWholesale > 0
    ? ((safeWholesale - safeCost) / safeWholesale) * 100
    : undefined;

  // 1. Check base Retail Price against cost
  if (safeCost > 0 && safeRetail > 0 && safeRetail < safeCost) {
    const loss = safeCost - safeRetail;
    const margin = ((safeRetail - safeCost) / safeRetail) * 100;
    const msg = `Retail selling price ($${safeRetail.toFixed(2)}) is below unit cost COGS ($${safeCost.toFixed(2)}), incurring a loss of -$${loss.toFixed(2)} per unit (${margin.toFixed(1)}% margin).`;
    violatedTiers.push({
      tierName: 'Retail',
      price: safeRetail,
      cost: safeCost,
      lossAmount: loss,
      marginPercent: margin,
      warningMessage: msg,
    });
    warnings.push(msg);
  }

  // 2. Check base Wholesale Price against cost
  if (safeCost > 0 && safeWholesale !== undefined && safeWholesale > 0 && safeWholesale < safeCost) {
    const loss = safeCost - safeWholesale;
    const margin = ((safeWholesale - safeCost) / safeWholesale) * 100;
    const msg = `Wholesale tier price ($${safeWholesale.toFixed(2)}) is below unit cost COGS ($${safeCost.toFixed(2)}), incurring a loss of -$${loss.toFixed(2)} per unit (${margin.toFixed(1)}% margin).`;
    violatedTiers.push({
      tierName: 'Wholesale',
      price: safeWholesale,
      cost: safeCost,
      lossAmount: loss,
      marginPercent: margin,
      warningMessage: msg,
    });
    warnings.push(msg);
  }

  // 3. Check Price List Tiers (Retail, Wholesale, Dealer, Member, Promotional, etc.)
  if (safeCost > 0 && Object.keys(map).length > 0) {
    for (const [tierName, tierPrice] of Object.entries(map)) {
      if (typeof tierPrice === 'number' && tierPrice > 0 && tierPrice < safeCost) {
        // Avoid duplicate entry if tier was already logged above
        const alreadyLogged = violatedTiers.some(
          v => v.tierName.toLowerCase() === tierName.toLowerCase() && !v.variantSku
        );
        if (!alreadyLogged) {
          const loss = safeCost - tierPrice;
          const margin = ((tierPrice - safeCost) / tierPrice) * 100;
          const msg = `Price List tier "${tierName}" price ($${tierPrice.toFixed(2)}) is below unit cost ($${safeCost.toFixed(2)}), resulting in a negative profit margin (${margin.toFixed(1)}%).`;
          violatedTiers.push({
            tierName,
            price: tierPrice,
            cost: safeCost,
            lossAmount: loss,
            marginPercent: margin,
            warningMessage: msg,
          });
          warnings.push(msg);
        }
      }
    }
  }

  // 4. Check Product Variants if present
  if (variants && variants.length > 0) {
    variants.forEach(variant => {
      const vCost = variant.cost !== undefined && variant.cost > 0 ? variant.cost : safeCost;
      const vPrice = variant.price !== undefined && variant.price > 0 ? variant.price : safeRetail;
      const vSku = variant.sku || variant.title || variant.name || 'Variant';

      if (vCost > 0 && vPrice > 0 && vPrice < vCost) {
        const loss = vCost - vPrice;
        const margin = ((vPrice - vCost) / vPrice) * 100;
        const msg = `Variant ${vSku} price ($${vPrice.toFixed(2)}) is below cost ($${vCost.toFixed(2)}), incurring a loss of -$${loss.toFixed(2)} (${margin.toFixed(1)}% margin).`;
        violatedTiers.push({
          tierName: `Variant ${vSku}`,
          price: vPrice,
          cost: vCost,
          lossAmount: loss,
          marginPercent: margin,
          warningMessage: msg,
          variantSku: variant.sku,
        });
        warnings.push(msg);
      }

      if (variant.priceLists && vCost > 0) {
        const vMap = normalizePriceListMap(variant.priceLists, vPrice);
        for (const [tName, tPrice] of Object.entries(vMap)) {
          if (typeof tPrice === 'number' && tPrice > 0 && tPrice < vCost) {
            const loss = vCost - tPrice;
            const margin = ((tPrice - vCost) / tPrice) * 100;
            const msg = `Variant ${vSku} Price List "${tName}" ($${tPrice.toFixed(2)}) is below cost ($${vCost.toFixed(2)}), margin: ${margin.toFixed(1)}%.`;
            violatedTiers.push({
              tierName: `Variant ${vSku} - ${tName}`,
              price: tPrice,
              cost: vCost,
              lossAmount: loss,
              marginPercent: margin,
              warningMessage: msg,
              variantSku: variant.sku,
            });
            warnings.push(msg);
          }
        }
      }
    });
  }

  const hasNegativeMargin = violatedTiers.length > 0;
  const summaryWarning = hasNegativeMargin
    ? `MarginGuard Alert: ${violatedTiers.length} pricing tier${violatedTiers.length > 1 ? 's' : ''} resulted in negative profit margins (selling below cost).`
    : undefined;

  return {
    isSafe: !hasNegativeMargin,
    hasNegativeMargin,
    cost: safeCost,
    retailPrice: safeRetail,
    wholesalePrice: safeWholesale,
    retailProfit,
    retailMarginPercent,
    wholesaleProfit,
    wholesaleMarginPercent,
    violatedTiers,
    warnings,
    summaryWarning,
  };
}

// Function alias for naming flexibility
export const MarginGuard = marginGuard;

/**
 * Validates a Product object against MarginGuard rules
 */
export function validateProductMarginGuard(product: Partial<Product>): MarginGuardReport {
  return marginGuard(
    product.cost ?? 0,
    product.price ?? 0,
    product.wholesalePrice,
    product.priceLists,
    product.variants
  );
}

export const SYSTEM_PRICE_LISTS: PriceList[] = [
  {
    id: 'pl-retail',
    name: 'Retail',
    code: 'RETAIL',
    description: 'Standard public consumer retail price list',
    isDefault: true,
    discountPercentage: 0,
    status: 'Active',
  },
  {
    id: 'pl-wholesale',
    name: 'Wholesale',
    code: 'WHOLESALE',
    description: 'B2B commercial bulk buyer & distributor price list',
    isDefault: false,
    discountPercentage: 10,
    status: 'Active',
  },
  {
    id: 'pl-dealer',
    name: 'Dealer',
    code: 'DEALER',
    description: 'Authorized dealer & franchise partner price list',
    isDefault: false,
    discountPercentage: 15,
    status: 'Active',
  },
  {
    id: 'pl-member',
    name: 'Member',
    code: 'MEMBER',
    description: 'VIP & registered loyalty program member price list',
    isDefault: false,
    discountPercentage: 5,
    status: 'Active',
  },
  {
    id: 'pl-promo',
    name: 'Promotional',
    code: 'PROMO',
    description: 'Special marketing campaign & clearance flash sale price list',
    isDefault: false,
    discountPercentage: 20,
    status: 'Active',
  },
];

/**
 * Returns all system price lists
 */
export function getSystemPriceLists(): PriceList[] {
  return SYSTEM_PRICE_LISTS;
}

/**
 * Calculates standard price list matrix for a given base retail price
 */
export function generateDefaultPriceListMatrix(
  baseRetailPrice: number,
  cost: number = 0,
  legacyWholesalePrice?: number
): PriceListItem[] {
  const safeRetail = Math.max(0, baseRetailPrice || 0);

  return [
    {
      priceListId: 'pl-retail',
      priceListName: 'Retail',
      price: safeRetail,
    },
    {
      priceListId: 'pl-wholesale',
      priceListName: 'Wholesale',
      price: legacyWholesalePrice && legacyWholesalePrice > 0 
        ? legacyWholesalePrice 
        : Number((safeRetail * 0.90).toFixed(2)),
    },
    {
      priceListId: 'pl-dealer',
      priceListName: 'Dealer',
      price: Number((safeRetail * 0.85).toFixed(2)),
    },
    {
      priceListId: 'pl-member',
      priceListName: 'Member',
      price: Number((safeRetail * 0.95).toFixed(2)),
    },
    {
      priceListId: 'pl-promo',
      priceListName: 'Promotional',
      price: Number((safeRetail * 0.80).toFixed(2)),
    },
  ];
}

/**
 * Calculates standard price list matrix for a given variant's price
 */
export function generateVariantPriceListMatrix(
  variantPrice?: number,
  fallbackBasePrice: number = 0,
  cost: number = 0
): PriceListItem[] {
  const safePrice = Math.max(0, (variantPrice !== undefined && variantPrice > 0) ? variantPrice : fallbackBasePrice);

  return [
    {
      priceListId: 'pl-retail',
      priceListName: 'Retail',
      price: safePrice,
    },
    {
      priceListId: 'pl-wholesale',
      priceListName: 'Wholesale',
      price: Number((safePrice * 0.90).toFixed(2)),
    },
    {
      priceListId: 'pl-dealer',
      priceListName: 'Dealer',
      price: Number((safePrice * 0.85).toFixed(2)),
    },
    {
      priceListId: 'pl-member',
      priceListName: 'Member',
      price: Number((safePrice * 0.95).toFixed(2)),
    },
    {
      priceListId: 'pl-promo',
      priceListName: 'Promotional',
      price: Number((safePrice * 0.80).toFixed(2)),
    },
  ];
}

/**
 * Gets a specific price list tier value from a variant
 */
export function getVariantPriceForPriceList(
  variant: ProductVariant,
  targetPriceList: string = 'Retail',
  fallbackPrice: number = 0
): number {
  const norm = targetPriceList.trim().toLowerCase();
  if (variant.priceLists) {
    if (Array.isArray(variant.priceLists) && variant.priceLists.length > 0) {
      const match = variant.priceLists.find(
        (pl) => pl.priceListId.toLowerCase() === norm || pl.priceListName.toLowerCase() === norm
      );
      if (match && match.price > 0) return match.price;
    } else if (typeof variant.priceLists === 'object') {
      for (const [k, v] of Object.entries(variant.priceLists)) {
        if ((k.toLowerCase() === norm || `pl-${k.toLowerCase()}` === norm) && typeof v === 'number' && v > 0) {
          return v;
        }
      }
    }
  }

  const base = variant.price && variant.price > 0 ? variant.price : fallbackPrice;
  if (norm === 'wholesale' || norm === 'pl-wholesale') return Number((base * 0.90).toFixed(2));
  if (norm === 'dealer' || norm === 'pl-dealer') return Number((base * 0.85).toFixed(2));
  if (norm === 'member' || norm === 'pl-member') return Number((base * 0.95).toFixed(2));
  if (norm === 'promotional' || norm === 'promo' || norm === 'pl-promo') return Number((base * 0.80).toFixed(2));
  return base;
}

/**
 * Updates or inserts a price list tier into a variant
 */
export function updateVariantPriceListTier(
  variant: ProductVariant,
  priceListName: string,
  price: number
): ProductVariant {
  const currentPriceLists = priceListMapToItems(
    normalizePriceListMap(variant.priceLists, variant.price)
  );

  const norm = priceListName.trim().toLowerCase();
  const existingIdx = currentPriceLists.findIndex(
    (pl) => pl.priceListId.toLowerCase() === norm || pl.priceListName.toLowerCase() === norm
  );

  if (existingIdx >= 0) {
    currentPriceLists[existingIdx] = {
      ...currentPriceLists[existingIdx],
      price: Math.max(0, price)
    };
  } else {
    currentPriceLists.push({
      priceListId: `pl-${norm}`,
      priceListName: priceListName as any,
      price: Math.max(0, price)
    });
  }

  // If updating Retail, keep variant.price in sync
  const isRetail = norm === 'retail' || norm === 'pl-retail';

  return {
    ...variant,
    price: isRetail ? price : variant.price,
    priceLists: currentPriceLists
  };
}

/**
 * Resolves the final unit price for a given product/variant and target price list.
 * Search Order:
 * 1. Variant specific PriceList item matching priceListId / priceListName
 * 2. Product level PriceList item matching priceListId / priceListName
 * 3. Legacy product tier fields (e.g. wholesalePrice)
 * 4. Calculated tier discount percentage off base retail price
 * 5. Base retail price fallback
 */
export function resolveProductPrice(
  product: Product,
  variant?: ProductVariant | null,
  targetPriceList: string = 'Retail'
): {
  finalPrice: number;
  priceListName: string;
  isCustomTier: boolean;
  baseRetailPrice: number;
} {
  const baseRetailPrice = variant?.price && variant.price > 0 ? variant.price : product.price || 0;
  const normalizedTarget = (targetPriceList || 'Retail').trim().toLowerCase();

  // 1. Check variant priceLists
  if (variant?.priceLists) {
    if (Array.isArray(variant.priceLists) && variant.priceLists.length > 0) {
      const matched = variant.priceLists.find(
        (pl) =>
          pl.priceListId.toLowerCase() === normalizedTarget ||
          pl.priceListName.toLowerCase() === normalizedTarget
      );
      if (matched && matched.price > 0) {
        return {
          finalPrice: matched.price,
          priceListName: matched.priceListName,
          isCustomTier: true,
          baseRetailPrice,
        };
      }
    } else if (typeof variant.priceLists === 'object') {
      for (const [k, v] of Object.entries(variant.priceLists)) {
        if ((k.toLowerCase() === normalizedTarget || `pl-${k.toLowerCase()}` === normalizedTarget) && typeof v === 'number' && v > 0) {
          return {
            finalPrice: v,
            priceListName: k,
            isCustomTier: true,
            baseRetailPrice,
          };
        }
      }
    }
  }

  // 2. Check product priceLists
  if (product?.priceLists) {
    if (Array.isArray(product.priceLists) && product.priceLists.length > 0) {
      const matched = product.priceLists.find(
        (pl) =>
          pl.priceListId.toLowerCase() === normalizedTarget ||
          pl.priceListName.toLowerCase() === normalizedTarget
      );
      if (matched && matched.price > 0) {
        return {
          finalPrice: matched.price,
          priceListName: matched.priceListName,
          isCustomTier: true,
          baseRetailPrice,
        };
      }
    } else if (typeof product.priceLists === 'object') {
      for (const [k, v] of Object.entries(product.priceLists)) {
        if ((k.toLowerCase() === normalizedTarget || `pl-${k.toLowerCase()}` === normalizedTarget) && typeof v === 'number' && v > 0) {
          return {
            finalPrice: v,
            priceListName: k,
            isCustomTier: true,
            baseRetailPrice,
          };
        }
      }
    }
  }

  // 3. Legacy fields fallback
  if (normalizedTarget === 'wholesale' || normalizedTarget === 'pl-wholesale') {
    if (product.wholesalePrice && product.wholesalePrice > 0) {
      return {
        finalPrice: product.wholesalePrice,
        priceListName: 'Wholesale',
        isCustomTier: true,
        baseRetailPrice,
      };
    }
  }

  // 4. Default discount calculation based on price list definition
  const priceListDef = SYSTEM_PRICE_LISTS.find(
    (pl) =>
      pl.id.toLowerCase() === normalizedTarget ||
      pl.name.toLowerCase() === normalizedTarget ||
      pl.code.toLowerCase() === normalizedTarget
  );

  if (priceListDef && priceListDef.discountPercentage && priceListDef.discountPercentage > 0) {
    const calculated = Number((baseRetailPrice * (1 - priceListDef.discountPercentage / 100)).toFixed(2));
    return {
      finalPrice: calculated,
      priceListName: priceListDef.name,
      isCustomTier: false,
      baseRetailPrice,
    };
  }

  // 5. Default base retail fallback
  return {
    finalPrice: baseRetailPrice,
    priceListName: 'Retail',
    isCustomTier: false,
    baseRetailPrice,
  };
}

/**
 * Helper to get badge visual styling for a price list
 */
export function getPriceListBadgeStyle(priceListName: string): {
  bg: string;
  text: string;
  border: string;
} {
  const norm = priceListName.trim().toLowerCase();
  if (norm === 'wholesale') {
    return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' };
  }
  if (norm === 'dealer') {
    return { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' };
  }
  if (norm === 'member') {
    return { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' };
  }
  if (norm === 'promotional' || norm === 'promo') {
    return { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' };
  }
  // Retail default
  return { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' };
}

// ============================================================
// COST VALUATION ENGINE (Simple, Weighted Average Cost, FIFO)
// ============================================================

/**
 * Calculates current unit cost and inventory valuation based on selected cost calculation method:
 * - SIMPLE: Purchase Price
 * - WEIGHTED_AVERAGE: Total Inventory Value / Total Quantity
 * - FIFO: First-In First-Out batch cost tracking
 */
export function calculateProductValuationCost(product: Product): {
  currentUnitCost: number;
  method: CostCalculationMethod;
  description: string;
  totalInventoryValuation: number;
  simplePurchaseCost: number;
  weightedAvgCost: number;
  fifoOldestBatchCost: number;
} {
  const method: CostCalculationMethod = product.costCalculationMethod || 'WEIGHTED_AVERAGE';
  const simplePurchaseCost = product.purchasePrice || product.cost || 0;
  const stockQty = Math.max(0, product.stock || 0);

  // 1. Weighted Average Cost calculation
  const weightedAvgCost = product.weightedAverageCost && product.weightedAverageCost > 0
    ? product.weightedAverageCost
    : simplePurchaseCost;

  // 2. FIFO Valuation calculation
  let fifoOldestBatchCost = simplePurchaseCost;
  if (product.fifoBatches && product.fifoBatches.length > 0) {
    const activeBatch = product.fifoBatches.find(b => b.quantity > 0) || product.fifoBatches[0];
    fifoOldestBatchCost = activeBatch.unitCost || simplePurchaseCost;
  }

  let currentUnitCost = simplePurchaseCost;
  let description = 'Simple Purchase Cost';

  if (method === 'WEIGHTED_AVERAGE') {
    currentUnitCost = weightedAvgCost;
    description = 'Weighted Average Cost (WAC = Total Value ÷ Stock Qty)';
  } else if (method === 'FIFO') {
    currentUnitCost = fifoOldestBatchCost;
    description = 'FIFO (First-In, First-Out Batch Valuation)';
  } else {
    currentUnitCost = simplePurchaseCost;
    description = 'Simple Purchase Cost (Vendor Cost)';
  }

  const totalInventoryValuation = Number((currentUnitCost * stockQty).toFixed(2));

  return {
    currentUnitCost: Number(currentUnitCost.toFixed(2)),
    method,
    description,
    totalInventoryValuation,
    simplePurchaseCost,
    weightedAvgCost: Number(weightedAvgCost.toFixed(2)),
    fifoOldestBatchCost: Number(fifoOldestBatchCost.toFixed(2)),
  };
}

/**
 * Updates cost fields upon receiving new inventory stock.
 * Automatically recalculates Weighted Average Cost & appends to FIFO Batch Lot ledger.
 */
export function recordStockReceiptCostUpdate(
  product: Product,
  receivedQty: number,
  unitPurchaseCost: number,
  supplierInvoiceRef?: string
): Partial<Product> {
  const currentQty = Math.max(0, product.stock || 0);
  const currentCost = product.weightedAverageCost || product.cost || 0;
  const newTotalQty = currentQty + receivedQty;

  // Recalculate Weighted Average Cost
  const newWeightedAvgCost = newTotalQty > 0
    ? Number((((currentQty * currentCost) + (receivedQty * unitPurchaseCost)) / newTotalQty).toFixed(2))
    : unitPurchaseCost;

  // Log new FIFO Batch
  const existingBatches: BatchLotRecord[] = product.fifoBatches ? [...product.fifoBatches] : [];
  const newBatch: BatchLotRecord = {
    id: `batch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    batchNumber: supplierInvoiceRef || `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
    quantity: receivedQty,
    unitCost: unitPurchaseCost,
    receivedDate: new Date().toISOString(),
    supplierInvoiceRef,
  };

  return {
    purchasePrice: unitPurchaseCost,
    weightedAverageCost: newWeightedAvgCost,
    cost: product.costCalculationMethod === 'WEIGHTED_AVERAGE' ? newWeightedAvgCost : unitPurchaseCost,
    fifoBatches: [newBatch, ...existingBatches],
  };
}

// ============================================================
// MINIMUM SELLING PRICE & MARGIN GUARDRAIL ENGINE
// ============================================================

/**
 * Validates whether a proposed selling price satisfies the product's Minimum Selling Price floor.
 * If proposed price < minimumPrice, triggers manager authorization requirement.
 */
export function checkMinimumPriceGuardrail(
  product: Product,
  requestedUnitPrice: number,
  variantSku?: string
): {
  isBelowMinimum: boolean;
  minAllowedPrice: number;
  diffAmount: number;
  discountPercentBelowMin: number;
  message: string;
} {
  // Check variant minimum price or product minimum price
  let minAllowed = product.minimumPrice || 0;
  if (variantSku && product.variants) {
    const variant = product.variants.find(v => v.sku === variantSku);
    if (variant?.price && !minAllowed) {
      minAllowed = Number((variant.price * 0.85).toFixed(2));
    }
  }

  const isBelowMinimum = minAllowed > 0 && requestedUnitPrice < minAllowed;
  const diffAmount = isBelowMinimum ? Number((minAllowed - requestedUnitPrice).toFixed(2)) : 0;
  const discountPercentBelowMin = isBelowMinimum && minAllowed > 0
    ? Number(((diffAmount / minAllowed) * 100).toFixed(1))
    : 0;

  const message = isBelowMinimum
    ? `Price (${requestedUnitPrice}) is below minimum allowed threshold (${minAllowed}). Manager authorization required.`
    : 'Price meets minimum margin requirement.';

  return {
    isBelowMinimum,
    minAllowedPrice: minAllowed,
    diffAmount,
    discountPercentBelowMin,
    message,
  };
}

// ============================================================
// DYNAMIC PRICING ENGINE RESPONSE
// ============================================================

export interface DynamicPricingResponse {
  original_price: number;
  selling_price: number;
  discount_amount: number;
  discount_percentage: number;
  currency: string;
}

export interface CalculateDynamicPricingOptions {
  product?: {
    price?: number;
    originalPrice?: number;
    discountPercent?: number;
    priceLists?: any;
    variants?: ProductVariant[];
  } | null;
  variantSku?: string | null;
  quantity?: number;
  currency?: string;
  priceListTier?: string;
  overridePrice?: number;
  overrideOriginalPrice?: number;
}

/**
 * Calculates dynamic pricing according to the backend pricing engine rules.
 * Returns: original_price, selling_price, discount_amount, discount_percentage, currency.
 */
export function calculateDynamicPricing(
  options: CalculateDynamicPricingOptions
): DynamicPricingResponse {
  const {
    product,
    variantSku,
    quantity = 1,
    currency = 'Le',
    priceListTier = 'Retail',
    overridePrice,
    overrideOriginalPrice
  } = options;

  const qty = Math.max(1, quantity);

  // 1. Find variant if SKU provided
  let selectedVariant: ProductVariant | null = null;
  if (variantSku && product?.variants && Array.isArray(product.variants)) {
    selectedVariant = product.variants.find(v => v.sku === variantSku) || null;
  }

  // 2. Determine base unit selling price
  let baseUnitSellingPrice = overridePrice !== undefined && overridePrice > 0
    ? overridePrice
    : selectedVariant?.price && selectedVariant.price > 0
      ? selectedVariant.price
      : product?.price || 0;

  // If product is a full Product, run through resolveProductPrice
  if (product && 'name' in product) {
    const resolved = resolveProductPrice(product as Product, selectedVariant, priceListTier);
    if (overridePrice === undefined) {
      baseUnitSellingPrice = resolved.finalPrice;
    }
  }

  // 3. Determine base unit original/normal price
  let baseUnitOriginalPrice = overrideOriginalPrice !== undefined && overrideOriginalPrice > baseUnitSellingPrice
    ? overrideOriginalPrice
    : product?.originalPrice && product.originalPrice > baseUnitSellingPrice
      ? product.originalPrice
      : baseUnitSellingPrice;

  // If product has discountPercent defined and baseUnitOriginalPrice wasn't higher
  if (product?.discountPercent && product.discountPercent > 0 && baseUnitOriginalPrice <= baseUnitSellingPrice) {
    baseUnitOriginalPrice = Number((baseUnitSellingPrice / (1 - product.discountPercent / 100)).toFixed(2));
  }

  // Multiply by quantity
  const totalOriginalPrice = Number((baseUnitOriginalPrice * qty).toFixed(2));
  const totalSellingPrice = Number((baseUnitSellingPrice * qty).toFixed(2));
  const discountAmount = Math.max(0, Number((totalOriginalPrice - totalSellingPrice).toFixed(2)));
  const discountPercentage = totalOriginalPrice > 0 && discountAmount > 0
    ? Math.round(((totalOriginalPrice - totalSellingPrice) / totalOriginalPrice) * 100)
    : 0;

  return {
    original_price: totalOriginalPrice,
    selling_price: totalSellingPrice,
    discount_amount: discountAmount,
    discount_percentage: discountPercentage,
    currency: currency || 'Le',
  };
}


