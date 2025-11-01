import type { Context, Next } from "hono";
import { ConsoleTransport, LogLayer } from "loglayer";
import { getCacheService } from "../services/cache";
import { Calculations, HTTPStatus } from "../types";

/**
 * In-memory rate limit store for fallback when Redis is unavailable
 */

const log = new LogLayer({
  transport: new ConsoleTransport({
    logger: console,
  }),
});
class InMemoryRateLimiter {
  private readonly store = new Map<
    string,
    { count: number; resetAt: number }
  >();
  private readonly cleanupInterval: Timer;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.store.entries()) {
        if (value.resetAt < now) {
          this.store.delete(key);
        }
      }
    }, Calculations.CLEAN_MEMORY_INTERVAL);
  }

  increment(
    key: string,
    window: number
  ): Promise<{ count: number; ttl: number }> {
    const now = Date.now();
    const resetAt = now + window * Calculations.X_RATE_LIMIT_RESET;

    const existing = this.store.get(key);

    if (!existing || existing.resetAt < now) {
      // New window or expired
      this.store.set(key, { count: 1, resetAt });
      return Promise.resolve({ count: 1, ttl: window });
    }

    // Increment existing counter
    existing.count++;
    return Promise.resolve({
      count: existing.count,
      ttl: Math.ceil(
        (existing.resetAt - now) / Calculations.X_RATE_LIMIT_RESET
      ),
    });
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
 * Attempt to increment rate limit counter using Redis
 */
async function tryRedisRateLimit(
  cache: ReturnType<typeof getCacheService>,
  key: string,
  limit: number,
  window: number
): Promise<{ count: number; ttl: number } | null> {
  try {
    const current = await cache.get<number>(key);

    if (current === null) {
      // First request in the window
      await cache.set(key, 1, window);
      return { count: 1, ttl: window };
    }

    // Increment counter
    const count = current + 1;
    const ttl = window; // Redis handles TTL internally

    if (count <= limit) {
      await cache.set(key, count, window);
    }

    return { count, ttl };
  } catch (error) {
    log.warn(`Redis rate limiting failed, using in-memory fallback: ${error}`);
    return null;
  }
}

/**
 * Set rate limit headers on the response
 */
function setRateLimitHeaders({
  c,
  limit,
  count,
  ttl,
  usingFallback,
}: {
  c: Context;
  limit: number;
  count: number;
  ttl: number;
  usingFallback: boolean;
}) {
  c.header("X-RateLimit-Limit", limit.toString());
  c.header("X-RateLimit-Remaining", Math.max(0, limit - count).toString());
  c.header(
    "X-RateLimit-Reset",
    (Date.now() + ttl * Calculations.X_RATE_LIMIT_RESET).toString()
  );

  if (process.env.NODE_ENV === "development") {
    c.header("X-RateLimit-Layer", usingFallback ? "in-memory" : "redis");
  }
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
    let ttl: number;
    let usingFallback = false;
    // Try Redis first
    const cache = getCacheService();
    let result: { count: number; ttl: number } | null = null;

    if (cache.isHealthy()) {
      result = await tryRedisRateLimit(cache, key, limit, window);
    }

    // Fall back to in-memory if Redis unavailable or failed
    if (!result) {
      const limiter = getInMemoryLimiter();
      result = await limiter.increment(key, window);
      usingFallback = true;
    }

    const count = result.count;
    ttl = result.ttl;

    // Set rate limit headers
    setRateLimitHeaders({ c, limit, count, ttl, usingFallback });

    // Check if rate limit exceeded
    if (count > limit) {
      return c.json(
        {
          error: "Rate limit exceeded",
          message: `Too many requests, please try again in ${ttl} seconds`,
          retryAfter: ttl,
        },
        HTTPStatus.RATE_LIMIT_EXCEEDED
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
