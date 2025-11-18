import { Injectable } from '@angular/core';
import { Observable, Subject, timer, throwError } from 'rxjs';
import { concatMap, delay, mergeMap, throttleTime } from 'rxjs/operators';

/**
 * Rate limiting configuration for different operations
 */
interface RateLimitConfig {
  maxRequests: number; // Maximum requests allowed
  windowMs: number; // Time window in milliseconds
}

/**
 * Request queue item
 */
interface QueuedRequest<T> {
  request: () => Observable<T>;
  subject: Subject<T>;
}

/**
 * Rate Limiter Service
 * Provides client-side rate limiting for API calls to prevent abuse
 * and improve server stability
 */
@Injectable({
  providedIn: 'root'
})
export class RateLimiterService {
  // Request timestamp tracking per endpoint
  private requestTimestamps = new Map<string, number[]>();

  // Request queues per endpoint
  private requestQueues = new Map<string, QueuedRequest<any>[]>();

  // Default rate limit configurations
  private defaultConfig: RateLimitConfig = {
    maxRequests: 10, // 10 requests
    windowMs: 1000 // per second
  };

  // Specific configurations for different endpoints
  private endpointConfigs = new Map<string, RateLimitConfig>([
    ['search', { maxRequests: 5, windowMs: 1000 }], // 5 searches per second
    ['create', { maxRequests: 2, windowMs: 1000 }], // 2 creates per second
    ['update', { maxRequests: 5, windowMs: 1000 }], // 5 updates per second
    ['delete', { maxRequests: 2, windowMs: 1000 }], // 2 deletes per second
    ['upload', { maxRequests: 1, windowMs: 2000 }], // 1 upload per 2 seconds
  ]);

  /**
   * Check if a request should be rate limited
   * @param endpoint - The endpoint identifier
   * @returns true if the request should be blocked
   */
  isRateLimited(endpoint: string): boolean {
    const config = this.endpointConfigs.get(endpoint) || this.defaultConfig;
    const now = Date.now();

    // Get or initialize timestamp array for this endpoint
    let timestamps = this.requestTimestamps.get(endpoint) || [];

    // Remove timestamps outside the current window
    timestamps = timestamps.filter(ts => now - ts < config.windowMs);

    // Check if we've exceeded the limit
    if (timestamps.length >= config.maxRequests) {
      return true; // Rate limited
    }

    // Add current timestamp
    timestamps.push(now);
    this.requestTimestamps.set(endpoint, timestamps);

    return false; // Not rate limited
  }

  /**
   * Get the remaining requests before hitting the rate limit
   * @param endpoint - The endpoint identifier
   * @returns Number of requests remaining
   */
  getRemainingRequests(endpoint: string): number {
    const config = this.endpointConfigs.get(endpoint) || this.defaultConfig;
    const now = Date.now();

    let timestamps = this.requestTimestamps.get(endpoint) || [];
    timestamps = timestamps.filter(ts => now - ts < config.windowMs);

    return Math.max(0, config.maxRequests - timestamps.length);
  }

  /**
   * Get time until rate limit resets (in milliseconds)
   * @param endpoint - The endpoint identifier
   * @returns Milliseconds until reset, or 0 if not limited
   */
  getResetTime(endpoint: string): number {
    const config = this.endpointConfigs.get(endpoint) || this.defaultConfig;
    const timestamps = this.requestTimestamps.get(endpoint) || [];

    if (timestamps.length === 0) {
      return 0;
    }

    const oldestTimestamp = Math.min(...timestamps);
    const resetTime = oldestTimestamp + config.windowMs;
    const now = Date.now();

    return Math.max(0, resetTime - now);
  }

  /**
   * Throttle an observable to prevent rapid-fire requests
   * @param observable - The observable to throttle
   * @param throttleMs - Throttle duration in milliseconds
   * @returns Throttled observable
   */
  throttle<T>(observable: Observable<T>, throttleMs = 1000): Observable<T> {
    return observable.pipe(throttleTime(throttleMs, undefined, { leading: true, trailing: false }));
  }

  /**
   * Execute a request with rate limiting
   * If rate limited, queues the request for later execution
   * @param endpoint - The endpoint identifier
   * @param request - The request function that returns an Observable
   * @returns Observable that resolves when the request completes
   */
  execute<T>(endpoint: string, request: () => Observable<T>): Observable<T> {
    if (!this.isRateLimited(endpoint)) {
      // Not rate limited, execute immediately
      return request();
    }

    // Rate limited, queue the request
    const subject = new Subject<T>();
    const queued: QueuedRequest<T> = { request, subject };

    // Get or create queue for this endpoint
    const queue = this.requestQueues.get(endpoint) || [];
    queue.push(queued);
    this.requestQueues.set(endpoint, queue);

    // Process queue after reset time
    const resetTime = this.getResetTime(endpoint);
    timer(resetTime).subscribe(() => {
      this.processQueue(endpoint);
    });

    return subject.asObservable();
  }

  /**
   * Process the request queue for an endpoint
   * @param endpoint - The endpoint identifier
   * @private
   */
  private processQueue(endpoint: string): void {
    const queue = this.requestQueues.get(endpoint);
    if (!queue || queue.length === 0) {
      return;
    }

    // Take the first request from the queue
    const queued = queue.shift();
    if (!queued) {
      return;
    }

    this.requestQueues.set(endpoint, queue);

    // Execute the request
    if (!this.isRateLimited(endpoint)) {
      queued.request().subscribe({
        next: (value) => queued.subject.next(value),
        error: (error) => queued.subject.error(error),
        complete: () => queued.subject.complete()
      });

      // Process next item in queue if available
      if (queue.length > 0) {
        const config = this.endpointConfigs.get(endpoint) || this.defaultConfig;
        timer(config.windowMs / config.maxRequests).subscribe(() => {
          this.processQueue(endpoint);
        });
      }
    } else {
      // Still rate limited, reschedule
      const resetTime = this.getResetTime(endpoint);
      timer(resetTime).subscribe(() => {
        queue.unshift(queued); // Put it back at the front
        this.requestQueues.set(endpoint, queue);
        this.processQueue(endpoint);
      });
    }
  }

  /**
   * Clear all rate limit tracking for an endpoint
   * @param endpoint - The endpoint identifier
   */
  clearRateLimit(endpoint: string): void {
    this.requestTimestamps.delete(endpoint);
    this.requestQueues.delete(endpoint);
  }

  /**
   * Clear all rate limits
   */
  clearAllRateLimits(): void {
    this.requestTimestamps.clear();
    this.requestQueues.clear();
  }

  /**
   * Set custom rate limit configuration for an endpoint
   * @param endpoint - The endpoint identifier
   * @param config - Rate limit configuration
   */
  setRateLimit(endpoint: string, config: RateLimitConfig): void {
    this.endpointConfigs.set(endpoint, config);
  }

  /**
   * Get rate limit configuration for an endpoint
   * @param endpoint - The endpoint identifier
   * @returns Rate limit configuration
   */
  getRateLimitConfig(endpoint: string): RateLimitConfig {
    return this.endpointConfigs.get(endpoint) || this.defaultConfig;
  }
}
