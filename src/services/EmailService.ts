import { injectable, inject, container } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient, Prisma } from '@prisma/client';
import nodemailer, { Transporter } from 'nodemailer';
import type { SendMailOptions } from 'nodemailer';
import { env } from '../config/env';
import { templateRenderer } from '../utils/templateRenderer';
import { ErrorLogService } from './ErrorLogService';
import { createLogger } from '../utils/logger';
import {
  extractPlainTextFromHtml,
  looksLikeHtml,
  prepareOutboundEmailHtml,
} from '../utils/emailHtml';
// S4-1: Circuit breaker for email service resilience
import { CircuitBreaker, CircuitBreakerRegistry } from '../utils/circuitBreaker';

const logger = createLogger('EmailService');

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
  tenantId?: string;
  userId?: string;
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

interface SmtpRuntimeConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  fromName: string;
  replyToAddress: string;
  replyToName: string;
  source: 'env' | 'settings';
}

@injectable()
export class EmailService extends BaseService {
  private transporter: Transporter | null = null;
  private maxRetries = 3;
  private retryDelay = 2000; // 2 seconds
  // S4-1: Circuit breaker for SMTP resilience
  private circuitBreaker: CircuitBreaker;

  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();

    // S4-1: Initialize circuit breaker for email service
    this.circuitBreaker = CircuitBreakerRegistry.get('email-service', {
      failureThreshold: 5, // Open after 5 failures
      successThreshold: 2, // Close after 2 successes in half-open
      timeout: 60000, // 60s before retry (half-open)
      windowSize: 60000, // 60s sliding window
      volumeThreshold: 10, // Minimum 10 requests before evaluation
    });

    // S4-1: Monitor circuit breaker state changes
    this.circuitBreaker.on('stateChange', (newState) => {
      logger.warn('Email service circuit breaker state changed', { newState });
    });

    this.circuitBreaker.on('open', () => {
      logger.error('Email service circuit breaker OPENED - failing fast');
    });

