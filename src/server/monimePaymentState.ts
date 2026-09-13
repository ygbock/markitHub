import crypto from 'node:crypto';

export type MonimePaymentStatus = 'pending' | 'completed' | 'paid' | 'failed' | 'cancelled' | 'expired';

const TERMINAL = new Set<MonimePaymentStatus>(['paid', 'completed', 'failed', 'cancelled', 'expired']);

export function canTransitionMonimePayment(from: MonimePaymentStatus | string | undefined, to: MonimePaymentStatus): boolean {
  const current = String(from || 'pending').toLowerCase() as MonimePaymentStatus;
  if (current === to) return true;
  if (TERMINAL.has(current)) return false;
  return to === 'completed' || to === 'paid' || to === 'failed' || to === 'cancelled' || to === 'expired';
}

export function validateMonimeSettlement(input: { tenantId: string; sessionTenantId: string; orderTenantId: string; sessionAmount: number; orderAmount: number; sessionCurrency: string; orderCurrency?: string }) {
  if (!input.tenantId || input.sessionTenantId !== input.tenantId || input.orderTenantId !== input.tenantId) return { valid: false, reason: 'tenant_mismatch' as const };
  if (!Number.isFinite(input.sessionAmount) || !Number.isFinite(input.orderAmount) || Math.abs(input.sessionAmount - input.orderAmount) > 0.01) return { valid: false, reason: 'amount_mismatch' as const };
  if (input.orderCurrency && input.sessionCurrency.toUpperCase() !== input.orderCurrency.toUpperCase()) return { valid: false, reason: 'currency_mismatch' as const };
  return { valid: true as const };
}

export function buildMonimeCheckoutUrls(input: {
  appUrl: string;
  orderId: string;
  successUrl?: string;
  cancelUrl?: string;
}) {
  const baseAppUrl = (input.appUrl || '').trim().replace(/\/+$/, '');
  if (!baseAppUrl) {
    throw new Error('APP_URL is not configured on the server.');
  }

  let success: URL;
  let cancel: URL;

  try {
    success = input.successUrl ? new URL(String(input.successUrl), baseAppUrl) : new URL('/checkout/success', baseAppUrl);
    if (!input.successUrl) {
      success.searchParams.set('orderId', String(input.orderId));
    }
  } catch {
    success = new URL('/checkout/success', baseAppUrl);
    success.searchParams.set('orderId', String(input.orderId));
  }

  try {
    cancel = input.cancelUrl ? new URL(String(input.cancelUrl), baseAppUrl) : new URL('/checkout/cancel', baseAppUrl);
    if (!input.cancelUrl) {
      cancel.searchParams.set('orderId', String(input.orderId));
    }
  } catch {
    cancel = new URL('/checkout/cancel', baseAppUrl);
    cancel.searchParams.set('orderId', String(input.orderId));
  }

  return {
    success_url: success.toString(),
    cancel_url: cancel.toString(),
    successUrl: success.toString(),
    cancelUrl: cancel.toString(),
  };
}

/**
 * Strips all sensitive credentials from gateway configuration before returning to browser.
 * Access tokens, webhook secrets, and decryption keys are NEVER returned.
 */
export function sanitizeMonimeConfigResponse(data: any) {
  return {
    configured: Boolean(data?.monimeSpaceId && data?.monimeAccessToken && data?.webhookSecret),
    provider: 'monime' as const,
    environment: data?.monimeMode === 'live' ? 'production' : 'sandbox',
    spaceId: data?.monimeSpaceId ? String(data.monimeSpaceId) : null,
    webhookConfigured: Boolean(data?.webhookSecret),
    preferredChannel: data?.monimePreferredChannel || 'all',
    version: data?.monimeVersion || 'caph.2025-08-23',
    lastVerifiedAt: data?.lastVerifiedAt || null,
    lastVerificationStatus: data?.lastVerificationStatus || null,
    webhookRegistered: Boolean(data?.monimeWebhookId),
    webhookManaged: Boolean(data?.webhookManaged),
    webhookUrl: data?.monimeWebhookUrl || null,
  };
}

/**
 * Validates gateway configuration mutation requests.
 * Enforces tenant scoping, authorization permissions, and strict parameter schemas.
 */
