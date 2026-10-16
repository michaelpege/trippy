/**
 * RBAC Handler
 *
 * Manages roles, permissions, and email assignments.
 */

import { getSupabaseClient } from '../client/supabase_client';
import { RbacRepository } from '../repository/rbac_repository';
import { SYSTEM_PERMISSIONS } from '../types/rbac';
import { jsonResponse, errorResponse } from '../middleware/cors';
import type { Env, CorsConfig, AuthUser } from '../types';

export class RbacHandler {
  /**
   * GET /api/rbac/me - Current user's identity, roles, and permissions
   */
  async getMe(request: Request, env: Env, corsConfig: CorsConfig, user: AuthUser): Promise<Response> {
    try {
      const supabase = getSupabaseClient(env);
      const repo = new RbacRepository(supabase);
      const ownerEmail = await repo.getOwnerEmail();

      return jsonResponse(
        {
          user: {
            email: user.email,
            userId: user.userId,
            roles: user.roles,
            permissions: user.permissions,
            isOwner: user.isOwner,
            ownerEmail,
          },
        },
        200,
        corsConfig
      );
    } catch (err) {
      console.error('Failed to get current user info:', err);
      return errorResponse('Failed to retrieve user access profile', 500, corsConfig);
    }
  }

  /**
   * GET /api/rbac/permissions - List all possible system permissions
   */
  async listPermissions(request: Request, env: Env, corsConfig: CorsConfig): Promise<Response> {
    return jsonResponse({ permissions: SYSTEM_PERMISSIONS }, 200, corsConfig);
  }

  /**
   * GET /api/rbac/roles - List all roles and assigned emails
   */
  async listRoles(request: Request, env: Env, corsConfig: CorsConfig): Promise<Response> {
    try {
      const supabase = getSupabaseClient(env);
      const repo = new RbacRepository(supabase);
      const roles = await repo.listRoles();

      return jsonResponse({ roles }, 200, corsConfig);
    } catch (err) {
      console.error('Failed to list roles:', err);
      return errorResponse('Failed to fetch roles', 500, corsConfig);
    }
  }

  /**
   * GET /api/rbac/roles/:id
   */
  async getRole(request: Request, env: Env, corsConfig: CorsConfig, id: string): Promise<Response> {
    try {
      const supabase = getSupabaseClient(env);
      const repo = new RbacRepository(supabase);
      const role = await repo.getRoleById(id);

      if (!role) {
        return errorResponse('Role not found', 404, corsConfig);
      }

      return jsonResponse({ role }, 200, corsConfig);
    } catch (err) {
      console.error('Failed to get role:', err);
      return errorResponse('Failed to fetch role details', 500, corsConfig);
    }
  }

  /**
   * POST /api/rbac/roles - Create role with permissions & emails
   */
  async createRole(request: Request, env: Env, corsConfig: CorsConfig): Promise<Response> {
    try {
      const body = (await request.json().catch(() => null)) as {
        name?: string;
        description?: string;
        permissions?: string[];
        emails?: string[];
      };

      if (!body || !body.name?.trim()) {
        return errorResponse('Role "name" is required', 400, corsConfig);
      }

      const supabase = getSupabaseClient(env);
      const repo = new RbacRepository(supabase);
      const created = await repo.createRole({
        name: body.name.trim(),
        description: body.description || '',
        permissions: Array.isArray(body.permissions) ? body.permissions : [],
        emails: Array.isArray(body.emails) ? body.emails : [],
      });

      return jsonResponse({ role: created, message: 'Role created successfully' }, 201, corsConfig);
    } catch (err) {
      console.error('Failed to create role:', err);
      return errorResponse(err instanceof Error ? err.message : 'Failed to create role', 500, corsConfig);
    }
  }

  /**
   * PUT /api/rbac/roles/:id - Update role, permissions, and assigned emails
   */
  async updateRole(request: Request, env: Env, corsConfig: CorsConfig, id: string): Promise<Response> {
    try {
      const body = (await request.json().catch(() => null)) as {
        name?: string;
        description?: string;
        permissions?: string[];
        emails?: string[];
      };

      if (!body) {
        return errorResponse('Invalid request body', 400, corsConfig);
      }

      const supabase = getSupabaseClient(env);
      const repo = new RbacRepository(supabase);
      const updated = await repo.updateRole(id, {
        name: body.name?.trim(),
        description: body.description,
        permissions: body.permissions,
        emails: body.emails,
      });

      return jsonResponse({ role: updated, message: 'Role updated successfully' }, 200, corsConfig);
    } catch (err) {
      console.error('Failed to update role:', err);
      return errorResponse(err instanceof Error ? err.message : 'Failed to update role', 500, corsConfig);
    }
  }

  /**
   * DELETE /api/rbac/roles/:id - Delete role
   */
  async deleteRole(request: Request, env: Env, corsConfig: CorsConfig, id: string): Promise<Response> {
    try {
      const supabase = getSupabaseClient(env);
      const repo = new RbacRepository(supabase);
      await repo.deleteRole(id);

      return jsonResponse({ success: true, message: 'Role deleted successfully' }, 200, corsConfig);
    } catch (err) {
      console.error('Failed to delete role:', err);
      return errorResponse(err instanceof Error ? err.message : 'Failed to delete role', 500, corsConfig);
    }
  }
}
