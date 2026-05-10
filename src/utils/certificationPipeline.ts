import { Certification, NotificationType, PrismaClient, UserRole } from '@prisma/client';
import { NotificationPreferenceRepository } from '../repositories/NotificationPreferenceRepository';
import { PushSubscriptionRepository } from '../repositories/PushSubscriptionRepository';
import { PushNotificationService } from '../services/PushNotificationService';

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
const REQUIRE_ALL_TALLY_KEY = 'certification_require_all_tally_masters';
const REQUIRE_ALL_AUDITOR_KEY = 'certification_require_all_auditors';

type StagePolicyRole = 'TALLY_MASTER' | 'AUDITOR';

interface StagePolicy {
  requireAllTallyMasters: boolean;
  requireAllAuditors: boolean;
}

export interface StageCompletionState {
  role: StagePolicyRole;
  requireAll: boolean;
  isComplete: boolean;
  requiredUserIds: string[];
  completedUserIds: string[];
  requiredCount: number;
  completedCount: number;
  pendingCount: number;
}

export interface ScoreCoverageRow {
  judgeId: string;
  contestantId: string;
  criterionId: string | null;
  isCertified: boolean;
  isLocked: boolean;
}

export interface JudgeScoreCoverage {
  judgeId: string;
  expected: number;
  submitted: number;
  certified: number;
  locked: number;
  scoreComplete: boolean;
}

export interface CategoryScoreCoverageSummary {
  total: number;
  submitted: number;
  certified: number;
  locked: number;
  judges: number;
  contestants: number;
  criteria: number;
  isComplete: boolean;
  perJudge: Map<string, JudgeScoreCoverage>;
}

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

const uniqueIds = (values: Array<string | null | undefined>): string[] => (
  Array.from(new Set(values.filter((value): value is string => Boolean(value))))
);

const NO_CRITERIA_ENTRY_KEY = '__NO_CRITERIA__';

export function calculateCategoryScoreCoverage({
  requiredJudgeIds,
  contestantIds,
  criterionIds,
  scores,
}: {
  requiredJudgeIds: Iterable<string>;
  contestantIds: Iterable<string>;
  criterionIds: Iterable<string>;
  scores: ScoreCoverageRow[];
}): CategoryScoreCoverageSummary {
  const judgeIds = uniqueIds(Array.from(requiredJudgeIds));
  const contestantIdList = uniqueIds(Array.from(contestantIds));
  const criterionIdList = uniqueIds(Array.from(criterionIds));
  const criterionKeys = criterionIdList.length > 0 ? criterionIdList : [NO_CRITERIA_ENTRY_KEY];
  const criterionKeySet = new Set<string>(criterionKeys);
  const judgeIdSet = new Set<string>(judgeIds);
  const contestantIdSet = new Set<string>(contestantIdList);

  const submittedKeys = new Set<string>();
  const certifiedKeys = new Set<string>();
  const lockedKeys = new Set<string>();
  const submittedKeysByJudge = new Map<string, Set<string>>();
  const certifiedKeysByJudge = new Map<string, Set<string>>();
  const lockedKeysByJudge = new Map<string, Set<string>>();

  for (const judgeId of judgeIds) {
    submittedKeysByJudge.set(judgeId, new Set<string>());
    certifiedKeysByJudge.set(judgeId, new Set<string>());
    lockedKeysByJudge.set(judgeId, new Set<string>());
  }

  for (const score of scores) {
    if (!judgeIdSet.has(score.judgeId) || !contestantIdSet.has(score.contestantId)) {
      continue;
    }

    const criterionKey = score.criterionId || NO_CRITERIA_ENTRY_KEY;
    if (!criterionKeySet.has(criterionKey)) {
      continue;
    }

    const entryKey = `${score.judgeId}:${score.contestantId}:${criterionKey}`;
    submittedKeys.add(entryKey);
    submittedKeysByJudge.get(score.judgeId)?.add(entryKey);

    if (score.isCertified) {
      certifiedKeys.add(entryKey);
      certifiedKeysByJudge.get(score.judgeId)?.add(entryKey);
    }

    if (score.isLocked) {
      lockedKeys.add(entryKey);
      lockedKeysByJudge.get(score.judgeId)?.add(entryKey);
    }
  }

  const expectedPerJudge = contestantIdList.length * criterionKeys.length;
  const perJudge = new Map<string, JudgeScoreCoverage>();
  for (const judgeId of judgeIds) {
    const submitted = submittedKeysByJudge.get(judgeId)?.size || 0;
    perJudge.set(judgeId, {
      judgeId,
      expected: expectedPerJudge,
      submitted,
      certified: certifiedKeysByJudge.get(judgeId)?.size || 0,
      locked: lockedKeysByJudge.get(judgeId)?.size || 0,
      scoreComplete: expectedPerJudge > 0 && submitted >= expectedPerJudge,
    });
  }

  const total = judgeIds.length * expectedPerJudge;

  return {
    total,
    submitted: submittedKeys.size,
    certified: certifiedKeys.size,
    locked: lockedKeys.size,
    judges: judgeIds.length,
    contestants: contestantIdList.length,
    criteria: criterionIdList.length,
    isComplete: total > 0 && submittedKeys.size >= total,
    perJudge,
  };
}

