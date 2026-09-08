import { Product, Customer, StaffMember, Order, AuditLog, Category, ProductReview, AdminNotification } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'electronics', name: 'Electronics & Gadgets', icon: 'Cpu' },
  { id: 'apparel', name: 'Apparel & Fashion', icon: 'Shirt' },
  { id: 'home', name: 'Home & Living', icon: 'Home' },
  { id: 'grocery', name: 'Food & Beverages', icon: 'Coffee' },
  { id: 'beauty', name: 'Beauty & Personal Care', icon: 'Sparkles' },
  { id: 'fitness', name: 'Sports & Outdoors', icon: 'Activity' },
  { id: 'office', name: 'Office Supplies & Books', icon: 'Briefcase' },
  { id: 'auto', name: 'Automotive & Hardware', icon: 'Wrench' },
  { id: 'services', name: 'Services & Digital', icon: 'Layers' },
  { id: 'general', name: 'General Merchandise', icon: 'ShoppingBag' }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-milk-1l',
    name: 'Milk 1L',
    sku: 'MLK-WHOLE-1L',
    price: 3.49,
    originalPrice: 3.99,
    cost: 1.80,
    wholesalePrice: 2.90,
    stock: 500,
    unit: 'Liter',
    category: 'Grocery & Dairy',
    brand: 'Pure Valley Farm',
    location: 'Cooler A-04',
    reorderPoint: 50,
    barcode: '931234567890',
    ean: '931234567890',
    upc: '031234567890',
    qrCode: 'QR-MLK-WHOLE-1L',
    hasVariants: false,
    variants: [],
    barcodes: [
      { type: 'EAN', code: '931234567890', isPrimary: true },
      { type: 'UPC', code: '031234567890' },
      { type: 'CODE128', code: 'MLK-2026-08-01' }
    ],
    trackStock: true,
    trackBatch: true,
    trackExpiry: true,
    batchNumber: 'MLK-2026-08-01',
    expiryDate: '2027-02-01',
    stockRotationMethod: 'FEFO',
    fifoBatches: [
      {
        id: 'batch-mlk-2026-08-01',
        batchNumber: 'MLK-2026-08-01',
        initialQuantity: 500,
        quantity: 500,
        unitCost: 1.80,
        receivedDate: '2026-08-01T08:00:00.000Z',
        manufactureDate: '2026-08-01',
        expiryDate: '2027-02-01',
        supplierName: 'Pure Valley Dairy Co-op',
        supplierInvoiceRef: 'INV-PVD-8812',
        status: 'Active',
        salesHistory: []
      }
    ],
    salesCount: 124,
    isBestSeller: true,
    rating: 4.88,
    reviewCount: 96,
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=600',
    description: 'Fresh pasteurized whole milk 1 Liter, rich in calcium and vitamins. Monitored with strict FEFO batch tracking for maximum freshness.',
    returnable: false
  },
  {
    id: 'prod-nike-am270',
    name: 'Nike Air Max 270',
    sku: 'NK-AM270-000',
    price: 150.00,
    originalPrice: 170.00,
    cost: 55.00,
    wholesalePrice: 135.00,
    priceLists: [
      { priceListId: 'pl-retail', priceListName: 'Retail', price: 150.00 },
      { priceListId: 'pl-wholesale', priceListName: 'Wholesale', price: 135.00 },
      { priceListId: 'pl-dealer', priceListName: 'Dealer', price: 125.00 },
      { priceListId: 'pl-member', priceListName: 'Member', price: 140.00 },
      { priceListId: 'pl-promo', priceListName: 'Promotional', price: 120.00 }
    ],
    stock: 85,
    category: 'Footwear & Athletic',
    brand: 'Nike',
    model: 'Air Max 270',
    location: 'Store Shelf',
    reorderPoint: 15,
    barcode: '890123456780',
    ean: '890123456780',
    upc: '012345678900',
    qrCode: 'QR-NK-AM270-MASTER',
    barcodes: [
      { type: 'EAN', code: '890123456780', isPrimary: true },
      { type: 'UPC', code: '012345678900' },
      { type: 'QR', code: 'QR-NK-AM270-MASTER' }
    ],
    hasVariants: true,
    salesCount: 185,
    isBestSeller: true,
    isFeatured: true,
    rating: 4.95,
    reviewCount: 420,
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600',
    variants: [
      // Black Variants
      {
        id: 'var-nk-am270-blk-40',
        sku: 'NIKE-AM270-BLK-40',
        title: 'Black / Size 40',
        size: '40',
        color: 'Black',
        model: 'Air Max 270',
        stock: 12,
        price: 150.00,
        imageUrl: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&q=80&w=600',
        images: [
          'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&q=80&w=800'
        ],
        options: { Size: '40', Color: 'Black' }
      },
      {
        id: 'var-nk-am270-blk-41',
        sku: 'NIKE-AM270-BLK-41',
        title: 'Black / Size 41',
        size: '41',
        color: 'Black',
        model: 'Air Max 270',
        stock: 18,
        price: 150.00,
        imageUrl: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&q=80&w=600',
        images: [
          'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&q=80&w=800'
        ],
        options: { Size: '41', Color: 'Black' }
      },
      {
        id: 'var-nk-am270-blk-42',
        sku: 'NIKE-AM270-BLK-42',
        title: 'Black / Size 42',
        size: '42',
        color: 'Black',
        model: 'Air Max 270',
        stock: 28,
        price: 150.00,
        imageUrl: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&q=80&w=600',
        images: [
          'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&q=80&w=800'
        ],
        options: { Size: '42', Color: 'Black' }
      },
      {
        id: 'var-nk-am270-blk-43',
        sku: 'NIKE-AM270-BLK-43',
        title: 'Black / Size 43',
        size: '43',
        color: 'Black',
        model: 'Air Max 270',
        stock: 0, // Unavailable in Black 43
        price: 150.00,
        imageUrl: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&q=80&w=600',
        images: [
          'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=800'
        ],
        options: { Size: '43', Color: 'Black' }
      },
      // White Variants
      {
        id: 'var-nk-am270-wht-40',
        sku: 'NIKE-AM270-WHT-40',
        title: 'White / Size 40',
        size: '40',
        color: 'White',
        model: 'Air Max 270',
        stock: 15,
        price: 150.00,
        imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=600',
        images: [
          'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&q=80&w=800'
        ],
        options: { Size: '40', Color: 'White' }
      },
      {
        id: 'var-nk-am270-wht-41',
        sku: 'NIKE-AM270-WHT-41',
        title: 'White / Size 41',
        size: '41',
        color: 'White',
        model: 'Air Max 270',
        stock: 0, // Unavailable in White 41
        price: 150.00,
        imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=600',
        images: [
          'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&q=80&w=800'
        ],
        options: { Size: '41', Color: 'White' }
      },
      {
        id: 'var-nk-am270-wht-42',
        sku: 'NIKE-AM270-WHT-42',
        title: 'White / Size 42',
        size: '42',
        color: 'White',
        model: 'Air Max 270',
        stock: 35,
        price: 150.00,
        imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=600',
        images: [
          'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&q=80&w=800'
        ],
        options: { Size: '42', Color: 'White' }
      },
      {
        id: 'var-nk-am270-wht-43',
        sku: 'NIKE-AM270-WHT-43',
        title: 'White / Size 43',
        size: '43',
        color: 'White',
        model: 'Air Max 270',
        stock: 8,
        price: 150.00,
        imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=600',
        images: [
          'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&q=80&w=800'
        ],
        options: { Size: '43', Color: 'White' }
      },
      // Red Variants
      {
        id: 'var-nk-am270-red-40',
        sku: 'NIKE-AM270-RED-40',
        title: 'Red / Size 40',
        size: '40',
        color: 'Red',
        model: 'Air Max 270',
        stock: 0, // Unavailable in Red 40
        price: 150.00,
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600',
        images: [
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1582588678413-dbf45f4823e9?auto=format&fit=crop&q=80&w=800'
        ],
        options: { Size: '40', Color: 'Red' }
      },
      {
        id: 'var-nk-am270-red-41',
        sku: 'NIKE-AM270-RED-41',
        title: 'Red / Size 41',
        size: '41',
        color: 'Red',
        model: 'Air Max 270',
        stock: 14,
        price: 150.00,
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600',
        images: [
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1582588678413-dbf45f4823e9?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&q=80&w=800'
        ],
        options: { Size: '41', Color: 'Red' }
      },
      {
        id: 'var-nk-am270-red-42',
        sku: 'NIKE-AM270-RED-42',
        title: 'Red / Size 42',
        size: '42',
        color: 'Red',
        model: 'Air Max 270',
        stock: 20,
        price: 150.00,
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600',
        images: [
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1582588678413-dbf45f4823e9?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&q=80&w=800'
        ],
        options: { Size: '42', Color: 'Red' }
      },
      {
        id: 'var-nk-am270-red-43',
        sku: 'NIKE-AM270-RED-43',
        title: 'Red / Size 43',
        size: '43',
        color: 'Red',
        model: 'Air Max 270',
        stock: 10,
        price: 150.00,
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600',
        images: [
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1582588678413-dbf45f4823e9?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&q=80&w=800'
        ],
        options: { Size: '43', Color: 'Red' }
      }
    ],
    relationships: {
      boughtTogetherProductIds: ['prod-nike-socks', 'prod-nike-shoe-cleaner', 'prod-nike-sports-bag'],
      relatedProductIds: ['prod-nike-air-zoom-runner', 'prod-adidas-ultraboost-5', 'prod-puma-rsx-trail', 'prod-reebok-club-c'],
      recommendedProductIds: ['prod-100', 'prod-105', 'prod-102', 'prod-103'],
      upsellProductIds: ['prod-nike-air-zoom-runner', 'prod-adidas-ultraboost-5']
    }
  },
  {
    id: 'prod-nike-socks',
    name: 'Nike Everyday Cushion Crew Socks (3-Pack)',
    sku: 'NK-SK-EC3P',
    price: 18.00,
    originalPrice: 22.00,
    cost: 5.50,
    stock: 120,
    category: 'Footwear & Athletic',
    brand: 'Nike',
    model: 'Everyday Cushion Crew',
    location: 'Aisle 3',
    reorderPoint: 20,
    barcode: '880192837901',
    qrCode: 'QR-NK-SK-EC3P',
    variants: [],
    isBestSeller: true,
    rating: 4.8,
    reviewCount: 340,
    salesCount: 450,
    imageUrl: 'https://images.unsplash.com/photo-1582966772680-860e372bb558?auto=format&fit=crop&q=80&w=600',
    description: 'Nike Dri-FIT sweat-wicking everyday crew socks with thick terry sole for impact absorption and snug arch band.',
    specifications: {
      'Material': '69% Cotton, 28% Polyester, 2% Spandex, 1% Nylon',
      'Pack Size': '3 Pairs Included',
      'Technology': 'Dri-FIT Moisture Management'
    }
  },
  {
    id: 'prod-nike-shoe-cleaner',
    name: 'Nike Essential Sneaker & Shoe Cleaner Kit',
    sku: 'NK-CARE-CLN',
    price: 22.00,
    originalPrice: 26.00,
    cost: 7.00,
    stock: 80,
    category: 'Footwear & Athletic',
    brand: 'Nike',
    model: 'Essential Sneaker Care',
    location: 'Aisle 3',
    reorderPoint: 15,
    barcode: '880192837902',
    qrCode: 'QR-NK-CARE-CLN',
    variants: [],
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 195,
    salesCount: 280,
    imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=600',
    description: 'Eco-friendly foaming sneaker cleaner solution with premium wooden bristle brush and microfiber drying towel designed for mesh, leather, and knit.',
    specifications: {
      'Volume': '200 ml Foaming Solution',
      'Brush': 'Natural Hog Bristle Wood Brush',
      'Safety': '100% Biodegradable & Non-Toxic'
    }
  },
  {
    id: 'prod-nike-sports-bag',
    name: 'Nike Brasilia Training Sports Duffel Bag',
    sku: 'NK-BAG-BRS',
    price: 38.00,
    originalPrice: 45.00,
    cost: 14.00,
    stock: 65,
    category: 'Footwear & Athletic',
    brand: 'Nike',
    model: 'Brasilia 9.5',
    location: 'Aisle 4',
    reorderPoint: 10,
    barcode: '880192837903',
    qrCode: 'QR-NK-BAG-BRS',
    variants: [],
    isBestSeller: true,
    rating: 4.85,
    reviewCount: 160,
    salesCount: 310,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=600',
    description: 'Spacious 41L water-resistant sports duffel bag with dedicated ventilated shoe compartment and padded shoulder strap.',
    specifications: {
      'Capacity': '41 Liters',
      'Dimensions': '51cm L x 28cm W x 28cm H',
      'Features': 'Separate Sneaker Compartment, Zippered Outer Pockets'
    }
  },
  {
    id: 'prod-100',
    name: 'Classic Organic Cotton T-Shirt',
    sku: 'TS-CREW-001',
    price: 29.99,
    originalPrice: 35.00,
    cost: 8.50,
    stock: 165,
    category: 'Apparel & Fashion',
    brand: 'Nike',
    location: 'Warehouse',
    reorderPoint: 25,
    barcode: '880192837500',
    qrCode: 'QR-TS-CREW-001',
    hasVariants: true,
    isBestSeller: true,
    isFeatured: true,
    rating: 4.9,
    reviewCount: 312,
    variants: [
      {
        id: 'var-ts-s-red',
        sku: 'TS-CREW-S-RED',
        title: 'Small / Red',
        size: 'Small',
        color: 'Red',
        stock: 25,
        price: 29.99,
        cost: 8.50,
        barcode: '880192837501',
        weight: 0.18,
        weightUnit: 'kg',
        dimensions: { length: 25, width: 20, height: 2, unit: 'cm' },
        inventoryTracking: 'QUANTITY',
        inventoryItemId: 'INV-ITEM-TS-S-RED',
        imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=600',
        options: { Size: 'Small', Color: 'Red' }
      },
      {
        id: 'var-ts-m-red',
        sku: 'TS-CREW-M-RED',
        title: 'Medium / Red',
        size: 'Medium',
        color: 'Red',
        stock: 35,
        price: 29.99,
        cost: 8.50,
        barcode: '880192837502',
        weight: 0.20,
        weightUnit: 'kg',
        dimensions: { length: 26, width: 21, height: 2, unit: 'cm' },
        inventoryTracking: 'QUANTITY',
        inventoryItemId: 'INV-ITEM-TS-M-RED',
        imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=600',
        options: { Size: 'Medium', Color: 'Red' }
      },
      {
        id: 'var-ts-l-red',
        sku: 'TS-CREW-L-RED',
        title: 'Large / Red',
        size: 'Large',
        color: 'Red',
        stock: 20,
        price: 29.99,
        cost: 8.50,
        barcode: '880192837503',
        weight: 0.22,
        weightUnit: 'kg',
        dimensions: { length: 27, width: 22, height: 2, unit: 'cm' },
        inventoryTracking: 'QUANTITY',
        inventoryItemId: 'INV-ITEM-TS-L-RED',
        imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=600',
        options: { Size: 'Large', Color: 'Red' }
      },
      {
        id: 'var-ts-s-blu',
        sku: 'TS-CREW-S-BLU',
        title: 'Small / Blue',
        size: 'Small',
        color: 'Blue',
        stock: 30,
        price: 29.99,
        cost: 8.50,
        barcode: '880192837504',
        weight: 0.18,
        weightUnit: 'kg',
        dimensions: { length: 25, width: 20, height: 2, unit: 'cm' },
        inventoryTracking: 'QUANTITY',
        inventoryItemId: 'INV-ITEM-TS-S-BLU',
        imageUrl: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=600',
        options: { Size: 'Small', Color: 'Blue' }
      },
      {
        id: 'var-ts-m-blu',
        sku: 'TS-CREW-M-BLU',
        title: 'Medium / Blue',
        size: 'Medium',
        color: 'Blue',
        stock: 40,
        price: 29.99,
        cost: 8.50,
        barcode: '880192837505',
        weight: 0.20,
        weightUnit: 'kg',
        dimensions: { length: 26, width: 21, height: 2, unit: 'cm' },
        inventoryTracking: 'QUANTITY',
        inventoryItemId: 'INV-ITEM-TS-M-BLU',
        imageUrl: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=600',
        options: { Size: 'Medium', Color: 'Blue' }
      },
      {
        id: 'var-ts-l-blu',
        sku: 'TS-CREW-L-BLU',
        title: 'Large / Blue',
        size: 'Large',
        color: 'Blue',
        stock: 15,
        price: 29.99,
        cost: 8.50,
        barcode: '880192837506',
        weight: 0.22,
        weightUnit: 'kg',
        dimensions: { length: 27, width: 22, height: 2, unit: 'cm' },
        inventoryTracking: 'QUANTITY',
        inventoryItemId: 'INV-ITEM-TS-L-BLU',
        imageUrl: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=600',
        options: { Size: 'Large', Color: 'Blue' }
      }
    ],
    salesCount: 280,
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=600',
    description: '100% Ring-spun comb organic cotton premium crewneck T-Shirt available in Small, Medium, Large sizes across Red and Blue colorways with individual variant inventory tracking.'
  },
  {
    id: 'prod-101',
    name: 'AeroSound Pro ANC Headphones',
    sku: 'EL-HP-001',
    price: 249.99,
    originalPrice: 299.99,
    discountPercent: 17,
    cost: 110.00,
    stock: 45,
    category: 'Electronics',
    brand: 'Sony',
    location: 'Store Shelf',
    reorderPoint: 15,
    barcode: '880192837401',
    qrCode: 'QR-EL-HP-001',
    isBestSeller: true,
    isFeatured: true,
    rating: 4.9,
    reviewCount: 128,
    variants: [
      { sku: 'EL-HP-001-BLK', size: 'Over-Ear', color: 'Midnight Black', stock: 25 },
      { sku: 'EL-HP-001-SLV', size: 'Over-Ear', color: 'Platinum Silver', stock: 20 }
    ],
    salesCount: 142,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=600'
    ],
    specifications: {
      'Battery Life': 'Up to 40 Hours (ANC On)',
      'Connectivity': 'Bluetooth 5.3 & 3.5mm AUX',
      'Drivers': '40mm Custom Titanium Drivers',
      'Weight': '250 grams',
      'Warranty': '2 Years Comprehensive Replacement'
    },
    reviews: [
      { id: 'rev-1', productId: 'prod-101', title: 'Unbeatable Noise Cancellation', userName: 'Alex Mercer', rating: 5, date: '2026-08-10', comment: 'Active Noise Cancellation is unbeatable. Battery lasts the entire work week!', verifiedPurchase: true },
      { id: 'rev-2', productId: 'prod-101', title: 'Extremely Comfortable', userName: 'Elena Rostova', rating: 5, date: '2026-08-04', comment: 'Extremely comfortable for long listening sessions and calls.', verifiedPurchase: true }
    ],
    description: 'Studio-grade hybrid Active Noise Cancelling headphones with 40-hour battery life, plush memory foam earcups, and customizable parametric EQ sound profiles.'
  },
  {
    id: 'prod-102',
    name: 'FitTrack V4 Titanium Smartwatch',
    sku: 'EL-SW-004',
    price: 189.99,
    originalPrice: 229.99,
    discountPercent: 17,
    cost: 80.00,
    stock: 8,
    category: 'Electronics',
    brand: 'Apple',
    location: 'Store Shelf',
    reorderPoint: 12,
    barcode: '880192837402',
    qrCode: 'QR-EL-SW-004',
    isNewArrival: true,
    isFeatured: true,
    rating: 4.8,
    reviewCount: 94,
    variants: [
      { sku: 'EL-SW-004-CHR', size: '44mm', color: 'Charcoal Grey', stock: 5 },
      { sku: 'EL-SW-004-GLD', size: '40mm', color: 'Rose Gold', stock: 3 }
    ],
    salesCount: 210,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&q=80&w=600'
    ],
    specifications: {
      'Display': '1.9-inch Always-On Retina OLED',
      'Water Resistance': '50M WR50 Swimproof',
      'Sensors': 'ECG, SpO2, Heart Rate, Body Temp, Dual GPS',
      'Battery Life': 'Up to 36 Hours (Low Power Mode)',
      'Compatibility': 'iOS & Android'
    },
    reviews: [
      { id: 'rev-3', productId: 'prod-102', title: 'Accurate Tracking', userName: 'Marcus Vance', rating: 5, date: '2026-08-12', comment: 'Accurate heart rate tracking and crisp display even in bright sunlight.', verifiedPurchase: true }
    ],
    description: 'All-day aerospace titanium fitness tracker with SpO2 monitoring, on-wrist ECG, integrated dual-band GPS, and fast wireless charging.'
  },
  {
    id: 'prod-106',
    name: 'Protein Crunch Bars (Box of 30)',
    sku: 'NUT-BAR-30',
    price: 4.00,
    cost: 2.50,
    stock: 150,
    category: 'Fitness & Outdoors',
    brand: 'NutriPro',
    location: 'Store Shelf',
    reorderPoint: 30,
    barcode: '880192837406',
    qrCode: 'QR-NUT-BAR-30',
    productType: 'PackBreakdown',
    unit: 'bar',
    bulkPackaging: {
      outerPackageType: 'Box',
      itemsPerPackage: 30,
      outerPackageCost: 75.00,
      unitCost: 2.50,
      unitRetailPrice: 4.00,
      dozenRetailPrice: 42.00,
      outerPackageRetailPrice: 100.00,
      allowDozenSale: true,
      allowPackageSale: true
    },
    packagingUnits: {
      base_unit: 'bar',
      multiplier: 30,
      outerPackageType: 'Box',
      units: [
        {
          unitName: 'Retail Unit (1 bar)',
          unitType: 'retail_unit',
          multiplier: 1,
          base_unit: 'bar',
          price: 4.00,
          cost: 2.50,
          allowSale: true
        },
        {
          unitName: 'Dozen (12 bars)',
          unitType: 'dozen',
          multiplier: 12,
          base_unit: 'bar',
          price: 42.00,
          cost: 30.00,
          allowSale: true
        },
        {
          unitName: 'Master Box of 30 bars',
          unitType: 'master_pack',
          multiplier: 30,
          base_unit: 'bar',
          price: 100.00,
          cost: 75.00,
          allowSale: true
        }
      ]
    },
    variants: [],
    salesCount: 88,
    imageUrl: 'https://images.unsplash.com/photo-1622484210800-8851a02931a2?auto=format&fit=crop&q=80&w=600',
    description: 'High-protein chocolate crunch bars available for individual retail piece sales, dozen bundles, or full master box distribution.'
  },
  {
    id: 'prod-107',
    name: 'Olinda Pure Ceylon Black Tea (Box of 100)',
    sku: 'TEA-OLINDA-100',
    price: 0.60,
    cost: 0.18,
    stock: 500, // 5 boxes of 100 tea bags
    category: 'Groceries & Pantry',
    brand: 'Olinda',
    location: 'Store Shelf',
    reorderPoint: 50,
    barcode: '4792026001002',
    qrCode: 'QR-TEA-OLINDA-100',
    productType: 'PackBreakdown',
    hasMultiUOM: true,
    unit: 'tea bag',
    bulkPackaging: {
      outerPackageType: 'Box',
      itemsPerPackage: 100,
      outerPackageCost: 18.00,
      unitCost: 0.18,
      unitRetailPrice: 0.60,
      outerPackageRetailPrice: 25.00,
      allowDozenSale: false,
      allowPackageSale: true
    },
    packagingUnits: {
      base_unit: 'tea bag',
      multiplier: 100,
      outerPackageType: 'Box',
      outerPackageCost: 18.00,
      units: [
        {
          id: 'olinda-single',
          unitName: 'Single (1 Tea Bag)',
          unitType: 'retail_unit',
          multiplier: 1,
          base_unit: 'tea bag',
          price: 0.60,
          cost: 0.18,
          allowSale: true,
          isBaseUnit: true
        },
        {
          id: 'olinda-pair',
          unitName: '2 Tea Bags (Retail Pair)',
          unitType: 'bundle',
          multiplier: 2,
          base_unit: 'tea bag',
          price: 1.00,
          cost: 0.36,
          allowSale: true
        },
        {
          id: 'olinda-pack10',
          unitName: 'Pack of 10 Tea Bags',
          unitType: 'bundle',
          multiplier: 10,
          base_unit: 'tea bag',
          price: 4.50,
          cost: 1.80,
          allowSale: true
        },
        {
          id: 'olinda-box',
          unitName: 'Full Box of 100 Tea Bags',
          unitType: 'master_pack',
          multiplier: 100,
          base_unit: 'tea bag',
          price: 25.00,
          cost: 18.00,
          allowSale: true
        }
      ]
    },
    variants: [],
    salesCount: 142,
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=600',
    description: 'Authentic high-grown Ceylon black tea in individually sealed envelopes. Sold in flexible retail units: single bags, 2 bags for Le 1, packs of 10, or full master boxes of 100.'
  },
  {
    id: 'prod-103',
    name: 'Merino Wool Pro Alpine Socks',
    sku: 'AP-SK-012',
    price: 24.99,
    originalPrice: 32.00,
    discountPercent: 22,
    cost: 8.50,
    stock: 120,
    category: 'Apparel & Fashion',
    brand: 'Nike',
    location: 'Warehouse',
    reorderPoint: 30,
    barcode: '880192837403',
    qrCode: 'QR-AP-SK-012',
    isBestSeller: true,
    rating: 4.7,
    reviewCount: 245,
    variants: [
      { sku: 'AP-SK-012-M', size: 'Medium (US 7-9)', color: 'Forest Green', stock: 60 },
      { sku: 'AP-SK-012-L', size: 'Large (US 10-13)', color: 'Slate Grey', stock: 60 }
    ],
    salesCount: 340,
    imageUrl: 'https://images.unsplash.com/photo-1582966772680-860e372bb558?auto=format&fit=crop&q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1582966772680-860e372bb558?auto=format&fit=crop&q=80&w=600'
    ],
    specifications: {
      'Material': '68% Merino Wool, 28% Nylon, 4% Lycra Elastane',
      'Cushioning': 'Medium Targeted High-Impact Cushioning',
      'Origin': 'Ethically Sourced New Zealand Wool'
    },
    reviews: [
      { id: 'rev-4', productId: 'prod-103', title: 'Great Trail Socks', userName: 'Chloe Bennett', rating: 5, date: '2026-08-01', comment: 'No blisters after a 20-mile hike in the mountains. Warm and breathable.', verifiedPurchase: true }
    ],
    description: 'Premium ethical Merino wool blended performance socks with double-cushioned soles, targeted arch compression, and seamless toe closure.'
  },
  {
    id: 'prod-104',
    name: 'Apex Ergonomic Executive Mesh Chair',
    sku: 'HO-CH-099',
    price: 349.99,
    originalPrice: 429.99,
    discountPercent: 19,
    cost: 165.00,
    stock: 5,
    category: 'Home & Living',
    brand: 'Herman Miller',
    location: 'Warehouse',
    reorderPoint: 10,
    barcode: '880192837404',
    qrCode: 'QR-HO-CH-099',
    isFeatured: true,
    rating: 4.9,
    reviewCount: 78,
    variants: [
      { sku: 'HO-CH-099-STD', size: 'Standard Adjustable', color: 'Obsidian Black', stock: 5 }
    ],
    salesCount: 55,
    imageUrl: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1580481077180-2a9f73248386?auto=format&fit=crop&q=80&w=600'
    ],
    specifications: {
      'Adjustability': '4D Armrests, Lumbar Depth & Height, 135° Synchro-Tilt',
      'Weight Capacity': '330 lbs (150 kg)',
      'Mesh Material': 'Breathable Elastomeric High-Tensile Mesh',
      'Base': 'Heavy-duty polished aluminum 5-wheel wheelbase',
      'Warranty': '10 Years Structural Warranty'
    },
    reviews: [
      { id: 'rev-5', productId: 'prod-104', title: 'Eliminated Back Pain', userName: 'David Sterling', rating: 5, date: '2026-07-28', comment: 'Eliminated my lower back stiffness completely during 10-hour work days.', verifiedPurchase: true }
    ],
    description: 'Fully adjustable breathable mesh task chair featuring dynamic adaptive lumbar support, 4D multi-directional armrests, and synchronized multi-point tilt mechanism.'
  },
  {
    id: 'prod-105',
    name: 'HydroLock Thermal Steel Flask 1L',
    sku: 'FT-FK-023',
    price: 39.99,
    originalPrice: 49.99,
    discountPercent: 20,
    cost: 14.00,
    stock: 75,
    category: 'Fitness & Outdoors',
    brand: 'Bose',
    location: 'Store Shelf',
    reorderPoint: 20,
    barcode: '880192837405',
    qrCode: 'QR-FT-FK-023',
    isNewArrival: true,
    rating: 4.8,
    reviewCount: 112,
    variants: [
      { sku: 'FT-FK-023-NVY', size: '1000 ml', color: 'Ocean Navy', stock: 40 },
      { sku: 'FT-FK-023-WHT', size: '1000 ml', color: 'Alpine White', stock: 35 }
    ],
    salesCount: 188,
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=600'
    ],
    specifications: {
      'Insulation': 'TempShield™ Double-Wall Vacuum Insulation',
      'Cold Retention': 'Ice Cold for 24 Hours',
      'Hot Retention': 'Steaming Hot for 12 Hours',
      'Material': '18/8 Pro-Grade Stainless Steel (BPA-Free)',
      'Lid Type': 'Leakproof Flex Cap with Ergonomic Grip'
    },
    reviews: [
      { id: 'rev-6', productId: 'prod-105', title: 'Ice Cold All Day', userName: 'Samantha Lee', rating: 5, date: '2026-08-08', comment: 'Still had ice cubes after leaving it in a hot car all afternoon!', verifiedPurchase: true }
    ],
    description: 'Double-walled vacuum insulated food-grade 18/8 stainless steel bottle keeping cold drinks chilled for 24 hours and hot liquids steaming for 12 hours.'
  },
  {
    id: 'prod-106',
    name: 'Handcrafted Walnut Desk Organizer',
    sku: 'OF-DO-008',
    price: 69.99,
    originalPrice: 85.00,
    discountPercent: 18,
    cost: 28.00,
    stock: 22,
    category: 'Office Supplies',
    brand: 'Logitech',
    location: 'Fulfillment Center',
    reorderPoint: 8,
    barcode: '880192837406',
    qrCode: 'QR-OF-DO-008',
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 56,
    variants: [
      { sku: 'OF-DO-008-WAL', size: 'Medium (12" x 6")', color: 'Natural American Walnut', stock: 22 }
    ],
    salesCount: 94,
    imageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=600'
    ],
    specifications: {
      'Wood Type': '100% Solid Certified American Walnut',
      'Features': 'Magnetic Phone Stand, Dual Pen Well, Catchall Tray',
      'Finish': 'Natural Organic Matte Oil Wax'
    },
    reviews: [
      { id: 'rev-7', productId: 'prod-106', title: 'Stunning Finish', userName: 'Oliver Quinn', rating: 5, date: '2026-08-02', comment: 'Elevates the aesthetic of my desk setup instantly. Fantastic craftsmanship.', verifiedPurchase: true }
    ],
    description: 'Handcrafted solid North American walnut workspace dock featuring magnetic hidden cable routing channels, phone kickstand, and modular pen receptacles.'
  },
  {
    id: 'prod-107',
    name: 'Lumix Pro 4K Wireless Action Cam',
    sku: 'EL-AC-019',
    price: 329.99,
    originalPrice: 399.99,
    discountPercent: 18,
    cost: 160.00,
    stock: 19,
    category: 'Electronics',
    brand: 'Sony',
    location: 'Store Shelf',
    reorderPoint: 5,
    barcode: '880192837407',
    qrCode: 'QR-EL-AC-019',
    isNewArrival: true,
    isFeatured: true,
    rating: 4.8,
    reviewCount: 42,
    variants: [
      { sku: 'EL-AC-019-BLK', size: 'Standard Kit', color: 'Stealth Black', stock: 19 }
    ],
    salesCount: 88,
    imageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&q=80&w=600'
    ],
    specifications: {
      'Video Resolution': '4K @ 120 FPS / 5.3K @ 60 FPS',
      'Stabilization': 'HyperSmooth 6.0 Horizon Lock',
      'Waterproof': '10m / 33ft without housing',
      'Battery': 'Enduro 1720mAh Cold-Weather Battery'
    },
    reviews: [
      { id: 'rev-8', productId: 'prod-107', title: 'Top-tier 4K Stabilization', userName: 'Jason Todd', rating: 5, date: '2026-08-11', comment: 'Crystal clear video and gimbal-like stabilization for mountain biking.', verifiedPurchase: true }
    ],
    description: 'Ultra-durable waterproof action camera with horizon-lock image stabilization, dual color displays, and voice commands.'
  },
  {
    id: 'prod-108',
    name: 'Vortex Mechanical Wireless Keyboard',
    sku: 'OF-KB-055',
    price: 139.99,
    originalPrice: 169.99,
    discountPercent: 18,
    cost: 55.00,
    stock: 34,
    category: 'Office Supplies',
    brand: 'Logitech',
    location: 'Warehouse',
    reorderPoint: 10,
    barcode: '880192837408',
    qrCode: 'QR-OF-KB-055',
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 160,
    variants: [
      { sku: 'OF-KB-055-BRN', size: '75% Compact', color: 'Tactile Quiet Brown', stock: 20 },
      { sku: 'OF-KB-055-RED', size: '75% Compact', color: 'Linear Smooth Red', stock: 14 }
    ],
    salesCount: 175,
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&q=80&w=600'
    ],
    specifications: {
      'Switches': 'Hot-swappable Custom Pre-lubed Mechanical Switches',
      'Connectivity': 'Bluetooth 5.1 / 2.4GHz Wireless / USB-C Wired',
      'Keycaps': 'Double-shot PBT Cherry Profile',
      'Battery': '4000mAh (Up to 200 hours without backlight)'
    },
    reviews: [
      { id: 'rev-9', productId: 'prod-108', title: 'Pure Thock', userName: 'Maya Lin', rating: 5, date: '2026-08-06', comment: 'Deep thocky typing sound right out of the box with zero ping.', verifiedPurchase: true }
    ],
    description: 'Custom acoustic-dampened 75% mechanical wireless keyboard with hot-swappable switch sockets, PBT double-shot keycaps, and multi-device fast pairing.'
  },
  {
    id: 'prod-samsung-a56-256',
    name: 'Samsung Galaxy A56 256GB',
    sku: 'SAM-A56-256',
    price: 499.99,
    originalPrice: 549.99,
    discountPercent: 9,
    cost: 320.00,
    stock: 45,
    category: 'Electronics',
    brand: 'Samsung',
    model: 'Galaxy A56',
    location: 'Vault-B01',
    reorderPoint: 10,
    barcode: '8806091001567',
    ean: '8806091001567',
    upc: '0880609100156',
    qrCode: 'QR-SAM-A56-256',
    barcodes: [
      { type: 'EAN', code: '8806091001567', isPrimary: true },
      { type: 'UPC', code: '0880609100156' },
      { type: 'CODE128', code: 'SAM-A56-256-NAVY' }
    ],
    isNewArrival: true,
    isBestSeller: true,
    isFeatured: true,
    rating: 4.8,
    reviewCount: 114,
    variants: [
      { sku: 'SAM-A56-256-NVY', title: 'Awesome Navy / 256GB', color: 'Awesome Navy', size: '256GB', model: 'Galaxy A56', stock: 25, price: 499.99, cost: 320.00, barcode: '8806091001568', options: { Storage: '256GB', RAM: '8GB', Color: 'Awesome Navy' } },
      { sku: 'SAM-A56-256-GRN', title: 'Awesome Lime / 256GB', color: 'Awesome Lime', size: '256GB', model: 'Galaxy A56', stock: 20, price: 499.99, cost: 320.00, barcode: '8806091001569', options: { Storage: '256GB', RAM: '8GB', Color: 'Awesome Lime' } }
    ],
    salesCount: 195,
    imageUrl: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&q=80&w=600'
    ],
    specifications: {
      'Storage': '256GB NVMe UFS 3.1',
      'RAM': '8GB LPDDR5',
      'Display': '6.7-inch FHD+ Super AMOLED 120Hz',
      'Processor': 'Exynos 1580 Octa-Core',
      'Main Camera': '50MP OIS + 12MP Ultra-Wide + 5MP Macro',
      'Battery': '5000mAh 45W Fast Charging',
      '5G Network': 'Sub-6GHz & mmWave 5G'
    },
    description: 'Samsung Galaxy A56 256GB smartphone featuring vibrant 6.7" 120Hz Super AMOLED display, 50MP triple OIS camera system, Exynos 1580 processor, and 5000mAh all-day battery.'
  },
  {
    id: 'prod-samsung-s25-256',
    name: 'Samsung Galaxy S25 256GB',
    sku: 'SAM-S25-256',
    price: 899.99,
    originalPrice: 999.99,
    discountPercent: 10,
    cost: 580.00,
    stock: 30,
    category: 'Electronics',
    brand: 'Samsung',
    model: 'Galaxy S25',
    location: 'Vault-B02',
    reorderPoint: 8,
    barcode: '8806091002525',
    ean: '8806091002525',
    upc: '0880609100252',
    qrCode: 'QR-SAM-S25-256',
    barcodes: [
      { type: 'EAN', code: '8806091002525', isPrimary: true },
      { type: 'UPC', code: '0880609100252' }
    ],
    isNewArrival: true,
    isFeatured: true,
    rating: 4.9,
    reviewCount: 230,
    variants: [
      { sku: 'SAM-S25-256-BLK', title: 'Phantom Black / 256GB', color: 'Phantom Black', size: '256GB', model: 'Galaxy S25', stock: 15, price: 899.99, cost: 580.00, barcode: '8806091002526', options: { Storage: '256GB', RAM: '12GB', Color: 'Phantom Black' } },
      { sku: 'SAM-S25-256-SLV', title: 'Titanium Silver / 256GB', color: 'Titanium Silver', size: '256GB', model: 'Galaxy S25', stock: 15, price: 899.99, cost: 580.00, barcode: '8806091002527', options: { Storage: '256GB', RAM: '12GB', Color: 'Titanium Silver' } }
    ],
    salesCount: 310,
    imageUrl: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&q=80&w=600'
    ],
    specifications: {
      'Storage': '256GB UFS 4.0',
      'RAM': '12GB LPDDR5X',
      'Display': '6.2-inch Dynamic AMOLED 2X 120Hz',
      'Processor': 'Snapdragon 8 Gen 4 for Galaxy',
      'Camera': '50MP Wide + 10MP 3x Telephoto + 12MP Ultra-Wide',
      'Galaxy AI': 'Live Translate, Circle to Search, Generative Edit',
      'Battery': '4000mAh Super Fast Charging 2.0'
    },
    description: 'Flagship Samsung Galaxy S25 256GB with Galaxy AI intelligence, Snapdragon 8 Gen 4 processor, ProVisual camera engine, and Armor Aluminum frame.'
  },
  {
    id: 'prod-samsung-a36-256',
    name: 'Samsung Galaxy A36 256GB',
    sku: 'SAM-A36-256',
    price: 379.99,
    originalPrice: 429.99,
    discountPercent: 12,
    cost: 230.00,
    stock: 55,
    category: 'Samsung Phones',
    brand: 'Samsung',
    model: 'Galaxy A36',
    location: 'Store Shelf',
    reorderPoint: 12,
    barcode: '8806091003367',
    ean: '8806091003367',
    upc: '0880609100336',
    qrCode: 'QR-SAM-A36-256',
    barcodes: [
      { type: 'EAN', code: '8806091003367', isPrimary: true },
      { type: 'UPC', code: '0880609100336' }
    ],
    isBestSeller: true,
    rating: 4.7,
    reviewCount: 88,
    variants: [
      { sku: 'SAM-A36-256-BLK', title: 'Awesome Graphite / 256GB', color: 'Awesome Graphite', size: '256GB', model: 'Galaxy A36', stock: 30, price: 379.99, cost: 230.00, barcode: '8806091003368', options: { Storage: '256GB', RAM: '8GB', Color: 'Awesome Graphite' } },
      { sku: 'SAM-A36-256-VLT', title: 'Awesome Violet / 256GB', color: 'Awesome Violet', size: '256GB', model: 'Galaxy A36', stock: 25, price: 379.99, cost: 230.00, barcode: '8806091003369', options: { Storage: '256GB', RAM: '8GB', Color: 'Awesome Violet' } }
    ],
    salesCount: 160,
    imageUrl: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&q=80&w=600'
    ],
    specifications: {
      'Storage': '256GB Expandable MicroSD',
      'RAM': '8GB LPDDR4X',
      'Display': '6.6-inch Super AMOLED 120Hz',
      'Processor': 'Snapdragon 6 Gen 3',
      'Camera': '50MP OIS Main + 8MP Ultra-Wide',
      'Battery': '5000mAh 25W Charging'
    },
    description: 'Samsung Galaxy A36 256GB value smartphone with 6.6" 120Hz AMOLED screen, IP67 dust/water resistance, 5000mAh battery, and Knox Vault security.'
  },
  {
    id: 'prod-samsung-tv-55',
    name: 'Samsung TV 55" Neo QLED 4K Smart TV',
    sku: 'SAM-TV-55-QLED',
    price: 1299.99,
    originalPrice: 1499.99,
    discountPercent: 13,
    cost: 850.00,
    stock: 18,
    category: 'TV & Home Theater',
    brand: 'Samsung',
    model: 'QN90D Neo QLED',
    location: 'Warehouse A-01',
    reorderPoint: 5,
    barcode: '8806091005500',
    ean: '8806091005500',
    upc: '0880609100550',
    qrCode: 'QR-SAM-TV-55',
    barcodes: [
      { type: 'EAN', code: '8806091005500', isPrimary: true }
    ],
    isFeatured: true,
    rating: 4.9,
    reviewCount: 142,
    salesCount: 88,
    imageUrl: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&q=80&w=600'
    ],
    specifications: {
      'Display': '55-inch Neo QLED 4K HDR10+',
      'Refresh Rate': '144Hz FreeSync Premium Pro',
      'Audio': 'Dolby Atmos 60W 4.2.2 Speaker System',
      'OS': 'Tizen Smart TV Hub'
    },
    variants: [],
    description: 'Samsung TV 55-inch Neo QLED 4K Smart TV featuring Quantum Matrix Technology, NQ4 AI Gen2 Processor, and Motion Xcelerator 144Hz.'
  },
  {
    id: 'prod-samsung-charger-45w',
    name: 'Samsung Charger 45W Super Fast Power Adapter',
    sku: 'SAM-CHG-45W',
    price: 39.99,
    originalPrice: 49.99,
    discountPercent: 20,
    cost: 15.00,
    stock: 120,
    category: 'Accessories',
    brand: 'Samsung',
    model: 'EP-T4510',
    location: 'Shelf-C04',
    reorderPoint: 25,
    barcode: '8806091004510',
    ean: '8806091004510',
    upc: '0880609100451',
    qrCode: 'QR-SAM-CHG-45W',
    barcodes: [
      { type: 'EAN', code: '8806091004510', isPrimary: true }
    ],
    isBestSeller: true,
    rating: 4.8,
    reviewCount: 310,
    salesCount: 540,
    imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&q=80&w=600'
    ],
    specifications: {
      'Power Output': '45W USB-C Power Delivery 3.0 PPS',
      'Cable': '5A USB-C to USB-C Cable (1.8m Included)',
      'Compatibility': 'Galaxy S25/S24, Galaxy A56/A36, Galaxy Tab'
    },
    variants: [],
    description: 'Official Samsung Charger 45W Super Fast Wall Charger with 5A Type-C cable for high-speed charging.'
  },
  {
    id: 'prod-apple-iphone-16-pro',
    name: 'Apple iPhone 16 Pro 256GB',
    sku: 'APL-IP16P-256',
    price: 1099.99,
    cost: 720.00,
    stock: 25,
    category: 'Phones',
    brand: 'Apple',
    model: 'iPhone 16 Pro',
    location: 'Vault-A01',
    reorderPoint: 5,
    barcode: '194253001123',
    qrCode: 'QR-APL-IP16P-256',
    isNewArrival: true,
    isFeatured: true,
    rating: 4.9,
    reviewCount: 310,
    variants: [
      { sku: 'APL-IP16P-128', title: '128GB Titanium Black', size: '128GB', color: 'Titanium Black', stock: 10, price: 999.99, options: { Storage: '128GB', RAM: '8GB', Color: 'Black' } },
      { sku: 'APL-IP16P-256', title: '256GB Titanium Natural', size: '256GB', color: 'Titanium Natural', stock: 15, price: 1099.99, options: { Storage: '256GB', RAM: '8GB', Color: 'Titanium' } },
      { sku: 'APL-IP16P-512', title: '512GB Titanium White', size: '512GB', color: 'Titanium White', stock: 8, price: 1299.99, options: { Storage: '512GB', RAM: '8GB', Color: 'White' } }
    ],
    salesCount: 420,
    imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=600',
    specifications: {
      'Storage': '256GB NVMe',
      'RAM': '8GB Unified',
      'Display': '6.3-inch Super Retina XDR OLED 120Hz ProMotion',
      'Processor': 'A18 Pro Bionic',
      'Camera': '48MP Fusion + 48MP Ultra-Wide + 12MP 5x Telephoto',
      'Battery': 'Up to 27 hours video playback'
    },
    description: 'Apple iPhone 16 Pro with grade-5 titanium design, Camera Control button, 4K 120 fps Dolby Vision recording, and A18 Pro chip.'
  },
  {
    id: 'prod-xiaomi-14-ultra',
    name: 'Xiaomi 14 Ultra 512GB',
    sku: 'XIA-14U-512',
    price: 899.99,
    cost: 590.00,
    stock: 18,
    category: 'Phones',
    brand: 'Xiaomi',
    model: 'Xiaomi 14 Ultra',
    location: 'Vault-A02',
    reorderPoint: 4,
    barcode: '694181273901',
    qrCode: 'QR-XIA-14U-512',
    isNewArrival: true,
    rating: 4.8,
    reviewCount: 95,
    variants: [
      { sku: 'XIA-14U-256', title: '256GB / 12GB RAM Black', size: '256GB', color: 'Black', stock: 8, price: 799.99, options: { Storage: '256GB', RAM: '12GB', Color: 'Black' } },
      { sku: 'XIA-14U-512', title: '512GB / 12GB RAM White', size: '512GB', color: 'White', stock: 10, price: 899.99, options: { Storage: '512GB', RAM: '12GB', Color: 'White' } }
    ],
    salesCount: 140,
    imageUrl: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&q=80&w=600',
    specifications: {
      'Storage': '512GB UFS 4.0',
      'RAM': '12GB LPDDR5X',
      'Display': '6.73-inch WQHD+ AMOLED 120Hz',
      'Processor': 'Snapdragon 8 Gen 3',
      'Camera': 'Leica Quad Camera System 50MP 1-inch sensor',
      'Battery': '5000mAh 90W HyperCharge'
    },
    description: 'Xiaomi 14 Ultra photography flagship powered by Leica optical quad lenses, 1-inch main sensor, Snapdragon 8 Gen 3 processor, and 90W fast charging.'
  },
  {
    id: 'prod-xiaomi-redmi-13',
    name: 'Xiaomi Redmi Note 13 128GB',
    sku: 'XIA-RD13-128',
    price: 199.99,
    cost: 110.00,
    stock: 40,
    category: 'Phones',
    brand: 'Xiaomi',
    model: 'Redmi Note 13',
    location: 'Shelf-B03',
    reorderPoint: 10,
    barcode: '694181273902',
    qrCode: 'QR-XIA-RD13-128',
    isBestSeller: true,
    rating: 4.6,
    reviewCount: 180,
    variants: [
      { sku: 'XIA-RD13-64', title: '64GB / 4GB RAM Black', size: '64GB', color: 'Midnight Black', stock: 15, price: 169.99, options: { Storage: '64GB', RAM: '4GB', Color: 'Black' } },
      { sku: 'XIA-RD13-128', title: '128GB / 8GB RAM Blue', size: '128GB', color: 'Ocean Blue', stock: 25, price: 199.99, options: { Storage: '128GB', RAM: '8GB', Color: 'Blue' } }
    ],
    salesCount: 290,
    imageUrl: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&q=80&w=600',
    specifications: {
      'Storage': '128GB Expandable',
      'RAM': '4GB / 8GB',
      'Display': '6.67-inch FHD+ AMOLED 120Hz',
      'Processor': 'Snapdragon 685',
      'Camera': '108MP Triple Camera',
      'Battery': '5000mAh 33W Fast Charging'
    },
    description: 'Xiaomi Redmi Note 13 with 108MP triple camera, 120Hz FHD+ AMOLED display, and 5000mAh long battery life.'
  },
  {
    id: 'prod-nike-air-zoom-runner',
    name: 'Nike Air Zoom Pegasus 41',
    sku: 'NKE-AZP-41',
    price: 139.99,
    cost: 65.00,
    stock: 42,
    category: 'Shoes',
    brand: 'Nike',
    model: 'Pegasus 41',
    location: 'Footwear Rack A',
    reorderPoint: 10,
    barcode: '091201928301',
    qrCode: 'QR-NKE-AZP-41',
    isNewArrival: true,
    isBestSeller: true,
    rating: 4.8,
    reviewCount: 215,
    variants: [
      { sku: 'NKE-AZP-41-BLK-9', size: 'US 9', color: 'Black', stock: 12, price: 139.99, options: { Size: 'US 9', Color: 'Black', Gender: 'Men' } },
      { sku: 'NKE-AZP-41-WHT-10', size: 'US 10', color: 'White', stock: 15, price: 139.99, options: { Size: 'US 10', Color: 'White', Gender: 'Men' } },
      { sku: 'NKE-AZP-41-RED-8', size: 'US 8', color: 'Red', stock: 15, price: 139.99, options: { Size: 'US 8', Color: 'Red', Gender: 'Women' } }
    ],
    salesCount: 380,
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600',
    specifications: {
      'Size': 'US 8, US 9, US 10, US 11',
      'Color': 'Black, White, Red',
      'Gender': 'Men, Women, Unisex',
      'Upper': 'Engineered Breathable Mesh',
      'Cushioning': 'ReactX Foam with Dual Zoom Air Units',
      'Outsole': 'Waffle-inspired Rubber Traction'
    },
    description: 'Nike Air Zoom Pegasus 41 lightweight high-responsive daily running shoe engineered with ReactX foam and dual Zoom Air cushioning.'
  },
  {
    id: 'prod-adidas-ultraboost-5',
    name: 'Adidas Ultraboost Light 5',
    sku: 'ADI-UBL-5',
    price: 189.99,
    cost: 90.00,
    stock: 28,
    category: 'Shoes',
    brand: 'Adidas',
    model: 'Ultraboost Light',
    location: 'Footwear Rack B',
    reorderPoint: 8,
    barcode: '091201928302',
    qrCode: 'QR-ADI-UBL-5',
    isFeatured: true,
    rating: 4.9,
    reviewCount: 165,
    variants: [
      { sku: 'ADI-UBL-5-WHT-8', size: 'US 8', color: 'White', stock: 10, options: { Size: 'US 8', Color: 'White', Gender: 'Unisex' } },
      { sku: 'ADI-UBL-5-BLK-10', size: 'US 10', color: 'Black', stock: 12, options: { Size: 'US 10', Color: 'Black', Gender: 'Men' } },
      { sku: 'ADI-UBL-5-BLU-11', size: 'US 11', color: 'Blue', stock: 6, options: { Size: 'US 11', Color: 'Blue', Gender: 'Men' } }
    ],
    salesCount: 240,
    imageUrl: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&q=80&w=600',
    specifications: {
      'Size': 'US 7, US 8, US 10, US 11',
      'Color': 'White, Black, Blue',
      'Gender': 'Men, Women, Unisex',
      'Upper': 'Primeknit+ Textile Upper',
      'Midsole': 'Light BOOST Energy Foam',
      'Outsole': 'Continental™ Better Rubber'
    },
    description: 'Adidas Ultraboost Light 5 featuring Light BOOST technology delivering ultimate energy return, Primeknit upper, and Continental Rubber grip.'
  },
  {
    id: 'prod-puma-rsx-trail',
    name: 'Puma RS-X Efekt Trail Sneakers',
    sku: 'PMA-RSX-TR',
    price: 119.99,
    cost: 50.00,
    stock: 35,
    category: 'Shoes',
    brand: 'Puma',
    model: 'RS-X Efekt',
    location: 'Footwear Rack C',
    reorderPoint: 8,
    barcode: '091201928303',
    qrCode: 'QR-PMA-RSX-TR',
    isNewArrival: true,
    rating: 4.7,
    reviewCount: 78,
    variants: [
      { sku: 'PMA-RSX-7', size: 'US 7', color: 'Red', stock: 10, options: { Size: 'US 7', Color: 'Red', Gender: 'Women' } },
      { sku: 'PMA-RSX-9', size: 'US 9', color: 'Blue', stock: 15, options: { Size: 'US 9', Color: 'Blue', Gender: 'Men' } },
      { sku: 'PMA-RSX-11', size: 'US 11', color: 'Black', stock: 10, options: { Size: 'US 11', Color: 'Black', Gender: 'Men' } }
    ],
    salesCount: 110,
    imageUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=600',
    specifications: {
      'Size': 'US 7, US 8, US 9, US 11',
      'Color': 'Red, Blue, Black',
      'Gender': 'Men, Women, Unisex',
      'Style': 'Futuristic Chunky Retro Runner'
    },
    description: 'Puma RS-X Efekt Trail retro sneakers combining bold angular design, comfortable PU midsole, and outdoor grip outsole.'
  },
  {
    id: 'prod-reebok-club-c',
    name: 'Reebok Club C 85 Vintage Sneakers',
    sku: 'RBK-CLC-85',
    price: 89.99,
    cost: 38.00,
    stock: 50,
    category: 'Shoes',
    brand: 'Reebok',
    model: 'Club C 85',
    location: 'Footwear Rack D',
    reorderPoint: 10,
    barcode: '091201928304',
    qrCode: 'QR-RBK-CLC-85',
    isBestSeller: true,
    rating: 4.8,
    reviewCount: 340,
    variants: [
      { sku: 'RBK-CLC-8', size: 'US 8', color: 'White', stock: 20, options: { Size: 'US 8', Color: 'White', Gender: 'Unisex' } },
      { sku: 'RBK-CLC-10', size: 'US 10', color: 'White', stock: 30, options: { Size: 'US 10', Color: 'White', Gender: 'Unisex' } }
    ],
    salesCount: 520,
    imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=600',
    specifications: {
      'Size': 'US 7, US 8, US 9, US 10, US 11',
      'Color': 'White, Off-White',
      'Gender': 'Unisex',
      'Material': 'Soft Garment Leather Upper'
    },
    description: 'Classic Reebok Club C 85 vintage leather court shoes with soft leather upper, EVA midsole, and timeless clean aesthetic.'
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-201',
    name: 'Sarah Connor',
    email: 'sarah.c@skyline.org',
    phone: '+1 (555) 321-9876',
    loyaltyPoints: 340,
    segment: 'VIP',
    notes: 'Prefers carbon-neutral packaging. Key accounts manager.',
    purchaseHistoryIds: ['ord-5001', 'ord-5004']
  },
  {
    id: 'cust-202',
    name: 'Miles Dyson',
    email: 'mdyson@cyberdyne.io',
    phone: '+1 (555) 789-1234',
    loyaltyPoints: 120,
    segment: 'Regular',
    notes: 'Responsive to tech-focused marketing lists.',
    purchaseHistoryIds: ['ord-5002']
  },
  {
    id: 'cust-203',
    name: 'John Connor',
    email: 'jconnor@resistance.net',
    phone: '+1 (555) 999-0001',
    loyaltyPoints: 15,
    segment: 'New',
    notes: 'First-time retail store buyer.',
    purchaseHistoryIds: ['ord-5003']
  },
  {
    id: 'cust-204',
    name: 'Marcus Wright',
    email: 'm.wright@projectangel.com',
    phone: '+1 (555) 444-2311',
    loyaltyPoints: 0,
    segment: 'Inactive',
    notes: 'No transactions registered in the last 120 days.',
    purchaseHistoryIds: []
  }
];

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'staff-01',
    name: 'Elena Rostova',
    email: 'elena.r@enterprise.com',
    role: 'Super Admin',
    department: 'Executive IT & Infrastructure',
    phone: '+1 (555) 019-2831',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150',
    pin: '1234',
    status: 'Active',
    lastActive: 'Just now',
    notes: 'Primary system root administrator. Master access.'
  },
  {
    id: 'staff-02',
    name: 'Sarah Jenkins',
    email: 'sarah.j@enterprise.com',
    role: 'Business Owner',
    department: 'Executive Management',
    phone: '+1 (555) 014-9982',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150',
    pin: '9900',
    status: 'Active',
    lastActive: '10 mins ago',
    notes: 'Managing partner and principal business executive.'
  },
  {
    id: 'staff-03',
    name: 'Marcus Aurelius',
    email: 'marcus.a@enterprise.com',
    role: 'Store Manager',
    department: 'Retail Store Operations',
    phone: '+1 (555) 018-4421',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
    pin: '4321',
    status: 'Active',
    lastActive: '25 mins ago',
    notes: 'Floor manager in charge of POS terminals and on-site staff.'
  },
  {
    id: 'staff-04',
    name: 'David Chen',
    email: 'david.c@enterprise.com',
    role: 'Inventory Manager',
    department: 'Merchandising & Catalog',
    phone: '+1 (555) 012-7711',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150',
    pin: '3344',
    status: 'Active',
    lastActive: '1 hour ago',
    notes: 'Controls product SKU catalog, margins, and reorder levels.'
  },
  {
    id: 'staff-05',
    name: 'Cody Sparks',
    email: 'cody.s@enterprise.com',
    role: 'Warehouse Manager',
    department: 'Logistics & Fulfillment Hub',
    phone: '+1 (555) 016-3399',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
    pin: '2222',
    status: 'Active',
    lastActive: '45 mins ago',
    notes: 'Dock master managing freight receiving and stock transfers.'
  },
  {
    id: 'staff-06',
    name: 'Jessie Quick',
    email: 'jessie.q@enterprise.com',
    role: 'Cashier',
    department: 'Front of House POS',
    phone: '+1 (555) 011-8844',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
    pin: '1111',
    status: 'Active',
    lastActive: '5 mins ago',
    notes: 'Lead cashier on register terminal #01.'
  },
  {
    id: 'staff-07',
    name: 'Sam Rivera',
    email: 'sam.r@enterprise.com',
    role: 'Sales Manager',
    department: 'Sales & Customer Retention',
    phone: '+1 (555) 019-5566',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150',
    pin: '5566',
    status: 'Active',
    lastActive: '2 hours ago',
    notes: 'Authorizes sales refunds, discount overrides, and CRM campaigns.'
  },
  {
    id: 'staff-08',
    name: 'Alex Thorne',
    email: 'alex.t@enterprise.com',
    role: 'Purchasing Officer',
    department: 'Procurement & Supply Chain',
    phone: '+1 (555) 017-6622',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=150',
    pin: '7788',
    status: 'Active',
    lastActive: '3 hours ago',
    notes: 'Handles vendor procurement contracts and PO approvals.'
  },
  {
    id: 'staff-09',
    name: 'Priya Patel',
    email: 'priya.p@enterprise.com',
    role: 'Accountant',
    department: 'Finance & Tax Compliance',
    phone: '+1 (555) 013-4499',
    avatar: 'https://images.unsplash.com/photo-1534751516642-a171edd2521d?auto=format&fit=crop&q=80&w=150',
    pin: '8899',
    status: 'Active',
    lastActive: 'Yesterday',
    notes: 'Financial comptroller managing tax invoices, P&L, and audit ledgers.'
  },
  {
    id: 'staff-10',
    name: 'Maya Lin',
    email: 'maya.l@enterprise.com',
    role: 'E-commerce Manager',
    department: 'Digital Commerce & Marketing',
    phone: '+1 (555) 015-2233',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150',
    pin: '6677',
    status: 'Active',
    lastActive: '30 mins ago',
    notes: 'Oversees web storefront merchandising, online orders, and fulfillment.'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-5001',
    date: '2026-08-09T10:15:30-07:00',
    items: [
      {
        productId: 'prod-101',
        productName: 'AeroSound Pro ANC Headphones',
        quantity: 1,
        price: 249.99,
        variantSku: 'EL-HP-001-BLK'
      },
      {
        productId: 'prod-105',
        productName: 'HydroLock Steel Flask 1L',
        quantity: 2,
        price: 39.99,
        variantSku: 'FT-FK-023-NVY'
      }
    ],
    subtotal: 329.97,
    tax: 26.40,
    discount: 15.00,
    total: 341.37,
    paymentMethod: 'Credit/Debit Card',
    channel: 'In-Store POS',
    customerId: 'cust-201',
    customerName: 'Sarah Connor',
    status: 'Completed'
  },
  {
    id: 'ord-5002',
    date: '2026-08-10T14:45:00-07:00',
    items: [
      {
        productId: 'prod-102',
        productName: 'FitTrack V4 Smartwatch',
        quantity: 1,
        price: 189.99,
        variantSku: 'EL-SW-004-CHR'
      }
    ],
    subtotal: 189.99,
    tax: 15.20,
    discount: 0.00,
    total: 205.19,
    paymentMethod: 'Mobile Pay',
    channel: 'Online Storefront',
    customerId: 'cust-202',
    customerName: 'Miles Dyson',
    status: 'Completed'
  },
  {
    id: 'ord-5003',
    date: '2026-08-11T09:30:15-07:00',
    items: [
      {
        productId: 'prod-103',
        productName: 'Merino Wool Trail Socks',
        quantity: 4,
        price: 24.99,
        variantSku: 'AP-SK-012-M'
      },
      {
        productId: 'prod-106',
        productName: 'Minimalist Walnut Desk Organizer',
        quantity: 1,
        price: 69.99,
        variantSku: 'OF-DO-008'
      }
    ],
    subtotal: 169.95,
    tax: 13.60,
    discount: 10.00,
    total: 173.55,
    paymentMethod: 'Installments (Klarna/Afterpay)',
    channel: 'Mobile App',
    customerId: 'cust-203',
    customerName: 'John Connor',
    status: 'Completed'
  },
  {
    id: 'ord-5004',
    date: '2026-08-12T11:55:00-07:00',
    items: [
      {
        productId: 'prod-104',
        productName: 'Apex Ergonomic Mesh Chair',
        quantity: 1,
        price: 349.99,
        variantSku: 'HO-CH-099-STD'
      }
    ],
    subtotal: 349.99,
    tax: 28.00,
    discount: 0.00,
    total: 377.99,
    paymentMethod: 'Bank Transfer',
    channel: 'In-Store POS',
    customerId: 'cust-201',
    customerName: 'Sarah Connor',
    status: 'Completed'
  },
  {
    id: 'ord-5005',
    date: '2026-08-13T16:20:00-07:00',
    items: [
      {
        productId: 'prod-101',
        productName: 'AeroSound Pro ANC Headphones',
        quantity: 2,
        price: 249.99,
        variantSku: 'EL-HP-001-SLV'
      },
      {
        productId: 'prod-105',
        productName: 'HydroLock Steel Flask 1L',
        quantity: 1,
        price: 39.99,
        variantSku: 'FT-FK-023-WHT'
      }
    ],
    subtotal: 539.97,
    tax: 43.20,
    discount: 25.00,
    total: 558.17,
    paymentMethod: 'Credit/Debit Card',
    channel: 'Online Storefront',
    customerId: 'cust-204',
    customerName: 'Kyle Reese',
    status: 'Completed'
  },
  {
    id: 'ord-5006',
    date: '2026-08-14T13:10:00-07:00',
    items: [
      {
        productId: 'prod-103',
        productName: 'Merino Wool Trail Socks',
        quantity: 6,
        price: 24.99,
        variantSku: 'AP-SK-012-L'
      },
      {
        productId: 'prod-104',
        productName: 'Apex Ergonomic Mesh Chair',
        quantity: 1,
        price: 349.99,
        variantSku: 'HO-CH-099-STD'
      }
    ],
    subtotal: 499.93,
    tax: 39.99,
    discount: 30.00,
    total: 509.92,
    paymentMethod: 'Credit/Debit Card',
    channel: 'In-Store POS',
    customerId: 'cust-202',
    customerName: 'Miles Dyson',
    status: 'Completed'
  },
  {
    id: 'ord-5007',
    date: '2026-08-15T09:40:00-07:00',
    items: [
      {
        productId: 'prod-102',
        productName: 'FitTrack V4 Smartwatch',
        quantity: 2,
        price: 189.99,
        variantSku: 'EL-SW-004-CHR'
      },
      {
        productId: 'prod-106',
        productName: 'Minimalist Walnut Desk Organizer',
        quantity: 2,
        price: 69.99,
        variantSku: 'OF-DO-008'
      }
    ],
    subtotal: 519.96,
    tax: 41.60,
    discount: 20.00,
    total: 541.56,
    paymentMethod: 'Mobile Pay',
    channel: 'Online Storefront',
    customerId: 'cust-201',
    customerName: 'Sarah Connor',
    status: 'Completed'
  },
  {
    id: 'ord-5008',
    orderNumber: 'ORD-EC-98214',
    date: '2026-08-21T18:30:00-07:00',
    items: [
      {
        productId: 'prod-101',
        productName: 'AeroSound Pro ANC Headphones',
        quantity: 1,
        price: 249.99,
        variantSku: 'EL-HP-001-BLK',
        variantName: 'Matte Black'
      },
      {
        productId: 'prod-105',
        productName: 'HydroLock Steel Flask 1L',
        quantity: 1,
        price: 39.99,
        variantSku: 'FT-FK-023-NVY',
        variantName: 'Midnight Navy'
      }
    ],
    subtotal: 289.98,
    tax: 23.20,
    discount: 0.00,
    total: 313.18,
    paymentMethod: 'Credit/Debit Card',
    channel: 'Online Storefront',
    customerId: 'cust-201',
    customerName: 'Sarah Connor',
    customerEmail: 'sarah.c@skyline.org',
    deliveryAddress: '1440 Ocean Blvd, Suite 300, Los Angeles, CA 90028',
    trackingNumber: 'TRK-FEDEX-99214',
    deliveryStatus: 'Delivered',
    deliveredDate: '2026-08-22',
    deliveredTimestamp: Date.now() - (14 * 3600 * 1000), // Delivered 14 hours ago (34h remaining in 48h window)
    awaitingReceiptExpiry: Date.now() + (34 * 3600 * 1000),
    awaitingReceiptUntil: new Date(Date.now() + (34 * 3600 * 1000)).toISOString(),
    receiptConfirmed: false,
    status: 'Awaiting Receipt Confirmation',
    notes: 'Delivered to front porch reception. 48-hour customer receipt confirmation window in progress.'
  },
  {
    id: 'ord-5009',
    orderNumber: 'ORD-EC-84920',
    date: '2026-08-20T11:15:00-07:00',
    items: [
      {
        productId: 'prod-104',
        productName: 'Apex Ergonomic Mesh Chair',
        quantity: 1,
        price: 349.99,
        variantSku: 'HO-CH-099-STD',
        variantName: 'Carbon Grey'
      }
    ],
    subtotal: 349.99,
    tax: 28.00,
    discount: 0.00,
    total: 377.99,
    paymentMethod: 'Credit/Debit Card',
    channel: 'Online Storefront',
    customerId: 'cust-202',
    customerName: 'Miles Dyson',
    customerEmail: 'miles.d@cyberdyne.tech',
    deliveryAddress: '214 Technology Square, Palo Alto, CA 94301',
    trackingNumber: 'TRK-UPS-84920',
    deliveryStatus: 'Delivered',
    deliveredDate: '2026-08-21',
    deliveredTimestamp: Date.now() - (28 * 3600 * 1000),
    status: 'Refund Requested',
    refundRequested: true,
    refundRequestDetails: {
      rmaNumber: 'RMA-84920',
      reason: 'Damaged or broken in transit',
      resolution: 'Full Refund to Original Payment',
      notes: 'The right armrest locking lever was cracked upon opening the courier box. Please issue a refund.',
      requestedAt: new Date(Date.now() - (3 * 3600 * 1000)).toISOString(),
      status: 'Pending Review',
      photos: [
        'https://images.unsplash.com/photo-1580481077197-98c4d38c4c0e?auto=format&fit=crop&q=80&w=600'
      ]
    },
    notes: 'Customer filed RMA dispute: Damaged or broken in transit. Action required by Admin.'
  }
];

