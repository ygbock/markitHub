import crypto from 'node:crypto';
import type { AuditLog } from '../types';
import { createAuthoritativeAuditRecord } from './auditService';
import { calculateTenantHealth, DEFAULT_PLATFORM_PLANS } from './platformAdminControlPlane';
import { calculateUsagePercent, usageLimitState, usageMeterId, usagePeriod, USAGE_METER_COLLECTION } from './platformUsageMeter';
import { createNotificationsFromAlert } from './platformNotificationControlPlane';

export type PlatformAlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type PlatformAlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';

export type PlatformAlertType =
  // Critical
  | 'PROVISIONING_FAILURE'
  | 'PAYMENT_FAILURE'
  | 'SECURITY_ANOMALY'
  | 'UNEXPECTED_SUSPENSION'
  | 'USAGE_LIMIT_VIOLATION'
  // Warning
  | 'USAGE_LIMIT_APPROACHING'
  | 'TRIAL_EXPIRING_SOON'
  | 'PAST_DUE_SUBSCRIPTION'
  | 'HEALTH_AT_RISK'
  | 'PROVISIONING_DELAYED'
  // Informational
  | 'TENANT_PROVISIONED'
  | 'TENANT_ACTIVATED'
  | 'PLAN_CHANGED'
  | 'SUBSCRIPTION_RENEWED'
  | 'USAGE_OVERRIDE_CHANGED';

export type PlatformAlertSource =
  | 'provisioning'
  | 'billing'
  | 'lifecycle'
  | 'usage'
  | 'security'
  | 'analytics';

export interface AlertResolutionHistoryEntry {
  status: PlatformAlertStatus;
  timestamp: string;
  actorUid: string;
  actorEmail?: string | null;
  actorRole?: string;
  reason: string;
}

export interface PlatformAlert {
  alertId: string;
  type: PlatformAlertType;
  severity: PlatformAlertSeverity;
  status: PlatformAlertStatus;
  tenantId: string;
  tenantName?: string;
  title: string;
  description: string;
  source: PlatformAlertSource;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
  dismissedAt?: string | null;
  dismissedBy?: string | null;
  resolutionReason?: string | null;
  dedupKey?: string;
  metadata?: Record<string, unknown>;
  resolutionHistory?: AlertResolutionHistoryEntry[];
}

export interface PlatformAlertSummary {
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  openCount: number;
  acknowledgedCount: number;
  resolvedCount: number;
  resolvedTodayCount: number;
  dismissedCount: number;
  totalCount: number;
}

export interface CreateAlertParams {
  alertId?: string;
  type: PlatformAlertType;
  severity?: PlatformAlertSeverity;
  tenantId: string;
  tenantName?: string;
  title: string;
  description: string;
  source: PlatformAlertSource;
  metadata?: Record<string, unknown>;
  dedupKey?: string;
}

/**
 * Maps alert types to standard severities
 */
export function inferAlertSeverity(type: PlatformAlertType): PlatformAlertSeverity {
  switch (type) {
    case 'PROVISIONING_FAILURE':
    case 'PAYMENT_FAILURE':
    case 'SECURITY_ANOMALY':
    case 'UNEXPECTED_SUSPENSION':
    case 'USAGE_LIMIT_VIOLATION':
      return 'CRITICAL';
    case 'USAGE_LIMIT_APPROACHING':
    case 'TRIAL_EXPIRING_SOON':
    case 'PAST_DUE_SUBSCRIPTION':
    case 'HEALTH_AT_RISK':
    case 'PROVISIONING_DELAYED':
      return 'WARNING';
    case 'TENANT_PROVISIONED':
    case 'TENANT_ACTIVATED':
    case 'PLAN_CHANGED':
    case 'SUBSCRIPTION_RENEWED':
    case 'USAGE_OVERRIDE_CHANGED':
    default:
      return 'INFO';
  }
}

/**
 * Creates or updates an alert in `platform_alerts` idempotently using `dedupKey`.
 */
