import { Product, WishlistItem, Customer } from '../types';

const GUEST_STORAGE_KEY = 'nexus_guest_wishlist';

function getStorageKey(customerId?: string): string {
  if (customerId && customerId.trim()) {
    return `nexus_customer_wishlist_${customerId.trim()}`;
  }
  return GUEST_STORAGE_KEY;
}

/**
 * Load wishlist items from localStorage for either a logged-in customer or guest
 */
export function loadWishlistItems(customerId?: string): WishlistItem[] {
  try {
    const key = getStorageKey(customerId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      // If customer has no specific wishlist yet, check if there are guest items to seed
      if (customerId) {
        const guestRaw = localStorage.getItem(GUEST_STORAGE_KEY);
        if (guestRaw) {
          const parsed = JSON.parse(guestRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localStorage.setItem(key, guestRaw);
            return parsed;
          }
        }
      }
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to parse wishlist from storage', err);
    return [];
  }
}

/**
 * Save wishlist items to storage and sync to customer CRM record
 */
export function saveWishlistItems(items: WishlistItem[], customerId?: string): void {
  try {
    const key = getStorageKey(customerId);
    localStorage.setItem(key, JSON.stringify(items));

    // Also sync directly into the customer CRM database record if customerId is present
    if (customerId) {
      syncCustomerWishlistToCRM(customerId, items);
    }
    
    // Dispatch window event for reactivity across components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexus-wishlist-updated', {
        detail: { customerId, count: items.length, items }
      }));
    }
  } catch (err) {
    console.warn('Failed to save wishlist to storage', err);
  }
}

/**
 * Synchronize wishlist items to the customer record in the CRM customers database
 */
export function syncCustomerWishlistToCRM(customerId: string, items: WishlistItem[]): void {
  try {
    const rawCustomers = localStorage.getItem('nexus_customers');
    if (!rawCustomers) return;

    const customersList: Customer[] = JSON.parse(rawCustomers);
    const targetIdx = customersList.findIndex(c => c.id === customerId);

    if (targetIdx > -1) {
      const updatedCustomer: Customer = {
        ...customersList[targetIdx],
        wishlist: items,
        wishlistProductIds: items.map(it => it.productId)
      };

      customersList[targetIdx] = updatedCustomer;
      localStorage.setItem('nexus_customers', JSON.stringify(customersList));

      // Dispatch customer updated event for CRM live sync
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexus-customer-updated', {
          detail: { customer: updatedCustomer }
        }));
      }
    }
  } catch (e) {
    console.warn('Failed to sync customer wishlist to CRM profile', e);
  }
}

/**
 * Add a product to the wishlist
 */
