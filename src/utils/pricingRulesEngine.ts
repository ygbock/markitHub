import { CartItem } from '../types';

export type PricingRuleType = 'BOGO' | 'THRESHOLD_DISCOUNT';

export interface PricingRule {
  id: string;
  type: PricingRuleType;
  title: string;
  description: string;
  isActive: boolean;
  
  // For BOGO
  buyQty?: number;
  getQty?: number;
  discountMultiplier?: number; // e.g., 0 for free, 0.5 for 50% off
  targetProductId?: string; // If empty, applies to any same item
  
  // For THRESHOLD
  thresholdAmount?: number;
  discountPercentage?: number;
  fixedDiscount?: number;
}

export interface RuleEvaluationResult {
  discountAmount: number;
  appliedRules: { ruleId: string; title: string; discount: number }[];
}

export function evaluateRules(items: CartItem[], subtotal: number, rules: PricingRule[]): RuleEvaluationResult {
  let totalDiscount = 0;
  const appliedRules: { ruleId: string; title: string; discount: number }[] = [];

  const activeRules = rules.filter(r => r.isActive);

  // Group items for BOGO evaluation
  const itemMap = new Map<string, CartItem>();
  items.forEach(item => {
    const key = item.selectedVariantSku || item.product.id;
    if (itemMap.has(key)) {
      const existing = itemMap.get(key)!;
      existing.quantity += item.quantity;
    } else {
      itemMap.set(key, { ...item });
    }
  });

  // Evaluate BOGO rules first (item level)
  activeRules.filter(r => r.type === 'BOGO').forEach(rule => {
    if (rule.buyQty && rule.getQty !== undefined && rule.discountMultiplier !== undefined) {
      itemMap.forEach((item, key) => {
        if (!rule.targetProductId || rule.targetProductId === item.product.id) {
          const comboQty = rule.buyQty! + rule.getQty!;
          const combos = Math.floor(item.quantity / comboQty);
          if (combos > 0) {
            const discountedItems = combos * rule.getQty!;
            const itemPrice = item.unitPrice || item.product.price;
            const discountForCombo = discountedItems * itemPrice * (1 - rule.discountMultiplier!);
            
            totalDiscount += discountForCombo;
            appliedRules.push({
              ruleId: rule.id,
              title: rule.title,
              discount: discountForCombo
            });
          }
        }
      });
    }
  });

  // Evaluate Threshold rules (cart level)
  // Calculate new subtotal after item-level discounts
  const adjustedSubtotal = subtotal - totalDiscount;
  
  activeRules.filter(r => r.type === 'THRESHOLD_DISCOUNT').forEach(rule => {
    if (rule.thresholdAmount && adjustedSubtotal >= rule.thresholdAmount) {
      let thresholdDiscount = 0;
      if (rule.discountPercentage) {
        thresholdDiscount = adjustedSubtotal * (rule.discountPercentage / 100);
      } else if (rule.fixedDiscount) {
        thresholdDiscount = rule.fixedDiscount;
      }
      
      if (thresholdDiscount > 0) {
        totalDiscount += thresholdDiscount;
        appliedRules.push({
          ruleId: rule.id,
          title: rule.title,
          discount: thresholdDiscount
        });
      }
    }
  });

  return {
    discountAmount: totalDiscount,
    appliedRules
  };
}
