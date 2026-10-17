'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

/**
 * Routes that do not require authentication:
 * - /login: Authentication landing page
 * - /setup: Genesis bootstrap setup (when database is empty)
 * - /roulette/share: Shared roulette link (protected by its own popup / password)
 */
const PUBLIC_PREFIXES = ['/login', '/setup', '/roulette/share'];

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  // In production (Cloudflare deployment or NODE_ENV=production), protect all routes.
  // In development (NODE_ENV!=production), allow unauthenticated access.
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.NEXT_PUBLIC_NODE_ENV === 'production';

  const isPublicRoute = PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}?`)
  );

  useEffect(() => {
    function verifyAccess() {
      // If not production, bypass authentication requirement
      if (!isProduction) {
        setAuthorized(true);
        return;
      }

      // Public routes are always permitted
      if (isPublicRoute) {
        setAuthorized(true);
        return;
      }

      // In production on a protected route: verify active user session
      const user = getCurrentUser();
      if (!user) {
        setAuthorized(false);
        router.replace('/login');
      } else {
        setAuthorized(true);
      }
    }

    verifyAccess();
    window.addEventListener('auth-state-changed', verifyAccess);
    return () => window.removeEventListener('auth-state-changed', verifyAccess);
  }, [pathname, isProduction, isPublicRoute, router]);

  // If not production or public route, render immediately without delay
  if (!isProduction || isPublicRoute) {
    return <>{children}</>;
  }

  // If unauthorized in production, display security checking state while redirecting
  if (!authorized) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-[#111111] dark:border-white border-t-[#E63329] animate-spin rounded-none" />
          <p className="text-xs font-mono font-black uppercase tracking-widest text-[#888888]">
            [AUTHENTICATING ACCESS // RESTRICTED ROUTE...]
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
