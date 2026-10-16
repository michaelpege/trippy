/**
 * Trips Handler
 *
 * REST API for trips CRUD operations with places association.
 */

import { getSupabaseClient } from '../client/supabase_client';
import { TripsRepository } from '../repository/trips_repository';
import { jsonResponse, errorResponse } from '../middleware/cors';
import type { Env, CorsConfig, AuthUser } from '../types';

export class TripsHandler {
  /**
   * GET /api/trips
   */
  async listTrips(request: Request, env: Env, corsConfig: CorsConfig): Promise<Response> {
    try {
      const supabase = getSupabaseClient(env);
      const repo = new TripsRepository(supabase);
      const trips = await repo.listTrips();

      return jsonResponse({ trips }, 200, corsConfig);
    } catch (err) {
      console.error('Failed to list trips:', err);
      return errorResponse('Failed to fetch trips', 500, corsConfig);
    }
  }

  /**
   * GET /api/trips/:id
   */
  async getTrip(request: Request, env: Env, corsConfig: CorsConfig, id: string): Promise<Response> {
    try {
      const supabase = getSupabaseClient(env);
      const repo = new TripsRepository(supabase);
      const trip = await repo.getTripById(id);

      if (!trip) {
        return errorResponse('Trip not found', 404, corsConfig);
      }

      return jsonResponse({ trip }, 200, corsConfig);
    } catch (err) {
      console.error('Failed to get trip:', err);
      return errorResponse('Failed to fetch trip details', 500, corsConfig);
    }
  }

  /**
   * POST /api/trips
   */
  async createTrip(request: Request, env: Env, corsConfig: CorsConfig, user: AuthUser): Promise<Response> {
    try {
      const body = (await request.json().catch(() => null)) as {
        name?: string;
        description?: string;
        start_date?: string | null;
        end_date?: string | null;
        places?: { place_id: string; order_index?: number; visit_time?: string; notes?: string }[];
      };

      if (!body || !body.name) {
        return errorResponse('Missing required field: "name"', 400, corsConfig);
      }

      const supabase = getSupabaseClient(env);
      const repo = new TripsRepository(supabase);
      const trip = await repo.createTrip(
        {
          name: body.name.trim(),
          description: body.description || '',
          start_date: body.start_date || null,
          end_date: body.end_date || null,
          places: body.places || [],
        },
        user.email
      );

      return jsonResponse({ trip, message: 'Trip created successfully' }, 201, corsConfig);
    } catch (err) {
      console.error('Failed to create trip:', err);
      return errorResponse(err instanceof Error ? err.message : 'Failed to create trip', 500, corsConfig);
    }
  }

  /**
   * PUT /api/trips/:id
   */
  async updateTrip(request: Request, env: Env, corsConfig: CorsConfig, id: string): Promise<Response> {
    try {
      const body = (await request.json().catch(() => null)) as {
        name?: string;
        description?: string;
        start_date?: string | null;
        end_date?: string | null;
        places?: { place_id: string; order_index?: number; visit_time?: string; notes?: string }[];
      };

      if (!body) {
        return errorResponse('Invalid request body', 400, corsConfig);
      }

      const supabase = getSupabaseClient(env);
      const repo = new TripsRepository(supabase);
      const updated = await repo.updateTrip(id, {
        name: body.name?.trim(),
        description: body.description,
        start_date: body.start_date,
        end_date: body.end_date,
        places: body.places,
      });

      return jsonResponse({ trip: updated, message: 'Trip updated successfully' }, 200, corsConfig);
    } catch (err) {
      console.error('Failed to update trip:', err);
      return errorResponse(err instanceof Error ? err.message : 'Failed to update trip', 500, corsConfig);
    }
  }

  /**
   * DELETE /api/trips/:id
   */
  async deleteTrip(request: Request, env: Env, corsConfig: CorsConfig, id: string): Promise<Response> {
    try {
      const supabase = getSupabaseClient(env);
      const repo = new TripsRepository(supabase);
      await repo.deleteTrip(id);

      return jsonResponse({ success: true, message: 'Trip deleted successfully' }, 200, corsConfig);
    } catch (err) {
      console.error('Failed to delete trip:', err);
      return errorResponse(err instanceof Error ? err.message : 'Failed to delete trip', 500, corsConfig);
    }
  }
}
