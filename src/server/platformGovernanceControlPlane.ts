import crypto from 'node:crypto';
import { createAuthoritativeAuditRecord, recordAuditEvent } from './auditService';
import { DEFAULT_PLATFORM_PLANS, type PlatformPlan } from './platformAdminControlPlane';

export type ConfigLifecycleStatus = 'draft' | 'validated' | 'published' | 'rolled_back';

export interface PlatformGlobalSettings {
  platformName: string;
  supportEmail: string;
  maintenanceMode: boolean;
  allowTenantRegistration: boolean;
  sessionTimeoutMinutes: number;
  maxStaffPerTenantDefault: number;
}

export interface PlatformBillingDefaults {
  currency: string;
  defaultTrialDays: number;
  gracePeriodDays: number;
  enforceHardUsageLimits: boolean;
  taxRatePercent: number;
  allowSelfServeUpgrades: boolean;
}

export interface PlatformUsageThresholds {
  usageApproachingThresholdPercent: number; // 40-99
  usageViolationThresholdPercent: number; // >= approaching, <= 200
}

export interface PlatformAlertThresholds {
  provisioningDelayMinutes: number; // 1-1440
  unacknowledgedAlertEscalationMinutes: number; // 1-1440
  healthRiskScoreThreshold: number; // 10-90
  autoResolveResolvedConditions: boolean;
  warningOrdersUsagePercent?: number;
  criticalOrdersUsagePercent?: number;
  degradedHealthScoreThreshold?: number;
}

export interface PlatformSchedulerPolicy {
  healthSweepIntervalMs: number; // >= 10000
  escalationSweepIntervalMs: number; // >= 10000
  notificationSweepIntervalMs: number; // >= 5000
  distributedLockLeaseMs: number; // >= 15000
  enabled: boolean;
}

export interface PlatformFeatureFlags {
  enableAutomatedHealthEvaluation: boolean;
  enableSlaEscalations: boolean;
  enableNotificationDispatch: boolean;
  enableSelfServeUpgrades: boolean;
  enableMultiCurrency: boolean;
  enableAdvancedAnalytics: boolean;
  [key: string]: boolean;
}

export interface PlatformGovernanceConfig {
  version: number;
  status: ConfigLifecycleStatus;
  globalSettings: PlatformGlobalSettings;
  plans: PlatformPlan[];
  billingDefaults: PlatformBillingDefaults;
  usageThresholds: PlatformUsageThresholds;
  alertThresholds: PlatformAlertThresholds;
  schedulerPolicy: PlatformSchedulerPolicy;
  featureFlags: PlatformFeatureFlags;
  createdAt: string;
  createdBy: string;
  publishedAt?: string;
  publishedBy?: string;
  justification: string;
  previousVersion?: number | null;
  rolledBackFromVersion?: number;
}

export interface PlatformDraftConfig {
  config: PlatformGovernanceConfig;
  status: 'draft' | 'validated';
  lastModifiedAt: string;
  lastModifiedBy: string;
  validationErrors: string[];
  validationWarnings: string[];
}

