# Architecture Specification: UX-001A — Multi-Tenant Storefront Modernization

**Author**: Senior Software Architect & Platform Engineering Lead  
**Workstream**: Version 2.6 Upgrade Workstream (UPG-001 Platform Hardening Closed)  
**Status**: APPROVED FOR DESIGN — PENDING SUPERVISOR ARCHITECTURAL REVIEW  
**Date**: September 2026  

---

## 1. Executive Summary & Objective

The primary objective of **UX-001A** is to transition the POS & eCommerce Commerce Suite storefront from a client-centric prototype into an enterprise-grade, server-authoritative, accessible, and strictly isolated **multi-tenant commerce storefront**.

In the current prototype state, the storefront relies heavily on browser-authoritative state: products, categories, customers, and order arrays are seeded in memory or fetched from flat Firestore collections and prop-drilled down through monolithic React components. Commercial claims, shipping thresholds, warranty rules, and pricing calculations frequently default to hardcoded literals or rely on client-provided payloads sent to the backend.

UX-001A establishes:
1. **Strict Multi-Tenant Isolation**: Complete logical and physical isolation across tenants (Tenant A cannot see Tenant B's products, inventory, orders, prices, or branding).
2. **Server-Authoritative Commerce Contracts**: All pricing, stock availability, discounts, coupons, and orders are computed and validated exclusively by server APIs.
3. **Tenant-Aware Storefront Context**: Dynamic resolution of branding, currency, locale, commercial policies (shipping, returns, warranty), catalog rules, and feature flags.
4. **URL-Based Storefront Information Architecture**: Deep-linkable, bookmarkable, and backward/forward-navigable routes (`/store/:tenantSlug/...`).
5. **Modernized, Accessible Responsive Experience**: Modular, WCAG 2.2 AA compliant storefront components spanning desktop (1440px+), laptop (1024–1439px), tablet (768–1023px), and mobile (375–767px).

---

## 2. Phase 1 — Current Storefront Architecture Baseline & Trace Analysis

### 2.1 Component & Service Inventory

| Component / Artifact | Current File Path | Current Role & Observations |
| :--- | :--- | :--- |
| `Storefront.tsx` | `src/components/ECommerceStorefront.tsx` | Monolithic component (1,093 lines). Receives `products`, `customers`, `orders` via props from `App.tsx`. Relies on `localStorage.getItem('nexus_homepage_config')`. Manages local view state (`activeTab`) rather than URLs. |
| `StoreHeader.tsx` | `src/components/ecommerce/ECommerceNav.tsx` | 569 lines. Hardcoded branding "NEXUS STORE". Reads notifications from `localStorage`. Cart and customer props passed in memory. No tenant resolution. |
| `StoreHeroBanner.tsx` | `src/components/ecommerce/ECommerceHero.tsx` | 472 lines. Hardcoded default slides and value proposition claims ("Free nationwide over $150", "2-Year Warranty", "30-Day Free Returns", "PCI-DSS Certified"). |
| `ProductCard.tsx` | `src/components/ecommerce/ECommerceProductCard.tsx` | Computes discounts in-browser; passes product directly to parent handlers. |
| `ProductDetailModal.tsx` | `src/components/ecommerce/ECommerceProductDetailModal.tsx` | 1,374 lines. Defaults `allProducts = INITIAL_PRODUCTS`, `orders = INITIAL_ORDERS`. Hardcoded delivery estimates and return guarantees. Modal-based instead of full URL route. |
| `ProductCarouselSection.tsx` | `BestSellersSection.tsx`, `NewArrivalsSection.tsx`, `RecentlyViewedSection.tsx`, `RelatedProductsSection.tsx` | In-memory filtering and sorting of the client's `products` prop array. |
| `CategoryShowcase.tsx` | `src/components/ecommerce/ECommerceCategories.tsx` | Renders categories derived from client in-memory products or static category list. |
| `BrandShowcase.tsx` | `src/components/ecommerce/ECommerceBrands.tsx` | In-memory brand extraction from client `products` array. |
| `StoreCartDrawer.tsx` | `src/components/ecommerce/ECommerceCartDrawer.tsx` | Renders cart items from React state. Sends client catalog to backend for validation. |
| `StoreCheckoutModal.tsx` | `src/components/ecommerce/ECommerceCheckoutModal.tsx` | Modal overlay with hardcoded shipping costs ("SLE 50", "SLE 120"). |
| `CustomerAccountModal.tsx` | `src/components/ecommerce/ECommerceCustomerAccountModal.tsx` | Merges demo orders with props orders in client memory. |
| `MobileFilterDrawer.tsx` | `src/components/ecommerce/ECommerceFilterSection.tsx` | Local filter states; not reflected in URL query parameters. |
| `CommerceContext.tsx` | *(Missing / Monolithic)* | State is prop-drilled from `App.tsx` through `ECommerceStorefront`. No centralized, memoized storefront context provider. |
| `authClient.ts` | *(Missing / Implicit)* | Customer identity is set via local state in `App.tsx` (`activeCustomer`) without session cookies or tenant-scoped token exchange. |
| `server.ts` API Routes | `/server.ts` | `/api/cart/validate`, `/api/pricing/calculate`, `/api/availability/check`, `/api/inventory/reserve`. All accept product payloads from client; no tenant routing or verification. |
| Catalog Repository | `src/services/dbService.ts` | Reads from root `/products` Firestore collection without `tenantId` filtering. |
| Firestore Security Rules | `/firestore.rules` | Rules have global `allow read: if true;` for `/products/{productId}` and `/orders/{orderId}`. No tenant isolation checks. |

---

### 2.2 End-to-End Trace: Missing Tenant Identification & Authoritative Leaks

```
CURRENT PROTOTYPE DATAFLOW (VULNERABILITIES IDENTIFIED):

[Browser Client]
       │
       ├─ (1) Tenant Identification: MISSING
       │      Client loads single hardcoded store ("Nexus Enterprise"). No hostname, slug, or header resolution.
       │
       ├─ (2) Request: UN-SCOPED
       │      GET /api/health or direct client Firestore listen on /products. No x-tenant-id header.
       │
       ├─ (3) Backend Tenant Resolution: NONE
       │      server.ts has zero tenant middleware. Express processes all requests as a single global tenant.
       │
       ├─ (4) Catalog Query: CLIENT-AUTHORITATIVE
       │      App.tsx loads INITIAL_PRODUCTS (mock data) or reads entire root collection /products.
       │
       ├─ (5) Product Response: UNPARTITIONED
       │      Browser holds all products for all businesses in client memory.
       │
       ├─ (6) Storefront State: PROP DRILLED
       │      App.tsx -> ECommerceStorefront -> ECommerceProductCard. Re-renders entire tree on any cart change.
       │
       ├─ (7) Pricing: CLIENT-SUPPLIED TO BACKEND
       │      Client POSTs { product, price, variantSku } to /api/pricing/calculate. Server computes on client numbers!
       │
       ├─ (8) Availability: CLIENT-SUPPLIED TO BACKEND
       │      Client POSTs { product } to /api/availability/check. Server inspects client's product.onHand!
       │
       ├─ (9) Cart: CLIENT-HELD & VALIDATED WITH CLIENT CATALOG OVERRIDE
       │      CartValidationRequest sends productsCatalog: Product[] from the browser to /api/cart/validate.
       │
       └─ (10) Checkout: UNPROTECTED ORDER GENERATION
              Order created with arbitrary customerId, saved to root /orders. Any client can create/read any order.
```

### 2.3 Vulnerability & Defect Register

1. **Defect SEC-T1 (Cross-Tenant Data Leakage)**: Firestore collections (`products`, `orders`, `customers`, `coupons`) are flat root-level collections with public read access. Any client can read another tenant's entire database.
2. **Defect SEC-T2 (Client-Authoritative Pricing)**: `/api/pricing/calculate` trusts `req.body.price` or `req.body.product.price`. An attacker can modify client state to claim an item is $1.00.
3. **Defect SEC-T3 (Client-Authoritative Availability)**: `/api/availability/check` computes available stock from `req.body.product.onHand` rather than checking tenant-owned backend warehouse records.
4. **Defect SEC-T4 (Global Reservation Collisions)**: `SERVER_RESERVATIONS_STORE` in `inventoryReservationManager.ts` is a single in-memory Map. If two tenants have a product with ID `prod-1`, their reservation counts clobber each other.
5. **Defect UX-T1 (Hardcoded Commercial Promises)**: `ECommerceHero.tsx` displays "Free nationwide over $150", "2-Year Warranty", and "30-Day Free Returns" regardless of what business or tenant is operating the store.
6. **Defect UX-T2 (No Deep Linking or URL State)**: Visiting `/` gives no way to bookmark a specific category, brand, product, cart, or order. Opening a product opens a transient modal that is lost on page refresh.

---

## 3. Phase 2 — Tenant-Aware Storefront Contract & Resolution Strategy

### 3.1 Tenant Resolution Architecture

The platform will employ a **hybrid, deterministic tenant resolution pipeline** with zero client spoofing:

```
                      INCOMING STOREFRONT REQUEST
                                  │
                                  ▼
           ┌──────────────────────────────────────────────┐
           │     1. Hostname / Domain Resolution          │
           │  (e.g., store-alpha.nexuspos.io -> alpha)    │
           └──────────────────────┬───────────────────────┘
                                  │ (If localhost or wildcard dev domain)
                                  ▼
           ┌──────────────────────────────────────────────┐
           │     2. Path Prefix Resolution                │
           │  (e.g., /store/:tenantSlug/...)              │
           └──────────────────────┬───────────────────────┘
                                  │ (If API request with header)
                                  ▼
           ┌──────────────────────────────────────────────┐
           │     3. Header Resolution                     │
           │  (X-Tenant-Slug or X-Tenant-Id)              │
           └──────────────────────┬───────────────────────┘
                                  │ (Development / Sandbox fallback)
                                  ▼
           ┌──────────────────────────────────────────────┐
           │     4. Query Param Fallback                  │
           │  (?tenant=tenantSlug)                        │
           └──────────────────────┬───────────────────────┘
                                  │
                                  ▼
                [Tenant Registry / Database Lookup]
                 (Cached in-memory TTL 300s / Redis)
                                  │
                       Found? ────┴──── Not Found?
                         │                     │
                         ▼                     ▼
              [Attach req.tenant & store]   [HTTP 404 / Storefront Not Found]
```

### 3.2 Canonical Storefront Context Contract

Every public storefront session begins by loading the authoritative `StorefrontContext`:

```typescript
export interface StorefrontContextResponse {
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
```

---

## 4. Phase 3 — Tenant-Scoped Catalog & Data Repositories

### 4.1 Server-Authoritative Catalog API

The storefront must NEVER load a monolithic in-memory array of products. The catalog is queryable via strict, tenant-partitioned server endpoints:

| Endpoint | Method | Purpose & Filtering Parameters |
| :--- | :--- | :--- |
| `/api/storefront/:tenantSlug/context` | `GET` | Fetches tenant branding, currency, policies, feature flags, and top-level categories. |
| `/api/storefront/:tenantSlug/products` | `GET` | Paginated product listing. Supports: `page`, `limit`, `category` (slug/name), `brand`, `minPrice`, `maxPrice`, `inStockOnly`, `search`, `sort` (`featured`, `price_asc`, `price_desc`, `rating`, `newest`). |
| `/api/storefront/:tenantSlug/products/:slugOrId` | `GET` | Fetches individual product with live server pricing, variants matrix, inventory availability, specifications, and related recommendations. |
| `/api/storefront/:tenantSlug/categories` | `GET` | Returns tenant's active category tree. |
| `/api/storefront/:tenantSlug/brands` | `GET` | Returns list of brands active in tenant's catalog. |
| `/api/storefront/:tenantSlug/search/autocomplete` | `GET` | Fast prefix query returning top matches for instant search drawer. |

### 4.2 Database Multi-Tenant Isolation Strategy

In Firestore and relational datastores, tenant isolation is maintained through **strict path partitioning**:

```
FIRESTORE COLLECTION HIERARCHY:

/tenants/{tenantId}
   ├── config (Document: settings, branding, policies, flags)
   ├── products/{productId}
   ├── categories/{categoryId}
   ├── orders/{orderId}
   ├── inventory_levels/{skuOrId}
   ├── coupons/{couponId}
   └── customers/{customerId}
```

#### Firestore Security Rules Reinforcement:
```javascript
// Tenant-scoped Firestore isolation rules
match /tenants/{tenantId} {
  // Public storefront read on published catalog items & tenant config
  match /config/public {
    allow read: if true;
  }
  match /products/{productId} {
    allow read: if resource.data.status == 'active';
    allow write: if request.auth != null && request.auth.token.tenantId == tenantId;
  }
  match /categories/{categoryId} {
    allow read: if true;
    allow write: if request.auth != null && request.auth.token.tenantId == tenantId;
  }
  match /orders/{orderId} {
    // Only customer who placed it or authorized tenant staff can read
    allow read: if (request.auth != null && request.auth.token.tenantId == tenantId) ||
                   (resource.data.customerEmail == request.auth.token.email);
    allow create: if request.resource.data.tenantId == tenantId;
  }
}
```

---

## 5. Phase 4 — Tenant-Scoped Commerce Data & Lifecycle Logic

### 5.1 Pricing Engine: Zero Client Authority

1. **Client Sends**: `{ productId, variantSku, quantity, packagingUnitName }`.
2. **Server Lookups**: Looks up product directly from `/tenants/{tenantId}/products/{productId}`.
3. **Variant Verification**: Verifies `variantSku` belongs to product and retrieves `variant.price`.
4. **B2B / Loyalty Verification**: Verifies customer session token to check eligible customer group / price tier.
5. **Tax & Currency**: Calculates exact currency conversion and tenant tax rate.
6. **Server Returns**: Authoritative unit price, subtotal, and tax amount. Client price inputs are rejected.

### 5.2 Inventory Availability & Partitioned Reservations

`SERVER_RESERVATIONS_STORE` is refactored into a **Tenant-Partitioned Reservation Registry**:

```typescript
// Key: `${tenantId}:${productId}:${variantSku || 'DEFAULT'}`
interface TenantInventoryReservation {
  reservationId: string;
  tenantId: string;
  productId: string;
  variantSku?: string;
  quantity: number;
  expiresAt: number; // Unix timestamp ms
}
```

- When checking availability: `Effective Available = Tenant OnHand - Sum of Active Reservations for (tenantId, productId, variantSku)`.
- Tenant A's reservations cannot deduct or touch Tenant B's inventory stock.

### 5.3 Dynamic Policy-Driven Commercial Promises

Hardcoded marketing text in `ECommerceHero.tsx` and `ECommerceProductDetailModal.tsx` is replaced with dynamic expressions rendered from `context.policies`:

- **Delivery**: If `policies.shipping.freeShippingThreshold` exists, render:  
  `"Free delivery on orders over " + formatAmount(policies.shipping.freeShippingThreshold)`.  
  Otherwise, render:  
  `"Standard delivery: " + policies.shipping.standardEstimatedDays + " (" + formatAmount(policies.shipping.standardFee) + ")"`.
- **Returns**: `" " + policies.returns.allowedDays + "-Day Return Window (" + (policies.returns.freeReturns ? "Free Returns" : "Standard Terms") + ")"`.
- **Warranty**: `" " + policies.warranty.standardMonths + "-Month Manufacturer Warranty"`.

---

## 6. Phase 5 — Storefront Information Architecture & URL Routing

### 6.1 Route Structure & Deep Linking

Navigation transitions from internal React tab states to **URL-First routing**:

```
STOREFRONT URL ROUTE MAP:

Route                              View Component                    URL Parameters & Query
─────────────────────────────────────────────────────────────────────────────────────────────
/store/:tenantSlug                 StorefrontHome                    tenantSlug
/store/:tenantSlug/shop            StorefrontShop                    ?category=&brand=&minPrice=&maxPrice=&sort=&page=
/store/:tenantSlug/c/:categorySlug StorefrontCategoryShop            categorySlug, ?page=&sort=
/store/:tenantSlug/b/:brandSlug    StorefrontBrandShop               brandSlug, ?page=&sort=
/store/:tenantSlug/search          StorefrontSearchResults           ?q=keyword&page=&sort=
/store/:tenantSlug/p/:productSlug  StorefrontProductDetail           productSlug (or ID)
/store/:tenantSlug/cart            StorefrontCartView                deep-linkable cart page/drawer
/store/:tenantSlug/checkout        StorefrontCheckoutView            secure multi-step checkout
/store/:tenantSlug/account         StorefrontAccountView             ?tab=orders|profile|addresses
/store/:tenantSlug/order/:orderId  StorefrontOrderTracking           orderId, ?email=
```

### 6.2 History & Deep-Linking Management

- The storefront shell manages route transitions using standard HTML5 History API / lightweight hash/path routing adapter that preserves deep links, browser back/forward buttons, and shareable URLs.
- Modals for Product Detail and Cart sync their state to the URL (e.g. updating the address bar to `/store/nexus/p/acoustic-headphones-pro` when opened and reverting on close), allowing users to copy the URL and share it directly.

---

## 7. Phase 6 & 7 — Modernized Product Detail & Homepage Experience

### 7.1 Modern Product Detail Layout (Desktop & Mobile)

1. **Media Gallery**: High-resolution primary viewport with optical hover-magnification (2.5x), thumbnail strip (horizontal on mobile, vertical sticky rail on desktop), video embed support, and fullscreen lightbox view.
2. **Title & Rating Header**: Dynamic breadcrumb trail (`Home > Electronics > Audio > Product Name`), product title, SKU, brand badge, verified review count with star rating summary.
3. **Server-Authoritative Price Display**: Large primary price formatted in tenant currency, strikethrough original price, percentage savings tag, tax inclusion indicator.
4. **Variant Selector**: Multi-attribute selector (e.g., Color swatches, Size pills) with immediate real-time availability indicator per variant ("In Stock", "3 left", "Out of Stock").
5. **Quantity & Action Rail**: Accessible increment/decrement stepper, "Add to Cart" with micro-interaction feedback, "Buy Now" direct checkout trigger, and Wishlist toggle.
6. **Location / Hub Availability**: Displays local store pickup readiness (e.g., "Ready for pickup in 2 hours at Freetown Central Store").
7. **Policy Guarantees Bar**: Dynamically populated from `context.policies` (Shipping, Warranty, Returns, Secure Payment).
8. **Tabbed Content & Specifications**: Structured specs table (Weight, Dimensions, Materials, In The Box), rich description, and Verified Customer Reviews section.
9. **Cross-Sell & Related Products Carousel**: Tenant-filtered related products carousel powered by recommendation engine.

### 7.2 Modern Homepage Experience

1. **Hero Section**: Configurable carousel supporting tenant banners, responsive image sets (Desktop 1200w, Tablet 800w, Mobile 480w), custom text, and call-to-action buttons.
2. **Category Visual Grid**: Clean visual cards with category icons/images and product counts.
3. **Curated Collections / Best Sellers**: Server-filtered product cards with quick-add to cart.
4. **Tenant Value Proposition Strip**: Derived purely from tenant policies (no invented claims).
5. **Promotions & Flash Deals**: Live countdown timer linked to active server coupon codes.
6. **Brand Directory Carousel**: Interactive logos of active brands.
7. **Storefront Footer**: Tenant legal name, registration number, address, verified payment rail badges (Orange Money, Afrimoney, Monime, Cards), policies links, and newsletter subscription.

---

## 8. Phase 8 & 9 — Responsive Design & WCAG 2.2 AA Accessibility

### 8.1 Breakpoint Matrix

| Viewport | Range | Key UX Adaptations |
| :--- | :--- | :--- |
| **Desktop Ultra** | 1440px+ | Max-width 1360px container, 4-column product grid, sticky filter sidebar, 2-column product detail. |
| **Laptop** | 1024–1439px | 3-column product grid, collapsible filter sidebar, balanced padding. |
| **Tablet** | 768–1023px | 2-column product grid, top filter toggle bar with slide-out sheet, stacked detail layout. |
| **Mobile** | 375–767px | 1-2 column fluid grid, persistent sticky bottom action bar ("Add to Cart" / "Cart (3)"), thumb-friendly 48px touch targets, full-screen swipeable filter drawer. |

### 8.2 WCAG 2.2 AA Compliance Checklist

1. **Keyboard Navigation**: Complete tab-index flow; visible 2px high-contrast focus rings (`focus-visible:ring-2 focus-visible:ring-indigo-600`). No keyboard traps in modals or drawers.
2. **Modal & Drawer Focus Trapping**: Traps focus inside active Cart, Filter, or Account modals; restores focus to trigger button on dismiss; ESC key triggers close.
3. **Screen Reader Semantics**: Proper ARIA landmarks (`banner`, `main`, `navigation`, `complementary`, `contentinfo`), `aria-expanded`, `aria-controls`, `aria-live="polite"` for cart and error updates.
4. **Color Contrast**: 4.5:1 ratio minimum for regular body text; 3.0:1 for large display headings. No light gray text on light backgrounds.
5. **Reduced Motion**: All animations wrapped in `@media (prefers-reduced-motion: reduce)` / Tailwind `motion-reduce:transition-none`.

---

## 9. Phase 10 — Performance & State Architecture

### 9.1 Decoupled State Architecture

Replace monolithic `App.tsx` prop-drilling with modular React Contexts:

```
[StorefrontShell]
       │
       ├─ [StorefrontTenantProvider] ──── Holds resolved tenant, store, branding, policies, flags
       │
       ├─ [StorefrontCatalogProvider] ─── Manages paginated products, active filters, search queries
       │
       ├─ [StorefrontCartProvider] ────── Manages cart items, coupon validation, server quote sync
       │
       └─ [StorefrontCustomerProvider] ── Manages customer auth state, wishlist, order history
```

### 9.2 Optimization Strategy

1. **Virtual Pagination**: Product catalog loads in pages of 12 or 24 items. Never load all 500+ products on page boot.
2. **Optimized Image Component**: Responsive `srcset`, WebP support, blur-up placeholder, and native lazy loading (`loading="lazy"`).
3. **Debounced Search**: Search autocomplete queries debounced at 250ms with client-side LRU cache.
4. **Memoized Selectors**: Fine-grained `useMemo` hooks to prevent cart drawer opens from re-rendering the product grid.

---

## 10. Phase 11 — Target Component Architecture

```
src/
  components/
    storefront/
      StorefrontShell.tsx             // Master layout container & tenant provider
      StorefrontHeader.tsx            // Tenant-branded header, search bar, nav links, cart/account triggers
      StorefrontHero.tsx              // Tenant-configured hero carousel & policy proposition strip
      StorefrontCategoryGrid.tsx      // Visual category tiles
      StorefrontProductGrid.tsx       // Responsive grid with server pagination & sorting controls
      StorefrontProductCard.tsx       // Accessible card with live price, badges, quick add
      StorefrontProductFilters.tsx    // Faceted filters (category, brand, price range, stock)
      StorefrontProductDetail.tsx     // Complete product page with gallery, variant matrix, tabs
      StorefrontCartDrawer.tsx        // Slide-out cart with authoritative price validation & coupon input
      StorefrontCheckout.tsx          // Multi-step checkout (Shipping, Delivery, Payment, Summary)
      StorefrontOrderTracking.tsx     // Real-time delivery timeline & courier telemetry
      StorefrontCustomerAccount.tsx   // Order history, saved addresses, profile settings
      StorefrontFooter.tsx            // Tenant business info, payment rail icons, legal policies
      MobileBottomNav.tsx             // Mobile sticky navigation bar (Home, Shop, Cart, Account)
    ui/
      Button.tsx, Modal.tsx, Drawer.tsx, Badge.tsx, Input.tsx, Skeleton.tsx
  context/
    StorefrontTenantContext.tsx       // Tenant configuration & policies
    StorefrontCartContext.tsx         // Authoritative cart & pricing
    StorefrontCatalogContext.tsx      // Server catalog queries & filter state
  services/
    storefrontApiService.ts           // Client HTTP adapter for /api/storefront/...
```

---

## 11. Security Boundaries & Data Ownership

1. **Tenant Isolation**:
   - Every API request must authenticate or resolve a `tenantId`.
   - All backend database operations MUST use the tenant's scoped namespace or `where('tenantId', '==', tenantId)` filter.
   - Cross-tenant queries are blocked at both Express route middleware and Firestore security rules.
2. **Price & Stock Integrity**:
   - No client-provided prices, discounts, or stock numbers are trusted.
   - Orders are constructed strictly from backend product catalog prices at the time of checkout.
3. **Customer Privacy**:
   - Customer records, orders, and addresses are strictly isolated to their originating tenant. A customer registered with Tenant A has no presence or access in Tenant B's store.

---

## 12. Rollback & Fail-Safe Considerations

1. **Feature Flag Fallback**: If multi-tenant dynamic catalog resolution encounters an unexpected network outage, the storefront seamlessly displays cached tenant metadata with offline notice.
2. **Backward Compatibility**: Existing POS operator view (`currentView === 'Admin'`) remains intact and unmodified. Storefront modernization is isolated within `/store/:tenantSlug` and the `StorefrontShell` hierarchy.
3. **No Migration Data Loss**: Existing products in Firestore will be assigned default `tenantId: "nexus-default"` during tenant migration, ensuring zero data loss or inventory disruption.
