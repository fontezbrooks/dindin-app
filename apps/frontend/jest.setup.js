import "@testing-library/jest-native/extend-expect";

// Mock expo modules
jest.mock("expo-constants", () => ({
  expoConfig: {
    extra: {
      CLERK_PUBLISHABLE_KEY: "test-key",
    },
  },
}));

jest.mock("expo-asset", () => ({
  Asset: {
    fromModule: jest.fn(() => ({
      uri: "test-asset-uri",
    })),
  },
}));

jest.mock("expo-font", () => ({
  useFonts: jest.fn(() => [true, null]),
}));

jest.mock("expo-splash-screen", () => ({
  hideAsync: jest.fn(),
  preventAutoHideAsync: jest.fn(),
}));

jest.mock("expo-linking", () => ({
  createURL: jest.fn(),
  openURL: jest.fn(),
}));

jest.mock("expo-web-browser", () => ({
  openBrowserAsync: jest.fn(),
}));

jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

// Mock expo-image
jest.mock("expo-image", () => {
  const React = require("react");
  return {
    Image: ({ ref, ...props }) => {
      const MockImage = require("react-native").Image;
      return React.createElement(MockImage, { ...props, ref });
    },
  };
});

// Mock react-native-reanimated
jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  Reanimated.default.call = () => {};
  return {
    ...Reanimated,
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useDerivedValue: jest.fn((fn) => ({ value: fn() })),
    useAnimatedStyle: jest.fn((fn) => fn()),
    withTiming: jest.fn((value) => value),
    withSpring: jest.fn((value) => value),
    cancelAnimation: jest.fn(),
    interpolate: jest.fn(),
    Extrapolation: {
      CLAMP: "clamp",
      EXTEND: "extend",
    },
  };
});

// Mock react-native-gesture-handler
jest.mock("react-native-gesture-handler", () => {
  const View = require("react-native").View;
  return {
    Gesture: {
      Pan: () => ({
        onBegin: jest.fn().mockReturnThis(),
        onUpdate: jest.fn().mockReturnThis(),
        onFinalize: jest.fn().mockReturnThis(),
      }),
    },
    GestureDetector: ({ children }) => children,
    GestureHandlerRootView: View,
    TouchableOpacity: View,
  };
});

// Mock react-native-worklets
jest.mock("react-native-worklets", () => ({
  scheduleOnRN: jest.fn((fn) => fn()),
}));

// Mock Clerk
jest.mock("@clerk/clerk-expo", () => ({
  ClerkProvider: ({ children }) => children,
  useAuth: jest.fn(() => ({
    isSignedIn: true,
    signOut: jest.fn(),
    getToken: jest.fn(() => Promise.resolve("mock-token")),
    userId: "mock-user-id",
  })),
  useClerk: jest.fn(() => ({
    signOut: jest.fn(() => Promise.resolve()),
    signIn: jest.fn(() => Promise.resolve()),
  })),
  useUser: jest.fn(() => ({
    user: {
      id: "mock-user-id",
      emailAddresses: [{ emailAddress: "test@example.com" }],
      firstName: "Test",
      lastName: "User",
    },
    isLoaded: true,
  })),
  tokenCache: {
    getToken: jest.fn(),
    saveToken: jest.fn(),
  },
}));

// Mock Sentry
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  withScope: jest.fn((callback) =>
    callback({
      setTag: jest.fn(),
      setLevel: jest.fn(),
      setContext: jest.fn(),
    })
  ),
  captureException: jest.fn(() => "mock-event-id"),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

// Mock Expo Router
jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  })),
  Stack: {
    Screen: ({ children }) => children,
  },
  Tabs: {
    Screen: ({ children }) => children,
  },
  Link: ({ children }) => children,
  Slot: ({ children }) => children,
}));

// Mock react-navigation
jest.mock("@react-navigation/native", () => ({
  DefaultTheme: {
    colors: {
      background: "#ffffff",
      primary: "#007AFF",
    },
  },
  DarkTheme: {
    colors: {
      background: "#000000",
      primary: "#007AFF",
    },
  },
  ThemeProvider: ({ children }) => children,
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true),
  })),
  useFocusEffect: jest.fn(),
}));

// Mock Async Storage
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
}));

// Mock Zustand
jest.mock("zustand", () => ({
  create: jest.fn((fn) => fn),
}));

// Mock LogLayer
jest.mock("loglayer", () => ({
  LogLayer: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    withError: jest.fn(),
  })),
  ConsoleTransport: jest.fn(),
}));

// Mock Flash List
jest.mock("@shopify/flash-list", () => ({
  FlashList: require("react-native").FlatList,
}));

// Mock Skia
jest.mock("@shopify/react-native-skia", () => ({
  Canvas: ({ children }) => children,
  Group: ({ children }) => children,
  Rect: () => null,
  Circle: () => null,
}));

// Mock react-native-skia-gesture
jest.mock("react-native-skia-gesture", () => ({}));

// Mock Pressto
jest.mock("pressto", () => ({
  create: jest.fn(() => ({
    getState: jest.fn(() => ({})),
    setState: jest.fn(),
    subscribe: jest.fn(),
  })),
}));

// Global test setup
global.__DEV__ = true;

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock global fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
    ok: true,
    status: 200,
  })
);

// Mock WebSocket
global.WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1,
}));

// React Native specific mocks
jest.mock("react-native/Libraries/Utilities/Platform", () => ({
  OS: "ios",
  select: jest.fn((obj) => obj.ios || obj.default),
}));

// Mock Animated
jest.mock("react-native/Libraries/Animated/NativeAnimatedHelper");

// Silence specific warnings in tests
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === "string" &&
    (args[0].includes("Warning: ReactDOM.render is no longer supported") ||
      args[0].includes("Warning: `useNativeDriver` was not specified"))
  ) {
    return;
  }
  originalConsoleWarn.call(console, ...args);
};
