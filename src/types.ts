export type StaffRole = 
  | 'Super Admin'
  | 'Business Owner'
  | 'Inventory Manager'
  | 'Warehouse Manager'
  | 'Cashier'
  | 'Sales Manager'
  | 'Purchasing Officer'
  | 'Accountant'
  | 'Store Manager'
  | 'E-commerce Manager'
  | 'Admin'
  | 'Manager'
  | 'Warehouse Staff'
  | 'Viewer';

export type PermissionCategory = 
  | 'inventory'
  | 'sales'
  | 'purchase'
  | 'finance'
  | 'crm'
  | 'ecommerce'
  | 'users'
  | 'system';

export type PermissionKey =
  // Inventory
  | 'inventory.view'
  | 'inventory.create'
  | 'inventory.edit'
  | 'inventory.delete'
  | 'inventory.adjust'
  | 'inventory.transfer'
  | 'inventory.reorder'
  | 'inventory.import'
  | 'inventory.export'
  | 'inventory.manage_categories'
  // Sales & POS
  | 'sales.view'
  | 'sales.create'
  | 'sales.discount'
  | 'sales.refund'
  | 'sales.hold'
  | 'sales.shift'
  // Purchasing
  | 'purchase.view'
  | 'purchase.create'
  | 'purchase.approve'
  | 'purchase.receive'
  // Finance & Invoicing
  | 'finance.view'
  | 'finance.invoices'
  | 'finance.export'
  | 'finance.reports'
  // CRM & Customers
  | 'crm.view'
  | 'crm.manage'
  | 'crm.loyalty'
  | 'crm.marketing'
  | 'crm.support'
  // E-commerce
  | 'ecommerce.view'
  | 'ecommerce.manage'
  | 'ecommerce.fulfillment'
  // Users & Staff
  | 'users.view'
  | 'users.manage'
  | 'users.roles'
  | 'users.audit'
  | 'users.unlock'
  // System & Settings
  | 'system.settings'
  | 'system.sync';

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  category: PermissionCategory;
  description: string;
  isDestructive?: boolean;
}

export interface RoleConfig {
  role: StaffRole;
  title: string;
  description: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  defaultPermissions: PermissionKey[];
}

export interface BarcodeEntry {
  type: 'EAN' | 'UPC' | 'CODE128' | 'CODE39' | 'QR' | 'CUSTOM' | string;
  code: string;
  isPrimary?: boolean;
}

export type CostCalculationMethod = 'SIMPLE' | 'WEIGHTED_AVERAGE' | 'FIFO';

export type SerialUnitStatus = 'Received' | 'In Stock' | 'Sold' | 'Returned' | 'Repaired' | 'Resold';

export interface SerialNumberLifecycleEvent {
  id: string;
  status: SerialUnitStatus;
  timestamp: string;
  notes?: string;
  actor?: string;
  invoiceRef?: string;
  customerName?: string;
}

export interface SerialNumberUnit {
  id: string;
  serialNumber: string;
  productId: string;
  variantSku?: string;
  status: SerialUnitStatus;
  receivedDate: string;
  soldDate?: string;
  warrantyExpiryDate?: string;
  customerName?: string;
  invoiceRef?: string;
  history: SerialNumberLifecycleEvent[];
  notes?: string;
}

export interface BatchSaleRecord {
  id: string;
  orderId?: string;
  invoiceRef?: string;
  quantitySold: number;
  soldAt: string;
  customerName?: string;
  cashierName?: string;
  notes?: string;
}

export interface BatchLotRecord {
  id: string;
  batchNumber: string;
  quantity: number;
  initialQuantity?: number;
  unitCost: number;
  receivedDate: string;
  manufactureDate?: string;
  expiryDate?: string;
  supplierName?: string;
  supplierInvoiceRef?: string;
  status?: 'Active' | 'Depleted' | 'Quarantined' | 'Recalled' | 'Expired';
  salesHistory?: BatchSaleRecord[];
  notes?: string;
}

export type PriceListType = 'Retail' | 'Wholesale' | 'Dealer' | 'Member' | 'Promotional' | string;
export type PriceListMap = Record<string, number>;
export type ProductPriceLists = Record<string, number> | PriceListItem[];

export interface PriceListItem {
  priceListId: string;
  priceListName: PriceListType;
  price: number;
  minQuantity?: number;
}

export interface MarginGuardViolation {
  tierName: string;
  price: number;
  cost: number;
  lossAmount: number;
  marginPercent: number;
  warningMessage: string;
  variantSku?: string;
}

export interface MarginGuardReport {
  isSafe: boolean;
  hasNegativeMargin: boolean;
  cost: number;
  retailPrice: number;
  wholesalePrice?: number;
  retailProfit: number;
  retailMarginPercent: number;
  wholesaleProfit?: number;
  wholesaleMarginPercent?: number;
  violatedTiers: MarginGuardViolation[];
  warnings: string[];
  summaryWarning?: string;
}

export interface PriceList {
  id: string;
  name: PriceListType;
  code: string;
  description?: string;
  isDefault?: boolean;
  discountPercentage?: number;
  status: 'Active' | 'Inactive';
}

export interface ProductVariant {
  id?: string;
  sku: string;
  title?: string;
  name?: string;
  size?: string;
  color?: string;
  model?: string;
  stock: number;
  onHand?: number;
  reserved?: number;
  reservedStock?: number;
  available?: number;
  lowStockThreshold?: number;
  allowBackorder?: boolean;
  price?: number;
  cost?: number;
  priceLists?: ProductPriceLists;
  barcode?: string;
  ean?: string;
  upc?: string;
  qrCode?: string;
  barcodes?: BarcodeEntry[];
  imageUrl?: string;
  images?: string[];
  weight?: number;
  weightUnit?: string; // e.g., 'kg', 'g', 'lb', 'oz'
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string; // e.g., 'cm', 'in', 'mm'
  };
  inventoryTracking?: 'QUANTITY' | 'SERIAL' | 'BATCH' | 'NONE';
  inventoryItemId?: string;
  reorderPoint?: number;
  location?: string;
  options?: Record<string, string>;
  serialUnits?: SerialNumberUnit[];
}

export interface SalesChannelsVisibility {
  pos: boolean;            // POS (Physical In-Store)
  ecommerce: boolean;      // Online Store
  mobileApp: boolean;      // Mobile App
  wholesalePortal: boolean; // Wholesale Portal
}

