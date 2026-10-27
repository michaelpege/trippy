/**
 * Roulette Handler
 *
 * Implements CRUD, Weighted Selection, Shared Link Access (Google Auth / Static Token),
 * and immutable Audit Log persistence.
 */

import { getSupabaseClient } from '../client/supabase_client';
import { RouletteRepository } from '../repository/roulette_repository';
import { AuditRepository } from '../repository/audit_repository';
import { RbacRepository } from '../repository/rbac_repository';
import { GoogleClient } from '../client/google_client';
import { jsonResponse, errorResponse } from '../middleware/cors';
import type { Env, CorsConfig, AuthUser, RouletteItem } from '../types';

export class RouletteHandler {
  /**
   * GET /api/roulettes (Admin/Authenticated)
   */
  async listRoulettes(request: Request, env: Env, corsConfig: CorsConfig): Promise<Response> {
    try {
      const supabase = getSupabaseClient(env);
      const repo = new RouletteRepository(supabase);
      const roulettes = await repo.listRoulettes();

      return jsonResponse({ roulettes }, 200, corsConfig);
    } catch (err) {
      console.error('Failed to list roulettes:', err);
      return errorResponse('Failed to fetch roulettes', 500, corsConfig);
    }
  }

  /**
   * GET /api/roulettes/:id (Admin/Authenticated)
   */
  async getRoulette(request: Request, env: Env, corsConfig: CorsConfig, id: string): Promise<Response> {
    try {
      const supabase = getSupabaseClient(env);
      const repo = new RouletteRepository(supabase);
      const roulette = await repo.getRouletteById(id);

      if (!roulette) {
        return errorResponse('Roulette configuration not found', 404, corsConfig);
      }

      return jsonResponse({ roulette }, 200, corsConfig);
    } catch (err) {
      console.error('Failed to get roulette:', err);
      return errorResponse('Failed to fetch roulette', 500, corsConfig);
    }
  }

  /**
   * POST /api/roulettes (Admin/Authenticated)
   */
  async createRoulette(request: Request, env: Env, corsConfig: CorsConfig, user: AuthUser): Promise<Response> {
    try {
      const body = (await request.json().catch(() => null)) as {
        title?: string;
        description?: string;
        type?: 'trips' | 'places';
        items?: RouletteItem[];
        protection_type?: 'google' | 'token';
        allowed_emails?: string[];
        access_token?: string;
      };

      if (!body || !body.title || !body.type || !body.protection_type) {
        return errorResponse('Missing required fields: "title", "type", "protection_type"', 400, corsConfig);
      }

      if (body.type !== 'trips' && body.type !== 'places') {
        return errorResponse('Invalid type. Must be "trips" or "places"', 400, corsConfig);
      }

      if (body.protection_type !== 'google' && body.protection_type !== 'token') {
        return errorResponse('Invalid protection_type. Must be "google" or "token"', 400, corsConfig);
      }

      if (body.protection_type === 'token' && !body.access_token?.trim()) {
        return errorResponse('Static password/token is required when protection_type is "token"', 400, corsConfig);
      }

      if (body.protection_type === 'google' && (!body.allowed_emails || body.allowed_emails.length === 0)) {
        return errorResponse('At least one allowed Gmail address is required for Google-protected links', 400, corsConfig);
      }

      const supabase = getSupabaseClient(env);
      const repo = new RouletteRepository(supabase);
      const roulette = await repo.createRoulette(
        {
          title: body.title.trim(),
          description: body.description || '',
          type: body.type,
          items: Array.isArray(body.items) ? body.items : [],
          protection_type: body.protection_type,
          allowed_emails: body.allowed_emails || [],
          access_token: body.access_token?.trim() || '',
        },
        user.email
      );

      return jsonResponse({ roulette, message: 'Roulette created successfully' }, 201, corsConfig);
    } catch (err) {
      console.error('Failed to create roulette:', err);
      return errorResponse(err instanceof Error ? err.message : 'Failed to create roulette', 500, corsConfig);
    }
  }

