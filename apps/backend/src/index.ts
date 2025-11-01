import { serve } from "bun";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { closeDB, connectDB } from "./config/database";
import { closeRedisConnection, getRedisClient } from "./config/redis";
import { authMiddleware } from "./middleware/auth";
import {
  cleanupRateLimiter,
  enhancedRateLimitMiddleware,
} from "./middleware/rateLimiter";
import authRoutes from "./routes/auth";
import healthRoutes from "./routes/health";
import recipeRoutes from "./routes/recipes";
import restaurantRoutes from "./routes/restaurants";
import sessionRoutes from "./routes/sessions";
import userRoutes from "./routes/users";
import { getCacheService } from "./services/cache";
import { setupWebSocket } from "./websocket/server";

const app = new Hono();
const PORT = process.env.PORT;
const HOST = process.env.HOST || "";
const basePath = process.env.EXPO_PUBLIC_API_URL || "";

// Global middleware
app.use("*", logger());

// CORS configuration with specific origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:3000", "http://localhost:8081"];

app.use(
  "*",
  cors({
    origin: (origin) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return "";
      }
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return origin;
      }
      // For development, also allow any localhost origin
      if (
        process.env.NODE_ENV === "development" &&
        origin.includes("localhost")
      ) {
        return origin;
      }
      // Reject other origins
      return null;
    },
    credentials: true,
  })
);
app.basePath(basePath);

// Enhanced rate limiting middleware with dual-layer protection
app.use(
  "*",
  enhancedRateLimitMiddleware({
    limit: Number.parseInt(process.env.API_RATE_LIMIT || "100", 10),
    window: 60, // 1 minute window
  })
);

// Health check routes (public)
app.route("/health", healthRoutes);

// Public routes
app.route("/api/auth", authRoutes);

// Protected routes
app.use("/api/*", authMiddleware);
app.route("/api/users", userRoutes);
app.route("/api/recipes", recipeRoutes);
app.route("/api/restaurants", restaurantRoutes);
app.route("/api/sessions", sessionRoutes);

// Initialize services
async function initializeServices() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log("✅ MongoDB connected");

    // Initialize Redis
    const redis = getRedisClient();
    await redis.ping();
    console.log("✅ Redis connected");

    // Initialize cache service
    const cache = getCacheService();
    const isHealthy = await cache.healthCheck();
    if (isHealthy) {
      console.log("✅ Cache service initialized");
    } else {
      console.log("⚠️ Cache service running in degraded mode");
    }
  } catch (error) {
    console.error("❌ Failed to initialize services:", error);
    process.exit(1);
  }
}

// Initialize all services
await initializeServices();

// Create server with WebSocket support
const server = serve({
  port: PORT,
  hostname: HOST,
  fetch: app.fetch,
  websocket: setupWebSocket(),
});

console.log(`🚀 Server running on http://${HOST}:${PORT}`);

// Graceful shutdown handler
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");

  try {
    cleanupRateLimiter();
    await closeRedisConnection();
    await closeDB();
    console.log("👋 All connections closed");
  } catch (error) {
    console.error("Error during shutdown:", error);
  }

  process.exit(0);
});

export default app;
