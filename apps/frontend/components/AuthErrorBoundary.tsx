import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ErrorBoundary, type ErrorFallbackProps } from "./ErrorBoundary";

interface AuthErrorFallbackProps extends ErrorFallbackProps {
  onSignOut?: () => void;
  onRetryAuth?: () => void;
}

const AuthErrorFallback: React.FC<AuthErrorFallbackProps> = ({
  error,
  resetError,
  onSignOut,
  onRetryAuth,
}) => {
  const isAuthError =
    error?.message?.toLowerCase().includes("auth") ||
    error?.message?.toLowerCase().includes("unauthorized") ||
    error?.message?.toLowerCase().includes("forbidden") ||
    error?.message?.toLowerCase().includes("token") ||
    error?.status === 401 ||
    error?.status === 403;

  if (!isAuthError) {
    // If it's not an auth error, fall back to default error handling
    throw error;
  }

  const handleSignOut = () => {
    if (onSignOut) {
      onSignOut();
    }
    resetError();
  };

  const handleRetryAuth = () => {
    if (onRetryAuth) {
      onRetryAuth();
    }
    resetError();
  };

  const getErrorMessage = () => {
    if (error?.status === 401) {
      return "Your session has expired. Please sign in again to continue.";
    }
    if (error?.status === 403) {
      return "You don't have permission to access this feature.";
    }
    if (error?.message?.toLowerCase().includes("token")) {
      return "Authentication token is invalid. Please sign in again.";
    }
    return "We're having trouble with authentication. Please try signing in again.";
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons color="#f59e0b" name="lock-closed-outline" size={64} />
      </View>

      <Text style={styles.title}>Authentication Required</Text>
      <Text style={styles.message}>{getErrorMessage()}</Text>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          onPress={handleRetryAuth}
          style={styles.primaryButton}
        >
          <Ionicons color="#fff" name="refresh" size={20} />
          <Text style={styles.primaryButtonText}>Retry</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSignOut}
          style={styles.secondaryButton}
        >
          <Ionicons color="#f59e0b" name="log-out-outline" size={20} />
          <Text style={styles.secondaryButtonText}>Sign Out & Try Again</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={resetError} style={styles.tertiaryButton}>
          <Text style={styles.tertiaryButtonText}>Continue Without Auth</Text>
        </TouchableOpacity>
      </View>

      {__DEV__ && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Debug Info:</Text>
          <Text style={styles.debugText}>Error: {error?.message}</Text>
          <Text style={styles.debugText}>Status: {error?.status}</Text>
        </View>
      )}
    </View>
  );
};

type AuthErrorBoundaryProps = {
  children: React.ReactNode;
  onAuthError?: (error: Error) => void;
  fallback?: React.ComponentType<AuthErrorFallbackProps>;
};

export const AuthErrorBoundary: React.FC<AuthErrorBoundaryProps> = ({
  children,
  onAuthError,
  fallback,
}) => {
  const { signOut, getToken } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleRetryAuth = async () => {
    try {
      // Try to refresh the token
      await getToken({ template: "default" });
    } catch (error) {
      console.error("Error refreshing token:", error);
      // If refresh fails, sign out
      await handleSignOut();
    }
  };

  const CustomFallback = fallback || AuthErrorFallback;

  return (
    <ErrorBoundary
      fallback={(props) => (
        <CustomFallback
          {...props}
          onRetryAuth={handleRetryAuth}
          onSignOut={handleSignOut}
        />
      )}
      level="section"
      name="AuthErrorBoundary"
      onError={(error) => {
        if (onAuthError) {
          onAuthError(error);
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
    marginBottom: 32,
    lineHeight: 24,
    maxWidth: 300,
  },
  actionsContainer: {
    width: "100%",
    maxWidth: 300,
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3b82f6",
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
    borderColor: "#f59e0b",
    gap: 8,
  },
  secondaryButtonText: {
    color: "#f59e0b",
    fontSize: 14,
    fontWeight: "500",
  },
  tertiaryButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  tertiaryButtonText: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "500",
  },
  debugContainer: {
    width: "100%",
    maxWidth: 300,
    marginTop: 32,
    padding: 16,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: "#6b7280",
    fontFamily: "monospace",
    marginBottom: 4,
  },
});
