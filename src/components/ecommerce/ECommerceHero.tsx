import React, { useState, useEffect } from 'react';
import { Product, HomepageHeroSlideConfig, Banner, HeroLayoutType } from '../../types';
import { 
  ArrowRight, Sparkles, Clock, ShieldCheck, Truck, RotateCcw, 
  ChevronLeft, ChevronRight, Zap, Flame, Award, Play
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';

interface ECommerceHeroProps {
  onShopCategory: (cat: string) => void;
  onOpenProduct: (product: Product) => void;
  featuredProduct?: Product;
  dealProduct?: Product;
  customSlides?: HomepageHeroSlideConfig[];
  banners?: Banner[];
  layoutType?: HeroLayoutType;
  autoPlay?: boolean;
  autoPlaySpeed?: number;
}

interface NormalizedBannerSlide {
  id: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
  title: string;
  subtitle: string;
  discountText: string;
  ctaText: string;
  ctaUrl: string;
  category: string;
  bgGradient: string;
  imageUrl: string;
  imageDesktopUrl: string;
  imageTabletUrl: string;
  imageMobileUrl: string;
  videoUrl?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

const DEFAULT_HERO_SLIDES: NormalizedBannerSlide[] = [
  {
    id: 'banner-1',
    badge: 'SUMMER COLLECTION 2026',
    badgeBg: 'bg-indigo-500/20',
    badgeText: 'text-indigo-300',
    title: 'Summer Collection — Up to 30% Off',
    subtitle: 'Explore our latest summer release with premium designs, acoustic audio gear, and ergonomic living essential collections.',
    discountText: 'Up to 30% Off Limited Time',
    ctaText: 'Shop Electronics',
    ctaUrl: 'Electronics',
    category: 'Electronics',
    bgGradient: 'from-slate-950 via-slate-900 to-indigo-950',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=1200',
    imageDesktopUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=1200',
    imageTabletUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800',
    imageMobileUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=480',
    status: 'active'
  },
  {
    id: 'banner-2',
    badge: 'ERGONOMIC LIVING',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300',
    title: 'Next-Level Workspace & Task Seating',
    subtitle: 'Synchro-tilt adaptive mesh with 4D armrests designed for 12-hour high performance focus.',
    discountText: 'Free Nationwide Shipping',
    ctaText: 'Shop Home & Living',
    ctaUrl: 'Home & Living',
    category: 'Home & Living',
    bgGradient: 'from-slate-950 via-slate-900 to-emerald-950',
    imageUrl: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&q=80&w=1200',
    imageDesktopUrl: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&q=80&w=1200',
    imageTabletUrl: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&q=80&w=800',
    imageMobileUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=480',
    status: 'active'
  }
];

function extractYouTubeId(url: string): string {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : '';
}

export default function ECommerceHero({
  onShopCategory,
  onOpenProduct,
  featuredProduct,
  dealProduct,
  customSlides,
  banners,
  layoutType = 'carousel',
  autoPlay = true,
  autoPlaySpeed = 6
}: ECommerceHeroProps) {
  const { formatAmount } = useCurrency();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Normalize & filter banners by dates & status
  const todayStr = new Date().toISOString().slice(0, 10);

  const rawList: NormalizedBannerSlide[] = banners && banners.length > 0
    ? banners.map(b => ({
        id: b.id,
        badge: b.badge || 'PROMOTIONAL BANNER',
        badgeBg: b.badgeBg || 'bg-indigo-500/20',
        badgeText: b.badgeText || 'text-indigo-300',
        title: b.title,
        subtitle: b.subtitle || '',
        discountText: b.discountText || 'Featured Promotion',
        ctaText: b.ctaText || 'Explore Now',
        ctaUrl: b.ctaUrl || b.category || 'All',
        category: b.category || 'All',
        bgGradient: b.bgGradient || 'from-slate-950 via-slate-900 to-indigo-950',
        imageUrl: b.imageDesktopUrl,
        imageDesktopUrl: b.imageDesktopUrl,
        imageTabletUrl: b.imageTabletUrl || b.imageDesktopUrl,
        imageMobileUrl: b.imageMobileUrl || b.imageTabletUrl || b.imageDesktopUrl,
        videoUrl: b.videoUrl,
        startDate: b.startDate,
        endDate: b.endDate,
        status: b.status
      }))
    : customSlides && customSlides.length > 0
      ? customSlides.map(cs => ({
          id: cs.id,
          badge: cs.badge || 'PROMOTIONAL RELEASE',
          badgeBg: cs.badgeBg || 'bg-indigo-500/20',
          badgeText: cs.badgeText || 'text-indigo-300',
          title: cs.title,
          subtitle: cs.subtitle,
          discountText: cs.discountText,
          ctaText: cs.ctaText || 'Shop Now',
          ctaUrl: cs.ctaUrl || cs.category || 'All',
          category: cs.category || 'All',
          bgGradient: cs.bgGradient || 'from-slate-950 via-slate-900 to-indigo-950',
          imageUrl: cs.imageDesktopUrl || cs.imageUrl,
          imageDesktopUrl: cs.imageDesktopUrl || cs.imageUrl,
          imageTabletUrl: cs.imageTabletUrl || cs.imageUrl,
          imageMobileUrl: cs.imageMobileUrl || cs.imageUrl,
          videoUrl: cs.videoUrl,
          startDate: cs.startDate,
          endDate: cs.endDate,
          status: cs.status || 'active'
        }))
      : DEFAULT_HERO_SLIDES;

  // Active Date & Status Filtering
  const activeSlides = rawList.filter(s => {
    if (s.status === 'draft') return false;
    if (s.startDate && todayStr < s.startDate) return false;
    if (s.endDate && todayStr > s.endDate) return false;
    return true;
  });

  const displayList = activeSlides.length > 0 ? activeSlides : rawList.slice(0, 1);

  // Live Flash Deal Countdown Timer
  const [timeLeft, setTimeLeft] = useState({
    hours: 14,
    minutes: 42,
    seconds: 19
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Slide Auto-Advance for Carousel mode
  useEffect(() => {
    if (!autoPlay || isPaused || layoutType !== 'carousel' || displayList.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % displayList.length);
    }, autoPlaySpeed * 1000);
    return () => clearInterval(interval);
  }, [autoPlay, isPaused, layoutType, displayList.length, autoPlaySpeed]);

  const activeSlide = displayList[currentSlideIndex] || displayList[0];

  return (
    <section className="space-y-6" id="ecom-hero-section">
      
      {/* 1. Dynamic Interactive Hero Slider & Deal Card Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Banner Container (8 Cols on Desktop) */}
        <div 
          className={`lg:col-span-8 rounded-3xl relative overflow-hidden bg-gradient-to-br ${activeSlide.bgGradient} p-5 sm:p-8 lg:p-10 text-white min-h-[340px] sm:min-h-[400px] lg:min-h-[440px] flex flex-col justify-between shadow-xl transition-all duration-700 select-none`}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          id="hero-banner-carousel"
        >
          {/* Responsive Media Overlay: Video or Picture Element */}
          {activeSlide.videoUrl ? (
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
              {activeSlide.videoUrl.includes('youtube.com') || activeSlide.videoUrl.includes('youtu.be') ? (
                <iframe
                  src={`https://www.youtube.com/embed/${extractYouTubeId(activeSlide.videoUrl)}?autoplay=1&mute=1&controls=0&loop=1&playlist=${extractYouTubeId(activeSlide.videoUrl)}`}
                  className="w-full h-full scale-150 pointer-events-none opacity-40 border-0"
                  allow="autoplay; encrypted-media"
                  title="Hero Background Video"
                />
              ) : (
                <video
                  src={activeSlide.videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover opacity-40"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />
            </div>
          ) : (
            <div className="absolute right-0 bottom-0 top-0 w-full sm:w-3/5 lg:w-1/2 opacity-25 sm:opacity-35 pointer-events-none overflow-hidden z-0">
              <picture className="w-full h-full block">
                {activeSlide.imageDesktopUrl && <source media="(min-width: 1024px)" srcSet={activeSlide.imageDesktopUrl} />}
                {activeSlide.imageTabletUrl && <source media="(min-width: 640px)" srcSet={activeSlide.imageTabletUrl} />}
                <img 
                  src={activeSlide.imageMobileUrl || activeSlide.imageTabletUrl || activeSlide.imageDesktopUrl || activeSlide.imageUrl} 
                  alt={activeSlide.title} 
                  className="w-full h-full object-cover object-center transform scale-105 transition-transform duration-1000"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
              </picture>
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />
            </div>
          )}

          {/* Top content */}
          <div className="space-y-2.5 sm:space-y-4 max-w-xl z-10">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className={`px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider ${activeSlide.badgeBg} ${activeSlide.badgeText} border border-white/10`}>
                {activeSlide.badge}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                {activeSlide.discountText}
              </span>
              {activeSlide.videoUrl && (
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30 flex items-center gap-1">
                  <Play className="w-2.5 h-2.5 fill-current" />
                  <span>Video Banner</span>
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight text-white leading-tight">
              {activeSlide.title}
            </h1>

            {activeSlide.subtitle && (
              <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed max-w-md line-clamp-3 sm:line-clamp-none">
                {activeSlide.subtitle}
              </p>
            )}
          </div>

          {/* Bottom actions & slide controls */}
          <div className="pt-4 sm:pt-6 flex flex-wrap items-center justify-between gap-3 sm:gap-4 z-10">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => onShopCategory(activeSlide.ctaUrl || activeSlide.category)}
                className="px-4 sm:px-5 py-2.5 sm:py-3 bg-white hover:bg-slate-100 text-slate-950 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-white/10 active:scale-95 transition-all cursor-pointer"
                id="btn-hero-cta"
              >
                <span>{activeSlide.ctaText}</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {featuredProduct && (
                <button
                  type="button"
                  onClick={() => onOpenProduct(featuredProduct)}
                  className="px-3.5 sm:px-4 py-2.5 sm:py-3 bg-white/15 hover:bg-white/25 text-white rounded-xl sm:rounded-2xl text-xs font-bold transition-all cursor-pointer backdrop-blur-xs"
                  id="btn-hero-quickview"
                >
                  Quick Specs
                </button>
              )}
            </div>

            {/* Slider Navigation Indicators (Carousel Mode) */}
            {layoutType === 'carousel' && displayList.length > 1 && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setCurrentSlideIndex(prev => (prev - 1 + displayList.length) % displayList.length)}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer"
                  title="Previous Banner"
                  aria-label="Previous Banner"
                >
                  <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                <div className="flex items-center gap-1.5 px-1 sm:px-2">
                  {displayList.map((slide, idx) => (
                    <button
                      key={slide.id}
                      onClick={() => setCurrentSlideIndex(idx)}
                      aria-label={`Go to slide ${idx + 1}`}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        currentSlideIndex === idx ? 'w-5 sm:w-6 bg-white' : 'w-2 bg-white/30'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => setCurrentSlideIndex(prev => (prev + 1) % displayList.length)}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer"
                  title="Next Banner"
                  aria-label="Next Banner"
                >
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Deal of the Day Bento Card (4 Cols on Desktop) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-4" id="deal-of-the-day-bento">
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-500" />
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Flash Deal of the Day
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                -22% OFF
              </span>
            </div>

            {/* Countdown timer */}
            <div className="bg-slate-900 text-white rounded-2xl p-3 flex items-center justify-between" id="flash-deal-countdown">
              <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Ends In:</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-xs font-bold text-amber-300">
                <span className="px-1.5 py-0.5 bg-slate-800 rounded">{String(timeLeft.hours).padStart(2, '0')}h</span>
                <span>:</span>
                <span className="px-1.5 py-0.5 bg-slate-800 rounded">{String(timeLeft.minutes).padStart(2, '0')}m</span>
                <span>:</span>
                <span className="px-1.5 py-0.5 bg-slate-800 rounded">{String(timeLeft.seconds).padStart(2, '0')}s</span>
              </div>
            </div>

            {/* Deal product spotlight */}
            {dealProduct && (
              <div 
                onClick={() => onOpenProduct(dealProduct)}
                className="group cursor-pointer pt-2 flex items-center gap-3 bg-slate-50 hover:bg-slate-100/80 p-3 rounded-2xl border border-slate-150 transition-all"
                id="deal-product-spotlight"
              >
                <img 
                  src={dealProduct.imageUrl} 
                  alt={dealProduct.name}
                  className="w-16 h-16 object-cover rounded-xl border border-slate-200 group-hover:scale-105 transition-transform"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase block">{dealProduct.brand || dealProduct.category}</span>
                  <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                    {dealProduct.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-black text-slate-900 font-mono">
                      {formatAmount(dealProduct.price)}
                    </span>
                    {dealProduct.originalPrice && (
                      <span className="text-xs text-slate-400 line-through font-mono">
                        {formatAmount(dealProduct.originalPrice)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Stock Velocity</span>
              <span className="font-bold text-emerald-600 font-mono">82% Claimed</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-rose-500 h-full w-[82%] rounded-full" />
            </div>

            {dealProduct && (
              <button
                type="button"
                onClick={() => onOpenProduct(dealProduct)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                id="btn-claim-deal"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Claim Flash Deal Now</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Value Proposition Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-1" id="ecom-value-props">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Express Delivery</h4>
            <p className="text-[11px] text-slate-500">Free nationwide over $150</p>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">2-Year Warranty</h4>
            <p className="text-[11px] text-slate-500">Comprehensive coverage</p>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">30-Day Free Returns</h4>
            <p className="text-[11px] text-slate-500">No questions asked return</p>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">PCI-DSS Certified</h4>
            <p className="text-[11px] text-slate-500">100% Encrypted checkouts</p>
          </div>
        </div>
      </div>
    </section>
  );
}
