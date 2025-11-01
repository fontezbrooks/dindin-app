import { Hono } from "hono";
import { HTTP_STATUS } from "../constants/http-status";
import {
  addMessage,
  createSession,
  getSession,
  getUserSessions,
  joinSession,
  leaveSession,
  recordSwipe,
} from "../services/sessionService";
import type { User } from "../types";

const sessionRoutes = new Hono();

// Create a new session
sessionRoutes.post("/", async (c) => {
  try {
    const user = c.get("user") as User;
    const session = await createSession(user);
    return c.json(session, HTTP_STATUS.CREATED);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: errorMessage }, HTTP_STATUS.BAD_REQUEST);
  }
});

// Join a session
sessionRoutes.post("/join", async (c) => {
  try {
    const user = c.get("user") as User;
    const { sessionCode } = await c.req.json();

    if (!sessionCode) {
      return c.json(
        { error: "Session code is required" },
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const session = await joinSession(sessionCode, user);
    return c.json(session);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: errorMessage }, HTTP_STATUS.BAD_REQUEST);
  }
});

// Get session details
sessionRoutes.get("/:sessionId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const session = await getSession(sessionId);

    if (!session) {
      return c.json({ error: "Session not found" }, HTTP_STATUS.NOT_FOUND);
    }

    // Check if user is participant
    const user = c.get("user") as User;
    const isParticipant = session.participants.some(
      (p) => p.userId === user.clerkUserId
    );

    if (!isParticipant) {
      return c.json(
        { error: "Not authorized to view this session" },
        HTTP_STATUS.FORBIDDEN
      );
    }

    return c.json(session);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: errorMessage }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

// Leave a session
sessionRoutes.post("/:sessionId/leave", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const user = c.get("user") as User;

    await leaveSession(sessionId, user.clerkUserId);
    return c.json({ message: "Left session successfully" });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: errorMessage }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

// Record a swipe
sessionRoutes.post("/:sessionId/swipe", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const user = c.get("user") as User;
    const { itemType, itemId, direction } = await c.req.json();

    if (!(itemType && itemId && direction)) {
      return c.json(
        { error: "Missing required fields" },
        HTTP_STATUS.BAD_REQUEST
      );
    }

    if (!["recipe", "restaurant"].includes(itemType)) {
      return c.json({ error: "Invalid item type" }, HTTP_STATUS.BAD_REQUEST);
    }

    if (!["left", "right"].includes(direction)) {
      return c.json(
        { error: "Invalid swipe direction" },
        HTTP_STATUS.BAD_REQUEST
      );
    }

    await recordSwipe(sessionId, user.clerkUserId, itemType, itemId, direction);
    return c.json({ message: "Swipe recorded" });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: errorMessage }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

// Get session matches
sessionRoutes.get("/:sessionId/matches", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const session = await getSession(sessionId);

    if (!session) {
      return c.json({ error: "Session not found" }, HTTP_STATUS.NOT_FOUND);
    }

    // Check if user is participant
    const user = c.get("user") as User;
    const isParticipant = session.participants.some(
      (p) => p.userId === user.clerkUserId
    );

    if (!isParticipant) {
      return c.json({ error: "Not authorized" }, HTTP_STATUS.FORBIDDEN);
    }

    return c.json(session.matches);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: errorMessage }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

// Send a message to session
sessionRoutes.post("/:sessionId/messages", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const user = c.get("user") as User;
    const { message } = await c.req.json();

    if (!message) {
      return c.json({ error: "Message is required" }, HTTP_STATUS.BAD_REQUEST);
    }

    await addMessage(
      sessionId,
      user.clerkUserId,
      user.username || user.email,
      message
    );
    return c.json({ message: "Message sent" });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: errorMessage }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

// Get user's sessions
sessionRoutes.get("/", async (c) => {
  try {
    const user = c.get("user") as User;
    const sessions = await getUserSessions(user.clerkUserId);
    return c.json(sessions);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: errorMessage }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

export default sessionRoutes;
