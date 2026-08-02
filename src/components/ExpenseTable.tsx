'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Calendar, 
  ArrowUpDown, 
  Edit2, 
  Trash2, 
  Inbox,
  ArrowUp,
  ArrowDown,
  FileImage,
  Eye,
  X,
  FileText,
  Filter,
  RotateCcw
} from 'lucide-react';

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

interface ExpenseTableProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  isLoading: boolean;
  isAdminMode?: boolean;
}

type SortField = 'date' | 'amount';
type SortOrder = 'asc' | 'desc';

export default function ExpenseTable({ expenses, onEdit, onDelete, isLoading, isAdminMode = false }: ExpenseTableProps) {
  // Search & Basic Date Filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Admin Advanced Filters
  const [selectedSponsor, setSelectedSponsor] = useState('All');
  const [selectedPaidBy, setSelectedPaidBy] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [receiptFilter, setReceiptFilter] = useState('All'); // 'All' | 'Yes' | 'No'
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Detail Drawer Modal state
  const [activeDrawerExpense, setActiveDrawerExpense] = useState<Expense | null>(null);

  // Sort States
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Derive unique values for dropdowns
  const uniqueSponsors = useMemo(() => {
    const list = new Set<string>();
    expenses.forEach(e => {
      if (e.paymentSource && e.paymentSource !== 'Other') {
        list.add(e.paymentSource);
      }
    });
    return Array.from(list);
  }, [expenses]);

  const uniquePaidBy = useMemo(() => {
    const list = new Set<string>();
    expenses.forEach(e => {
      if (e.paidBy) list.add(e.paidBy.trim());
    });
    return Array.from(list);
  }, [expenses]);

  const uniqueCategories = useMemo(() => {
    const list = new Set<string>();
    expenses.forEach(e => {
      if (e.category) list.add(e.category.trim());
    });
    return Array.from(list);
  }, [expenses]);

  // Filtered and Sorted Expenses
  const processedExpenses = useMemo(() => {
    return expenses
      .filter((expense) => {
        // Search text filter
        const matchesSearch = 
          expense.title.toLowerCase().includes(search.toLowerCase()) ||
          expense.paidBy.toLowerCase().includes(search.toLowerCase()) ||
          (expense.paymentSource || '').toLowerCase().includes(search.toLowerCase()) ||
          (expense.notes || '').toLowerCase().includes(search.toLowerCase());
        
        // Date range filter
        const expenseDate = new Date(expense.date);
        expenseDate.setHours(0, 0, 0, 0);

        let matchesStartDate = true;
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          matchesStartDate = expenseDate >= start;
        }

        let matchesEndDate = true;
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          matchesEndDate = expenseDate <= end;
        }

        // Sponsor filter
        let matchesSponsor = true;
        if (isAdminMode && selectedSponsor !== 'All') {
          matchesSponsor = expense.paymentSource === selectedSponsor;
        }

        // Paid By filter
        let matchesPaidBy = true;
        if (isAdminMode && selectedPaidBy !== 'All') {
          matchesPaidBy = expense.paidBy === selectedPaidBy;
        }

        // Category filter
        let matchesCategory = true;
        if (isAdminMode && selectedCategory !== 'All') {
          matchesCategory = expense.category === selectedCategory;
        }

        // Receipt uploaded filter
        let matchesReceipt = true;
        if (isAdminMode && receiptFilter !== 'All') {
          const hasReceipt = !!expense.billImageUrl;
          matchesReceipt = receiptFilter === 'Yes' ? hasReceipt : !hasReceipt;
        }

        // Amount filters
        let matchesMinAmount = true;
        if (isAdminMode && minAmount) {
          matchesMinAmount = expense.amount >= parseFloat(minAmount);
        }

        let matchesMaxAmount = true;
        if (isAdminMode && maxAmount) {
          matchesMaxAmount = expense.amount <= parseFloat(maxAmount);
        }

        return (
          matchesSearch && 
          matchesStartDate && 
          matchesEndDate && 
          matchesSponsor && 
          matchesPaidBy && 
          matchesCategory && 
          matchesReceipt && 
          matchesMinAmount && 
          matchesMaxAmount
        );
      })
      .sort((a, b) => {
        let valA: any;
        let valB: any;

        if (sortField === 'date') {
          valA = new Date(a.date).getTime();
          valB = new Date(b.date).getTime();
        } else {
          valA = a.amount;
          valB = b.amount;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [
    expenses, 
    search, 
    startDate, 
    endDate, 
    selectedSponsor, 
    selectedPaidBy, 
    selectedCategory, 
    receiptFilter, 
    minAmount, 
    maxAmount, 
    sortField, 
    sortOrder, 
    isAdminMode
  ]);

  const formatDate = (dateInput: Date | string) => {
    const d = new Date(dateInput);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    });
  };

  const handleClearFilters = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
    setSelectedSponsor('All');
    setSelectedPaidBy('All');
    setSelectedCategory('All');
    setReceiptFilter('All');
    setMinAmount('');
    setMaxAmount('');
  };

  const isAnyFilterActive = search || startDate || endDate || selectedSponsor !== 'All' || selectedPaidBy !== 'All' || selectedCategory !== 'All' || receiptFilter !== 'All' || minAmount || maxAmount;

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="bg-card-bg border border-border-subtle rounded-[20px] p-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by keyword, description..."
              className="w-full pl-10 pr-4 py-2 bg-background border border-border-subtle rounded-[14px] text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary-accent focus:border-transparent text-xs transition-all"
            />
          </div>

          {/* Date Picker Start */}
          <div className="relative sm:w-44">
            <Calendar className="absolute left-3.5 top-3 w-3.5 h-3.5 text-text-secondary pointer-events-none" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-background border border-border-subtle rounded-[14px] text-white focus:outline-none focus:ring-1 focus:ring-primary-accent focus:border-transparent text-xs transition-all"
            />
          </div>

          {/* Date Picker End */}
          <div className="relative sm:w-44">
            <Calendar className="absolute left-3.5 top-3 w-3.5 h-3.5 text-text-secondary pointer-events-none" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-background border border-border-subtle rounded-[14px] text-white focus:outline-none focus:ring-1 focus:ring-primary-accent focus:border-transparent text-xs transition-all"
            />
          </div>

          {isAdminMode && (
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 border rounded-[12px] text-xs font-semibold transition-all cursor-pointer ${
                showAdvanced 
                  ? 'bg-primary-accent/10 border-primary-accent text-primary-accent' 
                  : 'bg-background border-border-subtle text-text-secondary hover:text-white hover:border-zinc-700'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
            </button>
          )}

          {isAnyFilterActive && (
            <button
              onClick={handleClearFilters}
              title="Reset Filters"
              className="px-3 py-2 bg-zinc-800/40 border border-border-subtle hover:bg-zinc-800 text-text-secondary hover:text-white rounded-[12px] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Admin Advanced Filters */}
        {isAdminMode && showAdvanced && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-border-subtle/50 animate-in slide-in-from-top-1 duration-200">
            {/* Sponsor Selection */}
            <div className="flex flex-col gap-1 text-left">
              <label className="text-[9px] font-bold text-text-secondary uppercase">Sponsor</label>
              <select
                value={selectedSponsor}
                onChange={(e) => setSelectedSponsor(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-background border border-border-subtle rounded-[14px] text-white focus:outline-none focus:ring-1 focus:ring-primary-accent text-xs"
              >
                <option value="All">All Sponsors</option>
                {uniqueSponsors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Paid By Selection */}
            <div className="flex flex-col gap-1 text-left">
              <label className="text-[9px] font-bold text-text-secondary uppercase">Paid By</label>
              <select
                value={selectedPaidBy}
                onChange={(e) => setSelectedPaidBy(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-background border border-border-subtle rounded-[14px] text-white focus:outline-none focus:ring-1 focus:ring-primary-accent text-xs"
              >
                <option value="All">All Members</option>
                {uniquePaidBy.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Category Selection */}
            <div className="flex flex-col gap-1 text-left">
              <label className="text-[9px] font-bold text-text-secondary uppercase">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-background border border-border-subtle rounded-[14px] text-white focus:outline-none focus:ring-1 focus:ring-primary-accent text-xs"
              >
                <option value="All">All Categories</option>
                {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Receipt Filter */}
            <div className="flex flex-col gap-1 text-left">
              <label className="text-[9px] font-bold text-text-secondary uppercase">Receipt</label>
              <select
                value={receiptFilter}
                onChange={(e) => setReceiptFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-background border border-border-subtle rounded-[14px] text-white focus:outline-none focus:ring-1 focus:ring-primary-accent text-xs"
              >
                <option value="All">All Records</option>
                <option value="Yes">With Receipt</option>
                <option value="No">No Receipt</option>
              </select>
            </div>

            {/* Amount Range */}
            <div className="flex flex-col gap-1 text-left">
              <label className="text-[9px] font-bold text-text-secondary uppercase">Amount Range (₹)</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  placeholder="Min"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="w-1/2 px-2.5 py-1 bg-background border border-border-subtle rounded-[14px] text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary-accent text-xs text-center"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="w-1/2 px-2.5 py-1 bg-background border border-border-subtle rounded-[14px] text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary-accent text-xs text-center"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="bg-card-bg border border-border-subtle rounded-[20px] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-8 h-8 border-2 border-primary-accent/20 border-t-primary-accent rounded-full animate-spin" />
            <p className="text-xs text-text-secondary font-medium">Syncing ledger records...</p>
          </div>
        ) : processedExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="p-3 bg-background border border-border-subtle text-text-secondary rounded-full mb-3">
              <Inbox className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white mb-0.5">No expenses logged</h4>
            <p className="text-xs text-text-secondary max-w-sm mb-4">
              {expenses.length === 0 
                ? "Ledger is empty. Use the form to submit your first expense." 
                : "No items match your active filters."}
            </p>
            {isAnyFilterActive && (
              <button
                onClick={handleClearFilters}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700/80 border border-border-subtle text-white rounded-[12px] text-xs font-semibold transition-all cursor-pointer"
              >
                Reset Filter Queries
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle bg-background-secondary text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    <th 
                      onClick={() => handleSort('date')} 
                      className="py-3 px-4 cursor-pointer hover:text-white transition-colors select-none"
                    >
                      <div className="flex items-center gap-1">
                        Date
                        {sortField === 'date' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-primary-accent" /> : <ArrowDown className="w-3 h-3 text-primary-accent" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-4">Description</th>
                    {isAdminMode && <th className="py-3 px-4">Category</th>}
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Sponsor</th>
                    <th className="py-3 px-4">Paid By</th>
                    <th className="py-3 px-4">Logged By</th>
                    <th className="py-3 px-4">Receipt</th>
                    <th 
                      onClick={() => handleSort('amount')} 
                      className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors select-none"
                    >
                      <div className="flex items-center justify-end gap-1">
                        Amount
                        {sortField === 'amount' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-primary-accent" /> : <ArrowDown className="w-3 h-3 text-primary-accent" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </div>
                    </th>
                    {isAdminMode && <th className="py-3 px-4">Status</th>}
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/40">
                  {processedExpenses.map((expense) => {
                    const isSponsor = expense.paymentSource && expense.paymentSource !== 'Other';
                    const hasReceipt = !!expense.billImageUrl;

                    return (
                      <tr 
                        key={expense.id} 
                        className="group hover:bg-card-hover/60 transition-all duration-150"
                      >
                        <td className="py-2.5 px-4 text-xs text-text-secondary font-mono whitespace-nowrap">
                          {formatDate(expense.date)}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-white max-w-xs truncate">
                          {expense.title}
                        </td>
                        {isAdminMode && (
                          <td className="py-2.5 px-4 text-xs text-text-secondary">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-zinc-800/80 border border-zinc-700/50 text-zinc-300">
                              {expense.category || 'General'}
                            </span>
                          </td>
                        )}
                        <td className="py-2.5 px-4 text-xs whitespace-nowrap">
                          {isSponsor ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/10 text-primary-accent text-[9px] font-bold border border-primary-accent/10">
                              Sponsor
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[9px] font-bold border border-border-subtle/50">
                              Other
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-zinc-300 font-semibold whitespace-nowrap">
                          {isSponsor ? expense.paymentSource : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-zinc-350 whitespace-nowrap">
                          {expense.paidBy}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-text-secondary whitespace-nowrap">
                          <div className="font-semibold text-zinc-300">{expense.createdBy || 'seed'}</div>
                        </td>
                        <td className="py-2.5 px-4 text-xs whitespace-nowrap">
                          {hasReceipt ? (
                            <a
                              href={expense.billImageUrl!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-750 text-text-secondary hover:text-white border border-border-subtle transition-colors"
                            >
                              <FileImage className="w-3.5 h-3.5 text-info-blue" />
                              <span className="text-[10px] font-bold">Receipt</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-text-secondary font-mono">None</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-xs font-bold text-white text-right whitespace-nowrap">
                          ₹{expense.amount.toFixed(2)}
                        </td>
                        {isAdminMode && (
                          <td className="py-2.5 px-4 text-xs whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-success-green/10 text-success-green text-[9px] font-bold border border-success-green/10">
                              Active
                            </span>
                          </td>
                        )}
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setActiveDrawerExpense(expense)}
                              title="View Transaction Details"
                              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-[8px] transition-colors cursor-pointer border border-border-subtle/50"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {isAdminMode && (
                              <>
                                <button
                                  onClick={() => onEdit(expense)}
                                  title="Edit Expense"
                                  className="p-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-350 hover:text-white rounded-[8px] transition-colors cursor-pointer border border-border-subtle/50"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onDelete(expense)}
                                  title="Delete Expense"
                                  className="p-1.5 bg-danger-red/10 hover:bg-danger-red text-danger-red hover:text-white rounded-[8px] border border-danger-red/20 transition-all cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-border-subtle/40">
              {processedExpenses.map((expense) => {
                const isSponsor = expense.paymentSource && expense.paymentSource !== 'Other';
                const hasReceipt = !!expense.billImageUrl;

                return (
                  <div key={expense.id} className="p-4 space-y-3 hover:bg-card-hover/20 transition-colors text-left">
                    {/* Header */}
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono text-text-secondary bg-background border border-border-subtle px-1.5 py-0.5 rounded">
                            {formatDate(expense.date)}
                          </span>
                          {isSponsor ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-500/10 text-primary-accent text-[9px] font-bold border border-primary-accent/15">
                              Sponsor: {expense.paymentSource}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-850 text-zinc-500 text-[9px] font-bold border border-border-subtle">
                              Other
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-white leading-tight">{expense.title}</h4>
                      </div>
                      <span className="text-sm font-extrabold text-white">
                        ₹{expense.amount.toFixed(2)}
                      </span>
                    </div>

                    {/* Metadata summary */}
                    <div className="flex items-center justify-between text-[11px] text-text-secondary">
                      <span>Paid: <strong className="text-zinc-300">{expense.paidBy}</strong></span>
                      {hasReceipt && (
                        <a
                          href={expense.billImageUrl!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-info-blue hover:underline"
                        >
                          <FileImage className="w-3 h-3" />
                          View Receipt
                        </a>
                      )}
                    </div>

                    {/* Mobile Action Buttons */}
                    <div className="flex justify-end gap-1.5 pt-2 border-t border-border-subtle/30">
                      <button
                        onClick={() => setActiveDrawerExpense(expense)}
                        className="inline-flex items-center justify-center p-1.5 bg-zinc-800 text-zinc-300 rounded-[8px] text-[10px] font-semibold cursor-pointer border border-border-subtle/50"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {isAdminMode && (
                        <>
                          <button
                            onClick={() => onEdit(expense)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded-[8px] text-[10px] font-semibold cursor-pointer border border-border-subtle/50"
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </button>
                          <button
                            onClick={() => onDelete(expense)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-danger-red/10 text-danger-red rounded-[8px] text-[10px] font-semibold cursor-pointer border border-danger-red/20"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* --- TRANSACTION EXPENSE DRAWER MODAL --- */}
      {activeDrawerExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-card-bg border border-border-subtle rounded-[20px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-left">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-subtle p-5">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-accent" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Transaction Drawer</h3>
              </div>
              <button
                onClick={() => setActiveDrawerExpense(null)}
                className="p-1 text-text-secondary hover:text-white bg-zinc-900 border border-border-subtle rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-text-secondary uppercase">Description / Title</span>
                <h2 className="text-xl font-extrabold text-white tracking-tight">{activeDrawerExpense.title}</h2>
              </div>

              {/* Grid Metadata */}
              <div className="grid grid-cols-2 gap-4 border-t border-b border-border-subtle/50 py-4 font-sans">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-text-secondary uppercase">Amount</span>
                  <p className="text-lg font-black text-white">₹{activeDrawerExpense.amount.toFixed(2)}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-text-secondary uppercase">Transaction Date</span>
                  <p className="text-sm text-zinc-300 font-semibold">{formatDate(activeDrawerExpense.date)}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-text-secondary uppercase">Source (Sponsor)</span>
                  <p className="text-sm font-semibold text-primary-accent">
                    {activeDrawerExpense.paymentSource && activeDrawerExpense.paymentSource !== 'Other' 
                      ? activeDrawerExpense.paymentSource 
                      : 'Personal / Other'}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-text-secondary uppercase">Paid By</span>
                  <p className="text-sm text-zinc-300 font-semibold">{activeDrawerExpense.paidBy}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-text-secondary uppercase">Logged By</span>
                  <p className="text-sm text-zinc-300 font-semibold">{activeDrawerExpense.createdBy || 'System'}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-text-secondary uppercase">Category</span>
                  <p className="text-sm text-zinc-300 font-semibold">{activeDrawerExpense.category || 'General'}</p>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1 text-left">
                <span className="text-[9px] font-bold text-text-secondary uppercase">Notes / Explanations</span>
                <p className="text-xs text-zinc-400 bg-background/50 border border-border-subtle p-3 rounded-[14px] leading-relaxed">
                  {activeDrawerExpense.notes || 'No extra notes provided.'}
                </p>
              </div>

              {/* Receipt Preview */}
              {activeDrawerExpense.billImageUrl && (
                <div className="space-y-2 text-left">
                  <span className="text-[9px] font-bold text-text-secondary uppercase block">Uploaded Receipt</span>
                  <div className="border border-border-subtle rounded-[14px] overflow-hidden bg-background max-h-56 flex items-center justify-center p-2 relative group">
                    <img
                      src={activeDrawerExpense.billImageUrl}
                      alt="Bill receipt"
                      className="max-h-52 object-contain rounded-md"
                    />
                    <a
                      href={activeDrawerExpense.billImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-2 right-2 bg-black/75 hover:bg-black text-white text-[10px] font-bold px-2 py-1 rounded border border-border-subtle shadow"
                    >
                      Open Full Image
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border-subtle bg-background-secondary p-4 flex justify-end">
              <button
                onClick={() => setActiveDrawerExpense(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700/80 text-white rounded-[12px] text-xs font-semibold cursor-pointer border border-border-subtle/50 transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
