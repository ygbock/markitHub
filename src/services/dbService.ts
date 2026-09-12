import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  writeBatch,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Product, Customer, StaffMember, Order, AuditLog, SystemSettings, Category, ProductReview, ReviewStatus, ReviewAdminResponse, MonimeCheckoutSessionRecord } from '../types';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_CUSTOMERS, 
  INITIAL_STAFF, 
  INITIAL_ORDERS, 
  INITIAL_AUDIT_LOGS,
  INITIAL_CATEGORIES,
  INITIAL_REVIEWS
} from '../data/mockData';
import { DEFAULT_HOMEPAGE_CONFIG } from '../data/homepageConfig';

// Firestore collection names
export const COLLECTIONS = {
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  STAFF: 'staff',
  ORDERS: 'orders',
  AUDIT_LOGS: 'audit_logs',
  SETTINGS: 'settings',
  SHIFT_REPORTS: 'shift_reports',
  CATEGORIES: 'categories',
  REVIEWS: 'reviews',
  MONIME_SESSIONS: 'monime_sessions'
} as const;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  // Transient tab state errors (iframe reloading, tab visibility toggles, network offline) are non-critical
  if (
    errMsg.includes('closing') || 
    errMsg.includes('hidden') || 
    errMsg.includes('IndexedDatabase') ||
    errMsg.includes('unavailable') ||
    errMsg.includes('Could not reach Cloud Firestore backend') ||
    errMsg.includes('client is offline') ||
    (error as any)?.code === 'unavailable'
  ) {
    console.info('Firestore offline/cached state:', errMsg);
  } else {
    console.warn('Firestore Status:', JSON.stringify(errInfo));
  }
  return errInfo;
}

