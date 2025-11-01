import { Hono } from "hono";
import { sessionCacheMiddleware } from "../middleware/cache";
import { CachedSessionService } from "../services/cachedSessionService";
import type { User } from "../types";
import { HTTPStatus } from "../types";

type Variables = {
  user: User;
};

const cachedSessionRoutes = new Hono<{ Variables: Variables }>();

// Apply session-specific cache middleware to GET routes
cachedSessionRoutes.use("/:sessionId", sessionCacheMiddleware());
cachedSessionRoutes.use("/user/:userId", sessionCacheMiddleware());

// Create a new session
cachedSessionRoutes.post("/", async (c) => {
  try {
    const user = c.get("user") as User;
    const session = await CachedSessionService.createSession(user);
    return c.json(session, HTTPStatus.CREATED);
  } catch (error: unknown) {
    return c.json({ error: (error as Error).message }, HTTPStatus.BAD_REQUEST);
  }
});

// Join a session
cachedSessionRoutes.post("/join", async (c) => {
  try {
    const user = c.get("user") as User;
    const { sessionCode } = await c.req.json();

    if (!sessionCode) {
      return c.json(
        { error: "Session code is required" },
        HTTPStatus.BAD_REQUEST
      );
    }

    const session = await CachedSessionService.joinSession(sessionCode, user);
    return c.json(session);
  } catch (error: unknown) {
    return c.json(
      { error: (error as Error).message },
      HTTPStatus.INTERNAL_SERVER_ERROR
    );
  }
});

// Get session details (cached)
cachedSessionRoutes.get("/:sessionId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const session = await CachedSessionService.getSession(sessionId);

    if (!session) {
      return c.json({ error: "Session not found" }, HTTPStatus.NOT_FOUND);
    }

    // Check if user is participant
    const user = c.get("user") as User;
    const isParticipant = session.participants.some(
      (p) => p.userId === user.clerkUserId
    );

    if (!isParticipant && session.hostUserId !== user.clerkUserId) {
      return c.json(
        { error: "Not authorized to view this session" },
        HTTPStatus.FORBIDDEN
      );
    }

    return c.json(session);
  } catch (error: unknown) {
    return c.json(
      { error: (error as Error).message },
      HTTPStatus.INTERNAL_SERVER_ERROR
    );
  }
});

// Leave a session
cachedSessionRoutes.post("/:sessionId/leave", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const user = c.get("user") as User;

    await CachedSessionService.leaveSession(sessionId, user.clerkUserId);
    return c.json({ message: "Successfully left session" });
  } catch (error: unknown) {
    return c.json(
      { error: (error as Error).message },
      HTTPStatus.INTERNAL_SERVER_ERROR
    );
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
        HTTPStatus.BAD_REQUEST
      );
    }

    if (!["recipe", "restaurant"].includes(itemType)) {
      return c.json({ error: "Invalid item type" }, HTTPStatus.BAD_REQUEST);
    }

    if (!["left", "right"].includes(direction)) {
      return c.json(
        { error: "Invalid swipe direction" },
        HTTPStatus.BAD_REQUEST
      );
    }

    await CachedSessionService.recordSwipe({
      sessionId,
      userId: user.clerkUserId,
      itemType,
      itemId,
      direction,
    });

    return c.json({ message: "Swipe recorded successfully" });
  } catch (error: any) {
    return c.json({ error: error.message }, HTTPStatus.INTERNAL_SERVER_ERROR);
  }
});

// Add a message to the session chat
cachedSessionRoutes.post("/:sessionId/messages", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const user = c.get("user") as User;
    const { message } = await c.req.json();

    if (!message) {
      return c.json({ error: "Message is required" }, HTTPStatus.BAD_REQUEST);
    }

    await CachedSessionService.addMessage(
      sessionId,
      user.clerkUserId,
      user.username || user.email,
      message
    );

    return c.json({ message: "Message added successfully" });
  } catch (error: unknown) {
    return c.json(
      { error: (error as Error).message },
      HTTPStatus.INTERNAL_SERVER_ERROR
    );
  }
});

// Get user's sessions (cached)
cachedSessionRoutes.get("/user/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const user = c.get("user") as User;

    // Users can only get their own sessions
    if (userId !== user.clerkUserId) {
      return c.json({ error: "Not authorized" }, HTTPStatus.FORBIDDEN);
    }

    const sessions = await CachedSessionService.getUserSessions(userId);
    return c.json(sessions);
  } catch (error: unknown) {
    return c.json(
      { error: (error as Error).message },
      HTTPStatus.INTERNAL_SERVER_ERROR
    );
  }
});

export default cachedSessionRoutes;
