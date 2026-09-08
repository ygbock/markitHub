import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  CreditCard,
  Package,
  Search,
  ShoppingBag,
  XCircle,
} from 'lucide-react';

import {
  CustomerAccountOrder,
  AccountOrderCard,
} from './AccountOrderCard';

import {
  ECommerceOrderStatus,
} from '../../../types';

// ============================================================================
// TYPES
// ============================================================================

export type OrderStatusFilter =
  | ECommerceOrderStatus
  | 'All';

export type OrderSort =
  | 'newest'
  | 'oldest'
  | 'highest'
  | 'lowest';

export interface AccountOrdersTabProps {
  orders: CustomerAccountOrder[];

  onTrackOrder: (
    order: CustomerAccountOrder
  ) => void;

  onViewOrderDetails: (
    order: CustomerAccountOrder
  ) => void;

  onPayOrder?: (
    order: CustomerAccountOrder
  ) => void;

  onExploreCatalog?: () => void;
}

// ============================================================================
// ORDER STATUS CONFIGURATION
// ============================================================================
//
// Aligned with ECommerceOrderStatus from ../../../types.
// ============================================================================

export const ALL_ORDER_STATUSES: OrderStatusFilter[] = [
  'All',
  'Pending Payment',
  'Paid',
  'Processing',
  'Ready for Pickup',
  'Packed',
  'Dispatched',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
  'Returned',
  'Refunded',
];

// ============================================================================
// SORT OPTIONS
// ============================================================================

const SORT_OPTIONS: {
  value: OrderSort;
  label: string;
}[] = [
  {
    value: 'newest',
    label: 'Newest First',
  },
  {
    value: 'oldest',
    label: 'Oldest First',
  },
  {
    value: 'highest',
    label: 'Highest Amount',
  },
  {
    value: 'lowest',
    label: 'Lowest Amount',
  },
];

// ============================================================================
// HELPERS
// ============================================================================

function normalizeText(
  value: unknown
): string {
  if (
    typeof value !== 'string'
  ) {
    return '';
  }

  return value
    .trim()
    .toLowerCase();
}

function normalizeStatus(
  value: unknown
): string {
  return normalizeText(value);
}

function getOrderAmount(
  order: CustomerAccountOrder
): number {
  const grandTotal =
    Number(order.grandTotal);

  if (
    Number.isFinite(grandTotal)
  ) {
    return grandTotal;
  }

  const total =
    Number(order.total);

  if (
    Number.isFinite(total)
  ) {
    return total;
  }

  return 0;
}

function getOrderTimestamp(
  order: CustomerAccountOrder
): number {
  const timestamp =
    new Date(
      order.date
    ).getTime();

  return Number.isFinite(timestamp)
    ? timestamp
    : 0;
}

function getOrderKey(
  order: CustomerAccountOrder
): string {
  return (
    String(order.id || '').trim() ||
    String(order.orderNumber || '').trim() ||
    `order-${getOrderTimestamp(order)}`
  );
}

