-- ============================================================================
-- Migration: Fix Mileage Module RLS Recursion
-- Date: 2025-11-15
-- Description: Fix RLS recursion issue in mileage policies by using
--              auth.user_role() helper function instead of querying users table
-- ============================================================================

-- Drop the existing mileage policies that have recursion issues
DROP POLICY IF EXISTS "Finance read trips" ON mileage_trips;
DROP POLICY IF EXISTS "Finance read segments" ON mileage_segments;

-- ============================================================================
-- Recreate mileage policies using auth.user_role() helper function
-- ============================================================================

-- Policy: Finance and admin can read all mileage trips
-- FIXED: Use public.user_role() instead of querying users table to avoid recursion
CREATE POLICY "Finance read trips"
  ON mileage_trips FOR SELECT
  USING (public.user_role() IN ('finance', 'admin'));

-- Policy: Finance and admin can read all mileage segments
-- FIXED: Use public.user_role() instead of querying users table to avoid recursion
CREATE POLICY "Finance read segments"
  ON mileage_segments FOR SELECT
  USING (public.user_role() IN ('finance', 'admin'));

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "Finance read trips" ON mileage_trips IS
  'Finance and admin users can read all mileage trips. Uses public.user_role() helper to avoid RLS recursion.';

COMMENT ON POLICY "Finance read segments" ON mileage_segments IS
  'Finance and admin users can read all mileage segments. Uses public.user_role() helper to avoid RLS recursion.';

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- To rollback this migration:
-- DROP POLICY IF EXISTS "Finance read trips" ON mileage_trips;
-- DROP POLICY IF EXISTS "Finance read segments" ON mileage_segments;
--
-- Then run the original 20251115_mileage_module.sql with the problematic policies.
