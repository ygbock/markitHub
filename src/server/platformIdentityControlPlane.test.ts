// @ts-nocheck
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import express from 'express';
import request from 'supertest';
import { registerPlatformAdminRoutes } from './platformAdminRoutes';
import {
  PLATFORM_ROLES,
  ALL_PLATFORM_PERMISSION_KEYS,
  ROLE_DEFAULT_PERMISSIONS,
  computeEffectivePermissions,
  hasPlatformPermission,
  getRolePermissionMatrix,
  assertLastSuperAdminProtection,
  assertNotSelfPrivilegeEscalation,
  assertOptimisticConcurrency,
  createPlatformAdministrator,
  getPlatformAdministrator,
  listPlatformAdministrators,
  updatePlatformAdminProfile,
  assignPlatformAdminRole,
  updatePlatformAdminPermissions,
  updatePlatformAdminStatus,
  deletePlatformAdministrator,
  grantBreakGlassElevation,
  revokeBreakGlassElevation,
  sweepExpiredBreakGlass,
  getAdministratorActivityHistory,
  findPlatformAdminByUid,
  bootstrapInitialSuperAdminIfEmpty,
} from './platformIdentityControlPlane';

interface MockDoc {
  id: string;
  data: Record<string, any>;
}

class MockQuery {
  private docs: MockDoc[];
  private name: string;
  private db: MockDb;

  constructor(docs: MockDoc[], name = '', db?: MockDb) {
    this.docs = [...docs];
    this.name = name;
    this.db = db;
  }

  where(field: string, op: string, val: any): MockQuery {
    const filtered = this.docs.filter((d) => {
      const parts = field.split('.');
      let current = d.data;
      for (const part of parts) {
        if (current === undefined || current === null) break;
        current = current[part];
      }

      if (op === '==') return current === val;
      if (op === 'in') return Array.isArray(val) && val.includes(current);
      if (op === '>=') return current >= val;
      if (op === '<=') return current <= val;
      return true;
    });
    return new MockQuery(filtered, this.name, this.db);
  }

  orderBy(_field: string, _dir?: string): MockQuery {
    return this;
  }

  limit(count: number): MockQuery {
    return new MockQuery(this.docs.slice(0, count), this.name, this.db);
  }

  async get(): Promise<any> {
    return {
      empty: this.docs.length === 0,
      size: this.docs.length,
      docs: this.docs.map((d) => ({
        id: d.id,
        ref: this.db ? this.db.collection(this.name).doc(d.id) : null,
        exists: true,
        data: () => ({ ...d.data }),
      })),
    };
  }
}

class MockCollection {
  private name: string;
  private db: MockDb;

  constructor(name: string, db: MockDb) {
    this.name = name;
    this.db = db;
  }

  doc(id?: string) {
    const docId = id || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    return {
      id: docId,
      get: async () => {
        const item = this.db.store[this.name]?.[docId];
        return {
          id: docId,
          exists: Boolean(item),
          data: () => (item ? { ...item } : undefined),
        };
      },
      set: async (data: any, options?: any) => {
        if (!this.db.store[this.name]) this.db.store[this.name] = {};
        if (options?.merge && this.db.store[this.name][docId]) {
          this.db.store[this.name][docId] = { ...this.db.store[this.name][docId], ...data };
        } else {
          this.db.store[this.name][docId] = { ...data };
        }
      },
      update: async (data: any) => {
        if (!this.db.store[this.name]?.[docId]) {
          throw new Error(`Doc ${docId} does not exist`);
        }
        this.db.store[this.name][docId] = { ...this.db.store[this.name][docId], ...data };
      },
      delete: async () => {
        if (this.db.store[this.name]?.[docId]) {
          delete this.db.store[this.name][docId];
        }
      },
    };
  }

  where(field: string, op: string, val: any): MockQuery {
    const items = Object.entries(this.db.store[this.name] || {}).map(([id, data]) => ({ id, data }));
    return new MockQuery(items, this.name, this.db).where(field, op, val);
  }

