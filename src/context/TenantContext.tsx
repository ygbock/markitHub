import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { StorefrontTenantConfig } from '../server/tenantManager';
import { TenantCapability } from '../types';

export interface TenantInfoOption {
  slug: string;
  name: string;
  currencySymbol: string;
  currencyCode: string;
  description: string;
}

export const AVAILABLE_TENANTS: TenantInfoOption[] = [
  {
    slug: 'nexus-retail',
    name: 'Nexus Enterprise Commerce',
    currencySymbol: 'Le',
    currencyCode: 'SLE',
    description: 'Flagship Multi-Category Superstore (Electronics, Fashion, Grocery)',
  },
  {
    slug: 'apex-gadgets',
    name: 'Apex Gadgets Worldwide',
    currencySymbol: '$',
    currencyCode: 'USD',
    description: 'Specialized Electronics & Smart Audio (USD Pricing, Global Express)',
  },
  {
    slug: 'sierra-boutique',
    name: 'Sierra Fashion & Boutique',
    currencySymbol: 'Le',
    currencyCode: 'SLE',
    description: 'African Designer Fashion, Luxury Footwear & Beauty',
  },
];

export const DEFAULT_TENANT_CAPABILITIES: TenantCapability[] = [
  'pos',
  'inventory',
  'storefront',
  'orders',
  'customers',
  'reporting',
  'reviews',
  'loyalty',
];

export interface TenantContextType {
  tenantConfig: StorefrontTenantConfig | null;
  tenantSlug: string;
  tenantId: string;
  locationId: string | null;
  capabilities: string[];
  isLoading: boolean;
  error: string | null;
  availableTenants: TenantInfoOption[];
  setTenantSlug: (slug: string) => void;
  setLocationId: (locationId: string | null) => void;
  switchBranch: (tenantIdOrSlug: string, locationId?: string) => void;
  hasCapability: (capability: string) => boolean;
  formatCurrency: (amount: number) => string;
  convertPrice: (amountInBaseUSD: number) => number;
  refetchTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const TENANT_STORAGE_KEY = 'nexus_storefront_tenant_slug';

export const TenantProvider: React.FC<{ 
  children: React.ReactNode; 
  initialSlug?: string;
  initialLocationId?: string;
}> = ({
  children,
  initialSlug,
  initialLocationId,
}) => {
  const [tenantSlug, setTenantSlugState] = useState<string>(() => {
    // 1. Check prop / URL parameter
    if (initialSlug) return initialSlug;

    // 2. Check window location query string or path
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const queryTenant = searchParams.get('tenant');
      if (queryTenant) return queryTenant;

      const pathParts = window.location.pathname.split('/').filter(Boolean);
      if (pathParts[0] === 'store' && pathParts[1]) {
        const pathTenant = pathParts[1];
        if (AVAILABLE_TENANTS.some((t) => t.slug === pathTenant)) {
          return pathTenant;
        }
      }

      // 3. Check localStorage
      const stored = localStorage.getItem(TENANT_STORAGE_KEY);
      if (stored && AVAILABLE_TENANTS.some((t) => t.slug === stored)) {
        return stored;
      }
    }

    return 'nexus-retail';
  });

