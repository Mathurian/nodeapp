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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeductionRepository = void 0;
const tsyringe_1 = require("tsyringe");
const BaseRepository_1 = require("./BaseRepository");
const database_1 = require("../config/database");
let DeductionRepository = class DeductionRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super(database_1.prisma);
    }
    getModelName() {
        return 'deductionRequest';
    }
    async findPendingWithRelations(tenantId, categoryIds) {
        const whereClause = {
            status: 'PENDING',
            tenantId
        };
        if (categoryIds && categoryIds.length > 0) {
            whereClause.categoryId = { in: categoryIds };
        }
        return this.getModel().findMany({
            where: whereClause,
            include: {
                contestant: {
                    select: { id: true, name: true, email: true }
                },
                category: {
                    select: { id: true, name: true }
                },
                requestedBy: {
                    select: { id: true, name: true, email: true, role: true }
                },
                approvals: {
                    include: {
                        approver: {
                            select: { id: true, name: true, email: true, role: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    async findByIdWithRelations(id, tenantId) {
        return this.getModel().findFirst({
            where: {
                id,
                tenantId
            },
            include: {
                contestant: {
                    select: { id: true, name: true, email: true }
                },
                category: {
                    select: { id: true, name: true }
                },
                requestedBy: {
                    select: { id: true, name: true, email: true, role: true }
                },
                approvals: {
                    include: {
                        approver: {
                            select: { id: true, name: true, email: true, role: true }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            }
        });
    }
    async createDeduction(data) {
        return this.getModel().create({
            data: {
                contestantId: data.contestantId,
                categoryId: data.categoryId,
                amount: data.amount,
                reason: data.reason,
                requestedById: data.requestedBy,
                status: 'PENDING',
                tenantId: data.tenantId
            },
            include: {
                contestant: {
                    select: { id: true, name: true, email: true }
                },
                category: {
                    select: { id: true, name: true }
                },
                requestedBy: {
                    select: { id: true, name: true, email: true, role: true }
                },
                approvals: {
                    include: {
                        approver: {
                            select: { id: true, name: true, email: true, role: true }
                        }
                    }
                }
            }
        });
    }
    async findWithFilters(filters, page, limit) {
        const whereClause = {
            tenantId: filters.tenantId
        };
        if (filters.status)
            whereClause.status = filters.status;
        if (filters.categoryId)
            whereClause.categoryId = filters.categoryId;
        if (filters.contestantId)
            whereClause.contestantId = filters.contestantId;
        const skip = (page - 1) * limit;
        const [deductions, total] = await Promise.all([
            this.getModel().findMany({
                where: whereClause,
                skip,
                take: limit,
                include: {
                    contestant: {
                        select: { id: true, name: true, email: true }
                    },
                    category: {
                        select: { id: true, name: true }
                    },
                    requestedBy: {
                        select: { id: true, name: true, email: true, role: true }
                    },
                    approvals: {
                        include: {
                            approvedBy: {
                                select: { id: true, name: true, email: true, role: true }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            this.getModel().count({ where: whereClause })
        ]);
        return { deductions, total };
    }
    async getApprovals(requestId, tenantId) {
        return database_1.prisma.deductionApproval.findMany({
            where: {
                requestId,
                tenantId
            },
            orderBy: { approvedAt: 'asc' }
        });
    }
    async createApproval(requestId, approvedById, role, tenantId, isHeadJudge) {
        return database_1.prisma.deductionApproval.create({
            data: {
                requestId,
                approvedById,
                role,
                tenantId,
                isHeadJudge: isHeadJudge || false
            }
        });
    }
    async hasUserApproved(requestId, userId, tenantId) {
        const approval = await database_1.prisma.deductionApproval.findFirst({
            where: {
                requestId,
                approvedById: userId,
                tenantId
            }
        });
        return !!approval;
    }
    async updateStatus(id, status, tenantId, additionalData) {
        return this.getModel().update({
            where: { id },
            data: {
                status,
                ...additionalData
            }
        });
    }
    async applyDeductionToScores(_contestantId, _categoryId, _amount, _reason) {
        return 0;
    }
};
exports.DeductionRepository = DeductionRepository;
exports.DeductionRepository = DeductionRepository = __decorate([
    (0, tsyringe_1.injectable)(),
    __metadata("design:paramtypes", [])
], DeductionRepository);
//# sourceMappingURL=DeductionRepository.js.map