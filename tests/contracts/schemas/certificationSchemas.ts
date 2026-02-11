/**
 * Zod Schemas for Certification API Responses
 * Defines the expected structure of certification-related API responses for contract testing
 */

import { z } from 'zod';
import {
  ApiSuccessResponseSchema,
  PaginatedApiSuccessResponseSchema,
  IdSchema,
  DateOrStringSchema,
} from '../../utils/apiContractHelpers';

/**
 * Certification status enum.
 */
export const CertificationStatusSchema = z.enum([
  'PENDING',
  'CERTIFIED',
  'UNCERTIFIED',
  'FINAL',
]);

/**
 * Base certification entity schema.
 */
export const CertificationSchema = z.object({
  id: IdSchema,
  categoryId: IdSchema.optional(),
  contestId: IdSchema.optional(),
  judgeId: IdSchema.optional(),
  status: CertificationStatusSchema.optional(),
  certifiedAt: DateOrStringSchema.nullable().optional(),
  certifiedBy: IdSchema.nullable().optional(),
  createdAt: DateOrStringSchema.optional(),
  updatedAt: DateOrStringSchema.optional(),
}).passthrough();

/**
 * Judge certification schema.
 */
export const JudgeCertificationSchema = z.object({
  id: IdSchema,
  judgeId: IdSchema,
  categoryId: IdSchema,
  judgeName: z.string().optional(),
  certified: z.boolean(),
  certifiedAt: DateOrStringSchema.nullable().optional(),
}).passthrough();

/**
 * Category certification schema.
 */
export const CategoryCertificationSchema = z.object({
  id: IdSchema,
  categoryId: IdSchema,
  categoryName: z.string().optional(),
  status: CertificationStatusSchema.optional(),
  judgeCertifications: z.array(JudgeCertificationSchema).optional(),
  allJudgesCertified: z.boolean().optional(),
  tallyMasterCertified: z.boolean().optional(),
  auditorCertified: z.boolean().optional(),
  certifiedAt: DateOrStringSchema.nullable().optional(),
}).passthrough();

/**
 * Contest certification schema (aggregated across categories).
 */
export const ContestCertificationSchema = z.object({
  id: IdSchema,
  contestId: IdSchema,
  contestName: z.string().optional(),
  status: CertificationStatusSchema.optional(),
  categoryCertifications: z.array(CategoryCertificationSchema).optional(),
  allCategoriesCertified: z.boolean().optional(),
  finalCertification: z.boolean().optional(),
  certifiedAt: DateOrStringSchema.nullable().optional(),
}).passthrough();

/**
 * Single certification response schema.
 */
export const CertificationResponseSchema = ApiSuccessResponseSchema(
  z.union([
    CertificationSchema,
    CategoryCertificationSchema,
    ContestCertificationSchema,
  ])
);

/**
 * Certification list response schema.
 */
export const CertificationListResponseSchema = z.union([
  ApiSuccessResponseSchema(z.array(CertificationSchema)),
  PaginatedApiSuccessResponseSchema(CertificationSchema),
]);

/**
 * Judge certifications list response schema.
 * GET /api/certifications/judges/:categoryId
 */
export const JudgeCertificationsResponseSchema = ApiSuccessResponseSchema(
  z.array(JudgeCertificationSchema)
);

/**
 * Category certifications response schema.
 * GET /api/certifications/category/:categoryId
 */
export const CategoryCertificationsResponseSchema = ApiSuccessResponseSchema(
  z.union([
    CategoryCertificationSchema,
    z.object({ data: CategoryCertificationSchema }),
  ])
);

/**
 * Contest certifications response schema.
 * GET /api/certifications/contest/:contestId
 */
export const ContestCertificationsResponseSchema = ApiSuccessResponseSchema(
  z.union([
    ContestCertificationSchema,
    z.array(CategoryCertificationSchema),
    z.object({ data: z.union([ContestCertificationSchema, z.array(CategoryCertificationSchema)]) }),
  ])
);

/**
 * Certify action response schema.
 * POST /api/certifications/:id/certify
 */
export const CertifyActionResponseSchema = ApiSuccessResponseSchema(
  z.object({
    id: IdSchema.optional(),
    certified: z.boolean().optional(),
    status: CertificationStatusSchema.optional(),
    certifiedAt: DateOrStringSchema.optional(),
    message: z.string().optional(),
  }).passthrough()
);

/**
 * Uncertify action response schema.
 * POST /api/certifications/:id/uncertify
 */
export const UncertifyActionResponseSchema = ApiSuccessResponseSchema(
  z.object({
    id: IdSchema.optional(),
    certified: z.boolean().optional(),
    status: CertificationStatusSchema.optional(),
    uncertifiedAt: DateOrStringSchema.optional(),
    message: z.string().optional(),
  }).passthrough()
);

/**
 * Final certification response schema.
 * POST /api/scoring/category/:categoryId/final-certification
 */
export const FinalCertificationResponseSchema = ApiSuccessResponseSchema(
  z.object({
    categoryId: IdSchema.optional(),
    status: z.literal('FINAL').optional(),
    finalCertifiedAt: DateOrStringSchema.optional(),
    finalCertifiedBy: IdSchema.optional(),
    message: z.string().optional(),
  }).passthrough()
);

/**
 * Bulk certification reset response schema.
 * POST /api/certifications/bulk-reset
 */
export const BulkCertificationResetResponseSchema = ApiSuccessResponseSchema(
  z.object({
    resetCount: z.number().optional(),
    message: z.string().optional(),
  }).passthrough()
);

/**
 * Exported type definitions for use in tests.
 */
export type Certification = z.infer<typeof CertificationSchema>;
export type JudgeCertification = z.infer<typeof JudgeCertificationSchema>;
export type CategoryCertification = z.infer<typeof CategoryCertificationSchema>;
export type ContestCertification = z.infer<typeof ContestCertificationSchema>;
export type CertificationStatus = z.infer<typeof CertificationStatusSchema>;
