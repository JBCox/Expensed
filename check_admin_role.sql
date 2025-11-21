-- Check joshuabcox@gmail.com user and organization membership
SELECT 
  u.id as user_id,
  u.email,
  u.raw_app_meta_data,
  om.role as org_role,
  om.is_active,
  o.name as org_name,
  o.id as org_id
FROM auth.users u
LEFT JOIN organization_members om ON om.user_id = u.id
LEFT JOIN organizations o ON o.id = om.organization_id
WHERE u.email = 'joshuabcox@gmail.com';
