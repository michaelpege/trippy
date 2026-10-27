/**
 * Places Handler
 *
 * REST API for places CRUD operations with RBAC permission enforcement.
 */

import { getSupabaseClient } from '../client/supabase_client';
import { PlacesRepository } from '../repository/places_repository';
import { parseGoogleMapsUrl } from '../service/gmaps_scraper';
import { jsonResponse, errorResponse } from '../middleware/cors';
import type { Env, CorsConfig, AuthUser, PlaceType, PlaceFile } from '../types';

export class PlacesHandler {
  /**
   * GET /api/places
   */
  async listPlaces(request: Request, env: Env, corsConfig: CorsConfig): Promise<Response> {
    try {
      const url = new URL(request.url);
      const type = (url.searchParams.get('type') as PlaceType) || undefined;
      const query = url.searchParams.get('q') || undefined;
      const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : undefined;
      const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!, 10) : undefined;

      const supabase = getSupabaseClient(env);
      const repo = new PlacesRepository(supabase);
      const places = await repo.listPlaces({ type, query, limit, offset });

      return jsonResponse({ places }, 200, corsConfig);
    } catch (err) {
      console.error('Failed to list places:', err);
      return errorResponse('Failed to fetch places', 500, corsConfig);
    }
  }

  /**
   * GET /api/places/:id
   */
  async getPlace(request: Request, env: Env, corsConfig: CorsConfig, id: string): Promise<Response> {
    try {
      const supabase = getSupabaseClient(env);
      const repo = new PlacesRepository(supabase);
      const place = await repo.getPlaceById(id);

      if (!place) {
        return errorResponse('Place not found', 404, corsConfig);
      }

      return jsonResponse({ place }, 200, corsConfig);
    } catch (err) {
      console.error('Failed to get place:', err);
      return errorResponse('Failed to fetch place details', 500, corsConfig);
    }
  }

  /**
   * POST /api/places
   */
  async createPlace(request: Request, env: Env, corsConfig: CorsConfig, user: AuthUser): Promise<Response> {
    try {
      const body = (await request.json().catch(() => null)) as {
        name?: string;
        type?: PlaceType;
        description?: string;
        address?: string;
        gmaps_url?: string;
        latitude?: number | null;
        longitude?: number | null;
        files?: PlaceFile[];
      };

      if (!body || !body.name || !body.type) {
        return errorResponse('Missing required fields: "name" and "type"', 400, corsConfig);
      }

      const validTypes: PlaceType[] = ['Restaurant', 'Mall', 'Public spaces', 'other'];
      if (!validTypes.includes(body.type)) {
        return errorResponse(`Invalid type. Must be one of: ${validTypes.join(', ')}`, 400, corsConfig);
      }

      const supabase = getSupabaseClient(env);
      const repo = new PlacesRepository(supabase);
      const place = await repo.createPlace(
        {
          name: body.name.trim(),
          type: body.type,
          description: body.description || '',
          address: body.address || '',
          gmaps_url: body.gmaps_url || '',
          latitude: typeof body.latitude === 'number' ? body.latitude : null,
          longitude: typeof body.longitude === 'number' ? body.longitude : null,
          files: Array.isArray(body.files) ? body.files : [],
        },
        user.email
      );

      return jsonResponse({ place, message: 'Place created successfully' }, 201, corsConfig);
    } catch (err) {
      console.error('Failed to create place:', err);
      return errorResponse(err instanceof Error ? err.message : 'Failed to create place', 500, corsConfig);
    }
  }

  /**
   * PUT /api/places/:id
   */
  async updatePlace(request: Request, env: Env, corsConfig: CorsConfig, id: string): Promise<Response> {
    try {
      const body = (await request.json().catch(() => null)) as {
        name?: string;
        type?: PlaceType;
        description?: string;
        address?: string;
        gmaps_url?: string;
        latitude?: number | null;
        longitude?: number | null;
        files?: PlaceFile[];
      };

      if (!body) {
        return errorResponse('Invalid request body', 400, corsConfig);
      }

      if (body.type) {
        const validTypes: PlaceType[] = ['Restaurant', 'Mall', 'Public spaces', 'other'];
        if (!validTypes.includes(body.type)) {
          return errorResponse(`Invalid type. Must be one of: ${validTypes.join(', ')}`, 400, corsConfig);
        }
      }

      const supabase = getSupabaseClient(env);
      const repo = new PlacesRepository(supabase);
      const updated = await repo.updatePlace(id, {
        name: body.name?.trim(),
        type: body.type,
        description: body.description,
        address: body.address,
        gmaps_url: body.gmaps_url,
        latitude: body.latitude,
        longitude: body.longitude,
        files: body.files,
      });

      return jsonResponse({ place: updated, message: 'Place updated successfully' }, 200, corsConfig);
    } catch (err) {
      console.error('Failed to update place:', err);
      return errorResponse(err instanceof Error ? err.message : 'Failed to update place', 500, corsConfig);
    }
  }

  /**
   * DELETE /api/places/:id
   */
  async deletePlace(request: Request, env: Env, corsConfig: CorsConfig, id: string): Promise<Response> {
    try {
      const supabase = getSupabaseClient(env);
      const repo = new PlacesRepository(supabase);
      await repo.deletePlace(id);

      return jsonResponse({ success: true, message: 'Place deleted successfully' }, 200, corsConfig);
    } catch (err) {
      console.error('Failed to delete place:', err);
      return errorResponse(err instanceof Error ? err.message : 'Failed to delete place', 500, corsConfig);
    }
  }

  /**
   * POST /api/places/parse-gmaps
   * Resolves Google Maps link & extracts metadata + categorized photos
   */
  async parseGmaps(request: Request, env: Env, corsConfig: CorsConfig): Promise<Response> {
    try {
      const body = (await request.json().catch(() => null)) as { url?: string };
      if (!body || !body.url || typeof body.url !== 'string') {
        return errorResponse('Missing required field: "url"', 400, corsConfig);
      }

      const parsed = await parseGoogleMapsUrl(body.url);
      return jsonResponse({ success: true, data: parsed }, 200, corsConfig);
    } catch (err) {
      console.error('Failed to parse Google Maps URL:', err);
      return errorResponse(
        err instanceof Error ? err.message : 'Failed to parse Google Maps link',
        500,
        corsConfig
      );
    }
  }
}
