# Jensify Custom Skills

This directory contains custom skills for Claude Code to assist with Jensify development and testing.

## Available Skills

### 1. Code Review (`code-review.md`)

**Purpose:** Systematic code review that avoids false positives and prevents re-investigating already-verified issues.

**Key Features:**
- Uses actual tooling (build, tests, lint) instead of grep pattern matching
- Checks `docs/KNOWN_VERIFIED_ISSUES.md` before reporting anything
- Classifies issues by severity (Critical, High, Medium, Low)
- Distinguishes real issues from false positives
- Updates known issues file to prevent review loops

**When to Use:**
- When asked to "review the codebase for errors"
- Before major deployments
- After significant refactoring

**Quick Start:**
```bash
# Invoke the skill
/skill code-review
```

**Related Files:**
- `docs/KNOWN_VERIFIED_ISSUES.md` - Tracks verified issues and false positives

---

### 2. Comprehensive E2E Testing (`comprehensive-e2e-testing.md`)

**Purpose:** Complete autonomous browser-based E2E testing with zero tolerance for skipped tests.

**Key Features:**
- 14 test sections covering all user workflows
- Tests all 4 user roles (Employee, Manager, Finance, Admin)
- Visual regression testing with baseline screenshots
- Accessibility (WCAG 2.1 AA) compliance checks
- Performance testing (Core Web Vitals)
- Responsive testing (mobile, tablet, desktop)
- Self-healing selector strategy
- Minimum 249 snapshots required

**When to Use:**
- Before ANY production deployment
- After major feature implementations
- For complete regression testing
- Visual regression after UI changes
- Accessibility compliance audits

**Quick Start:**
```bash
# 1. Start dev server
cd C:\Jensify\expense-app && npm start

# 2. Launch Chrome with debugging
C:\Jensify\launch-chrome-dev.bat

# 3. Invoke skill
/skill comprehensive-e2e-testing
```

**Test Accounts:**
| Email | Password | Role |
|-------|----------|------|
| testadmin@e2etest.com | Xp3ns3d@Adm1n#2025! | Admin |
| testfinance@e2etest.com | Xp3ns3d@F1n4nc3#2025! | Finance |
| testmanager@e2etest.com | Xp3ns3d@M4n4g3r#2025! | Manager |
| testemployee@e2etest.com | Xp3ns3d@3mpl0y33#2025! | Employee |

---

## Skill Selection Guide

| Task | Use This Skill |
|------|----------------|
| "Review code for errors" | `code-review` |
| "Find bugs in codebase" | `code-review` |
| "Check for issues" | `code-review` |
| "Run E2E tests" | `comprehensive-e2e-testing` |
| "Test the application" | `comprehensive-e2e-testing` |
| "Visual regression check" | `comprehensive-e2e-testing` |
| "Accessibility audit" | `comprehensive-e2e-testing` |

## Superpowers Skills (Built-in)

These skills are provided by the superpowers plugin and are always available:

| Skill | Use When |
|-------|----------|
| `superpowers:verification-before-completion` | Before claiming any work is done |
| `superpowers:systematic-debugging` | Encountering bugs or failures |
| `superpowers:test-driven-development` | Implementing new features |
| `superpowers:brainstorming` | Designing before coding |

---

## Creating New Skills

To create a new skill:

1. Create a new `.md` file in this directory
2. Follow this structure:

```markdown
# Skill Name

## Purpose
[What this skill does in 1-2 sentences]

## When to Use
[Bullet points of scenarios]

## When NOT to Use
[Avoid overlap with existing skills]

## Prerequisites
[Requirements before using]

## Process
[Step-by-step instructions]

## Anti-Patterns
[Common mistakes to avoid]
```

3. Update this README with the new skill
4. Ensure no overlap with existing skills

---

## Resources

- **Project Documentation:** `C:\Jensify\CLAUDE.md`
- **Features Guide:** `C:\Jensify\FEATURES.md`
- **Known Issues:** `C:\Jensify\docs\KNOWN_VERIFIED_ISSUES.md`
- **System Architecture:** `C:\Jensify\HOW_EXPENSED_WORKS.md`

---

**Last Updated:** 2025-12-10
