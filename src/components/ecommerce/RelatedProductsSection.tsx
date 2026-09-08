import React from 'react';
import { Product } from '../../types';
import { useCurrency } from '../../context/CurrencyContext';
import { Layers, Star, ShoppingCart, ArrowRight, Eye, Check } from 'lucide-react';
import { getSimilarRelatedProducts } from '../../utils/recommendationEngine';
import OptimizedImage from './OptimizedImage';

interface RelatedProductsSectionProps {
  mainProduct: Product;
  allProducts: Product[];
  onOpenProduct: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number) => void;
}

export default function RelatedProductsSection({
  mainProduct,
  allProducts,
  onOpenProduct,
  onAddToCart
}: RelatedProductsSectionProps) {
  const { formatAmount } = useCurrency();

  const relatedList = getSimilarRelatedProducts(mainProduct, allProducts, 4);

  if (relatedList.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 pt-6 border-t border-slate-200/80" id="related-products-section">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-slate-900">
              Related Products
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Similar models, alternative styles, and matching category picks
            </p>
          </div>
        </div>

        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
          {relatedList.length} similar {relatedList.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Grid of Related Products */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {relatedList.map((product) => {
          const discountPercent = product.originalPrice && product.originalPrice > product.price
            ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
            : product.discountPercent;

          const isSameBrand = product.brand && mainProduct.brand && product.brand.toLowerCase() === mainProduct.brand.toLowerCase();

          return (
            <div
              key={product.id}
              className="group bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-200 hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden"
            >
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

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {isSameBrand ? (
                    <span className="px-2 py-0.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold rounded-md">
                      {product.brand}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold rounded-md">
                      Similar
                    </span>
                  )}
                  {discountPercent && discountPercent > 0 ? (
                    <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-md">
                      -{discountPercent}%
                    </span>
                  ) : null}
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
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
                    {product.name}
                  </h4>
                </div>

                {/* Rating & Price */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1 text-[11px] text-amber-500 font-bold">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{product.rating ? product.rating.toFixed(1) : '4.8'}</span>
                    <span className="text-slate-400 font-normal text-[10px]">
                      ({product.reviewCount || 42})
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
                      className="p-2 bg-slate-900 hover:bg-indigo-600 active:scale-95 text-white rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
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
