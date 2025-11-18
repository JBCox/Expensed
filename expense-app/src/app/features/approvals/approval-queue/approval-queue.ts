import { Component, OnInit, OnDestroy, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ExpenseService } from '../../../core/services/expense.service';
import { AuthService } from '../../../core/services/auth.service';
import { ExpenseWithUser } from '../../../core/models/expense.model';
import { ExpenseStatus, ExpenseCategory } from '../../../core/models/enums';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { LoadingSkeleton } from '../../../shared/components/loading-skeleton/loading-skeleton';

/**
 * Approval Queue Component
 * Displays all pending expenses awaiting approval (Finance/Admin only)
 */
@Component({
  selector: 'app-approval-queue',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    ScrollingModule,
    EmptyState,
    LoadingSkeleton
  ],
  templateUrl: './approval-queue.html',
  styleUrl: './approval-queue.scss'
,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ApprovalQueueComponent implements OnInit, OnDestroy {
  // Cleanup
  private destroy$ = new Subject<void>();

  // State signals
  pendingExpenses = signal<ExpenseWithUser[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  selectedExpenseIds = signal<Set<string>>(new Set());

  // Filter signals
  searchQuery = signal<string>('');
  selectedCategory = signal<string | 'all'>('all');
  dateFrom = signal<Date | null>(null);
  dateTo = signal<Date | null>(null);
  minAmount = signal<number | null>(null);
  maxAmount = signal<number | null>(null);

  // Computed filtered expenses
  filteredExpenses = computed(() => {
    let result = this.pendingExpenses();

    // Filter by search query (employee name or merchant)
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      result = result.filter(e =>
        e.user.full_name?.toLowerCase().includes(query) ||
        e.merchant.toLowerCase().includes(query)
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

  // Computed metrics
  totalPending = computed(() => this.filteredExpenses().length);
  totalAmount = computed(() =>
    this.filteredExpenses().reduce((sum, e) => sum + e.amount, 0)
  );
  selectedCount = computed(() => this.selectedExpenseIds().size);

  // Enums for template
  readonly ExpenseCategory = ExpenseCategory;

  // Category options
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
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadPendingExpenses();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load pending expenses from service
   */
  loadPendingExpenses(): void {
    this.loading.set(true);
    this.error.set(null);

    // Get all submitted expenses (Finance role)
    this.expenseService.queryExpenses({ status: ExpenseStatus.SUBMITTED })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (expenses) => {
          this.pendingExpenses.set(expenses as ExpenseWithUser[]);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message || 'Failed to load pending expenses');
          this.loading.set(false);
        }
      });
  }

  /**
   * Toggle expense selection
   */
  toggleSelection(expenseId: string): void {
    const selected = new Set(this.selectedExpenseIds());
    if (selected.has(expenseId)) {
      selected.delete(expenseId);
    } else {
      selected.add(expenseId);
    }
    this.selectedExpenseIds.set(selected);
  }

  /**
   * Check if expense is selected
   */
  isSelected(expenseId: string): boolean {
    return this.selectedExpenseIds().has(expenseId);
  }

  /**
   * Approve single expense
   */
  approveExpense(expenseId: string): void {
    this.expenseService.updateExpense(expenseId, {
      status: ExpenseStatus.APPROVED
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Expense approved successfully');
          this.loadPendingExpenses();
        },
        error: (err: Error) => {
          this.showError(err.message || 'Failed to approve expense');
        }
      });
  }

  /**
   * Reject single expense
   */
  rejectExpense(expenseId: string): void {
    this.expenseService.updateExpense(expenseId, {
      status: ExpenseStatus.REJECTED
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Expense rejected');
          this.loadPendingExpenses();
        },
        error: (err: Error) => {
          this.showError(err.message || 'Failed to reject expense');
        }
      });
  }

  viewReceipt(expense: ExpenseWithUser): void {
    if (!expense.receipt?.file_path) {
      this.showError('No receipt attached.');
      return;
    }
    const url = this.expenseService.getReceiptUrl(expense.receipt.file_path);
    window.open(url, '_blank');
  }

  /**
   * Approve selected expenses (batch operation using forkJoin)
   */
  approveSelected(): void {
    const selectedIds = Array.from(this.selectedExpenseIds());
    if (selectedIds.length === 0) return;

    // Create array of update observables
    const updateObs = selectedIds.map(id =>
      this.expenseService.updateExpense(id, { status: ExpenseStatus.APPROVED })
    );

    // Execute all updates in parallel
    forkJoin(updateObs)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess(`Approved ${selectedIds.length} expense${selectedIds.length > 1 ? 's' : ''}`);
          this.selectedExpenseIds.set(new Set());
          this.loadPendingExpenses();
        },
        error: (err: Error) => {
          this.showError(err.message || 'Failed to approve some expenses');
        }
      });
  }

  /**
   * Reject selected expenses (batch operation using forkJoin)
   */
  rejectSelected(): void {
    const selectedIds = Array.from(this.selectedExpenseIds());
    if (selectedIds.length === 0) return;

    // Create array of update observables
    const updateObs = selectedIds.map(id =>
      this.expenseService.updateExpense(id, { status: ExpenseStatus.REJECTED })
    );

    // Execute all updates in parallel
    forkJoin(updateObs)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess(`Rejected ${selectedIds.length} expense${selectedIds.length > 1 ? 's' : ''}`);
          this.selectedExpenseIds.set(new Set());
          this.loadPendingExpenses();
        },
        error: (err: Error) => {
          this.showError(err.message || 'Failed to reject some expenses');
        }
      });
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('all');
    this.dateFrom.set(null);
    this.dateTo.set(null);
    this.minAmount.set(null);
    this.maxAmount.set(null);
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
   * TrackBy function for virtual scrolling performance
   */
  trackByExpenseId(_index: number, expense: ExpenseWithUser): string {
    return expense.id;
  }

  /**
   * Show success message
   */
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}
