/**
 * Report Email Service
 * Handles email delivery of reports
 */

import { injectable, inject } from 'tsyringe';
import { BaseService, ValidationError } from './BaseService';
import { ReportData } from './ReportGenerationService';
import { ReportExportService, ExportFormat } from './ReportExportService';
import { EmailService } from './EmailService';
import queueService from './QueueService';
import { EmailJobData } from '../jobs/EmailJobProcessor';
import { buildBrandedEmailDocument, escapeHtml, looksLikeHtml } from '../utils/emailHtml';

export interface EmailReportDTO {
  recipients: string[];
  subject?: string;
  message?: string;
  html?: string;
  reportData: ReportData;
  format: ExportFormat;
  userId: string;
  tenantId: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface ReportEmailDispatchSummary {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
}

@injectable()
export class ReportEmailService extends BaseService {
  constructor(
    @inject(ReportExportService) private exportService: ReportExportService,
    @inject(EmailService) private emailService: EmailService
  ) {
    super();
  }

  /**
   * Send report via email
   */
  async sendReportEmail(data: EmailReportDTO): Promise<ReportEmailDispatchSummary> {
    try {
      this.validateRequired(data as unknown as Record<string, unknown>, ['recipients', 'reportData', 'format', 'userId', 'tenantId']);

      // Validate email addresses
      const invalidEmails = data.recipients.filter(email => !this.isValidEmail(email));
      if (invalidEmails.length > 0) {
        throw new ValidationError(`Invalid email addresses: ${invalidEmails.join(', ')}`);
      }

      // Generate report attachment
      const buffer = await this.exportService.exportReport(data.reportData, data.format);
      const filename = this.exportService.generateFilename(
        data.reportData.metadata?.reportType || 'report',
        data.format
      );

      // Render email template
      const emailTemplate = this.renderEmailTemplate({
        reportType: data.reportData.metadata?.reportType || 'Report',
        message: data.message || 'Please find the attached report.',
        generatedAt: data.reportData.metadata?.generatedAt || new Date().toISOString(),
        scopeLabel: this.getScopeLabel(data.reportData),
        attachmentFormat: data.format === 'excel' ? 'Excel' : data.format.toUpperCase(),
      }, data.html);

      // Log email attempt
      this.logInfo('Report email prepared', {
        recipients: data.recipients,
        format: data.format,
        filename,
        bufferSize: buffer.length
      });

      // Send email via EmailService with attachment
      const subject = data.subject || emailTemplate.subject;

      // Send to each recipient
      const emailResults = await Promise.allSettled(
        data.recipients.map(recipient =>
          this.emailService.sendEmail(
            recipient,
            subject,
            emailTemplate.text,
            {
              html: emailTemplate.html,
              tenantId: data.tenantId,
              userId: data.userId,
              attachments: [{
                filename,
                content: buffer
              }]
            }
          )
        )
      );

      // Log results
      let sentCount = 0;
      let failedCount = 0;
      let skippedCount = 0;

      for (const result of emailResults) {
        if (result.status === 'rejected') {
          failedCount += 1;
          continue;
        }

        const payload = result.value || {};
        const message = String(payload.message || '').toLowerCase();
        const explicitlySkipped = message.includes('smtp disabled') || message.includes('skipped');

        if (explicitlySkipped) {
          skippedCount += 1;
        } else if (payload.success === false) {
          failedCount += 1;
        } else {
          sentCount += 1;
        }
      }

      this.logInfo('Report emails sent', {
        total: data.recipients.length,
        success: sentCount,
        failed: failedCount,
        skipped: skippedCount,
        format: data.format,
        filename
      });

      // If all attempts failed (not skipped), throw error.
      if (sentCount === 0 && failedCount === data.recipients.length && data.recipients.length > 0) {
        throw new Error('Failed to send report email to all recipients');
      }

      return {
        total: data.recipients.length,
        sent: sentCount,
        failed: failedCount,
        skipped: skippedCount
      };

    } catch (error) {
      this.handleError(error, { method: 'sendReportEmail', recipients: data.recipients });
    }
  }

