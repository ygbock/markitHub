import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {
  calculateTenantHealth,
  parseAnalyticsTimeframe,
  computePlatformAnalytics,
  DEFAULT_PLATFORM_PLANS,
  type PlatformPlan,
} from './platformAdminControlPlane';
import { registerPlatformAdminRoutes } from './platformAdminRoutes';

// Helper for simulating HTTP requests against express router
function createTestApp(opts: {
  db?: any;
  userRole?: string;
  authenticated?: boolean;
}) {
  const app = express();
  app.use(express.json());

  const requireServerAuth: express.RequestHandler = (req, res, next) => {
    if (opts.authenticated === false) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    (req as any).user = {
      uid: 'superadmin_uid_123',
      email: 'admin@markithub.com',
      platformAdmin: opts.userRole === 'platformAdmin',
    };
    next();
  };

  const requirePlatformAdmin: express.RequestHandler = (req, res, next) => {
    if ((req as any).user?.platformAdmin !== true) {
      return res.status(403).json({ error: 'Super Admin privileges required.' });
    }
    next();
  };

  registerPlatformAdminRoutes({
    app,
    requireServerAuth,
    requirePlatformAdmin,
    getAdminDb: () => opts.db ?? null,
    getAdminAuth: () => null,
  });

  return app;
}

// Simple in-memory mock Firestore database for HTTP endpoint testing
class MockAnalyticsDb {
  public docsMap = new Map<string, any>();

  public collection(collName: string) {
    const self = this;
    return {
      doc(id: string) {
        const path = `${collName}/${id}`;
        return {
          path,
          async get() {
            const data = self.docsMap.get(path);
            return {
              exists: Boolean(data),
              id,
              data: () => data,
            };
          },
        };
      },
      orderBy() {
        return this;
      },
      limit() {
        return this;
      },
      async get() {
        const items: any[] = [];
        for (const [path, val] of self.docsMap.entries()) {
          if (path.startsWith(`${collName}/`)) {
            items.push({
              id: path.split('/')[1],
              data: () => val,
            });
          }
        }
        return {
          docs: items,
        };
      },
    };
  }
}

async function doFetch(app: any, path: string, headers: Record<string, string> = {}) {
  const http = await import('node:http');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const url = `http://127.0.0.1:${address.port}${path}`;

  try {
    const res = await fetch(url, { headers });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, body: json };
  } finally {
    server.close();
  }
}

// ---------------------------------------------------------
// 1-12: calculateTenantHealth Unit Tests
// ---------------------------------------------------------

test('1. calculateTenantHealth - Default active healthy tenant returns HEALTHY status', () => {
  const result = calculateTenantHealth({
    lifecycleStatus: 'active',
    subscriptionStatus: 'active',
    usagePercent: 10,
  });
  assert.equal(result.status, 'HEALTHY');
  assert.equal(result.healthScore, 100);
  assert.ok(result.reasons.includes('All platform health signals nominal'));
});

test('2. calculateTenantHealth - Warning usage (80-99%) returns AT_RISK status', () => {
  const result = calculateTenantHealth({
    lifecycleStatus: 'active',
    subscriptionStatus: 'active',
    usagePercent: 85,
  });
  assert.equal(result.status, 'AT_RISK');
  assert.equal(result.healthScore, 80);
  assert.ok(result.reasons.some(r => r.includes('near limit (80%+)')));
});

test('3. calculateTenantHealth - Exceeded usage without override returns CRITICAL status', () => {
  const result = calculateTenantHealth({
    lifecycleStatus: 'active',
    subscriptionStatus: 'active',
    usagePercent: 105,
    overrideActive: false,
  });
  assert.equal(result.status, 'CRITICAL');
  assert.equal(result.healthScore, 50);
  assert.ok(result.reasons.some(r => r.includes('exceeded (100%+)')));
});

test('4. calculateTenantHealth - Exceeded usage WITH override returns AT_RISK status', () => {
  const result = calculateTenantHealth({
    lifecycleStatus: 'active',
    subscriptionStatus: 'active',
    usagePercent: 120,
    overrideActive: true,
  });
  assert.equal(result.status, 'AT_RISK');
  assert.equal(result.healthScore, 85);
  assert.ok(result.reasons.some(r => r.includes('with active override')));
});

