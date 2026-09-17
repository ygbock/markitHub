import {
  Compass,
  Search,
  MapPin,
  Tag,
  ShoppingBag,
  Calendar,
  Heart,
  MapPinned,
  MessageSquare,
  User,
  Building2,
  ListPlus,
  BarChart3,
  Rocket,
  LayoutDashboard,
  CreditCard,
  Layers,
  Package,
  FileText,
  Users,
  Award,
  Settings,
  ShieldAlert,
  ShieldCheck,
  FileCheck,
  Sliders,
  DollarSign,
  History,
  Activity,
  KeyRound,
  Database,
  Bell,
  RefreshCw,
} from 'lucide-react';
import { NavigationGroup, NavigationItem } from './navigationTypes';

/**
 * Public discovery navigation registry
 */
export const publicNavigation: NavigationItem[] = [
  {
    id: 'public-explore',
    label: 'Explore Businesses',
    path: '/discover',
    icon: Compass,
  },
  {
    id: 'public-search',
    label: 'Search & Filter',
    path: '/search',
    icon: Search,
  },
  {
    id: 'public-nearby',
    label: 'Businesses Near Me',
    path: '/nearby',
    icon: MapPin,
  },
  {
    id: 'public-categories',
    label: 'Categories',
    path: '/categories',
    icon: Tag,
  },
];

/**
 * Customer personal account navigation registry
 */
export const customerNavigation: NavigationItem[] = [
  {
    id: 'customer-orders',
    label: 'My Orders',
    path: '/account/orders',
    icon: ShoppingBag,
  },
  {
    id: 'customer-bookings',
    label: 'Bookings & Appointments',
    path: '/account/bookings',
    icon: Calendar,
  },
  {
    id: 'customer-wishlist',
    label: 'Wishlist & Saved',
    path: '/account/wishlist',
    icon: Heart,
  },
  {
    id: 'customer-addresses',
    label: 'Saved Addresses',
    path: '/account/addresses',
    icon: MapPinned,
  },
  {
    id: 'customer-messages',
    label: 'Messages',
    path: '/account/messages',
    icon: MessageSquare,
  },
  {
    id: 'customer-settings',
    label: 'Profile & Security',
    path: '/account/settings',
    icon: User,
  },
];

/**
 * Generates canonical business-scoped navigation items for the active business.
 * Scopes all business management links to the active business identifier.
 */
export function getBusinessNavigation(businessId: string = ':businessId'): NavigationItem[] {
  const cleanId = encodeURIComponent(businessId.trim());
  return [
    {
      id: 'business-profile',
      label: 'Public Profile & Branding',
      path: `/business/${cleanId}/profile`,
      icon: Building2,
    },
    {
      id: 'business-locations',
      label: 'Locations & Branches',
      path: `/business/${cleanId}/locations`,
      icon: MapPin,
    },
    {
      id: 'business-services',
      label: 'Services & Catalog',
      path: `/business/${cleanId}/services`,
      icon: ListPlus,
    },
    {
      id: 'business-analytics',
      label: 'Discovery Analytics',
      path: `/business/${cleanId}/analytics`,
      icon: BarChart3,
    },
    {
      id: 'business-upgrade',
      label: 'Upgrade to MikitHub Tenant',
      path: `/business/${cleanId}/upgrade`,
      icon: Rocket,
    },
  ];
}

/**
 * Business listing-only management navigation registry
 */
export const businessNavigation: NavigationItem[] = getBusinessNavigation(':businessId');

/**
 * Generates canonical tenant-scoped navigation groups for the active tenant.
 * Requires an active tenant ID and ensures every operational destination is scoped to that tenant.
 * Uses only canonical TenantCapability identifiers.
 */
