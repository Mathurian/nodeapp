import { injectable, inject } from 'tsyringe';
import { PrismaClient, Prisma } from '@prisma/client';
import { BaseService } from './BaseService';
import nodemailer from 'nodemailer';
import { env } from '../config/env';

// Prisma payload types
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

// Extended setting type with source information
export interface SystemSettingWithSource extends SystemSettingFull {
  isInherited?: boolean;  // true if this is a global setting being used as fallback
}

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

    // Handle null tenantId for compound unique constraint
    const whereClause = tenantId
      ? { key_tenantId: { key, tenantId } }
      : { key_tenantId: { key, tenantId: null as unknown as string } };

    return await this.prisma.systemSetting.upsert({
      where: whereClause,
      update: {
        value: stringValue,
        category: categoryValue,
        description,
        updatedBy: userId
      },
      create: {
        key,
        value: stringValue,
        tenantId: tenantId || null,
        category: categoryValue,
        description: description || `Setting for ${key}`,
        updatedBy: userId
      }
    });
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
      appName: appName || 'Event Manager',
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
      appName: map['app_name'] || 'Event Manager',
      appSubtitle: map['app_subtitle'] || '',
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
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  /**
   * Update security settings (tenant-aware)
   */
  async updateSecuritySettings(
    securitySettings: Record<string, string>,
    userId: string,
    tenantId?: string | null
  ): Promise<number> {
    return await this.updateSettings(securitySettings, userId, tenantId);
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
      email_from_name: keyMap['email_from_name'] || keyMap['email_fromName'] || 'Event Manager',
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
      subject: 'Test Email from Event Manager',
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
      app_name: keyMap['app_name'] || 'Event Manager',
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
      siteName: keyMap['app_name'] || 'Event Manager',
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
          // Note: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD not in env.ts yet (extracted from DATABASE_URL)
          // TODO: Add these to env.ts configuration or extract from DATABASE_URL
          info['host'] = process.env['DB_HOST'] || process.env['DATABASE_HOST'] || 'N/A';
          info['port'] = process.env['DB_PORT'] || process.env['DATABASE_PORT'] || '5432';
          info['database'] = process.env['DB_NAME'] || process.env['DATABASE_NAME'] || 'N/A';
          info['user'] = process.env['DB_USER'] || process.env['DATABASE_USER'] || 'N/A';
          info['password'] = (process.env['DB_PASSWORD'] || process.env['DATABASE_PASSWORD']) ? '***masked***' : 'Not set';
        }
      } else {
        // Try individual environment variables
        // Note: DB_HOST, DB_PORT, DB_NAME, DB_USER not in env.ts yet
        // TODO: Add these to env.ts configuration or extract from DATABASE_URL
        info['host'] = process.env['DB_HOST'] || process.env['DATABASE_HOST'] || 'Not configured';
        info['port'] = process.env['DB_PORT'] || process.env['DATABASE_PORT'] || '5432';
        info['database'] = process.env['DB_NAME'] || process.env['DATABASE_NAME'] || 'Not configured';
        info['user'] = process.env['DB_USER'] || process.env['DATABASE_USER'] || 'Not configured';
        info['password'] = (process.env['DB_PASSWORD'] || process.env['DATABASE_PASSWORD']) ? '***masked***' : 'Not configured';
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
