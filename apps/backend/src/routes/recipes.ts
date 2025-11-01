import { Hono } from "hono";
import { ObjectId } from "mongodb";
import { getDB } from "../config/database";
import type { Recipe, User } from "../types";

type Variables = {
  user: User;
};

const recipeRoutes = new Hono<{ Variables: Variables }>();

// Get all recipes with filters
recipeRoutes.get("/", async (c) => {
  try {
    const db = getDB();
    const user = c.get("user") as User;

    // Get query parameters
    const cuisine = c.req.query("cuisine");
    const dietaryTags = c.req.query("dietary")?.split(",");
    const difficulty = c.req.query("difficulty");
    const search = c.req.query("search");
    const limit = Number.parseInt(c.req.query("limit") || "20", 10);
    const skip = Number.parseInt(c.req.query("skip") || "0", 10);

    // Build query
    const query: any = { isActive: true };

    if (cuisine) {
      query.cuisine = cuisine;
    }

    if (dietaryTags && dietaryTags.length > 0) {
      query.dietary_tags = { $in: dietaryTags };
    }

    if (difficulty) {
      query.difficulty = difficulty;
    }

    if (search) {
      query.$text = { $search: search };
    }

    // Apply user preferences if no specific filters
    if (!(cuisine || dietaryTags || search)) {
      if (user.profile.cuisinePreferences.length > 0) {
        query.cuisine = { $in: user.profile.cuisinePreferences };
      }
      if (user.profile.dietaryPreferences.length > 0) {
        query.dietary_tags = { $in: user.profile.dietaryPreferences };
      }
    }

    const recipes = await db
      .collection<Recipe>("recipes")
      .find(query)
      .limit(limit)
      .skip(skip)
      .toArray();

    const total = await db.collection<Recipe>("recipes").countDocuments(query);

    return c.json({
      recipes,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + limit < total,
      },
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch recipes" }, 500);
  }
});

// Get single recipe by ID
recipeRoutes.get("/:recipeId", async (c) => {
  try {
    const recipeId = c.req.param("recipeId");
    const db = getDB();

    const recipe = await db.collection<Recipe>("recipes").findOne({
      _id: new ObjectId(recipeId),
      isActive: true,
    });

    if (!recipe) {
      return c.json({ error: "Recipe not found" }, 404);
    }

    return c.json(recipe);
  } catch (error) {
    return c.json({ error: "Failed to fetch recipe" }, 500);
  }
});

// Get random recipes for swiping
recipeRoutes.get("/swipe/batch", async (c) => {
  try {
    const db = getDB();
    const user = c.get("user") as User;
    const limit = Number.parseInt(c.req.query("limit") || "10", 10);
    const cursor = c.req.query("cursor");

    // Build match criteria based on user preferences
    const matchCriteria: any = { isActive: true };

    if (user.profile.dietaryPreferences.length > 0) {
      matchCriteria.dietary_tags = { $in: user.profile.dietaryPreferences };
    }

    if (user.profile.cuisinePreferences.length > 0) {
      matchCriteria.cuisine = { $in: user.profile.cuisinePreferences };
    }

    // Get random recipes using aggregation pipeline
    const recipes = await db
      .collection<Recipe>("recipes")
      .aggregate([{ $match: matchCriteria }, { $sample: { size: limit } }])
      .toArray();

    // If not enough recipes with preferences, get more random ones
    if (recipes.length < limit) {
      const additionalRecipes = await db
        .collection<Recipe>("recipes")
        .aggregate([
          {
            $match: {
              isActive: true,
              _id: { $nin: recipes.map((r) => r._id) },
            },
          },
          { $sample: { size: limit - recipes.length } },
        ])
        .toArray();

      recipes.push(...additionalRecipes);
    }

    // Return in the expected format with pagination info
    return c.json({
      recipes,
      hasMore: true, // For random recipes, we can always get more
      nextCursor: Date.now().toString(), // Use timestamp as cursor for random batches
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch recipes for swiping" }, 500);
  }
});

// Get recipe recommendations based on user history
recipeRoutes.get("/recommendations", async (c) => {
  try {
    const db = getDB();
    const user = c.get("user") as User;

    // Get user's liked recipes from dining history
    const likedRecipes = user.profile.diningHistory
      .filter(
        (entry) => entry.type === "recipe" && entry.rating && entry.rating >= 4
      )
      .map((entry) => entry.itemId);

    if (likedRecipes.length === 0) {
      // Return popular recipes if no history
      const recipes = await db
        .collection<Recipe>("recipes")
        .find({ isActive: true })
        .sort({ likes: -1 })
        .limit(10)
        .toArray();

      return c.json(recipes);
    }

    // Get cuisines and tags from liked recipes
    const likedRecipeDetails = await db
      .collection<Recipe>("recipes")
      .find({ _id: { $in: likedRecipes } })
      .toArray();

    const cuisines = [...new Set(likedRecipeDetails.flatMap((r) => r.cuisine))];
    const tags = [...new Set(likedRecipeDetails.flatMap((r) => r.tags))];

    // Find similar recipes
    const recommendations = await db
      .collection<Recipe>("recipes")
      .find({
        isActive: true,
        _id: { $nin: likedRecipes },
        $or: [{ cuisine: { $in: cuisines } }, { tags: { $in: tags } }],
      })
      .limit(10)
      .toArray();

    return c.json(recommendations);
  } catch (error) {
    return c.json({ error: "Failed to fetch recommendations" }, 500);
  }
});

// Like a recipe
recipeRoutes.post("/:recipeId/like", async (c) => {
  try {
    const recipeId = c.req.param("recipeId");
    const db = getDB();

    await db
      .collection<Recipe>("recipes")
      .updateOne({ _id: new ObjectId(recipeId) }, { $inc: { likes: 1 } });

    return c.json({ message: "Recipe liked" });
  } catch (error) {
    return c.json({ error: "Failed to like recipe" }, 500);
  }
});

// Get recipe nutrition info
recipeRoutes.get("/:recipeId/nutrition", async (c) => {
  try {
    const recipeId = c.req.param("recipeId");
    const db = getDB();

    const recipe = await db
      .collection<Recipe>("recipes")
      .findOne(
        { _id: new ObjectId(recipeId), isActive: true },
        { projection: { nutrition: 1 } }
      );

    if (!recipe) {
      return c.json({ error: "Recipe not found" }, 404);
    }

    return c.json(recipe.nutrition);
  } catch (error) {
    return c.json({ error: "Failed to fetch nutrition info" }, 500);
  }
});

export default recipeRoutes;
