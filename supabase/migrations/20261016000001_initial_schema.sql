-- Migration: 20261016000001_initial_schema.sql
-- Trippy initial schema migration

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS role_members (
    id TEXT PRIMARY KEY DEFAULT ('rm_' || replace(gen_random_uuid()::text, '-', '')),
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(role_id, email)
);

CREATE INDEX IF NOT EXISTS idx_role_members_role_id ON role_members(role_id);
CREATE INDEX IF NOT EXISTS idx_role_members_email ON role_members(LOWER(email));

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
