import React, { useState } from 'react';
import { 
  Search, Filter, RotateCcw, ChevronLeft, ChevronRight, 
  Eye, Download, AlertCircle, CheckCircle2, AlertTriangle, 
  ShieldAlert, Clock, User, Layers, RefreshCw, X
} from 'lucide-react';
import type { AuditLog, AuditFilterParams, AuditSeverity, AuditResult } from '../../types';

interface AuditEventTableProps {
  events: AuditLog[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  filters: AuditFilterParams;
  onFiltersChange: (newFilters: AuditFilterParams) => void;
  onRefresh: () => void;
  onSelectEvent: (event: AuditLog) => void;
}

const MODULE_OPTIONS = [
  'All',
  'User Management',
  'Security',
  'Settings',
  'Payments',
  'POS',
  'Inventory',
  'Billing',
  'Storefront',
];

const SEVERITY_OPTIONS = [
  { value: 'All', label: 'All Severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Informational' },
];

const RESULT_OPTIONS = [
  { value: 'All', label: 'All Outcomes' },
  { value: 'success', label: 'Success' },
  { value: 'denied', label: 'Access Denied' },
  { value: 'failed', label: 'Failed' },
];

const DATE_PRESETS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
];

export default function AuditEventTable({
  events,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  isLoading,
  onPageChange,
  onPageSizeChange,
  filters,
  onFiltersChange,
  onRefresh,
  onSelectEvent,
}: AuditEventTableProps) {
  const [selectedDatePreset, setSelectedDatePreset] = useState<string>('all');

  const handleDatePreset = (presetId: string) => {
    setSelectedDatePreset(presetId);
    const now = new Date();
    let startDate: string | undefined = undefined;
    const endDate = now.toISOString();

    if (presetId === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startDate = today.toISOString();
    } else if (presetId === '7d') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = past.toISOString();
    } else if (presetId === '30d') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = past.toISOString();
    }

    onFiltersChange({
      ...filters,
      startDate,
      endDate: presetId === 'all' ? undefined : endDate,
      page: 1,
    });
  };

  const handleResetFilters = () => {
    setSelectedDatePreset('all');
    onFiltersChange({
      search: '',
      module: 'All',
      severity: 'All',
      result: 'All',
      startDate: undefined,
      endDate: undefined,
      actor: undefined,
      target: undefined,
      page: 1,
    });
  };

  const handleExportCSV = () => {
    if (events.length === 0) return;
    const headers = ['Timestamp', 'Severity', 'Action', 'Module', 'Actor', 'Role', 'Target', 'Result', 'Details'];
    const rows = events.map(e => [
      e.timestamp,
      e.severity || 'info',
      `"${String(e.action || '').replace(/"/g, '""')}"`,
      `"${String(e.module || '').replace(/"/g, '""')}"`,
      `"${String(e.actorName || e.staffName || '').replace(/"/g, '""')}"`,
      `"${String(e.actorRole || e.role || '').replace(/"/g, '""')}"`,
      `"${String(e.targetName || e.targetStaffName || e.targetId || '').replace(/"/g, '""')}"`,
      e.result || 'success',
      `"${String(e.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tenant-audit-trail-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
      
      {/* Filters & Search Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 space-y-3.5">
        
        {/* Top Filter Bar: Search, Date Presets, Actions */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by operator, action, target, or details..."
              value={filters.search || ''}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value, page: 1 })}
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
              id="audit-search-input"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, search: '', page: 1 })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Presets and Toolbar Actions */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar shrink-0">
            {/* Date Preset Buttons */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shrink-0">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleDatePreset(preset.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedDatePreset === preset.id
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition-all cursor-pointer shrink-0"
              title="Refresh Audit Telemetry"
              id="btn-refresh-audit"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={events.length === 0}
              className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs"
              title="Export Sanitized CSV Audit Log"
              id="btn-export-audit-csv"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            {/* Reset Filters */}
            <button
              type="button"
              onClick={handleResetFilters}
              className="p-2 bg-white hover:bg-rose-50 hover:text-rose-600 border border-slate-200 text-slate-500 rounded-xl transition-all cursor-pointer shrink-0"
              title="Reset all filters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Secondary Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Module Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Subsystem Module
            </label>
            <select
              value={filters.module || 'All'}
              onChange={(e) => onFiltersChange({ ...filters, module: e.target.value, page: 1 })}
              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
              id="audit-filter-module"
            >
              {MODULE_OPTIONS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Security Severity Level
            </label>
            <select
              value={filters.severity || 'All'}
              onChange={(e) => onFiltersChange({ ...filters, severity: e.target.value, page: 1 })}
              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
              id="audit-filter-severity"
            >
              {SEVERITY_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Result Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Execution Outcome
            </label>
            <select
              value={filters.result || 'All'}
              onChange={(e) => onFiltersChange({ ...filters, result: e.target.value, page: 1 })}
              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
              id="audit-filter-result"
            >
              {RESULT_OPTIONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* Main Table View */}
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 select-none">
              <th className="py-3 px-4 w-32">Timestamp</th>
              <th className="py-3 px-3 w-24">Severity</th>
              <th className="py-3 px-3 min-w-[140px]">Action</th>
              <th className="py-3 px-3 w-28">Module</th>
              <th className="py-3 px-3 min-w-[150px]">Operator</th>
              <th className="py-3 px-3 min-w-[130px]">Target</th>
              <th className="py-3 px-3 w-24">Result</th>
              <th className="py-3 px-4 min-w-[200px]">Details</th>
              <th className="py-3 px-3 w-16 text-right">Inspect</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                    <span className="text-xs font-semibold text-slate-500">Querying authoritative ledger...</span>
                  </div>
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                    <div className="p-3 bg-slate-100 text-slate-400 rounded-2xl">
                      <ShieldAlert className="w-8 h-8" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">No matching audit events found</span>
                    <p className="text-xs text-slate-500">
                      No security or operational records match your selected filters. Try broadening your date range or clearing filters.
                    </p>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-2 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-800"
                    >
                      Clear All Filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              events.map((event) => {
                const severity = event.severity || 'info';
                const result = event.result || 'success';

                return (
                  <tr
                    key={event.id}
                    onClick={() => onSelectEvent(event)}
                    className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                    id={`audit-row-${event.id}`}
                  >
                    {/* Timestamp */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600">
                      <div className="font-bold text-slate-900">
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(event.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </td>

                    {/* Severity */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase inline-flex items-center gap-1 border ${
                        severity === 'critical'
                          ? 'bg-rose-50 text-rose-700 border-rose-200 font-extrabold'
                          : severity === 'warning'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          severity === 'critical' ? 'bg-rose-600 animate-ping' : severity === 'warning' ? 'bg-amber-500' : 'bg-slate-400'
                        }`} />
                        {severity}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 text-xs block group-hover:text-indigo-600 transition-colors">
                        {event.action}
                      </span>
                    </td>

                    {/* Module */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold font-mono">
                        {event.module}
                      </span>
                    </td>

                    {/* Operator */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 text-xs truncate max-w-[140px]">
                        {event.actorName || event.staffName}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[140px]">
                        {event.actorRole || event.role}
                      </span>
                    </td>

                    {/* Target */}
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800 text-xs truncate block max-w-[120px]">
                        {event.targetName || event.targetStaffName || event.targetId || 'N/A'}
                      </span>
                      {event.targetType && (
                        <span className="text-[9px] text-slate-400 uppercase font-mono block">
                          {event.targetType}
                        </span>
                      )}
                    </td>

                    {/* Result */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                        result === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : result === 'denied'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300 font-extrabold'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {result === 'success' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                        )}
                        <span>{result}</span>
                      </span>
                    </td>

                    {/* Details Snippet */}
                    <td className="py-3 px-4">
                      <p className="text-slate-600 text-[11px] line-clamp-1 leading-normal max-w-sm">
                        {event.details}
                      </p>
                    </td>

                    {/* Action Button */}
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(event);
                        }}
                        className="p-1.5 text-slate-400 group-hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-all cursor-pointer"
                        title="View Full Event Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        
        {/* Page Size & Record Counts */}
        <div className="flex items-center gap-3 text-slate-500">
          <span>
            Showing <strong className="text-slate-900">{events.length}</strong> of <strong className="text-slate-900">{totalCount}</strong> events
          </span>

          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Pagination Navigation */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={currentPage <= 1 || isLoading}
            onClick={() => onPageChange(currentPage - 1)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 cursor-pointer"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3 py-1 font-mono text-xs font-bold text-slate-800">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages || isLoading}
            onClick={() => onPageChange(currentPage + 1)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 cursor-pointer"
            aria-label="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
}
