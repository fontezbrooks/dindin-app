import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ErrorBoundary, type ErrorFallbackProps } from "./ErrorBoundary";

interface RouteErrorFallbackProps extends ErrorFallbackProps {
  onNavigateHome?: () => void;
  onGoBack?: () => void;
  routeName?: string;
}

const RouteErrorFallback: React.FC<RouteErrorFallbackProps> = ({
  error,
  resetError,
  onNavigateHome,
  onGoBack,
  routeName,
}) => {
  const isRouteError =
    error?.message?.toLowerCase().includes("route") ||
    error?.message?.toLowerCase().includes("navigation") ||
    error?.message?.toLowerCase().includes("screen") ||
    error?.name === "NavigationError" ||
    error?.name === "RouteError";

  if (!isRouteError) {
    // If it's not a route error, fall back to default error handling
    throw error;
  }

  const handleNavigateHome = () => {
    if (onNavigateHome) {
      onNavigateHome();
    }
    resetError();
  };

  const handleGoBack = () => {
    if (onGoBack) {
      onGoBack();
    }
    resetError();
  };

  const getErrorMessage = () => {
    if (error?.message?.toLowerCase().includes("not found")) {
      return `The page "${routeName || "requested"}" could not be found.`;
    }
    if (error?.message?.toLowerCase().includes("navigation")) {
      return "There was a problem navigating to this page.";
    }
    return "We encountered an error while loading this page.";
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons color="#8b5cf6" name="map-outline" size={64} />
      </View>

      <Text style={styles.title}>Navigation Error</Text>
      <Text style={styles.message}>{getErrorMessage()}</Text>

      {routeName && (
        <View style={styles.routeContainer}>
          <Text style={styles.routeLabel}>Route:</Text>
          <Text style={styles.routeName}>{routeName}</Text>
        </View>
      )}

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          onPress={handleNavigateHome}
          style={styles.primaryButton}
        >
          <Ionicons color="#fff" name="home" size={20} />
          <Text style={styles.primaryButtonText}>Go Home</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleGoBack} style={styles.secondaryButton}>
          <Ionicons color="#8b5cf6" name="arrow-back" size={20} />
          <Text style={styles.secondaryButtonText}>Go Back</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={resetError} style={styles.tertiaryButton}>
          <Ionicons color="#6b7280" name="refresh" size={20} />
          <Text style={styles.tertiaryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.helpContainer}>
        <Text style={styles.helpTitle}>What you can do:</Text>
        <Text style={styles.helpText}>• Check if the URL is correct</Text>
        <Text style={styles.helpText}>• Try refreshing the page</Text>
        <Text style={styles.helpText}>• Go back to the previous page</Text>
        <Text style={styles.helpText}>• Return to the home screen</Text>
      </View>
    </View>
  );
};

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
  routeName?: string;
  onRouteError?: (error: Error, routeName?: string) => void;
  fallback?: React.ComponentType<RouteErrorFallbackProps>;
}

export const RouteErrorBoundary: React.FC<RouteErrorBoundaryProps> = ({
  children,
  routeName,
  onRouteError,
  fallback,
}) => {
  const router = useRouter();

  const handleNavigateHome = () => {
    try {
      router.replace("/");
    } catch (error) {
      console.error("Error navigating home:", error);
      // Fallback to router.push if replace fails
      router.push("/");
    }
  };

  const handleGoBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        handleNavigateHome();
      }
    } catch (error) {
      console.error("Error going back:", error);
      handleNavigateHome();
    }
  };

  const CustomFallback = fallback || RouteErrorFallback;

  return (
    <ErrorBoundary
      fallback={(props) => (
        <CustomFallback
          {...props}
          onGoBack={handleGoBack}
          onNavigateHome={handleNavigateHome}
          routeName={routeName}
        />
      )}
      level="page"
      name={`RouteErrorBoundary${routeName ? ` (${routeName})` : ""}`}
      onError={(error) => {
        if (onRouteError) {
          onRouteError(error, routeName);
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f8f9fa",
  },
  iconContainer: {
    marginBottom: 24,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 24,
    maxWidth: 300,
  },
  routeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  routeLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginRight: 8,
  },
  routeName: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "500",
    fontFamily: "monospace",
  },
  actionsContainer: {
    width: "100%",
    maxWidth: 300,
    gap: 12,
    marginBottom: 32,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8b5cf6",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#8b5cf6",
    gap: 8,
  },
  secondaryButtonText: {
    color: "#8b5cf6",
    fontSize: 14,
    fontWeight: "500",
  },
  tertiaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  tertiaryButtonText: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "500",
  },
  helpContainer: {
    width: "100%",
    maxWidth: 300,
    padding: 16,
    backgroundColor: "#ede9fe",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#8b5cf6",
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5b21b6",
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: "#5b21b6",
    lineHeight: 18,
    marginBottom: 4,
  },
});
