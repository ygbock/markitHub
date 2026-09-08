import { Product, Customer, Order, RecommendationRuleMatch, BrowsingHistoryItem } from '../types';

export interface BundleItemWithState {
  product: Product;
  isSelected: boolean;
  isMainProduct?: boolean;
}

export interface BundleCalculation {
  items: BundleItemWithState[];
  originalTotal: number;
  bundleDiscountPercent: number; // e.g. 10% off
  discountAmount: number;
  finalBundlePrice: number;
  totalSavings: number;
  selectedCount: number;
}

export interface RecommendedProductWithReason {
  product: Product;
  reason: string;
  matchScore: number;
  ruleType?: string;
  ruleDetails?: any;
}

export interface RecentlyViewedProductItem {
  product: Product;
  viewedAt: string;
  timeAgo: string;
  viewCount: number;
}

const RECENTLY_VIEWED_STORAGE_KEY = 'nexus_recently_viewed_products';
const MAX_RECENTLY_VIEWED = 20;

// Helper to calculate creation date timestamp
function getProductCreationTimestamp(product: Product): number {
  if (product.createdAt) {
    const ts = new Date(product.createdAt).getTime();
    if (!isNaN(ts)) return ts;
  }
  // If product has batch received dates, use that
  if (product.fifoBatches && product.fifoBatches.length > 0 && product.fifoBatches[0].receivedDate) {
    const ts = new Date(product.fifoBatches[0].receivedDate).getTime();
    if (!isNaN(ts)) return ts;
  }
  // Deterministic fallback based on product ID sequence
  const hash = product.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const daysAgo = (hash % 60) + 1; // 1 to 60 days ago
  return Date.now() - daysAgo * 24 * 60 * 60 * 1000;
}

// Format relative time helper
export function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 min ago';
  if (diffMins < 60) return `${diffMins} mins ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}

/* =========================================================================
   # 33. RECENTLY VIEWED (Browsing History Tracker & Resolver)
   ========================================================================= */

/**
 * Track a product view in local browsing history.
 * Tracks: Product A, Product B, Product C with timestamps & view counts.
 */
export function trackRecentlyViewed(productOrId: Product | string, customerId?: string): void {
  if (!productOrId) return;
  const productId = typeof productOrId === 'string' ? productOrId : productOrId.id;
  if (!productId) return;

  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
    let items: BrowsingHistoryItem[] = raw ? JSON.parse(raw) : [];

    const existingIndex = items.findIndex(item => item.productId === productId);
    let currentViewCount = 1;

    if (existingIndex >= 0) {
      currentViewCount = (items[existingIndex].viewCount || 1) + 1;
      items.splice(existingIndex, 1);
    }

    const newItem: BrowsingHistoryItem = {
      productId,
      productName: typeof productOrId === 'object' ? productOrId.name : undefined,
      category: typeof productOrId === 'object' ? productOrId.category : undefined,
      brand: typeof productOrId === 'object' ? productOrId.brand : undefined,
      price: typeof productOrId === 'object' ? productOrId.price : undefined,
      viewedAt: new Date().toISOString(),
      viewCount: currentViewCount
    };

    items.unshift(newItem);
    items = items.slice(0, MAX_RECENTLY_VIEWED);

    localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(items));

    // Dispatch reactive window event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexus:product_viewed', { 
        detail: { productId, item: newItem, customerId } 
      }));
    }
  } catch (e) {
    console.warn('Failed to track recently viewed product', e);
  }
}

/**
 * Retrieve raw browsing history list
 */
export function getRecentlyViewedIds(): BrowsingHistoryItem[] {
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Clear customer browsing history
 */
export function clearRecentlyViewedHistory(): void {
  try {
    localStorage.removeItem(RECENTLY_VIEWED_STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexus:product_viewed', { detail: { cleared: true } }));
    }
  } catch (e) {
    console.warn('Failed to clear browsing history', e);
  }
}

/**
 * Resolve full product objects for the "Recently Viewed" section
 */
export function getRecentlyViewedProducts(
  currentProductId: string | undefined,
  allProducts: Product[]
): RecentlyViewedProductItem[] {
  const history = getRecentlyViewedIds();
  const productMap = new Map(allProducts.map(p => [p.id, p]));

  const result: RecentlyViewedProductItem[] = [];

  for (const item of history) {
    // Exclude current product if inspecting single product details
    if (currentProductId && item.productId === currentProductId) continue;

    const prod = productMap.get(item.productId);
    if (prod) {
      result.push({
        product: prod,
        viewedAt: item.viewedAt,
        timeAgo: formatTimeAgo(new Date(item.viewedAt).getTime()),
        viewCount: item.viewCount || 1
      });
    }
  }

  return result;
}

/**
 * Simulate browsing sequence (e.g. Product A -> Product B -> Product C)
 */
export function simulateBrowsingJourney(productIds: string[], allProducts: Product[]): void {
  productIds.forEach((pid, index) => {
    const prod = allProducts.find(p => p.id === pid);
    if (prod) {
      setTimeout(() => {
        trackRecentlyViewed(prod);
      }, index * 50);
    }
  });
}

/* =========================================================================
   # 34. RULE-BASED RECOMMENDATION ENGINE
   (Pure Deterministic Business Logic — Best Sellers, New Arrivals, Related,
    Frequently Bought Together, Recently Viewed Browsing Affinities)
   ========================================================================= */

/**
 * RULE 1: BEST SELLERS
 * Rule logic: Ranked strictly based on real sales volume aggregated from order history + product.salesCount
 */
export function getBestSellerRecommendations(
  allProducts: Product[],
  orders: Order[] = [],
  limit = 8
): RecommendedProductWithReason[] {
  // Aggregate real units sold from order history
  const orderSalesMap: Record<string, { unitsSold: number; ordersCount: number }> = {};

  orders.forEach(order => {
    // Count only non-cancelled orders
    if (order.status !== 'Cancelled') {
      order.items?.forEach(item => {
        if (!orderSalesMap[item.productId]) {
          orderSalesMap[item.productId] = { unitsSold: 0, ordersCount: 0 };
        }
        orderSalesMap[item.productId].unitsSold += (item.quantity || 1);
        orderSalesMap[item.productId].ordersCount += 1;
      });
    }
  });

  const scored = allProducts.map(prod => {
    const fromOrders = orderSalesMap[prod.id] || { unitsSold: 0, ordersCount: 0 };
    const catalogSales = prod.salesCount || 0;
    const totalUnitsSold = catalogSales + fromOrders.unitsSold;

    return {
      product: prod,
      totalUnitsSold,
      ordersCount: fromOrders.ordersCount,
      score: totalUnitsSold
    };
  });

  scored.sort((a, b) => b.totalUnitsSold - a.totalUnitsSold);

  return scored.slice(0, limit).map((s, idx) => ({
    product: s.product,
    reason: `Best Seller: #${idx + 1} (${s.totalUnitsSold} units sold)`,
    matchScore: s.score,
    ruleType: 'BEST_SELLERS',
    ruleDetails: {
      salesVolume: s.totalUnitsSold,
      ordersCount: s.ordersCount
    }
  }));
}

