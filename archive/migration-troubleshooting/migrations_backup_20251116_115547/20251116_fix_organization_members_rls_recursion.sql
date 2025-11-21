-- Fix infinite recursion in organization_members RLS policies
-- Date: 2025-11-16
-- Issue: RLS policies on organization_members were querying the same table, causing infinite recursion
-- Solution: Use SECURITY DEFINER helper function to bypass RLS when checking membership

-- ============================================================================
-- STEP 1: Create helper function to check organization membership
-- ============================================================================

-- Function to check if user is a member of an organization
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

-- Function to check if user is admin of an organization
-- SECURITY DEFINER bypasses RLS, preventing recursion
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

-- ============================================================================
-- STEP 2: Drop existing policies that cause recursion
-- ============================================================================

DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage organization members" ON organization_members;
DROP POLICY IF EXISTS "Admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Admins can delete members" ON organization_members;
DROP POLICY IF EXISTS "Users can insert members" ON organization_members;

-- ============================================================================
-- STEP 3: Create new policies using helper functions (no recursion)
-- ============================================================================

-- SELECT: Members can view other members in their organization
CREATE POLICY "Users can view organization members"
ON organization_members FOR SELECT
USING (
  -- Use helper function instead of querying organization_members directly
  public.is_organization_member(organization_id)
);

-- INSERT: Only admins can add members directly
-- (Most inserts happen via RPC functions with SECURITY DEFINER)
CREATE POLICY "Admins can insert members"
ON organization_members FOR INSERT
WITH CHECK (
  public.is_organization_admin(organization_id)
);

-- UPDATE: Admins can update members in their organization
CREATE POLICY "Admins can update members"
ON organization_members FOR UPDATE
USING (
  public.is_organization_admin(organization_id)
)
WITH CHECK (
  public.is_organization_admin(organization_id)
);

-- DELETE: Admins can delete members in their organization
CREATE POLICY "Admins can delete members"
ON organization_members FOR DELETE
USING (
  public.is_organization_admin(organization_id)
);

-- ============================================================================
-- STEP 4: Grant execute permissions on helper functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.is_organization_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organization_admin(UUID, UUID) TO authenticated;

-- ============================================================================
-- STEP 5: Add comments
-- ============================================================================

COMMENT ON FUNCTION public.is_organization_member IS 'Check if user is a member of an organization (bypasses RLS to prevent recursion)';
COMMENT ON FUNCTION public.is_organization_admin IS 'Check if user is an admin of an organization (bypasses RLS to prevent recursion)';
COMMENT ON TABLE organization_members IS 'Organization membership with RLS policies that avoid infinite recursion using SECURITY DEFINER helper functions';

-- Verify
DO $$
BEGIN
  RAISE NOTICE 'Organization members RLS recursion fix applied successfully';
  RAISE NOTICE 'Helper functions created: is_organization_member(), is_organization_admin()';
  RAISE NOTICE 'RLS policies recreated using helper functions';
END $$;
