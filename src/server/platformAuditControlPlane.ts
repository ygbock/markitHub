import crypto from 'node:crypto';
import { sanitizeAuditMetadata, MAX_AUDIT_LOG_FETCH, computeAuditIntegrityHashV2, recordAuditEvent } from './auditService';
import { createPlatformAlert } from './platformAlertControlPlane';
import type { CallerContext } from './platformIdentityControlPlane';

export type AuditSeverity = 'info' | 'warning' | 'critical';
export type AuditResult = 'success' | 'denied' | 'failed';
export type AuditCategory = 'ADMIN_ACTION' | 'SECURITY_EVENT' | 'SYSTEM_ACTION' | 'AUTOMATED_ACTION';
export type AuditIntegrityStatus = 'VALID' | 'INVALID' | 'UNVERIFIED';

export interface PlatformAuditEvent {
  id: string;
  auditId: string;
  timestamp: string;
  actorUid: string;
  actorEmail: string | null;
  actorName: string;
  actorRole: string;
  tenantId?: string | null;
  tenantName?: string | null;
  module: string;
  action: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  severity: AuditSeverity;
  result: AuditResult;
  category: AuditCategory;
  reason?: string;
  details: string;
  previousState?: Record<string, unknown> | string | null;
  newState?: Record<string, unknown> | string | null;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  requestId?: string;
  source?: string;
  integrityHash?: string;
  integrityVersion?: 1 | 2;
  integrityStatus?: AuditIntegrityStatus;
  verifiedAt?: string;
}

export interface AuditFilterParams {
  page?: number;
  limit?: number;
  pageSize?: number;
  actorUid?: string;
  actorEmail?: string;
  action?: string;
  module?: string;
  severity?: AuditSeverity;
  result?: AuditResult;
  category?: AuditCategory;
  tenantId?: string;
  targetType?: string;
  targetId?: string;
  startDate?: string;
  endDate?: string;
  correlationId?: string;
  requestId?: string;
  search?: string;
}

export interface PlatformAuditSummary {
  eventsToday: number;
  eventsThisWeek: number;
  eventsThisMonth: number;
  administrativeActions: number;
  securityEvents: number;
  automatedActions: number;
  failedActions: number;
  deniedActions: number;
  lifecycleChanges: number;
  billingChanges: number;
  planChanges: number;
  permissionChanges: number;
  platformAdminChanges: number;
  breakGlassEvents: number;
  governanceChanges: number;
  alertActions: number;
  integrityFailures: number;
}

export interface IntegrityVerificationResult {
  auditId: string;
  valid: boolean;
  status: AuditIntegrityStatus;
  calculatedHash: string;
  storedHash?: string | null;
  verifiedAt: string;
  details?: string;
}

export interface ComplianceReport {
  generatedAt: string;
  reportingPeriod: {
    start: string;
    end: string;
  };
  totalAdministrativeEvents: number;
  privilegedActions: number;
  failedDeniedOperations: number;
  breakGlassActivity: number;
  platformAdminLifecycleChanges: number;
  permissionChanges: number;
  governanceConfigurationChanges: number;
  tenantLifecycleChanges: number;
  billingChanges: number;
  integrityVerificationResults: {
    verifiedCount: number;
    validCount: number;
    invalidCount: number;
    unverifiedCount: number;
  };
  unresolvedSecurityEvents: number;
  eventCategorization: {
    systemFactsCount: number;
    adminActionsCount: number;
    automatedActionsCount: number;
    securityEventsCount: number;
  };
  retentionPolicy: {
    auditRetentionDays: number;
    auditExportEnabled: boolean;
    integrityVerificationEnabled: boolean;
    immutableLedgerEnforced: boolean;
  };
}

/**
 * Computes a deterministic SHA-256 integrity hash over canonical authoritative audit attributes.
 */
