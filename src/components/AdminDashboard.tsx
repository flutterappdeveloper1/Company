/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, Store, Package, ShoppingBag, TrendingUp, TrendingDown, DollarSign,
  Plus, Edit, Trash2, Check, X, CheckCircle, XCircle, Clock, Search, Briefcase, FileText
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { Dealer, Shop, Product, Order, Expense, Investment, Language } from '../types';
import { translations } from '../data';

interface AdminDashboardProps {
  lang: Language;
  dealers: Dealer[];
  shops: Shop[];
  products: Product[];
  orders: Order[];
  expenses: Expense[];
  investments: Investment[];
  
  // State updators
  onUpdateDealers: (dealers: Dealer[]) => void;
  onUpdateShops: (shops: Shop[]) => void;
  onUpdateProducts: (products: Product[]) => void;
  onUpdateOrders: (orders: Order[]) => void;
  onUpdateExpenses: (expenses: Expense[]) => void;
  onUpdateInvestments: (investments: Investment[]) => void;
  onTriggerNotification?: (title: string, body: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export default function AdminDashboard({
  lang,
  dealers,
  shops,
  products,
  orders,
  expenses,
  investments,
  onUpdateDealers,
  onUpdateShops,
  onUpdateProducts,
  onUpdateOrders,
  onUpdateExpenses,
  onUpdateInvestments,
  onTriggerNotification
}: AdminDashboardProps) {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'financials' | 'dealers' | 'shops' | 'products' | 'orders' | 'expenses' | 'investments'>('financials');
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');

  // Form states for modals/adding
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form Fields
  const [dealerForm, setDealerForm] = useState<Omit<Dealer, 'id'>>({ name: '', phone: '', email: '', area: '' });
  const [shopForm, setShopForm] = useState<Omit<Shop, 'id'>>({ name: '', ownerName: '', phone: '', address: '', dealerId: '' });
  const [productForm, setProductForm] = useState<Omit<Product, 'id'>>({ name: '', sku: '', costPrice: 0, sellingPrice: 0, stock: 0, unit: 'Piece' });
  const [expenseForm, setExpenseForm] = useState<Omit<Expense, 'id'>>({ title: '', amount: 0, category: 'Others', date: new Date().toISOString().split('T')[0], description: '' });
  const [investmentForm, setInvestmentForm] = useState<Omit<Investment, 'id'>>({ title: '', amount: 0, date: new Date().toISOString().split('T')[0], description: '' });

  // ----------------------------------------------------
  // CALCULATIONS (আর্থিক হিসাব-নিকাশ)
  // ----------------------------------------------------
  const totalInvested = investments.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  
  // Calculate revenue and cost from only Delivered orders (or all, but standard is Delivered/Sells)
  const deliveredOrders = orders.filter(o => o.status === 'Delivered');
  const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.totalSellingPrice, 0);
  const totalCostOfGoods = deliveredOrders.reduce((sum, o) => sum + o.totalCostPrice, 0);
  const grossProfit = deliveredOrders.reduce((sum, o) => sum + o.profit, 0);
  const netProfit = grossProfit - totalExpenses;

  // Recharts Chart Data Prep
  // Group financials by month/day or simply show a comparison bar chart
  const financialChartData = [
    {
      name: lang === 'bn' ? 'বিনিয়োগ ও খরচ' : 'Investment & Cost',
      [lang === 'bn' ? 'মোট বিনিয়োগ' : 'Total Investment']: totalInvested,
      [lang === 'bn' ? 'পণ্যের উৎপাদন খরচ' : 'Cost of Goods Sold']: totalCostOfGoods,
      [lang === 'bn' ? 'অন্যান্য খরচ' : 'Other Expenses']: totalExpenses,
    },
    {
      name: lang === 'bn' ? 'বিক্রয় ও লাভ' : 'Sales & Profits',
      [lang === 'bn' ? 'মোট বিক্রয়' : 'Total Sales']: totalRevenue,
      [lang === 'bn' ? 'মোট লাভ' : 'Gross Profit']: grossProfit,
      [lang === 'bn' ? 'নিট লাভ' : 'Net Profit']: netProfit,
    }
  ];

  // Orders by date chart data (last 7 orders or date grouped)
  const ordersTimelineData = [...orders]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(o => ({
      date: new Date(o.date).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { month: 'short', day: 'numeric' }),
      [lang === 'bn' ? 'বিক্রয়মূল্য' : 'Sales Value']: o.totalSellingPrice,
      [lang === 'bn' ? 'প্রফিট' : 'Profit']: o.profit,
    }));

  // Helper to reset forms
  const resetForms = () => {
    setEditingId(null);
    setShowAddForm(false);
    setDealerForm({ name: '', phone: '', email: '', area: '' });
    setShopForm({ name: '', ownerName: '', phone: '', address: '', dealerId: dealers[0]?.id || '' });
    setProductForm({ name: '', sku: '', costPrice: 0, sellingPrice: 0, stock: 0, unit: 'Piece' });
    setExpenseForm({ title: '', amount: 0, category: 'Others', date: new Date().toISOString().split('T')[0], description: '' });
    setInvestmentForm({ title: '', amount: 0, date: new Date().toISOString().split('T')[0], description: '' });
  };

