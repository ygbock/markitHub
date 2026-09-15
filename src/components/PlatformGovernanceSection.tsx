import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getAuth } from 'firebase/auth';
import {
  AlertTriangle,
  ArrowDownRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Cpu,
  Eye,
  FileCheck2,
  FileSliders,
  History,
  Info,
  Layers3,
  Loader2,
  Lock,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Settings2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  UploadCloud,
  X,
} from 'lucide-react';

export interface PlatformPlanLimits {
  products: number;
  ordersMonthly: number;
  storageGb: number;
}

export interface PlatformPlanDefinition {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  includedSeats: number;
  limits: PlatformPlanLimits;
  features: string[];
  status: 'active' | 'archived';
}

export interface PlatformSchedulerPolicy {
  enabled: boolean;
  healthSweepIntervalMs: number;
  escalationSweepIntervalMs: number;
  notificationSweepIntervalMs: number;
  distributedLockLeaseMs: number;
}

export interface PlatformFeatureFlags {
  enableAutomatedHealthEvaluation: boolean;
  enableSlaEscalations: boolean;
  enableNotificationDispatch: boolean;
  enableSelfServeSignups: boolean;
  enableCustomDomains: boolean;
  enableAdvancedAnalytics: boolean;
  [key: string]: boolean;
}

export interface PlatformAlertThresholds {
  provisioningDelayMinutes: number;
  slaCriticalEscalationMinutes: number;
  slaWarningEscalationMinutes: number;
  healthRiskScoreThreshold: number;
  autoResolveResolvedConditions: boolean;
}

export interface PlatformUsageThresholds {
  usageApproachingThresholdPercent: number;
  usageViolationThresholdPercent: number;
}

export interface PlatformGovernanceConfig {
  version: number;
  updatedAt: string;
  updatedByUid: string;
  updatedByEmail: string;
  reason: string;
  platformName: string;
  supportEmail: string;
  systemNotificationEmail: string;
  defaultCurrency: string;
  defaultTimezone: string;
  maintenanceMode: boolean;
  defaultTrialDays: number;
  trialGracePeriodDays: number;
  suspensionGracePeriodDays: number;
  retentionDaysAfterCancellation: number;
  plans: PlatformPlanDefinition[];
  alertThresholds: PlatformAlertThresholds;
  usageThresholds: PlatformUsageThresholds;
  schedulerPolicy: PlatformSchedulerPolicy;
  featureFlags: PlatformFeatureFlags;
}

export interface PlatformDraftConfig {
  config: PlatformGovernanceConfig;
  updatedAt: string;
  updatedByUid: string;
  updatedByEmail: string;
  reason: string;
  expectedPublishedVersion: number;
}

export interface PlatformConfigVersionSummary {
  version: number;
  updatedAt: string;
  updatedByUid: string;
  updatedByEmail: string;
  reason: string;
  publishedAt: string;
  changeSummary?: string[];
}

type SubSection =
  | 'general'
  | 'lifecycle'
  | 'plans'
  | 'thresholds'
  | 'scheduler'
  | 'features'
  | 'history';

async function authApiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getAuth().currentUser ? await getAuth().currentUser!.getIdToken() : null;
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err: any = new Error(body?.error || `Request failed (HTTP ${response.status})`);
    err.status = response.status;
    err.details = body?.details;
    err.currentVersion = body?.currentVersion;
    throw err;
  }
  return body as T;
}

