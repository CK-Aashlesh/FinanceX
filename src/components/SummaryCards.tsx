'use client';

import React from 'react';
import { IndianRupee, ShieldAlert, BadgeCheck } from 'lucide-react';

interface Expense {
  id: string;
  title: string;
  amount: number;
  category?: string;
  paidBy: string;
  date: Date | string;
  notes: string | null;
  paymentSource?: string;
}

interface SummaryCardsProps {
  expenses: Expense[];
  sponsorBudget?: number;
  sponsorName?: string;
}

export default function SummaryCards({ expenses, sponsorBudget = 0, sponsorName = 'Sponsor' }: SummaryCardsProps) {
  const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
  const count = expenses.length;

  // Calculate sources
  const spentFromSponsor = expenses
    .filter(e => e.paymentSource === 'Sponsor')
    .reduce((sum, item) => sum + item.amount, 0);
    
  const spentFromOther = expenses
    .filter(e => e.paymentSource !== 'Sponsor')
    .reduce((sum, item) => sum + item.amount, 0);

  const remainingSponsorBudget = sponsorBudget - spentFromSponsor;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Card 1: Total Spent */}
      <div className="relative overflow-hidden backdrop-blur-xl bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-zinc-400">Total Expenses Logged</span>
          <div className="p-2.5 bg-zinc-950 text-zinc-300 rounded-2xl border border-zinc-800">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>
        <div className="space-y-1 text-left">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            ₹{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <p className="text-xs text-zinc-500 font-medium">
            Sponsor ({sponsorName}): <span className="text-amber-400 font-bold">₹{spentFromSponsor.toFixed(2)}</span> | Own: <span className="text-zinc-300 font-bold">₹{spentFromOther.toFixed(2)}</span>
          </p>
        </div>
      </div>

      {/* Card 2: Sponsor Budget (Set Aside) */}
      <div className="relative overflow-hidden backdrop-blur-xl bg-zinc-900/60 border border-orange-500/20 rounded-3xl p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-zinc-400">Sponsor Fund ({sponsorName})</span>
          <div className="p-2.5 bg-orange-500/10 text-orange-400 rounded-2xl">
            <BadgeCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="space-y-1 text-left">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            ₹{sponsorBudget.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <p className="text-xs text-zinc-500 font-medium">
            Configured by administrator
          </p>
        </div>
      </div>

      {/* Card 3: Remaining Sponsor Fund */}
      <div className="relative overflow-hidden backdrop-blur-xl bg-zinc-900/60 border border-orange-500/10 rounded-3xl p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-zinc-400">Remaining Sponsor Fund</span>
          <div className={`p-2.5 rounded-2xl ${remainingSponsorBudget < 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
            {remainingSponsorBudget < 0 ? <ShieldAlert className="w-5 h-5" /> : <IndianRupee className="w-5 h-5" />}
          </div>
        </div>
        <div className="space-y-1 text-left">
          <h2 className={`text-3xl font-extrabold tracking-tight ${remainingSponsorBudget < 0 ? 'text-rose-400' : 'text-white'}`}>
            ₹{remainingSponsorBudget.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <p className="text-xs text-zinc-500 font-medium">
            {remainingSponsorBudget < 0 ? 'Sponsor budget exceeded!' : 'Available sponsor balance'}
          </p>
        </div>
      </div>
    </div>
  );
}
