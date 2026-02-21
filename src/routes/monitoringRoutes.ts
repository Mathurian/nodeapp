/**
 * Monitoring Routes
 * Routes for test execution and system status monitoring
 */

import { Router } from 'express';
import {
  reportTestResults,
  reportTestStart,
  updateServiceStatus,
  getSystemStatus,
  authorizeGrafanaProxy,
} from '../controllers/monitoringController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

/**
 * GET /api/monitoring/grafana/auth-proxy
 * Nginx auth_request endpoint for Grafana SSO bridge.
 */
router.get('/grafana/auth-proxy', authenticateToken, authorizeGrafanaProxy);

// Monitoring is privileged operational telemetry.
router.use(authenticateToken);
router.use(requireRole(['SUPER_ADMIN', 'ADMIN']));

/**
 * POST /api/monitoring/test-results
 * Report test execution results
 *
 * Body: {
 *   suite: string,        // Test suite name (e.g., "e2e-comprehensive")
 *   type: string,         // Test type: "unit", "integration", "e2e"
 *   passed: number,       // Number of passed tests
 *   failed: number,       // Number of failed tests
 *   skipped: number,      // Number of skipped tests
 *   durationSeconds: number  // Test duration in seconds
 * }
 */
router.post('/test-results', reportTestResults);

/**
 * POST /api/monitoring/test-start
 * Mark test run as started
 *
 * Body: {
 *   suite: string,        // Test suite name
 *   type: string          // Test type: "unit", "integration", "e2e"
 * }
 */
router.post('/test-start', reportTestStart);

/**
 * POST /api/monitoring/service-status
 * Update service status metrics
 *
 * Body: {
 *   service: string,      // Service name
 *   port?: string,        // Service port (optional)
 *   isRunning?: boolean,  // Service running status (optional)
 *   uptimeSeconds?: number,   // Service uptime in seconds (optional)
 *   memoryBytes?: number,     // Memory usage in bytes (optional)
 *   cpuPercent?: number       // CPU usage percentage (optional)
 * }
 */
router.post('/service-status', updateServiceStatus);

/**
 * GET /api/monitoring/system-status
 * Get current system status and update metrics
 *
 * Returns: {
 *   success: true,
 *   data: {
 *     timestamp: string,
 *     services: Array<{
 *       name: string,
 *       port: string | "N/A",
 *       isRunning: boolean,
 *       pid: number | null,
 *       uptimeSeconds: number,
 *       memoryMB: number,
 *       cpuPercent: number
 *     }>
 *   }
 * }
 */
router.get('/system-status', getSystemStatus);

export default router;
