import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { deflate, inflate } from "node:zlib";
import type { Cluster, Redis as RedisClient } from "ioredis";
import { ConsoleTransport, LogLayer } from "loglayer";
import { withRedis } from "../config/redis-pool";

const deflateAsync = promisify(deflate);
const inflateAsync = promisify(inflate);

const log = new LogLayer({
  transport: new ConsoleTransport({
    logger: console,
  }),
});

// Encryption configuration
type EncryptionConfig = {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  enabled: boolean;
};

// Compression configuration
type CompressionConfig = {
  enabled: boolean;
  threshold: number; // Minimum size in bytes to compress
  level: number; // Compression level 1-9
};

// Cache options for individual operations
export type CacheOptions = {
  ttl?: number;
  encrypt?: boolean;
  compress?: boolean;
  tags?: string[];
};

// Cache statistics
type CacheStats = {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  avgResponseTime: number;
  compressionRatio: number;
};

export class EnhancedCacheService {
  private encryptionKey: Buffer;
  private encryptionConfig: EncryptionConfig;
  private compressionConfig: CompressionConfig;
  private stats: CacheStats;
  private metricsInterval?: NodeJS.Timeout;

  constructor() {
    // Initialize encryption
    this.encryptionConfig = {
      algorithm: "aes-256-gcm",
      keyLength: 32,
      ivLength: 16,
      enabled: process.env.CACHE_ENCRYPTION_ENABLED === "true",
    };

    // Generate or load encryption key
    const keyString = process.env.CACHE_ENCRYPTION_KEY;
    if (this.encryptionConfig.enabled && !keyString) {
      throw new Error(
        "Cache encryption is enabled but CACHE_ENCRYPTION_KEY is not set"
      );
    }
    this.encryptionKey = keyString
      ? Buffer.from(keyString, "hex")
      : randomBytes(this.encryptionConfig.keyLength);

    // Initialize compression
    this.compressionConfig = {
      enabled: process.env.CACHE_COMPRESSION_ENABLED !== "false",
      threshold: Number.parseInt(
        process.env.CACHE_COMPRESSION_THRESHOLD || "1024",
        10
      ),
      level: Number.parseInt(process.env.CACHE_COMPRESSION_LEVEL || "6", 10),
    };

    // Initialize stats
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      avgResponseTime: 0,
      compressionRatio: 0,
    };

