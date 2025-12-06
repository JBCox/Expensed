import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { PayoutSettingsComponent } from './payout-settings.component';
import { PayoutService } from '../../../core/services/payout.service';
import { OrganizationService } from '../../../core/services/organization.service';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('PayoutSettingsComponent', () => {
  let component: PayoutSettingsComponent;
  let fixture: ComponentFixture<PayoutSettingsComponent>;
  let payoutServiceMock: jasmine.SpyObj<PayoutService>;
  let organizationServiceMock: jasmine.SpyObj<OrganizationService>;
  let snackBarMock: jasmine.SpyObj<MatSnackBar>;
  let currentOrganizationSubject: BehaviorSubject<any>;

  const mockOrganization = {
    id: 'org-123',
    name: 'Test Org'
  };

  const mockStripeStatus = {
    payout_method: 'manual' as const,
    has_key: false,
    connected: false,
    key_last4: undefined,
    key_set_at: undefined
  };

  beforeEach(async () => {
    currentOrganizationSubject = new BehaviorSubject(mockOrganization);

    payoutServiceMock = jasmine.createSpyObj('PayoutService', [
      'getStripeAccountStatus',
      'updatePayoutMethod',
      'testStripeKey',
      'setStripeKey',
      'removeStripeKey'
    ]);

    organizationServiceMock = jasmine.createSpyObj('OrganizationService', [], {
      currentOrganization$: currentOrganizationSubject.asObservable()
    });

    snackBarMock = jasmine.createSpyObj('MatSnackBar', ['open']);

    // Default return values
    payoutServiceMock.getStripeAccountStatus.and.returnValue(of(mockStripeStatus));
    payoutServiceMock.updatePayoutMethod.and.returnValue(of({ success: true }));
    payoutServiceMock.testStripeKey.and.returnValue(of({ valid: true, livemode: false }));
    payoutServiceMock.setStripeKey.and.returnValue(of({ success: true }));
    payoutServiceMock.removeStripeKey.and.returnValue(of({ success: true }));

    await TestBed.configureTestingModule({
      imports: [
        PayoutSettingsComponent,
        BrowserAnimationsModule,
        ReactiveFormsModule
      ],
      providers: [
        { provide: PayoutService, useValue: payoutServiceMock },
        { provide: OrganizationService, useValue: organizationServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({})
          }
        },
        provideRouter([])
      ]
    })
    .overrideProvider(MatSnackBar, { useValue: snackBarMock })
    .compileComponents();

    fixture = TestBed.createComponent(PayoutSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load Stripe status on init', fakeAsync(() => {
    tick();
    expect(payoutServiceMock.getStripeAccountStatus).toHaveBeenCalledWith('org-123');
    expect(component.payoutMethod()).toBe('manual');
    expect(component.stripeConfigured()).toBe(false);
  }));

  it('should initialize form with validators', () => {
    expect(component.keyForm.get('stripeKey')?.hasError('required')).toBe(true);

    component.keyForm.patchValue({ stripeKey: 'invalid' });
    expect(component.keyForm.get('stripeKey')?.hasError('pattern')).toBe(true);

    component.keyForm.patchValue({ stripeKey: 'sk_test_123' });
    expect(component.keyForm.get('stripeKey')?.valid).toBe(true);
  });

  it('should toggle show key visibility', () => {
    expect(component.showKey()).toBe(false);
    component.toggleShowKey();
    expect(component.showKey()).toBe(true);
  });

  it('should select manual payout method', fakeAsync(() => {
    tick();
    component.payoutMethod.set('stripe');
    component.selectMethod('manual');
    tick();
    fixture.detectChanges();
    expect(payoutServiceMock.updatePayoutMethod).toHaveBeenCalledWith('org-123', 'manual');
  }));

  it('should not select Stripe method if not configured', fakeAsync(() => {
    tick();
    component.stripeConfigured.set(false);
    component.selectMethod('stripe');

    expect(snackBarMock.open).toHaveBeenCalledWith(
      'Please configure your Stripe API key first',
      'Close',
      { duration: 3000 }
    );
    expect(payoutServiceMock.updatePayoutMethod).not.toHaveBeenCalled();
  }));

  it('should test Stripe key', fakeAsync(() => {
    component.keyForm.patchValue({ stripeKey: 'sk_test_123' });
    component.testStripeKey();
    tick();
    fixture.detectChanges();

    expect(payoutServiceMock.testStripeKey).toHaveBeenCalledWith('sk_test_123');
    expect(component.testResult()?.valid).toBe(true);
    expect(component.testing()).toBe(false);
  }));

  it('should save Stripe key', fakeAsync(() => {
    tick();
    component.keyForm.patchValue({ stripeKey: 'sk_test_123' });
    component.saveStripeKey();
    tick();
    fixture.detectChanges();

    expect(payoutServiceMock.setStripeKey).toHaveBeenCalledWith('org-123', 'sk_test_123');
    expect(snackBarMock.open).toHaveBeenCalledWith(
      'Stripe API key saved successfully!',
      'Close',
      { duration: 5000 }
    );
    expect(component.saving()).toBe(false);
  }));

  it('should remove Stripe key when confirmed', fakeAsync(() => {
    tick();
    spyOn(window, 'confirm').and.returnValue(true);

    component.removeStripeKey();
    tick();
    fixture.detectChanges();

    expect(window.confirm).toHaveBeenCalled();
    expect(payoutServiceMock.removeStripeKey).toHaveBeenCalledWith('org-123');
  }));

  it('should not remove Stripe key when cancelled', () => {
    spyOn(window, 'confirm').and.returnValue(false);

    component.removeStripeKey();

    expect(window.confirm).toHaveBeenCalled();
    expect(payoutServiceMock.removeStripeKey).not.toHaveBeenCalled();
  });

  it('should handle test key error', fakeAsync(() => {
    component.keyForm.patchValue({ stripeKey: 'sk_test_123' });
    payoutServiceMock.testStripeKey.and.returnValue(
      throwError(() => ({ message: 'Invalid key' }))
    );

    component.testStripeKey();
    tick();
    fixture.detectChanges();

    expect(component.testResult()?.valid).toBe(false);
    expect(component.testResult()?.error).toBe('Invalid key');
  }));

  it('should handle save key error', fakeAsync(() => {
    tick();
    component.keyForm.patchValue({ stripeKey: 'sk_test_123' });
    payoutServiceMock.setStripeKey.and.returnValue(
      throwError(() => ({ message: 'Save failed' }))
    );

    component.saveStripeKey();
    tick();
    fixture.detectChanges();

    expect(snackBarMock.open).toHaveBeenCalledWith(
      'Save failed',
      'Close',
      { duration: 3000 }
    );
    expect(component.saving()).toBe(false);
  }));
});
