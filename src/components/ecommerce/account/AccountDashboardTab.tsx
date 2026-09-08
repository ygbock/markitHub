import React from 'react';
import { Customer, Product } from '../../../types';
import { CustomerAccountOrder, AccountOrderCard } from './AccountOrderCard';
import { 
  Package, Heart, MapPin, CreditCard, Star, Settings, 
  Sparkles, Award, ShieldCheck, ChevronRight, Clock, 
  Ticket, ArrowRight, Truck, Wallet, AlertCircle
} from 'lucide-react';
import { useCurrency } from '../../../context/CurrencyContext';

interface AccountDashboardTabProps {
  customer: Customer | null;
  orders: CustomerAccountOrder[];
  wishlist: Product[];
  addressesCount: number;
  paymentMethodsCount: number;
  reviewsCount: number;
  onNavigateTab: (tab: 'orders' | 'wishlist' | 'addresses' | 'profile' | 'payment_methods' | 'reviews' | 'settings') => void;
  onTrackOrder: (order: CustomerAccountOrder) => void;
  onViewOrderDetails: (order: CustomerAccountOrder) => void;
  onPayOrder?: (order: CustomerAccountOrder) => void;
}

export const AccountDashboardTab: React.FC<AccountDashboardTabProps> = ({
  customer,
  orders,
  wishlist,
  addressesCount,
  paymentMethodsCount,
  reviewsCount,
  onNavigateTab,
  onTrackOrder,
  onViewOrderDetails,
  onPayOrder
}) => {
  const { formatAmount } = useCurrency();

  const customerName = customer?.name || 'Sahr B Sesay';
  const loyaltyPoints = customer?.loyaltyPoints || 450;
  const loyaltyTier = customer?.loyaltyTier || (loyaltyPoints > 500 ? 'Platinum' : loyaltyPoints > 200 ? 'Gold' : 'Silver');
  const storeCreditWorth = loyaltyPoints * 0.05;

  const totalSpent = orders.reduce((acc, o) => acc + (o.grandTotal || o.total || 0), 0);
  const activeShipments = orders.filter(o => ['Dispatched', 'Out for Delivery', 'Processing', 'Packed'].includes(o.status)).length;
  const pendingOrders = orders.filter(o => (o.status?.toLowerCase() || '').includes('pending payment') || o.status === 'unpaid');
  const recentOrder = orders[0];

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-150" id="account-tab-dashboard">
      
      {/* 1. Welcome & Membership VIP Card Banner */}
      <div className="bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>{loyaltyTier} Member</span>
              </span>
              <span className="text-xs text-slate-300 font-mono">
                ID: {customer?.id ? `NEX-${customer.id.slice(-6).toUpperCase()}` : 'NEX-88210'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('profile')}
              className="text-xs text-indigo-200 hover:text-white flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <span>Edit Profile</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Welcome back, {customerName}!
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Manage your orders, saved addresses, payment methods, and loyalty reward benefits in one centralized account hub.
            </p>
          </div>

          {/* Points & Store Credit Metric Pill Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-white/10">
            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
              <span className="text-[11px] text-slate-400 block font-medium">Loyalty Points</span>
              <div className="text-lg sm:text-xl font-black font-mono text-amber-400 mt-0.5 flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{loyaltyPoints} pts</span>
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
              <span className="text-[11px] text-slate-400 block font-medium">Redeemable Credit</span>
              <div className="text-lg sm:text-xl font-black font-mono text-emerald-400 mt-0.5 flex items-center gap-1">
                <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{formatAmount(storeCreditWorth)}</span>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-white/5 rounded-2xl p-3 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Active Shipments</span>
                <span className="text-lg sm:text-xl font-black font-mono text-white mt-0.5 block">
                  {activeShipments}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('orders')}
                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>Orders</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Payment Notification Banner if any orders require payment */}
      {pendingOrders.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm block text-amber-950">
                {pendingOrders.length} Order{pendingOrders.length > 1 ? 's' : ''} Awaiting Payment
              </span>
              <span className="text-xs text-amber-800">
                Order #{pendingOrders[0].orderNumber} requires payment authorization to proceed with dispatch.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onPayOrder && (
              <button
                type="button"
                onClick={() => onPayOrder(pendingOrders[0])}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Pay Order #{pendingOrders[0].orderNumber}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigateTab('orders')}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              View All
            </button>
          </div>
        </div>
      )}

      {/* 2. Quick Navigation Grid to all Account Sections */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Orders */}
        <button
          type="button"
          onClick={() => onNavigateTab('orders')}
          className="bg-white hover:bg-indigo-50/50 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 text-left transition-all group cursor-pointer shadow-2xs hover:shadow-xs"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-50 group-hover:bg-indigo-100 text-slate-700 group-hover:text-indigo-600 flex items-center justify-center transition-colors mb-2">
            <Package className="w-5 h-5" />
          </div>
          <span className="font-bold text-xs sm:text-sm text-slate-900 block group-hover:text-indigo-600">Orders</span>
          <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
            {orders.length} order{orders.length !== 1 ? 's' : ''}
          </span>
        </button>

        {/* Wishlist */}
        <button
          type="button"
          onClick={() => onNavigateTab('wishlist')}
          className="bg-white hover:bg-rose-50/50 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 text-left transition-all group cursor-pointer shadow-2xs hover:shadow-xs"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-50 group-hover:bg-rose-100 text-slate-700 group-hover:text-rose-600 flex items-center justify-center transition-colors mb-2">
            <Heart className="w-5 h-5" />
          </div>
          <span className="font-bold text-xs sm:text-sm text-slate-900 block group-hover:text-rose-600">Wishlist</span>
          <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
            {wishlist.length} item{wishlist.length !== 1 ? 's' : ''}
          </span>
        </button>

        {/* Addresses */}
        <button
          type="button"
          onClick={() => onNavigateTab('addresses')}
          className="bg-white hover:bg-emerald-50/50 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 text-left transition-all group cursor-pointer shadow-2xs hover:shadow-xs"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-50 group-hover:bg-emerald-100 text-slate-700 group-hover:text-emerald-600 flex items-center justify-center transition-colors mb-2">
            <MapPin className="w-5 h-5" />
          </div>
          <span className="font-bold text-xs sm:text-sm text-slate-900 block group-hover:text-emerald-600">Addresses</span>
          <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
            {addressesCount} saved
          </span>
        </button>

        {/* Payment Methods */}
        <button
          type="button"
          onClick={() => onNavigateTab('payment_methods')}
          className="bg-white hover:bg-purple-50/50 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 text-left transition-all group cursor-pointer shadow-2xs hover:shadow-xs"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-50 group-hover:bg-purple-100 text-slate-700 group-hover:text-purple-600 flex items-center justify-center transition-colors mb-2">
            <CreditCard className="w-5 h-5" />
          </div>
          <span className="font-bold text-xs sm:text-sm text-slate-900 block group-hover:text-purple-600">Payment Methods</span>
          <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
            {paymentMethodsCount} methods
          </span>
        </button>
      </div>

      {/* 3. Most Recent Order Spotlight (matching exact prompt format) */}
      {recentOrder && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Latest Order Activity</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('orders')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
            >
              <span>View All ({orders.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <AccountOrderCard
            order={recentOrder}
            onTrackOrder={onTrackOrder}
            onViewDetails={onViewOrderDetails}
            onPayOrder={onPayOrder}
          />
        </div>
      )}

      {/* 4. Secondary quick links: Reviews & Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div 
          onClick={() => onNavigateTab('reviews')}
          className="p-4 bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Star className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm text-slate-900 block group-hover:text-indigo-600">
                Reviews & Ratings
              </span>
              <span className="text-[11px] text-slate-500">
                {reviewsCount} published • Write reviews for points
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
        </div>

        <div 
          onClick={() => onNavigateTab('settings')}
          className="p-4 bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm text-slate-900 block group-hover:text-indigo-600">
                Account Settings
              </span>
              <span className="text-[11px] text-slate-500">
                Notifications, currency, and security
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

    </div>
  );
};

