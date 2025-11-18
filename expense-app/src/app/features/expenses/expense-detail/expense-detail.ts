import { Component, OnInit, OnDestroy, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ExpenseService } from '../../../core/services/expense.service';
import { Expense } from '../../../core/models/expense.model';
import { ExpenseStatus } from '../../../core/models/enums';
import { StatusBadge, ExpenseStatus as BadgeStatus } from '../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-expense-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    StatusBadge
  ],
  templateUrl: './expense-detail.html',
  styleUrl: './expense-detail.scss'
,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpenseDetailComponent implements OnInit, OnDestroy {
  // Cleanup
  private destroy$ = new Subject<void>();

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private expenseService = inject(ExpenseService);
  private snackBar = inject(MatSnackBar);

  expense = signal<Expense | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  submitting = signal<boolean>(false);

  expenseId = signal<string | null>(null);

  readonly ExpenseStatus = ExpenseStatus;
  private statusBadgeMap: Record<ExpenseStatus, BadgeStatus> = {
    [ExpenseStatus.DRAFT]: 'draft',
    [ExpenseStatus.SUBMITTED]: 'pending',
    [ExpenseStatus.APPROVED]: 'approved',
    [ExpenseStatus.REJECTED]: 'rejected',
    [ExpenseStatus.REIMBURSED]: 'reimbursed'
  };

  hasViolations = computed(
    () => (this.expense()?.policy_violations?.length ?? 0) > 0
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Missing expense ID.');
      this.loading.set(false);
      return;
    }

    this.expenseId.set(id);
    this.loadExpense();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadExpense(): void {
    const id = this.expenseId();
    if (!id) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    this.expenseService.getExpenseById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (expense) => {
          this.expense.set(expense);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err?.message || 'Unable to load expense.');
          this.loading.set(false);
        }
      });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDate(dateString?: string | null): string {
    if (!dateString) {
      return '—';
    }
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getBadgeStatus(status: ExpenseStatus): BadgeStatus {
    return this.statusBadgeMap[status] ?? 'draft';
  }

  canSubmit(): boolean {
    const exp = this.expense();
    if (!exp) {
      return false;
    }
    const hasViolations = (exp.policy_violations?.length ?? 0) > 0;
    return exp.status === ExpenseStatus.DRAFT && !hasViolations;
  }

  submitForApproval(): void {
    const exp = this.expense();
    if (!exp || !this.canSubmit()) {
      return;
    }

    this.submitting.set(true);
    this.expenseService.submitExpense(exp.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.expense.set(updated);
          this.submitting.set(false);
          this.snackBar.open('Expense submitted for approval.', 'Close', { duration: 4000 });
        },
        error: (err) => {
          this.submitting.set(false);
          this.snackBar.open(err?.message || 'Failed to submit expense.', 'Close', { duration: 4000 });
        }
      });
  }

  viewReceipt(): void {
    const receipt = this.expense()?.receipt;
    if (!receipt?.file_path) {
      this.snackBar.open('No receipt attached.', 'Close', { duration: 3000 });
      return;
    }
    const url = this.expenseService.getReceiptUrl(receipt.file_path);
    window.open(url, '_blank');
  }

  goBack(): void {
    this.router.navigate(['/expenses']);
  }

  goToEdit(focusViolations = false): void {
    const id = this.expenseId();
    if (!id) {
      return;
    }
    this.router.navigate(['/expenses', id, 'edit'], {
      queryParams: focusViolations ? { focus: 'violations' } : undefined
    });
  }

  refreshAfterSave(): void {
    this.loadExpense();
  }

  getTimeline() {
    const exp = this.expense();
    if (!exp) {
      return [];
    }
    return [
      { label: 'Created', value: exp.created_at },
      { label: 'Submitted', value: exp.submitted_at },
      { label: 'Reimbursed', value: exp.reimbursed_at }
    ];
  }

  ocrLabel(): string {
    const status = this.expense()?.receipt?.ocr_status;
    switch (status) {
      case 'completed':
        return 'SmartScan complete';
      case 'processing':
        return 'SmartScan in progress';
      case 'failed':
        return 'SmartScan failed';
      case 'pending':
      default:
        return 'SmartScan pending';
    }
  }
}
