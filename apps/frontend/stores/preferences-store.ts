import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import type { RecipeFilters } from "../types/recipe";

type UserPreferences = {
  // Dietary preferences
  dietaryRestrictions: string[];
  allergies: string[];
  cuisinePreferences: string[];
  dislikedIngredients: string[];

  // Recipe preferences
  maxCookingTime: number; // in minutes
  skillLevel: "beginner" | "intermediate" | "advanced";
  servingSize: number;
  priceRange: "budget" | "moderate" | "premium";

  // App preferences
  theme: "light" | "dark" | "system";
  language: string;
  notifications: {
    matches: boolean;
    sessionReminders: boolean;
    recipeRecommendations: boolean;
    dailyDigest: boolean;
  };

  // Swipe preferences
  autoPlayVideos: boolean;
  showNutritionalInfo: boolean;
  swipeVelocityThreshold: number;
  hapticFeedback: boolean;

  // Privacy
  allowAnalytics: boolean;
  shareUsageData: boolean;
  showOnlineStatus: boolean;
};

type PreferencesState = {
  preferences: UserPreferences;
  hasCompletedOnboarding: boolean;
  lastSyncTime: number | null;
  isDirty: boolean; // needs sync with backend
};

type PreferencesActions = {
  // Preference updates
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  setDietaryRestrictions: (restrictions: string[]) => void;
  setAllergies: (allergies: string[]) => void;
  setCuisinePreferences: (cuisines: string[]) => void;
  setDislikedIngredients: (ingredients: string[]) => void;

  // Recipe preferences
  setMaxCookingTime: (minutes: number) => void;
  setSkillLevel: (level: UserPreferences["skillLevel"]) => void;
  setServingSize: (size: number) => void;
  setPriceRange: (range: UserPreferences["priceRange"]) => void;

  // App settings
  setTheme: (theme: UserPreferences["theme"]) => void;
  setLanguage: (language: string) => void;
  updateNotificationSettings: (
    settings: Partial<UserPreferences["notifications"]>
  ) => void;

  // Swipe settings
  setAutoPlayVideos: (enabled: boolean) => void;
  setShowNutritionalInfo: (show: boolean) => void;
  setSwipeVelocity: (velocity: number) => void;
  setHapticFeedback: (enabled: boolean) => void;

  // Privacy settings
  setAnalyticsConsent: (allowed: boolean) => void;
  setDataSharing: (allowed: boolean) => void;
  setOnlineStatusVisibility: (visible: boolean) => void;

  // Onboarding
  completeOnboarding: () => void;
  resetOnboarding: () => void;

  // Sync
  markAsSynced: () => void;
  markAsDirty: () => void;

  // Utils
  reset: () => void;
  getRecipeFilters: () => RecipeFilters;
  exportPreferences: () => UserPreferences;
  importPreferences: (prefs: Partial<UserPreferences>) => void;
};

type PreferencesStore = PreferencesState & PreferencesActions;

const defaultPreferences: UserPreferences = {
  dietaryRestrictions: [],
  allergies: [],
  cuisinePreferences: [],
  dislikedIngredients: [],
  maxCookingTime: 60,
  skillLevel: "intermediate",
  servingSize: 2,
  priceRange: "moderate",
  theme: "system",
  language: "en",
  notifications: {
    matches: true,
    sessionReminders: true,
    recipeRecommendations: true,
    dailyDigest: false,
  },
  autoPlayVideos: true,
  showNutritionalInfo: true,
  swipeVelocityThreshold: 0.5,
  hapticFeedback: true,
  allowAnalytics: true,
  shareUsageData: false,
  showOnlineStatus: true,
};

const initialState: PreferencesState = {
  preferences: defaultPreferences,
  hasCompletedOnboarding: false,
  lastSyncTime: null,
  isDirty: false,
};

