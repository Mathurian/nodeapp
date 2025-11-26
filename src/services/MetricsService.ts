/**
 * Performance Monitoring Service
 * Collects and exposes metrics for Prometheus
 */

import { injectable } from 'tsyringe';
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { createLogger } from '../utils/logger';

@injectable()
export class MetricsService {
  private register: Registry;
  private httpRequestDuration: Histogram<string>;
  private httpRequestTotal: Counter<string>;
  private httpRequestErrors: Counter<string>;
  private activeConnections: Gauge<string>;
  private databaseQueryDuration: Histogram<string>;
  private cacheHitRate: Counter<string>;
  private cacheMissRate: Counter<string>;
  // S4-4: Circuit breaker metrics
  private circuitBreakerStateChanges: Counter<string>;
  private circuitBreakerTrips: Counter<string>;
  private circuitBreakerCalls: Counter<string>;
  // S4-4: Soft delete operation metrics
  private softDeleteOperations: Counter<string>;
  private softDeleteRestores: Counter<string>;
  // S4-4: Correlation ID tracking
  private requestsWithCorrelationId: Counter<string>;
  private log = createLogger('metrics');

  constructor() {
    // Create a Registry to register the metrics
    this.register = new Registry();

    // Add default metrics (CPU, memory, etc.)
    collectDefaultMetrics({ register: this.register });

    // HTTP Request Duration Histogram
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
      registers: [this.register],
    });

    // HTTP Request Total Counter
    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    // HTTP Request Errors Counter
    this.httpRequestErrors = new Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type'],
      registers: [this.register],
    });

    // Active Connections Gauge
    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      registers: [this.register],
    });

    // Database Query Duration Histogram
    this.databaseQueryDuration = new Histogram({
      name: 'database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.register],
    });

    // Cache Hit Rate Counter
    this.cacheHitRate = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_key'],
      registers: [this.register],
    });

    // Cache Miss Rate Counter
    this.cacheMissRate = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_key'],
      registers: [this.register],
    });

    // S4-4: Circuit Breaker State Changes
    this.circuitBreakerStateChanges = new Counter({
      name: 'circuit_breaker_state_changes_total',
      help: 'Total number of circuit breaker state changes',
      labelNames: ['breaker_name', 'from_state', 'to_state'],
      registers: [this.register],
    });

    // S4-4: Circuit Breaker Trips
    this.circuitBreakerTrips = new Counter({
      name: 'circuit_breaker_trips_total',
      help: 'Total number of circuit breaker trips',
      labelNames: ['breaker_name'],
      registers: [this.register],
    });

    // S4-4: Circuit Breaker Calls
    this.circuitBreakerCalls = new Counter({
      name: 'circuit_breaker_calls_total',
      help: 'Total number of circuit breaker calls',
      labelNames: ['breaker_name', 'result'],
      registers: [this.register],
    });

    // S4-4: Soft Delete Operations
    this.softDeleteOperations = new Counter({
      name: 'soft_delete_operations_total',
      help: 'Total number of soft delete operations',
      labelNames: ['model', 'tenant_id'],
      registers: [this.register],
    });

    // S4-4: Soft Delete Restores
    this.softDeleteRestores = new Counter({
      name: 'soft_delete_restores_total',
      help: 'Total number of soft delete restore operations',
      labelNames: ['model', 'tenant_id'],
      registers: [this.register],
    });

    // S4-4: Requests with Correlation ID
    this.requestsWithCorrelationId = new Counter({
      name: 'requests_with_correlation_id_total',
      help: 'Total number of requests with correlation ID',
      labelNames: ['has_correlation_id'],
      registers: [this.register],
    });

    this.log.info('Metrics service initialized with Sprint 4 enhancements');
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    const labels = {
      method: method.toUpperCase(),
      route: this.normalizeRoute(route),
      status_code: statusCode.toString(),
    };

    this.httpRequestDuration.observe(labels, duration / 1000); // Convert to seconds
    this.httpRequestTotal.inc(labels);
  }

  /**
   * Record HTTP error
   */
  recordHttpError(method: string, route: string, errorType: string): void {
    this.httpRequestErrors.inc({
      method: method.toUpperCase(),
      route: this.normalizeRoute(route),
      error_type: errorType,
    });
  }

  /**
   * Record database query duration
   */
  recordDatabaseQuery(operation: string, table: string, duration: number): void {
    this.databaseQueryDuration.observe(
      { operation, table },
      duration / 1000 // Convert to seconds
    );
  }

  /**
   * Record cache hit
   */
  recordCacheHit(cacheKey: string): void {
    this.cacheHitRate.inc({ cache_key: cacheKey });
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(cacheKey: string): void {
    this.cacheMissRate.inc({ cache_key: cacheKey });
  }

  /**
   * Update active connections gauge
   */
  setActiveConnections(count: number): void {
    this.activeConnections.set(count);
  }

  /**
   * Increment active connections
   */
  incrementActiveConnections(): void {
    this.activeConnections.inc();
  }

  /**
   * Decrement active connections
   */
  decrementActiveConnections(): void {
    this.activeConnections.dec();
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  /**
   * Get metrics as JSON
   */
  async getMetricsAsJson(): Promise<any> {
    return this.register.getMetricsAsJSON();
  }

  /**
   * Reset all metrics (useful for testing)
   */
  resetMetrics(): void {
    this.register.resetMetrics();
  }

  /**
   * S4-4: Record circuit breaker state change
   */
  recordCircuitBreakerStateChange(breakerName: string, fromState: string, toState: string): void {
    this.circuitBreakerStateChanges.inc({
      breaker_name: breakerName,
      from_state: fromState,
      to_state: toState,
    });
  }

  /**
   * S4-4: Record circuit breaker trip
   */
  recordCircuitBreakerTrip(breakerName: string): void {
    this.circuitBreakerTrips.inc({ breaker_name: breakerName });
  }

  /**
   * S4-4: Record circuit breaker call
   */
  recordCircuitBreakerCall(breakerName: string, result: 'success' | 'failure' | 'rejected'): void {
    this.circuitBreakerCalls.inc({
      breaker_name: breakerName,
      result,
    });
  }

  /**
   * S4-4: Record soft delete operation
   */
  recordSoftDelete(model: string, tenantId?: string): void {
    this.softDeleteOperations.inc({
      model,
      tenant_id: tenantId || 'unknown',
    });
  }

  /**
   * S4-4: Record soft delete restore operation
   */
  recordSoftDeleteRestore(model: string, tenantId?: string): void {
    this.softDeleteRestores.inc({
      model,
      tenant_id: tenantId || 'unknown',
    });
  }

  /**
   * S4-4: Record request with correlation ID
   */
  recordCorrelationId(hasCorrelationId: boolean): void {
    this.requestsWithCorrelationId.inc({
      has_correlation_id: hasCorrelationId ? 'true' : 'false',
    });
  }

  /**
   * Normalize route path for metrics
   */
  private normalizeRoute(route: string): string {
    // Replace dynamic segments with placeholders
    return route
      .replace(/\/[0-9a-f-]{36}/gi, '/:id') // UUIDs
      .replace(/\/\d+/g, '/:id') // Numeric IDs
      .replace(/\/api\//g, '/api/')
      .toLowerCase();
  }
}

export default MetricsService;

