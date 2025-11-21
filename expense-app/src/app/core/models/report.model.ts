/**
 * Expense Report Models
 *
 * Defines the data structures for expense reports that group
 * multiple expenses together for batch submission (like Expensify).
 *
 * @module core/models/report.model
 */

import { Expense } from './expense.model';

/**
 * Expense Report Status
 * Tracks the lifecycle of an expense report
 */
export enum ReportStatus {
  DRAFT = 'draft',         // Being created/edited by employee
  SUBMITTED = 'submitted', // Submitted for manager approval
  APPROVED = 'approved',   // Approved by manager
  REJECTED = 'rejected',   // Rejected by manager
  PAID = 'paid'           // Reimbursed by finance
}

/**
 * Expense Report
 * Container that groups multiple expenses for batch submission
 *
 * @example
 * ```typescript
 * const report: ExpenseReport = {
 *   id: '123',
 *   organization_id: 'org-456',
 *   user_id: 'user-789',
 *   name: 'Dallas Business Trip - Nov 2025',
 *   description: 'Client meetings and conference',
 *   start_date: '2025-11-10',
 *   end_date: '2025-11-12',
 *   status: ReportStatus.DRAFT,
 *   total_amount: 1250.75,
 *   currency: 'USD',
 *   created_at: '2025-11-13T10:00:00Z',
 *   updated_at: '2025-11-13T10:00:00Z'
 * };
 * ```
 */
export interface ExpenseReport {
  /** Unique report identifier (UUID) */
  id: string;

  /** Organization this report belongs to */
  organization_id: string;

  /** User who created the report */
  user_id: string;

  // Report metadata
  /** Report name (e.g., "Dallas Business Trip - Nov 2025") */
  name: string;

  /** Optional description of the report purpose */
  description?: string;

  /** Start date of the expense period (YYYY-MM-DD) */
  start_date?: string;

  /** End date of the expense period (YYYY-MM-DD) */
  end_date?: string;

  // Status tracking
  /** Current status of the report */
  status: ReportStatus;

  // Financial summary
  /** Total amount of all expenses in report (auto-calculated) */
  total_amount: number;

  /** Currency code (ISO 4217, default: USD) */
  currency: string;

  // Workflow tracking
  /** When the report was submitted for approval */
  submitted_at?: string;

  /** User who submitted the report */
  submitted_by?: string;

  /** When the report was approved */
  approved_at?: string;

  /** Manager who approved the report */
  approved_by?: string;

  /** When the report was rejected */
  rejected_at?: string;

  /** Manager who rejected the report */
  rejected_by?: string;

  /** When the report was marked as paid */
  paid_at?: string;

  /** Finance user who marked as paid */
  paid_by?: string;

  /** Reason for rejection (if status is rejected) */
  rejection_reason?: string;

  // Audit fields
  /** When the report was created */
  created_at: string;

  /** When the report was last updated */
  updated_at: string;

  // Relations (populated by joins)
  /** List of expenses in this report (via junction table) */
  report_expenses?: ReportExpense[];

  /** Total count of expenses in report */
  expense_count?: number;

  /** Auto-created flag for monthly reports */
  auto_created?: boolean;

  /** Monthly period key (YYYY-MM) for auto-created reports */
  auto_report_period?: string | null;

  /** Owner info (joined) */
  user?: {
    id: string;
    full_name?: string;
    email?: string;
  };
}

/**
 * Report-Expense Junction Table Record
 * Links an expense to a report with ordering information
 */
export interface ReportExpense {
  /** Junction record ID */
  id: string;

  /** Report this expense belongs to */
  report_id: string;

  /** Expense being added to the report */
  expense_id: string;

  /** Display order within the report (0-based) */
  display_order: number;

  /** When the expense was added to the report */
  added_at: string;

  /** User who added the expense to the report */
  added_by?: string;

  // Relations (populated by joins)
  /** Full expense object (if joined) */
  expense?: Expense;

  /** Full report object (if joined) */
  report?: ExpenseReport;
}

/**
 * Data Transfer Object for creating a new report
 */
export interface CreateReportDto {
  /** Report name (required) */
  name: string;

  /** Optional description */
  description?: string;

  /** Optional start date (YYYY-MM-DD) */
  start_date?: string;

  /** Optional end date (YYYY-MM-DD) */
  end_date?: string;

  /** Initial expense IDs to add to report (optional) */
  expense_ids?: string[];
}

/**
 * Data Transfer Object for updating a report
 */
export interface UpdateReportDto {
  /** Updated report name */
  name?: string;

  /** Updated description */
  description?: string;

  /** Updated start date */
  start_date?: string;

  /** Updated end date */
  end_date?: string;

  /** Updated status (for workflow transitions) */
  status?: ReportStatus;

  /** Rejection reason (when rejecting) */
  rejection_reason?: string;
}

/**
 * Report statistics
 * Aggregated data about a report
 */
export interface ReportStats {
  /** Number of expenses in the report */
  expense_count: number;

  /** Total amount of all expenses */
  total_amount: number;

  /** List of expense categories in the report */
  categories: string[];
}

/**
 * Report filter options for listing reports
 */
export interface ReportFilterOptions {
  /** Filter by status */
  status?: ReportStatus;

  /** Filter by user ID */
  user_id?: string;

  /** Filter by date range (start) */
  start_date?: string;

  /** Filter by date range (end) */
  end_date?: string;

  /** Search query (name or description) */
  search?: string;

  /** Sort field */
  sort_by?: 'created_at' | 'updated_at' | 'submitted_at' | 'approved_at' | 'total_amount' | 'name';

  /** Sort direction */
  sort_order?: 'asc' | 'desc';

  /** Pagination: page number (0-based) */
  page?: number;

  /** Pagination: items per page */
  limit?: number;
}
