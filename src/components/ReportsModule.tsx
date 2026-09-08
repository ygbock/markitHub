import React, { useState, useMemo } from 'react';
import { 
  Product, Order, StaffMember, BranchLocation, 
  ReportCategory, InventoryReportSubTab, SalesReportSubTab, FinancialReportSubTab,
  ReportDatePreset, StockMovementRecord, StockAdjustmentRecord, InventoryBatch
} from '../types';
import ReportsHeader from './reports/ReportsHeader';
import ReportsNav from './reports/ReportsNav';
import ReportsExecutiveModal from './reports/ReportsExecutiveModal';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

// Inventory Sub-Reports
import StockValuationReport from './reports/inventory/StockValuationReport';
import LowStockReport from './reports/inventory/LowStockReport';
import OutOfStockReport from './reports/inventory/OutOfStockReport';
import DeadStockReport from './reports/inventory/DeadStockReport';
import FastMovingReport from './reports/inventory/FastMovingReport';
import SlowMovingReport from './reports/inventory/SlowMovingReport';
import StockMovementReport from './reports/inventory/StockMovementReport';
import StockAdjustmentsReport from './reports/inventory/StockAdjustmentsReport';
import ExpiringProductsReport from './reports/inventory/ExpiringProductsReport';

// Sales Sub-Reports
import DailySalesReport from './reports/sales/DailySalesReport';
import WeeklySalesReport from './reports/sales/WeeklySalesReport';
import MonthlySalesReport from './reports/sales/MonthlySalesReport';
import ProductSalesReport from './reports/sales/ProductSalesReport';
import CategorySalesReport from './reports/sales/CategorySalesReport';
import CashierSalesReport from './reports/sales/CashierSalesReport';
import BranchSalesReport from './reports/sales/BranchSalesReport';
import PaymentMethodSalesReport from './reports/sales/PaymentMethodSalesReport';
import ChannelSalesReport from './reports/sales/ChannelSalesReport';

// Financial Sub-Reports
import ExecutiveFinancialSummary from './reports/financial/ExecutiveFinancialSummary';
import RevenueReport from './reports/financial/RevenueReport';
import GrossProfitReport from './reports/financial/GrossProfitReport';
import COGSReport from './reports/financial/COGSReport';
import DiscountsReport from './reports/financial/DiscountsReport';
import RefundsReport from './reports/financial/RefundsReport';
import TaxReport from './reports/financial/TaxReport';
import OutstandingPaymentsReport from './reports/financial/OutstandingPaymentsReport';

import { 
  INITIAL_BRANCHES,
  INITIAL_BATCHES,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_STOCK_ADJUSTMENTS
} from '../data/reportsData';
import { filterOrdersByDate, exportToCSV } from '../utils/reportsCalculations';

interface ReportsModuleProps {
  products: Product[];
  orders: Order[];
  activeStaff: StaffMember;
  onUpdateOrderStatus?: (orderId: string, status: Order['status']) => void;
  onReorderProduct?: (productId: string, amount?: number) => void;
}

