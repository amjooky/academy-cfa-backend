-- 1. Shared Global Schema
CREATE SCHEMA IF NOT EXISTS shared;

CREATE TABLE shared.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  domain TEXT UNIQUE,
  plan TEXT DEFAULT 'STARTER', -- STARTER, PRO, ELITE
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shared.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES shared.tenants(id) ON DELETE CASCADE,
  plan TEXT DEFAULT 'STARTER',
  status TEXT DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  konnect_sub_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default tenant for bootstrap testing
INSERT INTO shared.tenants (id, name, subdomain, plan, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Academy', 'demo', 'PRO', TRUE)
ON CONFLICT DO NOTHING;

-- Seed default subscription for bootstrap testing
INSERT INTO shared.subscriptions (tenant_id, plan, status, current_period_end)
VALUES ('00000000-0000-0000-0000-000000000001', 'PRO', 'active', NOW() + INTERVAL '1 year')
ON CONFLICT DO NOTHING;

-- 2. Helper Function to Provision New Tenant Schema Automatically
CREATE OR REPLACE FUNCTION shared.provision_tenant(tenant_id UUID)
RETURNS VOID AS $$
DECLARE
  schema_name TEXT := 'tenant_' || replace(tenant_id::text, '-', '');
BEGIN
  -- Create isolated tenant schema
  EXECUTE 'CREATE SCHEMA IF NOT EXISTS ' || schema_name;

  -- Create isolated Users table in tenant schema
  EXECUTE 'CREATE TABLE IF NOT EXISTS ' || schema_name || '.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password_hash TEXT,
    role TEXT NOT NULL,
    kyc_status TEXT DEFAULT ''pending'',
    tenant_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )';

  -- Create isolated Academy Profile table
  EXECUTE 'CREATE TABLE IF NOT EXISTS ' || schema_name || '.academy_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    primary_color TEXT DEFAULT ''#1e3a8a'',
    secondary_color TEXT DEFAULT ''#f59e0b'',
    domain TEXT UNIQUE,
    language TEXT DEFAULT ''fr''
  )';

  -- Create isolated Players table
  EXECUTE 'CREATE TABLE IF NOT EXISTS ' || schema_name || '.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    full_name TEXT NOT NULL,
    dob DATE,
    position TEXT,
    photo_url TEXT,
    xp_total INTEGER DEFAULT 0,
    rank TEXT DEFAULT ''rookie'',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )';

  -- Create isolated Teams table
  EXECUTE 'CREATE TABLE IF NOT EXISTS ' || schema_name || '.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    age_group TEXT,
    coach_id UUID,
    season TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )';

  -- Create isolated Team-Player relational mapping table
  EXECUTE 'CREATE TABLE IF NOT EXISTS ' || schema_name || '.team_players (
    team_id UUID REFERENCES ' || schema_name || '.teams(id) ON DELETE CASCADE,
    player_id UUID REFERENCES ' || schema_name || '.players(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (team_id, player_id)
  )';

  -- Create isolated Events table
  EXECUTE 'CREATE TABLE IF NOT EXISTS ' || schema_name || '.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    type TEXT,          -- training|match|exam|tournament
    team_id UUID REFERENCES ' || schema_name || '.teams(id) ON DELETE CASCADE,
    location TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    recurrence JSONB,   -- { freq: "weekly", days: ["MON"] }
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )';

  -- Create isolated Attendance tracking table
  EXECUTE 'CREATE TABLE IF NOT EXISTS ' || schema_name || '.attendance (
    event_id UUID REFERENCES ' || schema_name || '.events(id) ON DELETE CASCADE,
    player_id UUID REFERENCES ' || schema_name || '.players(id) ON DELETE CASCADE,
    status TEXT,        -- present|absent|late|excused
    marked_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (event_id, player_id)
  )';

  -- Create isolated Evaluations table
  EXECUTE 'CREATE TABLE IF NOT EXISTS ' || schema_name || '.evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES ' || schema_name || '.players(id) ON DELETE CASCADE,
    coach_id UUID,
    event_id UUID REFERENCES ' || schema_name || '.events(id) ON DELETE CASCADE,
    scores JSONB,       -- { speed: 7, technique: 8, ... }
    overall INTEGER,
    notes TEXT,
    evaluated_at TIMESTAMPTZ DEFAULT NOW()
  )';

  -- Create isolated Invoices table (Billing history for players paying the academy)
  EXECUTE 'CREATE TABLE IF NOT EXISTS ' || schema_name || '.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES ' || schema_name || '.players(id) ON DELETE CASCADE,
    amount DECIMAL(10,3),
    currency TEXT DEFAULT ''TND'',
    status TEXT DEFAULT ''pending'',
    pdf_url TEXT,
    issued_at TIMESTAMPTZ DEFAULT NOW()
  )';

  -- Create isolated Player Achievements/Badges unlocked log table
  EXECUTE 'CREATE TABLE IF NOT EXISTS ' || schema_name || '.player_badges (
    player_id UUID REFERENCES ' || schema_name || '.players(id) ON DELETE CASCADE,
    badge_name TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (player_id, badge_name)
  )';

  -- Seed dummy values into default tenant schema for testing
  IF tenant_id = '00000000-0000-0000-0000-000000000001' THEN
    EXECUTE 'INSERT INTO ' || schema_name || '.academy_profile (name, primary_color) VALUES (''Demo Academy'', ''#2563EB'') ON CONFLICT DO NOTHING';
    EXECUTE 'INSERT INTO ' || schema_name || '.users (email, password_hash, role, tenant_id) VALUES (''coach@demo.com'', ''password'', ''COACH'', ''' || tenant_id || ''') ON CONFLICT DO NOTHING';
    EXECUTE 'INSERT INTO ' || schema_name || '.users (email, password_hash, role, tenant_id) VALUES (''admin@demo.com'', ''password'', ''ACADEMY_ADMIN'', ''' || tenant_id || ''') ON CONFLICT DO NOTHING';
  END IF;

END;
$$ LANGUAGE plpgsql;

-- Execute initial provisioning for the bootstrap demo tenant
SELECT shared.provision_tenant('00000000-0000-0000-0000-000000000001');
