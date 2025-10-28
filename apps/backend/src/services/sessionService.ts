import { getDB } from "../config/database";
import { DinnerSession, SessionStatus, SessionParticipant, User, SubscriptionPlan } from "../types";
import { ObjectId } from "mongodb";

export class SessionService {
  private static generateSessionCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  static async createSession(hostUser: User): Promise<DinnerSession> {
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

    const sessionExpiryMinutes = parseInt(process.env.SESSION_EXPIRY_MINUTES || "60");
    const expiresAt = new Date(Date.now() + sessionExpiryMinutes * 60 * 1000);

    const newSession: DinnerSession = {
      sessionCode: this.generateSessionCode(),
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
  }

  static async joinSession(sessionCode: string, user: User): Promise<DinnerSession> {
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
    const existingParticipant = session.participants.find((p) => p.userId === user.clerkUserId);
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

    const updatedSession = await sessionsCollection.findOne({ _id: session._id });
    return updatedSession!;
  }

  static async leaveSession(sessionId: string, userId: string): Promise<void> {
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
    const session = await sessionsCollection.findOne({ _id: new ObjectId(sessionId) });
    if (session && session.participants.every((p) => !p.isActive)) {
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
  }

  static async recordSwipe(
    sessionId: string,
    userId: string,
    itemType: "recipe" | "restaurant",
    itemId: string,
    direction: "left" | "right"
  ): Promise<void> {
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
      await this.checkForMatches(sessionId, itemType, itemId);
    }
  }

  static async checkForMatches(
    sessionId: string,
    itemType: "recipe" | "restaurant",
    itemId: string
  ): Promise<void> {
    const db = getDB();
    const sessionsCollection = db.collection<DinnerSession>("sessions");

    const session = await sessionsCollection.findOne({ _id: new ObjectId(sessionId) });
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
        const itemName = await this.getItemName(itemType, itemId);

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
  }

  private static async getItemName(itemType: "recipe" | "restaurant", itemId: string): Promise<string> {
    const db = getDB();
    const collection = itemType === "recipe" ? "recipes" : "restaurants";
    const item = await db.collection(collection).findOne({ _id: new ObjectId(itemId) });
    return item?.title || item?.name || "Unknown";
  }

  static async addMessage(sessionId: string, userId: string, username: string, message: string): Promise<void> {
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
  }

  static async getSession(sessionId: string): Promise<DinnerSession | null> {
    const db = getDB();
    const session = await db.collection<DinnerSession>("sessions").findOne({ _id: new ObjectId(sessionId) });
    return session;
  }

  static async getUserSessions(userId: string): Promise<DinnerSession[]> {
    const db = getDB();
    const sessions = await db
      .collection<DinnerSession>("sessions")
      .find({
        $or: [{ hostUserId: userId }, { "participants.userId": userId }],
      })
      .sort({ createdAt: -1 })
      .toArray();
    return sessions;
  }
}