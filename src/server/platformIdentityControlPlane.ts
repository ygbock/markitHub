import crypto from 'node:crypto';
import { createAuthoritativeAuditRecord, recordAuditEvent, updateAuthoritativeSecurityMetrics } from './auditService';
import { ALL_PERMISSION_KEYS, DEFAULT_ROLE_PERMISSIONS } from '../utils/permissions';

export type PlatformRole =
  | 'SUPER_ADMIN'
  | 'PLATFORM_OPERATIONS'
  | 'PLATFORM_BILLING'
  | 'PLATFORM_SUPPORT'
  | 'PLATFORM_SECURITY';

export type PlatformAdminStatus = 'active' | 'suspended';

export type BreakGlassStatus = 'active' | 'expired' | 'revoked';

export const PLATFORM_ROLES: readonly PlatformRole[] = [
  'SUPER_ADMIN',
  'PLATFORM_OPERATIONS',
  'PLATFORM_BILLING',
  'PLATFORM_SUPPORT',
  'PLATFORM_SECURITY',
] as const;

export const PLATFORM_FUNCTIONAL_DOMAINS = [
  'tenants',
  'billing',
  'usage',
  'alerts',
  'notifications',
  'governance',
  'security',
] as const;

export type PlatformFunctionalDomain = typeof PLATFORM_FUNCTIONAL_DOMAINS[number];

export interface BreakGlassAccess {
  id: string;
  elevatedRole: PlatformRole;
  elevatedPermissions: string[];
  reason: string;
  grantedByUid: string;
  grantedByEmail: string;
  grantedByName?: string;
  createdAt: string;
  expiresAt: string;
  status: BreakGlassStatus;
  revokedAt?: string;
  revokedByUid?: string;
  revokedByEmail?: string;
  revokedReason?: string;
}

export interface PlatformAdministrator {
  id: string;
  uid: string;
  email: string;
  name: string;
  phoneNumber?: string;
  department?: string;
  title?: string;
  avatarUrl?: string;
  notes?: string;
  status: PlatformAdminStatus;
  role: PlatformRole;
  delegatedPermissions: string[];
  revokedPermissions?: string[];
  breakGlass?: BreakGlassAccess | null;
  version: number;
  lastLoginAt?: string;
  lastActiveAt?: string;
  lastAction?: string;
  sessionRevokedAt?: string;
  createdAt: string;
  createdByUid: string;
  createdByEmail: string;
  updatedAt: string;
  updatedByUid: string;
  updatedByEmail: string;
}

export interface PlatformPermissionDef {
  key: string;
  domain: PlatformFunctionalDomain;
  label: string;
  description: string;
}

export const PLATFORM_PERMISSIONS: readonly PlatformPermissionDef[] = [
  // Tenants domain
  { key: 'tenants.view', domain: 'tenants', label: 'View Tenants', description: 'View tenant directory, subscription states, and tenant health' },
  { key: 'tenants.manage', domain: 'tenants', label: 'Manage Tenants', description: 'Create and update tenant metadata and organization settings' },
  { key: 'tenants.lifecycle', domain: 'tenants', label: 'Tenant Lifecycle', description: 'Transition tenant lifecycle states (activate, suspend, archive, restore)' },
  { key: 'tenants.delete', domain: 'tenants', label: 'Delete Tenants', description: 'Permanently remove or cancel tenants' },

  // Billing domain
  { key: 'billing.view', domain: 'billing', label: 'View Billing', description: 'View platform revenue, MRR, invoices, and payment states' },
  { key: 'billing.manage', domain: 'billing', label: 'Manage Billing', description: 'Adjust tenant billing subscriptions and process manual charges' },
  { key: 'plans.manage', domain: 'billing', label: 'Manage Plans', description: 'Create, edit, and archive platform subscription plans and pricing' },

  // Usage domain
  { key: 'usage.view', domain: 'usage', label: 'View Usage', description: 'View meter consumption, quota limits, and usage spikes' },
  { key: 'usage.adjust', domain: 'usage', label: 'Adjust Usage', description: 'Override or reset tenant usage quotas and meters' },

  // Alerts domain
  { key: 'alerts.view', domain: 'alerts', label: 'View Alerts', description: 'View platform alerts, risk scores, and active incidents' },
  { key: 'alerts.manage', domain: 'alerts', label: 'Manage Alerts', description: 'Acknowledge, dismiss, or manually trigger platform alerts' },
  { key: 'alerts.resolve', domain: 'alerts', label: 'Resolve Alerts', description: 'Mark critical platform alerts and incidents as resolved' },

  // Notifications domain
  { key: 'notifications.view', domain: 'notifications', label: 'View Notifications', description: 'View platform notifications and escalation queues' },
  { key: 'notifications.manage', domain: 'notifications', label: 'Manage Notifications', description: 'Configure notification preferences and mark as read' },
  { key: 'notifications.escalate', domain: 'notifications', label: 'Escalation Policies', description: 'Configure escalation policies and trigger escalation sweeps' },

  // Governance domain
  { key: 'governance.view', domain: 'governance', label: 'View Governance', description: 'View platform configuration drafts, versions, and policy rules' },
  { key: 'governance.manage', domain: 'governance', label: 'Manage Governance Drafts', description: 'Create and update platform governance configuration drafts' },
  { key: 'governance.publish', domain: 'governance', label: 'Publish Governance', description: 'Publish governance configuration to production and execute rollbacks' },

  // Security domain
  { key: 'security.view', domain: 'security', label: 'View Security Posture', description: 'View security metrics, auth events, and threat monitors' },
  { key: 'admins.view', domain: 'security', label: 'View Platform Admins', description: 'View platform administrator directory and access history' },
  { key: 'admins.manage', domain: 'security', label: 'Manage Platform Admins', description: 'Invite and create platform administrators and edit profiles' },
  { key: 'admins.roles', domain: 'security', label: 'Manage Admin Roles', description: 'Assign, change, or revoke platform roles' },
  { key: 'admins.permissions', domain: 'security', label: 'Manage Granular Permissions', description: 'Grant or revoke fine-grained delegated permissions' },
  { key: 'admins.suspend', domain: 'security', label: 'Suspend / Reactivate Admins', description: 'Suspend or reactivate platform administrator accounts' },
  { key: 'admins.delete', domain: 'security', label: 'Remove Platform Admins', description: 'Remove platform administrator records' },
  { key: 'break_glass.grant', domain: 'security', label: 'Grant Break-Glass Elevation', description: 'Authorize emergency elevated permissions with mandatory TTL' },
  { key: 'break_glass.revoke', domain: 'security', label: 'Revoke Break-Glass Elevation', description: 'Immediately revoke active emergency elevated permissions' },
  { key: 'audit.view', domain: 'security', label: 'View Audit Trail', description: 'Inspect authoritative platform audit trails and telemetry logs' },
] as const;

