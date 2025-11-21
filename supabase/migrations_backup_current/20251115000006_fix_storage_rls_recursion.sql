-- ============================================================================
-- Migration: Fix Storage RLS Recursion
-- Date: 2025-11-15
-- Description: Fix RLS recursion issue in storage policies by using
--              auth.user_role() helper function instead of querying users table
-- ============================================================================

-- ============================================================================
-- Migration: Fix Storage RLS Recursion
-- Date: 2025-11-15
-- Description: Fix RLS recursion issue in storage policies by using
--              public.user_role() helper function instead of querying users table
-- ============================================================================

-- Drop and recreate only the problematic policy
DROP POLICY IF EXISTS "Finance can read all receipts" ON storage.objects;

-- Policy: Finance and admin can read all receipts
-- FIXED: Use public.user_role() instead of querying users table to avoid recursion
CREATE POLICY "Finance can read all receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND public.user_role() IN ('finance', 'admin')
  );

COMMENT ON POLICY "Finance can read all receipts" ON storage.objects IS
  'Finance and admin users can read all receipts. Uses public.user_role() helper to avoid RLS recursion.';
