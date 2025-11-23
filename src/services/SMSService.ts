import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';

export interface SMSSettings {
  enabled: boolean;
  apiKey: string;
  apiSecret: string;
  fromNumber: string;
  provider: string;
}

@injectable()
export class SMSService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  async getSettings(): Promise<SMSSettings> {
    try {
      const settings: any = await this.prisma.systemSetting.findMany({
        where: {
          key: {
            in: ['SMS_ENABLED', 'SMS_API_KEY', 'SMS_API_SECRET', 'SMS_FROM_NUMBER', 'SMS_PROVIDER']
          }
        }
      });

      const config: any = {};
      settings.forEach((setting: any) => {
        config[setting.key.toLowerCase()] = setting.value;
      });

      return {
        enabled: config.sms_enabled === 'true',
        apiKey: config.sms_api_key || '',
        apiSecret: config.sms_api_secret || '',
        fromNumber: config.sms_from_number || '',
        provider: config.sms_provider || 'twilio'
      };
    } catch (error) {
      return {
        enabled: false,
        apiKey: '',
        apiSecret: '',
        fromNumber: '',
        provider: 'twilio'
      };
    }
  }

  async updateSettings(data: SMSSettings, userId?: string) {
    const settings = [
      { key: 'SMS_ENABLED', value: data.enabled ? 'true' : 'false', category: 'sms', description: 'Enable SMS notifications' },
      { key: 'SMS_API_KEY', value: data.apiKey || '', category: 'sms', description: 'SMS API Key' },
      { key: 'SMS_API_SECRET', value: data.apiSecret || '', category: 'sms', description: 'SMS API Secret' },
      { key: 'SMS_FROM_NUMBER', value: data.fromNumber || '', category: 'sms', description: 'SMS From Number' },
      { key: 'SMS_PROVIDER', value: data.provider || 'twilio', category: 'sms', description: 'SMS Provider' }
    ];

    for (const setting of settings) {
      await this.prisma.systemSetting.upsert({
        where: { key_tenantId: { key: setting.key, tenantId: null as unknown as string } },
        update: {
          value: setting.value,
          updatedBy: userId
        },
        create: {
          key: setting.key,
          value: setting.value,
          tenantId: null,
          category: setting.category,
          description: setting.description,
          updatedBy: userId
        }
      });
    }
  }

  async sendSMS(to: string, message: string): Promise<any> {
    if (!to || !message) {
      throw this.badRequestError('Phone number and message are required');
    }

    const settings = await this.getSettings();
    if (!settings.enabled) {
      throw this.badRequestError('SMS service is not enabled');
    }

    // TODO: Implement actual SMS sending via Twilio or other provider
    // For now, just log the attempt
    return {
      success: true,
      message: 'SMS would be sent (not implemented)',
      to,
      from: settings.fromNumber
    };
  }
}
