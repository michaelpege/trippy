'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Lock,
  ShieldCheck,
  Compass,
  AlertCircle,
  KeyRound,
  Clock,
  History,
  X,
  LogIn,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { RouletteWheel } from '@/components/roulette/RouletteWheel';
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

function SharedRouletteContent() {
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
      toast.success('Passcode verified! You can now spin.');
    } catch (err: any) {
      setAuthError(err.message || 'Invalid passcode token.');
    } finally {
      setSubmittingToken(false);
    }
  };

  const handleSharedSpin = async (): Promise<RouletteItem> => {
    if (!rouletteId) throw new Error('Missing roulette ID');

    // If not authenticated and not in preview mode, prompt the sign-in modal
    if (!authenticatedAs && !isPreview) {
      setShowAuthModal(true);
      toast.error('Authentication required before spinning.');
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
      toast.success(`Winner: ${res.winner.title}! Result saved in audit trail.`);
      if (res.auditLog) {
        setLast5Runs((prev) => [res.auditLog!, ...prev.slice(0, 4)]);
      } else {
        loadRoulette();
      }
    }

    return res.winner;
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-[#111111] dark:border-white border-t-[#E63329] animate-spin rounded-none" />
          <p className="text-xs font-mono font-black uppercase tracking-widest text-[#888888]">
            [LOADING SHARED ROULETTE...]
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
        <h1 className="text-xl font-black uppercase tracking-tight text-[#111111] dark:text-white">
          Roulette Not Found
        </h1>
        <p className="mt-2 text-xs text-[#888888] font-mono leading-relaxed">
          {authError || 'The shared roulette link may be invalid, deactivated, or expired.'}
        </p>
      </div>
    );
  }

  const lastUpdatedFormatted = formatTimestamp(roulette.updated_at || roulette.created_at);

  return (
    <div className="max-w-2xl mx-auto my-4 space-y-6">
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
              {(!roulette.rendering_modes || roulette.rendering_modes.includes('cards')) && (
                <Link
                  href={`/peek-a-boo/share?id=${roulette.id}&preview=true`}
                  className="px-3 py-1.5 bg-[#F5C800] hover:bg-white text-[#111111] text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1 border border-[#111111]"
                >
                  <Sparkles className="w-3 h-3 text-[#111111]" />
                  <span>SWITCH TO CARDS PREVIEW</span>
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

      {/* Roulette Header */}
      <div className="text-center space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {authenticatedAs ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-none text-[10px] font-mono font-black uppercase tracking-wider bg-[#F5C800] text-[#111111] border-2 border-[#111111]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#111111]" />
              <span>Signed In: {authenticatedAs}</span>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-none text-[10px] font-mono font-black uppercase tracking-wider bg-[#E63329] text-white border-2 border-[#111111] hover:bg-[#111111] transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In to Spin</span>
            </button>
          )}

          {/* Last Updated Timestamp Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider bg-white dark:bg-[#16191E] text-[#888888] border-2 border-[#111111] dark:border-white">
            <Clock className="w-3.5 h-3.5 text-[#1A3A6B] dark:text-[#F5C800]" />
            <span>Updated: {lastUpdatedFormatted}</span>
          </div>

          {/* Switch to Peek a Boo Cards if enabled */}
          {(!roulette.rendering_modes || roulette.rendering_modes.includes('cards')) && (
            <Link
              href={`/peek-a-boo/share?id=${roulette.id}${isPreview ? '&preview=true' : ''}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-none text-[10px] font-mono font-black uppercase tracking-wider bg-[#111111] text-[#F5C800] border-2 border-[#111111] hover:bg-[#1A3A6B] hover:text-white transition"
              title="Switch presentation format to Peek a Boo cards"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>PEEK A BOO CARDS</span>
            </Link>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[#111111] dark:text-white pt-1">
          {roulette.title}
        </h1>
        {roulette.description && (
          <p className="text-xs sm:text-sm text-[#888888] font-mono max-w-lg mx-auto leading-relaxed">
            {roulette.description}
          </p>
        )}
      </div>

      {/* The Roulette Wheel */}
      <RouletteWheel
        items={roulette.items}
        onSpinRequest={handleSharedSpin}
      />

      {/* Audit of the Last 5 Runs */}
      <div className="bg-white dark:bg-[#0E1013] border-[3px] border-[#111111] dark:border-white corner-rule-blue rounded-none p-5 relative">
        <div className="flex items-center justify-between pb-3 border-b-2 border-[#111111] dark:border-white mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#1A3A6B] dark:text-[#F5C800]" />
            <span className="font-mono text-xs font-black uppercase tracking-wider text-[#111111] dark:text-white">
              // AUDIT TRAIL // LAST 5 RUNS
            </span>
          </div>
          <span className="text-[10px] font-mono font-black text-[#888888] uppercase">
            IMMUTABLE LEDGER
          </span>
        </div>

        {last5Runs.length > 0 ? (
          <div className="space-y-2.5">
            {last5Runs.slice(0, 5).map((run, idx) => (
              <div
                key={run.id || `run_${idx}`}
                className="p-3 bg-[#F7F5F0] dark:bg-[#16191E] border-2 border-[#111111] dark:border-white rounded-none flex items-center justify-between gap-3 text-xs font-mono"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 flex-shrink-0 bg-[#111111] text-white dark:bg-white dark:text-[#111111] text-[10px] font-black flex items-center justify-center">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="font-black text-[#111111] dark:text-white truncate">
                      {run.selected_item_title}
                    </div>
                    <div className="text-[10px] text-[#888888] truncate">
                      Spun by: {run.executed_by_identifier || 'Participant'}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-right text-[#888888] flex-shrink-0">
                  {formatTimestamp(run.created_at)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs font-mono text-[#888888]">
            No spin runs recorded yet in the audit ledger.
          </div>
        )}
      </div>

      {/* POPUP TO SIGN IN MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-[#0E1013] border-[3px] border-[#111111] dark:border-white corner-rule-red rounded-none p-6 text-center relative shadow-2xl">
            {/* Close button if user just wants to inspect wheel without signing in */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-3 right-3 p-1.5 border border-[#111111] dark:border-white text-[#111111] dark:text-white hover:bg-[#E63329] hover:text-white transition"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 border-2 border-[#111111] dark:border-white bg-[#E63329] text-white flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6" />
            </div>

            <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#E63329]">
              [SECURITY GATE // ACCESS RESTRICTED]
            </span>
            <h2 className="text-2xl font-black uppercase tracking-tight text-[#111111] dark:text-white mt-1">
              Sign In to Spin
            </h2>
            <p className="mt-1.5 text-xs text-[#888888] font-mono max-w-xs mx-auto leading-relaxed">
              Authorization required before wheel spin controls can be unlocked.
            </p>

            {authError && (
              <div className="mt-4 p-3 bg-[#E63329]/10 text-[#E63329] border-2 border-[#E63329] text-xs font-mono flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="font-bold">{authError}</span>
              </div>
            )}

            {/* Google Sign In option */}
            <div className="mt-6 pt-5 border-t-2 border-[#111111] dark:border-white space-y-4">
              <div className="flex flex-col items-center justify-center min-h-[44px]">
                <div ref={googleBtnRef} />
              </div>

              {/* Passcode Token option if protection is token-based */}
              {protectionType === 'token' && (
                <div className="pt-4 border-t-2 border-[#111111] dark:border-white">
                  <form onSubmit={handlePasscodeSubmit} className="space-y-3">
                    <div className="text-left">
                      <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-[#888888] mb-1">
                        Or Enter Shared Passcode
                      </label>
                      <input
                        type="text"
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        placeholder="ENTER PASSCODE..."
                        className="w-full px-3 py-2 rounded-none border-2 border-[#111111] dark:border-white text-xs font-mono font-bold focus:outline-none focus:border-[#E63329] bg-[#F7F5F0] dark:bg-[#111111] text-[#111111] dark:text-white uppercase"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submittingToken}
                      className="w-full py-2.5 bg-[#F5C800] hover:bg-[#111111] hover:text-[#F5C800] text-[#111111] border-2 border-[#111111] dark:border-white font-black uppercase tracking-wider text-xs rounded-none transition flex items-center justify-center gap-1.5"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>Unlock with Passcode</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SharedRoulettePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-10 h-10 border-[3px] border-[#111111] dark:border-white border-t-[#E63329] animate-spin rounded-none" />
        </div>
      }
    >
      <SharedRouletteContent />
    </Suspense>
  );
}
