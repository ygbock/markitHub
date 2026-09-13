/**
 * Monime Settings Controller & Validation Utilities
 * Pure functions for state transformation, validation, security assertions,
 * and API integration for tenant-facing Monime payment settings.
 */

export interface SanitizedMonimeConfig {
  configured: boolean;
  provider: 'monime';
  environment?: 'sandbox' | 'production';
  spaceId?: string | null;
  webhookConfigured?: boolean;
  webhookRegistered?: boolean;
  webhookManaged?: boolean;
  webhookUrl?: string | null;
  preferredChannel?: string;
  version?: string;
  lastVerifiedAt?: string | null;
  lastVerificationStatus?: 'success' | 'failed' | null;
}

export interface MonimeFormValues {
  spaceId: string;
  environment: 'test' | 'live';
  preferredChannel: 'all' | 'mobile_money' | 'card' | 'bank_transfer' | 'payment_code';
  accessToken: string;
  webhookSecret: string;
}

export interface MonimeFormErrors {
  spaceId?: string;
  accessToken?: string;
  webhookSecret?: string;
}

export interface ConnectionTestResult {
  status: 'idle' | 'testing' | 'connected' | 'failed';
  message?: string;
  latencyMs?: number;
  timestamp?: string;
  statusCode?: number;
}

/**
 * Validates Monime configuration inputs before mutation.
 * Enforces strict Space ID syntax, token length, and webhook secret length.
 */
export function validateMonimeForm(
  values: MonimeFormValues,
  options: { isConfigured: boolean; isRotating: boolean }
): { valid: boolean; errors: MonimeFormErrors } {
  const errors: MonimeFormErrors = {};
  const trimmedSpaceId = values.spaceId.trim();

  // Space ID validation
  if (!trimmedSpaceId) {
    errors.spaceId = 'Monime Space ID is required.';
  } else if (!/^spc-[A-Za-z0-9_-]{3,64}$/.test(trimmedSpaceId)) {
    errors.spaceId = 'Space ID must start with "spc-" followed by 3-64 alphanumeric or dash/underscore characters.';
  }

  // Access Token validation
  const needsToken = !options.isConfigured || options.isRotating;
  const token = values.accessToken.trim();

  if (needsToken && !token && !options.isConfigured) {
    errors.accessToken = 'Monime API access token is required for initial configuration.';
  } else if (token && token.length < 20) {
    errors.accessToken = 'Access token must be at least 20 characters.';
  } else if (token && token.length > 1000) {
    errors.accessToken = 'Access token is too long (maximum 1000 characters).';
  }

  // Webhook Secret validation
  const needsSecret = !options.isConfigured || options.isRotating;
  const secret = values.webhookSecret.trim();

  if (needsSecret && !secret && !options.isConfigured) {
    errors.webhookSecret = 'Webhook signing secret is required for initial configuration.';
  } else if (secret && (secret.length < 32 || secret.length > 256)) {
    errors.webhookSecret = 'Webhook signing secret must be between 32 and 256 characters.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Maps sanitized configuration to form state.
 * CRITICAL SECURITY INVARIANT: Credential fields (accessToken, webhookSecret)
 * MUST NEVER be populated from the config response.
 */
export function mapConfigToFormValues(
  config: SanitizedMonimeConfig | null,
  currentValues?: Partial<MonimeFormValues>
): MonimeFormValues {
  return {
    spaceId: config?.spaceId || currentValues?.spaceId || '',
    environment: config?.environment === 'production' ? 'live' : 'test',
    preferredChannel: (config?.preferredChannel as MonimeFormValues['preferredChannel']) || 'all',
    // NEVER populate secrets from config
    accessToken: '',
    webhookSecret: '',
  };
}

/**
 * Transforms HTTP error responses into safe, actionable user messages.
 * Never leaks raw tokens, secrets, or internal stack traces.
 */
export function formatMonimeApiError(status: number, responseBody?: any): string {
  if (status === 401) {
    return 'Authentication expired or invalid. Please sign in again with an authorized administrator account.';
  }
  if (status === 403) {
    return 'Permission denied: Administrator role with "system.settings" permission is required to manage Monime settings.';
  }
  if (status === 400) {
    return responseBody?.error || responseBody?.message || 'Invalid Monime configuration parameters. Please check your inputs.';
  }
  if (status === 404) {
    return 'Monime gateway endpoint not found. Please verify that the gateway service is available.';
  }
  if (status === 503) {
    return 'Durable configuration storage is temporarily unavailable. Please try again shortly.';
  }
  return responseBody?.error || responseBody?.message || 'An unexpected error occurred while communicating with the Monime service.';
}

/**
 * Formats a verified timestamp for readable display in the UI.
 */
export function formatVerificationTimestamp(isoString?: string | null): string {
  if (!isoString) return 'Never verified';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Never verified';
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Never verified';
  }
}