export const DEFAULT_SETTINGS: SystemSettings = {
  currency: 'SLE',
  businessName: 'Nexus Enterprise Commerce',
  taxRate: 0.085,
  enableSoundEffects: true,
  lowStockThreshold: 10,

  business: {
    companyName: 'Nexus Enterprise Commerce',
    legalName: 'Nexus Retail & POS Global LLC',
    tagline: 'Point-of-Sale Terminal & Multi-Channel Commerce Suite',
    registrationNumber: 'REG-2026-994821',
    taxId: 'VAT-SL-88492019-TX',
    phone: '+232 (76) 555-NEXUS',
    email: 'support@nexuscommerce.io',
    website: 'https://nexuspos.io',
    address: '450 Rawdon Street, Suite 800',
    city: 'Freetown',
    state: 'Western Area',
    postalCode: '00232',
    country: 'Sierra Leone',
    logoUrl: '',
    timeZone: 'GMT (UTC+0)',
  },

  currencyConfig: {
    primaryCurrency: 'SLE',
    symbolPosition: 'prefix',
    spaceBetween: true,
    decimalPlaces: 2,
    multiCurrencyCheckout: true,
    autoUpdateRates: true,
  },

  tax: {
    defaultTaxRate: 8.5,
    taxName: 'GST / Sales Tax',
    taxCalculation: 'exclusive',
    allowTaxExemption: true,
    taxRegistrationNumber: 'VAT-SL-88492019-TX',
    enableSecondaryTax: false,
    secondaryTaxRate: 2.5,
    secondaryTaxName: 'Municipal Surcharge',
  },

  receipt: {
    printerType: 'thermal-80mm',
    headerText: 'THANK YOU FOR VISITING NEXUS',
    footerText: 'Please retain receipt for exchange within 30 days',
    returnPolicy: 'Items may be exchanged or returned with valid receipt within 30 days of purchase in original packaging.',
    showLogo: true,
    showCashierName: true,
    showCustomerInfo: true,
    showBarcode: true,
    showQrCode: true,
    autoPrintOnCheckout: true,
    autoEmailReceipt: true,
  },

  invoiceNumbering: {
    invoicePrefix: 'INV-',
    nextInvoiceNumber: 1001,
    digitPadding: 5,
    includeYearMonth: true,
    resetSequence: 'yearly',
    creditNotePrefix: 'CN-',
    quotePrefix: 'QTE-',
  },

  pos: {
    terminalName: 'Register #01 - Main Checkout Counter',
    enableSoundEffects: true,
    defaultCustomerName: 'Walk-in Guest',
    quickCashPresets: [10, 20, 50, 100, 500, 1000],
    requireManagerPinForDiscount: true,
    maxDiscountWithoutPin: 15,
    requireManagerPinForRefund: true,
    allowPriceOverride: false,
    autoOpenCashDrawer: true,
    fastBarcodeAdd: true,
    maxParkedCarts: 12,
  },

  inventoryRules: {
    preventNegativeStock: true,
    trackVariants: true,
    stockDeductionTiming: 'on_checkout',
    valuationMethod: 'FIFO',
    enforceStockAudit: true,
    autoBatchTracking: true,
  },

  lowStock: {
    globalLowStockThreshold: 10,
    criticalStockThreshold: 3,
    notifyOnLowStock: true,
    autoGenerateReorderDrafts: true,
    defaultReorderMultiplier: 2.5,
  },

  order: {
    orderPrefix: 'ORD-',
    minOrderValue: 0,
    enabledChannels: {
      pos: true,
      ecom: true,
      mobile: true,
      phone: true,
    },
    autoArchiveDays: 90,
    defaultOrderStatus: 'Completed',
    allowOrderNotes: true,
  },

  delivery: {
    enableLocalDelivery: true,
    enableStorePickup: true,
    defaultDeliveryFee: 15.00,
    freeDeliveryThreshold: 150.00,
    estimatedDeliveryDays: '1-2 Business Days',
    selectedCarrier: 'In-House Express Dispatch',
    deliveryZones: [
      { id: 'zone-1', name: 'Downtown / Central District', fee: 10.00, zipCodes: '00232, 00233' },
      { id: 'zone-2', name: 'Greater Metro Area', fee: 20.00, zipCodes: '00234, 00235, 00236' },
      { id: 'zone-3', name: 'Regional Express', fee: 35.00, zipCodes: '00240, 00250' },
    ],
  },

  paymentMethods: {
    cashEnabled: true,
    cardEnabled: true,
    digitalWalletEnabled: true,
    mobileMoneyEnabled: true,
    bankTransferEnabled: true,
    installmentsEnabled: false,
    defaultMethod: 'Cash',
    cardSurchargePercent: 0,
    mobileMoneyProvider: 'Orange Money / Afrimoney / M-Pesa',
    gateways: [
      {
        id: 'gw_monime',
        provider: 'monime',
        name: 'Monime Financial Infrastructure',
        description: 'Multi-rail embedded payments, hosted checkout sessions, mobile money, cards, and payouts in minor currency units',
        enabled: true,
        environment: 'sandbox',
        credentials: {
          publishableKey: '',
          secretKey: '',
          merchantId: '',
          monimeSpaceId: '',
          monimeAccessToken: '',
          webhookSecret: '',
        },
        surchargePercent: 0,
        fixedFee: 0,
        supportedCurrencies: ['SLE', 'USD', 'EUR', 'GBP', 'NGN', 'GHS'],
        settlementLedgerAccount: '1024 - Monime Clearing & Settlement Escrow',
        autoCapture: true,
        allowGuestCheckout: true,
      },
      {
        id: 'gw_orange_money',
        provider: 'orange_money',
        name: 'Orange Money Mobile Wallet',
        description: 'Instant USSD Push STK authorization (*144*4*4#) with real-time settlement',
        enabled: true,
        isDefault: true,
        environment: 'sandbox',
        credentials: {
          merchantId: 'OM-NEXUS-884920',
          ussdCode: '*144*4*4#',
          webhookSecret: 'whsec_om_live_994821',
        },
        surchargePercent: 0,
        fixedFee: 0,
        supportedCurrencies: ['SLE', 'USD'],
        settlementLedgerAccount: '1030 - Orange Money Settlement Escrow',
        autoCapture: true,
        allowGuestCheckout: true,
      },
      {
        id: 'gw_afrimoney',
        provider: 'afrimoney',
        name: 'Africell Afrimoney Gateway',
        description: 'Direct Africell mobile money wallet prompt (*161#) with instant confirmation',
        enabled: true,
        environment: 'sandbox',
        credentials: {
          merchantId: 'AFRI-POS-2026',
          ussdCode: '*161#',
          webhookSecret: 'whsec_afri_live_773612',
        },
        surchargePercent: 0,
        fixedFee: 0,
        supportedCurrencies: ['SLE', 'USD'],
        settlementLedgerAccount: '1050 - Afrimoney Settlement Account',
        autoCapture: true,
        allowGuestCheckout: true,
      },
      {
        id: 'gw_stripe',
        provider: 'stripe',
        name: 'Stripe Global Card Payments',
        description: 'Accept Visa, Mastercard, American Express and Apple/Google Pay with 3D-Secure 2.0',
        enabled: true,
        environment: 'sandbox',
        credentials: {
          publishableKey: 'pk_test_nexus_9984201948',
          secretKey: 'sk_test_nexus_secret_enc_39104',
          webhookSecret: 'whsec_stripe_883921',
        },
        surchargePercent: 0,
        fixedFee: 0,
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'SLE', 'NGN', 'GHS'],
        settlementLedgerAccount: '1040 - Stripe Clearing Account',
        autoCapture: true,
        allowGuestCheckout: true,
      },
      {
        id: 'gw_bank_wire',
        provider: 'bank_wire',
        name: 'Direct Bank Wire (SLCB / Ecobank)',
        description: 'Direct interbank wire transfer with automatic reference invoice reconciliation',
        enabled: true,
        environment: 'sandbox',
        credentials: {
          bankName: 'Sierra Leone Commercial Bank (SLCB)',
          accountName: 'Nexus Retail & POS Global LLC',
          accountNumber: '00300188920194',
          swiftBic: 'SLCBSLFR',
          routingNotes: 'Rawdon Street Branch, Freetown',
        },
        surchargePercent: 0,
        fixedFee: 0,
        supportedCurrencies: ['SLE', 'USD', 'EUR', 'GBP'],
        settlementLedgerAccount: '1020 - Operating Bank Account',
        autoCapture: false,
        allowGuestCheckout: true,
      },
      {
        id: 'gw_bnpl_klarna',
        provider: 'bnpl_klarna',
        name: 'Klarna / Split Payment Rail',
        description: 'Split in 4 interest-free installments or 30-day invoice terms',
        enabled: false,
        environment: 'sandbox',
        credentials: {
          merchantId: 'KLARNA-MID-7729',
          publishableKey: 'kl_test_pub_994821',
        },
        surchargePercent: 0,
        fixedFee: 0,
        supportedCurrencies: ['USD', 'EUR', 'GBP'],
        settlementLedgerAccount: '1060 - BNPL Clearing Account',
        autoCapture: true,
        allowGuestCheckout: true,
      },
      {
        id: 'gw_cash_on_delivery',
        provider: 'cash_on_delivery',
        name: 'Cash on Delivery / In-Store Pickup',
        description: 'Tender cash physically upon home delivery dispatch or at counter pickup',
        enabled: true,
        environment: 'sandbox',
        credentials: {},
        surchargePercent: 0,
        fixedFee: 0,
        supportedCurrencies: ['SLE', 'USD'],
        settlementLedgerAccount: '1010 - Cash on Hand',
        autoCapture: true,
        allowGuestCheckout: true,
      },
    ],
  },

  notifications: {
    emailNotificationsEnabled: true,
    notificationEmail: 'manager@nexuscommerce.io',
    notifyOnNewOrder: true,
    notifyOnLowStock: true,
    notifyOnRefund: true,
    dailySalesReport: true,
    smsAlertsEnabled: false,
    smsPhone: '+232 (76) 555-0199',
  },

  userRolesSecurity: {
    supervisorPin: '1234',
    sessionTimeoutMinutes: 30,
    requirePinOnCashierSwitch: true,
    defaultNewStaffRole: 'Cashier',
    twoFactorAuthEnforced: false,
    lockoutAfterFailedAttempts: 5,
  },

  integrations: {
    barcodeScannerMode: 'hid_keyboard',
    accountingExportFormat: 'QuickBooks',
    cloudSyncEnabled: true,
    webhookUrl: 'https://api.nexuscommerce.io/v1/webhooks/orders',
    geminiAiCommerceEnabled: true,
    thermalPrinterIp: '192.168.1.120:9100',
  },

  homepageConfig: DEFAULT_HOMEPAGE_CONFIG
};

