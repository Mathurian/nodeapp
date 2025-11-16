"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MFAService = void 0;
const tsyringe_1 = require("tsyringe");
const client_1 = require("@prisma/client");
const speakeasy = __importStar(require("speakeasy"));
const QRCode = __importStar(require("qrcode"));
const crypto = __importStar(require("crypto"));
const BaseService_1 = require("./BaseService");
let MFAService = class MFAService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async generateMFASecret(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true }
        });
        if (!user) {
            throw new Error('User not found');
        }
        const secret = speakeasy.generateSecret({
            name: `Event Manager (${user.email})`,
            issuer: 'Event Manager',
            length: 32
        });
        const backupCodes = this.generateBackupCodes(10);
        const qrCode = await QRCode.toDataURL(secret.otpauth_url || '');
        return {
            secret: secret.base32,
            qrCode,
            backupCodes,
            manualEntryKey: secret.base32
        };
    }
    async enableMFA(userId, secret, token, backupCodes) {
        const verified = speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token,
            window: 2
        });
        if (!verified) {
            return {
                success: false,
                message: 'Invalid verification code. Please try again.'
            };
        }
        const hashedBackupCodes = backupCodes.map(code => this.hashBackupCode(code));
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                mfaEnabled: true,
                mfaSecret: secret,
                mfaBackupCodes: JSON.stringify(hashedBackupCodes),
                mfaMethod: 'totp',
                mfaEnrolledAt: new Date()
            }
        });
        return {
            success: true,
            message: 'Multi-factor authentication enabled successfully'
        };
    }
    async disableMFA(userId, password) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { password: true, mfaEnabled: true }
        });
        if (!user) {
            throw new Error('User not found');
        }
        if (!user.mfaEnabled) {
            return {
                success: false,
                message: 'Multi-factor authentication is not enabled'
            };
        }
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                mfaEnabled: false,
                mfaSecret: null,
                mfaBackupCodes: null,
                mfaMethod: null,
                mfaEnrolledAt: null
            }
        });
        return {
            success: true,
            message: 'Multi-factor authentication disabled successfully'
        };
    }
    async verifyMFAToken(userId, token) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                mfaEnabled: true,
                mfaSecret: true,
                mfaBackupCodes: true
            }
        });
        if (!user || !user.mfaEnabled || !user.mfaSecret) {
            return {
                success: false,
                message: 'MFA is not enabled for this user'
            };
        }
        const verified = speakeasy.totp.verify({
            secret: user.mfaSecret,
            encoding: 'base32',
            token,
            window: 2
        });
        if (verified) {
            return {
                success: true,
                message: 'Verification successful'
            };
        }
        if (user.mfaBackupCodes) {
            const backupCodes = JSON.parse(user.mfaBackupCodes);
            const hashedToken = this.hashBackupCode(token);
            const codeIndex = backupCodes.findIndex(code => code === hashedToken);
            if (codeIndex !== -1) {
                backupCodes.splice(codeIndex, 1);
                await this.prisma.user.update({
                    where: { id: userId },
                    data: {
                        mfaBackupCodes: JSON.stringify(backupCodes)
                    }
                });
                return {
                    success: true,
                    message: 'Backup code verified successfully',
                    remainingBackupCodes: backupCodes.length
                };
            }
        }
        return {
            success: false,
            message: 'Invalid verification code'
        };
    }
    async regenerateBackupCodes(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { mfaEnabled: true }
        });
        if (!user || !user.mfaEnabled) {
            throw new Error('MFA is not enabled for this user');
        }
        const backupCodes = this.generateBackupCodes(10);
        const hashedBackupCodes = backupCodes.map(code => this.hashBackupCode(code));
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                mfaBackupCodes: JSON.stringify(hashedBackupCodes)
            }
        });
        return backupCodes;
    }
    async getMFAStatus(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                mfaEnabled: true,
                mfaMethod: true,
                mfaEnrolledAt: true,
                mfaBackupCodes: true
            }
        });
        if (!user) {
            throw new Error('User not found');
        }
        const result = {
            enabled: user.mfaEnabled
        };
        if (user.mfaEnabled) {
            result.method = user.mfaMethod || 'totp';
            result.enrolledAt = user.mfaEnrolledAt || undefined;
            if (user.mfaBackupCodes) {
                const backupCodes = JSON.parse(user.mfaBackupCodes);
                result.backupCodesRemaining = backupCodes.length;
            }
        }
        return result;
    }
    generateBackupCodes(count) {
        const codes = [];
        for (let i = 0; i < count; i++) {
            const code = crypto.randomBytes(4).toString('hex').toUpperCase();
            const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;
            codes.push(formatted);
        }
        return codes;
    }
    hashBackupCode(code) {
        return crypto
            .createHash('sha256')
            .update(code.replace('-', ''))
            .digest('hex');
    }
};
exports.MFAService = MFAService;
exports.MFAService = MFAService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], MFAService);
exports.default = MFAService;
//# sourceMappingURL=MFAService.js.map