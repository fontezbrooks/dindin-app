import { ObjectId } from "mongodb";
import { getDB } from "../config/database";
import {
  Calculations,
  type DinnerSession,
  type SessionParticipant,
  SessionStatus,
  SubscriptionPlan,
  type User,
} from "../types";

const generateSessionCode = (): string =>
  Math.random()
    .toString(Calculations.SESSION_CODE)
    .substring(2, Calculations.SUBSTRING)
    .toUpperCase();

const expiryRegex = /^\d+$/;
export const createSession = async (hostUser: User): Promise<DinnerSession> => {
  const db = getDB();
  const sessionsCollection = db.collection<DinnerSession>("sessions");

  // Check for existing active sessions (for free users)
  if (hostUser.subscription === SubscriptionPlan.FREE) {
    const activeSessions = await sessionsCollection.countDocuments({
      hostUserId: hostUser.clerkUserId,
      status: { $in: [SessionStatus.WAITING, SessionStatus.ACTIVE] },
    });

    if (activeSessions >= 1) {
      throw new Error("Free users can only have one active session at a time");
    }
  }

  const expiryEnv = process.env.SESSION_EXPIRY_MINUTES;
  const sessionExpiryMinutes =
    expiryEnv && expiryRegex.test(expiryEnv)
      ? Number.parseInt(expiryEnv, 10)
      : 60;
  if (expiryEnv && !expiryRegex.test(expiryEnv)) {
    throw new Error("SESSION_EXPIRY_MINUTES must be a valid number");
  }
  const expiresAt = new Date(
    Date.now() + sessionExpiryMinutes * 60 * Calculations.X_RATE_LIMIT_RESET
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
  return { ...newSession, _id: result.insertedId };
};

export const joinSession = async (
  sessionCode: string,
  user: User
): Promise<DinnerSession> => {
  const db = getDB();
  const sessionsCollection = db.collection<DinnerSession>("sessions");

  const session = await sessionsCollection.findOne({
    sessionCode: sessionCode.toUpperCase(),
    status: { $in: [SessionStatus.WAITING, SessionStatus.ACTIVE] },
  });

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
    return session;
  }

  // Check max participants
  if (session.participants.length >= Calculations.SESSION_MAX_LENGTH) {
    throw new Error(
      `Session is full (maximum ${Calculations.SESSION_MAX_LENGTH} participants)`
    );
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

  const updatedSession = await sessionsCollection.findOne({
    _id: session._id,
  });
  if (!updatedSession) {
    throw new Error("Failed to retrieve updated session");
  }
  return updatedSession;
};

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
};

export const recordSwipe = async ({
  sessionId,
  userId,
  itemType,
  itemId,
  direction,
}: {
  sessionId: string;
  userId: string;
  itemType: "recipe" | "restaurant";
  itemId: string;
  direction: "left" | "right";
}): Promise<void> => {
  const db = getDB();
  const sessionsCollection = db.collection<DinnerSession>("sessions");

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

  // Check for matches if swiped right
  if (direction === "right") {
    await checkForMatches(sessionId, itemType, itemId);
  }
};

export const checkForMatches = async (
  sessionId: string,
  itemType: "recipe" | "restaurant",
  itemId: string
): Promise<void> => {
  const db = getDB();
  const sessionsCollection = db.collection<DinnerSession>("sessions");

  const session = await sessionsCollection.findOne({
    _id: new ObjectId(sessionId),
  });
  if (!session) {
    return;
  }

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
      const itemName = await getItemName(itemType, itemId);

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
    }
  }
};

const getItemName = async (
  itemType: "recipe" | "restaurant",
  itemId: string
): Promise<string> => {
  const db = getDB();
  const collection = itemType === "recipe" ? "recipes" : "restaurants";
  const item = await db
    .collection(collection)
    .findOne({ _id: new ObjectId(itemId) });
  return item?.title || item?.name || "Unknown";
};

export const addMessage = async (
  sessionId: string,
  userId: string,
  username: string,
  message: string
): Promise<void> => {
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
};

export const getSession = async (
  sessionId: string
): Promise<DinnerSession | null> => {
  const db = getDB();
  const session = await db
    .collection<DinnerSession>("sessions")
    .findOne({ _id: new ObjectId(sessionId) });
  return session;
};

export const getUserSessions = async (
  userId: string
): Promise<DinnerSession[]> => {
  const db = getDB();
  const sessions = await db
    .collection<DinnerSession>("sessions")
    .find({
      $or: [{ hostUserId: userId }, { "participants.userId": userId }],
    })
    .sort({ createdAt: -1 })
    .toArray();
  return sessions;
};
