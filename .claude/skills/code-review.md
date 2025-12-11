# Systematic Code Review Skill

## Purpose

Perform thorough, non-repetitive code reviews that avoid re-investigating already-verified issues. Uses actual tooling (build, lint, tests) rather than pattern-matching grep searches that generate false positives.

## When to Use

- When user asks to "review the codebase for errors"
- When user asks to "check for issues" or "find bugs"
- Before major deployments
- After significant refactoring

## When NOT to Use

- For E2E testing (use `comprehensive-e2e-testing` skill instead)
- For verifying a specific fix works (use `superpowers:verification-before-completion`)

---

# CRITICAL: AVOID FALSE POSITIVES

```
╔══════════════════════════════════════════════════════════════╗
║  PATTERN MATCHING IS NOT CODE REVIEW                         ║
║                                                              ║
║  Grepping for "console.log" finds documentation examples     ║
║  Grepping for "(window as any)" may find already-fixed code  ║
║  Grepping for "TODO" finds intentional future work markers   ║
║                                                              ║
║  USE ACTUAL TOOLING:                                         ║
║  - Build errors = real issues                                ║
║  - Test failures = real issues                               ║
║  - Lint errors = real issues                                 ║
║  - Pattern matches = MAYBE issues (verify first!)            ║
╚══════════════════════════════════════════════════════════════╝
```

---

# MANDATORY: CHECK KNOWN ISSUES FIRST

Before reporting ANY issue, you MUST:

1. Read `docs/KNOWN_VERIFIED_ISSUES.md`
2. Check if the issue is already listed as VERIFIED/FIXED
3. If listed, DO NOT report it again
4. If NOT listed, verify it's a real issue before reporting

---

# CODE REVIEW PROCESS

## Phase 1: Run Actual Tooling (REQUIRED)

These are the ONLY reliable sources of truth:

```bash
# 1. Build - catches compilation errors, type errors, missing imports
npm run build -- --configuration=production

# 2. Tests - catches logic errors, regressions
npm test -- --no-watch --browsers=ChromeHeadless

# 3. Lint (if configured) - catches style issues, unused vars
npm run lint
```

**If all three pass, the codebase is in good shape.** Do not invent problems.

## Phase 2: Verify Pattern Matches (OPTIONAL)

Only if Phase 1 reveals issues OR user specifically requests deeper review:

```
For each pattern match:
1. Read the ACTUAL file and surrounding context
2. Determine if it's:
   - In a comment/docstring (NOT an issue)
   - Already fixed by a migration (check migrations folder)
   - Intentional (e.g., error handlers using console.error)
   - Actually a problem (then report it)
```

## Phase 3: Update Known Issues

After verifying any issue:
- Add it to `docs/KNOWN_VERIFIED_ISSUES.md` with status
- Include the fix location if fixed
- Never investigate the same issue twice

---

# ISSUE CLASSIFICATION

## Real Issues (Report These)

| Category | How to Find | Example |
|----------|-------------|---------|
| Build errors | `npm run build` fails | Missing import |
| Test failures | `npm test` shows failures | Broken logic |
| Type errors | TypeScript compilation | Wrong parameter type |
| Security vulnerabilities | Audit tools, manual review | SQL injection, XSS |

## False Positives (Do NOT Report)

| Pattern | Why It's False | Reality |
|---------|----------------|---------|
| `console.log` in JSDoc | Documentation example | Not executed code |
| `console.error` in catch | Proper error handling | Intentional |
| `// TODO:` comments | Future work marker | Not a bug |
| Issue in old migration | May be fixed in later migration | Check all migrations |
| Unused import warning | May be used in template | Check HTML files |

### Angular-Specific False Positives

| Pattern | Why It's False | Verification |
|---------|----------------|--------------|
| "Memory leak in root service" | Root services DO call `ngOnDestroy` | Check for `providedIn: 'root'` + `implements OnDestroy` |
| "takeUntil not cleaned up" | Pattern is correct if `destroy$.complete()` in ngOnDestroy | Read the full service file |
| "Subscription not unsubscribed" | `takeUntil(destroy$)` handles this | Check for destroy$ Subject |

### Supabase-Specific False Positives

| Pattern | Why It's False | Verification |
|---------|----------------|--------------|
| "Manual localStorage removal needed" | Supabase SDK clears its own `sb-*` tokens on signOut | Read Supabase docs |
| "Auth token not cleared" | `signOut()` handles this automatically | Don't add redundant cleanup |

### Edge Function Known Limitations (Documented, Not Bugs)

| Pattern | Why It's Acceptable | Location |
|---------|---------------------|----------|
| "In-memory webhook dedup" | Acknowledged in code; Stripe signature is primary protection | stripe-webhooks/index.ts:47 |
| "No rate limiting" | Stripe/Supabase have their own; admin auth required | stripe-billing/index.ts |

---

# REPORT FORMAT

```markdown
## Code Review Report - [DATE]

### Summary
- Build: PASS/FAIL
- Tests: X/Y passing
- Lint: PASS/FAIL (or N/A)

### Real Issues Found
| # | File:Line | Issue | Severity | Fix |
|---|-----------|-------|----------|-----|
| 1 | src/x.ts:42 | Description | HIGH/MED/LOW | How to fix |

### Already Verified (from KNOWN_VERIFIED_ISSUES.md)
- Issue X: Fixed in migration Y
- Issue Z: Not actually an issue because...

### No Action Needed
- Pattern X found but is intentional (reason)
- Pattern Y is in documentation, not code
```

---

# ANTI-PATTERNS TO AVOID

## The Grep Storm
```
❌ WRONG:
"Let me search for all console.log..."
"Found 47 console.log statements!"
"Let me search for all TODO..."
"Found 23 TODOs!"

✅ RIGHT:
"Build passes, tests pass. Checking known issues..."
"All previously identified issues are resolved."
```

## The Migration Blindness
```
❌ WRONG:
"Storage RLS policy allows cross-org access!" (ignores fix migration)

✅ RIGHT:
"Storage RLS was flagged, but migration 20251121120000 fixes this."
```

## The Infinite Review Loop
```
❌ WRONG:
Session 1: "Found issue X" → Fixed
Session 2: "Found issue X" → Already fixed!
Session 3: "Found issue X" → Still already fixed!

✅ RIGHT:
Session 1: "Found issue X" → Fixed → Added to KNOWN_VERIFIED_ISSUES.md
Session 2: "Checked KNOWN_VERIFIED_ISSUES.md - issue X already resolved"
```

---

# QUICK REFERENCE

## Commands to Run
```bash
cd expense-app
npm run build -- --configuration=production  # Must pass
npm test -- --no-watch --browsers=ChromeHeadless  # Must pass
```

## Files to Check
- `docs/KNOWN_VERIFIED_ISSUES.md` - Already verified issues
- `supabase/migrations/` - Database fixes
- `CLAUDE.md` - Project standards

## Severity Levels
- **CRITICAL**: Security vulnerability, data loss risk
- **HIGH**: Feature broken, major UX issue
- **MEDIUM**: Minor bug, edge case failure
- **LOW**: Code style, optimization opportunity

---

*Skill Version: 1.0*
*Created: December 10, 2025*
