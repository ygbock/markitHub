import { 
  BranchLocation, 
  StockMovementRecord, 
  StockAdjustmentRecord, 
  InventoryBatch,
  Product,
  Order
} from '../types';

export const INITIAL_BRANCHES: BranchLocation[] = [
  {
    id: 'br-01',
    name: 'Downtown Flagship Store',
    code: 'DF-01',
    address: '100 Central Boulevard, Suite 101, Freetown',
    city: 'Freetown Central',
    type: 'Flagship Store',
    manager: 'Marcus Aurelius',
    phone: '+232 76 550 101',
    isActive: true
  },
  {
    id: 'br-02',
    name: 'Westside Commercial Mall',
    code: 'WM-02',
    address: '45 West Galleria Plaza, Floor 2, Freetown',
    city: 'West Freetown',
    type: 'Mall Branch',
    manager: 'David Chen',
    phone: '+232 76 550 202',
    isActive: true
  },
  {
    id: 'br-03',
    name: 'Airport Express Outlet',
    code: 'AE-03',
    address: 'Lungi International Terminal B, Freetown',
    city: 'Lungi Airport',
    type: 'Express Outlet',
    manager: 'Sam Rivera',
    phone: '+232 76 550 303',
    isActive: true
  },
  {
    id: 'br-04',
    name: 'Metro Logistics Hub (E-Commerce)',
    code: 'ML-04',
    address: '880 Harbor Industrial Park, Warehouse 7',
    city: 'Harbor District',
    type: 'Fulfillment Center',
    manager: 'Cody Sparks',
    phone: '+232 76 550 404',
    isActive: true
  }
];