    // Start metrics collection
    this.startMetricsCollection();
  }

  private startMetricsCollection(): void {
    if (process.env.CACHE_METRICS_ENABLED === "true") {
      this.metricsInterval = setInterval(() => {
        log.info("Cache statistics", this.stats);
        // Reset some stats
        this.stats = { ...this.stats, avgResponseTime: 0 };
      }, 60_000); // Log every minute
    }
  }

  private async encrypt(
    data: string
  ): Promise<{ encrypted: string; iv: string; authTag: string }> {
    if (!this.encryptionConfig.enabled) {
      return { encrypted: data, iv: "", authTag: "" };
    }

    const iv = randomBytes(this.encryptionConfig.ivLength);
    const cipher = createCipheriv(
      this.encryptionConfig.algorithm,
      this.encryptionKey,
      iv
    );

    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = (cipher as any).getAuthTag().toString("hex");

    return {
      encrypted,
      iv: iv.toString("hex"),
      authTag,
    };
  }

  private async decrypt(
    encrypted: string,
    iv: string,
    authTag: string
  ): Promise<string> {
    if (!(this.encryptionConfig.enabled && iv && authTag)) {
      return encrypted;
    }

    const decipher = createDecipheriv(
      this.encryptionConfig.algorithm,
      this.encryptionKey,
      Buffer.from(iv, "hex")
    );

    (decipher as any).setAuthTag(Buffer.from(authTag, "hex"));

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  private async compress(data: string): Promise<string> {
    if (
      !this.compressionConfig.enabled ||
      data.length < this.compressionConfig.threshold
    ) {
      return data;
    }

    const startSize = Buffer.byteLength(data);
    const compressed = await deflateAsync(data, {
      level: this.compressionConfig.level,
    });
    const compressedString = compressed.toString("base64");
    const endSize = Buffer.byteLength(compressedString);

    // Update compression ratio
    const ratio = 1 - endSize / startSize;
    this.stats.compressionRatio = (this.stats.compressionRatio + ratio) / 2;

    log.debug(
      `Compressed: ${startSize} bytes → ${endSize} bytes (${(ratio * 100).toFixed(1)}% reduction)`
    );

    return compressedString;
  }

  private async decompress(data: string): Promise<string> {
    if (!this.compressionConfig.enabled) {
      return data;
    }

    // Check if data is compressed (base64 pattern)
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
      return data;
    }

    try {
      const buffer = Buffer.from(data, "base64");
      const decompressed = await inflateAsync(buffer);
      return decompressed.toString("utf8");
    } catch {
      // Data wasn't compressed, return as-is
      return data;
    }
  }

  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const startTime = Date.now();

    try {
      const result = await withRedis(async (client) => {
        const data = await client.get(key);
        if (!data) {
          this.stats.misses++;
          return null;
        }

        this.stats.hits++;
        return data;
      });

      if (!result) return null;

      // Parse stored metadata
      const parsed = JSON.parse(result);
      const { value, iv, authTag, compressed, metadata } = parsed;

      // Decompress if needed
      let processedValue = value;
      if (compressed) {
        processedValue = await this.decompress(processedValue);
      }

      // Decrypt if needed
      if (iv && authTag) {
        processedValue = await this.decrypt(processedValue, iv, authTag);
      }

      // Parse JSON value
      const finalValue = JSON.parse(processedValue) as T;

      // Update stats
      const responseTime = Date.now() - startTime;
      this.stats.avgResponseTime =
        (this.stats.avgResponseTime + responseTime) / 2;

      log.debug(`Cache hit for key: ${key} (${responseTime}ms)`);
      return finalValue;
    } catch (error) {
      this.stats.errors++;
      log.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<boolean> {
    const startTime = Date.now();

    try {
      const {
        ttl = 300, // Default 5 minutes
        encrypt = this.shouldEncrypt(key),
        compress = true,
        tags = [],
      } = options;

      // Serialize value
      let serialized = JSON.stringify(value);

      // Compress if needed
      const compressed = compress && (await this.compress(serialized));
      if (compressed !== serialized) {
        serialized = compressed;
      }

      // Encrypt if needed
      let encryptionData = { encrypted: serialized, iv: "", authTag: "" };
      if (encrypt) {
        encryptionData = await this.encrypt(serialized);
      }

      // Prepare storage object
      const storageObject = {
        value: encryptionData.encrypted,
        iv: encryptionData.iv,
        authTag: encryptionData.authTag,
        compressed: compressed !== serialized,
        metadata: {
          tags,
          createdAt: Date.now(),
          ttl,
        },
      };

      // Store in Redis
      const success = await withRedis(async (client) => {
        const result = await client.setex(
          key,
          ttl,
          JSON.stringify(storageObject)
        );

        // Store tags for invalidation
        if (tags.length > 0) {
          const pipeline = (client as RedisClient).pipeline();
          for (const tag of tags) {
            pipeline.sadd(`tag:${tag}`, key);
            pipeline.expire(`tag:${tag}`, ttl);
          }
          await pipeline.exec();
        }

        return result === "OK";
      });

      if (success) {
        this.stats.sets++;
        const responseTime = Date.now() - startTime;
        this.stats.avgResponseTime =
          (this.stats.avgResponseTime + responseTime) / 2;
        log.debug(`Cache set for key: ${key} (${responseTime}ms)`);
      }

      return success;
    } catch (error) {
      this.stats.errors++;
      log.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await withRedis(async (client) => {
        const deleted = await client.del(key);
        return deleted > 0;
      });

      if (result) {
        this.stats.deletes++;
        log.debug(`Cache deleted for key: ${key}`);
      }

      return result;
    } catch (error) {
      this.stats.errors++;
      log.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async deleteByPattern(pattern: string): Promise<number> {
    try {
      return await withRedis(async (client) => {
        const keys = await this.scanKeys(client, pattern);
        if (keys.length === 0) return 0;

        const pipeline = (client as RedisClient).pipeline();
        for (const key of keys) {
          pipeline.del(key);
        }

        const results = await pipeline.exec();
        const deletedCount = results?.filter((r) => r[0] === null).length || 0;

        this.stats.deletes += deletedCount;
        log.debug(`Deleted ${deletedCount} keys matching pattern: ${pattern}`);

        return deletedCount;
      });
    } catch (error) {
      this.stats.errors++;
      log.error(`Cache delete by pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  async invalidateByTag(tag: string): Promise<number> {
    try {
      return await withRedis(async (client) => {
        // Get all keys with this tag
        const keys = await client.smembers(`tag:${tag}`);
        if (keys.length === 0) return 0;

        // Delete all keys
        const pipeline = (client as RedisClient).pipeline();
        for (const key of keys) {
          pipeline.del(key);
        }
        pipeline.del(`tag:${tag}`);

        const results = await pipeline.exec();
        const deletedCount = keys.length;

        this.stats.deletes += deletedCount;
        log.debug(`Invalidated ${deletedCount} keys with tag: ${tag}`);

        return deletedCount;
      });
    } catch (error) {
      this.stats.errors++;
      log.error(`Cache invalidate by tag error for ${tag}:`, error);
      return 0;
    }
  }

  async flush(): Promise<boolean> {
    try {
      await withRedis(async (client) => {
        await client.flushdb();
      });
      log.warn("Cache flushed - all data cleared");
      return true;
    } catch (error) {
      this.stats.errors++;
      log.error("Cache flush error:", error);
      return false;
    }
  }

  private async scanKeys(
    client: RedisClient | Cluster,
    pattern: string
  ): Promise<string[]> {
    const keys: string[] = [];
    let cursor = "0";

    do {
      const [nextCursor, batch] = await client.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100
      );
      keys.push(...batch);
      cursor = nextCursor;
    } while (cursor !== "0");

    return keys;
  }

  private shouldEncrypt(key: string): boolean {
    // Encrypt sensitive data by default
    const sensitivePatterns = [
      "user:",
      "session:",
      "auth:",
      "token:",
      "password:",
      "secret:",
      "key:",
      "credential:",
    ];

    return sensitivePatterns.some((pattern) => key.startsWith(pattern));
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  stopMetrics(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }
  }
}

// Singleton instance
let cacheInstance: EnhancedCacheService | null = null;

export function getEnhancedCache(): EnhancedCacheService {
  if (!cacheInstance) {
    cacheInstance = new EnhancedCacheService();
  }
  return cacheInstance;
}

export function closeCacheService(): void {
  if (cacheInstance) {
    cacheInstance.stopMetrics();
    cacheInstance = null;
  }
}