export type StorefrontStatus = 'Draft' | 'Published' | 'Hidden' | 'Scheduled';

export type ProductRelationshipType =
  | 'related'
  | 'recommended'
  | 'boughtTogether'
  | 'replacement'
  | 'upsell'
  | 'crossSell';

export interface ProductRelationships {
  relatedProductIds?: string[];
  recommendedProductIds?: string[];
  boughtTogetherProductIds?: string[];
  replacementProductIds?: string[];
  upsellProductIds?: string[];
  crossSellProductIds?: string[];
}

export interface PublishTargets {
  website: boolean;
  mobileApp: boolean;
}

export interface ProductEcommerce {
  published?: boolean;
  storefrontStatus?: StorefrontStatus;
  publishTargets?: PublishTargets;
  scheduledPublishDate?: string;
  category?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  slug?: string;
  canonicalUrl?: string;
  featured?: boolean;
  enableReviews?: boolean;
  summary?: string;
}

export interface ReviewCustomer {
  id?: string;
  name: string;
  email?: string;
  avatar?: string;
  location?: string;
}

export interface ReviewAdminResponse {
  text: string;
  respondedAt: string;
  responderName: string;
  responderRole?: string;
  responderAvatar?: string;
}

export type ReviewStatus = 'approved' | 'pending' | 'hidden' | 'flagged';

export interface ProductReview {
  id: string;
  productId: string;
  productName?: string;
  productImage?: string;
  variantSku?: string;
  variantName?: string;
  orderId?: string;
  customerId?: string;
  customer?: ReviewCustomer;
  userName: string; // for direct display and backward compatibility
  userEmail?: string;
  avatar?: string;
  rating: number; // 1 - 5 stars
  title: string;
  comment: string;
  images?: string[];
  date: string;
  verifiedPurchase: boolean; // Only true when customer actually purchased the product/variant in a completed order
  status?: ReviewStatus; // 'approved' | 'pending' | 'hidden' | 'flagged'
  flagReason?: string;
  flaggedAt?: string;
  helpfulCount?: number;
  adminResponse?: ReviewAdminResponse;
}

export interface CouponCode {
  id?: string;
  code: string;
  discountType: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  minSpend?: number;
  minOrderAmount?: number;
  description: string;
  isActive?: boolean;
  startDate?: string;
  expiryDate?: string;
  eligibleCustomerIds?: string[];
  eligibleCustomerTiers?: ('regular' | 'bronze' | 'silver' | 'gold' | 'vip' | 'wholesale' | string)[];
  requiresAuth?: boolean;
  eligibleProductIds?: string[];
  excludedProductIds?: string[];
  eligibleCategoryIds?: string[];
  maxTotalUsage?: number;
  currentUsageCount?: number;
  maxUsagePerCustomer?: number;
  customerUsageCounts?: Record<string, number>;
  appliedAmount?: number;
}

export type CouponValidationErrorCode = 
  | 'COUPON_NOT_FOUND'
  | 'COUPON_INACTIVE'
  | 'COUPON_EXPIRED'
  | 'COUPON_NOT_STARTED'
  | 'CUSTOMER_NOT_ELIGIBLE'
  | 'AUTH_REQUIRED'
  | 'MINIMUM_ORDER_NOT_MET'
  | 'NO_ELIGIBLE_PRODUCTS'
  | 'USAGE_LIMIT_EXCEEDED'
  | 'CUSTOMER_USAGE_LIMIT_EXCEEDED';

export interface CouponRuleCheck {
  rule: 'exists' | 'active' | 'not_expired' | 'customer_eligible' | 'minimum_order' | 'product_eligibility' | 'usage_limit' | 'customer_usage_limit';
  label: string;
  passed: boolean;
  message: string;
  details?: any;
}

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  coupon?: CouponCode;
  discountAmount: number;
  formattedDiscount: string; // e.g. "-Le 200"
  displayText: string; // e.g. "Discount applied: -Le 200"
  message: string;
  errorCode?: CouponValidationErrorCode;
  errorMessage?: string;
  applicableSubtotal: number;
  isFreeShipping: boolean;
  ruleChecks: CouponRuleCheck[];
}

export interface CompositeComponentItem {
  productId?: string;
  sku: string;
  name: string;
  quantity: number;
  unitCost: number;
}

export interface BundleKitItem {
  productId?: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface BulkPackagingConfig {
  outerPackageType: 'Box' | 'Carton' | 'Packet' | 'Case' | 'Sack' | 'Dozen' | string;
  itemsPerPackage: number; // e.g., 30 pcs per box
  outerPackageCost: number; // e.g., LE 75.00
  unitCost: number; // e.g., LE 2.50 per piece (calculated: outerPackageCost / itemsPerPackage)
  unitRetailPrice: number; // e.g., LE 4.00 per piece
  dozenRetailPrice?: number; // e.g., LE 42.00 per dozen (12 pcs)
  outerPackageRetailPrice?: number; // e.g., LE 100.00 per full box (30 pcs)
  allowDozenSale?: boolean;
  allowPackageSale?: boolean;
}

export interface PackagingUnitOption {
  id?: string;
  unitName: string; // e.g. "2 Tea Bags", "3 Pieces", "Single Piece", "Box of 100", "Dozen", "Strip of 10"
  unitType?: 'retail_unit' | 'dozen' | 'master_pack' | 'bundle' | 'custom' | string;
  multiplier: number; // conversion multiplier in base units (e.g., 1 for single, 2 for pair, 100 for box)
  base_unit: string; // e.g. "tea bag", "piece", "tablet", "sachet", "bottle"
  price: number; // selling price for this unit tier
  cost?: number; // COGS for this unit tier
  barcode?: string; // Optional distinct barcode for this packaging tier
  sku?: string; // Optional SKU
  allowSale?: boolean; // Whether active for POS and sales channels
  isBaseUnit?: boolean; // True if multiplier === 1
  isDefaultSaleUnit?: boolean;
}

export interface PackagingUnitsConfig {
  base_unit: string; // e.g. "tea bag", "piece", "tablet"
  multiplier?: number; // master pack multiplier, e.g. 100
  outerPackageType?: string; // e.g. "Box", "Carton", "Packet", "Sack", "Case", "Bundle"
  outerPackageCost?: number; // purchase cost of full outer package
  units: PackagingUnitOption[];
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  onHand?: number;
  reserved?: number;
  reservedStock?: number;
  available?: number;
  lowStockThreshold?: number;
  allowBackorder?: boolean;
  category: string;
  location: 'Warehouse' | 'Store Shelf' | 'Fulfillment Center' | string;
  reorderPoint: number;
  barcode: string;
  ean?: string;
  upc?: string;
  qrCode: string;
  barcodes?: BarcodeEntry[];
  variants: ProductVariant[];
  salesCount: number;
  imageUrl?: string;
  description?: string;
  brand?: string;
  model?: string;
  rating?: number;
  reviewCount?: number;
  originalPrice?: number;
  discountPercent?: number;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isFeatured?: boolean;
  images?: string[];
  specifications?: Record<string, string>;
  reviews?: ProductReview[];

