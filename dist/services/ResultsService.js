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
exports.ResultsService = void 0;
const tsyringe_1 = require("tsyringe");
const client_1 = require("@prisma/client");
const BaseService_1 = require("./BaseService");
let ResultsService = class ResultsService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async getAllResults(filter) {
        const { userRole, userId, offset = 0, limit = 50 } = filter;
        let whereClause = {};
        const selectClause = {
            id: true,
            score: true,
            comment: true,
            createdAt: true,
            updatedAt: true,
            categoryId: true,
            contestantId: true,
            judgeId: true,
            criterionId: true,
            isCertified: true,
            certifiedBy: true,
            certifiedAt: true,
            category: {
                select: {
                    id: true,
                    name: true,
                    description: true,
                    scoreCap: true,
                    totalsCertified: true,
                    contestId: true,
                    contest: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            eventId: true,
                            createdAt: true,
                            updatedAt: true,
                            event: {
                                select: {
                                    id: true,
                                    name: true,
                                    startDate: true,
                                    endDate: true,
                                    createdAt: true,
                                    updatedAt: true,
                                },
                            },
                        },
                    },
                },
            },
            contestant: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    contestantNumber: true,
                },
            },
            judge: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            criterion: {
                select: {
                    id: true,
                    name: true,
                    maxScore: true,
                    categoryId: true,
                    createdAt: true,
                    updatedAt: true,
                },
            },
        };
        switch (userRole) {
            case 'ADMIN':
            case 'ORGANIZER':
            case 'BOARD':
            case 'TALLY_MASTER':
            case 'AUDITOR':
                break;
            case 'JUDGE': {
                const judgeUser = await this.prisma.user.findUnique({
                    where: { id: userId },
                    include: { judge: true },
                });
                if (!judgeUser?.judge) {
                    return { results: [], total: 0 };
                }
                whereClause = {
                    OR: [
                        { judgeId: judgeUser.judge.id },
                        { category: { judges: { some: { judgeId: judgeUser.judge.id } } } },
                    ],
                };
                break;
            }
            case 'CONTESTANT': {
                const user = await this.prisma.user.findUnique({
                    where: { id: userId },
                    select: { contestantId: true },
                });
                if (!user?.contestantId) {
                    return { results: [], total: 0 };
                }
                const canViewOverallResults = await this.prisma.systemSetting.findUnique({
                    where: { key: 'contestant_can_view_overall_results' },
                });
                const canViewOverall = (canViewOverallResults?.value || 'true') === 'true';
                const certifiedCategories = await this.prisma.category.findMany({
                    where: { totalsCertified: true },
                    select: { id: true },
                });
                const certifiedCategoryIds = certifiedCategories.map((c) => c.id);
                if (certifiedCategoryIds.length === 0) {
                    return { results: [], total: 0 };
                }
                if (canViewOverall) {
                    whereClause = {
                        categoryId: { in: certifiedCategoryIds },
                    };
                }
                else {
                    whereClause = {
                        contestantId: user.contestantId,
                        categoryId: { in: certifiedCategoryIds },
                    };
                }
                break;
            }
            default:
                throw new Error('Insufficient permissions');
        }
        const results = await this.prisma.score.findMany({
            where: whereClause,
            select: selectClause,
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limit,
        });
        const total = await this.prisma.score.count({
            where: whereClause,
        });
        const resultsWithTotals = await Promise.all(results.map(async (result) => {
            const categoryScores = await this.prisma.score.findMany({
                where: {
                    categoryId: result.categoryId,
                    contestantId: result.contestantId,
                },
                select: {
                    id: true,
                    score: true,
                    categoryId: true,
                    contestantId: true,
                    criterionId: true,
                    category: {
                        select: {
                            id: true,
                            name: true,
                            scoreCap: true,
                            totalsCertified: true,
                        },
                    },
                    criterion: {
                        select: {
                            id: true,
                            name: true,
                            maxScore: true,
                            categoryId: true,
                            createdAt: true,
                            updatedAt: true,
                        },
                    },
                },
            });
            const earned = categoryScores.reduce((sum, s) => sum + (s.score || 0), 0);
            const possible = result.category?.scoreCap || 0;
            return {
                ...result,
                certificationStatus: result.isCertified ? 'CERTIFIED' : 'PENDING',
                certifiedBy: result.certifiedBy,
                certifiedAt: result.certifiedAt,
                totalEarned: earned,
                totalPossible: possible,
            };
        }));
        return { results: resultsWithTotals, total };
    }
    async getCategories() {
        return await this.prisma.category.findMany({
            include: {
                contest: {
                    include: {
                        event: true,
                    },
                },
            },
        });
    }
    async getContestantResults(filter) {
        const { contestantId, userRole, userId } = filter;
        let whereClause = { contestantId };
        if (userRole === 'CONTESTANT') {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { contestantId: true },
            });
            if (!user?.contestantId || user.contestantId !== contestantId) {
                throw new Error('Access denied. You can only view your own results.');
            }
        }
        else if (userRole === 'JUDGE') {
            const judgeUser = await this.prisma.user.findUnique({
                where: { id: userId },
                include: { judge: true },
            });
            if (!judgeUser?.judge) {
                return [];
            }
            whereClause.judgeId = judgeUser.judge.id;
        }
        else if (!['ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'EMCEE'].includes(userRole)) {
            throw new Error('Insufficient permissions');
        }
        return await this.prisma.score.findMany({
            where: whereClause,
            include: {
                category: {
                    include: {
                        contest: {
                            include: {
                                event: true,
                            },
                        },
                    },
                },
                judge: true,
            },
        });
    }
    async getCategoryResults(filter) {
        const { categoryId, userRole, userId } = filter;
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
        });
        if (!category) {
            throw new Error('Category not found');
        }
        let whereClause = { categoryId };
        if (userRole === 'CONTESTANT') {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { contestantId: true },
            });
            if (!user?.contestantId) {
                return [];
            }
            whereClause.contestantId = user.contestantId;
        }
        else if (userRole === 'JUDGE') {
            const judgeUser = await this.prisma.user.findUnique({
                where: { id: userId },
                include: { judge: true },
            });
            if (!judgeUser?.judge) {
                return [];
            }
            const assignment = await this.prisma.assignment.findFirst({
                where: {
                    judgeId: judgeUser.judge.id,
                    categoryId,
                    status: { in: ['ACTIVE', 'COMPLETED', 'PENDING'] },
                },
            });
            if (!assignment) {
                const hasScores = await this.prisma.score.findFirst({
                    where: {
                        categoryId,
                        judgeId: judgeUser.judge.id,
                    },
                });
                if (!hasScores) {
                    throw new Error('Not assigned to this category');
                }
            }
        }
        else if (!['ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'EMCEE'].includes(userRole)) {
            throw new Error('Insufficient permissions');
        }
        const scores = await this.prisma.score.findMany({
            where: whereClause,
            include: {
                contestant: true,
                judge: true,
                category: true,
                criterion: true,
            },
        });
        const resultsMap = new Map();
        scores.forEach((score) => {
            if (!score.contestant)
                return;
            const contestantId = score.contestantId;
            if (!resultsMap.has(contestantId)) {
                resultsMap.set(contestantId, {
                    contestant: score.contestant,
                    category: score.category,
                    totalScore: 0,
                    averageScore: 0,
                    scoreCount: 0,
                    scores: [],
                });
            }
            const result = resultsMap.get(contestantId);
            if (score.score !== null && score.score !== undefined) {
                result.totalScore += score.score;
                result.scoreCount++;
            }
            result.scores.push(score);
        });
        const results = Array.from(resultsMap.values()).map((result) => ({
            ...result,
            averageScore: result.scoreCount > 0 ? result.totalScore / result.scoreCount : 0,
        }));
        results.sort((a, b) => b.totalScore - a.totalScore);
        results.forEach((result, index) => {
            result.rank = index + 1;
        });
        return results;
    }
    async getContestResults(filter) {
        const { contestId, userRole, userId } = filter;
        const contest = await this.prisma.contest.findUnique({
            where: { id: contestId },
        });
        if (!contest) {
            throw new Error('Contest not found');
        }
        let whereClause = {
            category: {
                contestId,
            },
        };
        if (userRole === 'CONTESTANT') {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { contestantId: true },
            });
            if (!user?.contestantId) {
                return [];
            }
            whereClause.contestantId = user.contestantId;
        }
        else if (userRole === 'JUDGE') {
            const judgeUser = await this.prisma.user.findUnique({
                where: { id: userId },
                include: { judge: true },
            });
            if (!judgeUser?.judge) {
                return [];
            }
            const assignment = await this.prisma.assignment.findFirst({
                where: {
                    judgeId: judgeUser.judge.id,
                    contestId,
                    status: { in: ['ACTIVE', 'COMPLETED', 'PENDING'] },
                },
            });
            if (!assignment) {
                const hasScores = await this.prisma.score.findFirst({
                    where: {
                        judgeId: judgeUser.judge.id,
                        category: {
                            contestId,
                        },
                    },
                });
                if (!hasScores) {
                    throw new Error('Not assigned to this contest');
                }
            }
        }
        else if (!['ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'EMCEE'].includes(userRole)) {
            throw new Error('Insufficient permissions');
        }
        return await this.prisma.score.findMany({
            where: whereClause,
            include: {
                category: true,
                contestant: true,
                judge: true,
            },
        });
    }
    async getEventResults(filter) {
        const { eventId, userRole, userId } = filter;
        const event = await this.prisma.event.findUnique({
            where: { id: eventId },
        });
        if (!event) {
            throw new Error('Event not found');
        }
        let whereClause = {
            category: {
                contest: {
                    eventId,
                },
            },
        };
        if (userRole === 'CONTESTANT') {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { contestantId: true },
            });
            if (!user?.contestantId) {
                return [];
            }
            whereClause.contestantId = user.contestantId;
        }
        else if (userRole === 'JUDGE') {
            const judgeUser = await this.prisma.user.findUnique({
                where: { id: userId },
                include: { judge: true },
            });
            if (!judgeUser?.judge) {
                return [];
            }
            const assignment = await this.prisma.assignment.findFirst({
                where: {
                    judgeId: judgeUser.judge.id,
                    eventId,
                    status: { in: ['ACTIVE', 'COMPLETED', 'PENDING'] },
                },
            });
            if (!assignment) {
                const hasScores = await this.prisma.score.findFirst({
                    where: {
                        judgeId: judgeUser.judge.id,
                        category: {
                            contest: {
                                eventId,
                            },
                        },
                    },
                });
                if (!hasScores) {
                    throw new Error('Not assigned to this event');
                }
            }
        }
        else if (!['ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'EMCEE'].includes(userRole)) {
            throw new Error('Insufficient permissions');
        }
        return await this.prisma.score.findMany({
            where: whereClause,
            include: {
                category: {
                    include: {
                        contest: true,
                    },
                },
                contestant: true,
                judge: true,
            },
        });
    }
};
exports.ResultsService = ResultsService;
exports.ResultsService = ResultsService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], ResultsService);
//# sourceMappingURL=ResultsService.js.map