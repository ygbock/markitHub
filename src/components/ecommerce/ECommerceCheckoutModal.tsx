import React, { useState, useEffect } from 'react';
import { 
  CartItem, 
  CouponCode, 
  Customer, 
  Order, 
  PaymentMethod, 
  Product, 
  PaymentSession, 
  PaymentGatewayProvider, 
  SystemSettings,
  OrderCreationFlowStep,
  OrderCreationTimelineEvent,
  InventoryReservation
} from '../../types';
import { 
  X, CheckCircle, ShieldCheck, Truck, CreditCard, Lock, 
  MapPin, User, Mail, Phone, ChevronRight, ArrowLeft, 
  Receipt, Download, Sparkles, Building, Check, Package,
  Clock, Star, ArrowRight, AlertTriangle, RefreshCw, CheckCircle2,
  UserPlus, Zap, KeyRound, ExternalLink, Smartphone, Building2,
  Copy, FileText, CheckCheck, Boxes
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import { useTenant } from '../../context/TenantContext';
import { validateCartWithBackend } from '../../services/cartValidationService';
import { CartValidationResult } from '../../server/cartValidator';
import { PaymentService } from '../../services/paymentService';
import { OrderCreationFlowService } from '../../services/orderCreationFlowService';

interface ECommerceCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  appliedCoupon: CouponCode | null;
  activeCustomer: Customer | null;
  useLoyaltyPoints: boolean;
  onOrderCompleted: (order: Order, orderDetails: any) => void;
  customers: Customer[];
  onSelectCustomer?: (customer: Customer) => void;
  onRegisterCustomer?: (data: Omit<Customer, 'id' | 'createdAt'>) => void;
  onOpenAccount?: () => void;
  products?: Product[];
  systemSettings?: SystemSettings;
}