export function validateMonimeConfigMutation(input: {
  authTenantId: string;
  bodyTenantId?: string;
  permissions?: string[];
  spaceId?: string;
  accessToken?: string;
  webhookSecret?: string;
  hasExistingToken?: boolean;
  hasExistingWebhookSecret?: boolean;
}) {
  const { authTenantId, bodyTenantId, permissions = [], spaceId = '', accessToken = '', webhookSecret = '', hasExistingToken, hasExistingWebhookSecret } = input;

  if (!authTenantId) {
    return { valid: false as const, statusCode: 401, error: 'Authentication required.' };
  }

  if (bodyTenantId && bodyTenantId !== authTenantId) {
    return { valid: false as const, statusCode: 403, error: 'Cross-tenant configuration modification is forbidden.' };
  }

  if (!permissions.includes('system.settings')) {
    return { valid: false as const, statusCode: 403, error: 'Permission system.settings required.' };
  }

  const trimmedSpaceId = String(spaceId).trim();
  if (!/^spc-[A-Za-z0-9_-]{3,64}$/.test(trimmedSpaceId)) {
    return { valid: false as const, statusCode: 400, error: 'Monime Space ID must match the required spc-... format.' };
  }

  const trimmedToken = String(accessToken).trim();
  const trimmedSecret = String(webhookSecret).trim();

  if (!trimmedToken && !hasExistingToken) {
    return { valid: false as const, statusCode: 400, error: 'A Monime API access token is required for initial setup.' };
  }
  if (!trimmedSecret && !hasExistingWebhookSecret) {
    return { valid: false as const, statusCode: 400, error: 'A webhook verification secret of at least 32 characters is required for initial setup.' };
  }
  if (trimmedToken && trimmedToken.length < 20) {
    return { valid: false as const, statusCode: 400, error: 'Monime API access token appears invalid.' };
  }
  if (trimmedSecret && (trimmedSecret.length < 32 || trimmedSecret.length > 256)) {
    return { valid: false as const, statusCode: 400, error: 'Webhook verification secret must be between 32 and 256 characters.' };
  }

  return {
    valid: true as const,
    sanitized: {
      spaceId: trimmedSpaceId,
      accessToken: trimmedToken || undefined,
      webhookSecret: trimmedSecret || undefined,
    }
  };
}

/**
 * Calculates credential rotation state for tenant Monime settings.
 */
export function calculateMonimeCredentialRotation(input: {
  incomingAccessToken?: string;
  incomingWebhookSecret?: string;
  existingWebhookId?: string;
}) {
  const isRotatingToken = Boolean(input.incomingAccessToken && input.incomingAccessToken.trim().length > 0);
  const isRotatingWebhookSecret = Boolean(input.incomingWebhookSecret && input.incomingWebhookSecret.trim().length > 0);
  const requiresWebhookRecreation = isRotatingWebhookSecret && Boolean(input.existingWebhookId);

  return {
    isRotatingToken,
    isRotatingWebhookSecret,
    requiresWebhookRecreation,
    shouldDisablePreviousWebhook: requiresWebhookRecreation,
  };
}

/**
 * Prepares webhook registration parameters verifying tenant Space isolation and Idempotency key.
 */
