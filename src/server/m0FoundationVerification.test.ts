import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseCanonicalRoute } from '../routes/canonicalRoutes';
import { DEFAULT_TENANT_CAPABILITIES } from '../context/TenantContext';

const typesFile = fs.readFileSync(path.resolve('src/types.ts'), 'utf-8');
const tenantContextFile = fs.readFileSync(path.resolve('src/context/TenantContext.tsx'), 'utf-8');
const sharedIndexFile = fs.readFileSync(path.resolve('src/components/shared/index.ts'), 'utf-8');
const buttonFile = fs.readFileSync(path.resolve('src/components/shared/Button.tsx'), 'utf-8');
const badgeFile = fs.readFileSync(path.resolve('src/components/shared/Badge.tsx'), 'utf-8');
const cardFile = fs.readFileSync(path.resolve('src/components/shared/Card.tsx'), 'utf-8');
const stateFeedbackFile = fs.readFileSync(path.resolve('src/components/shared/StateFeedback.tsx'), 'utf-8');
const listingShellFile = fs.readFileSync(path.resolve('src/components/business/ListingBusinessShell.tsx'), 'utf-8');
const appFile = fs.readFileSync(path.resolve('src/App.tsx'), 'utf-8');

test('M0 Layer 1: Canonical Entity Types & Schemas are authoritative', () => {
  assert.ok(typesFile.includes('export interface Business {'), 'Business canonical interface must exist');
  assert.ok(typesFile.includes('export interface BusinessListing {'), 'BusinessListing canonical interface must exist');
  assert.ok(typesFile.includes('export interface BusinessLocation {'), 'BusinessLocation canonical interface must exist');
  assert.ok(typesFile.includes('export interface Tenant {'), 'Tenant canonical interface must exist');
  assert.ok(typesFile.includes('export interface TenantCustomerRelation {'), 'TenantCustomerRelation canonical interface must exist');
  assert.ok(typesFile.includes('export interface ListingBusinessProfile {'), 'ListingBusinessProfile canonical interface must exist');
  assert.ok(typesFile.includes('export type TenantCapability ='), 'TenantCapability type must exist');
});

test('M0 Layer 1 Invariant: Listing-only business operates with zero tenant records', () => {
  // A listing-only business has locations with no operational tenants
  assert.ok(typesFile.includes('hasOperationalTenant?: boolean;'), 'BusinessLocation must support optional tenant flag');
  assert.ok(typesFile.includes('tenantId?: string | null;'), 'BusinessLocation must allow null tenantId');
  assert.ok(listingShellFile.includes('hasOperationalTenant: false'), 'Listing business mock must demonstrate hasOperationalTenant = false');
  assert.ok(listingShellFile.includes('tenantId: null'), 'Listing business mock must demonstrate tenantId = null');
});

test('M0 Layer 1 Invariant: Option A Multi-Location links branches to isolated tenant operational units', () => {
  assert.ok(typesFile.includes('businessId: string;'), 'Tenant must reference parent businessId');
  assert.ok(typesFile.includes('locationId?: string;'), 'Tenant must support binding to specific locationId');
  assert.ok(typesFile.includes('tenantIds?: string[];'), 'Business must support an array of tenant branch IDs');
});

test('M0 Layer 1 Invariant: Option A Shopper Identity scopes customer CRM data to tenant', () => {
  assert.ok(typesFile.includes('id: string; // matches global User auth.uid'), 'TenantCustomerRelation ID must match global User auth.uid');
  assert.ok(typesFile.includes('tenantId: string;'), 'TenantCustomerRelation must be isolated by tenantId');
  assert.ok(typesFile.includes('loyaltyPoints: number;'), 'TenantCustomerRelation must isolate local loyalty points');
  assert.ok(typesFile.includes('storeCreditBalance?: number;'), 'TenantCustomerRelation must isolate local store credit');
});

test('M0 Layer 2: TenantContext exposes multi-branch state and capability gating helpers', () => {
  assert.ok(tenantContextFile.includes('tenantId: string;'), 'TenantContext must expose tenantId');
  assert.ok(tenantContextFile.includes('locationId: string | null;'), 'TenantContext must expose locationId');
  assert.ok(tenantContextFile.includes('capabilities: string[];'), 'TenantContext must expose capabilities array');
  assert.ok(tenantContextFile.includes('switchBranch:'), 'TenantContext must expose switchBranch helper');
  assert.ok(tenantContextFile.includes('hasCapability:'), 'TenantContext must expose hasCapability helper');
  assert.ok(tenantContextFile.includes('export const useTenantCapabilities ='), 'TenantContext must export useTenantCapabilities hook');

  // Verify default capabilities include core operational features
  assert.ok(DEFAULT_TENANT_CAPABILITIES.includes('pos'), 'DEFAULT_TENANT_CAPABILITIES must include pos');
  assert.ok(DEFAULT_TENANT_CAPABILITIES.includes('inventory'), 'DEFAULT_TENANT_CAPABILITIES must include inventory');
  assert.ok(DEFAULT_TENANT_CAPABILITIES.includes('storefront'), 'DEFAULT_TENANT_CAPABILITIES must include storefront');
});

