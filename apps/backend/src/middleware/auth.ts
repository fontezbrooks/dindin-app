import { verifyToken } from "@clerk/backend";
import type { Context, Next } from "hono";
import { logger } from "../../../../packages/logger";
import { getRequestContext } from "../../../../packages/logger/middleware";
import { getDB } from "../config/database";
import { HTTPStatus, SubscriptionPlan, type User } from "../types";

export async function authMiddleware(c: Context, next: Next) {
  const requestContext = getRequestContext(c);

  try {
    const authHeader = c.req.header("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      logger.authAttempt(false, requestContext, "No Bearer token provided");
      return c.json(
        { error: "Unauthorized - No token provided" },
        HTTPStatus.UNAUTHORIZED
      );
    }

    const token = authHeader.substring(HTTPStatus.SUBSTRING);
    const secretKey = process.env.CLERK_SECRET_KEY;

    if (!secretKey) {
      logger.error(
        "CLERK_SECRET_KEY not configured",
        undefined,
        requestContext
      );
      return c.json(
        { error: "Server configuration error" },
        HTTPStatus.INTERNAL_SERVER_ERROR
      );
    }

    // Verify the token with Clerk
    const payload = await verifyToken(token, {
      secretKey,
    });

    if (!payload) {
      logger.authAttempt(false, requestContext, "Invalid token");
      return c.json({ error: "Invalid token" }, HTTPStatus.UNAUTHORIZED);
    }

    // Store user info in context
    c.set("userId", payload.sub);
    c.set("clerkUser", payload);

    // Get or create user in our database
    const db = getDB();
    const usersCollection = db.collection<User>("users");

    let user = await usersCollection.findOne({ clerkUserId: payload.sub });

    if (!user) {
      // Create new user if doesn't exist
      const newUser: User = {
        clerkUserId: payload.sub,
        email: String(payload.email) || "",
        username: String(payload.username) || undefined,
        profile: {
          dietaryPreferences: [],
          cuisinePreferences: [],
          savedRecipes: [],
          savedRestaurants: [],
          shoppingLists: [],
          diningHistory: [],
        },
        subscription: SubscriptionPlan.FREE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await usersCollection.insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    }

    c.set("user", user);

    // Update request context with user ID
    if (requestContext) {
      requestContext.userId = payload.sub;
      c.set("requestContext", requestContext);
    }

    logger.authAttempt(true, requestContext);
    await next();
  } catch (error) {
    logger.error(
      "Auth middleware error",
      error instanceof Error ? error : undefined,
      requestContext
    );
    return c.json({ error: "Authentication failed" }, HTTPStatus.UNAUTHORIZED);
  }
}

// Optional: Middleware to check subscription level
export async function requirePro(c: Context, next: Next) {
  const user = c.get("user") as User;

  if (!user || user.subscription !== SubscriptionPlan.PRO) {
    return c.json({ error: "Pro subscription required" }, HTTPStatus.FORBIDDEN);
  }

  await next();
}
