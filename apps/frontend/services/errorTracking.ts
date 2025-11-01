import * as Sentry from "@sentry/react-native";

export type ErrorContext = {
  component?: string;
  action?: string;
  userId?: string;
  route?: string;
  additionalData?: Record<string, unknown>;
};

export class ErrorTracker {
  static setUser(userId: string, email?: string, username?: string) {
    Sentry.setUser({
      id: userId,
      email,
      username,
    });
  }

  static clearUser() {
    Sentry.setUser(null);
  }

  static setContext(key: string, context: Record<string, unknown>) {
    Sentry.setContext(key, context);
  }

  static addBreadcrumb(
    message: string,
    category?: string,
    level?: "info" | "warning" | "error"
  ) {
    Sentry.addBreadcrumb({
      message,
      category: category || "app",
      level: level || "info",
      timestamp: Date.now() / 1000,
    });
  }

  static captureError(error: Error, context?: ErrorContext) {
    return Sentry.withScope((scope) => {
      if (context) {
        if (context.component) {
          scope.setTag("component", context.component);
        }
        if (context.action) {
          scope.setTag("action", context.action);
        }
        if (context.route) {
          scope.setTag("route", context.route);
        }
        if (context.additionalData) {
          scope.setContext("additionalData", context.additionalData);
        }
      }

      return Sentry.captureException(error);
    });
  }

  static captureMessage(
    message: string,
    level?: "info" | "warning" | "error",
    context?: ErrorContext
  ) {
    return Sentry.withScope((scope) => {
      if (context) {
        if (context.component) {
          scope.setTag("component", context.component);
        }
        if (context.action) {
          scope.setTag("action", context.action);
        }
        if (context.route) {
          scope.setTag("route", context.route);
        }
        if (context.additionalData) {
          scope.setContext("additionalData", context.additionalData);
        }
      }

      scope.setLevel(level || "info");
      return Sentry.captureMessage(message);
    });
  }

  static startTransaction(name: string, op?: string) {
    return Sentry.startTransaction({
      name,
      op: op || "navigation",
    });
  }

  static setTag(key: string, value: string) {
    Sentry.setTag(key, value);
  }

  static configureScope(callback: (scope: Sentry.Scope) => void) {
    Sentry.configureScope(callback);
  }
}

// Performance monitoring utilities
export class PerformanceTracker {
  static startNavigation(routeName: string) {
    return Sentry.startTransaction({
      name: `Navigation to ${routeName}`,
      op: "navigation",
    });
  }

  static startApiCall(endpoint: string, method: string = "GET") {
    return Sentry.startTransaction({
      name: `${method} ${endpoint}`,
      op: "http.client",
    });
  }

  static measureRender(componentName: string, callback: () => void) {
    const transaction = Sentry.startTransaction({
      name: `Render ${componentName}`,
      op: "ui.render",
    });

    try {
      callback();
    } finally {
      transaction.finish();
    }
  }
}

// Network error utilities
export class NetworkErrorHandler {
  static isNetworkError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }
    const err = error as { name?: string; message?: string; code?: string };
    return (
      err.name === "NetworkError" ||
      err.message?.toLowerCase().includes("network") ||
      err.message?.toLowerCase().includes("fetch") ||
      err.message?.toLowerCase().includes("timeout") ||
      err.code === "NETWORK_ERROR"
    );
  }

  static isAuthError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }
    const err = error as { status?: number; message?: string };
    return (
      err.status === 401 ||
      err.status === 403 ||
      err.message?.toLowerCase().includes("unauthorized") ||
      err.message?.toLowerCase().includes("forbidden") ||
      err.message?.toLowerCase().includes("auth")
    );
  }

  static getErrorMessage(error: unknown): string {
    if (this.isNetworkError(error)) {
      return "Network connection problem. Please check your internet connection.";
    }

    if (this.isAuthError(error)) {
      const err = error as { status?: number; message?: string };
      if (err.status === 401) {
        return "Your session has expired. Please sign in again.";
      }
      if (err.status === 403) {
        return "You do not have permission to perform this action.";
      }
      return "Authentication problem. Please try signing in again.";
    }

    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "object" && error !== null && "message" in error) {
      return String((error as { message: unknown }).message);
    }
    return "An unexpected error occurred.";
  }
}

// Development utilities
export class DevErrorUtils {
  static logErrorBoundaryInfo(
    error: Error,
    errorInfo: { componentStack: string; digest?: string },
    boundaryName: string
  ) {
    if (!__DEV__) return;

    console.group(`🚨 Error Boundary: ${boundaryName}`);
    console.error("Error:", error);
    console.error("Component Stack:", errorInfo.componentStack);
    console.error("Error Stack:", error.stack);
    console.groupEnd();
  }

  static createTestError(
    type: "network" | "auth" | "runtime" | "component" = "runtime"
  ): Error {
    switch (type) {
      case "network":
        const networkError = new Error("Network request failed") as Error & { name: string };
        networkError.name = "NetworkError";
        return networkError;

      case "auth":
        const authError = new Error("Unauthorized access") as Error & { status: number };
        authError.status = 401;
        return authError;

      case "component":
        return new TypeError("Cannot read property 'data' of undefined");

      case "runtime":
      default:
        return new Error("Test runtime error for development");
    }
  }
}

export default ErrorTracker;
