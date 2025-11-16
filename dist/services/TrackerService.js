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
exports.TrackerService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const client_1 = require("@prisma/client");
let TrackerService = class TrackerService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async getScoringProgressByContest(contestId) {
        const contest = await this.prisma.contest.findUnique({
            where: { id: contestId },
            select: {
                id: true,
                name: true,
                event: { select: { id: true, name: true } },
                categories: {
                    select: {
                        id: true,
                        name: true,
                        contestants: { select: { contestantId: true } },
                        scores: { select: { id: true, judgeId: true } },
                        judges: { select: { judgeId: true } }
                    }
                }
            }
        });
        if (!contest)
            throw this.notFoundError('Contest', contestId);
        const categoryProgress = await Promise.all(contest.categories.map(async (category) => {
            const totalContestants = category.contestants.length;
            const uniqueJudges = new Set(category.scores.map(s => s.judgeId));
            const totalJudgeScores = category.scores.length;
            const expectedScores = totalContestants * uniqueJudges.size;
            const completionPercentage = expectedScores > 0
                ? Math.round((totalJudgeScores / expectedScores) * 100)
                : 0;
            const judgeCompletion = await Promise.all(Array.from(uniqueJudges).map(async (judgeId) => {
                const judgeScores = category.scores.filter(s => s.judgeId === judgeId).length;
                const judgeCompletionPct = totalContestants > 0
                    ? Math.round((judgeScores / totalContestants) * 100)
                    : 0;
                const judge = await this.prisma.judge.findUnique({
                    where: { id: judgeId },
                    select: { name: true }
                });
                return {
                    judgeId,
                    judgeName: judge?.name || 'Unknown',
                    completed: judgeScores,
                    total: totalContestants,
                    completionPercentage: judgeCompletionPct
                };
            }));
            return {
                categoryId: category.id,
                categoryName: category.name,
                totalContestants,
                totalJudges: uniqueJudges.size,
                totalScores: totalJudgeScores,
                expectedScores,
                completionPercentage,
                judges: judgeCompletion
            };
        }));
        return {
            contestId: contest.id,
            contestName: contest.name,
            eventName: contest.event.name,
            categories: categoryProgress,
            overallCompletion: categoryProgress.length > 0
                ? Math.round(categoryProgress.reduce((sum, cat) => sum + cat.completionPercentage, 0) / categoryProgress.length)
                : 0
        };
    }
    async getScoringProgressByCategory(categoryId) {
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
            include: {
                contestants: { select: { contestantId: true, contestant: { select: { name: true } } } },
                scores: { select: { id: true, judgeId: true, contestantId: true } },
                judges: { select: { judgeId: true, judge: { select: { name: true } } } },
                contest: { select: { id: true, name: true, event: { select: { id: true, name: true } } } }
            }
        });
        if (!category)
            throw this.notFoundError('Category', categoryId);
        const totalContestants = category.contestants.length;
        const totalJudges = category.judges.length;
        const expectedScores = totalContestants * totalJudges;
        const totalScores = category.scores.length;
        const completionPercentage = expectedScores > 0
            ? Math.round((totalScores / expectedScores) * 100)
            : 0;
        return {
            categoryId: category.id,
            categoryName: category.name,
            contestName: category.contest.name,
            eventName: category.contest.event.name,
            totalContestants,
            totalJudges,
            totalScores,
            expectedScores,
            completionPercentage
        };
    }
};
exports.TrackerService = TrackerService;
exports.TrackerService = TrackerService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], TrackerService);
//# sourceMappingURL=TrackerService.js.map