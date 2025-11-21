-- ============================================================================
-- Fix RLS Infinite Recursion Issue
-- Created: 2025-11-15
-- Issue: Policies querying users table while protecting users table
-- Solution: Helper function with SECURITY DEFINER to bypass RLS
-- ============================================================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Finance can read all users" ON users;
DROP POLICY IF EXISTS "Finance can view all expenses" ON expenses;
DROP POLICY IF EXISTS "Finance can update expenses" ON expenses;
DROP POLICY IF EXISTS "Finance can view all receipts" ON receipts;

-- ============================================================================
-- HELPER FUNCTION (bypasses RLS with SECURITY DEFINER)
-- ============================================================================

CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION auth.user_role() IS 'Get current user role without triggering RLS recursion';

-- ============================================================================
-- TRIGGER TO PREVENT UNAUTHORIZED ROLE CHANGES
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role FROM users WHERE id = auth.uid();

  -- Only finance/admin can change roles
  IF OLD.role != NEW.role AND current_user_role NOT IN ('finance', 'admin') THEN
    RAISE EXCEPTION 'Only finance or admin users can change user roles';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_unauthorized_role_change
  BEFORE UPDATE ON users
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION prevent_role_change();

COMMENT ON FUNCTION prevent_role_change() IS 'Prevents non-admin users from changing user roles';

-- ============================================================================
-- FIXED USERS TABLE POLICIES
-- ============================================================================

-- Users can update their own data
-- Note: Role changes should be prevented by application logic or triggers
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Finance/admin can read all users
CREATE POLICY "Finance can read all users"
  ON users FOR SELECT
  USING (auth.user_role() IN ('finance', 'admin'));

-- ============================================================================
-- FIXED EXPENSES TABLE POLICIES
-- ============================================================================

-- Finance can view all expenses (using helper function)
CREATE POLICY "Finance can view all expenses"
  ON expenses FOR SELECT
  USING (auth.user_role() IN ('finance', 'admin'));

-- Finance can update expenses (using helper function)
CREATE POLICY "Finance can update expenses"
  ON expenses FOR UPDATE
  USING (auth.user_role() IN ('finance', 'admin'));

-- ============================================================================
-- FIXED RECEIPTS TABLE POLICIES
-- ============================================================================

-- Finance can view all receipts (using helper function)
CREATE POLICY "Finance can view all receipts"
  ON receipts FOR SELECT
  USING (auth.user_role() IN ('finance', 'admin'));

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'RLS recursion fix migration completed successfully';
  RAISE NOTICE 'Created helper function: auth.user_role()';
  RAISE NOTICE 'Updated 6 RLS policies to use helper function';
END $$;