  const [locationId, setLocationId] = useState<string | null>(initialLocationId || null);
  const [tenantConfig, setTenantConfig] = useState<StorefrontTenantConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenantConfig = useCallback(async (slug: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/storefront/${slug}/context`, {
        headers: {
          'X-Tenant-Slug': slug,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load tenant context for '${slug}'. Status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.tenant) {
        setTenantConfig(data);
        if (!locationId && data.store?.id) {
          setLocationId(data.store.id);
        }
        // Apply CSS custom variables for dynamic tenant branding
        if (typeof document !== 'undefined') {
          const root = document.documentElement;
          root.style.setProperty('--tenant-primary', data.branding?.primaryColor || '#4f46e5');
          root.style.setProperty('--tenant-accent', data.branding?.accentColor || '#f59e0b');
        }
      } else {
        throw new Error(data.message || 'Invalid tenant configuration payload');
      }
    } catch (err: any) {
      console.warn(`[TenantProvider] Error fetching tenant context (${slug}):`, err?.message);
      setError(err?.message || 'Tenant configuration error');
    } finally {
      setIsLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    fetchTenantConfig(tenantSlug);
  }, [tenantSlug, fetchTenantConfig]);

  const setTenantSlug = useCallback((newSlug: string) => {
    if (!newSlug || newSlug === tenantSlug) return;
    setTenantSlugState(newSlug);
    if (typeof window !== 'undefined') {
      localStorage.setItem(TENANT_STORAGE_KEY, newSlug);
    }
  }, [tenantSlug]);

  const switchBranch = useCallback((tenantIdOrSlug: string, targetLocationId?: string) => {
    if (!tenantIdOrSlug) return;
    const cleanSlug = tenantIdOrSlug.startsWith('tenant-') ? tenantIdOrSlug.replace('tenant-', '') : tenantIdOrSlug;
    setTenantSlug(cleanSlug);
    if (targetLocationId) {
      setLocationId(targetLocationId);
    }
  }, [setTenantSlug]);

  const tenantId = useMemo(() => {
    return tenantConfig?.tenant?.id || (tenantSlug.startsWith('tenant-') ? tenantSlug : `tenant-${tenantSlug}`);
  }, [tenantConfig, tenantSlug]);

  const capabilities = useMemo(() => {
    return (tenantConfig as any)?.capabilities || DEFAULT_TENANT_CAPABILITIES;
  }, [tenantConfig]);

  const hasCapability = useCallback((capability: string): boolean => {
    if (!capability) return false;
    return capabilities.some((cap: string) => cap.toLowerCase() === capability.toLowerCase());
  }, [capabilities]);

  const formatCurrency = useCallback(
    (amount: number): string => {
      if (!tenantConfig) return `Le ${amount.toFixed(2)}`;
      const { symbol, decimalPlaces, format } = tenantConfig.currency;
      const formattedNumber = amount.toLocaleString(undefined, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      });

      return format === 'symbol_last' ? `${formattedNumber} ${symbol}` : `${symbol} ${formattedNumber}`;
    },
    [tenantConfig]
  );

  const convertPrice = useCallback(
    (amountInBaseUSD: number): number => {
      if (!tenantConfig) return amountInBaseUSD;
      const rate = tenantConfig.currency.exchangeRateToUSD || 1.0;
      // If tenant uses USD, exchangeRateToUSD is 1.0. If SLE, rate is 0.045 so 1 USD = ~22.22 SLE
      if (tenantConfig.currency.code === 'USD') return amountInBaseUSD;
      return Number((amountInBaseUSD / rate).toFixed(2));
    },
    [tenantConfig]
  );

  const refetchTenant = useCallback(async () => {
    await fetchTenantConfig(tenantSlug);
  }, [fetchTenantConfig, tenantSlug]);

  return (
    <TenantContext.Provider
      value={{
        tenantConfig,
        tenantSlug,
        tenantId,
        locationId,
        capabilities,
        isLoading,
        error,
        availableTenants: AVAILABLE_TENANTS,
        setTenantSlug,
        setLocationId,
        switchBranch,
        hasCapability,
        formatCurrency,
        convertPrice,
        refetchTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

export const useTenantCapabilities = () => {
  const { capabilities, hasCapability } = useTenant();
  return {
    capabilities,
    hasCapability,
  };
};

export const useTenantBranding = () => {
  const { tenantConfig } = useTenant();
  return tenantConfig?.branding || {
    logoUrl: '',
    primaryColor: '#4f46e5',
    accentColor: '#f59e0b',
    neutralColorScale: 'slate' as const,
    fontFamily: 'Inter',
    bannerSlides: [],
  };
};

export const useTenantCurrency = () => {
  const { tenantConfig, formatCurrency, convertPrice } = useTenant();
  return {
    currency: tenantConfig?.currency || { code: 'SLE', symbol: 'Le', decimalPlaces: 2, format: 'symbol_first' as const, exchangeRateToUSD: 0.045 },
    formatCurrency,
    convertPrice,
  };
};

export const useTenantPolicies = () => {
  const { tenantConfig } = useTenant();
  return tenantConfig?.policies || {
    shipping: { freeShippingThreshold: 500, standardFee: 25, standardEstimatedDays: '1-2 Days', expressFee: 65, expressEstimatedDays: 'Same Day', policyText: '' },
    returns: { allowedDays: 30, restockingFeePercent: 0, freeReturns: true, policyText: '' },
    warranty: { standardMonths: 24, claimInstructions: '', policyText: '' },
  };
};

export const useTenantFeatureFlags = () => {
  const { tenantConfig } = useTenant();
  return tenantConfig?.featureFlags || {
    enableCustomerReviews: true,
    enableWishlist: true,
    enableLoyaltyRewards: true,
    enableLiveInventoryReservations: true,
    enableMonimePayments: true,
    enableBankWireTransfer: true,
    enableCashOnDelivery: true,
    enableB2BPriceTiers: true,
  };
};
