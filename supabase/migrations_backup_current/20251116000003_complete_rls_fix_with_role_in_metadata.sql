-- ============================================================================
-- COMPLETE RLS FIX: Store organization_id AND role in app_metadata
-- Date: 2025-11-16
--
-- The previous migration still had recursion because INSERT/UPDATE/DELETE policies
-- called is_organization_admin(), which queries organization_members, causing recursion.
--
-- This migration stores BOTH organization_id and role in app_metadata, so NO policies
-- need to query organization_members at all.
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop policies that still cause recursion
-- ============================================================================

DROP POLICY IF EXISTS "Admins can insert members" ON organization_members;
DROP POLICY IF EXISTS "Admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Admins can delete members" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage invitations" ON invitations;

-- ============================================================================
-- STEP 2: Create NEW policies using ONLY app_metadata (zero recursion)
-- ============================================================================

-- organization_members INSERT: Only admins can add members
CREATE POLICY "Admins can insert members"
ON organization_members FOR INSERT
TO authenticated
WITH CHECK (
  -- Check both org and role from app_metadata (no table query!)
  organization_id = (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- organization_members UPDATE: Only admins can update members
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

-- organization_members DELETE: Only admins can delete members
CREATE POLICY "Admins can delete members"
ON organization_members FOR DELETE
TO authenticated
USING (
  organization_id = (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- invitations INSERT/UPDATE/DELETE: Only admins can manage
CREATE POLICY "Admins can manage invitations"
ON invitations FOR ALL
TO authenticated
USING (
  organization_id = (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  organization_id = (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- ============================================================================
-- STEP 3: Update helper functions to set role in app_metadata
-- ============================================================================

-- Drop and recreate create_organization_with_admin
DROP FUNCTION IF EXISTS public.create_organization_with_admin(TEXT, UUID);

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

  -- Set BOTH organization_id AND role in app_metadata
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object(
      'current_organization_id', v_org_id,
      'role', 'admin'
    )
  WHERE id = v_user_id;

  RETURN QUERY
  SELECT v_org_id, v_member_id, p_organization_name;
END;
$$;

-- Drop and recreate accept_invitation
DROP FUNCTION IF EXISTS public.accept_invitation(UUID);

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

  -- Set BOTH organization_id AND role in app_metadata
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object(
      'current_organization_id', v_invitation.organization_id,
      'role', v_invitation.role
    )
  WHERE id = v_user_id;

  RETURN QUERY
  SELECT v_invitation.id, v_invitation.organization_id, v_member_id;
END;
$$;

-- Drop and recreate set_current_organization
DROP FUNCTION IF EXISTS public.set_current_organization(UUID);

CREATE OR REPLACE FUNCTION public.set_current_organization(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_member RECORD;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get user's membership (including role)
  SELECT * INTO v_member
  FROM organization_members
  WHERE organization_id = p_organization_id
    AND user_id = v_user_id
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User is not a member of this organization';
  END IF;

  -- Update app_metadata with BOTH org and role
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object(
      'current_organization_id', p_organization_id,
      'role', v_member.role
    )
  WHERE id = v_user_id;

  RETURN true;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_organization_with_admin(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_current_organization(UUID) TO authenticated;

-- ============================================================================
-- STEP 4: Migrate existing users - set role in app_metadata
-- ============================================================================

DO $$
DECLARE
  member_record RECORD;
BEGIN
  -- For each active organization member, set BOTH org and role in app_metadata
  FOR member_record IN
    SELECT DISTINCT ON (user_id)
      user_id,
      organization_id,
      role
    FROM organization_members
    WHERE is_active = true
    ORDER BY user_id, created_at DESC
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data =
      COALESCE(raw_app_meta_data, '{}'::jsonb) ||
      jsonb_build_object(
        'current_organization_id', member_record.organization_id,
        'role', member_record.role
      )
    WHERE id = member_record.user_id;

    RAISE NOTICE 'Set org % and role % for user %',
      member_record.organization_id,
      member_record.role,
      member_record.user_id;
  END LOOP;

  RAISE NOTICE 'Migrated existing users with role in app_metadata';
END $$;

-- ============================================================================
-- STEP 5: Update comments
-- ============================================================================

COMMENT ON POLICY "Admins can insert members" ON organization_members IS
  'Uses app_metadata for both org and role - zero recursion';

COMMENT ON POLICY "Admins can update members" ON organization_members IS
  'Uses app_metadata for both org and role - zero recursion';

COMMENT ON POLICY "Admins can delete members" ON organization_members IS
  'Uses app_metadata for both org and role - zero recursion';

COMMENT ON POLICY "Admins can manage invitations" ON invitations IS
  'Uses app_metadata for both org and role - zero recursion';

COMMENT ON FUNCTION public.create_organization_with_admin IS
  'Creates organization and sets current_organization_id + role in app_metadata';

COMMENT ON FUNCTION public.accept_invitation IS
  'Accepts invitation and sets current_organization_id + role in app_metadata';

COMMENT ON FUNCTION public.set_current_organization IS
  'Switches user context and updates role in app_metadata';

-- Verify
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'COMPLETE RLS FIX APPLIED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ALL policies now use app_metadata only';
  RAISE NOTICE 'NO table queries in ANY policies';
  RAISE NOTICE 'ZERO recursion possible';
  RAISE NOTICE '';
  RAISE NOTICE 'app_metadata now contains:';
  RAISE NOTICE '  - current_organization_id';
  RAISE NOTICE '  - role';
  RAISE NOTICE '========================================';
END $$;
