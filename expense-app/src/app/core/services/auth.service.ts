import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { LoginCredentials, RegisterCredentials, User } from '../models';
import { BehaviorSubject, Observable, from, map, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userProfileSubject = new BehaviorSubject<User | null>(null);
  public userProfile$: Observable<User | null> = this.userProfileSubject.asObservable();

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {
    // Subscribe to auth changes and load user profile
    this.supabase.currentUser$.subscribe(async (user) => {
      if (user) {
        await this.loadUserProfile(user.id);
      } else {
        this.userProfileSubject.next(null);
      }
    });
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
    return this.userRole === 'finance' || this.userRole === 'admin';
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
          return { success: false, error: error.message };
        }
        return { success: true };
      }),
      catchError((error) => {
        return of({ success: false, error: error.message || 'Registration failed' });
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
          return { success: false, error: error.message };
        }
        return { success: true };
      }),
      catchError((error) => {
        return of({ success: false, error: error.message || 'Login failed' });
      })
    );
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    await this.supabase.signOut();
    this.userProfileSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  /**
   * Request password reset
   */
  resetPassword(email: string): Observable<{ success: boolean; error?: string }> {
    return from(this.supabase.resetPassword(email)).pipe(
      map(({ error }) => {
        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true };
      }),
      catchError((error) => {
        return of({ success: false, error: error.message || 'Password reset failed' });
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
          return { success: false, error: error.message };
        }
        return { success: true };
      }),
      catchError((error) => {
        return of({ success: false, error: error.message || 'Password update failed' });
      })
    );
  }

  /**
   * Load user profile from database
   */
  private async loadUserProfile(userId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase.client
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        return;
      }

      this.userProfileSubject.next(data as User);
    } catch (error) {
      console.error('Error loading user profile:', error);
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
}
