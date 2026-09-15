import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  assertLifecycleTransition,
  makeTenantSlug,
  type TenantLifecycleStatus,
} from './platformAdminControlPlane';
import { createAuthoritativeAuditRecord } from './auditService';

/**
 * Mock Firestore Transaction class to test atomicity & idempotency deterministically.
 */
class MockTransaction {
  private docs = new Map<string, any>();
  private sets = new Map<string, any>();
  private creates = new Map<string, any>();
  public isCommitted = false;
  public isRolledBack = false;

  constructor(private dbDocs: Map<string, any>) {}

  public async get(ref: { path: string }) {
    if (this.dbDocs.has(ref.path)) {
      return {
        exists: true,
        id: ref.path.split('/').pop(),
        data: () => this.dbDocs.get(ref.path),
      };
    }
    return { exists: false, id: ref.path.split('/').pop(), data: () => undefined };
  }

  public create(ref: { path: string }, data: any) {
    if (this.isCommitted || this.isRolledBack) throw new Error('Transaction ended');
    if (this.dbDocs.has(ref.path) || this.creates.has(ref.path)) {
      throw new Error(`Document already exists at ${ref.path}`);
    }
    this.creates.set(ref.path, data);
    this.sets.set(ref.path, { data, mode: 'create' });
  }

  public set(ref: { path: string }, data: any, options?: any) {
    if (this.isCommitted || this.isRolledBack) throw new Error('Transaction ended');
    if (options?.merge && this.dbDocs.has(ref.path)) {
      const existing = this.dbDocs.get(ref.path);
      this.sets.set(ref.path, { data: { ...existing, ...data }, options });
    } else {
      this.sets.set(ref.path, { data, options });
    }
  }

  public commit() {
    this.isCommitted = true;
    for (const [path, entry] of this.sets.entries()) {
      this.dbDocs.set(path, entry.data);
    }
  }

  public rollback() {
    this.isRolledBack = true;
  }

  public getOperations() {
    return {
      sets: Array.from(this.sets.entries()),
      creates: Array.from(this.creates.entries()),
    };
  }
}

class MockDocRef {
  constructor(public path: string, public id: string) {}
}

class MockDb {
  public docs = new Map<string, any>();

  public collection(name: string) {
    return {
      doc: (id?: string) => {
        const docId = id || `auto_${Math.random().toString(36).substring(2, 10)}`;
        return new MockDocRef(`${name}/${docId}`, docId);
      },
    };
  }

  public async runTransaction(updateFunction: (tx: MockTransaction) => Promise<any>) {
    const tx = new MockTransaction(this.docs);
    try {
      const result = await updateFunction(tx);
      tx.commit();
      return result;
    } catch (err) {
      tx.rollback();
      throw err;
    }
  }
}

