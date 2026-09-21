export type BusinessOnboardingCheckId =
  | 'identity'
  | 'location'
  | 'listing_content'
  | 'contact'
  | 'verification';

export interface BusinessOnboardingCheck {
  id: BusinessOnboardingCheckId;
  label: string;
  complete: boolean;
  required: boolean;
  detail: string;
}

export interface BusinessOnboardingReadiness {
  businessId: string;
  readyForReview: boolean;
  readyForPublication: boolean;
  status: string;
  verificationStatus: string;
  onboardingStatus: string;
  businessMode: 'listing_only' | 'listing_and_store';
  checks: BusinessOnboardingCheck[];
  completedCount: number;
  requiredCount: number;
  nextAction: 'complete_setup' | 'submit_review' | 'await_review' | 'published';
}

function nonEmpty(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function evaluateBusinessOnboardingReadiness(business: any): BusinessOnboardingReadiness {
  const listing = business?.listing || {};
  const locations = Array.isArray(business?.locations)
    ? business.locations.filter((location: any) => location && location.isActive !== false)
    : [];

  const checks: BusinessOnboardingCheck[] = [
    {
      id: 'identity',
      label: 'Business identity',
      complete: nonEmpty(business?.legalName) && nonEmpty(business?.tradingName),
      required: true,
      detail: 'Legal and trading names are required.',
    },
    {
      id: 'location',
      label: 'Primary location',
      complete: locations.length > 0 && nonEmpty(locations[0]?.addressLine1) && nonEmpty(locations[0]?.city),
      required: true,
      detail: 'At least one active location with an address and city is required.',
    },
    {
      id: 'listing_content',
      label: 'Discovery listing content',
      complete: nonEmpty(listing?.headline) && nonEmpty(listing?.description) &&
        Array.isArray(listing?.categories) && listing.categories.length > 0,
      required: true,
      detail: 'A headline, description, and category are required before review.',
    },
    {
      id: 'contact',
      label: 'Customer contact',
      complete: nonEmpty(business?.email) || nonEmpty(business?.phone) || locations.some((location: any) => nonEmpty(location?.phone)),
      required: true,
      detail: 'Provide at least one customer contact channel.',
    },
    {
      id: 'verification',
      label: 'Platform verification',
      complete: business?.verificationStatus === 'verified',
      required: false,
      detail: business?.verificationStatus === 'verified'
        ? 'Business identity has been verified.'
        : 'Verification is completed by the platform review process.',
    },
  ];

  const requiredChecks = checks.filter(check => check.required);
  const completedCount = checks.filter(check => check.complete).length;
  const requiredCount = requiredChecks.filter(check => check.complete).length;
  const readyForReview = requiredCount === requiredChecks.length;
  const readyForPublication = readyForReview &&
    business?.status === 'active' &&
    business?.verificationStatus === 'verified' &&
    listing?.isPublished === true;

  let nextAction: BusinessOnboardingReadiness['nextAction'];
  if (readyForPublication) nextAction = 'published';
  else if (business?.onboardingStatus === 'submitted_for_review' || business?.verificationStatus === 'pending') nextAction = readyForReview ? 'await_review' : 'complete_setup';
  else if (readyForReview) nextAction = 'submit_review';
  else nextAction = 'complete_setup';

  return {
    businessId: String(business?.id || ''),
    readyForReview,
    readyForPublication,
    status: String(business?.status || 'draft'),
    verificationStatus: String(business?.verificationStatus || 'pending'),
    onboardingStatus: String(business?.onboardingStatus || 'in_progress'),
    businessMode: business?.businessMode === 'listing_and_store' ? 'listing_and_store' : 'listing_only',
    checks,
    completedCount,
    requiredCount,
    nextAction,
  };
}
