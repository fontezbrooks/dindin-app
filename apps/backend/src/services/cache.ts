import type { Redis } from "ioredis";
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
   * Check if Redis is available
   */
  private async checkAvailability(): Promise<void> {
    try {
      await this.redis.ping();
      this.isAvailable = true;
    } catch (error) {
      this.isAvailable = false;
      console.warn("Redis is not available, cache operations will be skipped");
    }
  }

  /**
   * Get value from cache with type safety
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isAvailable) {
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
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  async set<T = any>(key: string, value: T, ttl?: number): Promise<boolean> {
    if (!this.isAvailable) {
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
      console.error(`Cache set error for key ${key}:`, error);
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
      return await this.redis.del(...keys);
    } catch (error) {
      this.stats.errors++;
      console.error(`Cache delete error for key(s) ${key}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.stats.errors++;
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set expiration time for a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }

    try {
      const result = await this.redis.expire(key, seconds);
      return result === 1;
    } catch (error) {
      this.stats.errors++;
      console.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete all keys matching a pattern
   */
  async flushPattern(pattern: string): Promise<number> {
    if (!this.isAvailable) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      return await this.redis.del(...keys);
    } catch (error) {
      this.stats.errors++;
      console.error(`Cache flush pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Get or set cache with fallback function
   */
  async getOrSet<T = any>(
    key: string,
    fallbackFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
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
      console.error(`Error in getOrSet fallback for key ${key}:`, error);
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
      this.stats.hitRate = (this.stats.hits / total) * 100;
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
      console.error("Redis health check failed:", error);
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
      return cache.get(CACHE_KEYS.session(sessionId));
    },

    async set(sessionId: string, data: any, status?: string) {
      const cache = getCacheService();
      const ttl =
        status === "ACTIVE"
          ? TTL_CONFIG.session.active
          : status === "WAITING"
            ? TTL_CONFIG.session.waiting
            : TTL_CONFIG.session.default;

      return cache.set(CACHE_KEYS.session(sessionId), data, ttl);
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
      return cache.get(CACHE_KEYS.user(userId));
    },

    async set(userId: string, data: any) {
      const cache = getCacheService();
      return cache.set(CACHE_KEYS.user(userId), data, TTL_CONFIG.user.default);
    },

    async getPreferences(userId: string) {
      const cache = getCacheService();
      return cache.get(CACHE_KEYS.userPreferences(userId));
    },

    async setPreferences(userId: string, preferences: any) {
      const cache = getCacheService();
      return cache.set(
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
      return cache.get(CACHE_KEYS.recipe(recipeId));
    },

    async set(recipeId: string, data: any) {
      const cache = getCacheService();
      return cache.set(
        CACHE_KEYS.recipe(recipeId),
        data,
        TTL_CONFIG.recipe.detail
      );
    },

    async getList(filters?: string) {
      const cache = getCacheService();
      return cache.get(CACHE_KEYS.recipeList(filters));
    },

    async setList(data: any, filters?: string) {
      const cache = getCacheService();
      return cache.set(
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
