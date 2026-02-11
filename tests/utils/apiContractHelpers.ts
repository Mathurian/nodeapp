import { z } from 'zod';

/**
 * Validates that a response matches a Zod schema
 * Throws descriptive error if validation fails
 */
export function expectResponseToMatchSchema<T extends z.ZodType>(
  response: unknown,
  schema: T,
  context?: string
): z.infer<T> {
  const result = schema.safeParse(response);
  if (!result.success) {
    const errorMessage = result.error.errors
      .map(e => `${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(
      `Response does not match schema${context ? ` (${context})` : ''}:\n${errorMessage}`
    );
  }
  return result.data;
}

/**
 * Standard API success response schema factory
 */
export const ApiSuccessResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
  });

/**
 * Standard API error response schema
 * Supports both legacy format (message) and new format (error)
 */
export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  // Support both formats - some responses use 'message', some use 'error'
  message: z.string().optional(),
  error: z.string().optional(),
  code: z.string().optional(),
  details: z.unknown().optional(),
  errors: z.unknown().optional(),
  requestId: z.string().optional(),
  correlationId: z.string().optional(),
  timestamp: z.string().optional(),
  stack: z.string().optional(),
}).refine(
  data => data.message !== undefined || data.error !== undefined,
  { message: 'Either message or error field must be present' }
);

/**
 * Pagination metadata schema
 */
export const PaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

/**
 * Paginated response schema factory
 */
export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: PaginationSchema.optional(),
    total: z.number().optional(),
  });

/**
 * Common ID schema (UUID or CUID)
 */
export const IdSchema = z.string().min(1);

/**
 * Common timestamp schema
 */
export const TimestampSchema = z.string().datetime().or(z.date());

/**
 * Nullable timestamp
 */
export const NullableTimestampSchema = TimestampSchema.nullable();

/**
 * Date or string schema (flexible date handling)
 */
export const DateOrStringSchema = z.union([
  z.string().datetime(),
  z.string().min(1),
  z.date(),
]);

/**
 * Paginated API success response schema factory
 */
export const PaginatedApiSuccessResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: PaginationSchema.optional(),
    total: z.number().optional(),
    message: z.string().optional(),
  });
