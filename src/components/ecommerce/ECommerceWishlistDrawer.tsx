import React, { useState, useMemo } from 'react';
import { Product, Customer, WishlistItem } from '../../types';
import { 
  X, Heart, ShoppingCart, Trash2, ArrowRight, Zap, Star,
  Bell, BellRing, TrendingDown, PackageCheck, AlertCircle, 
  Check, Sparkles, User, Info, ShieldCheck, RefreshCw, Layers
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import { 
  loadWishlistItems, 
  updateWishlistAlertSettings, 
  detectWishlistPriceDrops, 
  detectWishlistBackInStock 
} from '../../utils/wishlistManager';

interface ECommerceWishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  wishlist: Product[];
  wishlistItems?: WishlistItem[];
  allProducts?: Product[];
  activeCustomer?: Customer | null;
  onRemoveWishlist: (product: Product) => void;
  onAddToCart: (product: Product, quantity?: number, variantSku?: string) => void;
  onMoveAllToCart: () => void;
  onOpenProduct: (product: Product) => void;
  onUpdateAlerts?: (productId: string, alerts: { notifyPriceDrop?: boolean; notifyBackInStock?: boolean }) => void;
  onClearWishlist?: () => void;
  onOpenAccount?: () => void;
}

export default function ECommerceWishlistDrawer({
  isOpen,
  onClose,
  wishlist,
  wishlistItems = [],
  allProducts = [],
  activeCustomer,
  onRemoveWishlist,
  onAddToCart,
  onMoveAllToCart,
  onOpenProduct,
  onUpdateAlerts,
  onClearWishlist,
  onOpenAccount
}: ECommerceWishlistDrawerProps) {
  const { formatAmount } = useCurrency();
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'pricedrops' | 'backinstock' | 'outofstock'>('all');
  const [alertFeedbackToast, setAlertFeedbackToast] = useState<string | null>(null);
  const [movedItems, setMovedItems] = useState<Set<string>>(new Set());
  const [demoSimulatedDrop, setDemoSimulatedDrop] = useState<boolean>(false);
  const [demoSimulatedRestock, setDemoSimulatedRestock] = useState<boolean>(false);

  // Derive wishlist item metadata map
  const itemMetaMap = useMemo(() => {
    const map = new Map<string, WishlistItem>();
    const loaded = wishlistItems.length > 0 ? wishlistItems : loadWishlistItems(activeCustomer?.id);
    loaded.forEach(item => map.set(item.productId, item));
    return map;
  }, [wishlistItems, activeCustomer]);

  // Combined product records with real-time analytics
  const enrichedWishlist = useMemo(() => {
    return wishlist.map(prod => {
      const meta = itemMetaMap.get(prod.id);
      const priceWhenAdded = meta?.priceWhenAdded || (prod.originalPrice ? prod.originalPrice : prod.price);
      
      // Calculate Price Drop
      const hasRealPriceDrop = prod.price < priceWhenAdded || (prod.originalPrice && prod.originalPrice > prod.price);
      const isPriceDropped = hasRealPriceDrop || (demoSimulatedDrop && prod.price > 50);
      const effectiveOriginalPrice = isPriceDropped 
        ? (prod.originalPrice || priceWhenAdded || Math.round(prod.price * 1.25))
        : (prod.originalPrice || priceWhenAdded);
      const priceDifference = Math.max(0, effectiveOriginalPrice - prod.price);
      const discountPercent = effectiveOriginalPrice > 0 ? Math.round((priceDifference / effectiveOriginalPrice) * 100) : 0;

      // Stock status
      const isOutOfStock = prod.stock <= 0 && !demoSimulatedRestock;
      const isBackInStock = (prod.stock > 0 || demoSimulatedRestock) && meta?.notifyBackInStock;

      return {
        product: prod,
        meta,
        isPriceDropped,
        priceWhenAdded: effectiveOriginalPrice,
        priceDifference,
        discountPercent,
        isOutOfStock,
        isBackInStock,
        notifyPriceDrop: meta?.notifyPriceDrop ?? true,
        notifyBackInStock: meta?.notifyBackInStock ?? true
      };
    });
  }, [wishlist, itemMetaMap, demoSimulatedDrop, demoSimulatedRestock]);

  // Counts for tabs
  const priceDropCount = enrichedWishlist.filter(i => i.isPriceDropped).length;
  const backInStockCount = enrichedWishlist.filter(i => !i.isOutOfStock).length;
  const outOfStockCount = enrichedWishlist.filter(i => i.isOutOfStock).length;

  // Filtered List
  const filteredList = useMemo(() => {
    if (activeFilterTab === 'pricedrops') {
      return enrichedWishlist.filter(i => i.isPriceDropped);
    }
    if (activeFilterTab === 'backinstock') {
      return enrichedWishlist.filter(i => !i.isOutOfStock && i.isBackInStock);
    }
    if (activeFilterTab === 'outofstock') {
      return enrichedWishlist.filter(i => i.isOutOfStock);
    }
    return enrichedWishlist;
  }, [enrichedWishlist, activeFilterTab]);

  const handleTogglePriceDropAlert = (productId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    if (onUpdateAlerts) {
      onUpdateAlerts(productId, { notifyPriceDrop: newVal });
    } else {
      updateWishlistAlertSettings(productId, { notifyPriceDrop: newVal }, activeCustomer?.id);
    }
    setAlertFeedbackToast(newVal ? '🔔 Price-drop alerts enabled for this product!' : '🔕 Price-drop alerts paused.');
    setTimeout(() => setAlertFeedbackToast(null), 3000);
  };

  const handleToggleBackInStockAlert = (productId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    if (onUpdateAlerts) {
      onUpdateAlerts(productId, { notifyBackInStock: newVal });
    } else {
      updateWishlistAlertSettings(productId, { notifyBackInStock: newVal }, activeCustomer?.id);
    }
    setAlertFeedbackToast(newVal ? '📦 Back-in-stock alert activated!' : '🔕 Back-in-stock alerts paused.');
    setTimeout(() => setAlertFeedbackToast(null), 3000);
  };

  const handleMoveSingleToCart = (prod: Product) => {
    onAddToCart(prod, 1);
    setMovedItems(prev => new Set(prev).add(prod.id));
    setAlertFeedbackToast(`✓ Moved "${prod.name}" to cart!`);
    setTimeout(() => {
      setAlertFeedbackToast(null);
      onRemoveWishlist(prod);
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      id="ecommerce-wishlist-modal-backdrop"
    >
      <div 
        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200/80 animate-in slide-in-from-right duration-300 relative"
        id="ecommerce-wishlist-drawer"
      >
        
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-white z-10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-xs">
                <Heart className="w-5 h-5 fill-rose-600/20 text-rose-600" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>My Saved Wishlist</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-700">
                    {wishlist.length}
                  </span>
                </h2>
                {activeCustomer ? (
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <User className="w-3 h-3 text-indigo-600" />
                    <span>Logged in as <strong className="text-slate-800">{activeCustomer.name}</strong></span>
                    <span className="text-emerald-600 font-bold ml-1">● Cloud Synced</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    <span>Saved locally on this device</span>
                    {onOpenAccount && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAccount();
                        }}
                        className="text-indigo-600 font-bold hover:underline cursor-pointer ml-1"
                      >
                        Sign in to sync
                      </button>
                    )}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              title="Close Wishlist"
              aria-label="Close Wishlist"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Filter Navigation Tabs */}
          {wishlist.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
              <button
                type="button"
                onClick={() => setActiveFilterTab('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilterTab === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                All Items ({wishlist.length})
              </button>

              {priceDropCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveFilterTab('pricedrops')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeFilterTab === 'pricedrops'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Price Drops ({priceDropCount})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveFilterTab('backinstock')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeFilterTab === 'backinstock'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60'
                }`}
              >
                <PackageCheck className="w-3.5 h-3.5" />
                <span>In Stock ({backInStockCount})</span>
              </button>

              {outOfStockCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveFilterTab('outofstock')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeFilterTab === 'outofstock'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
                  }`}
                >
                  Out of Stock ({outOfStockCount})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Alert Feedback Banner / Toast */}
        {alertFeedbackToast && (
          <div className="mx-4 mt-2 p-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-lg flex items-center justify-between gap-2 animate-in slide-in-from-top-2 z-20">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{alertFeedbackToast}</span>
            </div>
            <button onClick={() => setAlertFeedbackToast(null)} className="text-slate-400 hover:text-white p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Price Drop Headline Notice (when price drops exist) */}
        {priceDropCount > 0 && activeFilterTab !== 'outofstock' && (
          <div className="mx-4 mt-3 p-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-emerald-950 truncate">
                  🎉 {priceDropCount} Price Drop{priceDropCount !== 1 ? 's' : ''} on Your Wishlist!
                </p>
                <p className="text-[11px] text-emerald-700">
                  Prices have decreased since you saved these items.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveFilterTab('pricedrops')}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shrink-0 cursor-pointer shadow-xs"
            >
              View Deals
            </button>
          </div>
        )}

        {/* Wishlist Items Scrollable List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 divide-y divide-slate-100">
          {wishlist.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-400 shadow-sm">
                <Heart className="w-10 h-10" />
              </div>
              <div className="space-y-1 max-w-xs">
                <h3 className="text-base font-black text-slate-900">Your Wishlist is Empty</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tap the heart icon (<strong className="text-rose-500">♡</strong>) on any product to save it, track price drops, and get back-in-stock alerts.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <span>Explore Catalog</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-xs font-bold text-slate-600">No items match this filter category.</p>
              <button
                type="button"
                onClick={() => setActiveFilterTab('all')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
              >
                View All {wishlist.length} Items
              </button>
            </div>
          ) : (
            filteredList.map(({ product: prod, isPriceDropped, priceWhenAdded, priceDifference, discountPercent, isOutOfStock, notifyPriceDrop, notifyBackInStock }) => {
              const isMoving = movedItems.has(prod.id);

              return (
                <div 
                  key={prod.id} 
                  className={`pt-4 first:pt-0 flex flex-col gap-3 group transition-all ${
                    isMoving ? 'opacity-40 scale-95' : 'opacity-100'
                  }`}
                  id={`wishlist-item-${prod.id}`}
                >
                  <div className="flex gap-3.5">
                    {/* Thumbnail & Badges */}
                    <div className="relative shrink-0">
                      <img 
                        src={prod.imageUrl} 
                        alt={prod.name}
                        onClick={() => {
                          onOpenProduct(prod);
                          onClose();
                        }}
                        className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl object-cover border border-slate-200 bg-slate-100 cursor-pointer group-hover:scale-105 transition-transform"
                      />
                      {isPriceDropped && (
                        <span className="absolute -top-1.5 -left-1.5 px-1.5 py-0.5 bg-emerald-600 text-white text-[9px] font-black rounded-md shadow-xs flex items-center gap-0.5">
                          <TrendingDown className="w-2.5 h-2.5" /> -{discountPercent}%
                        </span>
                      )}
                      {isOutOfStock && (
                        <span className="absolute bottom-1 left-1 right-1 px-1 py-0.5 bg-slate-900/90 text-white text-[8px] font-bold text-center rounded-md uppercase tracking-wider">
                          Sold Out
                        </span>
                      )}
                    </div>

                    {/* Product Details & Price Analysis */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            {prod.brand && (
                              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 block">
                                {prod.brand}
                              </span>
                            )}
                            <h4 
                              onClick={() => {
                                onOpenProduct(prod);
                                onClose();
                              }}
                              className="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors cursor-pointer"
                            >
                              {prod.name}
                            </h4>
                          </div>

                          <button
                            type="button"
                            onClick={() => onRemoveWishlist(prod)}
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-xl transition-colors cursor-pointer shrink-0"
                            title="Remove from Wishlist"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Price & Price Drop Badge */}
                        <div className="flex flex-wrap items-baseline gap-2 mt-1">
                          <span className="text-sm font-mono font-black text-slate-900">
                            {formatAmount(prod.price)}
                          </span>

                          {isPriceDropped && (
                            <>
                              <span className="text-xs text-slate-400 line-through font-mono">
                                {formatAmount(priceWhenAdded)}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                                Save {formatAmount(priceDifference)}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Availability Status */}
                        <div className="mt-1">
                          {!isOutOfStock ? (
                            <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>In Stock ({prod.stock} units available)</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              <span>Temporarily Out of Stock</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notification Alert Toggles (Price Drop & Back In Stock) */}
                  <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-3">
                      {/* Price Drop Alert Switch */}
                      <button
                        type="button"
                        onClick={() => handleTogglePriceDropAlert(prod.id, notifyPriceDrop)}
                        className={`flex items-center gap-1.5 font-bold transition-colors cursor-pointer ${
                          notifyPriceDrop ? 'text-indigo-700' : 'text-slate-400 hover:text-slate-600'
                        }`}
                        title="Toggle Price-Drop Notifications"
                      >
                        <Bell className={`w-3.5 h-3.5 ${notifyPriceDrop ? 'text-indigo-600 fill-indigo-600/20' : 'text-slate-400'}`} />
                        <span>Price-Drop Alert: <strong>{notifyPriceDrop ? 'ON' : 'OFF'}</strong></span>
                      </button>

                      {/* Back In Stock Alert Switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleBackInStockAlert(prod.id, notifyBackInStock)}
                        className={`flex items-center gap-1.5 font-bold transition-colors cursor-pointer ${
                          notifyBackInStock ? 'text-emerald-700' : 'text-slate-400 hover:text-slate-600'
                        }`}
                        title="Toggle Back-in-Stock Notifications"
                      >
                        <PackageCheck className={`w-3.5 h-3.5 ${notifyBackInStock ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span>Back-in-Stock Alert: <strong>{notifyBackInStock ? 'ON' : 'OFF'}</strong></span>
                      </button>
                    </div>

                    {/* Move to Cart Action Button */}
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => handleMoveSingleToCart(prod)}
                      className="ml-auto py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>{isOutOfStock ? 'Out of Stock' : 'Move to Cart'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions & Real-Time Alert Simulators */}
        {wishlist.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 space-y-2.5 z-10">
            {/* Move All to Cart Action Button */}
            <button
              type="button"
              disabled={backInStockCount === 0}
              onClick={onMoveAllToCart}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 text-white rounded-2xl font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 text-indigo-400" />
              <span>Move All In-Stock ({backInStockCount}) to Cart</span>
            </button>

            {/* Clear and Developer/Demo Simulation Tools */}
            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
              {onClearWishlist && (
                <button
                  type="button"
                  onClick={onClearWishlist}
                  className="hover:text-rose-600 underline font-medium cursor-pointer"
                >
                  Clear Wishlist
                </button>
              )}

              {/* Live Alert Simulation Controls for Testing */}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setDemoSimulatedDrop(!demoSimulatedDrop);
                    setAlertFeedbackToast(
                      !demoSimulatedDrop 
                        ? '🔥 Simulated Price Drop: Products received discount tags!' 
                        : 'Price drop simulation reset.'
                    );
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                    demoSimulatedDrop 
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                  title="Simulate a price decrease on wishlist products"
                >
                  <TrendingDown className="w-3 h-3 text-emerald-600" />
                  <span>{demoSimulatedDrop ? 'Simulated Drop Active' : 'Test Price Drop'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDemoSimulatedRestock(!demoSimulatedRestock);
                    setAlertFeedbackToast(
                      !demoSimulatedRestock 
                        ? '📦 Simulated Back-in-Stock: Out-of-stock items restocked!' 
                        : 'Restock simulation reset.'
                    );
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                    demoSimulatedRestock 
                      ? 'bg-indigo-100 text-indigo-800 border-indigo-300' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                  title="Simulate restock of unavailable wishlist products"
                >
                  <RefreshCw className="w-3 h-3 text-indigo-600" />
                  <span>{demoSimulatedRestock ? 'Restock Active' : 'Test Restock'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
