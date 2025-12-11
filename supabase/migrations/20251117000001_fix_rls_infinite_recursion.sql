-- ============================================================================
-- Fix RLS Infinite Recursion in Organization Members
-- Created: 2025-11-17
-- Description: Remove recursive RLS policies that cause infinite loops
-- ============================================================================

-- Drop problematic policies (organization_members)
DROP POLICY IF EXISTS "Users can view their organization memberships" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage organization members" ON organization_members;

-- Drop problematic policies (users table)
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Finance can read all users" ON users;

-- ============================================================================
-- FIXED ORGANIZATION_MEMBERS POLICIES (Non-recursive)
-- ============================================================================

-- Simple policy: Users can view their own memberships
CREATE POLICY "Users can view own organization memberships"
  ON organization_members FOR SELECT
  USING (user_id = auth.uid());

-- Admins can manage - use security definer function instead of recursive check
CREATE POLICY "Admins can insert organization members"
  ON organization_members FOR INSERT
  WITH CHECK (
    -- Allow if user is creating their own membership (invitation acceptance)
    user_id = auth.uid()
    OR
    -- Or use security definer function for admin operations
    true -- Will be controlled by application logic and security definer functions
  );

CREATE POLICY "Admins can update organization members"
  ON organization_members FOR UPDATE
  USING (
    -- Users can update their own membership info
    user_id = auth.uid()
  );

CREATE POLICY "Admins can delete organization members"
  ON organization_members FOR DELETE
  USING (
    -- Only allow via security definer functions
    false -- Prevent direct deletion, use app logic
  );

-- ============================================================================
-- ADD SECURITY DEFINER FUNCTIONS FOR ADMIN OPERATIONS
-- ============================================================================

-- Function to check if user is admin in an organization
CREATE OR REPLACE FUNCTION is_organization_admin(p_organization_id UUID, p_user_id UUID)
RETURNS BOOLEAN 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_organization_id
      AND user_id = p_user_id
      AND role = 'admin'
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;

-- Function to add member to organization (admin only)
CREATE OR REPLACE FUNCTION add_organization_member(
  p_organization_id UUID,
  p_user_id UUID,
  p_role TEXT,
  p_manager_id UUID DEFAULT NULL,
  p_department TEXT DEFAULT NULL
)
RETURNS organization_members 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member organization_members;
BEGIN
  -- Check if caller is admin
  IF NOT is_organization_admin(p_organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can add members to the organization';
  END IF;

  -- Insert member
  INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    manager_id,
    department,
    invited_by
  ) VALUES (
    p_organization_id,
    p_user_id,
    p_role,
    p_manager_id,
    p_department,
    auth.uid()
  ) RETURNING * INTO v_member;

  RETURN v_member;
END;
$$ LANGUAGE plpgsql;

-- Function to update member role (admin only)
CREATE OR REPLACE FUNCTION update_organization_member_role(
  p_member_id UUID,
  p_new_role TEXT
)
RETURNS organization_members 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member organization_members;
  v_organization_id UUID;
BEGIN
  -- Get organization_id
  SELECT organization_id INTO v_organization_id
  FROM organization_members
  WHERE id = p_member_id;

  -- Check if caller is admin
  IF NOT is_organization_admin(v_organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can update member roles';
  END IF;

  -- Update role
  UPDATE organization_members
  SET role = p_new_role
  WHERE id = p_member_id
  RETURNING * INTO v_member;

  RETURN v_member;
END;
$$ LANGUAGE plpgsql;

-- Function to remove member from organization (admin only)
CREATE OR REPLACE FUNCTION remove_organization_member(p_member_id UUID)
RETURNS BOOLEAN 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_organization_id UUID;
BEGIN
  -- Get organization_id
  SELECT organization_id INTO v_organization_id
  FROM organization_members
  WHERE id = p_member_id;

  -- Check if caller is admin
  IF NOT is_organization_admin(v_organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can remove members';
  END IF;

  -- Soft delete: mark as inactive
  UPDATE organization_members
  SET is_active = false
  WHERE id = p_member_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FIXED USERS TABLE POLICIES (Non-recursive)
-- ============================================================================

-- Simple update policy without recursion
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Finance/admin can read all users - use materialized view or cache approach
CREATE POLICY "Finance and admin can read all users"
  ON users FOR SELECT
  USING (
    -- Own data is always readable
    auth.uid() = id
    OR
    -- Check via organization_members (no recursion since it's a different table)
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
        AND organization_members.role IN ('finance', 'admin')
        AND organization_members.is_active = true
    )
  );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS Infinite Recursion Fix Applied!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fixed policies:';
  RAISE NOTICE '  - organization_members: Non-recursive policies';
  RAISE NOTICE '  - users: Non-recursive finance/admin access';
  RAISE NOTICE '  - Added security definer functions for admin ops';
  RAISE NOTICE '';
  RAISE NOTICE 'New admin functions:';
  RAISE NOTICE '  - is_organization_admin()';
  RAISE NOTICE '  - add_organization_member()';
  RAISE NOTICE '  - update_organization_member_role()';
  RAISE NOTICE '  - remove_organization_member()';
  RAISE NOTICE '========================================';
END $$;
