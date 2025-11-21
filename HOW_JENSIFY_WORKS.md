# How Jensify Works

Jensify is a modern expense and receipt application, similar to tools like Expensify. Employees upload receipts and create expenses; those expenses are grouped into **expense reports** that are submitted for approval; approvers and finance teams approve/reject reports and then mark them as reimbursed.

This document gives a detailed overview of how Jensify works today for each role, plus a roadmap of upcoming features.

---

## 1. Layout & Navigation

### 1.1 Global Layout

After logging in, users see a consistent three-part layout:

- **Top bar** – Jensify logo on the left, a central area reserved for search, and a right section with notifications, the user’s name/email, and a Sign Out option.
- **Sidebar navigation** – A collapsible vertical menu on the left: expanded shows icons and text; collapsed shows icons only.
- **Main content area** – The central pane where pages (dashboard, expenses, approvals, finance) are displayed.

Forms across the app (login, expense forms, filters) use Material “fill” fields with labels floating cleanly above the inputs—no divider lines cutting through text.

### 1.2 Sidebar Navigation

Common navigation entries:

- **Dashboard** – Home dashboard (`/home`).
- **Upload Receipt** – Receipt upload screen (`/expenses/upload`).
- **Receipts** – Personal receipt library (`/receipts`).
- **My Expenses** – User’s own expenses (`/expenses`).
- **New Expense** – Create a new expense (`/expenses/new`).
- **Approvals** – Approval queue (`/approvals`, approvers/finance/admin only).
- **Finance Dashboard** – Reimbursement dashboard (`/finance/dashboard`, finance/admin only).

The sidebar is about 180px wide when expanded so labels are readable, and snaps down to icons-only when collapsed.

---

## 2. Roles

### 2.1 Employees

- Upload and manage receipts.
- Create and track their expenses.
- See statuses like Draft, Submitted, Approved, Reimbursed, and Rejected.

### 2.2 Approvers / Finance

- Review submitted expenses in a queue.
- View receipts.
- Approve or reject expenses.
- Mark approved expenses as reimbursed.

### 2.3 Managers (Planned)

- Will review and approve expenses for their direct reports before finance sees them.

---

## 3. Employee Experience

### 3.1 Home Dashboard (`/home`)

After login, users land on the **Home Dashboard**.

They see:

- A greeting (“Hi, Alex”).
- **Quick actions**:
  - **Add Receipt** – Opens the upload screen.
  - **New Expense** – Opens the expense form.
  - **Review Approvals** – Only for approvers/finance.
- **Metrics card** – Counts of:
  - Drafts.
  - Submitted.
  - Reimbursed.
- **Next Up guidance** – A card that explains the typical flow: upload receipts → create expenses → submit for approval.
- **Recent activity** – Last few expenses with date, status, and amount.

The dashboard answers “What should I do next?” and offers one-click shortcuts.

### 3.2 Uploading Receipts (`/expenses/upload`)

The upload page supports an “upload-first” flow:

1. **Open the upload screen**
   - From the sidebar (**Upload Receipt**) or from a dashboard quick action.
2. **Select a file**
   - Drag and drop or use the file picker (camera/capture on some devices).
3. **Validation**
   - The app checks the file type (image/PDF) and size.
4. **Upload**
   - File is stored in a Supabase Storage bucket named `receipts`.
   - A `receipts` table row is created with:
     - File path, name, MIME type, size.
     - `ocr_status = 'pending'` for future OCR.
5. **Redirect to New Expense**
   - On success, Jensify redirects to:
     - `/expenses/new?receiptId=<new_receipt_id>`

From the employee’s perspective: they upload a receipt, then are immediately guided into creating an expense using that receipt.

### 3.3 Creating a New Expense (`/expenses/new`)

Users can reach this page from:

- Dashboard quick action (**New Expense**).
- Sidebar link (**New Expense**).
- **Create Expense** button in the Receipts list.
- Automatic redirect after an upload.

#### 3.3.1 Form Fields

The expense form includes:

- Merchant.
- Amount.
- Category.
- Date.
- Notes (optional).
- Attached receipt (optional but often required).

#### 3.3.2 With a Linked Receipt

If the URL contains `?receiptId=<id>`:

- The form loads that receipt and shows an **Attached Receipt** card:
  - File name, type, size.
  - **View** – Opens the receipt via a secure signed URL.
  - **Remove** – Unlinks the receipt from this expense (but does not delete it).

#### 3.3.3 Without a Linked Receipt

If there is no `receiptId`:

- The form starts without an attached receipt.
- Users may:
  - Create a draft without a receipt, and/or
  - Attach a receipt via the Attach Receipt dialog.

#### 3.3.4 Saving

- Submitting the form creates a new expense with **status `draft`**.
- Drafts show on the dashboard and in My Expenses.
- A separate “Submit for Approval” action will be added later.

### 3.4 Attaching or Changing a Receipt

On the expense form, users can attach or change a receipt via a dialog.

When **Attach receipt** or **Change receipt** is clicked:

1. A dialog opens with two tabs:
   - **Upload New** – Upload a fresh receipt.
   - **Choose Existing** – Select from the user’s existing receipts.
2. Upload New:
   - Uses the same upload logic as the upload page.
   - On success, returns the new receipt to the form.
3. Choose Existing:
   - Lists all of the user’s receipts (name, type, size).
   - Selecting one returns it to the form.

Removing a receipt on the form only removes the link; the receipt stays in the user’s library.

### 3.5 Receipts Library (`/receipts`)

This page is a personal library of all the user’s uploaded receipts.

For each receipt, users see:

- File icon, name, type, size.
- **View** – Opens via signed URL.
- **Create Expense** – Opens the new expense form with that receipt linked.

