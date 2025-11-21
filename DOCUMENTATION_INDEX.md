# Jensify Documentation Index

**Last Updated:** November 16, 2025
**Project Status:** Phase 0 Complete - Organization Multi-Tenancy Active

---

## 📖 Quick Start

**New to the project?** Start here:

1. **README.md** - Project overview and quick start guide
2. **CLAUDE.md** - Complete development guide (AI assistant instructions)
3. **HOW_JENSIFY_WORKS.md** - System architecture and features
4. **PROJECT_STATUS.md** - Current progress and metrics

---

## 🚀 Active Documentation (Current Use)

### Development Guides

| File | Purpose | Use When |
|------|---------|----------|
| **CLAUDE.md** | Complete coding standards, project structure, workflow | Every development session |
| **HOW_JENSIFY_WORKS.md** | System architecture, features, how components work | Understanding the system |
| **FIX_AND_PREVENT_SYNC_ISSUES.md** | Database migration best practices | Making DB changes |
| **SUPABASE_WORKFLOW_GUIDE.md** | Supabase CLI commands and workflows | Working with database |

### Setup & Configuration

| File | Purpose | Use When |
|------|---------|----------|
| **README.md** | Project setup, environment variables, getting started | Initial setup |
| **EMAIL_SETUP_GUIDE.md** | Configure email for invitations (Resend/SendGrid) | Setting up emails |
| **SUPABASE_MCP_SETUP_COMPLETE.md** | MCP server integration with Claude | Setting up MCP tools |

### Deployment

| File | Purpose | Use When |
|------|---------|----------|
| **DEPLOYMENT_CHECKLIST.md** | Pre-deployment verification checklist | Before deploying |

### Progress Tracking

| File | Purpose | Use When |
|------|---------|----------|
| **PROJECT_STATUS.md** | Current progress, completed features, metrics | Checking progress |
| **EXPENSIFY_PARITY_CHECKLIST.md** | Feature parity with Expensify goal | Planning features |

---

## 📁 Specialized Documentation

### In `docs/` Folder

| File | Purpose |
|------|---------|
| **GOOGLE_VISION_SETUP.md** | Google Vision API setup for OCR |
| **MILEAGE_FEATURE_PLAN.md** | Mileage tracking feature specification |
| **OCR_EDGE_FUNCTION_DEPLOYMENT.md** | Deploying OCR as Supabase Edge Function |

### In `expense-app/` Folder

| File | Purpose |
|------|---------|
| **expense-app/README.md** | Angular app specific documentation |
| **expense-app/JENSIFY_GUIDE.md** | User guide for employees |
| **expense-app/USER_GUIDE_EMPLOYEE_APPROVER.md** | User guide for managers/finance |

### In `supabase/` Folder

| File | Purpose |
|------|---------|
| **supabase/README.md** | Supabase project documentation |
| **supabase/MIGRATION_QUICK_REFERENCE.md** | Migration commands quick reference |
| **supabase/config.toml** | Supabase local configuration |

---

## 🗄️ Archived Documentation

### What's in `archive/`

All historical, completed, or superseded documentation has been moved to the `archive/` folder:

```
archive/
├── completed-tasks/          # Completed features and deployments
│   ├── CRITICAL_FIXES_COMPLETED.md
│   ├── DATABASE_MIGRATION_STATUS.md
│   ├── DATABASE_VERIFICATION_COMPLETE.md
│   ├── DEPLOYMENT_READY.md
│   ├── ORGANIZATION_MULTI_TENANCY_DEPLOYMENT_COMPLETE.md
│   ├── ORGANIZATION_MULTI_TENANCY_IMPLEMENTATION.md
│   ├── ORGANIZATION_SETUP_COMPLETE.md
│   ├── READY_TO_DEPLOY_SUMMARY.md
│   ├── SECURITY_FIXES_APPLIED.md
│   └── SETUP_COMPLETE.md
│
├── migration-troubleshooting/ # Migration sync issues (resolved)
│   ├── APPLY_PROPER_RLS_FIX.md
│   ├── FIX_SYNC_CORRECT.sql
│   ├── QUICK_FIX_CHECKLIST.md
│   ├── SUPABASE_CLI_FIX.md
│   ├── SUPABASE_DATABASE_UPDATE_GUIDE.md
│   ├── SUPABASE_SYNC_STATUS.md
│   ├── repair_migrations.bat
│   └── migrations_backup_20251116_115547/
│
├── old-docs/                 # Superseded documentation
│   ├── DOCUMENTATION_ACCURACY_REVIEW.md
│   ├── DOCUMENTATION_CHECKLIST.md
│   ├── DOCUMENTATION_REVIEW_INDEX.md
│   ├── DOCUMENTATION_REVIEW_SUMMARY.md
│   ├── DOCUMENTATION_UPDATE_LOG.md
│   ├── DOCUMENTATION_UPDATES_RECOMMENDED.md
│   ├── EMAIL_REGISTRATION_TESTING.md
│   ├── ISSUES_CLAUDE_CANNOT_FIX.md
│   ├── SESSION_LOG_2025-11-13.md
│   ├── TEST_REPORT.md
│   ├── prompt_plan.md
│   └── spec.md
│
└── sql-fixes/                # One-time SQL fixes and scripts
    ├── APPLY_ORGANIZATION_MIGRATIONS.sql
    ├── APPLY_RLS_RECURSION_FIXES.sql
    ├── CHECK_DATABASE_STATE.sql
    ├── CHECK_DATABASE_STATUS.sql
    ├── CLEANUP_AND_MIGRATE.sql
    ├── delete-users.mjs
    ├── FINAL_RLS_FIX_COMPLETE.sql
    ├── FIX_MIGRATION_HISTORY.sql
    ├── FIX_RLS_V2.sql
    ├── FIX_SYNC_FINAL.sql
    ├── FIX_SYNC_SIMPLE.sql
    ├── fix-user-profiles.mjs
    ├── MANUAL_FIX_SYNC.sql
    ├── MANUAL_FIX_SYNC_CORRECTED.sql
    ├── query-database.mjs
    ├── SAFE_ORGANIZATION_MIGRATION.sql
    ├── URGENT_FIX_RLS.sql
    └── VERIFY_ORGANIZATION_SETUP.sql
```

