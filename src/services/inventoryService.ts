import { Order, Product, StockMovementRecord } from '../types';
import { saveProductToDB } from './dbService';

export interface DeductOrderStockParams {
  order: Order;
  productsCatalog?: Product[];
  channel?: 'Online Storefront' | 'In-Store POS' | string;
  performedBy?: string;
  onStockUpdated?: (updatedProducts: Product[]) => void;
}

export interface InventoryDeductionResult {
  success: boolean;
  stockMovementRecords: StockMovementRecord[];
  updatedProducts: Product[];
  lowStockWarnings: {
    productId: string;
    productName: string;
    sku?: string;
    remainingStock: number;
  }[];
  error?: string;
}

/**
 * Inventory Service
 * Manages omnichannel stock adjustments, variant allocation, batch depletion and movement tracking
 */
export class InventoryService {
  /**
   * Deducts stock for all items in an authorized/paid order
   */
  static async deductOrderStock(params: DeductOrderStockParams): Promise<InventoryDeductionResult> {
    const {
      order,
      productsCatalog = [],
      channel = 'Online Storefront',
      performedBy = 'Automated Inventory Daemon',
      onStockUpdated
    } = params;

    const stockMovementRecords: StockMovementRecord[] = [];
    const updatedProducts: Product[] = [];
    const lowStockWarnings: { productId: string; productName: string; sku?: string; remainingStock: number }[] = [];

    try {
      for (const item of order.items || []) {
        const product = productsCatalog.find(p => p.id === item.productId);
        if (!product) continue;

        let productModified = false;
        const currentProduct = { ...product };

        // 1. Variant-level deduction
        if (item.variantSku && Array.isArray(currentProduct.variants)) {
          const updatedVariants = currentProduct.variants.map(v => {
            if (v.sku === item.variantSku) {
              const previousStock = v.stock ?? 0;
              const newStock = Math.max(0, previousStock - item.quantity);
              
              // Low stock trigger on variant
              if (newStock <= (v.lowStockThreshold ?? 5)) {
                lowStockWarnings.push({
                  productId: product.id,
                  productName: `${product.name} (${v.title || v.name || v.sku})`,
                  sku: v.sku,
                  remainingStock: newStock
                });
              }

              // Record variant movement
              stockMovementRecords.push({
                id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                date: new Date().toISOString(),
                productId: product.id,
                productName: product.name,
                sku: v.sku,
                type: channel === 'In-Store POS' ? 'POS Sale' : 'Online Sale',
                quantityChange: -item.quantity,
                quantityBefore: previousStock,
                quantityAfter: newStock,
                unitCost: v.cost ?? product.cost ?? 0,
                totalCostImpact: (v.cost ?? product.cost ?? 0) * item.quantity,
                location: 'Main Warehouse / Storefront',
                referenceDoc: order.orderNumber || order.id,
                performedBy,
                notes: `Automatic inventory deduction for ${channel} Order #${order.orderNumber || order.id}`
              });

              productModified = true;
              return { ...v, stock: newStock };
            }
            return v;
          });

          if (productModified) {
            currentProduct.variants = updatedVariants;
            // Recalculate total product stock from variants
            currentProduct.stock = updatedVariants.reduce((sum, v) => sum + (v.stock ?? 0), 0);
          }
        } else {
          // 2. Base Product Stock deduction
          const previousStock = currentProduct.stock ?? 0;
          const newStock = Math.max(0, previousStock - item.quantity);
          currentProduct.stock = newStock;
          productModified = true;

          // Low stock trigger on base product
          if (newStock <= (currentProduct.lowStockThreshold ?? 10)) {
            lowStockWarnings.push({
              productId: product.id,
              productName: product.name,
              sku: product.sku,
              remainingStock: newStock
            });
          }

          stockMovementRecords.push({
            id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            date: new Date().toISOString(),
            productId: product.id,
            productName: product.name,
            sku: product.sku || product.id,
            type: channel === 'In-Store POS' ? 'POS Sale' : 'Online Sale',
            quantityChange: -item.quantity,
            quantityBefore: previousStock,
            quantityAfter: newStock,
            unitCost: product.cost ?? 0,
            totalCostImpact: (product.cost ?? 0) * item.quantity,
            location: 'Main Warehouse / Storefront',
            referenceDoc: order.orderNumber || order.id,
            performedBy,
            notes: `Automatic stock deduction for ${channel} Order #${order.orderNumber || order.id}`
          });
        }

        if (productModified) {
          updatedProducts.push(currentProduct);
          // Persist product stock update to Firestore / DB
          saveProductToDB(currentProduct).catch(err => {
            console.warn(`[InventoryService] Background DB sync failed for product ${currentProduct.id}:`, err);
          });
        }
      }

      if (onStockUpdated && updatedProducts.length > 0) {
        onStockUpdated(updatedProducts);
      }

      return {
        success: true,
        stockMovementRecords,
        updatedProducts,
        lowStockWarnings
      };
    } catch (err: any) {
      console.error('[InventoryService] Error deducting stock for order:', err);
      return {
        success: false,
        stockMovementRecords: [],
        updatedProducts: [],
        lowStockWarnings: [],
        error: err.message || 'Inventory deduction failed'
      };
    }
  }
}
