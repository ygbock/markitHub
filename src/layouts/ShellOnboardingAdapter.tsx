import React from 'react';
import BusinessOnboardingShell from '../components/business/BusinessOnboardingShell';

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

  const handleComplete = (businessData: any, choice: 'LISTING_ONLY' | 'LISTING_AND_STORE') => {
    if (onComplete) {
      onComplete();
    }
    // Canonical route translation:
    // LISTING_AND_STORE: navigate to tenant dashboard ONLY when authoritative tenantId exists.
    // businessData.id is a business identity — it must NOT be used as a tenantId fallback.
    if (choice === 'LISTING_AND_STORE' && businessData?.tenantId) {
      navigate(`/tenant/${businessData.tenantId}/dashboard`);
    } else {
      // LISTING_ONLY (or LISTING_AND_STORE without tenantId): canonical business destination
      const slug = businessData?.businessSlug || businessData?.slug || businessData?.id || businessId;
      navigate(slug ? `/business/${slug}` : '/');
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
