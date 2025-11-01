# Technical Patterns - DinDin Backend

## Error Handling Pattern
```typescript
// Consistent error handling across all routes
try {
  // ... operation
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  return c.json({ error: errorMessage }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
}
```

## TypeScript Patterns

### MongoDB Filter Types
```typescript
// Define specific filter interfaces for MongoDB queries
interface RecipeFilter {
  isActive: boolean;
  cuisine?: { $in: string[] };
  dietaryRestrictions?: { $nin: string[] };
  totalTime?: { $lte: number };
}

// Use in route handlers
const query: RecipeFilter = { isActive: true };
```

### WebSocket Extensions
```typescript
// Extend built-in types for custom properties
interface ExtendedServerWebSocket extends ServerWebSocket {
  userId?: string;
}
```

### User Type Handling
```typescript
// Safe user object access from context
const user = c.get("user") as User;
// OR with optional chaining
const userId = (c.get("user") as User | undefined)?._id?.toString() || "anonymous";
```

## Constants Organization
```typescript
// apps/backend/src/constants/http-status.ts
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  // ...
} as const;

// Data size calculations
const KB = 1024;
export const DATA_SIZE = {
  KILOBYTE: KB,
  MEGABYTE: KB * KB,
  GIGABYTE: KB * KB * KB,
} as const;
```

## Middleware Patterns

### Complexity Reduction via Helper Functions
```typescript
// Extract complex logic into helper functions
async function handleCacheInvalidation(/* params */) { /* ... */ }
async function handleCacheHit(/* params */) { /* ... */ }
async function handleCacheMiss(/* params */) { /* ... */ }

// Main middleware stays simple
return async (c: Context, next: Next) => {
  if (condition1) return handleCacheInvalidation(/*...*/);
  if (condition2) return handleCacheHit(/*...*/);
  return handleCacheMiss(/*...*/);
};
```

## Import Patterns

### Direct Function Imports
```typescript
// PREFER: Direct function imports for tree-shaking
import {
  createSession,
  getSession,
  joinSession,
} from "../services/sessionService";

// AVOID: Default service object imports
import SessionService from "../services/sessionService";
```

## File Naming Conventions
- **Routes**: kebab-case (e.g., `cached-sessions.ts`)
- **Middleware**: kebab-case (e.g., `rate-limiter.ts`)
- **Services**: camelCase (e.g., `sessionService.ts`)
- **Types**: camelCase (e.g., `index.ts`)
- **Constants**: kebab-case (e.g., `http-status.ts`)

## Biome Configuration Notes
- Use `--unsafe` flag for aggressive auto-fixes
- Configure rules in biome.json for project-specific preferences
- Empty blocks can be intentional (add comments if needed)
- Magic numbers in constants files can be ignored via config