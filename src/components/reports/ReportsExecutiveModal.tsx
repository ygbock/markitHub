import React from 'react';
import { 
  X, Printer, Download, Building2, 
  Calendar, CheckCircle2, DollarSign, TrendingUp, 
  Package, AlertTriangle, ShieldCheck 
} from 'lucide-react';
import { Order, Product, StaffMember, BranchLocation, ReportDatePreset } from '../../types';
import { useCurrency } from '../../context/CurrencyContext';
import { calculateFinancialSummary, calculateStockValuation } from '../../utils/reportsCalculations';

interface ReportsExecutiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  products: Product[];
  activeStaff: StaffMember;
  datePreset: ReportDatePreset;
  selectedBranchId: string;
  branches: BranchLocation[];
}

export default function ReportsExecutiveModal({
  isOpen,
  onClose,
  orders,
  products,
  activeStaff,
  datePreset,
  selectedBranchId,
  branches
}: ReportsExecutiveModalProps) {
  const { formatAmount, currentCurrency } = useCurrency();

  if (!isOpen) return null;

  const financial = calculateFinancialSummary(orders);
  const inventory = calculateStockValuation(products);

  const selectedBranch = branches.find(b => b.id === selectedBranchId);
  const branchLabel = selectedBranch ? `${selectedBranch.name} (${selectedBranch.city})` : 'All Enterprise Locations & Hubs';

  const fastMoving = [...products].sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0)).slice(0, 5);
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= (p.reorderPoint || 10)).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 lg:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto print:m-0 print:p-0 print:shadow-none print:max-w-none print:max-h-none print:border-0">
        
        {/* Action Header (Hidden during actual print) */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 bg-slate-50/90 backdrop-blur-md shrink-0 print:hidden">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-slate-900 truncate">Executive Board Briefing Sheet</h2>
              <p className="text-[10px] sm:text-xs text-slate-500 truncate">Consolidated fiscal & inventory performance report</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 shadow-xs cursor-pointer"
              title="Print or Export PDF"
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Print / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 active:scale-95 transition-all cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body - Scrollable on screen, full on print */}
        <div className="overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 text-xs text-slate-800 print:overflow-visible print:p-4">
          
          {/* Header & Meta */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-mono font-black text-[10px] uppercase tracking-wider">
                  Confidential
                </span>
                <span className="text-[10px] font-mono text-slate-400 font-bold">Document Ref: EB-{new Date().getFullYear()}-{orders.length}</span>
              </div>
              <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight mt-1.5">
                NEXUS COMMERCE CORE — EXECUTIVE BOARD REPORT
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Location Scope: {branchLabel}</p>
            </div>
            <div className="text-left md:text-right text-[11px] text-slate-600 space-y-0.5 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200 font-mono">
              <div><span className="font-sans font-bold text-slate-800">Period:</span> {String(datePreset || '').toUpperCase().replace(/_/g, ' ')}</div>
              <div><span className="font-sans font-bold text-slate-800">Prepared By:</span> {activeStaff.name} ({activeStaff.role})</div>
              <div><span className="font-sans font-bold text-slate-800">Generated:</span> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>

          {/* Core Financial Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross Sales</span>
              <div className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-1">{formatAmount(financial.grossRevenue)}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{financial.completedOrdersCount} completed orders</div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Net Realized Revenue</span>
              <div className="text-lg sm:text-xl font-black text-blue-700 font-mono mt-1">{formatAmount(financial.netRevenue)}</div>
              <div className="text-[10px] text-blue-600/80 mt-0.5">Post promotional discounts</div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross Profit (Pre-Tax)</span>
              <div className="text-lg sm:text-xl font-black text-emerald-600 font-mono mt-1">{formatAmount(financial.grossProfit)}</div>
              <div className="text-[10px] text-emerald-600/80 mt-0.5">Net revenue minus COGS</div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross Profit Margin</span>
              <div className="text-lg sm:text-xl font-black text-indigo-600 font-mono mt-1">{financial.grossMarginPercent.toFixed(1)}%</div>
              <div className="text-[10px] text-indigo-600/80 mt-0.5">Operating yield efficiency</div>
            </div>
          </div>

          {/* Income Statement Breakdown */}
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3 bg-white shadow-2xs">
            <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">Statement of Financial Operations</h3>
            
            <div className="space-y-1.5 divide-y divide-slate-100 font-mono text-[11px] sm:text-xs">
              <div className="flex justify-between py-1.5">
                <span className="font-sans font-semibold text-slate-700">Gross Revenue (List Price)</span>
                <span className="font-bold">{formatAmount(financial.grossRevenue)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-amber-700">
                <span className="font-sans font-medium pl-2">(-) Promotional Discounts & Coupons</span>
                <span>-{formatAmount(financial.discountsTotal)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-slate-900 font-bold bg-slate-50 px-2 rounded-lg">
                <span className="font-sans">(=) Net Operational Revenue</span>
                <span>{formatAmount(financial.netRevenue)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-rose-700">
                <span className="font-sans font-medium pl-2">(-) Cost of Goods Sold (COGS Basis)</span>
                <span>-{formatAmount(financial.cogsTotal)}</span>
              </div>
              <div className="flex justify-between py-2 text-emerald-700 font-black text-xs sm:text-sm bg-emerald-50 px-2 rounded-lg">
                <span className="font-sans">(=) Net Gross Profit</span>
                <span>{formatAmount(financial.grossProfit)} ({financial.grossMarginPercent.toFixed(1)}%)</span>
              </div>
              <div className="flex justify-between py-1.5 text-slate-600 pt-2">
                <span className="font-sans">Government Sales Tax Collected (Liability)</span>
                <span className="font-bold">{formatAmount(financial.taxTotal)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-slate-600">
                <span className="font-sans">Outstanding Accounts Receivable (Open Invoices)</span>
                <span className="font-bold text-amber-700">{formatAmount(financial.outstandingTotal)} ({financial.outstandingCount} accounts)</span>
              </div>
            </div>
          </div>

          {/* Inventory Health & Stock Valuation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Inventory Valuation */}
            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3 bg-white shadow-2xs">
              <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">Inventory Capital Valuation</h3>
              <div className="space-y-2 text-[11px] sm:text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Active SKUs:</span>
                  <span className="font-bold font-mono text-slate-800">{inventory.totalSkus} Lines</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">In-Stock Units:</span>
                  <span className="font-bold font-mono text-slate-800">{inventory.totalUnitsInStock} Units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Procurement Cost Value:</span>
                  <span className="font-bold font-mono text-slate-900">{formatAmount(inventory.totalCostValuation)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Retail Selling Value:</span>
                  <span className="font-bold font-mono text-indigo-600">{formatAmount(inventory.totalRetailValuation)}</span>
                </div>
              </div>
            </div>

            {/* Risk & Replenishment Alerts */}
            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3 bg-white shadow-2xs">
              <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">Inventory Risk & Operations</h3>
              <div className="space-y-2 text-[11px] sm:text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Low Stock SKUs (At Reorder):</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">{lowStockCount} SKUs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Stockout Lines (0 Units):</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">{outOfStockCount} Stockouts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Total Transactions Closed:</span>
                  <span className="font-bold font-mono text-slate-800">{financial.completedOrdersCount} tickets</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Average Order Value (AOV):</span>
                  <span className="font-bold font-mono text-indigo-600">{formatAmount(financial.averageOrderValue)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Top 5 Products Leaderboard */}
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3 bg-white shadow-2xs">
            <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">Top Velocity Product Performers</h3>
            <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
              <table className="w-full text-left text-[11px] min-w-[500px]">
                <thead className="text-slate-400 uppercase font-bold border-b border-slate-100">
                  <tr>
                    <th className="pb-2">SKU / Product</th>
                    <th className="pb-2 text-center">Units Sold</th>
                    <th className="pb-2 text-right">Unit Price</th>
                    <th className="pb-2 text-right">Gross Sales</th>
                    <th className="pb-2 text-center">Current Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {fastMoving.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2 font-sans font-bold text-slate-900">{p.name} <span className="text-[10px] text-slate-400 font-normal">({p.sku})</span></td>
                      <td className="py-2 text-center font-bold text-indigo-600">{p.salesCount || 0}</td>
                      <td className="py-2 text-right">{formatAmount(p.price)}</td>
                      <td className="py-2 text-right font-black">{formatAmount((p.salesCount || 0) * p.price)}</td>
                      <td className="py-2 text-center text-slate-600">{p.stock} units</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signoff Footer */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-[10px] text-slate-400">
            <div>Confidential • For Executive & Board Review Only</div>
            <div className="font-mono">Authorized Signoff: <span className="underline decoration-dotted underline-offset-4">_______________________</span></div>
          </div>

        </div>

      </div>
    </div>
  );
}
