import { 
  Product, 
  Order, 
  StockMovementRecord, 
  StockAdjustmentRecord, 
  InventoryBatch,
  ReportDatePreset 
} from '../types';

// Helper: Filter records by Date Preset
export function filterOrdersByDate(
  orders: Order[],
  preset: ReportDatePreset,
  customStart?: string,
  customEnd?: string
): Order[] {
  if (preset === 'all_time') return orders;

  const now = new Date('2026-08-17T12:00:00-07:00'); // Consistent reference date
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  return orders.filter(order => {
    const orderTime = new Date(order.date).getTime();

    switch (preset) {
      case 'today':
        return orderTime >= startOfDay;
      case 'yesterday': {
        const yesterdayStart = startOfDay - 24 * 60 * 60 * 1000;
        return orderTime >= yesterdayStart && orderTime < startOfDay;
      }
      case 'last_7_days':
        return orderTime >= now.getTime() - 7 * 24 * 60 * 60 * 1000;
      case 'last_30_days':
        return orderTime >= now.getTime() - 30 * 24 * 60 * 60 * 1000;
      case 'this_month': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        return orderTime >= monthStart;
      }
      case 'last_month': {
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        return orderTime >= lastMonthStart && orderTime < lastMonthEnd;
      }
      case 'this_quarter': {
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        const quarterStart = new Date(now.getFullYear(), quarterMonth, 1).getTime();
        return orderTime >= quarterStart;
      }
      case 'year_to_date': {
        const ytdStart = new Date(now.getFullYear(), 0, 1).getTime();
        return orderTime >= ytdStart;
      }
      case 'custom': {
        if (!customStart && !customEnd) return true;
        const start = customStart ? new Date(customStart).getTime() : 0;
        const end = customEnd ? new Date(customEnd + 'T23:59:59').getTime() : Infinity;
        return orderTime >= start && orderTime <= end;
      }
      default:
        return true;
    }
  });
}

export const filterOrdersByDateRange = filterOrdersByDate;

