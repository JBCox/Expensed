# Security Fixes Applied - November 16, 2025

## Critical Security Issues Found by Codex

### 1. ✅ SQL Function Scope Error (Fixed)
**Issue:** Helper functions used invalid syntax `COALESCE(is_organization_member.user_id, auth.uid())` which doesn't exist in SQL scope.

**Impact:** Migration would fail to compile.

**Fix:** Changed to `COALESCE(check_user_id, auth.uid())` using the actual parameter name.

**Location:** `supabase/migrations/20251116_secure_rls_fix.sql`

---

### 2. ✅ JWT Metadata Security Vulnerability (Fixed)
**Issue:** Policies that check ONLY `app_metadata` allow removed admins to continue acting until their JWT expires (potentially hours/days).

**Attack Scenario:**
1. Admin is removed from organization
2. Their JWT still has `app_metadata.role = 'admin'`
3. They can continue creating/updating members and invitations until token expires
4. Data breach / unauthorized access

**Fix Applied - Hybrid Approach:**
- **Fast check:** Use `app_metadata` for organization context (avoids recursion)
- **Security check:** Verify current membership with `is_organization_admin_verified()` function
- **Auto-clear:** Trigger automatically clears `app_metadata` when membership is removed/deactivated

**Before (Insecure):**
```sql
CREATE POLICY "Admins can insert members"
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'  -- ❌ Trusts stale JWT
);
```

**After (Secure):**
```sql
CREATE POLICY "Admins can insert members"
WITH CHECK (
  organization_id = (auth.jwt() -> 'app_metadata' ->> 'current_organization_id')::uuid
  AND public.is_organization_admin_verified(organization_id)  -- ✅ Live DB check
);
```

**Trigger Added:**
```sql
CREATE TRIGGER clear_metadata_on_membership_change
AFTER UPDATE OF is_active OR DELETE ON organization_members
FOR EACH ROW
EXECUTE FUNCTION public.clear_user_app_metadata_on_membership_change();
```

**Location:** `supabase/migrations/20251116_secure_rls_fix.sql`

---

### 3. ✅ Hardcoded Credentials (Removed)
**Issue:** Supabase URL and anon key were committed in multiple scripts:
- `check-tables.js`
- `list-tables.mjs`
- `query-database.mjs`

**Impact:**
- Exposed anon key can be used for data exfiltration
- Anyone with the key can query RLS-protected tables
- Violates security best practices

**Fix:**
- **Deleted all scripts with hardcoded credentials**
- Scripts were development-only utilities, not needed in production

**Action Required:**
- ⚠️ **ROTATE THE ANON KEY** in Supabase Dashboard → Settings → API
- Never commit API keys again - use environment variables

**Location:** Files deleted from root directory

---

### 4. ✅ Unauthenticated Edge Function (Fixed)
**Issue:** `send-invitation-email` Edge Function accepted any POST request without authentication or authorization checks.

**Attack Scenario:**
1. Attacker sends POST request to Edge Function URL
2. No auth check - request is processed
3. Attacker can:
   - Send spam invitations
   - Harvest invitation data
   - DOS attack by blasting emails

**Fix Applied:**
```typescript
// 1. Verify JWT token from Authorization header
const authHeader = req.headers.get('authorization');
if (!authHeader) {
  return new Response({ error: 'Unauthorized' }, { status: 401 });
}

// 2. Verify user is authenticated
const { data: { user }, error } = await supabaseClient.auth.getUser(token);
if (error || !user) {
  return new Response({ error: 'Unauthorized' }, { status: 401 });
}

// 3. Verify user is admin/manager of the organization
const { data: membership } = await supabaseClient
  .from('organization_members')
  .select('role, is_active')
  .eq('organization_id', organization_id)
  .eq('user_id', user.id)
  .single();

if (!['admin', 'manager'].includes(membership.role)) {
  return new Response({ error: 'Forbidden' }, { status: 403 });
}
```

**Location:** `supabase/functions/send-invitation-email/index.ts`

---

## Migration Application

### Apply the Secure Fix:

1. **Open Supabase SQL Editor** (web UI)
2. **Copy contents** of `supabase/migrations/20251116_secure_rls_fix.sql`
3. **Run** the migration
4. **Verify** success messages:
   ```
   ✓ Fixed SQL scope errors
   ✓ Hybrid approach: app_metadata + live DB checks
   ✓ Auto-clear metadata on membership removal
   ✓ Removed admins immediately lose access
   ```

### Redeploy Edge Function:

```bash
cd c:\Jensify
supabase functions deploy send-invitation-email
```

### Rotate Anon Key:

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Click **"Reset"** next to the `anon` key
3. **Update** `environment.ts` and `environment.development.ts` with new key
4. **Never commit keys** to git again

---

## Security Best Practices Going Forward

### ✅ DO:
- Use environment variables for ALL credentials
- Verify authentication on ALL Edge Functions
- Use RLS policies that verify CURRENT membership, not cached data
- Auto-clear stale metadata when membership changes
- Use SECURITY DEFINER functions for permission checks
- Rotate keys immediately after exposure

### ❌ DON'T:
- Commit API keys to version control
- Trust JWT metadata alone for sensitive operations
- Allow unauthenticated access to Edge Functions
- Use `table.column` syntax in SQL function parameters
- Skip authorization checks ("just authentication")

---

## Impact Summary

| Issue | Severity | Status | Impact |
|-------|----------|--------|--------|
| SQL scope error | High | ✅ Fixed | Would break migration |
| JWT metadata vuln | **Critical** | ✅ Fixed | Removed admins could still act |
| Hardcoded credentials | **Critical** | ✅ Fixed | Data exfiltration risk |
| Unauth Edge Function | High | ✅ Fixed | Spam/DOS/data harvesting |

---

## Testing Checklist

After applying fixes:

- [ ] Apply secure RLS migration in Supabase SQL Editor
- [ ] Redeploy Edge Function with auth checks
- [ ] Rotate exposed anon key
- [ ] Test: Remove admin from org → verify they CANNOT create members
- [ ] Test: Send invitation as admin → verify email is sent
- [ ] Test: Send invitation as employee → verify 403 Forbidden
- [ ] Test: Send invitation without auth → verify 401 Unauthorized
- [ ] Log out and back in → verify app still works

---

## Questions?

If you encounter issues after applying these fixes:
1. Check Supabase SQL Editor output for errors
2. Check browser console for client-side errors
3. Check Supabase Logs → Edge Functions for Edge Function errors
4. Verify anon key was updated in environment files

**All fixes prioritize security over convenience. This is the RIGHT approach.**
