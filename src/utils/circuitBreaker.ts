/**
 * Circuit Breaker Utility
 * Sprint 4 - Epic 1: System Resilience
 *
 * Implements the circuit breaker pattern to prevent cascading failures
 * when external services become unavailable.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Failure threshold exceeded, fail fast
 * - HALF_OPEN: Testing if service recovered
 */

import { createLogger } from './logger';
import EventEmitter from 'events';

const logger = createLogger('circuit-breaker');

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;     // Failures before opening (default: 5)
  successThreshold: number;     // Successes to close from half-open (default: 2)
  timeout: number;              // ms in open state before half-open (default: 60000)
  windowSize: number;           // Time window for failure counting (default: 60000)
  volumeThreshold: number;      // Min requests before evaluating (default: 10)
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttempt?: Date;
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: Partial<CircuitBreakerConfig> = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000,        // 60 seconds
  windowSize: 60000,     // 60 seconds
  volumeThreshold: 10,
};

/**
 * Circuit Breaker Class
 *
 * Protects services from cascading failures by "opening" the circuit
 * when failure threshold is exceeded, preventing further calls to the
 * failing service until it recovers.
 *
 * @example
 * ```typescript
 * const breaker = new CircuitBreaker({
 *   name: 'email-service',
 *   failureThreshold: 5,
 *   successThreshold: 2,
 *   timeout: 60000,
 *   windowSize: 60000,
 *   volumeThreshold: 10,
 * });
 *
 * // Monitor state changes
 * breaker.on('stateChange', (newState) => {
 *   logger.info('Circuit state changed', { newState });
 * });
 *
 * // Execute protected operation
 * try {
 *   const result = await breaker.execute(async () => {
 *     return await emailService.send(message);
 *   });
 * } catch (error) {
 *   // Handle circuit open or operation failure
 * }
 * ```
 */
export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private totalRequests: number = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextAttempt: number = Date.now();
  private windowStart: number = Date.now();

  constructor(private config: CircuitBreakerConfig) {
    super();

    // Apply defaults
    this.config = {
      ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
      ...config,
    } as CircuitBreakerConfig;

    logger.info('Circuit breaker created', {
      name: this.config.name,
      failureThreshold: this.config.failureThreshold,
      timeout: this.config.timeout,
    });
  }

  /**
   * Execute an operation protected by the circuit breaker
   *
   * @param operation - Async operation to execute
   * @returns Result of the operation
   * @throws Error if circuit is OPEN or operation fails
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if window expired, reset counters
    if (Date.now() - this.windowStart > this.config.windowSize) {
      this.resetWindow();
    }

    // If circuit is open, fail fast
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        const error = new Error(
          `Circuit breaker ${this.config.name} is OPEN (failing fast)`
        );
        logger.warn('Circuit breaker open, failing fast', {
          name: this.config.name,
          nextAttempt: new Date(this.nextAttempt),
        });
        this.emit('rejected');
        throw error;
      }

      // Transition to half-open after timeout
      this.transitionTo(CircuitState.HALF_OPEN);
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.successes++;
    this.lastSuccessTime = new Date();
    this.failures = 0; // Reset failures on success

    this.emit('success', {
      name: this.config.name,
      successes: this.successes,
    });

    // If in half-open state and threshold met, close circuit
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successes >= this.config.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(error: unknown): void {
    this.failures++;
    this.lastFailureTime = new Date();

    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.warn('Circuit breaker recorded failure', {
      name: this.config.name,
      failures: this.failures,
      threshold: this.config.failureThreshold,
      error: errorMessage,
    });

    this.emit('failure', {
      name: this.config.name,
      failures: this.failures,
      error: errorMessage,
    });

    // Only evaluate if we have enough volume
    if (this.totalRequests < this.config.volumeThreshold) {
      logger.debug('Circuit breaker volume threshold not met', {
        name: this.config.name,
        totalRequests: this.totalRequests,
        volumeThreshold: this.config.volumeThreshold,
      });
      return;
    }

    // Open circuit if threshold exceeded (from CLOSED)
    if (
      this.state === CircuitState.CLOSED &&
      this.failures >= this.config.failureThreshold
    ) {
      this.transitionTo(CircuitState.OPEN);
    }

    // Re-open circuit if failed in HALF_OPEN state
    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.OPEN);
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    // Reset success counter when transitioning
    if (newState === CircuitState.HALF_OPEN) {
      this.successes = 0;
    }

    // Set next attempt time when opening
    if (newState === CircuitState.OPEN) {
      this.nextAttempt = Date.now() + this.config.timeout;
    }

    logger.info('Circuit breaker state changed', {
      name: this.config.name,
      oldState,
      newState,
      failures: this.failures,
      successes: this.successes,
      nextAttempt: newState === CircuitState.OPEN ? new Date(this.nextAttempt) : undefined,
    });

    this.emit('stateChange', newState, oldState);

    // Alert on circuit opening
    if (newState === CircuitState.OPEN) {
      logger.error('Circuit breaker OPENED', {
        name: this.config.name,
        failures: this.failures,
        threshold: this.config.failureThreshold,
      });
      this.emit('open', {
        name: this.config.name,
        failures: this.failures,
      });
    }

    // Log successful recovery
    if (oldState === CircuitState.HALF_OPEN && newState === CircuitState.CLOSED) {
      logger.info('Circuit breaker CLOSED (service recovered)', {
        name: this.config.name,
        successes: this.successes,
      });
      this.emit('close', {
        name: this.config.name,
      });
    }
  }

  /**
   * Reset the sliding window
   */
  private resetWindow(): void {
    logger.debug('Circuit breaker window reset', {
      name: this.config.name,
      oldFailures: this.failures,
      oldSuccesses: this.successes,
      oldTotalRequests: this.totalRequests,
    });

    this.windowStart = Date.now();
    this.failures = 0;
    this.successes = 0;
    this.totalRequests = 0;

    this.emit('windowReset', {
      name: this.config.name,
    });
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttempt: this.state === CircuitState.OPEN ? new Date(this.nextAttempt) : undefined,
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Manually reset the circuit breaker to CLOSED state
   * Use with caution - typically for testing or manual intervention
   */
  reset(): void {
    logger.info('Circuit breaker manually reset', {
      name: this.config.name,
      oldState: this.state,
    });

    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.totalRequests = 0;
    this.nextAttempt = Date.now();
    this.windowStart = Date.now();
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;

    this.emit('reset', {
      name: this.config.name,
    });
  }

  /**
   * Check if circuit is open
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN && Date.now() < this.nextAttempt;
  }

  /**
   * Check if circuit is closed
   */
  isClosed(): boolean {
    return this.state === CircuitState.CLOSED;
  }

  /**
   * Check if circuit is half-open
   */
  isHalfOpen(): boolean {
    return this.state === CircuitState.HALF_OPEN;
  }
}

