# Mileage Tracking Feature Plan

To match the Expensify workflow described in “Jens Instructions,” Jensify needs built-in GPS/Mileage support. This plan breaks the feature into concrete deliverables.

## 1. Data Model

Create two new tables via Supabase migration:

- `mileage_trips`
  - `id` (UUID PK)
  - `user_id`
  - `status`: `recording | coding | submitted`
  - `vehicle_type` (optional)
  - `started_at`, `ended_at`
  - `total_distance_miles`
  - `reimbursement_rate`
  - `reimbursement_amount`
  - `segment_count`
  - `created_at`, `updated_at`

- `mileage_segments`
  - `id`
  - `trip_id`
  - `location_label` (e.g., “Practice A”)
  - `miles`
  - `notes`
  - `created_at`

Relationships:
- `mileage_segments.trip_id` references `mileage_trips.id`.
- Trips optionally link to an `expenses` row via `expense_id` (added later).

## 2. API/Services

- Extend `SupabaseService` helper queries.
- New `MileageService` with APIs:
  - `startTrip()`
  - `stopTrip(tripId, simulatedDistance)`
  - `getActiveTrip()`
  - `splitTripSegments(tripId, segments[])`
  - `attachTripToExpense(tripId, expenseId)`
  - `getMyTrips(filter)`

## 3. Front-end UX

### 3.1 Start Trip Flow (Mobile/Web)
- Entry point in sidebar (“Start Mileage Trip”).
- Screen shows `Start GPS` button; when active, show elapsed time + placeholder map (until native GPS exists).
- For now, simulate distance accumulation with a timer (JS geolocation stub is optional).

### 3.2 Stop Trip & Review
- When user taps `Stop`, show confirmation modal:
  - Display simulated miles + reimbursement estimate (IRS rate e.g., $0.67/mi).

### 3.3 “Code Trip” Screen
- After stopping:
  - Let user choose “Single Practice” (one location) or “Multiple Practices”.
  - UI for splitting total miles across location buckets.
  - Validate sum of segment miles equals trip total.
  - Capture required metadata (location dropdown, optional notes).

### 3.4 Generate Expense
- Once coding done:
  - Auto-create an “Mileage” expense (merchant “Mileage Reimbursement”).
  - Pre-fill amount = `total_distance * rate`.
  - Link the trip to the expense (`expense_id`).
  - Show SmartScan-like banner that this expense was auto-populated from a trip (no receipt needed).

### 3.5 Trip List
- New `Mileage` page listing:
  - Active trip (if any).
  - Past trips with status chips (Recording / Needs coding / Completed).
  - Buttons: Resume (if recording), Code (if needs coding), View expense (if completed).

## 4. Notifications & Alerts

- When trip stops -> push notification “Trip ready to code.”
- If trip remains uncoded for X hours, show alert.
- When coding finished -> “Mileage expense generated.”

## 5. Future Enhancements (Out of Scope Now)

- Actual GPS integration via HTML5 Geolocation or capacitor.
- Map previews with Polyline.
- Company policy controls (max daily miles, vehicle types).
