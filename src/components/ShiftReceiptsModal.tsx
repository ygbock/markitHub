import React, { useState, useMemo, useEffect } from 'react';
import { Order, Product } from '../types';
import { ShiftTransaction } from './ShiftSummaryModal';
import { useCurrency } from '../context/CurrencyContext';
import { 
  History, Search, Filter, Printer, Mail, Download, 
  Receipt, Clock, User, CheckCircle2, 
  AlertTriangle, Copy, Check, RefreshCw, X,
  CreditCard, DollarSign, Smartphone,
  ChevronDown, ChevronUp, RotateCcw, Lock, FileText,
  ChevronLeft, ChevronRight, Share2, ArrowLeft,
  Sparkles, Layers
} from 'lucide-react';
import { 
  printReceiptViaIframe, 
  downloadReceiptHtml, 
  downloadReceiptText, 
  copyReceiptToClipboard, 
  shareReceipt, 
  dispatchReceiptEmail,
  DEFAULT_BUSINESS_INFO 
} from '../utils/receiptUtils';

interface ShiftReceiptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  completedShiftOrders: Order[];
  shiftTransactions: ShiftTransaction[];
  allOrders?: Order[];
  products: Product[];
  activeStaffName: string;
  onSelectOrderForReceipt?: (order: Order) => void;
  onReorderToCart?: (items: { product: Product; quantity: number; selectedVariantSku?: string }[]) => void;
  onRefundOrder?: (orderId: string, reason: string) => void;
}

