import Redis, {
  type Cluster,
  type ClusterOptions,
  type Redis as RedisClient,
} from "ioredis";
import { ConsoleTransport, LogLayer } from "loglayer";

const log = new LogLayer({
  transport: new ConsoleTransport({
    logger: console,
  }),
});

// Redis connection pool configuration
export interface RedisPoolConfig {
  mode: "single" | "cluster" | "sentinel";
  maxConnections: number;
  minConnections: number;
  acquireTimeoutMillis: number;
  idleTimeoutMillis: number;
  evictionRunIntervalMillis: number;
  enableOfflineQueue: boolean;
  enableReadyCheck: boolean;
  maxRetriesPerRequest: number;
}

const DEFAULT_POOL_CONFIG: RedisPoolConfig = {
  mode:
    (process.env.REDIS_MODE as "single" | "cluster" | "sentinel") || "single",
  maxConnections: Number.parseInt(
    process.env.REDIS_MAX_CONNECTIONS || "10",
    10
  ),
  minConnections: Number.parseInt(process.env.REDIS_MIN_CONNECTIONS || "2", 10),
  acquireTimeoutMillis: 30_000, // 30 seconds
  idleTimeoutMillis: 30_000, // 30 seconds
  evictionRunIntervalMillis: 10_000, // 10 seconds
  enableOfflineQueue: true,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
};

// Connection pool for Redis clients
class RedisConnectionPool {
  private pool: RedisClient[] = [];
  private activeConnections = 0;
  private cluster?: Cluster;
  private config: RedisPoolConfig;
  private isShuttingDown = false;

  constructor(config: RedisPoolConfig = DEFAULT_POOL_CONFIG) {
    this.config = config;
    this.initializePool();
  }

  private async initializePool(): Promise<void> {
    if (this.config.mode === "cluster") {
      this.initializeCluster();
    } else {
      // Initialize minimum connections for single/sentinel mode
      for (let i = 0; i < this.config.minConnections; i++) {
        await this.createConnection();
      }
    }

    // Start eviction timer
    setInterval(
      () => this.evictIdleConnections(),
      this.config.evictionRunIntervalMillis
    );
  }

  private initializeCluster(): void {
    const clusterOptions: ClusterOptions = {
      clusterRetryStrategy: (times) => {
        const delay = Math.min(times * 100, 3000);
        log.warn(
          `Redis cluster retry attempt ${times}, retrying in ${delay}ms`
        );
        return delay;
      },
      enableOfflineQueue: this.config.enableOfflineQueue,
      enableReadyCheck: this.config.enableReadyCheck,
      maxRetriesPerRequest: this.config.maxRetriesPerRequest,
      showFriendlyErrorStack: process.env.NODE_ENV !== "production",
      redisOptions: {
        password: process.env.REDIS_PASSWORD,
        connectTimeout: 10_000,
        commandTimeout: 5000,
      },
      // Connection pool settings for cluster
      natMap: process.env.REDIS_NAT_MAP
        ? JSON.parse(process.env.REDIS_NAT_MAP)
        : undefined,
      scaleReads: "slave" as const, // Read from slaves when possible
      slotsRefreshTimeout: 10_000,
      slotsRefreshInterval: 5000,
    };

    // Parse cluster nodes from environment
    const clusterNodes = process.env.REDIS_CLUSTER_NODES
      ? process.env.REDIS_CLUSTER_NODES.split(",").map((node) => {
          const [host, port] = node.trim().split(":");
          return { host, port: Number.parseInt(port, 10) };
        })
      : [
          {
            host: process.env.REDIS_HOST || "localhost",
            port: Number.parseInt(process.env.REDIS_PORT || "6379", 10),
          },
        ];

    this.cluster = new Redis.Cluster(clusterNodes, clusterOptions);

    // Cluster event handlers
    this.cluster.on("connect", () => log.info("🔗 Redis cluster connected"));
    this.cluster.on("ready", () => log.info("✅ Redis cluster ready"));
    this.cluster.on("error", (error) =>
      log.error(`❌ Redis cluster error: ${error.message}`)
    );
    this.cluster.on("close", () =>
      log.warn("🔌 Redis cluster connection closed")
    );
    this.cluster.on("reconnecting", () =>
      log.info("🔄 Redis cluster reconnecting")
    );
    this.cluster.on("node error", (error, node) => {
      log.error(`❌ Redis cluster node error [${node}]: ${error.message}`);
    });
  }

