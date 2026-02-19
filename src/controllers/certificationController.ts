import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { sendSuccess, sendNotFound, sendBadRequest, sendConflict } from '../utils/responseHelpers';
import { PrismaClient } from '@prisma/client';
import { applyCertificationStage, refreshJudgeStage } from '../utils/certificationPipeline';

export class CertificationController {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  getAllCertifications = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 50;
      const status = req.query['status'] as string | undefined;
      const eventId = req.query['eventId'] as string | undefined;
      const contestId = req.query['contestId'] as string | undefined;
      const categoryId = req.query['categoryId'] as string | undefined;

      const skip = (page - 1) * limit;
      const tenantId = (req as any).tenantId || req.user?.tenantId;
      const where: any = { tenantId };

      if (status) where.status = status;
      if (eventId) where.eventId = eventId;
      if (contestId) where.contestId = contestId;
      if (categoryId) where.categoryId = categoryId;
      if (req.user?.role === 'JUDGE') where.userId = req.user.id;

      const [certifications, total] = await Promise.all([
        this.prisma.certification.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.certification.count({ where })
      ]);

      const categoryIds = Array.from(new Set(certifications.map((c) => c.categoryId)));
      const contestIds = Array.from(new Set(certifications.map((c) => c.contestId)));
      const eventIds = Array.from(new Set(certifications.map((c) => c.eventId)));

