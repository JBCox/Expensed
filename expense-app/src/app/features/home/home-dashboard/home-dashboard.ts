import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Observable } from 'rxjs';
import { map, shareReplay, startWith } from 'rxjs/operators';
import { Expense } from '../../../core/models/expense.model';
import { ExpenseStatus, UserRole } from '../../../core/models/enums';
import { ExpenseService } from '../../../core/services/expense.service';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-home-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    DatePipe,
    CurrencyPipe
  ],
  templateUrl: './home-dashboard.html',
  styleUrl: './home-dashboard.scss'
,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeDashboardComponent {
  private readonly auth = inject(AuthService);
  private readonly expenses = inject(ExpenseService);

  readonly user$: Observable<User | null> = this.auth.userProfile$;
  readonly expenses$: Observable<Expense[]> = this.expenses.getMyExpenses().pipe(shareReplay(1));

  readonly draftCount$ = this.expenses$.pipe(
    map(list => list.filter(exp => exp.status === ExpenseStatus.DRAFT).length),
    startWith(0)
  );
  readonly submittedCount$ = this.expenses$.pipe(
    map(list => list.filter(exp => exp.status === ExpenseStatus.SUBMITTED).length),
    startWith(0)
  );
  readonly reimbursedCount$ = this.expenses$.pipe(
    map(list => list.filter(exp => exp.status === ExpenseStatus.REIMBURSED).length),
    startWith(0)
  );

  readonly recentExpenses$ = this.expenses$.pipe(
    map(list => list.slice(0, 4))
  );

  readonly isFinanceOrAdmin$ = this.user$.pipe(
    map(user => !!user && (user.role === UserRole.FINANCE || user.role === UserRole.ADMIN))
  );
}
