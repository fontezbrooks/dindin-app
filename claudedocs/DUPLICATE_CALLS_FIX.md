# Duplicate API Calls & Infinite Loop - FIXED

## Issues Identified

1. **Duplicate API calls** - Every request made twice
2. **Infinite re-renders** - `loadRecipes` causing dependency loop
3. **cursor=undefined** - Improper cursor handling
4. **React StrictMode** - Double rendering in development

## Root Causes

### 1. React StrictMode Double Rendering
In development, React StrictMode intentionally double-renders components to detect side effects. This causes duplicate API calls.

### 2. UseEffect Dependency Loop
The `loadRecipes` function was in its own dependency array, causing infinite re-renders whenever it was recreated.

### 3. Missing Load Guards
No flag to prevent multiple simultaneous loads or track initial load completion.

## Solutions Applied

### 1. Added Initial Load Tracking
```typescript
const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

// Only load once after auth
useEffect(() => {
  if (authInitialized && !hasInitiallyLoaded) {
    setHasInitiallyLoaded(true);
    loadRecipes(true);
  }
}, [authInitialized, hasInitiallyLoaded, loadRecipes]);
```

### 2. Fixed Load More Logic
```typescript
// Added guards to prevent duplicate loads
if (
  remainingCards < 5 &&
  hasMore &&
  !loadingNextBatch.current &&
  nextCursor &&
  !isLoading &&
  hasInitiallyLoaded // New guard
) {
  loadRecipes(false, nextCursor);
}
```

### 3. Improved Reset Function
```typescript
const reset = useCallback(() => {
  // ... reset logic ...
  setNextCursor(undefined);
  setHasInitiallyLoaded(false);

  // Delayed reload to avoid race conditions
  setTimeout(() => {
    setHasInitiallyLoaded(true);
    loadRecipes(true);
  }, 100);
}, [refs, activeIndex, loadRecipes]);
```

## Testing the Fix

1. **Restart the frontend**:
   ```bash
   cd apps/frontend
   bun run dev:native
   ```

2. **Monitor the console** for:
   - ✅ Single initial load of preferences and recipes
   - ✅ No rapid successive calls
   - ✅ cursor=undefined only on first load
   - ✅ Proper cursor values for pagination
   - ❌ No infinite loops

## Expected Behavior

### Initial Load
```
GET /api/users/preferences (once or twice due to StrictMode)
GET /api/recipes/swipe/batch?limit=10&cursor=undefined (initial)
```

### When Swiping
```
// Only when <5 cards remain:
GET /api/recipes/swipe/batch?limit=10&cursor=[timestamp]
```

### No More
- Continuous rapid API calls
- cursor=undefined after initial load
- Infinite re-render loops

## Remaining Considerations

### React StrictMode
The duplicate calls in development are **expected behavior** from React StrictMode. This helps detect side effects. In production builds, this won't happen.

To completely eliminate duplicates in development, you could:
1. Disable StrictMode (not recommended)
2. Add request deduplication in the service layer
3. Implement request caching

### Performance Optimization
Consider adding:
- Request debouncing
- Optimistic UI updates
- Prefetch more cards (increase from 10)
- Virtual list rendering for large datasets

## Monitoring Points

Watch for:
- Initial load completes successfully
- Cards display properly
- Swiping works smoothly
- New batches load only when needed
- No console errors