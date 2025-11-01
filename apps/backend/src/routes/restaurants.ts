import { Hono } from "hono";
import { ObjectId } from "mongodb";
import { getDB } from "../config/database";
import { HTTP_STATUS } from "../constants/http-status";
import type { Restaurant, RestaurantFilter, User } from "../types";

const restaurantRoutes = new Hono();

// Get all restaurants with filters
restaurantRoutes.get("/", async (c) => {
  try {
    const db = getDB();
    const user = c.get("user") as User;

    // Get query parameters
    const cuisine = c.req.query("cuisine");
    const priceRange = c.req.query("price");
    const minRating = c.req.query("minRating");
    const search = c.req.query("search");
    const limit = Number.parseInt(c.req.query("limit") || "20", 10);
    const skip = Number.parseInt(c.req.query("skip") || "0", 10);

    // Build query
    const query: RestaurantFilter = { isActive: true };

    if (cuisine) {
      query.cuisine = cuisine;
    }

    if (priceRange) {
      query.priceRange = Number.parseInt(priceRange, 10);
    }

    if (minRating) {
      query.rating = { $gte: Number.parseFloat(minRating) };
    }

    if (search) {
      query.$text = { $search: search };
    }

    // Apply user preferences if no specific filters
    if (!(cuisine || search) && user.profile.cuisinePreferences.length > 0) {
      query.cuisine = { $in: user.profile.cuisinePreferences };
    }

    const restaurants = await db
      .collection<Restaurant>("restaurants")
      .find(query)
      .limit(limit)
      .skip(skip)
      .toArray();

    const total = await db
      .collection<Restaurant>("restaurants")
      .countDocuments(query);

    return c.json({
      restaurants,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + limit < total,
      },
    });
  } catch (_error) {
    return c.json(
      { error: "Failed to fetch restaurants" },
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

// Get single restaurant by ID
restaurantRoutes.get("/:restaurantId", async (c) => {
  try {
    const restaurantId = c.req.param("restaurantId");
    const db = getDB();

    const restaurant = await db.collection<Restaurant>("restaurants").findOne({
      _id: new ObjectId(restaurantId),
      isActive: true,
    });

    if (!restaurant) {
      return c.json({ error: "Restaurant not found" }, HTTP_STATUS.NOT_FOUND);
    }

    return c.json(restaurant);
  } catch (_error) {
    return c.json(
      { error: "Failed to fetch restaurant" },
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

// Get random restaurants for swiping
restaurantRoutes.get("/swipe/batch", async (c) => {
  try {
    const db = getDB();
    const user = c.get("user") as User;
    const count = Number.parseInt(c.req.query("count") || "10", 10);

    // Build match criteria based on user preferences
    const matchCriteria: RestaurantFilter = { isActive: true };

    if (user.profile.cuisinePreferences.length > 0) {
      matchCriteria.cuisine = { $in: user.profile.cuisinePreferences };
    }

    // Get random restaurants using aggregation pipeline
    const restaurants = await db
      .collection<Restaurant>("restaurants")
      .aggregate([{ $match: matchCriteria }, { $sample: { size: count } }])
      .toArray();

    // If not enough restaurants with preferences, get more random ones
    if (restaurants.length < count) {
      const additionalRestaurants = await db
        .collection<Restaurant>("restaurants")
        .aggregate([
          {
            $match: {
              isActive: true,
              _id: { $nin: restaurants.map((r) => r._id) },
            },
          },
          { $sample: { size: count - restaurants.length } },
        ])
        .toArray();

      restaurants.push(...additionalRestaurants);
    }

    return c.json(restaurants);
  } catch (_error) {
    return c.json(
      { error: "Failed to fetch restaurants for swiping" },
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

// Get restaurant recommendations based on user history
restaurantRoutes.get("/recommendations", async (c) => {
  try {
    const db = getDB();
    const user = c.get("user") as User;

    // Get user's liked restaurants from dining history
    const likedRestaurants = user.profile.diningHistory
      .filter(
        (entry) =>
          entry.type === "restaurant" && entry.rating && entry.rating >= 4
      )
      .map((entry) => entry.itemId);

    if (likedRestaurants.length === 0) {
      // Return popular restaurants if no history
      const restaurants = await db
        .collection<Restaurant>("restaurants")
        .find({ isActive: true })
        .sort({ rating: -1 })
        .limit(10)
        .toArray();

      return c.json(restaurants);
    }

    // Get cuisines from liked restaurants
    const likedRestaurantDetails = await db
      .collection<Restaurant>("restaurants")
      .find({ _id: { $in: likedRestaurants } })
      .toArray();

    const cuisines = [
      ...new Set(likedRestaurantDetails.flatMap((r) => r.cuisine)),
    ];
    const avgPriceRange = Math.round(
      likedRestaurantDetails.reduce((sum, r) => sum + r.priceRange, 0) /
        likedRestaurantDetails.length
    );

    // Find similar restaurants
    const recommendations = await db
      .collection<Restaurant>("restaurants")
      .find({
        isActive: true,
        _id: { $nin: likedRestaurants },
        $or: [
          { cuisine: { $in: cuisines } },
          {
            priceRange: {
              $in: [avgPriceRange - 1, avgPriceRange, avgPriceRange + 1],
            },
          },
        ],
      })
      .limit(10)
      .toArray();

    return c.json(recommendations);
  } catch (_error) {
    return c.json(
      { error: "Failed to fetch recommendations" },
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

// Seed fake restaurant data (for development)
restaurantRoutes.post("/seed", async (c) => {
  try {
    const db = getDB();

    // Check if already seeded
    const count = await db
      .collection<Restaurant>("restaurants")
      .countDocuments();
    if (count > 0) {
      return c.json({ message: "Restaurants already seeded" });
    }

    const fakeRestaurants: Restaurant[] = [
      {
        name: "The Cozy Kitchen",
        cuisine: ["American", "Comfort Food"],
        priceRange: 2,
        rating: 4.5,
        description: "Homestyle cooking with a modern twist",
        address: "123 Main St",
        imageUrl: "https://via.placeholder.com/400x300",
        tags: ["family-friendly", "outdoor-seating", "vegetarian-options"],
        isActive: true,
      },
      {
        name: "Sakura Sushi Bar",
        cuisine: ["Japanese", "Sushi"],
        priceRange: 3,
        rating: 4.7,
        description: "Authentic Japanese cuisine and fresh sushi",
        address: "456 Oak Ave",
        imageUrl: "https://via.placeholder.com/400x300",
        tags: ["sushi", "sake-bar", "lunch-specials"],
        isActive: true,
      },
      {
        name: "Bella Vista Italian",
        cuisine: ["Italian"],
        priceRange: 3,
        rating: 4.3,
        description: "Traditional Italian dishes made with love",
        address: "789 Pine Rd",
        imageUrl: "https://via.placeholder.com/400x300",
        tags: ["romantic", "wine-selection", "pasta"],
        isActive: true,
      },
      {
        name: "Taco Fiesta",
        cuisine: ["Mexican", "Tex-Mex"],
        priceRange: 1,
        rating: 4.2,
        description: "Authentic Mexican street food and margaritas",
        address: "321 Elm St",
        imageUrl: "https://via.placeholder.com/400x300",
        tags: ["tacos", "happy-hour", "quick-service"],
        isActive: true,
      },
      {
        name: "Garden Greens Cafe",
        cuisine: ["Vegetarian", "Healthy"],
        priceRange: 2,
        rating: 4.4,
        description: "Fresh, organic, plant-based cuisine",
        address: "654 Garden Way",
        imageUrl: "https://via.placeholder.com/400x300",
        tags: ["vegetarian", "vegan-options", "organic", "gluten-free"],
        isActive: true,
      },
      {
        name: "The Burger Joint",
        cuisine: ["American", "Burgers"],
        priceRange: 2,
        rating: 4.1,
        description: "Gourmet burgers and craft beers",
        address: "987 Burger Blvd",
        imageUrl: "https://via.placeholder.com/400x300",
        tags: ["burgers", "craft-beer", "sports-bar"],
        isActive: true,
      },
      {
        name: "Pho Saigon",
        cuisine: ["Vietnamese"],
        priceRange: 2,
        rating: 4.6,
        description: "Authentic Vietnamese pho and banh mi",
        address: "147 Asia St",
        imageUrl: "https://via.placeholder.com/400x300",
        tags: ["pho", "vietnamese", "soup", "casual"],
        isActive: true,
      },
      {
        name: "Curry Palace",
        cuisine: ["Indian"],
        priceRange: 2,
        rating: 4.5,
        description: "Traditional Indian curries and tandoori",
        address: "258 Spice Lane",
        imageUrl: "https://via.placeholder.com/400x300",
        tags: ["indian", "curry", "vegetarian-friendly", "spicy"],
        isActive: true,
      },
      {
        name: "Le Petit Bistro",
        cuisine: ["French"],
        priceRange: 4,
        rating: 4.8,
        description: "Fine French dining experience",
        address: "369 Rue de Paris",
        imageUrl: "https://via.placeholder.com/400x300",
        tags: ["french", "fine-dining", "wine", "romantic"],
        isActive: true,
      },
      {
        name: "BBQ Smokehouse",
        cuisine: ["BBQ", "American"],
        priceRange: 2,
        rating: 4.3,
        description: "Slow-smoked meats and southern sides",
        address: "741 Smoke Trail",
        imageUrl: "https://via.placeholder.com/400x300",
        tags: ["bbq", "southern", "family-style", "meat"],
        isActive: true,
      },
    ];

    await db.collection<Restaurant>("restaurants").insertMany(fakeRestaurants);

    return c.json({ message: `Seeded ${fakeRestaurants.length} restaurants` });
  } catch (_error) {
    return c.json(
      { error: "Failed to seed restaurants" },
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

export default restaurantRoutes;
