import type { Context, Next } from "hono";
import { getCacheService } from "../services/cache";

/**
 * In-memory rate limit store for fallback when Redis is unavailable
 */
class InMemoryRateLimiter {
  private store = new Map<string, { count: number; resetAt: number }>();
  private cleanupInterval: Timer;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.store.entries()) {
        if (value.resetAt < now) {
          this.store.delete(key);
        }
      }
    }, 60000);
  }

  increment(
    key: string,
    window: number
  ): Promise<{ count: number; ttl: number }> {
    const now = Date.now();
    const resetAt = now + window * 1000;

    const existing = this.store.get(key);

    if (!existing || existing.resetAt < now) {
      // New window or expired
      this.store.set(key, { count: 1, resetAt });
      return { count: 1, ttl: window };
    }

    // Increment existing counter
    existing.count++;
    return {
      count: existing.count,
      ttl: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Singleton in-memory rate limiter
let inMemoryLimiter: InMemoryRateLimiter | null = null;

/**
 * Get or create the in-memory rate limiter instance
 */
function getInMemoryLimiter(): InMemoryRateLimiter {
  if (!inMemoryLimiter) {
    inMemoryLimiter = new InMemoryRateLimiter();
  }
  return inMemoryLimiter;
}

/**
 * Enhanced rate limiting middleware with dual-layer protection
 * - Primary: Redis-based distributed rate limiting
 * - Fallback: In-memory rate limiting when Redis is unavailable
 */
export function enhancedRateLimitMiddleware(options: {
  limit: number;
  window: number; // in seconds
  keyGenerator?: (c: Context) => string;
}) {
  const {
    limit,
    window,
    keyGenerator = (c) => {
      // Default key generator uses IP + user ID if available
      const ip =
        c.req.header("x-forwarded-for") ||
        c.req.header("x-real-ip") ||
        "unknown";
      const userId = (c.get("user") as any)?.id || "anonymous";
      return `rate_limit:${ip}:${userId}`;
    },
  } = options;

  return async (c: Context, next: Next) => {
    const key = keyGenerator(c);
    let count: number;
    let ttl: number;
    let usingFallback = false;

    // Try Redis first
    const cache = getCacheService();
    if (cache.isHealthy()) {
      try {
        const current = await cache.get<number>(key);

        if (current === null) {
          // First request in the window
          count = 1;
          ttl = window;
          await cache.set(key, count, window);
        } else {
          // Increment counter
          count = current + 1;
          ttl = window; // Redis handles TTL internally

          if (count <= limit) {
            await cache.set(key, count, window);
          }
        }
      } catch (error) {
        // Redis failed, fall back to in-memory
        console.warn(
          "Redis rate limiting failed, using in-memory fallback:",
          error
        );
        const limiter = getInMemoryLimiter();
        const result = await limiter.increment(key, window);
        count = result.count;
        ttl = result.ttl;
        usingFallback = true;
      }
    } else {
      // Redis not available, use in-memory fallback
      const limiter = getInMemoryLimiter();
      const result = await limiter.increment(key, window);
      count = result.count;
      ttl = result.ttl;
      usingFallback = true;
    }

    // Set rate limit headers
    c.header("X-RateLimit-Limit", limit.toString());
    c.header("X-RateLimit-Remaining", Math.max(0, limit - count).toString());
    c.header("X-RateLimit-Reset", (Date.now() + ttl * 1000).toString());

    // Add header to indicate which layer is being used (for monitoring)
    if (process.env.NODE_ENV === "development") {
      c.header("X-RateLimit-Layer", usingFallback ? "in-memory" : "redis");
    }

    // Check if rate limit exceeded
    if (count > limit) {
      return c.json(
        {
          error: "Rate limit exceeded",
          message: `Too many requests, please try again in ${ttl} seconds`,
          retryAfter: ttl,
        },
        429
      );
    }

    await next();
  };
}

/**
 * Cleanup function for graceful shutdown
 */
export function cleanupRateLimiter() {
  if (inMemoryLimiter) {
    inMemoryLimiter.destroy();
    inMemoryLimiter = null;
  }
}
