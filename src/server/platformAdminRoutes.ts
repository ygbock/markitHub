import crypto from 'node:crypto';
import type { Express, RequestHandler } from 'express';
import { createAuthoritativeAuditRecord, updateAuthoritativeSecurityMetrics } from './auditService';
import { DEFAULT_ROLE_PERMISSIONS } from '../utils/permissions';
import { calculateUsagePercent, evaluateUsageLimit, usageLimitState, usageMeterId, usagePeriod, USAGE_METER_COLLECTION } from './platformUsageMeter';
import {
  DEFAULT_PLATFORM_PLANS,
  assertLifecycleTransition,
  assertLifecycleSubscriptionConsistency,
  lifecycleForSubscriptionStatus,
  calculateSubscriptionRevenue,
  calculateTenantHealth,
  parseAnalyticsTimeframe,
  computePlatformAnalytics,
  type TenantHealthStatus,
  makeTenantSlug,
  normalizePlanInput,
  type BillingInterval,
  type PlatformPlan,
  type PlatformSubscription,
  type SubscriptionStatus,
  type TenantLifecycleStatus,
} from './platformAdminControlPlane';
import {
  acknowledgePlatformAlert,
  createPlatformAlert,
  dismissPlatformAlert,
  getPlatformAlertDetail,
  getPlatformAlerts,
  getPlatformAlertSummary,
  resolvePlatformAlert,
} from './platformAlertControlPlane';
import {
  getEscalationPolicies,
  getNotificationPreferences,
  getNotificationSummary,
  getPlatformNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  processAlertEscalations,
  updateEscalationPolicy,
  updateNotificationPreferences,
} from './platformNotificationControlPlane';
import {
  getSchedulerStatus,
  runPlatformJob,
} from './platformScheduler';
import {
  getPlatformGovernanceState,
  getPlatformConfigHistory,
  validatePlatformConfig,
  savePlatformConfigDraft,
  publishPlatformConfig,
  rollbackPlatformConfig,
} from './platformGovernanceControlPlane';
import {
  PLATFORM_ROLES,
  ALL_PLATFORM_PERMISSION_KEYS,
  computeEffectivePermissions,
  hasPlatformPermission,
  getRolePermissionMatrix,
  findPlatformAdminByUid,
  bootstrapInitialSuperAdminIfEmpty,
  listPlatformAdministrators,
  getPlatformAdministrator,
  createPlatformAdministrator,
  updatePlatformAdminProfile,
  assignPlatformAdminRole,
  updatePlatformAdminPermissions,
  updatePlatformAdminStatus,
  deletePlatformAdministrator,
  grantBreakGlassElevation,
  revokeBreakGlassElevation,
  sweepExpiredBreakGlass,
  getAdministratorActivityHistory,
  type PlatformAdministrator,
  type PlatformRole,
  type CallerContext,
} from './platformIdentityControlPlane';
import {
  listPlatformAuditEvents,
  getPlatformAuditEvent,
  getPlatformAuditSummary,
  verifyAuditIntegrity,
  correlatePlatformAuditEvents,
  exportPlatformAuditEvents,
  generateComplianceReport,
  type PlatformAuditEvent,
  type AuditFilterParams,
  type PlatformAuditSummary,
  type IntegrityVerificationResult,
  type ComplianceReport,
} from './platformAuditControlPlane';

interface PlatformRouteDeps {
  app: Express;
  requireServerAuth: RequestHandler;
  requirePlatformAdmin: RequestHandler;
  getAdminDb: () => any;
  getAdminAuth: () => any;
}

function isoPlusDays(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString();
}

function cleanCurrency(value: unknown): string {
  const currency = String(value || 'USD').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : 'USD';
}

function cleanInterval(value: unknown): BillingInterval {
  return value === 'annual' ? 'annual' : 'monthly';
}

function cleanSubscriptionStatus(value: unknown): SubscriptionStatus {
  return ['trialing', 'active', 'past_due', 'suspended', 'cancelled'].includes(String(value))
    ? String(value) as SubscriptionStatus
    : 'active';
}

function cleanLifecycleStatus(value: unknown): TenantLifecycleStatus {
  return ['provisioning', 'trialing', 'active', 'suspended', 'archived', 'cancelled'].includes(String(value))
    ? (String(value) as TenantLifecycleStatus)
    : 'active';
}

async function loadPlan(db: any, planId: string): Promise<{ plan: PlatformPlan; exists: boolean }> {
  const ref = db.collection('platform_plans').doc(planId);
  const snap = await ref.get();
  if (snap.exists) return { plan: { id: snap.id, ...(snap.data() as any) } as PlatformPlan, exists: true };
  const seed = DEFAULT_PLATFORM_PLANS.find(plan => plan.id === planId);
  if (!seed) throw new Error(`Plan '${planId}' not found.`);
  const now = new Date().toISOString();
  return { plan: { ...seed, createdAt: now, updatedAt: now } as PlatformPlan, exists: false };
}

