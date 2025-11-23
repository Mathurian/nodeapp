/**
 * Error Tracking and Monitoring Utility
 * Centralized error logging, tracking, and reporting
 */

import fs from 'fs/promises';
import { env } from '../config/env';
import path from 'path';
import { createLogger } from './logger';

const logger = createLogger('ErrorTracking');

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error tracking entry
 */
export interface ErrorEntry {
  id: string;
  timestamp: string;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  context?: {
    user?: string;
    requestId?: string;
    method?: string;
    path?: string;
    ip?: string;
    userAgent?: string;
    [key: string]: unknown;
  };
  error?: unknown;
}

/**
 * Error statistics
 */
export interface ErrorStats {
  total: number;
  bySeverity: Record<ErrorSeverity, number>;
  recent: ErrorEntry[];
  topErrors: Array<{ message: string; count: number }>;
}

class ErrorTracker {
  private errors: ErrorEntry[] = [];
  private readonly maxErrors = 1000; // Keep last 1000 errors in memory
  private readonly errorLogPath: string;

  constructor() {
    // Use temp directory in test environment to avoid permission issues
    const logDir = env.isTest()
      ? path.join(process.env['LOG_DIRECTORY'] || require('os').tmpdir(), 'event-manager-test-logs')
      : path.join(process.cwd(), 'logs');
    this.errorLogPath = path.join(logDir, 'errors.json');
    this.ensureLogDirectory();
    this.loadErrorsFromDisk();
  }

  /**
   * Ensure log directory exists
   */
  private async ensureLogDirectory() {
    const logDir = path.dirname(this.errorLogPath);
    try {
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      // Silently fail in test environment
      if (!env.isTest()) {
        logger.error('Failed to create log directory', { error });
      }
    }
  }

  /**
   * Load errors from disk on startup
   */
  private async loadErrorsFromDisk() {
    try {
      const data = await fs.readFile(this.errorLogPath, 'utf-8');
      const loaded = JSON.parse(data);
      if (Array.isArray(loaded)) {
        this.errors = loaded.slice(-this.maxErrors);
      }
    } catch (error) {
      // File doesn't exist yet or is invalid - start fresh
      this.errors = [];
    }
  }

  /**
   * Save errors to disk
   */
  private async saveErrorsToDisk() {
    // Skip file writing in test environment to avoid permission issues
    if (env.isTest() || process.env['DISABLE_FILE_LOGGING'] === 'true') {
      return;
    }
    
    try {
      await fs.writeFile(
        this.errorLogPath,
        JSON.stringify(this.errors, null, 2),
        'utf-8'
      );
    } catch (error) {
      // Silently fail in test environment
      if (!env.isTest()) {
        logger.error('Failed to save errors to disk', { error });
      }
    }
  }

  /**
   * Track an error
   */
  async trackError(
    error: Error | unknown,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: ErrorEntry['context']
  ): Promise<string> {
    const errorEntry: ErrorEntry = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      severity,
      message: (error as any)?.message || String(error),
      stack: (error as any)?.stack,
      context,
      error: this.sanitizeError(error)
    };

    this.errors.push(errorEntry);

    // Keep only the most recent errors in memory
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Log to console based on severity
    this.logToConsole(errorEntry);

    // Save to disk (async, don't wait)
    this.saveErrorsToDisk().catch(err => logger.error('Failed to save errors to disk', { error: err }));

    // In production, you could send to external monitoring service
    // e.g., Sentry, DataDog, New Relic
    if (env.isProduction() && severity === ErrorSeverity.CRITICAL) {
      this.notifyCriticalError(errorEntry);
    }

    return errorEntry.id;
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize error object (remove sensitive data)
   */
  private sanitizeError(error: unknown): Record<string, unknown> | null {
    if (!error) return null;

    const err = error as { name?: string; message?: string; code?: string; context?: Record<string, unknown> };
    const sanitized: Record<string, unknown> = {
      name: err.name,
      message: err.message,
      code: err.code
    };

    // Remove potentially sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];

    if (err.context) {
      sanitized['context'] = { ...err.context };
      const context = sanitized['context'] as Record<string, unknown>;
      sensitiveFields.forEach(field => {
        if (field in context) {
          context[field] = '[REDACTED]';
        }
      });
    }

    return sanitized;
  }

