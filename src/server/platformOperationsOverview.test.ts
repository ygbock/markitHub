// @ts-nocheck
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import express from 'express';
import request from 'supertest';
import { registerPlatformAdminRoutes } from './platformAdminRoutes';

interface MockDoc {
  id: string;
  data: Record<string, any>;
}

class MockQuery {
  private docs: MockDoc[];

  constructor(docs: MockDoc[]) {
    this.docs = [...docs];
  }

  where(field: string, op: string, val: any): MockQuery {
    const filtered = this.docs.filter((d) => {
      const parts = field.split('.');
      let current = d.data;
      for (const part of parts) {
        if (current === undefined || current === null) break;
        current = current[part];
      }

      if (op === '==') return current === val;
      if (op === 'in') return Array.isArray(val) && val.includes(current);
      if (op === '>=') return current >= val;
      if (op === '<=') return current <= val;
      return true;
    });
    return new MockQuery(filtered);
  }

  orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): MockQuery {
    const sorted = [...this.docs].sort((a, b) => {
      const valA = a.data[field] || '';
      const valB = b.data[field] || '';
      if (valA < valB) return dir === 'desc' ? 1 : -1;
      if (valA > valB) return dir === 'desc' ? -1 : 1;
      return 0;
    });
    return new MockQuery(sorted);
  }

  limit(n: number): MockQuery {
    return new MockQuery(this.docs.slice(0, n));
  }

  count() {
    const self = this;
    return {
      async get() {
        return {
          data: () => ({ count: self.docs.length }),
        };
      },
    };
  }

  async get() {
    return {
      size: this.docs.length,
      docs: this.docs.map((d) => ({
        id: d.id,
        data: () => ({ ...d.data }),
      })),
    };
  }
}

class MockOperationsDb {
  private collections: Record<string, MockDoc[]> = {};

  setCollection(name: string, docs: Array<{ id: string; data: Record<string, any> }>) {
    this.collections[name] = docs.map((d) => ({ id: d.id, data: { ...d.data } }));
  }

  collection(name: string): MockQuery {
    return new MockQuery(this.collections[name] || []);
  }
}

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
      uid: 'superadmin_uid_ops',
      email: 'ops.superadmin@markithub.com',
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

