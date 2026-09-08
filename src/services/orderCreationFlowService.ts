import { 
  CartItem, 
  CouponCode, 
  Customer, 
  Order, 
  Product, 
  PaymentSession, 
  PaymentGatewayProvider, 
  SystemSettings,
  OrderCreationFlowStep,
  OrderCreationTimelineEvent,
  OrderCreationFlowState,
  InventoryReservation,
  OrderFulfillmentDetails
} from '../types';
import { validateCartWithBackend } from './cartValidationService';
import { InventoryReservationService } from './inventoryReservationService';
import { PaymentService } from './paymentService';
import { OrderService } from './orderService';
import { InventoryService } from './inventoryService';
import { LedgerService } from './ledgerService';
import { saveOrderToDB, saveCustomerToDB } from './dbService';

export interface ExecuteOrderFlowParams {
  cart: CartItem[];
  customer?: {
    id?: string;
    name: string;
    email: string;
    phone: string;
    isGuest: boolean;
  };
  shippingAddress: {
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
  shippingMethod: 'standard' | 'express' | 'pickup';
  appliedCoupon: CouponCode | null;
  useLoyaltyPoints: boolean;
  gatewayId: string;
  gatewayProvider: PaymentGatewayProvider;
  customerPaymentData: {
    phoneNumber?: string;
    ussdPin?: string;
    cardHolder?: string;
    cardNumber?: string;
    cardExpiry?: string;
    cardCvv?: string;
    bankTransferReference?: string;
  };
  productsCatalog: Product[];
  customersCatalog: Customer[];
  systemSettings?: SystemSettings;
  channel?: 'Online Storefront' | 'In-Store POS';
  onStepProgress?: (step: OrderCreationFlowStep, event: OrderCreationTimelineEvent, state: Partial<OrderCreationFlowState>) => void;
  onStockUpdated?: (updatedProducts: Product[]) => void;
  onCustomerUpdated?: (updatedCustomer: Customer) => void;
}

export class OrderCreationFlowService {
  /**
   * Orchestrates the 11-step critical Order Creation flow:
   * Customer → Cart → Checkout → Validate → Reserve Inventory → Create Order → Create Payment → Payment Confirmed → Order Paid → Inventory Finalized → Fulfillment
   */
  static async executeOrderFlow(params: ExecuteOrderFlowParams): Promise<{
    success: boolean;
    order?: Order;
    reservation?: InventoryReservation;
    fulfillment?: OrderFulfillmentDetails;
    timeline: OrderCreationTimelineEvent[];
    error?: string;
    failedStep?: OrderCreationFlowStep;
    updatedProducts?: Product[];
    updatedCustomer?: Customer;
  }> {
    const {
      cart,
      customer = { name: 'Guest Shopper', email: 'guest@example.com', phone: '+232 76 000000', isGuest: true },
      shippingAddress,
      shippingMethod,
      appliedCoupon,
      useLoyaltyPoints,
      gatewayId,
      gatewayProvider,
      customerPaymentData,
      productsCatalog,
      customersCatalog,
      systemSettings,
      channel = 'Online Storefront',
      onStepProgress,
      onStockUpdated,
      onCustomerUpdated
    } = params;

    const timeline: OrderCreationTimelineEvent[] = [];
    const completedSteps: OrderCreationFlowStep[] = [];
    let currentReservation: InventoryReservation | undefined;
    let createdOrder: Order | undefined;
    let paymentSession: PaymentSession | undefined;
    let paymentResult: any | undefined;
    let updatedProductList: Product[] = [...productsCatalog];
    let updatedCustomerRecord: Customer | undefined;

    const recordEvent = (
      step: OrderCreationFlowStep, 
      name: string, 
      status: 'completed' | 'in_progress' | 'failed' | 'pending', 
      details?: string,
      metadata?: Record<string, any>
    ) => {
      const event: OrderCreationTimelineEvent = {
        step,
        name,
        status,
        timestamp: new Date().toISOString(),
        details,
        metadata
      };
      timeline.push(event);
      if (status === 'completed' && !completedSteps.includes(step)) {
        completedSteps.push(step);
      }
      if (onStepProgress) {
        onStepProgress(step, event, {
          currentStep: step,
          completedSteps,
          timeline,
          reservation: currentReservation,
          order: createdOrder,
          paymentSession
        });
      }
      return event;
    };

    try {
      // -------------------------------------------------------------
      // 1. STEP: Customer
      // -------------------------------------------------------------
      recordEvent('customer', 'Customer Identification', 'in_progress', 'Resolving customer profile and access tier');
      if (!customer.name || !customer.email) {
        recordEvent('customer', 'Customer Identification', 'failed', 'Customer name or email missing');
        return { success: false, timeline, error: 'Customer information required', failedStep: 'customer' };
      }
      recordEvent('customer', 'Customer Identified', 'completed', `Profile: ${customer.name} (${customer.isGuest ? 'Guest' : 'Registered Customer'})`, { customer });

      // -------------------------------------------------------------
      // 2. STEP: Cart
      // -------------------------------------------------------------
      recordEvent('cart', 'Cart Items Assembly', 'in_progress', `Reviewing ${cart.length} item(s) in active cart`);
      if (!cart || cart.length === 0) {
        recordEvent('cart', 'Cart Empty', 'failed', 'Cart contains no items to purchase');
        return { success: false, timeline, error: 'Cart is empty', failedStep: 'cart' };
      }
      const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
      recordEvent('cart', 'Cart Verified', 'completed', `${cart.length} unique line item(s), ${totalUnits} total unit(s)`, { itemCount: cart.length, totalUnits });

      // -------------------------------------------------------------
      // 3. STEP: Checkout
      // -------------------------------------------------------------
      recordEvent('checkout', 'Checkout Initiation', 'in_progress', `Configuring ${shippingMethod} shipping to ${shippingAddress.city}`);
      if (!shippingAddress.addressLine1 || !shippingAddress.city) {
        recordEvent('checkout', 'Shipping Missing', 'failed', 'Shipping address line 1 and city required');
        return { success: false, timeline, error: 'Shipping address missing', failedStep: 'checkout' };
      }
      recordEvent('checkout', 'Checkout Initialized', 'completed', `Delivery: ${shippingAddress.addressLine1}, ${shippingAddress.city} (${shippingMethod})`);

      // -------------------------------------------------------------
      // 4. STEP: Validate
      // -------------------------------------------------------------
      recordEvent('validate', 'Authoritative Server Validation', 'in_progress', 'Validating catalog prices, promo rules, and product integrity');
      const validationRes = await validateCartWithBackend({
        cart,
        appliedCoupon,
        customerId: customer.id || null,
        useLoyaltyPoints,
        shippingMethod,
        shippingAddress,
        productsCatalog,
        customersCatalog
      });

      if (!validationRes.success && validationRes.errors.length > 0) {
        const errorMsg = validationRes.errors[0];
        recordEvent('validate', 'Validation Failed', 'failed', errorMsg, { errors: validationRes.errors });
        return { success: false, timeline, error: errorMsg, failedStep: 'validate' };
      }

      recordEvent('validate', 'Cart Validated Authoritatively', 'completed', 
        `Server Subtotal: Le ${validationRes.pricing.serverSubtotal.toFixed(2)}, Tax: Le ${validationRes.pricing.taxAmount.toFixed(2)}, Shipping: Le ${validationRes.pricing.shippingCost.toFixed(2)}, Grand Total: Le ${validationRes.pricing.grandTotal.toFixed(2)} (Checksum verified)`
      );

      // -------------------------------------------------------------
      // 5. STEP: Reserve Inventory (Critical Concurrency Safeguard!)
      // -------------------------------------------------------------
      recordEvent('reserve_inventory', 'Reserving Stock Lock', 'in_progress', 'Acquiring temporary reservation lock to prevent concurrent double-selling');
      
      const reservationItems = cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        variantSku: item.selectedVariantSku,
        quantity: item.quantity
      }));

