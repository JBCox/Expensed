import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { of } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { provideRouter } from '@angular/router';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: AuthService,
          useValue: {
            userProfile$: of({ id: 'test-id', email: 'test@example.com', full_name: 'Test User', role: 'employee' }),
            session$: of({ user: { id: 'test-id', email: 'test@example.com', user_metadata: {} } }),
            isFinanceOrAdmin: false,
            signOut: () => Promise.resolve()
          }
        },
        provideRouter([])
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  // Basic smoke test ensures component renders without throwing
  it('should render toolbar outlet', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
