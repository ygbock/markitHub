import React, { useState } from 'react';
import { 
  Tag, Search, DollarSign, TrendingUp, 
  ShoppingBag, Percent, ArrowUpDown, Layers 
} from 'lucide-react';
import { Order, Product } from '../../../types';
import { useCurrency } from '../../../context/CurrencyContext';

interface ProductSalesReportProps {
  orders: Order[];
  products: Product[];
}

export default function ProductSalesReport({ orders, products }: ProductSalesReportProps) {
  const { formatAmount } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'revenue' | 'units' | 'profit' | 'margin'>('revenue');
  const [sortAsc, setSortAsc] = useState(false);

  // Aggregate sales by product
  const productStatsMap: Record<string, {
    productId: string;
    name: string;
    sku: string;
    category: string;
    unitsSold: number;
    grossSales: number;
    discountGiven: number;
    netSales: number;
    cogs: number;
    grossProfit: number;
    marginPercent: number;
    returnUnits: number;
  }> = {};

  // Initialize from products catalog
  products.forEach(p => {
    productStatsMap[p.id] = {
      productId: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      unitsSold: p.salesCount || 0,
      grossSales: (p.salesCount || 0) * p.price,
      discountGiven: (p.salesCount || 0) * (p.price * 0.04),
      netSales: (p.salesCount || 0) * p.price * 0.96,
      cogs: (p.salesCount || 0) * (p.cost || p.price * 0.45),
      grossProfit: 0,
      marginPercent: 0,
      returnUnits: Math.floor((p.salesCount || 0) * 0.02)
    };
    const profit = productStatsMap[p.id].netSales - productStatsMap[p.id].cogs;
    productStatsMap[p.id].grossProfit = profit;
    productStatsMap[p.id].marginPercent = productStatsMap[p.id].netSales > 0 ? (profit / productStatsMap[p.id].netSales) * 100 : 0;
  });

  // Blend in real order line items
  orders.forEach(o => {
    if (o.items && o.items.length) {
      o.items.forEach(item => {
        const prod = productStatsMap[item.productId];
        if (prod) {
          // If order is completed, increment
          if (o.status === 'Completed') {
            prod.unitsSold += item.quantity;
            const lineRev = item.price * item.quantity;
            prod.grossSales += lineRev;
            const lineCogs = (item.cost || item.price * 0.45) * item.quantity;
            prod.cogs += lineCogs;
            prod.netSales += lineRev;
            prod.grossProfit = prod.netSales - prod.cogs;
            prod.marginPercent = prod.netSales > 0 ? (prod.grossProfit / prod.netSales) * 100 : 0;
          } else if (o.status === 'Refunded') {
            prod.returnUnits += item.quantity;
          }
        }
      });
    }
  });

  const productRows = Object.values(productStatsMap).filter(p => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term) || p.category.toLowerCase().includes(term);
    }
    return true;
  }).sort((a, b) => {
    let diff = 0;
    if (sortField === 'revenue') diff = b.netSales - a.netSales;
    if (sortField === 'units') diff = b.unitsSold - a.unitsSold;
    if (sortField === 'profit') diff = b.grossProfit - a.grossProfit;
    if (sortField === 'margin') diff = b.marginPercent - a.marginPercent;
    return sortAsc ? -diff : diff;
  });

  const totalVolume = productRows.reduce((sum, p) => sum + p.unitsSold, 0);
  const totalNetRev = productRows.reduce((sum, p) => sum + p.netSales, 0);
  const totalProfit = productRows.reduce((sum, p) => sum + p.grossProfit, 0);

  return (
    <div className="space-y-6" id="product-sales-report">
      
      {/* 1. Header Highlight Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Product Sales</span>
            <DollarSign className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {formatAmount(totalNetRev)}
          </div>
          <p className="text-[11px] text-slate-400">Net revenue across all product lines</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Units Dispatched</span>
            <ShoppingBag className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {totalVolume} <span className="text-sm font-normal text-slate-500">Items Sold</span>
          </div>
          <p className="text-[11px] text-slate-400">Across {productRows.length} active SKUs</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Gross Item Margin</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            {totalNetRev > 0 ? ((totalProfit / totalNetRev) * 100).toFixed(1) : 0}%
          </div>
          <p className="text-[11px] text-slate-400">Net gross profit: {formatAmount(totalProfit)}</p>
        </div>

      </div>

      {/* 2. Product Sales Matrix Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">Product Performance Matrix</h3>
            <p className="text-xs text-slate-400">Detailed item sales, COGS, gross margins, and returns</p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 w-full sm:w-56"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl text-xs font-bold text-slate-700 shrink-0">
              <span className="text-slate-400 text-[10px] uppercase font-bold mr-1 hidden xs:inline">Sort:</span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as 'revenue' | 'units' | 'profit' | 'margin')}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="revenue">Revenue</option>
                <option value="units">Units Sold</option>
                <option value="profit">Gross Profit</option>
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
                <th className="py-3 px-4">Product Name / SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Units Sold</th>
                <th className="py-3 px-4 text-right">Gross Sales</th>
                <th className="py-3 px-4 text-right">Discounts</th>
                <th className="py-3 px-4 text-right">Net Revenue</th>
                <th className="py-3 px-4 text-right">COGS</th>
                <th className="py-3 px-4 text-right">Gross Profit</th>
                <th className="py-3 px-4 text-right">Margin %</th>
                <th className="py-3 px-4 text-center">Returns</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {productRows.map(p => (
                <tr key={p.productId} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{p.name}</div>
                    <div className="font-mono text-[10px] text-slate-400">{p.sku}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                      {p.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">{p.unitsSold}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600">{formatAmount(p.grossSales)}</td>
                  <td className="py-3 px-4 text-right font-mono text-amber-600 font-semibold">
                    {p.discountGiven > 0 ? `-${formatAmount(p.discountGiven)}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-indigo-600">{formatAmount(p.netSales)}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-500">{formatAmount(p.cogs)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">{formatAmount(p.grossProfit)}</td>
                  <td className="py-3 px-4 text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {p.marginPercent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-slate-500">
                    {p.returnUnits > 0 ? (
                      <span className="text-rose-600 font-bold">{p.returnUnits}</span>
                    ) : '0'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile & Tablet Grid View */}
        <div className="block lg:hidden p-2.5 sm:p-4 grid grid-cols-2 gap-2 sm:gap-3 bg-slate-50/50">
          {productRows.map(p => (
            <div key={p.productId} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-xs text-slate-900 line-clamp-1">{p.name}</div>
                  <span className="font-mono text-[10px] text-slate-400">{p.sku}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  {p.marginPercent.toFixed(1)}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Category:</span>
                  <span className="font-medium text-slate-700">{p.category}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Units Sold:</span>
                  <span className="font-mono font-bold text-slate-900">{p.unitsSold}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Gross Profit:</span>
                  <span className="font-mono font-bold text-emerald-600">{formatAmount(p.grossProfit)}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Net Sales:</span>
                  <span className="font-black font-mono text-indigo-600">{formatAmount(p.netSales)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}
