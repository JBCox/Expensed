-- ============================================================================
-- Fix receipts RLS policies to use app_metadata instead of table queries
-- Date: 2025-11-17
--
-- The current receipts INSERT policy queries organization_members table,
-- which can cause issues. This updates it to use app_metadata like other tables.
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create receipts in their organization" ON receipts;
DROP POLICY IF EXISTS "Users can update own receipts in their organization" ON receipts;

-- Create new policies using app_metadata (no recursion, no table queries)
CREATE POLICY "Users can create receipts in their organization"
  ON receipts FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id = (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
  );

CREATE POLICY "Users can update own receipts in their organization"
  ON receipts FOR UPDATE
  USING (
    user_id = auth.uid()
    AND organization_id = (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
  );

COMMENT ON POLICY "Users can create receipts in their organization" ON receipts IS
  'Uses app_metadata for organization check - zero table queries';

COMMENT ON POLICY "Users can update own receipts in their organization" ON receipts IS
  'Uses app_metadata for organization check - zero table queries';
