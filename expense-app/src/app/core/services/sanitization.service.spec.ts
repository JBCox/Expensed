import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { SanitizationService } from './sanitization.service';

describe('SanitizationService', () => {
  let service: SanitizationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SanitizationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('sanitizeInput', () => {
    it('should remove script tags', () => {
      const dangerous = '<script>alert("XSS")</script>Hello';
      const result = service.sanitizeInput(dangerous);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('should remove event handlers', () => {
      const dangerous = '<div onclick="alert(1)">Click</div>';
      const result = service.sanitizeInput(dangerous);
      expect(result).not.toContain('onclick');
    });

    it('should handle null and undefined', () => {
      expect(service.sanitizeInput(null)).toBe('');
      expect(service.sanitizeInput(undefined)).toBe('');
    });

    it('should encode HTML entities', () => {
      const input = '<div>Test & "quotes"</div>';
      const result = service.sanitizeInput(input);
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
    });
  });

  describe('sanitizeText', () => {
    it('should remove all HTML tags', () => {
      const input = '<p>Hello <b>World</b></p>';
      const result = service.sanitizeText(input);
      expect(result).toBe('Hello World');
    });

    it('should preserve plain text', () => {
      const input = 'Shell Gas Station';
      const result = service.sanitizeText(input);
      expect(result).toBe('Shell Gas Station');
    });

    it('should remove script tags from text', () => {
      const dangerous = 'Test <script>alert(1)</script> Text';
      const result = service.sanitizeText(dangerous);
      expect(result).not.toContain('<script>');
    });
  });

  describe('containsDangerousContent', () => {
    it('should detect script tags', () => {
      expect(service.containsDangerousContent('<script>alert(1)</script>')).toBe(true);
    });

    it('should detect javascript: protocol', () => {
      expect(service.containsDangerousContent('javascript:alert(1)')).toBe(true);
    });

    it('should detect event handlers', () => {
      expect(service.containsDangerousContent('<div onclick="bad()"></div>')).toBe(true);
      expect(service.containsDangerousContent('<img onerror="bad()" />')).toBe(true);
    });

    it('should detect iframe tags', () => {
      expect(service.containsDangerousContent('<iframe src="bad.com"></iframe>')).toBe(true);
    });

    it('should return false for safe content', () => {
      expect(service.containsDangerousContent('Hello World')).toBe(false);
      expect(service.containsDangerousContent('Shell Gas - $45.50')).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(service.containsDangerousContent(null)).toBe(false);
      expect(service.containsDangerousContent(undefined)).toBe(false);
    });
  });

  describe('noXssValidator', () => {
    it('should return null for safe input', () => {
      const validator = service.noXssValidator();
      const control = new FormControl('Safe merchant name');
      expect(validator(control)).toBeNull();
    });

    it('should return validation error for dangerous input', () => {
      const validator = service.noXssValidator();
      const control = new FormControl('<script>alert(1)</script>');
      const result = validator(control);
      expect(result).toBeTruthy();
      expect(result?.['xssDetected']).toBeDefined();
    });

    it('should return null for empty input', () => {
      const validator = service.noXssValidator();
      const control = new FormControl('');
      expect(validator(control)).toBeNull();
    });
  });

  describe('noScriptTagsValidator', () => {
    it('should detect script tags', () => {
      const validator = service.noScriptTagsValidator();
      const control = new FormControl('<script>bad()</script>');
      const result = validator(control);
      expect(result).toBeTruthy();
      expect(result?.['scriptInjection']).toBeDefined();
    });

    it('should detect event handlers', () => {
      const validator = service.noScriptTagsValidator();
      const control = new FormControl('<div onclick="bad()">');
      const result = validator(control);
      expect(result).toBeTruthy();
      expect(result?.['scriptInjection']).toBeDefined();
    });

    it('should allow safe input', () => {
      const validator = service.noScriptTagsValidator();
      const control = new FormControl('Shell Gas Station');
      expect(validator(control)).toBeNull();
    });
  });

  describe('sanitizeUrl', () => {
    it('should block javascript: protocol', () => {
      const result = service.sanitizeUrl('javascript:alert(1)');
      expect(result).toBe('');
    });

    it('should block data: protocol', () => {
      const result = service.sanitizeUrl('data:text/html,<script>alert(1)</script>');
      expect(result).toBe('');
    });

    it('should block vbscript: protocol', () => {
      const result = service.sanitizeUrl('vbscript:alert(1)');
      expect(result).toBe('');
    });

    it('should allow http and https', () => {
      expect(service.sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(service.sanitizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('should handle null and undefined', () => {
      expect(service.sanitizeUrl(null)).toBe('');
      expect(service.sanitizeUrl(undefined)).toBe('');
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove path traversal attempts', () => {
      const result = service.sanitizeFilename('../../../etc/passwd');
      expect(result).not.toContain('..');
      expect(result).not.toContain('/');
    });

    it('should remove path separators', () => {
      const result = service.sanitizeFilename('path/to/file.txt');
      expect(result).not.toContain('/');
    });

    it('should allow safe filenames', () => {
      const result = service.sanitizeFilename('receipt_2024-01-15.pdf');
      expect(result).toBe('receipt_2024-01-15.pdf');
    });

    it('should replace invalid characters with underscore', () => {
      const result = service.sanitizeFilename('file<name>.txt');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });
  });

  describe('sanitizeCsvValue', () => {
    it('should escape double quotes', () => {
      const result = service.sanitizeCsvValue('Test "quoted" value');
      expect(result).toContain('""');
    });

    it('should prevent CSV formula injection with =', () => {
      const result = service.sanitizeCsvValue('=1+1');
      expect(result).toBe('"\'=1+1"');
    });

    it('should prevent CSV formula injection with +', () => {
      const result = service.sanitizeCsvValue('+1+1');
      expect(result).toBe('"\'+1+1"');
    });

    it('should prevent CSV formula injection with -', () => {
      const result = service.sanitizeCsvValue('-1');
      expect(result).toBe('"\'-1"');
    });

    it('should prevent CSV formula injection with @', () => {
      const result = service.sanitizeCsvValue('@SUM(A1:A10)');
      expect(result).toBe('"\'@SUM(A1:A10)"');
    });

    it('should wrap normal values in quotes', () => {
      const result = service.sanitizeCsvValue('Normal Value');
      expect(result).toBe('"Normal Value"');
    });

    it('should handle numbers', () => {
      const result = service.sanitizeCsvValue(123.45);
      expect(result).toBe('"123.45"');
    });

    it('should handle null and undefined', () => {
      expect(service.sanitizeCsvValue(null)).toBe('""');
      expect(service.sanitizeCsvValue(undefined)).toBe('""');
    });
  });
});
