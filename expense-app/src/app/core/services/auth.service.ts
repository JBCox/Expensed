import { Injectable, OnDestroy, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { OrganizationService } from './organization.service';
import { LoggerService } from './logger.service';
import { LoginCredentials, RegisterCredentials, User } from '../models';
import { UserRole } from '../models/enums';
import { BehaviorSubject, Observable, Subject, from, map, catchError, of, takeUntil, firstValueFrom } from 'rxjs';
import { User as SupabaseAuthUser, Session } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  private userProfileSubject = new BehaviorSubject<User | null>(null);
  public userProfile$: Observable<User | null> = this.userProfileSubject.asObservable();
  private hasRedirectedToDefault = false;
  private suppressDefaultRedirect = false;
  private readonly legacyLandingRoutes = ['/'];

  // Subject for subscription cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private supabase: SupabaseService,
    private router: Router,
    private organizationService: OrganizationService,
    private logger: LoggerService
  ) {
    // Subscribe to auth changes and load user profile
    // Using takeUntil to prevent memory leaks
    this.supabase.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (user) => {
        if (user) {
          this.userProfileSubject.next(this.createProvisionalProfile(user));
          await this.loadUserProfile(user.id);
          this.redirectToDefaultLanding();
        } else {
          this.userProfileSubject.next(null);
          this.hasRedirectedToDefault = false;
        }
      });
  }

  /**
   * Clean up subscriptions when service is destroyed
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Get current user profile
   */
  get currentUserProfile(): User | null {
    return this.userProfileSubject.value;
  }

  /**
   * Check if user is authenticated
   */
  get isAuthenticated(): boolean {
    return this.supabase.isAuthenticated;
  }

  /**
   * Get current user's role
   */
  get userRole(): string | null {
    return this.currentUserProfile?.role || null;
  }

  /**
   * Check if user has a specific role
   */
  hasRole(role: string): boolean {
    return this.userRole === role;
  }

  /**
   * Check if user is finance or admin
   */
  get isFinanceOrAdmin(): boolean {
    return this.userRole === UserRole.FINANCE || this.userRole === UserRole.ADMIN;
  }

  /**
   * Check if user is admin
   */
  get isAdmin(): boolean {
    return this.userRole === UserRole.ADMIN;
  }

  /**
   * Determine the default landing route for current user
   */
  getDefaultRoute(): string {
    // Check if user needs organization setup
    if (!this.organizationService.currentOrganizationId) {
      return '/organization/setup';
    }

    // Everyone goes to /home, which shows role-appropriate dashboard
    return '/home';
  }

  /**
   * Check if user has an organization
   */
  get hasOrganization(): boolean {
    return !!this.organizationService.currentOrganizationId;
  }

  /**
   * Register a new user
   */
  register(credentials: RegisterCredentials): Observable<{ success: boolean; error?: string }> {
    return from(
      this.supabase.signUp(
        credentials.email,
        credentials.password,
        credentials.full_name
      )
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          return { success: false, error: this.getErrorMessage(error) };
        }
        return { success: true };
      }),
      catchError((error) => {
        return of({ success: false, error: this.getErrorMessage(error, 'Registration failed') });
      })
    );
  }

  /**
   * Sign in with email and password
   */
  signIn(credentials: LoginCredentials): Observable<{ success: boolean; error?: string }> {
    return from(
      this.supabase.signIn(credentials.email, credentials.password)
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          return { success: false, error: this.getErrorMessage(error) };
        }
        return { success: true };
      }),
      catchError((error) => {
        return of({ success: false, error: this.getErrorMessage(error, 'Login failed') });
      })
    );
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    await this.supabase.signOut();
    this.userProfileSubject.next(null);
    this.hasRedirectedToDefault = false;

    // Clear organization context
    this.organizationService.clearCurrentOrganization();

    this.router.navigate(['/auth/login']);
  }

  /**
   * Request password reset
   */
  resetPassword(email: string): Observable<{ success: boolean; error?: string }> {
    return from(this.supabase.resetPassword(email)).pipe(
      map(({ error }) => {
        if (error) {
          return { success: false, error: this.getErrorMessage(error) };
        }
        return { success: true };
      }),
      catchError((error) => {
        return of({ success: false, error: this.getErrorMessage(error, 'Password reset failed') });
      })
    );
  }

  /**
   * Update password
   */
  updatePassword(newPassword: string): Observable<{ success: boolean; error?: string }> {
    return from(this.supabase.updatePassword(newPassword)).pipe(
      map(({ error }) => {
        if (error) {
          return { success: false, error: this.getErrorMessage(error) };
        }
        return { success: true };
      }),
      catchError((error) => {
        return of({ success: false, error: this.getErrorMessage(error, 'Password update failed') });
      })
    );
  }

  /**
   * Load user profile from database and organization context
   */
  private async loadUserProfile(userId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase.client
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        this.logger.warn('Error loading user profile, using provisional', 'AuthService', error);
        return;
      }

      this.userProfileSubject.next(data as User);

      // Load organization context
      await this.loadOrganizationContext(userId);
    } catch (error) {
      this.logger.error('Error loading user profile', error, 'AuthService');
    }
  }

  /**
   * Load organization context for user
   * Sets the current organization and membership
   */
  private async loadOrganizationContext(userId: string): Promise<void> {
    try {
      // Get user's organization context - wait for it to complete
      const context = await firstValueFrom(
        this.organizationService.getUserOrganizationContext()
      );

      if (context && context.current_organization && context.current_membership) {
        // Set current organization - types are validated by UserOrganizationContext interface
        this.organizationService.setCurrentOrganization(
          context.current_organization,
          context.current_membership
        );
      } else {
        // User has no organization - may need to create one or accept an invitation
        this.logger.info('User has no organization membership', 'AuthService');
        // Clear any stale organization data
        this.organizationService.clearCurrentOrganization();
      }
    } catch (error) {
      this.logger.error('Error loading organization context', error, 'AuthService');
      // Clear stale data on error
      this.organizationService.clearCurrentOrganization();
    }
  }

  /**
   * Refresh user profile
   */
  async refreshUserProfile(): Promise<void> {
    const userId = this.supabase.userId;
    if (userId) {
      await this.loadUserProfile(userId);
    }
  }

  suppressNextDefaultRedirect(): void {
    this.suppressDefaultRedirect = true;
  }

  private redirectToDefaultLanding(): void {
    if (this.suppressDefaultRedirect) {
      this.suppressDefaultRedirect = false;
      return;
    }

    if (this.hasRedirectedToDefault) {
      return;
    }

    if (this.shouldUseDefaultRoute(this.router.url)) {
      this.hasRedirectedToDefault = true;
      this.router.navigateByUrl(this.getDefaultRoute());
    }
  }

  get session$(): Observable<Session | null> {
    return this.supabase.session$;
  }

  shouldUseDefaultRoute(path?: string | null): boolean {
    if (!path) {
      return false;
    }
    const normalized = path.split('?')[0] || path;
    return this.legacyLandingRoutes.includes(normalized);
  }

  private createProvisionalProfile(user: SupabaseAuthUser): User {
    const metadata = (user.user_metadata ?? {}) as Record<string, any>;
    const now = new Date().toISOString();
    return {
      id: user.id,
      email: user.email || metadata['email'] || 'user@example.com',
      full_name: metadata['full_name'] || metadata['name'] || user.email || 'User',
      role: (metadata['role'] as UserRole) || UserRole.EMPLOYEE,
      department: metadata['department'],
      manager_id: metadata['manager_id'],
      created_at: user.created_at || now,
      updated_at: user.updated_at || now
    };
  }

  /**
   * Extract error message from unknown error type
   */
  private getErrorMessage(error: unknown, defaultMessage: string = 'An error occurred'): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (typeof error === 'object' && error !== null && 'message' in error) {
      return String(error.message);
    }
    return defaultMessage;
  }
}