// Export array of tabular data to a formatted CSV file
export function exportToCSV(filename: string, rows: (Record<string, any> | (string | number)[])[], headers?: (string | { key: string; label: string })[]) {
  if (!rows || !rows.length) {
    alert('No data available to export.');
    return;
  }

  let headerLine = '';
  let dataLines: string[] = [];

  const isArrayOfArrays = Array.isArray(rows[0]);

  if (isArrayOfArrays) {
    const rawHeaders = headers as string[] || [];
    headerLine = rawHeaders.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',');
    dataLines = (rows as (string | number)[][]).map(row => {
      return row.map(val => {
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });
  } else {
    const columnHeaders = (headers as { key: string; label: string }[]) || 
      Object.keys(rows[0] as Record<string, any>).map(key => ({ key, label: key }));
    
    headerLine = columnHeaders.map(h => `"${(typeof h === 'string' ? h : h.label).replace(/"/g, '""')}"`).join(',');
    
    dataLines = (rows as Record<string, any>[]).map(row => {
      return columnHeaders.map(h => {
        const key = typeof h === 'string' ? h : h.key;
        let val = row[key];
        if (val === null || val === undefined) val = '';
        if (typeof val === 'number') {
          val = Number.isInteger(val) ? val.toString() : val.toFixed(2);
        }
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });
  }

  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headerLine, ...dataLines].join('\r\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export const exportToCsv = (filename: string, headers: any, rows: any) => {
  if (Array.isArray(headers) && Array.isArray(rows)) {
    exportToCSV(filename, rows, headers);
  } else {
    exportToCSV(filename, headers, rows);
  }
};

// ----------------------------------------------------------------------
// Aggregated Calculations
// ----------------------------------------------------------------------

export interface InventoryValuationMetrics {
  totalSkus: number;
  totalUnitsInStock: number;
  totalCostValuation: number;
  totalRetailValuation: number;
  unrealizedProfit: number;
  unrealizedMarginPercent: number;
  byCategory: {
    category: string;
    itemCount: number;
    totalStock: number;
    costValue: number;
    retailValue: number;
    marginPercent: number;
  }[];
  byLocation: {
    location: string;
    itemCount: number;
    totalStock: number;
    costValue: number;
    retailValue: number;
  }[];
}

export function calculateStockValuation(products: Product[]): InventoryValuationMetrics {
  let totalSkus = products.length;
  let totalUnitsInStock = 0;
  let totalCostValuation = 0;
  let totalRetailValuation = 0;

  const categoryMap: Record<string, { itemCount: number; totalStock: number; costValue: number; retailValue: number }> = {};
  const locationMap: Record<string, { itemCount: number; totalStock: number; costValue: number; retailValue: number }> = {};

  products.forEach(p => {
    const cost = p.cost || 0;
    const price = p.price || 0;
    const stock = p.stock || 0;

    totalUnitsInStock += stock;
    const itemCostVal = cost * stock;
    const itemRetailVal = price * stock;

    totalCostValuation += itemCostVal;
    totalRetailValuation += itemRetailVal;

    // Category grouping
    const cat = p.category || 'Uncategorized';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { itemCount: 0, totalStock: 0, costValue: 0, retailValue: 0 };
    }
    categoryMap[cat].itemCount += 1;
    categoryMap[cat].totalStock += stock;
    categoryMap[cat].costValue += itemCostVal;
    categoryMap[cat].retailValue += itemRetailVal;

    // Location grouping
    const loc = p.location || 'Store Shelf';
    if (!locationMap[loc]) {
      locationMap[loc] = { itemCount: 0, totalStock: 0, costValue: 0, retailValue: 0 };
    }
    locationMap[loc].itemCount += 1;
    locationMap[loc].totalStock += stock;
    locationMap[loc].costValue += itemCostVal;
    locationMap[loc].retailValue += itemRetailVal;
  });

  const unrealizedProfit = totalRetailValuation - totalCostValuation;
  const unrealizedMarginPercent = totalRetailValuation > 0 ? (unrealizedProfit / totalRetailValuation) * 100 : 0;

  const byCategory = Object.entries(categoryMap).map(([category, val]) => ({
    category,
    ...val,
    marginPercent: val.retailValue > 0 ? ((val.retailValue - val.costValue) / val.retailValue) * 100 : 0
  })).sort((a, b) => b.retailValue - a.retailValue);

  const byLocation = Object.entries(locationMap).map(([location, val]) => ({
    location,
    ...val
  })).sort((a, b) => b.retailValue - a.retailValue);

  return {
    totalSkus,
    totalUnitsInStock,
    totalCostValuation,
    totalRetailValuation,
    unrealizedProfit,
    unrealizedMarginPercent,
    byCategory,
    byLocation
  };
}

export interface FinancialSummaryMetrics {
  grossRevenue: number;
  discountsTotal: number;
  netRevenue: number;
  cogsTotal: number;
  grossProfit: number;
  grossMarginPercent: number;
  taxTotal: number;
  refundsTotal: number;
  refundCount: number;
  outstandingTotal: number;
  outstandingCount: number;
  totalOrdersCount: number;
  completedOrdersCount: number;
  averageOrderValue: number;
}

export function calculateFinancialSummary(orders: Order[]): FinancialSummaryMetrics {
  let grossRevenue = 0;
  let discountsTotal = 0;
  let netRevenue = 0;
  let cogsTotal = 0;
  let taxTotal = 0;
  let refundsTotal = 0;
  let refundCount = 0;
  let outstandingTotal = 0;
  let outstandingCount = 0;
  let completedOrdersCount = 0;

  orders.forEach(o => {
    if (o.status === 'Refunded') {
      refundsTotal += o.refundAmount || o.total || 0;
      refundCount += 1;
      return; // Exclude full refund from gross revenue
    }

    if (o.status === 'Outstanding') {
      outstandingTotal += o.outstandingBalance || o.total || 0;
      outstandingCount += 1;
    }

    grossRevenue += (o.subtotal || 0) + (o.discount || 0);
    discountsTotal += o.discount || 0;
    netRevenue += (o.subtotal || 0);
    taxTotal += o.tax || 0;

    // COGS estimation
    if (o.cogs) {
      cogsTotal += o.cogs;
    } else if (o.items && o.items.length) {
      const orderCogs = o.items.reduce((sum, item) => sum + ((item.cost || item.price * 0.45) * item.quantity), 0);
      cogsTotal += orderCogs;
    } else {
      cogsTotal += (o.subtotal || 0) * 0.45;
    }

    if (o.status === 'Completed') {
      completedOrdersCount += 1;
    }
  });

  const grossProfit = netRevenue - cogsTotal;
  const grossMarginPercent = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
  const averageOrderValue = (completedOrdersCount + outstandingCount) > 0 
    ? (netRevenue + taxTotal) / (completedOrdersCount + outstandingCount) 
    : 0;

  return {
    grossRevenue,
    discountsTotal,
    netRevenue,
    cogsTotal,
    grossProfit,
    grossMarginPercent,
    taxTotal,
    refundsTotal,
    refundCount,
    outstandingTotal,
    outstandingCount,
    totalOrdersCount: orders.length,
    completedOrdersCount,
    averageOrderValue
  };
}