export default function ReportsModule({
  products,
  orders,
  activeStaff,
  onUpdateOrderStatus,
  onReorderProduct
}: ReportsModuleProps) {
  // Category & SubTab state
  const [activeCategory, setActiveCategory] = useState<ReportCategory>('sales');
  const [inventorySubTab, setInventorySubTab] = useState<InventoryReportSubTab>('valuation');
  const [salesSubTab, setSalesSubTab] = useState<SalesReportSubTab>('daily');
  const [financialSubTab, setFinancialSubTab] = useState<FinancialReportSubTab>('executive_summary');

  // Filters state
  const [datePreset, setDatePreset] = useState<ReportDatePreset>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [isExecutiveModalOpen, setIsExecutiveModalOpen] = useState(false);

  // In-app interactive Toast Feedback (Replaces native alerts in iframe)
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(prev => prev?.text === text ? null : prev);
    }, 4000);
  };

  // Dynamic state for stock adjustments and movements
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustmentRecord[]>(INITIAL_STOCK_ADJUSTMENTS);
  const [stockMovements, setStockMovements] = useState<StockMovementRecord[]>(INITIAL_STOCK_MOVEMENTS);
  const [batches] = useState<InventoryBatch[]>(INITIAL_BATCHES);
  const branches: BranchLocation[] = INITIAL_BRANCHES;

  // Filter orders by date preset and selected branch
  const filteredOrders = useMemo(() => {
    let result = filterOrdersByDate(orders, datePreset, customStartDate, customEndDate);
    if (selectedBranchId !== 'all') {
      result = result.filter(o => o.branchId === selectedBranchId || (o.branchName && o.branchName.toLowerCase().includes(selectedBranchId.toLowerCase())));
    }
    return result;
  }, [orders, datePreset, customStartDate, customEndDate, selectedBranchId]);

  // Compute counts for badging
  const counts = useMemo(() => {
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= (p.reorderPoint || 10)).length;
    const outOfStock = products.filter(p => p.stock === 0).length;
    const deadStock = products.filter(p => p.stock > 0 && (!p.salesCount || p.salesCount === 0)).length;
    
    const now = new Date('2026-08-17T12:00:00-07:00');
    const expiring = batches.filter(b => {
      const exp = new Date(b.expiryDate).getTime();
      const diff = exp - now.getTime();
      return diff <= 45 * 24 * 60 * 60 * 1000;
    }).length;

    const outstanding = orders.filter(o => o.status === 'Outstanding' || (o.outstandingBalance && o.outstandingBalance > 0)).length;
    const refunds = orders.filter(o => o.status === 'Refunded').length;

    return { lowStock, outOfStock, deadStock, expiring, outstanding, refunds };
  }, [products, batches, orders]);

  // Handle adding new stock adjustment
  const handleAddAdjustment = (newAdj: StockAdjustmentRecord) => {
    setStockAdjustments(prev => [newAdj, ...prev]);
    // Also create corresponding stock movement record
    const movement: StockMovementRecord = {
      id: `mov-adj-${Date.now()}`,
      date: new Date().toISOString(),
      productId: newAdj.productId,
      productName: newAdj.productName,
      sku: newAdj.sku,
      type: 'Audit Adjustment',
      quantityChange: newAdj.varianceQuantity,
      quantityBefore: newAdj.systemQuantity,
      quantityAfter: newAdj.physicalQuantity,
      unitCost: newAdj.unitCost,
      totalCostImpact: newAdj.varianceCost,
      location: newAdj.location,
      performedBy: newAdj.adjustedBy,
      notes: newAdj.notes
    };
    setStockMovements(prev => [movement, ...prev]);
    showToast(`Stock reconciliation audit recorded for ${newAdj.productName} (${newAdj.varianceQuantity > 0 ? `+${newAdj.varianceQuantity}` : newAdj.varianceQuantity} units)`);
  };

  // Reorder product handler with toast
  const handleReorder = (productId: string, amount?: number) => {
    if (onReorderProduct) {
      onReorderProduct(productId, amount);
    }
    const prod = products.find(p => p.id === productId);
    showToast(`Purchase order requisition created for ${prod?.name || 'product'} (${amount || 20} units)`);
  };

  // Settle invoice handler with toast
  const handleUpdateOrderStatus = (orderId: string, status: Order['status']) => {
    if (onUpdateOrderStatus) {
      onUpdateOrderStatus(orderId, status);
    }
    showToast(`Invoice #${orderId} payment received and marked as ${status}`);
  };

  // CSV Export
  const handleExportCSV = () => {
    const currentSubTab = activeCategory === 'inventory' 
      ? inventorySubTab 
      : activeCategory === 'sales' 
        ? salesSubTab 
        : financialSubTab;
    
    const filename = `nexus_${activeCategory}_${currentSubTab}_${datePreset}`;

    if (activeCategory === 'inventory') {
      const rows = products.map(p => ({
        'Product ID': p.id,
        'Name': p.name,
        'SKU': p.sku,
        'Category': p.category,
        'Location': p.location || 'Store',
        'Stock Units': p.stock,
        'Reorder Point': p.reorderPoint || 10,
        'Unit Cost': p.cost || (p.price * 0.5),
        'Unit Price': p.price,
        'Total Valuation': (p.cost || p.price * 0.5) * p.stock,
        'Sales Velocity': p.salesCount || 0
      }));
      exportToCSV(filename, rows);
    } else if (activeCategory === 'sales') {
      const rows = filteredOrders.map(o => ({
        'Order ID': o.id,
        'Date': new Date(o.date).toLocaleDateString(),
        'Time': new Date(o.date).toLocaleTimeString(),
        'Customer': o.customerName || 'Walk-in Guest',
        'Channel': o.source || o.channel || 'POS Terminal',
        'Cashier': o.cashierName || 'Staff',
        'Branch': o.branchName || 'Downtown Flagship',
        'Payment Method': o.paymentMethod,
        'Subtotal': o.subtotal || 0,
        'Tax': o.tax || 0,
        'Discount': o.discount || 0,
        'Total': o.total || 0,
        'Status': o.status
      }));
      exportToCSV(filename, rows);
    } else {
      const rows = filteredOrders.map(o => ({
        'Ticket ID': o.id,
        'Date': new Date(o.date).toLocaleDateString(),
        'Gross Revenue': o.subtotal || 0,
        'Discount': o.discount || 0,
        'Net Revenue': (o.subtotal || 0) - (o.discount || 0),
        'COGS': o.cogs || ((o.subtotal || 0) * 0.42),
        'Gross Profit': ((o.subtotal || 0) - (o.discount || 0)) - (o.cogs || ((o.subtotal || 0) * 0.42)),
        'Tax Collected': o.tax || 0,
        'Status': o.status
      }));
      exportToCSV(filename, rows);
    }
    showToast(`CSV data export generated: ${filename}.csv`);
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6" id="reports-module-root">
      
      {/* Interactive Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-md w-auto bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-xs font-semibold flex-1 leading-snug">{toastMessage.text}</p>
          <button 
            type="button" 
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Header with Controls & Date Filter */}
      <ReportsHeader
        activeCategory={activeCategory}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        customStartDate={customStartDate}
        onCustomStartDateChange={setCustomStartDate}
        customEndDate={customEndDate}
        onCustomEndDateChange={setCustomEndDate}
        selectedBranchId={selectedBranchId}
        onSelectBranchId={setSelectedBranchId}
        branches={branches}
        onExportCSV={handleExportCSV}
        onOpenExecutiveModal={() => setIsExecutiveModalOpen(true)}
        activeStaff={activeStaff}
      />

      {/* 2. Navigation Tabs & Sub-Tabs */}
      <ReportsNav
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        inventorySubTab={inventorySubTab}
        onSelectInventorySubTab={setInventorySubTab}
        salesSubTab={salesSubTab}
        onSelectSalesSubTab={setSalesSubTab}
        financialSubTab={financialSubTab}
        onSelectFinancialSubTab={setFinancialSubTab}
        counts={counts}
      />

      {/* 3. Active Report View Content */}
      <div className="transition-all duration-300">
        
        {/* INVENTORY REPORTS (9 Modules) */}
        {activeCategory === 'inventory' && (
          <div className="space-y-6">
            {inventorySubTab === 'valuation' && (
              <StockValuationReport products={products} selectedLocation={selectedBranchId} />
            )}
            {inventorySubTab === 'low_stock' && (
              <LowStockReport products={products} lowStockThreshold={10} onReorder={handleReorder} />
            )}
            {inventorySubTab === 'out_of_stock' && (
              <OutOfStockReport products={products} onReorder={handleReorder} />
            )}
            {inventorySubTab === 'dead_stock' && (
              <DeadStockReport products={products} />
            )}
            {inventorySubTab === 'fast_moving' && (
              <FastMovingReport products={products} />
            )}
            {inventorySubTab === 'slow_moving' && (
              <SlowMovingReport products={products} />
            )}
            {inventorySubTab === 'stock_movement' && (
              <StockMovementReport movements={stockMovements} selectedLocation={selectedBranchId} />
            )}
            {inventorySubTab === 'stock_adjustments' && (
              <StockAdjustmentsReport 
                adjustments={stockAdjustments} 
                products={products} 
                activeStaff={activeStaff}
                onAddAdjustment={handleAddAdjustment}
              />
            )}
            {inventorySubTab === 'expiring_products' && (
              <ExpiringProductsReport batches={batches} />
            )}
          </div>
        )}

        {/* SALES REPORTS (9 Modules) */}
        {activeCategory === 'sales' && (
          <div className="space-y-6">
            {salesSubTab === 'daily' && (
              <DailySalesReport orders={filteredOrders} />
            )}
            {salesSubTab === 'weekly' && (
              <WeeklySalesReport orders={filteredOrders} />
            )}
            {salesSubTab === 'monthly' && (
              <MonthlySalesReport orders={orders} />
            )}
            {salesSubTab === 'by_product' && (
              <ProductSalesReport products={products} orders={filteredOrders} />
            )}
            {salesSubTab === 'by_category' && (
              <CategorySalesReport orders={filteredOrders} products={products} />
            )}
            {salesSubTab === 'by_cashier' && (
              <CashierSalesReport orders={filteredOrders} />
            )}
            {salesSubTab === 'by_branch' && (
              <BranchSalesReport orders={filteredOrders} branches={branches} />
            )}
            {salesSubTab === 'by_payment_method' && (
              <PaymentMethodSalesReport orders={filteredOrders} />
            )}
            {salesSubTab === 'online_vs_pos' && (
              <ChannelSalesReport orders={filteredOrders} />
            )}
          </div>
        )}

        {/* FINANCIAL REPORTS (8 Modules) */}
        {activeCategory === 'financial' && (
          <div className="space-y-6">
            {financialSubTab === 'executive_summary' && (
              <ExecutiveFinancialSummary orders={filteredOrders} />
            )}
            {financialSubTab === 'revenue' && (
              <RevenueReport orders={filteredOrders} />
            )}
            {financialSubTab === 'gross_profit' && (
              <GrossProfitReport orders={filteredOrders} products={products} />
            )}
            {financialSubTab === 'cogs' && (
              <COGSReport orders={filteredOrders} products={products} />
            )}
            {financialSubTab === 'discounts' && (
              <DiscountsReport orders={filteredOrders} />
            )}
            {financialSubTab === 'refunds' && (
              <RefundsReport orders={filteredOrders} />
            )}
            {financialSubTab === 'tax' && (
              <TaxReport orders={filteredOrders} branches={branches} />
            )}
            {financialSubTab === 'outstanding_payments' && (
              <OutstandingPaymentsReport 
                orders={filteredOrders} 
                onUpdateOrderStatus={handleUpdateOrderStatus} 
              />
            )}
          </div>
        )}

      </div>

      {/* 4. Executive Printable Briefing Modal */}
      <ReportsExecutiveModal
        isOpen={isExecutiveModalOpen}
        onClose={() => setIsExecutiveModalOpen(false)}
        orders={filteredOrders}
        products={products}
        activeStaff={activeStaff}
        datePreset={datePreset}
        selectedBranchId={selectedBranchId}
        branches={branches}
      />

    </div>
  );
}
