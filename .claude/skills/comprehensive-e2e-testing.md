# Production-Ready E2E Testing Skill

## Purpose
Complete autonomous browser-based E2E testing with **zero tolerance for skipped tests**. Every action is explicitly numbered, every form is submitted, every role is tested. This skill physically clicks through the UI like a real human user.

Includes advanced capabilities:
- **Visual Regression Testing** - Baseline comparisons and visual diffs
- **Accessibility Testing** - WCAG 2.1 AA compliance checks
- **Performance Testing** - Core Web Vitals measurement
- **Responsive Testing** - Multiple viewport validation
- **Self-Healing Selectors** - Multi-locator fallback strategy

## When to Use
- Before ANY production deployment
- After major feature implementations
- When validating approval workflow changes
- For complete regression testing
- Visual regression after UI changes
- Accessibility compliance audits
- Performance validation

---

# ⚠️ AUTONOMOUS MODE - READ THIS FIRST ⚠️

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   THIS IS A FULLY AUTONOMOUS TEST SUITE                        │
│                                                                 │
│   ✓ Run ALL 14 sections in ONE continuous execution            │
│   ✓ Fix errors inline and continue                             │
│   ✓ Log failures but keep going                                │
│   ✓ Only stop if app is completely broken                      │
│                                                                 │
│   ✗ DO NOT ask user questions between sections                 │
│   ✗ DO NOT pause for confirmation                              │
│   ✗ DO NOT say "should I continue?"                            │
│   ✗ DO NOT end response until final report is complete         │
│                                                                 │
│   Think of yourself as a QA automation script that runs        │
│   overnight - it doesn't wake up the developer to ask          │
│   permission to run the next test.                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

ANTI-PATTERNS TO AVOID:
1. "Section 1 complete. Would you like me to continue?" ❌ WRONG
2. "I found an issue. Should I fix it?" ❌ WRONG - just fix it
3. "Testing is 50% done." (then stopping) ❌ WRONG - keep going
4. Ending your response before section 14 is done ❌ WRONG

