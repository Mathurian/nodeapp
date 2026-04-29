import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient, Prisma } from '@prisma/client';
import { applyCertificationStage, ensureCertificationRecord, refreshRoleStages, upsertCategoryRoleCertification } from '../utils/certificationPipeline';

// P2-4: Proper type definitions for auditor certification responses
type CategoryJudgeWithJudge = Prisma.CategoryJudgeGetPayload<{
  include: {
    judge: true;
  };
}>;

type ScoreWithJudgeCriterion = Prisma.ScoreGetPayload<{
  include: {
    judge: true;
    criterion: true;
  };
}>;

@injectable()
export class AuditorCertificationService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  async getFinalCertificationStatus(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        tenantId: true,
        name: true,
        description: true,
        scoreCap: true,
        contestId: true
      }
    });

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    await ensureCertificationRecord({
      prisma: this.prisma,
      tenantId: category.tenantId,
      categoryId
    });
    const certification = await refreshRoleStages(this.prisma, category.tenantId, categoryId);

    const tallyCertifications = await this.prisma.categoryCertification.findMany({
      where: { categoryId, role: 'TALLY_MASTER' },
      // include removed - no user relation in schema
    });

    const auditorCertificationRecord = await this.prisma.categoryCertification.findFirst({
      where: { categoryId, role: 'AUDITOR' },
    });

    const categoryJudges = await this.prisma.categoryJudge.findMany({
      where: { categoryId },
      include: { judge: true }
    } as any) as CategoryJudgeWithJudge[];

    const requiredTallyCertifications = categoryJudges.length;
    const completedTallyCertifications = tallyCertifications.length;

    const canCertify = certification.tallyCertified;
    const alreadyCertified = certification.auditorCertified || !!auditorCertificationRecord;

    const allScores = await this.prisma.score.findMany({
      where: { categoryId },
      include: { judge: true, criterion: true }
    } as any) as ScoreWithJudgeCriterion[];

    const uncertifiedScores = allScores.filter(
      score => !score.isCertified && score.criterionId
    );
    const hasUncertifiedScores = uncertifiedScores.length > 0;
    const scoresCompleted = !hasUncertifiedScores;
    const readyForFinalCertification = canCertify && scoresCompleted && !alreadyCertified;

    return {
      categoryId,
      categoryName: category?.name,
      canCertify,
      readyForFinalCertification,
      alreadyCertified,
      tallyCertifications: {
        required: requiredTallyCertifications,
        completed: completedTallyCertifications,
        missing: Math.max(0, requiredTallyCertifications - completedTallyCertifications),
        certifications: tallyCertifications
      },
      scoreStatus: {
        total: allScores.length,
        uncertified: uncertifiedScores.length,
        completed: scoresCompleted
      },
      auditorCertified: alreadyCertified,
      auditorCertification: alreadyCertified ? {
        certifiedAt: auditorCertificationRecord?.certifiedAt ?? certification.certifiedAt,
        certifiedBy: auditorCertificationRecord?.userId ?? certification.certifiedBy ?? certification.userId
      } : null
    };
  }

  async submitFinalCertification(categoryId: string, userId: string, _userRole: string, confirmations: { confirmation1: boolean; confirmation2: boolean }): Promise<Prisma.CategoryCertificationGetPayload<{}>> {
    if (!confirmations.confirmation1 || !confirmations.confirmation2) {
      throw this.badRequestError('Both confirmations are required');
    }

    const status = await this.getFinalCertificationStatusInternal(categoryId);

    if (status.alreadyCertified) {
      throw this.badRequestError('Final certification has already been completed for this category');
    }

    if (!status.canCertify) {
      throw this.badRequestError('Not all required certifications are complete');
    }

    if (!status.scoresCompleted) {
      throw this.badRequestError('Not all scores have been certified yet');
    }

    const auditor = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (auditor?.role !== 'AUDITOR') {
      throw this.forbiddenError('Only AUDITOR role can submit final certification');
    }

    const synced = await refreshRoleStages(this.prisma, auditor.tenantId, categoryId, userId);
    if (!synced.tallyCertified) {
      throw this.badRequestError('Tally Master certification must be completed first');
    }
    if (synced.auditorCertified) {
      throw this.badRequestError('Final certification has already been completed for this category');
    }

    const certification = await upsertCategoryRoleCertification({
      prisma: this.prisma,
      tenantId: auditor.tenantId,
      categoryId,
      role: 'AUDITOR',
      userId
    });

    await applyCertificationStage({
      prisma: this.prisma,
      tenantId: auditor.tenantId,
      categoryId,
      role: 'AUDITOR',
      userId,
      certifiedBy: userId
    });

    await this.prisma.score.updateMany({
      where: { categoryId, isCertified: false },
      data: { isLocked: true, isCertified: true }
    });

    return certification;
  }

  private async getFinalCertificationStatusInternal(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { tenantId: true }
    });

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    const certification = await ensureCertificationRecord({
      prisma: this.prisma,
      tenantId: category.tenantId,
      categoryId
    });

    const tallyCertifications = await this.prisma.categoryCertification.findMany({
      where: { categoryId, role: 'TALLY_MASTER' }
    });

    const auditorCertification = await this.prisma.categoryCertification.findFirst({
      where: { categoryId, role: 'AUDITOR' }
    });

    const categoryJudges = await this.prisma.categoryJudge.findMany({
      where: { categoryId }
    });

    const allScores = await this.prisma.score.findMany({
      where: { categoryId }
    });

    const uncertifiedScores = allScores.filter(s => !s.isCertified && s.criterionId);
    const requiredTallyCertifications = categoryJudges.length;
    const completedTallyCertifications = tallyCertifications.length;

    return {
      canCertify: certification.tallyCertified || completedTallyCertifications >= requiredTallyCertifications,
      alreadyCertified: certification.auditorCertified || !!auditorCertification,
      scoresCompleted: uncertifiedScores.length === 0
    };
  }
}
