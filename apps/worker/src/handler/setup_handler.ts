/**
 * Setup Handler
 *
 * Implements /api/setup and /api/setup/status.
 * Only accessible if the whole database has not been initialized.
 */

import { getSupabaseClient } from '../client/supabase_client';
import { SetupRepository } from '../repository/setup_repository';
import { jsonResponse, errorResponse } from '../middleware/cors';
import type { Env, CorsConfig } from '../types';

export class SetupHandler {
  /**
   * GET /api/setup/status - Check whether the system has been initialized
   */
  async getStatus(request: Request, env: Env, corsConfig: CorsConfig): Promise<Response> {
    try {
      const supabase = getSupabaseClient(env);
      const setupRepo = new SetupRepository(supabase);
      const status = await setupRepo.getStatus();

      return jsonResponse(status, 200, corsConfig);
    } catch (err) {
      console.error('Error checking setup status:', err);
      return jsonResponse({ isInitialized: false }, 200, corsConfig);
    }
  }

  /**
   * POST /api/setup - Register the first Gmail as owner and initialize database
   * ONLY accessible if the database is not initialized.
   */
  async initialize(request: Request, env: Env, corsConfig: CorsConfig): Promise<Response> {
    try {
      const supabase = getSupabaseClient(env);
      const setupRepo = new SetupRepository(supabase);

      // Verify not already initialized
      const currentStatus = await setupRepo.getStatus();
      if (currentStatus.isInitialized) {
        return errorResponse(
          'Setup is already completed. The setup endpoint is permanently disabled.',
          403,
          corsConfig
        );
      }

      const body = (await request.json().catch(() => ({}))) as {
        ownerEmail?: string;
      };

      if (!body.ownerEmail || typeof body.ownerEmail !== 'string') {
        return errorResponse('Valid "ownerEmail" is required in request body.', 400, corsConfig);
      }

      const normalizedEmail = body.ownerEmail.toLowerCase().trim();
      if (!normalizedEmail.includes('@')) {
        return errorResponse('Invalid email format.', 400, corsConfig);
      }

      const result = await setupRepo.initializeOwner(normalizedEmail, env);

      return jsonResponse(
        {
          success: true,
          message: 'System successfully initialized. Owner registered.',
          status: result,
        },
        201,
        corsConfig
      );
    } catch (err) {
      console.error('Setup initialization error:', err);
      return errorResponse(
        err instanceof Error ? err.message : 'Failed to initialize system',
        500,
        corsConfig
      );
    }
  }
}
