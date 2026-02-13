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
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      tenantId,
      deletedAt: null
    },
    select: {
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

  const [requiredJudgesFromCategory, requiredJudgesFromAssignments] = await Promise.all([
    prisma.categoryJudge.findMany({
      where: {
        categoryId,
        category: {
          tenantId,
          deletedAt: null
        }
      },
      select: {
        judgeId: true
      }
    }),
    prisma.assignment.groupBy({
      by: ['judgeId'],
      where: {
        tenantId,
        status: 'ACTIVE',
        OR: [
          { categoryId },
          { categoryId: null, contestId: category.contestId },
          { categoryId: null, eventId: category.contest.eventId }
        ]
      }
    }).then((rows) => rows.map((row) => row.judgeId))
  ]);

  const requiredJudgeIds = new Set<string>(
    (requiredJudgesFromCategory.length > 0
      ? requiredJudgesFromCategory.map((row) => row.judgeId)
      : requiredJudgesFromAssignments
    ).filter(Boolean)
  );

  const certifiedJudgeIds = new Set<string>(
    await prisma.judgeCertification.findMany({
      where: {
        categoryId,
        tenantId,
        ...(requiredJudgeIds.size > 0 ? { judgeId: { in: Array.from(requiredJudgeIds) } } : {})
      },
      select: {
        judgeId: true
      }
    }).then((rows) => rows.map((row) => row.judgeId))
  );

  const judgeCertified = requiredJudgeIds.size > 0
    ? Array.from(requiredJudgeIds).every((judgeId) => certifiedJudgeIds.has(judgeId))
    : certifiedJudgeIds.size > 0;

  const currentStep = certification.boardApproved
    ? 4
    : certification.auditorCertified
      ? 4
      : certification.tallyCertified
        ? 3
        : judgeCertified
          ? 2
          : 1;
  const status = certification.boardApproved
    ? 'CERTIFIED'
    : (judgeCertified || certification.tallyCertified || certification.auditorCertified)
      ? 'IN_PROGRESS'
      : 'PENDING';

  return prisma.certification.update({
    where: { id: certification.id },
    data: {
      judgeCertified,
      currentStep,
      status
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
