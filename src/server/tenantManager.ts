import { Product } from '../types';
import { INITIAL_PRODUCTS } from '../data/mockData';

export interface StorefrontTenantConfig {
  tenant: {
    id: string;
    slug: string;
    name: string;
    legalName: string;
    status: 'active' | 'suspended';
    supportEmail: string;
    supportPhone: string;
  };
  store: {
    id: string;
    name: string;
    code: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      stateProvince: string;
      postalCode: string;
      country: string;
    };
    pickupEnabled: boolean;
    pickupLocations: {
      id: string;
      name: string;
      address: string;
      operatingHours: string;
      readyInHours: number;
    }[];
  };
  branding: {
    logoUrl: string;
    faviconUrl?: string;
    primaryColor: string;     // Hex color (e.g., #4f46e5)
    accentColor: string;      // Hex color (e.g., #f59e0b)
    neutralColorScale: 'cool' | 'warm' | 'slate';
    fontFamily: string;
    bannerSlides: {
      id: string;
      badge: string;
      title: string;
      subtitle: string;
      ctaText: string;
      ctaUrl: string;
      imageUrl: string;
      bgGradient: string;
      active: boolean;
    }[];
  };
  currency: {
    code: string;             // e.g. "SLE", "USD", "EUR"
    symbol: string;           // e.g. "Le", "$", "€"
    decimalPlaces: number;    // 2 or 0
    format: 'symbol_first' | 'symbol_last';
    exchangeRateToUSD: number;
  };
  locale: string;             // e.g. "en-SL", "en-US"
  timezone: string;           // e.g. "Africa/Freetown", "America/New_York"
  policies: {
    shipping: {
      freeShippingThreshold: number | null; // null if no free shipping
      standardFee: number;
      standardEstimatedDays: string;
      expressFee: number | null;
      expressEstimatedDays: string | null;
      policyText: string;
    };
    returns: {
      allowedDays: number;     // e.g. 14, 30
      restockingFeePercent: number;
      freeReturns: boolean;
      policyText: string;
    };
    warranty: {
      standardMonths: number;  // e.g. 12, 24
      claimInstructions: string;
      policyText: string;
    };
    privacyPolicyUrl?: string;
    termsUrl?: string;
  };
  catalogPolicy: {
    showOutOfStock: boolean;
    allowBackorders: boolean;
    lowStockThreshold: number;
    priceDisplayTaxInclusive: boolean;
    taxRate: number;
    availableCategories: { id: string; name: string; slug: string; parentId?: string; imageUrl?: string }[];
    availableBrands: string[];
  };
  featureFlags: {
    enableCustomerReviews: boolean;
    enableWishlist: boolean;
    enableLoyaltyRewards: boolean;
    enableLiveInventoryReservations: boolean;
    enableMonimePayments: boolean;
    enableBankWireTransfer: boolean;
    enableCashOnDelivery: boolean;
    enableB2BPriceTiers: boolean;
  };
}

export interface TenantProduct extends Product {
  tenantId: string;
}

// Tenant Registry Store
const TENANTS_REGISTRY: Map<string, StorefrontTenantConfig> = new Map();
const TENANT_PRODUCTS_STORE: Map<string, TenantProduct[]> = new Map();

