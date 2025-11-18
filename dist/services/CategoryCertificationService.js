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
exports.CategoryCertificationService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const client_1 = require("@prisma/client");
let CategoryCertificationService = class CategoryCertificationService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async getCertificationProgress(categoryId) {
        const categoryContestants = await this.prisma.categoryContestant.findMany({
            where: { categoryId },
            include: { contestant: true }
        });
        const categoryJudges = await this.prisma.categoryJudge.findMany({
            where: { categoryId },
            include: { judge: true }
        });
        const judgeContestantCertifications = await this.prisma.judgeContestantCertification.findMany({
            where: { categoryId }
        });
        const tallyMasterCert = await this.prisma.categoryCertification.findFirst({
            where: { categoryId, role: 'TALLY_MASTER' }
        });
        const auditorCert = await this.prisma.categoryCertification.findFirst({
            where: { categoryId, role: 'AUDITOR' }
        });
        const boardCerts = await this.prisma.categoryCertification.findMany({
            where: { categoryId, role: { in: ['BOARD', 'ORGANIZER', 'ADMIN'] } }
        });
        const totalContestants = categoryContestants.length;
        const totalJudges = categoryJudges.length;
        return {
            categoryId,
            judgeProgress: {
                contestantsCertified: judgeContestantCertifications.length,
                totalContestants,
                isCategoryCertified: judgeContestantCertifications.length === totalContestants * totalJudges
            },
            tallyMasterProgress: {
                isCategoryCertified: !!tallyMasterCert
            },
            auditorProgress: {
                isCategoryCertified: !!auditorCert
            },
            boardProgress: {
                isCategoryCertified: boardCerts.length > 0
            }
        };
    }
    async certifyCategory(categoryId, userId, userRole, tenantId) {
        const existing = await this.prisma.categoryCertification.findFirst({
            where: { categoryId, role: userRole }
        });
        if (existing) {
            throw this.badRequestError('Category already certified for this role');
        }
        return await this.prisma.categoryCertification.create({
            data: {
                tenantId,
                categoryId,
                role: userRole,
                userId
            }
        });
    }
};
exports.CategoryCertificationService = CategoryCertificationService;
exports.CategoryCertificationService = CategoryCertificationService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], CategoryCertificationService);
//# sourceMappingURL=CategoryCertificationService.js.map