/**
 * Circuit Breaker Registry
 * Manages multiple circuit breakers for different services
 */
export class CircuitBreakerRegistry {
  private static breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker for a service
   */
  static get(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    let breaker = this.breakers.get(name);

    if (!breaker) {
      breaker = new CircuitBreaker({
        name,
        ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
        ...config,
      } as CircuitBreakerConfig);

      // S4-4: Set up metrics listeners for circuit breaker
      this.setupMetricsListeners(name, breaker);

      this.breakers.set(name, breaker);
      logger.info('Circuit breaker registered', { name });
    }

    return breaker;
  }

  /**
   * S4-4: Set up metrics listeners for a circuit breaker
   */
  private static setupMetricsListeners(name: string, breaker: CircuitBreaker): void {
    // Lazy load MetricsService to avoid circular dependencies
    const getMetricsService = async () => {
      try {
        const { container } = await import('tsyringe');
        const { MetricsService } = await import('../services/MetricsService');
        return container.resolve(MetricsService);
      } catch (error) {
        logger.warn('Could not load MetricsService for circuit breaker metrics', { error });
        return null;
      }
    };

    // Listen for state changes
    breaker.on('open', async () => {
      const metrics = await getMetricsService();
      if (metrics) {
        metrics.recordCircuitBreakerStateChange(name, 'CLOSED', 'OPEN');
        metrics.recordCircuitBreakerTrip(name);
      }
    });

    breaker.on('close', async () => {
      const metrics = await getMetricsService();
      if (metrics) {
        metrics.recordCircuitBreakerStateChange(name, 'HALF_OPEN', 'CLOSED');
      }
    });

    // Listen for call results
    breaker.on('success', async () => {
      const metrics = await getMetricsService();
      if (metrics) {
        metrics.recordCircuitBreakerCall(name, 'success');
      }
    });

    breaker.on('failure', async () => {
      const metrics = await getMetricsService();
      if (metrics) {
        metrics.recordCircuitBreakerCall(name, 'failure');
      }
    });

    breaker.on('rejected', async () => {
      const metrics = await getMetricsService();
      if (metrics) {
        metrics.recordCircuitBreakerCall(name, 'rejected');
      }
    });
  }

  /**
   * Get all circuit breakers
   */
  static getAll(): Map<string, CircuitBreaker> {
    return this.breakers;
  }

  /**
   * Get stats for all circuit breakers
   */
  static getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};

    for (const [name, breaker] of this.breakers.entries()) {
      stats[name] = breaker.getStats();
    }

    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  static resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
    logger.info('All circuit breakers reset');
  }

  /**
   * Remove a circuit breaker
   */
  static remove(name: string): boolean {
    return this.breakers.delete(name);
  }
}

export default CircuitBreaker;
