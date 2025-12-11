-- Rename supported_currencies table to currencies
-- The code references 'currencies' but the original migration created 'supported_currencies'

-- Rename the table
ALTER TABLE IF EXISTS supported_currencies RENAME TO currencies;

-- Update RLS policies with new table name (they'll be recreated)
DROP POLICY IF EXISTS "Supported currencies are viewable by all" ON currencies;
DROP POLICY IF EXISTS "Admins can manage supported currencies" ON currencies;

-- Create new policies with corrected names
CREATE POLICY "Allow anon to read currencies"
  ON currencies FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow authenticated users to read currencies"
  ON currencies FOR SELECT
  TO authenticated
  USING (true);

-- Grant access
GRANT SELECT ON currencies TO anon, authenticated, service_role;

-- Add display_order column if it doesn't exist
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Update display order for common currencies
UPDATE currencies SET display_order = 1 WHERE code = 'USD';
UPDATE currencies SET display_order = 2 WHERE code = 'EUR';
UPDATE currencies SET display_order = 3 WHERE code = 'GBP';
UPDATE currencies SET display_order = 4 WHERE code = 'CAD';
UPDATE currencies SET display_order = 5 WHERE code = 'AUD';
UPDATE currencies SET display_order = 6 WHERE code = 'JPY';

-- Update foreign key reference in organizations table
-- First, drop the existing constraint if it exists
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_base_currency_fkey;
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_base_currency_fkey1;

-- Add the constraint with the new table name
ALTER TABLE organizations
ADD CONSTRAINT organizations_base_currency_fkey
FOREIGN KEY (base_currency) REFERENCES currencies(code);

-- Update views that reference the old table name
DROP VIEW IF EXISTS expenses_with_currency;

CREATE VIEW expenses_with_currency AS
SELECT
  e.*,
  sc_orig.name AS original_currency_name,
  sc_orig.symbol AS original_currency_symbol,
  sc_base.code AS base_currency,
  sc_base.symbol AS base_currency_symbol,
  CASE
    WHEN e.original_currency != o.base_currency THEN true
    ELSE false
  END AS is_foreign_currency
FROM expenses e
JOIN organizations o ON e.organization_id = o.id
LEFT JOIN currencies sc_orig ON e.original_currency = sc_orig.code
LEFT JOIN currencies sc_base ON o.base_currency = sc_base.code;

-- Update the get_currency_summary function to use new table name
CREATE OR REPLACE FUNCTION get_currency_summary(p_organization_id UUID)
RETURNS TABLE (
  currency TEXT,
  currency_name TEXT,
  currency_symbol TEXT,
  expense_count BIGINT,
  total_original_amount NUMERIC,
  total_converted_amount NUMERIC
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.original_currency,
    sc.name,
    sc.symbol,
    COUNT(*) AS expense_count,
    SUM(e.original_amount) AS total_original_amount,
    SUM(e.amount) AS total_converted_amount
  FROM expenses e
  JOIN currencies sc ON e.original_currency = sc.code
  WHERE e.organization_id = p_organization_id
  GROUP BY e.original_currency, sc.name, sc.symbol
  ORDER BY expense_count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add table comment
COMMENT ON TABLE currencies IS 'Supported currencies with their symbols and formatting - updated';

-- Notify PostgREST to refresh schema cache
NOTIFY pgrst, 'reload schema';
