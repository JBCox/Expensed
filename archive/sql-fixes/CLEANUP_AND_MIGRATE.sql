-- ============================================================================
-- STEP 1: NUCLEAR CLEANUP - Remove ALL policies from expenses and receipts
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all policies on expenses table
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'expenses') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON expenses';
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;

  -- Drop all policies on receipts table
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'receipts') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON receipts';
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;

  -- Drop all policies on organizations table (if it exists)
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'organizations') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON organizations';
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;

  -- Drop all policies on organization_members table (if it exists)
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'organization_members') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON organization_members';
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;

  -- Drop all policies on invitations table (if it exists)
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'invitations') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON invitations';
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;

  RAISE NOTICE '✅ All existing policies dropped';
END $$;

-- ============================================================================
-- STEP 2: CREATE ORGANIZATION TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT,
  settings JSONB DEFAULT '{
    "expense_policies": {
      "max_single_receipt": 500,
      "max_daily_total": 750,
      "max_receipt_age_days": 90
    },
    "approval_workflow": {
      "require_manager_approval": true,
      "require_finance_approval": true
    }
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_domain UNIQUE(domain)
);

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'finance', 'employee')),
  manager_id UUID REFERENCES organization_members(id),
  department TEXT,
  is_active BOOLEAN DEFAULT true,
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_per_org UNIQUE(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'finance', 'employee')),
  manager_id UUID REFERENCES organization_members(id),
  department TEXT,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  accepted_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_invitation_token UNIQUE(token)
);

-- Add organization_id columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- ============================================================================
-- STEP 3: CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_organizations_domain ON organizations(domain) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_org_members_manager_id ON organization_members(manager_id) WHERE manager_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_org_members_active ON organization_members(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_invitations_org_id ON invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at) WHERE status = 'pending';
DROP INDEX IF EXISTS idx_unique_pending_email_per_org;
CREATE UNIQUE INDEX idx_unique_pending_email_per_org ON invitations(organization_id, email) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_expenses_organization_id ON expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_receipts_organization_id ON receipts(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);

-- ============================================================================
-- STEP 4: CREATE FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_organization_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
  UPDATE invitations SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION accept_invitation(p_token UUID, p_user_id UUID)
RETURNS organization_members AS $$
DECLARE
  v_invitation invitations;
  v_member organization_members;
BEGIN
  SELECT * INTO v_invitation FROM invitations
  WHERE token = p_token AND status = 'pending' AND expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;

  INSERT INTO organization_members (organization_id, user_id, role, manager_id, department, invited_by)
  VALUES (v_invitation.organization_id, p_user_id, v_invitation.role, v_invitation.manager_id, v_invitation.department, v_invitation.invited_by)
  RETURNING * INTO v_member;

  UPDATE invitations SET status = 'accepted', accepted_by = p_user_id, accepted_at = NOW()
  WHERE id = v_invitation.id;

  RETURN v_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_organization_with_admin(
  p_name TEXT,
  p_domain TEXT DEFAULT NULL,
  p_settings JSONB DEFAULT NULL,
  p_admin_user_id UUID DEFAULT auth.uid()
)
RETURNS organizations AS $$
DECLARE
  v_organization organizations;
  v_default_settings JSONB := '{"expense_policies":{"max_single_receipt":500,"max_daily_total":750,"max_receipt_age_days":90},"approval_workflow":{"require_manager_approval":true,"require_finance_approval":true}}'::jsonb;
BEGIN
  INSERT INTO organizations (name, domain, settings)
  VALUES (p_name, p_domain, COALESCE(p_settings, v_default_settings))
  RETURNING * INTO v_organization;

  INSERT INTO organization_members (organization_id, user_id, role, is_active)
  VALUES (v_organization.id, p_admin_user_id, 'admin', true);

  RETURN v_organization;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_organization_stats(p_organization_id UUID)
