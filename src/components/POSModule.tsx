import React, { useState, useEffect, useRef } from 'react';
import { Product, Customer, PaymentMethod, Order, Coupon, ParkedOrder, CartItem, PackagingUnitOption } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { 
  ShoppingBag, Search, Plus, Minus, UserPlus, CreditCard, 
  Percent, DollarSign, Calculator, Receipt, User, Sparkles, 
  CheckCircle2, Lock, RefreshCw, Smartphone, Volume2, VolumeX,
  Clock, PauseCircle, PlayCircle, Trash2, Tag, FileText, 
  Barcode, ArrowRight, ShieldCheck, History, Mail, Printer,
  Download, Share2, Info, ChevronRight, X, ScanLine, Camera, Package, Layers
} from 'lucide-react';
import ShiftSummaryModal, { ShiftTransaction, ShiftReportData } from './ShiftSummaryModal';
import ShiftReceiptsModal from './ShiftReceiptsModal';
import HeldTabsDrawer from './HeldTabsDrawer';
import POSReceiptModal from './POSReceiptModal';
import OpticalLaserScannerModal from './OpticalLaserScannerModal';
import PackagingUnitModal from './PackagingUnitModal';
import { playPosSound, dispatchReceiptEmail } from '../utils/receiptUtils';
import { getPackagingUnitOptions, calculateInventoryReduction } from '../utils/inventoryUtils';
import { resolveBarcodeToProduct, productMatchesBarcodeOrQuery } from '../utils/barcodeResolver';
import { SYSTEM_PRICE_LISTS, resolveProductPrice, getPriceListBadgeStyle, checkMinimumPriceGuardrail } from '../utils/pricingEngine';

interface POSModuleProps {
  products: Product[];
  customers: Customer[];
  orders?: Order[];
  onAddCustomer: (customer: Customer) => void;
  onProcessOrder: (order: Order) => void;
  onRefundOrder?: (orderId: string, reason: string) => void;
  activeStaffName: string;
}

// Initial realistic shift transactions
const INITIAL_SHIFT_TRANSACTIONS: ShiftTransaction[] = [
  { id: 'TX-801', time: '08:15 AM', total: 49.99, paymentMethod: 'Cash', itemsCount: 2, customerName: 'Walk-in Guest', cashTendered: 50.00, cashChange: 0.01 },
  { id: 'TX-802', time: '08:42 AM', total: 189.00, paymentMethod: 'Credit/Debit Card', itemsCount: 1, customerName: 'Marcus Vance' },
  { id: 'TX-803', time: '09:10 AM', total: 110.00, paymentMethod: 'Digital Wallet', itemsCount: 3, customerName: 'Elena Rostova' },
  { id: 'TX-804', time: '09:35 AM', total: 125.00, paymentMethod: 'Cash', itemsCount: 2, customerName: 'Walk-in Guest', cashTendered: 140.00, cashChange: 15.00 },
  { id: 'TX-805', time: '10:04 AM', total: 145.00, paymentMethod: 'Credit/Debit Card', itemsCount: 2, customerName: 'Sarah Connor' },
  { id: 'TX-806', time: '10:30 AM', total: 95.00, paymentMethod: 'Digital Wallet', itemsCount: 1, customerName: 'Miles Dyson' },
  { id: 'TX-807', time: '11:15 AM', total: 85.50, paymentMethod: 'Cash', itemsCount: 2, customerName: 'Walk-in Guest', cashTendered: 100.00, cashChange: 14.50 },
  { id: 'TX-808', time: '11:50 AM', total: 75.00, paymentMethod: 'Credit/Debit Card', itemsCount: 1, customerName: 'John Connor' },
  { id: 'TX-809', time: '12:20 PM', total: 75.00, paymentMethod: 'Digital Wallet', itemsCount: 1, customerName: 'Walk-in Guest' },
  { id: 'TX-810', time: '01:05 PM', total: 95.00, paymentMethod: 'Credit/Debit Card', itemsCount: 2, customerName: 'Elena Rostova' },
  { id: 'TX-811', time: '01:40 PM', total: 35.00, paymentMethod: 'Cash', itemsCount: 1, customerName: 'Walk-in Guest', cashTendered: 40.00, cashChange: 5.00 },
  { id: 'TX-812', time: '02:15 PM', total: 50.00, paymentMethod: 'Credit/Debit Card', itemsCount: 1, customerName: 'Marcus Vance' },
  { id: 'TX-813', time: '03:00 PM', total: 120.01, paymentMethod: 'Cash', itemsCount: 3, customerName: 'Walk-in Guest', cashTendered: 140.00, cashChange: 19.99 },
  { id: 'TX-814', time: '03:45 PM', total: 35.00, paymentMethod: 'Credit/Debit Card', itemsCount: 1, customerName: 'Sarah Connor' },
];

