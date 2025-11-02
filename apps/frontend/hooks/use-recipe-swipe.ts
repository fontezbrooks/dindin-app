import { useAuth } from "@clerk/clerk-expo";
import {
  createRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useShallow } from "zustand/react/shallow";
import type { SwipeableCardRefType } from "../components/SwipeCards";
import { recipeService } from "../services/recipeService";
import {
  selectCurrentRecipe,
  selectIsNearEnd,
  selectRemainingRecipes,
  selectSwipeStats,
  usePreferencesStore,
  useRecipeStore,
  useSessionStore,
} from "../stores";
import type { RecipeFilters } from "../types/recipe";
import { recipeToCard } from "../types/recipe";

type UseRecipeSwipeOptions = {
  sessionId?: string;
  filters?: RecipeFilters;
  onMatch?: (recipeId: string) => void;
};

export const useRecipeSwipe = (options: UseRecipeSwipeOptions = {}) => {
  const { sessionId = useSessionStore.getState().sessionId, filters, onMatch } = options;
  const { getToken } = useAuth();

  // Zustand stores
  const {
    recipes,
    currentIndex,
    isLoading,
    error,
    hasMore,
    nextCursor,
    setRecipes,
    addRecipes,
    setLoading,
    setError,
    setHasMore,
    setNextCursor,
    recordSwipe,
    undoLastSwipe,
    setCurrentIndex,
    reset,
    getPendingSyncs,
    markSwipeAsSynced,
  } = useRecipeStore();

  const { getRecipeFilters } = usePreferencesStore();
  const { isSessionActive, addMatch } = useSessionStore();

  // Get selectors
  const currentRecipe = useRecipeStore(selectCurrentRecipe);
  const remainingCards = useRecipeStore(selectRemainingRecipes);
  const swipeStats = useRecipeStore(useShallow(selectSwipeStats));
  const isNearEnd = useRecipeStore((state) => selectIsNearEnd(state, 5));

  // Refs
  const loadingNextBatch = useRef(false);
  const timeouts = useRef<NodeJS.Timeout[]>([]);
  const authInitialized = useRef(false);
  const hasInitiallyLoaded = useRef(false);

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
        authInitialized.current = true;
      } catch (error) {
        console.error("Failed to get auth token:", error);
        authInitialized.current = true; // Continue even if auth fails
      }
    };

    if (!authInitialized.current) {
      initAuth();
    }
  }, [getToken]);

  // Load recipes
  const loadRecipes = useCallback(
    async (isInitial = false, cursor?: string) => {
      if (loadingNextBatch.current && !isInitial) return;

      loadingNextBatch.current = true;
      setLoading(isInitial);
      setError(null);

      try {
        // Ensure auth is initialized before making API calls
        if (!authInitialized.current) {
          const token = await getToken();
          if (token) {
            recipeService.setAuthToken(token);
          }
        }

        // Get user preferences if not using custom filters
        const effectiveFilters = filters || getRecipeFilters();

        const response = await recipeService.fetchRecipeBatch(
          isInitial ? undefined : cursor || nextCursor,
          effectiveFilters,
          isInitial
        );

        const newRecipeCards = response.recipes.map(recipeToCard);

        if (isInitial) {
          setRecipes(newRecipeCards);
        } else {
          addRecipes(newRecipeCards);
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
        setLoading(false);
        loadingNextBatch.current = false;
      }
    },
    [
      filters,
      getToken,
      nextCursor,
      getRecipeFilters,
      setRecipes,
      addRecipes,
      setLoading,
      setError,
      setHasMore,
      setNextCursor,
    ]
  );

  // Initial load (wait for auth) - only once!
  useEffect(() => {
    if (authInitialized.current && !hasInitiallyLoaded.current) {
      hasInitiallyLoaded.current = true;
      loadRecipes(true);
    }
  }, [loadRecipes]);

  // Load more when running low on cards
  useEffect(() => {
    if (!hasInitiallyLoaded.current) return;

    if (isNearEnd && hasMore && !loadingNextBatch.current && nextCursor && !isLoading) {
      loadRecipes(false, nextCursor);
    }
  }, [isNearEnd, hasMore, nextCursor, isLoading, loadRecipes]);

  // Swipe handlers
  const handleSwipe = useCallback(
    async (action: "like" | "dislike") => {
      if (!currentRecipe) return;

      // Record swipe in store
      recordSwipe(currentRecipe._id, action);

      // Send to backend if session exists
      if (sessionId && isSessionActive()) {
        try {
          await recipeService.recordSwipe(sessionId, currentRecipe._id, action);
          markSwipeAsSynced(currentRecipe._id);

          // Check for match
          if (action === "like" && onMatch) {
            // This would normally come from WebSocket
            // For now, just simulate a random match
            if (Math.random() > 0.7) {
              onMatch(currentRecipe._id);
              addMatch({
                recipeId: currentRecipe._id,
                recipeName: currentRecipe.title,
                matchedAt: Date.now(),
                participants: [],
              });
            }
          }
        } catch (error) {
          console.error("Failed to record swipe:", error);
          // Swipe already recorded locally, will be synced later
        }
      }
    },
    [currentRecipe, sessionId, isSessionActive, recordSwipe, markSwipeAsSynced, onMatch, addMatch]
  );

  const swipeRight = useCallback(() => {
    if (!refs[currentIndex]) return;

    refs[currentIndex].current?.swipeRight();
    handleSwipe("like");
  }, [currentIndex, refs, handleSwipe]);

  const swipeLeft = useCallback(() => {
    if (!refs[currentIndex]) return;

    refs[currentIndex].current?.swipeLeft();
    handleSwipe("dislike");
  }, [currentIndex, refs, handleSwipe]);

  const resetSwipes = useCallback(() => {
    // Reset all cards with animation
    refs.forEach((ref, index) => {
      timeouts.current.push(
        setTimeout(() => {
          ref.current?.reset();
        }, index * 100)
      );
    });

    // Reset store and reload
    reset();
    hasInitiallyLoaded.current = false;

    // Use setTimeout to avoid immediate re-render issues
    setTimeout(() => {
      hasInitiallyLoaded.current = true;
      loadRecipes(true);
    }, 100);
  }, [refs, reset, loadRecipes]);

  const undo = useCallback(() => {
    if (currentIndex <= 0) return;
    undoLastSwipe();
  }, [currentIndex, undoLastSwipe]);

  // Sync offline swipes when reconnected
  useEffect(() => {
    if (!sessionId || !isSessionActive()) return;

    const syncOfflineSwipes = async () => {
      const pendingSwipes = getPendingSyncs();
      if (pendingSwipes.length === 0) return;

      try {
        // Sync all pending swipes
        for (const swipe of pendingSwipes) {
          await recipeService.recordSwipe(sessionId, swipe.recipeId, swipe.action);
          markSwipeAsSynced(swipe.recipeId);
        }
      } catch (error) {
        console.error("Failed to sync offline swipes:", error);
      }
    };

    // Check network status and sync
    const handleOnline = () => {
      syncOfflineSwipes();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [sessionId, isSessionActive, getPendingSyncs, markSwipeAsSynced]);

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
    currentRecipe,
    isLoading,
    error,
    hasMore,

    // Controls
    activeIndex: { value: currentIndex },
    refs,
    swipeRight,
    swipeLeft,
    reset: resetSwipes,
    undo,

    // Stats
    likedCount: swipeStats.liked,
    dislikedCount: swipeStats.disliked,
    swipeHistory: new Map(), // For backwards compatibility

    // Actions
    reload: () => loadRecipes(true),
  };
};