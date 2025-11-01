# DinDin Structured Logging System

A comprehensive logging package for the DinDin backend application using Winston for structured JSON logging with environment-specific configurations.

## Features

- **Structured JSON Logging**: Consistent log format for production monitoring
- **Environment-aware Configuration**: Different settings for development, production, and test
- **Request Tracking**: Automatic request ID generation and correlation
- **User Context**: Attach user information to logs for better debugging
- **File Rotation**: Automatic log file rotation in production
- **Error Handling**: Proper error logging with stack traces in development
- **Performance Monitoring**: Built-in methods for tracking slow requests and operations

## Quick Start

```typescript
import { logger } from '@dindin/logger';

// Basic logging
logger.info('Server started');
logger.error('Database connection failed', error);

// With request context
const requestContext = {
  requestId: 'req_123',
  userId: 'user_456',
  method: 'POST',
  url: '/api/users'
};

logger.info('User created successfully', requestContext);
```

## Middleware Integration

```typescript
import { loggingMiddleware, enhancedLoggingMiddleware } from '@dindin/logger/middleware';

// Basic request logging
app.use('*', loggingMiddleware());

// Enhanced logging with user context (use after auth middleware)
app.use('/api/*', authMiddleware);
app.use('/api/*', enhancedLoggingMiddleware());
```

## Log Levels

- `debug`: Detailed information for diagnosing problems
- `info`: General information about application flow
- `warn`: Warning messages for potentially harmful situations
- `error`: Error events that might still allow the application to continue

## Environment Configuration

Configure logging through environment variables:

```bash
# Log level (debug, info, warn, error)
LOG_LEVEL=info

# Service name for log identification
SERVICE_NAME=dindin-backend

# Log directory for file output (production only)
LOG_DIR=./logs
```

## Log Output

### Development
Pretty-printed console output with colors and timestamps:
```
14:32:15 [info] dindin-backend: User created successfully [req:req_123] [user:user_456]
```

### Production
Structured JSON format for log aggregation:
```json
{
  "timestamp": "2024-11-01T14:32:15.123Z",
  "level": "info",
  "message": "User created successfully",
  "service": "dindin-backend",
  "environment": "production",
  "requestId": "req_123",
  "userId": "user_456",
  "method": "POST",
  "url": "/api/users"
}
```

## Built-in Methods

- `logger.requestStart(context)` - Log request initiation
- `logger.requestEnd(context, duration, statusCode)` - Log request completion
- `logger.authAttempt(success, context, reason)` - Log authentication attempts
- `logger.rateLimitHit(context, limit)` - Log rate limit violations
- `logger.websocketConnection(event, context)` - Log WebSocket events
- `logger.businessEvent(event, context, data)` - Log business-specific events
- `logger.cacheHit/cacheMiss(key, context)` - Log cache operations

## File Structure

Production environments automatically create log files:
- `logs/combined.log` - All log messages
- `logs/error.log` - Error messages only
- `logs/exceptions.log` - Unhandled exceptions
- `logs/rejections.log` - Unhandled promise rejections

## Performance

- Minimal overhead in production
- Async file writing
- Automatic log rotation (5MB max per file)
- JSON format optimized for log aggregation tools