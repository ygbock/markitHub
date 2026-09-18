import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  query,
  where,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Business, BusinessLocation, Category, Product } from '../types';
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

function normalizeFilters(filters: DiscoveryFilters = {}): DiscoveryFilters {
  const normalized: DiscoveryFilters = { ...filters };
  if (normalized.text != null) normalized.text = normalized.text.trim() || undefined;
  if (normalized.categorySlug != null) normalized.categorySlug = normalized.categorySlug.trim().toLowerCase() || undefined;
  if (normalized.businessId != null) normalized.businessId = normalized.businessId.trim() || undefined;
  if (normalized.tenantId != null) normalized.tenantId = normalized.tenantId.trim() || undefined;

  if (normalized.minPrice != null && (!Number.isFinite(normalized.minPrice) || normalized.minPrice < 0)) normalized.minPrice = undefined;
  if (normalized.maxPrice != null && (!Number.isFinite(normalized.maxPrice) || normalized.maxPrice < 0)) normalized.maxPrice = undefined;
  if (normalized.minPrice != null && normalized.maxPrice != null && normalized.minPrice > normalized.maxPrice) {
    [normalized.minPrice, normalized.maxPrice] = [normalized.maxPrice, normalized.minPrice];
  }

  const validCoordinate = (value: number | undefined) => value != null && Number.isFinite(value);
  if (!validCoordinate(normalized.latitude) || !validCoordinate(normalized.longitude) ||
      normalized.latitude! < -90 || normalized.latitude! > 90 ||
      normalized.longitude! < -180 || normalized.longitude! > 180) {
    normalized.latitude = undefined;
    normalized.longitude = undefined;
  }
  if (normalized.radiusKm != null) {
    normalized.radiusKm = Number.isFinite(normalized.radiusKm)
      ? Math.min(Math.max(normalized.radiusKm, 1), 100)
      : undefined;
  }
  return normalized;
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

export function parseOperatingHours(value: unknown): { open: number; close: number } | null {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(?:-|–|—)\s*(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const open = Number(match[1]) * 60 + Number(match[2]);
  const close = Number(match[3]) * 60 + Number(match[4]);
  if (open > 1439 || close > 1439 || open === close) return null;
  return { open, close };
}

export function computeOpenNow(operatingHours: unknown, now = new Date()): boolean | undefined {
  if (!operatingHours || typeof operatingHours !== 'object' || Array.isArray(operatingHours)) return undefined;
  const hours = operatingHours as Record<string, unknown>;
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = dayNames[now.getDay()];
  const range = parseOperatingHours(hours[today] ?? hours[today.slice(0, 3)]);
  if (!range) return undefined;
  const minutes = now.getHours() * 60 + now.getMinutes();
  return range.open < range.close
    ? minutes >= range.open && minutes < range.close
    : minutes >= range.open || minutes < range.close;
}

export function normalizeDiscoveryLocation(raw: Partial<BusinessLocation> & { [key: string]: any }): DiscoveryLocation {
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
    isOpenNow: typeof raw.isOpenNow === 'boolean' ? raw.isOpenNow : computeOpenNow(raw.operatingHours),
  };
}

function normalizeBusiness(raw: Business & Record<string, unknown>): DiscoveryBusiness | null {
  const listing = raw.listing;
  if (!listing || listing.isPublished !== true || raw.status !== 'active') return null;

  const locations = Array.isArray(raw.locations)
    ? raw.locations.filter((location): location is BusinessLocation => !!location && location.isActive !== false).map(normalizeDiscoveryLocation)
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

function normalizeProduct(raw: Product & Record<string, unknown>, id: string, tenantId?: string): DiscoveryProduct | null {
  const ecommerce = raw.ecommerce;
  const published = ecommerce?.published === true || ecommerce?.storefrontStatus === 'Published';
  const status = raw.status ?? 'Active';
  if (!published || status !== 'Active') return null;
  // An explicitly disabled website target overrides a generic published flag.
  if (ecommerce?.publishTargets?.website === false) return null;

  const variantAvailability = Array.isArray(raw.variants)
    ? raw.variants.some(variant => Number(variant.available ?? variant.onHand ?? variant.stock ?? 0) > 0 || variant.allowBackorder === true)
    : false;
  const available = raw.available ?? raw.onHand ?? raw.stock ?? 0;
  return {
    id,
    tenantId: tenantId || (raw as Record<string, unknown>).tenantId as string | undefined,
    businessId: (raw as Record<string, unknown>).businessId as string | undefined,
    name: raw.name,
    slug: ecommerce?.slug,
    description: raw.description,
    category: ecommerce?.category || raw.category,
    tags: raw.tags || [],
    brand: raw.brand,
    price: Number(raw.price || 0),
    originalPrice: raw.originalPrice,
    currency: (raw as Record<string, unknown>).currency as string | undefined,
    imageUrl: raw.imageUrl,
    rating: raw.rating,
    reviewCount: raw.reviewCount,
    available: Number(available) > 0 || variantAvailability || raw.allowBackorder === true,
    published,
    featured: raw.isFeatured === true || ecommerce?.featured === true,
  };
}

function normalizeService(raw: DocumentData, id: string, tenantId?: string): DiscoveryService | null {
  const status = String(raw.status ?? 'active').toLowerCase();
  const published = raw.published === true || raw.isPublished === true || raw.storefrontStatus === 'Published';
  if (!published || ['inactive', 'archived', 'suspended', 'draft'].includes(status)) return null;
  if (raw.publishTargets?.website === false) return null;
  return {
    id,
    tenantId: tenantId || raw.tenantId,
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

function matchesBusiness(item: DiscoveryBusiness, rawFilters: DiscoveryFilters = {}): boolean {
  const filters = normalizeFilters(rawFilters);
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

function matchesProduct(item: DiscoveryProduct, rawFilters: DiscoveryFilters = {}): boolean {
  const filters = normalizeFilters(rawFilters);
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

function matchesService(item: DiscoveryService, rawFilters: DiscoveryFilters = {}): boolean {
  const filters = normalizeFilters(rawFilters);
  if (!textMatches(item.name, filters.text) && !textMatches(item.description, filters.text) &&
      !textMatches(item.category, filters.text) && !arrayMatches(item.tags, filters.text)) return false;
  if (filters.categorySlug && item.category !== filters.categorySlug) return false;
  if (filters.tenantId && item.tenantId !== filters.tenantId) return false;
  if (filters.businessId && item.businessId !== filters.businessId) return false;
  if (filters.minPrice != null && (item.price == null || item.price < filters.minPrice)) return false;
  if (filters.maxPrice != null && (item.price == null || item.price > filters.maxPrice)) return false;
  return true;
}

function matchesCategory(item: DiscoveryCategory, rawFilters: DiscoveryFilters = {}): boolean {
  const filters = normalizeFilters(rawFilters);
  if (filters.categorySlug && item.slug !== filters.categorySlug) return false;
  return !filters.text || textMatches(item.name, filters.text) || textMatches(item.slug, filters.text) || textMatches(item.description, filters.text);
}

function sortBusinesses(items: DiscoveryBusiness[], queryOptions: DiscoveryQuery): DiscoveryBusiness[] {
  const filters = normalizeFilters(queryOptions.filters || {});
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

function searchScore(value: unknown, queryText: string): number {
  const haystack = String(value ?? '').trim().toLowerCase();
  const needle = queryText.trim().toLowerCase();
  if (!haystack || !needle) return 0;
  if (haystack === needle) return 100;
  if (haystack.startsWith(needle)) return 75;
  if (haystack.includes(needle)) return 45;
  const tokens = needle.split(/\\s+/).filter(Boolean);
  const matched = tokens.filter(token => haystack.includes(token)).length;
  return tokens.length ? (matched / tokens.length) * 25 : 0;
}

function scoreDiscoveryItem(type: 'business' | 'product' | 'service' | 'category', item: any, queryText: string): number {
  if (!queryText.trim()) return 0;
  switch (type) {
    case 'business':
      return Math.max(
        searchScore(item.name, queryText) + 8,
        searchScore(item.headline, queryText) + 5,
        searchScore(item.categories, queryText),
        searchScore(item.tags, queryText),
      ) + (item.isVerified ? 1 : 0) + (item.isFeatured ? 1 : 0);
    case 'product':
      return Math.max(
        searchScore(item.name, queryText) + 8,
        searchScore(item.brand, queryText) + 5,
        searchScore(item.category, queryText),
        searchScore(item.tags, queryText),
        searchScore(item.description, queryText),
      ) + (item.featured ? 1 : 0);
    case 'service':
      return Math.max(
        searchScore(item.name, queryText) + 8,
        searchScore(item.category, queryText),
        searchScore(item.tags, queryText),
        searchScore(item.description, queryText),
      );
    case 'category':
      return Math.max(
        searchScore(item.name, queryText) + 8,
        searchScore(item.slug, queryText) + 5,
        searchScore(item.description, queryText),
      );
  }
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
    const normalizedQuery = { ...queryOptions, filters: normalizeFilters(queryOptions.filters) };
    const snapshot = await getDocs(query(collection(db, 'businesses'), where('status', '==', 'active'), ...constraintsForPublicCollection(take)));
    const items = sortBusinesses(snapshot.docs
      .map(docSnap => normalizeBusiness({ id: docSnap.id, ...docSnap.data() } as Business & Record<string, unknown>))
      .filter((item): item is DiscoveryBusiness => item !== null)
      .filter(item => matchesBusiness(item, normalizedQuery.filters)), normalizedQuery);
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

  async getProductById(id: string): Promise<DiscoveryProduct | null> {
    const clean = id.trim();
    if (!clean) return null;
    const topLevel = await getDoc(doc(db, 'products', clean));
    if (topLevel.exists()) {
      return normalizeProduct({ id: topLevel.id, ...topLevel.data() } as Product & Record<string, unknown>, topLevel.id);
    }
    const snapshot = await getDocs(query(collectionGroup(db, 'products'), firestoreLimit(100)));
    for (const docSnap of snapshot.docs) {
      if (docSnap.id !== clean) continue;
      const tenantId = docSnap.ref.parent.parent?.id;
      const item = normalizeProduct({ id: docSnap.id, ...docSnap.data() } as Product & Record<string, unknown>, docSnap.id, tenantId);
      if (item) return item;
    }
    return null;
  }

  async getProductBySlug(slug: string): Promise<DiscoveryProduct | null> {
    const normalizedSlug = slug.trim().toLowerCase();
    if (!normalizedSlug) return null;
    const snapshot = await getDocs(query(
      collectionGroup(db, 'products'),
      where('ecommerce.slug', '==', normalizedSlug),
      firestoreLimit(3),
    ));
    for (const docSnap of snapshot.docs) {
      const tenantId = docSnap.ref.parent.parent?.id;
      const item = normalizeProduct({ id: docSnap.id, ...docSnap.data() } as Product & Record<string, unknown>, docSnap.id, tenantId);
      if (item) return item;
    }
    return null;
  }

  async listProducts(queryOptions: DiscoveryQuery = {}): Promise<DiscoverySearchResult<DiscoveryProduct>> {
    const take = boundedLimit(queryOptions.limit);
    const normalizedQuery = { ...queryOptions, filters: normalizeFilters(queryOptions.filters) };
    const snapshot = await getDocs(query(collectionGroup(db, 'products'), ...constraintsForPublicCollection(take)));
    const items = snapshot.docs
      .map(docSnap => normalizeProduct({ id: docSnap.id, ...docSnap.data() } as Product & Record<string, unknown>, docSnap.id, docSnap.ref.parent.parent?.id))
      .filter((item): item is DiscoveryProduct => item !== null)
      .filter(item => matchesProduct(item, normalizedQuery.filters));
    return paginate(items, normalizedQuery);
  }

  async getServiceById(id: string): Promise<DiscoveryService | null> {
    const clean = id.trim();
    if (!clean) return null;
    const snapshot = await getDocs(query(collectionGroup(db, 'services'), firestoreLimit(100)));
    for (const docSnap of snapshot.docs) {
      if (docSnap.id !== clean) continue;
      const tenantId = docSnap.ref.parent.parent?.id;
      const item = normalizeService(docSnap.data(), docSnap.id, tenantId);
      if (item) return item;
    }
    return null;
  }

  async getServiceBySlug(slug: string): Promise<DiscoveryService | null> {
    const normalizedSlug = slug.trim().toLowerCase();
    if (!normalizedSlug) return null;
    const snapshot = await getDocs(query(
      collectionGroup(db, 'services'),
      where('slug', '==', normalizedSlug),
      firestoreLimit(3),
    ));
    for (const docSnap of snapshot.docs) {
      const tenantId = docSnap.ref.parent.parent?.id;
      const item = normalizeService(docSnap.data(), docSnap.id, tenantId);
      if (item) return item;
    }
    return null;
  }

  async listServices(queryOptions: DiscoveryQuery = {}): Promise<DiscoverySearchResult<DiscoveryService>> {
    const take = boundedLimit(queryOptions.limit);
    const normalizedQuery = { ...queryOptions, filters: normalizeFilters(queryOptions.filters) };
    const snapshot = await getDocs(query(collectionGroup(db, 'services'), ...constraintsForPublicCollection(take)));
    const items = snapshot.docs
      .map(docSnap => normalizeService(docSnap.data(), docSnap.id, docSnap.ref.parent.parent?.id))
      .filter((item): item is DiscoveryService => item !== null)
      .filter(item => matchesService(item, normalizedQuery.filters));
    return paginate(items, normalizedQuery);
  }

  async listCategories(queryOptions: DiscoveryQuery = {}): Promise<DiscoverySearchResult<DiscoveryCategory>> {
    const take = boundedLimit(queryOptions.limit);
    const normalizedQuery = { ...queryOptions, filters: normalizeFilters(queryOptions.filters) };
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
    }).filter(item => matchesCategory(item, normalizedQuery.filters));
    items.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    return paginate(items, normalizedQuery);
  }

  async search(queryOptions: DiscoveryQuery = {}): Promise<UnifiedDiscoveryResults> {
    const types = queryOptions.types ?? ['business', 'product', 'service', 'category'];
    const candidateLimit = Math.min(boundedLimit(queryOptions.limit) * 3, MAX_LIMIT);
    const candidateQuery = { ...queryOptions, limit: candidateLimit, offset: 0, sort: 'relevance' as const };
    const empty = { items: [], total: 0, hasMore: false };
    const [businesses, products, services, categories] = await Promise.all([
      types.includes('business') ? this.listBusinesses(candidateQuery) : Promise.resolve(empty),
      types.includes('product') ? this.listProducts(candidateQuery) : Promise.resolve(empty),
      types.includes('service') ? this.listServices(candidateQuery) : Promise.resolve(empty),
      types.includes('category') ? this.listCategories(candidateQuery) : Promise.resolve(empty),
    ]);

    const text = queryOptions.filters?.text?.trim() ?? '';
    const rankedResults = [
      ...businesses.items.map(item => ({ type: 'business' as const, item, score: scoreDiscoveryItem('business', item, text) })),
      ...products.items.map(item => ({ type: 'product' as const, item, score: scoreDiscoveryItem('product', item, text) })),
      ...services.items.map(item => ({ type: 'service' as const, item, score: scoreDiscoveryItem('service', item, text) })),
      ...categories.items.map(item => ({ type: 'category' as const, item, score: scoreDiscoveryItem('category', item, text) })),
    ]
      .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
      .slice(0, boundedLimit(queryOptions.limit));

    return {
      businesses: paginate(businesses.items, queryOptions),
      products: paginate(products.items, queryOptions),
      services: paginate(services.items, queryOptions),
      categories: paginate(categories.items, queryOptions),
      rankedResults,
    };
  }
}

export const discoveryRepository: DiscoveryRepository = new FirestoreDiscoveryRepository();

export { distanceKm };
