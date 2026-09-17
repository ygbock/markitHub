import React from 'react';
import BusinessOnboardingShell from '../components/business/BusinessOnboardingShell';

/**
 * ShellOnboardingAdapter Interface (Authoritative Adapter Contract)
 *
 * Designed narrowly to bridge the existing onboarding implementation
 * into the canonical shell architecture without implementing or owning
 * onboarding business logic.
 */
export interface ShellOnboardingAdapter {
  businessId?: string;
  mode?: 'listing' | 'listing-and-store';
  children?: React.ReactNode;
  onComplete?: () => void;
  onCancel?: () => void;
  onNavigate?: (path: string) => void;
  id?: string;
}

export type ShellOnboardingAdapterProps = ShellOnboardingAdapter;

/**
 * ShellOnboardingAdapter Component
 *
 * 1. Wraps existing onboarding UI (delegating to BusinessOnboardingShell).
 * 2. Preserves existing onboarding state, callbacks, and navigation.
 * 3. Translates canonical routing into onboarding context.
 */
export const ShellOnboardingAdapter: React.FC<ShellOnboardingAdapterProps> = ({
  businessId,
  mode: _mode,
  children,
  onComplete,
  onCancel,
  onNavigate = (path: string) => {
    if (typeof window !== 'undefined') window.location.href = path;
  },
  id = 'business-onboarding-shell-root',
}) => {
  const handleComplete = (businessData: any, choice: 'LISTING_ONLY' | 'LISTING_AND_STORE') => {
    if (onComplete) {
      onComplete();
    }
    // Canonical route translation:
    if (choice === 'LISTING_AND_STORE' && (businessData?.tenantId || businessData?.id)) {
      const tenantId = businessData?.tenantId || businessData?.id || businessId;
      onNavigate(`/tenant/${tenantId}/dashboard`);
    } else {
      const slug = businessData?.businessSlug || businessData?.slug || businessData?.id || businessId;
      onNavigate(slug ? `/business/${slug}` : '/');
    }
  };

  const handleNavigate = (path: string) => {
    if (path === '/' && onCancel) {
      onCancel();
    }
    onNavigate(path);
  };

  // Robust custom children detection: excludes falsy values (false, null, undefined, boolean)
  // that may be produced by conditional JSX rendering in App.tsx
  const hasCustomChildren = React.Children.toArray(children).length > 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950" id={id}>
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
