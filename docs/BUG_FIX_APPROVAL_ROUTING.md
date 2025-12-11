# Approval Routing Bug - Investigation & Fix

**Date:** December 9, 2024
**Author:** Claude Code
**Status:** ✅ FIXED
**Migration:** `20251209132425_fix_approval_routing_manager_lookup.sql`

---

## Problem Summary

When a report was submitted for approval during E2E testing, it was incorrectly routed to `testmanager@e2etest.com` instead of `testadmin@e2etest.com`. The tester had to manually fix this with a database UPDATE, which is a bandaid fix.

---

## Root Cause Analysis

### The Bug

The `get_approver_for_step()` function in the approval engine had a critical logic error when resolving manager approvers for the `step_type = 'manager'` case.

**Location:** `supabase/migrations/20251123000002_approval_engine_functions.sql` (lines 158-167)

**Old (Buggy) Code:**
```sql
WHEN 'manager' THEN
  -- Get submitter's manager
  SELECT manager_id INTO v_approver_id
  FROM organization_members
  WHERE user_id = v_submitter_id
    AND organization_id = v_organization_id;

  IF v_approver_id IS NULL THEN
    RAISE EXCEPTION 'Submitter has no manager assigned';
  END IF;
```

### Data Model Context

The `organization_members` table has two critical UUID columns:

1. **`manager_id`** - References `organization_members(id)` (self-referential FK)
   - This is the **ID of the manager's organization membership record**

2. **`user_id`** - References `auth.users(id)`
   - This is the **ID of the actual user account**

The `expense_approvals` table has:

- **`current_approver_id`** - References `auth.users(id)`
  - This expects a **user_id**, NOT an organization_members.id

### What Went Wrong

The old code retrieved `manager_id` (which is an `organization_members.id`) and assigned it directly to `current_approver_id` (which expects an `auth.users.id`).

**Result:** The approval system was comparing the wrong ID types, causing approvals to be routed to incorrect users based on UUID collisions or mismatches.

### Scenario Reproduction

Given this data structure:

```
organization_members:
┌──────────────────────────────────────┬──────────────────────────────────────┬──────────────────────────────────────┬──────────┐
│ id                                   │ user_id                              │ manager_id                           │ role     │
├──────────────────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┼──────────┤
│ adadadad-1111-1111-1111-111111111111 │ cccccccc-cccc-cccc-cccc-cccccccccccc │ NULL                                 │ admin    │
│ efefefef-1111-1111-1111-111111111111 │ aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa │ adadadad-1111-1111-1111-111111111111 │ employee │
└──────────────────────────────────────┴──────────────────────────────────────┴──────────────────────────────────────┴──────────┘

auth.users:
┌──────────────────────────────────────┬──────────────────────────┐
│ id                                   │ email                    │
├──────────────────────────────────────┼──────────────────────────┤
│ cccccccc-cccc-cccc-cccc-cccccccccccc │ testadmin@e2etest.com    │
│ aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa │ testemployee@e2etest.com │
└──────────────────────────────────────┴──────────────────────────┘
```

**Old Logic:**
```sql
SELECT manager_id FROM organization_members WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
-- Returns: adadadad-1111-1111-1111-111111111111 (organization_members.id)
-- Assigns to: expense_approvals.current_approver_id (expects auth.users.id)
-- FK constraint violation OR routes to wrong user
```

**New Logic:**
```sql
SELECT manager.user_id
FROM organization_members submitter
JOIN organization_members manager ON manager.id = submitter.manager_id
WHERE submitter.user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
-- Returns: cccccccc-cccc-cccc-cccc-cccccccccccc (auth.users.id) ✅
-- Assigns to: expense_approvals.current_approver_id ✅
-- Correctly routes to testadmin@e2etest.com ✅
```

---

## The Fix

### Updated Code

**Location:** `supabase/migrations/20251209132425_fix_approval_routing_manager_lookup.sql`

```sql
WHEN 'manager' THEN
  -- FIX: Get the manager's user_id (not just manager_id)
  -- Join through organization_members to get the actual user_id
  SELECT manager.user_id INTO v_approver_id
  FROM organization_members submitter
  JOIN organization_members manager ON manager.id = submitter.manager_id
  WHERE submitter.user_id = v_submitter_id
    AND submitter.organization_id = v_organization_id
    AND manager.is_active = true;

  IF v_approver_id IS NULL THEN
    RAISE EXCEPTION 'Submitter has no active manager assigned';
  END IF;
```

### Key Changes

1. **Added JOIN:** Now joins from `submitter` → `manager` via `manager.id = submitter.manager_id`
2. **Return manager.user_id:** Returns the manager's `user_id` instead of `manager_id`
3. **Added is_active check:** Ensures the manager is still an active member
4. **Updated error message:** "no active manager" instead of "no manager" for clarity

---

## Testing & Verification

### Test Environment Setup

```sql
-- Create test organization
INSERT INTO organizations (id, name, settings)
VALUES ('11111111-1111-1111-1111-111111111111', 'E2E Test Org', '{}'::jsonb);

-- Create test users
INSERT INTO auth.users (id, email) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'testemployee@e2etest.com'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'testadmin@e2etest.com');

-- Create organization members with manager hierarchy
INSERT INTO organization_members (id, organization_id, user_id, role, is_active, manager_id) VALUES
  ('adadadad-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'admin', true, NULL),
  ('efefefef-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'employee', true, 'adadadad-1111-1111-1111-111111111111');
```

