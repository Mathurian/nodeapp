import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient, Contest } from '@prisma/client';

type ContestWithCategories = Contest & {
  categories: Array<{
    id: string;
    name: string;
    categoryContestants: { contestantId: string }[];
    scores: { id: string; judgeId: string }[];
    categoryJudges: { judgeId: string }[];
  }>;
};

@injectable()
export class TrackerService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  async getScoringProgressByContest(contestId: string) {
    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        categories: {
          include: {
            categoryContestants: { select: { contestantId: true } },
            scores: { select: { id: true, judgeId: true } },
            categoryJudges: { select: { judgeId: true } }
          }
        }
      }
    }) as ContestWithCategories | null;

    if (!contest) throw this.notFoundError('Contest', contestId);

    // Get event name separately
    const event = await this.prisma.event.findUnique({
      where: { id: contest.eventId },
      select: { id: true, name: true }
    });

    const categoryProgress = await Promise.all(contest.categories.map(async (category: any) => {
      const totalContestants = category.contestants.length;
      const uniqueJudges = new Set(category.scores.map((s: any) => s.judgeId));
      const totalJudgeScores = category.scores.length;
      const expectedScores = totalContestants * uniqueJudges.size;
      const completionPercentage = expectedScores > 0 
        ? Math.round((totalJudgeScores / expectedScores) * 100) 
        : 0;

      const judgeIds = Array.from(uniqueJudges) as string[];
      const judgeCompletion = await Promise.all(judgeIds.map(async (judgeId: string) => {
        const judgeScores = category.scores.filter((s: { judgeId: string }) => s.judgeId === judgeId).length;
        const judgeCompletionPct = totalContestants > 0 
          ? Math.round((judgeScores / totalContestants) * 100) 
          : 0;
        
        const judge = await this.prisma.judge.findUnique({
          where: { id: judgeId as string },
          select: { name: true }
        });
        
        return {
          judgeId,
          judgeName: judge?.name || 'Unknown',
          completed: judgeScores,
          total: totalContestants,
          completionPercentage: judgeCompletionPct
        };
      }));

      return {
        categoryId: category.id,
        categoryName: category.name,
        totalContestants,
        totalJudges: uniqueJudges.size,
        totalScores: totalJudgeScores,
        expectedScores,
        completionPercentage,
        judges: judgeCompletion
      };
    }));

    return {
      contestId: contest.id,
      contestName: contest.name,
      eventName: event?.name || 'Unknown',
      categories: categoryProgress,
      overallCompletion: categoryProgress.length > 0
        ? Math.round(categoryProgress.reduce((sum, cat) => sum + cat.completionPercentage, 0) / categoryProgress.length)
        : 0
    };
  }

  async getScoringProgressByCategory(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        categoryContestants: { select: { contestantId: true } },
        scores: { select: { id: true, judgeId: true, contestantId: true } },
        categoryJudges: { select: { judgeId: true } },
        contest: { select: { id: true, name: true, eventId: true } }
      }
    });

    if (!category) throw this.notFoundError('Category', categoryId);

    // Get event name separately
    const event = await this.prisma.event.findUnique({
      where: { id: category.contest.eventId },
      select: { id: true, name: true }
    });

    const totalContestants = category.categoryContestants.length;
    const totalJudges = category.categoryJudges.length;
    const expectedScores = totalContestants * totalJudges;
    const totalScores = category.scores.length;
    const completionPercentage = expectedScores > 0
      ? Math.round((totalScores / expectedScores) * 100)
      : 0;

    return {
      categoryId: category.id,
      categoryName: category.name,
      contestName: category.contest.name,
      eventName: event?.name || 'Unknown',
      totalContestants,
      totalJudges,
      totalScores,
      expectedScores,
      completionPercentage
    };
  }
}
