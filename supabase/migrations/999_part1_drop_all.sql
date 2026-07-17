-- ============================================================
-- SAFE NUCLEAR CLEANUP - Part 1: DROP everything
-- Run this FIRST, by itself
-- ============================================================

-- Drop the team function with CASCADE (auto-drops dependent policies)
DROP FUNCTION IF EXISTS public.get_active_workspaces() CASCADE;

-- Drop ALL policies on every public table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Drop team tables if they still exist
DROP TABLE IF EXISTS workspace_invites CASCADE;
DROP TABLE IF EXISTS workspace_members CASCADE;
