import React from 'react';
import { CanonicalRouteDomain, parseCanonicalRoute } from '../routes/canonicalRoutes';
import { PublicShell } from './PublicShell';
import { CustomerShell } from './CustomerShell';
import { BusinessShell } from './BusinessShell';
import { TenantShell } from './TenantShell';
import { SuperAdminShell } from './SuperAdminShell';
import BusinessOnboardingShell from '../components/business/BusinessOnboardingShell';
import { StaffMember } from '../utils/permissions';
import { Customer, ListingBusinessProfile } from '../types';

export interface ShellResolverProps {
  currentPath: string;
  activeDomain?: CanonicalRouteDomain;
  onNavigate: (path: string) => void;
  staff?: StaffMember | null;
  activeCustomer?: Customer | null;
  listingProfile?: ListingBusinessProfile;
  onUpgradeToTenant?: (locationId?: string) => void;
  onLogout?: () => void;
  isOnline?: boolean;
  children?: React.ReactNode;
}

/**
 * Resolves the canonical domain for a given pathname.
 */
export function resolveDomainForPath(path: string): CanonicalRouteDomain {
  return parseCanonicalRoute(path).definition.domain;
}

/**
 * Returns the name of the authoritative shell for a given canonical domain.
 */
export function getShellNameForDomain(domain: CanonicalRouteDomain): string {
  switch (domain) {
    case 'SUPER_ADMIN':
      return 'SuperAdminShell';
    case 'BUSINESS':
      return 'BusinessShell';
    case 'BUSINESS_ONBOARDING':
      return 'BusinessOnboardingShell';
    case 'CUSTOMER_ACCOUNT':
      return 'CustomerShell';
    case 'TENANT_OPERATIONS':
      return 'TenantShell';
    case 'PUBLIC_DISCOVERY':
    case 'STOREFRONT':
    case 'IDENTITY_AUTH':
    default:
      return 'PublicShell';
  }
}

/**
 * ShellResolver inspects the current URL route and wraps the active view
 * in the authoritative application shell for its canonical domain.
 *
 * Canonical Domain Hierarchy:
 * 1. SUPER_ADMIN          -> SuperAdminShell (Platform Control Plane)
 * 2. PUBLIC_DISCOVERY     -> PublicShell (Universal Discovery)
 * 3. STOREFRONT           -> PublicShell (Tenant Storefront wrapper)
 * 4. CUSTOMER_ACCOUNT     -> CustomerShell (Personal Account)
 * 5. IDENTITY_AUTH        -> PublicShell (Authentication gateway)
 * 6. BUSINESS_ONBOARDING  -> BusinessOnboardingShell (Listing/Storefront Registration)
 * 7. BUSINESS             -> BusinessShell (Listing-only Management)
 * 8. TENANT_OPERATIONS    -> TenantShell (Operational Terminal & Branch Hub)
 */
export const ShellResolver: React.FC<ShellResolverProps> = ({
  currentPath,
  activeDomain,
  onNavigate,
  staff,
  activeCustomer,
  listingProfile,
  onUpgradeToTenant,
  onLogout,
  isOnline,
  children,
}) => {
  const route = parseCanonicalRoute(currentPath);
  const domain: CanonicalRouteDomain = activeDomain || route.definition.domain;

  switch (domain) {
    case 'SUPER_ADMIN':
      return (
        <SuperAdminShell
          activePath={currentPath}
          onNavigate={onNavigate}
          adminName={staff?.name || 'Super Admin'}
          onLogout={onLogout}
        >
          {children}
        </SuperAdminShell>
      );

    case 'BUSINESS':
      return (
        <BusinessShell
          businessId={route.params.businessId}
          initialProfile={listingProfile}
          onNavigate={onNavigate}
          onUpgradeToTenant={onUpgradeToTenant}
        >
          {children}
        </BusinessShell>
      );

    case 'BUSINESS_ONBOARDING':
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950" id="business-onboarding-shell-root">
          {children || (
            <BusinessOnboardingShell
              onNavigate={onNavigate}
              onComplete={(newBiz, choice) => {
                if (choice === 'LISTING_AND_STORE' && newBiz.tenantId) {
                  onNavigate(`/tenant/${newBiz.tenantId}/dashboard`);
                } else {
                  onNavigate(`/business/${newBiz.businessSlug || newBiz.slug || newBiz.id}`);
                }
              }}
            />
          )}
        </div>
      );

    case 'CUSTOMER_ACCOUNT':
      return (
        <CustomerShell
          activePath={currentPath}
          onNavigate={onNavigate}
          userName={staff?.name || activeCustomer?.name || 'Customer Account'}
          userEmail={activeCustomer?.email || staff?.email || 'shopper@example.com'}
          onLogout={onLogout}
        >
          {children}
        </CustomerShell>
      );

    case 'STOREFRONT':
      return (
        <PublicShell
          activePath={currentPath}
          onNavigate={onNavigate}
          onOpenAuth={() => onNavigate('/login')}
        >
          {children}
        </PublicShell>
      );

    case 'IDENTITY_AUTH':
      return (
        <PublicShell
          activePath={currentPath}
          onNavigate={onNavigate}
        >
          {children}
        </PublicShell>
      );

    case 'PUBLIC_DISCOVERY':
      return (
        <PublicShell
          activePath={currentPath}
          onNavigate={onNavigate}
          onOpenAuth={() => onNavigate('/account')}
        >
          {children}
        </PublicShell>
      );

    case 'TENANT_OPERATIONS':
      return (
        <TenantShell
          activePath={currentPath}
          onNavigate={onNavigate}
          staff={staff}
          onLogout={onLogout}
          isOnline={isOnline}
        >
          {children}
        </TenantShell>
      );

    default:
      return (
        <PublicShell
          activePath={currentPath}
          onNavigate={onNavigate}
        >
          {children}
        </PublicShell>
      );
  }
};

export default ShellResolver;

