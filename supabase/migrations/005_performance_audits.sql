-- Create Performance Audits Table
CREATE TABLE performance_audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  strategy TEXT NOT NULL CHECK (strategy IN ('desktop', 'mobile')),
  performance_score NUMERIC,
  accessibility_score NUMERIC,
  best_practices_score NUMERIC,
  seo_score NUMERIC,
  core_web_vitals JSONB DEFAULT '{}'::jsonb,
  lighthouse_result JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE performance_audits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own performance audits"
  ON performance_audits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own performance audits"
  ON performance_audits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own performance audits"
  ON performance_audits FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_performance_audits_updated_at
  BEFORE UPDATE ON performance_audits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
