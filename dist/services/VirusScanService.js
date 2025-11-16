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
exports.getVirusScanService = exports.VirusScanService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const net = __importStar(require("net"));
const crypto = __importStar(require("crypto"));
const virus_scan_config_1 = require("../config/virus-scan.config");
class VirusScanService {
    config;
    scanCache;
    cacheTimeout = 3600000;
    constructor() {
        this.config = (0, virus_scan_config_1.getVirusScanConfig)();
        this.scanCache = new Map();
        if (!fs.existsSync(this.config.quarantinePath)) {
            fs.mkdirSync(this.config.quarantinePath, { recursive: true });
        }
    }
    async isAvailable() {
        if (!this.config.enabled || this.config.mode === 'disabled') {
            return false;
        }
        return new Promise((resolve) => {
            let socket;
            if (this.config.mode === 'native-socket' && this.config.socketPath) {
                socket = net.createConnection(this.config.socketPath);
            }
            else {
                socket = net.createConnection(this.config.port, this.config.host);
            }
            socket.setTimeout(5000);
            socket.on('connect', () => {
                socket.end();
                resolve(true);
            });
            socket.on('error', () => {
                resolve(false);
            });
            socket.on('timeout', () => {
                socket.destroy();
                resolve(false);
            });
        });
    }
    getConnectionInfo() {
        if (this.config.mode === 'native-socket' && this.config.socketPath) {
            return `Unix socket: ${this.config.socketPath}`;
        }
        return `TCP: ${this.config.host}:${this.config.port}`;
    }
    async scanFile(filePath) {
        const startTime = Date.now();
        try {
            if (!this.config.enabled) {
                return {
                    status: virus_scan_config_1.ScanStatus.SKIPPED,
                    file: filePath,
                    size: fs.statSync(filePath).size,
                    scannedAt: new Date(),
                    duration: Date.now() - startTime,
                };
            }
            if (!fs.existsSync(filePath)) {
                return {
                    status: virus_scan_config_1.ScanStatus.ERROR,
                    file: filePath,
                    size: 0,
                    scannedAt: new Date(),
                    duration: Date.now() - startTime,
                    error: 'File not found',
                };
            }
            const stats = fs.statSync(filePath);
            if (stats.size > this.config.maxFileSize) {
                return {
                    status: virus_scan_config_1.ScanStatus.TOO_LARGE,
                    file: filePath,
                    size: stats.size,
                    scannedAt: new Date(),
                    duration: Date.now() - startTime,
                    error: `File exceeds maximum scan size of ${this.config.maxFileSize} bytes`,
                };
            }
            const cacheKey = await this.generateFileHash(filePath);
            const cached = this.scanCache.get(cacheKey);
            if (cached && this.isCacheValid(cached)) {
                console.log(`Using cached scan result for ${filePath}`);
                return cached;
            }
            const available = await this.isAvailable();
            if (!available) {
                console.warn('ClamAV is not available');
                if (this.config.fallbackBehavior === 'allow') {
                    return {
                        status: virus_scan_config_1.ScanStatus.SKIPPED,
                        file: filePath,
                        size: stats.size,
                        scannedAt: new Date(),
                        duration: Date.now() - startTime,
                        error: 'ClamAV unavailable - file allowed by fallback policy',
                    };
                }
                else {
                    return {
                        status: virus_scan_config_1.ScanStatus.ERROR,
                        file: filePath,
                        size: stats.size,
                        scannedAt: new Date(),
                        duration: Date.now() - startTime,
                        error: 'ClamAV unavailable - file rejected by fallback policy',
                    };
                }
            }
            const scanResult = await this.performScan(filePath);
            scanResult.duration = Date.now() - startTime;
            this.scanCache.set(cacheKey, scanResult);
            if (scanResult.status === virus_scan_config_1.ScanStatus.INFECTED) {
                await this.handleInfectedFile(filePath, scanResult);
            }
            return scanResult;
        }
        catch (error) {
            console.error('Virus scan error:', error);
            return {
                status: virus_scan_config_1.ScanStatus.ERROR,
                file: filePath,
                size: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0,
                scannedAt: new Date(),
                duration: Date.now() - startTime,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    async scanBuffer(buffer, filename = 'buffer') {
        const startTime = Date.now();
        try {
            if (!this.config.enabled) {
                return {
                    status: virus_scan_config_1.ScanStatus.SKIPPED,
                    file: filename,
                    size: buffer.length,
                    scannedAt: new Date(),
                    duration: Date.now() - startTime,
                };
            }
            if (buffer.length > this.config.maxFileSize) {
                return {
                    status: virus_scan_config_1.ScanStatus.TOO_LARGE,
                    file: filename,
                    size: buffer.length,
                    scannedAt: new Date(),
                    duration: Date.now() - startTime,
                    error: `Buffer exceeds maximum scan size of ${this.config.maxFileSize} bytes`,
                };
            }
            const available = await this.isAvailable();
            if (!available) {
                if (this.config.fallbackBehavior === 'allow') {
                    return {
                        status: virus_scan_config_1.ScanStatus.SKIPPED,
                        file: filename,
                        size: buffer.length,
                        scannedAt: new Date(),
                        duration: Date.now() - startTime,
                        error: 'ClamAV unavailable - buffer allowed by fallback policy',
                    };
                }
                else {
                    return {
                        status: virus_scan_config_1.ScanStatus.ERROR,
                        file: filename,
                        size: buffer.length,
                        scannedAt: new Date(),
                        duration: Date.now() - startTime,
                        error: 'ClamAV unavailable - buffer rejected by fallback policy',
                    };
                }
            }
            const scanResult = await this.performBufferScan(buffer, filename);
            scanResult.duration = Date.now() - startTime;
            return scanResult;
        }
        catch (error) {
            console.error('Virus scan buffer error:', error);
            return {
                status: virus_scan_config_1.ScanStatus.ERROR,
                file: filename,
                size: buffer.length,
                scannedAt: new Date(),
                duration: Date.now() - startTime,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    performScan(filePath) {
        return new Promise((resolve, reject) => {
            const stats = fs.statSync(filePath);
            let socket;
            if (this.config.mode === 'native-socket' && this.config.socketPath) {
                socket = net.createConnection(this.config.socketPath);
                console.log(`Scanning file via Unix socket: ${this.config.socketPath}`);
            }
            else {
                socket = net.createConnection(this.config.port, this.config.host);
                console.log(`Scanning file via TCP: ${this.config.host}:${this.config.port}`);
            }
            socket.setTimeout(this.config.timeout);
            let response = '';
            socket.on('connect', () => {
                socket.write(`SCAN ${filePath}\n`);
            });
            socket.on('data', (data) => {
                response += data.toString();
            });
            socket.on('end', () => {
                const result = this.parseResponse(response, filePath, stats.size);
                resolve(result);
            });
            socket.on('error', (error) => {
                reject(error);
            });
            socket.on('timeout', () => {
                socket.destroy();
                reject(new Error('Scan timeout'));
            });
        });
    }
    performBufferScan(buffer, filename) {
        return new Promise((resolve, reject) => {
            let socket;
            if (this.config.mode === 'native-socket' && this.config.socketPath) {
                socket = net.createConnection(this.config.socketPath);
            }
            else {
                socket = net.createConnection(this.config.port, this.config.host);
            }
            socket.setTimeout(this.config.timeout);
            let response = '';
            socket.on('connect', () => {
                socket.write('nINSTREAM\n');
                const chunkSize = 2048;
                for (let i = 0; i < buffer.length; i += chunkSize) {
                    const chunk = buffer.slice(i, Math.min(i + chunkSize, buffer.length));
                    const size = Buffer.alloc(4);
                    size.writeUInt32BE(chunk.length, 0);
                    socket.write(size);
                    socket.write(chunk);
                }
                const terminator = Buffer.alloc(4);
                terminator.writeUInt32BE(0, 0);
                socket.write(terminator);
            });
            socket.on('data', (data) => {
                response += data.toString();
            });
            socket.on('end', () => {
                const result = this.parseResponse(response, filename, buffer.length);
                resolve(result);
            });
            socket.on('error', (error) => {
                reject(error);
            });
            socket.on('timeout', () => {
                socket.destroy();
                reject(new Error('Scan timeout'));
            });
        });
    }
    getServiceInfo() {
        return {
            enabled: this.config.enabled,
            mode: this.config.mode,
            connection: this.getConnectionInfo(),
            cacheSize: this.scanCache.size,
            config: {
                maxFileSize: this.config.maxFileSize,
                scanOnUpload: this.config.scanOnUpload,
                removeInfected: this.config.removeInfected,
                fallbackBehavior: this.config.fallbackBehavior,
            },
        };
    }
    parseResponse(response, filename, size) {
        const result = {
            status: virus_scan_config_1.ScanStatus.CLEAN,
            file: filename,
            size,
            scannedAt: new Date(),
            duration: 0,
        };
        if (response.includes('FOUND')) {
            result.status = virus_scan_config_1.ScanStatus.INFECTED;
            const match = response.match(/:\s*(.+?)\s+FOUND/);
            if (match) {
                result.virus = match[1];
            }
        }
        else if (response.includes('ERROR')) {
            result.status = virus_scan_config_1.ScanStatus.ERROR;
            result.error = response;
        }
        else if (response.includes('OK')) {
            result.status = virus_scan_config_1.ScanStatus.CLEAN;
        }
        return result;
    }
    async handleInfectedFile(filePath, scanResult) {
        try {
            console.warn(`Infected file detected: ${filePath}`, scanResult);
            const quarantineFile = await this.quarantineFile(filePath, scanResult);
            console.log(`File moved to quarantine: ${quarantineFile}`);
            if (this.config.removeInfected && fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Original infected file removed: ${filePath}`);
            }
            if (this.config.notifyOnInfection) {
                await this.notifyInfection(scanResult);
            }
        }
        catch (error) {
            console.error('Error handling infected file:', error);
        }
    }
    async quarantineFile(filePath, scanResult) {
        const timestamp = Date.now();
        const originalName = path.basename(filePath);
        const quarantineFileName = `${timestamp}_${originalName}`;
        const quarantinePath = path.join(this.config.quarantinePath, quarantineFileName);
        fs.copyFileSync(filePath, quarantinePath);
        const metadataPath = `${quarantinePath}.json`;
        fs.writeFileSync(metadataPath, JSON.stringify({
            originalPath: filePath,
            scanResult,
            quarantinedAt: new Date().toISOString(),
        }, null, 2));
        return quarantinePath;
    }
    async notifyInfection(scanResult) {
        console.warn('Infection notification:', scanResult);
    }
    async generateFileHash(filePath) {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);
            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }
    isCacheValid(result) {
        const age = Date.now() - result.scannedAt.getTime();
        return age < this.cacheTimeout;
    }
    clearCache() {
        this.scanCache.clear();
    }
    getStatistics() {
        return {
            cacheSize: this.scanCache.size,
            config: this.config,
        };
    }
    listQuarantinedFiles() {
        if (!fs.existsSync(this.config.quarantinePath)) {
            return [];
        }
        return fs.readdirSync(this.config.quarantinePath)
            .filter(file => !file.endsWith('.json'));
    }
    getQuarantineMetadata(filename) {
        const metadataPath = path.join(this.config.quarantinePath, `${filename}.json`);
        if (!fs.existsSync(metadataPath)) {
            return null;
        }
        return JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    }
    deleteQuarantinedFile(filename) {
        try {
            const filePath = path.join(this.config.quarantinePath, filename);
            const metadataPath = `${filePath}.json`;
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            if (fs.existsSync(metadataPath)) {
                fs.unlinkSync(metadataPath);
            }
            return true;
        }
        catch (error) {
            console.error('Error deleting quarantined file:', error);
            return false;
        }
    }
}
exports.VirusScanService = VirusScanService;
let virusScanServiceInstance = null;
const getVirusScanService = () => {
    if (!virusScanServiceInstance) {
        virusScanServiceInstance = new VirusScanService();
    }
    return virusScanServiceInstance;
};
exports.getVirusScanService = getVirusScanService;
exports.default = VirusScanService;
//# sourceMappingURL=VirusScanService.js.map