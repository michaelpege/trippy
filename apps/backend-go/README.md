# Trippy Go Backend (Alternative)

This directory provides an optional standalone Go backend that exposes identical endpoints to the primary Cloudflare Worker.

## Usage

### Run locally
```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SECRET_KEY="your-service-role-key"
go run ./cmd/server
```

### Docker
```bash
docker build -t trippy-backend-go .
docker run -p 8080:8080 -e SUPABASE_URL=... -e SUPABASE_SECRET_KEY=... trippy-backend-go
```
