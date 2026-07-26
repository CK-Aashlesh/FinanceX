'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  ChevronRight, 
  LogOut, 
  ListOrdered, 
  Terminal, 
  Plus, 
  Trash2,
  AlertCircle
} from 'lucide-react';
import { loginAdmin, logoutAdmin, logoutSite } from '../actions/auth';
import ExpenseForm from '@/components/ExpenseForm';
import ExpenseTable from '@/components/ExpenseTable';

interface Expense {
  id: string;
  title: string;
  amount: number;
  category?: string;
  paidBy: string;
  date: Date | string;
  notes: string | null;
  createdBy?: string;
  updatedBy?: string | null;
  billImageUrl?: string | null;
  paymentSource?: string;
}

interface ActivityLog {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  username: string;
  details: string;
  timestamp: string;
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminKey, setAdminKey] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Dashboard Data States
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Settings Budget States
  const [sponsorBudget, setSponsorBudget] = useState(0);
  const [sponsorBudgetInput, setSponsorBudgetInput] = useState('');
  const [sponsorName, setSponsorName] = useState('Sponsor');
  const [sponsorNameInput, setSponsorNameInput] = useState('');
  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<'ledger' | 'logs'>('ledger');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isDeletingPending, setIsDeletingPending] = useState(false);

  const getStoredAdminKey = () => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('adminKey') || '';
    }
    return '';
  };

  const handleAdminLogout = async () => {
    try {
      await logoutAdmin();
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('adminKey');
      }
      setIsAdmin(false);
      setExpenses([]);
      setLogs([]);
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  // Check admin status on load & detect page reloads
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const navs = window.performance.getEntriesByType('navigation');
      if (navs.length > 0 && (navs[0] as PerformanceNavigationTiming).type === 'reload') {
        // If reloaded, clear admin credentials and site access
        handleAdminLogout();
        logoutSite().then(() => {
          window.location.href = '/login';
        });
        return;
      }
    }

    const hasAdminCookie = document.cookie.split('; ').some(row => row.startsWith('admin_auth='));
    const hasAdminKey = typeof window !== 'undefined' && !!sessionStorage.getItem('adminKey');
    setIsAdmin(hasAdminCookie && hasAdminKey);
  }, []);

  // Fetch admin console data
  const fetchConsoleData = async () => {
    setIsLoadingData(true);
    setDataError(null);
    try {
      // Fetch expenses
      const expRes = await fetch('/api/expenses');
      if (!expRes.ok) throw new Error('Failed to load expenses');
      const expData = await expRes.json();
      setExpenses(expData);

      // Fetch logs - guarded by x-admin-key header
      const logRes = await fetch('/api/logs', {
        headers: {
          'x-admin-key': getStoredAdminKey()
        }
      });
      if (!logRes.ok) throw new Error('Failed to load activity logs');
      const logData = await logRes.json();
      setLogs(logData);

      // Fetch settings budget & name
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.sponsor_budget !== undefined) {
          setSponsorBudget(parseFloat(settingsData.sponsor_budget) || 0);
          setSponsorBudgetInput(settingsData.sponsor_budget);
        }
        if (settingsData.sponsor_name !== undefined) {
          setSponsorName(settingsData.sponsor_name || 'Sponsor');
          setSponsorNameInput(settingsData.sponsor_name);
        }
      }
    } catch (err: any) {
      setDataError(err.message || 'Error syncing admin data');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAdmin === true) {
      fetchConsoleData();
    }
  }, [isAdmin]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsPending(true);

    try {
      const res = await loginAdmin(adminKey);
      if (res.success) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('adminKey', adminKey);
        }
        setIsAdmin(true);
        setAdminKey('');
      } else {
        setLoginError(res.error || 'Invalid Admin Key');
      }
    } catch (err) {
      setLoginError('Authentication failed');
    } finally {
      setIsPending(false);
    }
  };

  // Update budget and name settings
  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingBudget(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': getStoredAdminKey(),
        },
        body: JSON.stringify({ 
          sponsor_budget: sponsorBudgetInput,
          sponsor_name: sponsorNameInput,
          increment: false
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update settings');
      }

      alert('Sponsor settings updated successfully!');
      await fetchConsoleData();
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setIsUpdatingBudget(false);
    }
  };

  // Form Submit
  const handleFormSubmit = async (expenseData: any) => {
    try {
      const isEditing = !!expenseData.id;
      const url = isEditing ? `/api/expenses/${expenseData.id}` : '/api/expenses';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': getStoredAdminKey(), // Required for updates
        },
        body: JSON.stringify(expenseData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save expense');
      }

      // Close modal & reload data
      setIsFormOpen(false);
      setEditingExpense(null);
      await fetchConsoleData();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
      throw err;
    }
  };

  // Delete Action (removes from db completely)
  const handleDeleteConfirm = async () => {
    if (!deletingExpense) return;
    setIsDeletingPending(true);

    try {
      const res = await fetch(`/api/expenses/${deletingExpense.id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-key': getStoredAdminKey(),
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete expense');
      }

      setDeletingExpense(null);
      await fetchConsoleData();
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    } finally {
      setIsDeletingPending(false);
    }
  };

  const handleEditClick = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (expense: Expense) => {
    setDeletingExpense(expense);
  };

  const formatLogDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  // --- 1. RENDER LOGIN SCREEN ---
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Dynamic Background Accents */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-950/15 rounded-full blur-[120px]" />

        <div className="w-full max-w-md relative z-10">
          <div className="backdrop-blur-xl bg-zinc-900/60 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-4">
                <Lock className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Admin Authentication</h1>
              <p className="text-xs text-zinc-400 mt-2">
                Enter your administrative key to unlock ledger audit tools.
              </p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Admin Key / Secret
                </label>
                <input
                  type="password"
                  required
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-750 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-center tracking-widest text-lg"
                />
              </div>

              {loginError && (
                <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-4 py-3 rounded-xl">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:scale-100 cursor-pointer"
              >
                {isPending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Unlock Console
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. RENDER ADMIN DASHBOARD ---
  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[350px] bg-gradient-to-b from-orange-500/5 via-amber-500/2 to-transparent rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-zinc-900 bg-black/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.jpg" 
              alt="Sphere Hive Logo" 
              className="w-10 h-10 object-contain invert rounded-lg"
            />
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5 text-left">
                Sphere Hive Admin Console
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-orange-500/15 border border-orange-500/20 text-orange-400 tracking-wider">
                  Verified
                </span>
              </h1>
              <p className="text-[10px] text-zinc-400 text-left">
                Welcome back, <strong className="text-orange-400">Arshad</strong> • Audit ledger transactions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAdminLogout}
              className="inline-flex items-center gap-1.5 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500 hover:text-white px-3 py-1.5 text-xs font-semibold text-rose-455 rounded-lg transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Lock Console
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-6">
        
        {/* Tab Controls and Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-zinc-900/20 border border-zinc-800 p-2 rounded-2xl">
          <div className="flex gap-1.5">
            <button
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ledger'
                  ? 'bg-zinc-800 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ListOrdered className="w-4 h-4" />
              Audit Ledger ({expenses.length})
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-zinc-800 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Terminal className="w-4 h-4" />
              Developer Activity Logs ({logs.length})
            </button>
          </div>

          {activeTab === 'ledger' && (
            <div className="flex gap-2">
              <button
                onClick={fetchConsoleData}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold rounded-xl border border-zinc-800 transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M21 3v5h-5" />
                </svg>
                Refresh
              </button>
              <button
                onClick={() => {
                  setEditingExpense(null);
                  setIsFormOpen(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/10 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Log Expense
              </button>
            </div>
          )}
        </div>

        {/* Sync Status / Error */}
        {dataError && (
          <div className="flex items-center gap-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-4 py-3 rounded-xl">
            <AlertCircle className="w-4.5 h-4.5 shrink-0" />
            <p className="font-semibold">{dataError}</p>
            <button 
              onClick={fetchConsoleData} 
              className="ml-auto underline hover:text-white transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Tab View Render */}
        {isLoadingData ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : activeTab === 'ledger' ? (
          <div className="space-y-6">
            {/* Sponsor Settings Card */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="text-left">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  Sponsor Budget Settings ({sponsorName})
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Configure funding pool details. Active Sponsor balance: <strong className="text-zinc-200">₹{sponsorBudget.toFixed(2)}</strong>.
                </p>
              </div>
              
              <form onSubmit={handleUpdateBudget} className="flex flex-col sm:flex-row gap-3 max-w-xl w-full">
                {/* Title / Name of the Money came from */}
                <div className="relative flex-1">
                  <input
                    type="text"
                    required
                    value={sponsorNameInput}
                    onChange={(e) => setSponsorNameInput(e.target.value)}
                    placeholder="Sponsor Name / Source"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-xl text-white placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm transition-all font-semibold"
                  />
                </div>

                {/* Amount / Budget */}
                <div className="relative sm:w-40">
                  <span className="absolute left-3 top-2.5 text-zinc-550 text-xs font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={sponsorBudgetInput}
                    onChange={(e) => setSponsorBudgetInput(e.target.value)}
                    placeholder="Budget"
                    className="w-full pl-6 pr-3 py-2 bg-zinc-950 border border-zinc-850 rounded-xl text-white font-bold placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingBudget}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-white text-xs font-bold rounded-xl border border-zinc-700 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {isUpdatingBudget ? 'Updating...' : 'Save Settings'}
                </button>
              </form>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
              <ExpenseTable 
                expenses={expenses} 
                isAdminMode={true} 
                onEdit={handleEditClick} 
                onDelete={handleDeleteClick} 
                isLoading={isLoadingData}
              />
            </div>
          </div>
        ) : (
          /* Logs View */
          <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Database Action Log</h3>
                <p className="text-[10px] text-zinc-400 text-left">Chronological history of SQL updates</p>
              </div>
              <button
                onClick={fetchConsoleData}
                className="text-[10px] text-zinc-400 hover:text-white bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                Refresh Log
              </button>
            </div>

            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-500 space-y-2">
                <Terminal className="w-8 h-8 text-zinc-700" />
                <p className="text-xs">No activity logs recorded yet.</p>
              </div>
            ) : (
              <div className="relative pl-6 border-l border-zinc-850 space-y-6">
                {logs.map((log) => {
                  let badgeColor = 'bg-zinc-850 border-zinc-750 text-zinc-400';
                  if (log.action === 'CREATE') badgeColor = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                  if (log.action === 'UPDATE') badgeColor = 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400';
                  if (log.action === 'DELETE') badgeColor = 'bg-rose-500/10 border-rose-500/20 text-rose-455';

                  return (
                    <div key={log.id} className="relative group text-left">
                      {/* Timeline dot */}
                      <span className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-zinc-800 border border-zinc-950 group-hover:bg-orange-400 transition-colors" />

                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-semibold border ${badgeColor}`}>
                          {log.action}
                        </span>
                        <span className="text-[10px] font-bold text-zinc-350">
                          {log.username}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500 ml-auto">
                          {formatLogDate(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 font-mono bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900 leading-relaxed">
                        {log.details}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- FORM MODAL (Add/Edit) --- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl">
            <button
              onClick={() => {
                setIsFormOpen(false);
                setEditingExpense(null);
              }}
              className="absolute top-4 right-4 z-10 p-2 text-zinc-400 hover:text-white bg-zinc-950/50 hover:bg-zinc-950 rounded-full border border-zinc-800/80 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5 rotate-90" />
            </button>
            <ExpenseForm 
              initialExpense={editingExpense} 
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingExpense(null);
              }}
            />
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deletingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl text-left">
            <div className="flex items-center gap-3 text-rose-455 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Delete Transaction?</h3>
                <p className="text-[10px] text-zinc-400">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 mb-6 space-y-1">
              <p className="text-xs font-semibold text-zinc-200 truncate">
                {deletingExpense.title}
              </p>
              <div className="flex justify-between text-[10px] text-zinc-550">
                <span className="font-bold text-zinc-300">₹{deletingExpense.amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingExpense(null)}
                disabled={isDeletingPending}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Keep Expense
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeletingPending}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingPending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
