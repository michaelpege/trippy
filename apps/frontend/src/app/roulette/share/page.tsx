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
    '500705610156-2j6108eea4i6242mtf5reb0uoj6jrvqq.apps.googleusercontent.com';

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
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-[#111111] dark:border-[#FFFFFF] border-t-[#E63329] animate-spin rounded-none" />
          <p className="text-xs font-mono font-black uppercase tracking-widest text-[#888888]">
            [VERIFYING ACCESS PROTOCOL...]
          </p>
        </div>
      </div>
    );
  }

  // Not authorized / password prompt needed
  if (!roulette) {
    return (
      <div className="max-w-md mx-auto my-12 bg-[#FFFFFF] dark:bg-[#0E1013] border-[3px] border-[#111111] dark:border-[#FFFFFF] corner-rule-red rounded-none p-8 text-center">
        <div className="w-12 h-12 border-2 border-[#111111] dark:border-[#FFFFFF] bg-[#E63329] text-white flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>

        <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#E63329]">
          [SECURITY GATE // ACCESS RESTRICTED]
        </span>
        <h1 className="text-2xl font-black uppercase tracking-tight text-[#111111] dark:text-[#FFFFFF] mt-1">
          Protected Roulette
        </h1>
        <p className="mt-2 text-xs text-[#888888] font-mono max-w-xs mx-auto leading-relaxed">
          Authorization required before candidates and wheel spin controls can be unlocked.
        </p>

        {authError && (
          <div className="mt-4 p-3 bg-[#E63329]/10 text-[#E63329] border-2 border-[#E63329] rounded-none text-xs font-mono flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-bold">{authError}</span>
          </div>
        )}

        {/* Static Passcode / Token Input Form */}
        <div className="mt-6 pt-5 border-t-2 border-[#111111] dark:border-[#FFFFFF] space-y-5">
          <form onSubmit={handlePasscodeSubmit} className="space-y-3">
            <div className="text-left">
              <label className="block text-xs font-black uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF] mb-1">
                Enter Shared Passcode Token
              </label>
              <input
                type="text"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="PASSCODE TOKEN..."
                className="w-full px-3.5 py-2.5 rounded-none border-2 border-[#111111] dark:border-[#FFFFFF] text-xs font-mono font-bold focus:outline-none focus:border-[#E63329] bg-[#F7F5F0] dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={submittingToken}
              className="w-full py-3 bg-[#F5C800] hover:bg-[#111111] hover:text-[#F5C800] text-[#111111] border-2 border-[#111111] dark:border-[#FFFFFF] font-black uppercase tracking-wider text-xs rounded-none transition flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>Unlock with Passcode</span>
            </button>
          </form>

          {/* Or Google Sign In */}
          <div className="pt-5 border-t-2 border-[#111111] dark:border-[#FFFFFF]">
            <p className="text-[10px] font-mono font-black uppercase tracking-widest text-[#888888] mb-3">
              // OR AUTHORIZE VIA GOOGLE GIS //
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
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-none text-[11px] font-mono font-black uppercase tracking-wider bg-[#F5C800] text-[#111111] border-2 border-[#111111] dark:border-[#FFFFFF] mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-[#111111]" />
          Authorized User: {authenticatedAs}
        </div>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[#111111] dark:text-[#FFFFFF]">
          {roulette.title}
        </h1>
        {roulette.description && (
          <p className="mt-1.5 text-xs sm:text-sm text-[#888888] font-mono max-w-lg mx-auto">
            {roulette.description}
          </p>
        )}
      </div>

      <RouletteWheel
        items={roulette.items}
        onSpinRequest={handleSharedSpin}
      />

      <div className="p-4 bg-[#FFFFFF] dark:bg-[#0E1013] rounded-none border-2 border-[#111111] dark:border-[#FFFFFF] text-center text-xs font-mono text-[#888888] flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-[#1A3A6B] dark:text-[#F5C800] flex-shrink-0" />
        <span>Every spin execution is cryptographically written into the permanent immutable audit ledger.</span>
      </div>
    </div>
  );
}

export default function SharedRoulettePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-10 h-10 border-[3px] border-[#111111] dark:border-[#FFFFFF] border-t-[#E63329] animate-spin rounded-none" />
        </div>
      }
    >
      <SharedRouletteContent />
    </Suspense>
  );
}
