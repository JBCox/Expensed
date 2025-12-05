# Jensify Code Quality & Foundation Check Scripts

## Overview

These scripts perform comprehensive code quality checks on the Jensify expense management application, including:

1. **TypeScript Compilation Check** - Verifies no compilation errors
2. **Unit Tests Execution** - Runs all tests and checks code coverage (target: 70%+)
3. **Linting Check** - Checks code style and best practices
4. **Dependency Audit** - Scans for security vulnerabilities
5. **Bundle Size Analysis** - Reports production build size

## Available Scripts

### Option 1: Batch File (Windows CMD)
```bash
cd c:\Jensify\expense-app
run-quality-checks.bat
```

**Pros:**
- Simple, no permissions needed
- Works on all Windows systems
- Easy to double-click and run

**Cons:**
- Less detailed output
- Basic error handling

### Option 2: PowerShell Script (Recommended)
```powershell
cd c:\Jensify\expense-app
.\run-quality-checks.ps1
```

**Pros:**
- Detailed, color-coded output
- Better error handling
- JSON parsing for test results
- Comprehensive summary report

**Cons:**
- May require execution policy change (see below)

## First-Time Setup

### PowerShell Execution Policy

If you get an error about script execution being disabled, run this **once** as Administrator:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then you can run the script normally.

## Output Reports

All scripts generate reports in the `quality-reports/` folder:

```
quality-reports/
├── build-output-{timestamp}.txt      # TypeScript compilation output
├── build-errors-{timestamp}.txt      # Compilation errors
├── test-output-{timestamp}.txt       # Unit test results
├── test-errors-{timestamp}.txt       # Test errors
├── lint-output-{timestamp}.txt       # Linting results
├── audit-output-{timestamp}.txt      # Dependency audit
├── bundle-size-{timestamp}.txt       # Bundle size breakdown
└── summary-{timestamp}.txt           # Overall summary (PowerShell only)
```

## Interpreting Results

### Success Criteria

| Check | Success Condition | Critical? |
|-------|------------------|-----------|
| TypeScript Compilation | No compilation errors | ✅ Yes |
| Unit Tests | All tests pass | ✅ Yes |
| Code Coverage | ≥70% coverage | ✅ Yes |
| Linting | No errors (warnings OK) | ⚠️ Minor |
| Dependency Audit | No critical/high vulnerabilities | ⚠️ Minor |
| Bundle Size | <10MB | ⚠️ Minor |

### Exit Codes (PowerShell)

- `0` - All critical checks passed
- `1` - One or more critical checks failed

## Common Issues & Solutions

### Issue: "ng: command not found"

**Solution:**
```bash
npm install -g @angular/cli
```

### Issue: Tests fail due to Chrome not found

**Solution:**
```bash
# Install ChromeHeadless
npm install --save-dev karma-chrome-launcher
```

Or edit `karma.conf.js` to use a different browser.

### Issue: Build fails with memory errors

**Solution:**
```bash
# Increase Node memory
set NODE_OPTIONS=--max_old_space_size=4096
.\run-quality-checks.ps1
```

### Issue: Linting errors

**Solution:**
```bash
# Auto-fix common issues
ng lint --fix
```

## CI/CD Integration

To integrate into a CI/CD pipeline (GitHub Actions, Jenkins, etc.):

```yaml
# .github/workflows/quality-check.yml
name: Quality Check
on: [push, pull_request]

jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      - run: npm ci
      - run: cd expense-app && pwsh -File run-quality-checks.ps1
```

## Manual Checks (Without Scripts)

If you prefer to run checks manually:

```bash
# 1. Build check
ng build --configuration production

# 2. Test check
npm test -- --no-watch --code-coverage --browsers=ChromeHeadless

# 3. Lint check
ng lint

# 4. Audit check
npm audit

# 5. Bundle size check (after build)
dir dist /s
```

## Pre-Deployment Checklist

Before deploying to staging/production, verify:

- [ ] All tests passing (`✅ PASS`)
- [ ] Code coverage ≥ 70%
- [ ] No TypeScript errors
- [ ] No critical security vulnerabilities
- [ ] Bundle size reasonable (<10MB)
- [ ] No console.log or debugging code
- [ ] Environment variables configured
- [ ] Database migrations applied

## Troubleshooting

### Script hangs or freezes

**Cause:** Interactive prompts or watch mode enabled

**Solution:**
- Ensure `--no-watch` is used for tests
- Kill any running `ng serve` or `npm test` processes
- Check for browser dialogs (Chrome password save, etc.)

### False failures

**Cause:** Flaky tests, network timeouts, race conditions

**Solution:**
1. Re-run the script to confirm
2. Review specific test output in `quality-reports/test-output-*.txt`
3. Fix flaky tests using proper async handling

### Reports not generated

**Cause:** Permission issues, disk full, or path problems

**Solution:**
- Check write permissions on `quality-reports/` folder
- Ensure sufficient disk space
- Verify you're in the correct directory (`c:\Jensify\expense-app`)

## Contact

For issues or questions about these quality check scripts:

**Project Owner:** Josh (Corvaer Manufacturing)
**Repository:** https://github.com/JBCox/Jensify

---

*Last Updated: 2025-12-04*
*Version: 1.0.0*
