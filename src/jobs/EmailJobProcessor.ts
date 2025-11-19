import { Job } from 'bullmq';
import { BaseJobProcessor } from './BaseJobProcessor';
import { EmailService } from '../services/EmailService';
import queueService from '../services/QueueService';
import { Logger } from '../utils/logger';
import { templateRenderer } from '../utils/templateRenderer';

/**
 * Email Job Data Interface
 */
export interface EmailJobData {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
    contentType?: string;
  }>;
  template?: {
    name: string;
    data: Record<string, any>;
  };
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Email Job Processor
 *
 * Handles email sending jobs in the background
 *
 * Features:
 * - Retry failed emails with exponential backoff
 * - Priority-based sending (high priority emails sent first)
 * - Template support
 * - Attachment support
 * - Email tracking and logging
 *
 * @example
 * ```typescript
 * // Queue an email
 * await queueService.addJob('email', 'send-email', {
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   html: '<p>Welcome to our platform!</p>'
 * });
 * ```
 */
export class EmailJobProcessor extends BaseJobProcessor<EmailJobData> {
  private emailService: EmailService;

  constructor(emailService: EmailService) {
    super('email-job-processor');
    this.emailService = emailService;
  }

  /**
   * Validate email job data
   */
  protected override validate(data: EmailJobData): void {
    super.validate(data);

    if (!data.to) {
      throw new Error('Email recipient (to) is required');
    }

    if (!data.subject) {
      throw new Error('Email subject is required');
    }

    if (!data.html && !data.text && !data.template) {
      throw new Error('Email content (html, text, or template) is required');
    }
  }

  /**
   * Process email job
   */
  async process(job: Job<EmailJobData>): Promise<any> {
    this.validate(job.data);

    const { to, subject, html, text, template, attachments } = job.data;
    // Note: from, cc, bcc are available in job.data but not currently used

    try {
      // Update progress
      await job.updateProgress(25);

      // Prepare email content
      let emailHtml = html;
      let emailText = text;

      // If template is specified, render it using Handlebars
      if (template) {
        this.logger.info('Rendering email template with Handlebars', {
          template: template.name,
          jobId: job.id,
        });

        try {
          emailHtml = await templateRenderer.render(template.name, template.data);
          this.logger.info('Template rendered successfully', {
            template: template.name,
            jobId: job.id,
          });
        } catch (renderError) {
          this.logger.error('Template rendering failed', {
            template: template.name,
            jobId: job.id,
            error: renderError instanceof Error ? renderError.message : 'Unknown error',
          });
          throw renderError;
        }

        await job.updateProgress(50);
      } else {
        await job.updateProgress(50);
      }

      // Determine recipient(s)
      const recipients = Array.isArray(to) ? to : [to];

      // Send email to each recipient
      const results = [];
      for (const recipient of recipients) {
        try {
          const result = await this.emailService.sendEmail(
            recipient,
            subject,
            emailText || '',
            {
              html: emailHtml,
              template: template?.name,
              variables: template?.data,
              attachments,
            }
          );

          results.push(result);

          this.logger.info('Email sent successfully', {
            to: recipient,
            subject,
            messageId: result.messageId,
            jobId: job.id,
          });
        } catch (sendError) {
          this.logger.error('Failed to send email to recipient', {
            to: recipient,
            subject,
            jobId: job.id,
            error: sendError instanceof Error ? sendError.message : 'Unknown error',
          });

          // If sending to one recipient fails, continue with others
          // but track the failure
          results.push({
            success: false,
            to: recipient,
            subject,
            error: sendError instanceof Error ? sendError.message : 'Unknown error',
          });
        }
      }

      await job.updateProgress(100);

      // Return aggregated results
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      return {
        success: failureCount === 0,
        totalRecipients: results.length,
        successCount,
        failureCount,
        results,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to process email job', {
        jobId: job.id,
        to,
        subject,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Handle permanent email failure
   */
  protected override async onFailed(job: Job<EmailJobData>, error: Error): Promise<void> {
    await super.onFailed(job, error);

    // Log failed email to database
    try {
      // TODO: Save to email_logs table
      this.logger.error('Email permanently failed - saving to database', {
        jobId: job.id,
        to: job.data.to,
        subject: job.data.subject,
        error: error.message,
      });
    } catch (logError) {
      this.logger.error('Failed to log email failure', { error: logError });
    }
  }
}

/**
 * Initialize Email Queue Worker
 */
export const initializeEmailWorker = (emailService: EmailService, concurrency: number = 5) => {
  const processor = new EmailJobProcessor(emailService);
  const initLogger = new Logger('EmailWorker');

  const worker = queueService.createWorker(
    'email',
    async (job) => await processor.handle(job),
    concurrency
  );

  initLogger.info('Email worker initialized', { concurrency });

  return worker;
};

export default EmailJobProcessor;
