import { Certification, Prisma, PrismaClient } from '@prisma/client';

type StageRole = 'JUDGE' | 'TALLY_MASTER' | 'AUDITOR' | 'BOARD';

interface EnsureCertificationOptions {
  prisma: PrismaClient;
  tenantId: string;
  categoryId: string;
  userId?: string | null;
}

interface ApplyStageOptions extends EnsureCertificationOptions {
  role: StageRole;
  comments?: string | null;
  certifiedBy?: string | null;
}

export async function ensureCertificationRecord({
  prisma,
  tenantId,
  categoryId,
  userId = null
}: EnsureCertificationOptions): Promise<Certification> {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      tenantId,
      deletedAt: null
    },
    select: {
      id: true,
      contestId: true,
      contest: {
        select: {
          eventId: true
        }
      }
    }
  });

  if (!category || !category.contest?.eventId) {
    throw new Error('Category not found');
  }

  return prisma.certification.upsert({
    where: {
      tenantId_categoryId_contestId_eventId: {
        tenantId,
        categoryId: category.id,
        contestId: category.contestId,
        eventId: category.contest.eventId
      }
    },
    create: {
      tenantId,
      categoryId: category.id,
      contestId: category.contestId,
      eventId: category.contest.eventId,
      userId,
      status: 'PENDING',
      currentStep: 1,
      totalSteps: 4
    },
    update: {}
  });
}

export async function refreshJudgeStage(
  prisma: PrismaClient,
  tenantId: string,
  categoryId: string
): Promise<Certification> {
  const certification = await ensureCertificationRecord({ prisma, tenantId, categoryId });

  const [requiredJudgeCountFromCategory, requiredJudgeCountFromAssignments, certifiedJudgeCount] = await Promise.all([
    prisma.categoryJudge.count({
      where: {
        categoryId,
        category: {
          tenantId,
          deletedAt: null
        }
      }
    }),
    prisma.assignment.groupBy({
      by: ['judgeId'],
      where: {
        tenantId,
        categoryId,
        status: 'ACTIVE'
      }
    }).then((rows) => rows.length),
    prisma.judgeCertification.groupBy({
      by: ['judgeId'],
      where: {
        categoryId,
        tenantId
      }
    }).then((rows) => rows.length)
  ]);

  const effectiveJudgeCount = requiredJudgeCountFromCategory > 0
    ? requiredJudgeCountFromCategory
    : requiredJudgeCountFromAssignments;
  const judgeCertified = effectiveJudgeCount > 0
    ? certifiedJudgeCount >= effectiveJudgeCount
    : certifiedJudgeCount > 0;

  return prisma.certification.update({
    where: { id: certification.id },
    data: {
      judgeCertified,
      currentStep: judgeCertified ? Math.max(certification.currentStep, 2) : certification.currentStep,
      status: certification.boardApproved
        ? 'CERTIFIED'
        : (judgeCertified ? 'IN_PROGRESS' : certification.status)
    }
  });
}

export async function applyCertificationStage({
  prisma,
  tenantId,
  categoryId,
  role,
  comments = null,
  certifiedBy = null,
  userId = null
}: ApplyStageOptions): Promise<Certification> {
  let certification = await ensureCertificationRecord({ prisma, tenantId, categoryId, userId });

  if (role === 'TALLY_MASTER') {
    certification = await refreshJudgeStage(prisma, tenantId, categoryId);
    if (!certification.judgeCertified) {
      throw new Error('Judge certification must be completed first');
    }
  }

  if (role === 'AUDITOR' && !certification.tallyCertified) {
    throw new Error('Tally Master certification must be completed first');
  }

  if (role === 'BOARD' && !certification.auditorCertified) {
    throw new Error('Auditor certification must be completed first');
  }

  const data: Prisma.CertificationUpdateInput = {
    comments: comments ?? certification.comments
  };

  if (role === 'JUDGE') {
    data.judgeCertified = true;
    data.currentStep = Math.max(certification.currentStep, 2);
    data.status = certification.boardApproved ? 'CERTIFIED' : 'IN_PROGRESS';
  } else if (role === 'TALLY_MASTER') {
    data.tallyCertified = true;
    data.currentStep = Math.max(certification.currentStep, 3);
    data.status = certification.boardApproved ? 'CERTIFIED' : 'IN_PROGRESS';
  } else if (role === 'AUDITOR') {
    data.auditorCertified = true;
    data.currentStep = Math.max(certification.currentStep, 4);
    data.status = certification.boardApproved ? 'CERTIFIED' : 'IN_PROGRESS';
  } else if (role === 'BOARD') {
    data.boardApproved = true;
    data.status = 'CERTIFIED';
    data.certifiedAt = new Date();
    data.certifiedBy = certifiedBy ?? userId ?? null;
    data.currentStep = 4;
  }

  return prisma.certification.update({
    where: { id: certification.id },
    data
  });
}
