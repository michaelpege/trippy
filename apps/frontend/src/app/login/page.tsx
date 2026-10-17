'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Compass, ShieldCheck, LogIn, AlertCircle } from 'lucide-react';
import { saveSession, loadGoogleScript, getCurrentUser } from '@/lib/auth';
import { getCurrentUserProfile } from '@/lib/api';
import { useToast } from '@/components/common/Toast';

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  const [devEmail, setDevEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);

  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    '500705610156-2j6108eea4i6242mtf5reb0uoj6jrvqq.apps.googleusercontent.com';

  useEffect(() => {
    // If already logged in
    const existing = getCurrentUser();
    if (existing) {
      router.push('/places');
      return;
    }

    loadGoogleScript()
      .then(() => {
        setGisLoaded(true);
        if (window.google?.accounts?.id && googleBtnRef.current) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCredentialResponse,
          });

          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            width: 320,
            text: 'signin_with',
            shape: 'pill',
          });
        }
      })
      .catch((err) => {
        console.warn('GIS script failed to load:', err);
      });
  }, [clientId, router]);

  const handleGoogleCredentialResponse = async (response: { credential: string }) => {
    setLoading(true);
    try {
      saveSession(response.credential);
      // Verify RBAC access
      const meRes = await getCurrentUserProfile();
      toast.success(`Welcome back, ${meRes.user.email}!`);
      router.push('/places');
    } catch (err: any) {
      toast.error(err.message || 'Access denied: You are not authorized as an admin.');
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devEmail.trim() || !devEmail.includes('@')) {
      toast.error('Enter a valid email.');
      return;
    }

    setLoading(true);
    try {
      // Craft a development mock JWT token with email
      const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
      const payload = btoa(
        JSON.stringify({
          email: devEmail.trim().toLowerCase(),
          name: devEmail.split('@')[0],
          iss: 'accounts.google.com',
          exp: Math.floor(Date.now() / 1000) + 86400 * 7,
        })
      );
      const mockToken = `${header}.${payload}.signature`;

      saveSession(mockToken, devEmail.trim().toLowerCase(), devEmail.split('@')[0]);

      const me = await getCurrentUserProfile();
      toast.success(`Logged in as ${me.user.email} (${me.user.roles.join(', ')})`);
      router.push('/places');
    } catch (err: any) {
      toast.error(err.message || 'Sign in failed. Are you listed in roles or registered as owner?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white mx-auto mb-4 shadow-md shadow-emerald-500/20">
        <Compass className="w-7 h-7" />
      </div>

      <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Admin Sign In</h1>
      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
        Restricted to registered owner and authorized team members with database RBAC roles.
      </p>

      {/* Google GIS Container */}
      <div className="mt-8 flex flex-col items-center justify-center min-h-[48px]">
        <div ref={googleBtnRef} />
        {!gisLoaded && (
          <div className="text-xs text-slate-400 dark:text-slate-500 animate-pulse flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            Loading Google Sign-In...
          </div>
        )}
      </div>

      {/* Alternative Dev / Direct Email Login for Testing */}
      <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 justify-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
          <span>Or Quick Dev Access</span>
        </div>

        <form onSubmit={handleDevLogin} className="space-y-3">
          <input
            type="email"
            value={devEmail}
            onChange={(e) => setDevEmail(e.target.value)}
            placeholder="registered-admin@gmail.com"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In with Email</span>
          </button>
        </form>
      </div>

      <div className="mt-6 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2 text-left">
        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
        <span>
          Access is enforced at the edge worker. Only accounts registered in the database can query
          or mutate data.
        </span>
      </div>
    </div>
  );
}
