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
exports.JudgeContestantCertificationService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const client_1 = require("@prisma/client");
let JudgeContestantCertificationService = class JudgeContestantCertificationService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async getCertifications(judgeId, categoryId, contestantId) {
        const where = {};
        if (judgeId)
            where.judgeId = judgeId;
        if (categoryId)
            where.categoryId = categoryId;
        if (contestantId)
            where.contestantId = contestantId;
        return await this.prisma.judgeContestantCertification.findMany({
            where,
        });
    }
    async certify(data) {
        const { judgeId, categoryId, contestantId } = data;
        if (!judgeId || !categoryId || !contestantId) {
            throw this.badRequestError('Judge ID, category ID, and contestant ID are required');
        }
        const existing = await this.prisma.judgeContestantCertification.findFirst({
            where: { judgeId, categoryId, contestantId }
        });
        if (existing) {
            throw this.badRequestError('Certification already exists');
        }
        return await this.prisma.judgeContestantCertification.create({
            data: { judgeId, categoryId, contestantId }
        });
    }
    async uncertify(id) {
        const cert = await this.prisma.judgeContestantCertification.findUnique({
            where: { id }
        });
        if (!cert) {
            throw this.notFoundError('Certification', id);
        }
        await this.prisma.judgeContestantCertification.delete({
            where: { id }
        });
    }
    async getCategoryCertificationStatus(categoryId) {
        const certifications = await this.prisma.judgeContestantCertification.findMany({
            where: { categoryId },
        });
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
        });
        if (!category) {
            throw this.notFoundError('Category', categoryId);
        }
        const totalJudges = 0;
        const totalContestants = 0;
        const expectedCertifications = totalJudges * totalContestants;
        const completedCertifications = certifications.length;
        const certificationsByJudge = certifications.reduce((acc, cert) => {
            const judgeId = cert.judgeId;
            if (!acc[judgeId]) {
                acc[judgeId] = {
                    judge: cert.judge,
                    certifications: []
                };
            }
            acc[judgeId].certifications.push(cert);
            return acc;
        }, {});
        const certificationsByContestant = certifications.reduce((acc, cert) => {
            const contestantId = cert.contestantId;
            if (!acc[contestantId]) {
                acc[contestantId] = {
                    contestant: cert.contestant,
                    certifications: []
                };
            }
            acc[contestantId].certifications.push(cert);
            return acc;
        }, {});
        return {
            categoryId,
            categoryName: category.name,
            totalJudges,
            totalContestants,
            expectedCertifications,
            completedCertifications,
            completionPercentage: expectedCertifications > 0
                ? Math.round((completedCertifications / expectedCertifications) * 100)
                : 0,
            certificationsByJudge: Object.values(certificationsByJudge),
            certificationsByContestant: Object.values(certificationsByContestant),
            allCertifications: certifications
        };
    }
};
exports.JudgeContestantCertificationService = JudgeContestantCertificationService;
exports.JudgeContestantCertificationService = JudgeContestantCertificationService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], JudgeContestantCertificationService);
//# sourceMappingURL=JudgeContestantCertificationService.js.map