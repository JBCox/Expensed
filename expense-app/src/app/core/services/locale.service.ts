import { effect, Injectable, inject, signal, OnDestroy } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { from, Observable, of, Subject, throwError } from "rxjs";
import { catchError, map, takeUntil, tap } from "rxjs/operators";
import { SupabaseService } from "./supabase.service";
import { OrganizationService } from "./organization.service";
import { LoggerService } from "./logger.service";

/**
 * Represents a supported language
 */
export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
}

/**
 * List of supported languages
 * To add a new language:
 * 1. Add entry here
 * 2. Add row to supported_languages table
 * 3. Create assets/i18n/{code}.json translation file
 */
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
];

/**
 * Service for managing application locale/language
 *
 * Priority order for language selection:
 * 1. User preference (from database)
 * 2. Organization default (from org settings)
 * 3. Browser language
 * 4. Fallback to English
 *
 * @example
 * ```typescript
 * // In a component
 * localeService = inject(LocaleService);
 * currentLang = this.localeService.currentLanguage; // Signal<string>
 *
 * changeLanguage(code: string) {
 *   this.localeService.setLanguage(code).subscribe();
 * }
 * ```
 */
@Injectable({
  providedIn: "root",
})
export class LocaleService implements OnDestroy {
  private readonly LOCALE_KEY = "jensify-language-preference";

  private supabase = inject(SupabaseService);
  private organizationService = inject(OrganizationService);
  private translate = inject(TranslateService);
  private logger = inject(LoggerService);

  private destroy$ = new Subject<void>();

  /** Current active language code (e.g., 'en', 'es', 'fr', 'de') */
  currentLanguage = signal<string>('en');

  /** List of all supported languages */
  supportedLanguages = signal<SupportedLanguage[]>(SUPPORTED_LANGUAGES);

  /** Whether the locale has been fully initialized */
  initialized = signal<boolean>(false);

