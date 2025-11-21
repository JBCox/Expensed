# Migration Management Guidelines

## 🚫 What Went Wrong

We had **19 migrations** with:
- Multiple "fix" migrations patching the same RLS policies
- Duplicate table creations (2 mileage modules)
- Conflicting function definitions (`auth.user_role()` vs `public.user_role()`)
- Storage policy comments requiring owner permissions
- No clear ordering or dependency management

## ✅ Rules to Follow

### 1. **ONE Migration Per Feature**
❌ **Bad:**
```
20251115_mileage_module.sql
20251116_mileage_tracking_module.sql  // Duplicate!
```

✅ **Good:**
```
20251116000001_mileage_module.sql  // Single comprehensive migration
```

### 2. **Never Create "Fix" Migrations for Recent Changes**
❌ **Bad:**
```
20251116000001_add_rls_policies.sql
20251116000002_fix_rls_recursion.sql      // Should have been part of 000001
20251116000003_proper_rls_fix.sql         // Should have been part of 000001
20251116000004_secure_rls_fix.sql         // Should have been part of 000001
```

✅ **Good:**
```
20251116000001_add_rls_policies.sql  // Complete and tested before committing
```

**When to create a fix migration:**
- Only if the original migration has already been deployed to production
- And you need to modify it without breaking existing data

### 3. **Test Locally First**
**ALWAYS** test migrations locally before pushing to production:

```powershell
# Test the migration
cd C:\Jensify
supabase db reset  # This will run all migrations

# If it fails, fix the migration file directly
# Don't create a new "fix" migration!
```

### 4. **Use Proper Timestamps**
All migrations must have unique timestamps:

```
YYYYMMDDHHmmss_description.sql
20251117143022_add_feature.sql  ← GOOD (year, month, day, hour, minute, second)
20251117_add_feature.sql        ← BAD (no time, will conflict)
```

**Generate timestamp:**
```powershell
# Use this command
Get-Date -Format "yyyyMMddHHmmss"
# Output: 20251117143022
```

### 5. **Check for Conflicts Before Creating**
Before creating a new migration:

```powershell
# List existing migrations
cd C:\Jensify\supabase\migrations
Get-ChildItem *.sql | Select-Object Name

# Search for existing similar migrations
Select-String -Path *.sql -Pattern "CREATE TABLE mileage"
```

### 6. **Write Idempotent Migrations**
Always use `IF EXISTS` / `IF NOT EXISTS`:

❌ **Bad:**
```sql
DROP POLICY "Finance read trips" ON mileage_trips;
CREATE POLICY "Finance read trips"...
```

✅ **Good:**
```sql
DROP POLICY IF EXISTS "Finance read trips" ON mileage_trips;
CREATE POLICY "Finance read trips"...
```

### 7. **Don't Modify Schema You Don't Own**
❌ **Bad:**
```sql
CREATE FUNCTION auth.user_role()...  -- auth schema is owned by Supabase
COMMENT ON POLICY ... ON storage.objects...  -- storage.objects owned by Supabase
```

✅ **Good:**
```sql
CREATE FUNCTION public.user_role()...  -- Use public schema
-- Skip comments on storage.objects or use DO blocks
```

## 📋 Migration Checklist

Before creating a new migration:

- [ ] Generated unique timestamp: `Get-Date -Format "yyyyMMddHHmmss"`
- [ ] Checked for duplicate functionality: `Select-String -Path *.sql -Pattern "keyword"`
- [ ] Used `IF EXISTS` / `IF NOT EXISTS` for all objects
- [ ] Only touching `public` schema (not `auth` or `storage` internals)
- [ ] Tested locally: `supabase db reset` succeeded
- [ ] Reviewed the full migration file before committing
- [ ] Documented what the migration does in comments

## 🔧 Creating a New Migration

**Step 1: Generate the file**
```powershell
cd C:\Jensify\supabase\migrations
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$filename = "${timestamp}_your_feature_name.sql"
New-Item $filename -ItemType File
code $filename  # Opens in VS Code
```

**Step 2: Write the migration**
```sql
-- ============================================================================
-- Migration: Your Feature Name
-- Date: 2025-11-17
-- Description: What this migration does and why
-- ============================================================================

-- Always use IF EXISTS for drops
DROP TABLE IF EXISTS your_table;

-- Always use IF NOT EXISTS for creates
CREATE TABLE IF NOT EXISTS your_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Include rollback instructions
-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- DROP TABLE IF EXISTS your_table;
```

**Step 3: Test it**
```powershell
cd C:\Jensify
supabase db reset  # Runs all migrations including yours
```

**Step 4: If it fails**
- Fix the migration file directly
- DO NOT create a new "fix" migration
- Run `supabase db reset` again
- Repeat until it works

**Step 5: Commit only when working**
```powershell
git add supabase/migrations/${timestamp}_your_feature_name.sql
git commit -m "Add migration: your feature name"
```

## 🏥 Recovering from Migration Mess

If you end up with duplicate/conflicting migrations again:

```powershell
# 1. Backup current migrations
cd C:\Jensify\supabase\migrations
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
New-Item -ItemType Directory -Path "..\migrations_backup_$timestamp"
Copy-Item *.sql "..\migrations_backup_$timestamp\"

# 2. Stop local Supabase
cd C:\Jensify
supabase stop --no-backup

# 3. Delete redundant migrations (keep only essential ones)
cd migrations
Remove-Item *_fix_*.sql  # Remove all "fix" migrations
Remove-Item *_patch_*.sql  # Remove all "patch" migrations

# 4. Test fresh start
cd C:\Jensify
supabase start  # Should run all remaining migrations cleanly

# 5. If still failing, restore backup and debug
cd supabase\migrations
Copy-Item "..\migrations_backup_$timestamp\*.sql" .
```

## 📊 Current Clean Migration List

These 7 migrations are the **source of truth**:

1. `20251113000001_phase0_initial_schema.sql` - Base tables
2. `20251113000002_storage_policies.sql` - Storage bucket  
3. `20251113000003_handle_new_user_signup.sql` - User signup trigger
4. `20251115000001_organization_multi_tenancy.sql` - Organizations
5. `20251115000002_organization_helper_functions.sql` - Org helpers
6. `20251116184702_mileage_tracking_module.sql` - Mileage feature
7. `20251117000001_fix_rls_policies_consolidated.sql` - Final RLS

**Any new feature = ONE new migration after these.**

## 🎯 Summary

**Golden Rules:**
1. Test locally with `supabase db reset` before committing
2. One feature = one migration (no fixes/patches for recent changes)
3. Use proper timestamps (include time: `yyyyMMddHHmmss`)
4. Always use `IF EXISTS` / `IF NOT EXISTS`
5. Check for duplicates: `Select-String -Path *.sql -Pattern "keyword"`
6. Don't modify `auth` or `storage` internals

**When in doubt:** Test locally first!
