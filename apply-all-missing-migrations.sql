-- =====================================================
-- COMPLETE MIGRATION PACKAGE FOR PRODUCTION
-- Date: 2025-11-19
-- =====================================================
-- This file contains ALL missing migrations in order:
-- 1. Create expense_reports tables (20251118181705)
-- 2. Link expenses to reports (20251119000001)
-- 3. Backfill expense flags (20251119001000)
-- 4. Add auto-report metadata (20251119004500)
-- =====================================================

-- =====================================================
-- MIGRATION 1: Create expense_reports tables
-- File: 20251118181705_expense_reports.sql
-- =====================================================

BEGIN;

-- 1. Create expense_reports table
CREATE TABLE IF NOT EXISTS expense_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),
  total_amount DECIMAL(10, 2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CONSTRAINT positive_total CHECK (total_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_expense_reports_organization ON expense_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_expense_reports_user ON expense_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_reports_status ON expense_reports(status);
CREATE INDEX IF NOT EXISTS idx_expense_reports_created ON expense_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expense_reports_submitted ON expense_reports(submitted_at DESC) WHERE submitted_at IS NOT NULL;

DROP TRIGGER IF EXISTS update_expense_reports_updated_at ON expense_reports;
CREATE TRIGGER update_expense_reports_updated_at
  BEFORE UPDATE ON expense_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 2. Create report_expenses junction table
CREATE TABLE IF NOT EXISTS report_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES expense_reports(id) ON DELETE CASCADE,
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id)
);

-- Add unique constraints only if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'report_expenses_report_id_expense_id_key'
  ) THEN
    ALTER TABLE report_expenses ADD CONSTRAINT report_expenses_report_id_expense_id_key UNIQUE(report_id, expense_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'report_expenses_report_id_display_order_key'
  ) THEN
    ALTER TABLE report_expenses ADD CONSTRAINT report_expenses_report_id_display_order_key UNIQUE(report_id, display_order);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_report_expenses_report ON report_expenses(report_id);
CREATE INDEX IF NOT EXISTS idx_report_expenses_expense ON report_expenses(expense_id);
CREATE INDEX IF NOT EXISTS idx_report_expenses_expense_lookup ON report_expenses(expense_id, report_id);

-- 3. Trigger: Update report total_amount
CREATE OR REPLACE FUNCTION update_report_total()
RETURNS TRIGGER AS $$
DECLARE
  v_report_id UUID;
  v_new_total DECIMAL(10, 2);
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_report_id := OLD.report_id;
  ELSE
    v_report_id := NEW.report_id;
  END IF;

  SELECT COALESCE(SUM(e.amount), 0)
  INTO v_new_total
  FROM report_expenses re
  JOIN expenses e ON e.id = re.expense_id
  WHERE re.report_id = v_report_id;

  UPDATE expense_reports
  SET total_amount = v_new_total,
      updated_at = NOW()
  WHERE id = v_report_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_report_total ON report_expenses;
CREATE TRIGGER trigger_update_report_total
  AFTER INSERT OR DELETE ON report_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_report_total();

-- 4. Trigger: Recalculate total when expense amount changes
CREATE OR REPLACE FUNCTION update_report_total_on_expense_change()
RETURNS TRIGGER AS $$
DECLARE
  v_report_record RECORD;
BEGIN
  FOR v_report_record IN
    SELECT DISTINCT report_id
    FROM report_expenses
    WHERE expense_id = NEW.id
  LOOP
    UPDATE expense_reports
    SET total_amount = (
      SELECT COALESCE(SUM(e.amount), 0)
      FROM report_expenses re
      JOIN expenses e ON e.id = re.expense_id
      WHERE re.report_id = v_report_record.report_id
    ),
    updated_at = NOW()
    WHERE id = v_report_record.report_id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_report_total_on_expense_change ON expenses;
CREATE TRIGGER trigger_update_report_total_on_expense_change
  AFTER UPDATE OF amount ON expenses
  FOR EACH ROW
  WHEN (OLD.amount IS DISTINCT FROM NEW.amount)
  EXECUTE FUNCTION update_report_total_on_expense_change();

