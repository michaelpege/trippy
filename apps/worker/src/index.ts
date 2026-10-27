/**
 * Trippy Worker - Main Entry Point & Router
 *
 * Serverless backend running on Cloudflare Workers edge.
 */

import { getCorsConfig, handleCorsPreflight, errorResponse } from './middleware/cors';
import { withPermission } from './middleware/permission_middleware';
import { SetupHandler } from './handler/setup_handler';
import { PlacesHandler } from './handler/places_handler';
import { TripsHandler } from './handler/trips_handler';
import { RouletteHandler } from './handler/roulette_handler';
import { AuditHandler } from './handler/audit_handler';
import { RbacHandler } from './handler/rbac_handler';
import { StorageHandler } from './handler/storage_handler';
import { HealthHandler } from './handler/health_handler';
import type { Env } from './types';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsConfig = getCorsConfig(request, env);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCorsPreflight(corsConfig);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const method = request.method.toUpperCase();

    // Instantiate handlers
    const setupHandler = new SetupHandler();
    const placesHandler = new PlacesHandler();
    const tripsHandler = new TripsHandler();
    const rouletteHandler = new RouletteHandler();
    const auditHandler = new AuditHandler();
    const rbacHandler = new RbacHandler();
    const storageHandler = new StorageHandler();
    const healthHandler = new HealthHandler();

    try {
      // -----------------------------------------------------------------------
      // Public / Diagnostic routes
      // -----------------------------------------------------------------------
      if (path === '/health' || path === '/api/health') {
        return healthHandler.check(request, env, corsConfig);
      }

      // -----------------------------------------------------------------------
      // Setup routes (uninitialized access only)
      // -----------------------------------------------------------------------
      if (path === '/api/setup/status' && method === 'GET') {
        return setupHandler.getStatus(request, env, corsConfig);
      }

      if (path === '/api/setup' && method === 'POST') {
        return setupHandler.initialize(request, env, corsConfig);
      }

      // -----------------------------------------------------------------------
      // Shared Roulette links (Protected by Google Auth or static token)
      // -----------------------------------------------------------------------
      const sharedViewMatch = path.match(/^\/api\/roulettes\/share\/([^/]+)$/);
      if (sharedViewMatch && method === 'GET') {
        return rouletteHandler.getSharedRoulette(request, env, corsConfig, sharedViewMatch[1]);
      }

      const sharedSpinMatch = path.match(/^\/api\/roulettes\/share\/([^/]+)\/spin$/);
      if (sharedSpinMatch && method === 'POST') {
        return rouletteHandler.sharedSpin(request, env, corsConfig, sharedSpinMatch[1]);
      }

      // -----------------------------------------------------------------------
      // Audit Immutability Protection: strictly reject DELETE / PUT on audit
      // -----------------------------------------------------------------------
      if (path.startsWith('/api/audit') && (method === 'DELETE' || method === 'PUT' || method === 'PATCH')) {
        return auditHandler.rejectMutation(corsConfig);
      }

      // -----------------------------------------------------------------------
      // Current User Profile & RBAC Info
      // -----------------------------------------------------------------------
      if (path === '/api/rbac/me' && method === 'GET') {
        return withPermission(request, env, corsConfig, null, (req, user) =>
          rbacHandler.getMe(req, env, corsConfig, user)
        );
      }

      if (path === '/api/rbac/permissions' && method === 'GET') {
        return withPermission(request, env, corsConfig, null, (req) =>
          rbacHandler.listPermissions(req, env, corsConfig)
        );
      }

      // -----------------------------------------------------------------------
      // Storage Upload
      // -----------------------------------------------------------------------
      if (path === '/api/storage/upload' && method === 'POST') {
        return withPermission(request, env, corsConfig, 'places:create', (req) =>
          storageHandler.uploadFile(req, env, corsConfig)
        );
      }

      // -----------------------------------------------------------------------
      // Places CRUD
      // -----------------------------------------------------------------------
      if (path === '/api/places/parse-gmaps' && method === 'POST') {
        return withPermission(request, env, corsConfig, 'places:create', (req) =>
          placesHandler.parseGmaps(req, env, corsConfig)
        );
      }

      if (path === '/api/places') {
        if (method === 'GET') {
          return withPermission(request, env, corsConfig, 'places:read', (req) =>
            placesHandler.listPlaces(req, env, corsConfig)
          );
        }
        if (method === 'POST') {
          return withPermission(request, env, corsConfig, 'places:create', (req, user) =>
            placesHandler.createPlace(req, env, corsConfig, user)
          );
        }
      }

      const placeIdMatch = path.match(/^\/api\/places\/([^/]+)$/);
      if (placeIdMatch) {
        const placeId = placeIdMatch[1];
        if (method === 'GET') {
          return withPermission(request, env, corsConfig, 'places:read', (req) =>
            placesHandler.getPlace(req, env, corsConfig, placeId)
          );
        }
        if (method === 'PUT') {
          return withPermission(request, env, corsConfig, 'places:update', (req) =>
            placesHandler.updatePlace(req, env, corsConfig, placeId)
          );
        }
        if (method === 'DELETE') {
          return withPermission(request, env, corsConfig, 'places:delete', (req) =>
            placesHandler.deletePlace(req, env, corsConfig, placeId)
          );
        }
      }

      // -----------------------------------------------------------------------
      // Trips CRUD
      // -----------------------------------------------------------------------
      if (path === '/api/trips') {
        if (method === 'GET') {
          return withPermission(request, env, corsConfig, 'trips:read', (req) =>
            tripsHandler.listTrips(req, env, corsConfig)
          );
        }
        if (method === 'POST') {
          return withPermission(request, env, corsConfig, 'trips:create', (req, user) =>
            tripsHandler.createTrip(req, env, corsConfig, user)
          );
        }
      }

      const tripIdMatch = path.match(/^\/api\/trips\/([^/]+)$/);
      if (tripIdMatch) {
        const tripId = tripIdMatch[1];
        if (method === 'GET') {
          return withPermission(request, env, corsConfig, 'trips:read', (req) =>
            tripsHandler.getTrip(req, env, corsConfig, tripId)
          );
        }
        if (method === 'PUT') {
          return withPermission(request, env, corsConfig, 'trips:update', (req) =>
            tripsHandler.updateTrip(req, env, corsConfig, tripId)
          );
        }
        if (method === 'DELETE') {
          return withPermission(request, env, corsConfig, 'trips:delete', (req) =>
            tripsHandler.deleteTrip(req, env, corsConfig, tripId)
          );
        }
      }

      // -----------------------------------------------------------------------
      // Roulette CRUD & Admin Execution
      // -----------------------------------------------------------------------
      if (path === '/api/roulettes') {
        if (method === 'GET') {
          return withPermission(request, env, corsConfig, 'roulette:read', (req) =>
            rouletteHandler.listRoulettes(req, env, corsConfig)
          );
        }
        if (method === 'POST') {
          return withPermission(request, env, corsConfig, 'roulette:create', (req, user) =>
            rouletteHandler.createRoulette(req, env, corsConfig, user)
          );
        }
      }

      const rouletteSpinMatch = path.match(/^\/api\/roulettes\/([^/]+)\/spin$/);
      if (rouletteSpinMatch && method === 'POST') {
        return withPermission(request, env, corsConfig, 'roulette:spin', (req, user) =>
          rouletteHandler.adminSpin(req, env, corsConfig, rouletteSpinMatch[1], user)
        );
      }

      const rouletteIdMatch = path.match(/^\/api\/roulettes\/([^/]+)$/);
      if (rouletteIdMatch) {
        const rouletteId = rouletteIdMatch[1];
        if (method === 'GET') {
          return withPermission(request, env, corsConfig, 'roulette:read', (req) =>
            rouletteHandler.getRoulette(req, env, corsConfig, rouletteId)
          );
        }
        if (method === 'PUT') {
          return withPermission(request, env, corsConfig, 'roulette:update', (req, user) =>
            rouletteHandler.updateRoulette(req, env, corsConfig, rouletteId, user)
          );
        }
        if (method === 'DELETE') {
          return withPermission(request, env, corsConfig, 'roulette:delete', (req) =>
            rouletteHandler.deleteRoulette(req, env, corsConfig, rouletteId)
          );
        }
      }

      // -----------------------------------------------------------------------
      // Audit Logs (Inspection only)
      // -----------------------------------------------------------------------
      if (path === '/api/audit' && method === 'GET') {
        return withPermission(request, env, corsConfig, 'roulette:read', (req) =>
          auditHandler.listLogs(req, env, corsConfig)
        );
      }

      const auditIdMatch = path.match(/^\/api\/audit\/([^/]+)$/);
      if (auditIdMatch && method === 'GET') {
        return withPermission(request, env, corsConfig, 'roulette:read', (req) =>
          auditHandler.getLog(req, env, corsConfig, auditIdMatch[1])
        );
      }

      // -----------------------------------------------------------------------
      // RBAC Roles Management
      // -----------------------------------------------------------------------
      if (path === '/api/rbac/roles') {
        if (method === 'GET') {
          return withPermission(request, env, corsConfig, 'settings:rbac:read', (req) =>
            rbacHandler.listRoles(req, env, corsConfig)
          );
        }
        if (method === 'POST') {
          return withPermission(request, env, corsConfig, 'settings:rbac:manage', (req) =>
            rbacHandler.createRole(req, env, corsConfig)
          );
        }
      }

      const roleIdMatch = path.match(/^\/api\/rbac\/roles\/([^/]+)$/);
      if (roleIdMatch) {
        const roleId = roleIdMatch[1];
        if (method === 'GET') {
          return withPermission(request, env, corsConfig, 'settings:rbac:read', (req) =>
            rbacHandler.getRole(req, env, corsConfig, roleId)
          );
        }
        if (method === 'PUT') {
          return withPermission(request, env, corsConfig, 'settings:rbac:manage', (req) =>
            rbacHandler.updateRole(req, env, corsConfig, roleId)
          );
        }
        if (method === 'DELETE') {
          return withPermission(request, env, corsConfig, 'settings:rbac:manage', (req) =>
            rbacHandler.deleteRole(req, env, corsConfig, roleId)
          );
        }
      }

      return errorResponse(`Route not found: ${method} ${path}`, 404, corsConfig);
    } catch (err) {
      console.error('Unhandled worker exception:', err);
      return errorResponse(err instanceof Error ? err.message : 'Internal Server Error', 500, corsConfig);
    }
  },
};
