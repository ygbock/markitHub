// @ts-nocheck
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import express from 'express';
import request from 'supertest';
import { registerPlatformAdminRoutes } from './platformAdminRoutes';
import {
  getPublishedPlatformConfig,
  getDraftPlatformConfig,
  updateDraftPlatformConfig,
  validatePlatformConfig,
  publishPlatformConfig,
  rollbackPlatformConfig,
  listPlatformConfigVersions,
  getPlatformConfigVersion,
  buildDefaultPlatformConfig,
  invalidatePublishedConfigCache,
} from './platformGovernanceControlPlane';
import { evaluatePlatformHealth, evaluateTenantHealthAndAlerts } from './platformHealthEngine';
import { runPlatformJob } from './platformScheduler';
import { usageMeterId, usagePeriod } from './platformUsageMeter';

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
  private db: MockGovernanceDb;
  private collectionName: string;

  constructor(db: MockGovernanceDb, name: string) {
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
            self.db.collections[self.collectionName][idx].data = {
              ...self.db.collections[self.collectionName][idx].data,
              ...data,
            };
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
          self.db.collections[self.collectionName][idx].data = {
            ...self.db.collections[self.collectionName][idx].data,
            ...data,
          };
        } else {
          self.db.collections[self.collectionName].push({ id: docId, data: { ...data } });
        }
      },
    };
  }
}

class MockGovernanceDb {
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
      async commit() {
        for (const op of operations) {
          await op();
        }
      },
    };
  }
}

