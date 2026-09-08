import React from 'react';
import { 
  DollarSign, Package, Percent, 
  TrendingDown, Layers, ShoppingBag, ShieldCheck 
} from 'lucide-react';
import { Order, Product } from '../../../types';
import { useCurrency } from '../../../context/CurrencyContext';

interface COGSReportProps {
  orders: Order[];
  products: Product[];
}

export default function COGSReport({ orders, products }: COGSReportProps) {
  const { formatAmount } = useCurrency();

  let totalSales = 0;
  let totalCogs = 0;

  orders.forEach(o => {
    if (o.status !== 'Refunded') {
      const rev = o.subtotal || 0;
      totalSales += rev;
      totalCogs += (o.cogs || (rev * 0.45));
    }
  });

  const cogsRatio = totalSales > 0 ? (totalCogs / totalSales) * 100 : 45.0;

  // SKU Cost Structure table
  const skuCosts = [...products].map(p => {
    const cost = p.cost || p.price * 0.45;
    const unitsSold = p.salesCount || 0;
    const totalCogsContribution = unitsSold * cost;
    const totalRevenueContribution = unitsSold * p.price;
    const cogsShare = totalRevenueContribution > 0 ? (totalCogsContribution / totalRevenueContribution) * 100 : 0;

    return {
      ...p,
      cost,
      totalCogsContribution,
      totalRevenueContribution,
      cogsShare
    };
  }).sort((a, b) => b.totalCogsContribution - a.totalCogsContribution);

  return (
    <div className="space-y-6" id="cogs-report">
      
      {/* 1. Header Highlight KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        
        <div className="bg-slate-900 text-white rounded-3xl p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Realized COGS</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {formatAmount(totalCogs)}
          </div>
          <p className="text-[11px] text-slate-400">Direct inventory procurement expense of goods sold</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">COGS % of Net Revenue</span>
            <Percent className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-600 font-mono">
            {cogsRatio.toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-400">Target benchmark under 50.0%</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Remaining Catalog Cost Basis</span>
            <Package className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {formatAmount(products.reduce((sum, p) => sum + (p.stock * (p.cost || p.price * 0.45)), 0))}
          </div>
          <p className="text-[11px] text-slate-400">Unrealized cost sitting in current warehouse inventory</p>
        </div>

      </div>

      {/* 2. COGS Contribution Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900">SKU Cost of Goods Sold (COGS) Ledger</h3>
          <p className="text-xs text-slate-400">Direct cost per unit, units consumed, and total inventory expense generated</p>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Product Name / SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Units Sold</th>
                <th className="py-3 px-4 text-right">Unit Cost</th>
                <th className="py-3 px-4 text-right">Total Realized COGS</th>
                <th className="py-3 px-4 text-right">Unit Selling Price</th>
                <th className="py-3 px-4 text-right">COGS Ratio %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {skuCosts.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{p.name}</div>
                    <div className="font-mono text-[10px] text-slate-400">{p.sku}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                      {p.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">{p.salesCount}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600">{formatAmount(p.cost)}</td>
                  <td className="py-3 px-4 text-right font-mono font-black text-rose-600">
                    {formatAmount(p.totalCogsContribution)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatAmount(p.price)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                    {p.cogsShare.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile & Tablet Grid View */}
        <div className="block lg:hidden p-2.5 sm:p-4 grid grid-cols-2 gap-2 sm:gap-3 bg-slate-50/50">
          {skuCosts.map(p => (
            <div key={p.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-xs text-slate-900 line-clamp-1">{p.name}</div>
                  <span className="font-mono text-[10px] text-slate-400">{p.sku} • {p.category}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-100 text-slate-700 shrink-0">
                  {p.cogsShare.toFixed(1)}% COGS
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Total COGS:</span>
                  <span className="font-mono font-black text-rose-600">{formatAmount(p.totalCogsContribution)}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Units Sold:</span>
                  <span className="font-mono font-bold text-slate-800">{p.salesCount} units</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Unit Cost:</span>
                  <span className="font-mono text-slate-600">{formatAmount(p.cost)}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Selling Price:</span>
                  <span className="font-mono font-bold text-slate-900">{formatAmount(p.price)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
