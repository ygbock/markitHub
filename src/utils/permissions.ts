import { PermissionKey, PermissionDefinition, PermissionCategory, StaffRole, RoleConfig, StaffMember } from '../types';

export const PERMISSION_CATEGORIES: { id: PermissionCategory; label: string; icon: string; description: string }[] = [
  { id: 'inventory', label: 'Inventory & Catalog', icon: 'Package', description: 'Stock levels, catalog modifications, adjustments, and warehouse transfers' },
  { id: 'sales', label: 'Sales & POS Terminal', icon: 'Smartphone', description: 'Cashier checkout, discounts, refunds, held tabs, and shift reconciliation' },
  { id: 'purchase', label: 'Purchasing & Procurement', icon: 'Truck', description: 'Purchase orders, supplier contracts, dock receiving, and PO authorizations' },
  { id: 'finance', label: 'Finance & Invoicing', icon: 'Receipt', description: 'Tax invoices, ledger reports, revenue analytics, and financial exports' },
  { id: 'crm', label: 'CRM & Customer Relations', icon: 'Users', description: 'Customer profiles, loyalty rewards, marketing campaigns, and support tickets' },
  { id: 'ecommerce', label: 'E-commerce & Storefront', icon: 'ShoppingBag', description: 'Online storefront catalog, digital promotions, and parcel fulfillments' },
  { id: 'users', label: 'Users & Staff Control', icon: 'ShieldCheck', description: 'Employee directory, role assignment, permission overrides, and security audit' },
  { id: 'system', label: 'System & Configuration', icon: 'Settings', description: 'Store currency, tax rates, sensor diagnostics, and database sync' },
];

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // 1. Inventory Permissions
  {
    key: 'inventory.view',
    label: 'View Inventory & Stock',
    category: 'inventory',
    description: 'Inspect live stock counts, SKU directory, reorder thresholds, and warehouse locations.'
  },
  {
    key: 'inventory.create',
    label: 'Create Products & SKUs',
    category: 'inventory',
    description: 'Provision new product listings, categories, barcodes, and variant matrixes.'
  },
  {
    key: 'inventory.edit',
    label: 'Edit Product Specifications',
    category: 'inventory',
    description: 'Modify prices, cost margins, barcodes, supplier codes, and product media.'
  },
  {
    key: 'inventory.adjust',
    label: 'Adjust Stock & Write-offs',
    category: 'inventory',
    description: 'Execute manual stock count adjustments, shrinkage write-offs, and cycle counts.',
    isDestructive: true
  },
  {
    key: 'inventory.transfer',
    label: 'Transfer Stock Locations',
    category: 'inventory',
    description: 'Initiate and complete stock movements between Warehouse, Store Shelf, and Fulfillment Hubs.'
  },
  {
    key: 'inventory.reorder',
    label: 'Trigger Quick Reorders',
    category: 'inventory',
    description: 'Replenish stock levels and issue automated restock batches to suppliers.'
  },
  {
    key: 'inventory.delete',
    label: 'Delete Catalog Items',
    category: 'inventory',
    description: 'Permanently remove or archive products and SKU records from the central ledger.',
    isDestructive: true
  },

  // 2. Sales & POS Permissions
  {
    key: 'sales.view',
    label: 'View Sales History',
    category: 'sales',
    description: 'Browse complete sales ledger, receipts, past transactions, and shift records.'
  },
  {
    key: 'sales.create',
    label: 'Ring Up POS Sales',
    category: 'sales',
    description: 'Scan barcodes, add items to customer carts, and collect cash/card/wallet payments.'
  },
  {
    key: 'sales.discount',
    label: 'Apply Custom Discounts',
    category: 'sales',
    description: 'Apply percentage or fixed promotional coupons, manual price overrides, and loyalty point redemptions.'
  },
  {
    key: 'sales.refund',
    label: 'Authorize Sales Refunds & Voids',
    category: 'sales',
    description: 'Process returns, issue store credits/cash refunds, and void completed register transactions.',
    isDestructive: true
  },
  {
    key: 'sales.hold',
    label: 'Park & Suspend Orders',
    category: 'sales',
    description: 'Hold active customer shopping carts on tab and retrieve parked orders for checkout.'
  },
  {
    key: 'sales.shift',
    label: 'Shift Management & Cash Drawer',
    category: 'sales',
    description: 'Open, close, print Z-reports, and perform cash drawer float reconciliation.'
  },

  // 3. Purchasing Permissions
  {
    key: 'purchase.view',
    label: 'View Purchase Orders',
    category: 'purchase',
    description: 'Inspect supplier purchase orders, outstanding backorders, and inbound shipping notices.'
  },
  {
    key: 'purchase.create',
    label: 'Draft Purchase Orders',
    category: 'purchase',
    description: 'Generate procurement purchase orders and supplier replenishment drafts.'
  },
  {
    key: 'purchase.approve',
    label: 'Approve Purchase Orders',
    category: 'purchase',
    description: 'Authorize high-value supplier POs, contractual invoices, and vendor payouts.',
    isDestructive: true
  },
  {
    key: 'purchase.receive',
    label: 'Receive Inbound Shipments',
    category: 'purchase',
    description: 'Check in dock freight, inspect damaged cargo, and accept deliveries into inventory.'
  },

  // 4. Finance & Invoicing Permissions
  {
    key: 'finance.view',
    label: 'View Financial Dashboards',
    category: 'finance',
    description: 'View gross margin graphs, daily sales velocity, profit & loss metrics, and valuation.'
  },
  {
    key: 'finance.invoices',
    label: 'Manage & Issue Invoices',
    category: 'finance',
    description: 'Generate formal commercial tax invoices, billing notes, and payment terms.'
  },
  {
    key: 'finance.reports',
    label: 'Generate Audit Reports',
    category: 'finance',
    description: 'Access detailed tax liability summaries, COGS valuation, and reconciliation sheets.'
  },
  {
    key: 'finance.export',
    label: 'Export Financial Ledgers',
    category: 'finance',
    description: 'Export transaction sheets, ledger CSVs, and quarterly tax statements.'
  },

  // 5. CRM & Customers Permissions
  {
    key: 'crm.view',
    label: 'View Customer Directory',
    category: 'crm',
    description: 'Look up customer contact records, purchase histories, and segment tags.'
  },
  {
    key: 'crm.manage',
    label: 'Manage Customer Profiles',
    category: 'crm',
    description: 'Register new customers, edit profile details, addresses, and customer segments.'
  },
  {
    key: 'crm.loyalty',
    label: 'Manage Loyalty Points',
    category: 'crm',
    description: 'Manually grant, deduct, or adjust customer reward points and loyalty tiers.'
  },
  {
    key: 'crm.marketing',
    label: 'Dispatch Marketing Campaigns',
    category: 'crm',
    description: 'Send multi-channel Email, SMS, and Push notifications to customer segments.'
  },
  {
    key: 'crm.support',
    label: 'Manage Support Tickets',
    category: 'crm',
    description: 'Assign, reply to, and resolve customer support tickets and dispute claims.'
  },

  // 6. E-commerce Permissions
  {
    key: 'ecommerce.view',
    label: 'View Online Orders',
    category: 'ecommerce',
    description: 'Monitor web storefront checkouts, customer shopping carts, and abandoned orders.'
  },
  {
    key: 'ecommerce.manage',
    label: 'Manage Storefront Content',
    category: 'ecommerce',
    description: 'Configure online featured collections, banner promotions, and storefront settings.'
  },
  {
    key: 'ecommerce.fulfillment',
    label: 'Process & Fulfill Orders',
    category: 'ecommerce',
    description: 'Pack parcels, generate courier shipping labels, and assign tracking IDs.'
  },

  // 7. Users & Staff Permissions
  {
    key: 'users.view',
    label: 'View Employee Directory',
    category: 'users',
    description: 'Inspect employee rosters, assigned roles, contact details, and department listings.'
  },
  {
    key: 'users.manage',
    label: 'Manage Users & Staff',
    category: 'users',
    description: 'Add new staff members, edit account details, update PINs, and suspend accounts.',
    isDestructive: true
  },
  {
    key: 'users.roles',
    label: 'Configure Roles & Permissions',
    category: 'users',
    description: 'Customize granular permission matrices and assign role override privileges.',
    isDestructive: true
  },
  {
    key: 'users.audit',
    label: 'Inspect Security Audit Trails',
    category: 'users',
    description: 'Access immutable system telemetry, operator login records, and security logs.'
  },
  {
    key: 'users.unlock',
    label: 'Emergency PIN & Terminal Override',
    category: 'users',
    description: 'Perform supervisor emergency terminal unlocks and reset locked operator registers.'
  },

  // 8. System & Settings Permissions
  {
    key: 'system.settings',
    label: 'Configure System Settings',
    category: 'system',
    description: 'Change store currency, default sales tax rates, and hardware scanner parameters.'
  },
  {
    key: 'system.sync',
    label: 'Database Sync & Seed',
    category: 'system',
    description: 'Perform manual cloud database sync, cache resets, and database diagnostics.'
  }
];

