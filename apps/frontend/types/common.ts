/**
 * Common type definitions used across the frontend
 */

/**
 * API Error response structure
 */
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
}

/**
 * Network error structure
 */
export interface NetworkError extends Error {
  code?: string;
  status?: number;
  response?: Response;
}

/**
 * User preferences from API
 */
export interface UserPreferences {
  dietaryRestrictions?: string[];
  cuisinePreferences?: string[];
  maxCookingTime?: number;
  allergies?: string[];
  skillLevel?: "beginner" | "intermediate" | "advanced";
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

/**
 * Fetch options for API calls
 */
export interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: string;
  params?: Record<string, string | number | boolean>;
  signal?: AbortSignal;
}

/**
 * Raw recipe data from backend (before normalization)
 */
export interface RawRecipeData {
  _id: string | { $oid: string };
  title: string;
  description: string;
  image_url?: string;
  imageUrl?: string;
  cook_time?: number;
  cookTime?: number;
  prep_time?: number;
  prepTime?: number;
  total_time?: number;
  totalTime?: number;
  difficulty?: string;
  cuisine?: string[];
  cuisine_type?: string;
  cuisineType?: string;
  dietary_tags?: string[];
  dietaryTags?: string[];
  ingredients?: Array<{
    name: string;
    amount: string;
    unit: string;
  }>;
  instructions?: Array<{
    step: number;
    description: string;
  }>;
  tags?: string[];
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
  };
  servings?: number;
  isActive?: boolean;
  likes?: number;
}

/**
 * Error info for error boundaries
 */
export interface ErrorInfo {
  componentStack: string;
  digest?: string;
}

/**
 * Type guard to check if error is a NetworkError
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return (
    error instanceof Error &&
    (error.message.includes("Network") ||
      error.message.includes("fetch") ||
      "status" in error)
  );
}

/**
 * Type guard to check if error has a message
 */
export function isErrorWithMessage(error: unknown): error is Error {
  return (
    error !== null &&
    error !== undefined &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as Error).message === "string"
  );
}

/**
 * Get error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unknown error occurred";
}
