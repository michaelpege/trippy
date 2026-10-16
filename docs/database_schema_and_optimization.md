# Database Schema & Supabase Free-Tier Optimization

## Overview

The user prompt specifies:
> *"Database will use supabase free tier so make sure the queries are efficient to not cause any cost."*

To operate completely within Supabase's free tier (500 MB database, 2 CPU cores, 50,000 monthly active users, 1 GB storage), the schema is designed for maximum query speed and minimal compute consumption.

All tables are prefixed with `trippy_` to safely coexist in shared Supabase projects (e.g. alongside other apps) without table name collisions or permission interference.

---

## Efficiency & Cost-Saving Optimizations

1. **Strategic B-Tree Indexes**:
   - Every foreign key and filtered column has dedicated B-Tree indexes:
     - `idx_trippy_places_type` on `trippy_places(type)`
     - `idx_trippy_places_created_at` on `trippy_places(created_at DESC)`
     - `idx_trippy_role_members_email` on `trippy_role_members(LOWER(email))`
     - `idx_trippy_trip_places_trip_id` on `trippy_trip_places(trip_id)`
     - `idx_trippy_trip_places_order` on `trippy_trip_places(trip_id, order_index ASC)`
     - `idx_trippy_audit_roulette_id` on `trippy_audit_logs(roulette_id)`
     - `idx_trippy_audit_created_at` on `trippy_audit_logs(created_at DESC)`
   - Avoids full-table sequential scans.

2. **JSONB Denormalization for Candidate Snapshots & Files**:
   - Place files and roulette candidates are stored as `JSONB` directly within their parent record.
   - Eliminates complex joins and N+1 queries when rendering cards and candidate pools.

3. **Batched Joining**:
   - `trippy_trips` and `trippy_trip_places` are fetched in a single grouped query (`.in('trip_id', tripIds)`) rather than querying each trip's places sequentially.

4. **Lean Column Selections & Pagination**:
   - Audit logs and lists default to `limit: 50` with offset pagination to keep memory usage low.

5. **Connection Reuse on Cloudflare Edge**:
   - The Supabase client is cached in Worker global memory between warm invocations, avoiding connection handshakes on every request.

---

## Schema Overview

```
trippy_system_settings (key, value, created_at, updated_at)
       │
trippy_roles (id, name, description, permissions)
       │ (1 to N)
trippy_role_members (id, role_id -> trippy_roles.id, email)

trippy_places (id, name, type, description, address, gmaps_url, latitude, longitude, files)
       │
       │ (1 to N)
trippy_trip_places (id, trip_id -> trippy_trips.id, place_id -> trippy_places.id, order_index, visit_time, notes)
       │
trippy_trips (id, name, description, start_date, end_date)

trippy_roulettes (id, title, description, type, items, protection_type, allowed_emails, access_token)
       │
       │ (1 to N, ON DELETE RESTRICT)
trippy_audit_logs (id, roulette_id, roulette_title, type, selected_item_title, candidate_pool, executed_by_*)
       ▲
       │ (PostgreSQL trigger: prevent_trippy_audit_log_mutation() blocks all DELETE & UPDATE)
```
