import React from 'react';
import { Product, Order } from '../../types';
import { useCurrency } from '../../context/CurrencyContext';
import { Flame, Star, ShoppingCart, Eye, Award, TrendingUp, Sliders } from 'lucide-react';
import { getBestSellerRecommendations } from '../../utils/recommendationEngine';
import OptimizedImage from './OptimizedImage';

interface BestSellersSectionProps {
  allProducts: Product[];
  orders?: Order[];
  onOpenProduct: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number) => void;
  limit?: number;
}

export default function BestSellersSection({
  allProducts,
  orders = [],
  onOpenProduct,
  onAddToCart,
  limit = 4
}: BestSellersSectionProps) {
  const { formatAmount } = useCurrency();

  const bestSellers = getBestSellerRecommendations(allProducts, orders, limit);

  if (bestSellers.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4" id="best-sellers-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-slate-900 flex items-center gap-2">
                <span>Best Sellers</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/60 rounded-full normal-case">
                  Rule: Sales Volume
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Top trending items with highest confirmed order volume and popularity
            </p>
          </div>
        </div>

        
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {bestSellers.map(({ product, reason, ruleDetails }, idx) => {
          return (
            <div
              key={product.id}
              className="group bg-white rounded-2xl border border-slate-200/80 hover:border-amber-300 hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden relative"
            >
              {/* Rank Badge */}
              <div className="absolute top-2.5 left-2.5 z-10">
                <span className="px-2 py-0.5 bg-slate-950/85 backdrop-blur-xs text-amber-400 text-[10px] font-black rounded-lg flex items-center gap-1 shadow-xs">
                  <Award className="w-3 h-3 text-amber-400" />
                  <span>#{idx + 1}</span>
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
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded shrink-0">
                      {ruleDetails?.salesVolume || product.salesCount} sold
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1 leading-tight group-hover:text-amber-700 transition-colors">
                    {product.name}
                  </h4>
                </div>

                {/* Rating & Price */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{product.rating ? product.rating.toFixed(1) : '4.9'}</span>
                      <span className="text-slate-400 text-[10px]">({product.reviewCount || 42})</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs sm:text-sm font-black font-mono text-slate-900">
                      {formatAmount(product.price)}
                    </span>

                    <button
                      type="button"
                      onClick={() => onAddToCart(product, 1)}
                      className="p-2 bg-slate-900 hover:bg-amber-600 active:scale-95 text-white rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
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
