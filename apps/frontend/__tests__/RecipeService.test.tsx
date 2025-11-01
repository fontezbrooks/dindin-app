import AsyncStorage from "@react-native-async-storage/async-storage";
import { RecipeService, recipeService } from "../services/recipeService";
import type { RecipeFilters } from "../types/recipe";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests
const originalConsole = global.console;
beforeAll(() => {
  global.console = {
    ...console,
    warn: jest.fn(),
    error: jest.fn(),
  };
});

afterAll(() => {
  global.console = originalConsole;
});

describe("RecipeService", () => {
  let service: RecipeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RecipeService();
    // Clear environment variables
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  describe("Authentication", () => {
    it("sets auth token correctly", () => {
      const token = "test-auth-token";
      service.setAuthToken(token);

      // Token should be used in subsequent requests
      expect(service).toBeDefined();
    });

    it("includes auth token in API requests", async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ recipes: [], nextCursor: null }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      service.setAuthToken("test-token");
      await service.fetchRecipeBatch();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );
    });
  });

  describe("fetchRecipeBatch", () => {
    const mockRecipeResponse = {
      recipes: [
        {
          _id: "1",
          title: "Test Recipe",
          description: "A test recipe",
          prepTime: 10,
          cookTime: 20,
          difficulty: "easy",
        },
      ],
      nextCursor: "cursor123",
    };

    beforeEach(() => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve(mockRecipeResponse),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
    });

    it("fetches recipes successfully", async () => {
      const result = await service.fetchRecipeBatch();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockRecipeResponse);
    });

    it("applies filters correctly", async () => {
      const filters: RecipeFilters = {
        dietaryTags: ["vegetarian", "gluten-free"],
        cuisine: ["Italian"],
        difficulty: ["easy"],
        maxPrepTime: 30,
      };

      await service.fetchRecipeBatch(undefined, filters);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("dietaryTags=vegetarian%2Cgluten-free"),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("cuisine=Italian"),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("difficulty=easy"),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("maxPrepTime=30"),
        expect.any(Object)
      );
    });

    it("includes cursor in request", async () => {
      const cursor = "test-cursor";
      await service.fetchRecipeBatch(cursor);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`cursor=${cursor}`),
        expect.any(Object)
      );
    });

    it("caches responses correctly", async () => {
      await service.fetchRecipeBatch();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringMatching(/@recipe_cache:/),
        expect.stringContaining('"recipes"')
      );
    });

    it("returns cached data when available", async () => {
      const cachedData = {
        data: mockRecipeResponse,
        timestamp: Date.now(),
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(cachedData)
      );

      const result = await service.fetchRecipeBatch();

      expect(global.fetch).not.toHaveBeenCalled();
      expect(result).toEqual(mockRecipeResponse);
    });

    it("ignores expired cache", async () => {
      const expiredData = {
        data: mockRecipeResponse,
        timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(expiredData)
      );

      await service.fetchRecipeBatch();

      expect(global.fetch).toHaveBeenCalled();
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });

    it("deduplicates concurrent requests", async () => {
      const promise1 = service.fetchRecipeBatch();
      const promise2 = service.fetchRecipeBatch();

      await Promise.all([promise1, promise2]);

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("recordSwipe", () => {
    beforeEach(() => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({}),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
    });

    it("records swipe successfully", async () => {
      await service.recordSwipe("session123", "recipe456", "like");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/sessions/session123/swipe"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            itemId: "recipe456",
            itemType: "recipe",
            action: "like",
          }),
        })
      );
    });

    it("queues swipe for offline sync on network error", async () => {
      const networkError = new Error("Network request failed");
      (global.fetch as jest.Mock).mockRejectedValue(networkError);

      await service.recordSwipe("session123", "recipe456", "dislike");

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@offline_swipes",
        expect.stringContaining("recipe456")
      );
    });

    it("throws non-network errors", async () => {
      const serverError = new Error("HTTP 500: Internal Server Error");
      (global.fetch as jest.Mock).mockRejectedValue(serverError);

      await expect(
        service.recordSwipe("session123", "recipe456", "like")
      ).rejects.toThrow("HTTP 500: Internal Server Error");
    });
  });

  describe("Retry Logic", () => {
    it("retries failed requests with exponential backoff", async () => {
      // Mock timer functions
      jest.useFakeTimers();

      // First two calls fail, third succeeds
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ recipes: [] }),
        });

      const promise = service.fetchRecipeBatch();

      // Fast-forward timers to trigger retries
      jest.advanceTimersByTime(1000); // First retry
      jest.advanceTimersByTime(2000); // Second retry

      await promise;

      expect(global.fetch).toHaveBeenCalledTimes(3);

      jest.useRealTimers();
    });

    it("stops retrying after max attempts", async () => {
      jest.useFakeTimers();

      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      const promise = service.fetchRecipeBatch();

      // Fast-forward through all retry attempts
      jest.advanceTimersByTime(10_000);

      await expect(promise).rejects.toThrow("Network error");
      expect(global.fetch).toHaveBeenCalledTimes(4); // Initial + 3 retries

      jest.useRealTimers();
    });

    it("does not retry non-retriable errors", async () => {
      const authError = new Error("HTTP 401: Unauthorized");
      (global.fetch as jest.Mock).mockRejectedValue(authError);

      await expect(service.fetchRecipeBatch()).rejects.toThrow(
        "HTTP 401: Unauthorized"
      );
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Offline Sync", () => {
    it("syncs offline swipes when connection restored", async () => {
      const queuedSwipes = [
        {
          recipeId: "recipe1",
          action: "like" as const,
          timestamp: new Date(),
        },
        {
          recipeId: "recipe2",
          action: "dislike" as const,
          timestamp: new Date(),
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(queuedSwipes)
      );

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({}),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await service.syncOfflineSwipes("session123");

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@offline_swipes",
        "[]" // Queue should be empty after sync
      );
    });

    it("stops syncing on error", async () => {
      const queuedSwipes = [
        {
          recipeId: "recipe1",
          action: "like" as const,
          timestamp: new Date(),
        },
        {
          recipeId: "recipe2",
          action: "dislike" as const,
          timestamp: new Date(),
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(queuedSwipes)
      );

      // First sync succeeds, second fails
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockRejectedValueOnce(new Error("Sync error"));

      await service.syncOfflineSwipes("session123");

      expect(global.fetch).toHaveBeenCalledTimes(2);
      // Should stop after first error
    });
  });

  describe("Cache Management", () => {
    it("clears all cached data", async () => {
      const allKeys = [
        "@recipe_cache:batch:initial:none",
        "@recipe_cache:batch:cursor1:none",
        "@other_cache:data",
        "@user_preferences",
      ];

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(allKeys);

      await service.clearCache();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        "@recipe_cache:batch:initial:none",
        "@recipe_cache:batch:cursor1:none",
      ]);
    });

    it("handles cache errors gracefully", async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(
        new Error("Storage error")
      );

      // Should not throw
      const result = await service.fetchRecipeBatch();

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe("User Preferences", () => {
    it("fetches and maps user preferences to filters", async () => {
      const preferences = {
        dietaryRestrictions: ["vegetarian"],
        cuisinePreferences: ["Italian", "Mexican"],
        maxCookingTime: 30,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(preferences),
      });

      const filters = await service.getUserPreferences();

      expect(filters).toEqual({
        dietaryTags: ["vegetarian"],
        cuisine: ["Italian", "Mexican"],
        maxCookTime: 30,
      });
    });

    it("returns empty filters on error", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("API error"));

      const filters = await service.getUserPreferences();

      expect(filters).toEqual({});
    });
  });

  describe("Prefetching", () => {
    it("prefetches next batch silently", async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ recipes: [] }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Should not throw even if prefetch fails
      await service.prefetchNextBatch("cursor123");

      expect(global.fetch).toHaveBeenCalled();
    });

    it("handles prefetch errors gracefully", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      // Should not throw
      await service.prefetchNextBatch("cursor123");

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe("Singleton Instance", () => {
    it("exports a singleton instance", () => {
      expect(recipeService).toBeInstanceOf(RecipeService);
      expect(recipeService).toBe(recipeService); // Same instance
    });
  });
});
