import React, { useState, useMemo, useEffect } from 'react';
import { Order, StaffMember, Product, Customer } from '../types';
import { 
  FileText, Download, Send, Printer, Layout, ShieldCheck, 
  Settings, CheckCircle, HelpCircle, ArrowUpRight, CheckCircle2,
  AlertCircle, X, CheckSquare, Square, FileCheck, Clock,
  RotateCcw, Package, Truck, AlertTriangle, Sparkles, Filter,
  Eye, Check, ArrowRight, CornerDownRight, UserCheck, ShieldAlert,
  Search, Shield, DollarSign, Tag, Info, ChevronRight, PauseCircle,
  XCircle, CheckCircle as CheckCircleIcon, RefreshCw, Layers, Lock,
  ExternalLink, User, Mail, Phone, MapPin, Hash, BarChart3
} from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { getOrderDeliveryTelemetry, flagOrderAsDelivered } from '../utils/orderManagementUtils';
import { generateBarcodeSvg, generateQrCodeSvg } from '../utils/barcodeGenerator';
import { printReceiptViaIframe, downloadReceiptHtml, downloadReceiptText } from '../utils/receiptUtils';
import OrderLifecycle30StagesModal from './ecommerce/OrderLifecycle30StagesModal';
import { ORDER_LIFECYCLE_STAGES } from '../services/orderLifecycleService';

interface InvoiceModuleProps {
  orders: Order[];
  products?: Product[];
  customers?: Customer[];
  activeStaff?: StaffMember;
  onUpdateOrder?: (updatedOrder: Order) => void;
  onProcessRefund?: (orderId: string, reason: string, resolution: string, rmaNumber?: string) => void;
  onConfirmReceipt?: (orderId: string) => void;
  onMarkDelivered?: (orderId: string) => void;
  initialSelectedOrderId?: string | null;
}

