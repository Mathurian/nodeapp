import { container } from 'tsyringe';
import { MetricsService } from '../services/MetricsService';
import { createLogger } from './logger';

export type SegregationViolationCode =
  | 'DEFAULT_TENANT_RESTRICTED'
  | 'TENANT_SCOPE_VIOLATION'
  | 'TENANT_CONTEXT_MISMATCH';

export type SegregationViolationLayer =
  | 'auth'
  | 'tenant_middleware'
  | 'service'
  | 'route'
  | 'policy';

export type SegregationViolationMode = 'off' | 'audit' | 'enforce' | 'n/a';
export type SegregationViolationOutcome = 'blocked' | 'allowed' | 'audit_only';

export interface SegregationViolationContext {
  userId?: string;
  role?: string;
  tenantId?: string;
  requestTenantId?: string;
  tokenTenantId?: string;
  userTenantId?: string;
  tenantSlug?: string;
  path?: string;
  method?: string;
  model?: string;
  operation?: string;
  reason?: string;
}

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

export const recordTenantSegregationViolation = (
  code: SegregationViolationCode,
  layer: SegregationViolationLayer,
  mode: SegregationViolationMode,
  outcome: SegregationViolationOutcome,
  context: SegregationViolationContext = {}
): void => {
  recordTenantSegregationViolationMetric(code, layer, mode, outcome);

  const logMethod =
    outcome === 'blocked'
      ? 'warn'
      : outcome === 'audit_only'
        ? 'warn'
        : 'info';

  log[logMethod]('Tenant segregation violation', {
    code,
    layer,
    mode,
    outcome,
    ...context,
  });
};
