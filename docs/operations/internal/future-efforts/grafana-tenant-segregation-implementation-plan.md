# Grafana Tenant Segregation Implementation Plan

## Objective

Move Grafana from the current shared-viewer model to a design that:

1. keeps Grafana as the primary monitoring surface;
2. supports human-readable tenant, event, contest, and category names where appropriate;
3. prevents non-super-admin viewers from querying or pivoting into another tenant's monitoring data;
4. cleanly separates dev and prod monitoring surfaces; and
5. remains maintainable across future deployments.

## Current Limitation

The current shared Grafana implementation can safely improve dashboard UX by showing human-readable names, but it does not provide hard tenant isolation for non-super-admin viewers because:

1. Grafana Viewer accounts still retain datasource query capabilities in the shared org;
2. dashboard variable locking is a UX control, not a full security boundary;
3. shared Grafana provisioning causes dev/prod dashboard and permission state to coexist in one instance; and
4. SQL-backed variable queries widen the metadata exposure surface if they are not isolated per tenant space.

## Target State

1. Dev and prod monitoring are separated at the Grafana runtime level.
2. Super admins retain access to global monitoring dashboards.
3. Non-super-admin viewers only access dashboards and datasources scoped to their tenant.
4. Tenant dashboards show human-readable names while filtering by stable IDs under the hood.
5. Tenant viewers cannot bypass scoping through Grafana Explore, ad hoc queries, URL manipulation, or dashboard variable tampering.

## Recommended Architecture

### Phase 1: Environment Separation

1. Split dev and prod Grafana into separate runtime instances or fully separate org/storage boundaries.
2. Stop using one shared Grafana state store for both environments.
3. Ensure dashboard UIDs, datasource UIDs, provisioning, and permissions are environment-specific.

### Phase 2: Tenant Monitoring Boundary

1. Create tenant-specific Grafana orgs or tenant-specific Grafana instances.
2. Reserve a separate global org or breakglass Grafana surface for `SUPER_ADMIN`.
3. Map app users into the correct Grafana org/space via the existing auth proxy.

### Phase 3: Prometheus Query Enforcement

1. Introduce a tenant-enforcing Prometheus proxy for tenant dashboards.
2. For tenant viewers, inject tenant matchers server-side into PromQL before forwarding.
3. Reject attempts to remove, widen, or override tenant filters.
4. Keep an unrestricted global Prometheus datasource only for super-admin monitoring.

### Phase 4: SQL Metadata Naming Layer

1. Keep SQL metadata datasource support for human-readable names.
2. Scope SQL metadata access per tenant org/instance, not through one shared global datasource.
3. Expose `tenant`, `event`, `contest`, and `category` names as `__text` and stable IDs as `__value`.
4. Continue to drive metric filters by IDs, not names.

### Phase 5: Metric Model Expansion

1. Do not add high-cardinality dynamic labels to hot infrastructure metrics such as:
   - `http_requests_total`
   - request duration histograms
   - DB query duration histograms
   - cache hit/miss counters
2. Add event/contest/category dimensions only to business metrics where those dimensions are operationally useful and cardinality remains bounded.
3. Candidate business metrics:
   - score submission counts
   - certification backlog counts
   - governance request counts
   - publication readiness/status counts

### Phase 6: Grafana Capability Hardening

1. Restrict tenant viewers from broad query tooling where possible.
2. Review whether Grafana Explore should be disabled or withheld from tenant monitoring orgs.
3. Ensure dashboard permissions, folder permissions, and datasource permissions are explicitly reconciled after provisioning.

## Implementation Order

1. Separate dev and prod Grafana runtimes.
2. Implement tenant org/instance mapping through the auth proxy.
3. Add tenant-enforcing Prometheus proxy datasources.
4. Add tenant-scoped SQL metadata datasources.
5. Provision tenant-safe dashboards and permission reconciliation.
6. Add event/contest/category business metrics where needed.
7. Validate tenant bypass resistance before any broad rollout.

## File-Level Impact Areas

### App / Auth Proxy

1. `src/controllers/monitoringController.ts`
2. `src/routes/monitoringRoutes.ts`
3. nginx monitoring proxy config in the deployed runtime

### Grafana Provisioning

1. `grafana/provisioning/datasources/*`
2. `grafana/provisioning/dashboards/*`
3. `scripts/monitoring/*`
4. `scripts/deploy/activate-release.sh`
5. `scripts/install-monitoring-native.sh`

### Metrics / Prometheus

1. `src/services/MetricsService.ts`
2. `src/middleware/metrics.ts`
3. `src/middleware/queryMonitoring.ts`
4. `src/services/PerformanceService.ts`
5. Prometheus scrape/query proxy configuration

## Security Requirements

1. Non-super-admin viewers must not rely on hidden dashboard variables as the sole scoping control.
2. Tenant scoping must be enforced server-side for both Prometheus and SQL metadata access.
3. Viewer accounts must not retain unrestricted datasource query capability against shared datasources.
4. Dev and prod monitoring state must not be exposed to the same shared viewer audience.

## Acceptance Criteria

1. A tenant admin can open Grafana and only see their tenant's monitoring dashboards and metadata.
2. A tenant admin cannot use Grafana APIs, dashboard editing, Explore, or variable tampering to query another tenant.
3. Super admins can still view global monitoring.
4. Dev dashboards are not visible to prod tenant viewers.
5. Tenant dashboard dropdowns show human-readable names for tenant/event/contest/category selections where supported.

## Rollout Notes

1. The current shared-Grafana implementation should be treated as a transitional UX improvement only.
2. Full tenant-safe Grafana requires structural runtime and datasource changes, not just dashboard changes.
