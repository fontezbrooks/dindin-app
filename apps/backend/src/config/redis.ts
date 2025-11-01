import Redis, { type Redis as RedisClient, type RedisOptions } from "ioredis";
import { ConsoleTransport, LogLayer } from "loglayer";

// Redis configuration with sensible defaults
const log = new LogLayer({
  transport: new ConsoleTransport({
    logger: console,
  }),
});

const minMax = {
  min: 100,
  max: 3000,
};
export const redisConfig: RedisOptions = {
  host: process.env.REDIS_HOST || "",
  port: Number.parseInt(process.env.REDIS_PORT || "6379", 10),
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    // Exponential backoff with max delay of 3 seconds
    const delay = Math.min(times * minMax.min, minMax.max);
    log.warn(`Redis connection attempt ${times}, retrying in ${delay}ms`);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetErrors = ["READONLY", "ECONNREFUSED", "ETIMEDOUT"];
    if (targetErrors.some((targetError) => err.message.includes(targetError))) {
      return true; // Reconnect on these errors
    }
    return false;
  },
  enableReadyCheck: true,
  lazyConnect: false,
  showFriendlyErrorStack: process.env.NODE_ENV !== "production",
};

// TTL configurations for different cache types (in seconds)
export const TTL_CONFIG = {
  // Session data - shorter TTL as it's frequently updated
  session: {
    default: 300, // 5 minutes
    active: 60, // 1 minute for active sessions
    waiting: 600, // 10 minutes for waiting sessions
  },
  // User data - moderate TTL
  user: {
    default: 600, // 10 minutes
    profile: 1800, // 30 minutes for profile data
    preferences: 3600, // 1 hour for preferences
  },
  // Swipe data - short TTL for real-time updates
  swipe: {
    default: 30, // 30 seconds
    batch: 60, // 1 minute for batch swipes
  },
  // Recipe and restaurant data - longer TTL as they change infrequently
  recipe: {
    default: 3600, // 1 hour
    list: 1800, // 30 minutes for lists
    detail: 7200, // 2 hours for detailed views
  },
  restaurant: {
    default: 3600, // 1 hour
    list: 1800, // 30 minutes for lists
    detail: 7200, // 2 hours for detailed views
  },
  // API rate limiting
  rateLimit: {
    default: 60, // 1 minute
  },
};

// Cache key prefixes for consistent naming
export const CACHE_KEYS = {
  // Session keys
  session: (id: string) => `session:${id}`,
  sessionByCode: (code: string) => `session:code:${code}`,
  sessionParticipants: (sessionId: string) =>
    `session:${sessionId}:participants`,
  sessionSwipes: (sessionId: string) => `session:${sessionId}:swipes`,

  // User keys
  user: (id: string) => `user:${id}`,
  userByClerkId: (clerkId: string) => `user:clerk:${clerkId}`,
  userSessions: (userId: string) => `user:${userId}:sessions`,
  userPreferences: (userId: string) => `user:${userId}:preferences`,

  // Swipe keys
  swipe: (sessionId: string, userId: string) => `swipe:${sessionId}:${userId}`,
  swipeResults: (sessionId: string) => `swipe:${sessionId}:results`,

  // Recipe keys
  recipe: (id: string) => `recipe:${id}`,
  recipeList: (filters?: string) => `recipe:list:${filters || "all"}`,

  // Restaurant keys
  restaurant: (id: string) => `restaurant:${id}`,
  restaurantList: (filters?: string) => `restaurant:list:${filters || "all"}`,

  // Rate limiting keys
  rateLimit: (identifier: string) => `rate:${identifier}`,

  // Health check
  health: () => "health:check",
};

// Create Redis client singleton
let redisClient: RedisClient | null = null;

export function getRedisClient(): RedisClient {
  if (!redisClient) {
    redisClient = new Redis(redisConfig);

    // Event handlers
    redisClient.on("connect", () => {
      log.info("🔗 Redis client connected");
    });

    redisClient.on("ready", () => {
      log.info("✅ Redis client ready");
    });

    redisClient.on("error", (error) => {
      log.error(`"❌ Redis client error:" ${error}`);
    });

    redisClient.on("close", () => {
      log.warn("🔌 Redis connection closed");
    });

    redisClient.on("reconnecting", (delay: number) => {
      log.info(`🔄 Redis reconnecting in ${delay}ms`);
    });
  }

  return redisClient;
}

export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    log.info("👋 Redis connection closed gracefully");
  }
}
