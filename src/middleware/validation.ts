/**
 * Zod Validation Middleware
 * Request validation using Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { sendValidationError } from '../utils/responseHelpers';

/**
 * Validation target
 */
type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Validate request using Zod schema
 */
export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req[target];
      const validated = await schema.parseAsync(data);
      (req as unknown as Record<string, unknown>)[target] = validated; // Replace with validated data
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.issues.map((err: z.ZodIssue) => ({
          field: err.path.join('.'),
          message: err.message,
          value: err.path.reduce((obj: Record<PropertyKey, unknown> | undefined, key: PropertyKey) => obj?.[key] as Record<PropertyKey, unknown> | undefined, req[target] as Record<PropertyKey, unknown>),
          rule: err.code
        }));

        sendValidationError(res, validationErrors);
        return;
      }

      return next(error);
    }
  };
}

/**
 * Validate multiple targets
 */
export function validateMultiple(schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reqWithValidation = req as unknown as Record<string, unknown>;
      if (schemas.body) {
        reqWithValidation['body'] = await schemas.body['parseAsync'](req.body);
      }
      if (schemas.query) {
        reqWithValidation['query'] = await schemas.query['parseAsync'](req.query);
      }
      if (schemas.params) {
        reqWithValidation['params'] = await schemas.params['parseAsync'](req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.issues.map((err: z.ZodIssue) => ({
          field: err.path.join('.'),
          message: err.message,
          rule: err.code
        }));

        sendValidationError(res, validationErrors);
        return;
      }

      return next(error);
    }
  };
}

// ============================================================================
// Common Validation Schemas
// ============================================================================

/**
 * ID parameter schema
 */
export const idParamSchema = z.object({
  id: z.string().cuid('Invalid ID format')
});

/**
 * Pagination query schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10)
});

/**
 * User creation schema
 */
export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  preferredName: z.string().max(100).optional(),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'EVENT_MANAGER', 'JUDGE', 'CONTESTANT', 'EMCEE', 'TALLY_MASTER', 'AUDITOR', 'BOARD_MEMBER', 'ORGANIZER', 'BOARD']),
  gender: z.string().optional(),
  pronouns: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  isActive: z.boolean().optional()
});

/**
 * User update schema
 */
export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  preferredName: z.string().max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'EVENT_MANAGER', 'JUDGE', 'CONTESTANT', 'EMCEE', 'TALLY_MASTER', 'AUDITOR', 'BOARD_MEMBER', 'ORGANIZER', 'BOARD']).optional(),
  gender: z.string().optional(),
  pronouns: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  isActive: z.boolean().optional()
});

/**
 * Login schema
 */
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

/**
 * Change password schema
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Password confirmation is required')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

/**
 * Event creation schema
 */
export const createEventSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()),
  location: z.string().optional(),
  maxContestants: z.number().int().positive().optional()
}).refine(data => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end > start;
}, {
  message: 'End date must be after start date',
  path: ['endDate']
});

/**
 * Event update schema
 */
export const updateEventSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  startDate: z.string().datetime().or(z.date()).optional(),
  endDate: z.string().datetime().or(z.date()).optional(),
  location: z.string().optional(),
  maxContestants: z.number().int().positive().optional(),
  archived: z.boolean().optional()
});

/**
 * Score creation schema
 */
export const createScoreSchema = z.object({
  judgeId: z.string().cuid(),
  contestantId: z.string().cuid(),
  categoryId: z.string().cuid(),
  contestId: z.string().cuid(),
  value: z.number().min(0).max(100)
});

/**
 * Score update schema
 */
export const updateScoreSchema = z.object({
  value: z.number().min(0).max(100)
});

/**
 * Search query schema
 */
export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10)
});

/**
 * Date range query schema
 */
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date())
}).refine(data => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end > start;
}, {
  message: 'End date must be after start date',
  path: ['endDate']
});

/**
 * Contest creation schema
 */
export const createContestSchema = z.object({
  eventId: z.string().cuid('Invalid event ID format'),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  archived: z.boolean().optional(),
  contestantNumberingMode: z.enum(['MANUAL', 'AUTOMATIC']).optional(),
  nextContestantNumber: z.number().int().positive().optional()
});

/**
 * Contest update schema
 */
export const updateContestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  archived: z.boolean().optional(),
  contestantNumberingMode: z.enum(['MANUAL', 'AUTOMATIC']).optional(),
  nextContestantNumber: z.number().int().positive().optional()
});

/**
 * Category creation schema
 */
export const createCategorySchema = z.object({
  contestId: z.string().cuid('Invalid contest ID format'),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  scoreCap: z.number().int().positive().optional(),
  timeLimit: z.number().int().positive().optional(),
  contestantMin: z.number().int().positive().optional(),
  contestantMax: z.number().int().positive().optional(),
  totalsCertified: z.boolean().optional()
});

/**
 * Category update schema
 */
export const updateCategorySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  scoreCap: z.number().int().positive().optional(),
  timeLimit: z.number().int().positive().optional(),
  contestantMin: z.number().int().positive().optional(),
  contestantMax: z.number().int().positive().optional(),
  totalsCertified: z.boolean().optional()
});
