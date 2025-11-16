import { PrismaClient } from '@prisma/client';
import { BaseService } from './BaseService';
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
export declare class SettingsService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getAllSettings(): Promise<any[]>;
    getSettingsByCategory(category: string): Promise<any[]>;
    getAppName(): Promise<AppNameSettings>;
    getPublicSettings(): Promise<PublicSettings>;
    updateSettings(settings: Record<string, string>, userId: string): Promise<number>;
    updateSetting(key: string, value: string, userId: string): Promise<any>;
    getLoggingLevels(): Promise<Record<string, string>>;
    updateLoggingLevel(level: string, userId: string): Promise<any>;
    getSecuritySettings(): Promise<Record<string, string>>;
    updateSecuritySettings(securitySettings: Record<string, string>, userId: string): Promise<number>;
    getBackupSettings(): Promise<Record<string, string>>;
    updateBackupSettings(backupSettings: Record<string, string>, userId: string): Promise<number>;
    getEmailSettings(): Promise<Record<string, string>>;
    updateEmailSettings(emailSettings: Record<string, string>, userId: string): Promise<number>;
    testEmailSettings(testEmail: string): Promise<boolean>;
    getPasswordPolicy(): Promise<Record<string, string>>;
    updatePasswordPolicy(passwordPolicy: Record<string, string>, userId: string): Promise<number>;
    getJWTConfig(): Promise<Record<string, string>>;
    updateJWTConfig(jwtConfig: Record<string, string>, userId: string): Promise<number>;
    getThemeSettings(): Promise<Record<string, string>>;
    updateThemeSettings(themeSettings: Record<string, string>, userId: string): Promise<number>;
    getContestantVisibilitySettings(): Promise<Record<string, string>>;
    updateContestantVisibilitySettings(visibilitySettings: Record<string, string | boolean>, userId: string): Promise<number>;
    getDatabaseConnectionInfo(): Promise<Record<string, string>>;
    private determineCategoryFromKey;
}
//# sourceMappingURL=SettingsService.d.ts.map