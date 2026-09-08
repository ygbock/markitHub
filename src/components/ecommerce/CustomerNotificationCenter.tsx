import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Customer, Order, Product } from '../../types';
import { 
  Bell, Package, Heart, Sparkles, Tag, CheckCircle2, 
  Clock, Truck, AlertCircle, X, ChevronRight, User, ArrowRight,
  Search, ExternalLink, ShieldCheck, Copy, Check, Gift
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';

export interface CustomerNotificationItem {
  id: string;
  type: 'order' | 'wishlist' | 'loyalty' | 'promo';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  orderId?: string;
  productId?: string;
  actionLabel?: string;
  iconType: 'package' | 'truck' | 'heart' | 'sparkles' | 'tag' | 'check';
}

interface CustomerNotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  activeCustomer: Customer | null;
  orders: Order[];
  wishlist: Product[];
  onOpenAccount: (targetTab?: string) => void;
  onOpenWishlist: () => void;
  onSelectProduct?: (product: Product) => void;
}

export const CustomerNotificationCenter: React.FC<CustomerNotificationCenterProps> = ({
  isOpen,
  onClose,
  activeCustomer,
  orders,
  wishlist,
  onOpenAccount,
  onOpenWishlist,
  onSelectProduct
}) => {
  const { formatAmount } = useCurrency();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'orders' | 'wishlist' | 'rewards'>('all');
  
  // Guest order lookup query
  const [guestOrderQuery, setGuestOrderQuery] = useState('');
  const [guestOrderResult, setGuestOrderResult] = useState<Order | null | 'not_found'>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`cust_read_notifs_${activeCustomer?.id || 'guest'}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Handle escape key and outside clicks
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        // Only close if click was not on the bell button itself
        const bellBtn = document.getElementById('btn-customer-notifications');
        if (bellBtn && bellBtn.contains(e.target as Node)) {
          return;
        }
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isOpen, onClose]);

  // Generate customer-specific notifications dynamically
  const customerNotifications = useMemo<CustomerNotificationItem[]>(() => {
    if (!activeCustomer) {
      return [];
    }

    const notifs: CustomerNotificationItem[] = [];

    // 1. Customer Order Status Alerts
    const customerOrders = orders.filter(o => 
      o.customerId === activeCustomer.id || 
      (o.customerName && activeCustomer.name && o.customerName.toLowerCase() === activeCustomer.name.toLowerCase())
    );

    customerOrders.forEach(ord => {
      const isPendingPayment = (ord.status?.toLowerCase() || '').includes('pending payment');
      const isDispatched = ord.status === 'Dispatched' || (ord.deliveryStatus === 'Dispatched');
      const isOutForDelivery = ord.status === 'Out for Delivery' || (ord.deliveryStatus === 'Out for Delivery');
      const isDelivered = ord.status === 'Delivered' || (ord.deliveryStatus === 'Delivered');

      if (isPendingPayment) {
        notifs.push({
          id: `notif-order-pay-${ord.id}`,
          type: 'order',
          title: `Action Required: Order #${ord.id.slice(-6).toUpperCase()}`,
          message: `Your checkout for ${formatAmount(ord.total)} is pending payment. Click to review or complete payment.`,
          timestamp: ord.date,
          read: readIds.has(`notif-order-pay-${ord.id}`),
          orderId: ord.id,
          actionLabel: 'Complete Payment',
          iconType: 'package'
        });
      } else if (isOutForDelivery) {
        notifs.push({
          id: `notif-order-out-${ord.id}`,
          type: 'order',
          title: `Out for Delivery: Order #${ord.id.slice(-6).toUpperCase()}`,
          message: `Your courier has your package! Delivery is scheduled for today.`,
          timestamp: ord.date,
          read: readIds.has(`notif-order-out-${ord.id}`),
          orderId: ord.id,
          actionLabel: 'Track Package',
          iconType: 'truck'
        });
      } else if (isDispatched) {
        notifs.push({
          id: `notif-order-disp-${ord.id}`,
          type: 'order',
          title: `Dispatched: Order #${ord.id.slice(-6).toUpperCase()}`,
          message: `Your items have left our logistics fulfillment center and are in transit.`,
          timestamp: ord.date,
          read: readIds.has(`notif-order-disp-${ord.id}`),
          orderId: ord.id,
          actionLabel: 'View Tracking',
          iconType: 'truck'
        });
      } else if (isDelivered) {
        notifs.push({
          id: `notif-order-deliv-${ord.id}`,
          type: 'order',
          title: `Delivered: Order #${ord.id.slice(-6).toUpperCase()}`,
          message: `Package arrived safely. Earn 25 loyalty points by leaving a verified product review!`,
          timestamp: ord.date,
          read: readIds.has(`notif-order-deliv-${ord.id}`),
          orderId: ord.id,
          actionLabel: 'Review Order',
          iconType: 'check'
        });
      }
    });

    // 2. Wishlist Alerts
    if (wishlist.length > 0) {
      const topWishlistItem = wishlist[0];
      notifs.push({
        id: `notif-wishlist-${topWishlistItem.id}`,
        type: 'wishlist',
        title: `Wishlist Deal: ${topWishlistItem.name}`,
        message: `An item in your wishlist is currently in high demand and eligible for instant dispatch!`,
        timestamp: 'Just now',
        read: readIds.has(`notif-wishlist-${topWishlistItem.id}`),
        productId: topWishlistItem.id,
        actionLabel: 'View Wishlist Item',
        iconType: 'heart'
      });
    }

    // 3. Loyalty Tier / Points Milestone
    if (activeCustomer.loyaltyPoints && activeCustomer.loyaltyPoints > 0) {
      notifs.push({
        id: `notif-loyalty-${activeCustomer.id}`,
        type: 'loyalty',
        title: `Loyalty Points Available`,
        message: `You currently have ${activeCustomer.loyaltyPoints} points available. Redeem for discount credits at checkout!`,
        timestamp: 'Active Reward',
        read: readIds.has(`notif-loyalty-${activeCustomer.id}`),
        actionLabel: 'View My Rewards',
        iconType: 'sparkles'
      });
    }

    // 4. Storewide Promotion Notice
    notifs.push({
      id: `notif-promo-season-2026`,
      type: 'promo',
      title: `Storewide Flash Deal Active`,
      message: `Use promo code COUPON_15 at checkout to claim 15% off orders over ${formatAmount(50)}.`,
      timestamp: 'Today',
      read: readIds.has(`notif-promo-season-2026`),
      actionLabel: 'Copy Promo Code',
      iconType: 'tag'
    });

    return notifs;
  }, [activeCustomer, orders, wishlist, readIds, formatAmount]);

  const unreadCount = useMemo(() => {
    return customerNotifications.filter(n => !n.read).length;
  }, [customerNotifications]);

  const handleMarkAsRead = (id: string) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(`cust_read_notifs_${activeCustomer?.id || 'guest'}`, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const handleMarkAllAsRead = () => {
    const allIds = new Set(customerNotifications.map(n => n.id));
    setReadIds(allIds);
    try {
      localStorage.setItem(`cust_read_notifs_${activeCustomer?.id || 'guest'}`, JSON.stringify(Array.from(allIds)));
    } catch {}
  };

  const handleGuestSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestOrderQuery.trim()) return;
    const cleanQuery = guestOrderQuery.trim().toLowerCase();
    const found = orders.find(o => 
      o.id.toLowerCase() === cleanQuery ||
      o.id.toLowerCase().includes(cleanQuery) ||
      (o.orderNumber && o.orderNumber.toLowerCase().includes(cleanQuery)) ||
      (o.customerPhone && o.customerPhone.includes(cleanQuery))
    );
    setGuestOrderResult(found || 'not_found');
  };

  const copyPromo = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!isOpen) return null;

  const filteredNotifs = customerNotifications.filter(n => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'orders') return n.type === 'order';
    if (activeFilter === 'wishlist') return n.type === 'wishlist';
    if (activeFilter === 'rewards') return n.type === 'loyalty' || n.type === 'promo';
    return true;
  });

  return (
    <div 
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2.5 w-[360px] sm:w-[420px] max-w-[calc(100vw-24px)] z-50 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 text-slate-900 select-none"
      id="customer-notification-dropdown"
    >
      {/* Dropdown Header */}
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-xs">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-tight text-white">Notifications & Alerts</h3>
              {activeCustomer && unreadCount > 0 && (
                <span className="px-2 py-0.2 bg-indigo-500 text-white rounded-full text-[10px] font-black">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {activeCustomer ? `Personal updates for ${activeCustomer.name.split(' ')[0]}` : 'Store alerts, deals & guest order lookup'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {activeCustomer && customerNotifications.length > 0 && unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="text-[11px] font-bold text-indigo-300 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              Mark all read
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close notification dropdown"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Guest Mode: Tracking Search + Active Store Promos */}
      {!activeCustomer ? (
        <div className="p-4 space-y-4 max-h-[460px] overflow-y-auto">
          {/* Guest Order Lookup */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Package className="w-4 h-4 text-indigo-600" />
              <span>Track Guest Order</span>
            </div>
            <form onSubmit={handleGuestSearch} className="flex gap-2">
              <input
                type="text"
                value={guestOrderQuery}
                onChange={(e) => setGuestOrderQuery(e.target.value)}
                placeholder="Enter Order # or Phone"
                className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Track
              </button>
            </form>

            {guestOrderResult === 'not_found' && (
              <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>No matching order found. Please check the order reference.</span>
              </p>
            )}

            {guestOrderResult && guestOrderResult !== 'not_found' && (
              <div className="p-3 bg-white rounded-lg border border-indigo-200 mt-2 space-y-1.5 animate-in fade-in text-xs">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>Order #{guestOrderResult.id.slice(-6).toUpperCase()}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                    {guestOrderResult.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Total: <strong>{formatAmount(guestOrderResult.total)}</strong> • {guestOrderResult.items.length} item(s)
                </p>
                {guestOrderResult.deliveryAddress && (
                  <p className="text-[10px] text-slate-500 truncate">
                    📍 {guestOrderResult.deliveryAddress}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Active Store Promos & Coupons */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Active Store Deals & Vouchers
            </span>
            <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-indigo-600" />
                  15% Off Storewide Order
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-600 text-white rounded-full">
                  COUPON_15
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Apply at checkout on any orders over {formatAmount(50)}.
              </p>
              <button
                type="button"
                onClick={() => copyPromo('COUPON_15')}
                className="w-full py-1.5 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                {copiedCode === 'COUPON_15' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode === 'COUPON_15' ? 'Coupon Code Copied!' : 'Copy Code'}</span>
              </button>
            </div>
          </div>

          {/* Sign In Prompt */}
          <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black">Unlock Member Perks</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Sign in to receive instant SMS/email delivery tracking, save favorites, and earn loyalty points.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAccount('login');
              }}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <span>Sign In / Register</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Logged-In Customer Notifications Mode */
        <div className="flex flex-col max-h-[480px]">
          {/* Category Filter Tabs */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All', count: customerNotifications.length },
              { id: 'orders', label: 'Orders', count: customerNotifications.filter(n => n.type === 'order').length },
              { id: 'wishlist', label: 'Wishlist', count: customerNotifications.filter(n => n.type === 'wishlist').length },
              { id: 'rewards', label: 'Rewards', count: customerNotifications.filter(n => n.type === 'loyalty' || n.type === 'promo').length }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    activeFilter === tab.id ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* List of Notifications */}
          <div className="overflow-y-auto p-3 space-y-2 flex-1">
            {filteredNotifs.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-500 font-medium">No alerts in this category.</p>
              </div>
            ) : (
              filteredNotifs.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleMarkAsRead(item.id)}
                  className={`p-3 rounded-xl border transition-all text-left relative group cursor-pointer ${
                    item.read 
                      ? 'bg-white border-slate-200/80 hover:bg-slate-50/80' 
                      : 'bg-indigo-50/50 border-indigo-200/80 shadow-2xs hover:bg-indigo-50/80'
                  }`}
                >
                  {!item.read && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-indigo-600" />
                  )}

                  <div className="flex items-start gap-2.5">
                    {/* Icon */}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      item.iconType === 'truck' ? 'bg-emerald-100 text-emerald-700' :
                      item.iconType === 'package' ? 'bg-indigo-100 text-indigo-700' :
                      item.iconType === 'heart' ? 'bg-rose-100 text-rose-700' :
                      item.iconType === 'tag' ? 'bg-amber-100 text-amber-700' :
                      item.iconType === 'check' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {item.iconType === 'truck' && <Truck className="w-3.5 h-3.5" />}
                      {item.iconType === 'package' && <Package className="w-3.5 h-3.5" />}
                      {item.iconType === 'heart' && <Heart className="w-3.5 h-3.5" />}
                      {item.iconType === 'tag' && <Tag className="w-3.5 h-3.5" />}
                      {item.iconType === 'check' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {item.iconType === 'sparkles' && <Sparkles className="w-3.5 h-3.5" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                        {item.message}
                      </p>

                      {item.actionLabel && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(item.id);
                            onClose();

                            if (item.type === 'order') {
                              onOpenAccount('orders');
                            } else if (item.type === 'wishlist') {
                              if (item.productId && onSelectProduct) {
                                const prod = wishlist.find(p => p.id === item.productId);
                                if (prod) {
                                  onSelectProduct(prod);
                                  return;
                                }
                              }
                              onOpenWishlist();
                            } else if (item.type === 'loyalty') {
                              onOpenAccount('dashboard');
                            } else if (item.type === 'promo') {
                              copyPromo('COUPON_15');
                            }
                          }}
                          className="mt-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer group-hover:underline"
                        >
                          <span>{item.actionLabel}</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Real-time tracking active</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAccount('orders');
              }}
              className="font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              View Order History →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerNotificationCenter;
