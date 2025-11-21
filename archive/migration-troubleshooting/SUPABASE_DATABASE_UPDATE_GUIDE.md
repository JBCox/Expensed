# Supabase Database Update Guide

**Last Updated:** November 15, 2025
**For:** Hosted Supabase (supabase.com)

---

## 📋 Step-by-Step Update Process

### **Step 1: Check Current Database State**

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your **Jensify project**
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy and paste the contents of: `supabase/CHECK_DATABASE_STATE.sql`
6. Click **Run** (or press `Ctrl+Enter`)

**What to look for:**
- ✅ Green checkmarks = Migration applied
- ❌ Red X marks = Migration missing
- The **RECOMMENDATIONS** section will tell you what to do

---

### **Step 2: Apply Missing Migrations (If Any)**

Based on the check results, apply migrations **in order**:

#### **Migration 1: Phase 0 Initial Schema** (Required)
**File:** `20251113_phase0_initial_schema.sql`

If missing:
1. Open: `supabase/migrations/20251113_phase0_initial_schema.sql`
2. Copy **entire contents**
3. Paste into SQL Editor
4. Run

Creates: `users`, `expenses`, `receipts` tables + RLS policies

---

#### **Migration 2: Storage Policies** (Required)
**File:** `20251113_storage_policies.sql`

If missing:
1. Open: `supabase/migrations/20251113_storage_policies.sql`
2. Copy **entire contents**
3. Paste into SQL Editor
4. Run

Creates: Storage bucket policies for receipts

---

#### **Migration 3: User Signup Trigger** (Required)
**File:** `20251113215904_handle_new_user_signup.sql`

If missing:
1. Open: `supabase/migrations/20251113215904_handle_new_user_signup.sql`
2. Copy **entire contents**
3. Paste into SQL Editor
4. Run

Creates: Automatic user profile creation on signup

---

#### **Migration 4: Mileage Module** (Optional - Skip if not using)
**File:** `20251115_mileage_module.sql`

If you want mileage tracking:
1. Open: `supabase/migrations/20251115_mileage_module.sql`
2. Copy **entire contents**
3. Paste into SQL Editor
4. Run

Creates: `mileage_trips` table + functions

**Skip this if you're not using mileage tracking.**

---

#### **Migration 5: RLS Recursion Fixes** (If needed)
**Files:**
- `20251115_fix_rls_recursion.sql`
- `20251115_fix_storage_rls_recursion.sql`
- `20251115_fix_mileage_rls_recursion.sql` (only if you have mileage)

Only run if you had RLS recursion errors. Otherwise skip.

---

#### **Migration 6: Organization Multi-Tenancy** ⭐ **NEW!**
**File:** `20251115_organization_multi_tenancy.sql`

**⚠️ IMPORTANT:** This is the BIG one!

1. Open: `supabase/migrations/20251115_organization_multi_tenancy.sql`
2. Copy **entire contents**
3. Paste into SQL Editor
4. Run

**This creates:**
- `organizations` table
- `organization_members` table
- `invitations` table
- Adds `organization_id` to existing tables
- Updates all RLS policies
- Migrates existing data to "Default Organization"

**Safe to run on existing data!** Your current users/expenses will be preserved.

---

#### **Migration 7: Organization Helper Functions** ⭐ **NEW!**
**File:** `20251115_organization_helper_functions.sql`

**Must run AFTER Migration 6!**

1. Open: `supabase/migrations/20251115_organization_helper_functions.sql`
2. Copy **entire contents**
3. Paste into SQL Editor
4. Run

**This creates:**
- `create_organization_with_admin()`
- `get_organization_stats()`
- `get_user_organization_context()`

---

### **Step 3: Verify Everything Worked**

Run the check script again:

1. Go to **SQL Editor**
2. Run: `supabase/CHECK_DATABASE_STATE.sql`
3. Look for **all green checkmarks** ✅

**Expected result:**
```
✅ 20251113_phase0_initial_schema.sql
✅ 20251113_storage_policies.sql
✅ 20251113215904_handle_new_user_signup.sql
⚠️  20251115_mileage_module.sql (optional)
✅ 20251115_organization_multi_tenancy.sql (NEW!)
✅ 20251115_organization_helper_functions.sql (NEW!)
```

---

### **Step 4: Set Up Storage Bucket**

If you haven't already:

