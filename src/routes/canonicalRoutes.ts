/**
 * MIKITHUB CANONICAL ROUTE OWNERSHIP CONTRACT
 *
 * Core Rule: Every route has exactly one canonical owner.
 * A feature belongs to the route domain that owns the user experience,
 * not necessarily the database entity that supplies its data.
 *
 * Canonical Hierarchy:
 * MIKITHUB
 * │
 * ├── PUBLIC
 * │   ├── Discovery (/discover, /search, /businesses, /products, /services, /categories, /nearby, /map)
 * │   ├── Business Profiles (/business/:businessSlug)
 * │   └── Storefronts (/store/:tenantSlug/*)
 * │
 * ├── CUSTOMER
 * │   └── Account (/account/*)
 * │
 * ├── BUSINESS
 * │   └── Onboarding / Listing Management (/business/register, /business/onboarding, /business/:businessId/*)
 * │
 * ├── TENANT
 * │   └── Business Operations (/tenant/:tenantId/*)
 * │
 * └── SUPER ADMIN
 *     └── Platform Administration (/superadmin/*)
 */

export type CanonicalRouteDomain = 
  | 'PUBLIC_DISCOVERY'
  | 'STOREFRONT'
  | 'CUSTOMER_ACCOUNT'
  | 'IDENTITY_AUTH'
  | 'BUSINESS_ONBOARDING'
  | 'BUSINESS'
  | 'TENANT_OPERATIONS'
  | 'SUPER_ADMIN';

export type OperatingContextType = 
  | 'PLATFORM'
  | 'DISCOVERY'
  | 'BUSINESS'
  | 'TENANT'
  | 'CUSTOMER'
  | 'AUTH';

export type AuthRequirement = 
  | 'NONE'
  | 'CUSTOMER'
  | 'TENANT_STAFF'
  | 'BUSINESS_OWNER'
  | 'PLATFORM_ADMIN';

export type TenantCapability = 
  | 'discovery'
  | 'storefront'
  | 'products'
  | 'services'
  | 'pos'
  | 'inventory'
  | 'orders'
  | 'bookings'
  | 'quotes'
  | 'delivery'
  | 'pickup'
  | 'payments'
  | 'messaging'
  | 'customers'
  | 'marketing'
  | 'reports'
  | 'settings';

export type TenantOperationalStatus = 'active' | 'suspended' | 'pending' | 'archived';

export interface CanonicalRouteDefinition {
  id: string;
  pattern: string;
  domain: CanonicalRouteDomain;
  context: OperatingContextType;
  auth: AuthRequirement;
  requiredCapability?: TenantCapability;
  requiredPermission?: string;
  title: string;
  description: string;
}

/**
 * Authoritative Route Ownership Matrix (Section 10 of Architecture Contract)
 */
