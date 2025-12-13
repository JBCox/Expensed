import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { OrganizationService } from '../../../core/services/organization.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LocaleService, SUPPORTED_LANGUAGES, SupportedLanguage } from '../../../core/services/locale.service';

/**
 * Admin component for configuring organization default language
 * Route: /organization/language
 *
 * Allows admins to:
 * - Set the default language for new users in the organization
 * - View available supported languages
 */
@Component({
  selector: 'app-language-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslateModule,
  ],
  template: `
    <div class="jensify-container">
      <div class="jensify-page-header">
        <div class="jensify-header-content">
          <a routerLink="/organization/admin" class="back-link">
            <mat-icon>arrow_back</mat-icon>
            {{ 'nav.admin' | translate }}
          </a>
          <h1 class="jensify-page-title">{{ 'language.title' | translate }}</h1>
          <p class="jensify-page-subtitle">{{ 'language.subtitle' | translate }}</p>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <div class="settings-grid">
          <!-- Language Settings Card -->
          <mat-card class="jensify-card settings-card">
            <mat-card-header>
              <mat-icon mat-card-avatar class="card-icon">translate</mat-icon>
              <mat-card-title>{{ 'language.defaultLanguage' | translate }}</mat-card-title>
            </mat-card-header>

            <mat-card-content>
              <form [formGroup]="form" (ngSubmit)="save()">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{ 'language.defaultLanguage' | translate }}</mat-label>
                  <mat-select formControlName="default_language">
                    @for (lang of languages; track lang.code) {
                      <mat-option [value]="lang.code">
                        <span class="language-option">
                          <span class="native-name">{{ lang.nativeName }}</span>
                          <span class="english-name">({{ lang.name }})</span>
                        </span>
                      </mat-option>
                    }
                  </mat-select>
                  <mat-hint>{{ 'language.defaultLanguageHint' | translate }}</mat-hint>
                </mat-form-field>

                <div class="info-box">
                  <mat-icon>info</mat-icon>
                  <span>{{ 'language.userCanOverride' | translate }}</span>
                </div>

                <div class="form-actions">
                  <button mat-flat-button color="primary" type="submit"
                          [disabled]="!form.dirty || saving()">
                    @if (saving()) {
                      <mat-spinner diameter="20"></mat-spinner>
                    } @else {
                      <mat-icon>save</mat-icon>
                      {{ 'common.save' | translate }}
                    }
                  </button>
                </div>
              </form>
            </mat-card-content>
          </mat-card>

          <!-- Supported Languages Card -->
          <mat-card class="jensify-card languages-card">
            <mat-card-header>
              <mat-icon mat-card-avatar class="card-icon info-icon">language</mat-icon>
              <mat-card-title>Supported Languages</mat-card-title>
              <mat-card-subtitle>Languages available in the application</mat-card-subtitle>
            </mat-card-header>

            <mat-card-content>
              <div class="languages-list">
                @for (lang of languages; track lang.code) {
                  <div class="language-item" [class.active]="lang.code === currentLanguage()">
                    <div class="language-info">
                      <span class="language-native">{{ lang.nativeName }}</span>
                      <span class="language-english">{{ lang.name }}</span>
                    </div>
                    <span class="language-code">{{ lang.code }}</span>
                  </div>
                }
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      }
    </div>
  `,
  styles: [`
    .loading-container {
      display: flex;
      justify-content: center;
      padding: var(--jensify-spacing-xl, 2rem);
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      color: var(--jensify-text-muted, #666);
      text-decoration: none;
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
      transition: color 0.2s ease;

      &:hover {
        color: var(--jensify-primary, #ff5900);
      }

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: var(--jensify-spacing-lg, 1.5rem);
    }

    .card-icon {
      background: var(--jensify-primary, #ff5900);
      color: white;
      border-radius: var(--jensify-radius-md, 8px);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
    }

    .info-icon {
      background: var(--jensify-info, #3b82f6);
    }

    .full-width {
      width: 100%;
      margin-bottom: var(--jensify-spacing-md, 1rem);
    }

    .language-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .native-name {
      font-weight: 500;
    }

    .english-name {
      color: var(--jensify-text-muted, #666);
      font-size: 0.875rem;
    }

    .info-box {
      display: flex;
      align-items: flex-start;
      gap: var(--jensify-spacing-sm, 0.5rem);
      padding: var(--jensify-spacing-md, 1rem);
      background: var(--jensify-bg-soft, #f5f5f5);
      border-radius: var(--jensify-radius-md, 8px);
      margin-bottom: var(--jensify-spacing-md, 1rem);

      mat-icon {
        color: var(--jensify-info, #3b82f6);
        font-size: 20px;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        margin-top: 2px;
      }

      span {
        font-size: 0.875rem;
        color: var(--jensify-text-muted, #666);
        line-height: 1.5;
      }
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      padding-top: var(--jensify-spacing-md, 1rem);
    }

    .form-actions button {
      display: flex;
      align-items: center;
      gap: var(--jensify-spacing-xs, 0.25rem);
    }

    .languages-list {
      display: flex;
      flex-direction: column;
      gap: var(--jensify-spacing-sm, 0.5rem);
    }

    .language-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--jensify-spacing-sm, 0.5rem) var(--jensify-spacing-md, 1rem);
      background: var(--jensify-bg-soft, #f8f8f8);
      border-radius: var(--jensify-radius-sm, 4px);
      border: 1px solid transparent;
      transition: all 0.2s ease;

      &.active {
        border-color: var(--jensify-primary, #ff5900);
        background: var(--jensify-primary-soft, rgba(255, 89, 0, 0.05));
      }
    }

    .language-info {
      display: flex;
      flex-direction: column;
    }

    .language-native {
      font-weight: 500;
      color: var(--jensify-text-strong, #1a1a1a);
    }

    .language-english {
      font-size: 0.75rem;
      color: var(--jensify-text-muted, #666);
    }

    .language-code {
      font-family: monospace;
      font-size: 0.75rem;
      color: var(--jensify-text-muted, #999);
      background: var(--jensify-bg-muted, #eee);
      padding: 0.125rem 0.5rem;
      border-radius: var(--jensify-radius-sm, 4px);
    }

    :host-context(.dark) {
      .back-link {
        color: rgba(255, 255, 255, 0.6);

        &:hover {
          color: var(--jensify-primary, #ff5900);
        }
      }

      .info-box {
        background: rgba(255, 255, 255, 0.05);

        span {
          color: rgba(255, 255, 255, 0.7);
        }
      }

      .language-item {
        background: rgba(255, 255, 255, 0.05);

        &.active {
          background: rgba(255, 89, 0, 0.1);
        }
      }

      .language-native {
        color: #fff;
      }

      .language-english,
      .english-name {
        color: rgba(255, 255, 255, 0.6);
      }

      .language-code {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.5);
      }
    }

    @media (max-width: 767px) {
      .settings-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private organizationService = inject(OrganizationService);
  private notificationService = inject(NotificationService);
  private localeService = inject(LocaleService);
  private translate = inject(TranslateService);

  loading = signal(true);
  saving = signal(false);
  currentLanguage = this.localeService.currentLanguage;

  languages: SupportedLanguage[] = SUPPORTED_LANGUAGES;

  form: FormGroup = this.fb.group({
    default_language: ['en'],
  });

  ngOnInit(): void {
    this.loadSettings();
  }

  async loadSettings(): Promise<void> {
    try {
      this.organizationService.currentOrganization$.subscribe(org => {
        if (org) {
          const defaultLang = org.settings?.default_language || 'en';
          this.form.patchValue({
            default_language: defaultLang,
          });
          this.form.markAsPristine();
          this.loading.set(false);
        }
      });
    } catch {
      this.notificationService.showError(
        this.translate.instant('language.saveError')
      );
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid || !this.form.dirty) return;

    this.saving.set(true);

    const currentOrg = this.organizationService.currentOrganization;
    if (!currentOrg) {
      this.notificationService.showError('No organization found');
      this.saving.set(false);
      return;
    }

    try {
      // Merge new language setting with existing settings
      const updatedSettings = {
        ...currentOrg.settings,
        default_language: this.form.value.default_language,
      };

      this.organizationService.updateOrganization(currentOrg.id, {
        settings: updatedSettings,
      }).subscribe({
        next: () => {
          this.notificationService.showSuccess(
            this.translate.instant('language.saveSuccess')
          );
          this.form.markAsPristine();
          this.saving.set(false);
        },
        error: () => {
          this.notificationService.showError(
            this.translate.instant('language.saveError')
          );
          this.saving.set(false);
        },
      });
    } catch {
      this.notificationService.showError(
        this.translate.instant('language.saveError')
      );
      this.saving.set(false);
    }
  }
}