  /**
   * Render email template with variables
   */
  private renderEmailTemplate(
    variables: {
      reportType: string;
      message: string;
      generatedAt: string;
      scopeLabel?: string | null;
      attachmentFormat?: string;
    },
    customHtml?: string
  ): EmailTemplate {
    const generatedDate = new Date(variables.generatedAt);
    const generatedAtLabel = Number.isNaN(generatedDate.getTime())
      ? variables.generatedAt
      : generatedDate.toLocaleString();
    const generatedOnLabel = Number.isNaN(generatedDate.getTime())
      ? new Date().toLocaleDateString()
      : generatedDate.toLocaleDateString();
    const subject = `${variables.reportType} - Generated ${generatedOnLabel}`;

    const messageWithBreaks = escapeHtml(variables.message || 'Please find the attached report.')
      .replace(/\r?\n/g, '<br />');

    const defaultHtml = buildBrandedEmailDocument({
      appName: 'Event Manager',
      subject,
      previewText: `${variables.reportType} is ready`,
      headerTitle: 'Event Manager Report',
      title: variables.reportType,
      primaryColor: '#2563eb',
      bodyHtml: `
        <p style="margin:0 0 12px 0;">${messageWithBreaks}</p>
        <p style="margin:0 0 12px 0;"><strong>Generated:</strong> ${escapeHtml(generatedAtLabel)}</p>
        ${variables.scopeLabel ? `<p style="margin:0 0 12px 0;"><strong>Scope:</strong> ${escapeHtml(variables.scopeLabel)}</p>` : ''}
        ${variables.attachmentFormat ? `<p style="margin:0 0 12px 0;"><strong>Attachment:</strong> ${escapeHtml(variables.attachmentFormat)}</p>` : ''}
        <p style="margin:0;">The requested report is attached to this email.</p>
      `,
      footerText: 'This is an automated Event Manager message. Please do not reply to this email.',
    });

    const html = customHtml
      ? (looksLikeHtml(customHtml)
        ? customHtml
        : buildBrandedEmailDocument({
            appName: 'Event Manager',
            subject,
            previewText: `${variables.reportType} is ready`,
            headerTitle: 'Event Manager Report',
            title: variables.reportType,
            primaryColor: '#2563eb',
            bodyText: customHtml,
            footerText: 'This is an automated Event Manager message. Please do not reply to this email.',
          }))
      : defaultHtml;

    const text = `
${variables.reportType}

${variables.message}

Generated: ${new Date(variables.generatedAt).toLocaleString()}
${variables.scopeLabel ? `\nScope: ${variables.scopeLabel}` : ''}
${variables.attachmentFormat ? `\nAttachment: ${variables.attachmentFormat}` : ''}

The report is attached to this email.

---
This is an automated message from the Event Manager System.
Please do not reply to this email.
    `.trim();

    return { subject, html, text };
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private getScopeLabel(reportData: ReportData): string | null {
    const scope = reportData.metadata?.scope;
    if (scope) {
      if (scope.filterMode === 'system') {
        return 'System-wide';
      }

      const eventLabel = scope.eventName || (scope.eventId ? 'Event scope' : '');
      if (Array.isArray(scope.contestNames) && scope.contestNames.length > 0) {
        return `${eventLabel || 'Event scope'} • ${scope.contestNames.join(', ')}`;
      }

      if (eventLabel) {
        return `${eventLabel} • all contests`;
      }
    }

    if (reportData.contest?.id) {
      const eventLabel = reportData.contest.event?.name || 'Event scope';
      return `${eventLabel} • ${reportData.contest.name}`;
    }

    if (reportData.event?.id) {
      return `${reportData.event.name} • all contests`;
    }

    return null;
  }

  /**
   * Send batch report emails
   */
  async sendBatchReportEmails(
    emails: EmailReportDTO[]
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const emailData of emails) {
      try {
        await this.sendReportEmail(emailData);
        results.sent++;
      } catch (error: unknown) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`Failed to send to ${emailData.recipients.join(', ')}: ${errorMessage}`);
        this.logError('Batch email failed', { error: errorMessage, recipients: emailData.recipients });
      }
    }

    this.logInfo('Batch email report completed', results);

    return results;
  }

  /**
   * Schedule report email via job queue
   */
  async scheduleReportEmail(
    data: EmailReportDTO,
    scheduledAt: Date
  ): Promise<{ scheduled: boolean; scheduledAt: Date; jobId?: string }> {
    try {
      // Generate report attachment
      const buffer = await this.exportService.exportReport(data.reportData, data.format);
      const filename = this.exportService.generateFilename(
        data.reportData.metadata?.reportType || 'report',
        data.format
      );

      // Render email template
      const emailTemplate = this.renderEmailTemplate({
        reportType: data.reportData.metadata?.reportType || 'Report',
        message: data.message || 'Please find the attached report.',
        generatedAt: data.reportData.metadata?.generatedAt || new Date().toISOString()
      }, data.html);

      const subject = data.subject || emailTemplate.subject;

      // Queue email job for each recipient
      const delay = scheduledAt.getTime() - Date.now();

      for (const recipient of data.recipients) {
        const emailJobData: EmailJobData = {
          to: recipient,
          subject,
          text: emailTemplate.text,
          html: emailTemplate.html,
          tenantId: data.tenantId,
          userId: data.userId,
          attachments: [{
            filename,
            content: buffer
          }]
        };

        await queueService.addJob(
          'email',
          'send-report-email',
          emailJobData,
          {
            delay: delay > 0 ? delay : 0,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000
            }
          }
        );
      }

      this.logInfo('Report email scheduled via job queue', {
        recipients: data.recipients,
        scheduledAt: scheduledAt.toISOString(),
        delay,
        format: data.format
      });

      return {
        scheduled: true,
        scheduledAt
      };
    } catch (error) {
      this.handleError(error, { method: 'scheduleReportEmail' });
    }
  }

}