test('M0 Layer 3: Design System Primitives export correctly and enforce token constraints', () => {
  assert.ok(sharedIndexFile.includes("export * from './Button';"), 'shared/index must export Button');
  assert.ok(sharedIndexFile.includes("export * from './Badge';"), 'shared/index must export Badge');
  assert.ok(sharedIndexFile.includes("export * from './Card';"), 'shared/index must export Card');
  assert.ok(sharedIndexFile.includes("export * from './StateFeedback';"), 'shared/index must export StateFeedback');

  // Button touch target >= 44px
  assert.ok(buttonFile.includes('min-h-[44px]'), 'Button must enforce >= 44px touch target on default size');
  assert.ok(buttonFile.includes('isLoading'), 'Button must support isLoading spinner state');

  // Badge variants
  assert.ok(badgeFile.includes('verified'), 'Badge must support verified variant');
  assert.ok(badgeFile.includes('tenant'), 'Badge must support tenant variant');

  // Card elevation
  assert.ok(cardFile.includes('level0'), 'Card must support level0 elevation');
  assert.ok(cardFile.includes('level1'), 'Card must support level1 elevation');
  assert.ok(cardFile.includes('level2'), 'Card must support level2 elevation');

  // StateFeedback
  assert.ok(stateFeedbackFile.includes('export const EmptyState:'), 'StateFeedback must export EmptyState');
  assert.ok(stateFeedbackFile.includes('export const LoadingState:'), 'StateFeedback must export LoadingState');
  assert.ok(stateFeedbackFile.includes('export const ErrorState:'), 'StateFeedback must export ErrorState');
  assert.ok(stateFeedbackFile.includes('export const PermissionDeniedState:'), 'StateFeedback must export PermissionDeniedState');
});

test('M0 Layer 4: ListingBusinessShell provides dedicated management for listing-only businesses', () => {
  assert.ok(listingShellFile.includes('ListingBusinessShell'), 'ListingBusinessShell component must exist');
  assert.ok(listingShellFile.includes('Listing Business Tier Active'), 'Must inform owner of listing tier');
  assert.ok(listingShellFile.includes('Zero POS / Inventory Clutter'), 'Must keep listing UI separate from POS operations');
  assert.ok(listingShellFile.includes('Activate Store / POS'), 'Must offer upgrade CTA to tenant storefront');
  assert.ok(listingShellFile.includes('Branch Locations'), 'Must manage branch locations');
  assert.ok(listingShellFile.includes('Services Menu'), 'Must manage service menu offerings');
});

test('M0 Layer 5: Route dispatcher routes /business/:businessId/* to the authoritative Business Owner management shell', () => {
  // Test route parsing
  const dashboardRoute = parseCanonicalRoute('/business/biz-kallon-repair/dashboard');
  assert.equal(dashboardRoute.definition.domain, 'BUSINESS', 'Dashboard route must resolve to BUSINESS domain');
  assert.equal(dashboardRoute.params.businessId, 'biz-kallon-repair', 'Must extract businessId parameter');

  const overviewRoute = parseCanonicalRoute('/business/biz-kallon-repair/overview');
  assert.equal(overviewRoute.definition.domain, 'BUSINESS', 'Overview route must resolve to BUSINESS domain');

  const locationsRoute = parseCanonicalRoute('/business/biz-kallon-repair/locations');
  assert.equal(locationsRoute.definition.domain, 'BUSINESS', 'Locations route must resolve to BUSINESS domain');

  const servicesRoute = parseCanonicalRoute('/business/biz-kallon-repair/services');
  assert.equal(servicesRoute.definition.domain, 'BUSINESS', 'Services route must resolve to BUSINESS domain');

  // Public listing slug (2 segments) remains in PUBLIC_DISCOVERY for customer browsing
  const publicListingRoute = parseCanonicalRoute('/business/kallon-smart-fix');
  assert.equal(publicListingRoute.definition.domain, 'PUBLIC_DISCOVERY', 'Public business profile must be in PUBLIC_DISCOVERY');

  // App.tsx dispatcher mounts the authoritative owner management shell.
  assert.ok(appFile.includes("activeDomain === 'BUSINESS'"), 'App.tsx must check activeDomain === BUSINESS');
  assert.ok(appFile.includes('<BusinessOwnerListingManagement'), 'App.tsx must render BusinessOwnerListingManagement');
  assert.ok(appFile.includes("currentRoute.definition.id === 'business.locations'"), 'App.tsx must map the locations route to owner management');
});
