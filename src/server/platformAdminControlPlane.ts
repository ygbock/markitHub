import type { TenantSecurityMetricsDoc } from './auditService';

export type PlatformPlanStatus = 'active' | 'archived';
export type BillingInterval = 'monthly' | 'annual';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled';
export type TenantLifecycleStatus = 'provisioning' | 'trialing' | 'active' | 'suspended' | 'archived' | 'cancelled';
export type ProvisioningStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface OnboardingStats {
  awaitingProvisioning: number;
  provisioningInProgress: number;
  provisioningFailures: number;
  trialTenants: number;
  activeTenants: number;
  onboardingCompletionPercent: number;
}

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
    provisioning: ['trialing', 'active', 'suspended', 'archived', 'cancelled'],
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
    provisioning: ['trialing', 'active', 'suspended', 'cancelled'],
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

export function calculateOnboardingStats(tenants: any[]): OnboardingStats {
  let awaitingProvisioning = 0;
  let provisioningInProgress = 0;
  let provisioningFailures = 0;
  let trialTenants = 0;
  let activeTenants = 0;
  let totalPercent = 0;

  for (const tenant of tenants) {
    const lifecycle = tenant.lifecycleStatus || tenant.status;
    const provStatus = tenant.provisioningStatus;

    if (provStatus === 'failed') provisioningFailures++;
    else if (provStatus === 'in_progress') provisioningInProgress++;
    else if (provStatus === 'pending' || lifecycle === 'provisioning') awaitingProvisioning++;

    if (lifecycle === 'trialing') trialTenants++;
    if (lifecycle === 'active') activeTenants++;

    totalPercent += Number(tenant.onboardingCompletionPercent ?? (lifecycle === 'active' ? 100 : lifecycle === 'trialing' ? 80 : 25));
  }

  const onboardingCompletionPercent = tenants.length > 0 ? Math.round(totalPercent / tenants.length) : 0;
  return {
    awaitingProvisioning,
    provisioningInProgress,
    provisioningFailures,
    trialTenants,
    activeTenants,
    onboardingCompletionPercent,
  };
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

export type TenantHealthStatus = 'HEALTHY' | 'AT_RISK' | 'CRITICAL';

export interface TenantHealthInfo {
  status: TenantHealthStatus;
  healthScore: number;
  reasons: string[];
}

export function calculateTenantHealth(input: {
  lifecycleStatus?: string;
  provisioningStatus?: string;
  subscriptionStatus?: string;
  usagePercent?: number;
  overrideActive?: boolean;
  hasPaymentFailure?: boolean;
  lastActivityAt?: string | null;
  createdAt?: string | null;
  warningUsagePercent?: number;
  criticalUsagePercent?: number;
}): TenantHealthInfo {
  const reasons: string[] = [];
  let score = 100;

  const lifecycle = String(input.lifecycleStatus || 'active').toLowerCase();
  const provisioning = String(input.provisioningStatus || 'completed').toLowerCase();
  const subscription = String(input.subscriptionStatus || 'active').toLowerCase();
  const usagePercent = Number(input.usagePercent || 0);
  const overrideActive = Boolean(input.overrideActive);
  const hasPaymentFailure = Boolean(input.hasPaymentFailure);
  const warningUsagePercent = Number(input.warningUsagePercent ?? 80);
  const criticalUsagePercent = Number(input.criticalUsagePercent ?? 100);

  if (provisioning === 'failed') {
    score -= 100;
    reasons.push('Provisioning pipeline failure');
  }
  if (lifecycle === 'cancelled') {
    score -= 100;
    reasons.push('Tenant account cancelled');
  }
  if (lifecycle === 'archived') {
    score -= 80;
    reasons.push('Tenant account archived');
  }
  if (lifecycle === 'suspended' || subscription === 'suspended') {
    score -= 75;
    reasons.push('Tenant account or subscription suspended');
  }
  if (subscription === 'cancelled') {
    score -= 90;
    reasons.push('Subscription cancelled');
  }
  if (subscription === 'past_due' || hasPaymentFailure) {
    score -= 40;
    reasons.push('Subscription payment past due / failed');
  }

  if (usagePercent >= criticalUsagePercent && !overrideActive) {
    score -= 50;
    reasons.push(`Monthly order limit exceeded (${criticalUsagePercent}%+)`);
  } else if (usagePercent >= criticalUsagePercent && overrideActive) {
    score -= 15;
    reasons.push('Monthly order limit exceeded with active override');
  } else if (usagePercent >= warningUsagePercent) {
    score -= 20;
    reasons.push(`Monthly order usage near limit (${warningUsagePercent}%+)`);
  }

  if (lifecycle === 'provisioning' && provisioning === 'pending') {
    score -= 15;
    reasons.push('Tenant onboarding provisioning pending completion');
  }

  const lastActive = input.lastActivityAt || input.createdAt;
  if (lastActive) {
    const activeMs = Date.now() - new Date(lastActive).getTime();
    const daysInactive = activeMs / (1000 * 60 * 60 * 24);
    if (daysInactive > 30 && lifecycle !== 'cancelled' && lifecycle !== 'archived') {
      score -= 15;
      reasons.push('No recorded tenant activity in past 30 days');
    }
  }

  const healthScore = Math.max(0, Math.min(100, Math.round(score)));

  let status: TenantHealthStatus = 'HEALTHY';
  if (
    provisioning === 'failed' ||
    lifecycle === 'cancelled' ||
    lifecycle === 'archived' ||
    lifecycle === 'suspended' ||
    subscription === 'suspended' ||
    subscription === 'cancelled' ||
    subscription === 'past_due' ||
    (usagePercent >= criticalUsagePercent && !overrideActive) ||
    healthScore < 50
  ) {
    status = 'CRITICAL';
  } else if (healthScore < 90 || usagePercent >= warningUsagePercent || lifecycle === 'provisioning' || hasPaymentFailure) {
    status = 'AT_RISK';
  }

  if (reasons.length === 0) {
    reasons.push('All platform health signals nominal');
  }

  return {
    status,
    healthScore,
    reasons,
  };
}

export interface TimeframeConfig {
  key: string;
  label: string;
  days: number;
  startDate: string;
  previousStartDate: string;
  bucketCount: number;
  bucketInterval: 'day' | 'week' | 'month';
}

export function parseAnalyticsTimeframe(input?: string): TimeframeConfig {
  const raw = String(input || '30d').trim().toLowerCase();
  let days = 30;
  let key = '30d';
  let label = '30 Days';

  if (raw === 'today' || raw === '1d' || raw === '1 day') {
    days = 1;
    key = 'today';
    label = 'Today';
  } else if (raw === '7d' || raw === '7 days' || raw === '7') {
    days = 7;
    key = '7d';
    label = '7 Days';
  } else if (raw === '30d' || raw === '30 days' || raw === '30') {
    days = 30;
    key = '30d';
    label = '30 Days';
  } else if (raw === '90d' || raw === '90 days' || raw === '90') {
    days = 90;
    key = '90d';
    label = '90 Days';
  } else if (raw === '12m' || raw === '12 months' || raw === '1y' || raw === '365d') {
    days = 365;
    key = '12m';
    label = '12 Months';
  }

  const now = new Date();
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const prevStart = new Date(now.getTime() - days * 2 * 24 * 60 * 60 * 1000);

  const bucketCount = days === 1 ? 24 : days === 7 ? 7 : days === 30 ? 30 : days === 90 ? 12 : 12;
  const bucketInterval = days === 1 ? 'day' : days <= 30 ? 'day' : days <= 90 ? 'week' : 'month';

  return {
    key,
    label,
    days,
    startDate: start.toISOString(),
    previousStartDate: prevStart.toISOString(),
    bucketCount,
    bucketInterval,
  };
}

export interface PlatformAnalyticsBundle {
  timeframe: TimeframeConfig;
  kpis: {
    totalTenants: number;
    activeTenants: number;
    trialingTenants: number;
    suspendedTenants: number;
    cancelledTenants: number;
    archivedTenants: number;
    provisioningTenants: number;
    newTenantsInPeriod: number;
    tenantGrowthRatePercent: number;
    activeSubscriptions: number;
    mrr: number;
    arr: number;
    estimatedRunRate: number;
    trialToPaidConversionRatePercent: number;
    churnRatePercent: number;
    failedSubscriptions: number;
    ordersInPeriod: number;
    platformOrderVolume: number;
    usageWarnings: number;
    usageViolations: number;
    activeOverrides: number;
    provisioningFailures: number;
  };
  healthSummary: {
    healthy: number;
    atRisk: number;
    critical: number;
    healthyPercent: number;
    atRiskPercent: number;
    criticalPercent: number;
  };
  revenueSummary: {
    mrr: number;
    arr: number;
    estimatedRunRate: number;
    revenueByPlan: Array<{
      planId: string;
      planName: string;
      monthlyPrice: number;
      annualPrice: number;
      activeCount: number;
      trialCount: number;
      mrr: number;
      arr: number;
      totalMonthlyValue: number;
    }>;
  };
  usageSummary: {
    platformOrderVolume: number;
    averageUtilizationPercent: number;
    usageWarnings: number;
    usageViolations: number;
    activeOverrides: number;
  };
  timeSeries: Array<{
    date: string;
    label: string;
    newTenants: number;
    cumulativeTenants: number;
    mrr: number;
    orders: number;
    healthy: number;
    atRisk: number;
    critical: number;
  }>;
}

export function computePlatformAnalytics(
  rawTenants: any[],
  plans: PlatformPlan[],
  timeframeInput?: string,
  usageMetersMap: Record<string, any> = {},
): PlatformAnalyticsBundle {
  const timeframe = parseAnalyticsTimeframe(timeframeInput);
  const startDateMs = new Date(timeframe.startDate).getTime();
  const prevStartDateMs = new Date(timeframe.previousStartDate).getTime();

  let totalTenants = 0;
  let activeTenants = 0;
  let trialingTenants = 0;
  let suspendedTenants = 0;
  let cancelledTenants = 0;
  let archivedTenants = 0;
  let provisioningTenants = 0;

  let newTenantsInPeriod = 0;
  let previousTenantsInPeriod = 0;

  let activeSubscriptions = 0;
  let trialSubscriptions = 0;
  let pastDueSubscriptions = 0;
  let failedSubscriptions = 0;

  let mrr = 0;
  let arr = 0;

  let platformOrderVolume = 0;
  let totalUtilizationSum = 0;
  let activeOrTrialCountForUsage = 0;

  let usageWarnings = 0;
  let usageViolations = 0;
  let activeOverrides = 0;
  let provisioningFailures = 0;

  let healthyCount = 0;
  let atRiskCount = 0;
  let criticalCount = 0;

  const planStatsMap = new Map<string, {
    planId: string;
    planName: string;
    monthlyPrice: number;
    annualPrice: number;
    activeCount: number;
    trialCount: number;
    mrr: number;
    arr: number;
    totalMonthlyValue: number;
  }>();

  for (const plan of plans) {
    planStatsMap.set(plan.id, {
      planId: plan.id,
      planName: plan.name,
      monthlyPrice: plan.monthlyPrice,
      annualPrice: plan.annualPrice,
      activeCount: 0,
      trialCount: 0,
      mrr: 0,
      arr: 0,
      totalMonthlyValue: 0,
    });
  }

  for (const tenant of rawTenants) {
    totalTenants++;

    const lifecycle = String(tenant.lifecycleStatus || tenant.status || 'active').toLowerCase();
    const provisioningStatus = String(tenant.provisioningStatus || 'completed').toLowerCase();
    const sub = tenant.subscription || {};
    const subStatus = String(sub.status || 'active').toLowerCase();
    const planId = String(sub.planId || 'starter').toLowerCase();
    const interval = String(sub.interval || 'monthly').toLowerCase();
    const price = Number(sub.price ?? 0);

    if (lifecycle === 'active') activeTenants++;
    else if (lifecycle === 'trialing') trialingTenants++;
    else if (lifecycle === 'suspended') suspendedTenants++;
    else if (lifecycle === 'cancelled') cancelledTenants++;
    else if (lifecycle === 'archived') archivedTenants++;
    else if (lifecycle === 'provisioning') provisioningTenants++;

    if (provisioningStatus === 'failed') provisioningFailures++;

    const createdMs = tenant.createdAt ? new Date(tenant.createdAt).getTime() : 0;
    if (createdMs >= startDateMs) {
      newTenantsInPeriod++;
    } else if (createdMs >= prevStartDateMs) {
      previousTenantsInPeriod++;
    }

    if (subStatus === 'active') {
      activeSubscriptions++;
      if (interval === 'monthly') mrr += price;
      else arr += price;
    } else if (subStatus === 'trialing') {
      trialSubscriptions++;
    } else if (subStatus === 'past_due') {
      pastDueSubscriptions++;
      failedSubscriptions++;
    } else if (subStatus === 'suspended' || subStatus === 'cancelled') {
      failedSubscriptions++;
    }

    const planStat = planStatsMap.get(planId) || {
      planId,
      planName: String(sub.planName || planId),
      monthlyPrice: price,
      annualPrice: price * 10,
      activeCount: 0,
      trialCount: 0,
      mrr: 0,
      arr: 0,
      totalMonthlyValue: 0,
    };

    if (subStatus === 'active') {
      planStat.activeCount++;
      if (interval === 'monthly') {
        planStat.mrr += price;
        planStat.totalMonthlyValue += price;
      } else {
        planStat.arr += price;
        planStat.totalMonthlyValue += price / 12;
      }
    } else if (subStatus === 'trialing') {
      planStat.trialCount++;
    }
    planStatsMap.set(planId, planStat);

    const meter = usageMetersMap[tenant.id] || tenant.meter || {};
    const matchedPlan = plans.find(p => p.id === planId);
    const orderLimit = Math.max(1, Number(matchedPlan?.limits?.ordersMonthly || 2500));
    const usedOrders = Math.max(0, Math.floor(Number(meter.ordersMonthly || meter.orders || 0)));
    const overrideActive = Boolean(meter.overrideMonthlyOrders || sub.overrideMonthlyOrders || tenant.overrideMonthlyOrders);

    platformOrderVolume += usedOrders;

    const usagePercent = Math.round((usedOrders / orderLimit) * 100);

    if (lifecycle === 'active' || lifecycle === 'trialing') {
      totalUtilizationSum += usagePercent;
      activeOrTrialCountForUsage++;
    }

    if (usagePercent >= 100 && !overrideActive) {
      usageViolations++;
    } else if (usagePercent >= 80 && usagePercent < 100) {
      usageWarnings++;
    }

    if (overrideActive) {
      activeOverrides++;
    }

    const health = calculateTenantHealth({
      lifecycleStatus: lifecycle,
      provisioningStatus,
      subscriptionStatus: subStatus,
      usagePercent,
      overrideActive,
      hasPaymentFailure: subStatus === 'past_due',
      lastActivityAt: tenant.updatedAt || tenant.createdAt,
      createdAt: tenant.createdAt,
    });

    if (health.status === 'HEALTHY') healthyCount++;
    else if (health.status === 'AT_RISK') atRiskCount++;
    else criticalCount++;
  }

  const tenantGrowthRatePercent = previousTenantsInPeriod > 0
    ? Math.round(((newTenantsInPeriod - previousTenantsInPeriod) / previousTenantsInPeriod) * 1000) / 10
    : newTenantsInPeriod > 0 ? 100 : 0;

  const estimatedRunRate = mrr + (arr / 12);
  const trialToPaidConversionRatePercent = (activeTenants + trialingTenants) > 0
    ? Math.round((activeTenants / (activeTenants + trialingTenants)) * 1000) / 10
    : 0;

  const churnRatePercent = totalTenants > 0
    ? Math.round(((cancelledTenants + suspendedTenants) / totalTenants) * 1000) / 10
    : 0;

  const averageUtilizationPercent = activeOrTrialCountForUsage > 0
    ? Math.round(totalUtilizationSum / activeOrTrialCountForUsage)
    : 0;

  const healthyPercent = totalTenants > 0 ? Math.round((healthyCount / totalTenants) * 100) : 0;
  const atRiskPercent = totalTenants > 0 ? Math.round((atRiskCount / totalTenants) * 100) : 0;
  const criticalPercent = totalTenants > 0 ? Math.round((criticalCount / totalTenants) * 100) : 0;

  const timeSeries: PlatformAnalyticsBundle['timeSeries'] = [];
  const nowMs = Date.now();
  const bucketDays = timeframe.days / timeframe.bucketCount;

  for (let i = timeframe.bucketCount - 1; i >= 0; i--) {
    const bucketStartMs = nowMs - (i + 1) * bucketDays * 24 * 60 * 60 * 1000;
    const bucketEndMs = nowMs - i * bucketDays * 24 * 60 * 60 * 1000;
    const bucketDateObj = new Date(bucketEndMs);

    const label = timeframe.bucketInterval === 'day'
      ? bucketDateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : timeframe.bucketInterval === 'week'
      ? `W${Math.ceil(bucketDateObj.getDate() / 7)} ${bucketDateObj.toLocaleDateString(undefined, { month: 'short' })}`
      : bucketDateObj.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });

    let newCount = 0;
    let cumCount = 0;
    let bucketOrders = 0;

    for (const t of rawTenants) {
      const cMs = t.createdAt ? new Date(t.createdAt).getTime() : 0;
      if (cMs >= bucketStartMs && cMs <= bucketEndMs) {
        newCount++;
      }
      if (cMs <= bucketEndMs) {
        cumCount++;
      }
      const m = usageMetersMap[t.id] || t.meter || {};
      bucketOrders += Math.round((Number(m.ordersMonthly || m.orders || 0)) / timeframe.bucketCount);
    }

    const estimatedBucketMrr = Math.round(mrr * (cumCount / Math.max(1, totalTenants)));
    const bHealthy = Math.round(healthyCount * (cumCount / Math.max(1, totalTenants)));
    const bAtRisk = Math.round(atRiskCount * (cumCount / Math.max(1, totalTenants)));
    const bCritical = Math.round(criticalCount * (cumCount / Math.max(1, totalTenants)));

    timeSeries.push({
      date: bucketDateObj.toISOString().split('T')[0],
      label,
      newTenants: newCount,
      cumulativeTenants: cumCount,
      mrr: estimatedBucketMrr,
      orders: bucketOrders,
      healthy: bHealthy,
      atRisk: bAtRisk,
      critical: bCritical,
    });
  }

  return {
    timeframe,
    kpis: {
      totalTenants,
      activeTenants,
      trialingTenants,
      suspendedTenants,
      cancelledTenants,
      archivedTenants,
      provisioningTenants,
      newTenantsInPeriod,
      tenantGrowthRatePercent,
      activeSubscriptions,
      mrr,
      arr,
      estimatedRunRate,
      trialToPaidConversionRatePercent,
      churnRatePercent,
      failedSubscriptions,
      ordersInPeriod: platformOrderVolume,
      platformOrderVolume,
      usageWarnings,
      usageViolations,
      activeOverrides,
      provisioningFailures,
    },
    healthSummary: {
      healthy: healthyCount,
      atRisk: atRiskCount,
      critical: criticalCount,
      healthyPercent,
      atRiskPercent,
      criticalPercent,
    },
    revenueSummary: {
      mrr,
      arr,
      estimatedRunRate,
      revenueByPlan: Array.from(planStatsMap.values()),
    },
    usageSummary: {
      platformOrderVolume,
      averageUtilizationPercent,
      usageWarnings,
      usageViolations,
      activeOverrides,
    },
    timeSeries,
  };
}

