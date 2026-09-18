import type { Business, BusinessListing, BusinessLocation, Category, Product } from '../types';

export type DiscoveryEntityType = 'business' | 'product' | 'service' | 'category';

export interface DiscoveryGeoPoint {
  latitude: number;
  longitude: number;
}

export interface DiscoveryLocation {
  id?: string;
  businessId?: string;
  tenantId?: string | null;
  name?: string;
  addressLine1?: string;
  city?: string;
  country?: string;
  geo?: DiscoveryGeoPoint;
  phone?: string;
  isActive?: boolean;
  isOpenNow?: boolean;
}

export interface DiscoveryBusiness {
  id: string;
  slug: string;
  name: string;
  headline: string;
  description: string;
  categories: string[];
  tags: string[];
  logoUrl?: string;
  bannerUrl?: string;
  ratingAverage: number;
  reviewCount: number;
  isFeatured: boolean;
  isVerified: boolean;
  isPublished: boolean;
  isTenant: boolean;
  tenantSlug?: string;
  locations: DiscoveryLocation[];
}

export interface DiscoveryProduct {
  id: string;
  tenantId?: string;
  businessId?: string;
  name: string;
  slug?: string;
  description?: string;
  category?: string;
  tags: string[];
  brand?: string;
  price: number;
  originalPrice?: number;
  currency?: string;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  available: boolean;
  published: boolean;
  featured: boolean;
}

export interface DiscoveryService {
  id: string;
  tenantId?: string;
  businessId?: string;
  name: string;
  slug?: string;
  description: string;
  category?: string;
  tags: string[];
  price?: number;
  currency?: string;
  durationMinutes?: number;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  published: boolean;
  bookingEnabled: boolean;
}

export interface DiscoveryCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  icon?: string;
  parentId?: string | null;
  sortOrder: number;
  status: 'active' | 'inactive';
}

export interface DiscoveryFilters {
  text?: string;
  categorySlug?: string;
  businessId?: string;
  tenantId?: string;
  verifiedOnly?: boolean;
  featuredOnly?: boolean;
  openNow?: boolean;
  availableOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

export type DiscoverySort = 'relevance' | 'rating' | 'distance' | 'name';

export interface DiscoveryQuery {
  filters?: DiscoveryFilters;
  limit?: number;
  offset?: number;
  sort?: DiscoverySort;
  types?: DiscoveryEntityType[];
}

export interface DiscoverySearchResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

export interface UnifiedDiscoveryResults {
  businesses: DiscoverySearchResult<DiscoveryBusiness>;
  products: DiscoverySearchResult<DiscoveryProduct>;
  services: DiscoverySearchResult<DiscoveryService>;
  categories: DiscoverySearchResult<DiscoveryCategory>;
}

export interface DiscoveryRepository {
  listBusinesses(query?: DiscoveryQuery): Promise<DiscoverySearchResult<DiscoveryBusiness>>;
  getBusinessById(id: string): Promise<DiscoveryBusiness | null>;
  getBusinessBySlug(slug: string): Promise<DiscoveryBusiness | null>;
  getProductById(id: string): Promise<DiscoveryProduct | null>;
  getProductBySlug(slug: string): Promise<DiscoveryProduct | null>;
  listProducts(query?: DiscoveryQuery): Promise<DiscoverySearchResult<DiscoveryProduct>>;
  listServices(query?: DiscoveryQuery): Promise<DiscoverySearchResult<DiscoveryService>>;
  listCategories(query?: DiscoveryQuery): Promise<DiscoverySearchResult<DiscoveryCategory>>;
  search(query: DiscoveryQuery): Promise<UnifiedDiscoveryResults>;
}

export interface DiscoveryBusinessSource {
  business: Business;
  listing: BusinessListing;
  locations: BusinessLocation[];
}

export interface DiscoveryReadModel {
  businesses: DiscoveryBusiness[];
  products: DiscoveryProduct[];
  services: DiscoveryService[];
  categories: DiscoveryCategory[];
}
