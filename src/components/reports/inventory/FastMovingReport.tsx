import React from 'react';
import { 
  Zap, TrendingUp, AlertCircle, ArrowUpRight, 
  Flame, CheckCircle, PackageCheck, BarChart2 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, 
  YAxis, Tooltip, CartesianGrid, Cell 
} from 'recharts';
import { Product } from '../../../types';
import { useCurrency } from '../../../context/CurrencyContext';

interface FastMovingReportProps {
  products: Product[];
}

export default function FastMovingReport({ products }: FastMovingReportProps) {
  const { formatAmount } = useCurrency();

  // Sort by salesCount descending
  const fastMovingProducts = [...products]
    .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
    .slice(0, 10);

  const topFastProduct = fastMovingProducts[0];
  const totalFastUnitsSold = fastMovingProducts.reduce((sum, p) => sum + (p.salesCount || 0), 0);
  const totalFastRevenue = fastMovingProducts.reduce((sum, p) => sum + ((p.salesCount || 0) * p.price), 0);

  const chartData = fastMovingProducts.map(p => ({
    name: p.name.length > 18 ? p.name.substring(0, 16) + '...' : p.name,
    fullName: p.name,
    unitsSold: p.salesCount || 0,
    revenue: Math.round((p.salesCount || 0) * p.price),
    stock: p.stock
  }));

  return (
    <div className="space-y-6" id="fast-moving-report">
      
      {/* 1. Header Highlight KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-3xl p-5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-indigo-200">
            <span className="text-xs font-bold uppercase tracking-wider">Top Velocity Champion</span>
            <Flame className="w-4 h-4 text-amber-300" />
          </div>
          <div className="text-xl font-black text-white truncate">
            {topFastProduct?.name || 'N/A'}
          </div>
          <p className="text-[11px] text-indigo-200 font-mono">
            {topFastProduct?.salesCount || 0} units sold • {formatAmount((topFastProduct?.salesCount || 0) * (topFastProduct?.price || 0))} generated
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Top 10 Units Sold</span>
            <Zap className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {totalFastUnitsSold} <span className="text-sm font-normal text-slate-500">Units</span>
          </div>
          <p className="text-[11px] text-slate-400">High-turnover SKU volume</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Gross Velocity Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            {formatAmount(totalFastRevenue)}
          </div>
          <p className="text-[11px] text-slate-400">Generated from top-tier fast moving catalog</p>
        </div>

      </div>

      {/* 2. Visual Bar Chart: Units Sold vs Current Stock */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">Velocity Distribution (Units Sold vs In-Stock Buffer)</h3>
            <p className="text-xs text-slate-400">Identify top performing SKUs and check if stock coverage is adequate</p>
          </div>
          <BarChart2 className="w-4 h-4 text-slate-400" />
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip 
                formatter={(val: number, name: string) => [
                  name === 'revenue' ? formatAmount(val) : `${val} units`, 
                  name === 'unitsSold' ? 'Units Sold' : name === 'stock' ? 'Current Stock' : 'Revenue'
                ]}
                contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '12px' }}
              />
              <Bar dataKey="unitsSold" name="Units Sold" fill="#6366f1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="stock" name="Current Stock" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Fast-Moving Leaderboard Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900">Fast-Moving SKU Matrix</h3>
          <p className="text-xs text-slate-400">Sales velocity ranking, daily run-rate, and stock cover days</p>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 text-center">Rank</th>
                <th className="py-3 px-4">Product Name / SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Units Sold</th>
                <th className="py-3 px-4 text-right">Daily Velocity</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-right">Total Revenue</th>
                <th className="py-3 px-4 text-center">Stock Cover (Days)</th>
                <th className="py-3 px-4 text-center">Restock Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {fastMovingProducts.map((p, index) => {
                const dailyVelocity = ((p.salesCount || 1) / 30).toFixed(1);
                const dailyVelocityNum = Math.max(0.1, (p.salesCount || 1) / 30);
                const stockCoverDays = Math.round(p.stock / dailyVelocityNum);
                const isRunoutRisk = stockCoverDays <= 14;

                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-center font-bold font-mono">
                      <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs ${
                        index === 0 ? 'bg-amber-100 text-amber-800 font-black' :
                        index === 1 ? 'bg-slate-200 text-slate-800 font-bold' :
                        index === 2 ? 'bg-amber-50 text-amber-700 font-bold' : 'text-slate-500'
                      }`}>
                        #{index + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="font-mono text-[10px] text-slate-400">{p.sku}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-indigo-600">
                      {p.salesCount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      ~{dailyVelocity} / day
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">{formatAmount(p.price)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatAmount((p.salesCount || 0) * p.price)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold">
                      <span className={isRunoutRisk ? 'text-rose-600 font-black' : 'text-slate-800'}>
                        {p.stock === 0 ? '0 (Out)' : `${stockCoverDays} Days`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.stock === 0 ? 'bg-rose-600 text-white' :
                        isRunoutRisk ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {p.stock === 0 ? 'STOCKOUT' : isRunoutRisk ? 'REORDER SOON' : 'HEALTHY BUFFER'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile & Tablet Grid View */}
        <div className="block lg:hidden p-2.5 sm:p-4 grid grid-cols-2 gap-2 sm:gap-3 bg-slate-50/50">
          {fastMovingProducts.map((p, index) => {
            const dailyVelocity = ((p.salesCount || 1) / 30).toFixed(1);
            const dailyVelocityNum = Math.max(0.1, (p.salesCount || 1) / 30);
            const stockCoverDays = Math.round(p.stock / dailyVelocityNum);
            const isRunoutRisk = stockCoverDays <= 14;

            return (
              <div key={p.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] shrink-0 mt-0.5 ${
                      index === 0 ? 'bg-amber-100 text-amber-800 font-black' :
                      index === 1 ? 'bg-slate-200 text-slate-800 font-bold' :
                      index === 2 ? 'bg-amber-50 text-amber-700 font-bold' : 'bg-slate-100 text-slate-500 font-bold'
                    }`}>
                      #{index + 1}
                    </span>
                    <div>
                      <div className="font-bold text-xs text-slate-900 line-clamp-1">{p.name}</div>
                      <span className="font-mono text-[10px] text-slate-400">{p.sku} • {p.category}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    p.stock === 0 ? 'bg-rose-600 text-white' :
                    isRunoutRisk ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {p.stock === 0 ? 'OUT' : isRunoutRisk ? 'REORDER' : 'HEALTHY'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Units Sold:</span>
                    <span className="font-black font-mono text-indigo-600">{p.salesCount} units</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Daily Velocity:</span>
                    <span className="font-mono font-bold text-slate-700">~{dailyVelocity}/day</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Total Revenue:</span>
                    <span className="font-black font-mono text-slate-900">{formatAmount((p.salesCount || 0) * p.price)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Stock Runway:</span>
                    <span className={`font-mono font-bold ${isRunoutRisk ? 'text-rose-600' : 'text-slate-800'}`}>
                      {p.stock === 0 ? '0 days' : `${stockCoverDays} days`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
