import { injectable, inject } from 'tsyringe';
import { PrismaClient, Prisma, UserRole } from '@prisma/client';
import { BaseService } from './BaseService';
import nodemailer from 'nodemailer';
import { env } from '../config/env';

// Prisma payload types
type SystemSettingFull = Prisma.SystemSettingGetPayload<object>;

export interface PublicSettings {
  appName: string;
  appSubtitle: string;
  appDescription: string;
  showForgotPassword: boolean;
  logoPath: string | null;
  faviconPath: string | null;
  contactEmail: string | null;
}

export interface AppNameSettings {
  appName: string;
  appSubtitle: string;
}

export interface SystemHealthAlertSettings {
  enabled: boolean;
  webhookUrl: string;
  emailRecipients: string[];
  warnDiskPercent: number;
  criticalDiskPercent: number;
  warnMemoryPercent: number;
  criticalMemoryPercent: number;
}

export interface ScoringWorkflowAlertSettings {
  enabled: boolean;
  recipientRoles: UserRole[];
  recipientUserIds: string[];
  recipientEmails: string[];
  notifyOnGovernanceRequestCreated: boolean;
  notifyOnGovernanceRequestApproved: boolean;
  notifyOnGovernanceRequestRejected: boolean;
  notifyOnDeductionRequested: boolean;
  notifyOnDeductionApproved: boolean;
  notifyOnJudgeCertified: boolean;
  notifyOnCategoryCertified: boolean;
  onlyIfUnviewed: boolean;
  escalationMinutes: number;
}

export interface AlertCandidateUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

// Extended setting type with source information
export interface SystemSettingWithSource extends SystemSettingFull {
  isInherited?: boolean;  // true if this is a global setting being used as fallback
}

const DEFAULT_APP_NAME = 'ConMGR';
const DEFAULT_APP_DESCRIPTION = 'Manage events, scoring, certifications, and reporting from one secure platform.';
const ALERT_CATEGORY = 'alerts';