**Note:** Archived files are kept for historical reference but are no longer needed for development.

---

## 🎯 Documentation Maintenance

### When to Update Documentation

| Trigger | Update These Files |
|---------|-------------------|
| Complete a feature | PROJECT_STATUS.md, CLAUDE.md (Completed Components) |
| Add new database migration | FIX_AND_PREVENT_SYNC_ISSUES.md workflow |
| Change environment variables | README.md, CLAUDE.md |
| Add new service/integration | HOW_JENSIFY_WORKS.md, CLAUDE.md |
| Deploy to production | DEPLOYMENT_CHECKLIST.md |

### Documentation Best Practices

1. **Keep CLAUDE.md as source of truth** - Most comprehensive guide
2. **Update PROJECT_STATUS.md weekly** - Track progress
3. **Archive completed task docs** - Move to `archive/completed-tasks/`
4. **Don't delete archives** - Historical reference is valuable
5. **Update this index** - When adding new major documentation

---

## 🔍 Finding What You Need

### I want to...

**...understand the codebase:**
- Read: `HOW_JENSIFY_WORKS.md`
- Then: `CLAUDE.md` (Tech Stack & Project Structure sections)

**...make a database change:**
- Read: `FIX_AND_PREVENT_SYNC_ISSUES.md` (The Golden Rule section)
- Reference: `SUPABASE_WORKFLOW_GUIDE.md`

**...deploy the app:**
- Check: `DEPLOYMENT_CHECKLIST.md`
- Verify: `PROJECT_STATUS.md` (ensure Phase 0 complete)

**...add a new feature:**
- Plan using: `EXPENSIFY_PARITY_CHECKLIST.md`
- Follow standards in: `CLAUDE.md` (Coding Standards section)
- Update: `PROJECT_STATUS.md` when complete

**...set up email invitations:**
- Follow: `EMAIL_SETUP_GUIDE.md`

**...understand organization multi-tenancy:**
- Read: `CLAUDE.md` (Organization Multi-Tenancy section)
- Technical details: `archive/completed-tasks/ORGANIZATION_MULTI_TENANCY_IMPLEMENTATION.md`

---

## 📝 Recent Changes

### November 16, 2025 - Documentation Cleanup
- ✅ Archived 40+ old/completed documentation files
- ✅ Created organized archive structure
- ✅ Consolidated migration troubleshooting docs
- ✅ Removed duplicate and superseded documentation
- ✅ Created this documentation index

### November 15, 2025 - Organization Multi-Tenancy
- Added organization system documentation
- Updated CLAUDE.md with multi-tenancy architecture
- Created deployment guides for organization features

### November 13, 2025 - Initial Setup
- Created initial project documentation
- Set up development environment guides
- Established coding standards in CLAUDE.md

---

## 🤝 Contributing

When adding new documentation:

1. **Choose the right location:**
   - Root: Project-wide documentation
   - `docs/`: Feature-specific technical docs
   - `expense-app/`: Frontend/user-facing docs
   - `supabase/`: Database/backend docs

2. **Use clear naming:**
   - `FEATURE_NAME_GUIDE.md` for how-to guides
   - `FEATURE_NAME_SPEC.md` for specifications
   - `FEATURE_NAME_STATUS.md` for progress tracking

3. **Update this index:**
   - Add entry to appropriate section
   - Update "Recent Changes"
   - Keep organized alphabetically

4. **Follow the Documentation Update Rule:**
   - See CLAUDE.md "Critical Guardrails" section #11
   - Update all relevant docs after completing ANY task

---

**Questions?** Check `CLAUDE.md` first - it's the most comprehensive guide.

**Need help?** All documentation follows the same structure for easy navigation.
