'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Compass, ShieldCheck, LogIn, AlertCircle, ArrowRight, LogOut, CheckCircle2 } from 'lucide-react';
import { saveSession, clearSession, loadGoogleScript, getCurrentUser, type UserSession } from '@/lib/auth';
import { getCurrentUserProfile } from '@/lib/api';
import { useToast } from '@/components/common/Toast';

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  const [existingUser, setExistingUser] = useState<UserSession | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [devEmail, setDevEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);

  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    '500705610156-2j6108eea4i6242mtf5reb0uoj6jrvqq.apps.googleusercontent.com';

  useEffect(() => {
    // Check if there is an active session
    const current = getCurrentUser();
    if (current) {
      setExistingUser(current);
      // Validate session with backend
      getCurrentUserProfile()
        .then(() => {
          setCheckingSession(false);
        })
        .catch(() => {
          // If token was invalid or revoked, clear stale session
          clearSession();
          setExistingUser(null);
          setCheckingSession(false);
        });
    } else {
      setCheckingSession(false);
    }

    // Initialize Google GIS
    loadGoogleScript()
      .then(() => {
        setGisLoaded(true);
        if (window.google?.accounts?.id && googleBtnRef.current) {
          try {
            window.google.accounts.id.initialize({
              client_id: clientId,
              callback: handleGoogleCredentialResponse,
            });

            window.google.accounts.id.renderButton(googleBtnRef.current, {
              theme: 'outline',
              size: 'large',
              width: 280,
              text: 'signin_with',
              shape: 'rectangular',
            });

            // Prompt One Tap
            window.google.accounts.id.prompt();
          } catch (e) {
            console.warn('Google GIS render error:', e);
          }
        }
      })
      .catch((err) => {
        console.warn('GIS script failed to load:', err);
      });
  }, [clientId]);

  const handleGoogleCredentialResponse = async (response: { credential: string }) => {
    setLoading(true);
    setAuthError(null);
    try {
      saveSession(response.credential);
      const meRes = await getCurrentUserProfile();
      toast.success(`Welcome back, ${meRes.user.email}!`);
      router.push('/places');
    } catch (err: any) {
      const msg = err.message || 'Access denied: Your Google account is not registered in RBAC.';
      setAuthError(msg);
      toast.error(msg);
      clearSession();
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = devEmail.trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      toast.error('Enter a valid email address.');
      return;
    }

    setLoading(true);
    setAuthError(null);
    try {
      // Craft development mock JWT token
      const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      const payload = btoa(
        JSON.stringify({
          email: targetEmail,
          name: targetEmail.split('@')[0],
          iss: 'accounts.google.com',
          exp: Math.floor(Date.now() / 1000) + 86400 * 7,
        })
      )
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const mockToken = `${header}.${payload}.signature`;

      saveSession(mockToken, targetEmail, targetEmail.split('@')[0]);

      const me = await getCurrentUserProfile();
      toast.success(`Logged in as ${me.user.email} (${me.user.roles.join(', ')})`);
      router.push('/places');
    } catch (err: any) {
      const msg = err.message || 'Sign in failed. Ensure email is listed in roles or registered as owner.';
      setAuthError(msg);
      toast.error(msg);
      clearSession();
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    clearSession();
    setExistingUser(null);
    setAuthError(null);
    toast.info('Signed out successfully.');
  };

  const handleManualGooglePrompt = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      toast.info('Loading Google Sign-In...');
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-[#FFFFFF] dark:bg-[#0E1013] border-[3px] border-[#111111] dark:border-[#FFFFFF] corner-rule-red rounded-none p-8 text-center relative">
      <div className="w-14 h-14 border-2 border-[#111111] dark:border-[#FFFFFF] bg-[#E63329] text-white flex items-center justify-center mx-auto mb-4">
        <Compass className="w-7 h-7" />
      </div>

      <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#E63329]">
        [AUTHENTICATION // NODE ACCESS]
      </span>
      <h1 className="text-3xl font-black uppercase tracking-tight text-[#111111] dark:text-[#FFFFFF] mt-1">
        Admin Sign In
      </h1>
      <p className="mt-2 text-xs text-[#888888] font-mono max-w-xs mx-auto leading-relaxed">
        Restricted to registered owner and authorized operators with database RBAC roles.
      </p>

      {/* Error Notice */}
      {authError && (
        <div className="mt-5 p-3.5 bg-[#E63329]/10 border-2 border-[#E63329] text-[#E63329] text-xs font-mono text-left flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="font-bold leading-relaxed">{authError}</span>
        </div>
      )}

      {/* Existing Active Session Notice */}
      {existingUser && !checkingSession && (
        <div className="mt-6 p-4 bg-[#F7F5F0] dark:bg-[#111111] border-2 border-[#111111] dark:border-[#FFFFFF] text-left space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-[#111111] dark:text-[#FFFFFF]">
            <CheckCircle2 className="w-4 h-4 text-[#F5C800]" />
            <span>Currently Signed In</span>
          </div>
          <div className="font-mono text-xs text-[#888888]">
            Operator: <strong className="text-[#111111] dark:text-[#FFFFFF]">{existingUser.email}</strong>
          </div>
          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={() => router.push('/places')}
              className="flex-1 py-2.5 bg-[#F5C800] text-[#111111] border-2 border-[#111111] text-xs font-black uppercase tracking-wider hover:bg-[#111111] hover:text-[#F5C800] transition flex items-center justify-center gap-1.5"
            >
              <span>Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleSignOut}
              className="px-3 py-2.5 bg-white dark:bg-[#0E1013] text-[#111111] dark:text-[#FFFFFF] border-2 border-[#111111] dark:border-[#FFFFFF] text-xs font-black uppercase hover:bg-[#E63329] hover:text-white transition flex items-center gap-1"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Google GIS Sign-In Container */}
      <div className="mt-8 flex flex-col items-center justify-center min-h-[48px] space-y-3">
        <div ref={googleBtnRef} className="flex justify-center" />

        {/* Fallback Google prompt button if iframe is blank or loading */}
        {!gisLoaded && (
          <div className="text-xs font-mono font-bold text-[#888888] flex items-center gap-2">
            <div className="w-3.5 h-3.5 border-2 border-[#111111] dark:border-[#FFFFFF] border-t-[#E63329] animate-spin rounded-none" />
            INITIALIZING GOOGLE GIS...
          </div>
        )}

        <button
          type="button"
          onClick={handleManualGooglePrompt}
          className="text-[10px] font-mono font-black uppercase tracking-wider text-[#1A3A6B] dark:text-[#F5C800] hover:underline"
        >
          [ Retry Google Sign-In Prompt ]
        </button>
      </div>

      {/* Alternative Dev / Direct Email Login for Testing */}
      <div className="mt-8 pt-6 border-t-2 border-[#111111] dark:border-[#FFFFFF]">
        <div className="flex items-center gap-2 justify-center text-[10px] font-mono font-black text-[#888888] uppercase tracking-widest mb-3">
          <span>// QUICK OPERATOR OVERRIDE //</span>
        </div>

        <form onSubmit={handleDevLogin} className="space-y-3">
          <div className="space-y-1 text-left">
            <input
              type="email"
              value={devEmail}
              onChange={(e) => setDevEmail(e.target.value)}
              placeholder="mpg066@gmail.com"
              className="w-full px-3.5 py-2.5 rounded-none border-2 border-[#111111] dark:border-[#FFFFFF] text-xs font-mono font-bold focus:outline-none focus:border-[#E63329] bg-[#F7F5F0] dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF]"
            />
            <div className="flex justify-between items-center pt-0.5 text-[10px] font-mono text-[#888888]">
              <span>Owner: mpg066@gmail.com</span>
              <button
                type="button"
                onClick={() => setDevEmail('mpg066@gmail.com')}
                className="text-[#1A3A6B] dark:text-[#F5C800] font-black uppercase hover:underline"
              >
                Use Owner
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#F5C800] hover:bg-[#111111] hover:text-[#F5C800] text-[#111111] border-2 border-[#111111] dark:border-[#FFFFFF] font-black uppercase tracking-wider text-xs rounded-none transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-[#111111] border-t-transparent animate-spin rounded-none" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In with Email</span>
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-6 p-3 bg-[#F7F5F0] dark:bg-[#111111] rounded-none border-2 border-[#111111] dark:border-[#FFFFFF] text-[11px] font-mono text-[#888888] flex items-start gap-2.5 text-left">
        <ShieldCheck className="w-4 h-4 text-[#1A3A6B] dark:text-[#F5C800] flex-shrink-0 mt-0.5" />
        <span>
          Access policy enforced at Cloudflare edge worker. Only identities present in database roles can authenticate.
        </span>
      </div>
    </div>
  );
}
