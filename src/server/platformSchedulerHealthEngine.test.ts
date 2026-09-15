// @ts-nocheck
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import express from 'express';
import request from 'supertest';
import { registerPlatformAdminRoutes } from './platformAdminRoutes';
import {
  evaluatePlatformHealth,
  evaluateTenantHealthAndAlerts,
  autoResolvePlatformAlert,
} from './platformHealthEngine';
import {
  acquireSchedulerLease,
  releaseSchedulerLease,
  getSchedulerStatus,
  runJobWithLock,
  runPlatformJob,
} from './platformScheduler';

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
      empty: this.docs.length === 0,
      docs: this.docs.map((d) => ({
        id: d.id,
        exists: true,
        ref: { id: d.id },
        data: () => ({ ...d.data }),
      })),
    };
  }
}

class MockCollection extends MockQuery {
  private db: MockSchedulerDb;
  private collectionName: string;

  constructor(db: MockSchedulerDb, name: string) {
    super(db.collections[name] || []);
    this.db = db;
    this.collectionName = name;
  }

  doc(id?: string) {
    const self = this;
    const docId = id || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    return {
      id: docId,
      async get() {
        const list = self.db.collections[self.collectionName] || [];
        const found = list.find((d) => d.id === docId);
        return {
          id: docId,
          exists: Boolean(found),
          data: () => (found ? { ...found.data } : undefined),
        };
      },
      async set(data: any, options?: { merge?: boolean }) {
        if (!self.db.collections[self.collectionName]) self.db.collections[self.collectionName] = [];
        const idx = self.db.collections[self.collectionName].findIndex((d) => d.id === docId);
        if (idx >= 0) {
          if (options?.merge) {
            self.db.collections[self.collectionName][idx].data = { ...self.db.collections[self.collectionName][idx].data, ...data };
          } else {
            self.db.collections[self.collectionName][idx].data = { ...data };
          }
        } else {
          self.db.collections[self.collectionName].push({ id: docId, data: { ...data } });
        }
      },
      async update(data: any) {
        if (!self.db.collections[self.collectionName]) self.db.collections[self.collectionName] = [];
        const idx = self.db.collections[self.collectionName].findIndex((d) => d.id === docId);
        if (idx >= 0) {
          self.db.collections[self.collectionName][idx].data = { ...self.db.collections[self.collectionName][idx].data, ...data };
        } else {
          self.db.collections[self.collectionName].push({ id: docId, data: { ...data } });
        }
      },
    };
  }
}

class MockSchedulerDb {
  public collections: Record<string, MockDoc[]> = {};

  setCollection(name: string, docs: Array<{ id: string; data: Record<string, any> }>) {
    this.collections[name] = docs.map((d) => ({ id: d.id, data: { ...d.data } }));
  }

  collection(name: string): MockCollection {
    return new MockCollection(this, name);
  }

  async runTransaction(updateFunction: (transaction: any) => Promise<any>) {
    const self = this;
    const transaction = {
      async get(docRef: any) {
        return docRef.get();
      },
      set(docRef: any, data: any, options?: any) {
        return docRef.set(data, options);
      },
      update(docRef: any, data: any) {
        return docRef.update(data);
      },
    };
    return updateFunction(transaction);
  }