    this.initializeTransporter();
  }

  /**
   * Normalize SMTP security settings to match common provider behavior.
   * - Port 587 => STARTTLS (secure=false + requireTLS=true)
   * - Port 465 => Implicit TLS (secure=true)
   */
  private normalizeSmtpSecurity(
    port: number,
    secure: boolean
  ): { secure: boolean; requireTLS?: boolean; adjusted: boolean; note?: string } {
    if (port === 587 && secure) {
      return {
        secure: false,
        requireTLS: true,
        adjusted: true,
        note: 'Adjusted SMTP security for port 587 to STARTTLS (secure=false, requireTLS=true).',
      };
    }

    if (port === 465 && !secure) {
      return {
        secure: true,
        adjusted: true,
        note: 'Adjusted SMTP security for port 465 to implicit TLS (secure=true).',
      };
    }

    if (port === 587 && !secure) {
      return {
        secure: false,
        requireTLS: true,
        adjusted: false,
      };
    }

    return { secure, adjusted: false };
  }

  /**
   * Initialize SMTP transporter from environment variables
   */
  private async initializeTransporter(): Promise<void> {
    try {
      const smtpEnabled = env.get('SMTP_ENABLED');

      if (!smtpEnabled) {
        logger.info('SMTP is disabled in environment configuration');
        return;
      }

      const normalized = this.normalizeSmtpSecurity(env.get('SMTP_PORT'), env.get('SMTP_SECURE'));
      if (normalized.note) {
        logger.warn(normalized.note, { source: 'env' });
      }

      const smtpConfig: Record<string, unknown> = {
        host: env.get('SMTP_HOST'),
        port: env.get('SMTP_PORT'),
        secure: normalized.secure,
        auth: {
          user: env.get('SMTP_USER'),
          pass: env.get('SMTP_PASS'),
        },
      };
      if (normalized.requireTLS) {
        smtpConfig['requireTLS'] = true;
      }

      // Create transporter
      this.transporter = nodemailer.createTransport(smtpConfig);

      // Verify connection
      await this.transporter.verify();
      logger.info('SMTP transporter initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SMTP transporter', { error });
      this.transporter = null;

      // Log SMTP initialization failure to ErrorLogService
      try {
        const errorLogService = container.resolve(ErrorLogService);
        await errorLogService.logException(error as Error, 'EmailService:initializeTransporter', {
          smtpHost: env.get('SMTP_HOST'),
          smtpPort: env.get('SMTP_PORT'),
          smtpUser: env.get('SMTP_USER'),
        });
      } catch (logError) {
        logger.error('Failed to log SMTP initialization error', { error: logError });
      }
    }
  }

  async getConfig(): Promise<EmailConfig> {
    const settings: SystemSettingBasic[] = await this.prisma.systemSetting.findMany({
      where: {
        key: { in: ['EMAIL_ENABLED', 'EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_FROM'] },
      },
      select: {
        key: true,
        value: true,
      },
    });

    const config: Record<string, string> = {};
    settings.forEach((s) => {
      config[s.key.toLowerCase()] = s.value;
    });

    return {
      enabled: config['email_enabled'] === 'true',
      host: config['email_host'] || '',
      port: parseInt(config['email_port'] as string) || 587,
      user: config['email_user'] || '',
      from: config['email_from'] || '',
    };
  }

  /**
   * Render email template with variables using Handlebars
   */
  private async renderTemplate(
    templateName: string,
    variables: Record<string, unknown>
  ): Promise<string> {
    try {
      // Add .html extension if not present
      const templateFile = templateName.endsWith('.html') ? templateName : `${templateName}.html`;

      // Use Handlebars template renderer
      const rendered = await templateRenderer.render(templateFile, variables);

      return rendered;
    } catch (error) {
      logger.error('Template rendering error', { error });
      throw this.badRequestError(`Failed to render email template: ${templateName}`);
    }
  }

  private resolveTextBody(rawBody: string, htmlBody: string, subject: string): string {
    const trimmedRaw = String(rawBody || '').trim();

    if (trimmedRaw && !looksLikeHtml(trimmedRaw)) {
      return trimmedRaw;
    }

    if (trimmedRaw && looksLikeHtml(trimmedRaw)) {
      return extractPlainTextFromHtml(trimmedRaw) || subject;
    }

    return extractPlainTextFromHtml(htmlBody) || subject;
  }

  private formatAddressHeader(address: string, displayName?: string): string {
    const trimmedAddress = String(address || '').trim();
    const trimmedDisplayName = String(displayName || '').trim();

    if (!trimmedAddress) {
      return '';
    }

    if (!trimmedDisplayName) {
      return trimmedAddress;
    }

    const escapedDisplayName = trimmedDisplayName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${escapedDisplayName}" <${trimmedAddress}>`;
  }

  /**
   * Send email with retry logic
   */
  async sendEmail(
    to: string,
    subject: string,
    body: string,
    options?: Partial<EmailOptions>
  ): Promise<EmailSendResult> {
    const smtpConfig = await this.resolveSmtpRuntimeConfig(options?.tenantId);

    if (!smtpConfig.enabled) {
      logger.info(`Email would be sent to ${to} (SMTP disabled)`, {
        tenantId: options?.tenantId || null,
      });
      await this.logEmail(
        to,
        subject,
        'SKIPPED',
        null,
        'SMTP disabled',
        smtpConfig.from,
        options?.template,
        options?.variables as Record<string, unknown>,
        options?.tenantId,
        options?.userId
      );
      return { success: true, to, subject, message: 'Email skipped (SMTP disabled)' };
    }

    if (!smtpConfig.host || !smtpConfig.from) {
      throw this.badRequestError(
        'SMTP settings are incomplete. Please configure host and from address.'
      );
    }

    let transporter: Transporter | null = null;
    if (smtpConfig.source === 'env') {
      if (!this.transporter) {
        // Try to reinitialize
        await this.initializeTransporter();
      }
      if (!this.transporter) {
        throw this.badRequestError('Email service not available - SMTP transporter not configured');
      }
      transporter = this.transporter;
    } else {
      const normalized = this.normalizeSmtpSecurity(smtpConfig.port, smtpConfig.secure);
      if (normalized.note) {
        logger.warn(normalized.note, { source: 'settings', tenantId: options?.tenantId || null });
      }

      const transportOptions: Record<string, unknown> = {
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: normalized.secure,
      };
      if (normalized.requireTLS) {
        transportOptions['requireTLS'] = true;
      }
      if (smtpConfig.user) {
        transportOptions['auth'] = {
          user: smtpConfig.user,
          pass: smtpConfig.pass,
        };
      }
      transporter = nodemailer.createTransport(transportOptions);
    }

    let html = options?.html || body;

    // Render template if provided
    if (options?.template && options?.variables) {
      html = await this.renderTemplate(options.template, options.variables);
    }

    html = prepareOutboundEmailHtml(html, {
      subject,
      fallbackText: body,
      previewText: subject,
      appName: env.get('APP_NAME'),
      headerTitle: env.get('APP_NAME'),
      footerText: `Sent from ${env.get('APP_NAME') || 'Event Manager'}`,
    });

    const textBody = this.resolveTextBody(body, html, subject);

    const replyTo = this.formatAddressHeader(smtpConfig.replyToAddress, smtpConfig.replyToName);
    const mailOptions: SendMailOptions = {
      from: this.formatAddressHeader(smtpConfig.from, smtpConfig.fromName),
      to,
      subject,
      text: textBody,
      html,
      attachments: options?.attachments || [],
    };
    if (replyTo) {
      mailOptions.replyTo = replyTo;
    }

    // Send email with retry logic
    // S4-1: Circuit breaker wraps retry logic to fail fast when SMTP is down
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // S4-1: Execute send through circuit breaker
        const info = await this.circuitBreaker.execute(async () => {
          return await transporter!.sendMail(mailOptions);
        });

        // Log successful email with enhanced tracking
        await this.logEmail(
          to,
          subject,
          'SENT',
          info.messageId,
          null,
          smtpConfig.from,
          options?.template,
          options?.variables as Record<string, string | number | boolean>,
          options?.tenantId,
          options?.userId
        );

        logger.info(`Email sent successfully to ${to}`, { attempt, maxRetries: this.maxRetries });

        return {
          success: true,
          to,
          subject,
          messageId: info.messageId,
          response: info.response,
        };
      } catch (error) {
        lastError = error as Error;

        // S4-1: If circuit breaker is open, fail fast without retrying
        if (lastError.message.includes('Circuit breaker')) {
          logger.error('Email circuit breaker is OPEN - failing fast', { to, subject });

          // Log circuit breaker failure
          await this.logEmail(
            to,
            subject,
            'FAILED',
            null,
            'Circuit breaker OPEN - SMTP service unavailable',
            smtpConfig.from,
            options?.template,
            options?.variables as Record<string, unknown>,
            options?.tenantId,
            options?.userId
          );

          throw this.badRequestError(
            'Email service temporarily unavailable - please try again later'
          );
        }

        logger.error(`Email send failed (attempt ${attempt}/${this.maxRetries})`, { error, to });

        if (attempt < this.maxRetries) {
          // Wait before retry with exponential backoff
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }

    // All retries failed - log failure with enhanced tracking
    const lastMessage = String(lastError?.message || '');
    await this.logEmail(
      to,
      subject,
      'FAILED',
      null,
      lastMessage,
      smtpConfig.from,
      options?.template,
      options?.variables as Record<string, unknown>,
      options?.tenantId,
      options?.userId
    );

    // Log email sending failure to ErrorLogService
    try {
      const errorLogService = container.resolve(ErrorLogService);
      await errorLogService.logException(lastError as Error, 'EmailService:sendEmail', {
        to,
        subject,
        template: options?.template,
        attempts: this.maxRetries,
        smtpHost: smtpConfig.host,
      });
    } catch (logError) {
      logger.error('Failed to log email sending error', { error: logError });
    }

    if (lastMessage.includes('wrong version number')) {
      throw this.badRequestError(
        'SMTP TLS configuration mismatch. For port 587 use STARTTLS (secure off), or use port 465 with secure on.'
      );
    }

    throw this.badRequestError(
      `Failed to send email after ${this.maxRetries} attempts: ${lastMessage || 'Unknown error'}`
    );
  }

  private parseBool(value: string | undefined, defaultValue = false): boolean {
    if (value == null || value === '') return defaultValue;
    const normalized = String(value).trim().toLowerCase();
    return (
      normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on'
    );
  }

  private async resolveSmtpRuntimeConfig(tenantId?: string): Promise<SmtpRuntimeConfig> {
    const envConfig: SmtpRuntimeConfig = {
      enabled: env.get('SMTP_ENABLED'),
      host: String(env.get('SMTP_HOST') || ''),
      port: Number(env.get('SMTP_PORT') || 587),
      secure: Boolean(env.get('SMTP_SECURE')),
      user: String(env.get('SMTP_USER') || ''),
      pass: String(env.get('SMTP_PASS') || ''),
      from: String(env.get('SMTP_FROM') || ''),
      fromName: String(env.get('SMTP_FROM_NAME') || ''),
      replyToAddress: '',
      replyToName: '',
      source: 'env',
    };

    if (!tenantId) return envConfig;

    const keys = [
      'email_enabled',
      'smtp_enabled',
      'email_smtp_host',
      'email_smtpHost',
      'smtp_host',
      'email_smtp_port',
      'email_smtpPort',
      'smtp_port',
      'email_smtp_secure',
      'email_smtpSecure',
      'email_secure',
      'email_smtp_user',
      'email_smtpUser',
      'smtp_user',
      'email_smtp_pass',
      'email_smtpPassword',
      'smtp_password',
      'email_from_address',
      'email_fromEmail',
      'smtp_from',
      'email_from_name',
      'email_fromName',
      'email_reply_to_address',
      'email_replyToEmail',
      'email_reply_to_name',
      'email_replyToName',
    ];

    const [globalRows, tenantRows] = await Promise.all([
      this.prisma.systemSetting.findMany({
        where: { tenantId: null, key: { in: keys } },
        select: { key: true, value: true },
      }),
      this.prisma.systemSetting.findMany({
        where: { tenantId, key: { in: keys } },
        select: { key: true, value: true },
      }),
    ]);

    if (tenantRows.length === 0 && globalRows.length === 0) {
      return envConfig;
    }

    const map: Record<string, string> = {};
    for (const row of globalRows) map[row.key] = row.value;
    for (const row of tenantRows) map[row.key] = row.value;

    const pick = (...aliases: string[]): string | undefined => {
      for (const alias of aliases) {
        const value = map[alias];
        if (value != null && value !== '') return value;
      }
      return undefined;
    };

    const settingsEnabled = this.parseBool(
      pick('email_enabled', 'smtp_enabled'),
      envConfig.enabled
    );

    return {
      enabled: settingsEnabled,
      host: pick('email_smtp_host', 'email_smtpHost', 'smtp_host') || envConfig.host,
      port: Number(pick('email_smtp_port', 'email_smtpPort', 'smtp_port') || envConfig.port),
      secure: this.parseBool(
        pick('email_smtp_secure', 'email_smtpSecure', 'email_secure'),
        envConfig.secure
      ),
      user: pick('email_smtp_user', 'email_smtpUser', 'smtp_user') || envConfig.user,
      pass: pick('email_smtp_pass', 'email_smtpPassword', 'smtp_password') || envConfig.pass,
      from: pick('email_from_address', 'email_fromEmail', 'smtp_from') || envConfig.from,
      fromName: pick('email_from_name', 'email_fromName') || envConfig.fromName,
      replyToAddress:
        pick('email_reply_to_address', 'email_replyToEmail') || envConfig.replyToAddress,
      replyToName: pick('email_reply_to_name', 'email_replyToName') || envConfig.replyToName,
      source: 'settings',
    };
  }

  /**
   * Log email delivery to database
   */
  private async logEmail(
    to: string,
    subject: string,
    status: 'SENT' | 'FAILED' | 'PENDING' | 'SKIPPED',
    messageId: string | null = null,
    errorMessage: string | null = null,
    from?: string,
    template?: string,
    metadata?: Record<string, unknown>,
    tenantId?: string,
    userId?: string
  ): Promise<void> {
    try {
      await this.prisma.emailLog.create({
        data: {
          to,
          subject,
          status,
          messageId,
          errorMessage,
          from: from || env.get('SMTP_FROM'),
          template: template || null,
          metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
          tenantId: tenantId || null,
          userId: userId || null,
          sentAt: new Date(),
        },
      });
    } catch (logError) {
      logger.error('Failed to log email', { error: logError });
      // Don't throw - logging failure shouldn't break email sending
    }
  }

  /**
   * Send bulk emails with concurrency control
   */
  async sendBulkEmail(
    recipients: string[],
    subject: string,
    body: string,
    options?: Partial<EmailOptions>
  ): Promise<BulkEmailResult[]> {
    const results: BulkEmailResult[] = [];
    const concurrency = 5; // Send 5 emails at a time

    for (let i = 0; i < recipients.length; i += concurrency) {
      const batch = recipients.slice(i, i + concurrency);

      const batchResults = await Promise.allSettled(
        batch.map((to) => this.sendEmail(to, subject, body, options))
      );

      batchResults.forEach((result, index) => {
        const to = batch[index] || '';
        if (result.status === 'fulfilled') {
          const payload = result.value || {};
          results.push({
            to,
            success: Boolean(payload.success),
            messageId: payload.messageId,
            response: payload.response,
            error: payload.success ? undefined : payload.message || 'Email skipped',
          });
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
      variables,
    });
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(
    email: string,
    name: string,
    verificationUrl?: string
  ): Promise<EmailSendResult> {
    return this.sendTemplatedEmail(email, 'Welcome to Event Manager', 'welcome', {
      name,
      verificationUrl: verificationUrl || '#',
      appName: env.get('APP_NAME'),
      supportEmail: env.get('SMTP_FROM'),
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    name: string,
    resetUrl: string
  ): Promise<EmailSendResult> {
    return this.sendTemplatedEmail(email, 'Reset Your Password', 'password-reset', {
      name,
      resetUrl,
      appName: env.get('APP_NAME'),
      supportEmail: env.get('SMTP_FROM'),
    });
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(
    email: string,
    name: string,
    verificationUrl: string
  ): Promise<EmailSendResult> {
    return this.sendTemplatedEmail(email, 'Verify Your Email Address', 'email-verification', {
      name,
      verificationUrl,
      appName: env.get('APP_NAME'),
      supportEmail: env.get('SMTP_FROM'),
    });
  }

  /**
   * Send invitation email for events/contests
   *
   * @param email - Recipient email address
   * @param name - Recipient name
   * @param eventName - Name of the event/contest
   * @param role - Role of the invitee (e.g., "Judge", "Contestant")
   * @param acceptUrl - URL to accept the invitation
   * @param declineUrl - URL to decline the invitation
   * @param options - Additional invitation options
   * @returns Promise<EmailSendResult>
   */
  async sendInvitationEmail(
    email: string,
    name: string,
    eventName: string,
    role: string,
    acceptUrl: string,
    declineUrl: string,
    options?: {
      eventDate?: string;
      eventLocation?: string;
      eventDescription?: string;
      loginUrl?: string;
      username?: string;
      temporaryPassword?: string;
      registrationUrl?: string;
    }
  ): Promise<EmailSendResult> {
    const variables: Record<string, string | number | boolean> = {
      email: email || '',
      name: name || '',
      eventName: eventName || '',
      role: role || '',
      acceptUrl: acceptUrl || '',
      declineUrl: declineUrl || '',
      appName: env.get('APP_NAME') || '',
      supportEmail: env.get('SMTP_FROM') || '',
      eventDate: options?.eventDate || '',
      eventLocation: options?.eventLocation || '',
      eventDescription: options?.eventDescription || '',
      loginUrl: options?.loginUrl || '',
      username: options?.username || '',
      temporaryPassword: options?.temporaryPassword || '',
      registrationUrl: options?.registrationUrl || '',
      hasCredentials: !!(options?.username || options?.temporaryPassword || options?.loginUrl),
    };

    return this.sendTemplatedEmail(
      email,
      `Invitation: ${eventName} - ${role}`,
      'invitation',
      variables
    );
  }

  /**
   * Send virus alert email to security team
   *
   * @param details - Virus scan details including filename, virus name, user info, etc.
   * @returns Promise<EmailSendResult>
   */
  async sendVirusAlertEmail(details: {
    filename: string;
    virusName: string;
    fileSize: string;
    timestamp: string;
    username?: string;
    userEmail?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<EmailSendResult> {
    const securityEmail = env.get('SECURITY_EMAIL');

    if (!securityEmail) {
      logger.warn('SECURITY_EMAIL not configured - virus alert email not sent');
      return {
        success: false,
        to: '',
        subject: 'Security Alert: Virus Detected',
        message: 'Security email not configured',
      };
    }

    const variables: Record<string, string | number | boolean> = {
      appName: env.get('APP_NAME'),
      supportEmail: env.get('SMTP_FROM'),
      filename: details.filename,
      virusName: details.virusName || 'Unknown',
      fileSize: details.fileSize,
      timestamp: details.timestamp,
      username: details.username || '',
      userEmail: details.userEmail || '',
      ipAddress: details.ipAddress || 'Unknown',
      userAgent: details.userAgent || '',
    };

    return this.sendTemplatedEmail(
      securityEmail,
      `🚨 Security Alert: Virus Detected - ${details.virusName}`,
      'virus-alert',
      variables
    );
  }
}
