-- ============================================================================
-- Quick User Setup for Development
-- Run these SQL commands in Supabase SQL Editor to quickly setup test users
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
-- ============================================================================

-- 1. VIEW: Check existing users and their roles
SELECT 
  u.email,
  u.id as user_id,
  om.role,
  om.is_active,
  o.name as organization_name
FROM auth.users u
LEFT JOIN organization_members om ON om.user_id = u.id
LEFT JOIN organizations o ON o.id = om.organization_id
ORDER BY u.created_at DESC;

-- ============================================================================
-- 2. QUICK ROLE CHANGES (Update joshuabcox@gmail.com or any user)
-- ============================================================================

-- Make user an ADMIN
UPDATE organization_members
SET role = 'admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'joshuabcox@gmail.com')
  AND is_active = true;

-- Update app_metadata to match (important for RLS!)
UPDATE auth.users
SET raw_app_meta_data = 
  COALESCE(raw_app_meta_data, '{}'::jsonb) || 
  jsonb_build_object('role', 'admin')
WHERE email = 'joshuabcox@gmail.com';

-- Make user a MANAGER
UPDATE organization_members
SET role = 'manager'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'joshuabcox@gmail.com')
  AND is_active = true;

UPDATE auth.users
SET raw_app_meta_data = 
  COALESCE(raw_app_meta_data, '{}'::jsonb) || 
  jsonb_build_object('role', 'manager')
WHERE email = 'joshuabcox@gmail.com';

-- Make user FINANCE
UPDATE organization_members
SET role = 'finance'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'joshuabcox@gmail.com')
  AND is_active = true;

UPDATE auth.users
SET raw_app_meta_data = 
  COALESCE(raw_app_meta_data, '{}'::jsonb) || 
  jsonb_build_object('role', 'finance')
WHERE email = 'joshuabcox@gmail.com';

-- Make user EMPLOYEE
UPDATE organization_members
SET role = 'employee'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'joshuabcox@gmail.com')
  AND is_active = true;

UPDATE auth.users
SET raw_app_meta_data = 
  COALESCE(raw_app_meta_data, '{}'::jsonb) || 
  jsonb_build_object('role', 'employee')
WHERE email = 'joshuabcox@gmail.com';

-- ============================================================================
-- 3. CREATE FAKE TEST DATA
-- ============================================================================

-- Add fake expenses for current user
INSERT INTO expenses (
  user_id,
  organization_id,
  merchant,
  amount,
  category,
  expense_date,
  description,
  status
)
SELECT 
  u.id,
  om.organization_id,
  merchant,
  amount,
  category,
  expense_date,
  description,
  status
FROM auth.users u
JOIN organization_members om ON om.user_id = u.id AND om.is_active = true
CROSS JOIN (
  VALUES
    ('Starbucks', 15.50, 'Meals', CURRENT_DATE - INTERVAL '2 days', 'Client meeting coffee', 'draft'),
    ('Shell Gas', 45.00, 'Transportation', CURRENT_DATE - INTERVAL '5 days', 'Fuel for site visit', 'submitted'),
    ('Office Depot', 89.99, 'Office Supplies', CURRENT_DATE - INTERVAL '7 days', 'Printer paper', 'approved'),
    ('Amazon', 129.99, 'Equipment', CURRENT_DATE - INTERVAL '10 days', 'Wireless mouse', 'reimbursed'),
    ('Delta Airlines', 450.00, 'Travel', CURRENT_DATE - INTERVAL '15 days', 'Conference flight', 'approved'),
    ('Uber', 25.00, 'Transportation', CURRENT_DATE - INTERVAL '3 days', 'Airport ride', 'submitted'),
    ('Best Buy', 199.99, 'Equipment', CURRENT_DATE - INTERVAL '12 days', 'External monitor', 'approved'),
    ('Chipotle', 12.50, 'Meals', CURRENT_DATE - INTERVAL '1 day', 'Lunch meeting', 'draft')
) AS expenses(merchant, amount, category, expense_date, description, status)
WHERE u.email = 'joshuabcox@gmail.com'
LIMIT 8;

