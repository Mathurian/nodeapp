import { injectable, inject } from 'tsyringe';
import { PrismaClient, Prisma, UserRole } from '@prisma/client';
import { BaseService } from './BaseService';
import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import net from 'net';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import axios from 'axios';
import { env } from '../config/env';
import {
  normalizePublicLandingContent,
  parsePublicLandingContentSetting,
  PublicLandingContent,
  PUBLIC_LANDING_CONTENT_SETTING_KEY,
} from '../utils/publicLandingContent';
import {
  DEFAULT_PUBLISHED_RESULTS_VISIBILITY,
  PUBLISHED_RESULTS_VISIBILITY_SETTING_KEYS,
  parseVisibilityRoles,
  serializeVisibilityRoles,
} from '../utils/publishedResultsVisibility';

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
  landingPage: PublicLandingContent;
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
  requireAllTallyCertifiers: boolean;
  requireAllAuditorCertifiers: boolean;
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
const DEFAULT_BACKUP_RUNTIME_ENV_PATH = path.resolve(process.cwd(), 'config/backup.runtime.env');
const BACKUP_RUNTIME_SETTING_MAP: Array<{ settingKey: string; envKey: string }> = [
  { settingKey: 'backup_remote_enabled', envKey: 'REMOTE_BACKUP_ENABLED' },
  { settingKey: 'backup_remote_type', envKey: 'REMOTE_BACKUP_TYPE' },
  { settingKey: 'backup_remote_host', envKey: 'REMOTE_BACKUP_HOST' },
  { settingKey: 'backup_remote_port', envKey: 'REMOTE_BACKUP_PORT' },
  { settingKey: 'backup_remote_user', envKey: 'REMOTE_BACKUP_USER' },
  { settingKey: 'backup_remote_path', envKey: 'REMOTE_BACKUP_PATH' },
  { settingKey: 'backup_rclone_remote', envKey: 'RCLONE_REMOTE' },
  { settingKey: 'backup_rclone_provider', envKey: 'RCLONE_PROVIDER' },
  { settingKey: 'backup_rclone_auth_mode', envKey: 'RCLONE_AUTH_MODE' },
  { settingKey: 'backup_rclone_service_account_json', envKey: 'RCLONE_SERVICE_ACCOUNT_JSON' },
  { settingKey: 'backup_rclone_drive_root_folder_id', envKey: 'RCLONE_DRIVE_ROOT_FOLDER_ID' },
  { settingKey: 'backup_rclone_drive_team_drive', envKey: 'RCLONE_DRIVE_TEAM_DRIVE' },
  { settingKey: 'backup_rclone_gcs_project_number', envKey: 'RCLONE_GCS_PROJECT_NUMBER' },
  { settingKey: 'backup_s3_bucket', envKey: 'S3_BUCKET' },
  { settingKey: 'backup_s3_region', envKey: 'S3_REGION' },
  { settingKey: 'backup_s3_access_key_id', envKey: 'AWS_ACCESS_KEY_ID' },
  { settingKey: 'backup_s3_secret_access_key', envKey: 'AWS_SECRET_ACCESS_KEY' },
  { settingKey: 'backup_retention_days_full_local', envKey: 'RETENTION_DAYS_FULL_LOCAL' },
  { settingKey: 'backup_retention_days_incremental_local', envKey: 'RETENTION_DAYS_INCREMENTAL_LOCAL' },
  { settingKey: 'backup_retention_days_pitr_local', envKey: 'RETENTION_DAYS_PITR_LOCAL' },
  { settingKey: 'backup_min_backups_to_keep_full', envKey: 'MIN_BACKUPS_TO_KEEP_FULL' },
  { settingKey: 'backup_min_backups_to_keep_incremental', envKey: 'MIN_BACKUPS_TO_KEEP_INCREMENTAL' },
  { settingKey: 'backup_min_backups_to_keep_pitr', envKey: 'MIN_BACKUPS_TO_KEEP_PITR' },
  { settingKey: 'backup_log_retention_days', envKey: 'LOG_RETENTION_DAYS' },
];
const execFileAsync = promisify(execFile);
const GOOGLE_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const EMAIL_SETTINGS_KEYS: ReadonlyArray<string> = [
  'email_enabled', 'smtp_enabled',
  'email_smtp_host', 'email_smtpHost', 'smtp_host',
  'email_smtp_port', 'email_smtpPort', 'smtp_port',
  'email_smtp_secure', 'email_smtpSecure', 'email_secure',
  'email_smtp_user', 'email_smtpUser', 'smtp_user',
  'email_smtp_pass', 'email_smtpPassword', 'smtp_password',
  'email_from_address', 'email_fromEmail', 'smtp_from',
  'email_from_name', 'email_fromName',
  'email_reply_to_address', 'email_replyToEmail',
  'email_reply_to_name', 'email_replyToName',
];
const EMAIL_SETTINGS_WRITE_KEY_MAP: Readonly<Record<string, string>> = {
  email_enabled: 'email_enabled',
  email_smtp_host: 'email_smtpHost',
  email_smtp_port: 'email_smtpPort',
  email_smtp_secure: 'email_smtpSecure',
  email_smtp_user: 'email_smtpUser',
  email_smtp_pass: 'email_smtpPassword',
  email_from_address: 'email_fromEmail',
  email_from_name: 'email_fromName',
  email_reply_to_address: 'email_replyToEmail',
  email_reply_to_name: 'email_replyToName',
};
const EMAIL_ADDRESS_SETTING_KEYS = new Set([
  'email_from_address',
  'email_fromEmail',
  'smtp_from',
  'email_reply_to_address',
  'email_replyToEmail',
]);
const EMAIL_SENDER_TEXT_SETTING_KEYS = new Set([
  ...EMAIL_ADDRESS_SETTING_KEYS,
  'email_from_name',
  'email_fromName',
  'email_reply_to_name',
  'email_replyToName',
]);

