import React, { useEffect, useState } from 'react';
import { Package, Plus, RefreshCw, Archive, Wrench, AlertCircle } from 'lucide-react';

type CatalogMode = 'products' | 'services';

interface CatalogProduct {
  id: string;
  name: string;
  sku: string;
  description?: string;
  category?: string;
  brand?: string;
  price: number;
  currency?: string;
  status?: 'Active' | 'Draft' | 'Archived';
  featured?: boolean;
  backorder?: boolean;
  imageUrl?: string;
  tags?: string[];
  tenantId: string;
  businessId: string;
  ecommerce?: {
    slug?: string;
    published?: boolean;
    storefrontStatus?: string;
    publishTargets?: { website?: boolean };
  };
}

interface CatalogService {
  id: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  currency?: string;
  durationMinutes: number;
  status?: 'active' | 'draft' | 'archived';
  bookingEnabled?: boolean;
  published?: boolean;
  tenantId: string;
  businessId: string;
}

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors';

async function requestJson(path: string, options?: RequestInit) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.success === false) {
    throw new Error(json.error || 'The catalog request could not be completed.');
  }
  return json;
}

export default function TenantCatalogManagement({
  tenantId,
  mode,
  onNavigate,
}: {
  tenantId: string;
  mode: CatalogMode;
  onNavigate: (path: string) => void;
}) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [productForm, setProductForm] = useState({
    name: '', sku: '', price: '0', description: '', category: '', brand: '', status: 'Draft' as CatalogProduct['status'],
  });
  const [serviceForm, setServiceForm] = useState({
    name: '', price: '0', durationMinutes: '60', description: '', category: '', status: 'draft' as CatalogService['status'],
    bookingEnabled: true,
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [productResult, serviceResult] = await Promise.all([
        requestJson('/api/tenant/catalog/products'),
        requestJson('/api/tenant/catalog/services'),
      ]);
      setProducts(Array.isArray(productResult.products) ? productResult.products : []);
      setServices(Array.isArray(serviceResult.services) ? serviceResult.services : []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load the tenant catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [tenantId]);

  const resetForms = () => {
    setEditingId(null);
    setProductForm({ name: '', sku: '', price: '0', description: '', category: '', brand: '', status: 'Draft' });
    setServiceForm({ name: '', price: '0', durationMinutes: '60', description: '', category: '', status: 'draft', bookingEnabled: true });
  };

  const editProduct = (product: CatalogProduct) => {
    setEditingId(product.id);
    setProductForm({
      name: product.name || '',
      sku: product.sku || '',
      price: String(product.price ?? 0),
      description: product.description || '',
      category: product.category || '',
      brand: product.brand || '',
      status: product.status || 'Draft',
    });
  };

  const editService = (service: CatalogService) => {
    setEditingId(service.id);
    setServiceForm({
      name: service.name || '',
      price: String(service.price ?? 0),
      durationMinutes: String(service.durationMinutes ?? 60),
      description: service.description || '',
      category: service.category || '',
      status: service.status || 'draft',
      bookingEnabled: service.bookingEnabled !== false,
    });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (mode === 'products') {
        const payload = {
          name: productForm.name,
          sku: productForm.sku,
          price: Number(productForm.price),
          description: productForm.description,
          category: productForm.category,
          brand: productForm.brand,
          status: productForm.status,
        };
        await requestJson(
          editingId ? `/api/tenant/catalog/products/${encodeURIComponent(editingId)}` : '/api/tenant/catalog/products',
          { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(payload) },
        );
      } else {
        const payload = {
          name: serviceForm.name,
          price: Number(serviceForm.price),
          durationMinutes: Number(serviceForm.durationMinutes),
          description: serviceForm.description,
          category: serviceForm.category,
          status: serviceForm.status,
          bookingEnabled: serviceForm.bookingEnabled,
        };
        await requestJson(
          editingId ? `/api/tenant/catalog/services/${encodeURIComponent(editingId)}` : '/api/tenant/catalog/services',
          { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(payload) },
        );
      }
      resetForms();
      await load();
    } catch (err: any) {
      setError(err?.message || 'Unable to save catalog item.');
    } finally {
      setSaving(false);
    }
  };

  const archive = async (id: string) => {
    if (!window.confirm('Archive this catalog item? It will no longer be published.')) return;
    setError('');
    try {
      await requestJson(
        `/api/tenant/catalog/${mode}/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      );
      if (editingId === id) resetForms();
      await load();
    } catch (err: any) {
      setError(err?.message || 'Unable to archive catalog item.');
    }
  };

  const activeItems = mode === 'products' ? products : services;

  return (
    <section className='space-y-6' data-tenant-catalog={mode}>
      <header className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <div className='flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider'>
            {mode === 'products' ? <Package className='h-4 w-4' /> : <Wrench className='h-4 w-4' />}
            Tenant Catalog
          </div>
          <h1 className='mt-1 text-2xl font-bold text-slate-900'>
            {mode === 'products' ? 'Products' : 'Services'}
          </h1>
          <p className='mt-1 text-sm text-slate-500'>
            Manage authoritative catalog records for this tenant. Changes are server-authorized and audited.
          </p>
        </div>
        <div className='flex gap-2'>
          <button type='button' onClick={() => void load()} className={`${buttonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}>
            <RefreshCw className='h-4 w-4' /> Refresh
          </button>
          <button type='button' onClick={resetForms} className={`${buttonClass} bg-indigo-600 text-white hover:bg-indigo-700`}>
            <Plus className='h-4 w-4' /> New {mode === 'products' ? 'Product' : 'Service'}
          </button>
        </div>
      </header>

      {error && (
        <div className='flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800' role='alert'>
          <AlertCircle className='mt-0.5 h-4 w-4 shrink-0' /> <span>{error}</span>
        </div>
      )}

      <form onSubmit={save} className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4'>
        <div className='grid gap-4 md:grid-cols-2'>
          <label className='text-sm font-semibold text-slate-700'>
            Name
            <input className={inputClass} value={mode === 'products' ? productForm.name : serviceForm.name} onChange={e => mode === 'products' ? setProductForm(v => ({ ...v, name: e.target.value })) : setServiceForm(v => ({ ...v, name: e.target.value }))} required />
          </label>
          {mode === 'products' ? (
            <label className='text-sm font-semibold text-slate-700'>
              SKU
              <input className={inputClass} value={productForm.sku} onChange={e => setProductForm(v => ({ ...v, sku: e.target.value }))} required disabled={!!editingId} />
            </label>
          ) : (
            <label className='text-sm font-semibold text-slate-700'>
              Duration (minutes)
              <input className={inputClass} type='number' min='1' max='1440' value={serviceForm.durationMinutes} onChange={e => setServiceForm(v => ({ ...v, durationMinutes: e.target.value }))} required />
            </label>
          )}
          <label className='text-sm font-semibold text-slate-700'>
            Price
            <input className={inputClass} type='number' min='0' step='0.01' value={mode === 'products' ? productForm.price : serviceForm.price} onChange={e => mode === 'products' ? setProductForm(v => ({ ...v, price: e.target.value })) : setServiceForm(v => ({ ...v, price: e.target.value }))} required />
          </label>
          <label className='text-sm font-semibold text-slate-700'>
            Category
            <input className={inputClass} value={mode === 'products' ? productForm.category : serviceForm.category} onChange={e => mode === 'products' ? setProductForm(v => ({ ...v, category: e.target.value })) : setServiceForm(v => ({ ...v, category: e.target.value }))} />
          </label>
          {mode === 'products' && (
            <label className='text-sm font-semibold text-slate-700'>
              Brand
              <input className={inputClass} value={productForm.brand} onChange={e => setProductForm(v => ({ ...v, brand: e.target.value }))} />
            </label>
          )}
          <label className='text-sm font-semibold text-slate-700'>
            Status
            <select className={inputClass} value={mode === 'products' ? productForm.status : serviceForm.status} onChange={e => mode === 'products' ? setProductForm(v => ({ ...v, status: e.target.value as CatalogProduct['status'] })) : setServiceForm(v => ({ ...v, status: e.target.value as CatalogService['status'] }))}>
              {mode === 'products' ? (
                <>
                  <option value='Draft'>Draft</option><option value='Active'>Active</option><option value='Archived'>Archived</option>
                </>
              ) : (
                <>
                  <option value='draft'>Draft</option><option value='active'>Active</option><option value='archived'>Archived</option>
                </>
              )}
            </select>
          </label>
          {mode === 'services' && (
            <label className='flex items-center gap-2 text-sm font-semibold text-slate-700'>
              <input type='checkbox' checked={serviceForm.bookingEnabled} onChange={e => setServiceForm(v => ({ ...v, bookingEnabled: e.target.checked }))} />
              Booking enabled
            </label>
          )}
          <label className='text-sm font-semibold text-slate-700 md:col-span-2'>
            Description
            <textarea className={inputClass} rows={3} value={mode === 'products' ? productForm.description : serviceForm.description} onChange={e => mode === 'products' ? setProductForm(v => ({ ...v, description: e.target.value })) : setServiceForm(v => ({ ...v, description: e.target.value }))} />
          </label>
        </div>
        <div className='flex justify-end gap-2'>
          {editingId && <button type='button' onClick={resetForms} className={`${buttonClass} border border-slate-200 text-slate-600`}>Cancel</button>}
          <button type='submit' disabled={saving} className={`${buttonClass} bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50`}>
            {saving ? 'Saving…' : editingId ? 'Save Changes' : `Create ${mode === 'products' ? 'Product' : 'Service'}`}
          </button>
        </div>
      </form>

      <div className='rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm'>
        <div className='border-b border-slate-100 px-5 py-4 flex items-center justify-between'>
          <h2 className='font-bold text-slate-900'>{mode === 'products' ? 'Product Catalog' : 'Service Catalog'}</h2>
          <span className='text-xs font-semibold text-slate-500'>{activeItems.length} record{activeItems.length === 1 ? '' : 's'}</span>
        </div>
        {loading ? (
          <div className='p-8 text-center text-sm text-slate-500'>Loading authoritative catalog…</div>
        ) : activeItems.length === 0 ? (
          <div className='p-10 text-center text-sm text-slate-500'>No catalog records yet.</div>
        ) : (
          <div className='divide-y divide-slate-100'>
            {mode === 'products' ? products.map(product => (
              <div key={product.id} className='p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <div className='min-w-0'>
                  <div className='font-semibold text-slate-900'>{product.name}</div>
                  <div className='text-xs text-slate-500'>SKU {product.sku} · {product.status || 'Draft'} · {product.currency || 'USD'} {Number(product.price || 0).toFixed(2)}</div>
                  <div className='text-xs text-slate-400 truncate'>{product.description || 'No description'}</div>
                </div>
                <div className='flex gap-2 shrink-0'>
                  <button type='button' onClick={() => editProduct(product)} className='rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700'>Edit</button>
                  {product.status !== 'Archived' && <button type='button' onClick={() => void archive(product.id)} className='rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700'><Archive className='h-3.5 w-3.5 inline mr-1' />Archive</button>}
                </div>
              </div>
            )) : services.map(service => (
              <div key={service.id} className='p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <div className='min-w-0'>
                  <div className='font-semibold text-slate-900'>{service.name}</div>
                  <div className='text-xs text-slate-500'>{service.status || 'draft'} · {service.durationMinutes} min · {service.currency || 'USD'} {Number(service.price || 0).toFixed(2)}</div>
                  <div className='text-xs text-slate-400 truncate'>{service.description || 'No description'}</div>
                </div>
                <div className='flex gap-2 shrink-0'>
                  <button type='button' onClick={() => editService(service)} className='rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700'>Edit</button>
                  {service.status !== 'archived' && <button type='button' onClick={() => void archive(service.id)} className='rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700'><Archive className='h-3.5 w-3.5 inline mr-1' />Archive</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className='text-xs text-slate-400'>Tenant context: {tenantId}. The browser does not send tenantId as an authorization input; the server resolves it from the authenticated tenant membership.</p>
      <button type='button' onClick={() => onNavigate(`/tenant/${tenantId}/dashboard`)} className='text-sm font-semibold text-indigo-600 hover:text-indigo-800'>← Back to tenant dashboard</button>
    </section>
  );
}
