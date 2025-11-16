# Load Testing with k6

This directory contains load testing scripts for the Event Manager application.

## Prerequisites

Install k6:
```bash
# macOS
brew install k6

# Linux
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

## Running Load Tests

### Basic Load Test
```bash
k6 run tests/load/load-test.js
```

### Custom Base URL
```bash
BASE_URL=http://localhost:3000 k6 run tests/load/load-test.js
```

### Production Load Test
```bash
BASE_URL=https://your-production-url.com k6 run tests/load/load-test.js
```

## Test Scenarios

The load test includes:
1. **Health Check**: Tests the `/api/health` endpoint
2. **Public Endpoints**: Tests public API endpoints like `/api/events`
3. **Authentication**: Tests login endpoint with various credentials

## Test Stages

The load test uses a staged approach:
- Ramp up to 20 users over 30 seconds
- Ramp up to 50 users over 1 minute
- Ramp up to 100 users over 2 minutes
- Maintain 100 users for 2 minutes
- Ramp down to 50 users over 1 minute
- Ramp down to 0 users over 30 seconds

## Thresholds

- 95% of requests should complete in under 500ms
- Error rate should be less than 1%
- All custom error metrics should be below 1%

## Results

Test results are saved to:
- Console output (summary)
- `tests/load/results/summary.json` (detailed JSON)

## Monitoring During Tests

While running load tests, monitor:
- Application logs
- Prometheus metrics at `/metrics`
- Grafana dashboards (if configured)
- Database performance
- Redis performance (if enabled)

