-- ============================================================================
-- Jensify Database Schema - Organization Helper Functions
-- Created: 2025-11-15
-- Description: RPC functions for organization and invitation management
-- ============================================================================

-- ============================================================================
-- CREATE ORGANIZATION WITH ADMIN
-- ============================================================================

/**
 * Creates a new organization and adds the creating user as an admin
 * @param p_name Organization name
 * @param p_domain Optional email domain
 * @param p_settings Optional settings override
 * @param p_admin_user_id User ID to make admin
 * @returns The created organization
 */
CREATE OR REPLACE FUNCTION create_organization_with_admin(
  p_name TEXT,
  p_domain TEXT DEFAULT NULL,
  p_settings JSONB DEFAULT NULL,
  p_admin_user_id UUID DEFAULT auth.uid()
)
RETURNS organizations 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_organization organizations;
  v_default_settings JSONB := '{
    "expense_policies": {
      "max_single_receipt": 500,
      "max_daily_total": 750,
      "max_receipt_age_days": 90
    },
    "approval_workflow": {
      "require_manager_approval": true,
      "require_finance_approval": true
    }
  }'::jsonb;
BEGIN
  -- Create organization
  INSERT INTO organizations (name, domain, settings)
  VALUES (
    p_name,
    p_domain,
    COALESCE(p_settings, v_default_settings)
  )
  RETURNING * INTO v_organization;

  -- Add creator as admin
  INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    is_active
  ) VALUES (
    v_organization.id,
    p_admin_user_id,
    'admin',
    true
  );

  RETURN v_organization;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_organization_with_admin IS 'Creates organization and adds creator as admin';

-- ============================================================================
-- GET ORGANIZATION STATS
-- ============================================================================

/**
 * Get organization with member and invitation statistics
 * @param p_organization_id Organization ID
 * @returns Organization with stats
 */
CREATE OR REPLACE FUNCTION get_organization_stats(
  p_organization_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  domain TEXT,
  settings JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  member_count BIGINT,
  active_member_count BIGINT,
  pending_invitation_count BIGINT
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.domain,
    o.settings,
    o.created_at,
    o.updated_at,
    (SELECT COUNT(*) FROM organization_members WHERE organization_id = o.id) AS member_count,
    (SELECT COUNT(*) FROM organization_members WHERE organization_id = o.id AND is_active = true) AS active_member_count,
    (SELECT COUNT(*) FROM invitations WHERE organization_id = o.id AND status = 'pending') AS pending_invitation_count
  FROM organizations o
  WHERE o.id = p_organization_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_organization_stats IS 'Returns organization with member and invitation counts';

-- ============================================================================
-- GET USER ORGANIZATION CONTEXT
-- ============================================================================

/**
 * Get full organization context for a user
 * Returns current organization, membership, and all organizations user belongs to
 * @param p_user_id User ID
 * @returns User organization context
 */
CREATE OR REPLACE FUNCTION get_user_organization_context(
  p_user_id UUID
)
RETURNS TABLE (
  user_id UUID,
  current_organization JSONB,
  current_membership JSONB,
  organizations JSONB,
  memberships JSONB
) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_org_id UUID;
  v_current_org JSONB;
  v_current_membership JSONB;
  v_organizations JSONB;
  v_memberships JSONB;
BEGIN
  -- Get user's first active membership (or last one if none active)
  SELECT om.organization_id INTO v_current_org_id
  FROM organization_members om
  WHERE om.user_id = p_user_id
  ORDER BY om.is_active DESC, om.created_at DESC
  LIMIT 1;

  -- If user has no organizations, return null
  IF v_current_org_id IS NULL THEN
    RETURN;
  END IF;

  -- Get current organization
  SELECT row_to_json(o.*) INTO v_current_org
  FROM organizations o
  WHERE o.id = v_current_org_id;

  -- Get current membership
  SELECT row_to_json(om.*) INTO v_current_membership
  FROM organization_members om
  WHERE om.organization_id = v_current_org_id
    AND om.user_id = p_user_id;

  -- Get all organizations
  SELECT json_agg(o.*) INTO v_organizations
  FROM organizations o
  WHERE o.id IN (
    SELECT om.organization_id
    FROM organization_members om
    WHERE om.user_id = p_user_id
      AND om.is_active = true
  );

  -- Get all memberships
  SELECT json_agg(om.*) INTO v_memberships
  FROM organization_members om
  WHERE om.user_id = p_user_id
    AND om.is_active = true;

  -- Return context
  RETURN QUERY SELECT
    p_user_id,
    v_current_org,
    v_current_membership,
    COALESCE(v_organizations, '[]'::jsonb),
    COALESCE(v_memberships, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_organization_context IS 'Returns complete organization context for a user';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Organization Helper Functions Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - create_organization_with_admin()';
  RAISE NOTICE '  - get_organization_stats()';
  RAISE NOTICE '  - get_user_organization_context()';
  RAISE NOTICE '========================================';
END $$;
