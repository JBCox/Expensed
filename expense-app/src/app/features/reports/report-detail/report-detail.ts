import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ReportService } from '../../../core/services/report.service';
import { ExpenseReport, ReportStatus } from '../../../core/models/report.model';
import { Expense } from '../../../core/models/expense.model';
import { ExpenseStatus } from '../../../core/models/enums';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

/**
 * Report Detail Component
 * Shows detailed view of an expense report
 *
 * Features:
 * - View report metadata
 * - List of expenses in the report
 * - Submit for approval
 * - Edit report details
 * - Delete draft report
 * - Remove expenses from report
 * - Approve/reject (managers)
 * - Mark as paid (finance)
 */
@Component({
  selector: 'app-report-detail',
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
    MatTableModule,
    MatTooltipModule,
    StatusBadge
  ],
  templateUrl: './report-detail.html',
  styleUrl: './report-detail.scss'
})
export class ReportDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private reportService = inject(ReportService);
  private snackBar = inject(MatSnackBar);

  // State
  report = signal<ExpenseReport | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  submitting = signal<boolean>(false);

  reportId = signal<string | null>(null);

  readonly ReportStatus = ReportStatus;
  readonly ExpenseStatus = ExpenseStatus;

  // Table columns for expenses
  displayedColumns = ['merchant', 'category', 'date', 'amount', 'status', 'actions'];

  // Computed properties
  expenses = computed(() => {
    const reportData = this.report();
    if (!reportData || !reportData.report_expenses) {
      return [];
    }
    return reportData.report_expenses
      .map(re => re.expense)
      .filter((exp): exp is Expense => exp !== undefined)
      .sort((a, b) => {
        // Sort by expense_date descending
        return new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime();
      });
  });

  hasExpenses = computed(() => this.expenses().length > 0);

  canEdit = computed(() => {
    const reportData = this.report();
    return reportData?.status === ReportStatus.DRAFT;
  });

  canSubmit = computed(() => {
    const reportData = this.report();
    return reportData?.status === ReportStatus.DRAFT && this.hasExpenses();
  });

  canDelete = computed(() => {
    const reportData = this.report();
    return reportData?.status === ReportStatus.DRAFT;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Missing report ID');
      this.loading.set(false);
      return;
    }

    this.reportId.set(id);
    this.loadReport();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load report from backend
   */
  loadReport(): void {
    const id = this.reportId();
    if (!id) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.reportService.getReportById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (report) => {
          this.report.set(report);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err?.message || 'Failed to load report');
          this.loading.set(false);
        }
      });
  }

  /**
   * Go back to reports list
   */
  goBack(): void {
    this.router.navigate(['/reports']);
  }

  /**
   * Submit report for approval
   */
  submitReport(): void {
    const reportData = this.report();
    if (!reportData || !this.canSubmit()) {
      return;
    }

    if (confirm(`Submit "${reportData.name}" for approval?`)) {
      this.submitting.set(true);

      this.reportService.submitReport(reportData.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updated) => {
            this.report.set(updated);
            this.submitting.set(false);
            this.snackBar.open('Report submitted for approval', 'Close', { duration: 3000 });
          },
          error: (err) => {
            this.submitting.set(false);
            this.snackBar.open(err?.message || 'Failed to submit report', 'Close', { duration: 4000 });
          }
        });
    }
  }

  /**
   * Delete draft report
   */
  deleteReport(): void {
    const reportData = this.report();
    if (!reportData || !this.canDelete()) {
      return;
    }

    if (confirm(`Delete report "${reportData.name}"? This cannot be undone.`)) {
      this.reportService.deleteReport(reportData.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.snackBar.open('Report deleted', 'Close', { duration: 3000 });
            this.router.navigate(['/reports']);
          },
          error: (err) => {
            this.snackBar.open(err?.message || 'Failed to delete report', 'Close', { duration: 4000 });
          }
        });
    }
  }

  /**
   * Remove an expense from the report
   */
  removeExpense(expense: Expense): void {
    const reportData = this.report();
    if (!reportData || !this.canEdit()) {
      return;
    }

    if (confirm(`Remove "${expense.merchant}" from this report?`)) {
      this.reportService.removeExpenseFromReport(reportData.id, expense.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.snackBar.open('Expense removed from report', 'Close', { duration: 3000 });
            this.loadReport();
          },
          error: (err) => {
            this.snackBar.open(err?.message || 'Failed to remove expense', 'Close', { duration: 4000 });
          }
        });
    }
  }

  /**
   * View expense detail
   */
  viewExpense(expense: Expense): void {
    this.router.navigate(['/expenses', expense.id]);
  }

  /**
   * Get status badge variant
   */
  getBadgeStatus(status: ReportStatus | ExpenseStatus): 'draft' | 'pending' | 'approved' | 'rejected' | 'reimbursed' {
    switch (status) {
      case ReportStatus.DRAFT:
      case ExpenseStatus.DRAFT:
        return 'draft';
      case ReportStatus.SUBMITTED:
      case ExpenseStatus.SUBMITTED:
        return 'pending';
      case ReportStatus.APPROVED:
      case ExpenseStatus.APPROVED:
        return 'approved';
      case ReportStatus.REJECTED:
      case ExpenseStatus.REJECTED:
        return 'rejected';
      case ReportStatus.PAID:
      case ExpenseStatus.REIMBURSED:
        return 'reimbursed';
      default:
        return 'draft';
    }
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

  /**
   * Get timeline items for report
   */
  getTimeline() {
    const reportData = this.report();
    if (!reportData) {
      return [];
    }

    const timeline = [
      { label: 'Created', value: reportData.created_at }
    ];

    if (reportData.submitted_at) {
      timeline.push({ label: 'Submitted', value: reportData.submitted_at });
    }

    if (reportData.approved_at) {
      timeline.push({ label: 'Approved', value: reportData.approved_at });
    }

    if (reportData.rejected_at) {
      timeline.push({ label: 'Rejected', value: reportData.rejected_at });
    }

    if (reportData.paid_at) {
      timeline.push({ label: 'Paid', value: reportData.paid_at });
    }

    return timeline;
  }
}
