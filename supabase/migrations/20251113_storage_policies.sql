-- ============================================================================
-- Jensify Storage Policies - Phase 0
-- Created: 2025-11-13
-- Description: Storage bucket policies for receipt uploads
-- ============================================================================

-- NOTE: You must create the 'receipts' bucket first via Dashboard:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "New bucket"
-- 3. Name: receipts
-- 4. Public: false
-- 5. Then run this SQL

-- ============================================================================
-- STORAGE POLICIES FOR RECEIPTS BUCKET
-- ============================================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can upload own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Finance can read all receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own receipts" ON storage.objects;

-- 1. Users can upload to their own folder
CREATE POLICY "Users can upload own receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 2. Users can read their own files
CREATE POLICY "Users can read own receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. Finance can read all files
CREATE POLICY "Finance can read all receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('finance', 'admin')
    )
  );

-- 4. Users can delete their own files
CREATE POLICY "Users can delete own receipts"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Storage Policies Created!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Bucket: receipts';
  RAISE NOTICE 'Policies: 4 configured';
  RAISE NOTICE ' - Users can upload own receipts';
  RAISE NOTICE ' - Users can read own receipts';
  RAISE NOTICE ' - Finance can read all receipts';
  RAISE NOTICE ' - Users can delete own receipts';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Storage setup complete!';
  RAISE NOTICE '========================================';
END $$;
