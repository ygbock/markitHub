import crypto from 'node:crypto';
import type { AuditLog, AuditApiResponse, AuditFilterParams, AuditResult, AuditSeverity, AuditSecurityMetrics } from '../types';

/**
 * Maximum number of audit log documents to fetch in a single query scan.
 * Prevents memory exhaustion and unbounded Firestore collection reads.
 */
export const MAX_AUDIT_LOG_FETCH = 500;

/**
 * Sensitive field keys that must NEVER appear in audit records, metadata, or logs.
 */
const SENSITIVE_KEY_PATTERNS = [
  'pin',
  'password',
  'secret',
  'token',
  'key',
  'credential',
  'auth',
  'access_token',
  'accesstoken',
  'webhooksecret',
  'webhook_secret',
  'privatekey',
  'private_key',
  'refreshtoken',
  'refresh_token',
  'signature',
  'cvv',
  'cvc',
  'cardnumber',
  'card_number',
];

/**
 * Recursively sanitizes any metadata object or state dictionary to ensure
 * no sensitive operational credentials or private tokens are leaked into audit records.
 */
export function sanitizeAuditMetadata(data: unknown, depth = 0): unknown {
  if (depth > 6 || data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAuditMetadata(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => lowerKey.includes(pattern));

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeAuditMetadata(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export interface AuthoritativeAuditParams {
  tenantId: string;
  actorUid: string;
  actorName?: string;
  actorEmail?: string | null;
  actorRole?: string;
  action: string;
  module: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  previousState?: Record<string, unknown> | string | null;
  newState?: Record<string, unknown> | string | null;
  reason?: string;
  result?: AuditResult;
  severity?: AuditSeverity;
  details?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

/**
 * Automatically infers an event severity rating if not explicitly specified.
 */
export function inferAuditSeverity(action: string, result?: AuditResult): AuditSeverity {
  if (result === 'denied' || result === 'failed') {
    return 'critical';
  }

  const upper = action.toUpperCase();
  if (
    upper.includes('SUSPEND') ||
    upper.includes('DELETE') ||
    upper.includes('TRANSFER') ||
    upper.includes('ROTAT') ||
    upper.includes('OWNER') ||
    upper.includes('SECURITY') ||
    upper.includes('SECRET') ||
    upper.includes('CREDENTIAL') ||
    upper.includes('LOCK') ||
    upper.includes('2FA')
  ) {
    return 'critical';
  }

  if (
    upper.includes('ROLE') ||
    upper.includes('PERMISSION') ||
    upper.includes('REFUND') ||
    upper.includes('DISCOUNT') ||
    upper.includes('OVERRIDE') ||
    upper.includes('REACTIVATE') ||
    upper.includes('SETTINGS') ||
    upper.includes('UPDATE')
  ) {
    return 'warning';
  }

  return 'info';
}

/**
 * Constructs a server-authoritative audit log entry with complete schema invariants.
 */
export function createAuthoritativeAuditRecord(params: AuthoritativeAuditParams): AuditLog {
  const result: AuditResult = params.result || 'success';
  const severity: AuditSeverity = params.severity || inferAuditSeverity(params.action, result);
  const now = params.timestamp || new Date().toISOString();
  const actorName = params.actorName || params.actorEmail || params.actorUid;
  const actorRole = params.actorRole || 'Staff Member';

  const sanitizedPrev = params.previousState ? (sanitizeAuditMetadata(params.previousState) as Record<string, unknown> | string) : null;
  const sanitizedNew = params.newState ? (sanitizeAuditMetadata(params.newState) as Record<string, unknown> | string) : null;
  const sanitizedMeta = params.metadata ? (sanitizeAuditMetadata(params.metadata) as Record<string, unknown>) : {};

  // Build a concise human-readable detail summary if not supplied
  let details = params.details;
  if (!details) {
    const targetLabel = params.targetName || params.targetId || 'entity';
    const outcome = result === 'denied' ? 'Access Denied: ' : result === 'failed' ? 'Operation Failed: ' : '';
    details = `${outcome}${params.action} on ${params.targetType || 'target'} '${targetLabel}' by ${actorName} (${actorRole}).`;
    if (params.reason) {
      details += ` Reason: ${params.reason}`;
    }
  }

  const record: AuditLog = {
    id: `audit_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    timestamp: now,
    staffName: actorName,
    role: actorRole,
    action: params.action,
    module: params.module,
    details,
    tenantId: params.tenantId,
    actorUid: params.actorUid,
    actorName,
    actorEmail: params.actorEmail || null,
    actorRole,
    targetType: params.targetType,
    targetId: params.targetId,
    targetName: params.targetName,
    previousState: sanitizedPrev,
    newState: sanitizedNew,
    reason: params.reason,
    result,
    severity,
    targetStaffId: params.targetType === 'staff' ? params.targetId : undefined,
    targetStaffName: params.targetType === 'staff' ? params.targetName : undefined,
    metadata: sanitizedMeta,
  };

  const canonicalFields = [
    record.id,
    record.timestamp,
    record.actorUid || '',
    record.action || '',
    record.module || '',
    record.result || 'success',
    record.severity || 'info',
    record.reason || '',
    record.tenantId || '',
    record.targetType || '',
    record.targetId || '',
    (record.metadata as any)?.correlationId || '',
  ];
  (record as any).integrityHash = crypto.createHash('sha256').update(canonicalFields.join('||'), 'utf8').digest('hex');

  return record;
}

/**
 * Authoritative rolling security metrics document schema stored under `tenant_security_metrics/{tenantId}`.
 * Allows O(1) KPI evaluation without reading historical audit logs.
 */
export interface TenantSecurityMetricsDoc {
  tenantId: string;
  staffSuspensions: number;
  rolePermissionChanges: number;
  ownershipEvents: number;
  failedDeniedOperations: number;
  lifecycle?: {
    suspended: number;
    reactivated: number;
    archived: number;
  };
  dailyBuckets: Record<string, number>;
  updatedAt: string;
}

/**
 * Derives current AuditSecurityMetrics from the authoritative summary document.
 */
export function extractMetricsFromDoc(docData: any): AuditSecurityMetrics {
  const now = new Date();
  const dateKeys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dateKeys.push(d.toISOString().slice(0, 10));
  }
  const todayKey = dateKeys[0];
  const buckets = (docData && typeof docData === 'object' && docData.dailyBuckets) || {};

  const eventsToday = Number(buckets[todayKey] || 0);
  let eventsThisWeek = 0;
  for (const k of dateKeys) {
    eventsThisWeek += Number(buckets[k] || 0);
  }

  return {
    eventsToday,
    eventsThisWeek,
    staffSuspensions: Number(docData?.staffSuspensions || 0),
    rolePermissionChanges: Number(docData?.rolePermissionChanges || 0),
    ownershipEvents: Number(docData?.ownershipEvents || 0),
    failedDeniedOperations: Number(docData?.failedDeniedOperations || 0),
  };
}

/**
 * Applies an audit event to a TenantSecurityMetricsDoc.
 * Strict invariant: failed/denied operations ONLY increment failedDeniedOperations.
 */
export function applyEventToMetricsDoc(
  currentDoc: Partial<TenantSecurityMetricsDoc> | null | undefined,
  event: AuditLog
): TenantSecurityMetricsDoc {
  const dateKey = (event.timestamp ? new Date(event.timestamp) : new Date()).toISOString().slice(0, 10);
  const buckets: Record<string, number> = { ...(currentDoc?.dailyBuckets || {}) };
  buckets[dateKey] = (Number(buckets[dateKey]) || 0) + 1;

  // Prune buckets older than 35 days to keep document size bounded
  const cutoff = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  for (const key of Object.keys(buckets)) {
    if (key < cutoff) {
      delete buckets[key];
    }
  }

  let staffSuspensions = Number(currentDoc?.staffSuspensions || 0);
  let rolePermissionChanges = Number(currentDoc?.rolePermissionChanges || 0);
  let ownershipEvents = Number(currentDoc?.ownershipEvents || 0);
  let failedDeniedOperations = Number(currentDoc?.failedDeniedOperations || 0);
  const lifecycle = {
    suspended: Number(currentDoc?.lifecycle?.suspended || 0),
    reactivated: Number(currentDoc?.lifecycle?.reactivated || 0),
    archived: Number(currentDoc?.lifecycle?.archived || 0),
  };

  if (event.result === 'denied' || event.result === 'failed') {
    failedDeniedOperations += 1;
  } else {
    const actionUpper = String(event.action || '').toUpperCase();
    const detailsUpper = String(event.details || '').toUpperCase();
    const isTenantLifecycle = event.module === 'Tenant Lifecycle' || actionUpper.startsWith('TENANT_LIFECYCLE_') || actionUpper.startsWith('TENANT_');

    if (actionUpper === 'TENANT_SUSPENDED' || actionUpper === 'TENANT_LIFECYCLE_SUSPENDED') {
      lifecycle.suspended += 1;
    } else if (actionUpper === 'TENANT_REACTIVATED' || actionUpper === 'TENANT_LIFECYCLE_ACTIVE') {
      lifecycle.reactivated += 1;
    } else if (actionUpper === 'TENANT_ARCHIVED' || actionUpper === 'TENANT_LIFECYCLE_ARCHIVED') {
      lifecycle.archived += 1;
    } else if (!isTenantLifecycle && (actionUpper.includes('SUSPEND') || detailsUpper.includes('STAFF SUSPENDED'))) {
      staffSuspensions += 1;
    }

    if (
      actionUpper.includes('ROLE') ||
      actionUpper.includes('PERMISSION') ||
      detailsUpper.includes('ROLE CHANGED') ||
      detailsUpper.includes('PERMISSIONS UPDATED')
    ) {
      rolePermissionChanges += 1;
    }
    if (
      actionUpper.includes('OWNERSHIP') ||
      actionUpper.includes('TENANT_OWNERSHIP_TRANSFERRED') ||
      detailsUpper.includes('OWNERSHIP TRANSFERRED')
    ) {
      ownershipEvents += 1;
    }
  }

  return {
    tenantId: event.tenantId,
    staffSuspensions,
    rolePermissionChanges,
    ownershipEvents,
    failedDeniedOperations,
    lifecycle,
    dailyBuckets: buckets,
    updatedAt: event.timestamp || new Date().toISOString(),
  };
}

/**
 * Updates the authoritative rolling security metrics document in Firestore.
 * Supports running within an active Firestore Transaction or WriteBatch.
 */
export async function updateAuthoritativeSecurityMetrics(
  db: any,
  record: AuditLog,
  transactionOrBatch?: any
): Promise<void> {
  if (!db || !record.tenantId || typeof db.collection !== 'function') return;

  try {
    const metricsRef = db.collection('tenant_security_metrics').doc(record.tenantId);

    if (transactionOrBatch && typeof transactionOrBatch.get === 'function') {
      // Transaction mode: read existing document and commit updated metrics atomically
      const snap = await transactionOrBatch.get(metricsRef);
      const current = snap && snap.exists ? (typeof snap.data === 'function' ? snap.data() : snap.data) : null;
      const nextDoc = applyEventToMetricsDoc(current, record);
      transactionOrBatch.set(metricsRef, nextDoc, { merge: true });
    } else if (transactionOrBatch && typeof transactionOrBatch.set === 'function') {
      // Batch mode: queue update with merge
      const nextDoc = applyEventToMetricsDoc(null, record);
      transactionOrBatch.set(metricsRef, nextDoc, { merge: true });
    } else {
      // Standalone execution
      let current: any = null;
      if (typeof metricsRef.get === 'function') {
        const snap = await metricsRef.get();
        if (snap && snap.exists) {
          current = typeof snap.data === 'function' ? snap.data() : snap.data;
        }
      }
      const nextDoc = applyEventToMetricsDoc(current, record);
      if (typeof metricsRef.set === 'function') {
        await metricsRef.set(nextDoc, { merge: true });
      }
    }
  } catch {
    // Gracefully handle environments (e.g. test mocks) where tenant_security_metrics is not defined
  }
}

/**
 * Persists an authoritative audit event to Firestore.
 * Supports running within an existing Firestore transaction or batch for atomic guarantees.
 */
export async function recordAuditEvent(
  db: any,
  record: AuditLog,
  transactionOrBatch?: any
): Promise<AuditLog> {
  const auditRef = db.collection('audit_logs').doc(record.id);
  if (transactionOrBatch) {
    if (typeof transactionOrBatch.set === 'function') {
      transactionOrBatch.set(auditRef, record);
    }
  } else {
    await auditRef.set(record);
  }

  // Update authoritative rolling security metrics document
  try {
    await updateAuthoritativeSecurityMetrics(db, record, transactionOrBatch);
  } catch {
    // Preserve audit log persistence even if metrics document update fails
  }

  return record;
}

/**
 * Computes authoritative security metrics across an in-memory batch of tenant events.
 * Correctness guarantee: Failed and denied operations never increment successful-event metrics.
 */
export function computeSecurityMetrics(events: AuditLog[]): AuditSecurityMetrics {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();

  let eventsToday = 0;
  let eventsThisWeek = 0;
  let staffSuspensions = 0;
  let rolePermissionChanges = 0;
  let ownershipEvents = 0;
  let failedDeniedOperations = 0;

  for (const event of events) {
    const eventTime = new Date(event.timestamp).getTime();
    if (!isNaN(eventTime)) {
      if (eventTime >= startOfToday) {
        eventsToday++;
      }
      if (eventTime >= startOfWeek) {
        eventsThisWeek++;
      }
    }

    if (event.result === 'denied' || event.result === 'failed') {
      failedDeniedOperations++;
      // CRITICAL: Block failed/denied operations from contaminating success counters
      continue;
    }

    const actionUpper = String(event.action || '').toUpperCase();
    const detailsUpper = String(event.details || '').toUpperCase();

    if (actionUpper.includes('SUSPEND') || detailsUpper.includes('SUSPENDED')) {
      staffSuspensions++;
    }

    if (
      actionUpper.includes('ROLE') ||
      actionUpper.includes('PERMISSION') ||
      detailsUpper.includes('ROLE CHANGED') ||
      detailsUpper.includes('PERMISSIONS UPDATED')
    ) {
      rolePermissionChanges++;
    }

    if (
      actionUpper.includes('OWNERSHIP') ||
      actionUpper.includes('TENANT_OWNERSHIP_TRANSFERRED') ||
      detailsUpper.includes('OWNERSHIP TRANSFERRED')
    ) {
      ownershipEvents++;
    }
  }

  return {
    eventsToday,
    eventsThisWeek,
    staffSuspensions,
    rolePermissionChanges,
    ownershipEvents,
    failedDeniedOperations,
  };
}

/**
 * Queries audit logs scoped strictly to the authenticated tenant.
 * Uses bounded Firestore queries and authoritative rolling security metrics.
 */
export async function queryTenantAuditLogs(
  db: any,
  tenantId: string,
  params: AuditFilterParams = {}
): Promise<AuditApiResponse> {
  if (!tenantId) {
    throw new Error('Tenant ID is required for audit queries.');
  }

  // Bounded query pagination
  const rawPage = Number(params.page);
  const page = !isNaN(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const rawPageSize = Number(params.pageSize);
  const pageSize = !isNaN(rawPageSize) && rawPageSize > 0 ? Math.min(100, Math.max(1, Math.floor(rawPageSize))) : 25;

  // 1. Authoritative Rolling Metrics Retrieval (O(1) read, zero historical scan)
  let metrics: AuditSecurityMetrics | null = null;
  try {
    const metricsRef = db.collection('tenant_security_metrics').doc(tenantId);
    if (typeof metricsRef.get === 'function') {
      const metricsSnap = await metricsRef.get();
      if (metricsSnap && metricsSnap.exists) {
        const data = typeof metricsSnap.data === 'function' ? metricsSnap.data() : metricsSnap.data;
        if (data) {
          metrics = extractMetricsFromDoc(data);
        }
      }
    }
  } catch {
    // If tenant_security_metrics is not available or mock DB only allows 'audit_logs', fallback
  }

  // 2. Strict tenant scoping with bounded read limits
  let baseQuery = db.collection('audit_logs').where('tenantId', '==', tenantId);

  // Apply server-side query filters when supported
  if (params.module && params.module !== 'All' && typeof baseQuery.where === 'function') {
    try {
      baseQuery = baseQuery.where('module', '==', params.module);
    } catch {
      // Graceful fallback to in-memory filter if composite index is not yet built in test
    }
  }
  if (params.severity && params.severity !== 'All' && typeof baseQuery.where === 'function') {
    try {
      baseQuery = baseQuery.where('severity', '==', params.severity);
    } catch {
      // Fallback
    }
  }
  if (params.result && params.result !== 'All' && typeof baseQuery.where === 'function') {
    try {
      baseQuery = baseQuery.where('result', '==', params.result);
    } catch {
      // Fallback
    }
  }

  // Apply server-side ordering if available
  if (typeof baseQuery.orderBy === 'function') {
    try {
      baseQuery = baseQuery.orderBy('timestamp', 'desc');
    } catch {
      // Fallback
    }
  }

  // Apply hard limit to bounded snapshot read to eliminate unbounded historical memory loading
  if (typeof baseQuery.limit === 'function') {
    baseQuery = baseQuery.limit(MAX_AUDIT_LOG_FETCH);
  }

  const snapshot = await baseQuery.get();

  const allTenantEvents: AuditLog[] = [];
  if (typeof (snapshot as any).forEach === 'function') {
    (snapshot as any).forEach((doc: any) => {
      const data = doc.data();
      if (data && data.tenantId === tenantId) {
        allTenantEvents.push({ id: doc.id, ...data });
      }
    });
  } else if (Array.isArray((snapshot as any).docs)) {
    for (const doc of (snapshot as any).docs) {
      const data = doc.data();
      if (data && data.tenantId === tenantId) {
        allTenantEvents.push({ id: doc.id, ...data });
      }
    }
  }

  // 3. Fallback metrics calculation if summary document did not exist (e.g. legacy tenant or test mock)
  if (!metrics) {
    metrics = computeSecurityMetrics(allTenantEvents);
  }

  // 4. Apply multi-dimensional in-memory filters safely
  let filtered = allTenantEvents;

  // Date Range
  if (params.startDate) {
    const startMs = new Date(params.startDate).getTime();
    if (!isNaN(startMs)) {
      filtered = filtered.filter((e) => new Date(e.timestamp).getTime() >= startMs);
    }
  }
  if (params.endDate) {
    const endMs = new Date(params.endDate).getTime();
    if (!isNaN(endMs)) {
      filtered = filtered.filter((e) => new Date(e.timestamp).getTime() <= endMs);
    }
  }

  // Module (in case server-side where was skipped)
  if (params.module && params.module !== 'All') {
    const targetMod = params.module.toLowerCase();
    filtered = filtered.filter((e) => String(e.module || '').toLowerCase() === targetMod);
  }

  // Action
  if (params.action && params.action !== 'All') {
    const targetAction = params.action.toLowerCase();
    filtered = filtered.filter((e) => String(e.action || '').toLowerCase().includes(targetAction));
  }

  // Result
  if (params.result && params.result !== 'All') {
    const targetResult = params.result.toLowerCase();
    filtered = filtered.filter((e) => String(e.result || 'success').toLowerCase() === targetResult);
  }

  // Severity
  if (params.severity && params.severity !== 'All') {
    const targetSev = params.severity.toLowerCase();
    filtered = filtered.filter((e) => String(e.severity || 'info').toLowerCase() === targetSev);
  }

  // Actor
  if (params.actor) {
    const term = params.actor.toLowerCase();
    filtered = filtered.filter((e) =>
      String(e.actorName || e.staffName || '').toLowerCase().includes(term) ||
      String(e.actorEmail || '').toLowerCase().includes(term) ||
      String(e.actorUid || '').toLowerCase() === term
    );
  }

  // Target
  if (params.target) {
    const term = params.target.toLowerCase();
    filtered = filtered.filter((e) =>
      String(e.targetName || e.targetStaffName || '').toLowerCase().includes(term) ||
      String(e.targetId || e.targetStaffId || '').toLowerCase().includes(term)
    );
  }

  // General Search Term
  if (params.search && params.search.trim()) {
    const term = params.search.trim().toLowerCase();
    filtered = filtered.filter((e) =>
      String(e.action || '').toLowerCase().includes(term) ||
      String(e.details || '').toLowerCase().includes(term) ||
      String(e.staffName || e.actorName || '').toLowerCase().includes(term) ||
      String(e.actorEmail || '').toLowerCase().includes(term) ||
      String(e.targetName || e.targetStaffName || '').toLowerCase().includes(term) ||
      String(e.targetId || e.targetStaffId || '').toLowerCase().includes(term) ||
      String(e.module || '').toLowerCase().includes(term) ||
      String(e.reason || '').toLowerCase().includes(term)
    );
  }

  // Sort newest first
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const offset = (page - 1) * pageSize;
  const paginatedEvents = filtered.slice(offset, offset + pageSize);

  return {
    success: true,
    events: paginatedEvents,
    totalCount,
    page,
    pageSize,
    totalPages,
    metrics,
  };
}
