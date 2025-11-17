"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateContestResultsReport = exports.generateSystemAnalyticsReport = exports.generateJudgePerformanceReport = exports.generateEventReport = exports.generateSummaryReport = exports.generateScoreReport = exports.AdvancedReportingController = void 0;
const container_1 = require("../config/container");
const AdvancedReportingService_1 = require("../services/AdvancedReportingService");
const responseHelpers_1 = require("../utils/responseHelpers");
class AdvancedReportingController {
    advancedReportingService;
    prisma;
    constructor() {
        this.advancedReportingService = container_1.container.resolve(AdvancedReportingService_1.AdvancedReportingService);
        this.prisma = container_1.container.resolve('PrismaClient');
    }
    generateScoreReport = async (req, res, next) => {
        try {
            const { eventId, contestId, categoryId } = req.query;
            const report = await this.advancedReportingService.generateScoreReport(eventId, contestId, categoryId);
            return (0, responseHelpers_1.sendSuccess)(res, report);
        }
        catch (error) {
            return next(error);
        }
    };
    generateSummaryReport = async (req, res, next) => {
        try {
            const { eventId } = req.params;
            const report = await this.advancedReportingService.generateSummaryReport(eventId);
            return (0, responseHelpers_1.sendSuccess)(res, report);
        }
        catch (error) {
            return next(error);
        }
    };
    generateEventReport = async (req, res, next) => {
        try {
            const { eventId } = req.params;
            if (!eventId) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'eventId is required', 400);
            }
            const event = await this.prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    contests: {
                        include: {
                            categories: {
                                include: {
                                    _count: {
                                        select: {
                                            scores: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });
            if (!event) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Event not found', 404);
            }
            const [totalScores, totalContestants, totalCategories, totalJudges] = await Promise.all([
                this.prisma.score.count({
                    where: {
                        category: {
                            contest: {
                                eventId
                            }
                        }
                    }
                }),
                this.prisma.contestContestant.count({
                    where: {
                        contest: {
                            eventId
                        }
                    }
                }),
                this.prisma.category.count({
                    where: {
                        contest: {
                            eventId
                        }
                    }
                }),
                this.prisma.assignment.count({
                    where: {
                        eventId
                    }
                })
            ]);
            const report = {
                event: {
                    id: event.id,
                    name: event.name,
                    startDate: event.startDate,
                    endDate: event.endDate,
                    location: event.location,
                    archived: event.archived,
                    isLocked: event.isLocked
                },
                summary: {
                    totalContests: event.contests.length,
                    totalCategories,
                    totalContestants,
                    totalJudges,
                    totalScores
                },
                contests: event.contests.map((contest) => ({
                    id: contest.id,
                    name: contest.name,
                    categories: contest.categories.map((cat) => ({
                        id: cat.id,
                        name: cat.name,
                        scores: cat._count.scores
                    }))
                })),
                generatedAt: new Date()
            };
            return (0, responseHelpers_1.sendSuccess)(res, report);
        }
        catch (error) {
            return next(error);
        }
    };
    generateJudgePerformanceReport = async (req, res, next) => {
        try {
            const { judgeId } = req.params;
            const eventId = req.query.eventId;
            const contestId = req.query.contestId;
            if (!judgeId) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'judgeId is required', 400);
            }
            const judge = await this.prisma.judge.findUnique({
                where: { id: judgeId }
            });
            if (!judge) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Judge not found', 404);
            }
            const scoreWhere = { judgeId };
            if (eventId) {
                scoreWhere.category = {
                    contest: { eventId }
                };
            }
            if (contestId) {
                scoreWhere.category = {
                    contestId
                };
            }
            const scores = await this.prisma.score.findMany({
                where: scoreWhere,
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            contest: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    },
                    contestant: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });
            const totalScores = scores.length;
            const certifiedScores = scores.filter(s => s.isCertified).length;
            const scoreValues = scores.map(s => s.score).filter((s) => s !== null);
            const avgScore = scoreValues.length > 0
                ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length
                : 0;
            const maxScore = scoreValues.length > 0 ? Math.max(...scoreValues) : 0;
            const minScore = scoreValues.length > 0 ? Math.min(...scoreValues) : 0;
            const byCategory = scores.reduce((acc, score) => {
                const catId = score.category.id;
                if (!acc[catId]) {
                    acc[catId] = {
                        categoryId: catId,
                        categoryName: score.category.name,
                        contestName: score.category.contest.name,
                        count: 0,
                        total: 0,
                        avg: 0
                    };
                }
                acc[catId].count++;
                acc[catId].total += score.score;
                acc[catId].avg = acc[catId].total / acc[catId].count;
                return acc;
            }, {});
            const report = {
                judge: {
                    id: judge.id,
                    name: judge.name,
                    email: judge.email
                },
                summary: {
                    totalScores,
                    certifiedScores,
                    certificationRate: totalScores > 0 ? ((certifiedScores / totalScores) * 100).toFixed(2) : '0',
                    averageScore: parseFloat(avgScore.toFixed(2)),
                    maxScore,
                    minScore
                },
                byCategory: Object.values(byCategory),
                filters: {
                    eventId,
                    contestId
                },
                generatedAt: new Date()
            };
            return (0, responseHelpers_1.sendSuccess)(res, report);
        }
        catch (error) {
            return next(error);
        }
    };
    generateSystemAnalyticsReport = async (req, res, next) => {
        try {
            const days = parseInt(req.query.days) || 30;
            const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            const [totalUsers, totalEvents, totalContests, totalCategories, totalContestants, totalJudges, totalScores, recentActivity, usersByRole, eventsByStatus] = await Promise.all([
                this.prisma.user.count(),
                this.prisma.event.count(),
                this.prisma.contest.count(),
                this.prisma.category.count(),
                this.prisma.contestant.count(),
                this.prisma.judge.count(),
                this.prisma.score.count(),
                this.prisma.activityLog.count({
                    where: {
                        createdAt: { gte: since }
                    }
                }),
                this.prisma.user.groupBy({
                    by: ['role'],
                    _count: { id: true }
                }),
                this.prisma.event.groupBy({
                    by: ['archived'],
                    _count: { id: true }
                })
            ]);
            const recentEvents = await this.prisma.event.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    startDate: true,
                    endDate: true,
                    archived: true,
                    isLocked: true,
                    createdAt: true
                }
            });
            const scoringStats = await this.prisma.score.aggregate({
                _avg: { score: true },
                _max: { score: true },
                _min: { score: true }
            });
            const certifiedScores = await this.prisma.score.count({
                where: { isCertified: true }
            });
            const report = {
                summary: {
                    totalUsers,
                    totalEvents,
                    totalContests,
                    totalCategories,
                    totalContestants,
                    totalJudges,
                    totalScores,
                    certifiedScores,
                    certificationRate: totalScores > 0 ? ((certifiedScores / totalScores) * 100).toFixed(2) : '0'
                },
                activity: {
                    recentActivityLogs: recentActivity,
                    timeRangeDays: days
                },
                usersByRole: usersByRole.map(r => ({
                    role: r.role,
                    count: r._count?.id || 0
                })),
                eventsByStatus: eventsByStatus.map(e => ({
                    archived: e.archived,
                    count: e._count?.id || 0
                })),
                scoringStatistics: {
                    averageScore: scoringStats._avg.score || 0,
                    maxScore: scoringStats._max.score || 0,
                    minScore: scoringStats._min.score || 0
                },
                recentEvents,
                generatedAt: new Date()
            };
            return (0, responseHelpers_1.sendSuccess)(res, report);
        }
        catch (error) {
            return next(error);
        }
    };
    generateContestResultsReport = async (req, res, next) => {
        try {
            const { contestId } = req.params;
            if (!contestId) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'contestId is required', 400);
            }
            const contest = await this.prisma.contest.findUnique({
                where: { id: contestId },
                include: {
                    categories: {
                        include: {
                            _count: {
                                select: {
                                    scores: true
                                }
                            }
                        }
                    }
                }
            });
            if (!contest) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Contest not found', 404);
            }
            const event = await this.prisma.event.findUnique({
                where: { id: contest.eventId },
                select: {
                    id: true,
                    name: true,
                    startDate: true,
                    endDate: true
                }
            });
            const categoryResults = await Promise.all(contest.categories.map(async (category) => {
                const scores = await this.prisma.score.findMany({
                    where: {
                        categoryId: category.id
                    },
                    include: {
                        contestant: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        judge: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                });
                const contestantScores = scores.reduce((acc, score) => {
                    const cId = score.contestantId;
                    if (!acc[cId]) {
                        acc[cId] = {
                            contestantId: cId,
                            contestantName: score.contestant.name,
                            scores: [],
                            total: 0,
                            average: 0,
                            rank: 0
                        };
                    }
                    acc[cId].scores.push({
                        judgeName: score.judge.name,
                        score: score.score || 0,
                        certified: score.isCertified
                    });
                    acc[cId].total += score.score || 0;
                    return acc;
                }, {});
                const rankings = Object.values(contestantScores)
                    .map((c) => {
                    c.average = c.scores.length > 0 ? c.total / c.scores.length : 0;
                    return c;
                })
                    .sort((a, b) => b.total - a.total)
                    .map((c, index) => {
                    c.rank = index + 1;
                    return c;
                });
                const contestantCount = await this.prisma.contestContestant.count({
                    where: {
                        contestId,
                        contest: {
                            categories: {
                                some: {
                                    id: category.id
                                }
                            }
                        }
                    }
                });
                return {
                    categoryId: category.id,
                    categoryName: category.name,
                    totalContestants: contestantCount,
                    totalScores: category._count.scores,
                    rankings
                };
            }));
            const report = {
                contest: {
                    id: contest.id,
                    name: contest.name,
                    event
                },
                categories: categoryResults,
                summary: {
                    totalCategories: contest.categories.length,
                    totalContestants: categoryResults.reduce((sum, cat) => sum + cat.totalContestants, 0),
                    totalScores: categoryResults.reduce((sum, cat) => sum + cat.totalScores, 0)
                },
                generatedAt: new Date()
            };
            return (0, responseHelpers_1.sendSuccess)(res, report);
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.AdvancedReportingController = AdvancedReportingController;
const controller = new AdvancedReportingController();
exports.generateScoreReport = controller.generateScoreReport;
exports.generateSummaryReport = controller.generateSummaryReport;
exports.generateEventReport = controller.generateEventReport;
exports.generateJudgePerformanceReport = controller.generateJudgePerformanceReport;
exports.generateSystemAnalyticsReport = controller.generateSystemAnalyticsReport;
exports.generateContestResultsReport = controller.generateContestResultsReport;
//# sourceMappingURL=advancedReportingController.js.map