describe('Super Admin Platform Operations Center Integration', () => {
  let mockDb: MockOperationsDb;

  beforeEach(() => {
    mockDb = new MockOperationsDb();

    // Populate mock tenants
    mockDb.setCollection('tenants', [
      { id: 't1', data: { name: 'Tenant 1', lifecycleStatus: 'active', subscription: { status: 'active' } } },
      { id: 't2', data: { name: 'Tenant 2', lifecycleStatus: 'provisioning', subscription: { status: 'trialing' } } },
      { id: 't3', data: { name: 'Tenant 3', lifecycleStatus: 'provisioning', subscription: { status: 'trialing' } } },
      { id: 't4', data: { name: 'Tenant 4', lifecycleStatus: 'suspended', subscription: { status: 'past_due' } } },
      { id: 't5', data: { name: 'Tenant 5', lifecycleStatus: 'active', subscription: { status: 'past_due' } } },
    ]);

    // Populate tenant usage meters
    mockDb.setCollection('tenant_usage_meters', [
      { id: 't1', data: { tenantId: 't1', ordersMonthly: { state: 'normal' } } },
      { id: 't2', data: { tenantId: 't2', ordersMonthly: { state: 'warning' } } },
      { id: 't3', data: { tenantId: 't3', usageState: 'exceeded' } },
    ]);

    // Populate platform alerts
    mockDb.setCollection('platform_alerts', [
      { id: 'a1', data: { alertId: 'a1', status: 'OPEN', title: 'Payment failed', metadata: { escalated: true } } },
      { id: 'a2', data: { alertId: 'a2', status: 'ACKNOWLEDGED', title: 'Usage approaching limit', metadata: {} } },
      { id: 'a3', data: { alertId: 'a3', status: 'RESOLVED', title: 'Resolved issue', metadata: {} } },
    ]);

    // Populate platform notifications
    mockDb.setCollection('platform_notifications', [
      { id: 'n1', data: { read: false, title: 'Alert 1' } },
      { id: 'n2', data: { read: false, title: 'Alert 2' } },
      { id: 'n3', data: { read: true, title: 'Alert 3' } },
    ]);

    // Populate audit logs
    mockDb.setCollection('audit_logs', [
      {
        id: 'aud_1',
        data: {
          action: 'TENANT_PROVISIONED',
          tenantId: 't1',
          tenantName: 'Tenant 1',
          module: 'PROVISIONING',
          timestamp: '2026-09-15T15:00:00.000Z',
        },
      },
      {
        id: 'aud_2',
        data: {
          action: 'ALERT_ESCALATED',
          tenantId: 't4',
          tenantName: 'Tenant 4',
          module: 'NOTIFICATIONS',
          timestamp: '2026-09-15T14:30:00.000Z',
        },
      },
    ]);
  });

  it('1. GET /api/platform/operations/overview - Rejects unauthenticated requests with 401', async () => {
    const app = createTestApp({ db: mockDb, authenticated: false });
    const res = await request(app).get('/api/platform/operations/overview');
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/platform/operations/overview - Rejects non-platform-admin requests with 403', async () => {
    const app = createTestApp({ db: mockDb, authenticated: true, userRole: 'storeOwner' });
    const res = await request(app).get('/api/platform/operations/overview');
    assert.strictEqual(res.status, 403);
  });

  it('3. GET /api/platform/operations/overview - Returns 503 if database is not configured', async () => {
    const app = createTestApp({ db: null, authenticated: true, userRole: 'platformAdmin' });
    const res = await request(app).get('/api/platform/operations/overview');
    assert.strictEqual(res.status, 503);
  });

  it('4. GET /api/platform/operations/overview - Computes accurate cross-control-plane KPIs', async () => {
    const app = createTestApp({ db: mockDb, authenticated: true, userRole: 'platformAdmin' });
    const res = await request(app).get('/api/platform/operations/overview');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.generatedAt);

    const kpis = res.body.kpis;
    assert.strictEqual(kpis.tenants, 5);
    assert.strictEqual(kpis.provisioning, 2);
    assert.strictEqual(kpis.suspended, 1);
    assert.strictEqual(kpis.pastDue, 2);
    assert.strictEqual(kpis.usageRisk, 2); // t2 (warning) + t3 (exceeded)
    assert.strictEqual(kpis.openAlerts, 2); // a1 (OPEN) + a2 (ACKNOWLEDGED)
    assert.strictEqual(kpis.unreadNotifications, 2); // n1 + n2
    assert.strictEqual(kpis.escalatedIncidents, 1); // a1 (escalated: true)
  });

  it('5. GET /api/platform/operations/overview - Returns operational exception queues with target tabs', async () => {
    const app = createTestApp({ db: mockDb, authenticated: true, userRole: 'platformAdmin' });
    const res = await request(app).get('/api/platform/operations/overview');

    assert.strictEqual(res.status, 200);
    const exceptions = res.body.exceptions;
    assert.ok(Array.isArray(exceptions));
    assert.strictEqual(exceptions.length, 5);

    const provisioningEx = exceptions.find((e: any) => e.key === 'provisioning');
    assert.ok(provisioningEx);
    assert.strictEqual(provisioningEx.count, 2);
    assert.strictEqual(provisioningEx.tab, 'tenants');

    const billingEx = exceptions.find((e: any) => e.key === 'past_due');
    assert.ok(billingEx);
    assert.strictEqual(billingEx.count, 2);
    assert.strictEqual(billingEx.tab, 'billing');

    const usageEx = exceptions.find((e: any) => e.key === 'usage_risk');
    assert.ok(usageEx);
    assert.strictEqual(usageEx.count, 2);
    assert.strictEqual(usageEx.tab, 'analytics_usage');

    const incidentsEx = exceptions.find((e: any) => e.key === 'incidents');
    assert.ok(incidentsEx);
    assert.strictEqual(incidentsEx.count, 2);
    assert.strictEqual(incidentsEx.tab, 'alerts');

    const escalationsEx = exceptions.find((e: any) => e.key === 'escalations');
    assert.ok(escalationsEx);
    assert.strictEqual(escalationsEx.count, 1);
    assert.strictEqual(escalationsEx.tab, 'notifications');
  });

  it('6. GET /api/platform/operations/overview - Returns formatted recent operational activity stream', async () => {
    const app = createTestApp({ db: mockDb, authenticated: true, userRole: 'platformAdmin' });
    const res = await request(app).get('/api/platform/operations/overview');

    assert.strictEqual(res.status, 200);
    const activity = res.body.recentActivity;
    assert.ok(Array.isArray(activity));
    assert.strictEqual(activity.length, 2);

    assert.strictEqual(activity[0].id, 'aud_1');
    assert.strictEqual(activity[0].action, 'TENANT_PROVISIONED');
    assert.strictEqual(activity[0].tenantId, 't1');
    assert.strictEqual(activity[0].tenantName, 'Tenant 1');
    assert.strictEqual(activity[0].module, 'PROVISIONING');

    assert.strictEqual(activity[1].id, 'aud_2');
    assert.strictEqual(activity[1].action, 'ALERT_ESCALATED');
  });

  it('7. GET /api/platform/operations/overview - Handles empty collections gracefully', async () => {
    const emptyDb = new MockOperationsDb();
    const app = createTestApp({ db: emptyDb, authenticated: true, userRole: 'platformAdmin' });
    const res = await request(app).get('/api/platform/operations/overview');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.kpis.tenants, 0);
    assert.strictEqual(res.body.kpis.provisioning, 0);
    assert.strictEqual(res.body.kpis.suspended, 0);
    assert.strictEqual(res.body.kpis.pastDue, 0);
    assert.strictEqual(res.body.kpis.usageRisk, 0);
    assert.strictEqual(res.body.kpis.openAlerts, 0);
    assert.strictEqual(res.body.kpis.unreadNotifications, 0);
    assert.strictEqual(res.body.kpis.escalatedIncidents, 0);
    assert.strictEqual(res.body.recentActivity.length, 0);
  });
});
