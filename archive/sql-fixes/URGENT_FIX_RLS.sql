-- ============================================================================
-- URGENT FIX: Stop infinite recursion in RLS policies
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- Drop problematic policies
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

-- Create helper functions first
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

-- NEW RLS policies using app_metadata (NO RECURSION!)
CREATE POLICY "Users can view members in current org"
ON organization_members FOR SELECT
TO authenticated
USING (
  organization_id = (
    (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
  )
);

CREATE POLICY "Admins can insert members"
ON organization_members FOR INSERT
TO authenticated
WITH CHECK (
  public.is_organization_admin(organization_id)
);

CREATE POLICY "Admins can update members"
ON organization_members FOR UPDATE
TO authenticated
USING (
  public.is_organization_admin(organization_id)
)
WITH CHECK (
  public.is_organization_admin(organization_id)
);

CREATE POLICY "Admins can delete members"
ON organization_members FOR DELETE
TO authenticated
USING (
  public.is_organization_admin(organization_id)
);

-- Invitations policies
CREATE POLICY "Users can view invitations"
ON invitations FOR SELECT
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  (
    organization_id = (
      (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
    )
    AND public.is_organization_manager_or_admin(organization_id)
  )
);

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

-- Set current_organization_id in app_metadata for all existing users
DO $$
DECLARE
  member_record RECORD;
BEGIN
  FOR member_record IN
    SELECT DISTINCT ON (user_id)
      user_id,
      organization_id
    FROM organization_members
    WHERE is_active = true
    ORDER BY user_id, created_at DESC
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data =
      COALESCE(raw_app_meta_data, '{}'::jsonb) ||
      jsonb_build_object('current_organization_id', member_record.organization_id)
    WHERE id = member_record.user_id;
  END LOOP;

  RAISE NOTICE 'RLS FIX COMPLETE - Invitations should work now!';
END $$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.is_organization_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organization_manager_or_admin(UUID, UUID) TO authenticated;
