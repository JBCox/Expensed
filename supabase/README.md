# Supabase Database Setup

This directory contains database migrations and setup instructions for the Jensify expense management system.

## 🚀 Quick Start - Local Development (Recommended)

### Prerequisites
- Docker Desktop installed and running
- Supabase CLI installed: `npm install -g supabase`

### Start Local Supabase
```powershell
cd C:\Jensify
supabase start
```

This automatically runs all 7 migrations and starts local Supabase at:
- **API**: http://127.0.0.1:54321
- **Studio**: http://127.0.0.1:54323
- **Database**: postgresql://postgres:postgres@127.0.0.1:54322/postgres

### Run Angular with Local Backend
```powershell
cd C:\Jensify\expense-app
ng serve --configuration=development
```

Visit http://localhost:4200 - your app now uses local Supabase!

---

## 📝 Creating New Migrations

### Use the Helper Script (Recommended)
```powershell
cd C:\Jensify\supabase
.\new-migration.ps1 "add user preferences"
```

This will:
1. Generate a unique timestamp
2. Check for similar existing migrations
3. Create a template migration file
4. Open it in VS Code

### Manual Creation
```powershell
cd C:\Jensify\supabase\migrations
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
New-Item "${timestamp}_your_feature.sql"
```

**⚠️ IMPORTANT**: Always include hours/minutes/seconds in timestamp to avoid conflicts!

---

## 🧪 Testing Migrations

### Before Committing - ALWAYS Test Locally!
```powershell
cd C:\Jensify\supabase
.\test-migrations.ps1
```

This will:
1. Stop local Supabase
2. Start fresh and run all migrations
3. Report success or show which migration failed

### Manual Testing
```powershell
cd C:\Jensify
supabase db reset  # Drops everything and re-runs all migrations
```

If it fails:
- **FIX THE MIGRATION FILE DIRECTLY**
- **DO NOT create a "fix" migration**
- Run `supabase db reset` again
- Repeat until it works

---

## 📋 Migration Best Practices

See **[MIGRATION_GUIDELINES.md](./MIGRATION_GUIDELINES.md)** for detailed rules.

### Key Rules
1. ✅ Test locally with `supabase db reset` BEFORE committing
2. ✅ One feature = one migration (no separate "fix" migrations)
3. ✅ Use unique timestamps: `yyyyMMddHHmmss`
4. ✅ Always use `IF EXISTS` / `IF NOT EXISTS`
5. ✅ Only touch `public` schema (not `auth` or `storage` internals)
6. ❌ Never modify deployed migrations - create new ones instead

---

## 📊 Current Migration List

Clean, tested migrations (in order):

1. `20251113000001_phase0_initial_schema.sql` - Base tables (users, expenses, receipts)
2. `20251113000002_storage_policies.sql` - Receipt storage bucket
3. `20251113000003_handle_new_user_signup.sql` - Auto-create user profiles
4. `20251115000001_organization_multi_tenancy.sql` - Organizations & roles
5. `20251115000002_organization_helper_functions.sql` - Org utilities
6. `20251116184702_mileage_tracking_module.sql` - Mileage tracking
7. `20251117000001_fix_rls_policies_consolidated.sql` - Final RLS policies

**Backups**: Previous migrations saved in `migrations_backup_current/`

---

## 🏗️ Production Deployment

### Option 1: Using Supabase Dashboard

1. Go to https://supabase.com/dashboard → Your Project → SQL Editor
6. Paste into the SQL Editor
7. Click **Run** (or press Cmd/Ctrl + Enter)
8. You should see success messages in the Results panel

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run the migration
supabase db push
```

## Post-Migration Setup

After running the SQL migration, you need to set up the Storage bucket for receipt files.

### 1. Create Storage Bucket

1. In your Supabase dashboard, go to **Storage** in the left sidebar
2. Click **Create a new bucket**
3. Enter bucket name: `receipts`
4. Set **Public bucket** to: `false` (private)
5. Click **Create bucket**

### 2. Configure Storage Policies

1. Click on the **receipts** bucket you just created
2. Go to the **Policies** tab
3. Click **New Policy**
4. For each of the following policies, create a new policy:

#### Policy 1: Users can upload own receipts
```sql
CREATE POLICY "Users can upload own receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

#### Policy 2: Users can read own receipts
```sql
CREATE POLICY "Users can read own receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

#### Policy 3: Finance can read all receipts
```sql
CREATE POLICY "Finance can read all receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('finance', 'admin')
    )
  );
```

#### Policy 4: Users can delete own receipts
```sql
CREATE POLICY "Users can delete own receipts"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