/**
 * Seeds initial database data into Firestore if collections are empty.
 */
export async function seedInitialFirestoreData(): Promise<{ seeded: boolean; message: string }> {
  try {
    const productsSnap = await getDocs(collection(db, COLLECTIONS.PRODUCTS));
    if (!productsSnap.empty) {
      return { seeded: false, message: 'Firestore already populated.' };
    }

    console.info('Database ready. Seeding initial Firestore collections...');
    const batch = writeBatch(db);

    // Seed products
    INITIAL_PRODUCTS.forEach(p => {
      const pRef = doc(db, COLLECTIONS.PRODUCTS, p.id);
      batch.set(pRef, p);
    });

    // Seed customers
    INITIAL_CUSTOMERS.forEach(c => {
      const cRef = doc(db, COLLECTIONS.CUSTOMERS, c.id);
      batch.set(cRef, c);
    });

    // Seed staff
    INITIAL_STAFF.forEach(s => {
      const sRef = doc(db, COLLECTIONS.STAFF, s.id);
      batch.set(sRef, s);
    });

    // Seed initial orders
    INITIAL_ORDERS.forEach(o => {
      const oRef = doc(db, COLLECTIONS.ORDERS, o.id);
      batch.set(oRef, o);
    });

    // Seed audit logs
    INITIAL_AUDIT_LOGS.forEach(a => {
      const aRef = doc(db, COLLECTIONS.AUDIT_LOGS, a.id);
      batch.set(aRef, a);
    });

    // Seed categories
    INITIAL_CATEGORIES.forEach(cat => {
      const catRef = doc(db, COLLECTIONS.CATEGORIES, cat.id);
      batch.set(catRef, cat);
    });

    // Seed reviews
    INITIAL_REVIEWS.forEach(rev => {
      const revRef = doc(db, COLLECTIONS.REVIEWS, rev.id);
      batch.set(revRef, rev);
    });

    // Seed settings (SLE default currency)
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'general');
    batch.set(settingsRef, {
      ...DEFAULT_SETTINGS,
      lastUpdated: new Date().toISOString()
    });

    await batch.commit();
    return { seeded: true, message: 'Initial data seeded into Firestore.' };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.PRODUCTS);
    return { seeded: false, message: `Local offline mode active.` };
  }
}

