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
exports.lenientVirusScan = exports.strictVirusScan = exports.scanMultipleFiles = exports.scanSingleFile = exports.virusScanMiddleware = void 0;
const VirusScanService_1 = require("../services/VirusScanService");
const virus_scan_config_1 = require("../config/virus-scan.config");
const fs = __importStar(require("fs"));
const virusScanMiddleware = (options = {}) => {
    const virusScanService = (0, VirusScanService_1.getVirusScanService)();
    const deleteOnInfection = options.deleteOnInfection !== false;
    const blockOnError = options.blockOnError || false;
    const scanBuffers = options.scanBuffers || false;
    return async (req, res, next) => {
        try {
            const files = [];
            if (req.file) {
                files.push(req.file);
            }
            if (req.files) {
                if (Array.isArray(req.files)) {
                    files.push(...req.files);
                }
                else {
                    Object.values(req.files).forEach(fileArray => {
                        if (Array.isArray(fileArray)) {
                            files.push(...fileArray);
                        }
                    });
                }
            }
            if (files.length === 0) {
                next();
                return;
            }
            const scanResults = await Promise.all(files.map(async (file) => {
                if (scanBuffers && file.buffer) {
                    return {
                        file,
                        result: await virusScanService.scanBuffer(file.buffer, file.originalname),
                    };
                }
                else if (file.path) {
                    return {
                        file,
                        result: await virusScanService.scanFile(file.path),
                    };
                }
                else {
                    return {
                        file,
                        result: {
                            status: virus_scan_config_1.ScanStatus.ERROR,
                            file: file.originalname,
                            size: file.size,
                            scannedAt: new Date(),
                            duration: 0,
                            error: 'No file path or buffer available for scanning',
                        },
                    };
                }
            }));
            const infectedFiles = scanResults.filter(({ result }) => result.status === virus_scan_config_1.ScanStatus.INFECTED);
            const errorFiles = scanResults.filter(({ result }) => result.status === virus_scan_config_1.ScanStatus.ERROR);
            if (infectedFiles.length > 0) {
                console.warn('Infected files detected:', infectedFiles.map(({ file, result }) => ({
                    filename: file.originalname,
                    virus: result.virus,
                })));
                if (deleteOnInfection) {
                    infectedFiles.forEach(({ file }) => {
                        if (file.path && fs.existsSync(file.path)) {
                            try {
                                fs.unlinkSync(file.path);
                                console.log(`Deleted infected file: ${file.path}`);
                            }
                            catch (error) {
                                console.error(`Failed to delete infected file: ${file.path}`, error);
                            }
                        }
                    });
                }
                res.status(400).json({
                    success: false,
                    error: 'Infected files detected',
                    details: infectedFiles.map(({ file, result }) => ({
                        filename: file.originalname,
                        virus: result.virus,
                    })),
                });
                return;
            }
            if (errorFiles.length > 0 && blockOnError) {
                console.error('Scan errors detected:', errorFiles.map(({ file, result }) => ({
                    filename: file.originalname,
                    error: result.error,
                })));
                res.status(500).json({
                    success: false,
                    error: 'Virus scan failed',
                    details: errorFiles.map(({ file, result }) => ({
                        filename: file.originalname,
                        error: result.error,
                    })),
                });
                return;
            }
            req.scanResults = scanResults.map(({ result }) => result);
            next();
        }
        catch (error) {
            console.error('Virus scan middleware error:', error);
            if (blockOnError) {
                res.status(500).json({
                    success: false,
                    error: 'Virus scan failed',
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
            }
            else {
                next();
            }
        }
    };
};
exports.virusScanMiddleware = virusScanMiddleware;
const scanSingleFile = (options = {}) => {
    return (0, exports.virusScanMiddleware)(options);
};
exports.scanSingleFile = scanSingleFile;
const scanMultipleFiles = (options = {}) => {
    return (0, exports.virusScanMiddleware)(options);
};
exports.scanMultipleFiles = scanMultipleFiles;
exports.strictVirusScan = (0, exports.virusScanMiddleware)({
    deleteOnInfection: true,
    blockOnError: true,
});
exports.lenientVirusScan = (0, exports.virusScanMiddleware)({
    deleteOnInfection: true,
    blockOnError: false,
});
exports.default = {
    virusScanMiddleware: exports.virusScanMiddleware,
    scanSingleFile: exports.scanSingleFile,
    scanMultipleFiles: exports.scanMultipleFiles,
    strictVirusScan: exports.strictVirusScan,
    lenientVirusScan: exports.lenientVirusScan,
};
//# sourceMappingURL=virusScanMiddleware.js.map