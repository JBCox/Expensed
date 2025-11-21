# 🚀 Migration Quick Reference

## 🎣 Automatic Safety (Git Hooks)

**One-time setup:**
```powershell
cd C:\Jensify
.\supabase\setup-git-hooks.ps1
```

**What it does:**
- ✅ Runs automatically on `git commit`
- ✅ Checks timestamp format
- ✅ Detects dangerous patterns
- ✅ Blocks bad commits

**To bypass (emergency only):**
```powershell
git commit --no-verify
```

---

## Daily Workflow

### Start Development
```powershell
# Terminal 1: Start Supabase
cd C:\Jensify
supabase start

# Terminal 2: Start Angular
cd C:\Jensify\expense-app
ng serve --configuration=development
```

Visit: http://localhost:4200 (uses local Supabase)

### Stop Development
```powershell
supabase stop
# Press Ctrl+C in Angular terminal
```

---

## Creating Migrations

### Quick Create
```powershell
cd C:\Jensify\supabase
.\new-migration.ps1 "add feature name"
```

### Test Migration
```powershell
.\test-migrations.ps1
```

### Before Commit
```powershell
.\check-migrations.ps1
git add supabase/migrations/*.sql
git commit -m "Add migration: feature name"
```

---

## Troubleshooting

### Migration Failed?
```powershell
# 1. Fix the migration file directly (don't create new one!)
code supabase\migrations\failing_migration.sql

# 2. Test again
supabase db reset
```

### Clean Slate
```powershell
supabase stop --no-backup
supabase start
```

### Nuclear Option
```powershell
docker stop $(docker ps -aq --filter "name=supabase")
docker rm $(docker ps -aq --filter "name=supabase")
supabase start
```

---

## Golden Rules

✅ **DO:**
- Test locally before committing (`supabase db reset`)
- Use `IF EXISTS` / `IF NOT EXISTS`
- One feature = one migration
- Use proper timestamps: `yyyyMMddHHmmss`
- Check for duplicates: `.\check-migrations.ps1`

❌ **DON'T:**
- Create "fix" migrations for recent changes
- Modify `auth` or `storage` internal tables
- Skip local testing
- Use date-only timestamps (no time)
- Commit failing migrations

---

## Quick Commands

| Command | Purpose |
|---------|---------|
| `supabase start` | Start local Supabase |
| `supabase stop` | Stop local Supabase |
| `supabase db reset` | Fresh database (re-run migrations) |
| `supabase status` | Check what's running |
| `.\new-migration.ps1 "name"` | Create new migration |
| `.\test-migrations.ps1` | Test all migrations |
| `.\check-migrations.ps1` | Pre-commit checks |

---

## URLs (Local)

- **App**: http://localhost:4200
- **API**: http://127.0.0.1:54321
- **Studio**: http://127.0.0.1:54323
- **Mailpit**: http://127.0.0.1:54324

---

## Get Help

- **Guidelines**: See `MIGRATION_GUIDELINES.md`
- **Setup Guide**: See `README.md`
- **Local Dev**: See `LOCAL_DEVELOPMENT_READY.md`
