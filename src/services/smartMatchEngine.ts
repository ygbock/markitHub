import { Product, ProductRelationships, ProductRelationshipType, Order } from '../types';
import { INITIAL_ORDERS } from '../data/mockData';

export interface SmartMatchCandidate {
  product: Product;
  score: number; // Overall percentage score (0-100)
  confidence: 'High' | 'Medium' | 'Standard';
  categoryScore: number;
  priceScore: number;
  coPurchaseScore: number;
  textScore: number;
  coPurchaseCount: number;
  reasons: string[];
}

export interface SmartMatchResult {
  targetProductId?: string;
  relationshipType: ProductRelationshipType;
  matches: SmartMatchCandidate[];
  summary: {
    totalEvaluated: number;
    highConfidenceMatches: number;
    topCategoryOverlap: string;
    avgPriceRatio: number;
  };
}

/**
 * 1. Category Taxonomy Taxonomy Similarity Algorithm
 * Computes tree depth & leaf term overlap Jaccard index between category path strings
 * e.g., "Footwear & Athletic > Running" vs "Footwear & Athletic > Lifestyle"
 */
export function calculateCategoryTaxonomySimilarity(
  categoryA?: string,
  categoryB?: string,
  brandA?: string,
  brandB?: string
): number {
  if (!categoryA || !categoryB) return 0.1;

  const tokenize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2 && !['and', 'the', 'for', 'with', 'etc'].includes(t));

  const tokensA = new Set(tokenize(categoryA));
  const tokensB = new Set(tokenize(categoryB));

  // Direct match shortcut
  if (categoryA.trim().toLowerCase() === categoryB.trim().toLowerCase()) {
    let score = 0.9;
    if (brandA && brandB && brandA.trim().toLowerCase() === brandB.trim().toLowerCase()) {
      score = 1.0;
    }
    return score;
  }

  // Jaccard similarity between taxonomy tokens
  const intersection = new Set([...tokensA].filter(x => tokensB.has(x)));
  const union = new Set([...tokensA, ...tokensB]);
  
  if (union.size === 0) return 0.1;

  let jaccard = intersection.size / union.size;

  // Brand affinity bonus
  if (brandA && brandB && brandA.trim().toLowerCase() === brandB.trim().toLowerCase()) {
    jaccard += 0.2;
  }

  return Math.min(1.0, Math.max(0.05, jaccard));
}

/**
 * 2. Price Tier & Strategy Target Similarity Score
 * Evaluates price ratio r = PriceB / PriceA based on the intended relationship type:
 * - 'related': similar price range (r ~ 1.0)
 * - 'upsell': higher price tier (r ~ 1.15 to 2.2)
 * - 'boughtTogether' / 'crossSell': complementary lower price accessories (r ~ 0.05 to 0.45)
 * - 'replacement': close price model successor (r ~ 0.85 to 1.30)
 * - 'recommended': broad range
 */
export function calculatePriceRatioScore(
  priceA: number,
  priceB: number,
  relationshipType: ProductRelationshipType
): number {
  if (priceA <= 0 || priceB <= 0) return 0.5;

  const ratio = priceB / priceA;

  switch (relationshipType) {
    case 'upsell': {
      // Upsells should cost MORE than base item (e.g., +15% to +150%)
      if (ratio >= 1.15 && ratio <= 2.50) {
        // Peak score around 1.35x
        const dev = Math.abs(ratio - 1.35);
        return Math.max(0.2, 1.0 - dev * 0.6);
      }
      if (ratio > 1.0 && ratio < 1.15) return 0.6;
      if (ratio > 2.5) return 0.4;
      return 0.1; // Cheaper items are bad upsells
    }

    case 'boughtTogether':
    case 'crossSell': {
      // Accessories and cross-sells are typically 5% to 50% of base item price
      if (ratio >= 0.05 && ratio <= 0.50) {
        const dev = Math.abs(ratio - 0.25);
        return Math.max(0.3, 1.0 - dev * 1.2);
      }
      if (ratio < 0.05) return 0.6;
      if (ratio > 0.50 && ratio <= 0.85) return 0.5;
      return 0.2;
    }

    case 'replacement': {
      // Replacement models should be within +-25% of original cost
      const dev = Math.abs(ratio - 1.0);
      return Math.max(0.1, 1.0 - dev * 1.5);
    }

    case 'related': {
      // Related products are in similar price tier (+-50%)
      const dev = Math.abs(ratio - 1.0);
      return Math.max(0.15, 1.0 - dev * 0.8);
    }

    case 'recommended':
    default: {
      const dev = Math.abs(ratio - 1.0);
      return Math.max(0.3, 1.0 - dev * 0.5);
    }
  }
}