export default function ECommerceCheckoutModal({
  isOpen,
  onClose,
  cart,
  appliedCoupon,
  activeCustomer,
  useLoyaltyPoints,
  onOrderCompleted,
  customers,
  onSelectCustomer,
  onRegisterCustomer,
  onOpenAccount,
  products = [],
  systemSettings
}: ECommerceCheckoutModalProps) {
  const { formatAmount, currentCurrency } = useCurrency();
  const { tenantConfig, tenantSlug, formatCurrency: tenantFormatCurrency } = useTenant();
  const formatCurrency = (amount: number) => tenantConfig ? tenantFormatCurrency(amount) : formatAmount(amount);

  const [step, setStep] = useState<'info' | 'shipping' | 'payment' | 'confirmation'>('info');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<CartValidationResult | null>(null);
  const [isValidatingCart, setIsValidatingCart] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Decoupled Payment Session state
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>('gw_orange_money');

  // Customer Payment Inputs
  const [phoneNumber, setPhoneNumber] = useState('+232 76 892014');
  const [ussdPin, setUssdPin] = useState('');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardHolder, setCardHolder] = useState('SAHR B SESAY');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');
  const [bankTransferRef, setBankTransferRef] = useState('');
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);

  // Form State - Defaults to Guest Checkout if no active customer is logged in
  const [isGuest, setIsGuest] = useState(!activeCustomer);
  const [customerName, setCustomerName] = useState(activeCustomer ? activeCustomer.name : '');
  const [customerEmail, setCustomerEmail] = useState(activeCustomer ? activeCustomer.email : '');
  const [customerPhone, setCustomerPhone] = useState(activeCustomer ? activeCustomer.phone : '');

  // 11-Step Order Creation Flow & Concurrency State
  const [isFlowInspectorOpen, setIsFlowInspectorOpen] = useState(false);
  const [currentFlowStep, setCurrentFlowStep] = useState<OrderCreationFlowStep | null>(null);
  const [flowStepLabel, setFlowStepLabel] = useState<string>('');
  const [flowTimeline, setFlowTimeline] = useState<OrderCreationTimelineEvent[]>([]);

  // Post-order account creation state
  const [accountPassword, setAccountPassword] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [accountCreatedSuccess, setAccountCreatedSuccess] = useState(false);

  // Address
  const [addressLine1, setAddressLine1] = useState('450 Rawdon Street');
  const [addressLine2, setAddressLine2] = useState('Suite 800');
  const [city, setCity] = useState('Freetown');
  const [stateProvince, setStateProvince] = useState('Western Area');
  const [postalCode, setPostalCode] = useState('00232');
  const [country, setCountry] = useState('Sierra Leone');

  // Shipping Method
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express' | 'pickup'>('standard');

  // Sync customer if provided
  useEffect(() => {
    if (activeCustomer) {
      setCustomerName(activeCustomer.name);
      setCustomerEmail(activeCustomer.email);
      setCustomerPhone(activeCustomer.phone);
      setIsGuest(false);
    }
  }, [activeCustomer]);

  // Execute Server Cart Rules Pipeline Validation whenever inputs change
  useEffect(() => {
    if (!isOpen || cart.length === 0) return;

    let isMounted = true;
    const runValidation = async () => {
      setIsValidatingCart(true);
      setCheckoutError(null);
      try {
        const res = await validateCartWithBackend({
          cart,
          appliedCoupon,
          customerId: activeCustomer ? activeCustomer.id : null,
          useLoyaltyPoints,
          shippingMethod,
          shippingAddress: {
            addressLine1,
            addressLine2,
            city,
            stateProvince,
            postalCode,
            country
          },
          productsCatalog: products,
          customersCatalog: customers
        });

        if (isMounted) {
          setValidationResult(res);
          if (!res.success && res.errors.length > 0) {
            setCheckoutError(res.errors[0]);
          }
        }
      } catch (err: any) {
        console.error('Validation failed:', err);
      } finally {
        if (isMounted) setIsValidatingCart(false);
      }
    };

    runValidation();

    return () => {
      isMounted = false;
    };
  }, [isOpen, cart, appliedCoupon, activeCustomer, useLoyaltyPoints, shippingMethod, addressLine1, city, stateProvince, postalCode, products, customers]);

  // Authoritative Server-Calculated Totals (Never trust browser prices)
  const subtotal = validationResult?.pricing.serverSubtotal ?? 
    cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const couponDiscount = validationResult?.pricing.couponDiscount ?? 0;
  const loyaltyDiscount = validationResult?.pricing.loyaltyDiscount ?? 0;
  const totalDiscount = validationResult?.pricing.totalDiscount ?? (couponDiscount + loyaltyDiscount);
  const shippingCost = validationResult?.pricing.shippingCost ?? (shippingMethod === 'standard' ? (subtotal >= 150 ? 0 : 15) : shippingMethod === 'express' ? 25 : 0);
  const tax = validationResult?.pricing.taxAmount ?? Number(((subtotal - totalDiscount) * 0.08).toFixed(2));
  const grandTotal = validationResult?.pricing.grandTotal ?? Math.max(0, subtotal - totalDiscount + shippingCost + tax);

  // Initialize Payment Session when stepping to payment
  const handleProceedToPayment = async () => {
    setIsCreatingSession(true);
    setCheckoutError(null);

    try {
      const session = await PaymentService.createPaymentSession({
        subtotal,
        discount: totalDiscount,
        tax,
        shipping: shippingCost,
        currency: currentCurrency?.code || 'SLE',
        customer: {
          id: activeCustomer?.id,
          name: customerName || 'Guest Shopper',
          email: customerEmail || 'guest@example.com',
          phone: customerPhone || '+232 76 000000',
          isGuest
        },
        shippingAddress: {
          name: customerName || 'Guest Shopper',
          email: customerEmail || 'guest@example.com',
          phone: customerPhone || '+232 76 000000',
          addressLine1,
          addressLine2,
          city,
          stateProvince,
          postalCode,
          country
        },
        cartValidationChecksum: validationResult?.signature,
        systemSettings,
        orderItems: cart.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          sku: item.selectedVariantSku || item.product.sku || item.product.id,
          variantSku: item.selectedVariantSku,
          quantity: item.quantity,
          price: item.product.price,
          total: item.product.price * item.quantity,
          cost: item.product.cost,
          imageUrl: item.product.imageUrl
        }))
      });

      setPaymentSession(session);
      if (session.availableGateways.length > 0) {
        // Check if admin designated a specific gateway as default
        const defaultGw = session.availableGateways.find(g => {
          const cfg = systemSettings?.paymentMethods?.gateways?.find(cg => cg.id === g.id);
          return cfg?.isDefault;
        }) || session.availableGateways[0];

        setSelectedGatewayId(defaultGw ? defaultGw.id : session.availableGateways[0].id);
      }
      setStep('payment');
    } catch (err: any) {
      console.error('Failed to create payment session:', err);
      setCheckoutError('Failed to initialize payment gateway session.');
    } finally {
      setIsCreatingSession(false);
    }
  };

  const activeGateway = paymentSession?.availableGateways.find(g => g.id === selectedGatewayId) 
    || paymentSession?.availableGateways[0];

  const handlePlaceOrder = async () => {
    if (!activeGateway) return;

    setIsProcessing(true);
    setCheckoutError(null);
    setFlowTimeline([]);

    try {
      const fullShippingAddress = {
        name: customerName.trim() || 'Valued Customer',
        email: customerEmail.trim() || 'guest@example.com',
        phone: customerPhone.trim() || '+232 76 000000',
        addressLine1,
        addressLine2,
        city,
        stateProvince,
        postalCode,
        country
      };

      const resolvedCustomer = {
        id: activeCustomer?.id,
        name: customerName.trim() || 'Guest Shopper',
        email: customerEmail.trim() || 'guest@example.com',
        phone: customerPhone.trim() || '+232 76 000000',
        isGuest: !activeCustomer
      };

      // Execute Critical 11-step Order Creation Pipeline:
      // Customer → Cart → Checkout → Validate → Reserve Inventory → Create Order → Create Payment → Payment Confirmed → Order Paid → Inventory Finalized → Fulfillment
      const result = await OrderCreationFlowService.executeOrderFlow({
        cart,
        customer: resolvedCustomer,
        shippingAddress: fullShippingAddress,
        shippingMethod,
        appliedCoupon,
        useLoyaltyPoints,
        gatewayId: activeGateway.id,
        gatewayProvider: activeGateway.provider,
        customerPaymentData: {
          phoneNumber,
          ussdPin,
          cardHolder,
          cardNumber,
          cardExpiry,
          cardCvv: cardCvc,
          bankTransferReference: bankTransferRef
        },
        productsCatalog: products,
        customersCatalog: customers,
        systemSettings,
        channel: 'Online Storefront',
        onStepProgress: (stepName, event) => {
          setCurrentFlowStep(stepName);
          setFlowStepLabel(event.name);
          setFlowTimeline(prev => [...prev, event]);
        }
      });

      if (!result.success || !result.order) {
        setCheckoutError(result.error || 'Checkout pipeline failed to complete.');
        setIsProcessing(false);
        return;
      }

      const confirmedOrder = result.order;
      const summary = {
        orderId: confirmedOrder.id,
        orderNumber: confirmedOrder.orderNumber || confirmedOrder.id,
        date: confirmedOrder.date,
        itemsCount: cart.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: confirmedOrder.subtotal,
        discount: confirmedOrder.discount,
        tax: confirmedOrder.tax,
        shippingCost: confirmedOrder.shippingCost,
        grandTotal: confirmedOrder.grandTotal || confirmedOrder.total,
        customerName: confirmedOrder.customerName,
        customerEmail: confirmedOrder.customerEmail,
        customerPhone: confirmedOrder.customerPhone,
        deliveryAddress: confirmedOrder.deliveryAddress,
        trackingNumber: confirmedOrder.trackingNumber,
        status: confirmedOrder.status,
        approvalStatus: confirmedOrder.approvalStatus,
        transactionId: `TXN-${Date.now().toString(36).toUpperCase()}`,
        receiptNumber: `RCP-${confirmedOrder.orderNumber}`,
        provider: activeGateway.provider,
        currency: 'SLE',
        reservationId: result.reservation?.reservationId,
        fulfillment: result.fulfillment
      };

      setCompletedOrder(summary);
      setStep('confirmation');
      onOrderCompleted(confirmedOrder, summary);
    } catch (err: any) {
      console.error('Order checkout pipeline failed:', err);
      setCheckoutError(err?.message || 'Server order orchestration error occurred.');
    } finally {
      setIsProcessing(false);
      setCurrentFlowStep(null);
    }
  };

  const handleCreateAccountPostOrder = () => {
    if (!onRegisterCustomer) return;
    setIsCreatingAccount(true);

    try {
      const fullAddress = `${addressLine1}${addressLine2 ? ', ' + addressLine2 : ''}, ${city}, ${stateProvince} ${postalCode}, ${country}`;
      onRegisterCustomer({
        name: customerName.trim() || 'New Member',
        email: customerEmail.trim() || 'customer@example.com',
        phone: customerPhone.trim() || '+232 76 000000',
        address: fullAddress,
        loyaltyPoints: 50, // 50 Welcome bonus points
        segment: 'Regular',
        purchaseHistoryIds: completedOrder ? [completedOrder.orderNumber] : []
      });

      setAccountCreatedSuccess(true);
    } catch (err) {
      console.error('Failed to create account post checkout:', err);
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedBankField(label);
    setTimeout(() => setCopiedBankField(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[94vh] overflow-y-auto shadow-2xl border border-slate-200/80 relative flex flex-col no-scrollbar"
        id="ecommerce-checkout-modal"
      >
        
        {/* Header */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs">
              N
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  {step === 'confirmation' ? 'Order Confirmed!' : 'Frictionless Checkout'}
                </h2>
                {step !== 'confirmation' && isGuest && (
                  <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    Guest Checkout
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {step === 'confirmation' ? `Order ID: ${completedOrder?.orderNumber}` : 'Fast, Secure & Encrypted (No Account Required)'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFlowInspectorOpen(true)}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all border border-indigo-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Inspect 11-Step Lifecycle & Concurrency Locks"
            >
              <Boxes className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">11-Step Flow & Locks</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              id="btn-close-checkout"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Processing 11-Step Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 z-40 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-6 text-white text-center animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto animate-spin">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest block mb-1">
                  11-Step Order Creation Engine
                </span>
                <h3 className="text-base font-bold text-white">
                  {flowStepLabel || 'Executing Order Pipeline...'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Validating rules, acquiring inventory reservation lock, capturing gateway funds, and allocating fulfillment...
                </p>
              </div>

              {/* Progress dots / steps */}
              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700 text-left space-y-1.5 text-[11px] font-mono max-h-36 overflow-y-auto">
                {flowTimeline.map((ev, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-emerald-400">
                    <Check className="w-3 h-3 shrink-0" />
                    <span className="truncate">{ev.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step Indicator (when not confirmed) */}
        {step !== 'confirmation' && (
          <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs font-bold">
            <button
              onClick={() => setStep('info')}
              className={`flex items-center gap-1.5 cursor-pointer ${step === 'info' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <span className="w-5 h-5 rounded-full bg-white border flex items-center justify-center text-[10px]">1</span>
              <span>Contact Details</span>
            </button>
            <ChevronRight className="w-4 h-4 text-slate-300" />

            <button
              onClick={() => setStep('shipping')}
              className={`flex items-center gap-1.5 cursor-pointer ${step === 'shipping' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <span className="w-5 h-5 rounded-full bg-white border flex items-center justify-center text-[10px]">2</span>
              <span>Delivery Address</span>
            </button>
            <ChevronRight className="w-4 h-4 text-slate-300" />

            <button
              onClick={() => setStep('payment')}
              className={`flex items-center gap-1.5 cursor-pointer ${step === 'payment' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <span className="w-5 h-5 rounded-full bg-white border flex items-center justify-center text-[10px]">3</span>
              <span>Payment & Review</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 lg:p-8">
          
          {/* STEP 1: Contact Information (Name, Phone, Email) */}
          {step === 'info' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              
              {/* Guest Checkout Banner */}
              <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-indigo-950">Guest Checkout Active</span>
                    <p className="text-[11px] text-indigo-700 leading-relaxed">
                      No account or password required to complete your purchase. Simply provide your name, phone, and email.
                    </p>
                  </div>
                </div>

                {customers.length > 0 && onSelectCustomer && (
                  <div className="shrink-0 flex items-center gap-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden sm:block">Member?</label>
                    <select
                      value={activeCustomer ? activeCustomer.id : ''}
                      onChange={(e) => {
                        const found = customers.find(c => c.id === e.target.value);
                        if (found) {
                          onSelectCustomer(found);
                          setCustomerName(found.name);
                          setCustomerEmail(found.email);
                          setCustomerPhone(found.phone);
                          setIsGuest(false);
                        } else {
                          setIsGuest(true);
                        }
                      }}
                      className="text-xs px-3 py-1.5 bg-white border border-indigo-200 text-indigo-950 rounded-xl font-medium focus:ring-2 focus:ring-indigo-600 cursor-pointer shadow-2xs"
                    >
                      <option value="">Guest Checkout (Default)</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          Sign in as: {c.name} ({c.loyaltyPoints} pts)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">Customer Contact Details</h3>
                <p className="text-xs text-slate-500">Provide your basic contact information for order confirmation and dispatch updates.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Customer Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+1 (555) 019-2834"
                        className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="jane.doe@example.com"
                        className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Your information is private and secure.
                </span>

                <button
                  type="button"
                  disabled={!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()}
                  onClick={() => setStep('shipping')}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue to Delivery Address</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Shipping & Delivery Address */}
          {step === 'shipping' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">Delivery Address</h3>
                <p className="text-xs text-slate-500">Provide the destination address for parcel or courier dispatch.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Street Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      placeholder="e.g. 742 Evergreen Terrace"
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Apartment, Suite, Unit (Optional)</label>
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Apt 4B, Building 2"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      City <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      State / Province <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={stateProvince}
                      onChange={(e) => setStateProvince(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Postal Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Shipping Speed Selector */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Select Delivery Speed:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => setShippingMethod('standard')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      shippingMethod === 'standard'
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-2 ring-indigo-600/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Truck className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-mono font-bold">
                        {subtotal >= 150 || appliedCoupon?.discountType === 'free_shipping' ? 'FREE' : formatAmount(15.00)}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 mt-2">Standard Ground</h4>
                    <p className="text-[11px] text-slate-500">3-5 Business Days</p>
                  </div>

                  <div
                    onClick={() => setShippingMethod('express')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      shippingMethod === 'express'
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-2 ring-indigo-600/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Truck className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-mono font-bold">{formatAmount(25.00)}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 mt-2">Express Priority</h4>
                    <p className="text-[11px] text-slate-500">1-2 Business Days</p>
                  </div>

                  <div
                    onClick={() => setShippingMethod('pickup')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      shippingMethod === 'pickup'
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-2 ring-indigo-600/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Building className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-mono font-bold text-emerald-600">FREE</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 mt-2">Store Pickup</h4>
                    <p className="text-[11px] text-slate-500">Ready in 2 Hours</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('info')}
                  className="px-4 py-2.5 text-slate-600 hover:text-slate-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  disabled={!addressLine1.trim() || !city.trim() || !postalCode.trim() || isCreatingSession}
                  onClick={handleProceedToPayment}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
                  id="btn-proceed-to-payment"
                >
                  {isCreatingSession ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Initializing Session...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue to Payment</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Decoupled Payment Session & Provider Gateway Execution */}
          {step === 'payment' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
              
              {/* Payment Details (7 Cols) */}
              <div className="md:col-span-7 space-y-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900">Payment Gateway</h3>
                      {paymentSession?.sessionId && (
                        <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md">
                          Session: {paymentSession.sessionId}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Decoupled fintech pipeline. Storefront interacts solely via authoritative Payment Session.
                    </p>
                  </div>
                </div>

                {/* Validation Warnings / Error Notice */}
                {checkoutError && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold text-rose-900">Payment Authorization Blocked</h5>
                      <p className="text-xs text-rose-700 mt-0.5">{checkoutError}</p>
                    </div>
                  </div>
                )}

                {/* Dynamic Gateway Selector from Session */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Available Payment Rails:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {paymentSession?.availableGateways && paymentSession.availableGateways.length > 0 ? (
                      paymentSession.availableGateways.map(gw => {
                        const isSelected = gw.id === selectedGatewayId;
                        return (
                          <div
                            key={gw.id}
                            onClick={() => setSelectedGatewayId(gw.id)}
                            className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/80 shadow-xs ring-2 ring-indigo-600/20'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <span className="text-xs font-black text-slate-900">{gw.name}</span>
                              {gw.provider === 'monime' && <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded font-mono">Monime API</span>}
                              {gw.provider === 'orange_money' && <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">USSD Push</span>}
                              {gw.provider === 'afrimoney' && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">Afrimoney</span>}
                              {gw.provider === 'stripe' && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">Cards / 3DS</span>}
                              {gw.provider === 'bank_wire' && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">Bank Transfer</span>}
                              {(gw.provider === 'cod' || gw.provider === 'cash_on_delivery') && <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">Cash on Delivery</span>}
                              {gw.provider === 'bnpl_klarna' && <span className="text-[10px] font-bold text-pink-700 bg-pink-100 px-1.5 py-0.5 rounded">Split BNPL</span>}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{gw.description}</p>
                            {gw.instructions && (
                              <p className="text-[10px] text-indigo-600 font-medium mt-1 line-clamp-1">
                                ℹ️ {gw.instructions}
                              </p>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-2 p-3 bg-slate-50 rounded-xl text-xs text-slate-500 text-center">
                        Loading authorized payment gateways...
                      </div>
                    )}
                  </div>
                </div>

                {/* Gateway-Specific Input Panels */}
                {activeGateway?.provider === 'monime' && (
                  <div className="p-4 bg-teal-50/80 rounded-2xl border border-teal-200 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-lg bg-teal-600 text-white flex items-center justify-center text-xs font-black">
                          M
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-teal-950">Monime Financial Infrastructure</h4>
                          <p className="text-[10px] text-teal-700">Hosted checkout session & embedded multi-rail API</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-teal-200/80 text-teal-900 px-2 py-0.5 rounded">
                        Minor Units: {Math.round(grandTotal * 100).toLocaleString()} ¢
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-teal-900 block mb-1">Mobile Money / Phone (Optional)</label>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+232 76 000000 / +232 77 000000"
                          className="w-full px-3 py-2 bg-white border border-teal-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-teal-900 block mb-1">Card Number (Optional)</label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="4242 •••• •••• 4242"
                          className="w-full px-3 py-2 bg-white border border-teal-200 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-teal-800 bg-teal-100/60 p-2.5 rounded-xl border border-teal-200/60">
                      <span>Endpoint: <strong className="font-mono">https://api.monime.io/v1/checkout-sessions</strong></span>
                      <span className="font-mono font-bold text-teal-900">Space: monime_spc_sl_nexus</span>
                    </div>
                  </div>
                )}

                {activeGateway?.provider === 'orange_money' && (
                  <div className="p-4 bg-orange-50/70 rounded-2xl border border-orange-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-orange-600" />
                        <h4 className="text-xs font-black text-orange-950">Orange Money Direct USSD Push</h4>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-orange-200/80 text-orange-900 px-2 py-0.5 rounded">
                        *144# Flow
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-orange-900 block mb-1">Orange Mobile Number</label>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+232 76 000000"
                          className="w-full px-3 py-2 bg-white border border-orange-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-orange-900 block mb-1">USSD One-Time Code / PIN</label>
                        <input
                          type="password"
                          maxLength={6}
                          value={ussdPin}
                          onChange={(e) => setUssdPin(e.target.value)}
                          placeholder="••••"
                          className="w-full px-3 py-2 bg-white border border-orange-200 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-orange-800 leading-relaxed">
                      A USSD prompt will push directly to your phone. Enter your 4-digit secret code to authorize payment.
                    </p>
                  </div>
                )}

                {activeGateway?.provider === 'afrimoney' && (
                  <div className="p-4 bg-red-50/70 rounded-2xl border border-red-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-red-600" />
                        <h4 className="text-xs font-black text-red-950">Africell Afrimoney Mobile Wallet</h4>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-red-200/80 text-red-900 px-2 py-0.5 rounded">
                        *161# Flow
                      </span>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-red-900 block mb-1">Afrimoney Mobile Number</label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+232 77 000000 / +232 88 000000"
                        className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                      />
                    </div>
                    <p className="text-[11px] text-red-800 leading-relaxed">
                      You will receive an instant push on your SIM card to confirm the payment transfer.
                    </p>
                  </div>
                )}

                {activeGateway?.provider === 'stripe' && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-xs font-black text-slate-900">Encrypted Card Tokenization</h4>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-emerald-600" /> 256-Bit SSL
                      </span>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Cardholder Full Name</label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="NAME ON CARD"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium uppercase focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4242 4242 4242 4242"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono tracking-wider focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Expiration Date</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/YY"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Security Code (CVC)</label>
                        <input
                          type="text"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          placeholder="CVC"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeGateway?.provider === 'bank_wire' && (
                  <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-emerald-700" />
                        <h4 className="text-xs font-black text-emerald-950">Sierra Leone Commercial Bank (SLCB)</h4>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded">
                        B2B Settlement
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Beneficiary Account:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">003001099281001</span>
                          <button
                            type="button"
                            onClick={() => handleCopy('003001099281001', 'acct')}
                            className="text-emerald-700 hover:text-emerald-900 p-1"
                          >
                            {copiedBankField === 'acct' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">BBAN / IBAN:</span>
                        <span className="font-mono font-bold text-slate-900">SL28SLCB003001099281001</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-emerald-900 block mb-1">Your Bank Transfer Reference / Slip No.</label>
                      <input
                        type="text"
                        value={bankTransferRef}
                        onChange={(e) => setBankTransferRef(e.target.value)}
                        placeholder="e.g. SLCB-REF-992014"
                        className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                )}

                {activeGateway?.provider === 'cod' && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-indigo-600" />
                      <h4 className="text-xs font-black text-slate-900">Cash on Delivery (Freetown Express)</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Pay with cash or mobile money directly to the dispatch rider upon delivery inspection.
                    </p>
                  </div>
                )}

                {/* Customer & Delivery destination recap */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Recipient & Destination
                    </span>
                    <button onClick={() => setStep('shipping')} className="text-indigo-600 hover:underline cursor-pointer">Edit</button>
                  </div>
                  <p className="text-slate-700 font-medium">{customerName} • {customerPhone} • {customerEmail}</p>
                  <p className="text-slate-500">{addressLine1}{addressLine2 ? ', ' + addressLine2 : ''}, {city}, {stateProvince} {postalCode}, {country}</p>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep('shipping')}
                    className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing || Boolean(checkoutError)}
                    onClick={handlePlaceOrder}
                    className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
                    id="btn-place-order-confirm"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Authorizing & Settling Ledger...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Authorize & Pay • {formatAmount(grandTotal)}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Order Summary (5 Cols) */}
              <div className="md:col-span-5 bg-slate-50 p-5 rounded-3xl border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Authoritative Summary ({cart.reduce((s, i) => s + i.quantity, 0)} items)
                  </h4>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-bold">
                    Server Verified
                  </span>
                </div>

                {/* Items preview */}
                <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar divide-y divide-slate-200">
                  {cart.map(item => (
                    <div key={`${item.product.id}-${item.selectedVariantSku || 'def'}`} className="pt-2 first:pt-0 flex items-center gap-3">
                      <img src={item.product.imageUrl} alt={item.product.name} className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-bold text-slate-900 truncate">{item.product.name}</h5>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                          <span>Qty: {item.quantity}</span>
                          <span className="font-bold text-slate-900">{formatAmount(item.product.price * item.quantity)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Breakdown totals */}
                <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-200">
                  <div className="flex justify-between">
                    <span>Server Validated Subtotal</span>
                    <span className="font-mono font-bold text-slate-900">{formatAmount(subtotal)}</span>
                  </div>

                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Coupon Discount ({validationResult?.appliedPromotion.coupon?.code || 'Applied'})</span>
                      <span className="font-mono font-bold">-{formatAmount(couponDiscount)}</span>
                    </div>
                  )}

                  {loyaltyDiscount > 0 && (
                    <div className="flex justify-between text-amber-600 font-medium">
                      <span>Loyalty Points Discount</span>
                      <span className="font-mono font-bold">-{formatAmount(loyaltyDiscount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>Shipping ({shippingMethod.toUpperCase()})</span>
                    <span className="font-mono font-bold text-slate-900">
                      {shippingCost === 0 ? <span className="text-emerald-600">FREE</span> : formatAmount(shippingCost)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Sales Tax (8%)</span>
                    <span className="font-mono font-bold text-slate-900">{formatAmount(tax)}</span>
                  </div>

                  <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                    <span>Total Amount</span>
                    <span className="font-mono text-base text-indigo-600">{formatAmount(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Celebratory Confirmation + Post-Order Account Creation Prompt */}
          {step === 'confirmation' && completedOrder && (
            <div className="text-center space-y-6 max-w-xl mx-auto py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-in zoom-in">
                <CheckCircle className="w-10 h-10" />
              </div>

              <div>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200 uppercase tracking-wide">
                  Order Successfully Placed
                </span>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                  Thank You, {customerName.split(' ')[0] || 'Customer'}!
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  We sent a confirmation receipt and dispatch tracking details to <strong className="text-slate-800">{customerEmail}</strong>.
                </p>
              </div>

              {/* POST-ORDER: "Create an account to track your order faster." */}
              {!activeCustomer && (
                <div className="p-5 bg-gradient-to-br from-indigo-50 via-white to-indigo-50/40 rounded-3xl border-2 border-indigo-200 shadow-sm text-left relative overflow-hidden">
                  <div className="absolute top-0 right-0 transform translate-x-3 -translate-y-3 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
                  
                  {accountCreatedSuccess ? (
                    <div className="space-y-3 py-2 text-center">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                        <Check className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">Account Created Successfully!</h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Order <strong className="text-indigo-600">{completedOrder.orderNumber}</strong> has been linked to your profile with <span className="font-bold text-amber-600">+50 Welcome Loyalty Points</span>!
                        </p>
                      </div>

                      {onOpenAccount && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenAccount();
                          }}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 inline-flex items-center gap-2 cursor-pointer transition-all"
                        >
                          <span>Track Order in Customer Portal</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20 mt-0.5">
                          <UserPlus className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-900">
                              Create an account to track your order faster.
                            </h4>
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                              +50 pts bonus
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            Activate your member portal to get live GPS package tracking, instant courier updates, 1-click reordering, and permanent receipt downloads.
                          </p>
                        </div>
                      </div>

                      {/* Details Pre-filled from Guest Checkout */}
                      <div className="p-3 bg-white rounded-2xl border border-indigo-100 space-y-2 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Account Name</span>
                            <span className="font-semibold text-slate-800">{customerName}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Account Email</span>
                            <span className="font-semibold text-slate-800">{customerEmail}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <div className="relative flex-1">
                            <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="password"
                              value={accountPassword}
                              onChange={(e) => setAccountPassword(e.target.value)}
                              placeholder="Set a password (or leave for 1-click)"
                              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:bg-white focus:outline-hidden"
                            />
                          </div>

                          <button
                            type="button"
                            disabled={isCreatingAccount}
                            onClick={handleCreateAccountPostOrder}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                            id="btn-create-account-post-checkout"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>{isCreatingAccount ? 'Creating...' : 'Create Account'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Customer Journey Milestones */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3 text-left">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Live Dispatch Journey
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Confirmed
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  <div className="flex flex-col items-center text-center gap-1.5 p-2 rounded-xl bg-emerald-50/80 border border-emerald-200">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
                      ✓
                    </div>
                    <span className="text-[10px] font-black text-emerald-800 leading-tight">Order Placed</span>
                    <span className="text-[9px] text-emerald-600 font-mono">Confirmed</span>
                  </div>

                  <div className="flex flex-col items-center text-center gap-1.5 p-2 rounded-xl bg-indigo-50/80 border border-indigo-200">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold animate-pulse shadow-xs">
                      <Package className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-black text-indigo-800 leading-tight">Stock Reserved</span>
                    <span className="text-[9px] text-indigo-600 font-mono">Fulfilling</span>
                  </div>

                  <div className="flex flex-col items-center text-center gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">
                      <Truck className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 leading-tight">Delivery</span>
                    <span className="text-[9px] text-slate-400 font-mono">In Transit</span>
                  </div>

                  <div className="flex flex-col items-center text-center gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">
                      <Star className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 leading-tight">Review</span>
                    <span className="text-[9px] text-amber-600 font-mono">Verified Badge</span>
                  </div>
                </div>
              </div>

              {/* Order Card Info & Fintech Ledger Verification */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2.5">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Order Number:</span>
                  <span className="font-mono font-bold text-slate-900">{completedOrder.orderNumber}</span>
                </div>

                {completedOrder.transactionId && (
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                    <span className="text-slate-500">Transaction ID:</span>
                    <span className="font-mono font-bold text-indigo-600">{completedOrder.transactionId}</span>
                  </div>
                )}

                {completedOrder.ledgerJournalId && (
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                    <span className="text-slate-500 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Ledger Journal (Double-Entry):
                    </span>
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                      {completedOrder.ledgerJournalId} • Balanced
                    </span>
                  </div>
                )}

                {completedOrder.reservationId && (
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-indigo-600" />
                      Inventory Reservation:
                    </span>
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                      {completedOrder.reservationId} (Finalized)
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Tracking Code:</span>
                  <span className="font-mono font-bold text-slate-900">{completedOrder.trackingNumber}</span>
                </div>

                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Delivery Address:</span>
                  <span className="text-slate-900 truncate max-w-[200px]">{addressLine1}, {city}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Amount Paid & Settled:</span>
                  <span className="font-mono font-black text-sm text-slate-900">{formatAmount(completedOrder.grandTotal)}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFlowInspectorOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-indigo-200"
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>View 11-Step Lifecycle & Locks</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 11-Step Order Creation & Concurrency Inspector Modal */}
    </div>
  );
}

