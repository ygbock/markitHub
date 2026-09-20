import crypto from 'node:crypto';

type CheckoutItemInput = {
  productId: string;
  variantSku?: string;
  quantity: number;
  clientPrice?: number;
};

type CheckoutAddress = {
  addressLine1?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
};

function clean(value: unknown, max = 500): string {
  return String(value ?? '').trim().slice(0, max);
}

function positiveQuantity(value: unknown): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > 1000) throw new Error('Quantity must be a positive integer.');
  return n;
}

function hashAccessToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function makeOrderId(): string {
  return `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function makeReservationId(): string {
  return `RES-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function money(value: number): number {
  return Number(value.toFixed(2));
}

export function registerStorefrontCheckoutRoutes(app: any, deps: {
  requireServerAuth: any;
  optionalServerAuth: any;
  getAdminDb: () => any;
  createAuthoritativeAuditRecord: (input: any) => any;
  updateAuthoritativeSecurityMetrics: (db: any, audit: any, batch: any) => Promise<void>;
  validateCouponAuthoritative: (input: any) => any;
  promotions: any[];
}) {
  const {
    requireServerAuth,
    optionalServerAuth,
    getAdminDb,
    createAuthoritativeAuditRecord,
    updateAuthoritativeSecurityMetrics,
    validateCouponAuthoritative,
    promotions,
  } = deps;

  async function resolveTenant(db: any, slug: string) {
    const normalized = clean(slug, 100).toLowerCase();
    if (!normalized) return null;
    const snap = await db.collection('tenants').where('slug', '==', normalized).limit(2).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    const data = doc.data() || {};
    const status = String(data.status || data.lifecycleStatus || 'active').toLowerCase();
    if (status !== 'active') return null;
    return { id: doc.id, ...data };
  }

  function normalizeItems(input: unknown): CheckoutItemInput[] {
    if (!Array.isArray(input) || input.length < 1 || input.length > 100) {
      throw new Error('Cart must contain between 1 and 100 line items.');
    }
    return input.map((raw: any) => ({
      productId: clean(raw?.productId || raw?.id, 120),
      variantSku: raw?.variantSku ? clean(raw.variantSku, 100) : undefined,
      quantity: positiveQuantity(raw?.quantity),
      clientPrice: raw?.price == null ? undefined : Number(raw.price),
    })).map(item => {
      if (!item.productId) throw new Error('Each cart item requires a productId.');
      if (item.clientPrice !== undefined && !Number.isFinite(item.clientPrice)) {
        throw new Error('Client price must be numeric when supplied.');
      }
      return item;
    });
  }

  async function releaseExpiredReservations(db: any, tenantId: string): Promise<number> {
    const now = new Date().toISOString();
    const snap = await db.collection('inventory_reservations')
      .where('tenantId', '==', tenantId)
      .where('status', '==', 'active')
      .where('expiresAt', '<=', now)
      .limit(100)
      .get();

    let released = 0;
    for (const reservationDoc of snap.docs) {
      const reservationRef = reservationDoc.ref;
      const reservation = reservationDoc.data() || {};
      const reservationItems = Array.isArray(reservation.items) ? reservation.items : [];

      await db.runTransaction(async (tx: any) => {
        const fresh = await tx.get(reservationRef);
        if (!fresh.exists) return;
        const current = fresh.data() || {};
        if (String(current.tenantId || '') !== tenantId || String(current.status || '') !== 'active') return;
        const expiresAt = String(current.expiresAt || '');
        if (!expiresAt || expiresAt > now) return;

        for (const item of Array.isArray(current.items) ? current.items : reservationItems) {
          const productRef = db.collection('tenants').doc(tenantId).collection('products').doc(String(item.productId));
          const productSnap = await tx.get(productRef);
          if (!productSnap.exists) continue;
          const product = productSnap.data() || {};
          if (item.variantSku) {
            const variants = Array.isArray(product.variants) ? product.variants.map((v: any) => ({ ...v })) : [];
            const idx = variants.findIndex((v: any) => String(v.sku || '') === String(item.variantSku));
            if (idx >= 0) {
              variants[idx].reserved = Math.max(0, Number(variants[idx].reserved || 0) - Number(item.quantity || 0));
              tx.set(productRef, { variants, updatedAt: now }, { merge: true });
            }
          } else {
            tx.set(productRef, {
              reserved: Math.max(0, Number(product.reserved || product.reservedStock || 0) - Number(item.quantity || 0)),
              updatedAt: now,
            }, { merge: true });
          }
        }

        tx.set(reservationRef, { status: 'expired', expiredAt: now, updatedAt: now }, { merge: true });
        released += 1;
      });
    }
    return released;
  }

  async function calculateQuote(db: any, tenant: any, items: CheckoutItemInput[], couponCode?: string, shippingMethod?: string) {
    const productRefs = items.map(item => db.collection('tenants').doc(tenant.id).collection('products').doc(item.productId));
    const snaps = await Promise.all(productRefs.map((ref: any) => ref.get()));
    const seen = new Set<string>();
    const lineItems: any[] = [];

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (seen.has(item.productId + '::' + (item.variantSku || ''))) throw new Error('Duplicate cart line item.');
      seen.add(item.productId + '::' + (item.variantSku || ''));
      const snap = snaps[i];
      if (!snap.exists) throw new Error(`Product '${item.productId}' is not available.`);
      const product = snap.data() || {};
      if (String(product.tenantId || tenant.id) !== tenant.id) throw new Error('Cross-tenant product access is forbidden.');
      if (String(product.status || '').toLowerCase() !== 'active') throw new Error(`Product '${product.name || item.productId}' is not available.`);
      if (product.ecommerce?.published === false || product.ecommerce?.publishTargets?.website === false) {
        throw new Error(`Product '${product.name || item.productId}' is not published for the storefront.`);
      }

      let unitPrice = Number(product.price || 0);
      let stock = Number(product.stock || 0);
      let variantTitle: string | undefined;
      if (item.variantSku) {
        const variant = Array.isArray(product.variants)
          ? product.variants.find((v: any) => String(v.sku || '') === item.variantSku)
          : null;
        if (!variant) throw new Error(`Variant '${item.variantSku}' is not available.`);
        unitPrice = Number(variant.price ?? unitPrice);
        stock = Number(variant.stock ?? 0);
        variantTitle = clean(variant.title, 160) || undefined;
      }
      if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error('Product price is invalid.');
      if (!item.variantSku && stock < item.quantity) {
        throw new Error(`Insufficient stock for '${product.name || item.productId}'.`);
      }
      if (item.variantSku && stock < item.quantity) {
        throw new Error(`Insufficient stock for '${product.name || item.productId}'.`);
      }

      const lineSubtotal = money(unitPrice * item.quantity);
      lineItems.push({
        productId: snap.id,
        productName: clean(product.name, 160),
        sku: clean(product.sku, 100),
        variantSku: item.variantSku,
        variantTitle,
        quantity: item.quantity,
        serverUnitPrice: unitPrice,
        clientUnitPrice: item.clientPrice,
        priceMismatchDetected: item.clientPrice !== undefined && Math.abs(item.clientPrice - unitPrice) > 0.01,
        lineSubtotal,
        imageUrl: clean(product.imageUrl, 2000) || undefined,
        stockAvailable: stock,
      });
    }

    const subtotal = money(lineItems.reduce((sum, item) => sum + item.lineSubtotal, 0));
    const shipping = tenant.shippingPolicy || tenant.policies?.shipping || {};
    const standardFee = Number(shipping.standardFee ?? 0);
    const expressFee = Number(shipping.expressFee ?? standardFee);
    const pickupFee = Number(shipping.pickupFee ?? 0);
    const method = ['standard', 'express', 'pickup'].includes(String(shippingMethod || '').toLowerCase())
      ? String(shippingMethod).toLowerCase()
      : 'standard';
    let shippingCost = method === 'express' ? expressFee : method === 'pickup' ? pickupFee : standardFee;
    const freeThreshold = shipping.freeShippingThreshold == null ? null : Number(shipping.freeShippingThreshold);
    if (freeThreshold !== null && Number.isFinite(freeThreshold) && subtotal >= freeThreshold) shippingCost = 0;

    let discount = 0;
    let couponResult: any = null;
    if (couponCode) {
      couponResult = validateCouponAuthoritative({
        couponCode,
        cartItems: lineItems,
        authoritativeSubtotal: subtotal,
        couponsRegistry: promotions,
        shippingCost,
      });
      if (!couponResult.valid) throw new Error(couponResult.errorMessage || couponResult.message || 'Coupon is not valid.');
      discount = Number(couponResult.discountAmount || 0);
      if (couponResult.isFreeShipping) shippingCost = 0;
    }

    const taxRate = Number(tenant.taxRate ?? tenant.catalogPolicy?.taxRate ?? 0);
    const taxableAmount = Math.max(0, subtotal - discount);
    const taxAmount = money(taxableAmount * (Number.isFinite(taxRate) ? taxRate : 0));
    const grandTotal = money(Math.max(0, subtotal + shippingCost + taxAmount - discount));
    const currency = clean(tenant.currency?.code || tenant.currencyCode || 'SLE', 10).toUpperCase();

    return {
      items: lineItems,
      pricing: { subtotal, shippingCost: money(shippingCost), discount: money(discount), taxRate, taxAmount, grandTotal, currency, shippingMethod: method },
      coupon: couponResult ? { code: couponResult.code, description: couponResult.displayText } : null,
    };
  }

  app.post('/api/storefront/:tenantSlug/checkout/validate', async (req: any, res: any) => {
    try {
      const db = deps.getAdminDb();
      if (!db) return res.status(503).json({ success: false, error: 'Checkout service is not configured.' });
      const tenant = await resolveTenant(db, req.params.tenantSlug);
      if (!tenant) return res.status(404).json({ success: false, error: 'TENANT_NOT_FOUND' });
      const configSnap = await db.collection('tenants').doc(tenant.id).collection('storefront').doc('config').get();
      if (!configSnap.exists || String(configSnap.data()?.publicationStatus || '') !== 'published') {
        return res.status(404).json({ success: false, error: 'STOREFRONT_NOT_PUBLISHED' });
      }
      await releaseExpiredReservations(db, tenant.id);\n      const items = normalizeItems(req.body?.items);
      const quote = await calculateQuote(db, tenant, items, clean(req.body?.couponCode, 80) || undefined, clean(req.body?.shippingMethod, 30));
      return res.json({ success: true, quote });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err?.message || 'Unable to validate checkout.' });
    }
  });

  app.post('/api/storefront/:tenantSlug/orders', optionalServerAuth, async (req: any, res: any) => {
    try {
      const db = deps.getAdminDb();
      if (!db) return res.status(503).json({ success: false, error: 'Order service is not configured.' });
      const tenant = await resolveTenant(db, req.params.tenantSlug);
      if (!tenant) return res.status(404).json({ success: false, error: 'TENANT_NOT_FOUND' });
      const configSnap = await db.collection('tenants').doc(tenant.id).collection('storefront').doc('config').get();
      if (!configSnap.exists || String(configSnap.data()?.publicationStatus || '') !== 'published') {
        return res.status(404).json({ success: false, error: 'STOREFRONT_NOT_PUBLISHED' });
      }

      const items = normalizeItems(req.body?.items);
      const couponCode = clean(req.body?.couponCode, 80) || undefined;
      const shippingMethod = clean(req.body?.shippingMethod, 30);
      const customer = req.body?.customer || {};
      const customerUid = req.user?.uid ? String(req.user.uid) : null;
      const customerName = clean(customer.name, 160) || 'Guest Customer';
      const customerEmail = clean(customer.email, 320);
      const customerPhone = clean(customer.phone, 80);
      const shippingAddress: CheckoutAddress = {
        addressLine1: clean(req.body?.shippingAddress?.addressLine1, 250),
        city: clean(req.body?.shippingAddress?.city, 120),
        stateProvince: clean(req.body?.shippingAddress?.stateProvince, 120),
        postalCode: clean(req.body?.shippingAddress?.postalCode, 40),
        country: clean(req.body?.shippingAddress?.country, 120),
      };

      const quote = await calculateQuote(db, tenant, items, couponCode, shippingMethod);
      const orderId = makeOrderId();
      const reservationId = makeReservationId();
      const accessToken = crypto.randomBytes(32).toString('base64url');
      const now = new Date().toISOString();
      const ttlMs = 15 * 60 * 1000;
      const expiresAt = new Date(Date.now() + ttlMs).toISOString();
      const orderRef = db.collection('orders').doc(orderId);
      const tenantOrderRef = db.collection('tenants').doc(tenant.id).collection('orders').doc(orderId);
      const reservationRef = db.collection('inventory_reservations').doc(reservationId);
      const productRefs = quote.items.map((item: any) => db.collection('tenants').doc(tenant.id).collection('products').doc(item.productId));
      const audit = createAuthoritativeAuditRecord({
        tenantId: tenant.id,
        actorUid: customerUid || 'guest',
        actorName: customerName,
        actorEmail: customerEmail || null,
        actorRole: 'Customer',
        action: 'ORDER_CREATED',
        module: 'Storefront Checkout',
        targetType: 'order',
        targetId: orderId,
        targetName: orderId,
        result: 'success',
        severity: 'info',
        details: `Created storefront order ${orderId} in pending-payment state.`,
      });

      const result = await db.runTransaction(async (tx: any) => {
        const productSnaps = await Promise.all(productRefs.map((ref: any) => tx.get(ref)));
        const reservationItems: any[] = [];
        const updatedProducts: any[] = [];

        for (let i = 0; i < quote.items.length; i += 1) {
          const line = quote.items[i];
          const snap = productSnaps[i];
          if (!snap.exists) throw new Error(`Product '${line.productId}' is no longer available.`);
          const product = snap.data() || {};
          const variants = Array.isArray(product.variants) ? product.variants.map((v: any) => ({ ...v })) : [];
          let stockBefore = Number(product.stock || 0);
          let stockReservedBefore = Number(product.reserved || product.reservedStock || 0);

          if (line.variantSku) {
            const idx = variants.findIndex((v: any) => String(v.sku || '') === line.variantSku);
            if (idx < 0) throw new Error(`Variant '${line.variantSku}' is no longer available.`);
            const variant = variants[idx];
            const reserved = Number(variant.reserved || 0);
            const available = Number(variant.stock || 0) - reserved;
            if (available < line.quantity) {
              throw new Error(`Insufficient stock for '${line.productName}'.`);
            }
            variant.reserved = reserved + line.quantity;
            reservationItems.push({ productId: line.productId, variantSku: line.variantSku, quantity: line.quantity, stockBefore: Number(variant.stock || 0), reservedBefore: reserved });
          } else {
            const available = stockBefore - stockReservedBefore;
            if (available < line.quantity) {
              throw new Error(`Insufficient stock for '${line.productName}'.`);
            }
            stockReservedBefore += line.quantity;
            reservationItems.push({ productId: line.productId, quantity: line.quantity, stockBefore, reservedBefore: Number(product.reserved || product.reservedStock || 0) });
          }

          updatedProducts.push({ ref: productRefs[i], variants, stock: stockBefore, reserved: stockReservedBefore });
        }

        for (const update of updatedProducts) {
          tx.set(update.ref, { variants: update.variants, stock: update.stock, reserved: update.reserved, updatedAt: now }, { merge: true });
        }

        const order = {
          id: orderId,
          orderNumber: orderId,
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          customerUid,
          customer: { id: clean(customer.id, 160), name: customerName, email: customerEmail, phone: customerPhone },
          items: quote.items,
          subtotal: quote.pricing.subtotal,
          shippingFee: quote.pricing.shippingCost,
          shippingMethod: quote.pricing.shippingMethod,
          discountAmount: quote.pricing.discount,
          taxRate: quote.pricing.taxRate,
          taxAmount: quote.pricing.taxAmount,
          grandTotal: quote.pricing.grandTotal,
          totalAmount: quote.pricing.grandTotal,
          currency: quote.pricing.currency,
          paymentStatus: 'pending',
          fulfillmentStatus: 'unfulfilled',
          status: 'pending_payment',
          inventoryReservationId: reservationId,
          inventoryReservationExpiresAt: expiresAt,
          accessTokenHash: hashAccessToken(accessToken),
          shippingAddress,
          notes: clean(req.body?.notes, 1000),
          createdAt: now,
          updatedAt: now,
        };

        tx.create(orderRef, order);
        tx.create(tenantOrderRef, order);
        tx.create(reservationRef, {
          id: reservationId,
          tenantId: tenant.id,
          orderId,
          status: 'active',
          createdAt: now,
          expiresAt,
          items: reservationItems,
        });
        tx.set(db.collection('audit_logs').doc(audit.id), audit);
        await updateAuthoritativeSecurityMetrics(db, audit, tx);
        return { order, reservation: { id: reservationId, status: 'active', expiresAt, items: reservationItems } };
      });

      return res.status(201).json({ success: true, order: result.order, reservation: result.reservation, accessToken });
    } catch (err: any) {
      const status = /insufficient stock|not available|not published|cross-tenant|quantity|cart/i.test(String(err?.message)) ? 409 : 400;
      return res.status(status).json({ success: false, error: err?.message || 'Unable to create order.' });
    }
  });

  app.get('/api/storefront/:tenantSlug/orders', requireServerAuth, async (req: any, res: any) => {
    try {
      const db = deps.getAdminDb();
      if (!db) return res.status(503).json({ success: false, error: 'Order service is not configured.' });
      const tenant = await resolveTenant(db, req.params.tenantSlug);
      if (!tenant) return res.status(404).json({ success: false, error: 'TENANT_NOT_FOUND' });
      const snap = await db.collection('orders').where('tenantId', '==', tenant.id).where('customerUid', '==', req.user.uid).limit(100).get();
      return res.json({ success: true, orders: snap.docs.map((doc: any) => doc.data()) });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Unable to load orders.' });
    }
  });

  app.get('/api/storefront/:tenantSlug/orders/:orderId', optionalServerAuth, async (req: any, res: any) => {
    try {
      const db = deps.getAdminDb();
      if (!db) return res.status(503).json({ success: false, error: 'Order service is not configured.' });
      const tenant = await resolveTenant(db, req.params.tenantSlug);
      if (!tenant) return res.status(404).json({ success: false, error: 'TENANT_NOT_FOUND' });
      const snap = await db.collection('orders').doc(req.params.orderId).get();
      if (!snap.exists || String(snap.data()?.tenantId || '') !== tenant.id) return res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND' });
      const order = snap.data() || {};
      const token = clean(req.query?.accessToken, 200);
      const authHeader = String(req.headers.authorization || '');
      const tokenMatches = token && order.accessTokenHash === hashAccessToken(token);
      const bearerUid = req.user?.uid ? String(req.user.uid) : null;
      const userMatches = Boolean(bearerUid && order.customerUid && String(order.customerUid) === bearerUid);
      if (!tokenMatches && !userMatches) return res.status(403).json({ success: false, error: 'ORDER_ACCESS_DENIED' });
      return res.json({ success: true, order });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Unable to load order.' });
    }
  });

  app.post('/api/storefront/:tenantSlug/orders/:orderId/cancel', async (req: any, res: any) => {
    try {
      const db = deps.getAdminDb();
      if (!db) return res.status(503).json({ success: false, error: 'Order service is not configured.' });
      const tenant = await resolveTenant(db, req.params.tenantSlug);
      if (!tenant) return res.status(404).json({ success: false, error: 'TENANT_NOT_FOUND' });
      const orderRef = db.collection('orders').doc(req.params.orderId);
      const orderSnap = await orderRef.get();
      if (!orderSnap.exists || String(orderSnap.data()?.tenantId || '') !== tenant.id) return res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND' });
      const order = orderSnap.data() || {};
      const token = clean(req.body?.accessToken, 200);
      if (!token || order.accessTokenHash !== hashAccessToken(token)) return res.status(403).json({ success: false, error: 'ORDER_ACCESS_DENIED' });
      if (String(order.paymentStatus || '').toLowerCase() === 'paid') return res.status(409).json({ success: false, error: 'PAID_ORDER_CANNOT_BE_CANCELLED' });
      const reservationId = String(order.inventoryReservationId || '');
      await db.runTransaction(async (tx: any) => {
        const fresh = await tx.get(orderRef);
        if (!fresh.exists) throw new Error('ORDER_NOT_FOUND');
        const current = fresh.data() || {};
        if (String(current.paymentStatus || '').toLowerCase() === 'paid') throw new Error('PAID_ORDER_CANNOT_BE_CANCELLED');
        if (String(current.status || '') === 'cancelled') return;
        const reservationRef = reservationId ? db.collection('inventory_reservations').doc(reservationId) : null;
        const reservationSnap = reservationRef ? await tx.get(reservationRef) : null;
        if (reservationSnap?.exists) {
          const reservation = reservationSnap.data() || {};
          for (const item of Array.isArray(reservation.items) ? reservation.items : []) {
            const productRef = db.collection('tenants').doc(tenant.id).collection('products').doc(String(item.productId));
            const productSnap = await tx.get(productRef);
            if (!productSnap.exists) continue;
            const product = productSnap.data() || {};
            if (item.variantSku) {
              const variants = Array.isArray(product.variants) ? product.variants.map((v: any) => ({ ...v })) : [];
              const idx = variants.findIndex((v: any) => String(v.sku || '') === String(item.variantSku));
              if (idx >= 0) variants[idx].reserved = Math.max(0, Number(variants[idx].reserved || 0) - Number(item.quantity || 0));
              tx.set(productRef, { variants, updatedAt: new Date().toISOString() }, { merge: true });
            } else {
              tx.set(productRef, { reserved: Math.max(0, Number(product.reserved || 0) - Number(item.quantity || 0)), updatedAt: new Date().toISOString() }, { merge: true });
            }
          }
          tx.set(reservationRef, { status: 'released', releasedAt: new Date().toISOString() }, { merge: true });
        }
        tx.set(orderRef, { status: 'cancelled', paymentStatus: 'cancelled', cancelledAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { merge: true });
        tx.set(db.collection('tenants').doc(tenant.id).collection('orders').doc(req.params.orderId), { status: 'cancelled', paymentStatus: 'cancelled', cancelledAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { merge: true });
      });
      return res.json({ success: true, orderId: req.params.orderId, status: 'cancelled' });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err?.message || 'Unable to cancel order.' });
    }
  });
}
