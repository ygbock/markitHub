// @ts-nocheck
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { registerPlatformAdminRoutes } from './platformAdminRoutes';
import { createPlatformAlert } from './platformAlertControlPlane';
import {
  createNotificationsFromAlert,
  dispatchNotificationDelivery,
  getDefaultNotificationPreferences,
  getEscalationPolicies,
  getNotificationPreferences,
  getNotificationSummary,
  getPlatformNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  processAlertEscalations,
  sanitizeNotificationReason,
  updateEscalationPolicy,
  updateNotificationPreferences,
} from './platformNotificationControlPlane';

function createMockFirestore() {
  const collections: Record<string, Map<string, any>> = {};

  const getCollection = (name: string) => {
    if (!collections[name]) collections[name] = new Map();
    return collections[name];
  };

  const createQuerySnapshot = (docsArray: any[], col?: Map<string, any>) => ({
    empty: docsArray.length === 0,
    size: docsArray.length,
    docs: docsArray.map(docData => {
      const docId = docData.notificationId || docData.alertId || docData.policyId || docData.adminId || docData.id;
      return {
        id: docId,
        ref: { id: docId, _col: col },
        exists: true,
        data: () => docData,
      };
    }),
  });

  return {
    _collections: collections,
    collection(name: string) {
      const col = getCollection(name);
      return {
        doc(id: string) {
          const docRef = {
            id,
            _col: col,
            async get() {
              const data = col.get(id);
              return {
                id,
                ref: docRef,
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
          return docRef;
        },
        where(field: string, op: string, val: any) {
          return {
            where(f2: string, op2: string, val2: any) {
              return {
                limit(n: number) {
                  return {
                    async get() {
                      const docs = Array.from(col.values()).filter((item: any) => {
                        const v1 = item[field];
                        const match1 = op === '==' ? v1 === val : op === 'in' ? Array.isArray(val) && val.includes(v1) : false;
                        const v2 = item[f2];
                        const match2 = op2 === '==' ? v2 === val2 : op2 === 'in' ? Array.isArray(val2) && val2.includes(v2) : false;
                        return match1 && match2;
                      });
                      return createQuerySnapshot(docs.slice(0, n), col);
                    },
                  };
                },
                async get() {
                  const docs = Array.from(col.values()).filter((item: any) => {
                    const v1 = item[field];
                    const match1 = op === '==' ? v1 === val : op === 'in' ? Array.isArray(val) && val.includes(v1) : false;
                    const v2 = item[f2];
                    const match2 = op2 === '==' ? v2 === val2 : op2 === 'in' ? Array.isArray(val2) && val2.includes(v2) : false;
                    return match1 && match2;
                  });
                  return createQuerySnapshot(docs, col);
                },
              };
            },
            limit(n: number) {
              return {
                async get() {
                  const docs = Array.from(col.values()).filter((item: any) => {
                    const v1 = item[field];
                    if (op === '==') return v1 === val;
                    if (op === 'in') return Array.isArray(val) && val.includes(v1);
                    return false;
                  });
                  return createQuerySnapshot(docs.slice(0, n), col);
                },
              };
            },
            async get() {
              const docs = Array.from(col.values()).filter((item: any) => {
                const v1 = item[field];
                if (op === '==') return v1 === val;
                if (op === 'in') return Array.isArray(val) && val.includes(v1);
                return false;
              });
              return createQuerySnapshot(docs, col);
            },
          };
        },
        async get() {
          const docs = Array.from(col.values());
          return createQuerySnapshot(docs, col);
        },
      };
    },
    batch() {
      return {
        set(ref: any, data: any) {
          if (ref._col) {
            ref._col.set(ref.id, data);
          }
        },
        update(ref: any, data: any) {
          if (ref._col && ref._col.has(ref.id)) {
            const existing = ref._col.get(ref.id);
            ref._col.set(ref.id, { ...existing, ...data });
          }
        },
        async commit() {},
      };
    },
  };
}

describe('Super Admin Notification & Escalation Control Plane', () => {
  let db: any;
  let app: express.Express;
  let authRole: 'Super Admin' | 'Store Owner' | 'Guest';

  beforeEach(() => {
    db = createMockFirestore();
    authRole = 'Super Admin';

    app = express();
    app.use(express.json());

    const requireServerAuth = (req: any, res: any, next: any) => {
      if (authRole === 'Guest') {
        return res.status(401).json({ error: 'Authentication required' });
      }
      req.user = { uid: 'admin_1', email: 'admin@markithub.internal', role: authRole };
      next();
    };

    const requirePlatformAdmin = (req: any, res: any, next: any) => {
      if (req.user?.role !== 'Super Admin') {
        return res.status(403).json({ error: 'Forbidden: Super Admin access required' });
      }
      next();
    };

    registerPlatformAdminRoutes({
      app,
      requireServerAuth,
      requirePlatformAdmin,
      getAdminDb: () => db,
      getAdminAuth: () => ({}),
    });
  });

  // 1. Reason Sanitization Tests
  describe('Reason Sanitization', () => {
    it('1. accepts valid administrative justification reason', () => {
      const reason = sanitizeNotificationReason('Updated alert escalation policy to 15m threshold.');
      expect(reason).toBe('Updated alert escalation policy to 15m threshold.');
    });

    it('2. throws error on empty or whitespace reason', () => {
      expect(() => sanitizeNotificationReason('   ')).toThrow('Mandatory administrative reason is required');
    });

    it('3. throws error on reason under 3 characters', () => {
      expect(() => sanitizeNotificationReason('ok')).toThrow('Mandatory administrative reason is required');
    });

    it('4. truncates reason exceeding 500 characters', () => {
      const longReason = 'a'.repeat(600);
      const sanitized = sanitizeNotificationReason(longReason);
      expect(sanitized.length).toBe(500);
    });
  });

  // 2. Preferences Engine
  describe('Notification Preferences', () => {
    it('5. returns default preferences for new admin', async () => {
      const prefs = await getNotificationPreferences(db, 'admin_new');
      expect(prefs.adminId).toBe('admin_new');
      expect(prefs.enabledChannels.inApp).toBe(true);
      expect(prefs.severityPreferences.CRITICAL).toBe(true);
    });

    it('6. updates notification preferences with mandatory reason', async () => {
      const updated = await updateNotificationPreferences(
        db,
        'admin_1',
        {
          enabledChannels: { inApp: true, email: false, webhook: true },
          severityPreferences: { CRITICAL: true, WARNING: false, INFO: false },
        },
        { uid: 'admin_1', email: 'admin@markithub.internal', role: 'Super Admin' },
        'Disabling non-critical alert channels for on-call hours'
      );

      expect(updated.enabledChannels.email).toBe(false);
      expect(updated.enabledChannels.webhook).toBe(true);
      expect(updated.severityPreferences.WARNING).toBe(false);
      expect(updated.updateReason).toBe('Disabling non-critical alert channels for on-call hours');
    });

    it('7. writes audit log on preference update', async () => {
      await updateNotificationPreferences(
        db,
        'admin_1',
        { enabledChannels: { inApp: true, email: true, webhook: false } },
        { uid: 'admin_1', email: 'admin@markithub.internal', role: 'Super Admin' },
        'Audit log verification test'
      );

      const auditCol = db.collection('audit_logs');
      const snap = await auditCol.get();
      expect(snap.size).toBe(1);
      const log = snap.docs[0].data();
      expect(log.action).toBe('NOTIFICATION_PREFERENCES_UPDATED');
      expect(log.reason).toBe('Audit log verification test');
    });
  });

  // 3. Escalation Policies
  describe('Escalation Policies', () => {
    it('8. seeds default escalation policies when none exist', async () => {
      const policies = await getEscalationPolicies(db);
      expect(policies.length).toBe(2);
      expect(policies.find(p => p.severity === 'CRITICAL')?.thresholdMinutes).toBe(15);
      expect(policies.find(p => p.severity === 'WARNING')?.thresholdMinutes).toBe(60);
    });

    it('9. updates escalation policy threshold with mandatory reason', async () => {
      await getEscalationPolicies(db); // seed defaults
      const updated = await updateEscalationPolicy(
        db,
        'policy_critical_default',
        { thresholdMinutes: 10, enabled: true },
        { uid: 'admin_1', email: 'admin@markithub.internal', role: 'Super Admin' },
        'Lowering SLA threshold for critical payment incidents'
      );

      expect(updated.thresholdMinutes).toBe(10);
      expect(updated.updateReason).toBe('Lowering SLA threshold for critical payment incidents');
    });

    it('10. throws error if escalation policy not found', async () => {
      await expect(
        updateEscalationPolicy(
          db,
          'non_existent_policy',
          { thresholdMinutes: 5 },
          { uid: 'admin_1' },
          'Updating non existent policy'
        )
      ).rejects.toThrow("Escalation policy 'non_existent_policy' not found.");
    });

    it('11. writes audit log on escalation policy update', async () => {
      await getEscalationPolicies(db);
      await updateEscalationPolicy(
        db,
        'policy_critical_default',
        { thresholdMinutes: 20 },
        { uid: 'admin_1', email: 'admin@markithub.internal', role: 'Super Admin' },
        'Adjusting SLA threshold'
      );

      const auditSnap = await db.collection('audit_logs').get();
      const logs = auditSnap.docs.map(d => d.data());
      expect(logs.some(l => l.action === 'ESCALATION_POLICY_UPDATED')).toBe(true);
    });
  });

  // 4. Alert to Notification Generation Pipeline
  describe('Alert to Notification Pipeline', () => {
    it('12. generates notification automatically when alert is created', async () => {
      const { alert } = await createPlatformAlert(db, {
        tenantId: 'tn_acme',
        tenantName: 'Acme Corp',
        type: 'PAYMENT_FAILURE',
        severity: 'CRITICAL',
        source: 'billing',
        title: 'Payment Failure: Acme Corp',
        description: 'Failed to charge credit card.',
      });

      const ntfSnap = await db.collection('platform_notifications').get();
      expect(ntfSnap.size).toBeGreaterThan(0);
      const ntf = ntfSnap.docs[0].data();
      expect(ntf.alertId).toBe(alert.alertId);
      expect(ntf.severity).toBe('CRITICAL');
      expect(ntf.tenantId).toBe('tn_acme');
      expect(ntf.deliveryStatus).toBe('DELIVERED');
    });

    it('13. enforces channel preference: suppresses notification if inApp disabled', async () => {
      await updateNotificationPreferences(
        db,
        'admin_1',
        { enabledChannels: { inApp: false, email: true, webhook: false } },
        { uid: 'admin_1' },
        'Disabling inApp channel'
      );

      const alert = {
        alertId: 'alt_test_disabled',
        tenantId: 'tn_1',
        type: 'PROVISIONING_FAILURE' as const,
        severity: 'CRITICAL' as const,
        title: 'Provisioning Failed',
        description: 'Failed setup',
      };

      const created = await createNotificationsFromAlert(db, alert as any, ['admin_1']);
      expect(created.length).toBe(0);
    });

    it('14. enforces severity preference: suppresses notification if severity disabled', async () => {
      await updateNotificationPreferences(
        db,
        'admin_1',
        { severityPreferences: { CRITICAL: true, WARNING: false, INFO: true } },
        { uid: 'admin_1' },
        'Disabling warning notifications'
      );

      const warningAlert = {
        alertId: 'alt_warning_test',
        tenantId: 'tn_1',
        type: 'TRIAL_EXPIRING_SOON' as const,
        severity: 'WARNING' as const,
        title: 'Trial Expiring',
        description: 'Trial ending soon',
      };

      const created = await createNotificationsFromAlert(db, warningAlert as any, ['admin_1']);
      expect(created.length).toBe(0);
    });

    it('15. deduplicates notifications for same alert and recipient', async () => {
      const alert = {
        alertId: 'alt_dedup_test',
        tenantId: 'tn_1',
        type: 'SECURITY_ANOMALY' as const,
        severity: 'CRITICAL' as const,
        title: 'Security Alert',
        description: 'Anomaly detected',
      };

      const firstPass = await createNotificationsFromAlert(db, alert as any, ['admin_1']);
      expect(firstPass.length).toBe(1);

      const secondPass = await createNotificationsFromAlert(db, alert as any, ['admin_1']);
      expect(secondPass.length).toBe(0);
    });
  });

  // 5. Escalation Engine Execution & Idempotency
  describe('Escalation Engine', () => {
    it('16. escalates OPEN alert exceeding SLA threshold', async () => {
      await getEscalationPolicies(db); // threshold = 15m
      const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();

      const oldAlert = {
        alertId: 'alt_old_critical',
        tenantId: 'tn_cafe',
        tenantName: 'Cafe ABC',
        type: 'PROVISIONING_FAILURE',
        severity: 'CRITICAL',
        status: 'OPEN',
        title: 'Provisioning Failure: Cafe ABC',
        description: 'Stuck provisioning',
        createdAt: twentyMinsAgo,
        updatedAt: twentyMinsAgo,
      };

      await db.collection('platform_alerts').doc('alt_old_critical').set(oldAlert);

      const result = await processAlertEscalations(db);
      expect(result.escalatedCount).toBe(1);
      expect(result.escalatedAlertIds).toContain('alt_old_critical');

      // Check alert state was updated to escalated in metadata
      const updatedAlertDoc = await db.collection('platform_alerts').doc('alt_old_critical').get();
      expect(updatedAlertDoc.data().metadata.escalated).toBe(true);

      // Check audit log
      const auditSnap = await db.collection('audit_logs').get();
      const logs = auditSnap.docs.map(d => d.data());
      expect(logs.some(l => l.action === 'ALERT_ESCALATED')).toBe(true);
    });

    it('17. does not escalate recent alert under SLA threshold', async () => {
      await getEscalationPolicies(db);
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const freshAlert = {
        alertId: 'alt_fresh_critical',
        tenantId: 'tn_cafe',
        type: 'PROVISIONING_FAILURE',
        severity: 'CRITICAL',
        status: 'OPEN',
        title: 'Recent alert',
        description: 'Just happened',
        createdAt: fiveMinsAgo,
        updatedAt: fiveMinsAgo,
      };

      await db.collection('platform_alerts').doc('alt_fresh_critical').set(freshAlert);

      const result = await processAlertEscalations(db);
      expect(result.escalatedCount).toBe(0);
    });

    it('18. escalation processing is idempotent (does not double escalate)', async () => {
      await getEscalationPolicies(db);
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

      const oldAlert = {
        alertId: 'alt_old_repeat',
        tenantId: 'tn_1',
        type: 'PAYMENT_FAILURE',
        severity: 'CRITICAL',
        status: 'OPEN',
        title: 'Old Payment Failure',
        createdAt: thirtyMinsAgo,
        updatedAt: thirtyMinsAgo,
      };

      await db.collection('platform_alerts').doc('alt_old_repeat').set(oldAlert);

      const firstRun = await processAlertEscalations(db);
      expect(firstRun.escalatedCount).toBe(1);

      const secondRun = await processAlertEscalations(db);
      expect(secondRun.escalatedCount).toBe(0);
    });
  });

  // 6. Read State Mutations
  describe('Read State Mutations', () => {
    it('19. marks a single notification as read', async () => {
      const ntf = {
        notificationId: 'ntf_read_1',
        recipientUid: 'admin_1',
        read: false,
        title: 'Test Notification',
        createdAt: new Date().toISOString(),
      };
      await db.collection('platform_notifications').doc('ntf_read_1').set(ntf);

      const updated = await markNotificationAsRead(db, 'ntf_read_1', 'admin_1');
      expect(updated.read).toBe(true);
      expect(updated.readAt).toBeDefined();
    });

    it('20. throws 404 when marking non-existent notification as read', async () => {
      await expect(markNotificationAsRead(db, 'non_existent_ntf', 'admin_1')).rejects.toThrow(
        "Notification 'non_existent_ntf' not found."
      );
    });

    it('21. marks all unread notifications as read for admin', async () => {
      await db.collection('platform_notifications').doc('n1').set({ notificationId: 'n1', recipientUid: 'admin_1', read: false });
      await db.collection('platform_notifications').doc('n2').set({ notificationId: 'n2', recipientUid: 'admin_1', read: false });

      const result = await markAllNotificationsAsRead(db, 'admin_1');
      expect(result.count).toBe(2);

      const check = await db.collection('platform_notifications').doc('n1').get();
      expect(check.data().read).toBe(true);
    });
  });

  // 7. Filtering & Pagination
  describe('Querying & Pagination', () => {
    it('22. filters notifications by unreadOnly', async () => {
      await db.collection('platform_notifications').doc('n_unread').set({ notificationId: 'n_unread', recipientUid: 'admin_1', read: false, createdAt: new Date().toISOString() });
      await db.collection('platform_notifications').doc('n_read').set({ notificationId: 'n_read', recipientUid: 'admin_1', read: true, createdAt: new Date().toISOString() });

      const res = await getPlatformNotifications(db, { recipientUid: 'admin_1', unreadOnly: true });
      expect(res.total).toBe(1);
      expect(res.notifications[0].notificationId).toBe('n_unread');
    });

    it('23. filters notifications by severity', async () => {
      await db.collection('platform_notifications').doc('n_crit').set({ notificationId: 'n_crit', recipientUid: 'admin_1', severity: 'CRITICAL', read: false, createdAt: new Date().toISOString() });
      await db.collection('platform_notifications').doc('n_warn').set({ notificationId: 'n_warn', recipientUid: 'admin_1', severity: 'WARNING', read: false, createdAt: new Date().toISOString() });

      const res = await getPlatformNotifications(db, { recipientUid: 'admin_1', severity: 'CRITICAL' });
      expect(res.total).toBe(1);
      expect(res.notifications[0].notificationId).toBe('n_crit');
    });

    it('24. supports keyword search in title and message', async () => {
      await db.collection('platform_notifications').doc('n_search').set({ notificationId: 'n_search', recipientUid: 'admin_1', title: 'Payment failure — Acme POS', message: 'Card declined', read: false, createdAt: new Date().toISOString() });

      const res = await getPlatformNotifications(db, { recipientUid: 'admin_1', search: 'Acme' });
      expect(res.total).toBe(1);
      expect(res.notifications[0].title).toContain('Acme POS');
    });

    it('25. enforces bounded pagination parameters', async () => {
      for (let i = 0; i < 15; i++) {
        await db.collection('platform_notifications').doc(`n_${i}`).set({
          notificationId: `n_${i}`,
          recipientUid: 'admin_1',
          read: false,
          createdAt: new Date(Date.now() - i * 1000).toISOString(),
        });
      }

      const page1 = await getPlatformNotifications(db, { recipientUid: 'admin_1', page: 1, limit: 5 });
      expect(page1.notifications.length).toBe(5);
      expect(page1.totalPages).toBe(3);
    });
  });

  // 8. REST API Endpoints Integration Tests
  describe('REST API Routes Integration', () => {
    it('26. GET /api/platform/notifications requires authentication (401 for Guest)', async () => {
      authRole = 'Guest';
      const res = await request(app).get('/api/platform/notifications');
      expect(res.status).toBe(401);
    });

    it('27. GET /api/platform/notifications requires Super Admin (403 for Store Owner)', async () => {
      authRole = 'Store Owner';
      const res = await request(app).get('/api/platform/notifications');
      expect(res.status).toBe(403);
    });

    it('28. GET /api/platform/notifications returns list of notifications', async () => {
      const res = await request(app).get('/api/platform/notifications');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.notifications)).toBe(true);
    });

    it('29. GET /api/platform/notifications/summary returns summary KPIs', async () => {
      const res = await request(app).get('/api/platform/notifications/summary');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.unreadCount).toBe('number');
      expect(typeof res.body.criticalUnreadCount).toBe('number');
    });

    it('30. PATCH /api/platform/notifications/:id/read marks notification read', async () => {
      await db.collection('platform_notifications').doc('ntf_api_read').set({
        notificationId: 'ntf_api_read',
        recipientUid: 'admin_1',
        read: false,
      });

      const res = await request(app).patch('/api/platform/notifications/ntf_api_read/read').send();
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.notification.read).toBe(true);
    });

    it('31. PATCH /api/platform/notifications/read-all marks all read', async () => {
      await db.collection('platform_notifications').doc('ntf_a').set({ notificationId: 'ntf_a', recipientUid: 'admin_1', read: false });
      await db.collection('platform_notifications').doc('ntf_b').set({ notificationId: 'ntf_b', recipientUid: 'admin_1', read: false });

      const res = await request(app).patch('/api/platform/notifications/read-all').send();
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
    });

    it('32. GET /api/platform/notification-preferences returns current preferences', async () => {
      const res = await request(app).get('/api/platform/notification-preferences');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.preferences.enabledChannels).toBeDefined();
    });

    it('33. PATCH /api/platform/notification-preferences updates preferences with reason', async () => {
      const res = await request(app)
        .patch('/api/platform/notification-preferences')
        .send({
          enabledChannels: { inApp: true, email: false, webhook: false },
          reason: 'Configuring quiet mode for maintenance window',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.preferences.enabledChannels.email).toBe(false);
    });

    it('34. PATCH /api/platform/notification-preferences fails without mandatory reason (400)', async () => {
      const res = await request(app)
        .patch('/api/platform/notification-preferences')
        .send({
          enabledChannels: { inApp: true, email: false, webhook: false },
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Mandatory administrative reason');
    });

    it('35. GET /api/platform/escalation-policies returns policies list', async () => {
      const res = await request(app).get('/api/platform/escalation-policies');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.policies)).toBe(true);
    });

    it('36. PATCH /api/platform/escalation-policies/:id updates policy threshold', async () => {
      await getEscalationPolicies(db);
      const res = await request(app)
        .patch('/api/platform/escalation-policies/policy_critical_default')
        .send({
          thresholdMinutes: 12,
          reason: 'Tightening SLA threshold for critical payment alerts',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.policy.thresholdMinutes).toBe(12);
    });

    it('37. PATCH /api/platform/escalation-policies/:id fails without mandatory reason', async () => {
      await getEscalationPolicies(db);
      const res = await request(app)
        .patch('/api/platform/escalation-policies/policy_critical_default')
        .send({
          thresholdMinutes: 12,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Mandatory administrative reason');
    });

    it('38. handles missing delivery status gracefully', async () => {
      const ntf = {
        notificationId: 'ntf_dispatch_test',
        recipientUid: 'admin_1',
        retryCount: 0,
        deliveryStatus: 'PENDING' as const,
      };
      await db.collection('platform_notifications').doc('ntf_dispatch_test').set(ntf);

      const dispatched = await dispatchNotificationDelivery(db, 'ntf_dispatch_test');
      expect(dispatched.deliveryStatus).toBe('DELIVERED');
      expect(dispatched.sentAt).toBeDefined();
    });

    it('39. computes notification KPIs accurately in summary', async () => {
      await db.collection('platform_notifications').doc('n_c').set({ notificationId: 'n_c', recipientUid: 'admin_1', severity: 'CRITICAL', read: false, escalationState: 'ESCALATED' });
      await db.collection('platform_notifications').doc('n_w').set({ notificationId: 'n_w', recipientUid: 'admin_1', severity: 'WARNING', read: false, escalationState: 'NONE' });

      const summary = await getNotificationSummary(db, 'admin_1');
      expect(summary.unreadCount).toBe(2);
      expect(summary.criticalUnreadCount).toBe(1);
      expect(summary.warningUnreadCount).toBe(1);
      expect(summary.escalatedCount).toBe(1);
    });

    it('40. handles empty notification collection without crashing', async () => {
      const summary = await getNotificationSummary(db, 'admin_1');
      expect(summary.unreadCount).toBe(0);
      expect(summary.totalCount).toBe(0);

      const list = await getPlatformNotifications(db, { recipientUid: 'admin_1' });
      expect(list.notifications.length).toBe(0);
      expect(list.total).toBe(0);
    });
  });
});