  private async createConnection(): Promise<RedisClient> {
    const options = {
      host: process.env.REDIS_HOST || "localhost",
      port: Number.parseInt(process.env.REDIS_PORT || "6379", 10),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: this.config.maxRetriesPerRequest,
      enableReadyCheck: this.config.enableReadyCheck,
      enableOfflineQueue: this.config.enableOfflineQueue,
      connectTimeout: 10_000,
      commandTimeout: 5000,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 100, 3000);
        log.warn(
          `Redis connection retry attempt ${times}, retrying in ${delay}ms`
        );
        return delay;
      },
      reconnectOnError: (err: Error) => {
        const targetErrors = ["READONLY", "ECONNREFUSED", "ETIMEDOUT"];
        return targetErrors.some((e) => err.message.includes(e));
      },
      showFriendlyErrorStack: process.env.NODE_ENV !== "production",
    };

    const client = new Redis(options);

    // Track connection lifecycle
    const connectionId = Date.now();
    (client as any)._connectionId = connectionId;
    (client as any)._lastUsed = Date.now();
    (client as any)._inUse = false;

    // Event handlers
    client.on("connect", () =>
      log.debug(`🔗 Redis connection ${connectionId} established`)
    );
    client.on("ready", () =>
      log.debug(`✅ Redis connection ${connectionId} ready`)
    );
    client.on("error", (error) =>
      log.error(`❌ Redis connection ${connectionId} error: ${error.message}`)
    );
    client.on("close", () => {
      log.debug(`🔌 Redis connection ${connectionId} closed`);
      this.removeConnection(client);
    });

    this.pool.push(client);
    return client;
  }

  private removeConnection(client: RedisClient): void {
    const index = this.pool.indexOf(client);
    if (index > -1) {
      this.pool.splice(index, 1);
      this.activeConnections--;
    }
  }

  private evictIdleConnections(): void {
    if (this.isShuttingDown) return;

    const now = Date.now();
    const idleConnections = this.pool.filter((client) => {
      const meta = client as any;
      return (
        !meta._inUse &&
        now - meta._lastUsed > this.config.idleTimeoutMillis &&
        this.pool.length > this.config.minConnections
      );
    });

    for (const client of idleConnections) {
      log.debug(`Evicting idle connection ${(client as any)._connectionId}`);
      client.quit();
      this.removeConnection(client);
    }
  }

  async acquire(): Promise<RedisClient | Cluster> {
    // For cluster mode, always return the cluster instance
    if (this.config.mode === "cluster" && this.cluster) {
      return this.cluster;
    }

    // Find an available connection
    const availableClient = this.pool.find((client) => !(client as any)._inUse);

    if (availableClient) {
      (availableClient as any)._inUse = true;
      (availableClient as any)._lastUsed = Date.now();
      this.activeConnections++;
      return availableClient;
    }

    // Create new connection if under limit
    if (this.pool.length < this.config.maxConnections) {
      const newClient = await this.createConnection();
      (newClient as any)._inUse = true;
      (newClient as any)._lastUsed = Date.now();
      this.activeConnections++;
      return newClient;
    }

    // Wait for available connection
    const startTime = Date.now();
    while (Date.now() - startTime < this.config.acquireTimeoutMillis) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const client = this.pool.find((c) => !(c as any)._inUse);
      if (client) {
        (client as any)._inUse = true;
        (client as any)._lastUsed = Date.now();
        this.activeConnections++;
        return client;
      }
    }

    throw new Error("Failed to acquire Redis connection: timeout");
  }

  release(client: RedisClient | Cluster): void {
    // Cluster connections don't need to be released
    if (client === this.cluster) {
      return;
    }

    const redisClient = client as RedisClient;
    if ((redisClient as any)._inUse) {
      (redisClient as any)._inUse = false;
      (redisClient as any)._lastUsed = Date.now();
      this.activeConnections--;
    }
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    if (this.cluster) {
      await this.cluster.quit();
      log.info("👋 Redis cluster connection closed gracefully");
    }

    // Close all pooled connections
    await Promise.all(this.pool.map((client) => client.quit()));
    this.pool = [];
    this.activeConnections = 0;
    log.info("👋 Redis connection pool closed gracefully");
  }

  getPoolStats() {
    return {
      mode: this.config.mode,
      totalConnections: this.pool.length,
      activeConnections: this.activeConnections,
      idleConnections: this.pool.length - this.activeConnections,
      maxConnections: this.config.maxConnections,
      minConnections: this.config.minConnections,
    };
  }
}

// Singleton instance
let poolInstance: RedisConnectionPool | null = null;

export function getRedisPool(): RedisConnectionPool {
  if (!poolInstance) {
    poolInstance = new RedisConnectionPool();
  }
  return poolInstance;
}

export async function closeRedisPool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.shutdown();
    poolInstance = null;
  }
}

// Helper function for executing Redis commands with automatic connection management
export async function withRedis<T>(
  operation: (client: RedisClient | Cluster) => Promise<T>
): Promise<T> {
  const pool = getRedisPool();
  const client = await pool.acquire();

  try {
    return await operation(client);
  } finally {
    pool.release(client);
  }
}
