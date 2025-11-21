-- ============================================================================
-- Fix storage policies for multi-tenant organization structure
-- Date: 2025-11-17
--
-- File paths are now: organizationId/userId/timestamp_filename
-- Storage policies need to check organization membership via app_metadata
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Finance can read all receipts" ON storage.objects;

-- Policy: Users can upload receipts to their organization folder
CREATE POLICY "Users can upload own receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Policy: Users can read their own receipts in their organization
CREATE POLICY "Users can read own receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Policy: Users can update their own receipts
CREATE POLICY "Users can update own receipts"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Policy: Users can delete their own receipts
CREATE POLICY "Users can delete own receipts"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Policy: Finance and admin can read all receipts in their organization
CREATE POLICY "Finance can read all receipts in organization"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('finance', 'admin')
  );

COMMENT ON POLICY "Users can upload own receipts" ON storage.objects IS
  'Users can upload receipts to organizationId/userId/ folder structure';

COMMENT ON POLICY "Finance can read all receipts in organization" ON storage.objects IS
  'Finance/admin can read all receipts in their organization';
