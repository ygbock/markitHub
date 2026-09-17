import React from 'react';
import ListingBusinessShell from '../components/business/ListingBusinessShell';
import { ListingBusinessProfile } from '../types';

export interface BusinessShellProps {
  businessId?: string;
  initialProfile?: ListingBusinessProfile;
  onNavigate?: (path: string) => void;
  onUpgradeToTenant?: (locationId?: string) => void;
  children?: React.ReactNode;
}

/**
 * BusinessShell wraps and coordinates dedicated management for listing-only businesses.
 * Keeps business profile and discovery separate from POS / tenant inventory clutter.
 */
export const BusinessShell: React.FC<BusinessShellProps> = ({
  businessId,
  initialProfile,
  onNavigate = (path) => {
    if (typeof window !== 'undefined') window.location.href = path;
  },
  onUpgradeToTenant,
  children,
}) => {
  if (children) {
    return <div className="min-h-screen bg-slate-950 text-slate-100">{children}</div>;
  }

  return (
    <ListingBusinessShell
      businessId={businessId}
      initialProfile={initialProfile}
      onNavigate={onNavigate}
      onUpgradeToTenant={onUpgradeToTenant}
    />
  );
};

export default BusinessShell;
