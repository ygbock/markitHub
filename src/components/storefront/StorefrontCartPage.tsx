import React from 'react';
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';

export interface StorefrontCartLine {
  productId: string;
  name: string;
  price: number;
  currency?: string;
  imageUrl?: string;
  quantity: number;
  variantSku?: string;
  variantTitle?: string;
}

interface Props {
  tenantSlug: string;
  items: StorefrontCartLine[];
  onUpdateQuantity: (productId: string, variantSku: string | undefined, quantity: number) => void;
  onRemove: (productId: string, variantSku?: string) => void;
  onNavigate: (path: string) => void;
}

export default function StorefrontCartPage({ tenantSlug, items, onUpdateQuantity, onRemove, onNavigate }: Props) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const currency = items[0]?.currency || 'SLE';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center gap-4">
          <button onClick={() => onNavigate('/store/' + tenantSlug + '/products')} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Back"><ArrowLeft className="w-5 h-5" /></button>
          <div><h1 className="font-black text-xl">Your cart</h1><p className="text-xs text-slate-500">{items.length} line item{items.length === 1 ? '' : 's'}</p></div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-5 md:p-8">
        {items.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border">
            <ShoppingBag className="w-10 h-10 mx-auto text-slate-400" />
            <h2 className="mt-4 text-xl font-black">Your cart is empty</h2>
            <button onClick={() => onNavigate('/store/' + tenantSlug + '/products')} className="mt-6 px-5 py-3 rounded-xl bg-slate-900 text-white font-bold">Continue shopping</button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_340px] gap-6">
            <section className="space-y-3">
              {items.map(item => (
                <article key={item.productId + '::' + (item.variantSku || '')} className="bg-white rounded-2xl border p-4 flex gap-4">
                  <img src={item.imageUrl || ''} alt="" className="w-24 h-24 rounded-xl object-cover bg-slate-100" />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold">{item.name}</h2>
                    {item.variantTitle && <p className="text-xs text-slate-500 mt-1">{item.variantTitle}</p>}
                    <p className="mt-2 font-black">{currency} {item.price.toFixed(2)}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <button onClick={() => onUpdateQuantity(item.productId, item.variantSku, Math.max(0, item.quantity - 1))} className="p-1.5 border rounded-lg"><Minus className="w-4 h-4" /></button>
                      <span className="w-8 text-center font-bold">{item.quantity}</span>
                      <button onClick={() => onUpdateQuantity(item.productId, item.variantSku, item.quantity + 1)} className="p-1.5 border rounded-lg"><Plus className="w-4 h-4" /></button>
                      <button onClick={() => onRemove(item.productId, item.variantSku)} className="ml-auto p-1.5 text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </article>
              ))}
            </section>
            <aside className="bg-white rounded-2xl border p-6 h-fit">
              <div className="flex justify-between"><span>Subtotal</span><strong>{currency} {subtotal.toFixed(2)}</strong></div>
              <p className="mt-2 text-xs text-slate-500">Final shipping, tax, discounts, and stock availability are calculated by the server at checkout.</p>
              <button onClick={() => onNavigate('/store/' + tenantSlug + '/checkout')} className="mt-6 w-full py-3 rounded-xl bg-slate-900 text-white font-bold">Proceed to checkout</button>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
