-- ============================================================================
-- CONSOLIDATED RLS FIX - Apply missing policies
-- Date: 2025-11-17
-- Fixes 400/403 errors on organization_members and invitations tables
-- ============================================================================

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Admins can insert members" ON organization_members;
DROP POLICY IF EXISTS "Admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Admins can delete members" ON organization_members;
DROP POLICY IF EXISTS "Users can view invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can manage invitations" ON invitations;

-- ============================================================================
-- ORGANIZATION MEMBERS POLICIES
-- ============================================================================

-- SELECT: Users can view members in their current organization
CREATE POLICY "Users can view organization members"
ON organization_members FOR SELECT
TO authenticated
USING (
  organization_id = (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
);

-- INSERT: Only admins can add members
CREATE POLICY "Admins can insert members"
ON organization_members FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- UPDATE: Only admins can update members
CREATE POLICY "Admins can update members"
ON organization_members FOR UPDATE
TO authenticated
USING (
  organization_id = (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  organization_id = (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- DELETE: Only admins can delete members
CREATE POLICY "Admins can delete members"
ON organization_members FOR DELETE
TO authenticated
USING (
  organization_id = (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- ============================================================================
-- INVITATIONS POLICIES
-- ============================================================================

-- SELECT: Users can view their own invitations OR admins/managers can view org invitations
CREATE POLICY "Users can view invitations"
ON invitations FOR SELECT
TO authenticated
USING (
  -- User's own invitation (sent to their email)
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  -- Admins and managers can view all invitations in their org
  (
    organization_id = (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager')
  )
);

-- INSERT/UPDATE/DELETE: Only admins and managers can manage invitations
CREATE POLICY "Admins can manage invitations"
ON invitations FOR ALL
TO authenticated
USING (
  organization_id = (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager')
)
WITH CHECK (
  organization_id = (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager')
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS POLICIES APPLIED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fixed policies for:';
  RAISE NOTICE '  ✓ organization_members (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '  ✓ invitations (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '========================================';
END $$;
