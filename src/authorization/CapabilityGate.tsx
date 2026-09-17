import React from 'react';
import { useTenant } from '../context/TenantContext';
import { TenantCapability } from '../routes/canonicalRoutes';

/**
 * ARCHITECTURAL INVARIANT: UI AUTHORIZATION != SERVER AUTHORIZATION
 *
 * Presentation-level UI gating only. Conditionally hides, shows, or disables UI.
 * Authoritative security enforcement resides on the server / Firebase Security Rules.
 */
export interface CapabilityGateProps {
  capability: TenantCapability | TenantCapability[] | string | string[];
  requireAll?: boolean;
  capabilitiesOverride?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const CapabilityGate: React.FC<CapabilityGateProps> = ({
  capability,
  requireAll = false,
  capabilitiesOverride,
  fallback = null,
  children,
}) => {
  let tenantCapabilities: string[] = [];
  try {
    const tenant = useTenant();
    tenantCapabilities = tenant?.capabilities || [];
  } catch {
    // If used outside TenantProvider, use override if supplied
    tenantCapabilities = capabilitiesOverride || [];
  }

  if (capabilitiesOverride) {
    tenantCapabilities = capabilitiesOverride;
  }

  const required = Array.isArray(capability) ? capability : [capability];
  const hasCap = (cap: string) =>
    tenantCapabilities.some((c) => c.toLowerCase() === cap.toLowerCase());

  const isAllowed =
    required.length === 0 ||
    (requireAll ? required.every(hasCap) : required.some(hasCap));

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default CapabilityGate;
