# Implementation Plan: UX-001A — Multi-Tenant Storefront Modernization

**Author**: Senior Software Architect & Platform Engineering Lead  
**Workstream**: Version 2.6 Upgrade Workstream (UPG-001 Platform Hardening Closed)  
**Status**: SUBMITTED FOR SUPERVISOR REVIEW  
**Date**: September 2026  

---

## 1. Overview & Strategy

This implementation plan defines the sequential, zero-regression roadmap for refactoring the storefront into a server-authoritative, multi-tenant eCommerce application.

To adhere strictly to platform discipline:
- **No Uncontrolled Monolithic Edits**: Changes are partitioned into isolated, reviewable phases.
- **Backward Compatibility**: POS Admin and existing checkout pipelines remain 100% operational throughout all refactor steps.
- **Server Authority First**: Tenant resolution and server API contracts are established BEFORE frontend UI components are migrated.

---

## 2. Phased Migration Sequence

```
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: BACKEND TENANT FOUNDATION & API CONTRACTS                    │
│ 1.1 Tenant Resolution Middleware (server.ts)                           │
│ 1.2 Multi-Tenant Data Store / Mock Tenant Registry                     │
│ 1.3 Authoritative Storefront API Endpoints (/api/storefront/...)       │
│ 1.4 Hardened Tenant-Partitioned Reservations & Cart Validation         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: CLIENT API CLIENT & CONTEXT ARCHITECTURE                      │
│ 2.1 storefrontApiService.ts (Type-safe client HTTP adapter)            │
│ 2.2 StorefrontTenantContext.tsx (Context, branding, policies, flags)   │
│ 2.3 StorefrontCatalogContext.tsx (Faceted search, pagination, sort)    │
│ 2.4 StorefrontCartContext.tsx (Authoritative quotes, reservation sync) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: URL ROUTING & INFORMATION ARCHITECTURE                        │
│ 3.1 URL Route Parser & Browser History Adapter                         │
│ 3.2 Dynamic Route Dispatcher (/store/:tenantSlug/...)                  │
│ 3.3 Deep-linking for Categories, Brands, Products, Cart, Orders        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: MODULAR STOREFRONT UI COMPONENTS                              │
│ 4.1 StorefrontShell & StorefrontHeader (Tenant-branded, accessible)   │
│ 4.2 StorefrontHero & Proposition Strip (Policy-driven promises)        │
│ 4.3 StorefrontProductGrid & StorefrontProductCard                      │
│ 4.4 StorefrontProductDetail (Gallery, variant matrix, tabs, specs)    │
│ 4.5 StorefrontCartDrawer & Checkout (Authoritative server totals)      │
│ 4.6 StorefrontOrderTracking & CustomerAccount                          │
│ 4.7 MobileBottomNav & MobileFilterDrawer                               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: VERIFICATION, ACCESSIBILITY (WCAG 2.2 AA) & REGRESSION TESTS  │
│ 5.1 Multi-Tenant Isolation Verification (Tenant A vs Tenant B)         │
│ 5.2 Responsive Layout Verification (375px to 1440px+)                 │
│ 5.3 Automated TypeScript & Test Suite Execution                        │
│ 5.4 Supervisor Sign-Off & Acceptance Testing                           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Step Breakdown

### Step 1: Backend Tenant Resolution & Storefront Endpoints
* **Scope**: `server.ts`, `src/server/tenantManager.ts`, `src/server/cartValidator.ts`
* **Actions**:
  1. Create `src/server/tenantManager.ts` defining canonical tenant registry (`nexus-retail`, `apex-gadgets`, `sierra-boutique`) with distinct branding, currency, policies, and catalog assignments.
  2. Add Express middleware `resolveTenantMiddleware` in `server.ts` checking `X-Tenant-Slug`, `X-Tenant-Id`, URL path `/store/:tenantSlug`, or query `?tenant=`.
  3. Implement `/api/storefront/:tenantSlug/context` returning full branding, policies, currency, and flags.
  4. Implement `/api/storefront/:tenantSlug/products` with server-side pagination, search, category/brand filtering, and price bounds.
  5. Implement `/api/storefront/:tenantSlug/products/:slugOrId` returning individual product with server-authoritative stock and variant pricing.
  6. Partition `src/server/inventoryReservationManager.ts` by `tenantId` to prevent reservation cross-talk.
  7. Update `/api/cart/validate` to enforce tenant catalog lookup, rejecting client-provided catalog overrides.
* **Exit Gate**: Verified with automated API curl/fetch tests proving Tenant A cannot see Tenant B's products or pricing.

### Step 2: Storefront Contexts & Client Services
* **Scope**: `src/services/storefrontApiService.ts`, `src/context/StorefrontTenantContext.tsx`, `src/context/StorefrontCartContext.tsx`
* **Actions**:
  1. Build `storefrontApiService.ts` with typed methods: `fetchContext()`, `fetchProducts()`, `fetchProductDetail()`, `validateCart()`, `createOrder()`, `trackOrder()`.
  2. Implement `StorefrontTenantContext` to expose `tenant`, `store`, `branding`, `currency`, `policies`, and `formatAmount`.
  3. Implement `StorefrontCartContext` replacing client calculation with debounced server cart validation quotes.
* **Exit Gate**: Decoupled state compiles cleanly without circular dependencies or unnecessary re-renders.

### Step 3: Information Architecture & URL Routing
* **Scope**: `src/utils/storefrontRouter.ts`, `src/components/storefront/StorefrontRouter.tsx`
* **Actions**:
  1. Implement client-side URL route parser that reads `window.location.pathname` and `window.location.search`.
  2. Support deep routes:
     - `/store/:tenantSlug` (Home)
     - `/store/:tenantSlug/shop` (Catalog)
     - `/store/:tenantSlug/c/:categorySlug` (Category)
     - `/store/:tenantSlug/b/:brandSlug` (Brand)
     - `/store/:tenantSlug/p/:productSlug` (Product detail)
     - `/store/:tenantSlug/cart` (Cart)
     - `/store/:tenantSlug/checkout` (Checkout)
     - `/store/:tenantSlug/order/:orderNumber` (Order Tracking)
     - `/store/:tenantSlug/account` (Customer Portal)
  3. Handle browser `popstate` events to support seamless back/forward navigation.
* **Exit Gate**: Direct navigation and browser back/forward buttons correctly transition views without reloading the page.

### Step 4: Component Modernization
* **Scope**: `src/components/storefront/*`
* **Actions**:
  1. **Header & Navigation**: Tenant logo, customizable navigation links, debounced search autocomplete with keyboard accessibility, currency badge, wishlist and cart counter.
  2. **Hero & Propositions**: Dynamic carousel populated from `tenant.branding.bannerSlides`; commercial promise strip dynamically generated from `tenant.policies` (eliminating hardcoded "$150" and fake warranties).
  3. **Product Catalog & Filters**: Faceted filter drawer/sidebar (price sliders, category pills, stock status), sorting dropdown, responsive 1-to-4 column product grid with skeleton loading states.
  4. **Product Detail View**: Image gallery with hover magnifier, thumbnail selector, fullscreen lightbox, variant attribute picker (swatches/pills), server-authoritative stock badge, tabs for specs, description, and verified reviews.
  5. **Cart & Checkout**: Slide-out drawer with real-time server coupon validation, step-by-step checkout (Contact, Shipping, Payment Method: Monime, Orange Money, Afrimoney, Card, Cash on Delivery).
  6. **Mobile Navigation**: Persistent bottom navigation bar with thumb-friendly touch targets (min 44px) and off-canvas mobile filters.
* **Exit Gate**: All components adhere to WCAG 2.2 AA (contrast, keyboard focus rings, screen-reader labels).

### Step 5: Verification & Acceptance Sign-Off
* **Scope**: Test execution, accessibility auditing, multi-tenant isolation demonstration.
* **Actions**:
  1. Verify multi-tenant isolation test cases (1 through 14).
  2. Run `compile_applet` and `lint_applet` to confirm zero build errors or TypeScript warnings.
  3. Document test run results and submit to `REVIEW_QUEUE.md`.

---

## 4. Component Refactoring & File Structure

```
src/
├── services/
│   └── storefrontApiService.ts         <-- NEW: Dedicated tenant-scoped API client
├── context/
│   ├── StorefrontTenantContext.tsx      <-- NEW: Tenant branding, policies, currency
│   └── StorefrontCartContext.tsx        <-- NEW: Server-authoritative cart & checkout state
├── utils/
│   └── storefrontRouter.ts             <-- NEW: URL routing & deep-link helpers
├── components/
│   └── storefront/
│       ├── StorefrontShell.tsx          <-- REPLACES monolithic ECommerceStorefront
│       ├── StorefrontHeader.tsx         <-- REPLACES ECommerceNav
│       ├── StorefrontHero.tsx           <-- REPLACES ECommerceHero (removes hardcoded text)
│       ├── StorefrontProductGrid.tsx    <-- REPLACES in-memory product grid
│       ├── StorefrontProductCard.tsx    <-- REPLACES ECommerceProductCard
│       ├── StorefrontProductFilters.tsx <-- REPLACES ECommerceFilterSection
│       ├── StorefrontProductDetail.tsx  <-- REPLACES ECommerceProductDetailModal
│       ├── StorefrontCartDrawer.tsx     <-- REPLACES ECommerceCartDrawer
│       ├── StorefrontCheckout.tsx       <-- REPLACES ECommerceCheckoutModal
│       ├── StorefrontOrderTracking.tsx  <-- REPLACES ECommerceOrderTrackingModal
│       ├── StorefrontCustomerAccount.tsx<-- REPLACES ECommerceCustomerAccountModal
│       ├── StorefrontFooter.tsx         <-- NEW: Tenant-branded footer
│       └── MobileBottomNav.tsx          <-- NEW: Mobile navigation bar
└── server/
    └── tenantManager.ts                 <-- NEW: Backend tenant registry & catalog isolator
```

---

## 5. Security & Isolation Matrix

| Risk Vector | Mitigation Strategy | Enforcement Layer |
| :--- | :--- | :--- |
| **Catalog Cross-Read** | Filter all catalog database queries by `tenantId`. Never query un-scoped root collections. | `server.ts` & Firestore Rules |
| **Price Tampering** | Server looks up product and variant price directly from tenant catalog; client price fields are ignored. | `/api/storefront/:tenantSlug/pricing/calculate` & `/api/cart/validate` |
| **Inventory Oversell** | Server checks `onHand - reserved` across tenant-partitioned reservation store. | `/api/availability/check` & `/api/inventory/reserve` |
| **Fake Order Injection** | Order creation requires validated line items and generates order strictly inside tenant's order partition. | `/api/storefront/:tenantSlug/orders` |
| **Commercial Misrepresentation** | Value propositions and shipping promises are pulled directly from tenant configuration. | `StorefrontHero.tsx` via `StorefrontTenantContext` |

---

## 6. Rollback & Contingency Plan

1. **Feature-Flagged Routing**: The modernized storefront operates behind `/store/:tenantSlug`. If needed, a master toggle can route requests to the legacy storefront shell.
2. **Pos / Admin Safety**: The Admin/POS suite operates on `/admin` and is completely untouched by storefront changes.
3. **Graceful Network Degradation**: If the backend is momentarily unreachable, the storefront displays an accessible offline notification with cached tenant metadata.
