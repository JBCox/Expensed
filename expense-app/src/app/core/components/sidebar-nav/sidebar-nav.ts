import { Component, EventEmitter, Input, Output, signal, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';
import { OrganizationService } from '../../services/organization.service';
import { Subject, filter, takeUntil } from 'rxjs';

interface NavItem {
  icon: string;
  label: string;
  route: string;
  requiredRole?: string;
}

@Component({
  selector: 'app-sidebar-nav',
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatListModule,
    MatButtonModule
  ],
  templateUrl: './sidebar-nav.html',
  styleUrl: './sidebar-nav.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarNav implements OnDestroy {
  @Input() isOpen = false;
  @Output() closeSidebar = new EventEmitter<void>();
  collapsed = signal(false);
  private readonly destroy$ = new Subject<void>();

  navItems: NavItem[] = [
    {
      icon: 'dashboard',
      label: 'Dashboard',
      route: '/home'
    },
    // Manager/Finance/Admin items (higher priority for those roles)
    {
      icon: 'task_alt',
      label: 'Approvals',
      route: '/approvals',
      requiredRole: 'manager'
    },
    {
      icon: 'people',
      label: 'User Management',
      route: '/organization/users',
      requiredRole: 'admin'
    },
    // Employee-focused items (everyone can use these)
    {
      icon: 'receipt_long',
      label: 'Upload Receipt',
      route: '/expenses/upload'
    },
    {
      icon: 'list_alt',
      label: 'My Expenses',
      route: '/expenses'
    },
    {
      icon: 'playlist_add',
      label: 'New Expense',
      route: '/expenses/new'
    },
    {
      icon: 'inventory_2',
      label: 'Receipts',
      route: '/receipts'
    },
    {
      icon: 'commute',
      label: 'Mileage',
      route: '/mileage'
    },
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
    private organizationService: OrganizationService,
    private cdr: ChangeDetectorRef
  ) {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.cdr.markForCheck());
  }

  toggleCollapse(): void {
    this.collapsed.update(value => !value);
  }

  /**
   * Get filtered nav items based on user role
   * Uses organization membership role, not global user role
   */
  get filteredNavItems(): NavItem[] {
    return this.navItems.filter(item => {
      if (!item.requiredRole) {
        return true;
      }
      // Check specific role requirements based on organization membership
      if (item.requiredRole === 'admin') {
        return this.organizationService.isCurrentUserAdmin();
      }
      if (item.requiredRole === 'finance') {
        return this.organizationService.isCurrentUserFinanceOrAdmin();
      }
      if (item.requiredRole === 'manager') {
        return this.organizationService.isCurrentUserManagerOrAbove();
      }
      return false;
    });
  }

  /**
   * Check if a route is currently active without colliding with more specific routes.
   */
  isActive(route: string): boolean {
    const activeUrl = this.normalizeUrl(this.router.url);

    if (activeUrl === route) {
      return true;
    }

    if (!activeUrl.startsWith(`${route}/`)) {
      return false;
    }

    return !this.hasConflictingChildRoute(route, activeUrl);
  }

  /**
   * Remove query params and hash fragments before comparing routes.
   */
  private normalizeUrl(url: string): string {
    return url.split('?')[0].split('#')[0];
  }

  /**
   * Avoid highlighting a parent route when a more specific nav item matches.
   */
  private hasConflictingChildRoute(route: string, activeUrl: string): boolean {
    return this.navItems.some(item =>
      item.route !== route &&
      item.route.startsWith(`${route}/`) &&
      activeUrl.startsWith(item.route)
    );
  }

  /**
   * Navigate to a route and close sidebar on mobile
   */
  navigate(route: string): void {
    this.router.navigate([route]);
    this.closeSidebar.emit();
  }

  /**
   * Handle backdrop click to close sidebar
   */
  onBackdropClick(): void {
    this.closeSidebar.emit();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
