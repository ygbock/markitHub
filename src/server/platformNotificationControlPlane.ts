import crypto from 'node:crypto';
import type { PlatformAlert, PlatformAlertSeverity, PlatformAlertType } from './platformAlertControlPlane';
import { createAuthoritativeAuditRecord, recordAuditEvent } from './auditService';

export type NotificationDeliveryStatus = 'PENDING' | 'DELIVERED' | 'FAILED' | 'RETRIED';
export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'WEBHOOK';
export type EscalationState = 'NONE' | 'ESCALATED' | 'RESOLVED' | 'EXPIRED';

export interface PlatformNotification {
  notificationId: string;
  alertId: string;
  tenantId: string;
  tenantName?: string;
  type: PlatformAlertType;
  severity: PlatformAlertSeverity;
  title: string;
  message: string;
  recipientUid: string;
  recipientEmail?: string;
  recipientRole?: string;
  deliveryStatus: NotificationDeliveryStatus;
  channel: NotificationChannel;
  read: boolean;
  readAt?: string | null;
  escalationState: EscalationState;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  sentAt?: string | null;
  failedAt?: string | null;
  failureReason?: string | null;
  dedupKey?: string;
}

export interface PlatformNotificationPreferences {
  adminId: string;
  enabledChannels: {
    inApp: boolean;
    email: boolean;
    webhook: boolean;
  };
  severityPreferences: {
    CRITICAL: boolean;
    WARNING: boolean;
    INFO: boolean;
  };
  typePreferences: Record<string, boolean>;
  updatedAt: string;
  updatedBy?: string;
  updateReason?: string;
}

export interface EscalationPolicy {
  policyId: string;
  name: string;
  severity: PlatformAlertSeverity;
  thresholdMinutes: number;
  enabled: boolean;
  targetRole: string;
  action: 'ESCALATE_ALERT_NOTIFICATION' | 'NOTIFY_ON_CALL';
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  updateReason?: string;
}

export const DEFAULT_ALL_ALERT_TYPES: PlatformAlertType[] = [
  'PROVISIONING_FAILURE',
  'PAYMENT_FAILURE',
  'SECURITY_ANOMALY',
  'UNEXPECTED_SUSPENSION',
  'USAGE_LIMIT_VIOLATION',
  'USAGE_LIMIT_APPROACHING',
  'TRIAL_EXPIRING_SOON',
  'PAST_DUE_SUBSCRIPTION',
  'HEALTH_AT_RISK',
  'PROVISIONING_DELAYED',
  'TENANT_PROVISIONED',
  'TENANT_ACTIVATED',
  'PLAN_CHANGED',
  'SUBSCRIPTION_RENEWED',
  'USAGE_OVERRIDE_CHANGED',
];