test('5. calculateTenantHealth - Failed provisioning returns CRITICAL status with 0 score', () => {
  const result = calculateTenantHealth({
    lifecycleStatus: 'provisioning',
    provisioningStatus: 'failed',
  });
  assert.equal(result.status, 'CRITICAL');
  assert.equal(result.healthScore, 0);
  assert.ok(result.reasons.some(r => r.includes('Provisioning pipeline failure')));
});

test('6. calculateTenantHealth - Cancelled lifecycle returns CRITICAL status with 0 score', () => {
  const result = calculateTenantHealth({
    lifecycleStatus: 'cancelled',
    subscriptionStatus: 'cancelled',
  });
  assert.equal(result.status, 'CRITICAL');
  assert.equal(result.healthScore, 0);
});

test('7. calculateTenantHealth - Suspended tenant returns CRITICAL status', () => {
  const result = calculateTenantHealth({
    lifecycleStatus: 'suspended',
    subscriptionStatus: 'suspended',
  });
  assert.equal(result.status, 'CRITICAL');
  assert.equal(result.healthScore, 25);
  assert.ok(result.reasons.some(r => r.includes('suspended')));
});

test('8. calculateTenantHealth - Past due payment returns CRITICAL status', () => {
  const result = calculateTenantHealth({
    lifecycleStatus: 'active',
    subscriptionStatus: 'past_due',
    hasPaymentFailure: true,
  });
  assert.equal(result.status, 'CRITICAL');
  assert.equal(result.healthScore, 60);
  assert.ok(result.reasons.some(r => r.includes('past due')));
});

test('9. calculateTenantHealth - Inactive tenant > 30 days incurs score penalty', () => {
  const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
  const result = calculateTenantHealth({
    lifecycleStatus: 'active',
    subscriptionStatus: 'active',
    lastActivityAt: thirtyFiveDaysAgo,
  });
  assert.equal(result.status, 'AT_RISK');
  assert.equal(result.healthScore, 85);
  assert.ok(result.reasons.some(r => r.includes('past 30 days')));
});

test('10. calculateTenantHealth - Pending onboarding provisioning returns AT_RISK', () => {
  const result = calculateTenantHealth({
    lifecycleStatus: 'provisioning',
    provisioningStatus: 'pending',
  });
  assert.equal(result.status, 'AT_RISK');
  assert.equal(result.healthScore, 85);
});

test('11. calculateTenantHealth - Archived tenant returns CRITICAL', () => {
  const result = calculateTenantHealth({
    lifecycleStatus: 'archived',
    subscriptionStatus: 'cancelled',
  });
  assert.equal(result.status, 'CRITICAL');
});

test('12. calculateTenantHealth - Score is clamped between 0 and 100', () => {
  const superNegative = calculateTenantHealth({
    lifecycleStatus: 'cancelled',
    provisioningStatus: 'failed',
    subscriptionStatus: 'cancelled',
    usagePercent: 200,
  });
  assert.equal(superNegative.healthScore, 0);

  const perfect = calculateTenantHealth({
    lifecycleStatus: 'active',
    subscriptionStatus: 'active',
    usagePercent: 5,
  });
  assert.equal(perfect.healthScore, 100);
});

// ---------------------------------------------------------
// 13-17: parseAnalyticsTimeframe Unit Tests
// ---------------------------------------------------------

test('13. parseAnalyticsTimeframe - Parses "today" correctly', () => {
  const tf = parseAnalyticsTimeframe('today');
  assert.equal(tf.key, 'today');
  assert.equal(tf.days, 1);
  assert.equal(tf.bucketCount, 24);
  assert.equal(tf.bucketInterval, 'day');
});

test('14. parseAnalyticsTimeframe - Parses "7d" correctly', () => {
  const tf = parseAnalyticsTimeframe('7d');
  assert.equal(tf.key, '7d');
  assert.equal(tf.days, 7);
  assert.equal(tf.bucketCount, 7);
  assert.equal(tf.bucketInterval, 'day');
});

test('15. parseAnalyticsTimeframe - Parses "30d" correctly', () => {
  const tf = parseAnalyticsTimeframe('30d');
  assert.equal(tf.key, '30d');
  assert.equal(tf.days, 30);
  assert.equal(tf.bucketCount, 30);
  assert.equal(tf.bucketInterval, 'day');
});