  // Multi-step product creation & architecture types
  status?: 'Active' | 'Draft' | 'Archived';
  productType?: 'Standard' | 'Composite' | 'Bundle' | 'Service' | 'Digital' | 'Rental' | string;
  hasVariants?: boolean;
  inventoryTracking?: 'QUANTITY' | 'SERIAL' | 'BATCH' | 'NONE';
  stockRotationMethod?: 'FIFO' | 'FEFO' | 'LIFO' | 'MANUAL';
  hasMultiUOM?: boolean;
  returnable?: boolean;
  compositeComponents?: CompositeComponentItem[];
  bundleKitItems?: BundleKitItem[];
  bulkPackaging?: BulkPackagingConfig;
  packagingUnits?: PackagingUnitsConfig;
  wholesalePrice?: number;
  minimumPrice?: number;
  costCalculationMethod?: CostCalculationMethod;
  purchasePrice?: number;
  weightedAverageCost?: number;
  fifoBatches?: BatchLotRecord[];
  priceLists?: ProductPriceLists;
  unit?: string;
  trackStock?: boolean;
  trackSerial?: boolean;
  trackBatch?: boolean;
  trackExpiry?: boolean;
  serialNumber?: string;
  serialUnits?: SerialNumberUnit[];
  batchNumber?: string;
  expiryDate?: string;
  supplierName?: string;
  salesChannels?: SalesChannelsVisibility;
  ecommerce?: ProductEcommerce;
  relationships?: ProductRelationships;
  createdAt?: string; // Product creation/launch ISO timestamp for New Arrivals rule
  tags?: string[];
}

export type RecommendationRuleType =
  | 'BEST_SELLERS'
  | 'NEW_ARRIVALS'
  | 'RELATED_PRODUCTS'
  | 'FREQUENTLY_BOUGHT_TOGETHER'
  | 'RECENTLY_VIEWED_AFFINITY';

export interface RecommendationRuleMatch {
  product: Product;
  ruleType: RecommendationRuleType;
  score: number;
  reason: string;
  ruleDetails: {
    salesVolume?: number;
    ordersCount?: number;
    daysSinceCreation?: number;
    creationDate?: string;
    matchedAttributes?: string[];
    coPurchaseCount?: number;
    coPurchaseConfidence?: number;
    affinityCategory?: string;
    affinityBrand?: string;
  };
}

export interface BrowsingHistoryItem {
  productId: string;
  productName?: string;
  category?: string;
  brand?: string;
  price?: number;
  viewedAt: string;
  viewCount: number;
}

export interface ProductPhotoAngle {
  id: string;
  side: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'barcode' | 'specs' | 'custom' | string;
  label: string;
  dataUrl: string;
  base64: string;
  mimeType: string;
  fileName?: string;
  capturedAt?: string;
}

export interface ExtractedProductInfo {
  name: string;
  brand: string;
  model?: string;
  category: string;
  sku: string;
  barcode: string;
  description: string;
  shortSummary?: string;
  specifications: Record<string, string>;
  features: string[];
  suggestedCost: number;
  suggestedPrice: number;
  suggestedWholesalePrice?: number;
  suggestedStock?: number;
  countryOfOrigin?: string;
  certifications?: string[];
  detectedTextRaw?: string[];
  confidenceScore: number;
}

export interface Category {
  id: string;
  name: string;
  parent_id?: string | null;
  slug?: string;
  description?: string;
  image?: string;
  icon?: string;
  sort_order?: number;
  status?: 'active' | 'inactive';
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariantSku?: string;
  selectedUnitName?: string;
  conversion_multiplier?: number;
  unitPrice?: number;
  customPriceOverride?: number;
  isManagerApproved?: boolean;
}

export type PaymentMethod = 'Cash' | 'Credit/Debit Card' | 'Digital Wallet' | 'Mobile Pay' | 'Bank Transfer' | 'Installments (Klarna/Afterpay)' | 'Monime Multi-Channel Gateway (Settled)' | string;

export interface RefundRequestDetails {
  rmaNumber: string;
  reason: string;
  resolution: 'Full Refund to Original Payment' | 'Instant Store Credit (+10% Bonus)' | 'Free Replacement Item Shipped' | 'Technical Support & Partial Refund' | string;
  notes?: string;
  requestedAt: string;
  status: 'Pending Review' | 'Approved' | 'Rejected' | 'Refund Issued' | 'Replacement Dispatched';
  photos?: string[];
  reviewedBy?: string;
  reviewedAt?: string;
  adminNotes?: string;
}

export interface OrderCartValidationSummary {
  verifiedAt: string;
  signature: string;
  rulesPassed: number;
  totalRules: number;
  priceIntegrityVerified: boolean;
  stockVerified: boolean;
  promoVerified: boolean;
  warnings?: string[];
  serverSubtotal?: number;
  serverTax?: number;
  serverShipping?: number;
  serverGrandTotal?: number;
}

export type ECommerceOrderStatus = 
  | 'Pending Payment'
  | 'Paid'
  | 'Processing'
  | 'Ready for Pickup'
  | 'Packed'
  | 'Dispatched'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled'
  | 'Returned'
  | 'Refunded';

export interface Order {
  id: string;
  date: string;
  orderNumber?: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    cost?: number;
    variantSku?: string;
    variantName?: string;
    selectedUnitName?: string;
    conversion_multiplier?: number;
  }[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  grandTotal?: number;
  paymentMethod: PaymentMethod;
  channel: 'Online Storefront' | 'In-Store POS' | 'Mobile App';
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  status: 'Completed' | 'Pending' | 'Pending Approval' | 'Approved' | 'Processing' | 'Refunded' | 'Partially Refunded' | 'Outstanding' | 'Awaiting Receipt Confirmation' | 'Dispatched' | 'Delivered' | 'Refund Requested' | 'Cancelled' | 'Rejected' | 'On Hold' | 'Pending Payment' | 'Paid' | 'Ready for Pickup' | 'Packed' | 'Out for Delivery' | 'Returned' | ECommerceOrderStatus | string;
  notes?: string;
  source?: string;
  deliveryAddress?: string;
  shippingMethod?: string;
  shippingCost?: number;
  appliedCouponCode?: string;
  appliedCouponDiscount?: number;
  loyaltyPointsUsed?: number;
  loyaltyDiscountAmount?: number;
  approvalStatus?: 'Pending Approval' | 'Approved' | 'Rejected' | 'On Hold' | 'Auto-Approved';
  approvedBy?: string;
  approvedAt?: string;
  approvalNotes?: string;
  rejectionReason?: string;
  cartValidationDetails?: OrderCartValidationSummary;
  cashTendered?: number;
  cashChange?: number;
  receiptSentToEmail?: string;
  receiptSentAt?: string;
  taxExempt?: boolean;
  loyaltyPointsEarned?: number;
  cashierId?: string;
  cashierName?: string;
  branchId?: string;
  branchName?: string;
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: string;
  cogs?: number;
  outstandingBalance?: number;
  dueDate?: string;
  trackingNumber?: string;
  deliveredDate?: string;
  deliveredTimestamp?: number;
  receiptConfirmed?: boolean;
  receiptConfirmedAt?: string;
  awaitingReceiptUntil?: string;
  awaitingReceiptExpiry?: number;
  deliveryStatus?: 'Processing' | 'Dispatched' | 'Delivered' | 'Returned' | 'Pending Payment' | 'Out for Delivery' | string;
  refundRequested?: boolean;
  refundRequestDetails?: RefundRequestDetails;
  inventoryReservationId?: string;
  inventoryReservation?: InventoryReservation;
  fulfillmentDetails?: OrderFulfillmentDetails;
  orderCreationTimeline?: OrderCreationTimelineEvent[];
  // Independent Multi-Domain Status Architecture
  lifecycleDomainStatuses?: OrderLifecycleDomainStatuses;
  lifecycleStages?: OrderLifecycleStageRecord[];
  currentLifecycleStageId?: number;
  currentLifecyclePhaseId?: number;
  proofOfDelivery?: ProofOfDeliveryData;
  warehouseFulfillment?: WarehouseFulfillmentData;
  shippingHandover?: ShippingHandoverData;
  lastMileDetails?: LastMileDeliveryData;
  feedbackReviewData?: OrderFeedbackReviewData;
}

// ============================================================================
// 30-STAGE ORDER-TO-DELIVERY LIFECYCLE ARCHITECTURE & INDEPENDENT DOMAINS
// ============================================================================

export type OrderDomainOrderStatus = 
  | 'Draft'
  | 'Submitted'
  | 'Confirmed'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'
  | 'Archived';

export type OrderDomainPaymentStatus = 
  | 'Unpaid'
  | 'Pending Verification'
  | 'Authorized'
  | 'Paid'
  | 'Partially Paid'
  | 'Failed'
  | 'Refunded'
  | 'Partially Refunded';

export type OrderDomainFulfillmentStatus = 
  | 'Unfulfilled'
  | 'Reserved'
  | 'Allocated'
  | 'Pick Task Generated'
  | 'Picking'
  | 'Pick Exception'
  | 'Packing'
  | 'QC Passed'
  | 'Fulfilled'
  | 'Returned to Stock';

export type OrderDomainShipmentStatus = 
  | 'Unshipped'
  | 'Label Generated'
  | 'Courier Assigned'
  | 'Dispatched'
  | 'In Transit'
  | 'Out for Delivery'
  | 'Delivery Attempted'
  | 'Delivered'
  | 'Failed Delivery';

export type OrderDomainReturnStatus = 
  | 'None'
  | 'Return Requested'
  | 'Return Approved'
  | 'Reverse Pickup In-Transit'
  | 'Item Inspected'
  | 'Restocked'
  | 'Refund Issued'
  | 'Return Rejected';

export interface OrderLifecycleDomainStatuses {
  orderStatus: OrderDomainOrderStatus;
  paymentStatus: OrderDomainPaymentStatus;
  fulfillmentStatus: OrderDomainFulfillmentStatus;
  shipmentStatus: OrderDomainShipmentStatus;
  returnStatus: OrderDomainReturnStatus;
  lastUpdated: string;
}

export type LifecycleStageStatus = 'pending' | 'in_progress' | 'completed' | 'exception' | 'skipped';

export interface OrderLifecycleStageRecord {
  stageId: number; // 1 to 30
  phaseId: number; // 1 to 8
  stageName: string;
  phaseName: string;
  status: LifecycleStageStatus;
  timestamp?: string;
  actor?: string;
  actorRole?: string;
  systemModule?: string;
  notes?: string;
  metadata?: Record<string, any>;
  exceptionMessage?: string;
}

export interface ProofOfDeliveryData {
  podId: string;
  recipientName: string;
  recipientPhone?: string;
  deliveryTimestamp: string;
  signatureDataUrl?: string;
  photoDataUrl?: string;
  deliveryOtpVerified: boolean;
  deliveryOtpCode?: string;
  courierId?: string;
  courierName: string;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
  };
  notes?: string;
}

