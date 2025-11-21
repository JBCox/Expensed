-- Backfill existing expenses for report-centric workflow
-- Date: 2025-11-19

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
