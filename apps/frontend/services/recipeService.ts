import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  FetchOptions,
  RawRecipeData,
  UserPreferences,
} from "../types/common";
import type {
  Recipe,
  RecipeBatchResponse,
  RecipeFilters,
  RecipeSwipeAction,
} from "../types/recipe";

// Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const BATCH_SIZE = 10;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Cache keys
const CACHE_PREFIX = "@recipe_cache:";
const LAST_FETCH_KEY = "@last_recipe_fetch";

type CachedData<T> = {
  data: T;
  timestamp: number;
};

/**
 * Recipe Service - Handles all recipe data operations
 */
class RecipeService {
  private token: string | null = null;
  private pendingRequests = new Map<string, Promise<any>>();

  /**
   * Set the authentication token for API requests
   */
  setAuthToken(token: string) {
    this.token = token;
  }

  /**
   * Fetch a batch of recipes with optional filters
   */
  async fetchRecipeBatch(
    cursor?: string,
    filters?: RecipeFilters,
    forceRefresh = false
  ): Promise<RecipeBatchResponse> {
    const cacheKey = this.getCacheKey("batch", cursor, filters);

    // Deduplication - if same request is pending, return it
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    // Check cache if not forcing refresh
    if (!forceRefresh) {
      const cached = await this.getFromCache<RecipeBatchResponse>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Create and store the request promise
    const requestPromise = this.fetchWithRetry<RecipeBatchResponse>(
      "/api/recipes/swipe/batch",
      {
        params: {
          limit: BATCH_SIZE,
          cursor,
          ...this.buildFilterParams(filters),
        },
      }
    )
      .then(async (response) => {
        // Normalize recipe data
        if (response.recipes) {
          response.recipes = response.recipes.map((recipe: RawRecipeData) =>
            this.normalizeRecipeData(recipe)
          );
        }

        // Cache the response
        await this.saveToCache(cacheKey, response);

        // Remove from pending requests
        this.pendingRequests.delete(cacheKey);

        return response;
      })
      .catch((error) => {
        // Remove from pending requests on error
        this.pendingRequests.delete(cacheKey);
        throw error;
      });

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  /**
   * Prefetch next batch of recipes
   */
  async prefetchNextBatch(
    currentCursor?: string,
    filters?: RecipeFilters
  ): Promise<void> {
    try {
      await this.fetchRecipeBatch(currentCursor, filters);
    } catch (error) {
      console.warn("Prefetch failed, will retry on demand:", error);
    }
  }

  /**
   * Record a swipe action
   */
  async recordSwipe(
    sessionId: string,
    recipeId: string,
    action: "like" | "dislike"
  ): Promise<void> {
    try {
      await this.fetchWithRetry(`/api/sessions/${sessionId}/swipe`, {
        method: "POST",
        body: JSON.stringify({
          itemId: recipeId,
          itemType: "recipe",
          action,
        }),
      });
    } catch (error) {
      // Queue for offline sync if network error
      if (this.isNetworkError(error)) {
        await this.queueOfflineSwipe({
          recipeId,
          action,
          timestamp: new Date(),
        });
      } else {
        throw error;
      }
    }
  }

  /**
   * Sync offline swipes when connection restored
   */
  async syncOfflineSwipes(sessionId: string): Promise<void> {
    const queuedSwipes = await this.getOfflineSwipes();

    for (const swipe of queuedSwipes) {
      try {
        await this.recordSwipe(sessionId, swipe.recipeId, swipe.action);
        await this.removeFromOfflineQueue(swipe);
      } catch (error) {
        console.error("Failed to sync swipe:", error);
        break; // Stop syncing if we hit an error
      }
    }
  }

  /**
   * Get user's recipe preferences
   */
  async getUserPreferences(): Promise<RecipeFilters> {
    try {
      const response = await this.fetchWithRetry<UserPreferences>(
        "/api/users/preferences"
      );
      return this.mapUserPreferencesToFilters(response);
    } catch (error) {
      console.error("Failed to fetch user preferences:", error);
      return {}; // Return empty filters on error
    }
  }

  // Private helper methods

  private normalizeRecipeData(rawRecipe: RawRecipeData): Recipe {
    // Import the normalizeRecipe function from types
    const { normalizeRecipe } = require("../types/recipe");
    return normalizeRecipe(rawRecipe);
  }

  private buildFilterParams(
    filters?: RecipeFilters
  ): Record<string, string | number> {
    if (!filters) {
      return {};
    }

    const params: Record<string, string | number> = {};

    if (filters.dietaryTags?.length) {
      params.dietaryTags = filters.dietaryTags.join(",");
    }
    if (filters.cuisine?.length) {
      params.cuisine = filters.cuisine.join(",");
    }
    if (filters.difficulty?.length) {
      params.difficulty = filters.difficulty.join(",");
    }
    if (filters.maxPrepTime) {
      params.maxPrepTime = filters.maxPrepTime;
    }
    if (filters.maxCookTime) {
      params.maxCookTime = filters.maxCookTime;
    }
    if (filters.minCalories) {
      params.minCalories = filters.minCalories;
    }
    if (filters.maxCalories) {
      params.maxCalories = filters.maxCalories;
    }

    return params;
  }

  private async fetchWithRetry<T>(
    endpoint: string,
    options: FetchOptions = {},
    retries = 0
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const { params, ...fetchOptions } = options;

    // Build URL with query params
    const urlWithParams = params
      ? `${url}?${new URLSearchParams(params).toString()}`
      : url;

    // Add auth header if token exists
    const headers = {
      "Content-Type": "application/json",
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...fetchOptions.headers,
    };

    try {
      const response = await fetch(urlWithParams, {
        ...fetchOptions,
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (retries < MAX_RETRIES && this.isRetriableError(error)) {
        await this.delay(RETRY_DELAY * 2 ** retries); // Exponential backoff
        return this.fetchWithRetry<T>(endpoint, options, retries + 1);
      }
      throw error;
    }
  }

  private isRetriableError(error: unknown): boolean {
    // Network errors or 5xx server errors
    if (error instanceof Error) {
      return (
        error.message.includes("Network") ||
        error.message.includes("fetch") ||
        (error.message.includes("HTTP") && error.message.includes("5"))
      );
    }
    return false;
  }

  private isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
      return (
        error.message.includes("Network") || error.message.includes("fetch")
      );
    }
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getCacheKey(
    type: string,
    cursor?: string,
    filters?: RecipeFilters
  ): string {
    const filterKey = filters ? JSON.stringify(filters) : "none";
    return `${CACHE_PREFIX}${type}:${cursor || "initial"}:${filterKey}`;
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const { data, timestamp }: CachedData<T> = JSON.parse(cached);

      // Check if cache is still valid
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }

      // Remove expired cache
      await AsyncStorage.removeItem(key);
      return null;
    } catch (error) {
      console.error("Cache read error:", error);
      return null;
    }
  }

  private async saveToCache<T>(key: string, data: T): Promise<void> {
    try {
      const cacheData: CachedData<T> = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.error("Cache write error:", error);
    }
  }

  private async queueOfflineSwipe(swipe: RecipeSwipeAction): Promise<void> {
    try {
      const queueKey = "@offline_swipes";
      const existing = await AsyncStorage.getItem(queueKey);
      const queue = existing ? JSON.parse(existing) : [];
      queue.push(swipe);
      await AsyncStorage.setItem(queueKey, JSON.stringify(queue));
    } catch (error) {
      console.error("Failed to queue offline swipe:", error);
    }
  }

  private async getOfflineSwipes(): Promise<RecipeSwipeAction[]> {
    try {
      const queueKey = "@offline_swipes";
      const existing = await AsyncStorage.getItem(queueKey);
      return existing ? JSON.parse(existing) : [];
    } catch (error) {
      console.error("Failed to get offline swipes:", error);
      return [];
    }
  }

  private async removeFromOfflineQueue(
    swipe: RecipeSwipeAction
  ): Promise<void> {
    try {
      const queueKey = "@offline_swipes";
      const queue = await this.getOfflineSwipes();
      const filtered = queue.filter(
        (s) => s.recipeId !== swipe.recipeId || s.timestamp !== swipe.timestamp
      );
      await AsyncStorage.setItem(queueKey, JSON.stringify(filtered));
    } catch (error) {
      console.error("Failed to remove from offline queue:", error);
    }
  }

  private mapUserPreferencesToFilters(
    preferences: UserPreferences
  ): RecipeFilters {
    const filters: RecipeFilters = {};

    if (preferences.dietaryRestrictions?.length) {
      filters.dietaryTags = preferences.dietaryRestrictions;
    }
    if (preferences.cuisinePreferences?.length) {
      filters.cuisine = preferences.cuisinePreferences;
    }
    if (preferences.maxCookingTime) {
      filters.maxCookTime = preferences.maxCookingTime;
    }

    return filters;
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error("Failed to clear cache:", error);
    }
  }
}

// Export singleton instance
export const recipeService = new RecipeService();

// Export for testing
export { RecipeService };
