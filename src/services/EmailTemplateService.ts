import { PrismaClient, EmailTemplate, Prisma } from '@prisma/client';
import { createLogger as loggerFactory } from '../utils/logger';
import { buildBrandedEmailDocument, ensureReadableTextColor, escapeHtml, looksLikeHtml } from '../utils/emailHtml';

const logger = loggerFactory('EmailTemplateService');

export interface CreateEmailTemplateDTO {
  tenantId: string;
  name: string;
  subject: string;
  body: string;
  type?: string;
  eventId?: string;
  variables?: string[];
  headerHtml?: string;
  footerHtml?: string;
  logoUrl?: string;
  logoPosition?: string;
  backgroundColor?: string;
  primaryColor?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: string;
  layoutType?: string;
  contentWrapper?: string;
  borderStyle?: string;
  borderColor?: string;
  borderWidth?: string;
  borderRadius?: string;
  padding?: string;
  createdBy: string;
}

export interface UpdateEmailTemplateDTO {
  name?: string;
  subject?: string;
  body?: string;
  type?: string;
  variables?: string[];
  headerHtml?: string;
  footerHtml?: string;
  logoUrl?: string;
  logoPosition?: string;
  backgroundColor?: string;
  primaryColor?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: string;
  layoutType?: string;
  contentWrapper?: string;
  borderStyle?: string;
  borderColor?: string;
  borderWidth?: string;
  borderRadius?: string;
  padding?: string;
}