export interface PlatformConfigVersionSummary {
  version: number;
  status: ConfigLifecycleStatus;
  createdAt: string;
  createdBy: string;
  justification: string;
  previousVersion: number | null;
  rolledBackFromVersion?: number;
  changedCategories: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export const CONFIG_COLLECTION = 'platform_governance_config';
export const CONFIG_DOC_ID = 'current';
export const CONFIG_VERSIONS_COLLECTION = 'platform_config_versions';

export const DEFAULT_PLATFORM_GOVERNANCE_CONFIG: PlatformGovernanceConfig = {
  version: 1,
  status: 'published',
  globalSettings: {
    platformName: 'MarkitHub Platform',
    supportEmail: 'support@markithub.internal',
    maintenanceMode: false,
    allowTenantRegistration: true,
    sessionTimeoutMinutes: 60,
    maxStaffPerTenantDefault: 20,
  },
  plans: DEFAULT_PLATFORM_PLANS.map((p) => ({
    ...p,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  })),
  billingDefaults: {
    currency: 'USD',
    defaultTrialDays: 14,
    gracePeriodDays: 7,
    enforceHardUsageLimits: false,
    taxRatePercent: 0,
    allowSelfServeUpgrades: true,
  },
  usageThresholds: {
    usageApproachingThresholdPercent: 80,
    usageViolationThresholdPercent: 100,
  },
  alertThresholds: {
    provisioningDelayMinutes: 15,
    unacknowledgedAlertEscalationMinutes: 60,
    healthRiskScoreThreshold: 60,
    autoResolveResolvedConditions: true,
    warningOrdersUsagePercent: 80,
    criticalOrdersUsagePercent: 100,
  },
  schedulerPolicy: {
    healthSweepIntervalMs: 300000,
    escalationSweepIntervalMs: 600000,
    notificationSweepIntervalMs: 60000,
    distributedLockLeaseMs: 120000,
    enabled: true,
  },
  featureFlags: {
    enableAutomatedHealthEvaluation: true,
    enableSlaEscalations: true,
    enableNotificationDispatch: true,
    enableSelfServeUpgrades: true,
    enableMultiCurrency: false,
    enableAdvancedAnalytics: true,
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  createdBy: 'system.bootstrap@markithub.internal',
  publishedAt: '2026-01-01T00:00:00.000Z',
  publishedBy: 'system.bootstrap@markithub.internal',
  justification: 'Authoritative bootstrap configuration baseline.',
  previousVersion: null,
};

export function buildDefaultPlatformConfig(version = 1, status: ConfigLifecycleStatus = 'published'): PlatformGovernanceConfig {
  return JSON.parse(JSON.stringify({
    ...DEFAULT_PLATFORM_GOVERNANCE_CONFIG,
    version,
    status,
  }));
}

const SECRET_PATTERNS = [
  /sk[_-]live[_-][0-9a-zA-Z]{16,}/i,
  /sk[_-]test[_-][0-9a-zA-Z]{16,}/i,
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/,
  /AIza[0-9A-Za-z-_]{35}/,
  /Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+/,
];

function checkForSecrets(val: unknown, path = ''): string[] {
  const leaks: string[] = [];
  if (val === null || val === undefined) return leaks;

  if (typeof val === 'string') {
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(val)) {
        leaks.push(`Potential secret credential or token pattern detected at "${path || 'value'}"`);
        break;
      }
    }
  } else if (Array.isArray(val)) {
    val.forEach((item, idx) => {
      leaks.push(...checkForSecrets(item, `${path}[${idx}]`));
    });
  } else if (typeof val === 'object') {
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      const lowerKey = k.toLowerCase();
      if (['secret', 'password', 'token', 'key', 'credential', 'privatekey'].some(s => lowerKey === s)) {
        leaks.push(`Forbidden sensitive property key "${path ? `${path}.${k}` : k}"`);
      }
      leaks.push(...checkForSecrets(v, path ? `${path}.${k}` : k));
    }
  }
  return leaks;
}

/**
 * Validates a complete or partial platform configuration candidate.
 */