export interface WarehouseFulfillmentData {
  fulfillmentOrderId: string;
  assignedWarehouseId: string;
  assignedWarehouseName: string;
  pickTaskId?: string;
  pickerStaffId?: string;
  pickerStaffName?: string;
  pickedItems?: {
    productId: string;
    productName: string;
    variantSku?: string;
    barcodeScanned: string;
    scannedValid: boolean;
    quantity: number;
  }[];
  pickExceptions?: {
    productId: string;
    productName: string;
    reportedIssue: 'Damaged' | 'Out of Stock' | 'Location Mismatch' | 'Quality Issue';
    loggedAt: string;
    resolved: boolean;
    resolutionNotes?: string;
  }[];
  packageDetails?: {
    boxType: string;
    dimensionsCm: { length: number; width: number; height: number };
    grossWeightKg: number;
    packedByStaffName: string;
    packedAt: string;
  };
  qcInspection?: {
    passed: boolean;
    inspectorName: string;
    inspectedAt: string;
    serialNumbersRecorded?: string[];
    tamperSealNumber?: string;
  };
}

export interface ShippingHandoverData {
  shipmentId: string;
  trackingNumber: string;
  carrierId: string;
  carrierName: string;
  courierDriverName?: string;
  courierDriverPhone?: string;
  vehiclePlate?: string;
  shippingLabelUrl?: string;
  shippingLabelBarcodeSvg?: string;
  dispatchedAt?: string;
  warehouseHandoverConfirmedBy?: string;
  courierHandoverConfirmedBy?: string;
  transitCheckpoints?: {
    location: string;
    statusText: string;
    timestamp: string;
    facilityName?: string;
  }[];
}

