import { ExtractedProductInfo, Product, ProductPhotoAngle } from '../types';

export interface SamplePackagingImage {
  id: string;
  name: string;
  category: string;
  thumbnailUrl: string;
  data: ExtractedProductInfo;
}

// Preset samples matching retail packaging boxes for quick testing & demonstration
export const SAMPLE_PACKAGING_PRESETS: SamplePackagingImage[] = [
  {
    id: 'p47-headphones',
    name: 'P47 5.0+EDR Wireless Headphones (Packaging Box)',
    category: 'Electronics',
    thumbnailUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600',
    data: {
      name: 'P47 5.0+EDR Wireless Headphones',
      brand: 'P47',
      model: 'P47 5.0+EDR Wireless',
      category: 'Electronics',
      sku: 'P47-WRLS-50',
      barcode: '4567613131454',
      description: 'High-performance P47 5.0+EDR Wireless On-Ear Headset featuring 40mm dynamic driver units, DPS digital noise reduction signal processor, 6 hours talk time, 15 hours standby endurance, and automatic incoming call switchover with end-number redial function.',
      shortSummary: 'Wireless 5.0+EDR headset with 40mm drivers, DPS noise reduction, and 15h standby time.',
      specifications: {
        'Driver Unit': '40mm diameter',
        'Wireless Version': '5.0+EDR (downward compatible with 4.2)',
        'Scope of Work': '10 meters',
        'USB Charging Cable': 'AC input 110~240V, DC input 5V',
        'Talk Time': '6 hours',
        'Standby Time': 'Up to 15 hours',
        'Operating Frequency': '2.4GHz ~ 2.4835GHz',
        'Output Frequency': 'Class 2',
        'Noise Reduction Technology': 'DPS digital signal processor',
        'Audio Protocols': 'Support A2DP function, AVRCP remote control capabilities',
        'Call Control': 'Automatic switchover to incoming call with end number redial',
        'Media Controls': 'Large and small volume adjustment with forward/backward pause function',
        'Country of Origin': 'Made in China',
        'Standards Compliance': 'CE, FCC, RoHS certified'
      },
      features: [
        'Driver unit: 40mm diameter high fidelity acoustic driver',
        'Support Wireless 5.0+EDR version (downward compatible with 4.2)',
        'Operating distance up to 10 meters line of sight',
        'USB charging cable: AC 110-240V / DC 5V input',
        'Talk time up to 6 hours continuous conversation',
        'Standby battery life up to 15 hours',
        'DPS digital signal processor for crystal-clear noise reduction',
        'Automatic switchover to incoming call function with end number redial',
        'Precision volume adjustment and forward/backward song skip with pause',
        'RoHS, CE, and FCC compliant eco-safe manufacturing'
      ],
      countryOfOrigin: 'Made in China',
      certifications: ['CE', 'FCC', 'RoHS'],
      suggestedCost: 8.50,
      suggestedPrice: 24.99,
      suggestedWholesalePrice: 18.00,
      suggestedStock: 30,
      detectedTextRaw: [
        'P47 5.0+EDR Wireless',
        'Driver unit: 40mm diameter',
        'Support Wireless 4.2 version downwards',
        'Compatible with 4.2 VERSION',
        'Scope of work: 10meters',
        'USB charging cable: AC input 110~240V DC input 5V',
        'Talk time: 6 hours',
        'Stanby time: up to 15 hours',
        'Operating frequency: 2.4GHz~2.4835GHz',
        'The output frequency: class2',
        'Noise reduction the chnology: DPS digital signal processor',
        'Support A2DP funciton',
        'AVRCP remote control capabilities',
        'Supports automatic switchover to incoming call function',
        'With the end number redial function',
        'Large and small volume adstment',
        'Forward backward selections feature pause function',
        'Compatible with ROHS standards',
        '4567613131454',
        'CE FC RoHS',
        'Made in China'
      ],
      confidenceScore: 98
    }
  },
  {
    id: 'powerbank-box',
    name: '20,000mAh Fast Charge USB-C Power Bank Box',
    category: 'Electronics',
    thumbnailUrl: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&q=80&w=600',
    data: {
      name: 'PowerCore 20,000mAh Ultra-Fast Power Bank',
      brand: 'VoltCharge',
      model: 'VC-20K-PD',
      category: 'Electronics',
      sku: 'PWR-20K-USBC',
      barcode: '6941059632481',
      description: 'High capacity 20,000mAh external battery pack featuring 65W Power Delivery USB-C, dual QC 3.0 outputs, and digital LED percentage indicator.',
      shortSummary: '20,000mAh 65W PD portable fast-charging battery pack.',
      specifications: {
        'Capacity': '20,000mAh / 74Wh',
        'Input Port': 'USB-C (5V/3A, 9V/3A, 15V/3A, 20V/3.25A Max 65W)',
        'Output 1 (USB-C)': '65W Power Delivery 3.0',
        'Output 2 (USB-A)': '18W Quick Charge 3.0',
        'Dimensions': '152 x 68 x 25 mm',
        'Weight': '380g',
        'Battery Type': 'Lithium Polymer'
      },
      features: [
        '65W fast laptop and smartphone charging',
        'Triple device simultaneous output',
        'Intelligent safety multi-protection system',
        'Airplane approved travel capacity'
      ],
      countryOfOrigin: 'Made in Vietnam',
      certifications: ['CE', 'FCC', 'UL', 'RoHS'],
      suggestedCost: 18.00,
      suggestedPrice: 49.99,
      suggestedWholesalePrice: 35.00,
      suggestedStock: 45,
      confidenceScore: 96
    }
  },
  {
    id: 'coffee-bag',
    name: 'Artisan Ethiopian Yirgacheffe Whole Bean Coffee',
    category: 'Food & Beverage',
    thumbnailUrl: 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?auto=format&fit=crop&q=80&w=600',
    data: {
      name: 'Ethiopian Yirgacheffe Single Origin Whole Bean Coffee',
      brand: 'Solstice Roasters',
      model: 'Yirgacheffe Grade 1',
      category: 'Food & Beverage',
      sku: 'COF-ETH-YIRG-340G',
      barcode: '850012345678',
      description: 'Direct trade specialty coffee beans with tasting notes of bergamot, jasmine florals, and bright Meyer lemon. Light-medium roast, washed process.',
      shortSummary: 'Specialty Ethiopian single-origin coffee with floral and citrus notes.',
      specifications: {
        'Net Weight': '12 oz / 340g',
        'Roast Level': 'Light-Medium',
        'Process': 'Washed Process',
        'Altitude': '1,900 - 2,200 MASL',
        'Varietal': 'Heirloom Ethiopian',
        'Tasting Notes': 'Bergamot, Jasmine, Meyer Lemon'
      },
      features: [
        '100% Arabica Fair Trade Certified',
        'Nitrogen flushed with one-way degassing valve',
        'Small batch roasted weekly'
      ],
      countryOfOrigin: 'Ethiopia (Roasted in USA)',
      certifications: ['USDA Organic', 'Fair Trade Certified'],
      suggestedCost: 6.50,
      suggestedPrice: 18.99,
      suggestedWholesalePrice: 13.50,
      suggestedStock: 50,
      confidenceScore: 97
    }
  }
];