export const INITIAL_ADMIN_NOTIFICATIONS: AdminNotification[] = [
  {
    id: 'notif-rma-001',
    type: 'refund_request',
    title: '🚨 Customer Refund Request: RMA-84920',
    message: 'Miles Dyson requested Full Refund to Original Payment ($377.99) for Order #ORD-EC-84920. Reason: Damaged or broken in transit.',
    orderId: 'ord-5009',
    orderNumber: 'ORD-EC-84920',
    customerId: 'cust-202',
    customerName: 'Miles Dyson',
    amount: 377.99,
    rmaNumber: 'RMA-84920',
    reason: 'Damaged or broken in transit',
    resolution: 'Full Refund to Original Payment',
    timestamp: new Date(Date.now() - (3 * 3600 * 1000)).toISOString(),
    read: false,
    priority: 'urgent',
    actionUrl: '/invoices?order=ord-5009'
  },
  {
    id: 'notif-receipt-002',
    type: 'order_delivered',
    title: '📦 Order Delivered • 48h Window Active',
    message: 'Order #ORD-EC-98214 was delivered to Sarah Connor. Flagged as Awaiting Receipt Confirmation (34h remaining).',
    orderId: 'ord-5008',
    orderNumber: 'ORD-EC-98214',
    customerId: 'cust-201',
    customerName: 'Sarah Connor',
    amount: 313.18,
    timestamp: new Date(Date.now() - (14 * 3600 * 1000)).toISOString(),
    read: false,
    priority: 'medium',
    actionUrl: '/invoices?order=ord-5008'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-001',
    timestamp: '2026-07-14T08:30:00-07:00',
    staffName: 'Elena Rostova',
    role: 'Admin',
    action: 'System Boot & DB Connect',
    module: 'User Management',
    details: 'Primary multi-location synchronization validated successfully.'
  },
  {
    id: 'log-002',
    timestamp: '2026-07-14T09:15:22-07:00',
    staffName: 'Cody Sparks',
    role: 'Warehouse Staff',
    action: 'Stock Adjustment',
    module: 'Inventory',
    details: 'Added 50 units of Merino Wool Socks (AP-SK-012-M) to Warehouse Rack B4.'
  },
  {
    id: 'log-003',
    timestamp: '2026-07-14T10:16:11-07:00',
    staffName: 'Jessie Quick',
    role: 'Cashier',
    action: 'POS Sale Processed',
    module: 'POS',
    details: 'Processed order ord-5001 total $341.37. Applied COUPON_15 promo.'
  },
  {
    id: 'log-004',
    timestamp: '2026-07-15T11:00:00-07:00',
    staffName: 'Marcus Aurelius',
    role: 'Manager',
    action: 'Pricing Configuration',
    module: 'Inventory',
    details: 'Configured FitTrack V4 Smartwatch price from $199.99 to $189.99.'
  }
];

