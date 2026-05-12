import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { sendSuccess, sendNotFound, sendBadRequest, sendConflict } from '../utils/responseHelpers';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  applyCertificationStage,
  calculateCategoryScoreCoverage,
  refreshJudgeStage,
  refreshRoleStages,
  upsertCategoryRoleCertification
} from '../utils/certificationPipeline';
import { PermissionScopeService } from '../services/PermissionScopeService';

type CertificationAccessScope = {
  tenantWide: boolean;
  eventIds: string[];
  contestIds: string[];
  categoryIds: string[];
};

export class CertificationController {
  private prisma: PrismaClient;
  private permissionScopeService: PermissionScopeService;

  constructor() {
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
    this.permissionScopeService = container.resolve(PermissionScopeService);
  }

  private emptyCertificationScope(): CertificationAccessScope {
    return {
      tenantWide: false,
      eventIds: [],
      contestIds: [],
      categoryIds: [],
    };
  }

  private buildCertificationScopeWhere(scope: CertificationAccessScope): Prisma.CertificationWhereInput | null {
    if (scope.tenantWide) return {};

    const clauses: Prisma.CertificationWhereInput[] = [];
    if (scope.categoryIds.length > 0) {
      clauses.push({ categoryId: { in: scope.categoryIds } });
    }
    if (scope.contestIds.length > 0) {
      clauses.push({ contestId: { in: scope.contestIds } });
    }
    if (scope.eventIds.length > 0) {
      clauses.push({ eventId: { in: scope.eventIds } });
    }

    return clauses.length > 0 ? { OR: clauses } : null;
  }

  private buildCertificationCategoryScopeWhere(scope: CertificationAccessScope): Prisma.CategoryWhereInput | null {
    if (scope.tenantWide) return {};

    const clauses: Prisma.CategoryWhereInput[] = [];
    if (scope.categoryIds.length > 0) {
      clauses.push({ id: { in: scope.categoryIds } });
    }
    if (scope.contestIds.length > 0) {
      clauses.push({ contestId: { in: scope.contestIds } });
    }
    if (scope.eventIds.length > 0) {
      clauses.push({ contest: { eventId: { in: scope.eventIds } } });
    }

    return clauses.length > 0 ? { OR: clauses } : null;
  }

  private canAccessCertificationInScope(
    scope: CertificationAccessScope,
    certification: { categoryId: string; contestId: string; eventId: string }
  ): boolean {
    if (scope.tenantWide) return true;
    if (scope.categoryIds.includes(certification.categoryId)) return true;
    if (scope.contestIds.includes(certification.contestId)) return true;
    return scope.eventIds.includes(certification.eventId);
  }

  private canAccessCategoryInScope(
    scope: CertificationAccessScope,
    category: { id: string; contestId: string; contest: { eventId: string } | null }
  ): boolean {
    if (scope.tenantWide) return true;
    if (scope.categoryIds.includes(category.id)) return true;
    if (scope.contestIds.includes(category.contestId)) return true;
    return Boolean(category.contest?.eventId && scope.eventIds.includes(category.contest.eventId));
  }

  private async getCertificationAccessScope(
    req: Request,
    tenantId: string
  ): Promise<CertificationAccessScope> {
    if (!req.user) return this.emptyCertificationScope();

    return this.permissionScopeService.resolveUserScope(
      req.user.role,
      'certifications',
      tenantId,
      req.user
    );
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
      const scope = tenantId
        ? await this.getCertificationAccessScope(req, tenantId)
        : this.emptyCertificationScope();
      const scopeWhere = this.buildCertificationScopeWhere(scope);
      if (!scopeWhere) {
        return sendSuccess(res, {
          certifications: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasMore: false,
          }
        });
      }

      if (status) where.status = status;
      if (eventId) where.eventId = eventId;
      if (contestId) where.contestId = contestId;
      if (categoryId) where.categoryId = categoryId;
      if (req.user?.role === 'JUDGE') where.userId = req.user.id;
      Object.assign(where, scopeWhere);

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
      const tenantId = (req as any).tenantId!;
      const scope = await this.getCertificationAccessScope(req, tenantId);

      if (!categoryId || !contestId || !eventId) {
        return sendBadRequest(res, 'categoryId, contestId, and eventId are required');
      }

