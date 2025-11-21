# Supabase Migrations Quick Reference

**All migration files in correct order:**

---

## 1️⃣ Required Migrations (Must Run)

### **20251113_phase0_initial_schema.sql** ✅ REQUIRED
**Run:** First
**Creates:**
- `users` table (profiles)
- `expenses` table (expense records)
- `receipts` table (receipt storage metadata)
- RLS policies for all tables
- Triggers for updated_at timestamps
- Expense policy validation functions

**Size:** 364 lines
**Safe:** Yes (idempotent)

---

### **20251113_storage_policies.sql** ✅ REQUIRED
**Run:** Second
**Creates:**
- Storage bucket RLS policies for receipts
- Upload/download permissions
- File size validation

**Size:** 71 lines
**Safe:** Yes

---

### **20251113215904_handle_new_user_signup.sql** ✅ REQUIRED
**Run:** Third
**Creates:**
- `handle_new_user()` trigger function
- Automatic user profile creation on signup
- Prevents duplicate profiles

**Size:** 54 lines
**Safe:** Yes

---

## 2️⃣ Optional Migrations (Skip if not needed)

### **20251115_mileage_module.sql** ⚠️ OPTIONAL
**Run:** Fourth (if you want mileage tracking)
**Creates:**
- `mileage_trips` table
- Mileage calculation functions
- IRS rate tracking
- RLS policies for mileage

**Size:** 137 lines
**Safe:** Yes
**Skip if:** You don't need mileage tracking

---

## 3️⃣ Fix Migrations (Only if you have issues)

### **20251115_fix_rls_recursion.sql** ⚠️ IF NEEDED
**Run:** Only if you get RLS recursion errors
**Fixes:**
- RLS policy infinite loops
- User/expense policy conflicts

**Size:** 132 lines
**When:** Only if errors occur

---

### **20251115_fix_storage_rls_recursion.sql** ⚠️ IF NEEDED
**Run:** Only if storage RLS errors
**Fixes:**
- Storage bucket RLS recursion

**Size:** 115 lines
**When:** Only if errors occur

---

### **20251115_fix_mileage_rls_recursion.sql** ⚠️ IF NEEDED
**Run:** Only if mileage RLS errors
**Fixes:**
- Mileage RLS policy loops

**Size:** 74 lines
**When:** Only if you have mileage AND errors

---

## 4️⃣ Organization System (NEW! Required for multi-tenancy)

### **20251115_organization_multi_tenancy.sql** ⭐ NEW! REQUIRED
**Run:** After all above migrations
**Creates:**
- `organizations` table (companies)
- `organization_members` table (user roles)
- `invitations` table (invite system)
- Adds `organization_id` to: expenses, receipts, users
- **Updates ALL RLS policies** for organization isolation
- Migrates existing data to "Default Organization"
- Invitation expiration system

**Size:** 700+ lines
**Safe:** Yes (migrates existing data)
**Breaking:** Yes (requires app updates)

**⚠️ IMPORTANT:**
- Run this AFTER existing users are created (or they'll be migrated)
- Preserves all existing data
- Adds organization context to everything

---

### **20251115_organization_helper_functions.sql** ⭐ NEW! REQUIRED
**Run:** AFTER organization_multi_tenancy.sql
**Creates:**
- `create_organization_with_admin()` - Creates org + admin user
- `get_organization_stats()` - Returns member/invitation counts
- `get_user_organization_context()` - Gets user's full org context

**Size:** 200+ lines
**Safe:** Yes
**Depends on:** organization_multi_tenancy.sql MUST run first

---

## 📊 Migration Dependency Tree

```
Phase 0 Initial Schema
    ↓
Storage Policies
    ↓
User Signup Trigger
    ↓
(Optional) Mileage Module
    ↓
(If needed) RLS Fixes
    ↓
⭐ Organization Multi-Tenancy ⭐
    ↓
⭐ Organization Helper Functions ⭐
```

---

## 🎯 Quick Apply Order

**For fresh database:**
```sql
-- 1. Base tables
20251113_phase0_initial_schema.sql

-- 2. Storage
20251113_storage_policies.sql

-- 3. User triggers
20251113215904_handle_new_user_signup.sql

-- 4. (Optional) Mileage
20251115_mileage_module.sql

-- 5. NEW! Organization system
20251115_organization_multi_tenancy.sql

-- 6. NEW! Helper functions
20251115_organization_helper_functions.sql
```

**For existing database:**
```sql
-- Check what's already applied:
-- Run CHECK_DATABASE_STATE.sql

-- Apply only missing migrations in order
-- Skip migrations that are already applied
```

---

## 🔍 How to Check What's Applied

**Run this in SQL Editor:**

```sql
-- Check for key tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'expenses', 'organizations', 'organization_members')
ORDER BY table_name;

-- Check for key functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('handle_new_user', 'create_organization_with_admin')
ORDER BY routine_name;
```

**Or run the full diagnostic:**
```sql
-- Copy/paste entire contents of:
CHECK_DATABASE_STATE.sql
```

---

## 📝 File Locations

All migrations located in:
```
c:\Jensify\supabase\migrations\
```

All files are `.sql` format - just copy/paste into Supabase SQL Editor

---

## ⚡ Quick Tips

1. **Always run in order** - Dependencies matter!
2. **Check before running** - Use CHECK_DATABASE_STATE.sql
3. **Safe to re-run** - Most migrations are idempotent (DROP IF EXISTS)
4. **Watch for errors** - SQL Editor shows errors at bottom
5. **Verify after** - Re-run CHECK_DATABASE_STATE.sql

---

## 🆘 Common Issues

**"Table already exists"**
- ✅ Good! Skip that migration

**"Column already exists"**
- ✅ Good! Skip that migration

**"Function does not exist" (in app)**
- ❌ Missing helper functions migration
- Run: `20251115_organization_helper_functions.sql`

**"organization_id cannot be null"**
- ❌ Missing organization multi-tenancy migration
- Run: `20251115_organization_multi_tenancy.sql`

---

*Use SUPABASE_DATABASE_UPDATE_GUIDE.md for detailed step-by-step instructions*
