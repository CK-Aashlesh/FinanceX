'use client';

import React from 'react';
import { Building2, User, Wallet, ShieldCheck, TrendingUp } from 'lucide-react';

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
}

export default function SummaryCards({ expenses }: SummaryCardsProps) {
  // Exclude Top-ups from spending calculations
  const standardExpenses = expenses.filter(e => e.category !== 'Top-up');

  // 1. Amount spent from SH general fund
  const spentFromSh = standardExpenses
    .filter(e => e.paymentSource === 'SH')
    .reduce((sum, item) => sum + item.amount, 0);

  // 2. Amount spent from Sponsors (includes general 'Sponsor' and named sponsors)
  const spentFromSponsors = standardExpenses
    .filter(e => e.paymentSource && e.paymentSource !== 'SH' && e.paymentSource !== 'Other')
    .reduce((sum, item) => sum + item.amount, 0);
    
  // 3. Amount Used from Personal / Other (Personal expenses sum)
  const spentFromOther = standardExpenses
    .filter(e => !e.paymentSource || e.paymentSource === 'Other')
    .reduce((sum, item) => sum + item.amount, 0);

  // 4. General SH Budget (Configured by admin via Add SH Fund)
  const generalShBudget = expenses
    .filter(e => e.category === 'Top-up' && e.paidBy === 'SH')
    .reduce((sum, item) => sum + item.amount, 0);

  // 5. Dedicated Sponsor Budgets (Configured by admin via Add Sponsor Fund)
  const dedicatedSponsorBudget = expenses
    .filter(e => e.category === 'Top-up' && e.paidBy !== 'SH')
    .reduce((sum, item) => sum + item.amount, 0);

  // 6. Available Sponsor Fund (Dedicated Sponsor Budgets - Spent from Sponsors)
  const availableSponsorFund = dedicatedSponsorBudget - spentFromSponsors;

  // 7. Total Expenses (Spent from SH + Spent from Sponsors + Spent from Personal/Other)
  const totalSpent = spentFromSh + spentFromSponsors + spentFromOther;

  // Format currency helper
  const formatCurrency = (val: number) => {
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Remaining Percentage for Available Sponsor Fund (Dedicated Sponsor Budget remaining)
  const remainingPercentage = dedicatedSponsorBudget > 0 
    ? (availableSponsorFund / dedicatedSponsorBudget) * 100 
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      
      {/* CARD 1: Total Amount from SH */}
      <div className="bg-card-bg border border-border-subtle rounded-[20px] p-5 flex flex-col justify-between min-h-[145px] text-left hover:bg-card-hover transition-colors duration-200">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
            From Sphere Hive
          </span>
          <div className="p-2 rounded-xl border border-border-subtle/50 bg-background/50 text-text-secondary shrink-0">
            <Building2 className="w-4.5 h-4.5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-lg font-black text-white tracking-tight leading-none">
            {formatCurrency(generalShBudget)}
          </h3>
          <p className="text-[10px] text-text-secondary font-medium mt-1.5">
            Total Fund from Sphere Hive
          </p>
        </div>
      </div>

      {/* CARD 2: Amount Used from Personal / Other */}
      <div className="bg-card-bg border border-border-subtle rounded-[20px] p-5 flex flex-col justify-between min-h-[145px] text-left hover:bg-card-hover transition-colors duration-200">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
            From Sphere Hive
          </span>
          <div className="p-2 rounded-xl border border-border-subtle/50 bg-background/50 text-text-secondary shrink-0">
            <User className="w-4.5 h-4.5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-lg font-black text-white tracking-tight leading-none">
            {formatCurrency(spentFromOther)}
          </h3>
          <p className="text-[10px] text-text-secondary font-medium mt-1.5">
            Amount Used from Sphere Hive Fund
          </p>
        </div>
      </div>

      {/* CARD 3: Total Sponsor Fund */}
      <div className="bg-card-bg border border-border-subtle rounded-[20px] p-5 flex flex-col justify-between min-h-[145px] text-left hover:bg-card-hover transition-colors duration-200">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
            Total Sponsor Fund
          </span>
          <div className="p-2 rounded-xl border border-border-subtle/50 bg-background/50 text-text-secondary shrink-0">
            <Wallet className="w-4.5 h-4.5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-lg font-black text-white tracking-tight leading-none">
            {formatCurrency(dedicatedSponsorBudget)}
          </h3>
          <p className="text-[10px] text-text-secondary font-medium mt-1.5">
            Configured Sponsor Budget
          </p>
        </div>
      </div>

      {/* CARD 4: Available Sponsor Fund */}
      <div className="bg-card-bg border border-border-subtle rounded-[20px] p-5 flex flex-col justify-between min-h-[145px] text-left hover:bg-card-hover transition-colors duration-200">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
            Available Sponsor Fund
          </span>
          <div className="p-2 rounded-xl border border-border-subtle/50 bg-background/50 text-text-secondary shrink-0">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <h3 className="text-lg font-black text-white tracking-tight leading-none">
            {formatCurrency(availableSponsorFund)}
          </h3>
          <div className="mt-2 text-[9px] text-text-secondary flex items-center justify-between">
            <div className="w-2/3 bg-zinc-800/80 border border-border-subtle/50 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-primary-accent h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, remainingPercentage))}%` }}
              />
            </div>
            <span className="font-bold text-white shrink-0 ml-1">
              {remainingPercentage.toFixed(0)}% Remaining
            </span>
          </div>
          <p className="text-[10px] text-text-secondary font-medium mt-1.5">
            Remaining Sponsor Balance
          </p>
        </div>
      </div>

      {/* CARD 5: Total Expenses */}
      <div className="bg-card-bg border border-border-subtle rounded-[20px] p-5 flex flex-col justify-between min-h-[145px] text-left hover:bg-card-hover transition-colors duration-200">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
            Total Expenses
          </span>
          <div className="p-2 rounded-xl border border-border-subtle/50 bg-background/50 text-text-secondary shrink-0">
            <TrendingUp className="w-4.5 h-4.5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-lg font-black text-white tracking-tight leading-none">
            {formatCurrency(totalSpent)}
          </h3>
          <p className="text-[10px] text-text-secondary font-medium mt-1.5">
            Sponsor + Personal Expenses
          </p>
        </div>
      </div>

    </div>
  );
}
