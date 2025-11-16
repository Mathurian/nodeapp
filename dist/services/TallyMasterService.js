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
exports.TallyMasterService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const client_1 = require("@prisma/client");
let TallyMasterService = class TallyMasterService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async getStats() {
        const stats = {
            totalCategories: await this.prisma.category.count(),
            pendingTotals: await this.prisma.category.count({
                where: { totalsCertified: false },
            }),
            certifiedTotals: await this.prisma.category.count({
                where: { totalsCertified: true },
            }),
        };
        return stats;
    }
    async getCertifications(page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const categories = await this.prisma.category.findMany({
            where: { totalsCertified: true },
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
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limit,
        });
        const total = await this.prisma.category.count({
            where: { totalsCertified: true },
        });
        return {
            categories,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
    async getCertificationQueue(page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const allCategories = await this.prisma.category.findMany({
            where: { totalsCertified: false },
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
                scores: {
                    include: {
                        judge: true,
                        contestant: true,
                    },
                },
                categoryCertifications: {
                    where: {
                        role: 'TALLY_MASTER',
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const pendingItems = await Promise.all(allCategories.map(async (category) => {
            const hasJudgeCategoryCert = await this.prisma.judgeCertification.findFirst({
                where: { categoryId: category.id },
            });
            const hasTallyCert = category.categoryCertifications.length > 0;
            const allJudgesCertified = category.scores.length === 0 || category.scores.every((s) => s.isCertified === true);
            return hasJudgeCategoryCert && !hasTallyCert && allJudgesCertified && category.scores.length > 0
                ? category
                : null;
        }));
        const categories = pendingItems.filter(Boolean);
        const total = categories.length;
        const paginatedCategories = categories.slice(offset, offset + limit);
        return {
            categories: paginatedCategories,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
    async getPendingCertifications(page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const allCategories = await this.prisma.category.findMany({
            where: { totalsCertified: false },
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
                scores: {
                    include: {
                        judge: true,
                        contestant: true,
                    },
                },
                categoryCertifications: {
                    where: {
                        role: 'TALLY_MASTER',
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const pendingItems = await Promise.all(allCategories.map(async (category) => {
            const hasJudgeCategoryCert = await this.prisma.judgeCertification.findFirst({
                where: { categoryId: category.id },
            });
            const hasTallyCert = category.categoryCertifications.length > 0;
            const allJudgesCertified = category.scores.length === 0 || category.scores.every((s) => s.isCertified === true);
            return hasJudgeCategoryCert && !hasTallyCert && allJudgesCertified && category.scores.length > 0
                ? category
                : null;
        }));
        const filteredCategories = pendingItems.filter(Boolean);
        const total = filteredCategories.length;
        const categories = filteredCategories.slice(offset, offset + limit);
        const categoriesWithStatus = categories.map((category) => {
            const allJudgesCertified = category.scores.length > 0 && category.scores.every((s) => s.isCertified === true);
            const judgeStatus = allJudgesCertified ? 'COMPLETED' : 'PENDING';
            let currentStep = 1;
            const totalSteps = 4;
            let statusLabel = 'Waiting for Judges';
            let statusColor = 'warning';
            if (allJudgesCertified && !category.totalsCertified) {
                currentStep = 2;
                statusLabel = 'Ready for Tally Master';
                statusColor = 'success';
            }
            else if (category.totalsCertified && !category.tallyMasterCertified) {
                currentStep = 3;
                statusLabel = 'Ready for Tally Master Review';
                statusColor = 'info';
            }
            else if (category.tallyMasterCertified && !category.auditorCertified) {
                currentStep = 4;
                statusLabel = 'Ready for Auditor';
                statusColor = 'info';
            }
            else if (category.auditorCertified && !category.boardApproved) {
                currentStep = 5;
                statusLabel = 'Ready for Board';
                statusColor = 'success';
            }
            else if (category.boardApproved) {
                currentStep = 6;
                statusLabel = 'Fully Certified';
                statusColor = 'success';
            }
            return {
                ...category,
                certificationStatus: {
                    currentStep,
                    totalSteps,
                    statusLabel,
                    statusColor,
                    allJudgesCertified,
                },
            };
        });
        return {
            categories: categoriesWithStatus,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
    async certifyTotals(categoryId, userId, userRole) {
        this.validateRequired({ categoryId }, ['categoryId']);
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
        const updatedCategory = await this.prisma.category.update({
            where: { id: categoryId },
            data: {
                totalsCertified: true,
            },
        });
        return updatedCategory;
    }
    async getScoreReview(categoryId) {
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
            select: {
                id: true,
                name: true,
                description: true,
                scoreCap: true,
                contest: {
                    select: {
                        id: true,
                        name: true,
                        event: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                scores: {
                    select: {
                        id: true,
                        score: true,
                        comment: true,
                        createdAt: true,
                        contestantId: true,
                        judge: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                        contestant: {
                            select: {
                                id: true,
                                name: true,
                                contestantNumber: true,
                            },
                        },
                        criterion: {
                            select: {
                                id: true,
                                name: true,
                                maxScore: true,
                            },
                        },
                    },
                    orderBy: [{ contestant: { name: 'asc' } }],
                },
            },
        });
        if (!category) {
            throw this.notFoundError('Category', categoryId);
        }
        const contestantScores = category.scores.reduce((acc, score) => {
            const key = score.contestantId;
            if (!acc[key]) {
                acc[key] = {
                    contestant: score.contestant,
                    scores: [],
                    totalScore: 0,
                    averageScore: 0,
                    scoreCount: 0,
                };
            }
            acc[key].scores.push(score);
            acc[key].totalScore += score.score;
            acc[key].scoreCount += 1;
            return acc;
        }, {});
        Object.values(contestantScores).forEach((group) => {
            group.averageScore = group.scoreCount > 0 ? group.totalScore / group.scoreCount : 0;
        });
        const sortedContestants = Object.values(contestantScores).sort((a, b) => b.averageScore - a.averageScore);
        return {
            category: {
                id: category.id,
                name: category.name,
                description: category.description,
                scoreCap: category.scoreCap,
                maxScore: category.scoreCap,
            },
            contest: {
                id: category.contest.id,
                name: category.contest.name,
                eventName: category.contest.event.name,
            },
            contestants: sortedContestants,
            totalScores: category.scores.length,
            uniqueContestants: Object.keys(contestantScores).length,
        };
    }
    async getBiasCheckingTools(categoryId) {
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
            include: {
                scores: {
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
                    },
                },
            },
        });
        if (!category) {
            throw this.notFoundError('Category', categoryId);
        }
        const judgeScores = category.scores.reduce((acc, score) => {
            const key = score.judgeId;
            if (!acc[key]) {
                acc[key] = {
                    judge: score.judge,
                    scores: [],
                    totalScore: 0,
                    averageScore: 0,
                    scoreCount: 0,
                };
            }
            acc[key].scores.push(score);
            acc[key].totalScore += score.score;
            acc[key].scoreCount += 1;
            return acc;
        }, {});
        Object.values(judgeScores).forEach((group) => {
            group.averageScore = group.scoreCount > 0 ? group.totalScore / group.scoreCount : 0;
        });
        const overallAverage = category.scores.length > 0
            ? category.scores.reduce((sum, s) => sum + s.score, 0) / category.scores.length
            : 0;
        const biasAnalysis = Object.values(judgeScores)
            .map((judge) => {
            const deviation = Math.abs(judge.averageScore - overallAverage);
            const deviationPercentage = overallAverage > 0 ? (deviation / overallAverage) * 100 : 0;
            return {
                judge: judge.judge,
                averageScore: parseFloat(judge.averageScore.toFixed(2)),
                scoreCount: judge.scoreCount,
                deviation: parseFloat(deviation.toFixed(2)),
                deviationPercentage: parseFloat(deviationPercentage.toFixed(2)),
                potentialBias: deviationPercentage > 20,
            };
        })
            .sort((a, b) => b.deviationPercentage - a.deviationPercentage);
        return {
            category: {
                id: category.id,
                name: category.name,
                description: category.description,
                maxScore: category.maxScore,
            },
            overallAverage: parseFloat(overallAverage.toFixed(2)),
            totalScores: category.scores.length,
            uniqueJudges: Object.keys(judgeScores).length,
            biasAnalysis,
            recommendations: biasAnalysis
                .filter((j) => j.potentialBias)
                .map((j) => `Judge ${j.judge.name} shows potential bias with ${j.deviationPercentage}% deviation from average`),
        };
    }
    async getTallyMasterHistory(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const categories = await this.prisma.category.findMany({
            where: {
                tallyMasterCertified: true,
            },
            include: {
                contest: {
                    include: {
                        event: true,
                    },
                },
            },
            orderBy: { updatedAt: 'desc' },
            skip: offset,
            take: limit,
        });
        const total = await this.prisma.category.count({
            where: {
                tallyMasterCertified: true,
            },
        });
        return {
            categories,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
    async getContestScoreReview(contestId) {
        const contest = await this.prisma.contest.findUnique({
            where: { id: contestId },
            include: {
                event: true,
                categories: {
                    include: {
                        scores: {
                            include: {
                                judge: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                    },
                                },
                                contestant: {
                                    select: {
                                        id: true,
                                        name: true,
                                        contestantNumber: true,
                                    },
                                },
                                criterion: {
                                    select: {
                                        id: true,
                                        name: true,
                                        maxScore: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!contest) {
            throw this.notFoundError('Contest', contestId);
        }
        const judgeBreakdown = {};
        contest.categories.forEach((category) => {
            category.scores.forEach((score) => {
                const judgeId = score.judgeId;
                if (!judgeBreakdown[judgeId]) {
                    judgeBreakdown[judgeId] = {
                        judge: score.judge,
                        categories: new Set(),
                        contestants: new Set(),
                        scores: [],
                        totalScore: 0,
                    };
                }
                judgeBreakdown[judgeId].scores.push({ ...score, categoryId: category.id, categoryName: category.name });
                judgeBreakdown[judgeId].categories.add(category.id);
                judgeBreakdown[judgeId].contestants.add(score.contestantId);
                if (score.score) {
                    judgeBreakdown[judgeId].totalScore += score.score;
                }
            });
        });
        Object.values(judgeBreakdown).forEach((judge) => {
            judge.categories = Array.from(judge.categories);
            judge.contestants = Array.from(judge.contestants);
        });
        const contestantBreakdown = {};
        contest.categories.forEach((category) => {
            category.scores.forEach((score) => {
                const contestantId = score.contestantId;
                if (!contestantBreakdown[contestantId]) {
                    contestantBreakdown[contestantId] = {
                        contestant: score.contestant,
                        categories: new Set(),
                        judges: new Set(),
                        scores: [],
                        totalScore: 0,
                    };
                }
                contestantBreakdown[contestantId].scores.push({ ...score, categoryId: category.id, categoryName: category.name });
                contestantBreakdown[contestantId].categories.add(category.id);
                contestantBreakdown[contestantId].judges.add(score.judgeId);
                if (score.score) {
                    contestantBreakdown[contestantId].totalScore += score.score;
                }
            });
        });
        Object.values(contestantBreakdown).forEach((contestant) => {
            contestant.categories = Array.from(contestant.categories);
            contestant.judges = Array.from(contestant.judges);
        });
        return {
            contest: {
                id: contest.id,
                name: contest.name,
                event: contest.event,
            },
            summary: {
                totalCategories: contest.categories.length,
                uniqueJudges: Object.keys(judgeBreakdown).length,
                uniqueContestants: Object.keys(contestantBreakdown).length,
                totalScores: contest.categories.reduce((sum, cat) => sum + cat.scores.length, 0),
            },
            judgeBreakdown: Object.values(judgeBreakdown),
            contestantBreakdown: Object.values(contestantBreakdown),
        };
    }
    async getCategoryJudges(categoryId) {
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
            include: {
                scores: {
                    include: {
                        judge: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });
        if (!category) {
            throw this.notFoundError('Category', categoryId);
        }
        const uniqueJudgesMap = new Map();
        category.scores.forEach((score) => {
            if (score.judge && !uniqueJudgesMap.has(score.judge.id)) {
                uniqueJudgesMap.set(score.judge.id, score.judge);
            }
        });
        return Array.from(uniqueJudgesMap.values());
    }
    async getContestCertifications(contestId) {
        const contest = await this.prisma.contest.findUnique({
            where: { id: contestId },
            include: {
                event: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                categories: {
                    include: {
                        criteria: {
                            select: {
                                id: true,
                                name: true,
                                maxScore: true
                            }
                        },
                        scores: {
                            include: {
                                judge: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                },
                                contestant: {
                                    select: {
                                        id: true,
                                        contestantNumber: true,
                                        users: {
                                            select: {
                                                id: true,
                                                name: true
                                            },
                                            take: 1
                                        }
                                    }
                                }
                            }
                        },
                        categoryJudges: {
                            include: {
                                judge: {
                                    include: {
                                        users: {
                                            select: {
                                                id: true,
                                                name: true
                                            },
                                            take: 1
                                        }
                                    }
                                }
                            }
                        },
                        categoryContestants: {
                            include: {
                                contestant: {
                                    include: {
                                        users: {
                                            select: {
                                                id: true,
                                                name: true
                                            },
                                            take: 1
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        if (!contest) {
            throw this.notFoundError('Contest', contestId);
        }
        const categoriesWithStatus = await Promise.all(contest.categories.map(async (category) => {
            const totalJudges = Array.isArray(category.categoryJudges) ? category.categoryJudges.length : 0;
            const totalContestants = Array.isArray(category.categoryContestants) ? category.categoryContestants.length : 0;
            const criteriaCount = Array.isArray(category.criteria) ? category.criteria.length : 0;
            const expectedScores = totalJudges * totalContestants * criteriaCount;
            const actualScores = Array.isArray(category.scores) ? category.scores.length : 0;
            const certifications = await this.prisma.judgeContestantCertification.findMany({
                where: { categoryId: category.id }
            });
            const expectedCertifications = totalJudges * totalContestants;
            const completedCertifications = Array.isArray(certifications) ? certifications.length : 0;
            return {
                categoryId: category.id,
                categoryName: category.name,
                totalJudges,
                totalContestants,
                expectedScores,
                actualScores,
                scoringCompletion: expectedScores > 0 ? Math.round((actualScores / expectedScores) * 100) : 0,
                expectedCertifications,
                completedCertifications,
                certificationCompletion: expectedCertifications > 0
                    ? Math.round((completedCertifications / expectedCertifications) * 100)
                    : 0
            };
        }));
        return {
            contestId: contest.id,
            contestName: contest.name,
            event: contest.event,
            categories: categoriesWithStatus,
            totalCategories: categoriesWithStatus.length,
            averageScoringCompletion: categoriesWithStatus.length > 0
                ? Math.round(categoriesWithStatus.reduce((sum, cat) => sum + cat.scoringCompletion, 0) / categoriesWithStatus.length)
                : 0,
            averageCertificationCompletion: categoriesWithStatus.length > 0
                ? Math.round(categoriesWithStatus.reduce((sum, cat) => sum + cat.certificationCompletion, 0) / categoriesWithStatus.length)
                : 0
        };
    }
    async getScoreRemovalRequests(page = 1, limit = 20, status, categoryId, contestId) {
        const offset = (page - 1) * limit;
        const whereClause = {};
        if (status) {
            whereClause.status = status;
        }
        if (categoryId) {
            whereClause.categoryId = categoryId;
        }
        if (contestId) {
            const categories = await this.prisma.category.findMany({
                where: { contestId },
                select: { id: true }
            });
            whereClause.categoryId = { in: categories.map(c => c.id) };
        }
        const requests = await this.prisma.judgeScoreRemovalRequest.findMany({
            where: whereClause,
            orderBy: { requestedAt: 'desc' },
            skip: offset,
            take: limit,
        });
        const requestsWithDetails = await Promise.all(requests.map(async (req) => {
            const [category, contestant, judge] = await Promise.all([
                this.prisma.category.findUnique({
                    where: { id: req.categoryId },
                    select: {
                        id: true,
                        name: true,
                        contest: {
                            select: {
                                id: true,
                                name: true,
                                event: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                }),
                this.prisma.contestant.findUnique({
                    where: { id: req.contestantId },
                    select: {
                        id: true,
                        contestantNumber: true,
                        users: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                            take: 1,
                        },
                    },
                }),
                this.prisma.judge.findUnique({
                    where: { id: req.judgeId },
                    select: {
                        id: true,
                        name: true,
                        users: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                            take: 1,
                        },
                    },
                }),
            ]);
            return {
                id: req.id,
                categoryId: req.categoryId,
                contestantId: req.contestantId,
                judgeId: req.judgeId,
                reason: req.reason,
                status: req.status,
                requestedAt: req.requestedAt,
                reviewedAt: req.reviewedAt,
                reviewedById: req.reviewedById,
                category: category,
                contestant: contestant
                    ? {
                        id: contestant.id,
                        contestantNumber: contestant.contestantNumber,
                        user: contestant.users?.[0] || null,
                    }
                    : null,
                judge: judge
                    ? {
                        id: judge.id,
                        name: judge.name,
                        user: judge.users?.[0] || null,
                    }
                    : null,
            };
        }));
        const total = await this.prisma.judgeScoreRemovalRequest.count({
            where: whereClause,
        });
        return {
            requests: requestsWithDetails,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
};
exports.TallyMasterService = TallyMasterService;
exports.TallyMasterService = TallyMasterService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], TallyMasterService);
//# sourceMappingURL=TallyMasterService.js.map