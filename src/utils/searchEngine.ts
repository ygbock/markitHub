// ============================================================
// FILE: src/utils/searchEngine.ts
// PURPOSE:
//   Enterprise Multi-Field Search Engine System.
//   Searches across:
//     - Product Name
//     - SKU (Product & Variant SKUs)
//     - Barcode (EAN, UPC, QR, barcodes array, variant barcodes)
//     - Brand
//     - Category
//     - Description & Summary
//     - Attributes (Model, Color, Size, Unit, Variant Options)
//     - Specifications (Storage, RAM, Display, Battery, etc.)
// ============================================================

import { Product, ProductVariant, BarcodeEntry } from '../types';

export interface SearchResult {
  product: Product;
  matchedVariant?: ProductVariant;
  score: number;
  matchedFields: string[];
  primaryMatchReason: string;
}

export interface SearchOptions {
  minScore?: number;
  categoryFilter?: string;
  brandFilter?: string;
  inStockOnly?: boolean;
  onSaleOnly?: boolean;
  minRating?: number;
  limit?: number;
  sortBy?: 'relevance' | 'price-asc' | 'price-desc' | 'rating' | 'newest' | 'bestsellers';
}

export interface SearchSuggestions {
  query: string;
  tokens: string[];
  totalMatches: number;
  matchingCategories: string[];
  matchingBrands: string[];
  topProducts: SearchResult[];
}

/**
 * Normalizes text by removing extra whitespace, punctuation, and unifying capacity terms.
 * Handles variations like "256 gb", "256gb", "256-gb", "256G".
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/([0-9]+)\s*(gb|tb|mb|ram|ghz|mm|cm|kg|g|hz)/gi, '$1$2') // e.g., "256 gb" -> "256gb"
    .replace(/[^a-z0-9\s]/g, ' ') // replace punctuation with spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenizes a query string into searchable terms.
 */
export function tokenizeQuery(query: string): string[] {
  const normalized = normalizeText(query);
  if (!normalized) return [];
  // Also create raw space-split tokens and variations
  const tokens = normalized.split(' ').filter(t => t.length > 0);
  return Array.from(new Set(tokens));
}

/**
 * Extracts all searchable text fields and attribute key-values for a given product.
 */
export interface ProductCorpus {
  name: string;
  sku: string;
  brand: string;
  category: string;
  description: string;
  barcodes: string[];
  attributes: Record<string, string>;
  specifications: Record<string, string>;
  variants: {
    sku: string;
    title: string;
    color?: string;
    size?: string;
    model?: string;
    barcodes: string[];
    options: Record<string, string>;
    variantObj: ProductVariant;
  }[];
}

export function extractProductCorpus(product: Product): ProductCorpus {
  const barcodesSet = new Set<string>();

  if (product.barcode) barcodesSet.add(product.barcode.toLowerCase());
  if (product.ean) barcodesSet.add(product.ean.toLowerCase());
  if (product.upc) barcodesSet.add(product.upc.toLowerCase());
  if (product.qrCode) barcodesSet.add(product.qrCode.toLowerCase());
  if (product.barcodes && Array.isArray(product.barcodes)) {
    product.barcodes.forEach(b => {
      if (b && b.code) barcodesSet.add(b.code.toLowerCase());
    });
  }
  if (product.packagingUnits?.units) {
    product.packagingUnits.units.forEach(u => {
      if (u.barcode) barcodesSet.add(u.barcode.toLowerCase());
      if (u.sku) barcodesSet.add(u.sku.toLowerCase());
    });
  }

  const attributes: Record<string, string> = {};
  if (product.model) attributes['Model'] = product.model;
  if (product.unit) attributes['Unit'] = product.unit;
  if (product.productType) attributes['Type'] = product.productType;

  const specifications: Record<string, string> = product.specifications || {};

  const variantsList = (product.variants || []).map(v => {
    const vBarcodes = new Set<string>();
    if (v.barcode) vBarcodes.add(v.barcode.toLowerCase());
    if (v.ean) vBarcodes.add(v.ean.toLowerCase());
    if (v.upc) vBarcodes.add(v.upc.toLowerCase());
    if (v.qrCode) vBarcodes.add(v.qrCode.toLowerCase());
    if (v.barcodes && Array.isArray(v.barcodes)) {
      v.barcodes.forEach(b => {
        if (b && b.code) vBarcodes.add(b.code.toLowerCase());
      });
    }

    return {
      sku: (v.sku || '').toLowerCase(),
      title: v.title || [v.color, v.size, v.model].filter(Boolean).join(' '),
      color: v.color,
      size: v.size,
      model: v.model,
      barcodes: Array.from(vBarcodes),
      options: v.options || {},
      variantObj: v
    };
  });

  return {
    name: product.name || '',
    sku: (product.sku || '').toLowerCase(),
    brand: product.brand || '',
    category: product.category || '',
    description: (product.description || '') + ' ' + (product.ecommerce?.summary || '') + ' ' + (product.ecommerce?.seoKeywords || ''),
    barcodes: Array.from(barcodesSet),
    attributes,
    specifications,
    variants: variantsList
  };
}