export const CANONICAL_ROUTE_DEFINITIONS: CanonicalRouteDefinition[] = [
  // -------------------------------------------------------------------------
  // 1. PUBLIC DISCOVERY (Owner: Public/Discovery Application)
  // -------------------------------------------------------------------------
  {
    id: 'public.home',
    pattern: '/',
    domain: 'PUBLIC_DISCOVERY',
    context: 'DISCOVERY',
    auth: 'NONE',
    title: 'MikitHub Discovery',
    description: 'Universal discovery homepage for businesses, products, and services.',
  },
  {
    id: 'public.discover',
    pattern: '/discover',
    domain: 'PUBLIC_DISCOVERY',
    context: 'DISCOVERY',
    auth: 'NONE',
    title: 'Discover Local Businesses & Offerings',
    description: 'Browse local commerce and service providers.',
  },
  {
    id: 'public.search',
    pattern: '/search',
    domain: 'PUBLIC_DISCOVERY',
    context: 'DISCOVERY',
    auth: 'NONE',
    title: 'Search MikitHub',
    description: 'Cross-entity search across businesses, products, and services.',
  },
  {
    id: 'public.businesses',
    pattern: '/businesses',
    domain: 'PUBLIC_DISCOVERY',
    context: 'DISCOVERY',
    auth: 'NONE',
    title: 'Business Directory',
    description: 'Explore registered businesses and service providers.',
  },
  {
    id: 'public.business.profile',
    pattern: '/business/:businessSlug',
    domain: 'PUBLIC_DISCOVERY',
    context: 'BUSINESS',
    auth: 'NONE',
    title: 'Business Profile',
    description: 'Public listing profile with contact, locations, services, and optional store link.',
  },
  {
    id: 'public.products',
    pattern: '/products',
    domain: 'PUBLIC_DISCOVERY',
    context: 'DISCOVERY',
    auth: 'NONE',
    title: 'Discover Products',
    description: 'Browse catalog products available from local and tenant businesses.',
  },
  {
    id: 'public.product.detail',
    pattern: '/product/:productId',
    domain: 'PUBLIC_DISCOVERY',
    context: 'DISCOVERY',
    auth: 'NONE',
    title: 'Product Information',
    description: 'Universal product discovery view.',
  },
  {
    id: 'public.services',
    pattern: '/services',
    domain: 'PUBLIC_DISCOVERY',
    context: 'DISCOVERY',
    auth: 'NONE',
    title: 'Discover Services',
    description: 'Find local services (repairs, tailoring, plumbing, healthcare, printing).',
  },
  {
    id: 'public.service.detail',
    pattern: '/service/:serviceId',
    domain: 'PUBLIC_DISCOVERY',
    context: 'DISCOVERY',
    auth: 'NONE',
    title: 'Service Details',
    description: 'Service specifications, provider info, and booking entry.',
  },
  {
    id: 'public.categories',
    pattern: '/categories',
    domain: 'PUBLIC_DISCOVERY',
    context: 'DISCOVERY',
    auth: 'NONE',
    title: 'Browse Categories',
    description: 'Explore business and product categories.',
  },
  {
    id: 'public.category.detail',
    pattern: '/category/:categorySlug',
    domain: 'PUBLIC_DISCOVERY',
    context: 'DISCOVERY',
    auth: 'NONE',
    title: 'Category Listings',
    description: 'Filtered listings by category.',
  },
  {
    id: 'public.nearby',
    pattern: '/nearby',
    domain: 'PUBLIC_DISCOVERY',
    context: 'DISCOVERY',
    auth: 'NONE',
    title: 'Nearby Businesses',
    description: 'Geo-located nearby discovery based on proximity.',
  },
  {
    id: 'public.map',
    pattern: '/map',
    domain: 'PUBLIC_DISCOVERY',
    context: 'DISCOVERY',
    auth: 'NONE',
    title: 'Interactive Map Discovery',
    description: 'Map view of local businesses and service locations.',
  },

  // -------------------------------------------------------------------------
  // 2. PUBLIC STOREFRONT (Owner: Storefront Domain, Tenant-Owned Data)
  // -------------------------------------------------------------------------
  {
    id: 'storefront.home',
    pattern: '/store/:tenantSlug',
    domain: 'STOREFRONT',
    context: 'TENANT',
    auth: 'NONE',
    requiredCapability: 'storefront',
    title: 'Storefront',
    description: 'Public tenant commerce storefront homepage.',
  },
  {
    id: 'storefront.products',
    pattern: '/store/:tenantSlug/products',
    domain: 'STOREFRONT',
    context: 'TENANT',
    auth: 'NONE',
    requiredCapability: 'storefront',
    title: 'Storefront Products',
    description: 'Storefront product catalog listing.',
  },
  {
    id: 'storefront.product.detail',
    pattern: '/store/:tenantSlug/product/:productId',
    domain: 'STOREFRONT',
    context: 'TENANT',
    auth: 'NONE',
    requiredCapability: 'storefront',
    title: 'Storefront Product',
    description: 'Individual product details on tenant storefront.',
  },
  {
    id: 'storefront.categories',
    pattern: '/store/:tenantSlug/categories',
    domain: 'STOREFRONT',
    context: 'TENANT',
    auth: 'NONE',
    requiredCapability: 'storefront',
    title: 'Storefront Categories',
    description: 'Storefront category browsing.',
  },
  {
    id: 'storefront.cart',
    pattern: '/store/:tenantSlug/cart',
    domain: 'STOREFRONT',
    context: 'TENANT',
    auth: 'NONE',
    requiredCapability: 'storefront',
    title: 'Shopping Cart',
    description: 'Active shopping cart for tenant storefront.',
  },
  {
    id: 'storefront.checkout',
    pattern: '/store/:tenantSlug/checkout',
    domain: 'STOREFRONT',
    context: 'TENANT',
    auth: 'NONE', // Can support guest checkout or require customer login based on tenant policy
    requiredCapability: 'storefront',
    title: 'Checkout',
    description: 'Secure customer order checkout.',
  },
  {
    id: 'storefront.orders',
    pattern: '/store/:tenantSlug/orders',
    domain: 'STOREFRONT',
    context: 'TENANT',
    auth: 'CUSTOMER',
    requiredCapability: 'storefront',
    title: 'Storefront Orders',
    description: 'Customer order history and status tracking within store.',
  },

  // -------------------------------------------------------------------------
  // 3. CUSTOMER ACCOUNT (Owner: Customer Application)
  // -------------------------------------------------------------------------
  {
    id: 'customer.account',
    pattern: '/account',
    domain: 'CUSTOMER_ACCOUNT',
    context: 'CUSTOMER',
    auth: 'CUSTOMER',
    title: 'Customer Account',
    description: 'Customer dashboard overview.',
  },
  {
    id: 'customer.profile',
    pattern: '/account/profile',
    domain: 'CUSTOMER_ACCOUNT',
    context: 'CUSTOMER',
    auth: 'CUSTOMER',
    title: 'Account Profile',
    description: 'Manage customer identity, contact info, and preferences.',
  },
  {
    id: 'customer.orders',
    pattern: '/account/orders',
    domain: 'CUSTOMER_ACCOUNT',
    context: 'CUSTOMER',
    auth: 'CUSTOMER',
    title: 'My Orders',
    description: 'Cross-tenant customer order history.',
  },
  {
    id: 'customer.order.detail',
    pattern: '/account/order/:orderId',
    domain: 'CUSTOMER_ACCOUNT',
    context: 'CUSTOMER',
    auth: 'CUSTOMER',
    title: 'Order Details',
    description: 'Customer view of a specific order receipt and tracking.',
  },
  {
    id: 'customer.wishlist',
    pattern: '/account/wishlist',
    domain: 'CUSTOMER_ACCOUNT',
    context: 'CUSTOMER',
    auth: 'CUSTOMER',
    title: 'My Wishlist',
    description: 'Saved products across businesses.',
  },
  {
    id: 'customer.addresses',
    pattern: '/account/addresses',
    domain: 'CUSTOMER_ACCOUNT',
    context: 'CUSTOMER',
    auth: 'CUSTOMER',
    title: 'Saved Addresses',
    description: 'Delivery and billing addresses.',
  },
  {
    id: 'customer.bookings',
    pattern: '/account/bookings',
    domain: 'CUSTOMER_ACCOUNT',
    context: 'CUSTOMER',
    auth: 'CUSTOMER',
    title: 'My Bookings',
    description: 'Appointments and booked services.',
  },
  {
    id: 'customer.messages',
    pattern: '/account/messages',
    domain: 'CUSTOMER_ACCOUNT',
    context: 'CUSTOMER',
    auth: 'CUSTOMER',
    title: 'Messages',
    description: 'Customer inquiries and communications with businesses.',
  },
  {
    id: 'customer.settings',
    pattern: '/account/settings',
    domain: 'CUSTOMER_ACCOUNT',
    context: 'CUSTOMER',
    auth: 'CUSTOMER',
    title: 'Account Settings',
    description: 'Security, passwords, and notification preferences.',
  },

  // -------------------------------------------------------------------------
  // 4. IDENTITY & AUTHENTICATION (Owner: Identity/Auth Domain)
  // -------------------------------------------------------------------------
  {
    id: 'auth.login',
    pattern: '/login',
    domain: 'IDENTITY_AUTH',
    context: 'AUTH',
    auth: 'NONE',
    title: 'Sign In',
    description: 'Unified authentication gateway for Customers, Staff, and Super Admins.',
  },
  {
    id: 'auth.register',
    pattern: '/register',
    domain: 'IDENTITY_AUTH',
    context: 'AUTH',
    auth: 'NONE',
    title: 'Create Account',
    description: 'Customer and business user account registration.',
  },
  {
    id: 'auth.forgot_password',
    pattern: '/forgot-password',
    domain: 'IDENTITY_AUTH',
    context: 'AUTH',
    auth: 'NONE',
    title: 'Reset Password',
    description: 'Account password recovery.',
  },
  {
    id: 'auth.reset_password',
    pattern: '/reset-password',
    domain: 'IDENTITY_AUTH',
    context: 'AUTH',
    auth: 'NONE',
    title: 'New Password',
    description: 'Token-based password reset.',
  },
  {
    id: 'auth.verify_email',
    pattern: '/verify-email',
    domain: 'IDENTITY_AUTH',
    context: 'AUTH',
    auth: 'NONE',
    title: 'Verify Email',
    description: 'Email address verification.',
  },

  // -------------------------------------------------------------------------
  // 5. BUSINESS ONBOARDING (Owner: Business Domain)
  // -------------------------------------------------------------------------
  {
    id: 'business.register',
    pattern: '/business/register',
    domain: 'BUSINESS_ONBOARDING',
    context: 'BUSINESS',
    auth: 'CUSTOMER', // Any authenticated user can register a business
    title: 'Register Business',
    description: 'Create a new business identity on MikitHub.',
  },
  {
    id: 'business.register.alias',
    pattern: '/register/business',
    domain: 'BUSINESS_ONBOARDING',
    context: 'BUSINESS',
    auth: 'CUSTOMER',
    title: 'Register Business',
    description: 'Create a new business identity on MikitHub.',
  },
  {
    id: 'business.onboarding',
    pattern: '/business/onboarding',
    domain: 'BUSINESS_ONBOARDING',
    context: 'BUSINESS',
    auth: 'CUSTOMER',
    title: 'Business Onboarding',
    description: 'Multi-step onboarding: Business Info -> Category -> Location -> Contact -> Decision (Listing Only vs Store).',
  },
  {
    id: 'business.dashboard',
    pattern: '/business/:businessId/dashboard',
    domain: 'BUSINESS',
    context: 'BUSINESS',
    auth: 'BUSINESS_OWNER',
    title: 'Business Overview',
    description: 'Business metrics, branches, and discovery settings.',
  },
  {
    id: 'business.overview',
    pattern: '/business/:businessId/overview',
    domain: 'BUSINESS',
    context: 'BUSINESS',
    auth: 'BUSINESS_OWNER',
    title: 'Business Overview',
    description: 'Business overview and listing preview.',
  },
  {
    id: 'business.services',
    pattern: '/business/:businessId/services',
    domain: 'BUSINESS',
    context: 'BUSINESS',
    auth: 'BUSINESS_OWNER',
    title: 'Business Services',
    description: 'Services and menu offerings.',
  },
  {
    id: 'business.setup',
    pattern: '/business/:businessId/setup',
    domain: 'BUSINESS',
    context: 'BUSINESS',
    auth: 'BUSINESS_OWNER',
    title: 'Business Setup',
    description: 'Initial configuration of business profile and options.',
  },
  {
    id: 'business.listing',
    pattern: '/business/:businessId/listing',
    domain: 'BUSINESS',
    context: 'BUSINESS',
    auth: 'BUSINESS_OWNER',
    title: 'Manage Public Listing',
    description: 'Configure public listing details, opening hours, and photos.',
  },
  {
    id: 'business.locations',
    pattern: '/business/:businessId/locations',
    domain: 'BUSINESS',
    context: 'BUSINESS',
    auth: 'BUSINESS_OWNER',
    title: 'Business Locations',
    description: 'Physical branches, service areas, and coordinates.',
  },
  {
    id: 'business.settings',
    pattern: '/business/:businessId/settings',
    domain: 'BUSINESS',
    context: 'BUSINESS',
    auth: 'BUSINESS_OWNER',
    title: 'Business Settings',
    description: 'Business identity and governance settings.',
  },

  // -------------------------------------------------------------------------
  // 6. TENANT BUSINESS OPERATIONS (Owner: Tenant Application)
  // -------------------------------------------------------------------------
  {
    id: 'tenant.root',
    pattern: '/tenant/:tenantId',
    domain: 'TENANT_OPERATIONS',
    context: 'TENANT',
    auth: 'TENANT_STAFF',
    title: 'Tenant Workspace',
    description: 'Root tenant operational environment.',
  },
  {
    id: 'tenant.dashboard',
    pattern: '/tenant/:tenantId/dashboard',
    domain: 'TENANT_OPERATIONS',
    context: 'TENANT',
    auth: 'TENANT_STAFF',
    title: 'Tenant Dashboard',
    description: 'Business operational overview and KPI metrics.',
  },
  {
    id: 'tenant.sales',
    pattern: '/tenant/:tenantId/sales',
    domain: 'TENANT_OPERATIONS',
    context: 'TENANT',
    auth: 'TENANT_STAFF',
    requiredPermission: 'sales.view',
    title: 'Sales Management',
    description: 'Sales history, register shifts, and receipts.',
  },
  {
    id: 'tenant.orders',
    pattern: '/tenant/:tenantId/orders',
    domain: 'TENANT_OPERATIONS',
    context: 'TENANT',
    auth: 'TENANT_STAFF',
    requiredCapability: 'orders',
    requiredPermission: 'sales.view',
    title: 'Order Processing',
    description: 'Omnichannel order fulfillment, status transitions, and returns.',
  },
  {
    id: 'tenant.products',
    pattern: '/tenant/:tenantId/products',
    domain: 'TENANT_OPERATIONS',
    context: 'TENANT',
    auth: 'TENANT_STAFF',
    requiredCapability: 'products',
    requiredPermission: 'inventory.view',
    title: 'Product Catalog',
    description: 'Authoritative product catalog, variants, and pricing.',
  },
  {
    id: 'tenant.inventory',
    pattern: '/tenant/:tenantId/inventory',
    domain: 'TENANT_OPERATIONS',
    context: 'TENANT',
    auth: 'TENANT_STAFF',
    requiredCapability: 'inventory',
    requiredPermission: 'inventory.view',
    title: 'Inventory & Stock Control',
    description: 'Multi-location stock levels, adjustments, and reorder tracking.',
  },
  {
    id: 'tenant.customers',
    pattern: '/tenant/:tenantId/customers',
    domain: 'TENANT_OPERATIONS',
    context: 'TENANT',
    auth: 'TENANT_STAFF',
    requiredCapability: 'customers',
    requiredPermission: 'crm.view',
    title: 'Customer Relationship Management',
    description: 'Tenant customer profiles, loyalty balances, and communication.',
  },
  {
    id: 'tenant.services',
    pattern: '/tenant/:tenantId/services',
    domain: 'TENANT_OPERATIONS',
    context: 'TENANT',
    auth: 'TENANT_STAFF',
    requiredCapability: 'services',
    title: 'Service Catalog',
    description: 'Service offerings, pricing, durations, and assignees.',
  },
  {
    id: 'tenant.bookings',
    pattern: '/tenant/:tenantId/bookings',
    domain: 'TENANT_OPERATIONS',
    context: 'TENANT',
    auth: 'TENANT_STAFF',
    requiredCapability: 'bookings',
    title: 'Bookings & Appointments',
    description: 'Appointment schedules, calendar slots, and attendance.',
  },
  {
    id: 'tenant.pos',
    pattern: '/tenant/:tenantId/pos',
    domain: 'TENANT_OPERATIONS',
    context: 'TENANT',
    auth: 'TENANT_STAFF',
    requiredCapability: 'pos',
    requiredPermission: 'sales.create',
    title: 'Point of Sale (POS)',
    description: 'High-speed cashier terminal, barcode scanning, and receipt printing.',
  },
  {
    id: 'tenant.storefront',
    pattern: '/tenant/:tenantId/storefront',
    domain: 'TENANT_OPERATIONS',
    context: 'TENANT',
    auth: 'TENANT_STAFF',
    requiredCapability: 'storefront',
    requiredPermission: 'ecommerce.manage',
    title: 'Storefront CMS',
    description: 'Tenant storefront homepage editor, branding, and publication controls.',
  },
  {
    id: 'tenant.storefront.design',
    pattern: '/tenant/:tenantId/storefront/design',
    domain: 'TENANT_OPERATIONS',
    context: 'TENANT',
    auth: 'TENANT_STAFF',
    requiredCapability: 'storefront',
    requiredPermission: 'ecommerce.manage',
    title: 'Storefront Design & Theme',
    description: 'Colors, typography, logo, and layout branding.',
  },
  {
    id: 'tenant.storefront.homepage',
    pattern: '/tenant/:tenantId/storefront/homepage',
    domain: 'TENANT_OPERATIONS',
    context: 'TENANT',
    auth: 'TENANT_STAFF',
    requiredCapability: 'storefront',
    requiredPermission: 'ecommerce.manage',
    title: 'Storefront Homepage Sections',
    description: 'Hero banners, featured collections, and promotional strips.',
  },
  {
    id: 'tenant.storefront.navigation',
    pattern: '/tenant/:tenantId/storefront/navigation',
    domain: 'TENANT_OPERATIONS',
    context: 'TENANT',
    auth: 'TENANT_STAFF',
    requiredCapability: 'storefront',
    requiredPermission: 'ecommerce.manage',
    title: 'Storefront Navigation',
    description: 'Header menus, category taxonomy, and footer links.',
  },
  {
    id: 'tenant.marketing',
    pattern: '/tenant/:tenantId/marketing',
    domain: 'TENANT_OPERATIONS',
    context: 'TENANT',
    auth: 'TENANT_STAFF',
    requiredCapability: 'marketing',
    title: 'Marketing & Promotions',
    description: 'Coupons, discounts, campaigns, and broadcasts.',
  },
  {
    id: 'tenant.reports',
    pattern: '/tenant/:tenantId/reports',
    domain: 'TENANT_OPERATIONS',
    context: 'TENANT',
    auth: 'TENANT_STAFF',
    requiredCapability: 'reports',
    requiredPermission: 'finance.reports',
    title: 'Analytics & Financial Reports',
    description: 'Revenue analysis, sales velocity, and tax summaries.',
  },
  {
    id: 'tenant.settings',
    pattern: '/tenant/:tenantId/settings',
    domain: 'TENANT_OPERATIONS',
    context: 'TENANT',
    auth: 'TENANT_STAFF',
    requiredCapability: 'settings',
    requiredPermission: 'system.settings',
    title: 'Tenant Settings',
    description: 'Company information, receipt templates, staff roles, and integrations.',
  },

  // -------------------------------------------------------------------------
  // 7. SUPER ADMIN (Owner: Platform Administration)
  // -------------------------------------------------------------------------
  {
    id: 'superadmin.root',
    pattern: '/superadmin',
    domain: 'SUPER_ADMIN',
    context: 'PLATFORM',
    auth: 'PLATFORM_ADMIN',
    title: 'Super Admin Platform Control Plane',
    description: 'Central platform administration.',
  },
  {
    id: 'superadmin.dashboard',
    pattern: '/superadmin/dashboard',
    domain: 'SUPER_ADMIN',
    context: 'PLATFORM',
    auth: 'PLATFORM_ADMIN',
    title: 'Platform Operations Dashboard',
    description: 'Global operations, platform metrics, and active instances.',
  },
  {
    id: 'superadmin.businesses',
    pattern: '/superadmin/businesses',
    domain: 'SUPER_ADMIN',
    context: 'PLATFORM',
    auth: 'PLATFORM_ADMIN',
    title: 'Businesses Directory & Governance',
    description: 'Manage all platform registered businesses.',
  },
  {
    id: 'superadmin.business.detail',
    pattern: '/superadmin/businesses/:businessId',
    domain: 'SUPER_ADMIN',
    context: 'PLATFORM',
    auth: 'PLATFORM_ADMIN',
    title: 'Business Administrative File',
    description: 'Detailed business verification status, owner, and lifecycle state.',
  },
  {
    id: 'superadmin.listings',
    pattern: '/superadmin/listings',
    domain: 'SUPER_ADMIN',
    context: 'PLATFORM',
    auth: 'PLATFORM_ADMIN',
    title: 'Public Listings Directory',
    description: 'Public business listings, verification badges, and moderation.',
  },
  {
    id: 'superadmin.tenants',
    pattern: '/superadmin/tenants',
    domain: 'SUPER_ADMIN',
    context: 'PLATFORM',
    auth: 'PLATFORM_ADMIN',
    title: 'Tenants & Provisioning',
    description: 'Provisioning, tenant status, capacity quotas, and owner assignments.',
  },
  {
    id: 'superadmin.tenant.detail',
    pattern: '/superadmin/tenants/:tenantId',
    domain: 'SUPER_ADMIN',
    context: 'PLATFORM',
    auth: 'PLATFORM_ADMIN',
    title: 'Tenant Administration',
    description: 'Configure tenant plans, capabilities, and lifecycle.',
  },
  {
    id: 'superadmin.users',
    pattern: '/superadmin/users',
    domain: 'SUPER_ADMIN',
    context: 'PLATFORM',
    auth: 'PLATFORM_ADMIN',
    title: 'Platform Identity & Access Control',
    description: 'Platform administrators, tenant operators, and credentials.',
  },
  {
    id: 'superadmin.verification',
    pattern: '/superadmin/verification',
    domain: 'SUPER_ADMIN',
    context: 'PLATFORM',
    auth: 'PLATFORM_ADMIN',
    title: 'Business Verification Queue',
    description: 'Review KYC documents, business licenses, and trust badges.',
  },
  {
    id: 'superadmin.categories',
    pattern: '/superadmin/categories',
    domain: 'SUPER_ADMIN',
    context: 'PLATFORM',
    auth: 'PLATFORM_ADMIN',
    title: 'Platform Taxonomy & Categories',
    description: 'Global business and product category trees.',
  },
  {
    id: 'superadmin.storefronts',
    pattern: '/superadmin/storefronts',
    domain: 'SUPER_ADMIN',
    context: 'PLATFORM',
    auth: 'PLATFORM_ADMIN',
    title: 'Platform Storefronts',
    description: 'Active storefronts, custom domains, and SSL certificates.',
  },
  {
    id: 'superadmin.orders',
    pattern: '/superadmin/orders',
    domain: 'SUPER_ADMIN',
    context: 'PLATFORM',
    auth: 'PLATFORM_ADMIN',
    title: 'Global Orders & Volume',
    description: 'Platform-wide order velocity and settlement tracking.',
  },
  {
    id: 'superadmin.payments',
    pattern: '/superadmin/payments',
    domain: 'SUPER_ADMIN',
    context: 'PLATFORM',
    auth: 'PLATFORM_ADMIN',
    title: 'Payment Gateway Gateways & Routing',
    description: 'Fintech settlement, gateway accounts, and payout reconciliation.',
  },
  {
    id: 'superadmin.reviews',
    pattern: '/superadmin/reviews',
    domain: 'SUPER_ADMIN',
    context: 'PLATFORM',
    auth: 'PLATFORM_ADMIN',
    title: 'Platform Reviews & Moderation',
    description: 'Flagged ratings, reviews moderation, and content safety.',
  },
  {
    id: 'superadmin.moderation',
    pattern: '/superadmin/moderation',
    domain: 'SUPER_ADMIN',
    context: 'PLATFORM',
    auth: 'PLATFORM_ADMIN',
    title: 'Content Moderation',
    description: 'Product listing policy enforcement and abuse reports.',
  },
  {
    id: 'superadmin.subscriptions',
    pattern: '/superadmin/subscriptions',
    domain: 'SUPER_ADMIN',
    context: 'PLATFORM',
    auth: 'PLATFORM_ADMIN',
    title: 'Subscription Plans & Billing',
    description: 'Platform plans, monthly billing, and usage limits.',
  },
  {
    id: 'superadmin.security',
    pattern: '/superadmin/security',
    domain: 'SUPER_ADMIN',
    context: 'PLATFORM',
    auth: 'PLATFORM_ADMIN',
    title: 'Platform Security & Firewall',
    description: 'Threat detection, IP access policies, and authentication logs.',
  },
  {
    id: 'superadmin.audit',
    pattern: '/superadmin/audit',
    domain: 'SUPER_ADMIN',
    context: 'PLATFORM',
    auth: 'PLATFORM_ADMIN',
    title: 'Global Audit Trail & Compliance',
    description: 'Immutable regulatory audit log of platform operations.',
  },
  {
    id: 'superadmin.system_health',
    pattern: '/superadmin/system-health',
    domain: 'SUPER_ADMIN',
    context: 'PLATFORM',
    auth: 'PLATFORM_ADMIN',
    title: 'System Health & Telemetry',
    description: 'Database health, API latencies, and service status.',
  },
  {
    id: 'superadmin.settings',
    pattern: '/superadmin/settings',
    domain: 'SUPER_ADMIN',
    context: 'PLATFORM',
    auth: 'PLATFORM_ADMIN',
    title: 'Platform Configuration',
    description: 'Global feature flags, platform name, and branding.',
  },
];

