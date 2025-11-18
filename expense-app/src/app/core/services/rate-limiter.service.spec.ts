import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { RateLimiterService } from './rate-limiter.service';

describe('RateLimiterService', () => {
  let service: RateLimiterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RateLimiterService);
  });

  afterEach(() => {
    service.clearAllRateLimits();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isRateLimited', () => {
    it('should not rate limit first request', () => {
      expect(service.isRateLimited('test')).toBe(false);
    });

    it('should rate limit after exceeding max requests', () => {
      const config = service.getRateLimitConfig('test');

      // Make max allowed requests
      for (let i = 0; i < config.maxRequests; i++) {
        expect(service.isRateLimited('test')).toBe(false);
      }

      // Next request should be rate limited
      expect(service.isRateLimited('test')).toBe(true);
    });

    it('should reset after time window passes', fakeAsync(() => {
      const config = service.getRateLimitConfig('test');

      // Exceed limit
      for (let i = 0; i <= config.maxRequests; i++) {
        service.isRateLimited('test');
      }

      expect(service.isRateLimited('test')).toBe(true);

      // Fast-forward past the window
      tick(config.windowMs + 100);

      // Should no longer be rate limited
      expect(service.isRateLimited('test')).toBe(false);
    }));

    it('should handle different endpoints independently', () => {
      // Configure different limits
      service.setRateLimit('endpoint1', { maxRequests: 2, windowMs: 1000 });
      service.setRateLimit('endpoint2', { maxRequests: 5, windowMs: 1000 });

      // Exceed endpoint1 limit
      service.isRateLimited('endpoint1');
      service.isRateLimited('endpoint1');
      expect(service.isRateLimited('endpoint1')).toBe(true);

      // endpoint2 should still be fine
      expect(service.isRateLimited('endpoint2')).toBe(false);
    });
  });

  describe('getRemainingRequests', () => {
    it('should return max requests initially', () => {
      const config = service.getRateLimitConfig('test');
      expect(service.getRemainingRequests('test')).toBe(config.maxRequests);
    });

    it('should decrease with each request', () => {
      const initialRemaining = service.getRemainingRequests('test');

      service.isRateLimited('test');

      expect(service.getRemainingRequests('test')).toBe(initialRemaining - 1);
    });

    it('should return 0 when rate limited', () => {
      const config = service.getRateLimitConfig('test');

      for (let i = 0; i < config.maxRequests; i++) {
        service.isRateLimited('test');
      }

      expect(service.getRemainingRequests('test')).toBe(0);
    });
  });

  describe('getResetTime', () => {
    it('should return 0 when no requests made', () => {
      expect(service.getResetTime('test')).toBe(0);
    });

    it('should return positive value after requests', () => {
      service.isRateLimited('test');
      const resetTime = service.getResetTime('test');
      expect(resetTime).toBeGreaterThan(0);
    });

    it('should decrease over time', fakeAsync(() => {
      service.isRateLimited('test');

      const initialResetTime = service.getResetTime('test');

      tick(100);

      const laterResetTime = service.getResetTime('test');
      expect(laterResetTime).toBeLessThan(initialResetTime);
    }));
  });

  describe('execute', () => {
    it('should execute request immediately when not rate limited', (done) => {
      const mockRequest = () => of('success');

      service.execute('test', mockRequest).subscribe((result) => {
        expect(result).toBe('success');
        done();
      });
    });

    it('should queue request when rate limited', fakeAsync(() => {
      const config = { maxRequests: 1, windowMs: 1000 };
      service.setRateLimit('test', config);

      let firstCompleted = false;
      let secondCompleted = false;

      // First request should execute immediately
      service.execute('test', () => of('first')).subscribe(() => {
        firstCompleted = true;
      });

      expect(firstCompleted).toBe(true);

      // Second request should be queued
      service.execute('test', () => of('second')).subscribe(() => {
        secondCompleted = true;
      });

      expect(secondCompleted).toBe(false);

      // Fast-forward past the window
      tick(config.windowMs + 100);

      expect(secondCompleted).toBe(true);
    }));

    it('should handle request errors', (done) => {
      const mockRequest = () => throwError(() => new Error('Test error'));

      service.execute('test', mockRequest).subscribe({
        error: (error) => {
          expect(error.message).toBe('Test error');
          done();
        }
      });
    });
  });

  describe('clearRateLimit', () => {
    it('should clear rate limit for specific endpoint', () => {
      const config = service.getRateLimitConfig('test');

      // Exceed limit
      for (let i = 0; i <= config.maxRequests; i++) {
        service.isRateLimited('test');
      }

      expect(service.isRateLimited('test')).toBe(true);

      // Clear and try again
      service.clearRateLimit('test');
      expect(service.isRateLimited('test')).toBe(false);
    });

    it('should not affect other endpoints', () => {
      service.isRateLimited('endpoint1');
      service.isRateLimited('endpoint2');

      service.clearRateLimit('endpoint1');

      // endpoint1 should be reset
      const remaining1 = service.getRemainingRequests('endpoint1');
      const config1 = service.getRateLimitConfig('endpoint1');
      expect(remaining1).toBe(config1.maxRequests);

      // endpoint2 should still have one request used
      const remaining2 = service.getRemainingRequests('endpoint2');
      const config2 = service.getRateLimitConfig('endpoint2');
      expect(remaining2).toBe(config2.maxRequests - 1);
    });
  });

  describe('clearAllRateLimits', () => {
    it('should reset all endpoints', () => {
      service.isRateLimited('endpoint1');
      service.isRateLimited('endpoint2');
      service.isRateLimited('endpoint3');

      service.clearAllRateLimits();

      const config = service.getRateLimitConfig('endpoint1');
      expect(service.getRemainingRequests('endpoint1')).toBe(config.maxRequests);
      expect(service.getRemainingRequests('endpoint2')).toBe(config.maxRequests);
      expect(service.getRemainingRequests('endpoint3')).toBe(config.maxRequests);
    });
  });

  describe('setRateLimit', () => {
    it('should set custom rate limit configuration', () => {
      const customConfig = { maxRequests: 3, windowMs: 500 };
      service.setRateLimit('custom', customConfig);

      const retrieved = service.getRateLimitConfig('custom');
      expect(retrieved.maxRequests).toBe(3);
      expect(retrieved.windowMs).toBe(500);
    });

    it('should apply custom configuration', () => {
      service.setRateLimit('custom', { maxRequests: 2, windowMs: 1000 });

      service.isRateLimited('custom');
      service.isRateLimited('custom');

      // Third request should be rate limited
      expect(service.isRateLimited('custom')).toBe(true);
    });
  });

  describe('endpoint-specific configurations', () => {
    it('should have stricter limits for upload endpoint', () => {
      const uploadConfig = service.getRateLimitConfig('upload');
      const defaultConfig = service.getRateLimitConfig('default');

      expect(uploadConfig.maxRequests).toBeLessThan(defaultConfig.maxRequests);
    });

    it('should have stricter limits for create endpoint', () => {
      const createConfig = service.getRateLimitConfig('create');
      const defaultConfig = service.getRateLimitConfig('default');

      expect(createConfig.maxRequests).toBeLessThan(defaultConfig.maxRequests);
    });
  });
});
