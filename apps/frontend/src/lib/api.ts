/**
 * API Client for Trippy Worker Backend
 */

import { getStoredToken, clearSession } from './auth';
import type {
  Place,
  PlaceType,
  PlaceFile,
  GmapsParsedPlace,
  Trip,
  Roulette,
  RouletteItem,
  RouletteAuditLog,
  Role,
  PermissionDefinition,
  UserAccessProfile,
  SetupStatus,
} from '../types';

export const API_BASE = (process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:8787').replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Universal fetch wrapper with automatic Authorization header injection
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  customToken?: string
): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = new Headers(options.headers || {});

  const token = customToken || getStoredToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const text = await response.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // not JSON
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearSession('unauthorized');
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        const isPublic =
          path === '/login' ||
          path.startsWith('/login/') ||
          path.startsWith('/setup') ||
          path.startsWith('/roulette/share');
        if (!isPublic) {
          window.location.replace(`/login?expired=1&from=${encodeURIComponent(path)}`);
        }
      }
    }
    const errorMsg = json?.error || `Request failed with status ${response.status}`;
    throw new ApiError(errorMsg, response.status, json);
  }

  return json as T;
}

// =============================================================================
// SETUP & SYSTEM
// =============================================================================

export async function checkSetupStatus(): Promise<SetupStatus> {
  return apiFetch<SetupStatus>('/api/setup/status');
}

export async function submitSetup(ownerEmail: string): Promise<{ success: boolean; status: SetupStatus }> {
  return apiFetch('/api/setup', {
    method: 'POST',
    body: JSON.stringify({ ownerEmail }),
  });
}

export async function getCurrentUserProfile(): Promise<{ user: UserAccessProfile }> {
  return apiFetch('/api/rbac/me');
}

// =============================================================================
// PLACES CRUD
// =============================================================================

export async function fetchPlaces(params?: { type?: PlaceType; query?: string }): Promise<{ places: Place[] }> {
  const query = new URLSearchParams();
  if (params?.type) query.set('type', params.type);
  if (params?.query) query.set('q', params.query);
  const qStr = query.toString();
  return apiFetch(`/api/places${qStr ? `?${qStr}` : ''}`);
}

export async function fetchPlace(id: string): Promise<{ place: Place }> {
  return apiFetch(`/api/places/${id}`);
}

export async function createPlace(data: {
  name: string;
  type: PlaceType;
  description?: string;
  address?: string;
  gmaps_url?: string;
  latitude?: number | null;
  longitude?: number | null;
  files?: PlaceFile[];
}): Promise<{ place: Place }> {
  return apiFetch('/api/places', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePlace(
  id: string,
  data: Partial<Place>
): Promise<{ place: Place }> {
  return apiFetch(`/api/places/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deletePlace(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/places/${id}`, {
    method: 'DELETE',
  });
}

export async function uploadPlaceFile(file: File): Promise<{ file: PlaceFile }> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch('/api/storage/upload', {
    method: 'POST',
    body: formData,
  });
}

export async function parseGmapsUrl(url: string): Promise<{ success: boolean; data: GmapsParsedPlace }> {
  return apiFetch('/api/places/parse-gmaps', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

// =============================================================================
// TRIPS CRUD
// =============================================================================

export async function fetchTrips(): Promise<{ trips: Trip[] }> {
  return apiFetch('/api/trips');
}

export async function fetchTrip(id: string): Promise<{ trip: Trip }> {
  return apiFetch(`/api/trips/${id}`);
}

export async function createTrip(data: {
  name: string;
  description?: string;
  start_date?: string | null;
  end_date?: string | null;
  places?: { place_id: string; order_index?: number; visit_time?: string; notes?: string }[];
}): Promise<{ trip: Trip }> {
  return apiFetch('/api/trips', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTrip(
  id: string,
  data: Partial<Trip>
): Promise<{ trip: Trip }> {
  return apiFetch(`/api/trips/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTrip(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/trips/${id}`, {
    method: 'DELETE',
  });
}

// =============================================================================
// ROULETTE CRUD & SPINNING
// =============================================================================

export async function fetchRoulettes(): Promise<{ roulettes: Roulette[] }> {
  return apiFetch('/api/roulettes');
}

export async function fetchRoulette(id: string): Promise<{ roulette: Roulette }> {
  return apiFetch(`/api/roulettes/${id}`);
}

export async function createRoulette(data: {
  title: string;
  description?: string;
  type: 'trips' | 'places';
  items: RouletteItem[];
  protection_type: 'google' | 'token';
  allowed_emails?: string[];
  access_token?: string;
}): Promise<{ roulette: Roulette }> {
  return apiFetch('/api/roulettes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateRoulette(
  id: string,
  data: Partial<Roulette>
): Promise<{ roulette: Roulette }> {
  return apiFetch(`/api/roulettes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteRoulette(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/roulettes/${id}`, {
    method: 'DELETE',
  });
}

export async function spinRouletteAdmin(id: string): Promise<{
  winner: RouletteItem;
  auditLog: RouletteAuditLog;
  message: string;
}> {
  return apiFetch(`/api/roulettes/${id}/spin`, {
    method: 'POST',
  });
}

// =============================================================================
// PROTECTED SHARED ROULETTE LINK
// =============================================================================

export async function fetchSharedRoulette(
  id: string,
  options?: { token?: string; googleToken?: string }
): Promise<{
  roulette: Pick<
    Roulette,
    'id' | 'title' | 'description' | 'type' | 'items' | 'protection_type' | 'updated_at' | 'created_at'
  >;
  last5Runs: RouletteAuditLog[];
  authenticatedAs: string | null;
  requiresAuth: boolean;
  protectionType: 'google' | 'token';
}> {
  const headers: Record<string, string> = {};
  if (options?.token) {
    headers['X-Access-Token'] = options.token;
  }
  return apiFetch(
    `/api/roulettes/share/${id}`,
    { headers },
    options?.googleToken
  );
}

export async function spinSharedRoulette(
  id: string,
  options?: { token?: string; googleToken?: string }
): Promise<{
  winner: RouletteItem;
  auditLog?: RouletteAuditLog;
  auditLogId: string;
  executedAt: string;
  message: string;
}> {
  const headers: Record<string, string> = {};
  if (options?.token) {
    headers['X-Access-Token'] = options.token;
  }
  return apiFetch(
    `/api/roulettes/share/${id}/spin`,
    {
      method: 'POST',
      headers,
    },
    options?.googleToken
  );
}

// =============================================================================
// AUDIT LOGS (IMMUTABLE)
// =============================================================================

export async function fetchAuditLogs(rouletteId?: string): Promise<{
  logs: RouletteAuditLog[];
  total: number;
}> {
  const q = rouletteId ? `?roulette_id=${encodeURIComponent(rouletteId)}` : '';
  return apiFetch(`/api/audit${q}`);
}

// =============================================================================
// RBAC SETTINGS
// =============================================================================

export async function fetchRoles(): Promise<{ roles: Role[] }> {
  return apiFetch('/api/rbac/roles');
}

export async function createRole(data: {
  name: string;
  description?: string;
  permissions: string[];
  emails: string[];
}): Promise<{ role: Role }> {
  return apiFetch('/api/rbac/roles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateRole(
  id: string,
  data: {
    name?: string;
    description?: string;
    permissions?: string[];
    emails?: string[];
  }
): Promise<{ role: Role }> {
  return apiFetch(`/api/rbac/roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteRole(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/rbac/roles/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchPermissionsList(): Promise<{ permissions: PermissionDefinition[] }> {
  return apiFetch('/api/rbac/permissions');
}
