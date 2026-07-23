-- Create SEO Audits Table
CREATE TABLE IF NOT EXISTS seo_audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  score NUMERIC NOT NULL,
  grade TEXT NOT NULL,
  findings JSONB DEFAULT '[]'::jsonb,
  meta_checks JSONB DEFAULT '[]'::jsonb,
  heading_hierarchy JSONB DEFAULT '[]'::jsonb,
  summary JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE seo_audits ENABLE ROW LEVEL SECURITY;

-- Create policies safely
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'seo_audits' AND policyname = 'Users can view their own seo audits'
  ) THEN
    CREATE POLICY "Users can view their own seo audits"
      ON seo_audits FOR SELECT
      USING (auth.uid() = user_id OR user_id IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'seo_audits' AND policyname = 'Users can insert their own seo audits'
  ) THEN
    CREATE POLICY "Users can insert their own seo audits"
      ON seo_audits FOR INSERT
      WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'seo_audits' AND policyname = 'Users can delete their own seo audits'
  ) THEN
    CREATE POLICY "Users can delete their own seo audits"
      ON seo_audits FOR DELETE
      USING (auth.uid() = user_id OR user_id IS NULL);
  END IF;
END $$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_seo_audits_updated_at ON seo_audits;
CREATE TRIGGER update_seo_audits_updated_at
  BEFORE UPDATE ON seo_audits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