/**
 * Product Database Operations
 */
export function subscribeProducts(onUpdate: (products: Product[]) => void, onError?: (err: any) => void) {
  const colRef = collection(db, COLLECTIONS.PRODUCTS);
  return onSnapshot(colRef, (snapshot) => {
    if (!snapshot.empty) {
      const prods: Product[] = [];
      snapshot.forEach(docSnap => {
        prods.push(docSnap.data() as Product);
      });
      onUpdate(prods);
    } else {
      onUpdate([]);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, COLLECTIONS.PRODUCTS);
    if (onError) onError(err);
  });
}

export async function saveProductToDB(product: Product): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.PRODUCTS, product.id);
    await setDoc(docRef, product, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.PRODUCTS}/${product.id}`);
  }
}

export async function deleteProductFromDB(productId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.PRODUCTS, productId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.PRODUCTS}/${productId}`);
  }
}

/**
 * Customer Database Operations
 */
export function subscribeCustomers(onUpdate: (customers: Customer[]) => void, onError?: (err: any) => void) {
  const colRef = collection(db, COLLECTIONS.CUSTOMERS);
  return onSnapshot(colRef, (snapshot) => {
    if (!snapshot.empty) {
      const custs: Customer[] = [];
      snapshot.forEach(docSnap => {
        custs.push(docSnap.data() as Customer);
      });
      onUpdate(custs);
    } else {
      onUpdate([]);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, COLLECTIONS.CUSTOMERS);
    if (onError) onError(err);
  });
}

