import crypto from 'node:crypto';
import type { Express, RequestHandler } from 'express';
import { createAuthoritativeAuditRecord, updateAuthoritativeSecurityMetrics } from './auditService';
import { DEFAULT_ROLE_PERMISSIONS } from '../utils/permissions';
import {
  DEFAULT_PLATFORM_PLANS,
  assertLifecycleTransition,
  calculateSubscriptionRevenue,
  makeTenantSlug,
  normalizePlanInput,
  type BillingInterval,
  type PlatformPlan,
  type PlatformSubscription,
  type SubscriptionStatus,
  type TenantLifecycleStatus,
} from './platformAdminControlPlane';

interface PlatformRouteDeps {
  app: Express;
  requireServerAuth: RequestHandler;
  requirePlatformAdmin: RequestHandler;
  getAdminDb: () => any;
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
  return ['provisioning', 'trialing', 'active', 'suspended', 'cancelled'].includes(String(value))
    ? String(value) as TenantLifecycleStatus
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
}: PlatformRouteDeps): void {
  const platformAuth = [requireServerAuth, requirePlatformAdmin];

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
      await ref.set(plan);
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
      await ref.set(plan, { merge: true });
      return res.json({ success: true, plan });
    } catch (err: any) {
      return res.status(400).json({ error: err?.message || 'Unable to update plan.' });
    }
  });

  app.get('/api/platform/tenants', ...platformAuth, async (req, res) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const limit = Math.min(100, Math.max(1, Math.floor(Number(req.query.limit || 100))));
      const lifecycle = req.query.lifecycle ? String(req.query.lifecycle) : '';
      const planId = req.query.planId ? String(req.query.planId) : '';
      const snap = await db.collection('tenants').orderBy('updatedAt', 'desc').limit(limit).get();
      const tenants = snap.docs
        .map((doc: any) => {
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
              currentPeriodEnd: subscription.currentPeriodEnd ? String(subscription.currentPeriodEnd) : undefined,
            },
          };
        })
        .filter((tenant: any) => !lifecycle || tenant.lifecycleStatus === lifecycle)
        .filter((tenant: any) => !planId || tenant.subscription.planId === planId);
      return res.json({ success: true, tenants });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to load platform tenants.' });
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
        const [staff, orders, auditEvents] = await Promise.all([
          db.collection('staff').where('tenantId', '==', tenant.id).count().get(),
          db.collection('orders').where('tenantId', '==', tenant.id).count().get(),
          db.collection('audit_logs').where('tenantId', '==', tenant.id).count().get(),
        ]);
        return {
          ...tenant,
          staff: staff.data().count,
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
    const ownerUid = String(req.body?.ownerUid || '').trim();
    const ownerEmail = String(req.body?.ownerEmail || '').trim().toLowerCase();
    const currency = cleanCurrency(req.body?.currency);
    const timezone = String(req.body?.timezone || 'UTC').trim() || 'UTC';
    const planId = String(req.body?.planId || 'starter').trim().toLowerCase();
    const interval = cleanInterval(req.body?.billingInterval);
    const trialDays = Math.min(30, Math.max(0, Math.floor(Number(req.body?.trialDays || 0))));

    if (!name) return res.status(400).json({ error: 'Tenant name is required.' });
    if (!ownerUid) return res.status(400).json({ error: 'An existing Firebase owner UID is required for provisioning.' });

    try {
      const tenantId = `tenant_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
      const staffId = `staff_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
      const tenantRef = db.collection('tenants').doc(tenantId);
      const staffRef = db.collection('staff').doc(staffId);
      const metricsRef = db.collection('tenant_security_metrics').doc(tenantId);
      const billingRef = db.collection('platform_billing_events').doc();
      let createdTenant: any = null;

      const resolvedPlan = await loadPlan(db, planId);
      await db.runTransaction(async (transaction: any) => {
        const plan = resolvedPlan.plan;
        const now = new Date().toISOString();
        const lifecycleStatus: TenantLifecycleStatus = trialDays > 0 ? 'trialing' : 'active';
        const subscriptionStatus: SubscriptionStatus = trialDays > 0 ? 'trialing' : 'active';
        const periodDays = interval === 'annual' ? 365 : 30;
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
          legalName: name,
          slug,
          status: 'active',
          lifecycleStatus,
          ownerUid,
          ownerEmail: ownerEmail || undefined,
          currency,
          timezone,
          createdAt: now,
          updatedAt: now,
          subscription,
        };

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
          targetName: name,
          newState: { lifecycleStatus, planId: plan.id, billingInterval: interval, ownerUid },
          result: 'success',
          severity: 'critical',
          details: `Provisioned tenant '${name}' on ${plan.name} plan.`,
          metadata: { platformAdmin: true, trialDays, currency, timezone },
        });
        await updateAuthoritativeSecurityMetrics(db, audit, transaction);

        if (!resolvedPlan.exists) {
          transaction.set(db.collection('platform_plans').doc(plan.id), plan);
        }
        transaction.set(tenantRef, createdTenant);
        transaction.set(staffRef, {
          id: staffId,
          uid: ownerUid,
          tenantId,
          name: ownerEmail ? ownerEmail.split('@')[0] : 'Business Owner',
          email: ownerEmail,
          role: 'Business Owner',
          status: 'active',
          permissionsOverride: DEFAULT_ROLE_PERMISSIONS['Business Owner'],
          createdAt: now,
          updatedAt: now,
        });
        transaction.set(metricsRef, {
          tenantId,
          staffSuspensions: 0,
          rolePermissionChanges: 0,
          ownershipEvents: 0,
          failedDeniedOperations: 0,
          dailyBuckets: {},
          updatedAt: now,
        });

        transaction.set(db.collection('audit_logs').doc(audit.id), audit);

        transaction.set(billingRef, {
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
        });
      });

      return res.status(201).json({ success: true, tenant: createdTenant });
    } catch (err: any) {
      return res.status(400).json({ error: err?.message || 'Tenant provisioning failed.' });
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
        const planId = tenantPlanId || String(current.planId || 'starter');
        const interval = cleanInterval(req.body?.billingInterval || current.interval);
        const status = cleanSubscriptionStatus(req.body?.status || current.status || 'active');
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
          newState: { planId: plan.id, planName: plan.name, status, interval, price: subscription.price },
          result: 'success',
          severity: 'warning',
          details: `Subscription changed to ${plan.name} (${interval}).`,
          metadata: { platformAdmin: true },
        });
        const auditRef = db.collection('audit_logs').doc(audit.id);
        const billingRef = db.collection('platform_billing_events').doc();
        await updateAuthoritativeSecurityMetrics(db, audit, transaction);
        if (!resolvedPlan.exists) transaction.set(db.collection('platform_plans').doc(plan.id), plan);
        transaction.set(tenantRef, { subscription, updatedAt: now }, { merge: true });
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
    const nextLifecycle = cleanLifecycleStatus(req.body?.lifecycleStatus);
    const reason = String(req.body?.reason || '').trim();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID is required.' });
    if (!reason) return res.status(400).json({ error: 'A reason is required for tenant lifecycle changes.' });

    try {
      let resultTenant: any = null;
      await db.runTransaction(async (transaction: any) => {
        const tenantRef = db.collection('tenants').doc(tenantId);
        const tenantSnap = await transaction.get(tenantRef);
        if (!tenantSnap.exists) throw Object.assign(new Error(`Tenant '${tenantId}' not found.`), { statusCode: 404 });
        const data = tenantSnap.data() as any;
        const currentLifecycle = cleanLifecycleStatus(data.lifecycleStatus || data.status);
        assertLifecycleTransition(currentLifecycle, nextLifecycle);
        const now = new Date().toISOString();
        const operationalStatus = nextLifecycle === 'suspended' || nextLifecycle === 'cancelled' ? 'suspended' : 'active';
        const subscription = { ...(data.subscription || {}) };
        if (nextLifecycle === 'suspended') subscription.status = 'suspended';
        if (nextLifecycle === 'cancelled') subscription.status = 'cancelled';
        if (nextLifecycle === 'active' && ['suspended', 'cancelled'].includes(subscription.status)) subscription.status = 'active';

        const audit = createAuthoritativeAuditRecord({
          tenantId,
          actorUid: req.user!.uid,
          actorName: req.user!.email || req.user!.uid,
          actorEmail: req.user!.email || null,
          actorRole: 'Super Admin',
          action: `TENANT_LIFECYCLE_${nextLifecycle.toUpperCase()}`,
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
          metadata: { platformAdmin: true },
        });
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
      return res.json({ success: true, tenant: resultTenant });
    } catch (err: any) {
      return res.status(err?.statusCode || 400).json({ error: err?.message || 'Tenant lifecycle update failed.' });
    }
  });
}
