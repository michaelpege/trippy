'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Lock,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  KeyRound,
  Clock,
  History,
  X,
  LogIn,
  CheckCircle2,
  Disc,
} from 'lucide-react';
import Link from 'next/link';
import { PeekABooDeck } from '@/components/peek-a-boo/PeekABooDeck';
import { fetchSharedRoulette, spinSharedRoulette } from '@/lib/api';
import { getStoredToken, loadGoogleScript, saveSession } from '@/lib/auth';
import { useToast } from '@/components/common/Toast';
import type { Roulette, RouletteItem, RouletteAuditLog } from '@/types';

function formatTimestamp(isoString?: string): string {
  if (!isoString) return 'Unknown';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoString;
  }
}

function SharedPeekABooContent() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const rouletteId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [roulette, setRoulette] = useState<Pick<
    Roulette,
    'id' | 'title' | 'description' | 'type' | 'items' | 'protection_type' | 'rendering_modes' | 'updated_at' | 'created_at'
  > | null>(null);
  const [last5Runs, setLast5Runs] = useState<RouletteAuditLog[]>([]);
  const [authenticatedAs, setAuthenticatedAs] = useState<string | null>(null);
  const [protectionType, setProtectionType] = useState<'google' | 'token'>('google');

  // Sign-in popup modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [passcode, setPasscode] = useState('');
  const [submittingToken, setSubmittingToken] = useState(false);

  // Google Sign-In container ref
  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    '500705610156-2j6108eea4i6242mtf5reb0uoj6jrvqq.apps.googleusercontent.com';

  const isPreview = searchParams.get('preview') === 'true';

  const loadRoulette = async (tokenOverride?: string, googleTokenOverride?: string) => {
    if (!rouletteId) {
      setAuthError('Missing roulette ID in URL parameter.');
      setLoading(false);
      return;
    }

    try {
      const stored = googleTokenOverride || getStoredToken();
      const res = await fetchSharedRoulette(rouletteId, {
        token: tokenOverride || passcode || undefined,
        googleToken: stored || undefined,
        preview: isPreview,
      });

      setRoulette(res.roulette);
      setLast5Runs(res.last5Runs || []);
      setAuthenticatedAs(res.authenticatedAs || (isPreview ? 'Admin Preview (Simulation)' : null));
      setProtectionType(res.protectionType || res.roulette.protection_type || 'google');
      setAuthError(null);

      // If user is not authenticated and not in preview mode, automatically open the sign-in modal
      if (!isPreview && (res.requiresAuth || !res.authenticatedAs)) {
        setShowAuthModal(true);
      } else {
        setShowAuthModal(false);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Access restricted');
      if (!isPreview) {
        setShowAuthModal(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoulette();
  }, [rouletteId]);

  // Setup Google GIS inside the popup modal whenever it is open
  useEffect(() => {
    if (!showAuthModal) return;

    loadGoogleScript().then(() => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (resp: { credential: string }) => {
              saveSession(resp.credential);
              toast.info('Google account verified.');
              await loadRoulette(undefined, resp.credential);
            },
          });

          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            width: 280,
            text: 'continue_with',
            shape: 'rectangular',
          });
        } catch (e) {
          console.warn('GIS modal render error:', e);
        }
      }
    });
  }, [showAuthModal, clientId]);

  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      toast.error('Please enter the passcode.');
      return;
    }

    setSubmittingToken(true);
    try {
      await loadRoulette(passcode.trim());
      toast.success('Passcode verified! You can now flip cards.');
    } catch (err: any) {
      setAuthError(err.message || 'Invalid passcode token.');
    } finally {
      setSubmittingToken(false);
    }
  };

  const handleSharedSpin = async (pickedItem?: RouletteItem): Promise<RouletteItem> => {
    if (!rouletteId) throw new Error('Missing roulette ID');

    // If not authenticated and not in preview mode, prompt the sign-in modal
    if (!authenticatedAs && !isPreview) {
      setShowAuthModal(true);
      toast.error('Authentication required before picking.');
      throw new Error('Authentication required');
    }

    const res = await spinSharedRoulette(rouletteId, {
      token: passcode || undefined,
      googleToken: getStoredToken() || undefined,
      preview: isPreview,
    });

    if (isPreview || res.simulated) {
      toast.success(`[PREVIEW SIMULATION] Selected: ${res.winner.title}! Zero database records written.`);
    } else {
      toast.success(`Selected: ${res.winner.title}! Result saved in audit trail.`);
      if (res.auditLog) {
        setLast5Runs((prev) => [res.auditLog!, ...prev.slice(0, 4)]);
      } else {
        loadRoulette();
      }
    }

    return res.winner || pickedItem || (roulette?.items && roulette.items[0]);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-[#111111] dark:border-white border-t-[#F5C800] animate-spin rounded-none" />
          <p className="text-xs font-mono font-black uppercase tracking-widest text-[#888888]">
            [SHUFFLING SHARED PEEK A BOO DECK...]
          </p>
        </div>
      </div>
    );
  }

  if (!roulette) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white dark:bg-[#0E1013] border-[3px] border-[#111111] dark:border-white corner-rule-red rounded-none p-8 text-center relative">
        <div className="w-12 h-12 border-2 border-[#111111] dark:border-white bg-[#E63329] text-white flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-black uppercase tracking-tight text-[#111111] dark:text-[#FFFFFF] mb-2">
          Shared Link Not Accessible
        </h2>
        <p className="text-xs font-mono text-[#888888] mb-6">
          {authError || 'This shared set cannot be found or is currently inactive.'}
        </p>
        <button
          onClick={() => setShowAuthModal(true)}
          className="px-5 py-2.5 bg-[#111111] text-white text-xs font-black uppercase tracking-wider hover:bg-[#E63329] transition"
        >
          Sign In / Enter Passcode
        </button>
      </div>
    );
  }

  const supportsWheel = !roulette.rendering_modes || roulette.rendering_modes.includes('wheel');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Top Preview Mode Simulation Bar */}
      {isPreview && (
        <div className="bg-[#111111] text-white border-[3px] border-[#F5C800] p-4 shadow-[4px_4px_0px_0px_#F5C800]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 bg-[#F5C800] animate-ping rounded-full flex-shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-black text-[#F5C800] uppercase tracking-widest">
                    [ADMIN PREVIEW // RECIPIENT SIMULATION]
                  </span>
                  <span className="px-1.5 py-0.2 bg-[#E63329] text-white text-[9px] font-mono font-bold uppercase">
                    ZERO DB WRITES
                  </span>
                </div>
                <p className="text-xs text-[#888888] font-mono pt-0.5">
                  Viewing exact recipient POV. Spins/picks are simulated and will NOT write to database or audit logs.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
              {supportsWheel && (
                <Link
                  href={`/roulette/share?id=${roulette.id}&preview=true`}
                  className="px-3 py-1.5 bg-[#F5C800] hover:bg-white text-[#111111] text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1 border border-[#111111]"
                >
                  <Disc className="w-3 h-3 text-[#E63329]" />
                  <span>SWITCH TO WHEEL PREVIEW</span>
                </Link>
              )}
              <Link
                href={`/roulette/detail?id=${roulette.id}`}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[10px] font-mono font-bold uppercase tracking-wider transition border border-white/30"
              >
                EXIT PREVIEW
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="p-6 bg-white dark:bg-[#16191E] border-[3px] border-[#111111] dark:border-white corner-rule-yellow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 bg-[#F5C800]" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#E63329]">
              COMPANION ACCESS // PEEK A BOO
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#111111] dark:text-white">
            {roulette.title}
          </h1>
          {roulette.description && (
            <p className="text-xs text-[#888888] font-mono mt-1">
              {roulette.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {supportsWheel && (
            <Link
              href={`/roulette/share?id=${roulette.id}${isPreview ? '&preview=true' : ''}`}
              className="px-3.5 py-2 border-2 border-[#111111] dark:border-white bg-[#111111] text-white dark:bg-white dark:text-[#111111] text-xs font-black uppercase tracking-wider hover:bg-[#E63329] hover:text-white transition flex items-center gap-1.5"
            >
              <Disc className="w-3.5 h-3.5 text-[#E63329]" />
              <span>SWITCH TO WHEEL</span>
            </Link>
          )}

          {authenticatedAs ? (
            <div className="px-3.5 py-2 border-2 border-[#111111] dark:border-white bg-[#F7F5F0] dark:bg-[#111111] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div className="text-left">
                <span className="block text-[8px] font-mono font-bold uppercase text-[#888888]">
                  VERIFIED PARTICIPANT
                </span>
                <span className="block text-xs font-mono font-black text-[#111111] dark:text-white truncate max-w-[160px]">
                  {authenticatedAs}
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-4 py-2 bg-[#E63329] text-white text-xs font-black uppercase tracking-wider border-2 border-[#111111] dark:border-white hover:bg-[#C22921] transition flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>SIGN IN TO FLIP</span>
            </button>
          )}
        </div>
      </div>

      {/* Peek a Boo Deck Component */}
      <PeekABooDeck
        items={roulette.items || []}
        title={roulette.title}
        type={roulette.type}
        onSpinRequest={handleSharedSpin}
      />

      {/* Metadata & Recent Runs Audit Log */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Set Metadata */}
        <div className="md:col-span-5 p-5 bg-white dark:bg-[#16191E] border-[3px] border-[#111111] dark:border-white space-y-3">
          <span className="text-xs font-black uppercase tracking-wider text-[#111111] dark:text-white flex items-center gap-1.5 border-b border-[#111111]/10 dark:border-white/10 pb-2">
            <Clock className="w-4 h-4 text-[#1A3A6B] dark:text-[#F5C800]" />
            Session Metadata
          </span>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-[#888888]">Candidate Mode:</span>
              <span className="font-bold uppercase text-[#111111] dark:text-white">
                {roulette.type} Pool
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#888888]">Unique Candidates:</span>
              <span className="font-bold text-[#111111] dark:text-white">
                {roulette.items?.length || 0} items
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#888888]">Access Protocol:</span>
              <span className="font-bold uppercase text-[#111111] dark:text-white">
                {protectionType.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#888888]">Last Updated:</span>
              <span className="font-bold text-[#111111] dark:text-white">
                {formatTimestamp(roulette.updated_at || roulette.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Picks Audit Trail */}
        <div className="md:col-span-7 p-5 bg-white dark:bg-[#16191E] border-[3px] border-[#111111] dark:border-white space-y-3">
          <span className="text-xs font-black uppercase tracking-wider text-[#111111] dark:text-white flex items-center gap-1.5 border-b border-[#111111]/10 dark:border-white/10 pb-2">
            <History className="w-4 h-4 text-[#E63329]" />
            Last 5 Picks // Audit Trail
          </span>

          {last5Runs.length > 0 ? (
            <div className="space-y-2">
              {last5Runs.map((run) => (
                <div
                  key={run.id}
                  className="p-2.5 bg-[#F7F5F0] dark:bg-[#111111] border border-[#111111]/20 dark:border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-mono"
                >
                  <div>
                    <span className="font-black text-[#E63329] uppercase">
                      {run.selected_item_title}
                    </span>
                    <p className="text-[10px] text-[#888888]">
                      By: {run.executed_by_identifier}
                    </p>
                  </div>
                  <span className="text-[10px] text-[#888888] flex-shrink-0">
                    {formatTimestamp(run.created_at)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs font-mono text-[#888888] italic py-2">
              No picks recorded yet. Tap any card above to flip and record the first pick.
            </p>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* AUTHENTICATION MODAL (GOOGLE GIS / STATIC PASSCODE) */}
      {/* ===================================================================== */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
          <div className="w-full max-w-md bg-[#FFFFFF] dark:bg-[#0E1013] border-[3px] border-[#111111] dark:border-[#FFFFFF] corner-rule-yellow rounded-none overflow-hidden relative">
            <div className="px-6 py-4 bg-[#F7F5F0] dark:bg-[#111111] border-b-2 border-[#111111] dark:border-[#FFFFFF] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#E63329]" />
                <h3 className="text-sm font-black uppercase tracking-tight text-[#111111] dark:text-[#FFFFFF]">
                  Authentication Required
                </h3>
              </div>
              {authenticatedAs && (
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="p-1 border border-[#111111] dark:border-[#FFFFFF] hover:bg-[#E63329] hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-[#888888] font-mono">
                {protectionType === 'google'
                  ? 'This set is restricted to whitelisted Google accounts. Sign in to verify your identity before picking.'
                  : 'This set is protected by a shared passcode. Enter the secret code to access the cards.'}
              </p>

              {authError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-[#E63329] text-xs font-mono text-[#E63329]">
                  {authError}
                </div>
              )}

              {protectionType === 'google' ? (
                <div className="py-4 flex flex-col items-center justify-center gap-3">
                  <div ref={googleBtnRef} />
                </div>
              ) : (
                <form onSubmit={handlePasscodeSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-[#888888] mb-1">
                      Passcode Token
                    </label>
                    <input
                      type="text"
                      required
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      placeholder="e.g. BALI-2026-TRIP-SECRET"
                      className="w-full px-3.5 py-2.5 border-2 border-[#111111] dark:border-[#FFFFFF] bg-white dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] text-xs font-mono font-bold uppercase focus:outline-none focus:border-[#E63329]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingToken}
                    className="w-full py-2.5 bg-[#F5C800] hover:bg-[#111111] hover:text-[#F5C800] text-[#111111] border-2 border-[#111111] dark:border-[#FFFFFF] text-xs font-black uppercase tracking-wider transition"
                  >
                    {submittingToken ? 'Verifying...' : 'Unlock Peek a Boo Deck'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SharedPeekABooPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-[3px] border-[#111111] dark:border-white border-t-[#F5C800] animate-spin rounded-none" />
            <p className="text-xs font-mono font-black uppercase tracking-widest text-[#888888]">
              [LOADING SHARED PEEK A BOO...]
            </p>
          </div>
        </div>
      }
    >
      <SharedPeekABooContent />
    </Suspense>
  );
}
