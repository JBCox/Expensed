import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, NavigationEnd } from '@angular/router';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { take } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { App } from './app';
import { AuthService } from './core/services/auth.service';
import { KeyboardShortcutsService } from './core/services/keyboard-shortcuts.service';
import { PwaService } from './core/services/pwa.service';
import { OrganizationService } from './core/services/organization.service';
import { ThemeService } from './core/services/theme.service';
import { User } from './core/models/user.model';
import { UserRole } from './core/models/enums';

describe('App Component', () => {
  let component: App;
  let fixture: ComponentFixture<App>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: Partial<Router>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockKeyboardShortcuts: jasmine.SpyObj<KeyboardShortcutsService>;
  let mockPwaService: jasmine.SpyObj<PwaService>;
  let mockOrganizationService: jasmine.SpyObj<OrganizationService>;
  let mockThemeService: jasmine.SpyObj<ThemeService>;
  let userProfileSubject: BehaviorSubject<User | null>;
  let sessionSubject: BehaviorSubject<any>;
  let routerEventsSubject: Subject<any>;

  const mockEmployee: User = {
    id: 'user-123',
    email: 'employee@example.com',
    full_name: 'Test Employee',
    role: UserRole.EMPLOYEE,
    created_at: '2025-11-13T10:00:00Z',
    updated_at: '2025-11-13T10:00:00Z'
  };

  const mockFinanceUser: User = {
    id: 'user-456',
    email: 'finance@example.com',
    full_name: 'Test Finance',
    role: UserRole.FINANCE,
    created_at: '2025-11-13T10:00:00Z',
    updated_at: '2025-11-13T10:00:00Z'
  };

  const mockAdminUser: User = {
    id: 'user-789',
    email: 'admin@example.com',
    full_name: 'Test Admin',
    role: UserRole.ADMIN,
    created_at: '2025-11-13T10:00:00Z',
    updated_at: '2025-11-13T10:00:00Z'
  };

  beforeEach(async () => {
    userProfileSubject = new BehaviorSubject<User | null>(null);
    sessionSubject = new BehaviorSubject<any>(null);
    routerEventsSubject = new Subject<any>();

    mockAuthService = jasmine.createSpyObj('AuthService', ['signOut'], {
      userProfile$: userProfileSubject.asObservable(),
      session$: sessionSubject.asObservable(),
      isFinanceOrAdmin: false
    });

    mockRouter = {
      url: '/home',
      events: routerEventsSubject.asObservable(),
      navigate: jasmine.createSpy('navigate')
    };

    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockKeyboardShortcuts = jasmine.createSpyObj('KeyboardShortcutsService', ['registerShortcuts']);
    mockPwaService = jasmine.createSpyObj('PwaService', ['checkForUpdate', 'activateUpdate', 'canInstall', 'promptInstall']);
    mockPwaService.canInstall.and.returnValue(false);

    mockOrganizationService = jasmine.createSpyObj('OrganizationService', ['getUserOrganizationContext'], {
      currentOrganization$: of(null)
    });
    mockOrganizationService.getUserOrganizationContext.and.returnValue(of(null));

    mockThemeService = jasmine.createSpyObj('ThemeService', ['applyBrandColor', 'resetBrandColor', 'toggleTheme'], {
      isDarkMode$: of(false),
      isDarkMode: false
    });

    await TestBed.configureTestingModule({
      imports: [App, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: MatDialog, useValue: mockDialog },
        { provide: KeyboardShortcutsService, useValue: mockKeyboardShortcuts },
        { provide: PwaService, useValue: mockPwaService },
        { provide: OrganizationService, useValue: mockOrganizationService },
        { provide: ThemeService, useValue: mockThemeService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should have vm$ observable defined', () => {
      expect(component.vm$).toBeDefined();
    });

    it('should combine userProfile$ and session$ in vm$', fakeAsync(() => {
      let vm: any;
      component.vm$.subscribe(v => vm = v);

      userProfileSubject.next(mockEmployee);
      sessionSubject.next({ access_token: 'test-token' });
      tick();

      expect(vm.profile).toEqual(mockEmployee);
      expect(vm.isAuthenticated).toBe(true);
    }));

    it('should start with null profile if not authenticated', fakeAsync(() => {
      let vm: any;
      component.vm$.pipe(take(1)).subscribe(v => vm = v);
      tick();

      expect(vm.profile).toBeNull();
      expect(vm.isAuthenticated).toBe(false);
    }));
  });

  describe('User Profile Observable', () => {
    it('should emit vm updates when user profile changes', fakeAsync(() => {
      let latestProfile: User | null | undefined;

      component.vm$.subscribe(vm => {
        latestProfile = vm.profile;
      });

      // Initial state
      tick();
      expect(latestProfile).toBeNull();

      // After profile update
      userProfileSubject.next(mockEmployee);
      tick();
      expect(latestProfile).toEqual(mockEmployee);
    }));

    it('should handle user sign in', fakeAsync(() => {
      let vm: any;
      component.vm$.subscribe(v => vm = v);

      userProfileSubject.next(mockEmployee);
      sessionSubject.next({ access_token: 'test-token' });
      tick();

      expect(vm.profile).toEqual(mockEmployee);
      expect(vm.isAuthenticated).toBe(true);
    }));

    it('should handle user sign out', fakeAsync(() => {
      let vm: any;
      component.vm$.subscribe(v => vm = v);

      userProfileSubject.next(mockEmployee);
      sessionSubject.next({ access_token: 'test-token' });
      tick();

      userProfileSubject.next(null);
      sessionSubject.next(null);
      tick();

      expect(vm.profile).toBeNull();
      expect(vm.isAuthenticated).toBe(false);
    }));

    it('should handle user role changes', fakeAsync(() => {
      let latestProfile: User | null | undefined;

      component.vm$.subscribe(vm => {
        latestProfile = vm.profile;
      });

      // Initial state
      tick();
      expect(latestProfile).toBeNull();

      // First profile update
      userProfileSubject.next(mockEmployee);
      tick();
      expect(latestProfile).toEqual(mockEmployee);

      // Role change to finance
      userProfileSubject.next(mockFinanceUser);
      tick();
      expect(latestProfile).toEqual(mockFinanceUser);
    }));
  });

  describe('signOut()', () => {
    it('should call authService.signOut', async () => {
      mockAuthService.signOut.and.resolveTo();

      await component.signOut();

      expect(mockAuthService.signOut).toHaveBeenCalled();
    });

    it('should handle signOut errors gracefully', async () => {
      mockAuthService.signOut.and.rejectWith(new Error('Sign out failed'));

      try {
        await component.signOut();
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('Sign out failed');
      }
    });
  });

  describe('Component Integration', () => {
    it('should work with authenticated employee user', fakeAsync(() => {
      let vm: any;
      component.vm$.subscribe(v => vm = v);

      userProfileSubject.next(mockEmployee);
      sessionSubject.next({ access_token: 'test-token' });
      tick();

      expect(vm.profile?.role).toBe(UserRole.EMPLOYEE);
      expect(vm.profile?.email).toBe('employee@example.com');
      expect(vm.isAuthenticated).toBe(true);
    }));

    it('should work with authenticated finance user', fakeAsync(() => {
      let vm: any;
      component.vm$.subscribe(v => vm = v);

      userProfileSubject.next(mockFinanceUser);
      sessionSubject.next({ access_token: 'test-token' });
      tick();

      expect(vm.profile?.role).toBe(UserRole.FINANCE);
      expect(vm.isAuthenticated).toBe(true);
    }));

    it('should work with authenticated admin user', fakeAsync(() => {
      let vm: any;
      component.vm$.subscribe(v => vm = v);

      userProfileSubject.next(mockAdminUser);
      sessionSubject.next({ access_token: 'test-token' });
      tick();

      expect(vm.profile?.role).toBe(UserRole.ADMIN);
      expect(vm.isAuthenticated).toBe(true);
    }));

    it('should handle complete auth lifecycle', async () => {
      // User signs in
      userProfileSubject.next(mockEmployee);
      sessionSubject.next({ access_token: 'test-token' });
      await fixture.whenStable();

      // User signs out
      mockAuthService.signOut.and.resolveTo();

      await component.signOut();

      expect(mockAuthService.signOut).toHaveBeenCalled();
    });
  });

  describe('UI State Management', () => {
    it('should provide reactive vm state for templates', (done) => {
      const profiles: (User | null)[] = [];

      component.vm$.subscribe(vm => profiles.push(vm.profile));

      userProfileSubject.next(mockEmployee);

      setTimeout(() => {
        expect(profiles.length).toBeGreaterThan(0);
        expect(profiles[profiles.length - 1]).toEqual(mockEmployee);
        done();
      }, 0);
    });

    it('should provide display name for templates', fakeAsync(() => {
      let vm: any;
      component.vm$.subscribe(v => vm = v);

      userProfileSubject.next(mockEmployee);
      sessionSubject.next({ access_token: 'test-token' });
      tick();

      expect(vm.displayName).toBe('Test Employee');
      expect(vm.email).toBe('employee@example.com');
    }));
  });

  describe('Observable Memory Management', () => {
    it('should maintain single observable reference', () => {
      const vm1$ = component.vm$;
      const vm2$ = component.vm$;

      expect(vm1$).toBe(vm2$);
    });

    it('should properly propagate observable updates', (done) => {
      let latestProfile: User | null = null;
      let updateCount = 0;

      component.vm$.subscribe(vm => {
        latestProfile = vm.profile;
        updateCount++;
      });

      userProfileSubject.next(mockEmployee);
      userProfileSubject.next(mockFinanceUser);
      userProfileSubject.next(null);

      setTimeout(() => {
        // Verify we received updates and final state is correct
        expect(updateCount).toBeGreaterThan(1);
        expect(latestProfile).toBeNull(); // Final state after all updates
        done();
      }, 0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid sign out calls', async () => {
      mockAuthService.signOut.and.resolveTo();

      await Promise.all([
        component.signOut(),
        component.signOut()
      ]);

      // Both should complete without error
      expect(mockAuthService.signOut).toHaveBeenCalled();
    });

    it('should handle user profile with missing fields gracefully', fakeAsync(() => {
      const partialUser = {
        id: 'user-999',
        email: 'partial@example.com'
      } as User;

      let vm: any;
      component.vm$.subscribe(v => vm = v);

      userProfileSubject.next(partialUser);
      sessionSubject.next({ access_token: 'test-token' });
      tick();

      expect(vm.profile?.id).toBe('user-999');
      expect(vm.isAuthenticated).toBe(true);
    }));
  });
});
