import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ConfirmEmailComponent } from './confirm-email';
import { AuthService } from '../../../core/services/auth.service';

describe('ConfirmEmailComponent', () => {
  let component: ConfirmEmailComponent;
  let fixture: ComponentFixture<ConfirmEmailComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let queryParamsSubject: BehaviorSubject<any>;

  beforeEach(async () => {
    queryParamsSubject = new BehaviorSubject<any>({});

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockAuthService = jasmine.createSpyObj('AuthService', ['resetPassword']);

    await TestBed.configureTestingModule({
      imports: [ConfirmEmailComponent, NoopAnimationsModule],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: queryParamsSubject.asObservable()
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmEmailComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with empty email', () => {
      expect(component.email).toBe('');
      expect(component.resendLoading).toBe(false);
      expect(component.resendSuccess).toBe(false);
      expect(component.resendError).toBe('');
    });

    it('should get email from query params on init', () => {
      queryParamsSubject.next({ email: 'test@example.com' });

      fixture.detectChanges();

      expect(component.email).toBe('test@example.com');
    });

    it('should redirect to register if no email provided', () => {
      queryParamsSubject.next({});

      fixture.detectChanges();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/register']);
    });

    it('should redirect to register if email is empty string', () => {
      queryParamsSubject.next({ email: '' });

      fixture.detectChanges();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/register']);
    });

    it('should not redirect if email is provided', () => {
      queryParamsSubject.next({ email: 'test@example.com' });

      fixture.detectChanges();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should handle multiple query param updates', () => {
      queryParamsSubject.next({ email: 'first@example.com' });
      fixture.detectChanges();
      expect(component.email).toBe('first@example.com');

      queryParamsSubject.next({ email: 'second@example.com' });
      fixture.detectChanges();
      expect(component.email).toBe('second@example.com');
    });
  });

  describe('resendConfirmation()', () => {
    beforeEach(() => {
      // Set email in component
      component.email = 'test@example.com';
    });

    it('should set loading state when resending', () => {
      component.resendConfirmation();

      expect(component.resendLoading).toBe(true);
      expect(component.resendError).toBe('');
      expect(component.resendSuccess).toBe(false);
    });

    it('should set success state after timeout', fakeAsync(() => {
      component.resendConfirmation();

      expect(component.resendLoading).toBe(true);
      expect(component.resendSuccess).toBe(false);

      tick(1000);

      expect(component.resendLoading).toBe(false);
      expect(component.resendSuccess).toBe(true);
    }));

    it('should do nothing if email is not set', async () => {
      component.email = '';

      await component.resendConfirmation();

      expect(component.resendLoading).toBe(false);
      expect(component.resendSuccess).toBe(false);
    });

    it('should clear previous error before resending', () => {
      component.resendError = 'Previous error';

      component.resendConfirmation();

      expect(component.resendError).toBe('');
    });

    it('should clear previous success before resending', () => {
      component.resendSuccess = true;

      component.resendConfirmation();

      expect(component.resendSuccess).toBe(false);
    });

    it('should handle multiple resend attempts', fakeAsync(() => {
      // First attempt
      component.resendConfirmation();
      tick(1000);
      expect(component.resendSuccess).toBe(true);

      // Second attempt
      component.resendConfirmation();
      expect(component.resendLoading).toBe(true);
      expect(component.resendSuccess).toBe(false);
      tick(1000);
      expect(component.resendSuccess).toBe(true);
    }));
  });

  describe('goToLogin()', () => {
    it('should navigate to login page', () => {
      component.goToLogin();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('should navigate to login regardless of email state', () => {
      component.email = '';
      component.goToLogin();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);

      mockRouter.navigate.calls.reset();

      component.email = 'test@example.com';
      component.goToLogin();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  describe('Component State', () => {
    it('should maintain loading state correctly', fakeAsync(() => {
      component.email = 'test@example.com';

      expect(component.resendLoading).toBe(false);

      component.resendConfirmation();
      expect(component.resendLoading).toBe(true);

      tick(1000);
      expect(component.resendLoading).toBe(false);
    }));

    it('should not have success state initially', () => {
      expect(component.resendSuccess).toBe(false);
    });

    it('should not have error initially', () => {
      expect(component.resendError).toBe('');
    });
  });

  describe('UI Integration', () => {
    it('should display email in component after init', () => {
      const testEmail = 'user@example.com';
      queryParamsSubject.next({ email: testEmail });

      fixture.detectChanges();

      expect(component.email).toBe(testEmail);
    });

    it('should handle URL-encoded email addresses', () => {
      queryParamsSubject.next({ email: 'test%2Buser@example.com' });

      fixture.detectChanges();

      // Angular's ActivatedRoute automatically decodes URL params
      expect(component.email).toBe('test%2Buser@example.com');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null email param', () => {
      queryParamsSubject.next({ email: null });

      fixture.detectChanges();

      expect(component.email).toBe('');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/register']);
    });

    it('should handle undefined email param', () => {
      queryParamsSubject.next({ email: undefined });

      fixture.detectChanges();

      expect(component.email).toBe('');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/register']);
    });

    it('should handle whitespace-only email', () => {
      queryParamsSubject.next({ email: '   ' });

      fixture.detectChanges();

      // Component treats any string as valid (even whitespace)
      // because it only checks for falsy values
      expect(component.email).toBe('   ');
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should handle resend when email becomes empty', async () => {
      component.email = 'test@example.com';
      fixture.detectChanges();

      component.email = '';
      await component.resendConfirmation();

      expect(component.resendLoading).toBe(false);
      expect(component.resendSuccess).toBe(false);
    });
  });

  describe('Async Behavior', () => {
    it('should handle rapid resend clicks', fakeAsync(() => {
      component.email = 'test@example.com';

      // First click
      component.resendConfirmation();
      expect(component.resendLoading).toBe(true);

      // Second click before first completes (should still work)
      tick(500);
      component.resendConfirmation();

      tick(500);
      expect(component.resendSuccess).toBe(true);
    }));

    it('should complete resend operation', fakeAsync(() => {
      component.email = 'test@example.com';

      const promise = component.resendConfirmation();

      tick(1000);

      expect(promise).toBeInstanceOf(Promise);
      expect(component.resendSuccess).toBe(true);
    }));
  });

  describe('Router Integration', () => {
    it('should use router for navigation', () => {
      component.goToLogin();

      expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    });

    it('should navigate with correct route paths', () => {
      component.goToLogin();

      const navArgs = mockRouter.navigate.calls.mostRecent().args;
      expect(navArgs[0]).toEqual(['/auth/login']);
    });
  });

  describe('Component Lifecycle', () => {
    it('should subscribe to query params on init', () => {
      spyOn(queryParamsSubject, 'subscribe').and.callThrough();

      const newComponent = new ConfirmEmailComponent(
        { queryParams: queryParamsSubject.asObservable() } as any,
        mockRouter,
        mockAuthService
      );

      newComponent.ngOnInit();

      expect(queryParamsSubject.subscribe).toHaveBeenCalled();
    });

    it('should set email before checking for redirect', () => {
      const testEmail = 'test@example.com';
      queryParamsSubject.next({ email: testEmail });

      fixture.detectChanges();

      expect(component.email).toBe(testEmail);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });
});
