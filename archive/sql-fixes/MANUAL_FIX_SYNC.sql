-- ============================================================================
-- MANUAL FIX: Sync Migration History
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================
--
-- Instructions:
-- 1. Go to https://supabase.com/dashboard
-- 2. Open your Jensify project
-- 3. Click "SQL Editor" in the left sidebar
-- 4. Copy and paste this entire file
-- 5. Click "Run" or press Ctrl+Enter
--
-- This will sync your migration history with your local files.
-- ============================================================================

-- First, check what's already in the migration history
SELECT
  version,
  name,
  inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY version, name;

-- ============================================================================
-- Insert missing migrations (won't duplicate if they already exist)
-- ============================================================================

-- November 15, 2025 migrations
INSERT INTO supabase_migrations.schema_migrations (version, name, inserted_at)
VALUES
  ('20251115', '20251115_fix_mileage_rls_recursion', NOW()),
  ('20251115', '20251115_fix_rls_recursion', NOW()),
  ('20251115', '20251115_fix_storage_rls_recursion', NOW()),
  ('20251115', '20251115_mileage_module', NOW()),
  ('20251115', '20251115_organization_helper_functions', NOW()),
  ('20251115', '20251115_organization_multi_tenancy', NOW())
ON CONFLICT (version, name) DO NOTHING;

-- November 16, 2025 migrations
INSERT INTO supabase_migrations.schema_migrations (version, name, inserted_at)
VALUES
  ('20251116', '20251116_complete_rls_fix_with_role_in_metadata', NOW()),
  ('20251116', '20251116_fix_invitations_rls_recursion', NOW()),
  ('20251116', '20251116_fix_organization_members_rls_recursion', NOW()),
  ('20251116', '20251116_proper_rls_fix_with_app_metadata', NOW()),
  ('20251116', '20251116_secure_rls_fix', NOW())
ON CONFLICT (version, name) DO NOTHING;

-- ============================================================================
-- Verify the fix
-- ============================================================================

-- Check migration history again (should show all 14 migrations)
SELECT
  version,
  name,
  inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY version, name;

-- Count total migrations (should be 14 or more)
SELECT COUNT(*) as total_migrations
FROM supabase_migrations.schema_migrations;

-- ============================================================================
-- Expected Result
-- ============================================================================
-- You should see all these migrations:
--
-- November 13, 2025:
--   20251113_phase0_initial_schema
--   20251113_storage_policies
--   20251113215904_handle_new_user_signup
--
-- November 15, 2025:
--   20251115_fix_mileage_rls_recursion
--   20251115_fix_rls_recursion
--   20251115_fix_storage_rls_recursion
--   20251115_mileage_module
--   20251115_organization_helper_functions
--   20251115_organization_multi_tenancy
--
-- November 16, 2025:
--   20251116_complete_rls_fix_with_role_in_metadata
--   20251116_fix_invitations_rls_recursion
--   20251116_fix_organization_members_rls_recursion
--   20251116_proper_rls_fix_with_app_metadata
--   20251116_secure_rls_fix
--
-- ============================================================================
-- After running this, verify in your terminal:
-- ============================================================================
-- Run this command in your terminal:
--   supabase db remote commit
--
-- Expected output:
--   "Local and remote migration history are in sync"
--
-- ✅ DONE! Your migration history is now fixed.
-- ============================================================================
