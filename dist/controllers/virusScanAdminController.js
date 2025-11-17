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
exports.VirusScanAdminController = void 0;
const VirusScanService_1 = require("../services/VirusScanService");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class VirusScanAdminController {
    static async healthCheck(_req, res) {
        try {
            const virusScanService = (0, VirusScanService_1.getVirusScanService)();
            const isAvailable = await virusScanService.isAvailable();
            res.json({
                success: true,
                data: {
                    available: isAvailable,
                    status: isAvailable ? 'connected' : 'disconnected',
                },
            });
        }
        catch (error) {
            console.error('Error checking virus scan health:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to check virus scan health',
            });
        }
    }
    static async getStatistics(_req, res) {
        try {
            const virusScanService = (0, VirusScanService_1.getVirusScanService)();
            const stats = virusScanService.getStatistics();
            res.json({
                success: true,
                data: stats,
            });
        }
        catch (error) {
            console.error('Error getting virus scan statistics:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get virus scan statistics',
            });
        }
    }
    static async listQuarantinedFiles(_req, res) {
        try {
            const virusScanService = (0, VirusScanService_1.getVirusScanService)();
            const files = virusScanService.listQuarantinedFiles();
            const filesWithMetadata = files.map(filename => {
                const metadata = virusScanService.getQuarantineMetadata(filename);
                return {
                    filename,
                    ...metadata,
                };
            });
            res.json({
                success: true,
                data: filesWithMetadata,
            });
        }
        catch (error) {
            console.error('Error listing quarantined files:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to list quarantined files',
            });
        }
    }
    static async getQuarantinedFile(req, res) {
        try {
            const { filename } = req.params;
            const virusScanService = (0, VirusScanService_1.getVirusScanService)();
            const metadata = virusScanService.getQuarantineMetadata(filename);
            if (!metadata) {
                res.status(404).json({
                    success: false,
                    error: 'Quarantined file not found',
                });
                return;
            }
            res.json({
                success: true,
                data: metadata,
            });
        }
        catch (error) {
            console.error('Error getting quarantined file:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get quarantined file',
            });
        }
    }
    static async deleteQuarantinedFile(req, res) {
        try {
            const { filename } = req.params;
            const virusScanService = (0, VirusScanService_1.getVirusScanService)();
            const success = virusScanService.deleteQuarantinedFile(filename);
            if (success) {
                res.json({
                    success: true,
                    message: 'Quarantined file deleted successfully',
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    error: 'Failed to delete quarantined file',
                });
            }
        }
        catch (error) {
            console.error('Error deleting quarantined file:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete quarantined file',
            });
        }
    }
    static async scanFile(req, res) {
        try {
            const { filePath } = req.body;
            if (!filePath) {
                res.status(400).json({
                    success: false,
                    error: 'File path is required',
                });
                return;
            }
            const virusScanService = (0, VirusScanService_1.getVirusScanService)();
            const result = await virusScanService.scanFile(filePath);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error('Error scanning file:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to scan file',
            });
        }
    }
    static async bulkScan(req, res) {
        try {
            const { directoryPath } = req.body;
            if (!directoryPath) {
                res.status(400).json({
                    success: false,
                    error: 'Directory path is required',
                });
                return;
            }
            if (!fs.existsSync(directoryPath)) {
                res.status(404).json({
                    success: false,
                    error: 'Directory not found',
                });
                return;
            }
            const virusScanService = (0, VirusScanService_1.getVirusScanService)();
            const files = fs.readdirSync(directoryPath);
            const results = await Promise.all(files.map(async (filename) => {
                const filePath = path.join(directoryPath, filename);
                if (fs.statSync(filePath).isFile()) {
                    return await virusScanService.scanFile(filePath);
                }
                return null;
            }));
            const cleanedResults = results.filter(r => r !== null);
            res.json({
                success: true,
                data: {
                    totalFiles: cleanedResults.length,
                    results: cleanedResults,
                    summary: {
                        clean: cleanedResults.filter(r => r?.status === 'clean').length,
                        infected: cleanedResults.filter(r => r?.status === 'infected').length,
                        errors: cleanedResults.filter(r => r?.status === 'error').length,
                        skipped: cleanedResults.filter(r => r?.status === 'skipped').length,
                    },
                },
            });
        }
        catch (error) {
            console.error('Error performing bulk scan:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to perform bulk scan',
            });
        }
    }
    static async clearCache(_req, res) {
        try {
            const virusScanService = (0, VirusScanService_1.getVirusScanService)();
            virusScanService.clearCache();
            res.json({
                success: true,
                message: 'Scan cache cleared successfully',
            });
        }
        catch (error) {
            console.error('Error clearing scan cache:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to clear scan cache',
            });
        }
    }
}
exports.VirusScanAdminController = VirusScanAdminController;
exports.default = VirusScanAdminController;
//# sourceMappingURL=virusScanAdminController.js.map