export function addToWishlist(
  product: Product,
  customerId?: string,
  options?: {
    variantSku?: string;
    notifyPriceDrop?: boolean;
    notifyBackInStock?: boolean;
    targetPrice?: number;
    notes?: string;
  }
): { items: WishlistItem[]; wasAdded: boolean; item: WishlistItem } {
  const current = loadWishlistItems(customerId);
  const sku = options?.variantSku || (product.variants && product.variants.length > 0 ? product.variants[0].sku : undefined);
  
  const existingIdx = current.findIndex(it => it.productId === product.id && it.selectedVariantSku === sku);
  
  if (existingIdx > -1) {
    // Already in wishlist, update alerts if requested
    const updated = [...current];
    updated[existingIdx] = {
      ...updated[existingIdx],
      notifyPriceDrop: options?.notifyPriceDrop ?? updated[existingIdx].notifyPriceDrop ?? true,
      notifyBackInStock: options?.notifyBackInStock ?? updated[existingIdx].notifyBackInStock ?? true
    };
    saveWishlistItems(updated, customerId);
    return { items: updated, wasAdded: false, item: updated[existingIdx] };
  }

  const newItem: WishlistItem = {
    id: `wsh-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    productId: product.id,
    addedAt: new Date().toISOString(),
    priceWhenAdded: product.price,
    notifyPriceDrop: options?.notifyPriceDrop ?? true,
    notifyBackInStock: options?.notifyBackInStock ?? true,
    targetPrice: options?.targetPrice,
    selectedVariantSku: sku,
    notes: options?.notes
  };

  const updated = [newItem, ...current];
  saveWishlistItems(updated, customerId);
  return { items: updated, wasAdded: true, item: newItem };
}

/**
 * Remove a product from the wishlist
 */
export function removeFromWishlist(
  productId: string,
  customerId?: string,
  variantSku?: string
): WishlistItem[] {
  const current = loadWishlistItems(customerId);
  const updated = current.filter(it => {
    if (it.productId !== productId) return true;
    if (variantSku && it.selectedVariantSku && it.selectedVariantSku !== variantSku) return true;
    return false;
  });
  saveWishlistItems(updated, customerId);
  return updated;
}

/**
 * Toggle product in wishlist (Add if not present, Remove if present)
 */
export function toggleWishlist(
  product: Product,
  customerId?: string,
  options?: { variantSku?: string }
): { items: WishlistItem[]; isAdded: boolean } {
  const current = loadWishlistItems(customerId);
  const sku = options?.variantSku || (product.variants && product.variants.length > 0 ? product.variants[0].sku : undefined);
  const exists = current.some(it => it.productId === product.id && (sku ? it.selectedVariantSku === sku : true));

  if (exists) {
    const updated = removeFromWishlist(product.id, customerId, sku);
    return { items: updated, isAdded: false };
  } else {
    const res = addToWishlist(product, customerId, { variantSku: sku });
    return { items: res.items, isAdded: true };
  }
}

/**
 * Update alert preferences for an item (Price Drop & Back in Stock)
 */
export function updateWishlistAlertSettings(
  productId: string,
  alerts: { notifyPriceDrop?: boolean; notifyBackInStock?: boolean },
  customerId?: string
): WishlistItem[] {
  const current = loadWishlistItems(customerId);
  const updated = current.map(item => {
    if (item.productId === productId) {
      return {
        ...item,
        notifyPriceDrop: alerts.notifyPriceDrop !== undefined ? alerts.notifyPriceDrop : item.notifyPriceDrop,
        notifyBackInStock: alerts.notifyBackInStock !== undefined ? alerts.notifyBackInStock : item.notifyBackInStock
      };
    }
    return item;
  });
  saveWishlistItems(updated, customerId);
  return updated;
}

/**
 * Clear all items in wishlist
 */
export function clearWishlist(customerId?: string): void {
  saveWishlistItems([], customerId);
}

/**
 * Merges guest items into logged-in customer's profile upon sign in
 */
export function mergeGuestWishlistToCustomer(customerId: string): WishlistItem[] {
  try {
    const guestItems = loadWishlistItems();
    if (guestItems.length === 0) return loadWishlistItems(customerId);

    const customerItems = loadWishlistItems(customerId);
    const existingIds = new Set(customerItems.map(it => `${it.productId}_${it.selectedVariantSku || ''}`));

    const merged = [...customerItems];
    guestItems.forEach(gItem => {
      const key = `${gItem.productId}_${gItem.selectedVariantSku || ''}`;
      if (!existingIds.has(key)) {
        merged.push(gItem);
        existingIds.add(key);
      }
    });

    saveWishlistItems(merged, customerId);
    return merged;
  } catch (err) {
    console.warn('Failed to merge guest wishlist to customer', err);
    return loadWishlistItems(customerId);
  }
}

export interface WishlistPriceDropNotice {
  item: WishlistItem;
  product: Product;
  priceWhenAdded: number;
  currentPrice: number;
  dropAmount: number;
  dropPercentage: number;
}

export interface WishlistBackInStockNotice {
  item: WishlistItem;
  product: Product;
  availableStock: number;
}

/**
 * Detect price drops for items in the customer's wishlist
 */
export function detectWishlistPriceDrops(
  wishlist: WishlistItem[],
  allProducts: Product[]
): WishlistPriceDropNotice[] {
  const notices: WishlistPriceDropNotice[] = [];
  const productMap = new Map(allProducts.map(p => [p.id, p]));

  wishlist.forEach(item => {
    const prod = productMap.get(item.productId);
    if (!prod) return;

    const currentPrice = prod.price;
    const addedPrice = item.priceWhenAdded || prod.originalPrice || prod.price;

    // Check if price is lower than when added or has an active discount
    if (currentPrice < addedPrice) {
      const dropAmount = addedPrice - currentPrice;
      const dropPercentage = Math.round((dropAmount / addedPrice) * 100);
      notices.push({
        item,
        product: prod,
        priceWhenAdded: addedPrice,
        currentPrice,
        dropAmount,
        dropPercentage
      });
    } else if (prod.originalPrice && prod.originalPrice > currentPrice && item.notifyPriceDrop) {
      const dropAmount = prod.originalPrice - currentPrice;
      const dropPercentage = Math.round((dropAmount / prod.originalPrice) * 100);
      notices.push({
        item,
        product: prod,
        priceWhenAdded: prod.originalPrice,
        currentPrice,
        dropAmount,
        dropPercentage
      });
    }
  });

  return notices;
}

/**
 * Detect back-in-stock items for items in the customer's wishlist that have stock
 */
export function detectWishlistBackInStock(
  wishlist: WishlistItem[],
  allProducts: Product[]
): WishlistBackInStockNotice[] {
  const notices: WishlistBackInStockNotice[] = [];
  const productMap = new Map(allProducts.map(p => [p.id, p]));

  wishlist.forEach(item => {
    const prod = productMap.get(item.productId);
    if (!prod) return;

    if (prod.stock > 0 && item.notifyBackInStock) {
      notices.push({
        item,
        product: prod,
        availableStock: prod.stock
      });
    }
  });

  return notices;
}
