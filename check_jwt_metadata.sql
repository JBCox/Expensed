-- DIAGNOSTIC: Check your JWT and metadata
-- Run this while logged into the app

-- What does your JWT contain?
SELECT 
  auth.uid() as your_user_id,
  auth.jwt() as full_jwt,
  auth.jwt() -> 'app_metadata' as app_metadata,
  (auth.jwt() -> 'app_metadata' ->> 'current_organization_id') as jwt_org_id,
  (auth.jwt() -> 'app_metadata' ->> 'role') as jwt_role;

-- What does your user record have?
SELECT 
  u.id,
  u.email,
  u.raw_app_meta_data,
  om.organization_id,
  om.role,
  om.is_active
FROM auth.users u
LEFT JOIN organization_members om ON om.user_id = u.id
WHERE u.id = auth.uid();

-- If jwt_org_id is NULL above, your session is stale
-- Solution: Clear browser localStorage and cookies, then log out/in