      // Check if certification already exists for this combination
      const existing = await this.prisma.certification.findUnique({
        where: {
          tenantId_categoryId_contestId_eventId: {
            tenantId,
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
      const [category, contest, event] = await Promise.all([
        this.prisma.category.findFirst({
          where: { id: categoryId, tenantId },
          select: {
            id: true,
            contestId: true,
            contest: {
              select: {
                eventId: true,
              },
            },
          },
        }),
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
      if (!this.canAccessCategoryInScope(scope, category)) {
        return sendNotFound(res, 'Category not found or access denied');
      }

      const certification = await this.prisma.certification.create({
        data: {
          tenantId,
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

      const scope = await this.getCertificationAccessScope(req, existing?.tenantId || (req as any).tenantId || req.user!.tenantId);
      if (!existing || !this.canAccessCertificationInScope(scope, existing)) {
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

      const scope = await this.getCertificationAccessScope(req, certification?.tenantId || (req as any).tenantId || req.user!.tenantId);
      if (!certification || !this.canAccessCertificationInScope(scope, certification)) {
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

      const scope = tenantId
        ? await this.getCertificationAccessScope(req, tenantId)
        : this.emptyCertificationScope();
      if (!certification || certification.tenantId !== tenantId || !this.canAccessCertificationInScope(scope, certification)) {
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

      const scope = await this.getCertificationAccessScope(req, tenantId);
      if (!certification || certification.tenantId !== tenantId || !this.canAccessCertificationInScope(scope, certification)) {
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

      const scope = await this.getCertificationAccessScope(req, tenantId);
      if (!certification || certification.tenantId !== tenantId || !this.canAccessCertificationInScope(scope, certification)) {
        return sendNotFound(res, 'Certification not found');
      }

      const synced = await refreshRoleStages(this.prisma, tenantId, certification.categoryId, req.user?.id || null);

      if (!synced.judgeCertified) {
        return sendBadRequest(res, 'Judge must certify first');
      }

      if (synced.tallyCertified) {
        return sendBadRequest(res, 'Tally Master certification already completed');
      }

      await upsertCategoryRoleCertification({
        prisma: this.prisma,
        tenantId,
        categoryId: certification.categoryId,
        role: 'TALLY_MASTER',
        userId: req.user?.id || '',
        boardRoleSnapshot: req.user?.role === 'BOARD' ? (req.user.boardRole || null) : null,
        signatureName: typedSignature || signatureName || (drawnSignatureData ? 'DRAWN_SIGNATURE' : null),
        comments: comments || null
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

      const scope = await this.getCertificationAccessScope(req, tenantId);
      if (!certification || certification.tenantId !== tenantId || !this.canAccessCertificationInScope(scope, certification)) {
        return sendNotFound(res, 'Certification not found');
      }

      const synced = await refreshRoleStages(this.prisma, tenantId, certification.categoryId, req.user?.id || null);

      if (!synced.tallyCertified) {
        return sendBadRequest(res, 'Tally Master must certify first');
      }

      if (synced.auditorCertified) {
        return sendBadRequest(res, 'Auditor certification already completed');
      }

      await upsertCategoryRoleCertification({
        prisma: this.prisma,
        tenantId,
        categoryId: certification.categoryId,
        role: 'AUDITOR',
        userId: req.user?.id || '',
        boardRoleSnapshot: req.user?.role === 'BOARD' ? (req.user.boardRole || null) : null,
        signatureName: typedSignature || signatureName || (drawnSignatureData ? 'DRAWN_SIGNATURE' : null),
        comments: comments || null
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

      const scope = await this.getCertificationAccessScope(req, tenantId);
      if (!certification || certification.tenantId !== tenantId || !this.canAccessCertificationInScope(scope, certification)) {
        return sendNotFound(res, 'Certification not found');
      }

      const synced = await refreshRoleStages(this.prisma, tenantId, certification.categoryId, req.user?.id || null);

      if (!synced.auditorCertified) {
        return sendBadRequest(res, 'Auditor must certify first');
      }

      if (synced.boardApproved) {
        return sendBadRequest(res, 'Board approval already completed');
      }

      await upsertCategoryRoleCertification({
        prisma: this.prisma,
        tenantId,
        categoryId: certification.categoryId,
        role: 'BOARD',
        userId: req.user?.id || '',
        boardRoleSnapshot: req.user?.role === 'BOARD' ? (req.user.boardRole || null) : null,
        signatureName: typedSignature || signatureName || (drawnSignatureData ? 'DRAWN_SIGNATURE' : null),
        comments: comments || null
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

      const scope = await this.getCertificationAccessScope(req, certification?.tenantId || (req as any).tenantId || req.user!.tenantId);
      if (!certification || !this.canAccessCertificationInScope(scope, certification)) {
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
      const scope = tenantId
        ? await this.getCertificationAccessScope(req, tenantId)
        : this.emptyCertificationScope();
      const scopeWhere = this.buildCertificationScopeWhere(scope);
      if (!scopeWhere) {
        return sendSuccess(res, {
          total: 0,
          byStatus: {
            pending: 0,
            inProgress: 0,
            certified: 0,
            rejected: 0,
          },
          byStage: {
            judgeCertified: 0,
            tallyCertified: 0,
            auditorCertified: 0,
            boardApproved: 0,
          },
          completionRate: '0%',
          rejectionRate: '0%',
          averageStep: '0',
        });
      }

      const where: any = { tenantId };
      Object.assign(where, scopeWhere);
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
      const scope = await this.getCertificationAccessScope(req, tenantId);
      const categoryScopeWhere = this.buildCertificationCategoryScopeWhere(scope);
      if (!categoryScopeWhere) {
        return sendSuccess(res, { contests: [] });
      }
      Object.assign(categoryWhere, categoryScopeWhere);

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
      const contestIds = Array.from(new Set(categories.map((c) => c.contestId)));
      const eventIds = Array.from(new Set(
        categories
          .map((c) => c.contest?.event?.id)
          .filter((id): id is string => Boolean(id))
      ));

      await Promise.all(
        categoryIds.map((categoryId) =>
          refreshRoleStages(this.prisma, tenantId, categoryId, req.user?.id || null, true)
            .catch(() => null)
        )
      );

      const [certifications, assignments, categoryJudges, judgeCertifications, scores, categoryContestants, criteria, tallyAssignments, auditorAssignments, categoryRoleCertifications, settingsRows, eventPolicyRows] = await Promise.all([
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
              { categoryId: null, contestId: { in: contestIds } }
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
        this.prisma.categoryJudge.findMany({
          where: {
            tenantId,
            categoryId: { in: categoryIds }
          },
          select: {
            categoryId: true,
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
        }),
        this.prisma.tallyMasterAssignment.findMany({
          where: {
            tenantId,
            status: 'ACTIVE',
            OR: [
              { categoryId: { in: categoryIds } },
              { categoryId: null, contestId: { in: contestIds } },
              { categoryId: null, contestId: null, eventId: { in: eventIds } }
            ],
            user: {
              isActive: true,
              role: 'TALLY_MASTER'
            }
          },
          select: {
            userId: true,
            categoryId: true,
            contestId: true,
            eventId: true
          }
        }),
        this.prisma.auditorAssignment.findMany({
          where: {
            tenantId,
            status: 'ACTIVE',
            OR: [
              { categoryId: { in: categoryIds } },
              { categoryId: null, contestId: { in: contestIds } },
              { categoryId: null, contestId: null, eventId: { in: eventIds } }
            ],
            user: {
              isActive: true,
              role: 'AUDITOR'
            }
          },
          select: {
            userId: true,
            categoryId: true,
            contestId: true,
            eventId: true
          }
        }),
        this.prisma.categoryCertification.findMany({
          where: {
            tenantId,
            categoryId: { in: categoryIds },
            role: { in: ['TALLY_MASTER', 'AUDITOR'] }
          },
          select: {
            categoryId: true,
            role: true,
            userId: true
          }
        }),
        this.prisma.systemSetting.findMany({
          where: {
            key: {
              in: ['certification_require_all_tally_masters', 'certification_require_all_auditors']
            },
            OR: [
              { tenantId },
              { tenantId: null }
            ]
          },
          select: {
            key: true,
            value: true,
            tenantId: true
          }
        }),
        this.prisma.event.findMany({
          where: {
            tenantId,
            id: { in: eventIds },
            deletedAt: null
          },
          select: {
            id: true,
            requireAllTallyCertifiers: true,
            requireAllAuditorCertifiers: true
          }
        })
      ]);

      const latestByCategory = new Map<string, any>();
      for (const cert of certifications) {
        if (!latestByCategory.has(cert.categoryId)) {
          latestByCategory.set(cert.categoryId, cert);
        }
      }

      const parseBooleanSetting = (raw: string | null | undefined, fallback: boolean): boolean => {
        if (raw == null) return fallback;
        const normalized = String(raw).trim().toLowerCase();
        if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
        if (['false', '0', 'no', 'off'].includes(normalized)) return false;
        return fallback;
      };
      const getSettingValue = (key: string): string | null => {
        const tenantValue = settingsRows.find((row) => row.key === key && row.tenantId === tenantId)?.value;
        if (tenantValue != null) return tenantValue;
        return settingsRows.find((row) => row.key === key && row.tenantId === null)?.value ?? null;
      };
      const tenantRequireAllTally = parseBooleanSetting(getSettingValue('certification_require_all_tally_masters'), true);
      const tenantRequireAllAuditors = parseBooleanSetting(getSettingValue('certification_require_all_auditors'), true);
      const eventPolicyById = new Map(
        eventPolicyRows.map((row) => [row.id, row])
      );

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

      const categoryJudgesByCategory = new Map<string, Map<string, { judgeId: string; judgeName: string }>>();
      for (const row of categoryJudges) {
        const judgesForCategory = categoryJudgesByCategory.get(row.categoryId) || new Map<string, { judgeId: string; judgeName: string }>();
        judgesForCategory.set(row.judgeId, {
          judgeId: row.judgeId,
          judgeName: row.judge?.name || 'Unknown Judge'
        });
        categoryJudgesByCategory.set(row.categoryId, judgesForCategory);
      }

      const addUserToScope = (map: Map<string, Set<string>>, scopeId: string | null, userId: string) => {
        if (!scopeId) return;
        const users = map.get(scopeId) || new Set<string>();
        users.add(userId);
        map.set(scopeId, users);
      };

      const tallyUsersByCategory = new Map<string, Set<string>>();
      const tallyUsersByContest = new Map<string, Set<string>>();
      const tallyUsersByEvent = new Map<string, Set<string>>();
      for (const row of tallyAssignments) {
        if (row.categoryId) {
          addUserToScope(tallyUsersByCategory, row.categoryId, row.userId);
          continue;
        }
        if (row.contestId) {
          addUserToScope(tallyUsersByContest, row.contestId, row.userId);
          continue;
        }
        addUserToScope(tallyUsersByEvent, row.eventId, row.userId);
      }

      const auditorUsersByCategory = new Map<string, Set<string>>();
      const auditorUsersByContest = new Map<string, Set<string>>();
      const auditorUsersByEvent = new Map<string, Set<string>>();
      for (const row of auditorAssignments) {
        if (row.categoryId) {
          addUserToScope(auditorUsersByCategory, row.categoryId, row.userId);
          continue;
        }
        if (row.contestId) {
          addUserToScope(auditorUsersByContest, row.contestId, row.userId);
          continue;
        }
        addUserToScope(auditorUsersByEvent, row.eventId, row.userId);
      }

      const roleCertUsersByCategoryRole = new Map<string, Set<string>>();
      for (const row of categoryRoleCertifications) {
        const key = `${row.categoryId}:${row.role}`;
        const signedUsers = roleCertUsersByCategoryRole.get(key) || new Set<string>();
        signedUsers.add(row.userId);
        roleCertUsersByCategoryRole.set(key, signedUsers);
      }

      const resolveScopedRequiredUsers = (
        categoryId: string,
        contestId: string,
        eventId: string,
        usersByCategory: Map<string, Set<string>>,
        usersByContest: Map<string, Set<string>>,
        usersByEvent: Map<string, Set<string>>
      ): Set<string> => {
        const scoped = new Set<string>();
        for (const userId of usersByCategory.get(categoryId) || []) scoped.add(userId);
        for (const userId of usersByContest.get(contestId) || []) scoped.add(userId);
        for (const userId of usersByEvent.get(eventId) || []) scoped.add(userId);
        return scoped;
      };

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
        const judgeCertMap = judgeCertByCategory.get(category.id) || new Map<string, Date>();
        const requiredJudgeMap = (categoryJudgesByCategory.get(category.id)?.size || 0) > 0
          ? categoryJudgesByCategory.get(category.id)!
          : (assignmentByCategory.get(category.id) || new Map<string, { judgeId: string; judgeName: string }>());
        const requiredJudges = Array.from(requiredJudgeMap.values());
        const scopedContestantIds = contestantsByCategory.get(category.id) || new Set<string>();
        const scopedCriterionIds = criteriaByCategory.get(category.id) || new Set<string>();
        const scoreCoverage = calculateCategoryScoreCoverage({
          requiredJudgeIds: requiredJudges.map((judge) => judge.judgeId),
          contestantIds: scopedContestantIds,
          criterionIds: scopedCriterionIds,
          scores: scoresByCategory.get(category.id) || []
        });
        const judgeRows = requiredJudges.map((judge) => {
          const judgeCoverage = scoreCoverage.perJudge.get(judge.judgeId);
          const signed = judgeCertMap.has(judge.judgeId);
          return {
            judgeId: judge.judgeId,
            judgeName: judge.judgeName,
            certified: signed && Boolean(judgeCoverage?.scoreComplete),
            certifiedAt: judgeCertMap.get(judge.judgeId) || null
          };
        });

        const judgeCertifiedDerived = judgeRows.length > 0
          ? judgeRows.every((judge) => judge.certified)
          : Boolean(certification?.judgeCertified);
        const eventPolicy = eventPolicyById.get(category.contest?.event?.id || '');
        const requireAllTally = typeof eventPolicy?.requireAllTallyCertifiers === 'boolean'
          ? eventPolicy.requireAllTallyCertifiers
          : tenantRequireAllTally;
        const requireAllAuditor = typeof eventPolicy?.requireAllAuditorCertifiers === 'boolean'
          ? eventPolicy.requireAllAuditorCertifiers
          : tenantRequireAllAuditors;
        const tallyRequiredUsers = resolveScopedRequiredUsers(
          category.id,
          category.contestId,
          category.contest?.event?.id || '',
          tallyUsersByCategory,
          tallyUsersByContest,
          tallyUsersByEvent
        );
        const auditorRequiredUsers = resolveScopedRequiredUsers(
          category.id,
          category.contestId,
          category.contest?.event?.id || '',
          auditorUsersByCategory,
          auditorUsersByContest,
          auditorUsersByEvent
        );
        const tallySignedUsers = roleCertUsersByCategoryRole.get(`${category.id}:TALLY_MASTER`) || new Set<string>();
        const auditorSignedUsers = roleCertUsersByCategoryRole.get(`${category.id}:AUDITOR`) || new Set<string>();
        const tallySignedAssigned = tallyRequiredUsers.size > 0
          ? Array.from(tallyRequiredUsers).filter((userId) => tallySignedUsers.has(userId)).length
          : tallySignedUsers.size;
        const auditorSignedAssigned = auditorRequiredUsers.size > 0
          ? Array.from(auditorRequiredUsers).filter((userId) => auditorSignedUsers.has(userId)).length
          : auditorSignedUsers.size;
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
          certificationId: certification?.id || null,
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
          tallyProgress: {
            signed: tallySignedAssigned,
            required: tallyRequiredUsers.size,
            pending: tallyRequiredUsers.size > 0 ? Math.max(tallyRequiredUsers.size - tallySignedAssigned, 0) : 0,
            requireAll: requireAllTally
          },
          auditorProgress: {
            signed: auditorSignedAssigned,
            required: auditorRequiredUsers.size,
            pending: auditorRequiredUsers.size > 0 ? Math.max(auditorRequiredUsers.size - auditorSignedAssigned, 0) : 0,
            requireAll: requireAllAuditor
          },
          scoreProgress: {
            total: scoreCoverage.total,
            submitted: scoreCoverage.submitted,
            certified: scoreCoverage.certified,
            locked: scoreCoverage.locked,
            judges: scoreCoverage.judges,
            contestants: scoreCoverage.contestants,
            criteria: scoreCoverage.criteria
          },
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
