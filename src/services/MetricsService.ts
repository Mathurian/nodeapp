/**
 * Performance Monitoring Service
 * Collects and exposes metrics for Prometheus
 */

import { injectable } from 'tsyringe';
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { createLogger } from '../utils/logger';

interface TenantMetricMetadata {
  tenantName?: string | null;
  tenantSlug?: string | null;
}

interface TenantMetricLabels {
  [key: string]: string;
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
}

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
  // Tenant segregation violation tracking
  private tenantSegregationViolations: Counter<string>;
  private offlineSyncTelemetryEvents: Counter<string>;
  private offlineSyncTelemetryBatches: Counter<string>;
  private idempotencyReservations: Counter<string>;
  private idempotencyFinalizations: Counter<string>;
  private idempotencyCleanupRuns: Counter<string>;
  private idempotencyCleanupRows: Counter<string>;
  // Test execution metrics
  private testRunsTotal: Counter<string>;
  private testPassTotal: Counter<string>;
  private testFailTotal: Counter<string>;
  private testSkipTotal: Counter<string>;
  private testDuration: Histogram<string>;
  private testSuiteStatus: Gauge<string>;
  private lastTestRunTimestamp: Gauge<string>;
  // System status metrics
  private serviceStatus: Gauge<string>;
  private serviceUptime: Gauge<string>;
  private serviceMemoryUsage: Gauge<string>;
  private serviceCpuUsage: Gauge<string>;
  private log = createLogger('metrics');

  // Track test completion times for automatic IDLE reset
  private testCompletionTimes: Map<string, number> = new Map();
  private statusResetInterval: NodeJS.Timeout | null = null;
  private readonly STATUS_RESET_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  private readonly tenantMetadata = new Map<string, { tenantName: string; tenantSlug: string }>();

  private normalizeTenantLabel(tenantId?: string): string {
    const normalized = tenantId?.trim();
    return normalized ? normalized : 'global';
  }

  private normalizeTenantDisplayLabel(value: string | null | undefined, fallback: string): string {
    const normalized = value?.trim();
    return normalized ? normalized : fallback;
  }

  registerTenantMetadata(tenantId?: string, tenantName?: string | null, tenantSlug?: string | null): void {
    const normalizedTenantId = this.normalizeTenantLabel(tenantId);
    if (!normalizedTenantId || normalizedTenantId === 'global') {
      return;
    }

    const normalizedTenantName = this.normalizeTenantDisplayLabel(tenantName, normalizedTenantId);
    const normalizedTenantSlug = this.normalizeTenantDisplayLabel(tenantSlug, normalizedTenantId);
    this.tenantMetadata.set(normalizedTenantId, {
      tenantName: normalizedTenantName,
      tenantSlug: normalizedTenantSlug,
    });
  }

  getTenantMetricLabels(tenantId?: string, metadata?: TenantMetricMetadata): TenantMetricLabels {
    const normalizedTenantId = this.normalizeTenantLabel(tenantId);

    if (normalizedTenantId === 'global') {
      return {
        tenant_id: 'global',
        tenant_name: 'Global',
        tenant_slug: 'global',
      };
    }

    if (metadata?.tenantName || metadata?.tenantSlug) {
      this.registerTenantMetadata(normalizedTenantId, metadata.tenantName, metadata.tenantSlug);
    }

    const cached = this.tenantMetadata.get(normalizedTenantId);
    return {
      tenant_id: normalizedTenantId,
      tenant_name: this.normalizeTenantDisplayLabel(metadata?.tenantName, cached?.tenantName || normalizedTenantId),
      tenant_slug: this.normalizeTenantDisplayLabel(metadata?.tenantSlug, cached?.tenantSlug || normalizedTenantId),
    };
  }

  constructor() {
    // Create a Registry to register the metrics
    this.register = new Registry();
    this.log.info('MetricsService instance created with new Registry');

    // Add default metrics (CPU, memory, etc.)
    collectDefaultMetrics({ register: this.register });

    // HTTP Request Duration Histogram
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code', 'tenant_id', 'tenant_name', 'tenant_slug'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
      registers: [this.register],
    });

    // HTTP Request Total Counter
    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'tenant_id', 'tenant_name', 'tenant_slug'],
      registers: [this.register],
    });

    // HTTP Request Errors Counter
    this.httpRequestErrors = new Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type', 'tenant_id', 'tenant_name', 'tenant_slug'],
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
      labelNames: ['operation', 'table', 'tenant_id', 'tenant_name', 'tenant_slug'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.register],
    });

    // Cache Hit Rate Counter
    this.cacheHitRate = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_key', 'tenant_id', 'tenant_name', 'tenant_slug'],
      registers: [this.register],
    });

    // Cache Miss Rate Counter
    this.cacheMissRate = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_key', 'tenant_id', 'tenant_name', 'tenant_slug'],
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
      labelNames: ['model', 'tenant_id', 'tenant_name', 'tenant_slug'],
      registers: [this.register],
    });

    // S4-4: Soft Delete Restores
    this.softDeleteRestores = new Counter({
      name: 'soft_delete_restores_total',
      help: 'Total number of soft delete restore operations',
      labelNames: ['model', 'tenant_id', 'tenant_name', 'tenant_slug'],
      registers: [this.register],
    });

    // S4-4: Requests with Correlation ID
    this.requestsWithCorrelationId = new Counter({
      name: 'requests_with_correlation_id_total',
      help: 'Total number of requests with correlation ID',
      labelNames: ['has_correlation_id'],
      registers: [this.register],
    });

    this.tenantSegregationViolations = new Counter({
      name: 'tenant_segregation_violations_total',
      help: 'Total number of tenant segregation policy violations or denials',
      labelNames: ['code', 'layer', 'mode', 'outcome'],
      registers: [this.register],
    });

    this.offlineSyncTelemetryEvents = new Counter({
      name: 'offline_sync_telemetry_events_total',
      help: 'Total number of accepted offline-sync telemetry events',
      labelNames: ['queue_source', 'operation', 'result', 'network_state', 'status_bucket'],
      registers: [this.register],
    });

    this.offlineSyncTelemetryBatches = new Counter({
      name: 'offline_sync_telemetry_batches_total',
      help: 'Total number of offline-sync telemetry ingest batches',
      labelNames: ['outcome'],
      registers: [this.register],
    });

    this.idempotencyReservations = new Counter({
      name: 'idempotency_reservations_total',
      help: 'Total number of idempotency reservation attempts by outcome',
      labelNames: ['outcome'],
      registers: [this.register],
    });

    this.idempotencyFinalizations = new Counter({
      name: 'idempotency_finalizations_total',
      help: 'Total number of idempotency finalization transitions by resulting status',
      labelNames: ['status'],
      registers: [this.register],
    });

    this.idempotencyCleanupRuns = new Counter({
      name: 'idempotency_cleanup_runs_total',
      help: 'Total number of idempotency cleanup run attempts by outcome',
      labelNames: ['outcome'],
      registers: [this.register],
    });

    this.idempotencyCleanupRows = new Counter({
      name: 'idempotency_cleanup_rows_total',
      help: 'Total number of idempotency lifecycle rows processed by operation',
      labelNames: ['operation'],
      registers: [this.register],
    });

    // Test Execution Metrics
    this.testRunsTotal = new Counter({
      name: 'test_runs_total',
      help: 'Total number of test runs',
      labelNames: ['suite', 'type'], // type: unit, integration, e2e
      registers: [this.register],
    });

    this.testPassTotal = new Counter({
      name: 'test_pass_total',
      help: 'Total number of passed tests',
      labelNames: ['suite', 'type'],
      registers: [this.register],
    });

    this.testFailTotal = new Counter({
      name: 'test_fail_total',
      help: 'Total number of failed tests',
      labelNames: ['suite', 'type'],
      registers: [this.register],
    });

    this.testSkipTotal = new Counter({
      name: 'test_skip_total',
      help: 'Total number of skipped tests',
      labelNames: ['suite', 'type'],
      registers: [this.register],
    });

    this.testDuration = new Histogram({
      name: 'test_duration_seconds',
      help: 'Duration of test execution in seconds',
      labelNames: ['suite', 'type'],
      buckets: [1, 5, 10, 30, 60, 120, 300, 600], // 1s to 10min
      registers: [this.register],
    });

    this.testSuiteStatus = new Gauge({
      name: 'test_suite_status',
      help: 'Current test suite status (0=idle, 1=running, 2=passed, 3=failed)',
      labelNames: ['suite', 'type'],
      registers: [this.register],
    });

    this.lastTestRunTimestamp = new Gauge({
      name: 'last_test_run_timestamp_seconds',
      help: 'Unix timestamp of last test run',
      labelNames: ['suite', 'type'],
      registers: [this.register],
    });

    // System Status Metrics
    this.serviceStatus = new Gauge({
      name: 'service_status',
      help: 'Service status (0=down, 1=up)',
      labelNames: ['service', 'port'],
      registers: [this.register],
    });

    this.serviceUptime = new Gauge({
      name: 'service_uptime_seconds',
      help: 'Service uptime in seconds',
      labelNames: ['service'],
      registers: [this.register],
    });

    this.serviceMemoryUsage = new Gauge({
      name: 'service_memory_usage_bytes',
      help: 'Service memory usage in bytes',
      labelNames: ['service'],
      registers: [this.register],
    });

    this.serviceCpuUsage = new Gauge({
      name: 'service_cpu_usage_percent',
      help: 'Service CPU usage percentage',
      labelNames: ['service'],
      registers: [this.register],
    });

    this.log.info('Metrics service initialized with test and system monitoring');

    // Start periodic check to reset test suite status to IDLE after timeout.
    // Unit tests construct this service in short-lived Jest environments; a
    // background interval can outlive the environment and touch soft-deleted globals.
    if (process.env['NODE_ENV'] !== 'test') {
      this.startStatusResetInterval();
    }
  }

  /**
   * Start interval to check and reset stale test statuses
   */
  private startStatusResetInterval(): void {
    // Check every minute
    this.statusResetInterval = setInterval(() => {
      this.checkAndResetStaleTestStatuses();
    }, 60 * 1000);

    // Ensure interval doesn't prevent process exit
    if (this.statusResetInterval.unref) {
      this.statusResetInterval.unref();
    }
  }

  /**
   * Check for test suites that completed more than STATUS_RESET_TIMEOUT_MS ago
   * and reset their status to IDLE (0)
   */
  private checkAndResetStaleTestStatuses(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, completionTime] of this.testCompletionTimes.entries()) {
      const timeSinceCompletion = now - completionTime;

      if (timeSinceCompletion > this.STATUS_RESET_TIMEOUT_MS) {
        // Parse the key to get suite and type
        const [suite, type] = key.split('::');

        // Reset status to IDLE
        this.testSuiteStatus.set({ suite, type }, 0);
        this.log.debug(`Reset test suite status to IDLE: ${suite} (${type}) - ${(timeSinceCompletion / 1000 / 60).toFixed(1)} minutes since completion`);

        keysToDelete.push(key);
      }
    }

    // Clean up old entries
    for (const key of keysToDelete) {
      this.testCompletionTimes.delete(key);
    }
  }

  /**
   * Cleanup method to stop intervals
   */
  destroy(): void {
    if (this.statusResetInterval) {
      clearInterval(this.statusResetInterval);
      this.statusResetInterval = null;
    }
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    tenantId?: string,
    tenantMetadata?: TenantMetricMetadata,
  ): void {
    const tenantLabels = this.getTenantMetricLabels(tenantId, tenantMetadata);
    const labels = {
      method: method.toUpperCase(),
      route: this.normalizeRoute(route),
      status_code: statusCode.toString(),
      ...tenantLabels,
    };

    this.httpRequestDuration.observe(labels, duration / 1000); // Convert to seconds
    this.httpRequestTotal.inc(labels);
  }

  /**
   * Record HTTP error
   */
  recordHttpError(
    method: string,
    route: string,
    errorType: string,
    tenantId?: string,
    tenantMetadata?: TenantMetricMetadata,
  ): void {
    this.httpRequestErrors.inc({
      method: method.toUpperCase(),
      route: this.normalizeRoute(route),
      error_type: errorType,
      ...this.getTenantMetricLabels(tenantId, tenantMetadata),
    });
  }

  /**
   * Record database query duration
   */
  recordDatabaseQuery(
    operation: string,
    table: string,
    duration: number,
    tenantId?: string,
    tenantMetadata?: TenantMetricMetadata,
  ): void {
    this.databaseQueryDuration.observe(
      { operation, table, ...this.getTenantMetricLabels(tenantId, tenantMetadata) },
      duration / 1000 // Convert to seconds
    );
  }

  /**
   * Record cache hit
   */
  recordCacheHit(cacheKey: string, tenantId?: string, tenantMetadata?: TenantMetricMetadata): void {
    this.cacheHitRate.inc({
      cache_key: cacheKey,
      ...this.getTenantMetricLabels(tenantId, tenantMetadata),
    });
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(cacheKey: string, tenantId?: string, tenantMetadata?: TenantMetricMetadata): void {
    this.cacheMissRate.inc({
      cache_key: cacheKey,
      ...this.getTenantMetricLabels(tenantId, tenantMetadata),
    });
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
   * Get the Prometheus registry (for use by other metrics collectors)
   */
  getRegistry(): Registry {
    return this.register;
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    const metricsCount = (this.register as any)._metrics ? Object.keys((this.register as any)._metrics).length : 'unknown';
    this.log.info(`getMetrics() called - registry has ${metricsCount} metrics`);
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
  recordSoftDelete(model: string, tenantId?: string, tenantMetadata?: TenantMetricMetadata): void {
    this.softDeleteOperations.inc({
      model,
      ...this.getTenantMetricLabels(tenantId, tenantMetadata),
    });
  }

  /**
   * S4-4: Record soft delete restore operation
   */
  recordSoftDeleteRestore(model: string, tenantId?: string, tenantMetadata?: TenantMetricMetadata): void {
    this.softDeleteRestores.inc({
      model,
      ...this.getTenantMetricLabels(tenantId, tenantMetadata),
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
   * Record tenant segregation policy violation/denial event
   */
  recordTenantSegregationViolation(
    code: 'DEFAULT_TENANT_RESTRICTED' | 'TENANT_SCOPE_VIOLATION' | 'TENANT_CONTEXT_MISMATCH',
    layer: 'auth' | 'tenant_middleware' | 'service' | 'route' | 'policy',
    mode: 'off' | 'audit' | 'enforce' | 'n/a',
    outcome: 'blocked' | 'allowed' | 'audit_only'
  ): void {
    this.tenantSegregationViolations.inc({
      code,
      layer,
      mode,
      outcome,
    });
  }

  recordOfflineSyncTelemetryEvent(
    queueSource: 'app' | 'sw',
    operation: string,
    result: 'enqueued' | 'replay_success' | 'replay_retry' | 'replay_permanent_failure' | 'dropped',
    networkState: 'online' | 'offline' | 'unknown',
    statusBucket: '2xx' | '4xx' | '429' | '5xx' | 'timeout' | 'network_error'
  ): void {
    this.offlineSyncTelemetryEvents.inc({
      queue_source: queueSource,
      operation,
      result,
      network_state: networkState,
      status_bucket: statusBucket,
    });
  }

  recordOfflineSyncTelemetryBatch(
    outcome: 'accepted' | 'accepted_with_duplicates' | 'rejected',
    count: number,
  ): void {
    this.offlineSyncTelemetryBatches.inc({ outcome }, count);
  }

  recordIdempotencyReservation(
    outcome: 'created' | 'reused' | 'failed',
  ): void {
    this.idempotencyReservations.inc({ outcome });
  }

  recordIdempotencyFinalization(
    status: 'PENDING' | 'COMPLETED' | 'FAILED_RETRYABLE' | 'FAILED_TERMINAL',
  ): void {
    this.idempotencyFinalizations.inc({ status });
  }

  recordIdempotencyCleanupRun(
    outcome: 'success' | 'lock_skipped' | 'failed',
  ): void {
    this.idempotencyCleanupRuns.inc({ outcome });
  }

  recordIdempotencyCleanupRows(
    operation: 'expired_delete',
    count: number,
  ): void {
    if (count <= 0) {
      return;
    }

    this.idempotencyCleanupRows.inc({ operation }, count);
  }

  /**
   * Record test run start
   */
  recordTestRunStart(suite: string, type: 'unit' | 'integration' | 'e2e'): void {
    this.testRunsTotal.inc({ suite, type });
    this.testSuiteStatus.set({ suite, type }, 1); // 1 = running
    this.log.debug(`Test run started: ${suite} (${type})`);
  }

  /**
   * Record test results
   */
  recordTestResults(
    suite: string,
    type: 'unit' | 'integration' | 'e2e',
    passed: number,
    failed: number,
    skipped: number,
    durationSeconds: number
  ): void {
    const labels = { suite, type };

    // Update counters
    this.testPassTotal.inc(labels, passed);
    this.testFailTotal.inc(labels, failed);
    this.testSkipTotal.inc(labels, skipped);

    // Update duration
    this.testDuration.observe(labels, durationSeconds);

    // Update status (2 = passed, 3 = failed)
    const status = failed > 0 ? 3 : 2;
    this.testSuiteStatus.set(labels, status);

    // Update timestamp
    this.lastTestRunTimestamp.set(labels, Date.now() / 1000);

    // Track completion time for automatic IDLE reset
    const key = `${suite}::${type}`;
    this.testCompletionTimes.set(key, Date.now());

    this.log.info(`Test results recorded: ${suite} (${type}) - ${passed} passed, ${failed} failed, ${skipped} skipped`);
  }

  /**
   * Record test run completion
   */
  recordTestRunComplete(suite: string, type: 'unit' | 'integration' | 'e2e', success: boolean): void {
    const status = success ? 2 : 3; // 2 = passed, 3 = failed
    this.testSuiteStatus.set({ suite, type }, status);
    this.lastTestRunTimestamp.set({ suite, type }, Date.now() / 1000);

    // Track completion time for automatic IDLE reset
    const key = `${suite}::${type}`;
    this.testCompletionTimes.set(key, Date.now());

    this.log.debug(`Test run completed: ${suite} (${type}) - ${success ? 'PASSED' : 'FAILED'}`);
  }

  /**
   * Reset test suite status to idle
   */
  resetTestSuiteStatus(suite: string, type: 'unit' | 'integration' | 'e2e'): void {
    this.testSuiteStatus.set({ suite, type }, 0); // 0 = idle
  }

  /**
   * Update service status
   */
  updateServiceStatus(service: string, port: string, isRunning: boolean): void {
    this.serviceStatus.set({ service, port }, isRunning ? 1 : 0);
    this.log.debug(`Service status updated: ${service}:${port} - ${isRunning ? 'UP' : 'DOWN'}`);
  }

  /**
   * Update service uptime
   */
  updateServiceUptime(service: string, uptimeSeconds: number): void {
    this.serviceUptime.set({ service }, uptimeSeconds);
  }

  /**
   * Update service memory usage
   */
  updateServiceMemory(service: string, memoryBytes: number): void {
    this.serviceMemoryUsage.set({ service }, memoryBytes);
  }

  /**
   * Update service CPU usage
   */
  updateServiceCpu(service: string, cpuPercent: number): void {
    this.serviceCpuUsage.set({ service }, cpuPercent);
  }

  /**
   * Update multiple service metrics at once
   */
  updateServiceMetrics(service: string, metrics: {
    port?: string;
    isRunning?: boolean;
    uptimeSeconds?: number;
    memoryBytes?: number;
    cpuPercent?: number;
  }): void {
    if (metrics.port !== undefined && metrics.isRunning !== undefined) {
      this.updateServiceStatus(service, metrics.port, metrics.isRunning);
    }
    if (metrics.uptimeSeconds !== undefined) {
      this.updateServiceUptime(service, metrics.uptimeSeconds);
    }
    if (metrics.memoryBytes !== undefined) {
      this.updateServiceMemory(service, metrics.memoryBytes);
    }
    if (metrics.cpuPercent !== undefined) {
      this.updateServiceCpu(service, metrics.cpuPercent);
    }
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