export const INITIAL_EXTENDED_PRODUCTS: Product[] = [
  {
    id: 'prod-101',
    name: 'AeroSound Pro ANC Headphones',
    sku: 'EL-HP-001',
    price: 249.99,
    cost: 110.00,
    stock: 45,
    category: 'Electronics',
    location: 'Store Shelf',
    reorderPoint: 15,
    barcode: '880192837401',
    qrCode: 'QR-EL-HP-001',
    variants: [
      { sku: 'EL-HP-001-BLK', size: 'One Size', color: 'Midnight Black', stock: 25 },
      { sku: 'EL-HP-001-SLV', size: 'One Size', color: 'Platinum Silver', stock: 20 }
    ],
    salesCount: 142,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400',
    description: 'Studio-grade hybrid Active Noise Cancelling headphones with 40-hour battery life and customizable sound profile.'
  },
  {
    id: 'prod-102',
    name: 'FitTrack V4 Smartwatch',
    sku: 'EL-SW-004',
    price: 189.99,
    cost: 80.00,
    stock: 8, // Low Stock
    category: 'Electronics',
    location: 'Store Shelf',
    reorderPoint: 12,
    barcode: '880192837402',
    qrCode: 'QR-EL-SW-004',
    variants: [
      { sku: 'EL-SW-004-CHR', size: '44mm', color: 'Charcoal Grey', stock: 5 },
      { sku: 'EL-SW-004-GLD', size: '40mm', color: 'Rose Gold', stock: 3 }
    ],
    salesCount: 210, // Fast Moving
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=400',
    description: 'All-day fitness tracker with SpO2 monitoring, on-wrist ECG, integrated GPS, and cellular connection capabilities.'
  },
  {
    id: 'prod-103',
    name: 'Merino Wool Trail Socks',
    sku: 'AP-SK-012',
    price: 24.99,
    cost: 8.50,
    stock: 120,
    category: 'Apparel & Fashion',
    location: 'Warehouse',
    reorderPoint: 30,
    barcode: '880192837403',
    qrCode: 'QR-AP-SK-012',
    variants: [
      { sku: 'AP-SK-012-M', size: 'Medium', color: 'Forest Green', stock: 60 },
      { sku: 'AP-SK-012-L', size: 'Large', color: 'Slate Grey', stock: 60 }
    ],
    salesCount: 340, // Fast Moving
    imageUrl: 'https://images.unsplash.com/photo-1582966772680-860e372bb558?auto=format&fit=crop&q=80&w=400',
    description: 'Premium ethical Merino wool blended socks with double-cushioned soles and anti-blister padding.'
  },
  {
    id: 'prod-104',
    name: 'Apex Ergonomic Mesh Chair',
    sku: 'HO-CH-099',
    price: 349.99,
    cost: 165.00,
    stock: 4, // Low stock
    category: 'Home & Living',
    location: 'Warehouse',
    reorderPoint: 10,
    barcode: '880192837404',
    qrCode: 'QR-HO-CH-099',
    variants: [
      { sku: 'HO-CH-099-STD', size: 'Standard', color: 'Obsidian Black', stock: 4 }
    ],
    salesCount: 55,
    imageUrl: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&q=80&w=400',
    description: 'Fully adjustable mesh task chair featuring adaptive lumbar support, 4D armrests, and synchronized tilt mechanism.'
  },
  {
    id: 'prod-105',
    name: 'HydroLock Steel Flask 1L',
    sku: 'FT-FK-023',
    price: 39.99,
    cost: 14.00,
    stock: 75,
    category: 'Fitness & Outdoors',
    location: 'Store Shelf',
    reorderPoint: 20,
    barcode: '880192837405',
    qrCode: 'QR-FT-FK-023',
    variants: [
      { sku: 'FT-FK-023-NVY', size: '1L', color: 'Ocean Navy', stock: 40 },
      { sku: 'FT-FK-023-WHT', size: '1L', color: 'Alpine White', stock: 35 }
    ],
    salesCount: 188,
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=400',
    description: 'Double-walled vacuum insulated food-grade stainless steel bottle keeping beverages ice-cold for 24 hours.'
  },
  {
    id: 'prod-106',
    name: 'Minimalist Walnut Desk Organizer',
    sku: 'OF-DO-008',
    price: 69.99,
    cost: 28.00,
    stock: 22,
    category: 'Office Supplies',
    location: 'Fulfillment Center',
    reorderPoint: 8,
    barcode: '880192837406',
    qrCode: 'QR-OF-DO-008',
    variants: [
      { sku: 'OF-DO-008-WAL', size: 'Medium', color: 'Natural Walnut', stock: 22 }
    ],
    salesCount: 94,
    imageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=400',
    description: 'Handcrafted solid North American walnut block featuring magnetic cable slots and modular pen docks.'
  },
  {
    id: 'prod-107',
    name: 'UltraLite Carbon Fiber Trekking Poles',
    sku: 'FT-TK-088',
    price: 119.99,
    cost: 48.00,
    stock: 0, // OUT OF STOCK
    category: 'Fitness & Outdoors',
    location: 'Warehouse',
    reorderPoint: 15,
    barcode: '880192837407',
    qrCode: 'QR-FT-TK-088',
    variants: [
      { sku: 'FT-TK-088-BLK', size: 'Pair', color: 'Carbon Matte', stock: 0 }
    ],
    salesCount: 176,
    imageUrl: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&q=80&w=400',
    description: 'Aircraft-grade 3K carbon fiber walking poles with quick lever-locks and cork ergonomic grips.'
  },
  {
    id: 'prod-108',
    name: 'Thermal Receipt Paper Rolls (50-Pack)',
    sku: 'OF-PR-050',
    price: 45.00,
    cost: 18.00,
    stock: 0, // OUT OF STOCK
    category: 'Office Supplies',
    location: 'Store Shelf',
    reorderPoint: 25,
    barcode: '880192837408',
    qrCode: 'QR-OF-PR-050',
    variants: [
      { sku: 'OF-PR-050-WHT', size: '80mm x 80mm', color: 'BPA-Free White', stock: 0 }
    ],
    salesCount: 88,
    imageUrl: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&q=80&w=400',
    description: 'Premium BPA-free 80mm thermal receipt paper with high print contrast and 10-year image durability.'
  },
  {
    id: 'prod-109',
    name: 'Vintage Mechanical Metronome',
    sku: 'HO-MM-002',
    price: 89.99,
    cost: 42.00,
    stock: 35,
    category: 'Home & Living',
    location: 'Warehouse',
    reorderPoint: 5,
    barcode: '880192837409',
    qrCode: 'QR-HO-MM-002',
    variants: [
      { sku: 'HO-MM-002-MAH', size: 'Standard', color: 'Mahogany Brown', stock: 35 }
    ],
    salesCount: 1, // DEAD STOCK
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=400',
    description: 'Classic spring-wound pyramid metronome with audible bell and swinging pendulum. Idle stock in storage.'
  },
  {
    id: 'prod-110',
    name: 'Laser Disk Cleaner Fluid Kit',
    sku: 'EL-CL-007',
    price: 29.99,
    cost: 11.50,
    stock: 48,
    category: 'Electronics',
    location: 'Warehouse',
    reorderPoint: 5,
    barcode: '880192837410',
    qrCode: 'QR-EL-CL-007',
    variants: [
      { sku: 'EL-CL-007-KIT', size: '100ml', color: 'Standard', stock: 48 }
    ],
    salesCount: 0, // DEAD STOCK (0 sales)
    imageUrl: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&q=80&w=400',
    description: 'Antistatic cleaning solution and micro-fiber disc repair cloth kit. 0 units sold in 180 days.'
  },
  {
    id: 'prod-111',
    name: 'Ceramic Artisan Espresso Cup Set',
    sku: 'HO-EC-004',
    price: 54.99,
    cost: 22.00,
    stock: 60,
    category: 'Home & Living',
    location: 'Store Shelf',
    reorderPoint: 10,
    barcode: '880192837411',
    qrCode: 'QR-HO-EC-004',
    variants: [
      { sku: 'HO-EC-004-TER', size: '4-Pack', color: 'Terracotta Glaze', stock: 60 }
    ],
    salesCount: 6, // SLOW MOVING (0.1 units/day)
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=400',
    description: 'Hand-thrown stoneware espresso cups with double-fired mineral glaze. High inventory days of supply (210 days).'
  },
  {
    id: 'prod-112',
    name: 'Organic Matcha Green Tea Powder 100g',
    sku: 'HO-MT-100',
    price: 32.50,
    cost: 12.00,
    stock: 40,
    category: 'Home & Living',
    location: 'Store Shelf',
    reorderPoint: 15,
    barcode: '880192837412',
    qrCode: 'QR-HO-MT-100',
    variants: [
      { sku: 'HO-MT-100-CER', size: '100g', color: 'Ceremonial Grade', stock: 40 }
    ],
    salesCount: 165,
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=400',
    description: 'Single-origin ceremonial stone-ground Japanese Uji matcha with natural antioxidants and umami notes.'
  },
  {
    id: 'prod-113',
    name: 'Natural Whey Protein Isolate (Vanilla 1kg)',
    sku: 'FT-PR-001',
    price: 59.99,
    cost: 24.50,
    stock: 30,
    category: 'Fitness & Outdoors',
    location: 'Warehouse',
    reorderPoint: 10,
    barcode: '880192837413',
    qrCode: 'QR-FT-PR-001',
    variants: [
      { sku: 'FT-PR-001-VAN', size: '1kg Tub', color: 'Tahitian Vanilla', stock: 30 }
    ],
    salesCount: 140,
    imageUrl: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=400',
    description: 'Grass-fed cold-processed whey isolate powder with zero added artificial sugar and full amino profile.'
  }
];