test('16. parseAnalyticsTimeframe - Parses "90d" correctly', () => {
  const tf = parseAnalyticsTimeframe('90d');
  assert.equal(tf.key, '90d');
  assert.equal(tf.days, 90);
  assert.equal(tf.bucketCount, 12);
  assert.equal(tf.bucketInterval, 'week');
});

test('17. parseAnalyticsTimeframe - Fallback to "30d" for unknown strings', () => {
  const tf = parseAnalyticsTimeframe('invalid_input');
  assert.equal(tf.key, '30d');
  assert.equal(tf.days, 30);
});

// ---------------------------------------------------------
// 18-24: computePlatformAnalytics Unit Tests
// ---------------------------------------------------------

test('18. computePlatformAnalytics - Correctly counts tenant status states', () => {
  const mockTenants = [
    { id: 't1', lifecycleStatus: 'active', subscription: { status: 'active', price: 99, interval: 'monthly' } },
    { id: 't2', lifecycleStatus: 'trialing', subscription: { status: 'trialing', price: 0 } },
    { id: 't3', lifecycleStatus: 'suspended', subscription: { status: 'suspended', price: 99 } },
    { id: 't4', lifecycleStatus: 'cancelled', subscription: { status: 'cancelled', price: 299 } },
  ];
  const bundle = computePlatformAnalytics(mockTenants, DEFAULT_PLATFORM_PLANS as PlatformPlan[], '30d');
  assert.equal(bundle.kpis.totalTenants, 4);
  assert.equal(bundle.kpis.activeTenants, 1);
  assert.equal(bundle.kpis.trialingTenants, 1);
  assert.equal(bundle.kpis.suspendedTenants, 1);
  assert.equal(bundle.kpis.cancelledTenants, 1);
});

test('19. computePlatformAnalytics - Calculates MRR and ARR accurately', () => {
  const mockTenants = [
    { id: 't1', lifecycleStatus: 'active', subscription: { planId: 'starter', status: 'active', price: 49, interval: 'monthly' } },
    { id: 't2', lifecycleStatus: 'active', subscription: { planId: 'pro', status: 'active', price: 199, interval: 'monthly' } },
    { id: 't3', lifecycleStatus: 'active', subscription: { planId: 'enterprise', status: 'active', price: 5000, interval: 'annual' } },
  ];
  const bundle = computePlatformAnalytics(mockTenants, DEFAULT_PLATFORM_PLANS as PlatformPlan[], '30d');
  assert.equal(bundle.kpis.mrr, 248);
  assert.equal(bundle.kpis.arr, 5000);
  assert.equal(bundle.kpis.estimatedRunRate, 248 + (5000 / 12));
});

test('20. computePlatformAnalytics - Calculates trial conversion rate and churn rate', () => {
  const mockTenants = [
    { id: 't1', lifecycleStatus: 'active', subscription: { status: 'active', price: 49 } },
    { id: 't2', lifecycleStatus: 'active', subscription: { status: 'active', price: 199 } },
    { id: 't3', lifecycleStatus: 'trialing', subscription: { status: 'trialing', price: 0 } },
    { id: 't4', lifecycleStatus: 'cancelled', subscription: { status: 'cancelled', price: 49 } },
  ];
  const bundle = computePlatformAnalytics(mockTenants, DEFAULT_PLATFORM_PLANS as PlatformPlan[], '30d');
  // active = 2, trialing = 1 -> conversion = 2/3 * 100 = 66.7%
  assert.equal(bundle.kpis.trialToPaidConversionRatePercent, 66.7);
  // churned = 1 (cancelled) out of 4 -> 25%
  assert.equal(bundle.kpis.churnRatePercent, 25);
});