function buildScopedAssignmentFilter(categoryId: string, contestId: string, eventId: string) {
  return {
    status: 'ACTIVE',
    OR: [
      { categoryId },
      { categoryId: null, contestId },
      { categoryId: null, contestId: null, eventId }
    ]
  };
}

async function resolveStagePolicy(
  prisma: PrismaClient,
  tenantId: string,
  eventId: string
): Promise<StagePolicy> {
  const [tenantTallyRaw, tenantAuditorRaw, eventOverride] = await Promise.all([
    getSystemSettingValue(prisma, tenantId, REQUIRE_ALL_TALLY_KEY),
    getSystemSettingValue(prisma, tenantId, REQUIRE_ALL_AUDITOR_KEY),
    prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      select: {
        requireAllTallyCertifiers: true,
        requireAllAuditorCertifiers: true
      }
    })
  ]);

  const tenantRequireAllTally = parseBooleanSetting(tenantTallyRaw, true);
  const tenantRequireAllAuditors = parseBooleanSetting(tenantAuditorRaw, true);

  return {
    requireAllTallyMasters: typeof eventOverride?.requireAllTallyCertifiers === 'boolean'
      ? eventOverride.requireAllTallyCertifiers
      : tenantRequireAllTally,
    requireAllAuditors: typeof eventOverride?.requireAllAuditorCertifiers === 'boolean'
      ? eventOverride.requireAllAuditorCertifiers
      : tenantRequireAllAuditors
  };
}

async function getAssignedUserIdsForRole(
  prisma: PrismaClient,
  tenantId: string,
  categoryId: string,
  contestId: string,
  eventId: string,
  role: StagePolicyRole
): Promise<string[]> {
  const scopedFilter = buildScopedAssignmentFilter(categoryId, contestId, eventId);
  if (role === 'TALLY_MASTER') {
    const assignments = await prisma.tallyMasterAssignment.findMany({
      where: { tenantId, ...scopedFilter },
      select: {
        userId: true,
        user: {
          select: {
            isActive: true,
            role: true
          }
        }
      }
    });
    return uniqueIds(assignments
      .filter((row) => row.user?.isActive && row.user.role === 'TALLY_MASTER')
      .map((row) => row.userId));
  }

  const assignments = await prisma.auditorAssignment.findMany({
    where: { tenantId, ...scopedFilter },
    select: {
      userId: true,
      user: {
        select: {
          isActive: true,
          role: true
        }
      }
    }
  });
  return uniqueIds(assignments
    .filter((row) => row.user?.isActive && row.user.role === 'AUDITOR')
    .map((row) => row.userId));
}

