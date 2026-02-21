/**
 * Monitoring Controller
 * Handles test results and system status updates for Prometheus metrics
 */

import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { MetricsService } from '../services/MetricsService';
import { createLogger } from '../utils/logger';
import { sendSuccess, sendBadRequest } from '../utils/responseHelpers';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const logger = createLogger('MonitoringController');
const SAFE_SUITE_PATTERN = /^(unit|integration|e2e)([._:-][a-zA-Z0-9._:-]{1,40})?$/;
const GRAFANA_ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']);
const GRAFANA_ROLE_MAP: Record<string, 'Admin' | 'Viewer'> = {
  SUPER_ADMIN: 'Admin',
  ADMIN: 'Viewer',
  ORGANIZER: 'Viewer',
};
const ALLOWED_SERVICE_LABELS = new Set([
  'backend-production',
  'grafana',
  'frontend-dev',
  'prometheus',
  'nginx',
  'postgresql',
  'redis',
  'redis-server',
]);

const normalizeLabel = (value: unknown): string => String(value ?? '').trim();
const toSafeHeaderValue = (value: unknown): string =>
  String(value ?? '').replace(/[\r\n]/g, '').trim();

export class MonitoringController {
  private metricsService: MetricsService;

  constructor() {
    this.metricsService = container.resolve(MetricsService);
  }

  /**
   * POST /api/monitoring/test-results
   * Report test execution results
   */
  reportTestResults = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { suite, type, passed, failed, skipped, durationSeconds } = req.body;

      // Validate required fields
      if (!suite || !type || passed === undefined || failed === undefined || skipped === undefined || durationSeconds === undefined) {
        return sendBadRequest(res, 'Missing required fields: suite, type, passed, failed, skipped, durationSeconds');
      }

      // Validate type
      if (!['unit', 'integration', 'e2e'].includes(type)) {
        return sendBadRequest(res, 'Invalid type. Must be one of: unit, integration, e2e');
      }

      const suiteName = normalizeLabel(suite);
      if (!SAFE_SUITE_PATTERN.test(suiteName)) {
        return sendBadRequest(res, 'Invalid suite label format. Use unit/integration/e2e[.name]');
      }

      // Record test results
      this.metricsService.recordTestResults(
        suiteName,
        type as 'unit' | 'integration' | 'e2e',
        parseInt(passed),
        parseInt(failed),
        parseInt(skipped),
        parseFloat(durationSeconds)
      );

      logger.info(`Test results reported: ${suiteName} (${type}) - ${passed}/${failed}/${skipped}`);

