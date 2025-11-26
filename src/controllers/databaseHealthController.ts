/**
 * Database Health Controller
 * P2-4: Exposes database health monitoring endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { DatabaseHealthService } from '../services/DatabaseHealthService';

export class DatabaseHealthController {
  private healthService: DatabaseHealthService;

  constructor() {
    this.healthService = container.resolve(DatabaseHealthService);
  }

  /**
   * Get database health status
   * GET /api/v1/health/database
   */
  getHealthStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const health = await this.healthService.getHealthStatus();

      // Set HTTP status based on health
      let statusCode = 200;
      if (health.status === 'degraded') {
        statusCode = 200; // Still operational
      } else if (health.status === 'unhealthy') {
        statusCode = 503; // Service unavailable
      }

      res.status(statusCode).json(health);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get detailed database metrics
   * GET /api/v1/health/database/metrics
   */
  getDetailedMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const metrics = await this.healthService.getDetailedMetrics();
      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  };
}

// Create and export controller instance
const controller = new DatabaseHealthController();
export const getHealthStatus = controller.getHealthStatus;
export const getDetailedMetrics = controller.getDetailedMetrics;
