import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { useCurrency } from '../../context/CurrencyContext';
import { History, Trash2, ShoppingCart, Eye, Star, Clock, Sparkles, RefreshCw, Sliders } from 'lucide-react';
import { 
  getRecentlyViewedProducts, 
  clearRecentlyViewedHistory, 
  trackRecentlyViewed,
  simulateBrowsingJourney
} from '../../utils/recommendationEngine';
import OptimizedImage from './OptimizedImage';

interface RecentlyViewedSectionProps {
  currentProductId?: string;
  allProducts: Product[];
  onOpenProduct: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number) => void;
  maxItems?: number;
  showSimulationTrigger?: boolean;
}

export default function RecentlyViewedSection({
  currentProductId,
  allProducts,
  onOpenProduct,
  onAddToCart,
  maxItems = 6,
  showSimulationTrigger = true
}: RecentlyViewedSectionProps) {
  const { formatAmount } = useCurrency();
  const [historyItems, setHistoryItems] = useState<{ product: Product; viewedAt: string; timeAgo: string; viewCount: number }[]>([]);

  const refreshHistory = () => {
    const list = getRecentlyViewedProducts(currentProductId, allProducts);
    setHistoryItems(list);
  };

  useEffect(() => {
    refreshHistory();

    // Listen for product view events across the storefront
    const handleProductViewed = () => {
      refreshHistory();
    };

    window.addEventListener('nexus:product_viewed', handleProductViewed);
    return () => {
      window.removeEventListener('nexus:product_viewed', handleProductViewed);
    };
  }, [currentProductId, allProducts]);

  const handleClear = () => {
    clearRecentlyViewedHistory();
    setHistoryItems([]);
  };

  const handleSimulateJourney = () => {
    const candidates = allProducts.slice(0, 3).map(p => p.id);
    simulateBrowsingJourney(candidates, allProducts);
  };

  // If no items in history and simulation trigger is disabled, return null
  if (historyItems.length === 0 && !showSimulationTrigger) {
    return null;
  }

  return (
    <section className="space-y-4 pt-6 pb-2 border-t border-slate-200/80" id="recently-viewed-section">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-700">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-slate-900 flex items-center gap-2">
                <span>Recently Viewed</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200/60 rounded-full normal-case">
                  Browsing History ({historyItems.length})
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Products you inspected in this session — feeds real-time recommendation affinities
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          

          {historyItems.length === 0 ? (
            <button
              type="button"
              onClick={handleSimulateJourney}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all cursor-pointer shadow-xs"
              title="Simulate Product A, B, C tracking"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Track Product A → B → C</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Clear browsing history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Recently Viewed Products */}
      {historyItems.length === 0 ? (
        <div className="p-6 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
          <p className="text-xs text-slate-500">
            No items viewed yet in this session. Click any product in the catalog or simulate below.
          </p>
          <button
            type="button"
            onClick={handleSimulateJourney}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
          >
            Click here to simulate viewing Product A, Product B, and Product C
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {historyItems.slice(0, maxItems).map(({ product, timeAgo, viewCount }) => {
            return (
              <div
                key={product.id}
                className="group bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden"
              >
                {/* Product Thumbnail */}
                <div 
                  onClick={() => onOpenProduct(product)}
                  className="relative aspect-square bg-slate-50 overflow-hidden cursor-pointer p-3"
                >
                  <OptimizedImage
                    src={product.imageUrl}
                    alt={product.name}
                    width={200}
                    height={200}
                    sizes="(max-width: 640px) 150px, 200px"
                    className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Viewed Time Badge */}
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-0.5 bg-slate-900/80 backdrop-blur-xs text-slate-200 text-[9px] font-medium rounded-md flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-slate-400" />
                      <span>{timeAgo}</span>
                    </span>
                  </div>

                  {viewCount > 1 && (
                    <div className="absolute top-2 right-2">
                      <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-[9px] font-black rounded-md shadow-xs">
                        {viewCount}x
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenProduct(product);
                    }}
                    className="absolute bottom-2 right-2 p-1.5 bg-white/90 hover:bg-white text-slate-700 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Quick View"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Product Info */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                  <div 
                    onClick={() => onOpenProduct(product)}
                    className="cursor-pointer space-y-1"
                  >
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                      {product.brand || product.category}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1 leading-tight group-hover:text-indigo-600 transition-colors">
                      {product.name}
                    </h4>
                  </div>

                  {/* Rating & Price */}
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1 text-[11px] text-amber-500 font-bold">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{product.rating ? product.rating.toFixed(1) : '4.8'}</span>
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs sm:text-sm font-black font-mono text-slate-900">
                        {formatAmount(product.price)}
                      </span>

                      <button
                        type="button"
                        onClick={() => onAddToCart(product, 1)}
                        className="p-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                        title="Add to cart"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