/**
 * 3. Collaborative Filtering Co-occurrence Analysis
 * Computes shared customer purchasing frequencies across orders
 */
export function calculateCoPurchasingScore(
  targetId?: string,
  candidateId?: string,
  orders: Order[] = INITIAL_ORDERS
): { score: number; count: number } {
  if (!targetId || !candidateId || orders.length === 0) {
    return { score: 0.1, count: 0 };
  }

  let coOccurrenceCount = 0;
  let targetOrderCount = 0;
  let candidateOrderCount = 0;

  orders.forEach(ord => {
    if (!ord.items || ord.items.length < 2) return;
    const itemProductIds = ord.items.map(i => i.productId);
    const hasTarget = itemProductIds.includes(targetId);
    const hasCandidate = itemProductIds.includes(candidateId);

    if (hasTarget) targetOrderCount++;
    if (hasCandidate) candidateOrderCount++;
    if (hasTarget && hasCandidate) coOccurrenceCount++;
  });

  if (coOccurrenceCount === 0) {
    // If no order data exists for both, return low baseline
    return { score: 0.1, count: 0 };
  }

  // Jaccard Co-occurrence Index = |A ∩ B| / |A ∪ B|
  const union = targetOrderCount + candidateOrderCount - coOccurrenceCount;
  const jaccard = union > 0 ? coOccurrenceCount / union : 0;

  // Scale score based on co-occurrence density
  const scaledScore = Math.min(1.0, 0.4 + jaccard * 0.6 + Math.min(coOccurrenceCount, 10) * 0.05);

  return {
    score: scaledScore,
    count: coOccurrenceCount
  };
}

/**
 * 4. Text & Semantic Feature N-Gram Similarity
 * Tokenizes name, SKU, keywords, description and calculates cosine token similarity
 */
export function calculateTextSemanticSimilarity(prodA: Partial<Product>, prodB: Product): number {
  const extractTokens = (p: Partial<Product>) => {
    const text = [p.name, p.sku, p.category, p.brand, p.description].filter(Boolean).join(' ').toLowerCase();
    return text
      .replace(/[^a-z0-9\s]/gi, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);
  };

  const tokensA = extractTokens(prodA);
  const tokensB = extractTokens(prodB);

  if (tokensA.length === 0 || tokensB.length === 0) return 0.2;

  const freqA: Record<string, number> = {};
  const freqB: Record<string, number> = {};

  tokensA.forEach(t => { freqA[t] = (freqA[t] || 0) + 1; });
  tokensB.forEach(t => { freqB[t] = (freqB[t] || 0) + 1; });

  const allWords = Array.from(new Set([...Object.keys(freqA), ...Object.keys(freqB)]));

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  allWords.forEach(w => {
    const valA = freqA[w] || 0;
    const valB = freqB[w] || 0;
    dotProduct += valA * valB;
    magA += valA * valA;
    magB += valB * valB;
  });

  if (magA === 0 || magB === 0) return 0.2;

  const cosineSimilarity = dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
  return Math.min(1.0, Math.max(0.1, cosineSimilarity));
}

/**
 * Main ML Smart-Match Engine Execution Function
 * Evaluates candidate catalog products against a target product using multi-feature weighting
 */
