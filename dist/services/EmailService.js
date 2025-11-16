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
exports.EmailService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const client_1 = require("@prisma/client");
let EmailService = class EmailService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async getConfig() {
        const settings = await this.prisma.systemSetting.findMany({
            where: {
                key: { in: ['EMAIL_ENABLED', 'EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_FROM'] }
            }
        });
        const config = {};
        settings.forEach(s => { config[s.key.toLowerCase()] = s.value; });
        return {
            enabled: config.email_enabled === 'true',
            host: config.email_host || '',
            port: parseInt(config.email_port) || 587,
            user: config.email_user || '',
            from: config.email_from || ''
        };
    }
    async sendEmail(to, subject, body) {
        const config = await this.getConfig();
        if (!config.enabled) {
            throw this.badRequestError('Email service not enabled');
        }
        return { success: true, to, subject };
    }
    async sendBulkEmail(recipients, subject, body) {
        const results = [];
        for (const to of recipients) {
            try {
                const result = await this.sendEmail(to, subject, body);
                results.push({ to, success: true });
            }
            catch (error) {
                results.push({ to, success: false, error: String(error) });
            }
        }
        return results;
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], EmailService);
//# sourceMappingURL=EmailService.js.map