import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PayoutService } from '../../../core/services/payout.service';
import { OrganizationService } from '../../../core/services/organization.service';
import { PayoutMethod } from '../../../core/models/payout.model';

/**
 * Payout Settings Component
 *
 * Allows organization admins to:
 * 1. Choose between manual (CSV export) and Stripe automated payouts
 * 2. Enter their own Stripe API key for direct integration
 * 3. View Stripe configuration status
 *
 * SECURITY: Stripe API keys are encrypted at rest in the database.
 * The key is validated with Stripe before being stored.
 */
@Component({
  selector: 'app-payout-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <div class="jensify-container">
      <div class="jensify-page-header">
        <div class="jensify-header-content">
          <h1 class="jensify-page-title">Payout Settings</h1>
          <p class="jensify-page-subtitle">Configure how employees get reimbursed for approved expenses</p>
        </div>
      </div>

      <!-- Payout Method Selection -->
      <mat-card class="jensify-card method-card">
        <mat-card-header>
          <mat-icon mat-card-avatar class="card-icon">payments</mat-icon>
          <mat-card-title>Payout Method</mat-card-title>
          <mat-card-subtitle>Choose how to process employee reimbursements</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <div class="method-options">
            <div
              class="method-option"
              [class.selected]="payoutMethod() === 'manual'"
              (click)="selectMethod('manual')"
              role="button"
              tabindex="0"
              (keyup.enter)="selectMethod('manual')"
            >
              <div class="method-icon manual">
                <mat-icon>download</mat-icon>
              </div>
              <div class="method-details">
                <h3>Manual / CSV Export</h3>
                <p>Export approved expenses to CSV and process payments outside Jensify using your existing payroll or banking system.</p>
                <div class="method-features">
                  <span class="feature"><mat-icon>check</mat-icon> No setup required</span>
                  <span class="feature"><mat-icon>check</mat-icon> Use your existing process</span>
                  <span class="feature"><mat-icon>check</mat-icon> Full control</span>
                </div>
              </div>
              <mat-icon class="check-icon" *ngIf="payoutMethod() === 'manual'">check_circle</mat-icon>
            </div>

            <div
              class="method-option"
              [class.selected]="payoutMethod() === 'stripe'"
              [class.disabled]="!stripeConfigured()"
              (click)="selectMethod('stripe')"
              role="button"
              tabindex="0"
              (keyup.enter)="selectMethod('stripe')"
            >
              <div class="method-icon stripe">
                <mat-icon>bolt</mat-icon>
              </div>
              <div class="method-details">
                <h3>Stripe (Automated)</h3>
                <p>Use your Stripe account to send direct ACH deposits to employee bank accounts.</p>
                <div class="method-features">
                  <span class="feature"><mat-icon>check</mat-icon> Automated payouts</span>
                  <span class="feature"><mat-icon>check</mat-icon> 1-2 day delivery</span>
                  <span class="feature"><mat-icon>check</mat-icon> Your own Stripe account</span>
                </div>
                @if (!stripeConfigured()) {
                  <mat-chip class="status-chip pending">Setup required</mat-chip>
                }
              </div>
              <mat-icon class="check-icon" *ngIf="payoutMethod() === 'stripe'">check_circle</mat-icon>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Stripe Configuration Section -->
      <mat-card class="jensify-card stripe-card">
        <mat-card-header>
          <mat-icon mat-card-avatar class="card-icon stripe-icon">account_balance</mat-icon>
          <mat-card-title>Stripe Configuration</mat-card-title>
          <mat-card-subtitle>
            @if (stripeConfigured()) {
              Your Stripe API key is configured and ready for payouts
            } @else {
              Enter your Stripe API key to enable automated payouts
            }
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <!-- Status Display -->
          <div class="stripe-status">
            <div class="status-row">
              <span class="status-label">Status:</span>
              <mat-chip [class]="'status-chip ' + (stripeConfigured() ? 'active' : 'not_connected')">
                {{ stripeConfigured() ? 'Configured' : 'Not Configured' }}
              </mat-chip>
            </div>

            @if (stripeConfigured()) {
              <div class="status-row">
                <span class="status-label">API Key:</span>
                <span class="status-value key-display">
                  <mat-icon>vpn_key</mat-icon>
                  sk_****{{ keyLast4() }}
                </span>
              </div>

              @if (keySetAt()) {
                <div class="status-row">
                  <span class="status-label">Configured:</span>
                  <span class="status-value">{{ keySetAt() | date:'medium' }}</span>
                </div>
              }
            }
          </div>

          <mat-divider></mat-divider>

          <!-- API Key Form -->
          <div class="stripe-form">
            @if (!stripeConfigured()) {
              <form [formGroup]="keyForm" (ngSubmit)="saveStripeKey()">
                <mat-form-field appearance="outline" class="key-field">
                  <mat-label>Stripe Secret Key</mat-label>
                  <input
                    matInput
                    formControlName="stripeKey"
                    [type]="showKey() ? 'text' : 'password'"
                    placeholder="sk_live_... or sk_test_..."
                  >
                  <button
                    mat-icon-button
                    matSuffix
                    type="button"
                    (click)="toggleShowKey()"
                    [matTooltip]="showKey() ? 'Hide key' : 'Show key'"
                  >
                    <mat-icon>{{ showKey() ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                  <mat-hint>Your Stripe secret key starts with sk_live_ or sk_test_</mat-hint>
                  @if (keyForm.get('stripeKey')?.hasError('required')) {
                    <mat-error>API key is required</mat-error>
                  }
                  @if (keyForm.get('stripeKey')?.hasError('pattern')) {
                    <mat-error>Key must start with sk_</mat-error>
                  }
                </mat-form-field>

                <div class="form-actions">
                  <button
                    mat-stroked-button
                    type="button"
                    [disabled]="testing() || !keyForm.valid"
                    (click)="testStripeKey()"
                  >
                    @if (testing()) {
                      <mat-spinner diameter="20"></mat-spinner>
                    } @else {
                      <mat-icon>science</mat-icon>
                      Test Key
                    }
                  </button>

                  <button
                    mat-raised-button
                    color="primary"
                    type="submit"
                    [disabled]="saving() || !keyForm.valid"
                  >
                    @if (saving()) {
                      <mat-spinner diameter="20"></mat-spinner>
                    } @else {
                      <mat-icon>save</mat-icon>
                      Save Key
                    }
                  </button>
                </div>

                @if (testResult()) {
                  <div class="test-result" [class.success]="testResult()?.valid" [class.error]="!testResult()?.valid">
                    <mat-icon>{{ testResult()?.valid ? 'check_circle' : 'error' }}</mat-icon>
                    @if (testResult()?.valid) {
                      <span>
                        Key is valid!
                        {{ testResult()?.livemode ? '(Live mode)' : '(Test mode)' }}
                      </span>
                    } @else {
                      <span>{{ testResult()?.error || 'Invalid key' }}</span>
                    }
                  </div>
                }
              </form>

              <div class="help-text">
                <mat-icon>info</mat-icon>
                <p>
                  Find your API key in your
                  <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener">
                    Stripe Dashboard <mat-icon class="external-link">open_in_new</mat-icon>
                  </a>
                </p>
              </div>
            } @else {
              <!-- Already configured - show remove option -->
              <div class="configured-actions">
                <button
                  mat-stroked-button
                  color="warn"
                  (click)="removeStripeKey()"
                  [disabled]="removing()"
                >
                  @if (removing()) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    <mat-icon>delete</mat-icon>
                    Remove API Key
                  }
                </button>
                <p class="action-hint warn">
                  Removing the API key will switch to manual payout mode.
                </p>
              </div>
            }
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Info Card -->
      <mat-card class="jensify-card info-card">
        <mat-card-header>
          <mat-icon mat-card-avatar class="card-icon info-icon">info</mat-icon>
          <mat-card-title>How It Works</mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <div class="info-grid">
            <div class="info-item">
              <mat-icon>security</mat-icon>
              <div>
                <h4>Secure Storage</h4>
                <p>Your Stripe API key is encrypted at rest. We only use it to process payouts on your behalf.</p>
              </div>
            </div>

            <div class="info-item">
              <mat-icon>account_balance_wallet</mat-icon>
              <div>
                <h4>Your Stripe Account</h4>
                <p>All fees are billed directly to your Stripe account. Jensify doesn't charge any additional fees.</p>
              </div>
            </div>

            <div class="info-item">
              <mat-icon>group</mat-icon>
              <div>
                <h4>Employee Setup</h4>
                <p>Employees add their bank account securely through Stripe. Verification via micro-deposits ensures account ownership.</p>
              </div>
            </div>

            <div class="info-item">
              <mat-icon>speed</mat-icon>
              <div>
                <h4>Fast Payouts</h4>
                <p>ACH transfers typically arrive in 1-2 business days. Finance can process payouts with one click.</p>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .method-card {
      margin-bottom: 1.5rem;
    }

    .card-icon {
      background: var(--jensify-primary, #ff5900);
      color: white;
      width: 40px !important;
      height: 40px !important;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stripe-icon {
      background: #635bff;
    }

    .info-icon {
      background: #2196f3;
    }

    .method-options {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding-top: 1rem;
    }

    .method-option {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.5rem;
      border: 2px solid var(--jensify-border-light, #e0e0e0);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;

      &:hover:not(.disabled) {
        border-color: var(--jensify-primary, #ff5900);
        background: color-mix(in srgb, var(--jensify-primary) 2%, transparent);
      }

      &.selected {
        border-color: var(--jensify-primary, #ff5900);
        background: color-mix(in srgb, var(--jensify-primary) 5%, transparent);
      }

      &.disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
    }

    .method-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        color: white;
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      &.manual {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }

      &.stripe {
        background: linear-gradient(135deg, #635bff 0%, #00d4ff 100%);
      }
    }

    .method-details {
      flex: 1;

      h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1.1rem;
        font-weight: 600;
      }

      p {
        margin: 0 0 0.75rem 0;
        color: var(--jensify-text-secondary, #666);
        font-size: 0.9rem;
        line-height: 1.5;
      }
    }

    .method-features {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .feature {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8rem;
      color: var(--jensify-text-secondary, #666);

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: var(--jensify-success, #4caf50);
      }
    }

    .check-icon {
      position: absolute;
      top: 1rem;
      right: 1rem;
      color: var(--jensify-primary, #ff5900);
    }

    /* Stripe Card */
    .stripe-card {
      margin-bottom: 1.5rem;
    }

    .stripe-status {
      padding: 1rem 0;
    }

    .status-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }

    .status-label {
      font-weight: 500;
      color: var(--jensify-text-secondary, #666);
      min-width: 140px;
    }

    .status-value {
      font-weight: 500;
    }

    .key-display {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-family: monospace;
      background: var(--jensify-surface-soft, #f5f5f5);
      padding: 0.25rem 0.75rem;
      border-radius: 4px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--jensify-text-muted, #999);
      }
    }

    .status-chip {
      &.active {
        background: rgba(76, 175, 80, 0.15) !important;
        color: #2e7d32 !important;
      }

      &.pending {
        background: rgba(255, 152, 0, 0.15) !important;
        color: #e65100 !important;
      }

      &.not_connected {
        background: rgba(158, 158, 158, 0.15) !important;
        color: #616161 !important;
      }
    }

    mat-divider {
      margin: 1rem 0;
    }

    /* Stripe Form */
    .stripe-form {
      padding-top: 1rem;
    }

    .key-field {
      width: 100%;
      max-width: 500px;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;

      button {
        display: flex;
        align-items: center;
        gap: 0.5rem;

        mat-spinner {
          margin: 0;
        }
      }
    }

    .test-result {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1rem;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.9rem;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      &.success {
        background: rgba(76, 175, 80, 0.1);
        color: #2e7d32;
      }

      &.error {
        background: rgba(244, 67, 54, 0.1);
        color: #c62828;
      }
    }

    .help-text {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin-top: 1.5rem;
      padding: 1rem;
      background: var(--jensify-surface-soft, #f5f5f5);
      border-radius: 8px;

      > mat-icon {
        color: #2196f3;
        flex-shrink: 0;
      }

      p {
        margin: 0;
        font-size: 0.9rem;
        color: var(--jensify-text-secondary, #666);

        a {
          color: var(--jensify-primary, #ff5900);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;

          &:hover {
            text-decoration: underline;
          }

          .external-link {
            font-size: 14px;
            width: 14px;
            height: 14px;
          }
        }
      }
    }

    .configured-actions {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;

      button {
        display: flex;
        align-items: center;
        gap: 0.5rem;

        mat-spinner {
          margin: 0;
        }
      }
    }

    .action-hint {
      margin: 0;
      font-size: 0.85rem;
      color: var(--jensify-text-muted, #999);

      &.warn {
        color: var(--jensify-warn, #f44336);
      }
    }

    /* Info Card */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      padding-top: 1rem;
    }

    .info-item {
      display: flex;
      gap: 1rem;

      > mat-icon {
        color: var(--jensify-primary, #ff5900);
        font-size: 24px;
        width: 24px;
        height: 24px;
        flex-shrink: 0;
      }

      h4 {
        margin: 0 0 0.25rem 0;
        font-size: 0.95rem;
        font-weight: 600;
      }

      p {
        margin: 0;
        font-size: 0.85rem;
        color: var(--jensify-text-secondary, #666);
        line-height: 1.5;
      }
    }

    /* Dark mode */
    :host-context(.dark) {
      .method-option {
        border-color: rgba(255, 255, 255, 0.12);

        &:hover:not(.disabled) {
          background: color-mix(in srgb, var(--jensify-primary) 8%, transparent);
        }

        &.selected {
          background: color-mix(in srgb, var(--jensify-primary) 12%, transparent);
        }
      }

      .method-details p,
      .feature,
      .status-label,
      .action-hint,
      .info-item p {
        color: rgba(255, 255, 255, 0.7);
      }

      .key-display,
      .help-text {
        background: rgba(255, 255, 255, 0.05);
      }
    }

    /* Mobile */
    @media (max-width: 599px) {
      .method-option {
        flex-direction: column;
        text-align: center;
      }

      .method-features {
        justify-content: center;
      }

      .check-icon {
        position: static;
        align-self: center;
      }

      .status-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .status-label {
        min-width: unset;
      }

      .form-actions {
        flex-direction: column;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayoutSettingsComponent implements OnInit, OnDestroy {
  private payoutService = inject(PayoutService);
  private organizationService = inject(OrganizationService);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  // State
  loading = signal(false);
  saving = signal(false);
  testing = signal(false);
  removing = signal(false);
  showKey = signal(false);

  payoutMethod = signal<PayoutMethod>('manual');
  stripeConfigured = signal(false);
  keyLast4 = signal<string | null>(null);
  keySetAt = signal<string | null>(null);

  testResult = signal<{ valid: boolean; livemode?: boolean; error?: string } | null>(null);

  // Form
  keyForm = this.fb.group({
    stripeKey: ['', [Validators.required, Validators.pattern(/^sk_.+/)]]
  });

  private organizationId: string | null = null;

  ngOnInit(): void {
    // Get current organization
    this.organizationService.currentOrganization$
      .pipe(takeUntil(this.destroy$))
      .subscribe(org => {
        if (org) {
          this.organizationId = org.id;
          this.loadStripeStatus();
        }
      });

    // Handle redirect callback
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['stripe'] === 'success') {
          this.snackBar.open('Stripe configured successfully!', 'Close', { duration: 5000 });
          this.loadStripeStatus();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadStripeStatus(): void {
    if (!this.organizationId) return;

    this.loading.set(true);
    this.payoutService.getStripeAccountStatus(this.organizationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          this.payoutMethod.set(status.payout_method || 'manual');
          this.stripeConfigured.set(status.has_key || status.connected || false);
          this.keyLast4.set(status.key_last4 || null);
          this.keySetAt.set(status.key_set_at || null);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Failed to load Stripe status:', error);
          this.loading.set(false);
        }
      });
  }

  toggleShowKey(): void {
    this.showKey.update(v => !v);
  }

  selectMethod(method: PayoutMethod): void {
    if (!this.organizationId) return;

    // Can only select Stripe if configured
    if (method === 'stripe' && !this.stripeConfigured()) {
      this.snackBar.open('Please configure your Stripe API key first', 'Close', { duration: 3000 });
      return;
    }

    if (method === this.payoutMethod()) return;

    this.loading.set(true);
    this.payoutService.updatePayoutMethod(this.organizationId, method)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.payoutMethod.set(method);
          this.snackBar.open(
            method === 'stripe'
              ? 'Switched to automated Stripe payouts'
              : 'Switched to manual CSV export',
            'Close',
            { duration: 3000 }
          );
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Failed to update payout method:', error);
          this.snackBar.open(error.message || 'Failed to update payout method', 'Close', { duration: 3000 });
          this.loading.set(false);
        }
      });
  }

  testStripeKey(): void {
    if (!this.keyForm.valid) return;

    const stripeKey = this.keyForm.get('stripeKey')?.value;
    if (!stripeKey) return;

    this.testing.set(true);
    this.testResult.set(null);

    this.payoutService.testStripeKey(stripeKey)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.testResult.set(result);
          this.testing.set(false);
        },
        error: (error) => {
          this.testResult.set({ valid: false, error: error.message || 'Test failed' });
          this.testing.set(false);
        }
      });
  }

  saveStripeKey(): void {
    if (!this.organizationId || !this.keyForm.valid) return;

    const stripeKey = this.keyForm.get('stripeKey')?.value;
    if (!stripeKey) return;

    this.saving.set(true);

    this.payoutService.setStripeKey(this.organizationId, stripeKey)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Stripe API key saved successfully!', 'Close', { duration: 5000 });
          this.keyForm.reset();
          this.testResult.set(null);
          this.loadStripeStatus();
          this.saving.set(false);
        },
        error: (error) => {
          console.error('Failed to save Stripe key:', error);
          this.snackBar.open(error.message || 'Failed to save Stripe key', 'Close', { duration: 3000 });
          this.saving.set(false);
        }
      });
  }

  removeStripeKey(): void {
    if (!this.organizationId) return;

    if (!confirm('Are you sure you want to remove the Stripe API key? This will switch to manual payout mode.')) {
      return;
    }

    this.removing.set(true);

    this.payoutService.removeStripeKey(this.organizationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.stripeConfigured.set(false);
          this.keyLast4.set(null);
          this.keySetAt.set(null);
          this.payoutMethod.set('manual');
          this.snackBar.open('Stripe API key removed', 'Close', { duration: 3000 });
          this.removing.set(false);
        },
        error: (error) => {
          console.error('Failed to remove Stripe key:', error);
          this.snackBar.open(error.message || 'Failed to remove Stripe key', 'Close', { duration: 3000 });
          this.removing.set(false);
        }
      });
  }
}
