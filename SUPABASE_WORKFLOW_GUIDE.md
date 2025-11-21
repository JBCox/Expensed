# Supabase Database Workflow Guide

## ✅ Setup Complete!

Your Supabase CLI and MCP are now properly configured. No more copy/pasting SQL commands!

---

## 🎯 How to Make Database Changes Going Forward

### Option 1: Using Supabase CLI (Recommended for Migrations)

#### Create a New Migration

```bash
# 1. Create a new migration file
cd C:\Jensify\supabase
supabase migration new description_of_change

# Example:
supabase migration new add_expense_tags
```

This creates a new file in `supabase/migrations/` like:
`20251116_add_expense_tags.sql`

#### Write Your SQL

Edit the new migration file and add your SQL:

```sql
-- Example: Add tags to expenses
CREATE TABLE expense_tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id uuid REFERENCES expenses(id) ON DELETE CASCADE,
  tag_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add RLS policies
ALTER TABLE expense_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expense tags"
ON expense_tags FOR SELECT
USING (
  expense_id IN (
    SELECT id FROM expenses WHERE user_id = auth.uid()
  )
);
```

#### Apply the Migration

```bash
# Push the migration to your remote database
supabase db push

# That's it! No copy/pasting needed.
```

---

### Option 2: Using MCP (Model Context Protocol)

**MCP is already configured** in `C:\Jensify\.mcp.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=bfudcugrarerqvvyfpoz"
    }
  }
}
```

#### How to Use MCP

When you want me (Claude) to make database changes:

1. **Just ask me directly** - "Add a tags column to the expenses table"
2. I'll use the MCP tools to:
   - Query your database schema
   - Execute SQL commands
   - Verify the changes
3. **No manual copy/pasting required!**

#### MCP Capabilities

- ✅ Execute SQL queries
- ✅ Create/modify tables
- ✅ Add/update RLS policies
- ✅ Query database schema
- ✅ Run database functions
- ✅ Manage migrations

---

## 🔄 Current Status

### Migration History - SYNCED ✅

All your local migrations are now synced with the remote database:

- ✅ 20251113_phase0_initial_schema
- ✅ 20251113_storage_policies
- ✅ 20251113215904_handle_new_user_signup
- ✅ 20251115_mileage_module
- ✅ 20251115_fix_rls_recursion
- ✅ 20251115_fix_storage_rls_recursion
- ✅ 20251115_fix_mileage_rls_recursion
- ✅ 20251115_organization_helper_functions
- ✅ 20251115_organization_multi_tenancy
- ✅ 20251116_fix_organization_members_rls_recursion
- ✅ 20251116_fix_invitations_rls_recursion
- ✅ 20251116_proper_rls_fix_with_app_metadata
- ✅ 20251116_complete_rls_fix_with_role_in_metadata

---

## 📋 Common Workflows

### Workflow 1: Add a New Feature with Database Changes

```bash
# 1. Create a migration
supabase migration new add_expense_categories

# 2. Edit the migration file (supabase/migrations/YYYYMMDD_add_expense_categories.sql)
# Add your SQL here

# 3. Apply to remote database
supabase db push

# 4. Update your TypeScript models (src/app/core/models/)
# 5. Update your services (src/app/core/services/)
# 6. Build the UI
```

### Workflow 2: Quick Database Query

Instead of going to Supabase dashboard:

**Old way** ❌:
1. Open Supabase dashboard
2. Click SQL Editor
3. Write query
4. Copy results

**New way** ✅:
1. Ask Claude: "Show me all expenses from the last 7 days"
2. I'll use MCP to query and show you the results

### Workflow 3: Fix a Database Issue

**Old way** ❌:
1. Write SQL in a file
2. Copy/paste into Supabase SQL Editor
3. Run it
4. Hope it worked

**New way** ✅:
1. Ask Claude: "Fix the RLS policy on the invitations table"
2. I'll use MCP to:
   - Check current policies
   - Write the fix
   - Apply it
   - Verify it worked

---

## 🛠️ Troubleshooting

### Database Connection Issues

If you see connection timeouts:
- Your database may be paused (free tier auto-pauses after inactivity)
- Just wait 30-60 seconds for it to wake up
- Or visit your Supabase dashboard to wake it up manually

### Migration Conflicts

If you see "migration history does not match":
1. Run `supabase migration list` to see the difference
2. Ask Claude to help resolve the conflict
3. We can use MCP to fix it without manual SQL

### MCP Not Working

If MCP isn't working:
1. Check that `.mcp.json` exists in `C:\Jensify\`
2. Restart Claude Code CLI
3. Ask me to test the connection

---

## 🚀 Next Steps

You're all set! Here's what you can do now:

### For Database Changes:
- **Small changes**: Just ask me, I'll use MCP
- **Feature migrations**: Use `supabase migration new` → `supabase db push`
- **Queries**: Just ask me, I'll use MCP

### For Development:
- Continue building your Angular app
- Use the CLI for migrations
- Let me handle the SQL through MCP

---

## 📚 Quick Reference

```bash
# Supabase CLI Commands
supabase migration list              # Check migration status
supabase migration new <name>        # Create new migration
supabase db push                     # Apply migrations to remote
supabase db pull                     # Pull remote schema to local
supabase projects list               # List your projects
supabase status                      # Check local Docker status (optional)

# Project Info
Project: Jensify
Project ID: bfudcugrarerqvvyfpoz
Region: East US (North Virginia)
Dashboard: https://supabase.com/dashboard/project/bfudcugrarerqvvyfpoz
```

---

## 🎉 Success!

You've successfully set up:
- ✅ Supabase CLI linked to remote project
- ✅ Migration history synchronized
- ✅ MCP configured for direct database access
- ✅ No more copy/pasting SQL!

**Just ask me whenever you need database changes, and I'll handle it for you!**
