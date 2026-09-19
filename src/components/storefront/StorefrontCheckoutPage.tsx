import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import type { StorefrontCartLine } from './StorefrontCartPage';

interface Props {
  tenantSlug: string;
  items: StorefrontCartLine[];
  onClearCart: () => void;
  onNavigate: (path: string) => void;
  customerUid?: string | null;
}

export default function StorefrontCheckoutPage({ tenantSlug, items, onClearCart, onNavigate, customerUid }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [shippingMethod, setShippingMethod] = useState('standard');
  const [couponCode, setCouponCode] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const payloadItems = useMemo(() => items.map(item => ({
    productId: item.productId,
    variantSku: item.variantSku,
    quantity: item.quantity,
    price: item.price,
  })), [items]);

  useEffect(() => {
    if (!items.length) return;
    let cancelled = false;
    setLoadingQuote(true);
    setError('');
    fetch('/api/storefront/' + encodeURIComponent(tenantSlug) + '/checkout/validate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: payloadItems, couponCode, shippingMethod }),
    }).then(async response => {
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || 'Unable to validate checkout.');
      if (!cancelled) setQuote(json.quote);
    }).catch(err => { if (!cancelled) setError(err?.message || 'Unable to validate checkout.'); })
      .finally(() => { if (!cancelled) setLoadingQuote(false); });
    return () => { cancelled = true; };
  }, [tenantSlug, payloadItems, couponCode, shippingMethod, items.length]);

  async function placeOrder(event: React.FormEvent) {
    event.preventDefault();
    if (!items.length) return;
    setPlacing(true); setError('');
    try {
      const response = await fetch('/api/storefront/' + encodeURIComponent(tenantSlug) + '/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: payloadItems, couponCode, shippingMethod, customerUid: customerUid || null,
          customer: { name, email, phone },
          shippingAddress: { addressLine1, city, country },
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || 'Unable to create order.');
      setResult(json);
      onClearCart();
    } catch (err: any) {
      setError(err?.message || 'Unable to create order.');
    } finally { setPlacing(false); }
  }

  if (result?.order) {
    return <div className="min-h-screen bg-slate-50 grid place-items-center p-6"><div className="bg-white border rounded-3xl p-8 max-w-lg w-full text-center">
      <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600" />
      <h1 className="mt-4 text-2xl font-black">Order created</h1>
      <p className="mt-2 text-slate-500">Order {result.order.orderNumber} is awaiting payment.</p>
      <div className="mt-5 p-4 bg-slate-50 rounded-xl text-left text-sm"><div className="font-bold">Keep this order access token</div><p className="mt-1 break-all text-xs text-slate-500">{result.accessToken}</p></div>
      <button onClick={() => onNavigate('/store/' + tenantSlug + '/products')} className="mt-6 px-5 py-3 rounded-xl bg-slate-900 text-white font-bold">Continue shopping</button>
    </div></div>;
  }

  if (!items.length) return <div className="min-h-screen grid place-items-center p-6"><div className="text-center"><h1 className="text-xl font-black">Your cart is empty</h1><button className="mt-4 underline" onClick={() => onNavigate('/store/' + tenantSlug + '/products')}>Back to products</button></div></div>;

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b bg-white"><div className="max-w-5xl mx-auto px-5 py-4 flex items-center gap-4"><button onClick={() => onNavigate('/store/' + tenantSlug + '/cart')} className="p-2 rounded-lg hover:bg-slate-100"><ArrowLeft className="w-5 h-5" /></button><h1 className="font-black text-xl">Secure checkout</h1></div></header>
    <main className="max-w-5xl mx-auto p-5 md:p-8 grid lg:grid-cols-[1fr_340px] gap-6">
      <form onSubmit={placeOrder} className="bg-white border rounded-2xl p-6 space-y-4">
        <h2 className="font-black text-lg">Customer & delivery</h2>
        <input required value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="w-full border rounded-xl px-4 py-3" />
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full border rounded-xl px-4 py-3" />
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" className="w-full border rounded-xl px-4 py-3" />
        <input required value={addressLine1} onChange={e => setAddressLine1(e.target.value)} placeholder="Address" className="w-full border rounded-xl px-4 py-3" />
        <div className="grid grid-cols-2 gap-3"><input required value={city} onChange={e => setCity(e.target.value)} placeholder="City" className="border rounded-xl px-4 py-3" /><input value={country} onChange={e => setCountry(e.target.value)} placeholder="Country" className="border rounded-xl px-4 py-3" /></div>
        <select value={shippingMethod} onChange={e => setShippingMethod(e.target.value)} className="w-full border rounded-xl px-4 py-3"><option value="standard">Standard delivery</option><option value="express">Express delivery</option><option value="pickup">Pickup</option></select>
        <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="Coupon code (optional)" className="w-full border rounded-xl px-4 py-3" />
        {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
        <button disabled={placing || loadingQuote || !quote} type="submit" className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold disabled:opacity-50">{placing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Place order'}</button>
      </form>
      <aside className="bg-white border rounded-2xl p-6 h-fit"><h2 className="font-black">Order summary</h2>{loadingQuote ? <p className="mt-4 text-sm text-slate-500">Validating prices and stock…</p> : quote ? <div className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{quote.pricing.currency} {quote.pricing.subtotal.toFixed(2)}</span></div><div className="flex justify-between"><span>Shipping</span><span>{quote.pricing.currency} {quote.pricing.shippingCost.toFixed(2)}</span></div><div className="flex justify-between"><span>Tax</span><span>{quote.pricing.currency} {quote.pricing.taxAmount.toFixed(2)}</span></div><div className="flex justify-between"><span>Discount</span><span>-{quote.pricing.currency} {quote.pricing.discount.toFixed(2)}</span></div><div className="pt-3 mt-3 border-t flex justify-between font-black"><span>Total</span><span>{quote.pricing.currency} {quote.pricing.grandTotal.toFixed(2)}</span></div></div> : <p className="mt-4 text-sm text-red-600">Checkout quote unavailable.</p>}</aside>
    </main>
  </div>;
}
