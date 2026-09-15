import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import express from 'express';
import { registerPlatformAdminRoutes } from './platformAdminRoutes';
import { assertPlatformAdmin } from './platformAdminAuth';
import { ALL_PERMISSION_KEYS } from '../utils/permissions';
import {
  sanitizeTenantUpdatePayload,
  evaluateActiveTenantMembership,
} from './tenantOwnershipAuth';

/**
 * In-Memory Mock Firestore database supporting transactions, collections, queries, and count aggregations.
 */
class MockDocRef {
  constructor(public path: string, public id: string) {}
}

class MockFirestore {
  public docs = new Map<string, any>();

  public collection(collName: string) {
    const self = this;
    return {
      doc: (id?: string) => {
        const docId = id || `auto_${Math.random().toString(36).substring(2, 10)}`;
        const docPath = `${collName}/${docId}`;
        return {
          path: docPath,
          id: docId,
          get: async () => {
            if (self.docs.has(docPath)) {
              return { exists: true, id: docId, data: () => self.docs.get(docPath) };
            }
            return { exists: false, id: docId, data: () => undefined };
          },
          set: async (data: any, options?: any) => {
            if (options?.merge && self.docs.has(docPath)) {
              const existing = self.docs.get(docPath);
              self.docs.set(docPath, { ...existing, ...data });
            } else {
              self.docs.set(docPath, data);
            }
          },
          update: async (data: any) => {
            const existing = self.docs.get(docPath) || {};
            self.docs.set(docPath, { ...existing, ...data });
          },
        };
      },
      get: async () => {
        const docEntries = Array.from(self.docs.entries())
          .filter(([path]) => path.startsWith(`${collName}/`))
          .map(([path, data]) => ({
            id: path.split('/').pop()!,
            data: () => data,
          }));
        return { docs: docEntries, empty: docEntries.length === 0 };
      },
      where: (field: string, op: string, val: any) => {
        return {
          get: async () => {
            const matched = Array.from(self.docs.entries())
              .filter(([path, data]) => path.startsWith(`${collName}/`) && data?.[field] === val)
              .map(([path, data]) => ({ id: path.split('/').pop()!, data: () => data }));
            return { docs: matched, empty: matched.length === 0 };
          },
          count: () => ({
            get: async () => {
              const matched = Array.from(self.docs.entries())
                .filter(([path, data]) => path.startsWith(`${collName}/`) && data?.[field] === val);
              return { data: () => ({ count: matched.length }) };
            },
          }),
          where: (f2: string, op2: string, v2: any) => {
            return {
              limit: (lim: number) => ({
                get: async () => {
                  const matched = Array.from(self.docs.entries())
                    .filter(([path, data]) => path.startsWith(`${collName}/`) && data?.[field] === val && data?.[f2] === v2)
                    .slice(0, lim)
                    .map(([path, data]) => ({ id: path.split('/').pop()!, data: () => data }));
                  return { docs: matched, empty: matched.length === 0 };
                },
              }),
            };
          },
        };
      },
      orderBy: (_field: string, _direction: string) => ({
        limit: (lim: number) => ({
          get: async () => {
            const matched = Array.from(self.docs.entries())
              .filter(([path]) => path.startsWith(`${collName}/`))
              .slice(0, lim)
              .map(([path, data]) => ({ id: path.split('/').pop()!, data: () => data }));
            return { docs: matched, empty: matched.length === 0 };
          },
        }),
      }),
      count: () => ({
        get: async () => {
          const total = Array.from(self.docs.keys()).filter(path => path.startsWith(`${collName}/`)).length;
          return { data: () => ({ count: total }) };
        },
      }),
    };
  }