type GoogleOAuthState = {
  tenantId: string | null;
  userId: string;
  expiresAt: number;
  oauthClientId?: string;
  oauthClientSecret?: string;
  oauthRedirectUri?: string;
};

@injectable()
export class SettingsService extends BaseService {
  private readonly googleOAuthStateStore = new Map<string, GoogleOAuthState>();

  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  private getSettingsEncryptionKey(): Buffer {
    const base = env.get('JWT_SECRET') || env.get('CSRF_SECRET') || 'fallback-settings-key';
    return crypto.createHash('sha256').update(`settings-encryption:${base}`).digest();
  }

  private encryptSensitiveValue(value: string): string {
    if (!value) return value;
    if (value.startsWith('enc:v1:')) return value;
    const iv = crypto.randomBytes(12);
    const key = this.getSettingsEncryptionKey();
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `enc:v1:${Buffer.concat([iv, tag, encrypted]).toString('base64')}`;
  }

  private decryptSensitiveValue(value: string | null | undefined): string {
    const raw = value || '';
    if (!raw.startsWith('enc:v1:')) return raw;
    const payload = Buffer.from(raw.slice('enc:v1:'.length), 'base64');
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const key = this.getSettingsEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }

  private normalizeEmailSettingValue(key: string, value: unknown): string {
    const normalizedValue = String(value ?? '');

    if (EMAIL_SENDER_TEXT_SETTING_KEYS.has(key)) {
      return normalizedValue.trim();
    }

    return normalizedValue;
  }

