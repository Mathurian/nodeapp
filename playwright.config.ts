import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 * 
 * Remote Testing Configuration:
 * - Set SKIP_WEB_SERVER=true to skip starting servers (use existing servers)
 * - Set BACKEND_URL to point to remote backend (default: http://localhost:3000)
 * - Set FRONTEND_URL to point to remote frontend (default: http://localhost:5173)
 * 
 * Example for remote testing:
 *   BACKEND_URL=http://192.168.1.100:3000 FRONTEND_URL=http://192.168.1.100:5173 SKIP_WEB_SERVER=true npm run test:e2e
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 6,
  /* Global timeout for entire test run (30 minutes) */
  globalTimeout: 30 * 60 * 1000,
  /* Timeout for each test (2 minutes) */
  timeout: 2 * 60 * 1000,
  /* Expect timeout (10 seconds) */
  expect: {
    timeout: 10 * 1000,
  },
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  /* Use multiple reporters: terminal output + HTML report + Prometheus metrics */
  reporter: process.env.CI
    ? [['list'], ['html'], ['./tests/reporters/prometheusReporter.ts', { suiteName: 'e2e-ci' }]]
    : process.env.REPORTER === 'verbose'
      ? [['list'], ['html'], ['./tests/reporters/prometheusReporter.ts', { suiteName: 'e2e-verbose' }]]
      : process.env.REPORTER === 'dot'
        ? [['dot'], ['html'], ['./tests/reporters/prometheusReporter.ts', { suiteName: 'e2e-dot' }]]
        : [['list'], ['html'], ['./tests/reporters/prometheusReporter.ts', { suiteName: 'e2e-local' }]], // Default: list + html + prometheus
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    /* Defaults to localhost:5173 for dev, but should be set via FRONTEND_URL env var */
    /* For production (Nginx on port 80): Use http://192.168.80.246 or http://conmgr.com */
    /* For dev server: Use http://192.168.80.246:5173 */
    /* When SKIP_WEB_SERVER=true, use the production frontend port (3002) */
    baseURL: process.env.SKIP_WEB_SERVER === 'true'
      ? (process.env.FRONTEND_URL || 'http://localhost:3002')
      : 'http://localhost:5173',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  /* Set SKIP_WEB_SERVER=true to skip starting servers (for remote testing) */
  webServer: process.env.SKIP_WEB_SERVER === 'true' ? [] : [
    {
      command: 'NODE_ENV=test PORT=3005 DATABASE_URL="postgresql://event_manager:dittibop@localhost:5432/event_manager_test?schema=public" JWT_SECRET=test-jwt-secret-key-for-testing node dist/server.js',
      url: 'http://localhost:3005/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: 'cd frontend && VITE_API_URL=http://localhost:3005/api/v1 npm run dev -- --port 5173',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});