export async function getStageCompletionState(
  prisma: PrismaClient,
  tenantId: string,
  categoryId: string,
  contestId: string,
  eventId: string,
  role: StagePolicyRole,
  requireAll: boolean
): Promise<StageCompletionState> {
  const [assignedUserIds, roleCertifications] = await Promise.all([
    getAssignedUserIdsForRole(prisma, tenantId, categoryId, contestId, eventId, role),
    prisma.categoryCertification.findMany({
      where: {
        tenantId,
        categoryId,
        role
      },
      select: {
        userId: true
      }
    })
  ]);

  const completedUserIds = uniqueIds(roleCertifications.map((row) => row.userId));
  const completedByUserId = new Set(completedUserIds);
  const completedAssignedCount = assignedUserIds.length > 0
    ? assignedUserIds.filter((userId) => completedByUserId.has(userId)).length
    : completedUserIds.length;

  const isComplete = assignedUserIds.length > 0
    ? (requireAll
      ? assignedUserIds.every((userId) => completedByUserId.has(userId))
      : assignedUserIds.some((userId) => completedByUserId.has(userId)))
    : completedUserIds.length > 0;

  return {
    role,
    requireAll,
    isComplete,
    requiredUserIds: assignedUserIds,
    completedUserIds,
    requiredCount: assignedUserIds.length,
    completedCount: completedAssignedCount,
    pendingCount: assignedUserIds.length > 0 ? Math.max(assignedUserIds.length - completedAssignedCount, 0) : 0
  };
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
        ...buildScopedAssignmentFilter(category.id, category.contestId, category.contest.eventId)
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
        ...buildScopedAssignmentFilter(category.id, category.contestId, category.contest.eventId)
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

  const metadata = JSON.stringify({
    stage,
    categoryId: category.id,
    contestId: category.contestId,
    eventId: category.contest.eventId
  });

  const createResults = await Promise.allSettled(
    uniqueRecipientIds.map((userId) =>
      prisma.notification.create({
        data: {
          tenantId,
          userId,
          type: NotificationType.INFO,
          title,
          message,
          link: '/certifications',
          metadata,
          sentBy: actorUserId ?? null
        }
      })
    )
  );

  const createdNotifications = createResults.flatMap((result) => (
    result.status === 'fulfilled'
      ? [{ id: result.value.id, userId: result.value.userId }]
      : []
  ));

  if (createdNotifications.length === 0) {
    return;
  }

  try {
    const pushNotificationService = new PushNotificationService(
      new PushSubscriptionRepository(prisma),
      new NotificationPreferenceRepository(prisma)
    );

    const pushDispatch = await pushNotificationService.dispatchToUsers(
      tenantId,
      uniqueRecipientIds,
      {
        title,
        message,
        link: '/certifications',
        type: NotificationType.INFO
      }
    );

    if (pushDispatch.deliveredUsers.length > 0) {
      const deliveredUserIds = new Set(pushDispatch.deliveredUsers);
      const pushSentNotificationIds = createdNotifications
        .filter((notification) => deliveredUserIds.has(notification.userId))
        .map((notification) => notification.id);

      if (pushSentNotificationIds.length > 0) {
        await prisma.notification.updateMany({
          where: {
            id: { in: pushSentNotificationIds }
          },
          data: {
            pushSent: true,
            pushSentAt: new Date()
          }
        });
      }
    }
  } catch {
    // Push delivery errors should never block certification state changes.
  }
}

