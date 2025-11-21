-- ============================================================================
-- Verification Queries for Organization Multi-Tenancy Setup
-- Run this in Supabase Studio SQL Editor to verify everything works
-- ============================================================================

-- 1. Check if all tables exist
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('organizations', 'organization_members', 'invitations')
ORDER BY table_name;

-- Expected output: 3 rows (organizations, organization_members, invitations)

-- 2. Check if organization_id columns were added
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'organization_id'
ORDER BY table_name;

-- Expected output: expenses, receipts, users

-- 3. Check if helper functions exist
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'create_organization_with_admin',
    'get_organization_stats',
    'get_user_organization_context',
    'accept_invitation',
    'expire_old_invitations'
  )
ORDER BY routine_name;

-- Expected output: 5 functions

-- 4. Check RLS policies on organizations table
SELECT
  policyname,
  tablename,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'organizations'
ORDER BY policyname;

-- Expected output: 3 policies (Members can view, Admins can update, Admins can create)

-- 5. Check if Default Organization was created (from data migration)
SELECT
  id,
  name,
  domain,
  created_at
FROM organizations
WHERE name = 'Default Organization';

-- Expected output: 1 row if you had existing users

-- 6. Check indexes on invitations table
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'invitations'
  AND indexname LIKE 'idx_%'
ORDER BY indexname;

-- Expected output: Multiple indexes including idx_unique_pending_email_per_org

-- 7. Verify organization_members structure
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'organization_members'
ORDER BY ordinal_position;

-- Expected output: All columns (id, organization_id, user_id, role, manager_id, department, etc.)

-- 8. Test creating an organization (optional - run if you want to test)
-- SELECT create_organization_with_admin('Test Organization', 'test.com');

-- ============================================================================
-- Summary Query - Run this for a quick health check
-- ============================================================================

SELECT
  'Tables Created' as check_type,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 3 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('organizations', 'organization_members', 'invitations')

UNION ALL

SELECT
  'Functions Created' as check_type,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 5 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'create_organization_with_admin',
    'get_organization_stats',
    'get_user_organization_context',
    'accept_invitation',
    'expire_old_invitations'
  )

UNION ALL

SELECT
  'Organization Columns Added' as check_type,
  COUNT(*) as count,
  CASE WHEN COUNT(*) >= 2 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'organization_id'
  AND table_name IN ('expenses', 'receipts', 'users')

UNION ALL

SELECT
  'Organization Policies' as check_type,
  COUNT(*) as count,
  CASE WHEN COUNT(*) >= 3 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'organizations';

-- ============================================================================
-- Run the summary query above to verify everything is working!
-- All checks should show "✅ PASS"
-- ============================================================================