  public async runTransaction(updateFn: (tx: any) => Promise<any>) {
    const txWrites = new Map<string, { data: any; merge?: boolean }>();
    const txCreates = new Set<string>();

    const tx = {
      get: async (docRef: { path: string }) => {
        if (txWrites.has(docRef.path)) {
          const entry = txWrites.get(docRef.path)!;
          return { exists: true, id: docRef.path.split('/').pop()!, data: () => entry.data };
        }
        if (this.docs.has(docRef.path)) {
          return { exists: true, id: docRef.path.split('/').pop()!, data: () => this.docs.get(docRef.path) };
        }
        return { exists: false, id: docRef.path.split('/').pop()!, data: () => undefined };
      },
      set: (docRef: { path: string }, data: any, options?: any) => {
        if (options?.merge && (this.docs.has(docRef.path) || txWrites.has(docRef.path))) {
          const existing = txWrites.get(docRef.path)?.data || this.docs.get(docRef.path) || {};
          txWrites.set(docRef.path, { data: { ...existing, ...data }, merge: true });
        } else {
          txWrites.set(docRef.path, { data, merge: false });
        }
      },
      create: (docRef: { path: string }, data: any) => {
        if (this.docs.has(docRef.path) || txCreates.has(docRef.path)) {
          throw new Error(`Document already exists at ${docRef.path}`);
        }
        txCreates.add(docRef.path);
        txWrites.set(docRef.path, { data, merge: false });
      },
      update: (docRef: { path: string }, data: any) => {
        const existing = txWrites.get(docRef.path)?.data || this.docs.get(docRef.path) || {};
        txWrites.set(docRef.path, { data: { ...existing, ...data }, merge: true });
      },
    };

    const res = await updateFn(tx);
    for (const [path, entry] of txWrites.entries()) {
      if (entry.merge && this.docs.has(path)) {
        this.docs.set(path, { ...this.docs.get(path), ...entry.data });
      } else {
        this.docs.set(path, entry.data);
      }
    }
    return res;
  }
}

// Token helper
function encodeToken(claims: Record<string, any>): string {
  return Buffer.from(JSON.stringify(claims)).toString('base64');
}

const superAdminToken = encodeToken({
  uid: 'superadmin_uid_777',
  email: 'superadmin@platform.com',
  role: 'Super Admin',
  platformAdmin: true,
  permissions: ALL_PERMISSION_KEYS,
});

const storeStaffToken = encodeToken({
  uid: 'cashier_uid_123',
  email: 'cashier@store.com',
  tenantId: 'tenant_demo_1',
  role: 'Cashier',
  platformAdmin: false,
  permissions: ['pos.sell', 'users.view'],
});

const tenantOwnerToken = encodeToken({
  uid: 'owner_uid_456',
  email: 'owner@store.com',
  tenantId: 'tenant_demo_1',
  role: 'Business Owner',
  platformAdmin: false,
  permissions: ALL_PERMISSION_KEYS,
});

// Test Setup
const db = new MockFirestore();
const mockAdminAuth = {
  getUser: async (uid: string) => {
    if (uid.includes('invalid') || uid.includes('ghost')) {
      throw new Error('User not found');
    }
    return {
      uid,
      email: `${uid}@testdomain.com`,
      emailVerified: true,
    };
  },
};

const app = express();
app.use(express.json());

// Auth decoding middleware
app.use((req: any, _res: any, next: any) => {
  const authHeader = String(req.headers.authorization || '');
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
      req.user = {
        uid: decoded.uid || 'test-uid',
        email: decoded.email || 'test@example.com',
        emailVerified: true,
        claims: decoded,
      };
    } catch {
      // Invalid token
    }
  }
  next();
});

const requireServerAuth = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  next();
};

const requirePlatformAdmin = (req: any, res: any, next: any) => {
  try {
    assertPlatformAdmin(req.user?.claims);
    next();
  } catch (err: any) {
    res.status(err?.statusCode || 403).json({ error: err?.message || 'Platform Super Admin access is required.' });
  }
};

registerPlatformAdminRoutes({
  app,
  requireServerAuth,
  requirePlatformAdmin,
  getAdminDb: () => db,
  getAdminAuth: () => mockAdminAuth,
});

let server: http.Server;
let baseUrl: string;

async function makeApiRequest(
  method: string,
  path: string,
  body?: any,
  token?: string,
  extraHeaders?: Record<string, string>,
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const payload = body ? JSON.stringify(body) : undefined;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    };
    if (payload) {
      headers['Content-Length'] = String(Buffer.byteLength(payload));
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let parsed: any = {};
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = { raw };
          }
          resolve({ status: res.statusCode || 500, data: parsed });
        });
      },
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

