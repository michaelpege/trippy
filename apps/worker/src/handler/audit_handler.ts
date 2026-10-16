/**
 * Audit Handler (Immutable)
 *
 * Provides inspection endpoints for the permanent execution audit logs.
 * STRICT IMMUTABILITY: Delete and update operations are strictly forbidden.
 */

import { getSupabaseClient } from '../client/supabase_client';
import { AuditRepository } from '../repository/audit_repository';
import { jsonResponse, errorResponse } from '../middleware/cors';
import type { Env, CorsConfig } from '../types';

export class AuditHandler {
  /**
   * GET /api/audit - List audit logs
   */
  async listLogs(request: Request, env: Env, corsConfig: CorsConfig): Promise<Response> {
    try {
      const url = new URL(request.url);
      const rouletteId = url.searchParams.get('roulette_id') || undefined;
      const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : 50;
      const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!, 10) : 0;

      const supabase = getSupabaseClient(env);
      const repo = new AuditRepository(supabase);
      const result = await repo.listLogs({ rouletteId, limit, offset });

      return jsonResponse(result, 200, corsConfig);
    } catch (err) {
      console.error('Failed to list audit logs:', err);
      return errorResponse('Failed to fetch audit trail', 500, corsConfig);
    }
  }

  /**
   * GET /api/audit/:id - Get specific audit log
   */
  async getLog(request: Request, env: Env, corsConfig: CorsConfig, id: string): Promise<Response> {
    try {
      const supabase = getSupabaseClient(env);
      const repo = new AuditRepository(supabase);
      const log = await repo.getLogById(id);

      if (!log) {
        return errorResponse('Audit log not found', 404, corsConfig);
      }

      return jsonResponse({ log }, 200, corsConfig);
    } catch (err) {
      console.error('Failed to get audit log:', err);
      return errorResponse('Failed to fetch audit log', 500, corsConfig);
    }
  }

  /**
   * Strict rejection of any delete attempt on audit logs
   */
  rejectMutation(corsConfig: CorsConfig): Response {
    return errorResponse(
      'Audit logs are immutable and cannot be deleted or modified.',
      405,
      corsConfig
    );
  }
}