  batch() {
    const operations: Array<() => Promise<void>> = [];
    return {
      set(docRef: any, data: any, options?: any) {
        operations.push(() => docRef.set(data, options));
      },
      update(docRef: any, data: any) {
        operations.push(() => docRef.update(data));
      },
      commit: async () => {
        for (const op of operations) {
          await op();
        }
      },
    };
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
      uid: 'superadmin_uid_sched',
      email: 'sched.superadmin@markithub.com',
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

describe('Automated Platform Health & Alert Evaluation + Scheduled Orchestration', () => {
  let mockDb: MockSchedulerDb;

  beforeEach(() => {
    mockDb = new MockSchedulerDb();
    mockDb.setCollection('tenants', [
      {
        id: 't_active',
        data: {
          name: 'Acme Active',
          lifecycleStatus: 'active',
          subscription: { status: 'active', planId: 'growth' },
        },
      },
      {
        id: 't_pastdue',
        data: {
          name: 'Beta Past Due',
          lifecycleStatus: 'active',
          subscription: { status: 'past_due', planId: 'starter' },
        },
      },
      {
        id: 't_prov_failed',
        data: {
          name: 'Gamma Prov Failed',
          lifecycleStatus: 'provisioning',
          provisioningStatus: 'failed',
          provisioningError: 'Database container provisioning timeout',
        },
      },
      {
        id: 't_suspended',
        data: {
          name: 'Delta Suspended',
          lifecycleStatus: 'suspended',
          suspensionReason: 'Terms violation',
        },
      },
    ]);

    mockDb.setCollection('platform_alerts', []);
    mockDb.setCollection('platform_notifications', []);
    mockDb.setCollection('audit_logs', []);
    mockDb.setCollection('platform_scheduler_locks', []);
    mockDb.setCollection('platform_scheduler_state', []);
    mockDb.setCollection('tenant_usage_meters', []);
  });

  it('1. Idempotently evaluates tenant health and creates alerts with dedupKeys', async () => {
    const sweep1 = await evaluatePlatformHealth(mockDb);
    assert.equal(sweep1.processedTenants, 4);
    assert.equal(sweep1.succeededTenants, 4);
    assert.equal(sweep1.failedTenants, 0);
    assert.ok(sweep1.alertsCreated >= 3, 'Should have created alerts for past due, provisioning failure, and suspension');

    const alertsAfter1 = mockDb.collections['platform_alerts'] || [];
    const countAfter1 = alertsAfter1.length;

    // Run health evaluation a second time: must NOT duplicate alerts!
    const sweep2 = await evaluatePlatformHealth(mockDb);
    assert.equal(sweep2.alertsCreated, 0, 'No duplicate alerts should be created on second pass');

    const alertsAfter2 = mockDb.collections['platform_alerts'] || [];
    assert.equal(alertsAfter2.length, countAfter1, 'Total alerts in database must remain identical');
  });

  it('2. Automatically resolves alerts when operational condition clears', async () => {
    // Pass 1: create alert for past due tenant
    await evaluatePlatformHealth(mockDb);
    const pastDueAlert = (mockDb.collections['platform_alerts'] || []).find(
      (a) => a.data.dedupKey === 't_pastdue_PAST_DUE_SUBSCRIPTION'
    );
    assert.ok(pastDueAlert, 'Alert should exist for past due tenant');
    assert.equal(pastDueAlert.data.status, 'OPEN');

    // Tenant pays subscription: status becomes active
    const tenantIdx = mockDb.collections['tenants'].findIndex((t) => t.id === 't_pastdue');
    mockDb.collections['tenants'][tenantIdx].data.subscription.status = 'active';

    // Pass 2: sweep should auto-resolve the alert
    const sweep2 = await evaluatePlatformHealth(mockDb);
    assert.ok(sweep2.alertsResolved >= 1, 'Should report at least 1 alert resolved');

    const resolvedAlert = (mockDb.collections['platform_alerts'] || []).find(
      (a) => a.data.dedupKey === 't_pastdue_PAST_DUE_SUBSCRIPTION'
    );
    assert.equal(resolvedAlert.data.status, 'RESOLVED');
    assert.equal(resolvedAlert.data.resolvedBy, 'system.health@markithub.internal');
    assert.ok(resolvedAlert.data.resolutionReason.includes('billing in good standing'));
    assert.equal(resolvedAlert.data.metadata.autoResolved, true);

    // Verify authoritative audit log
    const auditLogs = mockDb.collections['audit_logs'] || [];
    const resolveAudit = auditLogs.find(
      (log) => log.data.action === 'AUTOMATED_ALERT_RESOLVED' && log.data.targetId === resolvedAlert.id
    );
    assert.ok(resolveAudit, 'Authoritative audit record must be written for auto-resolved alert');
    assert.equal(resolveAudit.data.actorRole, 'Automated Platform Engine');
  });

  it('3. Resilient sweep continues even if one tenant evaluation throws an error', async () => {
    // Add a malformed tenant document
    mockDb.collections['tenants'].push({
      id: 't_corrupted',
      data: {
        name: 'Corrupted Tenant',
        get lifecycleStatus() {
          throw new Error('Synthetic Firestore Document Read Failure');
        },
      },
    });

    const sweep = await evaluatePlatformHealth(mockDb);
    assert.equal(sweep.processedTenants, 5);
    assert.equal(sweep.succeededTenants, 4);
    assert.equal(sweep.failedTenants, 1);
    assert.equal(sweep.errors.length, 1);
    assert.equal(sweep.errors[0].tenantId, 't_corrupted');

    // Audit log should capture PLATFORM_HEALTH_EVALUATION_FAILED
    const auditLogs = mockDb.collections['audit_logs'] || [];
    const failureAudit = auditLogs.find(
      (log) => log.data.action === 'PLATFORM_HEALTH_EVALUATION_FAILED' && log.data.targetId === 't_corrupted'
    );
    assert.ok(failureAudit, 'Must record audit log for tenant evaluation failure');
  });

  it('4. Distributed lease locking prevents concurrent execution across instances', async () => {
    const owner1 = 'instance_cloud_run_1';
    const owner2 = 'instance_cloud_run_2';

    // Instance 1 acquires lock
    const acquired1 = await acquireSchedulerLease(mockDb, 'health', owner1, 60000);
    assert.equal(acquired1, true, 'Instance 1 must acquire lease');

    // Instance 2 attempts to acquire lock while active: must be denied
    const acquired2 = await acquireSchedulerLease(mockDb, 'health', owner2, 60000);
    assert.equal(acquired2, false, 'Instance 2 must be rejected while lease is held by Instance 1');

    // Instance 1 releases lock
    await releaseSchedulerLease(mockDb, 'health', owner1);

    // Instance 2 attempts again: must succeed
    const acquired3 = await acquireSchedulerLease(mockDb, 'health', owner2, 60000);
    assert.equal(acquired3, true, 'Instance 2 can acquire lease after release');
  });

  it('5. Scheduler state observability tracks job metrics and duration', async () => {
    const initialStatus = await getSchedulerStatus(mockDb);
    assert.equal(initialStatus.enabled, true);
    assert.ok(initialStatus.jobs.length >= 3);

    // Run health job through scheduler wrapper
    const result = await runPlatformJob(mockDb, 'health');
    assert.equal(result.executed, true);

    // Check updated status
    const updatedStatus = await getSchedulerStatus(mockDb);
    const healthJob = updatedStatus.jobs.find((j) => j.jobName === 'health');
    assert.ok(healthJob);
    assert.equal(healthJob.status, 'healthy');
    assert.ok(healthJob.lastCompletedAt);
    assert.equal(healthJob.lastProcessedCount, 4);
    assert.ok(typeof healthJob.lastDurationMs === 'number');
  });

  it('6. API GET /api/platform/operations/scheduler enforces authentication and Super Admin authorization', async () => {
    // Unauthenticated
    const unauthApp = createTestApp({ db: mockDb, authenticated: false });
    const resUnauth = await request(unauthApp).get('/api/platform/operations/scheduler');
    assert.equal(resUnauth.status, 401);

    // Authenticated non-admin
    const nonAdminApp = createTestApp({ db: mockDb, authenticated: true, userRole: 'regular' });
    const resForbidden = await request(nonAdminApp).get('/api/platform/operations/scheduler');
    assert.equal(resForbidden.status, 403);

    // Super Admin
    const adminApp = createTestApp({ db: mockDb, authenticated: true, userRole: 'platformAdmin' });
    const resAdmin = await request(adminApp).get('/api/platform/operations/scheduler');
    assert.equal(resAdmin.status, 200);
    assert.equal(resAdmin.body.success, true);
    assert.ok(resAdmin.body.scheduler.jobs);
  });

  it('7. API POST /api/platform/operations/scheduler/run triggers manual sweeps', async () => {
    const adminApp = createTestApp({ db: mockDb, authenticated: true, userRole: 'platformAdmin' });

    // Invalid job name
    const resInvalid = await request(adminApp)
      .post('/api/platform/operations/scheduler/run')
      .send({ jobName: 'nonexistent_job' });
    assert.equal(resInvalid.status, 400);

    // Valid health sweep
    const resValid = await request(adminApp)
      .post('/api/platform/operations/scheduler/run')
      .send({ jobName: 'health' });
    assert.equal(resValid.status, 200);
    assert.equal(resValid.body.success, true);
    assert.equal(resValid.body.jobName, 'health');
    assert.equal(resValid.body.result.executed, true);
  });
});