function computeLegacyAuditIntegrityHash(record: Partial<PlatformAuditEvent>): string {
  const canonicalFields = [
    record.id || record.auditId || '',
    record.timestamp || '',
    record.actorUid || '',
    record.action || '',
    record.module || '',
    record.result || 'success',
    record.severity || 'info',
    record.reason || '',
    record.tenantId || '',
    record.targetType || '',
    record.targetId || '',
    record.correlationId || '',
  ];
  return crypto.createHash('sha256').update(canonicalFields.join('||'), 'utf8').digest('hex');
}

/**
 * Computes the current (v2) platform audit integrity signature.
 * Legacy v1 records are still verifiable through normalizeAuditEvent/verifyAuditIntegrity.
 */
export function computeAuditIntegrityHash(record: Partial<PlatformAuditEvent>): string {
  return computeAuditIntegrityHashV2(record as any);
}

/**
 * Classifies an audit event into standardized compliance categories.
 */
export function categorizeAuditEvent(record: Partial<PlatformAuditEvent>): AuditCategory {
  if (record.category) {
    return record.category;
  }

  const actionUpper = String(record.action || '').toUpperCase();
  const moduleUpper = String(record.module || '').toUpperCase();

  if (
    actionUpper.includes('BREAK_GLASS') ||
    actionUpper.includes('SECURITY') ||
    actionUpper.includes('AUTH') ||
    actionUpper.includes('DENIED') ||
    actionUpper.includes('INTEGRITY') ||
    actionUpper.includes('TAMPER') ||
    actionUpper.includes('ATTACK') ||
    moduleUpper.includes('SECURITY')
  ) {
    return 'SECURITY_EVENT';
  }

  if (
    actionUpper.startsWith('SCHEDULED_') ||
    actionUpper.startsWith('SWEEP_') ||
    actionUpper.startsWith('AUTO_') ||
    record.source === 'scheduler' ||
    record.source === 'system-worker'
  ) {
    return 'AUTOMATED_ACTION';
  }

  if (
    actionUpper.startsWith('SYSTEM_') ||
    record.actorUid === 'system' ||
    record.actorRole === 'SYSTEM'
  ) {
    return 'SYSTEM_ACTION';
  }

  return 'ADMIN_ACTION';
}

/**
 * Normalizes raw Firestore document data into a complete, typed PlatformAuditEvent.
 */
export function normalizeAuditEvent(doc: any): PlatformAuditEvent {
  const data = typeof doc.data === 'function' ? doc.data() : (doc.data || doc);
  const id = doc.id || data.id || `audit_${Date.now()}`;
  const timestamp = data.timestamp || new Date().toISOString();
  const actorUid = data.actorUid || data.staffId || 'unknown';
  const actorEmail = data.actorEmail || null;
  const actorName = data.actorName || data.staffName || actorEmail || actorUid;
  const actorRole = data.actorRole || data.role || 'Staff';
  const action = data.action || 'UNKNOWN_ACTION';
  const moduleName = data.module || 'System';
  const result: AuditResult = data.result === 'denied' ? 'denied' : data.result === 'failed' ? 'failed' : 'success';
  const severity: AuditSeverity = data.severity === 'critical' ? 'critical' : data.severity === 'warning' ? 'warning' : 'info';

  const category = categorizeAuditEvent({
    ...data,
    action,
    module: moduleName,
    actorUid,
    actorRole,
  });

  const event: PlatformAuditEvent = {
    id,
    auditId: id,
    timestamp,
    actorUid,
    actorEmail,
    actorName,
    actorRole,
    tenantId: data.tenantId || null,
    tenantName: data.tenantName || null,
    module: moduleName,
    action,
    targetType: data.targetType,
    targetId: data.targetId,
    targetName: data.targetName,
    severity,
    result,
    category,
    reason: data.reason,
    details: data.details || `${action} by ${actorName}`,
    previousState: data.previousState ? (sanitizeAuditMetadata(data.previousState) as any) : null,
    newState: data.newState ? (sanitizeAuditMetadata(data.newState) as any) : null,
    metadata: data.metadata ? (sanitizeAuditMetadata(data.metadata) as any) : {},
    correlationId: data.correlationId || data.metadata?.correlationId,
    requestId: data.requestId || data.metadata?.requestId,
    source: data.source || (data.metadata?.source as string) || 'console',
    integrityHash: data.integrityHash,
    integrityVersion: data.integrityVersion === 2 ? 2 : data.integrityHash ? 1 : undefined,
    verifiedAt: data.verifiedAt,
  };

  if (event.integrityHash) {
    const expected = event.integrityVersion === 2
      ? computeAuditIntegrityHash(event)
      : computeLegacyAuditIntegrityHash(event);
    event.integrityStatus = expected === event.integrityHash ? 'VALID' : 'INVALID';
  } else {
    event.integrityStatus = 'UNVERIFIED';
  }

  return event;
}

