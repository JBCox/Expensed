# Mileage Tracking Implementation Plan

**Feature:** Comprehensive mileage tracking and reimbursement system
**Target Users:** Traveling employees (Josh's shipping team)
**Timeline:** 2-3 weeks
**Priority:** High - Direct user need

---

## 🎯 Goals

### Primary Objectives
1. Allow employees to log trips (origin, destination, miles)
2. Automatically calculate reimbursement using IRS rates
3. Attach trips to expense reports
4. Provide trip history and analytics
5. Support both manual entry and (future) GPS tracking

### Success Metrics
- Employees can log a trip in < 30 seconds
- 100% accurate IRS rate calculations
- Easy trip-to-expense attachment
- Finance can export mileage reports

---

## 📊 Phase Breakdown

### **Phase 1A: Core Mileage (Week 1)** ⭐ Start Here
**Database + Backend**
- Mileage trips table
- IRS rate configuration
- Trip CRUD operations
- Basic validation rules

**UI Components**
- Mileage log page (list view)
- Add trip form (manual entry)
- Trip detail view
- Delete/edit trip

### **Phase 1B: Integration (Week 2)**
**Expense Integration**
- Attach trips to expenses
- Combined expense reports (receipts + mileage)
- Mileage expense creation flow
- Trip selection UI

**Finance Features**
- Mileage report export (CSV)
- Finance dashboard mileage metrics
- Approval workflow for mileage

### **Phase 1C: Enhancement (Week 3)** - Optional
**Advanced Features**
- Recurring trips (save frequent routes)
- Bulk trip import (CSV)
- Trip templates
- Multi-stop trips
- Address autocomplete (Google Places API)

### **Phase 2: GPS Tracking** (Future - Mobile App Required)
- Real-time GPS tracking
- Automatic trip detection
- Background location services
- Trip splitting by location

---

## 🗄️ Database Schema

### New Table: `mileage_trips`

```sql
CREATE TABLE mileage_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership & Organization
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Trip Details
  trip_date DATE NOT NULL,
  origin_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,

  -- Location Data (optional - for GPS/geocoding)
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
  irs_rate DECIMAL(5, 3) NOT NULL, -- e.g., 0.670 for $0.67/mile
  reimbursement_amount DECIMAL(10, 2) GENERATED ALWAYS AS (
    (CASE WHEN is_round_trip THEN distance_miles * 2 ELSE distance_miles END) * irs_rate
  ) STORED,

  -- Trip Purpose & Classification
  purpose TEXT NOT NULL, -- "Client meeting", "Site visit", etc.
  category TEXT DEFAULT 'business' CHECK (category IN ('business', 'medical', 'charity', 'moving')),
  department TEXT,
  project_code TEXT,

  -- Integration
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'reimbursed')),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_trip_date CHECK (trip_date <= CURRENT_DATE AND trip_date >= CURRENT_DATE - INTERVAL '90 days'),
  CONSTRAINT valid_addresses CHECK (origin_address != destination_address)
);

-- Indexes
CREATE INDEX idx_mileage_trips_user_id ON mileage_trips(user_id);
CREATE INDEX idx_mileage_trips_organization_id ON mileage_trips(organization_id);
CREATE INDEX idx_mileage_trips_trip_date ON mileage_trips(trip_date DESC);
CREATE INDEX idx_mileage_trips_status ON mileage_trips(status);
CREATE INDEX idx_mileage_trips_expense_id ON mileage_trips(expense_id) WHERE expense_id IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_mileage_trips_updated_at
  BEFORE UPDATE ON mileage_trips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Comments
COMMENT ON TABLE mileage_trips IS 'Employee mileage trip logs for reimbursement';
COMMENT ON COLUMN mileage_trips.irs_rate IS 'IRS standard mileage rate at time of trip (e.g., 0.670 for 2024)';
COMMENT ON COLUMN mileage_trips.total_miles IS 'Calculated: distance_miles * 2 if round trip, else distance_miles';
COMMENT ON COLUMN mileage_trips.reimbursement_amount IS 'Calculated: total_miles * irs_rate';
```

### New Table: `irs_mileage_rates`

```sql
CREATE TABLE irs_mileage_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rate Details
  category TEXT NOT NULL CHECK (category IN ('business', 'medical', 'charity', 'moving')),
  rate DECIMAL(5, 3) NOT NULL, -- e.g., 0.670

  -- Effective Period
  effective_date DATE NOT NULL,
  end_date DATE, -- NULL means currently active

  -- Metadata
  notes TEXT, -- e.g., "IRS Notice 2024-08"
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_rate_period UNIQUE(category, effective_date)
);

-- Index
CREATE INDEX idx_irs_rates_category_date ON irs_mileage_rates(category, effective_date DESC);

-- Comments
COMMENT ON TABLE irs_mileage_rates IS 'Historical IRS standard mileage rates';

-- Seed with 2024 rates
INSERT INTO irs_mileage_rates (category, rate, effective_date, notes) VALUES
  ('business', 0.670, '2024-01-01', 'IRS Notice 2024-08'),
  ('medical', 0.210, '2024-01-01', 'IRS Notice 2024-08'),
  ('charity', 0.140, '2024-01-01', 'Statutory rate'),
  ('moving', 0.210, '2024-01-01', 'IRS Notice 2024-08');
```

---

## 🔐 Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE mileage_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE irs_mileage_rates ENABLE ROW LEVEL SECURITY;

-- Mileage Trips Policies
CREATE POLICY "Users can view own trips"
  ON mileage_trips FOR SELECT
  USING (
    user_id = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Managers and Finance can view all trips in their org"
  ON mileage_trips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = mileage_trips.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('admin', 'manager', 'finance')
        AND organization_members.is_active = true
    )
  );