export const INITIAL_BATCHES: InventoryBatch[] = [
  {
    id: 'batch-001',
    productId: 'prod-112',
    productName: 'Organic Matcha Green Tea Powder 100g',
    sku: 'HO-MT-100',
    category: 'Home & Living',
    batchNumber: 'LOT-MT-2025-08',
    quantity: 14,
    remainingQuantity: 14,
    initialQuantity: 50,
    costPerUnit: 12.00,
    supplierName: 'Kyoto Ceremonial Teas Ltd',
    manufacturingDate: '2025-08-15',
    expiryDate: '2026-08-25', // 8 days away!
    daysUntilExpiry: 8,
    status: 'Critical (<30d)',
    location: 'Downtown Flagship Store',
    unitCost: 12.00,
    totalCostValue: 168.00,
    retailPrice: 32.50,
    totalRetailValue: 455.00
  },
  {
    id: 'batch-002',
    productId: 'prod-113',
    productName: 'Natural Whey Protein Isolate (Vanilla 1kg)',
    sku: 'FT-PR-001',
    category: 'Fitness & Outdoors',
    batchNumber: 'LOT-PR-2025-04',
    quantity: 6,
    remainingQuantity: 6,
    initialQuantity: 30,
    costPerUnit: 24.50,
    supplierName: 'Alpine BioNutrition Global',
    manufacturingDate: '2025-04-10',
    expiryDate: '2026-08-05', // Already expired by 12 days
    daysUntilExpiry: -12,
    status: 'Expired',
    location: 'Westside Commercial Mall',
    unitCost: 24.50,
    totalCostValue: 147.00,
    retailPrice: 59.99,
    totalRetailValue: 359.94
  },
  {
    id: 'batch-003',
    productId: 'prod-112',
    productName: 'Organic Matcha Green Tea Powder 100g',
    sku: 'HO-MT-100',
    category: 'Home & Living',
    batchNumber: 'LOT-MT-2025-11',
    quantity: 26,
    remainingQuantity: 26,
    initialQuantity: 60,
    costPerUnit: 12.00,
    supplierName: 'Kyoto Ceremonial Teas Ltd',
    manufacturingDate: '2025-11-20',
    expiryDate: '2026-10-15', // 59 days away
    daysUntilExpiry: 59,
    status: 'Warning (<90d)',
    location: 'Downtown Flagship Store',
    unitCost: 12.00,
    totalCostValue: 312.00,
    retailPrice: 32.50,
    totalRetailValue: 845.00
  },
  {
    id: 'batch-004',
    productId: 'prod-113',
    productName: 'Natural Whey Protein Isolate (Vanilla 1kg)',
    sku: 'FT-PR-001',
    category: 'Fitness & Outdoors',
    batchNumber: 'LOT-PR-2026-02',
    quantity: 24,
    remainingQuantity: 24,
    initialQuantity: 40,
    costPerUnit: 24.50,
    supplierName: 'Alpine BioNutrition Global',
    manufacturingDate: '2026-02-14',
    expiryDate: '2027-02-14', // 181 days away
    daysUntilExpiry: 181,
    status: 'Good',
    location: 'Metro Logistics Hub',
    unitCost: 24.50,
    totalCostValue: 588.00,
    retailPrice: 59.99,
    totalRetailValue: 1439.76
  },
  {
    id: 'batch-005',
    productId: 'prod-105',
    productName: 'HydroLock Steel Flask 1L (Electrolyte Seals)',
    sku: 'FT-FK-023',
    category: 'Fitness & Outdoors',
    batchNumber: 'LOT-FK-2026-01',
    quantity: 40,
    remainingQuantity: 40,
    initialQuantity: 100,
    costPerUnit: 14.00,
    supplierName: 'Nordic Peak Drinkware Co',
    manufacturingDate: '2026-01-10',
    expiryDate: '2028-01-10',
    daysUntilExpiry: 510,
    status: 'Good',
    location: 'Downtown Flagship Store',
    unitCost: 14.00,
    totalCostValue: 560.00,
    retailPrice: 39.99,
    totalRetailValue: 1599.60
  }
];

