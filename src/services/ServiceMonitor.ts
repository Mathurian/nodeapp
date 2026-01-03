/**
 * Service Monitor
 * Periodically updates service status and health metrics
 */

import { injectable, inject } from 'tsyringe';
import { MetricsService } from './MetricsService';
import { createLogger } from '../utils/logger';
import { env } from '../config/env';

@injectable()
export class ServiceMonitor {
  private log = createLogger('service-monitor');
  private monitorInterval: NodeJS.Timeout | null = null;
  private startTime: number = Date.now();

  constructor(
    @inject(MetricsService) private metricsService: MetricsService
  ) {}

  /**
   * Start monitoring service metrics
   */
  start(intervalMs: number = 15000): void {
    if (this.monitorInterval) {
      this.log.warn('Service monitor already running');
      return;
    }

    this.log.info(`Starting service monitor (interval: ${intervalMs}ms)`);

    // Update immediately on start
    this.updateMetrics();

    // Then update at intervals
    this.monitorInterval = setInterval(() => {
      this.updateMetrics();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      this.log.info('Service monitor stopped');
    }
  }

  /**
   * Update all service metrics
   */
  private updateMetrics(): void {
    const port = env.get('PORT').toString();
    const serviceName = 'event-manager-api';

    // Service status (always up if this code is running)
    this.metricsService.updateServiceStatus(serviceName, port, true);

    // Uptime in seconds
    const uptimeSeconds = (Date.now() - this.startTime) / 1000;
    this.metricsService.updateServiceUptime(serviceName, uptimeSeconds);

    // Memory usage
    const memUsage = process.memoryUsage();
    this.metricsService.updateServiceMemory(serviceName, memUsage.heapUsed);

    // CPU usage (estimated from process.cpuUsage())
    const cpuUsage = process.cpuUsage();
    const totalCpuMicroseconds = cpuUsage.user + cpuUsage.system;
    const totalCpuSeconds = totalCpuMicroseconds / 1_000_000;
    const cpuPercent = (totalCpuSeconds / uptimeSeconds) * 100;

    this.metricsService.updateServiceCpu(serviceName, cpuPercent);

    this.log.debug(`Service metrics updated: uptime=${uptimeSeconds.toFixed(0)}s, memory=${(memUsage.heapUsed / 1024 / 1024).toFixed(0)}MB, cpu=${cpuPercent.toFixed(1)}%`);
  }
}

export default ServiceMonitor;
