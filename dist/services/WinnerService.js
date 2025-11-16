"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WinnerService = void 0;
const tsyringe_1 = require("tsyringe");
const client_1 = require("@prisma/client");
const BaseService_1 = require("./BaseService");
const crypto = __importStar(require("crypto"));
let WinnerService = class WinnerService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    generateSignature(userId, categoryId, userRole, ipAddress, userAgent) {
        const timestamp = new Date().toISOString();
        const data = `${userId}-${categoryId}-${userRole}-${timestamp}-${ipAddress || ''}-${userAgent || ''}`;
        return crypto.createHash('sha256').update(data).digest('hex');
    }
    async getWinnersByCategory(categoryId, _userRole) {
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
            include: {
                contest: {
                    include: {
                        event: true,
                    },
                },
                criteria: {
                    select: {
                        id: true,
                        maxScore: true,
                    },
                },
            },
        });
        if (!category) {
            throw this.notFoundError('Category', categoryId);
        }
        const scores = await this.prisma.score.findMany({
            where: {
                categoryId,
                score: { not: null },
            },
            include: {
                contestant: {
                    select: {
                        id: true,
                        name: true,
                        contestantNumber: true,
                    },
                },
                judge: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                criterion: {
                    select: {
                        id: true,
                        maxScore: true,
                    },
                },
            },
        });
        const deductions = await this.prisma.overallDeduction.findMany({
            where: { categoryId },
        });
        const totalPossibleScore = category.criteria?.reduce((sum, criterion) => sum + (criterion.maxScore || 0), 0) || 0;
        const contestantTotals = new Map();
        for (const score of scores) {
            if (!score.contestantId || score.score === null)
                continue;
            const contestant = score.contestant;
            if (!contestant)
                continue;
            if (!contestantTotals.has(score.contestantId)) {
                contestantTotals.set(score.contestantId, {
                    contestant: contestant,
                    totalScore: 0,
                    scores: [],
                    judgesScored: new Set(),
                });
            }
            const contestantData = contestantTotals.get(score.contestantId);
            contestantData.totalScore += score.score || 0;
            contestantData.scores.push(score);
            contestantData.judgesScored.add(score.judgeId);
        }
        for (const deduction of deductions) {
            if (contestantTotals.has(deduction.contestantId)) {
                const contestantData = contestantTotals.get(deduction.contestantId);
                contestantData.totalScore -= deduction.deduction;
            }
        }
        const winners = Array.from(contestantTotals.values())
            .map((data) => ({
            contestant: data.contestant,
            totalScore: Math.max(0, data.totalScore),
            totalPossibleScore: totalPossibleScore > 0 ? totalPossibleScore : null,
            scores: data.scores,
            judgesScored: Array.from(data.judgesScored),
        }))
            .sort((a, b) => b.totalScore - a.totalScore);
        const categoryCertifications = await this.prisma.categoryCertification.findMany({
            where: { categoryId }
        });
        const judgeCertifications = await this.prisma.judgeCertification.findMany({
            where: { categoryId },
        });
        const allSigned = judgeCertifications.length > 0;
        const boardSigned = categoryCertifications.some((c) => c.role === 'BOARD');
        const canShowWinners = boardSigned || _userRole === 'ADMIN' || _userRole === 'BOARD';
        return {
            category,
            contestants: winners,
            totalPossibleScore: totalPossibleScore > 0 ? totalPossibleScore : null,
            allSigned,
            boardSigned,
            canShowWinners,
            signatures: categoryCertifications.map((c) => ({
                userId: c.userId,
                role: c.role,
                certifiedAt: c.certifiedAt,
            })),
            message: 'Winners calculated successfully',
        };
    }
    async getWinnersByContest(contestId, _userRole, includeCategoryBreakdown = true) {
        const contest = await this.prisma.contest.findUnique({
            where: { id: contestId },
            include: {
                event: true,
                categories: {
                    include: {
                        criteria: {
                            select: {
                                id: true,
                                maxScore: true,
                            },
                        },
                    },
                },
            },
        });
        if (!contest) {
            throw this.notFoundError('Contest', contestId);
        }
        const categories = contest.categories || [];
        const categoryWinners = [];
        for (const category of categories) {
            try {
                const categoryResult = await this.getWinnersByCategory(category.id, _userRole);
                categoryWinners.push({
                    category: categoryResult.category,
                    contestants: categoryResult.contestants,
                    totalPossibleScore: categoryResult.totalPossibleScore,
                    allSigned: categoryResult.allSigned,
                    boardSigned: categoryResult.boardSigned,
                    canShowWinners: categoryResult.canShowWinners,
                });
            }
            catch (error) {
                console.error(`Error getting winners for category ${category.id}:`, error);
            }
        }
        const contestantTotals = new Map();
        for (const categoryData of categoryWinners) {
            if (!categoryData.canShowWinners && _userRole !== 'ADMIN' && _userRole !== 'BOARD') {
                continue;
            }
            for (const contestantData of categoryData.contestants || []) {
                const contestantId = contestantData.contestant?.id;
                if (!contestantId)
                    continue;
                if (!contestantTotals.has(contestantId)) {
                    contestantTotals.set(contestantId, {
                        contestant: contestantData.contestant,
                        totalScore: 0,
                        totalPossibleScore: 0,
                        categoriesParticipated: 0,
                    });
                }
                const totals = contestantTotals.get(contestantId);
                totals.totalScore += contestantData.totalScore || 0;
                totals.totalPossibleScore += contestantData.totalPossibleScore || 0;
                totals.categoriesParticipated += 1;
            }
        }
        const overallWinners = Array.from(contestantTotals.values())
            .sort((a, b) => b.totalScore - a.totalScore);
        return {
            contest,
            categories: includeCategoryBreakdown ? categoryWinners : undefined,
            contestants: overallWinners,
            message: 'Contest winners calculated successfully',
        };
    }
    async signWinners(categoryId, userId, userRole, ipAddress, userAgent) {
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
        });
        if (!category) {
            throw this.notFoundError('Category', categoryId);
        }
        const signature = this.generateSignature(userId, categoryId, userRole, ipAddress, userAgent);
        return {
            message: 'Winners signed successfully (placeholder)',
            signature,
            categoryId,
        };
    }
    async getSignatureStatus(categoryId, userId) {
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
        });
        if (!category) {
            throw this.notFoundError('Category', categoryId);
        }
        const signed = false;
        const signature = null;
        return {
            categoryId,
            userId,
            signed,
            signature,
        };
    }
    async getCertificationProgress(categoryId) {
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
        });
        if (!category) {
            throw this.notFoundError('Category', categoryId);
        }
        return {
            categoryId,
            totalsCertified: false,
            certificationProgress: 0,
            rolesCertified: [],
            rolesRemaining: [],
        };
    }
    async getRoleCertificationStatus(categoryId, role) {
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
        });
        if (!category) {
            throw this.notFoundError('Category', categoryId);
        }
        return {
            categoryId,
            role,
            certified: false,
            certifiedBy: null,
            certifiedAt: null,
        };
    }
    async certifyScores(categoryId, userId, userRole) {
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
        });
        if (!category) {
            throw this.notFoundError('Category', categoryId);
        }
        return {
            message: 'Scores certified successfully (placeholder)',
            categoryId,
            certifiedBy: userId,
            role: userRole,
        };
    }
    async getWinners(eventId, contestId) {
        if (contestId) {
            return this.getWinnersByContest(contestId, 'ADMIN');
        }
        if (eventId) {
            const event = await this.prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    contests: {
                        include: {
                            categories: {
                                include: {
                                    criteria: {
                                        select: {
                                            id: true,
                                            maxScore: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });
            if (!event) {
                throw this.notFoundError('Event', eventId);
            }
            const contestWinners = [];
            for (const contest of event.contests || []) {
                try {
                    const contestResult = await this.getWinnersByContest(contest.id, 'ADMIN', true);
                    contestWinners.push({
                        contest: contestResult.contest,
                        contestants: contestResult.contestants,
                        categories: contestResult.categories,
                    });
                }
                catch (error) {
                    console.error(`Error getting winners for contest ${contest.id}:`, error);
                }
            }
            return {
                event,
                contests: contestWinners,
                message: 'Event winners retrieved successfully',
            };
        }
        return {
            winners: [],
            message: 'No filters provided',
        };
    }
};
exports.WinnerService = WinnerService;
exports.WinnerService = WinnerService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], WinnerService);
//# sourceMappingURL=WinnerService.js.map