/**
 * Recipe Type Definitions
 * Based on MongoDB schema with normalization for frontend usage
 */

export type RecipeIngredient = {
  name: string;
  amount: string;
  unit: string;
};

export type RecipeInstruction = {
  step: number;
  description: string;
};

export type RecipeNutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
};

export type RecipeDifficulty = "easy" | "medium" | "hard";

export type Recipe = {
  _id: string;
  title: string;
  description: string;
  imageUrl: string;
  cookTime: number;
  prepTime: number;
  totalTime?: number;
  difficulty: RecipeDifficulty;
  cuisine: string[];
  cuisineType: string;
  dietaryTags: string[];
  ingredients: RecipeIngredient[];
  instructions: RecipeInstruction[];
  tags: string[];
  nutrition: RecipeNutrition;
  servings: number;
  isActive: boolean;
  likes: number;
};

// For card display - simplified version
export type RecipeCard = {
  _id: string;
  title: string;
  description: string;
  imageUrl: string;
  prepTime: number;
  cookTime: number;
  difficulty: RecipeDifficulty;
  cuisineType: string;
  dietaryTags: string[];
  nutrition: {
    calories: number;
    protein: number;
  };
  servings: number;
};

// API Response types
export type RecipeBatchResponse = {
  recipes: Recipe[];
  hasMore: boolean;
  nextCursor?: string;
  total: number;
};

export type RecipeSwipeAction = {
  recipeId: string;
  action: "like" | "dislike" | "skip";
  timestamp: Date;
};

// Filter types for recipe fetching
export type RecipeFilters = {
  dietaryTags?: string[];
  cuisine?: string[];
  difficulty?: RecipeDifficulty[];
  maxPrepTime?: number;
  maxCookTime?: number;
  minCalories?: number;
  maxCalories?: number;
};

// Utility function to normalize recipe data from backend
export function normalizeRecipe(rawRecipe: any): Recipe {
  return {
    _id: typeof rawRecipe._id === "object" ? rawRecipe._id.$oid : rawRecipe._id,
    title: rawRecipe.title,
    description: rawRecipe.description,
    imageUrl: rawRecipe.image_url || rawRecipe.imageUrl,
    cookTime: rawRecipe.cook_time || rawRecipe.cookTime || 0,
    prepTime: rawRecipe.prep_time || rawRecipe.prepTime || 0,
    totalTime: rawRecipe.total_time || rawRecipe.totalTime,
    difficulty: (
      rawRecipe.difficulty || "easy"
    ).toLowerCase() as RecipeDifficulty,
    cuisine: rawRecipe.cuisine || [],
    cuisineType: rawRecipe.cuisine_type || rawRecipe.cuisineType || "",
    dietaryTags: (rawRecipe.dietary_tags || rawRecipe.dietaryTags || [])
      .filter((tag: string) => tag.toLowerCase() !== "none")
      .map((tag: string) => tag.toLowerCase()),
    ingredients: rawRecipe.ingredients || [],
    instructions: rawRecipe.instructions || [],
    tags: rawRecipe.tags || [],
    nutrition: rawRecipe.nutrition || {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
    },
    servings: rawRecipe.servings || 1,
    isActive: rawRecipe.isActive !== false,
    likes: rawRecipe.likes || 0,
  };
}

// Convert full recipe to card format
export function recipeToCard(recipe: Recipe): RecipeCard {
  return {
    _id: recipe._id,
    title: recipe.title,
    description: recipe.description,
    imageUrl: recipe.imageUrl,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    difficulty: recipe.difficulty,
    cuisineType: recipe.cuisineType,
    dietaryTags: recipe.dietaryTags,
    nutrition: {
      calories: recipe.nutrition.calories,
      protein: recipe.nutrition.protein,
    },
    servings: recipe.servings,
  };
}
