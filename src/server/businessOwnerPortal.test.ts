import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CANONICAL_ROUTE_DEFINITIONS } from '../routes/canonicalRoutes';
import { buildBusinessRegistrationRecords, validateBusinessRegistrationRequest } from './businessRegistration';

test('Business Owner 1: signup has a public canonical route and owner dashboard requires ownership', () => {
  const signup = CANONICAL_ROUTE_DEFINITIONS.find(route => route.id === 'business.signup');
  const dashboard = CANONICAL_ROUTE_DEFINITIONS.find(route => route.id === 'business.dashboard');
  assert.equal(signup?.pattern, '/business/signup');
  assert.equal(signup?.auth, 'NONE');
  assert.equal(dashboard?.auth, 'BUSINESS_OWNER');
});

test('Business Owner 2: registration creates a review-gated business rather than a published listing', () => {
  const request = validateBusinessRegistrationRequest({
    businessName: 'Owner Test Business',
    category: 'Retail',
    address: '1 Main Street',
    city: 'Freetown',
    businessMode: 'listing_only',
    idempotencyKey: 'owner-test-1',
  });
  const records = buildBusinessRegistrationRecords({ request, ownerUid: 'owner-1', businessId: 'biz-owner-1', locationId: 'loc-owner-1' });
  assert.equal(records.business.ownerUid, 'owner-1');
  assert.equal(records.business.status, 'pending_verification');
  assert.equal(records.business.verificationStatus, 'pending');
  assert.equal(records.business.listing.isPublished, false);
  assert.equal(records.relationship.relationshipType, 'owner');
});

test('Business Owner 3: owner workspace API is authenticated and returns only owner-scoped business data', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const route = server.slice(server.indexOf("app.get('/api/business/owned'"));
  assert.match(route, /requireServerAuth/);
  assert.match(route, /where\('ownerUid', '==', String\(req\.user\.uid\)\)/);
  assert.match(route, /tenantIds/);
  assert.match(route, /verificationStatus/);
});

test('Business Owner 4: registration idempotency keys cannot be replayed across owners', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const registration = server.slice(server.indexOf("app.post('/api/business/register'"));
  assert.match(registration, /priorOwnerUid/);
  assert.match(registration, /Idempotency-Key belongs to another business owner/);
  assert.match(registration, /ownerUid: req\.user\.uid/);
  assert.match(registration, /accountRole: 'BUSINESS_OWNER'/);
  assert.match(registration, /Business registration record belongs to another owner/);
});

test('Business Owner 5: owner signup and portal are mounted into the canonical app', () => {
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(app, /BusinessOwnerSignup/);
  assert.match(app, /BusinessOwnerPortal/);
  assert.match(app, /currentRoute\.definition\.id === 'business\.signup'/);
  assert.match(app, /currentRoute\.definition\.id === 'business\.dashboard'/);
});

test('Business Owner 6: onboarding readiness and review submission are owner-scoped and server-authoritative', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const readiness = server.slice(server.indexOf("app.get('/api/business/:businessId/readiness'"));
  const submission = server.slice(server.indexOf("app.post('/api/business/:businessId/submit-review'"));
  assert.match(readiness, /requireServerAuth/);
  assert.match(readiness, /Only the authoritative business owner may access onboarding readiness/);
  assert.match(readiness, /evaluateBusinessOnboardingReadiness/);
  assert.match(submission, /requireServerAuth/);
  assert.match(submission, /Only the authoritative business owner may submit this business for review/);
  assert.match(submission, /readyForReview/);
  assert.match(submission, /onboardingStatus: 'submitted_for_review'/);
  assert.match(submission, /BUSINESS_SUBMITTED_FOR_REVIEW/);
});

test('Business Owner 7: owner portal consumes authoritative readiness and cannot publish directly', () => {
  const portal = readFileSync(resolve(process.cwd(), 'src/components/business/BusinessOwnerPortal.tsx'), 'utf8');
  assert.match(portal, /\/api\/business\/'\+encodeURIComponent\(selected\.id\)\+'\/readiness/);
  assert.match(portal, /\/api\/business\/'\+encodeURIComponent\(selected\.id\)\+'\/submit-review/);
  assert.match(portal, /Submit for platform review/);
  assert.doesNotMatch(portal, /isPublished\s*:\s*true/);
});


