-- Create Load Audits Table
CREATE TABLE IF NOT EXISTS load_audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  score NUMERIC NOT NULL,
  grade TEXT NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  summary JSONB DEFAULT '{}'::jsonb,
  iterations JSONB DEFAULT '[]'::jsonb,
  status_breakdown JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE load_audits ENABLE ROW LEVEL SECURITY;

-- Create policies safely
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'load_audits' AND policyname = 'Users can view their own load audits'
  ) THEN
    CREATE POLICY "Users can view their own load audits"
      ON load_audits FOR SELECT
      USING (auth.uid() = user_id OR user_id IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'load_audits' AND policyname = 'Users can insert their own load audits'
  ) THEN
    CREATE POLICY "Users can insert their own load audits"
      ON load_audits FOR INSERT
      WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'load_audits' AND policyname = 'Users can delete their own load audits'
  ) THEN
    CREATE POLICY "Users can delete their own load audits"
      ON load_audits FOR DELETE
      USING (auth.uid() = user_id OR user_id IS NULL);
  END IF;
END $$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_load_audits_updated_at ON load_audits;
CREATE TRIGGER update_load_audits_updated_at
  BEFORE UPDATE ON load_audits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
