"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditorService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const client_1 = require("@prisma/client");
let AuditorService = class AuditorService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async getStats() {
        const totalCategories = await this.prisma.category.count();
        const categoriesWithCertifications = await this.prisma.category.findMany({
            include: {
                categoryCertifications: true,
            },
        });
        const pendingAudits = categoriesWithCertifications.filter((c) => {
            const hasTally = c.categoryCertifications?.some((cert) => cert.role === 'TALLY_MASTER');
            const hasAuditor = c.categoryCertifications?.some((cert) => cert.role === 'AUDITOR');
            return hasTally && !hasAuditor;
        }).length;
        const completedAudits = categoriesWithCertifications.filter((c) => c.categoryCertifications?.some((cert) => cert.role === 'AUDITOR')).length;
        return {
            totalCategories,
            pendingAudits,
            completedAudits,
        };
    }
    async getPendingAudits(page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const categories = await this.prisma.category.findMany({
            include: {
                contest: {
                    select: {
                        id: true,
                        eventId: true,
                        name: true,
                        description: true,
                        createdAt: true,
                        updatedAt: true,
                        contestantNumberingMode: true,
                        nextContestantNumber: true,
                        event: true,
                    },
                },
                categoryCertifications: true,
            },
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limit,
        });
        const pendingCategories = categories.filter((cat) => {
            const hasTally = cat.categoryCertifications?.some((cert) => cert.role === 'TALLY_MASTER');
            const hasAuditor = cat.categoryCertifications?.some((cert) => cert.role === 'AUDITOR');
            return hasTally && !hasAuditor;
        });
        return {
            categories: pendingCategories,
            pagination: {
                page,
                limit,
                total: pendingCategories.length,
                pages: Math.ceil(pendingCategories.length / limit),
            },
        };
    }
    async getCompletedAudits(page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const categories = await this.prisma.category.findMany({
            include: {
                contest: {
                    select: {
                        id: true,
                        eventId: true,
                        name: true,
                        description: true,
                        createdAt: true,
                        updatedAt: true,
                        contestantNumberingMode: true,
                        nextContestantNumber: true,
                        event: true,
                    },
                },
                categoryCertifications: true,
            },
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limit,
        });
        const completedCategories = categories.filter((cat) => cat.categoryCertifications?.some((cert) => cert.role === 'AUDITOR'));
        return {
            categories: completedCategories,
            pagination: {
                page,
                limit,
                total: completedCategories.length,
                pages: Math.ceil(completedCategories.length / limit),
            },
        };
    }
    async finalCertification(categoryId, userId) {
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
            include: {
                contest: {
                    include: {
                        event: true,
                    },
                },
            },
        });
        if (!category) {
            throw this.notFoundError('Category', categoryId);
        }
        const certification = await this.prisma.categoryCertification.create({
            data: {
                tenantId: category.tenantId,
                categoryId,
                userId,
                role: 'AUDITOR',
                comments: 'Auditor category certification (final for audit)',
            },
        });
        return { message: 'Final certification completed', certification };
    }
    async rejectAudit(categoryId, userId, reason) {
        const activityLog = await this.prisma.activityLog.create({
            data: {
                userId,
                action: 'AUDIT_REJECTED',
                resourceType: 'CATEGORY',
                resourceId: categoryId,
                details: { reason: reason || 'No reason provided' },
            },
        });
        return { message: 'Audit rejected', activityLog };
    }
    async getScoreVerification(categoryId, contestantId) {
        const categoryExists = await this.prisma.category.findUnique({
            where: { id: categoryId },
        });
        if (!categoryExists) {
            throw this.notFoundError('Category', categoryId);
        }
        const scores = await this.prisma.score.findMany({
            where: {
                categoryId,
                ...(contestantId && { contestantId }),
            },
            include: {
                judge: {
                    select: {
                        id: true,
                        name: true,
                        preferredName: true,
                        email: true,
                        role: true,
                    },
                },
                contestant: {
                    select: {
                        id: true,
                        name: true,
                        preferredName: true,
                        email: true,
                        contestantNumber: true,
                    },
                },
                criterion: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        maxScore: true,
                    },
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        maxScore: true,
                    },
                },
            },
            orderBy: [{ contestantId: 'asc' }, { criterionId: 'asc' }],
        });
        const groupedScores = scores.reduce((acc, score) => {
            const key = score.contestantId;
            if (!acc[key]) {
                acc[key] = {
                    contestant: score.contestant,
                    scores: [],
                    totalScore: 0,
                    averageScore: 0,
                };
            }
            acc[key].scores.push(score);
            acc[key].totalScore += score.score;
            return acc;
        }, {});
        Object.values(groupedScores).forEach((group) => {
            group.averageScore = group.scores.length > 0 ? group.totalScore / group.scores.length : 0;
        });
        return {
            categoryId,
            scores: Object.values(groupedScores),
            totalScores: scores.length,
            uniqueContestants: Object.keys(groupedScores).length,
        };
    }
    async verifyScore(scoreId, userId, data) {
        const score = await this.prisma.score.findUnique({
            where: { id: scoreId },
            include: {
                judge: true,
                contestant: true,
                criterion: true,
                category: true,
            },
        });
        if (!score) {
            throw this.notFoundError('Score', scoreId);
        }
        const updatedScore = await this.prisma.score.update({
            where: { id: scoreId },
            data: {
                isCertified: data.verified,
                certifiedBy: userId,
                certifiedAt: new Date(),
            },
        });
        return updatedScore;
    }
    async getTallyMasterStatus(categoryId) {
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
            include: {
                contest: {
                    include: {
                        event: true,
                    },
                },
                scores: {
                    include: {
                        judge: true,
                        contestant: true,
                        criterion: true,
                    },
                },
                certifications: true,
            },
        });
        if (!category) {
            throw this.notFoundError('Category', categoryId);
        }
        const totalScores = category.scores.length;
        const verifiedScores = category.scores.filter((s) => s.verified).length;
        const pendingVerification = totalScores - verifiedScores;
        const tallyMasterCert = category.certifications?.some((c) => c.type === 'TALLY_MASTER');
        const auditorCert = category.certifications?.some((c) => c.type === 'AUDITOR');
        const finalCert = category.certifications?.some((c) => c.type === 'FINAL');
        return {
            categoryId: category.id,
            categoryName: category.name,
            totalScores,
            verifiedScores,
            pendingVerification,
            verificationProgress: totalScores > 0 ? ((verifiedScores / totalScores) * 100).toFixed(2) : 0,
            tallyMasterCertified: tallyMasterCert || false,
            auditorCertified: auditorCert || false,
            finalCertified: finalCert || false,
        };
    }
    async getCertificationWorkflow(categoryId) {
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
            include: {
                contest: {
                    include: {
                        event: true,
                    },
                },
                scores: {
                    include: {
                        judge: true,
                        contestant: true,
                        criterion: true,
                    },
                },
                certifications: true,
            },
        });
        if (!category) {
            throw this.notFoundError('Category', categoryId);
        }
        const tallyMasterCert = category.certifications?.find((c) => c.type === 'TALLY_MASTER');
        const auditorCert = category.certifications?.find((c) => c.type === 'AUDITOR');
        const finalCert = category.certifications?.find((c) => c.type === 'FINAL');
        const workflow = {
            categoryId: category.id,
            categoryName: category.name,
            contestName: category.contest.name,
            eventName: category.contest.event.name,
            steps: [
                {
                    name: 'Judge Scoring',
                    status: category.scores.length > 0 ? 'COMPLETED' : 'PENDING',
                    completedAt: category.scores.length > 0 ? category.scores[0].createdAt : null,
                    details: `${category.scores.length} scores submitted`,
                },
                {
                    name: 'Tally Master Review',
                    status: tallyMasterCert ? 'COMPLETED' : 'PENDING',
                    completedAt: tallyMasterCert?.createdAt || null,
                    details: tallyMasterCert ? 'Totals certified' : 'Pending tally review',
                },
                {
                    name: 'Auditor Verification',
                    status: auditorCert ? 'COMPLETED' : 'PENDING',
                    completedAt: auditorCert?.createdAt || null,
                    details: auditorCert ? 'Final certification completed' : 'Pending auditor review',
                },
                {
                    name: 'Board Approval',
                    status: finalCert ? 'COMPLETED' : 'PENDING',
                    completedAt: finalCert?.createdAt || null,
                    details: finalCert ? 'Board approved' : 'Pending board approval',
                },
            ],
            currentStep: finalCert ? 4 : auditorCert ? 3 : tallyMasterCert ? 2 : 1,
            overallStatus: finalCert
                ? 'APPROVED'
                : auditorCert
                    ? 'AUDITOR_CERTIFIED'
                    : tallyMasterCert
                        ? 'TALLY_CERTIFIED'
                        : 'PENDING',
        };
        return workflow;
    }
    async generateSummaryReport(categoryId, userId, includeDetails = false) {
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
            include: {
                contest: {
                    include: {
                        event: true,
                    },
                },
                scores: {
                    include: {
                        judge: {
                            select: {
                                id: true,
                                name: true,
                                preferredName: true,
                                email: true,
                            },
                        },
                        contestant: {
                            select: {
                                id: true,
                                name: true,
                                preferredName: true,
                                email: true,
                                contestantNumber: true,
                            },
                        },
                        criterion: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                maxScore: true,
                            },
                        },
                    },
                },
                certifications: true,
            },
        });
        if (!category) {
            throw this.notFoundError('Category', categoryId);
        }
        const totalScores = category.scores.length;
        const uniqueContestants = new Set(category.scores.map((s) => s.contestantId)).size;
        const uniqueJudges = new Set(category.scores.map((s) => s.judgeId)).size;
        const averageScore = totalScores > 0 ? category.scores.reduce((sum, s) => sum + s.score, 0) / totalScores : 0;
        const maxScore = Math.max(...category.scores.map((s) => s.score), 0);
        const minScore = Math.min(...category.scores.map((s) => s.score), 0);
        const contestantScores = category.scores.reduce((acc, score) => {
            const key = score.contestantId;
            if (!acc[key]) {
                acc[key] = {
                    contestant: score.contestant,
                    scores: [],
                    totalScore: 0,
                    averageScore: 0,
                };
            }
            acc[key].scores.push(score);
            acc[key].totalScore += score.score;
            return acc;
        }, {});
        const rankings = Object.values(contestantScores)
            .map((group) => {
            group.averageScore = group.scores.length > 0 ? group.totalScore / group.scores.length : 0;
            return group;
        })
            .sort((a, b) => b.averageScore - a.averageScore);
        rankings.forEach((contestant, index) => {
            contestant.rank = index + 1;
        });
        const summaryReport = {
            category: {
                id: category.id,
                name: category.name,
                description: category.description,
                scoreCap: category.scoreCap,
            },
            contest: {
                id: category.contest.id,
                name: category.contest.name,
                eventName: category.contest.event.name,
            },
            statistics: {
                totalScores,
                uniqueContestants,
                uniqueJudges,
                averageScore: parseFloat(averageScore.toFixed(2)),
                maxScore,
                minScore,
                scoreRange: maxScore - minScore,
            },
            rankings: includeDetails
                ? rankings
                : rankings.map((r) => ({
                    rank: r.rank,
                    contestant: r.contestant,
                    totalScore: r.totalScore,
                    averageScore: parseFloat(r.averageScore.toFixed(2)),
                    scoreCount: r.scores.length,
                })),
            certification: {
                tallyMasterCertified: category.certifications?.some((c) => c.type === 'TALLY_MASTER') || false,
                auditorCertified: category.certifications?.some((c) => c.type === 'AUDITOR') || false,
                finalCertified: category.certifications?.some((c) => c.type === 'FINAL') || false,
                certifications: category.certifications || [],
            },
            generatedAt: new Date().toISOString(),
            generatedBy: userId,
        };
        return summaryReport;
    }
    async getAuditHistory(categoryId, page = 1, limit = 20) {
        const whereClause = {
            ...(categoryId && { categoryId }),
            resourceType: 'CATEGORY',
        };
        const auditLogs = await this.prisma.activityLog.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        preferredName: true,
                        email: true,
                        role: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        });
        const total = await this.prisma.activityLog.count({
            where: whereClause,
        });
        return {
            auditLogs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
};
exports.AuditorService = AuditorService;
exports.AuditorService = AuditorService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], AuditorService);
//# sourceMappingURL=AuditorService.js.map