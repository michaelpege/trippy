# Trippy 🧭

> Smart Trip Planner with Places, Trips, Weighted Roulette, RBAC & Cloudflare Serverless Deployment.

[![CI](https://github.com/trippy/trippy/actions/workflows/ci.yml/badge.svg)](https://github.com/trippy/trippy/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)

---

## Architecture Overview

Trippy is built on an enterprise-grade, zero-cost serverless architecture:

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend: Next.js 15 (Static Export `out`)                 │
│  Hosted on Cloudflare Pages                                 │
└─────────────────────┬───────────────────────────────────────┘
                      │ API Requests (Bearer Token)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend: Cloudflare Worker (Edge TypeScript)               │
│  Routing, Google Auth verification, RBAC & Storage Proxy    │
│  (Optional Go backend in apps/backend-go)                   │
└─────────────────────┬───────────────────────────────────────┘
                      │ Optimized PostgREST / Connection Pool
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Database & Storage: Supabase (PostgreSQL Free Tier)        │
│  - Places, Trips, Roulettes, Roles, Members                 │
│  - Immutable Audit Logs with Postgres Triggers              │
│  - Storage Bucket: trippy-files                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Features

- **📍 Places Management**:
  - Types: `"Restaurant"`, `"Mall"`, `"Public spaces"`, `"other"`.
  - Zero to many static file attachments (stored in Supabase Storage with public CDN URLs).
  - 1-click Google Maps route from user's current GPS location.
  - Real-time Haversine distance in km, driving time by car, and riding time by motorcycle.
- **🗺️ Trips Itineraries**:
  - Group zero to many places in ordered sequences.
  - Schedule visit times, notes, and launch multi-stop Google Maps routes.
- **🎡 Weighted Roulette**:
  - Spin between **Places** or **Trips**.
  - Configurable weights for each candidate item.
  - Interactive spinning wheel with confetti celebration.
  - **Protected shareable link**: Secured by either Google Sign-In (whitelisted Gmail accounts) or static passcode/token.
- **🛡️ Immutable Audit Logging**:
  - Every roulette execution is recorded permanently with winner, candidate pool, executor, IP, and timestamp.
  - **Cannot be deleted or modified**: Enforced by database triggers, worker middleware, and UI restrictions.
- **🔐 RBAC & Security**:
  - Google Sign-In with edge token verification.
  - Settings sub-page for Role-Based Access Control (`/settings/rbac`).
  - Create roles, assign granular permissions, and authorize email addresses.
  - Multi-role support with merged permissions.
  - **Confirmation Modals**: Every create, edit, and delete action requires confirmation.
- **🚀 One-Time `/setup` Endpoint**:
  - Only accessible if the database is uninitialized.
  - Runs migration and registers the first Gmail address as System Owner.
  - Permanently locked once initialized.

---

## Monorepo Layout

```
trippy/
├── .github/workflows/
│   ├── ci.yml                 # PR & push validation
│   └── deploy.yml             # Cloudflare Pages & Workers deployment
├── apps/
│   ├── frontend/              # Next.js 15 App Router (Static Export)
│   ├── worker/                # Cloudflare Worker (TypeScript API)
│   └── backend-go/            # Optional standalone Go backend
├── supabase/
│   ├── migrations/            # Migration SQL files
│   └── schema.sql             # Full idempotent schema with immutable trigger
├── docs/                      # Comprehensive feature documentation
│   ├── setup_and_initialization.md
│   ├── places_management.md
│   ├── trips_management.md
│   ├── roulette_and_sharing.md
│   ├── audit_logging.md
│   ├── rbac_and_auth.md
│   ├── distance_and_routing.md
│   ├── file_storage.md
│   ├── database_schema_and_optimization.md
│   ├── deployment_and_cloudflare.md
│   └── go_backend_alternative.md
├── package.json
├── pnpm-workspace.yaml
├── Makefile
└── README.md
```

---

## Getting Started

### 1. Prerequisites
- Node.js >= 20, pnpm >= 8
- A free Supabase account ([supabase.com](https://supabase.com))
- A Google Cloud OAuth Client ID

### 2. Initialize Database
In your Supabase project dashboard, open the **SQL Editor** and execute:
```sql
supabase/schema.sql
```
*(Also create a public storage bucket named `trippy-files` under Supabase Storage)*.

### 3. Configure Local Environment

In `apps/worker`:
```bash
cp .dev.vars.example .dev.vars
# Fill in your SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_PUBLISHABLE_KEY
```

In `apps/frontend`:
```bash
cp .env.example .env.local
# Set NEXT_PUBLIC_WORKER_URL=http://localhost:8787
# Set NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

### 4. Install & Run Locally

```bash
# Install dependencies
pnpm install

# Start both frontend and worker concurrently
pnpm dev
```

Visit [http://localhost:3000/setup](http://localhost:3000/setup) to initialize your system and register the first Gmail as the System Owner!

---

## Deployment to Cloudflare

Detailed instructions are available in [docs/deployment_and_cloudflare.md](docs/deployment_and_cloudflare.md).

### Deploy Worker
```bash
cd apps/worker
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SECRET_KEY
wrangler secret put SUPABASE_PUBLISHABLE_KEY
pnpm wrangler deploy
```

### Deploy Frontend
```bash
cd apps/frontend
pnpm build
pnpm exec wrangler pages deploy out --project-name=trippy
```

---

## Documentation

Full documentation for each feature:
- [Setup & Initialization Guide](docs/setup_and_initialization.md)
- [Places Management](docs/places_management.md)
- [Trips Management](docs/trips_management.md)
- [Roulette & Protected Links](docs/roulette_and_sharing.md)
- [Immutable Audit Logging](docs/audit_logging.md)
- [RBAC & Authentication](docs/rbac_and_auth.md)
- [Distance & Route Directions](docs/distance_and_routing.md)
- [File Storage](docs/file_storage.md)
- [Database Schema & Optimizations](docs/database_schema_and_optimization.md)
- [Cloudflare Deployment & CI/CD](docs/deployment_and_cloudflare.md)
- [Go Backend Alternative](docs/go_backend_alternative.md)
