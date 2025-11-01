import { ObjectId } from "mongodb";
import { getDB } from "../config/database";
import { CACHE_KEYS, TTL_CONFIG } from "../config/redis";
import {
  Calculations,
  type DinnerSession,
  type SessionParticipant,
  SessionStatus,
  SubscriptionPlan,
  type User,
} from "../types";
import { CacheHelpers, getCacheService } from "./cache";

/**
 * Enhanced Session Service with Redis caching
 * Provides fallback to database when cache is unavailable
 */
const generateSessionCode = (): string =>
  Math.random()
    .toString(Calculations.SESSION_CODE)
    .substring(2, Calculations.SUBSTRING)
    .toUpperCase();

const expiryRegex = /^\d+$/;

export const createSession = async (hostUser: User): Promise<DinnerSession> => {
  const db = getDB();
  const sessionsCollection = db.collection<DinnerSession>("sessions");
  const cache = getCacheService();

  // Check for existing active sessions (for free users)
  if (hostUser.subscription === SubscriptionPlan.FREE) {
    // Try to check from cache first
    const cachedUserSessions = await cache.get(
      CACHE_KEYS.userSessions(hostUser.clerkUserId)
    );

    let activeSessions = 0;

    if (cachedUserSessions) {
      // Check cached sessions
      for (const sessionId of cachedUserSessions) {
        const cachedSession = await cache.get(CACHE_KEYS.session(sessionId));
        if (cachedSession) {
          const session =
            typeof cachedSession === "string"
              ? (JSON.parse(cachedSession) as DinnerSession)
              : (cachedSession as unknown as DinnerSession);
          if (
            [SessionStatus.WAITING, SessionStatus.ACTIVE].includes(
              session.status
            )
          ) {
            activeSessions++;
          }
        }
      }
    } else {
      // Fallback to database
      activeSessions = await sessionsCollection.countDocuments({
        hostUserId: hostUser.clerkUserId,
        status: { $in: [SessionStatus.WAITING, SessionStatus.ACTIVE] },
      });
    }

    if (activeSessions >= 1) {
      throw new Error("Free users can only have one active session at a time");
    }
  }

  const sessionExpiryMinutes = Number.parseInt(
    process.env.SESSION_EXPIRY_MINUTES || "60",
    10
  );
  const millisecondsInSecond = 1000;
  const expiresAt = new Date(
    Date.now() + sessionExpiryMinutes * 60 * millisecondsInSecond
  );

  const newSession: DinnerSession = {
    sessionCode: generateSessionCode(),
    hostUserId: hostUser.clerkUserId,
    participants: [
      {
        userId: hostUser.clerkUserId,
        username: hostUser.username || hostUser.email,
        joinedAt: new Date(),
        isActive: true,
      },
    ],
    status: SessionStatus.WAITING,
    swipeData: [],
    matches: [],
    messages: [],
    expiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await sessionsCollection.insertOne(newSession);
  const sessionWithId = { ...newSession, _id: result.insertedId };

  // Cache the new session
  await Promise.all([
    // Cache session by ID
    cache.set(
      CACHE_KEYS.session(result.insertedId.toString()),
      sessionWithId,
      TTL_CONFIG.session.waiting
    ),
    // Cache session by code
    cache.set(
      CACHE_KEYS.sessionByCode(newSession.sessionCode),
      result.insertedId.toString(),
      TTL_CONFIG.session.waiting
    ),
    // Update user's sessions cache
    cache.getOrSet(
      CACHE_KEYS.userSessions(hostUser.clerkUserId),
      async () => {
        const sessions = await sessionsCollection
          .find({ hostUserId: hostUser.clerkUserId })
          .project({ _id: 1 })
          .toArray();
        return sessions.map((s) => s._id.toString());
      },
      TTL_CONFIG.user.default
    ),
  ]);

  console.log(`Session created: ${newSession.sessionCode}`);
  return sessionWithId;
};

export const joinSession = async (
    sessionCode: string,
    user: User
  )
: Promise<DinnerSession>
{
  const db = getDB();
  const sessionsCollection = db.collection<DinnerSession>("sessions");
  const cache = getCacheService();

  // Try to get session ID from cache
  const cachedSessionId = await cache.get<string>(
    CACHE_KEYS.sessionByCode(sessionCode.toUpperCase())
  );

  let session: DinnerSession | null = null;

  if (cachedSessionId) {
    // Try to get session from cache
    session = await cache.get<DinnerSession>(
      CACHE_KEYS.session(cachedSessionId)
    );
  }

  // Fallback to database if not in cache
  if (!session) {
    session = await sessionsCollection.findOne({
      sessionCode: sessionCode.toUpperCase(),
      status: { $in: [SessionStatus.WAITING, SessionStatus.ACTIVE] },
    });

    if (session) {
      // Cache the session for next time
      await cache.set(
        CACHE_KEYS.session(session._id.toString()),
        session,
        TTL_CONFIG.session.active
      );
    }
  }

  if (!session) {
    throw new Error("Session not found or expired");
  }

  // Check if user is already in session
  const existingParticipant = session.participants.find(
    (p) => p.userId === user.clerkUserId
  );

  if (existingParticipant) {
    // Update participant status to active
    await sessionsCollection.updateOne(
      { _id: session._id, "participants.userId": user.clerkUserId },
      {
        $set: {
          "participants.$.isActive": true,
          updatedAt: new Date(),
        },
      }
    );

    // Invalidate cache
    await CacheHelpers.session.invalidate(session._id.toString());

    return session;
  }

  // Check max participants
  if (session.participants.length >= 5) {
    throw new Error("Session is full (maximum 5 participants)");
  }

  // Add new participant
  const participant: SessionParticipant = {
    userId: user.clerkUserId,
    username: user.username || user.email,
    joinedAt: new Date(),
    isActive: true,
  };

  await sessionsCollection.updateOne(
    { _id: session._id },
    {
      $push: { participants: participant },
      $set: {
        status: SessionStatus.ACTIVE,
        updatedAt: new Date(),
      },
    }
  );

  // Invalidate cache and get updated session
  await CacheHelpers.session.invalidate(session._id.toString());

  const updatedSession = await sessionsCollection.findOne({
    _id: session._id,
  });

  if (updatedSession) {
    // Re-cache with updated data
    await cache.set(
      CACHE_KEYS.session(session._id.toString()),
      updatedSession,
      TTL_CONFIG.session.active
    );
  }

  console.log(`User ${user.clerkUserId} joined session ${sessionCode}`);
  return updatedSession!;
}

export const leaveSession = async (
  sessionId: string,
  userId: string
): Promise<void> => {
  const db = getDB();
  const sessionsCollection = db.collection<DinnerSession>("sessions");

  await sessionsCollection.updateOne(
    { _id: new ObjectId(sessionId), "participants.userId": userId },
    {
      $set: {
        "participants.$.isActive": false,
        updatedAt: new Date(),
      },
    }
  );

  // Check if all participants have left
  const session = await sessionsCollection.findOne({
    _id: new ObjectId(sessionId),
  });

  if (session?.participants.every((p) => !p.isActive)) {
    await sessionsCollection.updateOne(
      { _id: new ObjectId(sessionId) },
      {
        $set: {
          status: SessionStatus.COMPLETED,
          updatedAt: new Date(),
        },
      }
    );
  }

  // Invalidate session cache
  await CacheHelpers.session.invalidate(sessionId);

  console.log(`User ${userId} left session ${sessionId}`);
};

export const recordSwipe = async (
  sessionId: string,
  userId: string,
  itemType: "recipe" | "restaurant",
  itemId: string,
  direction: "left" | "right"
): Promise<void> => {
  const db = getDB();
  const sessionsCollection = db.collection<DinnerSession>("sessions");
  const cache = getCacheService();

  const swipeData = {
    userId,
    itemType,
    itemId: new ObjectId(itemId),
    direction,
    timestamp: new Date(),
  };

  await sessionsCollection.updateOne(
    { _id: new ObjectId(sessionId) },
    {
      $push: { swipeData },
      $set: { updatedAt: new Date() },
    }
  );

  // Cache swipe data for quick match checking
  const swipeKey = CACHE_KEYS.swipe(sessionId, userId);
  await cache.set(
    swipeKey,
    { itemType, itemId, direction },
    TTL_CONFIG.swipe.default
  );

  // Invalidate session cache to ensure consistency
  await CacheHelpers.session.invalidate(sessionId);

  // Check for matches if swiped right
  if (direction === "right") {
    await CachedSessionService.checkForMatches(sessionId, itemType, itemId);
  }

  console.debug(`Swipe recorded: ${userId} swiped ${direction} on ${itemId}`);
};

export const checkForMatches = async (
  sessionId: string,
  itemType: "recipe" | "restaurant",
  itemId: string
): Promise<void> => {
  const db = getDB();
  const sessionsCollection = db.collection<DinnerSession>("sessions");
  const cache = getCacheService();

  // Try to get session from cache first
  let session = await cache.get(CACHE_KEYS.session(sessionId));

  if (!session) {
    session = await sessionsCollection.findOne({
      _id: new ObjectId(sessionId),
    });
  }

  if (!session) return;

  // Find all users who swiped right on this item
  const rightSwipes = session.swipeData.filter(
    (swipe) =>
      swipe.itemType === itemType &&
      swipe.itemId.toString() === itemId &&
      swipe.direction === "right"
  );

  const uniqueUsers = [...new Set(rightSwipes.map((s) => s.userId))];

  // If 2 or more users swiped right, it's a match
  if (uniqueUsers.length >= 2) {
    // Check if match already exists
    const existingMatch = session.matches.find(
      (m) => m.itemType === itemType && m.itemId.toString() === itemId
    );

    if (!existingMatch) {
      const itemName = await CachedSessionService.getItemName(itemType, itemId);

      const match = {
        itemType,
        itemId: new ObjectId(itemId),
        itemName,
        matchedUsers: uniqueUsers,
        matchedAt: new Date(),
      };

      await sessionsCollection.updateOne(
        { _id: new ObjectId(sessionId) },
        {
          $push: { matches: match },
          $set: { updatedAt: new Date() },
        }
      );

      // Invalidate session cache
      await CacheHelpers.session.invalidate(sessionId);

      console.log(
        `Match found for ${itemType} ${itemId} in session ${sessionId}`
      );
    }
  }
};

export const getItemName = async (
    itemType: "recipe" | "restaurant",
    itemId: string
  )
: Promise<string>
{
  const cache = getCacheService();

  // Try to get from cache first
  const cacheKey =
    itemType === "recipe"
      ? CACHE_KEYS.recipe(itemId)
      : CACHE_KEYS.restaurant(itemId);

  const cachedItem = await cache.get<any>(cacheKey);
  if (cachedItem) {
    return cachedItem.title || cachedItem.name || "Unknown";
  }

  // Fallback to database
  const db = getDB();
  const collection = itemType === "recipe" ? "recipes" : "restaurants";
  const item = await db
    .collection(collection)
    .findOne({ _id: new ObjectId(itemId) });

  // Cache the item for future use
  if (item) {
    await cache.set(
      cacheKey,
      item,
      itemType === "recipe"
        ? TTL_CONFIG.recipe.detail
        : TTL_CONFIG.restaurant.detail
    );
  }

  return item?.title || item?.name || "Unknown";
}

export const addMessage = async (
    sessionId: string,
    userId: string,
    username: string,
    message: string
  )
: Promise<void>
{
  const db = getDB();
  const sessionsCollection = db.collection<DinnerSession>("sessions");

  const sessionMessage = {
    userId,
    username,
    message,
    timestamp: new Date(),
  };

  await sessionsCollection.updateOne(
    { _id: new ObjectId(sessionId) },
    {
      $push: { messages: sessionMessage },
      $set: { updatedAt: new Date() },
    }
  );

  // Invalidate session cache
  await CacheHelpers.session.invalidate(sessionId);

  console.debug(`Message added to session ${sessionId} by ${username}`);
}

export const getSession = async (
  sessionId: string
): Promise<DinnerSession | null> => {
  const cache = getCacheService();

  // Try cache first
  const session = await cache.getOrSet(
    CACHE_KEYS.session(sessionId),
    async () => {
      const db = getDB();
      return await db
        .collection<DinnerSession>("sessions")
        .findOne({ _id: new ObjectId(sessionId) });
    },
    TTL_CONFIG.session.default
  );

  return session;
};

export const getUserSessions = async (
  userId: string
): Promise<DinnerSession[]> => {
  const cache = getCacheService();
  const db = getDB();

  // Get list of session IDs from cache or database
  const sessionIds = await cache.getOrSet(
    CACHE_KEYS.userSessions(userId),
    async () => {
      const sessions = await db
        .collection<DinnerSession>("sessions")
        .find({
          $or: [{ hostUserId: userId }, { "participants.userId": userId }],
        })
        .project({ _id: 1 })
        .toArray();
      return sessions.map((s) => s._id.toString());
    },
    TTL_CONFIG.user.default
  );

  // Fetch each session (from cache if possible)
  const sessions: DinnerSession[] = [];
  for (const sessionId of sessionIds) {
    const session = await CachedSessionService.getSession(sessionId);
    if (session) {
      sessions.push(session);
    }
  }

  // Sort by creation date (newest first)
  sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return sessions;
};
