# Deployment Checklist: Organization Multi-Tenancy System
**Created:** November 15, 2025
**Status:** Ready for Deployment
**Target:** Hosted Supabase (supabase.com)

---

## 🎯 Overview

This checklist covers deploying the complete organization multi-tenancy system to your hosted Supabase instance. The system adds:

- ✅ Multi-tenant organization support
- ✅ 4-tier role system (Admin, Manager, Finance, Employee)
- ✅ Invitation system with email integration
- ✅ User management interface
- ✅ Complete data isolation between organizations

---

## 📋 Pre-Deployment Checklist

### Before You Begin

- [ ] **Backup your Supabase database**
  - Go to: Supabase Dashboard → Database → Backups
  - Click "Create Backup" or verify auto-backups are enabled

- [ ] **Review all migration files**
  - Location: `c:\Jensify\supabase\migrations\`
  - Confirm all 9 files are present (see DATABASE_MIGRATION_STATUS.md)

- [ ] **Understand what will change**
  - Read: `ORGANIZATION_MULTI_TENANCY_IMPLEMENTATION.md`
  - Review: Database schema changes
  - Note: Existing data will be migrated to "Default Organization"

---

## 🗄️ Part 1: Database Migrations

### Step 1.1: Check Current State

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

2. **Run Diagnostic Script**
   - Open file: `c:\Jensify\supabase\CHECK_DATABASE_STATE.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click **Run**

3. **Review Results**
   - Look for ✅ (applied) vs ❌ (missing)
   - Note which migrations are already applied
   - Note which migrations need to be applied

### Step 1.2: Apply Phase 1 (Core Schema)

**Only if diagnostic shows these are missing:**

```sql
-- Migration #1: Base schema
-- File: c:\Jensify\supabase\migrations\20251113_phase0_initial_schema.sql
-- Copy entire file contents, paste in SQL Editor, run
```

```sql
-- Migration #2: Storage policies
-- File: c:\Jensify\supabase\migrations\20251113_storage_policies.sql
-- Copy entire file contents, paste in SQL Editor, run
```

```sql
-- Migration #3: User signup trigger
-- File: c:\Jensify\supabase\migrations\20251113215904_handle_new_user_signup.sql
-- Copy entire file contents, paste in SQL Editor, run
```

**Verification:**
```sql
-- Should return 3 rows (users, expenses, receipts)
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'expenses', 'receipts');
```

- [ ] Phase 1 migrations applied
- [ ] Verification query returns 3 tables

### Step 1.3: Apply Phase 2 (Optional - Mileage)

**Only if you want mileage tracking:**

```sql
-- Migration #4: Mileage module
-- File: c:\Jensify\supabase\migrations\20251115_mileage_module.sql
-- Copy entire file contents, paste in SQL Editor, run
```

**Verification:**
```sql
-- Should return 1 row (mileage_trips)
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'mileage_trips';
```

- [ ] Mileage module applied (if desired)
- [ ] Verification query confirms table exists

### Step 1.4: Apply Phase 3 (RLS Fixes - Only If Needed)

**Only if you encounter RLS recursion errors in your logs:**

```sql
-- Migration #5: Fix RLS recursion
-- File: c:\Jensify\supabase\migrations\20251115_fix_rls_recursion.sql
-- Apply only if getting "infinite recursion detected" errors
```

```sql
-- Migration #6: Fix storage RLS recursion
-- File: c:\Jensify\supabase\migrations\20251115_fix_storage_rls_recursion.sql
-- Apply only if getting storage-related RLS errors
```

```sql
-- Migration #7: Fix mileage RLS recursion
-- File: c:\Jensify\supabase\migrations\20251115_fix_mileage_rls_recursion.sql
-- Apply only if you have mileage module AND getting RLS errors
```

- [ ] No RLS errors (skip this phase) OR
- [ ] RLS fixes applied to resolve errors

### Step 1.5: Apply Phase 4 (Organization System) ⭐ **REQUIRED**

**This is the new organization multi-tenancy system:**

```sql
-- Migration #8: Organization multi-tenancy schema
-- File: c:\Jensify\supabase\migrations\20251115_organization_multi_tenancy.sql
-- IMPORTANT: This is 575 lines - copy the ENTIRE file
-- Paste in SQL Editor, run
```

**Wait for completion (may take 10-15 seconds), then:**

```sql
-- Migration #9: Organization helper functions
-- File: c:\Jensify\supabase\migrations\20251115_organization_helper_functions.sql
-- IMPORTANT: Must run AFTER migration #8
-- Copy entire file contents, paste in SQL Editor, run
```

