'use client';

import React, { useState, useEffect } from 'react';
import { Save, X, Sparkles, UploadCloud, AlertCircle, Camera } from 'lucide-react';

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
  isAdminMode?: boolean;
}

// Helper function to compress images using Canvas API before uploading
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // Construct a new file name, converting extension to jpg
                const originalName = file.name.replace(/\.[^/.]+$/, "");
                const newFile = new File([blob], `${originalName}_compressed.jpg`, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(newFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.7
          );
        } else {
          resolve(file);
        }
      };
    };
    reader.onerror = () => resolve(file);
  });
};

export default function ExpenseForm({ initialExpense, onSubmit, onCancel, isAdminMode = false }: ExpenseFormProps) {
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
  const [sponsorsList, setSponsorsList] = useState<{ name: string; budget: number }[]>([]);

  useEffect(() => {
    if (isAdminMode) {
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          if (data.sponsors) {
            setSponsorsList(data.sponsors);
          }
        })
        .catch(err => console.error("Error loading sponsors:", err));
    }
  }, [isAdminMode]);

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

    setIsUploading(true);
    setError(null);

    try {
      const compressedFile = await compressImage(file);

      if (compressedFile.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        setIsUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', compressedFile);

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
    <div className="bg-card-bg border border-border-subtle rounded-[20px] p-6 flex flex-col justify-between h-full font-sans text-left">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            {initialExpense ? 'Edit Expense' : 'Log New Expense'}
          </h3>
          {!initialExpense && (
            <Sparkles className="w-4.5 h-4.5 text-primary-accent" />
          )}
        </div>
        <p className="text-xs text-text-secondary mb-5">
          {initialExpense ? 'Modify transaction fields' : 'Add another transaction to the ledger'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
              Title / Description
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Server hosting, Pizza party"
              className="w-full px-4.5 py-2.5 bg-background border border-border-subtle rounded-[14px] text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary-accent focus:border-transparent transition-all text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Amount */}
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
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
                className="w-full px-4.5 py-2.5 bg-background border border-border-subtle rounded-[14px] text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary-accent focus:border-transparent transition-all text-xs font-semibold"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4.5 py-2.5 bg-background border border-border-subtle rounded-[14px] text-white focus:outline-none focus:ring-1 focus:ring-primary-accent focus:border-transparent transition-all text-xs"
              />
            </div>
          </div>

          {/* Paid By */}
          <div>
            <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
              Paid By
            </label>
            <input
              type="text"
              required
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-4.5 py-2.5 bg-background border border-border-subtle rounded-[14px] text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary-accent focus:border-transparent transition-all text-xs"
            />
          </div>

          {/* Payment Source */}
          <div>
            <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
              From Which Amount Sent? (Payment Source)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  if (isAdminMode && sponsorsList.length > 0) {
                    setPaymentSource(sponsorsList[0].name);
                  } else {
                    setPaymentSource('Sponsor');
                  }
                }}
                className={`px-4 py-2.5 rounded-[12px] text-xs font-semibold border transition-all cursor-pointer ${
                  paymentSource !== 'Other'
                    ? 'bg-primary-accent/10 border-primary-accent text-primary-accent font-bold'
                    : 'bg-background border-border-subtle text-text-secondary hover:text-white'
                }`}
              >
                Sponsor Fund
              </button>
              <button
                type="button"
                onClick={() => setPaymentSource('Other')}
                className={`px-4 py-2.5 rounded-[12px] text-xs font-semibold border transition-all cursor-pointer ${
                  paymentSource === 'Other'
                    ? 'bg-primary-accent/10 border-primary-accent text-primary-accent font-bold'
                    : 'bg-background border-border-subtle text-text-secondary hover:text-white'
                }`}
              >
                Personal / Other
              </button>
            </div>

            {/* Dropdown for specific Sponsor Selection */}
            {isAdminMode && paymentSource !== 'Other' && (
              <div className="mt-3">
                <label className="block text-[9px] font-bold text-text-secondary uppercase tracking-wider mb-1 text-left">
                  Choose Sponsor Pool
                </label>
                {sponsorsList.length === 0 ? (
                  <p className="text-[10px] text-primary-accent font-semibold text-left">
                    No active sponsor configured.
                  </p>
                ) : (
                  <select
                    value={paymentSource}
                    onChange={(e) => setPaymentSource(e.target.value)}
                    className="w-full px-4 py-2.5 bg-background border border-border-subtle rounded-[14px] text-white focus:outline-none focus:ring-1 focus:ring-primary-accent text-xs font-semibold"
                  >
                    {sponsorsList.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name} (Budget: ₹{s.budget.toFixed(2)})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide context, details, etc."
              rows={2}
              className="w-full px-4 py-2 bg-background border border-border-subtle rounded-[14px] text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary-accent focus:border-transparent transition-all resize-none text-xs"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
              Receipt / Bill Image (Optional)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 flex flex-col items-center justify-center border border-dashed border-border-subtle hover:border-zinc-600 rounded-[14px] p-4 bg-background/50 hover:bg-zinc-800/10 cursor-pointer transition-colors group text-center">
                <UploadCloud className="w-5 h-5 text-text-secondary group-hover:text-white transition-colors mb-1" />
                <span className="text-[10px] text-text-secondary font-semibold group-hover:text-white transition-colors">
                  {billImageUrl ? 'Replace File' : 'Choose File'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <label className="flex-1 flex flex-col items-center justify-center border border-dashed border-border-subtle hover:border-zinc-600 rounded-[14px] p-4 bg-background/50 hover:bg-zinc-800/10 cursor-pointer transition-colors group text-center">
                <Camera className="w-5 h-5 text-text-secondary group-hover:text-white transition-colors mb-1" />
                <span className="text-[10px] text-text-secondary font-semibold group-hover:text-white transition-colors">
                  {billImageUrl ? 'Retake Photo' : 'Take Photo'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {billImageUrl && (
                <div className="w-16 h-16 rounded-xl border border-border-subtle bg-background overflow-hidden relative group shrink-0">
                  <img
                    src={billImageUrl}
                    alt="Receipt Thumbnail"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setBillImageUrl(null)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white hover:text-danger-red transition-opacity cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            {isUploading && (
              <p className="text-[10px] text-primary-accent font-semibold mt-1">Uploading receipt file...</p>
            )}
          </div>

          {/* Form Level Error */}
          {error && (
            <div className="flex items-center gap-1.5 bg-danger-red/10 border border-danger-red/20 text-danger-red text-xs p-3 rounded-[12px] mt-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>
      </div>

      {/* Footer Submit Buttons */}
      <div className="flex gap-3 pt-5 border-t border-border-subtle/50 mt-5">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700/80 border border-border-subtle text-white rounded-[12px] text-xs font-semibold cursor-pointer transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSubmit}
          type="button"
          disabled={isPending || isUploading}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary-accent hover:bg-accent-hover text-white rounded-[12px] text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:scale-100 cursor-pointer shadow-md"
        >
          {isPending ? (
            <div className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              {initialExpense ? 'Save Changes' : 'Submit Record'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