export const DEFAULT_ESCALATION_POLICIES: EscalationPolicy[] = [
  {
    policyId: 'policy_critical_default',
    name: 'Critical Incident SLA Escalation Policy',
    severity: 'CRITICAL',
    thresholdMinutes: 15,
    enabled: true,
    targetRole: 'Super Admin',
    action: 'ESCALATE_ALERT_NOTIFICATION',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    policyId: 'policy_warning_default',
    name: 'Warning SLA Escalation Policy',
    severity: 'WARNING',
    thresholdMinutes: 60,
    enabled: true,
    targetRole: 'Super Admin',
    action: 'ESCALATE_ALERT_NOTIFICATION',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

export function getDefaultNotificationPreferences(adminId: string): PlatformNotificationPreferences {
  const typePreferences: Record<string, boolean> = {};
  for (const t of DEFAULT_ALL_ALERT_TYPES) {
    typePreferences[t] = true;
  }
  return {
    adminId,
    enabledChannels: {
      inApp: true,
      email: true,
      webhook: false,
    },
    severityPreferences: {
      CRITICAL: true,
      WARNING: true,
      INFO: true,
    },
    typePreferences,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Validates mandatory administrative justification reason.
 */
export function sanitizeNotificationReason(reason: unknown): string {
  const clean = String(reason || '').trim();
  if (!clean || clean.length < 3) {
    throw Object.assign(new Error('Mandatory administrative reason is required (minimum 3 characters).'), {
      statusCode: 400,
      code: 'MISSING_ADMIN_REASON',
    });
  }
  return clean.slice(0, 500);
}

/**
 * Retrieves Super Admin notification preferences.
 */
export async function getNotificationPreferences(
  db: any,
  adminId: string
): Promise<PlatformNotificationPreferences> {
  if (!adminId) return getDefaultNotificationPreferences('default');
  const snap = await db.collection('platform_notification_preferences').doc(adminId).get();
  if (!snap.exists) {
    return getDefaultNotificationPreferences(adminId);
  }
  const data = snap.data();
  const defaults = getDefaultNotificationPreferences(adminId);
  return {
    adminId,
    enabledChannels: {
      inApp: Boolean(data?.enabledChannels?.inApp ?? defaults.enabledChannels.inApp),
      email: Boolean(data?.enabledChannels?.email ?? defaults.enabledChannels.email),
      webhook: Boolean(data?.enabledChannels?.webhook ?? defaults.enabledChannels.webhook),
    },
    severityPreferences: {
      CRITICAL: Boolean(data?.severityPreferences?.CRITICAL ?? defaults.severityPreferences.CRITICAL),
      WARNING: Boolean(data?.severityPreferences?.WARNING ?? defaults.severityPreferences.WARNING),
      INFO: Boolean(data?.severityPreferences?.INFO ?? defaults.severityPreferences.INFO),
    },
    typePreferences: {
      ...defaults.typePreferences,
      ...(data?.typePreferences || {}),
    },
    updatedAt: data?.updatedAt || defaults.updatedAt,
    updatedBy: data?.updatedBy,
    updateReason: data?.updateReason,
  };
}

/**
 * Updates Super Admin notification preferences with mandatory justification and audit trail.
 */
export async function updateNotificationPreferences(
  db: any,
  adminId: string,
  patch: Partial<PlatformNotificationPreferences>,
  actor: { uid: string; email?: string; role?: string },
  reason: string
): Promise<PlatformNotificationPreferences> {
  const sanitizedReason = sanitizeNotificationReason(reason);
  const current = await getNotificationPreferences(db, adminId);
  const now = new Date().toISOString();

  const updated: PlatformNotificationPreferences = {
    adminId,
    enabledChannels: {
      inApp: patch.enabledChannels?.inApp ?? current.enabledChannels.inApp,
      email: patch.enabledChannels?.email ?? current.enabledChannels.email,
      webhook: patch.enabledChannels?.webhook ?? current.enabledChannels.webhook,
    },
    severityPreferences: {
      CRITICAL: patch.severityPreferences?.CRITICAL ?? current.severityPreferences.CRITICAL,
      WARNING: patch.severityPreferences?.WARNING ?? current.severityPreferences.WARNING,
      INFO: patch.severityPreferences?.INFO ?? current.severityPreferences.INFO,
    },
    typePreferences: {
      ...current.typePreferences,
      ...(patch.typePreferences || {}),
    },
    updatedAt: now,
    updatedBy: actor.email || actor.uid,
    updateReason: sanitizedReason,
  };

  await db.collection('platform_notification_preferences').doc(adminId).set(updated);

  // Write immutable audit log
  const auditRec = createAuthoritativeAuditRecord({
    tenantId: 'PLATFORM_CONTROL_PLANE',
    module: 'NOTIFICATIONS',
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role || 'Super Admin',
    action: 'NOTIFICATION_PREFERENCES_UPDATED',
    targetType: 'system_settings',
    targetId: adminId,
    reason: sanitizedReason,
    severity: 'warning',
    result: 'success',
    metadata: {
      enabledChannels: updated.enabledChannels,
      severityPreferences: updated.severityPreferences,
    },
  });
  await recordAuditEvent(db, auditRec);

  return updated;
}

/**
 * Retrieves platform escalation policies or seeds defaults if none exist.
 */
export async function getEscalationPolicies(db: any): Promise<EscalationPolicy[]> {
  const snap = await db.collection('platform_escalation_policies').get();
  if (snap.empty) {
    // Seed default policies
    const batch = db.batch();
    for (const pol of DEFAULT_ESCALATION_POLICIES) {
      const ref = db.collection('platform_escalation_policies').doc(pol.policyId);
      batch.set(ref, pol);
    }
    await batch.commit();
    return DEFAULT_ESCALATION_POLICIES;
  }
  return snap.docs.map((doc: any) => ({
    policyId: doc.id,
    ...doc.data(),
  }));
}

/**
 * Updates an escalation policy with mandatory justification and audit logging.
 */
export async function updateEscalationPolicy(
  db: any,
  policyId: string,
  patch: Partial<EscalationPolicy>,
  actor: { uid: string; email?: string; role?: string },
  reason: string
): Promise<EscalationPolicy> {
  const sanitizedReason = sanitizeNotificationReason(reason);
  const docRef = db.collection('platform_escalation_policies').doc(policyId);
  const snap = await docRef.get();

  let existing: EscalationPolicy;
  if (!snap.exists) {
    const defaultMatch = DEFAULT_ESCALATION_POLICIES.find(p => p.policyId === policyId);
    if (!defaultMatch) {
      throw Object.assign(new Error(`Escalation policy '${policyId}' not found.`), {
        statusCode: 404,
        code: 'ESCALATION_POLICY_NOT_FOUND',
      });
    }
    existing = defaultMatch;
  } else {
    existing = snap.data() as EscalationPolicy;
  }

  const now = new Date().toISOString();
  const updated: EscalationPolicy = {
    ...existing,
    policyId,
    name: patch.name ? String(patch.name).trim() : existing.name,
    thresholdMinutes: typeof patch.thresholdMinutes === 'number' && patch.thresholdMinutes > 0
      ? Math.floor(patch.thresholdMinutes)
      : existing.thresholdMinutes,
    enabled: typeof patch.enabled === 'boolean' ? patch.enabled : existing.enabled,
    action: patch.action || existing.action,
    updatedAt: now,
    updatedBy: actor.email || actor.uid,
    updateReason: sanitizedReason,
  };

  await docRef.set(updated);

  // Write immutable audit record
  const policyAudit = createAuthoritativeAuditRecord({
    tenantId: 'PLATFORM_CONTROL_PLANE',
    module: 'NOTIFICATIONS',
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role || 'Super Admin',
    action: 'ESCALATION_POLICY_UPDATED',
    targetType: 'system_settings',
    targetId: policyId,
    reason: sanitizedReason,
    severity: 'warning',
    result: 'success',
    metadata: {
      thresholdMinutes: updated.thresholdMinutes,
      enabled: updated.enabled,
      severity: updated.severity,
    },
  });
  await recordAuditEvent(db, policyAudit);

  return updated;
}

/**
 * Authoritatively generates notification records from a platform_alert event.
 * Enforces recipient preferences, channel toggles, and deduplication.
 */
export async function createNotificationsFromAlert(
  db: any,
  alert: PlatformAlert,
  recipientUids: string[] = ['admin_1', 'system_superadmin']
): Promise<PlatformNotification[]> {
  if (!alert || !alert.alertId) return [];

  const createdNotifications: PlatformNotification[] = [];
  const now = new Date().toISOString();

  for (const recipientUid of recipientUids) {
    const prefs = await getNotificationPreferences(db, recipientUid);

    // 1. Check inApp channel toggle
    if (!prefs.enabledChannels.inApp) continue;

    // 2. Check severity preference
    if (prefs.severityPreferences[alert.severity] === false) continue;

    // 3. Check alert type preference
    if (prefs.typePreferences[alert.type] === false) continue;

    const dedupKey = `${alert.alertId}_${recipientUid}_${alert.type}`;

    // Deduplication check
    const existingSnap = await db
      .collection('platform_notifications')
      .where('dedupKey', '==', dedupKey)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      continue;
    }

    const notificationId = `ntf_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const notification: PlatformNotification = {
      notificationId,
      alertId: alert.alertId,
      tenantId: alert.tenantId,
      tenantName: alert.tenantName,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.description,
      recipientUid,
      recipientEmail: recipientUid.includes('@') ? recipientUid : `${recipientUid}@markithub.internal`,
      recipientRole: 'Super Admin',
      deliveryStatus: 'PENDING',
      channel: 'IN_APP',
      read: false,
      readAt: null,
      escalationState: alert.metadata?.escalated ? 'ESCALATED' : 'NONE',
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
      dedupKey,
    };

    await db.collection('platform_notifications').doc(notificationId).set(notification);

    // Immediately dispatch delivery simulation
    const dispatched = await dispatchNotificationDelivery(db, notificationId);
    createdNotifications.push(dispatched);
  }

  return createdNotifications;
}

/**
 * Dispatches notification delivery, updates delivery status, sentAt / failedAt, and retry count.
 */
export async function dispatchNotificationDelivery(
  db: any,
  notificationId: string
): Promise<PlatformNotification> {
  const docRef = db.collection('platform_notifications').doc(notificationId);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw Object.assign(new Error(`Notification '${notificationId}' not found.`), {
      statusCode: 404,
      code: 'NOTIFICATION_NOT_FOUND',
    });
  }

  const notification = snap.data() as PlatformNotification;
  const now = new Date().toISOString();

  // Simulate in-app delivery pipeline execution
  const isSuccess = true;

  if (isSuccess) {
    const updated: PlatformNotification = {
      ...notification,
      deliveryStatus: 'DELIVERED',
      sentAt: now,
      updatedAt: now,
    };
    await docRef.set(updated, { merge: true });
    return updated;
  } else {
    const updated: PlatformNotification = {
      ...notification,
      deliveryStatus: 'FAILED',
      failedAt: now,
      failureReason: 'Delivery channel unavailable',
      retryCount: notification.retryCount + 1,
      updatedAt: now,
    };
    await docRef.set(updated, { merge: true });
    return updated;
  }
}

/**
 * Evaluates open platform alerts against escalation policies.
 * Idempotently escalates alerts exceeding SLA thresholds and creates audit events.
 */
export async function processAlertEscalations(db: any): Promise<{
  processedCount: number;
  escalatedCount: number;
  escalatedAlertIds: string[];
}> {
  const policies = await getEscalationPolicies(db);
  const activePolicies = policies.filter(p => p.enabled);
  if (activePolicies.length === 0) {
    return { processedCount: 0, escalatedCount: 0, escalatedAlertIds: [] };
  }

  // Fetch OPEN or ACKNOWLEDGED alerts
  const alertsSnap = await db
    .collection('platform_alerts')
    .where('status', 'in', ['OPEN', 'ACKNOWLEDGED'])
    .limit(100)
    .get();

  if (alertsSnap.empty) {
    return { processedCount: 0, escalatedCount: 0, escalatedAlertIds: [] };
  }

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  let processedCount = 0;
  let escalatedCount = 0;
  const escalatedAlertIds: string[] = [];

  for (const doc of alertsSnap.docs) {
    processedCount++;
    const alert = doc.data() as PlatformAlert;
    if (!alert || alert.metadata?.escalated) continue;

    const matchingPolicy = activePolicies.find(p => p.severity === alert.severity);
    if (!matchingPolicy) continue;

    const createdAtMs = new Date(alert.createdAt).getTime();
    const ageMinutes = (nowMs - createdAtMs) / (1000 * 60);

    if (ageMinutes >= matchingPolicy.thresholdMinutes) {
      // Escalation threshold breached!
      const updatedMetadata = {
        ...(alert.metadata || {}),
        escalated: true,
        escalatedAt: nowIso,
        escalationPolicyId: matchingPolicy.policyId,
        thresholdMinutes: matchingPolicy.thresholdMinutes,
      };

      await db.collection('platform_alerts').doc(alert.alertId).set(
        {
          metadata: updatedMetadata,
          updatedAt: nowIso,
        },
        { merge: true }
      );

      // Generate Escalation Notification
      const escalatedAlert: PlatformAlert = {
        ...alert,
        title: `[ESCALATED] ${alert.title}`,
        description: `CRITICAL SLA EXCEEDED (${matchingPolicy.thresholdMinutes}m threshold): ${alert.description}`,
        metadata: updatedMetadata,
      };

      await createNotificationsFromAlert(db, escalatedAlert);

      // Write immutable audit log for escalation
      const escAudit = createAuthoritativeAuditRecord({
        tenantId: alert.tenantId || 'PLATFORM_CONTROL_PLANE',
        module: 'NOTIFICATIONS',
        actorUid: 'system_escalation_engine',
        actorEmail: 'system.escalation@markithub.internal',
        actorRole: 'System Engine',
        action: 'ALERT_ESCALATED',
        targetType: 'alert',
        targetId: alert.alertId,
        reason: `Alert unresolved for ${Math.floor(ageMinutes)}m, exceeding ${matchingPolicy.severity} threshold of ${matchingPolicy.thresholdMinutes}m.`,
        severity: 'critical',
        result: 'success',
        metadata: {
          alertId: alert.alertId,
          tenantId: alert.tenantId,
          policyId: matchingPolicy.policyId,
          thresholdMinutes: matchingPolicy.thresholdMinutes,
          ageMinutes: Math.floor(ageMinutes),
        },
      });
      await recordAuditEvent(db, escAudit);

      escalatedCount++;
      escalatedAlertIds.push(alert.alertId);
    }
  }

  return { processedCount, escalatedCount, escalatedAlertIds };
}

/**
 * Queries platform_notifications with filters, bounded pagination, and search.
 */
export async function getPlatformNotifications(
  db: any,
  options: {
    recipientUid?: string;
    unreadOnly?: boolean;
    severity?: string;
    type?: string;
    status?: string;
    escalationState?: string;
    tenantId?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<{
  notifications: PlatformNotification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  unreadCount: number;
}> {
  const page = Math.max(1, Math.floor(options.page || 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(options.limit || 50)));

  let query = db.collection('platform_notifications');

  if (options.recipientUid) {
    query = query.where('recipientUid', '==', options.recipientUid);
  }
  if (options.unreadOnly) {
    query = query.where('read', '==', false);
  }
  if (options.severity && options.severity !== 'ALL') {
    query = query.where('severity', '==', options.severity);
  }
  if (options.type) {
    query = query.where('type', '==', options.type);
  }
  if (options.tenantId) {
    query = query.where('tenantId', '==', options.tenantId);
  }

  const snap = await query.get();
  let allDocs: PlatformNotification[] = snap.docs.map((doc: any) => ({
    notificationId: doc.id,
    ...doc.data(),
  }));

  // Memory filtering for search & additional status/escalation filters
  if (options.escalationState && options.escalationState !== 'ALL') {
    allDocs = allDocs.filter(n => n.escalationState === options.escalationState);
  }
  if (options.status && options.status !== 'ALL') {
    allDocs = allDocs.filter(n => n.deliveryStatus === options.status);
  }
  if (options.search) {
    const q = options.search.toLowerCase();
    allDocs = allDocs.filter(
      n =>
        n.title?.toLowerCase().includes(q) ||
        n.message?.toLowerCase().includes(q) ||
        n.tenantName?.toLowerCase().includes(q) ||
        n.tenantId?.toLowerCase().includes(q) ||
        n.type?.toLowerCase().includes(q)
    );
  }

  // Sort newest first
  allDocs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = allDocs.filter(n => !n.read).length;
  const total = allDocs.length;
  const totalPages = Math.ceil(total / pageSize) || 1;

  const startIndex = (page - 1) * pageSize;
  const paginated = allDocs.slice(startIndex, startIndex + pageSize);

  return {
    notifications: paginated,
    total,
    page,
    pageSize,
    totalPages,
    unreadCount,
  };
}

/**
 * Computes notification summary KPIs for Super Admin.
 */
export async function getNotificationSummary(
  db: any,
  recipientUid?: string
): Promise<{
  unreadCount: number;
  criticalUnreadCount: number;
  warningUnreadCount: number;
  escalatedCount: number;
  totalCount: number;
}> {
  let query = db.collection('platform_notifications');
  if (recipientUid) {
    query = query.where('recipientUid', '==', recipientUid);
  }

  const snap = await query.get();
  const all: PlatformNotification[] = snap.docs.map((doc: any) => doc.data());

  const unreadCount = all.filter(n => !n.read).length;
  const criticalUnreadCount = all.filter(n => !n.read && n.severity === 'CRITICAL').length;
  const warningUnreadCount = all.filter(n => !n.read && n.severity === 'WARNING').length;
  const escalatedCount = all.filter(n => n.escalationState === 'ESCALATED').length;

  return {
    unreadCount,
    criticalUnreadCount,
    warningUnreadCount,
    escalatedCount,
    totalCount: all.length,
  };
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationAsRead(
  db: any,
  notificationId: string,
  recipientUid?: string
): Promise<PlatformNotification> {
  const docRef = db.collection('platform_notifications').doc(notificationId);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw Object.assign(new Error(`Notification '${notificationId}' not found.`), {
      statusCode: 404,
      code: 'NOTIFICATION_NOT_FOUND',
    });
  }

  const notification = snap.data() as PlatformNotification;
  if (recipientUid && notification.recipientUid !== recipientUid && recipientUid !== 'admin_1') {
    throw Object.assign(new Error('Unauthorized recipient access.'), {
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  }

  const now = new Date().toISOString();
  const updated: PlatformNotification = {
    ...notification,
    read: true,
    readAt: now,
    updatedAt: now,
  };

  await docRef.set(updated, { merge: true });
  return updated;
}

/**
 * Marks all notifications for a recipient as read.
 */
export async function markAllNotificationsAsRead(
  db: any,
  recipientUid: string
): Promise<{ count: number }> {
  let query = db.collection('platform_notifications').where('read', '==', false);
  if (recipientUid) {
    query = query.where('recipientUid', '==', recipientUid);
  }

  const snap = await query.get();
  if (snap.empty) return { count: 0 };

  const now = new Date().toISOString();
  const batch = db.batch();

  for (const doc of snap.docs) {
    batch.update(doc.ref, {
      read: true,
      readAt: now,
      updatedAt: now,
    });
  }

  await batch.commit();
  return { count: snap.size };
}

/**
 * Scans for pending or failed notifications with remaining retries and dispatches them.
 */
export async function processPendingNotifications(
  db: any,
  options?: { batchLimit?: number }
): Promise<{
  processedCount: number;
  deliveredCount: number;
  failedCount: number;
}> {
  const limit = options?.batchLimit || 50;
  const snap = await db
    .collection('platform_notifications')
    .where('deliveryStatus', 'in', ['PENDING', 'FAILED'])
    .limit(limit)
    .get();

  if (snap.empty) {
    return { processedCount: 0, deliveredCount: 0, failedCount: 0 };
  }

  let processedCount = 0;
  let deliveredCount = 0;
  let failedCount = 0;

  for (const doc of snap.docs) {
    const data = doc.data() as PlatformNotification;
    processedCount++;

    if (data.retryCount >= 3) {
      failedCount++;
      continue;
    }

    try {
      const dispatched = await dispatchNotificationDelivery(db, doc.id);
      if (dispatched.deliveryStatus === 'DELIVERED') {
        deliveredCount++;
      } else {
        failedCount++;
      }
    } catch {
      failedCount++;
    }
  }

  return { processedCount, deliveredCount, failedCount };
}
