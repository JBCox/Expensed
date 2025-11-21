-- ============================================================================
-- COMBINED RLS RECURSION FIXES
-- Apply both organization_members AND invitations fixes together
-- Date: 2025-11-16
-- ============================================================================

-- ============================================================================
-- PART 1: Fix organization_members RLS recursion
-- ============================================================================

-- Helper function to check if user is a member of an organization
-- SECURITY DEFINER bypasses RLS, preventing recursion
CREATE OR REPLACE FUNCTION public.is_organization_member(org_id UUID, user_id UUID DEFAULT auth.uid())
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
      AND organization_members.user_id = COALESCE(is_organization_member.user_id, auth.uid())
      AND is_active = true
  );
END;
$$;

-- Helper function to check if user is admin of an organization
CREATE OR REPLACE FUNCTION public.is_organization_admin(org_id UUID, user_id UUID DEFAULT auth.uid())
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
      AND organization_members.user_id = COALESCE(is_organization_admin.user_id, auth.uid())
      AND role = 'admin'
      AND is_active = true
  );
END;
$$;

-- Helper function to check if user is manager or admin
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_organization_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organization_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organization_manager_or_admin(UUID, UUID) TO authenticated;

-- Drop existing organization_members policies (all possible names)
DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage organization members" ON organization_members;
DROP POLICY IF EXISTS "Admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Admins can delete members" ON organization_members;
DROP POLICY IF EXISTS "Users can insert members" ON organization_members;
DROP POLICY IF EXISTS "Admins can insert members" ON organization_members;  -- Added this one!

-- Create new organization_members policies using helper functions
CREATE POLICY "Users can view organization members"
ON organization_members FOR SELECT
USING (
  public.is_organization_member(organization_id)
);

CREATE POLICY "Admins can insert members"
ON organization_members FOR INSERT
WITH CHECK (
  public.is_organization_admin(organization_id)
);

CREATE POLICY "Admins can update members"
ON organization_members FOR UPDATE
USING (
  public.is_organization_admin(organization_id)
)
WITH CHECK (
  public.is_organization_admin(organization_id)
);

CREATE POLICY "Admins can delete members"
ON organization_members FOR DELETE
USING (
  public.is_organization_admin(organization_id)
);

-- ============================================================================
-- PART 2: Fix invitations RLS recursion
-- ============================================================================

-- Drop existing invitations policies
DROP POLICY IF EXISTS "Users can view invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can manage invitations" ON invitations;

-- Create new invitations policies using helper functions
CREATE POLICY "Users can view invitations"
ON invitations FOR SELECT
USING (
  -- User's own invitation (sent to their email)
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  -- Admin or manager can view all invitations in their organization
  public.is_organization_manager_or_admin(organization_id)
);

CREATE POLICY "Admins can manage invitations"
ON invitations FOR ALL
USING (
  public.is_organization_admin(organization_id)
)
WITH CHECK (
  public.is_organization_admin(organization_id)
);

-- ============================================================================
-- Add comments
-- ============================================================================

COMMENT ON FUNCTION public.is_organization_member IS 'Check if user is a member of an organization (bypasses RLS to prevent recursion)';
COMMENT ON FUNCTION public.is_organization_admin IS 'Check if user is an admin of an organization (bypasses RLS to prevent recursion)';
COMMENT ON FUNCTION public.is_organization_manager_or_admin IS 'Check if user is a manager or admin of an organization (bypasses RLS to prevent recursion)';
COMMENT ON TABLE organization_members IS 'Organization membership with RLS policies that avoid infinite recursion using SECURITY DEFINER helper functions';
COMMENT ON TABLE invitations IS 'Organization invitations with RLS policies using helper functions to avoid recursion';

-- ============================================================================
-- Verify
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS RECURSION FIXES APPLIED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Helper functions created:';
  RAISE NOTICE '  - is_organization_member()';
  RAISE NOTICE '  - is_organization_admin()';
  RAISE NOTICE '  - is_organization_manager_or_admin()';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS policies recreated for:';
  RAISE NOTICE '  - organization_members (4 policies)';
  RAISE NOTICE '  - invitations (2 policies)';
  RAISE NOTICE '';
  RAISE NOTICE 'All policies now use helper functions to prevent recursion';
  RAISE NOTICE '========================================';
END $$;
