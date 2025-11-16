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
exports.BulkCertificationResetService = void 0;
const client_1 = require("@prisma/client");
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
let BulkCertificationResetService = class BulkCertificationResetService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async resetCertifications(dto, userId, userRole) {
        if (!['ADMIN', 'ORGANIZER', 'BOARD'].includes(userRole)) {
            throw this.forbiddenError('You do not have permission to reset certifications');
        }
        let resetCount = 0;
        if (dto.resetAll) {
            await this.prisma.$transaction(async (tx) => {
                resetCount += (await tx.categoryCertification.deleteMany({})).count;
                resetCount += (await tx.contestCertification.deleteMany({})).count;
                resetCount += (await tx.certification.deleteMany({})).count;
                resetCount += (await tx.judgeCertification.deleteMany({})).count;
                resetCount += (await tx.judgeContestantCertification.deleteMany({})).count;
                resetCount += (await tx.reviewContestantCertification.deleteMany({})).count;
                resetCount += (await tx.reviewJudgeScoreCertification.deleteMany({})).count;
                await tx.score.updateMany({
                    data: {
                        isCertified: false,
                        certifiedAt: null,
                        certifiedBy: null
                    }
                });
                await tx.category.updateMany({
                    data: {
                        totalsCertified: false
                    }
                });
            });
            this.logInfo('All certifications reset', { userId });
            return {
                resetCount,
                message: `Reset ${resetCount} certification records system-wide`
            };
        }
        else if (dto.categoryId) {
            const category = await this.prisma.category.findUnique({
                where: { id: dto.categoryId }
            });
            if (!category) {
                throw this.createNotFoundError('Category not found');
            }
            await this.prisma.$transaction(async (tx) => {
                resetCount += (await tx.categoryCertification.deleteMany({
                    where: { categoryId: dto.categoryId }
                })).count;
                resetCount += (await tx.judgeCertification.deleteMany({
                    where: { categoryId: dto.categoryId }
                })).count;
                resetCount += (await tx.judgeContestantCertification.deleteMany({
                    where: { categoryId: dto.categoryId }
                })).count;
                resetCount += (await tx.reviewContestantCertification.deleteMany({
                    where: { categoryId: dto.categoryId }
                })).count;
                resetCount += (await tx.reviewJudgeScoreCertification.deleteMany({
                    where: { categoryId: dto.categoryId }
                })).count;
                await tx.certification.updateMany({
                    where: { categoryId: dto.categoryId },
                    data: {
                        status: 'PENDING',
                        currentStep: 1,
                        judgeCertified: false,
                        tallyCertified: false,
                        auditorCertified: false,
                        boardApproved: false,
                        certifiedAt: null,
                        certifiedBy: null,
                        rejectionReason: null,
                        comments: null
                    }
                });
                await tx.score.updateMany({
                    where: { categoryId: dto.categoryId },
                    data: {
                        isCertified: false,
                        certifiedAt: null,
                        certifiedBy: null
                    }
                });
                await tx.category.update({
                    where: { id: dto.categoryId },
                    data: {
                        totalsCertified: false
                    }
                });
            });
            this.logInfo('Category certifications reset', { categoryId: dto.categoryId, userId });
            return {
                resetCount,
                message: `Reset ${resetCount} certification records for category`
            };
        }
        else if (dto.contestId) {
            const contest = await this.prisma.contest.findUnique({
                where: { id: dto.contestId },
                include: {
                    categories: {
                        select: { id: true }
                    }
                }
            });
            if (!contest) {
                throw this.createNotFoundError('Contest not found');
            }
            const categoryIds = contest.categories.map(c => c.id);
            await this.prisma.$transaction(async (tx) => {
                resetCount += (await tx.contestCertification.deleteMany({
                    where: { contestId: dto.contestId }
                })).count;
                resetCount += (await tx.categoryCertification.deleteMany({
                    where: {
                        categoryId: { in: categoryIds }
                    }
                })).count;
                resetCount += (await tx.judgeCertification.deleteMany({
                    where: {
                        categoryId: { in: categoryIds }
                    }
                })).count;
                resetCount += (await tx.judgeContestantCertification.deleteMany({
                    where: {
                        categoryId: { in: categoryIds }
                    }
                })).count;
                resetCount += (await tx.reviewContestantCertification.deleteMany({
                    where: {
                        categoryId: { in: categoryIds }
                    }
                })).count;
                resetCount += (await tx.reviewJudgeScoreCertification.deleteMany({
                    where: {
                        categoryId: { in: categoryIds }
                    }
                })).count;
                await tx.certification.updateMany({
                    where: { contestId: dto.contestId },
                    data: {
                        status: 'PENDING',
                        currentStep: 1,
                        judgeCertified: false,
                        tallyCertified: false,
                        auditorCertified: false,
                        boardApproved: false,
                        certifiedAt: null,
                        certifiedBy: null,
                        rejectionReason: null,
                        comments: null
                    }
                });
                await tx.score.updateMany({
                    where: {
                        categoryId: { in: categoryIds }
                    },
                    data: {
                        isCertified: false,
                        certifiedAt: null,
                        certifiedBy: null
                    }
                });
                await tx.category.updateMany({
                    where: {
                        contestId: dto.contestId
                    },
                    data: {
                        totalsCertified: false
                    }
                });
            });
            this.logInfo('Contest certifications reset', { contestId: dto.contestId, userId });
            return {
                resetCount,
                message: `Reset ${resetCount} certification records for contest`
            };
        }
        else if (dto.eventId) {
            const event = await this.prisma.event.findUnique({
                where: { id: dto.eventId },
                include: {
                    contests: {
                        include: {
                            categories: {
                                select: { id: true }
                            }
                        }
                    }
                }
            });
            if (!event) {
                throw this.createNotFoundError('Event not found');
            }
            const contestIds = event.contests.map(c => c.id);
            const categoryIds = event.contests.flatMap(c => c.categories.map(cat => cat.id));
            await this.prisma.$transaction(async (tx) => {
                resetCount += (await tx.contestCertification.deleteMany({
                    where: {
                        contestId: { in: contestIds }
                    }
                })).count;
                resetCount += (await tx.categoryCertification.deleteMany({
                    where: {
                        categoryId: { in: categoryIds }
                    }
                })).count;
                resetCount += (await tx.judgeCertification.deleteMany({
                    where: {
                        categoryId: { in: categoryIds }
                    }
                })).count;
                resetCount += (await tx.judgeContestantCertification.deleteMany({
                    where: {
                        categoryId: { in: categoryIds }
                    }
                })).count;
                resetCount += (await tx.reviewContestantCertification.deleteMany({
                    where: {
                        categoryId: { in: categoryIds }
                    }
                })).count;
                resetCount += (await tx.reviewJudgeScoreCertification.deleteMany({
                    where: {
                        categoryId: { in: categoryIds }
                    }
                })).count;
                await tx.certification.updateMany({
                    where: { eventId: dto.eventId },
                    data: {
                        status: 'PENDING',
                        currentStep: 1,
                        judgeCertified: false,
                        tallyCertified: false,
                        auditorCertified: false,
                        boardApproved: false,
                        certifiedAt: null,
                        certifiedBy: null,
                        rejectionReason: null,
                        comments: null
                    }
                });
                await tx.score.updateMany({
                    where: {
                        categoryId: { in: categoryIds }
                    },
                    data: {
                        isCertified: false,
                        certifiedAt: null,
                        certifiedBy: null
                    }
                });
                await tx.category.updateMany({
                    where: {
                        contestId: { in: contestIds }
                    },
                    data: {
                        totalsCertified: false
                    }
                });
            });
            this.logInfo('Event certifications reset', { eventId: dto.eventId, userId });
            return {
                resetCount,
                message: `Reset ${resetCount} certification records for event`
            };
        }
        else {
            throw this.validationError('Either eventId, contestId, categoryId, or resetAll must be provided');
        }
    }
};
exports.BulkCertificationResetService = BulkCertificationResetService;
exports.BulkCertificationResetService = BulkCertificationResetService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], BulkCertificationResetService);
//# sourceMappingURL=BulkCertificationResetService.js.map