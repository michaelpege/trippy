/**
 * Supabase Client for Cloudflare Worker
 *
 * Utilizes connection caching to minimize overhead on Cloudflare Workers edge.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../types';

let cachedClient: SupabaseClient | null = null;
let cachedUrl: string | null = null;
let cachedKey: string | null = null;

export function getSupabaseClient(env: Env): SupabaseClient {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase configuration missing: SUPABASE_URL and SUPABASE_SECRET_KEY (or SERVICE_ROLE_KEY) required');
  }

  if (cachedClient && cachedUrl === url && cachedKey === key) {
    return cachedClient;
  }

  cachedClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  cachedUrl = url;
  cachedKey = key;

  return cachedClient;
}

export function resetSupabaseClient(): void {
  cachedClient = null;
  cachedUrl = null;
  cachedKey = null;
}
