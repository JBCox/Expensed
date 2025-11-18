import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Observable, map } from 'rxjs';
import { ExpenseService } from '../../../core/services/expense.service';
import { Expense } from '../../../core/models/expense.model';
import { ExpenseStatus } from '../../../core/models/enums';
import { MetricCard } from '../../../shared/components/metric-card/metric-card';
import { StatusBadge, ExpenseStatus as BadgeStatus } from '../../../shared/components/status-badge/status-badge';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';

interface DashboardMetrics {
  totalSpend: number;
  pendingCount: number;
  approvedCount: number;
  recentUploads: number;
}

@Component({
  selector: 'app-employee-dashboard',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MetricCard,
    StatusBadge,
    EmptyState
  ],
  templateUrl: './employee-dashboard.html',
  styleUrl: './employee-dashboard.scss',

  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeDashboard implements OnInit {
  metrics$!: Observable<DashboardMetrics>;
  recentExpenses$!: Observable<Expense[]>;
  loading = true;

  constructor(
    private expenseService: ExpenseService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('[EmployeeDashboard] Component initialized');
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    console.log('[EmployeeDashboard] Loading dashboard data...');
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get all user's expenses
    const allExpenses$ = this.expenseService.getMyExpenses();

    // Calculate metrics
    this.metrics$ = allExpenses$.pipe(
      map(expenses => {
        console.log('[EmployeeDashboard] Loaded expenses:', expenses.length);
        const monthExpenses = expenses.filter(e => e.created_at >= startOfMonth);
        const recentExpenses = expenses.filter(e => e.created_at >= sevenDaysAgo);

        const metrics = {
          totalSpend: monthExpenses.reduce((sum, e) => sum + e.amount, 0),
          pendingCount: expenses.filter(e => e.status === ExpenseStatus.DRAFT).length,
          approvedCount: expenses.filter(e => e.status === ExpenseStatus.APPROVED).length,
          recentUploads: recentExpenses.length
        };
        console.log('[EmployeeDashboard] Calculated metrics:', metrics);
        return metrics;
      })
    );

    // Get recent 5 expenses
    this.recentExpenses$ = allExpenses$.pipe(
      map(expenses => expenses.slice(0, 5))
    );

    this.loading = false;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  mapStatus(status: string): BadgeStatus {
    return status as BadgeStatus;
  }

  onUploadReceipt(): void {
    this.router.navigate(['/expenses/upload']);
  }

  onSubmitExpense(): void {
    this.router.navigate(['/expenses/form']);
  }

  onViewExpense(expense: Expense): void {
    this.router.navigate(['/expenses', expense.id]);
  }
}
