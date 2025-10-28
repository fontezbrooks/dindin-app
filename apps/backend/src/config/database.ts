import { MongoClient, Db } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDB(): Promise<Db> {
  if (db) {
    return db;
  }

  try {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/dindin";
    const dbName = process.env.DATABASE_NAME || "dindin";

    client = new MongoClient(uri);
    await client.connect();

    db = client.db(dbName);

    console.log(`\ud83d\udc4d MongoDB connected to database: ${dbName}`);

    // Create indexes
    await createIndexes(db);

    return db;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

async function createIndexes(db: Db) {
  // User indexes
  await db.collection("users").createIndex({ clerkUserId: 1 }, { unique: true });
  await db.collection("users").createIndex({ email: 1 });

  // Session indexes
  await db.collection("sessions").createIndex({ sessionCode: 1 }, { unique: true });
  await db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection("sessions").createIndex({ hostUserId: 1 });
  await db.collection("sessions").createIndex({ "participants.userId": 1 });

  // Recipe indexes
  await db.collection("recipes").createIndex({ title: "text", description: "text" });
  await db.collection("recipes").createIndex({ cuisine: 1 });
  await db.collection("recipes").createIndex({ dietary_tags: 1 });
  await db.collection("recipes").createIndex({ isActive: 1 });

  // Restaurant indexes
  await db.collection("restaurants").createIndex({ name: "text" });
  await db.collection("restaurants").createIndex({ cuisine: 1 });
  await db.collection("restaurants").createIndex({ isActive: 1 });
}

export function getDB(): Db {
  if (!db) {
    throw new Error("Database not connected. Call connectDB first.");
  }
  return db;
}

export async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}