import { injectable, inject } from 'tsyringe';
import { PrismaClient, Prisma } from '@prisma/client';
import { BaseService } from './BaseService';
import nodemailer from 'nodemailer';

// Prisma payload types
type SystemSettingBasic = Prisma.SystemSettingGetPayload<{
  select: {
    key: true;
    value: true;
    category: true;
  };
}>;

type SystemSettingFull = Prisma.SystemSettingGetPayload<object>;

export interface PublicSettings {
  appName: string;
  appSubtitle: string;
  showForgotPassword: boolean;
  logoPath: string | null;
  faviconPath: string | null;
  contactEmail: string | null;
}

export interface AppNameSettings {
  appName: string;
  appSubtitle: string;
}

@injectable()
export class SettingsService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  /**
   * Get all settings
   */
  async getAllSettings(): Promise<SystemSettingFull[]> {
    return await this.prisma.systemSetting.findMany();
  }

  /**
   * Get settings by category
   */
  async getSettingsByCategory(category: string): Promise<SystemSettingFull[]> {
    return await this.prisma.systemSetting.findMany({
      where: { category },
    });
  }

  /**
   * Get app name and subtitle
   */
  async getAppName(): Promise<AppNameSettings> {
    const [nameSetting, subtitleSetting] = await Promise.all([
      this.prisma.systemSetting.findFirst({
        where: { key: 'app_name' },
      }),
      this.prisma.systemSetting.findFirst({
        where: { key: 'app_subtitle' },
      }),
    ]);

    return {
      appName: nameSetting?.value || 'Event Manager',
      appSubtitle: subtitleSetting?.value || '',
    };
  }

  /**
   * Get public settings (no authentication required)
   */
  async getPublicSettings(): Promise<PublicSettings> {
    const keys = [
      'app_name',
      'app_subtitle',
      'show_forgot_password',
      'theme_logoPath',
      'theme_faviconPath',
      'footer_contactEmail',
    ];

    const settings: SystemSettingBasic[] = await this.prisma.systemSetting.findMany({
      where: { key: { in: keys } },
      select: {
        key: true,
        value: true,
        category: true
      }
    });

    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

    return {
      appName: map['app_name'] || 'Event Manager',
      appSubtitle: map['app_subtitle'] || '',
      showForgotPassword: (map['show_forgot_password'] || 'true') === 'true',
      logoPath: map['theme_logoPath'] || null,
      faviconPath: map['theme_faviconPath'] || null,
      contactEmail: map['footer_contactEmail'] || null,
    };
  }

  /**
   * Update multiple settings
   */
  async updateSettings(
    settings: Record<string, string>,
    userId: string
  ): Promise<number> {
    let updatedCount = 0;

    for (const [key, value] of Object.entries(settings)) {
      const category = this.determineCategoryFromKey(key);

      await this.prisma.systemSetting.upsert({
        where: { key },
        update: {
          value: value,
          category,
          updatedBy: userId,
        },
        create: {
          key,
          value: value,
          category,
          description: `Setting for ${key}`,
          updatedBy: userId,
        },
      });

      updatedCount++;
    }

    return updatedCount;
  }

  /**
   * Update single setting
   */
  async updateSetting(
    key: string,
    value: string,
    userId: string
  ): Promise<SystemSettingFull> {
    const category = this.determineCategoryFromKey(key);

    return await this.prisma.systemSetting.upsert({
      where: { key },
      update: {
        value,
        category,
        updatedBy: userId,
      },
      create: {
        key,
        value,
        category,
        description: `Setting for ${key}`,
        updatedBy: userId,
      },
    });
  }

  /**
   * Get logging levels
   */
  async getLoggingLevels(): Promise<Record<string, string>> {
    const settings: SystemSettingBasic[] = await this.prisma.systemSetting.findMany({
      where: { key: { startsWith: 'logging_' } },
      select: {
        key: true,
        value: true,
        category: true
      }
    });

    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  /**
   * Update logging level
   */
  async updateLoggingLevel(
    level: string,
    userId: string
  ): Promise<SystemSettingFull> {
    return await this.updateSetting('logging_level', level, userId);
  }

  /**
   * Get security settings
   */
  async getSecuritySettings(): Promise<Record<string, string>> {
    const settings: SystemSettingBasic[] = await this.prisma.systemSetting.findMany({
      where: { category: 'security' },
      select: {
        key: true,
        value: true,
        category: true
      }
    });

    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  /**
   * Update security settings
   */
  async updateSecuritySettings(
    securitySettings: Record<string, string>,
    userId: string
  ): Promise<number> {
    let updatedCount = 0;

    for (const [key, value] of Object.entries(securitySettings)) {
      await this.updateSetting(key, value, userId);
      updatedCount++;
    }

    return updatedCount;
  }

  /**
   * Get backup settings
   */
  async getBackupSettings(): Promise<Record<string, string>> {
    const settings: SystemSettingBasic[] = await this.prisma.systemSetting.findMany({
      where: { category: 'backup' },
      select: {
        key: true,
        value: true,
        category: true
      }
    });

    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  /**
   * Update backup settings
   */
  async updateBackupSettings(
    backupSettings: Record<string, string>,
    userId: string
  ): Promise<number> {
    let updatedCount = 0;

    for (const [key, value] of Object.entries(backupSettings)) {
      await this.updateSetting(key, value, userId);
      updatedCount++;
    }

    return updatedCount;
  }

  /**
   * Get email settings
   */
  async getEmailSettings(): Promise<Record<string, string>> {
    const settings: SystemSettingBasic[] = await this.prisma.systemSetting.findMany({
      where: { category: 'email' },
      select: {
        key: true,
        value: true,
        category: true
      }
    });

    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  /**
   * Update email settings
   */
  async updateEmailSettings(
    emailSettings: Record<string, string>,
    userId: string
  ): Promise<number> {
    let updatedCount = 0;

    for (const [key, value] of Object.entries(emailSettings)) {
      await this.updateSetting(key, value, userId);
      updatedCount++;
    }

    return updatedCount;
  }

  /**
   * Test email settings
   */
  async testEmailSettings(testEmail: string): Promise<boolean> {
    const emailSettings = await this.getEmailSettings();

    const transporter = nodemailer.createTransport({
      host: emailSettings.smtp_host,
      port: parseInt(emailSettings.smtp_port || '587'),
      secure: emailSettings.smtp_secure === 'true',
      auth: {
        user: emailSettings.smtp_user,
        pass: emailSettings.smtp_password,
      },
    });

    await transporter.sendMail({
      from: emailSettings.email_from || 'noreply@example.com',
      to: testEmail,
      subject: 'Test Email from Event Manager',
      text: 'This is a test email to verify your SMTP settings are working correctly.',
    });

    return true;
  }

  /**
   * Get password policy
   */
  async getPasswordPolicy(): Promise<Record<string, string>> {
    const settings: SystemSettingBasic[] = await this.prisma.systemSetting.findMany({
      where: { key: { startsWith: 'password_' } },
      select: {
        key: true,
        value: true,
        category: true
      }
    });

    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  /**
   * Update password policy
   */
  async updatePasswordPolicy(
    passwordPolicy: Record<string, string>,
    userId: string
  ): Promise<number> {
    let updatedCount = 0;

    for (const [key, value] of Object.entries(passwordPolicy)) {
      await this.updateSetting(key, value, userId);
      updatedCount++;
    }

    return updatedCount;
  }

  /**
   * Get JWT configuration
   */
  async getJWTConfig(): Promise<Record<string, string>> {
    const settings: SystemSettingBasic[] = await this.prisma.systemSetting.findMany({
      where: { key: { startsWith: 'jwt_' } },
      select: {
        key: true,
        value: true,
        category: true
      }
    });

    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  /**
   * Update JWT configuration
   */
  async updateJWTConfig(
    jwtConfig: Record<string, string>,
    userId: string
  ): Promise<number> {
    let updatedCount = 0;

    for (const [key, value] of Object.entries(jwtConfig)) {
      await this.updateSetting(key, value, userId);
      updatedCount++;
    }

    return updatedCount;
  }

  /**
   * Get theme settings
   */
  async getThemeSettings(): Promise<Record<string, string>> {
    const settings: SystemSettingBasic[] = await this.prisma.systemSetting.findMany({
      where: { category: 'theme' },
      select: {
        key: true,
        value: true,
        category: true
      }
    });

    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  /**
   * Update theme settings
   */
  async updateThemeSettings(
    themeSettings: Record<string, string>,
    userId: string
  ): Promise<number> {
    let updatedCount = 0;

    for (const [key, value] of Object.entries(themeSettings)) {
      await this.updateSetting(key, value, userId);
      updatedCount++;
    }

    return updatedCount;
  }

  /**
   * Get contestant visibility settings
   */
  async getContestantVisibilitySettings(): Promise<Record<string, string>> {
    const settings: SystemSettingBasic[] = await this.prisma.systemSetting.findMany({
      where: { key: { startsWith: 'contestant_visibility_' } },
      select: {
        key: true,
        value: true,
        category: true
      }
    });

    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  /**
   * Update contestant visibility settings
   */
  async updateContestantVisibilitySettings(
    visibilitySettings: Record<string, string | boolean>,
    userId: string
  ): Promise<number> {
    let updatedCount = 0;

    // Transform from { canViewWinners: true } to { contestant_visibility_canViewWinners: "true" }
    const transformedSettings: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(visibilitySettings)) {
      // Convert boolean values to strings for Prisma compatibility
      const stringValue = typeof value === 'boolean' ? String(value) : String(value || '');
      
      // Map frontend keys to database keys
      if (key === 'canViewWinners') {
        transformedSettings['contestant_visibility_canViewWinners'] = stringValue;
      } else if (key === 'canViewOverallResults') {
        transformedSettings['contestant_visibility_canViewOverallResults'] = stringValue;
      } else if (key.startsWith('contestant_visibility_')) {
        // Already in correct format
        transformedSettings[key] = stringValue;
      } else {
        // Default: add prefix
        transformedSettings[`contestant_visibility_${key}`] = stringValue;
      }
    }

    for (const [key, value] of Object.entries(transformedSettings)) {
      await this.updateSetting(key, value, userId);
      updatedCount++;
    }

    return updatedCount;
  }

  /**
   * Get database connection info (masked for security)
   */
  async getDatabaseConnectionInfo(): Promise<Record<string, string>> {
    try {
      const dbUrl = process.env.DATABASE_URL || '';
      const info: Record<string, string> = {
        configured: 'true',
        source: 'environment'
      };

      if (dbUrl) {
        try {
          const url = new URL(dbUrl);
          info.host = url.hostname || 'N/A';
          info.port = url.port || '5432';
          info.database = url.pathname.slice(1).split('?')[0] || 'N/A';
          info.user = url.username || 'N/A';
          info.password = url.password ? '***masked***' : 'Not set';
        } catch {
          // If URL parsing fails, try individual env vars
          info.host = process.env.DB_HOST || process.env.DATABASE_HOST || 'N/A';
          info.port = process.env.DB_PORT || process.env.DATABASE_PORT || '5432';
          info.database = process.env.DB_NAME || process.env.DATABASE_NAME || 'N/A';
          info.user = process.env.DB_USER || process.env.DATABASE_USER || 'N/A';
          info.password = (process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD) ? '***masked***' : 'Not set';
        }
      } else {
        // Try individual environment variables
        info.host = process.env.DB_HOST || process.env.DATABASE_HOST || 'Not configured';
        info.port = process.env.DB_PORT || process.env.DATABASE_PORT || '5432';
        info.database = process.env.DB_NAME || process.env.DATABASE_NAME || 'Not configured';
        info.user = process.env.DB_USER || process.env.DATABASE_USER || 'Not configured';
        info.password = (process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD) ? '***masked***' : 'Not configured';
      }

      return info;
    } catch (error) {
      return {
        configured: 'false',
        error: 'Unable to read database configuration'
      };
    }
  }

  /**
   * Helper: Determine category from setting key
   */
  private determineCategoryFromKey(key: string): string {
    if (key.startsWith('email_') || key.startsWith('smtp_')) {
      return 'email';
    } else if (key.startsWith('theme_')) {
      return 'theme';
    } else if (key.startsWith('logging_')) {
      return 'logging';
    } else if (key.startsWith('security_')) {
      return 'security';
    } else if (key.startsWith('database_')) {
      return 'database';
    } else if (key.startsWith('backup_')) {
      return 'backup';
    } else if (key.startsWith('notifications_')) {
      return 'notifications';
    } else if (key.startsWith('password_')) {
      return 'security';
    } else if (key.startsWith('jwt_')) {
      return 'security';
    } else if (key.startsWith('contestant_visibility_')) {
      return 'privacy';
    }

    return 'general';
  }
}