export const INITIAL_STOCK_MOVEMENTS: StockMovementRecord[] = [
  {
    id: 'mov-1001',
    date: '2026-08-16T15:30:00-07:00',
    productId: 'prod-101',
    productName: 'AeroSound Pro ANC Headphones',
    sku: 'EL-HP-001',
    type: 'POS Sale',
    quantityChange: -1,
    quantityBefore: 46,
    quantityAfter: 45,
    unitCost: 110.00,
    totalCostImpact: -110.00,
    location: 'Downtown Flagship Store',
    referenceDoc: 'INV-2026-5001',
    performedBy: 'Jessie Quick',
    notes: 'POS Register #01 customer checkout.'
  },
  {
    id: 'mov-1002',
    date: '2026-08-16T11:20:00-07:00',
    productId: 'prod-103',
    productName: 'Merino Wool Trail Socks',
    sku: 'AP-SK-012',
    type: 'PO Received',
    quantityChange: 50,
    quantityBefore: 70,
    quantityAfter: 120,
    unitCost: 8.50,
    totalCostImpact: 425.00,
    location: 'Metro Logistics Hub',
    referenceDoc: 'PO-2026-8819',
    performedBy: 'Cody Sparks',
    notes: 'Freight shipment container delivery verified.'
  },
  {
    id: 'mov-1003',
    date: '2026-08-15T16:45:00-07:00',
    productId: 'prod-102',
    productName: 'FitTrack V4 Smartwatch',
    sku: 'EL-SW-004',
    type: 'Online Sale',
    quantityChange: -2,
    quantityBefore: 10,
    quantityAfter: 8,
    unitCost: 80.00,
    totalCostImpact: -160.00,
    location: 'Metro Logistics Hub',
    referenceDoc: 'ECOM-ORD-9022',
    performedBy: 'Maya Lin',
    notes: 'Dispatched via DHL Express carrier.'
  },
  {
    id: 'mov-1004',
    date: '2026-08-15T09:10:00-07:00',
    productId: 'prod-105',
    productName: 'HydroLock Steel Flask 1L',
    sku: 'FT-FK-023',
    type: 'Inter-Branch Transfer',
    quantityChange: -15,
    quantityBefore: 90,
    quantityAfter: 75,
    unitCost: 14.00,
    totalCostImpact: -210.00,
    location: 'Metro Logistics Hub -> Downtown Store',
    referenceDoc: 'XFER-2026-044',
    performedBy: 'David Chen',
    notes: 'Replenishing Downtown Flagship shelf inventory.'
  },
  {
    id: 'mov-1005',
    date: '2026-08-14T14:15:00-07:00',
    productId: 'prod-104',
    productName: 'Apex Ergonomic Mesh Chair',
    sku: 'HO-CH-099',
    type: 'Damage Write-Off',
    quantityChange: -1,
    quantityBefore: 5,
    quantityAfter: 4,
    unitCost: 165.00,
    totalCostImpact: -165.00,
    location: 'Westside Commercial Mall',
    referenceDoc: 'SCRAP-8812',
    performedBy: 'Marcus Aurelius',
    notes: 'Hydraulic piston damaged during floor display assembly.'
  },
  {
    id: 'mov-1006',
    date: '2026-08-13T10:30:00-07:00',
    productId: 'prod-101',
    productName: 'AeroSound Pro ANC Headphones',
    sku: 'EL-HP-001',
    type: 'Return to Inventory',
    quantityChange: 1,
    quantityBefore: 44,
    quantityAfter: 45,
    unitCost: 110.00,
    totalCostImpact: 110.00,
    location: 'Downtown Flagship Store',
    referenceDoc: 'RET-2026-012',
    performedBy: 'Sam Rivera',
    notes: 'Customer returned unopened unit within 14-day warranty.'
  },
  {
    id: 'mov-1007',
    date: '2026-08-12T17:00:00-07:00',
    productId: 'prod-106',
    productName: 'Minimalist Walnut Desk Organizer',
    sku: 'OF-DO-008',
    type: 'Audit Adjustment',
    quantityChange: 2,
    quantityBefore: 20,
    quantityAfter: 22,
    unitCost: 28.00,
    totalCostImpact: 56.00,
    location: 'Fulfillment Center',
    referenceDoc: 'AUDIT-CYCLE-Q3',
    performedBy: 'Elena Rostova',
    notes: 'Physical count found 2 unlogged boxed units in Bin C-12.'
  }
];

