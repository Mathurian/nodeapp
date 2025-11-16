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
exports.DataWipeService = void 0;
const client_1 = require("@prisma/client");
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
let DataWipeService = class DataWipeService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async wipeAllData(userId, userRole, confirmation) {
        if (userRole !== 'ADMIN') {
            throw this.forbiddenError('Only administrators can wipe all data');
        }
        if (confirmation !== 'WIPE_ALL_DATA') {
            throw this.validationError('Invalid confirmation. Type "WIPE_ALL_DATA" to confirm.');
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.file.deleteMany({});
            await tx.score.deleteMany({});
            await tx.judgeComment.deleteMany({});
            await tx.certification.deleteMany({});
            await tx.categoryCertification.deleteMany({});
            await tx.contestCertification.deleteMany({});
            await tx.judgeCertification.deleteMany({});
            await tx.judgeContestantCertification.deleteMany({});
            await tx.reviewContestantCertification.deleteMany({});
            await tx.reviewJudgeScoreCertification.deleteMany({});
            await tx.judgeScoreRemovalRequest.deleteMany({});
            await tx.judgeUncertificationRequest.deleteMany({});
            await tx.deductionRequest.deleteMany({});
            await tx.deductionApproval.deleteMany({});
            await tx.overallDeduction.deleteMany({});
            await tx.assignment.deleteMany({});
            await tx.roleAssignment.deleteMany({});
            await tx.categoryContestant.deleteMany({});
            await tx.categoryJudge.deleteMany({});
            await tx.contestContestant.deleteMany({});
            await tx.contestJudge.deleteMany({});
            await tx.criterion.deleteMany({});
            await tx.category.deleteMany({});
            await tx.contest.deleteMany({});
            await tx.event.deleteMany({});
            await tx.contestant.deleteMany({});
            await tx.judge.deleteMany({});
            await tx.user.updateMany({
                where: {
                    role: {
                        not: 'ADMIN'
                    }
                },
                data: {
                    isActive: false,
                    judgeId: null,
                    contestantId: null
                }
            });
        });
        this.logInfo('All event/contest/user data wiped', { userId });
    }
    async wipeEventData(eventId, userId, userRole) {
        if (!['ADMIN', 'ORGANIZER'].includes(userRole)) {
            throw this.forbiddenError('You do not have permission to wipe event data');
        }
        await this.prisma.$transaction(async (tx) => {
            const contests = await tx.contest.findMany({
                where: { eventId },
                select: { id: true }
            });
            const contestIds = contests.map(c => c.id);
            const categories = await tx.category.findMany({
                where: { contestId: { in: contestIds } },
                select: { id: true }
            });
            const categoryIds = categories.map(c => c.id);
            await tx.score.deleteMany({
                where: {
                    categoryId: { in: categoryIds }
                }
            });
            await tx.judgeComment.deleteMany({
                where: {
                    categoryId: { in: categoryIds }
                }
            });
            await tx.certification.deleteMany({
                where: { eventId }
            });
            await tx.categoryCertification.deleteMany({
                where: {
                    categoryId: { in: categoryIds }
                }
            });
            await tx.contestCertification.deleteMany({
                where: {
                    contestId: { in: contestIds }
                }
            });
            await tx.judgeScoreRemovalRequest.deleteMany({
                where: {
                    categoryId: { in: categoryIds }
                }
            });
            await tx.deductionRequest.deleteMany({
                where: {
                    categoryId: { in: categoryIds }
                }
            });
            await tx.assignment.deleteMany({
                where: { eventId }
            });
            await tx.roleAssignment.deleteMany({
                where: { eventId }
            });
            await tx.categoryContestant.deleteMany({
                where: {
                    categoryId: { in: categoryIds }
                }
            });
            await tx.categoryJudge.deleteMany({
                where: {
                    categoryId: { in: categoryIds }
                }
            });
            await tx.contestContestant.deleteMany({
                where: {
                    contestId: { in: contestIds }
                }
            });
            await tx.contestJudge.deleteMany({
                where: {
                    contestId: { in: contestIds }
                }
            });
            await tx.criterion.deleteMany({
                where: {
                    categoryId: { in: categoryIds }
                }
            });
            await tx.category.deleteMany({
                where: {
                    contestId: { in: contestIds }
                }
            });
            await tx.contest.deleteMany({
                where: { eventId }
            });
            await tx.event.delete({
                where: { id: eventId }
            });
        });
        this.logInfo('Event data wiped', { eventId, userId });
    }
};
exports.DataWipeService = DataWipeService;
exports.DataWipeService = DataWipeService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], DataWipeService);
//# sourceMappingURL=DataWipeService.js.map