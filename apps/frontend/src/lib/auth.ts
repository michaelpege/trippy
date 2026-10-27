/**
 * Authentication Helper (Google Identity Services GIS)
 */

const TOKEN_KEY = 'trippy_google_token';
const USER_KEY = 'trippy_google_user';

export interface UserSession {
  email: string;
  name?: string;
  picture?: string;
  token: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'small' | 'medium' | 'large';
              width?: number;
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              text?: 'signin_with' | 'signup_with' | 'continue_with';
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export interface JwtPayload {
  email?: string;
  name?: string;
  picture?: string;
  exp?: number;
  iat?: number;
  sub?: string;
  iss?: string;
}

/**
 * Decode JWT token payload with Unicode support
 */
export function decodeJwt(token: string): JwtPayload {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return {};
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return {};
      return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    } catch {
      return {};
    }
  }
}

/**
 * Check if token is expired based on JWT 'exp' claim.
 * Incorporates a 15-second safety skew to prevent sending requests with tokens expiring in-flight.
 */
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  const payload = decodeJwt(token);
  if (!payload.exp) {
    // If no exp claim is present, cannot determine expiration locally
    return false;
  }
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return nowInSeconds >= (payload.exp - 15);
}

/**
 * Returns remaining lifetime of token in milliseconds.
 * Returns 0 if already expired or invalid.
 */
export function getTokenExpiresIn(token: string | null): number {
  if (!token) return 0;
  const payload = decodeJwt(token);
  if (!payload.exp) return Infinity;
  const remainingMs = payload.exp * 1000 - Date.now();
  return Math.max(0, remainingMs);
}

/**
 * Get stored token, automatically clearing and returning null if expired
 */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  if (isTokenExpired(token)) {
    clearSession('token_expired');
    return null;
  }

  return token;
}

/**
 * Get current authenticated user session, verifying that token is active and not expired
 */
export function getCurrentUser(): UserSession | null {
  if (typeof window === 'undefined') return null;
  const token = getStoredToken();
  if (!token) return null;

  try {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.email && !isTokenExpired(token)) {
        return { ...parsed, token };
      }
    }

    const payload = decodeJwt(token);
    if (payload.email && !isTokenExpired(token)) {
      return {
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        picture: payload.picture,
        token,
      };
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Save authenticated session
 */
export function saveSession(token: string, email?: string, name?: string, picture?: string): UserSession {
  const payload = decodeJwt(token);
  const user: UserSession = {
    email: email || payload.email || '',
    name: name || payload.name || (email || payload.email || '').split('@')[0],
    picture: picture || payload.picture,
    token,
  };

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));

  // Notify listeners
  window.dispatchEvent(new Event('auth-state-changed'));
  return user;
}

/**
 * Clear session and logout
 */
export function clearSession(reason?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);

  window.dispatchEvent(new Event('auth-state-changed'));
  if (reason) {
    window.dispatchEvent(new CustomEvent('auth-expired', { detail: { reason } }));
  }
}

export function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();
    if (window.google?.accounts?.id) return resolve();

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.google?.accounts?.id) {
        clearInterval(interval);
        resolve();
      } else if (attempts >= 40) {
        // 2 seconds elapsed
        clearInterval(interval);
        resolve();
      }
    }, 50);

    const existing =
      (document.getElementById('google-client-script') as HTMLScriptElement | null) ||
      (document.querySelector('script[src*="accounts.google.com/gsi/client"]') as HTMLScriptElement | null);

    if (existing) {
      if ((existing as any).readyState === 'loaded' || (existing as any).readyState === 'complete') {
        // Already loaded, interval will catch window.google.accounts.id
        return;
      }
      existing.addEventListener('load', () => {
        // Give small tick for global object assignment
        setTimeout(() => {
          clearInterval(interval);
          resolve();
        }, 50);
      });
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-client-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setTimeout(() => {
        clearInterval(interval);
        resolve();
      }, 50);
    };
    script.onerror = (err) => {
      clearInterval(interval);
      reject(err);
    };
    document.head.appendChild(script);
  });
}
