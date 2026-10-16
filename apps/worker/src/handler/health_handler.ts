/**
 * Health Handler
 */

import { getSupabaseClient } from '../client/supabase_client';
import { jsonResponse } from '../middleware/cors';
import type { Env, CorsConfig } from '../types';

export class HealthHandler {
  async check(request: Request, env: Env, corsConfig: CorsConfig): Promise<Response> {
    let supabaseStatus = 'disconnected';
    let errorMessage: string | null = null;

    try {
      if (env.SUPABASE_URL && (env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY)) {
        const supabase = getSupabaseClient(env);
        const { error } = await supabase.from('system_settings').select('key').limit(1);
        supabaseStatus = error ? `error: ${error.message}` : 'connected';
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
      supabaseStatus = 'error';
    }

    return jsonResponse(
      {
        status: 'ok',
        service: 'trippy-worker',
        timestamp: new Date().toISOString(),
        supabase: supabaseStatus,
        error: errorMessage,
      },
      200,
      corsConfig
    );
  }
}