export default function PlatformGovernanceSection() {
  const [activeSubSection, setActiveSubSection] = useState<SubSection>('general');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const [publishedConfig, setPublishedConfig] = useState<PlatformGovernanceConfig | null>(null);
  const [draftConfig, setDraftConfig] = useState<PlatformDraftConfig | null>(null);
  const [currentVersion, setCurrentVersion] = useState<number>(1);
  const [isDraftModified, setIsDraftModified] = useState(false);
  const [history, setHistory] = useState<PlatformConfigVersionSummary[]>([]);

  // Working copy in local state (initialized from draft or published)
  const [workingConfig, setWorkingConfig] = useState<PlatformGovernanceConfig | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Validation results
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);

  // Modals
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishReason, setPublishReason] = useState('');

  const [rollbackModalTarget, setRollbackModalTarget] = useState<PlatformConfigVersionSummary | null>(null);
  const [rollbackReason, setRollbackReason] = useState('');

  const [inspectVersion, setInspectVersion] = useState<PlatformConfigVersionSummary | null>(null);

  // Load governance state & history
  const loadGovernanceState = useCallback(async () => {
    setLoading(true);
    setError(null);
    setConflictError(null);
    try {
      const [stateRes, historyRes] = await Promise.all([
        authApiFetch<{
          success: boolean;
          publishedConfig: PlatformGovernanceConfig;
          draftConfig: PlatformDraftConfig | null;
          currentVersion: number;
          isDraftModified: boolean;
        }>('/api/platform/governance/config'),
        authApiFetch<{
          success: boolean;
          versions: PlatformConfigVersionSummary[];
        }>('/api/platform/governance/config/history'),
      ]);

      setPublishedConfig(stateRes.publishedConfig);
      setDraftConfig(stateRes.draftConfig);
      setCurrentVersion(stateRes.currentVersion);
      setIsDraftModified(stateRes.isDraftModified);
      setHistory(historyRes.versions || []);

      // If there's an active draft, load that into workingConfig, otherwise load publishedConfig
      const activeState = stateRes.draftConfig?.config
        ? JSON.parse(JSON.stringify(stateRes.draftConfig.config))
        : JSON.parse(JSON.stringify(stateRes.publishedConfig));
      setWorkingConfig(activeState);
      setIsFormDirty(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to load platform governance state.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGovernanceState();
  }, [loadGovernanceState]);

  // Handle local form edits
  const updateWorkingConfig = (updater: (prev: PlatformGovernanceConfig) => PlatformGovernanceConfig) => {
    setWorkingConfig(prev => {
      if (!prev) return prev;
      const next = updater(JSON.parse(JSON.stringify(prev)));
      setIsFormDirty(true);
      return next;
    });
  };

  // Run server-authoritative validation
  const handleValidateConfig = async () => {
    if (!workingConfig) return;
    setBusy('validate');
    setError(null);
    setValidationResult(null);
    try {
      const res = await authApiFetch<{
        success: boolean;
        valid: boolean;
        errors: string[];
        warnings: string[];
      }>('/api/platform/governance/config/validate', {
        method: 'POST',
        body: JSON.stringify({ config: workingConfig }),
      });
      setValidationResult(res);
      if (res.valid) {
        setNotice('Validation passed: configuration is structurally sound and secure.');
      } else {
        setError(`Configuration validation failed: ${res.errors.length} issue(s) identified.`);
      }
    } catch (err: any) {
      setError(err?.message || 'Validation request failed.');
    } finally {
      setBusy(null);
    }
  };

  // Save current working config to server draft
  const handleSaveDraft = async () => {
    if (!workingConfig) return;
    setBusy('save_draft');
    setError(null);
    setConflictError(null);
    try {
      const res = await authApiFetch<{
        success: boolean;
        draft: PlatformDraftConfig;
      }>('/api/platform/governance/config', {
        method: 'PATCH',
        body: JSON.stringify({
          config: workingConfig,
          expectedVersion: currentVersion,
          reason: 'Saved draft in Super Admin dashboard',
        }),
      });
      setDraftConfig(res.draft);
      setIsDraftModified(true);
      setIsFormDirty(false);
      setNotice('Configuration draft saved to authoritative server store.');
    } catch (err: any) {
      if (err.status === 409) {
        setConflictError(
          `Version conflict: Another administrator published version v${err.currentVersion || 'newer'}. Refresh the latest state before saving.`
        );
      } else {
        setError(err?.message || 'Failed to save configuration draft.');
      }
    } finally {
      setBusy(null);
    }
  };

  // Discard draft and reset to published config
  const handleDiscardDraft = () => {
    if (!publishedConfig) return;
    if (window.confirm('Discard all draft changes and reset to current published configuration?')) {
      setWorkingConfig(JSON.parse(JSON.stringify(publishedConfig)));
      setIsFormDirty(false);
      setValidationResult(null);
      setNotice('Reset to published configuration.');
    }
  };

  // Publish draft
  const handleConfirmPublish = async () => {
    if (!publishReason.trim() || publishReason.trim().length < 5) {
      setError('A mandatory justification reason (min 5 characters) is required to publish configuration.');
      return;
    }

    setBusy('publish');
    setError(null);
    setConflictError(null);
    try {
      // First ensure the latest working config is saved as draft if dirty
      if (isFormDirty && workingConfig) {
        await authApiFetch('/api/platform/governance/config', {
          method: 'PATCH',
          body: JSON.stringify({
            config: workingConfig,
            expectedVersion: currentVersion,
            reason: publishReason.trim(),
          }),
        });
      }

      const res = await authApiFetch<{
        success: boolean;
        publishedVersion: number;
        publishedConfig: PlatformGovernanceConfig;
      }>('/api/platform/governance/config/publish', {
        method: 'POST',
        body: JSON.stringify({
          expectedVersion: currentVersion,
          reason: publishReason.trim(),
        }),
      });

      setPublishedConfig(res.publishedConfig);
      setCurrentVersion(res.publishedVersion);
      setDraftConfig(null);
      setIsDraftModified(false);
      setIsFormDirty(false);
      setPublishModalOpen(false);
      setPublishReason('');
      setValidationResult(null);
      setNotice(`Version v${res.publishedVersion} successfully published! Platform engines will now consume these settings.`);
      await loadGovernanceState();
    } catch (err: any) {
      if (err.status === 409) {
        setConflictError(
          `Version conflict: Another administrator updated the configuration to v${err.currentVersion || 'newer'}. Refresh before publishing.`
        );
        setPublishModalOpen(false);
      } else {
        setError(err?.message || 'Failed to publish configuration.');
      }
    } finally {
      setBusy(null);
    }
  };

  // Rollback to historical version
  const handleConfirmRollback = async () => {
    if (!rollbackModalTarget) return;
    if (!rollbackReason.trim() || rollbackReason.trim().length < 5) {
      setError('A mandatory justification reason (min 5 characters) is required to execute rollback.');
      return;
    }

    setBusy('rollback');
    setError(null);
    try {
      const res = await authApiFetch<{
        success: boolean;
        newVersion: number;
        restoredFromVersion: number;
        publishedConfig: PlatformGovernanceConfig;
      }>('/api/platform/governance/config/rollback', {
        method: 'POST',
        body: JSON.stringify({
          targetVersion: rollbackModalTarget.version,
          reason: rollbackReason.trim(),
        }),
      });

      setRollbackModalTarget(null);
      setRollbackReason('');
      setNotice(
        `Rollback successful! Configuration restored from v${res.restoredFromVersion} and published as new version v${res.newVersion}.`
      );
      await loadGovernanceState();
    } catch (err: any) {
      setError(err?.message || 'Failed to execute configuration rollback.');
    } finally {
      setBusy(null);
    }
  };

  // Difference summary between published and working
  const diffSummary = useMemo(() => {
    if (!publishedConfig || !workingConfig) return [];
    const diffs: string[] = [];

    if (publishedConfig.platformName !== workingConfig.platformName) {
      diffs.push(`Platform Name: "${publishedConfig.platformName}" → "${workingConfig.platformName}"`);
    }
    if (publishedConfig.supportEmail !== workingConfig.supportEmail) {
      diffs.push(`Support Email: "${publishedConfig.supportEmail}" → "${workingConfig.supportEmail}"`);
    }
    if (publishedConfig.maintenanceMode !== workingConfig.maintenanceMode) {
      diffs.push(`Maintenance Mode: ${publishedConfig.maintenanceMode ? 'ENABLED' : 'DISABLED'} → ${workingConfig.maintenanceMode ? 'ENABLED' : 'DISABLED'}`);
    }
    if (publishedConfig.defaultTrialDays !== workingConfig.defaultTrialDays) {
      diffs.push(`Trial Days: ${publishedConfig.defaultTrialDays} → ${workingConfig.defaultTrialDays}`);
    }
    if (publishedConfig.usageThresholds.usageApproachingThresholdPercent !== workingConfig.usageThresholds.usageApproachingThresholdPercent) {
      diffs.push(`Usage Warning: ${publishedConfig.usageThresholds.usageApproachingThresholdPercent}% → ${workingConfig.usageThresholds.usageApproachingThresholdPercent}%`);
    }
    if (publishedConfig.usageThresholds.usageViolationThresholdPercent !== workingConfig.usageThresholds.usageViolationThresholdPercent) {
      diffs.push(`Usage Violation: ${publishedConfig.usageThresholds.usageViolationThresholdPercent}% → ${workingConfig.usageThresholds.usageViolationThresholdPercent}%`);
    }
    if (publishedConfig.alertThresholds.healthRiskScoreThreshold !== workingConfig.alertThresholds.healthRiskScoreThreshold) {
      diffs.push(`Health Risk Score Threshold: ${publishedConfig.alertThresholds.healthRiskScoreThreshold} → ${workingConfig.alertThresholds.healthRiskScoreThreshold}`);
    }
    if (publishedConfig.schedulerPolicy.enabled !== workingConfig.schedulerPolicy.enabled) {
      diffs.push(`Scheduler: ${publishedConfig.schedulerPolicy.enabled ? 'ACTIVE' : 'DISABLED'} → ${workingConfig.schedulerPolicy.enabled ? 'ACTIVE' : 'DISABLED'}`);
    }

    // Check feature flags
    Object.keys(workingConfig.featureFlags || {}).forEach(k => {
      const oldVal = (publishedConfig.featureFlags as any)?.[k];
      const newVal = (workingConfig.featureFlags as any)?.[k];
      if (oldVal !== newVal) {
        diffs.push(`Flag [${k}]: ${String(oldVal)} → ${String(newVal)}`);
      }
    });

    return diffs;
  }, [publishedConfig, workingConfig]);

  if (loading && !publishedConfig) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <h3 className="mt-4 text-base font-black text-slate-800">Loading Governance Control Plane</h3>
        <p className="mt-1 text-xs text-slate-500">Fetching authoritative platform configuration, policies, and audit history...</p>
      </div>
    );
  }

  return (
    <div id="platform-governance-section" className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                <Settings2 className="h-3.5 w-3.5" /> Platform Governance v{currentVersion}
              </span>
              {isDraftModified || isFormDirty ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                  <Clock className="h-3 w-3" /> Uncommitted Draft Changes
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="h-3 w-3" /> In Sync With Published
                </span>
              )}
              {publishedConfig?.maintenanceMode && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-black text-rose-800">
                  <ShieldAlert className="h-3 w-3" /> Maintenance Mode Active
                </span>
              )}
            </div>
            <h2 className="text-xl font-black text-slate-900 sm:text-2xl">
              Platform Governance & Configuration Control Plane
            </h2>
            <p className="text-xs text-slate-500">
              Manage authoritative platform policies, subscription plans, usage thresholds, scheduler intervals, and feature flags with versioned transactional rollbacks and audit trails.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadGovernanceState}
              disabled={loading || Boolean(busy)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Sync
            </button>

            <button
              type="button"
              onClick={handleValidateConfig}
              disabled={loading || Boolean(busy)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 shadow-sm hover:bg-indigo-100 disabled:opacity-60"
            >
              {busy === 'validate' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileCheck2 className="h-3.5 w-3.5" />}
              Validate
            </button>

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={loading || Boolean(busy) || !isFormDirty}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-200 disabled:opacity-50"
            >
              {busy === 'save_draft' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Draft
            </button>

            <button
              type="button"
              onClick={() => {
                setPublishReason('');
                setPublishModalOpen(true);
              }}
              disabled={loading || Boolean(busy) || (!isDraftModified && !isFormDirty)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              Publish Configuration
            </button>
          </div>
        </div>

        {/* Published Metadata Bar */}
        {publishedConfig && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <div className="flex flex-wrap items-center gap-4">
              <span>
                <strong>Active Version:</strong> v{publishedConfig.version}
              </span>
              <span>
                <strong>Published By:</strong> {publishedConfig.updatedByEmail || 'Super Admin'}
              </span>
              <span>
                <strong>Published At:</strong> {new Date(publishedConfig.updatedAt).toLocaleString()}
              </span>
            </div>
            {publishedConfig.reason && (
              <div className="max-w-md truncate text-slate-600" title={publishedConfig.reason}>
                <strong>Justification:</strong> &ldquo;{publishedConfig.reason}&rdquo;
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notifications & Warnings */}
      {notice && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {conflictError && (
        <div className="flex flex-col gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 font-bold">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
            <span>{conflictError}</span>
          </div>
          <button
            onClick={loadGovernanceState}
            className="inline-flex items-center gap-1 rounded-xl bg-amber-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-800 shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reload Latest Version
          </button>
        </div>
      )}

      {/* Validation Result Box */}
      {validationResult && (
        <div
          className={`rounded-2xl border p-4 text-xs ${
            validationResult.valid
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2 font-black">
            {validationResult.valid ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Configuration Validation Passed (0 errors, {validationResult.warnings.length} warnings)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <span>Configuration Validation Failed ({validationResult.errors.length} issue(s) detected)</span>
              </>
            )}
          </div>
          {validationResult.errors.length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-1 pl-2 font-medium text-rose-800">
              {validationResult.errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          )}
          {validationResult.warnings.length > 0 && (
            <div className="mt-2 text-amber-800">
              <span className="font-bold">Warnings:</span>
              <ul className="list-inside list-disc space-y-0.5 pl-2 font-medium">
                {validationResult.warnings.map((warn, idx) => (
                  <li key={idx}>{warn}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Sub-Section Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'general' as SubSection, label: 'General & Platform', icon: Settings2 },
          { id: 'lifecycle' as SubSection, label: 'Trial & Lifecycle', icon: Clock },
          { id: 'plans' as SubSection, label: 'Subscription Plans', icon: Layers3 },
          { id: 'thresholds' as SubSection, label: 'Alert & Usage Thresholds', icon: Sliders },
          { id: 'scheduler' as SubSection, label: 'Scheduler Policies', icon: Cpu },
          { id: 'features' as SubSection, label: 'Feature Flags', icon: Sparkles },
          { id: 'history' as SubSection, label: `Version History (${history.length})`, icon: History },
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeSubSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSubSection(item.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Sub-Section Contents */}
      {workingConfig && (
        <div className="space-y-6">
          {/* 1. GENERAL & PLATFORM */}
          {activeSubSection === 'general' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-900">General Platform Settings</h3>
                <p className="text-xs text-slate-500">Core platform branding, contact addresses, and operational availability.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Platform Brand Name</label>
                  <input
                    type="text"
                    value={workingConfig.platformName}
                    onChange={e => updateWorkingConfig(cfg => ({ ...cfg, platformName: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Support Contact Email</label>
                  <input
                    type="email"
                    value={workingConfig.supportEmail}
                    onChange={e => updateWorkingConfig(cfg => ({ ...cfg, supportEmail: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">System Notification Dispatcher Email</label>
                  <input
                    type="email"
                    value={workingConfig.systemNotificationEmail}
                    onChange={e => updateWorkingConfig(cfg => ({ ...cfg, systemNotificationEmail: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Default Platform Currency</label>
                  <select
                    value={workingConfig.defaultCurrency}
                    onChange={e => updateWorkingConfig(cfg => ({ ...cfg, defaultCurrency: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Platform System Timezone</label>
                  <input
                    type="text"
                    value={workingConfig.defaultTimezone}
                    onChange={e => updateWorkingConfig(cfg => ({ ...cfg, defaultTimezone: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Platform Maintenance Mode</span>
                    <span className="text-[11px] text-slate-500">
                      When enabled, non-admin tenant access displays a maintenance banner.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateWorkingConfig(cfg => ({ ...cfg, maintenanceMode: !cfg.maintenanceMode }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      workingConfig.maintenanceMode ? 'bg-rose-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        workingConfig.maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. TRIAL & LIFECYCLE DEFAULTS */}
          {activeSubSection === 'lifecycle' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-900">Tenant Lifecycle & Trial Defaults</h3>
                <p className="text-xs text-slate-500">Configure global trial lengths, grace periods, and data retention windows.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Default Trial Duration (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={workingConfig.defaultTrialDays}
                    onChange={e =>
                      updateWorkingConfig(cfg => ({
                        ...cfg,
                        defaultTrialDays: Math.max(1, parseInt(e.target.value) || 14),
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Applied to newly provisioned tenants without custom trial overrides.</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Trial Grace Period (Days)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={workingConfig.trialGracePeriodDays}
                    onChange={e =>
                      updateWorkingConfig(cfg => ({
                        ...cfg,
                        trialGracePeriodDays: Math.max(0, parseInt(e.target.value) || 3),
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Days after trial expiration before service is suspended.</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Suspension Grace Period (Days)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={workingConfig.suspensionGracePeriodDays}
                    onChange={e =>
                      updateWorkingConfig(cfg => ({
                        ...cfg,
                        suspensionGracePeriodDays: Math.max(0, parseInt(e.target.value) || 7),
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Days in suspended state before lifecycle transitions to cancelled.</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Retention Days After Cancellation
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={workingConfig.retentionDaysAfterCancellation}
                    onChange={e =>
                      updateWorkingConfig(cfg => ({
                        ...cfg,
                        retentionDaysAfterCancellation: Math.max(0, parseInt(e.target.value) || 30),
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Days before an archived/cancelled tenant data is eligible for purging.</p>
                </div>
              </div>
            </div>
          )}

          {/* 3. DEFAULT SUBSCRIPTION PLANS */}
          {activeSubSection === 'plans' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-900">Platform Subscription Plans</h3>
                <p className="text-xs text-slate-500">
                  Authoritative tiers consumed by tenant provisioning, billing calculators, and metered usage quota evaluators.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {workingConfig.plans.map((plan, planIdx) => (
                  <div key={plan.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-indigo-600 px-2 py-0.5 text-[10px] font-black uppercase text-white tracking-wider">
                          {plan.id}
                        </span>
                        <input
                          type="text"
                          value={plan.name}
                          onChange={e => {
                            const val = e.target.value;
                            updateWorkingConfig(cfg => {
                              const nextPlans = [...cfg.plans];
                              nextPlans[planIdx] = { ...nextPlans[planIdx], name: val };
                              return { ...cfg, plans: nextPlans };
                            });
                          }}
                          className="font-black text-slate-900 text-sm bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-indigo-600"
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{plan.status}</span>
                    </div>

                    <input
                      type="text"
                      value={plan.description}
                      onChange={e => {
                        const val = e.target.value;
                        updateWorkingConfig(cfg => {
                          const nextPlans = [...cfg.plans];
                          nextPlans[planIdx] = { ...nextPlans[planIdx], description: val };
                          return { ...cfg, plans: nextPlans };
                        });
                      }}
                      className="w-full text-xs text-slate-600 bg-transparent border-b border-dashed border-slate-200 pb-1 focus:outline-none focus:border-indigo-600"
                    />

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Monthly Price ($)</label>
                        <input
                          type="number"
                          min={0}
                          value={plan.monthlyPrice}
                          onChange={e => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            updateWorkingConfig(cfg => {
                              const nextPlans = [...cfg.plans];
                              nextPlans[planIdx] = { ...nextPlans[planIdx], monthlyPrice: val };
                              return { ...cfg, plans: nextPlans };
                            });
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Annual Price ($)</label>
                        <input
                          type="number"
                          min={0}
                          value={plan.annualPrice}
                          onChange={e => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            updateWorkingConfig(cfg => {
                              const nextPlans = [...cfg.plans];
                              nextPlans[planIdx] = { ...nextPlans[planIdx], annualPrice: val };
                              return { ...cfg, plans: nextPlans };
                            });
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Included Seats</label>
                        <input
                          type="number"
                          min={1}
                          value={plan.includedSeats}
                          onChange={e => {
                            const val = Math.max(1, parseInt(e.target.value) || 1);
                            updateWorkingConfig(cfg => {
                              const nextPlans = [...cfg.plans];
                              nextPlans[planIdx] = { ...nextPlans[planIdx], includedSeats: val };
                              return { ...cfg, plans: nextPlans };
                            });
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-bold text-slate-900"
                        />
                      </div>
                    </div>

                    {/* Limits */}
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">Usage Quota Limits</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-medium text-slate-500 block">Products</label>
                          <input
                            type="number"
                            min={1}
                            value={plan.limits.products}
                            onChange={e => {
                              const val = Math.max(1, parseInt(e.target.value) || 100);
                              updateWorkingConfig(cfg => {
                                const nextPlans = [...cfg.plans];
                                nextPlans[planIdx] = {
                                  ...nextPlans[planIdx],
                                  limits: { ...nextPlans[planIdx].limits, products: val },
                                };
                                return { ...cfg, plans: nextPlans };
                              });
                            }}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-semibold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-medium text-slate-500 block">Orders / Mo</label>
                          <input
                            type="number"
                            min={1}
                            value={plan.limits.ordersMonthly}
                            onChange={e => {
                              const val = Math.max(1, parseInt(e.target.value) || 100);
                              updateWorkingConfig(cfg => {
                                const nextPlans = [...cfg.plans];
                                nextPlans[planIdx] = {
                                  ...nextPlans[planIdx],
                                  limits: { ...nextPlans[planIdx].limits, ordersMonthly: val },
                                };
                                return { ...cfg, plans: nextPlans };
                              });
                            }}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-semibold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-medium text-slate-500 block">Storage GB</label>
                          <input
                            type="number"
                            min={1}
                            value={plan.limits.storageGb}
                            onChange={e => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              updateWorkingConfig(cfg => {
                                const nextPlans = [...cfg.plans];
                                nextPlans[planIdx] = {
                                  ...nextPlans[planIdx],
                                  limits: { ...nextPlans[planIdx].limits, storageGb: val },
                                };
                                return { ...cfg, plans: nextPlans };
                              });
                            }}
                            className="w-full rounded border border-slate-200 p-1.5 text-xs font-semibold text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. ALERT & USAGE THRESHOLDS */}
          {activeSubSection === 'thresholds' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-900">Alert & Operational Thresholds</h3>
                <p className="text-xs text-slate-500">
                  Thresholds consumed by the automated platform health engine and notification escalation systems.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Metered Usage Thresholds</h4>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                      <span>Usage Approaching Warning (%)</span>
                      <span className="text-amber-700">{workingConfig.usageThresholds.usageApproachingThresholdPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={95}
                      value={workingConfig.usageThresholds.usageApproachingThresholdPercent}
                      onChange={e =>
                        updateWorkingConfig(cfg => ({
                          ...cfg,
                          usageThresholds: {
                            ...cfg.usageThresholds,
                            usageApproachingThresholdPercent: parseInt(e.target.value),
                          },
                        }))
                      }
                      className="w-full"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Triggers WARNING alert when tenant monthly order consumption crosses this mark.</p>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                      <span>Usage Limit Violation (%)</span>
                      <span className="text-rose-700">{workingConfig.usageThresholds.usageViolationThresholdPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min={100}
                      max={150}
                      value={workingConfig.usageThresholds.usageViolationThresholdPercent}
                      onChange={e =>
                        updateWorkingConfig(cfg => ({
                          ...cfg,
                          usageThresholds: {
                            ...cfg.usageThresholds,
                            usageViolationThresholdPercent: parseInt(e.target.value),
                          },
                        }))
                      }
                      className="w-full"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Triggers CRITICAL alert when tenant quota is exceeded.</p>
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Health & Escalation SLA Thresholds</h4>

                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Health Risk Score Threshold (0–100)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={90}
                      value={workingConfig.alertThresholds.healthRiskScoreThreshold}
                      onChange={e =>
                        updateWorkingConfig(cfg => ({
                          ...cfg,
                          alertThresholds: {
                            ...cfg.alertThresholds,
                            healthRiskScoreThreshold: Math.max(10, Math.min(90, parseInt(e.target.value) || 60)),
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-900"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Tenants scoring below this threshold generate HEALTH_AT_RISK alerts.</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Provisioning Delay Threshold (Minutes)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={1440}
                      value={workingConfig.alertThresholds.provisioningDelayMinutes}
                      onChange={e =>
                        updateWorkingConfig(cfg => ({
                          ...cfg,
                          alertThresholds: {
                            ...cfg.alertThresholds,
                            provisioningDelayMinutes: Math.max(5, parseInt(e.target.value) || 15),
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-900"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Tenants stuck in provisioning past this limit trigger a CRITICAL alert.</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Critical Alert SLA Escalation (Minutes)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={720}
                      value={workingConfig.alertThresholds.slaCriticalEscalationMinutes}
                      onChange={e =>
                        updateWorkingConfig(cfg => ({
                          ...cfg,
                          alertThresholds: {
                            ...cfg.alertThresholds,
                            slaCriticalEscalationMinutes: Math.max(5, parseInt(e.target.value) || 30),
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Auto-Resolve Cleared Alerts</span>
                      <span className="text-[11px] text-slate-500">Automatically mark alerts RESOLVED when health normalizes.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateWorkingConfig(cfg => ({
                          ...cfg,
                          alertThresholds: {
                            ...cfg.alertThresholds,
                            autoResolveResolvedConditions: !cfg.alertThresholds.autoResolveResolvedConditions,
                          },
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        workingConfig.alertThresholds.autoResolveResolvedConditions ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          workingConfig.alertThresholds.autoResolveResolvedConditions ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. SCHEDULER POLICIES */}
          {activeSubSection === 'scheduler' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-900">Background Scheduler & Orchestration Policies</h3>
                <p className="text-xs text-slate-500">
                  Configure execution frequencies, distributed lock durations, and autonomous orchestration toggles.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Master Background Scheduler</span>
                  <span className="text-[11px] text-slate-500">
                    When disabled, autonomous background sweep timers across instances are halted.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateWorkingConfig(cfg => ({
                      ...cfg,
                      schedulerPolicy: {
                        ...cfg.schedulerPolicy,
                        enabled: !cfg.schedulerPolicy.enabled,
                      },
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    workingConfig.schedulerPolicy.enabled ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      workingConfig.schedulerPolicy.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Health Sweep Frequency (Seconds)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={3600}
                    value={Math.round(workingConfig.schedulerPolicy.healthSweepIntervalMs / 1000)}
                    onChange={e => {
                      const secs = Math.max(10, parseInt(e.target.value) || 60);
                      updateWorkingConfig(cfg => ({
                        ...cfg,
                        schedulerPolicy: {
                          ...cfg.schedulerPolicy,
                          healthSweepIntervalMs: secs * 1000,
                        },
                      }));
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Default 60 seconds. platform-wide health sweep interval.</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Escalation Sweep Frequency (Seconds)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={3600}
                    value={Math.round(workingConfig.schedulerPolicy.escalationSweepIntervalMs / 1000)}
                    onChange={e => {
                      const secs = Math.max(10, parseInt(e.target.value) || 60);
                      updateWorkingConfig(cfg => ({
                        ...cfg,
                        schedulerPolicy: {
                          ...cfg.schedulerPolicy,
                          escalationSweepIntervalMs: secs * 1000,
                        },
                      }));
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Default 60 seconds. SLA escalation checks for open alerts.</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Notification Dispatch Frequency (Seconds)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={600}
                    value={Math.round(workingConfig.schedulerPolicy.notificationSweepIntervalMs / 1000)}
                    onChange={e => {
                      const secs = Math.max(5, parseInt(e.target.value) || 30);
                      updateWorkingConfig(cfg => ({
                        ...cfg,
                        schedulerPolicy: {
                          ...cfg.schedulerPolicy,
                          notificationSweepIntervalMs: secs * 1000,
                        },
                      }));
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Default 30 seconds. Pending dispatch queue processing.</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Distributed Lock Lease Duration (Seconds)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={600}
                    value={Math.round(workingConfig.schedulerPolicy.distributedLockLeaseMs / 1000)}
                    onChange={e => {
                      const secs = Math.max(15, parseInt(e.target.value) || 120);
                      updateWorkingConfig(cfg => ({
                        ...cfg,
                        schedulerPolicy: {
                          ...cfg.schedulerPolicy,
                          distributedLockLeaseMs: secs * 1000,
                        },
                      }));
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Lease duration to prevent multi-instance job collision.</p>
                </div>
              </div>
            </div>
          )}

          {/* 6. FEATURE FLAGS */}
          {activeSubSection === 'features' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-900">Platform Feature Flags</h3>
                <p className="text-xs text-slate-500">
                  Centrally control platform capabilities and toggle system engines in real-time.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  {
                    key: 'enableAutomatedHealthEvaluation',
                    label: 'Automated Health Evaluation',
                    desc: 'Evaluates tenant provisioning, billing, and metered usage conditions continuously.',
                  },
                  {
                    key: 'enableSlaEscalations',
                    label: 'SLA Alert Escalations',
                    desc: 'Escalates unresolved platform alerts to high-severity notification channels.',
                  },
                  {
                    key: 'enableNotificationDispatch',
                    label: 'Notification Dispatch Engine',
                    desc: 'Dispatches queued notifications to administrators and webhooks.',
                  },
                  {
                    key: 'enableSelfServeSignups',
                    label: 'Self-Serve Tenant Onboarding',
                    desc: 'Permits public signups and self-service merchant registration.',
                  },
                  {
                    key: 'enableCustomDomains',
                    label: 'Custom Storefront Domains',
                    desc: 'Allows merchants on Pro and Enterprise tiers to configure custom domains.',
                  },
                  {
                    key: 'enableAdvancedAnalytics',
                    label: 'Advanced Cohort Analytics',
                    desc: 'Enables MRR churn projection models and deep usage telemetry.',
                  },
                ].map(flag => {
                  const isChecked = Boolean(workingConfig.featureFlags[flag.key]);
                  return (
                    <div
                      key={flag.key}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex items-center justify-between"
                    >
                      <div className="pr-4">
                        <span className="text-xs font-bold text-slate-900 block">{flag.label}</span>
                        <span className="text-[11px] text-slate-500">{flag.desc}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateWorkingConfig(cfg => ({
                            ...cfg,
                            featureFlags: {
                              ...cfg.featureFlags,
                              [flag.key]: !isChecked,
                            },
                          }))
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isChecked ? 'bg-indigo-600' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            isChecked ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 7. VERSION HISTORY & ROLLBACK */}
          {activeSubSection === 'history' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">Platform Configuration Version History</h3>
                  <p className="text-xs text-slate-500">
                    Immutable audit records of all published platform configurations with one-click transactional rollback.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadGovernanceState}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh History
                </button>
              </div>

              {history.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                  No historical versions published yet. Current active configuration is baseline v1.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                  {history.map(item => {
                    const isCurrent = item.version === currentVersion;
                    return (
                      <div key={item.version} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/60 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-md px-2 py-0.5 text-xs font-black uppercase ${
                                isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              v{item.version}
                            </span>
                            {isCurrent && (
                              <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                                Current Active
                              </span>
                            )}
                            <span className="text-xs font-semibold text-slate-800">
                              Published by {item.updatedByEmail || 'Super Admin'}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600">
                            <strong>Reason:</strong> &ldquo;{item.reason}&rdquo;
                          </div>

                          <div className="text-[10px] text-slate-400">
                            Published at {new Date(item.publishedAt || item.updatedAt).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => {
                                setRollbackReason('');
                                setRollbackModalTarget(item);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300"
                            >
                              <RotateCcw className="h-3 w-3" /> Rollback to v{item.version}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Pending Changes Footer Bar */}
          {(isDraftModified || isFormDirty) && (
            <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <Clock className="h-4 w-4 text-amber-700 shrink-0" />
                <span>
                  You have uncommitted configuration changes ({diffSummary.length} modified settings).
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100"
                >
                  Discard Changes
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={Boolean(busy) || !isFormDirty}
                  className="rounded-xl border border-amber-400 bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-200"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPublishReason('');
                    setPublishModalOpen(true);
                  }}
                  className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-black text-white hover:bg-indigo-700"
                >
                  Publish Configuration
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: PUBLISH CONFIGURATION */}
      {publishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">Publish Platform Configuration</h3>
              </div>
              <button onClick={() => setPublishModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Publishing activates these settings platform-wide. This creates new authoritative version{' '}
                <span className="font-bold text-indigo-600">v{currentVersion + 1}</span> and an immutable audit log record.
              </p>

              {diffSummary.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 max-h-40 overflow-y-auto space-y-1 text-xs">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Changed Settings:</span>
                  {diffSummary.map((diff, idx) => (
                    <div key={idx} className="font-mono text-[11px] text-slate-700">
                      • {diff}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Mandatory Administrative Justification <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={publishReason}
                  onChange={e => setPublishReason(e.target.value)}
                  placeholder="E.g., Adjusted trial period to 14 days and raised health risk threshold per Q3 ops policy..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Minimum 5 characters. Stored immutably in platform audit history.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setPublishModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPublish}
                disabled={Boolean(busy) || publishReason.trim().length < 5}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy === 'publish' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm & Publish v{currentVersion + 1}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ROLLBACK CONFIGURATION */}
      {rollbackModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-rose-600" />
                <h3 className="text-base font-black text-slate-900">Rollback to Version v{rollbackModalTarget.version}</h3>
              </div>
              <button onClick={() => setRollbackModalTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                This will roll back current settings to historical version{' '}
                <span className="font-bold text-slate-900">v{rollbackModalTarget.version}</span>. A new version{' '}
                <span className="font-bold text-indigo-600">v{currentVersion + 1}</span> will be created and published, preserving all past audit records.
              </p>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <div><strong>Original Publisher:</strong> {rollbackModalTarget.updatedByEmail}</div>
                <div><strong>Original Reason:</strong> &ldquo;{rollbackModalTarget.reason}&rdquo;</div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Mandatory Administrative Justification <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rollbackReason}
                  onChange={e => setRollbackReason(e.target.value)}
                  placeholder="E.g., Reverting threshold adjustments due to false-positive health alerts..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Minimum 5 characters. Stored immutably in platform audit history.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setRollbackModalTarget(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRollback}
                disabled={Boolean(busy) || rollbackReason.trim().length < 5}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-black text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {busy === 'rollback' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm Rollback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
