import React from 'react';
import BusinessOnboardingShell from '../components/business/BusinessOnboardingShell';
import { getAuth } from 'firebase/auth';

/**
 * ShellOnboardingAdapter Interface (Authoritative Adapter Contract)
 *
 * Designed narrowly to bridge the existing onboarding implementation
 * into the canonical shell architecture without implementing or owning
 * onboarding business logic.
 *
 * Public contract contains only what callers may supply:
 *   businessId, mode, children, onComplete, onCancel
 *
 * Navigation and DOM identity are internal adapter concerns.
 */
export interface ShellOnboardingAdapter {
  businessId?: string;
  mode?: 'listing' | 'listing-and-store';
  children?: React.ReactNode;
  onComplete?: () => void;
  onCancel?: () => void;
}

// Props used internally by the component (extends the public contract)
interface ShellOnboardingAdapterProps extends ShellOnboardingAdapter {
  /** Internal: navigation callback injected by ShellResolver. Not part of the public adapter contract. */
  _navigate?: (path: string) => void;
}

const ONBOARDING_ROOT_ID = 'business-onboarding-shell-root';

/**
 * ShellOnboardingAdapter Component
 *
 * 1. Delegates to existing onboarding UI (BusinessOnboardingShell).
 * 2. Preserves existing onboarding state, callbacks, and navigation.
 * 3. Translates canonical routing into onboarding context.
 *
 * Architecture invariants:
 *  - LISTING_AND_STORE navigates to /tenant/:tenantId/dashboard ONLY when
 *    businessData.tenantId is authoritative. businessData.id is a business
 *    identity and must NOT be substituted as a tenant ID.
 *  - LISTING_ONLY navigates to /business/:businessSlug (slug/id fallback).
 *  - Cancellation navigates to / and invokes onCancel.
 */
export const ShellOnboardingAdapter: React.FC<ShellOnboardingAdapterProps> = ({
  businessId,
  mode: _mode,
  children,
  onComplete,
  onCancel,
  _navigate,
}) => {
  const navigate = _navigate ?? ((path: string) => {
    if (typeof window !== 'undefined') window.location.href = path;
  });

  const handleComplete = async (businessData: any, choice: 'LISTING_ONLY' | 'LISTING_AND_STORE') => {
    // Preserve the canonical adapter contract for direct completion calls:
    // an already-provisioned tenant ID is authoritative and may be routed
    // immediately; a business ID must never be treated as a tenant ID.
    if (choice === 'LISTING_AND_STORE' && businessData?.tenantId) {
      onComplete?.();
      navigate(`/tenant/${businessData.tenantId}/dashboard`);
      return;
    }

    try {
      let user = null;
      try {
        user = getAuth().currentUser;
      } catch {
        user = null;
      }
      if (!user) {
        const slug = businessData?.businessSlug || businessData?.slug || businessData?.id || businessId;
        onComplete?.();
        navigate(slug ? `/business/${slug}` : '/');
        return;
      }

      const token = await user.getIdToken();
      const idempotencyKey = `business-registration-${user.uid}-${businessData.businessSlug || businessData.name}`;
      const registrationResponse = await fetch('/api/business/register', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          businessName: businessData.name,
          category: businessData.category,
          tagline: businessData.tagline,
          about: businessData.about,
          address: businessData.address,
          city: businessData.city,
          phone: businessData.phone,
          email: businessData.email,
          openingHours: businessData.openingHours,
        }),
      });

      const registration = await registrationResponse.json();
      if (!registrationResponse.ok || !registration?.business?.id) {
        throw new Error(registration?.error || 'Business registration failed.');
      }

      let destination = `/business/${registration.business.listing.slug}`;
      let completed = {
        ...businessData,
        id: registration.business.id,
        businessSlug: registration.business.listing.slug,
        tenantId: undefined,
        isTenant: false,
      };

      if (choice === 'LISTING_AND_STORE') {
        const tenantKey = `tenant-provisioning-${registration.business.id}-${businessData.address}`;
        const tenantResponse = await fetch('/api/business/provision-tenant', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': tenantKey,
          },
          body: JSON.stringify({
            businessId: registration.business.id,
            locationId: registration.business.locations?.[0]?.id,
            planId: 'starter',
            billingInterval: 'monthly',
            trialDays: 14,
          }),
        });
        const provisioning = await tenantResponse.json();
        if (!tenantResponse.ok || !provisioning?.tenant?.id) {
          throw new Error(provisioning?.error || 'Tenant provisioning failed.');
        }
        completed = {
          ...completed,
          tenantId: provisioning.tenant.id,
          isTenant: true,
        };
        destination = `/tenant/${provisioning.tenant.id}/dashboard`;
      }

      if (onComplete) onComplete();
      navigate(destination);
    } catch (error: any) {
      console.error('Business onboarding error:', error);
      const fallbackSlug = businessData?.businessSlug || businessData?.slug || businessData?.id || businessId;
      if (onComplete) onComplete();
      navigate(fallbackSlug ? `/business/${fallbackSlug}` : '/');
    }
  };

  const handleNavigate = (path: string) => {
    if (path === '/' && onCancel) {
      onCancel();
    }
    navigate(path);
  };

  // Robust custom children detection: excludes falsy values (false, null, undefined, boolean)
  // that may be produced by conditional JSX rendering in App.tsx
  const hasCustomChildren = React.Children.toArray(children).length > 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950" id={ONBOARDING_ROOT_ID}>
      {hasCustomChildren ? (
        children
      ) : (
        <BusinessOnboardingShell
          onNavigate={handleNavigate}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
};

export default ShellOnboardingAdapter;
