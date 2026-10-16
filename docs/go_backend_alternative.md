# Standalone Go Backend Alternative

## Overview

The user prompt specifies:
> *"Stack: next.js, if need proper backend use go."*

While the Cloudflare Worker TypeScript backend (`apps/worker`) is the primary zero-cost serverless backend, Trippy also includes a complete Go backend service in `apps/backend-go`.

This service implements the identical REST interface, CORS policies, Google token validation, and Supabase database interactions.

---

## When to Use Go Backend

1. When hosting on dedicated containers (Docker, Kubernetes, AWS ECS, GCP Cloud Run, or a VPS).
2. When high sustained throughput or complex background concurrency (goroutines, heavy CPU tasks) is required.
3. For teams with strong Go operational experience.

---

## Quickstart

### Local Run
```bash
cd apps/backend-go

export PORT=8080
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SECRET_KEY="your-service-role-key"

go run ./cmd/server
```

### Docker Container
```bash
cd apps/backend-go

docker build -t trippy-backend-go .

docker run -p 8080:8080 \
  -e PORT=8080 \
  -e SUPABASE_URL="https://your-project.supabase.co" \
  -e SUPABASE_SECRET_KEY="your-service-role-key" \
  trippy-backend-go
```

Then configure the frontend:
```bash
NEXT_PUBLIC_WORKER_URL=http://localhost:8080
```