1. Navigate to **Storage** in Supabase Dashboard
2. Click **Create Bucket**
3. Name: `receipts`
4. Public: **No** (private bucket)
5. File size limit: **5 MB**
6. Allowed MIME types: `image/jpeg, image/png, application/pdf`

Then run storage policies migration (Migration 2) if not already done.

---

## 🧹 Optional: Clean Start

If you want to **completely reset** and start fresh:

### **⚠️ WARNING: This deletes ALL data!**

```sql
-- Run in SQL Editor to delete everything

-- 1. Delete all auth users
DELETE FROM auth.users;

-- 2. Clear all tables (if they exist)
TRUNCATE TABLE expenses CASCADE;
TRUNCATE TABLE receipts CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE mileage_trips CASCADE;  -- If exists

-- 3. Delete organization data (if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitations') THEN
    TRUNCATE TABLE invitations CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_members') THEN
    TRUNCATE TABLE organization_members CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    TRUNCATE TABLE organizations CASCADE;
  END IF;
END $$;

-- 4. Clear storage
-- Go to Storage → receipts bucket → Delete all files manually
```

Then re-apply all migrations in order.

---

## 📊 Migration Order (Full List)

**Run in this exact order:**

1. ✅ `20251113_phase0_initial_schema.sql` - Base tables
2. ✅ `20251113_storage_policies.sql` - Storage setup
3. ✅ `20251113215904_handle_new_user_signup.sql` - User triggers
4. ⚠️  `20251115_mileage_module.sql` - Mileage (optional)
5. ⚠️  `20251115_fix_rls_recursion.sql` - RLS fixes (if needed)
6. ⚠️  `20251115_fix_storage_rls_recursion.sql` - Storage RLS (if needed)
7. ⚠️  `20251115_fix_mileage_rls_recursion.sql` - Mileage RLS (if needed)
8. ⭐ `20251115_organization_multi_tenancy.sql` - **NEW! Organizations**
9. ⭐ `20251115_organization_helper_functions.sql` - **NEW! Helper functions**

---

## 🎯 What Happens After All Migrations

Once all migrations are applied:

**You'll have:**
- ✅ Multi-tenant organization system
- ✅ Users can create/join organizations
- ✅ Invitation system ready
- ✅ Role-based access (Employee, Manager, Finance, Admin)
- ✅ Complete data isolation between organizations
- ✅ All existing data preserved (in "Default Organization")

**First-time user flow:**
1. User signs up → Redirected to `/organization/setup`
2. Creates organization or accepts invitation
3. Becomes part of organization → Can use the app

---

## 🐛 Troubleshooting

### "Table already exists" error

**Cause:** Migration already applied

**Solution:** Skip that migration, it's already done!

---

### "Column organization_id does not exist"

**Cause:** Migration 6 not applied

**Solution:** Run `20251115_organization_multi_tenancy.sql`

---

### "Function does not exist"

**Cause:** Migration 7 not applied or failed

**Solution:** Run `20251115_organization_helper_functions.sql`

---

### "RLS policy violation"

**Cause:** RLS policies not updated

**Solution:**
1. Re-run `20251115_organization_multi_tenancy.sql`
2. It will DROP and recreate all RLS policies

---

### Storage bucket missing

**Solution:**
1. Create bucket manually (see Step 4)
2. Run `20251113_storage_policies.sql`

---

## ✅ Final Checklist

After all migrations:

- [ ] Run `CHECK_DATABASE_STATE.sql` - All green checkmarks
- [ ] Tables exist: users, expenses, receipts, organizations, organization_members, invitations
- [ ] Storage bucket "receipts" exists
- [ ] Functions exist: create_organization_with_admin, get_organization_stats, etc.
- [ ] Test signup flow - User redirected to /organization/setup
- [ ] Test creating organization
- [ ] Test inviting a user (check console for link)

---

## 🚀 Ready to Go!

Once all migrations are applied:
1. Start your Angular app: `npm start`
2. Navigate to: `http://localhost:4200`
3. Sign up as a new user
4. You'll see the **Organization Setup Wizard**!
5. Create your first organization
6. Invite team members from `/organization/users`

---

**Questions?** Check:
- `ORGANIZATION_MULTI_TENANCY_IMPLEMENTATION.md` - Full implementation guide
- `CLAUDE.md` - Coding standards and features
- Supabase logs in Dashboard → Logs

---

*This guide is for hosted Supabase only (supabase.com)*
*Not applicable to local Supabase/Docker setup*
