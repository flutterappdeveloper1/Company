/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Store, ShoppingBag, Plus, Trash2, CheckCircle, Clock, XCircle, Search, 
  MapPin, Phone, User, Package, ShoppingCart, Info, AlertTriangle
} from 'lucide-react';
import { Dealer, Shop, Product, Order, OrderItem, Language } from '../types';
import { translations } from '../data';

interface DealerDashboardProps {
  lang: Language;
  dealers: Dealer[];
  shops: Shop[];
  products: Product[];
  orders: Order[];
  
  // State updators
  onUpdateShops: (shops: Shop[]) => void;
  onUpdateOrders: (orders: Order[]) => void;
  onUpdateDealers?: (dealers: Dealer[]) => void;
  loggedInDealerId?: string;
}

export default function DealerDashboard({
  lang,
  dealers,
  shops,
  products,
  orders,
  onUpdateShops,
  onUpdateOrders,
  onUpdateDealers,
  loggedInDealerId
}: DealerDashboardProps) {
  const t = translations[lang];

  // Selected active dealer simulation state
  const [selectedDealerId, setSelectedDealerId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'my-shops' | 'create-order' | 'my-orders'>('my-shops');
  
  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Shop creation state
  const [showAddShop, setShowAddShop] = useState(false);
  const [newShopForm, setNewShopForm] = useState<Omit<Shop, 'id' | 'dealerId'>>({
    name: '',
    ownerName: '',
    phone: '',
    address: ''
  });

  // Basket state for active order creation
  const [orderShopId, setOrderShopId] = useState<string>('');
  const [basket, setBasket] = useState<{ productId: string; quantity: number }[]>([]);
  const [orderSuccessMessage, setOrderSuccessMessage] = useState<string | null>(null);

  // Modern Custom Toast Feedback State
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);

  const showFeedbackMessage = (message: string, type: 'success' | 'warning' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => {
      setFeedback(prev => prev?.message === message ? null : prev);
    }, 4000);
  };

  // Set initial selected dealer
  useEffect(() => {
    if (loggedInDealerId) {
      setSelectedDealerId(loggedInDealerId);
    } else if (dealers.length > 0 && !selectedDealerId) {
      setSelectedDealerId(dealers[0].id);
    }
  }, [dealers, selectedDealerId, loggedInDealerId]);

  const activeDealer = dealers.find(d => d.id === selectedDealerId);

  // Filter shops & orders for this specific dealer
  const myShops = shops.filter(s => s.dealerId === selectedDealerId);
  const myOrders = orders.filter(o => o.dealerId === selectedDealerId);

  // Stats for this dealer
  const totalMyShops = myShops.length;
  const totalMyOrders = myOrders.length;
  const deliveredMyOrders = myOrders.filter(o => o.status === 'Delivered');
  const totalMySalesValue = deliveredMyOrders.reduce((sum, o) => sum + o.totalSellingPrice, 0);

  // Reset shop form
  const resetShopForm = () => {
    setNewShopForm({ name: '', ownerName: '', phone: '', address: '' });
    setShowAddShop(false);
  };

  // Add shop (under active dealer)
  const handleAddShop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopForm.name || !newShopForm.ownerName) {
      return showFeedbackMessage(t.fillAllFields, 'warning');
    }

    let currentDealerId = selectedDealerId;

    // Fix: If dealers is completely empty, auto-create a fallback dealer in database so that it has an owner and can save.
    if (!currentDealerId) {
      const fallbackDealerId = `dl-simulated`;
      const fallbackDealer: Dealer = {
        id: fallbackDealerId,
        name: lang === 'bn' ? 'সিমুলেশন ডিলার (Simulation Dealer)' : 'Simulation Dealer',
        phone: '01700000000',
        email: 'simulated@company.com',
        area: lang === 'bn' ? 'ঢাকা (Dhaka)' : 'Dhaka'
      };

      if (onUpdateDealers) {
        onUpdateDealers([...dealers, fallbackDealer]);
      }
      currentDealerId = fallbackDealerId;
      setSelectedDealerId(fallbackDealerId);
    }

    const newShop: Shop = {
      id: `sh-${Date.now()}`,
      ...newShopForm,
      dealerId: currentDealerId
    };

    onUpdateShops([...shops, newShop]);
    resetShopForm();
    
    // Custom Toast instead of blocking window.alert
    const alertMsg = lang === 'bn' ? 'দোকানটি সফলভাবে যুক্ত করা হয়েছে!' : 'Shop registered successfully!';
    showFeedbackMessage(alertMsg, 'success');
  };

  // Order placing functions
  const handleAddToBasket = (productId: string) => {
    const existing = basket.find(item => item.productId === productId);
    const prod = products.find(p => p.id === productId);
    
    if (!prod) return;

    if (existing) {
      if (existing.quantity >= prod.stock) {
        showFeedbackMessage(t.insufficientStock, 'warning');
        return;
      }
      setBasket(basket.map(item => item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      if (prod.stock < 1) {
        showFeedbackMessage(t.insufficientStock, 'warning');
        return;
      }
      setBasket([...basket, { productId, quantity: 1 }]);
    }
  };

  const handleUpdateBasketQuantity = (productId: string, qty: number) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    if (qty > prod.stock) {
      showFeedbackMessage(t.insufficientStock, 'warning');
      return;
    }

    if (qty <= 0) {
      setBasket(basket.filter(item => item.productId !== productId));
    } else {
      setBasket(basket.map(item => item.productId === productId ? { ...item, quantity: qty } : item));
    }
  };

  const handleRemoveFromBasket = (productId: string) => {
    setBasket(basket.filter(item => item.productId !== productId));
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderShopId) {
      const selectMsg = lang === 'bn' ? 'অনুগ্রহ করে দোকান নির্বাচন করুন' : 'Please select a retail shop';
      showFeedbackMessage(selectMsg, 'warning');
      return;
    }
    if (basket.length === 0) {
      showFeedbackMessage(t.selectAtLeastOneItem, 'warning');
      return;
    }

    const shop = shops.find(s => s.id === orderShopId);
    if (!shop || !activeDealer) return;

    // Convert basket items to OrderItem
    const orderItems: OrderItem[] = [];
    let totalCostPrice = 0;
    let totalSellingPrice = 0;

    for (const bItem of basket) {
      const prod = products.find(p => p.id === bItem.productId);
      if (prod) {
        // Double check stock
        if (prod.stock < bItem.quantity) {
          showFeedbackMessage(`${prod.name} - ${t.insufficientStock}`, 'warning');
          return;
        }

        const totalPrice = bItem.quantity * prod.sellingPrice;
        orderItems.push({
          productId: prod.id,
          productName: prod.name,
          quantity: bItem.quantity,
          costPrice: prod.costPrice,
          sellingPrice: prod.sellingPrice,
          totalPrice
        });

        totalCostPrice += bItem.quantity * prod.costPrice;
        totalSellingPrice += totalPrice;
      }
    }

    const newOrder: Order = {
      id: `ord-${Math.floor(1000 + Math.random() * 9000)}`,
      shopId: shop.id,
      shopName: shop.name,
      dealerId: activeDealer.id,
      dealerName: activeDealer.name,
      items: orderItems,
      totalCostPrice,
      totalSellingPrice,
      profit: totalSellingPrice - totalCostPrice,
      status: 'Pending', // Dealer places order, Admin approves/delivers
      date: new Date().toISOString()
    };

    onUpdateOrders([...orders, newOrder]);
    
    // Clear state
    setBasket([]);
    setOrderShopId('');
    
    // Trigger Success Notification Banner
    setOrderSuccessMessage(t.orderPlacedSuccess);
    setTimeout(() => {
      setOrderSuccessMessage(null);
      setActiveTab('my-orders');
    }, 2500);
  };

  const handleDeliverOrder = (orderId: string) => {
    onUpdateOrders(orders.map(o => o.id === orderId ? { ...o, status: 'Delivered' } : o));
  };

  // Filter items
  const filteredMyShops = myShops.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.ownerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMyOrders = myOrders.filter(o => 
    o.shopName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    o.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Dealer Simulator Bar */}
      <div id="dealer-profile-bar" className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100/50">
            <User className="w-6 h-6" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {loggedInDealerId 
                ? (lang === 'bn' ? 'ডিলার প্রোফাইল' : 'Dealer Profile')
                : (lang === 'bn' ? 'সক্রিয় ডিলার নির্বাচন করুন (সিমুলেশন)' : 'Active Simulated Dealer Profile')
              }
            </label>
            {loggedInDealerId ? (
              <span className="font-extrabold text-slate-800 text-base block mt-0.5">
                {activeDealer ? activeDealer.name : ''}
              </span>
            ) : (
              <select
                value={selectedDealerId}
                onChange={(e) => { setSelectedDealerId(e.target.value); resetShopForm(); setBasket([]); }}
                className="font-bold text-slate-800 text-base border-none focus:ring-0 p-0 pr-8 bg-transparent cursor-pointer"
              >
                {dealers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {activeDealer && (
          <div className="flex flex-wrap gap-2.5 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 bg-slate-50 p-2.5 px-3 rounded-xl border border-slate-200/60">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono">{activeDealer.phone}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 p-2.5 px-3 rounded-xl border border-slate-200/60">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{activeDealer.area}</span>
            </div>
          </div>
        )}
      </div>

      {/* Dealer Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.totalShopsCount}</span>
            <span className="text-2xl font-black text-slate-800 mt-1 block font-mono">{totalMyShops}</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100/30">
            <Store className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">মোট অর্ডার</span>
            <span className="text-2xl font-black text-slate-800 mt-1 block font-mono">{totalMyOrders}</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100/30">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ডেলিভারিকৃত বিক্রয় মূল্য</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block font-mono">৳{totalMySalesValue.toLocaleString()}</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100/30">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Navigation tabs for Dealer */}
      <div id="dealer-tabs" className="flex border-b border-slate-200 bg-white p-1.5 rounded-2xl shadow-sm gap-1.5">
        <button
          onClick={() => { setActiveTab('my-shops'); setSearchQuery(''); }}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'my-shops' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Store className="w-4 h-4" />
          {lang === 'bn' ? 'আমার দোকানসমূহ' : 'My Retail Shops'} ({totalMyShops})
        </button>
        <button
          onClick={() => { setActiveTab('create-order'); setSearchQuery(''); }}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'create-order' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <ShoppingCart className="w-4 h-4" />
          {lang === 'bn' ? 'নতুন অর্ডার বুক করুন' : 'Book Order'}
        </button>
        <button
          onClick={() => { setActiveTab('my-orders'); setSearchQuery(''); }}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'my-orders' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <ShoppingBag className="w-4 h-4" />
          {lang === 'bn' ? 'আমার অর্ডারসমূহ' : 'My Logged Orders'} ({totalMyOrders})
        </button>
      </div>

      {/* Notifications Banner */}
      {orderSuccessMessage && (
        <div id="order-success-banner" className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center gap-2 shadow-sm animate-pulse">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{orderSuccessMessage}</span>
        </div>
      )}

      {feedback && (
        <div className={`p-4 rounded-2xl flex items-center gap-2.5 shadow-sm border animate-in fade-in slide-in-from-top-4 duration-300 ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-bold">{feedback.message}</span>
        </div>
      )}

      {/* SEARCH OR HEADER BOX (Not in Book Order Tab) */}
      {activeTab !== 'create-order' && (
        <div id="dealer-search" className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-full text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white transition-colors"
            />
          </div>
          {activeTab === 'my-shops' && !showAddShop && (
            <button
              onClick={() => setShowAddShop(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl shadow-md shadow-indigo-100 transition-all flex items-center gap-2 justify-center cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {lang === 'bn' ? 'নতুন খুচরা দোকানদার যুক্ত করুন' : 'Add New Retail Shop'}
            </button>
          )}
        </div>
      )}

      {/* TAB 1: MY SHOPS */}
      {activeTab === 'my-shops' && (
        <div id="dealer-my-shops" className="space-y-6">
          {showAddShop && (
            <form onSubmit={handleAddShop} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-800 text-base sm:text-lg border-b border-slate-100 pb-3">
                {lang === 'bn' ? 'নতুন দোকানদার যুক্ত করুন' : 'Add New Shop Under My Territory'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">{t.name} *</label>
                  <input
                    type="text"
                    required
                    value={newShopForm.name}
                    onChange={(e) => setNewShopForm({ ...newShopForm, name: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                    placeholder="যেমন: মাহি স্টোর"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">{t.ownerName} *</label>
                  <input
                    type="text"
                    required
                    value={newShopForm.ownerName}
                    onChange={(e) => setNewShopForm({ ...newShopForm, ownerName: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                    placeholder="যেমন: সাজ্জাদ হোসেন"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">{t.phone} *</label>
                  <input
                    type="text"
                    required
                    value={newShopForm.phone}
                    onChange={(e) => setNewShopForm({ ...newShopForm, phone: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                    placeholder="যেমন: 01800000000"
                  />
                </div>
                <div className="space-y-1 md:col-span-3">
                  <label className="text-xs font-bold text-slate-500 block">{t.address}</label>
                  <input
                    type="text"
                    value={newShopForm.address}
                    onChange={(e) => setNewShopForm({ ...newShopForm, address: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                    placeholder="দোকানের ঠিকানা..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={resetShopForm} className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
                  {t.cancel}
                </button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-100 cursor-pointer">
                  {t.save}
                </button>
              </div>
            </form>
          )}

          {/* Shops Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMyShops.map(s => (
              <div key={s.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between hover:border-indigo-400 transition-all hover:shadow-md group">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-800 text-base group-hover:text-indigo-600 transition-colors">{s.name}</h4>
                    <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-indigo-100/50">
                      ID: {s.id}
                    </span>
                  </div>
                  <div className="space-y-2 text-xs sm:text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{t.ownerName}: <strong className="text-slate-800 font-semibold">{s.ownerName}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-mono">{s.phone || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{s.address || '-'}</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-100 mt-4 pt-3 flex justify-end">
                  <button
                    onClick={() => { setOrderShopId(s.id); setActiveTab('create-order'); }}
                    className="text-xs font-bold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 p-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    {lang === 'bn' ? 'অর্ডার বুক করুন' : 'Book New Order'}
                  </button>
                </div>
              </div>
            ))}
            {filteredMyShops.length === 0 && (
              <div className="col-span-2 bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-400 italic">
                {t.noData}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CREATE ORDER */}
      {activeTab === 'create-order' && (
        <div id="dealer-create-order" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Basket Summary column (Sticky style) */}
          <div className="lg:col-span-5 space-y-4">
            <form onSubmit={handlePlaceOrder} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-4 sticky top-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <ShoppingCart className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-base sm:text-lg">
                  {lang === 'bn' ? 'চলতি অর্ডার বাস্কেট' : 'Active Order Basket'}
                </h3>
              </div>

              {/* Shop selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">
                  {lang === 'bn' ? 'গ্রাহক দোকানদার নির্বাচন করুন *' : 'Select Customer Retail Shop *'}
                </label>
                <select
                  required
                  value={orderShopId}
                  onChange={(e) => setOrderShopId(e.target.value)}
                  className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50 text-slate-800 font-semibold"
                >
                  <option value="">-- {lang === 'bn' ? 'দোকান নির্বাচন করুন' : 'Choose Retail Shop'} --</option>
                  {myShops.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.ownerName})</option>
                  ))}
                </select>
              </div>

              {/* Items List in Basket */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {basket.map(item => {
                  const prod = products.find(p => p.id === item.productId);
                  if (!prod) return null;
                  const itemTotal = item.quantity * prod.sellingPrice;
                  return (
                    <div key={item.productId} className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-150 text-xs">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-bold text-slate-800 truncate">{prod.name}</p>
                        <p className="text-slate-400 font-mono mt-0.5">
                          ৳{prod.sellingPrice} x {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Quantity selector */}
                        <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handleUpdateBasketQuantity(item.productId, item.quantity - 1)}
                            className="px-2 py-1 text-slate-500 hover:bg-slate-100 font-bold cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-2 font-bold text-slate-800">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateBasketQuantity(item.productId, item.quantity + 1)}
                            className="px-2 py-1 text-slate-500 hover:bg-slate-100 font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Total Price & Delete */}
                        <span className="font-extrabold text-slate-800 w-16 text-right font-mono">
                          ৳{itemTotal.toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromBasket(item.productId)}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {basket.length === 0 && (
                  <div className="text-center py-8 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <Info className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                    <p className="text-xs p-2">{lang === 'bn' ? 'বাস্কেট খালি আছে। ডানের ক্যাটালগ থেকে পণ্য নির্বাচন করুন।' : 'Basket is empty. Select products from the list.'}</p>
                  </div>
                )}
              </div>

              {/* Order total info */}
              {basket.length > 0 && (
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>{lang === 'bn' ? 'মোট আইটেম সংখ্যা' : 'Selected Products'}</span>
                    <span>{basket.reduce((sum, item) => sum + item.quantity, 0)} {lang === 'bn' ? 'টি' : 'units'}</span>
                  </div>
                  <div className="flex justify-between items-center bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100/50">
                    <span className="font-bold text-indigo-900">{t.total}</span>
                    <span className="text-xl font-black text-indigo-700 font-mono">
                      ৳{basket.reduce((sum, item) => {
                        const prod = products.find(p => p.id === item.productId);
                        return sum + (item.quantity * (prod?.sellingPrice || 0));
                      }, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBasket([])}
                  disabled={basket.length === 0}
                  className="w-1/3 border border-slate-200 rounded-xl py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  {lang === 'bn' ? 'মুছে ফেলুন' : 'Clear'}
                </button>
                <button
                  type="submit"
                  disabled={basket.length === 0 || !orderShopId}
                  className="w-2/3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100"
                >
                  <CheckCircle className="w-4 h-4" />
                  {lang === 'bn' ? 'অর্ডার সাবমিট করুন' : 'Confirm Order'}
                </button>
              </div>
            </form>
          </div>

          {/* Products Catalogue list column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 text-base sm:text-lg border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                {lang === 'bn' ? 'অর্ডারের জন্য পণ্য ক্যাটালগ' : 'Choose Company Products'}
              </h3>

              {/* Products Grid list for easy ordering */}
              <div className="space-y-3">
                {products.map(p => {
                  const basketItem = basket.find(item => item.productId === p.id);
                  const isStockOut = p.stock <= 0;
                  return (
                    <div 
                      key={p.id} 
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all ${
                        basketItem ? 'bg-indigo-50/20 border-indigo-300 shadow-sm shadow-indigo-50/50' : 'bg-white hover:bg-slate-50/50 border-slate-200'
                      }`}
                    >
                      <div className="space-y-1 max-w-[280px]">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800 text-sm sm:text-base">{p.name}</h4>
                          <span className="text-slate-400 font-mono text-[9px] sm:text-[10px] bg-slate-100 p-0.5 px-2 rounded uppercase font-semibold">
                            {p.sku}
                          </span>
                        </div>
                        <div className="flex gap-3 text-xs text-slate-500 font-semibold">
                          <span>{t.unit}: <strong className="text-slate-700">{p.unit}</strong></span>
                          <span>
                            {t.stockRemaining}: {' '}
                            <strong className={`${p.stock <= 5 ? 'text-rose-600 font-black' : 'text-slate-700 font-bold'}`}>
                              {p.stock}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <span className="font-black text-slate-800 text-base font-mono">
                          ৳{p.sellingPrice}
                        </span>

                        {isStockOut ? (
                          <span className="text-[10px] sm:text-xs text-rose-500 font-bold bg-rose-50 p-1.5 px-3 rounded-lg flex items-center gap-1 border border-rose-100">
                            <AlertTriangle className="w-3.5 h-3.5" /> Out of stock
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddToBasket(p.id)}
                            className={`p-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              basketItem 
                                ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 shadow-indigo-100' 
                                : 'bg-slate-100 text-slate-800 hover:bg-indigo-50 hover:text-indigo-700'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {basketItem ? `${basketItem.quantity} Added` : (lang === 'bn' ? 'যুক্ত করুন' : 'Add to Cart')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MY ORDERS */}
      {activeTab === 'my-orders' && (
        <div id="dealer-my-orders" className="space-y-4">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4">Order ID</th>
                    <th className="p-4">{t.shops}</th>
                    <th className="p-4">{t.items}</th>
                    <th className="p-4 text-emerald-700 bg-emerald-50/30">{t.total} ({t.sellingPrice})</th>
                    <th className="p-4">{t.status}</th>
                    <th className="p-4">{t.date}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {filteredMyOrders.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono text-[10px] sm:text-xs text-slate-400">#{o.id.substring(0,8)}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{o.shopName}</div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {o.items.map((it, idx) => (
                            <span key={idx} className="inline-block bg-slate-50 text-slate-700 text-[11px] font-medium p-1 px-2.5 border border-slate-150 rounded-lg mr-1.5 my-0.5">
                              {it.productName} (x{it.quantity})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-emerald-700 font-extrabold bg-emerald-50/10 font-mono">
                        ৳{o.totalSellingPrice.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold inline-flex items-center gap-1.5 ${
                            o.status === 'Delivered' ? 'bg-green-50 text-green-700 border border-green-100' :
                            o.status === 'Ready' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            o.status === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                            {o.status === 'Delivered' ? <CheckCircle className="w-3.5 h-3.5" /> : 
                             o.status === 'Ready' ? <Clock className="w-3.5 h-3.5" /> : 
                             o.status === 'Pending' ? <Clock className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            {o.status === 'Delivered' ? t.delivered : 
                             o.status === 'Ready' ? t.ready : 
                             o.status === 'Pending' ? t.pending : t.cancelled}
                          </span>
                          
                          {o.status === 'Ready' && (
                            <button
                              onClick={() => handleDeliverOrder(o.id)}
                              className="bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold py-1 px-2 rounded-lg transition-all cursor-pointer shadow-sm flex items-center gap-1 shrink-0"
                            >
                              <CheckCircle className="w-3 h-3" />
                              {lang === 'bn' ? 'ডেলিভারি সম্পন্ন করুন' : 'Complete Delivery'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-slate-500 text-xs font-medium">
                        {new Date(o.date).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US', { hour: 'numeric', minute: 'numeric', hour12: true, month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                  {filteredMyOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 italic">{t.noData}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
