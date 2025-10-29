⏺ 📊 Card Swiping Implementation Analysis Report

🏗️ Architecture Overview

The DinDin app's card swiping feature uses a stack-based card deck pattern with gesture-driven interactions. The
implementation consists of:

1. Main Container (index.tsx): Orchestrates the swipe experience
2. SwipeableCard Component (SwipeCards.tsx): Individual card with gesture handling
3. useSwipeControls Hook (use-swipe-controls.ts): Centralized control logic
4. Static Images (Images.ts): Temporary placeholder data

🎯 Component Hierarchy

index.tsx (SwipeCards Page)
├── GestureHandlerRootView
├── SignedIn/SignedOut (Auth wrapper)
├── View (container)
├── View (cardsContainer)
│ └── Animated.View
│ └── SwipeableCard[] (mapped from IMAGES)
│ ├── GestureDetector
│ └── Animated.View
│ └── Image (expo-image)
└── View (buttonsContainer)
├── PressableScale (reject button)
├── PressableScale (reset button)
└── PressableScale (like button)

🔧 Core Components Analysis

1. SwipeableCard Component

- Purpose: Individual swipeable card with gesture recognition
- Key Features:
  - Pan gesture detection with velocity tracking
  - Physics-based decision boundary (unit circle formula)
  - Spring animations for smooth transitions
  - Stack visualization (scale, translateY, opacity)
  - Rotation based on swipe direction

Props:

- image: Static image reference
- index: Card position in stack
- activeIndex: SharedValue for stack synchronization
- onSwipeRight/Left: Callbacks for swipe actions

Ref Methods (imperative API):

- swipeRight(): Programmatic right swipe
- swipeLeft(): Programmatic left swipe
- reset(): Return card to center

2. useSwipeControls Hook

- Purpose: Centralized swipe orchestration and state management
- Responsibilities:
  - Manages refs array for all cards
  - Tracks active card index
  - Provides programmatic swipe methods
  - Handles batch reset with staggered animation

Return Values:

- activeIndex: Current top card (SharedValue)
- refs: Array of card refs
- swipeRight/Left: Control functions
- reset: Stack reset function

🎨 Animation & Gesture System

Gesture Recognition

- Pan Gesture: Tracks translation (X,Y) and velocity
- Decision Algorithm:
  radius² = normalizedTranslation² + normalizedVelocity²
  Swipe triggers when radius > 1
- Smart Detection: Balances distance vs velocity (quick flick = slow drag)

Animation Stack

1. Active Card: Full opacity, no offset, scale 1.0
2. Stack Cards: Progressive scaling (0.93x per level), Y offset (23px), fading
3. Swipe Animation: Spring physics with 1.5x screen width translation
4. Rotation: ±9° based on horizontal position

🪝 React Hooks Usage

Core React Hooks:

- useCallback: Memoizes swipe/reset functions
- useMemo: Caches refs array and velocity ranges
- useRef: Stores timeout IDs for cleanup
- useEffect: Cleanup on unmount
- forwardRef: Exposes imperative API
- useImperativeHandle: Defines ref interface

React Native Hooks:

- useWindowDimensions: Responsive card sizing
- useSharedValue: Cross-thread animation state
- useDerivedValue: Computed rotation values
- useAnimatedStyle: Dynamic style interpolation

⚡ Performance Optimizations

1. Reanimated 2 Worklets: Animations run on UI thread
2. scheduleOnRN: Ensures swipe callbacks on correct thread
3. Shared Values: Avoids bridge crossing for animations
4. Image Caching: memory-disk policy for smooth loading
5. Conditional Rendering: Only 5 cards visible at once
6. cancelAnimation: Prevents animation conflicts

🔄 Data Flow

User Gesture → GestureDetector → Pan Handler
↓
Update translateX/Y → Calculate decision radius
↓
Threshold crossed? → Yes → scheduleOnRN(swipeCallback)
→ No → Spring back to center
↓
activeIndex++ → Stack repositions → Next card ready

🚨 Current Limitations & Issues

1. Static Images: Using hardcoded assets instead of recipe/restaurant data
2. Path Inconsistency: Mixed paths in Images.ts (./assets vs ../assets)
3. No Backend Integration: Missing API calls for recipes/restaurants
4. Limited State Management: Only tracking liked/disliked counts locally
5. No Persistence: Swipe history lost on navigation
6. Missing Features: No undo, no detail view, no filtering

🎯 Recommendations for Feature Branch

Given the current branch (feature/replace-static-card-images-with-recipe-images):

1. Replace IMAGES array with dynamic recipe data from backend
2. Add RecipeCard component with structured data display
3. Implement data fetching in useSwipeControls or parent component
4. Add loading states while fetching next batch
5. Include recipe metadata (name, calories, time) on cards
6. Connect swipe actions to backend session API

📈 Quality Metrics

- Component Coupling: Low - clean separation of concerns
- Reusability: High - SwipeableCard is generic
- Performance: Good - optimized animations
- Maintainability: Good - clear hook patterns
- Type Safety: Partial - some types could be stronger

⏺ ✅ Analysis Complete

The card swiping implementation is well-architected with:

- Clean separation between gesture handling, animation, and control logic
- Performance-optimized with Reanimated 2 and proper caching
- Physics-based gestures that balance swipe distance and velocity
- Reusable components ready for integration with real data

The main opportunity is replacing the static images with dynamic recipe/restaurant data from your backend API, which
aligns perfectly with your current feature branch goals.
