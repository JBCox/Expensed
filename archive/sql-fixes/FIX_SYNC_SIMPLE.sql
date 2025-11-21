-- Copy and paste this into Supabase Dashboard → SQL Editor, then click RUN

-- Insert Nov 15 migrations
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES
  ('20251115', '20251115_fix_mileage_rls_recursion'),
  ('20251115', '20251115_fix_rls_recursion'),
  ('20251115', '20251115_fix_storage_rls_recursion'),
  ('20251115', '20251115_mileage_module'),
  ('20251115', '20251115_organization_helper_functions'),
  ('20251115', '20251115_organization_multi_tenancy')
ON CONFLICT (version, name) DO NOTHING;

-- Insert Nov 16 migrations
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES
  ('20251116', '20251116_complete_rls_fix_with_role_in_metadata'),
  ('20251116', '20251116_fix_invitations_rls_recursion'),
  ('20251116', '20251116_fix_organization_members_rls_recursion'),
  ('20251116', '20251116_proper_rls_fix_with_app_metadata'),
  ('20251116', '20251116_secure_rls_fix')
ON CONFLICT (version, name) DO NOTHING;

-- Check results
SELECT COUNT(*) as total_migrations FROM supabase_migrations.schema_migrations;