/**
 * RULE 2: NEW ARRIVALS
 * Rule logic: Ranked strictly based on product creation date / launch date
 */
export function getNewArrivalRecommendations(
  allProducts: Product[],
  limit = 8
): RecommendedProductWithReason[] {
  const scored = allProducts.map(prod => {
    const creationTimestamp = getProductCreationTimestamp(prod);
    const daysAgo = Math.max(0, Math.floor((Date.now() - creationTimestamp) / (1000 * 60 * 60 * 24)));
    
    // Explicit isNewArrival flag gets an extra boost
    const freshnessBonus = prod.isNewArrival ? 100 : 0;
    const score = (1000 - daysAgo) + freshnessBonus;

    return {
      product: prod,
      creationTimestamp,
      daysAgo,
      score
    };
  });

  scored.sort((a, b) => b.creationTimestamp - a.creationTimestamp);

  return scored.slice(0, limit).map(s => ({
    product: s.product,
    reason: s.daysAgo === 0 
      ? 'New Arrival: Added today' 
      : s.daysAgo === 1 
      ? 'New Arrival: Added yesterday' 
      : `New Arrival: Added ${s.daysAgo} days ago`,
    matchScore: s.score,
    ruleType: 'NEW_ARRIVALS',
    ruleDetails: {
      daysSinceCreation: s.daysAgo,
      creationDate: new Date(s.creationTimestamp).toLocaleDateString()
    }
  }));
}

/**
 * RULE 3: RELATED PRODUCTS
 * Rule logic: Deterministic scoring based on Category match, Brand match, and Attributes (price tier, tags, model)
 */
export function getSimilarRelatedProducts(
  mainProduct: Product,
  allProducts: Product[],
  limit = 6
): Product[] {
  const recommendations = getRelatedProductsByRule(mainProduct, allProducts, limit);
  return recommendations.map(r => r.product);
}

