import { ExpenseStatus, ExpenseCategory } from './enums';
import { Receipt } from './receipt.model';
import { User } from './user.model';

/**
 * Expense model matching the database schema
 * Represents a single expense claim with receipt and policy validation
 */
export interface Expense {
  /** UUID primary key */
  id: string;
  /** Organization ID (tenant isolation) */
  organization_id: string;
  /** User who created the expense */
  user_id: string;
  /** Associated receipt (optional) */
  receipt_id?: string;

  // Expense details
  /** Merchant or vendor name */
  merchant: string;
  /** Expense amount (must be > 0) */
  amount: number;
  /** Currency code (default: USD) */
  currency: string;
  /** Expense category */
  category: ExpenseCategory | string;
  /** Date when expense occurred (ISO date string) */
  expense_date: string;
  /** Optional notes or description */
  notes?: string;

  // Status
  /** Current workflow status */
  status: ExpenseStatus;
  /** Whether expense is eligible for reimbursement */
  is_reimbursable: boolean;
  /** Timestamp when expense was submitted */
  submitted_at?: string;
  /** Timestamp when expense was marked as reimbursed */
  reimbursed_at?: string;
  /** User ID who processed reimbursement */
  reimbursed_by?: string;

  // Policy
  /** Policy violations detected by database trigger */
  policy_violations: PolicyViolation[];

  // Audit
  /** Timestamp when expense was created */
  created_at: string;
  /** Timestamp when expense was last updated */
  updated_at: string;

  // Relations (populated by query)
  /** User object (populated) */
  user?: User;
  /** Receipt object (populated) */
  receipt?: Receipt;
}

/**
 * Policy violation detected by database trigger
 * Violations are warnings, not blocking (soft enforcement)
 */
export interface PolicyViolation {
  /** Policy rule identifier (e.g., 'max_single_receipt', 'max_daily_total') */
  rule: string;
  /** Policy limit value */
  limit?: number;
  /** Actual value that violated the policy */
  actual?: number;
  /** Human-readable violation message */
  message: string;
}

/**
 * Expense with guaranteed user relationship populated
 * Used when user data is always needed (e.g., finance dashboard)
 */
export interface ExpenseWithUser extends Expense {
  user: User;
}

/**
 * DTO for creating a new expense
 * Used by expense creation forms
 */
export interface CreateExpenseDto {
  organization_id: string;
  merchant: string;
  amount: number;
  category: string;
  expense_date: string;
  notes?: string;
  receipt_id?: string;
}

/**
 * DTO for updating an existing expense
 * All fields are optional for partial updates
 */
export interface UpdateExpenseDto {
  merchant?: string;
  amount?: number;
  category?: string;
  expense_date?: string;
  notes?: string;
  receipt_id?: string | null;
  status?: ExpenseStatus;
  submitted_at?: string;
}

/**
 * Filter options for expense queries
 * Used by expense list and finance dashboard
 */
export interface ExpenseFilters {
  /** Filter by status (single value or array) */
  status?: ExpenseStatus | ExpenseStatus[];
  /** Filter by user ID */
  user_id?: string;
  /** Filter by date range (from) */
  date_from?: string;
  /** Filter by date range (to) */
  date_to?: string;
  /** Filter by category */
  category?: string;
  /** Filter by merchant name (partial match) */
  merchant?: string;
  /** Filter by minimum amount */
  min_amount?: number;
  /** Filter by maximum amount */
  max_amount?: number;
}

/**
 * Sort options for expense queries
 * Determines column and direction for ordering results
 */
export interface ExpenseSortOptions {
  /** Field to sort by */
  field: 'expense_date' | 'amount' | 'created_at' | 'merchant';
  /** Sort direction */
  direction: 'asc' | 'desc';
}
