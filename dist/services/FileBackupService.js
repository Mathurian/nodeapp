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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileBackupService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const fs_1 = require("fs");
const path = __importStar(require("path"));
let FileBackupService = class FileBackupService extends BaseService_1.BaseService {
    BACKUP_DIR = path.join(__dirname, '../../backups');
    UPLOAD_DIR = path.join(__dirname, '../../uploads');
    async createBackup() {
        try {
            await fs_1.promises.mkdir(this.BACKUP_DIR, { recursive: true });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.BACKUP_DIR, `backup-${timestamp}`);
            return {
                success: true,
                backupPath,
                timestamp
            };
        }
        catch (error) {
            throw this.badRequestError(`Backup failed: ${error.message}`);
        }
    }
    async listBackups() {
        try {
            await fs_1.promises.mkdir(this.BACKUP_DIR, { recursive: true });
            const files = await fs_1.promises.readdir(this.BACKUP_DIR);
            return files.filter(f => f.startsWith('backup-'));
        }
        catch (error) {
            return [];
        }
    }
    async deleteBackup(backupName) {
        const backupPath = path.join(this.BACKUP_DIR, backupName);
        try {
            await fs_1.promises.rm(backupPath, { recursive: true, force: true });
        }
        catch (error) {
            throw this.badRequestError(`Delete backup failed: ${error.message}`);
        }
    }
};
exports.FileBackupService = FileBackupService;
exports.FileBackupService = FileBackupService = __decorate([
    (0, tsyringe_1.injectable)()
], FileBackupService);
//# sourceMappingURL=FileBackupService.js.map