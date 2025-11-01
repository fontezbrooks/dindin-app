import { verifyToken } from "@clerk/backend";
import type { ServerWebSocket } from "bun";
import { logger } from "../../../../packages/logger";
import { getDB } from "../config/database";
import { SessionService } from "../services/sessionService";
import {
  type ExtendedServerWebSocket,
  type WSMessage,
  WSMessageType,
} from "../types";

type WSClient = {
  ws: ServerWebSocket;
  userId: string;
  sessionId?: string;
  username?: string;
};

class WebSocketManager {
  private readonly clients: Map<string, WSClient> = new Map();
  private readonly sessions: Map<string, Set<string>> = new Map(); // sessionId -> Set<userId>

  async handleConnection(ws: ServerWebSocket, token: string) {
    try {
      logger.debug("WebSocket connection attempt");

      // Verify token
      const secretKey = process.env.CLERK_SECRET_KEY;
      if (!secretKey) {
        logger.error("CLERK_SECRET_KEY not configured for WebSocket");
        ws.send(
          JSON.stringify({
            type: WSMessageType.ERROR,
            error: "Server configuration error",
          })
        );
        ws.close();
        return;
      }

      const payload = await verifyToken(token, { secretKey });
      if (!payload) {
        logger.warn("WebSocket authentication failed: Invalid token");
        ws.send(
          JSON.stringify({ type: WSMessageType.ERROR, error: "Invalid token" })
        );
        ws.close();
        return;
      }

      const userId = payload.sub;
      logger.debug("WebSocket token verified", undefined, { userId });

      // Get user from database
      const db = getDB();
      const user = await db
        .collection("users")
        .findOne({ clerkUserId: userId });

      if (!user) {
        logger.warn("WebSocket user not found", undefined, { userId });
        ws.send(
          JSON.stringify({ type: WSMessageType.ERROR, error: "User not found" })
        );
        ws.close();
        return;
      }

      // Store client
      const client: WSClient = {
        ws,
        userId,
        username: user.username || user.email,
      };

      this.clients.set(userId, client);

      logger.websocketConnection("connect", undefined, {
        userId,
        username: client.username,
        totalConnections: this.clients.size,
      });

      ws.send(
        JSON.stringify({
          type: "connected",
          userId,
          message: "WebSocket connected successfully",
        })
      );
    } catch (error) {
      logger.error(
        "WebSocket authentication failed",
        error instanceof Error ? error : undefined
      );
      ws.send(
        JSON.stringify({
          type: WSMessageType.ERROR,
          error: "Authentication failed",
        })
      );
      ws.close();
    }
  }

  async handleMessage(userId: string, message: string) {
    try {
      const data: WSMessage = JSON.parse(message);
      const client = this.clients.get(userId);

      if (!client) {
        return;
      }

      switch (data.type) {
        case WSMessageType.JOIN_SESSION:
          await this.handleJoinSession(client, data.sessionId);
          break;

        case WSMessageType.LEAVE_SESSION:
          await this.handleLeaveSession(client, data.sessionId);
          break;

        case WSMessageType.SWIPE:
          await this.handleSwipe(client, data);
          break;

        case WSMessageType.CHAT_MESSAGE:
          await this.handleChatMessage(client, data);
          break;

        default:
          logger.warn("Unknown WebSocket message type", undefined, {
            userId,
            messageType: data.type,
          });
          client.ws.send(
            JSON.stringify({
              type: WSMessageType.ERROR,
              error: "Unknown message type",
            })
          );
      }
    } catch (error) {
      logger.error(
        "Error handling WebSocket message",
        error instanceof Error ? error : undefined,
        undefined,
        { userId }
      );
    }
  }

  private async handleJoinSession(client: WSClient, sessionId: string) {
    try {
      // Verify session exists and user is participant
      const session = await SessionService.getSession(sessionId);

      if (!session) {
        client.ws.send(
          JSON.stringify({
            type: WSMessageType.ERROR,
            error: "Session not found",
          })
        );
        return;
      }

      const isParticipant = session.participants.some(
        (p) => p.userId === client.userId
      );
      if (!isParticipant) {
        client.ws.send(
          JSON.stringify({
            type: WSMessageType.ERROR,
            error: "Not authorized to join this session",
          })
        );
        return;
      }

      // Add to session
      client.sessionId = sessionId;

      if (!this.sessions.has(sessionId)) {
        this.sessions.set(sessionId, new Set());
      }
      this.sessions.get(sessionId)?.add(client.userId);

      logger.businessEvent("session_joined", undefined, {
        sessionId,
        userId: client.userId,
        username: client.username,
        participantCount: this.sessions.get(sessionId)?.size || 0,
      });

      // Notify all participants
      this.broadcastToSession(sessionId, {
        type: WSMessageType.SESSION_UPDATE,
        sessionId,
        userId: client.userId,
        data: {
          event: "user_joined",
          username: client.username,
          participants: Array.from(this.sessions.get(sessionId) || []),
        },
      });
    } catch (error) {
      logger.error(
        "Error handling session join",
        error instanceof Error ? error : undefined,
        undefined,
        { sessionId, userId: client.userId }
      );
    }
  }

