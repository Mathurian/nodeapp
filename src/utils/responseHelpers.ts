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
import {
  ApiErrorResponse,
  ValidationErrorDetail
} from '../types/ApiResponse';
import { ErrorCode } from '../types/errors';
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
 * Send a standardized error response with error code
 * This is the new preferred method for error responses
 */
export function errorResponse(
  res: Response,
  error: string,
  code?: ErrorCode,
  status: number = 400,
  details?: unknown
): Response<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error,
    timestamp: new Date().toISOString()
  };

  if (code) {
    response.code = code;
  }

  if (details !== undefined) {
    response.details = details;
  }

  // Add request ID if available
  const requestId = (res.req as any)?.id || (res.req?.headers?.['x-request-id'] as string);
  if (requestId) {
    response.requestId = requestId;
  }

  return res.status(status).json(response);
}

/**
 * Send a standardized validation error response
 */
export function validationErrorResponse(
  res: Response,
  errors: ValidationErrorDetail[],
  message: string = 'Validation failed'
): Response<ApiErrorResponse> {
  return errorResponse(res, message, ErrorCode.VALIDATION_ERROR, 400, errors);
}

/**
 * Send a not found error response with error code
 */
export function notFoundErrorResponse(
  res: Response,
  message: string = 'Resource not found'
): Response<ApiErrorResponse> {
  return errorResponse(res, message, ErrorCode.NOT_FOUND, 404);
}

/**
 * Send an unauthorized error response with error code
 */
export function unauthorizedErrorResponse(
  res: Response,
  message: string = 'Authentication required'
): Response<ApiErrorResponse> {
  return errorResponse(res, message, ErrorCode.AUTHENTICATION_ERROR, 401);
}

/**
 * Send a forbidden error response with error code
 */
export function forbiddenErrorResponse(
  res: Response,
  message: string = 'Access denied'
): Response<ApiErrorResponse> {
  return errorResponse(res, message, ErrorCode.AUTHORIZATION_ERROR, 403);
}

/**
 * Send a conflict error response with error code
 */
export function conflictErrorResponse(
  res: Response,
  message: string = 'Resource conflict'
): Response<ApiErrorResponse> {
  return errorResponse(res, message, ErrorCode.CONFLICT, 409);
}

/**
 * Send a rate limit error response with error code
 */
export function rateLimitErrorResponse(
  res: Response,
  message: string = 'Too many requests'
): Response<ApiErrorResponse> {
  return errorResponse(res, message, ErrorCode.RATE_LIMIT_EXCEEDED, 429);
}

/**
 * Send an internal server error response with error code
 */
export function internalErrorResponse(
  res: Response,
  message: string = 'Internal server error'
): Response<ApiErrorResponse> {
  return errorResponse(res, message, ErrorCode.INTERNAL_ERROR, 500);
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
