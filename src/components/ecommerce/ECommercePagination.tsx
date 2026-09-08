// ============================================================
// FILE: src/components/ecommerce/ECommercePagination.tsx
// PURPOSE:
//   High-Performance Pagination & Infinite Scroll Controls:
//   - Strictly supports 20–40 products/page (20, 24, 32, 40)
//   - Numbered pagination with smart ellipsis windowing
//   - Quick page jump input
//   - Infinite scroll / Load more toggle
//   - Visual render latency and DOM efficiency indicators
// ============================================================

import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Layers, 
  Zap, 
  Sliders, 
  ArrowDownCircle,
  Check
} from 'lucide-react';

export interface ECommercePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number; // 20, 24, 32, 40
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  displayMode: 'paginated' | 'infinite';
  onDisplayModeChange: (mode: 'paginated' | 'infinite') => void;
  onLoadMore?: () => void;
  hasMoreToLoad?: boolean;
  isLoadingMore?: boolean;
  renderTimeMs?: number;
}

export default function ECommercePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  displayMode,
  onDisplayModeChange,
  onLoadMore,
  hasMoreToLoad = false,
  isLoadingMore = false,
  renderTimeMs = 1.2
}: ECommercePaginationProps) {
  const [jumpPageInput, setJumpPageInput] = useState('');

  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate numbered page pills with smart windowing
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      if (start > 2) pages.push('...');

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) pages.push('...');

      pages.push(totalPages);
    }

    return pages;
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(jumpPageInput, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      onPageChange(target);
      setJumpPageInput('');
    }
  };

  return (
    <div className="mt-8 pt-6 border-t border-slate-200/80 flex flex-col gap-5" id="ecommerce-pagination-container">
      {/* Top Bar: Summary, Mode Selector, Page Size Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Item Range & DOM Efficiency Metrics */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs sm:text-sm font-semibold text-slate-700">
            Showing <strong className="text-slate-900 font-bold">{startItem}–{endItem}</strong> of <strong className="text-slate-900 font-bold">{totalItems}</strong> products
          </span>

          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-bold border border-emerald-200/60 shadow-2xs">
            <Zap className="w-3 h-3 text-emerald-600" />
            <span>{renderTimeMs}ms render</span>
          </div>

          <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[11px] font-bold border border-indigo-200/60 shadow-2xs">
            <Layers className="w-3 h-3 text-indigo-600" />
            <span>{pageSize} items / page</span>
          </div>

          
        </div>

        {/* Right Controls: Mode Toggle & Page Size dropdown (20, 24, 32, 40) */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Mode Switcher */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => onDisplayModeChange('paginated')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                displayMode === 'paginated'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Pages
            </button>
            <button
              type="button"
              onClick={() => onDisplayModeChange('infinite')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                displayMode === 'infinite'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Infinite Scroll
            </button>
          </div>

          {/* Page Size Selector (20–40 range strictly enforced) */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <label htmlFor="plp-page-size" className="hidden sm:inline">Per page:</label>
            <select
              id="plp-page-size"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
            >
              <option value={20}>20 / page</option>
              <option value={24}>24 / page (Default)</option>
              <option value={32}>32 / page</option>
              <option value={40}>40 / page (Max)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mode 1: Infinite Scroll / Load More View */}
      {displayMode === 'infinite' ? (
        <div className="flex flex-col items-center justify-center py-4 space-y-3">
          {hasMoreToLoad ? (
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isLoadingMore ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  <span>Loading more items...</span>
                </>
              ) : (
                <>
                  <ArrowDownCircle className="w-4 h-4" />
                  <span>Load More Products ({totalItems - endItem} remaining)</span>
                </>
              )}
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-600 rounded-full text-xs font-bold border border-slate-200">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>You have reached the end of all {totalItems} products</span>
            </div>
          )}
          <p className="text-[11px] text-slate-400 text-center">
            Optimized DOM footprint: loading incrementally in {pageSize}-item batches with CDN lazy-loading.
          </p>
        </div>
      ) : (
        /* Mode 2: Standard Numbered Pagination Bar */
        totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            {/* Numbered Page Buttons */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              {/* First Page */}
              <button
                type="button"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="p-2 sm:px-2.5 sm:py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-bold cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Previous Page */}
              <button
                type="button"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              {/* Page Number Pills */}
              {getPageNumbers().map((p, idx) => {
                if (typeof p === 'string') {
                  return (
                    <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-400 text-xs font-bold select-none">
                      ...
                    </span>
                  );
                }

                const isActive = p === currentPage;
                return (
                  <button
                    key={`page-${p}`}
                    type="button"
                    onClick={() => onPageChange(p)}
                    className={`min-w-[36px] h-9 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs font-black'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              {/* Next Page */}
              <button
                type="button"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                title="Next Page"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Last Page */}
              <button
                type="button"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 sm:px-2.5 sm:py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-bold cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>

            {/* Jump to page form */}
            <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5 text-xs text-slate-600">
              <label htmlFor="jump-to-page" className="text-slate-500 font-medium">Jump to:</label>
              <input
                id="jump-to-page"
                type="number"
                min={1}
                max={totalPages}
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                placeholder={`1-${totalPages}`}
                className="w-16 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-center shadow-2xs"
              />
              <button
                type="submit"
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Go
              </button>
            </form>
          </div>
        )
      )}
    </div>
  );
}
