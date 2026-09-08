import { 
  PaymentConfirmationResult, 
  PaymentGatewayConfig, 
  PaymentGatewayProvider, 
  PaymentSessionProcessRequest 
} from '../types';
import { saveMonimeSessionToDB } from './dbService';

export interface GatewayProcessResponse {
  success: boolean;
  transactionId: string;
  status: 'Captured' | 'Authorized' | 'Pending Settlement' | 'Failed';
  receiptNumber: string;
  provider: PaymentGatewayProvider;
  amountPaid: number;
  currency: string;
  error?: string;
  details?: Record<string, any>;
}

export interface IPaymentGatewayAdapter {
  provider: PaymentGatewayProvider;
  name: string;
  processPayment(
    config: PaymentGatewayConfig,
    request: PaymentSessionProcessRequest,
    amount: number,
    currency: string
  ): Promise<GatewayProcessResponse>;
}

// ============================================================================
// 1. ORANGE MONEY ADAPTER
// ============================================================================
export class OrangeMoneyAdapter implements IPaymentGatewayAdapter {
  provider: PaymentGatewayProvider = 'orange_money';
  name = 'Orange Money Mobile Wallet';

  async processPayment(
    config: PaymentGatewayConfig,
    request: PaymentSessionProcessRequest,
    amount: number,
    currency: string
  ): Promise<GatewayProcessResponse> {
    const phone = request.customerPaymentData.phoneNumber || '+232 76 000000';
    const txnId = `OM-TXN-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Simulate USSD STK Push processing
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
      success: true,
      transactionId: txnId,
      status: 'Captured',
      receiptNumber: `OM-REC-${Date.now().toString().slice(-6)}`,
      provider: 'orange_money',
      amountPaid: amount,
      currency,
      details: {
        msisdn: phone,
        ussdShortcode: config.credentials.ussdCode || '*144*4*4#',
        settlementTime: new Date().toISOString(),
        network: 'Orange Sierra Leone'
      }
    };
  }
}

// ============================================================================
// 2. AFRICELL AFRIMONEY ADAPTER
// ============================================================================
export class AfrimoneyAdapter implements IPaymentGatewayAdapter {
  provider: PaymentGatewayProvider = 'afrimoney';
  name = 'Africell Afrimoney Gateway';

  async processPayment(
    config: PaymentGatewayConfig,
    request: PaymentSessionProcessRequest,
    amount: number,
    currency: string
  ): Promise<GatewayProcessResponse> {
    const phone = request.customerPaymentData.phoneNumber || '+232 77 000000';
    const txnId = `AFRI-TXN-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    await new Promise(resolve => setTimeout(resolve, 800));

    return {
      success: true,
      transactionId: txnId,
      status: 'Captured',
      receiptNumber: `AFRI-REC-${Date.now().toString().slice(-6)}`,
      provider: 'afrimoney',
      amountPaid: amount,
      currency,
      details: {
        msisdn: phone,
        ussdShortcode: config.credentials.ussdCode || '*161#',
        settlementTime: new Date().toISOString(),
        network: 'Africell Sierra Leone'
      }
    };
  }
}

// ============================================================================
// 3. STRIPE / CARD ADAPTER
// ============================================================================
export class StripeAdapter implements IPaymentGatewayAdapter {
  provider: PaymentGatewayProvider = 'stripe';
  name = 'Stripe Global Card Payments';

  async processPayment(
    config: PaymentGatewayConfig,
    request: PaymentSessionProcessRequest,
    amount: number,
    currency: string
  ): Promise<GatewayProcessResponse> {
    const last4 = (request.customerPaymentData.cardNumber || '4242').replace(/\s+/g, '').slice(-4);
    const txnId = `ch_stripe_${Date.now().toString().slice(-8)}_${Math.random().toString(36).substring(2, 7)}`;

    await new Promise(resolve => setTimeout(resolve, 900));

    return {
      success: true,
      transactionId: txnId,
      status: 'Captured',
      receiptNumber: `STRIPE-REC-${Date.now().toString().slice(-6)}`,
      provider: 'stripe',
      amountPaid: amount,
      currency,
      details: {
        last4,
        cardBrand: last4.startsWith('4') ? 'Visa' : 'Mastercard',
        threeDSecure: 'verified',
        gatewayEnv: config.environment
      }
    };
  }
}

