import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  Barcode,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Edit2,
  Eye,
  FileText,
  Filter,
  FolderTree,
  LayoutGrid,
  List,
  MapPin,
  Package,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Tag,
  Trash,
  Truck,
  Upload,
  X,
} from 'lucide-react';

import { Product, StaffMember, Category } from '../types';
import { hasPermission } from '../utils/permissions';
import BarcodeGeneratorModal from './BarcodeGeneratorModal';
import ProductDetailModal from './ProductDetailModal';
import ProductFormModal from './ProductFormModal';
import AIProductPhotoScannerModal from './AIProductPhotoScannerModal';
import WholesaleUOMStockReceiptModal from './WholesaleUOMStockReceiptModal';
import { CategoryHierarchyManagerModal } from './CategoryHierarchyManagerModal';
import { getChildCategoryIds } from '../utils/categoryUtils';
import { mapExtractedDataToProduct } from '../services/aiPhotoExtractor';
import { useCurrency } from '../context/CurrencyContext';
import VariantPriceListsModal from './VariantPriceListsModal';
import { normalizePriceListMap } from '../utils/pricingEngine';

type SortField = 'name' | 'stock' | 'price' | 'sales' | 'margin' | 'sku';
type SortDirection = 'asc' | 'desc';
type StockStatusFilter = 'all' | 'healthy' | 'low' | 'out';
type ViewMode = 'table' | 'cards';

export type InventoryTransactionType =
  | 'PURCHASE'
  | 'SALE_RETURN'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'DAMAGE'
  | 'EXPIRED'
  | 'LOST'
  | 'FOUND'
  | 'OPENING_BALANCE'
  | 'STOCK_COUNT';

export interface InventoryAdjustmentRequest {
  productId: string;
  variantId?: string;
  locationId?: string;
  quantity: number;
  type: InventoryTransactionType;
  reason: string;
  reference?: string;
}

export interface InventoryTransferRequest {
  productId: string;
  variantId?: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  reason: string;
  reference?: string;
}

export interface InventoryMutationResult {
  success: boolean;
  message?: string;
}

export interface InventoryService {
  adjustStock(request: InventoryAdjustmentRequest): Promise<InventoryMutationResult>;
  transferStock(request: InventoryTransferRequest): Promise<InventoryMutationResult>;
  bulkAdjust?(requests: InventoryAdjustmentRequest[]): Promise<InventoryMutationResult>;
  deleteProducts?(productIds: string[]): Promise<InventoryMutationResult>;
  createProduct?(product: Product): Promise<InventoryMutationResult>;
  updateProduct?(product: Product): Promise<InventoryMutationResult>;
  importProducts?(products: Product[]): Promise<InventoryMutationResult>;
}

interface InventoryModuleProps {
  products: Product[];
  categoriesList?: Category[];

  /**
   * These callbacks are retained for compatibility with the existing application.
   * For production inventory mutations, prefer inventoryService so the server owns
   * authorization, concurrency control, transaction creation and audit logging.
   */
  onSaveCategory?: (category: Category) => void | Promise<void>;
  onDeleteCategory?: (categoryId: string) => void | Promise<void>;
  onAddProduct: (product: Product) => void | Promise<void>;
  onUpdateProduct: (product: Product) => void | Promise<void>;
  onDeleteProduct: (productId: string) => void | Promise<void>;

  staffRole?: string;
  activeStaff?: StaffMember;

  /**
   * Recommended production mutation layer.
   * Backend should enforce permissions and create inventory ledger entries.
   */
  inventoryService?: InventoryService;

  locations?: Array<{ id: string; name: string }>;
  loading?: boolean;
}

const DEFAULT_LOCATIONS = [
  { id: 'warehouse', name: 'Warehouse' },
  { id: 'store-shelf', name: 'Store Shelf' },
  { id: 'fulfillment-center', name: 'Fulfillment Center' },
];

const PERMISSIONS = {
  view: 'inventory.view',
  create: 'inventory.create',
  edit: 'inventory.edit',
  adjust: 'inventory.adjust',
  transfer: 'inventory.transfer',
  delete: 'inventory.delete',
  reorder: 'inventory.reorder',
  import: 'inventory.import',
  export: 'inventory.export',
  category: 'inventory.manage_categories',
} as const;

function normalizeCode(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function escapeCsvCell(value: unknown): string {
  const text = String(value ?? '');
  // Prevent spreadsheet formula injection.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = rows.map(row => row.map(escapeCsvCell).join(',')).join('\r\n');
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell.trim());
      if (row.some(value => value !== '')) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell.length || row.length) {
    row.push(cell.trim());
    if (row.some(value => value !== '')) rows.push(row);
  }

  return rows;
}

function parseNonNegativeNumber(value: string, field: string, row: number): number {
  if (value.trim() === '') {
    throw new Error(`Row ${row}: ${field} is required.`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Row ${row}: ${field} must be a non-negative number.`);
  }
  return parsed;
}

function parseNonNegativeInteger(value: string, field: string, row: number): number {
  const parsed = parseNonNegativeNumber(value, field, row);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Row ${row}: ${field} must be a whole number.`);
  }
  return parsed;
}

