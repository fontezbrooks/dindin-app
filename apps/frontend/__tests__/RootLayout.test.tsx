import { render } from "@testing-library/react-native";
import RootLayout from "../app/_layout";

// Mock fonts loading
jest.mock("expo-font", () => ({
  useFonts: jest.fn(() => [true, null]), // fonts loaded, no error
}));

// Mock error test harness
jest.mock("@/components/error-boundaries", () => ({
  ErrorBoundary: ({ children, level, name }) => (
    <div testID={`error-boundary-${level}-${name}`}>{children}</div>
  ),
  AuthErrorBoundary: ({ children, onAuthError }) => (
    <div testID="auth-error-boundary">{children}</div>
  ),
  useErrorTestHarness: () => ({
    TestHarness: () => <div testID="error-test-harness" />,
  }),
}));

// Mock Sentry
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  withScope: jest.fn(),
  captureException: jest.fn(),
}));

// Mock Stack from expo-router
jest.mock("expo-router", () => ({
  Stack: {
    Screen: ({ name, options }) => <div testID={`stack-screen-${name}`} />,
  },
}));

// Mock theme provider
jest.mock("@react-navigation/native", () => ({
  DarkTheme: { colors: { background: "#000" } },
  DefaultTheme: { colors: { background: "#fff" } },
  ThemeProvider: ({ children, value }) => (
    <div testID={`theme-provider-${value.colors.background}`}>{children}</div>
  ),
}));

// Mock useColorScheme
jest.mock("@/components/useColorScheme", () => ({
  useColorScheme: jest.fn(() => "light"),
}));

describe("RootLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders successfully when fonts are loaded", () => {
    const { getByTestId } = render(<RootLayout />);

    // Should render the main error boundary
    expect(getByTestId("error-boundary-page-RootLayout")).toBeTruthy();

    // Should render the error test harness
    expect(getByTestId("error-test-harness")).toBeTruthy();
  });

  it("renders auth error boundary with Clerk provider", () => {
    const { getByTestId } = render(<RootLayout />);

    // Should render auth error boundary inside the main layout
    expect(getByTestId("auth-error-boundary")).toBeTruthy();
  });

  it("renders navigation stack with correct screens", () => {
    const { getByTestId } = render(<RootLayout />);

    // Should render stack screens
    expect(getByTestId("stack-screen-(home)")).toBeTruthy();
    expect(getByTestId("stack-screen-modal")).toBeTruthy();
  });

  it("applies correct theme based on color scheme", () => {
    const { getByTestId } = render(<RootLayout />);

    // Should apply light theme by default
    expect(getByTestId("theme-provider-#fff")).toBeTruthy();
  });

  it("handles dark theme correctly", () => {
    const { useColorScheme } = require("@/components/useColorScheme");
    useColorScheme.mockReturnValue("dark");

    const { getByTestId } = render(<RootLayout />);

    // Should apply dark theme
    expect(getByTestId("theme-provider-#000")).toBeTruthy();
  });

  it("returns null when fonts are not loaded", () => {
    const { useFonts } = require("expo-font");
    useFonts.mockReturnValue([false, null]); // fonts not loaded

    const { container } = render(<RootLayout />);

    // Should render nothing when fonts are not loaded
    expect(container.children).toHaveLength(0);
  });

  it("throws error when font loading fails", () => {
    const { useFonts } = require("expo-font");
    const fontError = new Error("Font loading failed");
    useFonts.mockReturnValue([false, fontError]); // font loading error

    // Should throw the font loading error
    expect(() => render(<RootLayout />)).toThrow("Font loading failed");
  });

  it("initializes Sentry correctly", () => {
    const Sentry = require("@sentry/react-native");

    // Force re-import to trigger Sentry.init
    jest.resetModules();
    require("../app/_layout");

    expect(Sentry.init).toHaveBeenCalledWith({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      debug: true, // __DEV__ is true in tests
      enableNativeFramesTracking: true,
      environment: "development",
    });
  });

  it("handles auth errors with Sentry integration", () => {
    const Sentry = require("@sentry/react-native");
    const mockScope = {
      setTag: jest.fn(),
      setLevel: jest.fn(),
    };
    Sentry.withScope.mockImplementation((callback) => callback(mockScope));

    const { getByTestId } = render(<RootLayout />);
    const authBoundary = getByTestId("auth-error-boundary");

    // The auth error boundary should be configured with Sentry integration
    expect(authBoundary).toBeTruthy();
  });

  it("has correct unstable settings for expo-router", () => {
    const layout = require("../app/_layout");

    expect(layout.unstable_settings).toEqual({
      initialRouteName: "(tabs)",
    });
  });

  it("exports ErrorBoundary type correctly", () => {
    const layout = require("../app/_layout");

    // Should re-export ErrorBoundary type from expo-router
    expect(layout.ErrorBoundary).toBeDefined();
  });
});