export class EmailTemplateService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a new email template
   */
  async createEmailTemplate(data: CreateEmailTemplateDTO): Promise<EmailTemplate> {
    try {
      if (!data.tenantId) {
        throw new Error('Tenant context is required to create an email template');
      }
      const template = await this.prisma.emailTemplate.create({
        data: {
          tenantId: data.tenantId,
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
    } catch (error) {
      logger.error('Error creating email template', { error, data });
      throw new Error('Failed to create email template');
    }
  }

  /**
   * Get all email templates
   */
  async getAllEmailTemplates(tenantId: string, eventId?: string): Promise<EmailTemplate[]> {
    try {
      const where: Prisma.EmailTemplateWhereInput = { tenantId };
      if (eventId) {
        where.OR = [
          { eventId, tenantId },
          { eventId: null, tenantId }, // Include global templates
        ];
      }

      const templates = await this.prisma.emailTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return templates;
    } catch (error) {
      logger.error('Error fetching email templates', { error, tenantId, eventId });
      throw new Error('Failed to fetch email templates');
    }
  }

  /**
   * Get email template by ID
   */
  async getEmailTemplateById(id: string, tenantId: string): Promise<EmailTemplate | null> {
    try {
      const template = await this.prisma.emailTemplate.findFirst({
        where: { id, tenantId },
      });

      return template;
    } catch (error) {
      logger.error('Error fetching email template', { error, id, tenantId });
      throw new Error('Failed to fetch email template');
    }
  }

  /**
   * Get email templates by type
   */
  async getEmailTemplatesByType(type: string, tenantId: string, eventId?: string): Promise<EmailTemplate[]> {
    try {
      const where: Prisma.EmailTemplateWhereInput = { type, tenantId };
      if (eventId) {
        where.OR = [
          { eventId, tenantId },
          { eventId: null, tenantId },
        ];
      }

      const templates = await this.prisma.emailTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return templates;
    } catch (error) {
      logger.error('Error fetching email templates by type', { error, type, tenantId, eventId });
      throw new Error('Failed to fetch email templates');
    }
  }

  /**
   * Update an email template
   */
  async updateEmailTemplate(id: string, tenantId: string, data: UpdateEmailTemplateDTO): Promise<EmailTemplate> {
    try {
      // Verify template belongs to tenant
      const existing = await this.prisma.emailTemplate.findFirst({
        where: { id, tenantId }
      });
      if (!existing) {
        throw new Error('Email template not found');
      }

      const updateData: Prisma.EmailTemplateUpdateInput = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.subject !== undefined) updateData.subject = data.subject;
      if (data.body !== undefined) updateData.body = data.body;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.variables !== undefined) updateData.variables = JSON.stringify(data.variables);
      if (data.headerHtml !== undefined) updateData.headerHtml = data.headerHtml;
      if (data.footerHtml !== undefined) updateData.footerHtml = data.footerHtml;
      if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
      if (data.logoPosition !== undefined) updateData.logoPosition = data.logoPosition;
      if (data.backgroundColor !== undefined) updateData.backgroundColor = data.backgroundColor;
      if (data.primaryColor !== undefined) updateData.primaryColor = data.primaryColor;
      if (data.textColor !== undefined) updateData.textColor = data.textColor;
      if (data.fontFamily !== undefined) updateData.fontFamily = data.fontFamily;
      if (data.fontSize !== undefined) updateData.fontSize = data.fontSize;
      if (data.layoutType !== undefined) updateData.layoutType = data.layoutType;
      if (data.contentWrapper !== undefined) updateData.contentWrapper = data.contentWrapper;
      if (data.borderStyle !== undefined) updateData.borderStyle = data.borderStyle;
      if (data.borderColor !== undefined) updateData.borderColor = data.borderColor;
      if (data.borderWidth !== undefined) updateData.borderWidth = data.borderWidth;
      if (data.borderRadius !== undefined) updateData.borderRadius = data.borderRadius;
      if (data.padding !== undefined) updateData.padding = data.padding;

      const template = await this.prisma.emailTemplate.update({
        where: { id },
        data: updateData,
      });

      logger.info('Email template updated', { id, tenantId });
      return template;
    } catch (error) {
      logger.error('Error updating email template', { error, id, tenantId, data });
      throw new Error('Failed to update email template');
    }
  }

  /**
   * Delete an email template
   */
  async deleteEmailTemplate(id: string, tenantId: string): Promise<void> {
    try {
      // Verify template belongs to tenant
      const existing = await this.prisma.emailTemplate.findFirst({
        where: { id, tenantId }
      });
      if (!existing) {
        throw new Error('Email template not found');
      }

      await this.prisma.emailTemplate.delete({
        where: { id },
      });

      logger.info('Email template deleted', { id, tenantId });
    } catch (error) {
      logger.error('Error deleting email template', { error, id, tenantId });
      throw new Error('Failed to delete email template');
    }
  }

  /**
   * Render email template with variables
   */
  renderTemplate(template: EmailTemplate, variables: Record<string, string>): { subject: string; html: string } {
    try {
      let subject = template.subject || '';
      let body = template.body || '';

      // Replace variables in subject and body
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, value);
        body = body.replace(regex, value);
      });

      // Build complete HTML with styling
      const html = this.buildHtmlEmail(template, body);

      return { subject, html };
    } catch (error) {
      logger.error('Error rendering email template', { error, templateId: template.id });
      throw new Error('Failed to render email template');
    }
  }

  /**
   * Build complete HTML email with template styling
   */
  private buildHtmlEmail(template: EmailTemplate, body: string): string {
    const primaryColor = template.primaryColor || '#2563eb';
    const pageBackgroundColor = template.backgroundColor || '#eef2f7';
    const contentBackgroundColor = '#ffffff';
    const resolvedTextColor = ensureReadableTextColor(contentBackgroundColor, template.textColor || '#111827');
    const fontFamily = template.fontFamily || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";
    const fontSize = template.fontSize || '14px';
    const borderRadius = template.borderRadius || '8px';
    const padding = template.padding || '20px';
    const safeTemplateName = escapeHtml(template.name || 'Event Manager');
    const safeSubject = template.subject || safeTemplateName;

    const hasHtmlBody = looksLikeHtml(body || '');
    const bodyHtml = hasHtmlBody
      ? body
      : `<p style="margin:0;font-size:${fontSize};line-height:1.65;color:${resolvedTextColor};">${escapeHtml(body || '').replace(/\r?\n/g, '<br />')}</p>`;

    const headerHtml = template.headerHtml
      ? template.headerHtml
      : template.logoUrl
        ? `<img src="${escapeHtml(template.logoUrl)}" alt="${safeTemplateName}" style="max-width:200px;height:auto;display:inline-block;" />`
        : `<div style="font-size:22px;line-height:1.3;font-weight:700;">${safeTemplateName}</div>`;

    const footerHtml = template.footerHtml
      ? template.footerHtml
      : `<p style="margin:0;">&copy; ${new Date().getFullYear()} Event Manager. All rights reserved.</p>`;

    return buildBrandedEmailDocument({
      appName: 'Event Manager',
      subject: safeSubject,
      previewText: safeSubject,
      headerHtml,
      title: safeSubject,
      bodyHtml: `<div style="font-family:${fontFamily};font-size:${fontSize};line-height:1.65;color:${resolvedTextColor};padding:${padding};background-color:${contentBackgroundColor};">${bodyHtml}</div>`,
      footerHtml,
      primaryColor,
      pageBackgroundColor,
      contentBackgroundColor,
      textColor: resolvedTextColor,
      fontFamily,
      borderRadius,
    });
  }

  /**
   * Get available variables for a template type
   */
  getAvailableVariables(type: string): string[] {
    const commonVariables = [
      'user_name',
      'user_email',
      'event_name',
      'event_date',
      'current_date',
      'current_year',
    ];

    const typeSpecificVariables: Record<string, string[]> = {
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

  /**
   * Clone an email template
   */
  async cloneEmailTemplate(id: string, userId: string, tenantId: string): Promise<EmailTemplate> {
    try {
      const original = await this.getEmailTemplateById(id, tenantId);
      if (!original) {
        throw new Error('Template not found');
      }

      const cloned = await this.createEmailTemplate({
        ...original,
        name: `${original.name} (Copy)`,
        createdBy: userId,
        tenantId,
        variables: original.variables ? (typeof original.variables === 'string' ? JSON.parse(original.variables) : original.variables) : undefined,
      } as CreateEmailTemplateDTO);

      logger.info('Email template cloned', { originalId: id, clonedId: cloned.id, tenantId });
      return cloned;
    } catch (error) {
      logger.error('Error cloning email template', { error, id, tenantId });
      throw new Error('Failed to clone email template');
    }
  }

  /**
   * Preview email template with sample variables
   */
  async previewEmailTemplate(id: string, tenantId: string, sampleVariables?: Record<string, string>): Promise<{ subject: string; html: string }> {
    try {
      const template = await this.getEmailTemplateById(id, tenantId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Use provided sample variables or defaults
      const variables = sampleVariables || {
        user_name: 'John Doe',
        user_email: 'john.doe@example.com',
        event_name: 'Sample Event',
        event_date: new Date().toLocaleDateString(),
        current_date: new Date().toLocaleDateString(),
        current_year: new Date().getFullYear().toString(),
      };

      return this.renderTemplate(template, variables);
    } catch (error) {
      logger.error('Error previewing email template', { error, id, tenantId });
      throw new Error('Failed to preview email template');
    }
  }
}
