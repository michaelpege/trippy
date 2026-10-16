-- =============================================================================
-- TRIPPY DATABASE SCHEMA (Supabase PostgreSQL Free Tier Optimized)
-- Multi-App Safe: Uses 'trippy_' prefix to coexist in shared databases.
-- =============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. SYSTEM SETTINGS (For /setup and system state)
-- =============================================================================
CREATE TABLE IF NOT EXISTS trippy_system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_trippy_system_settings_updated_at ON trippy_system_settings;
CREATE TRIGGER trg_trippy_system_settings_updated_at
    BEFORE UPDATE ON trippy_system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 2. RBAC: ROLES & ROLE MEMBERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS trippy_roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trippy_roles_name ON trippy_roles(name);
CREATE INDEX IF NOT EXISTS idx_trippy_roles_created_at ON trippy_roles(created_at DESC);

DROP TRIGGER IF EXISTS trg_trippy_roles_updated_at ON trippy_roles;
CREATE TRIGGER trg_trippy_roles_updated_at
    BEFORE UPDATE ON trippy_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS trippy_role_members (
    id TEXT PRIMARY KEY DEFAULT ('rm_' || replace(gen_random_uuid()::text, '-', '')),
    role_id TEXT NOT NULL REFERENCES trippy_roles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(role_id, email)
);

CREATE INDEX IF NOT EXISTS idx_trippy_role_members_role_id ON trippy_role_members(role_id);
CREATE INDEX IF NOT EXISTS idx_trippy_role_members_email ON trippy_role_members(LOWER(email));

-- =============================================================================
-- 3. PLACES (Restaurant, Mall, Public spaces, other)
-- =============================================================================
CREATE TABLE IF NOT EXISTS trippy_places (
    id TEXT PRIMARY KEY DEFAULT ('pl_' || replace(gen_random_uuid()::text, '-', '')),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Restaurant', 'Mall', 'Public spaces', 'other')),
    description TEXT,
    address TEXT,
    gmaps_url TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    files JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trippy_places_type ON trippy_places(type);
CREATE INDEX IF NOT EXISTS idx_trippy_places_created_at ON trippy_places(created_at DESC);

DROP TRIGGER IF EXISTS trg_trippy_places_updated_at ON trippy_places;
CREATE TRIGGER trg_trippy_places_updated_at
    BEFORE UPDATE ON trippy_places
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 4. TRIPS & TRIP PLACES
-- =============================================================================
CREATE TABLE IF NOT EXISTS trippy_trips (
    id TEXT PRIMARY KEY DEFAULT ('tr_' || replace(gen_random_uuid()::text, '-', '')),
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trippy_trips_created_at ON trippy_trips(created_at DESC);

DROP TRIGGER IF EXISTS trg_trippy_trips_updated_at ON trippy_trips;
CREATE TRIGGER trg_trippy_trips_updated_at
    BEFORE UPDATE ON trippy_trips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS trippy_trip_places (
    id TEXT PRIMARY KEY DEFAULT ('tp_' || replace(gen_random_uuid()::text, '-', '')),
    trip_id TEXT NOT NULL REFERENCES trippy_trips(id) ON DELETE CASCADE,
    place_id TEXT NOT NULL REFERENCES trippy_places(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0,
    visit_time TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trippy_trip_places_trip_id ON trippy_trip_places(trip_id);
CREATE INDEX IF NOT EXISTS idx_trippy_trip_places_place_id ON trippy_trip_places(place_id);
CREATE INDEX IF NOT EXISTS idx_trippy_trip_places_order ON trippy_trip_places(trip_id, order_index ASC);

-- =============================================================================
-- 5. ROULETTE (Trips or Places with weights, protection & shareable link)
-- =============================================================================
CREATE TABLE IF NOT EXISTS trippy_roulettes (
    id TEXT PRIMARY KEY DEFAULT ('rou_' || replace(gen_random_uuid()::text, '-', '')),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('trips', 'places')),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    protection_type TEXT NOT NULL CHECK (protection_type IN ('google', 'token')),
    allowed_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
    access_token TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trippy_roulettes_type ON trippy_roulettes(type);
CREATE INDEX IF NOT EXISTS idx_trippy_roulettes_created_at ON trippy_roulettes(created_at DESC);

DROP TRIGGER IF EXISTS trg_trippy_roulettes_updated_at ON trippy_roulettes;
CREATE TRIGGER trg_trippy_roulettes_updated_at
    BEFORE UPDATE ON trippy_roulettes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 6. ROULETTE AUDIT LOGS (IMMUTABLE - CANNOT BE DELETED OR MODIFIED)
-- =============================================================================
CREATE TABLE IF NOT EXISTS trippy_audit_logs (
    id TEXT PRIMARY KEY DEFAULT ('aud_' || replace(gen_random_uuid()::text, '-', '')),
    roulette_id TEXT NOT NULL REFERENCES trippy_roulettes(id) ON DELETE RESTRICT,
    roulette_title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('trips', 'places')),
    selected_item_id TEXT NOT NULL,
    selected_item_title TEXT NOT NULL,
    candidate_pool JSONB NOT NULL DEFAULT '[]'::jsonb,
    executed_by_type TEXT NOT NULL CHECK (executed_by_type IN ('google', 'token', 'admin')),
    executed_by_identifier TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trippy_audit_roulette_id ON trippy_audit_logs(roulette_id);
CREATE INDEX IF NOT EXISTS idx_trippy_audit_created_at ON trippy_audit_logs(created_at DESC);

-- STRICT IMMUTABILITY TRIGGER: PREVENTS ALL DELETES AND UPDATES ON AUDIT LOGS
CREATE OR REPLACE FUNCTION prevent_trippy_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable. Deletion and modification are strictly prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_trippy_audit_mutation ON trippy_audit_logs;
CREATE TRIGGER trg_prevent_trippy_audit_mutation
    BEFORE DELETE OR UPDATE ON trippy_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_trippy_audit_log_mutation();

-- Comments for documentation
COMMENT ON TABLE trippy_system_settings IS 'Stores setup status and initial configuration';
COMMENT ON TABLE trippy_roles IS 'RBAC roles defining permission sets';
COMMENT ON TABLE trippy_role_members IS 'RBAC role assignments mapping roles to user email addresses';
COMMENT ON TABLE trippy_places IS 'Places of interest (Restaurant, Mall, Public spaces, other) with files and GMaps link';
COMMENT ON TABLE trippy_trips IS 'Trip itineraries containing zero to many places';
COMMENT ON TABLE trippy_trip_places IS 'Junction mapping places inside trips with ordered sequence';
COMMENT ON TABLE trippy_roulettes IS 'Weighted roulette configs for picking trips or places';
COMMENT ON TABLE trippy_audit_logs IS 'Immutable append-only audit trail of all roulette executions';
