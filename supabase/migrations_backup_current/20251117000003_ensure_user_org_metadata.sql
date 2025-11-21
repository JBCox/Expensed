-- ============================================================================
-- Ensure all users have current_organization_id and role in app_metadata
-- Date: 2025-11-17
--
-- This ensures users who logged in before multi-tenancy have their metadata set
-- ============================================================================

DO $$
DECLARE
  member_record RECORD;
  updated_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Checking and updating user app_metadata...';

  -- For each active organization member, ensure app_metadata has org and role
  FOR member_record IN
    SELECT DISTINCT ON (user_id)
      user_id,
      organization_id,
      role
    FROM organization_members
    WHERE is_active = true
    ORDER BY user_id, created_at DESC
  LOOP
    -- Check if metadata is missing or incomplete
    IF NOT EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = member_record.user_id
        AND (raw_app_meta_data ->> 'current_organization_id')::uuid = member_record.organization_id
        AND (raw_app_meta_data ->> 'role') = member_record.role
    ) THEN
      -- Update metadata
      UPDATE auth.users
      SET raw_app_meta_data =
        COALESCE(raw_app_meta_data, '{}'::jsonb) ||
        jsonb_build_object(
          'current_organization_id', member_record.organization_id,
          'role', member_record.role
        )
      WHERE id = member_record.user_id;

      updated_count := updated_count + 1;

      RAISE NOTICE 'Updated user %: org=%, role=%',
        member_record.user_id,
        member_record.organization_id,
        member_record.role;
    END IF;
  END LOOP;

  RAISE NOTICE 'Updated % user(s) app_metadata', updated_count;
  RAISE NOTICE 'Users must log out and log back in for changes to take effect';
END $$;
