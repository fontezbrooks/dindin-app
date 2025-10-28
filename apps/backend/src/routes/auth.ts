import { Hono } from "hono";
import { getDB } from "../config/database";
import { User, SubscriptionPlan } from "../types";

const authRoutes = new Hono();

// Webhook endpoint for Clerk user events (for future implementation)
authRoutes.post("/webhook", async (c) => {
  // TODO: Implement Clerk webhook verification
  // This will handle user.created, user.updated, user.deleted events
  return c.json({ message: "Webhook endpoint - to be implemented" });
});

// Verify token and get user info
authRoutes.get("/verify", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "No token provided" }, 401);
    }

    // This endpoint can be used by the frontend to verify authentication
    // The actual verification happens in the middleware
    return c.json({
      authenticated: true,
      message: "Token is valid",
    });
  } catch (error) {
    return c.json({ error: "Invalid token" }, 401);
  }
});

export default authRoutes;