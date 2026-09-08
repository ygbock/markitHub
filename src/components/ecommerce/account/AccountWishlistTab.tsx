import React from 'react';
import { Product } from '../../../types';
import { 
  Heart, ShoppingBag, Trash2, Star, CheckCircle2, 
  AlertTriangle, ArrowRight, Sparkles 
} from 'lucide-react';
import { useCurrency } from '../../../context/CurrencyContext';

interface AccountWishlistTabProps {
  wishlist: Product[];
  onAddToCart: (product: Product) => void;
  onRemoveFromWishlist: (product: Product) => void;
  onMoveAllToCart: () => void;
  onOpenProduct: (product: Product) => void;
  onExploreCatalog?: () => void;
}

export const AccountWishlistTab: React.FC<AccountWishlistTabProps> = ({
  wishlist,
  onAddToCart,
  onRemoveFromWishlist,
  onMoveAllToCart,
  onOpenProduct,
  onExploreCatalog
}) => {
  const { formatAmount } = useCurrency();

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-150" id="account-tab-wishlist">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            <span>My Wishlist & Saved Items</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {wishlist.length} item{wishlist.length !== 1 ? 's' : ''} saved for later purchase with price-drop alerts.
          </p>
        </div>

        {wishlist.length > 0 && (
          <button
            type="button"
            onClick={onMoveAllToCart}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Move All to Cart</span>
          </button>
        )}
      </div>

      {/* 2. Wishlist Product Grid */}
      {wishlist.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {wishlist.map((product) => {
            const inStock = product.stock > 0;

            return (
              <div 
                key={product.id}
                className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-3 group"
              >
                <div>
                  {/* Photo & Actions */}
                  <div className="relative rounded-2xl overflow-hidden bg-slate-100 aspect-square mb-2.5">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                        onClick={() => onOpenProduct(product)}
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-sm cursor-pointer"
                        onClick={() => onOpenProduct(product)}
                      >
                        {product.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    {/* Stock badge overlay */}
                    <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-xs ${
                      inStock 
                        ? 'bg-emerald-500/90 text-white border-emerald-600' 
                        : 'bg-rose-500/90 text-white border-rose-600'
                    }`}>
                      {inStock ? `${product.stock} In Stock` : 'Out of Stock'}
                    </span>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => onRemoveFromWishlist(product)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 hover:bg-white text-slate-400 hover:text-rose-600 shadow-xs transition-colors cursor-pointer"
                      title="Remove from wishlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Details */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                      {product.brand || product.category}
                    </span>
                    <h4 
                      onClick={() => onOpenProduct(product)}
                      className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 mt-0.5 cursor-pointer hover:text-indigo-600 transition-colors"
                    >
                      {product.name}
                    </h4>

                    {/* Price */}
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-sm sm:text-base font-black font-mono text-slate-900">
                        {formatAmount(product.price)}
                      </span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-xs text-slate-400 line-through font-mono">
                          {formatAmount(product.originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add to Cart button */}
                <button
                  type="button"
                  disabled={!inStock}
                  onClick={() => onAddToCart(product)}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    inStock
                      ? 'bg-slate-900 hover:bg-indigo-600 active:scale-[0.98] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{inStock ? 'Add to Cart' : 'Currently Unavailable'}</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200/90 shadow-2xs space-y-4">
          <div className="w-14 h-14 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
            <Heart className="w-7 h-7" />
          </div>
          <div className="max-w-sm mx-auto">
            <h3 className="text-base font-bold text-slate-900">Your wishlist is currently empty</h3>
            <p className="text-xs text-slate-500 mt-1">
              Tap the heart icon on any product in the catalog to save it to your personal wishlist and receive instant price-drop alerts.
            </p>
          </div>

          {onExploreCatalog && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onExploreCatalog}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Explore Catalog</span>
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
