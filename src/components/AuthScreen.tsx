import React, { useState } from 'react';
import { 
  Building2, Mail, Phone, Lock, User, MapPin, LogIn, AlertCircle, Info, Eye, EyeOff
} from 'lucide-react';
import { Language, Dealer } from '../types';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

interface AuthScreenProps {
  lang: Language;
  onLoginSuccess: (user: {
    email: string;
    phone: string;
    role: 'admin' | 'dealer';
    dealerId?: string;
    name?: string;
  }) => void;
  dealers: Dealer[];
  onAddDealer: (newDealer: Dealer) => void;
}

export default function AuthScreen({ lang, onLoginSuccess, dealers, onAddDealer }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Constants
  const ADMIN_EMAIL = "ahmadshorif00001@gmail.com";
  const ADMIN_PHONE = "01756447869";  // 11-digit correct phone number
  const ADMIN_PASSWORD = "@51423@91910@";

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Sanitize input
    const cleanEmail = email.toLowerCase().trim();
    
    // Clean phone number: remove any non-digit characters and standard Bangladesh prefixes (+880, 880)
    let cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.startsWith('880')) {
      cleanPhone = '0' + cleanPhone.slice(3);
    } else if (cleanPhone.startsWith('00880')) {
      cleanPhone = '0' + cleanPhone.slice(5);
    } else if (cleanPhone.length === 10 && !cleanPhone.startsWith('0')) {
      cleanPhone = '0' + cleanPhone; // Auto prepend 0 if 10 digits
    }

    const cleanPassword = password;

    if (!cleanEmail || !cleanPhone || !cleanPassword) {
      setErrorMessage(lang === 'bn' ? 'সবগুলো ঘর পূরণ করা আবশ্যক!' : 'All fields are required!');
      return;
    }

    if (isSignUp) {
      if (!name.trim() || !area.trim()) {
        setErrorMessage(lang === 'bn' ? 'সবগুলো ঘর পূরণ করা আবশ্যক!' : 'All fields are required!');
        return;
      }
      if (cleanPassword.length < 6) {
        setErrorMessage(lang === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে!' : 'Password must be at least 6 characters!');
        return;
      }

      // Check if admin credentials are being used for signup
      if (cleanEmail === ADMIN_EMAIL.toLowerCase() || cleanPhone === ADMIN_PHONE) {
        setErrorMessage(lang === 'bn' ? 'এই ইমেইল/ফোন নম্বরটি অ্যাডমিন অ্যাকাউন্টের জন্য সংরক্ষিত!' : 'This email/phone is reserved for the Admin account!');
        return;
      }

      // Check if account already exists
      const accountsRaw = localStorage.getItem('company_accounts');
      const accounts = accountsRaw ? JSON.parse(accountsRaw) : [];
      const exists = accounts.some((acc: any) => acc.email.toLowerCase() === cleanEmail || acc.phone === cleanPhone);

      if (exists) {
        setErrorMessage(lang === 'bn' ? 'এই ইমেইল বা ফোন নম্বর দিয়ে ইতিমধ্যে অ্যাকাউন্ট করা আছে!' : 'An account with this email or phone already exists!');
        return;
      }

      // Create new dealer
      const newDealerId = `dl-${Date.now()}`;
      const newDealer: Dealer = {
        id: newDealerId,
        name: name.trim(),
        phone: cleanPhone,
        email: cleanEmail,
        area: area.trim()
      };

      // Define save action to perform
      const saveAndLoginLocally = () => {
        onAddDealer(newDealer);
        const newAccount = {
          email: cleanEmail,
          phone: cleanPhone,
          password: cleanPassword,
          role: 'dealer' as const,
          dealerId: newDealerId,
          name: name.trim(),
          area: area.trim()
        };
        localStorage.setItem('company_accounts', JSON.stringify([...accounts, newAccount]));

        onLoginSuccess({
          email: cleanEmail,
          phone: cleanPhone,
          role: 'dealer',
          dealerId: newDealerId,
          name: name.trim()
        });
      };

      // Fire Firebase Registration with fallback
      try {
        await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        saveAndLoginLocally();
      } catch (err) {
        console.warn("Firebase Auth registration failed, performing robust local signup fallback:", err);
        saveAndLoginLocally();
      }

    } else {
      // LOGIN FLOW
      const performLocalLoginCheck = () => {
        // A. Check Admin (forgiving comparison of either Email or Phone, with password)
        const isAdminEmail = cleanEmail === ADMIN_EMAIL.toLowerCase();
        const isAdminPhone = cleanPhone === ADMIN_PHONE;

        if ((isAdminEmail || isAdminPhone) && cleanPassword === ADMIN_PASSWORD) {
          onLoginSuccess({
            email: ADMIN_EMAIL,
            phone: ADMIN_PHONE,
            role: 'admin',
            name: lang === 'bn' ? 'সিস্টেম অ্যাডমিন' : 'System Admin'
          });
          return true;
        }

        // B. Check accounts from localStorage
        const accountsRaw = localStorage.getItem('company_accounts');
        const accounts = accountsRaw ? JSON.parse(accountsRaw) : [];
        const foundAccount = accounts.find((acc: any) => 
          (acc.email.toLowerCase() === cleanEmail || acc.phone === cleanPhone) && 
          acc.password === cleanPassword
        );

        if (foundAccount) {
          onLoginSuccess({
            email: foundAccount.email,
            phone: foundAccount.phone,
            role: foundAccount.role,
            dealerId: foundAccount.dealerId,
            name: foundAccount.name
          });
          return true;
        }

        // C. Fallback for Preloaded Dealers (if password is '123456')
        const matchedPreloadedDealer = dealers.find(d => 
          d.email.toLowerCase() === cleanEmail || d.phone === cleanPhone
        );
        if (matchedPreloadedDealer && cleanPassword === '123456') {
          onLoginSuccess({
            email: matchedPreloadedDealer.email,
            phone: matchedPreloadedDealer.phone,
            role: 'dealer',
            dealerId: matchedPreloadedDealer.id,
            name: matchedPreloadedDealer.name
          });
          return true;
        }

        return false;
      };

      // Try Firebase Auth login first, but with seamless offline fallback
      try {
        let loginEmail = cleanEmail;
        // If they left email blank or typed phone, lookup email
        if (!loginEmail && cleanPhone) {
          const accountsRaw = localStorage.getItem('company_accounts');
          const accounts = accountsRaw ? JSON.parse(accountsRaw) : [];
          const match = accounts.find((a: any) => a.phone === cleanPhone);
          if (match) loginEmail = match.email;
        }

        if (loginEmail) {
          await signInWithEmailAndPassword(auth, loginEmail, cleanPassword);
          // Sync with local databases
          if (!performLocalLoginCheck()) {
            const isAdm = loginEmail === ADMIN_EMAIL.toLowerCase();
            onLoginSuccess({
              email: loginEmail,
              phone: cleanPhone || (isAdm ? ADMIN_PHONE : ''),
              role: isAdm ? 'admin' : 'dealer',
              name: isAdm ? (lang === 'bn' ? 'সিস্টেম অ্যাডমিন' : 'System Admin') : 'Dealer User'
            });
          }
        } else {
          // Check locally if no email is resolvable
          if (!performLocalLoginCheck()) {
            throw new Error("Local credentials check failed.");
          }
        }
      } catch (fbError) {
        console.warn("Firebase Auth login failed, running offline/local validation fallback:", fbError);
        const localSuccess = performLocalLoginCheck();
        if (!localSuccess) {
          setErrorMessage(
            lang === 'bn' 
              ? 'ভুল ইমেইল, মোবাইল নম্বর বা পাসওয়ার্ড! অনুগ্রহ করে আবার চেষ্টা করুন।' 
              : 'Invalid email, phone, or password! Please try again.'
          );
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 antialiased">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-150 overflow-hidden flex flex-col">
        {/* Top Header Card Banner */}
        <div className="bg-slate-900 p-6 text-white relative overflow-hidden text-center">
          <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="absolute left-0 bottom-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl -ml-10 -mb-10"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg inline-block mb-3 text-white">
              <Building2 className="w-8 h-8" />
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight">
              {lang === 'bn' ? 'ট্রেডিং ও ডিস্ট্রিবিউটর পোর্টাল' : 'Trading & Distributor Portal'}
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-1">
              {isSignUp 
                ? (lang === 'bn' ? 'নতুন ডিলার পার্টনারশিপ শুরু করুন' : 'Begin Your Dealer Partnership')
                : (lang === 'bn' ? 'অ্যাকাউন্টে লগইন করুন' : 'Sign in to Manage Workspace')
              }
            </p>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 flex-1">
          {errorMessage && (
            <div className="mb-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs sm:text-sm p-3.5 rounded-2xl flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {isSignUp && (
              <>
                {/* Full Name field for Sign Up */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">
                    {lang === 'bn' ? 'ডিলারের পূর্ণ নাম *' : 'Dealer Full Name *'}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={lang === 'bn' ? 'যেমন: হাসিবুর রহমান' : 'e.g. Hasibur Rahman'}
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                    />
                  </div>
                </div>

                {/* Territory/Area field for Sign Up */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">
                    {lang === 'bn' ? 'এলাকা/অঞ্চল *' : 'Territory / Area *'}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder={lang === 'bn' ? 'যেমন: গুলশান, ঢাকা' : 'e.g. Gulshan, Dhaka'}
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email Address */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 block">
                {lang === 'bn' ? 'ইমেইল ঠিকানা *' : 'Email Address *'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 block">
                {lang === 'bn' ? 'মোবাইল নম্বর *' : 'Phone Number *'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 block">
                {lang === 'bn' ? 'পাসওয়ার্ড *' : 'Password *'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-indigo-150 flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              {isSignUp 
                ? (lang === 'bn' ? 'নিবন্ধন সম্পন্ন করুন' : 'Complete Registration')
                : (lang === 'bn' ? 'লগইন করুন' : 'Sign In')
              }
            </button>
          </form>

          {/* Toggle Button */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMessage(null);
              }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
            >
              {isSignUp 
                ? (lang === 'bn' ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন' : 'Already have an account? Sign In')
                : (lang === 'bn' ? 'নতুন ডিলার অ্যাকাউন্ট চান? সাইন আপ করুন' : 'Need a dealer account? Register Now')
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
