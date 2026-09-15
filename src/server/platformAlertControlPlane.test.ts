// @ts-nocheck
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

function expect(actual: any) {
  const matcher = (negated = false) => ({
    toBe: (expected: any) => {
      if (negated) assert.notStrictEqual(actual, expected);
      else assert.strictEqual(actual, expected);
    },
    toEqual: (expected: any) => {
      if (negated) assert.notDeepStrictEqual(actual, expected);
      else assert.deepStrictEqual(actual, expected);
    },
    toBeDefined: () => {
      if (negated) assert.strictEqual(actual, undefined);
      else assert.notStrictEqual(actual, undefined);
    },
    toBeUndefined: () => {
      if (negated) assert.notStrictEqual(actual, undefined);
      else assert.strictEqual(actual, undefined);
    },
    toBeNull: () => {
      if (negated) assert.notStrictEqual(actual, null);
      else assert.strictEqual(actual, null);
    },
    toBeTruthy: () => {
      if (negated) assert.ok(!Boolean(actual));
      else assert.ok(Boolean(actual));
    },
    toBeFalsy: () => {
      if (negated) assert.ok(Boolean(actual));
      else assert.ok(!Boolean(actual));
    },
    toBeGreaterThan: (n: number) => {
      if (negated) assert.ok(actual <= n);
      else assert.ok(actual > n, `expected ${actual} > ${n}`);
    },
    toBeGreaterThanOrEqual: (n: number) => {
      if (negated) assert.ok(actual < n);
      else assert.ok(actual >= n, `expected ${actual} >= ${n}`);
    },
    toBeLessThan: (n: number) => {
      if (negated) assert.ok(actual >= n);
      else assert.ok(actual < n, `expected ${actual} < ${n}`);
    },
    toBeLessThanOrEqual: (n: number) => {
      if (negated) assert.ok(actual > n);
      else assert.ok(actual <= n, `expected ${actual} <= ${n}`);
    },
    toHaveLength: (len: number) => {
      if (negated) assert.notStrictEqual(actual?.length, len);
      else assert.strictEqual(actual?.length, len);
    },
    toBeInstanceOf: (cls: any) => {
      if (negated) assert.ok(!(actual instanceof cls));
      else assert.ok(actual instanceof cls);
    },
    toContain: (item: any) => {
      const contains = (typeof actual === 'string' || Array.isArray(actual))
        ? actual.includes(item)
        : (item in actual);
      if (negated) assert.ok(!contains, `expected not to contain ${item}`);
      else assert.ok(contains, `expected to contain ${item}`);
    },
    toThrow: (regExpOrMsg?: any) => {
      if (negated) {
        assert.doesNotThrow(actual);
      } else {
        if (typeof regExpOrMsg === 'string') {
          assert.throws(actual, (err: any) => err?.message?.includes(regExpOrMsg) ?? true);
        } else if (regExpOrMsg instanceof RegExp) {
          assert.throws(actual, regExpOrMsg);
        } else {
          assert.throws(actual);
        }
      }
    },
  });

  return {
    ...matcher(false),
    not: matcher(true),
    rejects: {
      toThrow: async (regExpOrMsg?: any) => {
        if (typeof regExpOrMsg === 'string') {
          await assert.rejects(actual, (err: any) => err?.message?.includes(regExpOrMsg) ?? true);
        } else if (regExpOrMsg instanceof RegExp) {
          await assert.rejects(actual, regExpOrMsg);
        } else {
          await assert.rejects(actual);
        }
      },
    },
  };
}
import { registerPlatformAdminRoutes } from './platformAdminRoutes';
import {
  acknowledgePlatformAlert,
  createPlatformAlert,
  dismissPlatformAlert,
  evaluateTenantAlerts,
  getPlatformAlertDetail,
  getPlatformAlerts,
  getPlatformAlertSummary,
  inferAlertSeverity,
  resolvePlatformAlert,
} from './platformAlertControlPlane';

