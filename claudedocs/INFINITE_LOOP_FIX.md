# Infinite API Loop Issue - FIXED

## Problem
The app was making infinite API calls that never stopped:
- `/api/users/preferences` returning 404 errors repeatedly
- `/api/recipes/swipe/batch` being called continuously with new cursors

## Root Causes Identified

### 1. Missing API Endpoint
- `/api/users/preferences` endpoint didn't exist in the backend
- This caused 404 errors but the frontend kept retrying

### 2. React Hook Dependency Cycle
- The `loadRecipes` function had `nextCursor` in its dependency array
- But `loadRecipes` also updates `nextCursor`
- This created an infinite loop: nextCursor changes → loadRecipes runs → nextCursor changes → repeat

## Solutions Applied

### 1. Created Missing Endpoint
**File**: `apps/backend/src/routes/users.ts`
```typescript
// Added new endpoint
userRoutes.get("/preferences", async (c) => {
  const user = c.get("user") as User;
  return c.json({
    dietaryRestrictions: user.profile.dietaryPreferences || [],
    cuisinePreferences: user.profile.cuisinePreferences || [],
    allergies: user.profile.allergies || [],
  });
});
```

### 2. Fixed React Hook Dependencies
**File**: `apps/frontend/hooks/use-recipe-swipe.ts`

Changes made:
- Removed `nextCursor` from `loadRecipes` dependencies
- Added `cursor` parameter to `loadRecipes` function
- Updated the effect that loads more cards to pass cursor explicitly
- This breaks the dependency cycle

```typescript
// Before (BROKEN)
const loadRecipes = useCallback(
  async (isInitial = false) => {
    // ... uses nextCursor directly
  },
  [filters, nextCursor, authInitialized, getToken] // ❌ nextCursor in deps
);

// After (FIXED)
const loadRecipes = useCallback(
  async (isInitial = false, cursor?: string) => {
    // ... uses cursor parameter or nextCursor
  },
  [filters, authInitialized, getToken] // ✅ nextCursor removed
);
```

## Testing the Fix

1. **Restart the backend** to include the new endpoint:
   ```bash
   cd apps/backend
   bun run dev
   ```

2. **Restart the frontend**:
   ```bash
   cd apps/frontend
   bun run dev:native
   ```

3. **Verify in console**:
   - No more 404 errors for `/api/users/preferences`
   - `/api/recipes/swipe/batch` only called when needed
   - No infinite loop of API calls

## Expected Behavior

- Initial load: 1-2 API calls to fetch recipes
- Swipe through cards: New batch loads when <5 cards remain
- User preferences: Loaded once successfully
- No continuous/infinite API calls

## Monitoring Points

Watch the network tab or console for:
- ✅ Single call to `/api/users/preferences` (200 OK)
- ✅ Initial call to `/api/recipes/swipe/batch`
- ✅ Additional batch calls only when swiping through cards
- ❌ No repeated rapid-fire API calls
- ❌ No 404 errors

## Performance Impact

This fix will:
- Reduce server load dramatically
- Improve app performance
- Reduce network bandwidth usage
- Prevent potential API rate limiting issues
- Fix battery drain on mobile devices