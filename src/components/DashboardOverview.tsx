import React, { useState, useMemo } from 'react';
import { Product, Order, AuditLog, Customer } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { 
  ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, 
  BarChart, Bar, Cell, PieChart, Pie, Legend, CartesianGrid
} from 'recharts';
import { 
  TrendingUp, AlertTriangle, Users, Package, ShoppingBag, 
  Clock, DollarSign, ArrowUpRight, Activity, Calendar, Download,
  RefreshCw, CheckCircle2, ChevronRight, ChevronDown, Zap, Bell, ArrowRight,
  Layers, BarChart3, Sparkles, Plus, Check, ShieldAlert, Sliders,
  X, AlertCircle, Eye, Smartphone, FileText, BarChart2, Filter, 
  ExternalLink, ArrowDownRight, Printer, Shield, Sparkle
} from 'lucide-react';

interface DashboardOverviewProps {
  products: Product[];
  orders: Order[];
  customers: Customer[];
  auditLogs: AuditLog[];
  onQuickReorder: (productId: string, amount: number) => void;
  onNavigateToTab: (tabId: string) => void;
}

export default function DashboardOverview({
  products,
  orders,
  customers,
  auditLogs,
  onQuickReorder,
  onNavigateToTab
}: DashboardOverviewProps) {
  const { formatAmount, currentCurrency } = useCurrency();
  const [timeRange, setTimeRange] = useState<'7d' | '14d' | '30d' | 'all'>('7d');
  const [isDaysDropdownOpen, setIsDaysDropdownOpen] = useState<boolean>(false);
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders' | 'avgOrder'>('revenue');
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);
  const [recentlyReorderedIds, setRecentlyReorderedIds] = useState<{ [key: string]: boolean }>({});
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const TIME_RANGE_OPTIONS = [
    { id: '7d' as const, label: '7 Days', desc: 'Last 7 days' },
    { id: '14d' as const, label: '14 Days', desc: 'Last 2 weeks' },
    { id: '30d' as const, label: '30 Days', desc: 'Last 30 days' },
    { id: 'all' as const, label: 'All Time', desc: 'Full activity log' },
  ];
  
  // Configurable Stock Alert Threshold State
  const [thresholdMode, setThresholdMode] = useState<'custom' | 'reorderPoint'>('custom');
  const [customThreshold, setCustomThreshold] = useState<number>(10);
  const [isToastDismissed, setIsToastDismissed] = useState<boolean>(false);
  const [showThresholdConfig, setShowThresholdConfig] = useState<boolean>(false);
  const [reorderAmountBatch, setReorderAmountBatch] = useState<number>(50);

  // Trigger brief visual refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Compute low stock items based on configurable threshold
  const lowStockItems = useMemo(() => {
    return products.filter(p => {
      const limit = thresholdMode === 'custom' ? customThreshold : p.reorderPoint;
      return p.stock <= limit;
    });
  }, [products, thresholdMode, customThreshold]);

  // Out of stock items (0 stock)
  const outOfStockItems = useMemo(() => {
    return products.filter(p => p.stock === 0);
  }, [products]);

  // Overall Financial Metrics from Orders
  const completedOrders = useMemo(() => {
    return orders.filter(o => o.status === 'Completed');
  }, [orders]);

  const totalRevenue = useMemo(() => {
    return completedOrders.reduce((sum, o) => sum + o.total, 0);
  }, [completedOrders]);

  const totalStockValue = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.stock * p.price), 0);
  }, [products]);

  const totalStockUnits = useMemo(() => {
    return products.reduce((acc, p) => acc + p.stock, 0);
  }, [products]);

  const averageOrderValue = useMemo(() => {
    if (completedOrders.length === 0) return 0;
    return totalRevenue / completedOrders.length;
  }, [completedOrders, totalRevenue]);

  // Handle single product quick restock with feedback
  const handleSingleReorder = (productId: string, amount: number) => {
    onQuickReorder(productId, amount);
    setRecentlyReorderedIds(prev => ({ ...prev, [productId]: true }));
    setTimeout(() => {
      setRecentlyReorderedIds(prev => ({ ...prev, [productId]: false }));
    }, 2500);
  };

  // Handle batch reorder of all low stock products
  const handleReorderAllLowStock = () => {
    if (lowStockItems.length === 0) return;
    lowStockItems.forEach(item => {
      onQuickReorder(item.id, reorderAmountBatch);
      setRecentlyReorderedIds(prev => ({ ...prev, [item.id]: true }));
    });
    setTimeout(() => {
      setRecentlyReorderedIds({});
    }, 3000);
  };

  // Process Daily Sales Trend Line Graph Data from live orders state
  const salesTrendData = useMemo(() => {
    const dailyMap: { [key: string]: { revenue: number; orderCount: number; rawDate: Date } } = {};
    
    // Sort orders by timestamp ascending
    const sortedOrders = [...completedOrders].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sortedOrders.forEach(order => {
      const orderDate = new Date(order.date);
      // Normalized date key
      const key = orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (!dailyMap[key]) {
        dailyMap[key] = { revenue: 0, orderCount: 0, rawDate: orderDate };
      }
      dailyMap[key].revenue += order.total;
      dailyMap[key].orderCount += 1;
    });

    // Convert to chart array
    let chartPoints = Object.keys(dailyMap).map(key => {
      const rev = dailyMap[key].revenue;
      const count = dailyMap[key].orderCount;
      return {
        date: key,
        Revenue: parseFloat(rev.toFixed(2)),
        Orders: count,
        AvgOrder: parseFloat((rev / (count || 1)).toFixed(2)),
        rawDate: dailyMap[key].rawDate
      };
    });

    // If there are few orders or single day, generate date points so chart looks continuous
    if (chartPoints.length === 0) {
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const k = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        chartPoints.push({
          date: k,
          Revenue: 0,
          Orders: 0,
          AvgOrder: 0,
          rawDate: d
        });
      }
    }

    // Filter by timeRange
    if (timeRange === '7d') {
      chartPoints = chartPoints.slice(-7);
    } else if (timeRange === '14d') {
      chartPoints = chartPoints.slice(-14);
    } else if (timeRange === '30d') {
      chartPoints = chartPoints.slice(-30);
    }

    return chartPoints;
  }, [completedOrders, timeRange]);

  // Compute Trend Highlights
  const trendStats = useMemo(() => {
    if (salesTrendData.length === 0) {
      return { total: 0, avgDaily: 0, peakDay: { date: 'N/A', revenue: 0 }, totalOrders: 0 };
    }
    const total = salesTrendData.reduce((sum, d) => sum + d.Revenue, 0);
    const totalOrders = salesTrendData.reduce((sum, d) => sum + d.Orders, 0);
    const avgDaily = total / salesTrendData.length;
    let peakDay = salesTrendData[0];
    salesTrendData.forEach(d => {
      if (d.Revenue > peakDay.Revenue) peakDay = d;
    });
    return {
      total,
      avgDaily,
      peakDay,
      totalOrders
    };
  }, [salesTrendData]);

  // Process Category-based Revenue Pie Chart Data
  const categoryPieData = useMemo(() => {
    const categoryTotals: { [key: string]: { revenue: number; unitsSold: number } } = {};

    completedOrders.forEach(order => {
      order.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const catName = prod ? prod.category : 'Uncategorized';
        
        if (!categoryTotals[catName]) {
          categoryTotals[catName] = { revenue: 0, unitsSold: 0 };
        }
        categoryTotals[catName].revenue += (item.price * item.quantity);
        categoryTotals[catName].unitsSold += item.quantity;
      });
    });

    const totalCatRevenue = Object.values(categoryTotals).reduce((sum, v) => sum + v.revenue, 0) || 1;

    const data = Object.keys(categoryTotals).map(catName => ({
      name: catName,
      value: parseFloat(categoryTotals[catName].revenue.toFixed(2)),
      units: categoryTotals[catName].unitsSold,
      percentage: parseFloat(((categoryTotals[catName].revenue / totalCatRevenue) * 100).toFixed(1))
    })).sort((a, b) => b.value - a.value);

    return data;
  }, [completedOrders, products]);

  // Refined color palette for charts
  const PIE_COLORS = [
    '#4F46E5', // Indigo 600
    '#059669', // Emerald 600
    '#D97706', // Amber 600
    '#2563EB', // Blue 600
    '#7C3AED', // Violet 600
    '#DB2777', // Pink 600
    '#0891B2'  // Cyan 600
  ];

  // Channel Breakdown
  const channelBreakdownData = useMemo(() => {
    const channelMap: { [key: string]: { revenue: number; count: number } } = {
      'Online Storefront': { revenue: 0, count: 0 },
      'In-Store POS': { revenue: 0, count: 0 },
      'Mobile App': { revenue: 0, count: 0 }
    };
    completedOrders.forEach(order => {
      if (channelMap[order.channel]) {
        channelMap[order.channel].revenue += order.total;
        channelMap[order.channel].count += 1;
      }
    });

    const sumTotal = Object.values(channelMap).reduce((acc, curr) => acc + curr.revenue, 0) || 1;

    return Object.keys(channelMap).map(channel => ({
      name: channel,
      Revenue: parseFloat(channelMap[channel].revenue.toFixed(2)),
      count: channelMap[channel].count,
      share: Math.round((channelMap[channel].revenue / sumTotal) * 100)
    }));
  }, [completedOrders]);

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-7 relative w-full" id="dashboard-overview-container">
      
      {/* ========================================================================= */}
      {/* 1. FLOATING TOAST NOTIFICATION FOR LOW STOCK ALERT                        */}
      {/* ========================================================================= */}
      {lowStockItems.length > 0 && !isToastDismissed && (
        <aside 
          aria-label="Stock Alert Notification"
          className="fixed bottom-4 sm:bottom-auto sm:top-16 right-3 sm:right-6 z-50 max-w-sm sm:max-w-md w-[calc(100vw-1.5rem)] sm:w-auto bg-slate-900/95 backdrop-blur-md text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-rose-500/40 animate-in slide-in-from-bottom-4 sm:slide-in-from-top-4 duration-300"
          id="stock-alert-toast"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
              <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl shrink-0 mt-0.5 animate-pulse">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs sm:text-sm text-rose-300">
                    Stock Depletion Alert
                  </span>
                  <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-mono font-bold rounded-full whitespace-nowrap">
                    {lowStockItems.length} {lowStockItems.length === 1 ? 'Item' : 'Items'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-gray-300 leading-relaxed line-clamp-2 sm:line-clamp-none">
                  {lowStockItems.length === 1 ? (
                    <span><strong>{lowStockItems[0].name}</strong> has only <strong>{lowStockItems[0].stock}</strong> units remaining.</span>
                  ) : (
                    <span>{lowStockItems.length} catalog items dropped below threshold (<strong>{thresholdMode === 'custom' ? `${customThreshold} units` : 'safety level'}</strong>).</span>
                  )}
                </p>
                <div className="pt-2 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleReorderAllLowStock}
                    className="px-3 py-1.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    id="toast-btn-restock-all"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Restock All (+{reorderAmountBatch})</span>
                  </button>
                  <button
                    onClick={() => {
                      const el = document.getElementById('realtime-low-stock-banner');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            </div>

            {/* Dismiss Toast Button */}
            <button
              onClick={() => setIsToastDismissed(true)}
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all shrink-0 cursor-pointer"
              title="Dismiss toast"
              id="toast-btn-dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* ========================================================================= */}
      {/* 2. TOP HEADER & RANGE CONTROLS (RESPONSIVE FOR ALL SCREEN SIZES)          */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl shadow-xs border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all" id="dash-header">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900" id="dash-title">
              Command Center
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Operations
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500" id="dash-desc">
            Unified telemetry, cross-channel sales velocity, and inventory alerts.
          </p>
        </div>

        {/* Action Toolbar & Time Range Switcher (Always single row on all screen sizes) */}
        <div className="flex flex-row items-center gap-2 w-full sm:w-auto" id="dash-toolbar-controls">
          
          {/* Time Range Selector Dropdown Menu */}
          <div className="relative flex-1 sm:flex-initial" id="dash-time-dropdown-wrapper">
            <button
              onClick={() => setIsDaysDropdownOpen(prev => !prev)}
              className="w-full sm:w-auto min-w-[120px] sm:min-w-[145px] px-3 py-2 bg-slate-100/90 hover:bg-slate-200/80 active:scale-98 text-slate-800 text-xs font-bold rounded-xl border border-slate-200/80 shadow-2xs transition-all flex items-center justify-between gap-2 cursor-pointer"
              id="btn-days-filter-dropdown"
              aria-label="Filter by days"
              aria-expanded={isDaysDropdownOpen}
              aria-haspopup="listbox"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">{TIME_RANGE_OPTIONS.find(o => o.id === timeRange)?.label || '7 Days'}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 shrink-0 ${isDaysDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`} />
            </button>

            {/* Dropdown Menu Modal / Popover */}
            {isDaysDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setIsDaysDropdownOpen(false)} 
                />
                <div 
                  className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 w-52 sm:w-56 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1.5 z-40 animate-in fade-in slide-in-from-top-1 duration-150"
                  role="listbox"
                  id="dash-days-dropdown-menu"
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                    Select Time Range
                  </div>
                  {TIME_RANGE_OPTIONS.map(opt => {
                    const isSelected = timeRange === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setTimeRange(opt.id);
                          setIsDaysDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-50 text-indigo-900 font-bold' 
                            : 'text-slate-700 hover:bg-slate-50 font-medium'
                        }`}
                        role="option"
                        aria-selected={isSelected}
                        id={`btn-time-opt-${opt.id}`}
                      >
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1.5">
                            {opt.label}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">{opt.desc}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Quick Refresh & Reports Jump */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleRefresh}
              className={`p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all cursor-pointer ${
                isRefreshing ? 'animate-spin text-indigo-600' : ''
              }`}
              title="Refresh telemetry metrics"
              id="btn-refresh-telemetry"
              aria-label="Refresh telemetry metrics"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigateToTab('Reports')}
              className="px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap justify-center"
              id="btn-quick-reports"
            >
              <BarChart2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Reports</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. KEY PERFORMANCE INDICATORS (KPI) GRID                                  */}
      {/* Responsive: 2 cols per row on mobile & tablet, 4 cols on desktop          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5" id="kpi-grid">
        
        {/* KPI 1: Gross Sales Volume */}
        <div 
          onClick={() => onNavigateToTab('Invoices')}
          className="bg-white p-3 sm:p-4 lg:p-5 rounded-2xl shadow-2xs border border-slate-100 hover:border-emerald-200 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3 cursor-pointer group" 
          id="kpi-card-revenue"
        >
          <div className="space-y-1 sm:space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Gross Sales</span>
              <ArrowUpRight className="w-3 h-3 text-slate-300 group-hover:text-emerald-600 transition-colors shrink-0 hidden xs:inline" />
            </div>
            <div className="text-lg sm:text-2xl lg:text-2xl xl:text-3xl font-extrabold text-slate-900 tracking-tight truncate">
              {formatAmount(totalRevenue)}
            </div>
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-emerald-600 font-semibold truncate">
              <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="truncate">{completedOrders.length} settled ({currentCurrency.code})</span>
            </div>
          </div>
          <div className="p-2 sm:p-2.5 lg:p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0 self-start group-hover:scale-105 transition-transform">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
          </div>
        </div>

        {/* KPI 2: Inventory Asset Value */}
        <div 
          onClick={() => onNavigateToTab('Inventory')}
          className="bg-white p-3 sm:p-4 lg:p-5 rounded-2xl shadow-2xs border border-slate-100 hover:border-indigo-200 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3 cursor-pointer group" 
          id="kpi-card-inventory"
        >
          <div className="space-y-1 sm:space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Inventory Value</span>
              <ArrowUpRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-600 transition-colors shrink-0 hidden xs:inline" />
            </div>
            <div className="text-lg sm:text-2xl lg:text-2xl xl:text-3xl font-extrabold text-slate-900 tracking-tight truncate">
              {formatAmount(totalStockValue)}
            </div>
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500 font-medium truncate">
              <Package className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-indigo-500" />
              <span className="truncate">{totalStockUnits} units · {products.length} SKUs</span>
            </div>
          </div>
          <div className="p-2 sm:p-2.5 lg:p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0 self-start group-hover:scale-105 transition-transform">
            <Package className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
          </div>
        </div>

        {/* KPI 3: Stock Alert Status (Highlighted Interactive Card) */}
        <div 
          onClick={() => {
            const el = document.getElementById('realtime-low-stock-banner');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`p-3 sm:p-4 lg:p-5 rounded-2xl shadow-2xs border flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3 transition-all cursor-pointer group ${
            lowStockItems.length > 0 
              ? 'bg-gradient-to-br from-rose-50/70 via-white to-amber-50/40 border-rose-200 hover:border-rose-300 hover:shadow-xs' 
              : 'bg-white border-slate-100 hover:border-emerald-200 hover:shadow-xs'
          }`} 
          id="kpi-card-alerts"
        >
          <div className="space-y-1 sm:space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Stock Alerts</span>
              {lowStockItems.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
              )}
            </div>
            <div className={`text-lg sm:text-2xl lg:text-2xl xl:text-3xl font-extrabold tracking-tight truncate ${
              lowStockItems.length > 0 ? 'text-rose-600' : 'text-slate-900'
            }`}>
              {lowStockItems.length > 0 ? `${lowStockItems.length} Warnings` : 'Optimal'}
            </div>
            <div className={`flex items-center gap-1 text-[10px] sm:text-xs font-semibold truncate ${
              lowStockItems.length > 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}>
              {lowStockItems.length > 0 ? (
                <>
                  <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span className="truncate">{outOfStockItems.length > 0 ? `${outOfStockItems.length} out of stock` : `${lowStockItems.length} low stock`}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span className="truncate">All stocked</span>
                </>
              )}
            </div>
          </div>
          <div className={`p-2 sm:p-2.5 lg:p-3 rounded-xl shrink-0 self-start group-hover:scale-105 transition-transform ${
            lowStockItems.length > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-50 text-emerald-600'
          }`}>
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
          </div>
        </div>

        {/* KPI 4: Average Order Value */}
        <div 
          onClick={() => onNavigateToTab('CRM')}
          className="bg-white p-3 sm:p-4 lg:p-5 rounded-2xl shadow-2xs border border-slate-100 hover:border-blue-200 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3 cursor-pointer group" 
          id="kpi-card-crm"
        >
          <div className="space-y-1 sm:space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Avg Ticket</span>
              <ArrowUpRight className="w-3 h-3 text-slate-300 group-hover:text-blue-600 transition-colors shrink-0 hidden xs:inline" />
            </div>
            <div className="text-lg sm:text-2xl lg:text-2xl xl:text-3xl font-extrabold text-slate-900 tracking-tight truncate">
              {formatAmount(averageOrderValue)}
            </div>
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-blue-600 font-semibold truncate">
              <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="truncate">{customers.length} customer files</span>
            </div>
          </div>
          <div className="p-2 sm:p-2.5 lg:p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0 self-start group-hover:scale-105 transition-transform">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. CONFIGURABLE THRESHOLD & VISUAL ALERT BANNER                           */}
      {/* ========================================================================= */}
      <section 
        className={`relative overflow-hidden rounded-2xl border transition-all ${
          lowStockItems.length > 0 
            ? 'border-amber-200/90 bg-gradient-to-b from-amber-50/80 via-white to-amber-50/30 shadow-xs' 
            : 'border-emerald-200/70 bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/20 shadow-xs'
        }`}
        id="realtime-low-stock-banner"
      >
        {/* Accent top stripe */}
        <div className={`h-1.5 w-full ${lowStockItems.length > 0 ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600' : 'bg-emerald-500'}`} />

        <div className="p-4 sm:p-5 space-y-4">
          
          {/* Main Alert Header Row */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5">
            
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                {lowStockItems.length > 0 ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-600 text-white shadow-xs" id="low-stock-badge-indicator">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      INVENTORY ALERT: {lowStockItems.length} LOW STOCK
                    </span>
                    {outOfStockItems.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900 text-rose-300 border border-rose-500/30">
                        <AlertCircle className="w-3 h-3 text-rose-400" />
                        {outOfStockItems.length} OUT OF STOCK
                      </span>
                    )}
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs" id="nominal-stock-badge-indicator">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ALL INVENTORY LEVELS HEALTHY
                  </span>
                )}

                {/* Toast status button if user dismissed it */}
                {lowStockItems.length > 0 && isToastDismissed && (
                  <button
                    onClick={() => setIsToastDismissed(false)}
                    className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 underline cursor-pointer"
                  >
                    <Bell className="w-3 h-3" /> Re-open Toast
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {lowStockItems.length > 0 ? (
                  <span>
                    Items flagged under threshold limit (<strong>{thresholdMode === 'custom' ? `≤ ${customThreshold} units` : 'per-product safety point'}</strong>). Reorder stock to prevent fulfillment delays.
                  </span>
                ) : (
                  <span>
                    All {products.length} catalog items are stocked safely above active safety threshold.
                  </span>
                )}
              </p>
            </div>

            {/* Threshold Configurator & Batch Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
              
              {/* Toggle Configurator Drawer */}
              <button
                onClick={() => setShowThresholdConfig(!showThresholdConfig)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                  showThresholdConfig
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
                }`}
                id="btn-toggle-threshold-config"
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                <span>Threshold: <strong>{thresholdMode === 'custom' ? `${customThreshold} units` : 'Reorder Point'}</strong></span>
              </button>

              {/* Master Batch Reorder Button */}
              {lowStockItems.length > 0 && (
                <button
                  onClick={handleReorderAllLowStock}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  id="btn-reorder-all-low-stock"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Restock All ({lowStockItems.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Threshold Configurator Box */}
          {showThresholdConfig && (
            <div className="p-4 bg-white rounded-xl border border-indigo-100 shadow-sm space-y-3 animate-in fade-in duration-200" id="threshold-config-box">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                    Configure Inventory Alert Trigger
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Adjust when the dashboard triggers low-stock badges, toast notifications, and restock prompts.
                  </p>
                </div>

                {/* Mode Selector */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                  <button
                    onClick={() => setThresholdMode('custom')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      thresholdMode === 'custom' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Global Threshold
                  </button>
                  <button
                    onClick={() => setThresholdMode('reorderPoint')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      thresholdMode === 'reorderPoint' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Per-Product Point
                  </button>
                </div>
              </div>

              {thresholdMode === 'custom' && (
                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">Threshold Limit:</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCustomThreshold(Math.max(1, customThreshold - 1))}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm cursor-pointer"
                        aria-label="Decrease threshold"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={customThreshold}
                        onChange={(e) => setCustomThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 px-2 py-1 text-center font-bold text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-indigo-600 font-mono"
                      />
                      <button
                        onClick={() => setCustomThreshold(customThreshold + 1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm cursor-pointer"
                        aria-label="Increase threshold"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-xs text-slate-500">units</span>
                  </div>

                  {/* Preset chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 font-semibold">Quick Presets:</span>
                    {[5, 10, 15, 20, 30].map(val => (
                      <button
                        key={val}
                        onClick={() => setCustomThreshold(val)}
                        className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          customThreshold === val
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {val} units
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cards for each low-stock product with One-Click Reordering */}
          {lowStockItems.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3 pt-1" id="low-stock-products-grid">
              {lowStockItems.map(prod => {
                const isReordered = recentlyReorderedIds[prod.id];
                const targetLimit = thresholdMode === 'custom' ? customThreshold : prod.reorderPoint;
                const stockRatio = Math.min(100, Math.round((prod.stock / (targetLimit || 1)) * 100));
                const isOut = prod.stock === 0;

                return (
                  <div 
                    key={prod.id}
                    className={`bg-white/95 p-2.5 sm:p-3.5 rounded-xl border shadow-2xs flex flex-col justify-between space-y-2 sm:space-y-3 transition-all ${
                      isOut 
                        ? 'border-rose-300 ring-1 ring-rose-200' 
                        : 'border-amber-200/90 hover:border-amber-300'
                    }`}
                    id={`low-stock-item-${prod.id}`}
                  >
                    <div className="space-y-1 sm:space-y-1.5 min-w-0">
                      <div className="flex justify-between items-start gap-1">
                        <h3 className="text-[11px] sm:text-xs font-bold text-slate-900 truncate" title={prod.name}>
                          {prod.name}
                        </h3>
                        <span className="text-[8px] sm:text-[9px] font-mono px-1 sm:px-1.5 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded shrink-0">
                          {prod.category}
                        </span>
                      </div>

                      <div className="flex flex-col xs:flex-row xs:items-center justify-between text-[10px] sm:text-[11px] gap-0.5">
                        <span className="font-mono text-[9px] sm:text-[10px] text-slate-400 truncate">SKU: {prod.sku}</span>
                        <span className={`font-bold font-mono px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] self-start xs:self-auto ${
                          isOut 
                            ? 'bg-rose-100 text-rose-800 animate-pulse' 
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {isOut ? 'OUT' : `${prod.stock}/${targetLimit}`}
                        </span>
                      </div>

                      {/* Mini Stock Visual Bar */}
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${isOut ? 'bg-rose-600' : 'bg-amber-500'}`}
                          style={{ width: `${Math.max(5, stockRatio)}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Restock Action Buttons */}
                    <div className="flex items-center gap-1 sm:gap-1.5 pt-1">
                      <button
                        onClick={() => handleSingleReorder(prod.id, 25)}
                        disabled={isReordered}
                        className={`flex-1 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          isReordered
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white shadow-2xs'
                        }`}
                        id={`btn-reorder-single-${prod.id}`}
                      >
                        {isReordered ? (
                          <>
                            <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                            <span className="hidden xs:inline">Restocked</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            <span>+25</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleSingleReorder(prod.id, 50)}
                        disabled={isReordered}
                        className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 transition-all cursor-pointer"
                        title="Restock +50 units"
                        id={`btn-reorder-50-${prod.id}`}
                      >
                        +50
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. DATA VISUALIZATION MODULE (RESPONSIVE 12-COL BENTO GRID)               */}
      {/* ========================================================================= */}
      <div className="space-y-6" id="data-visualization-module">
        
        {/* Main Row: Daily Sales Trend Line Graph + Category Revenue Donut Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          
          {/* A. RECHARTS DAILY REVENUE TRENDS LINE GRAPH (7 Cols on LG / 8 Cols on XL) */}
          <div className="lg:col-span-7 xl:col-span-8 bg-white p-4 sm:p-5 lg:p-6 rounded-2xl shadow-xs border border-slate-100 space-y-4 flex flex-col justify-between" id="sales-trend-graph-card">
            
            <div className="space-y-3">
              {/* Header & Metric Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      Daily Sales Velocity & Revenue Trends
                    </h2>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full uppercase border border-emerald-200/60 hidden sm:inline-block">
                      Telemetry
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Day-by-day growth and transaction volume computed from order ledger</p>
                </div>

                {/* Metric Toggle Buttons */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs w-full sm:w-auto" id="trend-metric-toggle">
                  <button
                    onClick={() => setChartMetric('revenue')}
                    className={`flex-1 sm:flex-none px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer text-center ${
                      chartMetric === 'revenue' 
                        ? 'bg-white text-slate-900 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    id="btn-metric-revenue"
                  >
                    Revenue ({currentCurrency.symbol})
                  </button>
                  <button
                    onClick={() => setChartMetric('orders')}
                    className={`flex-1 sm:flex-none px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer text-center ${
                      chartMetric === 'orders' 
                        ? 'bg-white text-slate-900 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    id="btn-metric-orders"
                  >
                    Orders (#)
                  </button>
                  <button
                    onClick={() => setChartMetric('avgOrder')}
                    className={`flex-1 sm:flex-none px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer text-center ${
                      chartMetric === 'avgOrder' 
                        ? 'bg-white text-slate-900 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    id="btn-metric-avg"
                  >
                    Avg Ticket
                  </button>
                </div>
              </div>

              {/* Quick KPI stats strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 bg-slate-50/80 p-2.5 sm:p-3 rounded-xl border border-slate-100 text-xs" id="trend-stats-strip">
                <div className="flex flex-col justify-between sm:justify-start items-start">
                  <span className="text-[10px] text-slate-400 uppercase font-bold truncate">Period Revenue</span>
                  <span className="font-bold text-slate-900 font-mono text-xs sm:text-base truncate">{formatAmount(trendStats.total)}</span>
                </div>
                <div className="flex flex-col justify-between sm:justify-start items-start border-l border-slate-200/60 pl-2.5 sm:pl-3">
                  <span className="text-[10px] text-slate-400 uppercase font-bold truncate">Avg Daily Sales</span>
                  <span className="font-bold text-emerald-700 font-mono text-xs sm:text-base truncate">{formatAmount(trendStats.avgDaily)}</span>
                </div>
                <div className="flex flex-col justify-between sm:justify-start items-start col-span-2 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-slate-200/60 pt-1.5 sm:pt-0 sm:pl-3">
                  <span className="text-[10px] text-slate-400 uppercase font-bold truncate">Peak Velocity Day</span>
                  <span className="font-bold text-indigo-700 font-mono text-xs sm:text-base truncate">{trendStats.peakDay.date} ({formatAmount(trendStats.peakDay.Revenue, { compact: true })})</span>
                </div>
              </div>
            </div>

            {/* Recharts Area / Line Graph Container */}
            <div className="h-[250px] sm:h-[280px] lg:h-[310px] w-full pt-2" id="line-chart-container">
              {salesTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrendData} margin={{ top: 15, right: 10, left: -15, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D97706" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#D97706" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} 
                      tickLine={false} 
                      axisLine={{ stroke: '#E2E8F0' }} 
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#94A3B8' }} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(val) => {
                        if (chartMetric === 'orders') return `${val}`;
                        return formatAmount(val, { compact: true });
                      }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0F172A', 
                        borderRadius: '12px', 
                        border: '1px solid #334155', 
                        color: '#F8FAFC',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' 
                      }}
                      labelStyle={{ fontWeight: 'bold', fontSize: '12px', color: '#CBD5E1', marginBottom: '4px' }}
                      formatter={(val: any, name: any) => [
                        name === 'Revenue' || name === 'AvgOrder' ? formatAmount(Number(val)) : `${val} orders`,
                        name === 'Revenue' ? 'Daily Revenue' : name === 'AvgOrder' ? 'Average Ticket' : 'Transactions'
                      ]}
                    />
                    
                    {chartMetric === 'revenue' && (
                      <Area 
                        type="monotone" 
                        dataKey="Revenue" 
                        stroke="#059669" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorRevenue)"
                        dot={{ r: 3.5, fill: '#059669', stroke: '#FFFFFF', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#047857', stroke: '#FFFFFF', strokeWidth: 2.5 }}
                      />
                    )}

                    {chartMetric === 'orders' && (
                      <Area 
                        type="monotone" 
                        dataKey="Orders" 
                        stroke="#4F46E5" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorOrders)"
                        dot={{ r: 3.5, fill: '#4F46E5', stroke: '#FFFFFF', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#4338CA', stroke: '#FFFFFF', strokeWidth: 2.5 }}
                      />
                    )}

                    {chartMetric === 'avgOrder' && (
                      <Area 
                        type="monotone" 
                        dataKey="AvgOrder" 
                        stroke="#D97706" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorAvg)"
                        dot={{ r: 3.5, fill: '#D97706', stroke: '#FFFFFF', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#B45309', stroke: '#FFFFFF', strokeWidth: 2.5 }}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No sales transactions logged for the selected period.
                </div>
              )}
            </div>
          </div>

          {/* B. CATEGORY-BASED REVENUE DONUT CHART (5 Cols on LG / 4 Cols on XL) */}
          <div className="lg:col-span-5 xl:col-span-4 bg-white p-4 sm:p-5 lg:p-6 rounded-2xl shadow-xs border border-slate-100 space-y-4 flex flex-col justify-between" id="category-pie-chart-card">
            
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Category Revenue Distribution
                </h2>
                <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">
                  {categoryPieData.length} Categories
                </span>
              </div>
              <p className="text-xs text-slate-400">Share of total sales revenue by product line</p>
            </div>

            {/* Recharts Pie Chart container */}
            <div className="h-[190px] sm:h-[210px] w-full" id="pie-chart-container">
              {categoryPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={78}
                      paddingAngle={3}
                      dataKey="value"
                      onMouseEnter={(_, index) => setActivePieIndex(index)}
                      onMouseLeave={() => setActivePieIndex(null)}
                    >
                      {categoryPieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={PIE_COLORS[index % PIE_COLORS.length]} 
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0F172A', 
                        borderRadius: '12px', 
                        border: '1px solid #334155', 
                        color: '#F8FAFC' 
                      }}
                      formatter={(val: any, name: any) => [
                        formatAmount(Number(val)),
                        `${name}`
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No category sales recorded yet.
                </div>
              )}
            </div>

            {/* Category breakdown item list */}
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 text-xs no-scrollbar" id="category-items-legend">
              {categoryPieData.map((cat, idx) => (
                <div 
                  key={cat.name} 
                  className={`p-2 rounded-xl border transition-all flex items-center justify-between ${
                    activePieIndex === idx ? 'bg-slate-50 border-slate-300 shadow-xs' : 'border-slate-100 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                    />
                    <span className="font-semibold text-slate-800 truncate">{cat.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-slate-400 font-mono text-[10px] hidden xs:inline">{cat.units} sold</span>
                    <span className="font-bold text-slate-900 font-mono">{formatAmount(cat.value)}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold text-[10px]">
                      {cat.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 6. SECONDARY ANALYTICS (RESPONSIVE 3-COLUMN / TABLET 2-COL / MOBILE 1-COL) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6" id="secondary-analytics-grid">
          
          {/* 1. Channel Sales Breakdown */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-100 space-y-4 flex flex-col justify-between" id="channel-performance-card">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-indigo-500" />
                  Sales Channel Split
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Omnichannel</span>
              </div>
              <p className="text-xs text-slate-400">Revenue split across POS, Web, and Mobile</p>
            </div>

            <div className="h-[180px] w-full" id="bar-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelBreakdownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} tickFormatter={(v) => formatAmount(v, { compact: true })} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#fff' }}
                    formatter={(val: any) => [formatAmount(Number(val)), 'Revenue']}
                  />
                  <Bar dataKey="Revenue" radius={[8, 8, 0, 0]}>
                    {channelBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-center">
              {channelBreakdownData.map((ch, idx) => (
                <div key={ch.name} className="p-1.5 rounded-lg bg-slate-50">
                  <span className="text-[9px] text-slate-400 font-bold block truncate">{ch.name.split(' ')[0]}</span>
                  <span className="font-bold text-slate-800 text-xs font-mono">{ch.share}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Top Moving Catalog Items */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-100 space-y-4 flex flex-col justify-between" id="top-moving-products-card">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-emerald-600" />
                  Top Moving Items
                </h3>
                <button 
                  onClick={() => onNavigateToTab('Inventory')} 
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                >
                  Catalog <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-slate-400">Ranked by unit velocity and gross volume</p>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar" id="top-products-list">
              {[...products].sort((a, b) => b.salesCount - a.salesCount).slice(0, 4).map((p, rank) => (
                <div key={p.id} className="flex items-center justify-between p-2.5 bg-slate-50/80 hover:bg-slate-100/80 rounded-xl border border-slate-100 text-xs transition-all">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center font-mono shrink-0 ${
                      rank === 0 ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-200 text-slate-700'
                    }`}>
                      #{rank + 1}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 truncate" title={p.name}>{p.name}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-900 block font-mono">{p.salesCount} sold</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">{formatAmount(p.salesCount * p.price)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center pt-1">
              <span className="text-[10px] text-slate-400 font-mono">
                Showing top 4 of {products.length} inventory items
              </span>
            </div>
          </div>

          {/* 3. Security & Operational Audit Ledger (Spans 2 cols on tablet or 1 col on desktop) */}
          <div className="md:col-span-2 lg:col-span-1 bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-100 space-y-4 flex flex-col justify-between" id="telemetry-logs-card">
            <div className="flex justify-between items-center">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-slate-900">
                  <Shield className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-bold">Operational Audit Trail</h3>
                </div>
                <p className="text-xs text-slate-400">Live immutable action feed</p>
              </div>
              <button 
                onClick={() => onNavigateToTab('Security')} 
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-all flex items-center gap-0.5 cursor-pointer"
                id="btn-goto-security"
              >
                Full Log <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar" id="log-feed-container">
              {auditLogs.slice(0, 5).map((log, index) => (
                <div key={log.id || index} className="p-2.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-start text-xs transition-all" id={`audit-log-item-${log.id}`}>
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800 truncate">{log.staffName}</span>
                      <span className="px-1.5 py-0.2 bg-slate-200/80 rounded text-[9px] text-slate-600 font-mono font-bold uppercase shrink-0">
                        {log.role}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-tight line-clamp-2">{log.details}</p>
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono text-right shrink-0">
                    <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 font-mono text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Ledger synchronized
              </span>
              <span className="font-mono text-[10px] text-slate-400">{auditLogs.length} total events</span>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 7. QUICK ACTION LAUNCHPAD (COMMAND CENTER SHORTCUT DOCK)                  */}
        {/* ========================================================================= */}
        <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md border border-slate-800" id="command-quick-dock">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 fill-current" />
                <h3 className="text-sm font-bold text-white tracking-wide uppercase">Command Quick Launch</h3>
              </div>
              <p className="text-xs text-slate-300">
                Direct access to transactional terminals, billing engines, and client databases.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto">
              <button
                onClick={() => onNavigateToTab('POS')}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                id="quick-launch-pos"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Open POS</span>
              </button>

              <button
                onClick={() => onNavigateToTab('Inventory')}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                id="quick-launch-inventory"
              >
                <Package className="w-3.5 h-3.5 text-indigo-300" />
                <span>Inventory</span>
              </button>

              <button
                onClick={() => onNavigateToTab('Invoices')}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                id="quick-launch-invoices"
              >
                <FileText className="w-3.5 h-3.5 text-amber-300" />
                <span>Invoicing</span>
              </button>

              <button
                onClick={() => onNavigateToTab('CRM')}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                id="quick-launch-crm"
              >
                <Users className="w-3.5 h-3.5 text-emerald-300" />
                <span>CRM Files</span>
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