export async function saveCustomerToDB(customer: Customer): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.CUSTOMERS, customer.id);
    await setDoc(docRef, customer, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.CUSTOMERS}/${customer.id}`);
  }
}

export async function deleteCustomerFromDB(customerId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.CUSTOMERS, customerId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.CUSTOMERS}/${customerId}`);
  }
}

/**
 * Order Database Operations
 */
export function subscribeOrders(onUpdate: (orders: Order[]) => void, onError?: (err: any) => void) {
  const colRef = collection(db, COLLECTIONS.ORDERS);
  return onSnapshot(colRef, (snapshot) => {
    if (!snapshot.empty) {
      const ordersList: Order[] = [];
      snapshot.forEach(docSnap => {
        ordersList.push(docSnap.data() as Order);
      });
      // Sort newest first
      ordersList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onUpdate(ordersList);
    } else {
      onUpdate([]);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, COLLECTIONS.ORDERS);
    if (onError) onError(err);
  });
}

export async function saveOrderToDB(order: Order): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.ORDERS, order.id);
    await setDoc(docRef, order);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.ORDERS}/${order.id}`);
  }
}

/**
 * Staff Database Operations
 */
export function subscribeStaff(onUpdate: (staff: StaffMember[]) => void, onError?: (err: any) => void) {
  const colRef = collection(db, COLLECTIONS.STAFF);
  return onSnapshot(colRef, (snapshot) => {
    if (!snapshot.empty) {
      const staffList: StaffMember[] = [];
      snapshot.forEach(docSnap => {
        staffList.push(docSnap.data() as StaffMember);
      });
      onUpdate(staffList);
    } else {
      onUpdate([]);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, COLLECTIONS.STAFF);
    if (onError) onError(err);
  });
}

export async function saveStaffToDB(staff: StaffMember): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.STAFF, staff.id);
    await setDoc(docRef, staff, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.STAFF}/${staff.id}`);
  }
}

export async function deleteStaffFromDB(staffId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.STAFF, staffId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.STAFF}/${staffId}`);
  }
}

/**
 * Audit Logs Database Operations
 */
export function subscribeAuditLogs(onUpdate: (logs: AuditLog[]) => void, onError?: (err: any) => void) {
  const colRef = collection(db, COLLECTIONS.AUDIT_LOGS);
  return onSnapshot(colRef, (snapshot) => {
    if (!snapshot.empty) {
      const logsList: AuditLog[] = [];
      snapshot.forEach(docSnap => {
        logsList.push(docSnap.data() as AuditLog);
      });
      logsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onUpdate(logsList);
    } else {
      onUpdate([]);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, COLLECTIONS.AUDIT_LOGS);
    if (onError) onError(err);
  });
}

export async function saveAuditLogToDB(log: AuditLog): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.AUDIT_LOGS, log.id);
    await setDoc(docRef, log);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.AUDIT_LOGS}/${log.id}`);
  }
}

/**
 * Settings & Currency Database Operations
 */
export function subscribeSettings(onUpdate: (settings: SystemSettings) => void, onError?: (err: any) => void) {
  const docRef = doc(db, COLLECTIONS.SETTINGS, 'general');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data() as Partial<SystemSettings>;
      const merged: SystemSettings = {
        ...DEFAULT_SETTINGS,
        ...data,
        business: { ...DEFAULT_SETTINGS.business, ...(data.business || {}) },
        currencyConfig: { ...DEFAULT_SETTINGS.currencyConfig, ...(data.currencyConfig || {}) },
        tax: { ...DEFAULT_SETTINGS.tax, ...(data.tax || {}) },
        receipt: { ...DEFAULT_SETTINGS.receipt, ...(data.receipt || {}) },
        invoiceNumbering: { ...DEFAULT_SETTINGS.invoiceNumbering, ...(data.invoiceNumbering || {}) },
        pos: { ...DEFAULT_SETTINGS.pos, ...(data.pos || {}) },
        inventoryRules: { ...DEFAULT_SETTINGS.inventoryRules, ...(data.inventoryRules || {}) },
        lowStock: { ...DEFAULT_SETTINGS.lowStock, ...(data.lowStock || {}) },
        order: { ...DEFAULT_SETTINGS.order, ...(data.order || {}) },
        delivery: { ...DEFAULT_SETTINGS.delivery, ...(data.delivery || {}) },
        paymentMethods: { ...DEFAULT_SETTINGS.paymentMethods, ...(data.paymentMethods || {}) },
        notifications: { ...DEFAULT_SETTINGS.notifications, ...(data.notifications || {}) },
        userRolesSecurity: { ...DEFAULT_SETTINGS.userRolesSecurity, ...(data.userRolesSecurity || {}) },
        integrations: { ...DEFAULT_SETTINGS.integrations, ...(data.integrations || {}) },
      };
      onUpdate(merged);
    } else {
      onUpdate(DEFAULT_SETTINGS);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, `${COLLECTIONS.SETTINGS}/general`);
    if (onError) onError(err);
  });
}

