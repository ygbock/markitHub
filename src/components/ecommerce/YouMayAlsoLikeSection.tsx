import React from 'react';
import { Product, Customer } from '../../types';
import { useCurrency } from '../../context/CurrencyContext';
import { Sparkles, Star, ShoppingCart, Eye, Heart, CheckCircle2 } from 'lucide-react';
import { getYouMayAlsoLikeRecommendations } from '../../utils/recommendationEngine';
import OptimizedImage from './OptimizedImage';

interface YouMayAlsoLikeSectionProps {
  mainProduct: Product;
  allProducts: Product[];
  activeCustomer?: Customer | null;
  onOpenProduct: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number) => void;
}

export default function YouMayAlsoLikeSection({
  mainProduct,
  allProducts,
  activeCustomer,
  onOpenProduct,
  onAddToCart
}: YouMayAlsoLikeSectionProps) {
  const { formatAmount } = useCurrency();

  const recommendations = getYouMayAlsoLikeRecommendations(mainProduct, allProducts, activeCustomer, 4);

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 pt-6 border-t border-slate-200/80" id="you-may-also-like-section">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-slate-900 flex items-center gap-2">
              <span>You May Also Like</span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full normal-case">
                Recommendation Engine
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Curated gear, popular add-ons, and high-affinity items
            </p>
          </div>
        </div>
      </div>

      {/* Recommendations Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {recommendations.map(({ product, reason }) => {
          return (
            <div
              key={product.id}
              className="group bg-white rounded-2xl border border-slate-200/80 hover:border-purple-200 hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden"
            >
              {/* Product Image & Reason Tag */}
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

                {/* Reason Tag */}
                <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1 pointer-events-none">
                  <span className="px-2 py-0.5 bg-slate-900/85 backdrop-blur-xs text-purple-300 text-[9px] font-bold rounded-md flex items-center gap-1 shadow-xs truncate max-w-[85%]">
                    <Sparkles className="w-2.5 h-2.5 shrink-0 text-purple-400" />
                    <span className="truncate">{reason}</span>
                  </span>
                </div>

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
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {product.brand || product.category}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight group-hover:text-purple-600 transition-colors">
                    {product.name}
                  </h4>
                </div>

                {/* Rating & Price */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1 text-[11px] text-amber-500 font-bold">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{product.rating ? product.rating.toFixed(1) : '4.8'}</span>
                    <span className="text-slate-400 font-normal text-[10px]">
                      ({product.reviewCount || 64})
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs sm:text-sm font-black font-mono text-slate-900">
                        {formatAmount(product.price)}
                      </span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-[10px] font-mono text-slate-400 line-through">
                          {formatAmount(product.originalPrice)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onAddToCart(product, 1)}
                      className="p-2 bg-slate-900 hover:bg-purple-600 active:scale-95 text-white rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
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
