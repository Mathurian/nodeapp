import { z } from 'zod';
import { emailSchema, passwordSchema, nameSchema, optionalString } from './commonSchemas';

const createUserBaseSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'TALLY_MASTER', 'AUDITOR', 'BOARD', 'JUDGE', 'CONTESTANT', 'EMCEE']),
  boardRole: optionalString,
  isActive: z.boolean().default(true),
  phone: optionalString,
  address: optionalString,
  city: optionalString,
  state: optionalString,
  country: optionalString,
});

export const createUserSchema = createUserBaseSchema.refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const updateUserSchema = createUserBaseSchema
  .omit({ password: true, confirmPassword: true })
  .partial();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
