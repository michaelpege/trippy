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

      {/* Google GIS Container */}
      <div className="mt-8 flex flex-col items-center justify-center min-h-[48px]">
        <div ref={googleBtnRef} />
        {!gisLoaded && (
          <div className="text-xs font-mono font-bold text-[#888888] flex items-center gap-2">
            <div className="w-3.5 h-3.5 border-2 border-[#111111] dark:border-[#FFFFFF] border-t-[#E63329] animate-spin rounded-none" />
            INITIALIZING GOOGLE GIS...
          </div>
        )}
      </div>

      {/* Alternative Dev / Direct Email Login for Testing */}
      <div className="mt-8 pt-6 border-t-2 border-[#111111] dark:border-[#FFFFFF]">
        <div className="flex items-center gap-2 justify-center text-[10px] font-mono font-black text-[#888888] uppercase tracking-widest mb-3">
          <span>// QUICK OPERATOR OVERRIDE //</span>
        </div>

        <form onSubmit={handleDevLogin} className="space-y-3">
          <input
            type="email"
            value={devEmail}
            onChange={(e) => setDevEmail(e.target.value)}
            placeholder="REGISTERED-OPERATOR@GMAIL.COM"
            className="w-full px-3.5 py-2.5 rounded-none border-2 border-[#111111] dark:border-[#FFFFFF] text-xs font-mono font-bold focus:outline-none focus:border-[#E63329] bg-[#F7F5F0] dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] uppercase"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#F5C800] hover:bg-[#111111] hover:text-[#F5C800] text-[#111111] border-2 border-[#111111] dark:border-[#FFFFFF] font-black uppercase tracking-wider text-xs rounded-none transition flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In with Email</span>
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
