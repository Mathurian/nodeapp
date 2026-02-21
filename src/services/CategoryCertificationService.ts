import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient, Prisma } from '@prisma/client';
import { applyCertificationStage, refreshRoleStages, upsertCategoryRoleCertification } from '../utils/certificationPipeline';

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

    const certification = await this.prisma.certification.findFirst({
      where: { categoryId },
      orderBy: { updatedAt: 'desc' }
    });

    const judgeIds = categoryJudges.map((cj) => cj.judgeId);
    const certifiedJudges = await this.prisma.judgeCertification.groupBy({
      by: ['judgeId'],
      where: {
        categoryId,
        ...(judgeIds.length > 0 ? { judgeId: { in: judgeIds } } : {})
      }
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

    const judgeStageCertified = certification?.judgeCertified || (totalJudges > 0 && certifiedJudges.length >= totalJudges);
    const tallyStageCertified = certification?.tallyCertified || !!tallyMasterCert;
    const auditorStageCertified = certification?.auditorCertified || !!auditorCert;
    const boardStageCertified = certification?.boardApproved || boardCerts.length > 0;

    return {
      categoryId,
      judgeProgress: {
        contestantsCertified: judgeContestantCertifications.length,
        totalContestants,
        isCategoryCertified: judgeStageCertified
      },
      tallyMasterProgress: {
        isCategoryCertified: tallyStageCertified
      },
      auditorProgress: {
        isCategoryCertified: auditorStageCertified
      },
      boardProgress: {
        isCategoryCertified: boardStageCertified
      }
    };
  }

  async certifyCategory(categoryId: string, userId: string, userRole: string, tenantId: string): Promise<Prisma.CategoryCertificationGetPayload<{}>> {
    const existing = await this.prisma.categoryCertification.findFirst({
      where: { tenantId, categoryId, role: userRole, userId }
    });

    if (existing) {
      throw this.badRequestError('Category already certified by this user for this role');
    }

    const boardRoleSnapshot = userRole === 'BOARD'
      ? ((await this.prisma.user.findFirst({
          where: { id: userId, tenantId },
          select: { boardRole: true }
        }))?.boardRole || null)
      : null;

    const created = await upsertCategoryRoleCertification({
      prisma: this.prisma,
      tenantId,
      categoryId,
      role: userRole,
      userId,
      boardRoleSnapshot
    });

    if (userRole === 'TALLY_MASTER' || userRole === 'AUDITOR' || userRole === 'BOARD') {
      const synced = await refreshRoleStages(this.prisma, tenantId, categoryId, userId);
      if (userRole === 'TALLY_MASTER' && !synced.judgeCertified) {
        throw this.badRequestError('Judge certification must be completed first');
      }
      if (userRole === 'AUDITOR' && !synced.tallyCertified) {
        throw this.badRequestError('Tally Master certification must be completed first');
      }
      if (userRole === 'BOARD' && !synced.auditorCertified) {
        throw this.badRequestError('Auditor certification must be completed first');
      }
      await applyCertificationStage({
        prisma: this.prisma,
        tenantId,
        categoryId,
        role: userRole,
        userId,
        certifiedBy: userId
      });
    }

    return created;
  }
}
