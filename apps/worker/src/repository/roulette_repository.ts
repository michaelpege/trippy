/**
 * Roulette Repository
 *
 * Handles Roulette configurations (Trips / Places), Weighted Random Pick,
 * and records immutable audit executions.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { Roulette, RouletteItem, RouletteAuditLog, TripPlaceDetail } from '../types';

const DEFAULT_MODES: ('wheel' | 'cards')[] = ['wheel', 'cards'];

function parseRenderingModes(raw: any, description?: string): ('wheel' | 'cards')[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.filter((m: any) => m === 'wheel' || m === 'cards');
  }
  if (description) {
    const match = description.match(/<!--modes:([a-z,]+)-->/);
    if (match) {
      const parsed = match[1].split(',').filter((m: string) => m === 'wheel' || m === 'cards');
      if (parsed.length > 0) return parsed as ('wheel' | 'cards')[];
    }
  }
  return DEFAULT_MODES;
}

function embedRenderingModesInDescription(description: string = '', modes?: ('wheel' | 'cards')[]): string {
  const cleanDesc = description.replace(/<!--modes:[a-z,]+-->/g, '').trim();
  if (!modes || modes.length === 0) return cleanDesc;
  return cleanDesc ? `${cleanDesc}\n<!--modes:${modes.join(',')}-->` : `<!--modes:${modes.join(',')}-->`;
}

function cleanDescription(description?: string): string {
  if (!description) return '';
  return description.replace(/<!--modes:[a-z,]+-->/g, '').trim();
}

export class RouletteRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Enriches roulette items with place/trip descriptions, addresses, gmaps URLs,
   * and ordered trip places list for recipient display and place-level CTAs.
   */
  async enrichRouletteItems(items: RouletteItem[]): Promise<RouletteItem[]> {
    if (!items || items.length === 0) return [];

    const placeItemIds = items.filter((it) => it.type === 'places').map((it) => it.item_id);
    const tripItemIds = items.filter((it) => it.type === 'trips').map((it) => it.item_id);

    const placeDetailsMap = new Map<string, { description?: string; address?: string; gmaps_url?: string; type?: string }>();
    const tripDetailsMap = new Map<string, { description?: string; places: TripPlaceDetail[] }>();

    // 1. Fetch place details if any place items exist
    if (placeItemIds.length > 0) {
      try {
        const { data: places, error: placeError } = await this.supabase
          .from('trippy_places')
          .select('id, name, type, address, gmaps_url, description')
          .in('id', placeItemIds);

        if (!placeError && places) {
          for (const p of places) {
            placeDetailsMap.set(p.id, {
              description: p.description || '',
              address: p.address || '',
              gmaps_url: p.gmaps_url || '',
              type: p.type || '',
            });
          }
        }
      } catch (err) {
        console.warn('Enrich place items warning:', err);
      }
    }

    // 2. Fetch trip details and ordered trip places if any trip items exist
    if (tripItemIds.length > 0) {
      try {
        const { data: trips, error: tripsError } = await this.supabase
          .from('trippy_trips')
          .select('id, name, description')
          .in('id', tripItemIds);

        if (!tripsError && trips) {
          for (const t of trips) {
            tripDetailsMap.set(t.id, {
              description: t.description || '',
              places: [],
            });
          }
        }

        const { data: tripPlaces, error: tripPlacesError } = await this.supabase
          .from('trippy_trip_places')
          .select('id, trip_id, place_id, order_index, visit_time, notes, trippy_places(id, name, type, address, gmaps_url, description)')
          .in('trip_id', tripItemIds)
          .order('order_index', { ascending: true });

        if (!tripPlacesError && tripPlaces) {
          for (const tp of tripPlaces as any[]) {
            if (!tripDetailsMap.has(tp.trip_id)) {
              tripDetailsMap.set(tp.trip_id, { places: [] });
            }
            const p = Array.isArray(tp.trippy_places) ? tp.trippy_places[0] : tp.trippy_places;
            tripDetailsMap.get(tp.trip_id)!.places.push({
              id: tp.id,
              place_id: tp.place_id,
              name: p?.name || 'Destination Stop',
              type: p?.type,
              address: p?.address,
              gmaps_url: p?.gmaps_url,
              visit_time: tp.visit_time,
              notes: tp.notes,
              description: p?.description,
            });
          }
        }
      } catch (err) {
        console.warn('Enrich trip items warning:', err);
      }
    }

    // 3. Return enriched items
    return items.map((item) => {
      if (item.type === 'places') {
        const p = placeDetailsMap.get(item.item_id);
        return {
          ...item,
          description: item.description || p?.description,
          address: item.address || p?.address,
          gmaps_url: item.gmaps_url || p?.gmaps_url,
        };
      } else if (item.type === 'trips') {
        const t = tripDetailsMap.get(item.item_id);
        return {
          ...item,
          description: item.description || t?.description,
          trip_places: t?.places || [],
        };
      }
      return item;
    });
  }

  /**
   * List all roulette configurations
   */
  async listRoulettes(): Promise<Roulette[]> {
    const { data, error } = await this.supabase
      .from('trippy_roulettes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((r) => ({
      ...r,
      description: cleanDescription(r.description),
      items: Array.isArray(r.items) ? r.items : [],
      allowed_emails: Array.isArray(r.allowed_emails) ? r.allowed_emails : [],
      rendering_modes: parseRenderingModes(r.rendering_modes, r.description),
    })) as Roulette[];
  }

  /**
   * Get single roulette by ID (enriched with place/trip details)
   */
  async getRouletteById(id: string): Promise<Roulette | null> {
    const { data, error } = await this.supabase
      .from('trippy_roulettes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;

    const rawItems = Array.isArray(data.items) ? data.items : [];
    const enrichedItems = await this.enrichRouletteItems(rawItems);

    return {
      ...data,
      description: cleanDescription(data.description),
      items: enrichedItems,
      allowed_emails: Array.isArray(data.allowed_emails) ? data.allowed_emails : [],
      rendering_modes: parseRenderingModes(data.rendering_modes, data.description),
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
      rendering_modes?: ('wheel' | 'cards')[];
    },
    createdBy: string
  ): Promise<Roulette> {
    const rouletteId = `rou_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const modes = data.rendering_modes && data.rendering_modes.length > 0 ? data.rendering_modes : DEFAULT_MODES;
    const finalDescription = embedRenderingModesInDescription(data.description, modes);

    const { data: created, error } = await this.supabase
      .from('trippy_roulettes')
      .insert({
        id: rouletteId,
        title: data.title,
        description: finalDescription,
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
    return {
      ...created,
      description: cleanDescription(created.description),
      rendering_modes: parseRenderingModes(created.rendering_modes, created.description),
    } as Roulette;
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
      rendering_modes?: ('wheel' | 'cards')[];
      is_active?: boolean;
    }
  ): Promise<Roulette> {
    const existing = await this.getRouletteById(id);
    const updates: Record<string, unknown> = {};
    if (data.title !== undefined) updates.title = data.title;
    if (data.type !== undefined) updates.type = data.type;
    if (data.items !== undefined) updates.items = data.items;
    if (data.protection_type !== undefined) updates.protection_type = data.protection_type;
    if (data.allowed_emails !== undefined) {
      updates.allowed_emails = data.allowed_emails.map((e) => e.toLowerCase().trim());
    }
    if (data.access_token !== undefined) updates.access_token = data.access_token;
    if (data.is_active !== undefined) updates.is_active = data.is_active;

    if (data.description !== undefined || data.rendering_modes !== undefined) {
      const baseDesc = data.description !== undefined ? data.description : (existing?.description || '');
      const modes = data.rendering_modes !== undefined ? data.rendering_modes : (existing?.rendering_modes || DEFAULT_MODES);
      updates.description = embedRenderingModesInDescription(baseDesc, modes);
    }

    const { data: updated, error } = await this.supabase
      .from('trippy_roulettes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return {
      ...updated,
      description: cleanDescription(updated.description),
      rendering_modes: parseRenderingModes(updated.rendering_modes, updated.description),
    } as Roulette;
  }

  /**
   * Delete roulette
   */
  async deleteRoulette(id: string): Promise<boolean> {
    const { error } = await this.supabase.from('trippy_roulettes').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  /**
   * Insert immutable audit log entry
   */
  async insertAuditEntry(entry: {
    roulette_id: string;
    roulette_title: string;
    type: 'trips' | 'places';
    selected_item_id: string;
    selected_item_title: string;
    candidate_pool: RouletteItem[];
    executed_by_type: 'google' | 'token' | 'admin';
    executed_by_identifier: string;
    ip_address?: string;
    user_agent?: string;
  }): Promise<RouletteAuditLog> {
    const auditId = `aud_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const { data: audit, error: auditError } = await this.supabase
      .from('trippy_audit_logs')
      .insert({
        id: auditId,
        roulette_id: entry.roulette_id,
        roulette_title: entry.roulette_title,
        type: entry.type,
        selected_item_id: entry.selected_item_id,
        selected_item_title: entry.selected_item_title,
        candidate_pool: entry.candidate_pool || [],
        executed_by_type: entry.executed_by_type,
        executed_by_identifier: entry.executed_by_identifier,
        ip_address: entry.ip_address || '',
        user_agent: entry.user_agent || '',
      })
      .select()
      .single();

    if (auditError) {
      console.error('Failed to write immutable audit log:', auditError);
      throw new Error(`Failed to record audit log: ${auditError.message}`);
    }

    return audit as RouletteAuditLog;
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
    const auditLog = await this.insertAuditEntry({
      roulette_id: roulette.id,
      roulette_title: roulette.title,
      type: roulette.type,
      selected_item_id: selectedItem.item_id,
      selected_item_title: selectedItem.title,
      candidate_pool: items,
      executed_by_type: context.type,
      executed_by_identifier: context.identifier,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
    });

    return {
      selectedItem,
      auditLog,
    };
  }
}