export interface LastMileDeliveryData {
  proximityAlertSentAt?: string;
  courierEtaMinutes?: number;
  deliveryAttemptsCount: number;
  attemptLogs?: {
    attemptNumber: number;
    timestamp: string;
    outcome: 'Customer Absent' | 'Wrong Address' | 'Rescheduled' | 'Access Denied' | 'Successful Delivery';
    notes?: string;
  }[];
  otpGeneratedAt?: string;
  otpCode?: string;
  otpVerifiedAt?: string;
}

export interface OrderFeedbackReviewData {
  feedbackPromptSentAt?: string;
  productReviewSubmitted?: boolean;
  deliveryRating?: number; // 1-5
  courierRating?: number;  // 1-5
  overallSatisfaction?: number; // 1-5
  feedbackComments?: string;
  reviewedAt?: string;
}

export type OrderCreationFlowStep = 
  | 'customer'
  | 'cart'
  | 'checkout'
  | 'validate'
  | 'reserve_inventory'
  | 'create_order'
  | 'create_payment'
  | 'payment_confirmed'
  | 'order_paid'
  | 'inventory_finalized'
  | 'fulfillment';

export interface InventoryReservationItem {
  productId: string;
  productName: string;
  variantSku?: string;
  quantity: number;
  reservedStockBefore: number;
  reservedStockAfter: number;
  availableStockRemaining: number;
}

export interface InventoryReservation {
  reservationId: string;
  orderId?: string;
  customerId?: string;
  customerName?: string;
  items: InventoryReservationItem[];
  createdAt: string;
  expiresAt: string;
  ttlSeconds: number;
  status: 'active' | 'finalized' | 'released' | 'expired';
  finalizedAt?: string;
  releasedAt?: string;
  releaseReason?: string;
}

export interface OrderCreationTimelineEvent {
  step: OrderCreationFlowStep;
  name: string;
  status: 'completed' | 'in_progress' | 'failed' | 'pending';
  timestamp: string;
  details?: string;
  metadata?: Record<string, any>;
}

export interface OrderFulfillmentDetails {
  orderId: string;
  status: 'unfulfilled' | 'allocated' | 'picking' | 'packing' | 'packed' | 'dispatched' | 'out_for_delivery' | 'delivered' | 'cancelled';
  trackingNumber: string;
  carrier: string;
  shippingMethod: string;
  deliveryAddress: string;
  packingSlipNumber?: string;
  allocatedAt?: string;
  pickedAt?: string;
  packedAt?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  notes?: string;
}

export interface OrderCreationFlowState {
  currentStep: OrderCreationFlowStep;
  completedSteps: OrderCreationFlowStep[];
  timeline: OrderCreationTimelineEvent[];
  reservation?: InventoryReservation;
  order?: Order;
  paymentSession?: PaymentSession;
  paymentResult?: any;
  fulfillment?: OrderFulfillmentDetails;
  error?: string;
}

export interface AdminNotification {
  id: string;
  type: 'refund_request' | 'receipt_confirmed' | 'order_delivered' | 'dispute_escalated' | 'system_alert';
  title: string;
  message: string;
  orderId?: string;
  orderNumber?: string;
  customerId?: string;
  customerName?: string;
  amount?: number;
  rmaNumber?: string;
  reason?: string;
  resolution?: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
}

export interface ParkedOrder {
  id: string;
  heldAt: string;
  customerName: string;
  customerEmail?: string;
  customerId?: string;
  items: {
    product: Product;
    quantity: number;
    selectedVariantSku?: string;
  }[];
  subtotal: number;
  appliedCoupon: Coupon | null;
  notes?: string;
}

export interface WishlistItem {
  id: string;
  productId: string;
  addedAt: string;
  priceWhenAdded: number;
  notifyPriceDrop: boolean;
  notifyBackInStock: boolean;
  targetPrice?: number;
  selectedVariantSku?: string;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  loyaltyPoints: number;
  notes?: string;
  segment: 'VIP' | 'Regular' | 'New' | 'Inactive';
  purchaseHistoryIds: string[];
  wishlist?: WishlistItem[];
  wishlistProductIds?: string[];
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  avatar?: string;
  tags?: string[];
  createdAt?: string;
  preferredChannel?: 'In-Store POS' | 'Online Storefront' | 'Omnichannel';
  marketingOptIn?: boolean;
  birthday?: string;
  loyaltyTier?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
  totalSpent?: number;
  totalOrders?: number;
  lastOrderDate?: string;
}

export interface SupportTicket {
  id: string;
  customerId: string;
  customerName: string;
  subject: string;
  category: 'Order Issue' | 'Product Inquiry' | 'Loyalty Redemption' | 'Billing & Refund' | 'General';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'Pending' | 'Resolved' | 'Closed';
  date: string;
  description?: string;
  assignedStaff?: string;
  messages?: {
    id: string;
    sender: 'customer' | 'staff';
    senderName: string;
    text: string;
    timestamp: string;
  }[];
}

export interface CampaignLog {
  id: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'push';
  targetType: 'single' | 'segment' | 'selected' | 'all';
  targetLabel: string;
  subject?: string;
  message: string;
  recipientCount: number;
  timestamp: string;
  status: 'Delivered' | 'Scheduled' | 'Sent';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  staffName: string;
  role: StaffRole | string;
  action: string;
  module: 'Inventory' | 'POS' | 'CRM' | 'User Management' | 'Billing' | 'Storefront' | string;
  details: string;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  avatar: string;
  pin: string;
  status: 'Active' | 'Inactive' | 'On Leave';
  department?: string;
  phone?: string;
  permissionsOverride?: PermissionKey[];
  lastActive?: string;
  notes?: string;
}

