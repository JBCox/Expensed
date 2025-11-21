-- =====================================================
-- Expense Reports Feature Migration
-- =====================================================
-- This migration adds the ability to group multiple expenses
-- into reports (like Expensify) for batch submission and approval.
--
-- Features:
-- - Create reports with name, description, and date range
-- - Add multiple expenses to a report
-- - Submit entire report for approval at once
-- - Track report-level status and totals
-- - Organization-scoped with RLS policies
--
-- Tables:
-- - expense_reports: Container for expense reports
-- - report_expenses: Junction table linking expenses to reports
--
-- Author: Claude Code
-- Date: 2025-11-18
-- =====================================================

BEGIN;

-- =====================================================
-- 1. Create expense_reports table
-- =====================================================
CREATE TABLE IF NOT EXISTS expense_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Report metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Date range for expenses in this report
  start_date DATE,
  end_date DATE,

  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),

  -- Financial summary
  total_amount DECIMAL(10, 2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Workflow tracking
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES auth.users(id),

  -- Rejection reason
  rejection_reason TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CONSTRAINT positive_total CHECK (total_amount >= 0)
);

-- Add indexes
CREATE INDEX idx_expense_reports_organization ON expense_reports(organization_id);
CREATE INDEX idx_expense_reports_user ON expense_reports(user_id);
CREATE INDEX idx_expense_reports_status ON expense_reports(status);
CREATE INDEX idx_expense_reports_created ON expense_reports(created_at DESC);
CREATE INDEX idx_expense_reports_submitted ON expense_reports(submitted_at DESC) WHERE submitted_at IS NOT NULL;

-- Add updated_at trigger
CREATE TRIGGER update_expense_reports_updated_at
  BEFORE UPDATE ON expense_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE expense_reports IS 'Expense reports that group multiple expenses for batch submission';
COMMENT ON COLUMN expense_reports.name IS 'Report name (e.g., "Dallas Business Trip - Nov 2025")';
COMMENT ON COLUMN expense_reports.total_amount IS 'Automatically calculated sum of all expenses in report';

-- =====================================================
-- 2. Create report_expenses junction table
-- =====================================================
CREATE TABLE IF NOT EXISTS report_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES expense_reports(id) ON DELETE CASCADE,
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,

  -- Display order within report
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Audit fields
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id),

  -- Constraints
  UNIQUE(report_id, expense_id),
  UNIQUE(report_id, display_order)
);

-- Add indexes
CREATE INDEX idx_report_expenses_report ON report_expenses(report_id);
CREATE INDEX idx_report_expenses_expense ON report_expenses(expense_id);

COMMENT ON TABLE report_expenses IS 'Junction table linking expenses to reports';
COMMENT ON COLUMN report_expenses.display_order IS 'Order of expenses within the report';

-- =====================================================
-- 3. Trigger: Update report total_amount
-- =====================================================
CREATE OR REPLACE FUNCTION update_report_total()
RETURNS TRIGGER AS $$
DECLARE
  v_report_id UUID;
  v_new_total DECIMAL(10, 2);
BEGIN
  -- Get report_id from the operation
  IF TG_OP = 'DELETE' THEN
    v_report_id := OLD.report_id;
  ELSE
    v_report_id := NEW.report_id;
  END IF;

  -- Calculate new total from all expenses in the report
  SELECT COALESCE(SUM(e.amount), 0)
  INTO v_new_total
  FROM report_expenses re
  JOIN expenses e ON e.id = re.expense_id
  WHERE re.report_id = v_report_id;

  -- Update report total_amount
  UPDATE expense_reports
  SET total_amount = v_new_total,
      updated_at = NOW()
  WHERE id = v_report_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to report_expenses
CREATE TRIGGER trigger_update_report_total
  AFTER INSERT OR DELETE ON report_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_report_total();

COMMENT ON FUNCTION update_report_total() IS 'Automatically recalculates report total when expenses are added/removed';

-- =====================================================
-- 4. Trigger: Recalculate total when expense amount changes
-- =====================================================
CREATE OR REPLACE FUNCTION update_report_total_on_expense_change()
RETURNS TRIGGER AS $$
DECLARE
  v_report_record RECORD;
BEGIN
  -- Find all reports containing this expense and update their totals
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

-- Attach trigger to expenses
CREATE TRIGGER trigger_update_report_total_on_expense_change
  AFTER UPDATE OF amount ON expenses
  FOR EACH ROW
  WHEN (OLD.amount IS DISTINCT FROM NEW.amount)
  EXECUTE FUNCTION update_report_total_on_expense_change();