  /**
   * PUT /api/roulettes/:id (Admin/Authenticated)
   */
  async updateRoulette(
    request: Request,
    env: Env,
    corsConfig: CorsConfig,
    id: string,
    user: AuthUser
  ): Promise<Response> {
    try {
      const body = (await request.json().catch(() => null)) as {
        title?: string;
        description?: string;
        type?: 'trips' | 'places';
        items?: RouletteItem[];
        protection_type?: 'google' | 'token';
        allowed_emails?: string[];
        access_token?: string;
        is_active?: boolean;
      };

      if (!body) {
        return errorResponse('Invalid request body', 400, corsConfig);
      }

      const supabase = getSupabaseClient(env);
      const repo = new RouletteRepository(supabase);

      const existing = await repo.getRouletteById(id);
      if (!existing) {
        return errorResponse('Roulette not found', 404, corsConfig);
      }

      // Validate protection configuration if changing or updating
      const targetProtection = body.protection_type || existing.protection_type;
      let targetAllowedEmails = body.allowed_emails !== undefined ? body.allowed_emails : existing.allowed_emails;
      let targetAccessToken = body.access_token !== undefined ? body.access_token.trim() : existing.access_token;

      if (targetProtection === 'token') {
        if (!targetAccessToken) {
          return errorResponse('Static password/token is required when protection_type is "token"', 400, corsConfig);
        }
        // If explicitly switching to token, clear out emails if not provided
        if (body.protection_type === 'token' && body.allowed_emails === undefined) {
          targetAllowedEmails = [];
        }
      } else if (targetProtection === 'google') {
        if (!targetAllowedEmails || targetAllowedEmails.length === 0) {
          return errorResponse('At least one allowed Gmail address is required for Google-protected links', 400, corsConfig);
        }
        // If explicitly switching to google, clear out passcode token if not provided
        if (body.protection_type === 'google' && body.access_token === undefined) {
          targetAccessToken = '';
        }
      }

      const updated = await repo.updateRoulette(id, {
        title: body.title !== undefined ? body.title.trim() : undefined,
        description: body.description,
        type: body.type,
        items: body.items,
        protection_type: body.protection_type,
        allowed_emails: targetAllowedEmails,
        access_token: targetAccessToken,
        is_active: body.is_active,
      });

      // Compute diffs and record immutable audit logs
      const ipAddress = request.headers.get('cf-connecting-ip') || '';
      const userAgent = request.headers.get('user-agent') || '';
      const adminEmail = user.email || 'admin';

      // 1. Audit items added / removed / weights changed
      if (body.items !== undefined) {
        const oldItems = existing.items || [];
        const newItems = updated.items || [];
        const oldMap = new Map(oldItems.map((it) => [it.item_id, it]));
        const newMap = new Map(newItems.map((it) => [it.item_id, it]));

        // Items added
        for (const [newItemId, newItem] of newMap.entries()) {
          if (!oldMap.has(newItemId)) {
            await repo.insertAuditEntry({
              roulette_id: updated.id,
              roulette_title: updated.title,
              type: updated.type,
              selected_item_id: newItem.item_id,
              selected_item_title: `[ITEM_ADDED] Added candidate: "${newItem.title}" (Weight: ${newItem.weight || 1})`,
              candidate_pool: newItems,
              executed_by_type: 'admin',
              executed_by_identifier: adminEmail,
              ip_address: ipAddress,
              user_agent: userAgent,
            });
          }
        }

        // Items removed
        for (const [oldItemId, oldItem] of oldMap.entries()) {
          if (!newMap.has(oldItemId)) {
            await repo.insertAuditEntry({
              roulette_id: updated.id,
              roulette_title: updated.title,
              type: updated.type,
              selected_item_id: oldItem.item_id,
              selected_item_title: `[ITEM_REMOVED] Removed candidate: "${oldItem.title}"`,
              candidate_pool: newItems,
              executed_by_type: 'admin',
              executed_by_identifier: adminEmail,
              ip_address: ipAddress,
              user_agent: userAgent,
            });
          }
        }

        // Weights changed
        for (const [itemId, newItem] of newMap.entries()) {
          const oldItem = oldMap.get(itemId);
          if (oldItem && Number(oldItem.weight || 1) !== Number(newItem.weight || 1)) {
            await repo.insertAuditEntry({
              roulette_id: updated.id,
              roulette_title: updated.title,
              type: updated.type,
              selected_item_id: newItem.item_id,
              selected_item_title: `[WEIGHT_MODIFIED] "${newItem.title}" weight changed: ${oldItem.weight || 1} -> ${newItem.weight || 1}`,
              candidate_pool: newItems,
              executed_by_type: 'admin',
              executed_by_identifier: adminEmail,
              ip_address: ipAddress,
              user_agent: userAgent,
            });
          }
        }
      }

      // 2. Audit protection protocol or credential changes
      if (body.protection_type !== undefined && body.protection_type !== existing.protection_type) {
        await repo.insertAuditEntry({
          roulette_id: updated.id,
          roulette_title: updated.title,
          type: updated.type,
          selected_item_id: 'auth_protocol',
          selected_item_title: `[AUTH_CHANGED] Protocol switched: ${existing.protection_type.toUpperCase()} -> ${updated.protection_type.toUpperCase()}`,
          candidate_pool: updated.items,
          executed_by_type: 'admin',
          executed_by_identifier: adminEmail,
          ip_address: ipAddress,
          user_agent: userAgent,
        });
      } else if (
        body.allowed_emails !== undefined &&
        existing.protection_type === 'google' &&
        JSON.stringify(existing.allowed_emails?.slice().sort() || []) !== JSON.stringify(updated.allowed_emails?.slice().sort() || [])
      ) {
        await repo.insertAuditEntry({
          roulette_id: updated.id,
          roulette_title: updated.title,
          type: updated.type,
          selected_item_id: 'auth_whitelist',
          selected_item_title: `[AUTH_WHITELIST_MODIFIED] Allowed emails updated (${updated.allowed_emails.length} recipients)`,
          candidate_pool: updated.items,
          executed_by_type: 'admin',
          executed_by_identifier: adminEmail,
          ip_address: ipAddress,
          user_agent: userAgent,
        });
      } else if (
        body.access_token !== undefined &&
        existing.protection_type === 'token' &&
        existing.access_token !== updated.access_token
      ) {
        await repo.insertAuditEntry({
          roulette_id: updated.id,
          roulette_title: updated.title,
          type: updated.type,
          selected_item_id: 'auth_passcode',
          selected_item_title: `[AUTH_PASSCODE_ROTATED] Shared passcode token was rotated`,
          candidate_pool: updated.items,
          executed_by_type: 'admin',
          executed_by_identifier: adminEmail,
          ip_address: ipAddress,
          user_agent: userAgent,
        });
      }

      return jsonResponse({ roulette: updated, message: 'Roulette updated successfully' }, 200, corsConfig);
    } catch (err) {
      console.error('Failed to update roulette:', err);
      return errorResponse(err instanceof Error ? err.message : 'Failed to update roulette', 500, corsConfig);
    }
  }