export function getTenantNavigation(tenantId: string = ':tenantId'): NavigationGroup[] {
  const cleanId = encodeURIComponent(tenantId.trim());
  return [
    {
      id: 'group-operations',
      title: 'Operations',
      items: [
        {
          id: 'tenant-dashboard',
          label: 'Dashboard',
          path: `/tenant/${cleanId}/dashboard`,
          icon: LayoutDashboard,
        },
        {
          id: 'tenant-pos',
          label: 'Point of Sale (POS)',
          path: `/tenant/${cleanId}/pos`,
          icon: CreditCard,
          capability: 'pos',
          permission: 'sales.create',
        },
        {
          id: 'tenant-catalog',
          label: 'Catalog & Products',
          path: `/tenant/${cleanId}/products`,
          icon: Layers,
          capability: 'products',
          permission: 'inventory.view',
        },
        {
          id: 'tenant-inventory',
          label: 'Inventory & Stock',
          path: `/tenant/${cleanId}/inventory`,
          icon: Package,
          capability: 'inventory',
          permission: 'inventory.view',
        },
        {
          id: 'tenant-orders',
          label: 'Orders & Receipts',
          path: `/tenant/${cleanId}/orders`,
          icon: FileText,
          capability: 'orders',
          permission: 'sales.view',
        },
      ],
    },
    {
      id: 'group-relationships',
      title: 'Customer & Services',
      items: [
        {
          id: 'tenant-customers',
          label: 'Customers & CRM',
          path: `/tenant/${cleanId}/customers`,
          icon: Users,
          capability: 'customers',
          permission: 'crm.view',
        },
        {
          id: 'tenant-bookings',
          label: 'Bookings & Schedule',
          path: `/tenant/${cleanId}/bookings`,
          icon: Calendar,
          capability: 'bookings',
        },
        {
          id: 'tenant-reviews',
          label: 'Customer Reviews',
          path: `/tenant/${cleanId}/reviews`,
          icon: Award,
          capability: 'customers',
        },
      ],
    },
    {
      id: 'group-insights',
      title: 'Growth & Insights',
      items: [
        {
          id: 'tenant-reports',
          label: 'Reports & Analytics',
          path: `/tenant/${cleanId}/reports`,
          icon: BarChart3,
          capability: 'reports',
          permission: 'finance.reports',
        },
        {
          id: 'tenant-loyalty',
          label: 'Loyalty & Promotions',
          path: `/tenant/${cleanId}/marketing`,
          icon: Tag,
          capability: 'marketing',
        },
      ],
    },
    {
      id: 'group-admin',
      title: 'Management',
      items: [
        {
          id: 'tenant-staff',
          label: 'Staff & Roles',
          path: `/tenant/${cleanId}/staff`,
          icon: Users,
          permission: 'users.manage',
        },
        {
          id: 'tenant-settings',
          label: 'Tenant Settings',
          path: `/tenant/${cleanId}/settings`,
          icon: Settings,
          capability: 'settings',
          permission: 'system.settings',
        },
      ],
    },
  ];
}

/**
 * Tenant operational sidebar navigation groups (default template with :tenantId placeholder)
 */
export const tenantNavigation: NavigationGroup[] = getTenantNavigation(':tenantId');

/**
 * Super Admin platform governance navigation groups (5 authoritative groups)
 */
export const superAdminNavigation: NavigationGroup[] = [
  {
    id: 'sa-platform',
    title: 'Platform',
    items: [
      {
        id: 'sa-tenants',
        label: 'Tenants & Workspaces',
        path: '/superadmin/tenants',
        icon: Building2,
      },
      {
        id: 'sa-businesses',
        label: 'Businesses & Listings',
        path: '/superadmin/businesses',
        icon: Layers,
      },
      {
        id: 'sa-metrics',
        label: 'Platform Health & Metrics',
        path: '/superadmin/metrics',
        icon: BarChart3,
      },
    ],
  },
  {
    id: 'sa-trust',
    title: 'People & Trust',
    items: [
      {
        id: 'sa-admins',
        label: 'Super Admins & Staff',
        path: '/superadmin/admins',
        icon: Users,
      },
      {
        id: 'sa-moderation',
        label: 'Content Moderation',
        path: '/superadmin/moderation',
        icon: ShieldAlert,
      },
      {
        id: 'sa-verifications',
        label: 'Identity Verifications',
        path: '/superadmin/verifications',
        icon: FileCheck,
      },
    ],
  },
  {
    id: 'sa-commerce',
    title: 'Commerce',
    items: [
      {
        id: 'sa-categories',
        label: 'Marketplace Categories',
        path: '/superadmin/categories',
        icon: Sliders,
      },
      {
        id: 'sa-plans',
        label: 'Plans & Pricing',
        path: '/superadmin/plans',
        icon: Tag,
      },
      {
        id: 'sa-billing',
        label: 'Global Billing Ledger',
        path: '/superadmin/billing',
        icon: DollarSign,
      },
    ],
  },
  {
    id: 'sa-security',
    title: 'Security & Governance',
    items: [
      {
        id: 'sa-audit',
        label: 'Audit Trails',
        path: '/superadmin/audit',
        icon: History,
      },
      {
        id: 'sa-system-logs',
        label: 'System Event Logs',
        path: '/superadmin/system-logs',
        icon: Activity,
      },
      {
        id: 'sa-policies',
        label: 'Access Policies & Security',
        path: '/superadmin/policies',
        icon: KeyRound,
      },
    ],
  },
  {
    id: 'sa-operations',
    title: 'Operations',
    items: [
      {
        id: 'sa-backups',
        label: 'Database Backups',
        path: '/superadmin/backups',
        icon: Database,
      },
      {
        id: 'sa-notifications',
        label: 'Notification Dispatches',
        path: '/superadmin/notifications',
        icon: Bell,
      },
      {
        id: 'sa-cache',
        label: 'Cache & Indexing',
        path: '/superadmin/cache',
        icon: RefreshCw,
      },
    ],
  },
];
