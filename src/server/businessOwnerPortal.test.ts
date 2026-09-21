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
  assert.match(routes, /listing: \{ \.(?:\.\.)?business\.listing/);
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