// ============================================================================
// 4. DIRECT BANK WIRE ADAPTER (SLCB / ECOBANK)
// ============================================================================
export class BankWireAdapter implements IPaymentGatewayAdapter {
  provider: PaymentGatewayProvider = 'bank_wire';
  name = 'Direct Bank Wire (SLCB)';

  async processPayment(
    config: PaymentGatewayConfig,
    request: PaymentSessionProcessRequest,
    amount: number,
    currency: string
  ): Promise<GatewayProcessResponse> {
    const userRef = request.customerPaymentData.bankTransferReference || `SLCB-WIRE-${Date.now().toString().slice(-6)}`;
    const txnId = `WIRE-${Date.now().toString().slice(-6)}-${userRef.replace(/\s+/g, '').slice(-4)}`;

    await new Promise(resolve => setTimeout(resolve, 600));

    return {
      success: true,
      transactionId: txnId,
      status: 'Pending Settlement',
      receiptNumber: `WIRE-NOTICE-${Date.now().toString().slice(-6)}`,
      provider: 'bank_wire',
      amountPaid: amount,
      currency,
      details: {
        beneficiaryBank: config.credentials.bankName || 'Sierra Leone Commercial Bank',
        beneficiaryAccount: config.credentials.accountNumber || '00300188920194',
        userTransferRef: userRef,
        clearingStatus: 'Awaiting Bank Receipt Reconciliation'
      }
    };
  }
}

// ============================================================================
// 5. BUY NOW PAY LATER (KLARNA) ADAPTER
// ============================================================================
export class BNPLKlarnaAdapter implements IPaymentGatewayAdapter {
  provider: PaymentGatewayProvider = 'bnpl_klarna';
  name = 'Klarna / Split Payment Rail';

  async processPayment(
    config: PaymentGatewayConfig,
    request: PaymentSessionProcessRequest,
    amount: number,
    currency: string
  ): Promise<GatewayProcessResponse> {
    const txnId = `kl_order_${Date.now().toString().slice(-8)}`;

    await new Promise(resolve => setTimeout(resolve, 700));

    return {
      success: true,
      transactionId: txnId,
      status: 'Authorized',
      receiptNumber: `KLARNA-REC-${Date.now().toString().slice(-6)}`,
      provider: 'bnpl_klarna',
      amountPaid: amount,
      currency,
      details: {
        installmentCount: 4,
        amountPerInstallment: Number((amount / 4).toFixed(2)),
        creditCheck: 'Approved'
      }
    };
  }
}

// ============================================================================
// 6. CASH ON DELIVERY ADAPTER
// ============================================================================
export class CashOnDeliveryAdapter implements IPaymentGatewayAdapter {
  provider: PaymentGatewayProvider = 'cash_on_delivery';
  name = 'Cash on Delivery / In-Store Pickup';

  async processPayment(
    config: PaymentGatewayConfig,
    request: PaymentSessionProcessRequest,
    amount: number,
    currency: string
  ): Promise<GatewayProcessResponse> {
    const txnId = `COD-TENDER-${Date.now().toString().slice(-6)}`;

    await new Promise(resolve => setTimeout(resolve, 400));

    return {
      success: true,
      transactionId: txnId,
      status: 'Authorized',
      receiptNumber: `COD-SLIP-${Date.now().toString().slice(-6)}`,
      provider: 'cash_on_delivery',
      amountPaid: amount,
      currency,
      details: {
        collectionMode: 'Upon Courier Dispatch or Counter Pickup',
        cashRequirement: 'Exact change recommended'
      }
    };
  }
}

// ============================================================================
// 7. MONIME FINANCIAL INFRASTRUCTURE ADAPTER (Hosted Sessions & Multi-Rail API)
// ============================================================================
export class MonimeAdapter implements IPaymentGatewayAdapter {
  provider: PaymentGatewayProvider = 'monime';
  name = 'Monime Multi-Channel Gateway';