export default function ShiftReceiptsModal({
  isOpen,
  onClose,
  completedShiftOrders,
  shiftTransactions,
  allOrders = [],
  products,
  activeStaffName,
  onSelectOrderForReceipt,
  onReorderToCart,
  onRefundOrder
}: ShiftReceiptsModalProps) {
  const { formatAmount } = useCurrency();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedTimeScope, setSelectedTimeScope] = useState<'shift' | 'all'>('shift');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  // Expanded items state in ledger view
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dedicated Active Thermal Slip Inspector State
  const [activeSlipOrder, setActiveSlipOrder] = useState<Order | null>(null);
  const [slipNotice, setSlipNotice] = useState<string | null>(null);
  const [slipEmailInput, setSlipEmailInput] = useState('');
  const [isSendingSlipEmail, setIsSendingSlipEmail] = useState(false);
  const [slipEmailSentFeedback, setSlipEmailSentFeedback] = useState<string | null>(null);
  const [slipCopied, setSlipCopied] = useState(false);
  const [slipMobileTab, setSlipMobileTab] = useState<'slip' | 'actions'>('slip');

  // Separate Email dispatch modal (for row-action email)
  const [emailModalOrder, setEmailModalOrder] = useState<Order | null>(null);
  const [emailTargetAddress, setEmailTargetAddress] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatusNotice, setEmailStatusNotice] = useState<string | null>(null);

  // Void / Refund Modal
  const [refundModalOrder, setRefundModalOrder] = useState<Order | null>(null);
  const [refundReason, setRefundReason] = useState('Customer Return / Exchange');
  const [supervisorPin, setSupervisorPin] = useState('');
  const [refundError, setRefundError] = useState<string | null>(null);

  // Local refund tracking in case an order wasn't saved in central state yet
  const [locallyRefundedIds, setLocallyRefundedIds] = useState<Record<string, { reason: string; timestamp: string }>>({});

  // Reset active slip when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setActiveSlipOrder(null);
      setSlipNotice(null);
      setSlipEmailSentFeedback(null);
      setSlipMobileTab('slip');
    }
  }, [isOpen]);

  // Sync email input when active slip order changes
  useEffect(() => {
    if (activeSlipOrder) {
      setSlipEmailInput(activeSlipOrder.customerEmail || '');
      setSlipEmailSentFeedback(null);
      setSlipNotice(null);
      setSlipMobileTab('slip');
    }
  }, [activeSlipOrder]);

  // Construct unified list of viewable orders
  const unifiedOrders = useMemo(() => {
    const list: Order[] = [];
    const seenIds = new Set<string>();

    // 1. First prioritize real completed shift orders
    completedShiftOrders.forEach(ord => {
      if (!seenIds.has(ord.id)) {
        seenIds.add(ord.id);
        list.push(ord);
      }
    });

    // 2. If viewing all sales or if few shift orders exist, include all passed system orders
    if (selectedTimeScope === 'all' || list.length === 0) {
      allOrders.forEach(ord => {
        if (!seenIds.has(ord.id)) {
          seenIds.add(ord.id);
          list.push(ord);
        }
      });
    }

    // 3. For shift transactions that don't have matching full order objects, synthesize realistic Order structures
    shiftTransactions.forEach((tx, idx) => {
      if (!seenIds.has(tx.id)) {
        seenIds.add(tx.id);
        const matchedProduct = products[idx % products.length] || products[0];
        const defaultQty = tx.itemsCount || 1;
        const sub = tx.total / 1.085;
        const taxVal = tx.total - sub;

        const syntheticOrder: Order = {
          id: tx.id,
          date: new Date(Date.now() - (idx + 1) * 25 * 60000).toISOString(),
          items: [
            {
              productId: matchedProduct?.id || 'prod-sample',
              productName: matchedProduct?.name || 'Retail Item Package',
              quantity: defaultQty,
              price: matchedProduct ? matchedProduct.price : parseFloat((sub / defaultQty).toFixed(2)),
            }
          ],
          subtotal: parseFloat(sub.toFixed(2)),
          tax: parseFloat(taxVal.toFixed(2)),
          discount: 0,
          total: tx.total,
          paymentMethod: tx.paymentMethod,
          channel: 'In-Store POS',
          customerName: tx.customerName || 'Walk-in Guest',
          status: 'Completed',
          cashTendered: tx.cashTendered,
          cashChange: tx.cashChange
        };
        list.push(syntheticOrder);
      }
    });

    return list;
  }, [completedShiftOrders, allOrders, shiftTransactions, selectedTimeScope, products]);

  // Apply search & filtering
  const filteredOrders = useMemo(() => {
    let result = unifiedOrders.map(ord => {
      // Apply local refund status override if present
      if (locallyRefundedIds[ord.id]) {
        return {
          ...ord,
          status: 'Refunded' as const,
          notes: `${ord.notes ? ord.notes + ' | ' : ''}REFUNDED: ${locallyRefundedIds[ord.id].reason}`
        };
      }
      return ord;
    });

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(o => {
        const matchesId = o.id.toLowerCase().includes(term);
        const matchesCust = (o.customerName || '').toLowerCase().includes(term);
        const matchesEmail = (o.customerEmail || '').toLowerCase().includes(term);
        const matchesMethod = o.paymentMethod.toLowerCase().includes(term);
        const matchesItems = o.items.some(i => i.productName.toLowerCase().includes(term) || (i.variantSku || '').toLowerCase().includes(term));
        return matchesId || matchesCust || matchesEmail || matchesMethod || matchesItems;
      });
    }

    // Payment method filter
    if (selectedMethod !== 'All') {
      result = result.filter(o => o.paymentMethod === selectedMethod);
    }

    // Status filter
    if (selectedStatus !== 'All') {
      result = result.filter(o => o.status === selectedStatus);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortBy === 'highest') {
        return b.total - a.total;
      }
      if (sortBy === 'lowest') {
        return a.total - b.total;
      }
      return 0;
    });

    return result;
  }, [unifiedOrders, searchTerm, selectedMethod, selectedStatus, sortBy, locallyRefundedIds]);

  // Analytics KPIs computed from currently filtered/viewed set
  const metrics = useMemo(() => {
    const totalSales = filteredOrders.reduce((sum, o) => sum + (o.status === 'Refunded' ? 0 : o.total), 0);
    const count = filteredOrders.length;
    const avgTicket = count > 0 ? totalSales / count : 0;

    const cashOrders = filteredOrders.filter(o => o.paymentMethod === 'Cash');
    const cardOrders = filteredOrders.filter(o => o.paymentMethod === 'Credit/Debit Card');
    const digitalOrders = filteredOrders.filter(o => o.paymentMethod === 'Digital Wallet');

    const cashSum = cashOrders.reduce((sum, o) => sum + (o.status === 'Refunded' ? 0 : o.total), 0);
    const cardSum = cardOrders.reduce((sum, o) => sum + (o.status === 'Refunded' ? 0 : o.total), 0);
    const digitalSum = digitalOrders.reduce((sum, o) => sum + (o.status === 'Refunded' ? 0 : o.total), 0);

    return {
      totalSales,
      count,
      avgTicket,
      cashCount: cashOrders.length,
      cashSum,
      cardCount: cardOrders.length,
      cardSum,
      digitalCount: digitalOrders.length,
      digitalSum
    };
  }, [filteredOrders]);

  // Slip navigation indices
  const currentSlipIndex = activeSlipOrder 
    ? filteredOrders.findIndex(o => o.id === activeSlipOrder.id)
    : -1;
  const hasPrevSlip = currentSlipIndex > 0;
  const hasNextSlip = currentSlipIndex >= 0 && currentSlipIndex < filteredOrders.length - 1;

  const handlePrevSlip = () => {
    if (hasPrevSlip) {
      setActiveSlipOrder(filteredOrders[currentSlipIndex - 1]);
    }
  };

  const handleNextSlip = () => {
    if (hasNextSlip) {
      setActiveSlipOrder(filteredOrders[currentSlipIndex + 1]);
    }
  };

  // Keyboard navigation when slip is active
  useEffect(() => {
    if (!activeSlipOrder) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        if (hasPrevSlip) setActiveSlipOrder(filteredOrders[currentSlipIndex - 1]);
      } else if (e.key === 'ArrowRight') {
        if (hasNextSlip) setActiveSlipOrder(filteredOrders[currentSlipIndex + 1]);
      } else if (e.key === 'Escape') {
        setActiveSlipOrder(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSlipOrder, hasPrevSlip, hasNextSlip, currentSlipIndex, filteredOrders]);

  if (!isOpen) return null;

  // Toggle line items expand
  const toggleExpand = (orderId: string) => {
    setExpandedOrderIds(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  // Copy receipt ID
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Trigger dedicated slip view
  const handleViewSlip = (order: Order) => {
    setActiveSlipOrder(order);
    if (onSelectOrderForReceipt) {
      onSelectOrderForReceipt(order);
    }
  };

  // Quick Direct Thermal Print
  const handleQuickPrint = (order: Order) => {
    printReceiptViaIframe(order, formatAmount, activeStaffName, DEFAULT_BUSINESS_INFO);
  };

  // Slip Inspector Actions
  const handleSlipPrint = () => {
    if (!activeSlipOrder) return;
    printReceiptViaIframe(activeSlipOrder, formatAmount, activeStaffName, DEFAULT_BUSINESS_INFO);
    setSlipNotice('Receipt sent to printer dialog!');
    setTimeout(() => setSlipNotice(null), 3000);
  };

  const handleSlipDownloadHtml = () => {
    if (!activeSlipOrder) return;
    downloadReceiptHtml(activeSlipOrder, formatAmount, activeStaffName, DEFAULT_BUSINESS_INFO);
    setSlipNotice(`Downloaded HTML slip for ${activeSlipOrder.id}`);
    setTimeout(() => setSlipNotice(null), 3000);
  };

  const handleSlipDownloadTxt = () => {
    if (!activeSlipOrder) return;
    downloadReceiptText(activeSlipOrder, formatAmount, activeStaffName, DEFAULT_BUSINESS_INFO);
    setSlipNotice(`Downloaded text slip for ${activeSlipOrder.id}`);
    setTimeout(() => setSlipNotice(null), 3000);
  };

  const handleSlipCopyText = async () => {
    if (!activeSlipOrder) return;
    const success = await copyReceiptToClipboard(activeSlipOrder, formatAmount, activeStaffName, DEFAULT_BUSINESS_INFO);
    if (success) {
      setSlipCopied(true);
      setSlipNotice('Slip text copied to clipboard!');
      setTimeout(() => {
        setSlipCopied(false);
        setSlipNotice(null);
      }, 2500);
    }
  };

  const handleSlipShare = async () => {
    if (!activeSlipOrder) return;
    const res = await shareReceipt(activeSlipOrder, formatAmount, activeStaffName, DEFAULT_BUSINESS_INFO);
    if (res.method === 'fallback' && res.success) {
      setSlipCopied(true);
      setSlipNotice('Receipt summary copied to clipboard for sharing!');
      setTimeout(() => {
        setSlipCopied(false);
        setSlipNotice(null);
      }, 2500);
    }
  };

  const handleSlipSendEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeSlipOrder || !slipEmailInput.trim()) return;
    setIsSendingSlipEmail(true);
    setSlipEmailSentFeedback(null);

    try {
      const res = await dispatchReceiptEmail(activeSlipOrder, slipEmailInput.trim(), formatAmount, activeStaffName);
      if (res.success) {
        setSlipEmailSentFeedback(`E-Receipt successfully delivered to ${slipEmailInput.trim()}!`);
      } else {
        setSlipEmailSentFeedback('Failed to deliver email. Please check internet connection.');
      }
    } catch {
      setSlipEmailSentFeedback('Failed to deliver email.');
    } finally {
      setIsSendingSlipEmail(false);
    }
  };

  // Open Email Modal for Order
  const handleOpenEmailModal = (order: Order) => {
    setEmailModalOrder(order);
    setEmailTargetAddress(order.customerEmail || '');
    setEmailStatusNotice(null);
  };

  // Send Email Receipt
  const handleSendEmailReceipt = async () => {
    if (!emailModalOrder || !emailTargetAddress.trim()) return;
    setIsSendingEmail(true);
    setEmailStatusNotice(null);

    try {
      const res = await dispatchReceiptEmail(emailModalOrder, emailTargetAddress.trim(), formatAmount, activeStaffName);
      if (res.success) {
        setEmailStatusNotice(`Receipt successfully emailed to ${emailTargetAddress}!`);
        setTimeout(() => {
          setEmailModalOrder(null);
          setIsSendingEmail(false);
        }, 1500);
      } else {
        setEmailStatusNotice('Failed to deliver email. Please check network connectivity.');
        setIsSendingEmail(false);
      }
    } catch {
      setEmailStatusNotice('Failed to deliver email.');
      setIsSendingEmail(false);
    }
  };

  // Open Refund Modal
  const handleOpenRefundModal = (order: Order) => {
    setRefundModalOrder(order);
    setSupervisorPin('');
    setRefundReason('Customer Return / Exchange');
    setRefundError(null);
  };

  // Confirm Refund Execution
  const handleConfirmRefund = () => {
    if (!refundModalOrder) return;
    if (supervisorPin !== '1234') {
      setRefundError('Invalid Supervisor PIN. Enter 1234 to authorize refund/void.');
      return;
    }

    setLocallyRefundedIds(prev => ({
      ...prev,
      [refundModalOrder.id]: {
        reason: refundReason,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    }));

    if (onRefundOrder) {
      onRefundOrder(refundModalOrder.id, refundReason);
    }

    // Update active slip if it matches
    if (activeSlipOrder && activeSlipOrder.id === refundModalOrder.id) {
      setActiveSlipOrder(prev => prev ? {
        ...prev,
        status: 'Refunded',
        notes: `${prev.notes ? prev.notes + ' | ' : ''}REFUNDED: ${refundReason}`
      } : null);
    }

    setRefundModalOrder(null);
  };

  // Re-Order / Duplicate into Cart
  const handleReorderItems = (order: Order) => {
    if (!onReorderToCart) return;
    const cartItems = order.items.map(item => {
      const matched: Product = products.find(p => p.id === item.productId) || {
        id: item.productId,
        name: item.productName,
        sku: item.variantSku || `SKU-${item.productId.slice(0, 8)}`,
        price: item.price,
        cost: item.price * 0.6,
        stock: 50,
        category: 'General',
        location: 'Store Shelf',
        reorderPoint: 5,
        barcode: '000000000000',
        qrCode: 'https://nexus.pos/item',
        variants: [],
        salesCount: 0
      };
      return {
        product: matched,
        quantity: item.quantity,
        selectedVariantSku: item.variantSku
      };
    });

    onReorderToCart(cartItems);
    onClose();
  };

  // Export Filtered Receipts to CSV
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return;

    const headers = [
      'Order ID', 'Date & Time', 'Customer Name', 'Customer Email', 
      'Payment Method', 'Items Count', 'Subtotal', 'Tax', 'Discount', 
      'Total', 'Status', 'Notes'
    ];

    const rows = filteredOrders.map(o => [
      `"${o.id}"`,
      `"${new Date(o.date).toLocaleString()}"`,
      `"${o.customerName || 'Walk-in Guest'}"`,
      `"${o.customerEmail || ''}"`,
      `"${o.paymentMethod}"`,
      o.items.reduce((s, i) => s + i.quantity, 0),
      o.subtotal.toFixed(2),
      o.tax.toFixed(2),
      o.discount.toFixed(2),
      o.total.toFixed(2),
      `"${o.status}"`,
      `"${(o.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `POS_Shift_Receipts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-0 sm:p-3 md:p-5 z-50 animate-in fade-in duration-150"
      id="shift-receipts-modal-backdrop"
    >
      <div 
        className="bg-white rounded-none sm:rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col h-[100dvh] sm:h-[90vh] md:max-h-[880px] border-0 sm:border border-slate-200/80 overflow-hidden"
        id="shift-receipts-modal-container"
      >
        {/* ========================================================================= */}
        {/* TOP HEADER BAR: Ergonomic for Mobile, Tablet & Desktop Views              */}
        {/* ========================================================================= */}
        <div className="px-3 py-2.5 sm:px-5 sm:py-3.5 bg-slate-900 text-white flex items-center justify-between gap-2 sm:gap-3 shrink-0 border-b border-slate-800 shadow-xs">
          {activeSlipOrder ? (
            /* Slip Inspector Header Navigation */
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setActiveSlipOrder(null)}
                className="min-h-[40px] px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all shrink-0"
                title="Return to Receipts Ledger (Esc)"
                id="btn-slip-back-to-ledger"
              >
                <ArrowLeft className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">Back to Ledger</span>
                <span className="sm:hidden">Ledger</span>
              </button>

              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xs shrink-0">
                  <Receipt className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-xs sm:text-sm font-black tracking-tight text-white truncate">Slip Inspector</h2>
                    <span className="px-1.5 py-0.5 bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 rounded-md text-[10px] sm:text-xs font-mono font-bold truncate">
                      {activeSlipOrder.id}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                    Receipt {currentSlipIndex + 1} of {filteredOrders.length}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Ledger List Header */
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xs shrink-0">
                <History className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base md:text-lg font-black tracking-tight truncate text-white">Shift Receipts</h2>
                  <span className="px-2 py-0.5 bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 rounded-full text-[10px] sm:text-xs font-bold font-mono shrink-0">
                    {filteredOrders.length} {filteredOrders.length === 1 ? 'Sale' : 'Sales'}
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400 truncate hidden sm:block">
                  Cashier: <strong className="text-slate-200">{activeStaffName}</strong> • Register #01
                </p>
              </div>
            </div>
          )}

          {/* Top Right Controls & Steppers */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {activeSlipOrder ? (
              /* Previous & Next Slip Quick Controls */
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={!hasPrevSlip}
                  onClick={handlePrevSlip}
                  className="min-h-[40px] px-2 sm:px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-30 disabled:pointer-events-none text-white rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-700 transition-all"
                  title="Previous Receipt (Left Arrow Key)"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden md:inline">Prev</span>
                </button>
                <button
                  type="button"
                  disabled={!hasNextSlip}
                  onClick={handleNextSlip}
                  className="min-h-[40px] px-2 sm:px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-30 disabled:pointer-events-none text-white rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-700 transition-all"
                  title="Next Receipt (Right Arrow Key)"
                >
                  <span className="hidden md:inline">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleExportCSV}
                className="min-h-[40px] px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all shadow-3xs"
                title="Download Receipts Ledger CSV"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">CSV</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
              title="Close Ledger"
              id="btn-close-shift-receipts"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CONDITIONAL BODY: DEDICATED SLIP INSPECTOR VIEW vs FULL RECEIPTS LEDGER   */}
        {/* ========================================================================= */}
        {activeSlipOrder ? (
          /* ========================================================= */
          /* ULTRA-CRISP 80mm THERMAL SLIP INSPECTOR DUAL-PANE VIEW    */
          /* ========================================================= */
          <div className="flex-1 overflow-y-auto bg-slate-100/90 flex flex-col" id="slip-inspector-view">
            
            {/* Mobile Segmented Switcher: Paper Slip vs Actions */}
            <div className="lg:hidden p-2.5 bg-white border-b border-slate-200 shrink-0 sticky top-0 z-20 shadow-2xs">
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSlipMobileTab('slip')}
                  className={`min-h-[38px] rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    slipMobileTab === 'slip'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Thermal Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSlipMobileTab('actions')}
                  className={`min-h-[38px] rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    slipMobileTab === 'actions'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Actions & Dispatch</span>
                </button>
              </div>
            </div>

            <div className="flex-1 p-3 sm:p-5 md:p-6 overflow-y-auto">
              {/* Notice Toast Bar */}
              {slipNotice && (
                <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-emerald-600 text-white rounded-xl sm:rounded-2xl text-xs font-bold flex items-center justify-between shadow-md animate-in slide-in-from-top-2 duration-150 max-w-4xl mx-auto">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                    <span>{slipNotice}</span>
                  </div>
                  <button onClick={() => setSlipNotice(null)} className="text-white hover:text-emerald-200 font-bold px-1.5 py-0.5">✕</button>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 max-w-4xl mx-auto items-start pb-6">
                
                {/* LEFT COLUMN: REALISTIC 80mm THERMAL RECEIPT SLIP PAPER */}
                <div className={`lg:col-span-6 flex flex-col items-center ${slipMobileTab === 'actions' ? 'hidden lg:flex' : 'flex'}`}>
                  <div className="w-full max-w-[340px] sm:max-w-[380px] bg-white rounded-2xl p-4 sm:p-6 shadow-xl border border-slate-200/90 text-slate-900 relative space-y-3.5" id="thermal-receipt-paper">
                    
                    {/* Top Paper Perforation Effect */}
                    <div className="absolute -top-1.5 left-0 right-0 h-3 flex justify-between overflow-hidden px-2 pointer-events-none">
                      {Array.from({ length: 18 }).map((_, i) => (
                        <div key={i} className="w-2.5 h-2.5 bg-slate-100 rounded-full -mt-1" />
                      ))}
                    </div>

                    {/* VOID / REFUNDED WATERMARK BADGE */}
                    {activeSlipOrder.status === 'Refunded' && (
                      <div className="bg-rose-500 text-white py-1 px-3 rounded-lg text-center font-black tracking-widest text-xs uppercase shadow-sm border border-rose-600 flex items-center justify-center gap-1.5 animate-in fade-in">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>*** VOID / REFUNDED ***</span>
                      </div>
                    )}

                    {/* Store Header */}
                    <div className="text-center border-b-2 border-dashed border-gray-200 pb-3 space-y-1">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto font-black text-xs mb-1 shadow-xs">
                        N
                      </div>
                      <h2 className="text-xs sm:text-sm font-black tracking-tight text-slate-900 uppercase">
                        {DEFAULT_BUSINESS_INFO.name}
                      </h2>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{DEFAULT_BUSINESS_INFO.tagline}</p>
                      <p className="text-[10px] text-gray-500 font-mono">{DEFAULT_BUSINESS_INFO.address}, {DEFAULT_BUSINESS_INFO.cityStateZip}</p>
                      <p className="text-[10px] text-gray-400 font-mono">Tel: {DEFAULT_BUSINESS_INFO.phone} • {DEFAULT_BUSINESS_INFO.taxId}</p>
                    </div>

                    {/* Order Meta Box */}
                    <div className="text-[11px] text-gray-600 border-b border-dashed border-gray-200 pb-2.5 space-y-1 font-mono">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Order ID:</span>
                        <span className="font-bold text-slate-900">{activeSlipOrder.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Date/Time:</span>
                        <span className="text-slate-800">
                          {new Date(activeSlipOrder.date).toLocaleDateString()} {new Date(activeSlipOrder.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Cashier:</span>
                        <span className="text-slate-800 font-semibold">{activeStaffName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Customer:</span>
                        <span className="font-bold text-indigo-700 truncate max-w-[160px] sm:max-w-[180px]">{activeSlipOrder.customerName || 'Walk-in Guest'}</span>
                      </div>
                      {activeSlipOrder.customerEmail && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Customer Email:</span>
                          <span className="text-slate-700 truncate max-w-[150px] sm:max-w-[170px]">{activeSlipOrder.customerEmail}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-400">Channel:</span>
                        <span className="text-slate-700">{activeSlipOrder.channel || 'In-Store POS'}</span>
                      </div>
                    </div>

                    {/* Itemized Line Items Table */}
                    <div className="space-y-2 text-xs border-b border-dashed border-gray-200 pb-3" id="thermal-items-table">
                      <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-1">
                        <span>Item & SKU</span>
                        <span className="text-right">Qty & Total</span>
                      </div>
                      {activeSlipOrder.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start text-slate-800" id={`thermal-item-row-${idx}`}>
                          <div className="pr-2 flex-1 min-w-0">
                            <span className="font-semibold block leading-tight text-slate-900 break-words">{item.productName}</span>
                            <span className="text-[10px] text-gray-400 font-mono block">
                              {item.variantSku ? `SKU: ${item.variantSku} • ` : ''}
                              {item.quantity} × {formatAmount(item.price)}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-slate-900 shrink-0 pl-1">
                            {formatAmount(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Financial Breakdown */}
                    <div className="space-y-1 text-xs border-b-2 border-dashed border-gray-200 pb-3 font-mono">
                      <div className="flex justify-between text-gray-500">
                        <span>Subtotal</span>
                        <span className="font-semibold text-slate-800">{formatAmount(activeSlipOrder.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>Sales Tax (8.5%)</span>
                        <span className="font-semibold text-slate-800">{formatAmount(activeSlipOrder.tax)}</span>
                      </div>
                      {activeSlipOrder.discount > 0 && (
                        <div className="flex justify-between text-amber-700 font-medium">
                          <span>Discount Promo</span>
                          <span className="font-bold">-{formatAmount(activeSlipOrder.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-1.5 border-t border-gray-100 font-sans">
                        <span>TOTAL PAID</span>
                        <span className={`font-mono text-base ${activeSlipOrder.status === 'Refunded' ? 'line-through text-gray-400' : 'text-slate-900'}`}>
                          {formatAmount(activeSlipOrder.total)}
                        </span>
                      </div>
                    </div>

                    {/* Payment Tender Breakdown */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] space-y-1 font-mono">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Payment Tender:</span>
                        <span className="font-bold text-slate-800">{activeSlipOrder.paymentMethod}</span>
                      </div>
                      {activeSlipOrder.paymentMethod === 'Cash' && typeof activeSlipOrder.cashTendered === 'number' && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Cash Tendered:</span>
                            <span className="font-semibold">{formatAmount(activeSlipOrder.cashTendered)}</span>
                          </div>
                          <div className="flex justify-between text-emerald-700 font-bold">
                            <span>Change Returned:</span>
                            <span>{formatAmount(activeSlipOrder.cashChange || 0)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Notes if present */}
                    {activeSlipOrder.notes && (
                      <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-[10px] text-amber-900">
                        <span className="font-bold uppercase tracking-wider block">Note:</span>
                        <p>{activeSlipOrder.notes}</p>
                      </div>
                    )}

                    {/* Simulated Code-128 Barcode */}
                    <div className="text-center pt-1">
                      <div className="inline-block px-3 py-1 bg-white border border-gray-200 rounded-md shadow-3xs">
                        <div className="flex items-center justify-center gap-0.5 h-6">
                          {[2, 1, 3, 1, 4, 2, 1, 3, 2, 4, 1, 3, 1, 2, 4, 2, 1, 3, 1, 2, 1, 3].map((w, i) => (
                            <div key={i} className="h-full bg-slate-900" style={{ width: `${w}px` }} />
                          ))}
                        </div>
                        <span className="text-[9px] font-mono text-gray-500 tracking-widest block mt-0.5">
                          *{activeSlipOrder.id.toUpperCase()}*
                        </span>
                      </div>
                    </div>

                    {/* Footer Return Policy */}
                    <div className="text-center text-[9px] text-gray-400 leading-tight pt-1 border-t border-dashed border-gray-200">
                      <p>{DEFAULT_BUSINESS_INFO.returnPolicy}</p>
                      <p className="font-bold text-slate-700 mt-1 uppercase tracking-wider">Thank you for shopping with us!</p>
                    </div>

                    {/* Bottom Paper Perforation Effect */}
                    <div className="absolute -bottom-1.5 left-0 right-0 h-3 flex justify-between overflow-hidden px-2 pointer-events-none">
                      {Array.from({ length: 18 }).map((_, i) => (
                        <div key={i} className="w-2.5 h-2.5 bg-slate-100 rounded-full mt-1" />
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: ACTION & DISPATCH CONTROL CENTER */}
                <div className={`lg:col-span-6 space-y-3.5 sm:space-y-4 w-full ${slipMobileTab === 'slip' ? 'hidden lg:block' : 'block'}`}>
                  
                  {/* Primary Print Button & Document Downloads */}
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-3xs space-y-3">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Printer & Physical Slip</h3>
                    
                    <button
                      type="button"
                      onClick={handleSlipPrint}
                      className="min-h-[46px] w-full py-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
                      id="btn-print-slip-direct"
                    >
                      <Printer className="w-4 h-4 text-indigo-400" />
                      <span>Print 80mm Thermal Slip</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSlipDownloadHtml}
                        className="min-h-[42px] py-2 px-3 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-gray-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="truncate">Download HTML</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSlipDownloadTxt}
                        className="min-h-[42px] py-2 px-3 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-gray-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span className="truncate">Download TXT</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleSlipCopyText}
                        className="min-h-[42px] py-2 px-3 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-gray-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-all"
                      >
                        {slipCopied ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
                        <span className="truncate">{slipCopied ? 'Copied!' : 'Copy Text'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSlipShare}
                        className="min-h-[42px] py-2 px-3 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-gray-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Share2 className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span className="truncate">Share Summary</span>
                      </button>
                    </div>
                  </div>

                  {/* Email Dispatch Box */}
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-3xs space-y-3">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-600" /> E-Receipt Customer Delivery
                    </h3>

                    <form onSubmit={handleSlipSendEmail} className="space-y-2">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="email"
                          required
                          placeholder="customer.email@domain.com"
                          value={slipEmailInput}
                          onChange={(e) => setSlipEmailInput(e.target.value)}
                          className="min-h-[42px] flex-1 px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                        />
                        <button
                          type="submit"
                          disabled={isSendingSlipEmail || !slipEmailInput.trim()}
                          className="min-h-[42px] px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0"
                        >
                          {isSendingSlipEmail ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Sending...</span>
                            </>
                          ) : (
                            <>
                              <Mail className="w-3.5 h-3.5" />
                              <span>Send E-Receipt</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>

                    {slipEmailSentFeedback && (
                      <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                        slipEmailSentFeedback.includes('successfully') ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                      }`}>
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{slipEmailSentFeedback}</span>
                      </div>
                    )}
                  </div>

                  {/* POS Order Operations: Re-Order & Refund */}
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-3xs space-y-3">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Register Operations</h3>
                    
                    <div className="flex flex-col gap-2">
                      {onReorderToCart && (
                        <button
                          type="button"
                          onClick={() => handleReorderItems(activeSlipOrder)}
                          className="min-h-[42px] w-full py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 border border-indigo-200 text-indigo-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-3xs text-center"
                        >
                          <RotateCcw className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span className="truncate">Duplicate Items into Active Register Cart</span>
                        </button>
                      )}

                      {activeSlipOrder.status !== 'Refunded' && onRefundOrder && (
                        <button
                          type="button"
                          onClick={() => handleOpenRefundModal(activeSlipOrder)}
                          className="min-h-[42px] w-full py-2.5 px-3 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-3xs text-center"
                        >
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span className="truncate">Authorize POS Refund / Void (PIN Protected)</span>
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* MAIN RECEIPTS LEDGER LIST & ANALYTICS VIEW                */
          /* ========================================================= */
          <>
            {/* Analytics Summary Ribbon: Responsive 2x2 grid on mobile, 4-col on tablet/desktop */}
            <div className="bg-slate-50 border-b border-gray-200 p-2.5 sm:p-4 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 shrink-0">
              <div className="bg-white p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-gray-150 shadow-3xs min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider block truncate">Gross Sales</span>
                <span className="text-sm sm:text-base md:text-lg font-mono font-black text-slate-900 block truncate">{formatAmount(metrics.totalSales)}</span>
                <span className="text-[9px] sm:text-[10px] text-gray-400 block mt-0.5 truncate">{metrics.count} sales processed</span>
              </div>

              <div className="bg-white p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-gray-150 shadow-3xs min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider block truncate">Avg Ticket (ATV)</span>
                <span className="text-sm sm:text-base md:text-lg font-mono font-black text-indigo-600 block truncate">{formatAmount(metrics.avgTicket)}</span>
                <span className="text-[9px] sm:text-[10px] text-gray-400 block mt-0.5 truncate">Per receipt average</span>
              </div>

              <div className="bg-white p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-gray-150 shadow-3xs min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1 truncate">
                  <DollarSign className="w-3 h-3 shrink-0" /> Cash Volume
                </span>
                <span className="text-sm sm:text-base md:text-lg font-mono font-black text-emerald-800 block truncate">{formatAmount(metrics.cashSum)}</span>
                <span className="text-[9px] sm:text-[10px] text-gray-400 block mt-0.5 truncate">{metrics.cashCount} cash sales</span>
              </div>

              <div className="bg-white p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-gray-150 shadow-3xs min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1 truncate">
                  <CreditCard className="w-3 h-3 shrink-0" /> Card / NFC
                </span>
                <span className="text-sm sm:text-base md:text-lg font-mono font-black text-blue-800 block truncate">{formatAmount(metrics.cardSum + metrics.digitalSum)}</span>
                <span className="text-[9px] sm:text-[10px] text-gray-400 block mt-0.5 truncate">{metrics.cardCount + metrics.digitalCount} electronic</span>
              </div>
            </div>

            {/* Search, Filter Drop-Downs & Sorting Toolbar */}
            <div className="p-2.5 sm:p-4 bg-white border-b border-gray-200 flex flex-col gap-2 shrink-0">
              {/* Row 1: Search Bar + Method Drop-Down + Status Drop-Down (Inline on Mobile, Tablet & Desktop) */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Search Input with Clear Button */}
                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 text-gray-400 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 shrink-0" />
                  <input
                    id="shift-receipts-search-input"
                    type="text"
                    placeholder="Search ID, customer, item, SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="min-h-[40px] w-full pl-8 sm:pl-9 pr-7 sm:pr-8 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-slate-700 text-xs font-bold p-1"
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Method Filter Drop-Down */}
                <div className="relative shrink-0">
                  <select
                    id="shift-receipts-method-filter"
                    value={selectedMethod}
                    onChange={(e) => setSelectedMethod(e.target.value)}
                    className={`min-h-[40px] px-2 sm:px-3 py-2 border rounded-xl text-xs font-bold transition-all focus:ring-2 focus:ring-slate-900 focus:outline-hidden cursor-pointer max-w-[110px] sm:max-w-[145px] md:max-w-[160px] truncate ${
                      selectedMethod !== 'All'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-1 ring-indigo-300'
                        : 'bg-slate-50 border-gray-200 text-slate-700 hover:bg-slate-100'
                    }`}
                    title="Filter by Payment Method"
                  >
                    <option value="All">All Methods</option>
                    <option value="Cash">Cash</option>
                    <option value="Credit/Debit Card">Card / POS</option>
                    <option value="Digital Wallet">NFC Wallet</option>
                  </select>
                </div>

                {/* Status Filter Drop-Down */}
                <div className="relative shrink-0">
                  <select
                    id="shift-receipts-status-filter"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className={`min-h-[40px] px-2 sm:px-3 py-2 border rounded-xl text-xs font-bold transition-all focus:ring-2 focus:ring-slate-900 focus:outline-hidden cursor-pointer max-w-[95px] sm:max-w-[125px] md:max-w-[140px] truncate ${
                      selectedStatus !== 'All'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-1 ring-indigo-300'
                        : 'bg-slate-50 border-gray-200 text-slate-700 hover:bg-slate-100'
                    }`}
                    title="Filter by Order Status"
                  >
                    <option value="All">All Status</option>
                    <option value="Completed">Completed</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Scope Switcher (Shift vs All Sales) + Sort Selector + Active Filter Badges / Reset */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Scope Switcher */}
                  <div className="flex bg-slate-100 p-0.5 rounded-xl border border-gray-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setSelectedTimeScope('shift')}
                      className={`min-h-[34px] px-2.5 sm:px-3 py-1 rounded-lg transition-all text-center flex items-center justify-center ${
                        selectedTimeScope === 'shift' ? 'bg-white text-slate-900 shadow-3xs font-black' : 'text-gray-500 hover:text-slate-800'
                      }`}
                    >
                      Shift Sales
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTimeScope('all')}
                      className={`min-h-[34px] px-2.5 sm:px-3 py-1 rounded-lg transition-all text-center flex items-center justify-center ${
                        selectedTimeScope === 'all' ? 'bg-white text-slate-900 shadow-3xs font-black' : 'text-gray-500 hover:text-slate-800'
                      }`}
                    >
                      All Sales
                    </button>
                  </div>

                  {/* Sort Selector */}
                  <select
                    id="shift-receipts-sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="min-h-[36px] px-2.5 sm:px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-slate-900 focus:outline-hidden cursor-pointer"
                  >
                    <option value="newest">Sort: Newest First</option>
                    <option value="oldest">Sort: Oldest First</option>
                    <option value="highest">Sort: Highest Amount</option>
                    <option value="lowest">Sort: Lowest Amount</option>
                  </select>
                </div>

                {/* Reset Filters / Active Filter Summary */}
                {(selectedMethod !== 'All' || selectedStatus !== 'All' || searchTerm) && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-[11px] text-gray-500 hidden sm:inline">
                      Filtered: {filteredOrders.length} {filteredOrders.length === 1 ? 'sale' : 'sales'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMethod('All');
                        setSelectedStatus('All');
                        setSearchTerm('');
                      }}
                      className="min-h-[34px] px-2.5 py-1 text-xs text-rose-600 hover:text-rose-700 active:text-rose-800 font-bold bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-all flex items-center gap-1 shadow-3xs"
                      title="Reset all search and filters"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Receipts List Body */}
            <div className="p-2.5 sm:p-4 md:p-5 overflow-y-auto flex-1 space-y-2.5 sm:space-y-3 bg-slate-50/50" id="receipts-ledger-scroll-area">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const isExpanded = !!expandedOrderIds[order.id];
                  const totalItemsQty = order.items.reduce((s, i) => s + i.quantity, 0);
                  const orderDate = new Date(order.date);
                  const isRefunded = order.status === 'Refunded';

                  return (
                    <div
                      key={order.id}
                      className={`bg-white rounded-2xl border transition-all shadow-3xs overflow-hidden ${
                        isRefunded 
                          ? 'border-rose-200 bg-rose-50/20' 
                          : 'border-gray-200 hover:border-indigo-300 hover:shadow-xs'
                      }`}
                      id={`receipt-card-${order.id}`}
                    >
                      {/* Main Card Summary */}
                      <div className="p-3 sm:p-4 flex flex-col gap-2 sm:gap-2.5">
                        
                        {/* Top Line: Receipt ID + Status + Payment + Price */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            <div className="flex items-center gap-1 font-mono font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                              <span>{order.id}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyId(order.id)}
                                className="text-gray-400 hover:text-slate-800 ml-0.5 p-0.5"
                                title="Copy Order ID"
                              >
                                {copiedId === order.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>

                            {/* Status Badge */}
                            {isRefunded ? (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" /> Refunded
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Completed
                              </span>
                            )}

                            {/* Payment Method Badge */}
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                              order.paymentMethod === 'Cash' 
                                ? 'bg-emerald-100 text-emerald-900' 
                                : order.paymentMethod === 'Credit/Debit Card'
                                ? 'bg-blue-100 text-blue-900'
                                : 'bg-purple-100 text-purple-900'
                            }`}>
                              {order.paymentMethod === 'Cash' && <DollarSign className="w-3 h-3" />}
                              {order.paymentMethod === 'Credit/Debit Card' && <CreditCard className="w-3 h-3" />}
                              {order.paymentMethod === 'Digital Wallet' && <Smartphone className="w-3 h-3" />}
                              <span>{order.paymentMethod === 'Credit/Debit Card' ? 'Card' : order.paymentMethod}</span>
                            </span>

                            {order.receiptSentToEmail && (
                              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-[10px] font-semibold flex items-center gap-1 hidden sm:flex">
                                <Mail className="w-2.5 h-2.5" /> Sent
                              </span>
                            )}
                          </div>

                          {/* Grand Total */}
                          <div className="text-right shrink-0">
                            <div className={`font-mono font-black text-base sm:text-lg ${isRefunded ? 'line-through text-gray-400' : 'text-slate-900'}`}>
                              {formatAmount(order.total)}
                            </div>
                            {order.discount > 0 && (
                              <span className="text-[10px] text-amber-700 font-bold block -mt-0.5">
                                -{formatAmount(order.discount)} off
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Customer & Timestamp Meta Line */}
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-gray-500">
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate max-w-[140px] sm:max-w-[200px]">{order.customerName || 'Walk-in Customer'}</span>
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                            <span>{orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="text-slate-600 font-medium">
                            {totalItemsQty} {totalItemsQty === 1 ? 'item' : 'items'}
                          </span>
                        </div>

                        {/* Actions Toolbar - Responsive on Mobile & Tablet */}
                        <div className="flex items-center gap-1.5 sm:gap-2 pt-2 border-t border-gray-100 justify-between sm:justify-start">
                          {/* Thermal Receipt Preview: Opens Dedicated Slip Inspector */}
                          <button
                            type="button"
                            onClick={() => handleViewSlip(order)}
                            className="min-h-[40px] flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-3xs transition-all"
                            title="Open 80mm Thermal Receipt Slip Inspector"
                            id={`btn-view-slip-${order.id}`}
                          >
                            <Receipt className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>View Slip</span>
                          </button>

                          {/* Direct Print */}
                          <button
                            type="button"
                            onClick={() => handleQuickPrint(order)}
                            className="min-h-[40px] min-w-[40px] p-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl transition-all flex items-center justify-center"
                            title="Direct Print Thermal Slip"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Email Receipt */}
                          <button
                            type="button"
                            onClick={() => handleOpenEmailModal(order)}
                            className="min-h-[40px] min-w-[40px] p-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl transition-all flex items-center justify-center"
                            title="Email E-Receipt to Customer"
                          >
                            <Mail className="w-4 h-4" />
                          </button>

                          {/* Toggle Expand Items */}
                          <button
                            type="button"
                            onClick={() => toggleExpand(order.id)}
                            className="min-h-[40px] min-w-[40px] p-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl transition-all flex items-center justify-center ml-auto sm:ml-0"
                            title={isExpanded ? 'Hide Line Items' : 'Show Line Items'}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Line Items & Operations Drawer */}
                      {isExpanded && (
                        <div className="px-3 sm:px-4 pb-4 pt-2 bg-slate-50/90 border-t border-gray-150 space-y-3">
                          {/* Mobile-Friendly Itemized Card List for small screens */}
                          <div className="sm:hidden space-y-2">
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                              Purchased Items ({order.items.length})
                            </div>
                            <div className="space-y-1.5">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-3xs flex justify-between items-start gap-2">
                                  <div className="min-w-0 flex-1">
                                    <span className="font-bold text-xs text-slate-900 block truncate">{item.productName}</span>
                                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                                      <span className="font-semibold text-slate-700">Qty: {item.quantity}</span>
                                      <span>•</span>
                                      <span>{formatAmount(item.price)} each</span>
                                    </div>
                                    {item.variantSku && (
                                      <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] font-mono inline-block mt-1">
                                        {item.variantSku}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="font-mono font-bold text-xs text-slate-900 block">
                                      {formatAmount(item.price * item.quantity)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Products Breakdown Table for Tablets and Desktop */}
                          <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-3xs">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100 border-b border-gray-200 text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                                  <tr>
                                    <th className="py-2 px-3">Item Description</th>
                                    <th className="py-2 px-3 text-center">Qty</th>
                                    <th className="py-2 px-3 text-right">Unit Price</th>
                                    <th className="py-2 px-3 text-right">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 font-medium text-slate-800">
                                  {order.items.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                      <td className="py-2 px-3">
                                        <span className="font-bold text-slate-900 block">{item.productName}</span>
                                        {item.variantSku && (
                                          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-sm text-[10px] font-mono inline-block mt-0.5">
                                            {item.variantSku}
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-2 px-3 text-center font-bold">{item.quantity}</td>
                                      <td className="py-2 px-3 text-right font-mono text-gray-500">{formatAmount(item.price)}</td>
                                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                        {formatAmount(item.price * item.quantity)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Financial Ledger Breakdown */}
                          <div className="bg-white rounded-xl border border-gray-200 p-2.5 sm:p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs shadow-3xs">
                            <div>
                              <span className="text-gray-500 block text-[10px] sm:text-[11px]">Subtotal</span>
                              <span className="font-mono font-bold text-slate-800 text-xs sm:text-sm">{formatAmount(order.subtotal)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-[10px] sm:text-[11px]">Tax (8.5%)</span>
                              <span className="font-mono font-bold text-slate-800 text-xs sm:text-sm">{formatAmount(order.tax)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-[10px] sm:text-[11px]">Discount</span>
                              <span className="font-mono font-bold text-amber-700 text-xs sm:text-sm">-{formatAmount(order.discount)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-[10px] sm:text-[11px]">Grand Total</span>
                              <span className="font-mono font-black text-slate-900 text-xs sm:text-sm">{formatAmount(order.total)}</span>
                            </div>
                          </div>

                          {order.cashTendered !== undefined && (
                            <div className="px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-200/60 flex justify-between text-xs text-emerald-900 font-bold">
                              <span>Cash Tendered: {formatAmount(order.cashTendered)}</span>
                              <span>Change: {formatAmount(order.cashChange || 0)}</span>
                            </div>
                          )}

                          {/* Order Notes / Refund Reason */}
                          {order.notes && (
                            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                              <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold block text-[11px] uppercase tracking-wider">Transaction Note:</span>
                                <p>{order.notes}</p>
                              </div>
                            </div>
                          )}

                          {/* Line Item Actions: Re-order / Void / Refund */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
                            <div className="text-[11px] text-gray-500">
                              Channel: <span className="font-bold text-slate-700">{order.channel}</span>
                            </div>

                            <div className="grid grid-cols-1 sm:flex sm:items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleViewSlip(order)}
                                className="min-h-[40px] px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-3xs transition-all"
                              >
                                <Receipt className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Inspect Full Slip</span>
                              </button>

                              {onReorderToCart && (
                                <button
                                  type="button"
                                  onClick={() => handleReorderItems(order)}
                                  className="min-h-[40px] px-3 py-2 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-indigo-200 transition-all"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Re-Order Items</span>
                                </button>
                              )}

                              {!isRefunded && onRefundOrder && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenRefundModal(order)}
                                  className="min-h-[40px] px-3 py-2 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-rose-200 transition-all"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>Issue Refund / Void</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 sm:py-16 px-4 bg-white rounded-2xl sm:rounded-3xl border border-dashed border-gray-200 space-y-2">
                  <History className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300" />
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                    {searchTerm || selectedMethod !== 'All' || selectedStatus !== 'All'
                      ? 'No matching receipts found'
                      : 'No sales recorded yet for this register'}
                  </h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    {searchTerm || selectedMethod !== 'All' || selectedStatus !== 'All'
                      ? 'Try modifying your search query or reset filters above.'
                      : 'Completed POS transactions will automatically populate here for quick reprinting, emailing, or audits.'}
                  </p>
                  {(searchTerm || selectedMethod !== 'All' || selectedStatus !== 'All') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedMethod('All');
                        setSelectedStatus('All');
                      }}
                      className="mt-3 min-h-[40px] px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-3xs"
                    >
                      Reset All Filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Footer summary & close */}
            <div className="p-3 sm:p-4 bg-slate-50 border-t border-gray-200 flex justify-between items-center text-xs shrink-0">
              <span className="text-gray-500 text-[11px] sm:text-xs truncate mr-2">
                Showing <strong className="text-slate-800">{filteredOrders.length}</strong> {filteredOrders.length === 1 ? 'record' : 'records'}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[40px] px-4 sm:px-5 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-white rounded-xl font-bold shadow-xs transition-all shrink-0"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>

      {/* Quick Email Dispatch Modal (for row-action email) */}
      {emailModalOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-60 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md p-4 sm:p-6 shadow-2xl space-y-4 border border-gray-150">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Email Thermal Receipt</h3>
              </div>
              <button onClick={() => setEmailModalOrder(null)} className="min-h-[40px] min-w-[40px] flex items-center justify-center text-gray-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-gray-200">
                <span className="text-gray-500 block text-[11px]">Receipt Reference:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{emailModalOrder.id}</span>
                <span className="text-slate-600 block mt-0.5">Total: {formatAmount(emailModalOrder.total)} • {emailModalOrder.items.length} items</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Recipient Customer Email *</label>
                <input
                  type="email"
                  required
                  placeholder="customer@example.com"
                  value={emailTargetAddress}
                  onChange={(e) => setEmailTargetAddress(e.target.value)}
                  className="min-h-[42px] w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              {emailStatusNotice && (
                <div className={`p-2.5 rounded-xl text-xs font-bold ${
                  emailStatusNotice.includes('successfully') ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                }`}>
                  {emailStatusNotice}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSendingEmail || !emailTargetAddress.trim()}
                  onClick={handleSendEmailReceipt}
                  className="min-h-[44px] flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs transition-all flex items-center justify-center gap-1.5"
                >
                  {isSendingEmail ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending E-Receipt...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-3.5 h-3.5" />
                      <span>Send E-Receipt</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEmailModalOrder(null)}
                  className="min-h-[44px] px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POS Refund / Void Modal */}
      {refundModalOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-60 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md p-4 sm:p-6 shadow-2xl space-y-4 border border-gray-150">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">Authorize POS Refund / Void</h3>
              </div>
              <button onClick={() => setRefundModalOrder(null)} className="min-h-[40px] min-w-[40px] flex items-center justify-center text-gray-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                <span className="text-rose-700 block text-[11px] font-bold uppercase tracking-wider">Refund Transaction</span>
                <div className="flex justify-between items-center mt-1">
                  <span className="font-mono font-bold text-slate-900 text-sm">{refundModalOrder.id}</span>
                  <span className="font-mono font-black text-rose-900 text-base">{formatAmount(refundModalOrder.total)}</span>
                </div>
                <span className="text-rose-700 block text-[11px] mt-0.5">Method: {refundModalOrder.paymentMethod}</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Return / Void *</label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="min-h-[42px] w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                >
                  <option value="Customer Return / Exchange">Customer Return / Exchange</option>
                  <option value="Cashier Ringing Error / Wrong Item">Cashier Ringing Error / Wrong Item</option>
                  <option value="Defective / Damaged Merchandise">Defective / Damaged Merchandise</option>
                  <option value="Customer Dissatisfaction">Customer Dissatisfaction</option>
                  <option value="Duplicate Order Charged">Duplicate Order Charged</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-indigo-600" /> Supervisor Authorization PIN *
                </label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="Enter 4-digit PIN (1234)"
                  value={supervisorPin}
                  onChange={(e) => setSupervisorPin(e.target.value)}
                  className="min-h-[42px] w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              {refundError && (
                <div className="p-2.5 bg-rose-50 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{refundError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmRefund}
                  className="min-h-[44px] flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl font-bold shadow-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Authorize & Issue Refund</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRefundModalOrder(null)}
                  className="min-h-[44px] px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