export interface RouteParams {
  tenantId?: string;
  tenantSlug?: string;
  businessSlug?: string;
  businessId?: string;
  productId?: string;
  serviceId?: string;
  categorySlug?: string;
  orderId?: string;
  [key: string]: string | undefined;
}

export interface CanonicalRouteMatch {
  pathname: string;
  definition: CanonicalRouteDefinition;
  params: RouteParams;
  query: Record<string, string>;
  isExact: boolean;
}

/**
 * Parses any incoming URL or pathname against the Canonical Route Definitions.
 * Guaranteed to match exactly one canonical route definition.
 */
export function parseCanonicalRoute(rawUrlOrPath: string): CanonicalRouteMatch {
  let pathname = rawUrlOrPath || '/';
  let queryString = '';

  if (pathname.includes('?')) {
    const parts = pathname.split('?');
    pathname = parts[0];
    queryString = parts[1] || '';
  }

  // Normalize slashes
  pathname = pathname.replace(/\/+/g, '/');
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  // Parse query parameters
  const query: Record<string, string> = {};
  if (queryString) {
    const searchParams = new URLSearchParams(queryString);
    searchParams.forEach((value, key) => {
      query[key] = value;
    });
  }

  // Handle backwards-compatibility alias: /platform and /platform/* maps to /superadmin/*
  if (pathname === '/platform') {
    pathname = '/superadmin/dashboard';
  } else if (pathname.startsWith('/platform/')) {
    pathname = pathname.replace('/platform/', '/superadmin/');
  }

  // Handle legacy /app or /admin alias: maps to default tenant dashboard
  if (pathname === '/app' || pathname === '/admin') {
    pathname = '/tenant/nexus-retail/dashboard';
  } else if (pathname.startsWith('/admin/')) {
    pathname = pathname.replace('/admin/', '/tenant/nexus-retail/');
  }

  // Handle legacy /store shortcut: /store -> /store/nexus-retail
  if (pathname === '/store') {
    pathname = '/store/nexus-retail';
  }

  // Iterate over definitions sorted by specificity (exact path > dynamic segments)
  // Higher specificity first
  const sortedDefinitions = [...CANONICAL_ROUTE_DEFINITIONS].sort((a, b) => {
    const aSegments = a.pattern.split('/').filter(Boolean);
    const bSegments = b.pattern.split('/').filter(Boolean);
    const aDynamic = a.pattern.includes(':');
    const bDynamic = b.pattern.includes(':');

    if (aSegments.length !== bSegments.length) {
      return bSegments.length - aSegments.length;
    }
    if (aDynamic !== bDynamic) {
      return aDynamic ? 1 : -1; // non-dynamic first
    }
    return b.pattern.length - a.pattern.length;
  });

  for (const def of sortedDefinitions) {
    const match = matchPattern(def.pattern, pathname);
    if (match) {
      return {
        pathname,
        definition: def,
        params: match.params,
        query,
        isExact: true,
      };
    }
  }

  // Fallback if no specific route matched:
  // Categorize based on top-level prefix to preserve domain ownership!
  if (pathname.startsWith('/superadmin')) {
    return {
      pathname,
      definition: {
        id: 'superadmin.generic',
        pattern: '/superadmin/*',
        domain: 'SUPER_ADMIN',
        context: 'PLATFORM',
        auth: 'PLATFORM_ADMIN',
        title: 'Platform Control Plane',
        description: 'Super Admin operational surface.',
      },
      params: {},
      query,
      isExact: false,
    };
  }

  if (pathname.startsWith('/tenant/')) {
    const parts = pathname.split('/').filter(Boolean);
    const tenantId = parts[1];
    return {
      pathname,
      definition: {
        id: 'tenant.generic',
        pattern: '/tenant/:tenantId/*',
        domain: 'TENANT_OPERATIONS',
        context: 'TENANT',
        auth: 'TENANT_STAFF',
        title: 'Tenant Workspace',
        description: 'Tenant business operations.',
      },
      params: { tenantId },
      query,
      isExact: false,
    };
  }

  if (pathname.startsWith('/store/')) {
    const parts = pathname.split('/').filter(Boolean);
    const tenantSlug = parts[1];
    return {
      pathname,
      definition: {
        id: 'storefront.generic',
        pattern: '/store/:tenantSlug/*',
        domain: 'STOREFRONT',
        context: 'TENANT',
        auth: 'NONE',
        title: 'Storefront',
        description: 'Public tenant commerce storefront.',
      },
      params: { tenantSlug },
      query,
      isExact: false,
    };
  }

  if (pathname.startsWith('/account')) {
    return {
      pathname,
      definition: {
        id: 'customer.account.generic',
        pattern: '/account/*',
        domain: 'CUSTOMER_ACCOUNT',
        context: 'CUSTOMER',
        auth: 'CUSTOMER',
        title: 'Customer Account',
        description: 'Customer account area.',
      },
      params: {},
      query,
      isExact: false,
    };
  }

  if (pathname.startsWith('/business/')) {
    const parts = pathname.split('/').filter(Boolean);
    const businessId = parts[1];
    return {
      pathname,
      definition: {
        id: 'business.generic',
        pattern: '/business/:businessId/*',
        domain: 'BUSINESS',
        context: 'BUSINESS',
        auth: 'BUSINESS_OWNER',
        title: 'Business Management',
        description: 'Business onboarding and listing management.',
      },
      params: { businessId },
      query,
      isExact: false,
    };
  }

  // Default fallback: Public Discovery
  return {
    pathname,
    definition: CANONICAL_ROUTE_DEFINITIONS[0], // public.home
    params: {},
    query,
    isExact: false,
  };
}

function matchPattern(pattern: string, pathname: string): { params: RouteParams } | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params: RouteParams = {};

  for (let i = 0; i < patternParts.length; i++) {
    const pPart = patternParts[i];
    const uPart = pathParts[i];

    if (pPart.startsWith(':')) {
      const paramName = pPart.slice(1);
      params[paramName] = decodeURIComponent(uPart);
    } else if (pPart !== uPart) {
      return null;
    }
  }

  return { params };
}

/**
 * Builds canonical path with parameters
 */
export function buildCanonicalPath(pattern: string, params: RouteParams = {}): string {
  let path = pattern;
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      path = path.replace(`:${key}`, encodeURIComponent(value));
    }
  }
  return path;
}
