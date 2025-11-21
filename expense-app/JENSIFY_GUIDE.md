---
title: Jensify Expense & Receipt App
subtitle: How Jensify Works – Product Guide
---

# Jensify – How It Works

Jensify is a modern expense and receipt application, similar to Expensify and other leading tools. Employees upload receipts and create expenses, then bundle them into **expense reports** for submission; approvers and finance teams review whole reports, approve or reject, and then mark reports as reimbursed.

This document explains how Jensify works today for each role and outlines upcoming features.

---

## 1. Layout & Navigation

### 1.1 Global Layout

After logging in, users see a consistent three-part layout:

- **Top bar** – Jensify logo on the left, a central area reserved for search, and a right section with notifications, the user’s name/email, and a user menu with **Sign Out**.
- **Sidebar navigation** – A collapsible vertical menu on the left.
- **Main content area** – The central pane where pages (dashboard, expenses, approvals, etc.) are displayed.

Forms across the app (login, expense forms, filters) use a consistent Material “fill” appearance so labels sit cleanly above fields without divider lines cutting through the text.

### 1.2 Sidebar Navigation

The sidebar can be:

- **Expanded** – icons and text labels, with a width of about 180px so labels are readable.
- **Collapsed** – only icons, to save horizontal space.

Typical navigation entries include:

- **Dashboard** – Home dashboard (`/home`).
- **Upload Receipt** – Receipt upload screen (`/expenses/upload`).
- **Receipts** – Personal receipt library (`/receipts`).
- **My Expenses** – List of the user’s expenses (`/expenses`).
- **New Expense** – Create a new expense (`/expenses/new`).
- **Approvals** – Approval queue (`/approvals`, approvers/finance/admin only).
- **Finance Dashboard** – Reimbursement dashboard (`/finance/dashboard`, finance/admin only).

The brand header (“Jensify”) is always visible at the top; a small footer section anchors shortcuts at the bottom.

---

## 2. Roles

Jensify primarily supports two roles today, with a third (managers) planned:

- **Employees**
  - Upload and manage receipts.
  - Create and track expenses.
  - See statuses such as Draft, Submitted, Approved, Reimbursed, and Rejected.

- **Approvers / Finance**
  - Review submitted expenses.
  - View receipts.
  - Approve or reject expenses.
  - Mark approved expenses as reimbursed.

- **Managers** (planned)
  - Will review and approve expenses for their direct reports before finance sees them.

---

## 3. Employee Experience

### 3.1 Home Dashboard

**Route:** `/home`

The **Home Dashboard** is the employee’s starting point after login.

Key features:

- **Greeting** – A hero section welcomes the user (e.g., “Hi, Alex”).
- **Quick actions**
  - **Add Receipt** – Opens the upload screen.
  - **New Expense** – Opens the expense form.
  - **Review Approvals** – Shown only for users with approver/finance permissions.
- **Metrics card** – Summaries of the user’s expenses, such as:
  - Drafts.
  - Submitted.
  - Reimbursed.
- **“Next Up” guidance** – A card that explains the workflow (upload receipts, then create expenses) and links directly to those actions.
- **Recent activity** – A list of the user’s most recent expenses (e.g., four latest) with date, status, and amount.

The dashboard answers “What should I do next?” and provides one-click access to common tasks.

### 3.2 Uploading Receipts (Upload-First Flow)

**Route:** `/expenses/upload`

Employees can upload receipts before or during expense creation.

Step-by-step:

1. **Open the upload screen**
   - From the sidebar via **Upload Receipt**, or
   - From the dashboard quick action.
2. **Select a file**
   - Drag and drop a file into the upload zone, or
   - Use the file picker (and, on some devices, camera capture).
3. **Validation**
   - The app checks file type (e.g., image or PDF) and file size against limits.
4. **Upload**
   - The file is stored in a Supabase Storage bucket named `receipts`.
   - A row is inserted into the `receipts` table with:
     - File path, name, MIME type, and size.
     - `ocr_status` set to `pending` (for future OCR and auto-fill).
5. **Redirect to New Expense**
   - After a successful upload, Jensify redirects to:
     - `/expenses/new?receiptId=<new_receipt_id>`
   - The uploaded receipt is ready to be attached to a new expense.