test.before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise<void>((resolve) => {
    if (server) server.close(() => resolve());
    else resolve();
  });
});

// Shared state across test cases
let createdTenantId1: string;
let createdTenantId2: string;

// ============================================================================
// SUITE 1: Super Admin Tenant Provisioning & Default Subscription Plan
// ============================================================================

test('Integration Test 1.1: Provisioning defaults to Starter plan with active billing status when trialDays is 0', async () => {
  const res = await makeApiRequest(
    'POST',
    '/api/platform/tenants',
    {
      name: 'Apex Supermarket',
      ownerUid: 'owner_apex_101',
      ownerEmail: 'owner@apex.com',
      trialDays: 0,
    },
    superAdminToken,
  );

  assert.equal(res.status, 201);
  assert.equal(res.data.success, true);
  assert.ok(res.data.tenant?.id);
  createdTenantId1 = res.data.tenant.id;

  // Verify Firestore tenant document
  const tenantDoc = db.docs.get(`tenants/${createdTenantId1}`);
  assert.ok(tenantDoc);
  assert.equal(tenantDoc.name, 'Apex Supermarket');
  assert.equal(tenantDoc.lifecycleStatus, 'active');
  assert.equal(tenantDoc.status, 'active');

  // Verify default subscription plan details
  const sub = tenantDoc.subscription;
  assert.ok(sub);
  assert.equal(sub.planId, 'starter');
  assert.equal(sub.planName, 'Starter');
  assert.equal(sub.status, 'active');
  assert.equal(sub.interval, 'monthly');
  assert.equal(sub.currency, 'USD');
  assert.equal(sub.seatsLimit, 3);
  assert.equal(sub.price, 29);
  assert.ok(sub.currentPeriodStart);
  assert.ok(sub.currentPeriodEnd);

  // Verify authoritative billing ledger event
  const billingEvents = Array.from(db.docs.entries()).filter(([p]) => p.startsWith('platform_billing_events/'));
  assert.ok(billingEvents.length > 0);
  const provEvent = billingEvents.find(([_, d]) => d.tenantId === createdTenantId1 && d.type === 'subscription_created')?.[1];
  assert.ok(provEvent);
  assert.equal(provEvent.status, 'active');
  assert.equal(provEvent.amount, 29);
  assert.equal(provEvent.planId, 'starter');
});

test('Integration Test 1.2: Provisioning with trial period sets trialing billing status and $0 initial billing event', async () => {
  const res = await makeApiRequest(
    'POST',
    '/api/platform/tenants',
    {
      name: 'Fresh Market & Bakery',
      ownerUid: 'owner_fresh_202',
      ownerEmail: 'owner@fresh.com',
      planId: 'growth',
      trialDays: 14,
    },
    superAdminToken,
  );

  assert.equal(res.status, 201);
  assert.equal(res.data.success, true);
  assert.ok(res.data.tenant?.id);
  createdTenantId2 = res.data.tenant.id;

  const tenantDoc = db.docs.get(`tenants/${createdTenantId2}`);
  assert.ok(tenantDoc);
  assert.equal(tenantDoc.lifecycleStatus, 'trialing');
  assert.equal(tenantDoc.subscription.planId, 'growth');
  assert.equal(tenantDoc.subscription.status, 'trialing');
  assert.ok(tenantDoc.subscription.trialEndsAt);

  // Verify $0 initial billing event for trialing tenant
  const billingEvents = Array.from(db.docs.entries()).filter(([p]) => p.startsWith('platform_billing_events/'));
  const trialEvent = billingEvents.find(([_, d]) => d.tenantId === createdTenantId2 && d.type === 'subscription_created')?.[1];
  assert.ok(trialEvent);
  assert.equal(trialEvent.status, 'trialing');
  assert.equal(trialEvent.amount, 0);
  assert.equal(trialEvent.planId, 'growth');
});

