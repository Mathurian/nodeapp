"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScanStatus = exports.getVirusScanConfig = exports.detectClamAVMode = void 0;
const detectClamAVMode = () => {
    if (process.env.CLAMAV_ENABLED === 'false') {
        return 'disabled';
    }
    if (process.env.CLAMAV_SOCKET) {
        return 'native-socket';
    }
    if (process.env.CLAMAV_HOST === 'clamav' || process.env.DOCKER_ENV === 'true') {
        return 'docker';
    }
    const commonSocketPaths = [
        '/var/run/clamav/clamd.ctl',
        '/var/run/clamav/clamd.sock',
        '/var/run/clamd.socket',
        '/tmp/clamd.socket',
        '/usr/local/var/run/clamav/clamd.sock',
    ];
    const fs = require('fs');
    for (const socketPath of commonSocketPaths) {
        try {
            if (fs.existsSync(socketPath)) {
                return 'native-socket';
            }
        }
        catch (error) {
        }
    }
    return 'native-tcp';
};
exports.detectClamAVMode = detectClamAVMode;
const getVirusScanConfig = () => {
    const mode = (0, exports.detectClamAVMode)();
    const enabled = process.env.CLAMAV_ENABLED !== 'false';
    let socketPath;
    if (mode === 'native-socket') {
        socketPath = process.env.CLAMAV_SOCKET;
        if (!socketPath) {
            const fs = require('fs');
            const commonPaths = [
                '/var/run/clamav/clamd.ctl',
                '/var/run/clamav/clamd.sock',
                '/var/run/clamd.socket',
                '/tmp/clamd.socket',
                '/usr/local/var/run/clamav/clamd.sock',
            ];
            for (const path of commonPaths) {
                try {
                    if (fs.existsSync(path)) {
                        socketPath = path;
                        break;
                    }
                }
                catch (error) {
                }
            }
        }
    }
    return {
        enabled,
        mode,
        host: process.env.CLAMAV_HOST || 'localhost',
        port: parseInt(process.env.CLAMAV_PORT || '3310', 10),
        socketPath,
        timeout: parseInt(process.env.CLAMAV_TIMEOUT || '60000', 10),
        maxFileSize: parseInt(process.env.CLAMAV_MAX_FILE_SIZE || '52428800', 10),
        quarantinePath: process.env.QUARANTINE_PATH || './quarantine',
        scanOnUpload: process.env.SCAN_ON_UPLOAD !== 'false',
        removeInfected: process.env.REMOVE_INFECTED === 'true',
        notifyOnInfection: process.env.NOTIFY_ON_INFECTION !== 'false',
        fallbackBehavior: process.env.CLAMAV_FALLBACK_BEHAVIOR || 'allow',
        connectionRetries: parseInt(process.env.CLAMAV_CONNECTION_RETRIES || '3', 10),
    };
};
exports.getVirusScanConfig = getVirusScanConfig;
var ScanStatus;
(function (ScanStatus) {
    ScanStatus["CLEAN"] = "clean";
    ScanStatus["INFECTED"] = "infected";
    ScanStatus["ERROR"] = "error";
    ScanStatus["SKIPPED"] = "skipped";
    ScanStatus["TOO_LARGE"] = "too_large";
})(ScanStatus || (exports.ScanStatus = ScanStatus = {}));
exports.default = {
    getVirusScanConfig: exports.getVirusScanConfig,
    ScanStatus,
};
//# sourceMappingURL=virus-scan.config.js.map