  constructor() {
    // Configure @ngx-translate
    this.translate.addLangs(SUPPORTED_LANGUAGES.map(l => l.code));
    this.translate.setDefaultLang('en');

    // Initialize language immediately from cache for fast UX
    this.initializeFromCache();

    // Effect to apply language changes
    effect(() => {
      const lang = this.currentLanguage();
      this.applyLanguage(lang);
    });

    // Subscribe to organization changes to apply org default when user has no preference
    this.organizationService.currentOrganization$
      .pipe(takeUntil(this.destroy$))
      .subscribe(org => {
        if (org?.settings?.default_language && this.initialized()) {
          // Check if user has a preference set
          this.getUserPreference().subscribe(userPref => {
            if (!userPref) {
              // No user preference, use org default
              const orgLang = org.settings?.default_language;
              if (orgLang && this.isSupported(orgLang)) {
                this.currentLanguage.set(orgLang);
                localStorage.setItem(this.LOCALE_KEY, orgLang);
              }
            }
          });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize language from localStorage cache for immediate UX
   * This runs synchronously before async database calls
   */
  private initializeFromCache(): void {
    const cached = localStorage.getItem(this.LOCALE_KEY);

    if (cached && this.isSupported(cached)) {
      this.currentLanguage.set(cached);
    } else {
      // Try browser language detection
      const browserLang = this.translate.getBrowserLang() || 'en';
      const detectedLang = this.isSupported(browserLang) ? browserLang : 'en';
      this.currentLanguage.set(detectedLang);
    }

    // Mark as initialized (cache-level)
    this.initialized.set(true);
  }

  /**
   * Fully initialize language by loading from database
   * Call this after user authentication
   */
  async initializeFromDatabase(): Promise<void> {
    const userId = this.supabase.userId;
    if (!userId) {
      this.logger.debug('No user ID, skipping database language load', 'LocaleService');
      return;
    }

    try {
      // Try to load user preference from database
      const { data, error } = await this.supabase.client
        .from('user_language_preferences')
        .select('preferred_language')
        .eq('user_id', userId)
        .single();

      if (!error && data?.preferred_language && this.isSupported(data.preferred_language)) {
        this.currentLanguage.set(data.preferred_language);
        localStorage.setItem(this.LOCALE_KEY, data.preferred_language);
        this.logger.info(`Loaded user language preference: ${data.preferred_language}`, 'LocaleService');
        return;
      }

      // No user preference - check organization default
      const org = this.organizationService.currentOrganization;
      if (org?.settings?.default_language && this.isSupported(org.settings.default_language)) {
        this.currentLanguage.set(org.settings.default_language);
        localStorage.setItem(this.LOCALE_KEY, org.settings.default_language);
        this.logger.info(`Using org default language: ${org.settings.default_language}`, 'LocaleService');
      }
    } catch {
      this.logger.warn('Failed to load language preference from database', 'LocaleService');
    }
  }

  /**
   * Apply the language to the app
   * Updates TranslateService and document lang attribute
   */
  private applyLanguage(langCode: string): void {
    this.translate.use(langCode);
    document.documentElement.lang = langCode;
    this.logger.debug(`Applied language: ${langCode}`, 'LocaleService');
  }

  /**
   * Set the user's preferred language
   * Saves to database and localStorage, updates UI immediately
   *
   * @param langCode The language code (e.g., 'en', 'es', 'fr', 'de')
   * @returns Observable that completes when saved
   */
  setLanguage(langCode: string): Observable<void> {
    if (!this.isSupported(langCode)) {
      return throwError(() => new Error(`Language '${langCode}' is not supported`));
    }

    // Update immediately for responsive UX
    this.currentLanguage.set(langCode);
    localStorage.setItem(this.LOCALE_KEY, langCode);

    const userId = this.supabase.userId;
    if (!userId) {
      // Not logged in, just use localStorage
      return of(undefined);
    }

    // Persist to database
    return from(
      this.supabase.client
        .from('user_language_preferences')
        .upsert({
          user_id: userId,
          preferred_language: langCode,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
        this.logger.info(`Saved language preference: ${langCode}`, 'LocaleService');
      }),
      catchError(err => {
        this.logger.error('Failed to save language preference', err, 'LocaleService');
        // Don't fail the operation - localStorage still works
        return of(undefined);
      })
    );
  }

  /**
   * Get the user's language preference from database
   * @returns Observable with language code or null if not set
   */
  getUserPreference(): Observable<string | null> {
    const userId = this.supabase.userId;
    if (!userId) {
      return of(null);
    }

    return from(
      this.supabase.client
        .from('user_language_preferences')
        .select('preferred_language')
        .eq('user_id', userId)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) return null;
        return data?.preferred_language || null;
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Clear the user's language preference
   * Falls back to organization default or browser language
   */
  clearPreference(): Observable<void> {
    localStorage.removeItem(this.LOCALE_KEY);

    const userId = this.supabase.userId;
    if (!userId) {
      // Reset to browser language
      const browserLang = this.translate.getBrowserLang() || 'en';
      this.currentLanguage.set(this.isSupported(browserLang) ? browserLang : 'en');
      return of(undefined);
    }

    return from(
      this.supabase.client
        .from('user_language_preferences')
        .delete()
        .eq('user_id', userId)
    ).pipe(
      tap(() => {
        // Check org default
        const org = this.organizationService.currentOrganization;
        if (org?.settings?.default_language && this.isSupported(org.settings.default_language)) {
          this.currentLanguage.set(org.settings.default_language);
        } else {
          const browserLang = this.translate.getBrowserLang() || 'en';
          this.currentLanguage.set(this.isSupported(browserLang) ? browserLang : 'en');
        }
      }),
      map(() => undefined),
      catchError(err => {
        this.logger.error('Failed to clear language preference', err, 'LocaleService');
        return of(undefined);
      })
    );
  }

  /**
   * Check if a language code is supported
   */
  isSupported(langCode: string): boolean {
    return SUPPORTED_LANGUAGES.some(l => l.code === langCode);
  }

  /**
   * Get the display name for a language code
   * Returns the native name (e.g., 'Español' for 'es')
   */
  getLanguageName(langCode: string): string {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === langCode);
    return lang?.nativeName || langCode;
  }

  /**
   * Get full language info for a code
   */
  getLanguageInfo(langCode: string): SupportedLanguage | undefined {
    return SUPPORTED_LANGUAGES.find(l => l.code === langCode);
  }

  /**
   * Detect browser language
   * @returns The browser language if supported, otherwise 'en'
   */
  detectBrowserLanguage(): string {
    const browserLang = this.translate.getBrowserLang() || 'en';
    return this.isSupported(browserLang) ? browserLang : 'en';
  }
}