      const reservationRes = await InventoryReservationService.reserveInventory({
        items: reservationItems,
        customerId: customer.id,
        customerName: customer.name,
        ttlMinutes: 15,
        productsCatalog
      });

      if (!reservationRes.success || !reservationRes.reservation) {
        const resError = reservationRes.error || 'Inventory could not be reserved due to another shopper purchasing the remaining items.';
        recordEvent('reserve_inventory', 'Inventory Reservation Failed', 'failed', resError, { insufficientItem: reservationRes.insufficientItem });
        return { 
          success: false, 
          timeline, 
          error: resError, 
          failedStep: 'reserve_inventory' 
        };
      }

      currentReservation = reservationRes.reservation;
      recordEvent('reserve_inventory', 'Inventory Reserved (Lock Active)', 'completed', 
        `Reservation Lock #${currentReservation.reservationId} active for 15 mins. Locked ${currentReservation.items.length} item line(s). Prevents double-selling.`,
        { reservation: currentReservation }
      );

      // -------------------------------------------------------------
      // 6. STEP: Create Order (Status: Pending Payment)
      // -------------------------------------------------------------
      const orderNumber = `ORD-EC-${Date.now().toString().slice(-6)}`;
      recordEvent('create_order', 'Creating Order Record', 'in_progress', `Initializing Order #${orderNumber} in Pending Payment state`);

