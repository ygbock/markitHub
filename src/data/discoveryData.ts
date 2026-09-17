/**
 * Canonical Discovery Data: Businesses, Listings, Services, Locations
 * Implements the Business -> Listing -> optional Tenant hierarchy.
 */

export interface CanonicalBusinessListing {
  id: string;
  businessSlug: string;
  name: string;
  category: string;
  subcategory?: string;
  isTenant: boolean;
  tenantSlug?: string; // Only present if isTenant is true
  tenantId?: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  tagline: string;
  about: string;
  address: string;
  city: string;
  distanceKm: number;
  phone: string;
  whatsapp?: string;
  email: string;
  openingHours: string;
  isOpenNow: boolean;
  coordinates: { lat: number; lng: number };
  badges: string[];
  photos: string[];
  servicesOffered: Array<{
    id: string;
    name: string;
    price: number;
    durationMinutes?: number;
    description: string;
  }>;
}

export const DISCOVERY_BUSINESSES: CanonicalBusinessListing[] = [
  {
    id: 'biz-nexus-retail',
    businessSlug: 'nexus-enterprise',
    name: 'Nexus Enterprise Commerce',
    category: 'Retail & Superstore',
    subcategory: 'Electronics, Fashion, Grocery',
    isTenant: true,
    tenantSlug: 'nexus-retail',
    tenantId: 'nexus-retail',
    rating: 4.9,
    reviewCount: 342,
    isVerified: true,
    tagline: 'Premier Multi-Category Megastore with Same-Day Local Delivery',
    about: 'Nexus Enterprise is our flagship commerce hub offering smart electronics, home appliances, pantry staples, and fresh provisions under one verified roof.',
    address: '14 Wilkinson Road',
    city: 'Freetown',
    distanceKm: 0.8,
    phone: '+232 76 890 123',
    whatsapp: '+232 76 890 123',
    email: 'contact@nexusenterprise.sl',
    openingHours: 'Mon - Sat: 8:00 AM - 9:00 PM • Sun: 10:00 AM - 6:00 PM',
    isOpenNow: true,
    coordinates: { lat: 8.4844, lng: -13.2344 },
    badges: ['Verified Tenant', 'Fast Delivery', 'Omnichannel POS'],
    photos: [
      'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1555421689-491a97ff2040?w=800&auto=format&fit=crop&q=80'
    ],
    servicesOffered: [
      { id: 'srv-nx-1', name: 'Curbside Express Pickup', price: 0, durationMinutes: 15, description: 'Collect your online order at our dedicated Wilkinson Rd collection bay.' },
      { id: 'srv-nx-2', name: 'Home Appliance Installation', price: 25, durationMinutes: 60, description: 'Certified installation for TV mounts, refrigerators, and sound systems.' }
    ]
  },
  {
    id: 'biz-apex-gadgets',
    businessSlug: 'apex-gadgets',
    name: 'Apex Gadgets Worldwide',
    category: 'Electronics & Tech',
    subcategory: 'Smartphones, Audio, Laptops',
    isTenant: true,
    tenantSlug: 'apex-gadgets',
    tenantId: 'apex-gadgets',
    rating: 4.8,
    reviewCount: 189,
    isVerified: true,
    tagline: 'Genuine Flagship Smartphones, Laptops & Audio Engineering',
    about: 'Authorised reseller for premium smartphones, ANC headphones, gaming accessories, and ultrabooks with full factory warranties.',
    address: '42 Siaka Stevens Street',
    city: 'Freetown',
    distanceKm: 1.5,
    phone: '+232 88 554 433',
    whatsapp: '+232 88 554 433',
    email: 'hello@apexgadgets.com',
    openingHours: 'Mon - Fri: 8:30 AM - 7:00 PM • Sat: 9:00 AM - 5:00 PM',
    isOpenNow: true,
    coordinates: { lat: 8.4871, lng: -13.2355 },
    badges: ['Verified Tenant', 'Official Warranty', 'Direct Storefront'],
    photos: [
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80'
    ],
    servicesOffered: [
      { id: 'srv-apx-1', name: 'Smart Device Diagnostics', price: 10, durationMinutes: 30, description: 'Comprehensive battery health, screen, and logic-board diagnostics.' }
    ]
  },
  {
    id: 'biz-kallon-repair',
    businessSlug: 'kallon-tech-repair',
    name: 'Kallon Smart Tech & Phone Repair',
    category: 'Repairs & Services',
    subcategory: 'Phone Repair, Screen Replacement, Laptop Fixes',
    isTenant: false, // Listing-only business!
    rating: 4.7,
    reviewCount: 96,
    isVerified: true,
    tagline: 'Fast Screen Replacements, Battery Swaps & Motherboard Soldering',
    about: 'Over 12 years of professional hardware and micro-soldering experience. We fix iPhone, Samsung, MacBook, and HP laptop hardware with genuine parts while you wait.',
    address: '19 Campbell Street',
    city: 'Freetown',
    distanceKm: 2.1,
    phone: '+232 77 123 456',
    whatsapp: '+232 77 123 456',
    email: 'kallonrepairs@gmail.com',
    openingHours: 'Mon - Sat: 8:00 AM - 6:30 PM',
    isOpenNow: true,
    coordinates: { lat: 8.4820, lng: -13.2380 },
    badges: ['Verified Provider', 'Listing Only', 'On-Site Repairs'],
    photos: [
      'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&auto=format&fit=crop&q=80'
    ],
    servicesOffered: [
      { id: 'srv-kl-1', name: 'OLED / LCD Screen Replacement', price: 45, durationMinutes: 45, description: 'Original OLED and glass replacement for iPhone, Samsung, and Pixel.' },
      { id: 'srv-kl-2', name: 'High Capacity Battery Replacement', price: 25, durationMinutes: 30, description: 'Fresh 0-cycle lithium-ion battery with 6-month performance guarantee.' },
      { id: 'srv-kl-3', name: 'Laptop Deep Clean & Thermal Repaste', price: 20, durationMinutes: 60, description: 'Cleans out fans, heatsinks, and applies Noctua high-performance thermal paste.' }
    ]
  },
  {
    id: 'biz-sierra-boutique',
    businessSlug: 'sierra-fashion',
    name: 'Sierra Fashion & Boutique',
    category: 'Apparel & Fashion',
    subcategory: 'African Designer Wear, Footwear, Tailoring',
    isTenant: true,
    tenantSlug: 'sierra-boutique',
    tenantId: 'sierra-boutique',
    rating: 4.9,
    reviewCount: 215,
    isVerified: true,
    tagline: 'Handmade African Garments, Bespoke Tailoring & Designer Accessories',
    about: 'Sierra Fashion combines rich West African textiles (Gara, Kente, Damask) with contemporary modern tailoring and footwear.',
    address: '78 Regent Road, Lumley',
    city: 'Freetown',
    distanceKm: 3.4,
    phone: '+232 79 332 211',
    whatsapp: '+232 79 332 211',
    email: 'info@sierrafashion.com',
    openingHours: 'Mon - Sat: 9:00 AM - 8:00 PM',
    isOpenNow: true,
    coordinates: { lat: 8.4610, lng: -13.2650 },
    badges: ['Verified Tenant', 'Artisan Crafted', 'Online Store'],
    photos: [
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=80'
    ],
    servicesOffered: [
      { id: 'srv-sf-1', name: 'Bespoke Suit & Gown Fitting', price: 50, durationMinutes: 45, description: 'Custom body measurements and design consultation for ceremonial wear.' },
      { id: 'srv-sf-2', name: 'Express Garment Alterations', price: 15, durationMinutes: 30, description: 'Hemming, tapering, and adjustments ready within 24 hours.' }
    ]
  },
  {
    id: 'biz-central-plumbing',
    businessSlug: 'central-freetown-plumbing',
    name: 'Central Plumbing & Water Solutions',
    category: 'Home & Construction',
    subcategory: 'Plumber, Water Tanks, Pipe Fitting',
    isTenant: false, // Listing-only business!
    rating: 4.6,
    reviewCount: 48,
    isVerified: true,
    tagline: '24/7 Emergency Plumbing, Borehole Pump Repairs & Tank Systems',
    about: 'Licensed master plumbers serving residential homes, estates, and commercial buildings. We handle pipe bursts, solar water heaters, and booster pumps.',
    address: '11 Sanders Street',
    city: 'Freetown',
    distanceKm: 2.8,
    phone: '+232 30 778 899',
    whatsapp: '+232 30 778 899',
    email: 'centralplumbing.sl@gmail.com',
    openingHours: '24/7 Emergency Support • Regular: Mon - Sun 7:00 AM - 8:00 PM',
    isOpenNow: true,
    coordinates: { lat: 8.4890, lng: -13.2310 },
    badges: ['Verified Provider', '24/7 Emergency', 'Listing Only'],
    photos: [
      'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=800&auto=format&fit=crop&q=80'
    ],
    servicesOffered: [
      { id: 'srv-pl-1', name: 'Emergency Pipe Leak Repair', price: 30, durationMinutes: 60, description: 'Rapid response leak detection and copper/PVC pipe welding.' },
      { id: 'srv-pl-2', name: 'Water Tank & Booster Pump Setup', price: 80, durationMinutes: 180, description: 'Complete installation of overhead water tanks, float valves, and pumps.' }
    ]
  },
  {
    id: 'biz-precision-printing',
    businessSlug: 'precision-printing-press',
    name: 'Precision Digital Printing & Graphics',
    category: 'Printing & Business Services',
    subcategory: 'Brochures, Large Format Banners, Uniforms',
    isTenant: false, // Listing-only business!
    rating: 4.8,
    reviewCount: 82,
    isVerified: true,
    tagline: 'High-Resolution Offset & Digital Printing, Vinyl Banners & Corporate Branding',
    about: 'Full-service digital printing press delivering premium flyers, books, corporate letterheads, branded school uniforms, and exhibition roll-up banners.',
    address: '25 Pademba Road',
    city: 'Freetown',
    distanceKm: 1.9,
    phone: '+232 78 990 011',
    whatsapp: '+232 78 990 011',
    email: 'orders@precisionprinting.sl',
    openingHours: 'Mon - Fri: 8:00 AM - 6:00 PM • Sat: 9:00 AM - 3:00 PM',
    isOpenNow: true,
    coordinates: { lat: 8.4795, lng: -13.2360 },
    badges: ['Verified Provider', 'Bulk Discounts', 'Fast Turnaround'],
    photos: [
      'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80'
    ],
    servicesOffered: [
      { id: 'srv-pr-1', name: 'Roll-Up Banner & Stand Complete', price: 40, durationMinutes: 120, description: 'Full colour 2x0.85m PVC roll-up banner with aluminium stand and carry bag.' },
      { id: 'srv-pr-2', name: 'Corporate Business Cards (Pack of 200)', price: 20, durationMinutes: 60, description: 'Heavy 350gsm matte/gloss laminate with round corner options.' }
    ]
  }
];

export const DISCOVERY_CATEGORIES = [
  { id: 'all', name: 'All Offerings', icon: 'Sparkles', count: 48 },
  { id: 'electronics', name: 'Electronics & Tech', icon: 'Smartphone', count: 18 },
  { id: 'repairs', name: 'Repairs & Services', icon: 'Wrench', count: 12 },
  { id: 'apparel', name: 'Fashion & Tailoring', icon: 'Shirt', count: 9 },
  { id: 'home', name: 'Home & Construction', icon: 'Home', count: 7 },
  { id: 'printing', name: 'Printing & Corporate', icon: 'Printer', count: 6 },
  { id: 'grocery', name: 'Food & Provisions', icon: 'ShoppingBag', count: 14 }
];
