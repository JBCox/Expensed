-- Auto-created report metadata for monthly automation
-- Date: 2025-11-19

BEGIN;

ALTER TABLE expense_reports
  ADD COLUMN IF NOT EXISTS auto_created BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_report_period TEXT;

CREATE INDEX IF NOT EXISTS idx_expense_reports_auto_period
  ON expense_reports(user_id, auto_report_period)
  WHERE auto_created = true;

COMMIT;
