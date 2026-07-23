-- Create Database Audits Table
CREATE TABLE IF NOT EXISTS database_audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  score NUMERIC NOT NULL,
  grade TEXT NOT NULL,
  findings JSONB DEFAULT '[]'::jsonb,
  endpoint_checks JSONB DEFAULT '[]'::jsonb,
  summary JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE database_audits ENABLE ROW LEVEL SECURITY;

-- Create policies safely
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'database_audits' AND policyname = 'Users can view their own database audits'
  ) THEN
    CREATE POLICY "Users can view their own database audits"
      ON database_audits FOR SELECT
      USING (auth.uid() = user_id OR user_id IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'database_audits' AND policyname = 'Users can insert their own database audits'
  ) THEN
    CREATE POLICY "Users can insert their own database audits"
      ON database_audits FOR INSERT
      WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'database_audits' AND policyname = 'Users can delete their own database audits'
  ) THEN
    CREATE POLICY "Users can delete their own database audits"
      ON database_audits FOR DELETE
      USING (auth.uid() = user_id OR user_id IS NULL);
  END IF;
END $$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_database_audits_updated_at ON database_audits;
CREATE TRIGGER update_database_audits_updated_at
  BEFORE UPDATE ON database_audits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
