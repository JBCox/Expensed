import { Component, OnInit, OnDestroy, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ExpenseService } from '../../../core/services/expense.service';
import { ExpenseWithUser } from '../../../core/models/expense.model';
import { ExpenseStatus } from '../../../core/models/enums';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { LoadingSkeleton } from '../../../shared/components/loading-skeleton/loading-skeleton';
import { MetricCard } from '../../../shared/components/metric-card/metric-card';

/**
 * Finance Dashboard Component
 * Displays reimbursement queue and financial metrics (Finance/Admin only)
 */
@Component({
  selector: 'app-finance-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatTableModule,
    ScrollingModule,
    EmptyState,
    LoadingSkeleton,
    MetricCard
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FinanceDashboardComponent implements OnInit, OnDestroy {
  // Cleanup
  private destroy$ = new Subject<void>();

  // State signals
  approvedExpenses = signal<ExpenseWithUser[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  selectedExpenseIds = signal<Set<string>>(new Set());

  // Computed metrics
  totalPending = computed(() => this.approvedExpenses().length);
  totalAmount = computed(() =>
    this.approvedExpenses().reduce((sum, e) => sum + e.amount, 0)
  );
  selectedCount = computed(() => this.selectedExpenseIds().size);

  constructor(
    private expenseService: ExpenseService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadApprovedExpenses();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load approved expenses awaiting reimbursement
   */
  loadApprovedExpenses(): void {
    this.loading.set(true);
    this.error.set(null);

    this.expenseService.queryExpenses({ status: ExpenseStatus.APPROVED })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (expenses) => {
          this.approvedExpenses.set(expenses as ExpenseWithUser[]);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message || 'Failed to load expenses');
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
   * Mark single expense as reimbursed
   */
  markAsReimbursed(expenseId: string): void {
    this.expenseService.markAsReimbursed(expenseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Expense marked as reimbursed');
          this.loadApprovedExpenses();
        },
        error: (err: Error) => {
          this.showError(err.message || 'Failed to mark expense as reimbursed');
        }
      });
  }

  /**
   * Mark all selected expenses as reimbursed (batch operation using forkJoin)
   */
  markAllAsReimbursed(): void {
    const selectedIds = Array.from(this.selectedExpenseIds());
    if (selectedIds.length === 0) return;

    // Create array of mark reimbursed observables
    const updateObs = selectedIds.map(id => this.expenseService.markAsReimbursed(id));

    // Execute all updates in parallel
    forkJoin(updateObs)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess(`Marked ${selectedIds.length} expense${selectedIds.length > 1 ? 's' : ''} as reimbursed`);
          this.selectedExpenseIds.set(new Set());
          this.loadApprovedExpenses();
        },
        error: (err: Error) => {
          this.showError(err.message || 'Failed to mark some expenses as reimbursed');
        }
      });
  }

  /**
   * Export to CSV (placeholder)
   */
  exportToCSV(): void {
    console.log('Exporting approved expenses to CSV...', this.approvedExpenses());
    this.showSuccess('CSV export feature coming soon');
  }

  /**
   * TrackBy function for virtual scrolling performance
   */
  trackByExpenseId(_index: number, expense: ExpenseWithUser): string {
    return expense.id;
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
