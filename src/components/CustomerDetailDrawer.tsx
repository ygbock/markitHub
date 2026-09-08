import React, { useState, useMemo } from 'react';
import { Customer, Order, SupportTicket, Product, WishlistItem } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import CustomerLifetimeValueChart from './CustomerLifetimeValueChart';
import { loadWishlistItems } from '../utils/wishlistManager';
import { 
  X, User, Mail, Phone, MapPin, Award, Calendar, 
  ShoppingBag, Tag, MessageSquare, Send, Sparkles, 
  Clock, DollarSign, Edit3, Trash2, CheckCircle2, 
  AlertCircle, ChevronRight, ArrowUpRight, ShieldCheck,
  Smartphone, Plus, Minus, FileText, Check, ExternalLink,
  Heart, Bell, ArrowRight
} from 'lucide-react';

interface CustomerDetailDrawerProps {
  isOpen: boolean;
  customer: Customer | null;
  orders: Order[];
  tickets: SupportTicket[];
  products?: Product[];
  onClose: () => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customerId: string) => void;
  onUpdatePoints: (customerId: string, newPoints: number, reason: string) => void;
  onSendMessage: (customer: Customer, channel: 'email' | 'sms' | 'whatsapp', subject: string, message: string) => void;
  onCreateTicket: (customerId: string, subject: string, category: any, priority: any, description: string) => void;
  onResolveTicket: (ticketId: string) => void;
}

