-- Axiom Database Schema
-- Run this in Supabase SQL Editor to initialize the database

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- WORKSPACES
-- ============================================================
CREATE TABLE workspaces (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workspaces_user_id ON workspaces(user_id);

-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own workspaces"
  ON workspaces FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- COLLECTIONS (folders grouping requests)
-- ============================================================
CREATE TABLE collections (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  parent_id    UUID REFERENCES collections(id) ON DELETE SET NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_collections_workspace_id ON collections(workspace_id);
CREATE INDEX idx_collections_parent_id ON collections(parent_id);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage collections in own workspaces"
  ON collections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = collections.workspace_id
      AND workspaces.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = collections.workspace_id
      AND workspaces.user_id = auth.uid()
    )
  );

-- ============================================================
-- REQUESTS
-- ============================================================
CREATE TABLE requests (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id         UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  method                TEXT NOT NULL DEFAULT 'GET',
  url                   TEXT NOT NULL DEFAULT '',
  headers               JSONB NOT NULL DEFAULT '[]',
  query_params          JSONB NOT NULL DEFAULT '[]',
  body_type             TEXT NOT NULL DEFAULT 'none',
  body                  JSONB,
  pre_request_script    TEXT DEFAULT '',
  post_response_script  TEXT DEFAULT '',
  sort_order            INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_requests_collection_id ON requests(collection_id);

ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage requests in own collections"
  ON requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM collections
      JOIN workspaces ON workspaces.id = collections.workspace_id
      WHERE collections.id = requests.collection_id
      AND workspaces.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections
      JOIN workspaces ON workspaces.id = collections.workspace_id
      WHERE collections.id = requests.collection_id
      AND workspaces.user_id = auth.uid()
    )
  );

-- ============================================================
-- ENVIRONMENTS
-- ============================================================
CREATE TABLE environments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_environments_workspace_id ON environments(workspace_id);

ALTER TABLE environments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage environments in own workspaces"
  ON environments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = environments.workspace_id
      AND workspaces.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = environments.workspace_id
      AND workspaces.user_id = auth.uid()
    )
  );

-- ============================================================
-- ENVIRONMENT VARIABLES
-- ============================================================
CREATE TABLE environment_variables (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  key            TEXT NOT NULL,
  value          TEXT NOT NULL DEFAULT '',
  is_secret      BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_env_vars_environment_id ON environment_variables(environment_id);

ALTER TABLE environment_variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage variables in own environments"
  ON environment_variables FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM environments
      JOIN workspaces ON workspaces.id = environments.workspace_id
      WHERE environments.id = environment_variables.environment_id
      AND workspaces.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM environments
      JOIN workspaces ON workspaces.id = environments.workspace_id
      WHERE environments.id = environment_variables.environment_id
      AND workspaces.user_id = auth.uid()
    )
  );

-- ============================================================
-- HISTORY (single request executions)
-- ============================================================
CREATE TABLE history (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id       UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status_code      INTEGER,
  latency_ms       INTEGER,
  ttfb_ms          INTEGER,
  response_size    INTEGER,
  response_headers JSONB DEFAULT '{}',
  response_body    TEXT,
  error_message    TEXT,
  is_benchmark     BOOLEAN NOT NULL DEFAULT false,
  executed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_history_request_id ON history(request_id);
CREATE INDEX idx_history_user_id ON history(user_id);
CREATE INDEX idx_history_executed_at ON history(executed_at);

ALTER TABLE history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own history"
  ON history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- BENCHMARK RUNS
-- ============================================================
CREATE TABLE benchmark_runs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id       UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_iterations INTEGER NOT NULL,
  batch_size       INTEGER NOT NULL DEFAULT 5,
  min_latency      INTEGER,
  max_latency      INTEGER,
  avg_latency      FLOAT,
  p50_latency      INTEGER,
  p95_latency      INTEGER,
  p99_latency      INTEGER,
  error_rate       FLOAT,
  total_duration   INTEGER,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at     TIMESTAMPTZ
);

CREATE INDEX idx_benchmark_runs_request_id ON benchmark_runs(request_id);
CREATE INDEX idx_benchmark_runs_user_id ON benchmark_runs(user_id);

ALTER TABLE benchmark_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own benchmark runs"
  ON benchmark_runs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- BENCHMARK ITERATIONS
-- ============================================================
CREATE TABLE benchmark_iterations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id        UUID NOT NULL REFERENCES benchmark_runs(id) ON DELETE CASCADE,
  iteration_num INTEGER NOT NULL,
  status_code   INTEGER,
  latency_ms    INTEGER,
  ttfb_ms       INTEGER,
  response_size INTEGER,
  error         TEXT,
  executed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_benchmark_iterations_run_id ON benchmark_iterations(run_id);

ALTER TABLE benchmark_iterations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own benchmark iterations"
  ON benchmark_iterations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM benchmark_runs
      WHERE benchmark_runs.id = benchmark_iterations.run_id
      AND benchmark_runs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM benchmark_runs
      WHERE benchmark_runs.id = benchmark_iterations.run_id
      AND benchmark_runs.user_id = auth.uid()
    )
  );

-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_environments_updated_at
  BEFORE UPDATE ON environments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_environment_variables_updated_at
  BEFORE UPDATE ON environment_variables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
