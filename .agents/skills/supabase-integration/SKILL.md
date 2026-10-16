---
name: supabase-integration
description: >-
  Guides Supabase integration standards, enforcing the modern API key architecture (Publishable Key
  and Secret Key instead of legacy anon / service_role keys), connection pooling, RLS enforcement,
  safe multi-app table isolation, and automated migration workflows.
  Activate whenever configuring Supabase, environment variables, API clients, authentication,
  or database migrations.
---

# Supabase Integration Standard

This skill establishes the architectural and configuration standards for integrating Supabase into full-stack and serverless applications.

---

## 1. Modern API Key Architecture

Supabase has transitioned from legacy JWT-based keys (`anon` and `service_role`) to a clear, scoped key standard:

| Key Type | Environment Variable | Key Format Prefix | Where to Use | RLS Behavior | Security Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Publishable Key** | `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` (or legacy `anon`) | Frontend, browser, mobile apps, client SDKs | **Enforced** (Obeys all PostgreSQL RLS policies) | Public (Safe to expose in client bundles) |
| **Secret Key** | `SUPABASE_SECRET_KEY` | `sb_secret_...` (or legacy `service_role`) | Backend APIs, Cloudflare Workers, Node.js servers, Go | **Bypassed** (Full admin access to all tables) | **Confidential** (Never leak to clients or Git) |
| **Personal Access Token** | `SUPABASE_ACCESS_TOKEN` | `sbp_...` | CI/CD pipelines, setup scripts, Management API | System-level project management | **Confidential** (Used for automated DDL migrations) |

### ⚠️ Deprecation Rule:
* **Avoid legacy naming**: Replace `SUPABASE_ANON_KEY` with `SUPABASE_PUBLISHABLE_KEY`.
* **Avoid legacy naming**: Replace `SUPABASE_SERVICE_ROLE_KEY` with `SUPABASE_SECRET_KEY`.
* In client factories, accept both new and legacy names for backward compatibility:
  ```ts
  const secretKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
  ```

---

## 2. Standard Environment Variable Templates

### Backend / Serverless Worker (`.dev.vars` / Wrangler Secrets / Docker)
```ini
# Supabase Project
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SECRET_KEY=sb_secret_... (or service_role key)
SUPABASE_PUBLISHABLE_KEY=sb_publishable_... (or anon key)
SUPABASE_STORAGE_BUCKET=app-files

# Optional: Personal Access Token for 1-click automated DDL migrations
SUPABASE_ACCESS_TOKEN=sbp_...
```

### Frontend Client (`.env.local` / Cloudflare Pages / Vercel)
```ini
# Only publishable variables may be exposed to the client
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

---

## 3. Serverless Client Initialization Pattern (Cloudflare Workers / Edge)

Edge runtimes should cache the Supabase client instance in global scope to reuse TCP connections across warm invocations:

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;
let cachedKey: string | null = null;

export function getSupabaseClient(env: { SUPABASE_URL: string; SUPABASE_SECRET_KEY?: string; SUPABASE_PUBLISHABLE_KEY?: string }): SupabaseClient {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase configuration (SUPABASE_URL and SUPABASE_SECRET_KEY or SUPABASE_PUBLISHABLE_KEY)');
  }

  if (cachedClient && cachedKey === key) {
    return cachedClient;
  }

  cachedClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  cachedKey = key;
  return cachedClient;
}
```

---

## 4. Multi-App Project Sharing on Supabase Free Tier

To stay within the Supabase Free Tier (2 projects per organization limit, 500MB DB) across multiple micro-apps or personal projects:

1. **Table Prefixing**: Always prefix database tables with the application name (e.g. `<app_name>_<table_name>`):
   * Example: `trippy_places`, `trippy_trips`, `trippy_roles` alongside `hub_goals`, `hub_books`.
   * Avoids naming collisions and permission mixups in the default `public` schema.
2. **Preventing 7-Day Inactivity Pauses**:
   * Free-tier Supabase projects pause after 7 consecutive days of zero database queries.
   * Add a lightweight scheduled Cloudflare Worker cron trigger (`0 3 * * *`) that executes a health check query (`SELECT 1`) to keep the database permanently warm.
3. **Storage Isolation**:
   * Create separate buckets per application (e.g. `trippy-files`, `hub-files`) within the same Supabase storage dashboard.

---

## 5. Automated 1-Click Schema Migrations

Instead of requiring users to manually copy-paste `.sql` files into the Supabase web dashboard SQL Editor:

Use the Supabase Management API via `SUPABASE_ACCESS_TOKEN`:
```typescript
const projectRef = new URL(env.SUPABASE_URL).hostname.split('.')[0];

const response = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: DDL_SQL_STRING }),
  }
);
```

---

## 6. Security Checklist

- [ ] **No Secret Keys in Git**: Ensure `.dev.vars`, `.env`, and `.env.*.local` are listed in `.gitignore`.
- [ ] **No Secret Keys in Frontend**: Verify `SUPABASE_SECRET_KEY` is never prefixed with `NEXT_PUBLIC_` or imported into client components.
- [ ] **Row Level Security (RLS)**: Any table accessed via `SUPABASE_PUBLISHABLE_KEY` must have RLS enabled (`ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`).
- [ ] **Immutable Audit Records**: Use PostgreSQL triggers (`BEFORE DELETE OR UPDATE RAISE EXCEPTION`) to protect audit trails from mutation even by administrators.
