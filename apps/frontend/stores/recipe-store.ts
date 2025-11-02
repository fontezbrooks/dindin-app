import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import type { RecipeCard, RecipeFilters } from "../types/recipe";

type SwipeAction = {
  recipeId: string;
  action: "like" | "dislike";
  timestamp: number;
  synced: boolean;
};

type RecipeState = {
  // Recipe data
  recipes: RecipeCard[];
  currentIndex: number;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  nextCursor: string | undefined;

  // Swipe tracking
  swipeHistory: SwipeAction[];
  pendingSyncs: SwipeAction[];

  // User preferences and filters
  filters: RecipeFilters | null;

  // Stats
  likedCount: number;
  dislikedCount: number;
};

type RecipeActions = {
  // Recipe management
  setRecipes: (recipes: RecipeCard[]) => void;
  addRecipes: (recipes: RecipeCard[]) => void;
  clearRecipes: () => void;

  // Loading state
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setHasMore: (hasMore: boolean) => void;
  setNextCursor: (cursor: string | undefined) => void;

  // Swipe actions
  recordSwipe: (recipeId: string, action: "like" | "dislike") => void;
  undoLastSwipe: () => void;
  clearSwipeHistory: () => void;
  markSwipeAsSynced: (recipeId: string) => void;

  // Navigation
  setCurrentIndex: (index: number) => void;
  nextRecipe: () => void;
  previousRecipe: () => void;

  // Filters
  setFilters: (filters: RecipeFilters | null) => void;

  // Utils
  reset: () => void;
  getPendingSyncs: () => SwipeAction[];
  getRecipeAtIndex: (index: number) => RecipeCard | undefined;
};

type RecipeStore = RecipeState & RecipeActions;

const initialState: RecipeState = {
  recipes: [],
  currentIndex: 0,
  isLoading: false,
  error: null,
  hasMore: true,
  nextCursor: undefined,
  swipeHistory: [],
  pendingSyncs: [],
  filters: null,
  likedCount: 0,
  dislikedCount: 0,
};

export const useRecipeStore = create<RecipeStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Recipe management
        setRecipes: (recipes) =>
          set({ recipes, currentIndex: 0 }, undefined, "setRecipes"),

        addRecipes: (newRecipes) =>
          set(
            (state) => ({ recipes: [...state.recipes, ...newRecipes] }),
            undefined,
            "addRecipes"
          ),

        clearRecipes: () =>
          set({ recipes: [], currentIndex: 0 }, undefined, "clearRecipes"),

        // Loading state
        setLoading: (isLoading) => set({ isLoading }, undefined, "setLoading"),
        setError: (error) => set({ error }, undefined, "setError"),
        setHasMore: (hasMore) => set({ hasMore }, undefined, "setHasMore"),
        setNextCursor: (nextCursor) =>
          set({ nextCursor }, undefined, "setNextCursor"),

        // Swipe actions
        recordSwipe: (recipeId, action) => {
          const swipe: SwipeAction = {
            recipeId,
            action,
            timestamp: Date.now(),
            synced: false,
          };

          set(
            (state) => {
              const newHistory = [...state.swipeHistory, swipe];
              const newPending = [...state.pendingSyncs, swipe];
              const likedCount = newHistory.filter(
                (s) => s.action === "like"
              ).length;
              const dislikedCount = newHistory.filter(
                (s) => s.action === "dislike"
              ).length;

              return {
                swipeHistory: newHistory,
                pendingSyncs: newPending,
                likedCount,
                dislikedCount,
                currentIndex: state.currentIndex + 1,
              };
            },
            undefined,
            "recordSwipe"
          );
        },

        undoLastSwipe: () =>
          set(
            (state) => {
              if (state.swipeHistory.length === 0 || state.currentIndex === 0) {
                return state;
              }

              const newHistory = state.swipeHistory.slice(0, -1);
              const lastSwipe = state.swipeHistory.at(-1);
              const newPending = state.pendingSyncs.filter(
                (s) => s.recipeId !== lastSwipe.recipeId
              );
              const likedCount = newHistory.filter(
                (s) => s.action === "like"
              ).length;
              const dislikedCount = newHistory.filter(
                (s) => s.action === "dislike"
              ).length;

              return {
                swipeHistory: newHistory,
                pendingSyncs: newPending,
                likedCount,
                dislikedCount,
                currentIndex: Math.max(0, state.currentIndex - 1),
              };
            },
            undefined,
            "undoLastSwipe"
          ),

        clearSwipeHistory: () =>
          set(
            {
              swipeHistory: [],
              pendingSyncs: [],
              likedCount: 0,
              dislikedCount: 0,
            },
            undefined,
            "clearSwipeHistory"
          ),

        markSwipeAsSynced: (recipeId) =>
          set(
            (state) => ({
              swipeHistory: state.swipeHistory.map((s) =>
                s.recipeId === recipeId ? { ...s, synced: true } : s
              ),
              pendingSyncs: state.pendingSyncs.filter(
                (s) => s.recipeId !== recipeId
              ),
            }),
            undefined,
            "markSwipeAsSynced"
          ),

        // Navigation
        setCurrentIndex: (index) =>
          set({ currentIndex: index }, undefined, "setCurrentIndex"),

        nextRecipe: () =>
          set(
            (state) => ({
              currentIndex: Math.min(
                state.currentIndex + 1,
                state.recipes.length - 1
              ),
            }),
            undefined,
            "nextRecipe"
          ),

        previousRecipe: () =>
          set(
            (state) => ({
              currentIndex: Math.max(0, state.currentIndex - 1),
            }),
            undefined,
            "previousRecipe"
          ),

        // Filters
        setFilters: (filters) => set({ filters }, undefined, "setFilters"),

        // Utils
        reset: () => set({ ...initialState }, undefined, "reset"),

        getPendingSyncs: () => get().pendingSyncs,

        getRecipeAtIndex: (index) => get().recipes[index],
      }),
      {
        name: "recipe-store",
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          swipeHistory: state.swipeHistory,
          pendingSyncs: state.pendingSyncs,
          filters: state.filters,
          likedCount: state.likedCount,
          dislikedCount: state.dislikedCount,
        }),
      }
    ),
    {
      name: "RecipeStore",
      enabled: process.env.NODE_ENV !== "production",
    }
  )
);

// Selectors
export const selectCurrentRecipe = (state: RecipeStore) =>
  state.recipes[state.currentIndex];

export const selectRemainingRecipes = (state: RecipeStore) =>
  state.recipes.length - state.currentIndex;

export const selectSwipeStats = (state: RecipeStore) => ({
  liked: state.likedCount,
  disliked: state.dislikedCount,
  total: state.likedCount + state.dislikedCount,
});

export const selectIsNearEnd = (state: RecipeStore, threshold = 5) =>
  state.recipes.length - state.currentIndex < threshold && state.hasMore;