test('21. computePlatformAnalytics - Evaluates order usage limits and violations', () => {
  const mockTenants = [
    { id: 't1', lifecycleStatus: 'active', subscription: { planId: 'starter' }, meter: { ordersMonthly: 2000 } }, // 80% (warning)
    { id: 't2', lifecycleStatus: 'active', subscription: { planId: 'starter' }, meter: { ordersMonthly: 3000 } }, // 120% (violation)
    { id: 't3', lifecycleStatus: 'active', subscription: { planId: 'starter', overrideMonthlyOrders: true }, meter: { ordersMonthly: 3000 } }, // 120% with override
  ];
  const bundle = computePlatformAnalytics(mockTenants, DEFAULT_PLATFORM_PLANS as PlatformPlan[], '30d');
  assert.equal(bundle.kpis.usageWarnings, 1);
  assert.equal(bundle.kpis.usageViolations, 1);
  assert.equal(bundle.kpis.activeOverrides, 1);
  assert.equal(bundle.kpis.platformOrderVolume, 8000);
});

test('22. computePlatformAnalytics - Generates expected time series buckets', () => {
  const mockTenants = [
    { id: 't1', lifecycleStatus: 'active', createdAt: new Date().toISOString() },
  ];
  const bundle = computePlatformAnalytics(mockTenants, DEFAULT_PLATFORM_PLANS as PlatformPlan[], '7d');
  assert.equal(bundle.timeSeries.length, 7);
  assert.ok(bundle.timeSeries[0].date);
  assert.ok(bundle.timeSeries[0].label);
});

test('23. computePlatformAnalytics - Groups revenue by plan accurately', () => {
  const mockTenants = [
    { id: 't1', lifecycleStatus: 'active', subscription: { planId: 'starter', planName: 'Starter', status: 'active', price: 49, interval: 'monthly' } },
    { id: 't2', lifecycleStatus: 'active', subscription: { planId: 'starter', planName: 'Starter', status: 'active', price: 49, interval: 'monthly' } },
    { id: 't3', lifecycleStatus: 'active', subscription: { planId: 'pro', planName: 'Professional', status: 'active', price: 199, interval: 'monthly' } },
  ];
  const bundle = computePlatformAnalytics(mockTenants, DEFAULT_PLATFORM_PLANS as PlatformPlan[], '30d');
  const starter = bundle.revenueSummary.revenueByPlan.find(p => p.planId === 'starter');
  assert.ok(starter);
  assert.equal(starter.activeCount, 2);
  assert.equal(starter.mrr, 98);
});

test('24. computePlatformAnalytics - Handles empty tenant list gracefully', () => {
  const bundle = computePlatformAnalytics([], DEFAULT_PLATFORM_PLANS as PlatformPlan[], '30d');
  assert.equal(bundle.kpis.totalTenants, 0);
  assert.equal(bundle.kpis.mrr, 0);
  assert.equal(bundle.healthSummary.healthyPercent, 0);
});

// ---------------------------------------------------------
// 25-45: HTTP Endpoint Integration Tests
// ---------------------------------------------------------

test('25. GET /api/platform/analytics/overview - Rejects unauthenticated request (401)', async () => {
  const app = createTestApp({ authenticated: false });
  const { status } = await doFetch(app, '/api/platform/analytics/overview');
  assert.equal(status, 401);
});

test('26. GET /api/platform/analytics/overview - Rejects non-super-admin request (403)', async () => {
  const app = createTestApp({ authenticated: true, userRole: 'regularUser' });
  const { status } = await doFetch(app, '/api/platform/analytics/overview');
  assert.equal(status, 403);
});

test('27. GET /api/platform/analytics/overview - Returns 503 when DB unavailable', async () => {
  const app = createTestApp({ authenticated: true, userRole: 'platformAdmin', db: null });
  const { status, body } = await doFetch(app, '/api/platform/analytics/overview');
  assert.equal(status, 503);
  assert.equal(body.error, 'Platform service is not configured.');
});

test('28. GET /api/platform/analytics/overview - Returns complete analytics bundle for Super Admin', async () => {
  const db = new MockAnalyticsDb();
  db.docsMap.set('tenants/t1', {
    id: 't1',
    name: 'Acme Retail',
    lifecycleStatus: 'active',
    subscription: { planId: 'pro', status: 'active', price: 199, interval: 'monthly' },
  });
  const app = createTestApp({ authenticated: true, userRole: 'platformAdmin', db });
  const { status, body } = await doFetch(app, '/api/platform/analytics/overview?timeframe=30d');
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.kpis.totalTenants, 1);
  assert.equal(body.kpis.mrr, 199);
  assert.ok(body.healthSummary);
  assert.ok(body.revenueSummary);
  assert.ok(body.timeSeries);
});

