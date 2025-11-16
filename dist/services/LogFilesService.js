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
exports.LogFilesService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const fs_1 = require("fs");
const path = __importStar(require("path"));
let LogFilesService = class LogFilesService extends BaseService_1.BaseService {
    LOG_DIRECTORY = path.join(__dirname, '../../logs');
    formatFileSize(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
    async ensureLogDirectory() {
        try {
            await fs_1.promises.mkdir(this.LOG_DIRECTORY, { recursive: true });
        }
        catch (error) {
            throw new Error(`Failed to create logs directory: ${error.message}`);
        }
    }
    validateFilename(filename) {
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            throw this.badRequestError('Invalid filename');
        }
    }
    async getLogFiles() {
        await this.ensureLogDirectory();
        const files = await fs_1.promises.readdir(this.LOG_DIRECTORY);
        const fileStats = await Promise.all(files
            .filter(file => file.endsWith('.log'))
            .map(async (file) => {
            const filePath = path.join(this.LOG_DIRECTORY, file);
            const stats = await fs_1.promises.stat(filePath);
            return {
                name: file,
                size: stats.size,
                sizeFormatted: this.formatFileSize(stats.size),
                modifiedAt: stats.mtime.toISOString(),
                path: filePath
            };
        }));
        fileStats.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
        return { files: fileStats, directory: this.LOG_DIRECTORY };
    }
    async getLogFileContents(filename, lines = 500) {
        this.validateFilename(filename);
        const filePath = path.join(this.LOG_DIRECTORY, filename);
        try {
            await fs_1.promises.access(filePath);
        }
        catch {
            throw this.notFoundError('Log file', filename);
        }
        const contents = await fs_1.promises.readFile(filePath, 'utf-8');
        const allLines = contents.split('\n');
        const maxLines = parseInt(String(lines)) || 500;
        const lastLines = allLines.slice(-maxLines);
        return {
            filename,
            contents: lastLines.join('\n'),
            totalLines: allLines.length,
            displayedLines: lastLines.length
        };
    }
    async getLogFilePath(filename) {
        this.validateFilename(filename);
        const filePath = path.join(this.LOG_DIRECTORY, filename);
        try {
            await fs_1.promises.access(filePath);
        }
        catch {
            throw this.notFoundError('Log file', filename);
        }
        return filePath;
    }
    async cleanupOldLogs(daysToKeep) {
        if (!daysToKeep || daysToKeep < 1) {
            throw this.badRequestError('Valid daysToKeep is required (minimum 1)');
        }
        await this.ensureLogDirectory();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(String(daysToKeep)));
        const files = await fs_1.promises.readdir(this.LOG_DIRECTORY);
        let deletedCount = 0;
        let deletedSize = 0;
        for (const file of files) {
            if (!file.endsWith('.log'))
                continue;
            const filePath = path.join(this.LOG_DIRECTORY, file);
            const stats = await fs_1.promises.stat(filePath);
            if (stats.mtime < cutoffDate) {
                await fs_1.promises.unlink(filePath);
                deletedCount++;
                deletedSize += stats.size;
            }
        }
        return {
            deletedCount,
            deletedSize,
            deletedSizeFormatted: this.formatFileSize(deletedSize)
        };
    }
    async deleteLogFile(filename) {
        this.validateFilename(filename);
        const filePath = path.join(this.LOG_DIRECTORY, filename);
        try {
            await fs_1.promises.access(filePath);
        }
        catch {
            throw this.notFoundError('Log file', filename);
        }
        await fs_1.promises.unlink(filePath);
    }
};
exports.LogFilesService = LogFilesService;
exports.LogFilesService = LogFilesService = __decorate([
    (0, tsyringe_1.injectable)()
], LogFilesService);
//# sourceMappingURL=LogFilesService.js.map