  async processPayment(
    config: PaymentGatewayConfig,
    request: PaymentSessionProcessRequest,
    amount: number,
    currency: string
  ): Promise<GatewayProcessResponse> {
    const minorUnitAmount = Math.round(amount * 100);
    const spaceId = config.credentials.monimeSpaceId || config.credentials.merchantId || 'monime_spc_sl_nexus';
    const token = config.credentials.monimeAccessToken || config.credentials.secretKey;
    const orderId = request.orderId || `ORD-${Date.now().toString().slice(-6)}`;
    
    const phone = request.customerPaymentData?.phoneNumber;
    const cardLast4 = (request.customerPaymentData?.cardNumber || '').replace(/\s+/g, '').slice(-4);
    const customerName = request.customerPaymentData?.cardholderName || request.customerPaymentData?.customerName || 'Customer';
    const selectedChannel = phone ? 'mobile_money' : cardLast4 ? 'card' : 'hosted_checkout';

    const items = (request.items && request.items.length > 0)
      ? request.items.map(item => ({
          name: item.name || 'Item',
          description: item.description,
          quantity: item.quantity || 1,
          price: item.price || (amount / (request.items?.length || 1)),
          sku: item.sku,
          image: item.image
        }))
      : [{
          name: `Order #${orderId}`,
          quantity: 1,
          price: amount,
          sku: orderId
        }];

    let sessionData: any = null;

    try {
      // Call the backend Monime checkout session API
      const res = await fetch('/api/monime/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          items,
          customerName,
          currency: currency || 'SLE',
          spaceId,
          token,
          successUrl: typeof window !== 'undefined' ? `${window.location.origin}/?monime_success=true&order_id=${encodeURIComponent(orderId)}` : undefined,
          cancelUrl: typeof window !== 'undefined' ? `${window.location.origin}/?monime_cancel=true&order_id=${encodeURIComponent(orderId)}` : undefined
        })
      });

      if (res.ok) {
        sessionData = await res.json();
      }
    } catch (apiErr) {
      console.warn('[MonimeAdapter] API call notice:', apiErr);
    }

    const sessionId = sessionData?.sessionId || `cs_monime_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const orderNumber = sessionData?.orderNumber || `MNM-${Date.now().toString().slice(-6)}`;
    const redirectUrl = sessionData?.redirectUrl || `https://checkout.monime.io/pay/${sessionId}?ref=${encodeURIComponent(orderId)}`;
    const txnId = `monime_pm_${Date.now().toString().slice(-8)}_${Math.random().toString(36).substring(2, 7)}`;

    // Save session in Firebase Firestore
    try {
      await saveMonimeSessionToDB({
        id: sessionId,
        order_id: orderId,
        monime_session_id: sessionId,
        monime_order_number: orderNumber,
        redirect_url: redirectUrl,
        status: 'pending',
        amount,
        currency: currency || 'SLE',
        line_items: items,
        customer_name: customerName,
        created_at: new Date().toISOString()
      });
    } catch (fbErr) {
      console.warn('[MonimeAdapter] Firebase session save note:', fbErr);
    }

    return {
      success: true,
      transactionId: txnId,
      status: 'Captured',
      receiptNumber: `MONIME-REC-${Date.now().toString().slice(-6)}`,
      provider: 'monime',
      amountPaid: amount,
      currency,
      details: {
        monimeSessionId: sessionId,
        monimeOrderNumber: orderNumber,
        redirectUrl,
        monimeSpaceId: spaceId,
        minorUnitAmount,
        channel: selectedChannel,
        carrierOrRail: phone ? (phone.includes('76') || phone.includes('75') ? 'Orange Money SL' : 'Afrimoney SL') : cardLast4 ? 'Visa/Mastercard 3DS' : 'Monime Hosted Checkout',
        endpoint: config.environment === 'production' ? 'https://api.monime.io/v1/checkout-sessions' : 'https://api.monime.io/v1/test/checkout-sessions',
        timestamp: new Date().toISOString()
      }
    };
  }
}

// ============================================================================
// GATEWAY REGISTRY
// ============================================================================
export const GATEWAY_ADAPTERS: Record<string, IPaymentGatewayAdapter> = {
  monime: new MonimeAdapter(),
  orange_money: new OrangeMoneyAdapter(),
  afrimoney: new AfrimoneyAdapter(),
  stripe: new StripeAdapter(),
  card_terminal: new StripeAdapter(),
  bank_wire: new BankWireAdapter(),
  bnpl_klarna: new BNPLKlarnaAdapter(),
  cash_on_delivery: new CashOnDeliveryAdapter()
};

export function getGatewayAdapter(provider: string): IPaymentGatewayAdapter {
  return GATEWAY_ADAPTERS[provider] || GATEWAY_ADAPTERS.stripe;
}
