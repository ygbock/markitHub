import React, { useState } from 'react';
import { 
  User, Package, Heart, MapPin, Calendar, 
  MessageSquare, Settings, LogOut, ArrowLeft,
  ChevronRight, Clock, Store, CheckCircle2
} from 'lucide-react';
import { Customer, Order } from '../../types';

interface CustomerAccountShellProps {
  customer: Customer;
  orders: Order[];
  onNavigate: (path: string) => void;
  onSignOut: () => void;
  initialTab?: string;
}

export default function CustomerAccountShell({
  customer,
  orders,
  onNavigate,
  onSignOut,
  initialTab = 'orders',
}: CustomerAccountShellProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Filter orders belonging to this customer
  const customerOrders = orders.filter(
    o => o.customerId === customer.id || o.customerName === customer.name
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between" id="customer-account-root">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('/')}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Public Discovery</span>
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="text-xs font-mono uppercase text-slate-500">Customer Portal</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
              {customer.name.charAt(0)}
            </div>
            <span className="text-xs font-bold text-slate-800 hidden sm:inline">{customer.name}</span>
          </div>
          <button
            onClick={onSignOut}
            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Account Area */}
      <main className="max-w-5xl mx-auto w-full py-8 px-4 sm:px-8 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Sidebar Tabs */}
          <div className="md:col-span-1 space-y-1">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 mb-4 text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-full bg-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-md">
                {customer.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{customer.name}</h3>
                <p className="text-xs text-slate-500 truncate">{customer.email}</p>
                <div className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full inline-block mt-1">
                  {customer.loyaltyTier || 'Standard'} Member
                </div>
              </div>
            </div>

            <nav className="space-y-1">
              {[
                { id: 'orders', label: 'My Orders', icon: Package, count: customerOrders.length },
                { id: 'profile', label: 'Profile & Contact', icon: User },
                { id: 'addresses', label: 'Saved Addresses', icon: MapPin },
                { id: 'wishlist', label: 'Wishlist', icon: Heart },
                { id: 'bookings', label: 'My Bookings', icon: Calendar },
                { id: 'messages', label: 'Inquiries', icon: MessageSquare },
                { id: 'settings', label: 'Security & Preferences', icon: Settings },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </div>
                    {tab.count !== undefined && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Account Content */}
          <div className="md:col-span-3 space-y-6">
            
            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Purchase & Order History</h2>
                    <p className="text-xs text-slate-500">Track online deliveries, store pickups, and receipts.</p>
                  </div>
                </div>

                {customerOrders.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <Package className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-500">No orders placed yet.</p>
                    <button
                      onClick={() => onNavigate('/')}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {customerOrders.map(order => (
                      <div key={order.id} className="py-4 flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-900">#{order.orderNumber || order.id}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {order.status || 'Completed'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {order.items?.length || 1} items • {order.date ? new Date(order.date).toLocaleDateString() : 'Recent'}
                          </p>
                        </div>

                        <div className="text-right">
                          <div className="font-black text-sm text-slate-900">
                            ${Number(order.total || 0).toFixed(2)}
                          </div>
                          <button
                            onClick={() => onNavigate(`/store/nexus-retail/orders`)}
                            className="mt-1 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                          >
                            View Receipt
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h2 className="text-base font-bold text-slate-900">Personal Information</h2>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-500 block mb-1">Full Name</label>
                    <div className="font-bold text-slate-800 p-2.5 bg-slate-50 rounded-xl">{customer.name}</div>
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Email Address</label>
                    <div className="font-bold text-slate-800 p-2.5 bg-slate-50 rounded-xl">{customer.email}</div>
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Phone Number</label>
                    <div className="font-bold text-slate-800 p-2.5 bg-slate-50 rounded-xl">{customer.phone || 'Not provided'}</div>
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Loyalty Points</label>
                    <div className="font-bold text-indigo-600 p-2.5 bg-indigo-50 rounded-xl">{customer.loyaltyPoints || 0} pts</div>
                  </div>
                </div>
              </div>
            )}

            {/* Fallback for other tabs */}
            {activeTab !== 'orders' && activeTab !== 'profile' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 text-indigo-600 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900">Section Active</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Your customer account data is synced across verified MikitHub merchant stores.
                </p>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 sm:px-8 text-center text-xs text-slate-500">
        MikitHub Customer Account Workspace
      </footer>
    </div>
  );
}