-- Add fake mileage trips
INSERT INTO mileage_trips (
  user_id,
  organization_id,
  trip_date,
  origin_address,
  destination_address,
  distance_miles,
  is_round_trip,
  irs_rate,
  purpose,
  category,
  status
)
SELECT 
  u.id,
  om.organization_id,
  CURRENT_DATE - (i || ' days')::interval,
  '123 Main St, Downtown',
  '456 Oak Ave, Suburb',
  (random() * 40 + 15)::numeric(10,2),
  true,
  0.67,
  'Client visit #' || i,
  'business',
  CASE 
    WHEN i <= 2 THEN 'draft'
    WHEN i <= 4 THEN 'submitted'
    ELSE 'approved'
  END
FROM auth.users u
JOIN organization_members om ON om.user_id = u.id AND om.is_active = true
CROSS JOIN generate_series(1, 6) AS i
WHERE u.email = 'joshuabcox@gmail.com';

-- ============================================================================
-- 4. ADD MORE TEST USERS TO ORGANIZATION (for manager/admin testing)
-- ============================================================================

-- First, create users manually via Supabase Auth UI, then run this:
-- This adds them to your organization

-- Add employee user to org
INSERT INTO organization_members (
  organization_id,
  user_id,
  role,
  is_active
)
SELECT 
  om.organization_id,
  u.id,
  'employee',
  true
FROM auth.users u
CROSS JOIN (
  SELECT DISTINCT organization_id 
  FROM organization_members 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'joshuabcox@gmail.com')
  LIMIT 1
) om
WHERE u.email = 'NEW_USER_EMAIL@example.com' -- Change this!
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Update their app_metadata
UPDATE auth.users
SET raw_app_meta_data = 
  COALESCE(raw_app_meta_data, '{}'::jsonb) || 
  jsonb_build_object(
    'current_organization_id', (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = (SELECT id FROM auth.users WHERE email = 'joshuabcox@gmail.com')
      LIMIT 1
    ),
    'role', 'employee'
  )
WHERE email = 'NEW_USER_EMAIL@example.com'; -- Change this!

-- ============================================================================
-- 5. CLEANUP / RESET
-- ============================================================================

-- Delete all expenses for testing
DELETE FROM expenses WHERE user_id = (SELECT id FROM auth.users WHERE email = 'joshuabcox@gmail.com');

-- Delete all mileage trips for testing
DELETE FROM mileage_trips WHERE user_id = (SELECT id FROM auth.users WHERE email = 'joshuabcox@gmail.com');

-- Delete all receipts for testing
DELETE FROM receipts WHERE user_id = (SELECT id FROM auth.users WHERE email = 'joshuabcox@gmail.com');

-- ============================================================================
-- 6. VERIFY EVERYTHING
-- ============================================================================

-- Check user's current setup
SELECT 
  'User Info' as section,
  u.email,
  u.id,
  u.raw_app_meta_data->>'role' as app_metadata_role,
  u.raw_app_meta_data->>'current_organization_id' as app_metadata_org
FROM auth.users u
WHERE u.email = 'joshuabcox@gmail.com'

UNION ALL

SELECT 
  'Organization' as section,
  o.name,
  o.id::text,
  om.role,
  om.is_active::text
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = (SELECT id FROM auth.users WHERE email = 'joshuabcox@gmail.com')

UNION ALL

SELECT 
  'Expenses' as section,
  COUNT(*)::text,
  '',
  '',
  ''
FROM expenses
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'joshuabcox@gmail.com')

UNION ALL

SELECT 
  'Mileage' as section,
  COUNT(*)::text,
  '',
  '',
  ''
FROM mileage_trips
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'joshuabcox@gmail.com');

-- Success!
SELECT '✅ Quick setup commands ready! Run the sections you need above.' as status;
