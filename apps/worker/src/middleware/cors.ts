/**
 * CORS handling utilities
 */

import type { CorsConfig, Env } from '../types';

export function getCorsConfig(request: Request, env: Env): CorsConfig {
  const origin = request.headers.get('Origin') || '*';
  const allowed = env.CORS_ORIGIN || '*';

  // If specific allowed origin or wildcard
  if (allowed === '*' || allowed.split(',').map((o) => o.trim()).includes(origin)) {
    return { origin };
  }

  return { origin: allowed };
}

export function handleCorsPreflight(corsConfig: CorsConfig): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': corsConfig.origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Access-Token',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export function jsonResponse(data: unknown, status = 200, corsConfig?: CorsConfig): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (corsConfig) {
    headers['Access-Control-Allow-Origin'] = corsConfig.origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

export function errorResponse(message: string, status = 400, corsConfig?: CorsConfig): Response {
  return jsonResponse({ error: message }, status, corsConfig);
}
