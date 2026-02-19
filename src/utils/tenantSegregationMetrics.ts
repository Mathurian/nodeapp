import { container } from 'tsyringe';
import { MetricsService } from '../services/MetricsService';
import { createLogger } from './logger';

type SegregationViolationCode =
  | 'DEFAULT_TENANT_RESTRICTED'
  | 'TENANT_SCOPE_VIOLATION'
  | 'TENANT_CONTEXT_MISMATCH';

type SegregationViolationLayer =
  | 'auth'
  | 'tenant_middleware'
  | 'service'
  | 'route'
  | 'policy';

type SegregationViolationMode = 'off' | 'audit' | 'enforce' | 'n/a';
type SegregationViolationOutcome = 'blocked' | 'allowed' | 'audit_only';

const log = createLogger('tenant-segregation-metrics');

let cachedMetricsService: MetricsService | null = null;
let metricsServiceLookupAttempted = false;

const getMetricsService = (): MetricsService | null => {
  if (metricsServiceLookupAttempted) {
    return cachedMetricsService;
  }

  metricsServiceLookupAttempted = true;
  try {
    cachedMetricsService = container.resolve(MetricsService);
  } catch (error) {
    cachedMetricsService = null;
    log.warn('MetricsService unavailable for tenant segregation counters', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return cachedMetricsService;
};

export const recordTenantSegregationViolationMetric = (
  code: SegregationViolationCode,
  layer: SegregationViolationLayer,
  mode: SegregationViolationMode,
  outcome: SegregationViolationOutcome
): void => {
  const metricsService = getMetricsService();
  if (!metricsService) {
    return;
  }

  metricsService.recordTenantSegregationViolation(code, layer, mode, outcome);
};