export default function CustomerDetailDrawer({
  isOpen,
  customer,
  orders,
  tickets,
  products = [],
  onClose,
  onEdit,
  onDelete,
  onUpdatePoints,
  onSendMessage,
  onCreateTicket,
  onResolveTicket
}: CustomerDetailDrawerProps) {
  const { formatAmount } = useCurrency();
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'loyalty' | 'wishlist' | 'messages' | 'tickets'>('overview');
  
  // Point adjustment local state
  const [pointDelta, setPointDelta] = useState<number>(50);
  const [pointReason, setPointReason] = useState('Customer satisfaction bonus');
  const [showPointAdjuster, setShowPointAdjuster] = useState(false);

  // Quick Notes editing
  const [localNotes, setLocalNotes] = useState(customer?.notes || '');
  const [isNotesSaved, setIsNotesSaved] = useState(false);

  // 1-on-1 messaging state
  const [msgChannel, setMsgChannel] = useState<'email' | 'sms' | 'whatsapp'>('email');
  const [msgSubject, setMsgSubject] = useState('Important Account Update from Nexus');
  const [msgBody, setMsgBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  // New ticket state
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState<'Order Issue' | 'Product Inquiry' | 'Loyalty Redemption' | 'Billing & Refund' | 'General'>('Order Issue');
  const [ticketPriority, setTicketPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [ticketDescription, setTicketDescription] = useState('');

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen || !customer) return null;

  // Filter orders for this customer
  const customerOrders = orders.filter(o => 
    o.customerId === customer.id || 
    (o.customerName && o.customerName.toLowerCase() === customer.name.toLowerCase()) ||
    (customer.purchaseHistoryIds && customer.purchaseHistoryIds.includes(o.id))
  );

  // Customer lifetime metrics
  const totalSpent = customerOrders.reduce((sum, o) => sum + (o.status === 'Completed' ? o.total : 0), 0);
  const totalOrdersCount = customerOrders.length;
  const averageOrderValue = totalOrdersCount > 0 ? totalSpent / totalOrdersCount : 0;
  const customerTickets = tickets.filter(t => t.customerId === customer.id || t.customerName === customer.name);

  // Resolved Customer Wishlist from CRM Profile / Storage
  const customerWishlist: WishlistItem[] = useMemo(() => {
    if (!customer) return [];
    if (customer.wishlist && Array.isArray(customer.wishlist) && customer.wishlist.length > 0) {
      return customer.wishlist;
    }
    return loadWishlistItems(customer.id);
  }, [customer]);

  const wishlistValuation = useMemo(() => {
    return customerWishlist.reduce((sum, item) => {
      const prod = products.find(p => p.id === item.productId);
      return sum + (prod ? prod.price : item.priceWhenAdded || 0);
    }, 0);
  }, [customerWishlist, products]);

  // Loyalty Tier Calculation
  const currentPoints = customer.loyaltyPoints || 0;
  const tier = customer.loyaltyTier || (currentPoints >= 1000 ? 'Diamond' : currentPoints >= 500 ? 'Platinum' : currentPoints >= 250 ? 'Gold' : currentPoints >= 100 ? 'Silver' : 'Bronze');
  const nextTierPoints = tier === 'Bronze' ? 100 : tier === 'Silver' ? 250 : tier === 'Gold' ? 500 : tier === 'Platinum' ? 1000 : 2000;
  const tierProgress = Math.min(100, Math.round((currentPoints / nextTierPoints) * 100));

  const handleSaveNotes = () => {
    onEdit({ ...customer, notes: localNotes });
    setIsNotesSaved(true);
    setTimeout(() => setIsNotesSaved(false), 2000);
  };

  const handleApplyPointAdjustment = (delta: number) => {
    const nextPoints = Math.max(0, currentPoints + delta);
    onUpdatePoints(customer.id, nextPoints, pointReason);
    setShowPointAdjuster(false);
  };

  const handleSendDirectMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgBody.trim()) return;
    setIsSending(true);
    setTimeout(() => {
      onSendMessage(customer, msgChannel, msgSubject, msgBody);
      setMsgBody('');
      setIsSending(false);
    }, 400);
  };

  const handleCreateTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim()) return;
    onCreateTicket(customer.id, ticketSubject, ticketCategory, ticketPriority, ticketDescription);
    setTicketSubject('');
    setTicketDescription('');
    setShowNewTicketModal(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden animate-in slide-in-from-right duration-300"
        id="customer-detail-drawer"
      >
        {/* Drawer Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-6 pb-4 sm:pb-5 border-b border-slate-800 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-black text-base sm:text-xl shadow-lg border border-indigo-400/30 shrink-0">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">{customer.name}</h2>
                  <span className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider ${
                    customer.segment === 'VIP' ? 'bg-amber-400 text-slate-900 font-black' :
                    customer.segment === 'Regular' ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/30' :
                    customer.segment === 'New' ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30' :
                    'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {customer.segment}
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-700/50 text-[9px] sm:text-[10px] font-bold">
                    <Award className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-indigo-400" /> {tier}
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                  <a href={`mailto:${customer.email}`} className="flex items-center gap-1 hover:text-white transition-colors truncate">
                    <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" /> 
                    <span className="truncate">{customer.email}</span>
                  </a>
                  <a href={`tel:${customer.phone}`} className="flex items-center gap-1 hover:text-white transition-colors truncate">
                    <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" /> 
                    <span className="truncate">{customer.phone}</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onEdit(customer)}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                title="Edit Customer Profile"
                id="btn-drawer-edit-customer"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                title="Delete Customer Profile"
                id="btn-drawer-delete-customer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer ml-0.5"
                id="btn-drawer-close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 mt-4 sm:mt-5 bg-slate-800/80 p-2.5 sm:p-3 rounded-2xl border border-slate-700/60">
            <div className="text-center p-1 sm:p-0">
              <p className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Spent</p>
              <p className="text-xs sm:text-sm font-extrabold text-white mt-0.5">{formatAmount(totalSpent)}</p>
            </div>
            <div className="text-center border-l sm:border-l border-slate-700/60 p-1 sm:p-0">
              <p className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Orders</p>
              <p className="text-xs sm:text-sm font-extrabold text-white mt-0.5">{totalOrdersCount}</p>
            </div>
            <div className="text-center border-t sm:border-t-0 sm:border-l border-slate-700/60 pt-1.5 sm:pt-0 p-1 sm:p-0">
              <p className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Avg Order</p>
              <p className="text-xs sm:text-sm font-extrabold text-white mt-0.5">{formatAmount(averageOrderValue)}</p>
            </div>
            <div className="text-center border-t sm:border-t-0 sm:border-l border-slate-700/60 pt-1.5 sm:pt-0 p-1 sm:p-0">
              <p className="text-[9px] sm:text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Loyalty</p>
              <p className="text-xs sm:text-sm font-extrabold text-indigo-300 mt-0.5 flex items-center justify-center gap-0.5">
                <Award className="w-3 h-3 text-indigo-400 inline" /> {customer.loyaltyPoints || 0} pts
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-3 sm:px-6 gap-1 sm:gap-2 shrink-0 overflow-x-auto scrollbar-none">
          {[
            { id: 'overview', label: '360° Overview', icon: User },
            { id: 'orders', label: `Orders (${customerOrders.length})`, icon: ShoppingBag },
            { id: 'wishlist', label: `Wishlist (${customerWishlist.length})`, icon: Heart },
            { id: 'loyalty', label: 'Loyalty Ledger', icon: Award },
            { id: 'messages', label: 'Direct Messages', icon: MessageSquare },
            { id: 'tickets', label: `Inquiries (${customerTickets.length})`, icon: AlertCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2.5 sm:py-3 px-2 sm:px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 text-xs text-slate-700 bg-slate-50/50">
          
          {/* TAB 1: 360° OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Contact & Location Details */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <User className="w-3.5 h-3.5 text-indigo-600" /> Account Profile & Address Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Customer Identifier</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">{customer.id}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Customer Since</span>
                    <span className="font-semibold text-slate-800 text-xs">
                      {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'Active Member'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Primary Contact</span>
                    <span className="font-semibold text-slate-800 text-xs block">{customer.email}</span>
                    <span className="text-slate-500 text-xs">{customer.phone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Marketing Consent</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold mt-0.5 ${
                      customer.marketingOptIn !== false 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {customer.marketingOptIn !== false ? <ShieldCheck className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {customer.marketingOptIn !== false ? 'Subscribed (SMS & Email)' : 'Opted Out'}
                    </span>
                  </div>

                  <div className="sm:col-span-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-indigo-600" /> Physical Address
                    </span>
                    {customer.address || customer.city ? (
                      <p className="font-medium text-slate-800 text-xs leading-relaxed">
                        {customer.address && <span>{customer.address}<br /></span>}
                        {[customer.city, customer.state, customer.zip].filter(Boolean).join(', ')}
                      </p>
                    ) : (
                      <p className="text-slate-400 italic text-xs">No physical billing address registered.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags & Segments */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" /> Tags & Target Segments
                </h3>

                <div className="flex flex-wrap gap-1.5">
                  {customer.tags && customer.tags.length > 0 ? (
                    customer.tags.map(t => (
                      <span key={t} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold">
                        #{t}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic text-xs">No audience tags attached.</span>
                  )}
                </div>
              </div>

              {/* Saved Wishlist Preview (CRM Profile Integration) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> Saved Wishlist & Product Interests
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('wishlist')}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    View All ({customerWishlist.length}) <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {customerWishlist.length > 0 ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{customerWishlist.length} item{customerWishlist.length !== 1 ? 's' : ''} saved</span>
                      <span>Total Value: <strong className="text-slate-900 font-mono">{formatAmount(wishlistValuation)}</strong></span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {customerWishlist.slice(0, 4).map((item) => {
                        const prod = products.find(p => p.id === item.productId);
                        const prodName = prod?.name || `Product ID: ${item.productId}`;
                        const prodPrice = prod?.price || item.priceWhenAdded || 0;
                        const inStock = prod ? prod.stock > 0 : true;

                        return (
                          <div key={item.id} className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
                            {prod?.imageUrl ? (
                              <img src={prod.imageUrl} alt={prodName} className="w-9 h-9 rounded-lg object-cover bg-white shrink-0 border border-slate-200" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 font-black text-[10px] flex items-center justify-center shrink-0">
                                {prodName.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-900 text-xs truncate leading-tight">{prodName}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono font-bold text-[11px] text-slate-700">{formatAmount(prodPrice)}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                  inStock ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {inStock ? 'In Stock' : 'Out of Stock'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-1">Customer has no active items saved in their storefront wishlist.</p>
                )}
              </div>

              
              {/* CLV Chart */}
              {customerOrders.length > 0 && (
                <CustomerLifetimeValueChart orders={customerOrders} />
              )}
  
              {/* Internal Relationship Notes (Live Editable) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" /> Internal Staff Relationship Notes
                  </h3>
                  {isNotesSaved && (
                    <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-1 animate-in fade-in">
                      <Check className="w-3 h-3" /> Saved to DB
                    </span>
                  )}
                </div>

                <textarea
                  rows={3}
                  value={localNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  placeholder="Record customer preferences, delivery requirements, negotiated discounts, corporate details..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveNotes}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Save Note
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ORDER HISTORY */}
          {activeTab === 'orders' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Purchase Ledger History</h3>
                  <p className="text-[11px] text-slate-500">All registered POS and storefront transactions</p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-200 px-2.5 py-1 rounded-lg">
                  Total: {formatAmount(totalSpent)}
                </span>
              </div>

              {customerOrders.length > 0 ? (
                <div className="space-y-3">
                  {customerOrders.map(order => (
                    <div key={order.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-900">{order.id}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              order.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              order.status === 'Refunded' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {order.status}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 rounded bg-slate-100">
                              {order.channel}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-0.5 block">
                            {new Date(order.date).toLocaleString()} • Paid via {order.paymentMethod}
                          </span>
                        </div>
                        <span className="text-sm font-black font-mono text-slate-900">
                          {formatAmount(order.total)}
                        </span>
                      </div>

                      {/* Items List */}
                      <div className="space-y-1.5 pl-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[11px] text-slate-600">
                            <span className="font-medium">
                              {item.quantity}x {item.productName}
                              {item.variantSku && <span className="text-slate-400 font-mono text-[9px] ml-1">({item.variantSku})</span>}
                            </span>
                            <span className="font-mono font-semibold text-slate-800">
                              {formatAmount(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
                  <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No Orders Registered Yet</p>
                  <p className="text-[11px] text-slate-400">Transactions processed at POS register or online checkout will show here automatically.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LOYALTY LEDGER */}
          {activeTab === 'loyalty' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Tier Progress Card */}
              <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 p-6 rounded-3xl text-white shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-widest block">Nexus VIP Club</span>
                    <h3 className="text-xl font-black text-white mt-0.5">{tier} Tier Membership</h3>
                  </div>
                  <div className="p-3 bg-white/10 rounded-2xl border border-white/10 text-amber-300">
                    <Award className="w-8 h-8" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-indigo-200 font-semibold">
                    <span>Balance: <strong className="text-white font-mono text-sm">{currentPoints} Points</strong></span>
                    <span>Next Milestone: <strong className="text-white font-mono text-sm">{nextTierPoints} Pts</strong></span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden p-0.5">
                    <div 
                      className="bg-gradient-to-r from-amber-400 to-amber-200 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${tierProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-indigo-300/80 text-right">
                    {nextTierPoints > currentPoints ? `${nextTierPoints - currentPoints} points needed for tier promotion` : 'Highest tier achieved!'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10 text-xs">
                  <div>
                    <span className="text-[10px] text-indigo-300 block">Redemption Value</span>
                    <span className="font-bold text-white text-sm">{formatAmount(currentPoints * 0.05)} Store Credit</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-indigo-300 block">Earning Multiplier</span>
                    <span className="font-bold text-white text-sm">
                      {tier === 'Diamond' ? '2.5x Points' : tier === 'Platinum' ? '2.0x Points' : tier === 'Gold' ? '1.5x Points' : '1.0x Points'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Point Adjustment Tools */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" /> Manual Loyalty Adjustments
                    </h3>
                    <p className="text-[11px] text-slate-400">Award bonus points or deduct returned items</p>
                  </div>
                  <button
                    onClick={() => setShowPointAdjuster(!showPointAdjuster)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all"
                  >
                    {showPointAdjuster ? 'Hide Adjuster' : 'Adjust Points'}
                  </button>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { label: '+25 Bonus Pts', delta: 25 },
                    { label: '+50 Satisfaction Pts', delta: 50 },
                    { label: '+100 VIP Promo', delta: 100 },
                    { label: '-25 Deduction', delta: -25 },
                  ].map(chip => (
                    <button
                      key={chip.label}
                      onClick={() => handleApplyPointAdjustment(chip.delta)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        chip.delta > 0 
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200' 
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* Custom Adjuster Form */}
                {showPointAdjuster && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 animate-in fade-in">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Points Delta (+/-)</label>
                        <input
                          type="number"
                          value={pointDelta}
                          onChange={(e) => setPointDelta(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Audit Reason</label>
                        <input
                          type="text"
                          value={pointReason}
                          onChange={(e) => setPointReason(e.target.value)}
                          placeholder="e.g. Birthday reward, Store resolution..."
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleApplyPointAdjustment(pointDelta)}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all"
                    >
                      Apply Adjustment (New Balance: {Math.max(0, currentPoints + pointDelta)} pts)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: SAVED WISHLIST (CRM Profile) */}
          {activeTab === 'wishlist' && (
            <div className="space-y-4 animate-in fade-in duration-150" id="crm-tab-wishlist">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500" /> Customer Wishlist & Saved Products
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Live synchronization with storefront customer profile. {customerWishlist.length} item{customerWishlist.length !== 1 ? 's' : ''} saved.
                  </p>
                </div>

                {customerWishlist.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Wishlist Value</span>
                      <span className="text-xs font-black font-mono text-slate-900">{formatAmount(wishlistValuation)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMsgSubject('Special 10% Discount on Your Wishlist Items!');
                        setMsgBody(`Hi ${customer.name},\n\nWe noticed you saved items in your Nexus wishlist! Complete your purchase today with promo code WISHLIST10 for an exclusive 10% discount.\n\nWarm regards,\nNexus Team`);
                        setActiveTab('messages');
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Send Wishlist Promo</span>
                    </button>
                  </div>
                )}
              </div>

              {customerWishlist.length > 0 ? (
                <div className="space-y-3">
                  {customerWishlist.map((item) => {
                    const prod = products.find(p => p.id === item.productId);
                    const prodName = prod?.name || `Product #${item.productId}`;
                    const currentPrice = prod?.price || item.priceWhenAdded || 0;
                    const originalPrice = prod?.originalPrice || item.priceWhenAdded;
                    const inStock = prod ? prod.stock > 0 : true;
                    const hasPriceDrop = originalPrice && originalPrice > currentPrice;

                    return (
                      <div 
                        key={item.id}
                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {prod?.imageUrl ? (
                            <img src={prod.imageUrl} alt={prodName} className="w-14 h-14 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0" />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-indigo-50 text-indigo-600 font-black text-sm flex items-center justify-center shrink-0 border border-indigo-100">
                              {prodName.slice(0, 2).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                              {prod?.brand || prod?.category || 'Catalog Item'}
                            </span>
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate mt-0.5">
                              {prodName}
                            </h4>

                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs sm:text-sm font-black font-mono text-slate-900">
                                {formatAmount(currentPrice)}
                              </span>
                              {hasPriceDrop && (
                                <span className="text-[11px] text-slate-400 line-through font-mono">
                                  {formatAmount(originalPrice)}
                                </span>
                              )}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                inStock 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                  : 'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}>
                                {inStock ? `${prod ? prod.stock : 'In'} Available in Stock` : 'Out of Stock'}
                              </span>
                              {item.selectedVariantSku && (
                                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  SKU: {item.selectedVariantSku}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1.5">
                              <span>Saved: {new Date(item.addedAt).toLocaleDateString()}</span>
                              {item.notifyPriceDrop && (
                                <span className="inline-flex items-center gap-0.5 text-indigo-600 font-medium">
                                  <Bell className="w-2.5 h-2.5" /> Price Alerts Active
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setMsgSubject(`Special Offer for ${prodName}`);
                              setMsgBody(`Hi ${customer.name},\n\nWe have an exclusive offer just for you on "${prodName}". Get it today at ${formatAmount(currentPrice)} with free priority dispatch!\n\nNexus Store`);
                              setActiveTab('messages');
                            }}
                            className="px-3 py-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Targeted Offer</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
                  <Heart className="w-8 h-8 text-rose-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Wishlist is Empty</p>
                  <p className="text-[11px] text-slate-400">
                    When this customer saves items on the storefront, their choices will automatically persist here for personalized CRM engagement.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DIRECT MESSAGES */}
          {activeTab === 'messages' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-indigo-600" /> Direct Customer Communication
                    </h3>
                    <p className="text-[11px] text-slate-400">Send personalized SMS, Email, or WhatsApp updates</p>
                  </div>
                </div>

                <form onSubmit={handleSendDirectMessage} className="space-y-3.5">
                  {/* Channel Picker */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'email', label: 'Email (SendGrid)', icon: Mail },
                      { id: 'sms', label: 'SMS (Twilio)', icon: Smartphone },
                      { id: 'whatsapp', label: 'WhatsApp API', icon: MessageSquare },
                    ].map(ch => {
                      const Icon = ch.icon;
                      const isSelected = msgChannel === ch.id;
                      return (
                        <button
                          type="button"
                          key={ch.id}
                          onClick={() => setMsgChannel(ch.id as any)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {ch.label}
                        </button>
                      );
                    })}
                  </div>

                  {msgChannel === 'email' && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Subject</label>
                      <input
                        type="text"
                        required
                        value={msgSubject}
                        onChange={(e) => setMsgSubject(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-bold text-slate-500">Message Payload</label>
                      <span className="text-[10px] text-slate-400 font-mono">{msgBody.length} chars</span>
                    </div>
                    <textarea
                      required
                      rows={4}
                      value={msgBody}
                      onChange={(e) => setMsgBody(e.target.value)}
                      placeholder={
                        msgChannel === 'email'
                          ? `Hi ${customer.name},\nWe appreciate your loyalty! As a ${tier} member, here is a special offer for your next visit...`
                          : `Hi ${customer.name}! Nexus POS Alert: You have ${currentPoints} loyalty points ready to redeem!`
                      }
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Quick Templates */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Quick Templates</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: '🎁 Loyalty Reward', text: `Hi ${customer.name}! Thank you for being a valued customer. We just credited your account with bonus points!` },
                        { label: '📦 Order Ready', text: `Hi ${customer.name}! Your order has been prepared and is ready for pickup or expedited shipping.` },
                        { label: '⭐ VIP Exclusive', text: `Exclusive VIP preview for ${customer.name}: Enjoy 20% off all catalog items this weekend!` }
                      ].map(tmpl => (
                        <button
                          type="button"
                          key={tmpl.label}
                          onClick={() => setMsgBody(tmpl.text)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors"
                        >
                          {tmpl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSending || !msgBody.trim()}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5"
                    id="btn-drawer-send-message"
                  >
                    <Send className="w-3.5 h-3.5" /> {isSending ? 'Transmitting...' : 'Dispatch Message Payload'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 5: SUPPORT TICKETS */}
          {activeTab === 'tickets' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Linked Customer Inquiries</h3>
                  <p className="text-[11px] text-slate-500">Service requests and resolutions</p>
                </div>
                <button
                  onClick={() => setShowNewTicketModal(true)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Log Inquiry
                </button>
              </div>

              {/* Log Ticket Form if open */}
              {showNewTicketModal && (
                <form onSubmit={handleCreateTicketSubmit} className="bg-white p-4 rounded-2xl border border-indigo-200 bg-indigo-50/20 shadow-xs space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                    <h4 className="text-xs font-bold text-indigo-900">New Inquiry Ticket</h4>
                    <button type="button" onClick={() => setShowNewTicketModal(false)} className="text-xs text-slate-400 hover:text-slate-700">✕</button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Subject / Issue Summary</label>
                    <input
                      type="text"
                      required
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="e.g. Return authorization, warranty check..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Category</label>
                      <select
                        value={ticketCategory}
                        onChange={(e) => setTicketCategory(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      >
                        <option value="Order Issue">Order Issue</option>
                        <option value="Product Inquiry">Product Inquiry</option>
                        <option value="Loyalty Redemption">Loyalty Redemption</option>
                        <option value="Billing & Refund">Billing & Refund</option>
                        <option value="General">General</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Priority</label>
                      <select
                        value={ticketPriority}
                        onChange={(e) => setTicketPriority(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={ticketDescription}
                      onChange={(e) => setTicketDescription(e.target.value)}
                      placeholder="Details of inquiry or customer question..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowNewTicketModal(false)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                    >
                      Save Ticket
                    </button>
                  </div>
                </form>
              )}

              {/* Tickets List */}
              {customerTickets.length > 0 ? (
                <div className="space-y-2.5">
                  {customerTickets.map(ticket => (
                    <div key={ticket.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-900">{ticket.id}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              ticket.priority === 'Urgent' ? 'bg-rose-500 text-white' :
                              ticket.priority === 'High' ? 'bg-amber-500 text-white' :
                              'bg-slate-200 text-slate-700'
                            }`}>
                              {ticket.priority}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 rounded bg-slate-100">
                              {ticket.category}
                            </span>
                          </div>
                          <p className="font-bold text-xs text-slate-900 pt-0.5">{ticket.subject}</p>
                          {ticket.description && (
                            <p className="text-[11px] text-slate-600">{ticket.description}</p>
                          )}
                        </div>

                        {ticket.status === 'Resolved' || ticket.status === 'Closed' ? (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                          </span>
                        ) : (
                          <button
                            onClick={() => onResolveTicket(ticket.id)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-emerald-600 hover:text-white text-amber-800 border border-amber-200 rounded-lg text-[10px] font-bold transition-all shrink-0"
                          >
                            Mark Resolved
                          </button>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-2 flex justify-between">
                        <span>Logged: {new Date(ticket.date).toLocaleString()}</span>
                        <span>Status: <strong className="text-slate-700">{ticket.status}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No Support Inquiries Logged</p>
                  <p className="text-[11px] text-slate-400">All customer support issues, returns, and notes will be tracked here.</p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Delete Confirmation Modal Overlay */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-slate-900">Delete Customer Record?</h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to permanently remove <strong>{customer.name}</strong> from the central CRM directory?
                </p>
              </div>
              <div className="flex gap-2 justify-center pt-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDelete(customer.id);
                    setShowDeleteConfirm(false);
                    onClose();
                  }}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 shadow-md"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