      return sendSuccess(res, { message: 'Test results recorded successfully' });
    } catch (error) {
      logger.error('Error reporting test results:', error);
      return res.status(500).json({ success: false, message: 'Failed to record test results' });
    }
  };

  /**
   * POST /api/monitoring/test-start
   * Mark test run as started
   */
  reportTestStart = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { suite, type } = req.body;

      if (!suite || !type) {
        return sendBadRequest(res, 'Missing required fields: suite, type');
      }

      if (!['unit', 'integration', 'e2e'].includes(type)) {
        return sendBadRequest(res, 'Invalid type. Must be one of: unit, integration, e2e');
      }

      const suiteName = normalizeLabel(suite);
      if (!SAFE_SUITE_PATTERN.test(suiteName)) {
        return sendBadRequest(res, 'Invalid suite label format. Use unit/integration/e2e[.name]');
      }

      this.metricsService.recordTestRunStart(suiteName, type as 'unit' | 'integration' | 'e2e');

      return sendSuccess(res, { message: 'Test run started' });
    } catch (error) {
      logger.error('Error reporting test start:', error);
      return res.status(500).json({ success: false, message: 'Failed to record test start' });
    }
  };

  /**
   * POST /api/monitoring/service-status
   * Update service status metrics
   */
  updateServiceStatus = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { service, port, isRunning, uptimeSeconds, memoryBytes, cpuPercent } = req.body;

      if (!service) {
        return sendBadRequest(res, 'Missing required field: service');
      }

      const serviceLabel = normalizeLabel(service);
      if (!ALLOWED_SERVICE_LABELS.has(serviceLabel)) {
        return sendBadRequest(res, `Service '${serviceLabel}' is not allowlisted for monitoring updates`);
      }

      const normalizedPort = port !== undefined ? String(port) : undefined;
      if (normalizedPort && !/^[0-9]{1,5}$/.test(normalizedPort)) {
        return sendBadRequest(res, 'Invalid port format');
      }

      this.metricsService.updateServiceMetrics(serviceLabel, {
        port: normalizedPort,
        isRunning: isRunning !== undefined ? Boolean(isRunning) : undefined,
        uptimeSeconds: uptimeSeconds !== undefined ? parseFloat(uptimeSeconds) : undefined,
        memoryBytes: memoryBytes !== undefined ? parseFloat(memoryBytes) : undefined,
        cpuPercent: cpuPercent !== undefined ? parseFloat(cpuPercent) : undefined,
      });

      logger.debug(`Service status updated: ${serviceLabel}`);

      return sendSuccess(res, { message: 'Service status updated successfully' });
    } catch (error) {
      logger.error('Error updating service status:', error);
      return res.status(500).json({ success: false, message: 'Failed to update service status' });
    }
  };

  /**
   * GET /api/monitoring/system-status
   * Get current system status and update metrics
   */
  getSystemStatus = async (_req: Request, res: Response): Promise<Response> => {
    try {
      const status = await this.collectSystemStatus();

      // Update metrics
      for (const service of status.services) {
        this.metricsService.updateServiceMetrics(service.name, {
          port: service.port,
          isRunning: service.isRunning,
          uptimeSeconds: service.uptimeSeconds,
          memoryBytes: service.memoryMB ? service.memoryMB * 1024 * 1024 : undefined,
          cpuPercent: service.cpuPercent,
        });
      }

      return sendSuccess(res, status);
    } catch (error) {
      logger.error('Error getting system status:', error);
      return res.status(500).json({ success: false, message: 'Failed to get system status' });
    }
  };

  /**
   * GET /api/monitoring/grafana/auth-proxy
   * Validate app session for Grafana auth.proxy and return identity headers.
   */
  authorizeGrafanaProxy = async (req: Request, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).send('Unauthorized');
      }

      const appRole = normalizeLabel(req.user.role).toUpperCase();
      if (!GRAFANA_ALLOWED_ROLES.has(appRole)) {
        logger.warn('Grafana auth proxy denied: role not permitted', {
          userId: req.user.id,
          role: req.user.role,
          tenantId: req.user.tenantId,
        });
        return res.status(403).send('Forbidden');
      }

      const grafanaUser = toSafeHeaderValue(req.user.email || req.user.id);
      if (!grafanaUser) {
        logger.warn('Grafana auth proxy denied: missing username source', {
          userId: req.user.id,
          role: req.user.role,
        });
        return res.status(403).send('Forbidden');
      }

      const grafanaEmail = toSafeHeaderValue(req.user.email);
      const grafanaName = toSafeHeaderValue(req.user.preferredName || req.user.name || req.user.email || grafanaUser);
      const grafanaRole = GRAFANA_ROLE_MAP[appRole] || 'Viewer';

      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Grafana-User', grafanaUser);
      res.setHeader('X-Grafana-Email', grafanaEmail);
      res.setHeader('X-Grafana-Name', grafanaName);
      res.setHeader('X-Grafana-Role', grafanaRole);
      res.setHeader('X-Grafana-Tenant-Id', toSafeHeaderValue(req.user.tenantId || req.tenantId || ''));
      res.setHeader('X-Grafana-Tenant-Slug', toSafeHeaderValue(req.tenant?.slug || ''));

      return res.status(204).send();
    } catch (error) {
      logger.error('Error during Grafana auth proxy validation:', error);
      return res.status(500).send('Internal Server Error');
    }
  };

  /**
   * Collect current system status (similar to status.sh)
   */
  private async collectSystemStatus(): Promise<any> {
    const services = [];

    // Check production backend (port 3000)
    services.push(await this.checkService('backend-production', '3000'));

    // Check development backend (port 3001)
    services.push(await this.checkService('grafana', '3001'));

    // Check development frontend (port 3002)
    services.push(await this.checkService('frontend-dev', '3002'));

    // Check Prometheus (port 9090)
    services.push(await this.checkService('prometheus', '9090'));

    // Check nginx
    services.push(await this.checkSystemdService('nginx'));

    // Check PostgreSQL
    services.push(await this.checkSystemdService('postgresql'));

    // Check Redis
    services.push(await this.checkSystemdService('redis-server', 'redis'));

    return {
      timestamp: new Date().toISOString(),
      services: services.filter(s => s !== null),
    };
  }

  /**
   * Check if service is running on specific port
   */
  private async checkService(name: string, port: string): Promise<any> {
    try {
      // Check if port is listening
      const { stdout } = await execAsync(`lsof -ti :${port} 2>/dev/null || echo ""`);
      const pid = stdout.trim();

      if (!pid) {
        return {
          name,
          port,
          isRunning: false,
          pid: null,
          uptimeSeconds: 0,
          memoryMB: 0,
          cpuPercent: 0,
        };
      }

      // Get process details
      const { stdout: psOutput } = await execAsync(`ps -p ${pid} -o etime=,rss=,%cpu= 2>/dev/null || echo ""`);
      const [uptime, rss, cpu] = psOutput.trim().split(/\s+/);

      return {
        name,
        port,
        isRunning: true,
        pid: parseInt(pid),
        uptimeSeconds: this.parseUptime(uptime || ''),
        memoryMB: rss ? parseFloat(rss) / 1024 : 0,
        cpuPercent: cpu ? parseFloat(cpu) : 0,
      };
    } catch (error) {
      logger.debug(`Error checking service ${name}:`, error);
      return {
        name,
        port,
        isRunning: false,
        pid: null,
        uptimeSeconds: 0,
        memoryMB: 0,
        cpuPercent: 0,
      };
    }
  }

  /**
   * Check systemd service status
   */
  private async checkSystemdService(service: string, altService?: string): Promise<any> {
    try {
      const serviceName = altService || service;
      const { stdout } = await execAsync(`systemctl is-active ${service} 2>/dev/null || echo "inactive"`);
      const isActive = stdout.trim() === 'active';

      return {
        name: serviceName,
        port: 'N/A',
        isRunning: isActive,
        pid: null,
        uptimeSeconds: 0,
        memoryMB: 0,
        cpuPercent: 0,
      };
    } catch (error) {
      logger.debug(`Error checking systemd service ${service}:`, error);
      return {
        name: service,
        port: 'N/A',
        isRunning: false,
        pid: null,
        uptimeSeconds: 0,
        memoryMB: 0,
        cpuPercent: 0,
      };
    }
  }

  /**
   * Parse uptime string (format: [[DD-]hh:]mm:ss) to seconds
   */
  private parseUptime(uptime: string): number {
    if (!uptime) return 0;

    try {
      const parts = uptime.split('-');
      let days = 0;
      let time = uptime;

      if (parts.length === 2 && parts[0] && parts[1]) {
        days = parseInt(parts[0]);
        time = parts[1];
      }

      const timeParts = time.split(':');
      let seconds = 0;

      if (timeParts.length === 3 && timeParts[0] && timeParts[1] && timeParts[2]) {
        seconds = parseInt(timeParts[0]) * 3600 + parseInt(timeParts[1]) * 60 + parseInt(timeParts[2]);
      } else if (timeParts.length === 2 && timeParts[0] && timeParts[1]) {
        seconds = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
      }

      return days * 86400 + seconds;
    } catch (error) {
      return 0;
    }
  }
}

// Create instance
const controller = new MonitoringController();

// Export individual functions for routes
export const reportTestResults = controller.reportTestResults;
export const reportTestStart = controller.reportTestStart;
export const updateServiceStatus = controller.updateServiceStatus;
export const getSystemStatus = controller.getSystemStatus;
export const authorizeGrafanaProxy = controller.authorizeGrafanaProxy;
