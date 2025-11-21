-- Link expenses to reports and enforce single-report membership
-- Date: 2025-11-19

BEGIN;

-- 1) Add report linkage columns to expenses
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS report_id UUID REFERENCES expense_reports(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_reported BOOLEAN NOT NULL DEFAULT false;

-- Indexes for report lookups
CREATE INDEX IF NOT EXISTS idx_expenses_report_id ON expenses(report_id);
CREATE INDEX IF NOT EXISTS idx_expenses_is_reported ON expenses(is_reported);

-- 2) Enforce "an expense can belong to at most one report" at the junction table
--    (previous design allowed multiple). This unique constraint blocks duplicates.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_report_expenses_expense_single_report'
  ) THEN
    ALTER TABLE report_expenses
      ADD CONSTRAINT uq_report_expenses_expense_single_report UNIQUE (expense_id);
  END IF;
END$$;

-- 3) Keep report_id in sync when rows are added/removed in report_expenses
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
    -- If the expense is no longer in any report, clear the link flag
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

-- Attach sync trigger
DROP TRIGGER IF EXISTS trg_sync_expense_report_id ON report_expenses;
CREATE TRIGGER trg_sync_expense_report_id
  AFTER INSERT OR DELETE ON report_expenses
  FOR EACH ROW
  EXECUTE FUNCTION sync_expense_report_id();

COMMIT;
