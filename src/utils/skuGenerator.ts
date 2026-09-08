// ============================================================
// FILE: src/utils/skuGenerator.ts
// PURPOSE:
//   Automatic SKU generation using customizable template rules
//   (e.g., {BRAND}-{PRODUCT}-{COLOR}-{SIZE}) and global uniqueness checking.
// ============================================================

import { Product, ProductVariant } from '../types';

export interface SkuTemplateContext {
  brand?: string;
  productName?: string;
  color?: string;
  size?: string;
  category?: string;
  model?: string;
  sequence?: number | string;
  [key: string]: string | number | undefined;
}

export const SKU_TEMPLATE_PRESETS = [
  { id: 'brand-prod-color-size', label: '{BRAND}-{PRODUCT}-{COLOR}-{SIZE}', template: '{BRAND}-{PRODUCT}-{COLOR}-{SIZE}', example: 'NK-AM270-BLK-42' },
  { id: 'brand-prod-seq', label: '{BRAND}-{PRODUCT}-{SEQ}', template: '{BRAND}-{PRODUCT}-{SEQ}', example: 'NK-AM270-001' },
  { id: 'cat-prod-variant', label: '{CATEGORY}-{PRODUCT}-{VARIANT}', template: '{CATEGORY}-{PRODUCT}-{VARIANT}', example: 'APP-TSHIRT-RED' },
  { id: 'brand-model-color-size', label: '{BRAND}-{MODEL}-{COLOR}-{SIZE}', template: '{BRAND}-{MODEL}-{COLOR}-{SIZE}', example: 'NK-MAX270-BLK-42' },
  { id: 'prod-color-size', label: '{PRODUCT}-{COLOR}-{SIZE}', template: '{PRODUCT}-{COLOR}-{SIZE}', example: 'AM270-BLK-42' },
] as const;

// Common color code mapping for smart abbreviations
const COLOR_CODES: Record<string, string> = {
  black: 'BLK',
  white: 'WHT',
  red: 'RED',
  blue: 'BLU',
  green: 'GRN',
  yellow: 'YLW',
  orange: 'ORG',
  purple: 'PRP',
  pink: 'PNK',
  grey: 'GRY',
  gray: 'GRY',
  charcoal: 'CHR',
  silver: 'SLV',
  gold: 'GLD',
  navy: 'NVY',
  brown: 'BRN',
  tan: 'TAN',
  beige: 'BGE',
  olive: 'OLV',
  obsidian: 'OBS',
  midnight: 'MDN',
};

// Common size code mapping for smart abbreviations
const SIZE_CODES: Record<string, string> = {
  small: 'S',
  medium: 'M',
  large: 'L',
  'extra large': 'XL',
  xlarge: 'XL',
  'double extra large': '2XL',
  xxl: '2XL',
  'triple extra large': '3XL',
  xxxl: '3XL',
};

/**
 * Clean and abbreviate a string token for SKU formatting
 */
export function formatSkuToken(val: string | undefined, maxLen = 4): string {
  if (!val) return '';
  const trimmed = val.trim();
  const lower = trimmed.toLowerCase();

  // Check mapped color codes
  if (COLOR_CODES[lower]) return COLOR_CODES[lower];

  // Check mapped size codes
  if (SIZE_CODES[lower]) return SIZE_CODES[lower];

  // If numeric size / dimensions (e.g. "42", "10.5", "44mm")
  if (/^\d+(\.\d+)?([a-zA-Z]+)?$/.test(trimmed)) {
    return trimmed.toUpperCase().replace(/\s+/g, '');
  }

  // If multiple words e.g. "Air Max 270" -> "AM270", "Nike Air" -> "NKAIR"
  const words = trimmed.split(/[\s\-_]+/);
  if (words.length > 1) {
    const acronym = words
      .map((w) => {
        if (/^\d+$/.test(w)) return w;
        return w[0];
      })
      .join('')
      .toUpperCase();
    return acronym.slice(0, 8);
  }

  // Single word: e.g. "Nike" -> "NK", "Adidas" -> "ADD"
  const cleaned = trimmed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (cleaned.length <= 2) return cleaned;
  if (cleaned === 'NIKE') return 'NK';
  if (cleaned === 'ADIDAS') return 'ADI';
  if (cleaned === 'PUMA') return 'PMA';

  return cleaned.slice(0, maxLen);
}

/**
 * Generate a formatted SKU string from context variables using a template ruleset
 */
export function generateSkuFromTemplate(
  template: string,
  context: SkuTemplateContext
): string {
  let sku = template;

  const tokens: Record<string, string> = {
    BRAND: formatSkuToken(context.brand, 3) || 'GEN',
    PRODUCT: formatSkuToken(context.productName, 6) || 'PROD',
    COLOR: formatSkuToken(context.color, 3),
    SIZE: formatSkuToken(context.size, 3),
    CATEGORY: formatSkuToken(context.category, 3) || 'CAT',
    MODEL: formatSkuToken(context.model, 4),
    SEQ: String(context.sequence || Math.floor(100 + Math.random() * 900)),
    VARIANT: formatSkuToken(
      context.color || context.size || context.model || 'VAR',
      4
    ),
  };

  // Replace tokens
  Object.entries(tokens).forEach(([key, val]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'gi');
    sku = sku.replace(regex, val);
  });

  // Clean up residual hyphens or empty parts
  sku = sku
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase();

  return sku || `SKU-${Math.floor(10000 + Math.random() * 90000)}`;
}

/**
 * Check if a SKU is globally unique across all existing products and variants
 */
export function isSkuUnique(
  sku: string,
  products: Product[],
  opts?: {
    currentProductId?: string;
    currentVariantSku?: string;
    excludeCurrentVariantIdx?: number;
  }
): { isUnique: boolean; conflictingProduct?: Product; conflictingVariant?: ProductVariant } {
  const clean = sku.trim().toLowerCase();
  if (!clean) return { isUnique: false };

  for (const prod of products) {
    const isSameProduct = Boolean(opts?.currentProductId && prod.id === opts.currentProductId);

    // Check parent product SKU (if not same product)
    if (!isSameProduct && prod.sku && prod.sku.toLowerCase() === clean) {
      return { isUnique: false, conflictingProduct: prod };
    }

    // Check all variants of product
    if (prod.variants && prod.variants.length > 0) {
      for (let idx = 0; idx < prod.variants.length; idx++) {
        const variant = prod.variants[idx];
        const isSameVariant =
          isSameProduct &&
          (opts?.currentVariantSku
            ? variant.sku.toLowerCase() === opts.currentVariantSku.toLowerCase()
            : opts?.excludeCurrentVariantIdx === idx);

        if (!isSameVariant && variant.sku && variant.sku.toLowerCase() === clean) {
          return { isUnique: false, conflictingProduct: prod, conflictingVariant: variant };
        }
      }
    }
  }

  return { isUnique: true };
}

/**
 * Generates a guaranteed unique SKU by checking existing items and appending sequence suffixes if necessary
 */
export function generateUniqueSku(
  template: string,
  context: SkuTemplateContext,
  products: Product[],
  opts?: { currentProductId?: string; currentVariantSku?: string }
): string {
  const baseSku = generateSkuFromTemplate(template, context);
  let attemptSku = baseSku;
  let counter = 1;

  while (!isSkuUnique(attemptSku, products, opts).isUnique) {
    counter++;
    attemptSku = `${baseSku}-${String(counter).padStart(3, '0')}`;
    if (counter > 99) {
      attemptSku = `${baseSku}-${Math.floor(1000 + Math.random() * 9000)}`;
      break;
    }
  }

  return attemptSku;
}