export function validatePlatformConfig(candidate: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!candidate || typeof candidate !== 'object') {
    return { valid: false, errors: ['Configuration payload must be a non-null object.'], warnings };
  }

  const c = candidate as Partial<PlatformGovernanceConfig>;

  // Secret leak detection
  const secretLeaks = checkForSecrets(candidate);
  if (secretLeaks.length > 0) {
    errors.push(...secretLeaks);
  }

  // 1. Global Settings
  if (!c.globalSettings || typeof c.globalSettings !== 'object') {
    errors.push('globalSettings is required and must be an object.');
  } else {
    const gs = c.globalSettings;
    if (!gs.platformName || typeof gs.platformName !== 'string' || gs.platformName.trim().length < 2) {
      errors.push('globalSettings.platformName must be at least 2 characters.');
    } else if (gs.platformName.length > 100) {
      errors.push('globalSettings.platformName must not exceed 100 characters.');
    }

    if (!gs.supportEmail || typeof gs.supportEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gs.supportEmail.trim())) {
      errors.push('globalSettings.supportEmail must be a valid email address.');
    }

    if (typeof gs.maintenanceMode !== 'boolean') {
      errors.push('globalSettings.maintenanceMode must be a boolean.');
    } else if (gs.maintenanceMode) {
      warnings.push('Maintenance mode is active; tenant storefront and checkout traffic will be restricted.');
    }

    if (typeof gs.allowTenantRegistration !== 'boolean') {
      errors.push('globalSettings.allowTenantRegistration must be a boolean.');
    }

    if (
      typeof gs.sessionTimeoutMinutes !== 'number' ||
      !Number.isInteger(gs.sessionTimeoutMinutes) ||
      gs.sessionTimeoutMinutes < 5 ||
      gs.sessionTimeoutMinutes > 1440
    ) {
      errors.push('globalSettings.sessionTimeoutMinutes must be an integer between 5 and 1440 (24 hours).');
    }

    if (
      typeof gs.maxStaffPerTenantDefault !== 'number' ||
      !Number.isInteger(gs.maxStaffPerTenantDefault) ||
      gs.maxStaffPerTenantDefault < 1 ||
      gs.maxStaffPerTenantDefault > 1000
    ) {
      errors.push('globalSettings.maxStaffPerTenantDefault must be an integer between 1 and 1000.');
    }
  }

  // 2. Plans
  if (!c.plans || !Array.isArray(c.plans) || c.plans.length === 0) {
    errors.push('At least one subscription plan must be defined in plans.');
  } else {
    const planIds = new Set<string>();
    let activePlanCount = 0;

    c.plans.forEach((plan, idx) => {
      const planPrefix = `plans[${idx}]`;
      if (!plan || typeof plan !== 'object') {
        errors.push(`${planPrefix} must be a plan object.`);
        return;
      }

      if (!plan.id || typeof plan.id !== 'string' || !/^[a-z0-9_-]{2,32}$/.test(plan.id)) {
        errors.push(`${planPrefix}.id must be a slug between 2-32 lowercase alphanumeric characters.`);
      } else if (planIds.has(plan.id)) {
        errors.push(`Duplicate plan ID: "${plan.id}".`);
      } else {
        planIds.add(plan.id);
      }

      if (!plan.name || typeof plan.name !== 'string' || plan.name.trim().length < 2) {
        errors.push(`${planPrefix}.name must be at least 2 characters.`);
      }

      if (typeof plan.monthlyPrice !== 'number' || plan.monthlyPrice < 0) {
        errors.push(`${planPrefix}.monthlyPrice must be a non-negative number.`);
      }

      if (typeof plan.annualPrice !== 'number' || plan.annualPrice < 0) {
        errors.push(`${planPrefix}.annualPrice must be a non-negative number.`);
      }

      if (plan.monthlyPrice > 0 && plan.annualPrice > plan.monthlyPrice * 12) {
        warnings.push(`Plan "${plan.name}" annual price exceeds 12x monthly price (no annual discount applied).`);
      }

      if (!plan.limits || typeof plan.limits !== 'object') {
        errors.push(`${planPrefix}.limits must be an object with products, ordersMonthly, and storageGb.`);
      } else {
        if (typeof plan.limits.products !== 'number' || plan.limits.products <= 0) {
          errors.push(`${planPrefix}.limits.products must be a positive integer.`);
        }
        if (typeof plan.limits.ordersMonthly !== 'number' || plan.limits.ordersMonthly <= 0) {
          errors.push(`${planPrefix}.limits.ordersMonthly must be a positive integer.`);
        }
        if (typeof plan.limits.storageGb !== 'number' || plan.limits.storageGb <= 0) {
          errors.push(`${planPrefix}.limits.storageGb must be a positive number.`);
        }
      }

      if (plan.status === 'active') {
        activePlanCount++;
      }
    });

    if (activePlanCount === 0) {
      errors.push('At least one plan must have status="active".');
    }
  }

  // 3. Billing Defaults
  if (!c.billingDefaults || typeof c.billingDefaults !== 'object') {
    errors.push('billingDefaults is required and must be an object.');
  } else {
    const bd = c.billingDefaults;
    if (!bd.currency || typeof bd.currency !== 'string' || bd.currency.trim().length !== 3) {
      errors.push('billingDefaults.currency must be a 3-letter ISO currency code (e.g. USD).');
    }

    if (
      typeof bd.defaultTrialDays !== 'number' ||
      !Number.isInteger(bd.defaultTrialDays) ||
      bd.defaultTrialDays < 0 ||
      bd.defaultTrialDays > 365
    ) {
      errors.push('billingDefaults.defaultTrialDays must be an integer between 0 and 365.');
    }

    if (
      typeof bd.gracePeriodDays !== 'number' ||
      !Number.isInteger(bd.gracePeriodDays) ||
      bd.gracePeriodDays < 0 ||
      bd.gracePeriodDays > 90
    ) {
      errors.push('billingDefaults.gracePeriodDays must be an integer between 0 and 90.');
    }

    if (
      typeof bd.taxRatePercent !== 'number' ||
      bd.taxRatePercent < 0 ||
      bd.taxRatePercent > 100
    ) {
      errors.push('billingDefaults.taxRatePercent must be a number between 0 and 100.');
    }

    if (typeof bd.enforceHardUsageLimits !== 'boolean') {
      errors.push('billingDefaults.enforceHardUsageLimits must be a boolean.');
    } else if (bd.enforceHardUsageLimits) {
      warnings.push('Hard usage enforcement is enabled: tenants exceeding limits will be blocked from creating orders/products.');
    }
  }

  // 4. Usage Thresholds
  if (!c.usageThresholds || typeof c.usageThresholds !== 'object') {
    errors.push('usageThresholds is required and must be an object.');
  } else {
    const ut = c.usageThresholds;
    if (
      typeof ut.usageApproachingThresholdPercent !== 'number' ||
      ut.usageApproachingThresholdPercent < 40 ||
      ut.usageApproachingThresholdPercent > 99
    ) {
      errors.push('usageThresholds.usageApproachingThresholdPercent must be between 40% and 99%.');
    }

    if (
      typeof ut.usageViolationThresholdPercent !== 'number' ||
      ut.usageViolationThresholdPercent < 60 ||
      ut.usageViolationThresholdPercent > 200
    ) {
      errors.push('usageThresholds.usageViolationThresholdPercent must be between 60% and 200%.');
    }

    if (
      typeof ut.usageApproachingThresholdPercent === 'number' &&
      typeof ut.usageViolationThresholdPercent === 'number' &&
      ut.usageApproachingThresholdPercent >= ut.usageViolationThresholdPercent
    ) {
      errors.push('usageApproachingThresholdPercent must be strictly less than usageViolationThresholdPercent.');
    }
  }

  // 5. Alert Thresholds
  if (!c.alertThresholds || typeof c.alertThresholds !== 'object') {
    errors.push('alertThresholds is required and must be an object.');
  } else {
    const at = c.alertThresholds;
    if (
      typeof at.provisioningDelayMinutes !== 'number' ||
      at.provisioningDelayMinutes < 1 ||
      at.provisioningDelayMinutes > 1440
    ) {
      errors.push('alertThresholds.provisioningDelayMinutes must be between 1 and 1440 minutes.');
    }

    if (
      typeof at.unacknowledgedAlertEscalationMinutes !== 'number' ||
      at.unacknowledgedAlertEscalationMinutes < 1 ||
      at.unacknowledgedAlertEscalationMinutes > 1440
    ) {
      errors.push('alertThresholds.unacknowledgedAlertEscalationMinutes must be between 1 and 1440 minutes.');
    }

    if (
      typeof at.healthRiskScoreThreshold !== 'number' ||
      at.healthRiskScoreThreshold < 10 ||
      at.healthRiskScoreThreshold > 90
    ) {
      errors.push('alertThresholds.healthRiskScoreThreshold must be a score between 10 and 90.');
    }

    if (
      typeof at.warningOrdersUsagePercent === 'number' &&
      typeof at.criticalOrdersUsagePercent === 'number' &&
      at.warningOrdersUsagePercent >= at.criticalOrdersUsagePercent
    ) {
      errors.push('alertThresholds.warningOrdersUsagePercent must be strictly less than alertThresholds.criticalOrdersUsagePercent.');
    }
  }

  // 6. Scheduler Policy
  if (!c.schedulerPolicy || typeof c.schedulerPolicy !== 'object') {
    errors.push('schedulerPolicy is required and must be an object.');
  } else {
    const sp = c.schedulerPolicy;
    if (typeof (sp as any).evaluationIntervalMinutes === 'number' && (sp as any).evaluationIntervalMinutes <= 0) {
      errors.push('schedulerPolicy.evaluationIntervalMinutes must be greater than 0.');
    }
    if (typeof sp.healthSweepIntervalMs !== 'number' || sp.healthSweepIntervalMs < 10000 || sp.healthSweepIntervalMs > 86400000) {
      errors.push('schedulerPolicy.healthSweepIntervalMs must be between 10,000ms (10s) and 86,400,000ms (24h).');
    }
    if (typeof sp.escalationSweepIntervalMs !== 'number' || sp.escalationSweepIntervalMs < 10000 || sp.escalationSweepIntervalMs > 86400000) {
      errors.push('schedulerPolicy.escalationSweepIntervalMs must be between 10,000ms (10s) and 86,400,000ms (24h).');
    }
    if (typeof sp.notificationSweepIntervalMs !== 'number' || sp.notificationSweepIntervalMs < 5000 || sp.notificationSweepIntervalMs > 86400000) {
      errors.push('schedulerPolicy.notificationSweepIntervalMs must be between 5,000ms (5s) and 86,400,000ms (24h).');
    }
    if (typeof sp.distributedLockLeaseMs !== 'number' || sp.distributedLockLeaseMs < 15000 || sp.distributedLockLeaseMs > 3600000) {
      errors.push('schedulerPolicy.distributedLockLeaseMs must be between 15,000ms (15s) and 3,600,000ms (1h).');
    }
    if (typeof sp.enabled !== 'boolean') {
      errors.push('schedulerPolicy.enabled must be a boolean.');
    }
  }

  // 7. Feature Flags
  if (!c.featureFlags || typeof c.featureFlags !== 'object' || Array.isArray(c.featureFlags)) {
    errors.push('featureFlags is required and must be a key-value object.');
  } else {
    for (const [key, val] of Object.entries(c.featureFlags)) {
      if (typeof val !== 'boolean') {
        errors.push(`featureFlags.${key} must be a boolean value.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Computes which configuration categories changed between two configs.
 */
export function computeChangedCategories(
  prev: PlatformGovernanceConfig,
  curr: PlatformGovernanceConfig
): string[] {
  const categories: string[] = [];
  if (JSON.stringify(prev.globalSettings) !== JSON.stringify(curr.globalSettings)) categories.push('Global Settings');
  if (JSON.stringify(prev.plans) !== JSON.stringify(curr.plans)) categories.push('Subscription Plans');
  if (JSON.stringify(prev.billingDefaults) !== JSON.stringify(curr.billingDefaults)) categories.push('Billing Defaults');
  if (JSON.stringify(prev.usageThresholds) !== JSON.stringify(curr.usageThresholds)) categories.push('Usage Thresholds');
  if (JSON.stringify(prev.alertThresholds) !== JSON.stringify(curr.alertThresholds)) categories.push('Alert Thresholds');
  if (JSON.stringify(prev.schedulerPolicy) !== JSON.stringify(curr.schedulerPolicy)) categories.push('Scheduler Policy');
  if (JSON.stringify(prev.featureFlags) !== JSON.stringify(curr.featureFlags)) categories.push('Feature Flags');
  return categories.length > 0 ? categories : ['Metadata'];
}

// In-memory caching for runtime engine lookups (TTL: 15s)
let cachedPublishedConfig: { config: PlatformGovernanceConfig; cachedAt: number } | null = null;
const CACHE_TTL_MS = 15000;

export function invalidatePublishedConfigCache() {
  cachedPublishedConfig = null;
}

/**
 * Retrieves the published platform governance configuration.
 * Returns default baseline if not yet published.
 */
export async function getPublishedPlatformConfig(db: any): Promise<PlatformGovernanceConfig> {
  const now = Date.now();
  if (cachedPublishedConfig && now - cachedPublishedConfig.cachedAt < CACHE_TTL_MS) {
    return cachedPublishedConfig.config;
  }

  if (!db) return DEFAULT_PLATFORM_GOVERNANCE_CONFIG;

  try {
    const docRef = db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC_ID);
    const snap = await docRef.get();
    if (!snap.exists) {
      return DEFAULT_PLATFORM_GOVERNANCE_CONFIG;
    }
    const data = snap.data();
    if (data?.publishedConfig) {
      cachedPublishedConfig = { config: data.publishedConfig, cachedAt: now };
      return data.publishedConfig;
    }
  } catch (err) {
    console.error('Error fetching published platform configuration:', err);
  }

  return DEFAULT_PLATFORM_GOVERNANCE_CONFIG;
}

/**
 * Retrieves the full governance control plane state (published config + draft + metadata).
 */
export async function getPlatformGovernanceState(db: any): Promise<{
  published: PlatformGovernanceConfig;
  draft: PlatformDraftConfig | null;
  activeVersion: number;
  totalVersions: number;
  lastPublishedAt?: string;
  lastPublishedBy?: string;
}> {
  if (!db) {
    return {
      published: DEFAULT_PLATFORM_GOVERNANCE_CONFIG,
      draft: null,
      activeVersion: 1,
      totalVersions: 1,
      lastPublishedAt: DEFAULT_PLATFORM_GOVERNANCE_CONFIG.publishedAt,
      lastPublishedBy: DEFAULT_PLATFORM_GOVERNANCE_CONFIG.publishedBy,
    };
  }

  const docRef = db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC_ID);
  const snap = await docRef.get();

  let published = DEFAULT_PLATFORM_GOVERNANCE_CONFIG;
  let draft: PlatformDraftConfig | null = null;
  let activeVersion = 1;
  let lastPublishedAt = published.publishedAt;
  let lastPublishedBy = published.publishedBy;

  if (snap.exists) {
    const data = snap.data();
    if (data.publishedConfig) {
      published = data.publishedConfig;
      activeVersion = published.version;
      lastPublishedAt = published.publishedAt;
      lastPublishedBy = published.publishedBy;
    }
    if (data.draftConfig) {
      draft = data.draftConfig;
    }
  }

  let totalVersions = activeVersion;
  try {
    const versionsSnap = await db.collection(CONFIG_VERSIONS_COLLECTION).get();
    if (!versionsSnap.empty) {
      totalVersions = Math.max(versionsSnap.size, activeVersion);
    }
  } catch {
    // fallback to activeVersion
  }

  return {
    published,
    draft,
    activeVersion,
    totalVersions,
    lastPublishedAt,
    lastPublishedBy,
  };
}

/**
 * Retrieves configuration version history (bounded to 50 records).
 */
export async function getPlatformConfigHistory(
  db: any,
  limit = 50
): Promise<PlatformConfigVersionSummary[]> {
  if (!db) {
    return [
      {
        version: 1,
        status: 'published',
        createdAt: DEFAULT_PLATFORM_GOVERNANCE_CONFIG.createdAt,
        createdBy: DEFAULT_PLATFORM_GOVERNANCE_CONFIG.createdBy,
        justification: DEFAULT_PLATFORM_GOVERNANCE_CONFIG.justification,
        previousVersion: null,
        changedCategories: ['Authoritative Baseline'],
      },
    ];
  }

  const boundedLimit = Math.min(Math.max(1, limit), 50);
  const snap = await db
    .collection(CONFIG_VERSIONS_COLLECTION)
    .orderBy('version', 'desc')
    .limit(boundedLimit)
    .get();

  if (snap.empty) {
    return [
      {
        version: 1,
        status: 'published',
        createdAt: DEFAULT_PLATFORM_GOVERNANCE_CONFIG.createdAt,
        createdBy: DEFAULT_PLATFORM_GOVERNANCE_CONFIG.createdBy,
        justification: DEFAULT_PLATFORM_GOVERNANCE_CONFIG.justification,
        previousVersion: null,
        changedCategories: ['Authoritative Baseline'],
      },
    ];
  }

  return snap.docs.map((d: any) => {
    const data = d.data();
    return {
      version: data.version,
      status: data.status || 'published',
      createdAt: data.createdAt,
      createdBy: data.createdBy,
      justification: data.justification,
      previousVersion: data.previousVersion ?? null,
      rolledBackFromVersion: data.rolledBackFromVersion,
      changedCategories: data.changedCategories || (data.diffSummary ? Object.keys(data.diffSummary) : ['Platform Policy']),
    };
  });
}

export const listPlatformConfigVersions = getPlatformConfigHistory;

export async function getPlatformConfigVersion(
  db: any,
  version: number
): Promise<PlatformGovernanceConfig | null> {
  if (!db) return null;
  if (version === 1) {
    const snap = await db.collection(CONFIG_VERSIONS_COLLECTION).doc(`v_${version}`).get();
    if (snap.exists) return snap.data().config;
    return DEFAULT_PLATFORM_GOVERNANCE_CONFIG;
  }
  const snap = await db.collection(CONFIG_VERSIONS_COLLECTION).doc(`v_${version}`).get();
  return snap.exists ? snap.data().config : null;
}

export const getPlatformGovernanceConfig = getPlatformGovernanceState;

export async function getDraftPlatformConfig(db: any): Promise<PlatformDraftConfig | null> {
  const { draft } = await getPlatformGovernanceState(db);
  return draft;
}

export const updateDraftPlatformConfig = savePlatformConfigDraft;

/**
 * Saves or updates a draft configuration candidate.
 */
export async function savePlatformConfigDraft(
  db: any,
  candidateConfig: Partial<PlatformGovernanceConfig>,
  adminUser: { uid: string; email: string },
  justification?: string,
  expectedVersion?: number
): Promise<{ draft: PlatformDraftConfig; validation: ValidationResult }> {
  if (!db) throw new Error('Database service unavailable.');
  const effectiveJustification = (justification && typeof justification === 'string' && justification.trim().length >= 3)
    ? justification.trim()
    : 'Draft configuration candidate update';

  const currentRef = db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC_ID);
  const now = new Date().toISOString();

  let draftResult: PlatformDraftConfig | null = null;
  let validationResult: ValidationResult | null = null;

  await db.runTransaction(async (transaction: any) => {
    const snap = await transaction.get(currentRef);
    let published = DEFAULT_PLATFORM_GOVERNANCE_CONFIG;

    if (snap.exists) {
      const data = snap.data();
      if (data.publishedConfig) {
        published = data.publishedConfig;
      }
    }

    if (expectedVersion !== undefined && published.version !== expectedVersion) {
      throw new Error(
        `Version conflict: Active platform configuration version is v${published.version}, but expected v${expectedVersion}. Please reload.`
      );
    }

    // Merge candidate changes onto published config baseline
    const mergedConfig: PlatformGovernanceConfig = {
      ...published,
      ...candidateConfig,
      version: published.version,
      status: 'draft',
      createdAt: published.createdAt,
      createdBy: published.createdBy,
      justification: effectiveJustification,
    };

    const validation = validatePlatformConfig(mergedConfig);
    validationResult = validation;

    const newDraft: PlatformDraftConfig = {
      config: mergedConfig,
      status: validation.valid ? 'validated' : 'draft',
      lastModifiedAt: now,
      lastModifiedBy: adminUser.email || adminUser.uid,
      validationErrors: validation.errors,
      validationWarnings: validation.warnings,
    };

    transaction.set(
      currentRef,
      {
        publishedConfig: published,
        draftConfig: newDraft,
        updatedAt: now,
      },
      { merge: true }
    );

    draftResult = newDraft;
  });

  return {
    draft: draftResult!,
    validation: validationResult!,
  };
}

/**
 * Publishes the pending draft (or supplied config) to active runtime.
 * Atomic, authoritative, concurrency-checked, and recorded in audit log.
 */
export async function publishPlatformConfig(
  db: any,
  adminUser: { uid: string; email: string },
  justification: string,
  expectedVersion: number,
  clientCandidateConfig?: Partial<PlatformGovernanceConfig>
): Promise<{ published: PlatformGovernanceConfig; newVersion: number }> {
  if (!db) throw new Error('Database service unavailable.');
  if (!justification || typeof justification !== 'string' || justification.trim().length < 5) {
    throw new Error('A non-empty administrative justification (minimum 5 characters) is required.');
  }

  const currentRef = db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC_ID);
  const now = new Date().toISOString();

  let finalPublishedConfig: PlatformGovernanceConfig | null = null;
  let finalNewVersion = 1;
  let previousConfigSnapshot: PlatformGovernanceConfig | null = null;
  let changedCategoriesList: string[] = [];

  await db.runTransaction(async (transaction: any) => {
    const snap = await transaction.get(currentRef);
    let published = DEFAULT_PLATFORM_GOVERNANCE_CONFIG;
    let draft: PlatformDraftConfig | null = null;

    if (snap.exists) {
      const data = snap.data();
      if (data.publishedConfig) {
        published = data.publishedConfig;
      }
      if (data.draftConfig) {
        draft = data.draftConfig;
      }
    }

    if (published.version !== expectedVersion) {
      throw new Error(
        `Version conflict: Active platform configuration is v${published.version}, but expected v${expectedVersion}. Please reload to inspect latest changes.`
      );
    }

    // Determine config to publish
    const candidate = clientCandidateConfig || draft?.config;
    if (!candidate) {
      throw new Error('No draft configuration available to publish.');
    }

    const newVersion = published.version + 1;
    const configToValidate: PlatformGovernanceConfig = {
      ...published,
      ...candidate,
      version: newVersion,
      status: 'published',
      publishedAt: now,
      publishedBy: adminUser.email || adminUser.uid,
      justification: justification.trim(),
      previousVersion: published.version,
    };

    const validation = validatePlatformConfig(configToValidate);
    if (!validation.valid) {
      throw new Error(`Cannot publish invalid configuration: ${validation.errors.join('; ')}`);
    }

    changedCategoriesList = computeChangedCategories(published, configToValidate);

    // Ensure baseline v_1 exists in CONFIG_VERSIONS_COLLECTION if newVersion > 1
    if (newVersion > 1) {
      const v1Ref = db.collection(CONFIG_VERSIONS_COLLECTION).doc('v_1');
      const v1Snap = await transaction.get(v1Ref);
      if (!v1Snap.exists) {
        transaction.set(v1Ref, {
          version: 1,
          status: 'published',
          config: published.version === 1 ? published : DEFAULT_PLATFORM_GOVERNANCE_CONFIG,
          createdAt: published.createdAt || DEFAULT_PLATFORM_GOVERNANCE_CONFIG.createdAt,
          createdBy: published.createdBy || DEFAULT_PLATFORM_GOVERNANCE_CONFIG.createdBy,
          justification: published.justification || 'Authoritative platform baseline configuration',
          previousVersion: null,
          changedCategories: ['Authoritative Baseline'],
        });
      }
    }

    // Write to historical version collection
    const versionRef = db.collection(CONFIG_VERSIONS_COLLECTION).doc(`v_${newVersion}`);
    transaction.set(versionRef, {
      version: newVersion,
      status: 'published',
      config: configToValidate,
      createdAt: now,
      createdBy: adminUser.email || adminUser.uid,
      justification: justification.trim(),
      previousVersion: published.version,
      changedCategories: changedCategoriesList,
    });

    // Write to current document (publishedConfig becomes new config, clear draft)
    transaction.set(currentRef, {
      publishedConfig: configToValidate,
      draftConfig: null,
      activeVersion: newVersion,
      lastPublishedAt: now,
      lastPublishedBy: adminUser.email || adminUser.uid,
      lastPublishedReason: justification.trim(),
      updatedAt: now,
    });

    finalPublishedConfig = configToValidate;
    finalNewVersion = newVersion;
    previousConfigSnapshot = published;
  });

  invalidatePublishedConfigCache();

  // Create immutable authoritative audit record
  await recordAuditEvent(
    db,
    createAuthoritativeAuditRecord({
      action: 'PLATFORM_CONFIG_PUBLISHED',
      module: 'platform_governance',
      actorUid: adminUser.uid,
      actorEmail: adminUser.email,
      actorRole: 'Super Admin',
      tenantId: 'platform',
      targetId: `v_${finalNewVersion}`,
      targetType: 'platform_governance_config',
      severity: 'critical',
      reason: justification.trim(),
      metadata: {
        previousVersion: previousConfigSnapshot?.version,
        newVersion: finalNewVersion,
        changedCategories: changedCategoriesList,
        maintenanceMode: finalPublishedConfig!.globalSettings.maintenanceMode,
        enforceHardUsageLimits: finalPublishedConfig!.billingDefaults.enforceHardUsageLimits,
      },
    })
  );

  return {
    published: finalPublishedConfig!,
    newVersion: finalNewVersion,
  };
}

/**
 * Rolls back configuration to a historical version.
 * Creates a NEW version snapshot marked 'rolled_back' rather than mutating history.
 */
export async function rollbackPlatformConfig(
  db: any,
  adminUser: { uid: string; email: string },
  targetVersion: number,
  justification: string,
  expectedCurrentVersion?: number
): Promise<{ published: PlatformGovernanceConfig; newVersion: number }> {
  if (!db) throw new Error('Database service unavailable.');
  if (!targetVersion || typeof targetVersion !== 'number' || targetVersion < 1) {
    throw new Error('Valid targetVersion is required.');
  }
  if (!justification || typeof justification !== 'string' || justification.trim().length < 5) {
    throw new Error('A non-empty administrative justification (minimum 5 characters) is required for rollback.');
  }

  // 1. Fetch target historical version document
  let targetVersionDoc: any = null;
  if (targetVersion === 1) {
    // If target is v1 and record might not exist in collection yet, use bootstrap baseline
    const targetRef = db.collection(CONFIG_VERSIONS_COLLECTION).doc(`v_${targetVersion}`);
    const snap = await targetRef.get();
    targetVersionDoc = snap.exists ? snap.data() : { config: DEFAULT_PLATFORM_GOVERNANCE_CONFIG };
  } else {
    const targetRef = db.collection(CONFIG_VERSIONS_COLLECTION).doc(`v_${targetVersion}`);
    const snap = await targetRef.get();
    if (!snap.exists) {
      throw new Error(`Target configuration version v${targetVersion} not found.`);
    }
    targetVersionDoc = snap.data();
  }

  const targetConfig = targetVersionDoc.config;
  const validation = validatePlatformConfig(targetConfig);
  if (!validation.valid) {
    throw new Error(`Target configuration version v${targetVersion} fails current safety validations: ${validation.errors.join('; ')}`);
  }

  const currentRef = db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC_ID);
  const now = new Date().toISOString();

  let finalPublishedConfig: PlatformGovernanceConfig | null = null;
  let finalNewVersion = 1;
  let previousConfigSnapshot: PlatformGovernanceConfig | null = null;
  let changedCategoriesList: string[] = [];

  await db.runTransaction(async (transaction: any) => {
    const snap = await transaction.get(currentRef);
    let published = DEFAULT_PLATFORM_GOVERNANCE_CONFIG;

    if (snap.exists) {
      const data = snap.data();
      if (data.publishedConfig) {
        published = data.publishedConfig;
      }
    }

    if (expectedCurrentVersion !== undefined && published.version !== expectedCurrentVersion) {
      throw new Error(
        `Version conflict: Current version is v${published.version}, but expected v${expectedCurrentVersion}. Please reload.`
      );
    }

    if (published.version === targetVersion) {
      throw new Error(`Target version v${targetVersion} is already the currently active configuration.`);
    }

    const newVersion = published.version + 1;
    const rolledBackConfig: PlatformGovernanceConfig = {
      ...targetConfig,
      version: newVersion,
      status: 'rolled_back',
      publishedAt: now,
      publishedBy: adminUser.email || adminUser.uid,
      justification: justification.trim(),
      previousVersion: published.version,
      rolledBackFromVersion: targetVersion,
    };

    changedCategoriesList = computeChangedCategories(published, rolledBackConfig);

    // Ensure baseline v_1 exists in CONFIG_VERSIONS_COLLECTION if newVersion > 1
    if (newVersion > 1) {
      const v1Ref = db.collection(CONFIG_VERSIONS_COLLECTION).doc('v_1');
      const v1Snap = await transaction.get(v1Ref);
      if (!v1Snap.exists) {
        transaction.set(v1Ref, {
          version: 1,
          status: 'published',
          config: DEFAULT_PLATFORM_GOVERNANCE_CONFIG,
          createdAt: DEFAULT_PLATFORM_GOVERNANCE_CONFIG.createdAt,
          createdBy: DEFAULT_PLATFORM_GOVERNANCE_CONFIG.createdBy,
          justification: 'Authoritative platform baseline configuration',
          previousVersion: null,
          changedCategories: ['Authoritative Baseline'],
        });
      }
    }

    // Save as new version record in platform_config_versions
    const newVersionRef = db.collection(CONFIG_VERSIONS_COLLECTION).doc(`v_${newVersion}`);
    transaction.set(newVersionRef, {
      version: newVersion,
      status: 'rolled_back',
      config: rolledBackConfig,
      createdAt: now,
      createdBy: adminUser.email || adminUser.uid,
      justification: justification.trim(),
      previousVersion: published.version,
      rolledBackFromVersion: targetVersion,
      changedCategories: changedCategoriesList,
    });

    // Update current document
    transaction.set(currentRef, {
      publishedConfig: rolledBackConfig,
      draftConfig: null,
      activeVersion: newVersion,
      lastPublishedAt: now,
      lastPublishedBy: adminUser.email || adminUser.uid,
      lastPublishedReason: `[Rollback to v${targetVersion}] ${justification.trim()}`,
      updatedAt: now,
    });

    finalPublishedConfig = rolledBackConfig;
    finalNewVersion = newVersion;
    previousConfigSnapshot = published;
  });

  invalidatePublishedConfigCache();

  // Write authoritative audit record
  await recordAuditEvent(
    db,
    createAuthoritativeAuditRecord({
      action: 'PLATFORM_CONFIG_ROLLED_BACK',
      module: 'platform_governance',
      actorUid: adminUser.uid,
      actorEmail: adminUser.email,
      actorRole: 'Super Admin',
      tenantId: 'platform',
      targetId: `v_${finalNewVersion}`,
      targetType: 'platform_governance_config',
      severity: 'critical',
      reason: justification.trim(),
      metadata: {
        previousVersion: previousConfigSnapshot?.version,
        newVersion: finalNewVersion,
        rolledBackFromVersion: targetVersion,
        changedCategories: changedCategoriesList,
      },
    })
  );

  return {
    published: finalPublishedConfig!,
    newVersion: finalNewVersion,
  };
}
