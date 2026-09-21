import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBusinessOnboardingReadiness } from './businessOnboarding';

function baseBusiness(overrides: any = {}) {
  return {
    id: 'biz-readiness',
    legalName: 'Readiness Business',
    tradingName: 'Readiness Business',
    status: 'pending_verification',
    verificationStatus: 'pending',
    businessMode: 'listing_only',
    onboardingStatus: 'in_progress',
    email: 'owner@example.com',
    listing: {
      headline: 'A real business',
      description: 'A complete public description.',
      categories: ['Retail'],
      isPublished: false,
    },
    locations: [{
      id: 'loc-1',
      addressLine1: '1 Main Street',
      city: 'Freetown',
      country: 'Sierra Leone',
      phone: '+232 76 000 000',
      isActive: true,
    }],
    ...overrides,
  };
}

test('Business onboarding readiness requires complete identity, location, listing and contact data', () => {
  const readiness = evaluateBusinessOnboardingReadiness(baseBusiness());
  assert.equal(readiness.readyForReview, true);
  assert.equal(readiness.readyForPublication, false);
  assert.equal(readiness.nextAction, 'submit_review');
  assert.equal(readiness.requiredCount, 4);
  assert.equal(readiness.requiredCount, readiness.checks.filter(check => check.required && check.complete).length);
});

test('Business onboarding readiness fails closed when required setup is incomplete', () => {
  const readiness = evaluateBusinessOnboardingReadiness(baseBusiness({
    tradingName: '',
    listing: { headline: '', description: '', categories: [], isPublished: false },
    locations: [],
    email: '',
  }));
  assert.equal(readiness.readyForReview, false);
  assert.equal(readiness.nextAction, 'complete_setup');
  assert.ok(readiness.checks.some(check => check.id === 'identity' && !check.complete));
  assert.ok(readiness.checks.some(check => check.id === 'location' && !check.complete));
  assert.ok(readiness.checks.some(check => check.id === 'listing_content' && !check.complete));
  assert.ok(readiness.checks.some(check => check.id === 'contact' && !check.complete));
});

test('Discovery publication requires active status, verified identity and explicit publication', () => {
  const readiness = evaluateBusinessOnboardingReadiness(baseBusiness({
    status: 'active',
    verificationStatus: 'verified',
    listing: {
      headline: 'A real business',
      description: 'A complete public description.',
      categories: ['Retail'],
      isPublished: true,
    },
  }));
  assert.equal(readiness.readyForReview, true);
  assert.equal(readiness.readyForPublication, true);
  assert.equal(readiness.nextAction, 'published');
});

test('Verification is advisory for review readiness but mandatory for publication', () => {
  const readiness = evaluateBusinessOnboardingReadiness(baseBusiness());
  const verification = readiness.checks.find(check => check.id === 'verification');
  assert.equal(verification?.required, false);
  assert.equal(verification?.complete, false);
  assert.equal(readiness.readyForReview, true);
  assert.equal(readiness.readyForPublication, false);
});