export const INITIAL_STOCK_ADJUSTMENTS: StockAdjustmentRecord[] = [
  {
    id: 'adj-501',
    date: '2026-08-14T17:30:00-07:00',
    productId: 'prod-106',
    productName: 'Minimalist Walnut Desk Organizer',
    sku: 'OF-DO-008',
    location: 'Fulfillment Center',
    systemQuantity: 20,
    physicalQuantity: 22,
    varianceQuantity: 2,
    unitCost: 28.00,
    varianceCost: 56.00,
    reason: 'Physical Count Discrepancy',
    adjustedBy: 'Elena Rostova',
    status: 'Approved',
    notes: 'Quarterly cycle count reconciliation.'
  },
  {
    id: 'adj-502',
    date: '2026-08-13T14:10:00-07:00',
    productId: 'prod-104',
    productName: 'Apex Ergonomic Mesh Chair',
    sku: 'HO-CH-099',
    location: 'Westside Commercial Mall',
    systemQuantity: 5,
    physicalQuantity: 4,
    varianceQuantity: -1,
    unitCost: 165.00,
    varianceCost: -165.00,
    reason: 'Damaged Stock',
    adjustedBy: 'Marcus Aurelius',
    status: 'Approved',
    notes: 'Display model structural arm bracket cracked.'
  },
  {
    id: 'adj-503',
    date: '2026-08-11T09:45:00-07:00',
    productId: 'prod-103',
    productName: 'Merino Wool Trail Socks',
    sku: 'AP-SK-012',
    location: 'Downtown Flagship Store',
    systemQuantity: 122,
    physicalQuantity: 120,
    varianceQuantity: -2,
    unitCost: 8.50,
    varianceCost: -17.00,
    reason: 'Shrinkage/Theft',
    adjustedBy: 'Jessie Quick',
    status: 'Approved',
    notes: 'End of week shelf count variance.'
  },
  {
    id: 'adj-504',
    date: '2026-08-08T11:20:00-07:00',
    productId: 'prod-113',
    productName: 'Natural Whey Protein Isolate (Vanilla 1kg)',
    sku: 'FT-PR-001',
    location: 'Westside Commercial Mall',
    systemQuantity: 36,
    physicalQuantity: 30,
    varianceQuantity: -6,
    unitCost: 24.50,
    varianceCost: -147.00,
    reason: 'Expired Goods',
    adjustedBy: 'Priya Patel',
    status: 'Approved',
    notes: 'Wrote off Lot PR-2025-04 expired batch from sale shelf.'
  }
];