This “upload first” flow mirrors the behavior of tools like Expensify and sets up future OCR features.

### 3.3 Creating a New Expense

**Route:** `/expenses/new`

Users can reach this page via:

- Dashboard quick action (**New Expense**).
- Sidebar link (**New Expense**).
- Button in the **Receipts** list (**Create Expense**).
- Automatic redirect after a successful receipt upload.

#### 3.3.1 Form Fields

The expense form includes:

- **Merchant** – Vendor or merchant name.
- **Amount** – Monetary amount of the expense.
- **Category** – Expense category (e.g., Travel, Meals, Office).
- **Date** – Date of the expense.
- **Notes** – Optional free-text notes.
- **Attached receipt** – Optional, but often required in practice.

All fields use consistent, clean Material form styling.

#### 3.3.2 With an Existing Receipt

If the route includes `?receiptId=<id>`:

- The form:
  - Loads the referenced receipt.
  - Shows an **Attached Receipt** card with:
    - File name, type, and size.
    - A **View** button that opens the receipt via a secure, short-lived URL.
    - A **Remove** button that unlinks the receipt from this expense (without deleting it).

#### 3.3.3 Without a Receipt

If there is no `receiptId` in the URL:

- The form opens without an attached receipt.
- The user can:
  - Create a draft expense without a receipt (policy-dependent), and/or
  - Attach a receipt using the Attach Receipt dialog (see below).

#### 3.3.4 Saving the Expense

- Submitting the form creates a new expense with **status `draft`**.
- Drafts appear in the dashboard metrics and the **My Expenses** list.
- Jensify automatically places every new draft into the current month’s auto-created report (creating one if needed). Employees can still move expenses to other reports later, but nobody has to remember to build the default report by hand.
- A future enhancement will add an explicit **Submit for Approval** action.

### 3.4 Attaching or Changing a Receipt

On the expense form, users can attach or change receipts via an **Attach Receipt** dialog.

When the user clicks **Attach receipt** or **Change receipt**:

1. A dialog opens with two tabs:
   - **Upload New**
   - **Choose Existing**
2. **Upload New** tab:
   - The user selects a file and uploads it.
   - The app uses the same upload logic as the dedicated upload page.
   - On success, the dialog closes and the new receipt is linked to the expense.
3. **Choose Existing** tab:
   - The dialog loads all receipts owned by the current user.
   - Each item shows file name, type, and size, with a **Select** button.
   - Selecting a receipt closes the dialog and attaches it to the expense.

Removing a receipt from an expense only breaks the association; the underlying receipt remains available in the user’s receipt library.

### 3.5 Receipts Library

**Route:** `/receipts`

The **Receipts** page is a personal library of all uploaded receipts.

Features:

- Shows all receipts belonging to the logged-in user.
- For each receipt:
  - Displays an icon, file name, type, and size.
  - **View** – Opens the receipt via a secure signed URL.
  - **Create Expense** – Opens the new expense form with the receipt pre-linked:
    - `/expenses/new?receiptId=<receipt_id>`
- Loading and empty states are handled gracefully.

This page is ideal for workflows where users upload multiple receipts in bulk and create expenses later.

### 3.6 My Expenses

**Route:** `/expenses`

The **My Expenses** page is a comprehensive view of all expenses created by the user.

#### 3.6.1 Filtering and Search

Users can filter and search by:

- **Status** – Draft, Submitted, Approved, Reimbursed, Rejected.
- **Merchant or notes** – Text search.
- **Category** – Expense category.
- **Date range** – From and to dates.
- **Amount range** – Minimum and maximum amount.

Filters can be combined to narrow down the list.

#### 3.6.2 Expense Cards / Rows

Each expense entry shows:

- **Receipt indicator**
  - Thumbnail or icon if a receipt is attached.
  - Placeholder icon when no receipt is available.
- **Details**
  - Merchant, date, category, and notes (truncated if long).
  - A colored status badge displaying Draft, Submitted, Approved, Reimbursed, or Rejected.
- **Amount**
  - Formatted currency in a dedicated column.

#### 3.6.3 Actions

Per-expense actions include:

- **View Receipt**
  - Enabled if a receipt is attached.
  - Opens the receipt via a signed URL.
  - Disabled and labeled “No Receipt” when no receipt is linked.
