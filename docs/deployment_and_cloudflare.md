# Deployment & Cloudflare Integration

## Overview

Trippy follows the architecture established in `michael-hub`:
- **Frontend**: Next.js App Router with Static Export (`output: 'export'`) deployed to **Cloudflare Pages**.
- **Backend API**: Serverless TypeScript service deployed to **Cloudflare Workers**.
- **Database**: PostgreSQL hosted on **Supabase** (Free Tier).

This setup delivers global edge latency (<50ms worldwide) and zero operational infrastructure costs.

---

## Prerequisites

1. Cloudflare Account & API Token (`Workers:Edit`, `Pages:Edit`).
2. Supabase Project with schema executed (`supabase/schema.sql`).
3. Google Cloud OAuth Client ID (for Google Identity Services).

---

## 1. Deploy Cloudflare Worker (Backend)

```bash
cd apps/worker

# Set Supabase Secrets in Cloudflare
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SECRET_KEY
wrangler secret put SUPABASE_PUBLISHABLE_KEY

# Deploy to Cloudflare edge
pnpm wrangler deploy
```

Once deployed, note your worker URL (e.g. `https://trippy-worker.yourname.workers.dev`).

---

## 2. Deploy Cloudflare Pages (Frontend)

```bash
cd apps/frontend

# Configure environment variables
export NEXT_PUBLIC_WORKER_URL="https://trippy-worker.yourname.workers.dev"
export NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"

# Build static export (generates apps/frontend/out)
pnpm build

# Deploy to Cloudflare Pages
wrangler pages deploy out --project-name=trippy
```

---

## 3. Automated GitHub Actions CI/CD

Trippy includes automated CI/CD workflows modeled after `michael-hub`:

### CI (`.github/workflows/ci.yml`)
- Triggers on PR and pushes to `main`.
- Runs `type-check`, `lint`, and `build` across both frontend and worker.

### Deploy (`.github/workflows/deploy.yml`)
- Triggers on pushes to `main`.
- Deploys the worker using `wrangler deploy`.
- Builds and deploys the static export to Cloudflare Pages using `wrangler pages deploy out`.

### GitHub Secrets Required
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `NEXT_PUBLIC_WORKER_URL`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
