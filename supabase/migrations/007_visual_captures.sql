-- Create Visual Captures Table
CREATE TABLE IF NOT EXISTS visual_captures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  viewports JSONB DEFAULT '[]'::jsonb,
  snapshots JSONB DEFAULT '[]'::jsonb,
  diff_results JSONB DEFAULT '[]'::jsonb,
  overall_match_score NUMERIC DEFAULT 100,
  status TEXT DEFAULT 'passed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE visual_captures ENABLE ROW LEVEL SECURITY;

-- Create policies safely
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'visual_captures' AND policyname = 'Users can view their own visual captures'
  ) THEN
    CREATE POLICY "Users can view their own visual captures"
      ON visual_captures FOR SELECT
      USING (auth.uid() = user_id OR user_id IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'visual_captures' AND policyname = 'Users can insert their own visual captures'
  ) THEN
    CREATE POLICY "Users can insert their own visual captures"
      ON visual_captures FOR INSERT
      WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'visual_captures' AND policyname = 'Users can delete their own visual captures'
  ) THEN
    CREATE POLICY "Users can delete their own visual captures"
      ON visual_captures FOR DELETE
      USING (auth.uid() = user_id OR user_id IS NULL);
  END IF;
END $$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_visual_captures_updated_at ON visual_captures;
CREATE TRIGGER update_visual_captures_updated_at
  BEFORE UPDATE ON visual_captures
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
