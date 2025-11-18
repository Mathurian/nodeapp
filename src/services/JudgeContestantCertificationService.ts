import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';

@injectable()
export class JudgeContestantCertificationService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  async getCertifications(judgeId?: string, categoryId?: string, contestantId?: string) {
    const where: any = {};
    if (judgeId) where.judgeId = judgeId;
    if (categoryId) where.categoryId = categoryId;
    if (contestantId) where.contestantId = contestantId;

    return await this.prisma.judgeContestantCertification.findMany({
      where,
      // include removed - no relations in schema
    });
  }

  async certify(data: any) {
    const { judgeId, categoryId, contestantId, tenantId } = data;

    if (!judgeId || !categoryId || !contestantId) {
      throw this.badRequestError('Judge ID, category ID, and contestant ID are required');
    }

    const existing: any = await this.prisma.judgeContestantCertification.findFirst({
      where: { judgeId, categoryId, contestantId }
    });

    if (existing) {
      throw this.badRequestError('Certification already exists');
    }

    return await this.prisma.judgeContestantCertification.create({
      data: { tenantId: tenantId || 'default_tenant', judgeId, categoryId, contestantId }
    });
  }

  async uncertify(id: string) {
    const cert: any = await this.prisma.judgeContestantCertification.findUnique({
      where: { id }
    });

    if (!cert) {
      throw this.notFoundError('Certification', id);
    }

    await this.prisma.judgeContestantCertification.delete({
      where: { id }
    });
  }

  async getCategoryCertificationStatus(categoryId: string) {
    // Get all certifications for this category
    const certifications: any = await this.prisma.judgeContestantCertification.findMany({
      where: { categoryId },
      // include removed - no relations in schema
    });

    // Get all judges assigned to this category
    const category: any = await this.prisma.category.findUnique({
      where: { id: categoryId },
      // include removed - no relations in schema
    });

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    // Calculate certification progress
    // Note: Need to query judges and contestants separately as relations aren't in schema
    const totalJudges = 0; // TODO: Query judges count from JudgeCategoryAssignment
    const totalContestants = 0; // TODO: Query contestants count from CategoryContestant
    const expectedCertifications = totalJudges * totalContestants;
    const completedCertifications = certifications.length;

    // Group certifications by judge
    const certificationsByJudge = certifications.reduce((acc: any, cert: any) => {
      const judgeId = cert.judgeId;
      if (!acc[judgeId]) {
        acc[judgeId] = {
          judge: cert.judge,
          certifications: []
        };
      }
      acc[judgeId].certifications.push(cert);
      return acc;
    }, {});

    // Group certifications by contestant
    const certificationsByContestant = certifications.reduce((acc: any, cert: any) => {
      const contestantId = cert.contestantId;
      if (!acc[contestantId]) {
        acc[contestantId] = {
          contestant: cert.contestant,
          certifications: []
        };
      }
      acc[contestantId].certifications.push(cert);
      return acc;
    }, {});

    return {
      categoryId,
      categoryName: category.name,
      totalJudges,
      totalContestants,
      expectedCertifications,
      completedCertifications,
      completionPercentage: expectedCertifications > 0 
        ? Math.round((completedCertifications / expectedCertifications) * 100) 
        : 0,
      certificationsByJudge: Object.values(certificationsByJudge),
      certificationsByContestant: Object.values(certificationsByContestant),
      allCertifications: certifications
    };
  }
}