@injectable()
export class SettingsService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  /**
   * Get tenant by slug (for public routes that need tenant context)
   */
  async getTenantBySlug(slug: string): Promise<{ id: string; name: string; slug: string } | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, isActive: true }
    });
    return tenant?.isActive ? tenant : null;
  }

  // ============================================
  // TENANT-AWARE SETTINGS METHODS
  // ============================================

  /**
   * Get a single setting with tenant fallback to global
   * First tries tenant-specific, then falls back to global (tenantId = null)
   */
  async getSettingWithFallback(key: string, tenantId?: string | null): Promise<string | null> {
    // First try tenant-specific setting
    if (tenantId) {
      const tenantSetting = await this.prisma.systemSetting.findFirst({
        where: { key, tenantId }
      });
      if (tenantSetting) return tenantSetting.value;
    }

    // Fall back to global setting
    const globalSetting = await this.prisma.systemSetting.findFirst({
      where: { key, tenantId: null }
    });
    return globalSetting?.value || null;
  }

  /**
   * Get all settings for a tenant with global fallback
   * Returns merged settings where tenant-specific override global defaults
   */
  async getAllSettingsForTenant(tenantId?: string | null): Promise<SystemSettingWithSource[]> {
    // Get all global settings (platform defaults)
    const globalSettings = await this.prisma.systemSetting.findMany({
      where: { tenantId: null }
    });

    if (!tenantId) {
      // No tenant context - return global settings only
      return globalSettings.map(s => ({ ...s, isInherited: false }));
    }

    // Get tenant-specific overrides
    const tenantSettings = await this.prisma.systemSetting.findMany({
      where: { tenantId }
    });

    // Merge: tenant settings override global
    const settingsMap = new Map<string, SystemSettingWithSource>();

    // First add global settings (marked as inherited)
    globalSettings.forEach(s => settingsMap.set(s.key, { ...s, isInherited: true }));

    // Then override with tenant-specific settings (not inherited)
    tenantSettings.forEach(s => settingsMap.set(s.key, { ...s, isInherited: false }));

    return Array.from(settingsMap.values());
  }

  /**
   * Get only global/platform settings (tenantId = null)
   * Used by SUPER_ADMIN to manage platform defaults
   */
  async getGlobalSettings(): Promise<SystemSettingFull[]> {
    return await this.prisma.systemSetting.findMany({
      where: { tenantId: null }
    });
  }

  /**
   * Get only tenant-specific settings (excludes inherited)
   * Used to see what a tenant has customized
   */
  async getTenantOnlySettings(tenantId: string): Promise<SystemSettingFull[]> {
    return await this.prisma.systemSetting.findMany({
      where: { tenantId }
    });
  }

  /**
   * Set a setting for a specific tenant (or global if tenantId is null)
   * Creates override if doesn't exist, updates if it does
   */
  async setSettingForTenant(
    key: string,
    value: string | boolean | number,
    tenantId: string | null,
    category?: string,
    description?: string,
    userId?: string
  ): Promise<SystemSettingFull> {
    const categoryValue = category || this.determineCategoryFromKey(key);

    // Convert value to string (database stores all values as strings)
    const stringValue = String(value);

    // Prisma doesn't support null in compound unique constraints for upsert
    // So we need to handle global (tenantId = null) vs tenant-specific differently
    if (tenantId) {
      // Tenant-specific setting - use compound unique constraint
      return await this.prisma.systemSetting.upsert({
        where: { key_tenantId: { key, tenantId } },
        update: {
          value: stringValue,
          category: categoryValue,
          description,
          updatedBy: userId
        },
        create: {
          key,
          value: stringValue,
          tenantId,
          category: categoryValue,
          description: description || `Setting for ${key}`,
          updatedBy: userId
        }
      });
    } else {
      // Global setting (tenantId = null) - find first, then update or create
      const existing = await this.prisma.systemSetting.findFirst({
        where: { key, tenantId: null }
      });

      if (existing) {
        return await this.prisma.systemSetting.update({
          where: { id: existing.id },
          data: {
            value: stringValue,
            category: categoryValue,
            description,
            updatedBy: userId
          }
        });
      } else {
        return await this.prisma.systemSetting.create({
          data: {
            key,
            value: stringValue,
            tenantId: null,
            category: categoryValue,
            description: description || `Setting for ${key}`,
            updatedBy: userId
          }
        });
      }
    }
  }

  /**
   * Delete a tenant-specific setting (reverts to global default)
   * Only works for tenant settings, not global
   */
  async deleteTenantSetting(key: string, tenantId: string): Promise<boolean> {
    const result = await this.prisma.systemSetting.deleteMany({
      where: { key, tenantId }
    });
    return result.count > 0;
  }

  /**
   * Copy all global settings to a new tenant (used when creating a new tenant)
   * This creates tenant-specific copies so they can be customized
   */
  async initializeTenantSettings(tenantId: string, userId?: string): Promise<number> {
    const globalSettings = await this.getGlobalSettings();
    let count = 0;

    for (const setting of globalSettings) {
      await this.prisma.systemSetting.create({
        data: {
          key: setting.key,
          value: setting.value,
          tenantId,
          category: setting.category,
          description: setting.description,
          updatedBy: userId
        }
      });
      count++;
    }

    return count;
  }

  /**
   * Get settings by category for a tenant with fallback
   */
  async getSettingsByCategoryForTenant(
    category: string,
    tenantId?: string | null
  ): Promise<SystemSettingWithSource[]> {
    // Get global settings for this category
    const globalSettings = await this.prisma.systemSetting.findMany({
      where: { category, tenantId: null }
    });

    if (!tenantId) {
      return globalSettings.map(s => ({ ...s, isInherited: false }));
    }

    // Get tenant-specific settings for this category
    const tenantSettings = await this.prisma.systemSetting.findMany({
      where: { category, tenantId }
    });

    // Merge with tenant overrides
    const settingsMap = new Map<string, SystemSettingWithSource>();
    globalSettings.forEach(s => settingsMap.set(s.key, { ...s, isInherited: true }));
    tenantSettings.forEach(s => settingsMap.set(s.key, { ...s, isInherited: false }));

    return Array.from(settingsMap.values());
  }

  // ============================================
  // BACKWARD COMPATIBLE METHODS (Updated for tenant awareness)
  // ============================================

  /**
   * Get all settings (tenant-aware with fallback)
   * @param tenantId - Optional tenant ID for tenant-specific settings
   */
  async getAllSettings(tenantId?: string | null): Promise<SystemSettingFull[]> {
    if (tenantId) {
      // Return merged settings for tenant
      return await this.getAllSettingsForTenant(tenantId);
    }
    // Legacy behavior: return global settings only
    return await this.prisma.systemSetting.findMany({
      where: { tenantId: null }
    });
  }

  /**
   * Get settings by category (tenant-aware with fallback)
   * @param category - Setting category
   * @param tenantId - Optional tenant ID for tenant-specific settings
   */
  async getSettingsByCategory(category: string, tenantId?: string | null): Promise<SystemSettingFull[]> {
    if (tenantId) {
      return await this.getSettingsByCategoryForTenant(category, tenantId);
    }
    // Legacy behavior: return global settings only
    return await this.prisma.systemSetting.findMany({
      where: { category, tenantId: null },
    });
  }

  /**
   * Get app name and subtitle (tenant-aware with branding fallback)
   * @param tenantId - Optional tenant ID; falls back to global branding if not customized
   */
  async getAppName(tenantId?: string | null): Promise<AppNameSettings> {
    const [appName, appSubtitle] = await Promise.all([
      this.getSettingWithFallback('app_name', tenantId),
      this.getSettingWithFallback('app_subtitle', tenantId),
    ]);

    return {
      appName: appName || DEFAULT_APP_NAME,
      appSubtitle: appSubtitle || '',
    };
  }

  /**
   * Get public settings (no authentication required, tenant-aware with branding fallback)
   * @param tenantId - Optional tenant ID; uses global branding if tenant hasn't customized
   */
  async getPublicSettings(tenantId?: string | null): Promise<PublicSettings> {
    const keys = [
      'app_name',
      'app_subtitle',
      'app_description',
      'show_forgot_password',
      'theme_logoPath',
      'theme_faviconPath',
      'footer_contactEmail',
    ];

    // Build settings map with tenant fallback for each key
    const map: Record<string, string | null> = {};
    for (const key of keys) {
      map[key] = await this.getSettingWithFallback(key, tenantId);
    }

    return {
      appName: map['app_name'] || DEFAULT_APP_NAME,
      appSubtitle: map['app_subtitle'] || '',
      appDescription: map['app_description'] || DEFAULT_APP_DESCRIPTION,
      showForgotPassword: (map['show_forgot_password'] || 'true') === 'true',
      logoPath: map['theme_logoPath'] || null,
      faviconPath: map['theme_faviconPath'] || null,
      contactEmail: map['footer_contactEmail'] || null,
    };
  }

  /**
   * Update multiple settings (tenant-aware)
   * @param settings - Key-value pairs to update
   * @param userId - User making the change
   * @param tenantId - Optional tenant ID; null = global settings
   */
  // Map frontend keys to database keys for general settings
  private readonly generalSettingsKeyMap: Record<string, string> = {
    siteName: 'app_name',
    siteDescription: 'app_description',
    contactEmail: 'footer_contactEmail',
    allowRegistration: 'allow_registration',
    requireEmailVerification: 'require_email_verification',
    enableNotifications: 'notification_email_enabled',
    maintenanceMode: 'maintenance_mode',
    defaultLanguage: 'default_language',
    defaultTimezone: 'default_timezone',
    maxUploadSize: 'max_file_size',
    sessionTimeout: 'session_timeout',
  };

  async updateSettings(
    settings: Record<string, string>,
    userId: string,
    tenantId?: string | null
  ): Promise<number> {
    let updatedCount = 0;

    for (const [key, value] of Object.entries(settings)) {
      // Transform frontend key to database key if mapping exists
      const dbKey = this.generalSettingsKeyMap[key] || key;

      // Transform values for certain fields
      let dbValue = value;
      if (key === 'maxUploadSize') {
        // Convert MB to bytes
        dbValue = String(Number(value) * 1048576);
      } else if (key === 'sessionTimeout') {
        // Convert hours to seconds
        dbValue = String(Number(value) * 3600);
      }

      await this.setSettingForTenant(dbKey, dbValue, tenantId ?? null, undefined, undefined, userId);
      updatedCount++;
    }

    return updatedCount;
  }

  /**
   * Update single setting (tenant-aware)
   * @param key - Setting key
   * @param value - Setting value
   * @param userId - User making the change
   * @param tenantId - Optional tenant ID; null = global setting
   */
  async updateSetting(
    key: string,
    value: string,
    userId: string,
    tenantId?: string | null
  ): Promise<SystemSettingFull> {
    return await this.setSettingForTenant(key, value, tenantId ?? null, undefined, undefined, userId);
  }

  /**
   * Get logging levels (tenant-aware)
   */
  async getLoggingLevels(tenantId?: string | null): Promise<Record<string, string>> {
    const settings = await this.getSettingsWithPrefixForTenant('logging_', tenantId);
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  /**
   * Update logging level (tenant-aware)
   */
  async updateLoggingLevel(
    level: string,
    userId: string,
    tenantId?: string | null
  ): Promise<SystemSettingFull> {
    return await this.updateSetting('logging_level', level, userId, tenantId);
  }

  /**
   * Get security settings (tenant-aware - inherited initially from global)
   */
  async getSecuritySettings(tenantId?: string | null): Promise<Record<string, string>> {
    const settings = await this.getSettingsByCategoryForTenant('security', tenantId);
    const keyMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

    const mfaEnabled = keyMap['security_mfaEnabled'] ?? keyMap['security_enableTwoFactor'] ?? 'false';
    const mfaProviders = keyMap['security_mfaProviders'] || 'TOTP';

    return {
      security_maxLoginAttempts: keyMap['security_maxLoginAttempts'] || '5',
      security_lockoutDuration: keyMap['security_lockoutDuration'] || '15',
      security_sessionTimeout: keyMap['security_sessionTimeout'] || '24',
      security_requireStrongPasswords: keyMap['security_requireStrongPasswords'] || 'true',
      security_enableTwoFactor: mfaEnabled,
      security_mfaEnabled: mfaEnabled,
      security_mfaProviders: mfaProviders,
    };
  }

  /**
   * Update security settings (tenant-aware)
   */
  async updateSecuritySettings(
    securitySettings: Record<string, string>,
    userId: string,
    tenantId?: string | null
  ): Promise<number> {
    const nextSettings: Record<string, string> = { ...securitySettings };

    const mfaEnabled = (nextSettings['security_mfaEnabled'] ?? nextSettings['security_enableTwoFactor'] ?? 'false') === 'true';
    const rawProviders = nextSettings['security_mfaProviders'] || 'TOTP';
    const providers = rawProviders
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean)
      .filter((item) => ['TOTP', 'SMS', 'EMAIL'].includes(item));
    const normalizedProviders = providers.length > 0 ? providers : ['TOTP'];

    if (mfaEnabled && !normalizedProviders.includes('TOTP')) {
      throw new Error('Tenant MFA enforcement currently requires TOTP to be included in allowed providers.');
    }

    nextSettings['security_mfaEnabled'] = mfaEnabled ? 'true' : 'false';
    nextSettings['security_enableTwoFactor'] = mfaEnabled ? 'true' : 'false';
    nextSettings['security_mfaProviders'] = normalizedProviders.join(',');

    return await this.updateSettings(nextSettings, userId, tenantId);
  }

  /**
   * Get backup settings (tenant-aware)
   */
  async getBackupSettings(tenantId?: string | null): Promise<Record<string, string>> {
    const settings = await this.getSettingsByCategoryForTenant('backup', tenantId);
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  /**
   * Update backup settings (tenant-aware)
   */
  async updateBackupSettings(
    backupSettings: Record<string, string>,
    userId: string,
    tenantId?: string | null
  ): Promise<number> {
    return await this.updateSettings(backupSettings, userId, tenantId);
  }

  /**
   * Get email settings (tenant-aware - tenants can override with their own SMTP)
   */
  async getEmailSettings(tenantId?: string | null): Promise<Record<string, string>> {
    const emailKeys = [
      'email_enabled', 'smtp_enabled',
      'email_smtp_host', 'email_smtpHost', 'smtp_host',
      'email_smtp_port', 'email_smtpPort', 'smtp_port',
      'email_smtp_secure', 'email_smtpSecure', 'email_secure',
      'email_smtp_user', 'email_smtpUser', 'smtp_user',
      'email_smtp_pass', 'email_smtpPassword', 'smtp_password',
      'email_from_address', 'email_fromEmail', 'smtp_from',
      'email_from_name', 'email_fromName'
    ];

    const keyMap: Record<string, string> = {};
    for (const key of emailKeys) {
      const value = await this.getSettingWithFallback(key, tenantId);
      if (value) keyMap[key] = value;
    }

    // Transform database keys to frontend expected keys
    return {
      email_enabled: keyMap['email_enabled'] || keyMap['smtp_enabled'] || 'true',
      email_smtp_host: keyMap['email_smtp_host'] || keyMap['email_smtpHost'] || keyMap['smtp_host'] || '',
      email_smtp_port: keyMap['email_smtp_port'] || keyMap['email_smtpPort'] || keyMap['smtp_port'] || '587',
      email_smtp_secure: keyMap['email_smtp_secure'] || keyMap['email_smtpSecure'] || keyMap['email_secure'] || 'true',
      email_smtp_user: keyMap['email_smtp_user'] || keyMap['email_smtpUser'] || keyMap['smtp_user'] || '',
      email_smtp_pass: keyMap['email_smtp_pass'] || keyMap['email_smtpPassword'] || keyMap['smtp_password'] || '',
      email_from_address: keyMap['email_from_address'] || keyMap['email_fromEmail'] || keyMap['smtp_from'] || '',
      email_from_name: keyMap['email_from_name'] || keyMap['email_fromName'] || DEFAULT_APP_NAME,
    };
  }

  /**
   * Update email settings (tenant-aware)
   */
  async updateEmailSettings(
    emailSettings: Record<string, string>,
    userId: string,
    tenantId?: string | null
  ): Promise<number> {
    let updatedCount = 0;

    // Map frontend keys to database keys
    const keyMapping: Record<string, string> = {
      'email_enabled': 'email_enabled',
      'email_smtp_host': 'email_smtpHost',
      'email_smtp_port': 'email_smtpPort',
      'email_smtp_secure': 'email_smtpSecure',
      'email_smtp_user': 'email_smtpUser',
      'email_smtp_pass': 'email_smtpPassword',
      'email_from_address': 'email_fromEmail',
      'email_from_name': 'email_fromName',
    };

    for (const [key, value] of Object.entries(emailSettings)) {
      const dbKey = keyMapping[key] || key;
      await this.updateSetting(dbKey, value, userId, tenantId);
      updatedCount++;
    }

    return updatedCount;
  }

  /**
   * Test email settings (tenant-aware)
   */
  async testEmailSettings(testEmail: string, tenantId?: string | null): Promise<boolean> {
    const emailSettings = await this.getEmailSettings(tenantId);

    const transporter = nodemailer.createTransport({
      host: emailSettings['email_smtp_host'] || emailSettings['smtp_host'],
      port: parseInt(emailSettings['email_smtp_port'] || emailSettings['smtp_port'] || '587'),
      secure: (emailSettings['email_smtp_secure'] || emailSettings['smtp_secure']) === 'true',
      auth: {
        user: emailSettings['email_smtp_user'] || emailSettings['smtp_user'],
        pass: emailSettings['email_smtp_pass'] || emailSettings['smtp_password'],
      },
    });

    await transporter.sendMail({
      from: emailSettings['email_from_address'] || emailSettings['email_from'] || 'noreply@example.com',
      to: testEmail,
      subject: `Test Email from ${DEFAULT_APP_NAME}`,
      text: 'This is a test email to verify your SMTP settings are working correctly.',
    });

    return true;
  }

  /**
   * Get password policy (tenant-aware)
   */
  async getPasswordPolicy(tenantId?: string | null): Promise<Record<string, string>> {
    const settings = await this.getSettingsWithPrefixForTenant('password_', tenantId);
    const keyMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

    // Transform database keys to frontend expected keys with password_policy_ prefix
    return {
      password_policy_minLength: keyMap['password_policy_minLength'] || keyMap['password_minLength'] || '8',
      password_policy_requireUppercase: keyMap['password_policy_requireUppercase'] || keyMap['password_requireUppercase'] || 'true',
      password_policy_requireLowercase: keyMap['password_policy_requireLowercase'] || keyMap['password_requireLowercase'] || 'true',
      password_policy_requireNumbers: keyMap['password_policy_requireNumbers'] || keyMap['password_requireNumbers'] || 'true',
      password_policy_requireSpecialChars: keyMap['password_policy_requireSpecialChars'] || keyMap['password_requireSpecialChars'] || 'true',
    };
  }

  /**
   * Update password policy (tenant-aware)
   */
  async updatePasswordPolicy(
    passwordPolicy: Record<string, string>,
    userId: string,
    tenantId?: string | null
  ): Promise<number> {
    let updatedCount = 0;

    for (const [key, value] of Object.entries(passwordPolicy)) {
      // Transform frontend keys to database keys (remove password_policy_ prefix if present)
      const dbKey = key.startsWith('password_policy_')
        ? key.replace('password_policy_', 'password_')
        : key;

      await this.updateSetting(dbKey, value, userId, tenantId);
      updatedCount++;
    }

    return updatedCount;
  }

  /**
   * Get JWT configuration (typically global, but can be tenant-aware)
   */
  async getJWTConfig(tenantId?: string | null): Promise<Record<string, string>> {
    const settings = await this.getSettingsWithPrefixForTenant('jwt_', tenantId);
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  /**
   * Update JWT configuration (tenant-aware)
   */
  async updateJWTConfig(
    jwtConfig: Record<string, string>,
    userId: string,
    tenantId?: string | null
  ): Promise<number> {
    return await this.updateSettings(jwtConfig, userId, tenantId);
  }

  /**
   * Get theme settings (tenant-aware with branding fallback)
   */
  async getThemeSettings(tenantId?: string | null): Promise<Record<string, string>> {
    const themeKeys = [
      'theme_primaryColor',
      'theme_secondaryColor',
      'theme_logoPath',
      'theme_faviconPath',
      'app_name',
      'app_subtitle'
    ];

    const keyMap: Record<string, string> = {};
    for (const key of themeKeys) {
      const value = await this.getSettingWithFallback(key, tenantId);
      if (value) keyMap[key] = value;
    }

    // Transform database keys to frontend expected keys with defaults
    return {
      theme_primaryColor: keyMap['theme_primaryColor'] || '#3b82f6',
      theme_secondaryColor: keyMap['theme_secondaryColor'] || '#8b5cf6',
      theme_logoPath: keyMap['theme_logoPath'] || '',
      theme_faviconPath: keyMap['theme_faviconPath'] || '',
      app_name: keyMap['app_name'] || DEFAULT_APP_NAME,
      app_subtitle: keyMap['app_subtitle'] || '',
    };
  }

  /**
   * Update theme settings (tenant-aware)
   */
  async updateThemeSettings(
    themeSettings: Record<string, string>,
    userId: string,
    tenantId?: string | null
  ): Promise<number> {
    return await this.updateSettings(themeSettings, userId, tenantId);
  }

  /**
   * Helper: Get settings with a key prefix for a tenant with fallback
   */
  private async getSettingsWithPrefixForTenant(
    prefix: string,
    tenantId?: string | null
  ): Promise<SystemSettingWithSource[]> {
    // Get global settings with this prefix
    const globalSettings = await this.prisma.systemSetting.findMany({
      where: { key: { startsWith: prefix }, tenantId: null }
    });

    if (!tenantId) {
      return globalSettings.map(s => ({ ...s, isInherited: false }));
    }

    // Get tenant-specific settings with this prefix
    const tenantSettings = await this.prisma.systemSetting.findMany({
      where: { key: { startsWith: prefix }, tenantId }
    });

    // Merge with tenant overrides
    const settingsMap = new Map<string, SystemSettingWithSource>();
    globalSettings.forEach(s => settingsMap.set(s.key, { ...s, isInherited: true }));
    tenantSettings.forEach(s => settingsMap.set(s.key, { ...s, isInherited: false }));

    return Array.from(settingsMap.values());
  }

  /**
   * Get general settings (tenant-aware)
   */
  async getGeneralSettings(tenantId?: string | null): Promise<Record<string, any>> {
    const keys = [
      'app_name', 'app_description', 'footer_contactEmail',
      'allow_registration', 'require_email_verification',
      'notification_email_enabled', 'maintenance_mode',
      'default_language', 'default_timezone',
      'max_file_size', 'session_timeout'
    ];

    const keyMap: Record<string, string> = {};
    for (const key of keys) {
      const value = await this.getSettingWithFallback(key, tenantId);
      if (value) keyMap[key] = value;
    }

    // Transform database keys to frontend expected keys
    return {
      siteName: keyMap['app_name'] || DEFAULT_APP_NAME,
      siteDescription: keyMap['app_description'] || '',
      contactEmail: keyMap['footer_contactEmail'] || '',
      allowRegistration: (keyMap['allow_registration'] || 'true') === 'true',
      requireEmailVerification: (keyMap['require_email_verification'] || 'false') === 'true',
      enableNotifications: (keyMap['notification_email_enabled'] || 'true') === 'true',
      maintenanceMode: (keyMap['maintenance_mode'] || 'false') === 'true',
      defaultLanguage: keyMap['default_language'] || 'en',
      defaultTimezone: keyMap['default_timezone'] || 'UTC',
      maxUploadSize: parseInt(keyMap['max_file_size'] || '10485760') / 1048576, // Convert bytes to MB
      sessionTimeout: parseInt(keyMap['session_timeout'] || '86400') / 3600, // Convert seconds to hours
    };
  }

  /**
   * Get contestant visibility settings (tenant-aware)
   */
  async getContestantVisibilitySettings(tenantId?: string | null): Promise<Record<string, boolean>> {
    const settings = await this.getSettingsWithPrefixForTenant('contestant_visibility_', tenantId);
    const keyMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

    // Transform database keys to frontend expected keys (without prefix, boolean values)
    return {
      canViewWinners: (keyMap['contestant_visibility_canViewWinners'] || 'true') === 'true',
      canViewOverallResults: (keyMap['contestant_visibility_canViewOverallResults'] || 'true') === 'true',
    };
  }

  /**
   * Update contestant visibility settings (tenant-aware)
   */
  async updateContestantVisibilitySettings(
    visibilitySettings: Record<string, string | boolean>,
    userId: string,
    tenantId?: string | null
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
      await this.updateSetting(key, value, userId, tenantId);
      updatedCount++;
    }

    return updatedCount;
  }

  /**
   * Get database connection info (masked for security)
   */
  async getDatabaseConnectionInfo(): Promise<Record<string, string>> {
    try {
      const dbUrl = env.get('DATABASE_URL');
      const info: Record<string, string> = {
        configured: 'true',
        source: 'environment'
      };

      if (dbUrl) {
        try {
          const url = new URL(dbUrl);
          info['host'] = url.hostname || 'N/A';
          info['port'] = url.port || '5432';
          info['database'] = url.pathname.slice(1).split('?')[0] || 'N/A';
          info['user'] = url.username || 'N/A';
          info['password'] = url.password ? '***masked***' : 'Not set';
        } catch {
          // If URL parsing fails, try individual env vars
          info['host'] = env.get('DB_HOST') || env.get('DATABASE_HOST') || 'N/A';
          info['port'] = String(env.get('DB_PORT') || env.get('DATABASE_PORT') || 5432);
          info['database'] = env.get('DB_NAME') || env.get('DATABASE_NAME') || 'N/A';
          info['user'] = env.get('DB_USER') || env.get('DATABASE_USER') || 'N/A';
          info['password'] = (env.get('DB_PASSWORD') || env.get('DATABASE_PASSWORD')) ? '***masked***' : 'Not set';
        }
      } else {
        // Try individual environment variables
        info['host'] = env.get('DB_HOST') || env.get('DATABASE_HOST') || 'Not configured';
        info['port'] = String(env.get('DB_PORT') || env.get('DATABASE_PORT') || 5432);
        info['database'] = env.get('DB_NAME') || env.get('DATABASE_NAME') || 'Not configured';
        info['user'] = env.get('DB_USER') || env.get('DATABASE_USER') || 'Not configured';
        info['password'] = (env.get('DB_PASSWORD') || env.get('DATABASE_PASSWORD')) ? '***masked***' : 'Not configured';
      }

      return info;
    } catch (error) {
      return {
        configured: 'false',
        error: 'Unable to read database configuration'
      };
    }
  }

  private parseBooleanSetting(value: string | null | undefined, fallback: boolean): boolean {
    if (typeof value !== 'string') return fallback;
    return value.toLowerCase() === 'true';
  }

  private parseNumberSetting(value: string | null | undefined, fallback: number, min: number, max: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
  }

  private parseStringArraySetting(value: string | null | undefined): string[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
    } catch {
      // ignore malformed JSON and return fallback split
    }
    return value.split(',').map((v) => v.trim()).filter(Boolean);
  }

  async getSystemHealthAlertSettings(tenantId?: string | null): Promise<SystemHealthAlertSettings> {
    const [
      enabled,
      webhookUrl,
      emailRecipients,
      warnDiskPercent,
      criticalDiskPercent,
      warnMemoryPercent,
      criticalMemoryPercent
    ] = await Promise.all([
      this.getSettingWithFallback('alerts_system_health_enabled', tenantId),
      this.getSettingWithFallback('alerts_system_health_webhook_url', tenantId),
      this.getSettingWithFallback('alerts_system_health_email_recipients', tenantId),
      this.getSettingWithFallback('alerts_system_health_warn_disk_percent', tenantId),
      this.getSettingWithFallback('alerts_system_health_critical_disk_percent', tenantId),
      this.getSettingWithFallback('alerts_system_health_warn_memory_percent', tenantId),
      this.getSettingWithFallback('alerts_system_health_critical_memory_percent', tenantId),
    ]);

    return {
      enabled: this.parseBooleanSetting(enabled, true),
      webhookUrl: webhookUrl || '',
      emailRecipients: this.parseStringArraySetting(emailRecipients),
      warnDiskPercent: this.parseNumberSetting(warnDiskPercent, 80, 1, 99),
      criticalDiskPercent: this.parseNumberSetting(criticalDiskPercent, 90, 1, 99),
      warnMemoryPercent: this.parseNumberSetting(warnMemoryPercent, 85, 1, 99),
      criticalMemoryPercent: this.parseNumberSetting(criticalMemoryPercent, 92, 1, 99),
    };
  }

  async updateSystemHealthAlertSettings(
    settings: Partial<SystemHealthAlertSettings>,
    userId: string,
    tenantId?: string | null
  ): Promise<number> {
    const current = await this.getSystemHealthAlertSettings(tenantId);
    const merged: SystemHealthAlertSettings = {
      ...current,
      ...settings,
      emailRecipients: Array.isArray(settings.emailRecipients) ? settings.emailRecipients : current.emailRecipients
    };

    if (merged.warnDiskPercent >= merged.criticalDiskPercent) {
      throw new Error('Warn disk threshold must be lower than critical disk threshold');
    }
    if (merged.warnMemoryPercent >= merged.criticalMemoryPercent) {
      throw new Error('Warn memory threshold must be lower than critical memory threshold');
    }

    const kv: Array<[string, string]> = [
      ['alerts_system_health_enabled', String(merged.enabled)],
      ['alerts_system_health_webhook_url', merged.webhookUrl || ''],
      ['alerts_system_health_email_recipients', JSON.stringify(merged.emailRecipients || [])],
      ['alerts_system_health_warn_disk_percent', String(merged.warnDiskPercent)],
      ['alerts_system_health_critical_disk_percent', String(merged.criticalDiskPercent)],
      ['alerts_system_health_warn_memory_percent', String(merged.warnMemoryPercent)],
      ['alerts_system_health_critical_memory_percent', String(merged.criticalMemoryPercent)],
    ];

    for (const [key, value] of kv) {
      await this.setSettingForTenant(key, value, tenantId ?? null, ALERT_CATEGORY, 'System health external alert setting', userId);
    }
    return kv.length;
  }

  async getScoringWorkflowAlertSettings(tenantId?: string | null): Promise<ScoringWorkflowAlertSettings> {
    const [
      enabled,
      recipientRolesRaw,
      recipientUserIdsRaw,
      recipientEmailsRaw,
      createdRaw,
      approvedRaw,
      rejectedRaw,
      deductionRequestedRaw,
      deductionApprovedRaw,
      judgeCertifiedRaw,
      categoryCertifiedRaw,
      onlyIfUnviewedRaw,
      escalationMinutesRaw
    ] = await Promise.all([
      this.getSettingWithFallback('alerts_scoring_enabled', tenantId),
      this.getSettingWithFallback('alerts_scoring_recipient_roles', tenantId),
      this.getSettingWithFallback('alerts_scoring_recipient_user_ids', tenantId),
      this.getSettingWithFallback('alerts_scoring_recipient_emails', tenantId),
      this.getSettingWithFallback('alerts_scoring_on_governance_created', tenantId),
      this.getSettingWithFallback('alerts_scoring_on_governance_approved', tenantId),
      this.getSettingWithFallback('alerts_scoring_on_governance_rejected', tenantId),
      this.getSettingWithFallback('alerts_scoring_on_deduction_requested', tenantId),
      this.getSettingWithFallback('alerts_scoring_on_deduction_approved', tenantId),
      this.getSettingWithFallback('alerts_scoring_on_judge_certified', tenantId),
      this.getSettingWithFallback('alerts_scoring_on_category_certified', tenantId),
      this.getSettingWithFallback('alerts_scoring_only_if_unviewed', tenantId),
      this.getSettingWithFallback('alerts_scoring_escalation_minutes', tenantId),
    ]);

    const parsedRoles = this.parseStringArraySetting(recipientRolesRaw).filter((r): r is UserRole =>
      Object.values(UserRole).includes(r as UserRole)
    );

    return {
      enabled: this.parseBooleanSetting(enabled, true),
      recipientRoles: parsedRoles.length > 0 ? parsedRoles : ['AUDITOR', 'BOARD', 'ORGANIZER', 'ADMIN', 'SUPER_ADMIN'],
      recipientUserIds: this.parseStringArraySetting(recipientUserIdsRaw),
      recipientEmails: this.parseStringArraySetting(recipientEmailsRaw),
      notifyOnGovernanceRequestCreated: this.parseBooleanSetting(createdRaw, true),
      notifyOnGovernanceRequestApproved: this.parseBooleanSetting(approvedRaw, true),
      notifyOnGovernanceRequestRejected: this.parseBooleanSetting(rejectedRaw, true),
      notifyOnDeductionRequested: this.parseBooleanSetting(deductionRequestedRaw, true),
      notifyOnDeductionApproved: this.parseBooleanSetting(deductionApprovedRaw, true),
      notifyOnJudgeCertified: this.parseBooleanSetting(judgeCertifiedRaw, true),
      notifyOnCategoryCertified: this.parseBooleanSetting(categoryCertifiedRaw, true),
      onlyIfUnviewed: this.parseBooleanSetting(onlyIfUnviewedRaw, false),
      escalationMinutes: this.parseNumberSetting(escalationMinutesRaw, 60, 5, 10080),
    };
  }

  async updateScoringWorkflowAlertSettings(
    settings: Partial<ScoringWorkflowAlertSettings>,
    userId: string,
    tenantId?: string | null
  ): Promise<number> {
    const current = await this.getScoringWorkflowAlertSettings(tenantId);
    const merged: ScoringWorkflowAlertSettings = {
      ...current,
      ...settings,
      recipientRoles: Array.isArray(settings.recipientRoles) ? settings.recipientRoles : current.recipientRoles,
      recipientUserIds: Array.isArray(settings.recipientUserIds) ? settings.recipientUserIds : current.recipientUserIds,
      recipientEmails: Array.isArray(settings.recipientEmails) ? settings.recipientEmails : current.recipientEmails
    };

    merged.recipientRoles = merged.recipientRoles.filter((r): r is UserRole => Object.values(UserRole).includes(r));

    const kv: Array<[string, string]> = [
      ['alerts_scoring_enabled', String(merged.enabled)],
      ['alerts_scoring_recipient_roles', JSON.stringify(merged.recipientRoles)],
      ['alerts_scoring_recipient_user_ids', JSON.stringify(merged.recipientUserIds || [])],
      ['alerts_scoring_recipient_emails', JSON.stringify(merged.recipientEmails || [])],
      ['alerts_scoring_on_governance_created', String(merged.notifyOnGovernanceRequestCreated)],
      ['alerts_scoring_on_governance_approved', String(merged.notifyOnGovernanceRequestApproved)],
      ['alerts_scoring_on_governance_rejected', String(merged.notifyOnGovernanceRequestRejected)],
      ['alerts_scoring_on_deduction_requested', String(merged.notifyOnDeductionRequested)],
      ['alerts_scoring_on_deduction_approved', String(merged.notifyOnDeductionApproved)],
      ['alerts_scoring_on_judge_certified', String(merged.notifyOnJudgeCertified)],
      ['alerts_scoring_on_category_certified', String(merged.notifyOnCategoryCertified)],
      ['alerts_scoring_only_if_unviewed', String(merged.onlyIfUnviewed)],
      ['alerts_scoring_escalation_minutes', String(merged.escalationMinutes)],
    ];

    for (const [key, value] of kv) {
      await this.setSettingForTenant(key, value, tenantId ?? null, ALERT_CATEGORY, 'Scoring workflow alert setting', userId);
    }
    return kv.length;
  }

  async getScoringWorkflowAlertCandidates(tenantId?: string | null): Promise<AlertCandidateUser[]> {
    if (!tenantId) return [];
    const roles: UserRole[] = ['TALLY_MASTER', 'AUDITOR', 'BOARD', 'ORGANIZER', 'ADMIN', 'SUPER_ADMIN', 'JUDGE', 'EMCEE'];
    return await this.prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        role: { in: roles }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }]
    });
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
