import { Component, OnInit, OnDestroy, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ExpenseService } from '../../../core/services/expense.service';
import { SanitizationService } from '../../../core/services/sanitization.service';
import { Expense, ExpenseFilters } from '../../../core/models/expense.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExpenseStatus, ExpenseCategory } from '../../../core/models/enums';
import { StatusBadge, ExpenseStatus as BadgeStatus } from '../../../shared/components/status-badge/status-badge';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { LoadingSkeleton } from '../../../shared/components/loading-skeleton/loading-skeleton';
import { Router } from '@angular/router';

/**
 * Expense List Component
 * Displays all expenses for the current user with filtering, search, and summary
 */
@Component({
  selector: 'app-expense-list',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    ScrollingModule,
    StatusBadge,
    EmptyState,
    LoadingSkeleton
  ],
  templateUrl: './expense-list.html',
  styleUrl: './expense-list.scss',

  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpenseList implements OnInit, OnDestroy {
  // Cleanup
  private destroy$ = new Subject<void>();

  // State signals
  expenses = signal<Expense[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  // Selection state for batch operations
  selectedExpenseIds = signal<Set<string>>(new Set());
  submittingBatch = signal<boolean>(false);

  // Filter signals
  selectedStatus = signal<ExpenseStatus | 'all'>('all');
  searchQuery = signal<string>('');
  selectedCategory = signal<string | 'all'>('all');
  dateFrom = signal<Date | null>(null);
  dateTo = signal<Date | null>(null);
  minAmount = signal<number | null>(null);
  maxAmount = signal<number | null>(null);

  // Computed filtered expenses
  filteredExpenses = computed(() => {
    let result = this.expenses();

    // Filter by status
    const status = this.selectedStatus();
    if (status !== 'all') {
      result = result.filter(e => e.status === status);
    }

    // Filter by search query (merchant)
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      result = result.filter(e =>
        e.merchant.toLowerCase().includes(query) ||
        e.notes?.toLowerCase().includes(query)
      );
    }

    // Filter by category
    const category = this.selectedCategory();
    if (category !== 'all') {
      result = result.filter(e => e.category === category);
    }

    // Filter by date range
    const from = this.dateFrom();
    if (from) {
      result = result.filter(e => new Date(e.expense_date) >= from);
    }

    const to = this.dateTo();
    if (to) {
      result = result.filter(e => new Date(e.expense_date) <= to);
    }

    // Filter by amount range
    const min = this.minAmount();
    if (min !== null) {
      result = result.filter(e => e.amount >= min);
    }

    const max = this.maxAmount();
    if (max !== null) {
      result = result.filter(e => e.amount <= max);
    }

    return result;
  });

  // Computed summary metrics
  totalCount = computed(() => this.filteredExpenses().length);
  totalAmount = computed(() =>
    this.filteredExpenses().reduce((sum, e) => sum + e.amount, 0)
  );

  // Computed selection metrics
  draftExpenses = computed(() =>
    this.filteredExpenses().filter(e => e.status === ExpenseStatus.DRAFT)
  );
  selectedCount = computed(() => this.selectedExpenseIds().size);
  allDraftsSelected = computed(() => {
    const drafts = this.draftExpenses();
    if (drafts.length === 0) return false;
    return drafts.every(e => this.selectedExpenseIds().has(e.id));
  });

  // Enums for template
  readonly ExpenseStatus = ExpenseStatus;
  readonly ExpenseCategory = ExpenseCategory;

  // Status options for filter chips
  readonly statusOptions = [
    { value: 'all' as const, label: 'All' },
    { value: ExpenseStatus.DRAFT, label: 'Draft' },
    { value: ExpenseStatus.SUBMITTED, label: 'Pending' },
    { value: ExpenseStatus.APPROVED, label: 'Approved' },
    { value: ExpenseStatus.REJECTED, label: 'Rejected' },
    { value: ExpenseStatus.REIMBURSED, label: 'Reimbursed' }
  ];

  // Category options for dropdown
  readonly categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: ExpenseCategory.FUEL, label: ExpenseCategory.FUEL },
    { value: ExpenseCategory.MEALS, label: ExpenseCategory.MEALS },
    { value: ExpenseCategory.LODGING, label: ExpenseCategory.LODGING },
    { value: ExpenseCategory.AIRFARE, label: ExpenseCategory.AIRFARE },
    { value: ExpenseCategory.GROUND_TRANSPORTATION, label: ExpenseCategory.GROUND_TRANSPORTATION },
    { value: ExpenseCategory.OFFICE_SUPPLIES, label: ExpenseCategory.OFFICE_SUPPLIES },
    { value: ExpenseCategory.SOFTWARE, label: ExpenseCategory.SOFTWARE },
    { value: ExpenseCategory.MISCELLANEOUS, label: ExpenseCategory.MISCELLANEOUS }
  ];

  constructor(
    private expenseService: ExpenseService,
    private sanitizationService: SanitizationService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadExpenses();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load expenses from service
   */
  loadExpenses(): void {
    this.loading.set(true);
    this.error.set(null);

    this.expenseService.getMyExpenses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (expenses) => {
          this.expenses.set(expenses);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message || 'Failed to load expenses');
          this.loading.set(false);
        }
      });
  }

  /**
   * Set status filter
   */
  setStatusFilter(status: ExpenseStatus | 'all'): void {
    this.selectedStatus.set(status);
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.selectedStatus.set('all');
    this.searchQuery.set('');
    this.selectedCategory.set('all');
    this.dateFrom.set(null);
    this.dateTo.set(null);
    this.minAmount.set(null);
    this.maxAmount.set(null);
  }

  /**
   * Export to CSV (placeholder)
   */
  exportToCSV(): void {
    const rows = this.filteredExpenses();
    if (rows.length === 0) {
      this.snackBar.open('No expenses to export.', 'Close', { duration: 3000 });
      return;
    }

    const headers = [
      'Expense ID',
      'Merchant',
      'Amount',
      'Category',
      'Expense Date',
      'Status',
      'Receipt Attached',
      'Receipt File Name',
      'Receipt URL'
    ];

    const csvRows = rows.map(expense => {
      const receiptAttached = expense.receipt_id ? 'Yes' : 'No';
      const receiptFile = expense.receipt?.file_name || '';
      const receiptUrl = expense.receipt?.file_path
        ? this.expenseService.getReceiptUrl(expense.receipt.file_path)
        : '';

      return [
        expense.id,
        expense.merchant,
        expense.amount.toFixed(2),
        expense.category,
        expense.expense_date,
        expense.status,
        receiptAttached,
        receiptFile,
        receiptUrl
      ].map(value => this.sanitizationService.sanitizeCsvValue(value ?? '')).join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `expenses-${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.snackBar.open(`Exported ${rows.length} expense${rows.length > 1 ? 's' : ''} to CSV.`, 'Close', {
      duration: 4000
    });
  }

  /**
   * Get receipt thumbnail URL
   */
  getReceiptThumbnail(expense: Expense): string | null {
    if (!expense.receipt?.file_path) {
      return null;
    }
    return this.expenseService.getReceiptUrl(expense.receipt.file_path);
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  /**
   * Format date
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Map expense status to badge status
   */
  getStatusBadge(status: ExpenseStatus): BadgeStatus {
    const statusMap: Record<ExpenseStatus, BadgeStatus> = {
      [ExpenseStatus.DRAFT]: 'draft',
      [ExpenseStatus.SUBMITTED]: 'pending',
      [ExpenseStatus.APPROVED]: 'approved',
      [ExpenseStatus.REJECTED]: 'rejected',
      [ExpenseStatus.REIMBURSED]: 'reimbursed'
    };
    return statusMap[status];
  }

  /**
   * View receipt in new window
   */
  viewReceipt(expense: Expense): void {
    if (!expense.receipt?.file_path) {
      this.snackBar.open('No receipt available for this expense.', 'Close', { duration: 3000 });
      return;
    }

    const receiptUrl = this.expenseService.getReceiptUrl(expense.receipt.file_path);
    window.open(receiptUrl, '_blank');
  }

  hasViolations(expense: Expense): boolean {
    return (expense.policy_violations?.length ?? 0) > 0;
  }

  goToDetails(expense: Expense): void {
    this.router.navigate(['/expenses', expense.id]);
  }

  goToEdit(expense: Expense, focusViolations = false): void {
    this.router.navigate(['/expenses', expense.id, 'edit'], {
      queryParams: focusViolations ? { focus: 'violations' } : undefined
    });
  }

  fixViolations(expense: Expense): void {
    this.goToEdit(expense, true);
  }

  /**
   * Check if expense is selected
   */
  isSelected(expenseId: string): boolean {
    return this.selectedExpenseIds().has(expenseId);
  }

  /**
   * Toggle expense selection
   */
  toggleSelection(expense: Expense): void {
    const selected = new Set(this.selectedExpenseIds());
    if (selected.has(expense.id)) {
      selected.delete(expense.id);
    } else {
      // Only allow selecting draft expenses
      if (expense.status === ExpenseStatus.DRAFT) {
        selected.add(expense.id);
      }
    }
    this.selectedExpenseIds.set(selected);
  }

  /**
   * Toggle select all draft expenses
   */
  toggleSelectAll(): void {
    const drafts = this.draftExpenses();
    if (this.allDraftsSelected()) {
      // Deselect all
      this.selectedExpenseIds.set(new Set());
    } else {
      // Select all drafts
      const selected = new Set(drafts.map(e => e.id));
      this.selectedExpenseIds.set(selected);
    }
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.selectedExpenseIds.set(new Set());
  }

  /**
   * TrackBy function for virtual scrolling performance
   */
  trackByExpenseId(_index: number, expense: Expense): string {
    return expense.id;
  }

  /**
   * Submit selected expenses for approval (batch operation)
   */
  submitSelected(): void {
    const selectedIds = Array.from(this.selectedExpenseIds());
    if (selectedIds.length === 0) {
      this.snackBar.open('No expenses selected.', 'Close', { duration: 3000 });
      return;
    }

    this.submittingBatch.set(true);

    // Create array of submit observables
    const submitObs = selectedIds.map(id => this.expenseService.submitExpense(id));

    // Execute all submits in parallel
    forkJoin(submitObs)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.submittingBatch.set(false);
          this.clearSelection();
          this.snackBar.open(
            `Successfully submitted ${selectedIds.length} expense${selectedIds.length > 1 ? 's' : ''} for approval.`,
            'Close',
            { duration: 4000 }
          );
          // Reload expenses to reflect new status
          this.loadExpenses();
        },
        error: (err) => {
          this.submittingBatch.set(false);
          this.snackBar.open(
            err?.message || 'Failed to submit expenses. Please try again.',
            'Close',
            { duration: 4000 }
          );
        }
      });
  }
}
