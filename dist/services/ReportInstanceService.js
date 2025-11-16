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
exports.ReportInstanceService = void 0;
const tsyringe_1 = require("tsyringe");
const client_1 = require("@prisma/client");
const BaseService_1 = require("./BaseService");
let ReportInstanceService = class ReportInstanceService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async createInstance(data) {
        try {
            this.validateRequired(data, ['type', 'name', 'generatedById', 'format']);
            const instance = await this.prisma.reportInstance.create({
                data: {
                    type: data.type,
                    name: data.name,
                    generatedById: data.generatedById,
                    format: data.format,
                    data: data.data,
                    templateId: data.templateId
                }
            });
            this.logInfo('Report instance created', {
                instanceId: instance.id,
                type: data.type
            });
            return instance;
        }
        catch (error) {
            this.handleError(error, { method: 'createInstance', type: data.type });
        }
    }
    async getInstances(filters) {
        try {
            const where = {};
            if (filters?.type) {
                where.type = filters.type;
            }
            if (filters?.generatedById) {
                where.generatedById = filters.generatedById;
            }
            if (filters?.format) {
                where.format = filters.format;
            }
            if (filters?.startDate || filters?.endDate) {
                where.generatedAt = {};
                if (filters.startDate) {
                    where.generatedAt.gte = filters.startDate;
                }
                if (filters.endDate) {
                    where.generatedAt.lte = filters.endDate;
                }
            }
            const instances = await this.prisma.reportInstance.findMany({
                where,
                orderBy: { generatedAt: 'desc' }
            });
            return instances;
        }
        catch (error) {
            this.handleError(error, { method: 'getInstances', filters });
        }
    }
    async getInstanceById(instanceId) {
        try {
            const instance = await this.prisma.reportInstance.findUnique({
                where: { id: instanceId }
            });
            this.assertExists(instance, 'ReportInstance', instanceId);
            return instance;
        }
        catch (error) {
            this.handleError(error, { method: 'getInstanceById', instanceId });
        }
    }
    async deleteInstance(instanceId) {
        try {
            const instance = await this.prisma.reportInstance.findUnique({
                where: { id: instanceId }
            });
            this.assertExists(instance, 'ReportInstance', instanceId);
            await this.prisma.reportInstance.delete({
                where: { id: instanceId }
            });
            this.logInfo('Report instance deleted', {
                instanceId,
                type: instance.type
            });
        }
        catch (error) {
            this.handleError(error, { method: 'deleteInstance', instanceId });
        }
    }
    async deleteOldInstances(olderThanDays = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
            const result = await this.prisma.reportInstance.deleteMany({
                where: {
                    generatedAt: {
                        lt: cutoffDate
                    }
                }
            });
            this.logInfo('Old report instances deleted', {
                count: result.count,
                olderThanDays
            });
            return result.count;
        }
        catch (error) {
            this.handleError(error, { method: 'deleteOldInstances', olderThanDays });
        }
    }
    async getInstanceStats(filters) {
        try {
            const where = {};
            if (filters?.type) {
                where.type = filters.type;
            }
            if (filters?.startDate || filters?.endDate) {
                where.generatedAt = {};
                if (filters.startDate) {
                    where.generatedAt.gte = filters.startDate;
                }
                if (filters.endDate) {
                    where.generatedAt.lte = filters.endDate;
                }
            }
            const instances = await this.prisma.reportInstance.findMany({
                where
            });
            const byType = {};
            const byFormat = {};
            const generatorCounts = {};
            instances.forEach(instance => {
                byType[instance.type] = (byType[instance.type] || 0) + 1;
                if (instance.format) {
                    byFormat[instance.format] = (byFormat[instance.format] || 0) + 1;
                }
                if (instance.generatedById) {
                    const key = instance.generatedById;
                    if (!generatorCounts[key]) {
                        generatorCounts[key] = {
                            name: instance.generatedById,
                            count: 0
                        };
                    }
                    generatorCounts[key].count++;
                }
            });
            const topGenerators = Object.entries(generatorCounts)
                .map(([userId, data]) => ({
                userId,
                userName: data.name,
                count: data.count
            }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);
            return {
                totalInstances: instances.length,
                byType,
                byFormat,
                topGenerators
            };
        }
        catch (error) {
            this.handleError(error, { method: 'getInstanceStats', filters });
        }
    }
};
exports.ReportInstanceService = ReportInstanceService;
exports.ReportInstanceService = ReportInstanceService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], ReportInstanceService);
//# sourceMappingURL=ReportInstanceService.js.map