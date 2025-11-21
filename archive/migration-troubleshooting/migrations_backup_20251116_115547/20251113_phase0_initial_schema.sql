-- ============================================================================
-- Jensify Database Schema - Phase 0: Gas Receipt MVP
-- Created: 2025-11-13
-- Description: Initial schema for expense management system
-- ============================================================================

-- Enable UUID/crypto extensions for ID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- TABLES (Created in dependency order)
-- ============================================================================

-- Users table (synced with auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'finance', 'admin')),
  department TEXT,
  manager_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE users IS 'User profiles and roles';
COMMENT ON COLUMN users.role IS 'User role: employee, finance, or admin';
COMMENT ON COLUMN users.manager_id IS 'Reference to user''s manager (for approval workflows)';

-- Receipts table (created before expenses to avoid circular dependency)
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,

  -- File info
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image/jpeg', 'image/png', 'application/pdf')),
  file_size INTEGER NOT NULL CHECK (file_size <= 5242880),  -- 5MB limit

  -- OCR data
  ocr_status TEXT DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed')),
  ocr_data JSONB,
  ocr_confidence DECIMAL(3,2) CHECK (ocr_confidence >= 0 AND ocr_confidence <= 1),

  -- Extracted fields (verified by user)
  extracted_merchant TEXT,
  extracted_amount DECIMAL(10,2),
  extracted_date DATE,
  extracted_tax DECIMAL(10,2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE receipts IS 'Receipt images and OCR data';
COMMENT ON COLUMN receipts.ocr_data IS 'Raw OCR response data';
COMMENT ON COLUMN receipts.ocr_confidence IS 'OCR accuracy confidence score (0-1)';

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  receipt_id UUID REFERENCES receipts(id),

  -- Expense details
  merchant TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'USD',
  category TEXT NOT NULL DEFAULT 'Fuel',
  expense_date DATE NOT NULL,
  notes TEXT,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'reimbursed')),
  is_reimbursable BOOLEAN DEFAULT true,
  submitted_at TIMESTAMPTZ,
  reimbursed_at TIMESTAMPTZ,
  reimbursed_by UUID REFERENCES users(id),

  -- Policy
  policy_violations JSONB DEFAULT '[]'::jsonb,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_date CHECK (expense_date <= CURRENT_DATE),
  CONSTRAINT valid_phase0_amount CHECK (amount <= 500),  -- Phase 0 policy limit
  CONSTRAINT submitted_before_reimbursed CHECK (submitted_at <= reimbursed_at OR reimbursed_at IS NULL)
);

COMMENT ON TABLE expenses IS 'Employee expense records';
COMMENT ON COLUMN expenses.policy_violations IS 'Array of policy violations detected';
COMMENT ON COLUMN expenses.status IS 'Expense workflow status';

-- Add foreign key from receipts back to expenses (now that expenses exists)
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Expenses indexes for common queries
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_user_status ON expenses(user_id, status);

-- Receipts indexes
CREATE INDEX IF NOT EXISTS idx_receipts_expense_id ON receipts(expense_id);
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_ocr_status ON receipts(ocr_status);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates updated_at timestamp on row modification';

-- Function to validate policy rules
CREATE OR REPLACE FUNCTION check_expense_policies()
RETURNS TRIGGER AS $$
DECLARE
  violations JSONB := '[]'::jsonb;
  daily_total DECIMAL(10,2);
BEGIN
  -- Check max single receipt amount ($500)
  IF NEW.amount > 500 THEN
    violations := violations || jsonb_build_object(
      'rule', 'max_single_receipt',
      'limit', 500,
      'actual', NEW.amount,
      'message', 'Receipt amount exceeds $500 limit'
    );
  END IF;

  -- Check if date is too old (> 90 days)
  IF NEW.expense_date < CURRENT_DATE - INTERVAL '90 days' THEN
    violations := violations || jsonb_build_object(
      'rule', 'date_too_old',
      'limit', 90,
      'message', 'Expense date is older than 90 days'
    );
  END IF;

  -- Check daily total limit ($750)
  SELECT COALESCE(SUM(amount), 0) INTO daily_total
  FROM expenses
  WHERE user_id = NEW.user_id
    AND expense_date = NEW.expense_date
    AND id != NEW.id
    AND status != 'rejected';

  IF daily_total + NEW.amount > 750 THEN
    violations := violations || jsonb_build_object(
      'rule', 'max_daily_total',
      'limit', 750,
      'actual', daily_total + NEW.amount,
      'message', 'Daily expense total exceeds $750 limit'
    );
  END IF;

  -- Store violations
  NEW.policy_violations := violations;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_expense_policies() IS 'Validates expense against policy rules and records violations';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Drop triggers if they exist (for idempotency)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
DROP TRIGGER IF EXISTS check_expense_policies_trigger ON expenses;

-- Trigger to update updated_at on users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on expenses table
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to check policy violations
CREATE TRIGGER check_expense_policies_trigger
  BEFORE INSERT OR UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION check_expense_policies();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Finance can read all users" ON users;
DROP POLICY IF EXISTS "Employees can view own expenses" ON expenses;
DROP POLICY IF EXISTS "Finance can view all expenses" ON expenses;
DROP POLICY IF EXISTS "Employees can create own expenses" ON expenses;
DROP POLICY IF EXISTS "Employees can update own draft expenses" ON expenses;
DROP POLICY IF EXISTS "Finance can update expenses" ON expenses;
DROP POLICY IF EXISTS "Employees can delete own draft expenses" ON expenses;
DROP POLICY IF EXISTS "Users can view own receipts" ON receipts;
DROP POLICY IF EXISTS "Finance can view all receipts" ON receipts;
DROP POLICY IF EXISTS "Users can create own receipts" ON receipts;
DROP POLICY IF EXISTS "Users can update own receipts" ON receipts;
DROP POLICY IF EXISTS "Users can delete own receipts" ON receipts;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM users WHERE id = auth.uid()));

CREATE POLICY "Finance can read all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('finance', 'admin')
    )
  );

-- ============================================================================
-- EXPENSES TABLE POLICIES
-- ============================================================================

CREATE POLICY "Employees can view own expenses"
  ON expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Finance can view all expenses"
  ON expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('finance', 'admin')
    )
  );

CREATE POLICY "Employees can create own expenses"
  ON expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Employees can update own draft expenses"
  ON expenses FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status = 'draft'
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'draft'
  );

CREATE POLICY "Finance can update expenses"
  ON expenses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('finance', 'admin')
    )
  );

CREATE POLICY "Employees can delete own draft expenses"
  ON expenses FOR DELETE
  USING (
    auth.uid() = user_id
    AND status = 'draft'
  );

-- ============================================================================
-- RECEIPTS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view own receipts"
  ON receipts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Finance can view all receipts"
  ON receipts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('finance', 'admin')
    )
  );

CREATE POLICY "Users can create own receipts"
  ON receipts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own receipts"
  ON receipts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own receipts"
  ON receipts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Phase 0 Migration Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables created: users, expenses, receipts';
  RAISE NOTICE 'RLS policies: Enabled and configured';
  RAISE NOTICE 'Indexes: Created for optimal performance';
  RAISE NOTICE 'Functions: Policy validation ready';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create storage bucket "receipts" in Supabase Dashboard';
  RAISE NOTICE '2. Configure storage policies';
  RAISE NOTICE '3. Test user registration and expense creation';
  RAISE NOTICE '========================================';
END $$;
