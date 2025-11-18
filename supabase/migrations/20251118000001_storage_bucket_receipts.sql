-- =====================================================================================
-- Storage Bucket for Receipt Files
-- =====================================================================================
-- Description: Creates the 'receipts' storage bucket with appropriate policies
--              for multi-tenant receipt file storage
-- Author: Claude Code
-- Date: 2025-11-18
--
-- Dependencies:
--   - organizations table (organization_members for RLS)
--   - users table (for authentication)
--
-- Security:
--   - Users can upload receipts to their organization folder
--   - Users can view receipts from their organization only
--   - Organization isolation enforced through RLS
-- =====================================================================================

-- Create the receipts storage bucket if it doesn't exist
DO $$
BEGIN
  -- Check if bucket exists
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'receipts'
  ) THEN
    -- Create bucket with private access
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'receipts',
      'receipts',
      false, -- Private bucket (requires signed URLs)
      5242880, -- 5MB limit (5 * 1024 * 1024 bytes)
      ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    );
  END IF;
END $$;

-- =====================================================================================
-- Storage Policies for Receipts Bucket
-- =====================================================================================

-- Policy: Users can upload receipts to their organization folder
-- Pattern: {organization_id}/{user_id}/{filename}
DROP POLICY IF EXISTS "Users can upload receipts to own organization" ON storage.objects;
CREATE POLICY "Users can upload receipts to own organization"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
  AND (storage.foldername(name))[2]::uuid = auth.uid()
);

-- Policy: Users can read receipts from their organization
DROP POLICY IF EXISTS "Users can view organization receipts" ON storage.objects;
CREATE POLICY "Users can view organization receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can update their own receipts
DROP POLICY IF EXISTS "Users can update own receipts" ON storage.objects;
CREATE POLICY "Users can update own receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
  AND (storage.foldername(name))[2]::uuid = auth.uid()
)
WITH CHECK (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
  AND (storage.foldername(name))[2]::uuid = auth.uid()
);

-- Policy: Users can delete their own receipts
DROP POLICY IF EXISTS "Users can delete own receipts" ON storage.objects;
CREATE POLICY "Users can delete own receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
  AND (storage.foldername(name))[2]::uuid = auth.uid()
);

-- =====================================================================================
-- Verification Queries (Comment out or remove before applying)
-- =====================================================================================

-- Verify bucket creation
-- SELECT * FROM storage.buckets WHERE id = 'receipts';

-- Verify policies
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%receipt%';

-- Test upload path validation (replace with actual UUIDs)
-- Example path: '123e4567-e89b-12d3-a456-426614174000/123e4567-e89b-12d3-a456-426614174001/1234567890_receipt.jpg'
