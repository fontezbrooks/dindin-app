# DinDin API Documentation

## Overview
The DinDin API is built with Hono and Bun, providing endpoints for recipe/restaurant discovery, user sessions, and real-time matching.

## Getting Started

### Prerequisites
- Bun runtime
- MongoDB instance running
- Clerk account for authentication

### Setup
1. Copy `.env.example` to `.env` and fill in your credentials
2. Install dependencies: `bun install`
3. Run the server: `bun run dev`

## Authentication
All protected endpoints require a Bearer token from Clerk in the Authorization header:
```
Authorization: Bearer <your-clerk-token>
```

## API Endpoints

### Health Check
- `GET /health` - Server health status (public)

### Authentication
- `GET /api/auth/verify` - Verify authentication token (public)
- `POST /api/auth/webhook` - Clerk webhook endpoint (future implementation)

### User Profile
- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/me` - Update user profile
- `GET /api/users/me/saved-recipes` - Get saved recipes
- `POST /api/users/me/saved-recipes/:recipeId` - Save a recipe
- `DELETE /api/users/me/saved-recipes/:recipeId` - Remove saved recipe
- `GET /api/users/me/shopping-lists` - Get shopping lists
- `POST /api/users/me/shopping-lists` - Create shopping list from recipe
- `PATCH /api/users/me/shopping-lists/:listId/items/:itemIndex` - Update shopping list item
- `GET /api/users/me/dining-history` - Get dining history
- `POST /api/users/me/dining-history` - Add to dining history

### Recipes
- `GET /api/recipes` - Get recipes with filters
  - Query params: `cuisine`, `dietary`, `difficulty`, `search`, `limit`, `skip`
- `GET /api/recipes/:recipeId` - Get single recipe
- `GET /api/recipes/swipe/batch` - Get random recipes for swiping
- `GET /api/recipes/recommendations` - Get personalized recommendations
- `POST /api/recipes/:recipeId/like` - Like a recipe
- `GET /api/recipes/:recipeId/nutrition` - Get nutrition info

### Restaurants
- `GET /api/restaurants` - Get restaurants with filters
  - Query params: `cuisine`, `price`, `minRating`, `search`, `limit`, `skip`
- `GET /api/restaurants/:restaurantId` - Get single restaurant
- `GET /api/restaurants/swipe/batch` - Get random restaurants for swiping
- `GET /api/restaurants/recommendations` - Get personalized recommendations
- `POST /api/restaurants/seed` - Seed fake restaurant data (dev only)

### Sessions
- `GET /api/sessions` - Get user's sessions
- `POST /api/sessions` - Create new session (returns session code)
- `POST /api/sessions/join` - Join a session with code
- `GET /api/sessions/:sessionId` - Get session details
- `POST /api/sessions/:sessionId/leave` - Leave session
- `POST /api/sessions/:sessionId/swipe` - Record a swipe
- `GET /api/sessions/:sessionId/matches` - Get session matches
- `POST /api/sessions/:sessionId/messages` - Send message to session

## WebSocket Events

### Connection
1. Connect to WebSocket endpoint at `ws://localhost:3000`
2. Send authentication message:
```json
{
  "type": "authenticate",
  "token": "<your-clerk-token>"
}
```

### Message Types
- `JOIN_SESSION` - Join a session for real-time updates
- `LEAVE_SESSION` - Leave current session
- `SWIPE` - Send swipe data
- `MATCH_FOUND` - Notification when match is found
- `CHAT_MESSAGE` - Send/receive chat messages
- `SESSION_UPDATE` - Session state changes

### Example WebSocket Flow
```javascript
// Connect and authenticate
ws.send(JSON.stringify({
  type: "authenticate",
  token: clerkToken
}));

// Join a session
ws.send(JSON.stringify({
  type: "JOIN_SESSION",
  sessionId: "session-id-here"
}));

// Send a swipe
ws.send(JSON.stringify({
  type: "SWIPE",
  sessionId: "session-id-here",
  data: {
    itemType: "recipe",
    itemId: "recipe-id",
    direction: "right"
  }
}));

// Send a chat message
ws.send(JSON.stringify({
  type: "CHAT_MESSAGE",
  sessionId: "session-id-here",
  data: {
    message: "I love this recipe!"
  }
}));
```

## Data Models

### User
- `clerkUserId`: Unique ID from Clerk
- `profile`: User preferences and saved items
- `subscription`: FREE or PRO

### Session
- `sessionCode`: 6-character code for joining
- `participants`: Up to 5 users
- `matches`: Items both users swiped right on
- `expiresAt`: 1 hour default expiration

### Recipe
- Full recipe with ingredients, instructions, nutrition
- Dietary tags and cuisine types
- Difficulty and time estimates

### Restaurant
- Name, cuisine, price range (1-4)
- Rating and tags
- Mock data for now

## Business Rules
- Free users: 1 active session at a time
- Pro users: Unlimited sessions
- Sessions expire after 1 hour
- Maximum 5 participants per session
- Matches occur when 2+ users swipe right on same item

## Next Steps
1. Set up Clerk authentication credentials
2. Connect MongoDB instance
3. Seed recipe data from your collection
4. Test WebSocket connections
5. Implement frontend to consume API