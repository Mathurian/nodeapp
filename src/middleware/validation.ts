/**
 * Zod Validation Middleware
 * Request validation using Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { UserRole } from '@prisma/client';
import { sendValidationError } from '../utils/responseHelpers';

/**
 * Validation target
 */
type ValidationTarget = 'body' | 'query' | 'params';
const userRoleSchema = z.nativeEnum(UserRole);
const legacyHexIdSchema = z.string().regex(/^[a-f0-9]{32}$/i);
const compatIdSchema = z
  .string()
  .trim()
  .min(1, 'ID is required')
  .max(64, 'ID is too long')
  .refine(
    (value) =>
      z.string().cuid().safeParse(value).success ||
      z.string().uuid().safeParse(value).success ||
      legacyHexIdSchema.safeParse(value).success,
    'Invalid ID format'
  );

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
 * File ID parameter schema
 */
export const fileIdParamSchema = z.object({
  fileId: z.string().cuid('Invalid file ID format')
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
  role: userRoleSchema,
  boardRole: z.string().max(100).optional(),
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
  currentPassword: z.string().optional(),
  password: z.string().optional(),
  role: userRoleSchema.optional(),
  boardRole: z.string().max(100).optional(),
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
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required')
});

/**
 * Forgot password schema
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
});

/**
 * Reset password schema
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

/**
 * Invitation registration completion schema
 */
export const completeInvitationRegistrationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
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
  maxContestants: z.number().int().positive().optional(),
  contestantViewRestricted: z.boolean().optional(),
  contestantViewReleaseDate: z.string().datetime().or(z.date()).nullable().optional()
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
  archived: z.boolean().optional(),
  contestantViewRestricted: z.boolean().optional(),
  contestantViewReleaseDate: z.string().datetime().or(z.date()).nullable().optional()
});

/**
 * Score creation schema
 */
export const createScoreSchema = z.object({
  score: z.number().min(0, 'Score must be non-negative'),
  criteriaId: z.string().cuid().optional(),
  deduction: z.number().int().min(0).optional(),
  deductionReason: z.string().max(500).optional(),
  comments: z.string().max(1000).optional()
});

/**
 * Score update schema
 */
export const updateScoreSchema = z.object({
  score: z.number().min(0).optional(),
  comments: z.string().max(1000).optional()
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
const contestantNumberingModeSchema = z.preprocess((value) => {
  if (value === 'AUTO' || value === 'AUTOMATIC' || value === 'AUTO_INCREMENT') {
    return 'AUTO_INDEXED';
  }
  if (value === 'AUTO_RANDOM') {
    return 'OPTIONAL';
  }
  return value;
}, z.enum(['MANUAL', 'AUTO_INDEXED', 'OPTIONAL']));

export const createContestSchema = z.object({
  // eventId is provided via /event/:eventId for primary create route
  eventId: z.string().cuid('Invalid event ID format').optional(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  archived: z.boolean().optional(),
  contestantNumberingMode: contestantNumberingModeSchema.optional(),
  nextContestantNumber: z.number().int().positive().optional()
});

/**
 * Contest update schema
 */
export const updateContestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  archived: z.boolean().optional(),
  contestantNumberingMode: contestantNumberingModeSchema.optional(),
  nextContestantNumber: z.number().int().positive().optional()
});

/**
 * Category creation schema
 */
export const createCategorySchema = z.object({
  // contestId is provided via /contest/:contestId for primary create route
  contestId: z.string().cuid('Invalid contest ID format').optional(),
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

/**
 * Notification creation schema
 */
export const createNotificationSchema = z.object({
  userIds: z.array(compatIdSchema).min(1, 'At least one user ID required'),
  title: z.string().min(1, 'Title is required').max(200),
  message: z.string().min(1, 'Message is required').max(5000),
  type: z.enum(['info', 'success', 'warning', 'error', 'INFO', 'SUCCESS', 'WARNING', 'ERROR']).optional(),
  link: z.string().max(500).optional(),
  targetTenantId: z.union([compatIdSchema, z.null()]).optional()
});

/**
 * Notification broadcast schema
 */
export const broadcastNotificationSchema = z.object({
  roles: z.array(userRoleSchema).min(1, 'At least one role required'),
  title: z.string().min(1, 'Title is required').max(200),
  message: z.string().min(1, 'Message is required').max(5000),
  type: z.enum(['info', 'success', 'warning', 'error', 'INFO', 'SUCCESS', 'WARNING', 'ERROR']).optional(),
  link: z.string().max(500).optional(),
  targetTenantId: z.union([compatIdSchema, z.null()]).optional()
});

/**
 * Notification query schema
 */
export const notificationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

/**
 * Cleanup query schema
 */
export const cleanupQuerySchema = z.object({
  daysOld: z.coerce.number().int().min(1).max(365).default(30)
});

/**
 * Certification creation schema
 */
export const createCertificationSchema = z.object({
  eventId: z.string().cuid('Invalid event ID format').optional(),
  contestId: z.string().cuid('Invalid contest ID format').optional(),
  categoryId: z.string().cuid('Invalid category ID format').optional(),
  judgeId: z.string().cuid('Invalid judge ID format').optional(),
  type: z.enum(['JUDGE', 'TALLY', 'AUDITOR', 'BOARD']).optional(),
  notes: z.string().max(1000).optional()
});

/**
 * Certification update schema
 */
export const updateCertificationSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  notes: z.string().max(1000).optional()
});

/**
 * File upload metadata schema
 */
export const fileUploadMetadataSchema = z.object({
  category: z.enum(['EVENT', 'CONTESTANT', 'SCORE', 'REPORT', 'OTHER']).optional(),
  eventId: z.string().cuid('Invalid event ID format').optional(),
  contestId: z.string().cuid('Invalid contest ID format').optional(),
  categoryId: z.string().cuid('Invalid category ID format').optional(),
  isPublic: z.string().regex(/^(true|false)$/).transform(val => val === 'true').optional()
});

/**
 * File update schema
 */
export const updateFileSchema = z.object({
  category: z.enum(['EVENT', 'CONTESTANT', 'SCORE', 'REPORT', 'OTHER']).optional(),
  isPublic: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional()
});

/**
 * Email send schema
 */
export const sendEmailSchema = z.object({
  to: z.string().email('Invalid email address').or(z.array(z.string().email())),
  subject: z.string().min(1, 'Subject is required').max(200),
  body: z.string().min(1, 'Body is required'),
  html: z.string().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    path: z.string().optional(),
    content: z.string().optional()
  })).optional()
});