/**
 * Main Enterprise Search Engine Function.
 * Performs multi-field token matching, relevance scoring, and field explanation tagging.
 */
export function searchProducts(
  products: Product[],
  rawQuery: string,
  options: SearchOptions = {}
): SearchResult[] {
  if (!rawQuery || !rawQuery.trim()) {
    return [];
  }

  const cleanQuery = rawQuery.trim().toLowerCase();
  const normalizedQuery = normalizeText(rawQuery);
  const tokens = tokenizeQuery(rawQuery);

  if (tokens.length === 0) {
    return [];
  }

  const results: SearchResult[] = [];

  for (const product of products) {
    // 1. Facet Filtering
    if (options.categoryFilter && options.categoryFilter !== 'All' && product.category !== options.categoryFilter) {
      continue;
    }
    if (options.brandFilter && product.brand !== options.brandFilter) {
      continue;
    }
    if (options.inStockOnly && product.stock <= 0) {
      continue;
    }
    if (options.onSaleOnly && (!product.discountPercent || product.discountPercent <= 0) && (!product.originalPrice || product.originalPrice <= product.price)) {
      continue;
    }
    if (options.minRating && (product.rating || 4.5) < options.minRating) {
      continue;
    }

    const corpus = extractProductCorpus(product);
    let score = 0;
    const matchedFieldsSet = new Set<string>();
    let matchedVariantObj: ProductVariant | undefined = undefined;

    // A. Check for Exact Match Boosts
    const normName = normalizeText(corpus.name);
    const normSku = corpus.sku.toLowerCase();
    const normBrand = normalizeText(corpus.brand);
    const normCat = normalizeText(corpus.category);

    if (normName === normalizedQuery || corpus.name.toLowerCase() === cleanQuery) {
      score += 1000;
      matchedFieldsSet.add(`Exact Product Name Match: "${product.name}"`);
    } else if (normName.includes(normalizedQuery)) {
      score += 400;
      matchedFieldsSet.add(`Product Name: "${product.name}"`);
    }

    if (normSku === cleanQuery || normSku === normalizedQuery) {
      score += 900;
      matchedFieldsSet.add(`Exact SKU Match: ${product.sku}`);
    } else if (normSku.includes(cleanQuery)) {
      score += 350;
      matchedFieldsSet.add(`SKU Match: ${product.sku}`);
    }

    if (corpus.barcodes.some(b => b === cleanQuery || b.includes(cleanQuery))) {
      score += 950;
      matchedFieldsSet.add(`Barcode Match: ${product.barcode || cleanQuery}`);
    }

    if (normBrand === normalizedQuery) {
      score += 500;
      matchedFieldsSet.add(`Exact Brand: ${product.brand}`);
    } else if (normBrand.includes(normalizedQuery)) {
      score += 250;
      matchedFieldsSet.add(`Brand: ${product.brand}`);
    }

    // B. Multi-Token Coverage Verification
    // Every token must match AT LEAST ONE field in the product
    let allTokensMatched = true;

    for (const token of tokens) {
      let tokenMatchedInProduct = false;

      // 1. Check Product Name
      if (normName.includes(token)) {
        tokenMatchedInProduct = true;
        score += 80;
        matchedFieldsSet.add(`Name: "${product.name}"`);
      }

      // 2. Check SKU
      if (normSku.includes(token)) {
        tokenMatchedInProduct = true;
        score += 100;
        matchedFieldsSet.add(`SKU: ${product.sku}`);
      }

      // 3. Check Barcodes
      if (corpus.barcodes.some(b => b.includes(token))) {
        tokenMatchedInProduct = true;
        score += 110;
        matchedFieldsSet.add(`Barcode`);
      }

      // 4. Check Brand
      if (normBrand.includes(token)) {
        tokenMatchedInProduct = true;
        score += 70;
        matchedFieldsSet.add(`Brand: ${product.brand}`);
      }

      // 5. Check Category
      if (normCat.includes(token)) {
        tokenMatchedInProduct = true;
        score += 50;
        matchedFieldsSet.add(`Category: ${product.category}`);
      }

      // 6. Check Description
      if (normalizeText(corpus.description).includes(token)) {
        tokenMatchedInProduct = true;
        score += 30;
        matchedFieldsSet.add(`Description`);
      }

      // 7. Check Attributes (Model, Unit, etc.)
      for (const [attrKey, attrVal] of Object.entries(corpus.attributes)) {
        const normKey = normalizeText(attrKey);
        const normVal = normalizeText(attrVal);
        if (normKey.includes(token) || normVal.includes(token)) {
          tokenMatchedInProduct = true;
          score += 65;
          matchedFieldsSet.add(`Attribute (${attrKey}: ${attrVal})`);
        }
      }

      // 8. Check Specifications (Storage, RAM, Display, Battery, etc.)
      for (const [specKey, specVal] of Object.entries(corpus.specifications)) {
        const normKey = normalizeText(specKey);
        const normVal = normalizeText(specVal);
        if (normKey.includes(token) || normVal.includes(token)) {
          tokenMatchedInProduct = true;
          score += 75;
          matchedFieldsSet.add(`Specification (${specKey}: ${specVal})`);
        }
      }

      // 9. Check Variants (SKU, Title, Color, Size, Options)
      for (const v of corpus.variants) {
        if (
          v.sku.includes(token) ||
          normalizeText(v.title).includes(token) ||
          (v.color && normalizeText(v.color).includes(token)) ||
          (v.size && normalizeText(v.size).includes(token)) ||
          v.barcodes.some(b => b.includes(token))
        ) {
          tokenMatchedInProduct = true;
          score += 60;
          matchedVariantObj = v.variantObj;
          matchedFieldsSet.add(`Variant (${v.title || v.sku})`);
        }

        for (const [optKey, optVal] of Object.entries(v.options)) {
          if (normalizeText(optKey).includes(token) || normalizeText(optVal).includes(token)) {
            tokenMatchedInProduct = true;
            score += 65;
            matchedVariantObj = v.variantObj;
            matchedFieldsSet.add(`Variant Option (${optKey}: ${optVal})`);
          }
        }
      }

      if (!tokenMatchedInProduct) {
        allTokensMatched = false;
        break; // Query token missing in this product
      }
    }

    if (allTokensMatched && score > 0) {
      // Add slight bonus for popular / featured items
      if (product.isBestSeller) score += 15;
      if (product.salesCount) score += Math.min(product.salesCount / 10, 20);

      const matchedFieldsArray = Array.from(matchedFieldsSet);
      const primaryReason = matchedFieldsArray.slice(0, 3).join(' • ');

      results.push({
        product,
        matchedVariant: matchedVariantObj,
        score,
        matchedFields: matchedFieldsArray,
        primaryMatchReason: primaryReason || 'Multi-field match'
      });
    }
  }

  // Sort Results
  const sortBy = options.sortBy || 'relevance';
  results.sort((a, b) => {
    if (sortBy === 'relevance') return b.score - a.score;
    if (sortBy === 'price-asc') return a.product.price - b.product.price;
    if (sortBy === 'price-desc') return b.product.price - a.product.price;
    if (sortBy === 'rating') return (b.product.rating || 0) - (a.product.rating || 0);
    if (sortBy === 'newest') return (b.product.isNewArrival ? 1 : 0) - (a.product.isNewArrival ? 1 : 0);
    if (sortBy === 'bestsellers') return (b.product.salesCount || 0) - (a.product.salesCount || 0);
    return b.score - a.score;
  });

  if (options.limit && options.limit > 0) {
    return results.slice(0, options.limit);
  }

  return results;
}