export function buildMonimeWebhookRegistrationPayload(input: {
  tenantId: string;
  spaceId: string;
  webhookSecret: string;
  webhookBaseUrl: string;
  accessToken: string;
}) {
  const base = String(input.webhookBaseUrl || '').trim().replace(/\/+$/, '');
  if (!base) {
    throw new Error('MONIME_WEBHOOK_BASE_URL (or APP_URL) is not configured on the server.');
  }
  const webhookUrl = `${base}/api/monime/webhook/${encodeURIComponent(input.tenantId)}`;
  const idempotencyKey = crypto.createHash('sha256').update(`${input.tenantId}:${input.spaceId}:${input.webhookSecret}`).digest('hex').slice(0, 64);

  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${input.accessToken}`,
      'Monime-Space-Id': input.spaceId,
      'Monime-Version': 'caph.2025-08-23',
      'Idempotency-Key': idempotencyKey,
    },
    body: {
      name: 'markitHub Payment Webhook',
      url: webhookUrl,
      apiRelease: 'caph',
      events: ['payment.completed', 'payment.failed', 'checkout_session.completed'],
      enabled: true,
      verificationMethod: { type: 'HS256', secret: input.webhookSecret },
      metadata: { tenantId: input.tenantId, managedBy: 'markitHub' },
    },
    webhookUrl,
  };
}

/**
 * Verifies that connection test requests use non-mutating read operations.
 */
export function isMonimeConnectionTestNonMutating(method: string, path: string): boolean {
  return method.toUpperCase() === 'GET' && path.includes('/v1/webhooks') && !path.includes('create') && !path.includes('charge');
}

/**
 * Validates incoming Monime Webhook HMAC signature with replay window checking.
 */
export function verifyMonimeWebhookSignature(input: {
  signatureHeader: string;
  rawBody: Buffer | string;
  secret: string;
  toleranceMs?: number;
  nowMs?: number;
}): { valid: boolean; error?: string } {
  const { signatureHeader, rawBody, secret, toleranceMs = 5 * 60 * 1000, nowMs = Date.now() } = input;
  if (!signatureHeader) return { valid: false, error: 'Missing Monime-Signature header.' };
  if (!secret || secret.length < 32) return { valid: false, error: 'Webhook secret is unconfigured or too short.' };

  const timestampMatch = signatureHeader.match(/(?:^|,)t=(\d+)/);
  const signatureMatch = signatureHeader.match(/(?:^|,)v1=([a-fA-F0-9]+)/);
  if (!timestampMatch || !signatureMatch) {
    return { valid: false, error: 'Invalid Monime-Signature format.' };
  }

  const timestamp = Number(timestampMatch[1]);
  if (!Number.isSafeInteger(timestamp)) {
    return { valid: false, error: 'Invalid webhook timestamp.' };
  }
  const timestampMs = timestamp < 100000000000 ? timestamp * 1000 : timestamp;
  if (Math.abs(nowMs - timestampMs) > toleranceMs) {
    return { valid: false, error: 'Expired webhook signature.' };
  }

  const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), 'utf8');
  const signedPayload = Buffer.concat([Buffer.from(String(timestamp)), Buffer.from('.'), bodyBuffer]);
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  const provided = signatureMatch[1].toLowerCase();

  if (provided.length !== expected.length) {
    return { valid: false, error: 'Invalid webhook signature length.' };
  }

  const valid = crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  return valid ? { valid: true } : { valid: false, error: 'Invalid webhook signature.' };
}

/**
 * Reconciles incoming webhook event amounts and currencies against the server-authoritative session and order.
 */
export function reconcileMonimeWebhookSettlement(input: {
  webhookTenantId: string;
  sessionTenantId: string;
  orderTenantId: string;
  webhookAmount: number;
  sessionAmount: number;
  orderAmount: number;
  webhookCurrency?: string;
  sessionCurrency: string;
  orderCurrency?: string;
}) {
  if (input.webhookTenantId !== input.sessionTenantId || input.sessionTenantId !== input.orderTenantId) {
    return { valid: false as const, reason: 'tenant_mismatch' as const };
  }

  // Monime sends amounts in minor units (e.g. cents * 100) or standard units
  const isCentsMatch = Math.round(input.webhookAmount) === Math.round(input.sessionAmount * 100);
  const isExactMatch = Math.abs(input.webhookAmount - input.sessionAmount) <= 0.01;
  if (!isCentsMatch && !isExactMatch) {
    return { valid: false as const, reason: 'amount_mismatch' as const };
  }

  if (Math.abs(input.sessionAmount - input.orderAmount) > 0.01) {
    return { valid: false as const, reason: 'order_session_amount_mismatch' as const };
  }

  if (input.webhookCurrency && input.webhookCurrency.toUpperCase() !== input.sessionCurrency.toUpperCase()) {
    return { valid: false as const, reason: 'webhook_currency_mismatch' as const };
  }

  if (input.orderCurrency && input.orderCurrency.toUpperCase() !== input.sessionCurrency.toUpperCase()) {
    return { valid: false as const, reason: 'order_currency_mismatch' as const };
  }

  return { valid: true as const };
}

