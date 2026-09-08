import React, { useState, useMemo } from 'react';
import { Customer, Product, ProductReview, ECommerceOrderStatus } from '../../types';
import { 
  X, LayoutDashboard, Package, Heart, MapPin, 
  User, CreditCard, Star, Settings, ChevronRight,
  LogOut, Plus, Sparkles, Award, UserCheck
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';

// Modular Account Subcomponents
import { CustomerAccountOrder, OrderItemSummary } from './account/AccountOrderCard';
import { AccountOrderTrackingModal } from './account/AccountOrderTrackingModal';
import { AccountOrderDetailModal } from './account/AccountOrderDetailModal';
import { AccountOrderPaymentModal } from './account/AccountOrderPaymentModal';
import { AccountDashboardTab } from './account/AccountDashboardTab';
import { AccountOrdersTab } from './account/AccountOrdersTab';
import { AccountWishlistTab } from './account/AccountWishlistTab';
import { AccountAddressesTab, SavedAddress } from './account/AccountAddressesTab';
import { AccountProfileTab } from './account/AccountProfileTab';
import { AccountPaymentMethodsTab, SavedPaymentMethod } from './account/AccountPaymentMethodsTab';
import { AccountReviewsTab } from './account/AccountReviewsTab';
import { AccountSettingsTab } from './account/AccountSettingsTab';


export type MyAccountTab = 
  | 'dashboard'
  | 'orders'
  | 'wishlist'
  | 'addresses'
  | 'profile'
  | 'payment_methods'
  | 'reviews'
  | 'settings';

interface ECommerceCustomerAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCustomer: Customer | null;
  customers: Customer[];
  onSelectCustomer: (customer: Customer | null) => void;
  onRegisterCustomer: (data: Omit<Customer, 'id' | 'createdAt'>) => void;
  customerOrders: any[];
  wishlist?: Product[];
  onOpenWishlist?: () => void;
  onOpenCart?: () => void;
  onOpenProduct?: (product: Product) => void;
  products?: Product[];
  reviews?: ProductReview[];
  onAddReview?: (review: any) => Promise<void> | void;
  onConfirmOrderReceipt?: (orderId: string) => void;
  onFileReturnOrComplaint?: (returnData: any) => void;
}

