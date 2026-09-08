import { 
  Customer, 
  Order, 
  PaymentConfirmationResult, 
  PaymentGatewayConfig, 
  PaymentSession, 
  PaymentSessionAvailableGateway, 
  PaymentSessionProcessRequest, 
  Product, 
  SystemSettings 
} from '../types';
import { getGatewayAdapter } from './paymentGateway';
import { OrderService } from './orderService';
import { InventoryService } from './inventoryService';
import { LedgerService } from './ledgerService';
import { DEFAULT_SETTINGS } from './dbService';

export interface CreatePaymentSessionParams {
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  currency: string;
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
  orderId?: string;
  orderNumber?: string;
  cartValidationChecksum?: string;
  systemSettings?: SystemSettings;
  orderItems?: Order['items'];
}

export interface ConfirmPaymentSessionParams {
  processRequest: PaymentSessionProcessRequest;
  paymentSession: PaymentSession;
  orderItems: Order['items'];
  productsCatalog?: Product[];
  customersCatalog?: Customer[];
  systemSettings?: SystemSettings;
  channel?: 'Online Storefront' | 'In-Store POS' | string;
  onStockUpdated?: (updatedProducts: Product[]) => void;
  onCustomerUpdated?: (updatedCustomer: Customer) => void;
}

// In-memory active session store
const ACTIVE_PAYMENT_SESSIONS = new Map<string, PaymentSession>();

/**
 * Payment Service
 * 
 * Orchestrates the decoupled fintech architecture:
 * 
 * E-commerce
 *      ↓
 * Payment Service
 *      ↓
 * Payment Gateway
 *      ↓
 * Provider
 * 
 * Storefront receives a Payment Session.
 * Once confirmed:
 * Payment Service -> Order Service -> Inventory Service -> Ledger
 */
export class PaymentService {
  /**
   * 1. CREATE PAYMENT SESSION
   * Prepares an authoritative payment session for the storefront without coupling the UI to individual provider SDKs.
   */
  static async createPaymentSession(params: CreatePaymentSessionParams): Promise<PaymentSession> {
    const {
      subtotal,
      discount,
      tax,
      shipping,
      currency,
      customer,
      shippingAddress,
      orderId,
      orderNumber = `ORD-EC-${Date.now().toString().slice(-6)}`,
      cartValidationChecksum,
      systemSettings
    } = params;

    const baseGrandTotal = Math.max(0, subtotal - discount + tax + shipping);
    const configuredGateways: PaymentGatewayConfig[] = 
      systemSettings?.paymentMethods?.gateways || DEFAULT_SETTINGS.paymentMethods.gateways || [];

    // Filter enabled gateways for the customer context (supporting current currency & guest settings)
    const availableGateways: PaymentSessionAvailableGateway[] = configuredGateways
      .filter(gw => gw.enabled && gw.availableInStorefront !== false)
      .map(gw => {
        const surchargeAmount = Number(
          ((baseGrandTotal * (gw.surchargePercent || 0)) / 100 + (gw.fixedFee || 0)).toFixed(2)
        );
        const totalWithSurcharge = Number((baseGrandTotal + surchargeAmount).toFixed(2));

        const requiresFields: ('phone' | 'pin' | 'card' | 'bank_ref' | 'otp')[] = [];
        if (gw.provider === 'orange_money' || gw.provider === 'afrimoney') {
          requiresFields.push('phone', 'pin');
        } else if (gw.provider === 'stripe' || gw.provider === 'card_terminal') {
          requiresFields.push('card');
        } else if (gw.provider === 'bank_wire') {
          requiresFields.push('bank_ref');
        } else if (gw.provider === 'monime') {
          requiresFields.push('phone', 'card');
        }

        return {
          id: gw.id,
          provider: gw.provider,
          name: gw.name,
          description: gw.description,
          surchargeAmount,
          totalWithSurcharge,
          environment: gw.environment,
          requiresFields,
          instructions: gw.customerInstruction || (
            gw.provider === 'monime'
              ? `Monime multi-rail hosted checkout session & minor currency unit processing`
              : gw.provider === 'orange_money'
              ? `Authorize via Orange USSD ${gw.credentials.ussdCode || '*144*4*4#'} prompt.`
              : gw.provider === 'afrimoney'
              ? `Authorize via Africell USSD ${gw.credentials.ussdCode || '*161#'} prompt.`
              : gw.provider === 'bank_wire'
              ? `Transfer to ${gw.credentials.bankName || 'SLCB'} Acct: ${gw.credentials.accountNumber || '00300188920194'}`
              : undefined
          ),
          credentialsPreview: {
            publishableKey: gw.credentials.publishableKey,
            ussdCode: gw.credentials.ussdCode,
            bankName: gw.credentials.bankName,
            accountNumber: gw.credentials.accountNumber,
            accountName: gw.credentials.accountName,
            swiftBic: gw.credentials.swiftBic,
          }
        };
      });

    const sessionId = `psess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const clientToken = `ctok_${Math.random().toString(36).substring(2, 15)}`;

    const session: PaymentSession = {
      sessionId,
      clientToken,
      orderId: orderId || orderNumber,
      orderNumber,
      cartValidationChecksum: cartValidationChecksum || `CHKSUM-${Date.now()}`,
      amount: baseGrandTotal,
      currency,
      breakdown: {
        subtotal,
        discount,
        tax,
        shipping,
        surcharge: 0,
        grandTotal: baseGrandTotal
      },
      customer,
      shippingAddress,
      status: 'requires_payment_method',
      availableGateways,
      selectedGatewayId: availableGateways[0]?.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 mins
    };

    ACTIVE_PAYMENT_SESSIONS.set(sessionId, session);
    console.info(`[PaymentService] Payment Session created: ${sessionId} for Order #${orderNumber} (${currency} ${baseGrandTotal})`);

    return session;
  }