/**
 * Verifies cryptographic integrity of a platform audit record.
 * Generates an automated platform alert and security audit record on detected tamper mismatches.
 */
export async function verifyAuditIntegrity(
  db: any,
  auditId: string,
  caller?: CallerContext
): Promise<IntegrityVerificationResult> {
  if (!db || !auditId) {
    const error: any = new Error('Database connection and valid auditId are required.');
    error.statusCode = 400;
    throw error;
  }

  const docRef = db.collection('audit_logs').doc(auditId);
  const docSnap = await docRef.get();

  if (!docSnap || !docSnap.exists) {
    const error: any = new Error(`Audit record with ID '${auditId}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  const event = normalizeAuditEvent(docSnap);
  const calculatedHash = event.integrityVersion === 2
    ? computeAuditIntegrityHash(event)
    : computeLegacyAuditIntegrityHash(event);
  const storedHash = event.integrityHash;
  const verifiedAt = new Date().toISOString();

  if (!storedHash) {
    return {
      auditId,
      valid: true,
      status: 'UNVERIFIED',
      calculatedHash,
      storedHash: null,
      verifiedAt,
      details: 'Audit record lacks a cryptographic integrity signature (legacy record).',
    };
  }

  const isValid = calculatedHash === storedHash;

  if (!isValid) {
    // TAMPER MISMATCH DETECTED
    // 1. Create a platform alert for Super Admins and Security team
    try {
      await createPlatformAlert(db, {
        tenantId: event.tenantId || 'platform_global',
        title: `Audit Tamper Warning: Record ${auditId} Failed Integrity Check`,
        description: `Cryptographic mismatch detected on audit log ${auditId} (Action: ${event.action}, Actor: ${event.actorEmail || event.actorUid}). Expected hash ${calculatedHash.slice(0, 16)}..., stored hash ${storedHash.slice(0, 16)}...`,
        severity: 'CRITICAL',
        type: 'SECURITY_ANOMALY',
        source: 'security',
        metadata: {
          auditId,
          calculatedHash,
          storedHash,
          verifiedBy: caller?.email || 'security_automation',
          tamperDetectedAt: verifiedAt,
        },
      });
    } catch {
      // Non-blocking alert logging
    }

    // 2. Persist an immutable security event recording the violation
    try {
      const violationId = `audit_violation_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
      const violationRecord: Partial<PlatformAuditEvent> = {
        id: violationId,
        auditId: violationId,
        timestamp: verifiedAt,
        actorUid: caller?.uid || 'security_system',
        actorEmail: caller?.email || 'security@markithub.internal',
        actorName: caller?.name || 'Security Verifier',
        actorRole: caller?.role || 'PLATFORM_SECURITY',
        action: 'AUDIT_INTEGRITY_MISMATCH',
        module: 'Platform Audit & Compliance',
        targetType: 'audit_log',
        targetId: auditId,
        severity: 'critical',
        result: 'failed',
        category: 'SECURITY_EVENT',
        reason: 'Automated cryptographic integrity verification failed.',
        details: `Integrity check failed for audit record '${auditId}'. Stored: ${storedHash}, Calculated: ${calculatedHash}`,
        metadata: {
          targetAuditId: auditId,
          targetAction: event.action,
          storedHash,
          calculatedHash,
        },
      };
      violationRecord.integrityHash = computeAuditIntegrityHash(violationRecord);
      await recordAuditEvent(db, violationRecord as any);
    } catch {
      // Non-blocking violation log
    }

    return {
      auditId,
      valid: false,
      status: 'INVALID',
      calculatedHash,
      storedHash,
      verifiedAt,
      details: 'Cryptographic hash mismatch. Record payload may have been tampered with.',
    };
  }

  return {
    auditId,
    valid: true,
    status: 'VALID',
    calculatedHash,
    storedHash,
    verifiedAt,
    details: 'Cryptographic integrity signature verified successfully.',
  };
}

