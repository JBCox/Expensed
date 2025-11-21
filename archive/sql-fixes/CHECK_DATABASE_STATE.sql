-- ============================================================================
-- JENSIFY DATABASE STATE CHECKER
-- Run this in Supabase SQL Editor to see what's currently in your database
-- ============================================================================

-- Check 1: What tables exist?
SELECT '========== EXISTING TABLES ==========' as check_name;
SELECT table_name,
       pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) as size
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check 2: What columns exist on key tables?
SELECT '========== USERS TABLE COLUMNS ==========' as check_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
ORDER BY ordinal_position;

SELECT '========== EXPENSES TABLE COLUMNS ==========' as check_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'expenses'
ORDER BY ordinal_position;

SELECT '========== RECEIPTS TABLE COLUMNS ==========' as check_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'receipts'
ORDER BY ordinal_position;

-- Check 3: Organization tables (if they exist)
SELECT '========== ORGANIZATION TABLES CHECK ==========' as check_name;
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations')
    THEN '✅ organizations table EXISTS'
    ELSE '❌ organizations table MISSING'
  END as organizations_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_members')
    THEN '✅ organization_members table EXISTS'
    ELSE '❌ organization_members table MISSING'
  END as org_members_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invitations')
    THEN '✅ invitations table EXISTS'
    ELSE '❌ invitations table MISSING'
  END as invitations_status;

-- Check 4: organization_id columns (if they exist)
SELECT '========== ORGANIZATION_ID COLUMNS CHECK ==========' as check_name;
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'organization_id')
    THEN '✅ expenses.organization_id EXISTS'
    ELSE '❌ expenses.organization_id MISSING'
  END as expenses_org_id,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'receipts' AND column_name = 'organization_id')
    THEN '✅ receipts.organization_id EXISTS'
    ELSE '❌ receipts.organization_id MISSING'
  END as receipts_org_id,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'organization_id')
    THEN '✅ users.organization_id EXISTS'
    ELSE '❌ users.organization_id MISSING'
  END as users_org_id;

-- Check 5: RLS Policies
SELECT '========== RLS POLICIES ==========' as check_name;
SELECT
    schemaname,
    tablename,
    policyname,
    cmd as command,
    qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check 6: Database Functions
SELECT '========== CUSTOM FUNCTIONS ==========' as check_name;
SELECT
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'create_organization_with_admin',
    'get_organization_stats',
    'get_user_organization_context',
    'accept_invitation',
    'check_expense_policies',
    'update_updated_at_column',
    'handle_new_user'
  )
ORDER BY routine_name;

-- Check 7: Storage buckets
SELECT '========== STORAGE BUCKETS ==========' as check_name;
SELECT
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
ORDER BY name;

-- Check 8: Count of data
SELECT '========== DATA COUNTS ==========' as check_name;
SELECT
  (SELECT COUNT(*) FROM auth.users) as total_auth_users,
  (SELECT COUNT(*) FROM users) as total_user_profiles,
  (SELECT COUNT(*) FROM expenses) as total_expenses,
  (SELECT COUNT(*) FROM receipts) as total_receipts,
  (SELECT COALESCE(COUNT(*), 0) FROM information_schema.tables WHERE table_name = 'organizations') as has_org_table,
  (SELECT CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations')
           THEN (SELECT COUNT(*) FROM organizations)
           ELSE 0 END) as total_organizations,
  (SELECT CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_members')
           THEN (SELECT COUNT(*) FROM organization_members)
           ELSE 0 END) as total_org_members,
  (SELECT CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitations')
           THEN (SELECT COUNT(*) FROM invitations)
           ELSE 0 END) as total_invitations;

-- Check 9: Mileage tables (if they exist)
SELECT '========== MILEAGE MODULE CHECK ==========' as check_name;
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mileage_trips')
    THEN '✅ mileage_trips table EXISTS'
    ELSE '❌ mileage_trips table MISSING'
  END as mileage_status;

-- Summary
SELECT '========== MIGRATION STATUS SUMMARY ==========' as check_name;
SELECT
  '✅ = Applied, ❌ = Missing' as legend,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
    THEN '✅ 20251113_phase0_initial_schema.sql'
    ELSE '❌ 20251113_phase0_initial_schema.sql'
  END as migration_1,
  CASE
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'receipts')
    THEN '✅ 20251113_storage_policies.sql'
    ELSE '❌ 20251113_storage_policies.sql'
  END as migration_2,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user')
    THEN '✅ 20251113215904_handle_new_user_signup.sql'
    ELSE '❌ 20251113215904_handle_new_user_signup.sql'
  END as migration_3,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mileage_trips')
    THEN '✅ 20251115_mileage_module.sql'
    ELSE '⚠️  20251115_mileage_module.sql (optional)'
  END as migration_4,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations')
    THEN '✅ 20251115_organization_multi_tenancy.sql'
    ELSE '❌ 20251115_organization_multi_tenancy.sql (NEW!)'
  END as migration_5,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'create_organization_with_admin')
    THEN '✅ 20251115_organization_helper_functions.sql'
    ELSE '❌ 20251115_organization_helper_functions.sql (NEW!)'
  END as migration_6;

SELECT '========== RECOMMENDATIONS ==========' as check_name;
SELECT
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations')
    THEN '🚨 ACTION REQUIRED: Run organization multi-tenancy migrations!'
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'organization_id')
    THEN '🚨 ACTION REQUIRED: Add organization_id columns to existing tables!'
    ELSE '✅ Database is up to date with all migrations!'
  END as recommendation;
