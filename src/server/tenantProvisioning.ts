import crypto from 'node:crypto';

export type TenantProvisioningBillingInterval = 'monthly' | 'annual';
export type TenantProvisioningLifecycle = 'trialing' | 'active';

export interface TenantProvisioningRequest {
  businessId: string;
  locationId: string;
  planId: string;
  billingInterval?: TenantProvisioningBillingInterval;
  trialDays?: number;
  idempotencyKey: string;
}

export interface TenantProvisioningPlan {
  id: string;
  name: string;
  status: 'active' | 'archived';
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  includedSeats: number;
  limits?: Record<string, number>;
}

export interface TenantProvisioningBusiness {
  id: string;
  ownerUid: string;
  tradingName: string;
  legalName?: string;
  status: string;
  tenantIds?: string[];
  locations?: Array<{
    id: string;
    businessId: string;
    name: string;
    addressLine1: string;
    city: string;
    country: string;
    phone?: string;
    isActive: boolean;
    tenantId?: string | null;
  }>;
}

export function hashProvisioningIdempotencyKey(key: string): string {
  const normalized = String(key || '').trim();
  if (!normalized) throw new Error('Idempotency-Key is required.');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function validateTenantProvisioningRequest(input: Partial<TenantProvisioningRequest>): TenantProvisioningRequest {
  const businessId = String(input.businessId || '').trim();
  const locationId = String(input.locationId || '').trim();
  const planId = String(input.planId || '').trim().toLowerCase();
  const idempotencyKey = String(input.idempotencyKey || '').trim();
  const billingInterval = input.billingInterval === 'annual' ? 'annual' : 'monthly';
  const rawTrialDays = input.trialDays == null ? 14 : Number(input.trialDays);

  if (!businessId) throw new Error('businessId is required.');
  if (!locationId) throw new Error('locationId is required.');
  if (!planId) throw new Error('planId is required.');
  if (!idempotencyKey) throw new Error('Idempotency-Key is required.');
  if (!Number.isInteger(rawTrialDays) || rawTrialDays < 0 || rawTrialDays > 90) {
    throw new Error('trialDays must be an integer between 0 and 90.');
  }

  return {
    businessId,
    locationId,
    planId,
    billingInterval,
    trialDays: rawTrialDays,
    idempotencyKey,
  };
}

export function buildTenantProvisioningRecords(params: {
  request: TenantProvisioningRequest;
  business: TenantProvisioningBusiness;
  location: NonNullable<TenantProvisioningBusiness['locations']>[number];
  plan: TenantProvisioningPlan;
  ownerUid: string;
  now?: string;
  tenantId?: string;
}) {
  const now = params.now || new Date().toISOString();
  const tenantId = params.tenantId || `tenant_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
  const lifecycleStatus: TenantProvisioningLifecycle = (params.request.trialDays || 0) > 0 ? 'trialing' : 'active';
  const subscriptionStatus = lifecycleStatus;
  const price = params.request.billingInterval === 'annual' ? params.plan.annualPrice : params.plan.monthlyPrice;
  const slug = `${params.business.tradingName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'tenant'}-${tenantId.slice(-8)}`;

  const tenant = {
    id: tenantId,
    businessId: params.business.id,
    locationId: params.location.id,
    ownerUid: params.ownerUid,
    name: params.business.tradingName,
    slug,
    isPrimaryBranch: !(params.business.tenantIds && params.business.tenantIds.length > 0),
    status: 'active',
    lifecycleStatus,
    provisioningStatus: 'completed',
    planId: params.plan.id,
    capabilities: ['storefront', 'products', 'services', 'inventory', 'pos', 'orders', 'customers', 'marketing', 'reports'],
    subscriptionId: `sub_${tenantId}`,
    createdAt: now,
    updatedAt: now,
  };

  const subscription = {
    id: `sub_${tenantId}`,
    tenantId,
    businessId: params.business.id,
    planId: params.plan.id,
    planName: params.plan.name,
    status: subscriptionStatus,
    interval: params.request.billingInterval,
    price,
    currency: params.plan.currency,
    seatsLimit: params.plan.includedSeats,
    trialEndsAt: lifecycleStatus === 'trialing'
      ? new Date(Date.parse(now) + (params.request.trialDays || 0) * 86400000).toISOString()
      : undefined,
    currentPeriodStart: now,
    currentPeriodEnd: new Date(Date.parse(now) + (params.request.billingInterval === 'annual' ? 365 : 30) * 86400000).toISOString(),
  };

  const membership = {
    uid: params.ownerUid,
    tenantId,
    role: 'Business Owner',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  const businessPatch = {
    tenantIds: [...new Set([...(params.business.tenantIds || []), tenantId])],
    updatedAt: now,
  };

  const locationPatch = {
    tenantId,
    hasOperationalTenant: true,
    isActive: true,
  };

  return { tenant, subscription, membership, businessPatch, locationPatch };
}
