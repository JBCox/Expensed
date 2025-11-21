-- ============================================================================
-- Migration: Fix Storage RLS Recursion
-- Date: 2025-11-15
-- Description: Fix RLS recursion issue in storage policies by using
--              auth.user_role() helper function instead of querying users table
-- ============================================================================

-- Drop the existing storage policies that have recursion issues
DROP POLICY IF EXISTS "Finance can read all receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own receipts" ON storage.objects;

-- ============================================================================
-- Recreate storage policies using auth.user_role() helper function
-- ============================================================================

-- Policy: Users can upload their own receipts
CREATE POLICY "Users can upload own receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND name ~ '^[a-f0-9-]{36}/[a-zA-Z0-9._-]+$'  -- UUID/filename pattern
    AND name !~ '\.\.'  -- Prevent path traversal
  );

-- Policy: Users can read their own receipts
CREATE POLICY "Users can read own receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can update their own receipts
CREATE POLICY "Users can update own receipts"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can delete their own receipts
CREATE POLICY "Users can delete own receipts"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Finance and admin users can read all receipts
-- FIXED: Use auth.user_role() instead of querying users table to avoid recursion
CREATE POLICY "Finance can read all receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND auth.user_role() IN ('finance', 'admin')
  );

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "Users can upload own receipts" ON storage.objects IS
  'Users can upload receipts to their own folder in the receipts bucket. Path validation prevents traversal attacks.';

COMMENT ON POLICY "Users can read own receipts" ON storage.objects IS
  'Users can read receipts from their own folder.';

COMMENT ON POLICY "Users can update own receipts" ON storage.objects IS
  'Users can update (replace) receipts in their own folder.';

COMMENT ON POLICY "Users can delete own receipts" ON storage.objects IS
  'Users can delete receipts from their own folder.';

COMMENT ON POLICY "Finance can read all receipts" ON storage.objects IS
  'Finance and admin users can read all receipts. Uses auth.user_role() helper to avoid RLS recursion.';

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- To rollback this migration, run the original 20251113_storage_policies.sql
-- with the problematic policies that query the users table directly.
