import { z } from 'zod';
import { BaseEntitySchema, UserRoleSchema } from './commonSchemas';

/**
 * User entity response schema
 */
export const UserSchema = BaseEntitySchema.extend({
  email: z.string().email(),
  name: z.string(),
  role: UserRoleSchema,
  isActive: z.boolean(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  lastLoginAt: z.string().datetime().nullable().optional(),
  mfaEnabled: z.boolean().optional(),
});

/**
 * User list item (may have fewer fields)
 */
export const UserListItemSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: UserRoleSchema,
  isActive: z.boolean(),
  imageUrl: z.string().nullable().optional(),
  lastLoginAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
});

/**
 * User list response
 */
export const UserListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(UserListItemSchema),
  total: z.number().optional(),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }).optional(),
});

/**
 * Single user response
 */
export const UserResponseSchema = z.object({
  success: z.literal(true),
  data: UserSchema,
});

export type User = z.infer<typeof UserSchema>;
export type UserListItem = z.infer<typeof UserListItemSchema>;
