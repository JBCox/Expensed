import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { of } from 'rxjs';
import { authGuard, financeGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';

describe('Auth Guards', () => {
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;

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

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', [], {
      userProfile$: of(null),
      isFinanceOrAdmin: false
    });

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    mockRoute = {} as ActivatedRouteSnapshot;
    mockState = {
      url: '/test-route'
    } as RouterStateSnapshot;

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });
  });

  describe('authGuard', () => {
    it('should allow authenticated user to access route', (done) => {
      Object.defineProperty(mockAuthService, 'userProfile$', {
        value: of(mockEmployee)
      });

      TestBed.runInInjectionContext(() => {
        const result = authGuard(mockRoute, mockState);

        if (typeof result === 'boolean') {
          expect(result).toBe(true);
          expect(mockRouter.navigate).not.toHaveBeenCalled();
          done();
        } else {
          result.subscribe((allowed) => {
            expect(allowed).toBe(true);
            expect(mockRouter.navigate).not.toHaveBeenCalled();
            done();
          });
        }
      });
    });

    it('should redirect unauthenticated user to login', (done) => {
      Object.defineProperty(mockAuthService, 'userProfile$', {
        value: of(null)
      });

      TestBed.runInInjectionContext(() => {
        const result = authGuard(mockRoute, mockState);

        if (typeof result === 'boolean') {
          expect(result).toBe(false);
          expect(mockRouter.navigate).toHaveBeenCalledWith(
            ['/auth/login'],
            { queryParams: { returnUrl: '/test-route' } }
          );
          done();
        } else {
          result.subscribe((allowed) => {
            expect(allowed).toBe(false);
            expect(mockRouter.navigate).toHaveBeenCalledWith(
              ['/auth/login'],
              { queryParams: { returnUrl: '/test-route' } }
            );
            done();
          });
        }
      });
    });

    it('should store attempted URL in returnUrl query param', (done) => {
      Object.defineProperty(mockAuthService, 'userProfile$', {
        value: of(null)
      });

      const customState = {
        url: '/expenses/new?id=123'
      } as RouterStateSnapshot;

      TestBed.runInInjectionContext(() => {
        const result = authGuard(mockRoute, customState);

        if (typeof result === 'boolean') {
          expect(mockRouter.navigate).toHaveBeenCalledWith(
            ['/auth/login'],
            { queryParams: { returnUrl: '/expenses/new?id=123' } }
          );
          done();
        } else {
          result.subscribe(() => {
            expect(mockRouter.navigate).toHaveBeenCalledWith(
              ['/auth/login'],
              { queryParams: { returnUrl: '/expenses/new?id=123' } }
            );
            done();
          });
        }
      });
    });

    it('should complete after single emission (take(1))', (done) => {
      Object.defineProperty(mockAuthService, 'userProfile$', {
        value: of(mockEmployee)
      });

      TestBed.runInInjectionContext(() => {
        const result = authGuard(mockRoute, mockState);

        if (typeof result !== 'boolean') {
          let emissionCount = 0;
          result.subscribe({
            next: () => {
              emissionCount++;
            },
            complete: () => {
              expect(emissionCount).toBe(1);
              done();
            }
          });
        } else {
          done();
        }
      });
    });

    it('should allow finance user to access route', (done) => {
      Object.defineProperty(mockAuthService, 'userProfile$', {
        value: of(mockFinanceUser)
      });

      TestBed.runInInjectionContext(() => {
        const result = authGuard(mockRoute, mockState);

        if (typeof result === 'boolean') {
          expect(result).toBe(true);
          done();
        } else {
          result.subscribe((allowed) => {
            expect(allowed).toBe(true);
            done();
          });
        }
      });
    });

    it('should allow admin user to access route', (done) => {
      Object.defineProperty(mockAuthService, 'userProfile$', {
        value: of(mockAdminUser)
      });

      TestBed.runInInjectionContext(() => {
        const result = authGuard(mockRoute, mockState);

        if (typeof result === 'boolean') {
          expect(result).toBe(true);
          done();
        } else {
          result.subscribe((allowed) => {
            expect(allowed).toBe(true);
            done();
          });
        }
      });
    });
  });

  describe('financeGuard', () => {
    it('should allow finance user to access route', (done) => {
      Object.defineProperty(mockAuthService, 'userProfile$', {
        value: of(mockFinanceUser)
      });
      Object.defineProperty(mockAuthService, 'isFinanceOrAdmin', {
        value: true
      });

      TestBed.runInInjectionContext(() => {
        const result = financeGuard(mockRoute, mockState);

        if (typeof result === 'boolean') {
          expect(result).toBe(true);
          expect(mockRouter.navigate).not.toHaveBeenCalled();
          done();
        } else {
          result.subscribe((allowed) => {
            expect(allowed).toBe(true);
            expect(mockRouter.navigate).not.toHaveBeenCalled();
            done();
          });
        }
      });
    });

    it('should allow admin user to access route', (done) => {
      Object.defineProperty(mockAuthService, 'userProfile$', {
        value: of(mockAdminUser)
      });
      Object.defineProperty(mockAuthService, 'isFinanceOrAdmin', {
        value: true
      });

      TestBed.runInInjectionContext(() => {
        const result = financeGuard(mockRoute, mockState);

        if (typeof result === 'boolean') {
          expect(result).toBe(true);
          expect(mockRouter.navigate).not.toHaveBeenCalled();
          done();
        } else {
          result.subscribe((allowed) => {
            expect(allowed).toBe(true);
            expect(mockRouter.navigate).not.toHaveBeenCalled();
            done();
          });
        }
      });
    });

    it('should redirect employee user to /expenses', (done) => {
      Object.defineProperty(mockAuthService, 'userProfile$', {
        value: of(mockEmployee)
      });
      Object.defineProperty(mockAuthService, 'isFinanceOrAdmin', {
        value: false
      });

      TestBed.runInInjectionContext(() => {
        const result = financeGuard(mockRoute, mockState);

        if (typeof result === 'boolean') {
          expect(result).toBe(false);
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/expenses']);
          done();
        } else {
          result.subscribe((allowed) => {
            expect(allowed).toBe(false);
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/expenses']);
            done();
          });
        }
      });
    });

    it('should redirect unauthenticated user to /expenses', (done) => {
      Object.defineProperty(mockAuthService, 'userProfile$', {
        value: of(null)
      });
      Object.defineProperty(mockAuthService, 'isFinanceOrAdmin', {
        value: false
      });

      TestBed.runInInjectionContext(() => {
        const result = financeGuard(mockRoute, mockState);

        if (typeof result === 'boolean') {
          expect(result).toBe(false);
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/expenses']);
          done();
        } else {
          result.subscribe((allowed) => {
            expect(allowed).toBe(false);
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/expenses']);
            done();
          });
        }
      });
    });

    it('should complete after single emission (take(1))', (done) => {
      Object.defineProperty(mockAuthService, 'userProfile$', {
        value: of(mockFinanceUser)
      });
      Object.defineProperty(mockAuthService, 'isFinanceOrAdmin', {
        value: true
      });

      TestBed.runInInjectionContext(() => {
        const result = financeGuard(mockRoute, mockState);

        if (typeof result !== 'boolean') {
          let emissionCount = 0;
          result.subscribe({
            next: () => {
              emissionCount++;
            },
            complete: () => {
              expect(emissionCount).toBe(1);
              done();
            }
          });
        } else {
          done();
        }
      });
    });

    it('should block user without proper role even if authenticated', (done) => {
      const managerUser: User = {
        id: 'user-999',
        email: 'manager@example.com',
        full_name: 'Test Manager',
        role: 'manager' as any,
        created_at: '2025-11-13T10:00:00Z',
        updated_at: '2025-11-13T10:00:00Z'
      };

      Object.defineProperty(mockAuthService, 'userProfile$', {
        value: of(managerUser)
      });
      Object.defineProperty(mockAuthService, 'isFinanceOrAdmin', {
        value: false
      });

      TestBed.runInInjectionContext(() => {
        const result = financeGuard(mockRoute, mockState);

        if (typeof result === 'boolean') {
          expect(result).toBe(false);
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/expenses']);
          done();
        } else {
          result.subscribe((allowed) => {
            expect(allowed).toBe(false);
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/expenses']);
            done();
          });
        }
      });
    });
  });

  describe('Guard Integration', () => {
    it('should chain authGuard and financeGuard for protected finance routes', (done) => {
      // First test authGuard
      Object.defineProperty(mockAuthService, 'userProfile$', {
        value: of(mockFinanceUser)
      });

      TestBed.runInInjectionContext(() => {
        const authResult = authGuard(mockRoute, mockState);

        const checkAuthResult = (allowed: boolean) => {
          expect(allowed).toBe(true);

          // Then test financeGuard
          Object.defineProperty(mockAuthService, 'isFinanceOrAdmin', {
            value: true
          });

          const financeResult = financeGuard(mockRoute, mockState);

          const checkFinanceResult = (financeAllowed: boolean) => {
            expect(financeAllowed).toBe(true);
            done();
          };

          if (typeof financeResult === 'boolean') {
            checkFinanceResult(financeResult);
          } else {
            financeResult.subscribe(checkFinanceResult);
          }
        };

        if (typeof authResult === 'boolean') {
          checkAuthResult(authResult);
        } else {
          authResult.subscribe(checkAuthResult);
        }
      });
    });

    it('should block unauthenticated user before checking finance role', (done) => {
      Object.defineProperty(mockAuthService, 'userProfile$', {
        value: of(null)
      });

      TestBed.runInInjectionContext(() => {
        // authGuard should block first
        const authResult = authGuard(mockRoute, mockState);

        const checkResult = (allowed: boolean) => {
          expect(allowed).toBe(false);
          expect(mockRouter.navigate).toHaveBeenCalledWith(
            ['/auth/login'],
            jasmine.any(Object)
          );
          done();
        };

        if (typeof authResult === 'boolean') {
          checkResult(authResult);
        } else {
          authResult.subscribe(checkResult);
        }
      });
    });
  });
});
