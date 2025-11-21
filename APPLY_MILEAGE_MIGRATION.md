# Apply Mileage Tracking Migration

**Issue:** Supabase CLI is experiencing connectivity issues
**Solution:** Apply migration manually via Supabase Dashboard

---

## Steps to Apply Migration

### 1. Open Supabase Dashboard
Go to: https://supabase.com/dashboard → Your Jensify Project

### 2. Open SQL Editor
Click "SQL Editor" in the left sidebar

### 3. Run the Migration
1. Open the file: `C:\Jensify\supabase\migrations\20251116184702_mileage_tracking_module.sql`
2. Copy ALL the SQL (Ctrl+A, Ctrl+C)
3. Paste into Supabase SQL Editor
4. Click **RUN** (or press Ctrl+Enter)

### 4. Verify Success
You should see:
```
Migration Complete!
Tables created:
  - irs_mileage_rates (with 2024 rates seeded)
  - mileage_trips
```

---

## What This Migration Creates

### Tables
1. **irs_mileage_rates** - IRS standard mileage rates
   - Seeded with 2024 rates ($0.67/mile for business)
   - Historical rates included

2. **mileage_trips** - Employee trip logs
   - Origin, destination, distance
   - Auto-calculated reimbursement
   - Workflow status (draft → submitted → approved → reimbursed)
   - Round trip support

### Features
- ✅ Round trip calculations (auto-doubles distance)
- ✅ IRS rate lookup by date and category
- ✅ Auto-calculated reimbursement amounts
- ✅ Organization multi-tenancy support
- ✅ RLS security policies
- ✅ Workflow tracking
- ✅ Helper functions for rate lookup

### Helper Functions
- `get_irs_rate(category, date)` - Returns applicable IRS rate
- `calculate_mileage_reimbursement(miles, round_trip, rate)` - Calculates reimbursement

---

## After Running

Once the migration is applied:
1. ✅ Database is ready for mileage tracking
2. ✅ 2024 IRS rates are seeded
3. ✅ Ready for MileageService implementation

---

## Troubleshooting

**Error: "relation already exists"**
- Tables already created - migration already ran
- Safe to ignore

**Error: "permission denied"**
- Make sure you're logged into the correct Supabase project
- Verify you have admin access

**Other errors:**
- Copy the full error message
- Check for syntax issues in the SQL

---

**Once done, the mileage tracking database is ready!** I'll continue building the Angular service.
