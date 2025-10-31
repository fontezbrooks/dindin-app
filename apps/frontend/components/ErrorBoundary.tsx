import * as Sentry from "@sentry/react-native";
import type React from "react";
import { Component, type ReactNode } from "react";
import { StyleSheet } from "react-native";
import { ErrorFallback } from "./ErrorFallback";

export type ErrorInfo = {
  componentStack: string;
  errorBoundary?: string;
  errorBoundaryStack?: string;
};

export type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  eventId: string | null;
};

export type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean;
  level?: "page" | "section" | "component";
  name?: string;
};

export type ErrorFallbackProps = {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
  eventId: string | null;
  level: string;
  name?: string;
};

/**
 * Base Error Boundary component with Sentry integration
 * Provides comprehensive error catching, logging, and recovery
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = "component", name } = this.props;

    // Enhanced error context
    const errorContext = {
      level,
      boundary: name || "ErrorBoundary",
      timestamp: new Date().toISOString(),
      userAgent: navigator?.userAgent,
      url: window?.location?.href,
    };

    // Set Sentry context
    Sentry.withScope((scope) => {
      scope.setTag("errorBoundary", errorContext.boundary);
      scope.setTag("errorLevel", level);
      scope.setLevel("error");
      scope.setContext("errorBoundary", errorContext);
      scope.setContext("componentStack", {
        stack: errorInfo.componentStack,
      });

      const eventId = Sentry.captureException(error);

      this.setState({
        errorInfo,
        eventId,
      });
    });

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo);
    }

    // Log to console in development
    if (__DEV__) {
      console.group(`🚨 Error Boundary: ${errorContext.boundary}`);
      console.error("Error:", error);
      console.error("Error Info:", errorInfo);
      console.error("Context:", errorContext);
      console.groupEnd();
    }
  }

  resetError = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    });
  };

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  render() {
    const { hasError, error, errorInfo, eventId } = this.state;
    const {
      children,
      fallback: CustomFallback,
      level = "component",
      name,
    } = this.props;

    if (hasError) {
      const FallbackComponent = CustomFallback || ErrorFallback;

      return (
        <FallbackComponent
          error={error}
          errorInfo={errorInfo}
          eventId={eventId}
          level={level}
          name={name}
          resetError={this.resetError}
        />
      );
    }

    return children;
  }
}

/**
 * Higher-order component for wrapping components with error boundaries
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
}

/**
 * Hook for manually triggering error boundaries (for testing)
 */
export function useErrorHandler() {
  const throwError = (error: Error | string) => {
    const errorToThrow = typeof error === "string" ? new Error(error) : error;
    throw errorToThrow;
  };

  return { throwError };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  text: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
});
