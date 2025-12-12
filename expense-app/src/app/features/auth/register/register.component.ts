import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo';

/**
 * Register Component
 * Allows new users to create an account.
 * Includes email validation, password strength checking, and password confirmation.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    BrandLogoComponent
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent implements OnInit, OnDestroy {
  private formBuilder = inject(FormBuilder);
  private authService = inject(AuthService);
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  // Cleanup
  private destroy$ = new Subject<void>();

  registerForm!: FormGroup;
  loading = false;
  checkingSignupStatus = true;
  signupsEnabled = true;
  errorMessage = '';
  successMessage = '';
  hidePassword = true;
  hideConfirmPassword = true;

  // Invitation token from URL (for cross-device support)
  private invitationToken: string | null = null;

  ngOnInit(): void {
    // Read invitation token from URL query params (cross-device support)
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.invitationToken = params['invitation_token'] || localStorage.getItem('pending_invitation_token');
      if (this.invitationToken) {
        // CRITICAL: Persist token to localStorage so it survives the email verification flow
        // When user clicks email verification link, auth-callback reads from localStorage
        localStorage.setItem('pending_invitation_token', this.invitationToken);
        console.log('%c[REGISTER] Invitation token found and persisted:', 'background: #9C27B0; color: white;', this.invitationToken);
      }
    });

    // Check if user is already authenticated with pending invitation
    // This handles edge case where user started registration, got interrupted,
    // and came back with an existing session
    if (this.authService.isAuthenticated) {
      const pendingToken = this.invitationToken || localStorage.getItem('pending_invitation_token');
      if (pendingToken) {
        // Redirect to accept invitation - token will be cleared there
        this.router.navigate(['/auth/accept-invitation'], {
          queryParams: { token: pendingToken }
        });
        return;
      }
      // Already authenticated without pending invitation - go to default route
      this.router.navigate([this.authService.getDefaultRoute()]);
      return;
    }

    this.checkSignupStatus();
    this.registerForm = this.formBuilder.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        this.passwordStrengthValidator
      ]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Check if signups are enabled via platform settings
   */
  private async checkSignupStatus(): Promise<void> {
    this.checkingSignupStatus = true;
    try {
      this.signupsEnabled = await this.supabaseService.areSignupsEnabled();
    } catch (error) {
      console.error('Failed to check signup status:', error);
      // Default to enabled on error
      this.signupsEnabled = true;
    } finally {
      this.checkingSignupStatus = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Getter for easy access to form controls in the template
   */
  get f() {
    return this.registerForm.controls;
  }

  /**
   * Custom validator to check password strength
   */
  private passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) {
      return null;
    }

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    const passwordValid = hasUpperCase && hasLowerCase && (hasNumeric || hasSpecialChar);

    return !passwordValid ? { passwordStrength: true } : null;
  }

  /**
   * Custom validator to check if passwords match
   */
  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  /**
   * Check if passwords match for displaying error message
   */
  get passwordsMatch(): boolean {
    const password = this.registerForm.get('password')?.value;
    const confirmPassword = this.registerForm.get('confirmPassword')?.value;
    return password === confirmPassword;
  }

  /**
   * Handle form submission
   */
  async onSubmit(): Promise<void> {
    // Reset messages
    this.errorMessage = '';
    this.successMessage = '';

    // Validate form
    if (this.registerForm.invalid) {
      Object.keys(this.registerForm.controls).forEach(key => {
        this.registerForm.controls[key].markAsTouched();
      });
      return;
    }

    this.loading = true;

    const { fullName, email, password, confirmPassword } = this.registerForm.value;

    // Ensure token is persisted before registration (safety net)
    if (this.invitationToken) {
      localStorage.setItem('pending_invitation_token', this.invitationToken);
    }

    this.authService.register({
      email,
      password,
      full_name: fullName,
      confirm_password: confirmPassword
    }, this.invitationToken || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result.success) {
            // Redirect to email confirmation page
            this.router.navigate(['/auth/confirm-email'], {
              queryParams: { email: email }
            });
          } else {
            this.errorMessage = this.getErrorMessage(result.error || 'Registration failed');
            this.cdr.markForCheck();
          }
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          // Handle registration errors
          if (error instanceof Error) {
            this.errorMessage = this.getErrorMessage(error.message);
          } else {
            this.errorMessage = 'An unexpected error occurred. Please try again.';
          }
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Convert Supabase error messages to user-friendly messages
   */
  private getErrorMessage(error: string): string {
    if (error.includes('already registered') || error.includes('already exists')) {
      return 'This email is already registered. Please use a different email or try logging in.';
    }
    if (error.includes('Password should be')) {
      return 'Password does not meet the requirements. Please use a stronger password.';
    }
    if (error.includes('Invalid email')) {
      return 'Please provide a valid email address.';
    }
    if (error.includes('Network')) {
      return 'Network error. Please check your connection and try again.';
    }
    return 'Registration failed. Please try again.';
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  /**
   * Toggle confirm password visibility
   */
  toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword = !this.hideConfirmPassword;
  }
}
