-- ============================================================
-- REPORTS MODULE
-- ============================================================
DROP TABLE IF EXISTS reports CASCADE;

CREATE TABLE reports (
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

CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_share_token ON reports(share_token);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own reports"
  ON reports FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RPC for viewing public shared reports without authentication
DROP FUNCTION IF EXISTS get_shared_report(text);

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
