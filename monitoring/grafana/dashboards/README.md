# Event Manager Grafana Dashboards

This directory contains Grafana dashboard configurations for monitoring Event Manager application performance, test execution, and system health.

## Available Dashboards

### Event Manager - Test & System Monitoring (`event-manager-monitoring.json`)

Comprehensive dashboard that provides visibility into:

**Test Execution Metrics:**
- Test results over time (passed/failed/skipped)
- Current test suite status (idle/running/passed/failed)
- Test duration trends (p50 and p95 percentiles)
- Total test counts by suite

**System Status Metrics:**
- Service health status (up/down)
- Memory usage per service
- CPU usage per service
- Service uptime

## Importing Dashboards

### Method 1: Via Grafana UI

1. **Access Grafana**:
   - Production: http://conmgr.com/monitoring/grafana/
   - Development: http://localhost:3001
   - Default credentials: admin/admin (change immediately!)

2. **Import Dashboard**:
   - Click the "+" icon in the left sidebar
   - Select "Import"
   - Click "Upload JSON file"
   - Select `event-manager-monitoring.json`
   - Click "Load"
   - Select "Prometheus" as the data source
   - Click "Import"

### Method 2: Via Grafana API

```bash
# Set your Grafana credentials
GRAFANA_URL="http://localhost:3001"
GRAFANA_USER="admin"
GRAFANA_PASS="admin"

# Import dashboard
curl -X POST \
  -H "Content-Type: application/json" \
  -u "${GRAFANA_USER}:${GRAFANA_PASS}" \
  "${GRAFANA_URL}/api/dashboards/db" \
  -d @event-manager-monitoring.json
```

### Method 3: Auto-provisioning (Recommended for Production)

1. **Copy dashboard to Grafana provisioning directory**:
```bash
sudo cp event-manager-monitoring.json /etc/grafana/provisioning/dashboards/
sudo chown grafana:grafana /etc/grafana/provisioning/dashboards/event-manager-monitoring.json
```

2. **Create provisioning configuration** (`/etc/grafana/provisioning/dashboards/event-manager.yaml`):
```yaml
apiVersion: 1

providers:
  - name: 'Event Manager'
    orgId: 1
    folder: 'Event Manager'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
      foldersFromFilesStructure: false
```

3. **Restart Grafana**:
```bash
sudo systemctl restart grafana-server
```

## Dashboard Panels Explained

### 1. Test Results Over Time
**Metrics**: `test_pass_total`, `test_fail_total`, `test_skip_total`
- Shows rate of test results over 5-minute intervals
- Green line = passing tests
- Red line = failing tests
- Yellow line = skipped tests

### 2. Test Suite Status
**Metric**: `test_suite_status`
- Gauge showing current status of each test suite
- **0 (Blue)** = Idle - no tests running
- **1 (Yellow)** = Running - tests in progress
- **2 (Green)** = Passed - last run succeeded
- **3 (Red)** = Failed - last run had failures

### 3. Test Duration
**Metric**: `test_duration_seconds`
- Shows p50 (median) and p95 (95th percentile) test duration
- Helps identify performance regressions in tests
- Lower is better

### 4. Service Status
**Metric**: `service_status`
- Gauge showing health of each service
- **0 (Red)** = Down - service not running
- **1 (Green)** = Up - service healthy

### 5. Service Memory Usage
**Metric**: `service_memory_usage_bytes`
- Memory consumption per service in MB
- Shows mean and max values
- Monitor for memory leaks

### 6. Service CPU Usage
**Metric**: `service_cpu_usage_percent`
- CPU utilization per service
- Shows mean and max values
- Monitor for performance issues

### 7. Service Uptime
**Metric**: `service_uptime_seconds`
- How long each service has been running
- Helps track service stability

### 8. Total Test Counts
**Metrics**: `test_pass_total`, `test_fail_total`, `test_skip_total`
- Bar chart showing cumulative test counts
- Useful for understanding test suite size

## Configuring Prometheus Data Source

If Prometheus is not already configured in Grafana:

1. **Access Grafana** → Configuration → Data Sources
2. **Add data source** → Prometheus
3. **Configure**:
   - Name: `Prometheus`
   - URL: `http://localhost:9090` (or your Prometheus URL)
   - Access: `Server (default)`
4. **Save & Test**

## Monitoring Endpoints

The dashboard displays metrics from these endpoints:

### Test Reporting Endpoints
- `POST /api/monitoring/test-start` - Report test run started
- `POST /api/monitoring/test-results` - Report test results

### System Status Endpoints
- `POST /api/monitoring/service-status` - Update service metrics
- `GET /api/monitoring/system-status` - Get current system status

### Metrics Endpoint
- `GET /metrics` - Prometheus metrics endpoint (scraped automatically)

## How Test Metrics Are Collected

### Automatic Collection via Playwright

