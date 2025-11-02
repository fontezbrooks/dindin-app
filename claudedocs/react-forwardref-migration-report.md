# React 19 ForwardRef Migration Report

## Executive Summary

**Project**: DinDin App Frontend
**React Version**: 19.1
**Analysis Date**: November 1, 2025
**Impact**: 3 files requiring migration
**Risk Level**: Low
**Estimated Effort**: 30-45 minutes

## Migration Overview

React 19 has deprecated the `forwardRef` API in favor of passing `ref` as a regular prop. This simplifies component code and improves TypeScript inference. Your project is already on React 19.1, making this migration both safe and recommended.

## Files Requiring Migration

### 1. **SwipeCards.tsx** (Complex - useImperativeHandle)
- **Location**: `apps/frontend/components/SwipeCards.tsx`
- **Line**: 36-41
- **Pattern**: forwardRef with useImperativeHandle
- **Usage**: Exposes `swipeLeft()`, `swipeRight()`, `reset()` methods
- **Dependencies**: Used by `use-swipe-controls.ts` and `use-recipe-swipe.ts`
- **Risk**: Low - API remains unchanged for consumers

### 2. **SkiaTabButton.tsx** (Simple - Ref Forwarding)
- **Location**: `apps/frontend/components/navigation/custom-tabs/SkiaTabButton.tsx`
- **Line**: 20
- **Pattern**: Simple ref forwarding to AnimatedPressable
- **Type Issue**: Uses `any` type for ref (should be fixed)
- **Risk**: Very Low - Simple forwarding pattern

### 3. **jest.setup.js** (Test Mock)
- **Location**: `apps/frontend/jest.setup.js`
- **Line**: 54
- **Pattern**: Mock implementation using forwardRef
- **Purpose**: Mocking expo-image for testing
- **Risk**: Very Low - Test infrastructure only

## Migration Strategy

### Before/After Examples

#### SwipeCards.tsx Migration

**Before:**
```typescript
const SwipeableCard = forwardRef<
  {},
  SwipeableCardProps
>(({ image, index, activeIndex, onSwipeLeft, onSwipeRight, children }, ref) => {
  // component implementation
});
```

**After:**
```typescript
type SwipeableCardProps = {
  ref?: React.Ref<SwipeableCardRefType>;
  image?: (typeof IMAGES)[0] | null;
  index: number;
  activeIndex: SharedValue<number>;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  children?: React.ReactNode;
};

const SwipeableCard = ({
  ref,
  image,
  index,
  activeIndex,
  onSwipeLeft,
  onSwipeRight,
  children
}: SwipeableCardProps) => {
  // useImperativeHandle remains unchanged
  useImperativeHandle(ref, () => ({
    swipeLeft,
    swipeRight,
    reset,
  }), [swipeLeft, swipeRight, reset]);

  // rest of component
};
```

#### SkiaTabButton.tsx Migration

**Before:**
```typescript
export const SkiaTabButton = forwardRef<any, SkiaTabButtonProps>(
  ({ icon, label, isActive, onPress, ...props }, ref) => {
    // component
  }
);
```

**After:**
```typescript
type SkiaTabButtonProps = {
  ref?: React.Ref<View>; // Properly typed instead of 'any'
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  index: number;
  isActive: boolean;
  onPress: () => void;
};

export const SkiaTabButton = ({
  ref,
  icon,
  label,
  isActive,
  onPress,
  ...props
}: SkiaTabButtonProps) => {
  // component
};
```

#### jest.setup.js Migration

**Before:**
```javascript
Image: React.forwardRef((props, ref) => {
  const MockImage = require("react-native").Image;
  return React.createElement(MockImage, { ...props, ref });
})
```

**After:**
```javascript
Image: ({ ref, ...props }) => {
  const MockImage = require("react-native").Image;
  return React.createElement(MockImage, { ...props, ref });
}
```

## Migration Steps

### Step 1: Update Biome Configuration
```json
{
  "linter": {
    "rules": {
      "nursery": {
        "noReactForwardRef": "error"
      }
    }
  }
}
```

### Step 2: Migrate Files (Recommended Order)

1. **jest.setup.js** - Start with test infrastructure
   - Remove `React.forwardRef` wrapper
   - Update mock to use ref as prop

2. **SkiaTabButton.tsx** - Simple forwarding case
   - Remove forwardRef import and wrapper
   - Add ref to props type definition
   - Fix ref type from `any` to proper type

3. **SwipeCards.tsx** - Complex imperative handle case
   - Remove forwardRef import and wrapper
   - Add ref to SwipeableCardProps type
   - Keep useImperativeHandle unchanged
   - Export component directly

### Step 3: Test Migration

1. Run existing tests:
   ```bash
   bun test SwipeCards.Test.tsx
   ```

2. Test swipe functionality manually:
   - Verify card swiping works
   - Test programmatic swipe controls
   - Ensure ref methods are accessible

3. Run Biome linter:
   ```bash
   bun run check
   ```

## Benefits of Migration

1. **Simpler API**: No need for forwardRef wrapper
2. **Better TypeScript**: Improved type inference for refs
3. **Cleaner Code**: More straightforward component definitions
4. **React 19 Compliance**: Follows latest React best practices
5. **Biome Compliance**: Satisfies linter rules

## Potential Issues & Solutions

| Issue | Solution |
|-------|----------|
| TypeScript errors after migration | Ensure ref is optional in prop types: `ref?: React.Ref<T>` |
| Test failures | Update test mocks to match new pattern |
| Consumer component errors | No changes needed - ref usage remains the same |
| Biome warnings | Enable the noReactForwardRef rule to catch remaining instances |

## Testing Checklist

- [ ] SwipeCards component renders correctly
- [ ] Ref methods (swipeLeft, swipeRight, reset) work
- [ ] SkiaTabButton forwards ref to AnimatedPressable
- [ ] All existing tests pass
- [ ] No TypeScript errors
- [ ] Biome linter passes
- [ ] Manual testing of swipe functionality
- [ ] Session-based swiping works correctly

## Code Quality Improvements

Along with the migration, consider these improvements:

1. **Fix SkiaTabButton ref type**: Replace `any` with proper `View` or component type
2. **Type SwipeableCard ref properly**: Remove empty object type `{}`
3. **Add ref prop documentation**: Document when and why refs are needed
4. **Consider ref alternatives**: Some ref usage might be replaceable with state/callbacks

## Conclusion

This migration from `forwardRef` to ref-as-prop is a straightforward improvement that aligns with React 19 best practices. The changes are minimal, backward-compatible, and will improve code maintainability. The project's existing React 19.1 version fully supports this pattern, making this a safe migration with immediate benefits.

## Next Steps

1. Create a feature branch: `git checkout -b refactor/remove-forwardref`
2. Apply migrations in the recommended order
3. Run tests and manual verification
4. Commit with message: "refactor: migrate from forwardRef to ref-as-prop for React 19 compliance"
5. Create PR for review

## References

- [React 19 Blog Post - Ref as a Prop](https://react.dev/blog/2024/12/05/react-19#ref-as-a-prop)
- [Biome noReactForwardRef Rule](https://biomejs.dev/linter/rules/no-react-forward-ref/)
- [React 19 Migration Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)