test('Integration Test 1.3: Provisioning validates owner UID existence and rejects invalid Firebase UIDs', async () => {
  const res = await makeApiRequest(
    'POST',
    '/api/platform/tenants',
    {
      name: 'Ghost Store',
      ownerUid: 'invalid_firebase_uid_999',
    },
    superAdminToken,
  );

  assert.equal(res.status, 400);
  assert.equal(res.data.error, 'The supplied owner Firebase UID does not exist.');
});

// ============================================================================
// SUITE 2: Lifecycle State Machine Transitions & Audit Trail
// ============================================================================

test('Integration Test 2.1: Lifecycle transition Trialing -> Active is correctly audited', async () => {
  const res = await makeApiRequest(
    'PATCH',
    `/api/platform/tenants/${createdTenantId2}/lifecycle`,
    {
      lifecycleStatus: 'active',
      reason: '14-day trial completed; paid subscription activated.',
    },
    superAdminToken,
  );

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.equal(res.data.tenant.lifecycleStatus, 'active');
  assert.equal(res.data.tenant.subscription.status, 'active');

  // Verify audit log document in Firestore
  const auditLogs = Array.from(db.docs.entries()).filter(([p]) => p.startsWith('audit_logs/'));
  const activeAudit = auditLogs.find(
    ([_, d]) => d.tenantId === createdTenantId2 && d.action === 'TENANT_LIFECYCLE_ACTIVE',
  )?.[1];

  assert.ok(activeAudit);
  assert.equal(activeAudit.module, 'Tenant Lifecycle');
  assert.equal(activeAudit.actorRole, 'Super Admin');
  assert.equal(activeAudit.reason, '14-day trial completed; paid subscription activated.');
  assert.equal(activeAudit.previousState?.lifecycleStatus, 'trialing');
  assert.equal(activeAudit.newState?.lifecycleStatus, 'active');
  assert.equal(activeAudit.severity, 'critical');
});

test('Integration Test 2.2: Lifecycle transition Active -> Suspended updates operational status and records audit event', async () => {
  const res = await makeApiRequest(
    'PATCH',
    `/api/platform/tenants/${createdTenantId2}/lifecycle`,
    {
      lifecycleStatus: 'suspended',
      reason: 'Non-payment past 30-day grace period.',
    },
    superAdminToken,
  );

  assert.equal(res.status, 200);
  assert.equal(res.data.tenant.lifecycleStatus, 'suspended');
  assert.equal(res.data.tenant.status, 'suspended');
  assert.equal(res.data.tenant.subscription.status, 'suspended');

  // Verify Firestore doc updated
  const tenantDoc = db.docs.get(`tenants/${createdTenantId2}`);
  assert.equal(tenantDoc.lifecycleStatus, 'suspended');
  assert.equal(tenantDoc.status, 'suspended');

  // Verify audit log
  const auditLogs = Array.from(db.docs.entries()).filter(([p]) => p.startsWith('audit_logs/'));
  const suspendAudit = auditLogs.find(
    ([_, d]) => d.tenantId === createdTenantId2 && d.action === 'TENANT_LIFECYCLE_SUSPENDED',
  )?.[1];

  assert.ok(suspendAudit);
  assert.equal(suspendAudit.reason, 'Non-payment past 30-day grace period.');
  assert.equal(suspendAudit.previousState?.lifecycleStatus, 'active');
  assert.equal(suspendAudit.newState?.lifecycleStatus, 'suspended');
});

test('Integration Test 2.3: Lifecycle transition Suspended -> Active (Reactivation) restores operational status with audit log', async () => {
  const res = await makeApiRequest(
    'PATCH',
    `/api/platform/tenants/${createdTenantId2}/lifecycle`,
    {
      lifecycleStatus: 'active',
      reason: 'Outstanding balance paid in full.',
    },
    superAdminToken,
  );

  assert.equal(res.status, 200);
  assert.equal(res.data.tenant.lifecycleStatus, 'active');
  assert.equal(res.data.tenant.status, 'active');
  assert.equal(res.data.tenant.subscription.status, 'active');

  const auditLogs = Array.from(db.docs.entries()).filter(([p]) => p.startsWith('audit_logs/'));
  const reactivateAudit = auditLogs.reverse().find(
    ([_, d]) => d.tenantId === createdTenantId2 && d.action === 'TENANT_LIFECYCLE_ACTIVE',
  )?.[1];

  assert.ok(reactivateAudit);
  assert.equal(reactivateAudit.reason, 'Outstanding balance paid in full.');
  assert.equal(reactivateAudit.previousState?.lifecycleStatus, 'suspended');
  assert.equal(reactivateAudit.newState?.lifecycleStatus, 'active');
});

