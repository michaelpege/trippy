'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

/**
 * Routes that do not require authentication:
 * - /login: Authentication landing page
 * - /setup: Genesis bootstrap setup (when database is empty)
 * - /roulette/share: Shared roulette link (protected by its own popup / password)
 */
const PUBLIC_PREFIXES = ['/login', '/setup', '/roulette/share', '/peek-a-boo/share'];

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, isExpired, checkTokenExpiry } = useAuth();

  // In production (Cloudflare deployment or NODE_ENV=production), protect all routes.
  // In development (NODE_ENV!=production), allow unauthenticated access.
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.NEXT_PUBLIC_NODE_ENV === 'production';

  const isPublicRoute = PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}?`)
  );

  useEffect(() => {
    // If not production or public route, allow immediately
    if (!isProduction || isPublicRoute) {
      return;
    }

    // Actively check token expiration
    if (checkTokenExpiry()) {
      router.replace(`/login?expired=1&from=${encodeURIComponent(pathname)}`);
      return;
    }

    // If loading finished and user is not authenticated or expired, redirect to login
    if (!isLoading && (!isAuthenticated || isExpired)) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}${isExpired ? '&expired=1' : ''}`);
    }
  }, [pathname, isProduction, isPublicRoute, isLoading, isAuthenticated, isExpired, checkTokenExpiry, router]);

  // If not production or public route, render immediately without delay
  if (!isProduction || isPublicRoute) {
    return <>{children}</>;
  }

  // If loading or unauthorized in production, display security checking state while redirecting
  if (isLoading) {
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

  if (!isAuthenticated || isExpired) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-[#111111] dark:border-white border-t-[#E63329] animate-spin rounded-none" />
          <p className="text-xs font-mono font-black uppercase tracking-widest text-[#888888]">
            [SESSION EXPIRED // REDIRECTING TO LOGIN...]
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
