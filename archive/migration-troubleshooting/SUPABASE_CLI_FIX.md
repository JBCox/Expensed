# Supabase CLI Connection Issue - Diagnosis & Solutions

## Problem
The Supabase CLI hangs indefinitely when running commands like:
- `supabase link`
- `supabase db push`
- `supabase db pull`
- `supabase migration repair`

**Root Cause:** The CLI hangs at `HTTP POST: .../cli/login-role` during database role initialization.

## Diagnosis Results

```bash
$ supabase link --project-ref bfudcugrarerqvvyfpoz --debug
...
Using connection pooler: postgresql://postgres.bfudcugrarerqvvyfpoz@aws-1-us-east-1.pooler.supabase.com:5432/postgres
Initialising login role...
2025/11/15 16:45:05 HTTP POST: https://api.supabase.com/v1/projects/bfudcugrarerqvvyfpoz/cli/login-role
[HANGS FOREVER]
```

## Possible Causes

1. **Network/Firewall Issues**
   - Corporate firewall blocking database connections
   - VPN interfering with Supabase API
   - Windows Firewall blocking PostgreSQL ports

2. **API Timeout**
   - Supabase API endpoint experiencing issues
   - Database pooler connection timeout

3. **Project Configuration**
   - Network restrictions on your Supabase project
   - Database pooler configuration issues

## Solutions

### Solution 1: Use Supabase Studio SQL Editor (RECOMMENDED ✅)

**Status:** ✅ **WORKING** - You've already done this!

1. Go to: https://supabase.com/dashboard/project/bfudcugrarerqvvyfpoz/sql/new
2. Paste SQL migration file
3. Click "Run"

**Pros:**
- No CLI issues
- Direct database access
- Immediate execution
- Works every time

**Cons:**
- Manual copy/paste
- No migration history tracking via CLI

---

### Solution 2: Direct Database Connection (Alternative)

If you need programmatic access, use direct PostgreSQL connection:

```bash
# Install psql (if not installed)
scoop install postgresql

# Get your database password from Supabase Dashboard:
# Settings > Database > Connection string

# Connect directly
psql "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

# Or execute SQL file directly
psql "postgresql://..." -f supabase/migrations/20251115_organization_multi_tenancy.sql
```

---

### Solution 3: Check Network Restrictions

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/bfudcugrarerqvvyfpoz/settings/network
2. Check if "Network Restrictions" are enabled
3. If enabled, add your IP address to allowlist

---

### Solution 4: Try Different Network

- Disconnect from VPN (if using one)
- Try from different network (mobile hotspot)
- Check if corporate firewall is blocking connections

---

### Solution 5: Use Supabase Management API (Advanced)

For automated deployments, use the Supabase Management API directly:

```typescript
// Example: Execute SQL via API
const response = await fetch(
  'https://api.supabase.com/v1/projects/bfudcugrarerqvvyfpoz/database/query',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: 'SELECT * FROM organizations;'
    })
  }
);
```

---

## Recommended Workflow Going Forward

### For Development (Local Changes)

1. **Create migration file:**
   ```bash
   supabase migration new your_migration_name
   ```
   This doesn't require database connection!

2. **Edit the SQL file:**
   `supabase/migrations/YYYYMMDD_your_migration_name.sql`

3. **Apply to remote via Supabase Studio:**
   - Copy SQL content
   - Paste into SQL Editor
   - Run

4. **Track in git:**
   ```bash
   git add supabase/migrations/
   git commit -m "feat(db): add your_migration_name"
   ```

### For Production Deployments

**Option A: Manual (Safest)**
1. Review migration SQL in code review
2. Apply via Supabase Studio SQL Editor
3. Verify with test queries

**Option B: Automated (When CLI works)**
1. Fix CLI connection issue
2. Use `supabase db push` in CI/CD pipeline

---

## Verification Commands (These Work!)

```bash
# Check CLI version
supabase --version  # ✅ Works

# List projects
supabase projects list  # ✅ Works

# Create local migration file (no DB connection needed)
supabase migration new test_migration  # ✅ Works
```

## Migration Status

✅ **Organization multi-tenancy migrations applied successfully via Supabase Studio**

Files applied:
- `20251115_organization_multi_tenancy.sql`
- `20251115_organization_helper_functions.sql`

Tables created:
- `organizations`
- `organization_members`
- `invitations`

---

## Next Steps to Fix CLI

1. **Check Supabase Dashboard > Settings > Network**
   - Verify no IP restrictions
   - Check database pooler status

2. **Try from different network**
   - Disconnect VPN
   - Try mobile hotspot
   - Test from different location

3. **Contact Supabase Support**
   - Create ticket: https://supabase.com/dashboard/support/new
   - Reference: "CLI hangs at 'Initialising login role'"
   - Project ref: `bfudcugrarerqvvyfpoz`

4. **Use psql as interim solution**
   ```bash
   scoop install postgresql
   # Then use direct connection
   ```

---

## Summary

✅ **Your migrations are applied and working!**
⚠️ **CLI has connection issues - use Supabase Studio instead**
📝 **Keep creating migration files locally, apply via Studio**
🔍 **Investigate network/firewall as next step**

---

Last Updated: 2025-11-15
Project: Jensify (bfudcugrarerqvvyfpoz)
CLI Version: 2.58.5
