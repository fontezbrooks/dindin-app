import { Hono } from "hono";
import { ObjectId } from "mongodb";
import { getDB } from "../config/database";
import type { User } from "../types";

const userRoutes = new Hono();

// Get current user profile
userRoutes.get("/me", async (c) => {
  const user = c.get("user") as User;
  return c.json(user);
});

// Get user preferences (for recipe filtering)
userRoutes.get("/preferences", async (c) => {
  const user = c.get("user") as User;
  return c.json({
    dietaryRestrictions: user.profile.dietaryPreferences || [],
    cuisinePreferences: user.profile.cuisinePreferences || [],
    allergies: user.profile.allergies || [],
  });
});

// Update user profile
userRoutes.patch("/me", async (c) => {
  try {
    const user = c.get("user") as User;
    const updates = await c.req.json();

    const db = getDB();
    const usersCollection = db.collection<User>("users");

    // Only allow updating certain fields
    const allowedUpdates = {
      username: updates.username,
      "profile.dietaryPreferences": updates.dietaryPreferences,
      "profile.cuisinePreferences": updates.cuisinePreferences,
      "profile.allergies": updates.allergies,
      updatedAt: new Date(),
    };

    // Remove undefined values
    Object.keys(allowedUpdates).forEach(
      (key) => allowedUpdates[key] === undefined && delete allowedUpdates[key]
    );

    await usersCollection.updateOne(
      { _id: user._id },
      { $set: allowedUpdates }
    );

    const updatedUser = await usersCollection.findOne({ _id: user._id });
    return c.json(updatedUser);
  } catch (error) {
    return c.json({ error: "Failed to update profile" }, 500);
  }
});

// Get user's saved recipes
userRoutes.get("/me/saved-recipes", async (c) => {
  try {
    const user = c.get("user") as User;
    const db = getDB();

    const recipes = await db
      .collection("recipes")
      .find({
        _id: { $in: user.profile.savedRecipes },
        isActive: true,
      })
      .toArray();

    return c.json(recipes);
  } catch (error) {
    return c.json({ error: "Failed to fetch saved recipes" }, 500);
  }
});

// Save a recipe
userRoutes.post("/me/saved-recipes/:recipeId", async (c) => {
  try {
    const user = c.get("user") as User;
    const recipeId = new ObjectId(c.req.param("recipeId"));
    const db = getDB();

    // Check if recipe exists
    const recipe = await db.collection("recipes").findOne({
      _id: recipeId,
      isActive: true,
    });

    if (!recipe) {
      return c.json({ error: "Recipe not found" }, 404);
    }

    // Add to saved recipes if not already saved
    await db.collection<User>("users").updateOne(
      { _id: user._id },
      {
        $addToSet: { "profile.savedRecipes": recipeId },
        $set: { updatedAt: new Date() },
      }
    );

    return c.json({ message: "Recipe saved successfully" });
  } catch (error) {
    return c.json({ error: "Failed to save recipe" }, 500);
  }
});

// Remove saved recipe
userRoutes.delete("/me/saved-recipes/:recipeId", async (c) => {
  try {
    const user = c.get("user") as User;
    const recipeId = new ObjectId(c.req.param("recipeId"));
    const db = getDB();

    await db.collection<User>("users").updateOne(
      { _id: user._id },
      {
        $pull: { "profile.savedRecipes": recipeId },
        $set: { updatedAt: new Date() },
      }
    );

    return c.json({ message: "Recipe removed from saved" });
  } catch (error) {
    return c.json({ error: "Failed to remove recipe" }, 500);
  }
});

// Get user's shopping lists
userRoutes.get("/me/shopping-lists", async (c) => {
  const user = c.get("user") as User;
  return c.json(user.profile.shoppingLists);
});

// Create shopping list from recipe
userRoutes.post("/me/shopping-lists", async (c) => {
  try {
    const user = c.get("user") as User;
    const { recipeId } = await c.req.json();
    const db = getDB();

    // Get recipe
    const recipe = await db.collection("recipes").findOne({
      _id: new ObjectId(recipeId),
      isActive: true,
    });

    if (!recipe) {
      return c.json({ error: "Recipe not found" }, 404);
    }

    // Create shopping list
    const shoppingList = {
      _id: new ObjectId(),
      recipeId: new ObjectId(recipeId),
      recipeName: recipe.title,
      ingredients: recipe.ingredients.map((ing: any) => ({
        ...ing,
        checked: false,
      })),
      createdAt: new Date(),
    };

    await db.collection<User>("users").updateOne(
      { _id: user._id },
      {
        $push: { "profile.shoppingLists": shoppingList },
        $set: { updatedAt: new Date() },
      }
    );

    return c.json(shoppingList);
  } catch (error) {
    return c.json({ error: "Failed to create shopping list" }, 500);
  }
});

// Update shopping list item
userRoutes.patch("/me/shopping-lists/:listId/items/:itemIndex", async (c) => {
  try {
    const user = c.get("user") as User;
    const listId = c.req.param("listId");
    const itemIndex = Number.parseInt(c.req.param("itemIndex"));
    const { checked } = await c.req.json();
    const db = getDB();

    await db.collection<User>("users").updateOne(
      {
        _id: user._id,
        "profile.shoppingLists._id": new ObjectId(listId),
      },
      {
        $set: {
          [`profile.shoppingLists.$.ingredients.${itemIndex}.checked`]: checked,
          updatedAt: new Date(),
        },
      }
    );

    return c.json({ message: "Shopping list updated" });
  } catch (error) {
    return c.json({ error: "Failed to update shopping list" }, 500);
  }
});

// Get dining history
userRoutes.get("/me/dining-history", async (c) => {
  const user = (await c.get("user")) as User;
  return c.json(user.profile.diningHistory);
});

// Add to dining history
userRoutes.post("/me/dining-history", async (c) => {
  try {
    const user = c.get("user") as User;
    const entry = await c.req.json();
    const db = getDB();

    const historyEntry = {
      ...entry,
      itemId: new ObjectId(entry.itemId),
      date: new Date(),
    };

    await db.collection<User>("users").updateOne(
      { _id: user._id },
      {
        $push: { "profile.diningHistory": historyEntry },
        $set: { updatedAt: new Date() },
      }
    );

    return c.json(historyEntry);
  } catch (error) {
    return c.json({ error: "Failed to add to dining history" }, 500);
  }
});

export default userRoutes;
