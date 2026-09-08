import type { ExtractedProductInfo, Product, ProductPhotoAngle } from "../types";

export const MAX_IMAGES = 8;
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export type MatchReason = "barcode" | "sku" | "model" | "brand-model" | "name";

export interface ProductMatch {
  product: Product;
  score: number;
  reason: MatchReason;
}

export function normalize(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

export function normalizeBarcode(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

function validBarcode(value: string) {
  return /^\d{8,14}$/.test(value);
}

function validEanUpcChecksum(value: string) {
  if (!/^\d+$/.test(value)) return false;
  if (![8, 12, 13, 14].includes(value.length)) return true;

  let sum = 0;
  const digits = value.split("").map(Number).reverse();
  for (let i = 1; i < digits.length; i++) {
    sum += digits[i] * (i % 2 === 1 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === digits[0];
}

export function validateExtractedData(data: ExtractedProductInfo) {
  const errors: string[] = [];

  if (!normalize(data.name)) errors.push("Product name is required.");

  const barcode = normalizeBarcode(data.barcode);
  if (barcode && (!validBarcode(barcode) || !validEanUpcChecksum(barcode))) {
    errors.push("The extracted barcode is invalid or failed its checksum.");
  }

  const numbers = [
    ["suggestedCost", data.suggestedCost],
    ["suggestedPrice", data.suggestedPrice],
    ["suggestedWholesalePrice", data.suggestedWholesalePrice],
  ] as const;

  for (const [field, value] of numbers) {
    if (value != null && (!Number.isFinite(value) || value < 0)) {
      errors.push(`${field} must be a non-negative number.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function findBestProductMatch(
  extracted: ExtractedProductInfo,
  products: Product[]
): ProductMatch | null {
  const barcode = normalizeBarcode(extracted.barcode);
  const sku = normalize(extracted.sku);
  const model = normalize(extracted.model);
  const brand = normalize(extracted.brand);
  const name = normalize(extracted.name);

  if (barcode) {
    const exact = products.find(
      (p) => normalizeBarcode(p.barcode) === barcode && barcode.length > 0
    );
    if (exact) return { product: exact, score: 1, reason: "barcode" };
  }

  if (sku) {
    const exact = products.find((p) => normalize(p.sku) === sku);
    if (exact) return { product: exact, score: 0.98, reason: "sku" };
  }

  if (model) {
    const exact = products.find((p) => normalize(p.model) === model);
    if (exact) return { product: exact, score: 0.94, reason: "model" };
  }

  if (brand && model) {
    const exact = products.find(
      (p) => normalize(p.brand) === brand && normalize(p.model) === model
    );
    if (exact) return { product: exact, score: 0.92, reason: "brand-model" };
  }

  // Name is deliberately NOT an automatic merge trigger.
  if (name) {
    const candidate = products.find((p) => normalize(p.name) === name);
    if (candidate) return { product: candidate, score: 0.72, reason: "name" };
  }

  return null;
}

export function calculateRetailPrice(cost: number, marginPercent: number) {
  if (cost <= 0) return 0;
  const margin = Math.min(99.9, Math.max(0, marginPercent));
  return Number((cost / (1 - margin / 100)).toFixed(2));
}

export function calculateWholesalePrice(cost: number, markupPercent = 25) {
  if (cost <= 0) return 0;
  return Number((cost * (1 + markupPercent / 100)).toFixed(2));
}

export async function fileToScannerPhoto(
  file: File,
  side: string,
  label: string
): Promise<ProductPhotoAngle> {
  if (!file.type.startsWith("image/")) {
    throw new Error(`${file.name} is not an image.`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`${file.name} is larger than the 10MB limit.`);
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });

  const base64 = dataUrl.split(",", 2)[1] ?? "";

  return {
    id: `angle_${crypto.randomUUID?.() ?? `${Date.now()}_${Math.random()}`}`,
    side,
    label,
    dataUrl,
    base64,
    mimeType: file.type || "image/jpeg",
    fileName: file.name,
    capturedAt: new Date().toISOString(),
  } as ProductPhotoAngle;
}