function orderMatchesSearch(
  order: CustomerAccountOrder,
  query: string
): boolean {
  if (!query) {
    return true;
  }

  const orderNumber =
    normalizeText(
      order.orderNumber
    );

  const trackingNumber =
    normalizeText(
      order.trackingNumber
    );

  if (
    orderNumber.includes(query) ||
    trackingNumber.includes(query)
  ) {
    return true;
  }

  const items =
    Array.isArray(order.items)
      ? order.items
      : [];

  return items.some(
    (item) => {
      const productName =
        normalizeText(
          item?.productName
        );

      const variantSku =
        normalizeText(
          item?.variantSku
        );

      return (
        productName.includes(
          query
        ) ||
        variantSku.includes(
          query
        )
      );
    }
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AccountOrdersTab: React.FC<AccountOrdersTabProps> = ({
  orders,
  onTrackOrder,
  onViewOrderDetails,
  onPayOrder,
  onExploreCatalog,
}) => {
  // --------------------------------------------------------------------------
  // State
  // --------------------------------------------------------------------------

  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState<OrderStatusFilter>(
    'All'
  );

  const [
    searchQuery,
    setSearchQuery,
  ] = useState('');

  const [
    sortBy,
    setSortBy,
  ] = useState<OrderSort>(
    'newest'
  );

  // --------------------------------------------------------------------------
  // Normalized search query
  // --------------------------------------------------------------------------

  const normalizedSearchQuery =
    useMemo(
      () =>
        normalizeText(
          searchQuery
        ),
      [searchQuery]
    );

  // --------------------------------------------------------------------------
  // Status counts - single pass
  // --------------------------------------------------------------------------

  const statusCounts =
    useMemo(() => {
      const counts: Record<string, number> = {
        All: orders.length,
      };

      for (const status of ALL_ORDER_STATUSES) {
        if (status !== 'All') {
          counts[status] = 0;
        }
      }

      for (const order of orders) {
        const normalized =
          normalizeStatus(
            order.status
          );

        const matchingStatus =
          ALL_ORDER_STATUSES.find(
            (status) =>
              status !== 'All' &&
              normalizeStatus(
                status
              ) === normalized
          );

        if (matchingStatus) {
          counts[matchingStatus] += 1;
        }
      }

      return counts;
    }, [orders]);

  // --------------------------------------------------------------------------
  // Pending count
  // --------------------------------------------------------------------------

  const pendingCount =
    statusCounts['Pending Payment'] || 0;

  // --------------------------------------------------------------------------
  // Filter + sort
  // --------------------------------------------------------------------------

  const filteredOrders =
    useMemo(() => {
      const result =
        orders.filter(
          (order) => {
            // Status
            if (selectedStatus !== 'All') {
              const currentStatus =
                normalizeStatus(
                  order.status
                );

              const expectedStatus =
                normalizeStatus(
                  selectedStatus
                );

              if (currentStatus !== expectedStatus) {
                return false;
              }
            }

            // Search
            if (
              !orderMatchesSearch(
                order,
                normalizedSearchQuery
              )
            ) {
              return false;
            }

            return true;
          }
        );

      // Sorting
      return result
        .slice()
        .sort(
          (a, b) => {
            switch (sortBy) {
              case 'newest':
                return (
                  getOrderTimestamp(b) -
                  getOrderTimestamp(a)
                );

              case 'oldest':
                return (
                  getOrderTimestamp(a) -
                  getOrderTimestamp(b)
                );

              case 'highest':
                return (
                  getOrderAmount(b) -
                  getOrderAmount(a)
                );

              case 'lowest':
                return (
                  getOrderAmount(a) -
                  getOrderAmount(b)
                );

              default:
                return 0;
            }
          }
        );
    }, [
      orders,
      selectedStatus,
      normalizedSearchQuery,
      sortBy,
    ]);

  // --------------------------------------------------------------------------
  // Has active filters
  // --------------------------------------------------------------------------

  const hasActiveFilters =
    selectedStatus !== 'All' ||
    normalizedSearchQuery.length > 0;

  // --------------------------------------------------------------------------
  // Clear filters
  // --------------------------------------------------------------------------

  const clearFilters =
    useCallback(() => {
      setSelectedStatus('All');
      setSearchQuery('');
    }, []);

  // --------------------------------------------------------------------------
  // Search input handler
  // --------------------------------------------------------------------------

  const handleSearchChange =
    useCallback(
      (
        event: React.ChangeEvent<HTMLInputElement>
      ) => {
        setSearchQuery(
          event.target.value
        );
      },
      []
    );

  // --------------------------------------------------------------------------
  // Sort handler
  // --------------------------------------------------------------------------

  const handleSortChange =
    useCallback(
      (
        event: React.ChangeEvent<HTMLSelectElement>
      ) => {
        const value = event.target.value;
        const validOption =
          SORT_OPTIONS.find(
            (option) =>
              option.value === value
          );

        if (validOption) {
          setSortBy(validOption.value);
        }
      },
      []
    );

  // --------------------------------------------------------------------------
  // Quick pay handler
  // --------------------------------------------------------------------------

  const handlePayFirstOrder =
    useCallback(() => {
      if (!onPayOrder || filteredOrders.length === 0) {
        return;
      }
      onPayOrder(filteredOrders[0]);
    }, [filteredOrders, onPayOrder]);

  return (
    <div
      className="space-y-4 sm:space-y-5 animate-in fade-in duration-150"
      id="account-tab-orders"
    >
      {/* HEADER & CONTROLS */}
      <section
        className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs"
        aria-labelledby="account-orders-title"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Title */}
          <div className="min-w-0">
            <h2
              id="account-orders-title"
              className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2"
            >
              <Package
                className="w-5 h-5 text-indigo-600 shrink-0"
                aria-hidden="true"
              />
              <span>Order History</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Track real-time shipment status, complete pending payments, and view itemized receipts.
            </p>
          </div>

          {/* Search and Sort */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <label
                htmlFor="account-orders-search"
                className="sr-only"
              >
                Search orders
              </label>
              <input
                id="account-orders-search"
                type="search"
                placeholder="Search order #, item, SKU..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-9 pr-9 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear order search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 rounded-md p-1 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
                >
                  <XCircle
                    className="w-3.5 h-3.5"
                    aria-hidden="true"
                  />
                </button>
              )}
            </div>

            {/* Sort */}
            <label
              htmlFor="account-orders-sort"
              className="sr-only"
            >
              Sort orders
            </label>
            <select
              id="account-orders-sort"
              value={sortBy}
              onChange={handleSortChange}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shrink-0"
            >
              {SORT_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Result Summary Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-500">
            Showing <strong className="text-slate-700">{filteredOrders.length}</strong> of{' '}
            <strong className="text-slate-700">{orders.length}</strong> orders
          </p>

          {pendingCount > 0 && (
            <button
              type="button"
              onClick={() => setSelectedStatus('Pending Payment')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <CreditCard
                className="w-3 h-3"
                aria-hidden="true"
              />
              {pendingCount} pending payment{pendingCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </section>

      {/* STATUS FILTERS */}
      <section
        aria-label="Order status filters"
        className="overflow-x-auto pb-1.5 no-scrollbar -mx-1 px-1"
      >
        <div
          className="flex items-center gap-1.5 min-w-max"
          role="group"
          aria-label="Filter orders by status"
        >
          {ALL_ORDER_STATUSES.map((status) => {
            const isSelected = selectedStatus === status;
            const count = statusCounts[status] || 0;
            const isPending = status === 'Pending Payment';
            const filterId = `status-filter-${normalizeText(status).replace(/\s+/g, '-')}`;

            return (
              <button
                key={status}
                id={filterId}
                type="button"
                onClick={() => setSelectedStatus(status)}
                aria-pressed={isSelected}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap border ${
                  isSelected
                    ? isPending
                      ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs ring-2 ring-amber-500/20'
                      : 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-600/20'
                    : isPending && count > 0
                      ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                      : 'bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{status}</span>
                <span
                  aria-label={`${count} orders`}
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                    isSelected
                      ? isPending
                        ? 'bg-black/20 text-slate-950'
                        : 'bg-white/20 text-white'
                      : isPending && count > 0
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* PENDING PAYMENT BANNER */}
      {selectedStatus === 'Pending Payment' && (
        <section
          className="bg-amber-50 border border-amber-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 shadow-2xs animate-in fade-in"
          aria-labelledby="pending-payment-title"
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
              <CreditCard
                className="w-5 h-5"
                aria-hidden="true"
              />
            </div>

            <div className="min-w-0">
              <h4
                id="pending-payment-title"
                className="text-sm font-bold"
              >
                Pending Payment Orders ({filteredOrders.length})
              </h4>
              <p className="text-xs text-amber-800/90 mt-0.5 max-w-xl leading-relaxed">
                Orders listed below require payment authorization to reserve warehouse inventory and initiate courier dispatch. You can complete checkout via <strong>Orange Money</strong>, <strong>Afrimoney</strong>, <strong>Debit/Credit Card</strong>, or <strong>Direct Bank Wire</strong>.
              </p>
            </div>
          </div>

          {filteredOrders.length > 0 && onPayOrder && (
            <button
              type="button"
              onClick={handlePayFirstOrder}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
            >
              <span>
                Pay Order #{filteredOrders[0]?.orderNumber || filteredOrders[0]?.id || '—'}
              </span>
            </button>
          )}
        </section>
      )}

      {/* ORDER RESULTS */}
      {filteredOrders.length > 0 ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4"
          aria-live="polite"
        >
          {filteredOrders.map((order) => (
            <AccountOrderCard
              key={getOrderKey(order)}
              order={order}
              onTrackOrder={onTrackOrder}
              onViewDetails={onViewOrderDetails}
              onPayOrder={onPayOrder}
            />
          ))}
        </div>
      ) : (
        /* EMPTY STATE */
        <section
          className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200/90 shadow-2xs space-y-4"
          aria-live="polite"
        >
          <div className="w-14 h-14 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Package
              className="w-7 h-7"
              aria-hidden="true"
            />
          </div>

          <div className="max-w-sm mx-auto">
            <h3 className="text-base font-bold text-slate-900">
              {hasActiveFilters
                ? 'No matching orders found'
                : 'No orders in your history yet'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {hasActiveFilters
                ? `No orders match your current filters${
                    selectedStatus !== 'All'
                      ? ` for "${selectedStatus}"`
                      : ''
                  }${
                    searchQuery.trim()
                      ? ` or search "${searchQuery.trim()}"`
                      : ''
                  }. Try clearing the filters.`
                : 'Browse our extensive catalog of electronics, smartphones, footwear, and essentials.'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Clear Filter Options
              </button>
            ) : onExploreCatalog ? (
              <button
                type="button"
                onClick={onExploreCatalog}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ShoppingBag
                  className="w-4 h-4"
                  aria-hidden="true"
                />
                <span>Start Shopping</span>
              </button>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
};

export default AccountOrdersTab;
