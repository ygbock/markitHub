import crypto from 'node:crypto';

export type BusinessMode = 'listing_only' | 'listing_and_store';

export interface BusinessRegistrationRequest {
  businessName: string;
  category: string;
  tagline?: string;
  about?: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  openingHours?: string;
  businessMode: BusinessMode;
  idempotencyKey: string;
}

export function hashBusinessRegistrationKey(key: string): string {
  const normalized = String(key || '').trim();
  if (!normalized) throw new Error('Idempotency-Key is required.');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function validateBusinessRegistrationRequest(input: Partial<BusinessRegistrationRequest>): BusinessRegistrationRequest {
  const businessName = String(input.businessName || '').trim();
  const category = String(input.category || '').trim();
  const address = String(input.address || '').trim();
  const city = String(input.city || '').trim();
  const idempotencyKey = String(input.idempotencyKey || '').trim();
  const businessMode = String(input.businessMode || 'listing_only').trim() as BusinessMode;

  if (!businessName) throw new Error('Business name is required.');
  if (!category) throw new Error('Business category is required.');
  if (!address) throw new Error('Business address is required.');
  if (!city) throw new Error('Business city is required.');
  if (!idempotencyKey) throw new Error('Idempotency-Key is required.');
  if (businessMode !== 'listing_only' && businessMode !== 'listing_and_store') throw new Error('Business mode must be listing_only or listing_and_store.');

  return {
    businessName,
    category,
    tagline: String(input.tagline || '').trim() || undefined,
    about: String(input.about || '').trim() || undefined,
    address,
    city,
    phone: String(input.phone || '').trim() || undefined,
    email: String(input.email || '').trim() || undefined,
    openingHours: String(input.openingHours || '').trim() || undefined,
    businessMode,
    idempotencyKey,
  };
}

export function buildBusinessRegistrationRecords(params: {
  request: BusinessRegistrationRequest;
  ownerUid: string;
  country?: string;
  currency?: string;
  now?: string;
  businessId?: string;
  locationId?: string;
}) {
  const now = params.now || new Date().toISOString();
  const businessId = params.businessId || `biz_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
  const locationId = params.locationId || `loc_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const slugBase = params.request.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'business';
  const slug = `${slugBase}-${businessId.slice(-8)}`;

  const location = {
    id: locationId,
    businessId,
    name: 'Main Branch',
    addressLine1: params.request.address,
    city: params.request.city,
    country: params.country || 'Sierra Leone',
    phone: params.request.phone || '',
    operatingHours: params.request.openingHours || '',
    hasOperationalTenant: false,
    tenantId: null,
    isActive: true,
  };

  const listing = {
    id: `listing_${businessId}`,
    businessId,
    slug,
    headline: params.request.tagline || params.request.businessName,
    description: params.request.about || `Registered local business on MikitHub.`,
    categories: [params.request.category],
    tags: [],
    ratingAverage: 0,
    reviewCount: 0,
    isPublished: false,
    isFeatured: false,
  };

  const business = {
    id: businessId,
    legalName: params.request.businessName,
    tradingName: params.request.businessName,
    registrationNumber: '',
    taxId: '',
    ownerUid: params.ownerUid,
    country: params.country || 'Sierra Leone',
    currency: params.currency || 'USD',
    verificationStatus: 'pending',
    status: 'pending_verification',
    businessMode: params.request.businessMode,
    onboardingStatus: 'in_progress',
    listing,
    locations: [location],
    tenantIds: [],
    createdAt: now,
    updatedAt: now,
  };

  const relationship = {
    uid: params.ownerUid,
    businessId,
    relationshipType: 'owner',
    status: 'active',
    createdAt: now,
  };

  return { business, listing, location, relationship, slug };
}
