import { TestBed } from '@angular/core/testing';
import { ThemeService, Theme, ColorVariants } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let localStorageSpy: jasmine.SpyObj<Storage>;
  let matchMediaSpy: jasmine.Spy;
  let classListAddSpy: jasmine.Spy;
  let classListRemoveSpy: jasmine.Spy;
  let styleSetPropertySpy: jasmine.Spy;
  let originalDocumentElement: HTMLElement;
  let originalLocalStorage: Storage;
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    // Save originals for restoration in afterEach (prevents test pollution)
    originalLocalStorage = window.localStorage;
    originalMatchMedia = window.matchMedia;

    // Mock localStorage
    localStorageSpy = jasmine.createSpyObj('localStorage', ['getItem', 'setItem', 'removeItem']);
    Object.defineProperty(window, 'localStorage', {
      value: localStorageSpy,
      writable: true,
      configurable: true
    });

    // Save original document.documentElement and create isolated mock
    originalDocumentElement = document.documentElement;

    // Create mock with all needed methods
    const mockDocumentElement = {
      classList: {
        add: jasmine.createSpy('classList.add'),
        remove: jasmine.createSpy('classList.remove')
      },
      style: {
        setProperty: jasmine.createSpy('style.setProperty')
      },
      // Delegate to real appendChild for Angular Material compatibility
      appendChild: originalDocumentElement.appendChild.bind(originalDocumentElement)
    } as unknown as HTMLElement;

    // Replace document.documentElement with mock
    Object.defineProperty(document, 'documentElement', {
      value: mockDocumentElement,
      writable: true,
      configurable: true
    });

    // Update spy references to use mock
    classListAddSpy = (mockDocumentElement.classList as any).add;
    classListRemoveSpy = (mockDocumentElement.classList as any).remove;
    styleSetPropertySpy = (mockDocumentElement.style as any).setProperty;
    // Mock window.matchMedia
    const mockMediaQueryList = {
      matches: false,
      media: '(prefers-color-scheme: dark)',
      addEventListener: jasmine.createSpy('addEventListener'),
      removeEventListener: jasmine.createSpy('removeEventListener'),
      addListener: jasmine.createSpy('addListener'),
      removeListener: jasmine.createSpy('removeListener'),
      dispatchEvent: jasmine.createSpy('dispatchEvent'),
      onchange: null
    };
    matchMediaSpy = jasmine.createSpy('matchMedia').and.returnValue(mockMediaQueryList);
    Object.defineProperty(window, 'matchMedia', {
      value: matchMediaSpy,
      writable: true,
      configurable: true
    });

    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    // Restore original document.documentElement to prevent test pollution
    Object.defineProperty(document, 'documentElement', {
      value: originalDocumentElement,
      writable: true,
      configurable: true
    });

    // Restore original localStorage to prevent test pollution
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true
    });

    // Restore original matchMedia to prevent test pollution
    Object.defineProperty(window, 'matchMedia', {
      value: originalMatchMedia,
      writable: true,
      configurable: true
    });

    // Clean up dark class from real DOM
    document.documentElement.classList.remove('dark');
  });

  describe('constructor', () => {
    it('should be created', () => {
      service = TestBed.inject(ThemeService);
      expect(service).toBeTruthy();
    });
  });

  describe('setTheme', () => {
    beforeEach(() => {
      localStorageSpy.getItem.and.returnValue(null);
      service = TestBed.inject(ThemeService);
    });

    it('should set theme to light', () => {
      service.setTheme('light');
      expect(service.theme()).toBe('light');
    });

    it('should set theme to dark', () => {
      service.setTheme('dark');
      expect(service.theme()).toBe('dark');
    });
  });

  describe('toggleTheme', () => {
    beforeEach(() => {
      localStorageSpy.getItem.and.returnValue(null);
      service = TestBed.inject(ThemeService);
    });

    it('should toggle from light to dark', () => {
      service.setTheme('light');
      service.toggleTheme();
      expect(service.theme()).toBe('dark');
    });
  });

  describe('generateColorVariants', () => {
    beforeEach(() => {
      localStorageSpy.getItem.and.returnValue(null);
      service = TestBed.inject(ThemeService);
    });

    it('should generate color variants from hex color', () => {
      const variants = service.generateColorVariants('#FF5900');
      expect(variants).toBeDefined();
      expect(variants.primary).toBe('#FF5900');
    });
  });
});
