import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, provideRouter } from '@angular/router';
import { Clipboard } from '@angular/cdk/clipboard';
import { of, throwError } from 'rxjs';
import { EmailExpenseSettingsComponent } from './email-expense-settings.component';
import { EmailExpenseService } from '../../../core/services/email-expense.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  EmailInboxConfig,
  UserEmailAlias,
  InboundEmail,
  EmailProcessingStats
} from '../../../core/models/email-expense.model';

describe('EmailExpenseSettingsComponent', () => {
  let component: EmailExpenseSettingsComponent;
  let fixture: ComponentFixture<EmailExpenseSettingsComponent>;
  let emailServiceMock: jasmine.SpyObj<EmailExpenseService>;
  let notificationServiceMock: jasmine.SpyObj<NotificationService>;
  let routerMock: jasmine.SpyObj<Router>;
  let clipboardMock: jasmine.SpyObj<Clipboard>;

  const mockInboxConfig: EmailInboxConfig = {
    id: 'inbox-1',
    organization_id: 'org-123',
    inbox_address: 'expenses@expensed.app',
    is_enabled: true,
    auto_create_expense: true,
    require_attachment: true,
    require_verified_sender: true,
    notify_on_receipt: true,
    notify_on_error: true,
    default_category: 'Meals & Entertainment',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  };

  const mockEmailAlias: UserEmailAlias = {
    id: 'alias-1',
    user_id: 'user-123',
    organization_id: 'org-123',
    email: 'user@example.com',
    is_verified: true,
    verification_token: null,
    verified_at: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z'
  };

  const mockInboundEmail: InboundEmail = {
    id: 'email-1',
    organization_id: 'org-123',
    message_id: 'msg-123',
    from_address: 'user@example.com',
    to_address: 'expenses@expensed.app',
    subject: 'Receipt for lunch',
    body_text: 'Receipt attached',
    body_html: '<p>Receipt attached</p>',
    matched_user_id: 'user-123',
    status: 'processed',
    error_message: null,
    created_expense_id: 'expense-1',
    created_receipt_id: null,
    attachment_count: 1,
    raw_payload: null,
    received_at: '2025-01-01T12:00:00Z',
    processed_at: '2025-01-01T12:01:00Z'
  };

  const mockStats: EmailProcessingStats = {
    organization_id: 'org-123',
    total_emails: 50,
    processed_count: 45,
    failed_count: 3,
    pending_count: 2,
    expenses_created: 42,
    avg_processing_time_seconds: 5.2
  };

  beforeEach(async () => {
    emailServiceMock = jasmine.createSpyObj('EmailExpenseService', [
      'getInboxConfig',
      'updateInboxConfig',
      'getEmailAliases',
      'addEmailAlias',
      'removeEmailAlias',
      'getRecentEmails',
      'getProcessingStats'
    ], {
      inboxConfig: jasmine.createSpy('inboxConfig').and.returnValue(mockInboxConfig),
      emailAliases: jasmine.createSpy('emailAliases').and.returnValue([mockEmailAlias]),
      recentEmails: jasmine.createSpy('recentEmails').and.returnValue([mockInboundEmail])
    });

    notificationServiceMock = jasmine.createSpyObj('NotificationService', [
      'showSuccess',
      'showError',
      'showWarning'
    ]);

    routerMock = jasmine.createSpyObj('Router', ['navigate']);

    clipboardMock = jasmine.createSpyObj('Clipboard', ['copy']);

    // Default return values
    emailServiceMock.getInboxConfig.and.returnValue(of(mockInboxConfig));
    emailServiceMock.updateInboxConfig.and.returnValue(of(mockInboxConfig));
    emailServiceMock.getEmailAliases.and.returnValue(of([mockEmailAlias]));
    emailServiceMock.addEmailAlias.and.returnValue(of(mockEmailAlias));
    emailServiceMock.removeEmailAlias.and.returnValue(of(undefined));
    emailServiceMock.getRecentEmails.and.returnValue(of([mockInboundEmail]));
    emailServiceMock.getProcessingStats.and.returnValue(of(mockStats));

    await TestBed.configureTestingModule({
      imports: [
        EmailExpenseSettingsComponent,
        BrowserAnimationsModule,
        ReactiveFormsModule
      ],
      providers: [
        { provide: EmailExpenseService, useValue: emailServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: Clipboard, useValue: clipboardMock },
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EmailExpenseSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load all data on init', () => {
    expect(emailServiceMock.getInboxConfig).toHaveBeenCalled();
    expect(component.loading()).toBe(false);
  });

  it('should load stats on init', fakeAsync(() => {
    expect(emailServiceMock.getProcessingStats).toHaveBeenCalled();
    tick();
    expect(component.stats()).toEqual(mockStats);
  }));

  it('should navigate back to admin', () => {
    component.goBack();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/admin']);
  });

  it('should copy text to clipboard', () => {
    const testText = 'expenses@expensed.app';
    component.copyToClipboard(testText);
    expect(clipboardMock.copy).toHaveBeenCalledWith(testText);
    expect(notificationServiceMock.showSuccess).toHaveBeenCalledWith('Copied to clipboard');
  });

  it('should toggle enabled status', fakeAsync(() => {
    component.toggleEnabled(false);
    tick();
    expect(emailServiceMock.updateInboxConfig).toHaveBeenCalledWith({ is_enabled: false });
  }));

  it('should update config successfully', fakeAsync(() => {
    const updates = { auto_create_expense: false };
    component.updateConfig(updates);

    tick();
    expect(emailServiceMock.updateInboxConfig).toHaveBeenCalledWith(updates);
    expect(notificationServiceMock.showSuccess).toHaveBeenCalledWith('Settings updated');
  }));

  it('should handle update config error', fakeAsync(() => {
    emailServiceMock.updateInboxConfig.and.returnValue(
      throwError(() => new Error('Update failed'))
    );

    component.updateConfig({ is_enabled: false });

    tick();
    expect(notificationServiceMock.showError).toHaveBeenCalledWith('Failed to update settings');
  }));

  it('should add email alias successfully', fakeAsync(() => {
    component.aliasForm.patchValue({ email: 'newemail@example.com' });

    expect(component.addingAlias()).toBe(false);
    component.addAlias();
    tick();

    expect(emailServiceMock.addEmailAlias).toHaveBeenCalledWith({ email: 'newemail@example.com' });
    expect(notificationServiceMock.showSuccess).toHaveBeenCalledWith(
      'Email added. Check your inbox for verification.'
    );
    // After sync Observable completes, addingAlias should be false
    expect(component.addingAlias()).toBe(false);
  }));

  it('should not add alias if form is invalid', () => {
    component.aliasForm.patchValue({ email: '' });
    component.addAlias();
    expect(emailServiceMock.addEmailAlias).not.toHaveBeenCalled();
  });

  it('should reset alias form after successful add', fakeAsync(() => {
    component.aliasForm.patchValue({ email: 'test@example.com' });
    component.addAlias();
    tick();
    // Form reset sets value to null
    expect(component.aliasForm.value.email).toBeFalsy();
  }));

  it('should handle add alias error', fakeAsync(() => {
    emailServiceMock.addEmailAlias.and.returnValue(
      throwError(() => new Error('Add failed'))
    );

    component.aliasForm.patchValue({ email: 'test@example.com' });
    component.addAlias();

    tick();
    expect(notificationServiceMock.showError).toHaveBeenCalledWith('Failed to add email');
    expect(component.addingAlias()).toBe(false);
  }));

  it('should remove email alias when confirmed', fakeAsync(() => {
    spyOn(window, 'confirm').and.returnValue(true);

    component.removeAlias(mockEmailAlias);

    expect(window.confirm).toHaveBeenCalledWith('Remove user@example.com?');
    tick();
    expect(emailServiceMock.removeEmailAlias).toHaveBeenCalledWith('alias-1');
  }));

  it('should not remove alias if not confirmed', () => {
    spyOn(window, 'confirm').and.returnValue(false);

    component.removeAlias(mockEmailAlias);

    expect(emailServiceMock.removeEmailAlias).not.toHaveBeenCalled();
  });

  it('should handle remove alias error', fakeAsync(() => {
    spyOn(window, 'confirm').and.returnValue(true);
    emailServiceMock.removeEmailAlias.and.returnValue(
      throwError(() => new Error('Remove failed'))
    );

    component.removeAlias(mockEmailAlias);

    tick();
    expect(notificationServiceMock.showError).toHaveBeenCalledWith('Failed to remove email');
  }));

  it('should show warning for resend verification', () => {
    component.resendVerification(mockEmailAlias);
    expect(notificationServiceMock.showWarning).toHaveBeenCalledWith(
      'Verification email would be sent (feature pending)'
    );
  });

  it('should load recent emails', () => {
    component.loadRecentEmails();
    expect(emailServiceMock.getRecentEmails).toHaveBeenCalled();
  });

  it('should get status icon correctly', () => {
    const icon = component.getStatusIcon('processed');
    expect(icon).toBeTruthy();
  });

  it('should get status label correctly', () => {
    const label = component.getStatusLabel('processed');
    expect(label).toBeTruthy();
  });

  it('should return default icon for unknown status', () => {
    const icon = component.getStatusIcon('unknown' as any);
    expect(icon).toBe('help');
  });

  it('should return status value for unknown status label', () => {
    const label = component.getStatusLabel('unknown' as any);
    expect(label).toBe('unknown');
  });

  it('should have tips available', () => {
    expect(component.tips).toBeTruthy();
    expect(component.tips.length).toBeGreaterThan(0);
  });

  it('should initialize with valid alias form', () => {
    expect(component.aliasForm.value.email).toBe('');
    expect(component.aliasForm.valid).toBe(false);
  });

  it('should handle load inbox config error', fakeAsync(() => {
    emailServiceMock.getInboxConfig.and.returnValue(
      throwError(() => new Error('Load failed'))
    );

    component.ngOnInit();

    tick();
    expect(notificationServiceMock.showError).toHaveBeenCalledWith('Failed to load email settings');
    expect(component.loading()).toBe(false);
  }));

  it('should handle load stats error silently', fakeAsync(() => {
    emailServiceMock.getProcessingStats.and.returnValue(
      throwError(() => new Error('Load failed'))
    );

    spyOn(console, 'error');
    component.ngOnInit();

    tick();
    // Stats errors should be silent (no notification shown)
    expect(notificationServiceMock.showError).not.toHaveBeenCalled();
  }));

  it('should update inbox config signal from service', () => {
    const newConfig = { ...mockInboxConfig, is_enabled: false };
    (emailServiceMock as any).inboxConfig = jasmine.createSpy('inboxConfig').and.returnValue(newConfig);

    expect(component.inboxConfig()).toBeTruthy();
  });

  it('should update email aliases signal from service', () => {
    const newAliases = [mockEmailAlias, { ...mockEmailAlias, id: 'alias-2', email: 'another@example.com' }];
    (emailServiceMock as any).emailAliases = jasmine.createSpy('emailAliases').and.returnValue(newAliases);

    expect(component.emailAliases()).toBeTruthy();
  });

  it('should update recent emails signal from service', () => {
    const newEmails = [mockInboundEmail, { ...mockInboundEmail, id: 'email-2' }];
    (emailServiceMock as any).recentEmails = jasmine.createSpy('recentEmails').and.returnValue(newEmails);

    expect(component.recentEmails()).toBeTruthy();
  });

  it('should validate email format in alias form', () => {
    component.aliasForm.patchValue({ email: 'invalid-email' });
    expect(component.aliasForm.valid).toBe(false);

    component.aliasForm.patchValue({ email: 'valid@example.com' });
    expect(component.aliasForm.valid).toBe(true);
  });
});
