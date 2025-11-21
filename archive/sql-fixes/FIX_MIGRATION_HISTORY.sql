-- ============================================================================
-- FIX MIGRATION HISTORY - Run this ONCE in Supabase SQL Editor
-- ============================================================================
-- This script synchronizes the migration history table with your local files
-- After running this, you can use Supabase CLI without copy/pasting SQL
-- ============================================================================

-- Step 1: Remove the conflicting migration entry
DELETE FROM supabase_migrations.schema_migrations
WHERE version = '20251113';

-- Step 2: Insert all local migrations as "applied"
-- This tells Supabase that these migrations were already run manually

INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES
  ('20251113_storage_policies', '20251113_storage_policies', ARRAY['-- Migration applied manually']),
  ('20251113215904_handle_new_user_signup', '20251113215904_handle_new_user_signup', ARRAY['-- Migration applied manually']),
  ('20251113_phase0_initial_schema', '20251113_phase0_initial_schema', ARRAY['-- Migration applied manually']),
  ('20251115_mileage_module', '20251115_mileage_module', ARRAY['-- Migration applied manually']),
  ('20251115_fix_rls_recursion', '20251115_fix_rls_recursion', ARRAY['-- Migration applied manually']),
  ('20251115_fix_storage_rls_recursion', '20251115_fix_storage_rls_recursion', ARRAY['-- Migration applied manually']),
  ('20251115_fix_mileage_rls_recursion', '20251115_fix_mileage_rls_recursion', ARRAY['-- Migration applied manually']),
  ('20251115_organization_helper_functions', '20251115_organization_helper_functions', ARRAY['-- Migration applied manually']),
  ('20251115_organization_multi_tenancy', '20251115_organization_multi_tenancy', ARRAY['-- Migration applied manually']),
  ('20251116_fix_organization_members_rls_recursion', '20251116_fix_organization_members_rls_recursion', ARRAY['-- Migration applied manually']),
  ('20251116_fix_invitations_rls_recursion', '20251116_fix_invitations_rls_recursion', ARRAY['-- Migration applied manually']),
  ('20251116_proper_rls_fix_with_app_metadata', '20251116_proper_rls_fix_with_app_metadata', ARRAY['-- Migration applied manually']),
  ('20251116_complete_rls_fix_with_role_in_metadata', '20251116_complete_rls_fix_with_role_in_metadata', ARRAY['-- Migration applied manually'])
ON CONFLICT (version) DO NOTHING;

-- Step 3: Verify the migration history
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version;

-- ============================================================================
-- After running this script:
-- 1. Run `supabase migration list` to verify sync
-- 2. All future migrations can be applied with `supabase db push`
-- 3. No more copy/pasting SQL! 🎉
-- ============================================================================
