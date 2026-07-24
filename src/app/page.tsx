'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logoutSite } from './actions/auth';

// Icons
import { 
  LogOut, 
  X,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';

// Components
import SummaryCards from '@/components/SummaryCards';
import ExpenseForm from '@/components/ExpenseForm';
import ExpenseTable from '@/components/ExpenseTable';

interface Expense {
  id: string;
  title: string;
  amount: number;
  paidBy: string;
  date: Date | string;
  notes: string | null;
  createdBy?: string;
  updatedBy?: string | null;
  billImageUrl?: string | null;
  paymentSource?: string;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sponsorBudget, setSponsorBudget] = useState(0);
  const [sponsorName, setSponsorName] = useState('Sponsor');
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState('User');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const router = useRouter();
  const [isLoggingOut, startLogoutTransition] = useTransition();

  // Helper to read cookie on client
  const getUsernameFromCookie = () => {
    if (typeof window === 'undefined') return 'User';
    const match = document.cookie.match(/(?:^|; )site_auth=([^;]*)/);
    if (!match) return 'User';
    const cookieVal = decodeURIComponent(match[1]).toLowerCase();
    if (cookieVal === 'treasurer@numa' || cookieVal === 'numa') return 'Numa';
    if (cookieVal === 'treasurer@ziyana' || cookieVal === 'ziyana') return 'Ziyana';
    return cookieVal;
  };

  // Logout handler
  const handleLogout = () => {
    startLogoutTransition(async () => {
      await logoutSite();
      window.location.href = '/login';
    });
  };

  // Load expenses & detect page reloads
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const navs = window.performance.getEntriesByType('navigation');
      if (navs.length > 0 && (navs[0] as PerformanceNavigationTiming).type === 'reload') {
        // If the page was refreshed/reloaded, instantly logout the user
        handleLogout();
        return;
      }
    }

    fetchExpenses();
    fetchSettings();
    setUsername(getUsernameFromCookie());
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.sponsor_budget !== undefined) {
          setSponsorBudget(parseFloat(data.sponsor_budget) || 0);
        }
        if (data.sponsor_name !== undefined) {
          setSponsorName(data.sponsor_name || 'Sponsor');
        }
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  };

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/expenses');
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      } else {
        showToast('Failed to fetch expenses from database', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to expense API', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Toast helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Log new expense submit handler
  const handleFormSubmit = async (expenseData: any) => {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(expenseData),
    });

    if (res.ok) {
      const savedExpense = await res.json();
      setExpenses((prev) => [savedExpense, ...prev]);
      showToast('Expense logged successfully!', 'success');
    } else {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to create expense');
    }
  };

  // Redirect standard users to /admin if they try to edit or delete
  const handleEditRedirect = () => {
    showToast('Admin key required. Redirecting to Admin Panel...', 'info');
    setTimeout(() => {
      router.push('/admin');
    }, 1200);
  };

  const handleDeleteRedirect = () => {
    showToast('Admin key required. Redirecting to Admin Panel...', 'info');
    setTimeout(() => {
      router.push('/admin');
    }, 1200);
  };

  return (
    <div className="relative min-h-screen bg-black text-zinc-100 flex flex-col font-sans">
      {/* Background Orange/Amber Glows */}
      <div className="absolute top-0 left-1/4 w-[40rem] h-[40rem] rounded-full bg-orange-950/15 blur-[140px] pointer-events-none" />
      <div className="absolute top-[20%] right-1/4 w-[35rem] h-[35rem] rounded-full bg-amber-955/5 blur-[120px] pointer-events-none" />

      {/* Main Header / Navigation */}
      <header className="border-b border-zinc-900 bg-black/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.jpg" 
              alt="Sphere Hive Logo" 
              className="w-10 h-10 object-contain invert rounded-lg"
            />
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white">
                Sphere Hive Expense Tracker
              </h1>
              <p className="text-xs text-zinc-500 font-medium">
                Welcome back, <strong className="text-orange-400 capitalize">{username}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Logout */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-sm font-semibold border border-zinc-800 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoggingOut ? (
                <div className="w-4 h-4 border-2 border-zinc-400 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  Logout
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Form Panel (displayed below ledger on mobile) */}
          <div id="form-container" className="order-2 lg:order-1 lg:col-span-4 scroll-mt-24">
            <ExpenseForm 
              onSubmit={handleFormSubmit}
            />
          </div>

          {/* Right Column: Summaries + Ledger Table (displayed first on mobile) */}
          <div className="order-1 lg:order-2 lg:col-span-8 space-y-8">
            <section>
              <SummaryCards expenses={expenses} sponsorBudget={sponsorBudget} sponsorName={sponsorName} />
            </section>

            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-left">
                  <h3 className="text-lg font-bold text-white">Transactions Control</h3>
                  <p className="text-xs text-zinc-400">
                    Browse the shared expense ledger. Admin permissions are required to edit or delete transactions.
                  </p>
                </div>
                <button
                  onClick={() => {
                    fetchExpenses();
                    fetchSettings();
                  }}
                  className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white rounded-xl border border-zinc-800 transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M21 3v5h-5" />
                  </svg>
                  Refresh Ledger
                </button>
              </div>

              <ExpenseTable 
                expenses={expenses}
                onEdit={handleEditRedirect}
                onDelete={handleDeleteRedirect}
                isLoading={isLoading}
                isAdminMode={false}
              />
            </section>
          </div>
        </div>
      </main>

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isInfo = toast.type === 'info';
          return (
            <div
              key={toast.id}
              className={`p-4 rounded-xl border flex items-start gap-3 shadow-lg pointer-events-auto animate-in slide-in-from-bottom-5 duration-350 ${
                isError 
                  ? 'bg-rose-950/80 border-rose-500/30 text-rose-200' 
                  : isInfo 
                  ? 'bg-zinc-900/80 border-zinc-800 text-zinc-200' 
                  : 'bg-orange-950/80 border-orange-500/30 text-orange-200'
              }`}
            >
              {!isError && !isInfo && <CheckCircle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />}
              {isError && <AlertTriangle className="w-5 h-5 text-rose-450 shrink-0 mt-0.5" />}
              {isInfo && <HelpCircle className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />}
              <div className="flex-1 text-sm font-medium pr-4">{toast.message}</div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