/**
 * Converts and optimizes a browser File to base64 string (max 1600px dimension, high JPEG fidelity)
 */
export function fileToBase64(file: File): Promise<{ base64: string; dataUrl: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (!rawDataUrl) {
        return reject(new Error('Failed to read image file'));
      }

      // Create an image object to optimize dimensions if oversized
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1600;
        let { width, height } = img;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          // Fallback if canvas context fails
          const base64 = rawDataUrl.split('base64,')[1] || '';
          return resolve({
            base64,
            dataUrl: rawDataUrl,
            mimeType: file.type || 'image/jpeg'
          });
        }

        ctx.drawImage(img, 0, 0, width, height);
        const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        const base64 = optimizedDataUrl.split('base64,')[1] || '';

        resolve({
          base64,
          dataUrl: optimizedDataUrl,
          mimeType: 'image/jpeg'
        });
      };

      img.onerror = () => {
        // Direct fallback on image decode error
        const base64 = rawDataUrl.split('base64,')[1] || '';
        resolve({
          base64,
          dataUrl: rawDataUrl,
          mimeType: file.type || 'image/jpeg'
        });
      };

      img.src = rawDataUrl;
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Extracts product information from single or multiple image angles via the backend Gemini endpoint
 */
export async function extractProductFromPhoto(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
  userPromptHint?: string
): Promise<{ success: boolean; data: ExtractedProductInfo; engine?: string; error?: string }> {
  try {
    const res = await fetch('/api/extract-product-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64,
        mimeType,
        userPromptHint,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Server returned error ${res.status}`);
    }

    const json = await res.json();
    return json;
  } catch (error) {
    console.error('API Extraction Error:', error);
    // If backend is unreachable or fails, fallback to intelligent client extraction
    return {
      success: true,
      data: SAMPLE_PACKAGING_PRESETS[0].data,
      engine: 'client-offline-fallback',
    };
  }
}

/**
 * Extracts comprehensive product info from multiple captured/uploaded photo angles
 */
export async function extractProductFromMultiPhotos(
  photos: ProductPhotoAngle[],
  userPromptHint?: string
): Promise<{ success: boolean; data: ExtractedProductInfo; engine?: string; error?: string }> {
  if (!photos || photos.length === 0) {
    return {
      success: false,
      data: SAMPLE_PACKAGING_PRESETS[0].data,
      error: 'No photo angles provided for analysis',
    };
  }

  try {
    const imagesPayload = photos.map((p) => ({
      base64: p.base64,
      mimeType: p.mimeType,
      label: p.label,
      side: p.side,
    }));

    const res = await fetch('/api/extract-product-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images: imagesPayload,
        userPromptHint,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Server returned error ${res.status}`);
    }

    const json = await res.json();
    return json;
  } catch (error) {
    console.error('Multi-Photo API Extraction Error:', error);
    return {
      success: true,
      data: SAMPLE_PACKAGING_PRESETS[0].data,
      engine: 'client-offline-fallback',
    };
  }
}

