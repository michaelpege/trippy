-- =============================================================================
-- TRIPPY DATABASE SCHEMA (Supabase PostgreSQL Free Tier Optimized)
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
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_system_settings_updated_at ON system_settings;
CREATE TRIGGER trg_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 2. RBAC: ROLES & ROLE MEMBERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_created_at ON roles(created_at DESC);

DROP TRIGGER IF EXISTS trg_roles_updated_at ON roles;
CREATE TRIGGER trg_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS role_members (
    id TEXT PRIMARY KEY DEFAULT ('rm_' || replace(gen_random_uuid()::text, '-', '')),
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(role_id, email)
);

CREATE INDEX IF NOT EXISTS idx_role_members_role_id ON role_members(role_id);
CREATE INDEX IF NOT EXISTS idx_role_members_email ON role_members(LOWER(email));

-- =============================================================================
-- 3. PLACES (Restaurant, Mall, Public spaces, other)
-- =============================================================================
CREATE TABLE IF NOT EXISTS places (
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

CREATE INDEX IF NOT EXISTS idx_places_type ON places(type);
CREATE INDEX IF NOT EXISTS idx_places_created_at ON places(created_at DESC);

DROP TRIGGER IF EXISTS trg_places_updated_at ON places;
CREATE TRIGGER trg_places_updated_at
    BEFORE UPDATE ON places
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 4. TRIPS & TRIP PLACES
-- =============================================================================
CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY DEFAULT ('tr_' || replace(gen_random_uuid()::text, '-', '')),
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at DESC);

DROP TRIGGER IF EXISTS trg_trips_updated_at ON trips;
CREATE TRIGGER trg_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS trip_places (
    id TEXT PRIMARY KEY DEFAULT ('tp_' || replace(gen_random_uuid()::text, '-', '')),
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0,
    visit_time TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_places_trip_id ON trip_places(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_places_place_id ON trip_places(place_id);
CREATE INDEX IF NOT EXISTS idx_trip_places_order ON trip_places(trip_id, order_index ASC);

-- =============================================================================
-- 5. ROULETTE (Trips or Places with weights, protection & shareable link)
-- =============================================================================
CREATE TABLE IF NOT EXISTS roulettes (
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

CREATE INDEX IF NOT EXISTS idx_roulettes_type ON roulettes(type);
CREATE INDEX IF NOT EXISTS idx_roulettes_created_at ON roulettes(created_at DESC);

DROP TRIGGER IF EXISTS trg_roulettes_updated_at ON roulettes;
CREATE TRIGGER trg_roulettes_updated_at
    BEFORE UPDATE ON roulettes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 6. ROULETTE AUDIT LOGS (IMMUTABLE - CANNOT BE DELETED OR MODIFIED)
-- =============================================================================
CREATE TABLE IF NOT EXISTS roulette_audit_logs (
    id TEXT PRIMARY KEY DEFAULT ('aud_' || replace(gen_random_uuid()::text, '-', '')),
    roulette_id TEXT NOT NULL REFERENCES roulettes(id) ON DELETE RESTRICT,
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

CREATE INDEX IF NOT EXISTS idx_audit_roulette_id ON roulette_audit_logs(roulette_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON roulette_audit_logs(created_at DESC);

-- STRICT IMMUTABILITY TRIGGER: PREVENTS ALL DELETES AND UPDATES ON AUDIT LOGS
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable. Deletion and modification are strictly prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_delete ON roulette_audit_logs;
CREATE TRIGGER trg_prevent_audit_delete
    BEFORE DELETE OR UPDATE ON roulette_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_mutation();

-- Comments for documentation
COMMENT ON TABLE system_settings IS 'Stores setup status and initial configuration';
COMMENT ON TABLE roles IS 'RBAC roles defining permission sets';
COMMENT ON TABLE role_members IS 'RBAC role assignments mapping roles to user email addresses';
COMMENT ON TABLE places IS 'Places of interest (Restaurant, Mall, Public spaces, other) with files and GMaps link';
COMMENT ON TABLE trips IS 'Trip itineraries containing zero to many places';
COMMENT ON TABLE trip_places IS 'Junction mapping places inside trips with ordered sequence';
COMMENT ON TABLE roulettes IS 'Weighted roulette configs for picking trips or places';
COMMENT ON TABLE roulette_audit_logs IS 'Immutable append-only audit trail of all roulette executions';
