# Report-Centric Workflow Implementation Checklist

Workstream to make Jensify report-based: receipts → expenses → reports → submit reports (only reports are approved/reimbursed).

- [x] Capture target UX and architecture (report-centric plan written).
- [x] Create central checklist tracker (this file).

## Data Model & Migrations
- [x] Add `expense_reports` table (owner, name, period, status, submitted/approved/reimbursed metadata, approver/finance ids). → `supabase/migrations/20251118181705_expense_reports.sql`
- [x] Add `expense_report_expenses` join table (report ↔ expense, optional line notes). → same migration.
- [x] Update `expenses` to reference report (`report_id` or `local_status`/`is_reported`), indexes, and RLS. → `supabase/migrations/20251119000001_expense_report_link.sql`
- [x] One-time migration: mark existing expenses as unreported; sync report_id if linked (`supabase/migrations/20251119001000_backfill_expense_report_flags.sql`).

## API / Data Layer
- [x] Helpers/queries: unreported expenses for user; report CRUD/list; report detail (with expenses + receipts). (ReportService + ExpenseService)
- [x] Status transitions: submit report, approve/reject report, mark reimbursed (single/bulk); enforce row-level security.

## Employee Experience
- [x] Reports list page (`/reports`): list by name/period/status/total; actions View/Submit for Draft.
- [x] New report flow (`/reports/new`): name/period + select unreported expenses → save Draft (create dialog + detail page).
- [x] Report detail (employee): line items + receipts, add/remove expenses.
- [x] Submission UX: **Submit Report** button; prevents submitting empty reports.

## Approver Experience
- [x] Approvals page shows **Submitted reports** (not expenses); list with employee, totals, submitted date.
- [x] Report review actions: **Approve Report** / **Reject Report** with optional note (list-level with quick actions).

## Finance Experience
- [x] Finance dashboard shows **Approved reports**; totals and counts.
- [x] Actions: **Mark Reimbursed** per report; bulk reimburse via multi-select.

## My Expenses Integration
- [x] Add “Report” tag: shows Unreported vs In report.
- [x] Replace per-expense submit with **Add to Report…** (removed per-expense submit button).

## Dashboard & Navigation
- [x] Dashboard widgets: unreported expenses, draft reports, submitted reports, approved (unreimbursed) reports.
- [x] Sidebar badges for pending counts (unreported, draft, approvals).

## Exports
- [x] Employee CSV remains per-expense (`expense-app/src/app/features/expenses/expense-list/expense-list.ts` export uses current filters).
- [x] Finance export outputs per-expense lines with signed receipt URLs (`expense-app/src/app/features/finance/dashboard/dashboard.ts`).

## Policy & Validation
- [x] Block report submission if expenses are missing required receipts/fields; inline “Fix issues before submitting”.

## Documentation
- [x] Update `JENSIFY_GUIDE.md`, `HOW_JENSIFY_WORKS.md` to reflect report submission.
- [x] Update `USER_GUIDE_EMPLOYEE_APPROVER.md`.
- [x] Update `EXPENSIFY_PARITY_CHECKLIST.md` to mark report support.

## Post-MVP Enhancements
- [x] Auto-create monthly report + auto-add draft expenses (`ReportService.autoAttachExpenseToMonthlyReport`, `expense.service.ts` hook).
- [x] Notifications for approvals/rejections/reimbursements (Report list watches status changes and fires NotificationService toasts).