// All permission keys as a convenience list
export const ALL_PERMISSION_KEYS: PermissionKey[] = ALL_PERMISSIONS.map(p => p.key);

// Default Granular Permission Mappings for the 10 Required Roles
export const DEFAULT_ROLE_PERMISSIONS: Record<StaffRole, PermissionKey[]> = {
  // 1. Super Admin: Unlimited complete access to everything
  'Super Admin': [...ALL_PERMISSION_KEYS],

  // 2. Business Owner: Full executive oversight, approvals, finance, users, strategy
  'Business Owner': [
    'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete', 'inventory.adjust', 'inventory.transfer', 'inventory.reorder',
    'sales.view', 'sales.create', 'sales.discount', 'sales.refund', 'sales.hold', 'sales.shift',
    'purchase.view', 'purchase.create', 'purchase.approve', 'purchase.receive',
    'finance.view', 'finance.invoices', 'finance.reports', 'finance.export',
    'crm.view', 'crm.manage', 'crm.loyalty', 'crm.marketing', 'crm.support',
    'ecommerce.view', 'ecommerce.manage', 'ecommerce.fulfillment',
    'users.view', 'users.manage', 'users.roles', 'users.audit', 'users.unlock',
    'system.settings', 'system.sync'
  ],

  // 3. Inventory Manager: Master of stock catalog, adjustments, transfers, reorders, PO creation & receiving
  'Inventory Manager': [
    'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.adjust', 'inventory.transfer', 'inventory.reorder', 'inventory.delete',
    'purchase.view', 'purchase.create', 'purchase.receive',
    'finance.view',
    'ecommerce.view',
    'users.view'
  ],

  // 4. Warehouse Manager: Inbound dock handling, stock transfers, inventory adjustments, parcel fulfillment
  'Warehouse Manager': [
    'inventory.view', 'inventory.adjust', 'inventory.transfer', 'inventory.reorder',
    'purchase.view', 'purchase.receive',
    'ecommerce.fulfillment'
  ],

  // 5. Cashier: Fast POS checkout, cart hold, basic customer search, shift close (NO refunds or adjustments)
  'Cashier': [
    'sales.create', 'sales.hold', 'sales.shift',
    'crm.view', 'crm.loyalty'
  ],

  // 6. Sales Manager: POS supervision, discounts, refund authorizations, customer directory, marketing campaigns
  'Sales Manager': [
    'sales.view', 'sales.create', 'sales.discount', 'sales.refund', 'sales.hold', 'sales.shift',
    'crm.view', 'crm.manage', 'crm.loyalty', 'crm.marketing', 'crm.support',
    'finance.view', 'finance.invoices',
    'inventory.view',
    'users.view'
  ],

  // 7. Purchasing Officer: Supplier PO drafting, approval workflows, dock receiving, stock level telemetry
  'Purchasing Officer': [
    'purchase.view', 'purchase.create', 'purchase.approve', 'purchase.receive',
    'inventory.view', 'inventory.reorder',
    'finance.view'
  ],

  // 8. Accountant: Financial reporting, tax invoices, ledger exports, P&L audit trails, sales verification
  'Accountant': [
    'finance.view', 'finance.invoices', 'finance.reports', 'finance.export',
    'sales.view',
    'purchase.view',
    'users.audit',
    'system.settings'
  ],

  // 9. Store Manager: In-store operations, sales, refunds, stock transfers, staff oversight, CRM
  'Store Manager': [
    'sales.view', 'sales.create', 'sales.discount', 'sales.refund', 'sales.hold', 'sales.shift',
    'inventory.view', 'inventory.edit', 'inventory.adjust', 'inventory.transfer', 'inventory.reorder',
    'crm.view', 'crm.manage', 'crm.loyalty', 'crm.support',
    'purchase.view', 'purchase.create', 'purchase.receive',
    'finance.view', 'finance.invoices',
    'users.view', 'users.unlock'
  ],

  // 10. E-commerce Manager: Web storefront catalog, online promotions, parcel fulfillments, CRM campaigns
  'E-commerce Manager': [
    'ecommerce.view', 'ecommerce.manage', 'ecommerce.fulfillment',
    'inventory.view', 'inventory.edit',
    'crm.view', 'crm.manage', 'crm.marketing', 'crm.support',
    'sales.view',
    'finance.view'
  ],

  // Backward compatibility mappings
  'Admin': [...ALL_PERMISSION_KEYS],
  'Manager': [
    'sales.view', 'sales.create', 'sales.discount', 'sales.refund', 'sales.hold', 'sales.shift',
    'inventory.view', 'inventory.edit', 'inventory.adjust', 'inventory.transfer', 'inventory.reorder',
    'crm.view', 'crm.manage', 'crm.loyalty',
    'purchase.view', 'purchase.create',
    'finance.view', 'finance.invoices',
    'users.view'
  ],
  'Warehouse Staff': [
    'inventory.view', 'inventory.adjust', 'inventory.transfer', 'inventory.reorder',
    'purchase.receive', 'ecommerce.fulfillment'
  ],
  'Viewer': [
    'inventory.view', 'sales.view', 'finance.view', 'crm.view', 'ecommerce.view'
  ]
};

