-- Check what's actually in the database

-- 1. Check organization_members (should only be 1 - you)
SELECT
  om.id,
  om.user_id,
  u.email,
  om.role,
  om.is_active,
  om.created_at
FROM organization_members om
LEFT JOIN auth.users u ON u.id = om.user_id
ORDER BY om.created_at DESC;

-- 2. Check invitations (might have duplicates from failed attempts)
SELECT
  id,
  email,
  role,
  status,
  created_at,
  expires_at
FROM invitations
ORDER BY created_at DESC;

-- 3. Check if app_metadata was set correctly
SELECT
  id,
  email,
  raw_app_meta_data
FROM auth.users
LIMIT 5;

-- 4. Check organizations
SELECT
  id,
  name,
  created_at
FROM organizations;
