import { z } from 'zod';

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters');

export const optionalString = z
  .string()
  .transform(val => val === '' ? undefined : val)
  .optional();

export const dateSchema = z
  .string()
  .min(1, 'Date is required')
  .refine(val => !isNaN(Date.parse(val)), 'Invalid date');

export const futureDateSchema = dateSchema.refine(
  val => new Date(val) > new Date(),
  'Date must be in the future'
);
