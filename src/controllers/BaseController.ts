/**
 * Base Controller
 * P3-1: Common controller patterns and utilities
 *
 * Provides standardized CRUD operations, error handling, and response formatting
 * for all controllers to reduce code duplication.
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
    hasPrevious: boolean;
  };
}

/**
 * Base Controller Class
 * Extend this class to get common controller functionality
 */
export abstract class BaseController {
  protected logger: ReturnType<typeof createLogger>;
  protected prisma: PrismaClient;

  constructor(prisma: PrismaClient, loggerName: string) {
    this.prisma = prisma;
    this.logger = createLogger(loggerName);
  }

  /**
   * Extract pagination parameters from request
   */
  protected getPaginationParams(req: Request): PaginationParams {
    const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const limit = Math.min(
      Math.max(1, parseInt(req.query['limit'] as string) || 50),
      100
    );
    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }

  /**
   * Create paginated response
   */
  protected createPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: skip + data.length < total,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * Get tenant ID from request (with validation)
   */
  protected getTenantId(req: Request): string {
    const tenantId = req.tenantId || (req as any).tenant?.id;

    if (!tenantId) {
      throw new Error('Tenant ID not found in request');
    }

    return tenantId;
  }

  /**
   * Get user ID from request (with validation)
   */
  protected getUserId(req: Request): string {
    const userId = req.user?.id;

    if (!userId) {
      throw new Error('User ID not found in request');
    }

    return userId;
  }

  /**
   * Get required param from request
   */
  protected getRequiredParam(req: Request, paramName: string): string {
    const value = req.params[paramName];

    if (!value) {
      throw new Error(`Required parameter '${paramName}' not provided`);
    }

    return value;
  }

  /**
   * Send success response
   */
  protected sendSuccess<T>(
    res: Response,
    data: T | null,
    message?: string,
    statusCode: number = 200
  ): void {
    res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * Send error response
   */
  protected sendError(
    res: Response,
    message: string,
    statusCode: number = 400,
    errors?: any[]
  ): void {
    res.status(statusCode).json({
      success: false,
      error: message,
      errors,
    });
  }

  /**
   * Send 404 Not Found response
   */
  protected sendNotFound(res: Response, resource: string = 'Resource'): void {
    this.sendError(res, `${resource} not found`, 404);
  }

  /**
   * Send 401 Unauthorized response
   */
  protected sendUnauthorized(res: Response, message: string = 'Unauthorized'): void {
    this.sendError(res, message, 401);
  }

  /**
   * Send 403 Forbidden response
   */
  protected sendForbidden(res: Response, message: string = 'Forbidden'): void {
    this.sendError(res, message, 403);
  }

  /**
   * Standard error handler
   */
  protected handleError(error: unknown, res: Response, context?: string): void {
    this.logger.error('Controller error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context,
    });

    if (error instanceof Error) {
      // Check for known error types
      if (error.message.includes('not found')) {
        this.sendNotFound(res);
        return;
      }

      if (error.message.includes('Unauthorized') || error.message.includes('not authenticated')) {
        this.sendUnauthorized(res);
        return;
      }

      if (error.message.includes('Forbidden') || error.message.includes('permission')) {
        this.sendForbidden(res);
        return;
      }

      // Generic error response
      this.sendError(res, error.message, 500);
    } else {
      this.sendError(res, 'Internal server error', 500);
    }
  }

  /**
   * Async request handler wrapper (catches errors automatically)
   */
  protected asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
  ) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Validate required fields in request body
   */
  protected validateRequiredFields(data: any, requiredFields: string[]): void {
    const missingFields = requiredFields.filter(field => !data[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Build tenant-aware where clause
   */
  protected buildTenantWhereClause(req: Request, additionalWhere: any = {}): any {
    return {
      ...additionalWhere,
      tenantId: this.getTenantId(req),
    };
  }

  /**
   * Check if resource belongs to tenant
   */
  protected async verifyTenantOwnership(
    modelName: string,
    resourceId: string,
    tenantId: string
  ): Promise<boolean> {
    const model = (this.prisma as any)[modelName];

    if (!model) {
      throw new Error(`Model '${modelName}' not found`);
    }

    const resource = await model.findUnique({
      where: { id: resourceId },
      select: { tenantId: true },
    });

    return resource?.tenantId === tenantId;
  }
}

export default BaseController;