export function registerPlatformAdminRoutes({
  app,
  requireServerAuth,
  requirePlatformAdmin,
  getAdminDb,
  getAdminAuth,
}: PlatformRouteDeps): void {
  const requirePlatformPermission = (requiredPermission: string): RequestHandler => {
    return async (req: any, res: any, next: any) => {
      const db = getAdminDb();
      if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });

      const callerUser = req.user;
      if (!callerUser || !callerUser.uid) {
        return res.status(401).json({ error: 'Authentication is required.' });
      }

      // Explicit separation: Reject tenant-only claims (e.g. store owner / tenant staff)
      const claims = callerUser.claims || {};
      const isTenantOnly = Boolean(claims.tenantId) && claims.platformAdmin !== true;
      if (isTenantOnly) {
        return res.status(403).json({ error: 'Platform administrator authorization required. Tenant-level RBAC is prohibited on platform routes.' });
      }

      try {
        let admin = await findPlatformAdminByUid(db, callerUser.uid);
        if (!admin) {
          admin = await bootstrapInitialSuperAdminIfEmpty(db, {
            uid: callerUser.uid,
            email: callerUser.email || claims.email || null,
            name: callerUser.name || claims.name,
            role: claims.role,
            platformAdmin: claims.platformAdmin === true,
          });
        }

        if (!admin) {
          if (claims.platformAdmin === true && claims.role === 'Super Admin') {
            req.platformAdmin = {
              id: callerUser.uid,
              uid: callerUser.uid,
              email: callerUser.email || 'admin@markithub.internal',
              name: 'Super Administrator',
              status: 'active',
              role: 'SUPER_ADMIN',
              delegatedPermissions: [...ALL_PLATFORM_PERMISSION_KEYS],
              version: 1,
            };
            req.platformPermissions = [...ALL_PLATFORM_PERMISSION_KEYS];
            return next();
          }

          return res.status(403).json({ error: 'Platform administrator authorization required.' });
        }

        if (admin.status === 'suspended') {
          return res.status(403).json({ error: 'Platform administrator account is suspended.' });
        }

        const now = new Date();
        const effectivePerms = computeEffectivePermissions(admin, now);
        const hasPerm = hasPlatformPermission(admin, requiredPermission, now);

        if (!hasPerm) {
          return res.status(403).json({
            error: `Insufficient platform permissions. Required: '${requiredPermission}' (Current role: ${admin.role}).`,
            requiredPermission,
            currentRole: admin.role,
          });
        }

        req.platformAdmin = admin;
        req.platformPermissions = effectivePerms;
        return next();
      } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Platform authorization verification failed.' });
      }
    };
  };

  const platformPerm = (perm: string) => [requireServerAuth, requirePlatformPermission(perm)];

  function extractCallerContext(req: any): CallerContext {
    const admin = req.platformAdmin;
    const user = req.user || {};
    const claims = user.claims || {};
    return {
      uid: admin?.uid || user.uid || 'admin_1',
      email: admin?.email || user.email || claims.email || 'admin@markithub.internal',
      name: admin?.name || user.name || claims.name || 'Platform Administrator',
      role: admin?.role || claims.role || 'SUPER_ADMIN',
      permissions: req.platformPermissions || (admin ? computeEffectivePermissions(admin) : [...ALL_PLATFORM_PERMISSION_KEYS]),
      platformAdmin: true,
    };
  }

  const platformAuth = [requireServerAuth, requirePlatformAdmin];

  app.get('/api/platform/operations/overview', ...platformAuth, async (_req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });

    try {
      const bounded = async (collection: string, queryBuilder?: (q: any) => any) => {
        let q = db.collection(collection);
        if (queryBuilder) q = queryBuilder(q);
        return q.limit(500).get();
      };

      const [
        tenantCountSnap,
        provisioningCountSnap,
        suspendedCountSnap,
        pastDueCountSnap,
        usageSnap,
        alertsSnap,
        notificationsSnap,
        auditSnap,
      ] = await Promise.all([
        db.collection('tenants').count().get(),
        db.collection('tenants').where('lifecycleStatus', '==', 'provisioning').count().get(),
        db.collection('tenants').where('lifecycleStatus', '==', 'suspended').count().get(),
        db.collection('tenants').where('subscription.status', '==', 'past_due').count().get(),
        bounded('tenant_usage_meters'),
        bounded('platform_alerts', q => q.where('status', 'in', ['OPEN', 'ACKNOWLEDGED'])),
        bounded('platform_notifications', q => q.where('read', '==', false)),
        db.collection('audit_logs').orderBy('timestamp', 'desc').limit(25).get(),
      ]);

      const usageDocs = usageSnap.docs.map((d: any) => d.data() as any);
      const usageRisk = usageDocs.filter((m: any) =>
        String(m?.ordersMonthly?.state || m?.usageState || '').toLowerCase() === 'warning' ||
        String(m?.ordersMonthly?.state || m?.usageState || '').toLowerCase() === 'exceeded'
      ).length;

      const alerts = alertsSnap.docs.map((d: any) => d.data() as any);
      const escalatedIncidents = alerts.filter((a: any) => a?.metadata?.escalated === true).length;

      const recentActivity = auditSnap.docs.map((d: any) => {
        const a = d.data() as any;
        return {
          id: d.id,
          action: String(a.action || ''),
          tenantId: String(a.tenantId || ''),
          tenantName: a.tenantName ? String(a.tenantName) : undefined,
          module: a.module ? String(a.module) : undefined,
          timestamp: String(a.timestamp || ''),
        };
      });

      return res.json({
        success: true,
        generatedAt: new Date().toISOString(),
        kpis: {
          tenants: tenantCountSnap.data().count,
          provisioning: provisioningCountSnap.data().count,
          suspended: suspendedCountSnap.data().count,
          pastDue: pastDueCountSnap.data().count,
          usageRisk,
          openAlerts: alertsSnap.size,
          unreadNotifications: notificationsSnap.size,
          escalatedIncidents,
        },
        exceptions: [
          {
            key: 'provisioning',
            label: 'Provisioning queue',
            description: 'Tenants still in provisioning state',
            count: provisioningCountSnap.data().count,
            tab: 'tenants',
          },
          {
            key: 'past_due',
            label: 'Billing exceptions',
            description: 'Tenants with past-due subscriptions',
            count: pastDueCountSnap.data().count,
            tab: 'billing',
          },
          {
            key: 'usage_risk',
            label: 'Usage risk',
            description: 'Tenants approaching or exceeding metered limits',
            count: usageRisk,
            tab: 'analytics_usage',
          },
          {
            key: 'incidents',
            label: 'Open incidents',
            description: 'Open or acknowledged platform alerts',
            count: alertsSnap.size,
            tab: 'alerts',
          },
          {
            key: 'escalations',
            label: 'SLA escalations',
            description: 'Open incidents already escalated',
            count: escalatedIncidents,
            tab: 'notifications',
          },
        ],
        recentActivity,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to load platform operations overview.' });
    }
  });

  app.get('/api/platform/operations/scheduler', ...platformAuth, async (_req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const status = await getSchedulerStatus(db);
      return res.json({
        success: true,
        scheduler: status,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to fetch platform scheduler status.' });
    }
  });

  app.post('/api/platform/operations/scheduler/run', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const jobName = String(req.body?.jobName || 'health').toLowerCase();
      if (!['health', 'escalation', 'notifications'].includes(jobName)) {
        return res.status(400).json({ error: "Invalid jobName. Must be 'health', 'escalation', or 'notifications'." });
      }

      const result = await runPlatformJob(db, jobName as any);
      return res.json({
        success: true,
        jobName,
        result,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to trigger scheduled job.' });
    }
  });

  // ==========================================
  // PLATFORM GOVERNANCE & CONFIGURATION ROUTES
  // ==========================================

  app.get('/api/platform/governance/config', ...platformAuth, async (_req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const state = await getPlatformGovernanceState(db);
      const validation = validatePlatformConfig(state.published);
      return res.json({
        success: true,
        ...state,
        validation,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to fetch platform governance configuration.' });
    }
  });

  app.get('/api/platform/governance/config/history', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const limit = Number(req.query.limit) || 50;
      const history = await getPlatformConfigHistory(db, limit);
      return res.json({
        success: true,
        versions: history,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to fetch platform configuration history.' });
    }
  });

  app.post('/api/platform/governance/config/validate', ...platformAuth, async (req, res) => {
    try {
      const candidateConfig = req.body?.candidateConfig || req.body?.config || req.body;
      const validation = validatePlatformConfig(candidateConfig);
      return res.json({
        success: true,
        validation,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to validate platform configuration.' });
    }
  });

  const handleDraftSave = async (req: any, res: any) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const candidateConfig = req.body?.candidateConfig || req.body?.config;
      const justification = String(req.body?.justification || '').trim();
      const expectedVersion = req.body?.expectedVersion !== undefined ? Number(req.body.expectedVersion) : undefined;
      const adminUser = {
        uid: (req as any).user?.uid || 'superadmin',
        email: (req as any).user?.email || 'superadmin@markithub.internal',
      };

      if (!candidateConfig || typeof candidateConfig !== 'object') {
        return res.status(400).json({ error: 'candidateConfig object is required.' });
      }

      const result = await savePlatformConfigDraft(db, candidateConfig, adminUser, justification, expectedVersion);
      return res.json({
        success: true,
        draft: result.draft,
        validation: result.validation,
      });
    } catch (err: any) {
      const status = err?.message?.toLowerCase()?.includes('conflict') ? 409 : (err?.message?.includes('justification') ? 400 : 500);
      return res.status(status).json({ error: err?.message || 'Failed to save configuration draft.' });
    }
  };

  app.patch('/api/platform/governance/config', ...platformAuth, handleDraftSave);
  app.put('/api/platform/governance/config', ...platformAuth, handleDraftSave);
  app.patch('/api/platform/governance/config/draft', ...platformAuth, handleDraftSave);
  app.put('/api/platform/governance/config/draft', ...platformAuth, handleDraftSave);

  app.post('/api/platform/governance/config/publish', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const justification = String(req.body?.justification || '').trim();
      const expectedVersion = Number(req.body?.expectedVersion);
      const candidateConfig = req.body?.candidateConfig || req.body?.config;
      const adminUser = {
        uid: (req as any).user?.uid || 'superadmin',
        email: (req as any).user?.email || 'superadmin@markithub.internal',
      };

      if (expectedVersion === undefined || expectedVersion === null || Number.isNaN(expectedVersion)) {
        return res.status(400).json({ error: 'expectedVersion number is required for optimistic concurrency check.' });
      }

      const result = await publishPlatformConfig(db, adminUser, justification, expectedVersion, candidateConfig);
      return res.json({
        success: true,
        published: result.published,
        newVersion: result.newVersion,
      });
    } catch (err: any) {
      const status = err?.message?.includes('conflict') ? 409 : (err?.message?.includes('justification') || err?.message?.includes('invalid') ? 400 : 500);
      return res.status(status).json({ error: err?.message || 'Failed to publish platform configuration.' });
    }
  });

  app.post('/api/platform/governance/config/rollback', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const targetVersion = Number(req.body?.targetVersion);
      const justification = String(req.body?.justification || '').trim();
      const expectedCurrentVersion = req.body?.expectedCurrentVersion !== undefined
        ? Number(req.body.expectedCurrentVersion)
        : (req.body?.expectedVersion !== undefined ? Number(req.body.expectedVersion) : undefined);
      const adminUser = {
        uid: (req as any).user?.uid || 'superadmin',
        email: (req as any).user?.email || 'superadmin@markithub.internal',
      };

      if (!targetVersion || Number.isNaN(targetVersion)) {
        return res.status(400).json({ error: 'Valid targetVersion number is required.' });
      }

      const result = await rollbackPlatformConfig(db, adminUser, targetVersion, justification, expectedCurrentVersion);
      return res.json({
        success: true,
        published: result.published,
        newVersion: result.newVersion,
      });
    } catch (err: any) {
      const status = err?.message?.toLowerCase()?.includes('conflict') ? 409 : (err?.message?.includes('not found') ? 404 : (err?.message?.includes('justification') ? 400 : 500));
      return res.status(status).json({ error: err?.message || 'Failed to rollback platform configuration.' });
    }
  });


  app.get('/api/platform/dashboard', ...platformAuth, async (_req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [tenantCountSnap, activeTenantCountSnap, suspendedTenantCountSnap, staffCountSnap, recentAuditCountSnap, recentAuditSnap] = await Promise.all([
        db.collection('tenants').count().get(),
        db.collection('tenants').where('lifecycleStatus', '==', 'active').count().get(),
        db.collection('tenants').where('lifecycleStatus', '==', 'suspended').count().get(),
        db.collection('staff').count().get(),
        db.collection('audit_logs').where('timestamp', '>=', since).count().get(),
        db.collection('audit_logs').orderBy('timestamp', 'desc').limit(20).get(),
      ]);

      const recentAuditEvents = recentAuditSnap.docs.map((doc: any) => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          action: String(data.action || ''),
          tenantId: String(data.tenantId || ''),
          result: String(data.result || ''),
          severity: String(data.severity || ''),
          timestamp: String(data.timestamp || ''),
        };
      });

      return res.json({
        success: true,
        metrics: {
          tenantCount: tenantCountSnap.data().count,
          activeTenantCount: activeTenantCountSnap.data().count,
          suspendedTenantCount: suspendedTenantCountSnap.data().count,
          staffCount: staffCountSnap.data().count,
          recentAuditCount: recentAuditCountSnap.data().count,
        },
        recentAuditEvents,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to load platform dashboard.' });
    }
  });

  app.get('/api/platform/plans', ...platformAuth, async (_req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const snap = await db.collection('platform_plans').get();
      const stored = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as PlatformPlan[];
      const byId = new Map(stored.map(plan => [plan.id, plan]));
      const now = new Date().toISOString();
      for (const seed of DEFAULT_PLATFORM_PLANS) {
        if (!byId.has(seed.id)) byId.set(seed.id, { ...seed, createdAt: now, updatedAt: now } as PlatformPlan);
      }
      return res.json({ success: true, plans: Array.from(byId.values()).sort((a, b) => a.monthlyPrice - b.monthlyPrice) });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to load platform plans.' });
    }
  });

  app.post('/api/platform/plans', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const plan = normalizePlanInput(req.body);
      const ref = db.collection('platform_plans').doc(plan.id);
      if ((await ref.get()).exists) return res.status(409).json({ error: `Plan '${plan.id}' already exists.` });
      const audit = createAuthoritativeAuditRecord({
        tenantId: 'platform',
        actorUid: req.user!.uid,
        actorName: req.user!.email || req.user!.uid,
        actorEmail: req.user!.email || null,
        actorRole: 'Super Admin',
        action: 'PLATFORM_PLAN_CREATED',
        module: 'Platform Billing',
        targetType: 'platform_plan',
        targetId: plan.id,
        targetName: plan.name,
        newState: { name: plan.name, monthlyPrice: plan.monthlyPrice, annualPrice: plan.annualPrice, includedSeats: plan.includedSeats, status: plan.status },
        result: 'success',
        severity: 'warning',
        details: `Created platform plan '${plan.name}'.`,
        metadata: { platformAdmin: true },
      });
      const batch = db.batch();
      batch.set(ref, plan);
      batch.set(db.collection('audit_logs').doc(audit.id), audit);
      await batch.commit();
      return res.status(201).json({ success: true, plan });
    } catch (err: any) {
      return res.status(400).json({ error: err?.message || 'Unable to create plan.' });
    }
  });

  app.patch('/api/platform/plans/:planId', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    const planId = String(req.params.planId || '').trim().toLowerCase();
    try {
      const ref = db.collection('platform_plans').doc(planId);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: `Plan '${planId}' not found.` });
      const plan = normalizePlanInput({ ...req.body, id: planId }, { id: planId, ...(snap.data() as any) } as PlatformPlan);
      const previous = snap.data() as any;
      const audit = createAuthoritativeAuditRecord({
        tenantId: 'platform',
        actorUid: req.user!.uid,
        actorName: req.user!.email || req.user!.uid,
        actorEmail: req.user!.email || null,
        actorRole: 'Super Admin',
        action: 'PLATFORM_PLAN_UPDATED',
        module: 'Platform Billing',
        targetType: 'platform_plan',
        targetId: plan.id,
        targetName: plan.name,
        previousState: { name: previous.name, monthlyPrice: previous.monthlyPrice, annualPrice: previous.annualPrice, includedSeats: previous.includedSeats, status: previous.status },
        newState: { name: plan.name, monthlyPrice: plan.monthlyPrice, annualPrice: plan.annualPrice, includedSeats: plan.includedSeats, status: plan.status },
        result: 'success',
        severity: 'warning',
        details: `Updated platform plan '${plan.name}'.`,
        metadata: { platformAdmin: true },
      });
      const batch = db.batch();
      batch.set(ref, plan, { merge: true });
      batch.set(db.collection('audit_logs').doc(audit.id), audit);
      await updateAuthoritativeSecurityMetrics(db, audit, batch);
      await batch.commit();
      return res.json({ success: true, plan });
    } catch (err: any) {
      return res.status(400).json({ error: err?.message || 'Unable to update plan.' });
    }
  });

  app.get('/api/platform/tenants', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const page = Math.max(1, Math.floor(Number(req.query.page || 1)));
      const limit = Math.min(100, Math.max(1, Math.floor(Number(req.query.pageSize || req.query.limit || 100))));
      const lifecycle = req.query.lifecycleStatus || req.query.lifecycle ? String(req.query.lifecycleStatus || req.query.lifecycle) : '';
      const planId = req.query.planId || req.query.plan ? String(req.query.planId || req.query.plan) : '';
      const search = req.query.search ? String(req.query.search).trim().toLowerCase() : '';

      const snap = await db.collection('tenants').orderBy('updatedAt', 'desc').limit(500).get();
      let tenants = snap.docs.map((doc: any) => {
        const data = doc.data() as any;
        const subscription = data.subscription || {};
        return {
          id: doc.id,
          name: String(data.name || data.businessName || data.storeName || doc.id),
          status: String(data.status || 'active'),
          lifecycleStatus: cleanLifecycleStatus(data.lifecycleStatus || data.status),
          ownerUid: data.ownerUid ? String(data.ownerUid) : undefined,
          ownerEmail: data.ownerEmail ? String(data.ownerEmail) : undefined,
          slug: data.slug ? String(data.slug) : undefined,
          createdAt: data.createdAt ? String(data.createdAt) : undefined,
          updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
          subscription: {
            planId: String(subscription.planId || 'starter'),
            planName: String(subscription.planName || 'Starter'),
            status: cleanSubscriptionStatus(subscription.status),
            interval: cleanInterval(subscription.interval),
            price: Number(subscription.price || 0),
            currency: cleanCurrency(subscription.currency),
            seatsLimit: Number(subscription.seatsLimit || 0),
            currentPeriodStart: subscription.currentPeriodStart ? String(subscription.currentPeriodStart) : undefined,
            currentPeriodEnd: subscription.currentPeriodEnd ? String(subscription.currentPeriodEnd) : undefined,
            overrideMonthlyOrders: Boolean(subscription.overrideMonthlyOrders || data.overrideMonthlyOrders),
          },
        };
      });

      if (search) {
        tenants = tenants.filter(t =>
          t.name.toLowerCase().includes(search) ||
          t.id.toLowerCase().includes(search) ||
          (t.ownerEmail && t.ownerEmail.toLowerCase().includes(search)) ||
          (t.slug && t.slug.toLowerCase().includes(search))
        );
      }
      if (lifecycle) tenants = tenants.filter(t => t.lifecycleStatus === lifecycle);
      if (planId) tenants = tenants.filter(t => t.subscription.planId === planId);

      const total = tenants.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const pageTenants = tenants.slice((page - 1) * limit, page * limit);

      return res.json({
        success: true,
        page,
        pageSize: limit,
        total,
        totalPages,
        tenants: pageTenants,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to load platform tenants.' });
    }
  });

  app.get('/api/platform/billing/tenants', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const page = Math.max(1, Math.floor(Number(req.query.page || 1)));
      const pageSize = Math.min(100, Math.max(1, Math.floor(Number(req.query.pageSize || req.query.limit || 10))));
      const search = req.query.search ? String(req.query.search).trim().toLowerCase() : '';
      const planId = req.query.planId || req.query.plan ? String(req.query.planId || req.query.plan).trim() : '';
      const subscriptionStatus = req.query.subscriptionStatus ? String(req.query.subscriptionStatus).trim() : '';
      const lifecycleStatus = req.query.lifecycleStatus || req.query.lifecycle ? String(req.query.lifecycleStatus || req.query.lifecycle).trim() : '';
      const usageStateFilter = req.query.usageState ? String(req.query.usageState).trim() : '';
      const overrideFilter = req.query.override ? String(req.query.override).trim() : '';
      const period = String(req.query.period || usagePeriod()).trim();

      const tenantSnap = await db.collection('tenants').orderBy('updatedAt', 'desc').limit(500).get();
      const allRows = await Promise.all(tenantSnap.docs.map(async (doc: any) => {
        const data = doc.data() as any;
        const subscription = data.subscription || {};
        const pId = String(subscription.planId || 'starter');
        const resolvedPlan = await loadPlan(db, pId);
        const meterSnap = await db.collection(USAGE_METER_COLLECTION).doc(usageMeterId(doc.id, period)).get();
        const meter = meterSnap.exists ? meterSnap.data() as any : {};
        const used = Math.max(0, Math.floor(Number(meter.ordersMonthly || 0)));
        const limit = Math.max(0, Math.floor(Number(resolvedPlan.plan.limits.ordersMonthly || 0)));
        const overrideActive = Boolean(meter.overrideMonthlyOrders || subscription.overrideMonthlyOrders || data.overrideMonthlyOrders);
        const decision = evaluateUsageLimit(used, limit, overrideActive);

        return {
          id: doc.id,
          name: String(data.name || data.businessName || data.storeName || doc.id),
          slug: data.slug ? String(data.slug) : undefined,
          lifecycleStatus: cleanLifecycleStatus(data.lifecycleStatus || data.status),
          ownerUid: data.ownerUid ? String(data.ownerUid) : undefined,
          ownerEmail: data.ownerEmail ? String(data.ownerEmail) : undefined,
          createdAt: data.createdAt ? String(data.createdAt) : undefined,
          updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
          subscription: {
            planId: pId,
            planName: resolvedPlan.plan.name,
            status: cleanSubscriptionStatus(subscription.status),
            interval: cleanInterval(subscription.interval),
            price: Number(subscription.price || (subscription.interval === 'annual' ? resolvedPlan.plan.annualPrice : resolvedPlan.plan.monthlyPrice)),
            currency: cleanCurrency(subscription.currency || resolvedPlan.plan.currency),
            seatsLimit: Number(subscription.seatsLimit || resolvedPlan.plan.includedSeats),
            currentPeriodStart: subscription.currentPeriodStart ? String(subscription.currentPeriodStart) : undefined,
            currentPeriodEnd: subscription.currentPeriodEnd ? String(subscription.currentPeriodEnd) : undefined,
            overrideMonthlyOrders: overrideActive,
          },
          usage: {
            period,
            ordersMonthly: {
              used,
              limit,
              percent: calculateUsagePercent(used, limit),
              state: decision.state,
              allowed: decision.allowed,
              remaining: decision.remaining,
              overrideActive,
            },
          },
        };
      }));

      let filtered = allRows;
      if (search) {
        filtered = filtered.filter(t =>
          t.name.toLowerCase().includes(search) ||
          t.id.toLowerCase().includes(search) ||
          (t.ownerEmail && t.ownerEmail.toLowerCase().includes(search)) ||
          (t.slug && t.slug.toLowerCase().includes(search)) ||
          t.subscription.planName.toLowerCase().includes(search)
        );
      }
      if (planId) filtered = filtered.filter(t => t.subscription.planId === planId);
      if (subscriptionStatus) filtered = filtered.filter(t => t.subscription.status === subscriptionStatus);
      if (lifecycleStatus) filtered = filtered.filter(t => t.lifecycleStatus === lifecycleStatus);
      if (usageStateFilter) filtered = filtered.filter(t => t.usage.ordersMonthly.state === usageStateFilter);
      if (overrideFilter === 'true' || overrideFilter === 'active' || overrideFilter === 'override_only') {
        filtered = filtered.filter(t => t.subscription.overrideMonthlyOrders);
      } else if (overrideFilter === 'false' || overrideFilter === 'none' || overrideFilter === 'standard') {
        filtered = filtered.filter(t => !t.subscription.overrideMonthlyOrders);
      }

      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const tenants = filtered.slice((page - 1) * pageSize, page * pageSize);

      return res.json({
        success: true,
        page,
        pageSize,
        total,
        totalPages,
        tenants,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to load platform billing tenants.' });
    }
  });

  app.get('/api/platform/billing/summary', ...platformAuth, async (_req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const snap = await db.collection('tenants').limit(500).get();
      const period = usagePeriod();

      let activeSubscriptions = 0;
      let trialSubscriptions = 0;
      let pastDueSubscriptions = 0;
      let suspendedSubscriptions = 0;
      let cancelledSubscriptions = 0;
      let monthlyRecurringRevenue = 0;
      let annualRecurringRevenue = 0;
      let usageWarnings = 0;
      let usageExceeded = 0;
      let activeOverrides = 0;

      for (const doc of snap.docs) {
        const data = doc.data() as any;
        const sub = data.subscription || {};
        const status = cleanSubscriptionStatus(sub.status);
        const interval = cleanInterval(sub.interval);
        const price = Math.max(0, Number(sub.price || 0));

        if (status === 'active') {
          activeSubscriptions++;
          if (interval === 'monthly') monthlyRecurringRevenue += price;
          else annualRecurringRevenue += price;
        } else if (status === 'trialing') trialSubscriptions++;
        else if (status === 'past_due') pastDueSubscriptions++;
        else if (status === 'suspended') suspendedSubscriptions++;
        else if (status === 'cancelled') cancelledSubscriptions++;

        const override = Boolean(sub.overrideMonthlyOrders || data.overrideMonthlyOrders);
        if (override) activeOverrides++;

        const planId = String(sub.planId || 'starter');
        const resolvedPlan = await loadPlan(db, planId);
        const meterSnap = await db.collection(USAGE_METER_COLLECTION).doc(usageMeterId(doc.id, period)).get();
        const meter = meterSnap.exists ? meterSnap.data() as any : {};
        const used = Math.max(0, Math.floor(Number(meter.ordersMonthly || 0)));
        const limit = Math.max(0, Math.floor(Number(resolvedPlan.plan.limits.ordersMonthly || 0)));
        const decision = evaluateUsageLimit(used, limit, override);

        if (decision.state === 'warning') usageWarnings++;
        else if (decision.state === 'exceeded') usageExceeded++;
      }

      const estimatedMonthlyRunRate = monthlyRecurringRevenue + (annualRecurringRevenue / 12);

      return res.json({
        success: true,
        summary: {
          currency: 'USD',
          activeSubscriptions,
          trialSubscriptions,
          trialingTenants: trialSubscriptions,
          pastDueSubscriptions,
          pastDueTenants: pastDueSubscriptions,
          suspendedSubscriptions,
          suspendedTenants: suspendedSubscriptions,
          cancelledSubscriptions,
          cancelledTenants: cancelledSubscriptions,
          monthlyRecurringRevenue,
          annualRecurringRevenue,
          estimatedMonthlyRunRate,
          usageWarnings,
          usageExceeded,
          activeOverrides,
          totalTenants: snap.docs.length,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to load billing summary.' });
    }
  });

  app.get('/api/platform/usage', ...platformAuth, async (_req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const [tenantsSnap, staffCountSnap, orderCountSnap, auditCountSnap] = await Promise.all([
        db.collection('tenants').orderBy('updatedAt', 'desc').limit(100).get(),
        db.collection('staff').count().get(),
        db.collection('orders').count().get(),
        db.collection('audit_logs').count().get(),
      ]);

      const tenants = tenantsSnap.docs.map((doc: any) => {
        const data = doc.data() as any;
        const subscription = data.subscription || {};
        return {
          id: doc.id,
          name: String(data.name || data.businessName || data.storeName || doc.id),
          lifecycleStatus: cleanLifecycleStatus(data.lifecycleStatus || data.status),
          planId: String(subscription.planId || 'starter'),
          planName: String(subscription.planName || 'Starter'),
        };
      });

      const usage = await Promise.all(tenants.map(async (tenant: any) => {
        const [staff, products, orders, auditEvents] = await Promise.all([
          db.collection('staff').where('tenantId', '==', tenant.id).count().get(),
          db.collection('products').where('tenantId', '==', tenant.id).count().get(),
          db.collection('orders').where('tenantId', '==', tenant.id).count().get(),
          db.collection('audit_logs').where('tenantId', '==', tenant.id).count().get(),
        ]);
        return {
          ...tenant,
          staff: staff.data().count,
          products: products.data().count,
          orders: orders.data().count,
          auditEvents: auditEvents.data().count,
          measuredAt: new Date().toISOString(),
        };
      }));

      return res.json({
        success: true,
        platform: {
          tenants: tenants.length,
          staff: staffCountSnap.data().count,
          orders: orderCountSnap.data().count,
          auditEvents: auditCountSnap.data().count,
        },
        usage,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to load platform usage.' });
    }
  });

  app.get('/api/platform/usage/metered', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const period = String(req.query.period || usagePeriod()).trim();
      if (!/^\\d{4}-\\d{2}$/.test(period)) return res.status(400).json({ error: 'Invalid usage period. Expected YYYY-MM.' });

      const tenantSnap = await db.collection('tenants').orderBy('updatedAt', 'desc').limit(100).get();
      const rows = await Promise.all(tenantSnap.docs.map(async (doc: any) => {
        const data = doc.data() as any;
        const subscription = data.subscription || {};
        const planId = String(subscription.planId || 'starter');
        const resolvedPlan = await loadPlan(db, planId);
        const meterSnap = await db.collection(USAGE_METER_COLLECTION).doc(usageMeterId(doc.id, period)).get();
        const meter = meterSnap.exists ? meterSnap.data() as any : {};
        const used = Math.max(0, Math.floor(Number(meter.ordersMonthly || 0)));
        const limit = Math.max(0, Math.floor(Number(resolvedPlan.plan.limits.ordersMonthly || 0)));
        const override = Boolean(meter.overrideMonthlyOrders || subscription.overrideMonthlyOrders || data.overrideMonthlyOrders);
        const decision = evaluateUsageLimit(used, limit, override);
        return {
          id: doc.id,
          name: String(data.name || data.businessName || data.storeName || doc.id),
          lifecycleStatus: cleanLifecycleStatus(data.lifecycleStatus || data.status),
          subscriptionStatus: cleanSubscriptionStatus(subscription.status),
          planId,
          planName: resolvedPlan.plan.name,
          period,
          ordersMonthly: {
            used,
            limit,
            percent: calculateUsagePercent(used, limit),
            state: decision.state,
            allowed: decision.allowed,
            remaining: decision.remaining,
            overrideActive: override,
          },
          measuredAt: String(meter.updatedAt || new Date().toISOString()),
        };
      }));
      return res.json({ success: true, period, usage: rows });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to load metered platform usage.' });
    }
  });

  app.get('/api/platform/billing', ...platformAuth, async (_req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const snap = await db.collection('tenants').limit(500).get();
      const subscriptions: PlatformSubscription[] = snap.docs
        .map((doc: any) => doc.data()?.subscription)
        .filter(Boolean)
        .map((sub: any) => ({
          planId: String(sub.planId || 'starter'),
          planName: String(sub.planName || 'Starter'),
          status: cleanSubscriptionStatus(sub.status),
          interval: cleanInterval(sub.interval),
          price: Math.max(0, Number(sub.price || 0)),
          currency: cleanCurrency(sub.currency),
          seatsLimit: Math.max(0, Number(sub.seatsLimit || 0)),
          currentPeriodStart: String(sub.currentPeriodStart || ''),
          currentPeriodEnd: String(sub.currentPeriodEnd || ''),
        }));
      const summary = calculateSubscriptionRevenue(subscriptions);
      const eventsSnap = await db.collection('platform_billing_events').orderBy('occurredAt', 'desc').limit(25).get();
      const recentEvents = eventsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      return res.json({ success: true, summary, recentEvents });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to load platform billing.' });
    }
  });

  app.post('/api/platform/tenants', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });

    const name = String(req.body?.name || '').trim();
    let ownerEmail = String(req.body?.ownerEmail || '').trim().toLowerCase();
    let ownerUid = String(req.body?.ownerUid || '').trim();
    const ownerName = String(req.body?.ownerName || '').trim();
    const reason = String(req.body?.reason || '').trim();
    const currency = cleanCurrency(req.body?.currency);
    const timezone = String(req.body?.timezone || 'UTC').trim() || 'UTC';
    const planId = String(req.body?.planId || 'starter').trim().toLowerCase();
    const interval = cleanInterval(req.body?.billingInterval);
    const trialDays = Math.min(30, Math.max(0, Math.floor(Number(req.body?.trialDays ?? 14))));
    const autoProvision = req.body?.autoProvision !== false;
    const idempotencyKey = String(req.headers['idempotency-key'] || req.body?.idempotencyKey || '').trim().slice(0, 128);

    if (!name) return res.status(400).json({ error: 'Tenant name is required.' });
    if (!ownerEmail && !ownerUid) return res.status(400).json({ error: 'Owner email or Firebase UID is required for tenant provisioning.' });
    if (!reason) return res.status(400).json({ error: 'An administrative reason is required for tenant creation.' });

    if (!ownerUid) {
      ownerUid = `user_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
    }
    if (!ownerEmail) {
      ownerEmail = `owner_${ownerUid.slice(-8)}@example.com`;
    }

    try {
      const auth = getAdminAuth();
      let ownerUser: any = null;
    if (req.body?.ownerUid && auth) {
      try {
        ownerUser = await auth.getUser(ownerUid);
      } catch (err: any) {
        return res.status(400).json({ error: 'The supplied owner Firebase UID does not exist.' });
      }
    }

      const tenantId = `tenant_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
      const staffId = `staff_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
      const membershipId = `membership_${tenantId.slice(-8)}_${ownerUid.slice(-8)}`;
      const billingEventId = `event_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;

      const tenantRef = db.collection('tenants').doc(tenantId);
      const userRef = db.collection('users').doc(ownerUid);
      const membershipRef = db.collection('tenant_memberships').doc(membershipId);
      const staffRef = db.collection('staff').doc(staffId);
      const metricsRef = db.collection('tenant_security_metrics').doc(tenantId);
      const subRef = db.collection('subscription').doc(tenantId);
      const subPluralRef = db.collection('subscriptions').doc(tenantId);
      const billingRef = db.collection('billing_events').doc(billingEventId);
      const platformBillingRef = db.collection('platform_billing_events').doc(billingEventId);

      let createdTenant: any = null;
      let replayedProvisioning = false;

      let resolvedPlan: { plan: PlatformPlan; exists: boolean };
      try {
        resolvedPlan = await loadPlan(db, planId);
      } catch (err: any) {
        return res.status(404).json({ error: err?.message || `Plan '${planId}' not found.` });
      }
      if (resolvedPlan.plan.status !== 'active') {
        return res.status(409).json({ error: 'Archived plans cannot be assigned during provisioning.' });
      }

      await db.runTransaction(async (transaction: any) => {
        const requestRef = idempotencyKey
          ? db.collection('platform_provisioning_requests').doc(crypto.createHash('sha256').update(idempotencyKey).digest('hex'))
          : null;
        if (requestRef) {
          const requestSnap = await transaction.get(requestRef);
          if (requestSnap.exists) {
            const priorTenantId = String(requestSnap.data()?.tenantId || '');
            if (!priorTenantId) throw Object.assign(new Error('Invalid provisioning idempotency record.'), { statusCode: 409 });
            const priorTenantSnap = await transaction.get(db.collection('tenants').doc(priorTenantId));
            if (!priorTenantSnap.exists) throw Object.assign(new Error('Provisioning record references a missing tenant.'), { statusCode: 409 });
            createdTenant = { id: priorTenantSnap.id, ...priorTenantSnap.data() };
            replayedProvisioning = true;
            return;
          }
        }

        const plan = resolvedPlan.plan;
        const now = new Date().toISOString();

        const lifecycleStatus: TenantLifecycleStatus = autoProvision
          ? (trialDays > 0 ? 'trialing' : 'active')
          : 'provisioning';
        const subscriptionStatus: SubscriptionStatus = trialDays > 0 ? 'trialing' : 'active';
        const provisioningStatus = autoProvision ? 'completed' : 'pending';
        const onboardingCompletionPercent = autoProvision ? 100 : 25;
        const periodDays = interval === 'annual' ? 365 : 30;

        assertLifecycleSubscriptionConsistency(lifecycleStatus, subscriptionStatus);

        const subscription: PlatformSubscription = {
          planId: plan.id,
          planName: plan.name,
          status: subscriptionStatus,
          interval,
          price: interval === 'annual' ? plan.annualPrice : plan.monthlyPrice,
          currency: plan.currency,
          seatsLimit: plan.includedSeats,
          currentPeriodStart: now,
          currentPeriodEnd: isoPlusDays(periodDays),
          ...(trialDays > 0 ? { trialEndsAt: isoPlusDays(trialDays) } : {}),
        };
        const slug = makeTenantSlug(name, tenantId.slice(-6));

        createdTenant = {
          id: tenantId,
          name,
          legalName: String(req.body?.legalName || name).trim(),
          slug,
          status: 'active',
          lifecycleStatus,
          provisioningStatus,
          onboardingCompletionPercent,
          lastProvisioningAttemptAt: autoProvision ? now : null,
          provisioningError: null,
          ownerUid,
          ownerEmail: ownerEmail || ownerUser?.email || undefined,
          ownerName: ownerName || (ownerEmail ? ownerEmail.split('@')[0] : 'Business Owner'),
          currency,
          timezone,
          createdAt: now,
          updatedAt: now,
          subscription,
          store: {
            name: `${name} Store`,
            currency,
            timezone,
            supportEmail: String(req.body?.supportEmail || ownerEmail).trim(),
            supportPhone: String(req.body?.supportPhone || '').trim(),
          },
        };

        const audit = createAuthoritativeAuditRecord({
          tenantId,
          actorUid: req.user!.uid,
          actorName: req.user!.email || req.user!.uid,
          actorEmail: req.user!.email || null,
          actorRole: 'Super Admin',
          action: autoProvision ? 'TENANT_PROVISIONED' : 'TENANT_CREATION_INITIATED',
          module: 'Platform Administration',
          targetType: 'tenant',
          targetId: tenantId,
          targetName: name,
          newState: { lifecycleStatus, provisioningStatus, planId: plan.id, billingInterval: interval, ownerUid },
          reason,
          result: 'success',
          severity: 'critical',
          details: `Provisioned tenant '${name}' on ${plan.name} plan. Reason: ${reason}`,
          metadata: { platformAdmin: true, trialDays, currency, timezone },
        });

        await updateAuthoritativeSecurityMetrics(db, audit, transaction);

        if (!resolvedPlan.exists) {
          transaction.set(db.collection('platform_plans').doc(plan.id), plan);
        }

        // Write all 7 required docs atomically inside transaction
        transaction.set(tenantRef, createdTenant);
        transaction.set(userRef, {
          uid: ownerUid,
          email: ownerEmail || ownerUser?.email || '',
          name: ownerName || (ownerEmail ? ownerEmail.split('@')[0] : 'Business Owner'),
          tenantId,
          role: 'Business Owner',
          status: 'active',
          createdAt: now,
          updatedAt: now,
        }, { merge: true });

        const staffMemberData = {
          id: membershipId,
          uid: ownerUid,
          tenantId,
          name: ownerName || (ownerEmail ? ownerEmail.split('@')[0] : 'Business Owner'),
          email: ownerEmail || ownerUser?.email || '',
          role: 'Business Owner',
          status: 'active',
          permissionsOverride: DEFAULT_ROLE_PERMISSIONS['Business Owner'],
          createdAt: now,
          updatedAt: now,
        };

        transaction.set(membershipRef, staffMemberData, { merge: true });
        transaction.set(staffRef, staffMemberData, { merge: true });

        transaction.set(metricsRef, {
          tenantId,
          activeStaffCount: 1,
          suspendedStaffCount: 0,
          failedLoginAttempts: 0,
          securityAlertsCount: 0,
          lastAuditTimestamp: now,
          createdAt: now,
          updatedAt: now,
        }, { merge: true });

        const subPayload = { tenantId, ...subscription, createdAt: now, updatedAt: now };
        transaction.set(subRef, subPayload, { merge: true });
        transaction.set(subPluralRef, subPayload, { merge: true });

        const billingData = {
          id: billingEventId,
          tenantId,
          type: 'subscription_created',
          planId: plan.id,
          planName: plan.name,
          interval,
          amount: trialDays > 0 ? 0 : subscription.price,
          currency: subscription.currency,
          status: trialDays > 0 ? 'trialing' : 'active',
          occurredAt: now,
          description: trialDays > 0 ? `Trial started on ${plan.name}.` : `Subscription started on ${plan.name}.`,
        };
        transaction.set(billingRef, billingData);
        transaction.set(platformBillingRef, billingData);

        transaction.set(db.collection('audit_logs').doc(audit.id), audit);

        if (requestRef) {
          transaction.create(requestRef, {
            tenantId,
            idempotencyKeyHash: requestRef.id,
            createdAt: now,
          });
        }
      });

      return res.status(replayedProvisioning ? 200 : 201).json({
        success: true,
        tenant: createdTenant,
        ...(replayedProvisioning ? { replayed: true } : {}),
      });
    } catch (err: any) {
      const statusCode = err?.statusCode || (err?.message?.includes('not found') ? 404 : err?.message?.includes('Archived') ? 409 : 400);
      return res.status(statusCode).json({ error: err?.message || 'Tenant provisioning failed.' });
    }
  });

  app.get('/api/platform/tenants/:tenantId', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    const tenantId = String(req.params.tenantId || '').trim();
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID is required.' });

    try {
      const tenantSnap = await db.collection('tenants').doc(tenantId).get();
      if (!tenantSnap.exists) return res.status(404).json({ error: `Tenant '${tenantId}' not found.` });

      const data = tenantSnap.data() as any;
      const ownerUid = String(data.ownerUid || '').trim();

      const [userSnap, secSnap, subSnap] = await Promise.all([
        ownerUid ? db.collection('users').doc(ownerUid).get() : Promise.resolve(null),
        db.collection('tenant_security_metrics').doc(tenantId).get(),
        db.collection('subscription').doc(tenantId).get(),
      ]);

      const ownerUser = userSnap?.exists ? userSnap.data() : { uid: ownerUid, email: data.ownerEmail, name: data.ownerName };
      const securityMetrics = secSnap?.exists ? secSnap.data() : null;
      const standaloneSub = subSnap?.exists ? subSnap.data() : null;

      const onboarding = {
        completionPercent: data.onboardingCompletionPercent ?? (data.lifecycleStatus === 'active' ? 100 : data.lifecycleStatus === 'trialing' ? 80 : 25),
        provisioningStatus: data.provisioningStatus ?? (data.lifecycleStatus === 'provisioning' ? 'pending' : 'completed'),
        lastProvisioningAttemptAt: data.lastProvisioningAttemptAt || data.createdAt || null,
        provisioningError: data.provisioningError || null,
      };

      return res.json({
        success: true,
        tenant: {
          ...data,
          subscription: standaloneSub || data.subscription,
          ownerUser,
          securityMetrics,
          onboarding,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to fetch tenant details.' });
    }
  });

  app.patch('/api/platform/tenants/:tenantId/profile', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    const tenantId = String(req.params.tenantId || '').trim();
    const reason = String(req.body?.reason || '').trim();

    if (!tenantId) return res.status(400).json({ error: 'Tenant ID is required.' });
    if (!reason) return res.status(400).json({ error: 'An administrative reason is required for profile updates.' });

    try {
      let updatedTenant: any = null;
      await db.runTransaction(async (transaction: any) => {
        const ref = db.collection('tenants').doc(tenantId);
        const snap = await transaction.get(ref);
        if (!snap.exists) throw Object.assign(new Error(`Tenant '${tenantId}' not found.`), { statusCode: 404 });

        const prev = snap.data() as any;
        const now = new Date().toISOString();

        const name = req.body?.name ? String(req.body.name).trim() : prev.name;
        const legalName = req.body?.legalName ? String(req.body.legalName).trim() : prev.legalName;
        const currency = req.body?.currency ? cleanCurrency(req.body.currency) : prev.currency;
        const timezone = req.body?.timezone ? String(req.body.timezone).trim() : prev.timezone;

        updatedTenant = {
          ...prev,
          name,
          legalName,
          currency,
          timezone,
          store: {
            ...(prev.store || {}),
            ...(req.body?.store || {}),
            ...(req.body?.supportEmail ? { supportEmail: String(req.body.supportEmail).trim() } : {}),
            ...(req.body?.supportPhone ? { supportPhone: String(req.body.supportPhone).trim() } : {}),
          },
          branding: req.body?.branding ? { ...(prev.branding || {}), ...req.body.branding } : prev.branding,
          policies: req.body?.policies ? { ...(prev.policies || {}), ...req.body.policies } : prev.policies,
          updatedAt: now,
        };

        const audit = createAuthoritativeAuditRecord({
          tenantId,
          actorUid: req.user!.uid,
          actorName: req.user!.email || req.user!.uid,
          actorEmail: req.user!.email || null,
          actorRole: 'Super Admin',
          action: 'TENANT_PROFILE_UPDATED',
          module: 'Platform Administration',
          targetType: 'tenant',
          targetId: tenantId,
          targetName: name,
          previousState: { name: prev.name, legalName: prev.legalName, currency: prev.currency, timezone: prev.timezone },
          newState: { name, legalName, currency, timezone },
          reason,
          result: 'success',
          severity: 'info',
          details: `Updated profile for tenant '${name}'. Reason: ${reason}`,
          metadata: { platformAdmin: true },
        });

        await updateAuthoritativeSecurityMetrics(db, audit, transaction);
        transaction.set(ref, updatedTenant);
        transaction.set(db.collection('audit_logs').doc(audit.id), audit);
      });

      return res.json({ success: true, tenant: updatedTenant });
    } catch (err: any) {
      const statusCode = err?.statusCode || (err?.message?.includes('not found') ? 404 : 400);
      return res.status(statusCode).json({ error: err?.message || 'Profile update failed.' });
    }
  });

  app.post('/api/platform/tenants/:tenantId/provision', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    const tenantId = String(req.params.tenantId || '').trim();
    const reason = String(req.body?.reason || '').trim();

    if (!tenantId) return res.status(400).json({ error: 'Tenant ID is required.' });
    if (!reason) return res.status(400).json({ error: 'An administrative reason is required for tenant provisioning.' });

    try {
      let provisionedTenant: any = null;
      const now = new Date().toISOString();

      await db.runTransaction(async (transaction: any) => {
        const tenantRef = db.collection('tenants').doc(tenantId);
        const tenantSnap = await transaction.get(tenantRef);
        if (!tenantSnap.exists) throw Object.assign(new Error(`Tenant '${tenantId}' not found.`), { statusCode: 404 });

        const tenantData = tenantSnap.data() as any;
        if (tenantData.lifecycleStatus === 'cancelled') {
          throw Object.assign(new Error('Cancelled tenants cannot be provisioned.'), { statusCode: 409 });
        }

        if (tenantData.provisioningStatus === 'completed' && tenantData.lifecycleStatus !== 'provisioning') {
          provisionedTenant = tenantData;
          return;
        }

        const trialDays = tenantData.subscription?.trialEndsAt ? 14 : 0;
        const targetLifecycle: TenantLifecycleStatus = (tenantData.subscription?.status === 'trialing' || trialDays > 0) ? 'trialing' : 'active';
        const targetSubStatus: SubscriptionStatus = targetLifecycle === 'trialing' ? 'trialing' : 'active';

        assertLifecycleTransition(tenantData.lifecycleStatus || 'provisioning', targetLifecycle);
        assertLifecycleSubscriptionConsistency(targetLifecycle, targetSubStatus);

        const ownerUid = tenantData.ownerUid || `user_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
        const ownerEmail = tenantData.ownerEmail || `owner_${ownerUid.slice(-8)}@example.com`;
        const membershipId = `membership_${tenantId.slice(-8)}_${ownerUid.slice(-8)}`;
        const staffId = `staff_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
        const billingEventId = `event_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;

        const updatedSubscription = {
          ...(tenantData.subscription || {}),
          status: targetSubStatus,
          updatedAt: now,
        };

        provisionedTenant = {
          ...tenantData,
          lifecycleStatus: targetLifecycle,
          provisioningStatus: 'completed',
          provisioningError: null,
          lastProvisioningAttemptAt: now,
          onboardingCompletionPercent: 100,
          subscription: updatedSubscription,
          updatedAt: now,
        };

        const userRef = db.collection('users').doc(ownerUid);
        const membershipRef = db.collection('tenant_memberships').doc(membershipId);
        const staffRef = db.collection('staff').doc(staffId);
        const metricsRef = db.collection('tenant_security_metrics').doc(tenantId);
        const subRef = db.collection('subscription').doc(tenantId);
        const billingRef = db.collection('billing_events').doc(billingEventId);
        const platformBillingRef = db.collection('platform_billing_events').doc(billingEventId);

        transaction.set(tenantRef, provisionedTenant);
        transaction.set(userRef, {
          uid: ownerUid,
          email: ownerEmail,
          name: tenantData.ownerName || ownerEmail.split('@')[0],
          tenantId,
          role: 'Business Owner',
          status: 'active',
          createdAt: now,
          updatedAt: now,
        }, { merge: true });

        const memberData = {
          id: membershipId,
          uid: ownerUid,
          tenantId,
          name: tenantData.ownerName || ownerEmail.split('@')[0],
          email: ownerEmail,
          role: 'Business Owner',
          status: 'active',
          permissionsOverride: DEFAULT_ROLE_PERMISSIONS['Business Owner'],
          createdAt: now,
          updatedAt: now,
        };
        transaction.set(membershipRef, memberData, { merge: true });
        transaction.set(staffRef, memberData, { merge: true });

        transaction.set(metricsRef, {
          tenantId,
          activeStaffCount: 1,
          suspendedStaffCount: 0,
          failedLoginAttempts: 0,
          securityAlertsCount: 0,
          lastAuditTimestamp: now,
          createdAt: now,
          updatedAt: now,
        }, { merge: true });

        transaction.set(subRef, { tenantId, ...updatedSubscription }, { merge: true });

        const billingData = {
          id: billingEventId,
          tenantId,
          type: 'provisioning_completed',
          planId: updatedSubscription.planId || 'starter',
          planName: updatedSubscription.planName || 'Starter',
          interval: updatedSubscription.interval || 'monthly',
          amount: updatedSubscription.price || 0,
          currency: updatedSubscription.currency || 'USD',
          status: targetSubStatus,
          occurredAt: now,
          description: `Tenant '${tenantData.name}' provisioning completed successfully.`,
        };
        transaction.set(billingRef, billingData);
        transaction.set(platformBillingRef, billingData);

        const audit = createAuthoritativeAuditRecord({
          tenantId,
          actorUid: req.user!.uid,
          actorName: req.user!.email || req.user!.uid,
          actorEmail: req.user!.email || null,
          actorRole: 'Super Admin',
          action: 'TENANT_PROVISIONED',
          module: 'Platform Administration',
          targetType: 'tenant',
          targetId: tenantId,
          targetName: tenantData.name,
          previousState: { lifecycleStatus: tenantData.lifecycleStatus, provisioningStatus: tenantData.provisioningStatus },
          newState: { lifecycleStatus: targetLifecycle, provisioningStatus: 'completed' },
          reason,
          result: 'success',
          severity: 'critical',
          details: `Completed tenant provisioning for '${tenantData.name}'. Reason: ${reason}`,
          metadata: { platformAdmin: true },
        });

        await updateAuthoritativeSecurityMetrics(db, audit, transaction);
        transaction.set(db.collection('audit_logs').doc(audit.id), audit);
      });

      return res.json({ success: true, tenant: provisionedTenant });
    } catch (err: any) {
      try {
        const now = new Date().toISOString();
        await db.collection('tenants').doc(tenantId).set({
          provisioningStatus: 'failed',
          provisioningError: err?.message || 'Tenant provisioning transaction failed.',
          lastProvisioningAttemptAt: now,
          updatedAt: now,
        }, { merge: true });
      } catch {}
      const statusCode = err?.statusCode || (err?.message?.includes('not found') ? 404 : 400);
      return res.status(statusCode).json({ error: err?.message || 'Tenant provisioning failed.' });
    }
  });

  app.post('/api/platform/tenants/:tenantId/retry-provisioning', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    const tenantId = String(req.params.tenantId || '').trim();
    const reason = String(req.body?.reason || '').trim();

    if (!tenantId) return res.status(400).json({ error: 'Tenant ID is required.' });
    if (!reason) return res.status(400).json({ error: 'An administrative reason is required for retrying tenant provisioning.' });

    try {
      let retriedTenant: any = null;
      const now = new Date().toISOString();

      await db.runTransaction(async (transaction: any) => {
        const tenantRef = db.collection('tenants').doc(tenantId);
        const tenantSnap = await transaction.get(tenantRef);
        if (!tenantSnap.exists) throw Object.assign(new Error(`Tenant '${tenantId}' not found.`), { statusCode: 404 });

        const tenantData = tenantSnap.data() as any;
        if (tenantData.lifecycleStatus === 'cancelled') {
          throw Object.assign(new Error('Cancelled tenants cannot be retried for provisioning.'), { statusCode: 409 });
        }

        const trialDays = tenantData.subscription?.trialEndsAt ? 14 : 0;
        const targetLifecycle: TenantLifecycleStatus = (tenantData.subscription?.status === 'trialing' || trialDays > 0) ? 'trialing' : 'active';
        const targetSubStatus: SubscriptionStatus = targetLifecycle === 'trialing' ? 'trialing' : 'active';

        const ownerUid = tenantData.ownerUid || `user_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
        const ownerEmail = tenantData.ownerEmail || `owner_${ownerUid.slice(-8)}@example.com`;
        const membershipId = `membership_${tenantId.slice(-8)}_${ownerUid.slice(-8)}`;
        const staffId = `staff_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
        const billingEventId = `event_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;

        const updatedSubscription = {
          ...(tenantData.subscription || {}),
          status: targetSubStatus,
          updatedAt: now,
        };

        retriedTenant = {
          ...tenantData,
          lifecycleStatus: targetLifecycle,
          provisioningStatus: 'completed',
          provisioningError: null,
          lastProvisioningAttemptAt: now,
          onboardingCompletionPercent: 100,
          subscription: updatedSubscription,
          updatedAt: now,
        };

        const userRef = db.collection('users').doc(ownerUid);
        const membershipRef = db.collection('tenant_memberships').doc(membershipId);
        const staffRef = db.collection('staff').doc(staffId);
        const metricsRef = db.collection('tenant_security_metrics').doc(tenantId);
        const subRef = db.collection('subscription').doc(tenantId);
        const billingRef = db.collection('billing_events').doc(billingEventId);

        transaction.set(tenantRef, retriedTenant);
        transaction.set(userRef, {
          uid: ownerUid,
          email: ownerEmail,
          name: tenantData.ownerName || ownerEmail.split('@')[0],
          tenantId,
          role: 'Business Owner',
          status: 'active',
          createdAt: now,
          updatedAt: now,
        }, { merge: true });

        const memberData = {
          id: membershipId,
          uid: ownerUid,
          tenantId,
          name: tenantData.ownerName || ownerEmail.split('@')[0],
          email: ownerEmail,
          role: 'Business Owner',
          status: 'active',
          permissionsOverride: DEFAULT_ROLE_PERMISSIONS['Business Owner'],
          createdAt: now,
          updatedAt: now,
        };
        transaction.set(membershipRef, memberData, { merge: true });
        transaction.set(staffRef, memberData, { merge: true });

        transaction.set(metricsRef, {
          tenantId,
          activeStaffCount: 1,
          suspendedStaffCount: 0,
          failedLoginAttempts: 0,
          securityAlertsCount: 0,
          lastAuditTimestamp: now,
          createdAt: now,
          updatedAt: now,
        }, { merge: true });

        transaction.set(subRef, { tenantId, ...updatedSubscription }, { merge: true });

        const billingData = {
          id: billingEventId,
          tenantId,
          type: 'provisioning_retried',
          planId: updatedSubscription.planId || 'starter',
          planName: updatedSubscription.planName || 'Starter',
          interval: updatedSubscription.interval || 'monthly',
          amount: updatedSubscription.price || 0,
          currency: updatedSubscription.currency || 'USD',
          status: targetSubStatus,
          occurredAt: now,
          description: `Retried tenant '${tenantData.name}' provisioning successfully.`,
        };
        transaction.set(billingRef, billingData);
        transaction.set(db.collection('platform_billing_events').doc(billingEventId), billingData);

        const audit = createAuthoritativeAuditRecord({
          tenantId,
          actorUid: req.user!.uid,
          actorName: req.user!.email || req.user!.uid,
          actorEmail: req.user!.email || null,
          actorRole: 'Super Admin',
          action: 'TENANT_PROVISIONING_RETRIED',
          module: 'Platform Administration',
          targetType: 'tenant',
          targetId: tenantId,
          targetName: tenantData.name,
          previousState: { lifecycleStatus: tenantData.lifecycleStatus, provisioningStatus: tenantData.provisioningStatus, provisioningError: tenantData.provisioningError },
          newState: { lifecycleStatus: targetLifecycle, provisioningStatus: 'completed', provisioningError: null },
          reason,
          result: 'success',
          severity: 'critical',
          details: `Retried tenant provisioning for '${tenantData.name}'. Reason: ${reason}`,
          metadata: { platformAdmin: true },
        });

        await updateAuthoritativeSecurityMetrics(db, audit, transaction);
        transaction.set(db.collection('audit_logs').doc(audit.id), audit);
      });

      return res.json({ success: true, tenant: retriedTenant });
    } catch (err: any) {
      const statusCode = err?.statusCode || (err?.message?.includes('not found') ? 404 : 400);
      return res.status(statusCode).json({ error: err?.message || 'Tenant provisioning retry failed.' });
    }
  });

  app.patch('/api/platform/tenants/:tenantId/subscription/plan', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    const tenantId = String(req.params.tenantId || '').trim();
    const planId = String(req.body?.planId || '').trim().toLowerCase();
    const intervalInput = req.body?.billingInterval ? String(req.body.billingInterval).trim().toLowerCase() : undefined;
    const reason = String(req.body?.reason || '').trim();

    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID is required.' });
    if (!planId) return res.status(400).json({ error: 'Plan ID is required.' });
    if (!reason) return res.status(400).json({ error: 'A reason is required for subscription plan changes.' });

    try {
      const resolvedPlan = await loadPlan(db, planId);
      if (!resolvedPlan.exists) return res.status(404).json({ error: `Plan '${planId}' not found.` });
      if (resolvedPlan.plan.status !== 'active') return res.status(409).json({ error: 'Archived plans cannot be assigned to tenants.' });

      let resultSubscription: PlatformSubscription | null = null;
      await db.runTransaction(async (transaction: any) => {
        const tenantRef = db.collection('tenants').doc(tenantId);
        const tenantSnap = await transaction.get(tenantRef);
        if (!tenantSnap.exists) throw Object.assign(new Error(`Tenant '${tenantId}' not found.`), { statusCode: 404 });

        const data = tenantSnap.data() as any;
        const current = data.subscription || {};
        const interval = cleanInterval(intervalInput || current.interval || 'monthly');
        const plan = resolvedPlan.plan;
        const now = new Date().toISOString();

        const subscription: PlatformSubscription = {
          planId: plan.id,
          planName: plan.name,
          status: cleanSubscriptionStatus(current.status || 'active'),
          interval,
          price: interval === 'annual' ? plan.annualPrice : plan.monthlyPrice,
          currency: plan.currency,
          seatsLimit: plan.includedSeats,
          currentPeriodStart: String(current.currentPeriodStart || now),
          currentPeriodEnd: String(current.currentPeriodEnd || isoPlusDays(interval === 'annual' ? 365 : 30)),
          overrideMonthlyOrders: Boolean(current.overrideMonthlyOrders || data.overrideMonthlyOrders),
          ...(current.trialEndsAt ? { trialEndsAt: String(current.trialEndsAt) } : {}),
        };

        const audit = createAuthoritativeAuditRecord({
          tenantId,
          actorUid: req.user!.uid,
          actorName: req.user!.email || req.user!.uid,
          actorEmail: req.user!.email || null,
          actorRole: 'Super Admin',
          action: 'TENANT_SUBSCRIPTION_PLAN_CHANGED',
          module: 'Platform Billing',
          targetType: 'tenant',
          targetId: tenantId,
          targetName: String(data.name || data.businessName || tenantId),
          previousState: { planId: current.planId, planName: current.planName, price: current.price, interval: current.interval },
          newState: { planId: plan.id, planName: plan.name, price: subscription.price, interval },
          reason,
          result: 'success',
          severity: 'warning',
          details: `Subscription plan changed from ${current.planName || current.planId} to ${plan.name} (${interval}). Reason: ${reason}`,
          metadata: { platformAdmin: true, previousPlanId: current.planId, newPlanId: plan.id },
        });

        await updateAuthoritativeSecurityMetrics(db, audit, transaction);
        transaction.set(tenantRef, { subscription, updatedAt: now }, { merge: true });
        transaction.set(db.collection('audit_logs').doc(audit.id), audit);
        transaction.set(db.collection('platform_billing_events').doc(), {
          tenantId,
          type: 'subscription_changed',
          planId: plan.id,
          planName: plan.name,
          interval,
          amount: subscription.price,
          currency: subscription.currency,
          status: subscription.status,
          occurredAt: now,
          description: `Plan changed to ${plan.name}. Reason: ${reason}`,
        });

        resultSubscription = subscription;
      });

      return res.json({ success: true, tenantId, subscription: resultSubscription });
    } catch (err: any) {
      return res.status(err?.statusCode || 400).json({ error: err?.message || 'Plan change failed.' });
    }
  });

  app.patch('/api/platform/tenants/:tenantId/subscription/status', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    const tenantId = String(req.params.tenantId || '').trim();
    const statusInput = String(req.body?.status || '').trim().toLowerCase();
    const reason = String(req.body?.reason || '').trim();

    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID is required.' });
    if (!['trialing', 'active', 'past_due', 'suspended', 'cancelled'].includes(statusInput)) {
      return res.status(400).json({ error: 'Invalid subscription status.' });
    }
    if (!reason) return res.status(400).json({ error: 'A reason is required for subscription status changes.' });

    const newStatus = cleanSubscriptionStatus(statusInput);

    try {
      let resultSubscription: PlatformSubscription | null = null;
      let nextLifecycle: TenantLifecycleStatus = 'active';

      await db.runTransaction(async (transaction: any) => {
        const tenantRef = db.collection('tenants').doc(tenantId);
        const tenantSnap = await transaction.get(tenantRef);
        if (!tenantSnap.exists) throw Object.assign(new Error(`Tenant '${tenantId}' not found.`), { statusCode: 404 });

        const data = tenantSnap.data() as any;
        const current = data.subscription || {};
        const currentLifecycle = cleanLifecycleStatus(data.lifecycleStatus || data.status);

        const lifecycleFromStatus = lifecycleForSubscriptionStatus(newStatus);
        nextLifecycle = currentLifecycle;
        if (lifecycleFromStatus && lifecycleFromStatus !== currentLifecycle) {
          nextLifecycle = lifecycleFromStatus;
          assertLifecycleTransition(currentLifecycle, nextLifecycle);
        } else if (['suspended', 'cancelled'].includes(currentLifecycle) && newStatus === 'active') {
          nextLifecycle = 'active';
          assertLifecycleTransition(currentLifecycle, nextLifecycle);
        }

        assertLifecycleSubscriptionConsistency(nextLifecycle, newStatus);

        const now = new Date().toISOString();
        const subscription: PlatformSubscription = {
          planId: String(current.planId || 'starter'),
          planName: String(current.planName || 'Starter'),
          status: newStatus,
          interval: cleanInterval(current.interval || 'monthly'),
          price: Math.max(0, Number(current.price || 0)),
          currency: cleanCurrency(current.currency || 'USD'),
          seatsLimit: Math.max(0, Number(current.seatsLimit || 0)),
          currentPeriodStart: String(current.currentPeriodStart || now),
          currentPeriodEnd: String(current.currentPeriodEnd || isoPlusDays(30)),
          overrideMonthlyOrders: Boolean(current.overrideMonthlyOrders || data.overrideMonthlyOrders),
          ...(current.trialEndsAt ? { trialEndsAt: String(current.trialEndsAt) } : {}),
        };

        const actionName =
          newStatus === 'active' && current.status === 'suspended'
            ? 'TENANT_SUBSCRIPTION_REACTIVATED'
            : newStatus === 'active'
            ? 'TENANT_SUBSCRIPTION_ACTIVATED'
            : newStatus === 'suspended'
            ? 'TENANT_SUBSCRIPTION_SUSPENDED'
            : newStatus === 'cancelled'
            ? 'TENANT_SUBSCRIPTION_CANCELLED'
            : `TENANT_SUBSCRIPTION_${newStatus.toUpperCase()}`;

        const audit = createAuthoritativeAuditRecord({
          tenantId,
          actorUid: req.user!.uid,
          actorName: req.user!.email || req.user!.uid,
          actorEmail: req.user!.email || null,
          actorRole: 'Super Admin',
          action: actionName,
          module: 'Platform Billing',
          targetType: 'tenant',
          targetId: tenantId,
          targetName: String(data.name || data.businessName || tenantId),
          previousState: { status: current.status, lifecycleStatus: currentLifecycle },
          newState: { status: newStatus, lifecycleStatus: nextLifecycle },
          reason,
          result: 'success',
          severity: 'warning',
          details: `Subscription status updated to '${newStatus}'. Reason: ${reason}`,
          metadata: { platformAdmin: true },
        });

        await updateAuthoritativeSecurityMetrics(db, audit, transaction);
        transaction.set(tenantRef, {
          subscription,
          lifecycleStatus: nextLifecycle,
          status: nextLifecycle === 'suspended' ? 'suspended' : nextLifecycle === 'cancelled' ? 'cancelled' : 'active',
          updatedAt: now,
        }, { merge: true });

        transaction.set(db.collection('audit_logs').doc(audit.id), audit);
        transaction.set(db.collection('platform_billing_events').doc(), {
          tenantId,
          type: `subscription_${newStatus}`,
          planId: subscription.planId,
          planName: subscription.planName,
          interval: subscription.interval,
          amount: newStatus === 'cancelled' ? 0 : subscription.price,
          currency: subscription.currency,
          status: newStatus,
          occurredAt: now,
          description: `Subscription status set to ${newStatus}. Reason: ${reason}`,
        });

        resultSubscription = subscription;
      });

      return res.json({ success: true, tenantId, subscription: resultSubscription, lifecycleStatus: nextLifecycle });
    } catch (err: any) {
      return res.status(err?.statusCode || 400).json({ error: err?.message || 'Subscription status update failed.' });
    }
  });

  app.patch('/api/platform/tenants/:tenantId/subscription', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    const tenantId = String(req.params.tenantId || '').trim();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID is required.' });

    try {
      const result: any = {};
      const tenantPlanId = String(req.body?.planId || 'starter').trim().toLowerCase();
      const resolvedPlan = await loadPlan(db, tenantPlanId);
      if (resolvedPlan.plan.status !== 'active') throw Object.assign(new Error('Archived plans cannot be assigned to tenants.'), { statusCode: 409 });
      await db.runTransaction(async (transaction: any) => {
        const tenantRef = db.collection('tenants').doc(tenantId);
        const tenantSnap = await transaction.get(tenantRef);
        if (!tenantSnap.exists) throw Object.assign(new Error(`Tenant '${tenantId}' not found.`), { statusCode: 404 });
        const data = tenantSnap.data() as any;
        const current = data.subscription || {};
        const currentLifecycle = cleanLifecycleStatus(data.lifecycleStatus || data.status);
        const planId = tenantPlanId || String(current.planId || 'starter');
        const interval = cleanInterval(req.body?.billingInterval || current.interval);
        const status = cleanSubscriptionStatus(req.body?.status || current.status || 'active');
        const requestedStatusChange = req.body?.status !== undefined && status !== cleanSubscriptionStatus(current.status || 'active');
        const reason = String(req.body?.reason || '').trim();
        const lifecycleFromSubscription = lifecycleForSubscriptionStatus(status);
        let nextLifecycle = currentLifecycle;
        if (lifecycleFromSubscription && lifecycleFromSubscription !== currentLifecycle) {
          nextLifecycle = lifecycleFromSubscription;
          assertLifecycleTransition(currentLifecycle, nextLifecycle);
        } else if (requestedStatusChange && ['suspended', 'cancelled'].includes(currentLifecycle) && status === 'active') {
          nextLifecycle = 'active';
          assertLifecycleTransition(currentLifecycle, nextLifecycle);
        }
        if (requestedStatusChange && lifecycleFromSubscription && lifecycleFromSubscription !== currentLifecycle && !reason) {
          throw Object.assign(new Error('A reason is required when a subscription status changes tenant lifecycle.'), { statusCode: 400 });
        }
        const plan = resolvedPlan.plan;
        const now = new Date().toISOString();
        const subscription: PlatformSubscription = {
          planId: plan.id,
          planName: plan.name,
          status,
          interval,
          price: interval === 'annual' ? plan.annualPrice : plan.monthlyPrice,
          currency: plan.currency,
          seatsLimit: plan.includedSeats,
          currentPeriodStart: String(current.currentPeriodStart || now),
          currentPeriodEnd: String(current.currentPeriodEnd || isoPlusDays(interval === 'annual' ? 365 : 30)),
          ...(current.trialEndsAt ? { trialEndsAt: String(current.trialEndsAt) } : {}),
        };
        const audit = createAuthoritativeAuditRecord({
          tenantId,
          actorUid: req.user!.uid,
          actorName: req.user!.email || req.user!.uid,
          actorEmail: req.user!.email || null,
          actorRole: 'Super Admin',
          action: 'TENANT_SUBSCRIPTION_CHANGED',
          module: 'Platform Billing',
          targetType: 'tenant',
          targetId: tenantId,
          targetName: String(data.name || data.businessName || tenantId),
          previousState: { planId: current.planId, planName: current.planName, status: current.status, interval: current.interval, price: current.price },
          newState: { planId: plan.id, planName: plan.name, status, interval, price: subscription.price, lifecycleStatus: nextLifecycle },
          reason: reason || undefined,
          result: 'success',
          severity: 'warning',
          details: `Subscription changed to ${plan.name} (${interval}).`,
          metadata: { platformAdmin: true },
        });
        const auditRef = db.collection('audit_logs').doc(audit.id);
        const billingRef = db.collection('platform_billing_events').doc();
        await updateAuthoritativeSecurityMetrics(db, audit, transaction);
        if (!resolvedPlan.exists) transaction.set(db.collection('platform_plans').doc(plan.id), plan);
        transaction.set(tenantRef, { lifecycleStatus: nextLifecycle, status: nextLifecycle === 'suspended' ? 'suspended' : nextLifecycle === 'cancelled' ? 'cancelled' : 'active', subscription, updatedAt: now }, { merge: true });
        transaction.set(auditRef, audit);
        transaction.set(billingRef, {
          tenantId,
          type: 'subscription_changed',
          planId: plan.id,
          planName: plan.name,
          interval,
          amount: subscription.price,
          currency: subscription.currency,
          status,
          occurredAt: now,
          description: `Subscription changed to ${plan.name}.`,
        });
        result.subscription = subscription;
      });
      return res.json({ success: true, tenantId, subscription: result.subscription });
    } catch (err: any) {
      return res.status(err?.statusCode || 400).json({ error: err?.message || 'Subscription update failed.' });
    }
  });

  app.patch('/api/platform/tenants/:tenantId/lifecycle', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    const tenantId = String(req.params.tenantId || '').trim();
    const rawLifecycle = String(req.body?.status || req.body?.lifecycleStatus || '').trim().toLowerCase();
    const reason = String(req.body?.reason || '').trim();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.', code: 'SERVICE_UNAVAILABLE' });
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID is required.', code: 'INVALID_REQUEST' });
    if (!['provisioning', 'trialing', 'active', 'suspended', 'archived', 'cancelled'].includes(rawLifecycle)) {
      return res.status(400).json({ error: 'Invalid tenant lifecycle status.', code: 'INVALID_STATUS' });
    }
    if (!reason) {
      return res.status(400).json({ error: 'A reason is required for tenant lifecycle changes.', code: 'AUDIT_REASON_REQUIRED' });
    }

    const nextLifecycle = cleanLifecycleStatus(rawLifecycle);

    try {
      let resultTenant: any = null;
      let auditEventId = '';
      await db.runTransaction(async (transaction: any) => {
        const tenantRef = db.collection('tenants').doc(tenantId);
        const tenantSnap = await transaction.get(tenantRef);
        if (!tenantSnap.exists) {
          throw Object.assign(new Error(`Tenant '${tenantId}' not found.`), { statusCode: 404, code: 'TENANT_NOT_FOUND' });
        }
        const data = tenantSnap.data() as any;
        const currentLifecycle = cleanLifecycleStatus(data.lifecycleStatus || data.status);
        assertLifecycleTransition(currentLifecycle, nextLifecycle);
        const now = new Date().toISOString();
        const operationalStatus = nextLifecycle;
        const subscription = { ...(data.subscription || {}) };
        if (nextLifecycle === 'suspended' || nextLifecycle === 'archived') {
          subscription.status = 'suspended';
        } else if (nextLifecycle === 'cancelled') {
          subscription.status = 'cancelled';
        } else if (nextLifecycle === 'active') {
          subscription.status = 'active';
        } else if (nextLifecycle === 'trialing' && !['trialing', 'active'].includes(String(subscription.status || ''))) {
          subscription.status = 'trialing';
        }
        assertLifecycleSubscriptionConsistency(nextLifecycle, cleanSubscriptionStatus(subscription.status));

        const actionName =
          nextLifecycle === 'suspended'
            ? 'TENANT_LIFECYCLE_SUSPENDED'
            : nextLifecycle === 'active'
            ? 'TENANT_LIFECYCLE_ACTIVE'
            : nextLifecycle === 'archived'
            ? 'TENANT_LIFECYCLE_ARCHIVED'
            : `TENANT_LIFECYCLE_${nextLifecycle.toUpperCase()}`;

        const audit = createAuthoritativeAuditRecord({
          tenantId,
          actorUid: req.user!.uid,
          actorName: req.user!.email || req.user!.uid,
          actorEmail: req.user!.email || null,
          actorRole: 'Super Admin',
          action: actionName,
          module: 'Tenant Lifecycle',
          targetType: 'tenant',
          targetId: tenantId,
          targetName: String(data.name || data.businessName || tenantId),
          previousState: { lifecycleStatus: currentLifecycle, status: data.status, subscriptionStatus: data.subscription?.status },
          newState: { lifecycleStatus: nextLifecycle, status: operationalStatus, subscriptionStatus: subscription.status },
          reason,
          result: 'success',
          severity: 'critical',
          details: reason,
          metadata: { platformAdmin: true, transition: `${currentLifecycle} -> ${nextLifecycle}` },
        });
        auditEventId = audit.id;
        await updateAuthoritativeSecurityMetrics(db, audit, transaction);
        transaction.set(tenantRef, { lifecycleStatus: nextLifecycle, status: operationalStatus, subscription, updatedAt: now }, { merge: true });
        transaction.set(db.collection('audit_logs').doc(audit.id), audit);
        transaction.set(db.collection('platform_billing_events').doc(), {
          tenantId,
          type: `lifecycle_${nextLifecycle}`,
          planId: subscription.planId || null,
          planName: subscription.planName || null,
          interval: subscription.interval || null,
          amount: nextLifecycle === 'cancelled' ? 0 : Number(subscription.price || 0),
          currency: cleanCurrency(subscription.currency),
          status: subscription.status || null,
          occurredAt: now,
          description: reason,
        });
        resultTenant = { id: tenantId, ...data, lifecycleStatus: nextLifecycle, status: operationalStatus, subscription, updatedAt: now };
      });
      return res.json({ success: true, tenant: resultTenant, auditEventId });
    } catch (err: any) {
      const statusCode = err?.statusCode || 400;
      const code = err?.code || (statusCode === 404 ? 'TENANT_NOT_FOUND' : 'INVALID_REQUEST');
      return res.status(statusCode).json({ error: err?.message || 'Tenant lifecycle update failed.', code });
    }
  });

  app.patch('/api/platform/tenants/:tenantId/usage-override', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    const tenantId = String(req.params.tenantId || '').trim();
    const overrideMonthlyOrders = Boolean(req.body?.overrideMonthlyOrders);
    const reason = String(req.body?.reason || '').trim();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID is required.' });
    if (!reason) return res.status(400).json({ error: 'A reason is required for setting usage limit overrides.' });

    try {
      let updatedTenant: any = null;
      await db.runTransaction(async (transaction: any) => {
        const tenantRef = db.collection('tenants').doc(tenantId);
        const tenantSnap = await transaction.get(tenantRef);
        if (!tenantSnap.exists) throw Object.assign(new Error(`Tenant '${tenantId}' not found.`), { statusCode: 404 });

        const data = tenantSnap.data() as any;
        const previousOverride = Boolean(data.subscription?.overrideMonthlyOrders || data.overrideMonthlyOrders);
        const now = new Date().toISOString();
        const period = usagePeriod();

        const subscription = {
          ...(data.subscription || {}),
          overrideMonthlyOrders,
        };

        const meterRef = db.collection(USAGE_METER_COLLECTION).doc(usageMeterId(tenantId, period));

        const audit = createAuthoritativeAuditRecord({
          tenantId,
          actorUid: req.user!.uid,
          actorName: req.user!.email || req.user!.uid,
          actorEmail: req.user!.email || null,
          actorRole: 'Super Admin',
          action: 'TENANT_USAGE_OVERRIDE_CHANGED',
          module: 'Platform Usage',
          targetType: 'tenant',
          targetId: tenantId,
          targetName: String(data.name || data.businessName || tenantId),
          previousState: { overrideMonthlyOrders: previousOverride },
          newState: { overrideMonthlyOrders },
          reason,
          result: 'success',
          severity: 'warning',
          details: `Usage limit override set to ${overrideMonthlyOrders} for tenant '${data.name || tenantId}'. Reason: ${reason}`,
          metadata: { platformAdmin: true, period },
        });

        await updateAuthoritativeSecurityMetrics(db, audit, transaction);
        transaction.set(tenantRef, { subscription, overrideMonthlyOrders, updatedAt: now }, { merge: true });
        transaction.set(meterRef, { tenantId, period, overrideMonthlyOrders, updatedAt: now }, { merge: true });
        transaction.set(db.collection('audit_logs').doc(audit.id), audit);

        updatedTenant = { id: tenantId, ...data, subscription, overrideMonthlyOrders, updatedAt: now };
      });

      return res.json({ success: true, tenant: updatedTenant, overrideMonthlyOrders });
    } catch (err: any) {
      return res.status(err?.statusCode || 400).json({ error: err?.message || 'Usage override update failed.' });
    }
  });

  async function fetchAnalyticsData(db: any) {
    const [tenantSnap, planSnap] = await Promise.all([
      db.collection('tenants').orderBy('updatedAt', 'desc').limit(500).get(),
      db.collection('platform_plans').get(),
    ]);

    const storedPlans = planSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as PlatformPlan[];
    const planById = new Map(storedPlans.map(p => [p.id, p]));
    const now = new Date().toISOString();
    for (const seed of DEFAULT_PLATFORM_PLANS) {
      if (!planById.has(seed.id)) planById.set(seed.id, { ...seed, createdAt: now, updatedAt: now } as PlatformPlan);
    }
    const plans = Array.from(planById.values());

    const period = usagePeriod();
    const tenants = tenantSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    const usageMetersMap: Record<string, any> = {};
    await Promise.all(
      tenants.map(async (tenant: any) => {
        try {
          const meterSnap = await db.collection(USAGE_METER_COLLECTION).doc(usageMeterId(tenant.id, period)).get();
          if (meterSnap && meterSnap.exists) {
            usageMetersMap[tenant.id] = meterSnap.data();
          }
        } catch {}
      })
    );

    return { tenants, plans, usageMetersMap };
  }

  // 1. GET /api/platform/analytics/overview
  app.get('/api/platform/analytics/overview', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const timeframe = String(req.query.timeframe || '30d');
      const { tenants, plans, usageMetersMap } = await fetchAnalyticsData(db);
      const analytics = computePlatformAnalytics(tenants, plans, timeframe, usageMetersMap);
      return res.json({ success: true, ...analytics });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to load platform analytics overview.' });
    }
  });

  // 2. GET /api/platform/analytics/tenants
  app.get('/api/platform/analytics/tenants', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const timeframe = String(req.query.timeframe || '30d');
      const page = Math.max(1, Math.floor(Number(req.query.page || 1)));
      const limit = Math.min(100, Math.max(1, Math.floor(Number(req.query.limit || req.query.pageSize || 20))));
      const statusFilter = req.query.status || req.query.lifecycle ? String(req.query.status || req.query.lifecycle).toLowerCase() : '';
      const healthFilter = req.query.health ? String(req.query.health).toUpperCase() : '';
      const planIdFilter = req.query.planId ? String(req.query.planId).toLowerCase() : '';
      const search = req.query.search ? String(req.query.search).trim().toLowerCase() : '';

      const { tenants, plans, usageMetersMap } = await fetchAnalyticsData(db);

      let tenantRows = tenants.map((data: any) => {
        const sub = data.subscription || {};
        const pId = String(sub.planId || 'starter').toLowerCase();
        const plan = plans.find(p => p.id === pId) || plans[0];
        const meter = usageMetersMap[data.id] || {};
        const usedOrders = Math.max(0, Math.floor(Number(meter.ordersMonthly || 0)));
        const limitOrders = Math.max(1, Math.floor(Number(plan.limits.ordersMonthly || 2500)));
        const overrideActive = Boolean(meter.overrideMonthlyOrders || sub.overrideMonthlyOrders || data.overrideMonthlyOrders);
        const usagePercent = Math.round((usedOrders / limitOrders) * 100);

        const health = calculateTenantHealth({
          lifecycleStatus: data.lifecycleStatus || data.status,
          provisioningStatus: data.provisioningStatus,
          subscriptionStatus: sub.status,
          usagePercent,
          overrideActive,
          hasPaymentFailure: sub.status === 'past_due',
          lastActivityAt: data.updatedAt || data.createdAt,
          createdAt: data.createdAt,
        });

        return {
          id: data.id,
          name: String(data.name || data.businessName || data.id),
          slug: data.slug ? String(data.slug) : makeTenantSlug(data.name || data.id),
          ownerEmail: data.ownerEmail ? String(data.ownerEmail) : undefined,
          lifecycleStatus: cleanLifecycleStatus(data.lifecycleStatus || data.status),
          provisioningStatus: String(data.provisioningStatus || 'completed'),
          subscription: {
            planId: pId,
            planName: String(sub.planName || plan.name),
            status: cleanSubscriptionStatus(sub.status),
            interval: cleanInterval(sub.interval),
            price: Number(sub.price || plan.monthlyPrice),
            currency: cleanCurrency(sub.currency),
            currentPeriodEnd: sub.currentPeriodEnd ? String(sub.currentPeriodEnd) : undefined,
          },
          usage: {
            ordersMonthly: usedOrders,
            ordersLimit: limitOrders,
            usagePercent,
            isWarning: usagePercent >= 80 && usagePercent < 100,
            isExceeded: usagePercent >= 100 && !overrideActive,
            overrideActive,
          },
          health,
          lastActivityAt: data.updatedAt || data.createdAt || new Date().toISOString(),
          createdAt: data.createdAt || new Date().toISOString(),
        };
      });

      if (search) {
        tenantRows = tenantRows.filter(t =>
          t.name.toLowerCase().includes(search) ||
          t.id.toLowerCase().includes(search) ||
          t.slug.toLowerCase().includes(search) ||
          (t.ownerEmail && t.ownerEmail.toLowerCase().includes(search))
        );
      }
      if (statusFilter) {
        tenantRows = tenantRows.filter(t => t.lifecycleStatus === statusFilter);
      }
      if (healthFilter) {
        tenantRows = tenantRows.filter(t => t.health.status === healthFilter);
      }
      if (planIdFilter) {
        tenantRows = tenantRows.filter(t => t.subscription.planId === planIdFilter);
      }

      const totalItems = tenantRows.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));
      const paginatedTenants = tenantRows.slice((page - 1) * limit, page * limit);

      const healthBreakdown = {
        healthy: tenantRows.filter(t => t.health.status === 'HEALTHY').length,
        atRisk: tenantRows.filter(t => t.health.status === 'AT_RISK').length,
        critical: tenantRows.filter(t => t.health.status === 'CRITICAL').length,
      };

      return res.json({
        success: true,
        timeframe,
        page,
        limit,
        totalItems,
        totalPages,
        tenants: paginatedTenants,
        healthBreakdown,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to load tenant analytics.' });
    }
  });

  // 3. GET /api/platform/analytics/revenue
  app.get('/api/platform/analytics/revenue', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const timeframe = String(req.query.timeframe || '30d');
      const { tenants, plans, usageMetersMap } = await fetchAnalyticsData(db);
      const bundle = computePlatformAnalytics(tenants, plans, timeframe, usageMetersMap);

      return res.json({
        success: true,
        timeframe: bundle.timeframe,
        summary: bundle.revenueSummary,
        kpis: {
          mrr: bundle.kpis.mrr,
          arr: bundle.kpis.arr,
          estimatedRunRate: bundle.kpis.estimatedRunRate,
          activeSubscriptions: bundle.kpis.activeSubscriptions,
          trialSubscriptions: bundle.kpis.trialingTenants,
          failedSubscriptions: bundle.kpis.failedSubscriptions,
        },
        conversionMetrics: {
          trialCount: bundle.kpis.trialingTenants,
          activePaidCount: bundle.kpis.activeTenants,
          trialToPaidConversionRatePercent: bundle.kpis.trialToPaidConversionRatePercent,
          churnedCount: bundle.kpis.cancelledTenants + bundle.kpis.suspendedTenants,
          churnRatePercent: bundle.kpis.churnRatePercent,
          failedCount: bundle.kpis.failedSubscriptions,
        },
        revenueByPlan: bundle.revenueSummary.revenueByPlan,
        revenueTrend: bundle.timeSeries.map(ts => ({ date: ts.date, label: ts.label, mrr: ts.mrr })),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to load platform revenue analytics.' });
    }
  });

  // 4. GET /api/platform/analytics/usage
  app.get('/api/platform/analytics/usage', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const timeframe = String(req.query.timeframe || '30d');
      const page = Math.max(1, Math.floor(Number(req.query.page || 1)));
      const limit = Math.min(100, Math.max(1, Math.floor(Number(req.query.limit || req.query.pageSize || 20))));

      const { tenants, plans, usageMetersMap } = await fetchAnalyticsData(db);
      const bundle = computePlatformAnalytics(tenants, plans, timeframe, usageMetersMap);

      const highUsageTenants = tenants
        .map(t => {
          const sub = t.subscription || {};
          const pId = String(sub.planId || 'starter').toLowerCase();
          const plan = plans.find(p => p.id === pId) || plans[0];
          const meter = usageMetersMap[t.id] || {};
          const usedOrders = Math.max(0, Math.floor(Number(meter.ordersMonthly || 0)));
          const limitOrders = Math.max(1, Math.floor(Number(plan.limits.ordersMonthly || 2500)));
          const overrideActive = Boolean(meter.overrideMonthlyOrders || sub.overrideMonthlyOrders || t.overrideMonthlyOrders);
          const usagePercent = Math.round((usedOrders / limitOrders) * 100);
          return {
            id: t.id,
            name: String(t.name || t.id),
            planName: String(sub.planName || plan.name),
            usedOrders,
            limitOrders,
            usagePercent,
            overrideActive,
            status: usagePercent >= 100 && !overrideActive ? 'EXCEEDED' : usagePercent >= 80 ? 'WARNING' : 'HEALTHY',
          };
        })
        .filter(t => t.usagePercent >= 80 || t.overrideActive)
        .sort((a, b) => b.usagePercent - a.usagePercent);

      const paginatedHighUsage = highUsageTenants.slice((page - 1) * limit, page * limit);

      return res.json({
        success: true,
        timeframe: bundle.timeframe,
        overview: bundle.usageSummary,
        highUsageTenants: paginatedHighUsage,
        pagination: {
          page,
          limit,
          totalItems: highUsageTenants.length,
          totalPages: Math.max(1, Math.ceil(highUsageTenants.length / limit)),
        },
        usageTrend: bundle.timeSeries.map(ts => ({ date: ts.date, label: ts.label, orders: ts.orders })),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to load platform usage analytics.' });
    }
  });

  // 5. GET /api/platform/analytics/growth
  app.get('/api/platform/analytics/growth', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const timeframe = String(req.query.timeframe || '30d');
      const { tenants, plans, usageMetersMap } = await fetchAnalyticsData(db);
      const bundle = computePlatformAnalytics(tenants, plans, timeframe, usageMetersMap);

      const lifecycleDistribution = {
        active: bundle.kpis.activeTenants,
        trialing: bundle.kpis.trialingTenants,
        suspended: bundle.kpis.suspendedTenants,
        cancelled: bundle.kpis.cancelledTenants,
        archived: bundle.kpis.archivedTenants,
        provisioning: bundle.kpis.provisioningTenants,
      };

      return res.json({
        success: true,
        timeframe: bundle.timeframe,
        summary: {
          totalTenants: bundle.kpis.totalTenants,
          newTenantsInPeriod: bundle.kpis.newTenantsInPeriod,
          growthRatePercent: bundle.kpis.tenantGrowthRatePercent,
          churnedTenantsInPeriod: bundle.kpis.cancelledTenants + bundle.kpis.suspendedTenants,
          netGrowth: bundle.kpis.newTenantsInPeriod - (bundle.kpis.cancelledTenants + bundle.kpis.suspendedTenants),
        },
        lifecycleDistribution,
        growthTrend: bundle.timeSeries.map(ts => ({
          date: ts.date,
          label: ts.label,
          newTenants: ts.newTenants,
          cumulativeTenants: ts.cumulativeTenants,
        })),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to load platform growth analytics.' });
    }
  });

  // ============================================================
  // Alert & Incident Control Plane Endpoints
  // ============================================================

  // 1. GET /api/platform/alerts
  app.get('/api/platform/alerts', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const result = await getPlatformAlerts(db, {
        status: req.query.status ? String(req.query.status) : undefined,
        severity: req.query.severity ? String(req.query.severity) : undefined,
        tenantId: req.query.tenantId ? String(req.query.tenantId) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.pageSize || req.query.limit ? Number(req.query.pageSize || req.query.limit) : 20,
      });
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to load platform alerts.' });
    }
  });

  // 2. GET /api/platform/alerts/summary
  app.get('/api/platform/alerts/summary', ...platformAuth, async (_req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const summary = await getPlatformAlertSummary(db);
      return res.json({ success: true, summary });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to load platform alert summary.' });
    }
  });

  // 3. GET /api/platform/alerts/:alertId
  app.get('/api/platform/alerts/:alertId', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const detail = await getPlatformAlertDetail(db, req.params.alertId);
      return res.json({ success: true, ...detail });
    } catch (err: any) {
      const status = err?.statusCode || 500;
      return res.status(status).json({ error: err?.message || 'Unable to load alert detail.' });
    }
  });

  // 4. PATCH /api/platform/alerts/:alertId/acknowledge
  app.patch('/api/platform/alerts/:alertId/acknowledge', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const actor = {
        uid: (req as any).user?.uid || 'server_admin',
        email: (req as any).user?.email || 'admin@markithub.internal',
        role: (req as any).user?.role || 'Super Admin',
      };
      const alert = await acknowledgePlatformAlert(db, req.params.alertId, actor, req.body?.reason);
      return res.json({ success: true, alert });
    } catch (err: any) {
      const status = err?.statusCode || 400;
      return res.status(status).json({ error: err?.message || 'Unable to acknowledge alert.' });
    }
  });

  // 5. PATCH /api/platform/alerts/:alertId/resolve
  app.patch('/api/platform/alerts/:alertId/resolve', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const actor = {
        uid: (req as any).user?.uid || 'server_admin',
        email: (req as any).user?.email || 'admin@markithub.internal',
        role: (req as any).user?.role || 'Super Admin',
      };
      const alert = await resolvePlatformAlert(db, req.params.alertId, actor, req.body?.reason);
      return res.json({ success: true, alert });
    } catch (err: any) {
      const status = err?.statusCode || 400;
      return res.status(status).json({ error: err?.message || 'Unable to resolve alert.' });
    }
  });

  // 6. PATCH /api/platform/alerts/:alertId/dismiss
  app.patch('/api/platform/alerts/:alertId/dismiss', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const actor = {
        uid: (req as any).user?.uid || 'server_admin',
        email: (req as any).user?.email || 'admin@markithub.internal',
        role: (req as any).user?.role || 'Super Admin',
      };
      const alert = await dismissPlatformAlert(db, req.params.alertId, actor, req.body?.reason);
      return res.json({ success: true, alert });
    } catch (err: any) {
      const status = err?.statusCode || 400;
      return res.status(status).json({ error: err?.message || 'Unable to dismiss alert.' });
    }
  });

  // ==========================================
  // NOTIFICATION & ESCALATION CONTROL PLANE
  // ==========================================

  // 1. GET /api/platform/notifications
  app.get('/api/platform/notifications', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const adminUid = (req as any).user?.uid || 'admin_1';
      const unreadOnly = req.query.unreadOnly === 'true';
      const severity = req.query.severity ? String(req.query.severity) : undefined;
      const type = req.query.type ? String(req.query.type) : undefined;
      const status = req.query.status ? String(req.query.status) : undefined;
      const escalationState = req.query.escalationState ? String(req.query.escalationState) : undefined;
      const tenantId = req.query.tenantId ? String(req.query.tenantId) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;

      const result = await getPlatformNotifications(db, {
        recipientUid: adminUid,
        unreadOnly,
        severity,
        type,
        status,
        escalationState,
        tenantId,
        search,
        page,
        limit,
      });

      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to fetch platform notifications.' });
    }
  });

  // 2. GET /api/platform/notifications/summary
  app.get('/api/platform/notifications/summary', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const adminUid = (req as any).user?.uid || 'admin_1';
      // Automatically process any pending alert SLA escalations
      await processAlertEscalations(db);
      const summary = await getNotificationSummary(db, adminUid);
      return res.json({ success: true, ...summary });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to fetch notification summary.' });
    }
  });

  // 3. PATCH /api/platform/notifications/:id/read
  app.patch('/api/platform/notifications/:id/read', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const adminUid = (req as any).user?.uid || 'admin_1';
      const notification = await markNotificationAsRead(db, req.params.id, adminUid);
      return res.json({ success: true, notification });
    } catch (err: any) {
      const status = err?.statusCode || 400;
      return res.status(status).json({ error: err?.message || 'Unable to mark notification as read.' });
    }
  });

  // 4. PATCH /api/platform/notifications/read-all
  app.patch('/api/platform/notifications/read-all', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const adminUid = (req as any).user?.uid || 'admin_1';
      const result = await markAllNotificationsAsRead(db, adminUid);
      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to mark all notifications as read.' });
    }
  });

  // 5. GET /api/platform/notification-preferences
  app.get('/api/platform/notification-preferences', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const adminUid = (req as any).user?.uid || 'admin_1';
      const preferences = await getNotificationPreferences(db, adminUid);
      return res.json({ success: true, preferences });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to fetch notification preferences.' });
    }
  });

  // 6. PATCH /api/platform/notification-preferences
  app.patch('/api/platform/notification-preferences', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const adminUid = (req as any).user?.uid || 'admin_1';
      const actor = {
        uid: adminUid,
        email: (req as any).user?.email || 'admin@markithub.internal',
        role: (req as any).user?.role || 'Super Admin',
      };
      const { enabledChannels, severityPreferences, typePreferences, reason } = req.body || {};
      const updated = await updateNotificationPreferences(
        db,
        adminUid,
        { enabledChannels, severityPreferences, typePreferences },
        actor,
        reason
      );
      return res.json({ success: true, preferences: updated });
    } catch (err: any) {
      const status = err?.statusCode || 400;
      return res.status(status).json({ error: err?.message || 'Unable to update notification preferences.' });
    }
  });

  // 7. GET /api/platform/escalation-policies
  app.get('/api/platform/escalation-policies', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const policies = await getEscalationPolicies(db);
      return res.json({ success: true, policies });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to fetch escalation policies.' });
    }
  });

  // 8. PATCH /api/platform/escalation-policies/:id
  app.patch('/api/platform/escalation-policies/:id', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const actor = {
        uid: (req as any).user?.uid || 'admin_1',
        email: (req as any).user?.email || 'admin@markithub.internal',
        role: (req as any).user?.role || 'Super Admin',
      };
      const { name, thresholdMinutes, enabled, action, reason } = req.body || {};
      const updated = await updateEscalationPolicy(
        db,
        req.params.id,
        { name, thresholdMinutes, enabled, action },
        actor,
        reason
      );
      return res.json({ success: true, policy: updated });
    } catch (err: any) {
      const status = err?.statusCode || 400;
      return res.status(status).json({ error: err?.message || 'Unable to update escalation policy.' });
    }
  });

  // =========================================================================
  // PLATFORM IDENTITY, ACCESS & DELEGATED ADMINISTRATION ENDPOINTS
  // =========================================================================

  // 1. GET /api/platform/administrators/roles/matrix
  app.get('/api/platform/administrators/roles/matrix', ...platformPerm('admins.view'), async (_req, res) => {
    return res.json({
      success: true,
      matrix: getRolePermissionMatrix(),
    });
  });

  // 2. GET /api/platform/administrators/me/context
  app.get('/api/platform/administrators/me/context', ...platformPerm('admins.view'), async (req: any, res) => {
    const admin = req.platformAdmin;
    return res.json({
      success: true,
      administrator: admin,
      effectivePermissions: req.platformPermissions || [],
    });
  });

  // 3. GET /api/platform/administrators
  app.get('/api/platform/administrators', ...platformPerm('admins.view'), async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const { status, role, search } = req.query || {};
      const result = await listPlatformAdministrators(db, {
        status: status ? String(status) : undefined,
        role: role ? String(role) : undefined,
        search: search ? String(search) : undefined,
      });
      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to list platform administrators.' });
    }
  });

  // 4. GET /api/platform/administrators/:id
  app.get('/api/platform/administrators/:id', ...platformPerm('admins.view'), async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const admin = await getPlatformAdministrator(db, req.params.id);
      if (!admin) {
        return res.status(404).json({ error: `Platform administrator '${req.params.id}' not found.` });
      }
      return res.json({ success: true, administrator: admin });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to get platform administrator.' });
    }
  });

  // 5. GET /api/platform/administrators/:id/history
  app.get('/api/platform/administrators/:id/history', ...platformPerm('admins.view'), async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
      const history = await getAdministratorActivityHistory(db, req.params.id, limit);
      return res.json({ success: true, history });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to get administrator activity history.' });
    }
  });

  // 6. POST /api/platform/administrators
  app.post('/api/platform/administrators', ...platformPerm('admins.manage'), async (req: any, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const caller = extractCallerContext(req);
      const newAdmin = await createPlatformAdministrator(db, caller, req.body || {});
      return res.status(201).json({ success: true, administrator: newAdmin });
    } catch (err: any) {
      const status = err?.statusCode || 400;
      return res.status(status).json({ error: err?.message || 'Failed to create platform administrator.' });
    }
  });

  // 7. PATCH /api/platform/administrators/:id/profile
  app.patch('/api/platform/administrators/:id/profile', ...platformPerm('admins.manage'), async (req: any, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const caller = extractCallerContext(req);
      const updated = await updatePlatformAdminProfile(db, caller, req.params.id, req.body || {});
      return res.json({ success: true, administrator: updated });
    } catch (err: any) {
      const status = err?.statusCode || 400;
      return res.status(status).json({ error: err?.message || 'Failed to update administrator profile.' });
    }
  });

  // 8. PATCH /api/platform/administrators/:id/role
  app.patch('/api/platform/administrators/:id/role', ...platformPerm('admins.roles'), async (req: any, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const caller = extractCallerContext(req);
      const { role, justification, expectedVersion } = req.body || {};
      const updated = await assignPlatformAdminRole(
        db,
        caller,
        req.params.id,
        role,
        justification,
        expectedVersion !== undefined ? Number(expectedVersion) : undefined
      );
      return res.json({ success: true, administrator: updated });
    } catch (err: any) {
      const status = err?.statusCode || 400;
      return res.status(status).json({ error: err?.message || 'Failed to assign platform administrator role.' });
    }
  });

  // 9. PATCH /api/platform/administrators/:id/permissions
  app.patch('/api/platform/administrators/:id/permissions', ...platformPerm('admins.permissions'), async (req: any, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const caller = extractCallerContext(req);
      const { delegatedPermissions, justification, expectedVersion } = req.body || {};
      const updated = await updatePlatformAdminPermissions(
        db,
        caller,
        req.params.id,
        delegatedPermissions,
        justification,
        expectedVersion !== undefined ? Number(expectedVersion) : undefined
      );
      return res.json({ success: true, administrator: updated });
    } catch (err: any) {
      const status = err?.statusCode || 400;
      return res.status(status).json({ error: err?.message || 'Failed to update delegated permissions.' });
    }
  });

  // 10. PATCH /api/platform/administrators/:id/status
  app.patch('/api/platform/administrators/:id/status', ...platformPerm('admins.suspend'), async (req: any, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const caller = extractCallerContext(req);
      const { status, justification, expectedVersion } = req.body || {};
      const updated = await updatePlatformAdminStatus(
        db,
        caller,
        req.params.id,
        status,
        justification,
        expectedVersion !== undefined ? Number(expectedVersion) : undefined
      );
      return res.json({ success: true, administrator: updated });
    } catch (err: any) {
      const status = err?.statusCode || 400;
      return res.status(status).json({ error: err?.message || 'Failed to update administrator status.' });
    }
  });

  // 11. DELETE /api/platform/administrators/:id
  app.delete('/api/platform/administrators/:id', ...platformPerm('admins.delete'), async (req: any, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const caller = extractCallerContext(req);
      const justification = req.body?.justification || req.query?.justification;
      const expectedVersion = req.body?.expectedVersion !== undefined
        ? Number(req.body.expectedVersion)
        : (req.query?.expectedVersion !== undefined ? Number(req.query.expectedVersion) : undefined);

      const result = await deletePlatformAdministrator(db, caller, req.params.id, justification, expectedVersion);
      return res.json({ success: true, ...result });
    } catch (err: any) {
      const status = err?.statusCode || 400;
      return res.status(status).json({ error: err?.message || 'Failed to remove platform administrator.' });
    }
  });

  // 12. POST /api/platform/administrators/:id/break-glass
  app.post('/api/platform/administrators/:id/break-glass', ...platformPerm('break_glass.grant'), async (req: any, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const caller = extractCallerContext(req);
      const updated = await grantBreakGlassElevation(db, caller, req.params.id, req.body || {});
      return res.json({ success: true, administrator: updated });
    } catch (err: any) {
      const status = err?.statusCode || 400;
      return res.status(status).json({ error: err?.message || 'Failed to grant break-glass elevation.' });
    }
  });

  // 13. DELETE /api/platform/administrators/:id/break-glass
  app.delete('/api/platform/administrators/:id/break-glass', ...platformPerm('break_glass.revoke'), async (req: any, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const caller = extractCallerContext(req);
      const justification = req.body?.justification || req.query?.justification;
      const expectedVersion = req.body?.expectedVersion !== undefined
        ? Number(req.body.expectedVersion)
        : (req.query?.expectedVersion !== undefined ? Number(req.query.expectedVersion) : undefined);

      const updated = await revokeBreakGlassElevation(db, caller, req.params.id, justification, expectedVersion);
      return res.json({ success: true, administrator: updated });
    } catch (err: any) {
      const status = err?.statusCode || 400;
      return res.status(status).json({ error: err?.message || 'Failed to revoke break-glass elevation.' });
    }
  });

  // 14. POST /api/platform/administrators/:id/break-glass/revoke
  app.post('/api/platform/administrators/:id/break-glass/revoke', ...platformPerm('break_glass.revoke'), async (req: any, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const caller = extractCallerContext(req);
      const { justification, expectedVersion } = req.body || {};
      const updated = await revokeBreakGlassElevation(
        db,
        caller,
        req.params.id,
        justification,
        expectedVersion !== undefined ? Number(expectedVersion) : undefined
      );
      return res.json({ success: true, administrator: updated });
    } catch (err: any) {
      const status = err?.statusCode || 400;
      return res.status(status).json({ error: err?.message || 'Failed to revoke break-glass elevation.' });
    }
  });

  // 15. POST /api/platform/administrators/break-glass/sweep
  app.post('/api/platform/administrators/break-glass/sweep', ...platformPerm('break_glass.revoke'), async (_req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const expiredCount = await sweepExpiredBreakGlass(db);
      return res.json({ success: true, expiredCount });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to sweep expired break-glass access.' });
    }
  });

  // =========================================================================
  // Super Admin Audit, Compliance & Governance Control Plane
  // =========================================================================

  // 1. GET /api/platform/audit/summary
  app.get('/api/platform/audit/summary', ...platformPerm('audit.view'), async (_req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const summary = await getPlatformAuditSummary(db);
      return res.json({ success: true, summary });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to get platform audit summary.' });
    }
  });

  // 2. GET /api/platform/audit/compliance-report
  app.get('/api/platform/audit/compliance-report', ...platformPerm('audit.view'), async (req: any, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const { startDate, endDate, tenantId } = req.query || {};
      const report = await generateComplianceReport(db, {
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
        tenantId: tenantId ? String(tenantId) : undefined,
      });
      return res.json({ success: true, report });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to generate compliance report.' });
    }
  });

  // 3. POST /api/platform/audit/export
  app.post('/api/platform/audit/export', ...platformPerm('audit.export'), async (req: any, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const caller = extractCallerContext(req);
      const { filters = {}, format, reason } = req.body || {};
      const result = await exportPlatformAuditEvents(db, filters, caller, reason);

      if (format === 'csv' || req.headers.accept?.includes('text/csv')) {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="platform-audit-export-${Date.now()}.csv"`);
        return res.send(result.csv);
      }

      return res.json({
        success: true,
        csv: result.csv,
        count: result.count,
        exportAuditId: result.exportAuditId,
      });
    } catch (err: any) {
      const status = err?.statusCode || 500;
      return res.status(status).json({ error: err?.message || 'Failed to export platform audit records.' });
    }
  });

  // 4. POST /api/platform/audit/correlate
  app.post('/api/platform/audit/correlate', ...platformPerm('audit.view'), async (req: any, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const result = await correlatePlatformAuditEvents(db, req.body || {});
      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to correlate audit events.' });
    }
  });

  // 5. GET /api/platform/audit
  app.get('/api/platform/audit', ...platformPerm('audit.view'), async (req: any, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const {
        page,
        limit,
        pageSize,
        actorUid,
        actorEmail,
        action,
        module: auditModule,
        severity,
        result: auditResult,
        category,
        tenantId,
        targetType,
        targetId,
        startDate,
        endDate,
        correlationId,
        requestId,
        search,
      } = req.query || {};

      const filters: AuditFilterParams = {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
        actorUid: actorUid ? String(actorUid) : undefined,
        actorEmail: actorEmail ? String(actorEmail) : undefined,
        action: action ? String(action) : undefined,
        module: auditModule ? String(auditModule) : undefined,
        severity: severity ? (String(severity) as any) : undefined,
        result: auditResult ? (String(auditResult) as any) : undefined,
        category: category ? (String(category) as any) : undefined,
        tenantId: tenantId ? String(tenantId) : undefined,
        targetType: targetType ? String(targetType) : undefined,
        targetId: targetId ? String(targetId) : undefined,
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
        correlationId: correlationId ? String(correlationId) : undefined,
        requestId: requestId ? String(requestId) : undefined,
        search: search ? String(search) : undefined,
      };

      const result = await listPlatformAuditEvents(db, filters);
      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to list platform audit events.' });
    }
  });

  // 6. GET /api/platform/audit/:id
  app.get('/api/platform/audit/:id', ...platformPerm('audit.view'), async (req: any, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const event = await getPlatformAuditEvent(db, req.params.id);
      if (!event) {
        return res.status(404).json({ error: `Audit record '${req.params.id}' not found.` });
      }
      return res.json({ success: true, event });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to get audit record.' });
    }
  });

  // 7. POST /api/platform/audit/:id/verify-integrity
  app.post('/api/platform/audit/:id/verify-integrity', ...platformPerm('audit.verify'), async (req: any, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const caller = extractCallerContext(req);
      const result = await verifyAuditIntegrity(db, req.params.id, caller);
      return res.json({ success: true, ...result });
    } catch (err: any) {
      const status = err?.statusCode || 500;
      return res.status(status).json({ error: err?.message || 'Failed to verify audit integrity.' });
    }
  });
}
