# Development Tools

Quick scripts for testing and development without Docker.

## Quick User Management

### Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. Copy/paste commands from `quick-user-setup.sql`
3. Run the sections you need

### Common Tasks

**Change Your Role (test different dashboards):**
```sql
-- Copy from section 2 in quick-user-setup.sql
-- Changes role in both organization_members and app_metadata
```

**Add Fake Test Data:**
```sql
-- Copy from section 3 in quick-user-setup.sql
-- Adds 8 expenses and 6 mileage trips
```

**Reset Data:**
```sql
-- Copy from section 5 in quick-user-setup.sql
-- Deletes all expenses/mileage/receipts for testing
```

### Quick Role Switching Workflow

1. **Test Employee Dashboard:**
   - Run "Make user EMPLOYEE" from section 2
   - Log out and log back in (to refresh JWT)
   - Visit /home

2. **Test Manager Dashboard:**
   - Run "Make user MANAGER" from section 2
   - Log out and log back in
   - Visit /home

3. **Test Finance Dashboard:**
   - Run "Make user FINANCE" from section 2
   - Log out and log back in
   - Visit /home

4. **Test Admin Dashboard:**
   - Run "Make user ADMIN" from section 2
   - Log out and log back in
   - Visit /home

### Add More Test Users

1. Go to Supabase Auth: https://supabase.com/dashboard/project/YOUR_PROJECT/auth/users
2. Click "Add User" → Enter email and password
3. Run section 4 from `quick-user-setup.sql` (update email)
4. Now you have multiple users for testing approvals, etc.

### Tips

- **Always update both** `organization_members.role` AND `raw_app_meta_data.role`
- **Log out/in** after role changes to refresh JWT token
- Use section 6 to **verify** your setup after changes
- Section 5 lets you **reset** and start fresh

## Why No Docker?

Docker Desktop isn't needed for quick database edits. Just use Supabase SQL Editor directly on your cloud database. It's faster for quick tests!

When you need full local development (with Edge Functions, Storage, etc.), install Docker Desktop and use `supabase start`.