test('29. GET /api/platform/analytics/tenants - Rejects unauthenticated request (401)', async () => {
  const app = createTestApp({ authenticated: false });
  const { status } = await doFetch(app, '/api/platform/analytics/tenants');
  assert.equal(status, 401);
});

test('30. GET /api/platform/analytics/tenants - Returns paginated tenant health list', async () => {
  const db = new MockAnalyticsDb();
  db.docsMap.set('tenants/t1', {
    id: 't1',
    name: 'Acme Store',
    lifecycleStatus: 'active',
    subscription: { planId: 'starter', status: 'active', price: 49 },
  });
  db.docsMap.set('tenants/t2', {
    id: 't2',
    name: 'Beta Boutique',
    lifecycleStatus: 'suspended',
    subscription: { planId: 'pro', status: 'suspended', price: 199 },
  });
  const app = createTestApp({ authenticated: true, userRole: 'platformAdmin', db });
  const { status, body } = await doFetch(app, '/api/platform/analytics/tenants?page=1&limit=10');
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.totalItems, 2);
  assert.equal(body.tenants.length, 2);
  assert.ok(body.healthBreakdown);
});

test('31. GET /api/platform/analytics/tenants - Filters tenants by health status', async () => {
  const db = new MockAnalyticsDb();
  db.docsMap.set('tenants/t1', {
    id: 't1',
    name: 'Healthy Store',
    lifecycleStatus: 'active',
    subscription: { planId: 'starter', status: 'active', price: 49 },
  });
  db.docsMap.set('tenants/t2', {
    id: 't2',
    name: 'Critical Store',
    lifecycleStatus: 'suspended',
    subscription: { planId: 'pro', status: 'suspended', price: 199 },
  });
  const app = createTestApp({ authenticated: true, userRole: 'platformAdmin', db });
  const { status, body } = await doFetch(app, '/api/platform/analytics/tenants?health=CRITICAL');
  assert.equal(status, 200);
  assert.equal(body.tenants.length, 1);
  assert.equal(body.tenants[0].name, 'Critical Store');
});

test('32. GET /api/platform/analytics/tenants - Filters tenants by lifecycle status', async () => {
  const db = new MockAnalyticsDb();
  db.docsMap.set('tenants/t1', { id: 't1', name: 'T1', lifecycleStatus: 'active' });
  db.docsMap.set('tenants/t2', { id: 't2', name: 'T2', lifecycleStatus: 'trialing' });
  const app = createTestApp({ authenticated: true, userRole: 'platformAdmin', db });
  const { status, body } = await doFetch(app, '/api/platform/analytics/tenants?status=trialing');
  assert.equal(status, 200);
  assert.equal(body.tenants.length, 1);
  assert.equal(body.tenants[0].lifecycleStatus, 'trialing');
});

test('33. GET /api/platform/analytics/tenants - Filters tenants by search query', async () => {
  const db = new MockAnalyticsDb();
  db.docsMap.set('tenants/t1', { id: 't1', name: 'Alpha Coffee', ownerEmail: 'owner@alpha.com' });
  db.docsMap.set('tenants/t2', { id: 't2', name: 'Zeta Fashion', ownerEmail: 'owner@zeta.com' });
  const app = createTestApp({ authenticated: true, userRole: 'platformAdmin', db });
  const { status, body } = await doFetch(app, '/api/platform/analytics/tenants?search=Alpha');
  assert.equal(status, 200);
  assert.equal(body.tenants.length, 1);
  assert.equal(body.tenants[0].name, 'Alpha Coffee');
});

test('34. GET /api/platform/analytics/tenants - Enforces maximum page limit of 100', async () => {
  const db = new MockAnalyticsDb();
  const app = createTestApp({ authenticated: true, userRole: 'platformAdmin', db });
  const { status, body } = await doFetch(app, '/api/platform/analytics/tenants?limit=500');
  assert.equal(status, 200);
  assert.equal(body.limit, 100);
});

test('35. GET /api/platform/analytics/revenue - Rejects non-super-admin request (403)', async () => {
  const app = createTestApp({ authenticated: true, userRole: 'user' });
  const { status } = await doFetch(app, '/api/platform/analytics/revenue');
  assert.equal(status, 403);
});

