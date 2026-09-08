import React from 'react';
import { 
  Grid, PieChart as PieIcon, TrendingUp, 
  DollarSign, ShoppingCart, Percent, Layers 
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, 
  Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { Order, Product } from '../../../types';
import { useCurrency } from '../../../context/CurrencyContext';

interface CategorySalesReportProps {
  orders: Order[];
  products: Product[];
}

const CATEGORY_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#64748b'];

export default function CategorySalesReport({ orders, products }: CategorySalesReportProps) {
  const { formatAmount } = useCurrency();

  const categoryMap: Record<string, {
    category: string;
    unitsSold: number;
    grossRevenue: number;
    cogs: number;
    skusCount: number;
  }> = {};

  // Initialize categories from product catalog
  products.forEach(p => {
    const cat = p.category || 'General';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { category: cat, unitsSold: 0, grossRevenue: 0, cogs: 0, skusCount: 0 };
    }
    categoryMap[cat].skusCount += 1;
    categoryMap[cat].unitsSold += (p.salesCount || 0);
    categoryMap[cat].grossRevenue += (p.salesCount || 0) * p.price;
    categoryMap[cat].cogs += (p.salesCount || 0) * (p.cost || p.price * 0.45);
  });

  const totalCatalogRevenue = Object.values(categoryMap).reduce((sum, c) => sum + c.grossRevenue, 0);

  const categoryRows = Object.values(categoryMap).map(c => {
    const grossProfit = c.grossRevenue - c.cogs;
    const marginPercent = c.grossRevenue > 0 ? (grossProfit / c.grossRevenue) * 100 : 0;
    const revenueShare = totalCatalogRevenue > 0 ? (c.grossRevenue / totalCatalogRevenue) * 100 : 0;
    const avgPrice = c.unitsSold > 0 ? c.grossRevenue / c.unitsSold : 0;

    return {
      ...c,
      grossProfit,
      marginPercent,
      revenueShare,
      avgPrice
    };
  }).sort((a, b) => b.grossRevenue - a.grossRevenue);

  const pieData = categoryRows.map(c => ({
    name: c.category,
    value: Math.round(c.grossRevenue)
  }));

  return (
    <div className="space-y-6" id="category-sales-report">
      
      {/* 1. Header Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Top Revenue Category</span>
            <Grid className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-slate-900 truncate">
            {categoryRows[0]?.category || 'N/A'}
          </div>
          <p className="text-[11px] text-slate-400">
            {formatAmount(categoryRows[0]?.grossRevenue || 0)} ({categoryRows[0]?.revenueShare.toFixed(1)}% share)
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Active Categories</span>
            <Layers className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {categoryRows.length} <span className="text-sm font-normal text-slate-500">Departments</span>
          </div>
          <p className="text-[11px] text-slate-400">Encompassing {products.length} total SKUs</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Overall Margin Average</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            {(categoryRows.reduce((sum, c) => sum + c.marginPercent, 0) / Math.max(1, categoryRows.length)).toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-400">Category gross profit margin composite</p>
        </div>

      </div>

      {/* 2. Visual Charts: Category Donut & Margin Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">Revenue Contribution by Category</h3>
              <p className="text-xs text-slate-400">Share of total enterprise gross sales</p>
            </div>
            <PieIcon className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: number) => [formatAmount(val), 'Revenue']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">Profitability Margin by Category</h3>
              <p className="text-xs text-slate-400">Gross margin % across product lines</p>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryRows} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `${v}%`} />
                <Tooltip 
                  formatter={(val: number) => [`${val.toFixed(1)}%`, 'Margin']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '12px' }}
                />
                <Bar dataKey="marginPercent" name="Margin %" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 3. Category Matrix Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900">Category Sales Matrix</h3>
          <p className="text-xs text-slate-400">Consolidated department volume, revenue, and gross profit</p>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Category Name</th>
                <th className="py-3 px-4 text-center">SKU Count</th>
                <th className="py-3 px-4 text-center">Units Sold</th>
                <th className="py-3 px-4 text-right">Avg Unit Price</th>
                <th className="py-3 px-4 text-right">Gross Revenue</th>
                <th className="py-3 px-4 text-right">Revenue Share</th>
                <th className="py-3 px-4 text-right">COGS</th>
                <th className="py-3 px-4 text-right">Gross Profit</th>
                <th className="py-3 px-4 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {categoryRows.map(c => (
                <tr key={c.category} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{c.category}</td>
                  <td className="py-3 px-4 text-center font-mono text-slate-600">{c.skusCount}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">{c.unitsSold}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600">{formatAmount(c.avgPrice)}</td>
                  <td className="py-3 px-4 text-right font-mono font-black text-indigo-600">{formatAmount(c.grossRevenue)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">{c.revenueShare.toFixed(1)}%</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-500">{formatAmount(c.cogs)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">{formatAmount(c.grossProfit)}</td>
                  <td className="py-3 px-4 text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {c.marginPercent.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile & Tablet Grid View */}
        <div className="block lg:hidden p-2.5 sm:p-4 grid grid-cols-2 gap-2 sm:gap-3 bg-slate-50/50">
          {categoryRows.map(c => (
            <div key={c.category} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">{c.category}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {c.marginPercent.toFixed(1)}% Margin
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Gross Revenue:</span>
                  <span className="font-black font-mono text-indigo-600">{formatAmount(c.grossRevenue)}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Share:</span>
                  <span className="font-mono font-bold text-slate-700">{c.revenueShare.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Units Sold:</span>
                  <span className="font-mono font-bold text-slate-900">{c.unitsSold}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Gross Profit:</span>
                  <span className="font-mono font-bold text-emerald-600">{formatAmount(c.grossProfit)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
