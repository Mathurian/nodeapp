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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMSService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const client_1 = require("@prisma/client");
let SMSService = class SMSService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async getSettings() {
        try {
            const settings = await this.prisma.systemSetting.findMany({
                where: {
                    key: {
                        in: ['SMS_ENABLED', 'SMS_API_KEY', 'SMS_API_SECRET', 'SMS_FROM_NUMBER', 'SMS_PROVIDER']
                    }
                }
            });
            const config = {};
            settings.forEach(setting => {
                config[setting.key.toLowerCase()] = setting.value;
            });
            return {
                enabled: config.sms_enabled === 'true',
                apiKey: config.sms_api_key || '',
                apiSecret: config.sms_api_secret || '',
                fromNumber: config.sms_from_number || '',
                provider: config.sms_provider || 'twilio'
            };
        }
        catch (error) {
            return {
                enabled: false,
                apiKey: '',
                apiSecret: '',
                fromNumber: '',
                provider: 'twilio'
            };
        }
    }
    async updateSettings(data, userId) {
        const settings = [
            { key: 'SMS_ENABLED', value: data.enabled ? 'true' : 'false', category: 'sms', description: 'Enable SMS notifications' },
            { key: 'SMS_API_KEY', value: data.apiKey || '', category: 'sms', description: 'SMS API Key' },
            { key: 'SMS_API_SECRET', value: data.apiSecret || '', category: 'sms', description: 'SMS API Secret' },
            { key: 'SMS_FROM_NUMBER', value: data.fromNumber || '', category: 'sms', description: 'SMS From Number' },
            { key: 'SMS_PROVIDER', value: data.provider || 'twilio', category: 'sms', description: 'SMS Provider' }
        ];
        for (const setting of settings) {
            await this.prisma.systemSetting.upsert({
                where: { key: setting.key },
                update: {
                    value: setting.value,
                    updatedAt: new Date(),
                    updatedBy: userId
                },
                create: {
                    key: setting.key,
                    value: setting.value,
                    category: setting.category,
                    description: setting.description,
                    updatedBy: userId
                }
            });
        }
    }
    async sendSMS(to, message) {
        if (!to || !message) {
            throw this.badRequestError('Phone number and message are required');
        }
        const settings = await this.getSettings();
        if (!settings.enabled) {
            throw this.badRequestError('SMS service is not enabled');
        }
        return {
            success: true,
            message: 'SMS would be sent (not implemented)',
            to,
            from: settings.fromNumber
        };
    }
};
exports.SMSService = SMSService;
exports.SMSService = SMSService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], SMSService);
//# sourceMappingURL=SMSService.js.map