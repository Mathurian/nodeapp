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
exports.JudgeUncertificationService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const client_1 = require("@prisma/client");
let JudgeUncertificationService = class JudgeUncertificationService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async getUncertificationRequests(status) {
        const where = {};
        if (status)
            where.status = status;
        return await this.prisma.judgeUncertificationRequest.findMany({
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
    async createUncertificationRequest(data) {
        const { judgeId, categoryId, reason, requestedBy, userRole } = data;
        if (!judgeId || !categoryId || !reason) {
            throw this.badRequestError('Judge ID, category ID, and reason are required');
        }
        const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
        if (!category)
            throw this.notFoundError('Category', categoryId);
        const judge = await this.prisma.judge.findUnique({ where: { id: judgeId } });
        if (!judge)
            throw this.notFoundError('Judge', judgeId);
        if (userRole !== 'BOARD' && userRole !== 'ADMIN') {
            throw this.forbiddenError('Only Board and Admin can initiate uncertification requests');
        }
        return await this.prisma.judgeUncertificationRequest.create({
            data: {
                judgeId,
                categoryId,
                reason: reason.trim(),
                requestedBy,
                status: 'PENDING'
            },
            include: {
                judge: { select: { id: true, name: true, email: true } },
                category: { select: { id: true, name: true } }
            }
        });
    }
    async signRequest(id, data) {
        const { signatureName, userId, userRole } = data;
        if (!signatureName) {
            throw this.badRequestError('Signature name is required');
        }
        const request = await this.prisma.judgeUncertificationRequest.findUnique({
            where: { id }
        });
        if (!request)
            throw this.notFoundError('Uncertification request', id);
        if (request.status === 'APPROVED') {
            throw this.badRequestError('Request has already been approved');
        }
        const signedAt = new Date();
        const updateData = {};
        if (userRole === 'AUDITOR' && !request.auditorSignature) {
            updateData.auditorSignature = signatureName;
            updateData.auditorSignedAt = signedAt;
            updateData.auditorSignedBy = userId;
        }
        else if (userRole === 'TALLY_MASTER' && !request.tallySignature) {
            updateData.tallySignature = signatureName;
            updateData.tallySignedAt = signedAt;
            updateData.tallySignedBy = userId;
        }
        else if (userRole === 'BOARD' && !request.boardSignature) {
            updateData.boardSignature = signatureName;
            updateData.boardSignedAt = signedAt;
            updateData.boardSignedBy = userId;
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
        const updatedRequest = await this.prisma.judgeUncertificationRequest.update({
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
    async executeUncertification(id) {
        const request = await this.prisma.judgeUncertificationRequest.findUnique({
            where: { id }
        });
        if (!request)
            throw this.notFoundError('Uncertification request', id);
        if (request.status !== 'APPROVED') {
            throw this.badRequestError('Request must be approved before execution');
        }
        await this.prisma.score.updateMany({
            where: {
                categoryId: request.categoryId,
                judgeId: request.judgeId,
                isCertified: true
            },
            data: { isCertified: false }
        });
        await this.prisma.judgeUncertificationRequest.update({
            where: { id },
            data: { status: 'COMPLETED' }
        });
        return { message: 'Uncertification executed successfully' };
    }
};
exports.JudgeUncertificationService = JudgeUncertificationService;
exports.JudgeUncertificationService = JudgeUncertificationService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], JudgeUncertificationService);
//# sourceMappingURL=JudgeUncertificationService.js.map