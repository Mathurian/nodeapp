import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';

@injectable()
export class TrackerService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  async getScoringProgressByContest(contestId: string) {
    const contest: any = await this.prisma.contest.findUnique({
      where: { id: contestId },
      select: {
        id: true,
        name: true,
        eventId: true,
        categories: {
          select: {
            id: true,
            name: true,
            contestants: { select: { contestantId: true } },
            scores: { select: { id: true, judgeId: true } },
            judges: { select: { judgeId: true } }
          }
        }
      } as any
    } as any);

    if (!contest) throw this.notFoundError('Contest', contestId);

    // Get event name separately
    const event = await this.prisma.event.findUnique({
      where: { id: contest.eventId },
      select: { id: true, name: true }
    });

    const categoryProgress = await Promise.all(contest.categories.map(async (category: any) => {
      const totalContestants = category.contestants.length;
      const uniqueJudges = new Set(category.scores.map(s => s.judgeId));
      const totalJudgeScores = category.scores.length;
      const expectedScores = totalContestants * uniqueJudges.size;
      const completionPercentage = expectedScores > 0 
        ? Math.round((totalJudgeScores / expectedScores) * 100) 
        : 0;

      const judgeCompletion = await Promise.all(Array.from(uniqueJudges).map(async (judgeId) => {
        const judgeScores = category.scores.filter(s => s.judgeId === judgeId).length;
        const judgeCompletionPct = totalContestants > 0 
          ? Math.round((judgeScores / totalContestants) * 100) 
          : 0;
        
        const judge: any = await this.prisma.judge.findUnique({
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
    const category: any = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        contestants: { select: { contestantId: true, contestant: { select: { name: true } } } },
        scores: { select: { id: true, judgeId: true, contestantId: true } },
        judges: { select: { judgeId: true, judge: { select: { name: true } } } },
        contest: { select: { id: true, name: true, eventId: true } }
      } as any
    } as any);

    if (!category) throw this.notFoundError('Category', categoryId);

    // Get event name separately
    const event = await this.prisma.event.findUnique({
      where: { id: category.contest.eventId },
      select: { id: true, name: true }
    });

    const totalContestants = category.contestants.length;
    const totalJudges = category.judges.length;
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
