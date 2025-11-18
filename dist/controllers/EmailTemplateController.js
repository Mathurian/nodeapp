"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailTemplateController = exports.EmailTemplateController = void 0;
const client_1 = require("@prisma/client");
const EmailTemplateService_1 = require("../services/EmailTemplateService");
const logger_1 = require("../utils/logger");
const responseHelpers_1 = require("../utils/responseHelpers");
const logger = (0, logger_1.createLogger)('EmailTemplateController');
const prisma = new client_1.PrismaClient();
const emailTemplateService = new EmailTemplateService_1.EmailTemplateService(prisma);
class EmailTemplateController {
    async getAllTemplates(req, res) {
        try {
            const { eventId } = req.query;
            const templates = await emailTemplateService.getAllEmailTemplates(eventId, req.user.tenantId);
            (0, responseHelpers_1.sendSuccess)(res, templates, 'Email templates retrieved successfully');
        }
        catch (error) {
            logger.error('Error in getAllTemplates', { error });
            (0, responseHelpers_1.sendError)(res, error.message || 'Failed to retrieve email templates', 500);
        }
    }
    async getTemplateById(req, res) {
        try {
            const { id } = req.params;
            const template = await emailTemplateService.getEmailTemplateById(id, req.user.tenantId);
            if (!template) {
                (0, responseHelpers_1.sendError)(res, 'Email template not found', 404);
                return;
            }
            (0, responseHelpers_1.sendSuccess)(res, template, 'Email template retrieved successfully');
        }
        catch (error) {
            logger.error('Error in getTemplateById', { error });
            (0, responseHelpers_1.sendError)(res, error.message || 'Failed to retrieve email template', 500);
        }
    }
    async getTemplatesByType(req, res) {
        try {
            const { type } = req.params;
            const { eventId } = req.query;
            const templates = await emailTemplateService.getEmailTemplatesByType(type, eventId, req.user.tenantId);
            (0, responseHelpers_1.sendSuccess)(res, templates, 'Email templates retrieved successfully');
        }
        catch (error) {
            logger.error('Error in getTemplatesByType', { error });
            (0, responseHelpers_1.sendError)(res, error.message || 'Failed to retrieve email templates', 500);
        }
    }
    async createTemplate(req, res) {
        try {
            const data = req.body;
            const userId = req.user?.id;
            if (!userId) {
                (0, responseHelpers_1.sendError)(res, 'Unauthorized', 401);
                return;
            }
            if (!data.name || !data.subject || !data.body) {
                (0, responseHelpers_1.sendError)(res, 'Missing required fields: name, subject, body', 400);
                return;
            }
            data.createdBy = userId;
            data.tenantId = req.user.tenantId;
            const template = await emailTemplateService.createEmailTemplate(data);
            (0, responseHelpers_1.sendSuccess)(res, template, 'Email template created successfully', 201);
        }
        catch (error) {
            logger.error('Error in createTemplate', { error });
            (0, responseHelpers_1.sendError)(res, error.message || 'Failed to create email template', 500);
        }
    }
    async updateTemplate(req, res) {
        try {
            const { id } = req.params;
            const data = req.body;
            const existing = await emailTemplateService.getEmailTemplateById(id, req.user.tenantId);
            if (!existing) {
                (0, responseHelpers_1.sendError)(res, 'Email template not found', 404);
                return;
            }
            const template = await emailTemplateService.updateEmailTemplate(id, req.user.tenantId, data);
            (0, responseHelpers_1.sendSuccess)(res, template, 'Email template updated successfully');
        }
        catch (error) {
            logger.error('Error in updateTemplate', { error });
            (0, responseHelpers_1.sendError)(res, error.message || 'Failed to update email template', 500);
        }
    }
    async deleteTemplate(req, res) {
        try {
            const { id } = req.params;
            const existing = await emailTemplateService.getEmailTemplateById(id, req.user.tenantId);
            if (!existing) {
                (0, responseHelpers_1.sendError)(res, 'Email template not found', 404);
                return;
            }
            await emailTemplateService.deleteEmailTemplate(id, req.user.tenantId);
            (0, responseHelpers_1.sendSuccess)(res, null, 'Email template deleted successfully');
        }
        catch (error) {
            logger.error('Error in deleteTemplate', { error });
            (0, responseHelpers_1.sendError)(res, error.message || 'Failed to delete email template', 500);
        }
    }
    async cloneTemplate(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            if (!userId) {
                (0, responseHelpers_1.sendError)(res, 'Unauthorized', 401);
                return;
            }
            const cloned = await emailTemplateService.cloneEmailTemplate(id, userId, req.user.tenantId);
            (0, responseHelpers_1.sendSuccess)(res, cloned, 'Email template cloned successfully', 201);
        }
        catch (error) {
            logger.error('Error in cloneTemplate', { error });
            (0, responseHelpers_1.sendError)(res, error.message || 'Failed to clone email template', 500);
        }
    }
    async previewTemplate(req, res) {
        try {
            const { id } = req.params;
            const { variables } = req.body;
            const preview = await emailTemplateService.previewEmailTemplate(id, req.user.tenantId, variables);
            (0, responseHelpers_1.sendSuccess)(res, preview, 'Email template preview generated successfully');
        }
        catch (error) {
            logger.error('Error in previewTemplate', { error });
            (0, responseHelpers_1.sendError)(res, error.message || 'Failed to preview email template', 500);
        }
    }
    async getAvailableVariables(req, res) {
        try {
            const { type } = req.params;
            const variables = emailTemplateService.getAvailableVariables(type);
            (0, responseHelpers_1.sendSuccess)(res, variables, 'Available variables retrieved successfully');
        }
        catch (error) {
            logger.error('Error in getAvailableVariables', { error });
            (0, responseHelpers_1.sendError)(res, error.message || 'Failed to retrieve available variables', 500);
        }
    }
}
exports.EmailTemplateController = EmailTemplateController;
exports.emailTemplateController = new EmailTemplateController();
//# sourceMappingURL=EmailTemplateController.js.map