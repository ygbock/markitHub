import type { ExtractedProductInfo, Product } from "../types";
import { calculateRetailPrice, calculateWholesalePrice } from "../services/productScanner";

export type SaveMode = "create_new" | "merge_existing";

export interface ScannerSaveOptions {
  saveMode: SaveMode;
  selectedProduct?: Product | null;
  publishToStore: boolean;
  updatePricing: boolean;
  replacePhotos: boolean;
  replaceSpecifications: boolean;
  marginPercent: number;
}

export interface ScannerSavePlan {
  kind: "create" | "merge";
  product: Product | null;
  publishToStore: boolean;
  stockChange: 0;
  priceChange?: {
    cost: number;
    retail: number;
    wholesale: number;
  };
  warnings: string[];
}

export function buildSavePlan(
  extracted: ExtractedProductInfo,
  images: string[],
  options: ScannerSaveOptions,
  mapExtractedDataToProduct: (
    data: ExtractedProductInfo,
    primaryImage: string,
    allImages: string[]
  ) => Product
): ScannerSavePlan {
  const warnings: string[] = [
    "AI extraction does not change on-hand inventory.",
    "Publication should be authorized and committed by the server.",
  ];

  const cost = Number(extracted.suggestedCost ?? 0);
  const retail =
    Number(extracted.suggestedPrice ?? 0) ||
    calculateRetailPrice(cost, options.marginPercent);
  const wholesale =
    Number(extracted.suggestedWholesalePrice ?? 0) ||
    calculateWholesalePrice(cost);

  const priceChange =
    options.updatePricing && cost > 0
      ? { cost, retail, wholesale }
      : undefined;

  if (options.saveMode === "merge_existing" && options.selectedProduct) {
    const existing = options.selectedProduct;
    const existingImages =
      existing.images ?? (existing.imageUrl ? [existing.imageUrl] : []);

    const mergedImages = options.replacePhotos
      ? images
      : Array.from(new Set([...existingImages, ...images].filter(Boolean)));

    const specifications = options.replaceSpecifications
      ? extracted.specifications ?? {}
      : { ...(existing.specifications ?? {}), ...(extracted.specifications ?? {}) };

    const product: Product = {
      ...existing,
      name: extracted.name || existing.name,
      brand: extracted.brand || existing.brand,
      model: extracted.model || existing.model,
      category: extracted.category || existing.category,
      description: extracted.description || existing.description,
      barcode: existing.barcode || extracted.barcode || "",
      sku: existing.sku || extracted.sku || "",
      images: mergedImages,
      imageUrl: existing.imageUrl || images[0] || existing.imageUrl,
      specifications,
      ...(priceChange
        ? {
            cost: priceChange.cost,
            price: priceChange.retail,
            wholesalePrice: priceChange.wholesale,
          }
        : {}),
      // Intentionally preserve stock/status/ecommerce. The server should
      // decide whether the current user may change them.
    };

    return {
      kind: "merge",
      product,
      publishToStore: options.publishToStore,
      stockChange: 0,
      priceChange,
      warnings,
    };
  }

  const product = mapExtractedDataToProduct(
    extracted,
    images[0] ?? "",
    images
  );

  // New product is created with zero on-hand stock unless a receiving
  // workflow explicitly supplies an inventory quantity.
  product.stock = 0;
  product.status = "Draft";
  product.cost = cost;
  product.price = retail;
  product.wholesalePrice = wholesale;
  product.reorderPoint = product.reorderPoint ?? 10;

  if (product.ecommerce) {
    product.ecommerce = {
      ...product.ecommerce,
      published: false,
    };
  }

  return {
    kind: "create",
    product,
    publishToStore: options.publishToStore,
    stockChange: 0,
    priceChange,
    warnings,
  };
}
