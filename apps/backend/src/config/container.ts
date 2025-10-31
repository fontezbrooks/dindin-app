import { Container } from "inversify";
import type { Db } from "mongodb";
import { type CacheService, getCacheService } from "../services/cache";
import { SessionService } from "../services/sessionService";
import { getDB } from "./database";

// Service identifiers
export const TYPES = {
  // Database
  Database: Symbol.for("Database"),

  // Services
  CacheService: Symbol.for("CacheService"),
  SessionService: Symbol.for("SessionService"),

  // Add more service identifiers as needed
  UserService: Symbol.for("UserService"),
  RecipeService: Symbol.for("RecipeService"),
  RestaurantService: Symbol.for("RestaurantService"),
};

// Create IoC container
const container = new Container();

// Bind database
container
  .bind<Db>(TYPES.Database)
  .toDynamicValue(() => getDB())
  .inSingletonScope();

// Bind cache service as singleton
container
  .bind<CacheService>(TYPES.CacheService)
  .toDynamicValue(() => getCacheService())
  .inSingletonScope();

// Bind session service
container
  .bind<SessionService>(TYPES.SessionService)
  .to(SessionService)
  .inSingletonScope();

export { container };