export function getRelatedProductsByRule(
  mainProduct: Product,
  allProducts: Product[],
  limit = 6
): RecommendedProductWithReason[] {
  const otherProducts = allProducts.filter(p => p.id !== mainProduct.id);

  // Check explicit relatedProductIds first
  const explicitIds = mainProduct.relationships?.relatedProductIds || [];
  const explicitSet = new Set(explicitIds);

  const mainCategory = (mainProduct.category || '').toLowerCase();
  const mainBrand = (mainProduct.brand || '').toLowerCase();

  const scored = otherProducts.map(candidate => {
    let score = 0;
    const matchedAttributes: string[] = [];

    // Explicit relation match (+80 pts)
    if (explicitSet.has(candidate.id)) {
      score += 80;
      matchedAttributes.push('Curated Link');
    }

    // 1. Category match (+40 pts)
    const candCategory = (candidate.category || '').toLowerCase();
    if (candCategory && (candCategory === mainCategory || candCategory.includes(mainCategory) || mainCategory.includes(candCategory))) {
      score += 40;
      matchedAttributes.push(`Category: ${candidate.category}`);
    }

    // 2. Brand match (+30 pts)
    const candBrand = (candidate.brand || '').toLowerCase();
    if (mainBrand && candBrand && candBrand === mainBrand) {
      score += 30;
      matchedAttributes.push(`Brand: ${candidate.brand}`);
    }

    // 3. Similar Price Tier (within 35%: +20 pts; within 60%: +10 pts)
    if (mainProduct.price > 0) {
      const priceDiff = Math.abs(candidate.price - mainProduct.price) / mainProduct.price;
      if (priceDiff <= 0.35) {
        score += 20;
        matchedAttributes.push('Similar Price Bracket');
      } else if (priceDiff <= 0.60) {
        score += 10;
      }
    }

    // 4. Model / Variant / Tag match (+15 pts)
    if (mainProduct.model && candidate.model && candidate.model.toLowerCase().includes(mainProduct.model.toLowerCase().split(' ')[0])) {
      score += 15;
      matchedAttributes.push(`Series: ${candidate.model}`);
    }

    // 5. High rating bonus (+10 pts)
    if (candidate.rating && candidate.rating >= 4.7) {
      score += 10;
    }

    const reason = matchedAttributes.length > 0
      ? `Related: ${matchedAttributes.slice(0, 2).join(' • ')}`
      : `Related to ${mainProduct.name}`;

    return {
      product: candidate,
      reason,
      matchScore: score,
      ruleType: 'RELATED_PRODUCTS',
      ruleDetails: {
        matchedAttributes
      }
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
  return scored.slice(0, limit);
}

/**
 * RULE 4: FREQUENTLY BOUGHT TOGETHER
 * Rule logic: Based on real order history co-occurrence mining (Association Rules).
 * Fallback to complementary accessory category heuristics if order history is sparse.
 */
export function getFrequentlyBoughtTogetherByRule(
  mainProduct: Product,
  allProducts: Product[],
  orders: Order[] = [],
  limit = 3
): RecommendedProductWithReason[] {
  const otherProducts = allProducts.filter(p => p.id !== mainProduct.id && (p.stock > 0 || p.hasVariants));
  const otherProductMap = new Map(otherProducts.map(p => [p.id, p]));

  // 1. Analyze actual order history co-occurrences
  const coPurchaseCountMap: Record<string, number> = {};
  let targetOrderCount = 0;

  orders.forEach(order => {
    if (order.status === 'Cancelled') return;
    const itemIds = order.items?.map(i => i.productId) || [];
    if (itemIds.includes(mainProduct.id)) {
      targetOrderCount++;
      itemIds.forEach(otherId => {
        if (otherId !== mainProduct.id && otherProductMap.has(otherId)) {
          coPurchaseCountMap[otherId] = (coPurchaseCountMap[otherId] || 0) + 1;
        }
      });
    }
  });

  // Sort co-purchased items
  const coPurchasedItems = Object.entries(coPurchaseCountMap)
    .map(([productId, count]) => {
      const prod = otherProductMap.get(productId)!;
      const confidence = targetOrderCount > 0 ? Math.round((count / targetOrderCount) * 100) : 0;
      return {
        product: prod,
        reason: `Frequently Bought Together: Co-purchased in ${count} orders (${confidence}% confidence)`,
        matchScore: count * 20 + confidence,
        ruleType: 'FREQUENTLY_BOUGHT_TOGETHER',
        ruleDetails: {
          coPurchaseCount: count,
          coPurchaseConfidence: confidence
        }
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  if (coPurchasedItems.length >= limit) {
    return coPurchasedItems.slice(0, limit);
  }

  // 2. Complement with explicit boughtTogether IDs or category heuristics
  const existingIds = new Set(coPurchasedItems.map(c => c.product.id));
  const fallbackItems = getFrequentlyBoughtTogetherItems(mainProduct, allProducts)
    .filter(p => !existingIds.has(p.id))
    .map(prod => ({
      product: prod,
      reason: `Complementary Accessory for ${mainProduct.name}`,
      matchScore: 30,
      ruleType: 'FREQUENTLY_BOUGHT_TOGETHER',
      ruleDetails: {
        coPurchaseCount: 1,
        coPurchaseConfidence: 50
      }
    }));

  return [...coPurchasedItems, ...fallbackItems].slice(0, limit);
}

/**
 * Helper to resolve bundle items array
 */
export function getFrequentlyBoughtTogetherItems(
  mainProduct: Product,
  allProducts: Product[]
): Product[] {
  const otherProducts = allProducts.filter(p => p.id !== mainProduct.id && (p.stock > 0 || p.hasVariants));

  // Check explicit boughtTogetherProductIds
  if (mainProduct.relationships?.boughtTogetherProductIds && mainProduct.relationships.boughtTogetherProductIds.length > 0) {
    const explicitItems = mainProduct.relationships.boughtTogetherProductIds
      .map(id => otherProducts.find(p => p.id === id))
      .filter((p): p is Product => Boolean(p));
    
    if (explicitItems.length > 0) {
      return explicitItems.slice(0, 3);
    }
  }

  // Category heuristics
  const category = (mainProduct.category || '').toLowerCase();
  const name = (mainProduct.name || '').toLowerCase();

  if (category.includes('footwear') || category.includes('shoe') || name.includes('shoe') || name.includes('max') || name.includes('sneaker')) {
    const socks = otherProducts.find(p => (p.name || '').toLowerCase().includes('sock') || (p.sku || '').includes('SK-') || (p.sku || '').includes('SOCK'));
    const cleaner = otherProducts.find(p => (p.name || '').toLowerCase().includes('cleaner') || (p.name || '').toLowerCase().includes('care'));
    const bag = otherProducts.find(p => (p.name || '').toLowerCase().includes('bag') || (p.name || '').toLowerCase().includes('duffel') || (p.name || '').toLowerCase().includes('backpack'));
    const tShirt = otherProducts.find(p => (p.name || '').toLowerCase().includes('shirt') || (p.name || '').toLowerCase().includes('tee'));

    const items = [socks, cleaner, bag, tShirt].filter((p): p is Product => Boolean(p));
    if (items.length > 0) return items.slice(0, 3);
  }

  if (category.includes('phone') || name.includes('galaxy') || name.includes('iphone') || name.includes('xiaomi') || name.includes('pixel')) {
    const charger = otherProducts.find(p => (p.name || '').toLowerCase().includes('charger') || (p.name || '').toLowerCase().includes('adapter') || (p.sku || '').includes('CHG'));
    const audio = otherProducts.find(p => (p.category || '').toLowerCase().includes('electronics') && ((p.name || '').toLowerCase().includes('headphone') || (p.name || '').toLowerCase().includes('sound')));
    const watch = otherProducts.find(p => (p.name || '').toLowerCase().includes('watch') || (p.name || '').toLowerCase().includes('fit'));

    const items = [charger, audio, watch].filter((p): p is Product => Boolean(p));
    if (items.length > 0) return items.slice(0, 3);
  }

  if (category.includes('audio') || name.includes('headphone') || name.includes('earbud') || name.includes('sound')) {
    const organizer = otherProducts.find(p => (p.name || '').toLowerCase().includes('organizer') || (p.name || '').toLowerCase().includes('dock'));
    const watch = otherProducts.find(p => (p.name || '').toLowerCase().includes('watch') || (p.name || '').toLowerCase().includes('smartwatch'));
    const flask = otherProducts.find(p => (p.name || '').toLowerCase().includes('flask') || (p.name || '').toLowerCase().includes('bottle'));

    const items = [organizer, watch, flask].filter((p): p is Product => Boolean(p));
    if (items.length > 0) return items.slice(0, 3);
  }

  // Fallback to complementary accessories
  const accessories = otherProducts
    .filter(p => p.price < mainProduct.price * 0.75)
    .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));

  return accessories.slice(0, 3);
}

/**
 * RULE 5: RECENTLY VIEWED BROWSING AFFINITY
 * Rule logic: Extracts categories & brands from the customer's recent browsing history (Product A, Product B, Product C...)
 * and recommends unviewed products with matching affinity.
 */
export function getRecentlyViewedAffinityRecommendations(
  allProducts: Product[],
  limit = 6
): RecommendedProductWithReason[] {
  const history = getRecentlyViewedIds();
  if (history.length === 0) {
    // If no browsing history, fallback to Best Sellers
    return getBestSellerRecommendations(allProducts, [], limit);
  }

  const viewedProductIds = new Set(history.map(h => h.productId));
  const productMap = new Map(allProducts.map(p => [p.id, p]));

  // 1. Calculate category and brand weightings from browsing history
  const categoryWeights: Record<string, number> = {};
  const brandWeights: Record<string, number> = {};

  history.forEach((h, index) => {
    // Recency decay weight: first item has weight 5, second 4, etc.
    const recencyMultiplier = Math.max(1, 6 - index);
    const prod = productMap.get(h.productId);
    
    const cat = prod?.category || h.category;
    if (cat) {
      categoryWeights[cat] = (categoryWeights[cat] || 0) + (h.viewCount || 1) * recencyMultiplier;
    }

    const br = prod?.brand || h.brand;
    if (br) {
      brandWeights[br] = (brandWeights[br] || 0) + (h.viewCount || 1) * recencyMultiplier;
    }
  });

  // Identify top category & top brand
  const topCategory = Object.entries(categoryWeights).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topBrand = Object.entries(brandWeights).sort((a, b) => b[1] - a[1])[0]?.[0];

  // 2. Score unviewed products by browsing affinity
  const unviewedProducts = allProducts.filter(p => !viewedProductIds.has(p.id));

  const scored = unviewedProducts.map(prod => {
    let score = 0;
    let reason = 'Based on your browsing history';

    if (topCategory && prod.category === topCategory) {
      score += 50;
      reason = `Based on your recent interest in ${topCategory}`;
    } else if (prod.category && categoryWeights[prod.category]) {
      score += categoryWeights[prod.category] * 10;
      reason = `Based on your interest in ${prod.category}`;
    }

    if (topBrand && prod.brand === topBrand) {
      score += 35;
      reason = `Based on your interest in ${topBrand}`;
    }

    // Bestseller boost for unviewed products
    if (prod.isBestSeller || (prod.salesCount && prod.salesCount > 100)) {
      score += 15;
    }

    return {
      product: prod,
      reason,
      matchScore: score,
      ruleType: 'RECENTLY_VIEWED_AFFINITY',
      ruleDetails: {
        affinityCategory: topCategory,
        affinityBrand: topBrand
      }
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
  return scored.slice(0, limit);
}

/**
 * Universal Rule Engine Recommender: "You May Also Like"
 */
export function getYouMayAlsoLikeRecommendations(
  mainProduct: Product,
  allProducts: Product[],
  activeCustomer?: Customer | null,
  limit = 6
): RecommendedProductWithReason[] {
  // Combine Related + Best Seller + Browsing Affinity
  const related = getRelatedProductsByRule(mainProduct, allProducts, limit);
  if (related.length >= limit) return related;

  const affinity = getRecentlyViewedAffinityRecommendations(allProducts, limit);
  const existing = new Set(related.map(r => r.product.id));

  const combined = [...related];
  affinity.forEach(a => {
    if (!existing.has(a.product.id) && a.product.id !== mainProduct.id) {
      existing.add(a.product.id);
      combined.push(a);
    }
  });

  return combined.slice(0, limit);
}

/**
 * Calculate bundle discount pricing
 */
export function calculateBundlePricing(
  mainProduct: Product,
  mainProductPrice: number,
  bundleProducts: Product[],
  selectedItemIds: string[],
  bundleDiscountPercent = 10
): BundleCalculation {
  const items: BundleItemWithState[] = [
    {
      product: mainProduct,
      isSelected: true,
      isMainProduct: true
    },
    ...bundleProducts.map(p => ({
      product: p,
      isSelected: selectedItemIds.includes(p.id),
      isMainProduct: false
    }))
  ];

  const selectedItems = items.filter(i => i.isSelected);
  const originalTotal = selectedItems.reduce((sum, item) => {
    return sum + (item.isMainProduct ? mainProductPrice : item.product.price);
  }, 0);

  // Apply bundle discount only if at least 2 items (main + at least 1 add-on) are selected
  const hasBundleDiscount = selectedItems.length >= 2;
  const discountAmount = hasBundleDiscount ? (originalTotal * (bundleDiscountPercent / 100)) : 0;
  const finalBundlePrice = Math.max(0, originalTotal - discountAmount);

  return {
    items,
    originalTotal,
    bundleDiscountPercent: hasBundleDiscount ? bundleDiscountPercent : 0,
    discountAmount,
    finalBundlePrice,
    totalSavings: discountAmount,
    selectedCount: selectedItems.length
  };
}
