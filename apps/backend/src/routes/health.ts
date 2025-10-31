import { Hono } from "hono";
import { getDB } from "../config/database";
import { getCacheService } from "../services/cache";

const health = new Hono();

/**
 * Basic health check endpoint
 */
health.get("/", async (c) =>
  c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
);

/**
 * Detailed health check with all service statuses
 */
health.get("/detailed", async (c) => {
  const healthStatus: Record<string, any> = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {},
  };

  // Check MongoDB
  try {
    const db = getDB();
    await db.command({ ping: 1 });
    healthStatus.services.mongodb = {
      status: "healthy",
      responseTime: 0,
    };
  } catch (error) {
    healthStatus.services.mongodb = {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
    };
    healthStatus.status = "degraded";
  }

  // Check Redis
  const cache = getCacheService();
  const redisStartTime = Date.now();

  try {
    const isHealthy = await cache.healthCheck();
    const responseTime = Date.now() - redisStartTime;

    healthStatus.services.redis = {
      status: isHealthy ? "healthy" : "unhealthy",
      responseTime,
      stats: cache.getStats(),
    };

    if (!isHealthy) {
      healthStatus.status = "degraded";
    }
  } catch (error) {
    healthStatus.services.redis = {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
      stats: cache.getStats(),
    };
    healthStatus.status = "degraded";
  }

  // Memory usage
  const memoryUsage = process.memoryUsage();
  const healthStatusOffset = 1024;
  healthStatus.memory = {
    rss: `${Math.round(memoryUsage.rss / healthStatusOffset)}MB`,
    heapTotal: `${Math.round(memoryUsage.heapTotal / healthStatusOffset)}MB`,
    heapUsed: `${Math.round(memoryUsage.heapUsed / healthStatusOffset)}MB`,
    external: `${Math.round(memoryUsage.external / healthStatusOffset)}MB`,
  };

  // Environment info
  healthStatus.environment = {
    nodeVersion: process.version,
    platform: process.platform,
    env: process.env.NODE_ENV || "development",
  };

  return c.json(healthStatus, healthStatus.status === "healthy" ? 200 : 503);
});

/**
 * Redis-specific health check
 */
health.get("/redis", async (c) => {
  const cache = getCacheService();

  try {
    const startTime = Date.now();
    const isHealthy = await cache.healthCheck();
    const responseTime = Date.now() - startTime;

    const stats = cache.getStats();

    return c.json(
      {
        status: isHealthy ? "healthy" : "unhealthy",
        responseTime,
        stats: {
          ...stats,
          hitRate: `${stats.hitRate.toFixed(2)}%`,
        },
      },
      isHealthy ? 200 : 503
    );
  } catch (error) {
    return c.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      503
    );
  }
});

/**
 * MongoDB-specific health check
 */
health.get("/mongodb", async (c) => {
  try {
    const startTime = Date.now();
    const db = getDB();
    await db.command({ ping: 1 });
    const responseTime = Date.now() - startTime;

    // Get database statistics
    const stats = await db.stats();

    return c.json({
      status: "healthy",
      responseTime,
      stats: {
        collections: stats.collections,
        documents: stats.objects,
        dataSize: `${Math.round(stats.dataSize / 1024 / 1024)}MB`,
        indexSize: `${Math.round(stats.indexSize / 1024 / 1024)}MB`,
      },
    });
  } catch (error) {
    return c.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      503
    );
  }
});

/**
 * Readiness check for Kubernetes/Docker
 */
health.get("/ready", async (c) => {
  const cache = getCacheService();

  try {
    // Check if all critical services are ready
    const db = getDB();
    await db.command({ ping: 1 });

    const redisHealthy = await cache.healthCheck();

    if (redisHealthy) {
      return c.json({ ready: true });
    }
    return c.json({ ready: false, reason: "Redis not ready" }, 503);
  } catch (error) {
    return c.json(
      {
        ready: false,
        reason: error instanceof Error ? error.message : "Services not ready",
      },
      503
    );
  }
});

/**
 * Liveness check for Kubernetes/Docker
 */
health.get("/live", (c) => {
  // Simple liveness check - if the server can respond, it's alive
  return c.json({ alive: true });
});

export default health;
