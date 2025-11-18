import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';

@injectable()
export class AuditorCertificationService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  async getFinalCertificationStatus(categoryId: string) {
    const tallyCertifications: any = await this.prisma.categoryCertification.findMany({
      where: { categoryId, role: 'TALLY_MASTER' },
      // include removed - no user relation in schema
    });

    const auditorCertification: any = await this.prisma.categoryCertification.findFirst({
      where: { categoryId, role: 'AUDITOR' },
      // include removed - no user relation in schema
    });

    const category: any = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        description: true,
        scoreCap: true,
        contestId: true
      }
    });

    const categoryJudges: any = await this.prisma.categoryJudge.findMany({
      where: { categoryId },
      include: { judge: true }
    } as any);

    const requiredTallyCertifications = categoryJudges.length;
    const completedTallyCertifications = tallyCertifications.length;

    const canCertify = completedTallyCertifications >= requiredTallyCertifications;
    const alreadyCertified = !!auditorCertification;

    const allScores: any = await this.prisma.score.findMany({
      where: { categoryId },
      include: { judge: true, criterion: true }
    } as any);

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
      auditorCertification: auditorCertification ? {
        certifiedAt: auditorCertification.certifiedAt,
        certifiedBy: auditorCertification.userId // Use userId instead of user relation
      } : null
    };
  }

  async submitFinalCertification(categoryId: string, userId: string, _userRole: string, confirmations: any) {
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

    const auditor: any = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (auditor?.role !== 'AUDITOR') {
      throw this.forbiddenError('Only AUDITOR role can submit final certification');
    }

    const certification: any = await this.prisma.categoryCertification.create({
      data: {
        tenantId: auditor.tenantId,
        categoryId,
        role: 'AUDITOR',
        userId
      }
    });

    await this.prisma.score.updateMany({
      where: { categoryId, isCertified: false },
      data: { isLocked: true, isCertified: true }
    });

    return certification;
  }

  private async getFinalCertificationStatusInternal(categoryId: string) {
    const tallyCertifications: any = await this.prisma.categoryCertification.findMany({
      where: { categoryId, role: 'TALLY_MASTER' }
    });

    const auditorCertification: any = await this.prisma.categoryCertification.findFirst({
      where: { categoryId, role: 'AUDITOR' }
    });

    const categoryJudges: any = await this.prisma.categoryJudge.findMany({
      where: { categoryId }
    });

    const allScores: any = await this.prisma.score.findMany({
      where: { categoryId }
    });

    const uncertifiedScores = allScores.filter(s => !s.isCertified && s.criterionId);
    const requiredTallyCertifications = categoryJudges.length;
    const completedTallyCertifications = tallyCertifications.length;

    return {
      canCertify: completedTallyCertifications >= requiredTallyCertifications,
      alreadyCertified: !!auditorCertification,
      scoresCompleted: uncertifiedScores.length === 0
    };
  }
}
