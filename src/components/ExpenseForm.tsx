'use client';

import React, { useState, useEffect } from 'react';
import { PlusCircle, Save, X, Sparkles } from 'lucide-react';

interface Expense {
  id: string;
  title: string;
  amount: number;
  category?: string;
  paidBy: string;
  date: Date | string;
  notes: string | null;
  billImageUrl?: string | null;
  paymentSource?: string;
}

interface ExpenseFormProps {
  initialExpense?: Expense | null;
  onSubmit: (expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>;
  onCancel?: () => void;
}

export default function ExpenseForm({ initialExpense, onSubmit, onCancel }: ExpenseFormProps) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [billImageUrl, setBillImageUrl] = useState<string | null>(null);
  const [paymentSource, setPaymentSource] = useState('Other');
  const [isUploading, setIsUploading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Populate form if we are editing an expense
  useEffect(() => {
    if (initialExpense) {
      setTitle(initialExpense.title);
      setAmount(initialExpense.amount.toString());
      setPaidBy(initialExpense.paidBy);
      
      // Parse Date
      const d = new Date(initialExpense.date);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);

      setNotes(initialExpense.notes || '');
      setBillImageUrl(initialExpense.billImageUrl || null);
      setPaymentSource(initialExpense.paymentSource || 'Other');
    } else {
      // Set defaults for new expense
      setTitle('');
      setAmount('');
      setPaidBy('');
      setBillImageUrl(null);
      setPaymentSource('Other');
      
      // Default date to today
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
      
      setNotes('');
    }
    setError(null);
  }, [initialExpense]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upload image');
      }

      const data = await res.json();
      setBillImageUrl(data.url);
    } catch (err: any) {
      setError(err.message || 'File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!title.trim()) {
      setError('Title/Description is required');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Amount must be a positive number');
      return;
    }

    if (!paidBy.trim()) {
      setError('Paid By name is required');
      return;
    }

    if (!date) {
      setError('Please select a date');
      return;
    }

    setIsPending(true);
    try {
      await onSubmit({
        id: initialExpense?.id,
        title: title.trim(),
        amount: numAmount,
        paidBy: paidBy.trim(),
        date: new Date(date),
        notes: notes.trim() || null,
        billImageUrl,
        paymentSource,
      });

      // Clear if not editing
      if (!initialExpense) {
        setTitle('');
        setAmount('');
        setPaidBy('');
        setNotes('');
        setBillImageUrl(null);
        setPaymentSource('Other');
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setDate(`${yyyy}-${mm}-${dd}`);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="backdrop-blur-xl bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 shadow-xl h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-white">
            {initialExpense ? 'Edit Expense' : 'Log New Expense'}
          </h3>
          {!initialExpense && (
            <Sparkles className="w-5 h-5 text-orange-400" />
          )}
        </div>
        <p className="text-xs text-zinc-400 mb-6">
          {initialExpense ? 'Modify transaction fields' : 'Add another transaction to the ledger'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              Title / Description
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Server hosting, Pizza"
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-650 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-650 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Paid By */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              Paid By
            </label>
            <input
              type="text"
              required
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-650 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Payment Source */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              From Which Amount Sent? (Payment Source)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentSource('Sponsor')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  paymentSource === 'Sponsor'
                    ? 'bg-orange-500/10 border-orange-500 text-orange-400 font-extrabold shadow-sm'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-450 hover:text-white'
                }`}
              >
                Sponsor Fund
              </button>
              <button
                type="button"
                onClick={() => setPaymentSource('Other')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  paymentSource === 'Other'
                    ? 'bg-orange-500/10 border-orange-500 text-orange-400 font-extrabold shadow-sm'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-450 hover:text-white'
                }`}
              >
                Personal / Other
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
              rows={2}
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-650 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Upload Bill Receipt */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              Bill / Receipt Image
            </label>
            
            <div className="flex flex-col gap-3">
              {billImageUrl ? (
                <div className="relative rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 flex items-center justify-between group/img">
                  <div className="flex items-center gap-2.5 truncate">
                    <img 
                      src={billImageUrl} 
                      alt="Receipt Preview" 
                      className="w-12 h-12 rounded-lg object-cover border border-zinc-800"
                    />
                    <div className="truncate text-left">
                      <p className="text-xs font-bold text-zinc-200 truncate">Receipt Uploaded</p>
                      <a 
                        href={billImageUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[10px] text-orange-400 hover:text-orange-355 font-semibold truncate hover:underline"
                      >
                        View Full Image
                      </a>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBillImageUrl(null)}
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-455 hover:text-white rounded-lg border border-rose-500/20 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 hover:border-orange-500/40 bg-zinc-955/40 hover:bg-zinc-955/60 transition-all duration-150 rounded-xl p-4 cursor-pointer text-center group">
                  <div className="flex flex-col items-center justify-center space-y-1 text-zinc-550 group-hover:text-zinc-300">
                    {isUploading ? (
                      <div className="w-5 h-5 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mb-1" />
                    ) : (
                      <PlusCircle className="w-5 h-5 text-zinc-500 group-hover:text-orange-400 transition-colors mb-1" />
                    )}
                    <span className="text-xs font-semibold">
                      {isUploading ? 'Uploading file...' : 'Upload Receipt File'}
                    </span>
                    <span className="text-[10px] text-zinc-650">
                      Supports JPG, PNG, WEBP (Max 5MB)
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              )}
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 rounded-xl">
              {error}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {initialExpense && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-xl font-semibold transition-colors duration-200 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-semibold shadow-lg shadow-orange-500/15 hover:shadow-orange-500/25 active:scale-95 disabled:scale-100 disabled:opacity-50 transition-all duration-200 cursor-pointer"
            >
              {isPending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : initialExpense ? (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  Log Expense
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