export const usePreferencesStore = create<PreferencesStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Preference updates
        updatePreferences: (updates) =>
          set(
            (state) => ({
              preferences: { ...state.preferences, ...updates },
              isDirty: true,
            }),
            undefined,
            "updatePreferences"
          ),

        setDietaryRestrictions: (restrictions) =>
          set(
            (state) => ({
              preferences: {
                ...state.preferences,
                dietaryRestrictions: restrictions,
              },
              isDirty: true,
            }),
            undefined,
            "setDietaryRestrictions"
          ),

        setAllergies: (allergies) =>
          set(
            (state) => ({
              preferences: { ...state.preferences, allergies },
              isDirty: true,
            }),
            undefined,
            "setAllergies"
          ),

        setCuisinePreferences: (cuisines) =>
          set(
            (state) => ({
              preferences: {
                ...state.preferences,
                cuisinePreferences: cuisines,
              },
              isDirty: true,
            }),
            undefined,
            "setCuisinePreferences"
          ),

        setDislikedIngredients: (ingredients) =>
          set(
            (state) => ({
              preferences: {
                ...state.preferences,
                dislikedIngredients: ingredients,
              },
              isDirty: true,
            }),
            undefined,
            "setDislikedIngredients"
          ),

        // Recipe preferences
        setMaxCookingTime: (minutes) =>
          set(
            (state) => ({
              preferences: { ...state.preferences, maxCookingTime: minutes },
              isDirty: true,
            }),
            undefined,
            "setMaxCookingTime"
          ),

        setSkillLevel: (level) =>
          set(
            (state) => ({
              preferences: { ...state.preferences, skillLevel: level },
              isDirty: true,
            }),
            undefined,
            "setSkillLevel"
          ),

        setServingSize: (size) =>
          set(
            (state) => ({
              preferences: { ...state.preferences, servingSize: size },
              isDirty: true,
            }),
            undefined,
            "setServingSize"
          ),

        setPriceRange: (range) =>
          set(
            (state) => ({
              preferences: { ...state.preferences, priceRange: range },
              isDirty: true,
            }),
            undefined,
            "setPriceRange"
          ),

        // App settings
        setTheme: (theme) =>
          set(
            (state) => ({
              preferences: { ...state.preferences, theme },
            }),
            undefined,
            "setTheme"
          ),

        setLanguage: (language) =>
          set(
            (state) => ({
              preferences: { ...state.preferences, language },
            }),
            undefined,
            "setLanguage"
          ),

        updateNotificationSettings: (settings) =>
          set(
            (state) => ({
              preferences: {
                ...state.preferences,
                notifications: {
                  ...state.preferences.notifications,
                  ...settings,
                },
              },
            }),
            undefined,
            "updateNotificationSettings"
          ),

        // Swipe settings
        setAutoPlayVideos: (enabled) =>
          set(
            (state) => ({
              preferences: { ...state.preferences, autoPlayVideos: enabled },
            }),
            undefined,
            "setAutoPlayVideos"
          ),

        setShowNutritionalInfo: (show) =>
          set(
            (state) => ({
              preferences: { ...state.preferences, showNutritionalInfo: show },
            }),
            undefined,
            "setShowNutritionalInfo"
          ),

        setSwipeVelocity: (velocity) =>
          set(
            (state) => ({
              preferences: {
                ...state.preferences,
                swipeVelocityThreshold: velocity,
              },
            }),
            undefined,
            "setSwipeVelocity"
          ),

        setHapticFeedback: (enabled) =>
          set(
            (state) => ({
              preferences: { ...state.preferences, hapticFeedback: enabled },
            }),
            undefined,
            "setHapticFeedback"
          ),

        // Privacy settings
        setAnalyticsConsent: (allowed) =>
          set(
            (state) => ({
              preferences: { ...state.preferences, allowAnalytics: allowed },
            }),
            undefined,
            "setAnalyticsConsent"
          ),

        setDataSharing: (allowed) =>
          set(
            (state) => ({
              preferences: { ...state.preferences, shareUsageData: allowed },
            }),
            undefined,
            "setDataSharing"
          ),

        setOnlineStatusVisibility: (visible) =>
          set(
            (state) => ({
              preferences: { ...state.preferences, showOnlineStatus: visible },
            }),
            undefined,
            "setOnlineStatusVisibility"
          ),

        // Onboarding
        completeOnboarding: () =>
          set(
            { hasCompletedOnboarding: true },
            undefined,
            "completeOnboarding"
          ),

        resetOnboarding: () =>
          set({ hasCompletedOnboarding: false }, undefined, "resetOnboarding"),

        // Sync
        markAsSynced: () =>
          set(
            { lastSyncTime: Date.now(), isDirty: false },
            undefined,
            "markAsSynced"
          ),

        markAsDirty: () => set({ isDirty: true }, undefined, "markAsDirty"),

        // Utils
        reset: () => set({ ...initialState }, undefined, "reset"),

        getRecipeFilters: () => {
          const prefs = get().preferences;
          return {
            dietaryRestrictions: prefs.dietaryRestrictions,
            allergies: prefs.allergies,
            cuisinePreferences: prefs.cuisinePreferences,
            excludeIngredients: prefs.dislikedIngredients,
            maxCookingTime: prefs.maxCookingTime,
            skillLevel: prefs.skillLevel,
            servingSize: prefs.servingSize,
            priceRange: prefs.priceRange,
          } as RecipeFilters;
        },

        exportPreferences: () => get().preferences,

        importPreferences: (prefs) =>
          set(
            (state) => ({
              preferences: { ...state.preferences, ...prefs },
              isDirty: true,
            }),
            undefined,
            "importPreferences"
          ),
      }),
      {
        name: "preferences-store",
        storage: createJSONStorage(() => AsyncStorage),
        // Persist everything except sync state
        partialize: (state) => ({
          preferences: state.preferences,
          hasCompletedOnboarding: state.hasCompletedOnboarding,
        }),
      }
    ),
    {
      name: "PreferencesStore",
      enabled: process.env.NODE_ENV !== "production",
    }
  )
);

// Selectors
export const selectDietaryInfo = (state: PreferencesStore) => ({
  restrictions: state.preferences.dietaryRestrictions,
  allergies: state.preferences.allergies,
  excludedIngredients: state.preferences.dislikedIngredients,
});

export const selectAppSettings = (state: PreferencesStore) => ({
  theme: state.preferences.theme,
  language: state.preferences.language,
  notifications: state.preferences.notifications,
  hapticFeedback: state.preferences.hapticFeedback,
});

export const selectPrivacySettings = (state: PreferencesStore) => ({
  allowAnalytics: state.preferences.allowAnalytics,
  shareUsageData: state.preferences.shareUsageData,
  showOnlineStatus: state.preferences.showOnlineStatus,
});
