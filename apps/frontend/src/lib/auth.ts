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

/**
 * Decode JWT token payload
 */
export function decodeJwt(token: string): { email?: string; name?: string; picture?: string; exp?: number } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return {};
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  } catch {
    return {};
  }
}

/**
 * Get stored token
 */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

/**
 * Get current authenticated user session
 */
export function getCurrentUser(): UserSession | null {
  if (typeof window === 'undefined') return null;
  const token = getStoredToken();
  if (!token) return null;

  try {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...parsed, token };
    }

    const payload = decodeJwt(token);
    if (payload.email) {
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
export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);

  window.dispatchEvent(new Event('auth-state-changed'));
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