export interface Coupon {
  code: string;
  discountType: 'Percentage' | 'Fixed';
  value: number;
  minSpend?: number;
}

// ==========================================
// Central System Configuration Types
// ==========================================

export interface BusinessSettings {
  companyName: string;
  legalName: string;
  tagline: string;
  registrationNumber: string;
  taxId: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  logoUrl: string;
  timeZone: string;
}

export interface CurrencySettings {
  primaryCurrency: string;
  symbolPosition: 'prefix' | 'suffix';
  spaceBetween: boolean;
  decimalPlaces: number;
  multiCurrencyCheckout: boolean;
  autoUpdateRates: boolean;
}

export interface TaxSettings {
  defaultTaxRate: number; // percentage, e.g. 8.5
  taxName: string; // e.g. 'VAT', 'Sales Tax', 'GST'
  taxCalculation: 'exclusive' | 'inclusive';
  allowTaxExemption: boolean;
  taxRegistrationNumber: string;
  enableSecondaryTax: boolean;
  secondaryTaxRate: number;
  secondaryTaxName: string;
}

export interface ReceiptSettings {
  printerType: 'thermal-80mm' | 'thermal-58mm' | 'standard-a4';
  headerText: string;
  footerText: string;
  returnPolicy: string;
  showLogo: boolean;
  showCashierName: boolean;
  showCustomerInfo: boolean;
  showBarcode: boolean;
  showQrCode: boolean;
  autoPrintOnCheckout: boolean;
  autoEmailReceipt: boolean;
}

export interface InvoiceNumberingSettings {
  invoicePrefix: string;
  nextInvoiceNumber: number;
  digitPadding: number;
  includeYearMonth: boolean;
  resetSequence: 'never' | 'yearly' | 'monthly';
  creditNotePrefix: string;
  quotePrefix: string;
}

export interface POSSettings {
  terminalName: string;
  enableSoundEffects: boolean;
  defaultCustomerName: string;
  quickCashPresets: number[];
  requireManagerPinForDiscount: boolean;
  maxDiscountWithoutPin: number; // %
  requireManagerPinForRefund: boolean;
  allowPriceOverride: boolean;
  autoOpenCashDrawer: boolean;
  fastBarcodeAdd: boolean;
  maxParkedCarts: number;
}

export interface InventoryRulesSettings {
  preventNegativeStock: boolean;
  trackVariants: boolean;
  stockDeductionTiming: 'on_checkout' | 'on_fulfillment' | 'on_invoice';
  valuationMethod: 'FIFO' | 'LIFO' | 'Weighted Average';
  enforceStockAudit: boolean;
  autoBatchTracking: boolean;
}

export interface LowStockSettings {
  globalLowStockThreshold: number;
  criticalStockThreshold: number;
  notifyOnLowStock: boolean;
  autoGenerateReorderDrafts: boolean;
  defaultReorderMultiplier: number;
}

export interface OrderSettings {
  orderPrefix: string;
  minOrderValue: number;
  enabledChannels: {
    pos: boolean;
    ecom: boolean;
    mobile: boolean;
    phone: boolean;
  };
  autoArchiveDays: number;
  defaultOrderStatus: 'Completed' | 'Pending';
  allowOrderNotes: boolean;
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  zipCodes: string;
}

export interface DeliverySettings {
  enableLocalDelivery: boolean;
  enableStorePickup: boolean;
  defaultDeliveryFee: number;
  freeDeliveryThreshold: number;
  estimatedDeliveryDays: string;
  selectedCarrier: string;
  deliveryZones: DeliveryZone[];
}

export interface PaymentMethodsSettings {
  cashEnabled: boolean;
  cardEnabled: boolean;
  digitalWalletEnabled: boolean;
  mobileMoneyEnabled: boolean;
  bankTransferEnabled: boolean;
  installmentsEnabled: boolean;
  defaultMethod: PaymentMethod;
  cardSurchargePercent: number;
  mobileMoneyProvider: string;
  gateways?: PaymentGatewayConfig[];
}

export type PaymentGatewayProvider = 
  | 'monime'
  | 'stripe' 
  | 'orange_money' 
  | 'afrimoney' 
  | 'card_terminal' 
  | 'bank_wire' 
  | 'bnpl_klarna' 
  | 'cash_on_delivery' 
  | string;

export interface PaymentGatewayCredentials {
  publishableKey?: string;
  secretKey?: string;
  merchantId?: string;
  webhookSecret?: string;
  ussdCode?: string;
  terminalId?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  swiftBic?: string;
  iban?: string;
  routingNotes?: string;
  
  // Monime API & Infrastructure fields
  monimeAccessToken?: string;
  monimeSpaceId?: string;
  monimeMode?: 'live' | 'test';
  monimePreferredChannel?: 'all' | 'mobile_money' | 'card' | 'bank_transfer' | 'payment_code';
  monimeVersion?: string;
}

export interface MonimeLineItem {
  type?: 'custom' | string;
  name: string;
  description?: string;
  quantity: number;
  price: {
    currency: string;
    value: number; // minor units (cents = price * 100)
  };
  reference?: string;
  images?: string[];
}

export interface MonimeCheckoutSessionRecord {
  id: string;
  order_id: string;
  monime_session_id: string;
  monime_order_number?: string;
  redirect_url?: string;
  status: 'pending' | 'completed' | 'cancelled' | 'expired' | string;
  amount: number;
  currency: string;
  line_items: any[];
  customer_name?: string;
  created_at?: string;
  updated_at?: string;
}


export interface PaymentGatewayConfig {
  id: string;
  provider: PaymentGatewayProvider;
  name: string;
  description: string;
  enabled: boolean;
  availableInStorefront?: boolean;
  availableInPOS?: boolean;
  isDefault?: boolean;
  environment: 'sandbox' | 'production';
  credentials: PaymentGatewayCredentials;
  surchargePercent: number;
  fixedFee: number;
  supportedCurrencies: string[];
  settlementLedgerAccount: string; // e.g., '1030 - Orange Money Settlement'
  autoCapture: boolean;
  allowGuestCheckout: boolean;
  customerInstruction?: string;
  maxTransactionLimit?: number;
  minTransactionLimit?: number;
}

