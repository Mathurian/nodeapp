"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailTemplateService = void 0;
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('EmailTemplateService');
class EmailTemplateService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createEmailTemplate(data) {
        try {
            const template = await this.prisma.emailTemplate.create({
                data: {
                    tenantId: data.tenantId || 'default_tenant',
                    name: data.name,
                    subject: data.subject,
                    body: data.body,
                    type: data.type || 'CUSTOM',
                    eventId: data.eventId,
                    variables: data.variables ? JSON.stringify(data.variables) : null,
                    headerHtml: data.headerHtml,
                    footerHtml: data.footerHtml,
                    logoUrl: data.logoUrl,
                    logoPosition: data.logoPosition,
                    backgroundColor: data.backgroundColor,
                    primaryColor: data.primaryColor,
                    textColor: data.textColor,
                    fontFamily: data.fontFamily,
                    fontSize: data.fontSize,
                    layoutType: data.layoutType,
                    contentWrapper: data.contentWrapper,
                    borderStyle: data.borderStyle,
                    borderColor: data.borderColor,
                    borderWidth: data.borderWidth,
                    borderRadius: data.borderRadius,
                    padding: data.padding,
                    createdBy: data.createdBy,
                },
            });
            logger.info('Email template created', { id: template.id, name: template.name });
            return template;
        }
        catch (error) {
            logger.error('Error creating email template', { error, data });
            throw new Error('Failed to create email template');
        }
    }
    async getAllEmailTemplates(eventId) {
        try {
            const where = {};
            if (eventId) {
                where.OR = [
                    { eventId },
                    { eventId: null },
                ];
            }
            const templates = await this.prisma.emailTemplate.findMany({
                where,
                orderBy: { createdAt: 'desc' },
            });
            return templates;
        }
        catch (error) {
            logger.error('Error fetching email templates', { error, eventId });
            throw new Error('Failed to fetch email templates');
        }
    }
    async getEmailTemplateById(id) {
        try {
            const template = await this.prisma.emailTemplate.findUnique({
                where: { id },
            });
            return template;
        }
        catch (error) {
            logger.error('Error fetching email template', { error, id });
            throw new Error('Failed to fetch email template');
        }
    }
    async getEmailTemplatesByType(type, eventId) {
        try {
            const where = { type };
            if (eventId) {
                where.OR = [
                    { eventId },
                    { eventId: null },
                ];
            }
            const templates = await this.prisma.emailTemplate.findMany({
                where,
                orderBy: { createdAt: 'desc' },
            });
            return templates;
        }
        catch (error) {
            logger.error('Error fetching email templates by type', { error, type, eventId });
            throw new Error('Failed to fetch email templates');
        }
    }
    async updateEmailTemplate(id, data) {
        try {
            const updateData = {};
            if (data.name !== undefined)
                updateData.name = data.name;
            if (data.subject !== undefined)
                updateData.subject = data.subject;
            if (data.body !== undefined)
                updateData.body = data.body;
            if (data.type !== undefined)
                updateData.type = data.type;
            if (data.variables !== undefined)
                updateData.variables = JSON.stringify(data.variables);
            if (data.headerHtml !== undefined)
                updateData.headerHtml = data.headerHtml;
            if (data.footerHtml !== undefined)
                updateData.footerHtml = data.footerHtml;
            if (data.logoUrl !== undefined)
                updateData.logoUrl = data.logoUrl;
            if (data.logoPosition !== undefined)
                updateData.logoPosition = data.logoPosition;
            if (data.backgroundColor !== undefined)
                updateData.backgroundColor = data.backgroundColor;
            if (data.primaryColor !== undefined)
                updateData.primaryColor = data.primaryColor;
            if (data.textColor !== undefined)
                updateData.textColor = data.textColor;
            if (data.fontFamily !== undefined)
                updateData.fontFamily = data.fontFamily;
            if (data.fontSize !== undefined)
                updateData.fontSize = data.fontSize;
            if (data.layoutType !== undefined)
                updateData.layoutType = data.layoutType;
            if (data.contentWrapper !== undefined)
                updateData.contentWrapper = data.contentWrapper;
            if (data.borderStyle !== undefined)
                updateData.borderStyle = data.borderStyle;
            if (data.borderColor !== undefined)
                updateData.borderColor = data.borderColor;
            if (data.borderWidth !== undefined)
                updateData.borderWidth = data.borderWidth;
            if (data.borderRadius !== undefined)
                updateData.borderRadius = data.borderRadius;
            if (data.padding !== undefined)
                updateData.padding = data.padding;
            const template = await this.prisma.emailTemplate.update({
                where: { id },
                data: updateData,
            });
            logger.info('Email template updated', { id });
            return template;
        }
        catch (error) {
            logger.error('Error updating email template', { error, id, data });
            throw new Error('Failed to update email template');
        }
    }
    async deleteEmailTemplate(id) {
        try {
            await this.prisma.emailTemplate.delete({
                where: { id },
            });
            logger.info('Email template deleted', { id });
        }
        catch (error) {
            logger.error('Error deleting email template', { error, id });
            throw new Error('Failed to delete email template');
        }
    }
    renderTemplate(template, variables) {
        try {
            let subject = template.subject || '';
            let body = template.body || '';
            Object.entries(variables).forEach(([key, value]) => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                subject = subject.replace(regex, value);
                body = body.replace(regex, value);
            });
            const html = this.buildHtmlEmail(template, body);
            return { subject, html };
        }
        catch (error) {
            logger.error('Error rendering email template', { error, templateId: template.id });
            throw new Error('Failed to render email template');
        }
    }
    buildHtmlEmail(template, body) {
        const backgroundColor = template.backgroundColor || '#f5f5f5';
        const primaryColor = template.primaryColor || '#007bff';
        const textColor = template.textColor || '#333333';
        const fontFamily = template.fontFamily || 'Arial, sans-serif';
        const fontSize = template.fontSize || '14px';
        const borderColor = template.borderColor || '#dddddd';
        const borderWidth = template.borderWidth || '1px';
        const borderRadius = template.borderRadius || '4px';
        const padding = template.padding || '20px';
        let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template.subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: ${backgroundColor};
      font-family: ${fontFamily};
      font-size: ${fontSize};
      color: ${textColor};
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: ${borderWidth} solid ${borderColor};
      border-radius: ${borderRadius};
    }
    .email-header {
      padding: ${padding};
      background-color: ${primaryColor};
      color: #ffffff;
      text-align: center;
      border-top-left-radius: ${borderRadius};
      border-top-right-radius: ${borderRadius};
    }
    .email-body {
      padding: ${padding};
    }
    .email-footer {
      padding: ${padding};
      background-color: #f9f9f9;
      text-align: center;
      font-size: 12px;
      color: #666666;
      border-bottom-left-radius: ${borderRadius};
      border-bottom-right-radius: ${borderRadius};
    }
    .logo {
      max-width: 200px;
      height: auto;
    }
    a {
      color: ${primaryColor};
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="email-container">
`;
        if (template.headerHtml) {
            html += `    <div class="email-header">\n${template.headerHtml}\n    </div>\n`;
        }
        else if (template.logoUrl) {
            html += `    <div class="email-header">\n      <img src="${template.logoUrl}" alt="Logo" class="logo" />\n    </div>\n`;
        }
        html += `    <div class="email-body">\n${body}\n    </div>\n`;
        if (template.footerHtml) {
            html += `    <div class="email-footer">\n${template.footerHtml}\n    </div>\n`;
        }
        else {
            html += `    <div class="email-footer">\n      <p>© ${new Date().getFullYear()} Event Manager. All rights reserved.</p>\n    </div>\n`;
        }
        html += `  </div>
</body>
</html>`;
        return html;
    }
    getAvailableVariables(type) {
        const commonVariables = [
            'user_name',
            'user_email',
            'event_name',
            'event_date',
            'current_date',
            'current_year',
        ];
        const typeSpecificVariables = {
            WELCOME: ['activation_link', 'password'],
            PASSWORD_RESET: ['reset_link', 'reset_code'],
            EVENT_INVITATION: ['event_location', 'event_time', 'rsvp_link'],
            RESULT_NOTIFICATION: ['contest_name', 'category_name', 'score', 'rank'],
            ASSIGNMENT_NOTIFICATION: ['assignment_type', 'assignment_details', 'due_date'],
            CERTIFICATION_NOTIFICATION: ['certification_status', 'certification_date', 'certifier_name'],
            REMINDER: ['reminder_message', 'action_required', 'deadline'],
        };
        return [...commonVariables, ...(typeSpecificVariables[type] || [])];
    }
    async cloneEmailTemplate(id, userId) {
        try {
            const original = await this.getEmailTemplateById(id);
            if (!original) {
                throw new Error('Template not found');
            }
            const cloned = await this.createEmailTemplate({
                ...original,
                name: `${original.name} (Copy)`,
                createdBy: userId,
                variables: original.variables ? (typeof original.variables === 'string' ? JSON.parse(original.variables) : original.variables) : undefined,
            });
            logger.info('Email template cloned', { originalId: id, clonedId: cloned.id });
            return cloned;
        }
        catch (error) {
            logger.error('Error cloning email template', { error, id });
            throw new Error('Failed to clone email template');
        }
    }
    async previewEmailTemplate(id, sampleVariables) {
        try {
            const template = await this.getEmailTemplateById(id);
            if (!template) {
                throw new Error('Template not found');
            }
            const variables = sampleVariables || {
                user_name: 'John Doe',
                user_email: 'john.doe@example.com',
                event_name: 'Sample Event',
                event_date: new Date().toLocaleDateString(),
                current_date: new Date().toLocaleDateString(),
                current_year: new Date().getFullYear().toString(),
            };
            return this.renderTemplate(template, variables);
        }
        catch (error) {
            logger.error('Error previewing email template', { error, id });
            throw new Error('Failed to preview email template');
        }
    }
}
exports.EmailTemplateService = EmailTemplateService;
//# sourceMappingURL=EmailTemplateService.js.map