test('Integration Test 2.4: Lifecycle transition Active -> Cancelled terminates tenant account with audit log', async () => {
  const res = await makeApiRequest(
    'PATCH',
    `/api/platform/tenants/${createdTenantId2}/lifecycle`,
    {
      lifecycleStatus: 'cancelled',
      reason: 'Merchant requested contract termination.',
    },
    superAdminToken,
  );

  assert.equal(res.status, 200);
  assert.equal(res.data.tenant.lifecycleStatus, 'cancelled');
  assert.equal(res.data.tenant.status, 'cancelled');
  assert.equal(res.data.tenant.subscription.status, 'cancelled');

  const auditLogs = Array.from(db.docs.entries()).filter(([p]) => p.startsWith('audit_logs/'));
  const cancelAudit = auditLogs.find(
    ([_, d]) => d.tenantId === createdTenantId2 && d.action === 'TENANT_LIFECYCLE_CANCELLED',
  )?.[1];

  assert.ok(cancelAudit);
  assert.equal(cancelAudit.reason, 'Merchant requested contract termination.');
});

test('Integration Test 2.5: Terminal state Cancelled rejects state transitions', async () => {
  const res = await makeApiRequest(
    'PATCH',
    `/api/platform/tenants/${createdTenantId2}/lifecycle`,
    {
      lifecycleStatus: 'suspended',
      reason: 'Attempting to suspend cancelled tenant.',
    },
    superAdminToken,
  );

  assert.equal(res.status, 409);
  assert.match(res.data.error, /Invalid tenant lifecycle transition/);
});

test('Integration Test 2.6: Lifecycle change without mandatory justification reason is rejected', async () => {
  const res = await makeApiRequest(
    'PATCH',
    `/api/platform/tenants/${createdTenantId1}/lifecycle`,
    {
      lifecycleStatus: 'suspended',
      reason: '    ',
    },
    superAdminToken,
  );

  assert.equal(res.status, 400);
  assert.equal(res.data.error, 'A reason is required for tenant lifecycle changes.');
});

// ============================================================================
// SUITE 3: Subscription Management & Ledger Audit Trail
// ============================================================================

test('Integration Test 3.1: Updating plan and billing interval updates subscription, emits billing ledger event and audit log', async () => {
  const res = await makeApiRequest(
    'PATCH',
    `/api/platform/tenants/${createdTenantId1}/subscription`,
    {
      planId: 'enterprise',
      billingInterval: 'annual',
      reason: 'Tenant upgraded to Enterprise annual package.',
    },
    superAdminToken,
  );

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.equal(res.data.subscription.planId, 'enterprise');
  assert.equal(res.data.subscription.planName, 'Enterprise');
  assert.equal(res.data.subscription.interval, 'annual');
  assert.equal(res.data.subscription.price, 1990);
  assert.equal(res.data.subscription.seatsLimit, 50);

  // Check audit log for subscription change
  const auditLogs = Array.from(db.docs.entries()).filter(([p]) => p.startsWith('audit_logs/'));
  const subAudit = auditLogs.find(
    ([_, d]) => d.tenantId === createdTenantId1 && d.action === 'TENANT_SUBSCRIPTION_CHANGED',
  )?.[1];

  assert.ok(subAudit);
  assert.equal(subAudit.module, 'Platform Billing');
  assert.equal(subAudit.newState.planId, 'enterprise');
  assert.equal(subAudit.newState.price, 1990);
  assert.equal(subAudit.reason, 'Tenant upgraded to Enterprise annual package.');

  // Check billing ledger event
  const billingEvents = Array.from(db.docs.entries()).filter(([p]) => p.startsWith('platform_billing_events/'));
  const changeEvent = billingEvents.find(([_, d]) => d.tenantId === createdTenantId1 && d.type === 'subscription_changed')?.[1];
  assert.ok(changeEvent);
  assert.equal(changeEvent.amount, 1990);
  assert.equal(changeEvent.planId, 'enterprise');
});

