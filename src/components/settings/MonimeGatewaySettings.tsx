import React, { useEffect, useState, useCallback } from 'react';
import { 
  ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, 
  Eye, EyeOff, Lock, KeyRound, Globe, Server, 
  Check, Copy, ExternalLink, Zap, AlertTriangle
} from 'lucide-react';
import { 
  SanitizedMonimeConfig, 
  MonimeFormValues, 
  MonimeFormErrors, 
  ConnectionTestResult,
  validateMonimeForm, 
  formatMonimeApiError, 
  formatVerificationTimestamp 
} from './monimeSettingsController';

export default function MonimeGatewaySettings() {
  // Configuration state from GET /api/monime/config
  const [config, setConfig] = useState<SanitizedMonimeConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  // Form values (Secrets are NEVER pre-populated from config)
  const [formValues, setFormValues] = useState<MonimeFormValues>({
    spaceId: '',
    environment: 'test',
    preferredChannel: 'all',
    accessToken: '',
    webhookSecret: '',
  });

  // UI interaction states
  const [formErrors, setFormErrors] = useState<MonimeFormErrors>({});
  const [isRotatingCredentials, setIsRotatingCredentials] = useState(false);
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);

  // Alert and feedback states
  const [authError, setAuthError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Connection test state
  const [testResult, setTestResult] = useState<ConnectionTestResult>({
    status: 'idle',
  });

  /**
   * Load sanitized configuration from GET /api/monime/config.
   * Handles 401/403 authorization states gracefully.
   */
  const loadConfiguration = useCallback(async () => {
    setIsLoadingConfig(true);
    setAuthError(null);
    setGeneralError(null);

    try {
      const response = await fetch('/api/monime/config', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
      });

      if (response.status === 401 || response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        setAuthError(formatMonimeApiError(response.status, errorData));
        setIsLoadingConfig(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setGeneralError(formatMonimeApiError(response.status, errorData));
        setIsLoadingConfig(false);
        return;
      }

      const data: SanitizedMonimeConfig = await response.json();
      setConfig(data);

      // Populate non-sensitive form values only
      setFormValues(prev => ({
        ...prev,
        spaceId: data.spaceId || prev.spaceId || '',
        environment: data.environment === 'production' ? 'live' : 'test',
        preferredChannel: (data.preferredChannel as MonimeFormValues['preferredChannel']) || prev.preferredChannel || 'all',
        // Credentials must remain pristine and empty
        accessToken: '',
        webhookSecret: '',
      }));

      // If configuration is present, default rotation mode to closed
      if (data.configured) {
        setIsRotatingCredentials(false);
      }
    } catch (err: any) {
      setGeneralError(err?.message || 'Network error: Failed to reach the Monime configuration service.');
    } finally {
      setIsLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  /**
   * Test Connection without mutating or creating financial transactions.
   * Calls POST /api/monime/test-connection.
   */
  const handleTestConnection = async () => {
    setTestResult({ status: 'testing' });
    setSuccessNotice(null);
    setGeneralError(null);

    try {
      const response = await fetch('/api/monime/test-connection', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        setAuthError(formatMonimeApiError(response.status, data));
        setTestResult({
          status: 'failed',
          message: formatMonimeApiError(response.status, data),
          statusCode: response.status,
        });
        return;
      }

      if (response.ok && data.success === true) {
        setTestResult({
          status: 'connected',
          message: data.message || 'Monime handshake probe successful. Space and token verified.',
          latencyMs: data.latencyMs,
          timestamp: new Date().toLocaleTimeString(),
          statusCode: 200,
        });
        // Refresh configuration to get updated lastVerifiedAt
        await loadConfiguration();
      } else {
        setTestResult({
          status: 'failed',
          message: data.message || data.error || `Connection test failed with HTTP ${response.status}.`,
          latencyMs: data.latencyMs,
          timestamp: new Date().toLocaleTimeString(),
          statusCode: response.status,
        });
      }
    } catch (err: any) {
      setTestResult({
        status: 'failed',
        message: err?.message || 'Unable to execute Monime connection test. Check network connectivity.',
        timestamp: new Date().toLocaleTimeString(),
        statusCode: 0,
      });
    }
  };

  /**
   * Save or rotate Monime configuration via PUT /api/monime/config.
   * Validates inputs, clears sensitive state immediately on success,
   * and displays actionable feedback.
   */
  const handleSaveConfiguration = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessNotice(null);
    setGeneralError(null);

    const isConfigured = Boolean(config?.configured);
    const validation = validateMonimeForm(formValues, {
      isConfigured,
      isRotating: isRotatingCredentials,
    });

    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }
    setFormErrors({});
    setIsSaving(true);

    try {
      const payload: Record<string, any> = {
        monimeSpaceId: formValues.spaceId.trim(),
        monimeMode: formValues.environment,
        monimePreferredChannel: formValues.preferredChannel,
      };

      // Only send tokens if provided (required on initial setup, optional on update)
      if (formValues.accessToken.trim()) {
        payload.monimeAccessToken = formValues.accessToken.trim();
      }
      if (formValues.webhookSecret.trim()) {
        payload.webhookSecret = formValues.webhookSecret.trim();
      }

      const response = await fetch('/api/monime/config', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        setAuthError(formatMonimeApiError(response.status, data));
        setIsSaving(false);
        return;
      }

      if (!response.ok || data.success !== true) {
        setGeneralError(data.error || data.message || `Failed to save configuration (HTTP ${response.status}).`);
        setIsSaving(false);
        return;
      }

      // CRITICAL: Clear sensitive credentials from memory immediately after save
      setFormValues(prev => ({
        ...prev,
        accessToken: '',
        webhookSecret: '',
      }));
      setShowAccessToken(false);
      setShowWebhookSecret(false);
      setIsRotatingCredentials(false);

      setSuccessNotice(
        isRotatingCredentials 
          ? 'Credentials successfully rotated and new webhook registered with Monime.'
          : 'Monime gateway configuration saved and verified securely.'
      );

      // Reload fresh sanitized configuration from server
      await loadConfiguration();
    } catch (err: any) {
      setGeneralError(err?.message || 'Network error: Failed to save Monime configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyWebhookUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const tenantIdentifier = config?.spaceId ? encodeURIComponent(config.spaceId) : 'tenant-id';
    const targetUrl = config?.webhookUrl || `${origin}/api/monime/webhook/${tenantIdentifier}`;

    navigator.clipboard.writeText(targetUrl).then(() => {
      setCopiedWebhookUrl(true);
      setTimeout(() => setCopiedWebhookUrl(false), 2500);
    });
  };

  const isConfigured = Boolean(config?.configured);

  return (
    <div 
      className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto"
      id="settings-section-monime"
      role="region"
      aria-label="Monime Payment Gateway Configuration"
    >
      {/* 1. Header & Operational Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Monime Payment Gateway
            </h3>
            {isConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Configured</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Setup Required</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            Configure tenant-isolated Monime credentials, webhook verification, and checkout session routing.
            Sensitive keys are stored with AES-256 server-side encryption and never exposed in the browser.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={!isConfigured || testResult.status === 'testing' || isLoadingConfig}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-600"
            id="monime-test-connection-btn"
            aria-label="Test Monime Connection"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testResult.status === 'testing' ? 'animate-spin text-indigo-600' : 'text-slate-600'}`} aria-hidden="true" />
            <span>{testResult.status === 'testing' ? 'Testing...' : 'Test Connection'}</span>
          </button>

          <button
            type="button"
            onClick={loadConfiguration}
            disabled={isLoadingConfig}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-600"
            title="Refresh Monime Status"
            aria-label="Refresh Monime Status"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingConfig ? 'animate-spin text-indigo-600' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* 2. Global Feedback & Authorization Alerts */}
      {authError && (
        <div 
          className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 text-xs sm:text-sm animate-in fade-in" 
          role="alert"
          aria-live="assertive"
          id="monime-auth-error-banner"
        >
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <span className="font-black text-rose-950 block">Authorization Warning</span>
            <p className="text-rose-800 leading-relaxed">{authError}</p>
          </div>
        </div>
      )}

      {generalError && (
        <div 
          className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-xs sm:text-sm animate-in fade-in" 
          role="alert"
          aria-live="polite"
          id="monime-general-error-banner"
        >
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <span className="font-black text-amber-950 block">Configuration Notice</span>
            <p className="text-amber-800 leading-relaxed">{generalError}</p>
          </div>
        </div>
      )}

      {successNotice && (
        <div 
          className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3 text-xs sm:text-sm animate-in fade-in" 
          role="status"
          aria-live="polite"
          id="monime-success-banner"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <span className="font-black text-emerald-950 block">Action Completed</span>
            <p className="text-emerald-800 leading-relaxed">{successNotice}</p>
          </div>
        </div>
      )}

      {/* 3. Connection Test State Banner */}
      {testResult.status !== 'idle' && (
        <div 
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs animate-in fade-in ${
            testResult.status === 'connected' 
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950' 
              : testResult.status === 'testing'
              ? 'bg-indigo-50/90 border-indigo-200 text-indigo-950'
              : 'bg-rose-50/90 border-rose-200 text-rose-950'
          }`}
          role="status"
          aria-live="polite"
          id="monime-connection-test-result"
        >
          <div className="flex items-start gap-2.5">
            {testResult.status === 'connected' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            {testResult.status === 'testing' && (
              <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin shrink-0 mt-0.5" aria-hidden="true" />
            )}
            {testResult.status === 'failed' && (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-slate-900">
                  {testResult.status === 'connected' && 'Connected'}
                  {testResult.status === 'testing' && 'Testing...'}
                  {testResult.status === 'failed' && 'Connection failed'}
                </span>
                {testResult.timestamp && (
                  <span className="text-[10px] text-slate-500">
                    ({testResult.timestamp})
                  </span>
                )}
                {testResult.latencyMs !== undefined && (
                  <span className="px-2 py-0.5 bg-white rounded-md text-[10px] font-mono font-bold border border-slate-200 shadow-2xs">
                    {testResult.latencyMs}ms Latency
                  </span>
                )}
                {testResult.statusCode && (
                  <span className="px-1.5 py-0.5 bg-white text-slate-700 rounded text-[9px] font-mono font-bold border border-slate-200">
                    HTTP {testResult.statusCode}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {testResult.message || (testResult.status === 'testing' ? 'Executing read-only probe to Monime API...' : '')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Live Gateway Overview Cards (Bento Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Space ID */}
        <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Tenant Space ID</span>
            <Server className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          </div>
          <div className="text-sm font-mono font-black text-slate-900 truncate" title={config?.spaceId || 'Not configured'}>
            {config?.spaceId || 'Not configured'}
          </div>
          <p className="text-[10px] text-slate-500 truncate">
            Monime-Space-Id header
          </p>
        </div>

        {/* Card 2: Environment */}
        <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Environment</span>
            <Globe className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${config?.environment === 'production' ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />
            <span className="text-sm font-black text-slate-900 capitalize">
              {config?.environment === 'production' ? 'Production (Live)' : 'Sandbox (Test)'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            API {config?.version || 'caph.2025-08-23'}
          </p>
        </div>

        {/* Card 3: Webhook Status */}
        <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Webhook Status</span>
            <Zap className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
              config?.webhookConfigured 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-amber-100 text-amber-800'
            }`}>
              {config?.webhookConfigured ? 'Guarded & Active' : 'Not Configured'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500">
            {config?.webhookRegistered ? 'Managed by markitHub' : 'Registration pending'}
          </p>
        </div>

        {/* Card 4: Last Verification */}
        <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Last Handshake</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          </div>
          <div className="text-xs font-bold text-slate-900 truncate">
            {formatVerificationTimestamp(config?.lastVerifiedAt)}
          </div>
          <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
            <span>Status:</span>
            <span className={`font-bold ${
              config?.lastVerificationStatus === 'success' 
                ? 'text-emerald-700' 
                : config?.lastVerificationStatus === 'failed' 
                ? 'text-rose-700' 
                : 'text-slate-500'
            }`}>
              {config?.lastVerificationStatus === 'success' ? 'Verified (200 OK)' : config?.lastVerificationStatus === 'failed' ? 'Probe Failed' : 'Untested'}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Configuration & Mutation Form */}
      <form onSubmit={handleSaveConfiguration} className="space-y-6" id="monime-settings-form">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          
          {/* Space ID Input */}
          <div className="space-y-1.5">
            <label htmlFor="monime-space-id" className="block text-xs font-bold text-slate-800">
              Monime Space ID <span className="text-rose-500">*</span>
            </label>
            <input
              id="monime-space-id"
              name="spaceId"
              type="text"
              value={formValues.spaceId}
              onChange={(e) => {
                setFormValues(prev => ({ ...prev, spaceId: e.target.value }));
                if (formErrors.spaceId) setFormErrors(prev => ({ ...prev, spaceId: undefined }));
              }}
              placeholder="e.g. spc-sl-retail-01"
              autoComplete="off"
              className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm font-mono font-bold focus:ring-2 focus:ring-indigo-600 focus:outline-hidden transition-all ${
                formErrors.spaceId ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
              }`}
              aria-invalid={Boolean(formErrors.spaceId)}
              aria-describedby={formErrors.spaceId ? 'monime-space-id-error' : 'monime-space-id-desc'}
            />
            {formErrors.spaceId ? (
              <p id="monime-space-id-error" className="text-[11px] font-semibold text-rose-600">
                {formErrors.spaceId}
              </p>
            ) : (
              <p id="monime-space-id-desc" className="text-[11px] text-slate-500">
                Tenant Space identifier formatted as <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">spc-...</code>
              </p>
            )}
          </div>

          {/* Environment Mode Selector */}
          <div className="space-y-1.5">
            <label htmlFor="monime-environment" className="block text-xs font-bold text-slate-800">
              Gateway Environment <span className="text-rose-500">*</span>
            </label>
            <select
              id="monime-environment"
              name="environment"
              value={formValues.environment}
              onChange={(e) => setFormValues(prev => ({ ...prev, environment: e.target.value as 'test' | 'live' }))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:outline-hidden transition-all cursor-pointer"
            >
              <option value="test">Sandbox / Test Mode (Simulated payments)</option>
              <option value="live">Production / Live Mode (Real settlement)</option>
            </select>
            <p className="text-[11px] text-slate-500">
              Only use live credentials when deploying to production with verified merchant accounts.
            </p>
          </div>

          {/* Preferred Payment Channel */}
          <div className="md:col-span-2 space-y-1.5">
            <label htmlFor="monime-channel" className="block text-xs font-bold text-slate-800">
              Preferred Storefront Payment Channel
            </label>
            <select
              id="monime-channel"
              name="preferredChannel"
              value={formValues.preferredChannel}
              onChange={(e) => setFormValues(prev => ({ ...prev, preferredChannel: e.target.value as any }))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:outline-hidden transition-all cursor-pointer"
            >
              <option value="all">All Supported Channels (Mobile Money, Cards, Bank, Code)</option>
              <option value="mobile_money">Mobile Money Primary (Orange Money & Afrimoney)</option>
              <option value="card">Credit & Debit Cards (Visa & Mastercard)</option>
              <option value="bank_transfer">Direct Bank Transfer</option>
              <option value="payment_code">Payment Code (USSD / OTC)</option>
            </select>
            <p className="text-[11px] text-slate-500">
              Select the default payment experience presented during customer checkout on the storefront.
            </p>
          </div>

        </div>

        {/* 6. Secure Credential Vault & Rotation Section */}
        <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/90 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/70">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-600" aria-hidden="true" />
                <h4 className="text-xs sm:text-sm font-black text-slate-900">
                  Gateway Credentials & API Secret Vault
                </h4>
              </div>
              <p className="text-[11px] text-slate-500">
                Credentials are encrypted at rest with AES-256-GCM. The browser never reads decrypted keys back.
              </p>
            </div>

            {isConfigured && !isRotatingCredentials && (
              <button
                type="button"
                onClick={() => setIsRotatingCredentials(true)}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-600"
                id="monime-rotate-credentials-btn"
              >
                <KeyRound className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
                <span>Rotate Credentials</span>
              </button>
            )}

            {isRotatingCredentials && (
              <button
                type="button"
                onClick={() => {
                  setIsRotatingCredentials(false);
                  setFormValues(prev => ({ ...prev, accessToken: '', webhookSecret: '' }));
                  setFormErrors({});
                }}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel Rotation
              </button>
            )}
          </div>

          {/* Credential Status Box when already configured */}
          {isConfigured && !isRotatingCredentials ? (
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                  <Check className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">
                    Credentials Active: Stored Encrypted Server-Side
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Token: ●●●●●●●●●●●● • Webhook Secret: ●●●●●●●●●●●●
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-black text-[10px] uppercase tracking-wider border border-emerald-200 shrink-0">
                Configured
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Rotation Warning Banner */}
              {isRotatingCredentials && (
                <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 flex items-start gap-2.5 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="space-y-0.5">
                    <span className="font-black">Credential Rotation Warning</span>
                    <p className="text-amber-850 leading-relaxed text-[11px]">
                      Replacing credentials will invalidate current tokens and trigger automated webhook re-registration with Monime. Ensure the new access token and secret are active in your Monime Dashboard before saving.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Access Token Input */}
                <div className="space-y-1.5">
                  <label htmlFor="monime-access-token" className="block text-xs font-bold text-slate-800">
                    Monime API Access Token {!isConfigured && <span className="text-rose-500">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      id="monime-access-token"
                      name="accessToken"
                      type={showAccessToken ? 'text' : 'password'}
                      value={formValues.accessToken}
                      onChange={(e) => {
                        setFormValues(prev => ({ ...prev, accessToken: e.target.value }));
                        if (formErrors.accessToken) setFormErrors(prev => ({ ...prev, accessToken: undefined }));
                      }}
                      placeholder={isConfigured ? 'Leave blank to keep current token' : 'Paste Monime Bearer API access token'}
                      autoComplete="new-password"
                      className={`w-full pl-3.5 pr-10 py-2.5 bg-white border rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-hidden transition-all ${
                        formErrors.accessToken ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                      }`}
                      aria-invalid={Boolean(formErrors.accessToken)}
                      aria-describedby={formErrors.accessToken ? 'monime-token-error' : 'monime-token-desc'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAccessToken(!showAccessToken)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md focus-visible:ring-2 focus-visible:ring-indigo-600"
                      aria-label={showAccessToken ? 'Mask access token' : 'Reveal access token'}
                    >
                      {showAccessToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formErrors.accessToken ? (
                    <p id="monime-token-error" className="text-[11px] font-semibold text-rose-600">
                      {formErrors.accessToken}
                    </p>
                  ) : (
                    <p id="monime-token-desc" className="text-[10px] text-slate-500">
                      Passed in <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[9px]">Authorization: Bearer &lt;token&gt;</code> for checkout sessions.
                    </p>
                  )}
                </div>

                {/* Webhook Secret Input */}
                <div className="space-y-1.5">
                  <label htmlFor="monime-webhook-secret" className="block text-xs font-bold text-slate-800">
                    Webhook Signing Secret {!isConfigured && <span className="text-rose-500">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      id="monime-webhook-secret"
                      name="webhookSecret"
                      type={showWebhookSecret ? 'text' : 'password'}
                      value={formValues.webhookSecret}
                      onChange={(e) => {
                        setFormValues(prev => ({ ...prev, webhookSecret: e.target.value }));
                        if (formErrors.webhookSecret) setFormErrors(prev => ({ ...prev, webhookSecret: undefined }));
                      }}
                      placeholder={isConfigured ? 'Leave blank to keep current secret' : 'Minimum 32 characters signing secret'}
                      autoComplete="new-password"
                      className={`w-full pl-3.5 pr-10 py-2.5 bg-white border rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-hidden transition-all ${
                        formErrors.webhookSecret ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                      }`}
                      aria-invalid={Boolean(formErrors.webhookSecret)}
                      aria-describedby={formErrors.webhookSecret ? 'monime-secret-error' : 'monime-secret-desc'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md focus-visible:ring-2 focus-visible:ring-indigo-600"
                      aria-label={showWebhookSecret ? 'Mask webhook secret' : 'Reveal webhook secret'}
                    >
                      {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formErrors.webhookSecret ? (
                    <p id="monime-secret-error" className="text-[11px] font-semibold text-rose-600">
                      {formErrors.webhookSecret}
                    </p>
                  ) : (
                    <p id="monime-secret-desc" className="text-[10px] text-slate-500">
                      Used to cryptographically verify <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[9px]">Monime-Signature</code> (HMAC-SHA256).
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 7. Dedicated Webhook Listener Specification (Non-Sensitive) */}
        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-2.5 text-xs text-indigo-950">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200/60 pb-2">
            <span className="font-bold flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-indigo-600" aria-hidden="true" />
              <span>Dedicated Tenant Webhook Receiver</span>
            </span>
            <button
              type="button"
              onClick={handleCopyWebhookUrl}
              className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
              aria-label="Copy Webhook Endpoint URL"
            >
              {copiedWebhookUrl ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                  <span>Copied Endpoint!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" aria-hidden="true" />
                  <span>Copy Webhook URL</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] text-indigo-900 leading-relaxed">
              Monime automatically dispatches settlement notifications to your tenant webhook endpoint:
            </p>
            <code className="block p-2 rounded-lg bg-indigo-100/80 font-mono text-[11px] text-indigo-950 break-all select-all">
              {config?.webhookUrl || `/api/monime/webhook/${encodeURIComponent(formValues.spaceId || 'tenant-id')}`}
            </code>
          </div>

          <div className="flex items-center gap-4 text-[10px] text-indigo-800 flex-wrap pt-1">
            <span>• Supported Events: <strong className="font-mono">checkout_session.completed</strong>, <strong className="font-mono">payment.completed</strong></span>
            <span>• Minor Units: 1 SLE = 100 minor units (cents mode)</span>
          </div>
        </div>

        {/* 8. Form Submit & Cancel Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          {isRotatingCredentials && (
            <button
              type="button"
              onClick={() => {
                setIsRotatingCredentials(false);
                setFormValues(prev => ({ ...prev, accessToken: '', webhookSecret: '' }));
                setFormErrors({});
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={isSaving || isLoadingConfig}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-600"
            id="monime-save-config-btn"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Saving Configuration...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>
                  {isRotatingCredentials ? 'Confirm & Rotate Credentials' : 'Save Monime Configuration'}
                </span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
