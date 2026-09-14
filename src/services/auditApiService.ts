import type { AuditApiResponse, AuditFilterParams } from '../types';
import { getAuth } from 'firebase/auth';

/**
 * Authoritative client API for querying tenant security audit telemetry.
 * Automatically attaches the active Firebase Bearer ID token for server validation.
 */
export async function fetchTenantAuditLogs(params: AuditFilterParams = {}): Promise<AuditApiResponse> {
  let token: string | null = null;
  try {
    const auth = getAuth();
    if (auth.currentUser) {
      token = await auth.currentUser.getIdToken();
    }
  } catch {
    // Graceful fallback for non-Firebase or simulated environments
  }

  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));
  if (params.startDate) queryParams.set('startDate', params.startDate);
  if (params.endDate) queryParams.set('endDate', params.endDate);
  if (params.module && params.module !== 'All') queryParams.set('module', params.module);
  if (params.action && params.action !== 'All') queryParams.set('action', params.action);
  if (params.result && params.result !== 'All') queryParams.set('result', params.result);
  if (params.severity && params.severity !== 'All') queryParams.set('severity', params.severity);
  if (params.actor) queryParams.set('actor', params.actor);
  if (params.target) queryParams.set('target', params.target);
  if (params.search) queryParams.set('search', params.search);

  const url = `/api/tenant/audit${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch audit logs (HTTP ${response.status})`);
  }

  return response.json();
}
