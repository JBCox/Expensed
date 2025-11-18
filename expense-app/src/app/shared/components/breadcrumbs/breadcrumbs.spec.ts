import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { Breadcrumbs } from './breadcrumbs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('Breadcrumbs', () => {
  let component: Breadcrumbs;
  let fixture: ComponentFixture<Breadcrumbs>;
  let routerSpy: jasmine.SpyObj<Router>;
  let routerEventsSubject: Subject<any>;

  beforeEach(async () => {
    routerEventsSubject = new Subject();
    routerSpy = jasmine.createSpyObj('Router', ['navigateByUrl'], {
      events: routerEventsSubject.asObservable()
    });

    const activatedRouteMock = {
      root: {
        snapshot: {
          data: {},
          url: []
        },
        firstChild: null
      }
    };

    await TestBed.configureTestingModule({
      imports: [Breadcrumbs],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        provideNoopAnimations()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Breadcrumbs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    routerEventsSubject.complete();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty breadcrumbs', () => {
    expect(component.breadcrumbs().length).toBe(0);
  });

  it('should generate breadcrumbs from route data', () => {
    const activatedRoute = TestBed.inject(ActivatedRoute);
    (activatedRoute.root as any) = {
      snapshot: {
        data: { breadcrumb: 'Home', breadcrumbIcon: 'home' },
        url: [{ path: 'home' }]
      },
      firstChild: null
    };

    component.ngOnInit();

    const breadcrumbs = component.breadcrumbs();
    expect(breadcrumbs.length).toBe(1);
    expect(breadcrumbs[0].label).toBe('Home');
    expect(breadcrumbs[0].icon).toBe('home');
    expect(breadcrumbs[0].url).toBe('/home');
  });

  it('should handle navigation events', (done) => {
    const activatedRoute = TestBed.inject(ActivatedRoute);
    (activatedRoute.root as any) = {
      snapshot: {
        data: { breadcrumb: 'Expenses' },
        url: [{ path: 'expenses' }]
      },
      firstChild: null
    };

    component.ngOnInit();

    // Trigger navigation event
    routerEventsSubject.next(new NavigationEnd(1, '/expenses', '/expenses'));

    setTimeout(() => {
      const breadcrumbs = component.breadcrumbs();
      expect(breadcrumbs.length).toBeGreaterThan(0);
      done();
    }, 100);
  });

  it('should navigate to breadcrumb URL', () => {
    const breadcrumb = { label: 'Home', url: '/home' };
    component.navigateTo(breadcrumb);

    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/home');
  });

  it('should identify last breadcrumb correctly', () => {
    component.breadcrumbs.set([
      { label: 'Home', url: '/home' },
      { label: 'Expenses', url: '/expenses' },
      { label: 'Details', url: '/expenses/123' }
    ]);

    expect(component.isLast(0)).toBe(false);
    expect(component.isLast(1)).toBe(false);
    expect(component.isLast(2)).toBe(true);
  });

  it('should not show breadcrumb for IDs', () => {
    const uuidId = '123e4567-e89b-12d3-a456-426614174000';
    const result = (component as any).isId(uuidId);
    expect(result).toBe(true);

    const numericId = '12345';
    const resultNumeric = (component as any).isId(numericId);
    expect(resultNumeric).toBe(true);

    const normalPath = 'expenses';
    const resultNormal = (component as any).isId(normalPath);
    expect(resultNormal).toBe(false);
  });

  it('should generate label from kebab-case', () => {
    const label = (component as any).generateLabel('user-management');
    expect(label).toBe('User Management');
  });

  it('should use route mapping when available', () => {
    const label = (component as any).generateLabel('expenses');
    expect(label).toBe('Expenses');
  });

  it('should return null for IDs', () => {
    const label = (component as any).generateLabel('123e4567-e89b-12d3-a456-426614174000');
    expect(label).toBeNull();
  });

  it('should get icon for known routes', () => {
    const icon = (component as any).getIconForSegment('home');
    expect(icon).toBe('home');

    const expenseIcon = (component as any).getIconForSegment('expenses');
    expect(expenseIcon).toBe('receipt_long');
  });

  it('should return undefined for unknown routes', () => {
    const icon = (component as any).getIconForSegment('unknown-route');
    expect(icon).toBeUndefined();
  });

  it('should deduplicate breadcrumbs', () => {
    const breadcrumbs = [
      { label: 'Home', url: '/home' },
      { label: 'Home', url: '/home' },
      { label: 'Expenses', url: '/expenses' }
    ];

    const deduplicated = (component as any).deduplicateBreadcrumbs(breadcrumbs);
    expect(deduplicated.length).toBe(2);
    expect(deduplicated[0].label).toBe('Home');
    expect(deduplicated[1].label).toBe('Expenses');
  });

  it('should cleanup on destroy', () => {
    spyOn(component['destroy$'], 'next');
    spyOn(component['destroy$'], 'complete');

    component.ngOnDestroy();

    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
