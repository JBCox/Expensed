-- ============================================================================
-- PROPER RLS FIX: Use app_metadata to eliminate recursion
-- Date: 2025-11-16
--
-- This is the REAL SOLUTION following Supabase's recommended pattern:
-- - Store current organization_id in auth.users.app_metadata
-- - RLS policies check app_metadata instead of querying organization_members
-- - No self-referencing queries = no recursion
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop ALL existing problematic policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage organization members" ON organization_members;
DROP POLICY IF EXISTS "Admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Admins can delete members" ON organization_members;
DROP POLICY IF EXISTS "Users can insert members" ON organization_members;
DROP POLICY IF EXISTS "Admins can insert members" ON organization_members;
DROP POLICY IF EXISTS "Authenticated users can view all organization members" ON organization_members;
DROP POLICY IF EXISTS "Service role can insert members" ON organization_members;

DROP POLICY IF EXISTS "Users can view invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can manage invitations" ON invitations;

-- ============================================================================
-- STEP 2: Create NEW RLS policies using app_metadata (NO RECURSION)
-- ============================================================================

-- organization_members policies
-- --------------------------------

-- SELECT: Users can view members in their current organization
CREATE POLICY "Users can view members in current org"
ON organization_members FOR SELECT
TO authenticated
USING (
  organization_id = (
    (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
  )
);

-- INSERT: Only admins can add members (checked via helper function with SECURITY DEFINER)
CREATE POLICY "Admins can insert members"
ON organization_members FOR INSERT
TO authenticated
WITH CHECK (
  public.is_organization_admin(organization_id)
);

-- UPDATE: Only admins can update members
CREATE POLICY "Admins can update members"
ON organization_members FOR UPDATE
TO authenticated
USING (
  public.is_organization_admin(organization_id)
)
WITH CHECK (
  public.is_organization_admin(organization_id)
);

-- DELETE: Only admins can delete members
CREATE POLICY "Admins can delete members"
ON organization_members FOR DELETE
TO authenticated
USING (
  public.is_organization_admin(organization_id)
);

-- invitations policies
-- --------------------------------

-- SELECT: Users can view invitations sent to their email OR in their current org (if admin/manager)
CREATE POLICY "Users can view invitations"
ON invitations FOR SELECT
TO authenticated
USING (
  -- Own invitation (sent to their email)
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  -- Admin/Manager can view all invitations in current organization
  (
    organization_id = (
      (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
    )
    AND public.is_organization_manager_or_admin(organization_id)
  )
);

-- INSERT/UPDATE/DELETE: Only admins can manage invitations in their current org
CREATE POLICY "Admins can manage invitations"
ON invitations FOR ALL
TO authenticated
USING (
  organization_id = (
    (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
  )
  AND public.is_organization_admin(organization_id)
)
WITH CHECK (
  organization_id = (
    (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
  )
  AND public.is_organization_admin(organization_id)
);

-- ============================================================================
-- STEP 3: Drop existing helper functions before recreating
-- ============================================================================

-- Drop all existing versions of functions (handles multiple signatures)
DROP FUNCTION IF EXISTS public.create_organization_with_admin(TEXT, TEXT, JSONB, UUID);
DROP FUNCTION IF EXISTS public.create_organization_with_admin(TEXT, UUID);
DROP FUNCTION IF EXISTS public.accept_invitation(UUID, UUID);
DROP FUNCTION IF EXISTS public.accept_invitation(UUID);
DROP FUNCTION IF EXISTS public.set_current_organization(UUID);

-- ============================================================================
-- STEP 4: Update helper functions to manage app_metadata
-- ============================================================================

-- Update create_organization_with_admin to set app_metadata
CREATE OR REPLACE FUNCTION public.create_organization_with_admin(
  p_organization_name TEXT,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  organization_id UUID,
  member_id UUID,
  organization_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_member_id UUID;
  v_user_id UUID;
BEGIN
  -- Use provided user_id or current user
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  -- Create the organization
  INSERT INTO organizations (name)
  VALUES (p_organization_name)
  RETURNING id INTO v_org_id;

  -- Add user as admin member
  INSERT INTO organization_members (organization_id, user_id, role, is_active)
  VALUES (v_org_id, v_user_id, 'admin', true)
  RETURNING id INTO v_member_id;

  -- Set current organization in app_metadata
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('current_organization_id', v_org_id)
  WHERE id = v_user_id;

  -- Return the results
  RETURN QUERY
  SELECT v_org_id, v_member_id, p_organization_name;
END;
$$;

-- Update accept_invitation to set app_metadata
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token UUID)
RETURNS TABLE (
  invitation_id UUID,
  organization_id UUID,
  member_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
  v_member_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get invitation details
  SELECT * INTO v_invitation
  FROM invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Verify email matches
  IF v_invitation.email != (SELECT email FROM auth.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'Invitation email does not match user email';
  END IF;

  -- Create organization member
  INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    manager_id,
    department,
    is_active
  )
  VALUES (
    v_invitation.organization_id,
    v_user_id,
    v_invitation.role,
    v_invitation.manager_id,
    v_invitation.department,
    true
  )
  RETURNING id INTO v_member_id;

  -- Update invitation status
  UPDATE invitations
  SET status = 'accepted',
      accepted_at = NOW()
  WHERE id = v_invitation.id;

  -- Set current organization in app_metadata
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('current_organization_id', v_invitation.organization_id)
  WHERE id = v_user_id;

  -- Return the results
  RETURN QUERY
  SELECT v_invitation.id, v_invitation.organization_id, v_member_id;
END;
$$;

-- ============================================================================
-- STEP 5: Create helper function to switch organizations (for future multi-org support)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_current_organization(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_member BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Verify user is a member of this organization
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_id = p_organization_id
      AND user_id = v_user_id
      AND is_active = true
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'User is not a member of this organization';
  END IF;

  -- Update app_metadata
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('current_organization_id', p_organization_id)
  WHERE id = v_user_id;

  RETURN true;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_organization_with_admin(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_current_organization(UUID) TO authenticated;

-- ============================================================================
-- STEP 6: Keep existing SECURITY DEFINER helper functions for admin checks
-- ============================================================================
-- These are still needed for INSERT/UPDATE/DELETE policies
-- They work because they only READ, they don't participate in recursive writes

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

-- ============================================================================
-- STEP 7: Migrate existing users - set app_metadata for current org members
-- ============================================================================

-- Set current_organization_id for all existing users who are org members
-- Uses a DO block to safely update each user's app_metadata
DO $$
DECLARE
  member_record RECORD;
BEGIN
  -- For each active organization member, set their current org in app_metadata
  FOR member_record IN
    SELECT DISTINCT ON (user_id)
      user_id,
      organization_id
    FROM organization_members
    WHERE is_active = true
    ORDER BY user_id, created_at DESC -- Most recent organization if user has multiple
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data =
      COALESCE(raw_app_meta_data, '{}'::jsonb) ||
      jsonb_build_object('current_organization_id', member_record.organization_id)
    WHERE id = member_record.user_id;

    RAISE NOTICE 'Set organization % for user %',
      member_record.organization_id,
      member_record.user_id;
  END LOOP;

  RAISE NOTICE 'Migrated existing users to use app_metadata';
END $$;

-- ============================================================================
-- STEP 8: Add comments and verify
-- ============================================================================

COMMENT ON POLICY "Users can view members in current org" ON organization_members IS
  'Uses app_metadata to avoid RLS recursion - no self-referencing queries';

COMMENT ON FUNCTION public.create_organization_with_admin IS
  'Creates organization and sets current_organization_id in app_metadata';

COMMENT ON FUNCTION public.accept_invitation IS
  'Accepts invitation and sets current_organization_id in app_metadata';

COMMENT ON FUNCTION public.set_current_organization IS
  'Switches user context to different organization (for multi-org users)';

-- Verify
DO $$
DECLARE
  member_policy_count INTEGER;
  invitation_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO member_policy_count
  FROM pg_policies
  WHERE tablename = 'organization_members';

  SELECT COUNT(*) INTO invitation_policy_count
  FROM pg_policies
  WHERE tablename = 'invitations';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'PROPER RLS FIX APPLIED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'organization_members policies: %', member_policy_count;
  RAISE NOTICE 'invitations policies: %', invitation_policy_count;
  RAISE NOTICE '';
  RAISE NOTICE 'KEY CHANGES:';
  RAISE NOTICE '  - SELECT policies use app_metadata (no recursion)';
  RAISE NOTICE '  - Helper functions set current_organization_id';
  RAISE NOTICE '  - Admin checks still use SECURITY DEFINER';
  RAISE NOTICE '  - This is the REAL solution, not a bandaid';
  RAISE NOTICE '========================================';
END $$;