**Verification:**
```sql
-- Should return 6 rows (all tables including new organization tables)
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'users', 'expenses', 'receipts',
    'organizations', 'organization_members', 'invitations'
  )
ORDER BY table_name;

-- Should return 4 rows (all helper functions)
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'handle_new_user',
    'create_organization_with_admin',
    'get_organization_stats',
    'get_user_organization_context'
  )
ORDER BY routine_name;

-- Check data migration (should show existing users in Default Organization)
SELECT
  o.name as organization_name,
  COUNT(om.user_id) as total_members
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id
WHERE o.name = 'Default Organization'
GROUP BY o.name;
```

- [ ] Migration #8 applied successfully (organization schema)
- [ ] Migration #9 applied successfully (helper functions)
- [ ] Verification shows 6 tables exist
- [ ] Verification shows 4 functions exist
- [ ] Existing users migrated to "Default Organization"

---

## 🔌 Part 2: Edge Functions Deployment

### Step 2.1: Verify Edge Functions Locally

**Check files exist:**

```bash
# Should show index.ts in both directories
ls -la c:\Jensify\supabase\functions\send-invitation-email\
ls -la c:\Jensify\supabase\functions\process-receipt\
```

- [ ] `send-invitation-email/index.ts` exists (8,622 bytes)
- [ ] `process-receipt/index.ts` exists (8,026 bytes)

### Step 2.2: Deploy Edge Functions to Supabase

**Option 1: Using Supabase CLI (if installed)**

```bash
# Deploy invitation email function
npx supabase functions deploy send-invitation-email

# Deploy receipt processing function
npx supabase functions deploy process-receipt
```

**Option 2: Manual Deployment via Dashboard**

1. Go to: Supabase Dashboard → Edge Functions
2. Click **New Function**
3. Name: `send-invitation-email`
4. Copy contents of `c:\Jensify\supabase\functions\send-invitation-email\index.ts`
5. Paste into editor
6. Click **Deploy**
7. Repeat for `process-receipt`

- [ ] `send-invitation-email` Edge Function deployed
- [ ] `process-receipt` Edge Function deployed

### Step 2.3: Set Edge Function Secrets

**In Supabase Dashboard → Settings → Edge Functions → Secrets:**

Add the following secrets:

```bash
# Required for invitation emails
APP_URL=https://your-frontend-domain.com  # or http://localhost:4200 for dev

# Optional: Email service (for sending invitations)
EMAIL_SERVICE_API_KEY=re_xxxxxxxxxxxxxxxxxx  # Resend API key

# Supabase (auto-populated, verify they exist)
SUPABASE_URL=https://xxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**How to get Resend API key (if you want email invitations):**
1. Go to: https://resend.com
2. Sign up for free account (100 emails/day free tier)
3. Create API key
4. Add to Supabase secrets as `EMAIL_SERVICE_API_KEY`

**Note:** If you don't add `EMAIL_SERVICE_API_KEY`, the function will still work but will only log the invitation link to the console (development mode).

- [ ] `APP_URL` secret set
- [ ] `EMAIL_SERVICE_API_KEY` secret set (optional)
- [ ] Supabase secrets verified

---

## 🌐 Part 3: Environment Variables (Frontend)

### Step 3.1: Update Angular Environment Files

**File: `c:\Jensify\expense-app\src\environments\environment.ts`**

Verify these values match your Supabase project:

```typescript
export const environment = {
  production: true,
  supabase: {
    url: 'https://YOUR_PROJECT_ID.supabase.co',
    anonKey: 'YOUR_ANON_KEY_HERE'
  },
  googleVision: {
    apiKey: 'YOUR_GOOGLE_VISION_API_KEY'  // For OCR
  }
};
```

**File: `c:\Jensify\expense-app\src\environments\environment.development.ts`**

```typescript
export const environment = {
  production: false,
  supabase: {
    url: 'https://YOUR_PROJECT_ID.supabase.co',
    anonKey: 'YOUR_ANON_KEY_HERE'
  },
  googleVision: {
    apiKey: 'YOUR_GOOGLE_VISION_API_KEY'
  }
};
```

- [ ] Production environment configured
- [ ] Development environment configured
- [ ] Supabase URL and anon key are correct

### Step 3.2: Update Supabase Project Settings

**In Supabase Dashboard → Settings → API:**

1. **URL Configuration:**
   - Verify your project URL
   - Copy to environment files

2. **API Keys:**
   - Copy **anon/public key** (use in frontend)
   - NEVER use **service_role key** in frontend

3. **Authentication Settings:**
   - Go to: Authentication → Settings
   - Enable **Email** provider
   - Set **Site URL**: https://your-frontend-domain.com
   - Add **Redirect URLs**:
     - `https://your-frontend-domain.com/auth/callback`
     - `https://your-frontend-domain.com/auth/accept-invitation`
     - `http://localhost:4200/auth/callback` (dev)
     - `http://localhost:4200/auth/accept-invitation` (dev)

- [ ] API keys copied to environment files
- [ ] Site URL configured
- [ ] Redirect URLs added

