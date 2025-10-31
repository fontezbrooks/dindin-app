# Error Boundary System

A comprehensive React Error Boundary implementation with Sentry integration for the dindin-app frontend.

## Features

- **Base ErrorBoundary**: Comprehensive error catching with Sentry integration
- **Specialized Boundaries**: NetworkErrorBoundary, AuthErrorBoundary, RouteErrorBoundary
- **User-friendly Fallbacks**: Custom UI components with retry mechanisms
- **Development Tools**: Error test harness for testing error scenarios
- **Production Ready**: Sentry integration for error tracking and monitoring

## Quick Start

### 1. Basic Usage

```tsx
import { ErrorBoundary } from '@/components/error-boundaries';

function MyComponent() {
  return (
    <ErrorBoundary level="component" name="MyComponent">
      <SomeComponentThatMightFail />
    </ErrorBoundary>
  );
}
```

### 2. Network Operations

```tsx
import { NetworkErrorBoundary } from '@/components/error-boundaries';

function APIDataComponent() {
  const retryApiCall = () => {
    // Your retry logic here
  };

  return (
    <NetworkErrorBoundary onRetry={retryApiCall}>
      <DataLoadingComponent />
    </NetworkErrorBoundary>
  );
}
```

### 3. Authentication Flow

```tsx
import { AuthErrorBoundary } from '@/components/error-boundaries';

function ProtectedComponent() {
  return (
    <AuthErrorBoundary
      onAuthError={(error) => {
        // Additional auth error handling
        console.log('Auth error:', error);
      }}
    >
      <UserDashboard />
    </AuthErrorBoundary>
  );
}
```

### 4. Route/Page Level

```tsx
import { RouteErrorBoundary } from '@/components/error-boundaries';

function MyScreen() {
  return (
    <RouteErrorBoundary routeName="Profile">
      <ProfileContent />
    </RouteErrorBoundary>
  );
}
```

## Error Boundary Levels

### Page Level
- Wraps entire screens/routes
- Shows navigation options (home, back, retry)
- Used in `_layout.tsx` and screen components

### Section Level
- Wraps major UI sections (forms, lists, cards)
- Provides contextual recovery options
- Allows other parts of the page to continue working

### Component Level
- Wraps individual components
- Provides minimal disruption to UI
- Good for third-party components or complex widgets

## HOC Pattern

```tsx
import { withErrorBoundary } from '@/components/error-boundaries';

const MyComponent = () => {
  // Component that might throw errors
  return <div>Content</div>;
};

export default withErrorBoundary(MyComponent, {
  level: 'component',
  name: 'MyComponent',
});
```

## Development Testing

### Error Test Harness

```tsx
import { useErrorTestHarness } from '@/components/error-boundaries';

function DevComponent() {
  const { showTestHarness, TestHarness } = useErrorTestHarness();

  return (
    <>
      <Button onPress={showTestHarness} title="Test Errors" />
      <TestHarness />
    </>
  );
}
```

### Manual Error Testing

```tsx
import { useErrorHandler } from '@/components/error-boundaries';

function TestComponent() {
  const { throwError } = useErrorHandler();

  const testNetworkError = () => {
    const error = new Error('Network timeout');
    error.name = 'NetworkError';
    throwError(error);
  };

  return <Button onPress={testNetworkError} title="Test Network Error" />;
}
```

## Custom Fallback Components

```tsx
import { ErrorFallbackProps } from '@/components/error-boundaries';

const CustomFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  eventId,
}) => {
  return (
    <View>
      <Text>Custom error message</Text>
      <Button onPress={resetError} title="Try Again" />
    </View>
  );
};

// Use with any error boundary
<ErrorBoundary fallback={CustomFallback}>
  <MyComponent />
</ErrorBoundary>
```

## Environment Configuration

### Sentry Setup

Add to your `.env` file:

```env
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
```

The error boundaries will automatically:
- Send errors to Sentry in production
- Log detailed errors to console in development
- Include user context and error breadcrumbs

### Development vs Production

**Development:**
- Detailed error information displayed
- Component stack traces
- Error test harness available
- Console logging enabled

**Production:**
- User-friendly error messages
- Sentry error tracking
- Event IDs for support
- No sensitive information exposed

## Error Types Handled

### Network Errors
- API timeouts
- Failed fetch requests
- Connection issues
- Server errors

### Authentication Errors
- Expired tokens (401)
- Insufficient permissions (403)
- Invalid credentials
- Session management issues

### Route/Navigation Errors
- Invalid routes
- Navigation failures
- Screen loading errors
- Deep link issues

### Component Errors
- Null/undefined references
- State management issues
- Prop validation failures
- Render errors

### Runtime Errors
- Memory issues
- JSON parsing errors
- Type errors
- Logic errors

## Best Practices

### 1. Use Appropriate Levels
- **Page**: For screens and major route components
- **Section**: For major UI sections that can fail independently
- **Component**: For specific components that might throw errors

### 2. Provide Context
```tsx
<ErrorBoundary
  name="UserProfile"
  level="section"
  onError={(error, errorInfo) => {
    // Custom error handling logic
  }}
>
  <UserProfileForm />
</ErrorBoundary>
```

### 3. Implement Retry Logic
```tsx
<NetworkErrorBoundary
  onRetry={() => refetchData()}
  showOfflineIndicator={true}
>
  <DataComponent />
</NetworkErrorBoundary>
```

### 4. Use Custom Fallbacks for Important Flows
```tsx
const CheckoutErrorFallback = ({ error, resetError }) => (
  <CheckoutErrorRecovery
    error={error}
    onRetry={resetError}
    onContactSupport={() => openSupportChat()}
  />
);

<ErrorBoundary fallback={CheckoutErrorFallback}>
  <CheckoutFlow />
</ErrorBoundary>
```

### 5. Monitor and Alert
Set up Sentry alerts for critical error boundaries:
- Authentication failures
- Payment processing errors
- Data corruption issues

## Integration with Existing Code

### Wrapping Expo Router Screens
```tsx
// app/profile/index.tsx
import { RouteErrorBoundary } from '@/components/error-boundaries';

export default function ProfileScreen() {
  return (
    <RouteErrorBoundary routeName="Profile">
      <ProfileContent />
    </RouteErrorBoundary>
  );
}
```

### Wrapping API Calls
```tsx
// components/DataFetcher.tsx
import { NetworkErrorBoundary } from '@/components/error-boundaries';

export function DataFetcher({ children }) {
  return (
    <NetworkErrorBoundary onRetry={() => queryClient.refetchQueries()}>
      {children}
    </NetworkErrorBoundary>
  );
}
```

### Form Error Boundaries
```tsx
// components/ContactForm.tsx
import { ErrorBoundary } from '@/components/error-boundaries';

export function ContactForm() {
  return (
    <ErrorBoundary
      level="section"
      name="ContactForm"
      onError={(error) => {
        // Log form-specific errors
        analytics.track('form_error', { form: 'contact', error: error.message });
      }}
    >
      <FormFields />
    </ErrorBoundary>
  );
}
```

## Error Recovery Strategies

### Automatic Recovery
- **Retry with backoff**: For network errors
- **State reset**: For component state issues
- **Route refresh**: For navigation errors

### User-Initiated Recovery
- **Manual retry buttons**: User can trigger retry
- **Alternative actions**: Navigate home, contact support
- **Graceful degradation**: Show cached data or simplified UI

### Contextual Recovery
- **Form preservation**: Preserve user input during errors
- **Session management**: Handle auth errors appropriately
- **Data consistency**: Ensure data integrity during recovery

This error boundary system provides comprehensive error handling while maintaining a great user experience in both development and production environments.