  private isValidEmailAddress(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private validateEmailAddressSetting(key: string, value: string): void {
    if (!EMAIL_ADDRESS_SETTING_KEYS.has(key) || value === '') {
      return;
    }

    if (!this.isValidEmailAddress(value)) {
      throw this.badRequestError(`${key} must be a valid email address`);
    }
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

  private async normalizeAndValidateEmailSettingsUpdate(
    emailSettings: Record<string, unknown>,
    tenantId?: string | null
  ): Promise<Record<string, string>> {
    const normalizedSettings: Record<string, string> = {};

    for (const [key, value] of Object.entries(emailSettings || {})) {
      const normalizedValue = this.normalizeEmailSettingValue(key, value);
      this.validateEmailAddressSetting(key, normalizedValue);
      normalizedSettings[key] = normalizedValue;
    }

    const touchesReplyTo =
      Object.prototype.hasOwnProperty.call(normalizedSettings, 'email_reply_to_address') ||
      Object.prototype.hasOwnProperty.call(normalizedSettings, 'email_replyToEmail') ||
      Object.prototype.hasOwnProperty.call(normalizedSettings, 'email_reply_to_name') ||
      Object.prototype.hasOwnProperty.call(normalizedSettings, 'email_replyToName');

    if (touchesReplyTo) {
      const currentSettings = await this.getEmailSettings(tenantId);
      const effectiveReplyToAddress =
        normalizedSettings['email_reply_to_address'] ??
        normalizedSettings['email_replyToEmail'] ??
        currentSettings['email_reply_to_address'] ??
        '';
      const effectiveReplyToName =
        normalizedSettings['email_reply_to_name'] ??
        normalizedSettings['email_replyToName'] ??
        currentSettings['email_reply_to_name'] ??
        '';

      if (effectiveReplyToName.trim() && !effectiveReplyToAddress.trim()) {
        throw this.badRequestError('email_reply_to_name requires email_reply_to_address');
      }
    }

    return normalizedSettings;
  }

  private cleanupExpiredGoogleStates(): void {
    const now = Date.now();
    for (const [state, info] of this.googleOAuthStateStore.entries()) {
      if (info.expiresAt <= now) {
        this.googleOAuthStateStore.delete(state);
      }
    }
  }

  private firstNonEmptyValue(...values: Array<string | null | undefined>): string {
    for (const candidate of values) {
      const normalized = String(candidate ?? '').trim();
      if (normalized.length > 0) {
        return normalized;
      }
    }
    return '';
  }

  private normalizeGoogleOAuthClientId(value: string): string {
    let normalized = String(value || '').trim();
    if (!normalized) return '';

    normalized = normalized.replace(/^['"]+|['"]+$/g, '').trim();
    if (!normalized) return '';

    if (/^https?:\/\//i.test(normalized)) {
      try {
        const parsed = new URL(normalized);
        normalized = `${parsed.hostname}${parsed.pathname}`.replace(/\/+$/g, '');
      } catch {
        throw new Error('Invalid Google OAuth client ID format.');
      }
    }

    normalized = normalized.replace(/\/+$/g, '').trim();
    if (!/^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/i.test(normalized)) {
      throw new Error(
        'Invalid Google OAuth client ID format. Use the raw client ID ending with ".apps.googleusercontent.com".'
      );
    }

    return normalized;
  }

  private resolveGoogleOAuthClientId(candidates: Array<string | null | undefined>): string {
    let firstError: string | null = null;
    for (const candidate of candidates) {
      const raw = String(candidate ?? '').trim();
      if (!raw) continue;
      try {
        return this.normalizeGoogleOAuthClientId(raw);
      } catch (error: any) {
        if (!firstError) {
          firstError = error?.message || 'Invalid Google OAuth client ID format.';
        }
      }
    }

    if (firstError) {
      throw new Error(firstError);
    }
    return '';
  }

  private normalizeGoogleOAuthRedirectUri(value: string): string {
    const normalized = String(value || '').trim();
    if (!normalized) return '';

    let parsed: URL;
    try {
      parsed = new URL(normalized);
    } catch {
      throw new Error('Invalid OAuth redirect URI. Set backup_google_oauth_redirect_uri in backup settings.');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Invalid OAuth redirect URI. Set backup_google_oauth_redirect_uri in backup settings.');
    }

    return normalized;
  }

  private async getGlobalBackupOAuthSettings(): Promise<Record<string, string>> {
    const rows = await this.prisma.systemSetting.findMany({
      where: {
        tenantId: null,
        key: {
          in: [
            'backup_google_oauth_client_id',
            'backup_google_oauth_client_secret',
            'backup_google_oauth_redirect_uri',
          ],
        },
      },
      select: {
        key: true,
        value: true,
      },
    });

    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    if (settings['backup_google_oauth_client_secret']) {
      settings['backup_google_oauth_client_secret'] = this.decryptSensitiveValue(
        settings['backup_google_oauth_client_secret']
      );
    }

    return settings;
  }

  private getBackupRuntimeEnvPath(): string {
    return process.env['BACKUP_RUNTIME_ENV_PATH'] || DEFAULT_BACKUP_RUNTIME_ENV_PATH;
  }

  private formatEnvValue(rawValue: string): string {
    const value = String(rawValue ?? '').trim();
    if (value === '') return '""';
    if (/^[A-Za-z0-9._/:@+-]+$/.test(value)) return value;
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
  }

  async syncGlobalBackupRuntimeEnv(): Promise<string> {
    const settings = await this.prisma.systemSetting.findMany({
      where: { category: 'backup', tenantId: null },
      select: { key: true, value: true }
    });

    const values = new Map<string, string>(settings.map((item) => [item.key, item.value]));
    const nowIso = new Date().toISOString();
    const lines: string[] = [
      '# Auto-generated from Super Admin backup settings.',
      '# Do not edit manually; use Settings -> Backup & Off-site Replication.',
      `# Generated at ${nowIso}`,
      '',
    ];

    for (const item of BACKUP_RUNTIME_SETTING_MAP) {
      const raw = values.get(item.settingKey);
      if (!raw || raw.trim() === '') continue;
      lines.push(`${item.envKey}=${this.formatEnvValue(raw)}`);
    }

    const runtimeEnvPath = this.getBackupRuntimeEnvPath();
    await fs.mkdir(path.dirname(runtimeEnvPath), { recursive: true });
    await fs.writeFile(runtimeEnvPath, `${lines.join('\n')}\n`, { encoding: 'utf-8', mode: 0o600 });
    await fs.chmod(runtimeEnvPath, 0o600);
    return runtimeEnvPath;
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
      landingPage: await this.getPublicLandingContent(tenantId),
    };
  }

  async getPublicLandingContent(tenantId?: string | null): Promise<PublicLandingContent> {
    const raw = await this.getSettingWithFallback(PUBLIC_LANDING_CONTENT_SETTING_KEY, tenantId);
    return parsePublicLandingContentSetting(raw);
  }

  async updatePublicLandingContent(
    content: unknown,
    userId: string,
    tenantId?: string | null
  ): Promise<PublicLandingContent> {
    const normalized = normalizePublicLandingContent(content);

    await this.setSettingForTenant(
      PUBLIC_LANDING_CONTENT_SETTING_KEY,
      JSON.stringify(normalized),
      tenantId ?? null,
      'branding',
      'Structured public landing page content',
      userId
    );

    return normalized;
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
    securityEmail: 'security_email',
    allowRegistration: 'allow_registration',
    requireEmailVerification: 'require_email_verification',
    welcomeEmailEnabled: 'welcome_email_enabled',
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
    const result = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    const sensitiveKeys = [
      'backup_s3_secret_access_key',
      'backup_google_oauth_client_secret',
      'backup_google_drive_oauth_tokens',
      'backup_rclone_service_account_json',
    ];
    for (const key of sensitiveKeys) {
      if (result[key]) {
        result[key] = this.decryptSensitiveValue(result[key]);
      }
    }
    return result;
  }

  /**
   * Update backup settings (tenant-aware)
   */
  async updateBackupSettings(
    backupSettings: Record<string, string>,
    userId: string,
    tenantId?: string | null
  ): Promise<number> {
    const next: Record<string, string> = { ...backupSettings };
    if ('backup_google_oauth_client_id' in next) {
      const normalizedClientId = this.normalizeGoogleOAuthClientId(String(next['backup_google_oauth_client_id'] ?? ''));
      next['backup_google_oauth_client_id'] = normalizedClientId;
    }
    if ('backup_google_oauth_redirect_uri' in next) {
      const normalizedRedirect = this.normalizeGoogleOAuthRedirectUri(String(next['backup_google_oauth_redirect_uri'] ?? ''));
      next['backup_google_oauth_redirect_uri'] = normalizedRedirect;
    }

    const sensitiveKeys = [
      'backup_s3_secret_access_key',
      'backup_google_oauth_client_secret',
      'backup_google_drive_oauth_tokens',
      'backup_rclone_service_account_json',
    ];

    for (const key of sensitiveKeys) {
      if (!(key in next)) continue;
      const value = String(next[key] ?? '');
      if (value.trim() === '') {
        next[key] = '';
      } else {
        next[key] = this.encryptSensitiveValue(value);
      }
    }

    return await this.updateSettings(next, userId, tenantId);
  }

  async testBackupConnection(
    tenantId?: string | null,
    overrideSettings?: Record<string, string>
  ): Promise<{ success: boolean; message: string; details?: string }> {
    const stored = await this.getBackupSettings(tenantId);
    const merged = { ...stored, ...(overrideSettings || {}) };
    const enabled = String(merged['backup_remote_enabled'] || 'false') === 'true';
    if (!enabled) {
      return { success: false, message: 'Off-site replication is disabled', details: 'Enable off-site replication before testing connection.' };
    }

    const remoteType = String(merged['backup_remote_type'] || 'rsync').trim().toLowerCase();

    if (remoteType === 'rsync' || remoteType === 'sftp') {
      const host = String(merged['backup_remote_host'] || '').trim();
      const port = Number(merged['backup_remote_port'] || '22');
      if (!host) {
        return { success: false, message: 'Remote host is required', details: 'Set Remote Host for SSH-based replication.' };
      }

      const socket = new net.Socket();
      const timeoutMs = 5000;
      return await new Promise((resolve) => {
        let settled = false;
        const finalize = (payload: { success: boolean; message: string; details?: string }) => {
          if (settled) return;
          settled = true;
          socket.destroy();
          resolve(payload);
        };

        socket.setTimeout(timeoutMs);
        socket.once('connect', () => finalize({ success: true, message: 'Remote SSH endpoint reachable', details: `${host}:${port}` }));
        socket.once('timeout', () => finalize({ success: false, message: 'Connection timeout', details: `Timed out connecting to ${host}:${port}` }));
        socket.once('error', (err: Error) => finalize({ success: false, message: 'Connection failed', details: err.message }));
        socket.connect(port, host);
      });
    }

    if (remoteType === 's3') {
      const bucket = String(merged['backup_s3_bucket'] || '').trim();
      const region = String(merged['backup_s3_region'] || 'us-east-1').trim();
      const accessKeyId = String(merged['backup_s3_access_key_id'] || '').trim();
      const secretAccessKey = String(merged['backup_s3_secret_access_key'] || '').trim();
      if (!bucket || !accessKeyId || !secretAccessKey) {
        return { success: false, message: 'Incomplete S3 settings', details: 'Bucket, access key, and secret key are required.' };
      }

      try {
        const client = new S3Client({
          region,
          credentials: { accessKeyId, secretAccessKey }
        });
        await client.send(new HeadBucketCommand({ Bucket: bucket }));
        return { success: true, message: 'S3 connection successful', details: `Bucket ${bucket} reachable in ${region}` };
      } catch (error: any) {
        return { success: false, message: 'S3 connection failed', details: error?.message || 'Unable to reach bucket' };
      }
    }

    if (remoteType === 'rclone') {
      const provider = String(merged['backup_rclone_provider'] || 'generic').trim().toLowerCase();
      const authMode = String(merged['backup_rclone_auth_mode'] || 'existing_remote').trim().toLowerCase();

      if (provider === 'google_drive' && authMode === 'oauth_connect') {
        const encryptedTokenPayload = String(merged['backup_google_drive_oauth_tokens'] || '').trim();
        const clientId = String(merged['backup_google_oauth_client_id'] || '').trim();
        const clientSecret = String(merged['backup_google_oauth_client_secret'] || '').trim();
        if (!encryptedTokenPayload || !clientId || !clientSecret) {
          return {
            success: false,
            message: 'Google Drive OAuth is not connected',
            details: 'Provide OAuth client settings and connect your Google account first.',
          };
        }
        try {
          const tokenPayload = JSON.parse(this.decryptSensitiveValue(encryptedTokenPayload));
          const refreshToken = String(tokenPayload?.refresh_token || '').trim();
          if (!refreshToken) {
            return { success: false, message: 'Missing refresh token', details: 'Reconnect Google Drive to obtain offline access.' };
          }
          const tokenResponse = await axios.post(
            'https://oauth2.googleapis.com/token',
            new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: refreshToken,
              grant_type: 'refresh_token',
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 }
          );
          const accessToken = String(tokenResponse.data?.access_token || '');
          if (!accessToken) {
            return { success: false, message: 'Failed to refresh Google token', details: 'Token response did not include access token.' };
          }
          const about = await axios.get('https://www.googleapis.com/drive/v3/about?fields=user', {
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: 10000,
          });
          const email = String(about.data?.user?.emailAddress || tokenPayload?.email || '');
          const remote = String(merged['backup_rclone_remote'] || '').trim();
          const remoteHint = remote
            ? `Remote target configured: ${remote}`
            : 'OAuth is connected. Set rclone target (e.g. gdrive:backups) to complete remote backup config.';
          return { success: true, message: 'Google Drive OAuth connection successful', details: `${email || 'Connected account verified'}. ${remoteHint}` };
        } catch (error: any) {
          return { success: false, message: 'Google Drive OAuth test failed', details: error?.response?.data?.error_description || error?.message || 'Unable to validate OAuth token' };
        }
      }

      const remote = String(merged['backup_rclone_remote'] || '').trim();
      if (!remote) {
        return { success: false, message: 'rclone target is required', details: 'Set rclone target in format remote:bucket/path.' };
      }
      const remoteName = remote.includes(':') ? remote.split(':')[0]?.trim() : '';
      if (!remoteName) {
        return { success: false, message: 'Invalid rclone target', details: 'Target must include a remote prefix, e.g. remote:path.' };
      }

      let tempDir: string | null = null;
      try {
        const args = ['lsd', remote, '--max-depth', '1'];

        if (authMode === 'service_account' && (provider === 'google_drive' || provider === 'google_cloud_storage')) {
          const rawServiceAccount = String(merged['backup_rclone_service_account_json'] || '').trim();
          const serviceAccountJson = this.decryptSensitiveValue(rawServiceAccount).trim();
          if (!serviceAccountJson) {
            return {
              success: false,
              message: 'Service account JSON is required',
              details: 'Provide Google service account JSON when auth mode is Service Account.',
            };
          }

          let parsedJson: unknown;
          try {
            parsedJson = JSON.parse(serviceAccountJson);
          } catch {
            return { success: false, message: 'Invalid service account JSON', details: 'JSON could not be parsed.' };
          }

          tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rclone-auth-'));
          const serviceAccountPath = path.join(tempDir, 'service-account.json');
          await fs.writeFile(serviceAccountPath, JSON.stringify(parsedJson), { encoding: 'utf-8', mode: 0o600 });
          await fs.chmod(serviceAccountPath, 0o600);

          const configPath = path.join(tempDir, 'rclone.conf');
          const configLines: string[] = [`[${remoteName}]`];

          if (provider === 'google_drive') {
            configLines.push('type = drive');
            configLines.push('scope = drive');
            configLines.push(`service_account_file = ${serviceAccountPath}`);
            const rootFolderId = String(merged['backup_rclone_drive_root_folder_id'] || '').trim();
            const teamDrive = String(merged['backup_rclone_drive_team_drive'] || '').trim();
            if (rootFolderId) configLines.push(`root_folder_id = ${rootFolderId}`);
            if (teamDrive) configLines.push(`team_drive = ${teamDrive}`);
          } else {
            configLines.push('type = google cloud storage');
            configLines.push(`service_account_file = ${serviceAccountPath}`);
            const projectNumber = String(merged['backup_rclone_gcs_project_number'] || '').trim();
            if (projectNumber) configLines.push(`project_number = ${projectNumber}`);
          }

          await fs.writeFile(configPath, `${configLines.join('\n')}\n`, { encoding: 'utf-8', mode: 0o600 });
          await fs.chmod(configPath, 0o600);
          args.push('--config', configPath);
        } else if (authMode === 'service_account' && provider === 'generic') {
          return {
            success: false,
            message: 'Service account mode requires Google provider selection',
            details: 'Choose Google Drive or Google Cloud Storage when using service account auth.',
          };
        }

        await execFileAsync('rclone', args, { timeout: 10000 });
        const authLabel = authMode === 'service_account' ? 'service account' : 'host remote';
        return { success: true, message: 'rclone target is reachable', details: `${remote} (${authLabel})` };
      } catch (error: any) {
        return { success: false, message: 'rclone connection failed', details: error?.message || 'Unable to validate rclone target' };
      } finally {
        if (tempDir) {
          await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
        }
      }
    }

    return { success: false, message: 'Unsupported remote type', details: `Unsupported type: ${remoteType}` };
  }

  async getGoogleDriveOAuthStatus(tenantId?: string | null): Promise<{
    connected: boolean;
    email?: string;
    connectedAt?: string;
  }> {
    const settings = await this.getBackupSettings(tenantId);
    const hasToken = Boolean(settings['backup_google_drive_oauth_tokens']);
    return {
      connected: hasToken,
      email: settings['backup_google_drive_oauth_connected_email'] || undefined,
      connectedAt: settings['backup_google_drive_oauth_connected_at'] || undefined,
    };
  }

  async startGoogleDriveOAuth(
    userId: string,
    tenantId: string | null,
    origin?: string,
    options?: {
      clientId?: string;
      clientSecret?: string;
      redirectUri?: string;
    }
  ): Promise<{ authUrl: string; state: string }> {
    this.cleanupExpiredGoogleStates();
    const settings = await this.getBackupSettings(tenantId);
    const globalFallback = tenantId ? await this.getGlobalBackupOAuthSettings() : {};

    const clientId = this.resolveGoogleOAuthClientId([
      options?.clientId,
      settings['backup_google_oauth_client_id'],
      globalFallback['backup_google_oauth_client_id'],
    ]);
    const clientSecret = this.firstNonEmptyValue(
      options?.clientSecret,
      settings['backup_google_oauth_client_secret'],
      globalFallback['backup_google_oauth_client_secret']
    );
    const configuredRedirect = this.firstNonEmptyValue(
      options?.redirectUri,
      settings['backup_google_oauth_redirect_uri'],
      globalFallback['backup_google_oauth_redirect_uri']
    );

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth client ID and secret are required before connecting.');
    }
    const defaultRedirectUri = `${(origin || '').replace(/\/$/, '')}/api/settings/backup/google-drive/oauth/callback`;
    const redirectUri = this.normalizeGoogleOAuthRedirectUri(configuredRedirect || defaultRedirectUri);

    const state = crypto.randomBytes(24).toString('hex');
    this.googleOAuthStateStore.set(state, {
      tenantId,
      userId,
      expiresAt: Date.now() + GOOGLE_OAUTH_STATE_TTL_MS,
      oauthClientId: clientId,
      oauthClientSecret: clientSecret,
      oauthRedirectUri: redirectUri,
    });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      scope: 'openid email profile https://www.googleapis.com/auth/drive',
      state,
    });
    return { authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, state };
  }

  async completeGoogleDriveOAuthCallback(
    code: string,
    state: string,
    origin?: string
  ): Promise<{ email?: string }> {
    this.cleanupExpiredGoogleStates();
    const stateInfo = this.googleOAuthStateStore.get(state);
    if (!stateInfo || stateInfo.expiresAt < Date.now()) {
      throw new Error('OAuth state is invalid or expired.');
    }
    this.googleOAuthStateStore.delete(state);

    const settings = await this.getBackupSettings(stateInfo.tenantId);
    const globalFallback = stateInfo.tenantId ? await this.getGlobalBackupOAuthSettings() : {};
    const clientId = this.resolveGoogleOAuthClientId([
      stateInfo.oauthClientId,
      settings['backup_google_oauth_client_id'],
      globalFallback['backup_google_oauth_client_id'],
    ]);
    const clientSecret = this.firstNonEmptyValue(
      stateInfo.oauthClientSecret,
      settings['backup_google_oauth_client_secret'],
      globalFallback['backup_google_oauth_client_secret']
    );
    const configuredRedirect = this.firstNonEmptyValue(
      stateInfo.oauthRedirectUri,
      settings['backup_google_oauth_redirect_uri'],
      globalFallback['backup_google_oauth_redirect_uri']
    );
    const defaultRedirectUri = `${(origin || '').replace(/\/$/, '')}/api/settings/backup/google-drive/oauth/callback`;
    const redirectUri = this.normalizeGoogleOAuthRedirectUri(configuredRedirect || defaultRedirectUri);
    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth client configuration missing.');
    }

    const tokenRes = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
    );

    const refreshToken = String(tokenRes.data?.refresh_token || '').trim();
    const accessToken = String(tokenRes.data?.access_token || '').trim();
    const idToken = String(tokenRes.data?.id_token || '').trim();
    if (!refreshToken && !accessToken) {
      throw new Error('Google token exchange failed.');
    }
    let existingRefreshToken = '';
    try {
      const existingTokenPayloadRaw = String(settings['backup_google_drive_oauth_tokens'] || '').trim();
      if (existingTokenPayloadRaw) {
        const existingTokenPayload = JSON.parse(existingTokenPayloadRaw) as Record<string, unknown>;
        existingRefreshToken = String(existingTokenPayload['refresh_token'] || '').trim();
      }
    } catch {
      existingRefreshToken = '';
    }

    const effectiveRefreshToken = refreshToken || existingRefreshToken;
    if (!effectiveRefreshToken) {
      throw new Error('Google token exchange did not return a refresh token. Reconnect Google Drive with consent.');
    }

    let email = '';
    if (idToken) {
      try {
        const payloadSegment = idToken.split('.')[1] || '';
        const decoded = JSON.parse(Buffer.from(payloadSegment, 'base64url').toString('utf8'));
        email = String(decoded?.email || '');
      } catch {
        // no-op
      }
    }

    const expiresIn = Number(tokenRes.data?.expires_in || 3600);
    const expiry = new Date(Date.now() + Math.max(expiresIn, 60) * 1000).toISOString();

    const tokenPayload = {
      refresh_token: effectiveRefreshToken,
      access_token: accessToken,
      token_type: tokenRes.data?.token_type || 'Bearer',
      expiry,
      scope: tokenRes.data?.scope,
      expires_in: expiresIn,
      updated_at: new Date().toISOString(),
      email,
    };

    await this.updateBackupSettings(
      {
        backup_google_drive_oauth_tokens: JSON.stringify(tokenPayload),
        backup_google_drive_oauth_connected_email: email || '',
        backup_google_drive_oauth_connected_at: new Date().toISOString(),
        backup_remote_type: 'rclone',
        backup_rclone_provider: 'google_drive',
        backup_rclone_auth_mode: 'oauth_connect',
      },
      stateInfo.userId,
      stateInfo.tenantId
    );

    return { email: email || undefined };
  }

  async disconnectGoogleDriveOAuth(userId: string, tenantId?: string | null): Promise<void> {
    await this.updateBackupSettings(
      {
        backup_google_drive_oauth_tokens: '',
        backup_google_drive_oauth_connected_email: '',
        backup_google_drive_oauth_connected_at: '',
      },
      userId,
      tenantId
    );
  }

  async setGcsServiceAccountFromUpload(
    userId: string,
    tenantId: string | null,
    serviceAccountJson: string,
    projectNumber?: string
  ): Promise<void> {
    const parsed = JSON.parse(serviceAccountJson);
    const clientEmail = String(parsed?.client_email || '');
    const privateKey = String(parsed?.private_key || '');
    const projectId = String(parsed?.project_id || '');
    if (!clientEmail || !privateKey || !projectId) {
      throw new Error('Invalid Google service account JSON. Missing client_email, private_key, or project_id.');
    }
    await this.updateBackupSettings(
      {
        backup_remote_type: 'rclone',
        backup_rclone_provider: 'google_cloud_storage',
        backup_rclone_auth_mode: 'service_account',
        backup_rclone_service_account_json: JSON.stringify(parsed),
        backup_rclone_gcs_project_number: String(projectNumber || ''),
      },
      userId,
      tenantId
    );
  }

  /**
   * Get email settings (tenant-aware - tenants can override with their own SMTP)
   */
  async getEmailSettings(tenantId?: string | null): Promise<Record<string, string>> {
    const keyMap: Record<string, string> = {};
    for (const key of EMAIL_SETTINGS_KEYS) {
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
      email_reply_to_address: keyMap['email_reply_to_address'] || keyMap['email_replyToEmail'] || '',
      email_reply_to_name: keyMap['email_reply_to_name'] || keyMap['email_replyToName'] || '',
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
    const normalizedSettings = await this.normalizeAndValidateEmailSettingsUpdate(
      emailSettings,
      tenantId
    );

    for (const [key, value] of Object.entries(normalizedSettings)) {
      const dbKey = EMAIL_SETTINGS_WRITE_KEY_MAP[key] || key;
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
    const normalizedTestEmail = String(testEmail || '').trim();
    const fromAddress = this.normalizeEmailSettingValue(
      'email_from_address',
      emailSettings['email_from_address'] || emailSettings['email_from'] || ''
    );
    const fromName = this.normalizeEmailSettingValue(
      'email_from_name',
      emailSettings['email_from_name'] || ''
    );
    const replyToAddress = this.normalizeEmailSettingValue(
      'email_reply_to_address',
      emailSettings['email_reply_to_address'] || ''
    );
    const replyToName = this.normalizeEmailSettingValue(
      'email_reply_to_name',
      emailSettings['email_reply_to_name'] || ''
    );

    if (!this.isValidEmailAddress(normalizedTestEmail)) {
      throw this.badRequestError('testEmail must be a valid email address');
    }
    this.validateEmailAddressSetting('email_from_address', fromAddress);
    this.validateEmailAddressSetting('email_reply_to_address', replyToAddress);
    if (replyToName && !replyToAddress) {
      throw this.badRequestError('email_reply_to_name requires email_reply_to_address');
    }

    const transporter = nodemailer.createTransport({
      host: emailSettings['email_smtp_host'] || emailSettings['smtp_host'],
      port: parseInt(emailSettings['email_smtp_port'] || emailSettings['smtp_port'] || '587'),
      secure: (emailSettings['email_smtp_secure'] || emailSettings['smtp_secure']) === 'true',
      auth: {
        user: emailSettings['email_smtp_user'] || emailSettings['smtp_user'],
        pass: emailSettings['email_smtp_pass'] || emailSettings['smtp_password'],
      },
    });

    const mailOptions = {
      from: this.formatAddressHeader(fromAddress || 'noreply@example.com', fromName),
      to: normalizedTestEmail,
      subject: `Test Email from ${DEFAULT_APP_NAME}`,
      text: 'This is a test email to verify your SMTP settings are working correctly.',
    };
    const replyTo = this.formatAddressHeader(replyToAddress, replyToName);
    if (replyTo) {
      Object.assign(mailOptions, { replyTo });
    }

    await transporter.sendMail(mailOptions);

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
      'security_email',
      'allow_registration', 'require_email_verification', 'welcome_email_enabled',
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
      securityEmail: keyMap['security_email'] || env.get('SECURITY_EMAIL') || keyMap['footer_contactEmail'] || '',
      allowRegistration: (keyMap['allow_registration'] || 'true') === 'true',
      requireEmailVerification: (keyMap['require_email_verification'] || 'false') === 'true',
      welcomeEmailEnabled: (keyMap['welcome_email_enabled'] || 'false') === 'true',
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
      canViewMinimumWinningScore: (keyMap['contestant_visibility_canViewMinimumWinningScore'] || 'false') === 'true',
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
      } else if (key === 'canViewMinimumWinningScore') {
        transformedSettings['contestant_visibility_canViewMinimumWinningScore'] = stringValue;
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
   * Get published results visibility settings (tenant-aware)
   */
  async getPublishedResultsVisibilitySettings(tenantId?: string | null): Promise<Record<string, string[]>> {
    const settings = await Promise.all([
      this.getSettingWithFallback(PUBLISHED_RESULTS_VISIBILITY_SETTING_KEYS.detailedResultsRoles, tenantId),
      this.getSettingWithFallback(PUBLISHED_RESULTS_VISIBILITY_SETTING_KEYS.winnersRoles, tenantId),
      this.getSettingWithFallback(PUBLISHED_RESULTS_VISIBILITY_SETTING_KEYS.progressRoles, tenantId),
    ]);

    return {
      detailedResultsRoles: parseVisibilityRoles(
        settings[0],
        DEFAULT_PUBLISHED_RESULTS_VISIBILITY.detailedResultsRoles
      ),
      winnersRoles: parseVisibilityRoles(
        settings[1],
        DEFAULT_PUBLISHED_RESULTS_VISIBILITY.winnersRoles
      ),
      progressRoles: parseVisibilityRoles(
        settings[2],
        DEFAULT_PUBLISHED_RESULTS_VISIBILITY.progressRoles
      ),
    };
  }

  /**
   * Update published results visibility settings (tenant-aware)
   */
  async updatePublishedResultsVisibilitySettings(
    visibilitySettings: Partial<Record<'detailedResultsRoles' | 'winnersRoles' | 'progressRoles', Array<string>>>,
    userId: string,
    tenantId?: string | null
  ): Promise<number> {
    const updates: Array<[string, string]> = [];

    if (Array.isArray(visibilitySettings.detailedResultsRoles)) {
      updates.push([
        PUBLISHED_RESULTS_VISIBILITY_SETTING_KEYS.detailedResultsRoles,
        serializeVisibilityRoles(visibilitySettings.detailedResultsRoles),
      ]);
    }

    if (Array.isArray(visibilitySettings.winnersRoles)) {
      updates.push([
        PUBLISHED_RESULTS_VISIBILITY_SETTING_KEYS.winnersRoles,
        serializeVisibilityRoles(visibilitySettings.winnersRoles),
      ]);
    }

    if (Array.isArray(visibilitySettings.progressRoles)) {
      updates.push([
        PUBLISHED_RESULTS_VISIBILITY_SETTING_KEYS.progressRoles,
        serializeVisibilityRoles(visibilitySettings.progressRoles),
      ]);
    }

    for (const [key, value] of updates) {
      await this.updateSetting(key, value, userId, tenantId);
    }

    return updates.length;
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
      escalationMinutesRaw,
      requireAllTallyRaw,
      requireAllAuditorRaw
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
      this.getSettingWithFallback('certification_require_all_tally_masters', tenantId),
      this.getSettingWithFallback('certification_require_all_auditors', tenantId),
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
      requireAllTallyCertifiers: this.parseBooleanSetting(requireAllTallyRaw, true),
      requireAllAuditorCertifiers: this.parseBooleanSetting(requireAllAuditorRaw, true),
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
      ['certification_require_all_tally_masters', String(merged.requireAllTallyCertifiers)],
      ['certification_require_all_auditors', String(merged.requireAllAuditorCertifiers)],
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