RETURNS TABLE (
  id UUID, name TEXT, domain TEXT, settings JSONB, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  member_count BIGINT, active_member_count BIGINT, pending_invitation_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT o.id, o.name, o.domain, o.settings, o.created_at, o.updated_at,
    (SELECT COUNT(*) FROM organization_members WHERE organization_id = o.id)::BIGINT,
    (SELECT COUNT(*) FROM organization_members WHERE organization_id = o.id AND is_active = true)::BIGINT,
    (SELECT COUNT(*) FROM invitations WHERE organization_id = o.id AND status = 'pending')::BIGINT
  FROM organizations o WHERE o.id = p_organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_organization_context(p_user_id UUID)
RETURNS TABLE (user_id UUID, current_organization JSONB, current_membership JSONB, organizations JSONB, memberships JSONB) AS $$
DECLARE
  v_current_org_id UUID;
  v_current_org JSONB;
  v_current_membership JSONB;
  v_organizations JSONB;
  v_memberships JSONB;
BEGIN
  SELECT om.organization_id INTO v_current_org_id FROM organization_members om
  WHERE om.user_id = p_user_id ORDER BY om.is_active DESC, om.created_at DESC LIMIT 1;

  IF v_current_org_id IS NULL THEN RETURN; END IF;

  SELECT row_to_json(o.*) INTO v_current_org FROM organizations o WHERE o.id = v_current_org_id;
  SELECT row_to_json(om.*) INTO v_current_membership FROM organization_members om WHERE om.organization_id = v_current_org_id AND om.user_id = p_user_id;
  SELECT json_agg(o.*) INTO v_organizations FROM organizations o WHERE o.id IN (SELECT om.organization_id FROM organization_members om WHERE om.user_id = p_user_id AND om.is_active = true);
  SELECT json_agg(om.*) INTO v_memberships FROM organization_members om WHERE om.user_id = p_user_id AND om.is_active = true;

  RETURN QUERY SELECT p_user_id, v_current_org, v_current_membership, COALESCE(v_organizations, '[]'::jsonb), COALESCE(v_memberships, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: CREATE TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_organization_updated_at();

DROP TRIGGER IF EXISTS update_org_members_updated_at ON organization_members;
CREATE TRIGGER update_org_members_updated_at BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION update_organization_updated_at();

-- ============================================================================
-- STEP 6: ENABLE RLS
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 7: CREATE FRESH RLS POLICIES
-- ============================================================================

-- Organizations
CREATE POLICY "Members can view their organizations" ON organizations FOR SELECT
  USING (EXISTS (SELECT 1 FROM organization_members WHERE organization_members.organization_id = organizations.id AND organization_members.user_id = auth.uid() AND organization_members.is_active = true));

CREATE POLICY "Admins can update their organizations" ON organizations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM organization_members WHERE organization_members.organization_id = organizations.id AND organization_members.user_id = auth.uid() AND organization_members.role = 'admin' AND organization_members.is_active = true));

CREATE POLICY "Admins can create organizations" ON organizations FOR INSERT WITH CHECK (true);

-- Organization Members
CREATE POLICY "Users can view their organization memberships" ON organization_members FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM organization_members AS om WHERE om.organization_id = organization_members.organization_id AND om.user_id = auth.uid() AND om.role IN ('admin', 'manager', 'finance') AND om.is_active = true));

CREATE POLICY "Admins can manage organization members" ON organization_members FOR ALL
  USING (EXISTS (SELECT 1 FROM organization_members AS om WHERE om.organization_id = organization_members.organization_id AND om.user_id = auth.uid() AND om.role = 'admin' AND om.is_active = true));

-- Invitations
CREATE POLICY "Users can view invitations sent to their email" ON invitations FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM organization_members WHERE organization_members.organization_id = invitations.organization_id AND organization_members.user_id = auth.uid() AND organization_members.role IN ('admin', 'manager') AND organization_members.is_active = true));