// 10 Official Role Configurations with Badges, Colors, and Metadata
export const ROLE_CONFIGS: Record<StaffRole, RoleConfig> = {
  'Super Admin': {
    role: 'Super Admin',
    title: 'Super Administrator',
    description: 'Unrestricted master control over all subsystems, security policies, and permissions.',
    color: 'indigo',
    badgeBg: 'bg-purple-500/10',
    badgeBorder: 'border-purple-500/30',
    badgeText: 'text-purple-600 dark:text-purple-300',
    defaultPermissions: DEFAULT_ROLE_PERMISSIONS['Super Admin']
  },
  'Business Owner': {
    role: 'Business Owner',
    title: 'Business Owner / Executive',
    description: 'Full business management, financial visibility, vendor contract approvals, and personnel.',
    color: 'indigo',
    badgeBg: 'bg-indigo-500/10',
    badgeBorder: 'border-indigo-500/30',
    badgeText: 'text-indigo-600 dark:text-indigo-300',
    defaultPermissions: DEFAULT_ROLE_PERMISSIONS['Business Owner']
  },
  'Inventory Manager': {
    role: 'Inventory Manager',
    title: 'Inventory & Catalog Manager',
    description: 'Oversees product specifications, catalog updates, multi-location stock movements, and shrinkage.',
    color: 'emerald',
    badgeBg: 'bg-emerald-500/10',
    badgeBorder: 'border-emerald-500/30',
    badgeText: 'text-emerald-600 dark:text-emerald-300',
    defaultPermissions: DEFAULT_ROLE_PERMISSIONS['Inventory Manager']
  },
  'Warehouse Manager': {
    role: 'Warehouse Manager',
    title: 'Warehouse & Logistics Manager',
    description: 'Supervises physical freight receiving, storage bay allocations, and logistics transfers.',
    color: 'amber',
    badgeBg: 'bg-amber-500/10',
    badgeBorder: 'border-amber-500/30',
    badgeText: 'text-amber-600 dark:text-amber-300',
    defaultPermissions: DEFAULT_ROLE_PERMISSIONS['Warehouse Manager']
  },
  'Cashier': {
    role: 'Cashier',
    title: 'POS Register Cashier',
    description: 'Operates front-of-house checkout, cash drawer tenders, and customer loyalty lookups.',
    color: 'sky',
    badgeBg: 'bg-sky-500/10',
    badgeBorder: 'border-sky-500/30',
    badgeText: 'text-sky-600 dark:text-sky-300',
    defaultPermissions: DEFAULT_ROLE_PERMISSIONS['Cashier']
  },
  'Sales Manager': {
    role: 'Sales Manager',
    title: 'Sales & Floor Manager',
    description: 'Manages sales floor personnel, authorizes returns/refunds, and executes customer outreach.',
    color: 'teal',
    badgeBg: 'bg-teal-500/10',
    badgeBorder: 'border-teal-500/30',
    badgeText: 'text-teal-600 dark:text-teal-300',
    defaultPermissions: DEFAULT_ROLE_PERMISSIONS['Sales Manager']
  },
  'Purchasing Officer': {
    role: 'Purchasing Officer',
    title: 'Purchasing & Procurement Officer',
    description: 'Manages vendor relations, negotiates cost pricing, and issues purchase orders.',
    color: 'orange',
    badgeBg: 'bg-orange-500/10',
    badgeBorder: 'border-orange-500/30',
    badgeText: 'text-orange-600 dark:text-orange-300',
    defaultPermissions: DEFAULT_ROLE_PERMISSIONS['Purchasing Officer']
  },
  'Accountant': {
    role: 'Accountant',
    title: 'Certified Accountant / Comptroller',
    description: 'Manages tax invoices, compliance reconciliations, financial ledgers, and P&L audit reports.',
    color: 'blue',
    badgeBg: 'bg-blue-500/10',
    badgeBorder: 'border-blue-500/30',
    badgeText: 'text-blue-600 dark:text-blue-300',
    defaultPermissions: DEFAULT_ROLE_PERMISSIONS['Accountant']
  },
  'Store Manager': {
    role: 'Store Manager',
    title: 'Retail Store Manager',
    description: 'Full on-site retail operational authority across POS, staff shifts, inventory, and refunds.',
    color: 'rose',
    badgeBg: 'bg-rose-500/10',
    badgeBorder: 'border-rose-500/30',
    badgeText: 'text-rose-600 dark:text-rose-300',
    defaultPermissions: DEFAULT_ROLE_PERMISSIONS['Store Manager']
  },
  'E-commerce Manager': {
    role: 'E-commerce Manager',
    title: 'E-commerce & Digital Storefront Manager',
    description: 'Controls online storefront merchandising, digital campaigns, and web order fulfillment.',
    color: 'violet',
    badgeBg: 'bg-violet-500/10',
    badgeBorder: 'border-violet-500/30',
    badgeText: 'text-violet-600 dark:text-violet-300',
    defaultPermissions: DEFAULT_ROLE_PERMISSIONS['E-commerce Manager']
  },
  // Backward compatibility
  'Admin': {
    role: 'Admin',
    title: 'Administrator',
    description: 'Full administrative access.',
    color: 'purple',
    badgeBg: 'bg-purple-500/10',
    badgeBorder: 'border-purple-500/30',
    badgeText: 'text-purple-600',
    defaultPermissions: DEFAULT_ROLE_PERMISSIONS['Admin']
  },
  'Manager': {
    role: 'Manager',
    title: 'Manager',
    description: 'Store operations manager.',
    color: 'teal',
    badgeBg: 'bg-teal-500/10',
    badgeBorder: 'border-teal-500/30',
    badgeText: 'text-teal-600',
    defaultPermissions: DEFAULT_ROLE_PERMISSIONS['Manager']
  },
  'Warehouse Staff': {
    role: 'Warehouse Staff',
    title: 'Warehouse Specialist',
    description: 'Warehouse operations.',
    color: 'amber',
    badgeBg: 'bg-amber-500/10',
    badgeBorder: 'border-amber-500/30',
    badgeText: 'text-amber-600',
    defaultPermissions: DEFAULT_ROLE_PERMISSIONS['Warehouse Staff']
  },
  'Viewer': {
    role: 'Viewer',
    title: 'Read-only Analyst',
    description: 'Read-only telemetry access.',
    color: 'slate',
    badgeBg: 'bg-slate-500/10',
    badgeBorder: 'border-slate-500/30',
    badgeText: 'text-slate-600',
    defaultPermissions: DEFAULT_ROLE_PERMISSIONS['Viewer']
  }
};