export interface PaymentSessionBreakdown {
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  surcharge: number;
  grandTotal: number;
}

export interface PaymentSessionAvailableGateway {
  id: string;
  provider: PaymentGatewayProvider;
  name: string;
  description?: string;
  surchargeAmount: number;
  totalWithSurcharge: number;
  instructions?: string;
  environment: 'sandbox' | 'production';
  requiresFields: ('phone' | 'pin' | 'card' | 'bank_ref' | 'otp')[];
  credentialsPreview?: {
    publishableKey?: string;
    ussdCode?: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    swiftBic?: string;
  };
}

export interface PaymentSession {
  sessionId: string;
  clientToken: string;
  orderId?: string;
  orderNumber?: string;
  cartValidationChecksum?: string;
  amount: number;
  currency: string;
  breakdown: PaymentSessionBreakdown;
  customer: {
    id?: string;
    name: string;
    email: string;
    phone: string;
    isGuest: boolean;
  };
  shippingAddress?: {
    name: string;
    email: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    stateProvince: string;
    postalCode: string;
    country: string;
  };
  status: 'requires_payment_method' | 'processing' | 'requires_action' | 'authorized' | 'captured' | 'failed' | 'cancelled';
  availableGateways: PaymentSessionAvailableGateway[];
  selectedGatewayId?: string;
  actionPayload?: Record<string, any>;
  createdAt: string;
  expiresAt: string;
}

export interface PaymentSessionProcessRequest {
  sessionId: string;
  gatewayId: string;
  provider: PaymentGatewayProvider;
  orderId?: string;
  items?: Array<{
    name: string;
    description?: string;
    quantity: number;
    price: number;
    sku?: string;
    image?: string;
  }>;
  customerPaymentData: {
    phoneNumber?: string;
    ussdPin?: string;
    cardHolder?: string;
    cardholderName?: string;
    customerName?: string;
    cardNumber?: string;
    cardExpiry?: string;
    cardCvv?: string;
    bankTransferReference?: string;
    notes?: string;
  };
}

export interface PaymentConfirmationResult {
  success: boolean;
  transactionId: string;
  paymentSessionId: string;
  gatewayId: string;
  provider: PaymentGatewayProvider;
  amountPaid: number;
  currency: string;
  status: 'Captured' | 'Authorized' | 'Pending Settlement' | 'Failed';
  paidAt: string;
  receiptNumber: string;
  orderId: string;
  orderNumber: string;
  order?: Order;
  ledgerJournalId: string;
  inventoryUpdated: boolean;
  stockMovementIds?: string[];
  error?: string;
}

export interface LedgerAccount {
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  balance: number;
  description?: string;
}

export interface LedgerLineItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  type: 'Debit' | 'Credit';
  amount: number;
  memo?: string;
}

export interface LedgerJournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  sourceDocument: 'E-Commerce Order' | 'POS Receipt' | 'Payment Gateway Settlement' | 'Inventory Stock Adjustment' | 'Refund' | string;
  referenceId: string; // e.g. orderId, orderNumber, or transactionId
  description: string;
  lines: LedgerLineItem[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  createdBy: string;
  createdAt: string;
}

export interface NotificationSettings {
  emailNotificationsEnabled: boolean;
  notificationEmail: string;
  notifyOnNewOrder: boolean;
  notifyOnLowStock: boolean;
  notifyOnRefund: boolean;
  dailySalesReport: boolean;
  smsAlertsEnabled: boolean;
  smsPhone: string;
}

export interface UserRolesSecuritySettings {
  supervisorPin: string;
  sessionTimeoutMinutes: number;
  requirePinOnCashierSwitch: boolean;
  defaultNewStaffRole: StaffRole;
  twoFactorAuthEnforced: boolean;
  lockoutAfterFailedAttempts: number;
}

export interface IntegrationSettings {
  barcodeScannerMode: 'hid_keyboard' | 'serial_usb' | 'camera_optical';
  accountingExportFormat: 'QuickBooks' | 'Xero' | 'Generic CSV';
  cloudSyncEnabled: boolean;
  webhookUrl: string;
  geminiAiCommerceEnabled: boolean;
  thermalPrinterIp: string;
}

// ----------------------------------------------------------------------
// Content-Driven Storefront Homepage CMS Configuration Types
// ----------------------------------------------------------------------

export type HomepageSectionType = 
  | 'hero_banner'
  | 'categories'
  | 'featured_products'
  | 'promotional_banner'
  | 'new_arrivals'
  | 'best_sellers'
  | 'brands'
  | 'recommended'
  | 'custom_campaign';

export type BannerStatus = 'active' | 'draft' | 'scheduled' | 'expired';

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeBg?: string;
  badgeText?: string;
  discountText?: string;
  
  // Media Assets (Responsive Images & Video)
  imageDesktopUrl: string;
  imageTabletUrl?: string;
  imageMobileUrl?: string;
  videoUrl?: string; // HTML5 video MP4/WebM or YouTube/Vimeo URL
  
  // Call To Action
  ctaText?: string;
  ctaUrl?: string; // Target category, product ID, or external link
  
  // Scheduling & Display
  startDate?: string;
  endDate?: string;
  displayOrder: number;
  status: BannerStatus;
  
  // Aesthetics & Mapping
  bgGradient?: string;
  category?: string;
}

export type HeroLayoutType = 'carousel' | 'single_hero' | 'promo_strip';

export interface HomepageHeroSlideConfig {
  id: string;
  badge: string;
  badgeBg?: string;
  badgeText?: string;
  title: string;
  subtitle: string;
  discountText: string;
  ctaText: string;
  category: string;
  bgGradient?: string;
  imageUrl: string;
  imageDesktopUrl?: string;
  imageTabletUrl?: string;
  imageMobileUrl?: string;
  videoUrl?: string;
  ctaUrl?: string;
  startDate?: string;
  endDate?: string;
  displayOrder?: number;
  status?: BannerStatus;
}

export interface HomepagePromoBannerConfig {
  headline: string;
  subtext: string;
  couponCode: string;
  discountText: string;
  bgGradient?: string;
  buttonText?: string;
  imageDesktopUrl?: string;
  imageTabletUrl?: string;
  imageMobileUrl?: string;
  videoUrl?: string;
}

