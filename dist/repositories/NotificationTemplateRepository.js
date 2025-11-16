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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationTemplateRepository = void 0;
const tsyringe_1 = require("tsyringe");
const client_1 = require("@prisma/client");
const database_1 = __importDefault(require("../config/database"));
let NotificationTemplateRepository = class NotificationTemplateRepository {
    prismaClient;
    constructor(prismaClient = database_1.default) {
        this.prismaClient = prismaClient;
    }
    async findById(id) {
        return this.prismaClient.notificationTemplate.findUnique({
            where: { id },
        });
    }
    async findByName(name) {
        return this.prismaClient.notificationTemplate.findUnique({
            where: { name },
        });
    }
    async findAll(options) {
        const where = {};
        if (options?.type)
            where.type = options.type;
        if (options?.isActive !== undefined)
            where.isActive = options.isActive;
        return this.prismaClient.notificationTemplate.findMany({
            where,
            take: options?.limit,
            skip: options?.offset,
            orderBy: { name: 'asc' },
        });
    }
    async create(data) {
        return this.prismaClient.notificationTemplate.create({
            data: {
                name: data.name,
                type: data.type,
                title: data.title,
                body: data.body,
                emailSubject: data.emailSubject,
                emailBody: data.emailBody,
                variables: data.variables ? JSON.stringify(data.variables) : null,
                isActive: data.isActive ?? true,
            },
        });
    }
    async update(id, data) {
        const updateData = {};
        if (data.name)
            updateData.name = data.name;
        if (data.type)
            updateData.type = data.type;
        if (data.title)
            updateData.title = data.title;
        if (data.body)
            updateData.body = data.body;
        if (data.emailSubject !== undefined)
            updateData.emailSubject = data.emailSubject;
        if (data.emailBody !== undefined)
            updateData.emailBody = data.emailBody;
        if (data.variables)
            updateData.variables = JSON.stringify(data.variables);
        if (data.isActive !== undefined)
            updateData.isActive = data.isActive;
        return this.prismaClient.notificationTemplate.update({
            where: { id },
            data: updateData,
        });
    }
    async delete(id) {
        return this.prismaClient.notificationTemplate.delete({
            where: { id },
        });
    }
    renderTemplate(template, variables) {
        const render = (text, vars) => {
            return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
                return vars[key] !== undefined ? String(vars[key]) : match;
            });
        };
        return {
            title: render(template.title, variables),
            body: render(template.body, variables),
            emailSubject: template.emailSubject ? render(template.emailSubject, variables) : undefined,
            emailBody: template.emailBody ? render(template.emailBody, variables) : undefined,
        };
    }
    async seedDefaultTemplates() {
        const defaultTemplates = [
            {
                name: 'score_submitted',
                type: 'SUCCESS',
                title: 'Score Submitted',
                body: 'Your score for {{contestantName}} in {{categoryName}} has been submitted successfully.',
                emailSubject: 'Score Submitted - {{categoryName}}',
                emailBody: 'Your score for {{contestantName}} in {{categoryName}} has been submitted successfully.',
                variables: ['contestantName', 'categoryName'],
            },
            {
                name: 'contest_certified',
                type: 'SUCCESS',
                title: 'Contest Certified',
                body: 'The contest "{{contestName}}" has been certified.',
                emailSubject: 'Contest Certified - {{contestName}}',
                emailBody: 'The contest "{{contestName}}" has been certified and results are now available.',
                variables: ['contestName'],
            },
            {
                name: 'assignment_change',
                type: 'INFO',
                title: '{{action}} Assignment',
                body: 'You have been {{action}} {{preposition}} judging "{{contestName}}".',
                emailSubject: 'Assignment Update - {{contestName}}',
                emailBody: 'You have been {{action}} {{preposition}} judging "{{contestName}}".',
                variables: ['action', 'preposition', 'contestName'],
            },
            {
                name: 'report_ready',
                type: 'SUCCESS',
                title: 'Report Ready',
                body: 'Your requested report "{{reportName}}" is ready for download.',
                emailSubject: 'Report Ready - {{reportName}}',
                emailBody: 'Your requested report "{{reportName}}" is ready for download.',
                variables: ['reportName', 'reportId'],
            },
            {
                name: 'certification_required',
                type: 'WARNING',
                title: 'Certification Required',
                body: 'Your action is required for {{level}} of "{{contestName}}".',
                emailSubject: 'Certification Required - {{contestName}}',
                emailBody: 'Your action is required for {{level}} of "{{contestName}}". Please review and certify.',
                variables: ['level', 'contestName'],
            },
            {
                name: 'role_change',
                type: 'INFO',
                title: 'Role Updated',
                body: 'Your role has been changed to {{newRole}}.',
                emailSubject: 'Role Updated',
                emailBody: 'Your role has been changed to {{newRole}}.',
                variables: ['newRole'],
            },
            {
                name: 'system_maintenance',
                type: 'SYSTEM',
                title: 'System Maintenance',
                body: '{{message}}',
                emailSubject: 'System Maintenance Notification',
                emailBody: '{{message}}',
                variables: ['message'],
            },
        ];
        for (const template of defaultTemplates) {
            const existing = await this.findByName(template.name);
            if (!existing) {
                await this.create(template);
            }
        }
    }
};
exports.NotificationTemplateRepository = NotificationTemplateRepository;
exports.NotificationTemplateRepository = NotificationTemplateRepository = __decorate([
    (0, tsyringe_1.injectable)(),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], NotificationTemplateRepository);
//# sourceMappingURL=NotificationTemplateRepository.js.map