export const INITIAL_REVIEWS: ProductReview[] = [
  {
    id: 'rev-101-01',
    productId: 'prod-101',
    productName: 'AeroSound Pro ANC Headphones',
    variantSku: 'EL-HP-001-BLK',
    variantName: 'Matte Black',
    orderId: 'ord-5001',
    customerId: 'cust-201',
    userName: 'Sarah Connor',
    userEmail: 'sarah.c@skyline.org',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150',
    customer: {
      id: 'cust-201',
      name: 'Sarah Connor',
      email: 'sarah.c@skyline.org',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150',
      location: 'Los Angeles, CA'
    },
    rating: 5,
    title: 'Flawless Active Noise Cancellation and 40h Battery',
    comment: 'The active noise cancellation on these headphones is extraordinary. I used them on a 9-hour transatlantic flight and barely heard any engine hum. The leatherette memory foam earcups stay breathable even after several hours of listening.',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&q=80&w=600'
    ],
    date: '2026-08-10',
    verifiedPurchase: true,
    status: 'approved',
    helpfulCount: 24,
    adminResponse: {
      text: 'Thank you so much Sarah! We are thrilled to hear the AeroSound Pro made your flight peaceful. Safe travels!',
      respondedAt: '2026-08-11T10:30:00Z',
      responderName: 'Maya Lin',
      responderRole: 'E-commerce Manager'
    }
  },
  {
    id: 'rev-101-02',
    productId: 'prod-101',
    productName: 'AeroSound Pro ANC Headphones',
    variantSku: 'EL-HP-001-SLV',
    variantName: 'Lunar Silver',
    orderId: 'ord-5005',
    customerId: 'cust-202',
    userName: 'Miles Dyson',
    userEmail: 'mdyson@cyberdyne.io',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
    customer: {
      id: 'cust-202',
      name: 'Miles Dyson',
      email: 'mdyson@cyberdyne.io',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
      location: 'San Jose, CA'
    },
    rating: 5,
    title: 'Crystal Clear Audio Engineering',
    comment: 'Soundstage is crisp with punchy, controlled bass. Bluetooth multipoint switching between my laptop and workstation is seamless.',
    images: [
      'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&q=80&w=600'
    ],
    date: '2026-08-14',
    verifiedPurchase: true,
    status: 'approved',
    helpfulCount: 11
  },
  {
    id: 'rev-nike-01',
    productId: 'prod-nike-am270',
    productName: 'Nike Air Max 270',
    variantSku: 'NIKE-AM270-BLK-42',
    variantName: 'Black / Size 42',
    orderId: 'ord-5006',
    customerId: 'cust-203',
    userName: 'John Connor',
    userEmail: 'jconnor@resistance.net',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
    customer: {
      id: 'cust-203',
      name: 'John Connor',
      email: 'jconnor@resistance.net',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
      location: 'Seattle, WA'
    },
    rating: 5,
    title: 'True to Size & Maximum Cushioning',
    comment: 'The 270 air heel unit provides phenomenal rebound for urban walking. Clean lines, snug collar fit, and fast shipping!',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&q=80&w=600'
    ],
    date: '2026-08-15',
    verifiedPurchase: true,
    status: 'approved',
    helpfulCount: 18,
    adminResponse: {
      text: 'Thanks for the review John! Enjoy the kicks and let us know if you need anything else.',
      respondedAt: '2026-08-16T09:15:00Z',
      responderName: 'Sarah Jenkins',
      responderRole: 'Store Operations'
    }
  },
  {
    id: 'rev-nike-02',
    productId: 'prod-nike-am270',
    productName: 'Nike Air Max 270',
    variantSku: 'NIKE-AM270-WHT-41',
    variantName: 'White / Size 41',
    userName: 'Kyle Reese',
    userEmail: 'kyle.r@guest.org',
    customer: {
      name: 'Kyle Reese',
      email: 'kyle.r@guest.org'
    },
    rating: 4,
    title: 'Looks sharp, runs slightly narrow',
    comment: 'Great aesthetics and lightweight feel. If you have wider feet, recommend going a half size up.',
    images: [],
    date: '2026-08-16',
    verifiedPurchase: false, // Not verified: purchased elsewhere or guest
    status: 'approved',
    helpfulCount: 8
  },
  {
    id: 'rev-102-01',
    productId: 'prod-102',
    productName: 'FitTrack V4 Smartwatch',
    variantSku: 'EL-SW-004-CHR',
    variantName: 'Graphite / Silicone',
    orderId: 'ord-5002',
    customerId: 'cust-202',
    userName: 'Miles Dyson',
    userEmail: 'mdyson@cyberdyne.io',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
    customer: {
      id: 'cust-202',
      name: 'Miles Dyson',
      email: 'mdyson@cyberdyne.io',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
      location: 'San Jose, CA'
    },
    rating: 5,
    title: 'Precision Biometrics & Great AMOLED Screen',
    comment: 'Heart rate and SpO2 sensors are spot-on during high intensity interval workouts. Battery easily lasts 6 full days on always-on display.',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600'
    ],
    date: '2026-08-12',
    verifiedPurchase: true,
    status: 'approved',
    helpfulCount: 15
  },
  {
    id: 'rev-103-01',
    productId: 'prod-103',
    productName: 'Merino Wool Trail Socks',
    variantSku: 'AP-SK-012-M',
    variantName: 'Medium (US 8-10)',
    orderId: 'ord-5003',
    customerId: 'cust-203',
    userName: 'John Connor',
    userEmail: 'jconnor@resistance.net',
    customer: {
      id: 'cust-203',
      name: 'John Connor',
      email: 'jconnor@resistance.net'
    },
    rating: 5,
    title: 'Zero Blisters on a 25-mile trek',
    comment: 'Top tier wool blend with targeted arch compression. Keeps feet dry in cold and heat alike.',
    images: [],
    date: '2026-08-13',
    verifiedPurchase: true,
    status: 'approved',
    helpfulCount: 9
  },
  {
    id: 'rev-104-01',
    productId: 'prod-104',
    productName: 'Apex Ergonomic Mesh Chair',
    variantSku: 'HO-CH-099-STD',
    variantName: 'Standard Onyx',
    orderId: 'ord-5004',
    customerId: 'cust-201',
    userName: 'Sarah Connor',
    userEmail: 'sarah.c@skyline.org',
    customer: {
      id: 'cust-201',
      name: 'Sarah Connor',
      email: 'sarah.c@skyline.org'
    },
    rating: 5,
    title: 'Cured my lumbar discomfort within 3 days',
    comment: 'Adjustable 4D armrests, dynamic lumbar cradle, and silent caster wheels. Highly worth the investment for remote work.',
    images: [
      'https://images.unsplash.com/photo-1580481077180-2a813d1000bb?auto=format&fit=crop&q=80&w=600'
    ],
    date: '2026-08-14',
    verifiedPurchase: true,
    status: 'approved',
    helpfulCount: 31
  },
  {
    id: 'rev-pending-01',
    productId: 'prod-105',
    productName: 'HydroLock Steel Flask 1L',
    variantSku: 'FT-FK-023-NVY',
    variantName: 'Navy Blue',
    orderId: 'ord-5001',
    customerId: 'cust-201',
    userName: 'Sarah Connor',
    userEmail: 'sarah.c@skyline.org',
    customer: {
      id: 'cust-201',
      name: 'Sarah Connor',
      email: 'sarah.c@skyline.org'
    },
    rating: 4,
    title: 'Keeps water ice cold all day in the desert',
    comment: 'The insulation is bulletproof. Left it inside my car at 95°F and the ice cubes were still rattling inside 8 hours later.',
    images: [
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=600'
    ],
    date: '2026-08-17',
    verifiedPurchase: true,
    status: 'pending',
    helpfulCount: 0
  },
  {
    id: 'rev-flagged-01',
    productId: 'prod-100',
    productName: 'Classic Organic Cotton T-Shirt',
    variantSku: 'TS-CREW-M-RED',
    variantName: 'Medium / Red',
    userName: 'SpamBot_Discount99',
    userEmail: 'promo@freegiftcard-fake.org',
    customer: {
      name: 'SpamBot_Discount99',
      email: 'promo@freegiftcard-fake.org'
    },
    rating: 1,
    title: 'Visit our discount website for free coupons!',
    comment: 'Do not buy here, visit cheap-deals-online-fake.xyz for 90% discount on all clothing brands immediately!',
    images: [],
    date: '2026-08-18',
    verifiedPurchase: false,
    status: 'flagged',
    flagReason: 'Automated advertising / spam link detected',
    flaggedAt: '2026-08-18T14:00:00Z',
    helpfulCount: 0
  },
  {
    id: 'rev-hidden-01',
    productId: 'prod-milk-1l',
    productName: 'Milk 1L',
    userName: 'Anonymous Guest',
    userEmail: 'anon@example.com',
    customer: {
      name: 'Anonymous Guest',
      email: 'anon@example.com'
    },
    rating: 2,
    title: 'Delivery driver did not ring bell',
    comment: 'Product itself was fresh, but delivery courier placed it on the front porch without ringing doorbell.',
    images: [],
    date: '2026-08-05',
    verifiedPurchase: false,
    status: 'hidden',
    helpfulCount: 1,
    adminResponse: {
      text: 'We apologize for the courier issue. We have escalated this to our local dispatch team.',
      respondedAt: '2026-08-06T11:00:00Z',
      responderName: 'Marcus Aurelius',
      responderRole: 'Store Manager'
    }
  }
];

