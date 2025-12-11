# How Expensed Works

Expensed is a modern expense and receipt application, similar to tools like Expensify. Employees upload receipts and create expenses; those expenses are grouped into **expense reports** that are submitted for approval; approvers and finance teams approve/reject reports and then mark them as reimbursed.

This document gives a detailed overview of how Expensed works today for each role.

---

## 1. Layout & Navigation

### 1.1 Global Layout

After logging in, users see a consistent three-part layout:

- **Top bar** - Expensed logo on the left, a central area reserved for search, and a right section with notifications, the user name/email, and a Sign Out option.
- **Sidebar navigation** - A collapsible vertical menu on the left: expanded shows icons and text; collapsed shows icons only.
- **Main content area** - The central pane where pages (dashboard, expenses, approvals, finance) are displayed.

### 1.2 Sidebar Navigation

Common navigation entries:

- **Dashboard** - Home dashboard (/home).
- **Upload Receipt** - Receipt upload screen (/expenses/upload).
- **Receipts** - Personal receipt library (/receipts).
- **My Expenses** - User own expenses (/expenses).
- **New Expense** - Create a new expense (/expenses/new).
- **Mileage** - Mileage tracking with GPS (/mileage).
- **Reports** - Expense reports (/reports).
- **Approvals** - Approval queue (/approvals, managers/finance/admin only).
- **Finance Dashboard** - Reimbursement dashboard (/finance/dashboard, finance/admin only).

---

## 2. Roles

### 2.1 Employees

- Upload and manage receipts with automatic OCR extraction.
- Create and track expenses with multiple receipts per expense.
- Log mileage trips with GPS tracking.
- Group expenses into reports for submission.
- See statuses like Draft, Submitted, Approved, Reimbursed, and Rejected.

### 2.2 Managers

- Review and approve expenses for their direct reports.
- Part of the multi-level approval workflow (Manager to Finance to Admin).
- Can approve or reject with comments.

### 2.3 Finance

- Review submitted expenses after manager approval.
- View receipts and mileage logs.
- Approve or reject expenses.
- Mark approved expenses as reimbursed.
- Export detailed CSV reports.

### 2.4 Admins

- Configure approval workflows and organization settings.
- Manage users and roles.
- Access all approval and finance functions.
- Set up amount-based approval thresholds.
- Customize organization branding (logo, colors).

---

## 3. Employee Experience

### 3.1 Home Dashboard (/home)

After login, users land on the Home Dashboard with quick actions, metrics, and recent activity.

### 3.2 Uploading Receipts (/expenses/upload)

Upload flow with automatic OCR:

1. Select a file (drag/drop or file picker)
2. File uploaded to Supabase Storage
3. Google Vision API extracts merchant, amount, date, tax
4. Redirects to expense form with auto-filled fields

### 3.3 Creating a New Expense (/expenses/new)

Form fields include:
- Merchant (auto-filled from OCR)
- Amount (auto-filled from OCR)
- Category (Fuel, Meals, Lodging, Airfare, etc.)
- Date (auto-filled from OCR)
- Notes (optional)
- Attached receipts - supports multiple receipts per expense

### 3.4 Expense Reports (/reports)

Expenses are grouped into expense reports (Expensify-style):
- Auto-creates a draft monthly report for each user
- Submit entire report for approval
- Report workflow: Draft to Submitted to Approved to Paid/Reimbursed

### 3.5 Mileage Tracking (/mileage)

Two modes:
- **Quick Entry**: Manual entry with origin, destination, distance
- **GPS Tracking**: Real-time start/stop tracking with live route visualization

Features:
- Google Maps integration for geocoding and routing
- IRS rate calculation (current federal rate)
- Trip history with status tracking

---

## 4. Approver and Finance Experience

### 4.1 Multi-Level Approval Workflow

Configurable multi-level approval workflows:
1. Manager Approval - Direct manager reviews team expenses
2. Finance Approval - Finance team reviews after manager approval
3. Admin Approval - Optional additional approval for high-value expenses

Features:
- Sequential approval steps
- Amount-based thresholds (e.g., expenses over $500 require additional approval)
- Role-based routing
- Complete approval history timeline

### 4.2 Approval Queue (/approvals)

Shows all submitted reports awaiting approval with batch actions.

### 4.3 Finance Dashboard (/finance/dashboard)

Shows all approved expenses ready for reimbursement with CSV export and Stripe payout processing.

### 4.4 Stripe Payouts (/finance/payouts)

Finance and Admin users can process reimbursements directly via Stripe:

1. View approved expenses pending reimbursement
2. Select expenses to include in payout
3. Initiate Stripe ACH transfer to employee's bank account
4. Track payout status (pending → in_transit → paid)
5. Automatic expense status update to "reimbursed"

---

## 5. Employee Bank Accounts

### 5.1 Bank Account Setup (/profile/bank-accounts)

Employees link their bank accounts for direct deposit reimbursements:

1. Navigate to Profile > Bank Accounts
2. Click "Add Bank Account"
3. Enter routing number and account number (via Stripe.js - secure tokenization)
4. First account automatically set as default
5. Verify account via micro-deposits (optional)

### 5.2 Verification Flow

