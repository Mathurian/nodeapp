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
exports.ReportGenerationService = void 0;
const tsyringe_1 = require("tsyringe");
const client_1 = require("@prisma/client");
const BaseService_1 = require("./BaseService");
let ReportGenerationService = class ReportGenerationService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async calculateContestWinners(contest) {
        try {
            const allCriteria = await this.prisma.criterion.findMany({
                where: {
                    categoryId: { in: contest.categories.map((c) => c.id) }
                }
            });
            const categoryMaxScoresFromCriteria = {};
            allCriteria.forEach((criterion) => {
                if (!categoryMaxScoresFromCriteria[criterion.categoryId]) {
                    categoryMaxScoresFromCriteria[criterion.categoryId] = 0;
                }
                categoryMaxScoresFromCriteria[criterion.categoryId] += criterion.maxScore;
            });
            const categoryMaxScores = {};
            contest.categories.forEach((cat) => {
                const criteriaSum = categoryMaxScoresFromCriteria[cat.id] || 0;
                categoryMaxScores[cat.id] = criteriaSum > 0 ? criteriaSum : (cat.scoreCap || null);
            });
            const allScores = await this.prisma.score.findMany({
                where: {
                    categoryId: { in: contest.categories.map((c) => c.id) }
                },
                include: {
                    contestant: true,
                    judge: true,
                    criterion: true,
                    category: true
                }
            });
            const contestantTotals = {};
            allScores.forEach((score) => {
                const contestantId = score.contestantId;
                if (!contestantTotals[contestantId]) {
                    contestantTotals[contestantId] = {
                        contestant: score.contestant,
                        totalScore: 0,
                        totalPossibleScore: 0,
                        categories: new Set(),
                        categoryJudgePairs: new Set()
                    };
                }
                if (score.score !== null) {
                    contestantTotals[contestantId].totalScore += score.score;
                    contestantTotals[contestantId].categoryJudgePairs.add(`${score.categoryId}-${score.judgeId}`);
                }
                contestantTotals[contestantId].categories.add(score.categoryId);
            });
            const winners = Object.values(contestantTotals).map((item) => {
                let totalPossible = 0;
                let hasValidMaxScore = false;
                item.categoryJudgePairs.forEach((pair) => {
                    const [categoryId] = pair.split('-');
                    const categoryMax = categoryId ? categoryMaxScores[categoryId] : undefined;
                    if (categoryMax !== null && categoryMax !== undefined && categoryMax > 0) {
                        totalPossible += categoryMax;
                        hasValidMaxScore = true;
                    }
                });
                const calculatedTotalPossible = hasValidMaxScore ? totalPossible : null;
                return {
                    contestant: item.contestant,
                    totalScore: item.totalScore,
                    totalPossibleScore: calculatedTotalPossible,
                    categoriesParticipated: item.categories.size
                };
            }).sort((a, b) => b.totalScore - a.totalScore);
            return winners;
        }
        catch (error) {
            this.handleError(error, { method: 'calculateContestWinners', contestId: contest.id });
        }
    }
    async calculateCategoryTotalPossible(category) {
        try {
            const criteria = await this.prisma.criterion.findMany({
                where: { categoryId: category.id }
            });
            if (criteria.length > 0) {
                return criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
            }
            return category.scoreCap || null;
        }
        catch (error) {
            this.handleError(error, { method: 'calculateCategoryTotalPossible', categoryId: category.id });
        }
    }
    async generateEventReportData(eventId, userId) {
        try {
            const event = await this.prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    contests: {
                        include: {
                            categories: {
                                include: {
                                    scores: {
                                        include: {
                                            contestant: true,
                                            judge: true,
                                            criterion: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });
            this.assertExists(event, 'Event', eventId);
            const contestsWithWinners = await Promise.all(event.contests.map(async (contest) => {
                const winners = await this.calculateContestWinners(contest);
                return {
                    ...contest,
                    winners
                };
            }));
            return {
                event: {
                    ...event,
                    contests: contestsWithWinners
                },
                metadata: {
                    generatedAt: new Date().toISOString(),
                    generatedBy: userId,
                    reportType: 'event_comprehensive'
                }
            };
        }
        catch (error) {
            this.handleError(error, { method: 'generateEventReportData', eventId });
        }
    }
    async generateContestResultsData(contestId, userId) {
        try {
            const contest = await this.prisma.contest.findUnique({
                where: { id: contestId },
                include: {
                    event: true,
                    categories: {
                        include: {
                            scores: {
                                include: {
                                    contestant: true,
                                    judge: true,
                                    criterion: true
                                }
                            }
                        }
                    }
                }
            });
            this.assertExists(contest, 'Contest', contestId);
            const winners = await this.calculateContestWinners(contest);
            return {
                contest: {
                    ...contest,
                    winners
                },
                winners,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    generatedBy: userId,
                    reportType: 'contest_results'
                }
            };
        }
        catch (error) {
            this.handleError(error, { method: 'generateContestResultsData', contestId });
        }
    }
    async generateJudgePerformanceData(judgeId, userId) {
        try {
            const judge = await this.prisma.judge.findUnique({
                where: { id: judgeId },
                include: {
                    scores: {
                        include: {
                            contestant: true,
                            category: true,
                            criterion: true
                        }
                    }
                }
            });
            this.assertExists(judge, 'Judge', judgeId);
            const totalScoresGiven = judge.scores.length;
            const averageScore = totalScoresGiven > 0
                ? judge.scores.reduce((sum, s) => sum + (s.score || 0), 0) / totalScoresGiven
                : 0;
            const categoryIds = new Set(judge.scores.map((s) => s.categoryId).filter(Boolean));
            const statistics = {
                totalScoresGiven,
                averageScore: Number(averageScore.toFixed(2)),
                categoriesJudged: categoryIds.size,
                categoryBreakdown: this.calculateCategoryBreakdown(judge.scores)
            };
            return {
                scores: judge.scores,
                statistics,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    generatedBy: userId,
                    reportType: 'judge_performance'
                }
            };
        }
        catch (error) {
            this.handleError(error, { method: 'generateJudgePerformanceData', judgeId });
        }
    }
    async generateSystemAnalyticsData(userId) {
        try {
            const [totalEvents, totalContests, totalCategories, totalScores, totalUsers, activeEvents] = await Promise.all([
                this.prisma.event.count(),
                this.prisma.contest.count(),
                this.prisma.category.count(),
                this.prisma.score.count(),
                this.prisma.user.count(),
                this.prisma.event.count({ where: { archived: false } })
            ]);
            const statistics = {
                totalEvents,
                activeEvents,
                archivedEvents: totalEvents - activeEvents,
                totalContests,
                totalCategories,
                totalScores,
                totalUsers,
                averageScoresPerEvent: totalEvents > 0 ? Number((totalScores / totalEvents).toFixed(2)) : 0,
                averageContestsPerEvent: totalEvents > 0 ? Number((totalContests / totalEvents).toFixed(2)) : 0
            };
            return {
                statistics,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    generatedBy: userId,
                    reportType: 'system_analytics'
                }
            };
        }
        catch (error) {
            this.handleError(error, { method: 'generateSystemAnalyticsData' });
        }
    }
    calculateCategoryBreakdown(scores) {
        const breakdown = {};
        scores.forEach(score => {
            const categoryId = score.categoryId;
            if (!breakdown[categoryId]) {
                breakdown[categoryId] = {
                    categoryName: score.category?.name || 'Unknown',
                    count: 0,
                    totalScore: 0,
                    averageScore: 0
                };
            }
            breakdown[categoryId].count++;
            breakdown[categoryId].totalScore += score.score || 0;
        });
        Object.keys(breakdown).forEach(categoryId => {
            const cat = breakdown[categoryId];
            cat.averageScore = cat.count > 0 ? Number((cat.totalScore / cat.count).toFixed(2)) : 0;
        });
        return breakdown;
    }
};
exports.ReportGenerationService = ReportGenerationService;
exports.ReportGenerationService = ReportGenerationService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], ReportGenerationService);
//# sourceMappingURL=ReportGenerationService.js.map