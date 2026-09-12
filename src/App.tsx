import React, { useState, useEffect } from 'react';
import { 
  INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_STAFF, 
  INITIAL_ORDERS, INITIAL_AUDIT_LOGS, INITIAL_CATEGORIES, INITIAL_REVIEWS,
  INITIAL_ADMIN_NOTIFICATIONS
} from './data/mockData';
import { 
  Product, Customer, StaffMember, Order, AuditLog, SystemSettings, 
  Category, StorefrontHomepageConfig, ProductReview, ReviewStatus, ReviewAdminResponse,
  AdminNotification, RefundRequestDetails 
} from './types';
import { 
  seedInitialFirestoreData,
  subscribeProducts, saveProductToDB, deleteProductFromDB,
  subscribeCustomers, saveCustomerToDB, deleteCustomerFromDB,
  subscribeOrders, saveOrderToDB,
  subscribeStaff, saveStaffToDB, deleteStaffFromDB,
  subscribeAuditLogs, saveAuditLogToDB,
  subscribeSettings, saveSettingsToDB, DEFAULT_SETTINGS,
  subscribeCategories, saveCategoryToDB, deleteCategoryFromDB,
  subscribeReviews, saveReviewToDB, moderateReviewInDB, respondToReviewInDB, deleteReviewFromDB,
  saveMonimeSessionToDB
} from './services/dbService';
import { PaymentService } from './services/paymentService';
import { DEFAULT_HOMEPAGE_CONFIG } from './data/homepageConfig';

// Import subcomponents
import DashboardOverview from './components/DashboardOverview';
import InventoryModule from './components/InventoryModule';
import POSModule from './components/POSModule';
import ECommerceStorefront from './components/ECommerceStorefront';
import { TenantProvider } from './context/TenantContext';
import CRMModule from './components/CRMModule';
import InvoiceModule from './components/InvoiceModule';
import ReportsModule from './components/ReportsModule';
import SecurityModule from './components/SecurityModule';
import SettingsModule from './components/SettingsModule';
import ECommerceAdminPortal, { EcommerceAdminTab } from './components/ecommerce/admin/ECommerceAdminPortal';
import { ReviewModerationModule } from './components/reviews/ReviewModerationModule';
import CurrencySelectorModal from './components/CurrencySelectorModal';
import AdminNotificationCenter from './components/AdminNotificationCenter';
import EnhancedSidebar, { AdminSubTab } from './components/EnhancedSidebar';
import { useCurrency } from './context/CurrencyContext';
import { decrementProductStock } from './utils/inventoryUtils';
import { getOrderDeliveryTelemetry, flagOrderAsDelivered, buildAdminRefundNotification } from './utils/orderManagementUtils';

// Icons
import { 
  LayoutDashboard, Package, Smartphone, ShieldCheck, 
  Users, FileText, ShoppingBag, Terminal, Network, WifiOff, RefreshCw, Coins, Menu, MessageSquare,
  Bell, AlertTriangle, Clock 
} from 'lucide-react';

