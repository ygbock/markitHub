// ============================================================
// FILE: src/utils/barcodeResolver.ts
// PURPOSE:
//   Multi-type barcode resolution engine for POS scanning & search.
//   Resolves Scanned Code -> Variant (EAN/UPC/SKU/Barcode/QR) -> Product -> Price -> Inventory.
// ============================================================

import { Product, ProductVariant, BarcodeEntry } from '../types';
import { productMatchesQuery } from './searchEngine';

export interface BarcodeMatchResult {
  product: Product;
  variant?: ProductVariant;
  matchType: 'variant' | 'product';
  matchedCode: string;
  matchedSymbology: string; // 'EAN' | 'UPC' | 'SKU' | 'BARCODE' | 'QR' | 'CUSTOM'
  resolvedPrice: number;
  resolvedStock: number;
  title: string;
  sku: string;
}

/**
 * Searches and resolves a scanned or entered code against all catalog products and variants.
 * Search Resolution Pipeline:
 *   Scanned Barcode / QR / SKU
 *       ↓
 *   Variant Level Lookup (checks v.barcodes[], v.barcode, v.ean, v.upc, v.qrCode, v.sku)
 *       ↓
 *   Product Parent Level Lookup (checks p.barcodes[], p.barcode, p.ean, p.upc, p.qrCode, p.sku)
 *       ↓
 *   Resolved Item (Product + Specific Variant + Unit Price + Stock Balance)
 */
export function resolveBarcodeToProduct(
  query: string,
  products: Product[]
): BarcodeMatchResult | null {
  if (!query || !query.trim()) return null;
  const clean = query.trim().toLowerCase();

  // 1. Check VARIANTS across all products first (Highest Resolution Granularity)
  for (const prod of products) {
    if (prod.variants && prod.variants.length > 0) {
      for (const v of prod.variants) {
        // Exact match on Variant Primary Barcode
        if (v.barcode && v.barcode.toLowerCase() === clean) {
          return buildMatchResult(prod, v, 'variant', v.barcode, 'BARCODE');
        }
        // Exact match on EAN
        if (v.ean && v.ean.toLowerCase() === clean) {
          return buildMatchResult(prod, v, 'variant', v.ean, 'EAN');
        }
        // Exact match on UPC
        if (v.upc && v.upc.toLowerCase() === clean) {
          return buildMatchResult(prod, v, 'variant', v.upc, 'UPC');
        }
        // Exact match on QR Code
        if (v.qrCode && v.qrCode.toLowerCase() === clean) {
          return buildMatchResult(prod, v, 'variant', v.qrCode, 'QR');
        }
        // Exact match on SKU
        if (v.sku && v.sku.toLowerCase() === clean) {
          return buildMatchResult(prod, v, 'variant', v.sku, 'SKU');
        }
        // Exact match on Multi-Barcode Entry Array
        if (v.barcodes && v.barcodes.length > 0) {
          const matchEntry = v.barcodes.find(b => b.code.toLowerCase() === clean);
          if (matchEntry) {
            return buildMatchResult(prod, v, 'variant', matchEntry.code, matchEntry.type || 'BARCODE');
          }
        }
      }
    }
  }

  // 2. Check PARENT PRODUCTS if no variant directly matched
  for (const prod of products) {
    if (prod.barcode && prod.barcode.toLowerCase() === clean) {
      return buildMatchResult(prod, prod.variants?.[0], 'product', prod.barcode, 'BARCODE');
    }
    if (prod.ean && prod.ean.toLowerCase() === clean) {
      return buildMatchResult(prod, prod.variants?.[0], 'product', prod.ean, 'EAN');
    }
    if (prod.upc && prod.upc.toLowerCase() === clean) {
      return buildMatchResult(prod, prod.variants?.[0], 'product', prod.upc, 'UPC');
    }
    if (prod.qrCode && prod.qrCode.toLowerCase() === clean) {
      return buildMatchResult(prod, prod.variants?.[0], 'product', prod.qrCode, 'QR');
    }
    if (prod.sku && prod.sku.toLowerCase() === clean) {
      return buildMatchResult(prod, prod.variants?.[0], 'product', prod.sku, 'SKU');
    }
    if (prod.barcodes && prod.barcodes.length > 0) {
      const matchEntry = prod.barcodes.find(b => b.code.toLowerCase() === clean);
      if (matchEntry) {
        return buildMatchResult(prod, prod.variants?.[0], 'product', matchEntry.code, matchEntry.type || 'BARCODE');
      }
    }
  }

  return null;
}

function buildMatchResult(
  product: Product,
  variant: ProductVariant | undefined,
  matchType: 'variant' | 'product',
  matchedCode: string,
  matchedSymbology: string
): BarcodeMatchResult {
  const isVariant = matchType === 'variant' && Boolean(variant);
  const variantTitle = variant
    ? variant.title || [variant.color, variant.size, variant.model].filter(Boolean).join(' — ') || variant.sku
    : '';

  const title = isVariant ? `${product.name} — ${variantTitle}` : product.name;
  const price = isVariant ? (variant?.price ?? product.price) : product.price;
  const stock = isVariant ? (variant?.stock ?? product.stock) : product.stock;
  const sku = isVariant ? (variant?.sku || product.sku) : product.sku;

  return {
    product,
    variant: isVariant ? variant : undefined,
    matchType,
    matchedCode,
    matchedSymbology,
    resolvedPrice: price,
    resolvedStock: stock,
    title,
    sku
  };
}

/**
 * Checks if a product or any of its variants matches a search string across all fields using the multi-field search engine
 */
export function productMatchesBarcodeOrQuery(product: Product, search: string): boolean {
  return productMatchesQuery(product, search);
}
