'use client';

import React from 'react';

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  paidBy: string;
  date: Date | string;
  notes: string | null;
}

interface CategoryChartProps {
  expenses: Expense[];
}

// Category colors helper mapping
const CATEGORY_COLORS: Record<string, { bg: string; bar: string; text: string }> = {
  'Food': {
    bg: 'bg-amber-500/10 border-amber-500/20',
    bar: 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-orange-500/20',
    text: 'text-amber-400'
  },
  'Travel': {
    bg: 'bg-sky-500/10 border-sky-500/20',
    bar: 'bg-gradient-to-r from-sky-500 to-blue-500 shadow-blue-500/20',
    text: 'text-sky-400'
  },
  'Stationery/Printing': {
    bg: 'bg-rose-500/10 border-rose-500/20',
    bar: 'bg-gradient-to-r from-rose-500 to-pink-500 shadow-pink-500/20',
    text: 'text-rose-400'
  },
  'Swag/Prizes': {
    bg: 'bg-purple-500/10 border-purple-500/20',
    bar: 'bg-gradient-to-r from-purple-500 to-violet-500 shadow-violet-500/20',
    text: 'text-purple-400'
  },
  'Venue': {
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    bar: 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-teal-500/20',
    text: 'text-emerald-400'
  },
  'Tech/Equipment': {
    bg: 'bg-cyan-500/10 border-cyan-500/20',
    bar: 'bg-gradient-to-r from-cyan-500 to-indigo-500 shadow-indigo-500/20',
    text: 'text-cyan-400'
  },
  'Misc': {
    bg: 'bg-slate-500/10 border-slate-500/20',
    bar: 'bg-gradient-to-r from-slate-500 to-slate-600 shadow-slate-500/20',
    text: 'text-slate-400'
  }
};

const DEFAULT_COLOR = {
  bg: 'bg-fuchsia-500/10 border-fuchsia-500/20',
  bar: 'bg-gradient-to-r from-fuchsia-500 to-pink-600 shadow-fuchsia-500/20',
  text: 'text-fuchsia-400'
};

export function getCategoryStyles(category: string) {
  return CATEGORY_COLORS[category] || DEFAULT_COLOR;
}

export default function CategoryChart({ expenses }: CategoryChartProps) {
  const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);

  // Group by category
  const categoryTotals = expenses.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {} as Record<string, number>);

  // Convert to array and sort descending by amount
  const categories = Object.entries(categoryTotals)
    .map(([name, value]) => ({
      name,
      value,
      percentage: totalSpent > 0 ? (value / totalSpent) * 100 : 0
    }))
    .sort((a, b) => b.value - a.value);

  if (expenses.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-3xl p-6 h-full flex flex-col items-center justify-center text-center">
        <p className="text-slate-400 text-sm">No expenses logged yet</p>
      </div>
    );
  }

  return (
    <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col h-full justify-between">
      <div>
        <h3 className="text-lg font-bold text-white mb-1">Category Breakdown</h3>
        <p className="text-xs text-slate-400 mb-6">Distribution of expenses across components</p>
      </div>

      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
        {categories.map((cat) => {
          const styles = getCategoryStyles(cat.name);
          return (
            <div key={cat.name} className="space-y-1.5 group">
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-slate-300 group-hover:text-white transition-colors">
                  {cat.name}
                </span>
                <span className="text-slate-400">
                  <strong className="text-white">${cat.value.toFixed(2)}</strong> ({cat.percentage.toFixed(0)}%)
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${styles.bar} shadow-sm`}
                  style={{ width: `${cat.percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
