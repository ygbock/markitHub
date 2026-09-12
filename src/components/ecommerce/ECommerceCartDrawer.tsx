import { PricingRule, evaluateRules } from "../../utils/pricingRulesEngine";
import React, { useState } from 'react';
import { CartItem, CouponCode, Customer, CouponValidationResult, Product } from '../../types';
import { 
  X, ShoppingBag, Trash2, ArrowRight, Tag, Truck, Check, 
  Sparkles, ShieldCheck, Zap, AlertCircle, CheckCircle2, ChevronDown, 
  ChevronUp, Info, Clock, UserCheck, DollarSign, PackageCheck, Hash, Boxes
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import { useTenant } from '../../context/TenantContext';
import { validateCouponCodeAuthoritativeService } from '../../services/cartValidationService';
import { SERVER_PROMOTIONS_REGISTRY } from '../../server/cartValidator';

interface ECommerceCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number, variantSku?: string) => void;
  onRemoveItem: (productId: string, variantSku?: string) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
  appliedCoupon: CouponCode | null;
  onApplyCoupon: (code: string) => Promise<boolean | CouponValidationResult> | boolean;
  onRemoveCoupon: () => void;
  couponError?: string;
  activeCustomer: Customer | null;
  useLoyaltyPoints: boolean;
  onToggleLoyaltyPoints: (use: boolean) => void;
  onOpenOrderFlow?: () => void;
  products?: Product[];
  customers?: Customer[];
}

export const VALID_COUPONS: CouponCode[] = [
  {
    code: 'SAVE20',
    discountType: 'fixed',
    value: 200,
    minSpend: 200,
    minOrderAmount: 200,
    description: 'Le 200 Off Orders Over Le 200',
    isActive: true
  },
  {
    code: 'COUPON_15',
    discountType: 'percentage',
    value: 15,
    description: '15% Off Your Entire Cart Order',
    isActive: true
  },
  {
    code: 'FREESHIP',
    discountType: 'free_shipping',
    value: 15,
    description: 'Free Nationwide Express Shipping',
    isActive: true
  },
  {
    code: 'WELCOME10',
    discountType: 'fixed',
    value: 10,
    description: '$10 Off First Online Order',
    isActive: true
  },
  {
    code: 'VIP25',
    discountType: 'percentage',
    value: 25,
    description: '25% Exclusive VIP Loyalty Discount',
    eligibleCustomerTiers: ['VIP'],
    isActive: true
  },
  {
    code: 'TECH10',
    discountType: 'percentage',
    value: 10,
    description: '10% Off Electronics & Tech Gadgets',
    eligibleCategoryIds: ['Electronics', 'Computers & Office', 'Phones', 'Audio & Wearables'],
    isActive: true
  }
];

