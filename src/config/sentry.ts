/**
 * Sentry Configuration
 *
 * Initializes and configures Sentry for error monitoring and performance tracking.
 * This module provides centralized Sentry configuration with environment-based settings.
 *
 * @module config/sentry
 */

import * as Sentry from '@sentry/node';
import { env } from './env';
import { createLogger } from '../utils/logger';

const logger = createLogger('sentry');

/**
 * Initialize Sentry with configuration from environment variables
 *
 * This function should be called as early as possible in the application lifecycle,
 * before any other imports or middleware setup.
 *
 * @returns boolean - true if Sentry was successfully initialized, false otherwise
 */
export function initializeSentry(): boolean {
  try {
    // Check if Sentry is enabled
    const sentryEnabled = env.get('SENTRY_ENABLED');
    const sentryDsn = env.get('SENTRY_DSN');

    if (!sentryEnabled) {
      logger.info('Sentry monitoring is disabled (SENTRY_ENABLED=false)');
      return false;
    }

    if (!sentryDsn) {
      logger.warn('Sentry DSN not configured - error monitoring disabled');
      return false;
    }

    // Get environment configuration
    const nodeEnv = env.get('NODE_ENV');
    const sentryEnvironment = env.get('SENTRY_ENVIRONMENT') || nodeEnv;
    const appVersion = env.get('APP_VERSION');
    const appName = env.get('APP_NAME');
    const tracesSampleRate = env.get('SENTRY_TRACES_SAMPLE_RATE') || 0.1;

    // Initialize Sentry
    Sentry.init({
      dsn: sentryDsn,
      environment: sentryEnvironment,
      release: `${appName}@${appVersion}`,

      // Performance Monitoring
      tracesSampleRate: tracesSampleRate,

      // Sample rate for profiling (optional - can be adjusted)
      profilesSampleRate: nodeEnv === 'production' ? 0.1 : 0,

      // Enable debug mode in development
      debug: nodeEnv === 'development',

      // Attach stack traces to all messages
      attachStacktrace: true,

      // Normalize depth for data sent to Sentry
      normalizeDepth: 10,

      // Maximum breadcrumbs
      maxBreadcrumbs: 50,

      // Configure integrations (v10 uses built-in integrations)
      integrations: [
        // HTTP integration is included by default in v10
        // Add custom integrations here if needed
      ],

      // Filter out sensitive data before sending to Sentry
      beforeSend(event, _hint) {
        // Remove sensitive data from breadcrumbs
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
            if (breadcrumb.data) {
              // Redact sensitive fields
              const sensitiveFields = [
                'password', 'token', 'secret', 'apikey', 'api_key',
                'mfa', 'totp', 'otp', 'mfasecret', 'mfa_secret',
                'authorization', 'cookie', 'session',
              ];

              Object.keys(breadcrumb.data).forEach(key => {
                const lowerKey = key.toLowerCase();
                if (sensitiveFields.some(field => lowerKey.includes(field))) {
                  breadcrumb.data![key] = '[REDACTED]';
                }
              });
            }
            return breadcrumb;
          });
        }

        // Remove sensitive data from request data
        if (event.request) {
          if (event.request.headers) {
            delete event.request.headers['authorization'];
            delete event.request.headers['cookie'];
          }

          if (event.request.data) {
            const data = event.request.data as Record<string, any>;
            if (data['password']) data['password'] = '[REDACTED]';
            if (data['token']) data['token'] = '[REDACTED]';
            if (data['secret']) data['secret'] = '[REDACTED]';
          }
        }

        return event;
      },

      // Ignore specific errors
      ignoreErrors: [
        // Browser/Network errors
        'Network request failed',
        'NetworkError',
        'Failed to fetch',

        // Common non-critical errors
        'Non-Error promise rejection captured',
        'ResizeObserver loop limit exceeded',

        // CSRF errors (handled by application)
        'CSRF token',
        'invalid csrf token',
      ],
    });

    logger.info(`Sentry initialized successfully`, { environment: sentryEnvironment, release: `${appName}@${appVersion}` });
    return true;
  } catch (error) {
    logger.error('Sentry failed to initialize', { error });
    return false;
  }
}

/**
 * Capture an exception manually
 *
 * @param error - The error to capture
 * @param context - Additional context to attach to the error
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  try {
    if (env.get('SENTRY_ENABLED') && env.get('SENTRY_DSN')) {
      if (context) {
        Sentry.setContext('additional', context);
      }
      Sentry.captureException(error);
    }
  } catch (err) {
    logger.error('Sentry failed to capture exception', { error: err });
  }
}

/**
 * Capture a message manually
 *
 * @param message - The message to capture
 * @param level - The severity level (optional)
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  try {
    if (env.get('SENTRY_ENABLED') && env.get('SENTRY_DSN')) {
      Sentry.captureMessage(message, level);
    }
  } catch (err) {
    logger.error('Sentry failed to capture message', { error: err });
  }
}

/**
 * Set user context for Sentry
 *
 * @param user - User information to attach to error reports
 */
export function setUser(user: { id: string; email?: string; username?: string }): void {
  try {
    if (env.get('SENTRY_ENABLED') && env.get('SENTRY_DSN')) {
      Sentry.setUser(user);
    }
  } catch (err) {
    logger.error('Sentry failed to set user', { error: err });
  }
}

/**
 * Clear user context
 */
export function clearUser(): void {
  try {
    if (env.get('SENTRY_ENABLED') && env.get('SENTRY_DSN')) {
      Sentry.setUser(null);
    }
  } catch (err) {
    logger.error('Sentry failed to clear user', { error: err });
  }
}

/**
 * Add breadcrumb for debugging
 *
 * @param breadcrumb - Breadcrumb data
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
  try {
    if (env.get('SENTRY_ENABLED') && env.get('SENTRY_DSN')) {
      Sentry.addBreadcrumb(breadcrumb);
    }
  } catch (err) {
    logger.error('Sentry failed to add breadcrumb', { error: err });
  }
}

/**
 * Close Sentry gracefully
 *
 * @param timeout - Maximum time to wait for pending events to be sent (milliseconds)
 * @returns Promise that resolves when all events have been sent
 */
export async function closeSentry(timeout: number = 2000): Promise<void> {
  try {
    if (env.get('SENTRY_ENABLED') && env.get('SENTRY_DSN')) {
      await Sentry.close(timeout);
      logger.info('Sentry closed successfully');
    }
  } catch (err) {
    logger.error('Sentry failed to close', { error: err });
  }
}

// Export Sentry for advanced usage
export { Sentry };
