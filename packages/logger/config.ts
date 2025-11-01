import type { LogLevel } from "./index";

/**
 * Logger configuration for different environments
 */
export interface LoggerEnvironmentConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  logDir: string;
  maxFileSize: number;
  maxFiles: number;
  enableExceptionHandling: boolean;
  enableRejectionHandling: boolean;
}

/**
 * Environment-specific configurations
 */
export const LOGGER_CONFIGS: Record<string, LoggerEnvironmentConfig> = {
  development: {
    level: "debug" as LogLevel,
    enableConsole: true,
    enableFile: false,
    logDir: "./logs",
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 5,
    enableExceptionHandling: false, // Don't exit on errors in dev
    enableRejectionHandling: false,
  },

  production: {
    level: "info" as LogLevel,
    enableConsole: true,
    enableFile: true,
    logDir: "./logs",
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
    enableExceptionHandling: true,
    enableRejectionHandling: true,
  },

  test: {
    level: "error" as LogLevel,
    enableConsole: false,
    enableFile: false,
    logDir: "./logs",
    maxFileSize: 5 * 1024 * 1024,
    maxFiles: 3,
    enableExceptionHandling: false,
    enableRejectionHandling: false,
  },
};

/**
 * Get configuration for current environment
 */
export function getLoggerConfig(): LoggerEnvironmentConfig {
  const env = process.env.NODE_ENV || "development";
  return LOGGER_CONFIGS[env] || LOGGER_CONFIGS.development;
}

/**
 * Log rotation settings
 */
export const LOG_ROTATION = {
  maxSize: "10m",
  maxFiles: "7d",
  auditFile: "logs/audit.json",
  datePattern: "YYYY-MM-DD",
} as const;

/**
 * Performance monitoring thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  slowRequest: 1000, // ms
  verySlowRequest: 5000, // ms
  slowDbQuery: 500, // ms
  verySlowDbQuery: 2000, // ms
} as const;