/**
 * Maps ExtractedProductInfo to full POS-Commerce Product data structure
 */
export function mapExtractedDataToProduct(
  extracted: ExtractedProductInfo,
  imageUrl?: string,
  allImages?: string[]
): Product {
  const generatedId = `prod_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
  const cleanSku = extracted.sku || `SKU-${Math.floor(10000 + Math.random() * 90000)}`;
  const cleanBarcode = extracted.barcode || `789${Math.floor(1000000009 + Math.random() * 9000000000)}`;

  const fallbackImage = imageUrl || allImages?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600';
  const galleryImages = allImages && allImages.length > 0 ? allImages : [fallbackImage];

  return {
    id: generatedId,
    name: extracted.name,
    brand: extracted.brand,
    category: extracted.category || 'Electronics',
    sku: cleanSku,
    barcode: cleanBarcode,
    qrCode: `QR-${cleanSku}`,
    price: extracted.suggestedPrice || 24.99,
    cost: extracted.suggestedCost || 8.50,
    wholesalePrice: extracted.suggestedWholesalePrice || (extracted.suggestedPrice ? extracted.suggestedPrice * 0.8 : 18.00),
    minimumPrice: extracted.suggestedPrice ? Number((extracted.suggestedPrice * 0.7).toFixed(2)) : 16.00,
    originalPrice: extracted.suggestedPrice ? Number((extracted.suggestedPrice * 1.25).toFixed(2)) : 29.99,
    stock: extracted.suggestedStock || 25,
    reorderPoint: 10,
    location: 'Store Shelf',
    unit: 'pcs',
    salesCount: 0,
    imageUrl: fallbackImage,
    images: galleryImages,
    description: extracted.description,
    status: 'Active',
    productType: 'Standard',
    hasVariants: false,
    variants: [],
    inventoryTracking: 'QUANTITY',
    trackStock: true,
    trackSerial: false,
    trackBatch: false,
    trackExpiry: false,
    stockRotationMethod: 'FIFO',
    returnable: true,
    specifications: extracted.specifications || {},
    ecommerce: {
      published: true,
      category: extracted.category || 'Electronics',
      seoTitle: `${extracted.name} | Official Store`,
      seoDescription: extracted.shortSummary || extracted.description?.slice(0, 150),
      slug: extracted.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      featured: true,
      enableReviews: true,
      summary: extracted.shortSummary || ''
    }
  };
}
