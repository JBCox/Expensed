import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from './core/services/auth.service';
import { KeyboardShortcutsService } from './core/services/keyboard-shortcuts.service';
import { ThemeService } from './core/services/theme.service';
import { OrganizationService } from './core/services/organization.service';
import { Observable, Subject, combineLatest, map, filter, fromEvent } from 'rxjs';
import { takeUntil, startWith } from 'rxjs/operators';
import { User } from './core/models/user.model';
import { SidebarNav } from './core/components/sidebar-nav/sidebar-nav';
import { NotificationCenterComponent } from './shared/components/notification-center/notification-center';
import { ShortcutsHelpDialog } from './shared/components/shortcuts-help-dialog/shortcuts-help-dialog';
import { Breadcrumbs } from './shared/components/breadcrumbs/breadcrumbs';
import { InstallPrompt } from './shared/components/install-prompt/install-prompt';
import { OfflineIndicator } from './shared/components/offline-indicator/offline-indicator';
import { BrandLogoComponent } from './shared/components/brand-logo/brand-logo';

interface ShellViewModel {
  profile: User | null;
  isAuthenticated: boolean;
  displayName: string;
  email: string;
}

/**
 * Default view model for immediate rendering
 * Prevents click-blocking on initial page load
 */
const DEFAULT_VM: ShellViewModel = {
  profile: null,
  isAuthenticated: false,
  displayName: '',
  email: ''
};

/**
 * Root application component with navigation
 */
@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterOutlet,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    SidebarNav,
    NotificationCenterComponent,
    Breadcrumbs,
    InstallPrompt,
    OfflineIndicator,
    BrandLogoComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private keyboardShortcuts = inject(KeyboardShortcutsService);
  private organizationService = inject(OrganizationService);
  themeService = inject(ThemeService);

  // Cleanup
  private destroy$ = new Subject<void>();

  vm$: Observable<ShellViewModel>;
  isSidebarOpen = false;
  isAuthRoute = false;
  isSuperAdminRoute = false;
  isSidebarCollapsed = false;

  constructor() {
    this.isAuthRoute = this.router.url.startsWith('/auth');
    this.isSuperAdminRoute = this.router.url.startsWith('/super-admin');
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event) => {
        this.isAuthRoute = event.urlAfterRedirects.startsWith('/auth');
        this.isSuperAdminRoute = event.urlAfterRedirects.startsWith('/super-admin');
      });

    // Use startWith to emit immediately with default value - prevents click-blocking on initial load
    this.vm$ = combineLatest([this.authService.userProfile$, this.authService.session$]).pipe(
      map(([profile, session]): ShellViewModel => {
        const sessionMetadata = (session?.user?.user_metadata ?? {}) as Record<string, unknown>;
        const email = String(profile?.email || session?.user?.email || sessionMetadata['email'] || '');
        const displayName = String(
          profile?.full_name ||
          sessionMetadata['full_name'] ||
          sessionMetadata['name'] ||
          email ||
          'User'
        );
        return {
          profile,
          isAuthenticated: !!session,
          displayName,
          email
        };
      }),
      startWith(DEFAULT_VM)
    );
  }

  ngOnInit(): void {
    // Version marker for deployment verification
    console.log('%c EXPENSED VERSION: 2024-12-11-v2 ', 'background: #ff5900; color: white; font-size: 14px; padding: 4px 8px; border-radius: 4px;');

    this.handleAuthCallback();
    this.setupKeyboardShortcuts();
    this.setupBrandColor();
  }

  /**
   * Handle auth callback tokens in URL hash
   * Supabase email links may redirect to root with tokens in hash
   */
  private handleAuthCallback(): void {
    const hash = window.location.hash;
    if (hash && (hash.includes('access_token') || hash.includes('error') || hash.includes('type=signup') || hash.includes('type=recovery'))) {
      // Auth tokens detected in URL - redirect to callback handler
      this.router.navigate(['/auth/callback'], { replaceUrl: true });
    }
  }

  /**
   * Subscribe to organization changes and apply brand color
   */
  private setupBrandColor(): void {
    this.organizationService.currentOrganization$
      .pipe(takeUntil(this.destroy$))
      .subscribe(org => {
        if (org?.primary_color) {
          this.themeService.applyBrandColor(org.primary_color);
        } else {
          // Reset to default Jensify orange if no custom color
          this.themeService.resetBrandColor();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Toggle sidebar on mobile
   */
  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  /**
   * Close sidebar
   */
  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  /**
   * Handle sidebar collapsed state change
   */
  onSidebarCollapsedChange(collapsed: boolean): void {
    this.isSidebarCollapsed = collapsed;
  }

  /**
   * Set up keyboard shortcuts listeners
   */
  private setupKeyboardShortcuts(): void {
    // Listen for show help event
    fromEvent(window, 'keyboard:show-help')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.openShortcutsHelp();
      });

    // Listen for escape event to close dialogs
    fromEvent(window, 'keyboard:escape')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Close any open dialogs
        this.dialog.closeAll();
      });
  }

  /**
   * Open keyboard shortcuts help dialog
   */
  openShortcutsHelp(): void {
    this.dialog.open(ShortcutsHelpDialog, {
      width: '600px',
      maxWidth: '95vw',
      panelClass: 'shortcuts-dialog-panel'
    });
  }

  /**
   * Toggle dark/light theme
   */
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    await this.authService.signOut();
  }
}
