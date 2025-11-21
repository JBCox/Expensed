-- ============================================================================
-- Jensify Database Schema - Mileage Tracking Module
-- Created: 2025-11-16
-- Description: Complete mileage tracking system with IRS rate calculations
-- ============================================================================

-- ============================================================================
-- TABLE: irs_mileage_rates
-- ============================================================================
-- Historical IRS standard mileage rates by category and effective date

CREATE TABLE IF NOT EXISTS irs_mileage_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rate Details
  category TEXT NOT NULL CHECK (category IN ('business', 'medical', 'charity', 'moving')),
  rate DECIMAL(5, 3) NOT NULL CHECK (rate > 0), -- e.g., 0.670 for $0.67/mile

  -- Effective Period
  effective_date DATE NOT NULL,
  end_date DATE, -- NULL means currently active

  -- Metadata
  notes TEXT, -- e.g., "IRS Notice 2024-08"
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_rate_period UNIQUE(category, effective_date)
);

COMMENT ON TABLE irs_mileage_rates IS 'Historical IRS standard mileage rates for different expense categories';
COMMENT ON COLUMN irs_mileage_rates.rate IS 'Rate per mile in dollars (e.g., 0.670 = $0.67/mile)';
COMMENT ON COLUMN irs_mileage_rates.end_date IS 'NULL if currently active, otherwise the last day this rate was valid';

-- ============================================================================
-- TABLE: mileage_trips
-- ============================================================================
-- Employee mileage trip logs for reimbursement

CREATE TABLE IF NOT EXISTS mileage_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership & Organization
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Trip Details
  trip_date DATE NOT NULL,
  origin_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,

  -- Location Data (optional - for future GPS/geocoding features)
  origin_lat DECIMAL(10, 8),
  origin_lng DECIMAL(11, 8),
  destination_lat DECIMAL(10, 8),
  destination_lng DECIMAL(11, 8),

  -- Distance & Calculation
  distance_miles DECIMAL(10, 2) NOT NULL CHECK (distance_miles > 0),
  is_round_trip BOOLEAN DEFAULT false,
  total_miles DECIMAL(10, 2) GENERATED ALWAYS AS (
    CASE WHEN is_round_trip THEN distance_miles * 2 ELSE distance_miles END
  ) STORED,

  -- Reimbursement
  irs_rate DECIMAL(5, 3) NOT NULL, -- Captured at time of trip creation
  reimbursement_amount DECIMAL(10, 2) GENERATED ALWAYS AS (
    (CASE WHEN is_round_trip THEN distance_miles * 2 ELSE distance_miles END) * irs_rate
  ) STORED,

  -- Trip Purpose & Classification
  purpose TEXT NOT NULL, -- "Client meeting", "Site visit", etc.
  category TEXT DEFAULT 'business' CHECK (category IN ('business', 'medical', 'charity', 'moving')),
  department TEXT,
  project_code TEXT,

  -- Integration with Expenses
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,

  -- Workflow Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'reimbursed')),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  reimbursed_at TIMESTAMPTZ,

  -- Notes
  notes TEXT,

  -- Audit Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Business Rules
  CONSTRAINT valid_trip_date CHECK (
    trip_date <= CURRENT_DATE AND
    trip_date >= CURRENT_DATE - INTERVAL '90 days'
  ),
  CONSTRAINT valid_addresses CHECK (origin_address != destination_address),
  CONSTRAINT valid_workflow_submitted CHECK (
    (status != 'submitted') OR (submitted_at IS NOT NULL)
  ),
  CONSTRAINT valid_workflow_approved CHECK (
    (status != 'approved') OR (approved_at IS NOT NULL AND approved_by IS NOT NULL)
  ),
  CONSTRAINT valid_workflow_rejected CHECK (
    (status != 'rejected') OR (rejected_at IS NOT NULL AND rejected_by IS NOT NULL)
  )
);