// Sample realistic order catalog for all 11 statuses
const DEFAULT_SAMPLE_ORDERS: CustomerAccountOrder[] = [
  {
    id: 'ord-10234',
    orderNumber: 'ORD-10234',
    date: '2026-08-18',
    formattedDate: '18 Aug 2026',
    status: 'Out for Delivery',
    itemCount: 2,
    total: 2500,
    grandTotal: 2500,
    subtotal: 2400,
    shippingCost: 100,
    tax: 0,
    trackingNumber: 'TRK-SL-99201',
    carrierName: 'Sierra Express Courier Services (Freetown Hub)',
    deliveryAddress: '232 Wilkinson Road, Suite 4B, Freetown, Sierra Leone',
    paymentMethod: 'Orange Money (Settled)',
    estimatedDelivery: 'Today by 3:30 PM',
    items: [
      {
        productName: 'Samsung Galaxy A55 5G (Awesome Navy)',
        quantity: 1,
        price: 2100,
        variantSku: 'SAM-A55-NAVY',
        imageUrl: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=400&q=80'
      },
      {
        productName: 'Fast Charging 25W Power Adapter & USB-C Cable',
        quantity: 1,
        price: 400,
        variantSku: 'ACC-PWR-25W',
        imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=400&q=80'
      }
    ]
  },
  {
    id: 'ord-10230',
    orderNumber: 'ORD-10230',
    date: '2026-08-19',
    formattedDate: '19 Aug 2026',
    status: 'Processing',
    itemCount: 1,
    total: 850,
    grandTotal: 850,
    subtotal: 850,
    trackingNumber: 'TRK-SL-99185',
    deliveryAddress: '232 Wilkinson Road, Suite 4B, Freetown, Sierra Leone',
    paymentMethod: 'Visa Debit (•••• 4242)',
    estimatedDelivery: 'Tomorrow, 20 Aug 2026',
    items: [
      {
        productName: 'Nike Air Zoom Pegasus 40 Running Shoes (Size 43)',
        quantity: 1,
        price: 850,
        variantSku: 'NK-PEG40-43',
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80'
      }
    ]
  },
  {
    id: 'ord-10228',
    orderNumber: 'ORD-10228',
    date: '2026-08-17',
    formattedDate: '17 Aug 2026',
    status: 'Dispatched',
    itemCount: 3,
    total: 4100,
    grandTotal: 4100,
    subtotal: 3950,
    shippingCost: 150,
    trackingNumber: 'TRK-SL-99140',
    deliveryAddress: '232 Wilkinson Road, Suite 4B, Freetown, Sierra Leone',
    paymentMethod: 'Afrimoney Mobile Wallet',
    estimatedDelivery: '19 Aug 2026',
    items: [
      {
        productName: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
        quantity: 1,
        price: 3200,
        variantSku: 'SNY-WH5-BLK',
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80'
      },
      {
        productName: 'Heavy Duty Braided USB-C to Lightning Cable',
        quantity: 2,
        price: 450,
        variantSku: 'ACC-CBL-LTG',
        imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=400&q=80'
      }
    ]
  },
  {
    id: 'ord-10225',
    orderNumber: 'ORD-10225',
    date: '2026-08-15',
    formattedDate: '15 Aug 2026',
    status: 'Delivered',
    itemCount: 2,
    total: 1950,
    grandTotal: 1950,
    subtotal: 1950,
    trackingNumber: 'TRK-SL-99102',
    deliveryAddress: '232 Wilkinson Road, Suite 4B, Freetown, Sierra Leone',
    paymentMethod: 'Orange Money (Settled)',
    items: [
      {
        productName: 'Apple Watch Magnetic Fast Charger (1m)',
        quantity: 1,
        price: 750,
        variantSku: 'APL-WCH-CHG',
        imageUrl: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=400&q=80'
      },
      {
        productName: 'Anker PowerCore 20,000mAh Portable Power Bank',
        quantity: 1,
        price: 1200,
        variantSku: 'ANK-PWR-20K',
        imageUrl: 'https://images.unsplash.com/photo-1609592424368-8098a5879796?auto=format&fit=crop&w=400&q=80'
      }
    ]
  },
  {
    id: 'ord-10220',
    orderNumber: 'ORD-10220',
    date: '2026-08-14',
    formattedDate: '14 Aug 2026',
    status: 'Ready for Pickup',
    itemCount: 1,
    total: 600,
    grandTotal: 600,
    subtotal: 600,
    trackingNumber: 'PICKUP-FT-004',
    deliveryAddress: 'In-Store Pickup (Freetown Victoria Commercial Depot)',
    paymentMethod: 'Paid In Advance (Orange Money)',
    items: [
      {
        productName: 'Logitech MX Master 3S Wireless Performance Mouse',
        quantity: 1,
        price: 600,
        variantSku: 'LOG-MX3S-GRY',
        imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=400&q=80'
      }
    ]
  },
  {
    id: 'ord-10218',
    orderNumber: 'ORD-10218',
    date: '2026-08-12',
    formattedDate: '12 Aug 2026',
    status: 'Packed',
    itemCount: 4,
    total: 3200,
    grandTotal: 3200,
    subtotal: 3200,
    trackingNumber: 'TRK-SL-99080',
    deliveryAddress: '232 Wilkinson Road, Suite 4B, Freetown, Sierra Leone',
    paymentMethod: 'Mastercard (•••• 8819)',
    items: [
      {
        productName: 'Adidas Ultraboost Light Running Shoes (Black)',
        quantity: 2,
        price: 1300,
        variantSku: 'AD-ULTRA-BLK',
        imageUrl: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=400&q=80'
      },
      {
        productName: 'Sports Moisture-Wicking Crew Socks (Pack of 3)',
        quantity: 2,
        price: 300,
        variantSku: 'ACC-SOX-3PK',
        imageUrl: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?auto=format&fit=crop&w=400&q=80'
      }
    ]
  },
  {
    id: 'ord-10215',
    orderNumber: 'ORD-10215',
    date: '2026-08-10',
    formattedDate: '10 Aug 2026',
    status: 'Paid',
    itemCount: 2,
    total: 1400,
    grandTotal: 1400,
    subtotal: 1400,
    deliveryAddress: '232 Wilkinson Road, Suite 4B, Freetown, Sierra Leone',
    paymentMethod: 'Orange Money (Settled)',
    items: [
      {
        productName: 'Xiaomi Smart Band 8 Pro Fitness Tracker',
        quantity: 2,
        price: 700,
        variantSku: 'XM-BND8-PRO',
        imageUrl: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=400&q=80'
      }
    ]
  },
  {
    id: 'ord-10210',
    orderNumber: 'ORD-10210',
    date: '2026-08-08',
    formattedDate: '08 Aug 2026',
    status: 'Pending Payment',
    itemCount: 1,
    total: 550,
    grandTotal: 550,
    subtotal: 550,
    deliveryAddress: '232 Wilkinson Road, Suite 4B, Freetown, Sierra Leone',
    paymentMethod: 'Orange Money / Afrimoney (Awaiting USSD PIN)',
    items: [
      {
        productName: 'Baseus 65W GaN5 Fast Travel Wall Charger',
        quantity: 1,
        price: 550,
        variantSku: 'BAS-GAN65-W',
        imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=400&q=80'
      }
    ]
  },
  {
    id: 'ord-10205',
    orderNumber: 'ORD-10205',
    date: '2026-08-05',
    formattedDate: '05 Aug 2026',
    status: 'Returned',
    itemCount: 1,
    total: 920,
    grandTotal: 920,
    subtotal: 920,
    deliveryAddress: '232 Wilkinson Road, Suite 4B, Freetown, Sierra Leone',
    paymentMethod: 'Orange Money (Settled)',
    items: [
      {
        productName: 'Puma Suede Classic XXI Sneakers (Size 44 - Size Mismatch)',
        quantity: 1,
        price: 920,
        variantSku: 'PUM-SUD-44',
        imageUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=400&q=80'
      }
    ]
  },
  {
    id: 'ord-10200',
    orderNumber: 'ORD-10200',
    date: '2026-08-01',
    formattedDate: '01 Aug 2026',
    status: 'Refunded',
    itemCount: 2,
    total: 1800,
    grandTotal: 1800,
    subtotal: 1800,
    deliveryAddress: '232 Wilkinson Road, Suite 4B, Freetown, Sierra Leone',
    paymentMethod: 'Bank Wire / Orange Money',
    items: [
      {
        productName: 'JBL Flip 6 Waterproof Portable Bluetooth Speaker',
        quantity: 2,
        price: 900,
        variantSku: 'JBL-FLP6-BLU',
        imageUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=400&q=80'
      }
    ]
  },
  {
    id: 'ord-10195',
    orderNumber: 'ORD-10195',
    date: '2026-07-28',
    formattedDate: '28 Jul 2026',
    status: 'Cancelled',
    itemCount: 1,
    total: 750,
    grandTotal: 750,
    subtotal: 750,
    deliveryAddress: '232 Wilkinson Road, Suite 4B, Freetown, Sierra Leone',
    paymentMethod: 'Orange Money',
    items: [
      {
        productName: 'UGREEN 100W GaN Desktop Charger Hub (Cancelled by Customer)',
        quantity: 1,
        price: 750,
        variantSku: 'UGR-100W-HUB',
        imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=400&q=80'
      }
    ]
  }
];