describe('Super Admin Platform Governance & Configuration Control Plane', () => {
  let mockDb: MockGovernanceDb;
  let app: express.Express;

  const superAdminUser = {
    uid: 'super_admin_test_1',
    email: 'ops.superadmin@markithub.internal',
    name: 'Chief Platform Officer',
  };

  const regularTenantUser = {
    uid: 'tenant_user_1',
    email: 'merchant@store.com',
    name: 'Merchant Joe',
  };

  beforeEach(() => {
    invalidatePublishedConfigCache();
    mockDb = new MockGovernanceDb();

    // Setup collections
    mockDb.setCollection('platform_super_admins', [
      {
        id: superAdminUser.uid,
        data: {
          uid: superAdminUser.uid,
          email: superAdminUser.email,
          name: superAdminUser.name,
          isActive: true,
          role: 'Super Admin',
          assignedAt: '2026-01-01T00:00:00Z',
        },
      },
    ]);

    mockDb.setCollection('platform_governance_config', []);
    mockDb.setCollection('platform_config_versions', []);
    mockDb.setCollection('platform_audit_events', []);
    mockDb.setCollection('platform_health_evaluations', []);
    mockDb.setCollection('platform_alerts', []);
    mockDb.setCollection('tenants', []);

    const requireServerAuth: express.RequestHandler = (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'Unauthenticated' });
      }
      (req as any).user = {
        uid: authHeader === 'Bearer superadmin' ? superAdminUser.uid : regularTenantUser.uid,
        email: authHeader === 'Bearer superadmin' ? superAdminUser.email : regularTenantUser.email,
        platformAdmin: authHeader === 'Bearer superadmin',
      };
      next();
    };

    const requirePlatformAdmin: express.RequestHandler = (req, res, next) => {
      if ((req as any).user?.platformAdmin !== true) {
        return res.status(403).json({ error: 'Super Admin privileges required.' });
      }
      next();
    };

    app = express();
    app.use(express.json());

    registerPlatformAdminRoutes({
      app,
      requireServerAuth,
      requirePlatformAdmin,
      getAdminDb: () => mockDb as any,
      getAdminAuth: () => null,
    });
  });

  it('Initializes published configuration on first fetch with defaults', async () => {
    const config = await getPublishedPlatformConfig(mockDb as any);
    assert.ok(config);
    assert.equal(config.version, 1);
    assert.equal(config.status, 'published');
    assert.equal(config.globalSettings.platformName, 'MarkitHub Platform');
    assert.equal(config.billingDefaults.currency, 'USD');
    assert.equal(config.alertThresholds.warningOrdersUsagePercent, 80);
    assert.equal(config.plans.length, 3);
  });

  it('Super Admin can retrieve current configuration and draft status via API', async () => {
    const res = await request(app)
      .get('/api/platform/governance/config')
      .set('Authorization', 'Bearer superadmin');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.published);
    assert.equal(res.body.published.version, 1);
    assert.equal(res.body.published.status, 'published');
    assert.ok(res.body.validation);
    assert.equal(res.body.validation.valid, true);
  });

  it('Non-super admin cannot access governance configuration endpoint (403)', async () => {
    const res = await request(app)
      .get('/api/platform/governance/config')
      .set('Authorization', 'Bearer regular');

    assert.equal(res.status, 403);
  });

  it('Unauthenticated request is rejected (401)', async () => {
    const res = await request(app).get('/api/platform/governance/config');
    assert.equal(res.status, 401);
  });

  it('Validates configuration schemas and flags inconsistent values', () => {
    const validConfig = buildDefaultPlatformConfig(1, 'validated');
    const validResult = validatePlatformConfig(validConfig);
    assert.equal(validResult.valid, true);
    assert.equal(validResult.errors.length, 0);

    // Invalid config with critical inconsistencies
    const invalidConfig = {
      ...validConfig,
      billingDefaults: {
        ...validConfig.billingDefaults,
        defaultTrialDays: -5, // Invalid negative
      },
      alertThresholds: {
        ...validConfig.alertThresholds,
        warningOrdersUsagePercent: 95,
        criticalOrdersUsagePercent: 90, // Inconsistent: warning >= critical
      },
      schedulerPolicy: {
        ...validConfig.schedulerPolicy,
        evaluationIntervalMinutes: 0, // Invalid interval
      },
      plans: [], // Missing plans
    };

    const invalidResult = validatePlatformConfig(invalidConfig);
    assert.equal(invalidResult.valid, false);
    assert.ok(invalidResult.errors.some((e: any) => typeof e === 'string' ? e.includes('defaultTrialDays') : e?.path?.includes('defaultTrialDays')));
    assert.ok(invalidResult.errors.some((e: any) => typeof e === 'string' ? (e.includes('criticalOrdersUsagePercent') || e.includes('usageViolationThresholdPercent')) : e?.path?.includes('criticalOrdersUsagePercent')));
    assert.ok(invalidResult.errors.some((e: any) => typeof e === 'string' ? (e.includes('evaluationIntervalMinutes') || e.includes('SweepInterval')) : e?.path?.includes('evaluationIntervalMinutes')));
    assert.ok(invalidResult.errors.some((e: any) => typeof e === 'string' ? e.includes('plans') : e?.path?.includes('plans')));
  });

  it('Detects and blocks secret credentials in platform configuration', () => {
    const configWithSecret = buildDefaultPlatformConfig(1);
    configWithSecret.globalSettings.platformName = 'sk-live-1234567890abcdef1234567890';

    const result = validatePlatformConfig(configWithSecret);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e: any) => typeof e === 'string' ? e.includes('Potential secret credential') : e?.message?.includes('Potential secret credential')));
  });

  it('Super Admin can update draft configuration with validation', async () => {
    // First get current
    const getRes = await request(app)
      .get('/api/platform/governance/config')
      .set('Authorization', 'Bearer superadmin');
    const published = getRes.body.published;

    const modifiedDraft = {
      ...published,
      globalSettings: {
        ...published.globalSettings,
        supportEmail: 'escalations@markithub.com',
      },
      alertThresholds: {
        ...published.alertThresholds,
        warningOrdersUsagePercent: 85,
      },
    };

    const updateRes = await request(app)
      .put('/api/platform/governance/config/draft')
      .set('Authorization', 'Bearer superadmin')
      .send({
        candidateConfig: modifiedDraft,
        expectedVersion: published.version,
        justification: 'Draft update for testing',
      });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.success, true);
    assert.ok(updateRes.body.draft.status === 'draft' || updateRes.body.draft.status === 'validated');
    assert.equal(updateRes.body.draft.config.alertThresholds.warningOrdersUsagePercent, 85);
    assert.equal(updateRes.body.draft.config.globalSettings.supportEmail, 'escalations@markithub.com');
  });

  it('Rejects draft update with mismatched expectedVersion (Optimistic Concurrency Conflict 409)', async () => {
    const validConfig = buildDefaultPlatformConfig(1);
    const res = await request(app)
      .put('/api/platform/governance/config/draft')
      .set('Authorization', 'Bearer superadmin')
      .send({
        candidateConfig: validConfig,
        expectedVersion: 999, // mismatch
        justification: 'Mismatched version update',
      });

    assert.equal(res.status, 409);
    assert.ok(res.body.error.toLowerCase().includes('conflict'));
  });

  it('Validates configuration via explicit /validate endpoint', async () => {
    const validConfig = buildDefaultPlatformConfig(1);
    const res = await request(app)
      .post('/api/platform/governance/config/validate')
      .set('Authorization', 'Bearer superadmin')
      .send({ candidateConfig: validConfig });

    assert.equal(res.status, 200);
    assert.equal(res.body.validation.valid, true);
    assert.equal(res.body.validation.errors.length, 0);
  });

  it('Publishing requires mandatory non-empty justification', async () => {
    const validConfig = buildDefaultPlatformConfig(1);
    const res = await request(app)
      .post('/api/platform/governance/config/publish')
      .set('Authorization', 'Bearer superadmin')
      .send({
        candidateConfig: validConfig,
        expectedVersion: 1,
        justification: '   ', // Empty
      });

    assert.equal(res.status, 400);
    assert.ok(res.body.error.toLowerCase().includes('justification'));
  });

  it('Publishes new configuration, creates immutable version record, and logs authoritative audit event', async () => {
    // 1. Get current published config (v1)
    const initialConfig = await getPublishedPlatformConfig(mockDb as any);
    assert.equal(initialConfig.version, 1);

    // 2. Prepare v2 changes
    const newConfigData = {
      ...initialConfig,
      globalSettings: {
        ...initialConfig.globalSettings,
        sessionTimeoutMinutes: 45,
      },
      alertThresholds: {
        ...initialConfig.alertThresholds,
        degradedHealthScoreThreshold: 65,
      },
    };

    const publishRes = await request(app)
      .post('/api/platform/governance/config/publish')
      .set('Authorization', 'Bearer superadmin')
      .send({
        candidateConfig: newConfigData,
        expectedVersion: 1,
        justification: 'Adjusted session timeout and lowered degraded health score threshold per Q3 SLA review',
      });

    assert.equal(publishRes.status, 200);
    assert.equal(publishRes.body.success, true);
    assert.equal(publishRes.body.newVersion, 2);
    assert.equal(publishRes.body.published.version, 2);
    assert.equal(publishRes.body.published.globalSettings.sessionTimeoutMinutes, 45);
    assert.equal(publishRes.body.published.alertThresholds.degradedHealthScoreThreshold, 65);

    // 3. Verify published cache is updated
    const fetchedPublished = await getPublishedPlatformConfig(mockDb as any);
    assert.equal(fetchedPublished.version, 2);
    assert.equal(fetchedPublished.globalSettings.sessionTimeoutMinutes, 45);

    // 4. Verify version history collection has v_1 and v_2
    const versions = await listPlatformConfigVersions(mockDb as any);
    assert.equal(versions.length, 2);
    assert.equal(versions[0].version, 2);
    assert.equal(versions[1].version, 1);

    // 5. Verify authoritative audit log record
    const auditLogs = mockDb.collections['audit_logs'] || mockDb.collections['platform_audit_events'] || [];
    const publishEvent = auditLogs.find((e) => e.data.action === 'PLATFORM_CONFIG_PUBLISHED');
    assert.ok(publishEvent);
    assert.equal(publishEvent.data.targetId, 'v_2');
    assert.equal(publishEvent.data.actorEmail, superAdminUser.email);
    assert.ok(publishEvent.data.reason.includes('Q3 SLA review'));
  });

  it('Allows Super Admin to rollback to a previous version, generating a new version and audit entry', async () => {
    // 1. Initial published is v1. Publish v2 with custom threshold.
    const initial = await getPublishedPlatformConfig(mockDb as any);
    const v2Data = {
      ...initial,
      alertThresholds: {
        ...initial.alertThresholds,
        warningOrdersUsagePercent: 50,
      },
    };

    await publishPlatformConfig(
      mockDb as any,
      superAdminUser,
      'Temporary test threshold for v2',
      1,
      v2Data
    );

    const v2Published = await getPublishedPlatformConfig(mockDb as any);
    assert.equal(v2Published.version, 2);
    assert.equal(v2Published.alertThresholds.warningOrdersUsagePercent, 50);

    // 2. Perform rollback to v1
    const rollbackRes = await request(app)
      .post('/api/platform/governance/config/rollback')
      .set('Authorization', 'Bearer superadmin')
      .send({
        targetVersion: 1,
        expectedVersion: 2,
        justification: 'Reverting temporary test threshold back to production standard v1 baseline',
      });

    assert.equal(rollbackRes.status, 200);
    assert.equal(rollbackRes.body.success, true);
    assert.equal(rollbackRes.body.newVersion, 3);
    assert.equal(rollbackRes.body.published.version, 3);
    assert.equal(rollbackRes.body.published.rolledBackFromVersion, 1);
    assert.equal(rollbackRes.body.published.alertThresholds.warningOrdersUsagePercent, 80); // Restored from v1

    // 3. Historical v1 and v2 records remain intact
    const v1Record = await getPlatformConfigVersion(mockDb as any, 1);
    assert.ok(v1Record);
    assert.equal(v1Record.version, 1);

    const v2Record = await getPlatformConfigVersion(mockDb as any, 2);
    assert.ok(v2Record);
    assert.equal(v2Record.version, 2);

    // 4. Authoritative audit log contains rollback event
    const auditLogs = mockDb.collections['audit_logs'] || mockDb.collections['platform_audit_events'] || [];
    const rollbackEvent = auditLogs.find((e) => e.data.action === 'PLATFORM_CONFIG_ROLLED_BACK');
    assert.ok(rollbackEvent);
    assert.equal(rollbackEvent.data.targetId, 'v_3');
    assert.ok(rollbackEvent.data.reason.includes('baseline'));
  });

  it('Engine consumption: automated health evaluation respects featureFlags and dynamic thresholds', async () => {
    // Seed a tenant with warning usage (starter plan limit = 2500, 2125 used = 85%)
    const period = usagePeriod();
    const meterId = usageMeterId('tenant_test_health', period);

    mockDb.setCollection('tenants', [
      {
        id: 'tenant_test_health',
        data: {
          id: 'tenant_test_health',
          name: 'Health Test Tenant',
          slug: 'health-test-tenant',
          lifecycleStatus: 'active',
          provisioningStatus: 'active',
          subscription: {
            planId: 'starter',
            planName: 'Starter',
            status: 'active',
          },
        },
      },
    ]);

    mockDb.setCollection('tenant_usage_meters', [
      {
        id: meterId,
        data: {
          id: meterId,
          tenantId: 'tenant_test_health',
          period,
          ordersMonthly: 2125, // 85% of 2500
        },
      },
    ]);

    // 1. With standard config (warning threshold = 80%), tenant has 85% usage so health degradation occurs
    const result1 = await evaluatePlatformHealth(mockDb as any);
    assert.equal(result1.processedTenants, 1);
    assert.equal(result1.alertsCreated, 1);

    // 2. Now publish governance config raising warning threshold to 90%
    const current = await getPublishedPlatformConfig(mockDb as any);
    const updatedConfig = {
      ...current,
      alertThresholds: {
        ...current.alertThresholds,
        warningOrdersUsagePercent: 90,
      },
    };
    await publishPlatformConfig(
      mockDb as any,
      superAdminUser,
      'Raise usage threshold to 90%',
      current.version,
      updatedConfig
    );

    // 3. Re-evaluating now sees usage is 85% < 90%, so warning alert is NOT generated
    mockDb.setCollection('platform_alerts', []); // clear alerts
    const result2 = await evaluatePlatformHealth(mockDb as any);
    assert.equal(result2.alertsCreated, 0);

    // 4. When feature flag disables automated health evaluation
    const disabledFlagConfig = {
      ...updatedConfig,
      featureFlags: {
        ...updatedConfig.featureFlags,
        enableAutomatedHealthEvaluation: false,
      },
    };
    const currentForDisable = await getPublishedPlatformConfig(mockDb as any);
    await publishPlatformConfig(
      mockDb as any,
      superAdminUser,
      'Temporarily disable health evaluation engine',
      currentForDisable.version,
      disabledFlagConfig
    );

    const result3 = await evaluatePlatformHealth(mockDb as any);
    assert.equal(result3.processedTenants, 0);
  });

  it('Engine consumption: scheduler respects schedulerPolicy.enabled flag', async () => {
    // 1. Disable scheduler in published configuration
    const current = await getPublishedPlatformConfig(mockDb as any);
    const disabledSchedulerConfig = {
      ...current,
      schedulerPolicy: {
        ...current.schedulerPolicy,
        enabled: false,
      },
    };
    await publishPlatformConfig(
      mockDb as any,
      superAdminUser,
      'Disable platform scheduler via governance',
      current.version,
      disabledSchedulerConfig
    );

    // 2. Triggering scheduler job returns skipped result
    const jobResult = await runPlatformJob(
      mockDb as any,
      'platform_health_evaluation',
      'manual_test'
    );
    assert.equal(jobResult.status, 'skipped');
    assert.ok(jobResult.message.includes('disabled by governance'));
  });
});
