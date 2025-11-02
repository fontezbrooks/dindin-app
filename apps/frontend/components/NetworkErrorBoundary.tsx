import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ErrorBoundary, type ErrorFallbackProps } from "./ErrorBoundary";

interface NetworkErrorFallbackProps extends ErrorFallbackProps {
  retry?: () => void;
  showOfflineIndicator?: boolean;
}

const NetworkErrorFallback: React.FC<NetworkErrorFallbackProps> = ({
  error,
  resetError,
  retry,
  showOfflineIndicator = true,
}) => {
  const isNetworkError =
    error?.message?.toLowerCase().includes("network") ||
    error?.message?.toLowerCase().includes("fetch") ||
    error?.message?.toLowerCase().includes("timeout") ||
    error?.name === "NetworkError";

  const handleRetry = () => {
    if (retry) {
      retry();
    }
    resetError();
  };

  if (!isNetworkError) {
    // If it's not a network error, fall back to default error handling
    throw error;
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons color="#ef4444" name="cloud-offline-outline" size={64} />
      </View>

      <Text style={styles.title}>Connection Problem</Text>
      <Text style={styles.message}>
        We're having trouble connecting to our servers. Please check your
        internet connection and try again.
      </Text>

      {showOfflineIndicator && (
        <View style={styles.statusContainer}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Offline</Text>
        </View>
      )}

      <View style={styles.actionsContainer}>
        <TouchableOpacity onPress={handleRetry} style={styles.primaryButton}>
          <Ionicons color="#fff" name="refresh" size={20} />
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={resetError} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Continue Offline</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.helpContainer}>
        <Text style={styles.helpTitle}>Troubleshooting:</Text>
        <Text style={styles.helpText}>
          • Check your WiFi or mobile data connection
        </Text>
        <Text style={styles.helpText}>
          • Make sure you have internet access
        </Text>
        <Text style={styles.helpText}>• Try again in a few moments</Text>
      </View>
    </View>
  );
};

type NetworkErrorBoundaryProps = {
  children: React.ReactNode;
  onRetry?: () => void;
  showOfflineIndicator?: boolean;
  fallback?: React.ComponentType<NetworkErrorFallbackProps>;
};

export const NetworkErrorBoundary: React.FC<NetworkErrorBoundaryProps> = ({
  children,
  onRetry,
  showOfflineIndicator,
  fallback,
}) => {
  const CustomFallback = fallback || NetworkErrorFallback;

  return (
    <ErrorBoundary
      fallback={(props) => (
        <CustomFallback
          {...props}
          retry={onRetry}
          showOfflineIndicator={showOfflineIndicator}
        />
      )}
      level="section"
      name="NetworkErrorBoundary"
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
    marginBottom: 24,
    lineHeight: 24,
    maxWidth: 300,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fee2e2",
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: "#dc2626",
    fontWeight: "500",
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
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "500",
  },
  helpContainer: {
    width: "100%",
    maxWidth: 300,
    padding: 16,
    backgroundColor: "#f0f9ff",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#0ea5e9",
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0c4a6e",
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: "#0c4a6e",
    lineHeight: 18,
    marginBottom: 4,
  },
});
