import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { PerformanceService } from '../services/PerformanceService';
import { sendSuccess } from '../utils/responseHelpers';

export class PerformanceController {
  private performanceService: PerformanceService;

  constructor() {
    this.performanceService = container.resolve(PerformanceService);
  }

  /**
   * Middleware to log performance metrics
   */
  logPerformance = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    res.on('finish', async () => {
      const responseTime = Date.now() - startTime;
      const user = (req as any).user;

      await this.performanceService.logPerformance({
        endpoint: req.route?.path || req.path.split('?')[0],
        method: req.method,
        responseTime,
        statusCode: res.statusCode,
        userId: user?.id || null,
        eventId: (req.query?.['eventId'] as string) || null,
        // tenantId removed - column doesn't exist in performance_logs table
      });
    });

    next();
  };

  /**
   * Get performance statistics
   */
  getPerformanceStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { timeRange, endpoint, method } = req.query;

      const stats = await this.performanceService.getPerformanceStats({
        timeRange: timeRange as '1h' | '24h' | '7d' | '30d' | undefined,
        endpoint: endpoint as string | undefined,
        method: method as string | undefined,
      });

      return sendSuccess(res, stats);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get system metrics
   */
  getSystemMetrics = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await this.performanceService.getSystemMetrics();
      return sendSuccess(res, metrics);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get performance logs with filtering
   */
  getPerformanceLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        page,
        limit,
        endpoint,
        method,
        statusCode,
        userId,
        minResponseTime,
        maxResponseTime,
        startDate,
        endDate,
      } = req.query;

      const result = await this.performanceService.getPerformanceLogs({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        endpoint: endpoint as string | undefined,
        method: method as string | undefined,
        statusCode: statusCode ? Number(statusCode) : undefined,
        userId: userId as string | undefined,
        minResponseTime: minResponseTime ? Number(minResponseTime) : undefined,
        maxResponseTime: maxResponseTime ? Number(maxResponseTime) : undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
      });

      return sendSuccess(res, result);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Clear performance logs
   */
  clearPerformanceLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { olderThan } = req.body;
      const result = await this.performanceService.clearPerformanceLogs(olderThan);
      return sendSuccess(res, result, result.message);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Health check endpoint
   */
  getHealthCheck = async (_req: Request, res: Response, _next: NextFunction) => {
    try {
      const health = await this.performanceService.getHealthCheck();
      const statusCode = health.status === 'healthy' ? 200 : 503;
      return res.status(statusCode).json(health);
    } catch (error) {
      // Special handling for health check - return 503 with error details
      return res.status(503).json({
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      });
    }
  };
}

// Export controller instance and methods
const controller = new PerformanceController();
export const logPerformance = controller.logPerformance;
export const getPerformanceStats = controller.getPerformanceStats;
export const getSystemMetrics = controller.getSystemMetrics;
export const getPerformanceLogs = controller.getPerformanceLogs;
export const clearPerformanceLogs = controller.clearPerformanceLogs;
export const getHealthCheck = controller.getHealthCheck;