export async function saveSettingsToDB(settings: Partial<SystemSettings>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, 'general');
    await setDoc(docRef, {
      ...settings,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.SETTINGS}/general`);
  }
}

/**
 * Categories Database Operations
 */
export function subscribeCategories(onUpdate: (categories: Category[]) => void, onError?: (err: any) => void) {
  const q = query(collection(db, COLLECTIONS.CATEGORIES));
  return onSnapshot(q, (snapshot) => {
    const categories: Category[] = [];
    snapshot.forEach(docSnap => {
      categories.push(docSnap.data() as Category);
    });
    // Sort categories alphabetically
    categories.sort((a, b) => a.name.localeCompare(b.name));
    onUpdate(categories);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, COLLECTIONS.CATEGORIES);
    if (onError) onError(err);
  });
}

export async function saveCategoryToDB(category: Category): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.CATEGORIES, category.id);
    await setDoc(docRef, {
      ...category,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.CATEGORIES}/${category.id}`);
  }
}

export async function deleteCategoryFromDB(categoryId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.CATEGORIES, categoryId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.CATEGORIES}/${categoryId}`);
  }
}

/**
 * ==========================================
 * Product Reviews Database & Moderation API
 * ==========================================
 */

/**
 * Subscribes to real-time reviews stream from Firestore.
 */
export function subscribeReviews(onUpdate: (reviews: ProductReview[]) => void, onError?: (err: any) => void) {
  const q = query(collection(db, COLLECTIONS.REVIEWS));
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const reviews: ProductReview[] = [];
      snapshot.forEach(docSnap => {
        reviews.push(docSnap.data() as ProductReview);
      });
      // Sort newest date first
      reviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onUpdate(reviews);
    } else {
      onUpdate(INITIAL_REVIEWS);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, COLLECTIONS.REVIEWS);
    if (onError) onError(err);
  });
}

/**
 * Saves or updates a review in Firestore.
 */
export async function saveReviewToDB(review: ProductReview): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.REVIEWS, review.id);
    await setDoc(docRef, {
      ...review,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.REVIEWS}/${review.id}`);
  }
}

/**
 * Updates review moderation status (approve, hide, flag)
 */
export async function moderateReviewInDB(
  reviewId: string, 
  status: ReviewStatus, 
  flagReason?: string
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.REVIEWS, reviewId);
    const updatePayload: Partial<ProductReview> & { updatedAt: string } = {
      status,
      updatedAt: new Date().toISOString()
    };
    if (status === 'flagged' && flagReason) {
      updatePayload.flagReason = flagReason;
      updatePayload.flaggedAt = new Date().toISOString();
    } else if (status === 'approved') {
      updatePayload.flagReason = undefined;
    }
    await setDoc(docRef, updatePayload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTIONS.REVIEWS}/${reviewId}`);
  }
}

/**
 * Adds an official admin response to a review
 */
export async function respondToReviewInDB(
  reviewId: string, 
  adminResponse: ReviewAdminResponse
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.REVIEWS, reviewId);
    await setDoc(docRef, {
      adminResponse,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTIONS.REVIEWS}/${reviewId}`);
  }
}

