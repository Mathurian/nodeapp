"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmailByRole = exports.sendMultipleEmails = exports.getLogs = exports.sendCampaign = exports.createCampaign = exports.getCampaigns = exports.deleteTemplate = exports.updateTemplate = exports.createTemplate = exports.getTemplates = exports.sendBulkEmail = exports.sendEmail = exports.getConfig = exports.EmailController = void 0;
const container_1 = require("../config/container");
const EmailService_1 = require("../services/EmailService");
const responseHelpers_1 = require("../utils/responseHelpers");
class EmailController {
    emailService;
    prisma;
    constructor() {
        this.emailService = container_1.container.resolve(EmailService_1.EmailService);
        this.prisma = container_1.container.resolve('PrismaClient');
    }
    getConfig = async (_req, res, next) => {
        try {
            const config = await this.emailService.getConfig();
            return (0, responseHelpers_1.sendSuccess)(res, config);
        }
        catch (error) {
            return next(error);
        }
    };
    sendEmail = async (req, res, next) => {
        try {
            const { to, subject, body } = req.body;
            const result = await this.emailService.sendEmail(to, subject, body);
            return (0, responseHelpers_1.sendSuccess)(res, result, 'Email sent');
        }
        catch (error) {
            return next(error);
        }
    };
    sendBulkEmail = async (req, res, next) => {
        try {
            const { recipients, subject, body } = req.body;
            const results = await this.emailService.sendBulkEmail(recipients, subject, body);
            return (0, responseHelpers_1.sendSuccess)(res, results, 'Bulk email sent');
        }
        catch (error) {
            return next(error);
        }
    };
    getTemplates = async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const type = req.query.type;
            const eventId = req.query.eventId;
            const skip = (page - 1) * limit;
            const where = {};
            if (type)
                where.type = type;
            if (eventId)
                where.eventId = eventId;
            const [templates, total] = await Promise.all([
                this.prisma.emailTemplate.findMany({
                    where,
                    select: {
                        id: true,
                        name: true,
                        subject: true,
                        body: true,
                        type: true,
                        eventId: true,
                        variables: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' }
                }),
                this.prisma.emailTemplate.count({ where })
            ]);
            return (0, responseHelpers_1.sendSuccess)(res, {
                templates,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasMore: skip + limit < total
                }
            });
        }
        catch (error) {
            return next(error);
        }
    };
    createTemplate = async (req, res, next) => {
        try {
            const { name, subject, body, type, eventId, variables } = req.body;
            if (!req.user?.id) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'User not authenticated', 401);
            }
            const template = await this.prisma.emailTemplate.create({
                data: {
                    tenantId: req.user.tenantId,
                    name: name || '',
                    subject: subject || '',
                    body: body || '',
                    type: type || 'CUSTOM',
                    eventId: eventId || null,
                    variables: variables ? JSON.parse(JSON.stringify(variables)) : null,
                    createdBy: req.user.id
                },
            });
            return (0, responseHelpers_1.sendSuccess)(res, template, 'Template created successfully', 201);
        }
        catch (error) {
            return next(error);
        }
    };
    updateTemplate = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { name, subject, body, type, eventId, variables } = req.body;
            const existing = await this.prisma.emailTemplate.findUnique({
                where: { id }
            });
            if (!existing) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Template not found', 404);
            }
            const template = await this.prisma.emailTemplate.update({
                where: { id },
                data: {
                    name: name !== undefined ? name : existing.name,
                    subject: subject !== undefined ? subject : existing.subject,
                    body: body !== undefined ? body : existing.body,
                    type: type !== undefined ? type : existing.type,
                    eventId: eventId !== undefined ? eventId : existing.eventId,
                    variables: variables !== undefined ? JSON.parse(JSON.stringify(variables)) : existing.variables
                },
            });
            return (0, responseHelpers_1.sendSuccess)(res, template, 'Template updated successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    deleteTemplate = async (req, res, next) => {
        try {
            const { id } = req.params;
            const template = await this.prisma.emailTemplate.findUnique({
                where: { id }
            });
            if (!template) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Template not found', 404);
            }
            await this.prisma.emailTemplate.delete({
                where: { id }
            });
            return (0, responseHelpers_1.sendSuccess)(res, {}, 'Template deleted successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    getCampaigns = async (req, res, next) => {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const status = req.query.status;
            const where = {};
            if (status)
                where.status = status;
            const logs = await this.prisma.emailLog.findMany({
                where,
                take: limit,
                orderBy: { sentAt: 'desc' }
            });
            return (0, responseHelpers_1.sendSuccess)(res, { campaigns: logs });
        }
        catch (error) {
            return next(error);
        }
    };
    createCampaign = async (req, res, next) => {
        try {
            const { name, templateId, recipientList } = req.body;
            return (0, responseHelpers_1.sendSuccess)(res, {
                id: `campaign_${Date.now()}`,
                name,
                templateId,
                recipientCount: recipientList?.length || 0,
                status: 'CREATED',
                createdAt: new Date().toISOString()
            }, 'Campaign created successfully', 201);
        }
        catch (error) {
            return next(error);
        }
    };
    sendCampaign = async (req, res, next) => {
        try {
            const { campaignId } = req.params;
            const { recipients, subject, body } = req.body;
            if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Recipients list is required', 400);
            }
            const results = await Promise.allSettled(recipients.map(async (email) => {
                return this.emailService.sendEmail(email, subject, body);
            }));
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            return (0, responseHelpers_1.sendSuccess)(res, {
                campaignId,
                sent: successful,
                failed: failed,
                total: recipients.length
            }, 'Campaign sent');
        }
        catch (error) {
            return next(error);
        }
    };
    getLogs = async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 100;
            const status = req.query.status;
            const skip = (page - 1) * limit;
            const where = {};
            if (status)
                where.status = status;
            const [logs, total] = await Promise.all([
                this.prisma.emailLog.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { sentAt: 'desc' }
                }),
                this.prisma.emailLog.count({ where })
            ]);
            return (0, responseHelpers_1.sendSuccess)(res, {
                logs,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasMore: skip + limit < total
                }
            });
        }
        catch (error) {
            return next(error);
        }
    };
    sendMultipleEmails = async (req, res, next) => {
        try {
            const { emails } = req.body;
            if (!emails || !Array.isArray(emails) || emails.length === 0) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Emails array is required', 400);
            }
            const results = await Promise.allSettled(emails.map(async (email) => {
                return this.emailService.sendEmail(email.to, email.subject, email.body);
            }));
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            return (0, responseHelpers_1.sendSuccess)(res, {
                sent: successful,
                failed: failed,
                total: emails.length
            }, 'Multiple emails sent');
        }
        catch (error) {
            return next(error);
        }
    };
    sendEmailByRole = async (req, res, next) => {
        try {
            const { role, subject, body } = req.body;
            if (!role) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Role is required', 400);
            }
            const users = await this.prisma.user.findMany({
                where: { role },
                select: { email: true }
            });
            if (users.length === 0) {
                return (0, responseHelpers_1.sendSuccess)(res, { sent: 0 }, 'No users found with that role');
            }
            const results = await Promise.allSettled(users.map(user => this.emailService.sendEmail(user.email, subject, body)));
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            return (0, responseHelpers_1.sendSuccess)(res, {
                sent: successful,
                failed: failed,
                total: users.length,
                role
            }, `Emails sent to users with role: ${role}`);
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.EmailController = EmailController;
const controller = new EmailController();
exports.getConfig = controller.getConfig;
exports.sendEmail = controller.sendEmail;
exports.sendBulkEmail = controller.sendBulkEmail;
exports.getTemplates = controller.getTemplates;
exports.createTemplate = controller.createTemplate;
exports.updateTemplate = controller.updateTemplate;
exports.deleteTemplate = controller.deleteTemplate;
exports.getCampaigns = controller.getCampaigns;
exports.createCampaign = controller.createCampaign;
exports.sendCampaign = controller.sendCampaign;
exports.getLogs = controller.getLogs;
exports.sendMultipleEmails = controller.sendMultipleEmails;
exports.sendEmailByRole = controller.sendEmailByRole;
//# sourceMappingURL=emailController.js.map