      const [categories, contests, events] = await Promise.all([
        this.prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true }
        }),
        this.prisma.contest.findMany({
          where: { id: { in: contestIds } },
          select: { id: true, name: true }
        }),
        this.prisma.event.findMany({
          where: { id: { in: eventIds } },
          select: { id: true, name: true }
        })
      ]);

      const categoryById = new Map(categories.map((c) => [c.id, c.name]));
      const contestById = new Map(contests.map((c) => [c.id, c.name]));
      const eventById = new Map(events.map((e) => [e.id, e.name]));

      const enriched = certifications.map((cert) => ({
        ...cert,
        categoryName: categoryById.get(cert.categoryId) || null,
        contestName: contestById.get(cert.contestId) || null,
        eventName: eventById.get(cert.eventId) || null
      }));

      return sendSuccess(res, {
        certifications: enriched,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + limit < total
        }
      });
    } catch (error) {
      return next(error);
    }
  };

  createCertification = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { categoryId, contestId, eventId, comments } = req.body;

      if (!categoryId || !contestId || !eventId) {
        return sendBadRequest(res, 'categoryId, contestId, and eventId are required');
      }

      // Check if certification already exists for this combination
      const existing = await this.prisma.certification.findUnique({
        where: {
          tenantId_categoryId_contestId_eventId: {
            tenantId: (req as any).tenantId!,
            categoryId,
            contestId,
            eventId
          }
        }
      });

      if (existing) {
        return sendConflict(res, 'Certification already exists for this category/contest/event');
      }

      // SECURITY FIX #12: Defense in depth - validate tenant ownership
      const tenantId = (req as any).tenantId!;
      const [category, contest, event] = await Promise.all([
        this.prisma.category.findFirst({ where: { id: categoryId, tenantId } }),
        this.prisma.contest.findFirst({ where: { id: contestId, tenantId } }),
        this.prisma.event.findFirst({ where: { id: eventId, tenantId } })
      ]);

      if (!category) {
        return sendNotFound(res, 'Category not found or access denied');
      }
      if (!contest) {
        return sendNotFound(res, 'Contest not found or access denied');
      }
      if (!event) {
        return sendNotFound(res, 'Event not found or access denied');
      }

      const certification = await this.prisma.certification.create({
        data: {
          tenantId: (req as any).tenantId!,
          categoryId,
          contestId,
          eventId,
          userId: req.user?.id || null,
          status: 'PENDING',
          currentStep: 1,
          totalSteps: 4,
          comments: comments || null
        },
      });

      return sendSuccess(res, certification, 'Certification created successfully', 201);
    } catch (error) {
      return next(error);
    }
  };

  updateCertification = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { status, comments, totalSteps } = req.body;

      const existing = await this.prisma.certification.findUnique({
        where: { id }
      });

      if (!existing) {
        return sendNotFound(res, 'Certification not found');
      }

      const updateData: any = {};
      if (status !== undefined) updateData.status = status;
      if (comments !== undefined) updateData.comments = comments;
      if (totalSteps !== undefined) updateData.totalSteps = totalSteps;

      const certification = await this.prisma.certification.update({
        where: { id },
        data: updateData,
      });

      return sendSuccess(res, certification, 'Certification updated successfully');
    } catch (error) {
      return next(error);
    }
  };

  deleteCertification = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;

      const certification = await this.prisma.certification.findUnique({
        where: { id }
      });

      if (!certification) {
        return sendNotFound(res, 'Certification not found');
      }

      await this.prisma.certification.delete({
        where: { id }
      });

      return sendSuccess(res, {}, 'Certification deleted successfully');
    } catch (error) {
      return next(error);
    }
  };

  getCertificationById = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const tenantId = (req as any).tenantId || req.user?.tenantId;

      const certification = await this.prisma.certification.findUnique({
        where: { id },
      });

      if (!certification || certification.tenantId !== tenantId) {
        return sendNotFound(res, 'Certification not found');
      }

      return sendSuccess(res, certification);
    } catch (error) {
      return next(error);
    }
  };

  certifyJudge = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { comments, typedSignature, drawnSignatureData, signatureFilePath, signatureName } = req.body;
      const tenantId = (req as any).tenantId || req.user?.tenantId;
      if (!tenantId) {
        return sendBadRequest(res, 'Tenant context is required');
      }
      if (!typedSignature && !drawnSignatureData && !signatureFilePath && !signatureName) {
        return sendBadRequest(res, 'A typed, drawn, or file signature is required for judge certification');
      }

      const certification = await this.prisma.certification.findUnique({
        where: { id }
      });

      if (!certification || certification.tenantId !== tenantId) {
        return sendNotFound(res, 'Certification not found');
      }

      if (certification.judgeCertified) {
        return sendBadRequest(res, 'Judge certification already completed');
      }

      await this.prisma.judgeCertification.upsert({
        where: {
          tenantId_categoryId_judgeId: {
            tenantId,
            categoryId: certification.categoryId,
            judgeId: req.user?.judgeId || req.user?.judge?.id || ''
          }
        },
        create: {
          tenantId,
          categoryId: certification.categoryId,
          judgeId: req.user?.judgeId || req.user?.judge?.id || '',
          signatureName: typedSignature || signatureName || (drawnSignatureData ? 'DRAWN_SIGNATURE' : 'Judge Certification')
        },
        update: {
          signatureName: typedSignature || signatureName || (drawnSignatureData ? 'DRAWN_SIGNATURE' : 'Judge Certification'),
          certifiedAt: new Date()
        }
      }).catch(() => undefined)

      const updated = await applyCertificationStage({
        prisma: this.prisma,
        tenantId,
        categoryId: certification.categoryId,
        role: 'JUDGE',
        comments: comments || certification.comments,
        userId: req.user?.id || null,
        certifiedBy: req.user?.id || null
      });

      await refreshJudgeStage(this.prisma, tenantId, certification.categoryId, req.user?.id || null);

      return sendSuccess(res, updated, 'Judge certification completed successfully');
    } catch (error) {
      return next(error);
    }
  };

  certifyTally = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { comments, typedSignature, drawnSignatureData, signatureFilePath, signatureName } = req.body;
      const tenantId = (req as any).tenantId || req.user?.tenantId;
      if (!tenantId) {
        return sendBadRequest(res, 'Tenant context is required');
      }
      if (!typedSignature && !drawnSignatureData && !signatureFilePath && !signatureName) {
        return sendBadRequest(res, 'A typed, drawn, or file signature is required for tally certification');
      }

      const certification = await this.prisma.certification.findUnique({
        where: { id }
      });

      if (!certification || certification.tenantId !== tenantId) {
        return sendNotFound(res, 'Certification not found');
      }

      if (!certification.judgeCertified) {
        return sendBadRequest(res, 'Judge must certify first');
      }

      if (certification.tallyCertified) {
        return sendBadRequest(res, 'Tally Master certification already completed');
      }

      await this.prisma.categoryCertification.upsert({
        where: {
          tenantId_categoryId_role: {
            tenantId,
            categoryId: certification.categoryId,
            role: 'TALLY_MASTER'
          }
        },
        create: {
          tenantId,
          categoryId: certification.categoryId,
          role: 'TALLY_MASTER',
          userId: req.user?.id || '',
          boardRoleSnapshot: req.user?.role === 'BOARD' ? (req.user.boardRole || null) : null,
          signatureName: typedSignature || signatureName || (drawnSignatureData ? 'DRAWN_SIGNATURE' : null),
          comments: comments || null
        },
        update: {
          userId: req.user?.id || '',
          boardRoleSnapshot: req.user?.role === 'BOARD' ? (req.user.boardRole || null) : null,
          signatureName: typedSignature || signatureName || (drawnSignatureData ? 'DRAWN_SIGNATURE' : null),
          certifiedAt: new Date(),
          comments: comments || null
        }
      });

      const updated = await applyCertificationStage({
        prisma: this.prisma,
        tenantId,
        categoryId: certification.categoryId,
        role: 'TALLY_MASTER',
        comments: comments || certification.comments,
        userId: req.user?.id || null,
        certifiedBy: req.user?.id || null
      });

      return sendSuccess(res, updated, 'Tally Master certification completed successfully');
    } catch (error) {
      return next(error);
    }
  };

  certifyAuditor = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { comments, typedSignature, drawnSignatureData, signatureFilePath, signatureName } = req.body;
      const tenantId = (req as any).tenantId || req.user?.tenantId;
      if (!tenantId) {
        return sendBadRequest(res, 'Tenant context is required');
      }
      if (!typedSignature && !drawnSignatureData && !signatureFilePath && !signatureName) {
        return sendBadRequest(res, 'A typed, drawn, or file signature is required for auditor certification');
      }

      const certification = await this.prisma.certification.findUnique({
        where: { id }
      });

      if (!certification || certification.tenantId !== tenantId) {
        return sendNotFound(res, 'Certification not found');
      }

      if (!certification.tallyCertified) {
        return sendBadRequest(res, 'Tally Master must certify first');
      }

      if (certification.auditorCertified) {
        return sendBadRequest(res, 'Auditor certification already completed');
      }

      await this.prisma.categoryCertification.upsert({
        where: {
          tenantId_categoryId_role: {
            tenantId,
            categoryId: certification.categoryId,
            role: 'AUDITOR'
          }
        },
        create: {
          tenantId,
          categoryId: certification.categoryId,
          role: 'AUDITOR',
          userId: req.user?.id || '',
          boardRoleSnapshot: req.user?.role === 'BOARD' ? (req.user.boardRole || null) : null,
          signatureName: typedSignature || signatureName || (drawnSignatureData ? 'DRAWN_SIGNATURE' : null),
          comments: comments || null
        },
        update: {
          userId: req.user?.id || '',
          boardRoleSnapshot: req.user?.role === 'BOARD' ? (req.user.boardRole || null) : null,
          signatureName: typedSignature || signatureName || (drawnSignatureData ? 'DRAWN_SIGNATURE' : null),
          certifiedAt: new Date(),
          comments: comments || null
        }
      });

      const updated = await applyCertificationStage({
        prisma: this.prisma,
        tenantId,
        categoryId: certification.categoryId,
        role: 'AUDITOR',
        comments: comments || certification.comments,
        userId: req.user?.id || null,
        certifiedBy: req.user?.id || null
      });

      return sendSuccess(res, updated, 'Auditor certification completed successfully');
    } catch (error) {
      return next(error);
    }
  };

  approveBoard = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { comments, typedSignature, drawnSignatureData, signatureFilePath, signatureName } = req.body;
      const tenantId = (req as any).tenantId || req.user?.tenantId;
      if (!tenantId) {
        return sendBadRequest(res, 'Tenant context is required');
      }
      if (!typedSignature && !drawnSignatureData && !signatureFilePath && !signatureName) {
        return sendBadRequest(res, 'A typed, drawn, or file signature is required for board approval');
      }

      const certification = await this.prisma.certification.findUnique({
        where: { id }
      });

      if (!certification || certification.tenantId !== tenantId) {
        return sendNotFound(res, 'Certification not found');
      }

      if (!certification.auditorCertified) {
        return sendBadRequest(res, 'Auditor must certify first');
      }

      if (certification.boardApproved) {
        return sendBadRequest(res, 'Board approval already completed');
      }

      await this.prisma.categoryCertification.upsert({
        where: {
          tenantId_categoryId_role: {
            tenantId,
            categoryId: certification.categoryId,
            role: 'BOARD'
          }
        },
        create: {
          tenantId,
          categoryId: certification.categoryId,
          role: 'BOARD',
          userId: req.user?.id || '',
          boardRoleSnapshot: req.user?.role === 'BOARD' ? (req.user.boardRole || null) : null,
          signatureName: typedSignature || signatureName || (drawnSignatureData ? 'DRAWN_SIGNATURE' : null),
          comments: comments || null
        },
        update: {
          userId: req.user?.id || '',
          boardRoleSnapshot: req.user?.role === 'BOARD' ? (req.user.boardRole || null) : null,
          signatureName: typedSignature || signatureName || (drawnSignatureData ? 'DRAWN_SIGNATURE' : null),
          certifiedAt: new Date(),
          comments: comments || null
        }
      });

      const updated = await applyCertificationStage({
        prisma: this.prisma,
        tenantId,
        categoryId: certification.categoryId,
        role: 'BOARD',
        comments: comments || certification.comments,
        userId: req.user?.id || null,
        certifiedBy: req.user?.id || null
      });

      return sendSuccess(res, updated, 'Board approval completed - Certification finalized');
    } catch (error) {
      return next(error);
    }
  };

  rejectCertification = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;

      if (!rejectionReason) {
        return sendBadRequest(res, 'Rejection reason is required');
      }

      const certification = await this.prisma.certification.findUnique({
        where: { id }
      });

      if (!certification) {
        return sendNotFound(res, 'Certification not found');
      }

      if (certification.status === 'CERTIFIED') {
        return sendBadRequest(res, 'Cannot reject a finalized certification');
      }

      const updated = await this.prisma.certification.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason,
          certifiedBy: req.user?.id || null
        },
      });

      return sendSuccess(res, updated, 'Certification rejected');
    } catch (error) {
      return next(error);
    }
  };

  getCertificationStats = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const eventId = req.query['eventId'] as string | undefined;
      const contestId = req.query['contestId'] as string | undefined;
      const tenantId = (req as any).tenantId || req.user?.tenantId;

      const where: any = { tenantId };
      if (eventId) where.eventId = eventId;
      if (contestId) where.contestId = contestId;

      const [
        total,
        pending,
        inProgress,
        certified,
        rejected,
        judgeCertified,
        tallyCertified,
        auditorCertified,
        boardApproved
      ] = await Promise.all([
        this.prisma.certification.count({ where }),
        this.prisma.certification.count({ where: { ...where, status: 'PENDING' } }),
        this.prisma.certification.count({ where: { ...where, status: 'IN_PROGRESS' } }),
        this.prisma.certification.count({ where: { ...where, status: 'CERTIFIED' } }),
        this.prisma.certification.count({ where: { ...where, status: 'REJECTED' } }),
        this.prisma.certification.count({ where: { ...where, judgeCertified: true } }),
        this.prisma.certification.count({ where: { ...where, tallyCertified: true } }),
        this.prisma.certification.count({ where: { ...where, auditorCertified: true } }),
        this.prisma.certification.count({ where: { ...where, boardApproved: true } })
      ]);

      const stats = {
        total,
        byStatus: {
          pending,
          inProgress,
          certified,
          rejected
        },
        byStage: {
          judgeCertified,
          tallyCertified,
          auditorCertified,
          boardApproved
        },
        completionRate: total > 0 ? ((certified / total) * 100).toFixed(2) + '%' : '0%',
        rejectionRate: total > 0 ? ((rejected / total) * 100).toFixed(2) + '%' : '0%',
        averageStep: total > 0
          ? ((judgeCertified + tallyCertified + auditorCertified + boardApproved) / total).toFixed(2)
          : '0'
      };

      return sendSuccess(res, stats);
    } catch (error) {
      return next(error);
    }
  };

  getCertificationOverview = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const tenantId = (req as any).tenantId || req.user?.tenantId;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      if (!tenantId) {
        return sendBadRequest(res, 'Tenant context is required');
      }
      if (!userRole || !userId) {
        return sendBadRequest(res, 'User context is required');
      }

      const categoryWhere: any = {
        tenantId,
        deletedAt: null
      };

      if (userRole === 'TALLY_MASTER') {
        const assignments = await this.prisma.tallyMasterAssignment.findMany({
          where: { tenantId, userId, status: 'ACTIVE' },
          select: { categoryId: true, contestId: true, eventId: true }
        });
        if (assignments.length === 0) {
          return sendSuccess(res, { contests: [] });
        }

        const categoryIds = assignments.map((a) => a.categoryId).filter((id): id is string => !!id);
        const contestIds = assignments.map((a) => a.contestId).filter((id): id is string => !!id);
        const eventIds = assignments.map((a) => a.eventId).filter((id): id is string => !!id);

        categoryWhere.OR = [
          ...(categoryIds.length > 0 ? [{ id: { in: categoryIds } }] : []),
          ...(contestIds.length > 0 ? [{ contestId: { in: contestIds } }] : []),
          ...(eventIds.length > 0 ? [{ contest: { eventId: { in: eventIds } } }] : [])
        ];
      } else if (userRole === 'AUDITOR') {
        const assignments = await this.prisma.auditorAssignment.findMany({
          where: { tenantId, userId, status: 'ACTIVE' },
          select: { categoryId: true, contestId: true, eventId: true }
        });
        if (assignments.length === 0) {
          return sendSuccess(res, { contests: [] });
        }

        const categoryIds = assignments.map((a) => a.categoryId).filter((id): id is string => !!id);
        const contestIds = assignments.map((a) => a.contestId).filter((id): id is string => !!id);
        const eventIds = assignments.map((a) => a.eventId).filter((id): id is string => !!id);

        categoryWhere.OR = [
          ...(categoryIds.length > 0 ? [{ id: { in: categoryIds } }] : []),
          ...(contestIds.length > 0 ? [{ contestId: { in: contestIds } }] : []),
          ...(eventIds.length > 0 ? [{ contest: { eventId: { in: eventIds } } }] : [])
        ];
      }

      const categories = await this.prisma.category.findMany({
        where: categoryWhere,
        select: {
          id: true,
          name: true,
          contestId: true,
          contest: {
            select: {
              id: true,
              name: true,
              event: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: [{ contest: { name: 'asc' } }, { name: 'asc' }]
      });

      const categoryIds = categories.map((c) => c.id);
      if (categoryIds.length === 0) {
        return sendSuccess(res, { contests: [] });
      }

      const [certifications, assignments, judgeCertifications, scores, categoryContestants, criteria] = await Promise.all([
        this.prisma.certification.findMany({
          where: {
            tenantId,
            categoryId: { in: categoryIds }
          },
          orderBy: { updatedAt: 'desc' }
        }),
        this.prisma.assignment.findMany({
          where: {
            tenantId,
            status: 'ACTIVE',
            OR: [
              { categoryId: { in: categoryIds } },
              { categoryId: null, contestId: { in: Array.from(new Set(categories.map((c) => c.contestId))) } }
            ]
          },
          select: {
            categoryId: true,
            contestId: true,
            eventId: true,
            judgeId: true,
            judge: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }),
        this.prisma.judgeCertification.findMany({
          where: {
            tenantId,
            categoryId: { in: categoryIds }
          },
          select: {
            categoryId: true,
            judgeId: true,
            certifiedAt: true
          }
        }),
        this.prisma.score.findMany({
          where: {
            tenantId,
            categoryId: { in: categoryIds }
          },
          select: {
            categoryId: true,
            judgeId: true,
            contestantId: true,
            criterionId: true,
            isCertified: true,
            isLocked: true
          }
        }),
        this.prisma.categoryContestant.findMany({
          where: {
            tenantId,
            categoryId: { in: categoryIds }
          },
          select: {
            categoryId: true,
            contestantId: true
          }
        }),
        this.prisma.criterion.findMany({
          where: {
            tenantId,
            categoryId: { in: categoryIds }
          },
          select: {
            categoryId: true,
            id: true
          }
        })
      ]);

      const latestByCategory = new Map<string, any>();
      for (const cert of certifications) {
        if (!latestByCategory.has(cert.categoryId)) {
          latestByCategory.set(cert.categoryId, cert);
        }
      }

      const categoryIdsByContest = new Map<string, string[]>();
      for (const category of categories) {
        const byContest = categoryIdsByContest.get(category.contestId) || [];
        byContest.push(category.id);
        categoryIdsByContest.set(category.contestId, byContest);
      }

      const assignmentByCategory = new Map<string, Map<string, { judgeId: string; judgeName: string }>>();
      const addAssignment = (categoryId: string, judgeId: string, judgeName: string) => {
        const map = assignmentByCategory.get(categoryId) || new Map<string, { judgeId: string; judgeName: string }>();
        map.set(judgeId, { judgeId, judgeName });
        assignmentByCategory.set(categoryId, map);
      };

      for (const a of assignments) {
        const judgeName = a.judge?.name || 'Unknown Judge';
        if (a.categoryId) {
          addAssignment(a.categoryId, a.judgeId, judgeName);
          continue;
        }
        if (a.contestId) {
          const categoryIdsForContest = categoryIdsByContest.get(a.contestId) || [];
          for (const categoryId of categoryIdsForContest) {
            addAssignment(categoryId, a.judgeId, judgeName);
          }
          continue;
        }
      }

      const judgeCertByCategory = new Map<string, Map<string, Date>>();
      for (const jc of judgeCertifications) {
        const map = judgeCertByCategory.get(jc.categoryId) || new Map<string, Date>();
        map.set(jc.judgeId, jc.certifiedAt);
        judgeCertByCategory.set(jc.categoryId, map);
      }

      const contestantsByCategory = new Map<string, Set<string>>();
      for (const cc of categoryContestants) {
        const set = contestantsByCategory.get(cc.categoryId) || new Set<string>();
        set.add(cc.contestantId);
        contestantsByCategory.set(cc.categoryId, set);
      }

      const criteriaByCategory = new Map<string, Set<string>>();
      for (const criterion of criteria) {
        const set = criteriaByCategory.get(criterion.categoryId) || new Set<string>();
        set.add(criterion.id);
        criteriaByCategory.set(criterion.categoryId, set);
      }

      const scoresByCategory = new Map<string, Array<{
        judgeId: string;
        contestantId: string;
        criterionId: string | null;
        isCertified: boolean;
        isLocked: boolean;
      }>>();
      for (const score of scores) {
        const list = scoresByCategory.get(score.categoryId) || [];
        list.push({
          judgeId: score.judgeId,
          contestantId: score.contestantId,
          criterionId: score.criterionId,
          isCertified: score.isCertified,
          isLocked: score.isLocked
        });
        scoresByCategory.set(score.categoryId, list);
      }

      const contestMap = new Map<string, any>();

      for (const category of categories) {
        const certification = latestByCategory.get(category.id) || null;
        const assigned = Array.from((assignmentByCategory.get(category.id) || new Map()).values());
        const judgeCertMap = judgeCertByCategory.get(category.id) || new Map<string, Date>();
        const judgeRows = assigned.map((j) => ({
          judgeId: j.judgeId,
          judgeName: j.judgeName,
          certified: judgeCertMap.has(j.judgeId),
          certifiedAt: judgeCertMap.get(j.judgeId) || null
        }));

        const assignedJudgeIds = new Set(assigned.map((j) => j.judgeId));
        const scopedContestantIds = contestantsByCategory.get(category.id) || new Set<string>();
        const scopedCriterionIds = criteriaByCategory.get(category.id) || new Set<string>();

        const expectedCriteriaCount = scopedCriterionIds.size > 0 ? scopedCriterionIds.size : 1;
        const expectedTotal = assignedJudgeIds.size * scopedContestantIds.size * expectedCriteriaCount;

        const submittedKeys = new Set<string>();
        const certifiedKeys = new Set<string>();
        const lockedKeys = new Set<string>();
        const categoryScores = scoresByCategory.get(category.id) || [];

        for (const score of categoryScores) {
          if (!assignedJudgeIds.has(score.judgeId)) continue;
          if (!scopedContestantIds.has(score.contestantId)) continue;

          const criterionKey = score.criterionId || '__NO_CRITERIA__';
          if (scopedCriterionIds.size > 0 && !scopedCriterionIds.has(criterionKey)) continue;
          if (scopedCriterionIds.size === 0 && criterionKey !== '__NO_CRITERIA__') continue;

          const entryKey = `${score.judgeId}:${score.contestantId}:${criterionKey}`;
          submittedKeys.add(entryKey);
          if (score.isCertified) certifiedKeys.add(entryKey);
          if (score.isLocked) lockedKeys.add(entryKey);
        }

        const scoreStats = {
          total: expectedTotal,
          submitted: submittedKeys.size,
          certified: certifiedKeys.size,
          locked: lockedKeys.size
        };

        const judgeCertifiedDerived = judgeRows.length > 0
          ? judgeRows.every((judge) => judge.certified)
          : Boolean(certification?.judgeCertified);
        const tallyCertified = Boolean(certification?.tallyCertified);
        const auditorCertified = Boolean(certification?.auditorCertified);
        const boardApproved = Boolean(certification?.boardApproved);
        const effectiveStatus = boardApproved
          ? 'CERTIFIED'
          : (judgeCertifiedDerived || tallyCertified || auditorCertified)
            ? 'IN_PROGRESS'
            : 'PENDING';
        const effectiveCurrentStep = boardApproved
          ? 4
          : auditorCertified
            ? 4
            : tallyCertified
              ? 3
              : judgeCertifiedDerived
                ? 2
                : 1;

        const categoryOverview = {
          categoryId: category.id,
          categoryName: category.name,
          contestId: category.contestId,
          contestName: category.contest?.name || '',
          eventId: category.contest?.event?.id || '',
          eventName: category.contest?.event?.name || '',
          status: effectiveStatus,
          currentStep: effectiveCurrentStep,
          totalSteps: certification?.totalSteps || 4,
          judgeCertified: judgeCertifiedDerived,
          tallyCertified,
          auditorCertified,
          boardApproved,
          certifiedAt: certification?.certifiedAt || null,
          certifiedBy: certification?.certifiedBy || null,
          judgeProgress: {
            certified: judgeRows.filter((j) => j.certified).length,
            total: judgeRows.length
          },
          scoreProgress: scoreStats,
          judges: judgeRows
        };

        const contestId = category.contestId;
        if (!contestMap.has(contestId)) {
          contestMap.set(contestId, {
            contestId,
            contestName: category.contest?.name || '',
            eventId: category.contest?.event?.id || '',
            eventName: category.contest?.event?.name || '',
            categories: []
          });
        }
        contestMap.get(contestId).categories.push(categoryOverview);
      }

      return sendSuccess(res, {
        contests: Array.from(contestMap.values())
      });
    } catch (error) {
      return next(error);
    }
  };
}

const controller = new CertificationController();
export const getAllCertifications = controller.getAllCertifications;
export const createCertification = controller.createCertification;
export const updateCertification = controller.updateCertification;
export const deleteCertification = controller.deleteCertification;
export const getCertificationById = controller.getCertificationById;
export const certifyJudge = controller.certifyJudge;
export const certifyTally = controller.certifyTally;
export const certifyAuditor = controller.certifyAuditor;
export const approveBoard = controller.approveBoard;
export const rejectCertification = controller.rejectCertification;
export const getCertificationStats = controller.getCertificationStats;
export const getCertificationOverview = controller.getCertificationOverview;