  private async handleLeaveSession(client: WSClient, sessionId: string) {
    if (!client.sessionId || client.sessionId !== sessionId) {
      return;
    }

    // Remove from session
    client.sessionId = undefined;
    this.sessions.get(sessionId)?.delete(client.userId);

    // Clean up empty sessions
    if (this.sessions.get(sessionId)?.size === 0) {
      this.sessions.delete(sessionId);
    }

    // Update database
    await SessionService.leaveSession(sessionId, client.userId);

    // Notify remaining participants
    this.broadcastToSession(sessionId, {
      type: WSMessageType.SESSION_UPDATE,
      sessionId,
      userId: client.userId,
      data: {
        event: "user_left",
        username: client.username,
        participants: Array.from(this.sessions.get(sessionId) || []),
      },
    });
  }

  private async handleSwipe(client: WSClient, data: WSMessage) {
    if (!client.sessionId) {
      client.ws.send(
        JSON.stringify({
          type: WSMessageType.ERROR,
          error: "Not in a session",
        })
      );
      return;
    }

    const { itemType, itemId, direction } = data.data;

    // Record swipe in database
    await SessionService.recordSwipe(
      client.sessionId,
      client.userId,
      itemType,
      itemId,
      direction
    );

    // Get updated session to check for matches
    const session = await SessionService.getSession(client.sessionId);

    if (!session) {
      return;
    }

    // Check if a new match was created
    const latestMatch = session.matches.at(-1);

    if (latestMatch?.matchedUsers.includes(client.userId)) {
      logger.businessEvent("match_found", undefined, {
        sessionId: client.sessionId,
        itemType,
        itemId,
        matchedUsers: latestMatch.matchedUsers,
        participantCount: latestMatch.matchedUsers.length,
      });

      // Notify all participants about the match
      this.broadcastToSession(client.sessionId, {
        type: WSMessageType.MATCH_FOUND,
        sessionId: client.sessionId,
        userId: client.userId,
        data: latestMatch,
      });
    }

    // Notify other participants about the swipe
    this.broadcastToSession(
      client.sessionId,
      {
        type: WSMessageType.SESSION_UPDATE,
        sessionId: client.sessionId,
        userId: client.userId,
        data: {
          event: "user_swiped",
          username: client.username,
          itemType,
          itemId,
          direction,
        },
      },
      client.userId // Exclude the sender
    );
  }

  private async handleChatMessage(client: WSClient, data: WSMessage) {
    if (!client.sessionId) {
      client.ws.send(
        JSON.stringify({
          type: WSMessageType.ERROR,
          error: "Not in a session",
        })
      );
      return;
    }

    const { message } = data.data;

    // Save message to database
    await SessionService.addMessage(
      client.sessionId,
      client.userId,
      client.username || "",
      message
    );

    // Broadcast to all participants
    this.broadcastToSession(client.sessionId, {
      type: WSMessageType.CHAT_MESSAGE,
      sessionId: client.sessionId,
      userId: client.userId,
      data: {
        username: client.username,
        message,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private broadcastToSession(
    sessionId: string,
    message: WSMessage,
    excludeUserId?: string
  ) {
    const sessionUserIds = this.sessions.get(sessionId);

    if (!sessionUserIds) {
      return;
    }

    const messageStr = JSON.stringify(message);

    sessionUserIds.forEach((userId) => {
      if (userId !== excludeUserId) {
        const client = this.clients.get(userId);
        if (client && client.ws.readyState === 1) {
          client.ws.send(messageStr);
        }
      }
    });
  }

  handleDisconnect(userId: string) {
    const client = this.clients.get(userId);

    if (client) {
      logger.websocketConnection("disconnect", undefined, {
        userId,
        username: client.username,
        sessionId: client.sessionId,
        totalConnections: this.clients.size - 1,
      });

      // Leave any active session
      if (client.sessionId) {
        this.handleLeaveSession(client, client.sessionId);
      }

      // Remove client
      this.clients.delete(userId);
    }
  }
}

const wsManager = new WebSocketManager();

export function setupWebSocket() {
  return {
    open(ws: ServerWebSocket) {
      // Connection established, waiting for authentication
      ws.send(JSON.stringify({ type: "waiting_for_auth" }));
    },

    async message(ws: ServerWebSocket, message: string | Buffer) {
      try {
        const data = JSON.parse(message.toString());

        // First message should be authentication
        if (data.type === "authenticate" && data.token) {
          await wsManager.handleConnection(ws, data.token);

          // Store userId in ws data for later reference
          (ws as ExtendedServerWebSocket).userId = data.userId;
        } else if ((ws as ExtendedServerWebSocket).userId) {
          // Handle other messages
          await wsManager.handleMessage(
            (ws as ExtendedServerWebSocket).userId,
            message.toString()
          );
        } else {
          ws.send(
            JSON.stringify({
              type: WSMessageType.ERROR,
              error: "Not authenticated",
            })
          );
        }
      } catch (error) {
        logger.error(
          "Invalid WebSocket message format",
          error instanceof Error ? error : undefined
        );
        ws.send(
          JSON.stringify({
            type: WSMessageType.ERROR,
            error: "Invalid message format",
          })
        );
      }
    },

    close(ws: ServerWebSocket) {
      const userId = (ws as ExtendedServerWebSocket).userId;
      if (userId) {
        wsManager.handleDisconnect(userId);
      }
    },

    error(_ws: ServerWebSocket, error: Error) {
      logger.error("WebSocket error", error);
    },
  };
}
