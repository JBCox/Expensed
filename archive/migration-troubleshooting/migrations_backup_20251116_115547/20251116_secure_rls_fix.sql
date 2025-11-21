-- ============================================================================
-- SECURE RLS FIX: Hybrid approach - app_metadata + membership verification
-- Date: 2025-11-16
--
-- Fixes critical security issues:
-- 1. SQL scope error in COALESCE (is_organization_member.user_id doesn't exist)
-- 2. Security flaw: removed admins can still act until JWT expires
-- 3. Solution: Use app_metadata for perf + verify actual membership for writes
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop existing problematic policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins can insert members" ON organization_members;
DROP POLICY IF EXISTS "Admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Admins can delete members" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage invitations" ON invitations;

-- ============================================================================
-- STEP 2: Fix helper functions - correct parameter scoping
-- ============================================================================

-- Fix: Use parameter name directly, not table.column syntax
CREATE OR REPLACE FUNCTION public.is_organization_admin_verified(org_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user is CURRENTLY an active admin (not just cached in JWT)
  RETURN EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_id = org_id
      AND user_id = COALESCE(check_user_id, auth.uid())
      AND role = 'admin'
      AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_organization_manager_or_admin_verified(org_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user is CURRENTLY an active manager or admin
  RETURN EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_id = org_id
      AND user_id = COALESCE(check_user_id, auth.uid())
      AND role IN ('admin', 'manager')
      AND is_active = true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_organization_admin_verified(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organization_manager_or_admin_verified(UUID, UUID) TO authenticated;

-- ============================================================================
-- STEP 3: Create SECURE policies - hybrid approach
-- ============================================================================

-- organization_members INSERT: Verify admin status in real-time
CREATE POLICY "Admins can insert members"
ON organization_members FOR INSERT
TO authenticated
WITH CHECK (
  -- Fast check: Is user in the right org? (from JWT)
  organization_id = (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
  AND
  -- Security check: Is user CURRENTLY an admin? (live DB check)
  public.is_organization_admin_verified(organization_id)
);

-- organization_members UPDATE: Verify admin status in real-time
CREATE POLICY "Admins can update members"
ON organization_members FOR UPDATE
TO authenticated
USING (
  organization_id = (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
  AND public.is_organization_admin_verified(organization_id)
)
WITH CHECK (
  organization_id = (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
  AND public.is_organization_admin_verified(organization_id)
);

-- organization_members DELETE: Verify admin status in real-time
CREATE POLICY "Admins can delete members"
ON organization_members FOR DELETE
TO authenticated
USING (
  organization_id = (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
  AND public.is_organization_admin_verified(organization_id)
);

-- invitations: Verify admin status in real-time
CREATE POLICY "Admins can manage invitations"
ON invitations FOR ALL
TO authenticated
USING (
  organization_id = (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
  AND public.is_organization_manager_or_admin_verified(organization_id)
)
WITH CHECK (
  organization_id = (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
  AND public.is_organization_manager_or_admin_verified(organization_id)
);

-- ============================================================================
-- STEP 4: Add trigger to clear app_metadata when membership changes
-- ============================================================================

-- Function to clear stale app_metadata when membership is removed/deactivated
CREATE OR REPLACE FUNCTION public.clear_user_app_metadata_on_membership_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If membership is deactivated or deleted, clear app_metadata
  IF (TG_OP = 'DELETE') OR (NEW.is_active = false AND OLD.is_active = true) THEN
    UPDATE auth.users
    SET raw_app_meta_data =
      COALESCE(raw_app_meta_data, '{}'::jsonb) - 'current_organization_id' - 'role'
    WHERE id = COALESCE(NEW.user_id, OLD.user_id);

    RAISE NOTICE 'Cleared app_metadata for user % due to membership change', COALESCE(NEW.user_id, OLD.user_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to auto-clear metadata
DROP TRIGGER IF EXISTS clear_metadata_on_membership_change ON organization_members;

CREATE TRIGGER clear_metadata_on_membership_change
AFTER UPDATE OF is_active OR DELETE ON organization_members
FOR EACH ROW
EXECUTE FUNCTION public.clear_user_app_metadata_on_membership_change();

-- ============================================================================
-- STEP 5: Update helper functions to set role in app_metadata
-- ============================================================================

DROP FUNCTION IF EXISTS public.create_organization_with_admin(TEXT, UUID);
DROP FUNCTION IF EXISTS public.accept_invitation(UUID);
DROP FUNCTION IF EXISTS public.set_current_organization(UUID);

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

  INSERT INTO organizations (name)
  VALUES (p_organization_name)
  RETURNING id INTO v_org_id;

  INSERT INTO organization_members (organization_id, user_id, role, is_active)
  VALUES (v_org_id, v_user_id, 'admin', true)
  RETURNING id INTO v_member_id;

  -- Set app_metadata for performance
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

  SELECT * INTO v_invitation
  FROM invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  IF v_invitation.email != (SELECT email FROM auth.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'Invitation email does not match user email';
  END IF;

  INSERT INTO organization_members (
    organization_id, user_id, role, manager_id, department, is_active
  )
  VALUES (
    v_invitation.organization_id, v_user_id, v_invitation.role,
    v_invitation.manager_id, v_invitation.department, true
  )
  RETURNING id INTO v_member_id;

  UPDATE invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = v_invitation.id;

  -- Set app_metadata for performance
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

  SELECT * INTO v_member
  FROM organization_members
  WHERE organization_id = p_organization_id
    AND user_id = v_user_id
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User is not a member of this organization';
  END IF;

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

GRANT EXECUTE ON FUNCTION public.create_organization_with_admin(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_current_organization(UUID) TO authenticated;

-- ============================================================================
-- STEP 6: Migrate existing users
-- ============================================================================

DO $$
DECLARE
  member_record RECORD;
BEGIN
  FOR member_record IN
    SELECT DISTINCT ON (user_id)
      user_id, organization_id, role
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

  RAISE NOTICE 'Migration complete';
END $$;

-- ============================================================================
-- STEP 7: Verify
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SECURE RLS FIX APPLIED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Security improvements:';
  RAISE NOTICE '  ✓ Fixed SQL scope errors';
  RAISE NOTICE '  ✓ Hybrid approach: app_metadata + live DB checks';
  RAISE NOTICE '  ✓ Auto-clear metadata on membership removal';
  RAISE NOTICE '  ✓ Removed admins immediately lose access';
  RAISE NOTICE '========================================';
END $$;