export default function ECommerceCustomerAccountModal({
  isOpen,
  onClose,
  activeCustomer,
  customers,
  onSelectCustomer,
  onRegisterCustomer,
  customerOrders = [],
  wishlist = [],
  onOpenWishlist,
  onOpenCart,
  onOpenProduct,
  products = [],
  reviews = [],
  onAddReview,
  onConfirmOrderReceipt,
  onFileReturnOrComplaint
}: ECommerceCustomerAccountModalProps) {
  const { formatAmount } = useCurrency();

  // Active Tab state (strictly following the user's requested 8 items)
  const [currentTab, setCurrentTab] = useState<MyAccountTab>('dashboard');

  // Interactive Sub-Modals
  const [trackingOrder, setTrackingOrder] = useState<CustomerAccountOrder | null>(null);
  const [detailOrder, setDetailOrder] = useState<CustomerAccountOrder | null>(null);
  const [payingOrder, setPayingOrder] = useState<CustomerAccountOrder | null>(null);

  // Status overrides for paid orders in session
  const [orderStatusOverrides, setOrderStatusOverrides] = useState<Record<string, { status: string; paymentMethod: string; transactionId: string }>>({});

  // Saved Addresses State

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([
    {
      id: 'addr-1',
      label: 'Home',
      fullName: activeCustomer?.name || 'Sahr B Sesay',
      phone: activeCustomer?.phone || '+232 76 892014',
      street: activeCustomer?.address || '232 Wilkinson Road, Suite 4B',
      city: activeCustomer?.city || 'Freetown',
      state: 'Western Area Urban',
      country: 'Sierra Leone',
      isDefault: true
    },
    {
      id: 'addr-2',
      label: 'Office',
      fullName: activeCustomer?.name || 'Sahr B Sesay',
      phone: activeCustomer?.phone || '+232 76 892014',
      street: '14 Siaka Stevens Street, Central Business District',
      city: 'Freetown',
      state: 'Western Area',
      country: 'Sierra Leone',
      isDefault: false
    }
  ]);

  // Saved Payment Methods State
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<SavedPaymentMethod[]>([
    {
      id: 'pm-1',
      type: 'mobile_money',
      title: 'Orange Money (Sierra Leone)',
      subtitle: `Registered Phone: ${activeCustomer?.phone || '+232 76 892014'}`,
      provider: 'orange_money',
      isDefault: true
    },
    {
      id: 'pm-2',
      type: 'card',
      title: 'Visa Debit Card (•••• 4242)',
      subtitle: 'Expires 10/28 • Sahr B Sesay',
      lastFour: '4242',
      expiry: '10/28',
      provider: 'visa',
      isDefault: false
    },
    {
      id: 'pm-3',
      type: 'bank_transfer',
      title: 'Sierra Leone Commercial Bank (SLCB)',
      subtitle: 'Account: 003-0109283-01 (B2B Settlement)',
      provider: 'slcb',
      isDefault: false
    }
  ]);

  // Merge real orders from props + demo orders
  const allAccountOrders = useMemo(() => {
    const realMapped: CustomerAccountOrder[] = customerOrders.map((ord, idx) => {
      const orderNum = ord.orderNumber || ord.id || `ORD-${10234 + idx}`;
      const dateStr = ord.date || new Date().toISOString();
      let formatted = dateStr;
      try {
        formatted = new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch (e) {
        formatted = dateStr;
      }

      return {
        id: ord.id || orderNum,
        orderNumber: orderNum.replace('#', ''),
        date: dateStr,
        formattedDate: formatted,
        status: ord.status || 'Out for Delivery',
        items: ord.items?.map((it: any) => ({
          productId: it.productId,
          productName: it.productName || it.name || 'Catalog Item',
          quantity: it.quantity || 1,
          price: it.price || 0,
          variantSku: it.variantSku || it.sku,
          variantName: it.variantName,
          imageUrl: it.imageUrl || it.image
        })) || [],
        itemCount: ord.items?.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0) || ord.itemCount || 1,
        total: ord.total || ord.grandTotal || 0,
        grandTotal: ord.grandTotal || ord.total || 0,
        subtotal: ord.subtotal || ord.total || 0,
        shippingCost: ord.shippingCost || 0,
        tax: ord.tax || 0,
        discount: ord.discount || 0,
        trackingNumber: ord.trackingNumber || `TRK-SL-${orderNum.replace(/[^0-9]/g, '') || '99201'}`,
        carrierName: ord.carrierName || 'Sierra Express Courier Services',
        deliveryAddress: ord.deliveryAddress || '232 Wilkinson Road, Suite 4B, Freetown, Sierra Leone',
        paymentMethod: ord.paymentMethod || 'Orange Money'
      };
    });

    // Combine real orders first, followed by default sample orders for complete status demonstration
    const combined = [...realMapped];
    DEFAULT_SAMPLE_ORDERS.forEach(demo => {
      if (!combined.some(o => o.orderNumber === demo.orderNumber)) {
        combined.push(demo);
      }
    });

    // Apply any active session payment status overrides
    return combined.map(order => {
      const override = orderStatusOverrides[order.id] || orderStatusOverrides[order.orderNumber];
      if (override) {
        return {
          ...order,
          status: override.status,
          paymentMethod: override.paymentMethod
        };
      }
      return order;
    });
  }, [customerOrders, orderStatusOverrides]);


  // Purchased products for reviews
  const purchasedProducts = useMemo(() => {
    const set = new Map<string, Product>();
    allAccountOrders.forEach(o => {
      o.items.forEach(it => {
        const found = products.find(p => p.id === it.productId || p.name === it.productName);
        if (found) {
          set.set(found.id, found);
        } else if (it.productName) {
          set.set(it.productName, {
            id: it.productId || it.productName,
            name: it.productName,
            price: it.price,
            stock: 10,
            category: 'General',
            imageUrl: it.imageUrl,
            description: '',
            reorderPoint: 5,
            barcode: '',
            qrCode: '',
            location: 'Warehouse',
            variants: [],
            salesCount: 1
          } as Product);
        }
      });
    });
    return Array.from(set.values());
  }, [allAccountOrders, products]);

  if (!isOpen) return null;

  // Address handlers
  const handleSaveAddress = (address: SavedAddress) => {
    setSavedAddresses(prev => {
      const idx = prev.findIndex(a => a.id === address.id);
      if (idx > -1) {
        const updated = [...prev];
        if (address.isDefault) {
          updated.forEach(a => a.isDefault = false);
        }
        updated[idx] = address;
        return updated;
      } else {
        const updated = address.isDefault ? prev.map(a => ({ ...a, isDefault: false })) : [...prev];
        return [address, ...updated];
      }
    });
  };

  const handleDeleteAddress = (id: string) => {
    setSavedAddresses(prev => prev.filter(a => a.id !== id));
  };

  const handleSetDefaultAddress = (id: string) => {
    setSavedAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === id })));
  };

  // Payment Method handlers
  const handleSavePaymentMethod = (pm: SavedPaymentMethod) => {
    setSavedPaymentMethods(prev => {
      const updated = pm.isDefault ? prev.map(p => ({ ...p, isDefault: false })) : [...prev];
      return [pm, ...updated];
    });
  };

  const handleDeletePaymentMethod = (id: string) => {
    setSavedPaymentMethods(prev => prev.filter(p => p.id !== id));
  };

  const handleSetDefaultPaymentMethod = (id: string) => {
    setSavedPaymentMethods(prev => prev.map(p => ({ ...p, isDefault: p.id === id })));
  };

  // Profile handler
  const handleUpdateProfile = (updated: Partial<Customer>) => {
    if (activeCustomer) {
      onSelectCustomer({ ...activeCustomer, ...updated });
    }
  };

  // Review handler
  const handleAddReview = (reviewData: any) => {
    if (onAddReview) {
      onAddReview(reviewData);
    }
  };

  // Payment Success handler for Pending Payment orders
  const handlePaymentSuccess = (orderId: string, paymentMethod: string, transactionId: string) => {
    setOrderStatusOverrides(prev => ({
      ...prev,
      [orderId]: {
        status: 'Paid',
        paymentMethod: `${paymentMethod} (Txn: ${transactionId})`,
        transactionId
      }
    }));

    if (detailOrder && (detailOrder.id === orderId || detailOrder.orderNumber === orderId)) {
      setDetailOrder({
        ...detailOrder,
        status: 'Paid',
        paymentMethod: `${paymentMethod} (Txn: ${transactionId})`
      });
    }
  };

  // The 8 Navigation Items requested by the user

  const NAV_ITEMS: { id: MyAccountTab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: Package, count: allAccountOrders.length },
    { id: 'wishlist', label: 'Wishlist', icon: Heart, count: wishlist.length },
    { id: 'addresses', label: 'Addresses', icon: MapPin, count: savedAddresses.length },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'payment_methods', label: 'Payment Methods', icon: CreditCard, count: savedPaymentMethods.length },
    { id: 'reviews', label: 'Reviews', icon: Star, count: reviews.length },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      id="customer-account-modal-overlay"
    >
      <div 
        className="bg-slate-50/95 backdrop-blur-md rounded-3xl sm:rounded-4xl max-w-5xl w-full h-[92vh] sm:h-[88vh] shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
        id="customer-account-modal-container"
      >
        {/* 1. Modal Top Bar */}
        <div className="bg-white px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
              {activeCustomer?.name ? activeCustomer.name.slice(0, 2).toUpperCase() : 'ME'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  My Account
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  {activeCustomer?.loyaltyTier || 'Gold Member'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {activeCustomer?.name || 'Sahr B Sesay'} • {activeCustomer?.email || 'sahr.sesay@example.com'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-2xl transition-colors cursor-pointer"
              title="Close Account Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Main Body with Navigation Sidebar / Top Tab Bar + Active View Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Navigation Bar (Hierarchical tree structure matching user specification) */}
          <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200/90 p-3 sm:p-4 shrink-0 flex md:flex-col justify-between overflow-x-auto md:overflow-y-auto no-scrollbar">
            <div className="flex md:flex-col gap-1 sm:gap-1.5 w-full">
              <div className="hidden md:block px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                Account Navigation
              </div>

              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentTab(item.id)}
                    className={`px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between gap-2 cursor-pointer shrink-0 md:shrink ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-600/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    id={`account-nav-${item.id}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span className="whitespace-nowrap">{item.label}</span>
                    </div>

                    {item.count !== undefined && item.count > 0 && (
                      <span 
                        className={`text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full hidden sm:inline-block ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom Profile Switcher in Sidebar */}
            <div className="hidden md:block pt-3 border-t border-slate-100 mt-3">
              <button
                type="button"
                onClick={() => setCurrentTab('settings')}
                className="w-full p-2 rounded-xl text-left hover:bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-medium transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Switch Profile</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </aside>

          {/* Right Main Content Area */}
          <main className="flex-1 p-3 sm:p-5 md:p-6 overflow-y-auto no-scrollbar">
            {/* Tab 1: Dashboard */}
            {currentTab === 'dashboard' && (
              <AccountDashboardTab
                customer={activeCustomer}
                orders={allAccountOrders}
                wishlist={wishlist}
                addressesCount={savedAddresses.length}
                paymentMethodsCount={savedPaymentMethods.length}
                reviewsCount={reviews.length}
                onNavigateTab={(tab) => setCurrentTab(tab)}
                onTrackOrder={(order) => setTrackingOrder(order)}
                onViewOrderDetails={(order) => setDetailOrder(order)}
                onPayOrder={(order) => setPayingOrder(order)}
              />
            )}

            {/* Tab 2: Orders */}
            {currentTab === 'orders' && (
              <AccountOrdersTab
                orders={allAccountOrders}
                onTrackOrder={(order) => setTrackingOrder(order)}
                onViewOrderDetails={(order) => setDetailOrder(order)}
                onPayOrder={(order) => setPayingOrder(order)}
                onExploreCatalog={() => onClose()}
              />
            )}

            {/* Tab 3: Wishlist */}
            {currentTab === 'wishlist' && (
              <AccountWishlistTab
                wishlist={wishlist}
                onAddToCart={(prod) => {
                  if (onOpenCart) onOpenCart();
                }}
                onRemoveFromWishlist={(prod) => {}}
                onMoveAllToCart={() => {
                  if (onOpenCart) onOpenCart();
                }}
                onOpenProduct={(prod) => {
                  if (onOpenProduct) onOpenProduct(prod);
                }}
                onExploreCatalog={() => onClose()}
              />
            )}

            {/* Tab 4: Addresses */}
            {currentTab === 'addresses' && (
              <AccountAddressesTab
                customer={activeCustomer}
                addresses={savedAddresses}
                onSaveAddress={handleSaveAddress}
                onDeleteAddress={handleDeleteAddress}
                onSetDefaultAddress={handleSetDefaultAddress}
              />
            )}

            {/* Tab 5: Profile */}
            {currentTab === 'profile' && (
              <AccountProfileTab
                customer={activeCustomer}
                onUpdateCustomer={handleUpdateProfile}
              />
            )}

            {/* Tab 6: Payment Methods */}
            {currentTab === 'payment_methods' && (
              <AccountPaymentMethodsTab
                paymentMethods={savedPaymentMethods}
                onSavePaymentMethod={handleSavePaymentMethod}
                onDeletePaymentMethod={handleDeletePaymentMethod}
                onSetDefaultPaymentMethod={handleSetDefaultPaymentMethod}
              />
            )}

            {/* Tab 7: Reviews */}
            {currentTab === 'reviews' && (
              <AccountReviewsTab
                reviews={reviews}
                customerName={activeCustomer?.name || 'Sahr B Sesay'}
                purchasedProducts={purchasedProducts}
                onAddReview={handleAddReview}
                onOpenProduct={onOpenProduct}
              />
            )}

            {/* Tab 8: Settings */}
            {currentTab === 'settings' && (
              <AccountSettingsTab
                customer={activeCustomer}
                customers={customers}
                onSelectCustomer={onSelectCustomer}
                onLogout={() => {
                  onSelectCustomer(null);
                  onClose();
                }}
              />
            )}
          </main>

        </div>

      </div>

      {/* Live Order Tracking Modal */}
      <AccountOrderTrackingModal
        isOpen={Boolean(trackingOrder)}
        order={trackingOrder}
        onClose={() => setTrackingOrder(null)}
        onConfirmReceipt={onConfirmOrderReceipt}
      />

      {/* Order Itemized Invoice & Detail Modal */}
      <AccountOrderDetailModal
        isOpen={Boolean(detailOrder)}
        order={detailOrder}
        onClose={() => setDetailOrder(null)}
        onTrackOrder={(order) => {
          setDetailOrder(null);
          setTrackingOrder(order);
        }}
        onPayOrder={(order) => {
          setPayingOrder(order);
        }}
        onReorder={(order) => {
          setDetailOrder(null);
          if (onOpenCart) onOpenCart();
        }}
      />

      {/* Pending Payment Settlement Modal */}
      <AccountOrderPaymentModal
        isOpen={Boolean(payingOrder)}
        order={payingOrder}
        onClose={() => setPayingOrder(null)}
        onPaymentSuccess={handlePaymentSuccess}
      />

    </div>
  );
}
