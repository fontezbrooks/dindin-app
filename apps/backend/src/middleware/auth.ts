import { verifyToken } from "@clerk/backend";
import type { Context, Next } from "hono";
import { getDB } from "../config/database";
import { SubscriptionPlan, type User } from "../types";

export async function authMiddleware(c: Context, next: Next) {
  try {
    const authHeader = c.req.header("Authorization");

    if (!(authHeader && authHeader.startsWith("Bearer "))) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const token = authHeader.substring(7);
    const secretKey = process.env.CLERK_SECRET_KEY;

    if (!secretKey) {
      console.error("CLERK_SECRET_KEY not configured");
      return c.json({ error: "Server configuration error" }, 500);
    }

    // Verify the token with Clerk
    const payload = await verifyToken(token, {
      secretKey,
    });

    if (!payload) {
      return c.json({ error: "Invalid token" }, 401);
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
        email: payload.email || "",
        username: payload.username || undefined,
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

    await next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return c.json({ error: "Authentication failed" }, 401);
  }
}

// Optional: Middleware to check subscription level
export async function requirePro(c: Context, next: Next) {
  const user = c.get("user") as User;

  if (!user || user.subscription !== SubscriptionPlan.PRO) {
    return c.json({ error: "Pro subscription required" }, 403);
  }

  await next();
}
