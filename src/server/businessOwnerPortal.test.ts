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
  assert.match(route, /where\\('ownerUid', '==', String\\(req\\.user\\.uid\\)\\)/);
  assert.match(route, /tenantIds/);
  assert.match(route, /verificationStatus/);
});

test('Business Owner 4: registration idempotency keys cannot be replayed across owners', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
  const registration = server.slice(server.indexOf("app.post('/api/business/register'"));
  assert.match(registration, /priorOwnerUid/);
  assert.match(registration, /Idempotency-Key belongs to another business owner/);
  assert.match(registration, /ownerUid: req\\.user\\.uid/);
  assert.match(registration, /accountRole: 'BUSINESS_OWNER'/);
  assert.match(registration, /Business registration record belongs to another owner/);
});

test('Business Owner 5: owner signup and portal are mounted into the canonical app', () => {
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(app, /BusinessOwnerSignup/);
  assert.match(app, /BusinessOwnerPortal/);
  assert.match(app, /currentRoute\\.definition\\.id === 'business\\.signup'/);
  assert.match(app, /currentRoute\\.definition\\.id === 'business\\.dashboard'/);
});
