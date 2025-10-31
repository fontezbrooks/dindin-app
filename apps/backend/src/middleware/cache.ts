import type { Context, Next } from "hono";
import { getCacheService } from "../services/cache";

type CacheMiddlewareOptions = {
  keyGenerator?: (c: Context) => string;
  ttl?: number;
  condition?: (c: Context) => boolean;
  invalidateOn?: string[]; // HTTP methods that invalidate cache
};

/**
 * Cache middleware for Hono routes
 * Automatically caches GET requests and invalidates on mutations
 */
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  const {
    keyGenerator = defaultKeyGenerator,
    ttl = 300, // Default 5 minutes
    condition = () => true,
    invalidateOn = ["POST", "PUT", "PATCH", "DELETE"],
  } = options;

  return async (c: Context, next: Next) => {
    const cache = getCacheService();
    const method = c.req.method;

    // Check if cache service is healthy
    if (!cache.isHealthy()) {
      // If cache is not available, continue without caching
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator(c);

    // Handle cache invalidation for mutation operations
    if (invalidateOn.includes(method)) {
      await next();

      // Invalidate related cache entries after successful mutation
      if (c.res.status >= 200 && c.res.status < 300) {
        await cache.flushPattern(`${cacheKey}*`);
        console.debug(`Cache invalidated for pattern: ${cacheKey}*`);
      }

      return;
    }

    // Only cache GET requests by default
    if (method !== "GET" || !condition(c)) {
      return next();
    }

    // Try to get from cache
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.debug(`Cache hit for key: ${cacheKey}`);

      // Set cache headers
      c.header("X-Cache", "HIT");
      c.header("X-Cache-Key", cacheKey);

      // Return cached response
      return c.json(cached);
    }

    console.debug(`Cache miss for key: ${cacheKey}`);

    // Execute route handler
    await next();

    // Cache successful responses
    if (c.res.status >= 200 && c.res.status < 300) {
      try {
        // Clone response to read body
        const response = c.res.clone();
        const body = await response.json();

        // Store in cache
        await cache.set(cacheKey, body, ttl);

        // Set cache headers
        c.header("X-Cache", "MISS");
        c.header("X-Cache-Key", cacheKey);
      } catch (error) {
        console.error("Error caching response:", error);
      }
    }
  };
}

/**
 * Default cache key generator
 * Creates a key based on method, path, and query parameters
 */
function defaultKeyGenerator(c: Context): string {
  const url = new URL(c.req.url);
  const path = url.pathname.replace(/\/$/, ""); // Remove trailing slash
  const query = url.search;

  return `api:${path}${query}`;
}

/**
 * Session-specific cache middleware
 */
export function sessionCacheMiddleware() {
  return cacheMiddleware({
    keyGenerator: (c) => {
      const sessionId = c.req.param("id") || c.req.param("sessionId");
      return sessionId ? `session:${sessionId}` : "session:list";
    },
    ttl: 60, // 1 minute for session data
    invalidateOn: ["POST", "PUT", "PATCH", "DELETE", "WS"], // Include WebSocket
  });
}

/**
 * User-specific cache middleware
 */
export function userCacheMiddleware() {
  return cacheMiddleware({
    keyGenerator: (c) => {
      const userId = c.req.param("id") || c.req.param("userId");
      return userId ? `user:${userId}` : "user:list";
    },
    ttl: 600, // 10 minutes for user data
  });
}

/**
 * Recipe/Restaurant cache middleware
 */
export function contentCacheMiddleware(type: "recipe" | "restaurant") {
  return cacheMiddleware({
    keyGenerator: (c) => {
      const id = c.req.param("id");
      const url = new URL(c.req.url);
      const filters = url.search;

      return id ? `${type}:${id}` : `${type}:list${filters}`;
    },
    ttl: type === "recipe" ? 3600 : 3600, // 1 hour for content
  });
}

/**
 * Rate limiting cache middleware using Redis
 */
export function rateLimitMiddleware(
  options: {
    limit?: number;
    window?: number; // Time window in seconds
    keyGenerator?: (c: Context) => string;
  } = {}
) {
  const {
    limit = 100,
    window = 60,
    keyGenerator = (c) => {
      // Use IP address or user ID for rate limiting
      const ip =
        c.req.header("x-forwarded-for") ||
        c.req.header("cf-connecting-ip") ||
        "unknown";
      const userId = c.get("userId");
      return userId ? `rate:user:${userId}` : `rate:ip:${ip}`;
    },
  } = options;

  return async (c: Context, next: Next) => {
    const cache = getCacheService();

    if (!cache.isHealthy()) {
      // If cache is not available, continue without rate limiting
      return next();
    }

    const key = keyGenerator(c);
    const current = await cache.get<number>(key);

    if (current === null) {
      // First request in the window
      await cache.set(key, 1, window);
    } else if (current >= limit) {
      // Rate limit exceeded
      c.header("X-RateLimit-Limit", limit.toString());
      c.header("X-RateLimit-Remaining", "0");
      c.header("X-RateLimit-Reset", (Date.now() + window * 1000).toString());

      return c.json(
        {
          error: "Rate limit exceeded",
          message: "Too many requests, please try again later",
        },
        429
      );
    } else {
      // Increment counter
      const newCount = current + 1;
      await cache.set(key, newCount, window);

      // Set rate limit headers
      c.header("X-RateLimit-Limit", limit.toString());
      c.header("X-RateLimit-Remaining", (limit - newCount).toString());
    }

    await next();
  };
}

/**
 * Cache warming middleware
 * Pre-populates cache with commonly requested data
 */
export async function warmCache(patterns: {
  recipes?: boolean;
  restaurants?: boolean;
  popular?: boolean;
}) {
  const cache = await getCacheService();

  if (!cache.isHealthy()) {
    console.warn("Cache not available, skipping cache warming");
    return;
  }

  console.log("Starting cache warming...");

  // Add cache warming logic here based on your needs
  // This would typically fetch popular or frequently accessed data
  // and pre-populate the cache

  console.log("Cache warming completed");
}