/**
 * Generates instant suggestions, matching categories, matching brands, and top items.
 */
export function getSearchSuggestions(products: Product[], query: string): SearchSuggestions {
  const tokens = tokenizeQuery(query);
  if (!query || !query.trim() || tokens.length === 0) {
    return {
      query: '',
      tokens: [],
      totalMatches: 0,
      matchingCategories: [],
      matchingBrands: [],
      topProducts: []
    };
  }

  const allSearchResults = searchProducts(products, query);

  // Extract unique categories and brands among matching products
  const categoryCountMap = new Map<string, number>();
  const brandCountMap = new Map<string, number>();

  allSearchResults.forEach(res => {
    if (res.product.category) {
      categoryCountMap.set(res.product.category, (categoryCountMap.get(res.product.category) || 0) + 1);
    }
    if (res.product.brand) {
      brandCountMap.set(res.product.brand, (brandCountMap.get(res.product.brand) || 0) + 1);
    }
  });

  const matchingCategories = Array.from(categoryCountMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(e => e[0])
    .slice(0, 4);

  const matchingBrands = Array.from(brandCountMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(e => e[0])
    .slice(0, 4);

  return {
    query: query.trim(),
    tokens,
    totalMatches: allSearchResults.length,
    matchingCategories,
    matchingBrands,
    topProducts: allSearchResults.slice(0, 6)
  };
}

/**
 * Helper to check if a single product matches a search query
 */
export function productMatchesQuery(product: Product, query: string): boolean {
  if (!query || !query.trim()) return true;
  const results = searchProducts([product], query);
  return results.length > 0;
}
