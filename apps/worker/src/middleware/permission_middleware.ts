/**
 * Permission Middleware
 *
 * Enforces Google OAuth authentication and RBAC permissions.
 */

import { GoogleClient } from '../client/google_client';
import { getSupabaseClient } from '../client/supabase_client';
import { RbacRepository } from '../repository/rbac_repository';
import { hasPermission } from '../types/rbac';
import { errorResponse } from './cors';
import type { Env, CorsConfig, AuthUser } from '../types';

export type AuthorizedHandler = (
  request: Request,
  user: AuthUser
) => Promise<Response>;

export async function withPermission(
  request: Request,
  env: Env,
  corsConfig: CorsConfig,
  requiredPermission: string | null,
  handler: AuthorizedHandler
): Promise<Response> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse('Unauthorized: Missing or invalid Authorization header', 401, corsConfig);
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return errorResponse('Unauthorized: Token is empty', 401, corsConfig);
  }

  try {
    const googleClient = new GoogleClient();
    const tokenResult = await googleClient.verifyToken(token);

    if (!tokenResult.valid || !tokenResult.email) {
      return errorResponse(tokenResult.error || 'Invalid or expired Google token', 401, corsConfig);
    }

    const email = tokenResult.email.toLowerCase().trim();
    const userId = tokenResult.userId || email;

    const supabase = getSupabaseClient(env);
    const rbacRepo = new RbacRepository(supabase);
    const userAccess = await rbacRepo.getUserAccess(email);

    // If user is neither owner nor assigned any role/permissions, access is denied
    if (!userAccess.isOwner && userAccess.roles.length === 0 && userAccess.permissions.length === 0) {
      return errorResponse(
        `Access denied: The email "${email}" has not been registered as an administrator or assigned any roles.`,
        403,
        corsConfig
      );
    }

    // Verify required permission
    if (requiredPermission && !hasPermission(userAccess.permissions, requiredPermission)) {
      return errorResponse(
        `Forbidden: Missing required permission "${requiredPermission}".`,
        403,
        corsConfig
      );
    }

    const user: AuthUser = {
      userId,
      email,
      roles: userAccess.roles,
      permissions: userAccess.permissions,
      isOwner: userAccess.isOwner,
    };

    return handler(request, user);
  } catch (err) {
    console.error('Authentication/authorization failure:', err);
    return errorResponse('Authentication failed', 401, corsConfig);
  }
}
