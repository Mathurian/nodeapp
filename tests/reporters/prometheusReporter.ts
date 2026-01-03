/**
 * Prometheus Test Reporter
 * Custom Playwright reporter that sends test results to monitoring endpoints
 */

import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';

interface TestMetrics {
  suite: string;
  type: 'e2e';
  passed: number;
  failed: number;
  skipped: number;
  durationSeconds: number;
}

class PrometheusReporter implements Reporter {
  private apiBaseUrl: string;
  private startTime: number = 0;
  private suiteName: string = 'playwright-tests';
  private testResults: Map<string, 'passed' | 'failed' | 'skipped' | 'timedOut'> = new Map();

  constructor(options: { apiUrl?: string; suiteName?: string } = {}) {
    // Default to localhost:3000, can be overridden in playwright.config.ts
    this.apiBaseUrl = options.apiUrl || process.env.API_URL || 'http://localhost:3000';
    this.suiteName = options.suiteName || 'e2e-tests';
  }

  /**
   * Called once before running tests
   */
  onBegin(config: FullConfig, suite: Suite) {
    this.startTime = Date.now();
    console.log(`[Prometheus Reporter] Test run started: ${this.suiteName}`);

    // Report test start to monitoring endpoint
    this.reportTestStart()
      .catch(err => console.error('[Prometheus Reporter] Failed to report test start:', err.message));
  }

  /**
   * Called for each test result
   */
  onTestEnd(test: TestCase, result: TestResult) {
    // Track individual test results
    this.testResults.set(test.id, result.status);
  }

  /**
   * Called after all tests have finished
   */
  async onEnd(result: FullResult) {
    const durationSeconds = (Date.now() - this.startTime) / 1000;

    // Count test results
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (const status of this.testResults.values()) {
      if (status === 'passed') {
        passed++;
      } else if (status === 'failed' || status === 'timedOut') {
        failed++;
      } else if (status === 'skipped') {
        skipped++;
      }
    }

    const metrics: TestMetrics = {
      suite: this.suiteName,
      type: 'e2e',
      passed,
      failed,
      skipped,
      durationSeconds,
    };

    console.log(`[Prometheus Reporter] Test run completed:`, {
      passed,
      failed,
      skipped,
      duration: `${durationSeconds.toFixed(2)}s`,
    });

    // Report results to monitoring endpoint
    try {
      await this.reportTestResults(metrics);
      console.log('[Prometheus Reporter] Test results reported successfully');
    } catch (err: any) {
      console.error('[Prometheus Reporter] Failed to report test results:', err.message);
    }
  }

  /**
   * Report test start to monitoring API
   */
  private async reportTestStart(): Promise<void> {
    const url = `${this.apiBaseUrl}/api/monitoring/test-start`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suite: this.suiteName,
          type: 'e2e',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err: any) {
      // Don't fail tests if monitoring endpoint is unavailable
      console.warn(`[Prometheus Reporter] Could not reach monitoring endpoint: ${err.message}`);
    }
  }

  /**
   * Report test results to monitoring API
   */
  private async reportTestResults(metrics: TestMetrics): Promise<void> {
    const url = `${this.apiBaseUrl}/api/monitoring/test-results`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metrics),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
    } catch (err: any) {
      // Don't fail tests if monitoring endpoint is unavailable
      console.warn(`[Prometheus Reporter] Could not reach monitoring endpoint: ${err.message}`);
    }
  }
}

export default PrometheusReporter;
