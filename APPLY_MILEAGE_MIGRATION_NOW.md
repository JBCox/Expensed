# Apply Mileage Migration - Quick Guide

**Issue:** Supabase CLI connectivity issues
**Solution:** Run migration SQL directly in Supabase Dashboard

---

## Steps to Apply (2 minutes)

### 1. Open Supabase Dashboard SQL Editor
Go to: https://supabase.com/dashboard → Select your Jensify project → Click "SQL Editor"

### 2. Copy the Migration SQL
The migration file is located at:
```
C:\Jensify\supabase\migrations\20251116184702_mileage_tracking_module.sql
```

### 3. Paste and Run
1. Open the file in your editor
2. Copy ALL the SQL (Ctrl+A, Ctrl+C)
3. Paste into Supabase SQL Editor
4. Click **RUN** (or press Ctrl+Enter)

### 4. Verify Success
You should see output like:
```
NOTICE:  ========================================
NOTICE:  Mileage Tracking Module - Migration Complete!
NOTICE:  ========================================
NOTICE:  Tables created:
NOTICE:    - irs_mileage_rates (with 2024 rates seeded)
NOTICE:    - mileage_trips
```

---

## What This Migration Creates

### Tables
1. **`irs_mileage_rates`** - IRS standard mileage rates
   - Seeded with 2024 rates ($0.67/mile for business)
   - Historical 2023 rates included

2. **`mileage_trips`** - Employee trip logs
   - Auto-calculates total_miles (with round trip support)
   - Auto-calculates reimbursement_amount
   - Workflow status tracking
   - Organization multi-tenancy support

### Features
- ✅ Round trip calculations (auto-doubles distance)
- ✅ IRS rate lookup by date and category
- ✅ Auto-calculated reimbursement amounts (database-level)
- ✅ Organization multi-tenancy with RLS
- ✅ Workflow tracking (draft → submitted → approved → reimbursed)

### Helper Functions
- `get_irs_rate(category, date)` - Returns applicable IRS rate
- `calculate_mileage_reimbursement(miles, round_trip, rate)` - Calculates reimbursement

---

## After Running

Once the migration succeeds:
1. ✅ Database is ready for mileage tracking
2. ✅ 2024 IRS rates are seeded
3. ✅ Angular app can now use MileageService

Test it by navigating to `/mileage` in your app and clicking "Add Trip"!

---

## Troubleshooting

**Error: "relation already exists"**
- The migration was already applied
- Safe to ignore - your database is already up to date

**Error: "permission denied"**
- Make sure you're logged into the correct Supabase project
- Verify you have admin access

**Other errors:**
- Copy the full error message
- Check for SQL syntax issues
- Try running in sections to isolate the problem

---

**That's it!** Once you run the SQL, the mileage tracking feature will be fully functional.
