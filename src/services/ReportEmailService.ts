/**
 * Report Email Service
 * Handles email delivery of reports
 */

import { injectable, inject } from 'tsyringe';
import { BaseService, ValidationError } from './BaseService';
import { ReportData } from './ReportGenerationService';
import { ReportExportService, ExportFormat } from './ReportExportService';

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
    @inject(ReportExportService) private exportService: ReportExportService
  ) {
    super();
  }

  /**
   * Send report via email
   */
  async sendReportEmail(data: EmailReportDTO): Promise<void> {
    try {
      this.validateRequired(data, ['recipients', 'reportData', 'format', 'userId']);

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

      // Log email attempt (actual sending would be done via email service like SendGrid, Nodemailer, etc.)
      this.logInfo('Report email prepared', {
        recipients: data.recipients,
        format: data.format,
        filename,
        bufferSize: buffer.length
      });

      // TODO: Integrate with actual email service
      // Example with Nodemailer:
      // await this.mailer.sendMail({
      //   from: process.env.EMAIL_FROM,
      //   to: data.recipients,
      //   subject: data.subject || emailTemplate.subject,
      //   html: emailTemplate.html,
      //   text: emailTemplate.text,
      //   attachments: [{
      //     filename,
      //     content: buffer
      //   }]
      // });

      // For now, we'll just log that email would be sent
      console.log(`[EMAIL] Would send ${data.format} report to: ${data.recipients.join(', ')}`);
      console.log(`[EMAIL] Subject: ${data.subject || emailTemplate.subject}`);
      console.log(`[EMAIL] Attachment: ${filename} (${buffer.length} bytes)`);

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
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Failed to send to ${emailData.recipients.join(', ')}: ${error.message}`);
        this.logError('Batch email failed', { error, recipients: emailData.recipients });
      }
    }

    this.logInfo('Batch email report completed', results);

    return results;
  }

  /**
   * Schedule report email (placeholder for future implementation)
   */
  async scheduleReportEmail(
    data: EmailReportDTO,
    scheduledAt: Date
  ): Promise<{ scheduled: boolean; scheduledAt: Date }> {
    try {
      // TODO: Integrate with job queue (Bull, Agenda, etc.)
      this.logInfo('Report email scheduled', {
        recipients: data.recipients,
        scheduledAt: scheduledAt.toISOString()
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
