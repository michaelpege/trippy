'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, CheckCircle2, ArrowRight, Compass, AlertCircle } from 'lucide-react';
import { checkSetupStatus, submitSetup } from '@/lib/api';
import { saveSession } from '@/lib/auth';
import { useToast } from '@/components/common/Toast';

export default function SetupPage() {
  const router = useRouter();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [ownerEmailFound, setOwnerEmailFound] = useState<string | null>(null);

  const [emailInput, setEmailInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await checkSetupStatus();
        setIsInitialized(res.isInitialized);
        if (res.ownerEmail) {
          setOwnerEmailFound(res.ownerEmail);
        }
      } catch (err) {
        console.error('Status check error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, []);

  const handleRegisterOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !emailInput.includes('@')) {
      toast.error('Please enter a valid Gmail address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitSetup(emailInput.trim());
      toast.success('System successfully initialized! You are now the System Owner.');

      // Mock session for instant access
      saveSession('setup_initial_owner_token', emailInput.trim(), 'Owner');

      setTimeout(() => {
        router.push('/places');
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || 'Initialization failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 dark:text-slate-400">Checking system database status...</p>
        </div>
      </div>
    );
  }

  // If already initialized: Endpoint is locked!
  if (isInitialized) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden p-8 text-center animate-in fade-in">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Setup Already Completed</h2>
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          The database has already been initialized and an owner is registered. For security reasons,
          the setup endpoint is permanently locked.
        </p>

        {ownerEmailFound && (
          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300">
            Registered Owner: <span className="font-bold">{ownerEmailFound}</span>
          </div>
        )}

        <button
          onClick={() => router.push('/login')}
          className="mt-6 w-full py-3 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-sm"
        >
          Proceed to Login
        </button>
      </div>
    );
  }

  // Setup Wizard for new installation
  return (
    <div className="max-w-lg mx-auto my-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-8 text-white text-center relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto mb-4 border border-white/20">
          <Compass className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black tracking-tight">Initial System Setup</h1>
        <p className="mt-1 text-xs text-emerald-100 max-w-sm mx-auto">
          Welcome to Trippy! The database is currently uninitialized. Register your Gmail address to
          become the System Owner.
        </p>
      </div>

      <div className="p-8">
        <div className="mb-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200/80 dark:border-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>Database schema & migrations ready to activate</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-200/80 dark:border-indigo-800">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <span>Full unrestricted super-admin privileges will be assigned</span>
          </div>
        </div>

        <form onSubmit={handleRegisterOwner} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Owner Gmail Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="e.g. yourname@gmail.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition"
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
              Make sure this matches the Google account you will use to sign in.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition text-sm disabled:opacity-50"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Initialize & Register Owner</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
