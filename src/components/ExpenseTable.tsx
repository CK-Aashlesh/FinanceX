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
  FileImage
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
  // Filter and Search States
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  // Filtered and Sorted Expenses
  const processedExpenses = useMemo(() => {
    return expenses
      .filter((expense) => {
        // Search filter (title / paidBy / paymentSource)
        const matchesSearch = 
          expense.title.toLowerCase().includes(search.toLowerCase()) ||
          expense.paidBy.toLowerCase().includes(search.toLowerCase()) ||
          (expense.paymentSource || '').toLowerCase().includes(search.toLowerCase());
        
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

        return matchesSearch && matchesStartDate && matchesEndDate;
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
  }, [expenses, search, startDate, endDate, sortField, sortOrder]);

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
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <div className="backdrop-blur-xl bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, source..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-650 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm transition-all"
            />
          </div>

          {/* Date Picker Start */}
          <div className="relative">
            <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm transition-all"
            />
          </div>

          {/* Date Picker End */}
          <div className="relative">
            <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm transition-all"
            />
          </div>
        </div>

        {/* Clear Filters Indicator */}
        {(search || startDate || endDate) && (
          <div className="flex justify-between items-center pt-2 border-t border-zinc-800/60 animate-in fade-in duration-200">
            <p className="text-xs text-zinc-400">
              Showing {processedExpenses.length} of {expenses.length} results
            </p>
            <button
              onClick={handleClearFilters}
              className="text-xs text-orange-400 hover:text-orange-300 font-semibold transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="backdrop-blur-xl bg-zinc-900/60 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
            <p className="text-sm text-zinc-400">Loading expense ledger...</p>
          </div>
        ) : processedExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="p-4 bg-zinc-950 text-zinc-650 rounded-full mb-4">
              <Inbox className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-white mb-1">No expenses found</h4>
            <p className="text-sm text-zinc-400 max-w-sm mb-4">
              {expenses.length === 0 
                ? "No expenses yet — add your first one to get started!" 
                : "Try adjusting your filters or search keywords."}
            </p>
            {expenses.length > 0 && (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 rounded-xl text-sm font-semibold transition-all cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/40 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    <th 
                      onClick={() => handleSort('date')} 
                      className="py-2 px-3 cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        Date
                        {sortField === 'date' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-zinc-600" />
                        )}
                      </div>
                    </th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3">Source</th>
                    <th className="py-2 px-3">Paid By</th>
                    <th className="py-2 px-3">Logged By</th>
                    <th 
                      onClick={() => handleSort('amount')} 
                      className="py-2 px-3 text-right cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        Amount
                        {sortField === 'amount' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-zinc-600" />
                        )}
                      </div>
                    </th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {processedExpenses.map((expense) => {
                    return (
                      <tr 
                        key={expense.id} 
                        className="group hover:bg-zinc-800/20 transition-all duration-150"
                      >
                        <td className="py-2 px-3 text-xs text-zinc-300 font-mono whitespace-nowrap">
                          {formatDate(expense.date)}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-white">
                              {expense.title}
                            </span>
                            {expense.billImageUrl && (
                              <a
                                href={expense.billImageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View Receipt"
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-[10px] font-semibold transition-all border border-orange-500/15"
                              >
                                <FileImage className="w-3 h-3" />
                                Receipt
                              </a>
                            )}
                          </div>
                          {expense.notes && (
                            <div className="text-xs text-zinc-500 max-w-xs truncate mt-0.5" title={expense.notes}>
                              {expense.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-xs whitespace-nowrap">
                          {expense.paymentSource === 'Sponsor' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/15">
                              Sponsor
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-bold border border-zinc-700/50">
                              Other
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-xs text-zinc-300 whitespace-nowrap">
                          {expense.paidBy}
                        </td>
                        <td className="py-2 px-3 text-xs text-zinc-300 whitespace-nowrap">
                          <div className="font-semibold text-zinc-200">{expense.createdBy || 'seed'}</div>
                          {expense.updatedBy && (
                            <div className="text-[10px] text-zinc-500 font-mono">
                              (Edited: {expense.updatedBy})
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-xs font-bold text-white text-right whitespace-nowrap">
                          ₹{expense.amount.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onEdit(expense)}
                              title="Edit Expense"
                              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-350 hover:text-white rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDelete(expense)}
                              title="Delete Expense"
                              className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg border border-rose-500/20 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-zinc-800/80">
              {processedExpenses.map((expense) => {
                return (
                  <div key={expense.id} className="p-5 space-y-4 hover:bg-zinc-800/10 transition-colors">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded">
                            {formatDate(expense.date)}
                          </span>
                          {expense.billImageUrl && (
                            <a
                              href={expense.billImageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 text-[10px] font-semibold border border-orange-500/15"
                            >
                              <FileImage className="w-3 h-3" />
                              Receipt
                            </a>
                          )}
                          {expense.paymentSource === 'Sponsor' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/15">
                              Sponsor
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-850 text-zinc-500 text-[10px] font-bold border border-zinc-800">
                              Other
                            </span>
                          )}
                        </div>
                        <h4 className="text-base font-bold text-white">{expense.title}</h4>
                      </div>
                      <span className="text-lg font-extrabold text-white">
                        ₹{expense.amount.toFixed(2)}
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">
                        Paid by: <strong className="text-zinc-300">{expense.paidBy}</strong>
                      </span>
                      <div className="text-[11px] text-zinc-500 mt-1">
                        Logged by: <span className="text-zinc-400 font-semibold">{expense.createdBy || 'seed'}</span>
                        {expense.updatedBy && (
                          <span className="text-[10px] text-zinc-650 block">
                            (Edited: {expense.updatedBy})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800/40">
                      <button
                        onClick={() => onEdit(expense)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(expense)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500 text-rose-455 hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
