import { Certification, NotificationType, Prisma, PrismaClient, UserRole } from '@prisma/client';

type StageRole = 'JUDGE' | 'TALLY_MASTER' | 'AUDITOR' | 'BOARD' | 'ORGANIZER' | 'ADMIN';
type StageNotification = 'JUDGE_CERTIFIED' | 'TALLY_CERTIFIED' | 'AUDITOR_CERTIFIED' | 'BOARD_APPROVED';

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

const isFinalApprovalRole = (role: StageRole): boolean => {
  return role === 'BOARD' || role === 'ORGANIZER' || role === 'ADMIN';
};

const ALERT_ENABLED_KEY = 'alerts_scoring_enabled';
const ALERT_JUDGE_KEY = 'alerts_scoring_on_judge_certified';
const ALERT_CATEGORY_KEY = 'alerts_scoring_on_category_certified';

const parseBooleanSetting = (value: string | null | undefined, fallback: boolean): boolean => {
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const parseStringArraySetting = (value: string | null | undefined): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
};

async function getSystemSettingValue(
  prisma: PrismaClient,
  tenantId: string,
  key: string
): Promise<string | null> {
  const tenantScoped = await prisma.systemSetting.findFirst({
    where: { key, tenantId },
    select: { value: true }
  });
  if (tenantScoped?.value != null) return tenantScoped.value;

  const globalScoped = await prisma.systemSetting.findFirst({
    where: { key, tenantId: null },
    select: { value: true }
  });
  return globalScoped?.value ?? null;
}

