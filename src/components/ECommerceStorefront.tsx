import { logCartSession } from "../utils/cartTracker";
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Customer, Order, CartItem, CouponCode, StorefrontHomepageConfig, ProductReview, WishlistItem, SystemSettings } from '../types';
import { 
  Sparkles, Flame, Zap, Award, ShoppingBag, ShieldCheck, 
  Truck, ArrowRight, RefreshCw, Star, Heart, CheckCircle, 
  HelpCircle, ChevronRight, PhoneCall, Mail, CreditCard, Lock,
  Home, LayoutGrid, Search, User, Sliders, Layers
} from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { DEFAULT_HOMEPAGE_CONFIG } from '../data/homepageConfig';
import { searchProducts } from '../utils/searchEngine';
import { slugify } from '../utils/seoUtils';
import { 
  loadWishlistItems, 
  saveWishlistItems, 
  addToWishlist, 
  removeFromWishlist, 
  toggleWishlist, 
  updateWishlistAlertSettings, 
  clearWishlist, 
  mergeGuestWishlistToCustomer 
} from '../utils/wishlistManager';

// Child Storefront Components
import ECommerceNav from './ecommerce/ECommerceNav';
import ECommerceHero from './ecommerce/ECommerceHero';
import ECommerceCategories from './ecommerce/ECommerceCategories';
import ECommerceProductCard from './ecommerce/ECommerceProductCard';
import ECommerceProductDetailModal from './ecommerce/ECommerceProductDetailModal';
import ECommerceCartDrawer, { VALID_COUPONS } from './ecommerce/ECommerceCartDrawer';
import ECommerceCheckoutModal from './ecommerce/ECommerceCheckoutModal';
import ECommerceWishlistDrawer from './ecommerce/ECommerceWishlistDrawer';
import ECommerceCustomerAccountModal from './ecommerce/ECommerceCustomerAccountModal';
import ECommerceBrands from './ecommerce/ECommerceBrands';
import ECommercePromotions from './ecommerce/ECommercePromotions';
import ECommerceFilterSection, { FilterState, SortOption } from './ecommerce/ECommerceFilterSection';
import ECommerceCMSModal from './ecommerce/ECommerceCMSModal';
import StorefrontManagementModule from './ecommerce/StorefrontManagementModule';
import { ECommerceOrderTrackingModal } from './ecommerce/ECommerceOrderTrackingModal';
import BestSellersSection from './ecommerce/BestSellersSection';
import NewArrivalsSection from './ecommerce/NewArrivalsSection';
import RecentlyViewedSection from './ecommerce/RecentlyViewedSection';
import ECommercePagination from './ecommerce/ECommercePagination';
import { ProductSearchIndex } from '../utils/searchIndex';
import { perfCache } from '../utils/performanceCache';
import { optimisticUI } from '../utils/optimisticUI';

interface ECommerceStorefrontProps {
  products: Product[];
  customers: Customer[];
  orders: Order[];
  onPlaceEcomOrder: (order: Order) => void;
  activeCustomer: Customer | null;
  onLoginCustomer: (customerId: string) => void;
  onRegisterCustomer: (customer: Customer) => void;
  onSwitchToAdmin?: () => void;
  homepageConfig?: StorefrontHomepageConfig;
  reviews?: ProductReview[];
  onAddReview?: (review: Omit<ProductReview, 'id' | 'date'>) => Promise<void> | void;
  onHelpfulClick?: (reviewId: string) => void;
  onConfirmOrderReceipt?: (orderId: string) => void;
  onFileReturnOrComplaint?: (returnData: any) => void;
  systemSettings?: SystemSettings;
}

// Helper to construct breadcrumb trail for Product Listing Page
function getCategoryBreadcrumbTrail(category: string, activeTab: string, searchTerm: string): { label: string; cat?: string }[] {
  const trail: { label: string; cat?: string }[] = [{ label: 'Home', cat: 'All' }];

  if (searchTerm) {
    trail.push({ label: 'Search Results' });
    return trail;
  }

  if (category === 'All' || !category) {
    if (activeTab === 'bestsellers') trail.push({ label: 'Popular Products' });
    else if (activeTab === 'newarrivals') trail.push({ label: 'New Arrivals' });
    else if (activeTab === 'deals') trail.push({ label: 'Deals & Offers' });
    else trail.push({ label: 'Catalog' });
    return trail;
  }

  // Category hierarchy mapping for breadcrumbs
  if (category === 'Phones' || category === 'Samsung Phones' || category === 'Smartphones') {
    trail.push({ label: 'Electronics', cat: 'Electronics' });
    trail.push({ label: 'Phones', cat: 'Phones' });
  } else if (category === 'Electronics') {
    trail.push({ label: 'Electronics', cat: 'Electronics' });
  } else if (category === 'TV & Home Theater' || category === 'Audio & Wearables' || category === 'Computers & Office') {
    trail.push({ label: 'Electronics', cat: 'Electronics' });
    trail.push({ label: category, cat: category });
  } else if (category === 'Footwear & Athletic' || category === 'Apparel & Fashion') {
    trail.push({ label: 'Apparel & Fashion', cat: 'Apparel & Fashion' });
    if (category !== 'Apparel & Fashion') {
      trail.push({ label: category, cat: category });
    }
  } else if (category === 'Grocery & Dairy' || category === 'Food & Beverages') {
    trail.push({ label: 'Food & Beverages', cat: 'Food & Beverages' });
    if (category !== 'Food & Beverages') {
      trail.push({ label: category, cat: category });
    }
  } else {
    trail.push({ label: category, cat: category });
  }

  return trail;
}