// Initialize Tenant Configuration
function initializeTenants() {
  if (TENANTS_REGISTRY.size > 0) return;

  // 1. Tenant: Nexus Retail (default flagship multi-category merchant)
  const nexusTenant: StorefrontTenantConfig = {
    tenant: {
      id: 'tenant-nexus-retail',
      slug: 'nexus-retail',
      name: 'Nexus Enterprise Commerce',
      legalName: 'Nexus Retail & Commerce Inc. S.L.',
      status: 'active',
      supportEmail: 'support@nexuscommerce.com',
      supportPhone: '+232 76 000 111',
    },
    store: {
      id: 'store-freetown-central',
      name: 'Freetown Central Flagship Store',
      code: 'FTN-01',
      address: {
        line1: '14 Wilberforce Street',
        city: 'Freetown',
        stateProvince: 'Western Area Urban',
        postalCode: '00232',
        country: 'Sierra Leone',
      },
      pickupEnabled: true,
      pickupLocations: [
        {
          id: 'pickup-ftn-main',
          name: 'Main Store Counter',
          address: '14 Wilberforce Street, Freetown',
          operatingHours: 'Mon-Sat 8:00 AM - 7:00 PM',
          readyInHours: 2,
        },
        {
          id: 'pickup-lumley-hub',
          name: 'Lumley Express Hub',
          address: '88 Lumley Beach Road, Freetown',
          operatingHours: 'Mon-Sun 9:00 AM - 9:00 PM',
          readyInHours: 4,
        },
      ],
    },
    branding: {
      logoUrl: 'https://images.unsplash.com/photo-1556742049-0a67daf64f42?auto=format&fit=crop&w=200&q=80',
      primaryColor: '#4f46e5',
      accentColor: '#f59e0b',
      neutralColorScale: 'slate',
      fontFamily: 'Inter',
      bannerSlides: [
        {
          id: 'slide-nexus-1',
          badge: 'NEW SEASON ARRIVALS',
          title: 'Enterprise Tech & Lifestyle Hardware',
          subtitle: 'Discover verified authentic products backed by 2-year manufacturer warranty and instant local store pickup.',
          ctaText: 'Explore Catalog',
          ctaUrl: '/store/nexus-retail/shop',
          imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
          bgGradient: 'from-indigo-900/90 via-slate-900/95 to-slate-950',
          active: true,
        },
        {
          id: 'slide-nexus-2',
          badge: 'MONIME DIGITAL PAYMENTS',
          title: 'Instant Mobile Money & Card Checkout',
          subtitle: 'Seamlessly pay via Orange Money, Afrimoney, or Bank Card with real-time inventory reservation.',
          ctaText: 'Shop Best Sellers',
          ctaUrl: '/store/nexus-retail/shop?sort=bestsellers',
          imageUrl: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1200&q=80',
          bgGradient: 'from-slate-900/90 via-indigo-950/95 to-slate-950',
          active: true,
        },
      ],
    },
    currency: {
      code: 'SLE',
      symbol: 'Le',
      decimalPlaces: 2,
      format: 'symbol_first',
      exchangeRateToUSD: 0.045,
    },
    locale: 'en-SL',
    timezone: 'Africa/Freetown',
    policies: {
      shipping: {
        freeShippingThreshold: 500.00,
        standardFee: 25.00,
        standardEstimatedDays: '1-2 Business Days',
        expressFee: 65.00,
        expressEstimatedDays: 'Same Day Dispatch',
        policyText: 'Complimentary standard shipping on orders over Le 500.00 within Freetown urban limits.',
      },
      returns: {
        allowedDays: 30,
        restockingFeePercent: 0,
        freeReturns: true,
        policyText: 'Enjoy 30 days of hassle-free return window for unopened and verified defective items.',
      },
      warranty: {
        standardMonths: 24,
        claimInstructions: 'Bring product receipt or digital order ID to any Nexus retail pickup hub for instant inspection.',
        policyText: '24-Month Comprehensive Manufacturer Warranty on all electronic devices.',
      },
      privacyPolicyUrl: '/privacy',
      termsUrl: '/terms',
    },
    catalogPolicy: {
      showOutOfStock: true,
      allowBackorders: false,
      lowStockThreshold: 5,
      priceDisplayTaxInclusive: true,
      taxRate: 0.08,
      availableCategories: [
        { id: 'electronics', name: 'Electronics & Gadgets', slug: 'electronics' },
        { id: 'footwear', name: 'Footwear & Athletic', slug: 'footwear' },
        { id: 'apparel', name: 'Apparel & Fashion', slug: 'apparel' },
        { id: 'grocery', name: 'Food & Beverages', slug: 'grocery' },
        { id: 'home', name: 'Home & Living', slug: 'home' },
      ],
      availableBrands: ['Pure Valley Farm', 'Nike', 'Apple', 'Sony', 'P47', 'Samsung', 'Logitech'],
    },
    featureFlags: {
      enableCustomerReviews: true,
      enableWishlist: true,
      enableLoyaltyRewards: true,
      enableLiveInventoryReservations: true,
      enableMonimePayments: true,
      enableBankWireTransfer: true,
      enableCashOnDelivery: true,
      enableB2BPriceTiers: true,
    },
  };

  // 2. Tenant: Apex Gadgets Worldwide (specialized electronics merchant, USD pricing)
  const apexTenant: StorefrontTenantConfig = {
    tenant: {
      id: 'tenant-apex-gadgets',
      slug: 'apex-gadgets',
      name: 'Apex Gadgets Worldwide',
      legalName: 'Apex International Electronics Ltd.',
      status: 'active',
      supportEmail: 'contact@apexgadgets.io',
      supportPhone: '+1 800 555 0199',
    },
    store: {
      id: 'store-apex-main',
      name: 'Apex Global Logistics Center',
      code: 'APX-US-01',
      address: {
        line1: '500 Technology Parkway',
        city: 'Austin',
        stateProvince: 'Texas',
        postalCode: '78701',
        country: 'United States',
      },
      pickupEnabled: false,
      pickupLocations: [],
    },
    branding: {
      logoUrl: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=200&q=80',
      primaryColor: '#059669',
      accentColor: '#10b981',
      neutralColorScale: 'cool',
      fontFamily: 'Plus Jakarta Sans',
      bannerSlides: [
        {
          id: 'slide-apex-1',
          badge: 'PREMIUM ELECTRONICS',
          title: 'Next-Gen Wireless Audio & Smart Gear',
          subtitle: 'Engineered for audiophiles and pro creators with international global express delivery.',
          ctaText: 'Browse Audio Range',
          ctaUrl: '/store/apex-gadgets/shop?category=electronics',
          imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1200&q=80',
          bgGradient: 'from-emerald-950/90 via-slate-900/95 to-slate-950',
          active: true,
        },
      ],
    },
    currency: {
      code: 'USD',
      symbol: '$',
      decimalPlaces: 2,
      format: 'symbol_first',
      exchangeRateToUSD: 1.0,
    },
    locale: 'en-US',
    timezone: 'America/Chicago',
    policies: {
      shipping: {
        freeShippingThreshold: null, // No free shipping
        standardFee: 15.00,
        standardEstimatedDays: '3-5 Business Days',
        expressFee: 35.00,
        expressEstimatedDays: '1-2 Days Express Air',
        policyText: 'Flat rate $15.00 standard global shipping across all electronic accessories.',
      },
      returns: {
        allowedDays: 14,
        restockingFeePercent: 10,
        freeReturns: false,
        policyText: '14-day return window subject to a standard 10% factory restocking fee.',
      },
      warranty: {
        standardMonths: 12,
        claimInstructions: 'Submit RMA ticket online at apexgadgets.io/support with order verification code.',
        policyText: '12-Month Limited Hardware Warranty.',
      },
      privacyPolicyUrl: '/privacy',
      termsUrl: '/terms',
    },
    catalogPolicy: {
      showOutOfStock: false,
      allowBackorders: true,
      lowStockThreshold: 3,
      priceDisplayTaxInclusive: false,
      taxRate: 0.07,
      availableCategories: [
        { id: 'electronics', name: 'Consumer Electronics', slug: 'electronics' },
        { id: 'audio', name: 'Audio Systems', slug: 'audio' },
      ],
      availableBrands: ['Sony', 'Apple', 'Bose', 'P47', 'Sennheiser'],
    },
    featureFlags: {
      enableCustomerReviews: true,
      enableWishlist: true,
      enableLoyaltyRewards: false,
      enableLiveInventoryReservations: true,
      enableMonimePayments: true,
      enableBankWireTransfer: true,
      enableCashOnDelivery: false,
      enableB2BPriceTiers: true,
    },
  };

  // 3. Tenant: Sierra Fashion & Boutique (fashion boutique)
  const sierraTenant: StorefrontTenantConfig = {
    tenant: {
      id: 'tenant-sierra-boutique',
      slug: 'sierra-boutique',
      name: 'Sierra Fashion & Luxury Boutique',
      legalName: 'Sierra Fashion House Limited',
      status: 'active',
      supportEmail: 'care@sierraboutique.sl',
      supportPhone: '+232 88 555 777',
    },
    store: {
      id: 'store-sierra-hub',
      name: 'Sierra Boutique Siaka Stevens Outlet',
      code: 'SRB-SL-01',
      address: {
        line1: '42 Siaka Stevens Street',
        city: 'Freetown',
        stateProvince: 'Western Area Urban',
        postalCode: '00232',
        country: 'Sierra Leone',
      },
      pickupEnabled: true,
      pickupLocations: [
        {
          id: 'pickup-sierra-main',
          name: 'Boutique Showroom',
          address: '42 Siaka Stevens Street, Freetown',
          operatingHours: 'Mon-Sat 10:00 AM - 8:00 PM',
          readyInHours: 1,
        },
      ],
    },
    branding: {
      logoUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=200&q=80',
      primaryColor: '#d97706',
      accentColor: '#f59e0b',
      neutralColorScale: 'warm',
      fontFamily: 'Playfair Display',
      bannerSlides: [
        {
          id: 'slide-sierra-1',
          badge: 'BOUTIQUE COLLECTION',
          title: 'Curated African Luxury & Footwear',
          subtitle: 'Handpicked apparel, designer sneakers, and accessories tailored for elegance.',
          ctaText: 'Shop New Arrivals',
          ctaUrl: '/store/sierra-boutique/shop',
          imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80',
          bgGradient: 'from-amber-950/90 via-stone-900/95 to-amber-950',
          active: true,
        },
      ],
    },
    currency: {
      code: 'SLE',
      symbol: 'Le',
      decimalPlaces: 2,
      format: 'symbol_first',
      exchangeRateToUSD: 0.045,
    },
    locale: 'en-SL',
    timezone: 'Africa/Freetown',
    policies: {
      shipping: {
        freeShippingThreshold: 250.00,
        standardFee: 20.00,
        standardEstimatedDays: '1 Business Day',
        expressFee: 40.00,
        expressEstimatedDays: 'Same Afternoon Courier',
        policyText: 'Free city delivery on boutique fashion orders exceeding Le 250.00.',
      },
      returns: {
        allowedDays: 7,
        restockingFeePercent: 0,
        freeReturns: true,
        policyText: '7-day boutique exchange policy with tags intact.',
      },
      warranty: {
        standardMonths: 6,
        claimInstructions: 'Contact care@sierraboutique.sl with your original invoice.',
        policyText: '6-Month Boutique Quality Craftsmanship Guarantee.',
      },
      privacyPolicyUrl: '/privacy',
      termsUrl: '/terms',
    },
    catalogPolicy: {
      showOutOfStock: false,
      allowBackorders: false,
      lowStockThreshold: 2,
      priceDisplayTaxInclusive: true,
      taxRate: 0.08,
      availableCategories: [
        { id: 'footwear', name: 'Footwear & Athletic', slug: 'footwear' },
        { id: 'apparel', name: 'Apparel & Fashion', slug: 'apparel' },
        { id: 'beauty', name: 'Beauty & Personal Care', slug: 'beauty' },
      ],
      availableBrands: ['Nike', 'Adidas', 'Gucci', 'Zara', 'Puma'],
    },
    featureFlags: {
      enableCustomerReviews: true,
      enableWishlist: true,
      enableLoyaltyRewards: true,
      enableLiveInventoryReservations: true,
      enableMonimePayments: true,
      enableBankWireTransfer: false,
      enableCashOnDelivery: true,
      enableB2BPriceTiers: false,
    },
  };

  TENANTS_REGISTRY.set(nexusTenant.tenant.slug, nexusTenant);
  TENANTS_REGISTRY.set(apexTenant.tenant.slug, apexTenant);
  TENANTS_REGISTRY.set(sierraTenant.tenant.slug, sierraTenant);

  // Partition Product Catalogs into Tenant Stores
  // 1. Nexus Retail Catalog: full base products assigned tenantId 'nexus-retail'
  const nexusProducts: TenantProduct[] = INITIAL_PRODUCTS.map(p => ({
    ...p,
    tenantId: 'nexus-retail',
  }));

  // 2. Apex Gadgets Catalog: tech & electronics items with USD pricing assigned tenantId 'apex-gadgets'
  const apexProducts: TenantProduct[] = INITIAL_PRODUCTS
    .filter(p => p.category.toLowerCase().includes('electronic') || p.category.toLowerCase().includes('audio') || p.brand === 'Sony' || p.brand === 'P47' || p.brand === 'Apple' || p.name.toLowerCase().includes('headphone') || p.name.toLowerCase().includes('watch'))
    .map((p, idx) => ({
      ...p,
      id: `prod-apex-${idx + 1}`,
      tenantId: 'apex-gadgets',
      price: Math.round(p.price * 0.045 * 100) / 100 || 24.99, // Converted to USD
      originalPrice: p.originalPrice ? Math.round(p.originalPrice * 0.045 * 100) / 100 : undefined,
      wholesalePrice: p.wholesalePrice ? Math.round(p.wholesalePrice * 0.045 * 100) / 100 : undefined,
      cost: Math.round(p.cost * 0.045 * 100) / 100,
    }));

  // If apexProducts is small, add a couple dedicated Apex products
  if (apexProducts.length < 3) {
    apexProducts.push({
      id: 'prod-apex-headphone-pro',
      name: 'Apex Studio Pro ANC Wireless Headphones',
      sku: 'APX-ANC-900',
      price: 199.99,
      originalPrice: 249.99,
      cost: 75.00,
      wholesalePrice: 150.00,
      stock: 40,
      unit: 'Piece',
      category: 'Electronics & Gadgets',
      brand: 'Apex',
      location: 'Bin A-12',
      reorderPoint: 5,
      barcode: '990011223344',
      trackStock: true,
      salesCount: 88,
      rating: 4.95,
      reviewCount: 42,
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
      description: 'Active Noise Cancelling studio headphones with 40-hour battery life and lossless high-resolution audio codecs.',
      returnable: true,
      tenantId: 'apex-gadgets',
    });
  }

  // 3. Sierra Boutique Catalog: apparel, footwear, beauty assigned tenantId 'sierra-boutique'
  const sierraProducts: TenantProduct[] = INITIAL_PRODUCTS
    .filter(p => p.category.toLowerCase().includes('footwear') || p.category.toLowerCase().includes('apparel') || p.category.toLowerCase().includes('beauty') || p.brand === 'Nike')
    .map((p, idx) => ({
      ...p,
      id: `prod-sierra-${idx + 1}`,
      tenantId: 'sierra-boutique',
    }));

  TENANT_PRODUCTS_STORE.set('nexus-retail', nexusProducts);
  TENANT_PRODUCTS_STORE.set('apex-gadgets', apexProducts);
  TENANT_PRODUCTS_STORE.set('sierra-boutique', sierraProducts);
}

