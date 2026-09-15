import type { TenantSecurityMetricsDoc } from './auditService';

export type PlatformPlanStatus = 'active' | 'archived';
export type BillingInterval = 'monthly' | 'annual';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled';
export type TenantLifecycleStatus = 'provisioning' | 'trialing' | 'active' | 'suspended' | 'archived' | 'cancelled';

export interface PlatformPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  includedSeats: number;
  limits: {
    products: number;
    ordersMonthly: number;
    storageGb: number;
  };
  features: string[];
  status: PlatformPlanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformSubscription {
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  interval: BillingInterval;
  price: number;
  currency: string;
  seatsLimit: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt?: string;
  overrideMonthlyOrders?: boolean;
}

export interface PlatformUsageSnapshot {
  staff: number;
  products: number;
  orders: number;
  auditEvents: number;
  measuredAt: string;
}

export interface PlatformBillingSummary {
  currency: string;
  activeSubscriptions: number;
  trialSubscriptions: number;
  pastDueSubscriptions: number;
  suspendedSubscriptions: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  estimatedMonthlyRunRate: number;
}

export const DEFAULT_PLATFORM_PLANS: Omit<PlatformPlan, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'For small retail teams getting started with POS and commerce.',
    monthlyPrice: 29,
    annualPrice: 290,
    currency: 'USD',
    includedSeats: 3,
    limits: { products: 1000, ordersMonthly: 2500, storageGb: 5 },
    features: ['POS & inventory', 'Basic reports', 'E-commerce storefront'],
    status: 'active',
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'For growing merchants with larger teams and richer operations.',
    monthlyPrice: 79,
    annualPrice: 790,
    currency: 'USD',
    includedSeats: 10,
    limits: { products: 10000, ordersMonthly: 15000, storageGb: 25 },
    features: ['Everything in Starter', 'Advanced analytics', 'Staff permissions', 'Priority support'],
    status: 'active',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For multi-location businesses requiring higher limits and governance.',
    monthlyPrice: 199,
    annualPrice: 1990,
    currency: 'USD',
    includedSeats: 50,
    limits: { products: 100000, ordersMonthly: 100000, storageGb: 100 },
    features: ['Everything in Growth', 'Multi-location controls', 'Security audit center', 'Dedicated support'],
    status: 'active',
  },
];

