"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const tsyringe_1 = require("tsyringe");
const client_1 = require("@prisma/client");
const BaseService_1 = require("./BaseService");
const nodemailer_1 = __importDefault(require("nodemailer"));
let SettingsService = class SettingsService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async getAllSettings() {
        return await this.prisma.systemSetting.findMany();
    }
    async getSettingsByCategory(category) {
        return await this.prisma.systemSetting.findMany({
            where: { category },
        });
    }
    async getAppName() {
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
    async getPublicSettings() {
        const keys = [
            'app_name',
            'app_subtitle',
            'show_forgot_password',
            'theme_logoPath',
            'theme_faviconPath',
            'footer_contactEmail',
        ];
        const settings = await this.prisma.systemSetting.findMany({
            where: { key: { in: keys } },
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
    async updateSettings(settings, userId) {
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
    async updateSetting(key, value, userId) {
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
    async getLoggingLevels() {
        const settings = await this.prisma.systemSetting.findMany({
            where: { key: { startsWith: 'logging_' } },
        });
        return Object.fromEntries(settings.map((s) => [s.key, s.value]));
    }
    async updateLoggingLevel(level, userId) {
        return await this.updateSetting('logging_level', level, userId);
    }
    async getSecuritySettings() {
        const settings = await this.prisma.systemSetting.findMany({
            where: { category: 'security' },
        });
        return Object.fromEntries(settings.map((s) => [s.key, s.value]));
    }
    async updateSecuritySettings(securitySettings, userId) {
        let updatedCount = 0;
        for (const [key, value] of Object.entries(securitySettings)) {
            await this.updateSetting(key, value, userId);
            updatedCount++;
        }
        return updatedCount;
    }
    async getBackupSettings() {
        const settings = await this.prisma.systemSetting.findMany({
            where: { category: 'backup' },
        });
        return Object.fromEntries(settings.map((s) => [s.key, s.value]));
    }
    async updateBackupSettings(backupSettings, userId) {
        let updatedCount = 0;
        for (const [key, value] of Object.entries(backupSettings)) {
            await this.updateSetting(key, value, userId);
            updatedCount++;
        }
        return updatedCount;
    }
    async getEmailSettings() {
        const settings = await this.prisma.systemSetting.findMany({
            where: { category: 'email' },
        });
        return Object.fromEntries(settings.map((s) => [s.key, s.value]));
    }
    async updateEmailSettings(emailSettings, userId) {
        let updatedCount = 0;
        for (const [key, value] of Object.entries(emailSettings)) {
            await this.updateSetting(key, value, userId);
            updatedCount++;
        }
        return updatedCount;
    }
    async testEmailSettings(testEmail) {
        const emailSettings = await this.getEmailSettings();
        const transporter = nodemailer_1.default.createTransport({
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
    async getPasswordPolicy() {
        const settings = await this.prisma.systemSetting.findMany({
            where: { key: { startsWith: 'password_' } },
        });
        return Object.fromEntries(settings.map((s) => [s.key, s.value]));
    }
    async updatePasswordPolicy(passwordPolicy, userId) {
        let updatedCount = 0;
        for (const [key, value] of Object.entries(passwordPolicy)) {
            await this.updateSetting(key, value, userId);
            updatedCount++;
        }
        return updatedCount;
    }
    async getJWTConfig() {
        const settings = await this.prisma.systemSetting.findMany({
            where: { key: { startsWith: 'jwt_' } },
        });
        return Object.fromEntries(settings.map((s) => [s.key, s.value]));
    }
    async updateJWTConfig(jwtConfig, userId) {
        let updatedCount = 0;
        for (const [key, value] of Object.entries(jwtConfig)) {
            await this.updateSetting(key, value, userId);
            updatedCount++;
        }
        return updatedCount;
    }
    async getThemeSettings() {
        const settings = await this.prisma.systemSetting.findMany({
            where: { category: 'theme' },
        });
        return Object.fromEntries(settings.map((s) => [s.key, s.value]));
    }
    async updateThemeSettings(themeSettings, userId) {
        let updatedCount = 0;
        for (const [key, value] of Object.entries(themeSettings)) {
            await this.updateSetting(key, value, userId);
            updatedCount++;
        }
        return updatedCount;
    }
    async getContestantVisibilitySettings() {
        const settings = await this.prisma.systemSetting.findMany({
            where: { key: { startsWith: 'contestant_visibility_' } },
        });
        return Object.fromEntries(settings.map((s) => [s.key, s.value]));
    }
    async updateContestantVisibilitySettings(visibilitySettings, userId) {
        let updatedCount = 0;
        const transformedSettings = {};
        for (const [key, value] of Object.entries(visibilitySettings)) {
            const stringValue = typeof value === 'boolean' ? String(value) : String(value || '');
            if (key === 'canViewWinners') {
                transformedSettings['contestant_visibility_canViewWinners'] = stringValue;
            }
            else if (key === 'canViewOverallResults') {
                transformedSettings['contestant_visibility_canViewOverallResults'] = stringValue;
            }
            else if (key.startsWith('contestant_visibility_')) {
                transformedSettings[key] = stringValue;
            }
            else {
                transformedSettings[`contestant_visibility_${key}`] = stringValue;
            }
        }
        for (const [key, value] of Object.entries(transformedSettings)) {
            await this.updateSetting(key, value, userId);
            updatedCount++;
        }
        return updatedCount;
    }
    async getDatabaseConnectionInfo() {
        try {
            const dbUrl = process.env.DATABASE_URL || '';
            const info = {
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
                }
                catch {
                    info.host = process.env.DB_HOST || process.env.DATABASE_HOST || 'N/A';
                    info.port = process.env.DB_PORT || process.env.DATABASE_PORT || '5432';
                    info.database = process.env.DB_NAME || process.env.DATABASE_NAME || 'N/A';
                    info.user = process.env.DB_USER || process.env.DATABASE_USER || 'N/A';
                    info.password = (process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD) ? '***masked***' : 'Not set';
                }
            }
            else {
                info.host = process.env.DB_HOST || process.env.DATABASE_HOST || 'Not configured';
                info.port = process.env.DB_PORT || process.env.DATABASE_PORT || '5432';
                info.database = process.env.DB_NAME || process.env.DATABASE_NAME || 'Not configured';
                info.user = process.env.DB_USER || process.env.DATABASE_USER || 'Not configured';
                info.password = (process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD) ? '***masked***' : 'Not configured';
            }
            return info;
        }
        catch (error) {
            return {
                configured: 'false',
                error: 'Unable to read database configuration'
            };
        }
    }
    determineCategoryFromKey(key) {
        if (key.startsWith('email_') || key.startsWith('smtp_')) {
            return 'email';
        }
        else if (key.startsWith('theme_')) {
            return 'theme';
        }
        else if (key.startsWith('logging_')) {
            return 'logging';
        }
        else if (key.startsWith('security_')) {
            return 'security';
        }
        else if (key.startsWith('database_')) {
            return 'database';
        }
        else if (key.startsWith('backup_')) {
            return 'backup';
        }
        else if (key.startsWith('notifications_')) {
            return 'notifications';
        }
        else if (key.startsWith('password_')) {
            return 'security';
        }
        else if (key.startsWith('jwt_')) {
            return 'security';
        }
        else if (key.startsWith('contestant_visibility_')) {
            return 'privacy';
        }
        return 'general';
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], SettingsService);
//# sourceMappingURL=SettingsService.js.map