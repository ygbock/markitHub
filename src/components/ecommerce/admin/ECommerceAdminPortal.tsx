import React, { useState } from 'react';
import { 
  ShoppingBag, Layers, Settings, Users, 
  BarChart, Tag, Truck, Gift, LayoutDashboard,
  Search, Star, CheckCircle, Clock
} from 'lucide-react';
import { Product, Order, Customer, StorefrontHomepageConfig } from '../../../types';
import StorefrontManagementModule from '../StorefrontManagementModule';
import ECommerceCatalogModule from './ECommerceCatalogModule';
import ECommercePromotionsModule from './ECommercePromotionsModule';
import ECommerceWishlistAnalytics from './ECommerceWishlistAnalytics';
import ECommerceOrderPipeline from './ECommerceOrderPipeline';

interface ECommerceAdminPortalProps {
  products: Product[];
  orders: Order[];
  customers: Customer[];
  homepageConfig: StorefrontHomepageConfig;
  onSaveHomepageConfig: (newConfig: StorefrontHomepageConfig) => void;
  categories: string[];
  onBackToHome: () => void;
  activeTab: EcommerceAdminTab;
}

export type EcommerceAdminTab = 
  | 'Dashboard'
  | 'Storefront'
  | 'Catalog'
  | 'Orders'
  | 'Customers'
  | 'Promotions'
  | 'Analytics'
  | 'Settings'
  | 'Reviews';

export default function ECommerceAdminPortal({
  products,
  orders,
  customers,
  homepageConfig,
  onSaveHomepageConfig,
  categories,
  onBackToHome,
  activeTab
}: ECommerceAdminPortalProps) {


  const tabs: { id: EcommerceAdminTab; label: string; icon: any }[] = [
    { id: 'Dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'Storefront', label: 'Storefront CMS', icon: Layers },
    { id: 'Catalog', label: 'Online Catalog', icon: ShoppingBag },
    { id: 'Orders', label: 'Fulfillment', icon: Truck },
    { id: 'Customers', label: 'Customers', icon: Users },
    { id: 'Promotions', label: 'Promotions', icon: Gift },
    { id: 'Analytics', label: 'Wishlist Analytics', icon: BarChart },
    { id: 'Settings', label: 'Store Settings', icon: Settings },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">E-Commerce Control Center</h1>
          <p className="text-sm text-slate-500 mt-1">Manage storefront, catalog, promotions, and online fulfillment.</p>
        </div>
        <button 
          onClick={onBackToHome}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          View Live Storefront &rarr;
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">


        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-white p-6 relative">
          {activeTab === 'Storefront' && (
            <StorefrontManagementModule 
              config={homepageConfig}
              onSaveConfig={onSaveHomepageConfig}
              categories={categories}
              products={products}
            />
          )}

          {activeTab === 'Catalog' && (
            <ECommerceCatalogModule products={products} />
          )}

          {activeTab === 'Promotions' && (
            <ECommercePromotionsModule products={products} />
          )}

          {activeTab === 'Analytics' && (
            <ECommerceWishlistAnalytics products={products} orders={orders} />
          )}

          {activeTab === 'Orders' && (
            <ECommerceOrderPipeline orders={orders} />
          )}

          {/* Placeholders for others */}
          {['Dashboard', 'Customers', 'Settings'].includes(activeTab) && (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
              <Settings className="w-16 h-16 text-slate-200 mb-4" />
              <h2 className="text-xl font-bold text-slate-800">{activeTab} Module</h2>
              <p className="text-slate-500 mt-2">
                This module is structurally registered in the architecture and connects to the centralized E-Commerce APIs.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