export const ALL_PLATFORM_PERMISSION_KEYS: string[] = PLATFORM_PERMISSIONS.map(p => p.key);

export const ROLE_DEFAULT_PERMISSIONS: Record<PlatformRole, readonly string[]> = {
  SUPER_ADMIN: ALL_PLATFORM_PERMISSION_KEYS,
  PLATFORM_OPERATIONS: [
    'tenants.view',
    'tenants.manage',
    'tenants.lifecycle',
    'usage.view',
    'alerts.view',
    'alerts.manage',
    'alerts.resolve',
    'notifications.view',
    'notifications.manage',
    'notifications.escalate',
    'governance.view',
    'security.view',
    'admins.view',
    'audit.view',
  ],
  PLATFORM_BILLING: [
    'tenants.view',
    'billing.view',
    'billing.manage',
    'plans.manage',
    'usage.view',
    'governance.view',
    'admins.view',
    'audit.view',
  ],
  PLATFORM_SUPPORT: [
    'tenants.view',
    'usage.view',
    'alerts.view',
    'notifications.view',
    'governance.view',
    'admins.view',
    'audit.view',
  ],
  PLATFORM_SECURITY: [
    'security.view',
    'alerts.view',
    'alerts.manage',
    'alerts.resolve',
    'admins.view',
    'admins.manage',
    'admins.roles',
    'admins.permissions',
    'admins.suspend',
    'break_glass.grant',
    'break_glass.revoke',
    'governance.view',
    'audit.view',
  ],
};

export interface CallerContext {
  uid: string;
  email: string | null;
  name?: string;
  role?: string;
  permissions?: string[];
  platformAdmin?: boolean;
}

export function sanitizeReason(value: unknown, fieldName = 'Reason'): string {
  const str = String(value || '').trim().replace(/<[^>]*>?/gm, '');
  if (!str || str.length < 3) {
    const error: any = new Error(`${fieldName} is mandatory and must be at least 3 characters.`);
    error.statusCode = 400;
    throw error;
  }
  if (str.length > 500) {
    return str.slice(0, 500);
  }
  return str;
}

export function isBreakGlassActive(bg: BreakGlassAccess | null | undefined, now = new Date()): boolean {
  if (!bg) return false;
  if (bg.status !== 'active') return false;
  const expiryTime = new Date(bg.expiresAt).getTime();
  if (isNaN(expiryTime) || expiryTime <= now.getTime()) {
    return false;
  }
  return true;
}

export function computeEffectivePermissions(
  admin: PlatformAdministrator,
  now = new Date()
): string[] {
  // If suspended, zero permissions
  if (admin.status === 'suspended') {
    return [];
  }

  // If session revoked
  if (admin.sessionRevokedAt) {
    const revokedTime = new Date(admin.sessionRevokedAt).getTime();
    if (!isNaN(revokedTime) && revokedTime <= now.getTime()) {
      return [];
    }
  }

  const permissionsSet = new Set<string>();

  // Check break-glass elevation first
  const bgActive = isBreakGlassActive(admin.breakGlass, now);
  if (bgActive && admin.breakGlass) {
    if (admin.breakGlass.elevatedRole === 'SUPER_ADMIN') {
      return [...ALL_PLATFORM_PERMISSION_KEYS];
    }
    const elevatedRoleDefaults = ROLE_DEFAULT_PERMISSIONS[admin.breakGlass.elevatedRole] || [];
    for (const p of elevatedRoleDefaults) permissionsSet.add(p);
    for (const p of (admin.breakGlass.elevatedPermissions || [])) permissionsSet.add(p);
  }

  // Base role
  if (admin.role === 'SUPER_ADMIN') {
    return [...ALL_PLATFORM_PERMISSION_KEYS];
  }

  const basePermissions = ROLE_DEFAULT_PERMISSIONS[admin.role] || [];
  for (const p of basePermissions) {
    permissionsSet.add(p);
  }

  // Add explicit delegated permissions
  for (const p of (admin.delegatedPermissions || [])) {
    if (ALL_PLATFORM_PERMISSION_KEYS.includes(p)) {
      permissionsSet.add(p);
    }
  }

  // Subtract explicit revoked permissions
  for (const p of (admin.revokedPermissions || [])) {
    permissionsSet.delete(p);
  }

  return Array.from(permissionsSet);
}

export function hasPlatformPermission(
  admin: PlatformAdministrator,
  requiredPermission: string,
  now = new Date()
): boolean {
  if (admin.status === 'suspended') return false;
  const effective = computeEffectivePermissions(admin, now);
  return effective.includes(requiredPermission);
}

export function assertNotSelfPrivilegeEscalation(
  callerUid: string,
  targetAdminUid: string,
  action: string
): void {
  if (callerUid && targetAdminUid && callerUid === targetAdminUid) {
    const error: any = new Error(
      `Self-privilege escalation prohibited: administrators cannot ${action} for their own account.`
    );
    error.statusCode = 403;
    throw error;
  }
}

export function assertOptimisticConcurrency(currentVersion: number, expectedVersion?: number): void {
  if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
    const error: any = new Error(
      `Optimistic concurrency conflict: administrator record has been modified by another process (current version: ${currentVersion}, expected: ${expectedVersion}).`
    );
    error.statusCode = 409;
    throw error;
  }
}

