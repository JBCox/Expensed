# Jensify vs. Expensify – Parity Checklist

This checklist maps the features described in the “Jens Instructions” (Expensify user guide) to Jensify’s current and planned functionality.

Legend:
- ✅ Implemented in Jensify today
- 🟡 Planned / partially supported
- ❌ Not implemented yet

---

## 1. Access, Sign-In, and Dashboard

- ✅ Email invite and sign-in with email + password  
  - Jensify supports account creation and login via Supabase Auth.

- ✅ Web-based setup and use  
  - Jensify is a web app accessible via browser.

- ✅ Dashboard/home screen after sign-in  
  - Users land on the Dashboard with quick actions, metrics, and recent activity.

- ❌ “Should I alert you when receipts/reports need attention?” prompt  
  - There is no onboarding prompt for alert preferences.

- ❌ Notification/alert settings (enable/disable alerts)  
  - No dedicated UI for configuring in-app or email notifications.

---

## 2. Receipt Capture and SmartScan/OCR

- ✅ Capture/upload receipt images or PDFs  
  - Web UI supports uploading receipts and attaching them to expenses.

- ✅ “Upload first, create expense later” flow  
  - Receipts library and “Create Expense” from a receipt are implemented.

- 🟡 SmartScan/OCR concept  
  - Data model includes `ocr_status` on receipts, but:
    - No actual OCR pipeline is connected.
    - No auto-fill of merchant/date/amount from OCR yet.

- ❌ Messaging like “Ready to SmartScan your first receipt?”  
  - No explicit SmartScan language or guided first-time experience.

- ❌ User-facing “working on extracting details / check back later” state  
  - No visible “processing” vs “completed” receipt processing status.

- ❌ Alerts when receipt processing finishes  
  - No notifications when OCR (once implemented) completes.

---

## 3. Mileage Reimbursement and GPS/Location

From the Expensify doc: “Start Trip”, “Stop Trip”, “Code Trip”, enabling location, splitting trips by location/practice, etc.

- ❌ Location permission / GPS usage in the app  
  - Jensify does not request location or use GPS today.

- ❌ Start/Stop trip flow  
  - No “Start Trip”, “Stop Trip”, or mileage recording UI.

- ❌ Mileage entities and rates  
  - No data model for trips, mileage logs, or IRS reimbursement rates.

- ❌ Splitting a trip across multiple locations (single practice vs multi-practice)  
  - No UI or logic for splitting mileage by location.

- ❌ Guidance that “mileage must be recorded in real time via the app only”  
  - No real-time mileage capture, nor policy enforcement around it.

---

## 4. Expense Reports (Containers for Expenses)

The Expensify guide talks about “Expense Reports”, including:
- Reports combining mileage + other expenses.
- Reports with only expenses (no mileage).
- Auto-submission on Sundays.

- ✅ Report objects (collections of expenses)  
  - Jensify now lets employees group expenses into reports, edit draft reports, and submit the entire report for approval.

- ❌ Separate flows:
  - “Expenses with Mileage”  
  - “Expenses ONLY – No Mileage”  
  - Jensify does not distinguish reports this way.

- ✅ Report-level submission and status  
  - Reports move through Draft → Submitted → Approved → Paid/Reimbursed, and employees/approvers/finance work from the report queues.

- ❌ Weekly auto-submission of reports (e.g., Sunday)  
  - No scheduled jobs that auto-submit anything based on calendar rules.

---

## 5. Coding Expenses and Policy Violations

The guide shows a “Fix Violations” workflow and policy-driven blocking of submissions.

- ✅ Basic expense coding  
  - Jensify lets users set merchant, category, date, amount, location-like fields, and notes.

- ❌ Policy engine for automatic violations  
  - No rule system (e.g., required fields, limits, allowed categories/locations).

- ❌ Violation banners like “You have violations blocking $X.xx from being submitted.”  
  - No violation banners or per-amount blocking messages.