-- 5. Row Level Security (RLS) Policies
ALTER TABLE expense_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view reports in their organization" ON expense_reports;
CREATE POLICY "Users can view reports in their organization"
  ON expense_reports FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create reports in their organization" ON expense_reports;
CREATE POLICY "Users can create reports in their organization"
  ON expense_reports FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update their own draft reports" ON expense_reports;
CREATE POLICY "Users can update their own draft reports"
  ON expense_reports FOR UPDATE
  USING (
    user_id = auth.uid()
    AND status = 'draft'
  )
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'draft'
  );

DROP POLICY IF EXISTS "Users can delete their own draft reports" ON expense_reports;
CREATE POLICY "Users can delete their own draft reports"
  ON expense_reports FOR DELETE
  USING (
    user_id = auth.uid()
    AND status = 'draft'
  );

DROP POLICY IF EXISTS "Managers can approve/reject reports" ON expense_reports;
CREATE POLICY "Managers can approve/reject reports"
  ON expense_reports FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'finance', 'admin')
    )
    AND status IN ('submitted', 'approved', 'rejected')
  );

DROP POLICY IF EXISTS "Finance can mark reports as paid" ON expense_reports;
CREATE POLICY "Finance can mark reports as paid"
  ON expense_reports FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('finance', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view report expenses in their organization" ON report_expenses;
CREATE POLICY "Users can view report expenses in their organization"
  ON report_expenses FOR SELECT
  USING (
    report_id IN (
      SELECT id FROM expense_reports
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can add expenses to their own draft reports" ON report_expenses;
CREATE POLICY "Users can add expenses to their own draft reports"
  ON report_expenses FOR INSERT
  WITH CHECK (
    report_id IN (
      SELECT id FROM expense_reports
      WHERE user_id = auth.uid() AND status = 'draft'
    )
  );

DROP POLICY IF EXISTS "Users can remove expenses from their own draft reports" ON report_expenses;
CREATE POLICY "Users can remove expenses from their own draft reports"
  ON report_expenses FOR DELETE
  USING (
    report_id IN (
      SELECT id FROM expense_reports
      WHERE user_id = auth.uid() AND status = 'draft'
    )
  );

DROP POLICY IF EXISTS "Users can reorder expenses in their own draft reports" ON report_expenses;
CREATE POLICY "Users can reorder expenses in their own draft reports"
  ON report_expenses FOR UPDATE
  USING (
    report_id IN (
      SELECT id FROM expense_reports
      WHERE user_id = auth.uid() AND status = 'draft'
    )
  );

-- 6. Helper Functions
CREATE OR REPLACE FUNCTION get_report_stats(p_report_id UUID)
RETURNS TABLE (
  expense_count BIGINT,
  total_amount DECIMAL(10, 2),
  categories JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT re.expense_id)::BIGINT,
    COALESCE(SUM(e.amount), 0)::DECIMAL(10, 2),
    jsonb_agg(DISTINCT e.category) AS categories
  FROM report_expenses re
  JOIN expenses e ON e.id = re.expense_id
  WHERE re.report_id = p_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION add_expense_to_report(
  p_report_id UUID,
  p_expense_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_next_order INTEGER;
  v_junction_id UUID;
BEGIN
  SELECT COALESCE(MAX(display_order), -1) + 1
  INTO v_next_order
  FROM report_expenses
  WHERE report_id = p_report_id;

  INSERT INTO report_expenses (report_id, expense_id, display_order, added_by)
  VALUES (p_report_id, p_expense_id, v_next_order, auth.uid())
  RETURNING id INTO v_junction_id;

  RETURN v_junction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Validation trigger
CREATE OR REPLACE FUNCTION validate_expense_for_report()
RETURNS TRIGGER AS $$
DECLARE
  v_expense_status VARCHAR(50);
  v_report_status VARCHAR(50);
BEGIN
  SELECT status INTO v_expense_status
  FROM expenses
  WHERE id = NEW.expense_id;

  SELECT status INTO v_report_status
  FROM expense_reports
  WHERE id = NEW.report_id;

  IF v_report_status = 'draft' AND v_expense_status != 'draft' THEN
    RAISE EXCEPTION 'Only draft expenses can be added to reports';
  END IF;

  IF v_report_status != 'draft' THEN
    RAISE EXCEPTION 'Cannot modify expenses in non-draft reports';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_expense_for_report_trigger ON report_expenses;
CREATE TRIGGER validate_expense_for_report_trigger
  BEFORE INSERT ON report_expenses
  FOR EACH ROW
  EXECUTE FUNCTION validate_expense_for_report();

COMMIT;

-- =====================================================
-- MIGRATION 2: Link expenses to reports
-- File: 20251119000001_expense_report_link.sql
-- =====================================================

BEGIN;

-- Add report linkage columns to expenses
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS report_id UUID REFERENCES expense_reports(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_reported BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_expenses_report_id ON expenses(report_id);
CREATE INDEX IF NOT EXISTS idx_expenses_is_reported ON expenses(is_reported);

-- Enforce single-report membership
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_report_expenses_expense_single_report'
  ) THEN
    ALTER TABLE report_expenses
      ADD CONSTRAINT uq_report_expenses_expense_single_report UNIQUE (expense_id);
  END IF;
END$$;

-- Sync report_id when rows are added/removed
CREATE OR REPLACE FUNCTION sync_expense_report_id()
RETURNS TRIGGER AS $$
DECLARE
  v_report UUID;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_report := NEW.report_id;
    UPDATE expenses
      SET report_id = v_report,
          is_reported = true
      WHERE id = NEW.expense_id;
  ELSIF (TG_OP = 'DELETE') THEN
    v_report := OLD.report_id;
    UPDATE expenses
      SET report_id = NULL,
          is_reported = false
      WHERE id = OLD.expense_id
        AND NOT EXISTS (
          SELECT 1 FROM report_expenses re WHERE re.expense_id = OLD.expense_id
        );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_expense_report_id ON report_expenses;
CREATE TRIGGER trg_sync_expense_report_id
  AFTER INSERT OR DELETE ON report_expenses
  FOR EACH ROW
  EXECUTE FUNCTION sync_expense_report_id();

COMMIT;

-- =====================================================
-- MIGRATION 3: Backfill expense report flags
-- File: 20251119001000_backfill_expense_report_flags.sql
-- =====================================================

BEGIN;

UPDATE expenses
SET is_reported = CASE
  WHEN EXISTS (SELECT 1 FROM report_expenses re WHERE re.expense_id = expenses.id) THEN true
  ELSE false
END,
report_id = (
  SELECT re.report_id FROM report_expenses re WHERE re.expense_id = expenses.id LIMIT 1
)
WHERE is_reported IS DISTINCT FROM (
  CASE
    WHEN EXISTS (SELECT 1 FROM report_expenses re WHERE re.expense_id = expenses.id) THEN true
    ELSE false
  END
);

COMMIT;

-- =====================================================
-- MIGRATION 4: Add auto-report metadata
-- File: 20251119004500_auto_report_metadata.sql
-- =====================================================

BEGIN;

ALTER TABLE expense_reports
  ADD COLUMN IF NOT EXISTS auto_created BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_report_period TEXT;

CREATE INDEX IF NOT EXISTS idx_expense_reports_auto_period
  ON expense_reports(user_id, auto_report_period)
  WHERE auto_created = true;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check expense_reports table exists
SELECT 'expense_reports table' AS check_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expense_reports')
       THEN 'EXISTS' ELSE 'MISSING' END AS status;

-- Check expenses columns
SELECT 'expenses.report_id' AS check_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'report_id')
       THEN 'EXISTS' ELSE 'MISSING' END AS status
UNION ALL
SELECT 'expenses.is_reported' AS check_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'is_reported')
       THEN 'EXISTS' ELSE 'MISSING' END AS status;

-- Check expense_reports columns
SELECT 'expense_reports.auto_created' AS check_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_reports' AND column_name = 'auto_created')
       THEN 'EXISTS' ELSE 'MISSING' END AS status
UNION ALL
SELECT 'expense_reports.auto_report_period' AS check_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_reports' AND column_name = 'auto_report_period')
       THEN 'EXISTS' ELSE 'MISSING' END AS status;

-- Check trigger
SELECT 'trg_sync_expense_report_id trigger' AS check_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trg_sync_expense_report_id')
       THEN 'EXISTS' ELSE 'MISSING' END AS status;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
