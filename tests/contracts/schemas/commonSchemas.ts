import { z } from 'zod';
import { IdSchema, TimestampSchema, NullableTimestampSchema } from '../../utils/apiContractHelpers';

/**
 * Base entity fields present on most models
 */
export const BaseEntitySchema = z.object({
  id: IdSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  tenantId: IdSchema,
});

/**
 * Soft-deletable entity fields
 */
export const SoftDeletableSchema = BaseEntitySchema.extend({
  deletedAt: NullableTimestampSchema,
  deletedBy: IdSchema.nullable(),
});

/**
 * User role enum
 */
export const UserRoleSchema = z.enum([
  'SUPER_ADMIN',
  'ADMIN',
  'ORGANIZER',
  'TALLY_MASTER',
  'AUDITOR',
  'BOARD',
  'JUDGE',
  'CONTESTANT',
  'EMCEE',
]);

/**
 * Event status enum
 */
export const EventStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'COMPLETED',
  'ARCHIVED',
]);

/**
 * Scoring method enum
 */
export const ScoringMethodSchema = z.enum([
  'STRAIGHT',
  'OLYMPIC',
]);

/**
 * Certification status enum
 */
export const CertificationStatusSchema = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'CERTIFIED',
  'REJECTED',
]);
