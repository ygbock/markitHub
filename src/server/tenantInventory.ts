import crypto from 'node:crypto';

type InventoryMutationType =
  | 'PURCHASE'
  | 'SALE_RETURN'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'DAMAGE'
  | 'EXPIRED'
  | 'LOST'
  | 'FOUND'
  | 'OPENING_BALANCE'
  | 'STOCK_COUNT';

function text(value: unknown, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function positiveInteger(value: unknown) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw Object.assign(new Error('Quantity must be a positive whole number.'), { statusCode: 400 });
  return n;
}

function validateReason(value: unknown) {
  const reason = text(value, 500);
  if (!reason) throw Object.assign(new Error('A reason is required for inventory mutations.'), { statusCode: 400 });
  return reason;
}

export function registerTenantInventoryRoutes(app: any, deps: {
  requireServerAuth: any;
  requireActiveTenantMembership: any;
  requirePermission: (permission: string) => any;
  getAdminDb: () => any;
  extractAuthenticatedTenantId: (user: any) => string | null;
  createAuthoritativeAuditRecord: (input: any) => any;
  updateAuthoritativeSecurityMetrics: (db: any, audit: any, batch: any) => Promise<void>;
}) {
  const {
    requireServerAuth, requireActiveTenantMembership, requirePermission, getAdminDb,
    extractAuthenticatedTenantId, createAuthoritativeAuditRecord, updateAuthoritativeSecurityMetrics,
  } = deps;
  const tenantBase = [requireServerAuth, requireActiveTenantMembership];

  const getInventoryRef = (db: any, tenantId: string, productId: string, locationId = 'default') =>
    db.collection('tenants').doc(tenantId).collection('inventory').doc(`${productId}__${locationId}`);

  app.get('/api/tenant/inventory', ...tenantBase, requirePermission('inventory.view'), async (req: any, res: any) => {
    const tenantId = extractAuthenticatedTenantId(req.user);
    const db = getAdminDb();
    if (!tenantId || !db) return res.status(503).json({ error: 'Inventory service is not configured.' });
    try {
      const snap = await db.collection('tenants').doc(tenantId).collection('inventory').limit(500).get();
      return res.json({ success: true, inventory: snap.docs.map((d: any) => ({ ...d.data(), id: d.id })) });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unable to load inventory.' });
    }
  });

  app.post('/api/tenant/inventory/adjust', ...tenantBase, requirePermission('inventory.adjust'), async (req: any, res: any) => {
    const tenantId = extractAuthenticatedTenantId(req.user);
    const db = getAdminDb();
    if (!tenantId || !db) return res.status(503).json({ error: 'Inventory service is not configured.' });
    try {
      const productId = text(req.body?.productId, 120);
      const locationId = text(req.body?.locationId, 120) || 'default';
      const type = text(req.body?.type, 40) as InventoryMutationType;
      const quantity = positiveInteger(req.body?.quantity);
      const reason = validateReason(req.body?.reason);
      const reference = text(req.body?.reference, 160) || null;
      if (!productId) throw Object.assign(new Error('Product ID is required.'), { statusCode: 400 });
      const allowedTypes: InventoryMutationType[] = ['PURCHASE','SALE_RETURN','ADJUSTMENT_IN','ADJUSTMENT_OUT','DAMAGE','EXPIRED','LOST','FOUND','OPENING_BALANCE','STOCK_COUNT'];
      if (!allowedTypes.includes(type)) throw Object.assign(new Error('Invalid inventory mutation type.'), { statusCode: 400 });

      const productRef = db.collection('tenants').doc(tenantId).collection('products').doc(productId);
      const inventoryRef = getInventoryRef(db, tenantId, productId, locationId);
      const now = new Date().toISOString();
      const result = await db.runTransaction(async (tx: any) => {
        const productSnap = await tx.get(productRef);
        if (!productSnap.exists) throw Object.assign(new Error('Product not found.'), { statusCode: 404 });
        const inventorySnap = await tx.get(inventoryRef);
        const current = Number(inventorySnap.data()?.quantity || 0);
        const inbound = ['PURCHASE','SALE_RETURN','ADJUSTMENT_IN','FOUND','OPENING_BALANCE','STOCK_COUNT'].includes(type);
        const next = inbound ? current + quantity : current - quantity;
        if (next < 0) throw Object.assign(new Error('Insufficient stock for this adjustment.'), { statusCode: 409 });
        const movementId = `movement_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
        const movementRef = db.collection('tenants').doc(tenantId).collection('inventoryMovements').doc(movementId);
        tx.set(inventoryRef, { tenantId, productId, locationId, quantity: next, updatedAt: now }, { merge: true });
        tx.create(movementRef, { id: movementId, tenantId, productId, locationId, quantity, type, reason, reference, previousQuantity: current, resultingQuantity: next, actorUid: req.user.uid, createdAt: now });
        return { movementId, previousQuantity: current, resultingQuantity: next };
      });
      const audit = createAuthoritativeAuditRecord({
        tenantId, actorUid: req.user.uid, actorName: req.user.email || req.user.uid, actorEmail: req.user.email || null,
        actorRole: String(req.user.claims?.role || 'Tenant Staff'), action: 'INVENTORY_ADJUSTED', module: 'Inventory',
        targetType: 'product', targetId: productId, newState: result, result: 'success', severity: 'info',
        details: `Inventory ${type} for product ${productId}: ${quantity}. Reason: ${reason}.`,
      });
      const batch = db.batch();
      batch.set(db.collection('audit_logs').doc(audit.id), audit);
      await updateAuthoritativeSecurityMetrics(db, audit, batch);
      await batch.commit();
      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(err?.statusCode || 400).json({ error: err?.message || 'Unable to adjust inventory.' });
    }
  });

  app.post('/api/tenant/inventory/transfer', ...tenantBase, requirePermission('inventory.transfer'), async (req: any, res: any) => {
    const tenantId = extractAuthenticatedTenantId(req.user);
    const db = getAdminDb();
    if (!tenantId || !db) return res.status(503).json({ error: 'Inventory service is not configured.' });
    try {
      const productId = text(req.body?.productId, 120);
      const fromLocationId = text(req.body?.fromLocationId, 120);
      const toLocationId = text(req.body?.toLocationId, 120);
      const quantity = positiveInteger(req.body?.quantity);
      const reason = validateReason(req.body?.reason);
      if (!productId || !fromLocationId || !toLocationId || fromLocationId === toLocationId) throw Object.assign(new Error('Valid distinct source and destination locations are required.'), { statusCode: 400 });
      const now = new Date().toISOString();
      const result = await db.runTransaction(async (tx: any) => {
        const fromRef = getInventoryRef(db, tenantId, productId, fromLocationId);
        const toRef = getInventoryRef(db, tenantId, productId, toLocationId);
        const productRef = db.collection('tenants').doc(tenantId).collection('products').doc(productId);
        const [productSnap, fromSnap, toSnap] = await Promise.all([tx.get(productRef), tx.get(fromRef), tx.get(toRef)]);
        if (!productSnap.exists) throw Object.assign(new Error('Product not found.'), { statusCode: 404 });
        const fromQty = Number(fromSnap.data()?.quantity || 0);
        const toQty = Number(toSnap.data()?.quantity || 0);
        if (fromQty < quantity) throw Object.assign(new Error('Insufficient source stock.'), { statusCode: 409 });
        tx.set(fromRef, { tenantId, productId, locationId: fromLocationId, quantity: fromQty - quantity, updatedAt: now }, { merge: true });
        tx.set(toRef, { tenantId, productId, locationId: toLocationId, quantity: toQty + quantity, updatedAt: now }, { merge: true });
        const base = db.collection('tenants').doc(tenantId).collection('inventoryMovements');
        tx.create(base.doc(), { tenantId, productId, locationId: fromLocationId, quantity, type: 'TRANSFER_OUT', reason, previousQuantity: fromQty, resultingQuantity: fromQty - quantity, actorUid: req.user.uid, createdAt: now });
        tx.create(base.doc(), { tenantId, productId, locationId: toLocationId, quantity, type: 'TRANSFER_IN', reason, previousQuantity: toQty, resultingQuantity: toQty + quantity, actorUid: req.user.uid, createdAt: now });
        return { fromQuantity: fromQty - quantity, toQuantity: toQty + quantity };
      });
      const audit = createAuthoritativeAuditRecord({
        tenantId, actorUid: req.user.uid, actorName: req.user.email || req.user.uid, actorEmail: req.user.email || null,
        actorRole: String(req.user.claims?.role || 'Tenant Staff'), action: 'INVENTORY_TRANSFERRED', module: 'Inventory',
        targetType: 'product', targetId: productId, newState: { fromLocationId, toLocationId, quantity, ...result },
        result: 'success', severity: 'info', details: `Transferred ${quantity} units of product ${productId}.`,
      });
      const batch = db.batch();
      batch.set(db.collection('audit_logs').doc(audit.id), audit);
      await updateAuthoritativeSecurityMetrics(db, audit, batch);
      await batch.commit();
      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(err?.statusCode || 400).json({ error: err?.message || 'Unable to transfer inventory.' });
    }
  });
}