CREATE POLICY "Users can create own trips"
  ON mileage_trips FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update own draft trips"
  ON mileage_trips FOR UPDATE
  USING (user_id = auth.uid() AND status = 'draft');

CREATE POLICY "Managers can update trips in their org"
  ON mileage_trips FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = mileage_trips.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('admin', 'manager', 'finance')
        AND organization_members.is_active = true
    )
  );

CREATE POLICY "Users can delete own draft trips"
  ON mileage_trips FOR DELETE
  USING (user_id = auth.uid() AND status = 'draft');

-- IRS Rates - Everyone can read
CREATE POLICY "Anyone can view IRS rates"
  ON irs_mileage_rates FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify rates
CREATE POLICY "Admins can manage IRS rates"
  ON irs_mileage_rates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
        AND organization_members.role = 'admin'
        AND organization_members.is_active = true
    )
  );
```

---

## 🎨 UI Components

### 1. Mileage Log Page (`/mileage`)
**Location:** `expense-app/src/app/features/mileage/mileage-list/`

**Features:**
- Table/card view of all trips
- Filters: Date range, status, category
- Search by origin/destination
- Total miles & reimbursement summary
- Quick actions: Edit, Delete, Submit, Create Expense

**Design:**
```
┌─────────────────────────────────────────────────────┐
│  Mileage Tracking                    [+ New Trip]   │
├─────────────────────────────────────────────────────┤
│  Filters: [Date Range] [Status] [Category] [Search] │
├─────────────────────────────────────────────────────┤
│  Summary: 247.5 miles | $166.73 reimbursement       │
├─────────────────────────────────────────────────────┤
│                                                      │
│  📍 Nov 15, 2024 • Business                         │
│     Office → Client Site (123 Main St)              │
│     45.2 miles • $30.28 • Draft             [Edit]  │
│                                                      │
│  📍 Nov 14, 2024 • Business • Round Trip            │
│     Office → Warehouse (Fort Worth)                 │
│     28.5 miles × 2 = 57 miles • $38.19 • Approved  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 2. Add/Edit Trip Form
**Location:** `expense-app/src/app/features/mileage/trip-form/`

**Form Fields:**
- Trip Date (date picker)
- Origin Address (text input with autocomplete)
- Destination Address (text input with autocomplete)
- Distance (number input) - miles
- Round Trip? (checkbox)
- Purpose (text input - required)
- Category (dropdown: Business, Medical, Charity, Moving)
- Department (text input - optional)
- Notes (textarea - optional)

