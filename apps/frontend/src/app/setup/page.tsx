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
          <div className="w-10 h-10 border-[3px] border-[#111111] dark:border-[#FFFFFF] border-t-[#E63329] animate-spin rounded-none" />
          <p className="text-xs font-mono font-black uppercase tracking-widest text-[#888888]">
            [QUERYING SYSTEM DATABASE STATE...]
          </p>
        </div>
      </div>
    );
  }

  // If already initialized: Endpoint is locked!
  if (isInitialized) {
    return (
      <div className="max-w-md mx-auto my-12 bg-[#FFFFFF] dark:bg-[#0E1013] rounded-none border-[3px] border-[#111111] dark:border-[#FFFFFF] corner-rule-red p-8 text-center relative">
        <div className="w-14 h-14 border-2 border-[#111111] dark:border-[#FFFFFF] bg-[#E63329] text-white flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7" />
        </div>
        <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#E63329]">
          [SECURITY // PERMANENT LOCK]
        </span>
        <h2 className="text-2xl font-black uppercase tracking-tight text-[#111111] dark:text-[#FFFFFF] mt-1">
          Setup Completed
        </h2>
        <p className="mt-2 text-xs text-[#888888] font-mono leading-relaxed">
          The database instance has already been initialized and an owner is registered. For security reasons, this route is sealed.
        </p>

        {ownerEmailFound && (
          <div className="mt-4 p-3 bg-[#F7F5F0] dark:bg-[#111111] border-2 border-[#111111] dark:border-[#FFFFFF] rounded-none text-xs font-mono text-[#111111] dark:text-[#FFFFFF]">
            <span className="text-[#888888] uppercase">Owner:</span> <span className="font-bold">{ownerEmailFound}</span>
          </div>
        )}

        <button
          onClick={() => router.push('/login')}
          className="mt-6 w-full py-3 bg-[#F5C800] hover:bg-[#111111] hover:text-[#F5C800] text-[#111111] border-2 border-[#111111] dark:border-[#FFFFFF] font-black uppercase tracking-wider text-xs rounded-none transition"
        >
          Proceed to Sign In
        </button>
      </div>
    );
  }

  // Setup Wizard for new installation
  return (
    <div className="max-w-lg mx-auto my-8 bg-[#FFFFFF] dark:bg-[#0E1013] border-[3px] border-[#111111] dark:border-[#FFFFFF] corner-rule-yellow rounded-none overflow-hidden relative">
      <div className="bg-[#1A3A6B] p-8 text-white text-center border-b-[3px] border-[#111111] dark:border-[#FFFFFF]">
        <div className="w-14 h-14 border-2 border-white bg-[#E63329] text-white flex items-center justify-center mx-auto mb-4">
          <Compass className="w-7 h-7" />
        </div>
        <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#F5C800]">
          [GENESIS // SYSTEM BOOTSTRAP]
        </span>
        <h1 className="text-2xl font-black uppercase tracking-tight text-white mt-1">
          System Initialization
        </h1>
        <p className="mt-1 text-xs text-white/80 font-mono max-w-sm mx-auto">
          Welcome to Trippy. The edge database is currently uninitialized. Register your Gmail address to establish the System Owner.
        </p>
      </div>

      <div className="p-8">
        <div className="mb-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#111111] dark:text-[#FFFFFF] bg-[#F7F5F0] dark:bg-[#111111] p-3 rounded-none border-2 border-[#111111] dark:border-[#FFFFFF]">
            <CheckCircle2 className="w-4 h-4 text-[#1A3A6B] dark:text-[#F5C800] flex-shrink-0" />
            <span>Database schema & migrations verified</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#111111] dark:text-[#FFFFFF] bg-[#F7F5F0] dark:bg-[#111111] p-3 rounded-none border-2 border-[#111111] dark:border-[#FFFFFF]">
            <ShieldCheck className="w-4 h-4 text-[#E63329] flex-shrink-0" />
            <span>Full super-admin privileges will be bound to this account</span>
          </div>
        </div>

        <form onSubmit={handleRegisterOwner} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF] mb-1.5">
              Owner Gmail Address <span className="text-[#E63329]">*</span>
            </label>
            <input
              type="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="e.g. yourname@gmail.com"
              className="w-full px-4 py-3 rounded-none border-2 border-[#111111] dark:border-[#FFFFFF] text-xs font-mono font-bold focus:outline-none focus:border-[#E63329] bg-white dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] transition"
            />
            <p className="text-[10px] text-[#888888] font-mono mt-1.5">
              Ensure this exactly matches the Google account you will authenticate with.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-[#F5C800] hover:bg-[#111111] hover:text-[#F5C800] text-[#111111] font-black uppercase tracking-wider text-xs border-2 border-[#111111] dark:border-[#FFFFFF] flex items-center justify-center gap-2 transition rounded-none disabled:opacity-50"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-[#111111] border-t-transparent animate-spin rounded-none" />
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
