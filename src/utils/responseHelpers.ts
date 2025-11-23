/**
 * API Response Helpers
 * Standardized response builders for consistent API responses
 */

import { Response } from 'express';
import {
  SuccessResponse,
  ErrorResponse,
  PaginatedResponse,
  PaginationMeta,
  ValidationError
} from '../types/api/responses.types';
import { env } from '../config/env';

/**
 * Send a success response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200
): Response<SuccessResponse<T>> {
  const response: SuccessResponse<T> = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };

  return res.status(statusCode).json(response);
}

/**
 * Alias for sendSuccess (for backward compatibility)
 */
export const successResponse = sendSuccess;

/**
 * Send a created response (201)
 */
export function sendCreated<T>(
  res: Response,
  data: T,
  message: string = 'Resource created successfully'
): Response<SuccessResponse<T>> {
  return sendSuccess(res, data, message, 201);
}

/**
 * Send a no content response (204)
 */
export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

/**
 * Send an error response
 */
export function sendError(
  res: Response,
  message: string,
  statusCode: number = 500,
  errors?: ValidationError[] | Record<string, unknown>,
  stack?: string
): Response<ErrorResponse> {
  const response: ErrorResponse = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (errors) {
    response.errors = errors;
  }

  // Only include stack trace in development
  if (stack && !env.isProduction()) {
    response.stack = stack;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send a bad request error (400)
 */
export function sendBadRequest(
  res: Response,
  message: string = 'Bad request',
  errors?: ValidationError[]
): Response<ErrorResponse> {
  return sendError(res, message, 400, errors);
}

/**
 * Send an unauthorized error (401)
 */
export function sendUnauthorized(
  res: Response,
  message: string = 'Unauthorized'
): Response<ErrorResponse> {
  return sendError(res, message, 401);
}

/**
 * Send a forbidden error (403)
 */
export function sendForbidden(
  res: Response,
  message: string = 'Forbidden'
): Response<ErrorResponse> {
  return sendError(res, message, 403);
}

/**
 * Send a not found error (404)
 */
export function sendNotFound(
  res: Response,
  message: string = 'Resource not found'
): Response<ErrorResponse> {
  return sendError(res, message, 404);
}

/**
 * Send a conflict error (409)
 */
export function sendConflict(
  res: Response,
  message: string = 'Resource conflict'
): Response<ErrorResponse> {
  return sendError(res, message, 409);
}

/**
 * Send a validation error (422)
 */
export function sendValidationError(
  res: Response,
  errors: ValidationError[],
  message: string = 'Validation failed'
): Response<ErrorResponse> {
  return sendError(res, message, 422, errors);
}

/**
 * Send an internal server error (500)
 */
export function sendInternalError(
  res: Response,
  message: string = 'Internal server error',
  error?: Error
): Response<ErrorResponse> {
  return sendError(res, message, 500, undefined, error?.stack);
}

/**
 * Send a paginated response
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  message: string = 'Success'
): Response<PaginatedResponse<T>> {
  const response: PaginatedResponse<T> = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    meta: {
      pagination
    }
  };

  return res.status(200).json(response);
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
}

/**
 * Parse pagination parameters from query
 */
export function parsePaginationParams(query: Record<string, unknown>): { page: number; limit: number } {
  const page = Math.max(1, parseInt(query['page'] as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query['limit'] as string) || 10));

  return { page, limit };
}

/**
 * Wrap async route handler with error handling
 */
export function asyncHandler(fn: (...args: unknown[]) => Promise<unknown>) {
  return (req: unknown, res: unknown, next: unknown) => {
    Promise.resolve(fn(req, res, next)).catch(next as (err: unknown) => void);
  };
}
