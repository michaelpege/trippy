/**
 * Roulette Repository
 *
 * Handles Roulette configurations (Trips / Places), Weighted Random Pick,
 * and records immutable audit executions.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { Roulette, RouletteItem, RouletteAuditLog } from '../types';

export class RouletteRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * List all roulette configurations
   */
  async listRoulettes(): Promise<Roulette[]> {
    const { data, error } = await this.supabase
      .from('roulettes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((r) => ({
      ...r,
      items: Array.isArray(r.items) ? r.items : [],
      allowed_emails: Array.isArray(r.allowed_emails) ? r.allowed_emails : [],
    })) as Roulette[];
  }

  /**
   * Get single roulette by ID
   */
  async getRouletteById(id: string): Promise<Roulette | null> {
    const { data, error } = await this.supabase
      .from('roulettes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return {
      ...data,
      items: Array.isArray(data.items) ? data.items : [],
      allowed_emails: Array.isArray(data.allowed_emails) ? data.allowed_emails : [],
    } as Roulette;
  }

  /**
   * Create roulette configuration
   */
  async createRoulette(
    data: {
      title: string;
      description?: string;
      type: 'trips' | 'places';
      items: RouletteItem[];
      protection_type: 'google' | 'token';
      allowed_emails?: string[];
      access_token?: string;
    },
    createdBy: string
  ): Promise<Roulette> {
    const rouletteId = `rou_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

    const { data: created, error } = await this.supabase
      .from('roulettes')
      .insert({
        id: rouletteId,
        title: data.title,
        description: data.description || '',
        type: data.type,
        items: data.items || [],
        protection_type: data.protection_type,
        allowed_emails: (data.allowed_emails || []).map((e) => e.toLowerCase().trim()),
        access_token: data.access_token || '',
        is_active: true,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) throw error;
    return created as Roulette;
  }

  /**
   * Update roulette configuration
   */
  async updateRoulette(
    id: string,
    data: {
      title?: string;
      description?: string;
      type?: 'trips' | 'places';
      items?: RouletteItem[];
      protection_type?: 'google' | 'token';
      allowed_emails?: string[];
      access_token?: string;
      is_active?: boolean;
    }
  ): Promise<Roulette> {
    const updates: Record<string, unknown> = {};
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.type !== undefined) updates.type = data.type;
    if (data.items !== undefined) updates.items = data.items;
    if (data.protection_type !== undefined) updates.protection_type = data.protection_type;
    if (data.allowed_emails !== undefined) {
      updates.allowed_emails = data.allowed_emails.map((e) => e.toLowerCase().trim());
    }
    if (data.access_token !== undefined) updates.access_token = data.access_token;
    if (data.is_active !== undefined) updates.is_active = data.is_active;

    const { data: updated, error } = await this.supabase
      .from('roulettes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updated as Roulette;
  }

  /**
   * Delete roulette
   */
  async deleteRoulette(id: string): Promise<boolean> {
    const { error } = await this.supabase.from('roulettes').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  /**
   * Execute weighted random selection and record result to immutable audit logs
   */
  async executeSpin(
    id: string,
    context: {
      type: 'google' | 'token' | 'admin';
      identifier: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<{
    selectedItem: RouletteItem;
    auditLog: RouletteAuditLog;
  }> {
    const roulette = await this.getRouletteById(id);
    if (!roulette) {
      throw new Error('Roulette not found');
    }

    if (!roulette.is_active) {
      throw new Error('This roulette is currently inactive');
    }

    if (!roulette.items || roulette.items.length === 0) {
      throw new Error('No items configured in this roulette');
    }

    // Weighted random selection
    const items = roulette.items;
    const totalWeight = items.reduce((sum, item) => sum + (Math.max(1, Number(item.weight) || 1)), 0);

    let randomVal = Math.random() * totalWeight;
    let selectedItem: RouletteItem = items[0];

    for (const item of items) {
      const w = Math.max(1, Number(item.weight) || 1);
      if (randomVal < w) {
        selectedItem = item;
        break;
      }
      randomVal -= w;
    }

    // Record to immutable audit table
    const auditId = `aud_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const { data: audit, error: auditError } = await this.supabase
      .from('roulette_audit_logs')
      .insert({
        id: auditId,
        roulette_id: roulette.id,
        roulette_title: roulette.title,
        type: roulette.type,
        selected_item_id: selectedItem.item_id,
        selected_item_title: selectedItem.title,
        candidate_pool: items,
        executed_by_type: context.type,
        executed_by_identifier: context.identifier,
        ip_address: context.ipAddress || '',
        user_agent: context.userAgent || '',
      })
      .select()
      .single();

    if (auditError) {
      console.error('Failed to write immutable audit log:', auditError);
      throw new Error(`Failed to record roulette execution audit log: ${auditError.message}`);
    }

    return {
      selectedItem,
      auditLog: audit as RouletteAuditLog,
    };
  }
}
