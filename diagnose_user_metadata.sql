-- Diagnostic: Check current user's app_metadata and organization membership
-- Run this in Supabase SQL Editor while logged in

-- Check your auth.users metadata
SELECT 
  id,
  email,
  raw_app_meta_data
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE';  -- Replace with your email

-- Check your organization memberships
SELECT 
  om.id,
  om.organization_id,
  om.user_id,
  om.role,
  om.is_active,
  o.name as org_name
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id IN (
  SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE'  -- Replace with your email
);

-- Check what the JWT would see (this is what RLS policies check)
-- Run this to see what organization_id the policy would get
SELECT 
  (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid as jwt_org_id,
  (auth.jwt() -> 'app_metadata' ->> 'role') as jwt_role,
  auth.uid() as user_id;
