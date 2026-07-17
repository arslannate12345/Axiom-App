-- ============================================================
-- SAFE NUCLEAR CLEANUP - Part 2: RECREATE policies
-- Run this SECOND, after Part 1 succeeds
-- ============================================================

-- Workspaces
CREATE POLICY "Users can manage own workspaces"
  ON workspaces FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Environments
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

-- Environment Variables
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

-- Collections
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

-- Requests
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

-- History
CREATE POLICY "Users can manage own history"
  ON history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Benchmark Runs
CREATE POLICY "Users can manage own benchmark runs"
  ON benchmark_runs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Benchmark Iterations
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

-- Assertions
CREATE POLICY "Users can manage assertions for own requests"
  ON assertions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM requests
      JOIN collections ON collections.id = requests.collection_id
      JOIN workspaces ON workspaces.id = collections.workspace_id
      WHERE requests.id = assertions.request_id
      AND workspaces.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM requests
      JOIN collections ON collections.id = requests.collection_id
      JOIN workspaces ON workspaces.id = collections.workspace_id
      WHERE requests.id = assertions.request_id
      AND workspaces.user_id = auth.uid()
    )
  );

-- Variable Extractions
CREATE POLICY "Users can manage variable extractions for own requests"
  ON variable_extractions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM requests
      JOIN collections ON collections.id = requests.collection_id
      JOIN workspaces ON workspaces.id = collections.workspace_id
      WHERE requests.id = variable_extractions.request_id
      AND workspaces.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM requests
      JOIN collections ON collections.id = requests.collection_id
      JOIN workspaces ON workspaces.id = collections.workspace_id
      WHERE requests.id = variable_extractions.request_id
      AND workspaces.user_id = auth.uid()
    )
  );

-- Collection Runs
CREATE POLICY "Users can manage own collection runs"
  ON collection_runs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Collection Run Steps
CREATE POLICY "Users can manage own collection run steps"
  ON collection_run_steps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM collection_runs
      WHERE collection_runs.id = collection_run_steps.run_id
      AND collection_runs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collection_runs
      WHERE collection_runs.id = collection_run_steps.run_id
      AND collection_runs.user_id = auth.uid()
    )
  );
