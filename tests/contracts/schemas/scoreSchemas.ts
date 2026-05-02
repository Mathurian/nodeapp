/**
 * Zod Schemas for Score API Responses
 * Defines the expected structure of score-related API responses for contract testing
 */

import { z } from 'zod';
import {
  ApiSuccessResponseSchema,
  PaginatedApiSuccessResponseSchema,
  IdSchema,
  DateOrStringSchema,
} from '../../utils/apiContractHelpers';

/**
 * Base score entity schema.
 */
export const ScoreSchema = z.object({
  id: IdSchema,
  categoryId: IdSchema,
  contestantId: IdSchema,
  judgeId: IdSchema,
  criterionId: IdSchema.nullable().optional(), // May not always be present
  value: z.number().nullable().optional(),
  score: z.number().nullable().optional(),
  comment: z.string().nullable().optional(),
  comments: z.string().nullable().optional(),
  certified: z.boolean().optional(),
  isCertified: z.boolean().optional(),
  certifiedAt: DateOrStringSchema.nullable().optional(),
  certifiedBy: IdSchema.nullable().optional(),
  createdAt: DateOrStringSchema.optional(),
  updatedAt: DateOrStringSchema.optional(),
}).passthrough().refine(
  data => data.value !== undefined || data.score !== undefined,
  { message: 'Either value or score must be present' }
);

/**
 * Score list item schema (may include related data).
 */
export const ScoreListItemSchema = z.object({
  id: IdSchema,
  categoryId: IdSchema.optional(),
  contestantId: IdSchema.optional(),
  judgeId: IdSchema.optional(),
  value: z.number().nullable().optional(),
  score: z.number().nullable().optional(),
  certified: z.boolean().optional(),
  isCertified: z.boolean().optional(),
}).passthrough(); // Allow additional fields

/**
 * Judge score details for category scores response.
 */
export const JudgeScoreSchema = z.object({
  judgeId: IdSchema,
  judgeName: z.string().optional(),
  criterionId: IdSchema.optional(),
  criterionName: z.string().optional(),
  value: z.number(),
  comments: z.string().nullable().optional(),
});

/**
 * Contestant score summary with judge scores.
 */
export const ContestantScoreSchema = z.object({
  contestantId: IdSchema,
  contestantName: z.string().optional(),
  contestantNumber: z.string().nullable().optional(),
  scores: z.array(JudgeScoreSchema).optional(),
  totalScore: z.number().optional(),
  averageScore: z.number().optional(),
  rank: z.number().optional(),
}).passthrough();

/**
 * Category scores summary.
 */
export const CategoryScoresSchema = z.object({
  categoryId: IdSchema,
  categoryName: z.string().optional(),
  contestants: z.array(ContestantScoreSchema).optional(),
}).passthrough();

/**
 * Score summary for rankings.
 */
export const ScoreSummarySchema = z.object({
  contestantId: IdSchema,
  contestantName: z.string().optional(),
  categoryId: IdSchema.optional(),
  categoryName: z.string().optional(),
  totalScore: z.number(),
  averageScore: z.number().optional(),
  maxPossibleScore: z.number().optional(),
  scorePercentage: z.number().optional(),
  rank: z.number().optional(),
}).passthrough();

/**
 * Single score response schema.
 * POST /api/scoring/category/:categoryId/contestant/:contestantId
 */
export const ScoreResponseSchema = ApiSuccessResponseSchema(
  z.union([
    ScoreSchema,
    // Some endpoints wrap score in { data: score }
    z.object({ data: ScoreSchema }),
  ])
);

/**
 * Score list response schema.
 */
export const ScoreListResponseSchema = z.union([
  ApiSuccessResponseSchema(z.array(ScoreListItemSchema)),
  PaginatedApiSuccessResponseSchema(ScoreListItemSchema),
]);

/**
 * Categories for scoring response schema.
 * GET /api/scoring/categories
 */
export const ScoringCategoriesResponseSchema = ApiSuccessResponseSchema(
  z.array(
    z.object({
      id: IdSchema,
      name: z.string(),
      description: z.string().nullable().optional(),
      scoreCap: z.number().nullable().optional(),
      contestId: IdSchema.optional(),
    }).passthrough()
  )
);

/**
 * Category scores response schema.
 * GET /api/scoring/category/:categoryId
 */
export const CategoryScoresResponseSchema = ApiSuccessResponseSchema(
  z.union([
    CategoryScoresSchema,
    z.array(ContestantScoreSchema),
    // Some endpoints wrap in { data: ... }
    z.object({ data: z.union([CategoryScoresSchema, z.array(ContestantScoreSchema)]) }),
  ])
);

/**
 * Certify score response schema.
 * POST /api/scoring/:scoreId/certify
 */
export const CertifyScoreResponseSchema = ApiSuccessResponseSchema(
  z.object({
    id: IdSchema,
    certified: z.literal(true),
    certifiedAt: DateOrStringSchema.optional(),
  }).passthrough()
);

/**
 * Certify category scores response schema.
 * POST /api/scoring/category/:categoryId/certify
 */
export const CertifyCategoryScoresResponseSchema = ApiSuccessResponseSchema(
  z.object({
    categoryId: IdSchema.optional(),
    certified: z.boolean().optional(),
    certifiedCount: z.number().optional(),
    message: z.string().optional(),
  }).passthrough()
);

/**
 * Deduction schema.
 */
export const DeductionSchema = z.object({
  id: IdSchema,
  categoryId: IdSchema.optional(),
  contestantId: IdSchema.optional(),
  amount: z.number().optional(),
  reason: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  createdAt: DateOrStringSchema.optional(),
  updatedAt: DateOrStringSchema.optional(),
}).passthrough();

/**
 * Deduction list response schema.
 * GET /api/scoring/deductions
 */
export const DeductionListResponseSchema = ApiSuccessResponseSchema(
  z.union([
    z.array(DeductionSchema),
    z.object({
      data: z.array(DeductionSchema),
      pagination: z.unknown().optional(),
    }).passthrough(),
  ])
);

/**
 * Exported type definitions for use in tests.
 */
export type Score = z.infer<typeof ScoreSchema>;
export type ScoreListItem = z.infer<typeof ScoreListItemSchema>;
export type JudgeScore = z.infer<typeof JudgeScoreSchema>;
export type ContestantScore = z.infer<typeof ContestantScoreSchema>;
export type CategoryScores = z.infer<typeof CategoryScoresSchema>;
export type ScoreSummary = z.infer<typeof ScoreSummarySchema>;
export type Deduction = z.infer<typeof DeductionSchema>;
