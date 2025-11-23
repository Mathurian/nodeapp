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

export interface EmailReportDTO {
  recipients: string[];
  subject?: string;
  message?: string;
  reportData: ReportData;
  format: ExportFormat;
  userId: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
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
  async sendReportEmail(data: EmailReportDTO): Promise<void> {
    try {
      this.validateRequired(data as unknown as Record<string, unknown>, ['recipients', 'reportData', 'format', 'userId']);

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
        generatedAt: data.reportData.metadata?.generatedAt || new Date().toISOString()
      });

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
              attachments: [{
                filename,
                content: buffer
              }]
            }
          )
        )
      );

      // Log results
      const successCount = emailResults.filter(r => r.status === 'fulfilled').length;
      const failureCount = emailResults.length - successCount;

      this.logInfo('Report emails sent', {
        total: data.recipients.length,
        success: successCount,
        failed: failureCount,
        format: data.format,
        filename
      });

      // If all failed, throw error
      if (successCount === 0 && data.recipients.length > 0) {
        throw new Error('Failed to send report email to all recipients');
      }

    } catch (error) {
      this.handleError(error, { method: 'sendReportEmail', recipients: data.recipients });
    }
  }

  /**
   * Render email template with variables
   */
  private renderEmailTemplate(variables: {
    reportType: string;
    message: string;
    generatedAt: string;
  }): EmailTemplate {
    const subject = `${variables.reportType} - Generated ${new Date(variables.generatedAt).toLocaleDateString()}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
          .button { display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${variables.reportType}</h1>
          </div>
          <div class="content">
            <p>${variables.message}</p>
            <p><strong>Generated:</strong> ${new Date(variables.generatedAt).toLocaleString()}</p>
            <p>The report is attached to this email.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from the Event Manager System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
${variables.reportType}

${variables.message}

Generated: ${new Date(variables.generatedAt).toLocaleString()}

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
      });

      const subject = data.subject || emailTemplate.subject;

      // Queue email job for each recipient
      const delay = scheduledAt.getTime() - Date.now();

      for (const recipient of data.recipients) {
        const emailJobData: EmailJobData = {
          to: recipient,
          subject,
          text: emailTemplate.text,
          html: emailTemplate.html,
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