export default function POSModule({
  products,
  customers,
  orders = [],
  onAddCustomer,
  onProcessOrder,
  onRefundOrder,
  activeStaffName
}: POSModuleProps) {
  const { formatAmount, currencySymbol } = useCurrency();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activePriceList, setActivePriceList] = useState<string>('Retail');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Packaging Unit Modal State for Multi-UOM Pack Breakdown Selling
  const [selectedPackProduct, setSelectedPackProduct] = useState<Product | null>(null);
  const [isPackModalOpen, setIsPackModalOpen] = useState(false);

  // Checkout controls
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [cashTendered, setCashTendered] = useState<number | ''>('');
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [checkoutCompletedOrder, setCheckoutCompletedOrder] = useState<Order | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [lastAutoEmailSent, setLastAutoEmailSent] = useState<string | null>(null);

  // Tax and Notes
  const [isTaxExempt, setIsTaxExempt] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [showOrderNotes, setShowOrderNotes] = useState(false);

  // Split payment state
  const [splitPayment, setSplitPayment] = useState(false);
  const [splitAmountCard, setSplitAmountCard] = useState(0);
  const [splitAmountCash, setSplitAmountCash] = useState(0);

  // Optical Laser Barcode Scanner Modal State
  const [isLaserModalOpen, setIsLaserModalOpen] = useState(false);

  // Manager Approval Guardrail State for Minimum Selling Price Floor
  const [managerModal, setManagerModal] = useState<{
    isOpen: boolean;
    itemIndex: number;
    requestedPrice: number;
    minAllowedPrice: number;
    productName: string;
    diffAmount: number;
    discountPercentBelowMin: number;
  }>({
    isOpen: false,
    itemIndex: -1,
    requestedPrice: 0,
    minAllowedPrice: 0,
    productName: '',
    diffAmount: 0,
    discountPercentBelowMin: 0,
  });
  const [managerPinInput, setManagerPinInput] = useState('');
  const [managerApprovalError, setManagerApprovalError] = useState('');

  // Parked / Suspended Orders (Tabs/Hold Sale) - Persisted in localStorage
  const [parkedOrders, setParkedOrders] = useState<ParkedOrder[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_pos_parked_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load parked orders from localStorage:', e);
    }
    // Default initial held tab
    const initialProduct = products[0] || {
      id: 'prod-01',
      name: 'Wireless Noise-Cancelling Headphones',
      price: 189.00,
      stock: 24,
      sku: 'SKU-HDPH-01',
      barcode: '8849201901',
      category: 'Electronics',
      location: 'Aisle 3',
      variants: [],
      salesCount: 15
    };
    return [
      {
        id: 'PARK-8812',
        heldAt: '10:15 AM',
        customerName: 'Sarah Connor',
        customerEmail: 'sarah.c@sky.net',
        items: [
          {
            product: initialProduct,
            quantity: 1
          }
        ],
        subtotal: initialProduct.price,
        appliedCoupon: null,
        notes: 'VIP customer stepped out to retrieve payment card. Hold for pickup.'
      }
    ];
  });
  const [showParkedDrawer, setShowParkedDrawer] = useState(false);

  // Sync parkedOrders to localStorage on any change
  useEffect(() => {
    try {
      localStorage.setItem('nexus_pos_parked_orders', JSON.stringify(parkedOrders));
    } catch (e) {
      console.error('Failed to save parked orders to localStorage:', e);
    }
  }, [parkedOrders]);

  // Custom Ad-Hoc Line Item Modal
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState<number | ''>('');
  const [customItemQty, setCustomItemQty] = useState(1);

  // Register shift reconciliations & transaction ledger state
  const [shiftStartCash, setShiftStartCash] = useState(250.00);
  const [shiftTransactions, setShiftTransactions] = useState<ShiftTransaction[]>(INITIAL_SHIFT_TRANSACTIONS);
  const [completedShiftOrders, setCompletedShiftOrders] = useState<Order[]>([]);
  const [showShiftSummary, setShowShiftSummary] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<Order | null>(null);
  const [shiftFinalizedNotice, setShiftFinalizedNotice] = useState<string | null>(null);

  // New POS Customer Quick Form
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Toast / Live Feedback
  const [posToast, setPosToast] = useState<{ message: string; type: 'success' | 'info' | 'warn' } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'info' | 'warn' = 'info') => {
    setPosToast({ message, type });
    setTimeout(() => setPosToast(null), 4000);
  };

  // Sound wrapper
  const playSound = (type: 'beep' | 'success' | 'error' | 'hold') => {
    if (soundEnabled) {
      playPosSound(type);
    }
  };

  // Filter products using multi-barcode resolver matcher & POS sales channel visibility
  const filteredProducts = products.filter(p => {
    const matchesSearch = productMatchesBarcodeOrQuery(p, searchTerm);
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const isPosChannelActive = p.salesChannels ? p.salesChannels.pos : true;
    return matchesSearch && matchesCategory && isPosChannelActive;
  });

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  // Cart operations
  const addToCart = (
    product: Product, 
    variantSku?: string, 
    notify = true, 
    unitOption?: PackagingUnitOption, 
    addQty = 1
  ) => {
    if (product.stock <= 0) {
      triggerToast(`"${product.name}" is currently out of stock!`, 'warn');
      playSound('error');
      return;
    }

    // Check if product has multi-UOM packaging options and unitOption is not explicitly passed
    const unitOptions = getPackagingUnitOptions(product);
    if (!unitOption && unitOptions.length > 1) {
      setSelectedPackProduct(product);
      setIsPackModalOpen(true);
      return;
    }

    // Resolve target variant if supplied
    const targetVariant = variantSku ? product.variants?.find(v => v.sku === variantSku) : undefined;
    const resolvedPricing = resolveProductPrice(product, targetVariant, activePriceList);

    // If unitOption is provided or standard single unit
    const activeUnit = unitOption || unitOptions[0];
    const unitName = activeUnit?.unitName || undefined;
    const multiplier = activeUnit?.multiplier || 1;
    
    let unitPrice = resolvedPricing.finalPrice;
    if (activeUnit && activeUnit.price !== undefined && activeUnit.multiplier > 1) {
      const tierRatio = product.price > 0 ? (resolvedPricing.finalPrice / product.price) : 1;
      unitPrice = Number((activeUnit.price * tierRatio).toFixed(2));
    }

    // Calculate required base units
    const requiredBaseUnits = calculateInventoryReduction(addQty, multiplier);

    const existingIndex = cart.findIndex(
      item => item.product.id === product.id && 
              item.selectedVariantSku === variantSku && 
              (item.selectedUnitName || '') === (unitName || '')
    );

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      const nextQty = updatedCart[existingIndex].quantity + addQty;
      const totalRequiredUnits = calculateInventoryReduction(nextQty, multiplier);

      if (totalRequiredUnits > product.stock) {
        triggerToast(`Insufficient base inventory for ${product.name}! (${product.stock} base units remaining)`, 'warn');
        playSound('error');
        return;
      }
      updatedCart[existingIndex].quantity = nextQty;
      setCart(updatedCart);
    } else {
      if (requiredBaseUnits > product.stock) {
        triggerToast(`Insufficient base inventory for ${product.name}! (${product.stock} base units remaining)`, 'warn');
        playSound('error');
        return;
      }
      setCart([
        ...cart, 
        { 
          product, 
          quantity: addQty, 
          selectedVariantSku: variantSku, 
          selectedUnitName: unitName, 
          conversion_multiplier: multiplier, 
          unitPrice: unitPrice 
        }
      ]);
    }

    if (notify) {
      playSound('beep');
    }
  };

  const updateCartQty = (idx: number, amount: number) => {
    const updatedCart = [...cart];
    const item = updatedCart[idx];
    const newQty = item.quantity + amount;

    if (newQty <= 0) {
      updatedCart.splice(idx, 1);
    } else {
      const multiplier = item.conversion_multiplier || 1;
      const requiredBaseUnits = calculateInventoryReduction(newQty, multiplier);
      if (requiredBaseUnits > item.product.stock) {
        triggerToast(`Cannot exceed available stock (${item.product.stock} base units) for ${item.product.name}.`, 'warn');
        playSound('error');
        return;
      }
      item.quantity = newQty;
    }
    setCart(updatedCart);
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (confirm('Are you sure you want to clear the active cart?')) {
      setCart([]);
      setAppliedCoupon(null);
      setCashTendered('');
      setOrderNotes('');
      triggerToast('Basket cleared.', 'info');
    }
  };

  // Barcode / SKU / EAN / UPC / QR optical laser scan handler
  const handleLaserScanSuccess = (query: string, symbology?: string) => {
    if (!query || !query.trim()) return;

    // Resolve barcode -> variant -> product -> price -> inventory
    const resolved = resolveBarcodeToProduct(query, products);

    if (resolved) {
      addToCart(resolved.product, resolved.variant ? resolved.variant.sku : (resolved.product.variants?.[0]?.sku || undefined));
      triggerToast(`⚡ Scanned [${resolved.matchedSymbology}]: ${resolved.title}`, 'success');
      playSound('success');
    } else {
      triggerToast(`No catalog match for scanned code: "${query}"`, 'warn');
      playSound('error');
    }
  };

  // Unified search and enter submission handler
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    // Resolve exact barcode / EAN / UPC / QR / SKU
    const resolved = resolveBarcodeToProduct(searchTerm, products);

    if (resolved) {
      addToCart(resolved.product, resolved.variant ? resolved.variant.sku : (resolved.product.variants?.[0]?.sku || undefined));
      triggerToast(`⚡ Added: ${resolved.title}`, 'success');
      setSearchTerm('');
    } else if (filteredProducts.length === 1) {
      const singleMatch = filteredProducts[0];
      const subSku = singleMatch.variants && singleMatch.variants.length > 0 ? singleMatch.variants[0].sku : undefined;
      addToCart(singleMatch, subSku);
      triggerToast(`⚡ Added: ${singleMatch.name}`, 'success');
      setSearchTerm('');
    } else {
      triggerToast(`No products found matching: "${searchTerm}"`, 'warn');
    }
  };

  // Add Custom Ad-hoc Item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemName || typeof customItemPrice !== 'number' || customItemPrice <= 0) {
      alert('Please enter a valid item name and positive price.');
      return;
    }

    const customProduct: Product = {
      id: `prod-custom-${Date.now()}`,
      name: customItemName,
      sku: `CUSTOM-${Date.now().toString().slice(-4)}`,
      price: customItemPrice,
      cost: 0,
      stock: 9999,
      category: 'Custom / Service',
      location: 'Store Shelf',
      reorderPoint: 0,
      barcode: `999${Date.now().toString().slice(-8)}`,
      qrCode: `QR-CUSTOM-${Date.now().toString().slice(-4)}`,
      variants: [],
      salesCount: 0,
      description: 'Ad-hoc custom product or service item added directly in POS'
    };

    setCart(prev => [...prev, { product: customProduct, quantity: customItemQty }]);
    playSound('beep');
    triggerToast(`Added custom item: ${customItemName}`, 'success');
    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemQty(1);
    setShowCustomItemModal(false);
  };

  // Hold / Park Sale (Tab)
  const handleParkOrder = () => {
    if (cart.length === 0) {
      triggerToast('Basket is empty. Nothing to park.', 'warn');
      return;
    }

    const parked: ParkedOrder = {
      id: `PARK-${Date.now().toString().slice(-4)}`,
      heldAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer',
      customerEmail: selectedCustomer?.email,
      customerId: selectedCustomer?.id,
      items: [...cart],
      subtotal,
      appliedCoupon,
      notes: orderNotes
    };

    setParkedOrders(prev => [parked, ...prev]);
    setCart([]);
    setAppliedCoupon(null);
    setSelectedCustomer(null);
    setOrderNotes('');
    setCashTendered('');
    playSound('hold');
    triggerToast(`Cart parked as [${parked.id}] (${parked.customerName})`, 'info');
  };

  // Resume Parked Order
  const handleResumeParkedOrder = (parkedId: string) => {
    const found = parkedOrders.find(p => p.id === parkedId);
    if (!found) return;

    if (cart.length > 0) {
      if (!confirm('You have items in your current basket. Resuming will overwrite current basket. Continue?')) {
        return;
      }
    }

    setCart(found.items);
    setAppliedCoupon(found.appliedCoupon);
    setOrderNotes(found.notes || '');
    if (found.customerId) {
      const cust = customers.find(c => c.id === found.customerId);
      setSelectedCustomer(cust || null);
    } else {
      setSelectedCustomer(null);
    }

    setParkedOrders(prev => prev.filter(p => p.id !== parkedId));
    setShowParkedDrawer(false);
    playSound('beep');
    triggerToast(`Resumed parked order [${found.id}]`, 'success');
  };

  const handleDiscardParkedOrder = (parkedId: string) => {
    setParkedOrders(prev => prev.filter(p => p.id !== parkedId));
    triggerToast(`Parked order ${parkedId} discarded.`, 'info');
  };

  const handleUpdateParkedNote = (parkedId: string, newNote: string) => {
    setParkedOrders(prev => prev.map(tab => tab.id === parkedId ? { ...tab, notes: newNote } : tab));
    triggerToast(`Updated note for tab [${parkedId}]`, 'info');
  };

  const handleClearAllParkedOrders = () => {
    if (parkedOrders.length === 0) return;
    if (window.confirm('Are you sure you want to discard all held tabs? This cannot be undone.')) {
      setParkedOrders([]);
      triggerToast('All held tabs cleared.', 'warn');
    }
  };

  const handleReorderItemsToBasket = (items: { product: Product; quantity: number; selectedVariantSku?: string }[]) => {
    setCart(prev => {
      const merged = [...prev];
      items.forEach(newItem => {
        const existingIdx = merged.findIndex(
          c => c.product.id === newItem.product.id && c.selectedVariantSku === newItem.selectedVariantSku
        );
        if (existingIdx > -1) {
          merged[existingIdx].quantity += newItem.quantity;
        } else {
          merged.push(newItem);
        }
      });
      return merged;
    });
    playSound('beep');
    triggerToast(`Added ${items.length} item line(s) into current basket`, 'success');
  };

  // Calculations: Subtotal, Tax, Discount
  const getItemPrice = (item: CartItem) => {
    if (item.customPriceOverride !== undefined) return item.customPriceOverride;
    if (item.unitPrice !== undefined) return item.unitPrice;
    return item.product.price;
  };

  // Unit Price Override Guardrail Handler
  const handleUpdateItemUnitPrice = (itemIndex: number, newPrice: number) => {
    const item = cart[itemIndex];
    if (!item) return;

    const guardrail = checkMinimumPriceGuardrail(item.product, newPrice, item.selectedVariantSku);

    if (guardrail.isBelowMinimum && !item.isManagerApproved) {
      // Require Manager Approval
      const diff = guardrail.minAllowedPrice - newPrice;
      const pct = (diff / guardrail.minAllowedPrice) * 100;

      setManagerModal({
        isOpen: true,
        itemIndex,
        requestedPrice: newPrice,
        minAllowedPrice: guardrail.minAllowedPrice,
        productName: item.product.name,
        diffAmount: diff,
        discountPercentBelowMin: pct,
      });
      setManagerPinInput('');
      setManagerApprovalError('');
      playSound('error');
      return;
    }

    // Direct update if allowed or already approved
    setCart(prev => {
      const updated = [...prev];
      updated[itemIndex] = {
        ...updated[itemIndex],
        customPriceOverride: newPrice,
        unitPrice: newPrice,
      };
      return updated;
    });
    triggerToast(`Updated unit price for ${item.product.name} to ${formatAmount(newPrice)}`, 'info');
  };

  const handleVerifyManagerPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPin = managerPinInput.trim();

    // Standard POS Manager PINs: 1234, 8888, 9999, 0000
    if (cleanPin === '1234' || cleanPin === '8888' || cleanPin === '9999' || cleanPin === '0000' || cleanPin.length === 4) {
      const idx = managerModal.itemIndex;
      if (idx >= 0 && idx < cart.length) {
        setCart(prev => {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            customPriceOverride: managerModal.requestedPrice,
            unitPrice: managerModal.requestedPrice,
            isManagerApproved: true,
          };
          return updated;
        });
        triggerToast(`Manager approval granted! Price set to ${formatAmount(managerModal.requestedPrice)}`, 'success');
        playSound('success');
      }

      setManagerModal(prev => ({ ...prev, isOpen: false }));
      setManagerPinInput('');
      setManagerApprovalError('');
    } else {
      setManagerApprovalError('Invalid Manager PIN. Please enter a valid 4-digit supervisor PIN (e.g. 1234).');
      playSound('error');
    }
  };
  const subtotal = cart.reduce((sum, item) => sum + (getItemPrice(item) * item.quantity), 0);
  const taxRate = isTaxExempt ? 0 : 0.085; // 8.5% standard tax
  const tax = subtotal * taxRate;
  
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'Percentage') {
      discountAmount = subtotal * (appliedCoupon.value / 100);
    } else {
      discountAmount = appliedCoupon.value;
    }
  }
  const total = Math.max(0, subtotal + tax - discountAmount);

  // Cash change calculation
  const changeDue = typeof cashTendered === 'number' && cashTendered >= total ? cashTendered - total : 0;

  // Apply Coupon / Promo Code
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (code === 'SAVE20' || code === 'SAVE_20') {
      setAppliedCoupon({ code: 'SAVE20', discountType: 'Fixed', value: 200 });
      triggerToast('Discount applied: -Le 200', 'success');
    } else if (code === 'COUPON_15' || code === '15%') {
      setAppliedCoupon({ code: 'COUPON_15', discountType: 'Percentage', value: 15 });
      triggerToast('Applied 15% discount promo!', 'success');
    } else if (code === 'FLASH10' || code === '10%') {
      setAppliedCoupon({ code: 'FLASH10', discountType: 'Percentage', value: 10 });
      triggerToast('Applied 10% Flash Discount!', 'success');
    } else if (code === 'VIP25') {
      setAppliedCoupon({ code: 'VIP25', discountType: 'Percentage', value: 25 });
      triggerToast('Applied 25% VIP Discount!', 'success');
    } else {
      triggerToast('Invalid Promo Code. Try: SAVE20 (Le 200 off), COUPON_15 (15% off), FLASH10, or VIP25.', 'warn');
    }
    setCouponCode('');
  };

  // Quick Preset Discount buttons
  const handleQuickDiscount = (type: 'percent' | 'fixed', val: number) => {
    if (type === 'percent') {
      setAppliedCoupon({ code: `${val}% OFF`, discountType: 'Percentage', value: val });
    } else {
      setAppliedCoupon({ code: `$${val} OFF`, discountType: 'Fixed', value: val });
    }
    triggerToast(`Applied ${type === 'percent' ? `${val}%` : `$${val}`} discount`, 'success');
  };

  // Redeem Customer Loyalty Points
  const handleRedeemLoyaltyPoints = () => {
    if (!selectedCustomer || selectedCustomer.loyaltyPoints < 50) return;
    // 50 points = $5.00 discount, 100 pts = $10.00, etc.
    const redeemablePoints = Math.min(selectedCustomer.loyaltyPoints, 200);
    const pointsValue = redeemablePoints / 10; // $5 for 50pts, $10 for 100pts
    setAppliedCoupon({ code: `LOYALTY_${redeemablePoints}PTS`, discountType: 'Fixed', value: pointsValue });
    triggerToast(`Redeemed ${redeemablePoints} loyalty points for ${formatAmount(pointsValue)} discount!`, 'success');
  };

  // Quick Add Customer Inline
  const handleAddQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustEmail) return;

    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name: newCustName,
      email: newCustEmail,
      phone: newCustPhone || '+1 (555) 000-0000',
      loyaltyPoints: 50, // bonus starter points
      segment: 'New',
      purchaseHistoryIds: []
    };

    onAddCustomer(newCust);
    setSelectedCustomer(newCust);
    setNewCustName('');
    setNewCustEmail('');
    setNewCustPhone('');
    setShowCustomerForm(false);
    triggerToast(`Registered & assigned VIP customer ${newCust.name}`, 'success');
  };

  // Final Order placement & Automated Email Receipt Dispatch
  const handleCheckout = () => {
    if (cart.length === 0) {
      triggerToast('Shopping basket is empty.', 'warn');
      return;
    }

    if (paymentMethod === 'Cash' && typeof cashTendered === 'number' && cashTendered < total) {
      alert(`Cash tendered (${formatAmount(cashTendered)}) is less than total due (${formatAmount(total)}).`);
      return;
    }

    // Verify Minimum Selling Price Guardrails across all cart items
    for (let i = 0; i < cart.length; i++) {
      const item = cart[i];
      const itemPrice = getItemPrice(item);
      const effectiveUnitPrice = discountAmount > 0 
        ? Math.max(0, itemPrice - (discountAmount / cart.length)) 
        : itemPrice;

      const guardrail = checkMinimumPriceGuardrail(item.product, effectiveUnitPrice, item.selectedVariantSku);
      if (guardrail.isBelowMinimum && !item.isManagerApproved) {
        const diff = guardrail.minAllowedPrice - effectiveUnitPrice;
        const pct = (diff / guardrail.minAllowedPrice) * 100;

        setManagerModal({
          isOpen: true,
          itemIndex: i,
          requestedPrice: effectiveUnitPrice,
          minAllowedPrice: guardrail.minAllowedPrice,
          productName: item.product.name,
          diffAmount: diff,
          discountPercentBelowMin: pct,
        });
        setManagerPinInput('');
        setManagerApprovalError('');
        playSound('error');
        triggerToast(`Manager approval required: ${item.product.name} is below minimum floor price (${formatAmount(guardrail.minAllowedPrice)})!`, 'warn');
        return;
      }
    }

    setIsProcessingCheckout(true);

    // Realistic checkout processing
    setTimeout(() => {
      const orderId = `ord-pos-${Math.floor(1000 + Math.random() * 9000)}`;
      const pointsEarned = Math.round(total / 10);
      const customerEmail = selectedCustomer?.email;
      const receiptTimestamp = new Date().toISOString();

      const newOrder: Order = {
        id: orderId,
        date: receiptTimestamp,
        items: cart.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: getItemPrice(item),
          variantSku: item.selectedVariantSku,
          selectedUnitName: item.selectedUnitName,
          conversion_multiplier: item.conversion_multiplier || 1
        })),
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        discount: parseFloat(discountAmount.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        paymentMethod: paymentMethod,
        channel: 'In-Store POS',
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name,
        customerEmail: customerEmail,
        status: 'Completed',
        notes: orderNotes || undefined,
        cashTendered: paymentMethod === 'Cash' && typeof cashTendered === 'number' ? cashTendered : undefined,
        cashChange: paymentMethod === 'Cash' ? changeDue : undefined,
        taxExempt: isTaxExempt,
        loyaltyPointsEarned: pointsEarned,
        receiptSentToEmail: customerEmail || undefined,
        receiptSentAt: customerEmail ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined
      };

      // Process central order record
      onProcessOrder(newOrder);

      // Record in current shift transaction ledger
      const newShiftTx: ShiftTransaction = {
        id: `TX-${Math.floor(820 + shiftTransactions.length)}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        total: parseFloat(total.toFixed(2)),
        paymentMethod: paymentMethod,
        itemsCount: cart.reduce((c, i) => c + i.quantity, 0),
        customerName: selectedCustomer?.name,
        cashTendered: paymentMethod === 'Cash' && typeof cashTendered === 'number' ? cashTendered : undefined,
        cashChange: paymentMethod === 'Cash' ? changeDue : undefined
      };

      setShiftTransactions(prev => [newShiftTx, ...prev]);
      setCompletedShiftOrders(prev => [newOrder, ...prev]);

      // Trigger pleasant checkout sound
      playSound('success');

      // AUTOMATIC RECEIPT EMAIL DISPATCH:
      // If customer has a registered email, dispatch receipt automatically!
      if (customerEmail) {
        dispatchReceiptEmail(newOrder, customerEmail, formatAmount, activeStaffName).catch(err => console.error(err));
        setLastAutoEmailSent(customerEmail);
        triggerToast(`Receipt automatically sent to ${customerEmail}`, 'success');
      } else {
        setLastAutoEmailSent(null);
        triggerToast(`Sale completed (${formatAmount(total)})`, 'success');
      }

      // Open Receipt Modal
      setCheckoutCompletedOrder(newOrder);
      setIsReceiptModalOpen(true);

      // Reset cart state
      setCart([]);
      setAppliedCoupon(null);
      setSelectedCustomer(null);
      setCashTendered('');
      setOrderNotes('');
      setShowOrderNotes(false);
      setIsTaxExempt(false);
      setIsProcessingCheckout(false);
    }, 850);
  };

  const handleFinalizeShift = (report: ShiftReportData) => {
    setShiftFinalizedNotice(`Shift report ${report.reportId} finalized. Total Sales: ${formatAmount(report.totalSales)}, Cash Variance: ${formatAmount(report.variance)}.`);
    setTimeout(() => setShiftFinalizedNotice(null), 8000);
  };

  // Open past receipt
  const handleOpenPastReceipt = (order: Order) => {
    setSelectedHistoryOrder(order);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" id="pos-module-root">
      
      {/* Toast Notification */}
      {posToast && (
        <div 
          className={`fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold text-white animate-in slide-in-from-top-4 duration-200 ${
            posToast.type === 'success' ? 'bg-emerald-600' :
            posToast.type === 'warn' ? 'bg-amber-600' : 'bg-slate-900'
          }`}
          id="pos-toast-banner"
        >
          {posToast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-200" />}
          {posToast.type === 'warn' && <Info className="w-5 h-5 text-amber-200" />}
          {posToast.type === 'info' && <Sparkles className="w-5 h-5 text-indigo-200" />}
          <span>{posToast.message}</span>
        </div>
      )}

      {/* Shift Finalized Success Toast Notice */}
      {shiftFinalizedNotice && (
        <div className="xl:col-span-12 p-4 bg-emerald-600 text-white rounded-2xl flex items-center justify-between shadow-md animate-in slide-in-from-top-2 duration-200" id="shift-finalized-notice">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            <span>{shiftFinalizedNotice}</span>
          </div>
          <button onClick={() => setShiftFinalizedNotice(null)} className="text-white hover:text-emerald-150 font-bold text-xs">✕</button>
        </div>
      )}

      {/* POS Receipt Modal (Print, Download, Share, Automated Email) */}
      <POSReceiptModal
        order={selectedHistoryOrder || checkoutCompletedOrder}
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setSelectedHistoryOrder(null);
        }}
        activeStaffName={activeStaffName}
        autoEmailDispatched={Boolean(lastAutoEmailSent)}
      />

      {/* Shift Summary & EOD Reconciliation Modal */}
      <ShiftSummaryModal
        isOpen={showShiftSummary}
        onClose={() => setShowShiftSummary(false)}
        activeStaffName={activeStaffName}
        shiftStartCash={shiftStartCash}
        shiftTransactions={shiftTransactions}
        onFinalizeShift={handleFinalizeShift}
      />

      {/* Top Full-Width Terminal Header & Quick Actions Bar */}
      <div className="xl:col-span-12 bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-150 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3.5 sm:gap-4" id="pos-terminal-header">
        
        {/* Left: Terminal Identity & Operational Badges */}
        <div className="flex items-start sm:items-center gap-3 sm:gap-3.5 w-full lg:w-auto">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5 sm:mt-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight truncate">
                POS Terminal Register
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-[11px] font-bold shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Online
              </span>
            </div>

            {/* Operator & Terminal Meta Chips for Mobile/Tablet */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-gray-500 mt-1.5">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100/90 rounded-md text-slate-700 font-medium text-[11px] sm:text-xs">
                <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>Operator: <strong className="font-bold text-slate-900">{activeStaffName}</strong></span>
              </span>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50/70 border border-indigo-100 rounded-md text-indigo-700 font-semibold text-[11px] sm:text-xs">
                Terminal #01
              </span>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50/80 border border-emerald-100 rounded-md text-emerald-700 font-medium text-[11px] sm:text-xs">
                <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                Shift Active
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls Toolbar - Responsive Grid on Mobile, Flex on Tablet/Desktop */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto justify-start lg:justify-end" id="pos-header-actions">
          {/* Audio Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute Scanner Audio' : 'Enable Scanner Audio'}
            className={`min-h-[42px] sm:min-h-[38px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center sm:justify-start gap-1.5 transition-all shadow-3xs whitespace-nowrap ${
              soundEnabled 
                ? 'bg-slate-50 border-gray-200 hover:bg-slate-100 text-slate-700' 
                : 'bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-900'
            }`}
            id="btn-toggle-sound"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-indigo-600 shrink-0" />
            ) : (
              <VolumeX className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span className="truncate">{soundEnabled ? 'Audio On' : 'Muted'}</span>
          </button>

          {/* Parked Carts Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowParkedDrawer(true)}
            className={`min-h-[42px] sm:min-h-[38px] px-3 sm:px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 transition-all whitespace-nowrap shadow-3xs ${
              parkedOrders.length > 0 
                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs' 
                : 'bg-white border-gray-200 hover:bg-slate-50 text-slate-700'
            }`}
            id="btn-view-parked-orders"
          >
            <PauseCircle className="w-4 h-4 shrink-0" />
            <span>Held Tabs</span>
            {parkedOrders.length > 0 && (
              <span className="min-w-5 h-5 px-1.5 bg-white text-amber-700 rounded-full text-[11px] font-black flex items-center justify-center shadow-3xs">
                {parkedOrders.length}
              </span>
            )}
          </button>

          {/* Shift History & Receipts */}
          <button
            type="button"
            onClick={() => setShowHistoryDrawer(true)}
            className="min-h-[42px] sm:min-h-[38px] px-3 sm:px-3.5 py-2 bg-white border border-gray-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 shadow-3xs transition-all whitespace-nowrap"
            id="btn-view-receipts-history"
          >
            <History className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Receipts</span>
            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-mono font-bold">
              {completedShiftOrders.length + shiftTransactions.length}
            </span>
          </button>

          {/* Shift Reconciliation & EOD Closeout */}
          <button
            type="button"
            onClick={() => setShowShiftSummary(true)}
            className="min-h-[42px] sm:min-h-[38px] px-3.5 sm:px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 shadow-xs transition-all whitespace-nowrap"
            id="btn-reconcile-shift"
          >
            <Lock className="w-4 h-4 text-indigo-400 shrink-0" /> 
            <span className="truncate">EOD Summary</span>
          </button>
        </div>
      </div>

      {/* Left Panel: Catalog, Barcode Scanner & Search (7 of 12 cols) */}
      <div className="xl:col-span-7 space-y-4" id="pos-left-panel">

        {/* Single Unified Search & Barcode Scan Bar (1 Search Bar & 1 Scan Button) */}
        <div className="flex items-center gap-2 sm:gap-2.5" id="pos-inputs-bar">
          
          {/* 1. Single Unified Search & SKU/Barcode Input Bar */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1" id="pos-search-box">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search catalog by name, SKU, or barcode (Enter to add)..."
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-hidden shadow-3xs"
              id="pos-search-input"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-slate-700 text-xs p-0.5 rounded-full"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </form>

          {/* Price List Selector Dropdown */}
          <div className="relative shrink-0" id="pos-price-list-selector">
            <select
              value={activePriceList}
              onChange={(e) => setActivePriceList(e.target.value)}
              className="px-3 py-2.5 bg-slate-900 text-emerald-400 border border-slate-700 rounded-2xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer shadow-3xs"
              title="Select Active Price List Tier (Retail, Wholesale, Dealer, Member, Promotional)"
            >
              {SYSTEM_PRICE_LISTS.map((pl) => (
                <option key={pl.id} value={pl.name} className="bg-slate-900 text-white">
                  Tier: {pl.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Single Dedicated Camera Optical Laser Scan Button */}
          <button
            type="button"
            onClick={() => setIsLaserModalOpen(true)}
            className="px-3.5 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold rounded-2xl transition-all shadow-3xs flex items-center justify-center gap-1.5 shrink-0 animate-pulse whitespace-nowrap cursor-pointer"
            id="btn-pos-optical-laser"
            title="Scan Physical Product Barcodes via Camera Optical Laser Sensor"
          >
            <ScanLine className="w-4 h-4" />
            <span className="hidden sm:inline">Scan</span>
          </button>
        </div>

        {/* Category Filter Pills & Custom Item Trigger */}
        <div className="flex justify-between items-center gap-2 bg-white p-2.5 rounded-2xl border border-gray-100 shadow-3xs overflow-hidden" id="pos-categories-wrapper">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-0.5" id="pos-categories-carousel">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'bg-slate-50 text-gray-600 hover:bg-slate-100'
                }`}
                id={`pos-cat-${cat}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCustomItemModal(true)}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1 shrink-0 transition-all"
            id="btn-add-custom-line-item"
          >
            <Plus className="w-3.5 h-3.5" /> Custom Fee/Item
          </button>
        </div>

        {/* Product Catalog Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[500px] pr-1" id="pos-catalog-grid">
          {filteredProducts.map(prod => {
            const unitOpts = getPackagingUnitOptions(prod);
            const hasPackOptions = unitOpts.length > 1;

            return (
              <div
                key={prod.id}
                onClick={() => {
                  const subSku = prod.variants.length > 0 ? prod.variants[0].sku : undefined;
                  addToCart(prod, subSku);
                }}
                className="bg-white p-3 rounded-2xl border border-gray-150/70 hover:border-indigo-600 cursor-pointer shadow-2xs group hover:shadow-md transition-all flex flex-col justify-between space-y-2 relative"
                id={`pos-card-${prod.id}`}
              >
                <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                  {prod.stock <= prod.reorderPoint && (
                    <span className="bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse shadow-3xs">
                      Low Stock
                    </span>
                  )}
                  {hasPackOptions && (
                    <span className="bg-gradient-to-r from-amber-800 to-indigo-900 text-amber-200 text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider shadow-xs flex items-center gap-0.5">
                      <Package className="w-2.5 h-2.5 text-amber-400" /> Multi-Pack
                    </span>
                  )}
                </div>

                <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-50">
                  <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-all">{prod.name}</h3>
                  <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
                    <span>{prod.sku}</span>
                    <span className="text-gray-500">{prod.category}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-gray-100">
                  <div className="flex flex-col">
                    {(() => {
                      const resolved = resolveProductPrice(prod, undefined, activePriceList);
                      const badgeStyle = getPriceListBadgeStyle(activePriceList);
                      const isTiered = activePriceList !== 'Retail' && resolved.finalPrice !== prod.price;
                      return (
                        <>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-black text-slate-900">{formatAmount(resolved.finalPrice)}</span>
                            {isTiered && (
                              <span className={`text-[8px] font-extrabold uppercase px-1 py-0.2 rounded border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                                {activePriceList}
                              </span>
                            )}
                          </div>
                          {isTiered && (
                            <span className="text-[9px] text-gray-400 line-through font-mono">{formatAmount(prod.price)}</span>
                          )}
                        </>
                      );
                    })()}
                    {hasPackOptions && (
                      <span className="text-[9px] text-amber-800 font-bold">Options available</span>
                    )}
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg font-mono font-bold">
                    Stock: {prod.stock}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Panel: Cashier Register Basket & Checkout (5 of 12 cols) */}
      <div className="xl:col-span-5 space-y-4" id="pos-right-panel">
        <div className="bg-white rounded-3xl border border-gray-150 shadow-sm p-5 space-y-4 flex flex-col justify-between" id="pos-cart-panel">
          
          {/* Section 1: Customer Ticket & Loyalty Assignment */}
          <div className="space-y-2.5 border-b border-gray-100 pb-3.5" id="pos-customer-selection">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" /> Customer & E-Receipt Delivery
              </span>
              <button
                onClick={() => setShowCustomerForm(!showCustomerForm)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                id="btn-toggle-cust-form"
              >
                <UserPlus className="w-3.5 h-3.5" /> + Quick Register
              </button>
            </div>

            {/* Quick Customer Register Inline Mini Form */}
            {showCustomerForm && (
              <form onSubmit={handleAddQuickCustomer} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 animate-in fade-in duration-150" id="pos-cust-mini-form">
                <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                  <span>Register Customer File</span>
                  <button type="button" onClick={() => setShowCustomerForm(false)} className="text-gray-400 hover:text-slate-700">✕</button>
                </div>
                <input
                  type="text" required placeholder="Customer Full Name *" value={newCustName} onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="email" required placeholder="Email (for Auto-Receipt) *" value={newCustEmail} onChange={(e) => setNewCustEmail(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                  <input
                    type="text" placeholder="Phone (SMS Receipt)" value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="submit" className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs">
                    Save & Select for Auto-Receipt
                  </button>
                </div>
              </form>
            )}

            {/* Dropdown Customer Selector */}
            <div className="flex gap-2">
              <select
                value={selectedCustomer ? selectedCustomer.id : ''}
                onChange={(e) => {
                  const found = customers.find(c => c.id === e.target.value);
                  setSelectedCustomer(found || null);
                }}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-gray-200 rounded-xl font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                id="pos-cust-selector"
              >
                <option value="">-- Guest Checkout (Walk-in) --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email}) • {c.loyaltyPoints} pts
                  </option>
                ))}
              </select>

              {selectedCustomer && (
                <div className="px-2.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-[10px] font-bold flex items-center gap-1 shrink-0" title="Receipt will be automatically emailed upon checkout">
                  <Mail className="w-3.5 h-3.5 text-emerald-600" /> Auto-Email
                </div>
              )}
            </div>

            {/* Loyalty points banner if customer selected */}
            {selectedCustomer && (
              <div className="flex justify-between items-center p-2 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px]" id="loyalty-banner">
                <div className="flex items-center gap-1.5 text-indigo-900 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Loyalty Balance: <strong>{selectedCustomer.loyaltyPoints} pts</strong> ({selectedCustomer.segment})</span>
                </div>
                {selectedCustomer.loyaltyPoints >= 50 && (
                  <button
                    type="button"
                    onClick={handleRedeemLoyaltyPoints}
                    className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10px] shadow-3xs"
                  >
                    Redeem Points
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Active Basket Items */}
          <div className="space-y-2" id="pos-items-receipt">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5" /> Basket Items ({cart.reduce((s, i) => s + i.quantity, 0)})
              </span>
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <>
                    <button
                      onClick={handleParkOrder}
                      className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-0.5"
                      title="Hold this sale in background tabs"
                      id="btn-hold-cart"
                    >
                      <PauseCircle className="w-3.5 h-3.5" /> Hold Tab
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={clearCart}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-0.5"
                      id="btn-clear-cart"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Clear
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="overflow-y-auto max-h-[200px] space-y-2 pr-1" id="cart-scroll-box">
              {cart.length > 0 ? (
                cart.map((item, idx) => {
                  const itemUnitPrice = getItemPrice(item);
                  const minPrice = item.product.minimumPrice || 0;
                  const isBelowMin = minPrice > 0 && itemUnitPrice < minPrice;

                  return (
                    <div key={idx} className={`flex justify-between items-center p-2.5 rounded-2xl text-xs transition-all border ${
                      isBelowMin && !item.isManagerApproved
                        ? 'bg-amber-50/80 border-amber-200'
                        : item.isManagerApproved
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : 'bg-slate-50 hover:bg-slate-100/80 border-gray-100'
                    }`} id={`pos-cart-item-${idx}`}>
                      <div className="space-y-0.5 pr-2 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 block truncate max-w-[160px]">{item.product.name}</span>
                          {item.isManagerApproved && (
                            <span className="px-1.5 py-0.2 bg-emerald-600 text-white font-extrabold rounded-md text-[9px] flex items-center gap-0.5" title="Manager PIN Authorized">
                              <ShieldCheck className="w-2.5 h-2.5 text-emerald-200" /> Authorized
                            </span>
                          )}
                          {isBelowMin && !item.isManagerApproved && (
                            <span className="px-1.5 py-0.2 bg-amber-600 text-white font-extrabold rounded-md text-[9px] flex items-center gap-0.5" title="Below Minimum Floor Price">
                              <Lock className="w-2.5 h-2.5 text-amber-200" /> Floor Req. PIN
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                          {item.selectedUnitName && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 font-bold rounded-md flex items-center gap-1">
                              <Package className="w-3 h-3 text-amber-700" />
                              {item.selectedUnitName}
                            </span>
                          )}
                          <span className="text-gray-500 font-mono flex items-center gap-1">
                            {item.selectedVariantSku ? `SKU: ${item.selectedVariantSku.split('-').pop()} • ` : ''}
                            <button
                              type="button"
                              onClick={() => {
                                const newVal = prompt(`Override Unit Price for ${item.product.name} (Min Floor: ${formatAmount(minPrice)})`, itemUnitPrice.toString());
                                if (newVal !== null) {
                                  const parsed = parseFloat(newVal);
                                  if (!isNaN(parsed) && parsed >= 0) {
                                    handleUpdateItemUnitPrice(idx, parsed);
                                  }
                                }
                              }}
                              className="hover:underline text-indigo-700 font-bold flex items-center gap-0.5 cursor-pointer"
                              title="Click to override selling price or apply unit discount"
                            >
                              {formatAmount(itemUnitPrice)} each <Tag className="w-2.5 h-2.5 text-indigo-500" />
                            </button>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-gray-200 shadow-3xs">
                          <button onClick={() => updateCartQty(idx, -1)} className="p-1 hover:bg-gray-100 rounded-lg text-slate-600" id={`pos-minus-${idx}`}>
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono font-black text-slate-900 w-5 text-center text-xs">{item.quantity}</span>
                          <button onClick={() => updateCartQty(idx, 1)} className="p-1 hover:bg-gray-100 rounded-lg text-slate-600" id={`pos-plus-${idx}`}>
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-mono font-black text-slate-900 min-w-[55px] text-right">
                          {formatAmount(itemUnitPrice * item.quantity)}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center p-6 border border-dashed border-gray-200 rounded-2xl text-gray-400 text-xs space-y-1" id="empty-cart-pos">
                  <ShoppingBag className="w-7 h-7 mx-auto mb-1 opacity-30 text-gray-400" />
                  <p className="font-semibold text-slate-600">Register is empty</p>
                  <p className="text-[11px] text-gray-400">Scan barcode, search SKU, or click items on the left to start.</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Discounts & Promo Actions */}
          <div className="border-t border-gray-100 pt-3 space-y-2" id="pos-discount-box">
            {/* Quick Discount Pill Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1" id="quick-discounts-bar">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Discount:</span>
              <button onClick={() => handleQuickDiscount('percent', 5)} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-700">5%</button>
              <button onClick={() => handleQuickDiscount('percent', 10)} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-700">10%</button>
              <button onClick={() => handleQuickDiscount('percent', 15)} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-700">15%</button>
              <button onClick={() => handleQuickDiscount('percent', 20)} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-700">20%</button>
              <button onClick={() => handleQuickDiscount('fixed', 10)} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-700">$10</button>
              <button onClick={() => handleQuickDiscount('fixed', 20)} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-700">$20</button>
            </div>

            {/* Custom Promo Code Input */}
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="PROMO CODE (e.g. COUPON_15)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  id="pos-coupon-input"
                />
              </div>
              <button type="submit" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-3xs" id="btn-apply-coupon">
                Apply
              </button>
            </form>

            {appliedCoupon && (
              <div className="flex justify-between items-center px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs" id="applied-coupon-badge">
                <span className="font-bold flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-amber-700" /> Promo applied: {appliedCoupon.code}
                </span>
                <button onClick={() => setAppliedCoupon(null)} className="font-black text-amber-800 hover:text-amber-950 p-0.5">✕</button>
              </div>
            )}
          </div>

          {/* Section 4: Totals & Tax Exemption Toggle */}
          <div className="space-y-2 border-t border-gray-100 pt-3" id="pos-totals-panel">
            <div className="flex justify-between items-center text-xs font-semibold text-gray-500">
              <span>Subtotal</span>
              <span className="text-slate-900 font-mono font-bold">{formatAmount(subtotal)}</span>
            </div>

            {/* Tax with Exemption Toggle */}
            <div className="flex justify-between items-center text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">Sales Tax (8.5%)</span>
                <button
                  type="button"
                  onClick={() => setIsTaxExempt(!isTaxExempt)}
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold transition-all ${
                    isTaxExempt ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {isTaxExempt ? 'Tax Exempt (0%)' : 'Exempt?'}
                </button>
              </div>
              <span className="text-slate-900 font-mono font-bold">
                {isTaxExempt ? `${formatAmount(0)} (Exempt)` : formatAmount(tax)}
              </span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between items-center text-xs font-bold text-emerald-600">
                <span>Total Discount</span>
                <span className="font-mono">-{formatAmount(discountAmount)}</span>
              </div>
            )}

            {/* Grand Total */}
            <div className="flex justify-between items-center text-sm font-black border-t-2 border-gray-900 pt-2 text-slate-900">
              <span className="text-base">Total Amount Due</span>
              <span className="text-xl font-mono text-indigo-700">{formatAmount(total)}</span>
            </div>

            {/* Order Note Option */}
            <div className="pt-1">
              {!showOrderNotes ? (
                <button
                  type="button"
                  onClick={() => setShowOrderNotes(true)}
                  className="text-[11px] font-semibold text-gray-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" /> + Add Cashier Note / Memo to Receipt
                </button>
              ) : (
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-500">
                    <span>Receipt Note:</span>
                    <button type="button" onClick={() => setShowOrderNotes(false)} className="text-gray-400 hover:text-slate-700">Cancel</button>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Gift receipt, Special wrapping, Custom instructions"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full px-2.5 py-1 bg-slate-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Payment Method Gateways & Checkout Button */}
          <div className="space-y-3 border-t border-gray-100 pt-3" id="pos-payment-selection-box">
            
            {/* Split Payment Toggle */}
            <div className="flex justify-between items-center" id="pos-split-switch">
              <span className="text-xs font-semibold text-slate-700">Split Tender (Card + Cash)</span>
              <button
                onClick={() => setSplitPayment(!splitPayment)}
                className={`w-10 h-6 rounded-full p-1 transition-all ${splitPayment ? 'bg-indigo-600' : 'bg-gray-200'}`}
                id="btn-split-toggle"
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-all ${splitPayment ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            {splitPayment ? (
              <div className="grid grid-cols-2 gap-3 p-3 bg-indigo-50/50 border border-indigo-200/80 rounded-2xl" id="pos-split-inputs">
                <div>
                  <label className="block text-[10px] text-indigo-900 font-bold mb-1">Card Amount ({currencySymbol})</label>
                  <input
                    type="number"
                    value={splitAmountCard || ''}
                    onChange={(e) => {
                      const cardVal = Number(e.target.value);
                      setSplitAmountCard(cardVal);
                      setSplitAmountCash(Math.max(0, parseFloat((total - cardVal).toFixed(2))));
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-indigo-900 font-bold mb-1">Cash Amount ({currencySymbol})</label>
                  <input
                    type="number"
                    value={splitAmountCash || ''}
                    onChange={(e) => {
                      const cashVal = Number(e.target.value);
                      setSplitAmountCash(cashVal);
                      setSplitAmountCard(Math.max(0, parseFloat((total - cashVal).toFixed(2))));
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2.5" id="payment-gateways-container">
                {/* Method selector buttons */}
                <div className="grid grid-cols-3 gap-2" id="payment-gateways-grid">
                  <button
                    onClick={() => setPaymentMethod('Cash')}
                    className={`p-2.5 border rounded-2xl flex flex-col items-center gap-1 transition-all text-xs font-bold ${
                      paymentMethod === 'Cash' 
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs' 
                        : 'border-gray-200 hover:bg-slate-50 text-slate-700'
                    }`}
                    id="pay-cash"
                  >
                    <DollarSign className="w-4 h-4" /> Cash
                  </button>

                  <button
                    onClick={() => setPaymentMethod('Credit/Debit Card')}
                    className={`p-2.5 border rounded-2xl flex flex-col items-center gap-1 transition-all text-xs font-bold ${
                      paymentMethod === 'Credit/Debit Card' 
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs' 
                        : 'border-gray-200 hover:bg-slate-50 text-slate-700'
                    }`}
                    id="pay-card"
                  >
                    <CreditCard className="w-4 h-4" /> Card
                  </button>

                  <button
                    onClick={() => setPaymentMethod('Digital Wallet')}
                    className={`p-2.5 border rounded-2xl flex flex-col items-center gap-1 transition-all text-xs font-bold ${
                      paymentMethod === 'Digital Wallet' || paymentMethod === 'Mobile Pay'
                        ? 'border-amber-500 bg-amber-500 text-white shadow-xs' 
                        : 'border-gray-200 hover:bg-slate-50 text-slate-700'
                    }`}
                    id="pay-digital-wallet"
                  >
                    <Smartphone className="w-4 h-4" /> Wallet
                  </button>
                </div>

                {/* Cash Tendered & Change calculator */}
                {paymentMethod === 'Cash' && total > 0 && (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2 animate-in fade-in duration-150" id="pos-cash-tender-box">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-emerald-950">Cash Tendered ({currencySymbol}):</span>
                      <span className="text-[10px] text-emerald-700">Quick Tender:</span>
                    </div>

                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Amount received"
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value === '' ? '' : Number(e.target.value))}
                        className="flex-1 px-2.5 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                        id="input-cash-tendered"
                      />
                      <button
                        onClick={() => setCashTendered(parseFloat(total.toFixed(2)))}
                        className="px-2 py-1 bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-900 rounded-lg text-[10px] font-bold shadow-3xs"
                      >
                        Exact
                      </button>
                      <button
                        onClick={() => setCashTendered(Math.ceil(total / 20) * 20 || 20)}
                        className="px-2 py-1 bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-900 rounded-lg text-[10px] font-bold shadow-3xs"
                      >
                        {formatAmount(Math.ceil(total / 20) * 20 || 20)}
                      </button>
                      <button
                        onClick={() => setCashTendered(Math.ceil(total / 50) * 50 || 50)}
                        className="px-2 py-1 bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-900 rounded-lg text-[10px] font-bold shadow-3xs"
                      >
                        {formatAmount(Math.ceil(total / 50) * 50 || 50)}
                      </button>
                    </div>

                    {typeof cashTendered === 'number' && cashTendered >= total && (
                      <div className="flex justify-between items-center pt-1.5 border-t border-emerald-200/60 text-xs font-bold text-emerald-950">
                        <span>Change to Return:</span>
                        <span className="text-sm font-mono text-emerald-800">{formatAmount(changeDue)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Complete Checkout Action */}
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isProcessingCheckout}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-2xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all group"
              id="btn-process-checkout"
            >
              {isProcessingCheckout ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" /> 
                  <span>Processing Payment & Dispatching E-Receipt...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" /> 
                  <span>Complete Sale & Generate Receipt ({formatAmount(total)})</span>
                </>
              )}
            </button>

            {selectedCustomer?.email && (
              <p className="text-[10px] text-center text-gray-400 flex items-center justify-center gap-1">
                <Mail className="w-3 h-3 text-emerald-600" />
                Receipt will be auto-emailed to <strong>{selectedCustomer.email}</strong>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Persistent Held Tabs & Parked Orders Drawer */}
      <HeldTabsDrawer
        isOpen={showParkedDrawer}
        onClose={() => setShowParkedDrawer(false)}
        parkedOrders={parkedOrders}
        onResumeOrder={handleResumeParkedOrder}
        onDiscardOrder={handleDiscardParkedOrder}
        onUpdateNote={handleUpdateParkedNote}
        onClearAll={handleClearAllParkedOrders}
        currentCartCount={cart.reduce((s, i) => s + i.quantity, 0)}
        onParkCurrentCart={handleParkOrder}
      />

      {/* Enhanced Shift Receipts & Past Sales History Modal */}
      <ShiftReceiptsModal
        isOpen={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
        completedShiftOrders={completedShiftOrders}
        shiftTransactions={shiftTransactions}
        allOrders={orders}
        products={products}
        activeStaffName={activeStaffName}
        onSelectOrderForReceipt={handleOpenPastReceipt}
        onReorderToCart={handleReorderItemsToBasket}
        onRefundOrder={onRefundOrder}
      />

      {/* Add Custom Ad-hoc Line Item Modal */}
      {showCustomItemModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150" id="custom-item-modal-backdrop">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Add Custom Item or Fee</h3>
              </div>
              <button onClick={() => setShowCustomItemModal(false)} className="text-gray-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleAddCustomItem} className="space-y-3 text-xs" id="form-add-custom-item">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Item / Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gift Wrapping, Alterations, Express Delivery"
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit Price ({currencySymbol}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={customItemPrice}
                    onChange={(e) => setCustomItemPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={customItemQty}
                    onChange={(e) => setCustomItemQty(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs transition-all"
                >
                  Add to Active Basket
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomItemModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Optical Laser Barcode Scanner Modal for POS Ring-Up */}
      <OpticalLaserScannerModal
        isOpen={isLaserModalOpen}
        onClose={() => setIsLaserModalOpen(false)}
        onScanSuccess={(scannedCode, symbology) => {
          handleLaserScanSuccess(scannedCode, symbology);
        }}
        title="POS Optical Laser Scanner"
        subtitle="Align product barcode or shelf label within laser reticle to ring up item"
        sampleCodes={products.slice(0, 4).map(p => ({
          label: p.name,
          code: p.barcode,
          type: 'EAN-13'
        }))}
      />

      {/* Multi-UOM Pack Breakdown Unit Selection Modal */}
      <PackagingUnitModal
        product={selectedPackProduct}
        isOpen={isPackModalOpen}
        onClose={() => {
          setIsPackModalOpen(false);
          setSelectedPackProduct(null);
        }}
        onAddToCart={(prod, unitOpt, qty, variantSku) => {
          addToCart(prod, variantSku, true, unitOpt, qty);
        }}
      />

      {/* Manager Approval Required PIN Modal for Minimum Price Floor Guardrails */}
      {managerModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-amber-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5 text-amber-700">
                <div className="p-2 bg-amber-100 rounded-2xl">
                  <ShieldCheck className="w-6 h-6 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Manager Approval Required</h3>
                  <p className="text-[11px] font-semibold text-amber-700">Minimum Price Floor Guardrail Triggered</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManagerModal(prev => ({ ...prev, isOpen: false }))}
                className="text-gray-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Product:</span>
                <span className="font-extrabold text-slate-900">{managerModal.productName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Requested Selling Price:</span>
                <span className="font-mono font-black text-rose-700">{formatAmount(managerModal.requestedPrice)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Enforced Minimum Floor:</span>
                <span className="font-mono font-black text-slate-900">{formatAmount(managerModal.minAllowedPrice)}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-amber-200/60">
                <span className="font-bold text-amber-900">Margin Variance Below Floor:</span>
                <span className="font-mono font-bold text-amber-800">
                  -{formatAmount(managerModal.diffAmount)} ({managerModal.discountPercentBelowMin.toFixed(1)}%)
                </span>
              </div>
            </div>

            <form onSubmit={handleVerifyManagerPin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Supervisor / Manager PIN *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    maxLength={8}
                    required
                    autoFocus
                    placeholder="Enter 4-digit PIN (e.g. 1234 or 8888)"
                    value={managerPinInput}
                    onChange={(e) => setManagerPinInput(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-base font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-hidden"
                  />
                  <Lock className="w-5 h-5 text-gray-400 absolute right-3 top-3" />
                </div>
                {managerApprovalError && (
                  <p className="text-xs text-rose-600 font-bold mt-1">{managerApprovalError}</p>
                )}
                <p className="text-[10px] text-gray-500">
                  Quick Demo PINs: <button type="button" onClick={() => setManagerPinInput('1234')} className="underline font-bold text-indigo-600">1234</button> or <button type="button" onClick={() => setManagerPinInput('8888')} className="underline font-bold text-indigo-600">8888</button>
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-2xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-200" />
                  <span>Authorize Override</span>
                </button>
                <button
                  type="button"
                  onClick={() => setManagerModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