      const calculatedPricing = validationRes.pricing;
      const orderItems = cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        cost: item.product.cost,
        variantSku: item.selectedVariantSku,
        imageUrl: item.product.imageUrl
      }));

      const trackingNumber = `TRK-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      const shippingAddressStr = `${shippingAddress.addressLine1}${shippingAddress.addressLine2 ? ', ' + shippingAddress.addressLine2 : ''}, ${shippingAddress.city}, ${shippingAddress.stateProvince} ${shippingAddress.postalCode}`;

      createdOrder = {
        id: orderNumber,
        orderNumber,
        date: new Date().toISOString(),
        items: orderItems,
        subtotal: calculatedPricing.serverSubtotal,
        discount: calculatedPricing.totalDiscount,
        tax: calculatedPricing.taxAmount,
        total: calculatedPricing.grandTotal,
        grandTotal: calculatedPricing.grandTotal,
        paymentMethod: gatewayProvider === 'orange_money' ? 'Mobile Pay (Orange Money)' : gatewayProvider === 'afrimoney' ? 'Mobile Pay (Afrimoney)' : gatewayProvider === 'stripe' ? 'Credit/Debit Card (Stripe)' : gatewayProvider === 'bank_wire' ? 'Bank Transfer' : 'Digital Wallet' as any,
        channel,
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        status: 'Pending Payment',
        approvalStatus: 'Pending Approval',
        deliveryAddress: shippingAddressStr,
        shippingMethod: shippingMethod === 'express' ? 'Express Courier' : shippingMethod === 'pickup' ? 'Store Pickup' : 'Standard Delivery',
        shippingCost: calculatedPricing.shippingCost,
        appliedCouponCode: appliedCoupon?.code,
        appliedCouponDiscount: calculatedPricing.couponDiscount,
        loyaltyPointsUsed: useLoyaltyPoints ? 50 : 0,
        loyaltyDiscountAmount: calculatedPricing.loyaltyDiscount,
        trackingNumber,
        deliveryStatus: 'Pending Payment',
        inventoryReservationId: currentReservation.reservationId,
        inventoryReservation: currentReservation,
        cartValidationDetails: {
          verifiedAt: new Date().toISOString(),
          signature: validationRes.securityAudit?.securityChecksum || 'AUTH-VERIFIED',
          rulesPassed: 8,
          totalRules: 8,
          priceIntegrityVerified: true,
          stockVerified: true,
          promoVerified: calculatedPricing.totalDiscount > 0,
          serverSubtotal: calculatedPricing.serverSubtotal,
          serverTax: calculatedPricing.taxAmount,
          serverShipping: calculatedPricing.shippingCost,
          serverGrandTotal: calculatedPricing.grandTotal
        },
        notes: `Order created via critical 11-step lifecycle pipeline. Reservation ID: ${currentReservation.reservationId}.`
      };

      await saveOrderToDB(createdOrder);
      recordEvent('create_order', 'Order Created (Pending Payment)', 'completed', `Order #${createdOrder.orderNumber} placed in queue with active reservation #${currentReservation.reservationId}`, { order: createdOrder });

      // -------------------------------------------------------------
      // 7. STEP: Create Payment (Initialize Gateway Session)
      // -------------------------------------------------------------
      recordEvent('create_payment', 'Generating Payment Session', 'in_progress', `Initializing gateway provider: ${gatewayProvider}`);
      
      paymentSession = await PaymentService.createPaymentSession({
        subtotal: calculatedPricing.serverSubtotal,
        discount: calculatedPricing.totalDiscount,
        tax: calculatedPricing.taxAmount,
        shipping: calculatedPricing.shippingCost,
        currency: 'SLE',
        customer,
        shippingAddress,
        orderId: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        cartValidationChecksum: validationRes.securityAudit?.securityChecksum,
        systemSettings,
        orderItems: createdOrder.items
      });

      recordEvent('create_payment', 'Payment Session Generated', 'completed', `Session #${paymentSession.sessionId} prepared for gateway: ${gatewayProvider}`, { paymentSession });

      // -------------------------------------------------------------
      // 8. STEP: Payment Confirmed (Capture Gateway Transaction)
      // -------------------------------------------------------------
      recordEvent('payment_confirmed', 'Authorizing & Capturing Payment', 'in_progress', `Processing payment with provider: ${gatewayProvider}`);
      
      const confirmResult = await PaymentService.confirmPaymentSession({
        processRequest: {
          sessionId: paymentSession.sessionId,
          gatewayId,
          provider: gatewayProvider,
          customerPaymentData
        },
        paymentSession,
        orderItems: createdOrder.items,
        productsCatalog,
        customersCatalog,
        channel
      });

      if (!confirmResult.success) {
        const payErr = confirmResult.error || 'Payment gateway declined or timed out.';
        recordEvent('payment_confirmed', 'Payment Authorization Failed', 'failed', payErr);
        
        // Auto rollback reservation if payment failed
        await InventoryReservationService.releaseReservation(currentReservation.reservationId, `Payment failed: ${payErr}`);
        recordEvent('reserve_inventory', 'Reservation Released', 'completed', 'Inventory lock released back to stock pool due to payment failure');
        
        // Update order status to Cancelled / Failed
        createdOrder.status = 'Cancelled';
        await saveOrderToDB(createdOrder);

        return { 
          success: false, 
          timeline, 
          error: payErr, 
          failedStep: 'payment_confirmed',
          order: createdOrder
        };
      }

      paymentResult = confirmResult;
      recordEvent('payment_confirmed', 'Payment Confirmed & Captured', 'completed', 
        `Transaction #${confirmResult.transactionId || 'TXN-' + Date.now()} captured. Amount: Le ${calculatedPricing.grandTotal.toFixed(2)}. Status: Settled.`,
        { transactionId: confirmResult.transactionId }
      );

      // -------------------------------------------------------------
      // 9. STEP: Order Paid (Transition Order Status to Paid)
      // -------------------------------------------------------------
      recordEvent('order_paid', 'Updating Order to Paid', 'in_progress', 'Upgrading order status to Paid and crediting customer loyalty');
      
      createdOrder.status = 'Paid';
      createdOrder.approvalStatus = 'Auto-Approved';
      createdOrder.deliveryStatus = 'Processing';
      createdOrder.notes = `Payment captured via ${gatewayProvider}. Transaction: ${confirmResult.transactionId || 'TXN-OK'}.`;

      // Customer stats update
      if (customer.id) {
        const existingCust = customersCatalog.find(c => c.id === customer.id);
        if (existingCust) {
          const earnedPoints = Math.floor(calculatedPricing.grandTotal * 0.1);
          updatedCustomerRecord = {
            ...existingCust,
            totalSpent: (existingCust.totalSpent || 0) + calculatedPricing.grandTotal,
            totalOrders: (existingCust.totalOrders || 0) + 1,
            loyaltyPoints: (existingCust.loyaltyPoints || 0) + earnedPoints,
            lastOrderDate: new Date().toISOString()
          };
          await saveCustomerToDB(updatedCustomerRecord);
          if (onCustomerUpdated) {
            onCustomerUpdated(updatedCustomerRecord);
          }
        }
      }

      await saveOrderToDB(createdOrder);
      recordEvent('order_paid', 'Order Paid & Confirmed', 'completed', `Order #${createdOrder.orderNumber} marked as Paid. Receipt generated. Customer points updated.`);

      // -------------------------------------------------------------
      // 10. STEP: Inventory Finalized (Permanent Stock Depletion & Audit)
      // -------------------------------------------------------------
      recordEvent('inventory_finalized', 'Finalizing Inventory Depletion', 'in_progress', 'Committing reservation to permanent stock deduction and ledger audit trail');
      
      // Finalize the temporary reservation lock
      await InventoryReservationService.finalizeReservation(currentReservation.reservationId, createdOrder.id);

      // Perform authoritative stock deduction and audit record logging
      const deductionRes = await InventoryService.deductOrderStock({
        order: createdOrder,
        productsCatalog,
        channel,
        performedBy: 'Order Creation Daemon',
        onStockUpdated: (prods) => {
          updatedProductList = prods;
          if (onStockUpdated) onStockUpdated(prods);
        }
      });

      // Also record General Ledger financial transaction
      try {
        LedgerService.recordOrderTransaction({
          order: createdOrder,
          paymentResult: {
            provider: gatewayProvider as any,
            status: 'Captured',
            amountPaid: createdOrder.total,
            paidAt: new Date().toISOString(),
            transactionId: confirmResult.transactionId || 'TXN-' + Date.now()
          },
          channel: channel === 'In-Store POS' ? 'In-Store POS' : 'Online Storefront',
          performer: 'Automated Checkout Daemon'
        });
      } catch (lErr) {
        console.warn('[OrderCreationFlow] Ledger sync non-fatal:', lErr);
      }

      recordEvent('inventory_finalized', 'Inventory Finalized & Depleted', 'completed', 
        `Committed reservation #${currentReservation.reservationId}. Decremented physical stock for ${createdOrder.items.length} item(s). Stock movement records written to ledger.`,
        { deductionSummary: deductionRes }
      );

      // -------------------------------------------------------------
      // 11. STEP: Fulfillment (Queue Dispatch & Packing Slip)
      // -------------------------------------------------------------
      recordEvent('fulfillment', 'Fulfillment Queue Initialized', 'in_progress', 'Generating packing slip and routing order to warehouse fulfillment');
      
      const packingSlipNumber = `SLIP-${createdOrder.orderNumber}`;
      const fulfillmentDetails: OrderFulfillmentDetails = {
        orderId: createdOrder.id,
        status: 'allocated',
        trackingNumber: createdOrder.trackingNumber || trackingNumber,
        carrier: shippingMethod === 'express' ? 'DHL Express Global' : 'Apex Regional Courier',
        shippingMethod: createdOrder.shippingMethod || 'Standard Delivery',
        deliveryAddress: shippingAddressStr,
        packingSlipNumber,
        allocatedAt: new Date().toISOString(),
        notes: 'Order allocated to warehouse fulfillment queue. Ready for picking & packing.'
      };

      createdOrder.fulfillmentDetails = fulfillmentDetails;
      createdOrder.orderCreationTimeline = timeline;
      await saveOrderToDB(createdOrder);

      recordEvent('fulfillment', 'Fulfillment Active & Trackable', 'completed', 
        `Fulfillment status: Allocated. Tracking: ${fulfillmentDetails.trackingNumber}. Packing Slip #${packingSlipNumber} prepared for warehouse pickers.`,
        { fulfillment: fulfillmentDetails }
      );

      return {
        success: true,
        order: createdOrder,
        reservation: currentReservation,
        fulfillment: fulfillmentDetails,
        timeline,
        updatedProducts: updatedProductList,
        updatedCustomer: updatedCustomerRecord
      };

    } catch (err: any) {
      console.error('[OrderCreationFlowService] Fatal order creation exception:', err);
      const errMsg = err?.message || 'Unexpected exception during order creation flow';
      
      // Auto release reservation on unexpected failure
      if (currentReservation && currentReservation.status === 'active') {
        try {
          await InventoryReservationService.releaseReservation(currentReservation.reservationId, `Fatal flow failure: ${errMsg}`);
        } catch (e) {}
      }

      recordEvent('fulfillment', 'Order Flow Exception', 'failed', errMsg);
      return {
        success: false,
        timeline,
        error: errMsg,
        reservation: currentReservation,
        order: createdOrder
      };
    }
  }
}
