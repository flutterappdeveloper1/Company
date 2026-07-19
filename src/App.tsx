/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Building2, ShieldCheck, Users, Globe, LogOut, ArrowRightLeft, 
  HelpCircle, RefreshCw, Bell, BellRing, CheckCircle2, AlertTriangle, X, Volume2, Briefcase, Store, Package, TrendingUp
} from 'lucide-react';
import { Language, UserRole, Dealer, Shop, Product, Order, Expense, Investment } from './types';
import { 
  INITIAL_DEALERS, INITIAL_SHOPS, INITIAL_PRODUCTS, 
  INITIAL_ORDERS, INITIAL_EXPENSES, INITIAL_INVESTMENTS, translations 
} from './data';
import AdminDashboard from './components/AdminDashboard';
import DealerDashboard from './components/DealerDashboard';
import AuthScreen from './components/AuthScreen';
import { auth, messaging } from './firebase';
import { onMessage } from 'firebase/messaging';
import { signOut } from 'firebase/auth';

// Web Audio API helper to generate crisp, friendly chime sound instantly offline
export function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Note 1: Clear sweet tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    // Note 2: Harmonious chime offset for a crisp dual-tone chord
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, ctx.currentTime + 0.08); // B5
    gain2.gain.setValueAtTime(0, ctx.currentTime);
    gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.4);
    
    osc2.start(ctx.currentTime + 0.08);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (err) {
    console.warn("Audio Context could not be auto-played due to browser restrictions:", err);
  }
}

interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
}

