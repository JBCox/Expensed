-- Fix infinite recursion in invitations RLS policies
-- Date: 2025-11-16
-- Issue: Invitations RLS policies query organization_members, causing recursion after we fixed org members RLS
-- Solution: Use the helper functions we created for organization_members

-- ============================================================================
-- STEP 1: Drop existing invitations policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can manage invitations" ON invitations;

-- ============================================================================
-- STEP 2: Create new policies using helper functions (no recursion)
-- ============================================================================

-- Helper function to check if user is manager or admin
-- (Can't reuse is_organization_admin because we need manager OR admin)
CREATE OR REPLACE FUNCTION public.is_organization_manager_or_admin(org_id UUID, user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_id = org_id
      AND organization_members.user_id = COALESCE(is_organization_manager_or_admin.user_id, auth.uid())
      AND role IN ('admin', 'manager')
      AND is_active = true
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_organization_manager_or_admin(UUID, UUID) TO authenticated;

-- SELECT: Users can view invitations sent to their email OR admins/managers can view org invitations
CREATE POLICY "Users can view invitations"
ON invitations FOR SELECT
USING (
  -- User's own invitation (sent to their email)
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  -- Admin or manager can view all invitations in their organization
  public.is_organization_manager_or_admin(organization_id)
);

-- INSERT/UPDATE/DELETE: Only admins can manage invitations
CREATE POLICY "Admins can manage invitations"
ON invitations FOR ALL
USING (
  public.is_organization_admin(organization_id)
)
WITH CHECK (
  public.is_organization_admin(organization_id)
);

-- ============================================================================
-- STEP 3: Add comments
-- ============================================================================

COMMENT ON FUNCTION public.is_organization_manager_or_admin IS 'Check if user is a manager or admin of an organization (bypasses RLS to prevent recursion)';
COMMENT ON TABLE invitations IS 'Organization invitations with RLS policies using helper functions to avoid recursion';

-- Verify
DO $$
BEGIN
  RAISE NOTICE 'Invitations RLS recursion fix applied successfully';
  RAISE NOTICE 'Helper function created: is_organization_manager_or_admin()';
  RAISE NOTICE 'Policies now use helper functions to prevent recursion';
END $$;