test('Business Owner 8: listing management is server-authoritative, owner-scoped, and publication-gated', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const routes = readFileSync(resolve(process.cwd(), 'src/server/businessProfileRoutes.ts'), 'utf8');
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(server, /registerBusinessProfileRoutes/);
  assert.match(routes, /requireServerAuth/);
  assert.match(routes, /Only the authoritative business owner may manage this business/);
  assert.match(routes, /BUSINESS_PROFILE_UPDATED/);
  assert.match(routes, /BUSINESS_LOCATION_CREATED/);
  assert.match(routes, /Operational locations cannot be deleted/);
  assert.match(routes, /current\.isPublished = business\.listing\?\.isPublished === true/);
  assert.doesNotMatch(routes, /isPublished\s*=\s*true/);
  assert.match(app, /BusinessOwnerListingManagement/);
  assert.match(app, /currentRoute\.definition\.id === 'business\.locations'/);
});

test('Business Owner 9: authoritative profile management exposes profile, location and service endpoints', () => {
  const routes = readFileSync(resolve(process.cwd(), 'src/server/businessProfileRoutes.ts'), 'utf8');
  assert.match(routes, /app\.get\('\/api\/business\/:businessId\/profile'/);
  assert.match(routes, /app\.patch\('\/api\/business\/:businessId\/profile'/);
  assert.match(routes, /app\.post\('\/api\/business\/:businessId\/locations'/);
  assert.match(routes, /app\.patch\('\/api\/business\/:businessId\/locations\/:locationId'/);
  assert.match(routes, /app\.delete\('\/api\/business\/:businessId\/locations\/:locationId'/);
  assert.match(routes, /app\.post\('\/api\/business\/:businessId\/services'/);
  assert.match(routes, /app\.delete\('\/api\/business\/:businessId\/services\/:serviceId'/);
});


test('Business Owner 10: profile mutations validate contact data and audit service lifecycle changes', () => {
  const routes = readFileSync(resolve(process.cwd(), 'src/server/businessProfileRoutes.ts'), 'utf8');
  assert.match(routes, /Business email is invalid/);
  assert.match(routes, /BUSINESS_SERVICE_CREATED/);
  assert.match(routes, /BUSINESS_SERVICE_DELETED/);
  assert.match(routes, /db\.runTransaction/);
  assert.match(routes, /businessId, name, description, price, durationMinutes/);
});


test('Business Owner 11: platform review workflow is mounted and publication remains server-gated', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const routes = readFileSync(resolve(process.cwd(), 'src/server/businessReviewRoutes.ts'), 'utf8');
  assert.match(server, /registerBusinessReviewRoutes/);
  assert.match(server, /requirePlatformAdmin/);
  assert.match(routes, /\/api\/platform\/business-reviews/);
  assert.match(routes, /\/approve/);
  assert.match(routes, /\/reject/);
  assert.match(routes, /onboardingStatus !== 'submitted_for_review'/);
  assert.match(routes, /readyForReview/);
  assert.match(routes, /BUSINESS_REVIEW_APPROVED/);
  assert.match(routes, /BUSINESS_REVIEW_REJECTED/);
  assert.match(routes, /listing:\s*\{\s*\.\.\.\(\s*business\.listing/);
});

test('Business Owner 12: Discovery sign-in routes by authoritative identity instead of the default tenant or customer mock session', () => {
  const login = readFileSync(resolve(process.cwd(), 'src/components/LoginPage.tsx'), 'utf8');
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(login, /defaultLoginMode/);
  assert.match(login, /returnUrl\?\.startsWith\('\/tenant\/'\)/);
  assert.match(login, /authContext\.isPlatformAdmin \|\| authContext\.isSuperAdmin/);
  assert.match(login, /accountRole === 'BUSINESS_OWNER'/);
  assert.match(login, /\/account\/profile/);
  assert.doesNotMatch(login, /else \{\s*navigateTo\('\/tenant\/nexus-retail\/dashboard'\)/);
  assert.match(app, /useState<Customer \| null>\(null\)/);
  assert.doesNotMatch(app, /useState<Customer \| null>\(INITIAL_CUSTOMERS\[0\]\)/);
});


test('Business Owner 13: tenant provisioning is post-approval, owner-authorized, idempotent, and audited', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const start = server.indexOf("app.post('/api/business/provision-tenant'");
  const end = server.indexOf("// TENANT AUDIT & SECURITY TELEMETRY", start);
  const route = server.slice(start, end);

  assert.match(route, /requireServerAuth/);
  assert.match(route, /Only the authoritative business owner may provision a tenant/);
  assert.match(route, /Idempotency-Key is already bound to a different provisioning request/);
  assert.match(route, /business\.businessMode.*listing_and_store/s);
  assert.match(route, /business\.verificationStatus.*verified/s);
  assert.match(route, /business\.onboardingStatus.*approved/s);
  assert.match(route, /business\.listing\?\.isPublished !== true/);
  assert.match(route, /Inactive business locations cannot be provisioned/);
  assert.match(route, /location\.tenantId/);
  assert.match(route, /TENANT_PROVISIONED/);
  assert.match(route, /transaction\.create\(db\.collection\('audit_logs'\)/);
  assert.match(route, /replayed/);
});


test('Business Owner 14: lifecycle is closed-loop from owner signup through review, rejection/resubmission, approval, publication, and tenant provisioning', () => {
  const registration = readFileSync(resolve(process.cwd(), 'src/server/businessRegistration.ts'), 'utf8');
  const onboarding = readFileSync(resolve(process.cwd(), 'src/server/businessOnboarding.ts'), 'utf8');
  const review = readFileSync(resolve(process.cwd(), 'src/server/businessReviewRoutes.ts'), 'utf8');
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const portal = readFileSync(resolve(process.cwd(), 'src/components/business/BusinessOwnerPortal.tsx'), 'utf8');

  // Owner signup -> review-gated business.
  assert.match(registration, /ownerUid/);
  assert.match(registration, /listing[\s\S]*isPublished.*false/);
  assert.match(registration, /businessMode/);

  // Readiness -> owner-only submission.
  assert.match(onboarding, /readyForReview/);
  assert.match(server, /Only the authoritative business owner may submit this business for review/);
  assert.match(server, /onboardingStatus: 'submitted_for_review'/);
  assert.match(server, /BUSINESS_SUBMITTED_FOR_REVIEW/);

  // Platform queue -> approval -> publication.
  assert.match(review, /queueStatus = requestedStatus \|\| 'submitted_for_review'/);
  assert.match(review, /BUSINESS_REVIEW_APPROVED/);
  assert.match(review, /verificationStatus: 'verified'/);
  assert.match(review, /onboardingStatus: 'approved'/);
  assert.match(review, /isPublished: true/);

  // Rejection -> owner correction/resubmission -> review queue.
  assert.match(review, /BUSINESS_REVIEW_REJECTED/);
  assert.match(review, /onboardingStatus: 'rejected'/);
  assert.match(review, /verificationStatus: 'rejected'/);
  assert.match(server, /BUSINESS_RESUBMITTED_FOR_REVIEW/);
  assert.match(server, /wasRejected/);
  assert.match(server, /verificationStatus: wasRejected \? 'pending'/);
  assert.match(server, /listing: \{ \.\.\.\(business\.listing \|\| \{\}\), isPublished: false \}/);

  // Approval is required before operational commerce provisioning.
  const provisioningStart = server.indexOf("app.post('/api/business/provision-tenant'");
  const provisioningEnd = server.indexOf("// TENANT AUDIT & SECURITY TELEMETRY", provisioningStart);
  const provisioning = server.slice(provisioningStart, provisioningEnd);
  assert.ok(provisioningStart >= 0 && provisioningEnd > provisioningStart);
  assert.match(provisioning, /business\.businessMode.*listing_and_store/s);
  assert.match(provisioning, /business\.status.*active/s);
  assert.match(provisioning, /business\.verificationStatus.*verified/s);
  assert.match(provisioning, /business\.onboardingStatus.*approved/s);
  assert.match(provisioning, /business\.listing\?\.isPublished !== true/);
  assert.match(provisioning, /location\.tenantId/);
  assert.match(provisioning, /plan\.status !== 'active'/);
  assert.match(provisioning, /TENANT_PROVISIONED/);
  assert.match(provisioning, /platform_provisioning_requests/);
  assert.match(provisioning, /replayed/);

  // The owner portal exposes review actions without granting client-side publication.
  assert.match(portal, /Submit for platform review/);
  assert.doesNotMatch(portal, /isPublished\s*:\s*true/);
});


test('Business Owner 15: platform review decisions re-read authoritative state inside transactions', () => {
  const routes = readFileSync(resolve(process.cwd(), 'src/server/businessReviewRoutes.ts'), 'utf8');
  const approve = routes.slice(routes.indexOf("app.post('/api/platform/business-reviews/:businessId/approve'"), routes.indexOf("app.post('/api/platform/business-reviews/:businessId/reject'"));
  const reject = routes.slice(routes.indexOf("app.post('/api/platform/business-reviews/:businessId/reject'"));

  assert.match(approve, /db\.runTransaction\(async \(tx: any\) =>/);
  assert.match(approve, /const snap = await tx\.get\(ref\)/);
  assert.match(approve, /business\.onboardingStatus !== 'submitted_for_review'/);
  assert.match(approve, /tx\.set\(ref, patch/);
  assert.match(reject, /db\.runTransaction\(async \(tx: any\) =>/);
  assert.match(reject, /const snap = await tx\.get\(ref\)/);
  assert.match(reject, /business\.onboardingStatus !== 'submitted_for_review'/);
  assert.match(reject, /tx\.set\(ref, patch/);
});


test('Business Owner 16: provisioning idempotency binds the complete request, not only business and location', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const start = server.indexOf("app.post('/api/business/provision-tenant'");
  const end = server.indexOf("// TENANT AUDIT & SECURITY TELEMETRY", start);
  const route = server.slice(start, end);

  assert.match(route, /String\(prior\.planId \|\| ''\) !== request\.planId/);
  assert.match(route, /String\(prior\.billingInterval \|\| 'monthly'\) !== request\.billingInterval/);
  assert.match(route, /Number\(prior\.trialDays \?\? 14\) !== Number\(request\.trialDays \?\? 14\)/);
  assert.match(route, /billingInterval: request\.billingInterval/);
  assert.match(route, /trialDays: request\.trialDays/);
});

test('Business Owner 17: provisioned owners recover an authoritative single-tenant context without a stale custom claim', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  const auth = readFileSync(resolve(process.cwd(), 'src/context/AuthContext.tsx'), 'utf8');

  const membershipGuardStart = server.indexOf('const requireActiveTenantMembership');
  assert.ok(membershipGuardStart >= 0, 'requireActiveTenantMembership must be present in server.ts');
  const membershipGuard = server.slice(membershipGuardStart);

  assert.match(membershipGuard, /tenant_memberships/);
  assert.match(membershipGuard, /where\('uid', '==', req\.user\.uid\)/);
  assert.match(membershipGuard, /activeMemberships/);
  assert.match(membershipGuard, /status \\|\\| ''/);
  assert.match(membershipGuard, /Multiple active tenant memberships exist/);
  assert.match(membershipGuard, /req\.user\.claims\.tenantId = tenantId/);
  assert.match(auth, /doc\(db, 'tenants',/);
  assert.match(auth, /tenantSlug/);
  assert.match(auth, /tenantCapabilities/);
  assert.match(app, /authoritative Firestore records surfaced through[\s\S]*AuthContext membership metadata/);
  assert.match(app, /tenantMemberships/);
});


test('Business Owner 18: provisioned owners receive authoritative tenant role permissions before tenant route authorization', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const membershipGuardStart = server.indexOf('const requireActiveTenantMembership');
  const membershipGuardEnd = server.indexOf('\n\n\n  registerTenantCatalogRoutes', membershipGuardStart);
  const membershipGuard = server.slice(membershipGuardStart, membershipGuardEnd);

  assert.match(membershipGuard, /authoritativeRole = ownerUid === req\.user\.uid/);
  assert.match(membershipGuard, /'Business Owner'/);
  assert.match(membershipGuard, /customPermissions/);
  assert.match(membershipGuard, /DEFAULT_ROLE_PERMISSIONS/);
  assert.match(membershipGuard, /req\.user\.claims\.role = authoritativeRole/);
  assert.match(membershipGuard, /req\.user\.claims\.permissions = authoritativePermissions/);
  assert.match(membershipGuard, /req\.user\.permissions = authoritativePermissions/);
});


test('Business Owner 19: ownership transfer requires authoritative tenant membership recovery', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const route = server.slice(server.indexOf("app.post('/api/tenant/ownership/transfer'"));
  assert.match(route, /app\.post\('\/api\/tenant\/ownership\/transfer', requireServerAuth, requireActiveTenantMembership/);
  assert.match(route, /establishTenantSecurityContext/);
  assert.match(route, /assertOwnershipTransferAllowed/);
});