  /**
   * DELETE /api/roulettes/:id (Admin/Authenticated)
   */
  async deleteRoulette(request: Request, env: Env, corsConfig: CorsConfig, id: string): Promise<Response> {
    try {
      const supabase = getSupabaseClient(env);
      const repo = new RouletteRepository(supabase);
      await repo.deleteRoulette(id);

      return jsonResponse({ success: true, message: 'Roulette deleted successfully' }, 200, corsConfig);
    } catch (err) {
      console.error('Failed to delete roulette:', err);
      return errorResponse(err instanceof Error ? err.message : 'Failed to delete roulette', 500, corsConfig);
    }
  }

  /**
   * POST /api/roulettes/:id/spin (Admin/Authenticated)
   */
  async adminSpin(request: Request, env: Env, corsConfig: CorsConfig, id: string, user: AuthUser): Promise<Response> {
    try {
      const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';

      const supabase = getSupabaseClient(env);
      const repo = new RouletteRepository(supabase);
      const result = await repo.executeSpin(id, {
        type: 'admin',
        identifier: user.email,
        ipAddress: clientIp,
        userAgent,
      });

      return jsonResponse(
        {
          winner: result.selectedItem,
          auditLog: result.auditLog,
          message: `Roulette spun! Selected: ${result.selectedItem.title}`,
        },
        200,
        corsConfig
      );
    } catch (err) {
      console.error('Failed to execute spin:', err);
      return errorResponse(err instanceof Error ? err.message : 'Spin execution failed', 500, corsConfig);
    }
  }

  // ===========================================================================
  // PROTECTED SHAREABLE LINK ENDPOINTS
  // ===========================================================================

  /**
   * GET /api/roulettes/share/:id
   * Returns roulette details, its last updated timestamp, and the audit logs of the last 5 runs.
   * If unauthenticated, requiresAuth is set to true so the client can prompt the sign-in modal.
   */
  async getSharedRoulette(request: Request, env: Env, corsConfig: CorsConfig, id: string): Promise<Response> {
    try {
      const supabase = getSupabaseClient(env);
      const repo = new RouletteRepository(supabase);
      const roulette = await repo.getRouletteById(id);

      if (!roulette) {
        return errorResponse('Shared roulette link not found or expired', 404, corsConfig);
      }

      if (!roulette.is_active) {
        return errorResponse('This shared roulette is currently disabled', 403, corsConfig);
      }

      const authResult = await this.authenticateSharedAccess(request, roulette, env);

      // Fetch the last 5 runs from the audit repository
      const auditRepo = new AuditRepository(supabase);
      const auditRes = await auditRepo.listLogs({ rouletteId: id, limit: 5 });

      // Return sanitized payload for participants (hide internal secret access_token)
      return jsonResponse(
        {
          roulette: {
            id: roulette.id,
            title: roulette.title,
            description: roulette.description,
            type: roulette.type,
            items: roulette.items,
            protection_type: roulette.protection_type,
            updated_at: roulette.updated_at || roulette.created_at,
            created_at: roulette.created_at,
          },
          last5Runs: auditRes.logs,
          authenticatedAs: authResult.allowed ? authResult.identifier : null,
          requiresAuth: !authResult.allowed,
          protectionType: roulette.protection_type,
        },
        200,
        corsConfig
      );
    } catch (err) {
      console.error('Error accessing shared roulette:', err);
      return errorResponse('Failed to access shared roulette', 500, corsConfig);
    }
  }