export async function assertLastSuperAdminProtection(
  db: any,
  targetAdmin: PlatformAdministrator,
  prospectiveChange: {
    newRole?: PlatformRole;
    newStatus?: PlatformAdminStatus;
    isDeleting?: boolean;
  }
): Promise<void> {
  const isCurrentlyActiveSuperAdmin = targetAdmin.role === 'SUPER_ADMIN' && targetAdmin.status === 'active';
  if (!isCurrentlyActiveSuperAdmin) {
    return;
  }

  const willLoseSuperAdmin =
    prospectiveChange.isDeleting ||
    prospectiveChange.newStatus === 'suspended' ||
    (prospectiveChange.newRole !== undefined && prospectiveChange.newRole !== 'SUPER_ADMIN');

  if (!willLoseSuperAdmin) {
    return;
  }

  // Count active Super Admins
  const snapshot = await db.collection('platform_administrators')
    .where('role', '==', 'SUPER_ADMIN')
    .where('status', '==', 'active')
    .get();

  const activeSuperAdmins = snapshot.docs.filter((d: any) => d.id !== targetAdmin.id);
  if (activeSuperAdmins.length === 0) {
    const error: any = new Error(
      'Last Super Admin protection: cannot demote, suspend, or remove the final active Super Admin on the platform.'
    );
    error.statusCode = 400;
    throw error;
  }
}

export function getRolePermissionMatrix(): {
  domains: typeof PLATFORM_FUNCTIONAL_DOMAINS;
  permissions: readonly PlatformPermissionDef[];
  roles: readonly PlatformRole[];
  roleDefaults: Record<PlatformRole, readonly string[]>;
} {
  return {
    domains: PLATFORM_FUNCTIONAL_DOMAINS,
    permissions: PLATFORM_PERMISSIONS,
    roles: PLATFORM_ROLES,
    roleDefaults: ROLE_DEFAULT_PERMISSIONS,
  };
}

export async function findPlatformAdminByUid(
  db: any,
  uid: string
): Promise<PlatformAdministrator | null> {
  if (!uid || !db) return null;
  // 1. Direct doc lookup by uid
  const docRef = db.collection('platform_administrators').doc(uid);
  const docSnap = await docRef.get();
  if (docSnap.exists) {
    return normalizeAdminDoc(docSnap);
  }

  // 2. Query where uid == uid
  const querySnap = await db.collection('platform_administrators')
    .where('uid', '==', uid)
    .limit(1)
    .get();

  if (!querySnap.empty) {
    return normalizeAdminDoc(querySnap.docs[0]);
  }

  return null;
}

export async function findPlatformAdminByEmail(
  db: any,
  email: string
): Promise<PlatformAdministrator | null> {
  if (!email || !db) return null;
  const cleanEmail = email.trim().toLowerCase();
  const querySnap = await db.collection('platform_administrators')
    .where('email', '==', cleanEmail)
    .limit(1)
    .get();

  if (!querySnap.empty) {
    return normalizeAdminDoc(querySnap.docs[0]);
  }
  return null;
}

export function normalizeAdminDoc(doc: any): PlatformAdministrator {
  const data = doc.data() || {};
  const id = doc.id;
  const now = new Date();

  // Check break-glass expiration auto-detection
  let breakGlass = data.breakGlass || null;
  if (breakGlass && breakGlass.status === 'active') {
    const expiresAt = new Date(breakGlass.expiresAt).getTime();
    if (!isNaN(expiresAt) && expiresAt <= now.getTime()) {
      breakGlass = {
        ...breakGlass,
        status: 'expired',
      };
    }
  }

  return {
    id,
    uid: String(data.uid || id),
    email: String(data.email || '').toLowerCase(),
    name: String(data.name || data.email || id),
    phoneNumber: data.phoneNumber ? String(data.phoneNumber) : undefined,
    department: data.department ? String(data.department) : undefined,
    title: data.title ? String(data.title) : undefined,
    avatarUrl: data.avatarUrl ? String(data.avatarUrl) : undefined,
    notes: data.notes ? String(data.notes) : undefined,
    status: (data.status === 'suspended' ? 'suspended' : 'active') as PlatformAdminStatus,
    role: (PLATFORM_ROLES.includes(data.role) ? data.role : 'PLATFORM_SUPPORT') as PlatformRole,
    delegatedPermissions: Array.isArray(data.delegatedPermissions) ? data.delegatedPermissions : [],
    revokedPermissions: Array.isArray(data.revokedPermissions) ? data.revokedPermissions : [],
    breakGlass,
    version: typeof data.version === 'number' ? data.version : 1,
    lastLoginAt: data.lastLoginAt ? String(data.lastLoginAt) : undefined,
    lastActiveAt: data.lastActiveAt ? String(data.lastActiveAt) : undefined,
    lastAction: data.lastAction ? String(data.lastAction) : undefined,
    sessionRevokedAt: data.sessionRevokedAt ? String(data.sessionRevokedAt) : undefined,
    createdAt: data.createdAt ? String(data.createdAt) : new Date().toISOString(),
    createdByUid: String(data.createdByUid || 'system'),
    createdByEmail: String(data.createdByEmail || 'system@markithub.internal'),
    updatedAt: data.updatedAt ? String(data.updatedAt) : new Date().toISOString(),
    updatedByUid: String(data.updatedByUid || 'system'),
    updatedByEmail: String(data.updatedByEmail || 'system@markithub.internal'),
  };
}

