import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  computeAuditIntegrityHash,
  normalizeAuditEvent,
  sanitizeForCsvFormulaInjection,
  categorizeAuditEvent,
} from './platformAuditControlPlane';

function baseEvent() {
  return {
    id: 'audit_test_1',
    timestamp: '2026-09-16T00:00:00.000Z',
    actorUid: 'admin_1',
    actorEmail: 'admin@example.com',
    actorName: 'Admin',
    actorRole: 'SUPER_ADMIN',
    tenantId: 'tenant_1',
    module: 'Platform Identity & Access',
    action: 'PLATFORM_ADMIN_ROLE_CHANGED',
    targetType: 'platform_administrator',
    targetId: 'admin_2',
    targetName: 'Operator',
    severity: 'warning' as const,
    result: 'success' as const,
    category: 'ADMIN_ACTION' as const,
    reason: 'Approved administrative change',
    details: 'Changed role from support to operations.',
    previousState: { role: 'PLATFORM_SUPPORT' },
    newState: { role: 'PLATFORM_OPERATIONS' },
    metadata: { requestId: 'req_1', source: 'console' },
    correlationId: 'corr_1',
    requestId: 'req_1',
    source: 'console',
  };
}

test('v2 audit integrity hash changes when security-relevant payload changes', () => {
  const original = baseEvent();
  const hash = computeAuditIntegrityHash(original);
  const detailsChanged = computeAuditIntegrityHash({ ...original, details: 'Tampered details' });
  const stateChanged = computeAuditIntegrityHash({
    ...original,
    newState: { role: 'SUPER_ADMIN' },
  });
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.notEqual(hash, detailsChanged);
  assert.notEqual(hash, stateChanged);
});

test('audit normalization validates v2 signatures', () => {
  const original = baseEvent();
  const integrityHash = computeAuditIntegrityHash(original);
  const event = normalizeAuditEvent({ id: original.id, data: () => ({ ...original, integrityVersion: 2, integrityHash }) });
  assert.equal(event.integrityVersion, 2);
  assert.equal(event.integrityStatus, 'VALID');

  const tampered = normalizeAuditEvent({
    id: original.id,
    data: () => ({ ...original, integrityVersion: 2, integrityHash, details: 'Tampered details' }),
  });
  assert.equal(tampered.integrityStatus, 'INVALID');
});

test('legacy v1 audit signatures remain verifiable after v2 rollout', () => {
  const original = baseEvent();
  const legacyFields = [
    original.id,
    original.timestamp,
    original.actorUid,
    original.action,
    original.module,
    original.result,
    original.severity,
    original.reason,
    original.tenantId,
    original.targetType,
    original.targetId,
    original.correlationId,
  ];
  const integrityHash = createHash('sha256').update(legacyFields.join('||'), 'utf8').digest('hex');
  const event = normalizeAuditEvent({
    id: original.id,
    data: () => ({ ...original, integrityHash }),
  });
  assert.equal(event.integrityVersion, 1);
  assert.equal(event.integrityStatus, 'VALID');
});

test('CSV export sanitizer protects spreadsheet formulas and quotes fields', () => {
  assert.equal(sanitizeForCsvFormulaInjection('=SUM(A1:A2)'), "'=SUM(A1:A2)");
  assert.equal(sanitizeForCsvFormulaInjection('+malicious'), "'+malicious");
  assert.equal(sanitizeForCsvFormulaInjection('normal,value'), '"normal,value"');
  assert.equal(sanitizeForCsvFormulaInjection('normal"value'), '"normal""value"');
});

test('audit categorization distinguishes automated, security, and admin events', () => {
  assert.equal(categorizeAuditEvent({ action: 'BREAK_GLASS_GRANTED', module: 'Platform Identity & Access' }), 'SECURITY_EVENT');
  assert.equal(categorizeAuditEvent({ action: 'SCHEDULED_HEALTH_SWEEP', module: 'Operations', source: 'scheduler' }), 'AUTOMATED_ACTION');
  assert.equal(categorizeAuditEvent({ action: 'PLATFORM_ADMIN_UPDATED', module: 'Platform Identity & Access' }), 'ADMIN_ACTION');
});
