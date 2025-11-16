import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';

export interface EmailConfig {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  from: string;
}

@injectable()
export class EmailService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  async getConfig(): Promise<EmailConfig> {
    const settings = await this.prisma.systemSetting.findMany({
      where: {
        key: { in: ['EMAIL_ENABLED', 'EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_FROM'] }
      }
    });

    const config: any = {};
    settings.forEach(s => { config[s.key.toLowerCase()] = s.value; });

    return {
      enabled: config.email_enabled === 'true',
      host: config.email_host || '',
      port: parseInt(config.email_port) || 587,
      user: config.email_user || '',
      from: config.email_from || ''
    };
  }

  async sendEmail(to: string, subject: string, body: string) {
    const config = await this.getConfig();
    if (!config.enabled) {
      throw this.badRequestError('Email service not enabled');
    }

    // TODO: Implement actual email sending
    return { success: true, to, subject };
  }

  async sendBulkEmail(recipients: string[], subject: string, body: string) {
    const results = [];
    for (const to of recipients) {
      try {
        const result = await this.sendEmail(to, subject, body);
        results.push({ to, success: true });
      } catch (error) {
        results.push({ to, success: false, error: String(error) });
      }
    }
    return results;
  }
}
