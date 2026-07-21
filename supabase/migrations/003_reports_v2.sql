-- ============================================================
-- REPORTS V2: Aggregated test reports with resolution tracking
-- ============================================================

-- Add request-level reports (reports can now be per-request, not just per-collection)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES requests(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS baseline_report_id UUID REFERENCES reports(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_status TEXT DEFAULT 'draft';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS overall_health_score INTEGER DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolution_log JSONB DEFAULT '[]'::jsonb;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_by UUID;

-- Allow collection_id to be nullable (request-level reports don't need a collection)
ALTER TABLE reports ALTER COLUMN collection_id DROP NOT NULL;

-- CHECK constraint on report status
DO $$ BEGIN
  ALTER TABLE reports ADD CONSTRAINT chk_reports_status
    CHECK (report_status IN ('draft', 'shared', 'in-review', 'resolved', 'passed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index on request_id and baseline_report_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_reports_request_id ON reports(request_id);
CREATE INDEX IF NOT EXISTS idx_reports_baseline ON reports(baseline_report_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(report_status);

-- -----------------------------------------------------------
-- ISSUE TRACKING TABLE (optional — can also be stored in report_data JSONB)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS report_issues (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id       UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  section         TEXT NOT NULL,            -- 'benchmarks', 'security', 'fuzz', etc.
  title           TEXT NOT NULL,
  severity        TEXT NOT NULL DEFAULT 'warning'
    CHECK (severity IN ('critical', 'warning', 'info')),
  status          TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'acknowledged', 'fixed', 'verified')),
  description     TEXT DEFAULT '',
  resolved_at     TIMESTAMPTZ,
  developer_note  TEXT DEFAULT '',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_issues_report_id ON report_issues(report_id);

ALTER TABLE report_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage issues in their own reports"
  ON report_issues FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM reports
      WHERE reports.id = report_issues.report_id
      AND reports.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reports
      WHERE reports.id = report_issues.report_id
      AND reports.user_id = auth.uid()
    )
  );

-- Force PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