  /**
   * Log error with formatting
   */
  private logToConsole(errorEntry: ErrorEntry) {
    const logData: Record<string, unknown> = {
      severity: errorEntry.severity,
      timestamp: errorEntry.timestamp,
      message: errorEntry.message,
      context: errorEntry.context,
    };

    if (errorEntry.stack && env.isDevelopment()) {
      logData['stack'] = errorEntry.stack;
    }

    // Use appropriate log level based on severity
    const severityUpper = String(errorEntry.severity).toUpperCase();
    switch (errorEntry.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error(`[${severityUpper}] ${errorEntry.message}`, logData);
        break;
      case ErrorSeverity.HIGH:
        logger.error(`[${severityUpper}] ${errorEntry.message}`, logData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn(`[${severityUpper}] ${errorEntry.message}`, logData);
        break;
      case ErrorSeverity.LOW:
        logger.info(`[${severityUpper}] ${errorEntry.message}`, logData);
        break;
      default:
        logger.info(`[${severityUpper}] ${errorEntry.message}`, logData);
    }
  }

  /**
   * Notify about critical errors (placeholder for external integration)
   */
  private async notifyCriticalError(errorEntry: ErrorEntry) {
    // TODO: Integrate with external monitoring service
    // Examples:
    // - Sentry: Sentry.captureException(error)
    // - DataDog: dogapi.event.create(...)
    // - Email/Slack notification

    logger.error(`🚨 CRITICAL ERROR DETECTED: ${errorEntry.id}`, { errorEntry });
  }

  /**
   * Get error statistics
   */
  getStats(): ErrorStats {
    const bySeverity: Record<ErrorSeverity, number> = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0
    };

    this.errors.forEach(err => {
      bySeverity[err.severity]++;
    });

    // Get top error messages
    const errorCounts = new Map<string, number>();
    this.errors.forEach(err => {
      const count = errorCounts.get(err.message) || 0;
      errorCounts.set(err.message, count + 1);
    });

    const topErrors = Array.from(errorCounts.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total: this.errors.length,
      bySeverity,
      recent: this.errors.slice(-20).reverse(),
      topErrors
    };
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorSeverity): ErrorEntry[] {
    return this.errors.filter(err => err.severity === severity);
  }

  /**
   * Get errors in time range
   */
  getErrorsInTimeRange(startDate: Date, endDate: Date): ErrorEntry[] {
    return this.errors.filter(err => {
      const errDate = new Date(err.timestamp);
      return errDate >= startDate && errDate <= endDate;
    });
  }

  /**
   * Clear old errors (older than specified days)
   */
  async clearOldErrors(daysToKeep: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const originalLength = this.errors.length;
    this.errors = this.errors.filter(err => {
      const errDate = new Date(err.timestamp);
      return errDate >= cutoffDate;
    });

    const removed = originalLength - this.errors.length;
    if (removed > 0) {
      await this.saveErrorsToDisk();
      logger.info(`Cleared ${removed} old errors (older than ${daysToKeep} days)`);
    }

    return removed;
  }

  /**
   * Export errors to file
   */
  async exportErrors(filePath: string): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(this.errors, null, 2), 'utf-8');
  }
}

// Singleton instance
const errorTracker = new ErrorTracker();

/**
 * Track an error
 */
export function trackError(
  error: Error | unknown,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  context?: ErrorEntry['context']
): Promise<string> {
  return errorTracker.trackError(error, severity, context);
}

/**
 * Get error statistics
 */
export function getErrorStats(): ErrorStats {
  return errorTracker.getStats();
}

/**
 * Get errors by severity
 */
export function getErrorsBySeverity(severity: ErrorSeverity): ErrorEntry[] {
  return errorTracker.getErrorsBySeverity(severity);
}

/**
 * Get errors in time range
 */
export function getErrorsInTimeRange(startDate: Date, endDate: Date): ErrorEntry[] {
  return errorTracker.getErrorsInTimeRange(startDate, endDate);
}

/**
 * Clear old errors
 */
export function clearOldErrors(daysToKeep: number = 30): Promise<number> {
  return errorTracker.clearOldErrors(daysToKeep);
}

/**
 * Export errors to file
 */
export function exportErrors(filePath: string): Promise<void> {
  return errorTracker.exportErrors(filePath);
}

export default errorTracker;
