/**
 * Places Repository
 *
 * CRUD operations for places (Restaurant, Mall, Public spaces, other).
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { Place, PlaceType, PlaceFile } from '../types';

export class PlacesRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * List all places with optional type filtering and search
   */
  async listPlaces(options?: { type?: PlaceType; query?: string; limit?: number; offset?: number }): Promise<Place[]> {
    let query = this.supabase
      .from('places')
      .select('id, name, type, description, address, gmaps_url, latitude, longitude, files, created_by, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (options?.type) {
      query = query.eq('type', options.type);
    }

    if (options?.query) {
      query = query.ilike('name', `%${options.query}%`);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Place[];
  }

  /**
   * Get single place by ID
   */
  async getPlaceById(id: string): Promise<Place | null> {
    const { data, error } = await this.supabase
      .from('places')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return data as Place;
  }

  /**
   * Create place
   */
  async createPlace(
    data: {
      name: string;
      type: PlaceType;
      description?: string;
      address?: string;
      gmaps_url?: string;
      latitude?: number | null;
      longitude?: number | null;
      files?: PlaceFile[];
    },
    createdBy: string
  ): Promise<Place> {
    const placeId = `pl_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

    const { data: created, error } = await this.supabase
      .from('places')
      .insert({
        id: placeId,
        name: data.name,
        type: data.type,
        description: data.description || '',
        address: data.address || '',
        gmaps_url: data.gmaps_url || '',
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        files: data.files || [],
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) throw error;
    return created as Place;
  }

  /**
   * Update place
   */
  async updatePlace(
    id: string,
    data: {
      name?: string;
      type?: PlaceType;
      description?: string;
      address?: string;
      gmaps_url?: string;
      latitude?: number | null;
      longitude?: number | null;
      files?: PlaceFile[];
    }
  ): Promise<Place> {
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.type !== undefined) updates.type = data.type;
    if (data.description !== undefined) updates.description = data.description;
    if (data.address !== undefined) updates.address = data.address;
    if (data.gmaps_url !== undefined) updates.gmaps_url = data.gmaps_url;
    if (data.latitude !== undefined) updates.latitude = data.latitude;
    if (data.longitude !== undefined) updates.longitude = data.longitude;
    if (data.files !== undefined) updates.files = data.files;

    const { data: updated, error } = await this.supabase
      .from('places')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updated as Place;
  }

  /**
   * Delete place
   */
  async deletePlace(id: string): Promise<boolean> {
    const { error } = await this.supabase.from('places').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
}