- **View Details**
  - Currently a visual placeholder; will link to a full detail view.
- **Edit**
  - Visual placeholder for a future edit flow.

#### 3.6.4 CSV Export

Users can export the filtered list of expenses as a CSV file.

Each CSV row includes:

- Expense ID.
- Merchant.
- Amount.
- Category.
- Expense date.
- Status.
- Whether a receipt is attached.
- Receipt file name (if any).
- Receipt URL (via a signed URL at export time).

The CSV is downloaded as a file that can be opened in Excel, Google Sheets, or other tools.

---

## 4. Approver & Finance Experience

### 4.1 Approval Queue

**Route:** `/approvals`

The **Approval Queue** is for approvers, finance, or admin users responsible for reviewing submitted expenses.

#### 4.1.1 Data Loaded

The page loads all expenses with **status `submitted`**, including:

- The expense itself.
- The submitting user’s information.

#### 4.1.2 Filters and Summary

Approvers can:

- Search by employee name, merchant, or notes.
- Filter by category, date range, and amount range.
- See summary metrics:
  - Number of submitted expenses.
  - Total submitted amount.

#### 4.1.3 Per-Expense View

For each submitted expense, approvers see:

- Employee name.
- Merchant, category, and date.
- Amount.
- Notes.
- Current status (Submitted).

#### 4.1.4 Actions

Approvers can:

- **View Receipt**
  - If a receipt is attached:
    - Opens it via a signed URL.
  - If no receipt:
    - Shows a message such as “No receipt attached.”
- **Approve**
  - Changes the expense status to **Approved**.
  - Moves the expense out of the submitted list and into the finance reimbursement queue.
- **Reject**
  - Changes the status to **Rejected**.
  - Removes the expense from the submission queue and exposes the rejection to the employee.

#### 4.1.5 Batch Actions

Approvers can select multiple expenses using checkboxes and perform:

- **Approve Selected**
- **Reject Selected**

Batch actions make it easy to process many small, straightforward expenses quickly.

### 4.2 Finance Dashboard

**Route:** `/finance/dashboard`

The **Finance Dashboard** focuses on expenses that have been approved and are waiting for reimbursement.

#### 4.2.1 Data Loaded

The page loads all expenses with **status `approved`**.

#### 4.2.2 Metrics

Finance users see:

- The count of approved, unreimbursed expenses.
- The total amount pending reimbursement.

#### 4.2.3 Per-Expense View

For each expense in the reimbursement queue:

- Employee name and possibly department.
- Merchant, category, and dates (expense date and approval date where applicable).
- Amount and status (Approved).

#### 4.2.4 Actions

Finance users can:

- **Mark as Reimbursed**
  - Changes the status to **Reimbursed**.
  - Typically records reimbursement metadata (e.g., who reimbursed and when).
  - Removes the expense from the unreimbursed list.
- **Mark All as Reimbursed**
  - Bulk action for all eligible expenses in the current view.

#### 4.2.5 CSV Export

- Finance admins can export the current approved reports queue to CSV.
- Each row in the CSV represents an **expense line** with:
  - Report metadata (name, status, submitted/approved timestamps).
  - Employee name/email.
  - Expense details (merchant, category, amount, date, notes).
  - Receipt count, filenames, and signed URLs for download.
- Exports use 24‑hour signed URLs so receipts remain accessible while staying private in storage.
- When report statuses change (Approved, Rejected, Paid), Jensify also emits in-app notifications (respecting user notification preferences). Employees see alerts from their Reports list, while finance can rely on the dashboard metrics.

---

## 5. Status Lifecycle

Jensify uses explicit statuses to track each expense through its lifecycle:

- **Draft**
  - Created by the employee but not yet submitted.
  - Fully editable by the employee.
  - Appears in the dashboard metrics and My Expenses.

- **Submitted**
  - Indicates the employee submitted the expense for approval.
  - Appears in the Approval Queue for approvers/finance.

- **Approved**
  - Indicates an approver has approved the expense.
  - Moves into the Finance Dashboard reimbursement queue.

- **Reimbursed**
  - Indicates the expense has been paid out.
  - No longer appears in the reimbursement queue.
  - Shows as reimbursed in the employee’s view.

