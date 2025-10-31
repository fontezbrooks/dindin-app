import { Hono } from "hono";
import { sessionCacheMiddleware } from "../middleware/cache";
import { CachedSessionService } from "../services/cachedSessionService";
import type { User } from "../types";

const cachedSessionRoutes = new Hono();

// Apply session-specific cache middleware to GET routes
cachedSessionRoutes.use("/:sessionId", sessionCacheMiddleware());
cachedSessionRoutes.use("/user/:userId", sessionCacheMiddleware());

// Create a new session
cachedSessionRoutes.post("/", async (c) => {
  try {
    const user = c.get("user") as User;
    const session = await CachedSessionService.createSession(user);
    return c.json(session, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Join a session
cachedSessionRoutes.post("/join", async (c) => {
  try {
    const user = c.get("user") as User;
    const { sessionCode } = await c.req.json();

    if (!sessionCode) {
      return c.json({ error: "Session code is required" }, 400);
    }

    const session = await CachedSessionService.joinSession(sessionCode, user);
    return c.json(session);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Get session details (cached)
cachedSessionRoutes.get("/:sessionId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const session = await CachedSessionService.getSession(sessionId);

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    // Check if user is participant
    const user = c.get("user") as User;
    const isParticipant = session.participants.some(
      (p) => p.userId === user.clerkUserId
    );

    if (!isParticipant && session.hostUserId !== user.clerkUserId) {
      return c.json({ error: "Not authorized to view this session" }, 403);
    }

    return c.json(session);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Leave a session
cachedSessionRoutes.post("/:sessionId/leave", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const user = c.get("user") as User;

    await CachedSessionService.leaveSession(sessionId, user.clerkUserId);
    return c.json({ message: "Successfully left session" });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Record a swipe
cachedSessionRoutes.post("/:sessionId/swipe", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const user = c.get("user") as User;
    const { itemType, itemId, direction } = await c.req.json();

    if (!(itemType && itemId && direction)) {
      return c.json(
        { error: "itemType, itemId, and direction are required" },
        400
      );
    }

    if (!["recipe", "restaurant"].includes(itemType)) {
      return c.json({ error: "Invalid item type" }, 400);
    }

    if (!["left", "right"].includes(direction)) {
      return c.json({ error: "Invalid swipe direction" }, 400);
    }

    await CachedSessionService.recordSwipe(
      sessionId,
      user.clerkUserId,
      itemType,
      itemId,
      direction
    );

    return c.json({ message: "Swipe recorded successfully" });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Add a message to the session chat
cachedSessionRoutes.post("/:sessionId/messages", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const user = c.get("user") as User;
    const { message } = await c.req.json();

    if (!message) {
      return c.json({ error: "Message is required" }, 400);
    }

    await CachedSessionService.addMessage(
      sessionId,
      user.clerkUserId,
      user.username || user.email,
      message
    );

    return c.json({ message: "Message added successfully" });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Get user's sessions (cached)
cachedSessionRoutes.get("/user/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const user = c.get("user") as User;

    // Users can only get their own sessions
    if (userId !== user.clerkUserId) {
      return c.json({ error: "Not authorized" }, 403);
    }

    const sessions = await CachedSessionService.getUserSessions(userId);
    return c.json(sessions);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default cachedSessionRoutes;
