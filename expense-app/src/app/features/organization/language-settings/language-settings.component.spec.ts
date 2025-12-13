import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSettingsComponent } from './language-settings.component';
import { OrganizationService } from '../../../core/services/organization.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LocaleService, SUPPORTED_LANGUAGES } from '../../../core/services/locale.service';
import { Organization } from '../../../core/models/organization.model';

describe('LanguageSettingsComponent', () => {
  let component: LanguageSettingsComponent;
  let fixture: ComponentFixture<LanguageSettingsComponent>;
  let mockOrganizationService: jasmine.SpyObj<OrganizationService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;
  let mockLocaleService: jasmine.SpyObj<LocaleService>;

  const mockOrganization: Organization = {
    id: 'org-1',
    name: 'Test Company',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    settings: {
      default_language: 'en',
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

  const mockOrganizationWithSpanish: Organization = {
    ...mockOrganization,
    settings: {
      ...mockOrganization.settings,
      default_language: 'es'
    }
  };

  beforeEach(async () => {
    mockOrganizationService = jasmine.createSpyObj('OrganizationService', [
      'updateOrganization'
    ], {
      currentOrganization$: of(mockOrganization),
      currentOrganization: mockOrganization
    });
    mockOrganizationService.updateOrganization.and.returnValue(of(mockOrganization));

    mockNotificationService = jasmine.createSpyObj('NotificationService', [
      'showSuccess', 'showError'
    ]);

    mockLocaleService = jasmine.createSpyObj('LocaleService', [], {
      currentLanguage: signal('en'),
      supportedLanguages: signal(SUPPORTED_LANGUAGES)
    });

    await TestBed.configureTestingModule({
      imports: [
        LanguageSettingsComponent,
        ReactiveFormsModule,
        NoopAnimationsModule,
        RouterTestingModule,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: OrganizationService, useValue: mockOrganizationService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: LocaleService, useValue: mockLocaleService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize the form with default_language control', () => {
      expect(component.form).toBeDefined();
      expect(component.form.get('default_language')).toBeDefined();
    });

    it('should have all supported languages available', () => {
      expect(component.languages).toEqual(SUPPORTED_LANGUAGES);
      expect(component.languages.length).toBe(4);
    });

    it('should load organization default language on init', fakeAsync(() => {
      tick();
      expect(component.form.get('default_language')?.value).toBe('en');
      expect(component.loading()).toBe(false);
    }));

    it('should load Spanish when org has Spanish default', fakeAsync(() => {
      Object.defineProperty(mockOrganizationService, 'currentOrganization$', {
        get: () => of(mockOrganizationWithSpanish),
        configurable: true
      });

      const newFixture = TestBed.createComponent(LanguageSettingsComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();
      tick();

      expect(newComponent.form.get('default_language')?.value).toBe('es');
    }));

    it('should default to English if no language setting exists', fakeAsync(() => {
      const orgWithoutLang: Organization = {
        ...mockOrganization,
        settings: {
          expense_policies: mockOrganization.settings!.expense_policies,
          approval_workflow: mockOrganization.settings!.approval_workflow
        }
      };

      Object.defineProperty(mockOrganizationService, 'currentOrganization$', {
        get: () => of(orgWithoutLang),
        configurable: true
      });

      const newFixture = TestBed.createComponent(LanguageSettingsComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();
      tick();

      expect(newComponent.form.get('default_language')?.value).toBe('en');
    }));

    it('should mark form as pristine after loading', fakeAsync(() => {
      tick();
      expect(component.form.pristine).toBe(true);
    }));
  });

  describe('languages list', () => {
    it('should include English', () => {
      const english = component.languages.find(l => l.code === 'en');
      expect(english).toBeDefined();
      expect(english?.name).toBe('English');
      expect(english?.nativeName).toBe('English');
    });

    it('should include Spanish', () => {
      const spanish = component.languages.find(l => l.code === 'es');
      expect(spanish).toBeDefined();
      expect(spanish?.name).toBe('Spanish');
      expect(spanish?.nativeName).toBe('Español');
    });

    it('should include French', () => {
      const french = component.languages.find(l => l.code === 'fr');
      expect(french).toBeDefined();
      expect(french?.name).toBe('French');
      expect(french?.nativeName).toBe('Français');
    });

    it('should include German', () => {
      const german = component.languages.find(l => l.code === 'de');
      expect(german).toBeDefined();
      expect(german?.name).toBe('German');
      expect(german?.nativeName).toBe('Deutsch');
    });
  });

  describe('save', () => {
    beforeEach(() => {
      mockOrganizationService.updateOrganization.and.returnValue(of(mockOrganization));
    });

    it('should not save if form is not dirty', async () => {
      component.form.markAsPristine();
      await component.save();
      expect(mockOrganizationService.updateOrganization).not.toHaveBeenCalled();
    });

    it('should not save if form is invalid', async () => {
      component.form.setErrors({ invalid: true });
      component.form.markAsDirty();
      await component.save();
      expect(mockOrganizationService.updateOrganization).not.toHaveBeenCalled();
    });

    it('should show error if no organization is found', fakeAsync(() => {
      Object.defineProperty(mockOrganizationService, 'currentOrganization', {
        get: () => null,
        configurable: true
      });

      component.form.markAsDirty();
      component.save();
      tick();

      expect(mockNotificationService.showError).toHaveBeenCalledWith('No organization found');
      expect(component.saving()).toBe(false);
    }));

    it('should save language settings successfully', fakeAsync(() => {
      component.form.patchValue({ default_language: 'fr' });
      component.form.markAsDirty();

      component.save();
      tick();

      expect(mockOrganizationService.updateOrganization).toHaveBeenCalledWith(
        'org-1',
        jasmine.objectContaining({
          settings: jasmine.objectContaining({
            default_language: 'fr'
          })
        })
      );
      expect(mockNotificationService.showSuccess).toHaveBeenCalled();
      expect(component.saving()).toBe(false);
    }));

    it('should merge with existing settings when saving', fakeAsync(() => {
      component.form.patchValue({ default_language: 'de' });
      component.form.markAsDirty();

      component.save();
      tick();

      const updateCall = mockOrganizationService.updateOrganization.calls.mostRecent();
      const settings = updateCall.args[1].settings;

      // Should preserve existing settings
      expect(settings?.expense_policies).toBeDefined();
      expect(settings?.approval_workflow).toBeDefined();
      // And add new language
      expect(settings?.default_language).toBe('de');
    }));

    it('should handle save error', fakeAsync(() => {
      mockOrganizationService.updateOrganization.and.returnValue(
        throwError(() => new Error('Save failed'))
      );

      component.form.patchValue({ default_language: 'es' });
      component.form.markAsDirty();

      component.save();
      tick();

      expect(mockNotificationService.showError).toHaveBeenCalled();
      expect(component.saving()).toBe(false);
    }));

    it('should set saving state during save operation', fakeAsync(() => {
      component.form.patchValue({ default_language: 'fr' });
      component.form.markAsDirty();

      component.save();
      tick();

      expect(component.saving()).toBe(false);
    }));

    it('should mark form as pristine after successful save', fakeAsync(() => {
      component.form.patchValue({ default_language: 'fr' });
      component.form.markAsDirty();

      component.save();
      tick();

      expect(component.form.pristine).toBe(true);
    }));
  });

  describe('currentLanguage binding', () => {
    it('should expose currentLanguage from LocaleService', () => {
      expect(component.currentLanguage).toBeDefined();
      expect(component.currentLanguage()).toBe('en');
    });
  });

  describe('loading state', () => {
    it('should set loading to false after settings load', fakeAsync(() => {
      tick();
      expect(component.loading()).toBe(false);
    }));
  });

  describe('saving state', () => {
    it('should start with saving false', () => {
      expect(component.saving()).toBe(false);
    });
  });

  describe('template rendering', () => {
    it('should render the form', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('form')).toBeTruthy();
    });

    it('should render language select', fakeAsync(() => {
      tick();
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('mat-select')).toBeTruthy();
    }));

    it('should render save button', fakeAsync(() => {
      tick();
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      const button = compiled.querySelector('button[type="submit"]');
      expect(button).toBeTruthy();
    }));

    it('should render back link to admin hub', fakeAsync(() => {
      tick();
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      const backLink = compiled.querySelector('a[routerLink="/organization/admin"]');
      expect(backLink).toBeTruthy();
    }));
  });
});
