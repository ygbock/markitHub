import {
  collection,
  collectionGroup,
  getDocs,
  limit as firestoreLimit,
  query,
  where,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Business, BusinessListing, BusinessLocation, Category, Product } from '../types';
import type {
  DiscoveryBusiness,
  DiscoveryCategory,
  DiscoveryFilters,
  DiscoveryProduct,
  DiscoveryQuery,
  DiscoveryRepository,
  DiscoverySearchResult,
  DiscoveryService,
  UnifiedDiscoveryResults,
  DiscoveryLocation,
} from './types';

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

function boundedLimit(value?: number): number {
  return Math.min(Math.max(value ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
}

function textMatches(value: unknown, text?: string): boolean {
  if (!text) return true;
  const needle = text.trim().toLowerCase();
  if (!needle) return true;
  return String(value ?? '').toLowerCase().includes(needle);
}

function arrayMatches(values: unknown, text?: string): boolean {
  if (!text) return true;
  return Array.isArray(values) && values.some(value => textMatches(value, text));
}

function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const toRad = (v: number) => v * Math.PI / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function normalizeLocation(raw: Partial<BusinessLocation> & Record<string, unknown>): DiscoveryLocation {
  return {
    id: raw.id,
    businessId: raw.businessId,
    tenantId: raw.tenantId ?? null,
    name: raw.name,
    addressLine1: raw.addressLine1,
    city: raw.city,
    country: raw.country,
    geo: raw.geo && typeof raw.geo === 'object'
      ? {
          latitude: Number((raw.geo as Record<string, unknown>).latitude),
          longitude: Number((raw.geo as Record<string, unknown>).longitude),
        }
      : undefined,
    phone: raw.phone,
    isActive: raw.isActive,
  };
}

function normalizeBusiness(raw: Business & Record<string, unknown>): DiscoveryBusiness | null {
  const listing = raw.listing;
  if (!listing || listing.isPublished !== true || raw.status !== 'active') return null;

  const locations = Array.isArray(raw.locations)
    ? raw.locations.filter((location): location is BusinessLocation => !!location && location.isActive !== false).map(normalizeLocation)
    : [];

  return {
    id: raw.id,
    slug: listing.slug || raw.id,
    name: raw.tradingName || raw.legalName,
    headline: listing.headline || '',
    description: listing.description || '',
    categories: listing.categories || [],
    tags: listing.tags || [],
    logoUrl: listing.logoUrl,
    bannerUrl: listing.bannerUrl,
    ratingAverage: Number(listing.ratingAverage || 0),
    reviewCount: Number(listing.reviewCount || 0),
    isFeatured: listing.isFeatured === true,
    isVerified: raw.verificationStatus === 'verified',
    isPublished: listing.isPublished === true,
    isTenant: Array.isArray(raw.tenantIds) && raw.tenantIds.length > 0,
    locations,
  };
}

function normalizeProduct(raw: Product & Record<string, unknown>, id: string): DiscoveryProduct | null {
  const ecommerce = raw.ecommerce;
  const published = ecommerce?.published === true || ecommerce?.storefrontStatus === 'Published';
  const status = raw.status ?? 'Active';
  if (!published || status !== 'Active') return null;

  const available = raw.available ?? raw.onHand ?? raw.stock ?? 0;
  return {
    id,
    name: raw.name,
    slug: ecommerce?.slug,
    description: raw.description,
    category: ecommerce?.category || raw.category,
    tags: raw.tags || [],
    brand: raw.brand,
    price: Number(raw.price || 0),
    originalPrice: raw.originalPrice,
    currency: undefined,
    imageUrl: raw.imageUrl,
    rating: raw.rating,
    reviewCount: raw.reviewCount,
    available: Number(available) > 0 || raw.allowBackorder === true,
    published,
    featured: raw.isFeatured === true || ecommerce?.featured === true,
  };
}

function normalizeService(raw: DocumentData, id: string): DiscoveryService | null {
  if (raw.published === false || raw.status === 'inactive' || raw.status === 'archived') return null;
  if (raw.isPublished === false) return null;
  return {
    id,
    tenantId: raw.tenantId,
    businessId: raw.businessId,
    name: String(raw.name || ''),
    slug: raw.slug,
    description: String(raw.description || ''),
    category: raw.category,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    price: raw.price == null ? undefined : Number(raw.price),
    currency: raw.currency,
    durationMinutes: raw.durationMinutes == null ? undefined : Number(raw.durationMinutes),
    imageUrl: raw.imageUrl,
    rating: raw.rating == null ? undefined : Number(raw.rating),
    reviewCount: raw.reviewCount == null ? undefined : Number(raw.reviewCount),
    published: true,
    bookingEnabled: raw.bookingEnabled !== false,
  };
}

function matchesBusiness(item: DiscoveryBusiness, filters: DiscoveryFilters = {}): boolean {
  if (!textMatches(item.name, filters.text) && !textMatches(item.description, filters.text) &&
      !textMatches(item.headline, filters.text) && !arrayMatches(item.tags, filters.text) &&
      !arrayMatches(item.categories, filters.text)) return false;
  if (filters.categorySlug && !item.categories.includes(filters.categorySlug)) return false;
  if (filters.businessId && item.id !== filters.businessId) return false;
  if (filters.verifiedOnly && !item.isVerified) return false;
  if (filters.featuredOnly && !item.isFeatured) return false;
  if (filters.openNow && !item.locations.some(l => l.isOpenNow === true)) return false;
  if (filters.latitude != null && filters.longitude != null) {
    const radius = filters.radiusKm ?? 25;
    const nearby = item.locations.some(l => l.geo && distanceKm({ latitude: filters.latitude!, longitude: filters.longitude! }, l.geo) <= radius);
    if (!nearby) return false;
  }
  return true;
}

function matchesProduct(item: DiscoveryProduct, filters: DiscoveryFilters = {}): boolean {
  if (!textMatches(item.name, filters.text) && !textMatches(item.description, filters.text) &&
      !textMatches(item.brand, filters.text) && !arrayMatches(item.tags, filters.text)) return false;
  if (filters.categorySlug && item.category !== filters.categorySlug) return false;
  if (filters.tenantId && item.tenantId !== filters.tenantId) return false;
  if (filters.businessId && item.businessId !== filters.businessId) return false;
  if (filters.availableOnly && !item.available) return false;
  if (filters.minPrice != null && item.price < filters.minPrice) return false;
  if (filters.maxPrice != null && item.price > filters.maxPrice) return false;
  if (filters.featuredOnly && !item.featured) return false;
  return true;
}

function matchesService(item: DiscoveryService, filters: DiscoveryFilters = {}): boolean {
  if (!textMatches(item.name, filters.text) && !textMatches(item.description, filters.text) &&
      !textMatches(item.category, filters.text) && !arrayMatches(item.tags, filters.text)) return false;
  if (filters.categorySlug && item.category !== filters.categorySlug) return false;
  if (filters.tenantId && item.tenantId !== filters.tenantId) return false;
  if (filters.businessId && item.businessId !== filters.businessId) return false;
  if (filters.minPrice != null && (item.price == null || item.price < filters.minPrice)) return false;
  if (filters.maxPrice != null && (item.price == null || item.price > filters.maxPrice)) return false;
  return true;
}

function matchesCategory(item: DiscoveryCategory, filters: DiscoveryFilters = {}): boolean {
  return textMatches(item.name, filters.text) || textMatches(item.slug, filters.text) || textMatches(item.description, filters.text);
}

function sortBusinesses(items: DiscoveryBusiness[], queryOptions: DiscoveryQuery): DiscoveryBusiness[] {
  const filters = queryOptions.filters || {};
  const origin = filters.latitude != null && filters.longitude != null
    ? { latitude: filters.latitude, longitude: filters.longitude }
    : null;
  const withDistance = (item: DiscoveryBusiness) => {
    if (!origin) return Number.POSITIVE_INFINITY;
    const distances = item.locations.filter(l => l.geo).map(l => distanceKm(origin, l.geo!));
    return distances.length ? Math.min(...distances) : Number.POSITIVE_INFINITY;
  };
  return [...items].sort((a, b) => {
    switch (queryOptions.sort) {
      case 'name': return a.name.localeCompare(b.name);
      case 'distance': return withDistance(a) - withDistance(b);
      case 'rating': return b.ratingAverage - a.ratingAverage || b.reviewCount - a.reviewCount;
      default: return Number(b.isFeatured) - Number(a.isFeatured) || b.ratingAverage - a.ratingAverage || a.name.localeCompare(b.name);
    }
  });
}

function paginate<T>(items: T[], queryOptions: DiscoveryQuery = {}): DiscoverySearchResult<T> {
  const offset = Math.max(queryOptions.offset ?? 0, 0);
  const take = boundedLimit(queryOptions.limit);
  const page = items.slice(offset, offset + take);
  return { items: page, total: items.length, hasMore: offset + take < items.length };
}

function constraintsForPublicCollection(limit: number): QueryConstraint[] {
  return [firestoreLimit(Math.min(limit * 3, MAX_LIMIT))];
}

/**
 * Phase 3A Firestore read layer.
 *
 * Public discovery is read-only and normalizes platform records into a stable
 * model. The repository deliberately does not write or mutate tenant data.
 *
 * Search/index optimization is deferred to Phase 3E; this bounded read layer
 * provides the canonical contract and visibility rules that later indexing can
 * implement without changing consumers.
 */
export class FirestoreDiscoveryRepository implements DiscoveryRepository {
  async listBusinesses(queryOptions: DiscoveryQuery = {}): Promise<DiscoverySearchResult<DiscoveryBusiness>> {
    const take = boundedLimit(queryOptions.limit);
    const snapshot = await getDocs(query(collection(db, 'businesses'), where('status', '==', 'active'), ...constraintsForPublicCollection(take)));
    const items = sortBusinesses(snapshot.docs
      .map(docSnap => normalizeBusiness({ id: docSnap.id, ...docSnap.data() } as Business & Record<string, unknown>))
      .filter((item): item is DiscoveryBusiness => item !== null)
      .filter(item => matchesBusiness(item, queryOptions.filters)), queryOptions);
    return paginate(items, queryOptions);
  }

  async getBusinessById(id: string): Promise<DiscoveryBusiness | null> {
    const result = await this.listBusinesses({ limit: MAX_LIMIT, filters: { businessId: id } });
    return result.items[0] || null;
  }

  async getBusinessBySlug(slug: string): Promise<DiscoveryBusiness | null> {
    const normalizedSlug = slug.trim().toLowerCase();
    if (!normalizedSlug) return null;
    const snapshot = await getDocs(query(
      collection(db, 'businesses'),
      where('status', '==', 'active'),
      where('listing.slug', '==', normalizedSlug),
      firestoreLimit(3),
    ));
    for (const docSnap of snapshot.docs) {
      const item = normalizeBusiness({ id: docSnap.id, ...docSnap.data() } as Business & Record<string, unknown>);
      if (item) return item;
    }
    return null;
  }

  async listProducts(queryOptions: DiscoveryQuery = {}): Promise<DiscoverySearchResult<DiscoveryProduct>> {
    const take = boundedLimit(queryOptions.limit);
    const snapshot = await getDocs(query(collectionGroup(db, 'products'), ...constraintsForPublicCollection(take)));
    const items = snapshot.docs
      .map(docSnap => normalizeProduct({ id: docSnap.id, ...docSnap.data() } as Product & Record<string, unknown>, docSnap.id))
      .filter((item): item is DiscoveryProduct => item !== null)
      .filter(item => matchesProduct(item, queryOptions.filters));
    return paginate(items, queryOptions);
  }

  async listServices(queryOptions: DiscoveryQuery = {}): Promise<DiscoverySearchResult<DiscoveryService>> {
    const take = boundedLimit(queryOptions.limit);
    const snapshot = await getDocs(query(collectionGroup(db, 'services'), ...constraintsForPublicCollection(take)));
    const items = snapshot.docs
      .map(docSnap => normalizeService(docSnap.data(), docSnap.id))
      .filter((item): item is DiscoveryService => item !== null)
      .filter(item => matchesService(item, queryOptions.filters));
    return paginate(items, queryOptions);
  }

  async listCategories(queryOptions: DiscoveryQuery = {}): Promise<DiscoverySearchResult<DiscoveryCategory>> {
    const take = boundedLimit(queryOptions.limit);
    const snapshot = await getDocs(query(collection(db, 'categories'), where('status', '==', 'active'), ...constraintsForPublicCollection(take)));
    const items = snapshot.docs.map(docSnap => {
      const raw = docSnap.data() as Category;
      return {
        id: docSnap.id,
        name: raw.name,
        slug: raw.slug || docSnap.id,
        description: raw.description,
        image: raw.image,
        icon: raw.icon,
        parentId: raw.parent_id ?? null,
        sortOrder: Number(raw.sort_order ?? 0),
        status: raw.status === 'inactive' ? 'inactive' : 'active',
      } satisfies DiscoveryCategory;
    }).filter(item => matchesCategory(item, queryOptions.filters));
    items.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    return paginate(items, queryOptions);
  }

  async search(queryOptions: DiscoveryQuery = {}): Promise<UnifiedDiscoveryResults> {
    const types = queryOptions.types ?? ['business', 'product', 'service', 'category'];
    const [businesses, products, services, categories] = await Promise.all([
      types.includes('business') ? this.listBusinesses(queryOptions) : Promise.resolve({ items: [], total: 0, hasMore: false }),
      types.includes('product') ? this.listProducts(queryOptions) : Promise.resolve({ items: [], total: 0, hasMore: false }),
      types.includes('service') ? this.listServices(queryOptions) : Promise.resolve({ items: [], total: 0, hasMore: false }),
      types.includes('category') ? this.listCategories(queryOptions) : Promise.resolve({ items: [], total: 0, hasMore: false }),
    ]);
    return { businesses, products, services, categories };
  }
}

export const discoveryRepository: DiscoveryRepository = new FirestoreDiscoveryRepository();

export { distanceKm };
