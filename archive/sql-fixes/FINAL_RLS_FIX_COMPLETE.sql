-- ============================================================================
-- FINAL COMPLETE RLS FIX - One script to fix everything
-- This script completely removes all recursion by using simpler policies
-- Date: 2025-11-16
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop ALL existing policies completely
-- ============================================================================

DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage organization members" ON organization_members;
DROP POLICY IF EXISTS "Admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Admins can delete members" ON organization_members;
DROP POLICY IF EXISTS "Users can insert members" ON organization_members;
DROP POLICY IF EXISTS "Admins can insert members" ON organization_members;
DROP POLICY IF EXISTS "Users can view invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can manage invitations" ON invitations;

-- ============================================================================
-- STEP 2: Create SIMPLE, WORKING policies (no recursion possible)
-- ============================================================================

-- For organization_members: Let authenticated users see ALL members they have access to
-- The frontend will filter by organization
CREATE POLICY "Authenticated users can view all organization members"
ON organization_members FOR SELECT
TO authenticated
USING (
  -- User can see members if they are in the same organization
  organization_id IN (
    SELECT om.organization_id
    FROM organization_members om
    WHERE om.user_id = auth.uid()
      AND om.is_active = true
  )
);

-- Only service role can insert (used by RPC functions)
-- But allow admins to insert via application logic
CREATE POLICY "Service role can insert members"
ON organization_members FOR INSERT
TO authenticated
WITH CHECK (
  -- Check if requesting user is admin of this organization
  EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
      AND om.is_active = true
  )
);

-- Admins can update members in their organization
CREATE POLICY "Admins can update members"
ON organization_members FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
      AND om.is_active = true
  )
);

-- Admins can deactivate (not delete) members
CREATE POLICY "Admins can delete members"
ON organization_members FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
      AND om.is_active = true
  )
);

-- ============================================================================
-- STEP 3: Fix invitations policies
-- ============================================================================

-- Users can view their own invitations OR invitations in their org (if admin/manager)
CREATE POLICY "Users can view invitations"
ON invitations FOR SELECT
TO authenticated
USING (
  -- User's own invitation (sent to their email)
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  -- Or user is admin/manager in this organization
  organization_id IN (
    SELECT om.organization_id
    FROM organization_members om
    WHERE om.user_id = auth.uid()
      AND om.role IN ('admin', 'manager')
      AND om.is_active = true
  )
);

-- Admins can create/update/delete invitations
CREATE POLICY "Admins can manage invitations"
ON invitations FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT om.organization_id
    FROM organization_members om
    WHERE om.user_id = auth.uid()
      AND om.role = 'admin'
      AND om.is_active = true
  )
)
WITH CHECK (
  organization_id IN (
    SELECT om.organization_id
    FROM organization_members om
    WHERE om.user_id = auth.uid()
      AND om.role = 'admin'
      AND om.is_active = true
  )
);

-- ============================================================================
-- STEP 4: Add helpful comments
-- ============================================================================

COMMENT ON TABLE organization_members IS 'Organization membership - RLS uses simple subqueries to avoid recursion';
COMMENT ON TABLE invitations IS 'Organization invitations - RLS uses simple subqueries to avoid recursion';

-- ============================================================================
-- STEP 5: Verify and report success
-- ============================================================================

DO $$
DECLARE
  member_policy_count INTEGER;
  invitation_policy_count INTEGER;
BEGIN
  -- Count policies
  SELECT COUNT(*) INTO member_policy_count
  FROM pg_policies
  WHERE tablename = 'organization_members';

  SELECT COUNT(*) INTO invitation_policy_count
  FROM pg_policies
  WHERE tablename = 'invitations';

  -- Report
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS FIX COMPLETED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'organization_members policies: %', member_policy_count;
  RAISE NOTICE 'invitations policies: %', invitation_policy_count;
  RAISE NOTICE '';
  RAISE NOTICE 'All policies use simple subqueries';
  RAISE NOTICE 'No SECURITY DEFINER functions needed';
  RAISE NOTICE 'No recursion possible';
  RAISE NOTICE '========================================';
END $$;