  // ----------------------------------------------------
  // DEALER ACTIONS
  // ----------------------------------------------------
  const handleAddDealer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealerForm.name || !dealerForm.phone) return alert(t.fillAllFields);
    
    const newDealer: Dealer = {
      id: `dl-${Date.now()}`,
      ...dealerForm
    };
    onUpdateDealers([...dealers, newDealer]);
    if (onTriggerNotification) {
      onTriggerNotification(
        lang === 'bn' ? 'নতুন ডিলার নিবন্ধিত!' : 'New Dealer Registered!',
        lang === 'bn' ? `ডিলার "${newDealer.name}" সফলভাবে সিস্টেমে যুক্ত হয়েছেন।` : `Dealer "${newDealer.name}" has been added successfully.`,
        'success'
      );
    }
    resetForms();
  };

  const handleEditDealer = (dealer: Dealer) => {
    setEditingId(dealer.id);
    setDealerForm({ name: dealer.name, phone: dealer.phone, email: dealer.email, area: dealer.area });
    setShowAddForm(true);
  };

  const handleUpdateDealer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    onUpdateDealers(dealers.map(d => d.id === editingId ? { ...d, ...dealerForm } : d));
    resetForms();
  };

  const handleDeleteDealer = (id: string) => {
    if (confirm(t.confirmDelete)) {
      onUpdateDealers(dealers.filter(d => d.id !== id));
      // Remove or unassign shops too
      onUpdateShops(shops.filter(s => s.dealerId !== id));
    }
  };

  // ----------------------------------------------------
  // SHOP ACTIONS
  // ----------------------------------------------------
  const handleAddShop = (e: React.FormEvent) => {
    e.preventDefault();
    const dealerIdToUse = shopForm.dealerId || dealers[0]?.id;
    if (!shopForm.name || !shopForm.ownerName || !dealerIdToUse) return alert(t.fillAllFields);

    const newShop: Shop = {
      id: `sh-${Date.now()}`,
      ...shopForm,
      dealerId: dealerIdToUse
    };
    onUpdateShops([...shops, newShop]);
    if (onTriggerNotification) {
      onTriggerNotification(
        lang === 'bn' ? 'নতুন রিটেইল শপ যুক্ত!' : 'New Retail Shop Registered!',
        lang === 'bn' ? `দোকান "${newShop.name}" সফলভাবে যুক্ত করা হয়েছে।` : `Shop "${newShop.name}" was successfully registered.`,
        'success'
      );
    }
    resetForms();
  };

  const handleEditShop = (shop: Shop) => {
    setEditingId(shop.id);
    setShopForm({
      name: shop.name,
      ownerName: shop.ownerName,
      phone: shop.phone,
      address: shop.address,
      dealerId: shop.dealerId
    });
    setShowAddForm(true);
  };

  const handleUpdateShop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    onUpdateShops(shops.map(s => s.id === editingId ? { ...s, ...shopForm } : s));
    resetForms();
  };

  const handleDeleteShop = (id: string) => {
    if (confirm(t.confirmDelete)) {
      onUpdateShops(shops.filter(s => s.id !== id));
    }
  };

  // ----------------------------------------------------
  // PRODUCT ACTIONS
  // ----------------------------------------------------
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.sku || productForm.costPrice <= 0 || productForm.sellingPrice <= 0) {
      return alert(t.fillAllFields);
    }

    const newProduct: Product = {
      id: `pr-${Date.now()}`,
      ...productForm,
      costPrice: Number(productForm.costPrice),
      sellingPrice: Number(productForm.sellingPrice),
      stock: Number(productForm.stock)
    };
    onUpdateProducts([...products, newProduct]);
    if (onTriggerNotification) {
      onTriggerNotification(
        lang === 'bn' ? 'নতুন প্রোডাক্ট যুক্ত!' : 'New Product Added!',
        lang === 'bn' ? `পণ্য "${newProduct.name}" সফলভাবে যুক্ত করা হয়েছে।` : `Product "${newProduct.name}" was added successfully.`,
        'success'
      );
    }
    resetForms();
  };

  const handleEditProduct = (product: Product) => {
    setEditingId(product.id);
    setProductForm({
      name: product.name,
      sku: product.sku,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      stock: product.stock,
      unit: product.unit
    });
    setShowAddForm(true);
  };

  const handleUpdateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    onUpdateProducts(products.map(p => p.id === editingId ? {
      ...p,
      ...productForm,
      costPrice: Number(productForm.costPrice),
      sellingPrice: Number(productForm.sellingPrice),
      stock: Number(productForm.stock)
    } : p));
    resetForms();
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm(t.confirmDelete)) {
      onUpdateProducts(products.filter(p => p.id !== id));
    }
  };

  // ----------------------------------------------------
  // EXPENSE ACTIONS
  // ----------------------------------------------------
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title || expenseForm.amount <= 0) return alert(t.fillAllFields);

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      ...expenseForm,
      amount: Number(expenseForm.amount)
    };
    onUpdateExpenses([...expenses, newExpense]);
    if (onTriggerNotification) {
      onTriggerNotification(
        lang === 'bn' ? 'নতুন খরচ রেকর্ড!' : 'New Expense Recorded!',
        lang === 'bn' ? `"${newExpense.title}" বাবদ ৳${newExpense.amount} খরচ হিসেবে নথিভুক্ত হয়েছে।` : `Expense of ৳${newExpense.amount} for "${newExpense.title}" has been recorded.`,
        'info'
      );
    }
    resetForms();
  };

  const handleEditExpense = (exp: Expense) => {
    setEditingId(exp.id);
    setExpenseForm({
      title: exp.title,
      amount: exp.amount,
      category: exp.category,
      date: exp.date,
      description: exp.description || ''
    });
    setShowAddForm(true);
  };

  const handleUpdateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    onUpdateExpenses(expenses.map(exp => exp.id === editingId ? {
      ...exp,
      ...expenseForm,
      amount: Number(expenseForm.amount)
    } : exp));
    resetForms();
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm(t.confirmDelete)) {
      onUpdateExpenses(expenses.filter(exp => exp.id !== id));
    }
  };

  // ----------------------------------------------------
  // INVESTMENT ACTIONS
  // ----------------------------------------------------
  const handleAddInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!investmentForm.title || investmentForm.amount <= 0) return alert(t.fillAllFields);

    const newInvestment: Investment = {
      id: `inv-${Date.now()}`,
      ...investmentForm,
      amount: Number(investmentForm.amount)
    };
    onUpdateInvestments([...investments, newInvestment]);
    if (onTriggerNotification) {
      onTriggerNotification(
        lang === 'bn' ? 'কোম্পানি মূলধন বৃদ্ধি!' : 'Company Investment Added!',
        lang === 'bn' ? `"${newInvestment.title}" বাবদ ৳${newInvestment.amount} মূলধন যুক্ত হয়েছে।` : `Investment of ৳${newInvestment.amount} for "${newInvestment.title}" has been added.`,
        'success'
      );
    }
    resetForms();
  };

  const handleEditInvestment = (inv: Investment) => {
    setEditingId(inv.id);
    setInvestmentForm({
      title: inv.title,
      amount: inv.amount,
      date: inv.date,
      description: inv.description || ''
    });
    setShowAddForm(true);
  };

  const handleUpdateInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    onUpdateInvestments(investments.map(inv => inv.id === editingId ? {
      ...inv,
      ...investmentForm,
      amount: Number(investmentForm.amount)
    } : inv));
    resetForms();
  };

  const handleDeleteInvestment = (id: string) => {
    if (confirm(t.confirmDelete)) {
      onUpdateInvestments(investments.filter(inv => inv.id !== id));
    }
  };

  // ----------------------------------------------------
  // ORDER ACTIONS (Admin can deliver/cancel)
  // ----------------------------------------------------
  const handleUpdateOrderStatus = (orderId: string, newStatus: 'Pending' | 'Ready' | 'Delivered' | 'Cancelled') => {
    const originalOrder = orders.find(o => o.id === orderId);
    if (!originalOrder) return;

    // Adjust stocks if transitioning to Ready/Delivered or leaving Ready/Delivered
    let updatedProducts = [...products];
    let stockError = false;

    const wasStockReduced = (status: 'Pending' | 'Ready' | 'Delivered' | 'Cancelled') => {
      return status === 'Ready' || status === 'Delivered';
    };

    const isEnteringReducedState = !wasStockReduced(originalOrder.status) && wasStockReduced(newStatus);
    const isLeavingReducedState = wasStockReduced(originalOrder.status) && !wasStockReduced(newStatus);

    if (isEnteringReducedState) {
      // Reduce product stock
      for (const item of originalOrder.items) {
        const prod = updatedProducts.find(p => p.id === item.productId);
        if (prod) {
          if (prod.stock < item.quantity) {
            stockError = true;
          } else {
            prod.stock -= item.quantity;
          }
        }
      }
    } else if (isLeavingReducedState) {
      // Return product stock
      for (const item of originalOrder.items) {
        const prod = updatedProducts.find(p => p.id === item.productId);
        if (prod) {
          prod.stock += item.quantity;
        }
      }
    }

    if (stockError) {
      alert(t.insufficientStock);
      return;
    }

    onUpdateProducts(updatedProducts);
    onUpdateOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    if (onTriggerNotification) {
      const statusTexts: Record<string, string> = {
        'Pending': lang === 'bn' ? 'পেন্ডিং (Pending)' : 'Pending',
        'Ready': lang === 'bn' ? 'প্রস্তুত (Ready)' : 'Ready',
        'Delivered': lang === 'bn' ? 'ডেলিভার্ড করা হয়েছে (Delivered)' : 'Delivered',
        'Cancelled': lang === 'bn' ? 'বাতিল করা হয়েছে (Cancelled)' : 'Cancelled'
      };
      onTriggerNotification(
        lang === 'bn' ? 'অর্ডারের স্ট্যাটাস পরিবর্তন!' : 'Order Status Updated!',
        lang === 'bn' ? `অর্ডার #${orderId} এর বর্তমান অবস্থা: ${statusTexts[newStatus]}` : `Order #${orderId} status changed to ${statusTexts[newStatus]}`,
        newStatus === 'Cancelled' ? 'warning' : 'success'
      );
    }
  };

  const handleDeleteOrder = (id: string) => {
    if (confirm(t.confirmDelete)) {
      const order = orders.find(o => o.id === id);
      // Return stock if it was delivered or ready
      if (order && (order.status === 'Delivered' || order.status === 'Ready')) {
        const updatedProducts = products.map(p => {
          const item = order.items.find(i => i.productId === p.id);
          return item ? { ...p, stock: p.stock + item.quantity } : p;
        });
        onUpdateProducts(updatedProducts);
      }
      onUpdateOrders(orders.filter(o => o.id !== id));
    }
  };

  // Filter items based on query
  const filteredDealers = dealers.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.area.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredShops = shops.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) || (dealers.find(d => d.id === s.dealerId)?.name || '').toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredOrders = orders.filter(o => o.shopName.toLowerCase().includes(searchQuery.toLowerCase()) || o.dealerName.toLowerCase().includes(searchQuery.toLowerCase()) || o.id.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredExpenses = expenses.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.category.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredInvestments = investments.filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Admin Notice */}
      <div id="admin-notice-bar" className="bg-indigo-50 border-l-4 border-indigo-600 p-4 rounded-r-2xl flex items-start gap-3 shadow-sm">
        <Briefcase className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
        <div>
          <h4 className="font-bold text-slate-800 text-sm md:text-base">
            {lang === 'bn' ? 'অ্যাডমিন ও ওনার কন্ট্রোল রুম' : 'Administrative Control Center'}
          </h4>
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed mt-0.5">{t.adminAccessOnly}</p>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div id="admin-nav-tabs" className="flex flex-wrap border border-slate-200/80 gap-1 bg-white p-2 rounded-2xl shadow-sm">
        <button 
          onClick={() => { setActiveTab('financials'); resetForms(); setSearchQuery(''); }}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'financials' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <TrendingUp className="w-4 h-4" /> {t.financials}
        </button>
        <button 
          onClick={() => { setActiveTab('dealers'); resetForms(); setSearchQuery(''); }}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'dealers' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Users className="w-4 h-4" /> {t.dealers} ({dealers.length})
        </button>
        <button 
          onClick={() => { setActiveTab('shops'); resetForms(); setSearchQuery(''); }}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'shops' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Store className="w-4 h-4" /> {t.shops} ({shops.length})
        </button>
        <button 
          onClick={() => { setActiveTab('products'); resetForms(); setSearchQuery(''); }}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'products' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Package className="w-4 h-4" /> {t.products} ({products.length})
        </button>
        <button 
          onClick={() => { setActiveTab('orders'); resetForms(); setSearchQuery(''); }}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'orders' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <ShoppingBag className="w-4 h-4" /> {t.orders} ({orders.length})
        </button>
        <button 
          onClick={() => { setActiveTab('expenses'); resetForms(); setSearchQuery(''); }}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'expenses' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <TrendingDown className="w-4 h-4" /> {t.expenses} ({expenses.length})
        </button>
        <button 
          onClick={() => { setActiveTab('investments'); resetForms(); setSearchQuery(''); }}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'investments' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <DollarSign className="w-4 h-4" /> {t.investments} ({investments.length})
        </button>
      </div>

      {/* TAB CONTENT: FINANCIALS */}
      {activeTab === 'financials' && (
        <div id="financials-tab" className="grid grid-cols-12 gap-4">
          
          {/* Main Financial Stats (Investment & Profit) - Bento block (col-span-8) */}
          <div className="col-span-12 lg:col-span-8 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between min-h-[380px]">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{t.financials}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{lang === 'bn' ? 'ব্যবসায়িক কার্যক্রম এবং লাভ-লোকসান চিত্র' : 'Financial summary and performance logs'}</p>
              </div>
              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg border border-blue-100">
                {lang === 'bn' ? 'রিয়েল-টাইম' : 'Live Tracking'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.totalInvestments}</span>
                <span className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">৳{totalInvested.toLocaleString()}</span>
                <span className="text-[10px] text-blue-500 font-bold mt-1">+{investments.length} {lang === 'bn' ? 'টি বিনিয়োগ' : 'installments'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.totalRevenue}</span>
                <span className="text-2xl sm:text-3xl font-black text-indigo-600 mt-1">৳{totalRevenue.toLocaleString()}</span>
                <span className="text-[10px] text-indigo-400 font-bold mt-1">+{deliveredOrders.length} {lang === 'bn' ? 'টি ডেলিভারড' : 'delivered'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.totalExpenses}</span>
                <span className="text-2xl sm:text-3xl font-black text-rose-500 mt-1">৳{totalExpenses.toLocaleString()}</span>
                <span className="text-[10px] text-rose-400 font-bold mt-1">+{expenses.length} {lang === 'bn' ? 'টি ব্যয় রেকর্ড' : 'exp records'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.netProfit}</span>
                <span className={`text-2xl sm:text-3xl font-black mt-1 ${netProfit >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                  ৳{netProfit.toLocaleString()}
                </span>
                <span className="text-[10px] text-green-500 font-bold mt-1">
                  {netProfit >= 0 ? (lang === 'bn' ? 'পজিটিভ নিট মার্জিন' : 'Positive Margin') : (lang === 'bn' ? 'লোকসান রেকর্ড' : 'Negative Margin')}
                </span>
              </div>
            </div>

            {/* Recharts Bar Chart replacing the static bars */}
            <div className="h-44 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => `৳${val >= 1000 ? (val / 1000) + 'k' : val}`} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => [`৳${value.toLocaleString()}`, '']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                  <Bar dataKey={lang === 'bn' ? 'মোট বিনিয়োগ' : 'Total Investment'} fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={32} />
                  <Bar dataKey={lang === 'bn' ? 'মোট বিক্রয়' : 'Total Sales'} fill="#6366f1" radius={[6, 6, 0, 0]} barSize={32} />
                  <Bar dataKey={lang === 'bn' ? 'নিট লাভ' : 'Net Profit'} fill="#10b981" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Actions / Admin Controls - Bento block (col-span-4) */}
          <div className="col-span-12 lg:col-span-4 bg-indigo-600 rounded-3xl p-6 text-white shadow-lg flex flex-col justify-between min-h-[380px]">
            <div>
              <h3 className="text-lg font-bold">{lang === 'bn' ? 'অ্যাডমিন দ্রুত কন্ট্রোল' : 'Admin Control Panel'}</h3>
              <p className="text-xs text-indigo-200 mt-1 leading-relaxed">
                {lang === 'bn' ? 'সিস্টেম মডিউলে সরাসরি ডাটা রেকর্ড এন্ট্রি করতে নিচের অ্যাকশন বাটনগুলো ব্যবহার করুন।' : 'Use the direct controls below to switch views or create entries in different database scopes.'}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 my-6">
              <button 
                onClick={() => { setActiveTab('products'); setShowAddForm(true); }}
                className="bg-white/10 hover:bg-white/20 p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center border border-white/5 cursor-pointer"
              >
                <span className="text-2xl">📦</span>
                <span className="text-xs font-bold">{t.addProduct}</span>
              </button>
              <button 
                onClick={() => { setActiveTab('shops'); setShowAddForm(true); }}
                className="bg-white/10 hover:bg-white/20 p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center border border-white/5 cursor-pointer"
              >
                <span className="text-2xl">🏪</span>
                <span className="text-xs font-bold">{t.addShop}</span>
              </button>
              <button 
                onClick={() => { setActiveTab('dealers'); setShowAddForm(true); }}
                className="bg-white/10 hover:bg-white/20 p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center border border-white/5 cursor-pointer"
              >
                <span className="text-2xl">🤝</span>
                <span className="text-xs font-bold">{t.addDealer}</span>
              </button>
              <button 
                onClick={() => { setActiveTab('expenses'); setShowAddForm(true); }}
                className="bg-white/10 hover:bg-white/20 p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center border border-white/5 cursor-pointer"
              >
                <span className="text-2xl">💸</span>
                <span className="text-xs font-bold">{t.addExpense}</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-indigo-100 bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="font-semibold">{lang === 'bn' ? 'সিস্টেম স্ট্যাটাস:' : 'System Status:'}</span>
              <span className="font-bold text-green-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></span>
                {lang === 'bn' ? 'সব সিস্টেম সক্রিয়' : 'All Systems Active'}
              </span>
            </div>
          </div>

          {/* Summary Chips (col-span-3) - Total Dealers */}
          <div className="col-span-6 md:col-span-3 bg-white rounded-3xl p-5 border border-slate-200 flex flex-col justify-center items-center shadow-sm">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider text-center">{t.dealers}</span>
            <span className="text-3xl font-black text-slate-800 mt-1">{dealers.length}</span>
            <span className="text-[10px] text-slate-400 mt-1">{lang === 'bn' ? 'নিবন্ধিত ডিলার' : 'Registered Dealers'}</span>
          </div>

          {/* Summary Chips (col-span-3) - Total Retail Shops */}
          <div className="col-span-6 md:col-span-3 bg-white rounded-3xl p-5 border border-slate-200 flex flex-col justify-center items-center shadow-sm">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider text-center">{t.shops}</span>
            <span className="text-3xl font-black text-slate-800 mt-1">{shops.length}</span>
            <span className="text-[10px] text-slate-400 mt-1">{lang === 'bn' ? 'মোট রিটেইল দোকান' : 'Retail Shops'}</span>
          </div>

          {/* Summary Chips (col-span-3) - Total SKU Products */}
          <div className="col-span-6 md:col-span-3 bg-white rounded-3xl p-5 border border-slate-200 flex flex-col justify-center items-center shadow-sm">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider text-center">{t.products}</span>
            <span className="text-3xl font-black text-slate-800 mt-1">{products.length}</span>
            <span className="text-[10px] text-slate-400 mt-1">{lang === 'bn' ? 'মজুদ প্রোডাক্ট তালিকা' : 'SKU Catalog'}</span>
          </div>

          {/* Summary Chips (col-span-3) - Completed Orders */}
          <div className="col-span-6 md:col-span-3 bg-white rounded-3xl p-5 border border-slate-200 flex flex-col justify-center items-center shadow-sm">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider text-center">{t.orders}</span>
            <span className="text-3xl font-black text-slate-800 mt-1">{orders.length}</span>
            <span className="text-[10px] text-slate-400 mt-1">
              {orders.filter(o => o.status === 'Pending').length} {lang === 'bn' ? 'অপেক্ষমান অর্ডার' : 'Pending Delivery'}
            </span>
          </div>

          {/* Dealer Network List - Bento card (col-span-4) */}
          <div className="col-span-12 lg:col-span-4 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between min-h-[350px]">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-slate-800">{lang === 'bn' ? 'টপ ডিলার পারফরম্যান্স' : 'Top Performing Dealers'}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">{lang === 'bn' ? 'আওতাধীন দোকান ও মোট বিক্রীত লাভ' : 'Regional shops count & sales value'}</p>
              </div>
              <button 
                onClick={() => { setActiveTab('dealers'); resetForms(); setSearchQuery(''); }}
                className="text-indigo-600 text-xs font-bold hover:underline cursor-pointer"
              >
                {lang === 'bn' ? 'সব দেখুন' : 'View All'}
              </button>
            </div>
            
            <div className="space-y-3 flex-grow overflow-y-auto max-h-[250px] pr-1">
              {dealers.length === 0 ? (
                <div className="text-center text-xs text-gray-400 py-8">
                  {lang === 'bn' ? 'কোন ডিলার পাওয়া যায়নি' : 'No dealers registered yet'}
                </div>
              ) : (
                dealers.map((dl, idx) => {
                  const dlShopsCount = shops.filter(s => s.dealerId === dl.id).length;
                  const dlOrders = orders.filter(o => o.dealerId === dl.id && o.status === 'Delivered');
                  const dlRevenue = dlOrders.reduce((sum, o) => sum + o.totalSellingPrice, 0);
                  const initials = dl.name ? dl.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'DL';
                  
                  // background shades for icons
                  const colorShades = [
                    'bg-orange-100 text-orange-600',
                    'bg-purple-100 text-purple-600',
                    'bg-blue-100 text-blue-600',
                    'bg-pink-100 text-pink-600',
                    'bg-emerald-100 text-emerald-600'
                  ];
                  const shade = colorShades[idx % colorShades.length];

                  return (
                    <div key={dl.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100/50 hover:bg-slate-100/50 transition-colors">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${shade}`}>
                        {initials}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{dl.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {dlShopsCount} {t.shops} • {dl.area || 'No Area Specified'}
                        </p>
                      </div>
                      <div className="text-right text-green-600 font-extrabold text-xs shrink-0 font-mono">
                        ৳{(dlRevenue / 1000).toFixed(1)}k
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Order Log (Live Order Stream) - Bento block (col-span-8) */}
          <div className="col-span-12 lg:col-span-8 bg-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between min-h-[350px]">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-slate-200">{lang === 'bn' ? 'লাইভ অর্ডার স্ট্রিম' : 'Live Order Stream'}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">{lang === 'bn' ? 'ডিলারদের বুকিংকৃত সরাসরি চলমান অর্ডারসমূহ' : 'Latest dealer logged orders with live fulfillment status'}</p>
              </div>
              <span className="px-2.5 py-1 bg-green-500/20 text-green-400 text-[10px] rounded-full uppercase tracking-wider font-extrabold animate-pulse">
                {lang === 'bn' ? 'সরাসরি ট্র্যাকিং' : 'Live Tracking'}
              </span>
            </div>

            <div className="overflow-x-auto flex-grow max-h-[220px]">
              <table className="w-full text-left min-w-[500px]">
                <thead>
                  <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-800">
                    <th className="pb-2">{lang === 'bn' ? 'ডিলার' : 'Dealer'}</th>
                    <th className="pb-2">{lang === 'bn' ? 'খুচরা দোকান' : 'Shop Name'}</th>
                    <th className="pb-2">{lang === 'bn' ? 'অর্ডার মূল্য' : 'Order Value'}</th>
                    <th className="pb-2">{lang === 'bn' ? 'তারিখ' : 'Date'}</th>
                    <th className="pb-2 text-right">{lang === 'bn' ? 'অবস্থা' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-medium">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                        {lang === 'bn' ? 'কোন অর্ডার রেকর্ড পাওয়া যায়নি' : 'No order logs present'}
                      </td>
                    </tr>
                  ) : (
                    [...orders].reverse().slice(0, 4).map((ord) => {
                      let statusClass = 'bg-yellow-500/20 text-yellow-400';
                      if (ord.status === 'Delivered') statusClass = 'bg-green-500/20 text-green-400';
                      if (ord.status === 'Cancelled') statusClass = 'bg-rose-500/20 text-rose-400';

                      return (
                        <tr key={ord.id} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 font-semibold text-slate-200">{ord.dealerName}</td>
                          <td className="text-slate-300 font-normal">{ord.shopName}</td>
                          <td className="text-indigo-300 font-mono">৳{ord.totalSellingPrice.toLocaleString()}</td>
                          <td className="text-slate-400 text-[10px]">
                            {new Date(ord.date).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="text-right">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusClass}`}>
                              {ord.status === 'Pending' ? t.pending : (ord.status === 'Delivered' ? t.delivered : t.cancelled)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex justify-end">
              <button 
                onClick={() => { setActiveTab('orders'); resetForms(); setSearchQuery(''); }}
                className="text-slate-400 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                {lang === 'bn' ? 'সকল অর্ডার তালিকা দেখতে ক্লিক করুন' : 'View full delivery order sheets'} &rarr;
              </button>
            </div>
          </div>

          {/* Income Statement & Growth trend combined Bento block (col-span-12) */}
          <div className="col-span-12 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-2 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                {lang === 'bn' ? 'বিস্তারিত লাভ-ক্ষতি বিবরণী (Income Statement)' : 'Detailed Income Statement (P&L)'}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-slate-500 font-medium">{t.totalRevenue} (A)</span>
                  <span className="font-bold text-indigo-600">+{t.bdt} {totalRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-slate-500 font-medium">{t.costOfGoodsSold} (B)</span>
                  <span className="font-semibold text-amber-600">-{t.bdt} {totalCostOfGoods.toLocaleString()}</span>
                </div>
                <div className="border-t border-dashed border-slate-100"></div>
                <div className="flex justify-between items-center text-xs sm:text-sm font-semibold">
                  <span className="text-slate-800">{t.grossProfit} (C = A - B)</span>
                  <span className="font-bold text-green-600">+{t.bdt} {grossProfit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-slate-500 font-medium">{t.totalExpenses} (D)</span>
                  <span className="font-semibold text-rose-600">-{t.bdt} {totalExpenses.toLocaleString()}</span>
                </div>
                <div className="border-t border-slate-200"></div>
                <div className="flex justify-between items-center p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="font-extrabold text-slate-900 text-xs sm:text-sm">{t.netProfit} (C - D)</span>
                  <span className={`text-base sm:text-lg font-black ${netProfit >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                    {t.bdt} {netProfit.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-2 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                {lang === 'bn' ? 'অর্ডার ও লাভ প্রবৃদ্ধির গ্রাফ' : 'Revenue & Profit Growth Trend'}
              </h3>
              {ordersTimelineData.length > 0 ? (
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ordersTimelineData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(value) => [`৳${value.toLocaleString()}`, '']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                      <Line type="monotone" dataKey={lang === 'bn' ? 'বিক্রয়মূল্য' : 'Sales Value'} stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey={lang === 'bn' ? 'প্রফিট' : 'Profit'} stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-44 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                  {lang === 'bn' ? 'প্রবণতা দেখাতে পর্যাপ্ত তথ্য নেই' : 'No order data available for trend lines'}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* SEARCH AND ADD ACTION HEADER (Not for financials tab) */}
      {activeTab !== 'financials' && (
        <div id="tab-action-header" className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-4 py-2.5 w-full text-xs sm:text-sm border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all font-medium"
            />
          </div>
          {!showAddForm && (
            <button
              onClick={() => { resetForms(); setShowAddForm(true); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-2xl transition-all flex items-center gap-2 justify-center shadow-md shadow-indigo-100 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {activeTab === 'dealers' && t.addDealer}
              {activeTab === 'shops' && t.addShop}
              {activeTab === 'products' && t.addProduct}
              {activeTab === 'expenses' && t.addExpense}
              {activeTab === 'investments' && t.addInvestment}
              {activeTab === 'orders' && (lang === 'bn' ? 'অর্ডার লিস্ট' : 'Create Order (Switch to Dealer panel)')}
            </button>
          )}
        </div>
      )}

      {/* TAB CONTENT: DEALERS */}
      {activeTab === 'dealers' && (
        <div id="dealers-tab" className="space-y-6">
          {showAddForm && (
            <form onSubmit={editingId ? handleUpdateDealer : handleAddDealer} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-800 text-base sm:text-lg border-b border-slate-100 pb-3">
                {editingId ? (lang === 'bn' ? 'ডিলার তথ্য সম্পাদনা' : 'Edit Dealer Details') : t.addDealer}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">{t.name} *</label>
                  <input
                    type="text"
                    required
                    value={dealerForm.name}
                    onChange={(e) => setDealerForm({ ...dealerForm, name: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                    placeholder="যেমন: আলমগীর হোসেন"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">{t.phone} *</label>
                  <input
                    type="text"
                    required
                    value={dealerForm.phone}
                    onChange={(e) => setDealerForm({ ...dealerForm, phone: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                    placeholder="যেমন: 01712345678"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">{t.email}</label>
                  <input
                    type="email"
                    value={dealerForm.email}
                    onChange={(e) => setDealerForm({ ...dealerForm, email: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                    placeholder="যেমন: alamgir@email.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">{t.area}</label>
                  <input
                    type="text"
                    value={dealerForm.area}
                    onChange={(e) => setDealerForm({ ...dealerForm, area: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                    placeholder="যেমন: মিরপুর, ঢাকা"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={resetForms} className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
                  {t.cancel}
                </button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-100 cursor-pointer">
                  {t.save}
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4">{t.name}</th>
                    <th className="p-4">{t.phone}</th>
                    <th className="p-4">{t.email}</th>
                    <th className="p-4">{t.area}</th>
                    <th className="p-4 text-center">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {filteredDealers.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{d.name}</td>
                      <td className="p-4 text-slate-600 font-medium">{d.phone}</td>
                      <td className="p-4 text-slate-500 font-mono">{d.email || '-'}</td>
                      <td className="p-4">
                        <span className="bg-indigo-50 text-indigo-700 text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full border border-indigo-100/50">
                          {d.area || '-'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleEditDealer(d)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer" title={t.edit}>
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteDealer(d.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title={t.delete}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredDealers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 italic">{t.noData}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: SHOPS */}
      {activeTab === 'shops' && (
        <div id="shops-tab" className="space-y-6">
          {showAddForm && (
            <form onSubmit={editingId ? handleUpdateShop : handleAddShop} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-800 text-base sm:text-lg border-b border-slate-100 pb-3">
                {editingId ? (lang === 'bn' ? 'দোকান তথ্য সম্পাদনা' : 'Edit Shop Details') : t.addShop}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">{t.name} *</label>
                  <input
                    type="text"
                    required
                    value={shopForm.name}
                    onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                    placeholder="যেমন: মা জেনারেল স্টোর"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">{t.ownerName} *</label>
                  <input
                    type="text"
                    required
                    value={shopForm.ownerName}
                    onChange={(e) => setShopForm({ ...shopForm, ownerName: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                    placeholder="যেমন: মো: আবুল কাশেম"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">{t.phone}</label>
                  <input
                    type="text"
                    value={shopForm.phone}
                    onChange={(e) => setShopForm({ ...shopForm, phone: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                    placeholder="যেমন: 01700000000"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">{t.selectDealer} *</label>
                  <select
                    value={shopForm.dealerId}
                    required
                    onChange={(e) => setShopForm({ ...shopForm, dealerId: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50 text-slate-800"
                  >
                    <option value="">-- {t.selectDealer} --</option>
                    {dealers.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.area})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 block">{t.address}</label>
                  <textarea
                    value={shopForm.address}
                    onChange={(e) => setShopForm({ ...shopForm, address: e.target.value })}
                    rows={2}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                    placeholder="দোকানের বিস্তারিত ঠিকানা..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={resetForms} className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
                  {t.cancel}
                </button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-100 cursor-pointer">
                  {t.save}
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4">{t.name}</th>
                    <th className="p-4">{t.ownerName}</th>
                    <th className="p-4">{t.phone}</th>
                    <th className="p-4">{t.address}</th>
                    <th className="p-4">{t.dealer}</th>
                    <th className="p-4 text-center">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {filteredShops.map(s => {
                    const dl = dealers.find(d => d.id === s.dealerId);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{s.name}</td>
                        <td className="p-4 text-slate-700 font-semibold">{s.ownerName}</td>
                        <td className="p-4 text-slate-600 font-medium">{s.phone || '-'}</td>
                        <td className="p-4 text-slate-500 text-xs">{s.address || '-'}</td>
                        <td className="p-4">
                          <span className="bg-emerald-50 text-emerald-700 text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full border border-emerald-100/50">
                            {dl ? dl.name : 'Unassigned'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => handleEditShop(s)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer" title={t.edit}>
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteShop(s.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title={t.delete}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredShops.length === 0 && (
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

      {/* TAB CONTENT: PRODUCTS */}
      {activeTab === 'products' && (
        <div id="products-tab" className="space-y-6">
          {showAddForm && (
            <form onSubmit={editingId ? handleUpdateProduct : handleAddProduct} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-800 text-base sm:text-lg border-b border-slate-100 pb-3">
                {editingId ? (lang === 'bn' ? 'পণ্য তথ্য সম্পাদনা' : 'Edit Product Details') : t.addProduct}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">{t.name} *</label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                    placeholder="যেমন: মিনিকেট চাল"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">{t.sku} *</label>
                  <input
                    type="text"
                    required
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                    placeholder="যেমন: RICE-MINI"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">{t.unit} *</label>
                  <select
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50 text-slate-800"
                  >
                    <option value="Piece">Piece (পিস)</option>
                    <option value="Kg">Kg (কেজি)</option>
                    <option value="Liter">Liter (লিটার)</option>
                    <option value="Pack">Pack (প্যাকেট)</option>
                    <option value="Bosta">Bosta (বস্তা)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">{t.costPrice} * ({t.bdt})</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={productForm.costPrice || ''}
                    onChange={(e) => setProductForm({ ...productForm, costPrice: Number(e.target.value) })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                    placeholder="যেমন: 50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">{t.sellingPrice} * ({t.bdt})</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={productForm.sellingPrice || ''}
                    onChange={(e) => setProductForm({ ...productForm, sellingPrice: Number(e.target.value) })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                    placeholder="যেমন: 60"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">{t.stock} *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={productForm.stock || '0'}
                    onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                    placeholder="যেমন: 100"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={resetForms} className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
                  {t.cancel}
                </button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-100 cursor-pointer">
                  {t.save}
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4">{t.name}</th>
                    <th className="p-4">{t.sku}</th>
                    <th className="p-4">{t.unit}</th>
                    <th className="p-4 text-amber-700 bg-amber-50/40">{t.costPrice}</th>
                    <th className="p-4 text-emerald-700 bg-emerald-50/40">{t.sellingPrice}</th>
                    <th className="p-4">{t.stock}</th>
                    <th className="p-4 text-indigo-700 bg-indigo-50/40">{t.profit} / Unit</th>
                    <th className="p-4 text-center">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {filteredProducts.map(p => {
                    const unitProfit = p.sellingPrice - p.costPrice;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{p.name}</td>
                        <td className="p-4 font-mono font-medium text-xs text-slate-500">{p.sku}</td>
                        <td className="p-4 text-slate-600 font-medium">{p.unit}</td>
                        <td className="p-4 text-amber-700 font-bold bg-amber-50/10 font-mono">৳{p.costPrice}</td>
                        <td className="p-4 text-emerald-700 font-bold bg-emerald-50/10 font-mono">৳{p.sellingPrice}</td>
                        <td className="p-4">
                          <span className={`font-bold px-2.5 py-1 rounded-full text-xs ${p.stock <= 10 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-800'}`}>
                            {p.stock}
                          </span>
                        </td>
                        <td className="p-4 text-indigo-700 font-black bg-indigo-50/10 font-mono">৳{unitProfit}</td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => handleEditProduct(p)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer" title={t.edit}>
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteProduct(p.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title={t.delete}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 italic">{t.noData}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ORDERS */}
      {activeTab === 'orders' && (
        <div id="orders-tab" className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4">Order ID</th>
                    <th className="p-4">{t.shops}</th>
                    <th className="p-4">{t.dealer}</th>
                    <th className="p-4">{t.items}</th>
                    <th className="p-4 text-emerald-700 bg-emerald-50/30">{t.total} ({t.sellingPrice})</th>
                    <th className="p-4 text-indigo-700 bg-indigo-50/30">{t.profit}</th>
                    <th className="p-4">{t.status}</th>
                    <th className="p-4 text-center">Actions / Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {filteredOrders.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono text-[10px] sm:text-xs text-slate-400">#{o.id.substring(0,8)}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{o.shopName}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{new Date(o.date).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US')}</div>
                      </td>
                      <td className="p-4 text-slate-700 font-semibold">{o.dealerName}</td>
                      <td className="p-4 text-xs">
                        <div className="space-y-1 max-w-[200px]">
                          {o.items.map((it, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-150 p-1 px-2 rounded-lg flex justify-between gap-1">
                              <span className="truncate mr-2 text-slate-700 font-medium">{it.productName}</span>
                              <span className="font-bold text-indigo-600 shrink-0">x{it.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-emerald-700 font-extrabold bg-emerald-50/10 font-mono">
                        ৳{o.totalSellingPrice.toLocaleString()}
                      </td>
                      <td className="p-4 text-indigo-700 font-black bg-indigo-50/10 font-mono">
                        ৳{o.profit.toLocaleString()}
                      </td>
                      <td className="p-4">
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
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1.5 items-stretch max-w-[150px] mx-auto">
                          {o.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateOrderStatus(o.id, 'Ready')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] sm:text-xs font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
                              >
                                <Check className="w-3.5 h-3.5" /> {t.markAsDelivered}
                              </button>
                              <button
                                onClick={() => handleUpdateOrderStatus(o.id, 'Cancelled')}
                                className="bg-rose-50 text-rose-600 hover:bg-rose-100 text-[10px] sm:text-xs font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer border border-rose-100"
                              >
                                <X className="w-3.5 h-3.5" /> {t.markAsCancelled}
                              </button>
                            </>
                          )}
                          {o.status === 'Ready' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(o.id, 'Cancelled')}
                              className="bg-rose-50 text-rose-600 hover:bg-rose-100 text-[10px] sm:text-xs font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer border border-rose-100"
                            >
                              <X className="w-3.5 h-3.5" /> {t.markAsCancelled}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteOrder(o.id)}
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-[10px] sm:text-xs font-bold py-1 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> {lang === 'bn' ? 'মুছে ফেলুন' : 'Delete Log'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 italic">{t.noData}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: EXPENSES */}
      {activeTab === 'expenses' && (
        <div id="expenses-tab" className="space-y-6">
          {showAddForm && (
            <form onSubmit={editingId ? handleUpdateExpense : handleAddExpense} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-800 text-base sm:text-lg border-b border-slate-100 pb-3">
                {editingId ? (lang === 'bn' ? 'খরচ বিবরণ সম্পাদনা' : 'Edit Expense Entry') : t.addExpense}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">{t.name} *</label>
                  <input
                    type="text"
                    required
                    value={expenseForm.title}
                    onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                    placeholder="যেমন: ইন্টারনেট বিল"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">{t.amount} *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={expenseForm.amount || ''}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                    placeholder="টাকার পরিমাণ..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">{t.category} *</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50 text-slate-800"
                  >
                    <option value="Transport">Transport (যাতায়াত)</option>
                    <option value="Rent">Rent (অফিস ভাড়া)</option>
                    <option value="Salaries">Salaries (বেতন)</option>
                    <option value="Utilities">Utilities (বিদ্যুৎ/ইন্টারনেট)</option>
                    <option value="Others">Others (অন্যান্য)</option>
                  </select>
                </div>
                <div className="space-y-1 bg-white">
                  <label className="text-xs font-bold text-slate-500 block">{t.date} *</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                  />
                </div>
                <div className="space-y-1 md:col-span-2 lg:col-span-4">
                  <label className="text-xs font-bold text-slate-500 block">{t.description}</label>
                  <input
                    type="text"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                    placeholder="বিস্তারিত বিবরণ..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={resetForms} className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
                  {t.cancel}
                </button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-100 cursor-pointer">
                  {t.save}
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4">{t.name}</th>
                    <th className="p-4">{t.category}</th>
                    <th className="p-4">{t.amount}</th>
                    <th className="p-4">{t.date}</th>
                    <th className="p-4">{t.description}</th>
                    <th className="p-4 text-center">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {filteredExpenses.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{e.title}</td>
                      <td className="p-4">
                        <span className="bg-rose-50 text-rose-700 text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full border border-rose-100/50">
                          {e.category}
                        </span>
                      </td>
                      <td className="p-4 font-black text-rose-600 font-mono">৳{e.amount.toLocaleString()}</td>
                      <td className="p-4 text-slate-500 text-xs font-medium">{e.date}</td>
                      <td className="p-4 text-slate-500 text-xs">{e.description || '-'}</td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleEditExpense(e)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer" title={t.edit}>
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteExpense(e.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title={t.delete}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredExpenses.length === 0 && (
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

      {/* TAB CONTENT: INVESTMENTS */}
      {activeTab === 'investments' && (
        <div id="investments-tab" className="space-y-6">
          {showAddForm && (
            <form onSubmit={editingId ? handleUpdateInvestment : handleAddInvestment} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-800 text-base sm:text-lg border-b border-slate-100 pb-3">
                {editingId ? (lang === 'bn' ? 'বিনিয়োগ বিবরণ সম্পাদনা' : 'Edit Investment Entry') : t.addInvestment}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">{t.name} *</label>
                  <input
                    type="text"
                    required
                    value={investmentForm.title}
                    onChange={(e) => setInvestmentForm({ ...investmentForm, title: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                    placeholder="যেমন: প্রারম্ভিক শেয়ার মূলধন"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">{t.amount} *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={investmentForm.amount || ''}
                    onChange={(e) => setInvestmentForm({ ...investmentForm, amount: Number(e.target.value) })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                    placeholder="টাকার পরিমাণ..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">{t.date} *</label>
                  <input
                    type="date"
                    required
                    value={investmentForm.date}
                    onChange={(e) => setInvestmentForm({ ...investmentForm, date: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                  />
                </div>
                <div className="space-y-1 md:col-span-3">
                  <label className="text-xs font-bold text-slate-500 block">{t.description}</label>
                  <input
                    type="text"
                    value={investmentForm.description}
                    onChange={(e) => setInvestmentForm({ ...investmentForm, description: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                    placeholder="বিস্তারিত বিবরণ..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={resetForms} className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
                  {t.cancel}
                </button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-100 cursor-pointer">
                  {t.save}
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4">{t.name}</th>
                    <th className="p-4">{t.amount}</th>
                    <th className="p-4">{t.date}</th>
                    <th className="p-4">{t.description}</th>
                    <th className="p-4 text-center">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {filteredInvestments.map(i => (
                    <tr key={i.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{i.title}</td>
                      <td className="p-4 font-extrabold text-teal-600 font-mono">৳{i.amount.toLocaleString()}</td>
                      <td className="p-4 text-slate-500 text-xs font-medium">{i.date}</td>
                      <td className="p-4 text-slate-500 text-xs">{i.description || '-'}</td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleEditInvestment(i)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer" title={t.edit}>
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteInvestment(i.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title={t.delete}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredInvestments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 italic">{t.noData}</td>
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
