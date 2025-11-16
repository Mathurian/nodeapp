/**
 * Load Testing Script using k6
 * Run with: k6 run tests/load/load-test.js
 * 
 * Install k6: https://k6.io/docs/getting-started/installation/
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 users
    { duration: '1m', target: 50 },      // Ramp up to 50 users
    { duration: '2m', target: 100 },    // Ramp up to 100 users
    { duration: '2m', target: 100 },    // Stay at 100 users
    { duration: '1m', target: 50 },      // Ramp down to 50 users
    { duration: '30s', target: 0 },     // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],     // Error rate should be less than 1%
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test scenarios
export default function () {
  // Scenario 1: Health check
  let response = http.get(`${BASE_URL}/api/health`);
  check(response, {
    'health check status is 200': (r) => r.status === 200,
  });
  errorRate.add(response.status !== 200);
  requestDuration.add(response.timings.duration);
  sleep(1);

  // Scenario 2: Public endpoints
  response = http.get(`${BASE_URL}/api/events`);
  check(response, {
    'events endpoint status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });
  errorRate.add(response.status >= 400 && response.status !== 401);
  requestDuration.add(response.timings.duration);
  sleep(1);

  // Scenario 3: Authentication endpoint
  const loginPayload = JSON.stringify({
    email: 'test@example.com',
    password: 'testpassword',
  });
  const params = {
    headers: { 'Content-Type': 'application/json' },
  };
  response = http.post(`${BASE_URL}/api/auth/login`, loginPayload, params);
  check(response, {
    'login endpoint responds': (r) => r.status === 200 || r.status === 401 || r.status === 400,
  });
  errorRate.add(response.status >= 500);
  requestDuration.add(response.timings.duration);
  sleep(2);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'tests/load/results/summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;
  
  let summary = '\n';
  summary += `${indent}Test Summary\n`;
  summary += `${indent}============\n\n`;
  summary += `${indent}Duration: ${data.state.testRunDurationMs / 1000}s\n`;
  summary += `${indent}VUs: ${data.metrics.vus.values.count}\n`;
  summary += `${indent}Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}Errors: ${data.metrics.http_req_failed.values.rate * 100}%\n`;
  summary += `${indent}Avg Duration: ${data.metrics.http_req_duration.values.avg}ms\n`;
  summary += `${indent}P95 Duration: ${data.metrics.http_req_duration.values['p(95)']}ms\n`;
  
  return summary;
}