test('36. GET /api/platform/analytics/revenue - Returns revenue analytics breakdown', async () => {
  const db = new MockAnalyticsDb();
  db.docsMap.set('tenants/t1', {
    id: 't1',
    name: 'Shop 1',
    lifecycleStatus: 'active',
    subscription: { planId: 'starter', planName: 'Starter', status: 'active', price: 49, interval: 'monthly' },
  });
  const app = createTestApp({ authenticated: true, userRole: 'platformAdmin', db });
  const { status, body } = await doFetch(app, '/api/platform/analytics/revenue?timeframe=30d');
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.summary.mrr, 49);
  assert.ok(body.revenueByPlan);
  assert.ok(body.conversionMetrics);
  assert.ok(body.revenueTrend);
});

test('37. GET /api/platform/analytics/usage - Rejects unauthenticated request (401)', async () => {
  const app = createTestApp({ authenticated: false });
  const { status } = await doFetch(app, '/api/platform/analytics/usage');
  assert.equal(status, 401);
});

test('38. GET /api/platform/analytics/usage - Returns platform order volume and high usage tenants', async () => {
  const db = new MockAnalyticsDb();
  db.docsMap.set('tenants/t1', {
    id: 't1',
    name: 'High Usage Mart',
    lifecycleStatus: 'active',
    subscription: { planId: 'starter', status: 'active' },
  });
  db.docsMap.set('tenant_usage_meters/t1__2026-09', {
    ordersMonthly: 2400, // 96% utilization of starter limit 2500
  });
  const app = createTestApp({ authenticated: true, userRole: 'platformAdmin', db });
  const { status, body } = await doFetch(app, '/api/platform/analytics/usage?timeframe=30d');
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.ok(body.overview);
  assert.equal(body.highUsageTenants.length, 1);
  assert.equal(body.highUsageTenants[0].name, 'High Usage Mart');
  assert.equal(body.highUsageTenants[0].status, 'WARNING');
});

test('39. GET /api/platform/analytics/growth - Rejects non-super-admin request (403)', async () => {
  const app = createTestApp({ authenticated: true, userRole: 'regularUser' });
  const { status } = await doFetch(app, '/api/platform/analytics/growth');
  assert.equal(status, 403);
});

test('40. GET /api/platform/analytics/growth - Returns tenant growth summary and distribution', async () => {
  const db = new MockAnalyticsDb();
  db.docsMap.set('tenants/t1', { id: 't1', lifecycleStatus: 'active', createdAt: new Date().toISOString() });
  db.docsMap.set('tenants/t2', { id: 't2', lifecycleStatus: 'trialing', createdAt: new Date().toISOString() });
  const app = createTestApp({ authenticated: true, userRole: 'platformAdmin', db });
  const { status, body } = await doFetch(app, '/api/platform/analytics/growth?timeframe=30d');
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.summary.totalTenants, 2);
  assert.equal(body.summary.newTenantsInPeriod, 2);
  assert.equal(body.lifecycleDistribution.active, 1);
  assert.equal(body.lifecycleDistribution.trialing, 1);
  assert.ok(body.growthTrend);
});

test('41. Analytics API - Bounded pagination prevents negative page numbers', async () => {
  const db = new MockAnalyticsDb();
  const app = createTestApp({ authenticated: true, userRole: 'platformAdmin', db });
  const { status, body } = await doFetch(app, '/api/platform/analytics/tenants?page=-5');
  assert.equal(status, 200);
  assert.equal(body.page, 1);
});

test('42. Analytics API - Prevents tenant ID spoofing by requiring Super Admin auth on all analytics routes', async () => {
  const app = createTestApp({ authenticated: true, userRole: 'tenantOwner' });
  const endpoints = [
    '/api/platform/analytics/overview',
    '/api/platform/analytics/tenants',
    '/api/platform/analytics/revenue',
    '/api/platform/analytics/usage',
    '/api/platform/analytics/growth',
  ];
  for (const ep of endpoints) {
    const { status } = await doFetch(app, ep);
    assert.equal(status, 403, `Endpoint ${ep} must require Super Admin auth`);
  }
});
