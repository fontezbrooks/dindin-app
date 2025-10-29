import { useAuth } from "@clerk/clerk-expo";
import {
  createRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSharedValue } from "react-native-reanimated";
import type { SwipeableCardRefType } from "../components/SwipeCards";
import { recipeService } from "../services/recipeService";
import type { RecipeCard, RecipeFilters } from "../types/recipe";
import { recipeToCard } from "../types/recipe";

type UseRecipeSwipeOptions = {
  sessionId?: string;
  filters?: RecipeFilters;
  onMatch?: (recipeId: string) => void;
};

export const useRecipeSwipe = (options: UseRecipeSwipeOptions = {}) => {
  const { sessionId, filters, onMatch } = options;
  const { getToken } = useAuth();

  // State
  const [recipes, setRecipes] = useState<RecipeCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  // Refs
  const activeIndex = useSharedValue(0);
  const loadingNextBatch = useRef(false);
  const swipeHistory = useRef<Map<string, "like" | "dislike">>(new Map());
  const timeouts = useRef<NodeJS.Timeout[]>([]);

  // Create refs for each card
  const refs = useMemo(() => {
    const pendingRefs = [];
    for (let i = 0; i < recipes.length; i++) {
      pendingRefs.push(createRef<SwipeableCardRefType>());
    }
    return pendingRefs;
  }, [recipes.length]);

  // Initialize service with auth token
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = await getToken();
        if (token) {
          recipeService.setAuthToken(token);
        }
      } catch (error) {
        console.error("Failed to get auth token:", error);
      }
    };
    initAuth();
  }, [getToken]);

  // Load initial batch of recipes
  const loadRecipes = useCallback(
    async (isInitial = false) => {
      if (loadingNextBatch.current && !isInitial) return;

      loadingNextBatch.current = true;
      setIsLoading(isInitial);
      setError(null);

      try {
        // Get user preferences if not using custom filters
        const effectiveFilters =
          filters || (await recipeService.getUserPreferences());

        const response = await recipeService.fetchRecipeBatch(
          isInitial ? undefined : nextCursor,
          effectiveFilters,
          isInitial
        );

        const newRecipeCards = response.recipes.map(recipeToCard);

        if (isInitial) {
          setRecipes(newRecipeCards);
        } else {
          setRecipes((prev) => [...prev, ...newRecipeCards]);
        }

        setHasMore(response.hasMore);
        setNextCursor(response.nextCursor);

        // Prefetch next batch
        if (response.hasMore && response.nextCursor) {
          recipeService.prefetchNextBatch(
            response.nextCursor,
            effectiveFilters
          );
        }
      } catch (err) {
        console.error("Failed to load recipes:", err);
        setError(err instanceof Error ? err.message : "Failed to load recipes");
      } finally {
        setIsLoading(false);
        loadingNextBatch.current = false;
      }
    },
    [filters, nextCursor]
  );

  // Initial load
  useEffect(() => {
    loadRecipes(true);
  }, []);

  // Load more when running low on cards
  useEffect(() => {
    const currentIndex = Math.floor(activeIndex.value);
    const remainingCards = recipes.length - currentIndex;

    // Load more when we have less than 5 cards remaining
    if (remainingCards < 5 && hasMore && !loadingNextBatch.current) {
      loadRecipes();
    }
  }, [activeIndex.value, recipes.length, hasMore, loadRecipes]);

  // Swipe handlers
  const handleSwipe = useCallback(
    async (action: "like" | "dislike") => {
      const currentIndex = Math.floor(activeIndex.value);
      if (currentIndex >= recipes.length) return;

      const recipe = recipes[currentIndex];

      // Record swipe locally
      swipeHistory.current.set(recipe._id, action);

      // Send to backend if session exists
      if (sessionId) {
        try {
          await recipeService.recordSwipe(sessionId, recipe._id, action);

          // Check for match (simplified - real implementation would use WebSocket)
          if (action === "like" && onMatch) {
            // This would normally come from WebSocket
            // For now, just simulate a random match
            if (Math.random() > 0.7) {
              onMatch(recipe._id);
            }
          }
        } catch (error) {
          console.error("Failed to record swipe:", error);
        }
      }

      // Update active index
      activeIndex.value = activeIndex.value + 1;
    },
    [activeIndex, recipes, sessionId, onMatch]
  );

  const swipeRight = useCallback(() => {
    const currentIndex = Math.floor(activeIndex.value);
    if (!refs[currentIndex]) return;

    refs[currentIndex].current?.swipeRight();
    handleSwipe("like");
  }, [activeIndex.value, refs, handleSwipe]);

  const swipeLeft = useCallback(() => {
    const currentIndex = Math.floor(activeIndex.value);
    if (!refs[currentIndex]) return;

    refs[currentIndex].current?.swipeLeft();
    handleSwipe("dislike");
  }, [activeIndex.value, refs, handleSwipe]);

  const reset = useCallback(() => {
    // Reset active index
    activeIndex.value = 0;

    // Clear swipe history
    swipeHistory.current.clear();

    // Reset all cards with animation
    refs.forEach((ref, index) => {
      timeouts.current.push(
        setTimeout(() => {
          ref.current?.reset();
        }, index * 100)
      );
    });

    // Reload recipes
    loadRecipes(true);
  }, [refs, activeIndex, loadRecipes]);

  const undo = useCallback(() => {
    if (activeIndex.value <= 0) return;

    // Move back one card
    activeIndex.value = Math.max(0, activeIndex.value - 1);

    // Remove last swipe from history
    const currentIndex = Math.floor(activeIndex.value);
    if (currentIndex < recipes.length) {
      const recipe = recipes[currentIndex];
      swipeHistory.current.delete(recipe._id);
    }
  }, [activeIndex, recipes]);

  // Sync offline swipes when reconnected
  useEffect(() => {
    if (!sessionId) return;

    const syncOffline = async () => {
      try {
        await recipeService.syncOfflineSwipes(sessionId);
      } catch (error) {
        console.error("Failed to sync offline swipes:", error);
      }
    };

    // Check network status and sync
    const handleOnline = () => {
      syncOffline();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [sessionId]);

  // Cleanup
  useEffect(
    () => () => {
      timeouts.current.forEach((timeout) => clearTimeout(timeout));
    },
    []
  );

  return {
    // Data
    recipes,
    currentRecipe: recipes[Math.floor(activeIndex.value)],
    isLoading,
    error,
    hasMore,

    // Controls
    activeIndex,
    refs,
    swipeRight,
    swipeLeft,
    reset,
    undo,

    // Stats
    likedCount: Array.from(swipeHistory.current.values()).filter(
      (v) => v === "like"
    ).length,
    dislikedCount: Array.from(swipeHistory.current.values()).filter(
      (v) => v === "dislike"
    ).length,
    swipeHistory: swipeHistory.current,

    // Actions
    reload: () => loadRecipes(true),
  };
};
