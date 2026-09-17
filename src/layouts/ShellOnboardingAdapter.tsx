import React from 'react';
import BusinessOnboardingShell from '../components/business/BusinessOnboardingShell';

/**
 * ShellOnboardingAdapter Interface (Allowed Adapter Contract)
 *
 * Designed narrowly to bridge the existing onboarding implementation
 * into the canonical shell architecture without implementing or owning
 * onboarding business logic.
 */
export interface ShellOnboardingAdapter {
  businessId?: string;
  mode?: 'listing' | 'listing-and-store';

  children: React.ReactNode;

  onComplete?: () => void;
  onCancel?: () => void;
}

export interface ShellOnboardingAdapterProps {
  businessId?: string;
  mode?: 'listing' | 'listing-and-store';

  children?: React.ReactNode;

  onComplete?: () => void;
  onCancel?: () => void;

  onNavigate?: (path: string) => void;
  id?: string;
}

/**
 * ShellOnboardingAdapter Component
 *
 * 1. Wraps existing onboarding UI (reusing BusinessOnboardingShell).
 * 2. Preserves existing onboarding state, callbacks, and navigation.
 * 3. Translates canonical routing into onboarding context.
 */
export const ShellOnboardingAdapter: React.FC<ShellOnboardingAdapterProps> = ({
  businessId,
  mode,
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
    if (choice === 'LISTING_AND_STORE' && businessData?.tenantId) {
      onNavigate(`/tenant/${businessData.tenantId}/dashboard`);
    } else {
      const slug = businessData?.businessSlug || businessData?.slug || businessData?.id || businessId;
      onNavigate(slug ? `/business/${slug}` : '/');
    }
  };

  const handleNavigate = (path: string) => {
    if (path === '/' && onCancel) {
      onCancel();
    } else {
      onNavigate(path);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950" id={id}>
      {children || (
        <BusinessOnboardingShell
          onNavigate={handleNavigate}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
};

export default ShellOnboardingAdapter;