COMMENT ON FUNCTION update_report_total_on_expense_change() IS 'Updates report totals when expense amounts change';

-- =====================================================
-- 5. Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS
ALTER TABLE expense_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_expenses ENABLE ROW LEVEL SECURITY;

-- expense_reports policies
CREATE POLICY "Users can view reports in their organization"
  ON expense_reports FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create reports in their organization"
  ON expense_reports FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

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

CREATE POLICY "Users can delete their own draft reports"
  ON expense_reports FOR DELETE
  USING (
    user_id = auth.uid()
    AND status = 'draft'
  );

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

CREATE POLICY "Finance can mark reports as paid"
  ON expense_reports FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('finance', 'admin')
    )
  );

-- report_expenses policies
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

CREATE POLICY "Users can add expenses to their own draft reports"
  ON report_expenses FOR INSERT
  WITH CHECK (
    report_id IN (
      SELECT id FROM expense_reports
      WHERE user_id = auth.uid() AND status = 'draft'
    )
  );

CREATE POLICY "Users can remove expenses from their own draft reports"
  ON report_expenses FOR DELETE
  USING (
    report_id IN (
      SELECT id FROM expense_reports
      WHERE user_id = auth.uid() AND status = 'draft'
    )
  );

CREATE POLICY "Users can reorder expenses in their own draft reports"
  ON report_expenses FOR UPDATE
  USING (
    report_id IN (
      SELECT id FROM expense_reports
      WHERE user_id = auth.uid() AND status = 'draft'
    )
  );

-- =====================================================
-- 6. Helper Functions
-- =====================================================

-- Function to get report statistics
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

COMMENT ON FUNCTION get_report_stats(UUID) IS 'Get statistics for a specific report (expense count, total, categories)';

-- Function to add expense to report
CREATE OR REPLACE FUNCTION add_expense_to_report(
  p_report_id UUID,
  p_expense_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_next_order INTEGER;
  v_junction_id UUID;
BEGIN
  -- Get next display order
  SELECT COALESCE(MAX(display_order), -1) + 1
  INTO v_next_order
  FROM report_expenses
  WHERE report_id = p_report_id;

  -- Insert junction record
  INSERT INTO report_expenses (report_id, expense_id, display_order, added_by)
  VALUES (p_report_id, p_expense_id, v_next_order, auth.uid())
  RETURNING id INTO v_junction_id;

  RETURN v_junction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION add_expense_to_report(UUID, UUID) IS 'Add an expense to a report with automatic ordering';

-- =====================================================
-- 7. Validation: Prevent adding non-draft expenses to reports
-- =====================================================
CREATE OR REPLACE FUNCTION validate_expense_for_report()
RETURNS TRIGGER AS $$
DECLARE
  v_expense_status VARCHAR(50);
  v_report_status VARCHAR(50);
BEGIN
  -- Check expense status
  SELECT status INTO v_expense_status
  FROM expenses
  WHERE id = NEW.expense_id;

  -- Check report status
  SELECT status INTO v_report_status
  FROM expense_reports
  WHERE id = NEW.report_id;

  -- Only draft expenses can be added to draft reports
  IF v_report_status = 'draft' AND v_expense_status != 'draft' THEN
    RAISE EXCEPTION 'Only draft expenses can be added to reports';
  END IF;

  -- Cannot add expenses to submitted/approved/rejected/paid reports
  IF v_report_status != 'draft' THEN
    RAISE EXCEPTION 'Cannot modify expenses in non-draft reports';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_expense_for_report_trigger
  BEFORE INSERT ON report_expenses
  FOR EACH ROW
  EXECUTE FUNCTION validate_expense_for_report();

COMMENT ON FUNCTION validate_expense_for_report() IS 'Ensures only draft expenses can be added to draft reports';

-- =====================================================
-- 8. Add report_id to expenses table (optional foreign key)
-- =====================================================
-- This allows reverse lookup from expense to report
-- Note: An expense can be in multiple reports (different time periods)
-- so we don't add a direct foreign key, but we can add an index

-- Add index on report_expenses for reverse lookup
CREATE INDEX idx_report_expenses_expense_lookup ON report_expenses(expense_id, report_id);

COMMIT;

-- =====================================================
-- Migration Complete
-- =====================================================
-- Next steps:
-- 1. Create TypeScript models (ExpenseReport, ReportExpense)
-- 2. Create ReportService with CRUD operations
-- 3. Create UI components (report list, detail, create dialog)
-- 4. Update ExpenseList to support adding expenses to reports
-- 5. Update routing for /reports pages
-- =====================================================
