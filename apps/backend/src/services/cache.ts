import type { Redis } from "ioredis";
import { logger } from "../../../../packages/logger";
import {
  CACHE_KEYS,
  closeRedisConnection,
  getRedisClient,
  TTL_CONFIG,
} from "../config/redis";

export type CacheStats = {
  hits: number;
  misses: number;
  errors: number;
  hitRate: number;
};

export type CacheOptions = {
  ttl?: number; // Time to live in seconds
  fallbackOnError?: boolean; // Whether to continue on cache errors
  compress?: boolean; // Whether to compress large values
};
// Cache validation constants
const CACHE_CONSTANTS = {
  KEY_VALIDATION_REGEX: /^[a-zA-Z0-9:_\-.]+$/,
  MAX_KEY_LENGTH: 512,
  MAX_VALUE_SIZE_MB: 5,
  KILOBYTE: 1024,
  MAX_TTL_DAYS: 30,
  SECONDS_PER_DAY: 86_400,
  HIT_RATE_PERCENTAGE: 100,
} as const;
export class CacheService {
  private readonly redis: Redis;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    errors: 0,
    hitRate: 0,
  };
  private isAvailable = false;

  constructor() {
    this.redis = getRedisClient();
    this.checkAvailability();
  }

  /**
   * Validate cache key to prevent injection attacks
   */
  private validateKey(key: string): boolean {
    if (!key || key.length > CACHE_CONSTANTS.MAX_KEY_LENGTH) {
      logger.error(`Invalid cache key length: ${key?.length || 0}`);
      return false;
    }

    if (!CACHE_CONSTANTS.KEY_VALIDATION_REGEX.test(key)) {
      logger.error("Invalid cache key format");
      return false;
    }

    return true;
  }

  /**
   * Validate cache value size
   */
  private validateValue<T>(value: T): boolean {
    const serialized =
      typeof value === "string" ? value : JSON.stringify(value);
    const maxValueSize =
      CACHE_CONSTANTS.MAX_VALUE_SIZE_MB *
      CACHE_CONSTANTS.KILOBYTE *
      CACHE_CONSTANTS.KILOBYTE;
    if (serialized.length > maxValueSize) {
      logger.error(`Cache value too large: ${serialized.length} bytes`);
      return false;
    }
    return true;
  }

  /**
   * Check if Redis is available
   */
  private async checkAvailability(): Promise<void> {
    try {
      await this.redis.ping();
      this.isAvailable = true;
    } catch (error) {
      this.isAvailable = false;
      logger.warn(
        "Redis is not available, cache operations will be skipped",
        undefined,
        { error: String(error) }
      );
    }
  }

  /**
   * Get value from cache with type safety
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    if (!(this.isAvailable && this.validateKey(key))) {
      this.stats.misses++;
      return null;
    }

    try {
      const value = await this.redis.get(key);

      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();

      // Parse JSON if it's a valid JSON string
      try {
        return JSON.parse(value) as T;
      } catch {
        // Return as string if not valid JSON
        return value as T;
      }
    } catch (error) {
      this.stats.errors++;
      logger.error(`Cache get error: ${error}`);
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  async set<T = unknown>(
    key: string,
    value: T,
    ttl?: number
  ): Promise<boolean> {
    if (
      !(this.isAvailable && this.validateKey(key) && this.validateValue(value))
    ) {
      return false;
    }

    try {
      const serializedValue =
        typeof value === "string" ? value : JSON.stringify(value);

      if (ttl) {
        await this.redis.setex(key, ttl, serializedValue);
      } else {
        await this.redis.set(key, serializedValue);
      }

      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error(`Cache set error: ${error}`);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string | string[]): Promise<number> {
    if (!this.isAvailable) {
      return 0;
    }

    try {
      const keys = Array.isArray(key) ? key : [key];
      // Validate all keys
      if (!keys.every((k) => this.validateKey(k))) {
        return 0;
      }
      return await this.redis.del(...keys);
    } catch (error) {
      this.stats.errors++;
      logger.error(`Cache delete error: ${error}`);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!(this.isAvailable && this.validateKey(key))) {
      return false;
    }

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.stats.errors++;
      logger.error(`Cache exists error: ${error}`);
      return false;
    }
  }

  /**
   * Set expiration time for a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (
      !(this.isAvailable && this.validateKey(key)) ||
      seconds < 0 ||
      seconds > CACHE_CONSTANTS.SECONDS_PER_DAY * CACHE_CONSTANTS.MAX_TTL_DAYS
    ) {
      return false;
    }

    try {
      const result = await this.redis.expire(key, seconds);
      return result === 1;
    } catch (error) {
      this.stats.errors++;
      logger.error(`Cache expire error: ${error}`);
      return false;
    }
  }

  /**
   * Delete all keys matching a pattern using SCAN for better performance
   */
  async flushPattern(pattern: string): Promise<number> {
    if (!this.isAvailable) {
      return 0;
    }

    try {
      const stream = this.redis.scanStream({
        match: pattern,
        count: 100,
      });

      const keys: string[] = [];

      return await new Promise((resolve) => {
        stream.on("data", (batch) => {
          keys.push(...batch);
        });

        stream.on("end", async () => {
          if (keys.length === 0) {
            resolve(0);
            return;
          }

          try {
            const deleted = await this.redis.del(...keys);
            resolve(deleted);
          } catch (delError) {
            this.stats.errors++;
            logger.error(`Cache delete error for pattern: ${delError}`);
            resolve(0);
          }
        });

        stream.on("error", (error) => {
          this.stats.errors++;
          logger.error(`Cache scan error for pattern: ${error}`);
          resolve(0);
        });
      });
    } catch (error) {
      this.stats.errors++;
      logger.error(`Cache flush pattern error: ${error}`);
      return 0;
    }
  }

  /**
   * Get or set cache with fallback function
   */
  async getOrSet<T = unknown>(
    key: string,
    fallbackFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, execute fallback function
    try {
      const value = await fallbackFn();

      // Store in cache for next time
      await this.set(key, value, ttl);

      return value;
    } catch (error) {
      logger.error(`Error in getOrSet fallback: ${error}`);
      throw error;
    }
  }

  /**
   * Invalidate multiple cache entries
   */
  async invalidate(patterns: string[]): Promise<void> {
    if (!this.isAvailable) {
      return;
    }

    for (const pattern of patterns) {
      await this.flushPattern(pattern);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
      hitRate: 0,
    };
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    if (total > 0) {
      this.stats.hitRate =
        (this.stats.hits / total) * CACHE_CONSTANTS.HIT_RATE_PERCENTAGE;
    }
  }

  /**
   * Check if cache service is available
   */
  isHealthy(): boolean {
    return this.isAvailable;
  }

  /**
   * Perform health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testKey = CACHE_KEYS.health();
      const testValue = Date.now().toString();

      // Set test value
      await this.redis.set(testKey, testValue, "EX", 10);

      // Get test value
      const retrieved = await this.redis.get(testKey);

      // Delete test key
      await this.redis.del(testKey);

      return retrieved === testValue;
    } catch (error) {
      logger.error(`Redis health check failed: ${error}`);
      return false;
    }
  }

  /**
   * Close Redis connection gracefully
   */
  async close(): Promise<void> {
    await closeRedisConnection();
  }
}