  /**
   * POST /api/roulettes/share/:id/spin
   * Executes roulette via protected shareable link and records immutable audit log.
   */
  async sharedSpin(request: Request, env: Env, corsConfig: CorsConfig, id: string): Promise<Response> {
    try {
      const supabase = getSupabaseClient(env);
      const repo = new RouletteRepository(supabase);
      const roulette = await repo.getRouletteById(id);

      if (!roulette) {
        return errorResponse('Shared roulette link not found or expired', 404, corsConfig);
      }

      if (!roulette.is_active) {
        return errorResponse('This shared roulette is currently disabled', 403, corsConfig);
      }

      const authResult = await this.authenticateSharedAccess(request, roulette, env);
      if (!authResult.allowed) {
        return errorResponse(authResult.error || 'Access denied: Sign in required to spin', authResult.status || 401, corsConfig);
      }

      const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';

      const result = await repo.executeSpin(id, {
        type: roulette.protection_type,
        identifier: authResult.identifier,
        ipAddress: clientIp,
        userAgent,
      });

      return jsonResponse(
        {
          winner: result.selectedItem,
          auditLog: result.auditLog,
          auditLogId: result.auditLog.id,
          executedAt: result.auditLog.created_at,
          message: `Roulette spun successfully! Winner: ${result.selectedItem.title}`,
        },
        200,
        corsConfig
      );
    } catch (err) {
      console.error('Shared spin error:', err);
      return errorResponse(err instanceof Error ? err.message : 'Spin execution failed', 500, corsConfig);
    }
  }

  /**
   * Internal validator for shared link access protection
   */
  private async authenticateSharedAccess(
    request: Request,
    roulette: { protection_type: 'google' | 'token'; allowed_emails: string[]; access_token?: string },
    env: Env
  ): Promise<{ allowed: boolean; identifier: string; error?: string; status?: number }> {
    const url = new URL(request.url);

    if (roulette.protection_type === 'token') {
      const tokenHeader = request.headers.get('X-Access-Token');
      const tokenQuery = url.searchParams.get('token');
      const providedToken = (tokenHeader || tokenQuery || '').trim();

      if (!providedToken) {
        return {
          allowed: false,
          identifier: '',
          error: 'Access token required. Please provide a valid passcode or token.',
          status: 401,
        };
      }

      if (providedToken !== roulette.access_token) {
        return {
          allowed: false,
          identifier: '',
          error: 'Invalid access passcode/token.',
          status: 403,
        };
      }

      return {
        allowed: true,
        identifier: `Token-Authorized Guest (${providedToken.substring(0, 4)}***)`,
      };
    }

    if (roulette.protection_type === 'google') {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          allowed: false,
          identifier: '',
          error: 'Google Sign-in required to view this roulette.',
          status: 401,
        };
      }

      const googleToken = authHeader.substring(7).trim();
      const googleClient = new GoogleClient();
      const verifyResult = await googleClient.verifyToken(googleToken);

      if (!verifyResult.valid || !verifyResult.email) {
        return {
          allowed: false,
          identifier: '',
          error: 'Invalid or expired Google token.',
          status: 401,
        };
      }

      const userEmail = verifyResult.email.toLowerCase().trim();

      // Check if user is system owner
      const supabase = getSupabaseClient(env);
      const rbacRepo = new RbacRepository(supabase);
      const ownerEmail = await rbacRepo.getOwnerEmail();

      if (ownerEmail && ownerEmail === userEmail) {
        return { allowed: true, identifier: `${userEmail} (Owner)` };
      }

      // Check against roulette.allowed_emails
      const allowedList = roulette.allowed_emails.map((e) => e.toLowerCase().trim());
      if (allowedList.includes(userEmail)) {
        return { allowed: true, identifier: userEmail };
      }

      return {
        allowed: false,
        identifier: userEmail,
        error: `Access restricted: Account "${userEmail}" is not listed among authorized Gmail users for this roulette.`,
        status: 403,
      };
    }

    return { allowed: false, identifier: '', error: 'Unknown protection type', status: 400 };
  }
}
