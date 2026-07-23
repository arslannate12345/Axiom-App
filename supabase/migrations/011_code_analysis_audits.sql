-- Create Code Analysis Audits Table
CREATE TABLE IF NOT EXISTS code_analysis_audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  filename TEXT,
  score NUMERIC NOT NULL,
  grade TEXT NOT NULL,
  findings JSONB DEFAULT '[]'::jsonb,
  summary JSONB DEFAULT '{}'::jsonb,
  category_breakdown JSONB DEFAULT '{}'::jsonb,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE code_analysis_audits ENABLE ROW LEVEL SECURITY;

-- Create policies safely
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'code_analysis_audits' AND policyname = 'Users can view their own code analysis audits'
  ) THEN
    CREATE POLICY "Users can view their own code analysis audits"
      ON code_analysis_audits FOR SELECT
      USING (auth.uid() = user_id OR user_id IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'code_analysis_audits' AND policyname = 'Users can insert their own code analysis audits'
  ) THEN
    CREATE POLICY "Users can insert their own code analysis audits"
      ON code_analysis_audits FOR INSERT
      WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'code_analysis_audits' AND policyname = 'Users can delete their own code analysis audits'
  ) THEN
    CREATE POLICY "Users can delete their own code analysis audits"
      ON code_analysis_audits FOR DELETE
      USING (auth.uid() = user_id OR user_id IS NULL);
  END IF;
END $$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_code_analysis_audits_updated_at ON code_analysis_audits;
CREATE TRIGGER update_code_analysis_audits_updated_at
  BEFORE UPDATE ON code_analysis_audits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
