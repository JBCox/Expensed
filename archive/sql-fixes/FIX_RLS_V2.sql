-- ============================================================================
-- RLS FIX V2: Force drop and recreate all policies
-- ============================================================================

-- STEP 1: Force drop ALL policies on these tables
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on organization_members
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'organization_members') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON organization_members';
    END LOOP;

    -- Drop all policies on invitations
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'invitations') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON invitations';
    END LOOP;

    RAISE NOTICE 'All existing policies dropped';
END $$;

-- STEP 2: Drop and recreate helper functions
DROP FUNCTION IF EXISTS public.is_organization_admin(UUID, UUID);
DROP FUNCTION IF EXISTS public.is_organization_manager_or_admin(UUID, UUID);

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

-- STEP 3: Create NEW policies (using app_metadata - NO RECURSION)

-- organization_members policies
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

-- invitations policies
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

-- STEP 4: Set app_metadata for all existing users
DO $$
DECLARE
  member_record RECORD;
  updated_count INTEGER := 0;
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

    updated_count := updated_count + 1;
  END LOOP;

  RAISE NOTICE '✅ RLS FIX COMPLETE!';
  RAISE NOTICE '   - Updated % users with current_organization_id', updated_count;
  RAISE NOTICE '   - Invitations should now work!';
  RAISE NOTICE '   - Refresh your app to apply changes';
END $$;

-- STEP 5: Grant permissions
GRANT EXECUTE ON FUNCTION public.is_organization_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organization_manager_or_admin(UUID, UUID) TO authenticated;

-- Verification
SELECT
  'organization_members' as table_name,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'organization_members'
UNION ALL
SELECT
  'invitations' as table_name,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'invitations';
