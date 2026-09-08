import React, { useState, useMemo } from 'react';
import { Product, ProductVariant } from '../../types';
import { 
  Heart, ShoppingCart, Eye, Star, Zap, Check, AlertTriangle, ChevronLeft, ChevronRight, Sparkles, Flame
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import DynamicPricingDisplay from './DynamicPricingDisplay';
import AvailabilityBadge from './AvailabilityBadge';
import OptimizedImage from './OptimizedImage';

interface ECommerceProductCardProps {
  key?: React.Key;
  product: Product;
  isInWishlist: boolean;
  onToggleWishlist: (product: Product) => void;
  onAddToCart: (product: Product, variantSku?: string) => void;
  onBuyNow: (product: Product, variantSku?: string) => void;
  onQuickView: (product: Product) => void;
}

function getColorHex(colorName: string): string {
  const c = colorName.toLowerCase();
  if (c.includes('black') || c.includes('dark')) return '#1e293b';
  if (c.includes('white') || c.includes('snow')) return '#f8fafc';
  if (c.includes('red') || c.includes('crimson') || c.includes('rose')) return '#ef4444';
  if (c.includes('blue') || c.includes('sky') || c.includes('navy')) return '#2563eb';
  if (c.includes('green') || c.includes('olive') || c.includes('emerald')) return '#16a34a';
  if (c.includes('yellow') || c.includes('gold')) return '#eab308';
  if (c.includes('gray') || c.includes('grey') || c.includes('titanium') || c.includes('silver')) return '#94a3b8';
  if (c.includes('purple') || c.includes('violet')) return '#8b5cf6';
  if (c.includes('pink')) return '#ec4899';
  if (c.includes('orange')) return '#f97316';
  if (c.includes('brown')) return '#78350f';
  return '#cbd5e1';
}

export default function ECommerceProductCard({
  product,
  isInWishlist,
  onToggleWishlist,
  onAddToCart,
  onBuyNow,
  onQuickView
}: ECommerceProductCardProps) {
  const { formatAmount } = useCurrency();

  const isLowStock = product.stock > 0 && product.stock <= 5;
  const isOutOfStock = product.stock <= 0;
  const discount = product.discountPercent || (product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0);
  const rating = product.rating || 4.8;
  const reviewsCount = product.reviewCount || 48;

  // 1. Color Options Extraction from Variants
  const colorVariants = useMemo(() => {
    if (!product.variants || product.variants.length === 0) return [];
    const map = new Map<string, ProductVariant>();
    product.variants.forEach(v => {
      const col = v.color || v.options?.['Color'] || v.options?.['color'];
      if (col && !map.has(col.trim())) {
        map.set(col.trim(), v);
      }
    });
    return Array.from(map.entries()).map(([colorName, variant]) => ({
      colorName,
      variant
    }));
  }, [product.variants]);

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    colorVariants.length > 0 ? colorVariants[0].variant : null
  );

  // Limit swatches display to 4 max, with +N count
  const MAX_SWATCHES = 4;
  const visibleSwatches = colorVariants.slice(0, MAX_SWATCHES);
  const extraSwatchesCount = colorVariants.length - MAX_SWATCHES;

  // 2. Image Gallery & Carousel Controls
  const imageGallery = useMemo(() => {
    const imgs: string[] = [];
    if (selectedVariant?.imageUrl) {
      imgs.push(selectedVariant.imageUrl);
    }
    if (product.imageUrl && !imgs.includes(product.imageUrl)) {
      imgs.push(product.imageUrl);
    }
    if (product.images && product.images.length > 0) {
      product.images.forEach(img => {
        if (img && !imgs.includes(img)) imgs.push(img);
      });
    }
    if (product.variants && product.variants.length > 0) {
      product.variants.forEach(v => {
        if (v.imageUrl && !imgs.includes(v.imageUrl)) imgs.push(v.imageUrl);
      });
    }
    return imgs.length > 0 ? imgs : [product.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80'];
  }, [product, selectedVariant]);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const activeImage = imageGallery[currentImageIndex] || imageGallery[0] || product.imageUrl;

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % imageGallery.length);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + imageGallery.length) % imageGallery.length);
  };

  const currentPrice = selectedVariant?.price || product.price;
  const salesCount = product.salesCount ?? (product.reviewCount ? product.reviewCount * 3 + 12 : 24);

  return (
    <div 
      className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xl hover:border-indigo-300/80 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col justify-between group relative select-none"
      id={`product-card-${product.id}`}
    >
      {/* 1. Image Canvas, Gallery Controls & Badges */}
      <div 
        onClick={() => onQuickView(product)}
        className="relative aspect-square overflow-hidden bg-slate-100/80 cursor-pointer group/canvas"
      >
        <OptimizedImage 
          src={activeImage} 
          alt={product.name}
          aspectRatio="square"
          width={500}
          className="w-full h-full object-cover object-center group-hover/canvas:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Badges Stack (Top Left) */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 items-start pointer-events-none">
          {/* Out of Stock Badge */}
          {isOutOfStock && (
            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-slate-900/90 text-white shadow-xs tracking-tight uppercase backdrop-blur-xs">
              Out of Stock
            </span>
          )}

          {/* Sale Badge */}
          {discount > 0 && !isOutOfStock && (
            <span className="px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg text-[9px] font-black bg-rose-600 text-white shadow-xs tracking-tight uppercase flex items-center gap-1 backdrop-blur-xs">
              <Flame className="w-2.5 h-2.5 fill-white shrink-0" /> -{discount}%
            </span>
          )}

          {/* New Badge */}
          {product.isNewArrival && !isOutOfStock && (
            <span className="px-1.5 py-0.5 rounded-md text-[8px] sm:text-[9px] font-extrabold bg-indigo-600 text-white shadow-xs uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs">
              <Sparkles className="w-2.5 h-2.5 fill-white shrink-0" /> New
            </span>
          )}

          {/* Best Seller Badge */}
          {product.isBestSeller && !isOutOfStock && (
            <span className="px-1.5 py-0.5 rounded-md text-[8px] sm:text-[9px] font-extrabold bg-amber-500 text-white shadow-xs uppercase tracking-wider backdrop-blur-xs">
              Best
            </span>
          )}

          {/* Limited Badge */}
          {isLowStock && !isOutOfStock && (
            <span className="px-1.5 py-0.5 rounded-md text-[8px] sm:text-[9px] font-black bg-amber-600/90 text-white shadow-xs uppercase tracking-wider backdrop-blur-xs">
              Limited
            </span>
          )}
        </div>

        {/* Wishlist Button (Top Right) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product);
          }}
          className={`absolute top-2 right-2 p-1.5 sm:p-2 rounded-full backdrop-blur-md shadow-xs transition-all z-10 cursor-pointer active:scale-90 ${
            isInWishlist
              ? 'bg-rose-50 text-rose-500 ring-1 ring-rose-200'
              : 'bg-white/85 hover:bg-white text-slate-400 hover:text-rose-500'
          }`}
          title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          id={`wishlist-btn-${product.id}`}
        >
          <Heart className={`w-3.5 h-3.5 transition-colors ${isInWishlist ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>

        {/* Image Carousel Navigation Controls */}
        {imageGallery.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrevImage}
              className="absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-md opacity-90 sm:opacity-0 group-hover/canvas:opacity-100 transition-opacity z-10 cursor-pointer active:scale-90"
              title="Previous Image"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNextImage}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-md opacity-90 sm:opacity-0 group-hover/canvas:opacity-100 transition-opacity z-10 cursor-pointer active:scale-90"
              title="Next Image"
              aria-label="Next image"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Pagination Dots */}
            <div className="absolute bottom-1.5 left-0 right-0 flex justify-center items-center gap-1 z-10 pointer-events-auto px-2">
              {imageGallery.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(idx);
                  }}
                  className={`h-1 rounded-full transition-all cursor-pointer ${
                    idx === currentImageIndex ? 'w-3.5 bg-indigo-600' : 'w-1 bg-slate-300/80 hover:bg-slate-400'
                  }`}
                  title={`View image ${idx + 1}`}
                  aria-label={`View image ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Quick View Overlay Button (Hover Desktop) */}
        <div className="absolute inset-x-2 bottom-2 hidden sm:flex items-center gap-2 opacity-0 group-hover/canvas:opacity-100 transition-opacity z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(product);
            }}
            className="flex-1 py-1.5 bg-white/95 hover:bg-white text-slate-900 rounded-lg text-xs font-bold shadow-md flex items-center justify-center gap-1 transition-all cursor-pointer backdrop-blur-xs active:scale-95"
            id={`quickview-btn-${product.id}`}
          >
            <Eye className="w-3.5 h-3.5 text-indigo-600" />
            <span>Quick View</span>
          </button>
        </div>
      </div>

      {/* 2. Product Details Body - Streamlined & Compact */}
      <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between space-y-1.5">
        <div className="space-y-1">
          {/* Row 1: Brand (Left) & Amount Sold (Right) */}
          <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
            <span className="text-indigo-600 truncate max-w-[100px] sm:max-w-none">{product.brand || product.category}</span>
            <span className="text-amber-600 font-bold flex items-center gap-0.5 shrink-0">
              <Flame className="w-2.5 h-2.5 fill-amber-500 text-amber-500 inline" />
              <span>{salesCount} sold</span>
            </span>
          </div>

          {/* Row 2: Title */}
          <h3 
            onClick={() => onQuickView(product)}
            className="text-xs sm:text-[13px] font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug cursor-pointer"
            title={product.name}
          >
            {product.name}
          </h3>

          {/* Row 3: Rating (Left) & Stock Available (Right) */}
          <div className="flex items-center justify-between gap-1 text-[10px] pt-0.5">
            <div className="flex items-center gap-1">
              <div className="flex items-center text-amber-400">
                <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-400 text-amber-400" />
              </div>
              <span className="font-bold text-slate-700">{rating}</span>
              <span className="text-[9px] text-slate-400">({reviewsCount})</span>
            </div>

            {/* Availability Engine Badge */}
            <div className="shrink-0 font-medium text-[9px] sm:text-[10px]">
              <AvailabilityBadge
                product={product}
                variantSku={selectedVariant?.sku}
                layout="compact"
              />
            </div>
          </div>

          {/* Row 4: Color Swatches */}
          {colorVariants.length > 0 && (
            <div className="pt-0.5 flex items-center gap-1">
              <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-tight mr-0.5 shrink-0">
                Color:
              </span>
              {visibleSwatches.map(({ colorName, variant }) => {
                const isSelected = selectedVariant?.sku === variant.sku || selectedVariant?.color === colorName;
                const bgHex = getColorHex(colorName);
                return (
                  <button
                    key={colorName}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVariant(variant);
                      if (variant.imageUrl) {
                        const imgIdx = imageGallery.indexOf(variant.imageUrl);
                        if (imgIdx >= 0) setCurrentImageIndex(imgIdx);
                      }
                    }}
                    className={`w-3.5 h-3.5 rounded-full border transition-all cursor-pointer relative flex items-center justify-center shrink-0 ${
                      isSelected 
                        ? 'border-indigo-600 ring-2 ring-indigo-500/40 scale-110 z-1' 
                        : 'border-slate-300 hover:border-slate-400'
                    }`}
                    style={{ backgroundColor: bgHex }}
                    title={`Select ${colorName}`}
                    aria-label={`Select ${colorName}`}
                  />
                );
              })}

              {extraSwatchesCount > 0 && (
                <span className="text-[8px] font-bold text-slate-400 ml-0.5">
                  +{extraSwatchesCount}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Row 5: Price & Action Buttons */}
        <div className="pt-1.5 border-t border-slate-100 flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-1">
            <DynamicPricingDisplay
              product={product}
              variantSku={selectedVariant?.sku}
              layout="compact"
              showEngineBadge={false}
            />

            {product.variants && product.variants.length > 1 && (
              <span className="text-[9px] text-slate-400 font-medium shrink-0">
                {product.variants.length} opts
              </span>
            )}
          </div>

          {/* Action buttons: Add to Cart + Buy Now */}
          <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={() => onAddToCart(product, selectedVariant?.sku)}
              className="py-1.5 px-1 bg-slate-100 hover:bg-slate-200 active:scale-95 disabled:opacity-50 text-slate-900 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed touch-manipulation"
              id={`add-cart-btn-${product.id}`}
              aria-label="Add to cart"
            >
              <ShoppingCart className="w-3 h-3 text-slate-700 shrink-0" />
              <span className="truncate">{isOutOfStock ? 'Sold Out' : 'Add'}</span>
            </button>

            <button
              type="button"
              disabled={isOutOfStock}
              onClick={() => onBuyNow(product, selectedVariant?.sku)}
              className="py-1.5 px-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 text-white text-[10px] sm:text-[11px] font-bold rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed touch-manipulation"
              id={`buy-now-btn-${product.id}`}
              aria-label="Buy now"
            >
              <Zap className="w-3 h-3 text-amber-300 shrink-0" />
              <span className="truncate">Buy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


