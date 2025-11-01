import winston from "winston";

// Log levels
export const LogLevel = {
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

// Logger configuration interface
type LoggerConfig = {
  level: LogLevel;
  environment: "development" | "production" | "test";
  serviceName: string;
  enableConsole: boolean;
  enableFile: boolean;
  logDir?: string;
};

// Request context interface
export interface RequestContext {
  requestId?: string;
  userId?: string;
  method?: string;
  url?: string;
  userAgent?: string;
  ip?: string;
}

// Logger class
export class Logger {
  private winston: winston.Logger;
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
      environment:
        (process.env.NODE_ENV as "development" | "production" | "test") ||
        "development",
      serviceName: process.env.SERVICE_NAME || "dindin-backend",
      enableConsole: true,
      enableFile: process.env.NODE_ENV === "production",
      logDir: process.env.LOG_DIR || "./logs",
      ...config,
    };

    this.winston = this.createWinstonLogger();
  }

  private createWinstonLogger(): winston.Logger {
    const transports: winston.transport[] = [];

    // Console transport with pretty printing for development
    if (this.config.enableConsole) {
      transports.push(
        new winston.transports.Console({
          format:
            this.config.environment === "development"
              ? winston.format.combine(
                  winston.format.colorize(),
                  winston.format.timestamp({ format: "HH:mm:ss" }),
                  winston.format.printf(
                    ({
                      timestamp,
                      level,
                      message,
                      service,
                      requestId,
                      userId,
                      ...meta
                    }) => {
                      let logLine = `${timestamp} [${level}] ${service}: ${message}`;

                      if (requestId) logLine += ` [req:${requestId}]`;
                      if (userId) logLine += ` [user:${userId}]`;

                      if (Object.keys(meta).length > 0) {
                        logLine += ` ${JSON.stringify(meta, null, 2)}`;
                      }

                      return logLine;
                    }
                  )
                )
              : winston.format.combine(
                  winston.format.timestamp(),
                  winston.format.json()
                ),
        })
      );
    }

    // File transports for production
    if (this.config.enableFile) {
      // Error log file
      transports.push(
        new winston.transports.File({
          filename: `${this.config.logDir}/error.log`,
          level: LogLevel.ERROR,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
          maxsize: 5_242_880, // 5MB
          maxFiles: 5,
        })
      );

      // Combined log file
      transports.push(
        new winston.transports.File({
          filename: `${this.config.logDir}/combined.log`,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
          maxsize: 5_242_880, // 5MB
          maxFiles: 5,
        })
      );
    }

    return winston.createLogger({
      level: this.config.level,
      defaultMeta: {
        service: this.config.serviceName,
        environment: this.config.environment,
      },
      transports,
      // Handle exceptions and rejections
      exceptionHandlers: this.config.enableFile
        ? [
            new winston.transports.File({
              filename: `${this.config.logDir}/exceptions.log`,
              maxsize: 5_242_880,
              maxFiles: 3,
            }),
          ]
        : [],
      rejectionHandlers: this.config.enableFile
        ? [
            new winston.transports.File({
              filename: `${this.config.logDir}/rejections.log`,
              maxsize: 5_242_880,
              maxFiles: 3,
            }),
          ]
        : [],
    });
  }

  private formatMessage(
    message: string,
    context?: RequestContext,
    meta?: Record<string, unknown>
  ): object {
    return {
      message,
      ...(context && {
        requestId: context.requestId,
        userId: context.userId,
        method: context.method,
        url: context.url,
        userAgent: context.userAgent,
        ip: context.ip,
      }),
      ...(meta && { meta }),
    };
  }

  debug(
    message: string,
    context?: RequestContext,
    meta?: Record<string, unknown>
  ): void {
    this.winston.debug(this.formatMessage(message, context, meta));
  }

  info(
    message: string,
    context?: RequestContext,
    meta?: Record<string, unknown>
  ): void {
    this.winston.info(this.formatMessage(message, context, meta));
  }

  warn(
    message: string,
    context?: RequestContext,
    meta?: Record<string, unknown>
  ): void {
    this.winston.warn(this.formatMessage(message, context, meta));
  }

  error(
    message: string,
    error?: Error,
    context?: RequestContext,
    meta?: Record<string, unknown>
  ): void {
    const errorMeta = error
      ? {
          errorName: error.name,
          errorMessage: error.message,
          errorStack:
            this.config.environment === "development" ? error.stack : undefined,
          ...meta,
        }
      : meta;

    this.winston.error(this.formatMessage(message, context, errorMeta));
  }

  // Convenience methods for common scenarios
  requestStart(context: RequestContext): void {
    this.info("Request started", context);
  }

  requestEnd(
    context: RequestContext,
    duration: number,
    statusCode?: number
  ): void {
    this.info("Request completed", context, { duration, statusCode });
  }

  dbQuery(query: string, duration: number, context?: RequestContext): void {
    this.debug("Database query executed", context, { query, duration });
  }

  cacheHit(key: string, context?: RequestContext): void {
    this.debug("Cache hit", context, { cacheKey: key });
  }

  cacheMiss(key: string, context?: RequestContext): void {
    this.debug("Cache miss", context, { cacheKey: key });
  }

  authAttempt(
    success: boolean,
    context?: RequestContext,
    reason?: string
  ): void {
    if (success) {
      this.info("Authentication successful", context);
    } else {
      this.warn("Authentication failed", context, { reason });
    }
  }

  rateLimitHit(context?: RequestContext, limit?: number): void {
    this.warn("Rate limit exceeded", context, { limit });
  }

  websocketConnection(
    event: "connect" | "disconnect",
    context?: RequestContext
  ): void {
    this.info(`WebSocket ${event}`, context);
  }

  businessEvent(
    event: string,
    context?: RequestContext,
    data?: Record<string, unknown>
  ): void {
    this.info(`Business event: ${event}`, context, data);
  }
}

// Default logger instance
export const logger = new Logger();

// Factory function for creating logger with specific configuration
export function createLogger(config: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}

// Utility function to generate request ID
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}