export function normalizePlanInput(input: any, existing?: PlatformPlan): PlatformPlan {
  const now = new Date().toISOString();
  const id = String(input?.id ?? existing?.id ?? '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!id) throw new Error('Plan ID is required.');
  const name = String(input?.name ?? existing?.name ?? '').trim();
  if (!name) throw new Error('Plan name is required.');
  const monthlyPrice = Math.max(0, Number(input?.monthlyPrice ?? existing?.monthlyPrice ?? 0));
  const annualPrice = Math.max(0, Number(input?.annualPrice ?? existing?.annualPrice ?? Math.round(monthlyPrice * 10)));
  const includedSeats = Math.max(1, Math.floor(Number(input?.includedSeats ?? existing?.includedSeats ?? 1)));
  const limits = {
    products: Math.max(1, Math.floor(Number(input?.limits?.products ?? existing?.limits.products ?? 1000))),
    ordersMonthly: Math.max(1, Math.floor(Number(input?.limits?.ordersMonthly ?? existing?.limits.ordersMonthly ?? 2500))),
    storageGb: Math.max(1, Number(input?.limits?.storageGb ?? existing?.limits.storageGb ?? 5)),
  };
  return {
    id,
    name,
    description: String(input?.description ?? existing?.description ?? '').trim(),
    monthlyPrice,
    annualPrice,
    currency: String(input?.currency ?? existing?.currency ?? 'USD').trim().toUpperCase(),
    includedSeats,
    limits,
    features: Array.isArray(input?.features) ? input.features.map((v: unknown) => String(v).trim()).filter(Boolean).slice(0, 20) : (existing?.features ?? []),
    status: input?.status === 'archived' ? 'archived' : 'active',
    createdAt: existing?.createdAt ?? (input?.createdAt ? String(input.createdAt) : now),
    updatedAt: existing ? now : (input?.updatedAt ? String(input.updatedAt) : now),
  };
}

export function assertLifecycleTransition(current: TenantLifecycleStatus, next: TenantLifecycleStatus): void {
  if (current === next) {
    throw Object.assign(new Error(`Tenant is already ${next}.`), {
      statusCode: 409,
      code: 'INVALID_TENANT_LIFECYCLE_TRANSITION',
    });
  }
  const allowed: Record<TenantLifecycleStatus, TenantLifecycleStatus[]> = {
    provisioning: ['trialing', 'active', 'archived', 'cancelled'],
    trialing: ['active', 'suspended', 'archived', 'cancelled'],
    active: ['suspended', 'archived', 'cancelled'],
    suspended: ['active', 'archived', 'cancelled'],
    archived: ['active'],
    // Cancellation is terminal. A new subscription must be provisioned rather
    // than silently resurrecting a cancelled tenant.
    cancelled: [],
  };
  if (!allowed[current]?.includes(next)) {
    throw Object.assign(new Error(`Invalid tenant lifecycle transition: ${current} → ${next}.`), {
      statusCode: 409,
      code: 'INVALID_TENANT_LIFECYCLE_TRANSITION',
    });
  }
}

/** Canonical subscription state required by each operational lifecycle state. */
export function assertLifecycleSubscriptionConsistency(
  lifecycle: TenantLifecycleStatus,
  subscriptionStatus: SubscriptionStatus,
): void {
  const allowed: Record<TenantLifecycleStatus, SubscriptionStatus[]> = {
    provisioning: ['trialing', 'active'],
    trialing: ['trialing', 'active'],
    active: ['active', 'past_due'],
    suspended: ['suspended'],
    archived: ['suspended', 'cancelled'],
    cancelled: ['cancelled'],
  };
  if (!allowed[lifecycle]?.includes(subscriptionStatus)) {
    throw Object.assign(
      new Error(
        `Invalid tenant/subscription state combination: lifecycle=${lifecycle}, subscription=${subscriptionStatus}.`,
      ),
      { statusCode: 409, code: 'INVALID_TENANT_LIFECYCLE_TRANSITION' },
    );
  }
}

export function lifecycleForSubscriptionStatus(status: SubscriptionStatus): TenantLifecycleStatus | null {
  if (status === 'suspended') return 'suspended';
  if (status === 'cancelled') return 'cancelled';
  return null;
}

export function makeTenantSlug(name: string, suffix = ''): string {
  const base = String(name || 'tenant').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'tenant';
  return `${base}${suffix ? `-${suffix}` : ''}`;
}

export function calculateSubscriptionRevenue(subscriptions: Array<Pick<PlatformSubscription, 'status' | 'interval' | 'price'>>): PlatformBillingSummary {
  let activeSubscriptions = 0;
  let trialSubscriptions = 0;
  let pastDueSubscriptions = 0;
  let suspendedSubscriptions = 0;
  let monthlyRecurringRevenue = 0;
  let annualRecurringRevenue = 0;

  for (const sub of subscriptions) {
    if (sub.status === 'active') {
      activeSubscriptions++;
      if (sub.interval === 'monthly') monthlyRecurringRevenue += Math.max(0, Number(sub.price) || 0);
      else annualRecurringRevenue += Math.max(0, Number(sub.price) || 0);
    } else if (sub.status === 'trialing') trialSubscriptions++;
    else if (sub.status === 'past_due') pastDueSubscriptions++;
    else if (sub.status === 'suspended') suspendedSubscriptions++;
  }

  const estimatedMonthlyRunRate = monthlyRecurringRevenue + annualRecurringRevenue / 12;
  return {
    currency: 'USD',
    activeSubscriptions,
    trialSubscriptions,
    pastDueSubscriptions,
    suspendedSubscriptions,
    monthlyRecurringRevenue,
    annualRecurringRevenue,
    estimatedMonthlyRunRate,
  };
}

export function usageFromCounts(input: { staff?: number; products?: number; orders?: number; auditEvents?: number }, measuredAt = new Date().toISOString()): PlatformUsageSnapshot {
  return {
    staff: Math.max(0, Math.floor(Number(input.staff || 0))),
    products: Math.max(0, Math.floor(Number(input.products || 0))),
    orders: Math.max(0, Math.floor(Number(input.orders || 0))),
    auditEvents: Math.max(0, Math.floor(Number(input.auditEvents || 0))),
    measuredAt,
  };
}

export function summarizeSecurityMetrics(doc: TenantSecurityMetricsDoc | null | undefined): number {
  if (!doc) return 0;
  return Object.values(doc.dailyBuckets || {}).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
}
