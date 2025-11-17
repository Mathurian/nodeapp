/**
 * k6 Smoke Test
 *
 * Purpose: Verify the system works under minimal load
 * VUs: 1-5
 * Duration: 1-5 minutes
 * Run: Before every deployment
 *
 * Usage:
 * k6 run tests/load/smoke-test.js
 * k6 run -e BASE_URL=https://api.example.com tests/load/smoke-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  vus: 2,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],     // Error rate under 1%
    errors: ['rate<0.01'],
  },
};

// Base URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!'
};

export default function () {
  // 1. Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // 2. Login
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(TEST_USER), {
    headers: { 'Content-Type': 'application/json' },
  });

  const loginSuccess = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login returns token': (r) => r.json('data.token') !== undefined,
  });

  if (!loginSuccess) {
    errorRate.add(1);
    return;
  }

  const token = loginRes.json('data.token');

  sleep(1);

  // 3. Get profile
  const profileRes = http.get(`${BASE_URL}/api/auth/profile`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  check(profileRes, {
    'profile status is 200': (r) => r.status === 200,
    'profile has user data': (r) => r.json('data.id') !== undefined,
  }) || errorRate.add(1);

  sleep(1);

  // 4. Get events
  const eventsRes = http.get(`${BASE_URL}/api/events`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  check(eventsRes, {
    'events status is 200': (r) => r.status === 200,
    'events returns array': (r) => Array.isArray(r.json('data')),
  }) || errorRate.add(1);

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options?.indent || '';
  const colors = options?.enableColors || false;

  let summary = '\n';
  summary += `${indent}✓ Smoke Test Results\n`;
  summary += `${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  summary += `${indent}VUs: ${data.metrics.vus.values.max}\n`;
  summary += `${indent}Duration: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s\n`;
  summary += `${indent}Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}Errors: ${data.metrics.errors.values.rate.toFixed(2)}%\n`;
  summary += `${indent}Avg Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}P95 Response Time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;

  const passed = data.metrics.errors.values.rate < 0.01;
  summary += `${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  summary += `${indent}Status: ${passed ? '✓ PASSED' : '✗ FAILED'}\n\n`;

  return summary;
}