**Auto-calculated:**
- Total Miles (distance × 2 if round trip)
- IRS Rate (fetched from rates table based on date + category)
- Reimbursement Amount (total miles × rate)

**Design:**
```
┌─────────────────────────────────────────────────────┐
│  Add New Trip                              [Cancel] │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Trip Date: [Nov 16, 2024 ▼]                       │
│                                                      │
│  Origin:                                            │
│  [1234 Main St, Fort Worth, TX 76102]              │
│                                                      │
│  Destination:                                       │
│  [5678 Commerce Dr, Dallas, TX 75201]              │
│                                                      │
│  Distance: [35.2] miles                            │
│  ☑ Round Trip                                       │
│                                                      │
│  Purpose: [Client meeting at Dallas office]         │
│                                                      │
│  Category: [Business ▼]                            │
│                                                      │
│  Department: [Shipping] (optional)                  │
│                                                      │
│  Notes: [Optional]                                  │
│                                                      │
│  ─────────────────────────────────────────────────  │
│                                                      │
│  Total Miles: 70.4 miles (35.2 × 2)                │
│  IRS Rate: $0.67/mile (2024 business rate)         │
│  Reimbursement: $47.17                             │
│                                                      │
│                [Save as Draft]  [Submit for Approval]│
└─────────────────────────────────────────────────────┘
```

### 3. Trip Detail View
**Location:** `expense-app/src/app/features/mileage/trip-detail/`

**Shows:**
- Full trip information
- Map view (optional - Google Maps embed)
- Status history
- Attached expense (if any)
- Actions based on status

### 4. Dashboard Mileage Widget
**Add to Employee Dashboard:**
- This month's mileage summary
- Pending trips count
- Quick "Log Trip" button

---

## 💻 Angular Services

### MileageService
**Location:** `expense-app/src/app/core/services/mileage.service.ts`

```typescript
export interface MileageTrip {
  id: string;
  user_id: string;
  organization_id: string;
  trip_date: string;
  origin_address: string;
  destination_address: string;
  distance_miles: number;
  is_round_trip: boolean;
  total_miles: number;
  irs_rate: number;
  reimbursement_amount: number;
  purpose: string;
  category: 'business' | 'medical' | 'charity' | 'moving';
  department?: string;
  project_code?: string;
  expense_id?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface IRSRate {
  category: string;
  rate: number;
  effective_date: string;
}

@Injectable({ providedIn: 'root' })
export class MileageService {
  // CRUD operations
  getTrips(filters?: MileageFilters): Observable<MileageTrip[]>
  getTripById(id: string): Observable<MileageTrip>
  createTrip(trip: Partial<MileageTrip>): Observable<MileageTrip>
  updateTrip(id: string, trip: Partial<MileageTrip>): Observable<MileageTrip>
  deleteTrip(id: string): Observable<void>

  // Status updates
  submitTrip(id: string): Observable<MileageTrip>
  approveTrip(id: string): Observable<MileageTrip>
  rejectTrip(id: string, reason: string): Observable<MileageTrip>

  // Calculations
  getCurrentIRSRate(category: string, date: Date): Observable<number>
  calculateReimbursement(miles: number, rate: number, roundTrip: boolean): number

  // Analytics
  getTripStats(startDate: Date, endDate: Date): Observable<MileageStats>

  // Integration
  createExpenseFromTrip(tripId: string): Observable<Expense>
  attachTripToExpense(tripId: string, expenseId: string): Observable<void>
}
```

---

## 🔄 User Workflows

### Employee: Log a Trip
```
1. Click "Mileage" in sidebar
2. Click "+ New Trip"
3. Enter trip date
4. Enter origin address
5. Enter destination address
6. Enter distance (or use distance calculator)
7. Check "Round Trip" if applicable
8. Enter purpose
9. Select category (defaults to "Business")
10. Optional: Department, notes
11. Review calculated reimbursement
12. Click "Save as Draft" or "Submit for Approval"
```

### Employee: Submit Mileage for Reimbursement
```
Option A: Submit trip individually
  1. Go to trip detail
  2. Click "Submit for Approval"

Option B: Create expense from trip
  1. Go to trip detail
  2. Click "Create Expense"
  3. Trip becomes part of expense report
  4. Submit expense as normal
```

