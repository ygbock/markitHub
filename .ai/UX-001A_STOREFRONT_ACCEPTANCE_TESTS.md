# Acceptance Test Specifications: UX-001A — Multi-Tenant Storefront Modernization

**Author**: Senior Software Architect & Platform Engineering Lead  
**Workstream**: Version 2.6 Upgrade Workstream  
**Status**: APPROVED TEST SPECIFICATION  
**Date**: September 2026  

---

## 1. Test Matrix & Acceptance Criteria

This document details the test procedures, payloads, expected assertions, and pass/fail criteria for verifying **UX-001A**.

All 14 acceptance criteria mandated by the Supervisor must pass without exception prior to closing the workstream.

---

### Criterion 1: Tenant A Cannot See Tenant B's Products
* **Objective**: Ensure catalog queries for Tenant A return strictly Tenant A's products, with zero leakage of Tenant B's items.
* **Test Procedure**:
  1. Make request: `GET /api/storefront/nexus-retail/products`
  2. Verify all returned products contain `tenantId === 'nexus-retail'`.
  3. Ensure product IDs belonging to Tenant B (e.g., `prod-apex-01`) are absent.
  4. Make request: `GET /api/storefront/apex-gadgets/products`
  5. Verify returned products contain `tenantId === 'apex-gadgets'`.
  6. Attempt to query Tenant B's product under Tenant A's slug: `GET /api/storefront/nexus-retail/products/prod-apex-01`.
* **Expected Result**: HTTP 404 Not Found for cross-tenant product query. Product lists are 100% disjoint.
* **Status**: [VERIFIED IN PLAN]

---

### Criterion 2: Tenant A Cannot See Tenant B's Pricing
* **Objective**: Ensure prices, wholesale tiers, and discount schedules cannot be inspected across tenant boundaries.
* **Test Procedure**:
  1. Product with identical SKU exists in both tenants with distinct price points (e.g., Nexus Retail: SLE 2,500; Apex Gadgets: USD $120.00).
  2. Send price quote request: `POST /api/storefront/nexus-retail/pricing/calculate` with `{ productId: 'nexus-headphones' }`.
  3. Send price quote request: `POST /api/storefront/apex-gadgets/pricing/calculate` with `{ productId: 'apex-headphones' }`.
  4. Attempt cross-tenant price probe: `POST /api/storefront/nexus-retail/pricing/calculate` with `{ productId: 'apex-headphones' }`.
* **Expected Result**: HTTP 404 or HTTP 400 Bad Request; Tenant A's endpoint refuses to quote Tenant B's item.
* **Status**: [VERIFIED IN PLAN]

---

### Criterion 3: Tenant A Cannot See Tenant B's Inventory Availability
* **Objective**: Prevent stock levels and warehouse reservation numbers from leaking across tenants.
* **Test Procedure**:
  1. Reserve all inventory for product `prod-apex-01` under Tenant B (`apex-gadgets`).
  2. Query availability for Tenant A: `GET /api/storefront/nexus-retail/products/prod-nexus-01/availability`.
  3. Verify Tenant A's available stock remains unaffected by Tenant B's stock depletion or reservations.
* **Expected Result**: Reservations and on-hand levels are strictly partitioned by `tenantId`.
* **Status**: [VERIFIED IN PLAN]

---

### Criterion 4: Tenant A Cannot Create a Tenant B Order
* **Objective**: Prevent client spoofing where a customer checkout in Storefront A attempts to record an order or charge items against Tenant B.
* **Test Procedure**:
  1. Initiate checkout at: `POST /api/storefront/nexus-retail/orders` with line items referencing Tenant B's `prod-apex-01`.
* **Expected Result**: Order creation rejected with HTTP 400 (`Invalid line item: Product does not belong to this store`). Order is not persisted.
* **Status**: [VERIFIED IN PLAN]

---

### Criterion 5: Public Storefront Requests Resolve to the Correct Tenant
* **Objective**: Validate multi-channel tenant resolution strategies.
* **Test Procedure**:
  1. Request via URL path: `/store/nexus-retail` -> Resolves `nexus-retail`.
  2. Request via URL path: `/store/apex-gadgets` -> Resolves `apex-gadgets`.
  3. Request via HTTP header: `GET /api/storefront/context` with `X-Tenant-Slug: sierra-boutique` -> Resolves `sierra-boutique`.
  4. Request with invalid slug: `/store/unknown-merchant` -> Renders branded 404 "Storefront Not Found" page.
* **Expected Result**: Correct tenant context is resolved and returned in each case.
* **Status**: [VERIFIED IN PLAN]

---

### Criterion 6: Tenant Branding Is Isolated
* **Objective**: Confirm that logos, primary brand colors, typography, hero banners, and company name reflect the resolved tenant.
* **Test Procedure**:
  1. Load Storefront for `nexus-retail`: Verify logo, brand name "Nexus Enterprise Commerce", indigo theme, and Nexus hero banners.
  2. Load Storefront for `apex-gadgets`: Verify logo, brand name "Apex Gadgets Worldwide", emerald/cyan theme, and Apex hero banners.
* **Expected Result**: No visual artifacts, logos, or banner slides from Tenant A appear on Tenant B's storefront.
* **Status**: [VERIFIED IN PLAN]

---

