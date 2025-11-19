import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient, Prisma } from '@prisma/client';
import nodemailer, { Transporter } from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { env } from '../config/env';

// Prisma payload types
type SystemSettingBasic = Prisma.SystemSettingGetPayload<{
  select: {
    key: true;
    value: true;
  };
}>;

export interface EmailConfig {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  from: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  body?: string;
  html?: string;
  template?: string;
  variables?: Record<string, string | number | boolean>;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
  }>;
}

export interface EmailSendResult {
  success: boolean;
  to: string;
  subject: string;
  messageId?: string;
  response?: string;
  message?: string;
  error?: string;
}

export interface BulkEmailResult {
  to: string;
  success: boolean;
  messageId?: string;
  response?: string;
  error?: string;
}

@injectable()
export class EmailService extends BaseService {
  private transporter: Transporter | null = null;
  private maxRetries = 3;
  private retryDelay = 2000; // 2 seconds

  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
    this.initializeTransporter();
  }

  /**
   * Initialize SMTP transporter from environment variables
   */
  private async initializeTransporter(): Promise<void> {
    try {
      const smtpEnabled = env.get('SMTP_ENABLED') === 'true';

      if (!smtpEnabled) {
        console.log('EmailService: SMTP is disabled in environment configuration');
        return;
      }

      const smtpConfig = {
        host: env.get('SMTP_HOST') || 'localhost',
        port: parseInt(env.get('SMTP_PORT') || '587', 10),
        secure: env.get('SMTP_SECURE') === 'true',
        auth: {
          user: env.get('SMTP_USER') || '',
          pass: env.get('SMTP_PASS') || ''
        }
      };

      // Create transporter
      this.transporter = nodemailer.createTransport(smtpConfig);

      // Verify connection
      await this.transporter.verify();
      console.log('EmailService: SMTP transporter initialized successfully');
    } catch (error) {
      console.error('EmailService: Failed to initialize SMTP transporter:', error);
      this.transporter = null;
    }
  }

  async getConfig(): Promise<EmailConfig> {
    const settings: SystemSettingBasic[] = await this.prisma.systemSetting.findMany({
      where: {
        key: { in: ['EMAIL_ENABLED', 'EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_FROM'] }
      },
      select: {
        key: true,
        value: true
      }
    });

    const config: Record<string, string> = {};
    settings.forEach((s) => { config[s.key.toLowerCase()] = s.value; });

    return {
      enabled: config['email_enabled'] === 'true',
      host: config['email_host'] || '',
      port: parseInt(config['email_port']) || 587,
      user: config['email_user'] || '',
      from: config['email_from'] || ''
    };
  }

  /**
   * Render email template with variables
   */
  private async renderTemplate(templateName: string, variables: Record<string, string | number | boolean>): Promise<string> {
    try {
      const templatePath = path.join(__dirname, '../templates/email', `${templateName}.html`);

      if (!fs.existsSync(templatePath)) {
        throw new Error(`Email template not found: ${templateName}`);
      }

      let template = fs.readFileSync(templatePath, 'utf-8');

      // Replace variables in template
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        template = template.replace(regex, String(variables[key]));
      });

      return template;
    } catch (error) {
      console.error('EmailService: Template rendering error:', error);
      throw this.badRequestError(`Failed to render email template: ${templateName}`);
    }
  }

  /**
   * Send email with retry logic
   */
  async sendEmail(to: string, subject: string, body: string, options?: Partial<EmailOptions>): Promise<EmailSendResult> {
    const smtpEnabled = env.get('SMTP_ENABLED') === 'true';

    if (!smtpEnabled) {
      console.log(`EmailService: Email would be sent to ${to} (SMTP disabled)`);
      return { success: true, to, subject, message: 'Email skipped (SMTP disabled)' };
    }

    if (!this.transporter) {
      // Try to reinitialize
      await this.initializeTransporter();

      if (!this.transporter) {
        throw this.badRequestError('Email service not available - SMTP transporter not configured');
      }
    }

    let html = options?.html || body;

    // Render template if provided
    if (options?.template && options?.variables) {
      html = await this.renderTemplate(options.template, options.variables);
    }

    const mailOptions = {
      from: env.get('SMTP_FROM') || env.get('SMTP_USER') || 'noreply@example.com',
      to,
      subject,
      text: body,
      html,
      attachments: options?.attachments || []
    };

    // Send email with retry logic
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const info = await this.transporter.sendMail(mailOptions);

        // Log successful email
        await this.logEmail(to, subject, 'SENT', info.messageId);

        console.log(`EmailService: Email sent successfully to ${to} (attempt ${attempt}/${this.maxRetries})`);

        return {
          success: true,
          to,
          subject,
          messageId: info.messageId,
          response: info.response
        };
      } catch (error) {
        lastError = error;
        console.error(`EmailService: Email send failed (attempt ${attempt}/${this.maxRetries}):`, error);

        if (attempt < this.maxRetries) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }

    // All retries failed - log failure
    await this.logEmail(to, subject, 'FAILED', null, String(lastError));

    throw this.badRequestError(`Failed to send email after ${this.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Log email delivery to database
   */
  private async logEmail(
    to: string,
    subject: string,
    status: 'SENT' | 'FAILED' | 'PENDING',
    messageId: string | null = null,
    errorMessage: string | null = null
  ): Promise<void> {
    try {
      await this.prisma.emailLog.create({
        data: {
          to,
          subject,
          status,
          messageId,
          errorMessage,
          sentAt: new Date()
        }
      });
    } catch (logError) {
      console.error('EmailService: Failed to log email:', logError);
      // Don't throw - logging failure shouldn't break email sending
    }
  }

  /**
   * Send bulk emails with concurrency control
   */
  async sendBulkEmail(recipients: string[], subject: string, body: string, options?: Partial<EmailOptions>): Promise<BulkEmailResult[]> {
    const results: BulkEmailResult[] = [];
    const concurrency = 5; // Send 5 emails at a time

    for (let i = 0; i < recipients.length; i += concurrency) {
      const batch = recipients.slice(i, i + concurrency);

      const batchResults = await Promise.allSettled(
        batch.map(to => this.sendEmail(to, subject, body, options))
      );

      batchResults.forEach((result, index) => {
        const to = batch[index] || '';
        if (result.status === 'fulfilled') {
          results.push({ to, success: true, ...result.value });
        } else {
          results.push({ to, success: false, error: String(result.reason || 'Unknown error') });
        }
      });
    }

    return results;
  }

  /**
   * Send templated email (convenience method)
   */
  async sendTemplatedEmail(
    to: string,
    subject: string,
    template: string,
    variables: Record<string, string | number | boolean>
  ): Promise<EmailSendResult> {
    return this.sendEmail(to, subject, '', {
      template,
      variables
    });
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(email: string, name: string, verificationUrl?: string): Promise<EmailSendResult> {
    return this.sendTemplatedEmail(
      email,
      'Welcome to Event Manager',
      'welcome',
      {
        name,
        verificationUrl: verificationUrl || '#',
        appName: env.get('APP_NAME') || 'Event Manager',
        supportEmail: env.get('SMTP_FROM') || 'support@example.com'
      }
    );
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, name: string, resetUrl: string): Promise<EmailSendResult> {
    return this.sendTemplatedEmail(
      email,
      'Reset Your Password',
      'password-reset',
      {
        name,
        resetUrl,
        appName: env.get('APP_NAME') || 'Event Manager',
        supportEmail: env.get('SMTP_FROM') || 'support@example.com'
      }
    );
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(email: string, name: string, verificationUrl: string): Promise<EmailSendResult> {
    return this.sendTemplatedEmail(
      email,
      'Verify Your Email Address',
      'email-verification',
      {
        name,
        verificationUrl,
        appName: env.get('APP_NAME') || 'Event Manager',
        supportEmail: env.get('SMTP_FROM') || 'support@example.com'
      }
    );
  }
}