- ❌ “Fix Violations” action  
  - No dedicated button or flow to step through violations and correct them.

- ❌ Guided fix screens for category/location/description violations  
  - Jensen forms don’t highlight fields as “violations” that must be fixed before submission.

- ❌ Auto-submission once violations are resolved  
  - No automation that re-checks and submits when all violations are cleared.

---

## 6. Status Handling and Weekly Timing

The Expensify doc references:
- Scheduled auto-submit Sundays.
- Weekly deadlines (“expenses without mileage need to be added by Friday”).

- ✅ Expense statuses: Draft / Submitted / Approved / Reimbursed / Rejected  
  - Jensify tracks these statuses for each expense.

- 🟡 Manual submission/approval  
  - Draft → Submitted → Approved/Rejected → Reimbursed flows exist, but submission is manual and not yet exposed as a clear “Submit for Approval” button in the UI.

- ❌ Weekly deadlines and reminders (e.g., “add expenses by Friday”)  
  - No rules or reminders tied to weekdays or cutoff times.

- ❌ Auto-submission on a specific day (e.g., Sunday)  
  - No scheduled batch submission logic.

---

## 7. Corporate Card Management

The guide mentions managing corporate cards along with reimbursements.

- ❌ Corporate card account setup  
  - Jensify has no concept of corporate card accounts.

- ❌ Card transaction import (feeds or CSV)  
  - No pipeline for importing card transactions.

- ❌ Matching card transactions to receipts/expenses  
  - No matching UI or logic for pairing card spend with receipts.

---

## 8. Mobile-Specific UX

The Expensify doc is mobile-first (hamburger menu on top left, “+” button on top right, etc.).

- 🟡 Responsive web UI  
  - Jensify is built as a responsive web app (works on smaller screens), but:
    - Does not mimic the exact “mobile app” UI from the guide.

- ❌ Native mobile app with GPS/background tracking  
  - No dedicated native mobile app or background trip tracking.

---

## 9. Notifications and Alerts

Throughout the guide, alerts are used to:
- Tell users when SmartScan is finished.
- Highlight violations.
- Confirm auto-submission status.

- ❌ In-app notification center  
  - Jensify shows some statuses inside pages but has no central alert area.

- ❌ Email or push alerts tied to events  
  - No event-based notification system (e.g., “receipt processed”, “expense rejected”).

- ❌ User-configurable alert preferences  
  - No settings for “alert me when receipts/reports need attention”.

---

## 10. Where Jensify Already Matches or Exceeds

These areas are already strong or on par with what the Expensify guide expects:

- ✅ Clean web UI with dashboard, navigation, and clear expense statuses.
- ✅ Receipts library with the ability to create expenses from existing receipts.
- ✅ Upload-first flow that immediately guides users into creating an expense.
- ✅ Distinct flows and views for:
  - Employees (Dashboard, Upload Receipt, New Expense, Receipts, My Expenses).
  - Approvers (Approval Queue).
  - Finance (Reimbursement Dashboard).
- ✅ CSV export for employee expense lists (finance export planned).

---

## 11. Suggested Next Implementation Phases

If the goal is to get close to feature parity with the “Jens Instructions” guide, the next steps could be:

1. **SmartScan/OCR + basic alerts**  
   - Wire OCR to receipts and show a clear “processing / done” state.  
   - Add minimal notifications (e.g., snackbar + optional email) when processing completes.

2. **Mileage module (trips + rates)**  
   - Add simple trip logging and manual mileage entry first, then consider GPS integration.

3. **Expense reports + Sunday auto-submit**  
   - Introduce “reports” that group expenses, with optional weekly auto-submit.

4. **Policy engine and “Fix Violations” flow**  
   - Add rule-based violations and a guided fix workflow.

5. **Corporate card and stronger notifications**  
   - Build card transaction import/matching and more robust alert preferences.

This checklist can be used as a living document: as features ship, update items from ❌/🟡 to ✅.***
