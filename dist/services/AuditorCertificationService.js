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
exports.AuditorCertificationService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const client_1 = require("@prisma/client");
let AuditorCertificationService = class AuditorCertificationService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async getFinalCertificationStatus(categoryId) {
        const tallyCertifications = await this.prisma.categoryCertification.findMany({
            where: { categoryId, role: 'TALLY_MASTER' },
        });
        const auditorCertification = await this.prisma.categoryCertification.findFirst({
            where: { categoryId, role: 'AUDITOR' },
        });
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
            select: {
                id: true,
                name: true,
                description: true,
                scoreCap: true,
                contestId: true
            }
        });
        const categoryJudges = await this.prisma.categoryJudge.findMany({
            where: { categoryId },
            include: { judge: true }
        });
        const requiredTallyCertifications = categoryJudges.length;
        const completedTallyCertifications = tallyCertifications.length;
        const canCertify = completedTallyCertifications >= requiredTallyCertifications;
        const alreadyCertified = !!auditorCertification;
        const allScores = await this.prisma.score.findMany({
            where: { categoryId },
            include: { judge: true, criterion: true }
        });
        const uncertifiedScores = allScores.filter(score => !score.isCertified && score.criterionId);
        const hasUncertifiedScores = uncertifiedScores.length > 0;
        const scoresCompleted = !hasUncertifiedScores;
        const readyForFinalCertification = canCertify && scoresCompleted && !alreadyCertified;
        return {
            categoryId,
            categoryName: category?.name,
            canCertify,
            readyForFinalCertification,
            alreadyCertified,
            tallyCertifications: {
                required: requiredTallyCertifications,
                completed: completedTallyCertifications,
                missing: Math.max(0, requiredTallyCertifications - completedTallyCertifications),
                certifications: tallyCertifications
            },
            scoreStatus: {
                total: allScores.length,
                uncertified: uncertifiedScores.length,
                completed: scoresCompleted
            },
            auditorCertified: alreadyCertified,
            auditorCertification: auditorCertification ? {
                certifiedAt: auditorCertification.certifiedAt,
                certifiedBy: auditorCertification.userId
            } : null
        };
    }
    async submitFinalCertification(categoryId, userId, _userRole, confirmations) {
        if (!confirmations.confirmation1 || !confirmations.confirmation2) {
            throw this.badRequestError('Both confirmations are required');
        }
        const status = await this.getFinalCertificationStatusInternal(categoryId);
        if (status.alreadyCertified) {
            throw this.badRequestError('Final certification has already been completed for this category');
        }
        if (!status.canCertify) {
            throw this.badRequestError('Not all required certifications are complete');
        }
        if (!status.scoresCompleted) {
            throw this.badRequestError('Not all scores have been certified yet');
        }
        const auditor = await this.prisma.user.findUnique({
            where: { id: userId }
        });
        if (auditor?.role !== 'AUDITOR') {
            throw this.forbiddenError('Only AUDITOR role can submit final certification');
        }
        const certification = await this.prisma.categoryCertification.create({
            data: {
                tenantId: auditor.tenantId,
                categoryId,
                role: 'AUDITOR',
                userId
            }
        });
        await this.prisma.score.updateMany({
            where: { categoryId, isCertified: false },
            data: { isLocked: true, isCertified: true }
        });
        return certification;
    }
    async getFinalCertificationStatusInternal(categoryId) {
        const tallyCertifications = await this.prisma.categoryCertification.findMany({
            where: { categoryId, role: 'TALLY_MASTER' }
        });
        const auditorCertification = await this.prisma.categoryCertification.findFirst({
            where: { categoryId, role: 'AUDITOR' }
        });
        const categoryJudges = await this.prisma.categoryJudge.findMany({
            where: { categoryId }
        });
        const allScores = await this.prisma.score.findMany({
            where: { categoryId }
        });
        const uncertifiedScores = allScores.filter(s => !s.isCertified && s.criterionId);
        const requiredTallyCertifications = categoryJudges.length;
        const completedTallyCertifications = tallyCertifications.length;
        return {
            canCertify: completedTallyCertifications >= requiredTallyCertifications,
            alreadyCertified: !!auditorCertification,
            scoresCompleted: uncertifiedScores.length === 0
        };
    }
};
exports.AuditorCertificationService = AuditorCertificationService;
exports.AuditorCertificationService = AuditorCertificationService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], AuditorCertificationService);
//# sourceMappingURL=AuditorCertificationService.js.map