import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrganizationService } from '../../../core/services/organization.service';
import { UserRole } from '../../../core/models/enums';
import { EmployeeDashboard } from '../employee-dashboard/employee-dashboard';
import { ManagerDashboard } from '../manager-dashboard/manager-dashboard';
import { FinanceDashboard } from '../finance-dashboard/finance-dashboard';
import { AdminDashboard } from '../admin-dashboard/admin-dashboard';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    EmployeeDashboard,
    ManagerDashboard,
    FinanceDashboard,
    AdminDashboard
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Home implements OnInit {
  userRole$!: Observable<UserRole>;
  UserRole = UserRole; // Expose enum to template

  constructor(private organizationService: OrganizationService) {}

  ngOnInit(): void {
    // Get user's role from organization membership
    this.userRole$ = this.organizationService.currentMembership$.pipe(
      map(membership => {
        const role = (membership?.role as UserRole) || UserRole.EMPLOYEE;
        console.log('[Home] User role detected:', role);
        console.log('[Home] Role comparison - is admin?', role === UserRole.ADMIN);
        console.log('[Home] Role comparison - is finance?', role === UserRole.FINANCE);
        console.log('[Home] Role comparison - is manager?', role === UserRole.MANAGER);
        console.log('[Home] Role comparison - is employee?', role === UserRole.EMPLOYEE);
        console.log('[Home] UserRole enum values:', UserRole);
        return role;
      })
    );
  }
}