For accounts requiring verification:
1. Stripe sends two small deposits (e.g., $0.32 and $0.45)
2. Employee checks bank statement for amounts
3. Enter the amounts to verify account ownership
4. Account status changes from "Pending" to "Verified"

---

## 6. Admin Stripe Configuration

### 6.1 Setting Up Stripe (/organization/settings/payouts)

Admins configure the organization's Stripe integration:

1. Navigate to Organization Settings > Payout Settings
2. Enter Stripe API key (test or live mode)
3. Key is validated against Stripe API
4. Encrypted and stored securely (AES-256-GCM)
5. Status shows "Connected" with key mode (test/live)

### 6.2 Security Features

- API key encrypted at rest with AES-256-GCM
- Per-organization key isolation
- Rate limiting prevents abuse
- Complete audit trail for compliance
- Key rotation support

---

## 7. Organization Branding

### 7.1 Brand Settings (/organization/settings)

Admins can customize the organization's look and feel:

1. **Company Name** - Displayed throughout the app
2. **Brand Color** - Primary color applied to buttons, icons, charts, and UI accents
3. **Company Logo** - Displayed alongside Expensed logo in toolbar

### 7.2 Logo Requirements

- **Format:** PNG or SVG only (support transparent backgrounds)
- **Size:** 200-400px wide, max 2MB file size
- **Aspect ratio:** Horizontal logos work best (3:1 or 4:1)
- **Transparency:** Background must be removed before upload
- Tip: Use [remove.bg](https://remove.bg) for free background removal

### 7.3 Brand Color Application

The brand color is applied across the app:
- Primary buttons and action items
- Navigation highlights
- Charts and data visualizations
- The "$" symbol in the Expensed logo
- Status indicators and accents

All organization members see the same branding (employees, managers, finance, admins).

---

## 8. Status Lifecycle

- **Draft** - Created by employee; not yet submitted
- **Submitted** - Waiting for approval
- **Approved** - Approved by all required approvers
- **Reimbursed** - Paid out; complete
- **Rejected** - Returned to employee for revision

---

## 9. Database Security Architecture

### 9.1 Row-Level Security (RLS)

All data is protected by PostgreSQL Row-Level Security policies ensuring:
- **Complete data isolation** between organizations
- **Role-based access control** enforced at database level
- Users can only access data within their organization
- No possibility of cross-tenant data leakage

### 9.2 Function Security

All 42 database functions are hardened with:
- **Search path protection** (`SET search_path = public, pg_temp`) - prevents search path injection attacks
- **SECURITY DEFINER** mode with restricted permissions
- Proper input validation and sanitization

### 9.3 View Security

Database views use `security_invoker = true` to ensure:
- Views respect RLS policies of the querying user
- No privilege escalation through view access
- Consistent security model across direct queries and views

### 9.4 Performance-Optimized Security

RLS policies use an initplan optimization pattern for efficient query execution:
- Helper functions cache user context (`get_current_user_org_id()`, `is_current_user_org_admin()`)
- Subquery pattern prevents per-row function evaluation
- Foreign key indexes on all relationship columns for fast JOINs

### 9.5 Data Protection

- **Encryption at rest** for sensitive data (Stripe API keys use AES-256-GCM)
- **Audit logging** for compliance and security monitoring
- **Soft deletes** preserve data integrity and history

For technical implementation details, see FEATURES.md → "Database Security & Performance Hardening".

---

## 10. Key Features Summary

### Completed Features

| Feature | Description |
|---------|-------------|
| OCR and SmartScan | Google Vision API extracts merchant, amount, date, tax from receipts |
| Multi-Receipt Support | Multiple receipts per expense via junction table |
| Multi-Level Approvals | Configurable Manager to Finance to Admin workflow |
| Mileage Tracking | GPS tracking with Google Maps, IRS rate calculation |
| Expense Reports | Expensify-style batch grouping and submission |
| Progressive Web App | Installable on mobile/desktop with offline support |
| Organization Multi-Tenancy | Complete data isolation per organization |
| Organization Branding | Custom logo and brand color, dynamic Expensed logo coloring |
| Stripe Payment Integration | Secure API key storage, employee bank accounts, automated ACH payouts |
| Database Security | Function hardening, view security, RLS optimization, FK indexes |

### Future Enhancements

- Global Search - Search expenses and receipts from the top bar
- Advanced Analytics - Spending insights, trend analysis, budget tracking
- Integrations - QuickBooks, accounting software connections
- Corporate Cards - Card transaction import and reconciliation

---

## 11. Summary

Jensify provides a complete expense management lifecycle:

- **Employees** upload receipts (with OCR auto-fill), create expenses, attach multiple receipts, log mileage with GPS, link bank accounts, and submit reports for approval.
- **Managers** review and approve team expenses as part of the multi-level workflow.
- **Finance** processes final approvals and initiates Stripe payouts for reimbursement.
- **Admins** configure workflows, manage users, set up Stripe integration, customize branding, and oversee the organization.

The platform includes modern features like AI-powered OCR, GPS mileage tracking, PWA offline support, multi-level approvals, organization multi-tenancy, custom branding, and secure Stripe payment processing.

---

*Last Updated: December 10, 2024*
