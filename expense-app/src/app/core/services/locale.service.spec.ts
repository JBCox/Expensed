import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of, BehaviorSubject } from 'rxjs';
import { LocaleService, SUPPORTED_LANGUAGES, SupportedLanguage } from './locale.service';
import { SupabaseService } from './supabase.service';
import { OrganizationService } from './organization.service';
import { LoggerService } from './logger.service';
import { Organization } from '../models/organization.model';

describe('LocaleService', () => {
  let service: LocaleService;
  let translateServiceSpy: jasmine.SpyObj<TranslateService>;
  let supabaseServiceSpy: jasmine.SpyObj<SupabaseService>;
  let organizationServiceSpy: jasmine.SpyObj<OrganizationService>;
  let loggerServiceSpy: jasmine.SpyObj<LoggerService>;
  let currentOrganization$: BehaviorSubject<Organization | null>;
  let originalLocalStorage: Storage;
  let localStorageSpy: jasmine.SpyObj<Storage>;
  let originalDocumentElement: HTMLElement;

  const mockSupabaseClient = {
    from: jasmine.createSpy('from').and.returnValue({
      select: jasmine.createSpy('select').and.returnValue({
        eq: jasmine.createSpy('eq').and.returnValue({
          single: jasmine.createSpy('single').and.returnValue(
            Promise.resolve({ data: null, error: null })
          )
        })
      }),
      upsert: jasmine.createSpy('upsert').and.returnValue(
        Promise.resolve({ data: null, error: null })
      ),
      delete: jasmine.createSpy('delete').and.returnValue({
        eq: jasmine.createSpy('eq').and.returnValue(
          Promise.resolve({ data: null, error: null })
        )
      })
    })
  };

  beforeEach(() => {
    // Save originals
    originalLocalStorage = window.localStorage;
    originalDocumentElement = document.documentElement;

    // Mock localStorage
    localStorageSpy = jasmine.createSpyObj('localStorage', ['getItem', 'setItem', 'removeItem']);
    Object.defineProperty(window, 'localStorage', {
      value: localStorageSpy,
      writable: true,
      configurable: true
    });

    // Mock document.documentElement.lang
    const mockDocumentElement = {
      lang: 'en',
      classList: originalDocumentElement.classList,
      style: originalDocumentElement.style,
      appendChild: originalDocumentElement.appendChild.bind(originalDocumentElement)
    } as unknown as HTMLElement;

    Object.defineProperty(document, 'documentElement', {
      value: mockDocumentElement,
      writable: true,
      configurable: true
    });

    // Create spies
    translateServiceSpy = jasmine.createSpyObj('TranslateService', [
      'addLangs', 'setDefaultLang', 'use', 'getBrowserLang'
    ]);
    translateServiceSpy.getBrowserLang.and.returnValue('en');

    currentOrganization$ = new BehaviorSubject<Organization | null>(null);

    organizationServiceSpy = jasmine.createSpyObj('OrganizationService', [], {
      currentOrganization$: currentOrganization$.asObservable(),
      currentOrganization: null
    });

    supabaseServiceSpy = jasmine.createSpyObj('SupabaseService', [], {
      userId: null,
      client: mockSupabaseClient
    });

    loggerServiceSpy = jasmine.createSpyObj('LoggerService', [
      'debug', 'info', 'warn', 'error'
    ]);

    TestBed.configureTestingModule({
      providers: [
        LocaleService,
        { provide: TranslateService, useValue: translateServiceSpy },
        { provide: SupabaseService, useValue: supabaseServiceSpy },
        { provide: OrganizationService, useValue: organizationServiceSpy },
        { provide: LoggerService, useValue: loggerServiceSpy }
      ]
    });
  });

  afterEach(() => {
    // Restore originals
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true
    });

    Object.defineProperty(document, 'documentElement', {
      value: originalDocumentElement,
      writable: true,
      configurable: true
    });
  });

  describe('constructor', () => {
    it('should be created', () => {
      localStorageSpy.getItem.and.returnValue(null);
      service = TestBed.inject(LocaleService);
      expect(service).toBeTruthy();
    });

    it('should configure TranslateService with supported languages', () => {
      localStorageSpy.getItem.and.returnValue(null);
      service = TestBed.inject(LocaleService);

      expect(translateServiceSpy.addLangs).toHaveBeenCalledWith(['en', 'es', 'fr', 'de']);
      expect(translateServiceSpy.setDefaultLang).toHaveBeenCalledWith('en');
    });

    it('should initialize from localStorage cache if available', () => {
      localStorageSpy.getItem.and.returnValue('es');
      service = TestBed.inject(LocaleService);

      expect(service.currentLanguage()).toBe('es');
    });

    it('should fall back to browser language if no cache', () => {
      localStorageSpy.getItem.and.returnValue(null);
      translateServiceSpy.getBrowserLang.and.returnValue('fr');
      service = TestBed.inject(LocaleService);

      expect(service.currentLanguage()).toBe('fr');
    });

    it('should fall back to English if browser language not supported', () => {
      localStorageSpy.getItem.and.returnValue(null);
      translateServiceSpy.getBrowserLang.and.returnValue('zh');
      service = TestBed.inject(LocaleService);

      expect(service.currentLanguage()).toBe('en');
    });

    it('should mark as initialized after cache initialization', () => {
      localStorageSpy.getItem.and.returnValue(null);
      service = TestBed.inject(LocaleService);

      expect(service.initialized()).toBe(true);
    });
  });

  describe('SUPPORTED_LANGUAGES', () => {
    it('should contain English, Spanish, French, and German', () => {
      expect(SUPPORTED_LANGUAGES.length).toBe(4);
      expect(SUPPORTED_LANGUAGES.map(l => l.code)).toEqual(['en', 'es', 'fr', 'de']);
    });

    it('should have proper structure for each language', () => {
      SUPPORTED_LANGUAGES.forEach(lang => {
        expect(lang.code).toBeDefined();
        expect(lang.name).toBeDefined();
        expect(lang.nativeName).toBeDefined();
      });
    });
  });

  describe('isSupported', () => {
    beforeEach(() => {
      localStorageSpy.getItem.and.returnValue(null);
      service = TestBed.inject(LocaleService);
    });

    it('should return true for supported languages', () => {
      expect(service.isSupported('en')).toBe(true);
      expect(service.isSupported('es')).toBe(true);
      expect(service.isSupported('fr')).toBe(true);
      expect(service.isSupported('de')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(service.isSupported('zh')).toBe(false);
      expect(service.isSupported('ja')).toBe(false);
      expect(service.isSupported('invalid')).toBe(false);
    });
  });

  describe('setLanguage', () => {
    beforeEach(() => {
      localStorageSpy.getItem.and.returnValue(null);
      service = TestBed.inject(LocaleService);
    });

    it('should update currentLanguage signal', (done) => {
      service.setLanguage('es').subscribe(() => {
        expect(service.currentLanguage()).toBe('es');
        done();
      });
    });

    it('should save to localStorage', (done) => {
      service.setLanguage('fr').subscribe(() => {
        expect(localStorageSpy.setItem).toHaveBeenCalledWith('jensify-language-preference', 'fr');
        done();
      });
    });

    it('should return error for unsupported language', (done) => {
      service.setLanguage('invalid').subscribe({
        error: (err) => {
          expect(err.message).toContain('not supported');
          done();
        }
      });
    });

    it('should complete without database call when not logged in', (done) => {
      service.setLanguage('de').subscribe(() => {
        expect(service.currentLanguage()).toBe('de');
        done();
      });
    });
  });

  describe('getUserPreference', () => {
    beforeEach(() => {
      localStorageSpy.getItem.and.returnValue(null);
      service = TestBed.inject(LocaleService);
    });

    it('should return null when not logged in', (done) => {
      service.getUserPreference().subscribe(pref => {
        expect(pref).toBeNull();
        done();
      });
    });
  });

  describe('clearPreference', () => {
    beforeEach(() => {
      localStorageSpy.getItem.and.returnValue('es');
      service = TestBed.inject(LocaleService);
    });

    it('should remove from localStorage', (done) => {
      service.clearPreference().subscribe(() => {
        expect(localStorageSpy.removeItem).toHaveBeenCalledWith('jensify-language-preference');
        done();
      });
    });

    it('should reset to browser language when not logged in', (done) => {
      translateServiceSpy.getBrowserLang.and.returnValue('fr');
      service.clearPreference().subscribe(() => {
        expect(service.currentLanguage()).toBe('fr');
        done();
      });
    });

    it('should fall back to English if browser language not supported', (done) => {
      translateServiceSpy.getBrowserLang.and.returnValue('zh');
      service.clearPreference().subscribe(() => {
        expect(service.currentLanguage()).toBe('en');
        done();
      });
    });
  });

  describe('getLanguageName', () => {
    beforeEach(() => {
      localStorageSpy.getItem.and.returnValue(null);
      service = TestBed.inject(LocaleService);
    });

    it('should return native name for supported language', () => {
      expect(service.getLanguageName('en')).toBe('English');
      expect(service.getLanguageName('es')).toBe('Español');
      expect(service.getLanguageName('fr')).toBe('Français');
      expect(service.getLanguageName('de')).toBe('Deutsch');
    });

    it('should return code for unsupported language', () => {
      expect(service.getLanguageName('zh')).toBe('zh');
      expect(service.getLanguageName('invalid')).toBe('invalid');
    });
  });

  describe('getLanguageInfo', () => {
    beforeEach(() => {
      localStorageSpy.getItem.and.returnValue(null);
      service = TestBed.inject(LocaleService);
    });

    it('should return full info for supported language', () => {
      const info = service.getLanguageInfo('es');
      expect(info).toBeDefined();
      expect(info?.code).toBe('es');
      expect(info?.name).toBe('Spanish');
      expect(info?.nativeName).toBe('Español');
    });

    it('should return undefined for unsupported language', () => {
      expect(service.getLanguageInfo('zh')).toBeUndefined();
    });
  });

  describe('detectBrowserLanguage', () => {
    beforeEach(() => {
      localStorageSpy.getItem.and.returnValue(null);
      service = TestBed.inject(LocaleService);
    });

    it('should return browser language if supported', () => {
      translateServiceSpy.getBrowserLang.and.returnValue('de');
      expect(service.detectBrowserLanguage()).toBe('de');
    });

    it('should return English if browser language not supported', () => {
      translateServiceSpy.getBrowserLang.and.returnValue('ja');
      expect(service.detectBrowserLanguage()).toBe('en');
    });

    it('should return English if browser language is undefined', () => {
      translateServiceSpy.getBrowserLang.and.returnValue(undefined);
      expect(service.detectBrowserLanguage()).toBe('en');
    });
  });

  describe('supportedLanguages signal', () => {
    beforeEach(() => {
      localStorageSpy.getItem.and.returnValue(null);
      service = TestBed.inject(LocaleService);
    });

    it('should contain all supported languages', () => {
      const languages = service.supportedLanguages();
      expect(languages.length).toBe(4);
      expect(languages).toEqual(SUPPORTED_LANGUAGES);
    });
  });

  describe('ngOnDestroy', () => {
    beforeEach(() => {
      localStorageSpy.getItem.and.returnValue(null);
      service = TestBed.inject(LocaleService);
    });

    it('should clean up subscriptions', () => {
      // Should not throw
      expect(() => service.ngOnDestroy()).not.toThrow();
    });
  });

  describe('organization default language', () => {
    it('should be able to emit organization changes', (done) => {
      localStorageSpy.getItem.and.returnValue(null);
      service = TestBed.inject(LocaleService);

      // Emit organization with default language
      const mockOrg: Organization = {
        id: 'org-1',
        name: 'Test Org',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        settings: {
          default_language: 'de',
          expense_policies: {
            max_single_receipt: 5000,
            max_daily_total: 10000,
            max_receipt_age_days: 90
          },
          approval_workflow: {
            require_manager_approval: true,
            require_finance_approval: false
          }
        }
      };

      // The service is already initialized, so simulate org change
      currentOrganization$.next(mockOrg);

      // Wait for async operations and verify the subscription worked
      setTimeout(() => {
        // Verify the service is still functional after org emission
        expect(service.initialized()).toBe(true);
        done();
      }, 100);
    });
  });
});
