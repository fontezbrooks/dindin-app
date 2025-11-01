import type { ServerWebSocket } from "bun";
import type { ObjectId } from "mongodb";

// User types
export type User = {
  _id?: ObjectId;
  clerkUserId: string;
  email: string;
  username?: string;
  profile: UserProfile;
  subscription: SubscriptionPlan;
  createdAt: Date;
  updatedAt: Date;
};

export type UserProfile = {
  dietaryPreferences: string[];
  cuisinePreferences: string[];
  allergies?: string[];
  savedRecipes: ObjectId[];
  savedRestaurants: ObjectId[];
  shoppingLists: ShoppingList[];
  diningHistory: DiningHistoryEntry[];
};

export type ShoppingList = {
  _id?: ObjectId;
  recipeId: ObjectId;
  recipeName: string;
  ingredients: ShoppingListIngredient[];
  createdAt: Date;
  completedAt?: Date;
};

export type ShoppingListIngredient = {
  name: string;
  amount: string;
  unit: string;
  checked: boolean;
};

export type DiningHistoryEntry = {
  type: "recipe" | "restaurant";
  itemId: ObjectId;
  itemName: string;
  date: Date;
  rating?: number;
  notes?: string;
};

export const SubscriptionPlan = {
  FREE: "free",
  PRO: "pro",
} as const;
export type SubscriptionPlan =
  (typeof SubscriptionPlan)[keyof typeof SubscriptionPlan];

// Session types
export type DinnerSession = {
  _id?: ObjectId;
  sessionCode: string;
  hostUserId: string;
  participants: SessionParticipant[];
  status: SessionStatus;
  swipeData: SwipeData[];
  matches: Match[];
  messages: SessionMessage[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type SessionParticipant = {
  userId: string;
  username: string;
  joinedAt: Date;
  isActive: boolean;
};

export const SessionStatus = {
  WAITING: "waiting",
  ACTIVE: "active",
  COMPLETED: "completed",
  EXPIRED: "expired",
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export type SwipeData = {
  userId: string;
  itemType: "recipe" | "restaurant";
  itemId: ObjectId;
  direction: "left" | "right";
  timestamp: Date;
};

export type Match = {
  itemType: "recipe" | "restaurant";
  itemId: ObjectId;
  itemName: string;
  matchedUsers: string[];
  matchedAt: Date;
};

export type SessionMessage = {
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
};

// Restaurant types (mock for now)
export type Restaurant = {
  _id?: ObjectId;
  name: string;
  cuisine: string[];
  priceRange: number; // 1-4
  rating: number;
  description: string;
  address: string;
  imageUrl?: string;
  hours?: RestaurantHours;
  tags: string[];
  isActive: boolean;
};

export type RestaurantHours = {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
};

// Recipe type (from your schema)
export type Recipe = {
  _id?: ObjectId;
  title: string;
  description: string;
  cuisine: string[];
  cuisine_type: string;
  dietary_tags: string[];
  difficulty: string;
  prep_time: number;
  cook_time: number;
  total_time?: number;
  servings: number;
  ingredients: RecipeIngredient[];
  instructions: RecipeInstruction[];
  nutrition: NutritionInfo;
  image_url: string;
  tags: string[];
  likes: number;
  isActive: boolean;
};

export type RecipeIngredient = {
  name: string;
  amount: string;
  unit: string;
};

export type RecipeInstruction = {
  step: number;
  description: string;
};

export type NutritionInfo = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
};

// Auth types
export type ClerkUser = {
  id: string;
  emailAddresses: Array<{
    emailAddress: string;
  }>;
  username?: string;
};

// WebSocket types
export type WSMessage = {
  type: WSMessageType;
  sessionId: string;
  userId: string;
  data: Record<string, unknown>;
};

export const WSMessageType = {
  JOIN_SESSION: "join_session",
  LEAVE_SESSION: "leave_session",
  SWIPE: "swipe",
  MATCH_FOUND: "match_found",
  CHAT_MESSAGE: "chat_message",
  SESSION_UPDATE: "session_update",
  ERROR: "error",
} as const;

export type WSMessageType = (typeof WSMessageType)[keyof typeof WSMessageType];

export const WSConnectionStatus = {
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
} as const;

export type WSConnectionStatus =
  (typeof WSConnectionStatus)[keyof typeof WSConnectionStatus];

export type WSClient = {
  ws: WebSocket;
  userId: string;
  username: string;
};

export const HTTPStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SUBSTRING: 7,
  MULTIPLE_CHOICES: 300,
  RATE_LIMIT_EXCEEDED: 429,
} as const;

export type HTTPStatus = (typeof HTTPStatus)[keyof typeof HTTPStatus];

export type CacheInvalidateMethod = "POST" | "PUT" | "PATCH" | "DELETE" | "WS";

export const Calculations = {
  CACHE_TTL: 3600, // 1 hour in seconds
  X_RATE_LIMIT_RESET: 1000, // Convert seconds to milliseconds
  CLEAN_MEMORY_INTERVAL: 60_000, // 1 minute in milliseconds
  SESSION_CODE_RADIX: 36, // Base 36 for alphanumeric session codes
  SESSION_CODE_LENGTH: 8, // Number of characters in session code
  SESSION_MAX_PARTICIPANTS: 5, // Maximum participants per session
};

// Error tracking types
export type ErrorTrackingConfig = {
  dsn: string;
  environment: string;
  release: string;
};

export type ErrorTrackingTransaction = {
  name: string;
  startTime: number;
  finish: () => void;
};

// MongoDB filter types
export type RestaurantFilter = {
  isActive?: boolean;
  cuisine?: string | { $in: string[] };
  priceRange?: number;
  rating?: { $gte: number };
  $text?: { $search: string };
  _id?: ObjectId | { $nin: ObjectId[] };
  $or?: Array<{
    cuisine?: { $in: string[] };
    priceRange?: { $in: number[] };
  }>;
};

export type RecipeFilter = {
  isActive?: boolean;
  cuisine?: string | { $in: string[] };
  dietary_tags?: { $in: string[] };
  difficulty?: string;
  $text?: { $search: string };
  _id?: ObjectId | { $nin: ObjectId[] };
  tags?: { $in: string[] };
  $or?: Array<{
    cuisine?: { $in: string[] };
    tags?: { $in: string[] };
  }>;
};

// Extended WebSocket types for ServerWebSocket
export interface ExtendedServerWebSocket extends ServerWebSocket {
  userId?: string;
}