export async function createPlatformAlert(
  db: any,
  params: CreateAlertParams
): Promise<{ alert: PlatformAlert; isNew: boolean }> {
  if (!db) throw new Error('Database connection unavailable.');
  if (!params.tenantId) throw new Error('tenantId is required to create a platform alert.');
  if (!params.type) throw new Error('alert type is required.');
  if (!params.title || !params.description) throw new Error('alert title and description are required.');

  const now = new Date().toISOString();
  const severity = params.severity || inferAlertSeverity(params.type);
  const dedupKey = params.dedupKey || `${params.tenantId}_${params.type}`;

  // Check if an OPEN or ACKNOWLEDGED alert with the same dedupKey already exists
  const existingQuery = await db.collection('platform_alerts')
    .where('dedupKey', '==', dedupKey)
    .where('status', 'in', ['OPEN', 'ACKNOWLEDGED'])
    .limit(1)
    .get();

  if (!existingQuery.empty) {
    const existingDoc = existingQuery.docs[0];
    const existingData = existingDoc.data() as PlatformAlert;
    const updatedAlert: PlatformAlert = {
      ...existingData,
      alertId: existingDoc.id,
      tenantName: params.tenantName || existingData.tenantName,
      title: params.title,
      description: params.description,
      severity,
      updatedAt: now,
      metadata: { ...(existingData.metadata || {}), ...(params.metadata || {}) },
    };
    await db.collection('platform_alerts').doc(existingDoc.id).set(updatedAlert, { merge: true });
    return { alert: updatedAlert, isNew: false };
  }

  const alertId = params.alertId || `alt_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const newAlert: PlatformAlert = {
    alertId,
    type: params.type,
    severity,
    status: 'OPEN',
    tenantId: params.tenantId,
    tenantName: params.tenantName,
    title: params.title,
    description: params.description,
    source: params.source,
    createdAt: now,
    updatedAt: now,
    dedupKey,
    metadata: params.metadata || {},
    resolutionHistory: [],
  };

  await db.collection('platform_alerts').doc(alertId).set(newAlert);
  try {
    await createNotificationsFromAlert(db, newAlert);
  } catch (err) {
    console.error('Failed to create notifications for new alert:', err);
  }
  return { alert: newAlert, isNew: true };
}

/**
 * Scans a tenant's state and generates authoritative system alerts idempotently.
 */
export async function evaluateTenantAlerts(
  db: any,
  tenantDoc: any
): Promise<number> {
  if (!tenantDoc) return 0;
  const data = typeof tenantDoc.data === 'function' ? tenantDoc.data() : tenantDoc;
  const tenantId = tenantDoc.id || data.id;
  if (!tenantId) return 0;

  const tenantName = String(data.name || data.businessName || data.storeName || tenantId);
  const lifecycleStatus = String(data.lifecycleStatus || data.status || 'active');
  const subscription = data.subscription || {};
  const subStatus = String(subscription.status || 'active');
  const planId = String(subscription.planId || 'starter');
  let createdCount = 0;

  // 1. Provisioning checks
  if (lifecycleStatus === 'provisioning') {
    const provisioningStatus = String(data.provisioningStatus || 'pending');
    if (provisioningStatus === 'failed') {
      const { isNew } = await createPlatformAlert(db, {
        tenantId,
        tenantName,
        type: 'PROVISIONING_FAILURE',
        severity: 'CRITICAL',
        source: 'provisioning',
        title: `Tenant Provisioning Failed: ${tenantName}`,
        description: `Tenant ${tenantName} (${tenantId}) failed provisioning setup: ${data.provisioningError || 'Unknown provisioning error'}.`,
        dedupKey: `${tenantId}_PROVISIONING_FAILURE`,
        metadata: { error: data.provisioningError },
      });
      if (isNew) createdCount++;
    } else {
      const createdAt = data.createdAt ? new Date(data.createdAt).getTime() : Date.now();
      const hoursInProvisioning = (Date.now() - createdAt) / (1000 * 60 * 60);
      if (hoursInProvisioning > 1) {
        const { isNew } = await createPlatformAlert(db, {
          tenantId,
          tenantName,
          type: 'PROVISIONING_DELAYED',
          severity: 'WARNING',
          source: 'provisioning',
          title: `Provisioning Delayed: ${tenantName}`,
          description: `Tenant ${tenantName} has been in provisioning state for over ${Math.floor(hoursInProvisioning)} hours.`,
          dedupKey: `${tenantId}_PROVISIONING_DELAYED`,
        });
        if (isNew) createdCount++;
      }
    }
  }

  // 2. Unexpected suspension check
  if (lifecycleStatus === 'suspended') {
    const { isNew } = await createPlatformAlert(db, {
      tenantId,
      tenantName,
      type: 'UNEXPECTED_SUSPENSION',
      severity: 'CRITICAL',
      source: 'lifecycle',
      title: `Tenant Suspended: ${tenantName}`,
      description: `Tenant ${tenantName} (${tenantId}) is in suspended status. Access blocked.`,
      dedupKey: `${tenantId}_UNEXPECTED_SUSPENSION`,
      metadata: { suspendedReason: data.suspendedReason || 'Administrative suspension' },
    });
    if (isNew) createdCount++;
  }

  // 3. Billing & Subscription checks
  if (subStatus === 'past_due') {
    const { isNew } = await createPlatformAlert(db, {
      tenantId,
      tenantName,
      type: 'PAST_DUE_SUBSCRIPTION',
      severity: 'WARNING',
      source: 'billing',
      title: `Subscription Past Due: ${tenantName}`,
      description: `Tenant ${tenantName} has a past-due subscription (${planId}). Renewal payment failed.`,
      dedupKey: `${tenantId}_PAST_DUE_SUBSCRIPTION`,
      metadata: { planId, interval: subscription.interval },
    });
    if (isNew) createdCount++;
  }

  if (subStatus === 'cancelled' || data.paymentFailure) {
    const { isNew } = await createPlatformAlert(db, {
      tenantId,
      tenantName,
      type: 'PAYMENT_FAILURE',
      severity: 'CRITICAL',
      source: 'billing',
      title: `Subscription / Payment Failure: ${tenantName}`,
      description: `Tenant ${tenantName} experienced a payment failure or cancellation.`,
      dedupKey: `${tenantId}_PAYMENT_FAILURE`,
      metadata: { planId, subStatus },
    });
    if (isNew) createdCount++;
  }

  if (subStatus === 'trialing' && subscription.trialEndsAt) {
    const trialEnd = new Date(subscription.trialEndsAt).getTime();
    const daysRemaining = (trialEnd - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysRemaining <= 3 && daysRemaining >= 0) {
      const { isNew } = await createPlatformAlert(db, {
        tenantId,
        tenantName,
        type: 'TRIAL_EXPIRING_SOON',
        severity: 'WARNING',
        source: 'billing',
        title: `Trial Expiring Soon: ${tenantName}`,
        description: `Trial for ${tenantName} expires in ${Math.max(0, Math.ceil(daysRemaining))} days.`,
        dedupKey: `${tenantId}_TRIAL_EXPIRING_SOON`,
        metadata: { trialEndsAt: subscription.trialEndsAt, daysRemaining: Math.ceil(daysRemaining) },
      });
      if (isNew) createdCount++;
    }
  }

  // 4. Health evaluation
  let ordersMonthlyUsed = 0;
  let planLimit = 2500;
  const currentPeriod = usagePeriod();
  const meterSnap = await db.collection(USAGE_METER_COLLECTION).doc(usageMeterId(tenantId, currentPeriod)).get();
  if (meterSnap.exists) {
    const meterData = meterSnap.data();
    ordersMonthlyUsed = Math.max(0, Math.floor(Number(meterData.ordersMonthly || 0)));
  }

  const matchedPlan = DEFAULT_PLATFORM_PLANS.find(p => p.id === planId) || DEFAULT_PLATFORM_PLANS[0];
  planLimit = matchedPlan.limits.ordersMonthly;

  const usagePercent = calculateUsagePercent(ordersMonthlyUsed, planLimit);

  const health = calculateTenantHealth({
    lifecycleStatus,
    subscriptionStatus: subStatus,
    usagePercent,
    provisioningStatus: data.provisioningStatus,
    hasPaymentFailure: Boolean(data.paymentFailure || subStatus === 'past_due'),
  });

  if (health.status === 'AT_RISK') {
    const { isNew } = await createPlatformAlert(db, {
      tenantId,
      tenantName,
      type: 'HEALTH_AT_RISK',
      severity: 'WARNING',
      source: 'analytics',
      title: `Tenant Health At Risk: ${tenantName}`,
      description: `Health score for ${tenantName} dropped to ${health.healthScore}/100 (${health.reasons.join('; ')}).`,
      dedupKey: `${tenantId}_HEALTH_AT_RISK`,
      metadata: { healthScore: health.healthScore, healthReasons: health.reasons },
    });
    if (isNew) createdCount++;
  }

  // 5. Usage checks
  const overrideActive = Boolean(subscription.overrideMonthlyOrders || data.overrideMonthlyOrders);
  if (!overrideActive) {
    if (usagePercent >= 100) {
      const { isNew } = await createPlatformAlert(db, {
        tenantId,
        tenantName,
        type: 'USAGE_LIMIT_VIOLATION',
        severity: 'CRITICAL',
        source: 'usage',
        title: `Order Limit Exceeded: ${tenantName}`,
        description: `Tenant ${tenantName} reached ${usagePercent}% of monthly order quota (${ordersMonthlyUsed}/${planLimit}).`,
        dedupKey: `${tenantId}_USAGE_LIMIT_VIOLATION_${currentPeriod}`,
        metadata: { ordersMonthlyUsed, planLimit, usagePercent, period: currentPeriod },
      });
      if (isNew) createdCount++;
    } else if (usagePercent >= 80) {
      const { isNew } = await createPlatformAlert(db, {
        tenantId,
        tenantName,
        type: 'USAGE_LIMIT_APPROACHING',
        severity: 'WARNING',
        source: 'usage',
        title: `Approaching Order Limit: ${tenantName}`,
        description: `Tenant ${tenantName} is at ${usagePercent}% of monthly order limit (${ordersMonthlyUsed}/${planLimit}).`,
        dedupKey: `${tenantId}_USAGE_LIMIT_APPROACHING_${currentPeriod}`,
        metadata: { ordersMonthlyUsed, planLimit, usagePercent, period: currentPeriod },
      });
      if (isNew) createdCount++;
    }
  }

  return createdCount;
}

/**
 * Runs evaluation across all platform tenants.
 */
export async function evaluateAllPlatformAlerts(db: any): Promise<number> {
  if (!db) return 0;
  const tenantsSnap = await db.collection('tenants').limit(500).get();
  let totalNew = 0;
  for (const doc of tenantsSnap.docs) {
    const created = await evaluateTenantAlerts(db, doc);
    totalNew += created;
  }
  return totalNew;
}

export interface GetAlertsParams {
  status?: string;
  severity?: string;
  tenantId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Fetches platform alerts with bounded pagination and filtering.
 */
export async function getPlatformAlerts(db: any, query: GetAlertsParams) {
  if (!db) throw new Error('Database connection unavailable.');
  // Run auto evaluator
  await evaluateAllPlatformAlerts(db);

  const page = Math.max(1, Math.floor(Number(query.page || 1)));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(query.limit || 20))));
  const statusFilter = query.status ? String(query.status).trim() : '';
  const severityFilter = query.severity ? String(query.severity).trim().toUpperCase() : '';
  const tenantIdFilter = query.tenantId ? String(query.tenantId).trim() : '';
  const search = query.search ? String(query.search).trim().toLowerCase() : '';

  const snap = await db.collection('platform_alerts').orderBy('createdAt', 'desc').limit(500).get();
  let alerts: PlatformAlert[] = snap.docs.map((doc: any) => ({
    alertId: doc.id,
    ...(doc.data() as PlatformAlert),
  }));

  if (statusFilter && statusFilter.toLowerCase() !== 'all') {
    alerts = alerts.filter(a => a.status.toLowerCase() === statusFilter.toLowerCase());
  }
  if (severityFilter && severityFilter !== 'ALL') {
    alerts = alerts.filter(a => a.severity === severityFilter);
  }
  if (tenantIdFilter) {
    alerts = alerts.filter(a => a.tenantId === tenantIdFilter);
  }
  if (search) {
    alerts = alerts.filter(a =>
      a.title.toLowerCase().includes(search) ||
      a.description.toLowerCase().includes(search) ||
      a.tenantId.toLowerCase().includes(search) ||
      (a.tenantName && a.tenantName.toLowerCase().includes(search)) ||
      a.type.toLowerCase().includes(search)
    );
  }

  const total = alerts.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageAlerts = alerts.slice((page - 1) * limit, page * limit);

  return {
    success: true,
    page,
    pageSize: limit,
    total,
    totalPages,
    alerts: pageAlerts,
  };
}

/**
 * Computes platform alert KPIs and summary metrics.
 */
export async function getPlatformAlertSummary(db: any): Promise<PlatformAlertSummary> {
  if (!db) throw new Error('Database connection unavailable.');
  await evaluateAllPlatformAlerts(db);

  const snap = await db.collection('platform_alerts').limit(1000).get();
  const alerts: PlatformAlert[] = snap.docs.map((doc: any) => doc.data() as PlatformAlert);

  const todayStr = new Date().toISOString().slice(0, 10);

  let criticalCount = 0;
  let warningCount = 0;
  let infoCount = 0;
  let openCount = 0;
  let acknowledgedCount = 0;
  let resolvedCount = 0;
  let resolvedTodayCount = 0;
  let dismissedCount = 0;

  for (const alert of alerts) {
    if (alert.severity === 'CRITICAL' && alert.status !== 'RESOLVED' && alert.status !== 'DISMISSED') {
      criticalCount++;
    }
    if (alert.severity === 'WARNING' && alert.status !== 'RESOLVED' && alert.status !== 'DISMISSED') {
      warningCount++;
    }
    if (alert.severity === 'INFO') {
      infoCount++;
    }

    if (alert.status === 'OPEN') openCount++;
    else if (alert.status === 'ACKNOWLEDGED') acknowledgedCount++;
    else if (alert.status === 'RESOLVED') {
      resolvedCount++;
      if (alert.resolvedAt && alert.resolvedAt.slice(0, 10) === todayStr) {
        resolvedTodayCount++;
      }
    } else if (alert.status === 'DISMISSED') dismissedCount++;
  }

  return {
    criticalCount,
    warningCount,
    infoCount,
    openCount,
    acknowledgedCount,
    resolvedCount,
    resolvedTodayCount,
    dismissedCount,
    totalCount: alerts.length,
  };
}

/**
 * Gets detailed context bundle for a single alert.
 */
export async function getPlatformAlertDetail(db: any, alertId: string) {
  if (!db) throw new Error('Database connection unavailable.');
  if (!alertId) throw new Error('alertId is required.');

  const docRef = db.collection('platform_alerts').doc(alertId);
  const snap = await docRef.get();
  if (!snap.exists) {
    const err: any = new Error(`Alert '${alertId}' not found.`);
    err.statusCode = 404;
    throw err;
  }

  const alert = { alertId: snap.id, ...(snap.data() as PlatformAlert) };

  // Fetch tenant details
  let tenant: any = null;
  const tenantSnap = await db.collection('tenants').doc(alert.tenantId).get();
  if (tenantSnap.exists) {
    const tData = tenantSnap.data();
    tenant = {
      id: tenantSnap.id,
      name: String(tData.name || tData.businessName || tenantSnap.id),
      status: String(tData.status || 'active'),
      lifecycleStatus: String(tData.lifecycleStatus || tData.status || 'active'),
      ownerUid: tData.ownerUid ? String(tData.ownerUid) : undefined,
      ownerEmail: tData.ownerEmail ? String(tData.ownerEmail) : undefined,
      createdAt: tData.createdAt,
      updatedAt: tData.updatedAt,
      subscription: tData.subscription || {},
    };
  }

  // Fetch usage metrics
  const period = usagePeriod();
  const meterSnap = await db.collection(USAGE_METER_COLLECTION).doc(usageMeterId(alert.tenantId, period)).get();
  const meterData = meterSnap.exists ? meterSnap.data() : {};
  const ordersUsed = Math.max(0, Math.floor(Number(meterData.ordersMonthly || 0)));
  const planId = tenant?.subscription?.planId || 'starter';
  const matchedPlan = DEFAULT_PLATFORM_PLANS.find(p => p.id === planId) || DEFAULT_PLATFORM_PLANS[0];
  const planLimit = matchedPlan.limits.ordersMonthly;
  const usagePercent = calculateUsagePercent(ordersUsed, planLimit);

  // Fetch recent audit events for this tenant
  const auditSnap = await db.collection('audit_logs')
    .where('tenantId', '==', alert.tenantId)
    .orderBy('timestamp', 'desc')
    .limit(10)
    .get();

  const recentAuditEvents = auditSnap.docs.map((d: any) => {
    const data = d.data();
    return {
      id: d.id,
      action: String(data.action || ''),
      module: String(data.module || ''),
      details: String(data.details || ''),
      severity: String(data.severity || 'info'),
      result: String(data.result || 'success'),
      timestamp: String(data.timestamp || ''),
      actorEmail: data.actorEmail || data.actorUid || 'system',
    };
  });

  return {
    alert,
    tenant,
    subscription: tenant?.subscription || null,
    usageMetrics: {
      period,
      ordersUsed,
      planLimit,
      usagePercent,
      limitState: usageLimitState(ordersUsed, planLimit),
    },
    recentAuditEvents,
    resolutionHistory: alert.resolutionHistory || [],
  };
}

/**
 * Validates administrative justification reason.
 */
function validateReason(reason?: string): string {
  const sanitized = String(reason || '').trim();
  if (!sanitized) {
    const err: any = new Error('Mandatory administrative reason is required.');
    err.statusCode = 400;
    throw err;
  }
  return sanitized;
}

export interface AdminActor {
  uid: string;
  email?: string | null;
  role?: string;
}

/**
 * Acknowledges an alert with mandatory justification and atomic audit trail.
 */
export async function acknowledgePlatformAlert(
  db: any,
  alertId: string,
  actor: AdminActor,
  reasonInput: string
): Promise<PlatformAlert> {
  const reason = validateReason(reasonInput);
  const docRef = db.collection('platform_alerts').doc(alertId);
  const snap = await docRef.get();
  if (!snap.exists) {
    const err: any = new Error(`Alert '${alertId}' not found.`);
    err.statusCode = 404;
    throw err;
  }

  const existingAlert = snap.data() as PlatformAlert;
  const now = new Date().toISOString();
  const actorEmail = actor.email || actor.uid;
  const actorRole = actor.role || 'Super Admin';

  const historyEntry: AlertResolutionHistoryEntry = {
    status: 'ACKNOWLEDGED',
    timestamp: now,
    actorUid: actor.uid,
    actorEmail,
    actorRole,
    reason,
  };

  const updatedAlert: PlatformAlert = {
    ...existingAlert,
    status: 'ACKNOWLEDGED',
    acknowledgedAt: now,
    acknowledgedBy: actorEmail,
    updatedAt: now,
    resolutionHistory: [...(existingAlert.resolutionHistory || []), historyEntry],
  };

  const auditRecord: AuditLog = createAuthoritativeAuditRecord({
    tenantId: existingAlert.tenantId,
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole,
    action: 'ALERT_ACKNOWLEDGED',
    module: 'platform_alerts',
    targetType: 'alert',
    targetId: alertId,
    targetName: existingAlert.title,
    reason,
    result: 'success',
    severity: 'info',
    details: `Super Admin ${actorEmail} acknowledged alert '${existingAlert.title}'. Reason: ${reason}`,
    previousState: { status: existingAlert.status },
    newState: { status: 'ACKNOWLEDGED', acknowledgedAt: now, acknowledgedBy: actorEmail },
  });

  const batch = db.batch();
  batch.set(docRef, updatedAlert, { merge: true });
  batch.set(db.collection('audit_logs').doc(auditRecord.id), auditRecord);
  await batch.commit();

  return updatedAlert;
}

/**
 * Resolves an alert with mandatory justification and atomic audit trail.
 */
export async function resolvePlatformAlert(
  db: any,
  alertId: string,
  actor: AdminActor,
  reasonInput: string
): Promise<PlatformAlert> {
  const reason = validateReason(reasonInput);
  const docRef = db.collection('platform_alerts').doc(alertId);
  const snap = await docRef.get();
  if (!snap.exists) {
    const err: any = new Error(`Alert '${alertId}' not found.`);
    err.statusCode = 404;
    throw err;
  }

  const existingAlert = snap.data() as PlatformAlert;
  const now = new Date().toISOString();
  const actorEmail = actor.email || actor.uid;
  const actorRole = actor.role || 'Super Admin';

  const historyEntry: AlertResolutionHistoryEntry = {
    status: 'RESOLVED',
    timestamp: now,
    actorUid: actor.uid,
    actorEmail,
    actorRole,
    reason,
  };

  const updatedAlert: PlatformAlert = {
    ...existingAlert,
    status: 'RESOLVED',
    resolvedAt: now,
    resolvedBy: actorEmail,
    resolutionReason: reason,
    updatedAt: now,
    resolutionHistory: [...(existingAlert.resolutionHistory || []), historyEntry],
  };

  const auditRecord: AuditLog = createAuthoritativeAuditRecord({
    tenantId: existingAlert.tenantId,
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole,
    action: 'ALERT_RESOLVED',
    module: 'platform_alerts',
    targetType: 'alert',
    targetId: alertId,
    targetName: existingAlert.title,
    reason,
    result: 'success',
    severity: 'info',
    details: `Super Admin ${actorEmail} resolved alert '${existingAlert.title}'. Reason: ${reason}`,
    previousState: { status: existingAlert.status },
    newState: { status: 'RESOLVED', resolvedAt: now, resolvedBy: actorEmail, resolutionReason: reason },
  });

  const batch = db.batch();
  batch.set(docRef, updatedAlert, { merge: true });
  batch.set(db.collection('audit_logs').doc(auditRecord.id), auditRecord);
  await batch.commit();

  return updatedAlert;
}

/**
 * Dismisses an alert with mandatory justification and atomic audit trail.
 */
export async function dismissPlatformAlert(
  db: any,
  alertId: string,
  actor: AdminActor,
  reasonInput: string
): Promise<PlatformAlert> {
  const reason = validateReason(reasonInput);
  const docRef = db.collection('platform_alerts').doc(alertId);
  const snap = await docRef.get();
  if (!snap.exists) {
    const err: any = new Error(`Alert '${alertId}' not found.`);
    err.statusCode = 404;
    throw err;
  }

  const existingAlert = snap.data() as PlatformAlert;
  const now = new Date().toISOString();
  const actorEmail = actor.email || actor.uid;
  const actorRole = actor.role || 'Super Admin';

  const historyEntry: AlertResolutionHistoryEntry = {
    status: 'DISMISSED',
    timestamp: now,
    actorUid: actor.uid,
    actorEmail,
    actorRole,
    reason,
  };

  const updatedAlert: PlatformAlert = {
    ...existingAlert,
    status: 'DISMISSED',
    dismissedAt: now,
    dismissedBy: actorEmail,
    resolutionReason: reason,
    updatedAt: now,
    resolutionHistory: [...(existingAlert.resolutionHistory || []), historyEntry],
  };

  const auditRecord: AuditLog = createAuthoritativeAuditRecord({
    tenantId: existingAlert.tenantId,
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole,
    action: 'ALERT_DISMISSED',
    module: 'platform_alerts',
    targetType: 'alert',
    targetId: alertId,
    targetName: existingAlert.title,
    reason,
    result: 'success',
    severity: 'info',
    details: `Super Admin ${actorEmail} dismissed alert '${existingAlert.title}'. Reason: ${reason}`,
    previousState: { status: existingAlert.status },
    newState: { status: 'DISMISSED', dismissedAt: now, dismissedBy: actorEmail, resolutionReason: reason },
  });

  const batch = db.batch();
  batch.set(docRef, updatedAlert, { merge: true });
  batch.set(db.collection('audit_logs').doc(auditRecord.id), auditRecord);
  await batch.commit();

  return updatedAlert;
}