  /**
   * Retrieves active payment session by ID
   */
  static getPaymentSession(sessionId: string): PaymentSession | undefined {
    return ACTIVE_PAYMENT_SESSIONS.get(sessionId);
  }

  /**
   * 2. CONFIRM PAYMENT & EXECUTE POST-CONFIRMATION FINTECH PIPELINE
   * 
   * Flow:
   * Payment Gateway Authorization
   *       ↓
   * Order Service (Generate / Update Order Record)
   *       ↓
   * Inventory Service (Deduct Stocks & Record Movement)
   *       ↓
   * Ledger Service (Immutable Double-Entry Financial Journal)
   */
  static async confirmPaymentSession(params: ConfirmPaymentSessionParams): Promise<PaymentConfirmationResult> {
    const {
      processRequest,
      paymentSession,
      orderItems,
      productsCatalog = [],
      customersCatalog = [],
      systemSettings,
      channel = 'Online Storefront',
      onStockUpdated,
      onCustomerUpdated
    } = params;

    const gatewayConfig = (systemSettings?.paymentMethods?.gateways || DEFAULT_SETTINGS.paymentMethods.gateways || [])
      .find(gw => gw.id === processRequest.gatewayId || gw.provider === processRequest.provider) || {
      id: processRequest.gatewayId || 'default',
      provider: processRequest.provider,
      name: 'Default Payment Provider',
      description: 'Standard payment processing rail',
      enabled: true,
      environment: 'sandbox' as const,
      credentials: {},
      surchargePercent: 0,
      fixedFee: 0,
      supportedCurrencies: ['SLE', 'USD'],
      settlementLedgerAccount: '1010 - Cash on Hand',
      autoCapture: true,
      allowGuestCheckout: true
    };

    const targetGateway = paymentSession.availableGateways.find(g => g.id === processRequest.gatewayId);
    const finalAmount = targetGateway?.totalWithSurcharge ?? paymentSession.amount;

    // 1. PAYMENT GATEWAY: Process through provider adapter
    const adapter = getGatewayAdapter(processRequest.provider);
    const gatewayResponse = await adapter.processPayment(
      gatewayConfig,
      processRequest,
      finalAmount,
      paymentSession.currency
    );

    if (!gatewayResponse.success) {
      return {
        success: false,
        transactionId: '',
        paymentSessionId: paymentSession.sessionId,
        gatewayId: processRequest.gatewayId,
        provider: processRequest.provider,
        amountPaid: 0,
        currency: paymentSession.currency,
        status: 'Failed',
        paidAt: new Date().toISOString(),
        receiptNumber: '',
        orderId: paymentSession.orderId || '',
        orderNumber: paymentSession.orderNumber || '',
        ledgerJournalId: '',
        inventoryUpdated: false,
        error: gatewayResponse.error || 'Payment declined by gateway'
      };
    }

    const partialConfirmation: Partial<PaymentConfirmationResult> = {
      success: true,
      transactionId: gatewayResponse.transactionId,
      paymentSessionId: paymentSession.sessionId,
      gatewayId: processRequest.gatewayId,
      provider: processRequest.provider,
      amountPaid: gatewayResponse.amountPaid,
      currency: gatewayResponse.currency,
      status: gatewayResponse.status,
      paidAt: new Date().toISOString(),
      receiptNumber: gatewayResponse.receiptNumber,
      orderNumber: paymentSession.orderNumber,
      orderId: paymentSession.orderId
    };

    // 2. ORDER SERVICE: Create authoritative order record
    const orderResult = await OrderService.createOrderFromPayment({
      paymentResult: partialConfirmation,
      paymentSession,
      orderItems,
      customersCatalog,
      invoicePrefix: systemSettings?.invoiceNumbering?.invoicePrefix || 'INV-',
      onCustomerUpdated
    });

    const finalizedOrder = orderResult.order;

    // 3. INVENTORY SERVICE: Deduct stocks & log movement
    let inventoryUpdated = false;
    let stockMovementIds: string[] = [];
    if (gatewayResponse.status === 'Captured' || gatewayResponse.status === 'Authorized') {
      const inventoryResult = await InventoryService.deductOrderStock({
        order: finalizedOrder,
        productsCatalog,
        channel,
        performedBy: `Payment Service (${processRequest.provider})`,
        onStockUpdated
      });
      inventoryUpdated = inventoryResult.success;
      stockMovementIds = inventoryResult.stockMovementRecords.map(m => m.id);
    }

    // 4. LEDGER SERVICE: Write double-entry financial ledger journal entry
    const journalEntry = LedgerService.recordOrderTransaction({
      order: finalizedOrder,
      paymentSession,
      paymentResult: partialConfirmation,
      channel,
      performer: `Fintech Gateway (${processRequest.provider})`
    });

    // Update payment session status
    paymentSession.status = gatewayResponse.status === 'Captured' ? 'captured' : 'authorized';
    ACTIVE_PAYMENT_SESSIONS.set(paymentSession.sessionId, paymentSession);

    console.info(`[PaymentService] Pipeline Complete. Order: ${finalizedOrder.orderNumber}, Txn: ${gatewayResponse.transactionId}, Ledger: ${journalEntry.entryNumber}`);

    return {
      success: true,
      transactionId: gatewayResponse.transactionId,
      paymentSessionId: paymentSession.sessionId,
      gatewayId: processRequest.gatewayId,
      provider: processRequest.provider,
      amountPaid: gatewayResponse.amountPaid,
      currency: gatewayResponse.currency,
      status: gatewayResponse.status,
      paidAt: new Date().toISOString(),
      receiptNumber: gatewayResponse.receiptNumber,
      orderId: finalizedOrder.id,
      orderNumber: finalizedOrder.orderNumber || finalizedOrder.id,
      order: finalizedOrder,
      ledgerJournalId: journalEntry.id,
      inventoryUpdated,
      stockMovementIds
    };
  }
}