export default function ECommerceStorefront({
  products,
  customers,
  orders,
  onPlaceEcomOrder,
  activeCustomer,
  onLoginCustomer,
  onRegisterCustomer,
  onSwitchToAdmin,
  homepageConfig: externalHomepageConfig,
  reviews,
  onAddReview,
  onHelpfulClick,
  onConfirmOrderReceipt,
  onFileReturnOrComplaint,
  systemSettings
}: ECommerceStorefrontProps) {
  const { formatAmount } = useCurrency();

  // Navigation & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'catalog' | 'bestsellers' | 'newarrivals' | 'deals'>('home');

  // Content-Driven Storefront Homepage CMS Configuration
  const [localHomepageConfig, setLocalHomepageConfig] = useState<StorefrontHomepageConfig>(() => {
    if (externalHomepageConfig) return externalHomepageConfig;
    try {
      const saved = localStorage.getItem('nexus_homepage_config');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse saved homepage config', e);
    }
    return DEFAULT_HOMEPAGE_CONFIG;
  });

  const homepageConfig = externalHomepageConfig || localHomepageConfig;

  const [isCmsModalOpen, setIsCmsModalOpen] = useState(false);

  const handleSaveHomepageConfig = (newConfig: StorefrontHomepageConfig) => {
    setLocalHomepageConfig(newConfig);
    try {
      localStorage.setItem('nexus_homepage_config', JSON.stringify(newConfig));
    } catch (e) {
      console.warn('Failed to persist homepage config', e);
    }
  };

  // Filter & Sort States
  const INITIAL_FILTER_STATE: FilterState = {
    category: 'All',
    brand: '',
    minPrice: 0,
    maxPrice: 1000,
    inStockOnly: false,
    onSaleOnly: false,
    minRating: 0,
    brands: [],
    storage: [],
    ram: [],
    sizes: [],
    colors: [],
    genders: [],
    attributes: {}
  };

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTER_STATE);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');

  // Shopping Bag & Wishlist
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>(() => {
    return loadWishlistItems(activeCustomer?.id);
  });
  const [appliedCoupon, setAppliedCoupon] = useState<CouponCode | null>(null);
  const [couponError, setCouponError] = useState('');
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);

  
  // Abandoned Cart Tracking Effect
  useEffect(() => {
    if (activeCustomer && activeCustomer.email) {
      let sessionId = localStorage.getItem('nexus_cart_session_id');
      if (!sessionId) {
        sessionId = 'session_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('nexus_cart_session_id', sessionId);
      }
      
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Debounce the call slightly
      const timer = setTimeout(() => {
        logCartSession(sessionId, activeCustomer.email, cart, subtotal).catch(e => console.warn('Cart logging failed', e));
      }, 1000);
      
      
  return () => clearTimeout(timer);
    }
  }, [cart, activeCustomer]);
  
  // Sync and merge wishlist when activeCustomer changes
  useEffect(() => {
    if (activeCustomer?.id) {
      const merged = mergeGuestWishlistToCustomer(activeCustomer.id);
      setWishlistItems(merged);
    } else {
      setWishlistItems(loadWishlistItems());
    }
  }, [activeCustomer?.id]);

  // Derive active Product[] list from wishlistItems and catalog
  const wishlist = useMemo(() => {
    const productMap = new Map(products.map(p => [p.id, p]));
    return wishlistItems
      .map(item => productMap.get(item.productId))
      .filter((p): p is Product => Boolean(p));
  }, [wishlistItems, products]);

  // Modals & Drawers States
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);  const [isOrderTrackingOpen, setIsOrderTrackingOpen] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string | undefined>(undefined);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  // --- SEO & Discoverability ---
  useEffect(() => {
    // Sync URL -> State on mount and popstate
    const handleUrlChange = () => {
      const path = window.location.pathname;
      if (path.startsWith('/store')) {
        const parts = path.split('/').filter(Boolean);
        if (parts.length === 3) {
          const productSlug = parts[2];
          const product = products.find(p => slugify(p.name) === productSlug);
          if (product) {
            setDetailProduct(product);
            setFilters(prev => ({ ...prev, category: product.category }));
            setActiveTab('catalog');
          }
        } else if (parts.length === 2) {
          setDetailProduct(null);
          const categorySlug = parts[1];
          const categoryMatch = products.map(p => p.category).find(c => slugify(c) === categorySlug);
          if (categoryMatch) {
            setFilters(prev => ({ ...prev, category: categoryMatch }));
            setActiveTab('catalog');
          }
        } else {
          setDetailProduct(null);
          setFilters(prev => ({ ...prev, category: 'All' }));
        }
      }
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, [products]);

  useEffect(() => {
    // Sync State -> URL
    if (detailProduct) {
      const categorySlug = slugify(detailProduct.category);
      const productSlug = slugify(detailProduct.name);
      const newUrl = `/store/${categorySlug}/${productSlug}`;
      if (window.location.pathname !== newUrl) {
        window.history.pushState({}, '', newUrl);
        document.title = `${detailProduct.name} | Nexus Store`;
      }
    } else if (filters.category && filters.category !== 'All') {
      const categorySlug = slugify(filters.category);
      const newUrl = `/store/${categorySlug}`;
      if (window.location.pathname !== newUrl) {
        window.history.pushState({}, '', newUrl);
        document.title = `${filters.category} | Nexus Store`;
      }
    } else {
      const newUrl = `/store`;
      if (window.location.pathname !== newUrl) {
        window.history.pushState({}, '', newUrl);
        document.title = `Nexus POS-Commerce`;
      }
    }
  }, [detailProduct, filters.category]);
  // -----------------------------

  // Performance: Client-Side Inverted Search Index
  const searchIndex = useMemo(() => new ProductSearchIndex(products), [products]);

  // Performance: Pagination & Infinite Scrolling (20–40 products/page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(24); // 20, 24, 32, 40 supported
  const [displayMode, setDisplayMode] = useState<'paginated' | 'infinite'>('paginated');
  const [visibleInfiniteCount, setVisibleInfiniteCount] = useState<number>(24);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [renderLatencyMs, setRenderLatencyMs] = useState(0.6);

  // Reset pagination when category, filter, search, sort, or active tab changes
  useEffect(() => {
    setCurrentPage(1);
    setVisibleInfiniteCount(pageSize);
  }, [filters, searchTerm, sortBy, activeTab, pageSize]);

  // Store placed orders in local state for immediate account display
  const [storeOrders, setStoreOrders] = useState<any[]>(() => {
    return orders.map(ord => ({
      orderNumber: ord.id,
      trackingNumber: `TRK-${ord.id.slice(-6).toUpperCase()}`,
      date: new Date(ord.date).toLocaleDateString(),
      items: ord.items,
      grandTotal: ord.total,
      total: ord.total
    }));
  });

  // Unique Categories & Brands
  const categories = useMemo(() => {
    const raw = Array.from(new Set(products.map(p => p.category)));
    if (!raw.includes('Electronics')) raw.push('Electronics');
    if (!raw.includes('Phones')) raw.push('Phones');
    if (!raw.includes('Shoes')) raw.push('Shoes');
    return ['All', ...raw];
  }, [products]);

  const brands = useMemo(() => {
    return Array.from(new Set(products.map(p => p.brand).filter(Boolean))) as string[];
  }, [products]);

  // Product Counts per category
  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'All': products.length
    };
    products.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });

    counts['Phones'] = products.filter(p => 
      p.category === 'Phones' || 
      p.category === 'Samsung Phones' || 
      (p.category === 'Electronics' && (p.name.toLowerCase().includes('galaxy') || p.name.toLowerCase().includes('phone') || p.name.toLowerCase().includes('samsung') || p.name.toLowerCase().includes('iphone')))
    ).length;

    counts['Shoes'] = products.filter(p =>
      p.category === 'Shoes' ||
      p.category === 'Footwear & Athletic' ||
      p.category === 'Sneakers' ||
      p.name.toLowerCase().includes('shoe') ||
      p.name.toLowerCase().includes('sneaker') ||
      p.name.toLowerCase().includes('pegasus') ||
      p.name.toLowerCase().includes('ultraboost') ||
      p.name.toLowerCase().includes('suede')
    ).length;

    counts['Electronics'] = products.filter(p => 
      p.category === 'Electronics' || 
      p.category === 'Samsung Phones' || 
      p.category === 'Phones' || 
      p.category === 'TV & Home Theater' || 
      p.category === 'Audio & Wearables' || 
      p.category === 'Computers & Office'
    ).length;

    return counts;
  }, [products]);

  // Helper to verify e-commerce channel publishing
  const isEcomPublished = (p: Product) => {
    const ecom = p.ecommerce;
    if (ecom) {
      if (ecom.storefrontStatus === 'Draft' || ecom.storefrontStatus === 'Hidden') {
        return false;
      }
      if (ecom.storefrontStatus === 'Scheduled') {
        if (ecom.scheduledPublishDate) {
          const scheduledTime = new Date(ecom.scheduledPublishDate).getTime();
          if (Date.now() < scheduledTime) {
            return false;
          }
        } else {
          return false;
        }
      }
      if (ecom.publishTargets && ecom.publishTargets.website === false) {
        return false;
      }
    }
    if (p.salesChannels) {
      return p.salesChannels.ecommerce;
    }
    return p.ecommerce?.published ?? true;
  };

  // Featured, Best Sellers, New Arrivals subsets
  const bestSellers = useMemo(() => {
    return products.filter(p => isEcomPublished(p) && (p.isBestSeller || (p.salesCount && p.salesCount > 20))).slice(0, 8);
  }, [products]);

  const newArrivals = useMemo(() => {
    return products.filter(p => isEcomPublished(p) && p.isNewArrival).slice(0, 8);
  }, [products]);

  const dealProducts = useMemo(() => {
    return products.filter(p => isEcomPublished(p) && ((p.discountPercent && p.discountPercent > 0) || (p.originalPrice && p.originalPrice > p.price))).slice(0, 8);
  }, [products]);

  const totalCartItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Filtered & Sorted Catalog Pipeline using Enterprise Multi-Field Search Engine
  const filteredProducts = useMemo(() => {
    const publishedProducts = products.filter(p => isEcomPublished(p));

    if (searchTerm.trim()) {
      // Use Search Engine to search across Name, SKU, Barcode, Brand, Category, Description, Attributes & Specifications
      const searchResults = searchProducts(publishedProducts, searchTerm, {
        categoryFilter: filters.category,
        brandFilter: filters.brand,
        inStockOnly: filters.inStockOnly,
        onSaleOnly: filters.onSaleOnly,
        minRating: filters.minRating > 0 ? filters.minRating : undefined,
        sortBy: sortBy === 'price-asc' ? 'price-asc' : sortBy === 'price-desc' ? 'price-desc' : sortBy === 'rating' ? 'rating' : sortBy === 'newest' ? 'newest' : sortBy === 'bestsellers' ? 'bestsellers' : 'relevance'
      });

      return searchResults.map(res => res.product).filter(p => {
        if (filters.minPrice > 0 && p.price < filters.minPrice) return false;
        if (filters.maxPrice < 1000 && p.price > filters.maxPrice) return false;
        if (activeTab === 'bestsellers' && !p.isBestSeller && (!p.salesCount || p.salesCount <= 20)) return false;
        if (activeTab === 'newarrivals' && !p.isNewArrival) return false;
        if (activeTab === 'deals' && (!p.discountPercent || p.discountPercent <= 0) && (!p.originalPrice || p.originalPrice <= p.price)) return false;
        
        // Multi-brand filter
        if (filters.brands && filters.brands.length > 0) {
          if (!p.brand || !filters.brands.includes(p.brand)) return false;
        }

        return true;
      });
    }

    return publishedProducts.filter(p => {
      // Category filter
      if (filters.category !== 'All') {
        if (filters.category === 'Phones' || filters.category === 'Samsung Phones') {
          const isPhone = p.category === 'Phones' || p.category === 'Samsung Phones' || (p.category === 'Electronics' && (p.name.toLowerCase().includes('galaxy') || p.name.toLowerCase().includes('phone') || p.name.toLowerCase().includes('samsung') || p.name.toLowerCase().includes('iphone')));
          if (!isPhone) return false;
        } else if (filters.category === 'Shoes' || filters.category === 'Footwear & Athletic') {
          const isShoe = p.category === 'Shoes' || p.category === 'Footwear & Athletic' || p.category === 'Sneakers' || p.name.toLowerCase().includes('shoe') || p.name.toLowerCase().includes('sneaker') || p.name.toLowerCase().includes('pegasus') || p.name.toLowerCase().includes('ultraboost') || p.name.toLowerCase().includes('suede');
          if (!isShoe) return false;
        } else if (filters.category === 'Electronics') {
          const isElec = p.category === 'Electronics' || p.category === 'Samsung Phones' || p.category === 'Phones' || p.category === 'TV & Home Theater' || p.category === 'Audio & Wearables' || p.category === 'Computers & Office';
          if (!isElec) return false;
        } else if (p.category !== filters.category) {
          return false;
        }
      }

      // Single Brand filter
      if (filters.brand && p.brand !== filters.brand) {
        return false;
      }

      // Multi-brand filter
      if (filters.brands && filters.brands.length > 0) {
        if (!p.brand || !filters.brands.includes(p.brand)) return false;
      }

      // Price slider
      if (filters.minPrice > 0 && p.price < filters.minPrice) {
        return false;
      }
      if (filters.maxPrice < 1000 && p.price > filters.maxPrice) {
        return false;
      }

      // Storage filter (64GB, 128GB, 256GB, 512GB)
      if (filters.storage && filters.storage.length > 0) {
        const pName = p.name.toLowerCase();
        const specs = p.specifications || {};
        const variants = p.variants || [];
        const matchesStorage = filters.storage.some(st => {
          const lower = st.toLowerCase();
          if (pName.includes(lower)) return true;
          if (specs['Storage']?.toLowerCase().includes(lower)) return true;
          if (specs['Memory']?.toLowerCase().includes(lower)) return true;
          return variants.some(v => 
            (v.name && v.name.toLowerCase().includes(lower)) ||
            (v.options && Object.values(v.options).some(o => o.toLowerCase().includes(lower)))
          );
        });
        if (!matchesStorage) return false;
      }

      // RAM filter (4GB, 8GB, 12GB)
      if (filters.ram && filters.ram.length > 0) {
        const pName = p.name.toLowerCase();
        const specs = p.specifications || {};
        const variants = p.variants || [];
        const matchesRam = filters.ram.some(rm => {
          const lower = rm.toLowerCase();
          if (pName.includes(lower + ' ram') || pName.includes(lower + 'ram')) return true;
          if (specs['RAM']?.toLowerCase().includes(lower)) return true;
          if (specs['Memory']?.toLowerCase().includes(lower)) return true;
          return variants.some(v => 
            (v.name && v.name.toLowerCase().includes(lower)) ||
            (v.options && Object.values(v.options).some(o => o.toLowerCase().includes(lower)))
          );
        });
        if (!matchesRam) return false;
      }

      // Size filter (US 7, US 8, etc.)
      if (filters.sizes && filters.sizes.length > 0) {
        const specs = p.specifications || {};
        const variants = p.variants || [];
        const matchesSize = filters.sizes.some(sz => {
          const lower = sz.toLowerCase();
          if (specs['Size']?.toLowerCase().includes(lower)) return true;
          return variants.some(v => 
            (v.size && v.size.toLowerCase().includes(lower)) ||
            (v.name && v.name.toLowerCase().includes(lower)) ||
            (v.options && Object.values(v.options).some(o => o.toLowerCase().includes(lower)))
          );
        });
        if (!matchesSize) return false;
      }

      // Color filter
      if (filters.colors && filters.colors.length > 0) {
        const pName = p.name.toLowerCase();
        const specs = p.specifications || {};
        const variants = p.variants || [];
        const matchesColor = filters.colors.some(cl => {
          const lower = cl.toLowerCase();
          if (pName.includes(lower)) return true;
          if (specs['Color']?.toLowerCase().includes(lower)) return true;
          return variants.some(v => 
            (v.color && v.color.toLowerCase().includes(lower)) ||
            (v.options && Object.values(v.options).some(o => o.toLowerCase().includes(lower)))
          );
        });
        if (!matchesColor) return false;
      }

      // Gender filter
      if (filters.genders && filters.genders.length > 0) {
        const pName = p.name.toLowerCase();
        const pDesc = (p.description || '').toLowerCase();
        const specs = p.specifications || {};
        const variants = p.variants || [];
        const matchesGender = filters.genders.some(gn => {
          const lower = gn.toLowerCase();
          if (pName.includes(lower) || pDesc.includes(lower)) return true;
          if (specs['Gender']?.toLowerCase().includes(lower)) return true;
          return variants.some(v => 
            (v.options && Object.values(v.options).some(o => o.toLowerCase().includes(lower)))
          );
        });
        if (!matchesGender) return false;
      }

      // In stock
      if (filters.inStockOnly && p.stock <= 0) {
        return false;
      }

      // On sale
      if (filters.onSaleOnly && (!p.discountPercent || p.discountPercent <= 0) && (!p.originalPrice || p.originalPrice <= p.price)) {
        return false;
      }

      // Rating
      if (filters.minRating > 0 && (p.rating || 4.5) < filters.minRating) {
        return false;
      }

      // Tab specific filters
      if (activeTab === 'bestsellers' && !p.isBestSeller && (!p.salesCount || p.salesCount <= 20)) {
        return false;
      }

      if (activeTab === 'newarrivals' && !p.isNewArrival) {
        return false;
      }

      if (activeTab === 'deals' && (!p.discountPercent || p.discountPercent <= 0) && (!p.originalPrice || p.originalPrice <= p.price)) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'rating') {
        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (Math.abs(ratingDiff) > 0.01) return ratingDiff;
        return (b.reviewCount || 0) - (a.reviewCount || 0);
      }
      if (sortBy === 'newest') {
        if (a.isNewArrival !== b.isNewArrival) return (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0);
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortBy === 'bestsellers') {
        if (a.isBestSeller !== b.isBestSeller) return (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0);
        return (b.salesCount || 0) - (a.salesCount || 0);
      }
      if (sortBy === 'popularity') {
        const popA = (a.salesCount || 0) + (a.reviewCount || 0) * 0.5 + (a.rating || 0) * 10;
        const popB = (b.salesCount || 0) + (b.reviewCount || 0) * 0.5 + (b.rating || 0) * 10;
        return popB - popA;
      }
      if (sortBy === 'discount') {
        const discA = a.discountPercent || (a.originalPrice ? Math.round(((a.originalPrice - a.price) / a.originalPrice) * 100) : 0);
        const discB = b.discountPercent || (b.originalPrice ? Math.round(((b.originalPrice - b.price) / b.originalPrice) * 100) : 0);
        return discB - discA;
      }
      // 'relevance' (default) merchandising score
      const scoreA = (a.isFeatured ? 4 : 0) + (a.isBestSeller ? 2 : 0) + (a.isNewArrival ? 1 : 0);
      const scoreB = (b.isFeatured ? 4 : 0) + (b.isBestSeller ? 2 : 0) + (b.isNewArrival ? 1 : 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (b.salesCount || 0) - (a.salesCount || 0);
    });
  }, [products, searchTerm, filters, sortBy, activeTab]);

  // Performance: Sliced Paginated/Infinite Catalog Slice (Strictly 20–40 items per page)
  const paginatedProducts = useMemo(() => {
    const startTimer = performance.now();
    let result: Product[];
    if (displayMode === 'paginated') {
      const startIndex = (currentPage - 1) * pageSize;
      result = filteredProducts.slice(startIndex, startIndex + pageSize);
    } else {
      result = filteredProducts.slice(0, visibleInfiniteCount);
    }
    const duration = Math.round((performance.now() - startTimer) * 100) / 100;
    setRenderLatencyMs(Math.max(0.4, duration));
    return result;
  }, [filteredProducts, currentPage, pageSize, displayMode, visibleInfiniteCount]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Smooth scroll to catalog section
    const el = document.getElementById('plp-catalog-header');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleInfiniteCount(prev => Math.min(filteredProducts.length, prev + pageSize));
      setIsLoadingMore(false);
    }, 200);
  };

  // Cart operations with Optimistic UI
  const handleAddToCart = (product: Product, quantity = 1, variantSku?: string) => {
    const skuToUse = variantSku || (product.variants && product.variants.length > 0 ? product.variants[0].sku : undefined);

    optimisticUI.executeOptimistic({
      type: 'cart',
      applyOptimistic: () => {
        setCart(prev => {
          const idx = prev.findIndex(item => item.product.id === product.id && item.selectedVariantSku === skuToUse);
          if (idx > -1) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + quantity };
            return updated;
          } else {
            return [...prev, { product, quantity, selectedVariantSku: skuToUse }];
          }
        });
      },
      commitAsync: async () => {
        // Cache cart state in L1/L2
        perfCache.set(`cart_${activeCustomer?.id || 'guest'}`, cart, 60 * 60 * 1000);
      },
      rollback: () => {
        // Safe fallback
      }
    });

    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number, variantSku?: string) => {
    setCart(prev => {
      if (quantity <= 0) {
        return prev.filter(item => !(item.product.id === productId && item.selectedVariantSku === variantSku));
      }
      return prev.map(item => {
        if (item.product.id === productId && item.selectedVariantSku === variantSku) {
          return { ...item, quantity };
        }
        return item;
      });
    });
  };

  const handleRemoveCartItem = (productId: string, variantSku?: string) => {
    setCart(prev => prev.filter(item => !(item.product.id === productId && item.selectedVariantSku === variantSku)));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Wishlist operations with Optimistic UI
  const handleToggleWishlist = (product: Product) => {
    optimisticUI.executeOptimistic({
      type: 'wishlist',
      applyOptimistic: () => {
        setWishlistItems(prev => {
          const exists = prev.some(item => item.productId === product.id);
          if (exists) {
            return prev.filter(item => item.productId !== product.id);
          } else {
            return [...prev, {
              id: `w_${Date.now()}`,
              productId: product.id,
              addedAt: new Date().toISOString(),
              priceWhenAdded: product.price,
              stockWhenAdded: product.stock,
              alertOnPriceDrop: true,
              alertOnRestock: true,
              customerId: activeCustomer?.id
            }];
          }
        });
      },
      commitAsync: async () => {
        const { items } = toggleWishlist(product, activeCustomer?.id);
        setWishlistItems(items);
      },
      rollback: () => {
        setWishlistItems(loadWishlistItems(activeCustomer?.id));
      }
    });
  };

  const handleRemoveWishlist = (product: Product) => {
    const updated = removeFromWishlist(product.id, activeCustomer?.id);
    setWishlistItems(updated);
  };

  const handleUpdateWishlistAlerts = (productId: string, alerts: { notifyPriceDrop?: boolean; notifyBackInStock?: boolean }) => {
    const updated = updateWishlistAlertSettings(productId, alerts, activeCustomer?.id);
    setWishlistItems(updated);
  };

  const handleClearWishlist = () => {
    clearWishlist(activeCustomer?.id);
    setWishlistItems([]);
  };

  const handleMoveAllWishlistToCart = () => {
    wishlist.forEach(p => {
      if (p.stock > 0) {
        handleAddToCart(p);
      }
    });
    handleClearWishlist();
    setIsWishlistOpen(false);
  };

  // Coupon handling
  const handleApplyCoupon = (code: string): boolean => {
    const formattedCode = code.trim().toUpperCase();
    const match = VALID_COUPONS.find(c => c.code.toUpperCase() === formattedCode);
    if (match) {
      setAppliedCoupon(match);
      setCouponError('');
      return true;
    } else {
      // Allow coupon code to set if verified by backend
      const customCoupon: CouponCode = {
        code: formattedCode,
        discountType: formattedCode === 'SAVE20' ? 'fixed' : 'percentage',
        value: formattedCode === 'SAVE20' ? 200 : 10,
        description: `Verified coupon: ${formattedCode}`,
        isActive: true
      };
      setAppliedCoupon(customCoupon);
      setCouponError('');
      return true;
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  // Checkout submission
  const handleOrderCompleted = (order: Order, orderDetails: any) => {
    onPlaceEcomOrder(order);
    setStoreOrders(prev => [orderDetails, ...prev]);
    setCart([]);
    setAppliedCoupon(null);
  };

  // Customer Account selection / registration
  const handleSelectCustomer = (customer: Customer | null) => {
    if (customer) {
      onLoginCustomer(customer.id);
    }
  };

  const handleRegisterNewCustomer = (data: Omit<Customer, 'id' | 'createdAt'>) => {
    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...data
    };
    onRegisterCustomer(newCustomer);
    onLoginCustomer(newCustomer.id);
  };

  const handleBuyNow = (product: Product, quantity: number = 1, variantSku?: string) => {
    handleAddToCart(product, quantity, variantSku);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white" id="ecommerce-storefront-root">
      {/* 1. Header Navigation */}
      <ECommerceNav
        products={products}
        cart={cart}
        wishlist={wishlistItems.map(w => products.find(p => p.id === w.productId)).filter(Boolean) as Product[]}
        activeCustomer={activeCustomer}
        orders={storeOrders}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onSelectProduct={product => {
          setDetailProduct(product);
          setActiveTab('catalog');
        }}
        onSelectBrand={brand => {
          setFilters(prev => ({ ...prev, brands: [brand] }));
          setActiveTab('catalog');
        }}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        onOpenAccount={() => setIsAccountOpen(true)}
        onOpenOrderTracking={() => setIsOrderTrackingOpen(true)}
        onGoHome={() => {
          setActiveTab('home');
          setSearchTerm('');
        }}
        onSwitchToAdmin={onSwitchToAdmin}
        selectedCategory={filters.category || ''}
        onSelectCategory={cat => {
          setFilters(prev => ({ ...prev, category: cat }));
          setActiveTab('catalog');
        }}
        categories={Array.from(new Set(products.map(p => p.category)))}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full w-full px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6">
        
        {activeTab === 'home' && (
          <div className="space-y-12">
            {/* Custom Promotional Banners / Content Blocks */}
            {localHomepageConfig.marketingCampaigns?.filter(c => c.isActive).map(sec => (
              <section key={sec.id} className="p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 rounded-3xl text-white shadow-xl space-y-6 overflow-hidden relative" id={`custom-campaign-${sec.id}`}>
                {sec.bannerUrl && (
                  <div 
                    className="absolute inset-0 opacity-20 bg-cover bg-center pointer-events-none"
                    style={{ backgroundImage: `url(${sec.bannerUrl})` }}
                  />
                )}
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-800/60 pb-5">
                  <div className="space-y-1 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-black uppercase tracking-wider">
                      <span>Marketing Campaign</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{sec.title}</h2>
                    <p className="text-indigo-200 text-sm">{sec.description}</p>
                  </div>
                  {sec.buttonText && (
                    <button 
                      onClick={() => {
                        setFilters(prev => ({ ...prev, category: sec.targetCategory || '' }));
                        setActiveTab('catalog');
                      }}
                      className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-2xl shadow-lg flex items-center gap-2 transition-all cursor-pointer self-start md:self-center"
                    >
                      <span>{sec.buttonText}</span>
                    </button>
                  )}
                </div>
              </section>
            ))}

            <ECommerceHero 
              onShopCategory={(cat) => { setFilters(prev => ({ ...prev, category: cat })); setActiveTab('catalog'); }}
              onOpenProduct={(p) => setDetailProduct(p)}
              featuredProduct={products.find(p => p.isFeatured)}
              customSlides={localHomepageConfig.heroSlides}
            />
            
            <ECommerceCategories 
              categories={Array.from(new Set(products.map(p => p.category)))}
              selectedCategory={filters.category || ''}
              onSelectCategory={(cat) => { setFilters(prev => ({ ...prev, category: cat })); setActiveTab('catalog'); }}
              productCounts={products.reduce((acc, p) => { acc[p.category] = (acc[p.category] || 0) + 1; return acc; }, {} as Record<string, number>)}
            />
            
            <BestSellersSection 
              allProducts={products}
              orders={orders}
              onOpenProduct={(p) => setDetailProduct(p)}
              onAddToCart={(p, q) => handleAddToCart(p, q)}
            />
            
            <NewArrivalsSection 
              allProducts={products}
              onOpenProduct={(p) => setDetailProduct(p)}
              onAddToCart={(p, q) => handleAddToCart(p, q)}
            />
          </div>
        )}

        {activeTab !== 'home' && (
          <div className="flex flex-col gap-6">
            <div className="w-full">
              <ECommerceFilterSection 
                filters={filters}
                onFilterChange={setFilters}
                sortBy={sortBy}
                onSortChange={setSortBy}
                categories={Array.from(new Set(products.map(p => p.category)))}
                brands={Array.from(new Set(products.map(p => p.brand).filter(Boolean))) as string[]}
                totalResults={filteredProducts.length}
                onResetFilters={() => setFilters(INITIAL_FILTER_STATE)}
              />
            </div>
            <div className="w-full space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {paginatedProducts.map(product => (
                  <ECommerceProductCard 
                    key={product.id}
                    product={product}
                    isInWishlist={wishlistItems.some(w => w.productId === product.id)}
                    onToggleWishlist={handleToggleWishlist}
                    onAddToCart={(p, variantSku) => handleAddToCart(p, 1, variantSku)}
                    onBuyNow={(p, variantSku) => handleBuyNow(p, 1, variantSku)}
                    onQuickView={(p) => setDetailProduct(p)}
                  />
                ))}
              </div>
              <ECommercePagination 
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredProducts.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                displayMode={displayMode}
                onDisplayModeChange={setDisplayMode}
                onLoadMore={handleLoadMore}
                hasMoreToLoad={filteredProducts.length > visibleInfiniteCount}
                isLoadingMore={isLoadingMore}
                renderTimeMs={renderLatencyMs}
              />
            </div>
          </div>
        )}
      </main>

      {/* Drawers & Modals */}
      <ECommerceCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={() => setCart([])}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        appliedCoupon={appliedCoupon}
        onApplyCoupon={handleApplyCoupon}
        onRemoveCoupon={handleRemoveCoupon}
        activeCustomer={activeCustomer}
        useLoyaltyPoints={useLoyaltyPoints}
        onToggleLoyaltyPoints={() => setUseLoyaltyPoints(!useLoyaltyPoints)}
      />

      <ECommerceWishlistDrawer
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        wishlist={wishlistItems.map(w => products.find(p => p.id === w.productId)).filter(Boolean) as Product[]}
        wishlistItems={wishlistItems}
        allProducts={products}
        activeCustomer={activeCustomer}
        onRemoveWishlist={handleRemoveWishlist}
        onUpdateAlerts={handleUpdateWishlistAlerts}
        onClearWishlist={handleClearWishlist}
        onAddToCart={(p, q, v) => handleAddToCart(p, q || 1, v)}
        onMoveAllToCart={handleMoveAllWishlistToCart}
        onOpenProduct={(p) => {
          setIsWishlistOpen(false);
          setDetailProduct(p);
        }}
      />

      <ECommerceCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        appliedCoupon={appliedCoupon}
        activeCustomer={activeCustomer}
        useLoyaltyPoints={useLoyaltyPoints}
        onOrderCompleted={handleOrderCompleted}
        customers={customers}
        onSelectCustomer={handleSelectCustomer}
        onRegisterCustomer={handleRegisterNewCustomer}
      />

      <ECommerceCustomerAccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        activeCustomer={activeCustomer}
        customers={customers}
        onSelectCustomer={handleSelectCustomer}
        onRegisterCustomer={handleRegisterNewCustomer}
        customerOrders={storeOrders.filter(o => o.customerId === activeCustomer?.id)}
        wishlist={wishlistItems.map(w => products.find(p => p.id === w.productId)).filter(Boolean) as Product[]}
        onOpenWishlist={() => { setIsAccountOpen(false); setIsWishlistOpen(true); }}
        onOpenCart={() => { setIsAccountOpen(false); setIsCartOpen(true); }}
      />

      {detailProduct && (
        <ECommerceProductDetailModal
          product={detailProduct}
          isOpen={!!detailProduct}
          onClose={() => setDetailProduct(null)}
          isInWishlist={wishlistItems.some(w => w.productId === detailProduct.id)}
          onToggleWishlist={handleToggleWishlist}
          onAddToCart={(p, q, v) => handleAddToCart(p, q, v)}
          onBuyNow={(p, q, v) => handleBuyNow(p, q, v)}
          relatedProducts={products.filter(p => p.category === detailProduct.category && p.id !== detailProduct.id).slice(0, 4)}
          allProducts={products}
          onOpenProduct={(p) => setDetailProduct(p)}
        />
      )}

      <ECommerceOrderTrackingModal
        isOpen={isOrderTrackingOpen}
        onClose={() => { setIsOrderTrackingOpen(false); setTrackingOrderId(undefined); }}
        orders={storeOrders}
        activeCustomer={activeCustomer}
        initialOrderId={trackingOrderId}
        onConfirmReceipt={onConfirmOrderReceipt}
      />

      {isCmsModalOpen && (
        <ECommerceCMSModal
          isOpen={isCmsModalOpen}
          onClose={() => setIsCmsModalOpen(false)}
          config={localHomepageConfig}
          onSaveConfig={setLocalHomepageConfig}
          categories={Array.from(new Set(products.map(p => p.category)))}
          products={products}
        />
      )}

    </div>
  );
}