function PermissionDenied() {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
      <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-rose-600" />
      <h2 className="text-base font-bold text-rose-900">Inventory access denied</h2>
      <p className="mt-1 text-sm text-rose-700">
        You do not have permission to view inventory.
      </p>
    </div>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
              destructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReasonDialog({
  open,
  title,
  quantity,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  title: string;
  quantity: number;
  onSubmit: (reason: string, reference?: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={event => {
          event.preventDefault();
          if (!reason.trim()) return;
          onSubmit(reason.trim(), reference.trim() || undefined);
          setReason('');
          setReference('');
        }}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
      >
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-xs text-slate-500">
          Requested quantity: <strong>{quantity}</strong>. The server should validate the final balance.
        </p>

        <label className="mt-4 block text-xs font-bold text-slate-700">
          Reason
          <textarea
            required
            value={reason}
            onChange={event => setReason(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. Purchase receipt, damaged goods, cycle count..."
          />
        </label>

        <label className="mt-3 block text-xs font-bold text-slate-700">
          Reference (optional)
          <input
            value={reference}
            onChange={event => setReference(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="PO-2026-001"
          />
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}

function TransferDialog({
  open,
  locations,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  locations: Array<{ id: string; name: string }>;
  onSubmit: (toLocationId: string, quantity: number, reason: string, reference?: string) => void;
  onCancel: () => void;
}) {
  const [toLocationId, setToLocationId] = useState(locations[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={event => {
          event.preventDefault();
          if (!toLocationId || quantity <= 0 || !reason.trim()) return;
          onSubmit(toLocationId, quantity, reason.trim(), reference.trim() || undefined);
        }}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
      >
        <h3 className="text-base font-bold text-slate-900">Transfer stock</h3>
        <p className="mt-1 text-xs text-slate-500">
          A transfer creates paired OUT/IN ledger transactions. It does not simply change a product location.
        </p>

        <label className="mt-4 block text-xs font-bold text-slate-700">
          Destination
          <select
            value={toLocationId}
            onChange={event => setToLocationId(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
          >
            {locations.map(location => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block text-xs font-bold text-slate-700">
          Quantity
          <input
            type="number"
            min={1}
            step={1}
            value={quantity}
            onChange={event => setQuantity(Number(event.target.value))}
            className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
          />
        </label>

        <label className="mt-3 block text-xs font-bold text-slate-700">
          Reason
          <input
            required
            value={reason}
            onChange={event => setReason(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
            placeholder="Store replenishment"
          />
        </label>

        <label className="mt-3 block text-xs font-bold text-slate-700">
          Reference
          <input
            value={reference}
            onChange={event => setReference(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
            placeholder="TRF-2026-001"
          />
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-xl border px-4 py-2 text-sm font-semibold">
            Cancel
          </button>
          <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Transfer
          </button>
        </div>
      </form>
    </div>
  );
}

export default function InventoryModule({
  products,
  categoriesList = [],
  onSaveCategory,
  onDeleteCategory,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  staffRole,
  activeStaff,
  inventoryService,
  locations = DEFAULT_LOCATIONS,
  loading = false,
}: InventoryModuleProps) {
  const { formatAmount } = useCurrency();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [stockStatusFilter, setStockStatusFilter] = useState<StockStatusFilter>('all');
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<'all' | 'pos' | 'ecommerce' | 'mobileApp' | 'wholesalePortal'>('all');
  const [sortBy, setSortBy] = useState<SortField>('stock');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [barcodeModalProduct, setBarcodeModalProduct] = useState<Product | null>(null);
  const [barcodeModalSku, setBarcodeModalSku] = useState('');

  const [isAiPhotoModalOpen, setIsAiPhotoModalOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<Product[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [reasonDialog, setReasonDialog] = useState<{
    product: Product;
    quantity: number;
  } | null>(null);

  const [transferDialog, setTransferDialog] = useState<Product | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<string[] | null>(null);
  const [isWholesaleUomModalOpen, setIsWholesaleUomModalOpen] = useState(false);
  const [priceListsModalProduct, setPriceListsModalProduct] = useState<{ product: Product; variantIndex: number } | null>(null);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const can = useCallback(
    (permission: string) => {
      if (!activeStaff) {
        return ['Admin', 'Manager', 'Warehouse Staff', 'Super Admin', 'Inventory Manager'].includes(
          staffRole ?? ''
        );
      }
      return hasPermission(activeStaff, permission as any);
    },
    [activeStaff, staffRole]
  );

  const canView = !activeStaff ? true : can(PERMISSIONS.view);
  const canCreate = can(PERMISSIONS.create);
  const canEdit = can(PERMISSIONS.edit);
  const canAdjust = can(PERMISSIONS.adjust);
  const canTransfer = can(PERMISSIONS.transfer);
  const canDelete = can(PERMISSIONS.delete);
  const canReorder = can(PERMISSIONS.reorder);
  const canImport = can(PERMISSIONS.import);
  const canExport = can(PERMISSIONS.export);
  const canManageCategories = can(PERMISSIONS.category);

  const categoryOptions = useMemo(
    () => ['All', ...Array.from(new Set(products.map(product => product.category).filter(Boolean)))],
    [products]
  );

  const brands = useMemo(
    () => Array.from(new Set(products.map(product => product.brand).filter(Boolean))) as string[],
    [products]
  );

  const categoryMatches = useMemo(() => {
    if (selectedCategory === 'All') return null;

    const category = categoriesList.find(
      item => item.id === selectedCategory || item.name === selectedCategory
    );

    if (!category) return new Set([selectedCategory.toLowerCase()]);

    const ids = getChildCategoryIds(category.id, categoriesList);
    const matches = new Set<string>([category.id.toLowerCase(), category.name.toLowerCase()]);

    ids.forEach(id => {
      matches.add(id.toLowerCase());
      const child = categoriesList.find(item => item.id === id);
      if (child) matches.add(child.name.toLowerCase());
    });

    return matches;
  }, [categoriesList, selectedCategory]);

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return [...products]
      .filter(product => {
        const searchable = [
          product.name,
          product.sku,
          product.barcode,
          product.qrCode,
          ...(product.variants ?? []).map(variant => variant.sku),
        ]
          .filter(Boolean)
          .map(normalizeCode);

        const matchesSearch = !query || searchable.some(value => value.includes(query));

        const categoryValue = normalizeCode(product.category);
        const matchesCategory =
          !categoryMatches || categoryMatches.has(categoryValue) ||
          categoryMatches.has(String(product.category ?? '').toLowerCase());

        const matchesLocation =
          selectedLocation === 'All' ||
          normalizeCode(product.location) === normalizeCode(selectedLocation);

        const matchesStatus =
          stockStatusFilter === 'all' ||
          (stockStatusFilter === 'out' && product.stock <= 0) ||
          (stockStatusFilter === 'low' &&
            product.stock > 0 &&
            product.stock <= product.reorderPoint) ||
          (stockStatusFilter === 'healthy' && product.stock > product.reorderPoint);

        const matchesChannel =
          selectedChannelFilter === 'all' ||
          (selectedChannelFilter === 'pos' && (product.salesChannels?.pos ?? true)) ||
          (selectedChannelFilter === 'ecommerce' && (product.salesChannels?.ecommerce ?? (product.ecommerce?.published ?? true))) ||
          (selectedChannelFilter === 'mobileApp' && (product.salesChannels?.mobileApp ?? false)) ||
          (selectedChannelFilter === 'wholesalePortal' && (product.salesChannels?.wholesalePortal ?? false));

        return matchesSearch && matchesCategory && matchesLocation && matchesStatus && matchesChannel;
      })
      .sort((a, b) => {
        let left: string | number = 0;
        let right: string | number = 0;

        switch (sortBy) {
          case 'name':
            left = a.name.toLowerCase();
            right = b.name.toLowerCase();
            break;
          case 'sku':
            left = a.sku.toLowerCase();
            right = b.sku.toLowerCase();
            break;
          case 'price':
            left = a.price;
            right = b.price;
            break;
          case 'sales':
            left = a.salesCount;
            right = b.salesCount;
            break;
          case 'margin':
            left = a.price - a.cost;
            right = b.price - b.cost;
            break;
          default:
            left = a.stock;
            right = b.stock;
        }

        const comparison = left < right ? -1 : left > right ? 1 : 0;
        return sortDir === 'asc' ? comparison : -comparison;
      });
  }, [
    products,
    searchTerm,
    selectedCategory,
    selectedLocation,
    stockStatusFilter,
    selectedChannelFilter,
    sortBy,
    sortDir,
    categoryMatches,
  ]);

  const metrics = useMemo(() => {
    const totalUnits = products.reduce((sum, product) => sum + Math.max(0, product.stock), 0);
    const lowStock = products.filter(
      product => product.stock > 0 && product.stock <= product.reorderPoint
    ).length;
    const outOfStock = products.filter(product => product.stock <= 0).length;
    const costValue = products.reduce(
      (sum, product) => sum + Math.max(0, product.stock) * Math.max(0, product.cost),
      0
    );
    const retailValue = products.reduce(
      (sum, product) => sum + Math.max(0, product.stock) * Math.max(0, product.price),
      0
    );

    return {
      totalUnits,
      lowStock,
      outOfStock,
      costValue,
      potentialProfit: retailValue - costValue,
    };
  }, [products]);

  const setSuccess = (message: string) => {
    setNotice({ type: 'success', message });
    window.setTimeout(() => setNotice(null), 4000);
  };

  const setError = (message: string) => {
    setNotice({ type: 'error', message });
    window.setTimeout(() => setNotice(null), 5000);
  };

  const runMutation = async (operation: () => Promise<InventoryMutationResult | void>) => {
    setBusy(true);
    try {
      const result = await operation();
      if (result && !result.success) {
        throw new Error(result.message || 'Inventory operation failed.');
      }
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Inventory operation failed.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  /**
   * IMPORTANT:
   * Never calculate authoritative stock on the client.
   * When inventoryService exists, the backend performs the atomic mutation,
   * creates ledger entries, checks permissions, prevents negative stock and
   * records the audit event.
   */
  const handleAdjust = async (product: Product, quantity: number, reason: string, reference?: string) => {
    if (!canAdjust) {
      setError('You do not have permission to adjust inventory.');
      return;
    }

    const ok = await runMutation(async () => {
      if (inventoryService) {
        return inventoryService.adjustStock({
          productId: product.id,
          locationId: String(product.location ?? ''),
          quantity: Math.abs(quantity),
          type: quantity >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
          reason,
          reference,
        });
      }

      // Legacy fallback. Keep only while migrating to the server inventory service.
      const nextStock = Math.max(0, product.stock + quantity);
      await onUpdateProduct({ ...product, stock: nextStock });
      return { success: true };
    });

    if (ok) setSuccess(`${quantity >= 0 ? 'Added' : 'Removed'} ${Math.abs(quantity)} unit(s).`);
  };

  const handleTransfer = async (
    product: Product,
    toLocationId: string,
    quantity: number,
    reason: string,
    reference?: string
  ) => {
    if (!canTransfer) {
      setError('You do not have permission to transfer inventory.');
      return;
    }

    const fromLocationId = String(product.location ?? '');
    if (!fromLocationId || fromLocationId === toLocationId) {
      setError('Choose a destination different from the current location.');
      return;
    }

    const ok = await runMutation(async () => {
      if (inventoryService) {
        return inventoryService.transferStock({
          productId: product.id,
          fromLocationId,
          toLocationId,
          quantity,
          reason,
          reference,
        });
      }

      // Legacy fallback. Do not use for real multi-location inventory.
      await onUpdateProduct({
        ...product,
        location: locations.find(location => location.id === toLocationId)?.name ?? toLocationId,
      });
      return { success: true };
    });

    if (ok) setSuccess(`Transfer request for ${quantity} unit(s) submitted.`);
  };

  const handleBulkAdjust = async (amount: number) => {
    if (!canReorder) {
      setError('You do not have permission to reorder inventory.');
      return;
    }

    const selected = products.filter(product => selectedProductIds.includes(product.id));
    if (!selected.length) return;

    const requests: InventoryAdjustmentRequest[] = selected.map(product => ({
      productId: product.id,
      locationId: String(product.location ?? ''),
      quantity: amount,
      type: 'PURCHASE',
      reason: 'Bulk replenishment',
    }));

    const ok = await runMutation(async () => {
      if (inventoryService?.bulkAdjust) {
        return inventoryService.bulkAdjust(requests);
      }

      for (const request of requests) {
        const product = selected.find(item => item.id === request.productId);
        if (!product) continue;
        await onUpdateProduct({ ...product, stock: product.stock + amount });
      }
      return { success: true };
    });

    if (ok) {
      setSelectedProductIds([]);
      setSuccess(`Replenishment submitted for ${selected.length} product(s).`);
    }
  };

  const handleDeleteSelected = () => {
    if (!canDelete) {
      setError('You do not have permission to delete inventory items.');
      return;
    }
    if (!selectedProductIds.length) return;
    setDeleteDialog([...selectedProductIds]);
  };

  const confirmDelete = async () => {
    const ids = deleteDialog ?? [];
    setDeleteDialog(null);
    if (!ids.length) return;

    const ok = await runMutation(async () => {
      if (inventoryService?.deleteProducts) {
        return inventoryService.deleteProducts(ids);
      }

      for (const id of ids) await onDeleteProduct(id);
      return { success: true };
    });

    if (ok) {
      setSelectedProductIds([]);
      setSuccess(`${ids.length} product(s) deleted.`);
    }
  };

  const buildImportPreview = (text: string) => {
    setCsvErrors([]);
    setCsvPreview([]);

    try {
      const rows = parseCsv(text);
      if (rows.length < 2) throw new Error('CSV must contain a header and at least one data row.');

      const header = rows[0].map(value => normalizeCode(value));
      const required = ['name', 'sku', 'price', 'cost', 'stock', 'category', 'reorderpoint', 'location'];
      const missing = required.filter(field => !header.includes(field));

      if (missing.length) {
        throw new Error(`Missing required CSV columns: ${missing.join(', ')}`);
      }

      const indexOf = (name: string) => header.indexOf(name);
      const seenSkus = new Set<string>();
      const preview: Product[] = [];
      const errors: string[] = [];

      rows.slice(1).forEach((row, index) => {
        const rowNumber = index + 2;
        try {
          const name = row[indexOf('name')]?.trim();
          const sku = row[indexOf('sku')]?.trim();
          const category = row[indexOf('category')]?.trim();
          const location = row[indexOf('location')]?.trim();

          if (!name) throw new Error(`Row ${rowNumber}: name is required.`);
          if (!sku) throw new Error(`Row ${rowNumber}: SKU is required.`);
          if (!category) throw new Error(`Row ${rowNumber}: category is required.`);
          if (!location) throw new Error(`Row ${rowNumber}: location is required.`);

          const normalizedSku = normalizeCode(sku);
          if (seenSkus.has(normalizedSku)) {
            throw new Error(`Row ${rowNumber}: duplicate SKU "${sku}" in import.`);
          }
          if (products.some(product => normalizeCode(product.sku) === normalizedSku)) {
            throw new Error(`Row ${rowNumber}: SKU "${sku}" already exists.`);
          }
          seenSkus.add(normalizedSku);

          const price = parseNonNegativeNumber(row[indexOf('price')] ?? '', 'price', rowNumber);
          const cost = parseNonNegativeNumber(row[indexOf('cost')] ?? '', 'cost', rowNumber);
          const stock = parseNonNegativeInteger(row[indexOf('stock')] ?? '', 'stock', rowNumber);
          const reorderPoint = parseNonNegativeInteger(
            row[indexOf('reorderpoint')] ?? '',
            'reorderPoint',
            rowNumber
          );

          if (cost > price) {
            throw new Error(`Row ${rowNumber}: cost cannot be greater than selling price.`);
          }

          const barcodeIndex = indexOf('barcode');
          const qrIndex = indexOf('qrcode');

          preview.push({
            id: `import-preview-${rowNumber}`,
            name,
            sku,
            price,
            cost,
            stock,
            category,
            location,
            reorderPoint,
            barcode: barcodeIndex >= 0 ? row[barcodeIndex]?.trim() || '' : '',
            qrCode: qrIndex >= 0 ? row[qrIndex]?.trim() || '' : '',
            variants: [],
            salesCount: 0,
            description: 'Imported catalog item.',
          });
        } catch (error) {
          errors.push(error instanceof Error ? error.message : `Row ${rowNumber}: invalid data.`);
        }
      });

      setCsvErrors(errors);
      setCsvPreview(preview);
    } catch (error) {
      setCsvErrors([error instanceof Error ? error.message : 'Invalid CSV.']);
    }
  };

  const handleImport = async () => {
    if (!canImport) {
      setError('You do not have permission to import inventory.');
      return;
    }

    if (!csvPreview.length || csvErrors.length) {
      setError('Resolve all CSV validation errors before importing.');
      return;
    }

    const ok = await runMutation(async () => {
      if (inventoryService?.importProducts) {
        return inventoryService.importProducts(csvPreview);
      }

      for (const product of csvPreview) {
        const { id: _previewId, ...rest } = product;
        await onAddProduct({
          ...rest,
          id: crypto.randomUUID(),
        } as Product);
      }

      return { success: true };
    });

    if (ok) {
      setCsvText('');
      setCsvPreview([]);
      setCsvErrors([]);
      setShowImport(false);
      setSuccess(`${csvPreview.length} product(s) imported.`);
    }
  };

  const handleExport = () => {
    if (!canExport) {
      setError('You do not have permission to export inventory.');
      return;
    }

    const rows = [
      ['Name', 'SKU', 'Price', 'Cost', 'Stock', 'Category', 'ReorderPoint', 'Location', 'Barcode', 'QRCode'],
      ...filteredProducts.map(product => [
        product.name,
        product.sku,
        product.price,
        product.cost,
        product.stock,
        product.category,
        product.reorderPoint,
        product.location,
        product.barcode,
        product.qrCode,
      ]),
    ];

    downloadCsv(`Inventory_Export_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const handleDownloadTemplate = () => {
    downloadCsv('Inventory_Import_Template.csv', [
      ['Name', 'SKU', 'Price', 'Cost', 'Stock', 'Category', 'ReorderPoint', 'Location', 'Barcode', 'QRCode'],
      ['Wireless Noise-Cancelling Headphones', 'WNC-001', 149.99, 65, 45, 'Electronics', 10, 'Warehouse', '', ''],
      ['Organic Cotton Crewneck', 'OCC-002', 34.5, 12, 80, 'Apparel & Fashion', 15, 'Store Shelf', '', ''],
    ]);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('CSV file must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      setCsvText(text);
      buildImportPreview(text);
    };
    reader.onerror = () => setError('Unable to read the CSV file.');
    reader.readAsText(file);
    event.target.value = '';
  };

  const toggleSelection = (productId: string) => {
    setSelectedProductIds(current =>
      current.includes(productId)
        ? current.filter(id => id !== productId)
        : [...current, productId]
    );
  };

  const toggleSelectAll = () => {
    const ids = filteredProducts.map(product => product.id);
    const allSelected = ids.length > 0 && ids.every(id => selectedProductIds.includes(id));

    setSelectedProductIds(current =>
      allSelected ? current.filter(id => !ids.includes(id)) : Array.from(new Set([...current, ...ids]))
    );
  };

  const openAdd = () => {
    if (!canCreate) {
      setError('You do not have permission to create products.');
      return;
    }
    setEditingProduct(null);
    setIsFormModalOpen(true);
  };

  const openEdit = (product: Product) => {
    if (!canEdit) {
      setError('You do not have permission to edit products.');
      return;
    }
    setEditingProduct(product);
    setIsFormModalOpen(true);
  };

  const openBarcode = (product?: Product | null, sku?: string) => {
    setBarcodeModalProduct(product ?? null);
    setBarcodeModalSku(sku ?? product?.sku ?? '');
    setIsBarcodeModalOpen(true);
  };

  if (!canView) return <PermissionDenied />;

  return (
    <div className="space-y-5" id="inventory-module-root">
      {notice && (
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl border p-3 text-sm ${
            notice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
          role="status"
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span>{notice.message}</span>
          </div>
          <button type="button" onClick={() => setNotice(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
              <Package className="h-6 w-6 text-indigo-600" />
              Inventory & Catalog
            </h1>
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
              {products.length} SKUs
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Catalog, stock visibility, controlled adjustments, transfers and audit-ready inventory operations.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openBarcode(products[0] ?? null)}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700"
          >
            <Barcode className="h-4 w-4" />
            Barcode Studio
          </button>

          {canView && (
            <button
              type="button"
              onClick={() => {
                const prodWithVariants = products.find(p => p.variants && p.variants.length > 0) || products[0];
                if (prodWithVariants) {
                  setPriceListsModalProduct({ product: prodWithVariants, variantIndex: 0 });
                }
              }}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 px-3 py-2 text-xs font-bold text-indigo-700 transition-colors shadow-2xs"
              title="Manage Multi-Tier Price Lists (Retail, Wholesale, Dealer) per variant"
            >
              <Tag className="h-4 w-4 text-indigo-600" />
              Price Lists Matrix
            </button>
          )}

          {canAdjust && (
            <button
              type="button"
              onClick={() => setIsWholesaleUomModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900 transition-all cursor-pointer shadow-2xs"
              title="Receive wholesale stock from suppliers in Cartons / Boxes with automatic conversion to POS pieces"
            >
              <Truck className="h-4 w-4 text-amber-700" />
              Wholesale UOM Intake
            </button>
          )}

          {canCreate && (
            <>
              <button
                type="button"
                onClick={() => setIsAiPhotoModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white"
              >
                <Sparkles className="h-4 w-4" />
                AI Photo Scan
              </button>
              <button
                type="button"
                onClick={openAdd}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </button>
            </>
          )}

          {canImport && (
            <button
              type="button"
              onClick={() => setShowImport(value => !value)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <Upload className="h-4 w-4" />
              Import
            </button>
          )}

          {canExport && (
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          )}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="On-hand units" value={metrics.totalUnits.toLocaleString()} icon={<Package className="h-5 w-5" />} />
        <MetricCard
          label="Low stock"
          value={metrics.lowStock.toLocaleString()}
          icon={<ShieldAlert className="h-5 w-5" />}
          active={stockStatusFilter === 'low'}
          onClick={() => setStockStatusFilter(value => (value === 'low' ? 'all' : 'low'))}
        />
        <MetricCard
          label="Out of stock"
          value={metrics.outOfStock.toLocaleString()}
          icon={<AlertTriangle className="h-5 w-5" />}
          active={stockStatusFilter === 'out'}
          onClick={() => setStockStatusFilter(value => (value === 'out' ? 'all' : 'out'))}
        />
        <MetricCard
          label="Cost valuation"
          value={formatAmount(metrics.costValue)}
          subtitle={`Potential profit ${formatAmount(metrics.potentialProfit)}`}
        />
      </section>

      {showImport && canImport && (
        <section className="rounded-2xl border border-indigo-200 bg-slate-50 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Upload className="h-4 w-4 text-indigo-600" />
                Safe CSV import
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Upload/parse first, validate second, preview third, then commit. No silent defaults.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
            >
              <Download className="h-4 w-4" />
              Template
            </button>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div>
              <textarea
                value={csvText}
                onChange={event => {
                  setCsvText(event.target.value);
                  setCsvPreview([]);
                  setCsvErrors([]);
                }}
                onBlur={() => csvText.trim() && buildImportPreview(csvText)}
                rows={8}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Name,SKU,Price,Cost,Stock,Category,ReorderPoint,Location,Barcode,QRCode"
              />

              <div className="mt-2 flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                >
                  Choose CSV
                </button>
                <button
                  type="button"
                  onClick={() => buildImportPreview(csvText)}
                  disabled={!csvText.trim() || busy}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  Validate
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!csvPreview.length || csvErrors.length > 0 || busy}
                  className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Import {csvPreview.length || ''}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Validation</span>
                <span className="text-xs text-slate-500">{csvPreview.length} valid rows</span>
              </div>

              {csvErrors.length > 0 ? (
                <ul className="mt-3 max-h-48 space-y-1 overflow-auto text-xs text-rose-700">
                  {csvErrors.map(error => (
                    <li key={error} className="rounded-lg bg-rose-50 p-2">
                      {error}
                    </li>
                  ))}
                </ul>
              ) : csvPreview.length > 0 ? (
                <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
                  <strong>{csvPreview.length}</strong> rows passed client validation. Server validation is still authoritative.
                </div>
              ) : (
                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                  No validation result yet.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm" id="inventory-search-filter-bar">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Search product, SKU, barcode or variant..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            <select
              value={selectedCategory}
              onChange={event => setSelectedCategory(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold w-full sm:w-auto"
            >
              {categoryOptions.map(category => (
                <option key={category} value={category}>
                  {category === 'All' ? 'All Categories' : category}
                </option>
              ))}
            </select>

            <select
              value={selectedLocation}
              onChange={event => setSelectedLocation(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold w-full sm:w-auto"
            >
              <option value="All">All Locations</option>
              {locations.map(location => (
                <option key={location.id} value={location.name}>
                  {location.name}
                </option>
              ))}
            </select>

            <select
              value={stockStatusFilter}
              onChange={event => setStockStatusFilter(event.target.value as StockStatusFilter)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold w-full sm:w-auto"
            >
              <option value="all">All Stock</option>
              <option value="healthy">Healthy</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>

            <select
              value={selectedChannelFilter}
              onChange={event => setSelectedChannelFilter(event.target.value as any)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold w-full sm:w-auto"
            >
              <option value="all">All Channels</option>
              <option value="pos">POS Only</option>
              <option value="ecommerce">Online Store</option>
              <option value="mobileApp">Mobile App</option>
              <option value="wholesalePortal">Wholesale Portal</option>
            </select>

            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 w-full sm:w-auto justify-between sm:justify-start">
              <select
                value={sortBy}
                onChange={event => setSortBy(event.target.value as SortField)}
                className="bg-transparent px-2 py-2 text-xs font-semibold outline-none flex-1 sm:flex-none"
              >
                <option value="stock">Stock</option>
                <option value="name">Name</option>
                <option value="sku">SKU</option>
                <option value="price">Price</option>
                <option value="sales">Sales</option>
                <option value="margin">Margin</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDir(value => (value === 'asc' ? 'desc' : 'asc'))}
                className="p-2 text-slate-500 hover:text-slate-900"
                title="Toggle sort direction"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="hidden lg:flex rounded-xl bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`rounded-lg p-2 ${viewMode === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
                title="Table View (Desktop)"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`rounded-lg p-2 ${viewMode === 'cards' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
                title="Cards Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>

            {canManageCategories && (
              <button
                type="button"
                onClick={() => setIsCategoryManagerOpen(true)}
                className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
              >
                <FolderTree className="h-4 w-4 text-indigo-600" />
                <span>Categories</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {selectedProductIds.length > 0 && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 p-3 text-white shadow-xl">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-indigo-600 px-2.5 py-1 font-mono text-xs font-bold">
              {selectedProductIds.length} selected
            </span>
            <span className="text-xs text-slate-300">Batch inventory operations</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {canReorder &&
              [10, 25, 50].map(amount => (
                <button
                  key={amount}
                  type="button"
                  disabled={busy}
                  onClick={() => handleBulkAdjust(amount)}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold hover:bg-indigo-500 disabled:opacity-50"
                >
                  Restock +{amount}
                </button>
              ))}

            {canDelete && (
              <button
                type="button"
                disabled={busy}
                onClick={handleDeleteSelected}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
              >
                Delete
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedProductIds([])}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold"
            >
              Clear
            </button>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Loading inventory...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 font-bold text-slate-800">No matching products</h3>
            <p className="mt-1 text-sm text-slate-500">Clear filters or search for another SKU.</p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('All');
                setSelectedLocation('All');
                setStockStatusFilter('all');
              }}
              className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div>
            {/* MOBILE & TABLET: Strict 2-Column Grid View */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 p-2.5 sm:p-3.5 lg:hidden" id="inventory-mobile-tablet-grid">
              {filteredProducts.map(product => {
                const status =
                  product.stock <= 0
                    ? 'out'
                    : product.stock <= product.reorderPoint
                      ? 'low'
                      : 'healthy';
                const hasVariants = product.variants && product.variants.length > 0;

                return (
                  <article
                    key={product.id}
                    id={`mobile-card-${product.id}`}
                    className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    {/* Top Image Canvas */}
                    <div 
                      className="relative aspect-4/3 bg-slate-100/90 overflow-hidden cursor-pointer"
                      onClick={() => {
                        setDetailProduct(product);
                        setIsDetailModalOpen(true);
                      }}
                    >
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name} 
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-300">
                          <Package className="h-8 w-8 text-slate-300" />
                        </div>
                      )}

                      {/* Multi-select checkbox */}
                      <div 
                        className="absolute left-2 top-2 z-10" 
                        onClick={e => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(product.id)}
                          onChange={() => toggleSelection(product.id)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shadow-xs bg-white/90"
                          aria-label={`Select ${product.name}`}
                        />
                      </div>

                      {/* Stock status pill */}
                      <div className="absolute right-2 top-2 z-10">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-2xs ${
                            status === 'out'
                              ? 'bg-rose-600 text-white'
                              : status === 'low'
                                ? 'bg-amber-500 text-white'
                                : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {status === 'out' ? 'OUT' : status === 'low' ? 'LOW' : 'OK'}
                        </span>
                      </div>

                      {/* Category tag */}
                      <div className="absolute left-2 bottom-2 z-10 pointer-events-none">
                        <span className="rounded-md bg-slate-900/80 backdrop-blur-xs text-white px-1.5 py-0.5 text-[9px] font-bold truncate max-w-[100px] inline-block shadow-2xs">
                          {product.category}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between space-y-2">
                      <div className="space-y-1">
                        <h3 
                          onClick={() => {
                            setDetailProduct(product);
                            setIsDetailModalOpen(true);
                          }}
                          className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 min-h-[30px] sm:min-h-[34px] hover:text-indigo-600 cursor-pointer leading-snug" 
                          title={product.name}
                        >
                          {product.name}
                        </h3>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span className="truncate">{product.sku}</span>
                          <span className="inline-flex items-center gap-0.5 text-slate-600 shrink-0">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            <span className="truncate max-w-[70px]">{product.location || 'Default'}</span>
                          </span>
                        </div>

                        {/* Stock & Health bar */}
                        <div className="bg-slate-50 rounded-xl p-2 border border-slate-100/80">
                          <div className="flex items-baseline justify-between">
                            <span className="text-[9px] uppercase font-bold text-slate-400">Stock</span>
                            <div className="font-mono text-xs font-bold text-slate-900">
                              {product.stock}{' '}
                              <span className="text-[9px] font-normal text-slate-400">/ min {product.reorderPoint}</span>
                            </div>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                status === 'out'
                                  ? 'bg-rose-500 w-0'
                                  : status === 'low'
                                    ? 'bg-amber-500 w-1/3'
                                    : 'bg-emerald-500 w-full'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Price & Cost */}
                        <div className="flex items-baseline justify-between pt-0.5">
                          <div>
                            <div className="text-[8px] uppercase font-bold text-slate-400">Retail</div>
                            <div className="font-mono font-bold text-xs sm:text-sm text-indigo-700">
                              {formatAmount(product.price)}
                            </div>
                          </div>
                          {product.cost ? (
                            <div className="text-right">
                              <div className="text-[8px] uppercase font-bold text-slate-400">Cost</div>
                              <div className="font-mono text-[10px] sm:text-xs text-slate-500">
                                {formatAmount(product.cost)}
                              </div>
                            </div>
                          ) : null}
                        </div>

                        {/* Variants count & Price Lists Trigger */}
                        {hasVariants && (
                          <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
                            <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono">
                              {product.variants.length} Var
                            </span>
                            <button
                              type="button"
                              onClick={() => setPriceListsModalProduct({ product, variantIndex: 0 })}
                              className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-50/60 hover:bg-indigo-100 transition-colors"
                              title="Edit Multi-Tier Price Lists"
                            >
                              <Tag className="w-2.5 h-2.5" />
                              <span>Prices</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Touch-Friendly Action Buttons */}
                      <div className="pt-2 border-t border-slate-100 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setDetailProduct(product);
                            setIsDetailModalOpen(true);
                          }}
                          className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                          <span>View</span>
                        </button>

                        {canAdjust && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setReasonDialog({ product, quantity: 10 })}
                            className="py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                            title="Quick Restock +10"
                          >
                            +10
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => openBarcode(product)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs transition-all cursor-pointer"
                          title="Barcode Label"
                        >
                          <Barcode className="w-3.5 h-3.5" />
                        </button>

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => openEdit(product)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs transition-all cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* DESKTOP VIEW: Table (Default) or Multi-Column Cards Grid */}
            {viewMode === 'table' ? (
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="w-10 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={
                            filteredProducts.length > 0 &&
                            filteredProducts.every(product => selectedProductIds.includes(product.id))
                          }
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-3 py-3">Product</th>
                      <th className="px-3 py-3">SKU</th>
                      <th className="px-3 py-3">Location</th>
                      <th className="px-3 py-3 text-right">Stock</th>
                      <th className="px-3 py-3 text-right">Price</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map(product => {
                      const expanded = !!expandedProductIds[product.id];
                      const status =
                        product.stock <= 0
                          ? 'out'
                          : product.stock <= product.reorderPoint
                            ? 'low'
                            : 'healthy';

                      return (
                        <React.Fragment key={product.id}>
                          <tr
                            id={`row-${product.id}`}
                            className="hover:bg-slate-50"
                          >
                            <td className="px-3 py-3">
                              <input
                                type="checkbox"
                                checked={selectedProductIds.includes(product.id)}
                                onChange={() => toggleSelection(product.id)}
                              />
                            </td>

                            <td className="px-3 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                                  {product.imageUrl ? (
                                    <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <Package className="h-5 w-5 text-slate-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate font-bold text-slate-900">{product.name}</div>
                                  <div className="truncate text-[11px] text-slate-500">{product.category}</div>
                                </div>
                              </div>
                            </td>

                            <td className="px-3 py-3 font-mono font-semibold text-slate-700">{product.sku}</td>

                            <td className="px-3 py-3">
                              <span className="inline-flex items-center gap-1 text-slate-600">
                                <MapPin className="h-3.5 w-3.5" />
                                {product.location}
                              </span>
                            </td>

                            <td className="px-3 py-3 text-right">
                              <span className="font-mono font-bold text-slate-900">{product.stock.toLocaleString()}</span>
                              <span className="ml-1 text-slate-400">/ {product.reorderPoint}</span>
                            </td>

                            <td className="px-3 py-3 text-right font-semibold">{formatAmount(product.price)}</td>

                            <td className="px-3 py-3">
                              <span
                                className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                                  status === 'out'
                                    ? 'bg-rose-50 text-rose-700'
                                    : status === 'low'
                                      ? 'bg-amber-50 text-amber-700'
                                      : 'bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                {status === 'out' ? 'OUT' : status === 'low' ? 'LOW' : 'HEALTHY'}
                              </span>
                            </td>

                            <td className="px-3 py-3">
                              <div className="flex justify-end gap-1">
                                {product.variants?.length ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedProductIds(current => ({
                                        ...current,
                                        [product.id]: !current[product.id],
                                      }))
                                    }
                                    className="rounded-lg bg-slate-100 p-2"
                                    title="Variants"
                                  >
                                    {expanded ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </button>
                                ) : null}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setDetailProduct(product);
                                    setIsDetailModalOpen(true);
                                  }}
                                  className="rounded-lg bg-slate-100 p-2"
                                  title="View"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>

                                {canAdjust && (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => setReasonDialog({ product, quantity: 10 })}
                                    className="rounded-lg bg-indigo-50 px-2.5 py-1.5 font-bold text-indigo-700 disabled:opacity-50"
                                    title="Restock"
                                  >
                                    +10
                                  </button>
                                )}

                                {canTransfer && (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => setTransferDialog(product)}
                                    className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-semibold text-slate-700 disabled:opacity-50"
                                  >
                                    Move
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => openBarcode(product)}
                                  className="rounded-lg bg-slate-100 p-2"
                                  title="Barcode"
                                >
                                  <Barcode className="h-4 w-4" />
                                </button>

                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => openEdit(product)}
                                    className="rounded-lg bg-slate-100 p-2"
                                    title="Edit"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                )}

                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => setDeleteDialog([product.id])}
                                    className="rounded-lg bg-rose-50 p-2 text-rose-600"
                                    title="Delete"
                                  >
                                    <Trash className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {expanded && product.variants?.map((variant, vIdx) => {
                            const vTitle = variant.title || [variant.size, variant.color, variant.model].filter(Boolean).join(' / ') || `Variant #${vIdx + 1}`;
                            const vInvItemId = variant.inventoryItemId || `INV-ITEM-${variant.sku}`;
                            return (
                              <tr key={variant.id || variant.sku || vIdx} className="bg-indigo-50/40 border-b border-indigo-100/60">
                                <td />
                                <td className="px-3 py-2.5 pl-10 text-slate-700">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px] shrink-0 font-mono">
                                      V
                                    </div>
                                    <div>
                                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                        {vTitle}
                                        <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100/80 text-emerald-800 rounded font-mono">
                                          {variant.inventoryTracking || 'QUANTITY'}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                                        <span>Inv ID: {vInvItemId}</span>
                                        {variant.weight ? (
                                          <span>• {variant.weight} {variant.weightUnit || 'kg'}</span>
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 font-mono text-slate-800 text-xs">
                                  <div className="font-semibold">{variant.sku}</div>
                                  {variant.barcode && <div className="text-[10px] text-slate-400">{variant.barcode}</div>}
                                </td>
                                <td className="px-3 py-2.5 text-xs text-slate-600">
                                  <span className="inline-flex items-center gap-1 text-[11px]">
                                    <MapPin className="h-3 w-3 text-slate-400" />
                                    {variant.location || product.location}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 text-xs">
                                  {variant.stock} units
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono text-xs">
                                  <span className="font-bold text-emerald-700">{formatAmount(variant.price ?? product.price)}</span>
                                  <div className="text-[10px] text-slate-400">Cost: {formatAmount(variant.cost ?? product.cost)}</div>
                                  {(() => {
                                    const map = normalizePriceListMap(variant.priceLists, variant.price ?? product.price);
                                    return (
                                      <div className="flex items-center justify-end gap-1 mt-0.5">
                                        <span className="text-[9px] font-mono font-semibold px-1 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200" title={`Wholesale: ${formatAmount(map.Wholesale || 0)}`}>
                                          W: {formatAmount(map.Wholesale || 0)}
                                        </span>
                                        <span className="text-[9px] font-mono font-semibold px-1 py-0.2 rounded bg-indigo-50 text-indigo-800 border border-indigo-200" title={`Dealer: ${formatAmount(map.Dealer || 0)}`}>
                                          D: {formatAmount(map.Dealer || 0)}
                                        </span>
                                      </div>
                                    );
                                  })()}
                                </td>
                                <td colSpan={2} className="px-3 py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setPriceListsModalProduct({ product, variantIndex: vIdx })}
                                      className="px-2 py-1 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold font-mono transition-all inline-flex items-center gap-1 shadow-2xs"
                                      title="Edit Price Lists (Retail, Wholesale, Dealer)"
                                    >
                                      <Tag className="w-3 h-3 text-indigo-600" />
                                      Price Lists
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openBarcode(product, variant.sku)}
                                      className="px-2 py-1 bg-white border border-slate-200 hover:bg-indigo-50 text-slate-700 rounded-lg text-[10px] font-bold font-mono transition-all inline-flex items-center gap-1"
                                    >
                                      <Barcode className="w-3 h-3" />
                                      Label
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="hidden lg:grid gap-4 p-4 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map(product => {
                  const status =
                    product.stock <= 0
                      ? 'out'
                      : product.stock <= product.reorderPoint
                        ? 'low'
                        : 'healthy';
                  const hasVariants = product.variants && product.variants.length > 0;

                  return (
                    <article
                      key={product.id}
                      id={`desktop-card-${product.id}`}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div 
                        className="relative aspect-4/3 bg-slate-100 cursor-pointer overflow-hidden"
                        onClick={() => {
                          setDetailProduct(product);
                          setIsDetailModalOpen(true);
                        }}
                      >
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <Package className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-slate-300" />
                        )}
                        <div className="absolute left-3 top-3 z-10" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedProductIds.includes(product.id)}
                            onChange={() => toggleSelection(product.id)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shadow-xs bg-white/90"
                          />
                        </div>
                        <div className="absolute right-3 top-3 z-10">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-2xs ${
                              status === 'out'
                                ? 'bg-rose-600 text-white'
                                : status === 'low'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {status === 'out' ? 'OUT' : status === 'low' ? 'LOW' : 'OK'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 p-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span className="font-semibold text-indigo-600">{product.category}</span>
                            <span className="font-mono">{product.sku}</span>
                          </div>

                          <h3 
                            onClick={() => {
                              setDetailProduct(product);
                              setIsDetailModalOpen(true);
                            }}
                            className="truncate font-bold text-slate-900 hover:text-indigo-600 cursor-pointer" 
                            title={product.name}
                          >
                            {product.name}
                          </h3>

                          <div className="flex items-end justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <div>
                              <div className="text-[10px] uppercase text-slate-400 font-bold">On hand</div>
                              <div className="font-mono text-lg font-bold text-slate-900">{product.stock}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] uppercase text-slate-400 font-bold">Price</div>
                              <div className="font-bold text-indigo-700 font-mono">{formatAmount(product.price)}</div>
                            </div>
                          </div>

                          {hasVariants && (
                            <div className="flex items-center justify-between gap-1 pt-1">
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-mono">
                                {product.variants.length} Variants
                              </span>
                              <button
                                type="button"
                                onClick={() => setPriceListsModalProduct({ product, variantIndex: 0 })}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50/60 hover:bg-indigo-100"
                              >
                                <Tag className="w-3 h-3" />
                                <span>Price Lists</span>
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => {
                              setDetailProduct(product);
                              setIsDetailModalOpen(true);
                            }}
                            className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 px-2 py-2 text-xs font-semibold flex items-center justify-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detail</span>
                          </button>
                          {canAdjust && (
                            <button
                              type="button"
                              onClick={() => setReasonDialog({ product, quantity: 10 })}
                              className="rounded-xl bg-indigo-50 hover:bg-indigo-100 px-3 py-2 text-xs font-bold text-indigo-700"
                              title="Restock +10"
                            >
                              +10
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openBarcode(product)}
                            className="rounded-xl bg-slate-100 hover:bg-slate-200 p-2"
                            title="Barcode"
                          >
                            <Barcode className="h-4 w-4" />
                          </button>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openEdit(product)}
                              className="rounded-xl bg-slate-100 hover:bg-slate-200 p-2"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      <ProductDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        product={detailProduct}
        onEditProduct={product => {
          setIsDetailModalOpen(false);
          openEdit(product);
        }}
        onUpdateProduct={updatedProd => {
          setDetailProduct(updatedProd);
          onUpdateProduct(updatedProd);
        }}
        onOpenBarcodeModal={(product, sku) => {
          setIsDetailModalOpen(false);
          openBarcode(product, sku);
        }}
        onQuickReorder={(productId, amount) => {
          const product = products.find(item => item.id === productId);
          if (product && canAdjust) setReasonDialog({ product, quantity: amount });
        }}
        canEdit={canEdit}
      />

      <ProductFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        initialProduct={editingProduct}
        existingCategories={categoryOptions}
        existingBrands={brands}
        allProducts={products}
        onSave={async product => {
          const ok = await runMutation(async () => {
            if (editingProduct) {
              if (inventoryService?.updateProduct) return inventoryService.updateProduct(product);
              await onUpdateProduct(product);
            } else {
              if (inventoryService?.createProduct) return inventoryService.createProduct(product);
              await onAddProduct(product);
            }
            return { success: true };
          });

          if (ok) {
            setIsFormModalOpen(false);
            setEditingProduct(null);
            setSuccess(editingProduct ? 'Product updated.' : 'Product created.');
          }
        }}
      />

      <BarcodeGeneratorModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        products={products}
        initialProduct={barcodeModalProduct}
        initialSku={barcodeModalSku}
      />

      <AIProductPhotoScannerModal
        isOpen={isAiPhotoModalOpen}
        onClose={() => setIsAiPhotoModalOpen(false)}
        onApplyToForm={(extracted, imgUrl, allImages) => {
          if (!canCreate) {
            setError('You do not have permission to create products.');
            return;
          }
          const product = mapExtractedDataToProduct(extracted, imgUrl, allImages);
          setEditingProduct(product);
          setIsAiPhotoModalOpen(false);
          setIsFormModalOpen(true);
        }}
        onDirectSaveProduct={async product => {
          if (!canCreate) {
            setError('You do not have permission to create products.');
            return;
          }

          const ok = await runMutation(async () => {
            if (inventoryService?.createProduct) return inventoryService.createProduct(product);
            await onAddProduct(product);
            return { success: true };
          });

          if (ok) {
            setIsAiPhotoModalOpen(false);
            setSuccess(`"${product.name}" is ready in the catalog.`);
          }
        }}
      />

      <CategoryHierarchyManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={categoriesList}
        onSaveCategory={onSaveCategory ?? (async () => undefined)}
        onDeleteCategory={onDeleteCategory ?? (async () => undefined)}
      />

      <WholesaleUOMStockReceiptModal
        isOpen={isWholesaleUomModalOpen}
        onClose={() => setIsWholesaleUomModalOpen(false)}
        products={products}
        onConfirmReceipt={async (product, addedBaseStock, reason) => {
          await handleAdjust(product, addedBaseStock, reason, 'WHOLESALE_UOM_RECEIPT');
          setSuccess(`Successfully received stock intake for "${product.name}". Added ${addedBaseStock} base units (${product.unit || 'pcs'}).`);
        }}
      />

      <ReasonDialog
        open={!!reasonDialog}
        title="Inventory adjustment"
        quantity={reasonDialog?.quantity ?? 0}
        onCancel={() => setReasonDialog(null)}
        onSubmit={async (reason, reference) => {
          if (!reasonDialog) return;
          const item = reasonDialog;
          setReasonDialog(null);
          await handleAdjust(item.product, item.quantity, reason, reference);
        }}
      />

      <VariantPriceListsModal
        open={!!priceListsModalProduct}
        product={priceListsModalProduct?.product ?? null}
        initialVariantIndex={priceListsModalProduct?.variantIndex ?? 0}
        onClose={() => setPriceListsModalProduct(null)}
        onSave={async (updatedProduct) => {
          const ok = await runMutation(async () => {
            if (inventoryService?.updateProduct) {
              return inventoryService.updateProduct(updatedProduct);
            }
            await onUpdateProduct(updatedProduct);
            return { success: true };
          });
          if (ok) {
            setPriceListsModalProduct(curr => curr ? { ...curr, product: updatedProduct } : null);
            setSuccess(`Updated multi-tier price lists for "${updatedProduct.name}".`);
          }
        }}
        canEdit={canEdit}
      />

      <TransferDialog
        open={!!transferDialog}
        locations={locations}
        onCancel={() => setTransferDialog(null)}
        onSubmit={async (toLocationId, quantity, reason, reference) => {
          if (!transferDialog) return;
          const product = transferDialog;
          setTransferDialog(null);
          await handleTransfer(product, toLocationId, quantity, reason, reference);
        }}
      />

      <ConfirmDialog
        open={!!deleteDialog}
        title="Delete inventory item?"
        message={`This will remove ${deleteDialog?.length ?? 0} catalog item(s). Historical inventory transactions should remain immutable in the backend.`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteDialog(null)}
        onConfirm={confirmDelete}
      />

      {busy && (
        <div className="fixed bottom-5 right-5 z-[90] rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xl">
          Processing inventory operation...
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
  icon,
  active,
  onClick,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`flex items-center justify-between rounded-2xl border p-4 text-left shadow-sm ${
        active ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white'
      } ${onClick ? 'cursor-pointer hover:border-indigo-300' : 'cursor-default'}`}
    >
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
        <div className="mt-1 font-mono text-xl font-bold text-slate-900">{value}</div>
        {subtitle && <div className="mt-0.5 text-[10px] text-slate-500">{subtitle}</div>}
      </div>
      {icon && <div className="rounded-xl bg-slate-100 p-3 text-indigo-600">{icon}</div>}
    </button>
  );
}
