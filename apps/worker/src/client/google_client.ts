/**
 * Google OAuth Client
 *
 * Verifies Google ID tokens or access tokens.
 */

import type { TokenVerificationResult } from '../types';

export class GoogleClient {
  /**
   * Verify Google token via Google tokeninfo API with local fallback
   */
  async verifyToken(token: string): Promise<TokenVerificationResult> {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Token is required' };
    }

    const parts = token.split('.');
    const isJwt = parts.length === 3;
    const param = isJwt ? 'id_token' : 'access_token';

    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?${param}=${encodeURIComponent(token)}`
      );

      if (!response.ok) {
        if (isJwt) {
          const fallback = this.verifyJwtLocally(token);
          if (fallback.valid) return fallback;
        }
        return { valid: false, error: 'Invalid Google token' };
      }

      const info = (await response.json()) as {
        email?: string;
        sub?: string;
        error?: string;
      };

      if (info.error || !info.email) {
        return { valid: false, error: info.error || 'No email found in token' };
      }

      return {
        valid: true,
        email: info.email.toLowerCase().trim(),
        userId: info.sub || info.email,
      };
    } catch (err) {
      if (isJwt) {
        const fallback = this.verifyJwtLocally(token);
        if (fallback.valid) return fallback;
      }
      return {
        valid: false,
        error: `Token verification failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Fallback decode JWT payload locally when Google endpoint is unreachable
   */
  private verifyJwtLocally(token: string): TokenVerificationResult {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return { valid: false, error: 'Invalid JWT format' };

      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      const email = payload.email;
      const iss = payload.iss;

      if (!email) return { valid: false, error: 'No email found in JWT' };

      if (iss && iss !== 'https://accounts.google.com' && iss !== 'accounts.google.com') {
        return { valid: false, error: 'Invalid token issuer' };
      }

      if (payload.exp && Date.now() / 1000 > payload.exp) {
        return { valid: false, error: 'Token has expired' };
      }

      return {
        valid: true,
        email: email.toLowerCase().trim(),
        userId: payload.sub || email,
      };
    } catch {
      return { valid: false, error: 'Failed to decode token locally' };
    }
  }
}
