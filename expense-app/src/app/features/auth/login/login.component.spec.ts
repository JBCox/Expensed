import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    // Create mock services
    mockAuthService = jasmine.createSpyObj('AuthService', ['signIn', 'shouldUseDefaultRoute', 'suppressNextDefaultRedirect', 'refreshUserProfile', 'getDefaultRoute']);

    await TestBed.configureTestingModule({
      imports: [
        LoginComponent,
        ReactiveFormsModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    mockRouter = TestBed.inject(Router) as any;
    spyOn(mockRouter, 'navigate');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the login form with empty values', () => {
    expect(component.loginForm).toBeDefined();
    expect(component.loginForm.get('email')?.value).toBe('');
    expect(component.loginForm.get('password')?.value).toBe('');
  });

  it('should validate email field as required', () => {
    const emailControl = component.loginForm.get('email');
    emailControl?.setValue('');
    expect(emailControl?.hasError('required')).toBeTrue();
  });

  it('should validate email format', () => {
    const emailControl = component.loginForm.get('email');
    emailControl?.setValue('invalid-email');
    expect(emailControl?.hasError('email')).toBeTrue();

    emailControl?.setValue('valid@email.com');
    expect(emailControl?.hasError('email')).toBeFalse();
  });

  it('should validate password as required', () => {
    const passwordControl = component.loginForm.get('password');
    passwordControl?.setValue('');
    expect(passwordControl?.hasError('required')).toBeTrue();
  });

  it('should validate password minimum length', () => {
    const passwordControl = component.loginForm.get('password');
    passwordControl?.setValue('12345');
    expect(passwordControl?.hasError('minlength')).toBeTrue();

    passwordControl?.setValue('123456');
    expect(passwordControl?.hasError('minlength')).toBeFalse();
  });

  it('should call authService.signIn on valid form submission', (done) => {
    mockAuthService.signIn.and.returnValue(of({ success: true } as any));
    mockAuthService.refreshUserProfile.and.returnValue(Promise.resolve());
    mockAuthService.shouldUseDefaultRoute.and.returnValue(false);
    mockAuthService.getDefaultRoute.and.returnValue('/expenses');
    spyOn(mockRouter, 'navigateByUrl').and.returnValue(Promise.resolve(true));

    component.loginForm.patchValue({
      email: 'test@example.com',
      password: 'password123'
    });

    component.onSubmit();

    setTimeout(() => {
      expect(mockAuthService.signIn).toHaveBeenCalled();
      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/expenses');
      done();
    }, 100);
  });

  it('should display error message on login failure', async () => {
    mockAuthService.signIn.and.returnValue(
      throwError(() => new Error('Invalid login credentials')) as any
    );

    component.loginForm.patchValue({
      email: 'test@example.com',
      password: 'wrongpassword'
    });

    component.onSubmit();

    expect(component.errorMessage).toBe('Invalid email or password. Please try again.');
    expect(component.loading).toBeFalse();
  });

  it('should not submit form if invalid', async () => {
    component.loginForm.patchValue({
      email: '',
      password: ''
    });

    await component.onSubmit();

    expect(mockAuthService.signIn).not.toHaveBeenCalled();
  });

  it('should toggle password visibility', () => {
    expect(component.hidePassword).toBeTrue();
    component.togglePasswordVisibility();
    expect(component.hidePassword).toBeFalse();
    component.togglePasswordVisibility();
    expect(component.hidePassword).toBeTrue();
  });

  it('should use returnUrl from query params', () => {
    const route = TestBed.inject(ActivatedRoute);
    route.snapshot.queryParams = { returnUrl: '/custom-route' };

    // Create a fresh component instance with the updated route
    const fixture2 = TestBed.createComponent(LoginComponent);
    const comp2 = fixture2.componentInstance;
    comp2.ngOnInit();
    expect(comp2.returnUrl).toBe('/custom-route');
  });
});
