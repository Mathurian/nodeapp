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
exports.ScoreRemovalService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const client_1 = require("@prisma/client");
let ScoreRemovalService = class ScoreRemovalService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async createRequest(data) {
        if (!data.judgeId || !data.categoryId || !data.reason || !data.tenantId) {
            throw this.badRequestError('Judge ID, category ID, reason, and tenant ID are required');
        }
        const category = await this.prisma.category.findFirst({
            where: { id: data.categoryId, tenantId: data.tenantId }
        });
        if (!category)
            throw this.notFoundError('Category', data.categoryId);
        const judge = await this.prisma.judge.findFirst({
            where: { id: data.judgeId, tenantId: data.tenantId }
        });
        if (!judge)
            throw this.notFoundError('Judge', data.judgeId);
        if (data.userRole !== 'BOARD' && data.userRole !== 'ADMIN') {
            throw this.forbiddenError('Only Board and Admin can initiate score removal requests');
        }
        return await this.prisma.scoreRemovalRequest.create({
            data: {
                judgeId: data.judgeId,
                categoryId: data.categoryId,
                reason: data.reason.trim(),
                requestedBy: data.requestedBy,
                tenantId: data.tenantId,
                status: 'PENDING'
            },
            include: {
                judge: { select: { id: true, name: true, email: true } },
                category: { select: { id: true, name: true } }
            }
        });
    }
    async getAll(tenantId, status) {
        const where = { tenantId };
        if (status)
            where.status = status;
        return await this.prisma.scoreRemovalRequest.findMany({
            where,
            include: {
                judge: { select: { id: true, name: true, email: true } },
                category: {
                    include: {
                        contest: { select: { id: true, name: true } }
                    }
                },
                requestedByUser: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    async getById(id, tenantId) {
        const request = await this.prisma.scoreRemovalRequest.findFirst({
            where: { id, tenantId },
            include: {
                judge: { select: { id: true, name: true, email: true } },
                category: {
                    include: {
                        contest: { select: { id: true, name: true } }
                    }
                },
                requestedByUser: { select: { id: true, name: true } }
            }
        });
        if (!request)
            throw this.notFoundError('Score removal request', id);
        return request;
    }
    async signRequest(id, tenantId, data) {
        if (!data.signatureName) {
            throw this.badRequestError('Signature name is required');
        }
        const request = await this.prisma.scoreRemovalRequest.findFirst({
            where: { id, tenantId }
        });
        if (!request)
            throw this.notFoundError('Score removal request', id);
        if (request.status === 'APPROVED') {
            throw this.badRequestError('Request has already been approved');
        }
        const signedAt = new Date();
        const updateData = {};
        if (data.userRole === 'AUDITOR' && !request.auditorSignature) {
            updateData.auditorSignature = data.signatureName;
            updateData.auditorSignedAt = signedAt;
            updateData.auditorSignedBy = data.userId;
        }
        else if (data.userRole === 'TALLY_MASTER' && !request.tallySignature) {
            updateData.tallySignature = data.signatureName;
            updateData.tallySignedAt = signedAt;
            updateData.tallySignedBy = data.userId;
        }
        else if (data.userRole === 'BOARD' && !request.boardSignature) {
            updateData.boardSignature = data.signatureName;
            updateData.boardSignedAt = signedAt;
            updateData.boardSignedBy = data.userId;
        }
        else {
            throw this.badRequestError('You have already signed this request or your signature is not required');
        }
        const hasAuditorSignature = request.auditorSignature || updateData.auditorSignature;
        const hasTallySignature = request.tallySignature || updateData.tallySignature;
        const hasBoardSignature = request.boardSignature || updateData.boardSignature;
        if (hasAuditorSignature && hasTallySignature && hasBoardSignature) {
            updateData.status = 'APPROVED';
            updateData.updatedAt = signedAt;
        }
        const updatedRequest = await this.prisma.scoreRemovalRequest.update({
            where: { id },
            data: updateData,
            include: {
                judge: { select: { id: true, name: true, email: true } },
                category: {
                    include: {
                        contest: { select: { id: true, name: true } }
                    }
                }
            }
        });
        return {
            request: updatedRequest,
            allSigned: updateData.status === 'APPROVED'
        };
    }
    async executeRemoval(id, tenantId) {
        const request = await this.prisma.scoreRemovalRequest.findFirst({
            where: { id, tenantId },
            include: {
                judge: { select: { id: true } },
                category: { select: { id: true } }
            }
        });
        if (!request)
            throw this.notFoundError('Score removal request', id);
        if (request.status !== 'APPROVED') {
            throw this.badRequestError('Request must be approved before execution');
        }
        const deletedScores = await this.prisma.score.deleteMany({
            where: {
                categoryId: request.categoryId,
                judgeId: request.judgeId,
                tenantId
            }
        });
        await this.prisma.scoreRemovalRequest.update({
            where: { id },
            data: { status: 'APPROVED' }
        });
        return {
            deletedCount: deletedScores.count
        };
    }
};
exports.ScoreRemovalService = ScoreRemovalService;
exports.ScoreRemovalService = ScoreRemovalService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], ScoreRemovalService);
//# sourceMappingURL=ScoreRemovalService.js.map