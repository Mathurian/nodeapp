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
exports.ReportTemplateService = void 0;
const tsyringe_1 = require("tsyringe");
const client_1 = require("@prisma/client");
const BaseService_1 = require("./BaseService");
let ReportTemplateService = class ReportTemplateService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async getAllTemplates(tenantId, filters) {
        try {
            const where = { tenantId };
            if (filters?.type) {
                where.type = filters.type;
            }
            const templates = await this.prisma.reportTemplate.findMany({
                where,
                orderBy: { createdAt: 'desc' }
            });
            return templates;
        }
        catch (error) {
            this.handleError(error, { method: 'getAllTemplates', tenantId, filters });
        }
    }
    async getTemplateById(templateId, tenantId) {
        try {
            const template = await this.prisma.reportTemplate.findFirst({
                where: { id: templateId, tenantId }
            });
            this.assertExists(template, 'ReportTemplate', templateId);
            return template;
        }
        catch (error) {
            this.handleError(error, { method: 'getTemplateById', templateId, tenantId });
        }
    }
    async createTemplate(data) {
        try {
            this.validateRequired(data, ['name', 'type', 'template', 'tenantId']);
            const template = await this.prisma.reportTemplate.create({
                data: {
                    name: data.name,
                    type: data.type,
                    template: data.template,
                    parameters: data.parameters,
                    tenantId: data.tenantId
                }
            });
            this.logInfo('Report template created', { templateId: template.id, name: template.name, tenantId: data.tenantId });
            return template;
        }
        catch (error) {
            this.handleError(error, { method: 'createTemplate', name: data.name, tenantId: data.tenantId });
        }
    }
    async updateTemplate(templateId, tenantId, data) {
        try {
            const existing = await this.prisma.reportTemplate.findFirst({
                where: { id: templateId, tenantId }
            });
            this.assertExists(existing, 'ReportTemplate', templateId);
            const template = await this.prisma.reportTemplate.update({
                where: { id: templateId },
                data: {
                    ...(data.name && { name: data.name }),
                    ...(data.type && { type: data.type }),
                    ...(data.template && { template: data.template }),
                    ...(data.parameters !== undefined && { parameters: data.parameters })
                }
            });
            this.logInfo('Report template updated', { templateId, name: template.name, tenantId });
            return template;
        }
        catch (error) {
            this.handleError(error, { method: 'updateTemplate', templateId, tenantId });
        }
    }
    async deleteTemplate(templateId, tenantId) {
        try {
            const template = await this.prisma.reportTemplate.findFirst({
                where: { id: templateId, tenantId }
            });
            this.assertExists(template, 'ReportTemplate', templateId);
            await this.prisma.reportTemplate.delete({
                where: { id: templateId }
            });
            this.logInfo('Report template deleted', { templateId, name: template.name, tenantId });
        }
        catch (error) {
            this.handleError(error, { method: 'deleteTemplate', templateId, tenantId });
        }
    }
    async getTemplatesByType(type, tenantId) {
        try {
            return await this.prisma.reportTemplate.findMany({
                where: {
                    type,
                    tenantId
                },
                orderBy: { createdAt: 'desc' }
            });
        }
        catch (error) {
            this.handleError(error, { method: 'getTemplatesByType', type, tenantId });
        }
    }
};
exports.ReportTemplateService = ReportTemplateService;
exports.ReportTemplateService = ReportTemplateService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], ReportTemplateService);
//# sourceMappingURL=ReportTemplateService.js.map