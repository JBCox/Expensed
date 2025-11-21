-- ============================================================================
-- Mileage Tracking Tables
-- ============================================================================

-- Create mileage_trips table
CREATE TABLE IF NOT EXISTS mileage_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expense_id UUID REFERENCES expenses(id),
  status TEXT NOT NULL DEFAULT 'recording' CHECK (status IN ('recording', 'coding', 'completed')),
  vehicle_type TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  total_distance_miles DECIMAL(8,2) DEFAULT 0 CHECK (total_distance_miles >= 0),
  reimbursement_rate DECIMAL(5,3) DEFAULT 0.67,
  reimbursement_amount DECIMAL(10,2) DEFAULT 0,
  segment_count INTEGER DEFAULT 0 CHECK (segment_count >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mileage_trips IS 'GPS mileage trips captured by employees';

-- Create mileage_segments table
CREATE TABLE IF NOT EXISTS mileage_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES mileage_trips(id) ON DELETE CASCADE,
  location_label TEXT NOT NULL,
  miles DECIMAL(8,2) NOT NULL CHECK (miles > 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mileage_segments IS 'Breakdown of mileage trip miles by location/practice';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mileage_trips_user_id ON mileage_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_mileage_trips_status ON mileage_trips(status);
CREATE INDEX IF NOT EXISTS idx_mileage_segments_trip_id ON mileage_segments(trip_id);

-- Trigger to maintain reimbursement_amount/segment_count
CREATE OR REPLACE FUNCTION update_trip_totals() RETURNS TRIGGER AS $$
DECLARE
  total_segments INTEGER;
  total_miles DECIMAL(8,2);
BEGIN
  SELECT COUNT(*), COALESCE(SUM(miles),0) INTO total_segments, total_miles
  FROM mileage_segments WHERE trip_id = NEW.trip_id;

  UPDATE mileage_trips
  SET
    segment_count = total_segments,
    total_distance_miles = total_miles,
    reimbursement_amount = ROUND(total_miles * reimbursement_rate, 2),
    updated_at = NOW()
  WHERE id = NEW.trip_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mileage_segments_update_totals ON mileage_segments;
CREATE TRIGGER mileage_segments_update_totals
AFTER INSERT OR UPDATE OR DELETE ON mileage_segments
FOR EACH ROW
EXECUTE FUNCTION update_trip_totals();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE mileage_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own trips" ON mileage_trips;
DROP POLICY IF EXISTS "Finance read trips" ON mileage_trips;
DROP POLICY IF EXISTS "Users manage own segments" ON mileage_segments;

CREATE POLICY "Users manage own trips"
  ON mileage_trips
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Finance read trips"
  ON mileage_trips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('finance', 'admin')
    )
  );

CREATE POLICY "Users manage own segments"
  ON mileage_segments
  USING (
    EXISTS (
      SELECT 1 FROM mileage_trips
      WHERE mileage_trips.id = trip_id
      AND mileage_trips.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mileage_trips
      WHERE mileage_trips.id = trip_id
      AND mileage_trips.user_id = auth.uid()
    )
  );