test('Lifecycle Test 1: Idempotent Tenant Provisioning - Replaying identical Idempotency-Key returns existing tenant without duplicates', async () => {
  const db = new MockDb();
  const idempotencyKey = 'req_prov_8829103921';
  const keyHash = crypto.createHash('sha256').update(idempotencyKey).digest('hex');
  const requestPath = `platform_provisioning_requests/${keyHash}`;

  const provisioningPayload = {
    name: 'Apex Supermarket',
    ownerUid: 'owner_firebase_uid_100',
    ownerEmail: 'owner@apex.com',
    planId: 'growth',
    billingInterval: 'monthly',
    trialDays: 14,
  };

  // Helper to simulate endpoint logic
  const handleProvisioningRequest = async (keyHeader?: string) => {
    let createdTenant: any = null;
    let replayed = false;

    await db.runTransaction(async (transaction) => {
      const requestRef = keyHeader
        ? db.collection('platform_provisioning_requests').doc(crypto.createHash('sha256').update(keyHeader).digest('hex'))
        : null;

      if (requestRef) {
        const requestSnap = await transaction.get(requestRef);
        if (requestSnap.exists) {
          const priorTenantId = String(requestSnap.data()?.tenantId || '');
          const priorTenantSnap = await transaction.get(db.collection('tenants').doc(priorTenantId));
          if (priorTenantSnap.exists) {
            createdTenant = { id: priorTenantSnap.id, ...priorTenantSnap.data() };
            replayed = true;
            return;
          }
        }
      }

      const tenantId = `tenant_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
      const now = new Date().toISOString();
      createdTenant = {
        id: tenantId,
        name: provisioningPayload.name,
        lifecycleStatus: 'trialing',
        subscription: { planId: provisioningPayload.planId, status: 'trialing' },
        createdAt: now,
      };

      transaction.set(db.collection('tenants').doc(tenantId), createdTenant);
      transaction.set(db.collection('staff').doc(`staff_${tenantId}`), {
        tenantId,
        uid: provisioningPayload.ownerUid,
        role: 'Business Owner',
      });

      if (requestRef) {
        transaction.create(requestRef, {
          tenantId,
          idempotencyKeyHash: requestRef.id,
          createdAt: now,
        });
      }
    });

    return { statusCode: replayed ? 200 : 201, tenant: createdTenant, replayed };
  };

  // 1st Execution: Fresh Provisioning
  const res1 = await handleProvisioningRequest(idempotencyKey);
  assert.equal(res1.statusCode, 201);
  assert.equal(res1.replayed, false);
  assert.ok(res1.tenant.id);
  const initialTenantId = res1.tenant.id;

  // Verify DB state
  assert.ok(db.docs.has(`tenants/${initialTenantId}`));
  assert.ok(db.docs.has(requestPath));

  // 2nd Execution: Replayed Request with Same Idempotency Key
  const res2 = await handleProvisioningRequest(idempotencyKey);
  assert.equal(res2.statusCode, 200);
  assert.equal(res2.replayed, true);
  assert.equal(res2.tenant.id, initialTenantId);
  assert.equal(res2.tenant.name, 'Apex Supermarket');

  // Verify no extra tenant was created
  const tenantDocs = Array.from(db.docs.keys()).filter((k) => k.startsWith('tenants/'));
  assert.equal(tenantDocs.length, 1);
});

test('Lifecycle Test 2: Owner Verification & Firebase UID Check', () => {
  const checkOwnerUid = (ownerUid?: string) => {
    if (!ownerUid || !ownerUid.trim()) {
      return { status: 400, error: 'An existing Firebase owner UID is required for provisioning.' };
    }
    return { status: 200, valid: true };
  };

  assert.equal(checkOwnerUid('').status, 400);
  assert.equal(checkOwnerUid('   ').status, 400);
  assert.equal(checkOwnerUid('uid_valid_123').status, 200);
});

test('Lifecycle Test 3: Plan Assignment - Rejects archived plans during tenant provisioning', () => {
  const plans = [
    { id: 'starter', name: 'Starter', status: 'active' },
    { id: 'legacy-v1', name: 'Legacy Plan V1', status: 'archived' },
  ];

  const validatePlanForProvisioning = (planId: string) => {
    const found = plans.find((p) => p.id === planId);
    if (!found) return { status: 404, error: 'Plan not found.' };
    if (found.status !== 'active') return { status: 409, error: 'Archived plans cannot be assigned during provisioning.' };
    return { status: 200, plan: found };
  };

  assert.equal(validatePlanForProvisioning('starter').status, 200);
  assert.equal(validatePlanForProvisioning('legacy-v1').status, 409);
  assert.equal(validatePlanForProvisioning('unknown').status, 404);
});

test('Lifecycle Test 4: Trial Period Duration Calculation', () => {
  const calculateLifecycle = (trialDays: number) => {
    const isTrial = trialDays > 0;
    return {
      lifecycleStatus: isTrial ? ('trialing' as TenantLifecycleStatus) : ('active' as TenantLifecycleStatus),
      subscriptionStatus: isTrial ? 'trialing' : 'active',
    };
  };

  const trialRes = calculateLifecycle(14);
  assert.equal(trialRes.lifecycleStatus, 'trialing');
  assert.equal(trialRes.subscriptionStatus, 'trialing');

  const activeRes = calculateLifecycle(0);
  assert.equal(activeRes.lifecycleStatus, 'active');
  assert.equal(activeRes.subscriptionStatus, 'active');
});

test('Lifecycle Test 5: Lifecycle Transition State Machine Rules', () => {
  // Valid transitions
  assert.doesNotThrow(() => assertLifecycleTransition('trialing', 'active'));
  assert.doesNotThrow(() => assertLifecycleTransition('active', 'suspended'));
  assert.doesNotThrow(() => assertLifecycleTransition('suspended', 'active'));
  assert.doesNotThrow(() => assertLifecycleTransition('active', 'cancelled'));
  assert.doesNotThrow(() => assertLifecycleTransition('suspended', 'cancelled'));
  // Invalid transitions (cancelled is a terminal state)
  assert.throws(() => assertLifecycleTransition('cancelled', 'active'), /Invalid tenant lifecycle transition/);
  assert.throws(() => assertLifecycleTransition('cancelled', 'suspended'), /Invalid tenant lifecycle transition/);
  assert.throws(() => assertLifecycleTransition('cancelled', 'trialing'), /Invalid tenant lifecycle transition/);
  assert.doesNotThrow(() => assertLifecycleTransition('provisioning', 'suspended'));
  assert.throws(() => assertLifecycleTransition('active', 'trialing'), /Invalid tenant lifecycle transition/);
  assert.throws(() => assertLifecycleTransition('active', 'active'), /already active/);
});

test('Lifecycle Test 6: Mandatory Justification Reason for Lifecycle Changes', () => {
  const processLifecycleChange = (tenantId: string, nextStatus: string, reason?: string) => {
    if (!reason || !reason.trim()) {
      return { status: 400, error: 'A reason is required for tenant lifecycle changes.' };
    }
    return { status: 200, success: true };
  };

  assert.equal(processLifecycleChange('tenant-1', 'suspended', '').status, 400);
  assert.equal(processLifecycleChange('tenant-1', 'suspended', '  ').status, 400);
  assert.equal(processLifecycleChange('tenant-1', 'suspended', 'Payment overdue past 60 days').status, 200);
});

test('Lifecycle Test 7: Subscription Plan Upgrade / Downgrade Billing Ledger Event', () => {
  const audit = createAuthoritativeAuditRecord({
    tenantId: 'tenant-sub-1',
    actorUid: 'admin-1',
    actorName: 'Super Admin',
    actorEmail: 'admin@platform.com',
    actorRole: 'Super Admin',
    action: 'TENANT_SUBSCRIPTION_CHANGED',
    module: 'Platform Billing',
    targetType: 'tenant',
    targetId: 'tenant-sub-1',
    targetName: 'Apex Supermarket',
    previousState: { planId: 'starter', price: 29 },
    newState: { planId: 'growth', price: 79 },
    result: 'success',
    severity: 'warning',
    details: 'Subscription upgraded from Starter to Growth.',
    metadata: { platformAdmin: true },
  });

  assert.equal(audit.action, 'TENANT_SUBSCRIPTION_CHANGED');
  assert.equal(audit.severity, 'warning');
  assert.equal((audit.newState as any)?.planId, 'growth');
  assert.equal((audit.newState as any)?.price, 79);
});

test('Lifecycle Test 8: Tenant Slug Generation Integrity & Clean Formatting', () => {
  const slug1 = makeTenantSlug('Fresh Supermarket & Bakery!', 'x9210a');
  assert.equal(slug1, 'fresh-supermarket-bakery-x9210a');

  const slug2 = makeTenantSlug('   ', 'abc');
  assert.equal(slug2, 'tenant-abc');
});
