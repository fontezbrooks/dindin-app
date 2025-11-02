import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";

type SessionParticipant = {
  userId: string;
  username?: string;
  isHost: boolean;
  joinedAt: number;
  status: "active" | "inactive" | "disconnected";
};

type SessionMatch = {
  recipeId: string;
  recipeName: string;
  matchedAt: number;
  participants: string[];
};

type SessionState = {
  // Session info
  sessionId: string | null;
  sessionCode: string | null;
  isHost: boolean;
  createdAt: number | null;
  expiresAt: number | null;
  status: "idle" | "creating" | "joining" | "active" | "expired" | "error";

  // Participants
  participants: SessionParticipant[];
  maxParticipants: number;

  // Matches
  matches: SessionMatch[];

  // WebSocket connection
  isConnected: boolean;
  connectionStatus:
    | "disconnected"
    | "connecting"
    | "connected"
    | "reconnecting";
  lastPingTime: number | null;

  // Error handling
  error: string | null;
  errorCount: number;
};

type SessionActions = {
  // Session management
  createSession: (
    sessionId: string,
    sessionCode: string,
    expiresAt: number
  ) => void;
  joinSession: (sessionId: string, sessionCode: string) => void;
  leaveSession: () => void;
  updateSessionStatus: (status: SessionState["status"]) => void;

  // Participant management
  addParticipant: (participant: SessionParticipant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipantStatus: (
    userId: string,
    status: SessionParticipant["status"]
  ) => void;
  setParticipants: (participants: SessionParticipant[]) => void;

  // Match management
  addMatch: (match: SessionMatch) => void;
  clearMatches: () => void;

  // WebSocket management
  setConnectionStatus: (status: SessionState["connectionStatus"]) => void;
  updatePingTime: () => void;
  setConnected: (isConnected: boolean) => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
  incrementErrorCount: () => void;
  resetErrorCount: () => void;

  // Utils
  reset: () => void;
  isSessionActive: () => boolean;
  getSessionTimeRemaining: () => number;
};

type SessionStore = SessionState & SessionActions;

const initialState: SessionState = {
  sessionId: null,
  sessionCode: null,
  isHost: false,
  createdAt: null,
  expiresAt: null,
  status: "idle",
  participants: [],
  maxParticipants: 10,
  matches: [],
  isConnected: false,
  connectionStatus: "disconnected",
  lastPingTime: null,
  error: null,
  errorCount: 0,
};

export const useSessionStore = create<SessionStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Session management
        createSession: (sessionId, sessionCode, expiresAt) =>
          set(
            {
              sessionId,
              sessionCode,
              isHost: true,
              createdAt: Date.now(),
              expiresAt,
              status: "active",
              error: null,
            },
            undefined,
            "createSession"
          ),

        joinSession: (sessionId, sessionCode) =>
          set(
            {
              sessionId,
              sessionCode,
              isHost: false,
              createdAt: Date.now(),
              status: "active",
              error: null,
            },
            undefined,
            "joinSession"
          ),

        leaveSession: () =>
          set(
            {
              ...initialState,
            },
            undefined,
            "leaveSession"
          ),

        updateSessionStatus: (status) =>
          set({ status }, undefined, "updateSessionStatus"),

        // Participant management
        addParticipant: (participant) =>
          set(
            (state) => ({
              participants: [...state.participants, participant],
            }),
            undefined,
            "addParticipant"
          ),

        removeParticipant: (userId) =>
          set(
            (state) => ({
              participants: state.participants.filter(
                (p) => p.userId !== userId
              ),
            }),
            undefined,
            "removeParticipant"
          ),

        updateParticipantStatus: (userId, status) =>
          set(
            (state) => ({
              participants: state.participants.map((p) =>
                p.userId === userId ? { ...p, status } : p
              ),
            }),
            undefined,
            "updateParticipantStatus"
          ),

        setParticipants: (participants) =>
          set({ participants }, undefined, "setParticipants"),

        // Match management
        addMatch: (match) =>
          set(
            (state) => ({
              matches: [...state.matches, match],
            }),
            undefined,
            "addMatch"
          ),

        clearMatches: () => set({ matches: [] }, undefined, "clearMatches"),

        // WebSocket management
        setConnectionStatus: (connectionStatus) =>
          set(
            {
              connectionStatus,
              isConnected: connectionStatus === "connected",
            },
            undefined,
            "setConnectionStatus"
          ),

        updatePingTime: () =>
          set({ lastPingTime: Date.now() }, undefined, "updatePingTime"),

        setConnected: (isConnected) =>
          set(
            {
              isConnected,
              connectionStatus: isConnected ? "connected" : "disconnected",
            },
            undefined,
            "setConnected"
          ),

        // Error handling
        setError: (error) =>
          set(
            (state) => ({
              error,
              errorCount: error ? state.errorCount + 1 : state.errorCount,
            }),
            undefined,
            "setError"
          ),

        clearError: () => set({ error: null }, undefined, "clearError"),

        incrementErrorCount: () =>
          set(
            (state) => ({ errorCount: state.errorCount + 1 }),
            undefined,
            "incrementErrorCount"
          ),

        resetErrorCount: () =>
          set({ errorCount: 0 }, undefined, "resetErrorCount"),

        // Utils
        reset: () => set({ ...initialState }, undefined, "reset"),

        isSessionActive: () => {
          const state = get();
          return (
            state.status === "active" &&
            state.sessionId !== null &&
            (state.expiresAt === null || state.expiresAt > Date.now())
          );
        },

        getSessionTimeRemaining: () => {
          const state = get();
          if (!state.expiresAt) {
            return 0;
          }
          return Math.max(0, state.expiresAt - Date.now());
        },
      }),
      {
        name: "session-store",
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          sessionId: state.sessionId,
          sessionCode: state.sessionCode,
          isHost: state.isHost,
          createdAt: state.createdAt,
          expiresAt: state.expiresAt,
          matches: state.matches,
        }),
      }
    ),
    {
      name: "SessionStore",
      enabled: process.env.NODE_ENV !== "production",
    }
  )
);

// Selectors
export const selectActiveParticipants = (state: SessionStore) =>
  state.participants.filter((p) => p.status === "active");

export const selectSessionInfo = (state: SessionStore) => ({
  id: state.sessionId,
  code: state.sessionCode,
  isHost: state.isHost,
  isActive: state.status === "active",
  participantCount: state.participants.length,
  matchCount: state.matches.length,
});

export const selectConnectionHealth = (state: SessionStore) => ({
  isConnected: state.isConnected,
  status: state.connectionStatus,
  lastPing: state.lastPingTime,
  errorCount: state.errorCount,
  isHealthy: state.isConnected && state.errorCount < 3,
});