export default function App() {
  // Database States
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(INITIAL_STAFF);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [reviews, setReviews] = useState<ProductReview[]>(INITIAL_REVIEWS);

  // Operator states
  const [activeStaff, setActiveStaff] = useState<StaffMember>(INITIAL_STAFF[0]); // Elena (Admin)
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(INITIAL_CUSTOMERS[0]); // Sarah Connor

  // Navigation states
  const [currentView, setCurrentView] = useState<'Admin' | 'ECommerce'>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/store')) {
      return 'ECommerce';
    }
    return 'Admin';
  });
  const [adminSubTab, setAdminSubTab] = useState<AdminSubTab>('Dashboard');

  // Central System Settings state
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);

  // Content-Driven Storefront Homepage CMS Configuration
  const [homepageConfig, setHomepageConfig] = useState<StorefrontHomepageConfig>(() => {
    try {
      const saved = localStorage.getItem('nexus_homepage_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved homepage config', e);
    }
    return DEFAULT_HOMEPAGE_CONFIG;
  });

  const handleSaveHomepageConfig = (newConfig: StorefrontHomepageConfig) => {
    setHomepageConfig(newConfig);
    try {
      localStorage.setItem('nexus_homepage_config', JSON.stringify(newConfig));
    } catch (e) {
      console.warn('Failed to persist homepage config', e);
    }
  };

  // Sidebar responsiveness & static rail state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [eCommerceActiveTab, setECommerceActiveTab] = useState<EcommerceAdminTab>('Storefront');
  const [dbStatus, setDbStatus] = useState<'connected' | 'syncing' | 'offline' | 'error'>('connected');
  const [lastSynced, setLastSynced] = useState<string>('Just now');

  // Mobile POS specific simulator state
  const [mobilePosActive, setMobilePosActive] = useState(false);
  const [deviceOffline, setDeviceOffline] = useState(false);
  const [offlineBuffer, setOfflineBuffer] = useState<{ id: string; total: number; qty: number }[]>([]);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const { currentCurrency } = useCurrency();

  // Admin Notification state
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_admin_notifications');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse admin notifications', e);
    }
    return INITIAL_ADMIN_NOTIFICATIONS;
  });
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [selectedOrderIdForInvoice, setSelectedOrderIdForInvoice] = useState<string | null>(null);

  // Metrics computation for sidebar badges and notifications
  const lowStockCount = products.filter(p => p.stock <= 10).length;
  const totalOrdersCount = orders.length;
  const totalCustomersCount = customers.length;
  const pendingReviewsCount = reviews.filter(r => r.status === 'pending').length;

  const refundRequestsCount = orders.filter(o => 
    o.refundRequested || 
    o.status === 'Refund Requested' || 
    getOrderDeliveryTelemetry(o).effectiveStatus === 'Refund Requested'
  ).length;

  const awaitingConfirmationCount = orders.filter(o => 
    getOrderDeliveryTelemetry(o).effectiveStatus === 'Awaiting Receipt Confirmation'
  ).length;

  const unreadNotifCount = adminNotifications.filter(n => !n.read).length;

  const handleManualSync = () => {
    setDbStatus('syncing');
    seedInitialFirestoreData().catch(() => {});
    setTimeout(() => {
      setDbStatus('connected');
      setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 600);
  };

  // Live Firestore database synchronization with fallback to local storage
  useEffect(() => {
    // 1. Check local cache first for instant boot
    const savedProds = localStorage.getItem('nexus_products');
    const savedCats = localStorage.getItem('nexus_categories');
    const savedCusts = localStorage.getItem('nexus_customers');
    const savedOrders = localStorage.getItem('nexus_orders');
    const savedLogs = localStorage.getItem('nexus_audit_logs');
    const savedSettings = localStorage.getItem('nexus_system_settings');
    const savedReviews = localStorage.getItem('nexus_reviews');
    const savedNotifs = localStorage.getItem('nexus_admin_notifications');

    if (savedProds) setProducts(JSON.parse(savedProds));
    if (savedCats) setCategories(JSON.parse(savedCats));
    if (savedCusts) setCustomers(JSON.parse(savedCusts));
    if (savedOrders) setOrders(JSON.parse(savedOrders));
    if (savedLogs) setAuditLogs(JSON.parse(savedLogs));
    if (savedSettings) setSystemSettings(JSON.parse(savedSettings));
    if (savedReviews) setReviews(JSON.parse(savedReviews));
    if (savedNotifs) setAdminNotifications(JSON.parse(savedNotifs));

    // 2. Attach live Firestore subscriptions with offline tolerance
    const handleSubscriptionError = () => {
      setDbStatus('offline');
    };

    const unsubProds = subscribeProducts((liveProds) => {
      if (liveProds.length > 0) {
        setProducts(liveProds);
        localStorage.setItem('nexus_products', JSON.stringify(liveProds));
        setDbStatus('connected');
        setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    }, handleSubscriptionError);

    const unsubCusts = subscribeCustomers((liveCusts) => {
      if (liveCusts.length > 0) {
        setCustomers(liveCusts);
        localStorage.setItem('nexus_customers', JSON.stringify(liveCusts));
      }
    }, handleSubscriptionError);

    const unsubOrders = subscribeOrders((liveOrders) => {
      if (liveOrders.length > 0) {
        setOrders(liveOrders);
        localStorage.setItem('nexus_orders', JSON.stringify(liveOrders));
      }
    }, handleSubscriptionError);

    const unsubStaff = subscribeStaff((liveStaff) => {
      if (liveStaff.length > 0) {
        setStaffMembers(liveStaff);
      }
    }, handleSubscriptionError);

    const unsubLogs = subscribeAuditLogs((liveLogs) => {
      if (liveLogs.length > 0) {
        setAuditLogs(liveLogs);
        localStorage.setItem('nexus_audit_logs', JSON.stringify(liveLogs));
      }
    }, handleSubscriptionError);

    const unsubSettings = subscribeSettings((liveSettings) => {
      if (liveSettings) {
        setSystemSettings(liveSettings);
        localStorage.setItem('nexus_system_settings', JSON.stringify(liveSettings));
      }
    }, handleSubscriptionError);

    const unsubCategories = subscribeCategories((liveCats) => {
      if (liveCats.length > 0) {
        setCategories(liveCats);
        localStorage.setItem('nexus_categories', JSON.stringify(liveCats));
      }
    }, handleSubscriptionError);

    const unsubReviews = subscribeReviews((liveReviews) => {
      if (liveReviews.length > 0) {
        setReviews(liveReviews);
        localStorage.setItem('nexus_reviews', JSON.stringify(liveReviews));
      }
    }, handleSubscriptionError);

    return () => {
      unsubProds();
      unsubCusts();
      unsubOrders();
      unsubStaff();
      unsubLogs();
      unsubSettings();
      unsubCategories();
      unsubReviews();
    };
  }, []);

  // Payment completion is authoritative from the server/webhook.
  // Never mark an order paid or decrement inventory from a browser redirect.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const returnOrderId = urlParams.get('order_id');
    if (!returnOrderId) return;

    // The success page is informational only. Firestore subscriptions will
    // reflect the verified server-side settlement when it has completed.
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }, []);

  const handleSaveCategory = async (category: Category) => {
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === category.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = category;
        return next;
      }
      return [...prev, category];
    });
    await saveCategoryToDB(category);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    await deleteCategoryFromDB(categoryId);
  };

  const saveToLocal = (newProds: Product[], newCusts: Customer[], newOrders: Order[], newLogs: AuditLog[]) => {
    localStorage.setItem('nexus_products', JSON.stringify(newProds));
    localStorage.setItem('nexus_customers', JSON.stringify(newCusts));
    localStorage.setItem('nexus_orders', JSON.stringify(newOrders));
    localStorage.setItem('nexus_audit_logs', JSON.stringify(newLogs));
  };

  // Helper to log audit trail records
  const createAuditRecord = (action: string, module: AuditLog['module'], details: string, updatedLogs?: AuditLog[]) => {
    const newLog: AuditLog = {
      id: `log-${Math.floor(100 + Math.random() * 899)}`,
      timestamp: new Date().toISOString(),
      staffName: activeStaff.name,
      role: activeStaff.role,
      action,
      module,
      details
    };
    const targetLogs = updatedLogs || auditLogs;
    const finalLogs = [newLog, ...targetLogs];
    setAuditLogs(finalLogs);
    saveAuditLogToDB(newLog).catch(() => {});
    return finalLogs;
  };

  // Interconnected Actions
  // 1. Reordering replenishment
  const handleQuickReorder = (productId: string, amount: number) => {
    const updatedProducts = products.map(p => {
      if (p.id === productId) {
        const newStock = p.stock + amount;
        // Also update individual first variant if present
        const updatedVariants = p.variants.map((v, i) => i === 0 ? { ...v, stock: v.stock + amount } : v);
        const updated = { ...p, stock: newStock, variants: updatedVariants };
        saveProductToDB(updated).catch(() => {});
        return updated;
      }
      return p;
    });
    setProducts(updatedProducts);

    const found = products.find(p => p.id === productId);
    const logs = createAuditRecord(
      'Stock Replenishment', 
      'Inventory', 
      `Supplied +${amount} units for ${found?.name || productId}. New Stock: ${found ? found.stock + amount : 'N/A'}`
    );
    saveToLocal(updatedProducts, customers, orders, logs);
  };

  // 2. Add product catalog item
  const handleAddProduct = (newProd: Product) => {
    const updatedProducts = [newProd, ...products];
    setProducts(updatedProducts);
    saveProductToDB(newProd).catch(() => {});
    const logs = createAuditRecord(
      'Provisioned Product', 
      'Inventory', 
      `Provisioned product item: ${newProd.name} (${newProd.sku}). Category: ${newProd.category}. Location: ${newProd.location}`
    );
    saveToLocal(updatedProducts, customers, orders, logs);
  };

  // 3. Edit product catalog item
  const handleUpdateProduct = (updatedProd: Product) => {
    const updatedProducts = products.map(p => p.id === updatedProd.id ? updatedProd : p);
    setProducts(updatedProducts);
    saveProductToDB(updatedProd).catch(() => {});
    const logs = createAuditRecord(
      'Updated Product File', 
      'Inventory', 
      `Updated product details for SKU: ${updatedProd.sku}. Stock: ${updatedProd.stock}`
    );
    saveToLocal(updatedProducts, customers, orders, logs);
  };

  // 4. Delete product catalog item
  const handleDeleteProduct = (productId: string) => {
    const found = products.find(p => p.id === productId);
    const updatedProducts = products.filter(p => p.id !== productId);
    setProducts(updatedProducts);
    deleteProductFromDB(productId).catch(() => {});
    const logs = createAuditRecord(
      'Product Deleted', 
      'Inventory', 
      `Removed product SKU: ${found?.sku || productId} from active telemetry list.`
    );
    saveToLocal(updatedProducts, customers, orders, logs);
  };

  // 5. Add / Quick-Register CRM Customer
  const handleAddCustomer = (newCust: Customer) => {
    const updatedCustomers = [newCust, ...customers];
    setCustomers(updatedCustomers);
    saveCustomerToDB(newCust).catch(() => {});
    const logs = createAuditRecord(
      'Provisioned CRM Customer', 
      'CRM', 
      `Created CRM file for: ${newCust.name} (${newCust.email}). Awarded starting loyalty.`
    );
    saveToLocal(products, updatedCustomers, orders, logs);
  };

  // 5b. Update CRM Customer profile
  const handleUpdateCustomer = (updatedCust: Customer) => {
    const updatedCustomers = customers.map(c => c.id === updatedCust.id ? updatedCust : c);
    setCustomers(updatedCustomers);
    saveCustomerToDB(updatedCust).catch(() => {});
    const logs = createAuditRecord(
      'Updated CRM Customer',
      'CRM',
      `Modified record for: ${updatedCust.name} (${updatedCust.email}). Segment: ${updatedCust.segment}, Loyalty: ${updatedCust.loyaltyPoints} pts.`
    );
    saveToLocal(products, updatedCustomers, orders, logs);

    if (activeCustomer && activeCustomer.id === updatedCust.id) {
      setActiveCustomer(updatedCust);
    }
  };

  // 5c. Delete CRM Customer record
  const handleDeleteCustomer = (customerId: string) => {
    const found = customers.find(c => c.id === customerId);
    const updatedCustomers = customers.filter(c => c.id !== customerId);
    setCustomers(updatedCustomers);
    deleteCustomerFromDB(customerId).catch(() => {});
    const logs = createAuditRecord(
      'Deleted CRM Customer',
      'CRM',
      `Deleted record for: ${found?.name || customerId} from central database.`
    );
    saveToLocal(products, updatedCustomers, orders, logs);

    if (activeCustomer && activeCustomer.id === customerId) {
      setActiveCustomer(updatedCustomers[0] || null);
    }
  };

  // 6. Main Sales & Order Processor (decrements inventory, increments customer loyalty)
  const handleProcessOrder = (newOrder: Order) => {
    // 1. Decrement product inventories (taking into account conversion_multiplier for UOM pack breakdowns)
    const updatedProducts = products.map(p => {
      const orderItems: any[] = [];
      newOrder.items.forEach(item => {
        if (item.productId === p.id) {
          orderItems.push(item);
        }
        const fullProduct = products.find(prod => prod.id === item.productId);
        if (fullProduct && fullProduct.productType === 'Bundle' && fullProduct.bundleKitItems) {
          const kitItem = fullProduct.bundleKitItems.find((b: any) => b.productId === p.id);
          if (kitItem) {
            orderItems.push({
              quantity: item.quantity * kitItem.quantity,
              conversion_multiplier: 1
            });
          }
        }
      });

      if (orderItems.length > 0) {
        let currentProd = { ...p };
        for (const orderItem of orderItems) {
          const multiplier = orderItem.conversion_multiplier || 1;
          currentProd = decrementProductStock(
            currentProd,
            orderItem.quantity,
            multiplier,
            orderItem.variantSku,
            {
              orderId: newOrder.id,
              invoiceRef: newOrder.id,
              customerName: newOrder.customerName,
              cashierName: newOrder.cashierName
            }
          );
        }
        saveProductToDB(currentProd).catch(() => {});
        return currentProd;
      }
      return p;
    });

    // 2. Increment customer loyalty points (e.g., 10% of order total is points, plus past orders tracking)
    const pointsGained = Math.round(newOrder.total / 10);
    const updatedCustomers = customers.map(c => {
      if (c.id === newOrder.customerId || c.name === newOrder.customerName) {
        const updated = { 
          ...c, 
          loyaltyPoints: c.loyaltyPoints + pointsGained,
          segment: c.loyaltyPoints + pointsGained > 300 ? 'VIP' as const : 'Regular' as const,
          purchaseHistoryIds: [...(c.purchaseHistoryIds || []), newOrder.id]
        };
        saveCustomerToDB(updated).catch(() => {});
        return updated;
      }
      return c;
    });

    // 3. Save order
    const updatedOrders = [newOrder, ...orders];
    saveOrderToDB(newOrder).catch(() => {});

    setProducts(updatedProducts);
    setCustomers(updatedCustomers);
    setOrders(updatedOrders);

    // 4. Record audit log
    const emailNote = newOrder.receiptSentToEmail ? ` Receipt automatically dispatched to ${newOrder.receiptSentToEmail}.` : '';
    const logs = createAuditRecord(
      'POS Transaction Processed',
      'POS',
      `Processed order ${newOrder.id} total $${newOrder.total}. Items: ${newOrder.items.length}. Payment Method: ${newOrder.paymentMethod}.${emailNote}`
    );

    saveToLocal(updatedProducts, updatedCustomers, updatedOrders, logs);

    // If customer was active customer, update state
    if (activeCustomer && (activeCustomer.id === newOrder.customerId || activeCustomer.name === newOrder.customerName)) {
      const updatedActive = updatedCustomers.find(c => c.id === activeCustomer.id);
      if (updatedActive) {
        setActiveCustomer(updatedActive);
      }
    }
  };

  // 6b. Process POS Order Refund / Void
  const handleRefundOrder = (orderId: string, reason: string) => {
    const found = orders.find(o => o.id === orderId);
    const updatedOrders = orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'Refunded' as const,
          notes: `${o.notes ? o.notes + ' | ' : ''}REFUNDED: ${reason}`
        };
      }
      return o;
    });
    setOrders(updatedOrders);
    if (found) {
      saveOrderToDB({
        ...found,
        status: 'Refunded',
        notes: `${found.notes ? found.notes + ' | ' : ''}REFUNDED: ${reason}`
      }).catch(() => {});
    }
    const logs = createAuditRecord(
      'POS Order Refunded',
      'POS',
      `Authorized refund/void for Order ${orderId}. Reason: ${reason}. Amount: $${found?.total || 0}`
    );
    saveToLocal(products, customers, updatedOrders, logs);
  };

  // 6c. Update Order Status (e.g., settle outstanding invoice)
  const handleUpdateOrderStatus = (orderId: string, status: Order['status']) => {
    const updatedOrders = orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status,
          outstandingBalance: status === 'Completed' ? 0 : o.outstandingBalance
        };
      }
      return o;
    });
    setOrders(updatedOrders);
    const found = orders.find(o => o.id === orderId);
    if (found) {
      saveOrderToDB({
        ...found,
        status,
        outstandingBalance: status === 'Completed' ? 0 : found.outstandingBalance
      }).catch(() => {});
    }
    const logs = createAuditRecord(
      'Order Status Updated',
      'Billing',
      `Order ${orderId} status set to ${status}. Outstanding balance updated.`
    );
    saveToLocal(products, customers, updatedOrders, logs);
  };

  // 7. E-commerce storefront buy action - Powered by Decoupled Payment Service
  const handlePlaceEcomOrder = async (newOrder: Order) => {
    const isMonime = 
      newOrder.paymentMethod === 'Monime Multi-Channel Gateway (Settled)' ||
      newOrder.paymentMethod?.toLowerCase().includes('monime') ||
      (newOrder as any).provider === 'monime' ||
      (newOrder as any).gatewayId === 'gw_monime';

    if (isMonime) {
      // 1. MONIME HOSTED CHECKOUT FLOW:
      // Extract credentials from central systemSettings, initiate checkout session via backend Monime orchestrator,
      // update order in Firestore to 'Pending Payment', and trigger redirect to the Monime gateway.
      const configuredGateways = systemSettings?.paymentMethods?.gateways || DEFAULT_SETTINGS.paymentMethods.gateways || [];
      const monimeGateway = 
        configuredGateways.find(g => g.provider === 'monime' && g.enabled) ||
        configuredGateways.find(g => g.provider === 'monime') ||
        DEFAULT_SETTINGS.paymentMethods.gateways.find(g => g.provider === 'monime');

      const spaceId = monimeGateway?.credentials?.monimeSpaceId || monimeGateway?.credentials?.merchantId || 'monime_spc_sl_nexus';
      const token = monimeGateway?.credentials?.monimeAccessToken || monimeGateway?.credentials?.secretKey || '';
      const orderId = newOrder.id || newOrder.orderNumber || `ORD-EC-${Date.now().toString().slice(-6)}`;
      const orderNumber = newOrder.orderNumber || `MNM-${Date.now().toString().slice(-6)}`;
      const primaryCurrency = (newOrder as any).currency || systemSettings?.currency?.primaryCurrency || 'SLE';

      // 1a. Authoritative Payment Session via Payment Service
      const session = await PaymentService.createPaymentSession({
        subtotal: newOrder.subtotal,
        discount: newOrder.discount || 0,
        tax: newOrder.tax || 0,
        shipping: newOrder.shippingCost || 0,
        currency: primaryCurrency,
        customer: {
          id: newOrder.customerId,
          name: newOrder.customerName || 'Customer',
          email: newOrder.customerEmail || 'customer@example.com',
          phone: newOrder.customerPhone || '',
          isGuest: !newOrder.customerId
        },
        orderId,
        orderNumber,
        systemSettings,
        orderItems: newOrder.items
      });

      // 1b. Initiate external checkout session with Monime API
      let redirectUrl = `https://checkout.monime.io/pay/${session.sessionId}?ref=${encodeURIComponent(orderId)}`;
      let resolvedSessionId = session.sessionId;

      try {
        const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const res = await fetch('/api/monime/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            items: newOrder.items.map(it => ({
              name: it.productName,
              quantity: it.quantity,
              price: it.price,
              sku: it.variantSku || it.productId
            })),
            customerName: newOrder.customerName || 'Customer',
            currency: primaryCurrency,
            spaceId,
            token,
            successUrl: originUrl ? `${originUrl}/?monime_success=true&order_id=${encodeURIComponent(orderId)}` : undefined,
            cancelUrl: originUrl ? `${originUrl}/?monime_cancel=true&order_id=${encodeURIComponent(orderId)}` : undefined
          })
        });

        if (res.ok) {
          const resData = await res.json();
          if (resData.redirectUrl) redirectUrl = resData.redirectUrl;
          if (resData.sessionId) resolvedSessionId = resData.sessionId;
        }
      } catch (monimeErr) {
        console.warn('[PaymentService] Monime session API notice:', monimeErr);
      }

      // 1c. Record pending order in Firestore & local state (marked as 'Pending Payment' awaiting webhook settlement / redirect return)
      const pendingOrder: Order = {
        ...newOrder,
        id: orderId,
        orderNumber,
        status: 'Pending Payment',
        deliveryStatus: 'Pending Payment',
        paymentMethod: 'Monime Multi-Channel Gateway (Settled)'
      };

      const updatedOrders = [pendingOrder, ...orders.filter(o => o.id !== orderId)];
      setOrders(updatedOrders);

      // Persist to Firestore
      try {
        await saveOrderToDB(pendingOrder);
        await saveMonimeSessionToDB({
          id: resolvedSessionId,
          order_id: orderId,
          monime_session_id: resolvedSessionId,
          monime_order_number: orderNumber,
          redirect_url: redirectUrl,
          status: 'pending',
          amount: newOrder.total,
          currency: primaryCurrency,
          line_items: newOrder.items.map(it => ({
            name: it.productName,
            quantity: it.quantity,
            price: it.price,
            sku: it.variantSku || it.productId
          })),
          customer_name: newOrder.customerName,
          created_at: new Date().toISOString()
        });
      } catch (dbErr) {
        console.error('Failed to persist Monime pending order to Firestore:', dbErr);
      }

      const logs = createAuditRecord(
        'Monime Checkout Session Created',
        'Billing',
        `Initiated Monime checkout session using credentials (Space ID: ${spaceId}) for order ${orderId} (${newOrder.total} ${primaryCurrency}). Order status updated to 'Pending Payment'. Redirecting customer to gateway.`
      );
      saveToLocal(products, customers, updatedOrders, logs);

      // 1d. Trigger redirect to the Monime gateway checkout URL
      if (typeof window !== 'undefined' && redirectUrl) {
        window.location.href = redirectUrl;
      }
      return;
    }

    // 2. STANDARD PAYMENT FLOW (Direct card, mobile money, cash on delivery, etc.)
    // Invoke PaymentService pipeline to execute authorization, order creation, inventory deduction & ledger settlement
    try {
      const configuredGateways = systemSettings?.paymentMethods?.gateways || DEFAULT_SETTINGS.paymentMethods.gateways || [];
      const targetGateway = 
        configuredGateways.find(g => g.name === newOrder.paymentMethod || g.provider === (newOrder as any).provider) ||
        configuredGateways[0] ||
        DEFAULT_SETTINGS.paymentMethods.gateways[0];

      const paymentSession = await PaymentService.createPaymentSession({
        subtotal: newOrder.subtotal,
        discount: newOrder.discount || 0,
        tax: newOrder.tax || 0,
        shipping: newOrder.shippingCost || 0,
        currency: (newOrder as any).currency || systemSettings?.currency?.primaryCurrency || 'SLE',
        customer: {
          id: newOrder.customerId,
          name: newOrder.customerName || 'Customer',
          email: newOrder.customerEmail || 'customer@example.com',
          phone: newOrder.customerPhone || '',
          isGuest: !newOrder.customerId
        },
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        systemSettings,
        orderItems: newOrder.items
      });

      const confirmResult = await PaymentService.confirmPaymentSession({
        processRequest: {
          sessionId: paymentSession.sessionId,
          gatewayId: targetGateway.id,
          provider: targetGateway.provider,
          customerPaymentData: {
            customerName: newOrder.customerName,
            phoneNumber: newOrder.customerPhone
          }
        },
        paymentSession,
        orderItems: newOrder.items,
        productsCatalog: products,
        customersCatalog: customers,
        systemSettings,
        channel: 'Online Storefront',
        onStockUpdated: (updatedProds) => {
          setProducts(updatedProds);
          localStorage.setItem('nexus_products', JSON.stringify(updatedProds));
        },
        onCustomerUpdated: (updatedCust) => {
          setCustomers(prev => prev.map(c => c.id === updatedCust.id ? updatedCust : c));
          if (activeCustomer && activeCustomer.id === updatedCust.id) {
            setActiveCustomer(updatedCust);
          }
        }
      });

      const finalizedOrder: Order = confirmResult.order || newOrder;

      const updatedOrders = [finalizedOrder, ...orders.filter(o => o.id !== finalizedOrder.id)];
      setOrders(updatedOrders);
      saveOrderToDB(finalizedOrder).catch(() => {});

      const logs = createAuditRecord(
        'eCommerce Purchase Processed',
        'Billing',
        `Storefront purchase ${finalizedOrder.id} total $${finalizedOrder.total}. Customer: ${finalizedOrder.customerName}. Payment Rail: ${targetGateway.name}.`
      );
      saveToLocal(products, customers, updatedOrders, logs);
    } catch (paymentErr) {
      console.error('[App] Direct payment processing fallback:', paymentErr);
      const updatedProducts = products.map(p => {
        const orderItem = newOrder.items.find(item => item.productId === p.id);
        if (orderItem) {
          const nextStock = Math.max(0, p.stock - orderItem.quantity);
          const updatedVariants = p.variants.map(v => {
            if (orderItem.variantSku && v.sku === orderItem.variantSku) {
              return { ...v, stock: Math.max(0, v.stock - orderItem.quantity) };
            }
            return v;
          });
          return { ...p, stock: nextStock, variants: updatedVariants, salesCount: p.salesCount + orderItem.quantity };
        }
        return p;
      });

      const pointsGained = Math.round(newOrder.total / 10);
      const updatedCustomers = customers.map(c => {
        if (c.id === newOrder.customerId || c.name === newOrder.customerName) {
          return { 
            ...c, 
            loyaltyPoints: c.loyaltyPoints + pointsGained,
            segment: c.loyaltyPoints + pointsGained > 300 ? 'VIP' as const : 'Regular' as const,
            purchaseHistoryIds: [...(c.purchaseHistoryIds || []), newOrder.id]
          };
        }
        return c;
      });

      const updatedOrders = [newOrder, ...orders.filter(o => o.id !== newOrder.id)];
      setProducts(updatedProducts);
      setCustomers(updatedCustomers);
      setOrders(updatedOrders);

      saveOrderToDB(newOrder).catch(() => {});
      updatedProducts.forEach(p => {
        if (newOrder.items.some(it => it.productId === p.id)) {
          saveProductToDB(p).catch(() => {});
        }
      });
      updatedCustomers.forEach(c => {
        if (c.id === newOrder.customerId || c.name === newOrder.customerName) {
          saveCustomerToDB(c).catch(() => {});
        }
      });

      const logs = createAuditRecord(
        'eCommerce Purchase Processed',
        'Billing',
        `Storefront purchase ${newOrder.id} total $${newOrder.total}. Customer: ${newOrder.customerName}. Sync status: Auto-dispatched.`
      );
      saveToLocal(updatedProducts, updatedCustomers, updatedOrders, logs);

      if (activeCustomer && (activeCustomer.id === newOrder.customerId || activeCustomer.name === newOrder.customerName)) {
        const updatedActive = updatedCustomers.find(c => c.id === activeCustomer.id);
        if (updatedActive) {
          setActiveCustomer(updatedActive);
        }
      }
    }
  };

  // 8. Staff management and switches
  const handleSwitchStaff = (staffId: string) => {
    const found = staffMembers.find(s => s.id === staffId);
    if (found) {
      setActiveStaff(found);
      const logs = createAuditRecord(
        'Terminal Login Changed',
        'User Management',
        `Operator terminal access switched to: ${found.name} (${found.role}).`
      );
      saveToLocal(products, customers, orders, logs);
    }
  };

  const handleAddStaff = (newStaff: StaffMember) => {
    const updated = [...staffMembers, newStaff];
    setStaffMembers(updated);
    saveStaffToDB(newStaff).catch(() => {});
    const logs = createAuditRecord(
      'Staff Member Registered',
      'User Management',
      `Registered employee: ${newStaff.name} with role ${newStaff.role} (${newStaff.department || 'General Operations'}).`
    );
    saveToLocal(products, customers, orders, logs);
  };

  const handleUpdateStaff = (updatedStaff: StaffMember) => {
    const updated = staffMembers.map(s => s.id === updatedStaff.id ? updatedStaff : s);
    setStaffMembers(updated);
    if (activeStaff.id === updatedStaff.id) {
      setActiveStaff(updatedStaff);
    }
    saveStaffToDB(updatedStaff).catch(() => {});
    const logs = createAuditRecord(
      'Staff Permissions Updated',
      'User Management',
      `Updated profile & rights for: ${updatedStaff.name} (${updatedStaff.role}).`
    );
    saveToLocal(products, customers, orders, logs);
  };

  const handleDeleteStaff = (staffId: string) => {
    const target = staffMembers.find(s => s.id === staffId);
    const updated = staffMembers.filter(s => s.id !== staffId);
    setStaffMembers(updated);
    deleteStaffFromDB(staffId).catch(() => {});
    const logs = createAuditRecord(
      'Staff Member Removed',
      'User Management',
      `Decommissioned employee account: ${target?.name || staffId} (${target?.role || 'Staff'}).`
    );
    saveToLocal(products, customers, orders, logs);
  };

  // 9. Customer Logins inside eCommerce storefront
  const handleLoginCustomer = (customerId: string) => {
    const found = customers.find(c => c.id === customerId);
    if (found) {
      setActiveCustomer(found);
    }
  };

  // Offline Simulator helpers for POS
  const triggerOfflineSimulatorToggle = () => {
    if (deviceOffline) {
      // Reconnected! Process offline buffer
      if (offlineBuffer.length > 0) {
        offlineBuffer.forEach(bufferOrder => {
          // Generate formal Order
          const randId = `ord-off-${Math.floor(1000 + Math.random() * 9000)}`;
          const orderPayload: Order = {
            id: randId,
            date: new Date().toISOString(),
            items: [
              { productId: 'prod-103', productName: 'Merino Wool Trail Socks', quantity: bufferOrder.qty, price: 24.99 }
            ],
            subtotal: bufferOrder.total / 1.085,
            tax: bufferOrder.total * 0.085,
            discount: 0,
            total: bufferOrder.total,
            paymentMethod: 'Credit/Debit Card',
            channel: 'In-Store POS',
            customerName: 'Offline Walk-in',
            status: 'Completed'
          };
          handleProcessOrder(orderPayload);
        });
        alert(`SYNCHRONIZATION COMPLETED!\nRe-established connection. Processed ${offlineBuffer.length} batched transactions from local cache!`);
        setOfflineBuffer([]);
      }
      setDeviceOffline(false);
    } else {
      setDeviceOffline(true);
      alert('OFFLINE MODE ACTIVE!\nRegister disconnected from central cloud sync. Purchases will be buffered locally in device hardware cache.');
    }
  };

  const addOfflineBufferOrder = () => {
    const mockOffline = {
      id: `off-${Date.now()}`,
      total: 24.99 * 1.085,
      qty: 1
    };
    setOfflineBuffer([...offlineBuffer, mockOffline]);
    alert('Offline Order cached in device storage. Sync will run automatically on reconnection.');
  };

  // 10. Review Management Handlers
  const handleUpdateReviewStatus = async (reviewId: string, status: ReviewStatus, flagReason?: string) => {
    const updatedReviews = reviews.map(r => {
      if (r.id === reviewId) {
        return {
          ...r,
          status,
          ...(flagReason ? { flagReason } : {})
        };
      }
      return r;
    });
    setReviews(updatedReviews);
    localStorage.setItem('nexus_reviews', JSON.stringify(updatedReviews));
    await moderateReviewInDB(reviewId, status, flagReason);

    const targetRev = reviews.find(r => r.id === reviewId);
    const logs = createAuditRecord(
      `Review ${status.toUpperCase()}`,
      'Storefront',
      `Review ${reviewId} on ${targetRev?.productName || 'product'} set to ${status}${flagReason ? ` (Reason: ${flagReason})` : ''}`
    );
    saveToLocal(products, customers, orders, logs);
  };

  const handleSaveAdminResponse = async (reviewId: string, response: ReviewAdminResponse) => {
    const updatedReviews = reviews.map(r => {
      if (r.id === reviewId) {
        return {
          ...r,
          adminResponse: response
        };
      }
      return r;
    });
    setReviews(updatedReviews);
    localStorage.setItem('nexus_reviews', JSON.stringify(updatedReviews));
    await respondToReviewInDB(reviewId, response);

    const targetRev = reviews.find(r => r.id === reviewId);
    const logs = createAuditRecord(
      'Review Admin Response',
      'Storefront',
      `Official response posted to review on ${targetRev?.productName || 'product'} by ${response.responderName} (${response.responderRole})`
    );
    saveToLocal(products, customers, orders, logs);
  };

  const handleDeleteReview = async (reviewId: string) => {
    const target = reviews.find(r => r.id === reviewId);
    const updatedReviews = reviews.filter(r => r.id !== reviewId);
    setReviews(updatedReviews);
    localStorage.setItem('nexus_reviews', JSON.stringify(updatedReviews));
    await deleteReviewFromDB(reviewId);

    const logs = createAuditRecord(
      'Review Deleted',
      'Storefront',
      `Permanently deleted review ${reviewId} authored by ${target?.userName || 'Customer'}`
    );
    saveToLocal(products, customers, orders, logs);
  };

  const handleRemoveAdminResponse = async (reviewId: string) => {
    const updatedReviews = reviews.map(r => {
      if (r.id === reviewId) {
        const copy = { ...r };
        delete copy.adminResponse;
        return copy;
      }
      return r;
    });
    setReviews(updatedReviews);
    localStorage.setItem('nexus_reviews', JSON.stringify(updatedReviews));
    await moderateReviewInDB(reviewId, 'approved');
  };

  const handleAddReview = async (newReview: Omit<ProductReview, 'id' | 'date'>) => {
    const reviewRecord: ProductReview = {
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: new Date().toISOString().split('T')[0],
      helpfulCount: 0,
      ...newReview
    };

    const updatedReviews = [reviewRecord, ...reviews];
    setReviews(updatedReviews);
    localStorage.setItem('nexus_reviews', JSON.stringify(updatedReviews));
    await saveReviewToDB(reviewRecord);

    const logs = createAuditRecord(
      'Customer Review Posted',
      'Storefront',
      `New review submitted by ${reviewRecord.userName} on ${reviewRecord.productName || reviewRecord.productId}. Rating: ${reviewRecord.rating}★, Verified: ${reviewRecord.verifiedPurchase ? 'YES' : 'NO'}`
    );
    saveToLocal(products, customers, orders, logs);
  };

  const handleConfirmOrderReceipt = async (orderId: string) => {
    const updatedOrders = orders.map(ord => {
      if (ord.id === orderId || (ord as any).orderNumber === orderId) {
        return {
          ...ord,
          status: 'Completed' as const,
          receiptConfirmed: true,
          receiptConfirmedAt: new Date().toISOString(),
          deliveryStatus: 'Delivered',
          deliveredDate: ord.deliveredDate || new Date().toISOString().split('T')[0]
        };
      }
      return ord;
    });
    setOrders(updatedOrders);

    const targetOrder = orders.find(o => o.id === orderId || (o as any).orderNumber === orderId);
    if (targetOrder) {
      saveOrderToDB({
        ...targetOrder,
        status: 'Completed',
        receiptConfirmed: true,
        receiptConfirmedAt: new Date().toISOString(),
        deliveryStatus: 'Delivered',
        deliveredDate: targetOrder.deliveredDate || new Date().toISOString().split('T')[0]
      } as any).catch(() => {});

      // Award +50 loyalty points bonus for confirming delivery
      const updatedCustomers = customers.map(c => {
        if (c.id === targetOrder.customerId || c.name === targetOrder.customerName) {
          return {
            ...c,
            loyaltyPoints: (c.loyaltyPoints || 0) + 50
          };
        }
        return c;
      });
      setCustomers(updatedCustomers);
      const targetCust = updatedCustomers.find(c => c.id === targetOrder.customerId || c.name === targetOrder.customerName);
      if (targetCust) {
        saveCustomerToDB(targetCust).catch(() => {});
        if (activeCustomer && (activeCustomer.id === targetCust.id || activeCustomer.name === targetCust.name)) {
          setActiveCustomer(targetCust);
        }
      }

      // Add Admin notification for customer confirmation
      const receiptNotif: AdminNotification = {
        id: `notif-receipt-${Date.now()}`,
        type: 'receipt_confirmed',
        title: '✓ Customer Confirmed Package Receipt',
        message: `${targetOrder.customerName || 'Customer'} confirmed receipt of order #${targetOrder.orderNumber || targetOrder.id}. Order marked finalized & +50 bonus points awarded.`,
        orderId: targetOrder.id,
        orderNumber: targetOrder.orderNumber || targetOrder.id,
        customerId: targetOrder.customerId,
        customerName: targetOrder.customerName,
        amount: targetOrder.total,
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'low',
        actionUrl: `/invoices?order=${targetOrder.id}`
      };
      const updatedNotifs = [receiptNotif, ...adminNotifications];
      setAdminNotifications(updatedNotifs);
      try {
        localStorage.setItem('nexus_admin_notifications', JSON.stringify(updatedNotifs));
      } catch (e) {}
    }

    const logs = createAuditRecord(
      'Delivery Confirmed by Customer',
      'Storefront',
      `Customer confirmed receipt for order ${orderId}. Status marked Delivered/Completed with +50 loyalty points bonus awarded.`
    );
    saveToLocal(products, customers, updatedOrders, logs);
  };

  const handleFileReturnOrComplaint = async (returnData: {
    orderId: string;
    orderNumber?: string;
    productId?: string;
    productName?: string;
    reason: string;
    resolution: string;
    notes: string;
    photoUrl?: string;
    photos?: string[];
    rmaNumber?: string;
  }) => {
    const targetOrder = orders.find(o => o.id === returnData.orderId || (o as any).orderNumber === returnData.orderId);
    const rmaId = returnData.rmaNumber || `RMA-${Math.floor(10000 + Math.random() * 90000)}`;

    const refundDetails: RefundRequestDetails = {
      rmaNumber: rmaId,
      reason: returnData.reason,
      resolution: returnData.resolution,
      notes: returnData.notes,
      requestedAt: new Date().toISOString(),
      status: 'Pending Review',
      photos: returnData.photos || (returnData.photoUrl ? [returnData.photoUrl] : [])
    };

    const updatedOrders = orders.map(ord => {
      if (ord.id === returnData.orderId || (ord as any).orderNumber === returnData.orderId) {
        return {
          ...ord,
          status: 'Refund Requested' as const,
          refundRequested: true,
          refundRequestDetails: refundDetails,
          notes: `${ord.notes ? ord.notes + ' | ' : ''}Customer filed RMA dispute: ${returnData.reason} (${rmaId})`
        };
      }
      return ord;
    });
    setOrders(updatedOrders);

    if (targetOrder) {
      saveOrderToDB({
        ...targetOrder,
        status: 'Refund Requested',
        refundRequested: true,
        refundRequestDetails: refundDetails,
        notes: `${targetOrder.notes ? targetOrder.notes + ' | ' : ''}Customer filed RMA dispute: ${returnData.reason} (${rmaId})`
      } as any).catch(() => {});
    }

    // Build and push Admin Notification
    const newNotif = buildAdminRefundNotification(
      targetOrder || {
        id: returnData.orderId,
        orderNumber: returnData.orderNumber || returnData.orderId,
        total: 0,
        customerId: activeCustomer?.id,
        customerName: activeCustomer?.name || 'Customer'
      } as Order,
      {
        ...returnData,
        rmaNumber: rmaId
      }
    );

    const updatedNotifs = [newNotif, ...adminNotifications];
    setAdminNotifications(updatedNotifs);
    try {
      localStorage.setItem('nexus_admin_notifications', JSON.stringify(updatedNotifs));
    } catch (e) {}

    const logs = createAuditRecord(
      'Customer Dispute / Return Filed',
      'Billing',
      `RMA Complaint filed for order ${returnData.orderId} (${returnData.productName || 'Item'}). Reason: ${returnData.reason}. Resolution requested: ${returnData.resolution}. RMA Ref: ${rmaId}. Admin notified.`
    );
    saveToLocal(products, customers, updatedOrders, logs);
  };

  // Mark an order as delivered (initiates 48h receipt confirmation window)
  const handleMarkOrderDelivered = (orderId: string) => {
    const target = orders.find(o => o.id === orderId || (o as any).orderNumber === orderId);
    if (!target) return;
    const deliveredOrder = flagOrderAsDelivered(target);
    const updatedOrders = orders.map(o => o.id === target.id ? deliveredOrder : o);
    setOrders(updatedOrders);
    saveOrderToDB(deliveredOrder).catch(() => {});

    // Notification for admin
    const delivNotif: AdminNotification = {
      id: `notif-deliv-${Date.now()}`,
      type: 'order_delivered',
      title: '📦 Order Marked Delivered • 48h Window Active',
      message: `Order #${deliveredOrder.orderNumber || deliveredOrder.id} (${deliveredOrder.customerName || 'Customer'}) delivered. Flagged as Awaiting Receipt Confirmation for 48 hours.`,
      orderId: deliveredOrder.id,
      orderNumber: deliveredOrder.orderNumber || deliveredOrder.id,
      customerId: deliveredOrder.customerId,
      customerName: deliveredOrder.customerName,
      amount: deliveredOrder.total,
      timestamp: new Date().toISOString(),
      read: false,
      priority: 'medium',
      actionUrl: `/invoices?order=${deliveredOrder.id}`
    };
    const updatedNotifs = [delivNotif, ...adminNotifications];
    setAdminNotifications(updatedNotifs);
    try {
      localStorage.setItem('nexus_admin_notifications', JSON.stringify(updatedNotifs));
    } catch (e) {}

    const logs = createAuditRecord(
      'Order Flagged Delivered (48h Protocol)',
      'Billing',
      `Order ${orderId} marked Delivered. 48-Hour Awaiting Receipt Confirmation protocol initiated.`
    );
    saveToLocal(products, customers, updatedOrders, logs);
  };

  // General order update handler (e.g. after RMA resolution in InvoiceModule)
  const handleUpdateOrder = (updatedOrder: Order) => {
    const updatedOrders = orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
    setOrders(updatedOrders);
    saveOrderToDB(updatedOrder).catch(() => {});
    const logs = createAuditRecord(
      'Order Record Synchronized',
      'Billing',
      `Order ${updatedOrder.orderNumber || updatedOrder.id} updated with status: ${updatedOrder.status}.`
    );
    saveToLocal(products, customers, updatedOrders, logs);
  };

  // Notification Center handlers
  const handleMarkNotificationAsRead = (notifId: string) => {
    const updated = adminNotifications.map(n => n.id === notifId ? { ...n, read: true } : n);
    setAdminNotifications(updated);
    try {
      localStorage.setItem('nexus_admin_notifications', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleMarkAllNotificationsAsRead = () => {
    const updated = adminNotifications.map(n => ({ ...n, read: true }));
    setAdminNotifications(updated);
    try {
      localStorage.setItem('nexus_admin_notifications', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleNotificationActionClick = (notif: AdminNotification) => {
    setIsNotificationCenterOpen(false);
    setCurrentView('Admin');
    setAdminSubTab('Invoices');
    if (notif.orderId) {
      setSelectedOrderIdForInvoice(notif.orderId);
    }
  };

  const handleHelpfulClick = (reviewId: string) => {
    const updatedReviews = reviews.map(r => {
      if (r.id === reviewId) {
        return {
          ...r,
          helpfulCount: (r.helpfulCount || 0) + 1
        };
      }
      return r;
    });
    setReviews(updatedReviews);
    localStorage.setItem('nexus_reviews', JSON.stringify(updatedReviews));
    const target = updatedReviews.find(r => r.id === reviewId);
    if (target) {
      saveReviewToDB(target).catch(() => {});
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 flex flex-col justify-between" id="applet-viewport-root">
      
      {/* Top Main Mode Selector - Core Showroom navigation */}
      {currentView === 'Admin' && (
      <header className="bg-slate-900 border-b border-white/10 px-3 sm:px-6 py-2.5 sticky top-0 z-40 shadow-md backdrop-blur-md w-full" id="master-mode-navbar">
        <div className="w-full px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 flex items-center justify-between gap-3">
          
          {/* Left Brand & Mobile Navigation Trigger */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            {/* Mobile/Tablet Sidebar Hamburger Toggle (visible on mobile/tablet when in Admin mode) */}
            {currentView === 'Admin' && (
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-300 hover:text-white rounded-xl hover:bg-slate-800 active:scale-95 transition-all border border-slate-700/80 shrink-0 cursor-pointer"
                title="Open Navigation Menu"
                id="mobile-menu-toggle-btn"
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
            
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 rounded-xl text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-indigo-900/50 shrink-0 select-none">
              N
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-black tracking-wider text-white uppercase truncate">
                  NEXUS POS-COMMERCE CORE
                </h1>
                <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {currentView === 'Admin' ? adminSubTab : 'Online Store'}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 truncate hidden xs:block">
                Enterprise Unified Multi-Channel System
              </p>
            </div>
          </div>

          {/* Right Status & Active Operator Bar */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0" id="master-header-telemetry">
            
            {/* Real-time Cloud/Firestore Status Indicator */}
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-gray-300"
              title={deviceOffline ? 'Operating in local offline buffer mode' : 'Connected to Firestore Cloud DB'}
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  deviceOffline ? 'bg-amber-400' : dbStatus === 'connected' ? 'bg-emerald-400' : 'bg-indigo-400'
                }`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  deviceOffline ? 'bg-amber-500' : dbStatus === 'connected' ? 'bg-emerald-500' : 'bg-indigo-500'
                }`} />
              </span>
              <span className="hidden sm:inline font-semibold">
                {deviceOffline ? 'Offline Cache' : dbStatus === 'connected' ? 'Cloud Active' : 'Syncing...'}
              </span>
            </div>

            {/* Admin Notification Center Bell - Only visible in Admin view */}
            {currentView === 'Admin' && (
              <button
                onClick={() => setIsNotificationCenterOpen(true)}
                className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
                  refundRequestsCount > 0
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30 ring-2 ring-rose-500/30'
                    : unreadNotifCount > 0
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30'
                      : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                }`}
                title="Admin Alerts & RMA Notifications"
                id="admin-notification-bell-btn"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadNotifCount > 0 && (
                  <span className={`absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center text-[10px] font-black rounded-full text-white ${
                    refundRequestsCount > 0 ? 'bg-rose-600 animate-pulse' : 'bg-indigo-600'
                  }`}>
                    {unreadNotifCount}
                  </span>
                )}
              </button>
            )}

            {/* Global View Switcher (Admin <-> Storefront) */}
            <button
              onClick={() => setCurrentView(currentView === 'Admin' ? 'ECommerce' : 'Admin')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-900/30 transition-all cursor-pointer"
              id="header-mode-switch-btn"
            >
              {currentView === 'Admin' ? (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Online Storefront</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Admin Terminal</span>
                </>
              )}
            </button>

            {/* Active Staff Member Profile Badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 font-bold text-xs flex items-center justify-center shrink-0">
                {activeStaff.name.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-white truncate max-w-[120px] leading-tight">
                  {activeStaff.name}
                </div>
                <div className="text-[9px] font-mono text-indigo-300 uppercase tracking-wider">
                  {activeStaff.role}
                </div>
              </div>
            </div>

          </div>
        </div>
      </header>
      )}

      {/* Main viewport area */}
      <div className="flex-1" id="main-content-stage">
        {currentView === 'Admin' ? (
          /* Admin Side: Static/Fixed Sidebar Layout with responsive main area */
          <div className="min-h-screen bg-slate-50 relative" id="admin-workspace-layout">
            
            {/* Enhanced Static/Fixed Sidebar Component */}
            <EnhancedSidebar
              currentView={currentView}
              onSwitchView={setCurrentView}
              adminSubTab={adminSubTab}
              eCommerceActiveTab={eCommerceActiveTab}
              onSelectECommerceTab={(tab) => setECommerceActiveTab(tab)}
              onSelectSubTab={(tab) => {
                setAdminSubTab(tab);
                setIsMobileSidebarOpen(false);
              }}
              activeStaff={activeStaff}
              dbStatus={deviceOffline ? 'offline' : dbStatus}
              lastSynced={lastSynced}
              onManualSync={handleManualSync}
              lowStockCount={lowStockCount}
              totalOrdersCount={totalOrdersCount}
              totalCustomersCount={totalCustomersCount}
              pendingReviewsCount={pendingReviewsCount}
              refundRequestsCount={refundRequestsCount}
              awaitingConfirmationCount={awaitingConfirmationCount}
              deviceOffline={deviceOffline}
              onToggleOfflineSim={triggerOfflineSimulatorToggle}
              offlineOrderCount={offlineBuffer.length}
              onOpenCurrencyModal={() => setIsCurrencyModalOpen(true)}
              isMobileOpen={isMobileSidebarOpen}
              onCloseMobile={() => setIsMobileSidebarOpen(false)}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
            />

            {/* Admin Workspace main board: Positioned cleanly with ample breathing room from the fixed sidebar */}
            <main 
              className={`transition-all duration-300 ease-in-out ${
                isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
              } p-3.5 sm:p-5 md:p-6 lg:p-8 xl:p-10 pb-24 lg:pb-12`} 
              id="admin-main-board"
            >
              <div className="max-w-[1500px] mx-auto w-full space-y-6">

                {/* Urgent RMA Refund Action Alert Banner */}
                {refundRequestsCount > 0 && adminSubTab !== 'Invoices' && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-pulse" id="admin-rma-urgent-banner">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-rose-900">
                          {refundRequestsCount} Customer Refund / RMA Request{refundRequestsCount > 1 ? 's' : ''} Pending Resolution
                        </div>
                        <p className="text-xs text-rose-700">
                          Customers have filed dispute tickets requiring review, approval, or replacement processing.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setAdminSubTab('Invoices')}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all shrink-0 cursor-pointer"
                    >
                      Review & Resolve Disputes →
                    </button>
                  </div>
                )}

                {/* 48-Hour Awaiting Receipt Telemetry Banner */}
                {awaitingConfirmationCount > 0 && adminSubTab !== 'Invoices' && (
                  <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900" id="admin-awaiting-receipt-banner">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-bold">{awaitingConfirmationCount} order{awaitingConfirmationCount > 1 ? 's' : ''}</span> currently flagged in the <span className="font-semibold text-amber-950">48-Hour Awaiting Receipt Confirmation</span> window.
                        <span className="hidden md:inline text-amber-700 ml-1">Orders auto-settle to Completed if no dispute is opened within 48h.</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setAdminSubTab('Invoices')}
                      className="text-amber-800 hover:text-amber-950 font-bold hover:underline shrink-0"
                    >
                      Inspect Deliveries →
                    </button>
                  </div>
                )}

                {adminSubTab === 'Dashboard' && (
                  <DashboardOverview
                    products={products}
                    orders={orders}
                    customers={customers}
                    auditLogs={auditLogs}
                    onQuickReorder={handleQuickReorder}
                    onNavigateToTab={(tabId) => setAdminSubTab(tabId as any)}
                  />
                )}

                {adminSubTab === 'Inventory' && (
                  <InventoryModule
                    products={products}
                    onAddProduct={handleAddProduct}
                    onUpdateProduct={handleUpdateProduct}
                    onDeleteProduct={handleDeleteProduct}
                    staffRole={activeStaff.role}
                    activeStaff={activeStaff}
                  />
                )}

                {adminSubTab === 'POS' && (
                  <POSModule
                    products={products}
                    customers={customers}
                    orders={orders}
                    onAddCustomer={handleAddCustomer}
                    onProcessOrder={handleProcessOrder}
                    onRefundOrder={handleRefundOrder}
                    activeStaffName={activeStaff.name}
                  />
                )}

                {adminSubTab === 'CRM' && (
                  <CRMModule
                    customers={customers}
                    orders={orders}
                    products={products}
                    onAddCustomer={handleAddCustomer}
                    onUpdateCustomer={handleUpdateCustomer}
                    onDeleteCustomer={handleDeleteCustomer}
                    staffRole={activeStaff.role}
                    activeStaffName={activeStaff.name}
                  />
                )}

                {adminSubTab === 'Invoices' && (
                  <InvoiceModule
                    orders={orders}
                    products={products}
                    customers={customers}
                    activeStaff={activeStaff}
                    onUpdateOrder={handleUpdateOrder}
                    onProcessRefund={handleRefundOrder}
                    onConfirmReceipt={handleConfirmOrderReceipt}
                    onMarkDelivered={handleMarkOrderDelivered}
                    initialSelectedOrderId={selectedOrderIdForInvoice}
                  />
                )}

                {adminSubTab === 'Reports' && (
                  <ReportsModule
                    products={products}
                    orders={orders}
                    activeStaff={activeStaff}
                    onUpdateOrderStatus={handleUpdateOrderStatus}
                    onReorderProduct={handleQuickReorder}
                  />
                )}

                {adminSubTab === 'Security' && (
                  <SecurityModule
                    staffMembers={staffMembers}
                    auditLogs={auditLogs}
                    activeStaff={activeStaff}
                    onSwitchStaff={handleSwitchStaff}
                    onAddStaff={handleAddStaff}
                    onUpdateStaff={handleUpdateStaff}
                    onDeleteStaff={handleDeleteStaff}
                  />
                )}

                {adminSubTab === 'Settings' && (
                  <SettingsModule
                    settings={systemSettings}
                    onUpdateSettings={(newSettings) => {
                      setSystemSettings(newSettings);
                      localStorage.setItem('nexus_system_settings', JSON.stringify(newSettings));
                    }}
                    activeStaff={activeStaff}
                    onAuditLog={(action, module, details) => {
                      createAuditRecord(action, module as any, details);
                    }}
                  />
                )}

                {adminSubTab === 'StorefrontManagement' && eCommerceActiveTab !== 'Reviews' && (
                  <ECommerceAdminPortal
                    homepageConfig={homepageConfig}
                    onSaveHomepageConfig={handleSaveHomepageConfig}
                    categories={categories.map(c => c.name)}
                    products={products}
                    orders={orders}
                    customers={customers}
                    onBackToHome={() => setCurrentView('ECommerce')}
                    activeTab={eCommerceActiveTab}
                  />
                )}

                {adminSubTab === 'StorefrontManagement' && eCommerceActiveTab === 'Reviews' && (
                  <ReviewModerationModule
                    reviews={reviews}
                    products={products}
                    orders={orders}
                    activeStaff={activeStaff}
                    onUpdateReviewStatus={handleUpdateReviewStatus}
                    onSaveAdminResponse={handleSaveAdminResponse}
                    onDeleteReview={handleDeleteReview}
                    onRemoveAdminResponse={handleRemoveAdminResponse}
                  />
                )}
              </div>
            </main>
          </div>
        ) : (
          /* eCommerce Storefront: Full Screen Premium layout */
          <TenantProvider>
            <ECommerceStorefront
              products={products}
              customers={customers}
              orders={orders}
              onPlaceEcomOrder={handlePlaceEcomOrder}
              activeCustomer={activeCustomer}
              onLoginCustomer={handleLoginCustomer}
              onRegisterCustomer={handleAddCustomer}
              onSwitchToAdmin={() => setCurrentView('Admin')}
              homepageConfig={homepageConfig}
              reviews={reviews}
              onAddReview={handleAddReview}
              onHelpfulClick={handleHelpfulClick}
              onConfirmOrderReceipt={handleConfirmOrderReceipt}
              onFileReturnOrComplaint={handleFileReturnOrComplaint}
              systemSettings={systemSettings}
            />
          </TenantProvider>
        )}
      </div>

      {/* Global Currency Selection Modal */}
      <CurrencySelectorModal
        isOpen={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
      />

      {/* Admin Real-Time Notifications & RMA Dispute Drawer */}
      <AdminNotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        notifications={adminNotifications}
        onMarkAsRead={handleMarkNotificationAsRead}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onActionClick={handleNotificationActionClick}
      />
    </div>
  );
}
