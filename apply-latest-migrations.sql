-- Combined migrations for production deployment
-- Date: 2025-11-19
-- These migrations add expense report linking, backfill flags, and auto-report metadata

-- =============================================================================
-- Migration 1: 20251119000001_expense_report_link.sql
-- Link expenses to reports and enforce single-report membership
-- =============================================================================

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

-- =============================================================================
-- Migration 2: 20251119001000_backfill_expense_report_flags.sql
-- Backfill existing expenses for report-centric workflow
-- =============================================================================

BEGIN;

-- Ensure all existing expenses are marked unreported unless already linked
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

-- =============================================================================
-- Migration 3: 20251119004500_auto_report_metadata.sql
-- Auto-created report metadata for monthly automation
-- =============================================================================

BEGIN;

ALTER TABLE expense_reports
  ADD COLUMN IF NOT EXISTS auto_created BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_report_period TEXT;

CREATE INDEX IF NOT EXISTS idx_expense_reports_auto_period
  ON expense_reports(user_id, auto_report_period)
  WHERE auto_created = true;

COMMIT;

-- =============================================================================
-- Verification Query
-- Run this after applying to verify the changes were applied successfully
-- =============================================================================

-- Check that the new columns exist
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'expenses'
  AND column_name IN ('report_id', 'is_reported')
ORDER BY ordinal_position;

SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'expense_reports'
  AND column_name IN ('auto_created', 'auto_report_period')
ORDER BY ordinal_position;

-- Check that the trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trg_sync_expense_report_id';

-- Check that the unique constraint exists
SELECT conname, contype
FROM pg_constraint
WHERE conname = 'uq_report_expenses_expense_single_report';