export interface HomepageSectionConfig {
  id: string;
  type: HomepageSectionType;
  enabled: boolean;
  title: string;
  subtitle?: string;
  maxItems?: number;
  displayOrder?: number;
  status?: 'active' | 'draft' | 'scheduled';
  startDate?: string;
  endDate?: string;
  selectedProductIds?: string[];
  category?: string;
  bannerUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  heroSlides?: HomepageHeroSlideConfig[];
  banners?: Banner[];
  layoutType?: HeroLayoutType;
  autoPlay?: boolean;
  autoPlaySpeed?: number;
  promoBannerConfig?: HomepagePromoBannerConfig;
  customBadge?: string;
}

export interface StorefrontHomepageConfig {
  lastUpdated?: string;
  storeName?: string;
  heroAnnouncementText?: string;
  sections: HomepageSectionConfig[];
}

export interface SystemSettings {
  // Legacy / Direct access properties
  currency: string;
  businessName: string;
  taxRate: number;
  enableSoundEffects: boolean;
  lowStockThreshold: number;
  lastUpdated?: string;

  // Granular Modular Configuration Sections
  business: BusinessSettings;
  currencyConfig: CurrencySettings;
  tax: TaxSettings;
  receipt: ReceiptSettings;
  invoiceNumbering: InvoiceNumberingSettings;
  pos: POSSettings;
  inventoryRules: InventoryRulesSettings;
  lowStock: LowStockSettings;
  order: OrderSettings;
  delivery: DeliverySettings;
  paymentMethods: PaymentMethodsSettings;
  notifications: NotificationSettings;
  userRolesSecurity: UserRolesSecuritySettings;
  integrations: IntegrationSettings;
  homepageConfig?: StorefrontHomepageConfig;
}

// ----------------------------------------------------------------------
// Reports & Analytics Domain Types
// ----------------------------------------------------------------------

export type ReportCategory = 'inventory' | 'sales' | 'financial';

export type InventoryReportSubTab = 
  | 'valuation'
  | 'low_stock'
  | 'out_of_stock'
  | 'dead_stock'
  | 'fast_moving'
  | 'slow_moving'
  | 'stock_movement'
  | 'stock_adjustments'
  | 'expiring_products';

export type SalesReportSubTab =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'by_product'
  | 'by_category'
  | 'by_cashier'
  | 'by_branch'
  | 'by_payment_method'
  | 'online_vs_pos';

export type FinancialReportSubTab =
  | 'executive_summary'
  | 'revenue'
  | 'gross_profit'
  | 'cogs'
  | 'discounts'
  | 'refunds'
  | 'tax'
  | 'outstanding_payments';

export type ReportSubTab = 
  | InventoryReportSubTab 
  | SalesReportSubTab 
  | FinancialReportSubTab
  | string;

export type ReportDatePreset = 
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'year_to_date'
  | 'all_time'
  | 'custom';

export interface BranchLocation {
  id: string;
  name: string;
  code: string;
  address: string;
  manager: string;
  phone: string;
  isActive: boolean;
  city?: string;
  type?: string;
}

export interface StockMovementRecord {
  id: string;
  date: string;
  productId: string;
  productName: string;
  sku: string;
  type: 
    | 'PO Received'
    | 'POS Sale'
    | 'Online Sale'
    | 'Inter-Branch Transfer'
    | 'Damage Write-Off'
    | 'Return to Inventory'
    | 'Audit Adjustment'
    | 'Manual Correction';
  quantityChange: number; // positive for addition, negative for deduction
  quantityBefore: number;
  quantityAfter: number;
  unitCost: number;
  totalCostImpact: number;
  location: string;
  referenceDoc?: string;
  performedBy: string;
  notes?: string;
}

export interface StockAdjustmentRecord {
  id: string;
  date: string;
  productId: string;
  productName: string;
  sku: string;
  location: string;
  systemQuantity: number;
  physicalQuantity: number;
  varianceQuantity: number;
  unitCost: number;
  varianceCost: number;
  reason: 
    | 'Physical Count Discrepancy'
    | 'Damaged Stock'
    | 'Shrinkage/Theft'
    | 'Expired Goods'
    | 'Vendor Packing Error'
    | 'System Calibration';
  adjustedBy: string;
  status: 'Approved' | 'Pending Review' | 'Draft';
  notes?: string;
}

export interface InventoryBatch {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  batchNumber: string;
  quantity: number;
  initialQuantity?: number;
  remainingQuantity?: number;
  manufacturingDate: string;
  expiryDate: string;
  daysUntilExpiry: number;
  status: 'Expired' | 'Critical (<30d)' | 'Warning (<90d)' | 'Good';
  location: string;
  unitCost: number;
  costPerUnit?: number;
  totalCostValue: number;
  retailPrice: number;
  totalRetailValue: number;
  supplierName?: string;
}

// ----------------------------------------------------------------------
// Database Architecture Models (Normalized Relational Schema)
// ----------------------------------------------------------------------

export interface DbProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  brand_id?: string;
  category_id?: string;
  product_type: 'standard' | 'variant' | 'composite' | 'bundle' | 'service' | string;
  status: 'active' | 'draft' | 'archived';
  track_inventory: boolean;
  track_serial: boolean;
  track_batch: boolean;
  track_expiry: boolean;
  base_unit_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DbProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  barcode?: string;
  cost_price: number;
  minimum_price?: number;
  weight?: number;
  status: 'active' | 'inactive';
}

export interface DbAttribute {
  id: string;
  name: string;
  type: 'select' | 'text' | 'number' | 'color' | string;
}

export interface DbAttributeValue {
  id: string;
  attribute_id: string;
  value: string;
}

export interface DbVariantAttributeValue {
  variant_id: string;
  attribute_value_id: string;
}

export interface DbProductMedia {
  id: string;
  product_id: string;
  variant_id?: string;
  url: string;
  type: 'image' | 'video' | string;
  sort_order: number;
  is_primary: boolean;
}

export interface DbCategory {
  id: string;
  parent_id?: string | null;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  status: 'active' | 'inactive';
}

export interface DbBrand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  status: 'active' | 'inactive';
}

export interface DbPriceList {
  id: string;
  name: string;
  type: 'retail' | 'wholesale' | 'dealer' | 'member' | string;
  currency: string;
  status: 'active' | 'inactive';
}

export interface DbVariantPrice {
  variant_id: string;
  price_list_id: string;
  price: number;
  effective_from?: string;
  effective_to?: string;
}


