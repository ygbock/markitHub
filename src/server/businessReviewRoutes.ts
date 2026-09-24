import type { Express, RequestHandler } from 'express';
import { createAuthoritativeAuditRecord } from './auditService';
import { evaluateBusinessOnboardingReadiness } from './businessOnboarding';

type DbLike = any;

function clean(value: unknown, max = 200): string {
  return String(value ?? '').trim().slice(0, max);
}

function reviewError(message: string, statusCode: number): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode });
}

async function loadBusiness(db: DbLike, businessId: string) {
  const ref = db.collection('businesses').doc(businessId);
  const snap = await ref.get();
  if (!snap.exists) throw reviewError('Business not found.', 404);
  return { ref, business: { id: snap.id, ...snap.data() } };
}

export function registerBusinessReviewRoutes(params: {
  app: Express;
  requireServerAuth: RequestHandler;
  requirePlatformAdmin: RequestHandler;
  getAdminDb: () => DbLike | null;
}): void {
  const { app, requireServerAuth, requirePlatformAdmin, getAdminDb } = params;
  const platformAuth = [requireServerAuth, requirePlatformAdmin];

  app.get('/api/platform/business-reviews', ...platformAuth, async (req: any, res: any) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const requestedStatus = clean(req.query.status, 60);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
      let query: any = db.collection('businesses');
      const queueStatus = requestedStatus || 'submitted_for_review';
      if (queueStatus) query = query.where('onboardingStatus', '==', queueStatus);
      const snap = await query.limit(limit).get();
      const businesses = snap.docs
        .map((doc: any) => ({ id: doc.id, ...doc.data() }))
        .map((business: any) => ({
          id: business.id,
          legalName: business.legalName || '',
          tradingName: business.tradingName || business.legalName || '',
          ownerUid: business.ownerUid || '',
          businessMode: business.businessMode || 'listing_only',
          status: business.status || 'draft',
          verificationStatus: business.verificationStatus || 'pending',
          onboardingStatus: business.onboardingStatus || 'in_progress',
          listing: business.listing || null,
          locations: Array.isArray(business.locations) ? business.locations : [],
          readiness: evaluateBusinessOnboardingReadiness(business),
          submittedAt: business.submittedAt || null,
          updatedAt: business.updatedAt || null,
        }));
      return res.json({ success: true, businesses });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Unable to load business review queue.' });
    }
  });

  app.get('/api/platform/business-reviews/:businessId', ...platformAuth, async (req: any, res: any) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const { business } = await loadBusiness(db, clean(req.params.businessId));
      return res.json({
        success: true,
        business: {
          id: business.id,
          legalName: business.legalName || '',
          tradingName: business.tradingName || '',
          ownerUid: business.ownerUid || '',
          email: business.email || '',
          phone: business.phone || '',
          businessMode: business.businessMode || 'listing_only',
          status: business.status || 'draft',
          verificationStatus: business.verificationStatus || 'pending',
          onboardingStatus: business.onboardingStatus || 'in_progress',
          listing: business.listing || null,
          locations: Array.isArray(business.locations) ? business.locations : [],
          services: Array.isArray(business.services) ? business.services : [],
          readiness: evaluateBusinessOnboardingReadiness(business),
        },
      });
    } catch (err: any) {
      return res.status(Number(err?.statusCode) || 500).json({ success: false, error: err?.message || 'Unable to load business review file.' });
    }
  });

  app.post('/api/platform/business-reviews/:businessId/approve', ...platformAuth, async (req: any, res: any) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const businessId = clean(req.params.businessId);
      const ref = db.collection('businesses').doc(businessId);
      let updatedBusiness: any = null;
      let audit: any = null;

      await db.runTransaction(async (tx: any) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw reviewError('Business not found.', 404);
        const business = { id: snap.id, ...snap.data() } as any;

        const readiness = evaluateBusinessOnboardingReadiness(business);
        if (!readiness.readyForReview) {
          throw Object.assign(reviewError('Business has incomplete required onboarding data.', 409), { readiness });
        }
        if (business.onboardingStatus !== 'submitted_for_review') {
          throw reviewError('Business must be submitted for review before approval.', 409);
        }
        if (business.status === 'active' && business.verificationStatus === 'verified' && business.listing?.isPublished === true) {
          throw reviewError('Business is already approved and published.', 409);
        }

        const now = new Date().toISOString();
        const patch = {
          status: 'active',
          verificationStatus: 'verified',
          onboardingStatus: 'approved',
          listing: { ...(business.listing || {}), isPublished: true },
          reviewedAt: now,
          reviewedBy: req.user.uid,
          reviewNotes: clean(req.body?.notes, 2000),
          updatedAt: now,
        };
        audit = createAuthoritativeAuditRecord({
          tenantId: 'platform',
          actorUid: req.user.uid,
          actorEmail: req.user.email,
          actorRole: 'Platform Administrator',
          action: 'BUSINESS_REVIEW_APPROVED',
          module: 'Business Verification',
          targetType: 'business',
          targetId: businessId,
          targetName: business.tradingName || business.legalName,
          previousState: {
            status: business.status,
            verificationStatus: business.verificationStatus,
            onboardingStatus: business.onboardingStatus,
            listingPublished: business.listing?.isPublished === true,
          },
          newState: patch,
          reason: clean(req.body?.notes, 2000) || 'Business approved through platform review workflow.',
          result: 'success',
        });
        tx.set(ref, patch, { merge: true });
        tx.create(db.collection('audit_logs').doc(audit.id), audit);
        updatedBusiness = { ...business, ...patch };
      });

      return res.json({ success: true, business: updatedBusiness, audit });
    } catch (err: any) {
      return res.status(Number(err?.statusCode) || 500).json({ success: false, error: err?.message || 'Unable to approve business.' });
    }
  });

  app.post('/api/platform/business-reviews/:businessId/reject', ...platformAuth, async (req: any, res: any) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: 'Platform service is not configured.' });
    try {
      const businessId = clean(req.params.businessId);
      const ref = db.collection('businesses').doc(businessId);
      let updatedBusiness: any = null;
      let audit: any = null;

      await db.runTransaction(async (tx: any) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw reviewError('Business not found.', 404);
        const business = { id: snap.id, ...snap.data() } as any;

        if (business.onboardingStatus !== 'submitted_for_review') {
          throw reviewError('Business must be submitted for review before rejection.', 409);
        }
        const notes = clean(req.body?.notes, 2000);
        if (!notes) throw reviewError('Review notes are required when rejecting a business.', 400);

        const now = new Date().toISOString();
        const patch = {
          status: 'pending_verification',
          verificationStatus: 'rejected',
          onboardingStatus: 'rejected',
          listing: { ...(business.listing || {}), isPublished: false },
          reviewedAt: now,
          reviewedBy: req.user.uid,
          reviewNotes: notes,
          updatedAt: now,
        };
        audit = createAuthoritativeAuditRecord({
          tenantId: 'platform',
          actorUid: req.user.uid,
          actorEmail: req.user.email,
          actorRole: 'Platform Administrator',
          action: 'BUSINESS_REVIEW_REJECTED',
          module: 'Business Verification',
          targetType: 'business',
          targetId: businessId,
          targetName: business.tradingName || business.legalName,
          previousState: {
            status: business.status,
            verificationStatus: business.verificationStatus,
            onboardingStatus: business.onboardingStatus,
            listingPublished: business.listing?.isPublished === true,
          },
          newState: patch,
          reason: notes,
          result: 'success',
        });
        tx.set(ref, patch, { merge: true });
        tx.create(db.collection('audit_logs').doc(audit.id), audit);
        updatedBusiness = { ...business, ...patch };
      });

      return res.json({ success: true, business: updatedBusiness, audit });
    } catch (err: any) {
      return res.status(Number(err?.statusCode) || 500).json({ success: false, error: err?.message || 'Unable to reject business.' });
    }
  });

}