COMMENT ON TABLE mileage_trips IS 'Employee mileage trip logs for reimbursement calculation';
COMMENT ON COLUMN mileage_trips.distance_miles IS 'One-way distance in miles';
COMMENT ON COLUMN mileage_trips.is_round_trip IS 'If true, total_miles = distance_miles * 2';
COMMENT ON COLUMN mileage_trips.total_miles IS 'Calculated: distance_miles * 2 if round trip, else distance_miles';
COMMENT ON COLUMN mileage_trips.irs_rate IS 'IRS rate at time of trip (captured for audit trail)';
COMMENT ON COLUMN mileage_trips.reimbursement_amount IS 'Calculated: total_miles * irs_rate';
COMMENT ON COLUMN mileage_trips.expense_id IS 'If attached to an expense, reference to expenses table';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- IRS Rates Indexes
CREATE INDEX IF NOT EXISTS idx_irs_rates_category_date
  ON irs_mileage_rates(category, effective_date DESC);

-- Mileage Trips Indexes
CREATE INDEX IF NOT EXISTS idx_mileage_trips_user_id
  ON mileage_trips(user_id);

CREATE INDEX IF NOT EXISTS idx_mileage_trips_organization_id
  ON mileage_trips(organization_id);

CREATE INDEX IF NOT EXISTS idx_mileage_trips_trip_date
  ON mileage_trips(trip_date DESC);

CREATE INDEX IF NOT EXISTS idx_mileage_trips_status
  ON mileage_trips(status);

CREATE INDEX IF NOT EXISTS idx_mileage_trips_expense_id
  ON mileage_trips(expense_id)
  WHERE expense_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mileage_trips_user_date
  ON mileage_trips(user_id, trip_date DESC);

CREATE INDEX IF NOT EXISTS idx_mileage_trips_org_status
  ON mileage_trips(organization_id, status);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp on mileage_trips
CREATE TRIGGER update_mileage_trips_updated_at
  BEFORE UPDATE ON mileage_trips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE irs_mileage_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage_trips ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- IRS_MILEAGE_RATES POLICIES
-- ============================================================================

-- Everyone (authenticated) can read IRS rates
CREATE POLICY "Anyone can view IRS rates"
  ON irs_mileage_rates FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage IRS rates
CREATE POLICY "Admins can manage IRS rates"
  ON irs_mileage_rates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
        AND organization_members.role = 'admin'
        AND organization_members.is_active = true
    )
  );

-- ============================================================================
-- MILEAGE_TRIPS POLICIES
-- ============================================================================

-- Users can view their own trips
CREATE POLICY "Users can view own trips"
  ON mileage_trips FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Managers, Finance, and Admins can view all trips in their organization
CREATE POLICY "Managers and Finance can view all trips in their org"
  ON mileage_trips FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = mileage_trips.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('admin', 'manager', 'finance')
        AND organization_members.is_active = true
    )
  );

-- Users can create trips in their organization
CREATE POLICY "Users can create own trips"
  ON mileage_trips FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Users can update their own draft trips
CREATE POLICY "Users can update own draft trips"
  ON mileage_trips FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND status = 'draft'
  );

-- Managers and Finance can update trips in their organization
CREATE POLICY "Managers can update trips in their org"
  ON mileage_trips FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = mileage_trips.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('admin', 'manager', 'finance')
        AND organization_members.is_active = true
    )
  );

-- Users can delete their own draft trips
CREATE POLICY "Users can delete own draft trips"
  ON mileage_trips FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND status = 'draft'
  );

-- ============================================================================
-- SEED DATA: 2024 IRS MILEAGE RATES
-- ============================================================================

-- Insert 2024 IRS standard mileage rates
-- Source: IRS Notice 2024-08 (January 2024)
INSERT INTO irs_mileage_rates (category, rate, effective_date, notes) VALUES
  ('business', 0.670, '2024-01-01', 'IRS Notice 2024-08 - Standard business mileage rate'),
  ('medical', 0.210, '2024-01-01', 'IRS Notice 2024-08 - Medical or moving purposes'),
  ('charity', 0.140, '2024-01-01', 'Statutory rate set by law'),
  ('moving', 0.210, '2024-01-01', 'IRS Notice 2024-08 - Moving purposes (military only for 2024)')