// Call initialization
initializeTenants();

/**
 * Resolves tenant configuration by slug, ID, or fallback
 */
export function getTenantConfigBySlug(slugOrId?: string): StorefrontTenantConfig | null {
  initializeTenants();

  if (!slugOrId) {
    return TENANTS_REGISTRY.get('nexus-retail') || null;
  }

  const clean = slugOrId.trim().toLowerCase();

  // Search by slug first
  if (TENANTS_REGISTRY.has(clean)) {
    return TENANTS_REGISTRY.get(clean)!;
  }

  // Search by id
  for (const tenantConfig of TENANTS_REGISTRY.values()) {
    if (tenantConfig.tenant.id === clean || tenantConfig.tenant.id === `tenant-${clean}`) {
      return tenantConfig;
    }
  }

  return null;
}

/**
 * Retrieves all products strictly owned by a tenant
 */
export function getTenantProducts(tenantSlug: string): TenantProduct[] {
  initializeTenants();
  const config = getTenantConfigBySlug(tenantSlug);
  if (!config) return [];

  return TENANT_PRODUCTS_STORE.get(config.tenant.slug) || [];
}

/**
 * Retrieves a single product by slug or ID strictly within a tenant's catalog
 */
export function getTenantProductBySlugOrId(tenantSlug: string, productSlugOrId: string): TenantProduct | null {
  const products = getTenantProducts(tenantSlug);
  if (!products.length || !productSlugOrId) return null;

  const clean = productSlugOrId.trim().toLowerCase();

  return products.find(p => 
    p.id.toLowerCase() === clean || 
    p.sku.toLowerCase() === clean ||
    p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === clean ||
    (p.name && p.name.toLowerCase() === clean.replace(/-/g, ' '))
  ) || null;
}

/**
 * Gets tenant categories tree
 */
export function getTenantCategories(tenantSlug: string) {
  const config = getTenantConfigBySlug(tenantSlug);
  if (!config) return [];
  return config.catalogPolicy.availableCategories;
}

/**
 * Gets tenant brands list
 */
export function getTenantBrands(tenantSlug: string) {
  const config = getTenantConfigBySlug(tenantSlug);
  if (!config) return [];
  const products = getTenantProducts(tenantSlug);
  const brands = new Set<string>(config.catalogPolicy.availableBrands);
  products.forEach(p => {
    if (p.brand) brands.add(p.brand);
  });
  return Array.from(brands);
}
