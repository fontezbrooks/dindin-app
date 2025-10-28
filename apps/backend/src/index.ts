import { serve } from "bun";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { connectDB } from "./config/database";
import { authMiddleware } from "./middleware/auth";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import recipeRoutes from "./routes/recipes";
import restaurantRoutes from "./routes/restaurants";
import sessionRoutes from "./routes/sessions";
import { setupWebSocket } from "./websocket/server";

const app = new Hono();
const PORT = process.env.PORT || 3000;

// Global middleware
app.use("*", logger());
app.use("*", cors());

// Health check
app.get("/health", (c) => c.json({ status: "healthy", timestamp: new Date().toISOString() }));

// Public routes
app.route("/api/auth", authRoutes);

// Protected routes
app.use("/api/*", authMiddleware);
app.route("/api/users", userRoutes);
app.route("/api/recipes", recipeRoutes);
app.route("/api/restaurants", restaurantRoutes);
app.route("/api/sessions", sessionRoutes);

// Initialize database connection
await connectDB();

// Create server with WebSocket support
const server = serve({
  port: PORT,
  fetch: app.fetch,
  websocket: setupWebSocket(),
});

console.log(`🚀 Server running on http://localhost:${PORT}`);

export default app;