---

## 🧪 Part 4: Testing

### Step 4.1: Test Database Migrations

**Run these queries in Supabase SQL Editor:**

```sql
-- Test 1: Verify all tables exist
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'users', 'expenses', 'receipts',
    'organizations', 'organization_members', 'invitations'
  );
-- Expected: 6

-- Test 2: Verify RLS policies exist
SELECT COUNT(*) FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('organizations', 'organization_members', 'invitations');
-- Expected: 10+ policies

-- Test 3: Test organization creation function
SELECT create_organization_with_admin(
  p_name := 'Test Organization',
  p_domain := 'test.com'
);
-- Expected: Returns new organization record

-- Test 4: Verify Default Organization exists
SELECT id, name, created_at FROM organizations
WHERE name = 'Default Organization';
-- Expected: 1 row
```

- [ ] All 6 tables exist
- [ ] RLS policies exist
- [ ] `create_organization_with_admin()` function works
- [ ] Default Organization exists

### Step 4.2: Test Edge Functions

**Test invitation email function:**

1. Go to: Supabase Dashboard → Edge Functions → send-invitation-email
2. Click **Invoke**
3. Use test payload:

```json
{
  "invitation_id": "test-id",
  "email": "test@example.com",
  "token": "test-token-123",
  "organization_id": "test-org-id"
}
```

4. Check logs for output

**Expected response:**
```json
{
  "success": true,
  "message": "Email service not configured (development mode)",
  "invitationLink": "http://localhost:4200/auth/accept-invitation?token=test-token-123"
}
```

- [ ] Edge Function responds without errors
- [ ] Invitation link is generated
- [ ] (Optional) Email sent if EMAIL_SERVICE_API_KEY is configured

### Step 4.3: Test Frontend Integration

**Build and run the app:**

```bash
cd c:\Jensify\expense-app
npm install  # If needed
npm start
```

**Test organization setup flow:**

1. **New User Flow:**
   - [ ] Navigate to http://localhost:4200
   - [ ] Register a new account
   - [ ] Confirm email (check Supabase Auth logs)
   - [ ] Should redirect to `/organization/setup`
   - [ ] Should see "Create Organization" option
   - [ ] Create organization (e.g., "Test Company")
   - [ ] Should redirect to `/home`
   - [ ] Should see user as Admin

2. **Admin Features:**
   - [ ] Navigate to `/organization/users` (should be accessible)
   - [ ] Should see "Invite User" tab
   - [ ] Should see "Members" tab (shows current admin)
   - [ ] Should see "Invitations" tab

3. **Invitation Flow:**
   - [ ] Go to "Invite User" tab
   - [ ] Enter email: `employee@test.com`
   - [ ] Select role: Employee
   - [ ] Click "Send Invitation"
   - [ ] Check Edge Function logs for invitation link
   - [ ] Copy invitation link
   - [ ] Open in incognito window
   - [ ] Should see invitation details
   - [ ] Register new account with that email
   - [ ] Click "Accept Invitation"
   - [ ] Should join organization as Employee

4. **Data Isolation:**
   - [ ] Login as Admin (first user)
   - [ ] Create expense
   - [ ] Login as Employee (second user)
   - [ ] Should see expense (same organization)
   - [ ] Create second organization (new account)
   - [ ] Should NOT see first organization's expenses

### Step 4.4: Test Role-Based Access

**Test Admin role:**
- [ ] Can access `/organization/users`
- [ ] Can invite users
- [ ] Can view all members
- [ ] Can deactivate members

**Test Employee role:**
- [ ] Cannot access `/organization/users` (redirects to /home)
- [ ] Can create expenses
- [ ] Can view own expenses only
- [ ] Can submit expenses for approval

**Test Finance role:**
- [ ] Can access `/finance/dashboard`
- [ ] Can view all expenses in organization
- [ ] Can mark expenses as reimbursed
- [ ] Can export expense data

**Test Manager role:**
- [ ] Can access `/approvals`
- [ ] Can approve team expenses
- [ ] Cannot access admin features

---

## 🚀 Part 5: Production Deployment

### Step 5.1: Build for Production

```bash
cd c:\Jensify\expense-app
npm run build
```

**Verify build:**
- [ ] Build completes without errors
- [ ] No TypeScript errors
- [ ] Bundle size is reasonable (<2MB main bundle)

### Step 5.2: Deploy Frontend

**Option 1: Vercel**
```bash
npm install -g vercel
vercel --prod
```

**Option 2: Netlify**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

**Option 3: Firebase Hosting**
```bash
npm install -g firebase-tools
firebase deploy
```

- [ ] Frontend deployed to production
- [ ] Production URL works
- [ ] SSL certificate is valid

### Step 5.3: Update Production Environment Variables

**In your deployment platform:**

