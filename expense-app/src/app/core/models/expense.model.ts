import { ExpenseStatus, ExpenseCategory } from './enums';
import { Receipt } from './receipt.model';
import { User } from './user.model';

export interface Expense {
  id: string;
  user_id: string;
  receipt_id?: string;

  // Expense details
  merchant: string;
  amount: number;
  currency: string;
  category: ExpenseCategory | string;
  expense_date: string;
  notes?: string;

  // Status
  status: ExpenseStatus;
  is_reimbursable: boolean;
  submitted_at?: string;
  reimbursed_at?: string;
  reimbursed_by?: string;

  // Policy
  policy_violations: PolicyViolation[];

  // Audit
  created_at: string;
  updated_at: string;

  // Relations (populated)
  user?: User;
  receipt?: Receipt;
}

export interface PolicyViolation {
  rule: string;
  limit?: number;
  actual?: number;
  message: string;
}

export interface ExpenseWithUser extends Expense {
  user: User;
}

export interface CreateExpenseDto {
  merchant: string;
  amount: number;
  category: string;
  expense_date: string;
  notes?: string;
  receipt_id?: string;
}

export interface UpdateExpenseDto {
  merchant?: string;
  amount?: number;
  category?: string;
  expense_date?: string;
  notes?: string;
  status?: ExpenseStatus;
}

export interface ExpenseFilters {
  status?: ExpenseStatus | ExpenseStatus[];
  user_id?: string;
  date_from?: string;
  date_to?: string;
  category?: string;
  merchant?: string;
  min_amount?: number;
  max_amount?: number;
}

export interface ExpenseSortOptions {
  field: 'expense_date' | 'amount' | 'created_at' | 'merchant';
  direction: 'asc' | 'desc';
}