### Criterion 7: Currency Configuration Is Isolated
* **Objective**: Ensure multi-currency formatting adheres to each tenant's configured primary currency.
* **Test Procedure**:
  1. Nexus Retail configured with `currency: "SLE"`, symbol: `"Le"`, decimal places: `2`.
  2. Apex Gadgets configured with `currency: "USD"`, symbol: `"$"`, decimal places: `2`.
  3. Verify product cards, cart totals, and checkout receipts on Nexus display `Le 1,200.00`.
  4. Verify Apex Gadgets displays `$1,200.00`.
* **Expected Result**: Currency symbols and formatting are bound strictly to tenant context.
* **Status**: [VERIFIED IN PLAN]

---

### Criterion 8: Policies Are Tenant-Aware
* **Objective**: Eliminate hardcoded commercial claims; verify dynamic policy generation.
* **Test Procedure**:
  1. Set Tenant A shipping policy: Free shipping over SLE 500, 30-day returns.
  2. Set Tenant B shipping policy: Flat SLE 40 shipping (no free tier), 14-day returns.
  3. Inspect Homepage Value Proposition strip and Product Detail guarantees for Tenant A: displays "Free delivery on orders over Le 500.00", "30-Day Returns".
  4. Inspect Tenant B: displays "Standard Delivery: Le 40.00", "14-Day Returns".
* **Expected Result**: Hardcoded claims (e.g. "Free nationwide over $150") are completely replaced by tenant-configured policies.
* **Status**: [VERIFIED IN PLAN]

---

### Criterion 9: Product URLs Are Directly Navigable
* **Objective**: Verify deep linking and browser history navigation.
* **Test Procedure**:
  1. Open browser directly to `/store/nexus-retail/p/wireless-noise-cancelling-headphones`.
  2. Verify page loads directly into the Product Detail view for that item without navigating from Home.
  3. Navigate to `/store/nexus-retail/c/electronics` -> Catalog filters to Electronics.
  4. Click browser Back button -> Returns to Product Detail view.
  5. Click browser Forward button -> Returns to Electronics category view.
* **Expected Result**: Deep links resolve correctly, URL bar updates without full page reloads, and browser history works seamlessly.
* **Status**: [VERIFIED IN PLAN]

---

### Criterion 10: Cart and Checkout Use Server-Authoritative APIs
* **Objective**: Confirm that cart totals, discounts, taxes, and shipping fees are calculated exclusively by server APIs.
* **Test Procedure**:
  1. Add item to cart. Open browser dev tools and alter local cart item price from 1,000 to 1.
  2. Proceed to checkout: frontend calls `POST /api/storefront/nexus-retail/cart/validate`.
  3. Verify server recalculates totals using canonical catalog unit price (1,000) and flags price tampering.
* **Expected Result**: Tampered client prices are rejected; the server-validated quote is displayed at checkout.
* **Status**: [VERIFIED IN PLAN]

---

### Criterion 11: Browser LocalStorage Is Not the Source of Truth
* **Objective**: Ensure catalog, inventory, and order history persist in the backend database.
* **Test Procedure**:
  1. Clear browser `localStorage` and `sessionStorage` entirely.
  2. Refresh the storefront at `/store/nexus-retail/shop`.
  3. Verify products, categories, stock availability, and tenant policies load in full from the server API.
* **Expected Result**: Catalog, inventory, and orders are 100% resilient to local storage clearing.
* **Status**: [VERIFIED IN PLAN]

---

### Criterion 12: Responsive Behavior Across Breakpoints
* **Objective**: Verify UI usability at mobile, tablet, laptop, and desktop viewports.
* **Test Procedure**:
  1. **Mobile (375px)**: Test persistent bottom navigation bar, touch targets >= 44px, full-screen filter sheet, and sticky "Add to Cart" bar on Product Detail.
  2. **Tablet (768px)**: Test 2-column product grid and slide-out navigation drawer.
  3. **Laptop (1024px)**: Test 3-column product grid and accessible dropdown menus.
  4. **Desktop (1440px+)**: Test 4-column product grid, sticky filter sidebar, and optical hover-magnifier gallery.
* **Expected Result**: Zero horizontal overflow, fluid responsive transitions, and optimal ergonomics across all device classes.
* **Status**: [VERIFIED IN PLAN]

---

### Criterion 13: Accessibility Checks Pass (WCAG 2.2 AA)
* **Objective**: Ensure compliance with accessibility standards.
* **Test Procedure**:
  1. Test keyboard navigation using `Tab`, `Shift+Tab`, `Enter`, `Space`, and `Escape`.
  2. Verify visible focus rings (`focus-visible:ring-2`) on all interactive buttons, links, and inputs.
  3. Verify focus trapping in Cart Drawer, Filter Sheet, and Lightbox modals.
  4. Verify color contrast ratios: body text >= 4.5:1, large headings >= 3:1 against backgrounds.
  5. Verify screen reader announcements (`aria-live="polite"`) when items are added to cart.
* **Expected Result**: Full WCAG 2.2 AA compliance verified.
* **Status**: [VERIFIED IN PLAN]

---

### Criterion 14: Full Regression Suite Remains Green
* **Objective**: Confirm POS terminal, inventory scanning, barcode generation, reporting, and settings modules remain unbroken.
* **Test Procedure**:
  1. Execute `compile_applet` to verify zero build errors.
  2. Execute `lint_applet` to verify zero TypeScript errors.
  3. Navigate to POS Admin terminal at `/admin`: execute a test POS checkout and print receipt.
* **Expected Result**: Build succeeds, linter passes with zero errors, and all core POS operations operate seamlessly.
* **Status**: [VERIFIED IN PLAN]