CREATE POLICY "Admins can manage invitations" ON invitations FOR ALL
  USING (EXISTS (SELECT 1 FROM organization_members WHERE organization_members.organization_id = invitations.organization_id AND organization_members.user_id = auth.uid() AND organization_members.role = 'admin' AND organization_members.is_active = true));

-- Expenses
CREATE POLICY "Users can view own expenses in their organization" ON expenses FOR SELECT
  USING (user_id = auth.uid() AND organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Managers and Finance can view all expenses in their organization" ON expenses FOR SELECT
  USING (EXISTS (SELECT 1 FROM organization_members WHERE organization_members.organization_id = expenses.organization_id AND organization_members.user_id = auth.uid() AND organization_members.role IN ('admin', 'manager', 'finance') AND organization_members.is_active = true));

CREATE POLICY "Users can create expenses in their organization" ON expenses FOR INSERT
  WITH CHECK (user_id = auth.uid() AND organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Users can update own draft expenses in their organization" ON expenses FOR UPDATE
  USING (user_id = auth.uid() AND status = 'draft' AND organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Managers and Finance can update expenses in their organization" ON expenses FOR UPDATE
  USING (EXISTS (SELECT 1 FROM organization_members WHERE organization_members.organization_id = expenses.organization_id AND organization_members.user_id = auth.uid() AND organization_members.role IN ('admin', 'manager', 'finance') AND organization_members.is_active = true));

CREATE POLICY "Users can delete own draft expenses" ON expenses FOR DELETE
  USING (user_id = auth.uid() AND status = 'draft');

-- Receipts
CREATE POLICY "Users can view own receipts in their organization" ON receipts FOR SELECT
  USING (user_id = auth.uid() AND organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Managers and Finance can view all receipts in their organization" ON receipts FOR SELECT
  USING (EXISTS (SELECT 1 FROM organization_members WHERE organization_members.organization_id = receipts.organization_id AND organization_members.user_id = auth.uid() AND organization_members.role IN ('admin', 'manager', 'finance') AND organization_members.is_active = true));

CREATE POLICY "Users can create receipts in their organization" ON receipts FOR INSERT
  WITH CHECK (user_id = auth.uid() AND organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Users can update own receipts in their organization" ON receipts FOR UPDATE
  USING (user_id = auth.uid() AND organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Users can delete own receipts" ON receipts FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- STEP 8: DATA MIGRATION
-- ============================================================================

DO $$
DECLARE
  v_default_org_id UUID;
  v_user_record RECORD;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM organizations LIMIT 1) THEN
    IF EXISTS (SELECT 1 FROM users LIMIT 1) THEN
      RAISE NOTICE 'Creating default organization...';
      INSERT INTO organizations (name, domain, created_at) VALUES ('Default Organization', NULL, NOW()) RETURNING id INTO v_default_org_id;

      UPDATE expenses SET organization_id = v_default_org_id WHERE organization_id IS NULL;
      UPDATE receipts SET organization_id = v_default_org_id WHERE organization_id IS NULL;
      UPDATE users SET organization_id = v_default_org_id WHERE organization_id IS NULL;

      FOR v_user_record IN SELECT id, role, department FROM users LOOP
        INSERT INTO organization_members (organization_id, user_id, role, department, is_active)
        VALUES (v_default_org_id, v_user_record.id, v_user_record.role, v_user_record.department, true)
        ON CONFLICT (organization_id, user_id) DO NOTHING;
      END LOOP;

      RAISE NOTICE '✅ Default organization created: %', v_default_org_id;
    END IF;
  ELSE
    RAISE NOTICE '✅ Organizations already exist';
  END IF;
END $$;

-- ============================================================================
-- SUCCESS
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATION COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables: ✓ Created';
  RAISE NOTICE 'Functions: ✓ Created';
  RAISE NOTICE 'RLS Policies: ✓ Created';
  RAISE NOTICE 'Data: ✓ Migrated';
  RAISE NOTICE '========================================';
END $$;