/**
 * Email template creation schema
 */
export const createEmailTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100),
  subject: z.string().min(1, 'Subject is required').max(200),
  body: z.string().min(1, 'Body is required'),
  html: z.string().optional(),
  variables: z.array(z.string()).optional(),
  category: z.string().max(50).optional()
});

/**
 * Email campaign creation schema
 */
export const createEmailCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(100),
  templateId: z.string().cuid('Invalid template ID').optional(),
  subject: z.string().min(1, 'Subject is required').max(200),
  body: z.string().min(1, 'Body is required'),
  html: z.string().optional(),
  recipients: z.array(z.string().email('Invalid email address')).optional(),
  roles: z.array(userRoleSchema).optional(),
  scheduledFor: z.string().datetime().or(z.date()).optional()
});

/**
 * Send email to multiple recipients schema
 */
export const sendMultipleEmailsSchema = z.object({
  recipients: z.array(z.string().email('Invalid email address')).min(1, 'At least one recipient required'),
  subject: z.string().min(1, 'Subject is required').max(200),
  body: z.string().min(1, 'Body is required'),
  html: z.string().optional()
});

/**
 * Send email by role schema
 */
export const sendEmailByRoleSchema = z.object({
  roles: z.array(userRoleSchema).min(1, 'At least one role required'),
  subject: z.string().min(1, 'Subject is required').max(200),
  body: z.string().min(1, 'Body is required'),
  html: z.string().optional()
});

/**
 * SMS send schema
 */
export const sendSmsSchema = z.object({
  to: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  message: z.string().min(1, 'Message is required').max(160, 'SMS message too long')
});

/**
 * Deduction request schema
 */
export const createDeductionSchema = z.object({
  categoryId: z.string().cuid('Invalid category ID format'),
  contestantId: z.string().cuid('Invalid contestant ID format'),
  points: z.number().int().min(1, 'Deduction must be at least 1 point').max(100),
  reason: z.string().min(1, 'Reason is required').max(500),
  requestedBy: z.string().cuid('Invalid user ID format').optional()
});

/**
 * Contestant creation schema
 */
export const createContestantSchema = z.object({
  contestId: z.string().cuid('Invalid contest ID format'),
  name: z.string().min(1, 'Name is required').max(200),
  number: z.string().max(50).optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

/**
 * Contestant update schema
 */
export const updateContestantSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  number: z.string().max(50).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  archived: z.boolean().optional()
});