export default function ECommerceCartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout,
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  couponError,
  activeCustomer,
  useLoyaltyPoints,
  onToggleLoyaltyPoints,
  onOpenOrderFlow,
  products = [],
  customers = []
}: ECommerceCartDrawerProps) {
  const { formatAmount, currentCurrency } = useCurrency();
  const { tenantConfig, formatCurrency: tenantFormatCurrency } = useTenant();
  const formatCurrency = (amount: number) => tenantConfig ? tenantFormatCurrency(amount) : formatAmount(amount);

  const [couponInput, setCouponInput] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [validationFeedback, setValidationFeedback] = useState<{
    valid: boolean;
    displayText?: string;
    message?: string;
    ruleChecks?: any[];
    code?: string;
  } | null>(null);
  const [showRuleDetails, setShowRuleDetails] = useState(false);

  if (!isOpen) return null;

  const FREE_SHIPPING_THRESHOLD = tenantConfig?.policies?.shipping?.freeShippingThreshold ?? 150;
  const rawSubtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);


  // In a real app, these rules would be fetched from a context or API.
  // Using static default rules to demonstrate the engine.
  const activePricingRules: PricingRule[] = [
    {
      id: 'rule_1',
      type: 'BOGO',
      title: 'Buy 2 Get 1 Free',
      description: 'Buy 2 of any item, get 1 of the same item free.',
      isActive: true,
      buyQty: 2,
      getQty: 1,
      discountMultiplier: 0
    },
    {
      id: 'rule_2',
      type: 'THRESHOLD_DISCOUNT',
      title: '10% off when total > $200',
      description: 'Get 10% off your entire order when you spend over $200.',
      isActive: true,
      thresholdAmount: 200,
      discountPercentage: 10
    }
  ];

  const ruleEvaluation = evaluateRules(cart, rawSubtotal, activePricingRules);
  const rulesDiscount = ruleEvaluation.discountAmount;
  
  
  // Calculate Coupon Discount
  let couponDiscountAmount = 0;
  let hasFreeShippingFromCoupon = false;

  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      couponDiscountAmount = (rawSubtotal * appliedCoupon.value) / 100;
    } else if (appliedCoupon.discountType === 'fixed') {
      couponDiscountAmount = Math.min(rawSubtotal, appliedCoupon.value);
    } else if (appliedCoupon.discountType === 'free_shipping') {
      hasFreeShippingFromCoupon = true;
    }
  }

  // Loyalty points discount (1 point = $0.05)
  const loyaltyPointsDiscount = (useLoyaltyPoints && activeCustomer) 
    ? Math.min(rawSubtotal - couponDiscountAmount, (activeCustomer.loyaltyPoints * 0.05))
    : 0;

  const isFreeShipping = rawSubtotal >= FREE_SHIPPING_THRESHOLD || hasFreeShippingFromCoupon;
  const shippingCost = isFreeShipping ? 0 : 15.00;
  const taxAmount = (rawSubtotal - couponDiscountAmount - loyaltyPointsDiscount) * 0.08; // 8% standard tax
  const finalTotal = Math.max(0, rawSubtotal - couponDiscountAmount - loyaltyPointsDiscount + shippingCost + taxAmount);

  const freeShippingProgress = Math.min(100, Math.round((rawSubtotal / FREE_SHIPPING_THRESHOLD) * 100));
  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - rawSubtotal);

  // Authoritative 8-Rule Coupon Application Handler
  const handleApplyCoupon = async (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    const codeToValidate = (customCode || couponInput).trim().toUpperCase();
    if (!codeToValidate) return;

    setIsValidatingCoupon(true);
    setValidationFeedback(null);

    try {
      // Execute 8-rule backend coupon validation
      const result: CouponValidationResult = await validateCouponCodeAuthoritativeService({
        couponCode: codeToValidate,
        cart,
        subtotal: rawSubtotal,
        activeCustomer,
        shippingCost,
        productsCatalog: products,
        customersCatalog: customers,
        couponsCatalog: SERVER_PROMOTIONS_REGISTRY
      });

      if (result.valid && result.coupon) {
        setValidationFeedback({
          valid: true,
          displayText: result.displayText || `Discount applied: -Le ${result.discountAmount}`,
          message: result.message,
          ruleChecks: result.ruleChecks,
          code: result.code
        });
        
        // Pass coupon to parent handler
        onApplyCoupon(codeToValidate);
        setCouponInput('');
      } else {
        setValidationFeedback({
          valid: false,
          displayText: result.displayText || 'Coupon validation failed',
          message: result.message || 'Coupon did not pass backend verification checks.',
          ruleChecks: result.ruleChecks,
          code: codeToValidate
        });
      }
    } catch (err: any) {
      setValidationFeedback({
        valid: false,
        displayText: 'Validation error',
        message: err?.message || 'Failed to reach validation service.',
        ruleChecks: [],
        code: codeToValidate
      });
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveAppliedCoupon = () => {
    onRemoveCoupon();
    setValidationFeedback(null);
    setShowRuleDetails(false);
  };

  const handleQuickChipSelect = (code: string) => {
    setCouponInput(code);
    handleApplyCoupon(undefined, code);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200/80 animate-in slide-in-from-right duration-300 relative"
        id="ecommerce-cart-drawer"
      >
        
        {/* 1. Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Shopping Cart
              </h2>
              <span className="text-xs text-slate-400">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items in bag
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                className="text-xs text-slate-400 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                title="Clear all cart items"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Free Shipping Progress Meter */}
        <div className="px-4 py-3 bg-indigo-50/50 border-b border-indigo-100/50">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-1.5 font-bold text-indigo-900">
              <Truck className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                {isFreeShipping ? (
                  <strong className="text-emerald-600">✓ Free Nationwide Shipping Unlocked!</strong>
                ) : (
                  <>Add <strong className="text-indigo-600">{formatAmount(amountToFreeShipping)}</strong> more for <strong>FREE Shipping</strong></>
                )}
              </span>
            </div>
            <span className="font-mono text-[11px] text-indigo-600 font-bold">{freeShippingProgress}%</span>
          </div>
          <div className="w-full bg-indigo-100/70 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${isFreeShipping ? 'bg-emerald-500' : 'bg-indigo-600'}`}
              style={{ width: `${freeShippingProgress}%` }}
            />
          </div>
        </div>

        {/* 3. Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mb-3">
                <ShoppingBag className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-sm font-black text-slate-700 mb-1">Your cart is empty</h3>
              <p className="text-xs max-w-[200px] mb-4">
                Explore our rich catalog and add your favorite items to begin.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            cart.map((item, idx) => {
              const variant = item.product.variants?.find(v => v.sku === item.selectedVariantSku);
              const itemPrice = item.product.price;
              const itemTotal = itemPrice * item.quantity;

              return (
                <div 
                  key={`${item.product.id}-${item.selectedVariantSku || 'def'}-${idx}`}
                  className="flex gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl relative group"
                >
                  <img 
                    src={item.product.imageUrl || item.product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'} 
                    alt={item.product.name}
                    className="w-16 h-16 rounded-xl object-cover bg-white border border-slate-200 shrink-0"
                    referrerPolicy="no-referrer"
                  />

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {item.product.name}
                        </h4>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.product.id, item.selectedVariantSku)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {variant && (
                        <span className="text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono inline-block mt-0.5">
                          {variant.name || variant.sku}
                        </span>
                      )}

                      {item.selectedUnitName && (
                        <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 font-mono inline-block mt-0.5 ml-1">
                          Unit: {item.selectedUnitName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                      {/* Quantity Selector */}
                      <div className="flex items-center border border-slate-200 rounded-xl bg-white p-0.5">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1, item.selectedVariantSku)}
                          className="w-6 h-6 rounded-lg bg-white text-slate-700 flex items-center justify-center font-bold text-xs shadow-2xs hover:bg-slate-100 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-mono font-bold text-xs text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1, item.selectedVariantSku)}
                          className="w-6 h-6 rounded-lg bg-white text-slate-700 flex items-center justify-center font-bold text-xs shadow-2xs hover:bg-slate-100 cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <span className="text-xs font-mono font-black text-slate-900">
                        {formatAmount(itemTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 4. Footer Summary & Coupon & Checkout */}
        {cart.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 space-y-3.5 z-10">
            
            {/* ================================================================= */}
            {/* COUPON SECTION - STRICT SPECIFICATION */}
            {/* Have a coupon? [ SAVE20 ] [Apply] */}
            {/* Backend validates: 8 rules */}
            {/* Then returns: Discount applied: -Le 200 */}
            {/* ================================================================= */}
            <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-2 shadow-2xs" id="cart-coupon-section">
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="cart-coupon-input"
                  className="text-xs font-black text-slate-900 flex items-center gap-1.5"
                >
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Have a coupon?</span>
                </label>

                {appliedCoupon && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Verified by Backend
                  </span>
                )}
              </div>

              {appliedCoupon ? (
                /* Verified Applied Coupon State */
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-emerald-50/90 border border-emerald-200/80 rounded-xl text-xs text-emerald-950 font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <div>
                        {/* Literal specification format: "Discount applied: -Le 200" */}
                        <div className="font-bold text-emerald-900 text-xs">
                          {validationFeedback?.displayText || `Discount applied: -Le ${couponDiscountAmount || appliedCoupon.value}`}
                        </div>
                        <div className="text-[10px] text-emerald-700 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono font-bold uppercase">{appliedCoupon.code}</span>
                          <span>•</span>
                          <span>{appliedCoupon.description}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveAppliedCoupon}
                      className="text-emerald-800 hover:text-rose-700 font-black text-xs px-2 py-1 rounded-lg hover:bg-emerald-100/60 transition-colors cursor-pointer shrink-0"
                      title="Remove coupon code"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Toggle Backend 8-Rule Validation Details */}
                  {validationFeedback?.ruleChecks && validationFeedback.ruleChecks.length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowRuleDetails(!showRuleDetails)}
                        className="w-full text-[11px] text-slate-500 hover:text-indigo-600 flex items-center justify-between px-1 py-0.5 font-medium transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Backend 8-Rule Check (8/8 Passed)</span>
                        </span>
                        {showRuleDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {showRuleDetails && (
                        <div className="mt-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1 animate-in fade-in">
                          {validationFeedback.ruleChecks.map((rule, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[10px] py-0.5">
                              <span className="text-slate-600 flex items-center gap-1">
                                <span className="text-emerald-600 font-bold">✓</span>
                                {rule.rule}
                              </span>
                              <span className="text-slate-400 font-mono text-[9px]">{rule.message}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Coupon Input Form: [ SAVE20 ] [Apply] */
                <form onSubmit={handleApplyCoupon} className="space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input 
                        id="cart-coupon-input"
                        type="text"
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value);
                          setValidationFeedback(null);
                        }}
                        placeholder="SAVE20"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-mono font-bold tracking-wider text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-hidden transition-all"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck="false"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isValidatingCoupon || !couponInput.trim()}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                      id="btn-apply-coupon"
                    >
                      {isValidatingCoupon ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Checking...</span>
                        </>
                      ) : (
                        <span>Apply</span>
                      )}
                    </button>
                  </div>

                  {/* Backend Validation Feedback or Error */}
                  {validationFeedback && !validationFeedback.valid && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1 animate-in fade-in">
                      <div className="flex items-start gap-1.5 font-bold">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <span>{validationFeedback.message || validationFeedback.displayText}</span>
                      </div>

                      {/* Rule Checks Detail Breakdown if Available */}
                      {validationFeedback.ruleChecks && validationFeedback.ruleChecks.some(r => !r.passed) && (
                        <div className="pt-1 border-t border-rose-200/60 mt-1 text-[10px] space-y-0.5">
                          {validationFeedback.ruleChecks.map((rule, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <span className={rule.passed ? 'text-emerald-700' : 'text-rose-700 font-bold'}>
                                {rule.passed ? '✓' : '✕'} {rule.rule}
                              </span>
                              <span className="text-slate-500 font-mono text-[9px]">{rule.message}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {couponError && !validationFeedback && (
                    <p className="text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{couponError}</span>
                    </p>
                  )}

                  {/* Quick-test Coupon Chips */}
                  <div className="pt-1">
                    <span className="text-[10px] text-slate-400 block mb-1 font-medium">
                      Quick test vouchers (8-rule backend verified):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {VALID_COUPONS.map(c => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => handleQuickChipSelect(c.code)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 rounded-lg text-[10px] font-mono font-bold text-slate-700 transition-colors cursor-pointer"
                          title={c.description}
                        >
                          {c.code}
                        </button>
                      ))}
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Loyalty points toggle if customer logged in */}
            {activeCustomer && activeCustomer.loyaltyPoints > 0 && (
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <div>
                    <span className="font-bold text-slate-900">Redeem Points</span>
                    <span className="text-[10px] text-slate-500 block">
                      {activeCustomer.loyaltyPoints} available (${(activeCustomer.loyaltyPoints * 0.05).toFixed(2)})
                    </span>
                  </div>
                </div>
                <input 
                  type="checkbox"
                  checked={useLoyaltyPoints}
                  onChange={(e) => onToggleLoyaltyPoints(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 cursor-pointer"
                />
              </div>
            )}

            {/* Calculations Breakdown */}
            <div className="space-y-1.5 text-xs text-slate-600 pt-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono font-bold text-slate-900">{formatAmount(rawSubtotal)}</span>
              </div>

              
                      {ruleEvaluation.appliedRules.map((rule, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[13px] font-bold text-indigo-600 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                          <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Promotion: {rule.title}</span>
                          <span>-{formatAmount(rule.discount)}</span>
                        </div>
                      ))}
  
                      {couponDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span className="flex items-center gap-1">
                    <span>Coupon Discount</span>
                    {appliedCoupon && (
                      <span className="text-[10px] font-mono bg-emerald-100/70 text-emerald-800 px-1 rounded">
                        {appliedCoupon.code}
                      </span>
                    )}
                  </span>
                  <span className="font-mono font-bold">-{formatAmount(couponDiscountAmount)}</span>
                </div>
              )}

              {loyaltyPointsDiscount > 0 && (
                <div className="flex justify-between text-amber-600 font-medium">
                  <span>Loyalty Points Applied</span>
                  <span className="font-mono font-bold">-{formatAmount(loyaltyPointsDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Estimated Shipping</span>
                <span className="font-mono font-bold text-slate-900">
                  {isFreeShipping ? (
                    <span className="text-emerald-600 font-bold">FREE</span>
                  ) : (
                    formatAmount(shippingCost)
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Estimated Tax (8%)</span>
                <span className="font-mono font-bold text-slate-900">{formatAmount(taxAmount)}</span>
              </div>

              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Estimated Total</span>
                <span className="font-mono text-base text-indigo-600">{formatAmount(finalTotal)}</span>
              </div>
            </div>

            {/* Checkout Action Button */}
            <button
              type="button"
              onClick={onProceedToCheckout}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl font-black text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              id="btn-cart-checkout-proceed"
            >
              <span>Proceed to Secure Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-1 px-1">
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> 8 Backend Rules Enforced
              </span>
              <div className="flex items-center gap-2">
                {onOpenOrderFlow && (
                  <button
                    type="button"
                    onClick={onOpenOrderFlow}
                    className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Boxes className="w-3 h-3" />
                    <span>Order Flow</span>
                  </button>
                )}
                
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
