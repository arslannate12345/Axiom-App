-- Axiom | Migration 004: Snapshots & Contracts
-- Run this in Supabase SQL Editor (copy-paste the entire file)
-- ============================================================

-- SNAPSHOTS (response baselines for regression testing)
CREATE TABLE IF NOT EXISTS snapshots (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id       UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  status_code      INTEGER,
  response_headers JSONB DEFAULT '{}',
  response_body    TEXT,
  response_size    INTEGER,
  latency_ms       INTEGER,
  tags             JSONB DEFAULT '[]',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_request_id ON snapshots(request_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_user_id ON snapshots(user_id);

ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can manage own snapshots"
    ON snapshots FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------

-- CONTRACTS (schema/API contracts for validation)
CREATE TABLE IF NOT EXISTS contracts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id    UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  schema_url    TEXT,
  schema_body   JSONB NOT NULL DEFAULT '{}',
  description   TEXT DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contracts_request_id ON contracts(request_id);
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON contracts(user_id);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can manage own contracts"
    ON contracts FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
