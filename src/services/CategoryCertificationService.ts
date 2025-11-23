import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient, Prisma } from '@prisma/client';

// P2-4: Proper type definitions for category certification responses
type CategoryContestantWithContestant = Prisma.CategoryContestantGetPayload<{
  include: {
    contestant: true;
  };
}>;

type CategoryJudgeWithJudge = Prisma.CategoryJudgeGetPayload<{
  include: {
    judge: true;
  };
}>;

@injectable()
export class CategoryCertificationService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  async getCertificationProgress(categoryId: string) {
    const categoryContestants = await this.prisma.categoryContestant.findMany({
      where: { categoryId },
      include: { contestant: true }
    } as any) as CategoryContestantWithContestant[];

    const categoryJudges = await this.prisma.categoryJudge.findMany({
      where: { categoryId },
      include: { judge: true }
    } as any) as CategoryJudgeWithJudge[];

    const judgeContestantCertifications = await this.prisma.judgeContestantCertification.findMany({
      where: { categoryId }
    });

    const tallyMasterCert = await this.prisma.categoryCertification.findFirst({
      where: { categoryId, role: 'TALLY_MASTER' }
    });

    const auditorCert = await this.prisma.categoryCertification.findFirst({
      where: { categoryId, role: 'AUDITOR' }
    });

    const boardCerts = await this.prisma.categoryCertification.findMany({
      where: { categoryId, role: { in: ['SUPER_ADMIN', 'BOARD', 'ORGANIZER', 'ADMIN'] } }
    });

    const totalContestants = categoryContestants.length;
    const totalJudges = categoryJudges.length;

    return {
      categoryId,
      judgeProgress: {
        contestantsCertified: judgeContestantCertifications.length,
        totalContestants,
        isCategoryCertified: judgeContestantCertifications.length === totalContestants * totalJudges
      },
      tallyMasterProgress: {
        isCategoryCertified: !!tallyMasterCert
      },
      auditorProgress: {
        isCategoryCertified: !!auditorCert
      },
      boardProgress: {
        isCategoryCertified: boardCerts.length > 0
      }
    };
  }

  async certifyCategory(categoryId: string, userId: string, userRole: string, tenantId: string): Promise<Prisma.CategoryCertificationGetPayload<{}>> {
    const existing = await this.prisma.categoryCertification.findFirst({
      where: { categoryId, role: userRole }
    });

    if (existing) {
      throw this.badRequestError('Category already certified for this role');
    }

    return await this.prisma.categoryCertification.create({
      data: {
        tenantId,
        categoryId,
        role: userRole,
        userId
      }
    });
  }
}
