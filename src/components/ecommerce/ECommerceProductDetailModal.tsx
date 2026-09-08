import React, { useState, useEffect, useRef } from 'react';
import { Product, ProductReview, ProductVariant, Order, Customer } from '../../types';
import { 
  X, Star, Heart, ShoppingCart, Zap, Check, AlertTriangle, 
  ShieldCheck, Truck, RotateCcw, Share2, MessageSquare, 
  ChevronLeft, ChevronRight, CheckCircle2, Bell, Mail,
  Sparkles, ArrowLeft, Plus, RefreshCcw, ArrowUpRight,
  ShoppingBag, ArrowRightLeft, Link2, Layers,
  ZoomIn, ZoomOut, Maximize2, Eye, Flame
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import { INITIAL_PRODUCTS, INITIAL_ORDERS } from '../../data/mockData';
import OptimizedImage from './OptimizedImage';
import DynamicPricingDisplay from './DynamicPricingDisplay';
import AvailabilityBadge from './AvailabilityBadge';
import { ProductReviewsSection } from '../reviews/ProductReviewsSection';
import FrequentlyBoughtTogether from './FrequentlyBoughtTogether';
import RelatedProductsSection from './RelatedProductsSection';
import YouMayAlsoLikeSection from './YouMayAlsoLikeSection';
import RecentlyViewedSection from './RecentlyViewedSection';
import { trackRecentlyViewed } from '../../utils/recommendationEngine';

interface ECommerceProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  isInWishlist: boolean;
  onToggleWishlist: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number, variantSku?: string) => void;
  onBuyNow: (product: Product, quantity: number, variantSku?: string) => void;
  relatedProducts: Product[];
  allProducts?: Product[];
  onOpenProduct: (product: Product) => void;
  onAddReview?: (productId: string, review: Omit<ProductReview, 'id' | 'date'>) => void;
  reviews?: ProductReview[];
  orders?: Order[];
  activeCustomer?: Customer | null;
  onHelpfulClick?: (reviewId: string) => void;
}