export default function App() {
  // Global configurations
  const [lang, setLang] = useState<Language>('bn'); // default to Bangla
  const [role, setRole] = useState<UserRole>('admin'); // default to Admin view

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<{
    email: string;
    phone: string;
    role: 'admin' | 'dealer';
    dealerId?: string;
    name?: string;
  } | null>(null);

  // Core Database States
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Custom confirmation dialog states
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Notification and toast states
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  // Global notification trigger
  const triggerNotification = (
    title: string, 
    body: string, 
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ) => {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title,
      body,
      type,
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotif, ...prev].slice(0, 50));
    setActiveToast(newNotif);
    playNotificationSound();
  };

  // Auto-dismiss active toast notification
  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  // Hook foreground Firebase messaging if supported
  useEffect(() => {
    if (messaging) {
      try {
        const unsubscribe = onMessage(messaging, (payload) => {
          console.log("Foreground message received:", payload);
          const title = payload.notification?.title || (lang === 'bn' ? 'নতুন বার্তা' : 'New Message');
          const body = payload.notification?.body || (lang === 'bn' ? 'সিস্টেমে একটি নতুন আপডেট এসেছে।' : 'A new update was pushed to the system.');
          triggerNotification(title, body, 'success');
        });
        return () => unsubscribe();
      } catch (err) {
        console.warn("FCM onMessage handler subscription failed:", err);
      }
    }
  }, [lang]);

  // State loading from LocalStorage
  useEffect(() => {
    try {
      const storedDealers = localStorage.getItem('company_dealers');
      const storedShops = localStorage.getItem('company_shops');
      const storedProducts = localStorage.getItem('company_products');
      const storedOrders = localStorage.getItem('company_orders');
      const storedExpenses = localStorage.getItem('company_expenses');
      const storedInvestments = localStorage.getItem('company_investments');
      const storedLang = localStorage.getItem('company_lang');
      const storedRole = localStorage.getItem('company_role');
      const storedCurrentUser = localStorage.getItem('company_current_user');

      setDealers(storedDealers ? JSON.parse(storedDealers) : INITIAL_DEALERS);
      setShops(storedShops ? JSON.parse(storedShops) : INITIAL_SHOPS);
      setProducts(storedProducts ? JSON.parse(storedProducts) : INITIAL_PRODUCTS);
      setOrders(storedOrders ? JSON.parse(storedOrders) : INITIAL_ORDERS);
      setExpenses(storedExpenses ? JSON.parse(storedExpenses) : INITIAL_EXPENSES);
      setInvestments(storedInvestments ? JSON.parse(storedInvestments) : INITIAL_INVESTMENTS);
      
      if (storedLang) setLang(storedLang as Language);
      if (storedRole) setRole(storedRole as UserRole);
      if (storedCurrentUser) {
        const parsedUser = JSON.parse(storedCurrentUser);
        setCurrentUser(parsedUser);
        setRole(parsedUser.role);
      }

      // Seed preloaded accounts if they don't exist
      const storedAccounts = localStorage.getItem('company_accounts');
      if (!storedAccounts) {
        const defaultAccounts = [
          {
            email: 'alamgir@company.com',
            phone: '01712345678',
            password: '123456',
            role: 'dealer',
            dealerId: 'dl-1',
            name: 'আলমগীর হোসেন (Alamgir Hossain)',
            area: 'মিরপুর, ঢাকা (Mirpur, Dhaka)'
          },
          {
            email: 'rafiqul@company.com',
            phone: '01812345679',
            password: '123456',
            role: 'dealer',
            dealerId: 'dl-2',
            name: 'রফিকুল ইসলাম (Rafiqul Islam)',
            area: 'চকবাজার, চট্টগ্রাম (Chawkbazar, Chattogram)'
          },
          {
            email: 'sumon@company.com',
            phone: '01912345680',
            password: '123456',
            role: 'dealer',
            dealerId: 'dl-3',
            name: 'সুমন আহমেদ (Sumon Ahmed)',
            area: 'শিবগঞ্জ, সিলেট (Shibganj, Sylhet)'
          }
        ];
        localStorage.setItem('company_accounts', JSON.stringify(defaultAccounts));
      }
    } catch (e) {
      console.error("Error restoring state", e);
      // Fallback
      setDealers(INITIAL_DEALERS);
      setShops(INITIAL_SHOPS);
      setProducts(INITIAL_PRODUCTS);
      setOrders(INITIAL_ORDERS);
      setExpenses(INITIAL_EXPENSES);
      setInvestments(INITIAL_INVESTMENTS);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save states to local storage on changes once initialized
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('company_dealers', JSON.stringify(dealers));
    }
  }, [dealers, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('company_shops', JSON.stringify(shops));
    }
  }, [shops, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('company_products', JSON.stringify(products));
    }
  }, [products, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('company_orders', JSON.stringify(orders));
    }
  }, [orders, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('company_expenses', JSON.stringify(expenses));
    }
  }, [expenses, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('company_investments', JSON.stringify(investments));
    }
  }, [investments, isInitialized]);

  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('company_lang', newLang);
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    localStorage.setItem('company_role', newRole);
  };

  const handleLoginSuccess = (user: {
    email: string;
    phone: string;
    role: 'admin' | 'dealer';
    dealerId?: string;
    name?: string;
  }) => {
    setCurrentUser(user);
    setRole(user.role);
    localStorage.setItem('company_current_user', JSON.stringify(user));
    localStorage.setItem('company_role', user.role);
  };

  const handleRegisterDealer = (newDealer: Dealer) => {
    const updatedDealers = [...dealers, newDealer];
    setDealers(updatedDealers);
    localStorage.setItem('company_dealers', JSON.stringify(updatedDealers));
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    signOut(auth).catch(err => console.warn("Firebase Auth signOut error:", err));
    setCurrentUser(null);
    localStorage.removeItem('company_current_user');
    setRole('dealer');
    localStorage.setItem('company_role', 'dealer');
    setShowLogoutConfirm(false);
  };

  const handleResetToDefault = () => {
    setShowResetConfirm(true);
  };

  const confirmResetToDefault = () => {
    localStorage.clear();
    setDealers(INITIAL_DEALERS);
    setShops(INITIAL_SHOPS);
    setProducts(INITIAL_PRODUCTS);
    setOrders(INITIAL_ORDERS);
    setExpenses(INITIAL_EXPENSES);
    setInvestments(INITIAL_INVESTMENTS);
    setShowResetConfirm(false);
    window.location.reload();
  };

  const t = translations[lang];

  if (!currentUser) {
    return (
      <div className="relative min-h-screen bg-slate-50 flex flex-col justify-between">
        {/* Simple topbar for language select in Auth mode */}
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => handleLanguageChange(lang === 'bn' ? 'en' : 'bn')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-white shadow-sm px-3.5 py-2.5 rounded-xl transition-all border border-slate-200 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'English' : 'বাংলা'}</span>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <AuthScreen 
            lang={lang} 
            onLoginSuccess={handleLoginSuccess} 
            dealers={dealers} 
            onAddDealer={handleRegisterDealer} 
          />
        </div>
        <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 py-6 text-xs text-center">
          <div className="max-w-7xl mx-auto px-4 space-y-2">
            <p>© 2026 {t.appName}. All rights reserved.</p>
            <p className="text-slate-600 font-mono">
              {lang === 'bn' ? 'রিয়েল-টাইম লোকাল ডাটাবেজ দ্বারা সুরক্ষিত' : 'Secure client-side localized persistence enabled'}
            </p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Top Banner / Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between h-16 items-center gap-2">
            
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="p-1.5 sm:p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-100 shrink-0">
                <Building2 className="w-5 h-5 sm:w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xs sm:text-sm md:text-lg font-extrabold text-slate-800 tracking-tight leading-tight truncate max-w-[120px] xs:max-w-[160px] sm:max-w-none">
                  {t.appName}
                </h1>
                <p className="text-[9px] sm:text-xs text-slate-400 font-bold tracking-wide uppercase truncate">
                  {role === 'admin' ? t.adminOwner : t.dealer}
                </p>
              </div>
            </div>

            {/* Right: Language Toggle & User Switcher */}
            <div className="flex items-center gap-1.5 sm:gap-3 flex-nowrap min-w-0">
              
              {/* Language Switch */}
              <button
                onClick={() => handleLanguageChange(lang === 'bn' ? 'en' : 'bn')}
                className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 p-2 sm:px-3 sm:py-2.5 rounded-xl transition-all border border-slate-200/80 cursor-pointer shrink-0"
                title="Change Language / ভাষা পরিবর্তন"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{lang === 'bn' ? 'English' : 'বাংলা'}</span>
              </button>



              {/* Notification Bell with Badge & Dropdown */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                  className="p-2 sm:p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl border border-slate-200/80 transition-all cursor-pointer relative"
                  title={lang === 'bn' ? 'বিজ্ঞপ্তি এবং নোটিফিকেশন' : 'Notifications'}
                >
                  {notifications.filter(n => !n.read).length > 0 ? (
                    <>
                      <BellRing className="w-4 h-4 text-indigo-600 animate-bounce" />
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-[9px] font-black text-white flex items-center justify-center rounded-full animate-pulse">
                        {notifications.filter(n => !n.read).length}
                      </span>
                    </>
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                </button>

                {/* Dropdown Menu */}
                {showNotificationPanel && (
                  <div className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 p-4 space-y-3 text-left animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-1.5">
                        <Bell className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-xs sm:text-sm font-black text-slate-800">
                          {lang === 'bn' ? 'বিজ্ঞপ্তি ও নোটিফিকেশন' : 'Notifications'}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Send Test Notification Button */}
                        <button
                          onClick={() => {
                            triggerNotification(
                              lang === 'bn' ? 'সিস্টেম নোটিফিকেশন টেস্ট!' : 'Test Notification Spark!',
                              lang === 'bn' ? 'আপনার অ্যাপের নোটিফিকেশন ও সুন্দর শব্দ সফলভাবে কাজ করছে!' : 'Visual notification popups and audio chimes are operating perfectly!',
                              'success'
                            );
                          }}
                          className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-1 rounded-lg hover:bg-indigo-100 transition-all cursor-pointer flex items-center gap-1"
                          title={lang === 'bn' ? 'পরীক্ষামূলক শব্দ সহ নোটিফিকেশন পাঠান' : 'Test notification with audio'}
                        >
                          <Volume2 className="w-3 h-3 animate-pulse text-indigo-500" />
                          <span>{lang === 'bn' ? 'টেস্ট করুন' : 'Test Audio'}</span>
                        </button>
                        
                        <button 
                          onClick={() => setShowNotificationPanel(false)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 space-y-2">
                          <Bell className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
                          <p className="text-[11px] font-medium">
                            {lang === 'bn' ? 'কোন নোটিফিকেশন নেই' : 'No recent notifications'}
                          </p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            onClick={() => {
                              setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                            }}
                            className={`pt-2.5 pb-2 cursor-pointer transition-all rounded-lg px-2 hover:bg-slate-50 flex items-start gap-2.5 ${!notif.read ? 'bg-indigo-50/20' : ''}`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {notif.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                              {notif.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                              {notif.type === 'error' && <X className="w-4 h-4 text-rose-500" />}
                              {notif.type === 'info' && <Bell className="w-4 h-4 text-indigo-500" />}
                            </div>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <p className="text-xs font-black text-slate-800 leading-tight truncate">
                                {notif.title}
                              </p>
                              <p className="text-[10px] sm:text-xs text-slate-500 leading-relaxed font-medium">
                                {notif.body}
                              </p>
                              <p className="text-[9px] text-slate-400 font-mono">
                                {notif.timestamp.toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {notifications.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 text-center">
                        <button
                          onClick={() => {
                            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                          }}
                          className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                        >
                          {lang === 'bn' ? 'সব পঠিত হিসেবে চিহ্নিত করুন' : 'Mark all as read'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Separation line */}
              <div className="h-6 w-[1px] bg-slate-200 hidden sm:block shrink-0"></div>

              {/* Logged in User Badge */}
              <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100 text-[10px] sm:text-xs font-bold max-w-[100px] sm:max-w-[150px] shrink-0" title={currentUser.name || currentUser.email}>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-indigo-500 animate-pulse shrink-0"></div>
                <span className="truncate">{currentUser.name || currentUser.email}</span>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 p-2 sm:px-3.5 sm:py-2.5 rounded-xl transition-all border border-rose-200 cursor-pointer shrink-0"
                title={lang === 'bn' ? 'লগ আউট' : 'Log Out'}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{lang === 'bn' ? 'লগ আউট' : 'Log Out'}</span>
              </button>

              {/* Fast Role Simulator Switcher - ONLY for Admins */}
              {currentUser.role === 'admin' && (
                <div className="hidden sm:flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200 shrink-0">
                  <button
                    onClick={() => handleRoleChange('admin')}
                    className={`px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                      role === 'admin' 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                    }`}
                    title={t.adminOwner}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">{t.adminOwner}</span>
                  </button>
                  <button
                    onClick={() => handleRoleChange('dealer')}
                    className={`px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                      role === 'dealer' 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                    }`}
                    title={t.dealer}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">{t.dealer}</span>
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Dynamic Header Welcomer */}
        <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
          {/* Accent decoration */}
          <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>

          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-white/10 p-1 px-3 rounded-full text-[10px] sm:text-xs font-bold backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
              {role === 'admin' ? (lang === 'bn' ? 'অ্যাডমিন ড্যাশবোর্ড মোড' : 'Admin Dashboard Active') : (lang === 'bn' ? 'ডিলার কন্ট্রোল মোড' : 'Dealer Workspace Active')}
            </div>
            
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-none pt-1">
              {lang === 'bn' ? 'কোম্পানি বাণিজ্যিক নিয়ন্ত্রণ ও ডিলার পোর্টাল' : 'Enterprise Trading & Distributorship Portal'}
            </h2>
            
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-3xl leading-relaxed">
              {role === 'admin' 
                ? (lang === 'bn' 
                    ? 'কোম্পানির ওনার বা অ্যাডমিন হিসেবে সকল লাভ-লোকসান হিসাব, ডিলারদের এলাকাভিত্তিক ট্র্যাক, পণ্যের মূল্য ও স্টক ব্যবস্থাপনা এবং খরচ তদারকি করুন।' 
                    : 'Monitor detailed company financials, inventory purchase rates, and oversee general sales transactions across regional dealers.')
                : (lang === 'bn' 
                    ? 'আপনার আওতাভুক্ত দোকানদারদের পরিচালনা করুন, স্টক পর্যবেক্ষণ করুন এবং খুচরা দোকানদারের কাছ থেকে নতুন অর্ডার বুক করুন।' 
                    : 'Manage retail outlets in your region, log daily shop receipts, and record customer orders in real-time.')
              }
            </p>

            {/* Quick action pointer - ONLY for Admin */}
            {currentUser.role === 'admin' && (
              <div className="pt-3 flex flex-wrap gap-2 text-[11px] sm:text-xs">
                <span className="text-slate-400">{t.loginAs}</span>
                <button 
                  onClick={() => handleRoleChange(role === 'admin' ? 'dealer' : 'admin')}
                  className="text-sky-300 hover:text-sky-200 font-bold underline cursor-pointer flex items-center gap-1"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  {role === 'admin' ? (lang === 'bn' ? 'ডিলার ভিউতে যান' : 'Switch to Dealer View') : (lang === 'bn' ? 'অ্যাডমিন ভিউতে যান' : 'Switch to Admin View')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Dashboard Selector */}
        {role === 'admin' ? (
          <AdminDashboard
            lang={lang}
            dealers={dealers}
            shops={shops}
            products={products}
            orders={orders}
            expenses={expenses}
            investments={investments}
            onUpdateDealers={setDealers}
            onUpdateShops={setShops}
            onUpdateProducts={setProducts}
            onUpdateOrders={setOrders}
            onUpdateExpenses={setExpenses}
            onUpdateInvestments={setInvestments}
            onTriggerNotification={triggerNotification}
          />
        ) : (
          <DealerDashboard
            lang={lang}
            dealers={dealers}
            shops={shops}
            products={products}
            orders={orders}
            onUpdateShops={setShops}
            onUpdateOrders={setOrders}
            onUpdateDealers={setDealers}
            onTriggerNotification={triggerNotification}
            loggedInDealerId={currentUser.role === 'dealer' ? currentUser.dealerId : undefined}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 py-6 text-xs text-center mt-auto">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p>© 2026 {t.appName}. All rights reserved.</p>
          <p className="text-slate-600 font-mono">
            {lang === 'bn' ? 'রিয়েল-টাইম লোকাল ডাটাবেজ দ্বারা সুরক্ষিত' : 'Secure client-side localized persistence enabled'}
          </p>
        </div>
      </footer>

      {/* Modern Custom Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
              <LogOut className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">
                {lang === 'bn' ? 'লগ আউট নিশ্চিতকরণ' : 'Confirm Logout'}
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                {lang === 'bn' ? 'আপনি কি নিশ্চিত যে এই সেশনটি শেষ করে লগ আউট করতে চান?' : 'Are you sure you want to end this session and log out?'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={confirmLogout}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-rose-100"
              >
                {lang === 'bn' ? 'লগ আউট' : 'Log Out'}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Toast Notification Container with Dual-tone Sound & Slide-in Animation */}
      {activeToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm bg-slate-900 text-white rounded-3xl shadow-2xl p-4 border border-slate-800 flex items-start gap-3 animate-in fade-in slide-in-from-top-6 duration-300">
          <div className="mt-0.5 shrink-0 p-1.5 bg-slate-800 rounded-xl">
            {activeToast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {activeToast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
            {activeToast.type === 'error' && <X className="w-5 h-5 text-rose-400" />}
            {activeToast.type === 'info' && <Bell className="w-5 h-5 text-indigo-400" />}
          </div>
          
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-black tracking-tight leading-snug">
                {activeToast.title}
              </span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-500/15 text-[8px] font-bold text-indigo-300 font-mono">
                <Volume2 className="w-2.5 h-2.5 animate-pulse text-indigo-300" /> {lang === 'bn' ? 'শব্দ সক্রিয়' : 'SOUND'}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 font-medium leading-relaxed">
              {activeToast.body}
            </p>
          </div>

          <button 
            onClick={() => setActiveToast(null)}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
