"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoreRepository = void 0;
const tsyringe_1 = require("tsyringe");
const BaseRepository_1 = require("./BaseRepository");
let ScoreRepository = class ScoreRepository extends BaseRepository_1.BaseRepository {
    getModelName() {
        return 'score';
    }
    async findByEvent(eventId) {
        return this.getModel().findMany({
            where: {
                contest: {
                    eventId
                }
            },
            include: {
                judge: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true
                    }
                },
                contestant: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true
                    }
                },
                category: true,
                contest: true
            }
        });
    }
    async findByContest(contestId) {
        return this.getModel().findMany({
            where: { contestId },
            include: {
                judge: true,
                contestant: true,
                category: true,
                contest: true
            }
        });
    }
    async findByCategory(categoryId) {
        return this.getModel().findMany({
            where: { categoryId },
            include: {
                judge: true,
                contestant: true,
                category: true,
                contest: true
            }
        });
    }
    async findByJudge(judgeId) {
        return this.getModel().findMany({
            where: { judgeId },
            include: {
                judge: true,
                contestant: true,
                category: true,
                contest: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    async findByContestant(contestantId) {
        return this.getModel().findMany({
            where: { contestantId },
            include: {
                judge: true,
                contestant: true,
                category: true,
                contest: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    async findByJudgeContestantCategory(judgeId, contestantId, categoryId) {
        return this.findFirst({
            judgeId,
            contestantId,
            categoryId
        });
    }
    async getAverageScoreForContestantInCategory(contestantId, categoryId) {
        const result = await this.getModel().aggregate({
            where: {
                contestantId,
                categoryId
            },
            _avg: {
                value: true
            }
        });
        return result._avg.value || 0;
    }
    async getTotalScoreForContestantInContest(contestantId, contestId) {
        const result = await this.getModel().aggregate({
            where: {
                contestantId,
                contestId
            },
            _sum: {
                value: true
            }
        });
        return result._sum.value || 0;
    }
    async getContestantScoresByCategory(contestantId, contestId) {
        const scores = await this.getModel().findMany({
            where: {
                contestantId,
                contestId
            },
            include: {
                category: true
            }
        });
        const categoryScores = new Map();
        scores.forEach((score) => {
            if (!categoryScores.has(score.categoryId)) {
                categoryScores.set(score.categoryId, {
                    name: score.category.name,
                    scores: []
                });
            }
            categoryScores.get(score.categoryId).scores.push(score.value);
        });
        return Array.from(categoryScores.entries()).map(([categoryId, data]) => ({
            categoryId,
            categoryName: data.name,
            averageScore: data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length,
            judgeCount: data.scores.length
        }));
    }
    async getJudgeCompletionStatus(contestId) {
        const contest = await this.prisma.contest.findUnique({
            where: { id: contestId },
            include: {
                judges: {
                    include: {
                        judge: true
                    }
                },
                contestants: {
                    include: {
                        contestant: true
                    }
                },
                categories: true
            }
        });
        if (!contest) {
            return [];
        }
        const expectedScoresPerJudge = contest.contestants.length * contest.categories.length;
        const judgeStatus = await Promise.all(contest.judges.map(async (contestJudge) => {
            const scoreCount = await this.count({
                judgeId: contestJudge.judgeId,
                contestId
            });
            return {
                judgeId: contestJudge.judgeId,
                judgeName: contestJudge.judge.name,
                totalScores: scoreCount,
                expectedScores: expectedScoresPerJudge
            };
        }));
        return judgeStatus;
    }
    async bulkCreateScores(scores) {
        return this.createMany(scores);
    }
    async deleteByContest(contestId) {
        return this.deleteMany({ contestId });
    }
    async getContestScoreStats(contestId) {
        const result = await this.getModel().aggregate({
            where: { contestId },
            _count: true,
            _avg: { value: true },
            _max: { value: true },
            _min: { value: true }
        });
        return {
            totalScores: result._count,
            averageScore: result._avg.value || 0,
            highestScore: result._max.value || 0,
            lowestScore: result._min.value || 0
        };
    }
};
exports.ScoreRepository = ScoreRepository;
exports.ScoreRepository = ScoreRepository = __decorate([
    (0, tsyringe_1.injectable)()
], ScoreRepository);
//# sourceMappingURL=ScoreRepository.js.map