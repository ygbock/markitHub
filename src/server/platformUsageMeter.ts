import { FieldValue } from 'firebase-admin/firestore';

export const USAGE_METER_COLLECTION = 'tenant_usage_meters';
export const USAGE_EVENT_COLLECTION = 'platform_usage_events';

export type BillableUsageMetric = 'ordersMonthly';

export interface UsageMeterSnapshot {
  tenantId: string;
  period: string;
  ordersMonthly: number;
  updatedAt: string;
}

export interface UsageEventInput {
  tenantId: string;
  metric: BillableUsageMetric;
  quantity: number;
  occurredAt?: string;
  source: string;
  sourceId: string;
  metadata?: Record<string, unknown>;
}

export function usagePeriod(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function usageMeterId(tenantId: string, period: string): string {
  return `${tenantId}__${period}`;
}

export function usageEventId(input: Pick<UsageEventInput, 'tenantId' | 'metric' | 'sourceId'>): string {
  return [input.tenantId, input.metric, input.sourceId]
    .map(value => String(value).replace(/[^a-zA-Z0-9_-]/g, '_'))
    .join('__')
    .slice(0, 120);
}

export function normalizeUsageQuantity(value: unknown): number {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  return Math.floor(quantity);
}

export function buildUsageMeterPatch(metric: BillableUsageMetric, quantity: number, now = new Date().toISOString()) {
  const safeQuantity = normalizeUsageQuantity(quantity);
  if (!safeQuantity) return null;
  return {
    [metric]: FieldValue.increment(safeQuantity),
    updatedAt: now,
  };
}

export function calculateUsagePercent(used: number, limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 0;
  return Math.min(100, Math.max(0, (Math.max(0, used) / limit) * 100));
}

export function usageLimitState(used: number, limit: number): 'healthy' | 'warning' | 'exceeded' {
  const percent = calculateUsagePercent(used, limit);
  if (percent >= 100) return 'exceeded';
  if (percent >= 80) return 'warning';
  return 'healthy';
}

/**
 * Adds one immutable, idempotent usage event and atomically increments the
 * tenant's monthly meter. The deterministic event ID prevents double billing
 * when the same provider event is delivered more than once.
 *
 * Call this inside the same Firestore transaction as the billable mutation.
 */
export function addUsageEventToTransaction(
  db: any,
  transaction: any,
  input: UsageEventInput,
): { eventId: string; period: string } | null {
  const quantity = normalizeUsageQuantity(input.quantity);
  const tenantId = String(input.tenantId || '').trim();
  const sourceId = String(input.sourceId || '').trim();
  if (!tenantId || !sourceId || !quantity) return null;

  const occurredAt = input.occurredAt || new Date().toISOString();
  const period = usagePeriod(new Date(occurredAt));
  const eventId = usageEventId({ tenantId, metric: input.metric, sourceId });
  const meterRef = db.collection(USAGE_METER_COLLECTION).doc(usageMeterId(tenantId, period));
  const eventRef = db.collection(USAGE_EVENT_COLLECTION).doc(eventId);
  const patch = buildUsageMeterPatch(input.metric, quantity, occurredAt);
  if (!patch) return null;

  transaction.set(meterRef, {
    tenantId,
    period,
    [input.metric]: FieldValue.increment(quantity),
    updatedAt: occurredAt,
  }, { merge: true });

  transaction.create(eventRef, {
    id: eventId,
    tenantId,
    period,
    metric: input.metric,
    quantity,
    source: String(input.source || 'unknown'),
    sourceId,
    occurredAt,
    metadata: input.metadata || {},
  });

  return { eventId, period };
}
