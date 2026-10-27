'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Compass, ShieldCheck, AlertCircle, ArrowRight, LogOut, CheckCircle2 } from 'lucide-react';
import { loadGoogleScript } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/common/Toast';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  const { user, isAuthenticated, isLoading: authLoading, login, logout } = useAuth();

  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);

  const isExpiredNotice = searchParams.get('expired') === '1';
  const returnPath = searchParams.get('from') || '/places';

  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    '500705610156-2j6108eea4i6242mtf5reb0uoj6jrvqq.apps.googleusercontent.com';

  useEffect(() => {
    // Initialize Google GIS script
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

            // Prompt One Tap only if not already authenticated
            if (!isAuthenticated) {
              window.google.accounts.id.prompt();
            }
          } catch (e) {
            console.warn('Google GIS render error:', e);
          }
        }
      })
      .catch((err) => {
        console.warn('GIS script failed to load:', err);
      });
  }, [clientId, isAuthenticated]);

  const handleGoogleCredentialResponse = async (response: { credential: string }) => {
    setSubmitting(true);
    setAuthError(null);
    try {
      const profile = await login(response.credential);
      toast.success(`Welcome back, ${profile?.email || 'Operator'}!`);
      router.push(returnPath);
    } catch (err: any) {
      const msg = err.message || 'Access denied: Your Google account is not registered in RBAC.';
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = () => {
    logout({ redirect: false });
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

      {/* Session Expired Notice */}
      {isExpiredNotice && (
        <div className="mt-5 p-3.5 bg-[#E63329] text-white border-2 border-[#111111] dark:border-white text-xs font-mono font-bold text-left flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            Your previous session has expired. Please sign in again with your Google account.
          </span>
        </div>
      )}

      {/* Error Notice */}
      {authError && (
        <div className="mt-5 p-3.5 bg-[#E63329]/10 border-2 border-[#E63329] text-[#E63329] text-xs font-mono text-left flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="font-bold leading-relaxed">{authError}</span>
        </div>
      )}

      {/* Existing Active Session Notice */}
      {isAuthenticated && user && !authLoading && (
        <div className="mt-6 p-4 bg-[#F7F5F0] dark:bg-[#111111] border-2 border-[#111111] dark:border-[#FFFFFF] text-left space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-[#111111] dark:text-[#FFFFFF]">
            <CheckCircle2 className="w-4 h-4 text-[#F5C800]" />
            <span>Currently Signed In</span>
          </div>
          <div className="font-mono text-xs text-[#888888]">
            Operator: <strong className="text-[#111111] dark:text-[#FFFFFF]">{user.email}</strong>
          </div>
          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={() => router.push(returnPath)}
              className="flex-1 py-2.5 bg-[#F5C800] text-[#111111] border-2 border-[#111111] text-xs font-black uppercase tracking-wider hover:bg-[#111111] hover:text-[#F5C800] transition flex items-center justify-center gap-1.5"
            >
              <span>Continue to {returnPath === '/places' ? 'Dashboard' : 'Requested Page'}</span>
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

        {submitting && (
          <div className="text-xs font-mono font-bold text-[#1A3A6B] dark:text-[#F5C800] flex items-center gap-2">
            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent animate-spin rounded-none" />
            VERIFYING GOOGLE CREDENTIALS & RBAC...
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

      <div className="mt-8 p-3.5 bg-[#F7F5F0] dark:bg-[#111111] rounded-none border-2 border-[#111111] dark:border-[#FFFFFF] text-[11px] font-mono text-[#888888] flex items-start gap-2.5 text-left">
        <ShieldCheck className="w-4 h-4 text-[#1A3A6B] dark:text-[#F5C800] flex-shrink-0 mt-0.5" />
        <span>
          Access policy enforced at Cloudflare edge worker. Only identities present in database roles can authenticate.
        </span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto my-12 p-8 text-center border-2 border-[#111111] dark:border-white">
          <div className="w-8 h-8 border-3 border-[#E63329] border-t-transparent animate-spin mx-auto mb-3" />
          <p className="font-mono text-xs uppercase tracking-widest text-[#888888]">
            Loading Authentication...
          </p>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
