import { StorefrontHomepageConfig } from '../types';

export const DEFAULT_HOMEPAGE_CONFIG: StorefrontHomepageConfig = {
  lastUpdated: new Date().toISOString(),
  storeName: 'Nexus Storefront',
  heroAnnouncementText: 'Use coupon COUPON_15 for 15% off cart orders!',
  sections: [
    {
      id: 'section-hero',
      type: 'hero_banner',
      enabled: true,
      status: 'active',
      displayOrder: 1,
      title: 'Main Hero Carousel & Banners',
      layoutType: 'carousel',
      autoPlay: true,
      autoPlaySpeed: 5,
      banners: [
        {
          id: 'banner-1',
          title: 'Summer Collection — Up to 30% Off',
          subtitle: 'Explore our latest summer release with premium audio gear, acoustic headphones, and ergonomic lifestyle essentials.',
          badge: 'SUMMER COLLECTION 2026',
          badgeBg: 'bg-indigo-500/20',
          badgeText: 'text-indigo-300',
          discountText: 'Up to 30% Off Limited Time',
          imageDesktopUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=1200',
          imageTabletUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800',
          imageMobileUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=480',
          videoUrl: '',
          ctaText: 'Shop Electronics',
          ctaUrl: 'Electronics',
          displayOrder: 1,
          status: 'active',
          bgGradient: 'from-slate-950 via-slate-900 to-indigo-950',
          category: 'Electronics'
        },
        {
          id: 'banner-2',
          title: 'Next-Level Workspace & Ergonomic Task Seating',
          subtitle: 'Synchro-tilt adaptive mesh with 4D armrests designed for 12-hour high performance focus.',
          badge: 'ERGONOMIC LIVING',
          badgeBg: 'bg-emerald-500/20',
          badgeText: 'text-emerald-300',
          discountText: 'Free Nationwide Shipping',
          imageDesktopUrl: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&q=80&w=1200',
          imageTabletUrl: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&q=80&w=800',
          imageMobileUrl: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&q=80&w=480',
          videoUrl: '',
          ctaText: 'Shop Home & Living',
          ctaUrl: 'Home & Living',
          displayOrder: 2,
          status: 'active',
          bgGradient: 'from-slate-950 via-slate-900 to-emerald-950',
          category: 'Home & Living'
        },
        {
          id: 'banner-3',
          title: 'Cinematic High-Definition Showcase',
          subtitle: 'Experience dynamic motion background hero banners with ambient 4K video playback.',
          badge: 'VIDEO HERO FEATURE',
          badgeBg: 'bg-amber-500/20',
          badgeText: 'text-amber-300',
          discountText: 'HD Video Campaign',
          imageDesktopUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=1200',
          imageTabletUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800',
          imageMobileUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=480',
          videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-headphones-on-a-table-41561-large.mp4',
          ctaText: 'Explore Gear',
          ctaUrl: 'Electronics',
          displayOrder: 3,
          status: 'active',
          bgGradient: 'from-slate-950 via-slate-900 to-amber-950',
          category: 'Electronics'
        }
      ],
      heroSlides: [
        {
          id: 'slide-1',
          badge: 'SUMMER COLLECTION 2026',
          badgeBg: 'bg-indigo-500/20',
          badgeText: 'text-indigo-300',
          title: 'Summer Collection — Up to 30% Off',
          subtitle: 'Explore our latest summer release with premium designs, acoustic audio gear, and ergonomic living essential collections.',
          discountText: 'Up to 30% Off Limited Time',
          ctaText: 'Shop Now',
          category: 'Electronics',
          bgGradient: 'from-slate-950 via-slate-900 to-indigo-950',
          imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800',
          imageDesktopUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=1200',
          imageTabletUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800',
          imageMobileUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=480',
          displayOrder: 1,
          status: 'active'
        }
      ]
    },
    {
      id: 'section-categories',
      type: 'categories',
      enabled: true,
      status: 'active',
      displayOrder: 2,
      title: 'Categories',
      subtitle: 'Explore items by department'
    },
    {
      id: 'section-back-to-school',
      type: 'custom_campaign',
      enabled: true,
      status: 'active',
      displayOrder: 3,
      title: 'Back to School',
      subtitle: 'Gear up for the new semester with essential backpacks, tech & stationeries',
      bannerUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=1200',
      buttonText: 'Shop Back to School',
      buttonUrl: 'Electronics',
      selectedProductIds: ['PROD-101', 'PROD-102', 'PROD-103', 'PROD-104'],
      maxItems: 4
    },
    {
      id: 'section-featured',
      type: 'featured_products',
      enabled: true,
      status: 'active',
      displayOrder: 4,
      title: 'Featured Products',
      subtitle: "Editor's Choice & Premium Selections",
      maxItems: 4
    },
    {
      id: 'section-promo-banner',
      type: 'promotional_banner',
      enabled: true,
      status: 'active',
      displayOrder: 5,
      title: 'Promotional Banner',
      promoBannerConfig: {
        headline: 'Exclusive Member Summer Discount',
        subtext: 'Get 15% OFF your entire order with coupon code COUPON_15 at checkout!',
        couponCode: 'COUPON_15',
        discountText: '15% OFF',
        buttonText: 'Claim 15% Off Code'
      }
    },
    {
      id: 'section-new-arrivals',
      type: 'new_arrivals',
      enabled: true,
      status: 'active',
      displayOrder: 6,
      title: 'New Arrivals',
      subtitle: 'Just dropped & fresh additions',
      maxItems: 4
    },
    {
      id: 'section-best-sellers',
      type: 'best_sellers',
      enabled: true,
      status: 'active',
      displayOrder: 7,
      title: 'Best Sellers',
      subtitle: 'Most popular customer favorites',
      maxItems: 4
    },
    {
      id: 'section-brands',
      type: 'brands',
      enabled: true,
      status: 'active',
      displayOrder: 8,
      title: 'Brands',
      subtitle: 'Authorized official partner brands'
    },
    {
      id: 'section-recommended',
      type: 'recommended',
      enabled: true,
      status: 'active',
      displayOrder: 9,
      title: 'Recommended For You',
      subtitle: 'Handpicked products tailored for your taste',
      maxItems: 4
    }
  ]
};