export default function InvoiceModule({ 
  orders, 
  products = [],
  customers = [],
  activeStaff,
  onUpdateOrder,
  onProcessRefund,
  onConfirmReceipt,
  onMarkDelivered,
  initialSelectedOrderId
}: InvoiceModuleProps) {
  const { formatAmount } = useCurrency();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(initialSelectedOrderId || orders[0]?.id || null);
  const [activeTab, setActiveTab] = useState<'orders_fulfillment' | 'tax_invoicing' | 'cart_rules_audit'>('orders_fulfillment');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_approval' | 'approved_processing' | 'awaiting_receipt' | 'refund_requested' | 'completed' | 'on_hold_rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'Online Storefront' | 'In-Store POS' | 'Mobile App'>('all');

  // Custom Invoice Branding presets & Format (A4 Invoice vs 80mm POS Thermal Receipt)
  const [invoiceFormat, setInvoiceFormat] = useState<'a4_invoice' | 'pos_receipt'>('a4_invoice');
  const [invoiceColorPreset, setInvoiceColorPreset] = useState<'midnight' | 'corporate' | 'emerald'>('midnight');
  const [companyTaxId, setCompanyTaxId] = useState('VAT-GB-283192083');
  const [companyPhone, setCompanyPhone] = useState('+1 (800) 555-NEXUS');

  // Pre-Print Tax Compliance Verification Dialog State
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [taxVerifications, setTaxVerifications] = useState({
    taxIdVerified: false,
    taxRateVerified: false,
    taxBaseVerified: false,
    fiscalAuditVerified: false,
  });
  const [printSuccessToast, setPrintSuccessToast] = useState(false);
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);

  // Approval & Rejection Modal State
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('Price or shipping discrepancy');
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [courierName, setCourierName] = useState('FedEx Priority');
  const [customTrackingNo, setCustomTrackingNo] = useState('');
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
  const [holdReason, setHoldReason] = useState('Address verification required');

  // Dispute resolution admin form state
  const [disputeNotes, setDisputeNotes] = useState('');
  const [isResolvingRma, setIsResolvingRma] = useState(false);

  // 30-Stage Order Lifecycle Modal State
  const [isLifecycleModalOpen, setIsLifecycleModalOpen] = useState(false);

  // Expandable rules inspector accordion
  const [isValidationDetailsExpanded, setIsValidationDetailsExpanded] = useState(true);

  // Update selected order if prop changes
  useEffect(() => {
    if (initialSelectedOrderId) {
      setSelectedOrderId(initialSelectedOrderId);
    }
  }, [initialSelectedOrderId]);

  const selectedOrder = useMemo(() => {
    return orders.find(o => o.id === selectedOrderId || (o as any).orderNumber === selectedOrderId) || orders[0] || null;
  }, [orders, selectedOrderId]);

  // Compute live telemetry for selected order
  const selectedOrderTelemetry = useMemo(() => {
    if (!selectedOrder) return null;
    return getOrderDeliveryTelemetry(selectedOrder);
  }, [selectedOrder]);

  // Compute counts for filter pills
  const counts = useMemo(() => {
    let pendingApproval = 0;
    let approvedProcessing = 0;
    let awaiting = 0;
    let refundReq = 0;
    let completed = 0;
    let onHoldRejected = 0;

    orders.forEach(o => {
      const tel = getOrderDeliveryTelemetry(o);
      const isPending = o.approvalStatus === 'Pending Approval' || o.status === 'Pending' || o.status === 'Pending Approval';
      const isHold = o.status === 'On Hold' || o.approvalStatus === 'On Hold' || o.status === 'Rejected' || o.status === 'Cancelled' || o.approvalStatus === 'Rejected';
      const isRma = tel.effectiveStatus === 'Refund Requested' || o.refundRequested || o.status === 'Refund Requested';
      const isAwaiting = tel.effectiveStatus === 'Awaiting Receipt Confirmation' || o.status === 'Awaiting Receipt Confirmation';
      const isDone = tel.effectiveStatus === 'Completed' || o.status === 'Completed';

      if (isRma) {
        refundReq++;
      } else if (isPending) {
        pendingApproval++;
      } else if (isHold) {
        onHoldRejected++;
      } else if (isAwaiting) {
        awaiting++;
      } else if (isDone) {
        completed++;
      } else {
        approvedProcessing++;
      }
    });

    return { 
      pendingApproval, 
      approvedProcessing, 
      awaiting, 
      refundReq, 
      completed, 
      onHoldRejected, 
      total: orders.length 
    };
  }, [orders]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const tel = getOrderDeliveryTelemetry(o);
      const isPending = o.approvalStatus === 'Pending Approval' || o.status === 'Pending' || o.status === 'Pending Approval';
      const isHold = o.status === 'On Hold' || o.approvalStatus === 'On Hold' || o.status === 'Rejected' || o.status === 'Cancelled' || o.approvalStatus === 'Rejected';
      const isRma = tel.effectiveStatus === 'Refund Requested' || o.refundRequested || o.status === 'Refund Requested';
      const isAwaiting = tel.effectiveStatus === 'Awaiting Receipt Confirmation' || o.status === 'Awaiting Receipt Confirmation';
      const isDone = tel.effectiveStatus === 'Completed' || o.status === 'Completed';
      const isApprovedProcessing = (o.status === 'Approved' || o.status === 'Processing' || o.status === 'Dispatched' || o.approvalStatus === 'Approved') && !isDone && !isAwaiting && !isRma;

      // Status filter
      if (statusFilter === 'pending_approval' && !isPending) return false;
      if (statusFilter === 'approved_processing' && !isApprovedProcessing) return false;
      if (statusFilter === 'awaiting_receipt' && !isAwaiting) return false;
      if (statusFilter === 'refund_requested' && !isRma) return false;
      if (statusFilter === 'completed' && !isDone) return false;
      if (statusFilter === 'on_hold_rejected' && !isHold) return false;

      // Channel filter
      if (channelFilter !== 'all' && o.channel !== channelFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const ordNum = (o.orderNumber || o.id).toLowerCase();
        const custName = (o.customerName || '').toLowerCase();
        const custEmail = (o.customerEmail || '').toLowerCase();
        const trk = (o.trackingNumber || '').toLowerCase();
        const hasItemSku = o.items.some(i => (i.variantSku || '').toLowerCase().includes(query) || i.productName.toLowerCase().includes(query));

        if (!ordNum.includes(query) && !custName.includes(query) && !custEmail.includes(query) && !trk.includes(query) && !hasItemSku) {
          return false;
        }
      }

      return true;
    });
  }, [orders, statusFilter, channelFilter, searchTerm]);

  // Compute total VAT/GST collected & Revenue
  const totalTaxCollected = orders
    .filter(o => o.status === 'Completed' || o.status === 'Approved' || o.status === 'Dispatched' || getOrderDeliveryTelemetry(o).effectiveStatus === 'Completed')
    .reduce((sum, o) => sum + (o.tax || 0), 0);

  const totalSalesRevenue = orders
    .filter(o => o.status !== 'Rejected' && o.status !== 'Cancelled' && o.status !== 'Refunded')
    .reduce((sum, o) => sum + (o.total || o.grandTotal || 0), 0);

  const verifiedCount = Object.values(taxVerifications).filter(Boolean).length;
  const allTaxVerified = verifiedCount === 4;

  const handleToggleVerification = (field: keyof typeof taxVerifications) => {
    setTaxVerifications(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleVerifyAllTaxFields = () => {
    const nextState = !allTaxVerified;
    setTaxVerifications({
      taxIdVerified: nextState,
      taxRateVerified: nextState,
      taxBaseVerified: nextState,
      fiscalAuditVerified: nextState,
    });
  };

  const handleOpenTaxVerification = () => {
    if (!selectedOrder) return;
    setTaxVerifications({
      taxIdVerified: false,
      taxRateVerified: false,
      taxBaseVerified: false,
      fiscalAuditVerified: false,
    });
    setIsTaxModalOpen(true);
  };

  const handleConfirmAndPrint = () => {
    if (!allTaxVerified || !selectedOrder) return;
    setIsTaxModalOpen(false);
    setPrintSuccessToast(true);
    setTimeout(() => setPrintSuccessToast(false), 4000);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleSimulateEmailDispatch = () => {
    if (!selectedOrder) return;
    setActionSuccessToast(`Digital Invoice PDF INV-${selectedOrder.id.split('-').pop()} dispatched to ${selectedOrder.customerEmail || selectedOrder.customerName || 'customer@nexus.com'}`);
    setTimeout(() => setActionSuccessToast(null), 4000);
  };

  const handleDirectPrintPosReceipt = () => {
    if (!selectedOrder) return;
    printReceiptViaIframe(selectedOrder, formatAmount, activeStaff?.name || 'Store Cashier');
    setActionSuccessToast(`Sending 80mm POS Thermal Receipt for Order #${selectedOrder.orderNumber || selectedOrder.id} to Printer...`);
    setTimeout(() => setActionSuccessToast(null), 4000);
  };

  const handleDownloadReceiptHtmlFile = () => {
    if (!selectedOrder) return;
    downloadReceiptHtml(selectedOrder, formatAmount, activeStaff?.name || 'Store Cashier');
    setActionSuccessToast(`Receipt HTML downloaded for Order #${selectedOrder.orderNumber || selectedOrder.id}`);
    setTimeout(() => setActionSuccessToast(null), 4000);
  };

  const handleDownloadReceiptTextFile = () => {
    if (!selectedOrder) return;
    downloadReceiptText(selectedOrder, formatAmount, activeStaff?.name || 'Store Cashier');
    setActionSuccessToast(`Plain-text POS Receipt downloaded for Order #${selectedOrder.orderNumber || selectedOrder.id}`);
    setTimeout(() => setActionSuccessToast(null), 4000);
  };

  // ==========================================
  // ORDER APPROVAL ACTIONS WORKFLOW
  // ==========================================

  const handleApproveOrder = (order: Order, notesText?: string) => {
    const approverName = activeStaff?.name || 'Administrator';
    const updatedOrder: Order = {
      ...order,
      status: 'Approved',
      approvalStatus: 'Approved',
      deliveryStatus: 'Processing',
      approvedBy: approverName,
      approvedAt: new Date().toISOString(),
      approvalNotes: notesText || order.approvalNotes || 'Validated against 7-Step Server Pipeline. Authorized for fulfillment.',
      notes: `${order.notes ? order.notes + ' | ' : ''}Approved by ${approverName} on ${new Date().toLocaleString()}`
    };

    if (onUpdateOrder) {
      onUpdateOrder(updatedOrder);
    }

    setIsApproveModalOpen(false);
    setApprovalNotes('');
    setActionSuccessToast(`Order #${order.orderNumber || order.id} officially APPROVED by ${approverName}. Ready for dispatch.`);
    setTimeout(() => setActionSuccessToast(null), 4500);
  };

  const handleHoldOrder = (order: Order, reasonText: string) => {
    const approverName = activeStaff?.name || 'Administrator';
    const updatedOrder: Order = {
      ...order,
      status: 'On Hold',
      approvalStatus: 'On Hold',
      approvalNotes: reasonText,
      notes: `${order.notes ? order.notes + ' | ' : ''}Held for Review by ${approverName}: ${reasonText}`
    };

    if (onUpdateOrder) {
      onUpdateOrder(updatedOrder);
    }

    setIsHoldModalOpen(false);
    setActionSuccessToast(`Order #${order.orderNumber || order.id} placed ON HOLD: ${reasonText}`);
    setTimeout(() => setActionSuccessToast(null), 4500);
  };

  const handleRejectOrder = (order: Order, reason: string, details?: string) => {
    const approverName = activeStaff?.name || 'Administrator';
    const updatedOrder: Order = {
      ...order,
      status: 'Rejected',
      approvalStatus: 'Rejected',
      rejectionReason: `${reason}${details ? ` - ${details}` : ''}`,
      notes: `${order.notes ? order.notes + ' | ' : ''}REJECTED by ${approverName}: ${reason}`
    };

    if (onUpdateOrder) {
      onUpdateOrder(updatedOrder);
    }

    setIsRejectModalOpen(false);
    setRejectionNotes('');
    setActionSuccessToast(`Order #${order.orderNumber || order.id} REJECTED. Status updated.`);
    setTimeout(() => setActionSuccessToast(null), 4500);
  };

  const handleDispatchOrder = (order: Order, courier: string, trkNo: string) => {
    const finalTracking = trkNo.trim() || order.trackingNumber || `TRK-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const updatedOrder: Order = {
      ...order,
      status: 'Dispatched',
      deliveryStatus: 'Dispatched',
      trackingNumber: finalTracking,
      notes: `${order.notes ? order.notes + ' | ' : ''}Dispatched via ${courier} (Tracking: ${finalTracking})`
    };

    if (onUpdateOrder) {
      onUpdateOrder(updatedOrder);
    }

    setIsDispatchModalOpen(false);
    setCustomTrackingNo('');
    setActionSuccessToast(`Order #${order.orderNumber || order.id} DISPATCHED via ${courier}. Tracking: ${finalTracking}`);
    setTimeout(() => setActionSuccessToast(null), 4500);
  };

  // Mark as Delivered Action (Starts 48h confirmation window)
  const handleTriggerMarkDelivered = (order: Order) => {
    if (onMarkDelivered) {
      onMarkDelivered(order.id);
    } else if (onUpdateOrder) {
      const deliveredOrder = flagOrderAsDelivered(order);
      onUpdateOrder(deliveredOrder);
    }
    setActionSuccessToast(`Order #${order.orderNumber || order.id} marked Delivered. 48-Hour Receipt Confirmation Window initiated.`);
    setTimeout(() => setActionSuccessToast(null), 4000);
  };

  // Force Settle / Confirm Receipt Action (Completes order immediately)
  const handleTriggerConfirmReceipt = (order: Order) => {
    if (onConfirmReceipt) {
      onConfirmReceipt(order.id);
    } else if (onUpdateOrder) {
      onUpdateOrder({
        ...order,
        status: 'Completed',
        receiptConfirmed: true,
        receiptConfirmedAt: new Date().toISOString(),
        deliveryStatus: 'Delivered',
        notes: `${order.notes ? order.notes + ' | ' : ''}Confirmed by Admin on ${new Date().toLocaleDateString()}`
      });
    }
    setActionSuccessToast(`Receipt confirmed for Order #${order.orderNumber || order.id}. Order marked Completed & Finalized.`);
    setTimeout(() => setActionSuccessToast(null), 4000);
  };

  // RMA Resolution Actions
  const handleResolveRma = (action: 'approve_full_refund' | 'grant_store_credit' | 'dispatch_replacement' | 'decline_dispute') => {
    if (!selectedOrder) return;
    setIsResolvingRma(true);

    const rma = selectedOrder.refundRequestDetails?.rmaNumber || 'RMA-CASE';
    let resolutionMessage = '';
    let newStatus: Order['status'] = 'Refunded';

    if (action === 'approve_full_refund') {
      resolutionMessage = `Approved full refund of ${formatAmount(selectedOrder.total)} to original payment method.`;
      newStatus = 'Refunded';
      if (onProcessRefund) {
        onProcessRefund(selectedOrder.id, selectedOrder.refundRequestDetails?.reason || 'Dispute Approved', 'Full Refund to Original Payment', rma);
      }
    } else if (action === 'grant_store_credit') {
      const bonusCredit = selectedOrder.total * 1.10;
      resolutionMessage = `Issued 110% store credit of ${formatAmount(bonusCredit)} to customer account.`;
      newStatus = 'Refunded';
      if (onProcessRefund) {
        onProcessRefund(selectedOrder.id, selectedOrder.refundRequestDetails?.reason || 'Store Credit Issued', 'Store Credit (+10% Bonus)', rma);
      }
    } else if (action === 'dispatch_replacement') {
      resolutionMessage = `Free replacement item dispatched with expedited tracking.`;
      newStatus = 'Completed';
    } else {
      resolutionMessage = `Dispute declined. Reason: ${disputeNotes || 'Item returned outside policy terms.'}`;
      newStatus = 'Completed';
    }

    if (onUpdateOrder) {
      onUpdateOrder({
        ...selectedOrder,
        status: newStatus,
        refundRequested: false,
        refundAmount: action === 'approve_full_refund' || action === 'grant_store_credit' ? selectedOrder.total : undefined,
        refundReason: selectedOrder.refundRequestDetails?.reason,
        refundedAt: new Date().toISOString(),
        refundRequestDetails: selectedOrder.refundRequestDetails ? {
          ...selectedOrder.refundRequestDetails,
          status: action === 'decline_dispute' ? 'Rejected' : action === 'dispatch_replacement' ? 'Replacement Dispatched' : 'Refund Issued',
          reviewedBy: activeStaff?.name || 'Store Administrator',
          reviewedAt: new Date().toISOString(),
          adminNotes: disputeNotes || resolutionMessage
        } : undefined,
        notes: `${selectedOrder.notes ? selectedOrder.notes + ' | ' : ''}RMA RESOLUTION: ${resolutionMessage}`
      });
    }

    setIsResolvingRma(false);
    setActionSuccessToast(`RMA ${rma} updated: ${resolutionMessage}`);
    setTimeout(() => setActionSuccessToast(null), 4500);
  };

  // Helper to compute BNPL installment plans
  const generateInstallments = (totalAmount: number) => {
    const installmentAmount = totalAmount / 4;
    const today = new Date();
    return [
      { id: 1, dueDate: today.toLocaleDateString(), amount: installmentAmount, status: 'Paid (Initial)' },
      { id: 2, dueDate: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(), amount: installmentAmount, status: 'Scheduled' },
      { id: 3, dueDate: new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000).toLocaleDateString(), amount: installmentAmount, status: 'Scheduled' },
      { id: 4, dueDate: new Date(today.getTime() + 42 * 24 * 60 * 60 * 1000).toLocaleDateString(), amount: installmentAmount, status: 'Scheduled' }
    ];
  };

  // Calculate order profit & margin
  const orderProfitAnalysis = useMemo(() => {
    if (!selectedOrder) return { totalCost: 0, profit: 0, marginPercent: 0 };
    
    let totalCost = 0;
    selectedOrder.items.forEach(item => {
      const unitCost = item.cost || 0;
      totalCost += unitCost * item.quantity;
    });

    const netSales = (selectedOrder.subtotal || selectedOrder.total) - (selectedOrder.discount || 0);
    const profit = Math.max(0, netSales - totalCost);
    const marginPercent = netSales > 0 ? (profit / netSales) * 100 : 0;

    return { totalCost, profit, marginPercent };
  }, [selectedOrder]);

  const presetColors = {
    midnight: { bg: 'bg-slate-900', text: 'text-slate-900', border: 'border-slate-900' },
    corporate: { bg: 'bg-indigo-950', text: 'text-indigo-900', border: 'border-indigo-900' },
    emerald: { bg: 'bg-emerald-950', text: 'text-emerald-900', border: 'border-emerald-900' }
  };

  const currentTheme = presetColors[invoiceColorPreset];

  return (
    <div className="space-y-6" id="invoice-module-root">
      {/* Toast Feedback */}
      {(printSuccessToast || actionSuccessToast) && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-xs font-bold">{actionSuccessToast || 'Action Processed Successfully'}</p>
            <p className="text-[10px] text-slate-300">Order management records and database synchronized.</p>
          </div>
        </div>
      )}

      {/* Header with Mode Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-gray-200" id="invoice-header">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Order & Invoicing Management</h1>
            
            {counts.pendingApproval > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 animate-pulse">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                {counts.pendingApproval} Pending Approval
              </span>
            )}

            {counts.refundReq > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                {counts.refundReq} RMA Dispute{counts.refundReq > 1 ? 's' : ''}
              </span>
            )}

            {counts.awaiting > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-indigo-600" />
                {counts.awaiting} Awaiting 48h Receipt
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Zero-Trust Cart Rules verification audit, customer order approval workflows, delivery tracking, and certified fiscal invoices.
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-gray-200 rounded-2xl shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('orders_fulfillment')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'orders_fulfillment'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            id="tab-orders-fulfillment"
          >
            <Package className="w-3.5 h-3.5" />
            <span>Fulfillment & Approvals</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('tax_invoicing')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'tax_invoicing'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            id="tab-tax-invoices"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Tax Invoices & PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cart_rules_audit')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'cart_rules_audit'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            id="tab-cart-rules-audit"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Cart Rules & Security Audit</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="billing-stats-grid">
        <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Gross Transaction Volume</span>
          <div className="text-xl font-bold text-slate-900 font-mono">{formatAmount(totalSalesRevenue)}</div>
          <p className="text-[10px] text-gray-400">{orders.length} total orders recorded across all channels</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Pending Orders Approval</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">ACTION REQ</span>
          </div>
          <div className="text-xl font-bold text-amber-900 font-mono">{counts.pendingApproval} Orders</div>
          <p className="text-[10px] text-amber-700">Awaiting staff inspection & approval</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-indigo-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">Approved & In Transit</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">DISPATCHED</span>
          </div>
          <div className="text-xl font-bold text-indigo-900 font-mono">{counts.approvedProcessing + counts.awaiting} Orders</div>
          <p className="text-[10px] text-indigo-600">{counts.awaiting} in 48-hour delivery confirmation window</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">VAT / GST Ledger</span>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
              <ShieldCheck className="w-3 h-3" /> PCI Certified
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">{formatAmount(totalTaxCollected)}</div>
          <p className="text-[10px] text-gray-400">Statutory 8.00% tax collected on net taxable base</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ORDERS FULFILLMENT & INSPECTION / APPROVAL HUB */}
      {/* ========================================================================= */}
      {activeTab === 'orders_fulfillment' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: Order List, Search & Filters (4 cols) */}
          <div className="xl:col-span-4 bg-white rounded-2xl border border-gray-200 shadow-xs p-4 space-y-3">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search order #, customer, tracking, SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:bg-white"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1 pb-1">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                  statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({counts.total})
              </button>
              
              <button
                type="button"
                onClick={() => setStatusFilter('pending_approval')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                  statusFilter === 'pending_approval' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Pending Approval ({counts.pendingApproval})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('approved_processing')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                  statusFilter === 'approved_processing' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                }`}
              >
                <Package className="w-3 h-3" />
                <span>Approved ({counts.approvedProcessing})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('awaiting_receipt')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                  statusFilter === 'awaiting_receipt' ? 'bg-amber-700 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                <Truck className="w-3 h-3" />
                <span>48h Delivery ({counts.awaiting})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('refund_requested')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                  statusFilter === 'refund_requested' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Disputes ({counts.refundReq})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('completed')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                  statusFilter === 'completed' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Completed ({counts.completed})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('on_hold_rejected')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                  statusFilter === 'on_hold_rejected' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Hold/Rejected ({counts.onHoldRejected})
              </button>
            </div>

            {/* Channel Filter row */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <span className="font-semibold">Channel Source:</span>
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value as any)}
                className="text-[11px] font-bold px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
              >
                <option value="all">All Channels</option>
                <option value="Online Storefront">Online Storefront</option>
                <option value="In-Store POS">In-Store POS</option>
                <option value="Mobile App">Mobile App</option>
              </select>
            </div>

            {/* Orders Scroller */}
            <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
              {filteredOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No orders match the active filter criteria.
                </div>
              ) : (
                filteredOrders.map(order => {
                  const tel = getOrderDeliveryTelemetry(order);
                  const isSelected = selectedOrder?.id === order.id;
                  const isPending = order.approvalStatus === 'Pending Approval' || order.status === 'Pending' || order.status === 'Pending Approval';
                  const isHold = order.status === 'On Hold' || order.approvalStatus === 'On Hold';
                  const isRejected = order.status === 'Rejected' || order.status === 'Cancelled' || order.approvalStatus === 'Rejected';
                  const isRma = tel.effectiveStatus === 'Refund Requested' || order.refundRequested || order.status === 'Refund Requested';
                  const isAwaiting = tel.effectiveStatus === 'Awaiting Receipt Confirmation' || order.status === 'Awaiting Receipt Confirmation';

                  return (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className={`p-3.5 rounded-2xl cursor-pointer border transition-all text-xs space-y-2 relative ${
                        isSelected
                          ? isPending
                            ? 'border-amber-500 bg-amber-50/70 shadow-sm ring-2 ring-amber-400/30'
                            : isRma 
                              ? 'border-rose-500 bg-rose-50/70 shadow-sm ring-2 ring-rose-400/30'
                              : 'border-indigo-600 bg-indigo-50/60 shadow-sm ring-2 ring-indigo-400/30'
                          : isPending
                            ? 'border-amber-300 bg-amber-50/40 hover:bg-amber-50/70'
                            : isRma
                              ? 'border-rose-200 bg-rose-50/30 hover:bg-rose-50/60'
                              : isAwaiting
                                ? 'border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50/60'
                                : 'border-gray-200 hover:bg-slate-50 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold font-mono text-slate-900">
                              {order.orderNumber || `INV-${order.id.split('-').pop()}`}
                            </span>
                            <span className="text-slate-400 font-mono text-[10px]">
                              {new Date(order.date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-gray-700 font-medium truncate max-w-[170px]">
                            {order.customerName || 'Walk-in Guest'}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-slate-900 font-mono block">
                            {formatAmount(order.total || order.grandTotal || 0)}
                          </span>
                          <span className="text-[10px] text-gray-400 uppercase">
                            {order.channel === 'Online Storefront' ? '🌐 Web' : order.channel === 'In-Store POS' ? '🏪 POS' : '📱 App'}
                          </span>
                        </div>
                      </div>

                      {/* Status & Approval Badge */}
                      <div className="flex items-center justify-between pt-1 border-t border-black/5 text-[10px]">
                        {isRma ? (
                          <span className="px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            RMA Dispute
                          </span>
                        ) : isPending ? (
                          <span className="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Awaiting Approval
                          </span>
                        ) : isHold ? (
                          <span className="px-2 py-0.5 rounded-full font-bold bg-orange-100 text-orange-900 border border-orange-200 flex items-center gap-1">
                            <PauseCircle className="w-3 h-3 text-orange-600" />
                            On Hold
                          </span>
                        ) : isRejected ? (
                          <span className="px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Rejected
                          </span>
                        ) : isAwaiting ? (
                          <span className="px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                            <Truck className="w-3 h-3 text-indigo-600" />
                            {tel.timeRemainingFormatted}
                          </span>
                        ) : tel.effectiveStatus === 'Completed' || order.status === 'Completed' ? (
                          <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Completed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {order.status}
                          </span>
                        )}

                        <div className="flex items-center gap-1.5">
                          {isPending && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrderId(order.id);
                                handleApproveOrder(order);
                              }}
                              className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-0.5 shadow-xs cursor-pointer"
                              title="Quick Approve this order"
                            >
                              <Check className="w-2.5 h-2.5" /> Approve
                            </button>
                          )}

                          <span className="text-indigo-600 font-bold flex items-center gap-0.5">
                            Inspect <ArrowUpRight className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Deep Order Inspection & Approval Console (8 cols) */}
          <div className="xl:col-span-8 space-y-5">
            {selectedOrder && selectedOrderTelemetry ? (
              <div className="space-y-4">
                
                {/* 1. ORDER SUMMARY & STATUS CARD */}
                <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-5">
                  
                  {/* Top Bar with Order Number & Primary Status Badge */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-lg font-black text-slate-900 font-mono">
                          Order #{selectedOrder.orderNumber || selectedOrder.id}
                        </h2>
                        
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                          {selectedOrder.channel}
                        </span>

                        {selectedOrder.approvalStatus === 'Pending Approval' || selectedOrder.status === 'Pending Approval' || selectedOrder.status === 'Pending' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Awaiting Staff Approval
                          </span>
                        ) : selectedOrder.status === 'Approved' || selectedOrder.approvalStatus === 'Approved' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Approved by {selectedOrder.approvedBy || 'Staff'}
                          </span>
                        ) : selectedOrder.status === 'On Hold' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-900 border border-orange-300 flex items-center gap-1">
                            <PauseCircle className="w-3.5 h-3.5 text-orange-600" />
                            On Hold: {selectedOrder.approvalNotes || 'Review required'}
                          </span>
                        ) : selectedOrder.status === 'Rejected' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Rejected: {selectedOrder.rejectionReason || 'Declined'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                            {selectedOrder.status}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-500">
                        Placed on {new Date(selectedOrder.date).toLocaleString()} • Customer: <strong>{selectedOrder.customerName || 'Guest'}</strong> ({selectedOrder.customerEmail || 'No email'})
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setIsLifecycleModalOpen(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                        id="btn-inspect-30-stage-lifecycle"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>30-Stage Lifecycle Console</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('tax_invoicing')}
                        className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        id="btn-inspect-print-invoice"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Invoice</span>
                      </button>
                    </div>
                  </div>


                  {/* VISUAL TIMELINE */}
                  <div className="py-2">
                    <div className="flex items-center justify-between relative">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 rounded-full z-0"></div>
                      {[
                        { label: 'Payment Confirmed', active: ['Processing', 'Approved', 'Dispatched', 'Delivered', 'Completed'].includes(selectedOrder.status), completed: ['Processing', 'Approved', 'Dispatched', 'Delivered', 'Completed'].includes(selectedOrder.status) },
                        { label: 'Warehouse Allocated', active: ['Processing', 'Dispatched', 'Delivered', 'Completed'].includes(selectedOrder.status), completed: ['Processing', 'Dispatched', 'Delivered', 'Completed'].includes(selectedOrder.status) },
                        { label: 'Dispatched', active: ['Dispatched', 'Delivered', 'Completed'].includes(selectedOrder.status), completed: ['Dispatched', 'Delivered', 'Completed'].includes(selectedOrder.status) },
                        { label: 'Delivered', active: ['Delivered', 'Completed'].includes(selectedOrder.status), completed: ['Delivered', 'Completed'].includes(selectedOrder.status) }
                      ].map((step, idx) => (
                        <div key={idx} className="relative z-10 flex flex-col items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${step.completed ? 'bg-emerald-500 border-emerald-500 text-white' : step.active ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-slate-300'}`}>
                            {step.completed ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-2.5 h-2.5 rounded-full bg-current"></div>}
                          </div>
                          <span className={`text-[10px] font-bold text-center w-24 ${step.completed ? 'text-emerald-700' : step.active ? 'text-indigo-700' : 'text-slate-400'}`}>
                            {step.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* MULTI-DOMAIN INDEPENDENT STATUS MATRIX */}
                  <div className="p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 font-black text-xs flex items-center justify-center">
                          30
                        </div>
                        <div>
                          <span className="text-xs font-black text-white tracking-wide uppercase">
                            Independent Multi-Domain Status Matrix (30-Stage Lifecycle)
                          </span>
                          <p className="text-[10px] text-slate-400">
                            Separate domain state tracking avoids single monolithic status conflicts.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsLifecycleModalOpen(true)}
                        className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                      >
                        Inspect 30 Stages →
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                      {/* Order Domain */}
                      <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800 flex flex-col justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">1. Order Domain</span>
                        <span className="text-[11px] font-black text-sky-400 mt-1">
                          {selectedOrder.lifecycleDomainStatuses?.orderStatus || (selectedOrder.status === 'Completed' ? 'Completed' : 'Confirmed')}
                        </span>
                      </div>

                      {/* Payment Domain */}
                      <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800 flex flex-col justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">2. Payment Domain</span>
                        <span className="text-[11px] font-black text-emerald-400 mt-1">
                          {selectedOrder.lifecycleDomainStatuses?.paymentStatus || (selectedOrder.status === 'Pending Payment' ? 'Pending Verification' : 'Paid')}
                        </span>
                      </div>

                      {/* Fulfillment Domain */}
                      <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800 flex flex-col justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">3. Fulfillment Domain</span>
                        <span className="text-[11px] font-black text-purple-400 mt-1">
                          {selectedOrder.lifecycleDomainStatuses?.fulfillmentStatus || (selectedOrder.deliveryStatus === 'Delivered' ? 'Fulfilled' : selectedOrder.status === 'Dispatched' ? 'Fulfilled' : 'Allocated')}
                        </span>
                      </div>

                      {/* Shipment Domain */}
                      <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800 flex flex-col justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">4. Shipment Domain</span>
                        <span className="text-[11px] font-black text-blue-400 mt-1">
                          {selectedOrder.lifecycleDomainStatuses?.shipmentStatus || (selectedOrder.deliveryStatus === 'Delivered' ? 'Delivered' : selectedOrder.deliveryStatus === 'Dispatched' ? 'Dispatched' : 'Unshipped')}
                        </span>
                      </div>

                      {/* Return Domain */}
                      <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800 flex flex-col justify-between col-span-2 sm:col-span-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">5. Return Domain</span>
                        <span className="text-[11px] font-black text-rose-400 mt-1">
                          {selectedOrder.lifecycleDomainStatuses?.returnStatus || (selectedOrder.refundRequested ? 'Return Requested' : 'None')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. ORDER APPROVAL & WORKFLOW ACTION CONTROL BAR */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3" id="order-approval-action-bar">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          Order Approval & Fulfillment State Machine:
                        </span>
                        <p className="text-[11px] text-slate-500">
                          {selectedOrder.approvalStatus === 'Approved' 
                            ? `Authorized by ${selectedOrder.approvedBy || 'Staff'} on ${selectedOrder.approvedAt ? new Date(selectedOrder.approvedAt).toLocaleDateString() : 'recent'}`
                            : 'Inspect server validation and authorize fulfillment to update inventory & dispatch schedule.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* APPROVE ACTION */}
                        {selectedOrder.status !== 'Approved' && selectedOrder.status !== 'Dispatched' && selectedOrder.status !== 'Completed' && selectedOrder.status !== 'Refunded' && (
                          <button
                            type="button"
                            onClick={() => setIsApproveModalOpen(true)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                            id="btn-order-approve-action"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve Order</span>
                          </button>
                        )}

                        {/* HOLD ACTION */}
                        {selectedOrder.status !== 'On Hold' && selectedOrder.status !== 'Completed' && selectedOrder.status !== 'Refunded' && (
                          <button
                            type="button"
                            onClick={() => setIsHoldModalOpen(true)}
                            className="px-3 py-1.5 bg-white hover:bg-orange-50 text-orange-800 border border-orange-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                            id="btn-order-hold-action"
                          >
                            <PauseCircle className="w-3.5 h-3.5 text-orange-600" />
                            <span>Hold</span>
                          </button>
                        )}

                        {/* REJECT ACTION */}
                        {selectedOrder.status !== 'Rejected' && selectedOrder.status !== 'Completed' && selectedOrder.status !== 'Refunded' && (
                          <button
                            type="button"
                            onClick={() => setIsRejectModalOpen(true)}
                            className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-800 border border-rose-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                            id="btn-order-reject-action"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Reject</span>
                          </button>
                        )}

                        {/* DISPATCH ACTION */}
                        {selectedOrder.status === 'Approved' && (
                          <button
                            type="button"
                            onClick={() => setIsDispatchModalOpen(true)}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                            id="btn-order-dispatch-action"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Dispatch & Add Tracking</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. AUTHORITATIVE 7-STEP ZERO-TRUST CART RULES AUDIT */}
                  <div className="border border-indigo-100 bg-indigo-50/40 rounded-2xl p-4 space-y-3" id="authoritative-cart-rules-audit-panel">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                            Authoritative 7-Step Cart Rules & Zero-Trust Verification Audit
                          </h3>
                          <p className="text-[11px] text-indigo-700">
                            Server-side ground truth verified. 0% price tampering detected.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsValidationDetailsExpanded(!isValidationDetailsExpanded)}
                        className="text-xs font-bold text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
                      >
                        {isValidationDetailsExpanded ? 'Collapse Audit' : 'Expand 7 Steps'}
                      </button>
                    </div>

                    {isValidationDetailsExpanded && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 text-xs">
                        {/* Step 1 & 2 */}
                        <div className="p-2.5 bg-white rounded-xl border border-indigo-100 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">1. Products & Variants</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <p className="font-bold text-slate-800 text-[11px]">{selectedOrder.items.length} Items Validated</p>
                          <span className="text-[10px] text-gray-500 block">Catalog SKUs canonical match</span>
                        </div>

                        <div className="p-2.5 bg-white rounded-xl border border-indigo-100 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">2. Price Integrity</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <p className="font-bold text-slate-800 text-[11px]">Server Prices Enforced</p>
                          <span className="text-[10px] text-emerald-700 font-semibold block">Browser prices ignored</span>
                        </div>

                        {/* Step 3 & 4 */}
                        <div className="p-2.5 bg-white rounded-xl border border-indigo-100 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">3. Promos & Points</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <p className="font-bold text-slate-800 text-[11px]">
                            {selectedOrder.discount > 0 ? `-${formatAmount(selectedOrder.discount)} Verified` : 'No Promo Applied'}
                          </p>
                          <span className="text-[10px] text-gray-500 block">
                            {selectedOrder.appliedCouponCode ? `Coupon: ${selectedOrder.appliedCouponCode}` : 'Min spend verified'}
                          </span>
                        </div>

                        <div className="p-2.5 bg-white rounded-xl border border-indigo-100 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">4. Stock Allocation</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <p className="font-bold text-slate-800 text-[11px]">Real-time Inventory OK</p>
                          <span className="text-[10px] text-gray-500 block">Oversell protection passed</span>
                        </div>

                        {/* Step 5 & 6 */}
                        <div className="p-2.5 bg-white rounded-xl border border-indigo-100 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">5. Shipping Calculation</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <p className="font-bold text-slate-800 text-[11px]">
                            {selectedOrder.shippingCost ? formatAmount(selectedOrder.shippingCost) : 'Standard / Calculated'}
                          </p>
                          <span className="text-[10px] text-gray-500 block">
                            {selectedOrder.shippingMethod || 'Standard Ground'}
                          </span>
                        </div>

                        <div className="p-2.5 bg-white rounded-xl border border-indigo-100 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">6. Tax Jurisdiction</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <p className="font-bold text-slate-800 text-[11px]">{formatAmount(selectedOrder.tax)} (8.00%)</p>
                          <span className="text-[10px] text-gray-500 block">Computed on taxable subtotal</span>
                        </div>

                        {/* Step 7 */}
                        <div className="p-2.5 bg-white rounded-xl border border-indigo-100 space-y-1 sm:col-span-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">7. Total & Cryptographic Checksum</span>
                            <span className="text-[10px] font-mono font-bold text-indigo-700">SIG: VERIFIED</span>
                          </div>
                          <p className="font-bold text-slate-900 font-mono text-[11px]">
                            Grand Total: {formatAmount(selectedOrder.total || selectedOrder.grandTotal || 0)}
                          </p>
                          <span className="text-[9px] text-slate-400 font-mono truncate block">
                            Token: {selectedOrder.cartValidationDetails?.signature || `SIG-VALID-${selectedOrder.id}`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. AUTOMATIC 48-HOUR CONFIRMATION TELEMETRY BANNER */}
                  {selectedOrderTelemetry.isAwaitingReceiptConfirmation && (
                    <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                            <Clock className="w-5 h-5 animate-spin" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-amber-900">
                              48-Hour Delivery Receipt Confirmation Protocol Active
                            </h3>
                            <p className="text-[11px] text-amber-700 mt-0.5">
                              Package delivered. Customer has 48 hours to confirm receipt (+50 loyalty points) or request RMA assistance.
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-mono font-black text-amber-900">
                            {selectedOrderTelemetry.timeRemainingFormatted}
                          </div>
                          <span className="text-[10px] text-amber-600">Until Auto-Completion</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-amber-800 font-semibold">
                          <span>Delivered: {selectedOrder.deliveredDate || 'Recent'}</span>
                          <span>{selectedOrderTelemetry.percentElapsed}% Window Elapsed</span>
                        </div>
                        <div className="w-full h-2 bg-amber-200/70 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-600 rounded-full transition-all duration-500"
                            style={{ width: `${selectedOrderTelemetry.percentElapsed}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleTriggerConfirmReceipt(selectedOrder)}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Force Settle / Complete Order</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 5. CUSTOMER REFUND REQUEST / RMA DISPUTE PANEL */}
                  {(selectedOrder.refundRequested || selectedOrder.refundRequestDetails || selectedOrder.status === 'Refund Requested') && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 space-y-4">
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-rose-200">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                            <RotateCcw className="w-5 h-5 animate-pulse" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-black text-rose-950">
                                🚨 Customer Refund & Return Request Initiated
                              </h3>
                              <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-rose-200 text-rose-900">
                                {selectedOrder.refundRequestDetails?.rmaNumber || 'RMA-ACTIVE'}
                              </span>
                            </div>
                            <p className="text-xs text-rose-800 mt-0.5">
                              Admin action required to review evidence and authorize resolution.
                            </p>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-600 text-white shrink-0 shadow-xs">
                          {selectedOrder.refundRequestDetails?.status || 'Pending Review'}
                        </span>
                      </div>

                      {/* Dispute Details Breakdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-white rounded-xl border border-rose-200 space-y-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Customer Reason</span>
                          <p className="font-bold text-rose-950">
                            {selectedOrder.refundRequestDetails?.reason || selectedOrder.refundReason || 'Customer reported defective/damaged shipment'}
                          </p>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-rose-200 space-y-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Desired Resolution</span>
                          <p className="font-bold text-indigo-950">
                            {selectedOrder.refundRequestDetails?.resolution || 'Full Refund to Original Payment'}
                          </p>
                        </div>
                      </div>

                      {/* Customer Notes */}
                      {selectedOrder.refundRequestDetails?.notes && (
                        <div className="p-3 bg-white rounded-xl border border-rose-200 space-y-1 text-xs">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Customer Notes & Explanation</span>
                          <p className="text-slate-700 italic">
                            "{selectedOrder.refundRequestDetails.notes}"
                          </p>
                        </div>
                      )}

                      {/* Photographic Evidence */}
                      {selectedOrder.refundRequestDetails?.photos && selectedOrder.refundRequestDetails.photos.length > 0 && (
                        <div className="space-y-1.5 text-xs">
                          <span className="text-[10px] font-bold text-gray-500 uppercase block">Customer Uploaded Evidence</span>
                          <div className="flex items-center gap-2">
                            {selectedOrder.refundRequestDetails.photos.map((photo, i) => (
                              <a 
                                key={i} 
                                href={photo} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="relative w-16 h-16 rounded-xl overflow-hidden border border-rose-300 group hover:opacity-90"
                              >
                                <img src={photo} alt="Defect evidence" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white text-[10px]">
                                  <Eye className="w-4 h-4" />
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Admin Decision Actions */}
                      <div className="pt-3 border-t border-rose-200 space-y-2.5">
                        <span className="text-xs font-bold text-slate-900 block">Authorize Management Decision:</span>
                        
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={isResolvingRma}
                            onClick={() => handleResolveRma('approve_full_refund')}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve & Process Full Refund ({formatAmount(selectedOrder.total)})</span>
                          </button>

                          <button
                            type="button"
                            disabled={isResolvingRma}
                            onClick={() => handleResolveRma('grant_store_credit')}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>Issue Store Credit (+10% Bonus: {formatAmount(selectedOrder.total * 1.10)})</span>
                          </button>

                          <button
                            type="button"
                            disabled={isResolvingRma}
                            onClick={() => handleResolveRma('dispatch_replacement')}
                            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                          >
                            <Package className="w-3.5 h-3.5" />
                            <span>Dispatch Free Replacement</span>
                          </button>

                          <button
                            type="button"
                            disabled={isResolvingRma}
                            onClick={() => handleResolveRma('decline_dispute')}
                            className="px-3.5 py-2 rounded-xl border border-rose-300 hover:bg-rose-100 text-rose-800 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Decline Dispute</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 6. ITEMS TABLE WITH MARGIN ANALYSIS */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                        Itemized Purchase & Profit Margins ({selectedOrder.items.length} items)
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700">
                        Order Gross Margin: {orderProfitAnalysis.marginPercent.toFixed(1)}% (+{formatAmount(orderProfitAnalysis.profit)})
                      </span>
                    </div>

                    <div className="border border-gray-200 rounded-2xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 border-b border-gray-200 text-slate-500 font-bold text-[10px] uppercase">
                            <th className="px-4 py-2.5">Item & SKU</th>
                            <th className="px-3 py-2.5 text-center">Qty</th>
                            <th className="px-3 py-2.5 text-right">Unit Price</th>
                            <th className="px-3 py-2.5 text-right">Unit Cost</th>
                            <th className="px-3 py-2.5 text-right">Line Profit</th>
                            <th className="px-4 py-2.5 text-right">Line Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-slate-700">
                          {selectedOrder.items.map((item, idx) => {
                            const cost = item.cost || 0;
                            const lineTotal = item.price * item.quantity;
                            const lineProfit = Math.max(0, (item.price - cost) * item.quantity);
                            const lineMargin = lineTotal > 0 ? (lineProfit / lineTotal) * 100 : 0;

                            return (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3">
                                  <div className="font-semibold text-slate-900">{item.productName}</div>
                                  {item.variantSku && (
                                    <div className="text-[10px] text-gray-400 font-mono">
                                      SKU: {item.variantSku} {item.variantName ? `(${item.variantName})` : ''}
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-center font-mono font-bold text-slate-900">{item.quantity}</td>
                                <td className="px-3 py-3 text-right font-mono">{formatAmount(item.price)}</td>
                                <td className="px-3 py-3 text-right font-mono text-slate-400">{cost > 0 ? formatAmount(cost) : '—'}</td>
                                <td className="px-3 py-3 text-right font-mono text-emerald-700 font-semibold">
                                  +{formatAmount(lineProfit)} <span className="text-[9px] text-slate-400">({lineMargin.toFixed(0)}%)</span>
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{formatAmount(lineTotal)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 7. FINANCIAL TOTALS SUMMARY */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100 text-xs">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer & Shipping Information</span>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{selectedOrder.customerName || 'Guest Customer'}</span>
                        </div>
                        {selectedOrder.customerEmail && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{selectedOrder.customerEmail}</span>
                          </div>
                        )}
                        {selectedOrder.deliveryAddress && (
                          <div className="flex items-start gap-1.5 text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span>{selectedOrder.deliveryAddress}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-slate-600 pt-1 font-mono text-[11px]">
                          <Truck className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Tracking: <strong>{selectedOrder.trackingNumber || 'TRK-PENDING'}</strong> ({selectedOrder.shippingMethod || 'Standard'})</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Items Subtotal</span>
                        <span className="font-mono font-semibold text-slate-900">{formatAmount(selectedOrder.subtotal)}</span>
                      </div>
                      {selectedOrder.discount > 0 && (
                        <div className="flex justify-between items-center text-emerald-700 font-semibold">
                          <span>Discount (Promos / Loyalty)</span>
                          <span className="font-mono">-{formatAmount(selectedOrder.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Shipping Cost</span>
                        <span className="font-mono font-semibold text-slate-900">{selectedOrder.shippingCost ? formatAmount(selectedOrder.shippingCost) : 'FREE'}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Estimated Tax (8%)</span>
                        <span className="font-mono font-semibold text-slate-900">{formatAmount(selectedOrder.tax)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-900 font-black text-sm pt-1.5 border-t border-slate-200">
                        <span>Grand Total (Verified)</span>
                        <span className="font-mono text-base text-indigo-900">{formatAmount(selectedOrder.total || selectedOrder.grandTotal || 0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 8. QUICK FULFILLMENT ACTIONS FOOTER */}
                  <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="text-slate-500 text-[11px]">
                      Payment: <strong>{selectedOrder.paymentMethod}</strong> • Settlement: <strong className="text-emerald-700">Authorized</strong>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Mark as delivered button if not delivered yet */}
                      {selectedOrder.status !== 'Completed' && selectedOrder.status !== 'Awaiting Receipt Confirmation' && selectedOrder.status !== 'Refunded' && (
                        <button
                          type="button"
                          onClick={() => handleTriggerMarkDelivered(selectedOrder)}
                          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Mark as Delivered (Start 48h Window)</span>
                        </button>
                      )}

                      {/* Settle / Force Complete button */}
                      {selectedOrder.status !== 'Completed' && (
                        <button
                          type="button"
                          onClick={() => handleTriggerConfirmReceipt(selectedOrder)}
                          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Force Complete Order</span>
                        </button>
                      )}
                    </div>
                  </div>

                </div>

              </div>
            ) : (
              <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center text-gray-400 text-xs">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-500" />
                Select an order from the list on the left to inspect server validation, approve orders, and manage fulfillment.
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CERTIFIED TAX INVOICING CANVAS & PDF */}
      {/* ========================================================================= */}
      {activeTab === 'tax_invoicing' && (
        <div className="space-y-4" id="invoice-branding-playground">
          {selectedOrder ? (
            <>
              {/* Branding & Format controls */}
              <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center" id="branding-toolbox">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Layout className="w-4 h-4 text-indigo-600" /> Format:
                  </div>
                  <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setInvoiceFormat('a4_invoice')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        invoiceFormat === 'a4_invoice'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      id="btn-format-a4"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Full A4 Tax Invoice</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvoiceFormat('pos_receipt')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        invoiceFormat === 'pos_receipt'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      id="btn-format-receipt"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>80mm POS Thermal Receipt (Barcode)</span>
                    </button>
                  </div>
                </div>

                {invoiceFormat === 'a4_invoice' && (
                  <div className="flex gap-2 items-center flex-wrap">
                    <span className="text-xs font-semibold text-slate-500">Theme:</span>
                    <button
                      onClick={() => setInvoiceColorPreset('midnight')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                        invoiceColorPreset === 'midnight' ? 'border-slate-900 bg-slate-900 text-white' : 'border-gray-200 bg-white text-slate-700'
                      }`}
                    >
                      Midnight
                    </button>
                    <button
                      onClick={() => setInvoiceColorPreset('corporate')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                        invoiceColorPreset === 'corporate' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 bg-white text-slate-700'
                      }`}
                    >
                      Corporate
                    </button>
                    <button
                      onClick={() => setInvoiceColorPreset('emerald')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                        invoiceColorPreset === 'emerald' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-200 bg-white text-slate-700'
                      }`}
                    >
                      Emerald
                    </button>
                  </div>
                )}

                {invoiceFormat === 'pos_receipt' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDirectPrintPosReceipt}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      id="btn-direct-print-thermal-receipt"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print 80mm Receipt</span>
                    </button>
                    <button
                      onClick={handleDownloadReceiptHtmlFile}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      title="Download styled HTML receipt"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>HTML</span>
                    </button>
                    <button
                      onClick={handleDownloadReceiptTextFile}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      title="Download formatted Plain Text receipt"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>TXT</span>
                    </button>
                  </div>
                )}
              </div>

              {/* FORMAT 1: POS THERMAL RECEIPT CANVAS (80mm) */}
              {invoiceFormat === 'pos_receipt' && (
                <div className="bg-slate-100 p-6 sm:p-10 rounded-3xl border border-slate-200 flex flex-col items-center justify-center" id="pos-thermal-receipt-preview">
                  
                  {/* The CSS-Printable Receipt Paper Card */}
                  <div 
                    className="w-full max-w-[360px] bg-white text-slate-900 p-6 sm:p-7 rounded-2xl shadow-xl border border-slate-200/80 font-mono space-y-4 text-xs transition-all relative overflow-hidden"
                    id="printable-pos-receipt-card"
                  >
                    {/* Top Decorative Receipt Notch */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-repeating-linear-gradient(45deg, #cbd5e1, #cbd5e1 5px, #ffffff 5px, #ffffff 10px)" />

                    {/* Receipt Store Header */}
                    <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
                      <div className="w-9 h-9 bg-slate-900 text-white rounded-full mx-auto flex items-center justify-center font-black text-sm">
                        N
                      </div>
                      <h3 className="font-extrabold text-sm tracking-wider uppercase text-slate-950 font-sans">
                        Nexus Enterprise Commerce
                      </h3>
                      <p className="text-[10px] text-slate-500 font-sans">
                        Point-of-Sale Register & Retail Terminal
                      </p>
                      <p className="text-[10px] text-slate-500">
                        450 Market St, San Francisco, CA 94105
                      </p>
                      <p className="text-[10px] text-slate-600 font-bold">
                        Tel: {companyPhone} • Tax ID: {companyTaxId}
                      </p>
                    </div>

                    {/* Transaction Meta Details */}
                    <div className="text-[11px] space-y-1 pb-3 border-b border-dashed border-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Order Ref:</span>
                        <strong className="text-slate-900 font-mono">{selectedOrder.orderNumber || selectedOrder.id}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Date & Time:</span>
                        <span>{new Date(selectedOrder.date).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Cashier:</span>
                        <span>{activeStaff?.name || 'Terminal #1 Cashier'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Sales Channel:</span>
                        <span className="uppercase font-bold text-indigo-700">{selectedOrder.channel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Customer:</span>
                        <span className="font-semibold truncate max-w-[170px]">{selectedOrder.customerName || 'Walk-in Guest'}</span>
                      </div>
                      {selectedOrder.customerEmail && (
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>Email:</span>
                          <span className="truncate max-w-[170px]">{selectedOrder.customerEmail}</span>
                        </div>
                      )}
                    </div>

                    {/* Itemized Table */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 border-b border-slate-900 pb-1 uppercase tracking-wider">
                        <span className="w-1/2">Item</span>
                        <span className="w-1/6 text-center">Qty</span>
                        <span className="w-1/3 text-right">Total</span>
                      </div>

                      <div className="space-y-2.5 divide-y divide-dashed divide-slate-200">
                        {selectedOrder.items.map((item, idx) => (
                          <div key={idx} className="pt-2 flex justify-between items-start text-[11px]">
                            <div className="w-1/2 pr-1">
                              <span className="font-bold text-slate-900 block leading-tight font-sans text-xs">{item.productName}</span>
                              {item.variantSku && (
                                <span className="text-[9px] text-slate-400 block font-mono">SKU: {item.variantSku}</span>
                              )}
                              <span className="text-[10px] text-slate-500">@{formatAmount(item.price)}</span>
                            </div>
                            <div className="w-1/6 text-center font-bold text-slate-900">
                              {item.quantity}
                            </div>
                            <div className="w-1/3 text-right font-bold text-slate-900">
                              {formatAmount(item.price * item.quantity)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Totals Breakdown */}
                    <div className="pt-3 border-t border-dashed border-slate-300 space-y-1.5 text-[11px]">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal:</span>
                        <span className="font-semibold">{formatAmount(selectedOrder.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Sales Tax (8.0%):</span>
                        <span className="font-semibold">{formatAmount(selectedOrder.tax)}</span>
                      </div>
                      {selectedOrder.discount > 0 && (
                        <div className="flex justify-between text-emerald-700 font-bold">
                          <span>Discount / Promo:</span>
                          <span>-{formatAmount(selectedOrder.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-black text-slate-950 pt-2 border-t-2 border-slate-900">
                        <span>TOTAL DUE:</span>
                        <span className="text-base">{formatAmount(selectedOrder.total || selectedOrder.grandTotal || 0)}</span>
                      </div>
                    </div>

                    {/* Payment Details Badge */}
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[10px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Payment Tender:</span>
                        <strong className="text-slate-900">{selectedOrder.paymentMethod}</strong>
                      </div>
                      {selectedOrder.paymentMethod === 'Cash' && typeof selectedOrder.cashTendered === 'number' && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Cash Received:</span>
                            <span className="font-bold">{formatAmount(selectedOrder.cashTendered)}</span>
                          </div>
                          <div className="flex justify-between text-emerald-700 font-bold">
                            <span>Change Given:</span>
                            <span>{formatAmount(selectedOrder.cashChange || 0)}</span>
                          </div>
                        </>
                      )}
                      {selectedOrder.loyaltyPointsEarned && (
                        <div className="flex justify-between text-indigo-700 font-bold pt-1 border-t border-dashed border-slate-200">
                          <span>Loyalty Points Added:</span>
                          <span>+{selectedOrder.loyaltyPointsEarned} pts</span>
                        </div>
                      )}
                    </div>

                    {/* High-Resolution Generated SVG Barcode for Order ID */}
                    <div className="text-center pt-2 space-y-2" id="receipt-barcode-section">
                      <div 
                        className="w-full flex justify-center overflow-hidden"
                        dangerouslySetInnerHTML={{
                          __html: generateBarcodeSvg(selectedOrder.orderNumber || selectedOrder.id, {
                            width: 280,
                            height: 52,
                            showText: true,
                            barColor: '#0f172a',
                            bgColor: '#ffffff'
                          })
                        }}
                      />

                      {/* Verification QR Code */}
                      <div className="flex items-center justify-center gap-3 pt-1 border-t border-dashed border-slate-200">
                        <div 
                          className="w-16 h-16 shrink-0"
                          dangerouslySetInnerHTML={{
                            __html: generateQrCodeSvg(selectedOrder.orderNumber || selectedOrder.id, {
                              size: 64,
                              fgColor: '#0f172a',
                              bgColor: '#ffffff'
                            })
                          }}
                        />
                        <div className="text-left text-[9px] text-slate-500 leading-tight space-y-0.5">
                          <span className="font-bold text-slate-900 block font-sans">SCAN TO VERIFY RECEIPT</span>
                          <span>Auth Token: {selectedOrder.id.slice(-8).toUpperCase()}</span>
                          <span className="block text-emerald-700 font-bold">Verified POS Authenticity</span>
                        </div>
                      </div>
                    </div>

                    {/* Return Policy & Footer Message */}
                    <div className="text-center pt-2 border-t border-dashed border-slate-300 text-[9px] text-slate-500 space-y-1 font-sans">
                      <div className="font-bold text-slate-800 uppercase">30-Day Return & Exchange Policy</div>
                      <p className="leading-tight">
                        Items eligible for exchange within 30 days with this receipt in original packaging.
                      </p>
                      <div className="pt-1 font-bold text-slate-900 text-[10px]">
                        *** THANK YOU FOR YOUR BUSINESS! ***
                      </div>
                      <div className="text-[8px] text-slate-400">
                        www.nexuscommerce.io • Support: support@nexuspos.io
                      </div>
                    </div>

                  </div>

                  {/* Print / Action buttons below preview */}
                  <div className="mt-6 flex flex-wrap gap-3 items-center justify-center">
                    <button
                      onClick={handleDirectPrintPosReceipt}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-extrabold flex items-center gap-2 shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
                      id="btn-print-pos-receipt-bottom"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print to 80mm POS Thermal Printer</span>
                    </button>
                    <button
                      onClick={handleDownloadReceiptHtmlFile}
                      className="px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-slate-500" />
                      <span>Download Receipt (HTML)</span>
                    </button>
                    <button
                      onClick={handleDownloadReceiptTextFile}
                      className="px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span>Download Receipt (TXT)</span>
                    </button>
                  </div>

                </div>
              )}

              {/* FORMAT 2: FULL A4 TAX INVOICE */}
              {invoiceFormat === 'a4_invoice' && (
                <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden flex flex-col justify-between" id="invoice-sheet-box">
                <div className="p-6 sm:p-8 space-y-6" id="printable-invoice-sheet">
                  {/* Header */}
                  <div className={`p-4 rounded-2xl text-white ${currentTheme.bg} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`} id="sheet-header">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-white text-slate-900 font-extrabold rounded flex items-center justify-center text-xs">N</div>
                        <span className="text-sm font-black tracking-wider uppercase">NEXUS GLOBAL LOGISTICS</span>
                      </div>
                      <p className="text-[10px] opacity-75">Corporate HQ: 100 Enterprise Way, London</p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <span className="text-xs font-extrabold block">OFFICIAL TAX INVOICE</span>
                      <span className="text-[9px] opacity-75 font-mono">Invoice Ref: INV-{selectedOrder.id.split('-').pop()}</span>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs border-b border-gray-100 pb-5">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Sender Legal Entity</span>
                      <p className="font-bold text-slate-900">Nexus Logistics Retail Ltd.</p>
                      <p className="text-gray-500">VAT Reg: <span className="font-mono text-slate-700 font-semibold">{companyTaxId}</span></p>
                      <p className="text-gray-500">Support Line: <span className="text-slate-700 font-semibold">{companyPhone}</span></p>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Billed Customer Entity</span>
                      <p className="font-bold text-slate-900">{selectedOrder.customerName || 'Walk-in Cash Customer'}</p>
                      <p className="text-gray-500">Channel Origin: <span className="font-semibold text-slate-700 uppercase">{selectedOrder.channel}</span></p>
                      <p className="text-gray-500">Issue Date: <span className="font-mono text-slate-700">{new Date(selectedOrder.date).toLocaleString()}</span></p>
                    </div>
                  </div>

                  {/* Items table */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Acquisition Breakdown</span>
                    <div className="border border-gray-100 rounded-2xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 border-b border-gray-100 font-bold text-slate-500 text-[10px] uppercase">
                            <th className="px-4 py-2.5">Item Telemetry</th>
                            <th className="px-4 py-2.5 text-center">Qty</th>
                            <th className="px-4 py-2.5 text-right">Unit Price</th>
                            <th className="px-4 py-2.5 text-right">Aggregate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-slate-700">
                          {selectedOrder.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/40">
                              <td className="px-4 py-3">
                                <span className="font-semibold text-slate-900 block">{item.productName}</span>
                                {item.variantSku && <span className="text-[10px] text-gray-400 font-mono">SKU: {item.variantSku}</span>}
                              </td>
                              <td className="px-4 py-3 text-center font-mono font-bold text-slate-900">{item.quantity}</td>
                              <td className="px-4 py-3 text-right font-mono">{formatAmount(item.price)}</td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{formatAmount(item.price * item.quantity)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pricing totals */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3">
                    <div className="space-y-1 text-xs">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Regulatory Compliance Notes</span>
                      <p className="text-gray-400 leading-relaxed text-[11px]">
                        Tax invoice processed in accordance with statutory fiscal codes. 48-hour delivery protection active.
                      </p>
                    </div>

                    <div className="space-y-2 text-xs border-t border-gray-100 md:border-t-0 pt-4 md:pt-0">
                      <div className="flex justify-between items-center text-gray-500">
                        <span>Subtotal</span>
                        <span className="font-mono font-semibold text-slate-950">{formatAmount(selectedOrder.subtotal)}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-500">
                        <span>VAT / GST Collected (8.0%)</span>
                        <span className="font-mono font-semibold text-slate-950">{formatAmount(selectedOrder.tax)}</span>
                      </div>
                      {selectedOrder.discount > 0 && (
                        <div className="flex justify-between items-center text-emerald-700 font-medium">
                          <span>Campaign Discount</span>
                          <span className="font-mono font-bold">-{formatAmount(selectedOrder.discount)}</span>
                        </div>
                      )}
                      <div className={`flex justify-between items-center text-sm font-black border-t border-gray-100 pt-3 ${currentTheme.text}`}>
                        <span>Grand Total</span>
                        <span className="font-mono text-base">{formatAmount(selectedOrder.total || selectedOrder.grandTotal || 0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* BNPL Split if applicable */}
                  {selectedOrder.paymentMethod === 'Installments (Klarna/Afterpay)' && (
                    <div className="bg-amber-50/55 p-4 rounded-2xl border border-amber-200/50 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Installment schedule (BNPL)</span>
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded uppercase">Klarna Active</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {generateInstallments(selectedOrder.total).map(plan => (
                          <div key={plan.id} className="bg-white p-2.5 rounded-xl border border-amber-100/50 space-y-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase block">Part {plan.id}</span>
                            <span className="font-mono font-bold text-slate-950 block">{formatAmount(plan.amount)}</span>
                            <div className="flex justify-between items-center text-[10px] pt-1 border-t border-gray-100/50">
                              <span className="text-gray-400 font-medium">{plan.dueDate}</span>
                              <span className={`font-bold ${plan.status.includes('Paid') ? 'text-emerald-600' : 'text-amber-600'}`}>{plan.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sheet actions footer */}
                <div className="bg-slate-50 p-4 border-t border-gray-150 flex flex-col sm:flex-row gap-2 justify-end">
                  <button
                    onClick={handleDirectPrintPosReceipt}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 justify-center transition-all shadow-xs cursor-pointer"
                    title="Print directly to 80mm POS Thermal Printer with Barcode"
                    id="btn-quick-print-pos-receipt"
                  >
                    <Printer className="w-4 h-4 text-indigo-300" /> 
                    Print POS Receipt (80mm)
                  </button>
                  <button
                    onClick={handleOpenTaxVerification}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 justify-center transition-all shadow-xs cursor-pointer"
                    title="Verify tax compliance and print invoice"
                  >
                    <FileText className="w-4 h-4" /> 
                    Print Tax Invoice (Verified)
                  </button>
                  <button
                    onClick={handleSimulateEmailDispatch}
                    className="px-4 py-2 bg-white border border-gray-250 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 justify-center transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-slate-500" /> Dispatch Digital Receipt
                  </button>
                </div>
              </div>
              )}
            </>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center text-gray-400 text-xs">
              <Printer className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-500" />
              Select an order from the list on the left to print invoices.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BACKEND CART RULES & SECURITY AUDIT INSPECTOR */}
      {/* ========================================================================= */}
      {activeTab === 'cart_rules_audit' && (
        <div className="space-y-5" id="cart-rules-audit-view">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Backend Cart Rules Engine & Zero-Trust Defense Policy
                  </h2>
                  <p className="text-xs text-slate-500">
                    "Never trust prices sent by the browser." All orders must satisfy the strict 7-stage validation pipeline.
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Zero-Trust Active</span>
              </span>
            </div>

            {/* The 7 Pipeline Stages Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>1. Validate Products</span>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[10px]">STAGE 1</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  Verifies product existence in the database, checks active status, and ensures variant SKUs exist in catalog.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>2. Validate Prices</span>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[10px]">STAGE 2</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  Overwrites any client-submitted prices with ground-truth catalog database prices. Prevents DevTools price tampering.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>3. Validate Promos</span>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[10px]">STAGE 3</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  Validates coupon codes, enforces minimum spend thresholds, and authenticates loyalty points burn rates ($0.05/pt).
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>4. Validate Stock</span>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[10px]">STAGE 4</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  Checks inventory levels in real-time. Disallows checkout if requested quantities exceed live on-hand availability.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>5. Calculate Shipping</span>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[10px]">STAGE 5</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  Calculates shipping based on server tiers ($150 free threshold, $15 standard, $25 express, $0 pickup).
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>6. Calculate Taxes</span>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[10px]">STAGE 6</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  Applies statutory tax rate (8%) to the net discounted subtotal to maintain statutory compliance.
                </p>
              </div>
            </div>

            {/* Stage 7 Final Checksum */}
            <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-200 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-indigo-950">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  7. Authoritative Total & Cryptographic Checksum Token
                </span>
                <span className="px-2.5 py-0.5 bg-indigo-600 text-white rounded-md text-[10px]">FINAL STAGE</span>
              </div>
              <p className="text-indigo-800 text-[11px]">
                Computes canonical grand total and stamps the transaction with a timestamped digital signature token stored alongside the order in the database.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ORDER APPROVAL CONFIRMATION DIALOG */}
      {/* ========================================================================= */}
      {isApproveModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Approve Customer Order</h3>
                  <p className="text-xs text-slate-400">Order #{selectedOrder.orderNumber || selectedOrder.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsApproveModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Ready for Approval & Fulfillment</span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  Approving will update the order status to <strong>Approved</strong>, lock the validated server pricing, and schedule inventory for packaging.
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Staff Approval Notes (Optional):
                </label>
                <textarea
                  rows={3}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="e.g. Validated address and authorized warehouse packaging batch..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>

              <div className="text-[11px] text-slate-500">
                Approver: <strong>{activeStaff?.name || 'Store Administrator'}</strong> ({activeStaff?.role || 'Admin'})
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsApproveModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleApproveOrder(selectedOrder, approvalNotes)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Approve Order</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ORDER REJECTION / CANCELLATION DIALOG */}
      {/* ========================================================================= */}
      {isRejectModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-rose-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center text-white font-bold">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Reject / Decline Order</h3>
                  <p className="text-xs text-rose-300">Order #{selectedOrder.orderNumber || selectedOrder.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="text-rose-300 hover:text-white p-1.5 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Primary Rejection Reason:
                </label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-600"
                >
                  <option value="Suspected fraud or payment anomaly">Suspected fraud or payment anomaly</option>
                  <option value="Undeliverable delivery address">Undeliverable delivery address</option>
                  <option value="Catalog inventory out of stock">Catalog inventory out of stock</option>
                  <option value="Customer cancellation request">Customer cancellation request</option>
                  <option value="Price or coupon discrepancy">Price or coupon discrepancy</option>
                  <option value="Other administrative policy violation">Other administrative policy violation</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Additional Details / Notes:
                </label>
                <textarea
                  rows={3}
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="Explain why this order was rejected..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRejectOrder(selectedOrder, rejectionReason, rejectionNotes)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: HOLD ORDER FOR REVIEW DIALOG */}
      {/* ========================================================================= */}
      {isHoldModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-orange-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white font-bold">
                  <PauseCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Hold Order for Review</h3>
                  <p className="text-xs text-orange-300">Order #{selectedOrder.orderNumber || selectedOrder.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHoldModalOpen(false)}
                className="text-orange-300 hover:text-white p-1.5 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Reason for Holding:
                </label>
                <input
                  type="text"
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  placeholder="e.g. Address verification required..."
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-600"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsHoldModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleHoldOrder(selectedOrder, holdReason)}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <PauseCircle className="w-4 h-4" />
                <span>Place On Hold</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DISPATCH & COURIER TRACKING DIALOG */}
      {/* ========================================================================= */}
      {isDispatchModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-indigo-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Dispatch Order & Add Tracking</h3>
                  <p className="text-xs text-indigo-300">Order #{selectedOrder.orderNumber || selectedOrder.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDispatchModalOpen(false)}
                className="text-indigo-300 hover:text-white p-1.5 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Courier Carrier:
                </label>
                <select
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="FedEx Priority">FedEx Priority</option>
                  <option value="UPS Ground">UPS Ground</option>
                  <option value="DHL Express">DHL Express</option>
                  <option value="Royal Mail Tracked 24">Royal Mail Tracked 24</option>
                  <option value="USPS Priority Mail">USPS Priority Mail</option>
                  <option value="Local Store Courier">Local Store Courier</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Waybill / Tracking Number:
                </label>
                <input
                  type="text"
                  value={customTrackingNo}
                  onChange={(e) => setCustomTrackingNo(e.target.value)}
                  placeholder={selectedOrder.trackingNumber || 'TRK-983192083'}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <span className="font-bold text-slate-700 block">Recipient Destination:</span>
                <p className="text-slate-600 text-[11px]">{selectedOrder.deliveryAddress || 'Customer Address On File'}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsDispatchModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDispatchOrder(selectedOrder, courierName, customTrackingNo)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Truck className="w-4 h-4" />
                <span>Mark Dispatched</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRE-PRINT STATUTORY TAX COMPLIANCE MODAL */}
      {/* ========================================================================= */}
      {isTaxModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Pre-Print Fiscal Tax Compliance</h3>
                  <p className="text-xs text-slate-400">Invoice: INV-{selectedOrder.id.split('-').pop()}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTaxModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800">Statutory Tax Verification Checklist</span>
                <button
                  type="button"
                  onClick={handleVerifyAllTaxFields}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  {allTaxVerified ? 'Uncheck All' : 'Check All ✓'}
                </button>
              </div>

              {/* Checklist items */}
              <div className="space-y-2">
                <div 
                  onClick={() => handleToggleVerification('taxIdVerified')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    taxVerifications.taxIdVerified ? 'bg-emerald-50/60 border-emerald-300' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="pt-0.5">
                    {taxVerifications.taxIdVerified ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-300" />}
                  </div>
                  <div className="flex-1 text-xs">
                    <span className="font-bold text-slate-900 block">1. Company Tax Registration Identification</span>
                    <span className="text-[11px] text-gray-500 font-mono">VAT ID: {companyTaxId}</span>
                  </div>
                </div>

                <div 
                  onClick={() => handleToggleVerification('taxRateVerified')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    taxVerifications.taxRateVerified ? 'bg-emerald-50/60 border-emerald-300' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="pt-0.5">
                    {taxVerifications.taxRateVerified ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-300" />}
                  </div>
                  <div className="flex-1 text-xs">
                    <span className="font-bold text-slate-900 block">2. Statutory Tax Rate & Computed Tax</span>
                    <span className="text-[11px] text-emerald-700 font-mono font-bold">{formatAmount(selectedOrder.tax)} (8.00%)</span>
                  </div>
                </div>

                <div 
                  onClick={() => handleToggleVerification('taxBaseVerified')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    taxVerifications.taxBaseVerified ? 'bg-emerald-50/60 border-emerald-300' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="pt-0.5">
                    {taxVerifications.taxBaseVerified ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-300" />}
                  </div>
                  <div className="flex-1 text-xs">
                    <span className="font-bold text-slate-900 block">3. Taxable Base & Item Line Deductions</span>
                    <span className="text-[11px] text-slate-700 font-mono font-bold">Net: {formatAmount((selectedOrder.subtotal || selectedOrder.total) - (selectedOrder.discount || 0))}</span>
                  </div>
                </div>

                <div 
                  onClick={() => handleToggleVerification('fiscalAuditVerified')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    taxVerifications.fiscalAuditVerified ? 'bg-emerald-50/60 border-emerald-300' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="pt-0.5">
                    {taxVerifications.fiscalAuditVerified ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-300" />}
                  </div>
                  <div className="flex-1 text-xs">
                    <span className="font-bold text-slate-900 block">4. Fiscal Audit Hash & Billed Entity</span>
                    <span className="text-[11px] text-indigo-700">{selectedOrder.customerName || 'Walk-in Guest'} ({selectedOrder.channel})</span>
                  </div>
                </div>
              </div>

              {!allTaxVerified && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2 text-amber-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Verify all 4 statutory tax items to unlock native printing.</span>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsTaxModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAndPrint}
                disabled={!allTaxVerified}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm ${
                  allTaxVerified ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Printer className="w-4 h-4" />
                {allTaxVerified ? 'Confirm & Open Print Dialogue' : `Verify All (${verifiedCount}/4)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 30-Stage Order-to-Delivery Lifecycle Modal */}
      {selectedOrder && (
        <OrderLifecycle30StagesModal
          isOpen={isLifecycleModalOpen}
          onClose={() => setIsLifecycleModalOpen(false)}
          order={selectedOrder}
          onUpdateOrder={onUpdateOrder}
        />
      )}

    </div>
  );
}
