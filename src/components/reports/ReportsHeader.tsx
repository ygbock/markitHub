import React from 'react';
import { 
  Calendar, Building2, Download, Printer, Filter, 
  Sparkles, RefreshCw, BarChart2, TrendingUp, Layers, ChevronRight
} from 'lucide-react';
import { ReportDatePreset, BranchLocation, StaffMember } from '../../types';
import { useCurrency } from '../../context/CurrencyContext';

interface ReportsHeaderProps {
  activeCategory: 'inventory' | 'sales' | 'financial';
  datePreset: ReportDatePreset;
  onDatePresetChange: (preset: ReportDatePreset) => void;
  customStartDate: string;
  onCustomStartDateChange: (date: string) => void;
  customEndDate: string;
  onCustomEndDateChange: (date: string) => void;
  selectedBranchId: string;
  onSelectBranchId: (branchId: string) => void;
  branches: BranchLocation[];
  onExportCSV: () => void;
  onOpenExecutiveModal: () => void;
  activeStaff: StaffMember;
}

export default function ReportsHeader({
  activeCategory,
  datePreset,
  onDatePresetChange,
  customStartDate,
  onCustomStartDateChange,
  customEndDate,
  onCustomEndDateChange,
  selectedBranchId,
  onSelectBranchId,
  branches,
  onExportCSV,
  onOpenExecutiveModal,
  activeStaff
}: ReportsHeaderProps) {
  const { currentCurrency } = useCurrency();

  const presets: { id: ReportDatePreset; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'last_7_days', label: 'Last 7D' },
    { id: 'last_30_days', label: 'Last 30D' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'this_quarter', label: 'This Quarter' },
    { id: 'year_to_date', label: 'YTD' },
    { id: 'all_time', label: 'All Time' },
    { id: 'custom', label: 'Custom' }
  ];

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 lg:p-6 border border-slate-200/80 shadow-xs space-y-3.5 sm:space-y-4" id="reports-analytics-header">
      
      {/* 1. Title & Global Action Bar (Responsive Flex / Wrap) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        
        {/* Title & Badge */}
        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
            <BarChart2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl lg:text-2xl font-black text-slate-900 tracking-tight">
                Reports & Analytics
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 whitespace-nowrap">
                27 BI Modules
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 line-clamp-1 sm:line-clamp-none">
              Multi-channel telemetry, inventory velocity, audited ledgers & financial health
            </p>
          </div>
        </div>

        {/* Global Export & Print Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
          <button
            type="button"
            onClick={onOpenExecutiveModal}
            className="flex-1 sm:flex-initial min-h-[38px] sm:min-h-[40px] px-3 sm:px-4 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 shadow-xs cursor-pointer select-none"
            id="open-executive-summary-btn"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">Executive Brief</span>
          </button>

          <button
            type="button"
            onClick={onExportCSV}
            className="flex-1 sm:flex-initial min-h-[38px] sm:min-h-[40px] px-3 sm:px-4 py-2 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer select-none"
            id="export-active-report-csv-btn"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Ribbon: Period/Monthly & Location Dropdowns Aligned in One Row */}
      <div className="pt-3.5 border-t border-slate-100 space-y-2.5">
        <div className="grid grid-cols-2 lg:flex lg:items-center gap-2 sm:gap-3 text-xs">
          
          {/* Period / Monthly Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 sm:px-3 py-2 flex-1 min-h-[40px] min-w-0">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0 hidden xs:block" />
            <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider shrink-0 hidden md:inline">Period:</span>
            <select
              value={datePreset}
              onChange={(e) => onDatePresetChange(e.target.value as ReportDatePreset)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer w-full truncate"
              id="report-period-select"
            >
              {presets.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Location / Scope Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 sm:px-3 py-2 flex-1 min-h-[40px] min-w-0">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0 hidden xs:block" />
            <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider shrink-0 hidden md:inline">Location:</span>
            <select
              value={selectedBranchId}
              onChange={(e) => onSelectBranchId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer w-full truncate"
              id="report-branch-select"
            >
              <option value="all">All Locations</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Currency Indicator */}
          <div className="hidden lg:flex px-3 py-2 bg-slate-100 rounded-xl text-xs font-mono font-bold text-slate-700 shrink-0 min-h-[40px] items-center justify-center">
            {currentCurrency.flag} {currentCurrency.code}
          </div>

        </div>

        {/* Custom Date Range Picker (Shown when Period is 'Custom') */}
        {datePreset === 'custom' && (
          <div className="flex items-center gap-2 bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-2.5 text-xs animate-in fade-in duration-150 flex-wrap sm:flex-nowrap">
            <span className="font-bold text-indigo-900 text-[11px] shrink-0">Custom Range:</span>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-slate-500 text-[11px] shrink-0">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => onCustomStartDateChange(e.target.value)}
                className="bg-white border border-indigo-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-auto"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-slate-500 text-[11px] shrink-0">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => onCustomEndDateChange(e.target.value)}
                className="bg-white border border-indigo-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-auto"
              />
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
