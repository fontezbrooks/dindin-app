import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import {
  Alert,
  Clipboard,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { ErrorFallbackProps } from "./ErrorBoundary";

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  resetError,
  eventId,
  level,
  name,
}) => {
  const isProduction =
    !process.env.NODE_ENV || process.env.NODE_ENV === "production";

  const handleCopyError = async () => {
    if (!error) return;

    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      eventId,
      timestamp: new Date().toISOString(),
    };

    const errorText = JSON.stringify(errorDetails, null, 2);
    await Clipboard.setString(errorText);

    Alert.alert(
      "Error Details Copied",
      "Error details have been copied to your clipboard.",
      [{ text: "OK" }]
    );
  };

  const handleReportIssue = () => {
    Alert.alert(
      "Report Issue",
      "Would you like to report this issue to our support team?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report",
          onPress: () => {
            // Here you could integrate with your issue tracking system
            // For now, we'll just show the event ID
            if (eventId) {
              Alert.alert(
                "Issue Reported",
                `Your error has been logged with ID: ${eventId.slice(0, 8)}...`,
                [{ text: "OK" }]
              );
            }
          },
        },
      ]
    );
  };

  const getErrorIcon = () => {
    switch (level) {
      case "page":
        return "document-text-outline";
      case "section":
        return "grid-outline";
      default:
        return "alert-circle-outline";
    }
  };

  const getErrorTitle = () => {
    switch (level) {
      case "page":
        return "Page Error";
      case "section":
        return "Section Error";
      default:
        return "Something went wrong";
    }
  };

  const getErrorMessage = () => {
    if (isProduction) {
      return "We encountered an unexpected error. Please try again.";
    }
    return error?.message || "An unknown error occurred";
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <Ionicons
            color={styles.errorColor.color}
            name={getErrorIcon() as any}
            size={64}
          />
        </View>

        {/* Error Title */}
        <Text style={styles.title}>{getErrorTitle()}</Text>

        {/* Error Message */}
        <Text style={styles.message}>{getErrorMessage()}</Text>

        {/* Boundary Name */}
        {name && <Text style={styles.boundaryName}>in {name}</Text>}

        {/* Event ID (Production) */}
        {isProduction && eventId && (
          <Text style={styles.eventId}>Error ID: {eventId.slice(0, 8)}...</Text>
        )}

        {/* Development Error Details */}
        {!isProduction && error && (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Error Details:</Text>
            <ScrollView horizontal style={styles.errorDetails}>
              <Text style={styles.errorText}>{error.stack}</Text>
            </ScrollView>

            {errorInfo?.componentStack && (
              <>
                <Text style={styles.detailsTitle}>Component Stack:</Text>
                <ScrollView horizontal style={styles.errorDetails}>
                  <Text style={styles.errorText}>
                    {errorInfo.componentStack}
                  </Text>
                </ScrollView>
              </>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity onPress={resetError} style={styles.primaryButton}>
            <Ionicons color="#fff" name="refresh" size={20} />
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleReportIssue}
            style={styles.secondaryButton}
          >
            <Ionicons
              color={styles.errorColor.color}
              name="bug-outline"
              size={20}
            />
            <Text style={styles.secondaryButtonText}>Report Issue</Text>
          </TouchableOpacity>

          {!isProduction && (
            <TouchableOpacity
              onPress={handleCopyError}
              style={styles.secondaryButton}
            >
              <Ionicons
                color={styles.errorColor.color}
                name="copy-outline"
                size={20}
              />
              <Text style={styles.secondaryButtonText}>Copy Error</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Development Tips */}
        {!isProduction && (
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Development Tips:</Text>
            <Text style={styles.tipText}>
              • Check the component stack to identify the failing component
            </Text>
            <Text style={styles.tipText}>
              • Look for state mutations or prop type issues
            </Text>
            <Text style={styles.tipText}>
              • Verify async operations are properly handled
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    paddingTop: 60,
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
    marginBottom: 8,
    lineHeight: 24,
    maxWidth: 300,
  },
  boundaryName: {
    fontSize: 14,
    color: "#9ca3af",
    fontStyle: "italic",
    marginBottom: 16,
  },
  eventId: {
    fontSize: 12,
    color: "#9ca3af",
    fontFamily: "monospace",
    marginBottom: 24,
    padding: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 4,
  },
  detailsContainer: {
    width: "100%",
    maxWidth: 400,
    marginBottom: 24,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginTop: 16,
  },
  errorDetails: {
    maxHeight: 150,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
  },
  errorText: {
    fontSize: 12,
    color: "#1f2937",
    fontFamily: "monospace",
    lineHeight: 16,
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
    borderColor: "#d1d5db",
    gap: 8,
  },
  secondaryButtonText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "500",
  },
  errorColor: {
    color: "#ef4444",
  },
  tipsContainer: {
    width: "100%",
    maxWidth: 400,
    marginTop: 32,
    padding: 16,
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400e",
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: "#92400e",
    lineHeight: 18,
    marginBottom: 4,
  },
});