function createMockFirestore() {
  const collections: Record<string, Map<string, any>> = {};

  const getCollection = (name: string) => {
    if (!collections[name]) collections[name] = new Map();
    return collections[name];
  };

  const createQuerySnapshot = (docsArray: any[]) => ({
    empty: docsArray.length === 0,
    size: docsArray.length,
    docs: docsArray.map(docData => ({
      id: docData.alertId || docData.id || docData.tenantId,
      exists: true,
      data: () => docData,
    })),
  });

  return {
    _collections: collections,
    collection(name: string) {
      const col = getCollection(name);
      return {
        doc(id: string) {
          return {
            id,
            async get() {
              const data = col.get(id);
              return {
                id,
                exists: Boolean(data),
                data: () => data,
              };
            },
            async set(data: any, options?: any) {
              if (options?.merge && col.has(id)) {
                const existing = col.get(id);
                col.set(id, { ...existing, ...data });
              } else {
                col.set(id, data);
              }
            },
          };
        },
        where(field: string, op: string, value: any) {
          const filterDocs = () => {
            const results: any[] = [];
            for (const doc of col.values()) {
              const val = doc[field];
              if (op === '==' && val === value) results.push(doc);
              else if (op === 'in' && Array.isArray(value) && value.includes(val)) results.push(doc);
            }
            return results;
          };

          return {
            where(field2: string, op2: string, value2: any) {
              const docs1 = filterDocs();
              const filtered = docs1.filter(doc => {
                const val = doc[field2];
                if (op2 === '==' && val === value2) return true;
                if (op2 === 'in' && Array.isArray(value2) && value2.includes(val)) return true;
                return false;
              });
              return {
                limit(n: number) {
                  return {
                    async get() {
                      return createQuerySnapshot(filtered.slice(0, n));
                    },
                  };
                },
                async get() {
                  return createQuerySnapshot(filtered);
                },
              };
            },
            orderBy() {
              return {
                limit(n: number) {
                  return {
                    async get() {
                      return createQuerySnapshot(filterDocs().slice(0, n));
                    },
                  };
                },
                async get() {
                  return createQuerySnapshot(filterDocs());
                },
              };
            },
            limit(n: number) {
              return {
                async get() {
                  return createQuerySnapshot(filterDocs().slice(0, n));
                },
              };
            },
            async get() {
              return createQuerySnapshot(filterDocs());
            },
          };
        },
        orderBy() {
          return {
            limit(n: number) {
              return {
                async get() {
                  const docsArray = Array.from(col.values());
                  return createQuerySnapshot(docsArray.slice(0, n));
                },
              };
            },
            async get() {
              return createQuerySnapshot(Array.from(col.values()));
            },
          };
        },
        limit(n: number) {
          return {
            async get() {
              return createQuerySnapshot(Array.from(col.values()).slice(0, n));
            },
          };
        },
        async get() {
          return createQuerySnapshot(Array.from(col.values()));
        },
      };
    },
    batch() {
      const operations: Array<() => void> = [];
      return {
        set(docRef: any, data: any, options?: any) {
          operations.push(() => {
            docRef.set(data, options);
          });
        },
        async commit() {
          for (const op of operations) op();
        },
      };
    },
  };
}