// Singleton instance
let cacheServiceInstance: CacheService | null = null;

/**
 * Get singleton cache service instance
 */
export function getCacheService(): CacheService {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new CacheService();
  }
  return cacheServiceInstance;
}

/**
 * Helper functions for specific cache operations
 */
export const CacheHelpers = {
  // Session-specific cache operations
  session: {
    async get(sessionId: string) {
      const cache = getCacheService();
      return await cache.get(CACHE_KEYS.session(sessionId));
    },

    async set<T = unknown>(sessionId: string, data: T, status?: string) {
      const cache = getCacheService();
      let ttl: number;
      if (status === "ACTIVE") {
        ttl = TTL_CONFIG.session.active;
      } else if (status === "WAITING") {
        ttl = TTL_CONFIG.session.waiting;
      } else {
        ttl = TTL_CONFIG.session.default;
      }

      return await cache.set(CACHE_KEYS.session(sessionId), data, ttl);
    },

    async invalidate(sessionId: string) {
      const cache = getCacheService();
      await cache.invalidate([
        CACHE_KEYS.session(sessionId),
        `${CACHE_KEYS.sessionParticipants(sessionId)}*`,
        `${CACHE_KEYS.sessionSwipes(sessionId)}*`,
      ]);
    },
  },

  // User-specific cache operations
  user: {
    async get(userId: string) {
      const cache = getCacheService();
      return await cache.get(CACHE_KEYS.user(userId));
    },

    async set<T = unknown>(userId: string, data: T) {
      const cache = getCacheService();
      return await cache.set(
        CACHE_KEYS.user(userId),
        data,
        TTL_CONFIG.user.default
      );
    },

    async getPreferences(userId: string) {
      const cache = getCacheService();
      return await cache.get(CACHE_KEYS.userPreferences(userId));
    },

    async setPreferences<T = unknown>(userId: string, preferences: T) {
      const cache = getCacheService();
      return await cache.set(
        CACHE_KEYS.userPreferences(userId),
        preferences,
        TTL_CONFIG.user.preferences
      );
    },

    async invalidate(userId: string) {
      const cache = getCacheService();
      await cache.invalidate([
        CACHE_KEYS.user(userId),
        `${CACHE_KEYS.userSessions(userId)}*`,
        `${CACHE_KEYS.userPreferences(userId)}*`,
      ]);
    },
  },

  // Recipe-specific cache operations
  recipe: {
    async get(recipeId: string) {
      const cache = getCacheService();
      return await cache.get(CACHE_KEYS.recipe(recipeId));
    },

    async set<T = unknown>(recipeId: string, data: T) {
      const cache = getCacheService();
      return await cache.set(
        CACHE_KEYS.recipe(recipeId),
        data,
        TTL_CONFIG.recipe.detail
      );
    },

    async getList(filters?: string) {
      const cache = getCacheService();
      return await cache.get(CACHE_KEYS.recipeList(filters));
    },

    async setList<T = unknown>(data: T, filters?: string) {
      const cache = getCacheService();
      return await cache.set(
        CACHE_KEYS.recipeList(filters),
        data,
        TTL_CONFIG.recipe.list
      );
    },

    async invalidateAll() {
      const cache = getCacheService();
      await cache.flushPattern("recipe:*");
    },
  },
};