The Event Manager test suite automatically reports metrics to Prometheus:

1. **Test Start**: When tests begin, the custom Playwright reporter calls `/api/monitoring/test-start`
2. **Test Execution**: Each test result is tracked
3. **Test End**: When tests complete, results are reported to `/api/monitoring/test-results`
4. **Prometheus Scrapes**: Prometheus scrapes `/metrics` endpoint every 15 seconds
5. **Grafana Displays**: Grafana queries Prometheus and displays the data

### Manual Collection

You can also manually report test results:

```bash
# Report test start
curl -X POST http://localhost:3000/api/monitoring/test-start \
  -H "Content-Type: application/json" \
  -d '{
    "suite": "custom-tests",
    "type": "integration"
  }'

# Report test results
curl -X POST http://localhost:3000/api/monitoring/test-results \
  -H "Content-Type: application/json" \
  -d '{
    "suite": "custom-tests",
    "type": "integration",
    "passed": 45,
    "failed": 2,
    "skipped": 1,
    "durationSeconds": 120.5
  }'
```

## How System Metrics Are Collected

System metrics are collected in two ways:

### 1. Automatic Collection
The monitoring controller automatically collects system status when you access:
```bash
curl http://localhost:3000/api/monitoring/system-status
```

This checks:
- Backend service (port 3000)
- Grafana (port 3001)
- Frontend dev server (port 3002)
- Prometheus (port 9090)
- Nginx (systemd)
- PostgreSQL (systemd)
- Redis (systemd)

### 2. Manual Updates
Services can report their own metrics:
```bash
curl -X POST http://localhost:3000/api/monitoring/service-status \
  -H "Content-Type: application/json" \
  -d '{
    "service": "custom-service",
    "port": "8080",
    "isRunning": true,
    "uptimeSeconds": 3600,
    "memoryBytes": 524288000,
    "cpuPercent": 15.5
  }'
```

## Alerting (Optional)

You can configure alerts in Grafana for critical conditions:

### Example: Alert on Test Failures
1. Edit "Test Results Over Time" panel
2. Click "Alert" tab
3. Create alert rule:
   - **Condition**: `WHEN max() OF query(B, 5m, now) IS ABOVE 0`
   - **Meaning**: Alert if any tests failed in last 5 minutes

### Example: Alert on Service Down
1. Edit "Service Status" panel
2. Create alert rule:
   - **Condition**: `WHEN min() OF query(A, 1m, now) IS BELOW 1`
   - **Meaning**: Alert if any service goes down

## Troubleshooting

### Dashboard shows "No Data"

**Cause**: Prometheus not collecting metrics

**Fix**:
1. Verify Prometheus is running: `curl http://localhost:9090/-/healthy`
2. Check Prometheus targets: http://localhost:9090/targets
3. Verify metrics endpoint: `curl http://localhost:3000/metrics`
4. Check Prometheus scrape config in `/etc/prometheus/prometheus.yml`

### Metrics not updating

**Cause**: Tests not reporting to monitoring endpoints

**Fix**:
1. Verify backend is running: `curl http://localhost:3000/health`
2. Check that Playwright reporter is configured in `playwright.config.ts`
3. Look for reporter logs in test output: `[Prometheus Reporter]`
4. Test endpoints manually:
   ```bash
   curl -X POST http://localhost:3000/api/monitoring/test-start \
     -H "Content-Type: application/json" \
     -d '{"suite":"test","type":"e2e"}'
   ```

### Dashboard Import Fails

**Cause**: Prometheus data source not configured

**Fix**:
1. Go to Configuration → Data Sources
2. Add Prometheus data source
3. Set URL to `http://localhost:9090`
4. Save & Test
5. Re-import dashboard

## Dashboard Customization

You can customize the dashboard:

1. **Time Range**: Change in top-right (default: last 6 hours)
2. **Refresh Rate**: Currently set to 5 seconds
3. **Add Panels**: Click "Add panel" to add custom visualizations
4. **Edit Queries**: Click panel title → Edit to modify Prometheus queries
5. **Save Changes**: Click save icon in top-right

## Best Practices

1. **Regular Monitoring**: Check dashboard daily for trends
2. **Set Alerts**: Configure alerts for critical metrics
3. **Historical Analysis**: Use time range selector to analyze past issues
4. **Export Data**: Use Grafana's export features for reports
5. **Dashboard Backup**: Regularly export dashboard JSON for backup

## Additional Resources

- [Grafana Documentation](https://grafana.com/docs/grafana/latest/)
- [Prometheus Query Language](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Event Manager Admin Guide](../../../docs/13-ADMIN-GUIDE.md)
- [Monitoring Controller Source](../../../src/controllers/monitoringController.ts)
- [MetricsService Source](../../../src/services/MetricsService.ts)

---

**Created**: December 2024
**Maintained by**: Event Manager Team
**Dashboard Version**: 1.0
