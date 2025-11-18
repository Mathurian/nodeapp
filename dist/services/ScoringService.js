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
exports.ScoringService = void 0;
const client_1 = require("@prisma/client");
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const ScoreRepository_1 = require("../repositories/ScoreRepository");
let ScoringService = class ScoringService extends BaseService_1.BaseService {
    scoreRepository;
    prisma;
    constructor(scoreRepository, prisma) {
        super();
        this.scoreRepository = scoreRepository;
        this.prisma = prisma;
    }
    async getScoresByCategory(categoryId, tenantId, contestantId) {
        try {
            if (contestantId) {
                return (await this.prisma.score.findMany({
                    where: { categoryId, contestantId, tenantId },
                    include: {
                        contestant: true,
                        judge: true,
                        category: true
                    },
                    orderBy: { createdAt: 'desc' }
                }));
            }
            return await this.scoreRepository.findByCategory(categoryId, tenantId);
        }
        catch (error) {
            this.handleError(error, { method: 'getScoresByCategory', categoryId, contestantId });
        }
    }
    async submitScore(data, userId, tenantId) {
        try {
            const { categoryId, contestantId, criteriaId, score, comments } = data;
            this.logInfo('Score submission requested', {
                categoryId,
                contestantId,
                criteriaId,
                score,
                hasComments: !!comments,
                userId
            });
            const category = (await this.prisma.category.findUnique({
                where: { id: categoryId },
                include: {
                    contest: {
                        include: {
                            event: true
                        }
                    }
                }
            }));
            if (!category) {
                throw new BaseService_1.NotFoundError('Category', categoryId);
            }
            const userWithJudge = (await this.prisma.user.findUnique({
                where: { id: userId },
                include: {
                    judge: true
                }
            }));
            if (!userWithJudge?.judge) {
                throw new BaseService_1.ValidationError('User is not linked to a Judge record');
            }
            const judgeId = userWithJudge.judge.id;
            this.logDebug('Judge ID retrieved', { judgeId });
            const assignment = await this.prisma.assignment.findFirst({
                where: {
                    tenantId,
                    judgeId: userWithJudge.judge.id,
                    OR: [
                        { categoryId },
                        { contestId: category.contestId, categoryId: null }
                    ],
                    status: { in: ['ACTIVE', 'COMPLETED', 'PENDING'] }
                }
            });
            if (!assignment && userWithJudge.role !== 'ADMIN') {
                throw new BaseService_1.ForbiddenError('Not assigned to this category');
            }
            const existingScore = await this.prisma.score.findFirst({
                where: {
                    tenantId,
                    categoryId,
                    contestantId,
                    judgeId,
                    criterionId: criteriaId || null
                }
            });
            if (existingScore) {
                throw new BaseService_1.ConflictError('Score already exists for this combination');
            }
            const newScore = await this.prisma.score.create({
                data: {
                    categoryId,
                    contestantId,
                    criterionId: criteriaId || null,
                    judgeId,
                    score: score,
                    tenantId,
                    certifiedAt: null,
                    certifiedBy: null
                },
                include: {
                    contestant: true,
                    judge: true,
                    category: true
                }
            });
            this.logInfo('Score submitted successfully', {
                scoreId: newScore.id,
                categoryId,
                contestantId,
                judgeId,
                score
            });
            return newScore;
        }
        catch (error) {
            this.handleError(error, { method: 'submitScore', data });
        }
    }
    async updateScore(scoreId, data, tenantId) {
        try {
            const existingScore = await this.scoreRepository.findById(scoreId);
            this.assertExists(existingScore, 'Score', scoreId);
            const updatedScore = await this.prisma.score.update({
                where: { id: scoreId },
                data: {
                    score: data.score !== undefined ? data.score : existingScore.score,
                },
                include: {
                    contestant: true,
                    judge: true,
                    category: true
                }
            });
            this.logInfo('Score updated successfully', { scoreId });
            return updatedScore;
        }
        catch (error) {
            this.handleError(error, { method: 'updateScore', scoreId, data });
        }
    }
    async deleteScore(scoreId, tenantId) {
        try {
            const score = await this.scoreRepository.findById(scoreId);
            this.assertExists(score, 'Score', scoreId);
            await this.scoreRepository.delete(scoreId);
            this.logInfo('Score deleted successfully', { scoreId });
        }
        catch (error) {
            this.handleError(error, { method: 'deleteScore', scoreId });
        }
    }
    async certifyScore(scoreId, certifiedBy, tenantId) {
        try {
            const score = await this.scoreRepository.findById(scoreId);
            this.assertExists(score, 'Score', scoreId);
            const certifiedScore = await this.prisma.score.update({
                where: { id: scoreId },
                data: {
                    certifiedAt: new Date(),
                    certifiedBy: certifiedBy
                },
                include: {
                    contestant: true,
                    judge: true,
                    category: true
                }
            });
            this.logInfo('Score certified successfully', { scoreId, certifiedBy });
            return certifiedScore;
        }
        catch (error) {
            this.handleError(error, { method: 'certifyScore', scoreId });
        }
    }
    async certifyScores(categoryId, certifiedBy, tenantId) {
        try {
            const result = await this.prisma.score.updateMany({
                where: {
                    categoryId,
                    tenantId,
                    certifiedAt: null
                },
                data: {
                    certifiedAt: new Date(),
                    certifiedBy: certifiedBy
                }
            });
            this.logInfo('Scores certified for category', {
                categoryId,
                certified: result.count,
                certifiedBy
            });
            return { certified: result.count };
        }
        catch (error) {
            this.handleError(error, { method: 'certifyScores', categoryId });
        }
    }
    async unsignScore(scoreId, tenantId) {
        try {
            const score = await this.scoreRepository.findById(scoreId);
            this.assertExists(score, 'Score', scoreId);
            const unsignedScore = await this.prisma.score.update({
                where: { id: scoreId },
                data: {
                    certifiedAt: null,
                    certifiedBy: null
                },
                include: {
                    contestant: true,
                    judge: true,
                    category: true
                }
            });
            this.logInfo('Score unsigned successfully', { scoreId });
            return unsignedScore;
        }
        catch (error) {
            this.handleError(error, { method: 'unsignScore', scoreId });
        }
    }
    async getScoresByJudge(judgeId, tenantId) {
        try {
            return await this.scoreRepository.findByJudge(judgeId, tenantId);
        }
        catch (error) {
            this.handleError(error, { method: 'getScoresByJudge', judgeId });
        }
    }
    async getScoresByContestant(contestantId, tenantId) {
        try {
            return await this.scoreRepository.findByContestant(contestantId, tenantId);
        }
        catch (error) {
            this.handleError(error, { method: 'getScoresByContestant', contestantId });
        }
    }
    async getScoresByContest(contestId, tenantId) {
        try {
            return await this.scoreRepository.findByContest(contestId, tenantId);
        }
        catch (error) {
            this.handleError(error, { method: 'getScoresByContest', contestId });
        }
    }
    async calculateAverageScore(contestantId, categoryId, tenantId) {
        try {
            return await this.scoreRepository.getAverageScoreForContestantInCategory(contestantId, categoryId, tenantId);
        }
        catch (error) {
            this.handleError(error, { method: 'calculateAverageScore', contestantId, categoryId });
        }
    }
    async getContestStats(contestId, tenantId) {
        try {
            return await this.scoreRepository.getContestScoreStats(contestId, tenantId);
        }
        catch (error) {
            this.handleError(error, { method: 'getContestStats', contestId });
        }
    }
};
exports.ScoringService = ScoringService;
exports.ScoringService = ScoringService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)(ScoreRepository_1.ScoreRepository)),
    __param(1, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [ScoreRepository_1.ScoreRepository,
        client_1.PrismaClient])
], ScoringService);
//# sourceMappingURL=ScoringService.js.map