# Known Verified Issues

This file tracks issues that have been investigated and verified. **Do NOT re-investigate issues listed here.**

Last Updated: 2025-12-10

---

## How to Use This File

1. **Before reporting an issue**: Check if it's already listed here
2. **After fixing an issue**: Add it to the appropriate section
3. **After verifying a false positive**: Add it to "Not Actually Issues"

---

## Fixed Issues

Issues that were real and have been resolved.

### Backend / Database

| Issue | Fixed In | Date | Notes |
|-------|----------|------|-------|
| Storage RLS cross-org access | `20251121120000_fix_storage_rls_organization_isolation.sql` | 2025-11-21 | Finance users were able to access receipts from all orgs |
| Audit log injection vulnerability | `20251209200000_security_fixes.sql` | 2025-12-09 | Any user could insert fake audit logs |
| Invoice visibility too broad | `20251209200000_security_fixes.sql` | 2025-12-09 | All org members could see billing invoices |
| Logo storage bucket public | `20251209200000_security_fixes.sql` | 2025-12-09 | Changed to private with role-based access |
| Missing performance indexes | `20251121120100_add_critical_performance_indexes.sql` | 2025-11-21 | Added indexes for expenses, receipts, org_members, etc. |
| Circular delegation not prevented | `20251210000001_prevent_circular_delegations.sql` | 2025-12-10 | Added checks for A→B when B→A exists |
| RLS infinite recursion | `20251117000001_fix_rls_infinite_recursion.sql` | 2025-11-17 | Fixed recursive policy checks |

### Frontend / Angular

| Issue | Fixed In | Date | Notes |
|-------|----------|------|-------|
| Silent error handler in expense-detail | `expense-detail.ts` | 2025-12-10 | Added snackbar notification and LoggerService |
| Unsafe `(window as any).google` access | `trip-map.ts` | 2025-12-10 | Added type-safe `getGoogleMaps()` helper |
| Unused RxJS imports in category.service | `category.service.ts` | 2025-12-10 | Removed `concat` and `of` |
| Missing `addToReport` method | `expense-detail.ts` | 2025-12-10 | Added method that template referenced |
| Redundant hardcoded localStorage cleanup | `auth.service.ts:268` | 2025-12-10 | Removed `sb-bfudcugrarerqvvyfpoz-auth-token` removal - Supabase SDK handles its own token cleanup |

---

## Not Actually Issues (False Positives)

Things that look like issues but are intentional or not problems.

### Console Statements

| Pattern | Location | Why It's OK |
|---------|----------|-------------|
| `console.log` in JSDoc comments | Various services | Documentation examples, not executed code |
| `console.error` in catch blocks | Various services | Proper error handling, LoggerService wraps these in dev mode |
| `console.error` in super-admin components | `features/super-admin/*` | Error handlers, acceptable for admin debugging |

### Code Patterns

| Pattern | Location | Why It's OK |
|---------|----------|-------------|
| `// TODO:` comments | Various | Intentional future work markers, not bugs |
| Unused `data` parameter warnings | Some RxJS map callbacks | TypeScript strict mode, data IS used via destructuring |
| Empty catch blocks with logging | Error handlers | LoggerService handles the logging |

### Angular Service Lifecycle (IMPORTANT)

| Pattern | Location | Why It's OK |
|---------|----------|-------------|
| `takeUntil(destroy$)` in root services | `subscription.service.ts`, `auth.service.ts`, etc. | Root services with `providedIn: 'root'` DO call `ngOnDestroy` when app is destroyed |
| "Memory leak" in `providedIn: 'root'` service | Various core services | FALSE POSITIVE - Angular calls ngOnDestroy on root services |
| Subject not explicitly completed | Services using destroy$ pattern | The `takeUntil` completes the subscription when `destroy$.next()` is called |

### Supabase SDK Behavior

| Pattern | Location | Why It's OK |
|---------|----------|-------------|
| No manual `sb-*-auth-token` removal in signOut | `auth.service.ts` | Supabase SDK's `signOut()` automatically clears its own localStorage tokens |
| Only app-specific keys cleared | `auth.service.ts:267-268` | Correct - only clear `current_organization_id`, `impersonation_session` |

### Edge Function Known Limitations

| Pattern | Location | Why It's OK |
|---------|----------|-------------|
| In-memory webhook event ID tracking | `stripe-webhooks/index.ts:47-50` | Documented limitation; Stripe signature verification is primary protection |
| No application-level rate limiting | `stripe-billing/index.ts` | Stripe has own rate limits; endpoint requires admin auth |

### Database

| Pattern | Location | Why It's OK |
|---------|----------|-------------|
| `SECURITY DEFINER` functions | Various migrations | Required for RLS bypass in specific functions |
| Duplicate column definitions | Later migrations | `ADD COLUMN IF NOT EXISTS` handles this |

---

## Pending Investigation

Issues flagged but not yet fully investigated.

| Issue | Reported | Status | Notes |
|-------|----------|--------|-------|
| (None currently) | | | |

---

## How to Add Entries

### For Fixed Issues
```markdown
| Brief description | `filename_or_migration.sql` | YYYY-MM-DD | What was wrong and how it was fixed |
```

### For False Positives
```markdown
| Pattern that looks wrong | Where it appears | Why it's actually fine |
```

---

## Review History

| Date | Reviewer | Outcome |
|------|----------|---------|
| 2025-12-10 | Claude | Full review - 1729 tests pass, build passes, documented all findings |
| 2025-12-10 | Claude | Code review audit - Fixed 1 real issue (hardcoded localStorage), verified 3 as false positives |

---

*This file prevents the "infinite review loop" where the same issues get flagged repeatedly across sessions.*
