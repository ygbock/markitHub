import React from 'react';
import { CanonicalRouteDomain, parseCanonicalRoute } from '../routes/canonicalRoutes';
import { PublicShell } from './PublicShell';
import { CustomerShell } from './CustomerShell';
import { BusinessShell } from './BusinessShell';
import { TenantShell } from './TenantShell';
import { SuperAdminShell } from './SuperAdminShell';
import { StaffMember } from '../utils/permissions';
import { ListingBusinessProfile } from '../types';

export interface ShellResolverProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  staff?: StaffMember | null;
  listingProfile?: ListingBusinessProfile;
  onUpgradeToTenant?: (locationId?: string) => void;
  onLogout?: () => void;
  isOnline?: boolean;
  children: React.ReactNode;
}

/**
 * ShellResolver inspects the current URL route and wraps the active view
 * in the authoritative application shell for its domain.
 */
export const ShellResolver: React.FC<ShellResolverProps> = ({
  currentPath,
  onNavigate,
  staff,
  listingProfile,
  onUpgradeToTenant,
  onLogout,
  isOnline,
  children,
}) => {
  const route = parseCanonicalRoute(currentPath);
  const domain: CanonicalRouteDomain = route.definition.domain;

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

    case 'CUSTOMER_ACCOUNT':
      return (
        <CustomerShell
          activePath={currentPath}
          onNavigate={onNavigate}
          userName={staff?.name || 'Customer Account'}
          onLogout={onLogout}
        >
          {children}
        </CustomerShell>
      );

    case 'PUBLIC_DISCOVERY':
    case 'STOREFRONT':
    case 'IDENTITY_AUTH':
      return (
        <PublicShell
          activePath={currentPath}
          onNavigate={onNavigate}
        >
          {children}
        </PublicShell>
      );

    case 'TENANT_OPERATIONS':
    default:
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
  }
};

export default ShellResolver;
