'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Disc,
  Lock,
  Mail,
  ShieldCheck,
  Compass,
  AlertCircle,
  KeyRound,
  RotateCw,
} from 'lucide-react';
import { RouletteWheel } from '@/components/roulette/RouletteWheel';
import { fetchSharedRoulette, spinSharedRoulette } from '@/lib/api';
import { getStoredToken, loadGoogleScript, saveSession } from '@/lib/auth';
import { useToast } from '@/components/common/Toast';
import type { Roulette, RouletteItem } from '@/types';

function SharedRouletteContent() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const rouletteId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [roulette, setRoulette] = useState<Pick<
    Roulette,
    'id' | 'title' | 'description' | 'type' | 'items' | 'protection_type'
  > | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authenticatedAs, setAuthenticatedAs] = useState<string | null>(null);

  // Token input state
  const [passcode, setPasscode] = useState('');
  const [submittingToken, setSubmittingToken] = useState(false);

  // Google sign in container
  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    '500705610156-ehmf5i84m847f9k58r4i1eavaqi3t6dm.apps.googleusercontent.com';

  const tryLoadRoulette = async (tokenOverride?: string, googleTokenOverride?: string) => {
    if (!rouletteId) {
      setAuthError('Missing roulette ID in URL.');
      setLoading(false);
      return;
    }

    try {
      const stored = googleTokenOverride || getStoredToken();
      const res = await fetchSharedRoulette(rouletteId, {
        token: tokenOverride || passcode || undefined,
        googleToken: stored || undefined,
      });

      setRoulette(res.roulette);
      setAuthenticatedAs(res.authenticatedAs);
      setAuthError(null);
    } catch (err: any) {
      setAuthError(err.message || 'Access restricted');
      setRoulette(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    tryLoadRoulette();

    // Setup Google GIS for guest sign in
    loadGoogleScript().then(() => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (resp: { credential: string }) => {
            saveSession(resp.credential);
            setLoading(true);
            await tryLoadRoulette(undefined, resp.credential);
          },
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: 300,
          text: 'continue_with',
          shape: 'pill',
        });
      }
    });
  }, [rouletteId]);

  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      toast.error('Please enter the passcode.');
      return;
    }

    setSubmittingToken(true);
    try {
      await tryLoadRoulette(passcode.trim());
    } finally {
      setSubmittingToken(false);
    }
  };

  const handleSharedSpin = async (): Promise<RouletteItem> => {
    if (!rouletteId) throw new Error('Missing roulette ID');
    const res = await spinSharedRoulette(rouletteId, {
      token: passcode || undefined,
      googleToken: getStoredToken() || undefined,
    });
    toast.success(`Winner: ${res.winner.title}! Result saved in audit trail.`);
    return res.winner;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 dark:text-slate-500">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Not authorized / password prompt needed
  if (!roulette) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-8 text-center animate-in fade-in">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7" />
        </div>

        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Protected Roulette</h1>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
          This roulette requires authorization before you can view candidates or spin the wheel.
        </p>

        {authError && (
          <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-xl text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {/* Static Passcode / Token Input Form */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <form onSubmit={handlePasscodeSubmit} className="space-y-3">
            <div className="text-left">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Have a Passcode / Token?
              </label>
              <input
                type="text"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={submittingToken}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>Unlock with Passcode</span>
            </button>
          </form>

          {/* Or Google Sign In */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
              Or Sign In with Authorized Gmail
            </p>
            <div className="flex justify-center min-h-[44px]">
              <div ref={googleBtnRef} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authorized: Render the Live Roulette Wheel!
  return (
    <div className="max-w-2xl mx-auto my-6 space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          Authorized as: {authenticatedAs}
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{roulette.title}</h1>
        {roulette.description && (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto">{roulette.description}</p>
        )}
      </div>

      <RouletteWheel
        items={roulette.items}
        onSpinRequest={handleSharedSpin}
      />

      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center text-xs text-slate-500 dark:text-slate-400">
        🛡️ Every spin result is permanently logged in the Trippy database execution audit trail.
      </div>
    </div>
  );
}

export default function SharedRoulettePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SharedRouletteContent />
    </Suspense>
  );
}
