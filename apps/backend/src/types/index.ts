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

export enum SubscriptionPlan {
  FREE = "free",
  PRO = "pro",
}

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

export enum SessionStatus {
  WAITING = "waiting",
  ACTIVE = "active",
  COMPLETED = "completed",
  EXPIRED = "expired",
}

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
  data: any;
};

export enum WSMessageType {
  JOIN_SESSION = "join_session",
  LEAVE_SESSION = "leave_session",
  SWIPE = "swipe",
  MATCH_FOUND = "match_found",
  CHAT_MESSAGE = "chat_message",
  SESSION_UPDATE = "session_update",
  ERROR = "error",
}
