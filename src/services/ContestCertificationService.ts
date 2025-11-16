import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';

@injectable()
export class ContestCertificationService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  async getCertificationProgress(contestId: string) {
    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId },
      select: {
        id: true,
        name: true,
        description: true,
        eventId: true
      }
    });

    if (!contest) throw this.notFoundError('Contest', contestId);

    const certs = await this.prisma.contestCertification.findMany({
      where: { contestId }
    });

    const byRole = certs.reduce((acc: any, c) => {
      acc[c.role] = c;
      return acc;
    }, {});

    return {
      contestId,
      tallyMaster: !!byRole['TALLY_MASTER'],
      auditor: !!byRole['AUDITOR'],
      board: !!byRole['BOARD'],
      organizer: !!byRole['ORGANIZER'],
      certifications: certs
    };
  }

  async certifyContest(contestId: string, userId: string, userRole: string) {
    const allowedRoles = ['TALLY_MASTER', 'AUDITOR', 'BOARD', 'ORGANIZER'];

    if (!allowedRoles.includes(userRole)) {
      throw this.forbiddenError('Role not authorized to certify contest');
    }

    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId }
    });

    if (!contest) throw this.notFoundError('Contest', contestId);

    const existing = await this.prisma.contestCertification.findFirst({
      where: { contestId, role: userRole }
    });

    if (existing) {
      throw this.badRequestError('Contest already certified for this role');
    }

    return await this.prisma.contestCertification.create({
      data: {
        contestId,
        role: userRole,
        userId
      }
    });
  }
}
