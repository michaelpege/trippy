/**
 * Audit Repository (Read-Only)
 *
 * Provides queries to inspect roulette execution audit records.
 * STRICT IMMUTABILITY: Update and delete operations are intentionally omitted
 * and are also blocked at the database level by PostgreSQL triggers.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { RouletteAuditLog } from '../types';

export class AuditRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * List audit logs with pagination and optional roulette filter
   */
  async listLogs(options?: {
    rouletteId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: RouletteAuditLog[]; total: number }> {
    const limit = Math.min(options?.limit || 50, 100);
    const offset = options?.offset || 0;

    let query = this.supabase
      .from('trippy_audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (options?.rouletteId) {
      query = query.eq('roulette_id', options.rouletteId);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      logs: (data || []).map((l) => ({
        ...l,
        candidate_pool: Array.isArray(l.candidate_pool) ? l.candidate_pool : [],
      })) as RouletteAuditLog[],
      total: count || 0,
    };
  }

  /**
   * Get specific audit log by ID
   */
  async getLogById(id: string): Promise<RouletteAuditLog | null> {
    const { data, error } = await this.supabase
      .from('trippy_audit_logs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;

    return {
      ...data,
      candidate_pool: Array.isArray(data.candidate_pool) ? data.candidate_pool : [],
    } as RouletteAuditLog;
  }
}