/**
 * Lists platform audit events with robust filtering, bounded pagination, and deterministic ordering.
 */
export async function listPlatformAuditEvents(
  db: any,
  filters: AuditFilterParams = {}
): Promise<{
  events: PlatformAuditEvent[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  if (!db) {
    return { events: [], total: 0, page: 1, pageSize: 25, totalPages: 0 };
  }

  const rawPage = Number(filters.page);
  const page = !isNaN(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const rawLimit = Number(filters.limit || filters.pageSize);
  const pageSize = !isNaN(rawLimit) && rawLimit > 0 ? Math.min(100, Math.max(1, Math.floor(rawLimit))) : 25;

  let query = db.collection('audit_logs');

  if (filters.tenantId && filters.tenantId !== 'all') {
    query = query.where('tenantId', '==', filters.tenantId);
  }
  if (filters.actorUid) {
    query = query.where('actorUid', '==', filters.actorUid);
  }
  if (filters.action && filters.action !== 'all') {
    query = query.where('action', '==', filters.action);
  }
  if (filters.severity && (filters.severity as string) !== 'all') {
    query = query.where('severity', '==', filters.severity);
  }
  if (filters.result && (filters.result as string) !== 'all') {
    query = query.where('result', '==', filters.result);
  }
  if (filters.module && filters.module !== 'all') {
    query = query.where('module', '==', filters.module);
  }
  if (filters.correlationId) {
    query = query.where('correlationId', '==', filters.correlationId);
  }
  if (filters.targetType && filters.targetType !== 'all') {
    query = query.where('targetType', '==', filters.targetType);
  }
  if (filters.targetId) {
    query = query.where('targetId', '==', filters.targetId);
  }

  // Bound collection reads to prevent denial-of-service / memory exhaustion
  const snapshot = await query.limit(MAX_AUDIT_LOG_FETCH).get();
  let events: PlatformAuditEvent[] = snapshot.docs.map((doc: any) => normalizeAuditEvent(doc));

  // In-memory filters for fields not supported by compound indexes or for search
  if (filters.actorEmail) {
    const emailLower = filters.actorEmail.toLowerCase();
    events = events.filter((e) => (e.actorEmail || '').toLowerCase().includes(emailLower));
  }

  if (filters.category && filters.category !== ('all' as any)) {
    events = events.filter((e) => e.category === filters.category);
  }

  if (filters.requestId) {
    events = events.filter((e) => e.requestId === filters.requestId || e.metadata?.requestId === filters.requestId);
  }

  if (filters.startDate) {
    const startTime = new Date(filters.startDate).getTime();
    if (!isNaN(startTime)) {
      events = events.filter((e) => new Date(e.timestamp).getTime() >= startTime);
    }
  }

  if (filters.endDate) {
    const endTime = new Date(filters.endDate).getTime();
    if (!isNaN(endTime)) {
      events = events.filter((e) => new Date(e.timestamp).getTime() <= endTime);
    }
  }

  if (filters.search) {
    const q = filters.search.toLowerCase().trim();
    events = events.filter((e) =>
      e.id.toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q) ||
      e.module.toLowerCase().includes(q) ||
      e.details.toLowerCase().includes(q) ||
      (e.actorName && e.actorName.toLowerCase().includes(q)) ||
      (e.actorEmail && e.actorEmail.toLowerCase().includes(q)) ||
      (e.actorUid && e.actorUid.toLowerCase().includes(q)) ||
      (e.reason && e.reason.toLowerCase().includes(q)) ||
      (e.targetName && e.targetName.toLowerCase().includes(q)) ||
      (e.targetId && e.targetId.toLowerCase().includes(q)) ||
      (e.correlationId && e.correlationId.toLowerCase().includes(q))
    );
  }

  // Deterministic chronological ordering (newest first)
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const total = events.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedEvents = events.slice(startIndex, startIndex + pageSize);

  return {
    events: paginatedEvents,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Retrieves a single platform audit event by its unique ID.
 */
export async function getPlatformAuditEvent(
  db: any,
  auditId: string
): Promise<PlatformAuditEvent | null> {
  if (!db || !auditId) return null;

  const docRef = db.collection('audit_logs').doc(auditId);
  const snap = await docRef.get();
  if (!snap || !snap.exists) return null;

  return normalizeAuditEvent(snap);
}

/**
 * Computes authoritative summary and compliance KPIs from recent platform audit events.
 */
export async function getPlatformAuditSummary(db: any): Promise<PlatformAuditSummary> {
  if (!db) {
    return {
      eventsToday: 0,
      eventsThisWeek: 0,
      eventsThisMonth: 0,
      administrativeActions: 0,
      securityEvents: 0,
      automatedActions: 0,
      failedActions: 0,
      deniedActions: 0,
      lifecycleChanges: 0,
      billingChanges: 0,
      planChanges: 0,
      permissionChanges: 0,
      platformAdminChanges: 0,
      breakGlassEvents: 0,
      governanceChanges: 0,
      alertActions: 0,
      integrityFailures: 0,
    };
  }

  const snap = await db.collection('audit_logs').limit(MAX_AUDIT_LOG_FETCH).get();
  const events = snap.docs.map((doc: any) => normalizeAuditEvent(doc));

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const startOfMonth = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  let eventsToday = 0;
  let eventsThisWeek = 0;
  let eventsThisMonth = 0;
  let administrativeActions = 0;
  let securityEvents = 0;
  let automatedActions = 0;
  let failedActions = 0;
  let deniedActions = 0;
  let lifecycleChanges = 0;
  let billingChanges = 0;
  let planChanges = 0;
  let permissionChanges = 0;
  let platformAdminChanges = 0;
  let breakGlassEvents = 0;
  let governanceChanges = 0;
  let alertActions = 0;
  let integrityFailures = 0;

  for (const ev of events) {
    const time = new Date(ev.timestamp).getTime();
    if (!isNaN(time)) {
      if (time >= startOfToday) eventsToday++;
      if (time >= startOfWeek) eventsThisWeek++;
      if (time >= startOfMonth) eventsThisMonth++;
    }

    if (ev.result === 'denied') deniedActions++;
    if (ev.result === 'failed') failedActions++;

    if (ev.category === 'ADMIN_ACTION') administrativeActions++;
    if (ev.category === 'SECURITY_EVENT') securityEvents++;
    if (ev.category === 'AUTOMATED_ACTION') automatedActions++;

    if (ev.integrityStatus === 'INVALID') integrityFailures++;

    const actionUpper = ev.action.toUpperCase();
    const moduleUpper = ev.module.toUpperCase();

    if (actionUpper.includes('LIFECYCLE') || moduleUpper.includes('LIFECYCLE')) lifecycleChanges++;
    if (actionUpper.includes('BILLING') || actionUpper.includes('INVOICE') || moduleUpper.includes('BILLING')) billingChanges++;
    if (actionUpper.includes('PLAN')) planChanges++;
    if (actionUpper.includes('PERMISSION') || actionUpper.includes('ROLE')) permissionChanges++;
    if (actionUpper.includes('ADMIN') && (actionUpper.includes('CREATE') || actionUpper.includes('UPDATE') || actionUpper.includes('DELETE') || actionUpper.includes('STATUS'))) {
      platformAdminChanges++;
    }
    if (actionUpper.includes('BREAK_GLASS')) breakGlassEvents++;
    if (actionUpper.includes('CONFIG') || actionUpper.includes('GOVERNANCE') || moduleUpper.includes('GOVERNANCE')) governanceChanges++;
    if (actionUpper.includes('ALERT') || moduleUpper.includes('ALERT')) alertActions++;
  }

  return {
    eventsToday,
    eventsThisWeek,
    eventsThisMonth,
    administrativeActions,
    securityEvents,
    automatedActions,
    failedActions,
    deniedActions,
    lifecycleChanges,
    billingChanges,
    planChanges,
    permissionChanges,
    platformAdminChanges,
    breakGlassEvents,
    governanceChanges,
    alertActions,
    integrityFailures,
  };
}

/**
 * Links and retrieves related audit events across correlation IDs, request IDs, or target entities.
 */
export async function correlatePlatformAuditEvents(
  db: any,
  options: {
    correlationId?: string;
    requestId?: string;
    targetId?: string;
    auditId?: string;
  }
): Promise<{
  correlationId: string;
  relatedEvents: PlatformAuditEvent[];
  count: number;
}> {
  if (!db) {
    return { correlationId: '', relatedEvents: [], count: 0 };
  }

  let correlationId = options.correlationId || '';
  let targetId = options.targetId || '';

  // If auditId is given, resolve its correlationId and targetId
  if (options.auditId && (!correlationId || !targetId)) {
    const single = await getPlatformAuditEvent(db, options.auditId);
    if (single) {
      if (!correlationId && single.correlationId) correlationId = single.correlationId;
      if (!targetId && single.targetId) targetId = single.targetId;
    }
  }

  const snap = await db.collection('audit_logs').limit(MAX_AUDIT_LOG_FETCH).get();
  const allEvents = snap.docs.map((d: any) => normalizeAuditEvent(d));

  const matched = allEvents.filter((ev) => {
    if (correlationId && ev.correlationId === correlationId) return true;
    if (options.requestId && (ev.requestId === options.requestId || ev.metadata?.requestId === options.requestId)) return true;
    if (targetId && ev.targetId === targetId) return true;
    return false;
  });

  matched.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return {
    correlationId: correlationId || options.requestId || targetId || 'unassigned',
    relatedEvents: matched,
    count: matched.length,
  };
}

/**
 * Sanitizes arbitrary values against CSV formula injection (DDE attacks).
 * Escapes characters =, +, -, @ by prefixing with a single quote.
 */
export function sanitizeForCsvFormulaInjection(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value);

  // Redact credentials or secret keys if accidentally present
  str = str.replace(/(?:password|secret|token|apikey|privatekey)=[^,\s]+/gi, '[REDACTED]');

  // Escape formula triggers
  const firstChar = str.trimStart().charAt(0);
  if (['=', '+', '-', '@', '\t', '\r'].includes(firstChar)) {
    str = `'${str}`;
  }

  // Quote and escape if comma or double-quote present
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Exports filtered platform audit logs to a secure, sanitized CSV with formula-injection protection.
 * Automatically logs a server-authoritative PLATFORM_AUDIT_EXPORTED audit record.
 */
export async function exportPlatformAuditEvents(
  db: any,
  filters: AuditFilterParams,
  caller: CallerContext,
  reason = 'Regulatory and compliance data export'
): Promise<{
  csv: string;
  count: number;
  exportAuditId: string;
}> {
  if (!db) {
    const error: any = new Error('Database service is not configured.');
    error.statusCode = 503;
    throw error;
  }

  // Fetch filtered events up to safe boundary
  const exportReason = String(reason || '').trim().replace(/<[^>]*>?/gm, '');
  if (exportReason.length < 3) {
    const error: any = new Error('Audit export justification reason is mandatory and must be at least 3 characters.');
    error.statusCode = 400;
    throw error;
  }
  const safeExportReason = exportReason.slice(0, 500);

  const { events } = await listPlatformAuditEvents(db, {
    ...filters,
    page: 1,
    limit: MAX_AUDIT_LOG_FETCH,
  });

  const headers = [
    'Audit ID',
    'Timestamp (UTC)',
    'Category',
    'Severity',
    'Result',
    'Module',
    'Action',
    'Actor Email',
    'Actor UID',
    'Actor Role',
    'Tenant ID',
    'Target Type',
    'Target ID',
    'Reason / Justification',
    'Details',
    'Correlation ID',
    'Integrity Status',
  ];

  const rows = events.map((e) => [
    sanitizeForCsvFormulaInjection(e.id),
    sanitizeForCsvFormulaInjection(e.timestamp),
    sanitizeForCsvFormulaInjection(e.category),
    sanitizeForCsvFormulaInjection(e.severity),
    sanitizeForCsvFormulaInjection(e.result),
    sanitizeForCsvFormulaInjection(e.module),
    sanitizeForCsvFormulaInjection(e.action),
    sanitizeForCsvFormulaInjection(e.actorEmail || ''),
    sanitizeForCsvFormulaInjection(e.actorUid),
    sanitizeForCsvFormulaInjection(e.actorRole),
    sanitizeForCsvFormulaInjection(e.tenantId || ''),
    sanitizeForCsvFormulaInjection(e.targetType || ''),
    sanitizeForCsvFormulaInjection(e.targetId || ''),
    sanitizeForCsvFormulaInjection(e.reason || ''),
    sanitizeForCsvFormulaInjection(e.details),
    sanitizeForCsvFormulaInjection(e.correlationId || ''),
    sanitizeForCsvFormulaInjection(e.integrityStatus || 'UNVERIFIED'),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\r\n');

  // Record immutable export audit event
  const exportAuditId = `audit_export_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  const correlationId = `export_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;

  const exportRecord: Partial<PlatformAuditEvent> = {
    id: exportAuditId,
    auditId: exportAuditId,
    timestamp: now,
    actorUid: caller.uid,
    actorEmail: caller.email,
    actorName: caller.name || caller.email || caller.uid,
    actorRole: caller.role || 'SUPER_ADMIN',
    action: 'PLATFORM_AUDIT_EXPORTED',
    module: 'Platform Audit & Compliance',
    targetType: 'audit_logs',
    targetId: 'export_csv',
    severity: 'info',
    result: 'success',
    category: 'ADMIN_ACTION',
    reason: safeExportReason,
    details: `Exported ${events.length} audit records to CSV by ${caller.email || caller.uid}. Filters: ${JSON.stringify(filters)}.`,
    correlationId,
    metadata: {
      exportedRecordsCount: events.length,
      filterParameters: sanitizeAuditMetadata(filters),
      requestingAdmin: caller.email || caller.uid,
    },
  };
  exportRecord.integrityHash = computeAuditIntegrityHash(exportRecord);

  try {
    await db.collection('audit_logs').doc(exportAuditId).set(exportRecord);
  } catch {
    // Non-blocking log persistence
  }

  return {
    csv: csvContent,
    count: events.length,
    exportAuditId,
  };
}

/**
 * Generates an authoritative, structured Compliance & Governance Report.
 */
export async function generateComplianceReport(
  db: any,
  options: {
    startDate?: string;
    endDate?: string;
    tenantId?: string;
  } = {}
): Promise<ComplianceReport> {
  const now = new Date();
  const endDate = options.endDate || now.toISOString();
  const startDate = options.startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { events } = await listPlatformAuditEvents(db, {
    startDate,
    endDate,
    tenantId: options.tenantId,
    limit: 1000,
  });

  let totalAdministrativeEvents = 0;
  let privilegedActions = 0;
  let failedDeniedOperations = 0;
  let breakGlassActivity = 0;
  let platformAdminLifecycleChanges = 0;
  let permissionChanges = 0;
  let governanceConfigurationChanges = 0;
  let tenantLifecycleChanges = 0;
  let billingChanges = 0;
  let unresolvedSecurityEvents = 0;

  let systemFactsCount = 0;
  let adminActionsCount = 0;
  let automatedActionsCount = 0;
  let securityEventsCount = 0;

  let validCount = 0;
  let invalidCount = 0;
  let unverifiedCount = 0;

  for (const ev of events) {
    if (ev.category === 'ADMIN_ACTION') {
      adminActionsCount++;
      totalAdministrativeEvents++;
    } else if (ev.category === 'AUTOMATED_ACTION') {
      automatedActionsCount++;
    } else if (ev.category === 'SYSTEM_ACTION') {
      systemFactsCount++;
    } else if (ev.category === 'SECURITY_EVENT') {
      securityEventsCount++;
    }

    if (ev.result === 'denied' || ev.result === 'failed') {
      failedDeniedOperations++;
    }

    if (ev.integrityStatus === 'VALID') validCount++;
    else if (ev.integrityStatus === 'INVALID') invalidCount++;
    else unverifiedCount++;

    const actionUpper = ev.action.toUpperCase();
    const moduleUpper = ev.module.toUpperCase();

    if (
      actionUpper.includes('BREAK_GLASS') ||
      actionUpper.includes('ROLE') ||
      actionUpper.includes('CONFIG_PUBLISH') ||
      actionUpper.includes('DELETE') ||
      actionUpper.includes('SUSPEND')
    ) {
      privilegedActions++;
    }

    if (actionUpper.includes('BREAK_GLASS')) breakGlassActivity++;
    if (actionUpper.includes('ADMIN_') || moduleUpper.includes('IDENTITY')) platformAdminLifecycleChanges++;
    if (actionUpper.includes('PERMISSION') || actionUpper.includes('ROLE')) permissionChanges++;
    if (actionUpper.includes('CONFIG') || actionUpper.includes('GOVERNANCE')) governanceConfigurationChanges++;
    if (actionUpper.includes('LIFECYCLE') || moduleUpper.includes('LIFECYCLE')) tenantLifecycleChanges++;
    if (actionUpper.includes('BILLING') || moduleUpper.includes('BILLING')) billingChanges++;

    if (ev.severity === 'critical' && ev.category === 'SECURITY_EVENT' && ev.result !== 'success') {
      unresolvedSecurityEvents++;
    }
  }

  return {
    generatedAt: now.toISOString(),
    reportingPeriod: {
      start: startDate,
      end: endDate,
    },
    totalAdministrativeEvents,
    privilegedActions,
    failedDeniedOperations,
    breakGlassActivity,
    platformAdminLifecycleChanges,
    permissionChanges,
    governanceConfigurationChanges,
    tenantLifecycleChanges,
    billingChanges,
    integrityVerificationResults: {
      verifiedCount: validCount + invalidCount,
      validCount,
      invalidCount,
      unverifiedCount,
    },
    unresolvedSecurityEvents,
    eventCategorization: {
      systemFactsCount,
      adminActionsCount,
      automatedActionsCount,
      securityEventsCount,
    },
    retentionPolicy: {
      auditRetentionDays: 365,
      auditExportEnabled: true,
      integrityVerificationEnabled: true,
      immutableLedgerEnforced: true,
    },
  };
}
