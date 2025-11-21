-- Copy and paste this into Supabase Dashboard → SQL Editor, then click RUN
-- This will only insert migrations that don't already exist

-- Insert Nov 15 migrations (only if they don't exist)
INSERT INTO supabase_migrations.schema_migrations (version, name)
SELECT '20251115', '20251115_fix_mileage_rls_recursion'
WHERE NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20251115' AND name = '20251115_fix_mileage_rls_recursion');

INSERT INTO supabase_migrations.schema_migrations (version, name)
SELECT '20251115', '20251115_fix_rls_recursion'
WHERE NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20251115' AND name = '20251115_fix_rls_recursion');

INSERT INTO supabase_migrations.schema_migrations (version, name)
SELECT '20251115', '20251115_fix_storage_rls_recursion'
WHERE NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20251115' AND name = '20251115_fix_storage_rls_recursion');

INSERT INTO supabase_migrations.schema_migrations (version, name)
SELECT '20251115', '20251115_mileage_module'
WHERE NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20251115' AND name = '20251115_mileage_module');

INSERT INTO supabase_migrations.schema_migrations (version, name)
SELECT '20251115', '20251115_organization_helper_functions'
WHERE NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20251115' AND name = '20251115_organization_helper_functions');

INSERT INTO supabase_migrations.schema_migrations (version, name)
SELECT '20251115', '20251115_organization_multi_tenancy'
WHERE NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20251115' AND name = '20251115_organization_multi_tenancy');

-- Insert Nov 16 migrations (only if they don't exist)
INSERT INTO supabase_migrations.schema_migrations (version, name)
SELECT '20251116', '20251116_complete_rls_fix_with_role_in_metadata'
WHERE NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20251116' AND name = '20251116_complete_rls_fix_with_role_in_metadata');

INSERT INTO supabase_migrations.schema_migrations (version, name)
SELECT '20251116', '20251116_fix_invitations_rls_recursion'
WHERE NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20251116' AND name = '20251116_fix_invitations_rls_recursion');

INSERT INTO supabase_migrations.schema_migrations (version, name)
SELECT '20251116', '20251116_fix_organization_members_rls_recursion'
WHERE NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20251116' AND name = '20251116_fix_organization_members_rls_recursion');

INSERT INTO supabase_migrations.schema_migrations (version, name)
SELECT '20251116', '20251116_proper_rls_fix_with_app_metadata'
WHERE NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20251116' AND name = '20251116_proper_rls_fix_with_app_metadata');

INSERT INTO supabase_migrations.schema_migrations (version, name)
SELECT '20251116', '20251116_secure_rls_fix'
WHERE NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20251116' AND name = '20251116_secure_rls_fix');

-- Verify results
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version, name;