async function sendStageNotification({
  prisma,
  tenantId,
  categoryId,
  stage,
  actorUserId
}: {
  prisma: PrismaClient;
  tenantId: string;
  categoryId: string;
  stage: StageNotification;
  actorUserId?: string | null;
}): Promise<void> {
  const [alertsEnabledRaw, judgeNotifyRaw, categoryNotifyRaw, recipientRolesRaw, recipientUsersRaw] = await Promise.all([
    getSystemSettingValue(prisma, tenantId, ALERT_ENABLED_KEY),
    getSystemSettingValue(prisma, tenantId, ALERT_JUDGE_KEY),
    getSystemSettingValue(prisma, tenantId, ALERT_CATEGORY_KEY),
    getSystemSettingValue(prisma, tenantId, 'alerts_scoring_recipient_roles'),
    getSystemSettingValue(prisma, tenantId, 'alerts_scoring_recipient_user_ids')
  ]);

  const alertsEnabled = parseBooleanSetting(alertsEnabledRaw, true);
  if (!alertsEnabled) return;

  if (stage === 'JUDGE_CERTIFIED' && !parseBooleanSetting(judgeNotifyRaw, true)) return;
  if (stage !== 'JUDGE_CERTIFIED' && !parseBooleanSetting(categoryNotifyRaw, true)) return;

  const category = await prisma.category.findFirst({
    where: { id: categoryId, tenantId, deletedAt: null },
    select: {
      id: true,
      name: true,
      contestId: true,
      contest: {
        select: {
          name: true,
          eventId: true,
          event: { select: { name: true } }
        }
      }
    }
  });
  if (!category || !category.contest) return;

  let recipients: { id: string; role: UserRole }[] = [];

  if (stage === 'JUDGE_CERTIFIED') {
    const scopedAssignments = await prisma.tallyMasterAssignment.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        OR: [
          { categoryId: category.id },
          { categoryId: null, contestId: category.contestId },
          { categoryId: null, eventId: category.contest.eventId }
        ]
      },
      select: { userId: true }
    });
    const scopedUserIds = Array.from(new Set(scopedAssignments.map((a) => a.userId).filter(Boolean)));
    recipients = await prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        role: 'TALLY_MASTER',
        ...(scopedUserIds.length > 0 ? { id: { in: scopedUserIds } } : {})
      },
      select: { id: true, role: true }
    });
  } else if (stage === 'TALLY_CERTIFIED') {
    const scopedAssignments = await prisma.auditorAssignment.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        OR: [
          { categoryId: category.id },
          { categoryId: null, contestId: category.contestId },
          { categoryId: null, eventId: category.contest.eventId }
        ]
      },
      select: { userId: true }
    });
    const scopedUserIds = Array.from(new Set(scopedAssignments.map((a) => a.userId).filter(Boolean)));
    recipients = await prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        role: 'AUDITOR',
        ...(scopedUserIds.length > 0 ? { id: { in: scopedUserIds } } : {})
      },
      select: { id: true, role: true }
    });
  } else if (stage === 'AUDITOR_CERTIFIED') {
    recipients = await prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        role: { in: ['BOARD', 'ORGANIZER', 'ADMIN', 'SUPER_ADMIN'] }
      },
      select: { id: true, role: true }
    });
  } else if (stage === 'BOARD_APPROVED') {
    recipients = await prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        role: 'EMCEE'
      },
      select: { id: true, role: true }
    });
  }

  const allowedRoles = parseStringArraySetting(recipientRolesRaw) as UserRole[];
  let recipientIds = recipients
    .filter((r) => (allowedRoles.length > 0 ? allowedRoles.includes(r.role) : true))
    .map((r) => r.id);

  const explicitUserIds = parseStringArraySetting(recipientUsersRaw);
  if (explicitUserIds.length > 0) {
    const explicitUsers = await prisma.user.findMany({
      where: {
        tenantId,
        id: { in: explicitUserIds },
        isActive: true
      },
      select: { id: true }
    });
    recipientIds = [...recipientIds, ...explicitUsers.map((u) => u.id)];
  }

  const uniqueRecipientIds = Array.from(new Set(recipientIds)).filter((id) => id !== actorUserId);
  if (uniqueRecipientIds.length === 0) return;

  const stageText = stage === 'JUDGE_CERTIFIED'
    ? 'Judge certification is complete and ready for tally review'
    : stage === 'TALLY_CERTIFIED'
      ? 'Tally certification is complete and ready for auditor review'
      : stage === 'AUDITOR_CERTIFIED'
        ? 'Auditor certification is complete and ready for board/organizer/admin review'
        : 'Board certification is complete for this category';

  const title = stage === 'BOARD_APPROVED' ? 'Board Certification Complete' : 'Certification Stage Ready';
  const message = `${stageText}: ${category.contest.event.name} / ${category.contest.name} / ${category.name}`;

  await prisma.notification.createMany({
    data: uniqueRecipientIds.map((userId) => ({
      tenantId,
      userId,
      type: NotificationType.INFO,
      title,
      message,
      link: '/certifications',
      metadata: JSON.stringify({
        stage,
        categoryId: category.id,
        contestId: category.contestId,
        eventId: category.contest.eventId
      }),
      sentBy: actorUserId ?? null
    }))
  }).catch(() => undefined);
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
  categoryId: string,
  actorUserId?: string | null
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
          { categoryId: null, contestId: category.contestId }
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

  const updated = await prisma.certification.update({
    where: { id: certification.id },
    data: {
      judgeCertified,
      currentStep,
      status
    }
  });
  if (!certification.judgeCertified && updated.judgeCertified) {
    await sendStageNotification({
      prisma,
      tenantId,
      categoryId,
      stage: 'JUDGE_CERTIFIED',
      actorUserId
    });
  }
  return updated;
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

  if (isFinalApprovalRole(role) && !certification.auditorCertified) {
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
  } else if (isFinalApprovalRole(role)) {
    data.boardApproved = true;
    data.status = 'CERTIFIED';
    data.certifiedAt = new Date();
    data.certifiedBy = certifiedBy ?? userId ?? null;
    data.currentStep = 4;
  }

  const updated = await prisma.certification.update({
    where: { id: certification.id },
    data
  });
  if (role === 'JUDGE' && !certification.judgeCertified && updated.judgeCertified) {
    await sendStageNotification({ prisma, tenantId, categoryId, stage: 'JUDGE_CERTIFIED', actorUserId: userId });
  } else if (role === 'TALLY_MASTER' && !certification.tallyCertified && updated.tallyCertified) {
    await sendStageNotification({ prisma, tenantId, categoryId, stage: 'TALLY_CERTIFIED', actorUserId: userId });
  } else if (role === 'AUDITOR' && !certification.auditorCertified && updated.auditorCertified) {
    await sendStageNotification({ prisma, tenantId, categoryId, stage: 'AUDITOR_CERTIFIED', actorUserId: userId });
  } else if (isFinalApprovalRole(role) && !certification.boardApproved && updated.boardApproved) {
    await sendStageNotification({ prisma, tenantId, categoryId, stage: 'BOARD_APPROVED', actorUserId: userId });
  }
  return updated;
}
