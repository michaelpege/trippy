'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  getCurrentUser,
  getStoredToken,
  isTokenExpired,
  getTokenExpiresIn,
  saveSession,
  clearSession,
  type UserSession,
} from '@/lib/auth';
import { getCurrentUserProfile } from '@/lib/api';
import type { UserAccessProfile } from '@/types';

export interface AuthContextType {
  user: UserSession | null;
  profile: UserAccessProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isExpired: boolean;
  roles: string[];
  permissions: string[];
  isOwner: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  login: (credential: string) => Promise<UserAccessProfile | null>;
  logout: (options?: { reason?: string; redirect?: boolean }) => void;
  refreshProfile: () => Promise<UserAccessProfile | null>;
  checkTokenExpiry: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<UserSession | null>(null);
  const [profile, setProfile] = useState<UserAccessProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);

  const expiryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHandlingExpiryRef = useRef(false);

  const isPublicRoute = useCallback((path: string): boolean => {
    return (
      path === '/login' ||
      path.startsWith('/login/') ||
      path === '/setup' ||
      path.startsWith('/setup/') ||
      path === '/roulette/share' ||
      path.startsWith('/roulette/share/')
    );
  }, []);

  /**
   * Handle session expiration: clear local cache, set state, and redirect to /login
   */
  const handleSessionExpired = useCallback(
    (reason = 'token_expired') => {
      if (isHandlingExpiryRef.current) return;
      isHandlingExpiryRef.current = true;

      if (expiryTimerRef.current) {
        clearTimeout(expiryTimerRef.current);
        expiryTimerRef.current = null;
      }

      clearSession(reason);
      setUser(null);
      setProfile(null);
      setToken(null);
      setIsExpired(true);
      setIsLoading(false);

      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (!isPublicRoute(currentPath)) {
          router.replace(`/login?expired=1&from=${encodeURIComponent(currentPath)}`);
        }
      }

      setTimeout(() => {
        isHandlingExpiryRef.current = false;
      }, 500);
    },
    [router, isPublicRoute]
  );

  /**
   * Check if token is expired right now. Returns true if expired.
   */
  const checkTokenExpiry = useCallback((): boolean => {
    const currentToken = getStoredToken();
    if (!currentToken || isTokenExpired(currentToken)) {
      if (user || token) {
        handleSessionExpired('token_expired');
      }
      return true;
    }
    return false;
  }, [user, token, handleSessionExpired]);

  /**
   * Fetch latest user access profile and RBAC roles from backend
   */
  const refreshProfile = useCallback(async (): Promise<UserAccessProfile | null> => {
    const currentToken = getStoredToken();
    if (!currentToken || isTokenExpired(currentToken)) {
      handleSessionExpired('token_expired');
      return null;
    }

    try {
      const res = await getCurrentUserProfile();
      setProfile(res.user);
      return res.user;
    } catch (err: any) {
      if (err.status === 401) {
        handleSessionExpired('unauthorized');
      }
      return null;
    }
  }, [handleSessionExpired]);

  /**
   * Schedule exact timeout for token lifetime
   */
  const scheduleExpiryTimer = useCallback(
    (activeToken: string) => {
      if (expiryTimerRef.current) {
        clearTimeout(expiryTimerRef.current);
        expiryTimerRef.current = null;
      }

      const msUntilExpiry = getTokenExpiresIn(activeToken);

      if (msUntilExpiry <= 0) {
        handleSessionExpired('token_expired');
        return;
      }

      if (msUntilExpiry !== Infinity) {
        // Schedule exact timeout to fire when token expires
        expiryTimerRef.current = setTimeout(() => {
          handleSessionExpired('token_expired');
        }, msUntilExpiry);
      }
    },
    [handleSessionExpired]
  );

  /**
   * Initial session bootstrap on mount
   */
  useEffect(() => {
    async function initSession() {
      setIsLoading(true);
      const storedToken = getStoredToken();
      const currentUser = getCurrentUser();

      if (!storedToken || !currentUser || isTokenExpired(storedToken)) {
        setUser(null);
        setProfile(null);
        setToken(null);
        setIsLoading(false);
        return;
      }

      setUser(currentUser);
      setToken(storedToken);
      setIsExpired(false);
      scheduleExpiryTimer(storedToken);

      try {
        const res = await getCurrentUserProfile();
        setProfile(res.user);
      } catch (err: any) {
        if (err.status === 401) {
          handleSessionExpired('unauthorized');
        }
      } finally {
        setIsLoading(false);
      }
    }

    initSession();

    return () => {
      if (expiryTimerRef.current) {
        clearTimeout(expiryTimerRef.current);
      }
    };
  }, [scheduleExpiryTimer, handleSessionExpired]);

  /**
   * Periodic watchdog interval (every 20s) and Tab visibility/focus listeners
   */
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        const currentToken = getStoredToken();
        if (currentToken && isTokenExpired(currentToken)) {
          handleSessionExpired('token_expired');
        }
      }
    };

    const watchdogInterval = setInterval(() => {
      const currentToken = getStoredToken();
      if (currentToken && isTokenExpired(currentToken)) {
        handleSessionExpired('token_expired');
      }
    }, 20000);

    const handleAuthExpiredEvent = () => {
      handleSessionExpired('event_triggered');
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('auth-expired', handleAuthExpiredEvent);

    return () => {
      clearInterval(watchdogInterval);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('auth-expired', handleAuthExpiredEvent);
    };
  }, [handleSessionExpired]);

  /**
   * Login method
   */
  const login = useCallback(
    async (credential: string): Promise<UserAccessProfile | null> => {
      setIsLoading(true);
      setIsExpired(false);

      try {
        const session = saveSession(credential);
        setUser(session);
        setToken(credential);
        scheduleExpiryTimer(credential);

        const profileRes = await getCurrentUserProfile();
        setProfile(profileRes.user);
        setIsLoading(false);
        return profileRes.user;
      } catch (err) {
        clearSession();
        setUser(null);
        setProfile(null);
        setToken(null);
        setIsLoading(false);
        throw err;
      }
    },
    [scheduleExpiryTimer]
  );

  /**
   * Logout method
   */
  const logout = useCallback(
    (options?: { reason?: string; redirect?: boolean }) => {
      if (expiryTimerRef.current) {
        clearTimeout(expiryTimerRef.current);
        expiryTimerRef.current = null;
      }

      clearSession(options?.reason);
      setUser(null);
      setProfile(null);
      setToken(null);
      setIsExpired(false);

      if (options?.redirect !== false) {
        router.push('/login');
      }
    },
    [router]
  );

  const isAuthenticated = !!user && !!token && !isExpired;
  const roles = profile?.roles || [];
  const permissions = profile?.permissions || [];
  const isOwner = !!profile?.isOwner;

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (isOwner) return true;
      return permissions.includes(permission);
    },
    [isOwner, permissions]
  );

  const hasRole = useCallback(
    (role: string): boolean => {
      if (isOwner && role.toLowerCase() === 'owner') return true;
      return roles.some((r) => r.toLowerCase() === role.toLowerCase());
    },
    [isOwner, roles]
  );

  const value: AuthContextType = {
    user,
    profile,
    token,
    isAuthenticated,
    isLoading,
    isExpired,
    roles,
    permissions,
    isOwner,
    hasPermission,
    hasRole,
    login,
    logout,
    refreshProfile,
    checkTokenExpiry,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
