-- ============================================================
-- M2 MIGRATION: Snapshots, Contracts, Constraints
-- ============================================================

-- -----------------------------------------------------------
-- 1. SNAPSHOTS — stored response baselines for regression testing
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS snapshots (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id      UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  status_code     INTEGER,
  response_headers JSONB DEFAULT '{}',
  response_body   TEXT,
  response_size   INTEGER,
  latency_ms      INTEGER,
  tags            TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
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

-- -----------------------------------------------------------
-- 2. CONTRACTS — schema contracts for OpenAPI/JSON Schema validation
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS contracts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id      UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  schema_url      TEXT,
  schema_body     JSONB NOT NULL,
  description     TEXT DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
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

DO $$ BEGIN
  CREATE TRIGGER update_contracts_updated_at
    BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------
-- 3. CHECK CONSTRAINTS (normalize existing data first)
-- -----------------------------------------------------------

-- Normalize assertions.operator values before adding constraint
UPDATE assertions SET operator = 'equals' WHERE operator NOT IN ('equals','notEquals','contains','notContains','exists','greaterThan','lessThan');
UPDATE assertions SET operator = 'equals' WHERE operator IS NULL;

-- Normalize requests.method
UPDATE requests SET method = 'GET' WHERE method IS NULL OR method = '';

-- Normalize requests.body_type
UPDATE requests SET body_type = 'none' WHERE body_type IS NULL OR body_type = '';

-- requests.method — restrict to valid HTTP methods
DO $$ BEGIN
  ALTER TABLE requests ADD CONSTRAINT chk_requests_method
    CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- requests.body_type — restrict to valid body types
DO $$ BEGIN
  ALTER TABLE requests ADD CONSTRAINT chk_requests_body_type
    CHECK (body_type IN ('none', 'json', 'raw', 'form-data', 'x-www-form-urlencoded', 'binary'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- assertions.operator — restrict to valid operators
DO $$ BEGIN
  ALTER TABLE assertions ADD CONSTRAINT chk_assertions_operator
    CHECK (operator IN ('equals', 'notEquals', 'contains', 'notContains', 'exists', 'greaterThan', 'lessThan'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- collection_runs.status — restrict to valid statuses
DO $$ BEGIN
  ALTER TABLE collection_runs ADD CONSTRAINT chk_collection_runs_status
    CHECK (status IN ('running', 'completed', 'failed', 'cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------
-- 4. UNIQUE CONSTRAINTS
-- -----------------------------------------------------------

-- No duplicate variable names per request
DO $$ BEGIN
  ALTER TABLE variable_extractions ADD CONSTRAINT uq_var_extractions_request_var
    UNIQUE (request_id, variable_name);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- No duplicate environment variable keys per environment
DO $$ BEGIN
  ALTER TABLE environment_variables ADD CONSTRAINT uq_env_vars_env_key
    UNIQUE (environment_id, key);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- -----------------------------------------------------------
-- 5. ADD created_at TO benchmark_runs (standard timestamp column)
-- -----------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE benchmark_runs ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- -----------------------------------------------------------
-- 6. REPORTS TABLE (if not already present from 001 migration)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id   UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  share_token     TEXT NOT NULL UNIQUE,
  report_type     TEXT NOT NULL DEFAULT 'collection' CHECK (report_type IN ('collection', 'request')),
  report_data     JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_share_token ON reports(share_token);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can manage their own reports"
    ON reports FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------
-- 7. RPC: get_shared_report (if not already present)
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION get_shared_report(token text)
RETURNS jsonb AS $$
DECLARE
  report_record record;
BEGIN
  SELECT * INTO report_record FROM reports WHERE share_token = token LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN row_to_json(report_record)::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Force PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