// ============================================================================
// SUITE 4: Unauthorized Modification Defense from Tenant-Facing APIs
// ============================================================================

test('Integration Test 4.1: Tenant staff (Cashier/Manager) cannot access Super Admin provisioning endpoints', async () => {
  const res1 = await makeApiRequest('POST', '/api/platform/tenants', { name: 'Unauthorized Store' }, storeStaffToken);
  assert.equal(res1.status, 403);
  assert.equal(res1.data.error, 'Platform Super Admin access is required.');

  const res2 = await makeApiRequest('PATCH', `/api/platform/tenants/${createdTenantId1}/subscription`, { planId: 'enterprise' }, storeStaffToken);
  assert.equal(res2.status, 403);
  assert.equal(res2.data.error, 'Platform Super Admin access is required.');

  const res3 = await makeApiRequest('PATCH', `/api/platform/tenants/${createdTenantId1}/lifecycle`, { lifecycleStatus: 'suspended' }, storeStaffToken);
  assert.equal(res3.status, 403);
  assert.equal(res3.data.error, 'Platform Super Admin access is required.');
});

test('Integration Test 4.2: Tenant Owner without platformAdmin claim cannot access Super Admin control plane', async () => {
  const res = await makeApiRequest(
    'POST',
    '/api/platform/tenants',
    { name: 'Owner Trying To Provision' },
    tenantOwnerToken,
  );

  assert.equal(res.status, 403);
  assert.equal(res.data.error, 'Platform Super Admin access is required.');
});

test('Integration Test 4.3: Unauthenticated requests to platform endpoints are rejected with HTTP 401', async () => {
  const res = await makeApiRequest('POST', '/api/platform/tenants', { name: 'No Token Store' });
  assert.equal(res.status, 401);
  assert.equal(res.data.error, 'Authentication required.');
});

test('Integration Test 4.4: Tenant staff cannot modify lifecycle or subscription fields via tenant settings API', () => {
  // 1. Direct ownerUid modification throws 403 error
  assert.throws(
    () => sanitizeTenantUpdatePayload({ name: 'Renamed', ownerUid: 'attacker_uid' }, 'tenant_1'),
    (err: any) => err?.statusCode === 403 && /Direct modification of ownerUid is forbidden/.test(err.message),
  );

  // 2. Unapproved fields (lifecycleStatus, status, subscription) are stripped
  const inputWithRestrictedFields = {
    name: 'Renamed Business Name',
    lifecycleStatus: 'active',
    status: 'active',
    subscription: {
      planId: 'enterprise',
      status: 'active',
      price: 0,
    },
    currency: 'USD',
  };

  const sanitized = sanitizeTenantUpdatePayload(inputWithRestrictedFields, 'tenant_1');

  // Restricted platform control plane fields MUST be stripped
  assert.equal((sanitized as any).lifecycleStatus, undefined);
  assert.equal((sanitized as any).subscription, undefined);

  // Allowed tenant customization fields are preserved
  assert.equal(sanitized.name, 'Renamed Business Name');
  assert.equal(sanitized.currency, 'USD');
});

test('Integration Test 4.5: Suspended tenant members are blocked from tenant-facing APIs', () => {
  const suspendedTenant = {
    id: 'tenant_suspended_888',
    ownerUid: 'owner_888',
    status: 'suspended' as const,
    lifecycleStatus: 'suspended' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const activeStaff = {
    id: 'staff_888',
    uid: 'user_888',
    tenantId: 'tenant_suspended_888',
    status: 'active',
    role: 'Manager',
  };

  const evaluation = evaluateActiveTenantMembership({
    tenantId: 'tenant_suspended_888',
    userUid: 'user_888',
    tenant: suspendedTenant,
    staff: activeStaff,
  });

  assert.equal(evaluation.allowed, false);
  assert.equal(evaluation.statusCode, 403);
  assert.match(evaluation.error || '', /Tenant is suspended or unavailable/i);
});