export const INITIAL_EXTENDED_ORDERS: Order[] = [
  {
    id: 'ord-5001',
    date: '2026-08-17T09:15:30-07:00', // Today
    items: [
      {
        productId: 'prod-101',
        productName: 'AeroSound Pro ANC Headphones',
        quantity: 1,
        price: 249.99,
        cost: 110.00,
        variantSku: 'EL-HP-001-BLK'
      },
      {
        productId: 'prod-105',
        productName: 'HydroLock Steel Flask 1L',
        quantity: 2,
        price: 39.99,
        cost: 14.00,
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
    cashierId: 'staff-06',
    cashierName: 'Jessie Quick',
    branchId: 'br-01',
    branchName: 'Downtown Flagship Store',
    status: 'Completed',
    cogs: 138.00
  },
  {
    id: 'ord-5002',
    date: '2026-08-16T14:45:00-07:00', // Yesterday
    items: [
      {
        productId: 'prod-102',
        productName: 'FitTrack V4 Smartwatch',
        quantity: 1,
        price: 189.99,
        cost: 80.00,
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
    cashierId: 'staff-10',
    cashierName: 'Maya Lin',
    branchId: 'br-04',
    branchName: 'Metro Logistics Hub (E-Commerce)',
    status: 'Completed',
    cogs: 80.00
  },
  {
    id: 'ord-5003',
    date: '2026-08-16T10:30:15-07:00',
    items: [
      {
        productId: 'prod-103',
        productName: 'Merino Wool Trail Socks',
        quantity: 4,
        price: 24.99,
        cost: 8.50,
        variantSku: 'AP-SK-012-M'
      },
      {
        productId: 'prod-106',
        productName: 'Minimalist Walnut Desk Organizer',
        quantity: 1,
        price: 69.99,
        cost: 28.00,
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
    cashierId: 'staff-10',
    cashierName: 'Maya Lin',
    branchId: 'br-04',
    branchName: 'Metro Logistics Hub (E-Commerce)',
    status: 'Completed',
    cogs: 62.00
  },
  {
    id: 'ord-5004',
    date: '2026-08-15T11:55:00-07:00',
    items: [
      {
        productId: 'prod-104',
        productName: 'Apex Ergonomic Mesh Chair',
        quantity: 1,
        price: 349.99,
        cost: 165.00,
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
    cashierId: 'staff-03',
    cashierName: 'Marcus Aurelius',
    branchId: 'br-02',
    branchName: 'Westside Commercial Mall',
    status: 'Completed',
    cogs: 165.00
  },
  {
    id: 'ord-5005',
    date: '2026-08-14T16:20:00-07:00',
    items: [
      {
        productId: 'prod-101',
        productName: 'AeroSound Pro ANC Headphones',
        quantity: 2,
        price: 249.99,
        cost: 110.00,
        variantSku: 'EL-HP-001-SLV'
      },
      {
        productId: 'prod-105',
        productName: 'HydroLock Steel Flask 1L',
        quantity: 1,
        price: 39.99,
        cost: 14.00,
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
    cashierId: 'staff-10',
    cashierName: 'Maya Lin',
    branchId: 'br-04',
    branchName: 'Metro Logistics Hub (E-Commerce)',
    status: 'Completed',
    cogs: 234.00
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
        cost: 8.50,
        variantSku: 'AP-SK-012-L'
      },
      {
        productId: 'prod-104',
        productName: 'Apex Ergonomic Mesh Chair',
        quantity: 1,
        price: 349.99,
        cost: 165.00,
        variantSku: 'HO-CH-099-STD'
      }
    ],
    subtotal: 499.93,
    tax: 39.99,
    discount: 30.00,
    total: 509.92,
    paymentMethod: 'Cash',
    channel: 'In-Store POS',
    customerId: 'cust-202',
    customerName: 'Miles Dyson',
    cashierId: 'staff-06',
    cashierName: 'Jessie Quick',
    branchId: 'br-01',
    branchName: 'Downtown Flagship Store',
    status: 'Completed',
    cogs: 216.00
  },
  {
    id: 'ord-5007',
    date: '2026-08-13T09:40:00-07:00',
    items: [
      {
        productId: 'prod-102',
        productName: 'FitTrack V4 Smartwatch',
        quantity: 2,
        price: 189.99,
        cost: 80.00,
        variantSku: 'EL-SW-004-CHR'
      },
      {
        productId: 'prod-106',
        productName: 'Minimalist Walnut Desk Organizer',
        quantity: 2,
        price: 69.99,
        cost: 28.00,
        variantSku: 'OF-DO-008'
      }
    ],
    subtotal: 519.96,
    tax: 41.60,
    discount: 20.00,
    total: 541.56,
    paymentMethod: 'Digital Wallet',
    channel: 'Online Storefront',
    customerId: 'cust-201',
    customerName: 'Sarah Connor',
    cashierId: 'staff-10',
    cashierName: 'Maya Lin',
    branchId: 'br-04',
    branchName: 'Metro Logistics Hub (E-Commerce)',
    status: 'Completed',
    cogs: 216.00
  },
  {
    id: 'ord-5008',
    date: '2026-08-12T15:20:00-07:00',
    items: [
      {
        productId: 'prod-101',
        productName: 'AeroSound Pro ANC Headphones',
        quantity: 1,
        price: 249.99,
        cost: 110.00,
        variantSku: 'EL-HP-001-BLK'
      }
    ],
    subtotal: 249.99,
    tax: 20.00,
    discount: 0.00,
    total: 269.99,
    paymentMethod: 'Credit/Debit Card',
    channel: 'In-Store POS',
    customerId: 'cust-203',
    customerName: 'John Connor',
    cashierId: 'staff-07',
    cashierName: 'Sam Rivera',
    branchId: 'br-03',
    branchName: 'Airport Express Outlet',
    status: 'Refunded', // REFUND
    refundAmount: 269.99,
    refundReason: 'Customer changed travel itinerary / return',
    refundedAt: '2026-08-13T10:15:00-07:00',
    cogs: 110.00
  },
  {
    id: 'ord-5009',
    date: '2026-08-11T12:00:00-07:00',
    items: [
      {
        productId: 'prod-105',
        productName: 'HydroLock Steel Flask 1L',
        quantity: 10,
        price: 39.99,
        cost: 14.00,
        variantSku: 'FT-FK-023-NVY'
      },
      {
        productId: 'prod-103',
        productName: 'Merino Wool Trail Socks',
        quantity: 15,
        price: 24.99,
        cost: 8.50,
        variantSku: 'AP-SK-012-M'
      }
    ],
    subtotal: 774.75,
    tax: 61.98,
    discount: 50.00,
    total: 786.73,
    paymentMethod: 'Bank Transfer',
    channel: 'In-Store POS',
    customerId: 'cust-204',
    customerName: 'Marcus Wright',
    cashierId: 'staff-03',
    cashierName: 'Marcus Aurelius',
    branchId: 'br-01',
    branchName: 'Downtown Flagship Store',
    status: 'Outstanding', // UNPAID / OUTSTANDING
    outstandingBalance: 786.73,
    dueDate: '2026-08-25',
    cogs: 267.50
  },
  {
    id: 'ord-5010',
    date: '2026-08-10T16:30:00-07:00',
    items: [
      {
        productId: 'prod-112',
        productName: 'Organic Matcha Green Tea Powder 100g',
        quantity: 4,
        price: 32.50,
        cost: 12.00,
        variantSku: 'HO-MT-100-CER'
      },
      {
        productId: 'prod-113',
        productName: 'Natural Whey Protein Isolate (Vanilla 1kg)',
        quantity: 2,
        price: 59.99,
        cost: 24.50,
        variantSku: 'FT-PR-001-VAN'
      }
    ],
    subtotal: 249.98,
    tax: 20.00,
    discount: 15.00,
    total: 254.98,
    paymentMethod: 'Mobile Pay',
    channel: 'In-Store POS',
    customerId: 'cust-202',
    customerName: 'Miles Dyson',
    cashierId: 'staff-06',
    cashierName: 'Jessie Quick',
    branchId: 'br-01',
    branchName: 'Downtown Flagship Store',
    status: 'Completed',
    cogs: 97.00
  },
  {
    id: 'ord-5011',
    date: '2026-08-09T14:10:00-07:00',
    items: [
      {
        productId: 'prod-101',
        productName: 'AeroSound Pro ANC Headphones',
        quantity: 1,
        price: 249.99,
        cost: 110.00,
        variantSku: 'EL-HP-001-BLK'
      },
      {
        productId: 'prod-102',
        productName: 'FitTrack V4 Smartwatch',
        quantity: 1,
        price: 189.99,
        cost: 80.00,
        variantSku: 'EL-SW-004-CHR'
      }
    ],
    subtotal: 439.98,
    tax: 35.20,
    discount: 20.00,
    total: 455.18,
    paymentMethod: 'Credit/Debit Card',
    channel: 'In-Store POS',
    customerId: 'cust-201',
    customerName: 'Sarah Connor',
    cashierId: 'staff-06',
    cashierName: 'Jessie Quick',
    branchId: 'br-02',
    branchName: 'Westside Commercial Mall',
    status: 'Completed',
    cogs: 190.00
  },
  {
    id: 'ord-5012',
    date: '2026-08-08T11:40:00-07:00',
    items: [
      {
        productId: 'prod-103',
        productName: 'Merino Wool Trail Socks',
        quantity: 8,
        price: 24.99,
        cost: 8.50,
        variantSku: 'AP-SK-012-L'
      }
    ],
    subtotal: 199.92,
    tax: 15.99,
    discount: 10.00,
    total: 205.91,
    paymentMethod: 'Cash',
    channel: 'In-Store POS',
    customerId: 'cust-203',
    customerName: 'John Connor',
    cashierId: 'staff-07',
    cashierName: 'Sam Rivera',
    branchId: 'br-03',
    branchName: 'Airport Express Outlet',
    status: 'Completed',
    cogs: 68.00
  }
];

// Aliases for compatibility
export const MOCK_STOCK_MOVEMENTS = INITIAL_STOCK_MOVEMENTS;
export const MOCK_STOCK_ADJUSTMENTS = INITIAL_STOCK_ADJUSTMENTS;
export const MOCK_EXPIRING_ITEMS = INITIAL_BATCHES;
export const MOCK_BRANCHES = INITIAL_BRANCHES;
export const MOCK_ORDERS = INITIAL_EXTENDED_ORDERS;
export const MOCK_PRODUCTS = INITIAL_EXTENDED_PRODUCTS;
