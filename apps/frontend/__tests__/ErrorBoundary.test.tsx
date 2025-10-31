import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorBoundary, NetworkErrorBoundary, AuthErrorBoundary } from '../components/error-boundaries';

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  withScope: jest.fn((callback) => callback({
    setTag: jest.fn(),
    setLevel: jest.fn(),
    setContext: jest.fn(),
  })),
  captureException: jest.fn(() => 'mock-event-id'),
}));

// Mock Clerk
jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => ({
    signOut: jest.fn(),
    getToken: jest.fn(),
  }),
}));

// Mock Expo Router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
}));

// Test component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean; errorType?: string }> = ({
  shouldThrow = true,
  errorType = 'generic'
}) => {
  if (shouldThrow) {
    if (errorType === 'network') {
      const error = new Error('Network request failed');
      error.name = 'NetworkError';
      throw error;
    }
    if (errorType === 'auth') {
      const error = new Error('Unauthorized');
      (error as any).status = 401;
      throw error;
    }
    throw new Error('Test error');
  }
  return <div testID="success">Success</div>;
};

describe('ErrorBoundary', () => {
  it('should render children when no error occurs', () => {
    const { getByTestId } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(getByTestId('success')).toBeTruthy();
  });

  it('should render error fallback when error occurs', () => {
    const { getByText } = render(
      <ErrorBoundary name="TestBoundary">
        <ThrowError />
      </ErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('in TestBoundary')).toBeTruthy();
  });

  it('should call onError callback when error occurs', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('should reset error when resetError is called', () => {
    const { getByText, getByTestId, rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Error should be shown
    expect(getByText('Something went wrong')).toBeTruthy();

    // Click try again button
    const tryAgainButton = getByText('Try Again');
    fireEvent.press(tryAgainButton);

    // Re-render with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(getByTestId('success')).toBeTruthy();
  });
});

describe('NetworkErrorBoundary', () => {
  it('should handle network errors specifically', () => {
    const { getByText } = render(
      <NetworkErrorBoundary>
        <ThrowError errorType="network" />
      </NetworkErrorBoundary>
    );

    expect(getByText('Connection Problem')).toBeTruthy();
    expect(getByText(/trouble connecting to our servers/)).toBeTruthy();
  });

  it('should call retry callback when retry button is pressed', () => {
    const onRetry = jest.fn();

    const { getByText } = render(
      <NetworkErrorBoundary onRetry={onRetry}>
        <ThrowError errorType="network" />
      </NetworkErrorBoundary>
    );

    const retryButton = getByText('Try Again');
    fireEvent.press(retryButton);

    expect(onRetry).toHaveBeenCalled();
  });

  it('should fall back to generic error for non-network errors', () => {
    const { getByText } = render(
      <NetworkErrorBoundary>
        <ThrowError errorType="generic" />
      </NetworkErrorBoundary>
    );

    // Should show generic error fallback since it's not a network error
    expect(getByText('Something went wrong')).toBeTruthy();
  });
});

describe('AuthErrorBoundary', () => {
  it('should handle auth errors specifically', () => {
    const { getByText } = render(
      <AuthErrorBoundary>
        <ThrowError errorType="auth" />
      </AuthErrorBoundary>
    );

    expect(getByText('Authentication Required')).toBeTruthy();
    expect(getByText(/session has expired/)).toBeTruthy();
  });

  it('should call onAuthError callback', () => {
    const onAuthError = jest.fn();

    render(
      <AuthErrorBoundary onAuthError={onAuthError}>
        <ThrowError errorType="auth" />
      </AuthErrorBoundary>
    );

    expect(onAuthError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should fall back to generic error for non-auth errors', () => {
    const { getByText } = render(
      <AuthErrorBoundary>
        <ThrowError errorType="generic" />
      </AuthErrorBoundary>
    );

    // Should show generic error fallback since it's not an auth error
    expect(getByText('Something went wrong')).toBeTruthy();
  });
});

describe('Error Context and Levels', () => {
  it('should set appropriate context for different levels', () => {
    const mockCaptureException = require('@sentry/react-native').captureException;

    render(
      <ErrorBoundary level="page" name="TestPage">
        <ThrowError />
      </ErrorBoundary>
    );

    expect(mockCaptureException).toHaveBeenCalled();
  });

  it('should display different messages for different levels', () => {
    const { getByText: getByTextPage } = render(
      <ErrorBoundary level="page" name="TestPage">
        <ThrowError />
      </ErrorBoundary>
    );

    expect(getByTextPage('Something went wrong')).toBeTruthy();

    const { getByText: getByTextComponent } = render(
      <ErrorBoundary level="component" name="TestComponent">
        <ThrowError />
      </ErrorBoundary>
    );

    expect(getByTextComponent('Something went wrong')).toBeTruthy();
  });
});

describe('Development vs Production behavior', () => {
  const originalDev = __DEV__;

  afterEach(() => {
    (global as any).__DEV__ = originalDev;
  });

  it('should show detailed error in development', () => {
    (global as any).__DEV__ = true;

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // In development, should show actual error message
    expect(getByText(/Test error/)).toBeTruthy();
  });

  it('should show generic message in production', () => {
    (global as any).__DEV__ = false;

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // In production, should show generic message
    expect(getByText(/We encountered an unexpected error/)).toBeTruthy();
  });
});