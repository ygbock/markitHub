import React, { useState, useMemo } from 'react';
import { Customer, Order, SupportTicket, CampaignLog, Product } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import CustomerFormModal from './CustomerFormModal';
import CustomerDetailDrawer from './CustomerDetailDrawer';
import CustomerImportExportModal from './CustomerImportExportModal';
import CampaignBroadcastModal from './CampaignBroadcastModal';
import { 
  Users, UserPlus, Search, Mail, Phone, Tag, Award, 
  MessageSquare, Send, Sparkles, AlertCircle, CheckCircle2, 
  Trash2, Edit2, Eye, Upload, Download, Filter, 
  ArrowUpDown, SlidersHorizontal, LayoutGrid, List, 
  CheckSquare, Square, ShieldCheck, DollarSign, Clock, 
  Plus, RefreshCw, Smartphone, Layers, HelpCircle, Check, 
  TrendingUp, Star, ChevronRight, X, MapPin
} from 'lucide-react';

interface CRMModuleProps {
  customers: Customer[];
  orders?: Order[];
  products?: Product[];
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer?: (customer: Customer) => void;
  onDeleteCustomer?: (customerId: string) => void;
  staffRole: string;
  activeStaffName?: string;
}

export default function CRMModule({
  customers,
  orders = [],
  products = [],
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  staffRole,
  activeStaffName = 'Elena Rostova'
}: CRMModuleProps) {
  const { formatAmount } = useCurrency();

  // Active view: 'directory' | 'tickets' | 'campaigns'
  const [activeMainTab, setActiveMainTab] = useState<'directory' | 'tickets' | 'campaigns'>('directory');

  // Search, Segment & Tier Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<string>('All');
  const [selectedTier, setSelectedTier] = useState<string>('All');
  const [optInFilter, setOptInFilter] = useState<'All' | 'OptedIn' | 'OptedOut'>('All');
  const [sortBy, setSortBy] = useState<'name' | 'points' | 'spent' | 'orders' | 'recent'>('points');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Multi-Selection State
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  // Modal / Drawer States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [inspectingCustomer, setInspectingCustomer] = useState<Customer | null>(null);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);

  // Tickets State
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([
    {
      id: 'tkt-401',
      customerId: 'cust-201',
      customerName: 'Sarah Connor',
      subject: 'Inquire about AeroSound ANC size fits & warranty',
      category: 'Product Inquiry',
      priority: 'Medium',
      status: 'Open',
      date: '2026-08-14T11:20:00-07:00',
      description: 'Customer asked whether the ANC earcups fit comfortably for continuous long flights.',
      assignedStaff: activeStaffName
    },
    {
      id: 'tkt-402',
      customerId: 'cust-202',
      customerName: 'Miles Dyson',
      subject: 'Invoice tax breakdown on smartwatch purchase',
      category: 'Billing & Refund',
      priority: 'High',
      status: 'Pending',
      date: '2026-08-15T14:10:00-07:00',
      description: 'Requesting updated tax-exempt receipt for corporate tech expenditure.',
      assignedStaff: activeStaffName
    }
  ]);
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('All');
  const [ticketCategoryFilter, setTicketCategoryFilter] = useState<string>('All');

  // Campaign Dispatches Log State
  const [campaignLogs, setCampaignLogs] = useState<CampaignLog[]>([
    {
      id: 'cmp-101',
      channel: 'email',
      targetType: 'segment',
      targetLabel: 'VIP Segment Audience',
      subject: 'Exclusive VIP Double Loyalty Weekend',
      message: 'Hi {{customer_name}}, enjoy double points on all store items this Saturday & Sunday!',
      recipientCount: customers.filter(c => c.segment === 'VIP').length || 1,
      timestamp: '2026-08-12T09:30:00-07:00',
      status: 'Delivered'
    },
    {
      id: 'cmp-102',
      channel: 'sms',
      targetType: 'all',
      targetLabel: 'Complete Customer Directory',
      message: 'Nexus Flash Alert: New outdoor gear catalog just dropped in showroom! Use code FLASH15.',
      recipientCount: customers.length,
      timestamp: '2026-08-14T16:00:00-07:00',
      status: 'Delivered'
    }
  ]);

  // Compute spend stats mapping per customer for rapid lookup
  const customerSpendMap = useMemo(() => {
    const map: { [key: string]: { totalSpent: number; orderCount: number; lastDate?: string } } = {};
    orders.forEach(o => {
      const custId = o.customerId || '';
      const custName = (o.customerName || '').toLowerCase();
      
      const key = custId || custName;
      if (!key) return;

      if (!map[key]) {
        map[key] = { totalSpent: 0, orderCount: 0 };
      }
      if (o.status === 'Completed') {
        map[key].totalSpent += o.total;
      }
      map[key].orderCount += 1;
      if (!map[key].lastDate || new Date(o.date) > new Date(map[key].lastDate!)) {
        map[key].lastDate = o.date;
      }
    });
    return map;
  }, [orders]);

  const getCustomerMetrics = (c: Customer) => {
    const byId = customerSpendMap[c.id];
    const byName = customerSpendMap[c.name.toLowerCase()];
    const totalSpent = (byId?.totalSpent || 0) + (byName?.totalSpent || 0);
    const orderCount = Math.max(byId?.orderCount || 0, byName?.orderCount || 0, c.purchaseHistoryIds?.length || 0);
    return { totalSpent, orderCount };
  };

  // KPI Calculations
  const totalContacts = customers.length;
  const vipCount = customers.filter(c => c.segment === 'VIP').length;
  const vipPercentage = totalContacts > 0 ? Math.round((vipCount / totalContacts) * 100) : 0;
  
  const totalLifetimeRevenue = orders
    .filter(o => o.status === 'Completed')
    .reduce((sum, o) => sum + o.total, 0);

  const totalLoyaltyLiability = customers.reduce((sum, c) => sum + (c.loyaltyPoints || 0), 0);
  const avgLTV = totalContacts > 0 ? totalLifetimeRevenue / totalContacts : 0;

  // Filter & Sort Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // Search
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        c.name.toLowerCase().includes(search) || 
        c.email.toLowerCase().includes(search) || 
        c.phone.includes(search) ||
        (c.city && c.city.toLowerCase().includes(search)) ||
        (c.tags && c.tags.some(t => t.toLowerCase().includes(search))) ||
        c.id.toLowerCase().includes(search);

      // Segment
      const matchesSegment = selectedSegment === 'All' || c.segment === selectedSegment;

      // Tier
      const tier = c.loyaltyTier || (c.loyaltyPoints >= 1000 ? 'Diamond' : c.loyaltyPoints >= 500 ? 'Platinum' : c.loyaltyPoints >= 250 ? 'Gold' : c.loyaltyPoints >= 100 ? 'Silver' : 'Bronze');
      const matchesTier = selectedTier === 'All' || tier === selectedTier;

      // Marketing Opt-In
      const matchesOptIn = 
        optInFilter === 'All' ? true :
        optInFilter === 'OptedIn' ? c.marketingOptIn !== false :
        c.marketingOptIn === false;

      return matchesSearch && matchesSegment && matchesTier && matchesOptIn;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'points') {
        comparison = (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0);
      } else if (sortBy === 'spent') {
        const spentA = getCustomerMetrics(a).totalSpent;
        const spentB = getCustomerMetrics(b).totalSpent;
        comparison = spentB - spentA;
      } else if (sortBy === 'orders') {
        const ordersA = getCustomerMetrics(a).orderCount;
        const ordersB = getCustomerMetrics(b).orderCount;
        comparison = ordersB - ordersA;
      } else if (sortBy === 'recent') {
        comparison = (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      }
      return sortOrder === 'desc' ? comparison : -comparison;
    });
  }, [customers, searchTerm, selectedSegment, selectedTier, optInFilter, sortBy, sortOrder, customerSpendMap]);

  // Multi-Selection Handlers
  const handleToggleSelectAll = () => {
    if (selectedCustomerIds.length === filteredCustomers.length && filteredCustomers.length > 0) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(filteredCustomers.map(c => c.id));
    }
  };

  const handleToggleSelectCustomer = (id: string) => {
    if (selectedCustomerIds.includes(id)) {
      setSelectedCustomerIds(selectedCustomerIds.filter(i => i !== id));
    } else {
      setSelectedCustomerIds([...selectedCustomerIds, id]);
    }
  };

  // Bulk Operations
  const handleBulkChangeSegment = (newSegment: 'VIP' | 'Regular' | 'New' | 'Inactive') => {
    if (!onUpdateCustomer || selectedCustomerIds.length === 0) return;
    selectedCustomerIds.forEach(id => {
      const found = customers.find(c => c.id === id);
      if (found) {
        onUpdateCustomer({ ...found, segment: newSegment });
      }
    });
    alert(`Updated segment to "${newSegment}" for ${selectedCustomerIds.length} customer records.`);
    setSelectedCustomerIds([]);
  };

  const handleBulkAwardPoints = (points: number) => {
    if (!onUpdateCustomer || selectedCustomerIds.length === 0) return;
    selectedCustomerIds.forEach(id => {
      const found = customers.find(c => c.id === id);
      if (found) {
        onUpdateCustomer({ 
          ...found, 
          loyaltyPoints: (found.loyaltyPoints || 0) + points 
        });
      }
    });
    alert(`Credited ${points} bonus loyalty points to ${selectedCustomerIds.length} customer accounts!`);
    setSelectedCustomerIds([]);
  };

  const handleBulkDelete = () => {
    if (!onDeleteCustomer || selectedCustomerIds.length === 0) return;
    if (window.confirm(`Are you sure you want to permanently delete ${selectedCustomerIds.length} customer records?`)) {
      selectedCustomerIds.forEach(id => onDeleteCustomer(id));
      setSelectedCustomerIds([]);
    }
  };

  // Customer Actions
  const handleSaveCustomer = (cust: Customer) => {
    if (customers.some(c => c.id === cust.id)) {
      if (onUpdateCustomer) onUpdateCustomer(cust);
    } else {
      onAddCustomer(cust);
    }
    if (inspectingCustomer && inspectingCustomer.id === cust.id) {
      setInspectingCustomer(cust);
    }
  };

  const handleQuickAdjustPoints = (customerId: string, newPoints: number, reason: string) => {
    const found = customers.find(c => c.id === customerId);
    if (found && onUpdateCustomer) {
      const updated = { ...found, loyaltyPoints: newPoints };
      onUpdateCustomer(updated);
      if (inspectingCustomer && inspectingCustomer.id === customerId) {
        setInspectingCustomer(updated);
      }
    }
  };

  const handleImportCustomers = (imported: Customer[]) => {
    imported.forEach(c => onAddCustomer(c));
    alert(`Successfully imported ${imported.length} new customer accounts into CRM!`);
  };

  const handleDispatchCampaign = (log: CampaignLog) => {
    setCampaignLogs([log, ...campaignLogs]);
  };

  const handleDirectSendMessage = (customer: Customer, channel: 'email' | 'sms' | 'whatsapp', subject: string, message: string) => {
    const log: CampaignLog = {
      id: `cmp-direct-${Date.now()}`,
      channel,
      targetType: 'single',
      targetLabel: `${customer.name} (${customer.email || customer.phone})`,
      subject: channel === 'email' ? subject : undefined,
      message,
      recipientCount: 1,
      timestamp: new Date().toISOString(),
      status: 'Delivered'
    };
    setCampaignLogs([log, ...campaignLogs]);
    alert(`DISPATCH CONFIRMED!\n\nChannel: ${channel.toUpperCase()}\nRecipient: ${customer.name}\nMessage: ${message.slice(0, 100)}...`);
  };

  const handleCreateSupportTicket = (customerId: string, subject: string, category: any, priority: any, description: string) => {
    const cust = customers.find(c => c.id === customerId);
    const newTkt: SupportTicket = {
      id: `tkt-${Math.floor(400 + Math.random() * 999)}`,
      customerId,
      customerName: cust?.name || 'Walk-in Guest',
      subject,
      category,
      priority,
      status: 'Open',
      date: new Date().toISOString(),
      description,
      assignedStaff: activeStaffName
    };
    setSupportTickets([newTkt, ...supportTickets]);
    alert('Support inquiry logged on customer timeline!');
  };

  const handleResolveSupportTicket = (ticketId: string) => {
    setSupportTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: 'Resolved' } : t));
  };

  // Filter Support Tickets
  const filteredTickets = supportTickets.filter(t => {
    const matchesSearch = 
      t.subject.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      t.customerName.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      t.id.toLowerCase().includes(ticketSearch.toLowerCase());
    const matchesStatus = ticketStatusFilter === 'All' || t.status === ticketStatusFilter;
    const matchesCat = ticketCategoryFilter === 'All' || t.category === ticketCategoryFilter;
    return matchesSearch && matchesStatus && matchesCat;
  });

  return (
    <div className="space-y-6" id="crm-module-root">
      
      {/* Top Header & Global Actions Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3.5 sm:gap-4 bg-white p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs" id="crm-top-bar">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Customer Relationship Management</h1>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Unified directory, VIP tier tracking, omni-channel campaigns & client inquiries.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Trigger Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 w-full lg:w-auto justify-between sm:justify-end flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setIsImportExportModalOpen(true)}
            className="flex-1 sm:flex-none px-2.5 sm:px-3.5 py-2 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
            id="btn-crm-import-export"
          >
            <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
            <span>CSV Hub</span>
          </button>

          <button
            onClick={() => setIsCampaignModalOpen(true)}
            className="flex-1 sm:flex-none px-2.5 sm:px-3.5 py-2 sm:py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
            id="btn-crm-broadcast-campaign"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" /> 
            <span className="hidden xs:inline">Campaign </span><span>Studio</span>
          </button>

          <button
            onClick={() => {
              setEditingCustomer(null);
              setIsFormModalOpen(true);
            }}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
            id="btn-crm-add-customer"
          >
            <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
            <span className="hidden xs:inline">Register </span><span>Client</span>
          </button>
        </div>
      </div>

      {/* Real-Time Telemetry KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4" id="crm-telemetry-kpis">
        <div className="bg-white p-3 sm:p-4 lg:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5">
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">CRM Profiles</p>
            <h3 className="text-sm sm:text-lg font-black text-slate-900 mt-0.5 truncate">{totalContacts} Accounts</h3>
            <span className="text-[9px] sm:text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-0.5 truncate">
              <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" /> {customers.filter(c => c.segment === 'New').length} new
            </span>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 lg:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5">
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">Gross Revenue</p>
            <h3 className="text-sm sm:text-lg font-black text-slate-900 mt-0.5 truncate">{formatAmount(totalLifetimeRevenue)}</h3>
            <span className="text-[9px] sm:text-[10px] text-slate-500 font-semibold block mt-0.5 truncate">
              Avg LTV: {formatAmount(avgLTV)}
            </span>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 lg:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5">
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Star className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">VIP Tier</p>
            <h3 className="text-sm sm:text-lg font-black text-slate-900 mt-0.5 truncate">{vipCount} Clients</h3>
            <span className="text-[9px] sm:text-[10px] text-amber-700 font-semibold block mt-0.5 truncate">
              {vipPercentage}% client share
            </span>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 lg:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5">
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Award className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">Loyalty Pool</p>
            <h3 className="text-sm sm:text-lg font-black text-indigo-700 mt-0.5 truncate">{totalLoyaltyLiability.toLocaleString()} Pts</h3>
            <span className="text-[9px] sm:text-[10px] text-slate-500 font-semibold block mt-0.5 truncate">
              Val: {formatAmount(totalLoyaltyLiability * 0.05)}
            </span>
          </div>
        </div>
      </div>

      {/* Main View Mode Selector Tabs (Directory vs Support Tickets vs Past Campaigns) */}
      <div className="flex border-b border-slate-200 bg-white p-1.5 sm:p-2 rounded-2xl shadow-xs gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none" id="crm-main-tabs">
        <button
          onClick={() => setActiveMainTab('directory')}
          className={`flex-1 min-w-[120px] py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer ${
            activeMainTab === 'directory'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> 
          <span>Directory</span> 
          <span className="text-[10px] opacity-75 font-mono">({filteredCustomers.length})</span>
        </button>

        <button
          onClick={() => setActiveMainTab('tickets')}
          className={`flex-1 min-w-[130px] py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer ${
            activeMainTab === 'tickets'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> 
          <span className="hidden sm:inline">Support </span><span>Inquiries</span> 
          <span className="text-[10px] opacity-75 font-mono">({supportTickets.filter(t => t.status !== 'Resolved').length})</span>
        </button>

        <button
          onClick={() => setActiveMainTab('campaigns')}
          className={`flex-1 min-w-[120px] py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer ${
            activeMainTab === 'campaigns'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> 
          <span>Campaigns</span> 
          <span className="text-[10px] opacity-75 font-mono">({campaignLogs.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CUSTOMER DIRECTORY */}
      {/* ========================================================================= */}
      {activeMainTab === 'directory' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Filtering & Search Toolbar */}
          <div className="bg-white p-3.5 sm:p-4 lg:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs space-y-3" id="crm-directory-filters">
            {/* Row 1: Search Bar & Sort Dropdown in the Same Row */}
            <div className="flex items-center gap-2 sm:gap-3 w-full">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search clients by name, email, phone, city, tags, or ID..."
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-slate-950 focus:outline-hidden transition-all placeholder:text-slate-400"
                  id="crm-search-input"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-md text-xs cursor-pointer"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sort Selector Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs shrink-0">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0 hidden sm:inline">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer text-xs"
                  id="crm-sort-dropdown"
                >
                  <option value="points">Loyalty Points</option>
                  <option value="spent">Total Spent</option>
                  <option value="orders">Orders Count</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="recent">Date Added</option>
                </select>
                <button
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-1 hover:bg-slate-200 rounded text-slate-600 font-bold ml-0.5 cursor-pointer"
                  title={`Sort Order: ${sortOrder.toUpperCase()}`}
                  id="crm-sort-order-btn"
                >
                  {sortOrder === 'desc' ? '↓' : '↑'}
                </button>
              </div>

              {/* Table vs Grid toggle (Visible on desktop lg+ screens) */}
              <div className="hidden lg:flex bg-slate-100 p-1 rounded-xl border border-slate-200 items-center shrink-0">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'table' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Desktop Table View"
                  id="crm-view-mode-table"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'grid' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Grid Card View"
                  id="crm-view-mode-grid"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Row 2: Segment, Tier & Status Filters in the Same Row */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full pt-2.5 border-t border-slate-100">
              {/* Segment Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 sm:px-3 py-1.5 rounded-xl min-w-0">
                <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />
                <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0 hidden sm:inline">Segment:</span>
                <select
                  value={selectedSegment}
                  onChange={(e) => setSelectedSegment(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-slate-800 focus:outline-hidden cursor-pointer truncate"
                  id="crm-segment-filter-dropdown"
                >
                  <option value="All">All Segments ({customers.length})</option>
                  <option value="VIP">VIP ({customers.filter(c => c.segment === 'VIP').length})</option>
                  <option value="Regular">Regular ({customers.filter(c => c.segment === 'Regular').length})</option>
                  <option value="New">New ({customers.filter(c => c.segment === 'New').length})</option>
                  <option value="Inactive">Inactive ({customers.filter(c => c.segment === 'Inactive').length})</option>
                </select>
              </div>

              {/* Tier Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 sm:px-3 py-1.5 rounded-xl min-w-0">
                <Award className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />
                <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0 hidden sm:inline">Tier:</span>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-slate-800 focus:outline-hidden cursor-pointer truncate"
                  id="crm-tier-filter-dropdown"
                >
                  <option value="All">All Tiers</option>
                  <option value="Bronze">Bronze Tier</option>
                  <option value="Silver">Silver Tier</option>
                  <option value="Gold">Gold Tier</option>
                  <option value="Platinum">Platinum Tier</option>
                  <option value="Diamond">Diamond Tier</option>
                </select>
              </div>

              {/* Status Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 sm:px-3 py-1.5 rounded-xl min-w-0">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />
                <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0 hidden sm:inline">Status:</span>
                <select
                  value={optInFilter}
                  onChange={(e) => setOptInFilter(e.target.value as any)}
                  className="w-full bg-transparent text-xs font-semibold text-slate-800 focus:outline-hidden cursor-pointer truncate"
                  id="crm-status-filter-dropdown"
                >
                  <option value="All">All Statuses</option>
                  <option value="OptedIn">Subscribed</option>
                  <option value="OptedOut">Opted Out</option>
                </select>
              </div>
            </div>
          </div>

          {/* Floating Multi-Select Actions Toolbar */}
          {selectedCustomerIds.length > 0 && (
            <div className="sticky top-3 sm:top-20 z-30 bg-slate-900 text-white p-3 sm:p-3.5 rounded-2xl shadow-xl border border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 animate-in slide-in-from-top duration-200">
              <div className="flex items-center justify-between sm:justify-start gap-2.5">
                <span className="px-2.5 py-1 bg-indigo-600 rounded-lg text-xs font-black">
                  {selectedCustomerIds.length} Selected
                </span>
                <span className="text-xs text-slate-300">Bulk Actions</span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {/* Change Segment dropdown */}
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkChangeSegment(e.target.value as any);
                      e.target.value = '';
                    }
                  }}
                  className="flex-1 sm:flex-none px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 focus:outline-hidden cursor-pointer"
                >
                  <option value="">Move Segment...</option>
                  <option value="VIP">⭐ Promote to VIP</option>
                  <option value="Regular">👤 Set to Regular</option>
                  <option value="New">✨ Mark as New</option>
                  <option value="Inactive">⏸️ Mark Inactive</option>
                </select>

                <button
                  onClick={() => handleBulkAwardPoints(50)}
                  className="px-2.5 py-1.5 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white rounded-xl text-xs font-bold border border-emerald-500/30 transition-all cursor-pointer"
                >
                  +50 Pts
                </button>

                <button
                  onClick={() => setIsCampaignModalOpen(true)}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Campaign
                </button>

                <button
                  onClick={handleBulkDelete}
                  className="p-1.5 bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white rounded-xl text-xs font-bold border border-rose-500/30 transition-all cursor-pointer"
                  title="Delete Selected"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setSelectedCustomerIds([])}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                  title="Clear Selection"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* DESKTOP TABLE VIEW (Rendered strictly on Desktop >= lg screens when table mode is selected) */}
          {viewMode === 'table' && (
            <div className="hidden lg:block bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden" id="crm-table-container">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="px-4 py-3.5 w-10 text-center">
                        <button onClick={handleToggleSelectAll} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                          {selectedCustomerIds.length === filteredCustomers.length && filteredCustomers.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3.5">Customer Profile</th>
                      <th className="px-4 py-3.5">Segment & Tier</th>
                      <th className="px-4 py-3.5">Contact Details</th>
                      <th className="px-4 py-3.5">Total Spent & Orders</th>
                      <th className="px-4 py-3.5">Loyalty Points</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredCustomers.map(cust => {
                      const metrics = getCustomerMetrics(cust);
                      const isSelected = selectedCustomerIds.includes(cust.id);
                      const tier = cust.loyaltyTier || (cust.loyaltyPoints >= 1000 ? 'Diamond' : cust.loyaltyPoints >= 500 ? 'Platinum' : cust.loyaltyPoints >= 250 ? 'Gold' : cust.loyaltyPoints >= 100 ? 'Silver' : 'Bronze');

                      return (
                        <tr 
                          key={cust.id} 
                          className={`hover:bg-slate-50/70 transition-all ${isSelected ? 'bg-indigo-50/40' : ''}`}
                          id={`crm-row-${cust.id}`}
                        >
                          {/* Checkbox */}
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => handleToggleSelectCustomer(cust.id)} className="text-slate-400 hover:text-slate-900 cursor-pointer">
                              {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
                            </button>
                          </td>

                          {/* Profile & Avatar */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                                {cust.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="space-y-0.5">
                                <button
                                  onClick={() => setInspectingCustomer(cust)}
                                  className="font-bold text-slate-900 hover:text-indigo-600 text-left transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  {cust.name}
                                </button>
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  {cust.id}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Segment & Tier Badges */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                                cust.segment === 'VIP' ? 'bg-amber-100 text-amber-900 font-black' :
                                cust.segment === 'Regular' ? 'bg-blue-50 text-blue-700' :
                                cust.segment === 'New' ? 'bg-emerald-50 text-emerald-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                <Tag className="w-2.5 h-2.5" /> {cust.segment}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 text-indigo-700">
                                <Award className="w-2.5 h-2.5" /> {tier}
                              </span>
                            </div>
                          </td>

                          {/* Contact Info */}
                          <td className="px-4 py-3">
                            <div className="space-y-0.5 text-[11px] text-slate-600">
                              <span className="flex items-center gap-1 text-slate-800 font-medium">
                                <Mail className="w-3 h-3 text-slate-400" /> {cust.email}
                              </span>
                              <span className="flex items-center gap-1 text-slate-500 text-[10px]">
                                <Phone className="w-3 h-3 text-slate-400" /> {cust.phone}
                              </span>
                            </div>
                          </td>

                          {/* Financials & Orders */}
                          <td className="px-4 py-3">
                            <div className="space-y-0.5">
                              <span className="font-extrabold font-mono text-slate-900 text-xs block">
                                {formatAmount(metrics.totalSpent)}
                              </span>
                              <span className="text-[10px] text-slate-500 font-semibold block">
                                {metrics.orderCount} orders registered
                              </span>
                            </div>
                          </td>

                          {/* Loyalty Points */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 text-xs flex items-center gap-1">
                                <Award className="w-3.5 h-3.5 text-indigo-600" />
                                {cust.loyaltyPoints || 0} pts
                              </span>
                              <button
                                onClick={() => handleQuickAdjustPoints(cust.id, (cust.loyaltyPoints || 0) + 25, 'Quick 25 pts boost')}
                                className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[9px] font-bold cursor-pointer"
                                title="Quick +25 Points"
                              >
                                +25
                              </button>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setInspectingCustomer(cust)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Inspect 360° Profile"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setEditingCustomer(cust);
                                  setIsFormModalOpen(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Edit Customer Profile"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {onDeleteCustomer && (
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Delete record for ${cust.name}?`)) {
                                      onDeleteCustomer(cust.id);
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Customer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredCustomers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 space-y-2">
                          <Users className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="text-xs font-bold text-slate-700">No Customers Matched Query</p>
                          <p className="text-[11px] text-slate-400">Try adjusting search keywords or clearing segment filters.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* GRID CARD VIEW (Rendered ALWAYS on Mobile & Tablet devices, and on Desktop when Grid mode is selected) */}
          <div 
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 ${
              viewMode === 'grid' ? 'block' : 'lg:hidden'
            }`} 
            id="crm-grid-container"
          >
            {filteredCustomers.map(cust => {
              const metrics = getCustomerMetrics(cust);
              const isSelected = selectedCustomerIds.includes(cust.id);
              const tier = cust.loyaltyTier || (cust.loyaltyPoints >= 1000 ? 'Diamond' : cust.loyaltyPoints >= 500 ? 'Platinum' : cust.loyaltyPoints >= 250 ? 'Gold' : cust.loyaltyPoints >= 100 ? 'Silver' : 'Bronze');

              return (
                <div 
                  key={cust.id} 
                  className={`bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all space-y-3.5 hover:shadow-md flex flex-col justify-between ${
                    isSelected ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Avatar, Name & Select checkbox */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-white flex items-center justify-center font-black text-sm shadow-2xs shrink-0">
                          {cust.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 
                            onClick={() => setInspectingCustomer(cust)}
                            className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer text-xs sm:text-sm truncate"
                            title={cust.name}
                          >
                            {cust.name}
                          </h3>
                          <span className="text-[10px] text-slate-400 font-mono block truncate">{cust.id}</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleToggleSelectCustomer(cust.id)} 
                        className="text-slate-400 hover:text-slate-900 p-1 rounded-lg shrink-0 cursor-pointer"
                        title={isSelected ? 'Deselect customer' : 'Select customer'}
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                      </button>
                    </div>

                    {/* Segment & Tier Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                        cust.segment === 'VIP' ? 'bg-amber-100 text-amber-900 font-black' :
                        cust.segment === 'Regular' ? 'bg-blue-50 text-blue-700' :
                        cust.segment === 'New' ? 'bg-emerald-50 text-emerald-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        <Tag className="w-2.5 h-2.5 shrink-0" /> {cust.segment}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 text-indigo-700">
                        <Award className="w-2.5 h-2.5 shrink-0" /> {tier}
                      </span>
                      {cust.marketingOptIn !== false && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-semibold">
                          <ShieldCheck className="w-2.5 h-2.5 shrink-0" /> Opted In
                        </span>
                      )}
                    </div>

                    {/* Contact Details */}
                    <div className="space-y-1 text-xs text-slate-600 bg-slate-50/80 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-100">
                      <a 
                        href={`mailto:${cust.email}`}
                        className="flex items-center gap-1.5 text-[11px] text-slate-700 hover:text-indigo-600 truncate transition-colors"
                        title={cust.email}
                      >
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> 
                        <span className="truncate">{cust.email}</span>
                      </a>
                      <a 
                        href={`tel:${cust.phone}`}
                        className="flex items-center gap-1.5 text-[11px] text-slate-700 hover:text-indigo-600 truncate transition-colors"
                        title={cust.phone}
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> 
                        <span className="truncate">{cust.phone}</span>
                      </a>
                      {cust.city && (
                        <span className="flex items-center gap-1.5 text-[10px] text-slate-400 truncate">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{cust.city}{cust.state ? `, ${cust.state}` : ''}</span>
                        </span>
                      )}
                    </div>

                    {/* Financial Summary & Loyalty */}
                    <div className="grid grid-cols-2 gap-2 text-center bg-slate-50/70 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border border-slate-100">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">Total Spent</span>
                        <span className="font-mono font-black text-slate-900 text-xs block truncate">
                          {formatAmount(metrics.totalSpent)}
                        </span>
                        <span className="text-[9px] text-slate-400 block truncate">{metrics.orderCount} orders</span>
                      </div>
                      <div className="border-l border-slate-200 pl-1">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">Loyalty</span>
                        <span className="font-mono font-black text-indigo-600 text-xs block truncate">
                          {cust.loyaltyPoints || 0} pts
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAdjustPoints(cust.id, (cust.loyaltyPoints || 0) + 25, 'Quick 25 pts boost');
                          }}
                          className="mt-0.5 px-1.5 py-0.2 text-[9px] font-bold text-indigo-600 hover:bg-indigo-100/60 rounded cursor-pointer"
                          title="Quick +25 Points"
                        >
                          +25 pts
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 mt-2">
                    <button
                      onClick={() => setInspectingCustomer(cust)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/70 px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect 360°</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingCustomer(cust);
                          setIsFormModalOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Edit Customer Profile"
                      >
                        <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                      {onDeleteCustomer && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete record for ${cust.name}?`)) {
                              onDeleteCustomer(cust.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredCustomers.length === 0 && (
              <div className="col-span-full bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 text-center text-slate-400 space-y-2">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No Customers Matched Query</p>
                <p className="text-[11px] text-slate-400">Try adjusting search keywords or clearing segment filters.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SUPPORT & INQUIRIES HUB */}
      {/* ========================================================================= */}
      {activeMainTab === 'tickets' && (
        <div className="space-y-4 animate-in fade-in" id="crm-tickets-container">
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                placeholder="Search ticket subject or customer..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <select
                value={ticketStatusFilter}
                onChange={(e) => setTicketStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value="All">All Ticket Statuses</option>
                <option value="Open">Open</option>
                <option value="Pending">Pending</option>
                <option value="Resolved">Resolved</option>
              </select>

              <select
                value={ticketCategoryFilter}
                onChange={(e) => setTicketCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value="All">All Categories</option>
                <option value="Order Issue">Order Issue</option>
                <option value="Product Inquiry">Product Inquiry</option>
                <option value="Loyalty Redemption">Loyalty Redemption</option>
                <option value="Billing & Refund">Billing & Refund</option>
              </select>

              <button
                onClick={() => {
                  if (customers[0]) {
                    handleCreateSupportTicket(
                      customers[0].id,
                      'Client Inquired on Order Status',
                      'Order Issue',
                      'Medium',
                      'Customer followed up regarding store pickup timeline.'
                    );
                  }
                }}
                className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Quick Log Ticket
              </button>
            </div>
          </div>

          {/* Tickets Grid / List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTickets.map(ticket => (
              <div key={ticket.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3" id={`ticket-card-${ticket.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900">{ticket.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        ticket.priority === 'Urgent' ? 'bg-rose-500 text-white' :
                        ticket.priority === 'High' ? 'bg-amber-500 text-white' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {ticket.priority}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-bold">
                        {ticket.category}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm pt-0.5">{ticket.subject}</h3>
                    <p className="text-xs text-slate-500 font-medium">Customer: <strong>{ticket.customerName}</strong></p>
                  </div>

                  {ticket.status === 'Resolved' ? (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-bold flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                    </span>
                  ) : (
                    <button
                      onClick={() => handleResolveSupportTicket(ticket.id)}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-emerald-600 hover:text-white text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all shrink-0"
                    >
                      Resolve
                    </button>
                  )}
                </div>

                {ticket.description && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {ticket.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-2.5">
                  <span>Logged: {new Date(ticket.date).toLocaleString()}</span>
                  <span>Assigned: <strong>{ticket.assignedStaff || activeStaffName}</strong></span>
                </div>
              </div>
            ))}

            {filteredTickets.length === 0 && (
              <div className="md:col-span-2 bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No Support Tickets Found</p>
                <p className="text-[11px] text-slate-400">All customer inquiries are resolved or no tickets match the filters.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DISPATCHED CAMPAIGNS LOG */}
      {/* ========================================================================= */}
      {activeMainTab === 'campaigns' && (
        <div className="space-y-4 animate-in fade-in" id="crm-campaigns-container">
          <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Campaign Broadcast Dispatch Log</h3>
              <p className="text-xs text-slate-400">Historical delivery telemetry for SMS, Email, and Push broadcasts</p>
            </div>
            <button
              onClick={() => setIsCampaignModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Launch Campaign
            </button>
          </div>

          <div className="space-y-3">
            {campaignLogs.map(camp => (
              <div key={camp.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`p-2 rounded-xl text-xs font-black uppercase flex items-center gap-1 ${
                      camp.channel === 'email' ? 'bg-blue-50 text-blue-700' :
                      camp.channel === 'sms' ? 'bg-indigo-50 text-indigo-700' :
                      'bg-emerald-50 text-emerald-700'
                    }`}>
                      {camp.channel === 'email' ? <Mail className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                      {camp.channel.toUpperCase()}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">
                        {camp.subject || camp.targetLabel}
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        Target: <strong>{camp.targetLabel}</strong> ({camp.recipientCount} recipients)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {camp.status}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(camp.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 font-sans whitespace-pre-wrap">
                  {camp.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS & DRAWERS */}
      {/* ========================================================================= */}

      {/* 1. Add / Edit Customer Modal */}
      <CustomerFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingCustomer(null);
        }}
        onSubmit={handleSaveCustomer}
        initialCustomer={editingCustomer}
      />

      {/* 2. Customer 360° Inspector Drawer */}
      <CustomerDetailDrawer
        isOpen={Boolean(inspectingCustomer)}
        customer={inspectingCustomer}
        orders={orders}
        tickets={supportTickets}
        products={products}
        onClose={() => setInspectingCustomer(null)}
        onEdit={(cust) => {
          setEditingCustomer(cust);
          setIsFormModalOpen(true);
        }}
        onDelete={(id) => {
          if (onDeleteCustomer) onDeleteCustomer(id);
          setInspectingCustomer(null);
        }}
        onUpdatePoints={handleQuickAdjustPoints}
        onSendMessage={handleDirectSendMessage}
        onCreateTicket={handleCreateSupportTicket}
        onResolveTicket={handleResolveSupportTicket}
      />

      {/* 3. CSV Import & Export Modal */}
      <CustomerImportExportModal
        isOpen={isImportExportModalOpen}
        onClose={() => setIsImportExportModalOpen(false)}
        customers={customers}
        onImportCustomers={handleImportCustomers}
      />

      {/* 4. Campaign Studio Modal */}
      <CampaignBroadcastModal
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        customers={customers}
        selectedCustomerIds={selectedCustomerIds}
        onDispatchCampaign={handleDispatchCampaign}
      />

    </div>
  );
}
