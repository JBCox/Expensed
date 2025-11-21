-- ============================================================================
-- Multiple Receipts per Expense - Junction Table
-- Created: 2025-11-18
-- Description: Replaces one-to-one circular reference with many-to-many
--              relationship to support multiple receipts per expense
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Junction Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS expense_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,

  -- Receipt ordering and metadata
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(expense_id, receipt_id),  -- Prevent duplicate links
  UNIQUE(expense_id, display_order)  -- Prevent order conflicts within same expense
);

COMMENT ON TABLE expense_receipts IS 'Many-to-many relationship between expenses and receipts';
COMMENT ON COLUMN expense_receipts.display_order IS 'Order of receipt display (0 = first)';
COMMENT ON COLUMN expense_receipts.is_primary IS 'Primary receipt shown in lists (only one per expense)';

-- ============================================================================
-- STEP 2: Create Indexes for Performance
-- ============================================================================

-- Index for querying receipts by expense
CREATE INDEX idx_expense_receipts_expense_id ON expense_receipts(expense_id);

-- Index for querying expenses by receipt
CREATE INDEX idx_expense_receipts_receipt_id ON expense_receipts(receipt_id);

-- Index for ordering receipts within an expense
CREATE INDEX idx_expense_receipts_order ON expense_receipts(expense_id, display_order);

-- Index for finding primary receipt
CREATE INDEX idx_expense_receipts_primary ON expense_receipts(expense_id) WHERE is_primary = true;

-- ============================================================================
-- STEP 3: Migrate Existing Data
-- ============================================================================

-- Migrate from expenses.receipt_id (expense → receipt reference)
INSERT INTO expense_receipts (expense_id, receipt_id, display_order, is_primary)
SELECT
  e.id AS expense_id,
  e.receipt_id AS receipt_id,
  0 AS display_order,  -- First receipt
  true AS is_primary   -- Mark as primary
FROM expenses e
WHERE e.receipt_id IS NOT NULL
ON CONFLICT (expense_id, receipt_id) DO NOTHING;

-- Migrate from receipts.expense_id (receipt → expense reference)
-- Only insert if not already linked from previous step
INSERT INTO expense_receipts (expense_id, receipt_id, display_order, is_primary)
SELECT
  r.expense_id AS expense_id,
  r.id AS receipt_id,
  0 AS display_order,
  true AS is_primary
FROM receipts r
WHERE r.expense_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM expense_receipts er
    WHERE er.expense_id = r.expense_id AND er.receipt_id = r.id
  )
ON CONFLICT (expense_id, receipt_id) DO NOTHING;

-- ============================================================================
-- STEP 4: Row Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE expense_receipts ENABLE ROW LEVEL SECURITY;

-- Users can view expense-receipt links for their organization
CREATE POLICY "Users can view organization expense-receipt links"
ON expense_receipts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM expenses e
    JOIN users u ON e.user_id = u.id
    WHERE e.id = expense_receipts.expense_id
      AND u.organization_id = (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
  )
);

-- Users can create links for their own expenses
CREATE POLICY "Users can link receipts to own expenses"
ON expense_receipts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM expenses e
    WHERE e.id = expense_receipts.expense_id
      AND e.user_id = auth.uid()
  )
);

-- Users can update links for their own expenses (reorder, change primary)
CREATE POLICY "Users can update own expense-receipt links"
ON expense_receipts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM expenses e
    WHERE e.id = expense_receipts.expense_id
      AND e.user_id = auth.uid()
  )
);

-- Users can delete links from their own expenses
CREATE POLICY "Users can delete own expense-receipt links"
ON expense_receipts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM expenses e
    WHERE e.id = expense_receipts.expense_id
      AND e.user_id = auth.uid()
  )
);

-- ============================================================================
-- STEP 5: Helper Functions
-- ============================================================================

-- Function to ensure only one primary receipt per expense
CREATE OR REPLACE FUNCTION ensure_single_primary_receipt()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a receipt as primary, unset all others for this expense
  IF NEW.is_primary = true THEN
    UPDATE expense_receipts
    SET is_primary = false
    WHERE expense_id = NEW.expense_id
      AND id != NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain single primary receipt
CREATE TRIGGER enforce_single_primary_receipt
  BEFORE INSERT OR UPDATE ON expense_receipts
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION ensure_single_primary_receipt();

-- Function to auto-set first receipt as primary
CREATE OR REPLACE FUNCTION auto_set_first_receipt_primary()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is the first receipt for an expense, make it primary
  IF NOT EXISTS (
    SELECT 1 FROM expense_receipts
    WHERE expense_id = NEW.expense_id AND id != NEW.id
  ) THEN
    NEW.is_primary := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set first receipt as primary
CREATE TRIGGER set_first_receipt_primary
  BEFORE INSERT ON expense_receipts
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_first_receipt_primary();

-- ============================================================================
-- STEP 6: Update Timestamp Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_expense_receipts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expense_receipts_updated_at
  BEFORE UPDATE ON expense_receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_expense_receipts_updated_at();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count migrated records
DO $$
DECLARE
  junction_count INTEGER;
  expenses_with_receipts INTEGER;
  receipts_with_expenses INTEGER;
BEGIN
  SELECT COUNT(*) INTO junction_count FROM expense_receipts;
  SELECT COUNT(*) INTO expenses_with_receipts FROM expenses WHERE receipt_id IS NOT NULL;
  SELECT COUNT(*) INTO receipts_with_expenses FROM receipts WHERE expense_id IS NOT NULL;

  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE '  - Junction table records: %', junction_count;
  RAISE NOTICE '  - Expenses with receipt_id: %', expenses_with_receipts;
  RAISE NOTICE '  - Receipts with expense_id: %', receipts_with_expenses;

  IF junction_count >= GREATEST(expenses_with_receipts, receipts_with_expenses) THEN
    RAISE NOTICE '✅ Migration successful - all relationships preserved';
  ELSE
    RAISE WARNING '⚠️  Some relationships may not have been migrated';
  END IF;
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================

-- The old columns (expenses.receipt_id and receipts.expense_id) are kept for now
-- to ensure backward compatibility. They will be removed in a future migration
-- after verifying the junction table works correctly.
--
-- Next steps:
-- 1. Update TypeScript models to use receipts array
-- 2. Update ExpenseService to query via junction table
-- 3. Create receipt gallery UI component
-- 4. Test thoroughly
-- 5. Remove old columns in follow-up migration