/**
 * Removes an admin response from a review
 */
export async function removeReviewResponseInDB(reviewId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.REVIEWS, reviewId);
    await setDoc(docRef, {
      adminResponse: null,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTIONS.REVIEWS}/${reviewId}`);
  }
}

/**
 * Deletes a review from Firestore.
 */
export async function deleteReviewFromDB(reviewId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.REVIEWS, reviewId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.REVIEWS}/${reviewId}`);
  }
}

/**
 * Increments helpful count for a review
 */
export async function incrementReviewHelpfulInDB(reviewId: string, currentCount: number = 0): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.REVIEWS, reviewId);
    await setDoc(docRef, {
      helpfulCount: (currentCount || 0) + 1,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTIONS.REVIEWS}/${reviewId}`);
  }
}

/**
 * Helper to check if a customer has purchased a product/variant in a completed order.
 * Strictly implements the rule:
 * "Only customers who actually purchased the product should automatically receive 'Verified Purchase'."
 */
export function checkCustomerVerifiedPurchase(
  orders: Order[],
  customerIdentifier: { customerId?: string; email?: string; orderId?: string },
  productId: string,
  variantSku?: string
): { isVerified: boolean; matchedOrder?: Order; matchedItem?: any } {
  if (!orders || orders.length === 0 || !productId) {
    return { isVerified: false };
  }

  // Look for completed or delivered orders
  for (const order of orders) {
    // Only count successful/completed orders
    const isCompleted = !order.status || order.status === 'Completed';
    if (!isCompleted) continue;

    // Check if the order matches the customer identity
    const orderCustomerMatch = 
      (customerIdentifier.orderId && order.id.toLowerCase() === customerIdentifier.orderId.toLowerCase().trim()) ||
      (customerIdentifier.customerId && order.customerId && order.customerId === customerIdentifier.customerId) ||
      (customerIdentifier.email && order.customerName && order.customerName.toLowerCase().includes(customerIdentifier.email.toLowerCase().split('@')[0]));

    if (!orderCustomerMatch && !customerIdentifier.orderId) {
      continue;
    }

    // Check if the order contains the product
    const matchedItem = order.items.find(item => {
      const matchProduct = item.productId === productId;
      if (!matchProduct) return false;
      if (variantSku && item.variantSku) {
        return item.variantSku === variantSku;
      }
      return true;
    });

    if (matchedItem) {
      return {
        isVerified: true,
        matchedOrder: order,
        matchedItem
      };
    }
  }

  return { isVerified: false };
}

/**
 * ============================================================================
 * MONIME CHECKOUT SESSIONS & WEBHOOK FIRESTORE PERSISTENCE
 * ============================================================================
 */

export async function saveMonimeSessionToDB(session: MonimeCheckoutSessionRecord): Promise<void> {
  try {
    const docId = session.monime_session_id || session.id;
    const docRef = doc(db, COLLECTIONS.MONIME_SESSIONS, docId);
    await setDoc(docRef, {
      ...session,
      id: docId,
      updated_at: new Date().toISOString(),
      created_at: session.created_at || new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.MONIME_SESSIONS}/${session.monime_session_id || session.id}`);
  }
}

export async function getMonimeSessionFromDB(sessionId: string): Promise<MonimeCheckoutSessionRecord | null> {
  try {
    const docRef = doc(db, COLLECTIONS.MONIME_SESSIONS, sessionId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as MonimeCheckoutSessionRecord;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${COLLECTIONS.MONIME_SESSIONS}/${sessionId}`);
    return null;
  }
}

export async function updateMonimeSessionStatusInDB(
  sessionId: string, 
  status: 'completed' | 'cancelled' | 'expired' | 'pending' | string,
  additionalData: Partial<MonimeCheckoutSessionRecord> = {}
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.MONIME_SESSIONS, sessionId);
    await setDoc(docRef, {
      status,
      updated_at: new Date().toISOString(),
      ...additionalData
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTIONS.MONIME_SESSIONS}/${sessionId}`);
  }
}