describe('Super Admin Alert & Incident Control Plane', () => {
  let db: any;
  let app: express.Express;

  beforeEach(() => {
    db = createMockFirestore();
    app = express();
    app.use(express.json());

    // Mock middleware
    const mockAuth = (req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'Unauthenticated' });
      if (authHeader === 'Bearer user-token') {
        req.user = { uid: 'user_1', email: 'user@tenant.com', role: 'Tenant Staff' };
        return next();
      }
      if (authHeader === 'Bearer admin-token') {
        req.user = { uid: 'admin_1', email: 'superadmin@markithub.internal', role: 'Super Admin' };
        return next();
      }
      return res.status(401).json({ error: 'Invalid token' });
    };

    const mockAdminOnly = (req: any, res: any, next: any) => {
      if (req.user?.role !== 'Super Admin') {
        return res.status(403).json({ error: 'Super Admin permission required.' });
      }
      next();
    };

    registerPlatformAdminRoutes({
      app,
      requireServerAuth: mockAuth,
      requirePlatformAdmin: mockAdminOnly,
      getAdminDb: () => db,
      getAdminAuth: () => ({}),
    });
  });

  // =========================================================================
  // 1. Authorization & RBAC Checks (12 Tests)
  // =========================================================================
  describe('Authorization & RBAC Restrictions', () => {
    it('1. GET /api/platform/alerts - Rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/platform/alerts');
      expect(res.status).toBe(401);
    });

    it('2. GET /api/platform/alerts - Rejects non-super-admin with 403', async () => {
      const res = await request(app).get('/api/platform/alerts').set('Authorization', 'Bearer user-token');
      expect(res.status).toBe(403);
    });

    it('3. GET /api/platform/alerts/summary - Rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/platform/alerts/summary');
      expect(res.status).toBe(401);
    });

    it('4. GET /api/platform/alerts/summary - Rejects non-super-admin with 403', async () => {
      const res = await request(app).get('/api/platform/alerts/summary').set('Authorization', 'Bearer user-token');
      expect(res.status).toBe(403);
    });

    it('5. GET /api/platform/alerts/:alertId - Rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/platform/alerts/alt_123');
      expect(res.status).toBe(401);
    });

    it('6. GET /api/platform/alerts/:alertId - Rejects non-super-admin with 403', async () => {
      const res = await request(app).get('/api/platform/alerts/alt_123').set('Authorization', 'Bearer user-token');
      expect(res.status).toBe(403);
    });

    it('7. PATCH /api/platform/alerts/:alertId/acknowledge - Rejects unauthenticated with 401', async () => {
      const res = await request(app).patch('/api/platform/alerts/alt_123/acknowledge').send({ reason: 'Valid reason' });
      expect(res.status).toBe(401);
    });

    it('8. PATCH /api/platform/alerts/:alertId/acknowledge - Rejects non-super-admin with 403', async () => {
      const res = await request(app)
        .patch('/api/platform/alerts/alt_123/acknowledge')
        .set('Authorization', 'Bearer user-token')
        .send({ reason: 'Valid reason' });
      expect(res.status).toBe(403);
    });

    it('9. PATCH /api/platform/alerts/:alertId/resolve - Rejects unauthenticated with 401', async () => {
      const res = await request(app).patch('/api/platform/alerts/alt_123/resolve').send({ reason: 'Valid reason' });
      expect(res.status).toBe(401);
    });

    it('10. PATCH /api/platform/alerts/:alertId/resolve - Rejects non-super-admin with 403', async () => {
      const res = await request(app)
        .patch('/api/platform/alerts/alt_123/resolve')
        .set('Authorization', 'Bearer user-token')
        .send({ reason: 'Valid reason' });
      expect(res.status).toBe(403);
    });

    it('11. PATCH /api/platform/alerts/:alertId/dismiss - Rejects unauthenticated with 401', async () => {
      const res = await request(app).patch('/api/platform/alerts/alt_123/dismiss').send({ reason: 'Valid reason' });
      expect(res.status).toBe(401);
    });

    it('12. PATCH /api/platform/alerts/:alertId/dismiss - Rejects non-super-admin with 403', async () => {
      const res = await request(app)
        .patch('/api/platform/alerts/alt_123/dismiss')
        .set('Authorization', 'Bearer user-token')
        .send({ reason: 'Valid reason' });
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 2. Alert Creation & Deduplication (4 Tests)
  // =========================================================================
  describe('Alert Creation & Deduplication Logic', () => {
    it('13. createPlatformAlert - Successfully creates a new OPEN alert document', async () => {
      const { alert, isNew } = await createPlatformAlert(db, {
        tenantId: 'tenant_test1',
        tenantName: 'Test Merchant',
        type: 'PROVISIONING_FAILURE',
        title: 'Provisioning Failed',
        description: 'Failed to provision tenant resources.',
        source: 'provisioning',
      });

      expect(isNew).toBe(true);
      expect(alert.status).toBe('OPEN');
      expect(alert.severity).toBe('CRITICAL');
      expect(alert.tenantId).toBe('tenant_test1');

      const savedDoc = await db.collection('platform_alerts').doc(alert.alertId).get();
      expect(savedDoc.exists).toBe(true);
    });

    it('14. createPlatformAlert - Deduplicates when OPEN alert with same dedupKey exists', async () => {
      const first = await createPlatformAlert(db, {
        tenantId: 'tenant_dup',
        type: 'PAST_DUE_SUBSCRIPTION',
        title: 'Past Due Payment',
        description: 'First attempt',
        source: 'billing',
        dedupKey: 'tenant_dup_PAST_DUE',
      });
      expect(first.isNew).toBe(true);

      const second = await createPlatformAlert(db, {
        tenantId: 'tenant_dup',
        type: 'PAST_DUE_SUBSCRIPTION',
        title: 'Past Due Payment Updated',
        description: 'Second attempt',
        source: 'billing',
        dedupKey: 'tenant_dup_PAST_DUE',
      });

      expect(second.isNew).toBe(false);
      expect(second.alert.alertId).toBe(first.alert.alertId);
    });

    it('15. createPlatformAlert - Creates new alert if existing alert with same dedupKey is RESOLVED', async () => {
      const first = await createPlatformAlert(db, {
        tenantId: 'tenant_resolved',
        type: 'USAGE_LIMIT_APPROACHING',
        title: 'Usage Limit Approaching',
        description: 'Old alert',
        source: 'usage',
        dedupKey: 'tenant_resolved_LIMIT',
      });

      await resolvePlatformAlert(db, first.alert.alertId, { uid: 'admin_1' }, 'Resolved previous limit breach');

      const second = await createPlatformAlert(db, {
        tenantId: 'tenant_resolved',
        type: 'USAGE_LIMIT_APPROACHING',
        title: 'Usage Limit Approaching New',
        description: 'New alert',
        source: 'usage',
        dedupKey: 'tenant_resolved_LIMIT',
      });

      expect(second.isNew).toBe(true);
      expect(second.alert.alertId).not.toBe(first.alert.alertId);
    });

    it('16. createPlatformAlert - Creates new alert if existing alert with same dedupKey is DISMISSED', async () => {
      const first = await createPlatformAlert(db, {
        tenantId: 'tenant_dismissed',
        type: 'TRIAL_EXPIRING_SOON',
        title: 'Trial Expiring',
        description: 'Old trial alert',
        source: 'billing',
        dedupKey: 'tenant_dismissed_TRIAL',
      });

      await dismissPlatformAlert(db, first.alert.alertId, { uid: 'admin_1' }, 'Dismissed trial notification');

      const second = await createPlatformAlert(db, {
        tenantId: 'tenant_dismissed',
        type: 'TRIAL_EXPIRING_SOON',
        title: 'Trial Expiring Again',
        description: 'New trial alert',
        source: 'billing',
        dedupKey: 'tenant_dismissed_TRIAL',
      });

      expect(second.isNew).toBe(true);
    });
  });

  // =========================================================================
  // 3. Severity Classification Rules (11 Tests)
  // =========================================================================
  describe('Alert Severity Inference', () => {
    it('17. Maps PROVISIONING_FAILURE to CRITICAL', () => {
      expect(inferAlertSeverity('PROVISIONING_FAILURE')).toBe('CRITICAL');
    });

    it('18. Maps PAYMENT_FAILURE to CRITICAL', () => {
      expect(inferAlertSeverity('PAYMENT_FAILURE')).toBe('CRITICAL');
    });

    it('19. Maps SECURITY_ANOMALY to CRITICAL', () => {
      expect(inferAlertSeverity('SECURITY_ANOMALY')).toBe('CRITICAL');
    });

    it('20. Maps UNEXPECTED_SUSPENSION to CRITICAL', () => {
      expect(inferAlertSeverity('UNEXPECTED_SUSPENSION')).toBe('CRITICAL');
    });

    it('21. Maps USAGE_LIMIT_VIOLATION to CRITICAL', () => {
      expect(inferAlertSeverity('USAGE_LIMIT_VIOLATION')).toBe('CRITICAL');
    });

    it('22. Maps USAGE_LIMIT_APPROACHING to WARNING', () => {
      expect(inferAlertSeverity('USAGE_LIMIT_APPROACHING')).toBe('WARNING');
    });

    it('23. Maps TRIAL_EXPIRING_SOON to WARNING', () => {
      expect(inferAlertSeverity('TRIAL_EXPIRING_SOON')).toBe('WARNING');
    });

    it('24. Maps PAST_DUE_SUBSCRIPTION to WARNING', () => {
      expect(inferAlertSeverity('PAST_DUE_SUBSCRIPTION')).toBe('WARNING');
    });

    it('25. Maps HEALTH_AT_RISK to WARNING', () => {
      expect(inferAlertSeverity('HEALTH_AT_RISK')).toBe('WARNING');
    });

    it('26. Maps PROVISIONING_DELAYED to WARNING', () => {
      expect(inferAlertSeverity('PROVISIONING_DELAYED')).toBe('WARNING');
    });

    it('27. Maps informational event types to INFO', () => {
      expect(inferAlertSeverity('TENANT_PROVISIONED')).toBe('INFO');
      expect(inferAlertSeverity('TENANT_ACTIVATED')).toBe('INFO');
      expect(inferAlertSeverity('PLAN_CHANGED')).toBe('INFO');
      expect(inferAlertSeverity('SUBSCRIPTION_RENEWED')).toBe('INFO');
      expect(inferAlertSeverity('USAGE_OVERRIDE_CHANGED')).toBe('INFO');
    });
  });

  // =========================================================================
  // 4. Alert Lifecycle Mutations & Mandatory Justification (9 Tests)
  // =========================================================================
  describe('Alert Mutations & Mandatory Reasons', () => {
    it('28. acknowledgePlatformAlert - Transitions OPEN -> ACKNOWLEDGED with valid reason', async () => {
      const { alert } = await createPlatformAlert(db, {
        tenantId: 'tenant_ack',
        type: 'HEALTH_AT_RISK',
        title: 'Health At Risk',
        description: 'Health score dropped',
        source: 'analytics',
      });

      const updated = await acknowledgePlatformAlert(
        db,
        alert.alertId,
        { uid: 'admin_1', email: 'admin@markithub.internal', role: 'Super Admin' },
        'Investigating health drop'
      );

      expect(updated.status).toBe('ACKNOWLEDGED');
      expect(updated.acknowledgedBy).toBe('admin@markithub.internal');
      expect(updated.resolutionHistory).toHaveLength(1);
      expect(updated.resolutionHistory?.[0].reason).toBe('Investigating health drop');
    });

    it('29. acknowledgePlatformAlert - Throws 400 when reason is empty or missing', async () => {
      const { alert } = await createPlatformAlert(db, {
        tenantId: 'tenant_ack_err',
        type: 'HEALTH_AT_RISK',
        title: 'Health At Risk',
        description: 'Health score dropped',
        source: 'analytics',
      });

      await expect(
        acknowledgePlatformAlert(db, alert.alertId, { uid: 'admin_1' }, '   ')
      ).rejects.toThrow('Mandatory administrative reason is required.');
    });

    it('30. resolvePlatformAlert - Transitions OPEN -> RESOLVED with valid reason', async () => {
      const { alert } = await createPlatformAlert(db, {
        tenantId: 'tenant_res',
        type: 'USAGE_LIMIT_VIOLATION',
        title: 'Quota Exceeded',
        description: 'Tenant reached limit',
        source: 'usage',
      });

      const updated = await resolvePlatformAlert(
        db,
        alert.alertId,
        { uid: 'admin_1', email: 'superadmin@markithub.internal' },
        'Upgraded tenant plan to Professional'
      );

      expect(updated.status).toBe('RESOLVED');
      expect(updated.resolvedBy).toBe('superadmin@markithub.internal');
      expect(updated.resolutionReason).toBe('Upgraded tenant plan to Professional');
    });

    it('31. resolvePlatformAlert - Throws 400 when reason is missing', async () => {
      const { alert } = await createPlatformAlert(db, {
        tenantId: 'tenant_res_err',
        type: 'USAGE_LIMIT_VIOLATION',
        title: 'Quota Exceeded',
        description: 'Tenant reached limit',
        source: 'usage',
      });

      await expect(
        resolvePlatformAlert(db, alert.alertId, { uid: 'admin_1' }, '')
      ).rejects.toThrow('Mandatory administrative reason is required.');
    });

    it('32. dismissPlatformAlert - Transitions OPEN -> DISMISSED with valid reason', async () => {
      const { alert } = await createPlatformAlert(db, {
        tenantId: 'tenant_dism',
        type: 'TRIAL_EXPIRING_SOON',
        title: 'Trial Expiring',
        description: 'Trial ending',
        source: 'billing',
      });

      const updated = await dismissPlatformAlert(
        db,
        alert.alertId,
        { uid: 'admin_1', email: 'superadmin@markithub.internal' },
        'Tenant confirmed manual wire payment'
      );

      expect(updated.status).toBe('DISMISSED');
      expect(updated.dismissedBy).toBe('superadmin@markithub.internal');
      expect(updated.resolutionReason).toBe('Tenant confirmed manual wire payment');
    });

    it('33. dismissPlatformAlert - Throws 400 when reason is whitespace only', async () => {
      const { alert } = await createPlatformAlert(db, {
        tenantId: 'tenant_dism_err',
        type: 'TRIAL_EXPIRING_SOON',
        title: 'Trial Expiring',
        description: 'Trial ending',
        source: 'billing',
      });

      await expect(
        dismissPlatformAlert(db, alert.alertId, { uid: 'admin_1' }, '   \n \t ')
      ).rejects.toThrow('Mandatory administrative reason is required.');
    });

    it('34. PATCH /api/platform/alerts/:alertId/acknowledge via HTTP - Success with mandatory reason', async () => {
      const { alert } = await createPlatformAlert(db, {
        tenantId: 'tenant_http_ack',
        type: 'PAST_DUE_SUBSCRIPTION',
        title: 'Past Due Subscription',
        description: 'Renewal payment failed',
        source: 'billing',
      });

      const res = await request(app)
        .patch(`/api/platform/alerts/${alert.alertId}/acknowledge`)
        .set('Authorization', 'Bearer admin-token')
        .send({ reason: 'Contacting tenant billing department' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.alert.status).toBe('ACKNOWLEDGED');
    });

    it('35. PATCH /api/platform/alerts/:alertId/resolve via HTTP - Rejects missing reason with 400', async () => {
      const { alert } = await createPlatformAlert(db, {
        tenantId: 'tenant_http_res_err',
        type: 'PAST_DUE_SUBSCRIPTION',
        title: 'Past Due Subscription',
        description: 'Renewal payment failed',
        source: 'billing',
      });

      const res = await request(app)
        .patch(`/api/platform/alerts/${alert.alertId}/resolve`)
        .set('Authorization', 'Bearer admin-token')
        .send({ reason: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Mandatory administrative reason is required.');
    });

    it('36. Returns 404 when mutating a non-existent alertId', async () => {
      const res = await request(app)
        .patch('/api/platform/alerts/non_existent_alert/resolve')
        .set('Authorization', 'Bearer admin-token')
        .send({ reason: 'Attempting to resolve ghost alert' });

      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // 5. Atomic Audit Trail Integrity (3 Tests)
  // =========================================================================
  describe('Atomic Audit Log Generation', () => {
    it('37. Acknowledge atomically writes ALERT_ACKNOWLEDGED to audit_logs', async () => {
      const { alert } = await createPlatformAlert(db, {
        tenantId: 'tenant_audit_1',
        type: 'SECURITY_ANOMALY',
        title: 'Security Anomaly Detected',
        description: 'Multiple failed logins',
        source: 'security',
      });

      await acknowledgePlatformAlert(
        db,
        alert.alertId,
        { uid: 'admin_1', email: 'secadmin@markithub.internal', role: 'Super Admin' },
        'Acknowledged security event'
      );

      const logsSnap = await db.collection('audit_logs').where('action', '==', 'ALERT_ACKNOWLEDGED').get();
      expect(logsSnap.empty).toBe(false);
      const auditData = logsSnap.docs[0].data();
      expect(auditData.targetId).toBe(alert.alertId);
      expect(auditData.reason).toBe('Acknowledged security event');
      expect(auditData.actorEmail).toBe('secadmin@markithub.internal');
    });

    it('38. Resolve atomically writes ALERT_RESOLVED to audit_logs', async () => {
      const { alert } = await createPlatformAlert(db, {
        tenantId: 'tenant_audit_2',
        type: 'UNEXPECTED_SUSPENSION',
        title: 'Tenant Suspended',
        description: 'Tenant access blocked',
        source: 'lifecycle',
      });

      await resolvePlatformAlert(
        db,
        alert.alertId,
        { uid: 'admin_1', email: 'superadmin@markithub.internal' },
        'Re-activated tenant after compliance review'
      );

      const logsSnap = await db.collection('audit_logs').where('action', '==', 'ALERT_RESOLVED').get();
      expect(logsSnap.empty).toBe(false);
      const auditData = logsSnap.docs[0].data();
      expect(auditData.targetId).toBe(alert.alertId);
      expect(auditData.reason).toBe('Re-activated tenant after compliance review');
    });

    it('39. Dismiss atomically writes ALERT_DISMISSED to audit_logs', async () => {
      const { alert } = await createPlatformAlert(db, {
        tenantId: 'tenant_audit_3',
        type: 'USAGE_LIMIT_APPROACHING',
        title: 'Usage Limit Approaching',
        description: 'Usage at 85%',
        source: 'usage',
      });

      await dismissPlatformAlert(
        db,
        alert.alertId,
        { uid: 'admin_1', email: 'superadmin@markithub.internal' },
        'False positive notification'
      );

      const logsSnap = await db.collection('audit_logs').where('action', '==', 'ALERT_DISMISSED').get();
      expect(logsSnap.empty).toBe(false);
      const auditData = logsSnap.docs[0].data();
      expect(auditData.targetId).toBe(alert.alertId);
      expect(auditData.reason).toBe('False positive notification');
    });
  });

  // =========================================================================
  // 6. Filtering, Search & Bounded Pagination (6 Tests)
  // =========================================================================
  describe('Alert Queries, Summary & Detail Enriched Bundles', () => {
    it('40. GET /api/platform/alerts - Filters by severity and status', async () => {
      await createPlatformAlert(db, {
        tenantId: 't1',
        type: 'PROVISIONING_FAILURE',
        title: 'Prov Fail',
        description: 'desc',
        source: 'provisioning',
      });

      await createPlatformAlert(db, {
        tenantId: 't2',
        type: 'TRIAL_EXPIRING_SOON',
        title: 'Trial Exp',
        description: 'desc',
        source: 'billing',
      });

      const resCrit = await request(app)
        .get('/api/platform/alerts?severity=CRITICAL')
        .set('Authorization', 'Bearer admin-token');

      expect(resCrit.status).toBe(200);
      expect(resCrit.body.alerts).toHaveLength(1);
      expect(resCrit.body.alerts[0].severity).toBe('CRITICAL');
    });

    it('41. GET /api/platform/alerts - Performs search matching title or tenantName', async () => {
      await createPlatformAlert(db, {
        tenantId: 'tenant_acme',
        tenantName: 'Acme Corp Store',
        type: 'PAYMENT_FAILURE',
        title: 'Card Payment Declined',
        description: 'Card expired',
        source: 'billing',
      });

      const res = await request(app)
        .get('/api/platform/alerts?search=Acme')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.alerts).toHaveLength(1);
      expect(res.body.alerts[0].tenantName).toBe('Acme Corp Store');
    });

    it('42. GET /api/platform/alerts - Enforces bounded pagination parameters', async () => {
      const res = await getPlatformAlerts(db, { page: 1, limit: 150 });
      expect(res.pageSize).toBe(100);
    });

    it('43. GET /api/platform/alerts/summary - Returns aggregated alert KPIs', async () => {
      await createPlatformAlert(db, {
        tenantId: 'sum_t1',
        type: 'PROVISIONING_FAILURE',
        title: 'Prov Failure',
        description: 'desc',
        source: 'provisioning',
      });

      await createPlatformAlert(db, {
        tenantId: 'sum_t2',
        type: 'HEALTH_AT_RISK',
        title: 'Health Degraded',
        description: 'desc',
        source: 'analytics',
      });

      const res = await request(app)
        .get('/api/platform/alerts/summary')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.summary.criticalCount).toBeGreaterThanOrEqual(1);
      expect(res.body.summary.warningCount).toBeGreaterThanOrEqual(1);
      expect(res.body.summary.openCount).toBeGreaterThanOrEqual(2);
    });

    it('44. GET /api/platform/alerts/:alertId - Returns full enriched detail bundle', async () => {
      await db.collection('tenants').doc('tenant_detail_1').set({
        name: 'Detail Merchant',
        lifecycleStatus: 'active',
        subscription: { planId: 'starter', status: 'active' },
      });

      const { alert } = await createPlatformAlert(db, {
        tenantId: 'tenant_detail_1',
        type: 'HEALTH_AT_RISK',
        title: 'Health Risk Alert',
        description: 'Detail testing',
        source: 'analytics',
      });

      const detail = await getPlatformAlertDetail(db, alert.alertId);
      expect(detail.alert.alertId).toBe(alert.alertId);
      expect(detail.tenant.name).toBe('Detail Merchant');
      expect(detail.usageMetrics).toBeDefined();
    });

    it('45. evaluateTenantAlerts - Automatically evaluates tenant state and creates alerts', async () => {
      const suspendedTenantDoc = {
        id: 'tenant_auto_eval',
        data: () => ({
          name: 'Suspended Merchant',
          lifecycleStatus: 'suspended',
          suspendedReason: 'Non-payment of bill',
          subscription: { status: 'suspended', planId: 'starter' },
        }),
      };

      const count = await evaluateTenantAlerts(db, suspendedTenantDoc);
      expect(count).toBe(1);

      const alertsRes = await getPlatformAlerts(db, { tenantId: 'tenant_auto_eval' });
      expect(alertsRes.alerts).toHaveLength(1);
      expect(alertsRes.alerts[0].type).toBe('UNEXPECTED_SUSPENSION');
    });
  });
});
