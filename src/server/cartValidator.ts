import { Product, CouponCode, Customer, CouponValidationResult, CouponRuleCheck } from '../types';
import { INITIAL_PRODUCTS } from '../data/mockData';

export interface CartValidationItemInput {
  productId: string;
  variantSku?: string;
  quantity: number;
  clientPrice?: number; // Price sent by browser (NEVER TRUSTED)
  packagingUnitName?: string;
}

export interface CartValidationRequest {
  items: CartValidationItemInput[];
  couponCode?: string | null;
  customerId?: string | null;
  useLoyaltyPoints?: boolean;
  shippingMethod?: 'standard' | 'express' | 'pickup' | string;
  shippingAddress?: {
    addressLine1?: string;
    city?: string;
    stateProvince?: string;
    postalCode?: string;
    country?: string;
    isTaxExempt?: boolean;
  };
  productsCatalog?: Product[]; // Optional live catalog override
  customersCatalog?: Customer[]; // Optional live customers override
  couponsCatalog?: CouponCode[]; // Optional live coupons override
}

export interface PipelineStepLog {
  step: number;
  name: string;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  summary: string;
  details?: Record<string, any>;
}

export interface ValidatedLineItem {
  productId: string;
  productName: string;
  variantSku?: string;
  variantTitle?: string;
  quantity: number;
  serverUnitPrice: number;
  clientUnitPrice?: number;
  priceMismatchDetected: boolean;
  lineSubtotal: number;
  imageUrl?: string;
  stockAvailable: number;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export interface CartValidationResult {
  success: boolean;
  pipelineStep: string;
  pipelineLogs: PipelineStepLog[];
  items: ValidatedLineItem[];
  pricing: {
    serverSubtotal: number;
    clientReportedSubtotal?: number;
    subtotalDiscrepancy: number;
    couponDiscount: number;
    loyaltyDiscount: number;
    totalDiscount: number;
    shippingCost: number;
    shippingMethod: string;
    taxableAmount: number;
    taxRate: number;
    taxAmount: number;
    grandTotal: number;
    currency: string;
  };
  appliedPromotion: {
    coupon?: {
      code: string;
      discountType: string;
      value: number;
      appliedAmount: number;
      description: string;
      formattedDiscount?: string;
      displayText?: string;
    } | null;
    loyalty?: {
      pointsUsed: number;
      discountAmount: number;
      remainingPoints: number;
    } | null;
  };
  securityAudit: {
    browserPricesTrusted: false;
    serverAuthoritativePricingEnforced: true;
    priceTamperAttemptsDetected: number;
    validatedAt: string;
    securityChecksum: string;
  };
  errors: string[];
  warnings: string[];
}

// Authoritative Backend Registered Coupons
export const SERVER_PROMOTIONS_REGISTRY: CouponCode[] = [
  {
    id: 'cp_save20',
    code: 'SAVE20',
    discountType: 'fixed',
    value: 200,
    minSpend: 200,
    minOrderAmount: 200,
    description: 'Le 200 Instant Discount on Cart Orders Over Le 200',
    isActive: true,
    maxTotalUsage: 5000,
    currentUsageCount: 42,
    maxUsagePerCustomer: 5,
    customerUsageCounts: {}
  },
  {
    id: 'cp_coupon15',
    code: 'COUPON_15',
    discountType: 'percentage',
    value: 15,
    minSpend: 100,
    minOrderAmount: 100,
    description: '15% Off Your Entire Cart Order',
    isActive: true,
    maxTotalUsage: 10000,
    currentUsageCount: 156,
    maxUsagePerCustomer: 10,
    customerUsageCounts: {}
  },
  {
    id: 'cp_freeship',
    code: 'FREESHIP',
    discountType: 'free_shipping',
    value: 15,
    minSpend: 150,
    minOrderAmount: 150,
    description: 'Free Nationwide Express Shipping on Orders Over Le 150',
    isActive: true,
    maxTotalUsage: 2500,
    currentUsageCount: 88,
    maxUsagePerCustomer: 3,
    customerUsageCounts: {}
  },
  {
    id: 'cp_welcome10',
    code: 'WELCOME10',
    discountType: 'fixed',
    value: 50,
    minSpend: 100,
    minOrderAmount: 100,
    description: 'Le 50 Off First Online Order for New Customers',
    isActive: true,
    requiresAuth: true,
    maxTotalUsage: 1000,
    currentUsageCount: 12,
    maxUsagePerCustomer: 1,
    customerUsageCounts: {}
  },
  {
    id: 'cp_vip25',
    code: 'VIP25',
    discountType: 'percentage',
    value: 25,
    minSpend: 200,
    minOrderAmount: 200,
    description: '25% Off VIP Member Exclusive',
    isActive: true,
    requiresAuth: true,
    eligibleCustomerTiers: ['vip', 'gold', 'wholesale'],
    maxTotalUsage: 500,
    currentUsageCount: 19,
    maxUsagePerCustomer: 3,
    customerUsageCounts: {}
  },
  {
    id: 'cp_flash50',
    code: 'FLASH50',
    discountType: 'fixed',
    value: 50,
    minSpend: 300,
    minOrderAmount: 300,
    description: 'Le 50 Off Orders Over Le 300',
    isActive: true,
    maxTotalUsage: 2000,
    currentUsageCount: 110,
    maxUsagePerCustomer: 2,
    customerUsageCounts: {}
  },
  {
    id: 'cp_tech10',
    code: 'TECH10',
    discountType: 'percentage',
    value: 10,
    description: '10% Off All Electronics & Audio Hardware',
    isActive: true,
    eligibleCategoryIds: ['electronics', 'audio', 'tech', 'smartphones', 'accessories'],
    maxTotalUsage: 3000,
    currentUsageCount: 24,
    maxUsagePerCustomer: 5,
    customerUsageCounts: {}
  },
  {
    id: 'cp_expired_deal',
    code: 'EXPIRED_DEAL',
    discountType: 'fixed',
    value: 100,
    description: 'Special Seasonal Discount (Expired)',
    isActive: true,
    expiryDate: '2024-01-01T00:00:00.000Z',
    maxTotalUsage: 100,
    currentUsageCount: 100
  },
  {
    id: 'cp_inactive_promo',
    code: 'INACTIVE_PROMO',
    discountType: 'fixed',
    value: 50,
    description: 'Deactivated Promotional Code',
    isActive: false
  },
  {
    id: 'cp_limited_max',
    code: 'LIMITED_MAX',
    discountType: 'fixed',
    value: 75,
    description: 'Promo with Exhausted Global Quota',
    isActive: true,
    maxTotalUsage: 10,
    currentUsageCount: 10
  }
];

export interface ValidateCouponAuthoritativeParams {
  couponCode: string;
  cartItems: {
    productId: string;
    variantSku?: string;
    quantity: number;
    price?: number;
    name?: string;
    category?: string;
  }[];
  authoritativeSubtotal: number;
  customerId?: string | null;
  customer?: Customer | null;
  customersCatalog?: Customer[];
  catalogProducts?: Product[];
  couponsRegistry?: CouponCode[];
  shippingCost?: number;
}

/**
 * Authoritative 8-Rule Backend Coupon Validation Engine
 * 
 * Validates:
 * 1. Coupon exists
 * 2. Active
 * 3. Not expired
 * 4. Customer eligible
 * 5. Minimum order
 * 6. Product eligibility
 * 7. Usage limit
 * 8. Customer usage limit
 * 
 * Returns exact formatted result (e.g. "Discount applied: -Le 200")
 */
export function validateCouponAuthoritative(params: ValidateCouponAuthoritativeParams): CouponValidationResult {
  const {
    couponCode,
    cartItems = [],
    authoritativeSubtotal = 0,
    customerId,
    customer: directCustomer,
    customersCatalog = [],
    catalogProducts = INITIAL_PRODUCTS,
    couponsRegistry = SERVER_PROMOTIONS_REGISTRY,
    shippingCost = 15.00
  } = params;

  const cleanCode = (couponCode || '').trim().toUpperCase();
  const ruleChecks: CouponRuleCheck[] = [];

  // Match customer from ID or direct object
  const activeCustomer = directCustomer || (customerId ? customersCatalog.find(c => c.id === customerId) : null);

  // -------------------------------------------------------------------------
  // RULE 1: Coupon exists
  // -------------------------------------------------------------------------
  const couponMatch = couponsRegistry.find(c => c.code.toUpperCase() === cleanCode);

  if (!cleanCode || !couponMatch) {
    ruleChecks.push({
      rule: 'exists',
      label: '1. Coupon Exists',
      passed: false,
      message: `Coupon "${cleanCode || 'EMPTY'}" does not exist in the authoritative database registry.`
    });

    return {
      valid: false,
      code: cleanCode,
      discountAmount: 0,
      formattedDiscount: '-Le 0',
      displayText: 'Coupon does not exist',
      message: `Coupon "${cleanCode}" does not exist.`,
      errorCode: 'COUPON_NOT_FOUND',
      errorMessage: `Coupon "${cleanCode}" does not exist in our promotional database.`,
      applicableSubtotal: 0,
      isFreeShipping: false,
      ruleChecks
    };
  }

  ruleChecks.push({
    rule: 'exists',
    label: '1. Coupon Exists',
    passed: true,
    message: `Coupon code "${couponMatch.code}" verified in backend promotions registry.`
  });

  // -------------------------------------------------------------------------
  // RULE 2: Active
  // -------------------------------------------------------------------------
  if (couponMatch.isActive === false) {
    ruleChecks.push({
      rule: 'active',
      label: '2. Active Status',
      passed: false,
      message: `Coupon "${couponMatch.code}" is currently disabled / deactivated by administration.`
    });

    return {
      valid: false,
      code: couponMatch.code,
      coupon: couponMatch,
      discountAmount: 0,
      formattedDiscount: '-Le 0',
      displayText: 'Coupon is inactive',
      message: `Coupon "${couponMatch.code}" is currently inactive.`,
      errorCode: 'COUPON_INACTIVE',
      errorMessage: `Coupon "${couponMatch.code}" is currently deactivated.`,
      applicableSubtotal: 0,
      isFreeShipping: false,
      ruleChecks
    };
  }

  ruleChecks.push({
    rule: 'active',
    label: '2. Active Status',
    passed: true,
    message: `Coupon "${couponMatch.code}" is active and enabled for settlement.`
  });

  // -------------------------------------------------------------------------
  // RULE 3: Not expired
  // -------------------------------------------------------------------------
  const now = Date.now();
  if (couponMatch.startDate && new Date(couponMatch.startDate).getTime() > now) {
    ruleChecks.push({
      rule: 'not_expired',
      label: '3. Schedule & Expiration',
      passed: false,
      message: `Coupon "${couponMatch.code}" has not started yet (valid from ${new Date(couponMatch.startDate).toLocaleDateString()}).`
    });

    return {
      valid: false,
      code: couponMatch.code,
      coupon: couponMatch,
      discountAmount: 0,
      formattedDiscount: '-Le 0',
      displayText: 'Coupon not started',
      message: `Coupon "${couponMatch.code}" is not active yet (starts on ${new Date(couponMatch.startDate).toLocaleDateString()}).`,
      errorCode: 'COUPON_NOT_STARTED',
      errorMessage: `Coupon "${couponMatch.code}" is scheduled for a future promotion date.`,
      applicableSubtotal: 0,
      isFreeShipping: false,
      ruleChecks
    };
  }

  if (couponMatch.expiryDate && new Date(couponMatch.expiryDate).getTime() < now) {
    ruleChecks.push({
      rule: 'not_expired',
      label: '3. Schedule & Expiration',
      passed: false,
      message: `Coupon "${couponMatch.code}" expired on ${new Date(couponMatch.expiryDate).toLocaleDateString()}.`
    });

    return {
      valid: false,
      code: couponMatch.code,
      coupon: couponMatch,
      discountAmount: 0,
      formattedDiscount: '-Le 0',
      displayText: 'Coupon expired',
      message: `Coupon "${couponMatch.code}" expired on ${new Date(couponMatch.expiryDate).toLocaleDateString()}.`,
      errorCode: 'COUPON_EXPIRED',
      errorMessage: `Coupon "${couponMatch.code}" has expired and can no longer be redeemed.`,
      applicableSubtotal: 0,
      isFreeShipping: false,
      ruleChecks
    };
  }

  ruleChecks.push({
    rule: 'not_expired',
    label: '3. Schedule & Expiration',
    passed: true,
    message: couponMatch.expiryDate 
      ? `Within valid promotion timeframe (Expires ${new Date(couponMatch.expiryDate).toLocaleDateString()}).`
      : 'Within valid open promotion timeframe (No expiration).'
  });

  // -------------------------------------------------------------------------
  // RULE 4: Customer eligible
  // -------------------------------------------------------------------------
  if (couponMatch.requiresAuth && !activeCustomer) {
    ruleChecks.push({
      rule: 'customer_eligible',
      label: '4. Customer Eligibility',
      passed: false,
      message: `Coupon "${couponMatch.code}" requires a signed-in customer account.`
    });

    return {
      valid: false,
      code: couponMatch.code,
      coupon: couponMatch,
      discountAmount: 0,
      formattedDiscount: '-Le 0',
      displayText: 'Customer sign-in required',
      message: `Coupon "${couponMatch.code}" is exclusive to signed-in customers. Please sign in to apply.`,
      errorCode: 'AUTH_REQUIRED',
      errorMessage: `Coupon "${couponMatch.code}" requires an active customer profile.`,
      applicableSubtotal: 0,
      isFreeShipping: false,
      ruleChecks
    };
  }

  if (couponMatch.eligibleCustomerIds && couponMatch.eligibleCustomerIds.length > 0) {
    const isTargetCustomer = activeCustomer && (
      couponMatch.eligibleCustomerIds.includes(activeCustomer.id) ||
      (activeCustomer.email && couponMatch.eligibleCustomerIds.includes(activeCustomer.email.toLowerCase()))
    );

    if (!isTargetCustomer) {
      ruleChecks.push({
        rule: 'customer_eligible',
        label: '4. Customer Eligibility',
        passed: false,
        message: `Coupon "${couponMatch.code}" is reserved for specific invited customer accounts.`
      });

      return {
        valid: false,
        code: couponMatch.code,
        coupon: couponMatch,
        discountAmount: 0,
        formattedDiscount: '-Le 0',
        displayText: 'Customer not eligible',
        message: `Your account is not eligible for coupon "${couponMatch.code}".`,
        errorCode: 'CUSTOMER_NOT_ELIGIBLE',
        errorMessage: `Coupon "${couponMatch.code}" is reserved for targeted customer accounts.`,
        applicableSubtotal: 0,
        isFreeShipping: false,
        ruleChecks
      };
    }
  }

  if (couponMatch.eligibleCustomerTiers && couponMatch.eligibleCustomerTiers.length > 0) {
    const customerSegment = (activeCustomer?.segment || '').toLowerCase();
    const isVipPoints = Boolean(activeCustomer?.loyaltyPoints && activeCustomer.loyaltyPoints >= 100);
    const effectiveTier = isVipPoints ? 'vip' : customerSegment || 'regular';

    const hasMatchingTier = couponMatch.eligibleCustomerTiers
      .map(t => t.toLowerCase())
      .some(tier => tier === effectiveTier || tier === customerSegment);

    if (!hasMatchingTier) {
      ruleChecks.push({
        rule: 'customer_eligible',
        label: '4. Customer Eligibility',
        passed: false,
        message: `Coupon "${couponMatch.code}" is exclusive to [${couponMatch.eligibleCustomerTiers.join(', ')}] tier members (Current: ${effectiveTier || 'Standard'}).`
      });

      return {
        valid: false,
        code: couponMatch.code,
        coupon: couponMatch,
        discountAmount: 0,
        formattedDiscount: '-Le 0',
        displayText: 'Tier eligibility required',
        message: `Coupon "${couponMatch.code}" is exclusive to ${couponMatch.eligibleCustomerTiers.join(', ')} tier customers.`,
        errorCode: 'CUSTOMER_NOT_ELIGIBLE',
        errorMessage: `Exclusive to ${couponMatch.eligibleCustomerTiers.join(', ')} tier customers.`,
        applicableSubtotal: 0,
        isFreeShipping: false,
        ruleChecks
      };
    }
  }

  ruleChecks.push({
    rule: 'customer_eligible',
    label: '4. Customer Eligibility',
    passed: true,
    message: activeCustomer 
      ? `Customer account (${activeCustomer.name}) is fully eligible.` 
      : 'Public coupon open to all shoppers.'
  });

  // -------------------------------------------------------------------------
  // RULE 5: Minimum order
  // -------------------------------------------------------------------------
  const minOrderRequirement = couponMatch.minOrderAmount ?? couponMatch.minSpend ?? 0;

  if (minOrderRequirement > 0 && authoritativeSubtotal < minOrderRequirement) {
    ruleChecks.push({
      rule: 'minimum_order',
      label: '5. Minimum Order Requirement',
      passed: false,
      message: `Coupon "${couponMatch.code}" requires a minimum order of Le ${minOrderRequirement.toLocaleString()} (Current subtotal: Le ${authoritativeSubtotal.toLocaleString()}).`
    });

    return {
      valid: false,
      code: couponMatch.code,
      coupon: couponMatch,
      discountAmount: 0,
      formattedDiscount: '-Le 0',
      displayText: `Min order Le ${minOrderRequirement} required`,
      message: `Coupon "${couponMatch.code}" requires a minimum order of Le ${minOrderRequirement.toLocaleString()} (Current: Le ${authoritativeSubtotal.toLocaleString()}).`,
      errorCode: 'MINIMUM_ORDER_NOT_MET',
      errorMessage: `Requires minimum order of Le ${minOrderRequirement.toLocaleString()}. Add Le ${(minOrderRequirement - authoritativeSubtotal).toLocaleString()} more to apply.`,
      applicableSubtotal: authoritativeSubtotal,
      isFreeShipping: false,
      ruleChecks
    };
  }

  ruleChecks.push({
    rule: 'minimum_order',
    label: '5. Minimum Order Requirement',
    passed: true,
    message: minOrderRequirement > 0
      ? `Current subtotal Le ${authoritativeSubtotal.toLocaleString()} meets minimum order of Le ${minOrderRequirement.toLocaleString()}.`
      : 'No minimum order spend requirement.'
  });

  // -------------------------------------------------------------------------
  // RULE 6: Product eligibility
  // -------------------------------------------------------------------------
  let applicableSubtotal = authoritativeSubtotal;
  const hasProductRestrictions = Boolean(
    (couponMatch.eligibleProductIds && couponMatch.eligibleProductIds.length > 0) ||
    (couponMatch.eligibleCategoryIds && couponMatch.eligibleCategoryIds.length > 0) ||
    (couponMatch.excludedProductIds && couponMatch.excludedProductIds.length > 0)
  );

  if (hasProductRestrictions && cartItems.length > 0) {
    const eligibleCartItems = cartItems.filter(item => {
      const catalogItem = catalogProducts.find(p => p.id === item.productId);
      const itemCategory = (item.category || catalogItem?.category || '').toLowerCase();

      // Check excluded products
      if (couponMatch.excludedProductIds?.includes(item.productId)) {
        return false;
      }

      // Check eligible products list
      if (couponMatch.eligibleProductIds && couponMatch.eligibleProductIds.length > 0) {
        if (!couponMatch.eligibleProductIds.includes(item.productId)) {
          return false;
        }
      }

      // Check eligible categories list
      if (couponMatch.eligibleCategoryIds && couponMatch.eligibleCategoryIds.length > 0) {
        const matchesCategory = couponMatch.eligibleCategoryIds
          .map(c => c.toLowerCase())
          .some(c => itemCategory.includes(c) || c.includes(itemCategory));
        if (!matchesCategory) {
          return false;
        }
      }

      return true;
    });

    if (eligibleCartItems.length === 0) {
      ruleChecks.push({
        rule: 'product_eligibility',
        label: '6. Product & Category Eligibility',
        passed: false,
        message: `Cart contains no products eligible for coupon "${couponMatch.code}".`
      });

      return {
        valid: false,
        code: couponMatch.code,
        coupon: couponMatch,
        discountAmount: 0,
        formattedDiscount: '-Le 0',
        displayText: 'No eligible products in cart',
        message: `Cart contains no items eligible for coupon "${couponMatch.code}".`,
        errorCode: 'NO_ELIGIBLE_PRODUCTS',
        errorMessage: `Coupon "${couponMatch.code}" only applies to specific eligible products or categories.`,
        applicableSubtotal: 0,
        isFreeShipping: false,
        ruleChecks
      };
    }

    // Calculate subtotal of strictly eligible items
    applicableSubtotal = eligibleCartItems.reduce((sum, item) => {
      const itemPrice = item.price || catalogProducts.find(p => p.id === item.productId)?.price || 0;
      return sum + (itemPrice * item.quantity);
    }, 0);

    ruleChecks.push({
      rule: 'product_eligibility',
      label: '6. Product & Category Eligibility',
      passed: true,
      message: `${eligibleCartItems.length} eligible item(s) found in cart (Eligible subtotal: Le ${applicableSubtotal.toLocaleString()}).`
    });
  } else {
    ruleChecks.push({
      rule: 'product_eligibility',
      label: '6. Product & Category Eligibility',
      passed: true,
      message: 'Applies storewide to all products and catalog categories.'
    });
  }

  // -------------------------------------------------------------------------
  // RULE 7: Usage limit (Global)
  // -------------------------------------------------------------------------
  if (couponMatch.maxTotalUsage !== undefined && (couponMatch.currentUsageCount || 0) >= couponMatch.maxTotalUsage) {
    ruleChecks.push({
      rule: 'usage_limit',
      label: '7. Global Total Usage Limit',
      passed: false,
      message: `Coupon "${couponMatch.code}" has reached its maximum global redemption limit (${couponMatch.maxTotalUsage} uses).`
    });

    return {
      valid: false,
      code: couponMatch.code,
      coupon: couponMatch,
      discountAmount: 0,
      formattedDiscount: '-Le 0',
      displayText: 'Usage limit reached',
      message: `Coupon "${couponMatch.code}" has reached its total maximum usage limit (${couponMatch.maxTotalUsage}).`,
      errorCode: 'USAGE_LIMIT_EXCEEDED',
      errorMessage: `Promotion has expired due to reaching its total redemption capacity.`,
      applicableSubtotal: 0,
      isFreeShipping: false,
      ruleChecks
    };
  }

  ruleChecks.push({
    rule: 'usage_limit',
    label: '7. Global Total Usage Limit',
    passed: true,
    message: couponMatch.maxTotalUsage
      ? `Within total usage quota (${couponMatch.currentUsageCount || 0} / ${couponMatch.maxTotalUsage} claimed).`
      : 'Unlimited global redemptions available.'
  });

  // -------------------------------------------------------------------------
  // RULE 8: Customer usage limit (Per-Customer)
  // -------------------------------------------------------------------------
  if (couponMatch.maxUsagePerCustomer !== undefined) {
    const customerIdentifier = activeCustomer?.id || activeCustomer?.email || customerId;
    const currentCustomerRedemptions = customerIdentifier && couponMatch.customerUsageCounts
      ? (couponMatch.customerUsageCounts[customerIdentifier] || 0)
      : 0;

    if (currentCustomerRedemptions >= couponMatch.maxUsagePerCustomer) {
      ruleChecks.push({
        rule: 'customer_usage_limit',
        label: '8. Customer Usage Limit',
        passed: false,
        message: `You have reached the maximum allowed redemption limit (${couponMatch.maxUsagePerCustomer} per customer) for coupon "${couponMatch.code}".`
      });

      return {
        valid: false,
        code: couponMatch.code,
        coupon: couponMatch,
        discountAmount: 0,
        formattedDiscount: '-Le 0',
        displayText: 'Personal limit exceeded',
        message: `You have already used coupon "${couponMatch.code}" the maximum allowed number of times (${couponMatch.maxUsagePerCustomer}).`,
        errorCode: 'CUSTOMER_USAGE_LIMIT_EXCEEDED',
        errorMessage: `You have used this coupon the maximum allowed times (${couponMatch.maxUsagePerCustomer} per customer).`,
        applicableSubtotal: 0,
        isFreeShipping: false,
        ruleChecks
      };
    }

    ruleChecks.push({
      rule: 'customer_usage_limit',
      label: '8. Customer Usage Limit',
      passed: true,
      message: `Within allowed per-customer redemptions (${currentCustomerRedemptions} / ${couponMatch.maxUsagePerCustomer} used).`
    });
  } else {
    ruleChecks.push({
      rule: 'customer_usage_limit',
      label: '8. Customer Usage Limit',
      passed: true,
      message: 'No per-customer usage cap enforced.'
    });
  }

  // -------------------------------------------------------------------------
  // ALL 8 RULES PASSED: Compute Definitive Discount & Formatted Return
  // -------------------------------------------------------------------------
  let discountAmount = 0;
  let isFreeShipping = false;

  if (couponMatch.discountType === 'percentage') {
    discountAmount = Number(((applicableSubtotal * couponMatch.value) / 100).toFixed(2));
  } else if (couponMatch.discountType === 'fixed') {
    discountAmount = Number(Math.min(applicableSubtotal, couponMatch.value).toFixed(2));
  } else if (couponMatch.discountType === 'free_shipping') {
    isFreeShipping = true;
    discountAmount = Number(shippingCost.toFixed(2));
  }

  // Format currency output precisely as required: e.g. "Discount applied: -Le 200"
  const formattedVal = discountAmount % 1 === 0 
    ? discountAmount.toLocaleString() 
    : discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formattedDiscount = `-Le ${formattedVal}`;
  const displayText = isFreeShipping 
    ? 'Discount applied: Free Shipping' 
    : `Discount applied: -Le ${formattedVal}`;

  return {
    valid: true,
    code: couponMatch.code,
    coupon: {
      ...couponMatch,
      appliedAmount: discountAmount
    },
    discountAmount,
    formattedDiscount,
    displayText,
    message: displayText,
    applicableSubtotal,
    isFreeShipping,
    ruleChecks
  };
}

/**
 * Backend Authoritative Cart Validation Pipeline
 * 
 * Pipeline Flow:
 * Cart
 *  ↓
 * Validate Products
 *  ↓
 * Validate Prices (NEVER trust browser prices)
 *  ↓
 * Validate Promotions
 *  ↓
 * Validate Stock
 *  ↓
 * Calculate Shipping
 *  ↓
 * Calculate Taxes
 *  ↓
 * Calculate Total
 */
export function validateCartBackend(
  payload: CartValidationRequest
): CartValidationResult {
  const {
    items = [],
    couponCode = null,
    customerId = null,
    useLoyaltyPoints = false,
    shippingMethod = 'standard',
    shippingAddress = {},
    productsCatalog = INITIAL_PRODUCTS,
    customersCatalog = []
  } = payload;

  const catalog = (productsCatalog && productsCatalog.length > 0) ? productsCatalog : INITIAL_PRODUCTS;
  const pipelineLogs: PipelineStepLog[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const validatedItems: ValidatedLineItem[] = [];

  let clientReportedSubtotal = 0;
  let priceTamperCount = 0;

  // =========================================================================
  // STEP 1: VALIDATE PRODUCTS
  // =========================================================================
  if (!items || !Array.isArray(items) || items.length === 0) {
    errors.push('Cart is empty. Please add items to checkout.');
    pipelineLogs.push({
      step: 1,
      name: 'Validate Products',
      status: 'failed',
      summary: 'Cart contains no items.',
      details: { itemsCount: 0 }
    });

    return createFailureResponse('Validate Products', pipelineLogs, errors, warnings);
  }

  let productsValid = true;
  const matchedCatalogEntries: Array<{
    input: CartValidationItemInput;
    product: Product;
    variant?: any;
  }> = [];

  for (const item of items) {
    if (!item.productId) {
      errors.push('Invalid cart item: missing Product ID.');
      productsValid = false;
      continue;
    }

    if (item.quantity <= 0 || !Number.isFinite(item.quantity)) {
      errors.push(`Invalid quantity (${item.quantity}) for product ID: ${item.productId}. Must be at least 1.`);
      productsValid = false;
      continue;
    }

    const product = catalog.find(p => p.id === item.productId || p.sku === item.productId);
    if (!product) {
      errors.push(`Product not found in server catalog: ${item.productId}.`);
      productsValid = false;
      continue;
    }

    let matchedVariant = undefined;
    if (item.variantSku) {
      if (product.variants && Array.isArray(product.variants)) {
        matchedVariant = product.variants.find(v => v.sku === item.variantSku || v.id === item.variantSku);
      }
      if (!matchedVariant) {
        errors.push(`Variant SKU "${item.variantSku}" not found on product "${product.name}".`);
        productsValid = false;
        continue;
      }
    }

    matchedCatalogEntries.push({
      input: item,
      product,
      variant: matchedVariant
    });
  }

  if (!productsValid || matchedCatalogEntries.length === 0) {
    pipelineLogs.push({
      step: 1,
      name: 'Validate Products',
      status: 'failed',
      summary: `Failed product validation with ${errors.length} error(s).`,
      details: { totalItems: items.length, errors }
    });
    return createFailureResponse('Validate Products', pipelineLogs, errors, warnings);
  }

  pipelineLogs.push({
    step: 1,
    name: 'Validate Products',
    status: 'passed',
    summary: `Verified ${matchedCatalogEntries.length} product(s) and variant SKUs in server catalog.`,
    details: {
      verifiedItemsCount: matchedCatalogEntries.length,
      productIds: matchedCatalogEntries.map(m => m.product.id)
    }
  });

  // =========================================================================
  // STEP 2: VALIDATE PRICES (Never Trust Browser Prices!)
  // =========================================================================
  let authoritativeSubtotal = 0;

  for (const entry of matchedCatalogEntries) {
    const { input, product, variant } = entry;
    
    // Server Authoritative Price Lookup
    let serverPrice = product.price;
    if (variant && typeof variant.price === 'number' && variant.price > 0) {
      serverPrice = variant.price;
    }

    // Handle Packaging Units multiplier if specified
    if (input.packagingUnitName && (product as any).packaging_units?.units) {
      const pUnit = (product as any).packaging_units.units.find(
        (u: any) => u.unitName === input.packagingUnitName
      );
      if (pUnit && typeof pUnit.price === 'number' && pUnit.price > 0) {
        serverPrice = pUnit.price;
      }
    }

    // Check for Browser Price Tampering / Mismatch
    let priceMismatch = false;
    if (typeof input.clientPrice === 'number') {
      clientReportedSubtotal += input.clientPrice * input.quantity;
      const diff = Math.abs(input.clientPrice - serverPrice);
      if (diff > 0.009) {
        priceMismatch = true;
        priceTamperCount++;
        warnings.push(
          `Security Alert: Browser sent $${input.clientPrice.toFixed(2)} for "${product.name}" (${variant?.sku || 'Base'}). Overridden with authoritative server price: $${serverPrice.toFixed(2)}.`
        );
      }
    } else {
      clientReportedSubtotal += serverPrice * input.quantity;
    }

    const lineSubtotal = Number((serverPrice * input.quantity).toFixed(2));
    authoritativeSubtotal += lineSubtotal;

    // Available stock computation for later step
    let onHand = 0;
    let reserved = 0;
    if (variant) {
      onHand = typeof variant.onHand === 'number' ? variant.onHand : (variant.stock ?? 0);
      reserved = typeof variant.reserved === 'number' ? variant.reserved : Math.round(onHand * 0.15);
    } else {
      onHand = typeof product.onHand === 'number' ? product.onHand : (product.stock ?? 0);
      reserved = typeof product.reserved === 'number' ? product.reserved : Math.round(onHand * 0.15);
    }
    const available = Math.max(0, onHand - reserved);

    let stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK';
    if (available <= 0) {
      stockStatus = 'OUT_OF_STOCK';
    } else if (available <= (product.reorderPoint || 5)) {
      stockStatus = 'LOW_STOCK';
    }

    validatedItems.push({
      productId: product.id,
      productName: product.name,
      variantSku: variant?.sku,
      variantTitle: variant?.title || variant?.name,
      quantity: input.quantity,
      serverUnitPrice: serverPrice,
      clientUnitPrice: input.clientPrice,
      priceMismatchDetected: priceMismatch,
      lineSubtotal,
      imageUrl: variant?.imageUrl || product.imageUrl,
      stockAvailable: available,
      stockStatus
    });
  }

  authoritativeSubtotal = Number(authoritativeSubtotal.toFixed(2));
  clientReportedSubtotal = Number(clientReportedSubtotal.toFixed(2));

  pipelineLogs.push({
    step: 2,
    name: 'Validate Prices',
    status: priceTamperCount > 0 ? 'warning' : 'passed',
    summary: priceTamperCount > 0
      ? `Enforced server authoritative pricing. ${priceTamperCount} browser price discrepancy/tamper attempt(s) corrected.`
      : `Authoritative server prices verified. Subtotal: $${authoritativeSubtotal.toFixed(2)}.`,
    details: {
      authoritativeSubtotal,
      clientReportedSubtotal,
      priceDiscrepancy: Number((clientReportedSubtotal - authoritativeSubtotal).toFixed(2)),
      priceTamperCount
    }
  });

  // =========================================================================
  // STEP 3: VALIDATE PROMOTIONS (8-Rule Coupon Validation & Loyalty Points)
  // =========================================================================
  let couponDiscount = 0;
  let isFreeShippingFromCoupon = false;
  let appliedCouponData: any = null;
  let couponValidationDetail: CouponValidationResult | null = null;

  if (couponCode && couponCode.trim()) {
    const couponValidationResult = validateCouponAuthoritative({
      couponCode,
      cartItems: matchedCatalogEntries.map(e => ({
        productId: e.product.id,
        variantSku: e.variant?.sku,
        quantity: e.input.quantity,
        price: e.product.price,
        name: e.product.name,
        category: e.product.category
      })),
      authoritativeSubtotal,
      customerId,
      customersCatalog,
      catalogProducts: catalog,
      couponsRegistry: payload.couponsCatalog || SERVER_PROMOTIONS_REGISTRY,
      shippingCost: 15.00
    });

    couponValidationDetail = couponValidationResult;

    if (!couponValidationResult.valid) {
      warnings.push(`Coupon check failed: ${couponValidationResult.message}`);
    } else {
      couponDiscount = couponValidationResult.discountAmount;
      isFreeShippingFromCoupon = couponValidationResult.isFreeShipping;
      appliedCouponData = {
        code: couponValidationResult.code,
        discountType: couponValidationResult.coupon?.discountType || 'percentage',
        value: couponValidationResult.coupon?.value || 0,
        appliedAmount: couponDiscount,
        description: couponValidationResult.coupon?.description || '',
        formattedDiscount: couponValidationResult.formattedDiscount,
        displayText: couponValidationResult.displayText
      };
    }
  }

  // Loyalty Points Promotion Validation
  let loyaltyDiscount = 0;
  let appliedLoyaltyData: any = null;

  if (useLoyaltyPoints && customerId) {
    const matchedCustomer = customersCatalog.find(c => c.id === customerId);
    const customerPoints = matchedCustomer ? matchedCustomer.loyaltyPoints : 0;

    if (customerPoints > 0) {
      const maxLoyaltyDollar = customerPoints * 0.05; // 1 pt = $0.05
      const remainingPayable = Math.max(0, authoritativeSubtotal - couponDiscount);
      loyaltyDiscount = Number(Math.min(remainingPayable, maxLoyaltyDollar).toFixed(2));
      const pointsRedeemed = Math.ceil(loyaltyDiscount / 0.05);

      appliedLoyaltyData = {
        pointsUsed: pointsRedeemed,
        discountAmount: loyaltyDiscount,
        remainingPoints: Math.max(0, customerPoints - pointsRedeemed)
      };
    }
  }

  const totalDiscount = Number((couponDiscount + loyaltyDiscount).toFixed(2));

  pipelineLogs.push({
    step: 3,
    name: 'Validate Promotions',
    status: couponCode && !appliedCouponData ? 'warning' : 'passed',
    summary: totalDiscount > 0 || isFreeShippingFromCoupon
      ? `Promotions applied: Coupon (${appliedCouponData?.displayText || `-$${couponDiscount.toFixed(2)}`}), Loyalty (-$${loyaltyDiscount.toFixed(2)}).`
      : (couponValidationDetail && !couponValidationDetail.valid 
          ? `Coupon "${couponCode}" rejected: ${couponValidationDetail.message}`
          : 'No active coupons or loyalty points claimed.'),
    details: {
      couponDiscount,
      loyaltyDiscount,
      totalDiscount,
      isFreeShippingFromCoupon,
      appliedCoupon: appliedCouponData?.code || null,
      couponValidation: couponValidationDetail
    }
  });

  // =========================================================================
  // STEP 4: VALIDATE STOCK (Including Bundle Decomposition)
  // =========================================================================
  let stockValid = true;
  
  // Accumulate required quantities for base products
  const requiredStockMap = new Map<string, number>();

  for (const item of validatedItems) {
    const catalogProduct = catalog.find(p => p.id === item.productId);
    if (catalogProduct) {
      if (catalogProduct.productType === 'Bundle' && catalogProduct.bundleKitItems) {
        // Decompose bundle into required components
        for (const kitItem of catalogProduct.bundleKitItems) {
          if (kitItem.productId) {
            const currentReq = requiredStockMap.get(kitItem.productId) || 0;
            requiredStockMap.set(kitItem.productId, currentReq + (kitItem.quantity * item.quantity));
          }
        }
      } else if (catalogProduct.productType !== 'Service' && catalogProduct.productType !== 'Digital') {
        // Standard physical product
        const currentReq = requiredStockMap.get(catalogProduct.id) || 0;
        requiredStockMap.set(catalogProduct.id, currentReq + item.quantity);
      }
    }
  }

  // Check the accumulated map against catalog stock
  requiredStockMap.forEach((requiredQty, productId) => {
    const catalogProduct = catalog.find(p => p.id === productId);
    if (catalogProduct) {
      // Find what cart item caused this
      const cartItem = validatedItems.find(i => 
        i.productId === productId || 
        (catalog.find(p => p.id === i.productId)?.bundleKitItems?.some((b: any) => b.productId === productId))
      );
      
      if (catalogProduct.stock < requiredQty) {
        if (!catalogProduct.allowBackorder) {
          errors.push(
            `Insufficient Stock: "${cartItem ? cartItem.productName : catalogProduct.name}" requires ${requiredQty} total units of component "${catalogProduct.name}" but only ${catalogProduct.stock} are available.`
          );
          stockValid = false;
        } else {
          warnings.push(
            `Backorder Notice: Component "${catalogProduct.name}" is on backorder. ${requiredQty - catalogProduct.stock} item(s) will ship as soon as restocked.`
          );
        }
      }
    }
  });

  if (!stockValid) {
    pipelineLogs.push({
      step: 4,
      name: 'Validate Stock',
      status: 'failed',
      summary: 'Inventory stock check failed. One or more items exceed live available inventory.',
      details: { errors }
    });
    return createFailureResponse('Validate Stock', pipelineLogs, errors, warnings, validatedItems, authoritativeSubtotal);
  }

  pipelineLogs.push({
    step: 4,
    name: 'Validate Stock',
    status: 'passed',
    summary: `Stock levels verified for all ${validatedItems.length} line item(s).`,
    details: {
      itemsChecked: validatedItems.map(i => ({
        sku: i.variantSku || i.productId,
        requested: i.quantity,
        available: i.stockAvailable
      }))
    }
  });

  // =========================================================================
  // STEP 5: CALCULATE SHIPPING
  // =========================================================================
  let shippingCost = 0;
  const normalizedShipping = (shippingMethod || 'standard').toLowerCase();

  if (normalizedShipping === 'pickup') {
    shippingCost = 0.00;
  } else if (normalizedShipping === 'express') {
    shippingCost = 25.00;
  } else {
    // Standard Ground
    if (authoritativeSubtotal >= 150 || isFreeShippingFromCoupon) {
      shippingCost = 0.00;
    } else {
      shippingCost = 15.00;
    }
  }

  pipelineLogs.push({
    step: 5,
    name: 'Calculate Shipping',
    status: 'passed',
    summary: shippingCost === 0
      ? `FREE shipping qualified (${normalizedShipping.toUpperCase()}).`
      : `Shipping calculated at $${shippingCost.toFixed(2)} (${normalizedShipping.toUpperCase()}).`,
    details: {
      shippingMethod: normalizedShipping,
      shippingCost,
      isFreeShippingFromCoupon,
      freeShippingThreshold: 150
    }
  });

  // =========================================================================
  // STEP 6: CALCULATE TAXES
  // =========================================================================
  const taxableAmount = Math.max(0, authoritativeSubtotal - totalDiscount);
  const isTaxExempt = Boolean(shippingAddress?.isTaxExempt);
  const taxRate = isTaxExempt ? 0.00 : 0.08; // 8% sales tax default
  const taxAmount = isTaxExempt ? 0.00 : Number((taxableAmount * taxRate).toFixed(2));

  pipelineLogs.push({
    step: 6,
    name: 'Calculate Taxes',
    status: 'passed',
    summary: isTaxExempt 
      ? 'Tax exemption verified (0%).' 
      : `Calculated 8% sales tax ($${taxAmount.toFixed(2)}) on taxable base of $${taxableAmount.toFixed(2)}.`,
    details: {
      taxableAmount,
      taxRate,
      taxAmount,
      isTaxExempt
    }
  });

  // =========================================================================
  // STEP 7: CALCULATE TOTAL
  // =========================================================================
  const grandTotal = Number(
    Math.max(0, authoritativeSubtotal - totalDiscount + shippingCost + taxAmount).toFixed(2)
  );

  pipelineLogs.push({
    step: 7,
    name: 'Calculate Total',
    status: 'passed',
    summary: `Final Grand Total validated: $${grandTotal.toFixed(2)} (Subtotal: $${authoritativeSubtotal.toFixed(2)}, Savings: -$${totalDiscount.toFixed(2)}, Shipping: $${shippingCost.toFixed(2)}, Tax: $${taxAmount.toFixed(2)}).`,
    details: {
      subtotal: authoritativeSubtotal,
      totalDiscount,
      shippingCost,
      taxAmount,
      grandTotal
    }
  });

  const securityChecksum = `SEC-CHK-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 100000)}`;

  return {
    success: true,
    pipelineStep: 'VALIDATED',
    pipelineLogs,
    items: validatedItems,
    pricing: {
      serverSubtotal: authoritativeSubtotal,
      clientReportedSubtotal,
      subtotalDiscrepancy: Number((clientReportedSubtotal - authoritativeSubtotal).toFixed(2)),
      couponDiscount,
      loyaltyDiscount,
      totalDiscount,
      shippingCost,
      shippingMethod: normalizedShipping,
      taxableAmount,
      taxRate,
      taxAmount,
      grandTotal,
      currency: 'Le'
    },
    appliedPromotion: {
      coupon: appliedCouponData,
      loyalty: appliedLoyaltyData
    },
    securityAudit: {
      browserPricesTrusted: false,
      serverAuthoritativePricingEnforced: true,
      priceTamperAttemptsDetected: priceTamperCount,
      validatedAt: new Date().toISOString(),
      securityChecksum
    },
    errors,
    warnings
  };
}

function createFailureResponse(
  failedStepName: string,
  pipelineLogs: PipelineStepLog[],
  errors: string[],
  warnings: string[],
  items: ValidatedLineItem[] = [],
  subtotal: number = 0
): CartValidationResult {
  return {
    success: false,
    pipelineStep: failedStepName,
    pipelineLogs,
    items,
    pricing: {
      serverSubtotal: subtotal,
      clientReportedSubtotal: 0,
      subtotalDiscrepancy: 0,
      couponDiscount: 0,
      loyaltyDiscount: 0,
      totalDiscount: 0,
      shippingCost: 0,
      shippingMethod: 'standard',
      taxableAmount: 0,
      taxRate: 0.08,
      taxAmount: 0,
      grandTotal: 0,
      currency: 'Le'
    },
    appliedPromotion: {
      coupon: null,
      loyalty: null
    },
    securityAudit: {
      browserPricesTrusted: false,
      serverAuthoritativePricingEnforced: true,
      priceTamperAttemptsDetected: 0,
      validatedAt: new Date().toISOString(),
      securityChecksum: 'FAIL'
    },
    errors,
    warnings
  };
}
