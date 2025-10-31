import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useErrorHandler } from "./ErrorBoundary";

type ErrorTestCase = {
  name: string;
  description: string;
  error: () => Error;
  icon: string;
  category: "network" | "auth" | "route" | "component" | "runtime";
};

const errorTestCases: ErrorTestCase[] = [
  // Network Errors
  {
    name: "Network Timeout",
    description: "Simulate a network timeout error",
    error: () => {
      const error = new Error("Network request timed out");
      error.name = "NetworkError";
      return error;
    },
    icon: "cloud-offline",
    category: "network",
  },
  {
    name: "Fetch Failed",
    description: "Simulate a failed fetch request",
    error: () => new Error("Failed to fetch data from server"),
    icon: "server",
    category: "network",
  },

  // Auth Errors
  {
    name: "Unauthorized",
    description: "Simulate 401 unauthorized error",
    error: () => {
      const error = new Error("Unauthorized access");
      (error as any).status = 401;
      return error;
    },
    icon: "lock-closed",
    category: "auth",
  },
  {
    name: "Forbidden",
    description: "Simulate 403 forbidden error",
    error: () => {
      const error = new Error("Access forbidden");
      (error as any).status = 403;
      return error;
    },
    icon: "shield-off",
    category: "auth",
  },
  {
    name: "Invalid Token",
    description: "Simulate invalid authentication token",
    error: () => new Error("Invalid authentication token provided"),
    icon: "key",
    category: "auth",
  },

  // Route Errors
  {
    name: "Route Not Found",
    description: "Simulate navigation to non-existent route",
    error: () => {
      const error = new Error("Route not found: /invalid-route");
      error.name = "RouteError";
      return error;
    },
    icon: "map",
    category: "route",
  },
  {
    name: "Navigation Error",
    description: "Simulate navigation failure",
    error: () => {
      const error = new Error("Failed to navigate to requested screen");
      error.name = "NavigationError";
      return error;
    },
    icon: "navigate",
    category: "route",
  },

  // Component Errors
  {
    name: "Null Reference",
    description: "Simulate null/undefined reference error",
    error: () => new TypeError("Cannot read property 'data' of null"),
    icon: "warning",
    category: "component",
  },
  {
    name: "State Mutation",
    description: "Simulate state mutation error",
    error: () => new Error("Cannot update state: component already unmounted"),
    icon: "refresh",
    category: "component",
  },

  // Runtime Errors
  {
    name: "Out of Memory",
    description: "Simulate memory allocation error",
    error: () => new RangeError("Maximum call stack size exceeded"),
    icon: "hardware-chip",
    category: "runtime",
  },
  {
    name: "JSON Parse Error",
    description: "Simulate JSON parsing failure",
    error: () => new SyntaxError("Unexpected token in JSON at position 42"),
    icon: "code",
    category: "runtime",
  },
];

const categoryColors = {
  network: "#ef4444",
  auth: "#f59e0b",
  route: "#8b5cf6",
  component: "#3b82f6",
  runtime: "#10b981",
};

const categoryIcons = {
  network: "cloud-offline",
  auth: "lock-closed",
  route: "map",
  component: "construct",
  runtime: "hardware-chip",
};

type ErrorTestHarnessProps = {
  visible?: boolean;
  onClose?: () => void;
};

export const ErrorTestHarness: React.FC<ErrorTestHarnessProps> = ({
  visible = false,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { throwError } = useErrorHandler();

  if (!(__DEV__ && visible)) {
    return null;
  }

  const categories = Array.from(
    new Set(errorTestCases.map((test) => test.category))
  );
  const filteredTests = selectedCategory
    ? errorTestCases.filter((test) => test.category === selectedCategory)
    : errorTestCases;

  const handleTestError = (testCase: ErrorTestCase) => {
    Alert.alert(
      "Trigger Error Test",
      `This will trigger: ${testCase.name}\n\n${testCase.description}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Trigger Error",
          style: "destructive",
          onPress: () => {
            try {
              throwError(testCase.error());
            } catch (error) {
              // Error will be caught by the nearest error boundary
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Error Test Harness</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons color="#6b7280" name="close" size={24} />
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>
          Test error boundaries by triggering different error scenarios
        </Text>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryContainer}
        >
          <TouchableOpacity
            onPress={() => setSelectedCategory(null)}
            style={[
              styles.categoryChip,
              !selectedCategory && styles.categoryChipActive,
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                !selectedCategory && styles.categoryTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              onPress={() => setSelectedCategory(category)}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipActive,
                selectedCategory === category && {
                  backgroundColor:
                    categoryColors[category as keyof typeof categoryColors],
                },
              ]}
            >
              <Ionicons
                color={
                  selectedCategory === category
                    ? "#fff"
                    : categoryColors[category as keyof typeof categoryColors]
                }
                name={
                  categoryIcons[category as keyof typeof categoryIcons] as any
                }
                size={16}
                style={styles.categoryIcon}
              />
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.categoryTextActive,
                ]}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Test Cases */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.testContainer}
        >
          {filteredTests.map((testCase, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleTestError(testCase)}
              style={styles.testCase}
            >
              <View style={styles.testHeader}>
                <View
                  style={[
                    styles.testIcon,
                    {
                      backgroundColor: `${categoryColors[testCase.category]}20`,
                    },
                  ]}
                >
                  <Ionicons
                    color={categoryColors[testCase.category]}
                    name={testCase.icon as any}
                    size={20}
                  />
                </View>
                <View style={styles.testInfo}>
                  <Text style={styles.testName}>{testCase.name}</Text>
                  <Text style={styles.testDescription}>
                    {testCase.description}
                  </Text>
                </View>
                <Ionicons color="#d1d5db" name="chevron-forward" size={20} />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ⚠️ This tool is only available in development mode
          </Text>
        </View>
      </View>
    </View>
  );
};

// Hook for showing the test harness
export const useErrorTestHarness = () => {
  const [visible, setVisible] = useState(false);

  const showTestHarness = () => setVisible(true);
  const hideTestHarness = () => setVisible(false);

  return {
    visible,
    showTestHarness,
    hideTestHarness,
    TestHarness: () => (
      <ErrorTestHarness onClose={hideTestHarness} visible={visible} />
    ),
  };
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    margin: 20,
    maxHeight: "80%",
    width: "90%",
    maxWidth: 400,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  categoryContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  categoryChipActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  categoryIcon: {
    marginRight: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6b7280",
  },
  categoryTextActive: {
    color: "#fff",
  },
  testContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  testCase: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  testHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  testIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  testInfo: {
    flex: 1,
  },
  testName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  testDescription: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  footerText: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
  },
});