export function runSmartMatchEngine(
  targetProduct: Partial<Product>,
  candidatePool: Product[],
  relationshipType: ProductRelationshipType,
  orders: Order[] = INITIAL_ORDERS,
  limit: number = 6
): SmartMatchResult {
  const validCandidates = candidatePool.filter(p => p.id !== targetProduct.id);

  const evaluated: SmartMatchCandidate[] = validCandidates.map(candidate => {
    // 1. Category Taxonomy Score
    const catSim = calculateCategoryTaxonomySimilarity(
      targetProduct.category,
      candidate.category,
      targetProduct.brand,
      candidate.brand
    );

    // 2. Price Ratio Strategy Score
    const priceSim = calculatePriceRatioScore(
      targetProduct.price || 50,
      candidate.price,
      relationshipType
    );

    // 3. Collaborative Filtering Co-purchasing Score
    const coBuyResult = calculateCoPurchasingScore(
      targetProduct.id,
      candidate.id,
      orders
    );

    // 4. Text / N-gram Semantic Score
    const textSim = calculateTextSemanticSimilarity(targetProduct, candidate);

    // Multi-Feature ML Weights (Dynamic based on relationship type)
    let wCategory = 0.35;
    let wPrice = 0.25;
    let wCoBuy = 0.25;
    let wText = 0.15;

    if (relationshipType === 'boughtTogether' || relationshipType === 'crossSell') {
      wPrice = 0.35;
      wCoBuy = 0.35;
      wCategory = 0.20;
      wText = 0.10;
    } else if (relationshipType === 'upsell') {
      wPrice = 0.40;
      wCategory = 0.30;
      wText = 0.20;
      wCoBuy = 0.10;
    } else if (relationshipType === 'replacement') {
      wCategory = 0.40;
      wText = 0.35;
      wPrice = 0.15;
      wCoBuy = 0.10;
    }

    // Weighted combined score (0 to 1)
    const rawScore = (catSim * wCategory) + (priceSim * wPrice) + (coBuyResult.score * wCoBuy) + (textSim * wText);
    const scorePct = Math.round(Math.min(99, Math.max(15, rawScore * 100)));

    // Generate human-understandable reasoning tags
    const reasons: string[] = [];

    if (catSim >= 0.8) {
      reasons.push(`Taxonomy Match: ${candidate.category}`);
    } else if (catSim >= 0.5) {
      reasons.push(`Shared Category Overlap`);
    }

    if (targetProduct.brand && candidate.brand && targetProduct.brand.toLowerCase() === candidate.brand.toLowerCase()) {
      reasons.push(`Same Brand (${candidate.brand})`);
    }

    if (coBuyResult.count > 0) {
      reasons.push(`Co-purchased in ${coBuyResult.count} customer orders`);
    }

    const priceRatio = candidate.price / (targetProduct.price || 1);
    if (relationshipType === 'upsell' && priceRatio > 1.1) {
      reasons.push(`Premium Tier (+${Math.round((priceRatio - 1) * 100)}% price)`);
    } else if ((relationshipType === 'boughtTogether' || relationshipType === 'crossSell') && priceRatio <= 0.45) {
      reasons.push(`Ideal Accessory Ratio (${priceRatio.toFixed(2)}x base price)`);
    } else if (Math.abs(priceRatio - 1.0) <= 0.15) {
      reasons.push(`Matching Price Bracket ($${candidate.price.toFixed(2)})`);
    }

    if (candidate.isBestSeller) {
      reasons.push('Best-Seller Performance');
    }

    // Confidence Tiering
    let confidence: 'High' | 'Medium' | 'Standard' = 'Standard';
    if (scorePct >= 75) confidence = 'High';
    else if (scorePct >= 55) confidence = 'Medium';

    return {
      product: candidate,
      score: scorePct,
      confidence,
      categoryScore: Math.round(catSim * 100),
      priceScore: Math.round(priceSim * 100),
      coPurchaseScore: Math.round(coBuyResult.score * 100),
      textScore: Math.round(textSim * 100),
      coPurchaseCount: coBuyResult.count,
      reasons: reasons.slice(0, 3)
    };
  });

  // Sort descending by ML match score
  evaluated.sort((a, b) => b.score - a.score);

  const topMatches = evaluated.slice(0, limit);

  // Summary analytics
  const highConfidenceCount = evaluated.filter(m => m.confidence === 'High').length;
  const avgRatio = topMatches.length > 0
    ? topMatches.reduce((acc, m) => acc + (m.product.price / (targetProduct.price || 1)), 0) / topMatches.length
    : 1.0;

  return {
    targetProductId: targetProduct.id,
    relationshipType,
    matches: topMatches,
    summary: {
      totalEvaluated: validCandidates.length,
      highConfidenceMatches: highConfidenceCount,
      topCategoryOverlap: targetProduct.category || 'General',
      avgPriceRatio: Number(avgRatio.toFixed(2))
    }
  };
}

/**
 * Executes ML Classification across all 6 Relationship Matrix Categories
 */
export function autoClassifyFullMatrixML(
  targetProduct: Partial<Product>,
  allProducts: Product[],
  orders: Order[] = INITIAL_ORDERS
): ProductRelationships {
  const relationshipTypes: ProductRelationshipType[] = [
    'related',
    'recommended',
    'boughtTogether',
    'replacement',
    'upsell',
    'crossSell'
  ];

  const keyMap: Record<ProductRelationshipType, keyof ProductRelationships> = {
    related: 'relatedProductIds',
    recommended: 'recommendedProductIds',
    boughtTogether: 'boughtTogetherProductIds',
    replacement: 'replacementProductIds',
    upsell: 'upsellProductIds',
    crossSell: 'crossSellProductIds'
  };

  const usedProductIds = new Set<string>();
  const result: ProductRelationships = {};

  relationshipTypes.forEach(type => {
    const matchResult = runSmartMatchEngine(targetProduct, allProducts, type, orders, 8);
    
    // Pick top candidates that haven't been assigned to another relationship group yet
    const selected = matchResult.matches
      .filter(m => !usedProductIds.has(m.product.id))
      .slice(0, 3)
      .map(m => m.product.id);

    selected.forEach(id => usedProductIds.add(id));
    result[keyMap[type]] = selected;
  });

  return result;
}