- **Rejected**
  - Indicates the expense was rejected by an approver.
  - Appears as rejected for the employee, who can review and potentially edit and resubmit in the future.

Receipts are independent records linked to expenses by a `receipt_id`. Unlinking a receipt from an expense does not delete the underlying receipt.

---

## 6. Upcoming Features & Roadmap

Several enhancements are planned to make Jensify more powerful and closer to (or better than) competing tools like Expensify.

### 6.1 Phase 1 – Close the Core Loop

1. **Expense Detail Page (`/expenses/:id`)**
   - Dedicated page for a single expense:
     - All fields, including merchant, date, amount, category, notes, status, and full history.
     - Large receipt preview with zoom or full-screen view.
   - Role-specific actions:
     - Employee: edit, attach/change receipts, submit drafts for approval.
     - Approver: approve or reject directly.
     - Finance: view context before reimbursement.

2. **Edit Expense Flow**
   - Hook the **Edit** button to an edit route or inline editing on the detail page.
   - Use the same form as New Expense, prefilled with existing data.
   - Respect status:
     - Draft/Rejected: fully editable by the employee.
     - Submitted/Approved/Reimbursed: read-only or limited edits, depending on policy.

3. **Explicit Submit for Approval**
   - Add clear actions such as **Save Draft** and **Submit for Approval**.
   - Ensure submitting moves expenses from Draft to Submitted status and into the Approval Queue.

4. **Complete Finance CSV Export (shipped)**
   - The Finance Dashboard export now outputs one row per expense line with:
     - Employee details (name, email).
     - Merchant, category, amount, currency, and key dates.
     - Receipt count, filenames, and signed URLs (valid for 24 hours).
     - Report metadata so finance can reconcile payouts quickly.

### 6.2 Phase 2 – Manager Workflows & Compliance

5. **Manager-Level Approvals**
   - Add a manager approvals queue (e.g., `/manager/approvals`).
   - Flow:
     - Employee submits an expense → appears first in the manager’s queue.
     - Manager approves → moves to the finance Approval Queue.
     - Manager rejects → returns to the employee as Rejected.
   - Uses relationships like `users.manager_id` to route approvals.

6. **Missing Receipt Enforcement**
   - Highlight expenses with no receipt in My Expenses and Approvals.
   - Provide filters such as “Only show expenses without receipts.”
   - Configurable rule:
     - Block approvals without receipts, or
     - Allow but require explicit confirmation.
   - Dashboard metrics showing counts of submitted expenses missing receipts.

### 6.3 Phase 3 – Productivity & Intelligence

7. **OCR & Auto-Fill**
   - Use the existing `ocr_status` to integrate OCR:
     - Trigger a Supabase Edge Function after each upload.
     - Extract merchant, date, amount, tax, and possibly currency.
   - When a receipt is attached and OCR is complete:
     - Pre-fill those fields on the expense form.
     - Highlight uncertain values for user review.

8. **Multi-Receipt Support**
   - Introduce an `expense_receipts` join table to support multiple receipts per expense.
   - Update the Attach Receipt dialog to allow attaching multiple files.
   - Show a receipts list or chips in the expense detail view with **View** and **Remove** actions.

### 6.4 Phase 4 – Polishing & Nice-to-Haves

9. **Global Search**
   - Add search to the top bar to find:
     - Expenses by merchant, amount, or notes.
     - Receipts by file name.
   - Provide quick navigation into expense and receipt details.

10. **UI Polish**
    - Refine spacing, typography, and empty/loading states across all pages.
    - Add subtle transitions and hover states while keeping the clean, modern aesthetic.
    - Ensure mobile and tablet layouts remain easy to use.

---

## 7. Summary

Jensify already delivers a full expense lifecycle:

- Employees upload receipts, create expenses, and track their statuses.
- Approvers and finance staff review submissions, approve or reject, and mark expenses as reimbursed.

The roadmap focuses on:

- Making the core loop (create → submit → approve → reimburse) more explicit and user-friendly.
- Adding manager-level approvals and enforcement for missing receipts.
- Introducing OCR-based auto-fill and multi-receipt support.
- Enhancing reporting and exports for finance teams.

Together, these features will bring Jensify in line with, and in many ways beyond, existing expense tools.