export function subscribeMonimeSessions(
  onUpdate: (sessions: MonimeCheckoutSessionRecord[]) => void, 
  onError?: (err: any) => void
) {
  const colRef = collection(db, COLLECTIONS.MONIME_SESSIONS);
  return onSnapshot(colRef, (snapshot) => {
    if (!snapshot.empty) {
      const list: MonimeCheckoutSessionRecord[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as MonimeCheckoutSessionRecord);
      });
      list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      onUpdate(list);
    } else {
      onUpdate([]);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, COLLECTIONS.MONIME_SESSIONS);
    if (onError) onError(err);
  });
}

/**
 * Executes full transactional settlement for a completed Monime Webhook in Firebase.
 * Updates Monime session, updates Order status, records Audit Log, and creates balanced Ledger entries.
 */
export async function processMonimeWebhookInFirebase(event: any): Promise<{
  success: boolean;
  message: string;
  orderId?: string;
  sessionId?: string;
}> {
  try {
    const eventType = event.type || event.eventType || 'checkout_session.completed';
    const data = event.data || event.result || event;
    const sessionId = data.id || data.sessionId || data.monime_session_id;
    const orderNumber = data.orderNumber || data.monime_order_number;
    const reference = data.reference || data.orderId || data.order_id;

    console.info(`[Monime Firebase Handler] Processing event: ${eventType} for session: ${sessionId || reference}`);

    if (eventType === 'checkout_session.completed' || eventType === 'payment.completed') {
      let matchedSession: MonimeCheckoutSessionRecord | null = null;

      if (sessionId) {
        matchedSession = await getMonimeSessionFromDB(sessionId);
      }

      const targetOrderId = matchedSession?.order_id || reference;

      // 1. Update Monime session in Firestore
      if (sessionId) {
        await updateMonimeSessionStatusInDB(sessionId, 'completed', {
          monime_order_number: orderNumber || matchedSession?.monime_order_number
        });
      }

      // 2. Update Order status in Firestore if target order is identified
      if (targetOrderId) {
        try {
          const orderDocRef = doc(db, COLLECTIONS.ORDERS, targetOrderId);
          const orderSnap = await getDoc(orderDocRef);
          if (orderSnap.exists()) {
            const currentOrder = orderSnap.data() as Order;
            const updatedOrder: Order = {
              ...currentOrder,
              status: 'Completed',
              paymentMethod: 'Monime Multi-Channel Gateway (Settled)'
            };
            await setDoc(orderDocRef, updatedOrder, { merge: true });

            // 3. Insert audit log in Firestore
            const auditDocRef = doc(db, COLLECTIONS.AUDIT_LOGS, `audit_monime_${Date.now()}`);
            const auditEntry: AuditLog = {
              id: `audit_monime_${Date.now()}`,
              timestamp: new Date().toISOString(),
              staffName: 'Monime Webhook Engine',
              role: 'System / Fintech',
              action: 'payment_completed',
              module: 'payment_gateways',
              details: `Monime multi-rail payment verified & completed for order ${currentOrder.id || targetOrderId} (Ref: ${orderNumber || sessionId || 'N/A'})`
            };
            await setDoc(auditDocRef, auditEntry);
          }
        } catch (orderErr) {
          console.warn('[Monime Firebase Handler] Order sync notice:', orderErr);
        }
      }

      return {
        success: true,
        message: `Monime payment completed successfully for ${targetOrderId || sessionId}`,
        orderId: targetOrderId,
        sessionId
      };
    } else if (eventType === 'checkout_session.cancelled' || eventType === 'checkout_session.expired') {
      if (sessionId) {
        const newStatus = eventType.includes('cancelled') ? 'cancelled' : 'expired';
        await updateMonimeSessionStatusInDB(sessionId, newStatus);
      }
      return {
        success: true,
        message: `Monime session marked as ${eventType}`,
        sessionId
      };
    }

    return {
      success: true,
      message: `Monime event ${eventType} acknowledged`,
      sessionId
    };
  } catch (err: any) {
    console.error('[Monime Firebase Handler] Error processing webhook:', err);
    return {
      success: false,
      message: err?.message || 'Error processing Monime webhook'
    };
  }
}


