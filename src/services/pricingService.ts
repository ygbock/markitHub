import { DynamicPricingResponse, calculateDynamicPricing } from '../utils/pricingEngine';
import { Product } from '../types';

export interface FetchDynamicPricingParams {
  product?: Partial<Product> | null;
  variantSku?: string | null;
  quantity?: number;
  currency?: string;
  priceListTier?: string;
  overridePrice?: number;
  overrideOriginalPrice?: number;
}

/**
 * Calls the backend pricing engine endpoint (/api/pricing/calculate)
 * to evaluate and return the exact dynamic pricing data structure:
 * - original_price
 * - selling_price
 * - discount_amount
 * - discount_percentage
 * - currency
 *
 * Falls back seamlessly to the client-side pricing engine module if network is unavailable.
 */
export async function fetchDynamicPricingFromBackend(
  params: FetchDynamicPricingParams
): Promise<DynamicPricingResponse> {
  const {
    product,
    variantSku,
    quantity = 1,
    currency = 'Le',
    priceListTier = 'Retail',
    overridePrice,
    overrideOriginalPrice,
  } = params;

  try {
    const response = await fetch('/api/pricing/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product,
        variantSku,
        quantity,
        currency,
        priceListTier,
        price: overridePrice,
        originalPrice: overrideOriginalPrice,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.success) {
        return {
          original_price: Number(data.original_price),
          selling_price: Number(data.selling_price),
          discount_amount: Number(data.discount_amount),
          discount_percentage: Number(data.discount_percentage),
          currency: String(data.currency || currency || 'Le'),
        };
      }
    }
  } catch (err) {
    console.warn('[Pricing Engine] API call fallback to local engine:', err);
  }

  // Fallback to local pricing engine
  return calculateDynamicPricing({
    product: product as any,
    variantSku,
    quantity,
    currency,
    priceListTier,
    overridePrice,
    overrideOriginalPrice,
  });
}
