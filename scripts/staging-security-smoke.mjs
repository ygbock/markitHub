#!/usr/bin/env node

/**
 * Live staging security smoke test.
 *
 * Required:
 *   STAGING_URL
 *   STAGING_AUDIT_TOKEN
 *
 * Optional:
 *   STAGING_SUSPENDED_TOKEN
 *   STAGING_NON_AUDIT_TOKEN
 *
 * The optional tokens are used to verify the expected 403 controls.
 * No mutation endpoints are exercised by this script; staging data is not changed.
 */

const baseUrl = String(process.env.STAGING_URL || '').replace(/\/$/, '');
const auditToken = String(process.env.STAGING_AUDIT_TOKEN || '').trim();
const suspendedToken = String(process.env.STAGING_SUSPENDED_TOKEN || '').trim();
const nonAuditToken = String(process.env.STAGING_NON_AUDIT_TOKEN || '').trim();

if (!baseUrl || !auditToken) {
  console.error('Missing STAGING_URL or STAGING_AUDIT_TOKEN.');
  process.exit(2);
}

let failures = 0;

async function request(path, token) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${path}`, { headers });
  let body = null;
  try { body = await response.json(); } catch {}
  return { status: response.status, body };
}

function assertStatus(name, actual, expected) {
  if (actual !== expected) {
    failures += 1;
    console.error(`FAIL  ${name}: expected HTTP ${expected}, received ${actual}`);
    return false;
  }
  console.log(`PASS  ${name}: HTTP ${actual}`);
  return true;
}

function assert(condition, name, detail = '') {
  if (!condition) {
    failures += 1;
    console.error(`FAIL  ${name}${detail ? `: ${detail}` : ''}`);
    return;
  }
  console.log(`PASS  ${name}`);
}

console.log(`Staging security smoke test: ${baseUrl}`);

const health = await request('/api/health');
assertStatus('public health endpoint', health.status, 200);
assert(health.body?.status === 'ok' || health.body?.status === 'healthy',
  'health payload reports healthy service');

const unauthenticated = await request('/api/tenant/audit?page=1&pageSize=25');
assertStatus('audit endpoint rejects unauthenticated callers', unauthenticated.status, 401);

const authorized = await request('/api/tenant/audit?page=1&pageSize=25', auditToken);
if (assertStatus('authorized audit caller can read telemetry', authorized.status, 200)) {
  assert(Array.isArray(authorized.body?.events), 'audit response contains events array');
  assert(typeof authorized.body?.metrics === 'object' && authorized.body.metrics !== null,
    'audit response contains authoritative metrics');
  assert(Number(authorized.body?.pageSize) <= 100, 'audit page size is bounded to 100');
}

const spoofed = await request(
  '/api/tenant/audit?page=1&pageSize=25&tenantId=foreign-tenant',
  auditToken,
);
if (authorized.status === 200) {
  assertStatus('tenantId query spoofing does not break authorized access', spoofed.status, 200);
  assert(
    Array.isArray(spoofed.body?.events),
    'spoofed request still returns a tenant-scoped audit response',
  );
  assert(
    !spoofed.body.events.some(event => event.tenantId === 'foreign-tenant'),
    'foreign tenant records are absent from spoofed audit response',
  );
}

if (suspendedToken) {
  const suspended = await request('/api/tenant/audit?page=1&pageSize=25', suspendedToken);
  assertStatus('suspended staff is denied audit access', suspended.status, 403);
} else {
  console.log('SKIP suspended staff test: STAGING_SUSPENDED_TOKEN not provided.');
}

if (nonAuditToken) {
  const nonAudit = await request('/api/tenant/audit?page=1&pageSize=25', nonAuditToken);
  assertStatus('non-audit staff is denied audit access', nonAudit.status, 403);
} else {
  console.log('SKIP non-audit RBAC test: STAGING_NON_AUDIT_TOKEN not provided.');
}

if (failures) {
  console.error(`\\nStaging security smoke test FAILED: ${failures} assertion(s).`);
  process.exit(1);
}

console.log('\\nStaging security smoke test PASSED.');