### Manager: Approve Mileage
```
1. Go to "Approvals" page
2. See mileage trips in queue
3. Review trip details (origin, destination, miles, purpose)
4. Verify distance is reasonable
5. Click "Approve" or "Reject"
```

### Finance: Process Mileage Reimbursements
```
1. Go to Finance Dashboard
2. Filter for "Approved" mileage trips
3. Review for reimbursement
4. Export to CSV for payment processing
5. Mark as "Reimbursed"
```

---

## 🧪 Testing Strategy

### Unit Tests
- MileageService CRUD operations
- IRS rate fetching
- Reimbursement calculations
- Round trip logic
- Validation rules

### Integration Tests
- Create trip → Submit → Approve → Reimburse flow
- Attach trip to expense
- Filter and search trips
- Export mileage reports

### E2E Tests
- Complete trip logging workflow
- Manager approval workflow
- Finance reimbursement workflow

---

## 📦 Implementation Checklist

### Week 1: Database + Core Backend

**Database Schema:**
- [ ] Create `mileage_trips` table migration
- [ ] Create `irs_mileage_rates` table migration
- [ ] Add RLS policies for both tables
- [ ] Seed IRS rates (2024 values)
- [ ] Add indexes for performance
- [ ] Test all policies in Supabase

**Backend Services:**
- [ ] Create MileageService
- [ ] Implement CRUD methods
- [ ] Add IRS rate fetching
- [ ] Add reimbursement calculation
- [ ] Write unit tests

### Week 2: UI Components

**Angular Components:**
- [ ] Create mileage feature module
- [ ] Implement trip list component
- [ ] Implement trip form component (add/edit)
- [ ] Implement trip detail component
- [ ] Add filters and search
- [ ] Add dashboard widget
- [ ] Style with Angular Material + Tailwind

**Integration:**
- [ ] Connect to ExpenseService
- [ ] Add "Create Expense from Trip" flow
- [ ] Update approval queue to show trips
- [ ] Update finance dashboard

### Week 3: Polish & Testing

**Enhancements:**
- [ ] Address autocomplete (Google Places API)
- [ ] Distance calculator (Google Distance Matrix API)
- [ ] Recurring trip templates
- [ ] Bulk CSV import
- [ ] Map view on trip detail

**Testing:**
- [ ] Write unit tests for all components
- [ ] Write E2E tests for key flows
- [ ] Test on mobile viewports
- [ ] Performance testing with 100+ trips

**Documentation:**
- [ ] Update user guides
- [ ] Update CLAUDE.md with mileage module
- [ ] Update PROJECT_STATUS.md

---

## 💡 Future Enhancements (Phase 2)

### GPS Auto-Tracking (Mobile App Required)
```typescript
- Background location tracking
- Automatic trip detection (start/stop)
- Trip route polyline
- Automatic distance calculation
- "Working hours" filtering
```

### Advanced Features
```
- Multi-stop trips (A → B → C → A)
- Split trips by client/project
- Tax category optimization
- Historical IRS rate lookup
- Odometer reading tracking
- Personal vs business trip splitting
```

### Integrations
```
- Google Maps integration
- QuickBooks mileage sync
- Waze for distance calculation
- Toll calculation
```

---

## 🎯 Success Metrics

**After Launch:**
- 90% of employees log trips within 24 hours
- < 30 seconds average trip entry time
- 95%+ accurate reimbursement calculations
- 50% reduction in finance team manual calculations
- Zero IRS rate errors

---

## 📚 Resources

**IRS Mileage Rates:**
- [IRS 2024 Standard Mileage Rates](https://www.irs.gov/tax-professionals/standard-mileage-rates)

**Google APIs:**
- [Google Places Autocomplete](https://developers.google.com/maps/documentation/javascript/place-autocomplete)
- [Google Distance Matrix API](https://developers.google.com/maps/documentation/distance-matrix)

**Design Inspiration:**
- Expensify mileage tracking
- MileIQ interface
- Everlance trip logging

---

**Ready to start implementation? Let me know and I'll begin with the database migration!**