Set these environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anon key
- `GOOGLE_VISION_API_KEY`: Your Google Vision API key

**In Supabase (update Edge Function secrets):**
- Update `APP_URL` to your production frontend URL
- Example: `APP_URL=https://jensify.vercel.app`

- [ ] Environment variables set in deployment platform
- [ ] Edge Function `APP_URL` updated to production domain

### Step 5.4: Update Supabase Auth Settings

**In Supabase Dashboard → Authentication → URL Configuration:**

Update:
- **Site URL**: `https://your-production-domain.com`
- **Redirect URLs**: Add production URLs:
  - `https://your-production-domain.com/auth/callback`
  - `https://your-production-domain.com/auth/accept-invitation`

- [ ] Site URL updated
- [ ] Redirect URLs updated

---

## ✅ Final Verification Checklist

### Database ✅

- [ ] All 9 migration files applied (or appropriate subset)
- [ ] 6 tables exist (users, expenses, receipts, organizations, organization_members, invitations)
- [ ] 4 helper functions exist
- [ ] RLS policies in place
- [ ] Default Organization created
- [ ] Existing data migrated

### Backend ✅

- [ ] 2 Edge Functions deployed (send-invitation-email, process-receipt)
- [ ] Edge Function secrets configured
- [ ] Email service configured (optional but recommended)
- [ ] Edge Functions tested and working

### Frontend ✅

- [ ] Environment variables configured
- [ ] Build successful
- [ ] Deployed to production
- [ ] Production URL accessible

### Authentication ✅

- [ ] Supabase Auth configured
- [ ] Email provider enabled
- [ ] Site URL set
- [ ] Redirect URLs configured
- [ ] Password reset works
- [ ] Email confirmation works

### Features ✅

- [ ] User registration works
- [ ] User login works
- [ ] Organization setup wizard works
- [ ] Admin can create organization
- [ ] Admin can invite users
- [ ] Users can accept invitations
- [ ] Role-based access control works
- [ ] Data isolation between organizations works
- [ ] Expense creation works
- [ ] Finance dashboard works

### Security ✅

- [ ] RLS policies enforce organization isolation
- [ ] Users can't see other organizations' data
- [ ] Route guards prevent unauthorized access
- [ ] Admin-only routes protected
- [ ] API keys not exposed in frontend code

---

## 🆘 Troubleshooting

### Common Issues

**Issue:** "Table already exists" error
- ✅ **Solution:** Migration was already applied, skip it

**Issue:** "organization_id cannot be null"
- ❌ **Problem:** Organization migrations not applied
- ✅ **Solution:** Apply migrations #8 and #9

**Issue:** "Function does not exist"
- ❌ **Problem:** Helper functions not deployed
- ✅ **Solution:** Apply migration #9

**Issue:** Edge Function returns 500 error
- ❌ **Problem:** Environment variables not set
- ✅ **Solution:** Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_URL

**Issue:** Invitation emails not sending
- ⚠️ **Note:** This is expected if EMAIL_SERVICE_API_KEY is not set
- ✅ **Solution:** Check Edge Function logs for invitation link (development mode)
- ✅ **Solution:** Add Resend API key to send actual emails

**Issue:** Users redirected to /organization/setup every time
- ❌ **Problem:** User not in any organization
- ✅ **Solution:** User needs to create organization or accept invitation

---

## 📊 Deployment Timeline

**Estimated time:** 30-45 minutes (first time)

- **Part 1 (Database):** 15-20 minutes
- **Part 2 (Edge Functions):** 5-10 minutes
- **Part 3 (Environment):** 5 minutes
- **Part 4 (Testing):** 10-15 minutes
- **Part 5 (Production):** 10-15 minutes

---

## 📞 Support

**If you encounter issues:**

1. Review error messages carefully
2. Check Supabase logs (Dashboard → Logs)
3. Check Edge Function logs
4. Review browser console for frontend errors
5. Verify all steps in this checklist were completed

**Reference Documentation:**
- `DATABASE_MIGRATION_STATUS.md` - Migration file details
- `ORGANIZATION_MULTI_TENANCY_IMPLEMENTATION.md` - Architecture details
- `SUPABASE_DATABASE_UPDATE_GUIDE.md` - Step-by-step migration guide
- `MIGRATION_QUICK_REFERENCE.md` - Quick migration reference

---

## 🎉 Success!

When all checkboxes are complete, your organization multi-tenancy system is fully deployed! 🚀

**Next Steps:**
1. Create your first organization
2. Invite team members
3. Start tracking expenses with proper organization isolation
4. Monitor usage and performance
5. Gather user feedback
6. Plan Phase 2 enhancements (see ORGANIZATION_MULTI_TENANCY_IMPLEMENTATION.md)

---

*Last Updated: November 15, 2025*
*Deployment Target: Hosted Supabase (supabase.com)*
*Generated by Claude Code*
