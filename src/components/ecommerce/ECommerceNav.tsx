import React, { useState, useMemo } from 'react';
import { Customer, CartItem, Product, Order } from '../../types';
import { 
  ShoppingBag, Search, Heart, User, Sparkles, Terminal, 
  Menu, X, Tag, Zap, ShieldCheck, Bell, Truck, Gauge
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import SearchAutocomplete from './SearchAutocomplete';
import { CustomerNotificationCenter } from './CustomerNotificationCenter';
import { TenantSwitcher } from './TenantSwitcher';

interface ECommerceNavProps {
  products?: Product[];
  cart: CartItem[];
  wishlist: Product[];
  activeCustomer: Customer | null;
  orders?: Order[];
  searchTerm: string;
  onSearchChange: (query: string) => void;
  onSelectProduct?: (product: Product) => void;
  onSelectBrand?: (brand: string) => void;
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onOpenAccount: (tab?: string) => void;
  onOpenOrderTracking?: (orderId?: string) => void;
  onGoHome: () => void;
  onSwitchToAdmin?: () => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  categories: string[];
  onOpenDealOfTheDay?: () => void;
  onOpenStorefrontManagement?: () => void;
  isStorefrontManagementActive?: boolean;}

export default function ECommerceNav({
  products = [],
  cart,
  wishlist,
  activeCustomer,
  orders = [],
  searchTerm,
  onSearchChange,
  onSelectProduct,
  onSelectBrand,
  onOpenCart,
  onOpenWishlist,
  onOpenAccount,
  onOpenOrderTracking,
  onGoHome,
  onSwitchToAdmin,
  selectedCategory,
  onSelectCategory,
  categories,
  onOpenDealOfTheDay,
  onOpenStorefrontManagement,
  isStorefrontManagementActive,}: ECommerceNavProps) {
  const { currentCurrency } = useCurrency();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSearchExpandedMobile, setIsSearchExpandedMobile] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isCustomerNotifOpen, setIsCustomerNotifOpen] = useState(false);

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Compute unread count for registered customer notifications ONLY (no backend/admin logs)
  const customerUnreadCount = useMemo(() => {
    if (!activeCustomer) return 0;
    try {
      const saved = localStorage.getItem(`cust_read_notifs_${activeCustomer.id}`);
      const readSet = saved ? new Set(JSON.parse(saved)) : new Set();
      
      let count = 0;
      // 1. Customer orders
      const custOrders = orders.filter(o => 
        o.customerId === activeCustomer.id || 
        (o.customerName && activeCustomer.name && o.customerName.toLowerCase() === activeCustomer.name.toLowerCase())
      );
      custOrders.forEach(ord => {
        const isPendingPayment = (ord.status?.toLowerCase() || '').includes('pending payment');
        const isDispatched = ord.status === 'Dispatched' || ord.deliveryStatus === 'Dispatched';
        const isOut = ord.status === 'Out for Delivery' || ord.deliveryStatus === 'Out for Delivery';
        const isDeliv = ord.status === 'Delivered' || ord.deliveryStatus === 'Delivered';
        if (isPendingPayment && !readSet.has(`notif-order-pay-${ord.id}`)) count++;
        if (isOut && !readSet.has(`notif-order-out-${ord.id}`)) count++;
        if (isDispatched && !readSet.has(`notif-order-disp-${ord.id}`)) count++;
        if (isDeliv && !readSet.has(`notif-order-deliv-${ord.id}`)) count++;
      });

      // 2. Wishlist discounts
      wishlist.forEach(prod => {
        const hasDiscount = (prod.discountPercent && prod.discountPercent > 0) || (prod.originalPrice && prod.originalPrice > prod.price);
        if (hasDiscount && !readSet.has(`notif-wish-sale-${prod.id}`)) count++;
        if (prod.stock > 0 && prod.stock <= 5 && !readSet.has(`notif-wish-lowstock-${prod.id}`)) count++;
      });

      // 3. Loyalty
      if (!readSet.has(`notif-loyalty-${activeCustomer.id}`)) count++;
      // 4. Promo
      if (!readSet.has(`notif-promo-coupon15`)) count++;

      return count;
    } catch {
      return 0;
    }
  }, [activeCustomer, orders, wishlist]);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all w-full" id="ecom-main-header">
      
      {/* 1. Top Announcement / Sliding Flash Promo Bar */}
      <div className="bg-slate-900 text-white text-[11px] font-medium py-1.5 px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 overflow-hidden w-full" id="ecom-top-announcement">
        <div className="w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-300 min-w-0">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold text-[10px] tracking-wide uppercase shrink-0">
              <Zap className="w-3 h-3 text-amber-400" /> Flash Promo
            </span>
            <span className="hidden md:inline truncate">Use coupon <strong className="text-amber-300 font-mono font-bold">COUPON_15</strong> for 15% off cart orders!</span>
            <span className="md:hidden text-[10px] sm:text-xs truncate">Use code <strong className="text-amber-300 font-mono">COUPON_15</strong> for 15% OFF</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-[11px] text-slate-300 shrink-0 ml-auto">
            <TenantSwitcher variant="pill" />
            {onOpenOrderTracking && (
              <button
                type="button"
                onClick={() => onOpenOrderTracking()}
                className="inline-flex items-center gap-1 text-indigo-300 hover:text-white font-bold transition-colors cursor-pointer text-[10px] sm:text-xs"
                id="btn-top-order-tracking"
              >
                <Truck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Track Order</span>
              </button>
            )}
            {onOpenDealOfTheDay && (
              <button 
                onClick={onOpenDealOfTheDay}
                className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 font-bold transition-colors cursor-pointer text-[10px] sm:text-xs"
                id="btn-nav-deal-day"
              >
                <Tag className="w-3 h-3" /> Deal of the Day
              </button>
            )}
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="font-mono text-slate-300 text-[10px] sm:text-[11px] hidden sm:inline">
              {currentCurrency.flag} {currentCurrency.code} ({currentCurrency.symbol})
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Navigation Bar */}
      <div className="w-full px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
        
        {/* DESKTOP HEADER LAYOUT: Logo | Categories | Search | Account | Wishlist | Cart */}
        <div className="hidden md:flex items-center justify-between h-16 lg:h-20 gap-3 lg:gap-6">
          {/* 1. Logo */}
          <div 
            onClick={onGoHome}
            className="flex items-center gap-2.5 cursor-pointer select-none shrink-0 group"
            id="ecom-nav-logo-desktop"
          >
            <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-2xl bg-indigo-600 group-hover:bg-indigo-700 text-white flex items-center justify-center font-black text-base shadow-sm shadow-indigo-500/30 transition-all">
              N
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base lg:text-lg font-black tracking-tight text-slate-900 uppercase">
                  Nexus<span className="text-indigo-600">Store</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                  Live
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Unified Digital Commerce</p>
            </div>
          </div>

          {/* 3. Search Bar */}
          <div className="flex-1 max-w-sm lg:max-w-xl xl:max-w-2xl relative" id="ecom-nav-search-desktop">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setIsSearchFocused(true);
                }}
                placeholder="Search products, brands, SKU, specs (e.g. Nike, Samsung)..."
                className="w-full pl-10 pr-9 py-2.5 bg-slate-100 hover:bg-slate-100 focus:bg-white border border-slate-200/80 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                id="ecom-desktop-search-input"
              />
              {searchTerm && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Instant Search Autocomplete Overlay */}
            {isSearchFocused && (
              <SearchAutocomplete
                products={products}
                searchTerm={searchTerm}
                activeCustomer={activeCustomer}
                onSearchChange={(q) => onSearchChange(q)}
                onSelectProduct={(p) => {
                  if (onSelectProduct) onSelectProduct(p);
                  setIsSearchFocused(false);
                }}
                onSelectCategory={(cat) => {
                  onSelectCategory(cat);
                  setIsSearchFocused(false);
                }}
                onSelectBrand={(brand) => {
                  if (onSelectBrand) onSelectBrand(brand);
                  setIsSearchFocused(false);
                }}
                onClose={() => setIsSearchFocused(false)}
              />
            )}
          </div>

          {/* 4. Account, 5. Wishlist, 6. Cart */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 4. Account */}
            <button
              onClick={() => onOpenAccount()}
              className="flex items-center gap-2 pl-2 pr-3 py-2 bg-slate-100 hover:bg-slate-200/80 active:scale-95 text-slate-900 rounded-2xl transition-all cursor-pointer"
              id="btn-nav-account-desktop"
              aria-label="Customer Account"
            >
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                {activeCustomer ? activeCustomer.name[0] : <User className="w-3.5 h-3.5" />}
              </div>
              <div className="text-left">
                <span className="text-xs font-bold block leading-tight truncate max-w-[90px]">
                  {activeCustomer ? activeCustomer.name.split(' ')[0] : 'Sign In'}
                </span>
                <span className="text-[9px] text-indigo-600 font-semibold block leading-none">
                  {activeCustomer ? `${activeCustomer.loyaltyPoints} pts` : 'Account'}
                </span>
              </div>
            </button>

            {/* 5. Wishlist */}
            <button
              onClick={onOpenWishlist}
              className="p-2.5 text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all relative cursor-pointer"
              title="Saved Wishlist"
              id="btn-open-wishlist-desktop"
              aria-label="Open Wishlist"
            >
              <Heart className={`w-5 h-5 ${wishlist.length > 0 ? 'text-rose-500 fill-rose-500/20' : ''}`} />
              {wishlist.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs animate-in zoom-in">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* 6. Cart */}
            <button
              onClick={onOpenCart}
              className="p-2.5 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all relative cursor-pointer flex items-center gap-2"
              title="Shopping Cart"
              id="btn-open-cart-desktop"
              aria-label="Open Cart"
            >
              <div className="relative">
                <ShoppingBag className="w-5 h-5 text-slate-800" />
                {totalCartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-xs ring-2 ring-white">
                    {totalCartCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-slate-900 hidden lg:inline">Cart</span>
            </button>

            {/* Switch to Staff Admin Workspace */}
            {onSwitchToAdmin && (
              <button
                type="button"
                onClick={onSwitchToAdmin}
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ml-1"
                title="Return to POS & Business Administration"
                id="ecom-btn-admin-console"
              >
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                <span>Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* MOBILE HEADER LAYOUT:
            ☰     LOGO       ♡   🛒
            [ Search products... ]
            Categories
        */}
        <div className="md:hidden py-2.5 space-y-2.5">
          {/* Row 1: ☰   LOGO   ♡  🛒 */}
          <div className="flex items-center justify-between">
            {/* Left: ☰ Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 -ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl cursor-pointer active:scale-95"
              id="btn-mobile-nav-toggle"
              aria-label="Toggle Mobile Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Center: LOGO */}
            <div 
              onClick={onGoHome}
              className="flex items-center gap-2 cursor-pointer select-none group"
              id="ecom-nav-logo-mobile"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm shadow-indigo-500/30">
                N
              </div>
              <span className="text-base font-black tracking-tight text-slate-900 uppercase">
                Nexus<span className="text-indigo-600">Store</span>
              </span>
            </div>

            {/* Right: ♡ Wishlist + 🛒 Cart */}
            <div className="flex items-center gap-1">
              {/* Customer Alerts / Notif */}
              <button
                type="button"
                onClick={() => setIsCustomerNotifOpen(!isCustomerNotifOpen)}
                className="p-2 text-slate-700 hover:text-indigo-600 rounded-xl relative cursor-pointer"
                title="Alerts"
                aria-label="Customer Alerts"
              >
                <Bell className="w-5 h-5" />
                {activeCustomer && customerUnreadCount > 0 && (
                  <span className="absolute 1 top-1 right-1 bg-rose-500 text-white text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center ring-1 ring-white">
                    {customerUnreadCount}
                  </span>
                )}
              </button>

              {/* ♡ Wishlist */}
              <button
                onClick={onOpenWishlist}
                className="p-2 text-slate-700 hover:text-rose-600 rounded-xl relative cursor-pointer active:scale-95"
                title="Wishlist"
                id="btn-open-wishlist-mobile"
                aria-label="Wishlist"
              >
                <Heart className={`w-5 h-5 ${wishlist.length > 0 ? 'text-rose-500 fill-rose-500/20' : ''}`} />
                {wishlist.length > 0 && (
                  <span className="absolute top-1 right-1 bg-rose-500 text-white text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-xs">
                    {wishlist.length}
                  </span>
                )}
              </button>

              {/* 🛒 Cart */}
              <button
                onClick={onOpenCart}
                className="p-2 text-slate-700 hover:text-indigo-600 rounded-xl relative cursor-pointer active:scale-95"
                title="Cart"
                id="btn-open-cart-mobile"
                aria-label="Cart"
              >
                <div className="relative">
                  <ShoppingBag className="w-5 h-5 text-slate-800" />
                  {totalCartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-xs ring-2 ring-white">
                      {totalCartCount}
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Row 2: [ Search products... ] (Mobile-first prominent always-visible search) */}
          <div className="relative w-full" id="ecom-mobile-search-wrapper">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setIsSearchFocused(true);
              }}
              placeholder="Search products..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-100/90 focus:bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all shadow-2xs"
              id="ecom-mobile-search-input"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Mobile Autocomplete Dropdown */}
            {isSearchFocused && (
              <SearchAutocomplete
                products={products}
                searchTerm={searchTerm}
                activeCustomer={activeCustomer}
                onSearchChange={(q) => onSearchChange(q)}
                onSelectProduct={(p) => {
                  if (onSelectProduct) onSelectProduct(p);
                  setIsSearchFocused(false);
                }}
                onSelectCategory={(cat) => {
                  onSelectCategory(cat);
                  setIsSearchFocused(false);
                }}
                onSelectBrand={(brand) => {
                  if (onSelectBrand) onSelectBrand(brand);
                  setIsSearchFocused(false);
                }}
                onClose={() => setIsSearchFocused(false)}
              />
            )}
          </div>
        </div>

        {/* 3. Category Quick Bar Ribbon (Mobile & Desktop Touch Scroll) */}
        <div className="border-t border-slate-100 py-2 sm:py-2.5 overflow-x-auto no-scrollbar flex items-center gap-1.5 sm:gap-2 -mx-3 px-3 sm:mx-0 sm:px-0" id="ecom-category-ribbon">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
            Categories:
          </span>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectCategory(cat)}
                className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer select-none active:scale-95 min-h-[36px] flex items-center shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-600/20'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                id={`cat-nav-pill-${String(cat || '').toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Anchored Customer Notification Center */}
      <CustomerNotificationCenter
        isOpen={isCustomerNotifOpen}
        onClose={() => setIsCustomerNotifOpen(false)}
        activeCustomer={activeCustomer}
        orders={orders}
        wishlist={wishlist}
        onOpenAccount={onOpenAccount}
        onOpenWishlist={onOpenWishlist}
        onSelectProduct={onSelectProduct}
      />

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white p-4 space-y-4 shadow-xl animate-in slide-in-from-top-4" id="ecom-mobile-menu-drawer">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Quick Navigation</span>
            <button
              onClick={() => { onGoHome(); setMobileMenuOpen(false); }}
              className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 active:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              🏠 Storefront Home
            </button>
            <button
              onClick={() => { setIsCustomerNotifOpen(true); setMobileMenuOpen(false); }}
              className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 active:bg-slate-200 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>🔔 Customer Notifications & Alerts</span>
              {activeCustomer && customerUnreadCount > 0 && (
                <span className="text-[10px] font-mono bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">
                  {customerUnreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { onOpenAccount(); setMobileMenuOpen(false); }}
              className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 active:bg-slate-200 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>👤 Customer Account & Orders</span>
              {activeCustomer && (
                <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold">
                  {activeCustomer.loyaltyPoints} pts
                </span>
              )}
            </button>
            <button
              onClick={() => { onOpenWishlist(); setMobileMenuOpen(false); }}
              className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 active:bg-slate-200 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>❤️ My Saved Wishlist</span>
              <span className="text-[10px] font-mono bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">{wishlist.length}</span>
            </button>
            {onOpenOrderTracking && (
              <button
                onClick={() => { onOpenOrderTracking(); setMobileMenuOpen(false); }}
                className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 active:bg-indigo-200 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>🚚 Track Order & Delivery Status</span>
                <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-md uppercase">Live</span>
              </button>
            )}
            {onOpenDealOfTheDay && (
              <button
                onClick={() => { onOpenDealOfTheDay(); setMobileMenuOpen(false); }}
                className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>🔥 Flash Deals of the Day</span>
                <span className="text-[10px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-md uppercase">Special</span>
              </button>
            )}
          </div>

          {/* Categories Quick List */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Browse Categories</span>
            <div className="grid grid-cols-2 gap-1.5">
              {categories.slice(0, 6).map(c => (
                <button
                  key={c}
                  onClick={() => { onSelectCategory(c); setMobileMenuOpen(false); }}
                  className={`text-left px-3 py-2 text-xs font-medium rounded-xl truncate transition-colors ${
                    selectedCategory === c ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {onSwitchToAdmin && (
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { onSwitchToAdmin(); setMobileMenuOpen(false); }}
                className="w-full py-3 bg-slate-900 active:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span>Open Staff Admin Console</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
