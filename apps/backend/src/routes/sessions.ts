import { Hono } from "hono";
import { SessionService } from "../services/sessionService";
import type { User } from "../types";

const sessionRoutes = new Hono();

// Create a new session
sessionRoutes.post("/", async (c) => {
  try {
    const user = c.get("user") as User;
    const session = await SessionService.createSession(user);
    return c.json(session, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Join a session
sessionRoutes.post("/join", async (c) => {
  try {
    const user = c.get("user") as User;
    const { sessionCode } = await c.req.json();

    if (!sessionCode) {
      return c.json({ error: "Session code is required" }, 400);
    }

    const session = await SessionService.joinSession(sessionCode, user);
    return c.json(session);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Get session details
sessionRoutes.get("/:sessionId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const session = await SessionService.getSession(sessionId);

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    // Check if user is participant
    const user = c.get("user") as User;
    const isParticipant = session.participants.some(
      (p) => p.userId === user.clerkUserId
    );

    if (!isParticipant) {
      return c.json({ error: "Not authorized to view this session" }, 403);
    }

    return c.json(session);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Leave a session
sessionRoutes.post("/:sessionId/leave", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const user = c.get("user") as User;

    await SessionService.leaveSession(sessionId, user.clerkUserId);
    return c.json({ message: "Left session successfully" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Record a swipe
sessionRoutes.post("/:sessionId/swipe", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const user = c.get("user") as User;
    const { itemType, itemId, direction } = await c.req.json();

    if (!(itemType && itemId && direction)) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    if (!["recipe", "restaurant"].includes(itemType)) {
      return c.json({ error: "Invalid item type" }, 400);
    }

    if (!["left", "right"].includes(direction)) {
      return c.json({ error: "Invalid swipe direction" }, 400);
    }

    await SessionService.recordSwipe(
      sessionId,
      user.clerkUserId,
      itemType,
      itemId,
      direction
    );
    return c.json({ message: "Swipe recorded" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get session matches
sessionRoutes.get("/:sessionId/matches", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const session = await SessionService.getSession(sessionId);

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    // Check if user is participant
    const user = c.get("user") as User;
    const isParticipant = session.participants.some(
      (p) => p.userId === user.clerkUserId
    );

    if (!isParticipant) {
      return c.json({ error: "Not authorized" }, 403);
    }

    return c.json(session.matches);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Send a message to session
sessionRoutes.post("/:sessionId/messages", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const user = c.get("user") as User;
    const { message } = await c.req.json();

    if (!message) {
      return c.json({ error: "Message is required" }, 400);
    }

    await SessionService.addMessage(
      sessionId,
      user.clerkUserId,
      user.username || user.email,
      message
    );
    return c.json({ message: "Message sent" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get user's sessions
sessionRoutes.get("/", async (c) => {
  try {
    const user = c.get("user") as User;
    const sessions = await SessionService.getUserSessions(user.clerkUserId);
    return c.json(sessions);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default sessionRoutes;