ON CONFLICT (category, effective_date) DO NOTHING;

-- Historical 2023 rates for reference
INSERT INTO irs_mileage_rates (category, rate, effective_date, end_date, notes) VALUES
  ('business', 0.655, '2023-01-01', '2023-12-31', 'IRS Notice 2023-03 - 2023 business rate'),
  ('medical', 0.220, '2023-01-01', '2023-12-31', 'IRS Notice 2023-03 - 2023 medical rate'),
  ('charity', 0.140, '2023-01-01', '2023-12-31', 'Statutory rate (unchanged)'),
  ('moving', 0.220, '2023-01-01', '2023-12-31', 'IRS Notice 2023-03 - 2023 moving rate')
ON CONFLICT (category, effective_date) DO NOTHING;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

/**
 * Get current IRS mileage rate for a given category and date
 * @param p_category Rate category (business, medical, charity, moving)
 * @param p_trip_date Date of the trip
 * @returns Current rate as decimal
 */
CREATE OR REPLACE FUNCTION get_irs_rate(
  p_category TEXT,
  p_trip_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(5, 3)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_rate DECIMAL(5, 3);
BEGIN
  -- Find the most recent rate effective on or before the trip date
  SELECT rate INTO v_rate
  FROM irs_mileage_rates
  WHERE category = p_category
    AND effective_date <= p_trip_date
    AND (end_date IS NULL OR end_date >= p_trip_date)
  ORDER BY effective_date DESC
  LIMIT 1;

  -- Return rate, or raise exception if not found
  IF v_rate IS NULL THEN
    RAISE EXCEPTION 'No IRS rate found for category % on date %', p_category, p_trip_date;
  END IF;

  RETURN v_rate;
END;
$$;

COMMENT ON FUNCTION get_irs_rate IS 'Returns the applicable IRS mileage rate for a category and date';

GRANT EXECUTE ON FUNCTION get_irs_rate TO authenticated;

/**
 * Calculate mileage reimbursement amount
 * @param p_distance_miles One-way distance in miles
 * @param p_is_round_trip Whether this is a round trip
 * @param p_irs_rate IRS rate per mile
 * @returns Reimbursement amount as decimal
 */
CREATE OR REPLACE FUNCTION calculate_mileage_reimbursement(
  p_distance_miles DECIMAL(10, 2),
  p_is_round_trip BOOLEAN,
  p_irs_rate DECIMAL(5, 3)
)
RETURNS DECIMAL(10, 2)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_total_miles DECIMAL(10, 2);
BEGIN
  -- Calculate total miles
  IF p_is_round_trip THEN
    v_total_miles := p_distance_miles * 2;
  ELSE
    v_total_miles := p_distance_miles;
  END IF;

  -- Calculate and return reimbursement
  RETURN ROUND(v_total_miles * p_irs_rate, 2);
END;
$$;

COMMENT ON FUNCTION calculate_mileage_reimbursement IS 'Calculates mileage reimbursement based on distance, round trip flag, and IRS rate';

GRANT EXECUTE ON FUNCTION calculate_mileage_reimbursement TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Mileage Tracking Module - Migration Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - irs_mileage_rates (with 2024 rates seeded)';
  RAISE NOTICE '  - mileage_trips';
  RAISE NOTICE '';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '   Round trip support';
  RAISE NOTICE '   Auto-calculated reimbursement';
  RAISE NOTICE '   IRS rate lookup by date';
  RAISE NOTICE '   Workflow status tracking';
  RAISE NOTICE '   Organization multi-tenancy';
  RAISE NOTICE '   RLS policies for security';
  RAISE NOTICE '';
  RAISE NOTICE 'Helper functions:';
  RAISE NOTICE '  - get_irs_rate(category, date)';
  RAISE NOTICE '  - calculate_mileage_reimbursement(miles, round_trip, rate)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Build MileageService in Angular';
  RAISE NOTICE '2. Create mileage UI components';
  RAISE NOTICE '3. Integrate with expense workflow';
  RAISE NOTICE '========================================';
END $$;
