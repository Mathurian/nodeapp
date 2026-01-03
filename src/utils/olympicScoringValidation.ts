/**
 * Olympic Scoring Validation Utilities
 *
 * Provides validation helpers for Olympic scoring requirements
 */

import { PrismaClient, ScoringType } from '@prisma/client';
import { ValidationError } from '../services/BaseService';

/**
 * Minimum judges required for Olympic scoring
 */
export const MIN_JUDGES_OLYMPIC = 3;

/**
 * Check if a contest uses Olympic scoring (directly or inherited)
 */
export async function contestUsesOlympicScoring(
  contestId: string,
  prisma: PrismaClient
): Promise<boolean> {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: {
      scoringType: true,
      event: {
        select: {
          scoringType: true,
          tenantId: true,
        },
      },
    },
  });

  if (!contest) {
    return false;
  }

  // Contest-level setting takes precedence
  if (contest.scoringType === ScoringType.OLYMPIC) {
    return true;
  }

  // Event-level setting
  if (contest.event.scoringType === ScoringType.OLYMPIC) {
    return true;
  }

  // Tenant-level setting
  const tenant = await prisma.tenant.findUnique({
    where: { id: contest.event.tenantId },
    select: { scoringType: true },
  });

  return tenant?.scoringType === ScoringType.OLYMPIC;
}

/**
 * Check if a category uses Olympic scoring
 */
export async function categoryUsesOlympicScoring(
  categoryId: string,
  prisma: PrismaClient
): Promise<boolean> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      contestId: true,
    },
  });

  if (!category) {
    return false;
  }

  return contestUsesOlympicScoring(category.contestId, prisma);
}

/**
 * Count judges assigned to a contest
 */
export async function getContestJudgeCount(
  contestId: string,
  prisma: PrismaClient
): Promise<number> {
  const judgeCount = await prisma.contestJudge.count({
    where: {
      contestId,
    },
  });

  return judgeCount;
}

/**
 * Count judges assigned to a category
 */
export async function getCategoryJudgeCount(
  categoryId: string,
  prisma: PrismaClient
): Promise<number> {
  const judgeCount = await prisma.categoryJudge.count({
    where: {
      categoryId,
    },
  });

  return judgeCount;
}

/**
 * Validate that a contest has enough judges for Olympic scoring
 * Throws ValidationError if invalid
 */
export async function validateContestJudgeCountForOlympic(
  contestId: string,
  prisma: PrismaClient
): Promise<void> {
  const usesOlympic = await contestUsesOlympicScoring(contestId, prisma);

  if (!usesOlympic) {
    return; // Not using Olympic scoring, no validation needed
  }

  const judgeCount = await getContestJudgeCount(contestId, prisma);

  if (judgeCount < MIN_JUDGES_OLYMPIC) {
    throw new ValidationError(
      `Olympic scoring requires at least ${MIN_JUDGES_OLYMPIC} judges. This contest currently has ${judgeCount} judge(s) assigned.`
    );
  }
}

/**
 * Validate that a category has enough judges for Olympic scoring
 * Throws ValidationError if invalid
 */
export async function validateCategoryJudgeCountForOlympic(
  categoryId: string,
  prisma: PrismaClient
): Promise<void> {
  const usesOlympic = await categoryUsesOlympicScoring(categoryId, prisma);

  if (!usesOlympic) {
    return; // Not using Olympic scoring, no validation needed
  }

  const judgeCount = await getCategoryJudgeCount(categoryId, prisma);

  if (judgeCount < MIN_JUDGES_OLYMPIC) {
    throw new ValidationError(
      `Olympic scoring requires at least ${MIN_JUDGES_OLYMPIC} judges. This category currently has ${judgeCount} judge(s) assigned.`
    );
  }
}

/**
 * Get a warning message if judge count is below Olympic minimum
 * Returns null if count is sufficient or not using Olympic scoring
 */
export async function getOlympicJudgeCountWarning(
  contestId: string,
  prisma: PrismaClient
): Promise<string | null> {
  const usesOlympic = await contestUsesOlympicScoring(contestId, prisma);

  if (!usesOlympic) {
    return null;
  }

  const judgeCount = await getContestJudgeCount(contestId, prisma);

  if (judgeCount < MIN_JUDGES_OLYMPIC) {
    return `Warning: Olympic scoring is enabled but only ${judgeCount} judge(s) assigned. Minimum ${MIN_JUDGES_OLYMPIC} required.`;
  }

  return null;
}