/**
 * Returns effective granular permissions for a given staff member,
 * accounting for their assigned role defaults and any customized permissionsOverride.
 */
export function getEffectivePermissions(staff: StaffMember | null | undefined): PermissionKey[] {
  if (!staff) return [];
  
  // If staff has specific manual permission overrides, return those
  if (Array.isArray(staff.permissionsOverride) && staff.permissionsOverride.length > 0) {
    return staff.permissionsOverride;
  }
  
  // Otherwise return role default permissions
  const role = staff.role || 'Cashier';
  return DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS['Cashier'] || [];
}

/**
 * Checks if the given staff member has a specific permission or set of permissions.
 * If multiple permissions are passed, returns true if the staff has ANY of them (or ALL if requireAll=true).
 */
export function hasPermission(
  staff: StaffMember | null | undefined, 
  permission: PermissionKey | PermissionKey[],
  requireAll: boolean = false
): boolean {
  if (!staff) return false;
  if (staff.status === 'Inactive') return false;

  const effective = getEffectivePermissions(staff);

  // Super Admin has wildcard access to all permissions
  if (staff.role === 'Super Admin' || staff.role === 'Admin') {
    return true;
  }

  if (Array.isArray(permission)) {
    if (permission.length === 0) return true;
    if (requireAll) {
      return permission.every(p => effective.includes(p));
    }
    return permission.some(p => effective.includes(p));
  }

  return effective.includes(permission);
}

/**
 * Get role configuration metadata for styling and badges.
 */
export function getRoleConfig(role: StaffRole): RoleConfig {
  return ROLE_CONFIGS[role] || ROLE_CONFIGS['Cashier'];
}

export const OFFICIAL_ROLES: StaffRole[] = [
  'Super Admin',
  'Business Owner',
  'Inventory Manager',
  'Warehouse Manager',
  'Cashier',
  'Sales Manager',
  'Purchasing Officer',
  'Accountant',
  'Store Manager',
  'E-commerce Manager'
];
