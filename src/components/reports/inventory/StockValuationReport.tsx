import React, { useState } from 'react';
import { 
  DollarSign, Package, TrendingUp, Layers, 
  PieChart as PieIcon, ArrowUpRight, Search, Filter,
  Building2, ArrowUpDown
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, 
  Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { Product } from '../../../types';
import { useCurrency } from '../../../context/CurrencyContext';
import { calculateStockValuation } from '../../../utils/reportsCalculations';

interface StockValuationReportProps {
  products: Product[];
  selectedLocation: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#64748b'];

export default function StockValuationReport({ products, selectedLocation }: StockValuationReportProps) {
  const { formatAmount } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'retailVal' | 'costVal' | 'stock' | 'margin'>('retailVal');
  const [sortAsc, setSortAsc] = useState(false);

  // Filter products by location if not 'all'
  const filteredProducts = products.filter(p => {
    if (selectedLocation !== 'all' && p.location !== selectedLocation) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term) || p.category.toLowerCase().includes(term);
    }
    return true;
  });

  const metrics = calculateStockValuation(filteredProducts);

  // Sort detailed table
  const tableData = [...filteredProducts].map(p => {
    const cost = p.cost || 0;
    const price = p.price || 0;
    const stock = p.stock || 0;
    const costVal = cost * stock;
    const retailVal = price * stock;
    const margin = retailVal > 0 ? ((retailVal - costVal) / retailVal) * 100 : 0;
    return {
      ...p,
      costVal,
      retailVal,
      margin
    };
  }).sort((a, b) => {
    let diff = 0;
    if (sortField === 'retailVal') diff = b.retailVal - a.retailVal;
    if (sortField === 'costVal') diff = b.costVal - a.costVal;
    if (sortField === 'stock') diff = b.stock - a.stock;
    if (sortField === 'margin') diff = b.margin - a.margin;
    return sortAsc ? -diff : diff;
  });

  // Category donut chart data
  const pieChartData = metrics.byCategory.map(c => ({
    name: c.category,
    value: Math.round(c.retailValue)
  }));

  return (
    <div className="space-y-6" id="stock-valuation-report">
      
      {/* 1. Top KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        {/* Total Retail Valuation */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-2xs space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Retail Value</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-black text-slate-900 font-mono truncate">
            {formatAmount(metrics.totalRetailValuation)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">{metrics.totalUnitsInStock} in-stock units</p>
        </div>

        {/* Total Cost Basis (Tied-up Capital) */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-2xs space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Cost Basis</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-black text-slate-800 font-mono truncate">
            {formatAmount(metrics.totalCostValuation)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Capital invested</p>
        </div>

        {/* Unrealized Gross Margin */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-2xs space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Potential Profit</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-black text-emerald-600 font-mono truncate">
            {formatAmount(metrics.unrealizedProfit)}
          </div>
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-emerald-700 truncate">
            <span>{metrics.unrealizedMarginPercent.toFixed(1)}% margin</span>
          </div>
        </div>

        {/* Active SKUs & Coverage */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-2xs space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Active SKUs</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-black text-slate-900 font-mono truncate">
            {metrics.totalSkus} <span className="text-xs sm:text-sm font-normal text-slate-500">Lines</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">{metrics.byLocation.length} locations</p>
        </div>

      </div>

      {/* 2. Visual Charts: Category Valuation Breakdown + Location Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Category Share Donut */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">Valuation by Category</h3>
              <p className="text-xs text-slate-400">Retail capital allocation breakdown</p>
            </div>
            <PieIcon className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: number) => [formatAmount(val), 'Retail Valuation']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Category Legend List */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
            {metrics.byCategory.map((cat, i) => (
              <div key={cat.category} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="font-bold text-slate-700 truncate">{cat.category}</span>
                </div>
                <span className="font-mono font-bold text-slate-900 shrink-0">{formatAmount(cat.retailValue)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Location Valuation Bar Chart */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">Valuation by Storage Location</h3>
              <p className="text-xs text-slate-400">Warehouse vs Storefront distribution</p>
            </div>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.byLocation} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="location" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  formatter={(val: number) => [formatAmount(val), 'Value']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="retailValue" name="Retail Value" fill="#6366f1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="costValue" name="Cost Basis" fill="#94a3b8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-indigo-900">Highest Capital Concentration:</span>
            <span className="font-black text-indigo-700 font-mono">
              {metrics.byLocation[0]?.location || 'N/A'} ({formatAmount(metrics.byLocation[0]?.retailValue || 0)})
            </span>
          </div>
        </div>

      </div>

      {/* 3. Detailed Stock Valuation Matrix Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Table Search & Sorter Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">Inventory Valuation Matrix</h3>
            <p className="text-xs text-slate-400">SKU-level cost, retail, and gross profit breakdown</p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search SKU, name, category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 w-full sm:w-56 transition-all"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl text-xs font-bold text-slate-700 shrink-0">
              <span className="text-slate-400 text-[10px] uppercase font-bold mr-1 hidden xs:inline">Sort:</span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as 'retailVal' | 'costVal' | 'stock' | 'margin')}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="retailVal">Retail Value</option>
                <option value="costVal">Cost Basis</option>
                <option value="stock">Stock Level</option>
                <option value="margin">Margin %</option>
              </select>
              <button
                type="button"
                onClick={() => setSortAsc(!sortAsc)}
                className="p-1 hover:bg-slate-200/60 rounded-lg text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                title={sortAsc ? "Sort Ascending" : "Sort Descending"}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-right">In Stock</th>
                <th className="py-3 px-4 text-right">Unit Cost</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-right">Cost Value</th>
                <th className="py-3 px-4 text-right">Retail Value</th>
                <th className="py-3 px-4 text-right">Profit Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {tableData.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{item.name}</div>
                    <div className="font-mono text-[10px] text-slate-400">{item.sku}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px] font-medium">{item.location}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold">
                    <span className={item.stock <= 10 ? 'text-amber-600 font-black' : 'text-slate-900'}>
                      {item.stock}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600">{formatAmount(item.cost || 0)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatAmount(item.price || 0)}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600">{formatAmount(item.costVal)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-indigo-600">{formatAmount(item.retailVal)}</td>
                  <td className="py-3 px-4 text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {item.margin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile & Tablet Grid View */}
        <div className="block lg:hidden p-2.5 sm:p-4 grid grid-cols-2 gap-2 sm:gap-3 bg-slate-50/50">
          {tableData.map(item => (
            <div key={item.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-xs text-slate-900 line-clamp-1">{item.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-[10px] text-slate-400">{item.sku}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[10px] text-slate-500">{item.category}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  {item.margin.toFixed(1)}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">In Stock:</span>
                  <span className={`font-mono font-bold ${item.stock <= 10 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {item.stock} units
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Location:</span>
                  <span className="font-medium text-slate-700 truncate block">{item.location}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Cost Basis:</span>
                  <span className="font-mono text-slate-600">{formatAmount(item.costVal)}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Retail Value:</span>
                  <span className="font-black font-mono text-indigo-600">{formatAmount(item.retailVal)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}
