import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { App } from './app';
import { AuthService } from './core/services/auth.service';
import { User } from './core/models/user.model';

describe('App Component', () => {
  let component: App;
  let fixture: ComponentFixture<App>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let userProfileSubject: BehaviorSubject<User | null>;

  const mockEmployee: User = {
    id: 'user-123',
    email: 'employee@example.com',
    full_name: 'Test Employee',
    role: 'employee',
    created_at: '2025-11-13T10:00:00Z',
    updated_at: '2025-11-13T10:00:00Z'
  };

  const mockFinanceUser: User = {
    id: 'user-456',
    email: 'finance@example.com',
    full_name: 'Test Finance',
    role: 'finance',
    created_at: '2025-11-13T10:00:00Z',
    updated_at: '2025-11-13T10:00:00Z'
  };

  const mockAdminUser: User = {
    id: 'user-789',
    email: 'admin@example.com',
    full_name: 'Test Admin',
    role: 'admin',
    created_at: '2025-11-13T10:00:00Z',
    updated_at: '2025-11-13T10:00:00Z'
  };

  beforeEach(async () => {
    userProfileSubject = new BehaviorSubject<User | null>(null);

    mockAuthService = jasmine.createSpyObj('AuthService', ['signOut'], {
      userProfile$: userProfileSubject.asObservable(),
      isFinanceOrAdmin: false
    });

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [App, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
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
    it('should subscribe to currentUser$ from AuthService', () => {
      expect(component.currentUser$).toBeDefined();
    });

    it('should expose userProfile$ as currentUser$', (done) => {
      userProfileSubject.next(mockEmployee);

      component.currentUser$.subscribe(user => {
        expect(user).toEqual(mockEmployee);
        done();
      });
    });

    it('should start with null user if not authenticated', (done) => {
      component.currentUser$.subscribe(user => {
        expect(user).toBeNull();
        done();
      });
    });
  });

  describe('User Profile Observable', () => {
    it('should emit user updates', (done) => {
      const users: (User | null)[] = [];

      component.currentUser$.subscribe(user => {
        users.push(user);

        if (users.length === 2) {
          expect(users[0]).toBeNull();
          expect(users[1]).toEqual(mockEmployee);
          done();
        }
      });

      userProfileSubject.next(mockEmployee);
    });

    it('should handle user sign in', (done) => {
      userProfileSubject.next(mockEmployee);

      component.currentUser$.subscribe(user => {
        expect(user).toEqual(mockEmployee);
        done();
      });
    });

    it('should handle user sign out', (done) => {
      userProfileSubject.next(mockEmployee);

      let emissionCount = 0;
      component.currentUser$.subscribe(user => {
        emissionCount++;

        if (emissionCount === 2) {
          expect(user).toBeNull();
          done();
        }
      });

      userProfileSubject.next(null);
    });

    it('should handle user role changes', (done) => {
      const emissions: (User | null)[] = [];

      component.currentUser$.subscribe(user => {
        emissions.push(user);

        if (emissions.length === 3) {
          expect(emissions[0]).toBeNull();
          expect(emissions[1]).toEqual(mockEmployee);
          expect(emissions[2]).toEqual(mockFinanceUser);
          done();
        }
      });

      userProfileSubject.next(mockEmployee);
      userProfileSubject.next(mockFinanceUser);
    });
  });

  describe('isFinanceOrAdmin getter', () => {
    it('should return false for employee users', () => {
      Object.defineProperty(mockAuthService, 'isFinanceOrAdmin', {
        get: () => false
      });

      expect(component.isFinanceOrAdmin).toBe(false);
    });

    it('should return true for finance users', () => {
      Object.defineProperty(mockAuthService, 'isFinanceOrAdmin', {
        get: () => true,
        configurable: true
      });

      expect(component.isFinanceOrAdmin).toBe(true);
    });

    it('should return true for admin users', () => {
      Object.defineProperty(mockAuthService, 'isFinanceOrAdmin', {
        get: () => true,
        configurable: true
      });

      expect(component.isFinanceOrAdmin).toBe(true);
    });

    it('should delegate to AuthService', () => {
      const getter = Object.getOwnPropertyDescriptor(
        mockAuthService,
        'isFinanceOrAdmin'
      );

      expect(getter).toBeDefined();
      expect(component.isFinanceOrAdmin).toBe(mockAuthService.isFinanceOrAdmin);
    });
  });

  describe('signOut()', () => {
    it('should call authService.signOut', async () => {
      mockAuthService.signOut.and.resolveTo();
      mockRouter.navigate.and.resolveTo(true);

      await component.signOut();

      expect(mockAuthService.signOut).toHaveBeenCalled();
    });

    it('should navigate to login page after sign out', async () => {
      mockAuthService.signOut.and.resolveTo();
      mockRouter.navigate.and.resolveTo(true);

      await component.signOut();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('should call signOut and navigate in order', async () => {
      const callOrder: string[] = [];

      mockAuthService.signOut.and.callFake(async () => {
        callOrder.push('signOut');
      });

      mockRouter.navigate.and.callFake(async () => {
        callOrder.push('navigate');
        return true;
      });

      await component.signOut();

      expect(callOrder).toEqual(['signOut', 'navigate']);
    });

    it('should handle signOut errors gracefully', async () => {
      mockAuthService.signOut.and.rejectWith(new Error('Sign out failed'));
      mockRouter.navigate.and.resolveTo(true);

      try {
        await component.signOut();
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('Sign out failed');
      }
    });

    it('should still attempt navigation if signOut succeeds', async () => {
      mockAuthService.signOut.and.resolveTo();
      mockRouter.navigate.and.resolveTo(true);

      await component.signOut();

      expect(mockAuthService.signOut).toHaveBeenCalledTimes(1);
      expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Component Integration', () => {
    it('should work with authenticated employee user', (done) => {
      userProfileSubject.next(mockEmployee);

      component.currentUser$.subscribe(user => {
        expect(user?.role).toBe('employee');
        expect(user?.email).toBe('employee@example.com');
        done();
      });
    });

    it('should work with authenticated finance user', (done) => {
      Object.defineProperty(mockAuthService, 'isFinanceOrAdmin', {
        get: () => true,
        configurable: true
      });

      userProfileSubject.next(mockFinanceUser);

      component.currentUser$.subscribe(user => {
        expect(user?.role).toBe('finance');
        expect(component.isFinanceOrAdmin).toBe(true);
        done();
      });
    });

    it('should work with authenticated admin user', (done) => {
      Object.defineProperty(mockAuthService, 'isFinanceOrAdmin', {
        get: () => true,
        configurable: true
      });

      userProfileSubject.next(mockAdminUser);

      component.currentUser$.subscribe(user => {
        expect(user?.role).toBe('admin');
        expect(component.isFinanceOrAdmin).toBe(true);
        done();
      });
    });

    it('should handle complete auth lifecycle', async () => {
      // Start unauthenticated
      expect(component.isFinanceOrAdmin).toBe(false);

      // User signs in
      userProfileSubject.next(mockEmployee);
      await fixture.whenStable();

      // User signs out
      mockAuthService.signOut.and.resolveTo();
      mockRouter.navigate.and.resolveTo(true);

      await component.signOut();

      expect(mockAuthService.signOut).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  describe('UI State Management', () => {
    it('should provide reactive user state for templates', (done) => {
      const users: (User | null)[] = [];

      component.currentUser$.subscribe(user => users.push(user));

      userProfileSubject.next(mockEmployee);

      setTimeout(() => {
        expect(users.length).toBeGreaterThan(0);
        expect(users[users.length - 1]).toEqual(mockEmployee);
        done();
      }, 100);
    });

    it('should allow template to check isFinanceOrAdmin', () => {
      Object.defineProperty(mockAuthService, 'isFinanceOrAdmin', {
        get: () => false,
        configurable: true
      });

      // Template would use: *ngIf="isFinanceOrAdmin"
      expect(component.isFinanceOrAdmin).toBe(false);

      Object.defineProperty(mockAuthService, 'isFinanceOrAdmin', {
        get: () => true,
        configurable: true
      });

      expect(component.isFinanceOrAdmin).toBe(true);
    });
  });

  describe('Router Integration', () => {
    it('should use Router for navigation', async () => {
      mockAuthService.signOut.and.resolveTo();
      mockRouter.navigate.and.resolveTo(true);

      await component.signOut();

      expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    });

    it('should navigate to correct route', async () => {
      mockAuthService.signOut.and.resolveTo();
      mockRouter.navigate.and.resolveTo(true);

      await component.signOut();

      const navArgs = mockRouter.navigate.calls.mostRecent().args;
      expect(navArgs[0]).toEqual(['/auth/login']);
    });
  });

  describe('Observable Memory Management', () => {
    it('should maintain single subscription to userProfile$', () => {
      const user1$ = component.currentUser$;
      const user2$ = component.currentUser$;

      expect(user1$).toBe(user2$);
    });

    it('should properly propagate observable updates', (done) => {
      const updates: (User | null)[] = [];

      component.currentUser$.subscribe(user => {
        updates.push(user);
      });

      userProfileSubject.next(mockEmployee);
      userProfileSubject.next(mockFinanceUser);
      userProfileSubject.next(null);

      setTimeout(() => {
        expect(updates.length).toBe(4); // Initial null + 3 updates
        expect(updates[0]).toBeNull();
        expect(updates[1]).toEqual(mockEmployee);
        expect(updates[2]).toEqual(mockFinanceUser);
        expect(updates[3]).toBeNull();
        done();
      }, 100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid sign out calls', async () => {
      mockAuthService.signOut.and.resolveTo();
      mockRouter.navigate.and.resolveTo(true);

      await Promise.all([
        component.signOut(),
        component.signOut()
      ]);

      // Both should complete without error
      expect(mockAuthService.signOut).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalled();
    });

    it('should handle navigation failure', async () => {
      mockAuthService.signOut.and.resolveTo();
      mockRouter.navigate.and.resolveTo(false);

      await component.signOut();

      expect(mockAuthService.signOut).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalled();
    });

    it('should handle user profile with missing fields gracefully', (done) => {
      const partialUser = {
        id: 'user-999',
        email: 'partial@example.com'
      } as User;

      userProfileSubject.next(partialUser);

      component.currentUser$.subscribe(user => {
        expect(user?.id).toBe('user-999');
        done();
      });
    });
  });
});