It’s ideal for workflows where a user uploads a batch of receipts and later converts them into expenses.

### 3.6 My Expenses (`/expenses`)

The My Expenses page shows all expenses created by the user.

#### 3.6.1 Filtering and Search

Users can filter by:

- Status (Draft, Submitted, Approved, Reimbursed, Rejected).
- Merchant or notes (search).
- Category.
- Date range.
- Amount range.

#### 3.6.2 Expense Rows

Each expense shows:

- Receipt indicator (thumbnail/icon if attached, placeholder if not).
- Merchant, date, category, notes.
- Status badge (Draft/Submitted/Approved/Reimbursed/Rejected).
- Amount (formatted currency).
- A “Report” tag showing whether the expense is still **Unreported** or already linked to a named report. This makes it obvious which lines still need to be bundled before submission.

#### 3.6.3 Actions

- **View Receipt**
  - Opens the receipt via signed URL if present.
  - Disabled and shows “No Receipt” when none is attached.
- **View Details**
  - Placeholder for a future detail page.
- **Edit**
  - Placeholder for the future edit flow.

#### 3.6.4 CSV Export

Users can export the filtered list to CSV, with columns:

- Expense ID.
- Merchant.
- Amount.
- Category.
- Expense date.
- Status.
- Receipt attached (Yes/No).
- Receipt file name (if any).
- Receipt URL (signed URL).

Jensify also auto-creates a draft “Month Year Expenses” report for each user and drops new draft expenses into that report immediately. Employees can still move expenses to a different report, but nobody has to remember to create the default monthly report manually.

---

## 4. Approver & Finance Experience

### 4.1 Approval Queue (`/approvals`)

The Approval Queue shows all **Submitted** expenses.

Approvers now see **Submitted reports**, each with:

- Report name and description.
- Employee name/email.
- Submission date.
- Number of expenses and total amount.
- Status badge (Draft/Submitted/Approved/Rejected/Paid).

They can:

- Search/filter by employee or report name.
- Review summary metrics (count and total amount of submitted reports).
- Approve or reject reports individually or in bulk.

Actions:

- **Approve** – moves the full report (all included expenses) into the finance reimbursement queue.
- **Reject** – returns the report to the employee as Draft, optionally with a note.

Receipts are already validated at submission time, so approvers focus purely on policy review rather than chasing missing files.

### 4.2 Finance Dashboard (`/finance/dashboard`)

The Finance Dashboard shows all **Approved** expenses that have not yet been reimbursed.

Finance users see:

- Count of approved, unreimbursed expenses.
- Total amount pending reimbursement.
- Per-expense details: employee, merchant, category, dates, amount, and status.

Actions:

- **Mark as Reimbursed**
  - Sets status to **Reimbursed** and removes the expense from the queue.
- **Mark All as Reimbursed**
  - Bulk action for all eligible expenses in the current view.
- **Export to CSV**
  - Downloads a detailed CSV with one row per expense line (including report info, employee name/email, amounts, and signed receipt URLs).
- In-app notifications (tied to user preferences) inform employees when their reports are approved, rejected, or reimbursed.

---

## 5. Status Lifecycle

The expense lifecycle uses clear statuses:

- **Draft**
  - Created by the employee; not yet submitted.
- **Submitted**
  - Waiting for approval; appears in the Approval Queue.
- **Approved**
  - Approved by an approver; appears in the Finance Dashboard.
- **Reimbursed**
  - Paid out; no longer in the reimbursement queue.
- **Rejected**
  - Rejected by an approver; visible to the employee for review and later resubmission.

Receipts are separate records linked via `receipt_id`. Unlinking a receipt does not delete it from storage.

Reports follow the same lifecycle (Draft → Submitted → Approved → Paid/Reimbursed → Rejected). When a report changes state, every expense inside inherits that new status automatically.

---

## 6. Roadmap & Upcoming Features

### 6.1 Phase 1 – Core Loop Enhancements

- **Expense Detail Page (`/expenses/:id`)**
  - Full view of a single expense with history, big receipt preview, and role-specific actions.
- **Edit Expense Flow**
  - Allow editing drafts (and possibly rejected expenses) using a prefilled form.
- **Explicit Submit for Approval**
  - Clear “Save Draft” vs “Submit for Approval” buttons and behavior.
- **Complete Finance CSV Export**
  - Detailed CSV including employee data, dates, receipt info, and cost centers.

### 6.2 Phase 2 – Manager & Compliance

- **Manager-Level Approvals**
  - Separate manager queue; manager approval before finance review.
- **Missing Receipt Enforcement**
  - Warnings, filters, and optional blocking rules for expenses without receipts.

### 6.3 Phase 3 – Productivity & Intelligence

- **OCR & Auto-Fill**
  - Automatic extraction of merchant, date, amount, etc. from receipts.
- **Multi-Receipt Support**
  - Support for multiple receipts per expense via an `expense_receipts` join table.

### 6.4 Phase 4 – Polishing

- **Global Search**
  - Search for expenses and receipts from the top bar.
- **UI Polish**
  - Spacing, typography, improved empty/loading states, and better mobile layouts.

---

## 7. Summary

Jensify already supports a complete expense lifecycle:

- Employees upload receipts, create expenses, and track their status.
- Approvers and finance staff review, approve or reject, and reimburse expenses.

The upcoming features focus on:

- Making the workflow clearer and more intuitive.
- Adding manager-level approvals and enforcement for missing receipts.
- Introducing OCR and multi-receipt support.
- Improving exports and reports for finance.

Together, these steps will push Jensify to parity—and in many ways beyond—other modern expense tools.
