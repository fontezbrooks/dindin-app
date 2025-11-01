import type { Context, Next } from "hono";
import { generateRequestId, logger, type RequestContext } from "./index";

// Constants
const DEFAULT_STATUS_CODE = 500;

/**
 * Logging middleware for Hono that adds request ID tracking and logs requests
 */
export function loggingMiddleware() {
  return async (c: Context, next: Next) => {
    const start = Date.now();

    // Generate request ID
    const requestId = generateRequestId();

    // Set request ID in context for use in other middleware/routes
    c.set("requestId", requestId);

    // Create request context
    const requestContext: RequestContext = {
      requestId,
      method: c.req.method,
      url: c.req.url,
      userAgent: c.req.header("User-Agent"),
      ip:
        c.req.header("x-forwarded-for") ||
        c.req.header("x-real-ip") ||
        "unknown",
    };

    // Log request start
    logger.requestStart(requestContext);

    try {
      await next();

      // Log successful request completion
      const duration = Date.now() - start;
      logger.requestEnd(requestContext, duration, c.res.status);
    } catch (error) {
      // Log error and re-throw
      const duration = Date.now() - start;

      if (error instanceof Error) {
        logger.error("Request failed", error, requestContext, {
          duration,
          statusCode: c.res.status || DEFAULT_STATUS_CODE,
        });
      } else {
        logger.error(
          "Request failed with unknown error",
          undefined,
          requestContext,
          {
            duration,
            error: String(error),
            statusCode: c.res.status || DEFAULT_STATUS_CODE,
          }
        );
      }

      throw error;
    }
  };
}

/**
 * Enhanced logging middleware that adds user context from auth middleware
 */
export function enhancedLoggingMiddleware() {
  return async (c: Context, next: Next) => {
    const start = Date.now();

    // Generate request ID if not already set
    let requestId = c.get("requestId");
    if (!requestId) {
      requestId = generateRequestId();
      c.set("requestId", requestId);
    }

    // Create request context with user info if available
    const user = c.get("user");
    const userId = c.get("userId");

    const requestContext: RequestContext = {
      requestId,
      userId: userId || user?.clerkUserId,
      method: c.req.method,
      url: c.req.url,
      userAgent: c.req.header("User-Agent"),
      ip:
        c.req.header("x-forwarded-for") ||
        c.req.header("x-real-ip") ||
        "unknown",
    };

    // Update context in Hono for use in routes
    c.set("requestContext", requestContext);

    try {
      await next();

      // Log successful request completion
      const duration = Date.now() - start;
      logger.requestEnd(requestContext, duration, c.res.status);
    } catch (error) {
      // Log error and re-throw
      const duration = Date.now() - start;

      if (error instanceof Error) {
        logger.error("Request failed", error, requestContext, {
          duration,
          statusCode: c.res.status || DEFAULT_STATUS_CODE,
        });
      } else {
        logger.error(
          "Request failed with unknown error",
          undefined,
          requestContext,
          {
            duration,
            error: String(error),
            statusCode: c.res.status || DEFAULT_STATUS_CODE,
          }
        );
      }

      throw error;
    }
  };
}

/**
 * Helper function to get request context from Hono context
 */
export function getRequestContext(c: Context): RequestContext | undefined {
  return c.get("requestContext");
}