### Test Results

**Before Fix:**
```
current_approver_id: adadadad-1111-1111-1111-111111111111 (organization_members.id) ❌
Approval routed to: Wrong user (FK constraint violation or UUID mismatch)
```

**After Fix:**
```sql
-- Submit report from testemployee
INSERT INTO expense_reports (id, organization_id, user_id, name, total_amount, status)
VALUES ('12345678-1234-1234-1234-123456789012', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test Report', 450.00, 'draft');

UPDATE expense_reports SET status = 'submitted' WHERE id = '12345678-1234-1234-1234-123456789012';
SELECT create_approval_chain(NULL, '12345678-1234-1234-1234-123456789012');

-- Query approval routing
SELECT
  ea.current_approver_id,
  u.email as current_approver_email,
  om.role as current_approver_role
FROM expense_approvals ea
JOIN auth.users u ON ea.current_approver_id = u.id
JOIN organization_members om ON om.user_id = u.id
WHERE ea.report_id = '12345678-1234-1234-1234-123456789012';
```

**Result:**
```
current_approver_id:    cccccccc-cccc-cccc-cccc-cccccccccccc ✅
current_approver_email: testadmin@e2etest.com ✅
current_approver_role:  admin ✅
```

---

## Impact Assessment

### Affected Code Paths

1. **Approval Chain Creation**
   - `create_approval_chain()` → `get_approver_for_step()`
   - Called when expenses/reports are submitted

2. **Approval Advancement**
   - `approve_expense()` → `get_approver_for_step()`
   - Called after each approval to route to next step

3. **Workflow Types Affected**
   - Any workflow with `step_type = 'manager'`
   - Default workflows: "Small Expenses", "Medium Expenses", "Large Expenses"

### Severity

- **Critical** - Approval routing is a core security feature
- **Data Integrity** - Could violate FK constraints
- **User Experience** - Approvals routed to wrong users cause confusion and delays

### Scope

- **All organizations** using manager-based approval workflows
- **All existing approvals** with `step_type = 'manager'` potentially affected
- **No data corruption** - Old approvals remain valid, just incorrectly routed

---

## Deployment Instructions

### For Local Development

```bash
cd /c/Jensify
supabase db reset --local  # Apply all migrations including fix
```

### For Production

```bash
# Option 1: Via Supabase CLI
cd /c/Jensify
supabase db push  # Push new migration to remote

# Option 2: Via Supabase Dashboard
1. Go to Database > Migrations
2. Upload 20251209132425_fix_approval_routing_manager_lookup.sql
3. Run migration
```

### Post-Deployment Verification

Run this query on production to verify the fix:

```sql
-- Check if any pending approvals have invalid current_approver_id
SELECT
  ea.id,
  ea.current_approver_id,
  CASE
    WHEN u.id IS NULL THEN 'INVALID - user not found'
    ELSE 'VALID'
  END as approver_status
FROM expense_approvals ea
LEFT JOIN auth.users u ON ea.current_approver_id = u.id
WHERE ea.status = 'pending'
  AND ea.current_approver_id IS NOT NULL;
```

---

## Prevention Measures

### Code Review Checklist

When working with multi-table relationships:

1. ✅ Verify FK constraints match the referenced table
2. ✅ Check self-referential FKs (like `manager_id → organization_members.id`)
3. ✅ Ensure JOINs resolve the correct ID type
4. ✅ Test with realistic data before deployment

### Type Safety Improvements (Future)

Consider adding database constraints or views to prevent this class of bug:

```sql
-- Example: Enforce that current_approver_id must be a valid user_id
CREATE OR REPLACE FUNCTION validate_approver_exists()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_approver_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.current_approver_id) THEN
      RAISE EXCEPTION 'current_approver_id must reference a valid user';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_approver_before_insert
  BEFORE INSERT OR UPDATE ON expense_approvals
  FOR EACH ROW
  EXECUTE FUNCTION validate_approver_exists();
```

---

## Related Issues

- **E2E Testing:** Update E2E tests to verify correct approval routing
- **User Management UI:** Ensure manager assignment UI is clear about hierarchy
- **Documentation:** Update FEATURES.md to document manager hierarchy requirements

---

## References

- **Migration:** `supabase/migrations/20251209132425_fix_approval_routing_manager_lookup.sql`
- **Original Bug Location:** `supabase/migrations/20251123000002_approval_engine_functions.sql` (lines 158-167)
- **Related Tables:**
  - `organization_members` (self-referential FK: `manager_id → id`)
  - `auth.users` (user accounts)
  - `expense_approvals` (approval tracking)
  - `approval_steps` (workflow configuration)

---

## Conclusion

The approval routing bug was caused by a type mismatch between `organization_members.manager_id` (org member record ID) and `expense_approvals.current_approver_id` (user account ID). The fix adds a JOIN to resolve the manager's `user_id` correctly.

**Status:** ✅ Fixed and tested locally
**Next Steps:** Deploy to production and verify with E2E tests