  orderBy(field: string, dir?: string): MockQuery {
    const items = Object.entries(this.db.store[this.name] || {}).map(([id, data]) => ({ id, data }));
    return new MockQuery(items, this.name, this.db).orderBy(field, dir);
  }

  limit(count: number): MockQuery {
    const items = Object.entries(this.db.store[this.name] || {}).map(([id, data]) => ({ id, data }));
    return new MockQuery(items, this.name, this.db).limit(count);
  }

  async get(): Promise<any> {
    const items = Object.entries(this.db.store[this.name] || {}).map(([id, data]) => ({ id, data }));
    return new MockQuery(items, this.name, this.db).get();
  }
}

class MockDb {
  public store: Record<string, Record<string, any>> = {};

  collection(name: string) {
    return new MockCollection(name, this);
  }

  batch() {
    const operations: Array<() => void> = [];
    return {
      set: (ref: any, data: any, options?: any) => {
        operations.push(() => ref.set(data, options));
      },
      update: (ref: any, data: any) => {
        operations.push(() => ref.update(data));
      },
      delete: (ref: any) => {
        operations.push(() => ref.delete());
      },
      commit: async () => {
        for (const op of operations) op();
      },
    };
  }
}

describe('Platform Identity & Delegated Administration Control Plane', () => {
  let db: MockDb;

  const mockSuperAdminCaller = {
    uid: 'super_admin_1',
    email: 'super@markithub.internal',
    name: 'Primary Super Admin',
    role: 'SUPER_ADMIN' as const,
    permissions: [...ALL_PLATFORM_PERMISSION_KEYS],
    platformAdmin: true,
  };

  const mockOpsCaller = {
    uid: 'ops_admin_1',
    email: 'ops@markithub.internal',
    name: 'Operations Lead',
    role: 'PLATFORM_OPERATIONS' as const,
    permissions: [...ROLE_DEFAULT_PERMISSIONS.PLATFORM_OPERATIONS],
    platformAdmin: true,
  };

  beforeEach(() => {
    db = new MockDb();
  });

  describe('Permission Model & Hierarchy', () => {
    it('grants wildcard permissions to SUPER_ADMIN', () => {
      const admin: any = {
        role: 'SUPER_ADMIN',
        status: 'active',
        delegatedPermissions: [],
      };
      const perms = computeEffectivePermissions(admin);
      assert.equal(perms.length, ALL_PLATFORM_PERMISSION_KEYS.length);
      assert.equal(hasPlatformPermission(admin, 'tenants.lifecycle'), true);
      assert.equal(hasPlatformPermission(admin, 'governance.publish'), true);
      assert.equal(hasPlatformPermission(admin, 'admins.delete'), true);
      assert.equal(hasPlatformPermission(admin, 'break_glass.grant'), true);
    });

    it('scopes permissions for PLATFORM_OPERATIONS, rejecting unauthorized domains', () => {
      const admin: any = {
        role: 'PLATFORM_OPERATIONS',
        status: 'active',
        delegatedPermissions: [],
      };
      const perms = computeEffectivePermissions(admin);
      assert.ok(perms.includes('tenants.view'));
      assert.ok(perms.includes('tenants.lifecycle'));
      assert.ok(perms.includes('alerts.manage'));
      // Should NOT have billing or governance publish permissions
      assert.equal(hasPlatformPermission(admin, 'billing.manage'), false);
      assert.equal(hasPlatformPermission(admin, 'governance.publish'), false);
      assert.equal(hasPlatformPermission(admin, 'admins.delete'), false);
    });

    it('scopes permissions for PLATFORM_BILLING', () => {
      const admin: any = {
        role: 'PLATFORM_BILLING',
        status: 'active',
        delegatedPermissions: [],
      };
      assert.equal(hasPlatformPermission(admin, 'billing.view'), true);
      assert.equal(hasPlatformPermission(admin, 'billing.manage'), true);
      assert.equal(hasPlatformPermission(admin, 'plans.manage'), true);
      assert.equal(hasPlatformPermission(admin, 'tenants.lifecycle'), false);
      assert.equal(hasPlatformPermission(admin, 'break_glass.grant'), false);
    });

    it('scopes permissions for PLATFORM_SECURITY', () => {
      const admin: any = {
        role: 'PLATFORM_SECURITY',
        status: 'active',
        delegatedPermissions: [],
      };
      assert.equal(hasPlatformPermission(admin, 'security.view'), true);
      assert.equal(hasPlatformPermission(admin, 'admins.view'), true);
      assert.equal(hasPlatformPermission(admin, 'admins.manage'), true);
      assert.equal(hasPlatformPermission(admin, 'break_glass.grant'), true);
      assert.equal(hasPlatformPermission(admin, 'billing.manage'), false);
    });

    it('scopes permissions for PLATFORM_SUPPORT to read-only', () => {
      const admin: any = {
        role: 'PLATFORM_SUPPORT',
        status: 'active',
        delegatedPermissions: [],
      };
      assert.equal(hasPlatformPermission(admin, 'tenants.view'), true);
      assert.equal(hasPlatformPermission(admin, 'usage.view'), true);
      assert.equal(hasPlatformPermission(admin, 'billing.view'), false);
      assert.equal(hasPlatformPermission(admin, 'tenants.lifecycle'), false);
      assert.equal(hasPlatformPermission(admin, 'plans.manage'), false);
    });

    it('correctly incorporates delegated permissions to augment base role', () => {
      const admin: any = {
        role: 'PLATFORM_SUPPORT',
        status: 'active',
        delegatedPermissions: ['tenants.lifecycle', 'plans.manage'],
      };
      const perms = computeEffectivePermissions(admin);
      assert.ok(perms.includes('tenants.lifecycle'));
      assert.ok(perms.includes('plans.manage'));
      assert.equal(hasPlatformPermission(admin, 'tenants.lifecycle'), true);
      assert.equal(hasPlatformPermission(admin, 'plans.manage'), true);
      assert.equal(hasPlatformPermission(admin, 'governance.publish'), false);
    });

    it('elevates permissions during active break-glass window', () => {
      const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const admin: any = {
        role: 'PLATFORM_SUPPORT',
        status: 'active',
        delegatedPermissions: [],
        breakGlass: {
          status: 'active',
          elevatedRole: 'SUPER_ADMIN',
          elevatedPermissions: ['*'],
          expiresAt: future,
        },
      };
      assert.equal(hasPlatformPermission(admin, 'governance.publish'), true);
      assert.equal(hasPlatformPermission(admin, 'admins.delete'), true);
    });

    it('disregards expired break-glass access', () => {
      const past = new Date(Date.now() - 5000).toISOString();
      const admin: any = {
        role: 'PLATFORM_SUPPORT',
        status: 'active',
        delegatedPermissions: [],
        breakGlass: {
          status: 'active',
          elevatedRole: 'SUPER_ADMIN',
          elevatedPermissions: ['*'],
          expiresAt: past,
        },
      };
      assert.equal(hasPlatformPermission(admin, 'governance.publish'), false);
    });
  });

  describe('Security Invariants', () => {
    it('prevents self-escalation (changing own role, status, delete, or break-glass)', () => {
      assert.throws(
        () => assertNotSelfPrivilegeEscalation('admin_123', 'admin_123', 'assign platform role'),
        (err: any) => err.statusCode === 403 && err.message.includes('Self-privilege escalation prohibited')
      );

      // Different user should succeed without error
      assert.doesNotThrow(() => assertNotSelfPrivilegeEscalation('admin_1', 'admin_2', 'assign platform role'));
    });

    it('enforces last-super-admin protection against demotion, suspension, or deletion', async () => {
      // Seed exactly 1 active Super Admin
      db.store['platform_administrators'] = {
        admin_1: {
          id: 'admin_1',
          uid: 'uid_1',
          role: 'SUPER_ADMIN',
          status: 'active',
        },
      };

      const targetAdmin = db.store['platform_administrators']['admin_1'];
      // Trying to demote or suspend admin_1 should throw 400
      await assert.rejects(
        () => assertLastSuperAdminProtection(db, targetAdmin, { newRole: 'PLATFORM_OPERATIONS' }),
        (err: any) => err.statusCode === 400 && err.message.includes('final active Super Admin')
      );

      // Now add a second active Super Admin
      db.store['platform_administrators']['admin_2'] = {
        id: 'admin_2',
        uid: 'uid_2',
        role: 'SUPER_ADMIN',
        status: 'active',
      };

      // With 2 active Super Admins, demoting admin_1 must succeed
      await assert.doesNotReject(() =>
        assertLastSuperAdminProtection(db, targetAdmin, { newRole: 'PLATFORM_OPERATIONS' })
      );
    });

    it('enforces optimistic concurrency control', () => {
      assert.throws(
        () => assertOptimisticConcurrency(2, 1),
        (err: any) => err.statusCode === 409 && err.message.includes('Optimistic concurrency conflict')
      );

      assert.doesNotThrow(() => assertOptimisticConcurrency(3, 3));
      assert.doesNotThrow(() => assertOptimisticConcurrency(3, undefined));
    });
  });

  describe('CRUD & Lifecycle Control Plane', () => {
    it('creates a new platform administrator and commits audit record', async () => {
      const newAdmin = await createPlatformAdministrator(db, mockSuperAdminCaller, {
        email: 'ops.specialist@markithub.internal',
        name: 'Alex Rivera',
        role: 'PLATFORM_OPERATIONS',
        department: 'Site Reliability',
        title: 'Lead SRE',
        justification: 'New hire onboarding approval ticket #SEC-9921',
      });

      assert.ok(newAdmin.id);
      assert.equal(newAdmin.email, 'ops.specialist@markithub.internal');
      assert.equal(newAdmin.role, 'PLATFORM_OPERATIONS');
      assert.equal(newAdmin.status, 'active');
      assert.equal(newAdmin.version, 1);

      // Check stored record
      const stored = await getPlatformAdministrator(db, newAdmin.id);
      assert.ok(stored);
      assert.equal(stored.department, 'Site Reliability');

      // Check audit log
      const auditDocs = Object.values(db.store['audit_logs'] || {});
      const createLog = auditDocs.find((l: any) => l.action === 'PLATFORM_ADMIN_CREATED');
      assert.ok(createLog);
      assert.equal(createLog.actorUid, mockSuperAdminCaller.uid);
    });

    it('assigns role with version check and audit logging', async () => {
      const admin = await createPlatformAdministrator(db, mockSuperAdminCaller, {
        email: 'dev@markithub.internal',
        name: 'Dev Admin',
        role: 'PLATFORM_SUPPORT',
        justification: 'Initial provisioning',
      });

      const updated = await assignPlatformAdminRole(
        db,
        mockSuperAdminCaller,
        admin.id,
        'PLATFORM_BILLING',
        'Promotion to billing management',
        admin.version
      );

      assert.equal(updated.role, 'PLATFORM_BILLING');
      assert.equal(updated.version, 2);

      const history = await getAdministratorActivityHistory(db, admin.id);
      assert.ok(history.some((h) => h.action === 'PLATFORM_ADMIN_ROLE_CHANGED'));
    });

    it('updates delegated permissions', async () => {
      const admin = await createPlatformAdministrator(db, mockSuperAdminCaller, {
        email: 'ops@markithub.internal',
        name: 'Ops Admin',
        role: 'PLATFORM_OPERATIONS',
        justification: 'Provisioning',
      });

      const updated = await updatePlatformAdminPermissions(
        db,
        mockSuperAdminCaller,
        admin.id,
        ['billing.view', 'plans.manage'],
        'Delegated authority for Q3 plan upgrades',
        admin.version
      );

      assert.deepEqual(updated.delegatedPermissions, ['billing.view', 'plans.manage']);
      assert.equal(updated.version, 2);
    });

    it('suspends and reactivates administrator', async () => {
      const admin = await createPlatformAdministrator(db, mockSuperAdminCaller, {
        email: 'contractor@markithub.internal',
        name: 'External Contractor',
        role: 'PLATFORM_SUPPORT',
        justification: 'Contractor onboarding',
      });

      // Suspend
      const suspended = await updatePlatformAdminStatus(
        db,
        mockSuperAdminCaller,
        admin.id,
        'suspended',
        'Contractor term ended',
        admin.version
      );
      assert.equal(suspended.status, 'suspended');
      assert.ok(suspended.sessionRevokedAt);

      // Reactivate
      const reactivated = await updatePlatformAdminStatus(
        db,
        mockSuperAdminCaller,
        admin.id,
        'active',
        'Contract renewed',
        suspended.version
      );
      assert.equal(reactivated.status, 'active');
    });

    it('grants and revokes break-glass elevation', async () => {
      const admin = await createPlatformAdministrator(db, mockSuperAdminCaller, {
        email: 'oncall@markithub.internal',
        name: 'Oncall Engineer',
        role: 'PLATFORM_OPERATIONS',
        justification: 'Oncall onboarding',
      });

      // Grant break-glass
      const elevated = await grantBreakGlassElevation(db, mockSuperAdminCaller, admin.id, {
        elevatedRole: 'SUPER_ADMIN',
        durationMinutes: 60,
        justification: 'P0 Incident #INC-4402 - Database recovery',
        expectedVersion: admin.version,
      });

      assert.ok(elevated.breakGlass);
      assert.equal(elevated.breakGlass.status, 'active');
      assert.equal(elevated.breakGlass.elevatedRole, 'SUPER_ADMIN');

      // Revoke break-glass
      const revoked = await revokeBreakGlassElevation(
        db,
        mockSuperAdminCaller,
        admin.id,
        'Incident resolved, elevation no longer required',
        elevated.version
      );

      assert.equal(revoked.breakGlass?.status, 'revoked');
    });

    it('sweeps expired break-glass entries', async () => {
      const pastTime = new Date(Date.now() - 10000).toISOString();
      db.store['platform_administrators'] = {
        admin_expired: {
          id: 'admin_expired',
          name: 'Expired Oncall',
          status: 'active',
          role: 'PLATFORM_OPERATIONS',
          breakGlass: {
            id: 'bg_1',
            status: 'active',
            elevatedRole: 'SUPER_ADMIN',
            expiresAt: pastTime,
            reason: 'Old incident',
          },
          version: 1,
        },
      };

      const swept = await sweepExpiredBreakGlass(db);
      assert.equal(swept, 1);
      assert.equal(db.store['platform_administrators']['admin_expired'].breakGlass.status, 'expired');
    });

    it('deletes administrator with audit record', async () => {
      const admin = await createPlatformAdministrator(db, mockSuperAdminCaller, {
        email: 'temp@markithub.internal',
        name: 'Temp Admin',
        role: 'PLATFORM_SUPPORT',
        justification: 'Temp provisioning',
      });

      const res = await deletePlatformAdministrator(
        db,
        mockSuperAdminCaller,
        admin.id,
        'Offboarding complete',
        admin.version
      );
      assert.equal(res.success, true);
      assert.equal(await getPlatformAdministrator(db, admin.id), null);
    });
  });

  describe('HTTP API Endpoints & Route-level RBAC Integration', () => {
    let app: express.Express;

    beforeEach(async () => {
      app = express();
      app.use(express.json());

      // Seed an active Super Admin in DB
      await createPlatformAdministrator(db, mockSuperAdminCaller, {
        uid: mockSuperAdminCaller.uid,
        email: mockSuperAdminCaller.email,
        name: mockSuperAdminCaller.name,
        role: 'SUPER_ADMIN',
        justification: 'System initialization',
      });

      // Middleware: inject caller based on test headers
      const mockAuthMiddleware = (req: any, _res: any, next: any) => {
        const callerRole = req.headers['x-test-role'] || 'SUPER_ADMIN';
        const callerUid = req.headers['x-test-uid'] || mockSuperAdminCaller.uid;
        const callerEmail = req.headers['x-test-email'] || mockSuperAdminCaller.email;
        const tenantId = req.headers['x-test-tenant'];

        req.user = {
          uid: callerUid,
          email: callerEmail,
          name: 'Test Actor',
          claims: {
            role: callerRole === 'SUPER_ADMIN' ? 'Super Admin' : callerRole,
            platformAdmin: !tenantId,
            tenantId: tenantId || undefined,
          },
        };
        next();
      };

      const mockPlatformAdminMiddleware = (req: any, res: any, next: any) => {
        if (req.user?.claims?.tenantId && !req.user?.claims?.platformAdmin) {
          return res.status(403).json({ error: 'Tenant users cannot access platform routes' });
        }
        next();
      };

      registerPlatformAdminRoutes({
        app,
        requireServerAuth: mockAuthMiddleware,
        requirePlatformAdmin: mockPlatformAdminMiddleware,
        getAdminDb: () => db,
        getAdminAuth: () => null,
      });
    });

    it('GET /api/platform/administrators/roles/matrix returns permission matrix', async () => {
      const res = await request(app)
        .get('/api/platform/administrators/roles/matrix')
        .expect(200);

      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.matrix.roles));
      assert.ok(Array.isArray(res.body.matrix.permissions));
      assert.ok(res.body.matrix.roleDefaults.SUPER_ADMIN);
    });

    it('GET /api/platform/administrators lists directory with status and role filtering', async () => {
      const res = await request(app)
        .get('/api/platform/administrators')
        .expect(200);

      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.administrators));
      assert.ok(res.body.administrators.length >= 1);
    });

    it('POST /api/platform/administrators creates an admin', async () => {
      const res = await request(app)
        .post('/api/platform/administrators')
        .send({
          email: 'new.engineer@markithub.internal',
          name: 'Jane Smith',
          role: 'PLATFORM_OPERATIONS',
          department: 'Platform Ops',
          title: 'Infrastructure Engineer',
          justification: 'Team expansion ticket #OPS-100',
        })
        .expect(201);

      assert.equal(res.body.success, true);
      assert.equal(res.body.administrator.name, 'Jane Smith');
      assert.equal(res.body.administrator.role, 'PLATFORM_OPERATIONS');
    });

    it('rejects tenant-level RBAC users from accessing platform routes', async () => {
      const res = await request(app)
        .get('/api/platform/administrators')
        .set('x-test-tenant', 'tenant_store_123')
        .set('x-test-role', 'Store Owner')
        .expect(403);

      assert.ok(res.body.error);
    });

    it('enforces route-level permission checks for non-Super Admin callers', async () => {
      // Create a support administrator who lacks 'admins.manage' permission
      const supportAdmin = await createPlatformAdministrator(db, mockSuperAdminCaller, {
        uid: 'support_uid_1',
        email: 'support@markithub.internal',
        name: 'Support Agent',
        role: 'PLATFORM_SUPPORT',
        justification: 'Support hire',
      });

      // Support user tries to create an administrator -> should be rejected with 403
      const res = await request(app)
        .post('/api/platform/administrators')
        .set('x-test-uid', supportAdmin.uid)
        .set('x-test-role', 'PLATFORM_SUPPORT')
        .send({
          email: 'unauthorized@markithub.internal',
          name: 'Unauthorized Admin',
          role: 'SUPER_ADMIN',
          justification: 'Malicious creation attempt',
        })
        .expect(403);

      assert.ok(res.body.error.includes('Insufficient platform permissions'));
    });
  });
});
