'use client';

import React, { useState } from 'react';
import { ADMIN_KEY, ADMIN_ASK_EVERY_TIME } from '@/lib/constants';
import { ShieldCheck, X, KeyRound } from 'lucide-react';

interface AdminKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionType: 'edit' | 'delete';
}

export default function AdminKeyModal({ isOpen, onClose, onSuccess, actionType }: AdminKeyModalProps) {
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (keyInput === ADMIN_KEY) {
      sessionStorage.setItem('adminKey', keyInput);
      if (!ADMIN_ASK_EVERY_TIME) {
        sessionStorage.setItem('isAdmin', 'true');
      }
      onSuccess();
      setKeyInput('');
      onClose();
    } else {
      setError('Invalid admin key');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark overlay backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-full mb-4">
            <KeyRound className="w-6 h-6" />
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">
            Admin Verification Required
          </h3>
          <p className="text-sm text-slate-400 mb-6">
            Please enter the Admin key to {actionType} this expense.
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Admin Key"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-rose-400 text-left bg-rose-500/10 border border-rose-500/20 px-3.5 py-2 rounded-xl">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all duration-200"
              >
                Verify Key
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
export function checkIsAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  if (ADMIN_ASK_EVERY_TIME) return false;
  return sessionStorage.getItem('isAdmin') === 'true';
}
export function clearAdminSession() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('isAdmin');
    sessionStorage.removeItem('adminKey');
  }
}
