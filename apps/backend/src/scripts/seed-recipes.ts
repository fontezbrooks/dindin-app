import { readFileSync } from "fs";
import { MongoClient } from "mongodb";
import { resolve } from "path";

async function seedRecipes() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/dindin";
  const dbName = process.env.DATABASE_NAME || "dindin";

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(dbName);
    const collection = db.collection("recipes");

    // Check if recipes already exist
    const count = await collection.countDocuments();
    if (count > 0) {
      console.log(`Database already has ${count} recipes. Skipping seed.`);
      return;
    }

    // Read recipes from JSON file
    const jsonPath = resolve(
      __dirname,
      "apps/backend/src/scripts/dindin-app.recipes.json"
    );
    const jsonData = readFileSync("dindin-app.recipes.json", "utf-8");
    const recipes = JSON.parse(jsonData);

    // Add isActive field and ensure image_url exists
    const recipesToInsert = recipes.map((recipe: any) => ({
      ...recipe,
      isActive: true,
      image_url:
        recipe.image_url ||
        recipe.imageUrl ||
        "https://via.placeholder.com/400x300",
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Insert recipes
    const result = await collection.insertMany(recipesToInsert);
    console.log(`Successfully inserted ${result.insertedCount} recipes`);

    // Create indexes
    await collection.createIndex({ title: "text", description: "text" });
    await collection.createIndex({ cuisine: 1 });
    await collection.createIndex({ dietary_tags: 1 });
    await collection.createIndex({ isActive: 1 });
    console.log("Indexes created");
  } catch (error) {
    console.error("Error seeding recipes:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("Connection closed");
  }
}

// Run the seed function
seedRecipes().catch(console.error);
