import crypto from 'node:crypto';
import type { AuditLog, AuditApiResponse, AuditFilterParams, AuditResult, AuditSeverity, AuditSecurityMetrics } from '../types';

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

  return {
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
}

/**
 * Persists an authoritative audit event to Firestore.
 * Supports running within an existing Firestore transaction for atomic guarantees.
 */
export async function recordAuditEvent(
  db: any,
  record: AuditLog,
  transaction?: any
): Promise<AuditLog> {
  const auditRef = db.collection('audit_logs').doc(record.id);
  if (transaction) {
    transaction.set(auditRef, record);
  } else {
    await auditRef.set(record);
  }
  return record;
}

/**
 * Computes authoritative security metrics across all tenant events.
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
 * Applies multi-dimensional filtering, searching, and pagination.
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

  // Strict tenant scoping: Query ONLY documents matching the authenticated tenantId
  const snapshot = await db.collection('audit_logs')
    .where('tenantId', '==', tenantId)
    .get();

  let allTenantEvents: AuditLog[] = [];
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

  // Calculate authoritative metrics across the full tenant event log before filtering
  const metrics = computeSecurityMetrics(allTenantEvents);

  // Apply in-memory filters safely
  let filtered = allTenantEvents;

  // 1. Date Range
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

  // 2. Module
  if (params.module && params.module !== 'All') {
    const targetMod = params.module.toLowerCase();
    filtered = filtered.filter((e) => String(e.module || '').toLowerCase() === targetMod);
  }

  // 3. Action
  if (params.action && params.action !== 'All') {
    const targetAction = params.action.toLowerCase();
    filtered = filtered.filter((e) => String(e.action || '').toLowerCase().includes(targetAction));
  }

  // 4. Result
  if (params.result && params.result !== 'All') {
    const targetResult = params.result.toLowerCase();
    filtered = filtered.filter((e) => String(e.result || 'success').toLowerCase() === targetResult);
  }

  // 5. Severity
  if (params.severity && params.severity !== 'All') {
    const targetSev = params.severity.toLowerCase();
    filtered = filtered.filter((e) => String(e.severity || 'info').toLowerCase() === targetSev);
  }

  // 6. Actor
  if (params.actor) {
    const term = params.actor.toLowerCase();
    filtered = filtered.filter((e) =>
      String(e.actorName || e.staffName || '').toLowerCase().includes(term) ||
      String(e.actorEmail || '').toLowerCase().includes(term) ||
      String(e.actorUid || '').toLowerCase() === term
    );
  }

  // 7. Target
  if (params.target) {
    const term = params.target.toLowerCase();
    filtered = filtered.filter((e) =>
      String(e.targetName || e.targetStaffName || '').toLowerCase().includes(term) ||
      String(e.targetId || e.targetStaffId || '').toLowerCase().includes(term)
    );
  }

  // 8. General Search Term
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