CORRECT PATTERN:
"✓ Section 1 complete → Starting Section 2..."
"✓ Section 2 complete → Starting Section 3..."
... (continue until)
"✓ Section 14 complete → Generating Final Report..."
"=== FINAL COVERAGE REPORT ==="
(THEN you're done)
```

---

# CRITICAL: AUTONOMOUS UNINTERRUPTED EXECUTION

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║    🤖 FULLY AUTONOMOUS MODE - NO HUMAN INTERACTION 🤖        ║
║                                                              ║
║    This test suite simulates a HUMAN clicking through        ║
║    the application. It MUST run start-to-finish without      ║
║    ANY pauses, questions, or confirmations.                  ║
║                                                              ║
║    CONTINUE THROUGH ALL 14 SECTIONS AUTOMATICALLY            ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

EXECUTION MODE: CONTINUOUS STREAMING

The ONLY time execution should stop:
1. A BLOCKING BUG that crashes the app or prevents any further testing
2. ALL 14 sections are complete and final report is generated

NEVER STOP FOR:
❌ "Section complete" - START NEXT SECTION IMMEDIATELY
❌ "Should I continue?" - NEVER ASK THIS
❌ "Want me to proceed?" - NEVER ASK THIS
❌ "Testing partially done" - KEEP GOING
❌ "Found an issue" - FIX IT AND CONTINUE (unless app crashes)
❌ "Waiting for confirmation" - NEVER WAIT
❌ End of a turn/response - CONTINUE IN SAME RESPONSE

SELF-RECOVERY PROTOCOL:
- If a test fails → Log it, try to fix code, retest, continue
- If element not found → Try fallback selectors, continue
- If login fails → Retry once, then log and continue with next role
- If page doesn't load → Refresh and retry once, then log and continue
- If screenshot fails → Log and continue testing

PROGRESS REPORTING:
- DO update TodoWrite status as you go (silent tracking)
- DO NOT output progress updates asking for feedback
- DO NOT pause after completing a section
- DO output brief inline status: "✓ Section 1 complete" then IMMEDIATELY continue

BATCH YOUR WORK:
- Complete multiple sections per response when possible
- Chain actions together without pausing
- Only pause if hitting actual technical limitations
```

---

# CRITICAL: BROWSER-BASED TESTING ONLY

ALL testing MUST be done via Chrome DevTools MCP (real browser automation).

This means OPENING A REAL BROWSER WINDOW and interacting with it exactly like a human would.

### REQUIRED TOOLS:
- `mcp__chrome-devtools__navigate_page` - Go to URLs
- `mcp__chrome-devtools__fill` - TYPE text into input fields
- `mcp__chrome-devtools__click` - CLICK buttons/links
- `mcp__chrome-devtools__take_snapshot` - Read page content (REQUIRED after every action)
- `mcp__chrome-devtools__take_screenshot` - Capture visual state
- `mcp__chrome-devtools__list_console_messages` - Check for errors
- `mcp__chrome-devtools__resize_page` - Test responsive viewports
- `mcp__chrome-devtools__performance_start_trace` - Measure performance
- `mcp__chrome-devtools__performance_stop_trace` - Get performance results
- `mcp__chrome-devtools__handle_dialog` - DISMISS browser popups (CRITICAL!)

---

## CRITICAL: BROWSER DIALOG HANDLING (ROOT CAUSE OF TEST FAILURES)

**Chrome shows popups that BLOCK automation and cause tests to silently fail:**
- **"Save password?" prompts** - Most common blocker after login
- **"Password was found in a data breach" warnings** - Blocks interaction until dismissed
- **"Update Chrome" notifications**
- **Permission requests** (notifications, location, microphone)

### WHY THIS MATTERS

When a browser dialog appears:
1. The page LOOKS normal in snapshots
2. But ALL clicks and fills SILENTLY FAIL
3. Tests appear to "complete" but nothing actually happened
4. You think you tested everything but you tested NOTHING

### MANDATORY: After EVERY Login Click

**IMMEDIATELY after clicking the Sign In button, do this EVERY TIME:**

```
Step 1: handle_dialog({ action: 'dismiss' })
        → This dismisses "Save password?" or "Password leaked" warnings

Step 2: take_snapshot()
        → Check: Did we reach the dashboard?

Step 3: If still on login page OR blocked:
        → handle_dialog({ action: 'accept' })
        → take_snapshot() again

Step 4: If STILL blocked:
        → STOP and report: "Browser dialog blocking automation - requires human intervention"
```

### Dialog Handling Quick Reference

```typescript
// Dismiss without action (most common - use for password prompts)
mcp__chrome-devtools__handle_dialog({ action: 'dismiss' })

// Accept/confirm (use if dismiss doesn't work)
mcp__chrome-devtools__handle_dialog({ action: 'accept' })
```

### Signs That a Dialog is Blocking You

1. Snapshot shows correct page but clicks don't work
2. `fill` commands complete but values don't appear
3. Navigation seems stuck on same page
4. Console shows no errors but nothing happens

**When in doubt: call `handle_dialog({ action: 'dismiss' })` and retry the action.**

## FOOLPROOF ACTION PATTERN (USE FOR EVERY INTERACTION)

**The MCP tools return "success" even when dialogs block them. You MUST verify every action worked.**

### The Defensive Action Pattern

```
╔══════════════════════════════════════════════════════════════╗
║  BEFORE EVERY CLICK/FILL:                                    ║
║    1. handle_dialog({ action: 'dismiss' })  ← Clear lurking  ║
║                                                               ║
║  DO THE ACTION:                                               ║
║    2. click() or fill()                                       ║
║                                                               ║
║  AFTER EVERY CLICK/FILL:                                      ║
║    3. handle_dialog({ action: 'dismiss' })  ← Clear triggered ║
║    4. take_snapshot()                        ← Verify it worked║
║    5. PROVE the action had effect (see below)                 ║
╚══════════════════════════════════════════════════════════════╝
```

### How to PROVE an Action Worked

**For `fill` actions - verify the value is in the field:**
```typescript
// Fill email
fill({ uid: 'email_field', value: 'test@example.com' })
handle_dialog({ action: 'dismiss' })
take_snapshot()

// PROOF: The snapshot MUST show "test@example.com" in the field
// If it shows empty or the old value → THE FILL FAILED (dialog blocked it)
```

**For `click` on submit buttons - verify state changed:**
```typescript
// Click Sign In
click({ uid: 'submit_button' })
handle_dialog({ action: 'dismiss' })
handle_dialog({ action: 'dismiss' })  // Double-tap for queued dialogs
take_snapshot()

// PROOF: The snapshot MUST show dashboard (not login page)
// If still on login page → THE CLICK FAILED (dialog blocked it)
```

**For navigation clicks - verify URL/page changed:**
```typescript
// Click Expenses in sidebar
click({ uid: 'nav_expenses' })
handle_dialog({ action: 'dismiss' })
take_snapshot()

// PROOF: The snapshot MUST show expenses list
// If still on previous page → THE CLICK FAILED
```

### State Verification via JavaScript (When Snapshots Aren't Enough)

```typescript
// After filling a form field, verify it actually has the value:
evaluate_script({
  function: `() => {
    const input = document.querySelector('input[type="email"]');
    return input ? input.value : 'ELEMENT_NOT_FOUND';
  }`
})
// If returned value !== expected value → FILL FAILED

// After clicking, verify something changed:
evaluate_script({
  function: `() => document.querySelector('.dashboard') !== null`
})
// If returns false → NAVIGATION FAILED
```

### Retry Pattern When Action Fails

```
IF action appears to have failed:
  1. handle_dialog({ action: 'dismiss' })
  2. handle_dialog({ action: 'accept' })  ← Try accept if dismiss didn't work
  3. Retry the action
  4. handle_dialog({ action: 'dismiss' })
  5. take_snapshot()
  6. If STILL failed → STOP and report "Dialog blocking automation"
```

---

## CONSOLE ERROR MONITORING

**Check for errors after every significant action:**

```typescript
// After login, form submit, or navigation:
list_console_messages({ types: ['error'] })

// If errors found:
//   - Log them in the test report
//   - Determine if they're blocking (network errors, auth errors)
//   - If blocking, STOP and investigate
//   - If non-blocking (warnings), note and continue
```

### Common Console Errors That Indicate Problems

| Error Pattern | Likely Cause | Action |
|---------------|--------------|--------|
| `401 Unauthorized` | Login failed silently | Dialog may have blocked login |
| `CORS error` | API call failed | Check if on correct page |
| `null is not an object` | Page didn't load properly | Navigation may have failed |
| `Network error` | Backend issue | May need to retry |

---

## WAIT-FOR-NAVIGATION PATTERN

**Don't assume page loaded - verify it:**

```typescript
// After clicking a link/button that navigates:
click({ uid: 'nav_link' })
handle_dialog({ action: 'dismiss' })

// WAIT for expected content:
wait_for({ text: 'Expected Page Title', timeout: 10000 })

// THEN take snapshot to verify:
take_snapshot()

// If wait_for times out → navigation failed
```

---

## COMPLETE LOGIN SEQUENCE (FOOLPROOF VERSION)

```typescript
// Step 1: Navigate to login
navigate_page({ type: 'url', url: 'http://localhost:4200/auth/login' })
handle_dialog({ action: 'dismiss' })
take_snapshot()
// VERIFY: See login form

// Step 2: Fill email
handle_dialog({ action: 'dismiss' })  // Pre-emptive clear
fill({ uid: 'email_field', value: 'testemployee@e2etest.com' })
handle_dialog({ action: 'dismiss' })  // Post-action clear
take_snapshot()
// VERIFY: Email appears in field (not empty!)

// Step 3: Fill password
handle_dialog({ action: 'dismiss' })
fill({ uid: 'password_field', value: 'password' })
handle_dialog({ action: 'dismiss' })
take_snapshot()
// VERIFY: Password field shows dots (filled)

// Step 4: Click submit
handle_dialog({ action: 'dismiss' })
click({ uid: 'submit_button' })
handle_dialog({ action: 'dismiss' })
handle_dialog({ action: 'dismiss' })  // Double-tap!
take_snapshot()

// Step 5: Verify login succeeded
wait_for({ text: 'Dashboard', timeout: 10000 })
take_snapshot()
// VERIFY: Dashboard content visible, NOT login page

// Step 6: Final dialog clear (catch password save prompts)
handle_dialog({ action: 'dismiss' })
handle_dialog({ action: 'dismiss' })

// Step 7: Confirm with snapshot
take_snapshot()
// VERIFY: Still on dashboard, not redirected back to login
```

---

## RED FLAGS: Signs of Silent Failure

**STOP and investigate if you see ANY of these:**

| Red Flag | What It Means |
|----------|---------------|
| Fill completed but snapshot shows empty field | Dialog blocked the fill |
| Click completed but page didn't change | Dialog blocked the click |
| Login "succeeded" but no user name in header | Login was blocked |
| Form submitted but no success message | Submit was blocked |
| Navigation clicked but same page showing | Click was intercepted |
| Values reverted after action | Page reloaded/dialog interfered |

**When you see a red flag:**
1. Call `handle_dialog({ action: 'dismiss' })`
2. Call `handle_dialog({ action: 'accept' })`
3. Take screenshot (might show dialog!)
4. Retry the action
5. If still failing → **STOP TESTS** and report the issue

---

## NEVER MARK A TEST AS PASSED WITHOUT PROOF

```
╔════════════════════════════════════════════════════════════════╗
║                    PROOF REQUIREMENTS                          ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  ❌ WRONG: "Filled email field" (no proof)                     ║
║  ✅ RIGHT: "Filled email - snapshot shows 'test@example.com'"  ║
║                                                                ║
║  ❌ WRONG: "Clicked submit, login successful"                  ║
║  ✅ RIGHT: "Clicked submit - snapshot shows 'Welcome, Josh'"   ║
║                                                                ║
║  ❌ WRONG: "Navigation worked"                                 ║
║  ✅ RIGHT: "Clicked Expenses - snapshot shows expense list"    ║
║                                                                ║
║  If you cannot state WHAT you saw in the snapshot,             ║
║  the action did NOT succeed.                                   ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

---

## FAILURE MODES TO WATCH FOR

### 1. The "Ghost Click" - Click returns success but nothing happens
**Cause:** Dialog intercepting input
**Detection:** Snapshot shows same page state
**Fix:** `handle_dialog({ action: 'dismiss' })` then retry

### 2. The "Empty Fill" - Fill returns success but field is empty
**Cause:** Dialog intercepting input OR wrong element selected
**Detection:** Snapshot shows empty field
**Fix:** Clear dialogs, verify uid, retry

### 3. The "Phantom Login" - Login appears to work but user not authenticated
**Cause:** Password dialog blocked actual form submission
**Detection:** No user name in header, auth guard redirects back
**Fix:** Clear ALL dialogs after login, verify user-specific content

### 4. The "Premature Pass" - Test marked passed without verification
**Cause:** Assuming "no error = success"
**Detection:** Review shows no snapshot proof
**Fix:** ALWAYS require snapshot evidence of expected state

---
---

### ABSOLUTELY FORBIDDEN:
- Direct API calls to create/modify data
- SQL INSERT/UPDATE to create test records
- JavaScript injection to trigger form submissions
- Any method that bypasses clicking the actual UI
- Claiming an action was done without snapshot proof
- Grouping multiple actions into one claim
- Saying 'same as before' or 'similar pattern'

**SQL is ONLY allowed for VERIFICATION after UI actions complete successfully.**

**NO WORKAROUNDS. NO SHORTCUTS. NO ASSUMPTIONS.**

---

# MANDATORY RULES (VIOLATION = TEST FAILURE)

```
RULE 1: NEVER SKIP A STEP
Every numbered step MUST be executed in order.
If a step cannot be executed, STOP and investigate.
DO NOT proceed to the next step until the current step passes.

RULE 2: TRIPLE VERIFICATION
After EVERY significant action, verify:
  1. VISUAL: Take screenshot
  2. DATABASE: Run SQL query to confirm data saved
  3. CONSOLE: Check for errors (mcp__chrome-devtools__list_console_messages)

RULE 3: FIX BEFORE CONTINUE
If ANY verification fails:
  1. STOP testing immediately
  2. Diagnose the issue (check console, network, source code)
  3. FIX the code
  4. RETEST from the beginning of the current suite
  5. Only continue when all 3 verifications pass

RULE 4: COMPLETE FORM SUBMISSION
Opening a form is NOT enough. Every form MUST be:
  - Filled completely (ALL fields, required AND optional)
  - SUBMITTED (click the submit button)
  - VERIFIED saved (check database, check list/table)

RULE 5: ALL ROLES TESTED
Every workflow MUST be tested for EVERY applicable role.
Do NOT test only as admin. Test as Employee, Manager, Finance, AND Admin.

RULE 6: NEVER STOP BETWEEN SECTIONS (CRITICAL!)
After completing a section, IMMEDIATELY start the next section IN THE SAME RESPONSE.
DO NOT end your response between sections.
DO NOT ask any questions.
DO NOT output status and wait.
The only acceptable stopping point is after generating the Final Coverage Report.

RULE 7: ONE ACTION AT A TIME
Never group multiple actions.
Each click, each type, each navigation is separate.
Take snapshot after EACH action.

RULE 8: EXPLICIT VERIFICATION
State exactly what text/element you found.
Do not say 'page loaded' - say what specific content you saw.

RULE 9: SELF-HEAL BEFORE FAIL
If a selector fails, try fallback strategies before failing.
Use multi-locator approach (see Self-Healing section).

RULE 10: ACCESSIBILITY ALWAYS
Check accessibility on EVERY page visited.
Log violations but continue testing unless critical.

RULE 11: ERRORS DON'T STOP EXECUTION
If you encounter an error:
  1. Log it in your internal tracking
  2. Attempt one retry with fallback selectors
  3. If still failing, mark test as FAILED in report
  4. CONTINUE to the next test
  5. Include all failures in Final Coverage Report
NEVER stop execution because of a single test failure.
The goal is to run ALL tests and report what passed/failed.
```

---

# PROOF REQUIREMENTS

After EVERY action you MUST:
1. Call `take_snapshot` to capture the page state
2. Report what you see in the snapshot (specific text/elements)
3. Confirm the expected result occurred
4. Check `list_console_messages` for errors

**If you cannot provide snapshot proof, the action is NOT complete.**

---

# PREREQUISITES

Before starting ANY test, complete this preflight checklist:

## Preflight Checklist
```
[ ] 1. Dev server running at http://localhost:4200
    Command: cd expense-app && npm start

[ ] 2. Chrome launched with DevTools debugging enabled
    Command: C:\Jensify\launch-chrome-dev.bat

[ ] 3. Screenshot directory exists and is EMPTY
    Command: rm -rf C:/Jensify/test-screenshots/* && mkdir -p C:/Jensify/test-screenshots

[ ] 4. Test accounts exist in database (verify with SQL query)

[ ] 5. Navigate to http://localhost:4200 and take initial screenshot
```

## Test Accounts

| Email | Password | Role |
|-------|----------|------|
| testadmin@e2etest.com | Xp3ns3d@Adm1n#2025! | Admin |
| testfinance@e2etest.com | Xp3ns3d@F1n4nc3#2025! | Finance |
| testmanager@e2etest.com | Xp3ns3d@M4n4g3r#2025! | Manager |
| testemployee@e2etest.com | Xp3ns3d@3mpl0y33#2025! | Employee |

---

# TODOWRITE REQUIREMENT (SILENT TRACKING)

Create this TodoWrite at start, then update silently as you work:

```typescript
TodoWrite([
  { content: "Section 1: Auth - Login/Logout all 4 roles", status: "pending", activeForm: "Testing authentication" },
  { content: "Section 2: Navigation - All sidebar items per role", status: "pending", activeForm: "Testing navigation" },
  { content: "Section 3: Expense CRUD workflow", status: "pending", activeForm: "Testing expenses" },
  { content: "Section 4: Receipt management", status: "pending", activeForm: "Testing receipts" },
  { content: "Section 5: Report workflow", status: "pending", activeForm: "Testing reports" },
  { content: "Section 6: Approval workflow (approve + reject)", status: "pending", activeForm: "Testing approvals" },
  { content: "Section 7: Finance workflow (mark paid)", status: "pending", activeForm: "Testing finance" },
  { content: "Section 8: Admin settings (all 15+ pages)", status: "pending", activeForm: "Testing admin" },
  { content: "Section 9: Profile settings", status: "pending", activeForm: "Testing profile" },
  { content: "Section 10: Mileage workflow", status: "pending", activeForm: "Testing mileage" },
  { content: "Section 11: UI features (dark mode, sidebar)", status: "pending", activeForm: "Testing UI" },
  { content: "Section 12: Dialog verification", status: "pending", activeForm: "Testing dialogs" },
  { content: "Section 13: Responsive & Accessibility", status: "pending", activeForm: "Testing responsive/a11y" },
  { content: "Section 14: Performance & Visual Regression", status: "pending", activeForm: "Testing performance" },
  { content: "Generate Final Coverage Report", status: "pending", activeForm: "Generating report" }
])
```

## SILENT PROGRESS UPDATES (NO PAUSING)
- Update TodoWrite status as you work (the UI shows progress to user)
- DO NOT announce "Section complete, moving on..." with a pause
- Just update status and CONTINUE working
- Think of it like a progress bar - it updates silently while work continues

---

# SNAPSHOT REQUIREMENTS

## Minimum Snapshots Per Section
- Section 1 (Auth): 40 snapshots
- Section 2 (Navigation): 36 snapshots
- Section 3 (Expense): 30 snapshots
- Section 4 (Receipt): 5 snapshots
- Section 5 (Report): 12 snapshots
- Section 6 (Approval): 25 snapshots
- Section 7 (Finance): 8 snapshots
- Section 8 (Admin): 20 snapshots
- Section 9 (Profile): 6 snapshots
- Section 10 (Mileage): 10 snapshots
- Section 11 (UI): 12 snapshots
- Section 12 (Dialogs): 15 snapshots
- Section 13 (Responsive/A11y): 20 snapshots
- Section 14 (Performance/Visual): 10 snapshots
**TOTAL MINIMUM: 249 snapshots**

---

# MCP TOOLS REFERENCE

```typescript
// Navigation
mcp__chrome-devtools__navigate_page({ type: 'url', url: 'http://localhost:4200/path' })

// Screenshot (ALWAYS specify format)
mcp__chrome-devtools__take_screenshot({
  format: 'png',
  filePath: 'C:/Jensify/test-screenshots/XX_YY_role_action.png'
})

// Get element UIDs (REQUIRED after every action)
mcp__chrome-devtools__take_snapshot({ verbose: true })

// Click element
mcp__chrome-devtools__click({ uid: 'element_uid' })

// Fill single field
mcp__chrome-devtools__fill({ uid: 'input_uid', value: 'text value' })

// Fill multiple fields
mcp__chrome-devtools__fill_form({
  elements: [
    { uid: 'uid1', value: 'val1' },
    { uid: 'uid2', value: 'val2' }
  ]
})

// Wait for text
mcp__chrome-devtools__wait_for({ text: 'Expected Text', timeout: 10000 })

// Check console errors
mcp__chrome-devtools__list_console_messages({ types: ['error', 'warn'] })

// Database verification (SELECT only - no INSERT/UPDATE)
mcp__supabase__execute_sql({ query: 'SELECT * FROM table WHERE condition' })

// JavaScript fallback (when MCP clicks don't work)
mcp__chrome-devtools__evaluate_script({
  function: `() => {
    const btn = document.querySelector('button');
    if (btn) btn.click();
  }`
})

// Resize viewport for responsive testing
mcp__chrome-devtools__resize_page({ width: 375, height: 667 })

// Performance trace
mcp__chrome-devtools__performance_start_trace({ reload: true, autoStop: true })
mcp__chrome-devtools__performance_stop_trace()
```

---

# SELF-HEALING SELECTOR STRATEGY

When an element selector fails, try alternatives in this order:

```
Primary: uid from accessibility snapshot
    ↓ (if not found)
Fallback 1: CSS selector via evaluate_script
    ↓ (if not found)
Fallback 2: Text content match in snapshot
    ↓ (if not found)
Fallback 3: ARIA role + name
    ↓ (if not found)
Fallback 4: Position-based (last resort)
```

## Element Fingerprinting

For critical elements, store multiple identifiers:

```yaml
Element: Sign In Button
Fingerprint:
  primary_uid: "170_16"
  css_selector: "button[type='submit']"
  text_content: "Sign In"
  aria_role: "button"
  aria_name: "Sign In"
```

## Self-Healing Workflow

```yaml
When element not found:
  1. Log: "Primary selector failed: {selector}"
  2. Try each fallback in order
  3. If fallback succeeds:
     a. Log: "Healed using: {fallback_type}"
     b. Continue test execution
  4. If all fallbacks fail:
     a. Take diagnostic screenshot
     b. Capture page snapshot
     c. Flag for human review
     d. Skip test (don't fail entire suite)
```

---

# SECTION 1: AUTHENTICATION (40 snapshots minimum)

## 1.1 Employee Login
- [ ] 1.1.1: `navigate_page` to http://localhost:4200/auth/login
- [ ] 1.1.2: `take_snapshot` - MUST see 'Sign in' or 'Login' heading
- [ ] 1.1.3: `list_console_messages` - MUST have zero errors
- [ ] 1.1.4: `fill` email field with 'testemployee@e2etest.com'
- [ ] 1.1.5: `take_snapshot` - MUST see email value in field
- [ ] 1.1.6: `fill` password field with 'Xp3ns3d@3mpl0y33#2025!'
- [ ] 1.1.7: `take_snapshot` - MUST see password field filled (dots)
- [ ] 1.1.8: `click` 'Sign In' button
- [ ] 1.1.9: `take_snapshot` - MUST see 'Dashboard' or employee content
- [ ] 1.1.10: `take_screenshot` - save as '01_01_employee_dashboard.png'

## 1.2 Employee Logout
- [ ] 1.2.1: `take_snapshot` - Identify user menu element
- [ ] 1.2.2: `click` user menu
- [ ] 1.2.3: `take_snapshot` - MUST see dropdown with 'Sign Out' option
- [ ] 1.2.4: `click` 'Sign Out'
- [ ] 1.2.5: `take_snapshot` - MUST see login page

## 1.3 Manager Login
- [ ] 1.3.1: `navigate_page` to http://localhost:4200/auth/login
- [ ] 1.3.2: `take_snapshot` - MUST see login form
- [ ] 1.3.3: `fill` email field with 'testmanager@e2etest.com'
- [ ] 1.3.4: `take_snapshot` - MUST see email in field
- [ ] 1.3.5: `fill` password field with 'Xp3ns3d@M4n4g3r#2025!'
- [ ] 1.3.6: `take_snapshot` - MUST see password field filled
- [ ] 1.3.7: `click` 'Sign In' button
- [ ] 1.3.8: `take_snapshot` - MUST see dashboard or manager content
- [ ] 1.3.9: `take_screenshot` - save as '01_02_manager_dashboard.png'

## 1.4 Manager Logout
- [ ] 1.4.1: `click` user menu
- [ ] 1.4.2: `take_snapshot` - MUST see 'Sign Out'
- [ ] 1.4.3: `click` 'Sign Out'
- [ ] 1.4.4: `take_snapshot` - MUST see login page

## 1.5 Finance Login
- [ ] 1.5.1: `navigate_page` to http://localhost:4200/auth/login
- [ ] 1.5.2: `take_snapshot` - MUST see login form
- [ ] 1.5.3: `fill` email field with 'testfinance@e2etest.com'
- [ ] 1.5.4: `take_snapshot` - MUST see email in field
- [ ] 1.5.5: `fill` password field with 'Xp3ns3d@F1n4nc3#2025!'
- [ ] 1.5.6: `take_snapshot` - MUST see password field filled
- [ ] 1.5.7: `click` 'Sign In' button
- [ ] 1.5.8: `take_snapshot` - MUST see dashboard or finance content
- [ ] 1.5.9: `take_screenshot` - save as '01_03_finance_dashboard.png'

## 1.6 Finance Logout
- [ ] 1.6.1: `click` user menu
- [ ] 1.6.2: `take_snapshot` - MUST see 'Sign Out'
- [ ] 1.6.3: `click` 'Sign Out'
- [ ] 1.6.4: `take_snapshot` - MUST see login page

## 1.7 Admin Login
- [ ] 1.7.1: `navigate_page` to http://localhost:4200/auth/login
- [ ] 1.7.2: `take_snapshot` - MUST see login form
- [ ] 1.7.3: `fill` email field with 'testadmin@e2etest.com'
- [ ] 1.7.4: `take_snapshot` - MUST see email in field
- [ ] 1.7.5: `fill` password field with 'Xp3ns3d@Adm1n#2025!'
- [ ] 1.7.6: `take_snapshot` - MUST see password field filled
- [ ] 1.7.7: `click` 'Sign In' button
- [ ] 1.7.8: `take_snapshot` - MUST see admin dashboard content
- [ ] 1.7.9: `take_screenshot` - save as '01_04_admin_dashboard.png'

## 1.8 Admin Logout
- [ ] 1.8.1: `click` user menu
- [ ] 1.8.2: `take_snapshot` - MUST see 'Sign Out'
- [ ] 1.8.3: `click` 'Sign Out'
- [ ] 1.8.4: `take_snapshot` - MUST see login page

## 1.9 Password Reset Flow
- [ ] 1.9.1: `navigate_page` to http://localhost:4200/auth/login
- [ ] 1.9.2: `take_snapshot` - MUST see 'Forgot password' link
- [ ] 1.9.3: `click` 'Forgot password' link
- [ ] 1.9.4: `take_snapshot` - MUST see password reset form with email field
- [ ] 1.9.5: `fill` email field with 'testemployee@e2etest.com'
- [ ] 1.9.6: `take_snapshot` - MUST see email in field
- [ ] 1.9.7: `click` submit button
- [ ] 1.9.8: `take_snapshot` - MUST see success message about email sent

## 1.10 Invalid Login Test
- [ ] 1.10.1: `navigate_page` to http://localhost:4200/auth/login
- [ ] 1.10.2: `take_snapshot` - MUST see login form
- [ ] 1.10.3: `fill` email field with 'invalid@test.com'
- [ ] 1.10.4: `fill` password field with 'WrongPassword123!'
- [ ] 1.10.5: `click` 'Sign In' button
- [ ] 1.10.6: `take_snapshot` - MUST see error message 'Invalid email or password'
- [ ] 1.10.7: `take_screenshot` - save as '01_05_login_error.png'

**→ SECTION 2 (NO PAUSE)**

# SECTION 2: NAVIGATION (36 snapshots minimum)

## 2.1 Employee Navigation
- [ ] 2.1.1: Login as Employee (navigate, fill email, fill password, click sign in)
- [ ] 2.1.2: `take_snapshot` - Confirm 'testemployee' or employee email visible
- [ ] 2.1.3: `click` Dashboard in sidebar
- [ ] 2.1.4: `take_snapshot` - MUST see 'Dashboard' heading
- [ ] 2.1.5: `click` Receipts in sidebar
- [ ] 2.1.6: `take_snapshot` - MUST see receipts page content
- [ ] 2.1.7: `click` Expenses in sidebar
- [ ] 2.1.8: `take_snapshot` - MUST see expenses list or 'Add Expense' button
- [ ] 2.1.9: `click` Reports in sidebar
- [ ] 2.1.10: `take_snapshot` - MUST see reports list or 'Create Report' button
- [ ] 2.1.11: `click` Mileage in sidebar
- [ ] 2.1.12: `take_snapshot` - MUST see mileage page
- [ ] 2.1.13: `click` Profile in sidebar
- [ ] 2.1.14: `take_snapshot` - MUST see profile form with name/email
- [ ] 2.1.15: Logout

## 2.2 Manager Navigation
- [ ] 2.2.1: Login as Manager
- [ ] 2.2.2: `take_snapshot` - Confirm 'testmanager' visible
- [ ] 2.2.3: `click` Dashboard in sidebar
- [ ] 2.2.4: `take_snapshot` - MUST see dashboard content
- [ ] 2.2.5: `click` Approvals in sidebar
- [ ] 2.2.6: `take_snapshot` - MUST see approval queue
- [ ] 2.2.7: `click` Receipts in sidebar
- [ ] 2.2.8: `take_snapshot` - MUST see receipts page
- [ ] 2.2.9: `click` Expenses in sidebar
- [ ] 2.2.10: `take_snapshot` - MUST see expenses page
- [ ] 2.2.11: `click` Reports in sidebar
- [ ] 2.2.12: `take_snapshot` - MUST see reports page
- [ ] 2.2.13: `click` Mileage in sidebar
- [ ] 2.2.14: `take_snapshot` - MUST see mileage page
- [ ] 2.2.15: `click` Profile in sidebar
- [ ] 2.2.16: `take_snapshot` - MUST see profile form
- [ ] 2.2.17: Logout

## 2.3 Finance Navigation
- [ ] 2.3.1: Login as Finance
- [ ] 2.3.2: `take_snapshot` - Confirm 'testfinance' visible
- [ ] 2.3.3: `click` Dashboard in sidebar
- [ ] 2.3.4: `take_snapshot` - MUST see dashboard
- [ ] 2.3.5: `click` Approvals in sidebar
- [ ] 2.3.6: `take_snapshot` - MUST see approvals page
- [ ] 2.3.7: `click` Finance in sidebar
- [ ] 2.3.8: `take_snapshot` - MUST see finance dashboard with metrics
- [ ] 2.3.9: `click` Receipts in sidebar
- [ ] 2.3.10: `take_snapshot` - MUST see receipts page
- [ ] 2.3.11: `click` Expenses in sidebar
- [ ] 2.3.12: `take_snapshot` - MUST see expenses page
- [ ] 2.3.13: `click` Reports in sidebar
- [ ] 2.3.14: `take_snapshot` - MUST see reports page
- [ ] 2.3.15: `click` Mileage in sidebar
- [ ] 2.3.16: `take_snapshot` - MUST see mileage page
- [ ] 2.3.17: `click` Profile in sidebar
- [ ] 2.3.18: `take_snapshot` - MUST see profile form
- [ ] 2.3.19: Logout

## 2.4 Admin Navigation
- [ ] 2.4.1: Login as Admin
- [ ] 2.4.2: `take_snapshot` - Confirm 'testadmin' visible
- [ ] 2.4.3: `click` Dashboard in sidebar
- [ ] 2.4.4: `take_snapshot` - MUST see dashboard
- [ ] 2.4.5: `click` Approvals in sidebar
- [ ] 2.4.6: `take_snapshot` - MUST see approvals page
- [ ] 2.4.7: `click` Finance in sidebar
- [ ] 2.4.8: `take_snapshot` - MUST see finance page
- [ ] 2.4.9: `click` Admin in sidebar
- [ ] 2.4.10: `take_snapshot` - MUST see admin hub with settings cards
- [ ] 2.4.11: `click` Receipts in sidebar
- [ ] 2.4.12: `take_snapshot` - MUST see receipts page
- [ ] 2.4.13: `click` Expenses in sidebar
- [ ] 2.4.14: `take_snapshot` - MUST see expenses page
- [ ] 2.4.15: `click` Reports in sidebar
- [ ] 2.4.16: `take_snapshot` - MUST see reports page
- [ ] 2.4.17: `click` Mileage in sidebar
- [ ] 2.4.18: `take_snapshot` - MUST see mileage page
- [ ] 2.4.19: `click` Profile in sidebar
- [ ] 2.4.20: `take_snapshot` - MUST see profile form
- [ ] 2.4.21: Logout

**→ SECTION 3 (NO PAUSE)**

# SECTION 3: EXPENSE WORKFLOW (30 snapshots minimum)

## 3.1 Create Expense
- [ ] 3.1.1: Login as Employee
- [ ] 3.1.2: `take_snapshot` - Confirm logged in as employee
- [ ] 3.1.3: `click` Expenses in sidebar
- [ ] 3.1.4: `take_snapshot` - MUST see expense list page
- [ ] 3.1.5: `click` 'Add Expense' or 'New Expense' button
- [ ] 3.1.6: `take_snapshot` - MUST see expense form with Amount field
- [ ] 3.1.7: `fill` Amount field with '125.50'
- [ ] 3.1.8: `take_snapshot` - MUST see '125.50' in Amount field
- [ ] 3.1.9: `fill` Merchant field with 'E2E Test Gas Station'
- [ ] 3.1.10: `take_snapshot` - MUST see 'E2E Test Gas Station' in Merchant field
- [ ] 3.1.11: `click` Category dropdown
- [ ] 3.1.12: `take_snapshot` - MUST see category options list
- [ ] 3.1.13: `click` 'Fuel' or first category option
- [ ] 3.1.14: `take_snapshot` - MUST see selected category shown
- [ ] 3.1.15: `fill` or confirm Date field
- [ ] 3.1.16: `take_snapshot` - MUST see date value
- [ ] 3.1.17: `click` Save button
- [ ] 3.1.18: `take_snapshot` - MUST see success message OR expense detail
- [ ] 3.1.19: Navigate to expense list
- [ ] 3.1.20: `take_snapshot` - MUST see 'E2E Test Gas Station' and '125.50' in list

## 3.2 View Expense Detail
- [ ] 3.2.1: `click` on 'E2E Test Gas Station' row
- [ ] 3.2.2: `take_snapshot` - MUST see expense detail with Amount, Merchant, Status
- [ ] 3.2.3: `list_console_messages` - Check for errors

## 3.3 Edit Expense
- [ ] 3.3.1: `take_snapshot` - Find Edit button
- [ ] 3.3.2: `click` Edit button
- [ ] 3.3.3: `take_snapshot` - MUST see edit form with pre-filled values
- [ ] 3.3.4: Clear and `fill` Amount with '150.00'
- [ ] 3.3.5: `take_snapshot` - MUST see '150.00' in Amount field
- [ ] 3.3.6: Clear and `fill` Merchant with 'E2E Updated Merchant'
- [ ] 3.3.7: `take_snapshot` - MUST see 'E2E Updated Merchant' in field
- [ ] 3.3.8: `click` Save button
- [ ] 3.3.9: `take_snapshot` - MUST see success message
- [ ] 3.3.10: `take_snapshot` - MUST see updated values displayed

## 3.4 Delete Expense
- [ ] 3.4.1: Create NEW expense for deletion (click Add, fill all fields, save)
- [ ] 3.4.2: `take_snapshot` - Confirm new expense exists
- [ ] 3.4.3: Navigate to new expense detail
- [ ] 3.4.4: `take_snapshot` - Confirm on expense detail page
- [ ] 3.4.5: `click` Delete button
- [ ] 3.4.6: `take_snapshot` - MUST see confirmation dialog with warning
- [ ] 3.4.7: `click` Confirm/Delete in dialog
- [ ] 3.4.8: `take_snapshot` - MUST see success message
- [ ] 3.4.9: Navigate to expense list
- [ ] 3.4.10: `take_snapshot` - MUST NOT see deleted expense

**→ SECTION 4 (NO PAUSE)**

# SECTION 4: RECEIPT MANAGEMENT (5 snapshots minimum)

## 4.1 Receipt List
- [ ] 4.1.1: Login as Employee (if not already)
- [ ] 4.1.2: `click` Receipts in sidebar
- [ ] 4.1.3: `take_snapshot` - MUST see receipts page with upload area or list
- [ ] 4.1.4: `take_snapshot` - Identify upload button

## 4.2 Upload Receipt
- [ ] 4.2.1: `click` upload button or area
- [ ] 4.2.2: `take_snapshot` - Confirm upload UI visible
- [ ] 4.2.3: (Note: May need `upload_file` tool for actual file upload)
- [ ] 4.2.4: If upload completes, `take_snapshot` - MUST see receipt in list

**→ SECTION 5 (NO PAUSE)**

# SECTION 5: REPORT WORKFLOW (12 snapshots minimum)

## 5.1 View Report List
- [ ] 5.1.1: Login as Employee
- [ ] 5.1.2: `take_snapshot` - Confirm logged in
- [ ] 5.1.3: `click` Reports in sidebar
- [ ] 5.1.4: `take_snapshot` - MUST see reports page with 'Create Report' button

## 5.2 Create Report
- [ ] 5.2.1: `click` 'Create Report' button
- [ ] 5.2.2: `take_snapshot` - MUST see create report dialog/form
- [ ] 5.2.3: `fill` report name with 'E2E Test Report December'
- [ ] 5.2.4: `take_snapshot` - MUST see report name in field
- [ ] 5.2.5: `click` Create/Save button
- [ ] 5.2.6: `take_snapshot` - MUST see report created

## 5.3 Add Expense to Report
- [ ] 5.3.1: Navigate to report detail
- [ ] 5.3.2: `take_snapshot` - MUST see report detail page
- [ ] 5.3.3: `click` 'Add Expenses' button
- [ ] 5.3.4: `take_snapshot` - MUST see dialog with expenses and checkboxes
- [ ] 5.3.5: `click` checkbox for one expense
- [ ] 5.3.6: `take_snapshot` - MUST see checkbox checked
- [ ] 5.3.7: `click` 'Add Selected' button
- [ ] 5.3.8: `take_snapshot` - MUST see expense in report

## 5.4 Submit Report for Approval
- [ ] 5.4.1: `take_snapshot` - Confirm expense with receipt in report
- [ ] 5.4.2: `click` 'Submit for Approval' button
- [ ] 5.4.3: `take_snapshot` - MUST see dialog with Title, Message, Cancel, Submit buttons
- [ ] 5.4.4: `click` Submit button
- [ ] 5.4.5: `take_snapshot` - MUST see success message
- [ ] 5.4.6: `take_snapshot` - MUST see status 'Submitted' or 'Pending'

## 5.5 Verify Submitted Report
- [ ] 5.5.1: `click` Reports in sidebar
- [ ] 5.5.2: `take_snapshot` - MUST see report with 'Pending' status
- [ ] 5.5.3: `click` on submitted report
- [ ] 5.5.4: `take_snapshot` - MUST see 'Pending', Submit button NOT visible

**→ SECTION 6 (NO PAUSE)**

# SECTION 6: APPROVAL WORKFLOW (25 snapshots minimum)

## 6.1 Manager Views Approval Queue
- [ ] 6.1.1: Logout current user
- [ ] 6.1.2: `take_snapshot` - Confirm on login page
- [ ] 6.1.3: Login as Manager (fill email, fill password, click sign in)
- [ ] 6.1.4: `take_snapshot` - Confirm 'testmanager' visible
- [ ] 6.1.5: `click` Approvals in sidebar
- [ ] 6.1.6: `take_snapshot` - MUST see pending report in queue (or empty state)

## 6.2 Manager Reviews Report
- [ ] 6.2.1: `click` on pending report (if available)
- [ ] 6.2.2: `take_snapshot` - MUST see Review button or Approve/Reject buttons

## 6.3 Manager Approves Report
- [ ] 6.3.1: `click` 'Review' or 'Approve' button
- [ ] 6.3.2: `take_snapshot` - MUST see approval dialog with submitter, amount, comment field
- [ ] 6.3.3: `fill` comment field with 'E2E Test - Approved by Manager'
- [ ] 6.3.4: `take_snapshot` - MUST see comment in field
- [ ] 6.3.5: `click` Approve button in dialog
- [ ] 6.3.6: `take_snapshot` - MUST see success message
- [ ] 6.3.7: `take_snapshot` - MUST see status 'Approved' or removed from queue

## 6.4 Manager Rejection Flow (Separate Test)
- [ ] 6.4.1: Logout, Login as Employee
- [ ] 6.4.2: Create NEW expense (full flow: click Add, fill Amount, Merchant, Category, Save)
- [ ] 6.4.3: `take_snapshot` - Expense created
- [ ] 6.4.4: Create NEW report (click Create Report, fill name, Save)
- [ ] 6.4.5: `take_snapshot` - Report created
- [ ] 6.4.6: Add expense to report (click Add Expenses, check box, click Add)
- [ ] 6.4.7: `take_snapshot` - Expense added
- [ ] 6.4.8: Submit report (click Submit, confirm dialog)
- [ ] 6.4.9: `take_snapshot` - Report submitted
- [ ] 6.4.10: Logout, Login as Manager
- [ ] 6.4.11: `take_snapshot` - Logged in as manager
- [ ] 6.4.12: `click` Approvals
- [ ] 6.4.13: `take_snapshot` - MUST see new pending report
- [ ] 6.4.14: `click` on pending report
- [ ] 6.4.15: `take_snapshot` - MUST see report detail
- [ ] 6.4.16: `click` 'Reject' button
- [ ] 6.4.17: `take_snapshot` - MUST see rejection dialog with reason field (required)
- [ ] 6.4.18: `fill` reason with 'E2E Test - Missing receipt documentation'
- [ ] 6.4.19: `take_snapshot` - MUST see reason in field
- [ ] 6.4.20: `click` Reject button
- [ ] 6.4.21: `take_snapshot` - MUST see success message
- [ ] 6.4.22: `take_snapshot` - MUST see status 'Rejected'

## 6.5 Employee Sees Rejection
- [ ] 6.5.1: Logout, Login as Employee
- [ ] 6.5.2: `take_snapshot` - Logged in as employee
- [ ] 6.5.3: `click` Reports
- [ ] 6.5.4: `take_snapshot` - Find rejected report
- [ ] 6.5.5: `click` on rejected report
- [ ] 6.5.6: `take_snapshot` - MUST see Status: Rejected, Reason displayed, Resubmit button

## 6.6 Employee Resubmits Report
- [ ] 6.6.1: `click` 'Resubmit' button
- [ ] 6.6.2: `take_snapshot` - MUST see confirmation dialog
- [ ] 6.6.3: `click` Confirm button
- [ ] 6.6.4: `take_snapshot` - MUST see success message
- [ ] 6.6.5: `take_snapshot` - MUST see status 'Pending' or 'Submitted'

**→ SECTION 7 (NO PAUSE)**

# SECTION 7: FINANCE WORKFLOW (8 snapshots minimum)

## 7.1 Finance Views Approved Reports
- [ ] 7.1.1: Logout, Login as Finance
- [ ] 7.1.2: `take_snapshot` - Confirm 'testfinance' visible
- [ ] 7.1.3: `click` Finance in sidebar
- [ ] 7.1.4: `take_snapshot` - MUST see finance dashboard with approved reports (or metrics)

## 7.2 Finance Marks Report as Paid
- [ ] 7.2.1: `click` on approved report (if available in reimbursement queue)
- [ ] 7.2.2: `take_snapshot` - MUST see report with 'Approved' status
- [ ] 7.2.3: `click` 'Mark as Paid' or 'Reimburse' button
- [ ] 7.2.4: `take_snapshot` - MUST see confirmation dialog
- [ ] 7.2.5: `click` Confirm button
- [ ] 7.2.6: `take_snapshot` - MUST see success message
- [ ] 7.2.7: `take_snapshot` - MUST see status 'Paid' or 'Reimbursed'
- [ ] 7.2.8: DATABASE CHECK (SELECT only): Verify status = paid

**→ SECTION 8 (NO PAUSE)**

# SECTION 8: ADMIN SETTINGS (20 snapshots minimum)

## 8.1 Admin Hub
- [ ] 8.1.1: Logout, Login as Admin
- [ ] 8.1.2: `take_snapshot` - Confirm logged in as admin
- [ ] 8.1.3: `click` Admin in sidebar
- [ ] 8.1.4: `take_snapshot` - MUST see admin hub with 15+ settings cards

## 8.2 Company Settings
- [ ] 8.2.1: `click` Company Settings card
- [ ] 8.2.2: `take_snapshot` - MUST see company settings form

## 8.3 User Management
- [ ] 8.3.1: `navigate_page` to /organization/users
- [ ] 8.3.2: `take_snapshot` - MUST see user list with Members tab

## 8.4 Expense Policies
- [ ] 8.4.1: `navigate_page` to /organization/policies
- [ ] 8.4.2: `take_snapshot` - MUST see policy configuration

## 8.5 Mileage Settings
- [ ] 8.5.1: `navigate_page` to /organization/mileage-settings
- [ ] 8.5.2: `take_snapshot` - MUST see mileage rate settings

## 8.6 Currency Settings
- [ ] 8.6.1: `navigate_page` to /organization/currency
- [ ] 8.6.2: `take_snapshot` - MUST see currency options

## 8.7 Per Diem Settings
- [ ] 8.7.1: `navigate_page` to /organization/per-diem
- [ ] 8.7.2: `take_snapshot` - MUST see per diem rates

## 8.8 Delegation Settings
- [ ] 8.8.1: `navigate_page` to /organization/delegation
- [ ] 8.8.2: `take_snapshot` - MUST see delegation settings

## 8.9 Payout Settings
- [ ] 8.9.1: `navigate_page` to /organization/payouts
- [ ] 8.9.2: `take_snapshot` - MUST see payout/Stripe settings

## 8.10 GL Codes
- [ ] 8.10.1: `navigate_page` to /organization/gl-codes
- [ ] 8.10.2: `take_snapshot` - MUST see GL codes page

## 8.11 Vendors
- [ ] 8.11.1: `navigate_page` to /organization/vendors
- [ ] 8.11.2: `take_snapshot` - MUST see vendors page

## 8.12 Tax Settings
- [ ] 8.12.1: `navigate_page` to /organization/tax
- [ ] 8.12.2: `take_snapshot` - MUST see tax/VAT settings

## 8.13 Email-to-Expense
- [ ] 8.13.1: `navigate_page` to /organization/email-expense
- [ ] 8.13.2: `take_snapshot` - MUST see email settings

## 8.14 Approval Settings
- [ ] 8.14.1: `navigate_page` to /approvals/settings
- [ ] 8.14.2: `take_snapshot` - MUST see workflow configuration

## 8.15 Billing
- [ ] 8.15.1: `navigate_page` to /organization/billing
- [ ] 8.15.2: `take_snapshot` - MUST see billing page

**→ SECTION 9 (NO PAUSE)**

# SECTION 9: PROFILE SETTINGS (6 snapshots minimum)

## 9.1 Profile Page
- [ ] 9.1.1: Login as any user
- [ ] 9.1.2: `click` Profile in sidebar
- [ ] 9.1.3: `take_snapshot` - MUST see profile form with name, email fields

## 9.2 Notification Preferences
- [ ] 9.2.1: `navigate_page` to /profile/notifications
- [ ] 9.2.2: `take_snapshot` - MUST see notification toggles
- [ ] 9.2.3: `click` one toggle
- [ ] 9.2.4: `take_snapshot` - MUST see toggle changed state

## 9.3 Bank Accounts
- [ ] 9.3.1: `navigate_page` to /profile/bank-accounts
- [ ] 9.3.2: `take_snapshot` - MUST see bank accounts page

**→ SECTION 10 (NO PAUSE)**

# SECTION 10: MILEAGE WORKFLOW (10 snapshots minimum)

## 10.1 Mileage List
- [ ] 10.1.1: Login as Employee
- [ ] 10.1.2: `click` Mileage in sidebar
- [ ] 10.1.3: `take_snapshot` - MUST see mileage page

## 10.2 Create Mileage Trip
- [ ] 10.2.1: `click` 'New Trip' or 'Add Trip' button
- [ ] 10.2.2: `take_snapshot` - MUST see trip form
- [ ] 10.2.3: `fill` start location with '123 Main St, Fort Worth, TX'
- [ ] 10.2.4: `take_snapshot` - MUST see start location in field
- [ ] 10.2.5: `fill` end location with '456 Oak Ave, Dallas, TX'
- [ ] 10.2.6: `take_snapshot` - MUST see end location in field
- [ ] 10.2.7: `fill` purpose with 'E2E Test Business Trip'
- [ ] 10.2.8: `take_snapshot` - MUST see purpose in field
- [ ] 10.2.9: `click` Save button
- [ ] 10.2.10: `take_snapshot` - MUST see success or trip in list

## 10.3 View Trip Detail
- [ ] 10.3.1: `click` on trip in list
- [ ] 10.3.2: `take_snapshot` - MUST see trip detail with distance, amount

## 10.4 Edit Trip
- [ ] 10.4.1: `click` Edit button
- [ ] 10.4.2: `take_snapshot` - MUST see edit form
- [ ] 10.4.3: Change purpose field
- [ ] 10.4.4: `click` Save
- [ ] 10.4.5: `take_snapshot` - MUST see success message

**→ SECTION 11 (NO PAUSE)**

# SECTION 11: UI FEATURES (12 snapshots minimum)

## 11.1 Dark Mode
- [ ] 11.1.1: Login as any user
- [ ] 11.1.2: `take_snapshot` - Note current theme (light)
- [ ] 11.1.3: Find dark mode toggle (user menu or profile)
- [ ] 11.1.4: `click` to toggle dark mode
- [ ] 11.1.5: `take_snapshot` - MUST see theme changed to dark
- [ ] 11.1.6: Navigate to different page
- [ ] 11.1.7: `take_snapshot` - MUST see dark mode persisted
- [ ] 11.1.8: `click` to toggle back to light
- [ ] 11.1.9: `take_snapshot` - MUST see theme changed back to light

## 11.2 Sidebar Toggle
- [ ] 11.2.1: Find sidebar collapse button (bottom of sidebar)
- [ ] 11.2.2: `take_snapshot` - Note sidebar state (expanded, ~190px)
- [ ] 11.2.3: `click` collapse button
- [ ] 11.2.4: `take_snapshot` - MUST see sidebar collapsed to icon-only (~64px)
- [ ] 11.2.5: `click` a navigation icon
- [ ] 11.2.6: `take_snapshot` - MUST see page changed (navigation works)
- [ ] 11.2.7: `click` expand button
- [ ] 11.2.8: `take_snapshot` - MUST see sidebar expanded (~190px)

## 11.3 Notifications Panel
- [ ] 11.3.1: Find notification bell icon (top right)
- [ ] 11.3.2: `click` bell
- [ ] 11.3.3: `take_snapshot` - MUST see notifications panel open
- [ ] 11.3.4: `click` outside or close button
- [ ] 11.3.5: `take_snapshot` - MUST see panel closed

## 11.4 User Menu
- [ ] 11.4.1: `click` user avatar/menu button
- [ ] 11.4.2: `take_snapshot` - MUST see dropdown with user name, Sign Out option
- [ ] 11.4.3: `click` outside to close
- [ ] 11.4.4: `take_snapshot` - MUST see menu closed

**→ SECTION 12 (NO PAUSE)**

# SECTION 12: DIALOG VERIFICATION (15 snapshots minimum)

## 12.1 Submit Report Dialog
- [ ] 12.1.1: Login as Employee
- [ ] 12.1.2: Navigate to a draft report (create one if needed)
- [ ] 12.1.3: `click` 'Submit for Approval'
- [ ] 12.1.4: `take_snapshot` - MUST see: Title, Message text, Cancel button, Submit button
- [ ] 12.1.5: `click` Cancel
- [ ] 12.1.6: `take_snapshot` - Dialog closed, still on report page

## 12.2 Approve Report Dialog
- [ ] 12.2.1: Login as Manager
- [ ] 12.2.2: Navigate to pending report in approval queue
- [ ] 12.2.3: `click` 'Approve' or 'Review'
- [ ] 12.2.4: `take_snapshot` - MUST see: Submitter name, Amount, Comment field, Cancel button, Approve button
- [ ] 12.2.5: `click` Cancel
- [ ] 12.2.6: `take_snapshot` - Dialog closed

## 12.3 Reject Report Dialog
- [ ] 12.3.1: From pending report, `click` 'Reject'
- [ ] 12.3.2: `take_snapshot` - MUST see: Reason field (required, min 10 chars), Cancel button, Reject button
- [ ] 12.3.3: `click` Cancel
- [ ] 12.3.4: `take_snapshot` - Dialog closed

## 12.4 Delete Expense Dialog
- [ ] 12.4.1: Login as Employee
- [ ] 12.4.2: Navigate to a draft expense
- [ ] 12.4.3: `click` Delete
- [ ] 12.4.4: `take_snapshot` - MUST see: Warning text about permanent deletion, Cancel button, Delete/Confirm button
- [ ] 12.4.5: `click` Cancel
- [ ] 12.4.6: `take_snapshot` - Dialog closed, expense still exists

## 12.5 Add Expenses Dialog
- [ ] 12.5.1: Navigate to a draft report
- [ ] 12.5.2: `click` 'Add Expenses'
- [ ] 12.5.3: `take_snapshot` - MUST see: List of available expenses, Checkboxes, Add/Select button
- [ ] 12.5.4: `click` Cancel/Close
- [ ] 12.5.5: `take_snapshot` - Dialog closed

**→ SECTION 13 (NO PAUSE)**

# SECTION 13: RESPONSIVE & ACCESSIBILITY (20 snapshots minimum)

## 13.1 Mobile Viewport Testing (375x667)

- [ ] 13.1.1: `resize_page` to width: 375, height: 667
- [ ] 13.1.2: `navigate_page` to http://localhost:4200/auth/login
- [ ] 13.1.3: `take_snapshot` - MUST see mobile layout (no horizontal scroll)
- [ ] 13.1.4: `take_screenshot` - save as '13_01_login_mobile.png'
- [ ] 13.1.5: Login as Employee
- [ ] 13.1.6: `take_snapshot` - MUST see hamburger menu (sidebar hidden)
- [ ] 13.1.7: `take_screenshot` - save as '13_02_dashboard_mobile.png'
- [ ] 13.1.8: `click` hamburger menu
- [ ] 13.1.9: `take_snapshot` - MUST see drawer slide open
- [ ] 13.1.10: `take_screenshot` - save as '13_03_drawer_open_mobile.png'
- [ ] 13.1.11: `click` Expenses
- [ ] 13.1.12: `take_snapshot` - MUST see drawer close, expenses page load
- [ ] 13.1.13: `take_screenshot` - save as '13_04_expenses_mobile.png'

## 13.2 Tablet Viewport Testing (768x1024)

- [ ] 13.2.1: `resize_page` to width: 768, height: 1024
- [ ] 13.2.2: `navigate_page` to /home
- [ ] 13.2.3: `take_snapshot` - MUST see tablet layout
- [ ] 13.2.4: `take_screenshot` - save as '13_05_dashboard_tablet.png'
- [ ] 13.2.5: `click` Expenses
- [ ] 13.2.6: `take_snapshot` - MUST see expenses page
- [ ] 13.2.7: `take_screenshot` - save as '13_06_expenses_tablet.png'

## 13.3 Desktop Viewport Testing (1440x900)

- [ ] 13.3.1: `resize_page` to width: 1440, height: 900
- [ ] 13.3.2: `navigate_page` to /home
- [ ] 13.3.3: `take_snapshot` - MUST see full sidebar expanded
- [ ] 13.3.4: `take_screenshot` - save as '13_07_dashboard_desktop.png'

## 13.4 Accessibility Checks

For each major page, verify:

- [ ] 13.4.1: Login page - `take_snapshot` with verbose: true
  - Check: Form fields have labels
  - Check: Submit button has accessible name
  - Check: Error messages have aria-live or role="alert"

- [ ] 13.4.2: Dashboard - `take_snapshot` with verbose: true
  - Check: Heading hierarchy (h1 > h2 > h3)
  - Check: Navigation has landmarks (nav, main)
  - Check: Interactive elements keyboard accessible

- [ ] 13.4.3: Expense Form - `take_snapshot` with verbose: true
  - Check: All inputs have labels
  - Check: Required fields marked with aria-required
  - Check: Error states have aria-invalid

- [ ] 13.4.4: Approval Queue - `take_snapshot` with verbose: true
  - Check: Table has proper headers
  - Check: Buttons have accessible names
  - Check: Status badges are not color-only (have text)

## 13.5 Color Contrast Validation

- [ ] 13.5.1: On login page, verify primary button (#FF5900) has sufficient contrast
- [ ] 13.5.2: Verify error messages (red) are readable
- [ ] 13.5.3: In dark mode, verify text is readable against dark background

**→ SECTION 14 (NO PAUSE)**

# SECTION 14: PERFORMANCE & VISUAL REGRESSION (10 snapshots minimum)

## 14.1 Performance Trace - Login

- [ ] 14.1.1: `resize_page` to width: 1440, height: 900 (desktop)
- [ ] 14.1.2: `performance_start_trace` with reload: true, autoStop: true
- [ ] 14.1.3: `navigate_page` to http://localhost:4200/auth/login
- [ ] 14.1.4: `wait_for` text: 'Sign in', timeout: 10000
- [ ] 14.1.5: `performance_stop_trace`
- [ ] 14.1.6: Record LCP, FCP metrics
- [ ] 14.1.7: VERIFY: LCP < 2.5s, FCP < 1.8s

## 14.2 Performance Trace - Dashboard

- [ ] 14.2.1: Login as Employee
- [ ] 14.2.2: `performance_start_trace` with reload: true, autoStop: true
- [ ] 14.2.3: `navigate_page` to /home
- [ ] 14.2.4: `wait_for` dashboard content
- [ ] 14.2.5: `performance_stop_trace`
- [ ] 14.2.6: Record LCP, FCP, CLS metrics
- [ ] 14.2.7: VERIFY: LCP < 2.5s, CLS < 0.1

## 14.3 Visual Baseline Screenshots

Capture baseline screenshots for visual regression:

- [ ] 14.3.1: `take_screenshot` - C:/Jensify/test-screenshots/baseline_login.png
- [ ] 14.3.2: Login, `take_screenshot` - C:/Jensify/test-screenshots/baseline_dashboard.png
- [ ] 14.3.3: Navigate to /expenses, `take_screenshot` - C:/Jensify/test-screenshots/baseline_expenses.png
- [ ] 14.3.4: Navigate to /expenses/new, `take_screenshot` - C:/Jensify/test-screenshots/baseline_expense_form.png
- [ ] 14.3.5: Navigate to /reports, `take_screenshot` - C:/Jensify/test-screenshots/baseline_reports.png

## 14.4 Visual Checkpoints

For each baseline, document:

```yaml
Visual Checkpoint: Login Page
Elements Validated:
  - Logo position and size
  - Form field alignment
  - Button color matches brand (#FF5900)
  - Mobile responsive at 375px width
```

**→ FINAL REPORT (NO PAUSE)**

# FINAL COVERAGE REPORT (MANDATORY)

**You are NOT finished until this report is generated with 100% coverage or documented gaps.**

```markdown
# E2E Final Coverage Report - [DATE/TIME]

## Executive Summary
- **Status**: [PASS/FAIL]
- **Production Ready**: [YES/NO]
- **Total Sections**: 14
- **Sections Completed**: [X]/14
- **Total Snapshots**: [X]/249 minimum

## Execution Summary
| Section | Status | Snapshots |
|---------|--------|-----------|
| 1. Authentication (4 roles) | ✅/❌ | [X]/40 |
| 2. Navigation (all pages) | ✅/❌ | [X]/36 |
| 3. Expense CRUD | ✅/❌ | [X]/30 |
| 4. Receipt Management | ✅/❌ | [X]/5 |
| 5. Report Workflow | ✅/❌ | [X]/12 |
| 6. Approval Workflow | ✅/❌ | [X]/25 |
| 7. Finance Workflow | ✅/❌ | [X]/8 |
| 8. Admin Settings (15+ pages) | ✅/❌ | [X]/20 |
| 9. Profile Settings | ✅/❌ | [X]/6 |
| 10. Mileage Workflow | ✅/❌ | [X]/10 |
| 11. UI Features | ✅/❌ | [X]/12 |
| 12. Dialog Verification | ✅/❌ | [X]/15 |
| 13. Responsive & Accessibility | ✅/❌ | [X]/20 |
| 14. Performance & Visual | ✅/❌ | [X]/10 |

## Role Coverage
| Role | Sections Tested | Status |
|------|-----------------|--------|
| Admin | 1,2,3,5,6,8,9,10,11,12,13 | ✅/❌ |
| Finance | 1,2,3,5,7,9,10,11,13 | ✅/❌ |
| Manager | 1,2,3,5,6,9,10,11,12,13 | ✅/❌ |
| Employee | 1,2,3,4,5,6,9,10,11,12,13,14 | ✅/❌ |

## Responsive Testing Summary
| Viewport | Width | Height | Status |
|----------|-------|--------|--------|
| Mobile | 375px | 667px | ✅/❌ |
| Tablet | 768px | 1024px | ✅/❌ |
| Desktop | 1440px | 900px | ✅/❌ |

## Accessibility Summary
| Check | Status |
|-------|--------|
| Form labels present | ✅/❌ |
| Heading hierarchy | ✅/❌ |
| Keyboard navigation | ✅/❌ |
| ARIA landmarks | ✅/❌ |
| Color contrast | ✅/❌ |

## Performance Metrics
| Page | LCP | FCP | CLS | Status |
|------|-----|-----|-----|--------|
| Login | [X]s | [X]s | [X] | ✅/❌ |
| Dashboard | [X]s | [X]s | [X] | ✅/❌ |

## Bugs Found & Fixed
| # | Bug Description | Location | Fix Applied | Retested |
|---|-----------------|----------|-------------|----------|
| 1 | ... | file:line | ... | PASS/FAIL |

## Self-Healing Log
| Test | Original Selector | Healed Using | Reason |
|------|------------------|--------------|--------|
| ... | ... | ... | ... |

## Items NOT Tested (Must be empty or justified)
- None (100% coverage)
OR
- [Item]: [Blocking reason]

## Console Errors
- Total errors found: [X]
- All resolved: [YES/NO]

## Database Verifications
- Total queries executed: [X]
- All passed: [YES/NO]

## Visual Baselines Captured
- Total screenshots: [X]
- Location: C:/Jensify/test-screenshots/

## Coverage: [X]/14 sections = [X]%

---
FINAL STATUS: PASS / FAIL
---

Generated: [timestamp]
Test Duration: [X] minutes
```

---

# ENFORCEMENT CHECKLIST

Before claiming "testing complete", verify:

- [ ] All 14 sections have status "completed" in TodoWrite
- [ ] All 4 roles tested for applicable sections
- [ ] Minimum 249 snapshots taken
- [ ] All bugs found were fixed and retested
- [ ] Responsive testing at 3 viewports complete
- [ ] Accessibility checks performed on major pages
- [ ] Performance metrics recorded
- [ ] Visual baselines captured
- [ ] Final Coverage Report generated
- [ ] Coverage shows 100% (or documented gaps with reasons)
- [ ] Console has zero unresolved errors

**If ANY checkbox is unchecked, you are NOT done.**

---

# SCREENSHOT NAMING CONVENTION

```
{section}_{subsection}_{description}_{viewport}.png

Examples:
01_01_employee_dashboard.png
01_05_login_error.png
13_01_login_mobile.png
13_05_dashboard_tablet.png
13_07_dashboard_desktop.png
baseline_login.png
baseline_dashboard.png
```

---

# EXECUTION COMMAND

To run this skill:
```
/skill comprehensive-e2e-testing
```

Or invoke:
```
Run comprehensive E2E testing following the production-ready testing skill.
Execute ALL 14 sections WITHOUT stopping between them.
Fix bugs before continuing.
Generate Final Coverage Report when complete.
```

---

*Skill Version: 4.0*
*Created: December 8, 2025*
*Last Updated: December 9, 2025*
*Key Updates:*
- *Merged agentic-testing.md features (visual regression, accessibility, performance)*
- *Added Section 13: Responsive & Accessibility testing*
- *Added Section 14: Performance & Visual Regression*
- *Added self-healing selector strategy*
- *Increased minimum snapshots to 249*
- *Added responsive viewport testing (mobile, tablet, desktop)*
- *Added WCAG 2.1 AA accessibility checks*
- *Added Core Web Vitals performance thresholds*
- *All original detailed step-by-step checkboxes preserved*
