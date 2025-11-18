import { Response } from 'express';

/**
 * Standardized API Response Utilities
 *
 * Provides consistent response formatting across all API endpoints.
 * Benefits:
 * - Consistent structure for clients
 * - Type-safe responses
 * - Built-in error handling
 * - Metadata support (pagination, timestamps, etc.)
 */

interface ApiMeta {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  [key: string]: unknown;
}

/**
 * Success Response
 */
export const successResponse = (
  res: Response,
  data: unknown = null,
  message: string = 'Success',
  statusCode: number = 200,
  meta: ApiMeta | null = null
): Response => {
  const response: Record<string, unknown> = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

/**
 * Error Response
 */
export const errorResponse = (
  res: Response,
  message: string = 'Internal Server Error',
  statusCode: number = 500,
  errors: unknown = null
): Response => {
  const response: Record<string, unknown> = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  if (errors) {
    response.errors = errors;
  }

  // Add stack trace only in development
  if (process.env.NODE_ENV !== 'production' && errors && typeof errors === 'object' && 'stack' in errors) {
    response.stack = (errors as { stack: string }).stack;
  }

  return res.status(statusCode).json(response);
};

/**
 * Paginated Response
 */
export const paginatedResponse = (
  res: Response,
  data: unknown[],
  page: number,
  limit: number,
  total: number,
  message: string = 'Success'
): Response => {
  const totalPages = Math.ceil(total / limit);

  return successResponse(res, data, message, 200, {
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
};

/**
 * Created Response (201)
 */
export const createdResponse = (
  res: Response,
  data: unknown,
  message: string = 'Resource created successfully'
): Response => {
  return successResponse(res, data, message, 201);
};

/**
 * No Content Response (204)
 */
export const noContentResponse = (res: Response): Response => {
  return res.status(204).send();
};

/**
 * Bad Request Response (400)
 */
export const badRequestResponse = (
  res: Response,
  message: string = 'Bad Request',
  errors: unknown = null
): Response => {
  return errorResponse(res, message, 400, errors);
};

/**
 * Unauthorized Response (401)
 */
export const unauthorizedResponse = (
  res: Response,
  message: string = 'Unauthorized'
): Response => {
  return errorResponse(res, message, 401);
};

/**
 * Forbidden Response (403)
 */
export const forbiddenResponse = (
  res: Response,
  message: string = 'Forbidden'
): Response => {
  return errorResponse(res, message, 403);
};

/**
 * Not Found Response (404)
 */
export const notFoundResponse = (
  res: Response,
  message: string = 'Resource not found'
): Response => {
  return errorResponse(res, message, 404);
};

/**
 * Conflict Response (409)
 */
export const conflictResponse = (
  res: Response,
  message: string = 'Resource conflict'
): Response => {
  return errorResponse(res, message, 409);
};

/**
 * Validation Error Response (422)
 */
export const validationErrorResponse = (
  res: Response,
  errors: unknown[],
  message: string = 'Validation failed'
): Response => {
  return errorResponse(res, message, 422, errors);
};

/**
 * Internal Server Error Response (500)
 */
export const internalErrorResponse = (
  res: Response,
  message: string = 'Internal Server Error',
  error: unknown = null
): Response => {
  return errorResponse(res, message, 500, error);
};