export async function bootstrapInitialSuperAdminIfEmpty(
  db: any,
  caller: CallerContext
): Promise<PlatformAdministrator | null> {
  if (!db || !caller?.uid) return null;

  const existing = await findPlatformAdminByUid(db, caller.uid);
  if (existing) return existing;

  // Check if any active Super Admin exists in the directory
  const snap = await db.collection('platform_administrators')
    .where('role', '==', 'SUPER_ADMIN')
    .where('status', '==', 'active')
    .limit(1)
    .get();

  // If no super admin exists, or caller has platformAdmin === true, bootstrap them!
  const isSuperAdminClaim = caller.platformAdmin === true || caller.role === 'Super Admin' || snap.empty;
  if (!isSuperAdminClaim) return null;

  const now = new Date().toISOString();
  const adminId = caller.uid;
  const initialAdmin: PlatformAdministrator = {
    id: adminId,
    uid: caller.uid,
    email: (caller.email || 'superadmin@markithub.internal').toLowerCase(),
    name: caller.name || caller.email?.split('@')[0] || 'Super Administrator',
    department: 'Platform Architecture',
    title: 'Platform Super Administrator',
    status: 'active',
    role: 'SUPER_ADMIN',
    delegatedPermissions: [...ALL_PLATFORM_PERMISSION_KEYS],
    version: 1,
    lastLoginAt: now,
    lastActiveAt: now,
    lastAction: 'BOOTSTRAP_INITIAL_SUPER_ADMIN',
    createdAt: now,
    createdByUid: 'system',
    createdByEmail: 'system@markithub.internal',
    updatedAt: now,
    updatedByUid: 'system',
    updatedByEmail: 'system@markithub.internal',
  };

  await db.collection('platform_administrators').doc(adminId).set(initialAdmin, { merge: true });

  const auditRecord = createAuthoritativeAuditRecord({
    tenantId: 'platform_administration',
    actorUid: caller.uid,
    actorName: initialAdmin.name,
    actorEmail: initialAdmin.email,
    actorRole: 'SUPER_ADMIN',
    action: 'PLATFORM_ADMIN_CREATED',
    module: 'Platform Identity & Access',
    targetType: 'platform_administrator',
    targetId: adminId,
    targetName: initialAdmin.name,
    newState: { role: 'SUPER_ADMIN', status: 'active', bootstrapped: true },
    result: 'success',
    severity: 'info',
    details: `Initialized root platform Super Administrator for ${initialAdmin.email} (${initialAdmin.uid}).`,
  });

  await recordAuditEvent(db, auditRecord);
  return initialAdmin;
}

export async function listPlatformAdministrators(
  db: any,
  options: {
    status?: string;
    role?: string;
    search?: string;
  } = {}
): Promise<{ administrators: (PlatformAdministrator & { effectivePermissions: string[] })[]; total: number }> {
  if (!db) return { administrators: [], total: 0 };

  const snapshot = await db.collection('platform_administrators').get();
  let list: PlatformAdministrator[] = snapshot.docs.map((doc: any) => normalizeAdminDoc(doc));

  const now = new Date();

  // Status filter
  if (options.status && options.status !== 'all') {
    if (options.status === 'break_glass') {
      list = list.filter(a => isBreakGlassActive(a.breakGlass, now));
    } else {
      list = list.filter(a => a.status === options.status);
    }
  }

  // Role filter
  if (options.role && options.role !== 'all') {
    list = list.filter(a => a.role === options.role);
  }

  // Search filter
  if (options.search) {
    const q = options.search.toLowerCase().trim();
    list = list.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.uid.toLowerCase().includes(q) ||
      (a.department && a.department.toLowerCase().includes(q)) ||
      (a.title && a.title.toLowerCase().includes(q))
    );
  }

  // Sort: active Super Admins first, then by name
  list.sort((a, b) => {
    if (a.role === 'SUPER_ADMIN' && b.role !== 'SUPER_ADMIN') return -1;
    if (a.role !== 'SUPER_ADMIN' && b.role === 'SUPER_ADMIN') return 1;
    return a.name.localeCompare(b.name);
  });

  const enriched = list.map(admin => ({
    ...admin,
    effectivePermissions: computeEffectivePermissions(admin, now),
  }));

  return {
    administrators: enriched,
    total: enriched.length,
  };
}

export async function getPlatformAdministrator(
  db: any,
  adminId: string
): Promise<(PlatformAdministrator & { effectivePermissions: string[] }) | null> {
  if (!db || !adminId) return null;
  const docRef = db.collection('platform_administrators').doc(adminId);
  let snap = await docRef.get();
  if (!snap.exists) {
    // Try by uid
    const query = await db.collection('platform_administrators').where('uid', '==', adminId).limit(1).get();
    if (query.empty) return null;
    snap = query.docs[0];
  }
  const admin = normalizeAdminDoc(snap);
  return {
    ...admin,
    effectivePermissions: computeEffectivePermissions(admin),
  };
}

export interface CreateAdminInput {
  email: string;
  name: string;
  role: PlatformRole;
  uid?: string;
  phoneNumber?: string;
  department?: string;
  title?: string;
  notes?: string;
  delegatedPermissions?: string[];
  justification: string;
}