### 3. Enable Email Authentication

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Make sure **Email** provider is enabled
3. Configure email templates (optional):
   - Click on **Email Templates**
   - Customize confirmation and password reset emails

### 4. Configure Auth Settings

1. Go to **Authentication** → **Settings**
2. Set **Site URL** to your application URL:
   - Development: `http://localhost:4200`
   - Production: `https://yourdomain.com`
3. Add **Redirect URLs**:
   - `http://localhost:4200/**`
   - `https://yourdomain.com/**` (for production)

## Database Schema Overview

### Tables

#### `users`
- Stores user profile information
- Linked to Supabase Auth users
- Includes role (employee, finance, admin)
- Has manager relationship for approval workflows

#### `expenses`
- Main expense records
- Includes merchant, amount, date, category
- Status tracking (draft, submitted, approved, reimbursed)
- Policy violation tracking
- Linked to user and receipt

#### `receipts`
- Receipt file metadata
- OCR status and results
- Extracted fields (merchant, amount, date, tax)
- Linked to expenses

### Row Level Security (RLS)

All tables have RLS enabled with the following rules:

- **Employees**: Can only view/edit their own data
- **Finance/Admin**: Can view all data, mark expenses as reimbursed
- **Draft expenses**: Only editable by owner
- **Submitted expenses**: Read-only for employees, editable by finance

### Policy Validation

Expenses are automatically checked against these policies:
- **Max single receipt**: $500
- **Max daily total**: $750
- **Date range**: Not older than 90 days
- **Date validity**: Cannot be in the future

Violations are stored but don't block submission (soft enforcement).

## Verification

After setup, verify everything is working:

### 1. Check Tables

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'expenses', 'receipts');
```

You should see all three tables listed.

### 2. Check RLS Policies

```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

You should see multiple policies for each table.

### 3. Check Indexes

```sql
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

You should see indexes for user_id, status, dates, etc.

### 4. Check Storage Bucket

```sql
SELECT name, public
FROM storage.buckets
WHERE name = 'receipts';
```

You should see the receipts bucket with `public = false`.

## Testing the Setup

### 1. Test User Registration

From your Angular app:
1. Register a new user
2. Check Supabase Dashboard → Authentication → Users
3. Check Supabase Dashboard → Table Editor → users table
4. You should see the new user in both places

### 2. Test Expense Creation

1. Login with your test user
2. Create a draft expense
3. Check Supabase Dashboard → Table Editor → expenses table
4. Verify the expense appears with correct data

### 3. Test RLS Policies

1. Create two test users
2. Login as User A, create an expense
3. Login as User B, try to view User A's expenses
4. User B should NOT see User A's expenses (RLS working!)

### 4. Test Finance Role

1. In Supabase Dashboard → Table Editor → users
2. Find your test user
3. Change `role` from `employee` to `finance`
4. Login again with that user
5. You should now see all users' expenses

## Troubleshooting

### Issue: "permission denied for table users"
**Solution**: Make sure RLS policies are enabled and created correctly. Re-run the migration.

### Issue: "Storage bucket not found"
**Solution**: Create the `receipts` bucket manually in Supabase Dashboard → Storage.

### Issue: "Cannot upload files"
**Solution**: Check storage policies are configured correctly. Ensure user is authenticated.

### Issue: "Policy violations not being recorded"
**Solution**: Check that the `check_expense_policies_trigger` is created and enabled.

### Issue: "Users can see other users' data"
**Solution**: Verify RLS is enabled on tables. Check policies with the SQL query above.

## Next Steps

After database setup is complete:

1. ✅ Run the migration SQL
2. ✅ Create storage bucket
3. ✅ Configure storage policies
4. ✅ Enable email authentication
5. ✅ Test user registration
6. 🔄 Start building Angular components
7. 🔄 Implement receipt upload functionality
8. 🔄 Integrate OCR (Google Vision API)

## Maintenance

### Backing Up Data

Supabase automatically backs up your database daily. You can also create manual backups:

1. Go to **Database** → **Backups** in Supabase Dashboard
2. Click **Create backup**
3. Download backup for local storage

### Monitoring

Monitor your database usage:
- **Database** → **Database** → View table sizes
- **Database** → **Extensions** → Check enabled extensions
- **Reports** → View usage statistics

## Support

If you encounter issues:
1. Check Supabase logs: Dashboard → Logs
2. Review RLS policy violations: Dashboard → Authentication → Policies
3. Check SQL Editor for error messages
4. Consult Supabase documentation: https://supabase.com/docs

---

**Last Updated**: 2025-11-13
**Schema Version**: Phase 0 - Initial MVP
**Status**: Ready for development
