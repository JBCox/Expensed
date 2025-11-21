# Archive Directory

**Purpose:** Historical documentation and completed task records

**Date Archived:** November 16, 2025

---

## What's Here

This directory contains all **completed, superseded, or historical** documentation that is no longer actively needed for development but is preserved for reference.

### Folder Structure

```
archive/
├── completed-tasks/          # Completed features, deployments, and milestones
├── migration-troubleshooting/# Database migration sync issues (all resolved)
├── old-docs/                 # Superseded documentation and reviews
└── sql-fixes/                # One-time SQL patches and database scripts
```

---

## Completed Tasks

**Location:** `completed-tasks/`

Documentation for features and deployments that have been successfully completed:

- Organization multi-tenancy implementation
- Database migration fixes
- Security improvements (RLS policies)
- Initial setup and deployment readiness
- Email registration system

**Status:** ✅ All tasks in this folder are complete and deployed.

---

## Migration Troubleshooting

**Location:** `migration-troubleshooting/`

Documentation related to the November 2025 database migration sync issues:

- **Issue:** Local migration files were out of sync with remote Supabase database
- **Cause:** Migrations applied directly to database instead of via `supabase db push`
- **Resolution:** Manual SQL fix to sync migration history table
- **Prevention:** Workflow documented in `FIX_AND_PREVENT_SYNC_ISSUES.md`

**Status:** ✅ Issue resolved. Migration workflow established.

**Backup:** `migrations_backup_20251116_115547/` contains snapshot of migrations before fix.

---

## Old Documentation

**Location:** `old-docs/`

Documentation that has been superseded or is no longer relevant:

- Old documentation review processes
- Superseded test reports
- Historical session logs
- Planning documents (integrated into CLAUDE.md)

**Status:** ℹ️ Reference only. Use current documentation in root directory.

---

## SQL Fixes

**Location:** `sql-fixes/`

One-time SQL scripts used for database fixes and data migrations:

- RLS policy fixes (multiple iterations before final solution)
- Organization migration scripts
- Database state verification queries
- User management scripts (delete-users, fix-profiles, query-database)

**Status:** ✅ All fixes applied. Scripts kept for historical reference only.

**⚠️ DO NOT RUN THESE SCRIPTS** - They were for one-time fixes and may cause issues if re-run.

---

## Why Keep Archives?

1. **Historical Context** - Understand why decisions were made
2. **Learning** - See how problems were solved
3. **Audit Trail** - Track project evolution
4. **Recovery** - Reference if similar issues occur
5. **Documentation** - Complete project history

---

## When to Archive

Move documentation to archive when:

- ✅ Task/feature is 100% complete and deployed
- ✅ Documentation has been superseded by newer version
- ✅ Issue is resolved and prevention is documented
- ✅ File is no longer needed for active development

**Rule:** If you haven't referenced a doc in 2+ weeks and the task is complete, archive it.

---

## Archive Maintenance

### Do:
- ✅ Keep all archives (don't delete)
- ✅ Organize by category
- ✅ Update this README when adding new archives
- ✅ Preserve original filenames

### Don't:
- ❌ Delete archived files (disk space is cheap, history is valuable)
- ❌ Modify archived files (preserve as-is)
- ❌ Move files out of archive (if needed, copy instead)

---

## Need Something From Archives?

1. **Check the current documentation first** - Most content is consolidated
2. **Search this directory** - Files are organized by category
3. **Check git history** - `git log` shows when files were archived

---

## Archive Log

### November 16, 2025 - Initial Archive
**Archived:** 40+ files
**Reason:** Project cleanup after Phase 0 completion

**Categories:**
- 10 completed task documents
- 7 migration troubleshooting files
- 14 old documentation files
- 17 one-time SQL fix scripts

**Before:** 60+ files cluttering root directory
**After:** Clean, organized structure with clear documentation index

---

**Questions?** See `DOCUMENTATION_INDEX.md` in the root directory for current documentation structure.