export async function createPlatformAdministrator(
  db: any,
  caller: CallerContext,
  input: CreateAdminInput
): Promise<PlatformAdministrator> {
  const reason = sanitizeReason(input.justification, 'Administrative Justification');

  const cleanEmail = String(input.email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    const err: any = new Error('A valid administrator email address is required.');
    err.statusCode = 400;
    throw err;
  }

  const cleanName = String(input.name || '').trim();
  if (!cleanName) {
    const err: any = new Error('Administrator name is required.');
    err.statusCode = 400;
    throw err;
  }

  if (!PLATFORM_ROLES.includes(input.role)) {
    const err: any = new Error(`Invalid platform role: '${input.role}'. Allowed: ${PLATFORM_ROLES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  // Check duplicate email
  const existingWithEmail = await findPlatformAdminByEmail(db, cleanEmail);
  if (existingWithEmail) {
    const err: any = new Error(`A platform administrator with email '${cleanEmail}' already exists.`);
    err.statusCode = 409;
    throw err;
  }

  const uid = String(input.uid || '').trim() || `padmin_${crypto.randomUUID()}`;
  const adminId = uid;

  const now = new Date().toISOString();
  const delegatedPermissions = Array.isArray(input.delegatedPermissions)
    ? input.delegatedPermissions.filter(p => ALL_PLATFORM_PERMISSION_KEYS.includes(p))
    : [];

  const newAdmin: PlatformAdministrator = {
    id: adminId,
    uid,
    email: cleanEmail,
    name: cleanName,
    phoneNumber: input.phoneNumber ? String(input.phoneNumber).trim() : undefined,
    department: input.department ? String(input.department).trim() : undefined,
    title: input.title ? String(input.title).trim() : undefined,
    notes: input.notes ? String(input.notes).trim() : undefined,
    status: 'active',
    role: input.role,
    delegatedPermissions,
    version: 1,
    createdAt: now,
    createdByUid: caller.uid,
    createdByEmail: caller.email || 'system',
    updatedAt: now,
    updatedByUid: caller.uid,
    updatedByEmail: caller.email || 'system',
  };

  const auditRecord = createAuthoritativeAuditRecord({
    tenantId: 'platform_administration',
    actorUid: caller.uid,
    actorName: caller.name || caller.email || caller.uid,
    actorEmail: caller.email || null,
    actorRole: caller.role || 'SUPER_ADMIN',
    action: 'PLATFORM_ADMIN_CREATED',
    module: 'Platform Identity & Access',
    targetType: 'platform_administrator',
    targetId: adminId,
    targetName: newAdmin.name,
    newState: {
      role: newAdmin.role,
      status: newAdmin.status,
      email: newAdmin.email,
      delegatedPermissions: newAdmin.delegatedPermissions,
    },
    result: 'success',
    severity: 'info',
    details: `Created platform administrator ${newAdmin.name} (${cleanEmail}) with role ${newAdmin.role}. Justification: ${reason}`,
  });

  const ref = db.collection('platform_administrators').doc(adminId);
  const auditRef = db.collection('audit_logs').doc(auditRecord.id);

  if (typeof db.batch === 'function') {
    const batch = db.batch();
    batch.set(ref, newAdmin);
    batch.set(auditRef, auditRecord);
    await updateAuthoritativeSecurityMetrics(db, auditRecord, batch);
    await batch.commit();
  } else {
    await ref.set(newAdmin);
    await recordAuditEvent(db, auditRecord);
  }

  return newAdmin;
}

export interface UpdateProfileInput {
  name?: string;
  phoneNumber?: string;
  department?: string;
  title?: string;
  notes?: string;
  avatarUrl?: string;
  justification?: string;
  expectedVersion?: number;
}

export async function updatePlatformAdminProfile(
  db: any,
  caller: CallerContext,
  adminId: string,
  input: UpdateProfileInput
): Promise<PlatformAdministrator> {
  const reason = sanitizeReason(input.justification || 'Profile update', 'Justification');

  const ref = db.collection('platform_administrators').doc(adminId);
  const snap = await ref.get();
  if (!snap.exists) {
    const err: any = new Error(`Platform administrator '${adminId}' not found.`);
    err.statusCode = 404;
    throw err;
  }

  const current = normalizeAdminDoc(snap);
  assertOptimisticConcurrency(current.version, input.expectedVersion);

  const now = new Date().toISOString();
  const updated: PlatformAdministrator = {
    ...current,
    name: input.name !== undefined ? String(input.name).trim() : current.name,
    phoneNumber: input.phoneNumber !== undefined ? String(input.phoneNumber).trim() : current.phoneNumber,
    department: input.department !== undefined ? String(input.department).trim() : current.department,
    title: input.title !== undefined ? String(input.title).trim() : current.title,
    notes: input.notes !== undefined ? String(input.notes).trim() : current.notes,
    avatarUrl: input.avatarUrl !== undefined ? String(input.avatarUrl).trim() : current.avatarUrl,
    version: current.version + 1,
    updatedAt: now,
    updatedByUid: caller.uid,
    updatedByEmail: caller.email || 'system',
  };

  const auditRecord = createAuthoritativeAuditRecord({
    tenantId: 'platform_administration',
    actorUid: caller.uid,
    actorName: caller.name || caller.email || caller.uid,
    actorEmail: caller.email || null,
    actorRole: caller.role || 'SUPER_ADMIN',
    action: 'PLATFORM_ADMIN_ROLE_CHANGED',
    module: 'Platform Identity & Access',
    targetType: 'platform_administrator',
    targetId: adminId,
    targetName: updated.name,
    previousState: { name: current.name, department: current.department, title: current.title },
    newState: { name: updated.name, department: updated.department, title: updated.title },
    result: 'success',
    severity: 'info',
    details: `Updated profile details for administrator ${updated.name}. Reason: ${reason}`,
  });

  const auditRef = db.collection('audit_logs').doc(auditRecord.id);
  if (typeof db.batch === 'function') {
    const batch = db.batch();
    batch.set(ref, updated, { merge: true });
    batch.set(auditRef, auditRecord);
    await updateAuthoritativeSecurityMetrics(db, auditRecord, batch);
    await batch.commit();
  } else {
    await ref.set(updated, { merge: true });
    await recordAuditEvent(db, auditRecord);
  }

  return updated;
}

export async function assignPlatformAdminRole(
  db: any,
  caller: CallerContext,
  adminId: string,
  newRole: PlatformRole,
  justification: string,
  expectedVersion?: number
): Promise<PlatformAdministrator> {
  const reason = sanitizeReason(justification, 'Administrative Justification');

  if (!PLATFORM_ROLES.includes(newRole)) {
    const err: any = new Error(`Invalid platform role: '${newRole}'. Allowed: ${PLATFORM_ROLES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const ref = db.collection('platform_administrators').doc(adminId);
  const snap = await ref.get();
  if (!snap.exists) {
    const err: any = new Error(`Platform administrator '${adminId}' not found.`);
    err.statusCode = 404;
    throw err;
  }

  const current = normalizeAdminDoc(snap);
  assertOptimisticConcurrency(current.version, expectedVersion);

  // Self-privilege protection
  assertNotSelfPrivilegeEscalation(caller.uid, current.uid, 'change platform role');

  // Last-Super-Admin protection
  await assertLastSuperAdminProtection(db, current, { newRole });

  const now = new Date().toISOString();
  const updated: PlatformAdministrator = {
    ...current,
    role: newRole,
    version: current.version + 1,
    updatedAt: now,
    updatedByUid: caller.uid,
    updatedByEmail: caller.email || 'system',
  };

  const auditRecord = createAuthoritativeAuditRecord({
    tenantId: 'platform_administration',
    actorUid: caller.uid,
    actorName: caller.name || caller.email || caller.uid,
    actorEmail: caller.email || null,
    actorRole: caller.role || 'SUPER_ADMIN',
    action: 'PLATFORM_ADMIN_ROLE_CHANGED',
    module: 'Platform Identity & Access',
    targetType: 'platform_administrator',
    targetId: adminId,
    targetName: current.name,
    previousState: { role: current.role },
    newState: { role: newRole },
    result: 'success',
    severity: newRole === 'SUPER_ADMIN' ? 'warning' : 'info',
    details: `Changed platform role for ${current.name} from ${current.role} to ${newRole}. Justification: ${reason}`,
  });

  const auditRef = db.collection('audit_logs').doc(auditRecord.id);
  if (typeof db.batch === 'function') {
    const batch = db.batch();
    batch.set(ref, updated, { merge: true });
    batch.set(auditRef, auditRecord);
    await updateAuthoritativeSecurityMetrics(db, auditRecord, batch);
    await batch.commit();
  } else {
    await ref.set(updated, { merge: true });
    await recordAuditEvent(db, auditRecord);
  }

  return updated;
}

export async function updatePlatformAdminPermissions(
  db: any,
  caller: CallerContext,
  adminId: string,
  delegatedPermissions: string[],
  justification: string,
  expectedVersion?: number
): Promise<PlatformAdministrator> {
  const reason = sanitizeReason(justification, 'Administrative Justification');

  const ref = db.collection('platform_administrators').doc(adminId);
  const snap = await ref.get();
  if (!snap.exists) {
    const err: any = new Error(`Platform administrator '${adminId}' not found.`);
    err.statusCode = 404;
    throw err;
  }

  const current = normalizeAdminDoc(snap);
  assertOptimisticConcurrency(current.version, expectedVersion);

  // Self-privilege protection
  assertNotSelfPrivilegeEscalation(caller.uid, current.uid, 'grant or revoke fine-grained permissions');

  // Validate permission keys
  const validDelegated = (Array.isArray(delegatedPermissions) ? delegatedPermissions : [])
    .filter(p => ALL_PLATFORM_PERMISSION_KEYS.includes(p));

  const previousPermissions = current.delegatedPermissions || [];
  const added = validDelegated.filter(p => !previousPermissions.includes(p));
  const removed = previousPermissions.filter(p => !validDelegated.includes(p));

  const actionType = added.length > 0 ? 'PLATFORM_PERMISSION_GRANTED' : 'PLATFORM_PERMISSION_REVOKED';

  const now = new Date().toISOString();
  const updated: PlatformAdministrator = {
    ...current,
    delegatedPermissions: validDelegated,
    version: current.version + 1,
    updatedAt: now,
    updatedByUid: caller.uid,
    updatedByEmail: caller.email || 'system',
  };

  const auditRecord = createAuthoritativeAuditRecord({
    tenantId: 'platform_administration',
    actorUid: caller.uid,
    actorName: caller.name || caller.email || caller.uid,
    actorEmail: caller.email || null,
    actorRole: caller.role || 'SUPER_ADMIN',
    action: actionType,
    module: 'Platform Identity & Access',
    targetType: 'platform_administrator',
    targetId: adminId,
    targetName: current.name,
    previousState: { delegatedPermissions: previousPermissions },
    newState: { delegatedPermissions: validDelegated, added, removed },
    result: 'success',
    severity: 'warning',
    details: `Updated fine-grained delegated permissions for ${current.name}. Added: [${added.join(', ') || 'none'}], Removed: [${removed.join(', ') || 'none'}]. Justification: ${reason}`,
  });

  const auditRef = db.collection('audit_logs').doc(auditRecord.id);
  if (typeof db.batch === 'function') {
    const batch = db.batch();
    batch.set(ref, updated, { merge: true });
    batch.set(auditRef, auditRecord);
    await updateAuthoritativeSecurityMetrics(db, auditRecord, batch);
    await batch.commit();
  } else {
    await ref.set(updated, { merge: true });
    await recordAuditEvent(db, auditRecord);
  }

  return updated;
}

export async function updatePlatformAdminStatus(
  db: any,
  caller: CallerContext,
  adminId: string,
  newStatus: PlatformAdminStatus,
  justification: string,
  expectedVersion?: number
): Promise<PlatformAdministrator> {
  const reason = sanitizeReason(justification, 'Administrative Justification');

  if (newStatus !== 'active' && newStatus !== 'suspended') {
    const err: any = new Error("Platform admin status must be 'active' or 'suspended'.");
    err.statusCode = 400;
    throw err;
  }

  const ref = db.collection('platform_administrators').doc(adminId);
  const snap = await ref.get();
  if (!snap.exists) {
    const err: any = new Error(`Platform administrator '${adminId}' not found.`);
    err.statusCode = 404;
    throw err;
  }

  const current = normalizeAdminDoc(snap);
  assertOptimisticConcurrency(current.version, expectedVersion);

  // Self-privilege protection
  assertNotSelfPrivilegeEscalation(caller.uid, current.uid, `${newStatus === 'suspended' ? 'suspend' : 'reactivate'} account`);

  // Last-Super-Admin protection
  await assertLastSuperAdminProtection(db, current, { newStatus });

  const now = new Date().toISOString();
  const updated: PlatformAdministrator = {
    ...current,
    status: newStatus,
    sessionRevokedAt: newStatus === 'suspended' ? now : undefined,
    version: current.version + 1,
    updatedAt: now,
    updatedByUid: caller.uid,
    updatedByEmail: caller.email || 'system',
  };

  const actionName = newStatus === 'suspended' ? 'PLATFORM_ADMIN_SUSPENDED' : 'PLATFORM_ADMIN_REACTIVATED';

  const auditRecord = createAuthoritativeAuditRecord({
    tenantId: 'platform_administration',
    actorUid: caller.uid,
    actorName: caller.name || caller.email || caller.uid,
    actorEmail: caller.email || null,
    actorRole: caller.role || 'SUPER_ADMIN',
    action: actionName,
    module: 'Platform Identity & Access',
    targetType: 'platform_administrator',
    targetId: adminId,
    targetName: current.name,
    previousState: { status: current.status },
    newState: { status: newStatus },
    result: 'success',
    severity: newStatus === 'suspended' ? 'warning' : 'info',
    details: `${newStatus === 'suspended' ? 'Suspended' : 'Reactivated'} platform administrator ${current.name} (${current.email}). Justification: ${reason}`,
  });

  const auditRef = db.collection('audit_logs').doc(auditRecord.id);
  if (typeof db.batch === 'function') {
    const batch = db.batch();
    batch.set(ref, updated, { merge: true });
    batch.set(auditRef, auditRecord);
    await updateAuthoritativeSecurityMetrics(db, auditRecord, batch);
    await batch.commit();
  } else {
    await ref.set(updated, { merge: true });
    await recordAuditEvent(db, auditRecord);
  }

  return updated;
}

export async function deletePlatformAdministrator(
  db: any,
  caller: CallerContext,
  adminId: string,
  justification: string,
  expectedVersion?: number
): Promise<{ success: boolean; deletedAdminId: string }> {
  const reason = sanitizeReason(justification, 'Administrative Justification');

  const ref = db.collection('platform_administrators').doc(adminId);
  const snap = await ref.get();
  if (!snap.exists) {
    const err: any = new Error(`Platform administrator '${adminId}' not found.`);
    err.statusCode = 404;
    throw err;
  }

  const current = normalizeAdminDoc(snap);
  assertOptimisticConcurrency(current.version, expectedVersion);

  // Self-privilege protection
  assertNotSelfPrivilegeEscalation(caller.uid, current.uid, 'delete platform administrator account');

  // Last-Super-Admin protection
  await assertLastSuperAdminProtection(db, current, { isDeleting: true });

  const auditRecord = createAuthoritativeAuditRecord({
    tenantId: 'platform_administration',
    actorUid: caller.uid,
    actorName: caller.name || caller.email || caller.uid,
    actorEmail: caller.email || null,
    actorRole: caller.role || 'SUPER_ADMIN',
    action: 'PLATFORM_ADMIN_ROLE_CHANGED',
    module: 'Platform Identity & Access',
    targetType: 'platform_administrator',
    targetId: adminId,
    targetName: current.name,
    previousState: { role: current.role, status: current.status, email: current.email },
    newState: { deleted: true },
    result: 'success',
    severity: 'warning',
    details: `Deleted platform administrator ${current.name} (${current.email}). Justification: ${reason}`,
  });

  const auditRef = db.collection('audit_logs').doc(auditRecord.id);
  if (typeof db.batch === 'function') {
    const batch = db.batch();
    batch.delete(ref);
    batch.set(auditRef, auditRecord);
    await updateAuthoritativeSecurityMetrics(db, auditRecord, batch);
    await batch.commit();
  } else {
    await ref.delete();
    await recordAuditEvent(db, auditRecord);
  }

  return { success: true, deletedAdminId: adminId };
}

export interface BreakGlassInput {
  elevatedRole?: PlatformRole;
  elevatedPermissions?: string[];
  durationMinutes: number; // 15 to 1440 (24h)
  justification: string;
  expectedVersion?: number;
}

export async function grantBreakGlassElevation(
  db: any,
  caller: CallerContext,
  adminId: string,
  input: BreakGlassInput
): Promise<PlatformAdministrator> {
  const reason = sanitizeReason(input.justification, 'Break-Glass Emergency Justification');

  const durationMin = Math.max(15, Math.min(1440, Number(input.durationMinutes) || 120));

  const ref = db.collection('platform_administrators').doc(adminId);
  const snap = await ref.get();
  if (!snap.exists) {
    const err: any = new Error(`Platform administrator '${adminId}' not found.`);
    err.statusCode = 404;
    throw err;
  }

  const current = normalizeAdminDoc(snap);
  assertOptimisticConcurrency(current.version, input.expectedVersion);

  if (current.status === 'suspended') {
    const err: any = new Error('Cannot grant break-glass elevation to a suspended platform administrator.');
    err.statusCode = 400;
    throw err;
  }

  // Self-privilege protection: an administrator cannot grant break-glass elevation to themselves
  assertNotSelfPrivilegeEscalation(caller.uid, current.uid, 'grant emergency break-glass elevation');

  const elevatedRole: PlatformRole = input.elevatedRole && PLATFORM_ROLES.includes(input.elevatedRole)
    ? input.elevatedRole
    : 'SUPER_ADMIN';

  const elevatedPermissions = Array.isArray(input.elevatedPermissions)
    ? input.elevatedPermissions.filter(p => ALL_PLATFORM_PERMISSION_KEYS.includes(p))
    : [];

  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + durationMin * 60 * 1000).toISOString();

  const breakGlass: BreakGlassAccess = {
    id: `bg_${crypto.randomUUID()}`,
    elevatedRole,
    elevatedPermissions,
    reason,
    grantedByUid: caller.uid,
    grantedByEmail: caller.email || 'system',
    grantedByName: caller.name || caller.email || caller.uid,
    createdAt,
    expiresAt,
    status: 'active',
  };

  const updated: PlatformAdministrator = {
    ...current,
    breakGlass,
    version: current.version + 1,
    updatedAt: createdAt,
    updatedByUid: caller.uid,
    updatedByEmail: caller.email || 'system',
  };

  const auditRecord = createAuthoritativeAuditRecord({
    tenantId: 'platform_administration',
    actorUid: caller.uid,
    actorName: caller.name || caller.email || caller.uid,
    actorEmail: caller.email || null,
    actorRole: caller.role || 'SUPER_ADMIN',
    action: 'BREAK_GLASS_GRANTED',
    module: 'Platform Identity & Access',
    targetType: 'platform_administrator',
    targetId: adminId,
    targetName: current.name,
    newState: {
      breakGlassId: breakGlass.id,
      elevatedRole: breakGlass.elevatedRole,
      elevatedPermissions: breakGlass.elevatedPermissions,
      expiresAt: breakGlass.expiresAt,
      durationMinutes: durationMin,
    },
    result: 'success',
    severity: 'critical',
    details: `Emergency break-glass elevation granted to ${current.name} until ${expiresAt} (${durationMin} min). Elevated role: ${elevatedRole}. Reason: ${reason}`,
  });

  const auditRef = db.collection('audit_logs').doc(auditRecord.id);
  if (typeof db.batch === 'function') {
    const batch = db.batch();
    batch.set(ref, updated, { merge: true });
    batch.set(auditRef, auditRecord);
    await updateAuthoritativeSecurityMetrics(db, auditRecord, batch);
    await batch.commit();
  } else {
    await ref.set(updated, { merge: true });
    await recordAuditEvent(db, auditRecord);
  }

  return updated;
}

export async function revokeBreakGlassElevation(
  db: any,
  caller: CallerContext,
  adminId: string,
  justification: string,
  expectedVersion?: number
): Promise<PlatformAdministrator> {
  const reason = sanitizeReason(justification, 'Revocation Justification');

  const ref = db.collection('platform_administrators').doc(adminId);
  const snap = await ref.get();
  if (!snap.exists) {
    const err: any = new Error(`Platform administrator '${adminId}' not found.`);
    err.statusCode = 404;
    throw err;
  }

  const current = normalizeAdminDoc(snap);
  assertOptimisticConcurrency(current.version, expectedVersion);

  if (!current.breakGlass || current.breakGlass.status !== 'active') {
    const err: any = new Error(`Administrator '${current.name}' does not have an active break-glass elevation.`);
    err.statusCode = 400;
    throw err;
  }

  const now = new Date().toISOString();
  const updatedBreakGlass: BreakGlassAccess = {
    ...current.breakGlass,
    status: 'revoked',
    revokedAt: now,
    revokedByUid: caller.uid,
    revokedByEmail: caller.email || 'system',
    revokedReason: reason,
  };

  const updated: PlatformAdministrator = {
    ...current,
    breakGlass: updatedBreakGlass,
    version: current.version + 1,
    updatedAt: now,
    updatedByUid: caller.uid,
    updatedByEmail: caller.email || 'system',
  };

  const auditRecord = createAuthoritativeAuditRecord({
    tenantId: 'platform_administration',
    actorUid: caller.uid,
    actorName: caller.name || caller.email || caller.uid,
    actorEmail: caller.email || null,
    actorRole: caller.role || 'SUPER_ADMIN',
    action: 'BREAK_GLASS_REVOKED',
    module: 'Platform Identity & Access',
    targetType: 'platform_administrator',
    targetId: adminId,
    targetName: current.name,
    previousState: { breakGlassId: current.breakGlass.id, expiresAt: current.breakGlass.expiresAt },
    newState: { breakGlassId: current.breakGlass.id, status: 'revoked' },
    result: 'success',
    severity: 'warning',
    details: `Revoked emergency break-glass elevation for ${current.name}. Reason: ${reason}`,
  });

  const auditRef = db.collection('audit_logs').doc(auditRecord.id);
  if (typeof db.batch === 'function') {
    const batch = db.batch();
    batch.set(ref, updated, { merge: true });
    batch.set(auditRef, auditRecord);
    await updateAuthoritativeSecurityMetrics(db, auditRecord, batch);
    await batch.commit();
  } else {
    await ref.set(updated, { merge: true });
    await recordAuditEvent(db, auditRecord);
  }

  return updated;
}

export async function sweepExpiredBreakGlass(db: any): Promise<number> {
  if (!db) return 0;
  try {
    const now = new Date();
    const snapshot = await db.collection('platform_administrators').get();
    let expiredCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data() || {};
      const bg = data.breakGlass;
      if (bg && bg.status === 'active') {
        const expiresAt = new Date(bg.expiresAt).getTime();
        if (!isNaN(expiresAt) && expiresAt <= now.getTime()) {
          const updatedBreakGlass: BreakGlassAccess = {
            ...bg,
            status: 'expired',
          };

          const auditRecord = createAuthoritativeAuditRecord({
            tenantId: 'platform_administration',
            actorUid: 'system',
            actorName: 'Platform Security Scheduler',
            actorRole: 'SYSTEM',
            action: 'BREAK_GLASS_EXPIRED',
            module: 'Platform Identity & Access',
            targetType: 'platform_administrator',
            targetId: doc.id,
            targetName: data.name || doc.id,
            previousState: { status: 'active', expiresAt: bg.expiresAt },
            newState: { status: 'expired' },
            result: 'success',
            severity: 'info',
            details: `Emergency break-glass elevation automatically expired for ${data.name || doc.id} (expired at ${bg.expiresAt}).`,
          });

          if (typeof db.batch === 'function') {
            const batch = db.batch();
            batch.set(doc.ref, { breakGlass: updatedBreakGlass, updatedAt: now.toISOString() }, { merge: true });
            batch.set(db.collection('audit_logs').doc(auditRecord.id), auditRecord);
            await batch.commit();
          } else {
            await doc.ref.set({ breakGlass: updatedBreakGlass, updatedAt: now.toISOString() }, { merge: true });
            await recordAuditEvent(db, auditRecord);
          }
          expiredCount++;
        }
      }
    }
    return expiredCount;
  } catch (err) {
    console.error('Error sweeping expired break-glass access:', err);
    return 0;
  }
}

export async function getAdministratorActivityHistory(
  db: any,
  adminId: string,
  limitCount = 50
): Promise<any[]> {
  if (!db || !adminId) return [];
  try {
    const byTarget = await db.collection('audit_logs')
      .where('targetId', '==', adminId)
      .limit(limitCount)
      .get();

    const byActor = await db.collection('audit_logs')
      .where('actorUid', '==', adminId)
      .limit(limitCount)
      .get();

    const allDocs = [...byTarget.docs, ...byActor.docs];
    const seen = new Set<string>();
    const uniqueRecords: any[] = [];

    for (const doc of allDocs) {
      if (!seen.has(doc.id)) {
        seen.add(doc.id);
        uniqueRecords.push({ id: doc.id, ...doc.data() });
      }
    }

    uniqueRecords.sort((a, b) => {
      const tA = new Date(a.timestamp || 0).getTime();
      const tB = new Date(b.timestamp || 0).getTime();
      return tB - tA;
    });

    return uniqueRecords.slice(0, limitCount);
  } catch (err) {
    console.error('Error fetching admin activity history:', err);
    return [];
  }
}