export async function ensureCertificationRecord({
  prisma,
  tenantId,
  categoryId,
  userId = null
}: EnsureCertificationOptions): Promise<Certification> {
  let category = await prisma.category.findFirst({
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

  if (!category) {
    category = await prisma.category.findUnique({
      where: { id: categoryId },
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
  }

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
  actorUserId?: string | null,
  suppressNotifications: boolean = false
): Promise<Certification> {
  const certification = await ensureCertificationRecord({ prisma, tenantId, categoryId });
  let category = await prisma.category.findFirst({
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

  if (!category) {
    category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        contestId: true,
        contest: {
          select: {
            eventId: true
          }
        }
      }
    });
  }

  if (!category || !category.contest?.eventId) {
    throw new Error('Category not found');
  }

  const [
    requiredJudgesFromCategory,
    requiredJudgesFromAssignments,
    categoryContestants,
    criteria,
    scores,
  ] = await Promise.all([
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
    ,
    prisma.categoryContestant.findMany({
      where: {
        tenantId,
        categoryId,
      },
      select: {
        contestantId: true,
      }
    }),
    prisma.criterion.findMany({
      where: {
        tenantId,
        categoryId,
      },
      select: {
        id: true,
      }
    }),
    prisma.score.findMany({
      where: {
        tenantId,
        categoryId,
      },
      select: {
        judgeId: true,
        contestantId: true,
        criterionId: true,
        isCertified: true,
        isLocked: true,
      }
    })
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

  const scoreCoverage = calculateCategoryScoreCoverage({
    requiredJudgeIds,
    contestantIds: categoryContestants.map((row) => row.contestantId),
    criterionIds: criteria.map((row) => row.id),
    scores,
  });

  const judgeCertified = requiredJudgeIds.size > 0
    ? Array.from(requiredJudgeIds).every(
      (judgeId) => certifiedJudgeIds.has(judgeId) && Boolean(scoreCoverage.perJudge.get(judgeId)?.scoreComplete)
    )
    : false;

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
  if (!suppressNotifications && !certification.judgeCertified && updated.judgeCertified) {
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

interface UpsertCategoryRoleCertificationOptions {
  prisma: PrismaClient;
  tenantId: string;
  categoryId: string;
  role: string;
  userId: string;
  signatureName?: string | null;
  comments?: string | null;
  boardRoleSnapshot?: string | null;
}

export async function upsertCategoryRoleCertification({
  prisma,
  tenantId,
  categoryId,
  role,
  userId,
  signatureName = null,
  comments = null,
  boardRoleSnapshot = null
}: UpsertCategoryRoleCertificationOptions) {
  const existing = await prisma.categoryCertification.findFirst({
    where: {
      tenantId,
      categoryId,
      role,
      userId
    },
    select: { id: true }
  });

  if (existing) {
    return prisma.categoryCertification.update({
      where: { id: existing.id },
      data: {
        signatureName,
        comments,
        boardRoleSnapshot,
        certifiedAt: new Date()
      }
    });
  }

  return prisma.categoryCertification.create({
    data: {
      tenantId,
      categoryId,
      role,
      userId,
      signatureName,
      comments,
      boardRoleSnapshot
    }
  });
}

export async function refreshRoleStages(
  prisma: PrismaClient,
  tenantId: string,
  categoryId: string,
  actorUserId?: string | null,
  suppressNotifications: boolean = false
): Promise<Certification> {
  const judgeSynced = await refreshJudgeStage(prisma, tenantId, categoryId, actorUserId, suppressNotifications);
  const stagePolicy = await resolveStagePolicy(prisma, tenantId, judgeSynced.eventId);
  const [tallyState, auditorState] = await Promise.all([
    getStageCompletionState(
      prisma,
      tenantId,
      categoryId,
      judgeSynced.contestId,
      judgeSynced.eventId,
      'TALLY_MASTER',
      stagePolicy.requireAllTallyMasters
    ),
    getStageCompletionState(
      prisma,
      tenantId,
      categoryId,
      judgeSynced.contestId,
      judgeSynced.eventId,
      'AUDITOR',
      stagePolicy.requireAllAuditors
    )
  ]);

  const tallyCertified = judgeSynced.judgeCertified && tallyState.isComplete;
  const auditorCertified = tallyCertified && auditorState.isComplete;
  const currentStep = judgeSynced.boardApproved
    ? 4
    : auditorCertified
      ? 4
      : tallyCertified
        ? 3
        : judgeSynced.judgeCertified
          ? 2
          : 1;
  const status = judgeSynced.boardApproved
    ? 'CERTIFIED'
    : (judgeSynced.judgeCertified || tallyCertified || auditorCertified)
      ? 'IN_PROGRESS'
      : 'PENDING';

  const updated = await prisma.certification.update({
    where: { id: judgeSynced.id },
    data: {
      tallyCertified,
      auditorCertified,
      currentStep,
      status
    }
  });

  if (!suppressNotifications && !judgeSynced.tallyCertified && updated.tallyCertified) {
    await sendStageNotification({
      prisma,
      tenantId,
      categoryId,
      stage: 'TALLY_CERTIFIED',
      actorUserId
    });
  }

  if (!suppressNotifications && !judgeSynced.auditorCertified && updated.auditorCertified) {
    await sendStageNotification({
      prisma,
      tenantId,
      categoryId,
      stage: 'AUDITOR_CERTIFIED',
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
  await ensureCertificationRecord({ prisma, tenantId, categoryId, userId });
  let certification = await refreshRoleStages(prisma, tenantId, categoryId, userId);

  if (role === 'TALLY_MASTER' && !certification.judgeCertified) {
    throw new Error('Judge certification must be completed first');
  }

  if (role === 'AUDITOR' && !certification.tallyCertified) {
    throw new Error('Tally Master certification must be completed first');
  }

  if (isFinalApprovalRole(role) && !certification.auditorCertified) {
    throw new Error('Auditor certification must be completed first');
  }

  if (comments !== null && comments !== certification.comments) {
    certification = await prisma.certification.update({
      where: { id: certification.id },
      data: {
        comments
      }
    });
  }

  if (!isFinalApprovalRole(role)) {
    return refreshRoleStages(prisma, tenantId, categoryId, userId);
  }

  const boardUpdated = await prisma.certification.update({
    where: { id: certification.id },
    data: {
      boardApproved: true,
      status: 'CERTIFIED',
      certifiedAt: new Date(),
      certifiedBy: certifiedBy ?? userId ?? null,
      currentStep: 4,
      comments: comments ?? certification.comments
    }
  });

  if (!certification.boardApproved && boardUpdated.boardApproved) {
    await sendStageNotification({
      prisma,
      tenantId,
      categoryId,
      stage: 'BOARD_APPROVED',
      actorUserId: userId
    });
  }

  return boardUpdated;
}
