import React from 'react';
import { Product } from '../../types';
import { useCurrency } from '../../context/CurrencyContext';
import { Sparkles, Star, ShoppingCart, Eye, Calendar, Clock, Sliders } from 'lucide-react';
import { getNewArrivalRecommendations } from '../../utils/recommendationEngine';
import OptimizedImage from './OptimizedImage';

interface NewArrivalsSectionProps {
  allProducts: Product[];
  onOpenProduct: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number) => void;
  limit?: number;
}

export default function NewArrivalsSection({
  allProducts,
  onOpenProduct,
  onAddToCart,
  limit = 4
}: NewArrivalsSectionProps) {
  const { formatAmount } = useCurrency();

  const newArrivals = getNewArrivalRecommendations(allProducts, limit);

  if (newArrivals.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4" id="new-arrivals-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-slate-900 flex items-center gap-2">
                <span>New Arrivals</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded-full normal-case">
                  Rule: Creation Date
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Freshly released styles, newly cataloged inventory, and latest additions
            </p>
          </div>
        </div>

        
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {newArrivals.map(({ product, reason, ruleDetails }) => {
          return (
            <div
              key={product.id}
              className="group bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-300 hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden relative"
            >
              {/* New Badge */}
              <div className="absolute top-2.5 left-2.5 z-10">
                <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded-lg flex items-center gap-1 shadow-xs">
                  <Sparkles className="w-3 h-3 text-white" />
                  <span>NEW</span>
                </span>
              </div>

              {/* Thumbnail Container */}
              <div 
                onClick={() => onOpenProduct(product)}
                className="relative aspect-square bg-slate-50 overflow-hidden cursor-pointer p-3"
              >
                <OptimizedImage
                  src={product.imageUrl}
                  alt={product.name}
                  width={240}
                  height={240}
                  sizes="(max-width: 640px) 160px, 240px"
                  className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                />

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
              <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                <div 
                  onClick={() => onOpenProduct(product)}
                  className="cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                      {product.brand || product.category}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded shrink-0">
                      {ruleDetails?.daysSinceCreation !== undefined ? `${ruleDetails.daysSinceCreation}d ago` : 'Recent'}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1 leading-tight group-hover:text-emerald-700 transition-colors">
                    {product.name}
                  </h4>
                </div>

                {/* Rating & Price */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{product.rating ? product.rating.toFixed(1) : '4.8'}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {ruleDetails?.creationDate || 'Fresh'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs sm:text-sm font-black font-mono text-slate-900">
                      {formatAmount(product.price)}
                    </span>

                    <button
                      type="button"
                      onClick={() => onAddToCart(product, 1)}
                      className="p-2 bg-slate-900 hover:bg-emerald-600 active:scale-95 text-white rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
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
    </section>
  );
}
