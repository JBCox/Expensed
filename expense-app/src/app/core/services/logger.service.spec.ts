import { TestBed } from '@angular/core/testing';
import { LoggerService, LogLevel } from './logger.service';
import { environment } from '../../../environments/environment';

describe('LoggerService', () => {
  let service: LoggerService;
  let consoleDebugSpy: jasmine.Spy;
  let consoleInfoSpy: jasmine.Spy;
  let consoleWarnSpy: jasmine.Spy;
  let consoleErrorSpy: jasmine.Spy;
  let isProduction: boolean;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoggerService);

    // Store environment flag
    isProduction = environment.production;

    // Spy on console methods
    consoleDebugSpy = spyOn(console, 'debug');
    consoleInfoSpy = spyOn(console, 'info');
    consoleWarnSpy = spyOn(console, 'warn');
    consoleErrorSpy = spyOn(console, 'error');
  });

  afterEach(() => {
    service.clearLogs();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('debug()', () => {
    it('should log debug messages in development', () => {
      service.debug('Test debug message', 'TestContext');
      if (!isProduction) {
        expect(consoleDebugSpy).toHaveBeenCalled();
      } else {
        // In production, DEBUG logs are filtered out
        expect(consoleDebugSpy).not.toHaveBeenCalled();
      }
    });

    it('should store debug log in memory in development', () => {
      service.debug('Test debug', 'TestContext', { key: 'value' });
      const logs = service.getLogs();

      if (!isProduction) {
        expect(logs.length).toBe(1);
        expect(logs[0].level).toBe(LogLevel.DEBUG);
        expect(logs[0].message).toBe('Test debug');
        expect(logs[0].context).toBe('TestContext');
      } else {
        // In production, DEBUG logs are filtered out
        expect(logs.length).toBe(0);
      }
    });
  });

  describe('info()', () => {
    it('should log info messages in development', () => {
      service.info('Test info message');
      if (!isProduction) {
        expect(consoleInfoSpy).toHaveBeenCalled();
      } else {
        // In production, INFO logs are filtered out (only WARN and ERROR)
        expect(consoleInfoSpy).not.toHaveBeenCalled();
      }
    });
  });

  describe('warn()', () => {
    it('should log warning messages', () => {
      service.warn('Test warning', 'WarnContext');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('error()', () => {
    it('should log error messages', () => {
      const error = new Error('Test error');
      service.error('Error occurred', error, 'ErrorContext');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error');
      service.error('Error message', error);
      const logs = service.getLogs();
      expect(logs[0].error).toBe(error);
    });

    it('should handle non-Error objects', () => {
      service.error('Error message', { code: 500 });
      const logs = service.getLogs();
      expect(logs[0].data).toEqual({ code: 500 });
    });
  });

  describe('getErrorMessage()', () => {
    it('should extract message from Error', () => {
      const error = new Error('Test error');
      expect(service.getErrorMessage(error)).toBe('Test error');
    });

    it('should handle string errors', () => {
      expect(service.getErrorMessage('String error')).toBe('String error');
    });

    it('should handle objects with message property', () => {
      const error = { message: 'Object error' };
      expect(service.getErrorMessage(error)).toBe('Object error');
    });

    it('should return default message for unknown types', () => {
      expect(service.getErrorMessage(null)).toBe('An error occurred');
      expect(service.getErrorMessage(undefined)).toBe('An error occurred');
      expect(service.getErrorMessage(123, 'Custom default')).toBe('Custom default');
    });
  });

  describe('log storage', () => {
    it('should limit stored logs to maxLogSize', () => {
      // Use WARN level to ensure logs are stored regardless of environment
      for (let i = 0; i < 150; i++) {
        service.warn(`Message ${i}`);
      }
      const logs = service.getLogs();
      expect(logs.length).toBe(100);
      // Should keep the most recent logs
      expect(logs[logs.length - 1].message).toBe('Message 149');
    });

    it('should clear all logs', () => {
      // Use WARN level to ensure logs are stored regardless of environment
      service.warn('Message 1');
      service.warn('Message 2');
      expect(service.getLogs().length).toBe(2);
      service.clearLogs();
      expect(service.getLogs().length).toBe(0);
    });
  });

  describe('getLogs()', () => {
    it('should return immutable copy of logs', () => {
      // Use WARN level to ensure log is stored regardless of environment
      service.warn('Test message');
      const logs1 = service.getLogs();
      const logs2 = service.getLogs();
      expect(logs1).not.toBe(logs2); // Different array instances
      expect(logs1).toEqual(logs2); // Same content
    });
  });
});