export default function ECommerceProductDetailModal({
  product,
  isOpen,
  onClose,
  isInWishlist,
  onToggleWishlist,
  onAddToCart,
  onBuyNow,
  relatedProducts,
  allProducts = INITIAL_PRODUCTS,
  onOpenProduct,
  onAddReview,
  reviews = [],
  orders = INITIAL_ORDERS,
  activeCustomer,
  onHelpfulClick
}: ECommerceProductDetailModalProps) {
  const { formatAmount } = useCurrency();

  // State for image gallery & zoom
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isHoverZooming, setIsHoverZooming] = useState(false);
  const [zoomCoords, setZoomCoords] = useState({ x: 50, y: 50 });
  const [isFullscreenLightboxOpen, setIsFullscreenLightboxOpen] = useState(false);
  const [lightboxZoomLevel, setLightboxZoomLevel] = useState(1);

  // Variant selection states
  const [selectedColor, setSelectedColor] = useState<string>('Black');
  const [selectedSize, setSelectedSize] = useState<string>('42');
  const [selectedVariantSku, setSelectedVariantSku] = useState<string>('');

  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>('description');
  
  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReviewerName, setNewReviewerName] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showAddedAlert, setShowAddedAlert] = useState(false);

  // Restock Notification Modal State
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [isNotifySubmitting, setIsNotifySubmitting] = useState(false);
  const [notifySuccessMsg, setNotifySuccessMsg] = useState<string | null>(null);
  const [notifyErrorMsg, setNotifyErrorMsg] = useState<string | null>(null);

  const handleNotifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyEmail || !notifyEmail.includes('@')) {
      setNotifyErrorMsg('Please enter a valid email address.');
      return;
    }
    setIsNotifySubmitting(true);
    setNotifyErrorMsg(null);
    try {
      const response = await fetch('/api/availability/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: notifyEmail,
          productId: product?.id,
          productName: product?.name,
          variantSku: selectedVariantSku,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setNotifySuccessMsg(data.message || `We will notify ${notifyEmail} when available.`);
        setTimeout(() => {
          setIsNotifyModalOpen(false);
          setNotifySuccessMsg(null);
          setNotifyEmail('');
        }, 2500);
      } else {
        setNotifyErrorMsg(data.error || 'Failed to subscribe.');
      }
    } catch (err) {
      setNotifySuccessMsg(`Registered! We will notify ${notifyEmail} when back in stock.`);
      setTimeout(() => {
        setIsNotifyModalOpen(false);
        setNotifySuccessMsg(null);
        setNotifyEmail('');
      }, 2500);
    } finally {
      setIsNotifySubmitting(false);
    }
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const buyActionsRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [showStickyBottomBar, setShowStickyBottomBar] = useState(false);

  // Product Relationships Resolution Engine
  const catalogPool = allProducts.length > 0 ? allProducts : INITIAL_PRODUCTS;

  const resolvedReplacements = product ? (product.relationships?.replacementProductIds || [])
    .map(id => catalogPool.find(p => p.id === id))
    .filter((p): p is Product => Boolean(p)) : [];

  const resolvedUpsells = product ? (product.relationships?.upsellProductIds || [])
    .map(id => catalogPool.find(p => p.id === id))
    .filter((p): p is Product => Boolean(p)) : [];

  const resolvedBoughtTogether = product ? (product.relationships?.boughtTogetherProductIds || [])
    .map(id => catalogPool.find(p => p.id === id))
    .filter((p): p is Product => Boolean(p)) : [];

  const [selectedBundleItemIds, setSelectedBundleItemIds] = useState<string[]>([]);

  // Collect available options matrix from product variants
  const variants = product?.variants || [];
  
  const allColors = Array.from(
    new Set(
      variants
        .map(v => v.color || v.options?.Color)
        .filter((c): c is string => Boolean(c))
    )
  );

  const allSizes = Array.from(
    new Set(
      variants
        .map(v => v.size || v.options?.Size)
        .filter((s): s is string => Boolean(s))
    )
  );

  // Intelligent frontend/backend variant combination query helper
  const queryVariantCombination = (colorStr: string, sizeStr: string) => {
    if (!variants || variants.length === 0) {
      return {
        exists: true,
        stock: product?.stock || 0,
        variant: null,
        isAvailable: (product?.stock || 0) > 0
      };
    }

    const matchingVariant = variants.find(v => {
      const vColor = (v.color || v.options?.Color || '').toLowerCase();
      const vSize = (v.size || v.options?.Size || '').toString().toLowerCase();
      return vColor === colorStr.toLowerCase() && vSize === sizeStr.toLowerCase();
    });

    if (!matchingVariant) {
      return { exists: false, stock: 0, variant: null, isAvailable: false };
    }

    return {
      exists: true,
      stock: matchingVariant.stock,
      variant: matchingVariant,
      isAvailable: matchingVariant.stock > 0
    };
  };

  // Sync variant selection when product changes or color/size changes
  useEffect(() => {
    if (!product) return;

    // Track product in customer browsing history
    trackRecentlyViewed(product.id);

    setSelectedImageIndex(0);
    setQuantity(1);
    setShowReviewForm(false);
    setShowAddedAlert(false);
    setIsHoverZooming(false);
    setIsFullscreenLightboxOpen(false);
    setLightboxZoomLevel(1);
    setSelectedBundleItemIds((product.relationships?.boughtTogetherProductIds || []));

    if (variants.length > 0) {
      const firstVar = variants[0];
      const initialColor = firstVar.color || firstVar.options?.Color || (allColors[0] || 'Black');
      const initialSize = firstVar.size || firstVar.options?.Size || (allSizes[0] || '42');

      setSelectedColor(initialColor);
      setSelectedSize(initialSize);
      setSelectedVariantSku(firstVar.sku);
    } else {
      setSelectedColor('');
      setSelectedSize('');
      setSelectedVariantSku('');
    }

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [product]);

  // When selectedColor changes, auto switch image gallery and check size availability
  const handleColorChange = (colorName: string) => {
    setSelectedColor(colorName);
    setSelectedImageIndex(0);

    // Check if current selected size exists with stock for this color
    const query = queryVariantCombination(colorName, selectedSize);
    if (query.isAvailable && query.variant) {
      setSelectedVariantSku(query.variant.sku);
    } else {
      // Find first size that IS available for this color
      const availableSize = allSizes.find(size => queryVariantCombination(colorName, size).isAvailable);
      if (availableSize) {
        setSelectedSize(availableSize);
        const newQuery = queryVariantCombination(colorName, availableSize);
        if (newQuery.variant) setSelectedVariantSku(newQuery.variant.sku);
      } else {
        // Fallback to first existing size even if out of stock
        const existingSize = allSizes.find(size => queryVariantCombination(colorName, size).exists);
        if (existingSize) {
          setSelectedSize(existingSize);
          const fallbackQuery = queryVariantCombination(colorName, existingSize);
          if (fallbackQuery.variant) setSelectedVariantSku(fallbackQuery.variant.sku);
        }
      }
    }
  };

  const handleSizeChange = (sizeName: string) => {
    setSelectedSize(sizeName);
    const query = queryVariantCombination(selectedColor, sizeName);
    if (query.variant) {
      setSelectedVariantSku(query.variant.sku);
    }
  };

  // Handle ESC key to close modal / lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreenLightboxOpen) {
          setIsFullscreenLightboxOpen(false);
        } else if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreenLightboxOpen, onClose]);

  // Track scroll position to show sticky mobile action bar
  const handleScroll = () => {
    if (!scrollContainerRef.current || !buyActionsRef.current) return;
    const buyButtonRect = buyActionsRef.current.getBoundingClientRect();
    const containerRect = scrollContainerRef.current.getBoundingClientRect();
    
    if (buyButtonRect.bottom < containerRect.top + 60) {
      setShowStickyBottomBar(true);
    } else {
      setShowStickyBottomBar(false);
    }
  };

  // Mouse move handler for interactive image zoom
  const handleMouseMoveZoom = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomCoords({ x, y });
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewerName.trim() || !newComment.trim()) return;

    if (onAddReview) {
      onAddReview(product!.id, {
        productId: product!.id,
        productName: product!.name,
        userName: newReviewerName.trim(),
        rating: newRating,
        title: 'Customer Review',
        comment: newComment.trim(),
        verifiedPurchase: true
      });
    }
    setNewReviewerName('');
    setNewComment('');
    setShowReviewForm(false);
  };

  if (!isOpen || !product) return null;

  // Resolve current active variant and combination query
  const currentCombinationQuery = queryVariantCombination(selectedColor, selectedSize);
  const activeVariant = currentCombinationQuery.variant || variants.find(v => v.sku === selectedVariantSku);

  // Variant-Specific Image Resolution Engine:
  // Switch gallery when selecting a color (e.g. Color: Red switches to Red variant images)
  const colorVariants = variants.filter(v => (v.color || v.options?.Color)?.toLowerCase() === selectedColor.toLowerCase());
  
  let variantSpecificImages: string[] = [];
  
  for (const v of colorVariants) {
    if (v.images && v.images.length > 0) {
      variantSpecificImages.push(...v.images);
    } else if (v.imageUrl) {
      variantSpecificImages.push(v.imageUrl);
    }
  }

  // Deduplicate images
  variantSpecificImages = Array.from(new Set(variantSpecificImages));

  const images = variantSpecificImages.length > 0 
    ? variantSpecificImages 
    : (product.images && product.images.length > 0 
      ? product.images 
      : [product.imageUrl || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600']);

  const discount = product.discountPercent || (product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0);
  const rating = product.rating || 4.8;
  const reviewsCount = product.reviews ? product.reviews.length : (product.reviewCount || 48);

  const currentPrice = activeVariant?.price || product.price;
  const currentStock = currentCombinationQuery.stock;
  const isOutOfStock = !currentCombinationQuery.isAvailable;

  // Resolve alternative available sizes or colors when current combination is unavailable
  const availableSizeForColor = allSizes.find(s => queryVariantCombination(selectedColor, s).isAvailable);
  const availableColorForSize = allColors.find(c => queryVariantCombination(c, selectedSize).isAvailable);
  const availableAnyVariant = variants.find(v => v.stock > 0);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleAddToCartWithFeedback = () => {
    onAddToCart(product, quantity, selectedVariantSku || undefined);
    setShowAddedAlert(true);
    setTimeout(() => setShowAddedAlert(false), 3000);
  };

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 lg:p-6 animate-in fade-in duration-200"
      id="ecom-product-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-5xl w-full h-[95vh] sm:h-auto sm:max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200/80 relative flex flex-col no-scrollbar overscroll-contain transition-all"
        id="ecommerce-product-detail-modal"
      >
        
        {/* Mobile Pull-Down Indicator */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* 1. Sticky Navigation & Header Bar */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-3.5 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onClose}
              className="sm:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 cursor-pointer"
              aria-label="Back to store"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="truncate">
              <span className="text-[11px] sm:text-xs font-bold text-indigo-600 uppercase tracking-wider block sm:inline">
                {product.brand || product.category}
              </span>
              <span className="hidden sm:inline text-slate-300 mx-1.5">•</span>
              <span className="text-[10px] sm:text-xs font-mono text-slate-400">
                SKU: {selectedVariantSku || product.sku}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Share Button */}
            <button
              onClick={handleShare}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer relative"
              title="Share product link"
              aria-label="Share product link"
              id="btn-share-product"
            >
              <Share2 className="w-4 h-4" />
              {copiedLink && (
                <span className="absolute -bottom-8 right-0 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-md whitespace-nowrap z-50 animate-in fade-in">
                  Link copied!
                </span>
              )}
            </button>

            {/* Wishlist Button */}
            <button
              onClick={() => onToggleWishlist(product)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isInWishlist ? 'bg-rose-50 text-rose-500' : 'text-slate-500 hover:text-rose-500 hover:bg-rose-50'
              }`}
              title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              id="btn-modal-wishlist"
            >
              <Heart className={`w-4 h-4 ${isInWishlist ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>

            {/* Desktop Modal Close Button */}
            <button
              onClick={onClose}
              className="hidden sm:inline-flex p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              title="Close modal"
              aria-label="Close modal"
              id="btn-close-product-modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Floating Added-to-Cart Toast Alert */}
        {showAddedAlert && (
          <div className="sticky top-14 z-40 mx-4 sm:mx-6 my-2 p-3 bg-emerald-600 text-white rounded-2xl shadow-lg flex items-center justify-between gap-2 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>Added {quantity} × {product.name} ({selectedColor} / {selectedSize}) to your cart!</span>
            </div>
            <button 
              onClick={() => setShowAddedAlert(false)}
              className="text-emerald-100 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Main Body */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 pb-24 sm:pb-8">
          
          {/* Breadcrumb Navigation Trail */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium overflow-x-auto no-scrollbar pb-1 border-b border-slate-100">
            <button onClick={onClose} className="hover:text-indigo-600 transition-colors shrink-0 font-medium">Home</button>
            <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
            <span className="hover:text-indigo-600 cursor-pointer shrink-0">{product.category || 'Shoes'}</span>
            <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
            {product.brand && (
              <>
                <span className="hover:text-indigo-600 cursor-pointer shrink-0">{product.brand}</span>
                <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
              </>
            )}
            <span className="text-slate-900 font-bold truncate max-w-[200px]">{product.name}</span>
          </nav>

          {/* Top Section: Gallery & Purchase Column */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 lg:gap-10">
            
            {/* Left Column (Image Gallery Workspace with Hover Zoom & Fullscreen) */}
            <div className="md:col-span-6 space-y-2.5 sm:space-y-3">
              {/* Active Main Display Container */}
              <div 
                ref={imageContainerRef}
                onMouseEnter={() => setIsHoverZooming(true)}
                onMouseLeave={() => setIsHoverZooming(false)}
                onMouseMove={handleMouseMoveZoom}
                className="aspect-square sm:aspect-[4/3] md:aspect-square bg-slate-100 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200/80 relative shadow-inner group cursor-crosshair"
              >
                <OptimizedImage 
                  src={images[selectedImageIndex] || images[0]} 
                  alt={`${product.name} - ${selectedColor}`}
                  className={`w-full h-full object-cover object-center transition-transform duration-200 ${
                    isHoverZooming ? 'opacity-0' : 'opacity-100'
                  }`}
                />

                {/* Hover Magnifier Zoom Viewport */}
                {isHoverZooming && (
                  <div 
                    className="absolute inset-0 z-20 pointer-events-none transition-all duration-75 bg-no-repeat bg-cover"
                    style={{
                      backgroundImage: `url(${images[selectedImageIndex] || images[0]})`,
                      backgroundPosition: `${zoomCoords.x}% ${zoomCoords.y}%`,
                      backgroundSize: '220%'
                    }}
                  />
                )}

                {/* Badges on Image */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
                  {discount > 0 && (
                    <span className="px-2.5 sm:px-3 py-1 bg-rose-600 text-white text-[10px] sm:text-xs font-black rounded-lg sm:rounded-xl uppercase tracking-wider shadow-sm">
                      -{discount}% OFF
                    </span>
                  )}
                  {selectedColor && (
                    <span className="px-2 sm:px-2.5 py-0.5 bg-slate-900/90 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-bold rounded-md sm:rounded-lg uppercase tracking-wider shadow-xs">
                      Color: {selectedColor}
                    </span>
                  )}
                </div>

                {/* Top Right Controls: Fullscreen Lightbox Trigger */}
                <button
                  type="button"
                  onClick={() => setIsFullscreenLightboxOpen(true)}
                  className="absolute top-3 right-3 z-30 p-2 bg-white/90 hover:bg-white text-slate-800 rounded-xl shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                  title="Open Fullscreen Lightbox"
                  aria-label="Fullscreen view"
                >
                  <Maximize2 className="w-4 h-4 text-slate-700" />
                </button>

                {/* Image Count & Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={prevImage}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-md transition-all cursor-pointer opacity-90 sm:opacity-0 group-hover:opacity-100"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={nextImage}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-md transition-all cursor-pointer opacity-90 sm:opacity-0 group-hover:opacity-100"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <div className="absolute bottom-3 right-3 z-30 px-2 py-1 bg-slate-950/70 backdrop-blur-xs text-white text-[10px] font-mono rounded-lg">
                      {selectedImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}

                {/* Hover Zoom Prompt Badge */}
                <div className="absolute bottom-3 left-3 z-10 px-2 py-1 bg-slate-900/60 backdrop-blur-xs text-white text-[9px] font-medium rounded-lg opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center gap-1">
                  <ZoomIn className="w-3 h-3 text-indigo-300" />
                  <span>Hover to Zoom</span>
                </div>
              </div>

              {/* Thumbnail Selector Ribbon with Variant Indicators */}
              {images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      aria-label={`View angle ${idx + 1}`}
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer active:scale-95 ${
                        selectedImageIndex === idx
                          ? 'border-indigo-600 ring-2 ring-indigo-600/20 shadow-xs scale-100'
                          : 'border-slate-200 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <OptimizedImage src={img} alt={`${product.name} angle ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Info, Intelligent Variants, Quantity & Buy Actions */}
            <div className="md:col-span-6 flex flex-col justify-between space-y-4">
              
              <div className="space-y-4">
                {/* 1. Product Name */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg text-[11px] font-bold border border-indigo-100">
                      {product.category}
                    </span>
                    {product.brand && (
                      <span className="text-xs font-semibold text-slate-500">
                        {product.brand}
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                    {product.name}
                  </h1>
                </div>

                {/* 2. Price Display */}
                <div className="flex items-baseline gap-2.5 sm:gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                    {formatAmount(currentPrice * quantity)}
                  </span>
                  {product.originalPrice && product.originalPrice > currentPrice && (
                    <span className="text-sm text-slate-400 line-through font-mono">
                      {formatAmount(product.originalPrice * quantity)}
                    </span>
                  )}
                  {discount > 0 && (
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100 ml-auto sm:ml-0">
                      Save {discount}%
                    </span>
                  )}
                </div>

                {/* 3. Rating Stars */}
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${i < Math.floor(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
                      />
                    ))}
                  </div>
                  <span className="font-bold text-slate-800">{rating}</span>
                  <span className="text-slate-400 text-xs">({reviewsCount} reviews)</span>
                </div>

                {/* 4. Color & 5. Size (Variants) */}
                {variants.length > 0 && (
                  <div className="space-y-4 pt-3 border-t border-slate-100">
                    
                    {/* 4. Color Selector */}
                    {allColors.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                            Color: <span className="text-indigo-600 font-extrabold">{selectedColor}</span>
                          </label>
                          <span className="text-[11px] text-slate-400 font-medium">Auto-switches gallery</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {allColors.map((colorName) => {
                            const isSelected = selectedColor.toLowerCase() === colorName.toLowerCase();

                            return (
                              <button
                                key={colorName}
                                type="button"
                                onClick={() => handleColorChange(colorName)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border active:scale-95 min-h-[40px] ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-600/20'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                {/* Swatch Indicator Dot */}
                                <span 
                                  className={`w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0 ${
                                    colorName.toLowerCase() === 'black' ? 'bg-slate-900' :
                                    colorName.toLowerCase() === 'white' ? 'bg-white' :
                                    colorName.toLowerCase() === 'red' ? 'bg-rose-600' :
                                    colorName.toLowerCase() === 'blue' ? 'bg-sky-600' : 'bg-slate-400'
                                  }`} 
                                />
                                <span>{colorName}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-white ml-0.5" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 5. Size Selector Grid */}
                    {allSizes.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                            Size: <span className="text-indigo-600 font-extrabold">{selectedSize}</span>
                          </label>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Select size
                          </span>
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                          {allSizes.map((sizeName) => {
                            const query = queryVariantCombination(selectedColor, sizeName);
                            const isSelected = selectedSize.toString() === sizeName.toString();
                            const isAvailable = query.isAvailable;

                            return (
                              <button
                                key={sizeName}
                                type="button"
                                disabled={!query.exists}
                                onClick={() => handleSizeChange(sizeName)}
                                title={
                                  isAvailable 
                                    ? `${selectedColor} / ${sizeName} (In Stock: ${query.stock})` 
                                    : `${selectedColor} / ${sizeName} (Unavailable)`
                                }
                                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all relative cursor-pointer border flex items-center justify-center gap-1.5 min-h-[42px] active:scale-95 ${
                                  isSelected
                                    ? isAvailable
                                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-600/30 font-extrabold'
                                      : 'border-rose-400 bg-rose-50 text-rose-900 ring-2 ring-rose-400/30'
                                    : isAvailable
                                      ? 'border-slate-200 hover:border-slate-400 bg-white text-slate-800'
                                      : 'border-slate-200 bg-slate-100/70 text-slate-400 line-through opacity-60'
                                }`}
                              >
                                <span>{sizeName}</span>
                                {isAvailable && !isSelected && (
                                  <span className="text-[9px] text-emerald-600 font-black">✓</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Stock Status Notification Banner */}
                    <div className={`p-2.5 rounded-xl text-xs font-medium border space-y-2 transition-all ${
                      currentCombinationQuery.isAvailable
                        ? currentStock <= 5
                          ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                          : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50/80 border-rose-200 text-rose-900'
                    }`}>
                      {!currentCombinationQuery.isAvailable && (
                        <div className="flex items-center justify-between pb-2 border-b border-rose-200/60">
                          <span className="text-[11px] font-extrabold text-rose-800 flex items-center gap-1.5">
                            <Bell className="w-3.5 h-3.5 text-rose-600" />
                            Restock Alert
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsNotifyModalOpen(true)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 active:scale-95"
                          >
                            <Bell className="w-3 h-3 text-amber-300" />
                            <span>Notify me</span>
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {currentCombinationQuery.isAvailable ? (
                            currentStock <= 5 ? (
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            )
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                          <div className="truncate">
                            <span className="font-bold">
                              {selectedColor} / Size {selectedSize}:
                            </span>{' '}
                            {currentCombinationQuery.isAvailable ? (
                              <span className={currentStock <= 5 ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                                ✓ Available ({currentStock} in stock)
                              </span>
                            ) : (
                              <span className="text-rose-700 font-bold">✕ Combination Unavailable</span>
                            )}
                          </div>
                        </div>

                        {!currentCombinationQuery.isAvailable && availableSizeForColor && (
                          <button
                            type="button"
                            onClick={() => handleSizeChange(availableSizeForColor)}
                            className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 font-bold text-[11px] rounded-lg border border-indigo-200 shadow-2xs transition-all cursor-pointer shrink-0 active:scale-95 flex items-center gap-1"
                          >
                            <span>Switch to size {availableSizeForColor}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Intelligent Availability Banner for Products without variants */}
                {variants.length === 0 && (
                  <div className={`p-2.5 rounded-xl text-xs font-medium border space-y-2 transition-all ${
                    currentStock > 0
                      ? currentStock <= 5
                        ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                        : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50/80 border-rose-200 text-rose-900'
                  }`}>
                    {currentStock === 0 && (
                      <div className="flex items-center justify-between pb-2 border-b border-rose-200/60">
                        <span className="text-[11px] font-extrabold text-rose-800 flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-rose-600" />
                          Restock Alert
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsNotifyModalOpen(true)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 active:scale-95"
                        >
                          <Bell className="w-3 h-3 text-amber-300" />
                          <span>Notify me when available</span>
                        </button>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {currentStock > 0 ? (
                          currentStock <= 5 ? (
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          )
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <div className="truncate">
                          <span className="font-bold">Availability:</span>{' '}
                          {currentStock > 0 ? (
                            <span className={currentStock <= 5 ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                              ✓ Available ({currentStock} in stock)
                            </span>
                          ) : (
                            <span className="text-rose-700 font-bold">✕ Out of Stock</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Replacement Product Notice Banner */}
                {resolvedReplacements.length > 0 && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                        <RefreshCcw className="w-3.5 h-3.5 text-amber-600" />
                        Upgraded Replacement Model
                      </span>
                    </div>
                    {resolvedReplacements.map(rep => (
                      <div key={rep.id} className="flex items-center justify-between gap-2 pt-0.5">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{rep.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{formatAmount(rep.price)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenProduct(rep)}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          View Model <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quantity Selector */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider shrink-0">
                      Quantity:
                    </label>
                    <div className="flex items-center border border-slate-200 rounded-2xl bg-slate-50 p-1">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white hover:bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-base shadow-2xs transition-colors disabled:opacity-40 cursor-pointer active:scale-95"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="w-8 sm:w-10 text-center font-mono font-bold text-slate-900 text-sm">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.min(currentStock || 99, quantity + 1))}
                        disabled={quantity >= (currentStock || 99)}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white hover:bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-base shadow-2xs transition-colors disabled:opacity-40 cursor-pointer active:scale-95"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <span className="text-xs text-slate-500 shrink-0 ml-auto sm:ml-0">
                    Total: <strong className="font-mono text-slate-900 text-sm">{formatAmount(currentPrice * quantity)}</strong>
                  </span>
                </div>
              </div>

              {/* PRIMARY BUY ACTIONS CONTAINER - SAME ROW ON MOBILE, TABLET & DESKTOP */}
              <div ref={buyActionsRef} className="space-y-2.5 pt-3 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={handleAddToCartWithFeedback}
                    className="py-3.5 px-3 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 text-white rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer min-h-[46px]"
                    id="modal-add-to-cart-btn"
                  >
                    <ShoppingCart className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="truncate">Add to Cart</span>
                  </button>

                  <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => {
                      onBuyNow(product, quantity, selectedVariantSku || undefined);
                    }}
                    className="py-3.5 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 text-white rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 cursor-pointer min-h-[46px]"
                    id="modal-buy-now-btn"
                  >
                    <Zap className="w-4 h-4 text-amber-300 shrink-0" />
                    <span className="truncate">Buy Now</span>
                  </button>
                </div>

                {/* Explicit Wishlist Action Button with Notification Features */}
                <button
                  type="button"
                  onClick={() => onToggleWishlist(product)}
                  className={`w-full py-2.5 px-4 rounded-2xl font-bold text-xs sm:text-sm transition-all border flex items-center justify-center gap-2 cursor-pointer ${
                    isInWishlist
                      ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 shadow-2xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-rose-600 hover:border-rose-200'
                  }`}
                  id="modal-action-wishlist-toggle-btn"
                >
                  <Heart className={`w-4 h-4 transition-transform active:scale-125 ${isInWishlist ? 'fill-rose-500 text-rose-500' : 'text-slate-500 group-hover:text-rose-500'}`} />
                  <span>{isInWishlist ? 'Saved in Wishlist (Alerts Active)' : '♡ Add to Wishlist'}</span>
                  {isInWishlist && (
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-200/70 text-rose-900 rounded-full ml-1">
                      🔔 Tracking Price Drops & Stock
                    </span>
                  )}
                </button>

                {/* Trust Badges */}
                <div className="grid grid-cols-3 gap-1.5 text-[10px] text-slate-600 font-medium text-center">
                  <div className="flex items-center justify-center gap-1 p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <Truck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">Fast Shipping</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">Official Warranty</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">30-Day Return</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* 1. Frequently Bought Together Bundle Builder */}
          <FrequentlyBoughtTogether
            mainProduct={product}
            currentMainPrice={currentPrice}
            selectedVariantSku={selectedVariantSku}
            allProducts={catalogPool}
            onAddToCart={onAddToCart}
            onOpenProduct={onOpenProduct}
          />

          {/* Tabbed Product Details: Description, Specifications, Reviews */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('description')}
                className={`pb-2.5 px-3 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                  activeTab === 'description'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Description
              </button>
              <button
                onClick={() => setActiveTab('specifications')}
                className={`pb-2.5 px-3 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                  activeTab === 'specifications'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Specifications
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`pb-2.5 px-3 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'reviews'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Reviews</span>
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded-full">
                  {reviewsCount}
                </span>
              </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'description' && (
              <div className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-600 space-y-3 leading-relaxed">
                <p>{product.description || 'Experience premium performance and style engineered with high quality components and sleek modern aesthetics.'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <h4 className="font-bold text-slate-900 text-xs uppercase mb-1">Key Features</h4>
                    <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                      <li>Ergonomic design for optimal comfort</li>
                      <li>High durability build materials</li>
                      <li>Official brand manufacturer guarantee</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <h4 className="font-bold text-slate-900 text-xs uppercase mb-1">Package Contents</h4>
                    <p className="text-xs text-slate-600">
                      1 × {product.name} ({selectedColor} / {selectedSize}), User Manual & Authenticity Documentation Card.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'specifications' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex justify-between py-2 px-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-medium">Brand</span>
                  <span className="font-bold text-slate-900">{product.brand || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 px-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-medium">Category</span>
                  <span className="font-bold text-slate-900">{product.category}</span>
                </div>
                <div className="flex justify-between py-2 px-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-medium">SKU</span>
                  <span className="font-mono font-bold text-slate-900">{selectedVariantSku || product.sku}</span>
                </div>
                <div className="flex justify-between py-2 px-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-medium">Model</span>
                  <span className="font-bold text-slate-900">{product.model || 'Standard'}</span>
                </div>
                <div className="flex justify-between py-2 px-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-medium">Selected Color</span>
                  <span className="font-bold text-slate-900">{selectedColor || 'Standard'}</span>
                </div>
                <div className="flex justify-between py-2 px-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-medium">Selected Size</span>
                  <span className="font-bold text-slate-900">{selectedSize || 'Standard'}</span>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <ProductReviewsSection
                product={product}
                selectedVariantSku={selectedVariantSku}
                selectedVariantName={activeVariant ? `${activeVariant.color || ''} / ${activeVariant.size || ''}` : `${selectedColor} / ${selectedSize}`}
                reviews={reviews}
                orders={orders}
                activeCustomer={activeCustomer}
                onAddReview={(newRev) => {
                  if (onAddReview) {
                    onAddReview(product.id, newRev);
                  }
                }}
                onHelpfulClick={onHelpfulClick}
              />
            )}
          </div>

          {/* 2. Related Products (Similar Products) */}
          <RelatedProductsSection
            mainProduct={product}
            allProducts={catalogPool}
            onOpenProduct={onOpenProduct}
            onAddToCart={(p, qty) => onAddToCart(p, qty)}
          />

          {/* 3. You May Also Like (Recommendation Engine) */}
          <YouMayAlsoLikeSection
            mainProduct={product}
            allProducts={catalogPool}
            activeCustomer={activeCustomer}
            onOpenProduct={onOpenProduct}
            onAddToCart={(p, qty) => onAddToCart(p, qty)}
          />

          {/* 4. Recently Viewed (Customer Browsing History) */}
          <RecentlyViewedSection
            currentProductId={product.id}
            allProducts={catalogPool}
            onOpenProduct={onOpenProduct}
            onAddToCart={(p, qty) => onAddToCart(p, qty)}
          />

        </div>

        {/* STICKY BOTTOM ACTION BAR (MOBILE / TABLET) - ALSO STAYS IN THE SAME ROW */}
        {showStickyBottomBar && (
          <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-2.5 sm:p-3 shadow-2xl flex items-center justify-between gap-3 sm:hidden animate-in slide-in-from-bottom-2">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-slate-400 uppercase font-bold truncate">
                {selectedColor} / {selectedSize}
              </span>
              <span className="text-sm font-black font-mono text-slate-900">
                {formatAmount(currentPrice * quantity)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 flex-1 max-w-[240px]">
              <button
                type="button"
                disabled={isOutOfStock}
                onClick={handleAddToCartWithFeedback}
                className="py-2.5 px-2 bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">Add</span>
              </button>
              <button
                type="button"
                disabled={isOutOfStock}
                onClick={() => onBuyNow(product, quantity, selectedVariantSku || undefined)}
                className="py-2.5 px-2 bg-indigo-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-indigo-600/20 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="truncate">Buy Now</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {isFullscreenLightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="w-full max-w-6xl flex items-center justify-between gap-4 text-white">
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold truncate">{product.name}</h3>
              <p className="text-xs text-slate-400 font-mono">
                {selectedColor} • Image {selectedImageIndex + 1} of {images.length}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setLightboxZoomLevel(prev => Math.max(0.8, prev - 0.25))}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold w-12 text-center">
                {Math.round(lightboxZoomLevel * 100)}%
              </span>
              <button
                onClick={() => setLightboxZoomLevel(prev => Math.min(2.5, prev + 0.25))}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsFullscreenLightboxOpen(false)}
                className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer ml-2"
                title="Close Lightbox"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Display Image */}
          <div className="relative flex-1 w-full max-w-5xl flex items-center justify-center overflow-hidden my-4">
            <OptimizedImage 
              src={images[selectedImageIndex] || images[0]} 
              alt={product.name}
              className="max-h-full max-w-full object-contain transition-transform duration-200 rounded-2xl shadow-2xl"
              style={{ transform: `scale(${lightboxZoomLevel})` }}
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-3 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full cursor-pointer shadow-lg"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full cursor-pointer shadow-lg"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnails Strip */}
          {images.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    selectedImageIndex === idx ? 'border-indigo-500 scale-105 ring-2 ring-indigo-500/50' : 'border-slate-800 opacity-50'
                  }`}
                >
                  <OptimizedImage src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Restock Notification Modal Popup */}
      {isNotifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 relative animate-scale-up">
            <button
              type="button"
              onClick={() => setIsNotifyModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Restock Notification</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {product?.name} {selectedColor && selectedSize ? `(${selectedColor} / Size ${selectedSize})` : ''}
                </p>
              </div>
            </div>

            {notifySuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-semibold flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{notifySuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleNotifySubmit} className="space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter your email address to receive an instant alert when this combination becomes available.
                </p>

                {notifyErrorMsg && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium">
                    {notifyErrorMsg}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    required
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNotifyModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isNotifySubmitting}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {isNotifySubmitting ? (
                      <span>Subscribing...</span>
                    ) : (
                      <>
                        <Bell className="w-3.5 h-3.5 text-amber-300" />
                        <span>Notify Me</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
