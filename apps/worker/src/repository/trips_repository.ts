/**
 * Trips Repository
 *
 * CRUD operations for trips and their associated places.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { Trip, TripPlaceItem } from '../types';

export class TripsRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * List all trips with associated place items
   */
  async listTrips(): Promise<Trip[]> {
    const { data: trips, error: tripsError } = await this.supabase
      .from('trips')
      .select('id, name, description, start_date, end_date, created_by, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (tripsError) throw tripsError;
    if (!trips || trips.length === 0) return [];

    // Fetch all trip_places joined with places details
    const tripIds = trips.map((t) => t.id);
    const { data: tripPlaces, error: placesError } = await this.supabase
      .from('trip_places')
      .select('id, trip_id, place_id, order_index, visit_time, notes, places(*)')
      .in('trip_id', tripIds)
      .order('order_index', { ascending: true });

    if (placesError) throw placesError;

    const placesByTrip = new Map<string, TripPlaceItem[]>();
    for (const tp of tripPlaces || []) {
      if (!placesByTrip.has(tp.trip_id)) {
        placesByTrip.set(tp.trip_id, []);
      }
      placesByTrip.get(tp.trip_id)!.push({
        id: tp.id,
        place_id: tp.place_id,
        order_index: tp.order_index,
        visit_time: tp.visit_time,
        notes: tp.notes,
        place: Array.isArray(tp.places) ? tp.places[0] : tp.places,
      });
    }

    return trips.map((t) => ({
      ...t,
      places: placesByTrip.get(t.id) || [],
    }));
  }

  /**
   * Get single trip with places by ID
   */
  async getTripById(id: string): Promise<Trip | null> {
    const { data: trip, error } = await this.supabase
      .from('trips')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !trip) return null;

    const { data: tripPlaces, error: placesError } = await this.supabase
      .from('trip_places')
      .select('id, trip_id, place_id, order_index, visit_time, notes, places(*)')
      .eq('trip_id', id)
      .order('order_index', { ascending: true });

    if (placesError) throw placesError;

    const places: TripPlaceItem[] = (tripPlaces || []).map((tp) => ({
      id: tp.id,
      place_id: tp.place_id,
      order_index: tp.order_index,
      visit_time: tp.visit_time,
      notes: tp.notes,
      place: Array.isArray(tp.places) ? tp.places[0] : tp.places,
    }));

    return {
      ...trip,
      places,
    };
  }

  /**
   * Create trip with optional places
   */
  async createTrip(
    data: {
      name: string;
      description?: string;
      start_date?: string | null;
      end_date?: string | null;
      places?: { place_id: string; order_index?: number; visit_time?: string; notes?: string }[];
    },
    createdBy: string
  ): Promise<Trip> {
    const tripId = `tr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

    const { data: trip, error } = await this.supabase
      .from('trips')
      .insert({
        id: tripId,
        name: data.name,
        description: data.description || '',
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) throw error;

    if (data.places && data.places.length > 0) {
      const rows = data.places.map((p, index) => ({
        id: `tp_${Date.now().toString(36)}_${index}_${Math.random().toString(36).substring(2, 5)}`,
        trip_id: tripId,
        place_id: p.place_id,
        order_index: p.order_index !== undefined ? p.order_index : index,
        visit_time: p.visit_time || '',
        notes: p.notes || '',
      }));

      const { error: insertError } = await this.supabase.from('trip_places').insert(rows);
      if (insertError) console.error('Error inserting trip places:', insertError);
    }

    return (await this.getTripById(tripId)) as Trip;
  }

  /**
   * Update trip
   */
  async updateTrip(
    id: string,
    data: {
      name?: string;
      description?: string;
      start_date?: string | null;
      end_date?: string | null;
      places?: { place_id: string; order_index?: number; visit_time?: string; notes?: string }[];
    }
  ): Promise<Trip> {
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.start_date !== undefined) updates.start_date = data.start_date;
    if (data.end_date !== undefined) updates.end_date = data.end_date;

    const { error } = await this.supabase.from('trips').update(updates).eq('id', id);
    if (error) throw error;

    if (data.places !== undefined) {
      // Re-sync trip_places
      await this.supabase.from('trip_places').delete().eq('trip_id', id);

      if (data.places.length > 0) {
        const rows = data.places.map((p, index) => ({
          id: `tp_${Date.now().toString(36)}_${index}_${Math.random().toString(36).substring(2, 5)}`,
          trip_id: id,
          place_id: p.place_id,
          order_index: p.order_index !== undefined ? p.order_index : index,
          visit_time: p.visit_time || '',
          notes: p.notes || '',
        }));

        await this.supabase.from('trip_places').insert(rows);
      }
    }

    return (await this.getTripById(id)) as Trip;
  }

  /**
   * Delete trip
   */
  async deleteTrip(id: string): Promise<boolean> {
    const { error } = await this.supabase.from('trips').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
}
